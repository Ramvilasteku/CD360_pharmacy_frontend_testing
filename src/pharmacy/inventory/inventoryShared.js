// src/pharmacy/inventory/inventoryShared.js
//
// What the inventory screens (Batches, Stock view, Low stock, Expiring) and the Medicines
// drawer share: the API, dates, the expiry colours, the status pill, page sizing.
//
// Units (see ../shared/pharmacyUnits.js): stock is TABLETS, shown as "12 strips + 5 tablets";
// prices are per strip; reorder levels are in strips.
//
// Colours only from src/theme/appColors.js (cssVar / tone / toneInk / fade) — no hex here.

import React, { useLayoutEffect, useRef, useState } from "react";
import axios from "axios";
import { Box, Tooltip, Typography } from "@mui/material";
import { cssVar, fade, tone, toneInk } from "../../theme/appColors";

export const API_BASE = process.env.REACT_APP_SITE_URL || process.env.REACT_APP_URL || "";
export const http = axios.create({ withCredentials: true });

export const BATCHES_API = `${API_BASE}/api/pharmacy/batches`;
export const MEDICINES_API = `${API_BASE}/api/pharmacy/medicines`;
export const ADJUST_API = `${API_BASE}/api/pharmacy/stock-adjustments/post`;

export const PERM = {
  view: "pharmacy.medicines.view",
  edit: "pharmacy.medicines.edit", // move a batch to another shelf
  adjust: "pharmacy.stock.create", // write off / correct stock
};

export const apiMessage = (err, fallback) => err?.response?.data?.message || err?.message || fallback;
export const isCancel = (err) => axios.isCancel(err) || err?.code === "ERR_CANCELED";

export const nums = { fontVariantNumeric: "tabular-nums" };
export const buttonSx = { textTransform: "none", fontWeight: 600, borderRadius: 2 };

/* ---------- dates ---------- */
const toDate = (d) => {
  if (!d) return null;
  const s = String(d);
  const dt = new Date(s.length === 10 ? `${s}T00:00:00` : s.replace(" ", "T"));
  return Number.isNaN(dt.getTime()) ? null : dt;
};
/** "Nov 2026" — how expiry is printed on a strip */
export const fmtExpiry = (d) => {
  const dt = toDate(d);
  return dt ? dt.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—";
};
export const fmtDate = (d) => {
  const dt = toDate(d);
  return dt ? dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

/** expired → error, under 90 days → warning, else none */
export const expiryTone = (days, status) =>
  status === "expired" || (days != null && days < 0) ? "error" : days != null && days < 90 ? "warning" : null;

export const expiryHint = (days) => {
  if (days == null) return "";
  if (days < 0) return `Expired ${-days} ${-days === 1 ? "day" : "days"} ago`;
  if (days === 0) return "Expires today";
  if (days < 60) return `${days} ${days === 1 ? "day" : "days"} left`;
  return `${Math.round(days / 30)} months left`;
};

/** The expiry date, in the warning colour when it is close, with how long is left underneath. */
export function ExpiryText({ date, days, status, compact = false }) {
  const t = expiryTone(days, status);
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 13.5, fontWeight: t ? 700 : 500, color: t ? toneInk(t) : "text.primary", whiteSpace: "nowrap", ...nums }}>
        {fmtExpiry(date)}
      </Typography>
      {!compact && days != null && (t || days < 180) && (
        <Typography sx={{ fontSize: 11.5, color: t ? toneInk(t) : "text.secondary", whiteSpace: "nowrap" }}>{expiryHint(days)}</Typography>
      )}
    </Box>
  );
}

/* ---------- status ---------- */
export const BATCH_STATUS = {
  ok: { label: "In stock", tone: "success" },
  expiring: { label: "Expiring", tone: "warning" },
  expired: { label: "Expired", tone: "error" },
  empty: { label: "Sold out", tone: "neutral" },
  blocked: { label: "Blocked", tone: "neutral" },
};

/** A small rounded label in a tone (success / warning / error / info / primary / neutral). */
export function Pill({ tone: t = "neutral", children, title, outlined = false, sx }) {
  const c = tone(t);
  const pill = (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        height: 22,
        px: 1,
        borderRadius: 11,
        fontSize: 11.5,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: toneInk(t),
        bgcolor: outlined ? "transparent" : fade(c, 0.12),
        border: 1,
        borderColor: outlined ? fade(c, 0.45) : "transparent",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
  return title ? <Tooltip title={title}>{pill}</Tooltip> : pill;
}

export function BatchStatusPill({ status }) {
  const s = BATCH_STATUS[status] || BATCH_STATUS.ok;
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

/** "12 strips + 5 tablets" with the raw tablet count as a quiet second line. */
export function StockText({ text, tablets, low, empty, sub, align = "left" }) {
  const color = low ? toneInk("error") : empty ? "text.secondary" : "text.primary";
  return (
    <Box sx={{ minWidth: 0, textAlign: align }}>
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color, whiteSpace: "nowrap", ...nums }}>{text ?? "—"}</Typography>
      {(sub || tablets != null) && (
        <Typography sx={{ fontSize: 11.5, color: low ? toneInk("error") : "text.secondary", whiteSpace: "nowrap", ...nums }}>
          {sub || `${Number(tablets).toLocaleString("en-IN")} ${Number(tablets) === 1 ? "tablet" : "tablets"}`}
        </Typography>
      )}
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

/** The quiet column-heading look shared by the inventory tables. */
export const headCellSx = {
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  color: "text.secondary",
  whiteSpace: "nowrap",
  py: 1.1,
  bgcolor: "background.paper",
  backgroundImage: `linear-gradient(${fade(cssVar("primary"), 0.04)}, ${fade(cssVar("primary"), 0.04)})`,
};