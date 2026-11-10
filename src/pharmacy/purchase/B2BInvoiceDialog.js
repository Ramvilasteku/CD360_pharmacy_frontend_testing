// src/pharmacy/b2b/B2BInvoiceDialog.js
//
// One B2B invoice, opened from the list: who it went to, every line (in strips or single
// tablets, with the batch it came out of), the GST split, and the payments against it.
//
//   Download PDF    the tax invoice (needs pharmacy.b2b_sales.view)
//   Send            email / WhatsApp the PDF to the buyer (SendB2BInvoiceDialog)
//   Record payment  pharmacy.b2b_sales.create        Remove a payment   pharmacy.b2b_sales.edit
//   Cancel invoice  pharmacy.b2b_sales.edit — puts the stock back. Blocked while a payment exists:
//                   remove the payments first, so no money is left pointing at a dead invoice.
//
// Backend: routes/pharmacy/pharmacyB2BSales.js @ /api/pharmacy/b2b-sales
//   GET    /get/:id                      the invoice with items[] and payments[]
//   POST   /payment/:id                  { amount, payment_method, transaction_reference, payment_date }
//   DELETE /payment/:id/:paymentId       reverses it: pharmacy_payments keeps every row, so a negative
//                                        "Reversal" row is added and the original is marked Removed
//   PATCH  /cancel/:id                   { reason }
//
// Usage
//   <B2BInvoiceDialog invoice={rowOrNull} onClose={...} onChanged={reloadList} />
//   `invoice` only needs an `id`; the dialog fetches the rest. null closes it.

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Divider, IconButton, MenuItem, Skeleton, Snackbar, Stack, TextField, Typography, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";

import useAccess from "../../hooks/useAccess";
import { ColHead, IconTile, SectionHead, buttonSx, fade, headWash, inputSx, nums, panelSx, thinScroll, tints, toneColor } from "../purchase/purchaseStyles";
import SendB2BInvoiceDialog from "./SendB2BInvoiceDialog";
import {
  B2B_API, Field2, InvoiceChips, PAY_METHODS, Surface, apiMessage, downloadInvoicePdf, fmtDate, fmtExpiry, http, inr,
  prettyMethod, qtyText, rateText, rateUnit, todayStr,
} from "./b2bShared";

const LINE_COLS = "2.1fr 1.15fr 1fr 0.55fr 1fr";

