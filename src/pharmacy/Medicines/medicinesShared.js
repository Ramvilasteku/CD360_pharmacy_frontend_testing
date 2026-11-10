// src/components/pharmacy/medicines/medicinesShared.js
//
// Everything shared across Medicines.jsx, MedicineForm.jsx and
// MedicineCsvImport.jsx — constants, formatters, small helpers,
// and the atom components (Pill, PolicyPill, RxBadge, EmptyState,
// SectionTitle, useElementWidth).
//
// Deliberately omitted from v5: useFitToScreen, scrollParent,
// spaceBelow, px — the page no longer caps its own height; the
// browser owns the scroll.

import React, { useState, useEffect, useLayoutEffect } from "react";
import axios from "axios";
import {
  Box, Stack, Typography, Button, Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AddIcon from "@mui/icons-material/Add";

export const API = process.env.REACT_APP_URL;
export const NO_PERMISSIONS = []; // stable fallback for useSelector

/* ───────────────────────────── constants ───────────────────────────── */

export const EMPTY_FORM = {
  medicine_data_id: null,
  medicine_data_label: "",
  category_id: "",
  manufacturer: "",
  pack_size: "",
  unit: "",
  medicine_code: "",
  barcode: "",
  hsn_code: "",
  gst_percentage: 0,
  purchase_price: 0,
  selling_price: 0,
  reorder_level: 0,
  maximum_stock: "",
  prescription_required: false,
  status: "active",
  return_policy: {
    is_returnable: true,
    window_days: 7,
    condition: "unopened_only",
    requires_approval_after_window: true,
    reason: "",
    notes: "",
  },
};

export const CONDITION_OPTIONS = [
  { value: "any", label: "Any condition" },
  { value: "unopened_only", label: "Unopened only" },
  { value: "sealed_pack_only", label: "Sealed pack only" },
  { value: "batch_intact", label: "Batch label intact" },
];
export const CONDITION_LABEL = Object.fromEntries(
  CONDITION_OPTIONS.map((o) => [o.value, o.label])
);

export const GST_SLABS = [0, 5, 12, 18, 28];
export const WINDOW_PRESETS = [7, 15, 30];

export const STATUS_TABS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

export const RX_FILTERS = [
  { value: "", label: "All" },
  { value: "true", label: "Rx only" },
  { value: "false", label: "OTC only" },
];
export const RETURN_FILTERS = [
  { value: "", label: "All" },
  { value: "true", label: "Returnable" },
  { value: "false", label: "Non-returnable" },
];

export const DEFAULT_FILTER = {
  search: "",
  status: "active",
  category_id: "",
  prescription_required: "",
  returnable: "",
};

export const CSV_COLUMNS = [
  "medicine_name", "generic_name", "brand_name", "dosage_form", "strength",
  "category_name", "manufacturer", "pack_size", "unit", "medicine_code",
  "barcode", "hsn_code", "gst_percentage", "purchase_price", "selling_price",
  "reorder_level", "maximum_stock", "prescription_required",
];

/* Page size — 10 records per page, applied page-wide */
export const PAGE_SIZE = 10;

/* ───────────────────────────── style helpers ───────────────────────────── */

export const numeric = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
export const btn = { borderRadius: "10px", textTransform: "none", fontWeight: 600 };
export const srOnly = {
  position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px",
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};

/* ───────────────────────────── formatters ───────────────────────────── */

export const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// null = no policy set (default), undefined = unreadable
export function parsePolicy(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return undefined; }
}

export const brandIfNew = (m) =>
  m.brand_name &&
  !String(m.medicine_name || "")
    .toLowerCase()
    .includes(String(m.brand_name).toLowerCase())
    ? m.brand_name
    : null;

export const detailText = (m) =>
  [brandIfNew(m), m.strength, m.dosage_form].filter(Boolean).join(" · ");

export const medicineLabel = (m) =>
  m
    ? `${m.medicine_name}${m.strength ? ` · ${m.strength}` : ""}${
        m.dosage_form ? ` · ${m.dosage_form}` : ""
      }`
    : "";

/* "already in inventory" check — same catalog medicine? */

export const norm = (v) => String(v ?? "").trim().toLowerCase();

export function sameMedicine(row, md) {
  if (!row || !md) return false;
  if (row.medicine_data_id != null && md.id != null)
    return String(row.medicine_data_id) === String(md.id);
  return (
    norm(row.medicine_name) === norm(md.medicine_name) &&
    norm(row.strength) === norm(md.strength) &&
    norm(row.dosage_form) === norm(md.dosage_form)
  );
}

export async function findInInventory(search) {
  const res = await axios.get(`${API}/api/pharmacy/medicines`, {
    params: {
      search, page: 1, limit: 100,
      sort_by: "created_at", sort_order: "DESC",
    },
    withCredentials: true,
  });
  return res.data.data || [];
}

