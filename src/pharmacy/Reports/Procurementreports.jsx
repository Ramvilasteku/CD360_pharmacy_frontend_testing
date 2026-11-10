// src/pharmacy/reports/ProcurementReports.jsx      (route: pharmacy/procurement-reports — see Routes/pharmacyRoutes.jsx)
//
// Procurement reports.
//
//   Reports       one card per report this user may open (Purchases · Stock · Sales). Click a card →
//                 that report opens (the URL keeps ?report=… so a page refresh reopens it; ← goes back).
//   A report      header:  ← · report name · refresh · Download (opens the download dialog)
//                 filters: date range (+ custom dates) · branch (admin) · supplier (purchase side) ·
//                          status / payment / order type · search · ↺ reset (icon at the end)
//                 Every change refreshes the report on its own (search waits until you stop typing).
//                 Below: what's applied, the totals, two charts (amount over time + top 5), then every
//                 document page by page.
//   Download      a dialog: CSV or PDF; for a PDF the page (A4 landscape / portrait) and charts on/off;
//                 then what the file will be (name, documents, lines, filters). It is exactly the report on
//                 screen (its filters, the day it was worked out on). Waits while the report is still
//                 updating, so the file can't be a different one. Choices are remembered on this device.
//
// Staff never pick a branch: the server always uses their own, and it shows in the applied filters.
// Needs pharmacy.reports.view (+ pharmacy.reports.export to download). The server decides which report
// types a role sees and applies every rule itself; nothing here is trusted for that.
// Backend: routes/Pharmacy/pharmacyProcurementReports.js @ /api/pharmacy/procurement-reports

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Alert,
  Autocomplete,
  Badge,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import AutoModeOutlinedIcon from "@mui/icons-material/AutoModeOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import CropLandscapeOutlinedIcon from "@mui/icons-material/CropLandscapeOutlined";
import CropPortraitOutlinedIcon from "@mui/icons-material/CropPortraitOutlined";
import CurrencyRupeeOutlinedIcon from "@mui/icons-material/CurrencyRupeeOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import FormatListNumberedOutlinedIcon from "@mui/icons-material/FormatListNumberedOutlined";
import MedicationOutlinedIcon from "@mui/icons-material/MedicationOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import PointOfSaleOutlinedIcon from "@mui/icons-material/PointOfSaleOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";

import { ColorRoot } from "../../theme/appColors";
import useAccess, { AccessDenied } from "../../hooks/useAccess";
import AppPager from "../shared/AppPager";
import { ColHead, IconTile, Pill, fade, nums, thinScroll, tints, toneColor } from "../purchase/purchaseStyles";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const API_BASE = process.env.REACT_APP_SITE_URL || process.env.REACT_APP_URL || "";
const API = `${API_BASE}/api/pharmacy/procurement-reports`;
const http = axios.create({ withCredentials: true });

const PERM = { view: "pharmacy.reports.view", export: "pharmacy.reports.export" };
const SHELL_HEIGHT = "calc(86dvh - var(--procurement-reports-offset, 0px))";
const PAGE_SIZES = [5, 10, 25, 50]; // documents per page
const DEFAULT_PAGE_SIZE = 10;
const REMEMBER_KEY = "cd.pharmacy.reports.last"; // last date range, charts on/off, download format + PDF page — this device only
// what a portrait PDF leaves out (the server drops these columns to fit the narrower page)
const PORTRAIT_NOTES = { supplier_payments: "GSTIN and invoice columns are left out to fit the page." };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const buttonSx = { textTransform: "none", fontWeight: 600, borderRadius: 2 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const inr = (n, max = 2) => (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: max });
const fmtDay = (v) => (v ? `${String(v).slice(8, 10)} ${MONTHS[Number(String(v).slice(5, 7)) - 1]} ${String(v).slice(0, 4)}` : "—");
const fmtExp = (v) => (v ? `${String(v).slice(5, 7)}/${String(v).slice(2, 4)}` : "—");
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);

/** A value from the report, shown the way its column says (₹, dates, labels…). */
function show(col, v) {
  if (v === null || v === undefined || v === "") return "—";
  if (!col) return String(v);
  switch (col.type) {
    case "money":
      return `₹${inr(v)}`;
    case "rate":
      return `₹${inr(v, 4)}`;
    case "int":
      return Number(v).toLocaleString("en-IN");
    case "pct":
      return `${Number(v)}%`;
    case "date":
      return col.key === "expiry" ? fmtExp(v) : fmtDay(v);
    case "datetime":
      return `${fmtDay(v)}, ${String(v).slice(11, 16)}`;
    case "enum":
      return (col.labels && col.labels[v]) || String(v);
    default:
      return String(v);
  }
}

/** Status words → the colour they wear. */
const TONES = {
  received: "success",
  completed: "success",
  paid: "success",
  ordered: "info",
  in_transit: "info",
  refund: "info",
  partial: "warning",
  pending: "warning",
  unpaid: "warning",
  partially_returned: "warning",
  draft: "neutral",
  debit_note: "neutral",
  out_of_stock: "secondary",
  new_order: "neutral",
  returned: "error",
  rejected: "error",
  cancelled: "error",
};
const toneOf = (v) => TONES[v] || "neutral";
const DEAD = ["cancelled", "rejected"];

const apiMessage = async (err, fallback) => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || (err?.response ? fallback : "Can't reach the server. Check your connection and try again.");
};

const remember = {
  get: () => {
    try {
      return JSON.parse(window.localStorage.getItem(REMEMBER_KEY) || "null") || {};
    } catch {
      return {};
    }
  },
  set: (v) => {
    try {
      window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(v));
    } catch {
      /* private mode: just don't remember */
    }
  },
};

/** Bottom padding + border of the box that scrolls this page (the pharmacy shell's <main>, p: 12px / 16px).
    The page has to stop that much above the window's bottom, or <main> gets a vertical scrollbar. */
function bottomGap(el) {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = window.getComputedStyle(p);
    if (/(auto|scroll)/.test(cs.overflowY)) return (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
  }
  return 0;
}

/** Sizes the screen to the rest of the window, so only the rows scroll (never the page around it). */
function useFitsWindow(fallback) {
  const ref = useRef(null);
  const last = useRef("");
  const [height, setHeight] = useState(fallback);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      // ceil: a fractional top (zoom, odd DPI) rounded down would leave the page 1px too tall
      const top = Math.max(0, Math.ceil(el.getBoundingClientRect().top));
      const gap = Math.ceil(bottomGap(el)); // 16px on a laptop, 12px on a phone — re-read on every resize
      const key = `${top}|${gap}`;
      // only react to a real change; otherwise the height we just set could feed back and oscillate
      if (key === last.current) return;
      last.current = key;
      setHeight(`calc(100dvh - ${top + gap}px)`);
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

/** The draft filters → request params (only what the server reads). */
function toParams(f, meta, type) {
  if (!type) return null;
  const p = { type: type.key, range: f.range };
  if (f.range === "custom") {
    p.start = f.start;
    p.end = f.end;
  }
  if (meta?.branch?.multi && meta.branch.is_admin && f.branch) p.branch = f.branch;
  if (type.supplier && f.supplier) p.supplier_id = f.supplier.id;
  for (const fl of type.filters) if (f.extra[fl.key]) p[fl.key] = f.extra[fl.key];
  if (f.q) p.q = f.q;
  return p;
}

/** What is wrong with a custom range (the server checks the same), or "" when it's fine. */
function rangeProblem(f, meta) {
  if (f.range !== "custom") return "";
  if (!f.start || !f.end) return "Choose both dates.";
  if (f.start > f.end) return "The start date must be on or before the end date.";
  if (meta?.today && f.end > meta.today) return "The end date can't be in the future.";
  const max = meta?.max_range_days || 366;
  if (daysBetween(f.start, f.end) + 1 > max) return `A custom range can cover at most ${max} days.`;
  return "";
}

/* The filter-box look used on the purchase screens */
const filterSx = (color, active) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    bgcolor: active ? fade(color, 0.08) : "background.paper",
    transition: "background-color .15s",
    "& fieldset": { borderColor: active ? fade(color, 0.55) : undefined },
    "&:hover fieldset": { borderColor: active ? color : undefined },
  },
  "& .MuiInputLabel-root.MuiInputLabel-shrink": active ? { color, fontWeight: 700 } : { fontWeight: 600 },
});
const menuProps = { PaperProps: { sx: { mt: 0.75, borderRadius: 2.5, maxHeight: 420, "& .MuiList-root": { p: 0.75 }, "& .MuiMenuItem-root": { borderRadius: 1.5 } } } };


