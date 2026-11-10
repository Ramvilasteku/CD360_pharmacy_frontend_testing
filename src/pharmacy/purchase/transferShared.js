// src/pharmacy/transfer/transferShared.js
//
// What the Purchase Transfer screens share: the API, date / number formatting, the status
// wording and colours, the confirm dialog, and the hook that sizes a page to the window.
//
// Colours are never written here as hex — everything reads src/theme/appColors.js.
//
// Backend: routes/pharmacy/pharmacyStockTransfer.js @ /api/pharmacy/stock-transfers

import React, { useLayoutEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { cssVar, fade, tone, toneInk } from "../../theme/appColors";
import { describeStock, packWord, unitsPerPack } from "../shared/pharmacyUnits";

/* ---------- API ---------- */
export const API_BASE = process.env.REACT_APP_SITE_URL || "";
export const TRANSFER_API = `${API_BASE}/api/pharmacy/stock-transfers`;
export const http = axios.create({ withCredentials: true });

export const PERM = {
  view: "pharmacy.purchase_transfer.view",
  create: "pharmacy.purchase_transfer.create", // send, cancel
  edit: "pharmacy.purchase_transfer.edit", // accept, reject
};

export const api = {
  branches: () => http.get(`${TRANSFER_API}/get/branches`).then((r) => r.data.data),
  stock: (params) => http.get(`${TRANSFER_API}/getall/transferable-stock`, { params }).then((r) => r.data.data),
  list: (params) => http.get(`${TRANSFER_API}/getall/transfers`, { params }).then((r) => r.data),
  get: (ref) => http.get(`${TRANSFER_API}/get/transfer/${encodeURIComponent(ref)}`).then((r) => r.data.data),
  send: (body) => http.post(`${TRANSFER_API}/post/transfer`, body).then((r) => r.data),
  // locations: [{ line_id, storage_location }] — where each line goes on the receiving branch's shelf
  accept: (ref, reason, locations) =>
    http.post(`${TRANSFER_API}/accept/transfer/${encodeURIComponent(ref)}`, { reason, locations }).then((r) => r.data),
  reject: (ref, reason) => http.post(`${TRANSFER_API}/reject/transfer/${encodeURIComponent(ref)}`, { reason }).then((r) => r.data),
  cancel: (ref, reason) => http.post(`${TRANSFER_API}/cancel/transfer/${encodeURIComponent(ref)}`, { reason }).then((r) => r.data),
};

/** The server's message, or a fallback. */
export const apiMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

/* ---------- numbers and dates ---------- */
export const num = (n) => (Number(n) || 0).toLocaleString("en-IN");
export const inr = (n) =>
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The server sends "YYYY-MM-DD HH:mm:ss" in India time, or "YYYY-MM-DD". Shown exactly as sent.
const toDate = (d) => {
  if (!d) return null;
  const s = String(d);
  const dt = new Date(s.length === 10 ? `${s}T00:00:00` : s.replace(" ", "T"));
  return Number.isNaN(dt.getTime()) ? null : dt;
};
export const fmtDate = (d) => {
  const dt = toDate(d);
  return dt ? dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};
export const fmtDateTime = (d) => {
  const dt = toDate(d);
  if (!dt) return "—";
  return `${dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, ${dt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;
};
export const fmtExpiry = (d) => {
  const dt = toDate(d);
  return dt ? dt.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—";
};
/** Expiring within 90 days → shown in the warning colour. */
export const expiresSoon = (d) => {
  const dt = toDate(d);
  return dt ? dt.getTime() - Date.now() < 90 * 24 * 3600 * 1000 : false;
};

/* ---------- units ----------
   Quantities are TABLETS; each batch has its own tablets per strip (units_per_pack, sent by the
   server on every stock row and transfer line). The words come from the shared rules. */
/** a batch / line row → { upp, word } */
export const packOf = (row) => {
  const upp = unitsPerPack(row);
  return { upp, word: row?.word || packWord(row, upp) };
};
/** 45 tablets of a strip-of-10 → "4 strips + 5 tablets" */
export const qtyWords = (tablets, row) => {
  const { upp, word } = packOf(row);
  return describeStock(tablets, upp, word);
};

/* ---------- status ---------- */
export const STATUS = {
  in_transit: { label: "In transit", tone: "warning" },
  received: { label: "Received", tone: "success" },
  rejected: { label: "Rejected", tone: "error" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function StatusPill({ status, size = "md" }) {
  const s = STATUS[status] || { label: status || "—", tone: "neutral" };
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.6,
        px: size === "sm" ? 0.9 : 1.1,
        py: size === "sm" ? 0.2 : 0.35,
        borderRadius: 999,
        fontSize: size === "sm" ? 11.5 : 12.5,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        color: toneInk(s.tone),
        bgcolor: fade(tone(s.tone), 0.12),
        border: `1px solid ${fade(tone(s.tone), 0.25)}`,
      }}
    >
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: tone(s.tone), flexShrink: 0 }} />
      {s.label}
    </Box>
  );
}

/* ---------- styles the screens share ---------- */
export const buttonSx = { textTransform: "none", fontWeight: 600, borderRadius: 2 };

export const thinScroll = {
  scrollbarWidth: "thin",
  "&::-webkit-scrollbar": { width: 8, height: 8 },
  "&::-webkit-scrollbar-thumb": { backgroundColor: fade(cssVar("textSecondary"), 0.3), borderRadius: 8 },
};

export const colHeadSx = {
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: toneInk("primary"),
  bgcolor: fade(cssVar("primary"), 0.06),
  whiteSpace: "nowrap",
};

/** The branch name in a soft chip: "Kukatpally". */
export function BranchTag({ children, strong }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        maxWidth: "100%",
        px: 1,
        py: 0.25,
        borderRadius: 1.5,
        fontSize: 13,
        fontWeight: strong ? 700 : 600,
        color: strong ? toneInk("primary") : "text.primary",
        bgcolor: strong ? fade(cssVar("primary"), 0.1) : fade(cssVar("textSecondary"), 0.08),
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
      }}
    >
      {children}
    </Box>
  );
}

/* ---------- confirm dialog (no window.confirm anywhere) ---------- */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Back",
  color = "primary",
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 18, pb: 1 }}>{title}</DialogTitle>
      <DialogContent sx={{ pt: "4px !important" }}>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.25, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} sx={buttonSx}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          disableElevation
          color={color}
          onClick={onConfirm}
          disabled={busy || confirmDisabled}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
          sx={buttonSx}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Quiet empty / info block for the middle of a panel. */
export function EmptyState({ icon, title, children, action }) {
  return (
    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3, textAlign: "center" }}>
      <Box sx={{ maxWidth: 360 }}>
        {icon && (
          <Box
            sx={{
              width: 52,
              height: 52,
              mx: "auto",
              mb: 1.5,
              borderRadius: 3,
              display: "grid",
              placeItems: "center",
              color: cssVar("primary"),
              bgcolor: fade(cssVar("primary"), 0.08),
            }}
          >
            {icon}
          </Box>
        )}
        <Typography sx={{ fontWeight: 700, fontSize: 15.5 }}>{title}</Typography>
        {children && <Typography sx={{ fontSize: 13.5, color: "text.secondary", mt: 0.5 }}>{children}</Typography>}
        {action && <Box sx={{ mt: 2 }}>{action}</Box>}
      </Box>
    </Box>
  );
}

/* ---------- page sizing ---------- */
/** Sizes the page to the rest of the window so the BROWSER never scrolls (same hook as B2B / Purchase Orders). */
export function useFitsWindow(fallback) {
  const ref = useRef(null);
  const lastTop = useRef(-1);
  const [height, setHeight] = useState(fallback);

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top));
      if (Math.abs(top - lastTop.current) < 1) return;
      lastTop.current = top;
      setHeight(`calc(100dvh - ${top}px)`);
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
    };
  }, []);

  return [ref, height];
}