export const isDuplicateError = (err) =>
  err?.response?.status === 409 ||
  /already/i.test(err?.response?.data?.message || "");

export const toneText = (theme, tone) =>
  theme.palette[tone][theme.palette.mode === "dark" ? "light" : "dark"];

export const errMsg = (err, fallback) =>
  err?.response?.data?.message || fallback;

/* "Cost ₹70.40 · 27%" */
export function priceCaption(m, long = false) {
  const p = Number(m.purchase_price);
  const s = Number(m.selling_price);
  if (!(p > 0)) return "";
  const margin = s > 0 ? Math.round(((s - p) / s) * 100) : null;
  return `Cost ${money(p)}${
    margin != null ? ` · ${margin}%${long ? " margin" : ""}` : ""
  }`;
}

/* ───────────────────────────── element width hook ─────────────────────────────
   Still useful for responsive breakpoints based on the page's REAL width (after
   whatever sidebar is open). Does NOT cap heights.
───────────────────────────────────────────────────────────────────────── */
export function useElementWidth(ref) {
  const [width, setWidth] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const set = (w) => {
      if (w > 0) setWidth((prev) => (prev === w ? prev : w));
    };
    set(Math.round(el.getBoundingClientRect().width));
    if (typeof ResizeObserver !== "function") return undefined;
    const ro = new ResizeObserver(([entry]) =>
      set(Math.round(entry.contentRect.width))
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* ───────────────────────────── small components ───────────────────────────── */

export function Pill({ tone, children, outlined, title }) {
  const theme = useTheme();
  const main = tone ? theme.palette[tone].main : theme.palette.text.secondary;
  const text = tone ? toneText(theme, tone) : theme.palette.text.secondary;
  const pill = (
    <Box
      component="span"
      sx={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        height: 24, px: "10px", borderRadius: "999px",
        fontSize: 12.5, fontWeight: 600, lineHeight: 1,
        whiteSpace: "nowrap", color: text,
        ...(outlined
          ? { border: `1px solid ${alpha(main, 0.45)}` }
          : {
              bgcolor: alpha(
                main,
                theme.palette.mode === "dark" ? 0.2 : 0.12
              ),
            }),
      }}
    >
      {children}
    </Box>
  );
  return title ? <Tooltip title={title}>{pill}</Tooltip> : pill;
}

export function PolicyPill({ raw }) {
  const p = parsePolicy(raw);
  if (p === undefined) return <Pill>—</Pill>;
  if (p === null)
    return (
      <Pill outlined title="Uses your default return policy">
        Default
      </Pill>
    );
  if (p.is_returnable === false) {
    return (
      <Pill tone="error" title={p.reason || "Non-returnable"}>
        No returns
      </Pill>
    );
  }
  const tip = [CONDITION_LABEL[p.condition] || p.condition, p.notes]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pill tone="success" outlined title={tip || undefined}>
      {p.window_days ?? 7}-day return
    </Pill>
  );
}

export function RxBadge() {
  return (
    <Tooltip title="Prescription required">
      <Box
        component="span"
        sx={(t) => ({
          display: "inline-block", px: "6px", lineHeight: "18px",
          borderRadius: "6px", fontSize: 11, fontWeight: 800,
          letterSpacing: ".02em", color: toneText(t, "warning"),
          bgcolor: alpha(
            t.palette.warning.main,
            t.palette.mode === "dark" ? 0.22 : 0.14
          ),
          verticalAlign: "middle",
        })}
      >
        Rx
      </Box>
    </Tooltip>
  );
}

export function EmptyState({ filtered, onClear, onAdd }) {
  const Icon = filtered ? SearchOffIcon : Inventory2OutlinedIcon;
  return (
    <Stack
      alignItems="center"
      spacing={1}
      sx={{ py: { xs: 6, md: 8 }, px: 3, textAlign: "center" }}
    >
      <Box
        sx={{
          width: 56, height: 56, borderRadius: "50%",
          display: "grid", placeItems: "center",
          bgcolor: "action.hover", color: "text.secondary", mb: 1,
        }}
      >
        <Icon />
      </Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {filtered ? "No medicines match" : "No medicines yet"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
        {filtered
          ? "Try another name, code or barcode, or clear the filters."
          : "Add medicines one by one, or import a CSV from your supplier."}
      </Typography>
      {filtered ? (
        <Button onClick={onClear} sx={{ mt: 1, ...btn }}>
          Clear filters
        </Button>
      ) : (
        onAdd && (
          <Button
            variant="contained" disableElevation
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{ mt: 1, ...btn }}
          >
            Add medicine
          </Button>
        )
      )}
    </Stack>
  );
}

export function SectionTitle({ children, hint }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={700}>
        {children}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Box>
  );
}