/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */
function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: { xs: 5, md: 8 }, px: 3, textAlign: "center", color: "text.secondary" }}>
      <Box sx={{ width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "action.hover" }}>
        <Icon />
      </Box>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "text.primary" }}>{title}</Typography>
      {children && <Typography sx={{ fontSize: 13, maxWidth: 440 }}>{children}</Typography>}
      {action}
    </Stack>
  );
}

/** "Label value · Label value" under a main value */
function SubLine({ cols, keys, values }) {
  const bits = (keys || [])
    .map((k) => {
      const c = cols.get(k);
      const v = values[k];
      if (!c || v === null || v === undefined || v === "" || (c.type === "int" && k === "free_qty" && !Number(v))) return null;
      return `${c.short} ${show(c, v)}`;
    })
    .filter(Boolean);
  if (!bits.length) return null;
  return (
    <Typography sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.35, overflowWrap: "anywhere" }}>{bits.join(" · ")}</Typography>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */
const TOTAL_ICONS = {
  documents: DescriptionOutlinedIcon,
  lines: FormatListNumberedOutlinedIcon,
};
const totalIcon = (t) => TOTAL_ICONS[t.key] || (t.type === "money" ? CurrencyRupeeOutlinedIcon : MedicationOutlinedIcon);
const totalTone = (t) => (t.key === "doc_due" ? "warning" : t.key === "doc_paid" ? "success" : t.type === "money" ? "secondary" : "primary");

/** 2,43,85,804.12 → "2.44Cr", 1,03,270 → "1.03L"; below 1,00,000 the number is shown in full */
const compactIn = (n) => {
  const a = Math.abs(Number(n) || 0);
  if (a >= 1e7) return `${(Number(n) / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${(Number(n) / 1e5).toFixed(2)}L`;
  return null;
};

