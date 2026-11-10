// src/components/pharmacy/sales/create/CheckoutDialog.jsx
//
// Updated to match the new backend POST /api/pharmacy/sales/post
// which expects a single `customer` object and does find-or-create
// against pharmacy_customer_pos inside its transaction.
//
// Changes vs. previous version:
//   • Accepts new `customerPayload` prop from POS.jsx — the same
//     shape handleParkSale sends. If the parent didn't pass it
//     (older POS versions), we fall back to building it locally.
//   • Payload now sends: customer: {...}, totals, due_amount,
//     payment_status — not the flat customer_id/name/phone fields.
//   • onSuccess receives 4 args: (saleNumber, paid, saleId, serverData)
//     — the parent uses serverData.customer_created to show
//     "✓ New patient added" in the toast and link substitution logs
//     via saleId.
//   • Everything else (UI, method tiles, change/due logic) is
//     untouched.

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog, DialogContent, Box, Typography, Button, TextField, Stack, Paper,
  IconButton, Chip, Divider, CircularProgress, Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PaymentsIcon from "@mui/icons-material/Payments";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const API = process.env.REACT_APP_URL;

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: PaymentsIcon, color: "#10b981" },
  { value: "upi", label: "UPI", icon: QrCode2Icon, color: "#6366f1" },
  { value: "card", label: "Card", icon: CreditCardIcon, color: "#f59e0b" },
  { value: "bank_transfer", label: "Transfer", icon: AccountBalanceIcon, color: "#8b5cf6" },
];

const FULL_PAYMENT_METHODS = ["cash", "card", "upi", "bank_transfer"];

/* Fallback builder — used only if parent didn't pass customerPayload */
const toCustomerPayload = (customer = {}) => ({
  id: customer.id || null,
  name: customer.name ? String(customer.name).trim() : "",
  mobile: customer.mobile ? String(customer.mobile).trim() : "",
  email: customer.email ? String(customer.email).trim() : null,
  gender: customer.gender || null,
  age:
    customer.age !== undefined && customer.age !== null && customer.age !== ""
      ? Number(customer.age)
      : null,
  isNew: !!customer.isNew,
});

