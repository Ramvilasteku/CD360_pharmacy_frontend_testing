// src/components/pharmacy/sales/returns/SalesReturns.jsx
//
// Sales returns — find the bill, pick the items, choose a reason, refund.
//
// List
//   • Status tabs with live counts (Completed · Partly returned · Returned · Cancelled · All)
//   • Live search (sale # / customer), date presets, server-side paging and sorting
//   • Wide space: table that fits the screen — it scrolls inside its card, header and pagination stay put
//   • Narrow space (under 700px after your sidebar): cards (1 column phone, 2 tablet); no sideways scrolling
//
// Return flow (dialog on desktop, full screen on phones)
//   • Items as rows with − / + steppers and an "All" shortcut, returnable items first
//   • Each item says in words whether it can be returned (eligibility from the server)
//   • Reason as one-tap chips, optional note, override panel for past-window items
//   • Sticky footer with the live refund total and what's still missing
//   • Success screen with the refund amount and the receipt
//
// Business rules and the return payload are unchanged from the previous version.

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { usePermission } from "../../../Redux/store/hooks/usePermissions";
import { useElementWidth, useFitToScreen } from "../useFitToScreen";
import {
  Box, Stack, Paper, Typography, TextField, MenuItem, Menu, ListItemIcon, ListItemText,
  Button, IconButton, InputBase, InputAdornment, Link, Tabs, Tab, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, TableSortLabel, TablePagination, Pagination,
  LinearProgress, CircularProgress, Skeleton, Alert, Snackbar, Tooltip, Chip, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions, useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DownloadIcon from "@mui/icons-material/Download";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BlockIcon from "@mui/icons-material/Block";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

/* ───────────────────────────── constants ───────────────────────────── */

const API = process.env.REACT_APP_URL;

const STATUS_TABS = [
  { value: "completed", label: "Completed" },
  { value: "partially_returned", label: "Partly returned" },
  { value: "returned", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const SALE_STATUS = {
  completed: { label: "Completed", color: "success" },
  partially_returned: { label: "Partly returned", color: "warning" },
  returned: { label: "Returned", color: null },
  cancelled: { label: "Cancelled", color: null },
};

const PAYMENT_STATUS = {
  paid: { label: "Paid", color: "success" },
  partial: { label: "Partial", color: "warning" },
  unpaid: { label: "Unpaid", color: "error" },
};

const RETURN_STATUS = {
  completed: { label: "Completed", color: "success" },
  pending: { label: "Pending", color: "warning" },
  cancelled: { label: "Cancelled", color: null },
};

const REASONS = [
  { value: "unused", label: "Unused / customer request" },
  { value: "expired", label: "Expired" },
  { value: "damaged", label: "Damaged" },
  { value: "wrong_item", label: "Wrong medicine given" },
  { value: "other", label: "Other" },
];
const REASON_LABEL = Object.fromEntries(REASONS.map((r) => [r.value, r.label]));

const METHOD_LABEL = { cash: "Cash", upi: "UPI", card: "Card", bank_transfer: "Bank transfer" };

const COLUMNS = [
  { id: "sale_number", label: "Sale #", sortable: true },
  { id: "sale_date", label: "Date", sortable: true },
  { id: "customer_name", label: "Customer", sortable: true },
  { id: "grand_total", label: "Total", sortable: true, align: "right" },
  { id: "payment_status", label: "Payment", sortable: false },
  { id: "status", label: "Status", sortable: false },
  { id: "actions", label: "Actions", sortable: false, align: "right", hiddenLabel: true },
];

const DATE_RANGES = [
  { value: "all", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

const DEFAULT_QUERY = {
  search: "", status: "completed", from: "", to: "",
  page: 0, limit: 10, sortBy: "sale_date", sortDir: "desc",
};

const srOnly = {
  position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px",
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};
const numeric = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const btn = { borderRadius: "10px", textTransform: "none", fontWeight: 600 };

/* ───────────────────────────── helpers ───────────────────────────── */

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function rangeToDates(range) {
  const today = new Date();
  const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
  switch (range) {
    case "today": return { from: ymd(today), to: ymd(today) };
    case "yesterday": return { from: ymd(daysAgo(1)), to: ymd(daysAgo(1)) };
    case "7d": return { from: ymd(daysAgo(6)), to: ymd(today) };
    case "30d": return { from: ymd(daysAgo(29)), to: ymd(today) };
    case "month": return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) };
    case "lastMonth": return {
      from: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: ymd(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
    default: return { from: "", to: "" };
  }
}

// Accepts "2026-10-10", "2026-10-10 14:05:00" (MySQL — Safari can't parse the space) and ISO strings
function parseDate(value) {
  if (!value) return null;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(/^\d{4}-\d{2}-\d{2} /.test(s) ? s.replace(" ", "T") : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(d) {
  if (!d) return null;
  const t = new Date();
  const a = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((a - b) / 86400000));
}

function formatDay(value) {
  const d = parseDate(value);
  if (!d) return { day: "—", time: "", age: null };
  const age = daysSince(d);
  const day = age === 0 ? "Today" : age === 1 ? "Yesterday"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const hasTime = d.getHours() || d.getMinutes() || d.getSeconds();
  return { day, time: hasTime ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "", age };
}

const agoLabel = (n) => (n == null ? "" : n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);
const shortDate = (s) => parseDate(s)?.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) ?? "";
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function rangeLabel(range, from, to) {
  if (range !== "custom") return DATE_RANGES.find((r) => r.value === range)?.label ?? "";
  if (from && to) return from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;
  if (from) return `From ${shortDate(from)}`;
  if (to) return `Until ${shortDate(to)}`;
  return "Custom range";
}

const toneText = (theme, tone) => theme.palette[tone][theme.palette.mode === "dark" ? "light" : "dark"];

// Same rule as before for when an item's quantity can't be changed
const isQtyLocked = (item, canOverride) =>
  item.remaining_qty === 0 ||
  item.hard_block ||
  (!item.eligible && !item.can_override) ||
  (!item.eligible && item.can_override && !canOverride);

/* ─────────────────────────── small pieces ─────────────────────────── */

function Pill({ meta, value, outlined }) {
  const theme = useTheme();
  const m = meta[value];
  const main = m?.color ? theme.palette[m.color].main : theme.palette.text.secondary;
  const text = m?.color ? toneText(theme, m.color) : theme.palette.text.secondary;
  const label = m?.label || titleCase(value) || "—";
  return (
    <Box component="span" sx={{
      display: "inline-flex", alignItems: "center", gap: "6px", height: 24, px: "10px",
      borderRadius: "999px", fontSize: 12.5, fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap", color: text,
      ...(outlined
        ? { border: `1px solid ${alpha(main, 0.45)}` }
        : { bgcolor: alpha(main, theme.palette.mode === "dark" ? 0.2 : 0.12) }),
    }}>
      {!outlined && <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: main, flexShrink: 0 }} />}
      {label}
    </Box>
  );
}

function EmptyState({ filtered, onClear }) {
  const Icon = filtered ? SearchOffIcon : ReceiptLongOutlinedIcon;
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: { xs: 7, md: 9 }, px: 3, textAlign: "center" }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", mb: 1,
        bgcolor: "action.hover", color: "text.secondary",
      }}>
        <Icon />
      </Box>
      <Typography variant="subtitle1" fontWeight={700}>{filtered ? "No matching bills" : "No bills here"}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 340 }}>
        {filtered
          ? "Check the bill number or customer name, or widen the date range."
          : "Bills with this status will show up here."}
      </Typography>
      {filtered && <Button onClick={onClear} sx={{ mt: 1, ...btn }}>Clear filters</Button>}
    </Stack>
  );
}

