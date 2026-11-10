// src/pharmacy/purchase/PurchaseReturns.jsx      (route: pharmacy/purchase-returns — see pharmacyRoutes.jsx)
//
// Purchase returns — stock going back to the supplier (expired, damaged, wrong item, excess,
// recalled…), settled by a DEBIT NOTE (credit against what you owe) or a REFUND.
//
//   List         every return to a supplier: search, supplier, status, open credit only.
//   New return   Against an order  → that received order's lines (batch by batch)
//                From supplier stock → every batch of that supplier in your stock, expiring first
//                Type how many go back (strips, or loose tablets from an opened strip), why, and
//                — if the supplier credits a different rate — the rate. Review shows the money and
//                where a debit note goes (the order first, then their other unpaid orders).
//   Open one     lines, money, set-offs; Debit note PDF, Apply open credit, Cancel (stock back).
//
// Opened from an order too: "Return to supplier" on a received purchase order leaves
// { id, purchase_number } in sessionStorage under RETURN_PRESELECT_KEY and comes here.
//
// The list is laid out like Purchase orders: a totals strip (Open credit doubles as a filter), the
// filter bar, column headings, one card per return, and the shared AppPager pinned underneath
// (5 a page to start). Every screen is in the page (no pop-up forms); only the rows scroll.
// Needs pharmacy.purchase_return.view (.create to return stock, .edit to cancel a return).
// Backend: routes/Pharmacy/pharmacyPurchaseReturns.js @ /api/pharmacy/purchase-returns

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import AddIcon from "@mui/icons-material/Add";
import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CurrencyRupeeOutlinedIcon from "@mui/icons-material/CurrencyRupeeOutlined";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/Close";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SearchIcon from "@mui/icons-material/Search";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";

import { ColorRoot } from "../../theme/appColors";
import useAccess, { AccessDenied } from "../../hooks/useAccess";
import AppPager from "../shared/AppPager";
import BranchPicker, { usePharmacyBranch } from "../shared/BranchPicker";
import { plural } from "../shared/pharmacyUnits";
import useLeaveGuard from "./useLeaveGuard";
import { ColHead, IconTile, fade, thinScroll, tints, toneColor } from "./purchaseStyles";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const API_BASE = process.env.REACT_APP_SITE_URL || "";
const API = `${API_BASE}/api/pharmacy/purchase-returns`;
const http = axios.create({ withCredentials: true });

/** Set by the purchase order dialog ("Return to supplier") to open a new return against that order. */
export const RETURN_PRESELECT_KEY = "caredesk:return-po";

const PERM = {
  view: "pharmacy.purchase_return.view",
  create: "pharmacy.purchase_return.create",
  edit: "pharmacy.purchase_return.edit",
};