export default function CheckoutDialog({
  open,
  onClose,
  customer,
  customerPayload,        // ⭐ NEW — preferred source from POS.jsx
  items,
  notes,
  subtotal,
  taxAmount,
  grandTotal,
  // N3: the server recomputes the bill from the lines, so it needs the two bill-level
  // inputs too — the order discount in ₹ (NOT the per-line discounts) and the
  // "GST on whole bill" % (0 = each line's own GST).
  discountAmount = 0,
  overallGstPercent = 0,
  currentDraftId,
  // "sale" = a parked POS bill (pharmacy_sales draft) → PATCH /sales/drafts/:id/complete.
  // "dispensing" = a parked prescription from Existing patient. Those live in
  // pharmacy_dispensing, so they are billed as a NEW sale with the cart as it is now;
  // the parent then closes the dispensing draft (N8, 10 Nov 2026).
  draftKind = "sale",
  onSuccess,
  branchParams = {},
}) {
  const [method, setMethod] = useState("cash");
  const [paid, setPaid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setMethod("cash");
      setPaid(grandTotal.toFixed(2));
      setError("");
    }
  }, [open, grandTotal]);

  const paidNum = Number(paid) || 0;
  const change = Math.max(0, paidNum - grandTotal);
  const due = Math.max(0, grandTotal - paidNum);

  const quickAmounts = [100, 500, 1000, 2000].filter((n) => n >= grandTotal).slice(0, 3);

  /* ═════ SUBMIT ═════ */
  const handleSubmit = async () => {
    setError("");

    if (paidNum > grandTotal && method !== "cash") {
      setError("Only cash can accept more than total");
      return;
    }
    if (FULL_PAYMENT_METHODS.includes(method) && paidNum < grandTotal) {
      setError(`${method.toUpperCase()} requires full payment`);
      return;
    }

    const paidClamped = Math.min(paidNum, grandTotal);
    const dueAmount = Math.max(0, grandTotal - paidClamped);
    const paymentStatus =
      paidClamped >= grandTotal
        ? "paid"
        : paidClamped > 0
          ? "partial"
          : "unpaid";

    setSubmitting(true);
    try {
      let res;

      if (currentDraftId && draftKind === "sale") {
        // ── Resuming a parked draft → PATCH complete endpoint ──
        res = await axios.patch(
          `${API}/api/pharmacy/sales/drafts/${currentDraftId}/complete`,
          {
            payment_method: method,
            paid_amount: paidClamped,
            due_amount: dueAmount,
            payment_status: paymentStatus,
          },
          { withCredentials: true }
        );
      } else {
        // ── New sale → POST /sales/post ──
        // Backend uses `customer` to find-or-create in pharmacy_customer_pos
        // and stamps customer_id on pharmacy_sales.
        const payload = {
          customer: customerPayload || toCustomerPayload(customer),

          items: items.map((i) => ({
            medicine_id: i.medicine_id,
            batch_id: i.batch_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount_amount: i.discount_amount || 0,
            gst_percentage: i.gst_percentage || 0,
          })),

          // Totals — backend recomputes line totals but stamps these on header
          subtotal,
          discount_amount: Math.max(0, Number(discountAmount) || 0),
          overall_gst_percent: Math.max(0, Number(overallGstPercent) || 0),
          tax_amount: taxAmount,
          grand_total: grandTotal,   // the server checks it matches its own sum

          // Payment
          payment_method: method,
          paid_amount: paidClamped,
          due_amount: dueAmount,
          payment_status: paymentStatus,

          status: "completed",
          notes: notes?.trim() || null,

          // The branch chosen in the Sales header. The server stamps it on the sale and
          // takes the stock out of that branch's batches; it ignores this for staff,
          // who are always pinned to their own branch.
          ...(branchParams.branch ? { branch: branchParams.branch } : {}),
        };

        res = await axios.post(
          `${API}/api/pharmacy/sales/post`,
          payload,
          { withCredentials: true }
        );
      }

      const data = res.data?.data || {};

      // Forward 4 args so POS.jsx can:
      //   • show "✓ New patient added" when customer_created is true
      //   • link substitution logs via saleId
      onSuccess(
        data.sale_number || "",
        paidClamped,
        data.id || null,
        data            // full server payload: {id, sale_number, customer_id, customer_created, ...}
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete sale");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
      sx={{
        /* keep the dialog centered on the page */
        "& .MuiDialog-container": {
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: "#0f766e",
          color: "#fff",
          p: 3,
          position: "relative",
          background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 12, right: 12, color: "#fff" }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="overline" sx={{ opacity: 0.9, fontWeight: 700 }}>
          Checkout · {customer.name}
          {customer.isNew && (
            <Chip
              label="NEW PATIENT"
              size="small"
              sx={{
                ml: 1,
                height: 18,
                fontSize: 10,
                bgcolor: "#fff",
                color: "#0f766e",
                fontWeight: 700,
              }}
            />
          )}
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ mt: 0.5 }}>
          ₹{grandTotal.toFixed(2)}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {items.length} medicines · {customer.mobile}
        </Typography>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 440 }}>
          {/* LEFT — Order summary */}
          <Box sx={{ p: 3, bgcolor: "#f8fafc", borderRight: "1px solid #e2e8f0" }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary">
              Order Summary
            </Typography>

            <Stack spacing={1} sx={{ my: 2, maxHeight: 220, overflow: "auto", pr: 1 }}>
              {items.map((i, idx) => (
                <Stack key={idx} direction="row" justifyContent="space-between" alignItems="start">
                  <Box sx={{ flex: 1, mr: 1 }}>
                    <Typography fontSize={13} fontWeight={600} noWrap>
                      {i.medicine_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ₹{i.unit_price.toFixed(2)} × {i.quantity}
                    </Typography>
                  </Box>
                  <Typography fontSize={13} fontWeight={700}>
                    ₹{(i.unit_price * i.quantity).toFixed(2)}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Stack spacing={1}>
              <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />
              <Row label="GST" value={`₹${taxAmount.toFixed(2)}`} />
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={700}>Grand Total</Typography>
                <Typography fontWeight={800} color="#0f766e">
                  ₹{grandTotal.toFixed(2)}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {/* RIGHT — Payment */}
          <Box sx={{ p: 3 }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary">
              Payment Method
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1,
                my: 1.5,
              }}
            >
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const active = method === m.value;
                return (
                  <Paper
                    key={m.value}
                    elevation={0}
                    onClick={() => setMethod(m.value)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      textAlign: "center",
                      cursor: "pointer",
                      border: active ? `2px solid ${m.color}` : "2px solid #e2e8f0",
                      bgcolor: active ? `${m.color}10` : "#fff",
                      transition: "all 0.15s",
                      "&:hover": { borderColor: m.color },
                    }}
                  >
                    <Icon sx={{ fontSize: 24, color: active ? m.color : "#64748b" }} />
                    <Typography
                      variant="caption"
                      display="block"
                      fontWeight={600}
                      sx={{ mt: 0.5, color: active ? m.color : "#334155" }}
                    >
                      {m.label}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>

            <TextField
              label="Amount received"
              type="number"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              fullWidth
              size="medium"
              InputProps={{
                sx: { fontSize: 24, fontWeight: 700, "& input": { textAlign: "right" } },
              }}
              sx={{ my: 1.5 }}
            />

            {method === "cash" && quickAmounts.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPaid(grandTotal.toFixed(2))}
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  Exact ₹{grandTotal.toFixed(0)}
                </Button>
                {quickAmounts.map((n) => (
                  <Button
                    key={n}
                    size="small"
                    variant="outlined"
                    onClick={() => setPaid(n.toString())}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                  >
                    ₹{n}
                  </Button>
                ))}
              </Stack>
            )}

            {change > 0 && (
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "#f0fdf4",
                  borderLeft: "4px solid #10b981",
                  borderRadius: 1.5,
                  mb: 2,
                }}
                elevation={0}
              >
                <Typography variant="caption" color="text.secondary">
                  Change to return
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#10b981">
                  ₹{change.toFixed(2)}
                </Typography>
              </Paper>
            )}

            {due > 0 && method === "credit" && (
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "#fef2f2",
                  borderLeft: "4px solid #ef4444",
                  borderRadius: 1.5,
                  mb: 2,
                }}
                elevation={0}
              >
                <Typography variant="caption" color="text.secondary">
                  On credit (owed)
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#ef4444">
                  ₹{due.toFixed(2)}
                </Typography>
              </Paper>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={
                submitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <CheckCircleIcon />
                )
              }
              onClick={handleSubmit}
              disabled={submitting}
              sx={{
                bgcolor: "#0f766e",
                py: 1.5,
                fontSize: 15,
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 2.5,
                boxShadow: "0 4px 12px #0f766e40",
                "&:hover": { bgcolor: "#0d5a54" },
              }}
            >
              {submitting ? "Processing…" : `Complete Sale · ₹${grandTotal.toFixed(2)}`}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

const Row = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between">
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}>
      {value}
    </Typography>
  </Stack>
);