function Metric({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div" noWrap>{label}</Typography>
      <Typography variant="body2" fontWeight={600} noWrap sx={numeric}>{children}</Typography>
    </Box>
  );
}

// Plain-words return policy for one item
function PolicyLine({ item, canOverride }) {
  const theme = useTheme();
  let Icon; let tone; let text;
  if (item.remaining_qty === 0) {
    Icon = CheckCircleOutlineIcon; tone = null; text = "Already returned in full";
  } else if (item.hard_block) {
    Icon = BlockIcon; tone = "error"; text = `Not returnable${item.policy_reason ? ` · ${item.policy_reason}` : ""}`;
  } else if (!item.eligible && item.can_override) {
    Icon = canOverride ? LockOpenIcon : LockOutlinedIcon; tone = "warning";
    text = `${item.policy_reason || "Past the return window"} · ${canOverride ? "you can override" : "needs a manager"}`;
  } else if (!item.eligible) {
    Icon = LockOutlinedIcon; tone = "error"; text = item.policy_reason || "Return window closed";
  } else {
    Icon = CheckCircleIcon; tone = "success"; text = "Returnable";
  }
  return (
    <Stack direction="row" spacing={0.5} alignItems="flex-start"
      sx={{ color: tone ? toneText(theme, tone) : "text.secondary", mt: 0.5 }}>
      <Icon sx={{ fontSize: 15, mt: "2px", flexShrink: 0 }} />
      <Typography variant="caption" sx={{ fontWeight: 500, lineHeight: 1.5 }}>{text}</Typography>
    </Stack>
  );
}

function QtyStepper({ value, max, disabled, onChange, name }) {
  return (
    <Stack direction="row" alignItems="center" sx={{
      border: 1, borderColor: value > 0 ? "primary.main" : "divider", borderRadius: "10px",
      bgcolor: "background.paper", overflow: "hidden", flexShrink: 0, opacity: disabled ? 0.5 : 1,
    }}>
      <IconButton aria-label={`One less ${name}`} disabled={disabled || value <= 0}
        onClick={() => onChange(value - 1)} sx={{ borderRadius: 0, width: 40, height: 40 }}>
        <RemoveIcon fontSize="small" />
      </IconButton>
      <InputBase
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        onFocus={(e) => e.target.select()}
        inputProps={{
          inputMode: "numeric", "aria-label": `Quantity of ${name} to return, up to ${max}`,
          style: { textAlign: "center", width: 40, padding: 0, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
        }}
      />
      <IconButton aria-label={`One more ${name}`} disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)} sx={{ borderRadius: 0, width: 40, height: 40 }}>
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

function ReturnItemRow({ item, idx, canOverride, onQty }) {
  const theme = useTheme();
  const locked = isQtyLocked(item, canOverride);
  const selected = item.return_quantity > 0;
  const max = item.remaining_qty ?? item.quantity;
  const lineRefund = Number(item.unit_price) * item.return_quantity;
  const expiry = parseDate(item.expiry_date);

  return (
    <Box sx={{
      display: "grid", alignItems: "center", gap: { xs: 1.25, sm: 2 }, p: { xs: 1.5, sm: 1.75 },
      gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto 96px" },
      borderRadius: "12px", border: 1,
      borderColor: selected ? "primary.main" : "divider",
      bgcolor: selected ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.04) : "background.paper",
      transition: "border-color .15s, background-color .15s",
    }}>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="baseline">
          <Typography variant="body2" fontWeight={700} sx={{
            color: item.hard_block ? "text.secondary" : "text.primary", overflowWrap: "anywhere",
          }}>
            {item.medicine_name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ...numeric, display: { sm: "none" } }}>
            {money(item.unit_price)} each
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" component="div">
          {[
            item.batch_number && `Batch ${item.batch_number}`,
            expiry && `Exp ${expiry.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}`,
            `Sold ${item.quantity}`,
            item.already_returned > 0 && `${item.already_returned} returned earlier`,
          ].filter(Boolean).join(" · ")}
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}> · {money(item.unit_price)} each</Box>
        </Typography>
        <PolicyLine item={item} canOverride={canOverride} />
      </Box>

      {locked ? (
        <Box sx={{ display: { xs: "none", sm: "block" } }} />
      ) : (
        <Stack direction="row" spacing={1} alignItems="center">
          <QtyStepper value={item.return_quantity} max={max} disabled={locked}
            name={item.medicine_name} onChange={(v) => onQty(idx, v)} />
          <Button size="small" onClick={() => onQty(idx, item.return_quantity === max ? 0 : max)}
            sx={{ ...btn, minWidth: 0, px: 1, whiteSpace: "nowrap" }}>
            {item.return_quantity === max ? "Clear" : `All ${max}`}
          </Button>
          <Typography sx={{ display: { xs: "block", sm: "none" }, ml: "auto !important", fontWeight: 700, ...numeric,
            color: selected ? "text.primary" : "text.disabled" }}>
            {money(lineRefund)}
          </Typography>
        </Stack>
      )}

      <Typography sx={{ display: { xs: "none", sm: "block" }, textAlign: "right", fontWeight: 700, ...numeric,
        color: selected ? "text.primary" : "text.disabled" }}>
        {locked ? "" : money(lineRefund)}
      </Typography>
    </Box>
  );
}

/* ───────────────────────────── main ───────────────────────────── */

