// src/pharmacy/transfer/TransferDetail.js
//
// One transfer, opened inline (Back arrow returns to the list).
//
//   Receiving branch   Accept → the stock lands in their branch. Before accepting they can say where
//                      each line goes on their shelf (it starts as the medicine's usual location).
//                      Reject (a reason is required) → the stock goes back to the sender.
//   Sending branch     Cancel while it is still in transit → the stock comes back.
//   Admin              can do all three.
//
// The buttons follow both the server's flags (can_accept / can_reject / can_cancel — which side
// of the transfer you are on, and whether it is still in transit) and your permissions:
// accept / reject need pharmacy.purchase_transfer.edit, cancel needs .create.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/Check";
import RefreshIcon from "@mui/icons-material/Refresh";

import { cssVar, fade, tone, toneInk } from "../../theme/appColors";
import {
  BranchTag,
  ConfirmDialog,
  StatusPill,
  api,
  apiMessage,
  buttonSx,
  colHeadSx,
  expiresSoon,
  fmtDateTime,
  fmtExpiry,
  inr,
  num,
  packOf,
  qtyWords,
  thinScroll,
} from "./transferShared";

/** Sent → in transit → received / rejected / cancelled */
function Progress({ t }) {
  const end = { received: "Received", rejected: "Rejected", cancelled: "Cancelled" }[t.status];
  const endTone = { received: "success", rejected: "error", cancelled: "neutral" }[t.status] || "warning";
  const steps = [
    { label: "Sent", sub: `${fmtDateTime(t.sent_at)} · ${t.sent_by_name || "—"}`, done: true, tone: "primary" },
    end
      ? { label: end, sub: `${fmtDateTime(t.closed_at)} · ${t.closed_by_name || "—"}`, done: true, tone: endTone }
      : { label: "Waiting for " + t.to_branch, sub: "Stock is in transit — not in either branch's stock", done: false, tone: "warning" },
  ];
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1.25, sm: 0 }}>
      {steps.map((s, i) => (
        <Stack key={s.label} direction="row" spacing={1.25} sx={{ flex: 1, minWidth: 0, alignItems: "flex-start" }}>
          <Box
            sx={{
              mt: 0.25,
              width: 22,
              height: 22,
              flexShrink: 0,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              color: s.done ? cssVar("white") : tone(s.tone),
              bgcolor: s.done ? tone(s.tone) : fade(tone(s.tone), 0.14),
              border: s.done ? "none" : `2px solid ${tone(s.tone)}`,
            }}
          >
            {s.done ? <CheckIcon sx={{ fontSize: 14 }} /> : <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: tone(s.tone) }} />}
          </Box>
          <Box sx={{ minWidth: 0, pr: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: s.done ? "text.primary" : toneInk(s.tone) }}>{s.label}</Typography>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>{s.sub}</Typography>
          </Box>
          {i === 0 && (
            <Box sx={{ display: { xs: "none", sm: "block" }, flex: 1, height: 2, mt: 1.4, mx: 1, borderRadius: 1, bgcolor: fade(cssVar("textSecondary"), 0.2), minWidth: 24 }} />
          )}
        </Stack>
      ))}
    </Stack>
  );
}

function Fact({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary" }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: 14, fontWeight: 500, wordBreak: "break-word" }}>
        {children}
      </Typography>
    </Box>
  );
}