function Totals({ data }) {
  const theme = useTheme();
  // one line on a laptop / desktop; big figures shortened (₹2.44Cr) with the full figure on hover
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", md: "repeat(auto-fill, minmax(120px, 1fr))", lg: "none" },
        gridAutoFlow: { lg: "column" },
        gridAutoColumns: { lg: "minmax(0, 1fr)" },
      }}
    >
      {data.totals.map((t) => {
        const tn = tints(theme, totalTone(t));
        const strong = t.key === "doc_grand" || t.key === "amount" || t.key === "value";
        const Icon = totalIcon(t);
        const money = t.type === "money";
        const full = money ? `₹${inr(t.value)}` : Number(t.value).toLocaleString("en-IN");
        const short = compactIn(t.value);
        const shown = short ? `${money ? "₹" : ""}${short}` : full;
        return (
          <Tooltip key={t.key} title={short ? `${t.label}: ${full}` : ""} arrow placement="top">
            <Box sx={{ minWidth: 0, px: 1.25, py: 0.9, borderRadius: 2.5, border: 1, borderColor: tn.line, bgcolor: strong ? tn.soft : "background.paper", cursor: short ? "help" : "default" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: tn.dark }}>
                <Icon sx={{ fontSize: 14, opacity: 0.85, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", color: "text.secondary" }} noWrap>
                  {t.label.toUpperCase()}
                </Typography>
              </Box>
              <Typography aria-label={`${t.label}: ${full}`} sx={{ fontSize: { xs: 14.5, md: 15.5 }, fontWeight: 800, ...nums, color: strong ? tn.dark : "text.primary", lineHeight: 1.3 }} noWrap>
                {shown}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

/** One document: its header (number, date, branch, party, status, figures) and its lines. */
function DocumentCard({ d, data, cols }) {
  const theme = useTheme();
  const act = tints(theme, "primary");
  const v = d.values;
  const view = data.view;
  const dead = DEAD.includes(v.status); // struck through
  const muted = dead || d.counted === false; // greyed figures: not in the totals
  const stripe = toneColor(theme, toneOf(v.status));
  const amounts = (view.amounts || []).map((k) => cols.get(k)).filter((c) => c && v[c.key] !== null && v[c.key] !== undefined);
  const lineDefs = (view.lines || []).map((l) => ({ ...l, col: cols.get(l.key) })).filter((l) => l.col);
  const grid = `minmax(0, 2.6fr) ${lineDefs
    .slice(1)
    .map(() => "minmax(0, 1fr)")
    .join(" ")}`;

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2.5,
        bgcolor: "background.paper",
        overflow: "hidden",
        boxShadow: `inset 3px 0 0 ${stripe}`,
        transition: "border-color .15s, box-shadow .15s",
        "&:hover": { borderColor: act.line, boxShadow: `inset 3px 0 0 ${stripe}, 0 2px 10px ${act.ring}` },
      }}
    >
      {/* header */}
      <Box sx={{ display: "flex", gap: 1.5, px: { xs: 1.5, md: 2 }, py: 1.25, alignItems: "flex-start", flexWrap: { xs: "wrap", sm: "nowrap" } }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, ...nums, textDecoration: dead ? "line-through" : "none" }}>{v.doc_no}</Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary", ...nums }}>{show(cols.get("doc_date"), v.doc_date)}</Typography>
            {(view.chips || []).map((k) =>
              v[k] ? (
                <Pill key={k} tone={toneOf(v[k])}>
                  {show(cols.get(k), v[k])}
                </Pill>
              ) : null
            )}
            {d.counted === false && (
              <Tooltip title="Listed, but its quantities and amounts are left out of the totals above" arrow>
                <span>
                  <Pill tone="neutral" soft={false}>
                    Not in totals
                  </Pill>
                </span>
              </Tooltip>
            )}
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.35, overflowWrap: "anywhere" }}>
            {view.party === "route" ? v.route : v[view.party] || "—"}
            {view.party !== "route" && v.branch ? (
              <Box component="span" sx={{ fontWeight: 500, color: "text.secondary" }}>
                {"  ·  "}
                {v.branch}
              </Box>
            ) : null}
          </Typography>
          <SubLine cols={cols} keys={[...(view.partySub || []), ...(view.meta || [])]} values={v} />
        </Box>
        {!!amounts.length && (
          <Box sx={{ textAlign: { xs: "left", sm: "right" }, flexShrink: 0, width: { xs: "100%", sm: "auto" } }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.secondary", letterSpacing: "0.04em" }}>{amounts[0].short.toUpperCase()}</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 800, ...nums, color: muted ? "text.disabled" : "text.primary", lineHeight: 1.2 }}>
              {show(amounts[0], v[amounts[0].key])}
            </Typography>
            {amounts.length > 1 && (
              <Typography sx={{ fontSize: 11.5, color: "text.secondary", ...nums }}>
                {amounts
                  .slice(1)
                  .map((c) => `${c.short} ${show(c, v[c.key])}`)
                  .join(" · ")}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* lines */}
      {d.lines.length ? (
        <Box sx={{ borderTop: 1, borderColor: "divider", px: { xs: 1.5, md: 2 }, pb: 0.75 }}>
          <Box sx={{ display: { xs: "none", md: "grid" }, gridTemplateColumns: grid, columnGap: 1.5, py: 0.75 }}>
            {lineDefs.map((l, i) => (
              <Tooltip key={l.key} title={l.col.tip || l.col.label} placement="top" arrow>
                <Box sx={{ minWidth: 0 }}>
                  <ColHead icon={i === 0 ? MedicationOutlinedIcon : l.col.type === "money" || l.col.type === "rate" ? CurrencyRupeeOutlinedIcon : FormatListNumberedOutlinedIcon} right={i > 0}>
                    {l.col.short}
                  </ColHead>
                </Box>
              </Tooltip>
            ))}
          </Box>
          {d.lines.map((line) => (
            <Box
              key={line.line_id}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr) auto", md: grid },
                columnGap: 1.5,
                rowGap: 0.25,
                py: 0.75,
                borderTop: 1,
                borderColor: fade(theme.palette.divider, 0.9),
                alignItems: "start",
              }}
            >
              {/* medicine */}
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>{show(lineDefs[0].col, line[lineDefs[0].key])}</Typography>
                <SubLine cols={cols} keys={lineDefs[0].sub} values={line} />
              </Box>
              {/* phone: the amount on the right, the rest underneath */}
              <Typography sx={{ display: { xs: "block", md: "none" }, fontSize: 13, fontWeight: 700, textAlign: "right", ...nums }}>
                {show(lineDefs[lineDefs.length - 1].col, line[lineDefs[lineDefs.length - 1].key])}
              </Typography>
              <Typography sx={{ display: { xs: "block", md: "none" }, gridColumn: "1 / -1", fontSize: 11.5, color: "text.secondary", ...nums }}>
                {lineDefs
                  .slice(1, -1)
                  .flatMap((l) => [`${l.col.short} ${show(l.col, line[l.key])}`, ...(l.sub || []).filter((k) => line[k] !== null && line[k] !== undefined && !(k === "free_qty" && !Number(line[k]))).map((k) => `${cols.get(k)?.short} ${show(cols.get(k), line[k])}`)])
                  .join(" · ")}
              </Typography>
              {/* desktop: one column each */}
              {lineDefs.slice(1).map((l, i) => (
                <Box key={l.key} sx={{ display: { xs: "none", md: "block" }, textAlign: "right", minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: i === lineDefs.length - 2 ? 700 : 500, ...nums }}>{show(l.col, line[l.key])}</Typography>
                  <SubLine cols={cols} keys={l.sub} values={line} />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      ) : (
        !data.report.single_row && (
          <Typography sx={{ borderTop: 1, borderColor: "divider", px: 2, py: 1, fontSize: 12.5, color: "text.secondary" }}>No lines on this document yet.</Typography>
        )
      )}
    </Box>
  );
}

/** Reports with one row per record (Supplier Payments): a compact table, cards on a phone. */
function RowTable({ data, cols }) {
  const theme = useTheme();
  const act = tints(theme, "primary");
  const keys = data.view.table || [];
  const defs = keys.map((k) => cols.get(k)).filter(Boolean);
  const grid = defs.map((c) => (c.key === "supplier" ? "minmax(0, 1.8fr)" : c.type === "money" ? "minmax(0, 1fr)" : "minmax(0, 1.1fr)")).join(" ");
  const last = defs[defs.length - 1];
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2.5, bgcolor: "background.paper", overflow: "hidden" }}>
      <Box sx={{ display: { xs: "none", md: "grid" }, gridTemplateColumns: grid, columnGap: 1.5, px: 2, py: 1, bgcolor: act.soft, borderBottom: 1, borderColor: act.line }}>
        {defs.map((c) => (
          <Tooltip key={c.key} title={c.tip || c.label} placement="top" arrow>
            <Box sx={{ minWidth: 0 }}>
              <ColHead icon={c.type === "money" ? CurrencyRupeeOutlinedIcon : c.type === "datetime" ? CalendarMonthOutlinedIcon : FactCheckOutlinedIcon} right={c.type === "money"}>
                {c.short}
              </ColHead>
            </Box>
          </Tooltip>
        ))}
      </Box>
      {data.documents.map((d, i) => (
        <Box
          key={d.doc_id}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr) auto", md: grid },
            columnGap: 1.5,
            px: { xs: 1.5, md: 2 },
            py: 1,
            borderTop: i ? 1 : 0,
            borderColor: "divider",
            alignItems: "center",
            "&:hover": { bgcolor: act.wash },
          }}
        >
          {/* phone */}
          <Box sx={{ display: { xs: "block", md: "none" }, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, ...nums }}>{d.values.doc_no}</Typography>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary", overflowWrap: "anywhere" }}>
              {defs
                .filter((c) => c !== last && c.key !== "doc_no")
                .map((c) => show(c, d.values[c.key]))
                .filter((s) => s !== "—")
                .join(" · ")}
            </Typography>
          </Box>
          <Typography sx={{ display: { xs: "block", md: "none" }, fontSize: 13.5, fontWeight: 700, textAlign: "right", ...nums }}>{show(last, d.values[last.key])}</Typography>
          {/* desktop */}
          {defs.map((c) => (
            <Typography
              key={c.key}
              sx={{
                display: { xs: "none", md: "block" },
                fontSize: 13,
                fontWeight: c.key === "doc_no" || c.type === "money" ? 700 : 500,
                textAlign: c.type === "money" ? "right" : "left",
                ...nums,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={show(c, d.values[c.key])}
            >
              {show(c, d.values[c.key])}
            </Typography>
          ))}
        </Box>
      ))}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Report cards                                                        */
/* ------------------------------------------------------------------ */
const REPORT_ICONS = {
  purchase_orders: ReceiptLongOutlinedIcon,
  generated_orders: AutoModeOutlinedIcon,
  supplier_payments: PaymentsOutlinedIcon,
  purchase_returns: AssignmentReturnOutlinedIcon,
  purchase_transfers: SwapHorizOutlinedIcon,
  b2b_orders: BusinessOutlinedIcon,
  sales_orders: PointOfSaleOutlinedIcon,
};
const REPORT_TONES = {
  purchase_orders: "primary",
  generated_orders: "primary",
  supplier_payments: "success",
  purchase_returns: "warning",
  purchase_transfers: "info",
  b2b_orders: "secondary",
  sales_orders: "secondary",
};
const GROUP_ORDER = ["Purchases", "Stock", "Sales"];
const reportIcon = (key) => REPORT_ICONS[key] || AssessmentOutlinedIcon;

function ReportCards({ meta, onOpen }) {
  const theme = useTheme();
  // every report as one card, in one grid (purchase side first, then transfers, then sales)
  const list = useMemo(
    () => [...meta.types].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)),
    [meta.types]
  );
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(auto-fill, minmax(260px, 1fr))" } }}>
      {list.map((t) => {
        const tone = REPORT_TONES[t.key] || "primary";
        const tn = tints(theme, tone);
        const filters = ["Dates", ...(meta.branch.multi && meta.branch.is_admin ? ["Branch"] : []), ...(t.supplier ? ["Supplier"] : []), ...t.filters.map((f) => f.label), "Search"];
        return (
          <Box
            key={t.key}
            component="button"
            type="button"
            onClick={() => onOpen(t.key)}
            aria-label={`Open ${t.label}`}
            sx={{
              font: "inherit",
              color: "inherit",
              textAlign: "left",
              cursor: "pointer",
              width: "100%",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              p: 1.75,
              minHeight: 150,
              border: 1,
              borderColor: "divider",
              borderRadius: 3,
              bgcolor: "background.paper",
              transition: "border-color .15s, box-shadow .15s, transform .15s",
              "&:hover": { borderColor: tn.line, boxShadow: `0 6px 18px ${fade(tn.main, 0.14)}`, transform: "translateY(-1px)" },
              "&:hover .open-arrow": { transform: "translateX(2px)", color: tn.main },
              "&:focus-visible": { outline: "2px solid", outlineColor: tn.main, outlineOffset: 2 },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: "100%" }}>
              <IconTile icon={reportIcon(t.key)} tone={tone} size={40} radius={2.5} />
              <Typography sx={{ fontSize: 15.5, fontWeight: 800, flex: 1, minWidth: 0 }}>{t.label}</Typography>
              <ChevronRightIcon className="open-arrow" sx={{ color: "text.disabled", transition: "transform .15s, color .15s" }} />
            </Box>
            <Typography sx={{ fontSize: 13, color: "text.secondary", lineHeight: 1.45, flex: 1 }}>{t.description}</Typography>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap title={filters.join(" · ")}>
              <Box component="span" sx={{ fontWeight: 700, color: tn.dark }}>
                Filters:
              </Box>{" "}
              {filters.join(" · ")}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */
function Filters({ meta, type, draft, setDraft, suppliers, problem, onReset, canReset, phone, activeCount }) {
  const theme = useTheme();
  const primary = tints(theme, "primary").main;
  const [open, setOpen] = useState(false); // phone: the filters under the search box
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setExtra = (k, v) => setDraft((d) => ({ ...d, extra: { ...d.extra, [k]: v } }));
  const b = meta.branch;
  const field = { size: "small", InputLabelProps: { shrink: true } };
  const wide = { xs: "100%", sm: "auto" };

  const search = (
    <TextField
      size="small"
      placeholder={type.search_hint}
      value={draft.q}
      onChange={(e) => set({ q: e.target.value })}
      inputProps={{ "aria-label": "Search", maxLength: 100 }}
      sx={{ flex: 1, minWidth: { xs: 0, sm: 150 }, ...filterSx(primary, !!draft.q) }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" sx={{ color: draft.q ? primary : "text.secondary" }} />
          </InputAdornment>
        ),
        endAdornment: draft.q ? (
          <InputAdornment position="end">
            <IconButton size="small" aria-label="Clear search" onClick={() => set({ q: "" })}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
    />
  );
  const reset = (
    <Tooltip title="Reset filters" arrow>
      <span>
        <IconButton
          aria-label="Reset filters"
          onClick={onReset}
          disabled={!canReset}
          sx={{ border: 1, borderColor: canReset ? fade(primary, 0.4) : "divider", borderRadius: 2.5, width: 40, height: 40, color: canReset ? primary : "text.disabled" }}
        >
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );

  const fields = (
    <>
      <TextField
        {...field}
        select
        label={type.date_label}
        value={draft.range}
        onChange={(e) => set({ range: e.target.value })}
        sx={{ width: { xs: "100%", sm: 160 }, minWidth: { lg: 132 }, flexShrink: { xs: 0, lg: 1 }, ...filterSx(primary, draft.range !== "last_7_days") }}
        SelectProps={{
          MenuProps: menuProps,
          renderValue: (v) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarMonthOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              {meta.ranges.find((r) => r.key === v)?.label}
            </Box>
          ),
        }}
      >
        {meta.ranges.map((r) => (
          <MenuItem key={r.key} value={r.key}>
            {r.label}
          </MenuItem>
        ))}
      </TextField>
      {draft.range === "custom" && (
        <Box sx={{ display: "flex", gap: 1.25, width: wide }}>
          <TextField
            {...field}
            type="date"
            label="Start date"
            value={draft.start}
            onChange={(e) => set({ start: e.target.value })}
            inputProps={{ max: draft.end || meta.today }}
            error={!!problem && (!draft.start || draft.start > draft.end)}
            sx={{ flex: 1, width: { sm: 150 }, ...filterSx(primary, true) }}
          />
          <TextField
            {...field}
            type="date"
            label="End date"
            value={draft.end}
            onChange={(e) => set({ end: e.target.value })}
            inputProps={{ min: draft.start || undefined, max: meta.today }}
            error={!!problem && (!draft.end || draft.end > meta.today)}
            sx={{ flex: 1, width: { sm: 150 }, ...filterSx(primary, true) }}
          />
        </Box>
      )}

      {/* admins choose a branch; staff don't see this — the server uses their own branch */}
      {b.multi && b.is_admin && (
        <TextField
          {...field}
          select
          label="Branch"
          value={draft.branch || "__all"}
          onChange={(e) => set({ branch: e.target.value === "__all" ? "" : e.target.value })}
          sx={{ width: { xs: "100%", sm: 160 }, minWidth: { lg: 132 }, flexShrink: { xs: 0, lg: 1 }, ...filterSx(primary, !!draft.branch) }}
          SelectProps={{
            MenuProps: menuProps,
            renderValue: (v) => (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <StoreOutlinedIcon sx={{ fontSize: 18, color: draft.branch ? primary : "text.secondary", flexShrink: 0 }} />
                <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {v === "__all" ? "All branches" : v}
                </Box>
              </Box>
            ),
          }}
        >
          <MenuItem value="__all">All branches</MenuItem>
          {b.branches.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {type.supplier && (
        <Autocomplete
          size="small"
          options={suppliers || []}
          loading={!suppliers}
          value={draft.supplier}
          onChange={(_, v) => set({ supplier: v })}
          getOptionLabel={(o) => o.name || ""}
          isOptionEqualToValue={(a, c) => a.id === c.id}
          noOptionsText="No supplier matches"
          openOnFocus
          autoHighlight
          sx={{ width: { xs: "100%", sm: 210 }, minWidth: { lg: 160 }, flexShrink: { xs: 0, lg: 1 } }}
          slotProps={{ paper: { sx: { mt: 0.75, borderRadius: 2.5, "& .MuiAutocomplete-listbox": { maxHeight: 300, p: 0.75 }, "& .MuiAutocomplete-option": { borderRadius: 1.5 } } } }}
          renderOption={(props, o) => (
            <li {...props} key={o.id}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>
                  {o.name}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                  {[o.gstin, o.city, o.active ? null : "inactive"].filter(Boolean).join(" · ") || " "}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(p) => (
            <TextField
              {...p}
              label="Supplier"
              placeholder={draft.supplier ? "" : "All suppliers"}
              InputLabelProps={{ ...p.InputLabelProps, shrink: true }}
              sx={{ ...filterSx(primary, !!draft.supplier), "& .MuiInputBase-input::placeholder": { color: "text.primary", opacity: 0.85 } }}
              InputProps={{
                ...p.InputProps,
                startAdornment: (
                  <>
                    <InputAdornment position="start" sx={{ ml: 0.5, mr: 0 }}>
                      <StorefrontOutlinedIcon sx={{ fontSize: 18, color: draft.supplier ? primary : "text.secondary" }} />
                    </InputAdornment>
                    {p.InputProps.startAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      )}

      {type.filters.map((fl) => {
        const v = draft.extra[fl.key] || "";
        return (
          <TextField
            key={fl.key}
            {...field}
            select
            label={fl.label}
            value={v || "__all"}
            onChange={(e) => setExtra(fl.key, e.target.value === "__all" ? "" : e.target.value)}
            sx={{ width: { xs: "100%", sm: 132 }, minWidth: { lg: 104 }, flexShrink: { xs: 0, lg: 1 }, ...filterSx(primary, !!v) }}
            SelectProps={{ MenuProps: menuProps }}
          >
            <MenuItem value="__all">All</MenuItem>
            {fl.options.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        );
      })}
    </>
  );

  const problemText = problem && (
    <Typography role="alert" sx={{ fontSize: 12.5, color: "error.main", fontWeight: 600, width: "100%" }}>
      {problem}
    </Typography>
  );

  if (phone) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {search}
          <Tooltip title={open ? "Hide filters" : "Show filters"} arrow>
            <IconButton aria-label="Filters" aria-expanded={open} onClick={() => setOpen((o) => !o)} sx={{ border: 1, borderColor: activeCount ? fade(primary, 0.4) : "divider", borderRadius: 2.5, width: 40, height: 40, color: activeCount ? primary : "text.secondary" }}>
              <Badge color="primary" badgeContent={activeCount} invisible={!activeCount}>
                <FilterListIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          {reset}
        </Box>
        <Collapse in={open || !!problem}>
          <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", pt: 0.25 }}>{fields}</Box>
        </Collapse>
        {problemText}
      </Box>
    );
  }
  // one line on a laptop / desktop; a custom range adds two date fields, so then the row may extend
  const custom = draft.range === "custom";
  return (
    <Box sx={{ display: "flex", gap: 1.25, flexWrap: { xs: "wrap", lg: custom || problem ? "wrap" : "nowrap" }, alignItems: "center" }}>
      {fields}
      {/* search and reset wrap together, so the reset icon never sits on a line of its own */}
      <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flex: "1 1 220px", minWidth: { xs: "100%", sm: 200 } }}>
        {search}
        {reset}
      </Box>
      {problemText}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */
/** ₹1.2K, ₹3.4L, ₹1.1Cr — for axes and bar labels */
const shortInr = (v) => {
  const n = Number(v) || 0;
  const a = Math.abs(n);
  const one = (x) => (Math.round(x * 10) / 10).toString();
  if (a >= 1e7) return `₹${one(n / 1e7)}Cr`;
  if (a >= 1e5) return `₹${one(n / 1e5)}L`;
  if (a >= 1e3) return `₹${one(n / 1e3)}K`;
  return `₹${Math.round(n)}`;
};
const BUCKET_WORD = { day: "day", week: "week", month: "month" };

function ChartCard({ title, hint, children, sx }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2.5, bgcolor: "background.paper", p: 1.5, minWidth: 0, ...sx }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{title}</Typography>
        {hint && <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{hint}</Typography>}
      </Box>
      {children}
    </Box>
  );
}

function Charts({ chart, current }) {
  const theme = useTheme();
  const main = theme.palette.primary.main;
  const ink = theme.palette.text.secondary;
  const grid = theme.palette.divider;
  // charts drawn for another report than the one on screen are never shown — wait for the right ones
  const mine = chart.key === current;
  if (!mine || (chart.loading && !chart.data)) {
    return (
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.6fr) minmax(0, 1fr)" } }}>
        <Skeleton variant="rounded" height={226} sx={{ borderRadius: 2.5 }} />
        <Skeleton variant="rounded" height={226} sx={{ borderRadius: 2.5 }} />
      </Box>
    );
  }
  if (chart.error && !chart.loading) {
    return (
      <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
        {chart.error}
      </Alert>
    );
  }
  const c = chart.data;
  if (!c) return null;
  const total = c.trend.reduce((a, t) => a + t.value, 0);
  const tick = { fontSize: 11, fill: ink };
  return (
    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.6fr) minmax(0, 1fr)" }, opacity: chart.loading ? 0.6 : 1, transition: "opacity .15s" }}>
      <ChartCard title={`${c.metric} by ${BUCKET_WORD[c.bucket]}`} hint={total ? `₹${inr(total)} in all` : null}>
        {!total ? (
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", py: 6, textAlign: "center" }}>Nothing counted for these filters.</Typography>
        ) : (
        <Box sx={{ height: 180 }} role="img" aria-label={`${c.metric} by ${BUCKET_WORD[c.bucket]}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={c.trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={grid} />
              <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: grid }} interval="preserveStartEnd" minTickGap={14} />
              <YAxis tick={tick} tickLine={false} axisLine={false} width={56} tickFormatter={shortInr} allowDecimals={false} />
              <ChartTooltip
                cursor={{ fill: fade(main, 0.08) }}
                formatter={(v) => [`₹${inr(v)}`, c.metric]}
                labelFormatter={(l) => (c.bucket === "week" ? `Week of ${l}` : l)}
                contentStyle={{ borderRadius: 10, fontSize: 12, border: `1px solid ${grid}` }}
              />
              <Bar dataKey="value" fill={main} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
        )}
      </ChartCard>
      <ChartCard title={c.top.title} hint="top 5">
        {c.top.items.length ? (
          <Box sx={{ height: 180 }} role="img" aria-label={c.top.title}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.top.items} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={150}
                  tick={tick}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(s) => (String(s).length > 22 ? `${String(s).slice(0, 21)}…` : s)}
                />
                <ChartTooltip cursor={{ fill: fade(main, 0.08) }} formatter={(v) => [`₹${inr(v)}`, c.metric]} contentStyle={{ borderRadius: 10, fontSize: 12, border: `1px solid ${grid}` }} />
                <Bar dataKey="value" fill={main} radius={[0, 4, 4, 0]} barSize={16}>
                  <LabelList dataKey="value" position="right" formatter={shortInr} style={{ fontSize: 11, fontWeight: 700, fill: theme.palette.text.primary }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", py: 6, textAlign: "center" }}>Nothing counted for these filters.</Typography>
        )}
      </ChartCard>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* One report                                                          */
/* ------------------------------------------------------------------ */
function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const blankDraft = (meta, range = "last_7_days") => ({
  range,
  start: `${meta.today.slice(0, 8)}01`,
  end: meta.today,
  branch: "",
  supplier: null,
  q: "",
  extra: {},
});

/** "Purchase Orders Report 2026-09-24 to 2026-10-23.pdf" — the server sends this; built here too in case a proxy hides it */
function downloadName(headers, type, data, format) {
  const cd = (headers && (headers["content-disposition"] || headers["Content-Disposition"])) || "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  if (plain) return plain[1];
  return fileNameFor(type, data, format);
}

/** The file's name — the server works it out with the report (branch, supplier…), so the dialog can show it */
const fileNameFor = (type, data, format) => `${data.file_name || `${type.label} Report ${data.range.start} to ${data.range.end}`}.${format}`;

/* ------------------------------------------------------------------ */
/* Download dialog                                                     */
/* ------------------------------------------------------------------ */
/** One big option (CSV / PDF, landscape / portrait): a radio that reads as a card. */
function Choice({ checked, disabled, onSelect, icon: Icon, title, text, note, tone = "primary" }) {
  const theme = useTheme();
  const act = tints(theme, "primary");
  const tn = tints(theme, tone);
  return (
    <ButtonBase
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      focusRipple
      sx={{
        width: "100%",
        minWidth: 0,
        textAlign: "left",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        gap: 1.25,
        p: 1.25,
        borderRadius: 2.5,
        border: "1.5px solid",
        borderColor: checked ? act.main : "divider",
        bgcolor: checked ? act.soft : "background.paper",
        transition: "border-color .15s, background-color .15s",
        "&:hover": { borderColor: checked ? act.main : act.line },
        "&.Mui-disabled": { opacity: 0.62, bgcolor: "action.hover" },
        "&.Mui-focusVisible": { outline: `2px solid ${fade(act.main, 0.45)}`, outlineOffset: 2 },
      }}
    >
      <IconTile icon={Icon} tone={tone} size={34} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3, color: checked ? act.dark : "text.primary" }}>{title}</Typography>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.4, mt: 0.25 }}>{text}</Typography>
        {note && <Typography sx={{ fontSize: 12, color: disabled ? "error.main" : tn.dark, lineHeight: 1.4, mt: 0.5, fontWeight: 600 }}>{note}</Typography>}
      </Box>
      {checked ? (
        <CheckCircleRoundedIcon sx={{ fontSize: 20, color: act.main, flexShrink: 0 }} />
      ) : (
        <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: "text.disabled", flexShrink: 0 }} />
      )}
    </ButtonBase>
  );
}

const SectionLabel = ({ children, id }) => (
  <Typography id={id} sx={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "text.secondary", mb: 0.75 }}>
    {children}
  </Typography>
);

function DownloadDialog({ open, onClose, type, data, maxPdfLines, chartsOnScreen, busy, blocked, onDownload }) {
  const theme = useTheme();
  const act = tints(theme, "primary");
  const small = useMediaQuery(theme.breakpoints.down("sm"));
  const [format, setFormat] = useState(() => (remember.get().format === "pdf" ? "pdf" : "csv"));
  const [orientation, setOrientation] = useState(() => (remember.get().orientation === "portrait" ? "portrait" : "landscape"));
  const [charts, setCharts] = useState(chartsOnScreen);
  // each time it opens, charts start the way the screen has them (hidden on screen → off here too)
  useEffect(() => {
    if (open) setCharts(chartsOnScreen);
  }, [open, chartsOnScreen]);

  const keep = (patch) => remember.set({ ...remember.get(), ...patch });
  const pickFormat = (v) => {
    setFormat(v);
    keep({ format: v });
  };
  const pickOrientation = (v) => {
    setOrientation(v);
    keep({ orientation: v });
  };

  if (!data) return null;
  const lines = data.counts.lines;
  const tooBig = lines > maxPdfLines;
  const fmt = format === "pdf" && tooBig ? "csv" : format; // a PDF that can't be made falls back to CSV
  const pdf = fmt === "pdf";
  const docTotal = data.totals.find((t) => t.key === "documents");
  const docWord = docTotal?.label || "Documents";
  const fileName = fileNameFor(type, data, fmt);
  const applied = (data.applied || []).filter((a) => a.key !== "type");
  const n = (v) => Number(v).toLocaleString("en-IN");
  const what = [`${n(data.counts.documents)} ${docWord.toLowerCase()}`, `${n(lines)} line${lines === 1 ? "" : "s"}`];
  if (pdf) what.push(`A4 ${orientation}`, charts ? "with charts" : "no charts");
  else what.push("every column, one row per line");

  const go = () => !busy && !blocked && onDownload(fmt, pdf ? { charts: charts ? 1 : 0, orientation } : {});

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullScreen={small}
      fullWidth
      maxWidth="sm"
      aria-labelledby="dl-title"
      PaperProps={{ sx: { borderRadius: small ? 0 : 3.5, overflow: "hidden" } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <IconTile icon={DownloadOutlinedIcon} tone="primary" size={36} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography id="dl-title" component="h2" sx={{ fontSize: 17, fontWeight: 700, m: 0, lineHeight: 1.3 }}>
            Download report
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
            {type.label} · {fmtDay(data.range.start)} – {fmtDay(data.range.end)}
          </Typography>
        </Box>
        <IconButton aria-label="Close" onClick={onClose} disabled={busy} sx={{ mr: -0.75 }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: 2, display: "flex", flexDirection: "column", gap: 2, ...thinScroll }}>
        <Box>
          <SectionLabel id="dl-format">FORMAT</SectionLabel>
          <Box role="radiogroup" aria-labelledby="dl-format" sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
            <Choice checked={fmt === "csv"} onSelect={() => pickFormat("csv")} icon={TableChartOutlinedIcon} tone="success" title="CSV" text="Opens in Excel. Every line and every column, ready to sort and filter." />
            <Choice
              checked={pdf}
              disabled={tooBig}
              onSelect={() => pickFormat("pdf")}
              icon={PictureAsPdfOutlinedIcon}
              tone="error"
              title="PDF"
              text="Ready to print or share, laid out like the screen."
              note={tooBig ? `Too many lines for a PDF (${n(lines)} — up to ${n(maxPdfLines)}). Pick a shorter range or use CSV.` : null}
            />
          </Box>
        </Box>

        <Collapse in={pdf} unmountOnExit>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <SectionLabel id="dl-page">PAGE</SectionLabel>
              <Box role="radiogroup" aria-labelledby="dl-page" sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}>
                <Choice checked={orientation === "landscape"} onSelect={() => pickOrientation("landscape")} icon={CropLandscapeOutlinedIcon} title="Landscape" text="A4 wide. Best for full tables." />
                <Choice
                  checked={orientation === "portrait"}
                  onSelect={() => pickOrientation("portrait")}
                  icon={CropPortraitOutlinedIcon}
                  title="Portrait"
                  text="A4 tall. Easy to file and read on a phone."
                  note={orientation === "portrait" ? PORTRAIT_NOTES[type.key] : null}
                />
              </Box>
            </Box>
            <FormControlLabel
              sx={{ m: 0, alignItems: "flex-start", gap: 0.5 }}
              control={<Checkbox checked={charts} onChange={(e) => setCharts(e.target.checked)} sx={{ p: 0.5, mt: -0.25 }} />}
              label={
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Include charts</Typography>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>Amount over time and the top 5, on the first page.</Typography>
                </Box>
              }
            />
          </Box>
        </Collapse>

        <Box sx={{ borderRadius: 2.5, border: 1, borderColor: act.line, bgcolor: fade(act.main, 0.035), p: 1.5 }}>
          <SectionLabel>WHAT YOU'LL GET</SectionLabel>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            {pdf ? <PictureAsPdfOutlinedIcon sx={{ fontSize: 19, color: "error.main", mt: 0.1 }} /> : <TableChartOutlinedIcon sx={{ fontSize: 19, color: "success.main", mt: 0.1 }} />}
            <Typography data-testid="dl-file-name" sx={{ fontSize: 13.5, fontWeight: 700, overflowWrap: "anywhere", lineHeight: 1.4 }}>
              {fileName}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5, ...nums }}>{what.join(" · ")}</Typography>
          {applied.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
              {applied.map((a) => (
                <Box key={a.key} component="span" sx={{ px: 0.9, py: 0.2, borderRadius: 10, fontSize: 11.5, fontWeight: 600, bgcolor: "background.paper", color: "text.secondary", border: 1, borderColor: "divider", maxWidth: "100%", overflowWrap: "anywhere" }}>
                  {`${a.label}: ${a.value}`}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderTop: 1, borderColor: "divider", gap: 1 }}>
        <Button onClick={onClose} disabled={busy} sx={{ ...buttonSx, color: "text.secondary" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={go}
          disabled={busy || blocked}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <DownloadOutlinedIcon />}
          sx={{ ...buttonSx, height: 40, px: 2.5, fontSize: 14.5, flex: { xs: 1, sm: "none" } }}
        >
          {busy ? "Preparing…" : `Download ${fmt.toUpperCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReportView({ meta, type, suppliers, canExport, onBack, isPhone, toast }) {
  const theme = useTheme();
  const act = tints(theme, "primary");
  const primary = act.main;
  const tone = REPORT_TONES[type.key] || "primary";

  const [draft, setDraft] = useState(() => blankDraft(meta, remember.get().range || "last_7_days"));
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // data = the report on screen; shown = the exact params it came from (incl. as_of). Download and paging
  // use `shown`; it only changes when a request SUCCEEDS.
  const [state, setState] = useState({ loading: true, data: null, shown: null, error: "" });
  // charts always belong to ONE loaded report: key = the exact params (incl. as_of) they were drawn for
  const [chart, setChart] = useState({ loading: false, data: null, key: null, error: "" });
  // the download dialog holds the format / PDF page / charts choices
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showCharts, setShowCharts] = useState(() => remember.get().charts !== false);
  const rowsRef = useRef(null);
  const reqId = useRef(0);
  const chartId = useRef(0);
  const chartKey = useRef(null); // key of the charts on screen or on their way
  const chartsOn = useRef(showCharts);

  const q = useDebounced(draft.q.trim(), 450);
  const problem = rangeProblem(draft, meta);
  const params = useMemo(() => (problem ? null : toParams({ ...draft, q }, meta, type)), [draft, q, problem, meta, type]);
  const paramsKey = JSON.stringify(params);
  const typing = draft.q.trim() !== q;

  /** Charts for exactly this loaded report (its params incl. as_of). */
  const loadChart = useCallback((shown) => {
    const id = ++chartId.current;
    const key = JSON.stringify(shown);
    chartKey.current = key;
    setChart((c) => ({ ...c, loading: true, key, error: "" }));
    http
      .get(`${API}/get/chart`, { params: shown })
      .then((r) => id === chartId.current && setChart({ loading: false, data: r.data.data, key, error: "" }))
      .catch(async (e) => {
        const msg = await apiMessage(e, "Couldn't draw the charts.");
        if (id === chartId.current) setChart((c) => ({ ...c, loading: false, key, error: msg }));
      });
  }, []);

  /** One page of the report; on success the charts follow THIS report (never the half-typed filters). */
  const load = useCallback(
    (p, pg, size, { forceChart = false } = {}) => {
      const id = ++reqId.current;
      setState((s) => ({ ...s, loading: true, error: "" }));
      http
        .get(`${API}/get/report`, { params: { ...p, page: pg, limit: size } })
        .then((r) => {
          if (id !== reqId.current) return;
          const d = r.data.data;
          const shown = { ...p, ...(d.as_of && p.range !== "custom" ? { as_of: d.as_of } : {}) };
          setState({ loading: false, data: d, shown, error: "" });
          if (chartsOn.current && (forceChart || JSON.stringify(shown) !== chartKey.current)) loadChart(shown);
        })
        .catch(async (e) => {
          const msg = await apiMessage(e, "Couldn't update the report.");
          if (id === reqId.current) setState((s) => ({ ...s, loading: false, error: msg }));
        });
    },
    [loadChart]
  );

  // every change of filters → page 1 (charts follow once it has loaded), on its own
  useEffect(() => {
    if (!params) return;
    load(params, 1, pageSize);
    remember.set({ ...remember.get(), range: draft.range });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);
  // charts switched back on → draw them for the report on screen if what we have is for another one
  useEffect(() => {
    chartsOn.current = showCharts;
    if (showCharts && state.shown && JSON.stringify(state.shown) !== chartKey.current) loadChart(state.shown);
    remember.set({ ...remember.get(), charts: showCharts });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCharts]);
  useEffect(() => {
    if (rowsRef.current) rowsRef.current.scrollTop = 0;
  }, [state.data?.pagination?.page, paramsKey]);

  // the report on screen is for other filters than the ones set (its last refresh failed)
  const withoutAsOf = (p) => (p ? JSON.stringify({ ...p, as_of: undefined }) : "");
  const outOfDate = !!params && !!state.shown && !typing && !state.loading && withoutAsOf(state.shown) !== withoutAsOf(params);
  const pageTo = (pg, size = pageSize) => state.shown && !outOfDate && load(state.shown, pg, size);
  const refresh = () => {
    if (!params) return;
    load(params, outOfDate ? 1 : state.data?.pagination?.page || 1, pageSize, { forceChart: true });
  };
  const defaults = blankDraft(meta);
  const activeCount =
    (draft.range !== "last_7_days" ? 1 : 0) + (draft.branch ? 1 : 0) + (draft.supplier ? 1 : 0) + Object.values(draft.extra).filter(Boolean).length;
  const canReset = activeCount > 0 || !!draft.q;
  const reset = () => setDraft(defaults);

  const data = state.data;
  const cols = new Map((data?.columns || []).map((c) => [c.key, c]));
  const stale = typing || state.loading;
  // format-specific limits (a PDF's line cap) are shown inside the dialog
  const blocked = !data || stale || outOfDate || !!state.error || !!problem || !data.counts.documents;
  const why = !data
    ? ""
    : problem
    ? problem
    : state.error || outOfDate
    ? "The report on screen is for earlier filters — press Try again first"
    : stale
    ? "Updating the report…"
    : !data.counts.documents
    ? "Nothing to download for these filters"
    : "Download this report as CSV or PDF";

  // the dialog closes itself on success; on failure it stays open so the person can try again
  const download = async (format, extra) => {
    if (blocked || downloading) return;
    setDownloading(true);
    try {
      const r = await http.get(`${API}/download/report`, { params: { ...state.shown, format, ...extra }, responseType: "blob" });
      const name = downloadName(r.headers, type, data, format);
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setDialogOpen(false);
      toast({ severity: "success", text: `Downloaded “${name}”` });
    } catch (e) {
      toast({ severity: "error", text: await apiMessage(e, "The download didn't work. Please try again.") });
    } finally {
      setDownloading(false);
    }
  };

  const applied = (data?.applied || []).filter((a) => a.key !== "type");

  return (
    <>
      {/* ---------------- header: report + actions ---------------- */}
      <Box sx={{ flexShrink: 0, px: { xs: 1.5, md: 3 }, py: { xs: 1, md: 1.25 }, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", display: "flex", alignItems: "center", gap: { xs: 1, md: 1.5 }, flexWrap: "wrap" }}>
        <Tooltip title="All reports" arrow>
          <IconButton aria-label="Back to all reports" onClick={onBack} sx={{ ml: -0.5 }}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <IconTile icon={reportIcon(type.key)} tone={tone} size={36} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="h1" sx={{ fontSize: { xs: 16.5, md: 19 }, fontWeight: 700, letterSpacing: "-0.01em", m: 0 }} noWrap>
            {type.label}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", display: { xs: "none", md: "block" } }} noWrap>
            {type.description}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={state.loading ? "Updating…" : "Refresh now"} arrow>
            <span>
              <IconButton aria-label="Refresh now" onClick={refresh} disabled={!params || state.loading} sx={{ border: 1, borderColor: "divider", borderRadius: 2.5, width: 40, height: 40 }}>
                {state.loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          {canExport && (
            <Tooltip title={why} arrow>
              <span style={{ display: "flex" }}>
                <Button
                  variant="contained"
                  disableElevation
                  onClick={() => setDialogOpen(true)}
                  disabled={blocked}
                  aria-haspopup="dialog"
                  startIcon={<DownloadOutlinedIcon />}
                  sx={{ ...buttonSx, height: 40, px: { xs: 1.75, md: 2.25 }, whiteSpace: "nowrap", fontSize: 14.5 }}
                >
                  Download
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>

      {canExport && (
        <DownloadDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          type={type}
          data={data}
          maxPdfLines={meta.pdf_max_lines}
          chartsOnScreen={showCharts}
          busy={downloading}
          blocked={blocked}
          onDownload={download}
        />
      )}

      {/* ---------------- filters ---------------- */}
      <Box sx={{ flexShrink: 0, px: { xs: 1.5, md: 3 }, py: 1.25, borderBottom: 1, borderColor: "divider", bgcolor: fade(primary, 0.025) }}>
        <Filters
          meta={meta}
          type={type}
          draft={draft}
          setDraft={setDraft}
          suppliers={suppliers}
          problem={problem}
          onReset={reset}
          canReset={canReset}
          phone={isPhone}
          activeCount={activeCount}
        />
      </Box>

      {/* ---------------- results: one scrolling region, the pager pinned under it ---------------- */}
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        {state.loading && data && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, height: 2 }} />}
        {!data && state.error ? (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
              {state.error}
            </Alert>
          </Box>
        ) : !data ? (
          <Stack spacing={1.25} sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(5, 1fr)" } }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2.5 }} />
              ))}
            </Box>
            <Skeleton variant="rounded" height={226} sx={{ borderRadius: 2.5 }} />
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2.5 }} />
            ))}
          </Stack>
        ) : (
          <>
            <Box
              ref={rowsRef}
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehavior: "contain",
                scrollbarGutter: { md: "stable" },
                ...thinScroll(primary),
                px: { xs: 1.5, md: 3 },
                pt: 1.5,
                pb: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
              }}
            >
              {(state.error || outOfDate) && (
                <Alert
                  severity="warning"
                  variant="outlined"
                  sx={{ borderRadius: 2, alignItems: "center" }}
                  action={
                    <Button size="small" startIcon={<RefreshIcon />} onClick={refresh} disabled={state.loading || !params} sx={buttonSx}>
                      Try again
                    </Button>
                  }
                >
                  {state.error ? `${state.error} ` : "The report didn't update. "}
                  What you see below is for the earlier filters shown under Applied.
                </Alert>
              )}

              {/* what's applied + charts on/off */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "text.secondary", mr: 0.25 }}>APPLIED</Typography>
                {applied.map((a) => (
                  <Tooltip key={a.key} title={a.label} arrow>
                    <Box component="span" sx={{ px: 1, py: 0.35, borderRadius: 10, fontSize: 12, fontWeight: 600, bgcolor: act.soft, color: act.dark, border: 1, borderColor: act.line, maxWidth: "100%", overflowWrap: "anywhere" }}>
                      {`${a.label}: ${a.value}`}
                    </Box>
                  </Tooltip>
                ))}
                <Box sx={{ flex: 1 }} />
                {data.counts.documents > 0 && (
                  <Button size="small" startIcon={<BarChartOutlinedIcon />} onClick={() => setShowCharts((v) => !v)} sx={{ ...buttonSx, color: showCharts ? "text.secondary" : primary }}>
                    {showCharts ? "Hide charts" : "Show charts"}
                  </Button>
                )}
              </Box>

              {data.counts.documents > 0 && <Totals data={data} />}
              {data.counts.documents > 0 && showCharts && <Charts chart={chart} current={JSON.stringify(state.shown)} />}
              {data.counts.excluded_documents > 0 && (
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {data.counts.excluded_documents} {data.counts.excluded_documents === 1 ? data.report.doc_word[0] : data.report.doc_word[1]} with a status that doesn't
                  count (cancelled, rejected or pending) {data.counts.excluded_documents === 1 ? "is" : "are"} listed below, marked “Not in totals”.
                </Typography>
              )}

              <Box sx={{ opacity: state.loading ? 0.55 : 1, transition: "opacity .12s" }}>
                {!data.counts.documents ? (
                  <EmptyState
                    icon={SearchOffOutlinedIcon}
                    title="No records match these filters"
                    action={
                      canReset ? (
                        <Button size="small" startIcon={<RestartAltIcon />} onClick={reset} sx={{ ...buttonSx, mt: 0.5 }}>
                          Reset filters
                        </Button>
                      ) : null
                    }
                  >
                    Try a longer date range{meta.branch.is_admin && meta.branch.multi ? ", all branches" : ""} or clear the search.
                  </EmptyState>
                ) : data.report.single_row ? (
                  <RowTable data={data} cols={cols} />
                ) : (
                  <Stack spacing={1}>
                    {data.documents.map((d) => (
                      <DocumentCard key={d.doc_id} d={d} data={data} cols={cols} />
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>

            {data.counts.documents > 0 && (
              <AppPager
                page={data.pagination.page}
                pageSize={data.pagination.limit}
                total={data.pagination.total}
                onPageChange={(p) => pageTo(p)}
                pageSizeOptions={PAGE_SIZES}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  pageTo(1, n);
                }}
                disabled={state.loading || outOfDate}
                sx={{ px: { xs: 1.5, md: 3 }, borderColor: act.line, bgcolor: act.wash }}
              />
            )}
            <Typography aria-live="polite" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
              {`${data.counts.documents} ${data.counts.documents === 1 ? data.report.doc_word[0] : data.report.doc_word[1]}, ${data.counts.lines} lines`}
            </Typography>
          </>
        )}
      </Box>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
// the open report lives in the URL (?report=…), the way Sales keeps its tab — replaceState, so the
// router's own history is left alone
const REPORT_PARAM = "report";
function readReportFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get(REPORT_PARAM) || "";
  } catch {
    return "";
  }
}
function writeReportToUrl(key) {
  try {
    const url = new URL(window.location.href);
    if (key) url.searchParams.set(REPORT_PARAM, key);
    else url.searchParams.delete(REPORT_PARAM);
    window.history.replaceState(window.history.state, "", url);
  } catch {
    /* URL not writable here; the screen still works */
  }
}

function ProcurementReportsPage() {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));
  const [shellRef, shellHeight] = useFitsWindow(SHELL_HEIGHT);
  const { loading: accessLoading, can } = useAccess();

  const [meta, setMeta] = useState(null); // /get/report-types
  const [metaError, setMetaError] = useState(null); // { status, message }
  const [selected, setSelected] = useState(readReportFromUrl);
  const [suppliers, setSuppliers] = useState(null);
  const [toast, setToast] = useState(null); // { severity, text }

  useEffect(() => {
    let alive = true;
    http
      .get(`${API}/get/report-types`)
      .then((r) => alive && setMeta(r.data.data))
      .catch(async (e) => alive && setMetaError({ status: e?.response?.status, message: await apiMessage(e, "Couldn't load the reports.") }));
    return () => {
      alive = false;
    };
  }, []);

  const type = meta?.types.find((t) => t.key === selected) || null;
  // a supplier report needs the supplier list — fetched once, the first time one opens
  const needSuppliers = !!type?.supplier;
  useEffect(() => {
    if (!needSuppliers || suppliers) return;
    http
      .get(`${API}/get/suppliers`)
      .then((r) => setSuppliers(r.data.data || []))
      .catch(() => setSuppliers([]));
  }, [needSuppliers, suppliers]);

  const open = (key) => {
    setSelected(key);
    writeReportToUrl(key);
  };
  const back = () => {
    setSelected("");
    writeReportToUrl("");
  };

  if ((!accessLoading && !can(PERM.view)) || metaError?.status === 403) {
    return (
      <Box ref={shellRef} sx={{ height: shellHeight, display: "flex", overflow: "hidden", bgcolor: "background.default" }}>
        <AccessDenied what="reports" />
      </Box>
    );
  }

  const canExport = !!meta?.can_export && can(PERM.export);

  return (
    <Box ref={shellRef} sx={{ height: shellHeight, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default" }}>
      {meta && type ? (
        <ReportView key={type.key} meta={meta} type={type} suppliers={suppliers} canExport={canExport} onBack={back} isPhone={isPhone} toast={setToast} />
      ) : (
        <>
          <Box sx={{ flexShrink: 0, px: { xs: 2, md: 3 }, py: { xs: 1.25, md: 1.5 }, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconTile icon={AssessmentOutlinedIcon} size={36} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography component="h1" sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700, letterSpacing: "-0.01em", m: 0 }} noWrap>
                Procurement reports
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
                Pick a report to open it — filter, see the charts, then download it as CSV or PDF
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", ...thinScroll(theme.palette.primary.main) }}>
            {metaError ? (
              <Box sx={{ p: 3 }}>
                <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
                  {metaError.message}
                </Alert>
              </Box>
            ) : !meta ? (
              <Box sx={{ p: { xs: 2, md: 3 }, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(260px, 1fr))" } }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: 3 }} />
                ))}
              </Box>
            ) : !meta.types.length ? (
              <EmptyState icon={AssessmentOutlinedIcon} title="No reports for your role">
                Your role can't open any of the screens these reports come from. Ask your admin for access.
              </EmptyState>
            ) : (
              <ReportCards meta={meta} onOpen={open} />
            )}
          </Box>
        </>
      )}

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2, maxWidth: 520 }}>
            {toast.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

/** The page, wrapped so it reads its colours from src/theme/appColors.js. */
export default function ProcurementReports() {
  return (
    <ColorRoot>
      <ProcurementReportsPage />
    </ColorRoot>
  );
}