/* one label / amount line in the totals */
function Sum({ label, value, strong, tone, hide }) {
  const theme = useTheme();
  if (hide) return null;
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2} sx={{ py: 0.35 }}>
      <Typography sx={{ fontSize: strong ? 14.5 : 13, fontWeight: strong ? 800 : 500, color: strong ? "text.primary" : "text.secondary" }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: strong ? 16 : 13.5, fontWeight: strong ? 800 : 600, ...nums, color: tone ? toneColor(theme, tone) : "text.primary" }}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function B2BInvoiceDialog({ invoice, onClose, onChanged, canSend = true, inline = false }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const act = tints(theme, "primary");
  const { can } = useAccess();
  const canPay = can("pharmacy.b2b_sales.create");
  const canEdit = can("pharmacy.b2b_sales.edit");

  const id = invoice?.id || null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // { message, severity }

  const [busy, setBusy] = useState(null); // "pdf" | "pay" | "cancel" | payment id being removed
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [removing, setRemoving] = useState(null); // the payment about to be removed
  const [pay, setPay] = useState({ amount: "", payment_method: "cash", transaction_reference: "", payment_date: todayStr() });
  const [payError, setPayError] = useState(null);

  const say = (message, severity = "success") => setToast({ message, severity });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await http.get(`${B2B_API}/get/${id}`);
      setData(r.data.data);
    } catch (e) {
      setError(await apiMessage(e, "Couldn't open the invoice"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setData(null);
    setError(null);
    setCancelling(false);
    setRemoving(null);
    setSending(false);
    setPayError(null);
    setReason("");
    setPay({ amount: "", payment_method: "cash", transaction_reference: "", payment_date: todayStr() });
    if (id) load();
  }, [id, load]);

  const inv = data;
  const dead = inv?.status === "cancelled";
  const due = dead ? 0 : Number(inv?.due_amount) || 0;
  const paid = Number(inv?.paid_amount) || 0;
  const lines = inv?.items || [];
  const payments = inv?.payments || [];
  const igst = Number(inv?.igst_amount) > 0 || !!inv?.is_igst;

  // the amount box starts at what is due
  useEffect(() => {
    if (inv && !dead) setPay((p) => ({ ...p, amount: Number(inv.due_amount) > 0 ? String(Number(inv.due_amount)) : "" }));
  }, [inv?.id, inv?.due_amount, dead]); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = () => onChanged && onChanged();

  const download = async () => {
    setBusy("pdf");
    try {
      await downloadInvoicePdf(inv);
    } catch (e) {
      say(await apiMessage(e, "Couldn't download the PDF"), "error");
    } finally {
      setBusy(null);
    }
  };

  const recordPayment = async () => {
    const amount = Number(pay.amount);
    if (!(amount > 0)) return setPayError("Enter an amount above 0");
    if (amount > due + 0.001) return setPayError(`Only ₹${inr(due)} is due on this invoice`);
    setPayError(null);
    setBusy("pay");
    try {
      const r = await http.post(`${B2B_API}/payment/${inv.id}`, {
        amount,
        payment_method: pay.payment_method,
        transaction_reference: pay.transaction_reference || undefined,
        payment_date: pay.payment_date || undefined,
      });
      setData(r.data.data);
      setPay((p) => ({ ...p, transaction_reference: "" }));
      say("Payment recorded");
      changed();
    } catch (e) {
      setPayError(await apiMessage(e, "Couldn't record the payment"));
    } finally {
      setBusy(null);
    }
  };

  const removePayment = async () => {
    const p = removing;
    setBusy(`del-${p.id}`);
    try {
      const r = await http.delete(`${B2B_API}/payment/${inv.id}/${p.id}`);
      setData(r.data.data);
      setRemoving(null);
      say("Payment removed");
      changed();
    } catch (e) {
      setRemoving(null);
      say(await apiMessage(e, "Couldn't remove the payment"), "error");
    } finally {
      setBusy(null);
    }
  };

  const cancelInvoice = async () => {
    setBusy("cancel");
    try {
      const r = await http.patch(`${B2B_API}/cancel/${inv.id}`, { reason: reason.trim() || undefined });
      setData(r.data.data);
      setCancelling(false);
      setReason("");
      say(`${inv.invoice_number} cancelled — the stock is back`);
      changed();
    } catch (e) {
      setCancelling(false);
      say(await apiMessage(e, "Couldn't cancel the invoice"), "error");
    } finally {
      setBusy(null);
    }
  };

  const canCancel = canEdit && inv && !dead;
  const cancelBlocked = paid > 0;

  return (
    <>
      <Surface
        inline={inline}
        open={!!id && !(inline && sending && inv)}
        onClose={onClose}
        labelledBy="b2b-invoice-title"
        fullScreen={phone}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: phone ? 0 : 3, height: phone ? "100%" : "min(92vh, 860px)" } }}
      >
        {/* ---------------- header ---------------- */}
        <Box sx={{ ...headWash(theme), px: { xs: 2, sm: 3 }, py: 1.75, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1.5 }}>
          {inline && (
            <IconButton onClick={onClose} aria-label="Back to invoices" size="small" edge="start">
              <ArrowBackIcon />
            </IconButton>
          )}
          <IconTile icon={ReceiptLongOutlinedIcon} tone="primary" size={40} radius={2.5} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography component="h2" id="b2b-invoice-title" sx={{ fontSize: 17, fontWeight: 800, ...nums }} noWrap>
                {inv?.invoice_number || invoice?.invoice_number || "Invoice"}
              </Typography>
              {inv && <InvoiceChips status={inv.status} paymentStatus={inv.payment_status} />}
              {loading && inv && <CircularProgress size={14} aria-label="Refreshing" />}
            </Stack>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
              {inv ? `${inv.buyer_name} · ${fmtDate(inv.invoice_date)}` : invoice?.buyer_name || ""}
            </Typography>
          </Box>
          {!inline && (
            <IconButton onClick={onClose} aria-label="Close" size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        {/* ---------------- body ---------------- */}
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2, minHeight: 0, ...thinScroll(act.main) }}>
          {error ? (
            <Alert
              severity="warning"
              variant="outlined"
              action={<Button size="small" onClick={load}>Try again</Button>}
              sx={{ borderRadius: 2 }}
            >
              {error}
            </Alert>
          ) : !inv ? (
            <Stack spacing={1.5} data-testid="invoice-dialog-skeleton">
              <Skeleton variant="rounded" height={86} />
              <Skeleton variant="rounded" height={170} />
              <Skeleton variant="rounded" height={120} />
            </Stack>
          ) : (
            <Stack spacing={2.25}>
              {dead && (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
                  Cancelled{inv.cancelled_at ? ` on ${fmtDate(inv.cancelled_at)}` : ""}
                  {inv.cancel_reason ? ` — ${inv.cancel_reason}` : ""}. The stock went back to the shelf.
                </Alert>
              )}

              {/* buyer + dates */}
              <Box sx={{ ...panelSx(theme), p: 1.75 }}>
                <SectionHead icon={StorefrontOutlinedIcon} title="Sold to" />
                <Box sx={{ display: "grid", gap: 1.5, mt: 1.5, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" } }}>
                  <Field2 label="Buyer" sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>{inv.buyer_name}</Field2>
                  <Field2 label="Phone">{inv.buyer_phone}</Field2>
                  <Field2 label="GSTIN">{inv.buyer_gstin}</Field2>
                  <Field2 label="Drug licence">{inv.buyer_drug_license}</Field2>
                  <Field2 label="Address" sx={{ gridColumn: "1 / -1" }}>{[inv.buyer_address, inv.buyer_state].filter(Boolean).join(", ")}</Field2>
                  <Field2 label="Invoice date">{fmtDate(inv.invoice_date)}</Field2>
                  <Field2 label="Pay by">{inv.due_date ? fmtDate(inv.due_date) : ""}</Field2>
                  <Field2 label="GST type" sx={{ gridColumn: { xs: "1 / -1", sm: "span 2" } }}>
                    {igst ? "Another state — IGST" : "Same state — CGST + SGST"}
                  </Field2>
                </Box>
              </Box>

              {/* lines */}
              <Box sx={{ ...panelSx(theme), p: 1.75 }}>
                <SectionHead icon={Inventory2OutlinedIcon} title="Medicines" count={lines.length} />
                {/* desktop headings */}
                <Box
                  sx={{
                    display: { xs: "none", sm: "grid" },
                    gridTemplateColumns: LINE_COLS,
                    gap: 1.5,
                    mt: 1.25,
                    px: 1.25,
                    py: 0.8,
                    borderRadius: 2,
                    border: 1,
                    borderColor: act.line,
                    bgcolor: act.soft,
                  }}
                >
                  <ColHead icon={Inventory2OutlinedIcon}>Medicine</ColHead>
                  <ColHead icon={Inventory2OutlinedIcon}>Quantity</ColHead>
                  <ColHead icon={Inventory2OutlinedIcon} right>Rate</ColHead>
                  <ColHead icon={Inventory2OutlinedIcon} right>GST</ColHead>
                  <ColHead icon={Inventory2OutlinedIcon} right>Taxable</ColHead>
                </Box>
                <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                  {lines.map((l) => {
                    const upp = Number(l.units_per_pack) || 1;
                    const pack = String(l.pack_unit || "strip").toLowerCase();
                    const sub =
                      l.qty_type === "tablet"
                        ? `loose tablets · ${upp} per ${pack}`
                        : upp > 1
                          ? `${upp} per ${pack} · ${Number(l.tablets_total)} tablets`
                          : "";
                    return (
                      <Box
                        key={l.id}
                        data-testid="invoice-line"
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr auto", sm: LINE_COLS },
                          gap: { xs: 0.25, sm: 1.5 },
                          alignItems: "center",
                          px: 1.25,
                          py: 0.9,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 2,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700 }} noWrap>
                            {l.medicine_name}
                            {l.strength ? ` ${l.strength}` : ""}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                            {[l.batch_number && `Batch ${l.batch_number}`, l.expiry_date && `Exp ${fmtExpiry(l.expiry_date)}`, l.hsn_code && `HSN ${l.hsn_code}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </Typography>
                        </Box>
                        <Box sx={{ gridColumn: { xs: "1", sm: "auto" }, gridRow: { xs: 2, sm: "auto" } }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, ...nums }}>{qtyText(l)}</Typography>
                          {sub && <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{sub}</Typography>}
                        </Box>
                        <Typography sx={{ fontSize: 13, textAlign: "right", ...nums, display: { xs: "none", sm: "block" } }}>
                          ₹{rateText(l.unit_price)}
                          <Box component="span" sx={{ color: "text.secondary", fontSize: 11 }}>{` /${rateUnit(l)}`}</Box>
                        </Typography>
                        <Typography sx={{ fontSize: 13, textAlign: "right", ...nums, display: { xs: "none", sm: "block" } }}>
                          {Number(l.gst_percentage)}%
                        </Typography>
                        <Box sx={{ textAlign: "right", gridRow: { xs: "1 / span 2", sm: "auto" }, gridColumn: { xs: 2, sm: "auto" } }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, ...nums }}>₹{inr(l.taxable_amount)}</Typography>
                          <Typography sx={{ fontSize: 11, color: "text.secondary", display: { sm: "none" }, ...nums }}>
                            ₹{rateText(l.unit_price)} /{rateUnit(l)} · {Number(l.gst_percentage)}%
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>

                {/* totals */}
                <Box sx={{ mt: 1.75, ml: { sm: "auto" }, maxWidth: { sm: 340 } }}>
                  <Sum label="Items total" value={`₹${inr(inv.subtotal)}`} />
                  <Sum label="Discount" value={`− ₹${inr(inv.discount_amount)}`} hide={!(Number(inv.discount_amount) > 0)} />
                  <Sum label="Taxable value" value={`₹${inr(inv.taxable_amount)}`} />
                  {igst ? (
                    <Sum label="IGST" value={`₹${inr(inv.igst_amount)}`} />
                  ) : (
                    <>
                      <Sum label="CGST" value={`₹${inr(inv.cgst_amount)}`} />
                      <Sum label="SGST" value={`₹${inr(inv.sgst_amount)}`} />
                    </>
                  )}
                  <Sum label="Other charges" value={`₹${inr(inv.other_charges)}`} hide={!(Number(inv.other_charges) > 0)} />
                  <Sum label="Round off" value={`${Number(inv.round_off) < 0 ? "− " : ""}₹${inr(Math.abs(Number(inv.round_off) || 0))}`} hide={!Number(inv.round_off)} />
                  <Divider sx={{ my: 0.75 }} />
                  <Sum label="Invoice total" value={`₹${inr(inv.grand_total)}`} strong />
                  {!dead && <Sum label="Received" value={`₹${inr(paid)}`} tone="success" />}
                  {!dead && <Sum label="Still due" value={`₹${inr(due)}`} tone={due > 0 ? "error" : undefined} strong />}
                </Box>
                {inv.notes && (
                  <Typography sx={{ mt: 1.25, fontSize: 12.5, color: "text.secondary", whiteSpace: "pre-wrap" }}>
                    <b>Note:</b> {inv.notes}
                  </Typography>
                )}
              </Box>

              {/* payments */}
              <Box sx={{ ...panelSx(theme), p: 1.75 }}>
                <SectionHead icon={PaymentsOutlinedIcon} title="Payments" count={payments.length} tone="success" />
                {!payments.length ? (
                  <Typography sx={{ mt: 1.25, fontSize: 13, color: "text.secondary" }}>
                    {dead ? "No payments were taken on this invoice." : "Nothing received yet."}
                  </Typography>
                ) : (
                  <Stack spacing={0.75} sx={{ mt: 1.25 }}>
                    {payments.map((p) => (
                      <Box
                        key={p.id}
                        data-testid="payment-row"
                        sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.25, py: 0.85, border: 1, borderColor: "divider", borderRadius: 2 }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1, opacity: p.reversed ? 0.55 : 1 }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, ...nums, textDecoration: p.reversed ? "line-through" : "none" }}>
                            {p.amount < 0 ? "− " : ""}₹{inr(Math.abs(p.amount))}
                            {p.reversed && <Box component="span" sx={{ ml: 1, fontSize: 11, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>Removed</Box>}
                            {p.is_reversal && <Box component="span" sx={{ ml: 1, fontSize: 11, fontWeight: 700, display: "inline-block" }}>Reversal</Box>}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                            {fmtDate(p.payment_day || p.payment_date)} · {prettyMethod(p.payment_method)}
                            {p.transaction_reference ? ` · ${p.transaction_reference}` : ""}
                          </Typography>
                        </Box>
                        {canEdit && !dead && !p.reversed && !p.is_reversal && (
                          <IconButton
                            size="small"
                            aria-label={`Remove payment of ₹${inr(p.amount)}`}
                            disabled={!!busy}
                            onClick={() => setRemoving(p)}
                            sx={{ "&:hover": { color: "error.main", bgcolor: fade(toneColor(theme, "error"), 0.08) } }}
                          >
                            {busy === `del-${p.id}` ? <CircularProgress size={16} /> : <DeleteOutlineIcon fontSize="small" />}
                          </IconButton>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}

                {canPay && !dead && due > 0 && (
                  <Box sx={{ mt: 1.75, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", mb: 1 }}>Record a payment</Typography>
                    <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1.2fr 1fr auto" }, alignItems: "start" }}>
                      <TextField
                        size="small"
                        label="Amount"
                        type="number"
                        value={pay.amount}
                        onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                        inputProps={{ min: 0, step: "0.01", "aria-label": "Payment amount" }}
                        InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: "text.secondary" }}>₹</Typography> }}
                        error={!!payError}
                        sx={inputSx(toneColor(theme, "primary"), false)}
                      />
                      <TextField
                        select
                        size="small"
                        label="Method"
                        value={pay.payment_method}
                        onChange={(e) => setPay({ ...pay, payment_method: e.target.value })}
                        sx={inputSx(toneColor(theme, "primary"), false)}
                      >
                        {PAY_METHODS.map((m) => (
                          <MenuItem key={m.value} value={m.value}>
                            {m.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        label="Reference (optional)"
                        value={pay.transaction_reference}
                        onChange={(e) => setPay({ ...pay, transaction_reference: e.target.value })}
                        sx={{ ...inputSx(toneColor(theme, "primary"), false), gridColumn: { xs: "1 / -1", sm: "auto" } }}
                      />
                      <TextField
                        size="small"
                        label="Date"
                        type="date"
                        value={pay.payment_date}
                        onChange={(e) => setPay({ ...pay, payment_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ max: todayStr() }}
                        sx={inputSx(toneColor(theme, "primary"), false)}
                      />
                      <Button
                        variant="contained"
                        color="success"
                        disableElevation
                        onClick={recordPayment}
                        disabled={!!busy}
                        startIcon={busy === "pay" ? <CircularProgress size={14} color="inherit" /> : null}
                        sx={{ ...buttonSx, height: 40, gridColumn: { xs: "1 / -1", sm: "auto" } }}
                      >
                        Record
                      </Button>
                    </Box>
                    {payError && (
                      <Typography role="alert" sx={{ mt: 0.75, fontSize: 12.5, color: "error.main" }}>
                        {payError}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>

        {/* ---------------- footer ---------------- */}
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: 1, borderColor: "divider", gap: 1, flexWrap: "wrap", justifyContent: "space-between" }}>
          <Box>
            {canCancel && (
              <Button
                color="error"
                onClick={() => setCancelling(true)}
                disabled={!!busy || cancelBlocked}
                startIcon={<BlockOutlinedIcon />}
                sx={buttonSx}
                title={cancelBlocked ? "Remove the payments first" : undefined}
              >
                Cancel invoice
              </Button>
            )}
            {canCancel && cancelBlocked && (
              <Typography sx={{ fontSize: 11, color: "text.secondary", ml: 1, display: "inline" }}>remove payments first</Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={download}
              disabled={!inv || busy === "pdf"}
              startIcon={busy === "pdf" ? <CircularProgress size={14} /> : <DownloadIcon />}
              sx={buttonSx}
            >
              Download PDF
            </Button>
            {canSend && (
              <Button variant="contained" disableElevation onClick={() => setSending(true)} disabled={!inv} startIcon={<SendOutlinedIcon />} sx={buttonSx}>
                Send
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Surface>

      {/* ---------------- cancel ---------------- */}
      <Dialog open={cancelling} onClose={() => !busy && setCancelling(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Cancel {inv?.invoice_number}?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14, mb: 1.5 }}>
            Every medicine on it goes back to the shelf, and the invoice stops counting towards what the buyer owes. This can't be undone.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: 255 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelling(false)} disabled={busy === "cancel"} sx={buttonSx}>
            Keep invoice
          </Button>
          <Button
            color="error"
            variant="contained"
            disableElevation
            onClick={cancelInvoice}
            disabled={busy === "cancel"}
            startIcon={busy === "cancel" ? <CircularProgress size={14} color="inherit" /> : null}
            sx={buttonSx}
          >
            Cancel invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- remove a payment ---------------- */}
      <Dialog open={!!removing} onClose={() => !busy && setRemoving(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Remove this payment?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14 }}>
            ₹{removing ? inr(removing.amount) : ""} ({removing ? prettyMethod(removing.payment_method) : ""}) will come off what the buyer has paid, and the amount due goes back up.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRemoving(null)} disabled={!!busy} sx={buttonSx}>
            Keep it
          </Button>
          <Button color="error" variant="contained" disableElevation onClick={removePayment} disabled={!!busy} sx={buttonSx}>
            Remove payment
          </Button>
        </DialogActions>
      </Dialog>

      {sending && inv && (
        <SendB2BInvoiceDialog
          inline={inline}
          invoice={{ id: inv.id, invoice_number: inv.invoice_number, buyer_name: inv.buyer_name }}
          onClose={() => setSending(false)}
          onSent={({ to } = {}) => say(to ? `Invoice emailed to ${Array.isArray(to) ? to.join(", ") : to}` : "Invoice emailed")}
        />
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={4500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}