export default function TransferDetail({ transferNumber, onBack, onChanged, permAccept, permCancel }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("md"));

  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [action, setAction] = useState(null); // "accept" | "reject" | "cancel"
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [shelf, setShelf] = useState({}); // line_id → where it goes at the receiving branch

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return api
      .get(transferNumber)
      .then(setT)
      .catch((e) => setError(apiMessage(e, "Could not open this transfer.")))
      .finally(() => setLoading(false));
  }, [transferNumber]);

  useEffect(() => {
    load();
  }, [load]);

  // the shelf boxes start at each medicine's usual location (kept while the user edits)
  useEffect(() => {
    if (!t) return;
    setShelf((cur) => {
      const next = {};
      for (const it of t.items || []) next[it.line_id] = cur[it.line_id] ?? (it.default_location || "");
      return next;
    });
  }, [t]);

  // purchase price is per strip; quantities are tablets
  const value = useMemo(
    () => (t?.items || []).reduce((sum, it) => sum + ((Number(it.quantity) || 0) / packOf(it).upp) * (Number(it.purchase_price) || 0), 0),
    [t]
  );

  const showAccept = !!t?.can_accept && permAccept;
  const showReject = !!t?.can_reject && permAccept;
  const showCancel = !!t?.can_cancel && permCancel;
  const hasActions = showAccept || showReject || showCancel;

  const openAction = (a) => {
    setAction(a);
    setReason("");
    setActionError("");
  };

  const runAction = async () => {
    if (action === "reject" && !reason.trim()) return;
    setBusy(true);
    setActionError("");
    try {
      const r =
        action === "accept"
          ? await api.accept(
              t.transfer_number,
              reason.trim() || undefined,
              t.items.map((it) => ({ line_id: it.line_id, storage_location: String(shelf[it.line_id] || "").trim() || undefined }))
            )
          : await api[action](t.transfer_number, reason.trim() || undefined);
      setAction(null);
      setT(r.data);
      onChanged(r.message);
    } catch (e) {
      setActionError(apiMessage(e, "That didn't go through. Please try again."));
      // someone else may have closed it meanwhile — show the latest state underneath
      if (e?.response?.status === 409) load();
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- header ---------------- */
  const header = (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ flexShrink: 0, px: { xs: 1, md: 2 }, py: 1, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
    >
      <IconButton aria-label="Back to transfers" onClick={onBack}>
        <ArrowBackIcon />
      </IconButton>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 16.5, md: 18 } }} noWrap>
            {transferNumber}
          </Typography>
          {t && <StatusPill status={t.status} />}
        </Stack>
        {t && !phone && (
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
            {t.direction === "incoming" ? "Coming to your branch" : t.direction === "outgoing" ? "Sent from your branch" : "Branch to branch transfer"}
          </Typography>
        )}
      </Box>
      <Tooltip title="Refresh">
        <span>
          <IconButton aria-label="Refresh" onClick={load} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );

  if (loading && !t) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {header}
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={88} />
          <Skeleton variant="rounded" height={64} />
          <Skeleton variant="rounded" height={220} />
        </Stack>
      </Box>
    );
  }

  if (error && !t) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {header}
        <Box sx={{ p: 2 }}>
          <Alert severity="error" sx={{ borderRadius: 2 }} action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>
            {error}
          </Alert>
        </Box>
      </Box>
    );
  }

  /* ---------------- items ---------------- */
  const placing = t.status === "in_transit" && showAccept; // the receiving branch chooses shelves before accepting
  const shelfBox = (it, fullWidth) => (
    <TextField
      size="small"
      fullWidth={fullWidth}
      value={shelf[it.line_id] ?? ""}
      onChange={(e) => setShelf((cur) => ({ ...cur, [it.line_id]: e.target.value.slice(0, 100) }))}
      placeholder="e.g. Rack B2"
      inputProps={{ "aria-label": `Shelf for ${it.name} at ${t.to_branch}` }}
      sx={{ minWidth: fullWidth ? 0 : 140, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.paper" } }}
    />
  );
  const shelfText = (it) =>
    t.status === "received" ? it.destination_location || "—" : it.source_location ? `${it.source_location} (at ${t.from_branch})` : "—";
  const heads = ["Medicine", "Batch", "Expiry", "Quantity", placing ? `Shelf at ${t.to_branch}` : "Shelf", "MRP"];

  const itemsTable = (
    <Table size="small" stickyHeader sx={{ minWidth: 760 }}>
      <TableHead>
        <TableRow>
          {heads.map((h, i) => (
            <TableCell key={h} sx={{ ...colHeadSx, py: 1 }} align={i === 3 || i === 5 ? "right" : "left"}>
              {h}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {t.items.map((it) => (
          <TableRow key={it.line_id} hover sx={{ "& td": { borderColor: "divider" } }}>
            <TableCell sx={{ py: 1.1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{it.name}</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                {[it.generic_name, packOf(it).upp > 1 ? `${packOf(it).upp} per ${packOf(it).word}` : it.pack_size, it.medicine_code].filter(Boolean).join(" · ")}
              </Typography>
            </TableCell>
            <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{it.batch_number}</TableCell>
            <TableCell sx={{ whiteSpace: "nowrap", color: expiresSoon(it.expiry_date) ? cssVar("warning") : undefined, fontWeight: expiresSoon(it.expiry_date) ? 600 : 400 }}>
              {fmtExpiry(it.expiry_date)}
            </TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>{it.qty_text || qtyWords(it.quantity, it)}</Typography>
              {packOf(it).upp > 1 && <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{num(it.quantity)} tablets</Typography>}
            </TableCell>
            <TableCell sx={{ py: 0.75 }}>{placing ? shelfBox(it) : <Typography sx={{ fontSize: 13.5 }}>{shelfText(it)}</Typography>}</TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
              ₹{inr(it.mrp)}
              <Typography component="span" sx={{ fontSize: 11, color: "text.secondary" }}>
                {" "}/{packOf(it).upp > 1 ? packOf(it).word : packOf(it).word === "strip" ? "pack" : packOf(it).word}
              </Typography>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const itemCards = (
    <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
      {t.items.map((it) => (
        <Box key={it.line_id} sx={{ py: 1.25 }}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{it.name}</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                Batch {it.batch_number} · Exp{" "}
                <Box component="span" sx={{ color: expiresSoon(it.expiry_date) ? cssVar("warning") : undefined }}>
                  {fmtExpiry(it.expiry_date)}
                </Box>
              </Typography>
              {!placing && <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Shelf: {shelfText(it)}</Typography>}
            </Box>
            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{it.qty_text || qtyWords(it.quantity, it)}</Typography>
              <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{num(it.quantity)} tablets</Typography>
            </Box>
          </Stack>
          {placing && (
            <Box sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary", mb: 0.5 }}>Shelf at {t.to_branch}</Typography>
              {shelfBox(it, true)}
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );

  const panelSx = { bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 3 };

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {header}

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 1.5, md: 2.5 }, ...thinScroll }}>
        <Stack spacing={1.5} sx={{ maxWidth: 1100, mx: "auto" }}>
          {actionError && !action && (
            <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setActionError("")}>
              {actionError}
            </Alert>
          )}

          {t.status === "in_transit" && showAccept && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Count what arrived. Accept only if it matches — the stock is added to {t.to_branch} as soon as you accept.
            </Alert>
          )}

          {/* route + facts */}
          <Box sx={{ ...panelSx, p: { xs: 1.75, md: 2.25 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0, flexWrap: "wrap", rowGap: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary", mb: 0.4 }}>From</Typography>
                  <BranchTag strong>{t.from_branch}</BranchTag>
                </Box>
                <ArrowForwardIcon sx={{ color: "text.secondary", mt: 2 }} />
                <Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary", mb: 0.4 }}>To</Typography>
                  <BranchTag strong>{t.to_branch}</BranchTag>
                </Box>
              </Stack>
              <Stack direction="row" spacing={3} sx={{ flexShrink: 0 }}>
                <Fact label="Batches">{t.line_count}</Fact>
                <Fact label="Tablets">{num(t.total_units)}</Fact>
                <Fact label="Value (purchase)">₹{inr(value)}</Fact>
              </Stack>
            </Stack>

            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
              <Progress t={t} />
            </Box>

            {(t.remarks || t.close_reason) && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                {t.remarks && (
                  <Box sx={{ flex: 1 }}>
                    <Fact label="Note from sender">{t.remarks}</Fact>
                  </Box>
                )}
                {t.close_reason && (
                  <Box sx={{ flex: 1 }}>
                    <Fact label={t.status === "rejected" ? "Reason for rejecting" : t.status === "cancelled" ? "Reason for cancelling" : "Note on receipt"}>
                      {t.close_reason}
                    </Fact>
                  </Box>
                )}
              </Stack>
            )}
          </Box>

          {/* items */}
          <Box sx={{ ...panelSx, overflow: "hidden" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ px: { xs: 1.75, md: 2.25 }, pt: 1.5, pb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Medicines</Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                {placing ? "Say where each line goes on your shelf, then accept" : "Strips + loose tablets"}
              </Typography>
            </Stack>
            <Box sx={{ overflowX: "auto", px: phone ? 1.75 : 0, ...thinScroll }}>{phone ? itemCards : itemsTable}</Box>
          </Box>
        </Stack>
      </Box>

      {/* actions */}
      {hasActions && (
        <Stack
          direction="row"
          spacing={1}
          justifyContent="flex-end"
          sx={{ flexShrink: 0, px: { xs: 1.5, md: 2.5 }, py: 1.25, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}
        >
          {showCancel && (
            <Button variant="outlined" color="inherit" onClick={() => openAction("cancel")} sx={{ ...buttonSx, flex: { xs: 1, sm: "none" } }}>
              Cancel transfer
            </Button>
          )}
          {showReject && (
            <Button variant="outlined" color="error" onClick={() => openAction("reject")} sx={{ ...buttonSx, flex: { xs: 1, sm: "none" } }}>
              Reject
            </Button>
          )}
          {showAccept && (
            <Button variant="contained" disableElevation startIcon={<CheckIcon />} onClick={() => openAction("accept")} sx={{ ...buttonSx, flex: { xs: 1.4, sm: "none" } }}>
              Accept stock
            </Button>
          )}
        </Stack>
      )}

      {/* confirm dialogs */}
      <ConfirmDialog
        open={action === "accept"}
        title={`Accept ${t.transfer_number}?`}
        confirmLabel="Accept stock"
        busy={busy}
        onConfirm={runAction}
        onClose={() => setAction(null)}
      >
        <Typography sx={{ fontSize: 14 }}>
          {t.line_count} {t.line_count === 1 ? "batch" : "batches"} ({num(t.total_units)} tablets) will be added to <b>{t.to_branch}</b> stock, on the shelves you chose. This can’t be undone.
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Note (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          sx={{ mt: 2 }}
        />
        {actionError && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {actionError}
          </Alert>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={action === "reject"}
        title={`Reject ${t.transfer_number}?`}
        confirmLabel="Reject"
        color="error"
        busy={busy}
        confirmDisabled={!reason.trim()}
        onConfirm={runAction}
        onClose={() => setAction(null)}
      >
        <Typography sx={{ fontSize: 14 }}>
          The stock goes back to <b>{t.from_branch}</b>. They’ll see your reason.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          required
          multiline
          minRows={2}
          size="small"
          label="Reason"
          placeholder="e.g. Box damaged, 2 strips short"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          sx={{ mt: 2 }}
        />
        {actionError && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {actionError}
          </Alert>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={action === "cancel"}
        title={`Cancel ${t.transfer_number}?`}
        confirmLabel="Cancel transfer"
        cancelLabel="Keep it"
        color="error"
        busy={busy}
        onConfirm={runAction}
        onClose={() => setAction(null)}
      >
        <Typography sx={{ fontSize: 14 }}>
          The stock comes back into <b>{t.from_branch}</b> straight away, and {t.to_branch} can no longer accept it.
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 500))}
          sx={{ mt: 2 }}
        />
        {actionError && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {actionError}
          </Alert>
        )}
      </ConfirmDialog>
    </Box>
  );
}