const REASONS = [
  { value: "expired", label: "Expired" },
  { value: "near_expiry", label: "Near expiry" },
  { value: "damaged", label: "Damaged / broken" },
  { value: "wrong_item", label: "Wrong item supplied" },
  { value: "excess", label: "Excess supply" },
  { value: "recalled", label: "Batch recalled" },
  { value: "other", label: "Other" },
];
const REFUND_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];
const SHELL_HEIGHT = "calc(86dvh - var(--purchase-returns-offset, 0px))";
const PAGE_SIZES = [5, 10, 20, 50, 100]; // returns per page (the shared AppPager)
const DEFAULT_PAGE_SIZE = 5;


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (n) => money(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nums = { fontVariantNumeric: "tabular-nums" };
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(`${String(v).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const fmtExp = (v) => (v ? `${String(v).slice(5, 7)}/${String(v).slice(2, 4)}` : "—");
const apiMessage = async (err, fallback) => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || err?.message || fallback;
};
const cap = (w) => (w ? `${w.charAt(0).toUpperCase()}${w.slice(1)}` : w);

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

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

/** The money on a line, worked out as you type (the server does the same sums) */
function lineMoney({ unit, quantity, rate, upp, gst }) {
  const q = Number(quantity) || 0;
  const r = Number(rate) || 0;
  const unitPrice = unit === "tablet" ? r / Math.max(1, upp) : r;
  const taxable = money(q * unitPrice);
  const tax = money((taxable * (Number(gst) || 0)) / 100);
  return { taxable, tax, total: money(taxable + tax) };
}

const buttonSx = { textTransform: "none", fontWeight: 600, borderRadius: 2 };
const labelSx = { fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary" };

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */
function Tag({ tone = "default", children, sx }) {
  const theme = useTheme();
  const c = tone === "default" ? theme.palette.text.secondary : theme.palette[tone].main;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 0.9,
        py: 0.15,
        borderRadius: 10,
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
        color: tone === "default" ? "text.secondary" : `${tone}.dark`,
        bgcolor: alpha(c, 0.1),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

const StatusTag = ({ status }) =>
  status === "cancelled" ? <Tag tone="error">Cancelled</Tag> : <Tag tone="success">Returned</Tag>;
const SettlementTag = ({ r }) =>
  r.settlement === "refund" ? (
    <Tag tone="info">Refund</Tag>
  ) : r.open_credit > 0 && r.status === "completed" ? (
    <Tag tone="warning">Credit ₹{inr(r.open_credit)} open</Tag>
  ) : (
    <Tag>Debit note</Tag>
  );

/* A plain cell input — text on the row, underlined when you type in it (no box) */
function PlainInput({ value, onChange, placeholder, align = "right", error, width, ariaLabel, inputMode = "decimal", disabled }) {
  const theme = useTheme();
  return (
    <Box
      component="input"
      value={value ?? ""}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={error ? true : undefined}
      inputMode={inputMode}
      disabled={disabled}
      autoComplete="off"
      onChange={(e) => onChange(e.target.value)}
      sx={{
        width: width || "100%",
        minWidth: 0,
        font: "inherit",
        fontSize: { xs: 16, md: 13.5 },
        fontWeight: 600,
        ...nums,
        textAlign: align,
        px: 0.5,
        py: 0.5,
        border: 0,
        borderRadius: 1,
        outline: "none",
        color: error ? "error.main" : "text.primary",
        bgcolor: error ? alpha(theme.palette.error.main, 0.06) : "transparent",
        boxShadow: `inset 0 -1px 0 ${error ? theme.palette.error.main : theme.palette.divider}`,
        transition: "background-color .12s, box-shadow .12s",
        "&:hover": { bgcolor: alpha(theme.palette.text.primary, 0.05) },
        "&:focus": { bgcolor: "background.paper", boxShadow: `inset 0 -2px 0 ${theme.palette[error ? "error" : "primary"].main}` },
        "&::placeholder": { color: "text.disabled", fontWeight: 400 },
        "&:disabled": { color: "text.disabled", bgcolor: "transparent" },
      }}
    />
  );
}

/* A plain select (native — big and easy on a phone) */
function PlainSelect({ value, onChange, options, ariaLabel, error, placeholder }) {
  const theme = useTheme();
  return (
    <Box
      component="select"
      value={value || ""}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        width: "100%",
        minWidth: 0,
        font: "inherit",
        fontSize: { xs: 16, md: 13 },
        fontWeight: 500,
        px: 0.25,
        py: 0.5,
        border: 0,
        borderRadius: 1,
        outline: "none",
        cursor: "pointer",
        color: value ? (error ? "error.main" : "text.primary") : "text.disabled",
        bgcolor: "transparent",
        boxShadow: `inset 0 -1px 0 ${error ? theme.palette.error.main : theme.palette.divider}`,
        "&:hover": { bgcolor: alpha(theme.palette.text.primary, 0.05) },
        "&:focus": { boxShadow: `inset 0 -2px 0 ${theme.palette.primary.main}` },
      }}
    >
      {!value && <option value="">{placeholder || "Choose…"}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Box>
  );
}

function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 8, px: 3, textAlign: "center", color: "text.secondary" }}>
      <Box sx={{ width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "action.hover" }}>
        <Icon />
      </Box>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "text.primary" }}>{title}</Typography>
      {children && <Typography sx={{ fontSize: 13, maxWidth: 420 }}>{children}</Typography>}
      {action}
    </Stack>
  );
}

function MoneyRow({ label, hint, value, tone, strong }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minHeight: 30 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>{label}</Typography>
        {hint && <Typography sx={{ fontSize: 11.5, color: "text.disabled", lineHeight: 1.3 }}>{hint}</Typography>}
      </Box>
      <Typography sx={{ fontSize: strong ? 16 : 14.5, fontWeight: strong ? 800 : 600, ...nums, color: tone || "text.primary", whiteSpace: "nowrap" }}>
        {value}
      </Typography>
    </Stack>
  );
}

/* The money card: value on a coloured bar, then the parts and where the credit goes */
function MoneyCard({ title, total, taxable, tax, children, busy }) {
  const theme = useTheme();
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5, bgcolor: "primary.main", color: "primary.contrastText" }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{title}</Typography>
        {busy && <CircularProgress size={16} sx={{ color: "inherit" }} />}
        <Typography sx={{ fontSize: { xs: 24, sm: 27 }, fontWeight: 600, ...nums, lineHeight: 1.1, opacity: busy ? 0.6 : 1 }}>
          ₹{inr(total)}
        </Typography>
      </Stack>
      <Stack sx={{ px: 2, py: 1 }} divider={<Divider flexItem sx={{ borderStyle: "dashed" }} />}>
        <MoneyRow label="Taxable value" hint="quantity × rate, before GST" value={`₹${inr(taxable)}`} />
        <MoneyRow label="GST" value={`₹${inr(tax)}`} />
      </Stack>
      {children && <Box sx={{ px: 2, pb: 1.5, pt: 0.5, borderTop: 1, borderColor: "divider", bgcolor: alpha(theme.palette.text.primary, 0.025) }}>{children}</Box>}
    </Paper>
  );
}

/* ------------------------------------------------------------------ */
/* LIST — laid out like Purchase orders: totals strip, filter bar,    */
/* column headings, one card per return, the pager pinned underneath. */
/* ------------------------------------------------------------------ */
const LIST_COLS = "minmax(150px, 1fr) minmax(170px, 1.4fr) minmax(130px, 1fr) 104px 140px 112px";

const STATUS_OPTIONS = [
  { value: "all", label: "All returns", icon: AppsOutlinedIcon, tone: "primary" },
  { value: "completed", label: "Returned", icon: TaskAltIcon, tone: "success" },
  { value: "cancelled", label: "Cancelled", icon: CancelOutlinedIcon, tone: "error" },
];

/* The same filter-box look as Purchase orders, so the two pages match. */
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

/* One number in the strip above the rows, with its icon tile (as on Purchase orders). */
function Stat({ label, value, icon, iconTone = "primary", tone, onClick, pressed }) {
  const theme = useTheme();
  const t = tints(theme, iconTone);
  return (
    <Box
      component={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!pressed : undefined}
      title={onClick ? (pressed ? "Show every return" : "Show only returns with open credit") : undefined}
      sx={{
        minWidth: 0,
        px: { xs: 1.25, md: 1.75 },
        py: 1.1,
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        width: "100%",
        border: 0,
        font: "inherit",
        textAlign: "left",
        color: "inherit",
        bgcolor: pressed ? t.soft : "transparent",
        cursor: onClick ? "pointer" : "default",
        transition: "background-color .15s",
        "&:hover": onClick ? { bgcolor: pressed ? t.soft : t.wash } : undefined,
        "&:focus-visible": { outline: "2px solid", outlineColor: t.main, outlineOffset: -2 },
      }}
    >
      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <IconTile icon={icon} tone={iconTone} size={36} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: pressed ? t.dark : "text.secondary", letterSpacing: "0.05em" }} noWrap>
          {label}
        </Typography>
        <Typography sx={{ fontSize: { xs: 15, md: 17 }, fontWeight: 800, lineHeight: 1.25, ...nums, color: tone ? toneColor(theme, tone) : "text.primary" }} noWrap>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/* Status: a plain dropdown with an icon on every option (as on Purchase orders). */
function StatusSelect({ value, onChange }) {
  const theme = useTheme();
  const current = STATUS_OPTIONS.find((o) => o.value === value) || STATUS_OPTIONS[0];
  const active = value !== "all";
  const color = active ? toneColor(theme, current.tone) : theme.palette.text.secondary;
  const CurrentIcon = current.icon;
  return (
    <TextField
      select
      size="small"
      label="Status"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width: { xs: "100%", sm: 180 }, flexShrink: 0, ...filterSx(color, active) }}
      SelectProps={{
        renderValue: () => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <CurrentIcon sx={{ fontSize: 18, color, flexShrink: 0 }} />
            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {current.label}
            </Box>
          </Box>
        ),
        MenuProps: { PaperProps: { sx: { mt: 0.75, borderRadius: 2.5, minWidth: 200, "& .MuiList-root": { p: 0.75 } } } },
      }}
    >
      {STATUS_OPTIONS.map((o) => {
        const Icon = o.icon;
        const c = toneColor(theme, o.tone);
        return (
          <MenuItem key={o.value} value={o.value} sx={{ borderRadius: 1.5, py: 0.8, mb: 0.25, "&.Mui-selected, &.Mui-selected:hover": { bgcolor: fade(c, 0.1) } }}>
            <ListItemIcon sx={{ minWidth: 38 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: fade(c, 0.12) }}>
                <Icon sx={{ fontSize: 17, color: c }} />
              </Box>
            </ListItemIcon>
            <ListItemText primary={o.label} primaryTypographyProps={{ fontSize: 14, fontWeight: o.value === value ? 700 : 500, noWrap: true }} />
          </MenuItem>
        );
      })}
    </TextField>
  );
}

function ReturnList({ reloadKey, onOpen, onNew, canCreate, branchParams }) {
  const theme = useTheme();
  const act = tints(theme, "primary"); // main / dark / wash / soft / tile / line / ring
  const primary = act.main;
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 350);
  const [supplier, setSupplier] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [status, setStatus] = useState("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [state, setState] = useState({ loading: true, rows: [], summary: null, total: 0, error: "" });
  const rowsRef = useRef(null);

  useEffect(() => {
    http
      .get(`${API}/getall/suppliers`)
      .then((r) => setSuppliers(r.data.data || []))
      .catch(() => setSuppliers([]));
  }, [reloadKey]);

  useEffect(() => setPage(1), [q, supplier, status, openOnly, branchParams]);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    http
      .get(`${API}/getall/returns`, {
        params: {
          page,
          limit: pageSize,
          ...(q ? { search: q } : {}),
          ...(supplier ? { supplier_id: supplier.id } : {}),
          ...(status !== "all" ? { status } : {}),
          ...(openOnly ? { open_credit: 1 } : {}),
          ...branchParams,
        },
      })
      .then((r) => alive && setState({ loading: false, rows: r.data.data || [], summary: r.data.summary, total: r.data.pagination?.total || 0, error: "" }))
      .catch(async (e) => {
        const msg = await apiMessage(e, "Couldn't load the returns");
        if (alive) setState({ loading: false, rows: [], summary: null, total: 0, error: msg });
      });
    return () => {
      alive = false;
    };
  }, [page, pageSize, q, supplier, status, openOnly, reloadKey, branchParams]);

  // a new page starts at the top
  useEffect(() => {
    if (rowsRef.current) rowsRef.current.scrollTop = 0;
  }, [page, pageSize]);

  const s = state.summary;
  const filtered = !!(q || supplier || status !== "all" || openOnly);
  const clearFilters = () => {
    setSearch("");
    setSupplier(null);
    setStatus("all");
    setOpenOnly(false);
  };
  const first = state.loading && !state.rows.length;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* ---------------- totals ---------------- */}
      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 0.75, md: 1 },
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          "& > *:not(:last-child)": { borderRight: 1, borderColor: "divider" },
        }}
      >
        <Stat label="RETURNS" icon={AssignmentReturnOutlinedIcon} iconTone="primary" value={s ? s.total.toLocaleString("en-IN") : "—"} />
        <Stat label="VALUE RETURNED" icon={CurrencyRupeeOutlinedIcon} iconTone="secondary" value={s ? `₹${inr(s.value)}` : "—"} />
        <Stat
          label={openOnly ? "OPEN CREDIT · ONLY THESE" : "OPEN CREDIT"}
          icon={AccountBalanceWalletOutlinedIcon}
          iconTone="warning"
          tone={s && s.open_credit > 0 ? "warning" : undefined}
          value={s ? `₹${inr(s.open_credit)}` : "—"}
          onClick={() => setOpenOnly((v) => !v)}
          pressed={openOnly}
        />
      </Box>

      {/* ---------------- filters ---------------- */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          flexWrap: "wrap",
          px: { xs: 2, md: 2.5 },
          py: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: fade(primary, 0.025),
        }}
      >
        <StatusSelect value={status} onChange={setStatus} />
        <Autocomplete
          size="small"
          options={suppliers}
          value={supplier}
          onChange={(_, v) => setSupplier(v)}
          getOptionLabel={(o) => o.supplier_name || ""}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          noOptionsText="No supplier matches"
          openOnFocus
          autoHighlight
          sx={{ width: { xs: "100%", sm: 240 }, flexShrink: 0 }}
          slotProps={{ paper: { sx: { mt: 0.75, borderRadius: 2.5, "& .MuiAutocomplete-listbox": { maxHeight: 280, p: 0.75 }, "& .MuiAutocomplete-option": { borderRadius: 1.5 } } } }}
          renderInput={(p) => (
            <TextField
              {...p}
              label="Supplier"
              placeholder={supplier ? "" : "All suppliers"}
              InputLabelProps={{ ...p.InputLabelProps, shrink: true }}
              sx={{ ...filterSx(primary, !!supplier), "& .MuiInputBase-input::placeholder": { color: "text.primary", opacity: 0.85 } }}
              InputProps={{
                ...p.InputProps,
                startAdornment: (
                  <>
                    <InputAdornment position="start" sx={{ ml: 0.5, mr: 0 }}>
                      <StorefrontOutlinedIcon sx={{ fontSize: 18, color: supplier ? primary : "text.secondary" }} />
                    </InputAdornment>
                    {p.InputProps.startAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        <TextField
          size="small"
          placeholder="Search return no., supplier, order, invoice, medicine or batch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: { xs: "100%", sm: 240 }, ...filterSx(primary, !!search) }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: search ? primary : "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="Clear search" onClick={() => setSearch("")}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        {filtered && (
          <Button size="small" onClick={clearFilters} startIcon={<FilterAltOffOutlinedIcon />} sx={{ ...buttonSx, flexShrink: 0 }}>
            Clear
          </Button>
        )}
      </Box>

      {/* ---------------- column headings — desktop only ---------------- */}
      {!!state.rows.length && !state.error && (
        <Box sx={{ flexShrink: 0, display: { xs: "none", md: "block" }, px: 2.5, pt: 1.25, pb: 0.75, overflowY: "hidden", scrollbarGutter: "stable" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: LIST_COLS,
              columnGap: 1.5,
              alignItems: "center",
              px: 1.25,
              py: 0.9,
              border: 1,
              borderRadius: 2,
              borderColor: act.line,
              bgcolor: act.soft,
            }}
          >
            <ColHead icon={ReceiptLongOutlinedIcon}>Return</ColHead>
            <ColHead icon={StorefrontOutlinedIcon}>Supplier · against</ColHead>
            <ColHead icon={InfoOutlinedIcon}>Why</ColHead>
            <ColHead icon={FlagOutlinedIcon}>Status</ColHead>
            <ColHead icon={AccountBalanceWalletOutlinedIcon}>Settlement</ColHead>
            <ColHead icon={CurrencyRupeeOutlinedIcon} right>
              Value
            </ColHead>
          </Box>
        </Box>
      )}

      {/* ---------------- rows — the only scrolling region ---------------- */}
      <Box
        ref={rowsRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehavior: "contain",
          scrollbarGutter: "stable",
          ...thinScroll(primary),
          px: { xs: 2, md: 2.5 },
          pb: 2,
          pt: { xs: 1.25, md: 0 },
          opacity: state.loading && state.rows.length ? 0.55 : 1,
          pointerEvents: state.loading && state.rows.length ? "none" : "auto",
          transition: "opacity .12s",
        }}
      >
        {state.error ? (
          <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2, fontSize: 13, mt: 1 }}>
            {state.error}
          </Alert>
        ) : first ? (
          <Stack spacing={0.75} sx={{ pt: 0.5 }}>
            {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={58} sx={{ borderRadius: 2 }} />
            ))}
          </Stack>
        ) : !state.rows.length ? (
          <EmptyState
            icon={AssignmentReturnOutlinedIcon}
            title={filtered ? "Nothing matches those filters" : "No returns to suppliers yet"}
            action={
              filtered ? (
                <Button size="small" onClick={clearFilters} startIcon={<FilterAltOffOutlinedIcon />} sx={{ ...buttonSx, mt: 0.5 }}>
                  Clear filters
                </Button>
              ) : canCreate ? (
                <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={onNew} sx={{ ...buttonSx, mt: 1 }}>
                  New return
                </Button>
              ) : null
            }
          >
            {filtered
              ? "Try a different status, supplier or search."
              : "Send expired, damaged or wrongly supplied stock back to the supplier — against a debit note or a refund."}
          </EmptyState>
        ) : (
          <Stack spacing={0.75} sx={{ pt: 0.5 }}>
            {state.rows.map((r) => {
              const dead = r.status === "cancelled";
              const stripe = toneColor(theme, dead ? "error" : r.open_credit > 0 ? "warning" : "success");
              return (
                <Box
                  key={r.id}
                  component="button"
                  type="button"
                  onClick={() => onOpen(r.id)}
                  sx={{
                    width: "100%",
                    font: "inherit",
                    color: "inherit",
                    textAlign: "left",
                    opacity: dead ? 0.6 : 1,
                    display: "grid",
                    gap: { xs: 0.25, md: 1.5 },
                    gridTemplateColumns: { xs: "1fr auto", md: LIST_COLS },
                    alignItems: "center",
                    px: 1.25,
                    py: 1,
                    cursor: "pointer",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    // status stripe on the left edge — an inset shadow, so it doesn't move the columns
                    boxShadow: `inset 3px 0 0 ${stripe}`,
                    transition: "border-color .15s, background-color .15s, box-shadow .15s",
                    "&:hover": { borderColor: act.main, bgcolor: act.wash, boxShadow: `inset 3px 0 0 ${stripe}, 0 2px 8px ${act.ring}` },
                    "&:focus-visible": { outline: "2px solid", outlineColor: act.main, outlineOffset: 1 },
                  }}
                >
                  {/* return number — on a phone, everything else underneath */}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, ...nums }} noWrap>
                      {r.return_number}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                      {fmtDate(r.return_date)}
                      {r.branch ? ` · ${r.branch}` : ""}
                      <Box component="span" sx={{ display: { md: "none" } }}>
                        {r.supplier_name ? ` · ${r.supplier_name}` : ""} · {r.lines_count} {plural("line", r.lines_count)}
                      </Box>
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 0, display: { xs: "none", md: "block" } }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap title={r.supplier_name || ""}>
                      {r.supplier_name || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                      {r.purchase_number ? `${r.purchase_number}${r.invoice_number ? ` · inv. ${r.invoice_number}` : ""}` : "from supplier stock"}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 0, display: { xs: "none", md: "block" } }}>
                    <Typography sx={{ fontSize: 13 }} noWrap title={r.reason || ""}>
                      {r.reason || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                      {r.lines_count} {plural("line", r.lines_count)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: { xs: "none", md: "block" } }}>
                    <StatusTag status={r.status} />
                  </Box>
                  <Box sx={{ minWidth: 0, display: { xs: "none", md: "block" } }}>{!dead ? <SettlementTag r={r} /> : <Tag>—</Tag>}</Box>

                  {/* value — on a phone this is the right-hand column */}
                  <Typography
                    sx={{ fontSize: 13.5, fontWeight: 700, textAlign: "right", ...nums, color: dead ? "text.disabled" : "text.primary", textDecoration: dead ? "line-through" : "none" }}
                    noWrap
                  >
                    ₹{inr(r.total_amount)}
                  </Typography>

                  {/* phone: the tags ride under the row */}
                  <Box sx={{ display: { xs: "flex", md: "none" }, gridColumn: "1 / -1", gap: 0.5, pt: 0.4, flexWrap: "wrap" }}>
                    <StatusTag status={r.status} />
                    {!dead && <SettlementTag r={r} />}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* ---------------- pager — pinned under the rows ---------------- */}
      {!state.error && state.total > 0 && (
        <AppPager
          page={page}
          pageSize={pageSize}
          total={state.total}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZES}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          disabled={state.loading}
          sx={{ px: { xs: 2, md: 2.5 }, borderColor: act.line, bgcolor: act.wash }}
        />
      )}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* NEW RETURN                                                          */
/* ------------------------------------------------------------------ */
// one line per batch (per order line): Medicine · Batch · Exp. · Can return · Return · Why · Rate · GST · Amount
const LINE_COLS = "minmax(170px, 1.6fr) 80px 54px 112px 140px 140px 82px 48px 92px";
const LINE_ONE_ROW = 960; // px of list width for the one-row line; below it the line wraps (never scrolls sideways)
const keyOf = (l) => `${l.batch_id}:${l.purchase_item_id || 0}`;

function NewReturn({ preselect, br, onBack, onSaved }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [mode, setMode] = useState("order"); // order | supplier
  const [orders, setOrders] = useState([]);
  const [ordersQ, setOrdersQ] = useState("");
  const ordersQd = useDebounced(ordersQ, 300);
  const [order, setOrder] = useState(preselect ? { id: preselect.id, purchase_number: preselect.purchase_number } : null);
  const [suppliers, setSuppliers] = useState([]);
  const [supplier, setSupplier] = useState(null);
  const [search, setSearch] = useState("");
  const searchD = useDebounced(search.trim(), 350);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [source, setSource] = useState({ loading: false, data: null, error: "" });
  const [chosen, setChosen] = useState({}); // key → { line, unit, quantity, reason, rate, gst }
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [settlement, setSettlement] = useState("debit_note");
  const [refundMethod, setRefundMethod] = useState("");
  const [refundRef, setRefundRef] = useState("");
  const [notes, setNotes] = useState("");
  const [returnDate, setReturnDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [leave, setLeave] = useState(null);
  const listRef = useRef(null);
  const [listW, setListW] = useState(null);

  const branchParams = useMemo(() => (br.isAdmin && br.branch ? { branch: br.branch } : {}), [br.isAdmin, br.branch]);
  const needBranch = br.needsChoice;
  const picked = mode === "order" ? order : supplier;
  const lines = Object.values(chosen).filter((c) => Number(c.quantity) > 0);
  useLeaveGuard(lines.length > 0 && !saving, (proceed) => setLeave({ proceed }));

  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    setListW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setListW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [picked]);
  const wide = !listW || listW >= LINE_ONE_ROW;

  /* pickers */
  useEffect(() => {
    if (mode !== "order") return undefined;
    let alive = true;
    http
      .get(`${API}/getall/orders`, { params: { ...(ordersQd ? { search: ordersQd } : {}), ...branchParams } })
      .then((r) => alive && setOrders(r.data.data || []))
      .catch(() => alive && setOrders([]));
    return () => {
      alive = false;
    };
  }, [mode, ordersQd, branchParams]);
  useEffect(() => {
    http
      .get(`${API}/getall/suppliers`)
      .then((r) => setSuppliers((r.data.data || []).filter((s) => s.status !== "inactive")))
      .catch(() => setSuppliers([]));
  }, []);

  /* what can go back */
  useEffect(() => {
    if (!picked || needBranch) {
      setSource({ loading: false, data: null, error: "" });
      return undefined;
    }
    let alive = true;
    setSource((s) => ({ ...s, loading: true, error: "" }));
    const params =
      mode === "order"
        ? { purchase_id: picked.id, ...branchParams }
        : { supplier_id: picked.id, ...(searchD ? { search: searchD } : {}), ...(expiringOnly ? { expiring: 1 } : {}), ...branchParams };
    http
      .get(`${API}/get/returnable`, { params })
      .then((r) => alive && setSource({ loading: false, data: r.data.data, error: "" }))
      .catch(async (e) => {
        const msg = await apiMessage(e, "Couldn't load the stock");
        if (alive) setSource({ loading: false, data: null, error: msg });
      });
    return () => {
      alive = false;
    };
  }, [mode, picked, searchD, expiringOnly, branchParams, needBranch]);

  // a preselected order: fill in its supplier name once the order list knows it
  useEffect(() => {
    if (order && !order.supplier_name) {
      const full = orders.find((o) => o.id === order.id);
      if (full) setOrder(full);
    }
  }, [orders, order]);

  const switchMode = (m) => {
    if (m === mode) return;
    setMode(m);
    setChosen({});
    setPreview(null);
  };
  const pick = (v) => {
    if (mode === "order") setOrder(v);
    else setSupplier(v);
    setChosen({});
    setPreview(null);
  };

  /* typing on a line — a new line takes the reason picked last (or "expired" for an expired batch) */
  const lastReason = useRef("");
  const setLine = (l, patch) => {
    if (patch.reason) lastReason.current = patch.reason;
    setChosen((c) => {
      const k = keyOf(l);
      const cur = c[k] || {
        line: l,
        unit: l.units_per_pack > 1 ? "strip" : "pack",
        quantity: "",
        reason: l.suggested_reason || lastReason.current || "",
        rate: Number(l.rate).toFixed(2),
        gst: String(l.gst_percentage),
      };
      return { ...c, [k]: { ...cur, ...patch } };
    });
  };

  /* the body the server gets */
  const body = useMemo(() => {
    if (!picked) return null;
    return {
      ...(mode === "order" ? { purchase_id: picked.id } : { supplier_id: picked.id }),
      ...branchParams,
      settlement,
      ...(settlement === "refund" ? { refund_method: refundMethod || undefined, refund_reference: refundRef || undefined } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      return_date: returnDate,
      lines: lines.map((c) => ({
        batch_id: c.line.batch_id,
        ...(c.line.purchase_item_id ? { purchase_item_id: c.line.purchase_item_id } : {}),
        unit: c.unit,
        quantity: Number(c.quantity),
        ...(c.reason ? { reason: c.reason } : {}),
        ...(String(c.rate).trim() !== "" && Number(c.rate) !== Number(c.line.rate) ? { rate: Number(c.rate) } : {}),
        ...(String(c.gst).trim() !== "" && Number(c.gst) !== Number(c.line.gst_percentage) ? { gst_percentage: Number(c.gst) } : {}),
      })),
    };
  }, [picked, mode, branchParams, settlement, refundMethod, refundRef, notes, returnDate, lines]);
  const bodyKey = JSON.stringify(body);
  const bodyD = useDebounced(bodyKey, 500);

  /* the server's check (writes nothing) */
  useEffect(() => {
    const b = JSON.parse(bodyD || "null");
    if (!b || !b.lines.length) {
      setPreview(null);
      return undefined;
    }
    let alive = true;
    setChecking(true);
    http
      .post(`${API}/preview/return`, b)
      .then((r) => alive && setPreview({ ...r.data.data, key: bodyD }))
      .catch(async (e) => {
        const msg = await apiMessage(e, "Couldn't check the return");
        if (alive) setPreview({ can_return: false, problems: [msg], warnings: [], lines: [], key: bodyD });
      })
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [bodyD]);

  const stale = checking || !preview || preview.key !== bodyKey;
  const lineIssues = useMemo(() => {
    const m = new Map();
    if (!preview || stale) return m;
    (preview.lines || []).forEach((pl, i) => {
      const c = lines[i];
      if (c) m.set(keyOf(c.line), { problems: pl.problems || [], warnings: pl.warnings || [] });
    });
    return m;
  }, [preview, stale, lines]);

  // money as you type
  const totals = lines.reduce(
    (t, c) => {
      const m = lineMoney({ unit: c.unit, quantity: c.quantity, rate: c.rate, upp: c.line.units_per_pack, gst: c.gst });
      return { taxable: money(t.taxable + m.taxable), tax: money(t.tax + m.tax), total: money(t.total + m.total), tablets: t.tablets + (c.unit === "tablet" ? Number(c.quantity) : Number(c.quantity) * c.line.units_per_pack) };
    },
    { taxable: 0, tax: 0, total: 0, tablets: 0 }
  );
  const problems = !stale && preview ? preview.problems : [];
  const canReview = lines.length > 0 && !stale && preview?.can_return;
  const refundMissing = settlement === "refund" && !refundMethod;

  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const r = await http.post(`${API}/post/return`, body);
      setConfirmOpen(false);
      setChosen({});
      onSaved(r.data.data, r.data.message);
    } catch (e) {
      setSaveError(await apiMessage(e, "Couldn't return the stock"));
    } finally {
      setSaving(false);
    }
  };

  const srcLines = source.data?.lines || [];
  // order mode shows the order's lines as they are; supplier mode, expired / expiring first (server order)
  const shownLines = srcLines;
  const chosenNotShown = lines.filter((c) => !shownLines.some((l) => keyOf(l) === keyOf(c.line)));

  /* ---------- one line ---------- */
  const renderLine = (l, idx) => {
    const k = keyOf(l);
    const c = chosen[k];
    const qty = c?.quantity ?? "";
    const unit = c?.unit || (l.units_per_pack > 1 ? "strip" : "pack");
    const issues = lineIssues.get(k);
    const on = Number(qty) > 0;
    const m = on ? lineMoney({ unit, quantity: qty, rate: c.rate, upp: l.units_per_pack, gst: c.gst }) : null;
    const nothing = l.can_return_tablets <= 0;
    const flag = (re) => !!issues?.problems.some((p) => re.test(p));
    const expTone = l.expired ? "error.main" : l.near_expiry ? "warning.dark" : "text.primary";

    const cells = {
      batch: <Typography sx={{ fontSize: 13, fontWeight: 600, px: 0.5 }} noWrap title={l.batch_number}>{l.batch_number}</Typography>,
      exp: (
        <Tooltip title={l.expired ? `Expired ${fmtDate(l.expiry_date)}` : l.near_expiry ? `Expires in ${l.days_to_expiry} days` : fmtDate(l.expiry_date)}>
          <Typography sx={{ fontSize: 13, fontWeight: l.expired || l.near_expiry ? 700 : 500, color: expTone, px: 0.5, ...nums }}>{fmtExp(l.expiry_date)}</Typography>
        </Tooltip>
      ),
      can: (
        <Box sx={{ minWidth: 0, px: 0.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, ...nums, color: nothing ? "text.disabled" : "text.primary" }} noWrap title={l.can_return_text}>
            {l.can_return_text}
          </Typography>
          {(l.returned_text || l.can_return_tablets < l.available_tablets) && (
            <Typography sx={{ fontSize: 11, color: "text.secondary" }} noWrap title={`On the shelf: ${l.available_text}${l.returned_text ? ` · already returned: ${l.returned_text}` : ""}`}>
              {l.returned_text ? `${l.returned_text} back` : `${l.available_text} on shelf`}
            </Typography>
          )}
        </Box>
      ),
      qty: (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
          <PlainInput
            width={50}
            value={qty}
            inputMode="numeric"
            placeholder="0"
            disabled={nothing && !on}
            ariaLabel={`Return quantity for ${l.medicine} batch ${l.batch_number}`}
            onChange={(v) => setLine(l, { quantity: v.replace(/[^\d]/g, "").slice(0, 6) })}
            error={flag(/left in batch|brought in|enter how many/i)}
          />
          {l.units_per_pack > 1 ? (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PlainSelect
                value={unit}
                ariaLabel="Unit"
                onChange={(v) => setLine(l, { unit: v })}
                options={[
                  { value: "strip", label: plural(l.pack_word, 2) },
                  { value: "tablet", label: "tablets" },
                ]}
              />
            </Box>
          ) : (
            <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
              {plural(l.pack_word, 2)}
            </Typography>
          )}
        </Stack>
      ),
      why: (
        <PlainSelect
          value={c?.reason ?? l.suggested_reason ?? ""}
          ariaLabel="Why it goes back"
          placeholder="Why?"
          error={on && flag(/why it goes back|reason/i)}
          onChange={(v) => setLine(l, { reason: v })}
          options={REASONS}
        />
      ),
      rate: (
        <Tooltip title={`Rate per ${l.pack_word} before GST — ${l.rate_from === "bill" ? `what you paid on ${l.purchase_number}` : "the batch's purchase price"} (₹${inr(l.rate)})`}>
          <Box>
            <PlainInput
              value={c ? c.rate : Number(l.rate).toFixed(2)}
              ariaLabel={`Rate per ${l.pack_word}`}
              onChange={(v) => setLine(l, { rate: v.replace(/[^\d.]/g, "").slice(0, 10) })}
              error={on && flag(/rate|credit can't be more/i)}
            />
          </Box>
        </Tooltip>
      ),
      gst: (
        <PlainInput
          value={c ? c.gst : String(l.gst_percentage)}
          ariaLabel="GST %"
          onChange={(v) => setLine(l, { gst: v.replace(/[^\d.]/g, "").slice(0, 5) })}
          error={on && flag(/GST/)}
        />
      ),
      amount: (
        <Typography sx={{ fontSize: 14, fontWeight: 800, textAlign: "right", ...nums, color: on ? "text.primary" : "text.disabled", px: 0.5 }} noWrap>
          {on ? `₹${inr(m.total)}` : "—"}
        </Typography>
      ),
    };

    const name = (
      <Box sx={{ minWidth: 0, pl: 0.5 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }} noWrap title={l.medicine}>
          {l.medicine}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
          {[l.manufacturer, l.units_per_pack > 1 ? `${cap(l.pack_word)} of ${l.units_per_pack}` : `1 ${l.pack_word}`, l.purchase_number].filter(Boolean).join(" | ")}
        </Typography>
      </Box>
    );

    return (
      <Box
        key={k}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          boxShadow: on ? `inset 3px 0 0 ${issues?.problems.length ? theme.palette.error.main : theme.palette.primary.main}` : "none",
          bgcolor: on ? alpha(theme.palette.primary.main, 0.035) : "transparent",
          opacity: nothing && !on ? 0.55 : 1,
          "&:hover": { bgcolor: on ? alpha(theme.palette.primary.main, 0.05) : "action.hover" },
        }}
      >
        {wide ? (
          <Box sx={{ display: "grid", gridTemplateColumns: LINE_COLS, columnGap: "6px", alignItems: "center", px: 2, py: 0.8, minHeight: 50 }}>
            {name}
            {cells.batch}
            {cells.exp}
            {cells.can}
            {cells.qty}
            {cells.why}
            {cells.rate}
            {cells.gst}
            {cells.amount}
          </Box>
        ) : (
          <Box sx={{ px: 2, py: 1.1 }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Box sx={{ flex: 1, minWidth: 0 }}>{name}</Box>
              {cells.amount}
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", columnGap: 1.25, rowGap: 0.75, mt: 0.75, pl: 0.5 }}>
              {[
                ["Batch", cells.batch],
                ["Exp.", cells.exp],
                ["Can return", cells.can],
                ["Return", cells.qty, 2],
                ["Why", cells.why, 2],
                [`Rate / ${l.pack_word}`, cells.rate],
                ["GST%", cells.gst],
              ].map(([t, node, span]) => (
                <Box key={t} sx={{ minWidth: 0, ...(span ? { gridColumn: `span ${span}` } : null) }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: "text.secondary", px: 0.5 }}>{t}</Typography>
                  {node}
                </Box>
              ))}
            </Box>
          </Box>
        )}
        {on && issues && (issues.problems.length > 0 || issues.warnings.length > 0) && (
          <Stack spacing={0.4} sx={{ px: 2.5, pb: 1 }}>
            {issues.problems.map((p, i) => (
              <Stack key={`p${i}`} direction="row" spacing={0.5} alignItems="flex-start">
                <PriorityHighRoundedIcon sx={{ fontSize: 15, color: "error.main", mt: "1px" }} />
                <Typography sx={{ fontSize: 12.5, color: "error.main", fontWeight: 500 }}>{p.replace(/^Line \d+: /, "")}</Typography>
              </Stack>
            ))}
            {issues.warnings.map((w, i) => (
              <Typography key={`w${i}`} sx={{ fontSize: 12, color: "warning.dark" }}>
                {w}
              </Typography>
            ))}
          </Stack>
        )}
      </Box>
    );
  };

  /* ---------- the page ---------- */
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* header */}
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.25, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
        <IconButton onClick={onBack} aria-label="Back to returns">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700 }} noWrap>
            New return to supplier
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
            {picked
              ? mode === "order"
                ? `${picked.purchase_number}${picked.supplier_name ? ` · ${picked.supplier_name}` : ""}${picked.invoice_number ? ` · inv. ${picked.invoice_number}` : ""}`
                : picked.supplier_name
              : "Pick the order the stock came in on, or the supplier"}
          </Typography>
        </Box>
        {br.multi && br.isAdmin && <BranchPicker state={br} label="Return from" sx={{ minWidth: { xs: 140, sm: 200 } }} />}
      </Stack>

      {/* where it came from */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ md: "center" }} sx={{ px: { xs: 2, md: 3 }, py: 1.25, flexShrink: 0, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && switchMode(v)} sx={{ flexShrink: 0, "& .MuiToggleButton-root": { textTransform: "none", px: 1.75, py: 0.75, gap: 0.75 } }}>
          <ToggleButton value="order">
            <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} /> Against an order
          </ToggleButton>
          <ToggleButton value="supplier">
            <StorefrontOutlinedIcon sx={{ fontSize: 18 }} /> From supplier stock
          </ToggleButton>
        </ToggleButtonGroup>
        {mode === "order" ? (
          <Autocomplete
            size="small"
            options={orders}
            value={order}
            onChange={(_, v) => pick(v)}
            onInputChange={(_, v, reason) => reason === "input" && setOrdersQ(v)}
            filterOptions={(x) => x}
            getOptionLabel={(o) => o.purchase_number || ""}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderOption={(props, o) => (
              <li {...props} key={o.id}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                    {o.purchase_number}
                    {o.invoice_number ? (
                      <Box component="span" sx={{ fontWeight: 500, color: "text.secondary" }}>
                        {" "}· inv. {o.invoice_number}
                      </Box>
                    ) : null}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    {o.supplier_name} · {fmtDate(o.purchase_date)} · ₹{inr(o.grand_total)}
                    {o.returned_value > 0 ? ` · ₹${inr(o.returned_value)} returned` : ""}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(p) => <TextField {...p} placeholder="Received order — number, invoice or supplier" sx={{ "& .MuiInputBase-root": { borderRadius: 2 } }} />}
            sx={{ flex: 1, minWidth: 0, maxWidth: { md: 460 } }}
            noOptionsText="No received orders match"
          />
        ) : (
          <>
            <Autocomplete
              size="small"
              options={suppliers}
              value={supplier}
              onChange={(_, v) => pick(v)}
              getOptionLabel={(o) => o.supplier_name || ""}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderOption={(props, o) => (
                <li {...props} key={o.id}>
                  <Box>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{o.supplier_name}</Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      You owe ₹{inr(o.due)}
                      {o.open_credit > 0 ? ` · ₹${inr(o.open_credit)} credit open` : ""}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(p) => <TextField {...p} placeholder="Supplier" sx={{ "& .MuiInputBase-root": { borderRadius: 2 } }} />}
              sx={{ width: { xs: "100%", md: 280 } }}
            />
            {supplier && (
              <>
                <TextField
                  size="small"
                  placeholder="Medicine, code or batch"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ flex: 1, minWidth: 0, "& .MuiInputBase-root": { borderRadius: 2 } }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
                <Chip
                  label="Expired / expiring only"
                  clickable
                  color={expiringOnly ? "warning" : "default"}
                  variant={expiringOnly ? "filled" : "outlined"}
                  icon={expiringOnly ? <CheckRoundedIcon /> : undefined}
                  onClick={() => setExpiringOnly((v) => !v)}
                  sx={{ flexShrink: 0, fontWeight: 600 }}
                />
              </>
            )}
          </>
        )}
      </Stack>

      {source.loading && <LinearProgress sx={{ height: 2, flexShrink: 0 }} />}

      {/* the lines */}
      <Box ref={listRef} sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", bgcolor: "background.paper" }}>
        {needBranch ? (
          <EmptyState icon={StorefrontOutlinedIcon} title="Choose the branch first">
            Stock goes back from one branch. Pick it at the top right.
          </EmptyState>
        ) : !picked ? (
          <EmptyState icon={AssignmentReturnOutlinedIcon} title={mode === "order" ? "Which order did it come in on?" : "Which supplier does it go back to?"}>
            {mode === "order"
              ? "Pick the received order — its batches are listed with how much can go back."
              : "Pick the supplier — every batch of theirs in your stock is listed, expired and expiring first."}
          </EmptyState>
        ) : source.error ? (
          <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>
            {source.error}
          </Alert>
        ) : source.data && !shownLines.length && !chosenNotShown.length ? (
          <EmptyState icon={Inventory2OutlinedIcon} title="Nothing to return here">
            {mode === "order"
              ? `None of ${picked.purchase_number}'s batches are in stock${source.data.branch ? ` in ${source.data.branch}` : ""} any more.`
              : search || expiringOnly
                ? "No batches match — clear the search or the expiring filter."
                : `No stock from ${picked.supplier_name} is left${source.data.branch ? ` in ${source.data.branch}` : ""}.`}
          </EmptyState>
        ) : (
          <>
            {wide && (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: LINE_COLS,
                  columnGap: "6px",
                  px: 2,
                  py: 0.9,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  bgcolor: "background.paper",
                  borderBottom: 1.5,
                  borderColor: "divider",
                  "& > *": { fontSize: 11.5, fontWeight: 700, color: "text.secondary", px: 0.5 },
                }}
              >
                <span>Item Name</span>
                <span>Batch</span>
                <span>Exp.</span>
                <Tooltip title="On the shelf in this branch — and no more than the order brought in, less what already went back">
                  <span>Can return</span>
                </Tooltip>
                <span>Return</span>
                <span>Why</span>
                <Tooltip title="Rate per pack before GST — what you paid on the bill (discount and scheme already off). Change it if the supplier credits a different rate.">
                  <Box component="span" sx={{ textAlign: "right" }}>Rate</Box>
                </Tooltip>
                <Box component="span" sx={{ textAlign: "right" }}>GST%</Box>
                <Box component="span" sx={{ textAlign: "right" }}>Amount</Box>
              </Box>
            )}
            {source.data?.not_in_branch?.length > 0 && (
              <Alert severity="info" sx={{ borderRadius: 0 }}>
                Not in this branch: batch {source.data.not_in_branch.join(", ")}.
              </Alert>
            )}
            {chosenNotShown.map((c, i) => renderLine(c.line, i))}
            {shownLines.map((l, i) => renderLine(l, i))}
          </>
        )}
      </Box>

      {/* the bar */}
      <Box sx={{ flexShrink: 0, px: { xs: 2, md: 3 }, py: 1.25, borderTop: 1, borderColor: "divider", bgcolor: "background.paper", display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary" }}>
            {lines.length ? `${lines.length} ${plural("line", lines.length)} · ${totals.tablets.toLocaleString("en-IN")} ${plural("unit", totals.tablets)} out of stock` : "Nothing chosen yet"}
          </Typography>
          <Typography sx={{ fontSize: { xs: 19, md: 21 }, fontWeight: 700, ...nums, lineHeight: 1.15 }}>₹{inr(totals.total)}</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Typography role="status" sx={{ fontSize: 12.5, fontWeight: 600, color: problems.length ? "error.main" : "text.secondary", maxWidth: { xs: "100%", sm: 360 }, display: "flex", gap: 0.5, alignItems: "center" }}>
          {lines.length > 0 && (stale ? "Checking…" : problems.length ? `${problems.length} ${plural("thing", problems.length)} to fix on the lines` : <><CheckRoundedIcon sx={{ fontSize: 16, color: "success.main" }} /> Ready to return</>)}
        </Typography>
        <Button
          variant="contained"
          disableElevation
          size="large"
          disabled={!canReview}
          onClick={() => {
            setSaveError("");
            setConfirmOpen(true);
          }}
          startIcon={<AssignmentReturnOutlinedIcon />}
          sx={{ ...buttonSx, fontSize: 15, px: { xs: 2.5, md: 3.5 }, width: { xs: "100%", sm: "auto" } }}
        >
          Review return
        </Button>
      </Box>

      {/* review + confirm */}
      <Dialog open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} maxWidth={false} fullWidth fullScreen={phone} PaperProps={{ sx: { maxWidth: 940, borderRadius: phone ? 0 : 3 } }} aria-labelledby="pr-confirm-title">
        <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ px: 3, pt: 2.25, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id="pr-confirm-title" component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>
              Return this stock?
            </Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }} noWrap>
              To <b>{preview?.supplier?.supplier_name || picked?.supplier_name || "the supplier"}</b>
              {preview?.purchase_number ? ` · against ${preview.purchase_number}` : ""}
              {preview?.branch ? ` · from ${preview.branch}` : ""}
            </Typography>
          </Box>
          <IconButton aria-label="Close" onClick={() => setConfirmOpen(false)} disabled={saving} sx={{ mt: -0.5, mr: -1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
        <DialogContent sx={{ px: 3, py: 2.25 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 360px" },
              gridTemplateAreas: { xs: '"lines" "money" "settle"', md: '"lines money" "settle money"' },
              gridTemplateRows: { md: "auto 1fr" },
              columnGap: 3,
              rowGap: 2,
              alignItems: "start",
            }}
          >
            <Box sx={{ gridArea: "lines", minWidth: 0 }}>
              <Typography sx={{ ...labelSx, mb: 1 }}>GOING BACK</Typography>
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
                {(preview?.lines || []).slice(0, 6).map((pl, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="baseline" sx={{ px: 1.5, py: 0.8, borderTop: i ? 1 : 0, borderColor: "divider" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap>
                        {pl.medicine}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                        {pl.batch_number} · {pl.reason_label}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, ...nums, whiteSpace: "nowrap" }}>{pl.tablets_text}</Typography>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, ...nums, width: 84, textAlign: "right" }}>₹{inr(pl.total_amount)}</Typography>
                  </Stack>
                ))}
                {(preview?.lines || []).length > 6 && (
                  <Typography sx={{ px: 1.5, py: 0.8, fontSize: 12.5, color: "text.secondary", borderTop: 1, borderColor: "divider" }}>
                    + {preview.lines.length - 6} more {plural("line", preview.lines.length - 6)}
                  </Typography>
                )}
              </Box>
              {preview?.warnings?.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1, borderRadius: 2, fontSize: 12.5 }}>
                  {preview.warnings.join(" ")}
                </Alert>
              )}
            </Box>

            <Box sx={{ gridArea: "settle", minWidth: 0 }}>
              <Typography sx={{ ...labelSx, mb: 1 }}>SETTLEMENT</Typography>
              <ToggleButtonGroup exclusive fullWidth size="small" color="primary" value={settlement} onChange={(_, v) => v && setSettlement(v)} sx={{ "& .MuiToggleButton-root": { textTransform: "none", py: 0.75 } }}>
                <ToggleButton value="debit_note">Debit note (credit)</ToggleButton>
                <ToggleButton value="refund">Refund received</ToggleButton>
              </ToggleButtonGroup>
              {settlement === "debit_note" ? (
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 1 }}>
                  The value comes off what you owe {preview?.supplier?.supplier_name || "the supplier"} — the order it came in on first, then their other unpaid orders, oldest first. Anything left stays as open credit.
                </Typography>
              ) : (
                <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                  <Box role="radiogroup" aria-label="Refunded by" sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {REFUND_METHODS.map((m) => (
                      <Chip
                        key={m.value}
                        role="radio"
                        aria-checked={refundMethod === m.value}
                        label={m.label}
                        clickable
                        icon={refundMethod === m.value ? <CheckRoundedIcon sx={{ fontSize: 16 }} /> : undefined}
                        color={refundMethod === m.value ? "primary" : "default"}
                        variant={refundMethod === m.value ? "filled" : "outlined"}
                        onClick={() => setRefundMethod(m.value)}
                        sx={{ height: 32 }}
                      />
                    ))}
                  </Box>
                  {refundMethod && refundMethod !== "cash" && (
                    <TextField size="small" label="Reference (optional)" value={refundRef} onChange={(e) => setRefundRef(e.target.value)} placeholder="UTR / UPI ref / cheque no." />
                  )}
                </Stack>
              )}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 1.75 }}>
                <TextField size="small" type="date" label="Return date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ max: today() }} sx={{ width: { sm: 170 } }} />
                <TextField size="small" label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. picked up by the rep, Ravi" sx={{ flex: 1 }} />
              </Stack>
            </Box>

            <Box sx={{ gridArea: "money", minWidth: 0 }}>
              <MoneyCard title={settlement === "refund" ? "Refund due" : "Debit note"} total={preview?.totals?.total_amount ?? totals.total} taxable={preview?.totals?.taxable ?? totals.taxable} tax={preview?.totals?.tax_amount ?? totals.tax} busy={stale}>
                {settlement === "debit_note" ? (
                  <Stack spacing={0.5}>
                    <Typography sx={{ ...labelSx, pt: 0.5 }}>WHERE THE CREDIT GOES</Typography>
                    {(preview?.set_off || []).map((p) => (
                      <Stack key={p.purchase_id} direction="row" justifyContent="space-between" spacing={1}>
                        <Typography sx={{ fontSize: 13 }} noWrap>
                          Off {p.purchase_number}
                          <Box component="span" sx={{ color: "text.secondary" }}> (owed ₹{inr(p.due)})</Box>
                        </Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, ...nums }}>₹{inr(p.apply)}</Typography>
                      </Stack>
                    ))}
                    {preview?.open_credit > 0 && (
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography sx={{ fontSize: 13, color: "warning.dark" }}>Open credit with the supplier</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "warning.dark", ...nums }}>₹{inr(preview.open_credit)}</Typography>
                      </Stack>
                    )}
                    {!preview?.set_off?.length && !(preview?.open_credit > 0) && <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>—</Typography>}
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", pt: 0.5 }}>
                    Recorded as money back from the supplier. What you owe on their orders doesn&apos;t change.
                  </Typography>
                )}
              </MoneyCard>
              {saveError && (
                <Alert severity="error" sx={{ mt: 1.25, borderRadius: 2 }}>
                  {saveError}
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.75, borderTop: 1, borderColor: "divider", gap: 1, flexWrap: { xs: "wrap", sm: "nowrap" } }}>
          <Typography sx={{ fontSize: 11.5, color: "text.secondary", display: "flex", gap: 0.75, flex: { xs: "1 1 100%", sm: 1 }, order: { xs: 3, sm: 0 } }}>
            <InfoOutlinedIcon sx={{ fontSize: 15, mt: "1px", flexShrink: 0 }} />
            The stock leaves your shelf now. A mistake is undone by cancelling the return.
          </Typography>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving} sx={{ ...buttonSx, ml: { xs: "auto !important", sm: 0 } }}>
            Not yet
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={save}
            disabled={saving || stale || !preview?.can_return || refundMissing}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckRoundedIcon />}
            sx={{ ...buttonSx, px: 2.5 }}
          >
            {saving ? "Returning…" : refundMissing ? "Choose how it was refunded" : `Return stock · ₹${inr(preview?.totals?.total_amount ?? totals.total)}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* leaving with lines chosen */}
      <Dialog open={!!leave} onClose={() => setLeave(null)} maxWidth="xs" fullWidth>
        <DialogContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.75 }}>Leave this return?</Typography>
          <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>
            {lines.length} {plural("line", lines.length)} chosen. Nothing has been returned yet — leaving drops them.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeave(null)} sx={buttonSx}>
            Stay here
          </Button>
          <Button color="error" onClick={() => leave.proceed()} sx={buttonSx}>
            Leave
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* ONE RETURN                                                          */
/* ------------------------------------------------------------------ */
const DETAIL_COLS = "minmax(150px, 1.6fr) 76px 50px 96px 64px 80px 46px 88px";

function ReturnDetail({ id, onBack, onChanged, canCreate, canEdit }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const narrow = useMediaQuery(theme.breakpoints.down("md"));
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [busy, setBusy] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelWhy, setCancelWhy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    http
      .get(`${API}/get/return/${id}`)
      .then((r) => alive && setState({ loading: false, data: r.data.data, error: "" }))
      .catch(async (e) => {
        const msg = await apiMessage(e, "Couldn't open the return");
        if (alive) setState({ loading: false, data: null, error: msg });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const d = state.data;

  const pdf = async () => {
    setBusy("pdf");
    setErr("");
    try {
      const r = await http.get(`${API}/pdf/return/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${d.return_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      setErr(await apiMessage(e, "Couldn't make the debit note"));
    } finally {
      setBusy("");
    }
  };
  const applyCredit = async () => {
    setBusy("apply");
    setErr("");
    try {
      const r = await http.post(`${API}/apply/credit/${id}`);
      setState({ loading: false, data: r.data.data, error: "" });
      onChanged(r.data.message);
    } catch (e) {
      setErr(await apiMessage(e, "Couldn't apply the credit"));
    } finally {
      setBusy("");
    }
  };
  const cancel = async () => {
    setBusy("cancel");
    setErr("");
    try {
      const r = await http.patch(`${API}/cancel/return/${id}`, { reason: cancelWhy.trim() });
      setCancelOpen(false);
      setCancelWhy("");
      setState({ loading: false, data: r.data.data, error: "" });
      onChanged(r.data.message);
    } catch (e) {
      setErr(await apiMessage(e, "Couldn't cancel the return"));
    } finally {
      setBusy("");
    }
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.25, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
        <IconButton onClick={onBack} aria-label="Back to returns">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700 }} noWrap>
              {d ? d.return_number : "Return"}
            </Typography>
            {d && <StatusTag status={d.status} />}
          </Stack>
          {d && (
            <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
              {d.supplier.supplier_name} · {fmtDate(d.return_date)}
              {d.purchase_number ? ` · against ${d.purchase_number}` : ""}
              {d.branch ? ` · ${d.branch}` : ""}
            </Typography>
          )}
        </Box>
      </Stack>

      {state.loading && <LinearProgress sx={{ height: 2, flexShrink: 0 }} />}
      {err && (
        <Alert severity="error" onClose={() => setErr("")} sx={{ borderRadius: 0, flexShrink: 0 }}>
          {err}
        </Alert>
      )}

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
        {state.error ? (
          <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>
            {state.error}
          </Alert>
        ) : !d ? (
          <Stack spacing={1} sx={{ p: 3 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={44} />
            ))}
          </Stack>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 360px" },
              gap: { xs: 2, md: 2.5 },
              p: { xs: 2, md: 3 },
              alignItems: "start",
            }}
          >
            {/* lines */}
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden", minWidth: 0 }}>
              {!narrow && (
                <Box sx={{ display: "grid", gridTemplateColumns: DETAIL_COLS, columnGap: 1, px: 2, py: 1, borderBottom: 1.5, borderColor: "divider", "& > *": { fontSize: 11.5, fontWeight: 700, color: "text.secondary" } }}>
                  <span>Item Name</span>
                  <span>Batch</span>
                  <span>Exp.</span>
                  <Box component="span" sx={{ textAlign: "right" }}>Qty</Box>
                  <Box component="span" sx={{ textAlign: "right" }}>Rate</Box>
                  <Box component="span" sx={{ textAlign: "right" }}>Taxable</Box>
                  <Box component="span" sx={{ textAlign: "right" }}>GST%</Box>
                  <Box component="span" sx={{ textAlign: "right" }}>Amount</Box>
                </Box>
              )}
              {d.lines.map((l, i) =>
                narrow ? (
                  <Box key={l.id} sx={{ px: 2, py: 1.25, borderTop: i ? 1 : 0, borderColor: "divider" }}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, minWidth: 0 }} noWrap>
                        {l.medicine}
                      </Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 800, ...nums }}>₹{inr(l.total_amount)}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                      {l.batch_number} · exp {fmtExp(l.expiry_date)} · {l.tablets_text} · {l.reason_label}
                    </Typography>
                  </Box>
                ) : (
                  <Box key={l.id} sx={{ display: "grid", gridTemplateColumns: DETAIL_COLS, columnGap: 1, alignItems: "center", px: 2, py: 1, borderTop: i ? 1 : 0, borderColor: "divider" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700 }} noWrap title={l.medicine}>
                        {l.medicine}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                        {[l.reason_label, l.purchase_number].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{l.batch_number}</Typography>
                    <Typography sx={{ fontSize: 13, ...nums }}>{fmtExp(l.expiry_date)}</Typography>
                    <Typography sx={{ fontSize: 13, textAlign: "right", ...nums }} noWrap title={l.tablets_text}>{l.tablets_text}</Typography>
                    <Typography sx={{ fontSize: 13, textAlign: "right", ...nums }}>{inr(l.rate)}</Typography>
                    <Typography sx={{ fontSize: 13, textAlign: "right", ...nums }}>₹{inr(l.taxable)}</Typography>
                    <Typography sx={{ fontSize: 13, textAlign: "right", ...nums }}>{l.gst_percentage}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, textAlign: "right", ...nums }}>₹{inr(l.total_amount)}</Typography>
                  </Box>
                )
              )}
              {d.notes && (
                <Box sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}>
                  <Typography sx={{ ...labelSx, mb: 0.25 }}>NOTES</Typography>
                  <Typography sx={{ fontSize: 13, whiteSpace: "pre-line" }}>{d.notes}</Typography>
                </Box>
              )}
            </Paper>

            {/* money */}
            <Stack spacing={1.5} sx={{ minWidth: 0 }}>
              <MoneyCard title={d.settlement === "refund" ? "Refund" : "Debit note"} total={d.total_amount} taxable={d.taxable} tax={d.tax_amount}>
                {d.status === "cancelled" ? (
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", pt: 0.5 }}>Cancelled — the stock went back on the shelf and no credit applies.</Typography>
                ) : d.settlement === "refund" ? (
                  <Typography sx={{ fontSize: 13, pt: 0.5 }}>
                    Refunded by <b>{d.refund_method_label || "—"}</b>
                    {d.refund_reference ? ` · ref. ${d.refund_reference}` : ""}
                  </Typography>
                ) : (
                  <Stack spacing={0.5} sx={{ pt: 0.5 }}>
                    <Typography sx={labelSx}>SET OFF AGAINST</Typography>
                    {d.set_offs.length ? (
                      d.set_offs.map((p) => (
                        <Stack key={p.id} direction="row" justifyContent="space-between" spacing={1}>
                          <Typography sx={{ fontSize: 13 }} noWrap>
                            {p.purchase_number}
                            <Box component="span" sx={{ color: "text.secondary" }}> · {p.payment_number}</Box>
                          </Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, ...nums }}>₹{inr(p.amount)}</Typography>
                        </Stack>
                      ))
                    ) : (
                      <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>Nothing yet.</Typography>
                    )}
                    {d.open_credit > 0 && (
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography sx={{ fontSize: 13, color: "warning.dark", fontWeight: 600 }}>Open credit</Typography>
                        <Typography sx={{ fontSize: 13, color: "warning.dark", fontWeight: 800, ...nums }}>₹{inr(d.open_credit)}</Typography>
                      </Stack>
                    )}
                  </Stack>
                )}
              </MoneyCard>

              <Paper variant="outlined" sx={{ borderRadius: 2.5, p: 1.5 }}>
                <Typography sx={{ ...labelSx, mb: 0.5 }}>SUPPLIER</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{d.supplier.supplier_name}</Typography>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                  {[d.supplier.gst_number && `GSTIN ${d.supplier.gst_number}`, d.supplier.phone].filter(Boolean).join(" · ") || "—"}
                </Typography>
                {d.purchase_number && (
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
                    Against {d.purchase_number}
                    {d.invoice_number ? ` · inv. ${d.invoice_number}` : ""}
                  </Typography>
                )}
              </Paper>
            </Stack>
          </Box>
        )}
      </Box>

      {d && (
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, px: { xs: 2, md: 3 }, py: 1.25, borderTop: 1, borderColor: "divider", bgcolor: "background.paper", flexWrap: "wrap", rowGap: 1 }}>
          <Button variant="outlined" startIcon={busy === "pdf" ? <CircularProgress size={16} /> : <DownloadOutlinedIcon />} disabled={!!busy} onClick={pdf} sx={buttonSx}>
            {d.settlement === "refund" ? "Return note (PDF)" : "Debit note (PDF)"}
          </Button>
          <Box sx={{ flex: 1 }} />
          {canEdit && d.status === "completed" && (
            <Button color="error" startIcon={<UndoRoundedIcon />} disabled={!!busy} onClick={() => setCancelOpen(true)} sx={buttonSx}>
              Cancel return
            </Button>
          )}
          {canCreate && d.open_credit > 0 && (
            <Tooltip title="Set the open credit off against this supplier's unpaid orders, oldest first">
              <span>
                <Button variant="contained" disableElevation startIcon={busy === "apply" ? <CircularProgress size={16} color="inherit" /> : <CheckRoundedIcon />} disabled={!!busy} onClick={applyCredit} sx={buttonSx}>
                  Apply ₹{inr(d.open_credit)} credit
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      )}

      <Dialog open={cancelOpen} onClose={() => !busy && setCancelOpen(false)} maxWidth="xs" fullWidth fullScreen={phone}>
        <DialogContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.75 }}>Cancel {d?.return_number}?</Typography>
          <Typography sx={{ fontSize: 13.5, color: "text.secondary", mb: 1.5 }}>
            The stock goes back on the shelf
            {d?.set_offs?.length ? `, and the ₹${inr(d.credit_applied)} set off against ${d.set_offs.map((p) => p.purchase_number).join(", ")} is taken back — those orders will owe it again` : ""}.
          </Typography>
          <TextField autoFocus fullWidth multiline minRows={2} size="small" label="Why?" value={cancelWhy} onChange={(e) => setCancelWhy(e.target.value)} placeholder="e.g. supplier refused the return" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={busy === "cancel"} sx={buttonSx}>
            Keep it
          </Button>
          <Button color="error" variant="contained" disableElevation disabled={!cancelWhy.trim() || busy === "cancel"} onClick={cancel} sx={buttonSx}>
            {busy === "cancel" ? "Cancelling…" : "Cancel return"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* THE PAGE                                                            */
/* ------------------------------------------------------------------ */
function PurchaseReturnsPage() {
  const [shellRef, shellHeight] = useFitsWindow(SHELL_HEIGHT);
  const { loading: accessLoading, can } = useAccess();
  const canView = can(PERM.view);
  const canCreate = can(PERM.create);
  const canEdit = can(PERM.edit);
  const br = usePharmacyBranch({ allowAll: false });
  const branchParams = useMemo(() => (br.isAdmin && br.branch ? { branch: br.branch } : {}), [br.isAdmin, br.branch]);

  // "Return to supplier" on an order opens a new return against it
  const [view, setView] = useState(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(RETURN_PRESELECT_KEY) || "null");
      if (v && v.id) {
        sessionStorage.removeItem(RETURN_PRESELECT_KEY);
        return { mode: "new", preselect: v };
      }
    } catch {
      /* private mode */
    }
    return { mode: "list" };
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState(null);

  const onOpen = useCallback((id) => setView({ mode: "detail", id }), []);

  if (!accessLoading && !canView) {
    return (
      <Box sx={{ height: shellHeight, display: "flex", overflow: "hidden", bgcolor: "background.default" }}>
        <AccessDenied what="purchase returns" />
      </Box>
    );
  }

  let body;
  if (view.mode === "new" && canCreate) {
    body = (
      <NewReturn
        preselect={view.preselect}
        br={br}
        onBack={() => setView({ mode: "list" })}
        onSaved={(ret, message) => {
          setReloadKey((k) => k + 1);
          setToast(message || `${ret.return_number} saved`);
          setView({ mode: "detail", id: ret.id });
        }}
      />
    );
  } else if (view.mode === "detail") {
    body = (
      <ReturnDetail
        key={view.id}
        id={view.id}
        canCreate={canCreate}
        canEdit={canEdit}
        onBack={() => setView({ mode: "list" })}
        onChanged={(message) => {
          setReloadKey((k) => k + 1);
          if (message) setToast(message);
        }}
      />
    );
  } else {
    body = (
      <>
        <Box sx={{ flexShrink: 0, px: { xs: 2, md: 3 }, py: { xs: 1.25, md: 1.5 }, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700, letterSpacing: "-0.01em" }} noWrap>
              Purchase returns
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary", display: { xs: "none", md: "block" } }} noWrap>
              Stock sent back to suppliers — against a debit note or a refund
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            {br.multi && br.isAdmin && <BranchPicker state={br} label="Branch" sx={{ minWidth: 170 }} />}
            {canCreate && (
              <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={() => setView({ mode: "new" })} sx={buttonSx}>
                New return
              </Button>
            )}
          </Stack>
        </Box>
        <ReturnList reloadKey={reloadKey} onOpen={onOpen} onNew={() => setView({ mode: "new" })} canCreate={canCreate} branchParams={branchParams} />
      </>
    );
  }

  return (
    <Box ref={shellRef} sx={{ height: shellHeight, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default" }}>
      {body}
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        {toast ? (
          <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2, maxWidth: 520 }}>
            {toast}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

/** The page, wrapped so it reads its colours from src/theme/appColors.js. */
export default function PurchaseReturns() {
  return (
    <ColorRoot>
      <PurchaseReturnsPage />
    </ColorRoot>
  );
}