export default function SalesReturns({ title = "Sales returns", branchParams = {} }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true }); // < 900px
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true }); // < 600px

  // Layout follows the space this screen really has (after any sidebar), not the window size
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const width = useElementWidth(rootRef);
  const compact = width == null ? isMobile : width < 700; // cards below 700px of space
  const showPayment = width == null ? !isMobile : width >= 1060; // drop the Payment column when space is tight
  const fitHeight = useFitToScreen(listRef, !isPhone); // list card ends at the bottom of the screen (not on phones)
  const visibleColumns = COLUMNS.filter((c) => c.id !== "payment_status" || showPayment);

  // Reading s.auth.permissions directly skipped the admin bypass, and buildUserAccess()
  // returns permissions: [] for every tenant admin — so an admin could not raise a return
  // on their own pharmacy. usePermission() bypasses on role === "admin", matching
  // middlewares/allowPermissions.js. See the fuller note in POS.js.
  //
  // Both keys only became grantable on 25 Oct: routes/Pharmacy/pharmacy_returns.js guards
  // on pharmacy.sales-returns.* but no such row existed in the permissions table, so every
  // staff request here was a hard 403. sql/2026-10-25_sales_medicines_permissions.sql adds
  // them. `.override` is still frontend-only — the server does not check it yet.
  const canOverride = usePermission("pharmacy.sales-returns.override");
  const canCreate = usePermission("pharmacy.sales-returns.create");

  /* ─────────── list state ─────────── */
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [range, setRange] = useState("all");
  const [dateAnchor, setDateAnchor] = useState(null);
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [loadingList, setLoadingList] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [listError, setListError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  /* ─────────── return dialog state (same shape as before) ─────────── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingSale, setLoadingSale] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [, setEligibilityMap] = useState({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [successDialog, setSuccessDialog] = useState({
    open: false, returnId: null, returnNumber: "", refundAmount: 0, customerName: "",
  });
  const [historyDialog, setHistoryDialog] = useState({ open: false, loading: false, sale: null, returns: [] });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") => setSnackbar({ open: true, message, severity });

  /* ─────────── list loading ─────────── */

  const update = useCallback((patch) => setQuery((q) => ({ ...q, page: 0, ...patch })), []);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === query.search) return;
    const t = setTimeout(() => update({ search: trimmed }), 400);
    return () => clearTimeout(t);
  }, [searchInput, query.search, update]);

  const dateRangeInvalid = Boolean(query.from && query.to && query.from > query.to);

  const filterParams = useCallback((q) => {
    const p = new URLSearchParams();
    if (q.search) p.set("search", q.search);
    if (q.from) p.set("start_date", q.from); // backend reads start_date / end_date
    if (q.to) p.set("end_date", q.to);
    return p;
  }, []);

  // Page of bills
  useEffect(() => {
    if (dateRangeInvalid) return;
    const controller = new AbortController();
    const params = filterParams(query);
    // Branch chosen in the Sales header; absent means every branch.
    if (branchParams.branch) params.set("branch", branchParams.branch);
    params.set("page", query.page + 1);
    params.set("limit", query.limit);
    params.set("sort_by", query.sortBy);
    params.set("sort_order", query.sortDir.toUpperCase());
    if (query.status !== "all") params.set("status", query.status);

    (async () => {
      setLoadingList(true);
      setListError("");
      try {
        const res = await axios.get(`${API}/api/pharmacy/sales?${params}`, { withCredentials: true, signal: controller.signal });
        const list = res.data.data || [];
        const count = res.data.total ?? res.data.pagination?.total ?? list.length;
        setSales(list);
        setTotal(count);
        setHasLoaded(true);
        if (list.length === 0 && count > 0 && query.page > 0) {
          setQuery((q) => ({ ...q, page: Math.max(0, Math.ceil(count / q.limit) - 1) }));
        }
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;
        setListError(err.response?.data?.message || "Couldn't load bills. Check your connection and try again.");
        setSales([]);
        setTotal(0);
        setHasLoaded(true);
      } finally {
        if (!controller.signal.aborted) setLoadingList(false);
      }
    })();
    return () => controller.abort();
    // branchParams.branch added 26 Oct 2026 — picking a branch now reloads the list.
  }, [query, dateRangeInvalid, reloadKey, filterParams, branchParams.branch]);

  // Tab counts (one tiny request per status; only re-run when search or dates change)
  const { search: qSearch, from: qFrom, to: qTo } = query;
  useEffect(() => {
    if (dateRangeInvalid) return;
    const controller = new AbortController();
    (async () => {
      try {
        const entries = await Promise.all(STATUS_TABS.map(async ({ value }) => {
          const p = filterParams({ search: qSearch, from: qFrom, to: qTo });
          p.set("page", 1);
          p.set("limit", 1);
          if (value !== "all") p.set("status", value);
          const res = await axios.get(`${API}/api/pharmacy/sales?${p}`, { withCredentials: true, signal: controller.signal });
          return [value, res.data.total ?? res.data.pagination?.total ?? null];
        }));
        setCounts(Object.fromEntries(entries));
      } catch (err) {
        if (!(axios.isCancel(err) || err.code === "ERR_CANCELED")) setCounts({});
      }
    })();
    return () => controller.abort();
  }, [qSearch, qFrom, qTo, dateRangeInvalid, reloadKey, filterParams]);

  const reload = () => setReloadKey((k) => k + 1);

  const selectRange = (value) => {
    setRange(value);
    setDateAnchor(null);
    if (value !== "custom") update(rangeToDates(value));
  };

  const hasActiveFilters = Boolean(query.search || query.from || query.to);
  const clearFilters = () => { setSearchInput(""); setRange("all"); update({ search: "", from: "", to: "" }); };
  const clearSearch = () => { setSearchInput(""); update({ search: "" }); };

  const handleSort = (columnId) => {
    const isAsc = query.sortBy === columnId && query.sortDir === "asc";
    update({ sortBy: columnId, sortDir: isAsc ? "desc" : "asc" });
  };

  const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const firstLoad = loadingList && sales.length === 0 && !listError;

  /* ─────────── return dialog ─────────── */

  const openReturnDialog = async (sale) => {
    setLoadingSale(true);
    setDialogOpen(true);
    setSubmitError("");
    try {
      // Fetch sale details and eligibility in parallel
      const [saleRes, eligRes] = await Promise.all([
        axios.get(`${API}/api/pharmacy/sales/${sale.id}`, { withCredentials: true }),
        axios.get(`${API}/api/sales/return/sale/${sale.id}/return-eligibility`, { withCredentials: true }),
      ]);
      const full = saleRes.data.data;
      const eligibility = eligRes.data.data || [];

      const eligMap = {};
      eligibility.forEach((e) => { eligMap[`${e.medicine_id}|${e.batch_id}`] = e; });

      setSelectedSale(full);
      setEligibilityMap(eligMap);
      setReturnItems((full.items || []).map((i) => {
        const elig = eligMap[`${i.medicine_id}|${i.batch_id}`] || {};
        return {
          ...i,
          return_quantity: 0,
          already_returned: elig.already_returned ?? i.already_returned ?? 0,
          remaining_qty: elig.remaining_qty ?? (i.remaining_qty != null
            ? i.remaining_qty
            : (i.quantity || 0) - (i.already_returned || 0)),
          eligible: elig.eligible ?? true,
          hard_block: !!elig.hard_block,
          can_override: !!elig.can_override,
          policy_reason: elig.reason || null,
          policy: elig.policy || null,
        };
      }));
      setReason("");
      setNotes("");
      setOverrideReason("");
    } catch (err) {
      showMessage(err.response?.data?.message || "Couldn't open this bill. Please try again.", "error");
      closeDialog(true);
    } finally {
      setLoadingSale(false);
    }
  };

  function closeDialog(force) {
    if (submitting && force !== true) return;
    setDialogOpen(false);
    setSelectedSale(null);
    setReturnItems([]);
    setEligibilityMap({});
    setReason("");
    setNotes("");
    setOverrideReason("");
    setSubmitError("");
  }

  const updateReturnQty = (idx, value) => {
    setReturnItems((prev) => {
      const next = [...prev];
      const max = next[idx].remaining_qty ?? next[idx].quantity;
      const qty = Math.max(0, Math.min(Number(value) || 0, max));
      next[idx] = { ...next[idx], return_quantity: qty };
      return next;
    });
  };

  const selectAllReturnable = () => setReturnItems((prev) => prev.map((i) =>
    (i.eligible && !i.hard_block && (i.remaining_qty ?? i.quantity) > 0)
      ? { ...i, return_quantity: i.remaining_qty ?? i.quantity } : i));
  const clearSelection = () => setReturnItems((prev) => prev.map((i) => ({ ...i, return_quantity: 0 })));

  const refundAmount = returnItems.reduce((sum, i) => sum + Number(i.unit_price) * i.return_quantity, 0);
  const selectedLines = returnItems.filter((i) => i.return_quantity > 0);
  const selectedUnits = selectedLines.reduce((n, i) => n + i.return_quantity, 0);

  const needsOverride = useMemo(() => returnItems.some(
    (i) => i.return_quantity > 0 && !i.eligible && !i.hard_block && i.can_override), [returnItems]);
  const hasHardBlockedWithQty = useMemo(() => returnItems.some(
    (i) => i.return_quantity > 0 && i.hard_block), [returnItems]);

  // Items you can act on first; locked ones grouped underneath (original index kept for updates)
  const indexed = returnItems.map((item, idx) => ({ item, idx }));
  const actionable = indexed.filter(({ item }) => !isQtyLocked(item, canOverride));
  const locked = indexed.filter(({ item }) => isQtyLocked(item, canOverride));
  const anyEligibleLeft = returnItems.some((i) => i.eligible && !i.hard_block && (i.remaining_qty ?? i.quantity) > 0);

  // What still stops the return, in plain words (null = ready) — tapping it jumps to that section
  const itemsRef = useRef(null);
  const reasonRef = useRef(null);
  const overrideRef = useRef(null);
  const overrideInputRef = useRef(null);
  const [blocker, blockerTarget] = selectedLines.length === 0 ? ["Choose the items to return", itemsRef]
    : !reason ? ["Pick a reason for the return", reasonRef]
      : hasHardBlockedWithQty ? ["Remove items that can't be returned", itemsRef]
        : needsOverride && !canOverride ? ["A manager must approve items past the return window", overrideRef]
          : needsOverride && !overrideReason.trim() ? ["Add a reason for the override", overrideRef]
            : [null, null];
  const goToBlocker = () => {
    blockerTarget?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (blockerTarget === overrideRef) setTimeout(() => overrideInputRef.current?.focus({ preventScroll: true }), 350);
  };

  const submitReturn = async () => {
    const itemsToReturn = returnItems.filter((i) => i.return_quantity > 0);
    if (itemsToReturn.length === 0) return setSubmitError("Enter a return quantity for at least one item.");
    if (!reason) return setSubmitError("Pick a reason for the return.");
    if (hasHardBlockedWithQty) return setSubmitError("Some items are non-returnable. Set their quantity to 0 to continue.");
    if (needsOverride) {
      if (!canOverride) return setSubmitError("Some items are past their return window. A manager needs to approve this return.");
      if (!overrideReason.trim()) return setSubmitError("Add a reason to override the return window.");
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const year = new Date().getFullYear();
      const return_number = `RET-${year}-${Date.now().toString().slice(-6)}`;

      const response = await axios.post(
        `${API}/api/sales/return/post/return`,
        {
          return_number,
          sale_id: selectedSale.id,
          patient_id: selectedSale.customer_id || null,
          return_date: new Date().toISOString().slice(0, 19).replace("T", " "),
          return_type: "customer_return",
          reason,
          total_amount: refundAmount,
          refund_amount: refundAmount,
          status: "completed",
          notes,
          override_reason: needsOverride ? overrideReason.trim() : null,
          items: itemsToReturn.map((i) => ({
            medicine_id: i.medicine_id,
            batch_id: i.batch_id,
            quantity: i.return_quantity,
            unit_price: i.unit_price,
            total_amount: i.unit_price * i.return_quantity,
            override_reason: !i.eligible && !i.hard_block && i.can_override ? overrideReason.trim() : undefined,
          })),
        },
        { withCredentials: true }
      );

      const customerName = selectedSale.customer_name?.trim() || "";
      closeDialog(true);
      setSuccessDialog({ open: true, returnId: response.data.return_id, returnNumber: return_number, refundAmount, customerName });
      reload();
    } catch (err) {
      setSubmitError(err.response?.data?.message || "The return wasn't saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─────────── receipts ─────────── */

  const downloadReceipt = (returnId) => {
    window.open(`${API}/api/sales/return/${returnId}/receipt/pdf`, "_blank");
  };

  const openReturnsHistory = async (sale) => {
    setHistoryDialog({ open: true, loading: true, sale, returns: [] });
    try {
      const res = await axios.get(`${API}/api/sales/return/getall/returns`, { params: branchParams, withCredentials: true });
      const saleReturns = (res.data.data || []).filter((r) => r.sale_id === sale.id);
      setHistoryDialog({ open: true, loading: false, sale, returns: saleReturns });
    } catch (err) {
      showMessage(err.response?.data?.message || "Couldn't load the return receipts. Please try again.", "error");
      setHistoryDialog({ open: false, loading: false, sale: null, returns: [] });
    }
  };
  const closeHistoryDialog = () => setHistoryDialog({ open: false, loading: false, sale: null, returns: [] });

  const copyReturnNumber = async () => {
    try {
      await navigator.clipboard.writeText(successDialog.returnNumber);
      showMessage("Return number copied");
    } catch {
      showMessage("Couldn't copy. Select the number and copy it instead.", "warning");
    }
  };

  /* ─────────── row helpers ─────────── */

  const rowState = (s) => {
    const returnable = s.status === "completed" || s.status === "partially_returned";
    const hasReturns = s.status === "partially_returned" || s.status === "returned";
    return { returnable, hasReturns };
  };

  const returnButton = (s, size) => {
    const { returnable } = rowState(s);
    if (!returnable) return null;
    const disabled = !canCreate;
    const button = (
      <Button
        size={size} variant="outlined"
        fullWidth={size === "large"}
        startIcon={<KeyboardReturnIcon />}
        disabled={disabled}
        onClick={() => openReturnDialog(s)}
        sx={{ ...btn, ...(size === "large" ? { height: 44 } : { borderRadius: "8px" }) }}
      >
        Return items
      </Button>
    );
    return disabled ? (
      <Tooltip title="You don't have permission to issue returns"><span style={{ flex: size === "large" ? 1 : undefined }}>{button}</span></Tooltip>
    ) : button;
  };

  const receiptsButton = (s, boxed) => rowState(s).hasReturns && (
    <Tooltip title="Return receipts">
      <IconButton
        aria-label={`Return receipts for ${s.sale_number}`}
        onClick={() => openReturnsHistory(s)}
        size={boxed ? "medium" : "small"}
        sx={boxed ? { width: 44, height: 44, border: 1, borderColor: "divider", borderRadius: "10px" } : undefined}
      >
        <ReceiptLongOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );

  /* ─────────── shared fields ─────────── */

  const searchField = (
    <TextField
      size="small" fullWidth
      placeholder="Search by sale # or customer"
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") update({ search: searchInput.trim() });
        if (e.key === "Escape" && searchInput) clearSearch();
      }}
      inputProps={{ "aria-label": "Search bills", enterKeyHint: "search" }}
      InputProps={{
        sx: { borderRadius: "10px", bgcolor: "background.paper" },
        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        endAdornment: searchInput && (
          <InputAdornment position="end">
            <IconButton size="small" edge="end" aria-label="Clear search" onClick={clearSearch}><ClearIcon fontSize="small" /></IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  const dateFields = (
    <>
      <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
        value={query.from} inputProps={{ max: query.to || undefined }} error={dateRangeInvalid}
        onChange={(e) => update({ from: e.target.value })} InputProps={{ sx: { borderRadius: "10px" } }} />
      <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
        value={query.to} inputProps={{ min: query.from || undefined }} error={dateRangeInvalid}
        helperText={dateRangeInvalid ? "Must be on or after 'From'" : ""}
        onChange={(e) => update({ to: e.target.value })} InputProps={{ sx: { borderRadius: "10px" } }} />
    </>
  );

  const subtitle = !hasLoaded ? "Loading bills…"
    : `${total.toLocaleString("en-IN")} ${total === 1 ? "bill" : "bills"}${hasActiveFilters ? " match your filters" : ""}`;

  /* ─────────── render ─────────── */

  return (
    <Box ref={rootRef} sx={{ minWidth: 0, contain: "inline-size" }}>
      {/* Header (only when used on its own page) */}
      {title && <Box sx={{ mb: { xs: 2, md: 3 } }}>
        {title && <Typography variant="h5" component="h1" fontWeight={700} sx={{ fontSize: { xs: 22, md: 26 } }}>{title}</Typography>}
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Find the bill, choose the items and refund the customer · </Box>
          {subtitle}
        </Typography>
      </Box>}

      <Paper ref={listRef} variant="outlined" sx={compact
        ? {
            border: 0, bgcolor: "transparent", overflow: "visible",
            // on tablets/laptops the cards scroll inside too; phones keep normal page scrolling
            ...(fitHeight && { display: "flex", flexDirection: "column", maxHeight: fitHeight }),
          }
        : {
          borderRadius: "16px", overflow: "hidden",
          // fixed to the screen: the table scrolls inside, tabs/filters/pagination stay put
          display: "flex", flexDirection: "column", maxHeight: fitHeight ?? undefined,
        }}>

        {/* Status tabs with counts */}
        <Tabs
          value={query.status}
          onChange={(_, v) => update({ status: v })}
          variant={compact || (width != null && width < 820) ? "scrollable" : "standard"}
          scrollButtons={false}
          aria-label="Filter bills by status"
          sx={{
            px: { md: 1.5 }, minHeight: 48, borderBottom: 1, borderColor: "divider", flexShrink: 0,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: 14, minHeight: 48, minWidth: 0, px: { xs: 1.5, md: 2 } },
          }}
        >
          {STATUS_TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={
              <Stack direction="row" alignItems="center" spacing={0.75} component="span">
                <span>{t.label}</span>
                {counts[t.value] != null && (
                  <Box component="span" sx={{
                    minWidth: 22, height: 20, px: 0.75, borderRadius: "999px", fontSize: 12, lineHeight: "20px",
                    textAlign: "center", ...numeric,
                    bgcolor: query.status === t.value ? alpha(theme.palette.primary.main, 0.12) : "action.selected",
                    color: query.status === t.value ? "primary.main" : "text.secondary",
                  }}>
                    {Number(counts[t.value]).toLocaleString("en-IN")}
                  </Box>
                )}
              </Stack>
            } />
          ))}
        </Tabs>

        {/* Toolbar */}
        {compact ? (
          <>
            <Stack direction="row" spacing={1} sx={{ pt: 1.5, pb: range !== "all" ? 1 : 1.5 }}>
              {searchField}
              <Badge color="primary" variant="dot" invisible={range === "all"} overlap="rectangular"
                sx={{ "& .MuiBadge-badge": { top: 6, right: 6 } }}>
                <IconButton aria-label="Date range" onClick={(e) => setDateAnchor(e.currentTarget)}
                  sx={{ width: 40, height: 40, border: 1, borderColor: "divider", borderRadius: "10px", bgcolor: "background.paper" }}>
                  <EventOutlinedIcon fontSize="small" />
                </IconButton>
              </Badge>
            </Stack>
            {range !== "all" && (
              <Stack spacing={1.5} sx={{ pb: 1.5 }}>
                <Box>
                  <Chip size="small" icon={<EventOutlinedIcon />} label={rangeLabel(range, query.from, query.to)}
                    onDelete={() => selectRange("all")} onClick={(e) => setDateAnchor(e.currentTarget)} />
                </Box>
                {range === "custom" && (
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>{dateFields}</Box>
                )}
              </Stack>
            )}
          </>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-start", p: 2 }}>
            <Box sx={{ flex: "1 1 280px", maxWidth: 440 }}>{searchField}</Box>
            <TextField select size="small" label="Date" value={range} onChange={(e) => selectRange(e.target.value)}
              sx={{ width: 190 }}
              InputProps={{
                sx: { borderRadius: "10px" },
                startAdornment: <InputAdornment position="start"><EventOutlinedIcon fontSize="small" /></InputAdornment>,
              }}>
              {DATE_RANGES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
            {range === "custom" && <Box sx={{ display: "grid", gridTemplateColumns: "160px 160px", gap: 1.5 }}>{dateFields}</Box>}
            {hasActiveFilters && (
              <Button onClick={clearFilters} startIcon={<ClearIcon />} sx={{ ...btn, height: 40, ml: "auto" }}>Clear filters</Button>
            )}
          </Box>
        )}

        <Menu anchorEl={dateAnchor} open={Boolean(dateAnchor)} onClose={() => setDateAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
          {DATE_RANGES.map((r) => (
            <MenuItem key={r.value} selected={range === r.value} onClick={() => selectRange(r.value)}>
              <ListItemIcon>{range === r.value && <CheckIcon fontSize="small" />}</ListItemIcon>
              <ListItemText>{r.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>

        <Box sx={{ height: 2 }}>{loadingList && !firstLoad && <LinearProgress sx={{ height: 2 }} />}</Box>

        {listError && (
          <Alert severity="error" sx={{ mx: compact ? 0 : 2, my: 2, borderRadius: "10px" }}
            action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
            {listError}
          </Alert>
        )}

        {/* Results */}
        {compact ? (
          <Box sx={{ opacity: loadingList && !firstLoad ? 0.55 : 1, transition: "opacity .15s", ...(fitHeight && { flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", pb: 0.5 }) }}>
            {firstLoad ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Paper key={i} variant="outlined" sx={{ borderRadius: "14px", p: 2 }}>
                    <Skeleton width="50%" height={22} /><Skeleton width="40%" />
                    <Skeleton width="35%" height={30} sx={{ mt: 1 }} />
                    <Skeleton variant="rounded" height={44} sx={{ mt: 1.5, borderRadius: "10px" }} />
                  </Paper>
                ))}
              </Box>
            ) : sales.length > 0 ? (
              <Box component="ul" aria-label="Bills" sx={{
                listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}>
                {sales.map((s) => {
                  const d = formatDay(s.sale_date);
                  const customer = s.customer_name?.trim();
                  const { returnable, hasReturns } = rowState(s);
                  return (
                    <Box component="li" key={s.id} sx={{ display: "flex" }}>
                      <Paper variant="outlined" sx={{ flex: 1, borderRadius: "14px", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={700} noWrap color={customer ? "text.primary" : "text.secondary"}>
                              {customer || "Walk-in customer"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div" noWrap>
                              {s.sale_number} · {d.day}{d.time && `, ${d.time}`}
                            </Typography>
                          </Box>
                          <Pill meta={SALE_STATUS} value={s.status} />
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography sx={{ fontSize: 20, fontWeight: 700, ...numeric }}>{money(s.grand_total)}</Typography>
                          <Pill meta={PAYMENT_STATUS} value={s.payment_status} outlined />
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ mt: "auto" }}>
                          {returnable ? returnButton(s, "large") : (
                            hasReturns ? (
                              <Button fullWidth variant="outlined" startIcon={<ReceiptLongOutlinedIcon />}
                                onClick={() => openReturnsHistory(s)} sx={{ ...btn, height: 44 }}>
                                Return receipts
                              </Button>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                {s.status === "cancelled" ? "Cancelled bills can't be returned" : "Not returnable"}
                              </Typography>
                            )
                          )}
                          {returnable && receiptsButton(s, true)}
                        </Stack>
                      </Paper>
                    </Box>
                  );
                })}
              </Box>
            ) : !listError && !loadingList && (
              <Paper variant="outlined" sx={{ borderRadius: "14px" }}>
                <EmptyState filtered={hasActiveFilters} onClear={clearFilters} />
              </Paper>
            )}
          </Box>
        ) : (
          <TableContainer sx={{ flex: "1 1 auto", minHeight: 0, position: "relative" /* clips everything inside */ }}>
            <Table stickyHeader sx={{
              minWidth: 680,
              "& th": {
                fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase",
                color: "text.secondary", whiteSpace: "nowrap", py: 1.25,
                // opaque so rows don't show through the sticky header
                bgcolor: "background.paper",
                backgroundImage: `linear-gradient(${alpha(theme.palette.text.primary, 0.03)}, ${alpha(theme.palette.text.primary, 0.03)})`,
              },
              "& td": { py: 1.5 },
              "& tr:last-of-type td": { borderBottom: 0 },
              // tighter cells when space is narrow, so the table never needs a sideways scroll
              ...(width != null && width < 1000 && { "& th, & td": { px: 1.25 } }),
            }}>
              <TableHead>
                <TableRow>
                  {visibleColumns.map((c) => (
                    <TableCell key={c.id} align={c.align} sortDirection={query.sortBy === c.id ? query.sortDir : false}>
                      {c.sortable ? (
                        <TableSortLabel active={query.sortBy === c.id}
                          direction={query.sortBy === c.id ? query.sortDir : "asc"} onClick={() => handleSort(c.id)}>
                          {c.label}
                        </TableSortLabel>
                      ) : c.hiddenLabel ? <Box component="span" sx={srOnly}>{c.label}</Box> : c.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody sx={{ opacity: loadingList && !firstLoad ? 0.55 : 1, transition: "opacity .15s" }}>
                {firstLoad && Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {visibleColumns.map((c) => <TableCell key={c.id} align={c.align}><Skeleton width={c.id === "customer_name" ? 140 : 80} sx={{ display: "inline-block" }} /></TableCell>)}
                  </TableRow>
                ))}
                {sales.map((s) => {
                  const d = formatDay(s.sale_date);
                  const customer = s.customer_name?.trim();
                  const { returnable } = rowState(s);
                  return (
                    <TableRow key={s.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={600} noWrap>{s.sale_number}</Typography></TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2">{d.day}</Typography>
                        {d.time && <Typography variant="caption" color="text.secondary">{d.time}</Typography>}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography variant="body2" noWrap color={customer ? "text.primary" : "text.secondary"}>{customer || "Walk-in"}</Typography>
                        {s.customer_phone && <Typography variant="caption" color="text.secondary" noWrap component="div">{s.customer_phone}</Typography>}
                      </TableCell>
                      <TableCell align="right"><Typography variant="body2" fontWeight={600} sx={numeric}>{money(s.grand_total)}</Typography></TableCell>
                      {showPayment && <TableCell><Pill meta={PAYMENT_STATUS} value={s.payment_status} outlined /></TableCell>}
                      <TableCell><Pill meta={SALE_STATUS} value={s.status} /></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap", py: 1 }}>
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          {returnable ? returnButton(s, "small") : (
                            <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                              {s.status === "cancelled" ? "Cancelled" : s.status === "returned" ? "Fully returned" : "Not returnable"}
                            </Typography>
                          )}
                          {receiptsButton(s, false)}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loadingList && sales.length === 0 && !listError && (
                  <TableRow><TableCell colSpan={visibleColumns.length} sx={{ p: 0 }}><EmptyState filtered={hasActiveFilters} onClear={clearFilters} /></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        {total > 0 && (compact ? (
          <Stack alignItems="center" spacing={1} sx={{ pt: 2.5, pb: 1 }}>
            {pageCount > 1 && (
              <Pagination count={pageCount} page={query.page + 1} onChange={(_, p) => setQuery((q) => ({ ...q, page: p - 1 }))}
                siblingCount={0} boundaryCount={1} shape="rounded" color="primary" />
            )}
            <Typography variant="caption" color="text.secondary">
              Showing {query.page * query.limit + 1}–{Math.min(total, (query.page + 1) * query.limit)} of {total.toLocaleString("en-IN")}
            </Typography>
          </Stack>
        ) : (
          <TablePagination component="div" count={total} page={Math.min(query.page, pageCount - 1)}
            rowsPerPage={query.limit} rowsPerPageOptions={[10, 25, 50, 100]}
            onPageChange={(_, page) => setQuery((q) => ({ ...q, page }))}
            onRowsPerPageChange={(e) => update({ limit: parseInt(e.target.value, 10) })}
            showFirstButton showLastButton sx={{ borderTop: 1, borderColor: "divider", flexShrink: 0 /* never squeezed by the fitted card */ }} />
        ))}
      </Paper>

      {/* ─── Return dialog ─── */}
      <Dialog open={dialogOpen} onClose={() => closeDialog()} fullWidth maxWidth="md" fullScreen={isPhone}
        PaperProps={{ sx: { borderRadius: isPhone ? 0 : "18px" } }}>
        <DialogTitle component="div" sx={{
          display: "flex", alignItems: "flex-start", gap: 1, pb: 1.5, borderBottom: 1, borderColor: "divider",
          pt: isPhone ? "calc(16px + env(safe-area-inset-top))" : undefined,
        }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2" fontWeight={700}>Return items</Typography>
            {selectedSale ? (
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                {selectedSale.sale_number} · {selectedSale.customer_name?.trim() || "Walk-in customer"}
              </Typography>
            ) : <Skeleton width={220} />}
          </Box>
          <IconButton aria-label="Close" onClick={() => closeDialog()} disabled={submitting} sx={{ mt: -0.5, mr: -1 }}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: "20px !important" }}>
          {loadingSale || !selectedSale ? (
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={56} sx={{ borderRadius: "12px" }} />
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={84} sx={{ borderRadius: "12px" }} />)}
            </Stack>
          ) : (
            <Stack spacing={3}>
              {/* Bill summary */}
              {(() => {
                const d = formatDay(selectedSale.sale_date);
                return (
                  <Box sx={{
                    display: "grid", gap: 1.5, p: 1.5, borderRadius: "12px", bgcolor: "action.hover",
                    gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, minmax(0, 1fr))" },
                  }}>
                    <Metric label="Sold">{d.day}{d.age > 1 ? ` · ${agoLabel(d.age)}` : ""}</Metric>
                    <Metric label="Bill total">{money(selectedSale.grand_total)}</Metric>
                    <Metric label="Paid by">{METHOD_LABEL[selectedSale.payment_method] || titleCase(selectedSale.payment_method) || "—"}</Metric>
                    <Metric label="Items on bill">{returnItems.length}</Metric>
                  </Box>
                );
              })()}

              {/* Items */}
              <Box ref={itemsRef} sx={{ scrollMarginTop: 16 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Which items are coming back?
                  </Typography>
                  {selectedLines.length > 0 ? (
                    <Button size="small" onClick={clearSelection} sx={btn}>Clear all</Button>
                  ) : anyEligibleLeft && (
                    <Button size="small" onClick={selectAllReturnable} sx={btn}>Select all returnable</Button>
                  )}
                </Stack>

                {actionable.length === 0 && (
                  <Alert severity="info" sx={{ borderRadius: "10px", mb: 1.5 }}>
                    Nothing on this bill can be returned right now.
                  </Alert>
                )}
                <Stack spacing={1}>
                  {actionable.map(({ item, idx }) => (
                    <ReturnItemRow key={idx} item={item} idx={idx} canOverride={canOverride} onQty={updateReturnQty} />
                  ))}
                </Stack>

                {locked.length > 0 && (
                  <>
                    <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 2, mb: 0.5 }}>
                      Can't be returned ({locked.length})
                    </Typography>
                    <Stack spacing={1} sx={{ opacity: 0.85 }}>
                      {locked.map(({ item, idx }) => (
                        <ReturnItemRow key={idx} item={item} idx={idx} canOverride={canOverride} onQty={updateReturnQty} />
                      ))}
                    </Stack>
                  </>
                )}
              </Box>

              {/* Reason */}
              <Box ref={reasonRef}>
                <Typography id="reason-label" variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
                  Reason for return
                </Typography>
                <Box role="group" aria-labelledby="reason-label" sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {REASONS.map((r) => {
                    const active = reason === r.value;
                    return (
                      <Chip key={r.value} label={r.label} clickable aria-pressed={active}
                        icon={active ? <CheckIcon /> : undefined}
                        color={active ? "primary" : "default"} variant={active ? "filled" : "outlined"}
                        onClick={() => setReason(r.value)}
                        sx={{ height: 36, borderRadius: "10px", fontWeight: 500, px: 0.5 }} />
                    );
                  })}
                </Box>
                {["expired", "damaged"].includes(reason) && (
                  <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 1.5, borderRadius: "10px" }}>
                    {reason === "expired" ? "Expired" : "Damaged"} items won't go back into sellable stock. The stock stays deducted.
                  </Alert>
                )}
                <TextField
                  label="Note (optional)" placeholder="Anything the next person should know"
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  fullWidth multiline minRows={1} maxRows={4} size="small" sx={{ mt: 2 }}
                  InputProps={{ sx: { borderRadius: "10px" } }}
                />
              </Box>

              {/* Override */}
              {needsOverride && (
                <Alert ref={overrideRef} severity={canOverride ? "warning" : "error"} icon={canOverride ? <LockOpenIcon /> : <LockOutlinedIcon />}
                  sx={{ borderRadius: "12px", "& .MuiAlert-message": { width: "100%" } }}>
                  <Typography variant="body2" fontWeight={700}>
                    {canOverride ? "Override the return window" : "Manager approval needed"}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {canOverride
                      ? "Some selected items are past their return window. Say why you're accepting them."
                      : "Some selected items are past their return window and you can't override it. Ask a manager to process this return, or set those items to 0."}
                  </Typography>
                  {canOverride && (
                    <TextField
                      fullWidth size="small" required
                      label="Override reason"
                      placeholder="e.g. Customer was hospitalised, accepted as goodwill"
                      value={overrideReason}
                      inputRef={overrideInputRef}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      sx={{ mt: 1.5, "& .MuiInputBase-root": { bgcolor: "background.paper", borderRadius: "10px" } }}
                    />
                  )}
                </Alert>
              )}

              {submitError && <Alert severity="error" sx={{ borderRadius: "10px" }}>{submitError}</Alert>}
            </Stack>
          )}
        </DialogContent>

        {/* Sticky refund footer */}
        <DialogActions sx={{
          px: { xs: 2, sm: 3 }, py: 1.5, gap: 2, borderTop: 1, borderColor: "divider",
          justifyContent: "space-between", flexWrap: "wrap",
          pb: isPhone ? "calc(12px + env(safe-area-inset-bottom))" : 1.5,
        }}>
          <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>
            <Typography variant="caption" color="text.secondary" component="div">
              {selectedLines.length
                ? `Refund for ${selectedUnits} ${selectedUnits === 1 ? "unit" : "units"} · ${selectedLines.length} ${selectedLines.length === 1 ? "item" : "items"}`
                : "Refund"}
            </Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, ...numeric }}>{money(refundAmount)}</Typography>
            {blocker && !loadingSale && (
              <Link component="button" type="button" variant="caption" onClick={goToBlocker}
                underline="hover"
                sx={{
                  display: "block", textAlign: "left",
                  color: needsOverride && !canOverride ? "error.main" : "text.secondary",
                  textDecorationStyle: "dotted",
                }}>
                {blocker}
              </Link>
            )}
          </Box>
          <Stack direction="row" spacing={1} sx={{ flex: { xs: "1 1 100%", sm: "0 0 auto" } }}>
            {!isPhone && <Button onClick={() => closeDialog()} disabled={submitting} sx={{ ...btn, height: 48, px: 2.5 }}>Cancel</Button>}
            <Button
              variant="contained" disableElevation onClick={submitReturn}
              disabled={submitting || loadingSale || Boolean(blocker)}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <KeyboardReturnIcon />}
              sx={{ ...btn, height: 48, px: 3, flex: { xs: 1, sm: "0 0 auto" } }}
            >
              {submitting ? "Processing…" : "Process return"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* ─── Success ─── */}
      <Dialog open={successDialog.open} onClose={() => setSuccessDialog((s) => ({ ...s, open: false }))}
        fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: "18px" } }}>
        <DialogContent sx={{ textAlign: "center", pt: 4, pb: 2, px: 3 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: "50%", mx: "auto", mb: 2, display: "grid", placeItems: "center",
            bgcolor: alpha(theme.palette.success.main, 0.14), color: "success.main",
          }}>
            <CheckCircleIcon sx={{ fontSize: 38 }} />
          </Box>
          <Typography variant="h6" component="h2" fontWeight={700}>Return processed</Typography>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ ...numeric, userSelect: "all" }}>{successDialog.returnNumber}</Typography>
            <Tooltip title="Copy return number">
              <IconButton size="small" aria-label="Copy return number" onClick={copyReturnNumber}><ContentCopyIcon sx={{ fontSize: 16 }} /></IconButton>
            </Tooltip>
          </Stack>
          <Box sx={{ mt: 2.5, p: 2, borderRadius: "14px", bgcolor: "action.hover" }}>
            <Typography variant="caption" color="text.secondary">Refund to customer</Typography>
            <Typography sx={{ fontSize: 30, fontWeight: 700, ...numeric }}>{money(successDialog.refundAmount)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Hand this back to {successDialog.customerName || "the customer"}.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, flexDirection: "column", gap: 1, "& > :not(style) ~ :not(style)": { ml: 0 } }}>
          <Button fullWidth variant="contained" disableElevation startIcon={<DownloadIcon />}
            onClick={() => downloadReceipt(successDialog.returnId)} sx={{ ...btn, height: 48 }}>
            Download receipt
          </Button>
          <Button fullWidth onClick={() => setSuccessDialog((s) => ({ ...s, open: false }))} sx={{ ...btn, height: 44 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Return receipts for a bill ─── */}
      <Dialog open={historyDialog.open} onClose={closeHistoryDialog} fullWidth maxWidth="sm" fullScreen={isPhone}
        PaperProps={{ sx: { borderRadius: isPhone ? 0 : "18px" } }}>
        <DialogTitle component="div" sx={{
          display: "flex", alignItems: "flex-start", gap: 1, borderBottom: 1, borderColor: "divider",
          pt: isPhone ? "calc(16px + env(safe-area-inset-top))" : undefined,
        }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2" fontWeight={700}>Return receipts</Typography>
            {historyDialog.sale && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {historyDialog.sale.sale_number} · {historyDialog.sale.customer_name?.trim() || "Walk-in customer"}
              </Typography>
            )}
          </Box>
          <IconButton aria-label="Close" onClick={closeHistoryDialog} sx={{ mt: -0.5, mr: -1 }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: "16px !important" }}>
          {historyDialog.loading ? (
            <Stack spacing={1.5}>{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} variant="rounded" height={84} sx={{ borderRadius: "12px" }} />)}</Stack>
          ) : historyDialog.returns.length === 0 ? (
            <Stack alignItems="center" spacing={1} sx={{ py: 5, textAlign: "center" }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">No returns have been recorded for this bill.</Typography>
            </Stack>
          ) : (
            <Stack spacing={1.25}>
              <Typography variant="body2" color="text.secondary">
                {historyDialog.returns.length} {historyDialog.returns.length === 1 ? "return" : "returns"} ·{" "}
                {money(historyDialog.returns.reduce((n, r) => n + Number(r.refund_amount || 0), 0))} refunded in total
              </Typography>
              {historyDialog.returns.map((ret) => {
                const d = parseDate(ret.return_date);
                return (
                  <Paper key={ret.id} variant="outlined" sx={{ borderRadius: "12px", p: 1.75 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
                          <Typography variant="subtitle2" fontWeight={700} sx={numeric}>{ret.return_number}</Typography>
                          <Pill meta={RETURN_STATUS} value={ret.status || "completed"} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
                          {d ? d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                          {ret.reason && ` · ${REASON_LABEL[ret.reason] || titleCase(ret.reason)}`}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5, ...numeric }}>
                          {money(ret.refund_amount)} refunded
                        </Typography>
                      </Box>
                      {isPhone ? (
                        <IconButton aria-label={`Download receipt ${ret.return_number}`} onClick={() => downloadReceipt(ret.id)}
                          sx={{ width: 44, height: 44, border: 1, borderColor: "divider", borderRadius: "10px" }}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadReceipt(ret.id)}
                          sx={{ ...btn, flexShrink: 0 }}>
                          Receipt
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        {!isPhone && (
          <DialogActions sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: "divider" }}>
            <Button onClick={closeHistoryDialog} sx={btn}>Close</Button>
          </DialogActions>
        )}
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={(_, r) => { if (r !== "clickaway") setSnackbar((s) => ({ ...s, open: false })); }}
        anchorOrigin={{ vertical: "bottom", horizontal: compact ? "center" : "right" }}>
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%", borderRadius: "10px" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}