// Payments.jsx — Outstanding dues & payment collection
//
// Layout
//   • Summary tiles: amount to collect, unpaid, partial, older than 30 days
//   • Status tabs with live counts, search (customer / phone / bill #), sort
//   • Wide space: table that fits the screen (scrolls inside its card, pagination stays put)
//   • Narrow space (under 700px after your sidebar): cards (1 column phone, 2 tablet)
//   • "Collect" opens a dialog on desktop and a bottom sheet on phones
//   • After a payment is saved, the toast offers the receipt straight away
//
// Same endpoints as before: sales list (payment_status=partial,unpaid),
// POST payments/post, and the receipt PDF.

import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { usePermission } from "../../../Redux/store/hooks/usePermissions";
import { useElementWidth, useFitToScreen } from "../useFitToScreen";
import {
  Box, Stack, Paper, Typography, TextField, MenuItem, Menu, ListItemIcon, ListItemText,
  Button, ButtonBase, IconButton, InputAdornment, Tabs, Tab, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, TablePagination, Pagination, LinearProgress,
  CircularProgress, Skeleton, Alert, Snackbar, Tooltip, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Drawer, Divider, useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";

/* ───────────────────────────── constants ───────────────────────────── */

const API = process.env.REACT_APP_URL;
const PAGE_SIZE = 100; // rows per request while loading every due bill
const MAX_PAGES = 50;

const METHODS = [
  { value: "cash", label: "Cash", Icon: PaymentsOutlinedIcon },
  { value: "upi", label: "UPI", Icon: QrCode2Icon },
  { value: "card", label: "Card", Icon: CreditCardIcon },
  { value: "bank_transfer", label: "Bank transfer", Icon: AccountBalanceOutlinedIcon },
];

const STATUS_META = {
  paid: { label: "Paid", color: "success" },
  partial: { label: "Partial", color: "warning" },
  unpaid: { label: "Unpaid", color: "error" },
};

const TABS = [
  { value: "all", label: "All dues" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
];

const SORTS = [
  { value: "due_desc", label: "Highest due first" },
  { value: "oldest", label: "Oldest bill first", needsDate: true },
  { value: "newest", label: "Newest bill first", needsDate: true },
  { value: "customer", label: "Customer A to Z" },
];

const srOnly = {
  position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px",
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};
const numeric = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const pill = { borderRadius: "10px", textTransform: "none", fontWeight: 600 };

/* ───────────────────────────── helpers ───────────────────────────── */

const toNum = (n) => Number(n || 0);
const round2 = (n) => Math.round(n * 100) / 100;
const money = (n) =>
  `₹${toNum(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const balanceOf = (s) => Math.max(0, round2(toNum(s.grand_total) - toNum(s.paid_amount)));
const statusOf = (s) => s.payment_status || (toNum(s.paid_amount) > 0 ? "partial" : "unpaid");

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
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((today - day) / 86400000));
}

const ageLabel = (n) => (n === 0 ? "Today" : n === 1 ? "1 day" : `${n} days`);
const ageTone = (n) => (n > 30 ? "error" : n > 7 ? "warning" : null);
const shortDate = (d) =>
  d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const toneText = (theme, tone) =>
  theme.palette[tone][theme.palette.mode === "dark" ? "light" : "dark"];

// Error bodies come back as Blobs when responseType is "blob" — read the JSON message out of them
async function errorMessage(err, fallback) {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try { return JSON.parse(await data.text()).message || fallback; } catch { /* not JSON */ }
  }
  return fallback;
}

// Loads every due bill, page by page, so totals and counts cover all of them
async function fetchAllDues(signal, branch) {
  const byId = new Map();
  let total = Infinity;
  for (let page = 1; page <= MAX_PAGES && byId.size < total; page += 1) {
    const res = await axios.get(
      `${API}/api/pharmacy/sales?payment_status=partial,unpaid&page=${page}&limit=${PAGE_SIZE}${branch ? `&branch=${encodeURIComponent(branch)}` : ""}`,
      { withCredentials: true, signal }
    );
    const list = res.data.data || [];
    const before = byId.size;
    list.forEach((s) => byId.set(s.id ?? s.sale_number, s));
    const reported = res.data.total ?? res.data.pagination?.total;
    if (reported == null || list.length === 0 || byId.size === before) break; // not paginated / no progress
    total = Number(reported);
  }
  return Array.from(byId.values());
}

/* ─────────────────────────── small pieces ─────────────────────────── */

function StatusPill({ status }) {
  const theme = useTheme();
  const meta = STATUS_META[status];
  const main = meta ? theme.palette[meta.color].main : theme.palette.text.secondary;
  const text = meta ? toneText(theme, meta.color) : theme.palette.text.secondary;
  return (
    <Box component="span" sx={{
      display: "inline-flex", alignItems: "center", gap: "6px", height: 24, px: "10px",
      borderRadius: "999px", bgcolor: alpha(main, theme.palette.mode === "dark" ? 0.2 : 0.12),
      color: text, fontSize: 12.5, fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap",
    }}>
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: main, flexShrink: 0 }} />
      {meta?.label || status}
    </Box>
  );
}

function AgeText({ days, suffix = "" }) {
  const theme = useTheme();
  if (days == null) return null;
  const tone = ageTone(days);
  return (
    <Typography component="span" variant="body2" sx={{
      whiteSpace: "nowrap", fontWeight: tone ? 600 : 400,
      color: tone ? toneText(theme, tone) : "text.secondary",
    }}>
      {ageLabel(days)}{days > 0 ? suffix : ""}
    </Typography>
  );
}

function PaidProgress({ sale }) {
  const total = toNum(sale.grand_total);
  const paid = toNum(sale.paid_amount);
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
        <Typography variant="body2" sx={numeric}>{money(paid)} paid</Typography>
        <Typography variant="caption" color="text.secondary" sx={numeric}>of {money(total)}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate" value={pct}
        aria-label={`${Math.round(pct)}% of the bill paid`}
        sx={{
          mt: 0.75, height: 6, borderRadius: 3, bgcolor: "action.hover",
          "& .MuiLinearProgress-bar": { borderRadius: 3, bgcolor: "success.main" },
        }}
      />
    </Box>
  );
}

function StatTile({ label, value, sub, tone, emphasis, loading, dense, sx }) {
  const theme = useTheme();
  return (
    <Paper variant="outlined" sx={{
      px: { xs: 1.75, md: 2 }, py: dense ? 1 : 1.5, borderRadius: "14px", minWidth: 0,
      ...(emphasis && {
        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.05),
        borderColor: alpha(theme.palette.primary.main, 0.35),
      }),
      ...sx,
    }}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        {tone && <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: `${tone}.main`, flexShrink: 0 }} />}
        <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap>{label}</Typography>
      </Stack>
      {loading ? (
        <Skeleton width="70%" height={emphasis ? 40 : 30} />
      ) : (
        <Typography sx={{
          fontVariantNumeric: "tabular-nums", fontWeight: 700, lineHeight: 1.25, mt: 0.5,
          fontSize: dense ? (emphasis ? 20 : 17) : (emphasis ? { xs: 22, md: 24 } : { xs: 17, md: 19 }),
          color: emphasis ? "text.primary" : undefined, overflowWrap: "anywhere",
        }}>
          {value}
        </Typography>
      )}
      {sub && !loading && !dense && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>{sub}</Typography>
      )}
    </Paper>
  );
}

function Metric({ label, children, color }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
      <Box sx={{ fontSize: { xs: 13.5, sm: 14.5 }, fontWeight: 700, color, ...numeric }}>{children}</Box>
    </Box>
  );
}

function MethodTile({ method, selected, onSelect }) {
  const theme = useTheme();
  const { Icon } = method;
  return (
    <ButtonBase
      onClick={() => onSelect(method.value)}
      aria-pressed={selected}
      sx={{
        position: "relative", flexDirection: "column", gap: 0.5, py: 1.5, px: 1, minHeight: 72,
        borderRadius: "12px", border: "1.5px solid",
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.07) : "transparent",
        color: selected ? "primary.main" : "text.primary",
        fontSize: 13, fontWeight: 600, textAlign: "center", lineHeight: 1.2,
        transition: "border-color .15s, background-color .15s",
        "&:hover": { borderColor: selected ? "primary.main" : "text.secondary" },
        "&.Mui-focusVisible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
      }}
    >
      {selected && (
        <CheckIcon sx={{ position: "absolute", top: 6, right: 6, fontSize: 16 }} />
      )}
      <Icon />
      {method.label}
    </ButtonBase>
  );
}

function EmptyState({ kind, onClear }) {
  const allClear = kind === "clear";
  const Icon = allClear ? TaskAltIcon : SearchOffIcon;
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: { xs: 7, md: 9 }, px: 3, textAlign: "center" }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", mb: 1,
        bgcolor: (t) => (allClear ? alpha(t.palette.success.main, 0.12) : t.palette.action.hover),
        color: allClear ? "success.main" : "text.secondary",
      }}>
        <Icon />
      </Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {allClear ? "All caught up" : "No dues match"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 340 }}>
        {allClear
          ? "No bills have money pending right now."
          : "Try another name, phone number or bill number."}
      </Typography>
      {!allClear && <Button onClick={onClear} sx={{ mt: 1, ...pill }}>Clear search</Button>}
    </Stack>
  );
}

/* ───────────────────────────── main ───────────────────────────── */

export default function Payments({ title = "Outstanding dues", branchParams = {} }) {
  // Added 25 Oct: this screen had no permission check at all, so a user with
  // pharmacy.payments.view but not .create was shown "Collect payment" and got a 403 from
  // routes/Pharmacy/pharmacy_payments.js when they pressed it. Reading the dues and taking
  // money against them are different rights.
  const canRecordPayment = usePermission("pharmacy.payments.create");
  const theme = useTheme();
  const isMobileViewport = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true }); // dialog vs bottom sheet

  // List layout follows the space this screen really has (after any sidebar), not the window size
  const topRef = useRef(null);
  const listRef = useRef(null);
  const width = useElementWidth(topRef);
  const isMobile = width == null ? isMobileViewport : width < 700; // cards below 700px of space
  const showStatus = width == null ? true : width >= 900; // Status is already shown by the tabs and paid bar; drop it when tight
  const paidColWidth = width != null && width < 900 ? 170 : 230;
  const isPhoneViewport = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const shortScreen = useMediaQuery("(max-height: 860px)", { noSsr: true });
  const denseTiles = shortScreen && !isPhoneViewport; // slimmer summary on short laptop screens
  const fitHeight = useFitToScreen(listRef, !isPhoneViewport); // list card ends at the bottom of the screen

  // Data
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // List controls
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("due_desc");
  const [sortAnchor, setSortAnchor] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Collect flow
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash"); // remembered between collections
  const [submitting, setSubmitting] = useState(false);
  const [collectError, setCollectError] = useState("");

  // Receipts + toasts
  const [downloadingId, setDownloadingId] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success", sale: null });

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        setDues(await fetchAllDues(controller.signal, branchParams.branch));
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;
        setLoadError(await errorMessage(err, "Couldn't load outstanding dues. Check your connection and try again."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
    // branchParams.branch added 26 Oct 2026 — without it, picking a branch changed nothing
    // until the page was reloaded by hand.
  }, [reloadKey, branchParams.branch]);

  /* ─────────── derived data ─────────── */

  const rows = useMemo(() => dues.map((s) => {
    const date = parseDate(s.sale_date);
    return { ...s, _due: balanceOf(s), _status: statusOf(s), _date: date, _age: daysSince(date) };
  }), [dues]);

  const stats = useMemo(() => {
    const st = {
      due: 0, count: 0, hasDates: false,
      unpaid: { count: 0, due: 0 }, partial: { count: 0, due: 0 }, old: { count: 0, due: 0 },
    };
    rows.forEach((r) => {
      if (r._age != null) st.hasDates = true;
      if (r._due <= 0) return;
      st.due += r._due; st.count += 1;
      const bucket = r._status === "unpaid" ? st.unpaid : st.partial;
      bucket.count += 1; bucket.due += r._due;
      if (r._age > 30) { st.old.count += 1; st.old.due += r._due; }
    });
    return st;
  }, [rows]);

  const tabCounts = {
    all: rows.length,
    unpaid: rows.filter((r) => r._status === "unpaid").length,
    partial: rows.filter((r) => r._status === "partial").length,
  };

  const sortOptions = SORTS.filter((o) => !o.needsDate || stats.hasDates);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) =>
      (tab === "all" || r._status === tab) &&
      (!q || [r.sale_number, r.customer_name, r.customer_phone].some((v) => String(v ?? "").toLowerCase().includes(q))));
    const byDate = (a, b) => (a._date?.getTime() ?? 0) - (b._date?.getTime() ?? 0);
    const sorters = {
      due_desc: (a, b) => b._due - a._due,
      oldest: byDate,
      newest: (a, b) => byDate(b, a),
      customer: (a, b) => (a.customer_name || "~").localeCompare(b.customer_name || "~"),
    };
    return list.sort(sorters[sort] || sorters.due_desc);
  }, [rows, tab, search, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1); // keeps you near the same spot after a collection
  const paged = visible.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);
  const firstLoad = loading && dues.length === 0 && !loadError;
  const columnCount = 5 + (stats.hasDates ? 1 : 0) + (showStatus ? 1 : 0); // Bill, Customer, Paid, Due, [Age], [Status], Actions

  /* ─────────── actions ─────────── */

  const goToPage = (p) => {
    setPage(p);
    const top = topRef.current;
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCollect = (sale) => {
    setSelected(sale);
    setAmount(String(balanceOf(sale)));
    setCollectError("");
  };
  const closeCollect = () => { if (!submitting) setSelected(null); };

  const due = selected ? balanceOf(selected) : 0;
  const amt = Number(amount);
  const amountError = amount === "" ? ""
    : !(amt > 0) ? "Enter an amount above ₹0"
      : amt > due + 0.001 ? `Can't be more than the due amount (${money(due)})`
        : "";
  const canCollect = Boolean(selected) && amount !== "" && !amountError && !submitting;
  const remaining = Math.max(0, round2(due - (amt || 0)));

  const quickAmounts = selected ? [
    { label: `Full ${money(due)}`, value: due },
    ...(due >= 2 ? [{ label: `Half ${money(round2(due / 2))}`, value: round2(due / 2) }] : []),
    ...[500, 1000, 2000].filter((v) => v < due / 1.5).slice(-2).map((v) => ({ label: money(v).replace(".00", ""), value: v })),
  ] : [];

  const onAmountChange = (e) => {
    const v = e.target.value.replace(/[^\d.]/g, "");
    if (/^\d*\.?\d{0,2}$/.test(v)) setAmount(v);
  };

  const collect = async (e) => {
    e?.preventDefault();
    if (!canCollect) return;
    setSubmitting(true);
    setCollectError("");
    try {
      await axios.post(
        `${API}/api/pharmacy/post/payment`,
        { sale_id: selected.id, amount: amt, payment_method: method },
        { withCredentials: true }
      );
      const sale = selected;
      setSnack({
        open: true, severity: "success", sale,
        msg: `${money(amt)} collected for ${sale.sale_number}`,
      });
      setSelected(null);
      reload();
    } catch (err) {
      setCollectError(await errorMessage(err, "The payment wasn't saved. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReceipt = async (sale) => {
    setDownloadingId(sale.id);
    try {
      const res = await axios.get(
        `${API}/api/pharmacy/sales-reports/${sale.id}/receipt/pdf`,
        { withCredentials: true, responseType: "blob" }
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Receipt-${sale.sale_number || sale.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSnack({ open: true, msg: `Receipt for ${sale.sale_number} downloaded`, severity: "success", sale: null });
    } catch (err) {
      setSnack({ open: true, msg: await errorMessage(err, "Couldn't download the receipt. Please try again."), severity: "error", sale: null });
    } finally {
      setDownloadingId(null);
    }
  };

  const closeSnack = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((s) => ({ ...s, open: false }));
  };

  /* ─────────── shared elements ─────────── */

  const refreshButton = (
    <Tooltip title="Refresh">
      <span>
        <IconButton onClick={reload} disabled={loading} aria-label="Refresh dues"
          sx={{ width: 40, height: 40, border: 1, borderColor: "divider", borderRadius: "10px", bgcolor: "background.paper" }}>
          {loading && !firstLoad ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );

  const receiptButton = (s, boxed) => (
    <Tooltip title="Download receipt">
      <span>
        <IconButton
          size={boxed ? "medium" : "small"}
          aria-label={`Download receipt for ${s.sale_number}`}
          disabled={downloadingId === s.id}
          onClick={() => downloadReceipt(s)}
          sx={boxed ? { width: 44, height: 44, border: 1, borderColor: "divider", borderRadius: "10px" } : undefined}
        >
          {downloadingId === s.id ? <CircularProgress size={18} /> : <DownloadIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );

  const searchField = (
    <TextField
      size="small" fullWidth
      placeholder="Search customer, phone or bill #"
      value={search}
      onChange={(e) => { setSearch(e.target.value); setPage(0); }}
      onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); setPage(0); } }}
      inputProps={{ "aria-label": "Search dues", enterKeyHint: "search" }}
      InputProps={{
        sx: { borderRadius: "10px", bgcolor: "background.paper" },
        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        endAdornment: search && (
          <InputAdornment position="end">
            <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => { setSearch(""); setPage(0); }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  const collectSummary = selected && (
    <Box sx={{
      display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1,
      p: 1.5, borderRadius: "12px", bgcolor: "action.hover",
    }}>
      <Metric label="Bill total">{money(selected.grand_total)}</Metric>
      <Metric label="Paid so far">{money(selected.paid_amount)}</Metric>
      <Metric label="Due now" color="error.main">{money(due)}</Metric>
    </Box>
  );

  const collectForm = selected && (
    <Box component="form" id="collect-form" onSubmit={collect} noValidate>
      {collectSummary}

      <TextField
        label="Amount received"
        value={amount}
        onChange={onAmountChange}
        onFocus={(e) => e.target.select()}
        autoFocus={!isMobileViewport}
        fullWidth
        error={Boolean(amountError)}
        helperText={amountError || (amt > 0
          ? (remaining > 0 ? `${money(remaining)} will still be due after this` : "This clears the bill in full")
          : " ")}
        sx={{ mt: 2.5 }}
        inputProps={{ inputMode: "decimal", autoComplete: "off", "aria-label": "Amount received in rupees" }}
        InputProps={{
          sx: { borderRadius: "12px", fontSize: 22, fontWeight: 600, ...numeric },
          startAdornment: <InputAdornment position="start"><Box component="span" sx={{ fontSize: 22, fontWeight: 600 }}>₹</Box></InputAdornment>,
        }}
      />

      <Box sx={{
        display: "flex", gap: 1, mt: 0.5, flexWrap: { xs: "nowrap", sm: "wrap" },
        overflowX: { xs: "auto", sm: "visible" }, pb: { xs: 0.5, sm: 0 }, mx: { xs: -2.5, sm: 0 }, px: { xs: 2.5, sm: 0 },
        scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" },
      }}>
        {quickAmounts.map((q) => {
          const active = Math.abs(amt - q.value) < 0.001;
          return (
            <Chip key={q.label} label={q.label} clickable
              color={active ? "primary" : "default"} variant={active ? "filled" : "outlined"}
              onClick={() => setAmount(String(q.value))}
              sx={{ borderRadius: "8px", fontWeight: 500, ...numeric }} />
          );
        })}
      </Box>

      <Typography id="method-label" variant="overline" color="text.secondary" component="div" sx={{ mt: 2.5, mb: 1 }}>
        Payment method
      </Typography>
      <Box role="group" aria-labelledby="method-label" sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, minmax(0, 1fr))" }, gap: 1,
      }}>
        {METHODS.map((m) => (
          <MethodTile key={m.value} method={m} selected={method === m.value} onSelect={setMethod} />
        ))}
      </Box>

      {collectError && <Alert severity="error" sx={{ mt: 2, borderRadius: "10px" }}>{collectError}</Alert>}
    </Box>
  );

  const collectLabel = submitting ? "Saving…" : amt > 0 && !amountError ? `Collect ${money(amt)}` : "Collect";
  const collectButton = (
    <Button
      type="submit" form="collect-form" variant="contained" disableElevation
      disabled={!canCollect}
      startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
      sx={{ ...pill, height: 48, flex: 2, px: 3 }}
    >
      {collectLabel}
    </Button>
  );

  const collectHeading = selected && (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h6" component="h2" fontWeight={700} sx={{ lineHeight: 1.3 }}>Collect payment</Typography>
      <Typography variant="body2" color="text.secondary" noWrap>
        {selected.sale_number} · {selected.customer_name?.trim() || "Walk-in customer"}
        {selected.customer_phone && ` · ${selected.customer_phone}`}
      </Typography>
    </Box>
  );

  /* ─────────── render ─────────── */

  return (
    <Box ref={topRef} sx={{ scrollMarginTop: 80, minWidth: 0, contain: "inline-size" }}>
      {/* Header (only when used on its own page) */}
      {title && <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: { xs: 2, md: 2.5 } }}>
        <Box sx={{ minWidth: 0 }}>
          {title && (
            <Typography variant="h5" component="h1" fontWeight={700} sx={{ fontSize: { xs: 22, md: 26 } }}>{title}</Typography>
          )}
          <Typography variant="body2" color="text.secondary">Collect pending payments and download receipts</Typography>
        </Box>
        {refreshButton}
      </Stack>}

      {/* Summary */}
      <Box sx={{
        display: "grid", gap: 1.5, mb: 2,
        gridTemplateColumns: { xs: "1fr 1fr", md: `repeat(${stats.hasDates ? 4 : 3}, minmax(0, 1fr))` },
      }}>
        <StatTile dense={denseTiles} emphasis label="To collect" loading={firstLoad}
          value={money(stats.due)}
          sub={`${stats.count} ${stats.count === 1 ? "bill" : "bills"} pending`}
          sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }} />
        <StatTile dense={denseTiles} label="Unpaid" tone="error" loading={firstLoad}
          value={money(stats.unpaid.due)}
          sub={`${stats.unpaid.count} ${stats.unpaid.count === 1 ? "bill" : "bills"}, nothing paid yet`} />
        <StatTile dense={denseTiles} label="Partial" tone="warning" loading={firstLoad}
          value={money(stats.partial.due)}
          sub={`${stats.partial.count} ${stats.partial.count === 1 ? "bill" : "bills"}, part paid`} />
        {stats.hasDates && (
          <StatTile dense={denseTiles} label="Older than 30 days" tone="error" loading={firstLoad}
            value={money(stats.old.due)}
            sub={`${stats.old.count} ${stats.old.count === 1 ? "bill" : "bills"} to follow up`}
            sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }} />
        )}
      </Box>

      <Paper
        ref={listRef}
        variant="outlined"
        sx={isMobile
          ? {
            border: 0, bgcolor: "transparent", overflow: "visible",
            // on tablets/laptops the cards scroll inside too; phones keep normal page scrolling
            ...(fitHeight && { display: "flex", flexDirection: "column", maxHeight: fitHeight }),
          }
          : {
            borderRadius: "16px", overflow: "hidden",
            // fixed to the screen: the table scrolls inside, tabs/filters/pagination stay put
            display: "flex", flexDirection: "column", maxHeight: fitHeight ?? undefined,
          }}
      >
        {/* Status tabs with counts */}
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setPage(0); }}
          variant={isMobile ? "fullWidth" : "standard"}
          aria-label="Filter dues by status"
          sx={{
            px: { md: 1.5 }, minHeight: 48, borderBottom: 1, borderColor: "divider", flexShrink: 0,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: 14, minHeight: 48, minWidth: { xs: 0, md: 100 }, px: { xs: 1, md: 2 } },
          }}
        >
          {TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={
              <Stack direction="row" alignItems="center" spacing={0.75} component="span">
                <span>{t.label}</span>
                <Box component="span" sx={{
                  minWidth: 22, height: 20, px: 0.75, borderRadius: "999px", fontSize: 12, lineHeight: "20px",
                  textAlign: "center", ...numeric,
                  bgcolor: tab === t.value ? alpha(theme.palette.primary.main, 0.12) : "action.selected",
                  color: tab === t.value ? "primary.main" : "text.secondary",
                }}>
                  {firstLoad ? "–" : tabCounts[t.value]}
                </Box>
              </Stack>
            } />
          ))}
        </Tabs>

        {/* Toolbar */}
        <Stack direction="row" alignItems="center" sx={{ gap: { xs: 1, md: 1.5 }, py: 1.5, px: { xs: 0, md: 2 } }}>
          <Box sx={{ flex: 1, maxWidth: { md: 440 } }}>{searchField}</Box>
          {isMobile ? (
            <>
              <IconButton aria-label="Sort dues" onClick={(e) => setSortAnchor(e.currentTarget)}
                sx={{ width: 40, height: 40, border: 1, borderColor: "divider", borderRadius: "10px", bgcolor: "background.paper" }}>
                <SwapVertIcon fontSize="small" />
              </IconButton>
              <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
                {sortOptions.map((o) => (
                  <MenuItem key={o.value} selected={sort === o.value}
                    onClick={() => { setSort(o.value); setPage(0); setSortAnchor(null); }}>
                    <ListItemIcon>{sort === o.value && <CheckIcon fontSize="small" />}</ListItemIcon>
                    <ListItemText>{o.label}</ListItemText>
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : (
            <TextField select size="small" label="Sort by" value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(0); }}
              sx={{ width: 210, flexShrink: 0, ml: "auto" }}
              InputProps={{ sx: { borderRadius: "10px" } }}>
              {sortOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          )}
          {!title && refreshButton}
        </Stack>

        <Box sx={{ height: 2 }}>{loading && !firstLoad && <LinearProgress sx={{ height: 2 }} />}</Box>

        {loadError && (
          <Alert severity="error" sx={{ mx: isMobile ? 0 : 2, my: 2, borderRadius: "10px" }}
            action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
            {loadError}
          </Alert>
        )}

        {/* Results */}
        {isMobile ? (
          <Box sx={{ opacity: loading && !firstLoad ? 0.55 : 1, transition: "opacity .15s", ...(fitHeight && { flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", pb: 0.5 }) }}>
            {firstLoad ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Paper key={i} variant="outlined" sx={{ borderRadius: "14px", p: 2 }}>
                    <Skeleton width="55%" height={22} /><Skeleton width="40%" />
                    <Skeleton width="45%" height={36} sx={{ mt: 1 }} />
                    <Skeleton variant="rounded" height={6} sx={{ mt: 1.5 }} />
                    <Skeleton variant="rounded" height={44} sx={{ mt: 2, borderRadius: "10px" }} />
                  </Paper>
                ))}
              </Box>
            ) : paged.length > 0 ? (
              <Box component="ul" aria-label="Outstanding dues" sx={{
                listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}>
                {paged.map((s) => (
                  <Box component="li" key={s.id ?? s.sale_number} sx={{ display: "flex" }}>
                    <Paper variant="outlined" sx={{ flex: 1, borderRadius: "14px", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={700} noWrap
                            color={s.customer_name?.trim() ? "text.primary" : "text.secondary"}>
                            {s.customer_name?.trim() || "Walk-in customer"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="div" noWrap>
                            {s.sale_number}{s._date && ` · ${shortDate(s._date)}`}{s.customer_phone && ` · ${s.customer_phone}`}
                          </Typography>
                        </Box>
                        <StatusPill status={s._status} />
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={1}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" component="div">Due</Typography>
                          <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: s._due > 0 ? "error.main" : "success.main", ...numeric }}>
                            {money(s._due)}
                          </Typography>
                        </Box>
                        <AgeText days={s._age} suffix=" old" />
                      </Stack>

                      <PaidProgress sale={s} />

                      <Stack direction="row" spacing={1} sx={{ mt: "auto" }}>
                        {s._due > 0 ? (
                          canRecordPayment ? (
                            <Button fullWidth variant="contained" disableElevation onClick={() => openCollect(s)}
                              sx={{ ...pill, height: 44 }}>
                              Collect payment
                            </Button>
                          ) : (
                            <Button fullWidth disabled sx={{ ...pill, height: 44 }}>Due {money(s._due)}</Button>
                          )
                        ) : (
                          <Button fullWidth disabled sx={{ ...pill, height: 44 }}>Fully paid</Button>
                        )}
                        {receiptButton(s, true)}
                      </Stack>
                    </Paper>
                  </Box>
                ))}
              </Box>
            ) : !loadError && !loading && (
              <Paper variant="outlined" sx={{ borderRadius: "14px" }}>
                <EmptyState kind={rows.length === 0 ? "clear" : "filtered"}
                  onClear={() => { setSearch(""); setTab("all"); setPage(0); }} />
              </Paper>
            )}
          </Box>
        ) : (
          <TableContainer sx={{ flex: "1 1 auto", minHeight: 0, position: "relative" /* clips everything inside */ }}>
            <Table stickyHeader sx={{
              minWidth: 660,
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
                  <TableCell>Bill</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell sx={{ width: paidColWidth }}>Paid</TableCell>
                  <TableCell align="right">Due</TableCell>
                  {stats.hasDates && <TableCell>Age</TableCell>}
                  {showStatus && <TableCell>Status</TableCell>}
                  <TableCell align="right"><Box component="span" sx={srOnly}>Actions</Box></TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ opacity: loading && !firstLoad ? 0.55 : 1, transition: "opacity .15s" }}>
                {firstLoad && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: columnCount }).map((__, j) => (
                      <TableCell key={j}><Skeleton width={j === 2 ? 180 : 80} /></TableCell>
                    ))}
                  </TableRow>
                ))}

                {!firstLoad && paged.map((s) => (
                  <TableRow key={s.id ?? s.sale_number} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap>{s.sale_number}</Typography>
                      {s._date && <Typography variant="caption" color="text.secondary" noWrap>{shortDate(s._date)}</Typography>}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Typography variant="body2" noWrap color={s.customer_name?.trim() ? "text.primary" : "text.secondary"}>
                        {s.customer_name?.trim() || "Walk-in"}
                      </Typography>
                      {s.customer_phone && (
                        <Typography variant="caption" color="text.secondary" noWrap component="div">{s.customer_phone}</Typography>
                      )}
                    </TableCell>
                    <TableCell><PaidProgress sale={s} /></TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ ...numeric, fontWeight: 700, fontSize: 15, color: s._due > 0 ? "error.main" : "success.main" }}>
                        {money(s._due)}
                      </Typography>
                    </TableCell>
                    {stats.hasDates && <TableCell><AgeText days={s._age} /></TableCell>}
                    {showStatus && <TableCell><StatusPill status={s._status} /></TableCell>}
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        {s._due > 0 ? (
                          canRecordPayment ? (
                            <Button size="small" variant="contained" disableElevation onClick={() => openCollect(s)}
                              sx={{ ...pill, borderRadius: "8px", px: 2 }}>
                              Collect
                            </Button>
                          ) : (
                            <StatusPill status={s._status} />
                          )
                        ) : (
                          <StatusPill status="paid" />
                        )}
                        {receiptButton(s, false)}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && paged.length === 0 && !loadError && (
                  <TableRow>
                    <TableCell colSpan={columnCount} sx={{ p: 0 }}>
                      <EmptyState kind={rows.length === 0 ? "clear" : "filtered"}
                        onClear={() => { setSearch(""); setTab("all"); setPage(0); }} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        {visible.length > 0 && (isMobile ? (
          <Stack alignItems="center" spacing={1} sx={{ pt: 2.5, pb: 1 }}>
            {pageCount > 1 && (
              <Pagination count={pageCount} page={safePage + 1} onChange={(_, p) => goToPage(p - 1)}
                siblingCount={0} boundaryCount={1} shape="rounded" color="primary" />
            )}
            <Typography variant="caption" color="text.secondary">
              Showing {safePage * rowsPerPage + 1}–{Math.min(visible.length, (safePage + 1) * rowsPerPage)} of {visible.length}
            </Typography>
          </Stack>
        ) : (
          <TablePagination
            component="div"
            count={visible.length}
            page={safePage}
            onPageChange={(_, p) => goToPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
            sx={{ borderTop: 1, borderColor: "divider", flexShrink: 0 /* never squeezed by the fitted card */ }}
          />
        ))}
      </Paper>

      {/* Collect: dialog on desktop, bottom sheet on phones */}
      {isMobileViewport ? (
        <Drawer anchor="bottom" open={Boolean(selected)} onClose={closeCollect}
          PaperProps={{ sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "92vh" } }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mt: 1.25 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
            {collectHeading}
            <IconButton aria-label="Close" onClick={closeCollect} disabled={submitting}><CloseIcon /></IconButton>
          </Stack>
          <Box sx={{ px: 2.5, pb: 2, overflowY: "auto" }}>{collectForm}</Box>
          <Divider />
          <Stack direction="row" spacing={1.5} sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}>
            <Button variant="outlined" onClick={closeCollect} disabled={submitting} sx={{ ...pill, height: 48, flex: 1 }}>Cancel</Button>
            {collectButton}
          </Stack>
        </Drawer>
      ) : (
        <Dialog open={Boolean(selected)} onClose={closeCollect} fullWidth
          PaperProps={{ sx: { borderRadius: "18px", maxWidth: 500 } }}>
          <DialogTitle component="div" sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, pb: 1 }}>
            {collectHeading}
            <IconButton aria-label="Close" onClick={closeCollect} disabled={submitting} sx={{ mt: -0.5, mr: -1 }}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: "8px !important" }}>{collectForm}</DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
            <Button onClick={closeCollect} disabled={submitting} sx={{ ...pill, height: 48, px: 2.5 }}>Cancel</Button>
            {collectButton}
          </DialogActions>
        </Dialog>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={snack.sale ? 7000 : 3500}
        onClose={closeSnack}
        anchorOrigin={{ vertical: "bottom", horizontal: isMobile ? "center" : "left" }}
      >
        <Alert
          variant="filled"
          severity={snack.severity}
          onClose={snack.sale ? undefined : closeSnack}
          action={snack.sale ? (
            <Button color="inherit" size="small" startIcon={<DownloadIcon />}
              onClick={() => { downloadReceipt(snack.sale); closeSnack(); }}
              sx={{ textTransform: "none", fontWeight: 600 }}>
              Receipt
            </Button>
          ) : undefined}
          sx={{ width: "100%", alignItems: "center", borderRadius: "10px" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}