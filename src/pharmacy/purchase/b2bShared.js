// src/pharmacy/b2b/b2bShared.js
//
// What the B2B screens share: the API, number / date formatting, the strip-or-tablet wording,
// the invoice arithmetic (the same sums the server does, so the figure on screen is the
// figure that gets saved), and a couple of small pieces.
//
// Colours are never written here — everything goes through ../purchase/purchaseStyles, which
// reads src/theme/appColors.js.

import React from "react";
import axios from "axios";
import { Box, Dialog, Typography } from "@mui/material";
import { Pill } from "../purchase/purchaseStyles";
import { rateText } from "../shared/pharmacyUnits";

export { rateText };

export const API_BASE = process.env.REACT_APP_SITE_URL || "";
export const B2B_API = `${API_BASE}/api/pharmacy/b2b-sales`;
export const http = axios.create({ withCredentials: true });

/* ---------- numbers and dates ---------- */
export const money = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const inr = (n) =>
  money(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1.2L / ₹3.4K for tight spaces */
export const compactInr = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return inr(v);
};

const toDate = (d) => {
  if (!d) return null;
  const s = String(d);
  const dt = d instanceof Date ? d : new Date(s.length === 10 ? `${s}T00:00:00` : s.replace(" ", "T"));
  return Number.isNaN(dt.getTime()) ? null : dt;
};
export const fmtDate = (d) => {
  const dt = toDate(d);
  return dt ? dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};
export const fmtShortDate = (d) => {
  const dt = toDate(d);
  return dt ? dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—";
};
export const fmtExpiry = (d) => {
  const dt = toDate(d);
  return dt ? dt.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "";
};
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ---------- strips and tablets ---------- */
export const plural = (word, n) => {
  const w = String(word || "strip").toLowerCase();
  if (Number(n) === 1) return w;
  return /(s|x|ch|sh)$/.test(w) ? `${w}es` : `${w}s`;
};

/** the word for one pack of a line: "strip", "bottle", or "pack" for a 1-per-pack item with no own word */
const packName = (l) => {
  const w = String(l.pack_unit || l.unit || "strip").toLowerCase();
  return l.qty_type === "pack" && w === "strip" ? "pack" : w;
};

/** "5 strips", "14 tablets", "2 bottles" for one invoice line (the server sends it as qty_text) */
export const qtyText = (l) =>
  l.qty_text || `${Number(l.quantity) || 0} ${l.qty_type === "tablet" ? plural("tablet", l.quantity) : plural(packName(l), l.quantity)}`;

/** what one unit of the rate is: "strip", "tablet", "bottle" */
export const rateUnit = (l) => l.rate_unit || (l.qty_type === "tablet" ? "tablet" : packName(l));

/* ---------- the invoice arithmetic (same as the server's priceInvoice) ---------- */
export function priceInvoice(rows, { discount = 0, otherCharges = 0 } = {}) {
  const priced = rows.map((r) => ({ ...r, gross: money((Number(r.quantity) || 0) * (Number(r.unit_price) || 0)) }));
  const subtotal = money(priced.reduce((t, r) => t + r.gross, 0));
  const disc = Math.min(money(discount), subtotal);
  let left = disc;
  priced.forEach((r, i) => {
    const share = i === priced.length - 1 ? left : subtotal > 0 ? money((disc * r.gross) / subtotal) : 0;
    r.discount_amount = Math.min(share, r.gross);
    left = money(left - r.discount_amount);
    r.taxable_amount = money(r.gross - r.discount_amount);
    r.tax_amount = money((r.taxable_amount * (Number(r.gst_percentage) || 0)) / 100);
    r.total_amount = money(r.taxable_amount + r.tax_amount);
  });
  const taxable = money(priced.reduce((t, r) => t + r.taxable_amount, 0));
  const tax = money(priced.reduce((t, r) => t + r.tax_amount, 0));
  const other = money(otherCharges);
  const exact = money(taxable + tax + other);
  const grand = Math.round(exact);
  return {
    rows: priced,
    subtotal,
    discount_amount: disc,
    taxable_amount: taxable,
    tax_amount: tax,
    other_charges: other,
    round_off: money(grand - exact),
    grand_total: grand,
  };
}

/* ---------- the tones the screens agree on ---------- */
export const STATUS_TONE = { completed: "success", cancelled: "error" };
export const PAY_TONE = { unpaid: "error", partial: "warning", paid: "success" };
export const PAY_LABEL = { unpaid: "Unpaid", partial: "Part paid", paid: "Paid" };
export const STATUS_LABEL = { completed: "Issued", cancelled: "Cancelled" };

export const PAY_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];
export const prettyMethod = (m) => (PAY_METHODS.find((x) => x.value === m) || { label: String(m || "").replace(/_/g, " ") }).label;

/** The status chips for one invoice. A cancelled one shows only "Cancelled". */
export function InvoiceChips({ status, paymentStatus }) {
  if (status === "cancelled") return <Pill tone={STATUS_TONE.cancelled}>{STATUS_LABEL.cancelled}</Pill>;
  return paymentStatus ? <Pill tone={PAY_TONE[paymentStatus] || "neutral"}>{PAY_LABEL[paymentStatus] || paymentStatus}</Pill> : null;
}

/* ---------- errors ---------- */
/** A failed download arrives as a Blob with the server's JSON message inside it. */
export async function apiMessage(err, fallback) {
  const d = err?.response?.data;
  if (typeof Blob !== "undefined" && d instanceof Blob) {
    try {
      return JSON.parse(await d.text()).message || fallback;
    } catch {
      return fallback;
    }
  }
  return d?.message || err?.message || fallback;
}

/* ---------- the PDF ---------- */
export async function downloadInvoicePdf(invoice) {
  const r = await http.get(`${B2B_API}/pdf/${invoice.id}`, { params: { download: 1 }, responseType: "blob" });
  const blob = r.data instanceof Blob ? r.data : new Blob([r.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.invoice_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/* ---------- popup or page section ----------
   One wrapper so a screen can open either as a popup (Dialog) or as a section of the page
   that takes the place of what is there (inline). Inline fills the space its parent gives it
   (a flex column) and the parent hides the list behind it. */
export function Surface({ inline = false, open, onClose, labelledBy, children, ...dialogProps }) {
  if (!inline) {
    return (
      <Dialog open={!!open} onClose={onClose} aria-labelledby={labelledBy} {...dialogProps}>
        {children}
      </Dialog>
    );
  }
  if (!open) return null;
  return (
    <Box
      component="section"
      aria-labelledby={labelledBy}
      sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default" }}
    >
      {children}
    </Box>
  );
}

/* ---------- small layout pieces ---------- */
export function Field2({ label, children, sx }) {
  return (
    <Box sx={{ minWidth: 0, ...sx }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary" }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 500, wordBreak: "break-word", color: children ? "text.primary" : "text.disabled" }} component="div">
        {children || "Not on file"}
      </Typography>
    </Box>
  );
}