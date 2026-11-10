// src/pages/pharmacy/Medicines.jsx
// Medicine inventory manager — list, add, edit, activate/deactivate, remove, return policy, CSV import
//
// Uses:
//   GET    /api/pharmacy/medicines              — list tenant inventory, with stock per branch
//   GET    /api/pharmacy/medicines/:id          — one medicine (edit)
//   POST   /api/pharmacy/medicines/post         — create
//   PUT    /api/pharmacy/medicines/:id          — update
//   DELETE /api/pharmacy/medicines/:id          — soft delete
//   PATCH  /api/pharmacy/medicines/:id/status   — toggle active / inactive
//   GET    /api/pharmacy/batches?medicine_id=   — the batches shown in the detail drawer
//   PATCH  /api/pharmacy/batches/update/location/:id — move a batch to another shelf
//   GET    /api/pharmacy/medicine-data/get      — global catalog search
//   POST   /api/pharmacy/medicine-data/post     — create catalog entry (CSV import)
//   GET    /api/pharmacy/categories             — list categories
//
// Units (see ./shared/pharmacyUnits.js)
//   • Stock is counted in TABLETS and shown as "12 strips + 5 tablets" (red when it is under the
//     reorder level). units_per_pack = tablets in one strip; pack_size is only a label.
//   • Prices are PER STRIP (per pack / bottle when one pack is one unit).
//   • Reorder level and max stock are in STRIPS.
//
// Layout
//   • The page never scrolls: it fills the window below the app bar and only the list scrolls,
//     with sticky column headings and the pager always visible — desktop and phone
//   • Active / Inactive / All tabs with live counts; search waits for you to stop typing
//   • Wide space: full table · medium: fewer columns · narrow (under 760px of space): cards
//   • Click a medicine → a drawer with its stock, shelves and batches (move a batch from there)
//   • Add / Edit opens IN the page (the list stays behind it, with its filters and page);
//     leaving with unsaved changes asks first
//   • The admin of a pharmacy with several branches picks the branch whose stock is shown
//   • CSV import: drop a file, see which rows are ready before importing, then a clear result
//   • Add medicine: catalog search marks medicines that are already in your inventory, so you
//     find out while searching (with a shortcut to edit it), not after filling in the whole form

import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from "react";
import axios from "axios";
import {
  Box, Stack, Paper, Typography, Button, IconButton, TextField, MenuItem, Menu, ListItemIcon,
  ListItemText, InputAdornment, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Drawer, Switch, Chip, Badge, Alert, Snackbar, CircularProgress, LinearProgress,
  Skeleton, Autocomplete, ToggleButton, ToggleButtonGroup, Divider, useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import LocalPharmacyOutlinedIcon from "@mui/icons-material/LocalPharmacyOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import LinkIcon from "@mui/icons-material/Link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";

import { ColorRoot, cssVar, fade, toneInk } from "../theme/appColors";
import useAccess from "../hooks/useAccess";
import AppPager from "./shared/AppPager";
import BranchPicker, { usePharmacyBranch } from "./shared/BranchPicker";
import { parsePackSize, unitsPerPack, packWord, plural, rateText, inr } from "./shared/pharmacyUnits";
import useLeaveGuard from "./purchase/useLeaveGuard";
import { BATCHES_API, ExpiryText, StockText, useFitsWindow } from "./inventory/inventoryShared";
import LocationDialog from "./inventory/LocationDialog";

const API = process.env.REACT_APP_URL;
const SHELL_HEIGHT = "calc(100dvh - var(--medicines-offset, 0px))";

const EMPTY_FORM = {
  // links
  medicine_data_id: null,
  medicine_data_label: "", // display only
  category_id: "",
  // detail
  manufacturer: "",
  pack_size: "",
  units_per_pack: "",
  storage_location: "",
  unit: "",
  medicine_code: "",
  barcode: "",
  hsn_code: "",
  // pricing (per strip)
  gst_percentage: 0,
  purchase_price: 0,
  selling_price: 0,
  // stock rules (in strips)
  reorder_level: 0,
  maximum_stock: "",
  // flags
  prescription_required: false,
  status: "active",
  // return policy
  return_policy: {
    is_returnable: true,
    window_days: 7,
    condition: "unopened_only",
    requires_approval_after_window: true,
    reason: "",
    notes: "",
  },
};

const CONDITION_OPTIONS = [
  { value: "any", label: "Any condition" },
  { value: "unopened_only", label: "Unopened only" },
  { value: "sealed_pack_only", label: "Sealed pack only" },
  { value: "batch_intact", label: "Batch label intact" },
];
const CONDITION_LABEL = Object.fromEntries(CONDITION_OPTIONS.map((o) => [o.value, o.label]));

const GST_SLABS = [0, 5, 12, 18, 28];
const WINDOW_PRESETS = [7, 15, 30];
const UNIT_OPTIONS = ["strip", "bottle", "tube", "vial", "sachet", "box", "pack", "jar"];

const STATUS_TABS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

const RX_FILTERS = [{ value: "", label: "All" }, { value: "true", label: "Rx only" }, { value: "false", label: "OTC only" }];
const RETURN_FILTERS = [{ value: "", label: "All" }, { value: "true", label: "Returnable" }, { value: "false", label: "Non-returnable" }];

const DEFAULT_FILTER = { search: "", status: "active", category_id: "", prescription_required: "", returnable: "" };

const CSV_COLUMNS = [
  "medicine_name", "generic_name", "brand_name", "dosage_form", "strength", "category_name",
  "manufacturer", "pack_size", "units_per_pack", "unit", "storage_location", "medicine_code", "barcode", "hsn_code",
  "gst_percentage", "purchase_price", "selling_price", "reorder_level", "maximum_stock", "prescription_required",
];

const numeric = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const btn = { borderRadius: "10px", textTransform: "none", fontWeight: 600 };
const srOnly = {
  position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px",
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};

/* ───────────────────────────── helpers ───────────────────────────── */

const money = (n) => `₹${inr(n)}`;

// null = no policy set (default), undefined = unreadable
function parsePolicy(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return undefined; }
}

const brandIfNew = (m) =>
  m.brand_name && !String(m.medicine_name || "").toLowerCase().includes(String(m.brand_name).toLowerCase()) ? m.brand_name : null;
const detailText = (m) => [brandIfNew(m), m.strength, m.dosage_form].filter(Boolean).join(" · ");

const medicineLabel = (m) =>
  m ? `${m.medicine_name}${m.strength ? ` · ${m.strength}` : ""}${m.dosage_form ? ` · ${m.dosage_form}` : ""}` : "";

/** tablets per strip + what one pack is called, for a list row or the form */
const packOf = (m) => {
  const upp = unitsPerPack(m);
  return { upp, word: packWord(m, upp) };
};

/** "per strip" / "per bottle" */
const perWord = (m) => `per ${packOf(m).word}`;

/** "₹2.80 / tablet" — only when a strip holds more than one */
const tabletPrice = (m) => {
  const { upp } = packOf(m);
  const s = Number(m.selling_price) || 0;
  return upp > 1 && s > 0 ? `₹${rateText(s / upp)} / tablet` : "";
};

/* ── "already in inventory" check (uses the same list endpoint as the page) ── */

const norm = (v) => String(v ?? "").trim().toLowerCase();

// Same catalog medicine? By catalog id when the list returns it, otherwise by name + strength + form
function sameMedicine(row, md) {
  if (!row || !md) return false;
  if (row.medicine_data_id != null && md.id != null) return String(row.medicine_data_id) === String(md.id);
  return norm(row.medicine_name) === norm(md.medicine_name)
    && norm(row.strength) === norm(md.strength)
    && norm(row.dosage_form) === norm(md.dosage_form);
}

// Medicines in this pharmacy's inventory (active and inactive) that match a search
async function findInInventory(search) {
  const res = await axios.get(`${API}/api/pharmacy/medicines`, {
    params: { search, page: 1, limit: 100, sort_by: "created_at", sort_order: "DESC" }, withCredentials: true,
  });
  return res.data.data || [];
}

const isDuplicateError = (err) => err?.response?.status === 409 || /already/i.test(err?.response?.data?.message || "");

const toneText = (theme, tone) => theme.palette[tone][theme.palette.mode === "dark" ? "light" : "dark"];

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

/* ── how much room this page really has (after any sidebar) ── */

function useElementWidth(ref) {
  const [width, setWidth] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const set = (w) => { if (w > 0) setWidth((prev) => (prev === w ? prev : w)); };
    set(Math.round(el.getBoundingClientRect().width));
    if (typeof ResizeObserver !== "function") return undefined;
    const ro = new ResizeObserver(([entry]) => set(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* ─────────────────────────── small pieces ─────────────────────────── */

function Pill({ tone, children, outlined, title }) {
  const theme = useTheme();
  const main = tone ? theme.palette[tone].main : theme.palette.text.secondary;
  const text = tone ? toneText(theme, tone) : theme.palette.text.secondary;
  const pill = (
    <Box component="span" sx={{
      display: "inline-flex", alignItems: "center", gap: "6px", height: 24, px: "10px",
      borderRadius: "999px", fontSize: 12.5, fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap", color: text,
      ...(outlined
        ? { border: `1px solid ${alpha(main, 0.45)}` }
        : { bgcolor: alpha(main, theme.palette.mode === "dark" ? 0.2 : 0.12) }),
    }}>
      {children}
    </Box>
  );
  return title ? <Tooltip title={title}>{pill}</Tooltip> : pill;
}

function PolicyPill({ raw }) {
  const p = parsePolicy(raw);
  if (p === undefined) return <Pill>—</Pill>;
  if (p === null) return <Pill outlined title="Uses your default return policy">Default</Pill>;
  if (p.is_returnable === false) {
    return <Pill tone="error" title={p.reason || "Non-returnable"}>No returns</Pill>;
  }
  const tip = [CONDITION_LABEL[p.condition] || p.condition, p.notes].filter(Boolean).join(" · ");
  return <Pill tone="success" outlined title={tip || undefined}>{p.window_days ?? 7}-day return</Pill>;
}

function RxBadge() {
  return (
    <Tooltip title="Prescription required">
      <Box component="span" sx={(t) => ({
        display: "inline-block", px: "6px", lineHeight: "18px", borderRadius: "6px", fontSize: 11, fontWeight: 800,
        letterSpacing: ".02em", color: toneText(t, "warning"), bgcolor: alpha(t.palette.warning.main, t.palette.mode === "dark" ? 0.22 : 0.14),
        verticalAlign: "middle",
      })}>
        Rx
      </Box>
    </Tooltip>
  );
}

// "Cost ₹70.40 · 27%" — purchase price and margin on the selling price (both per strip)
function priceCaption(m, long = false) {
  const p = Number(m.purchase_price);
  const s = Number(m.selling_price);
  if (!(p > 0)) return "";
  const margin = s > 0 ? Math.round(((s - p) / s) * 100) : null;
  return `Cost ${money(p)}${margin != null ? ` · ${margin}%${long ? " margin" : ""}` : ""}`;
}

/** Stock in the list: "12 strips + 5 tablets", red under the reorder level */
function StockCell({ m, align }) {
  if (m.stock_text == null) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const { word } = packOf(m);
  const level = Number(m.reorder_level) || 0;
  const sub = m.low_stock
    ? `Low · reorder at ${level} ${plural(word, level)}`
    : m.stock_tablets
      ? `${m.batch_count} ${m.batch_count === 1 ? "batch" : "batches"}`
      : "No stock";
  return <StockText text={m.stock_text} low={m.low_stock} empty={!m.stock_tablets} sub={sub} align={align} />;
}

/** The shelves holding its stock, earliest expiry first (or its default shelf) */
function LocationText({ m, dense }) {
  const locs = m.locations || [];
  if (!locs.length) return <Typography sx={{ fontSize: dense ? 12.5 : 13, color: "text.disabled" }} noWrap>No shelf set</Typography>;
  return (
    <Tooltip title={locs.length > 1 ? locs.join(" · ") : ""}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
        <PlaceOutlinedIcon sx={{ fontSize: 15, color: cssVar("primary"), flexShrink: 0 }} />
        <Typography noWrap sx={{ fontSize: dense ? 12.5 : 13, fontWeight: 600, minWidth: 0 }}>{locs[0]}</Typography>
        {locs.length > 1 && (
          <Box component="span" sx={{ fontSize: 11.5, fontWeight: 700, color: toneInk("primary"), bgcolor: fade(cssVar("primary"), 0.1), borderRadius: 1, px: 0.6, flexShrink: 0 }}>
            +{locs.length - 1}
          </Box>
        )}
      </Stack>
    </Tooltip>
  );
}

function EmptyState({ filtered, onClear, onAdd }) {
  const Icon = filtered ? SearchOffIcon : Inventory2OutlinedIcon;
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: { xs: 6, md: 8 }, px: 3, textAlign: "center" }}>
      <Box sx={{ width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "action.hover", color: "text.secondary", mb: 1 }}>
        <Icon />
      </Box>
      <Typography variant="subtitle1" fontWeight={700}>{filtered ? "No medicines match" : "No medicines yet"}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
        {filtered
          ? "Try another name, code, barcode or shelf, or clear the filters."
          : "Add medicines one by one, or import a CSV from your supplier."}
      </Typography>
      {filtered ? (
        <Button onClick={onClear} sx={{ mt: 1, ...btn }}>Clear filters</Button>
      ) : onAdd && (
        <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={onAdd} sx={{ mt: 1, ...btn }}>Add medicine</Button>
      )}
    </Stack>
  );
}

/** One block of the form: title + hint on the left (top on phones), fields on the right */
function FormSection({ title, hint, children, sx }) {
  return (
    <Box sx={{
      display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "220px minmax(0, 1fr)" }, columnGap: 4, rowGap: 1.5,
      py: { xs: 2.25, md: 3 }, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0, pt: { xs: 1, md: 1.5 } }, ...sx,
    }}>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{title}</Typography>
        {hint && <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25, maxWidth: 260 }}>{hint}</Typography>}
      </Box>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

/* ───────────────────────────── main ───────────────────────────── */

export default function Medicines() {
  return (
    <ColorRoot>
      <MedicinesPage />
    </ColorRoot>
  );
}

function MedicinesPage() {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true }); // < 600px
  const [shellRef, shellHeight] = useFitsWindow(SHELL_HEIGHT);

  const { can } = useAccess();
  const canCreate = can("pharmacy.medicines.create");
  const canEdit = can("pharmacy.medicines.edit");
  const canDelete = can("pharmacy.medicines.delete");
  const readOnly = !canEdit && !canCreate;

  // Branch whose stock is shown (admin of several branches: any one, or all)
  const br = usePharmacyBranch({ allowAll: true, defaultAll: true }); // opens on All branches (26 Oct 2026)

  // Layout follows the space this page really has (after any sidebar)
  const width = useElementWidth(shellRef);
  const compact = width == null ? isPhone : width < 760; // cards
  const wide = width == null ? !isPhone : width >= 1200; // separate Category column
  const mid = width == null ? !isPhone : width >= 960; // GST + Returns columns
  const roomy = width == null ? !isPhone : width >= 1100; // search and filters fit on one row

  /* ─────────── list state ─────────── */
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [listError, setListError] = useState("");
  const [stockNote, setStockNote] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [filterSheet, setFilterSheet] = useState(false);

  /* ─────────── form (in the page), drawer, dialogs ─────────── */
  const [formState, setFormState] = useState({ open: false, id: null, loading: false, initial: null });
  const [detail, setDetail] = useState(null); // the medicine whose drawer is open
  const [deleteDialog, setDeleteDialog] = useState({ open: false, row: null, busy: false });
  const [csvDialog, setCsvDialog] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [rowMenu, setRowMenu] = useState({ anchor: null, row: null });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = useCallback((message, severity = "success") => setSnackbar({ open: true, message, severity }), []);

  const reload = () => setReloadKey((k) => k + 1);
  const update = useCallback((patch) => { setFilter((f) => ({ ...f, ...patch })); setPage(1); }, []);

  // Search waits until you stop typing (it used to call the API on every keystroke)
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === filter.search) return undefined;
    const t = setTimeout(() => update({ search: trimmed }), 350);
    return () => clearTimeout(t);
  }, [searchInput, filter.search, update]);

  const filterParams = useCallback((f) => {
    const params = {};
    if (f.search) params.search = f.search;
    if (f.category_id) params.category_id = f.category_id;
    if (f.prescription_required !== "") params.prescription_required = f.prescription_required;
    if (f.returnable !== "") params.returnable = f.returnable;
    return params;
  }, []);

  // Page of medicines (with stock in the chosen branch)
  const branchParams = br.params;
  useEffect(() => {
    if (br.loading) return undefined;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setListError("");
      try {
        const params = { page, limit: rowsPerPage, sort_by: "created_at", sort_order: "DESC", ...filterParams(filter), ...branchParams };
        if (filter.status) params.status = filter.status;
        const res = await axios.get(`${API}/api/pharmacy/medicines`, { params, withCredentials: true, signal: controller.signal });
        const list = res.data.data || [];
        const total = res.data.pagination?.total ?? res.data.total ?? list.length;
        setMedicines(list);
        setTotalCount(total);
        setStockNote(res.data.stock_note || "");
        setHasLoaded(true);
        if (list.length === 0 && total > 0 && page > 1) setPage(Math.max(1, Math.ceil(total / rowsPerPage)));
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;
        setListError(errMsg(err, "Couldn't load medicines. Check your connection and try again."));
        setMedicines([]);
        setTotalCount(0);
        setHasLoaded(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [page, rowsPerPage, filter, reloadKey, filterParams, branchParams, br.loading]);

  // Tab counts (one tiny request per status; re-run only when the other filters change)
  const { search: fSearch, category_id: fCat, prescription_required: fRx, returnable: fRet } = filter;
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const base = filterParams({ search: fSearch, category_id: fCat, prescription_required: fRx, returnable: fRet });
        const entries = await Promise.all(STATUS_TABS.map(async ({ value }) => {
          const params = { ...base, page: 1, limit: 1 };
          if (value !== "all") params.status = value;
          const res = await axios.get(`${API}/api/pharmacy/medicines`, { params, withCredentials: true, signal: controller.signal });
          return [value, res.data.pagination?.total ?? res.data.total ?? null];
        }));
        setCounts(Object.fromEntries(entries));
      } catch (err) {
        if (!(axios.isCancel(err) || err.code === "ERR_CANCELED")) setCounts({});
      }
    })();
    return () => controller.abort();
  }, [fSearch, fCat, fRx, fRet, reloadKey, filterParams]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/api/pharmacy/categories`, { params: { status: "active", limit: 500 }, withCredentials: true });
        setCategories(res.data.data || []);
      } catch { /* not fatal */ }
    })();
  }, []);

  const categoryName = useMemo(() => Object.fromEntries(categories.map((c) => [String(c.id), c.category_name])), [categories]);

  /* ─────────── actions ─────────── */

  const openAdd = useCallback(() => {
    setDetail(null);
    setFormState({ open: true, id: null, loading: false, initial: { ...EMPTY_FORM } });
  }, []);

  // The dashboard's "Add medicine" links here with ?add=1
  useEffect(() => {
    if (!canCreate) return;
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("add") === "1") {
        openAdd();
        qs.delete("add");
        const rest = qs.toString();
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);
      }
    } catch { /* no URL to read */ }
  }, [canCreate, openAdd]);

  const openEdit = async (row) => {
    setDetail(null);
    setFormState({ open: true, id: row.id, loading: true, initial: null });
    try {
      const res = await axios.get(`${API}/api/pharmacy/medicines/${row.id}`, { withCredentials: true });
      const m = res.data.data;
      const policy = parsePolicy(m.return_policy) || undefined;
      setFormState({
        open: true, id: row.id, loading: false,
        // batches still counted in packs (units_per_pack 1) — setting a pack size re-packs them
        packed: m.packed_batches || null,
        initial: {
          medicine_data_id: m.medicine_data_id,
          medicine_data_label: medicineLabel(m),
          category_id: m.category_id ?? "",
          manufacturer: m.manufacturer || "",
          pack_size: m.pack_size || "",
          units_per_pack: String(unitsPerPack(m)),
          storage_location: m.storage_location || "",
          unit: m.unit || "",
          medicine_code: m.medicine_code || "",
          barcode: m.barcode || "",
          hsn_code: m.hsn_code || "",
          gst_percentage: m.gst_percentage ?? 0,
          purchase_price: m.purchase_price ?? 0,
          selling_price: m.selling_price ?? 0,
          reorder_level: m.reorder_level ?? 0,
          maximum_stock: m.maximum_stock ?? "",
          prescription_required: !!m.prescription_required,
          status: m.status || "active",
          return_policy: {
            is_returnable: policy?.is_returnable !== false,
            window_days: policy?.window_days ?? 7,
            condition: policy?.condition ?? "unopened_only",
            requires_approval_after_window: policy?.requires_approval_after_window !== false,
            reason: policy?.reason || "",
            notes: policy?.notes || "",
          },
        },
      });
    } catch (err) {
      setFormState({ open: false, id: null, loading: false, initial: null });
      showMessage(errMsg(err, "Couldn't open this medicine. Please try again."), "error");
    }
  };

  const closeForm = () => setFormState({ open: false, id: null, loading: false, initial: null });

  const toggleStatus = async (row) => {
    setTogglingId(row.id);
    try {
      await axios.patch(`${API}/api/pharmacy/medicines/${row.id}/status`, {}, { withCredentials: true });
      showMessage(`${row.medicine_name} is now ${row.status === "active" ? "inactive" : "active"}`);
      reload();
    } catch (err) {
      showMessage(errMsg(err, "Couldn't change the status. Please try again."), "error");
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    const row = deleteDialog.row;
    if (!row) return;
    setDeleteDialog((d) => ({ ...d, busy: true }));
    try {
      await axios.delete(`${API}/api/pharmacy/medicines/${row.id}`, { withCredentials: true });
      showMessage(`${row.medicine_name} removed`);
      setDeleteDialog({ open: false, row: null, busy: false });
      reload();
    } catch (err) {
      showMessage(errMsg(err, "Couldn't remove this medicine. Please try again."), "error");
      setDeleteDialog((d) => ({ ...d, busy: false }));
    }
  };

  const hasActiveFilters = Boolean(filter.search || filter.category_id || filter.prescription_required !== "" || filter.returnable !== "");
  const sheetCount = (filter.category_id ? 1 : 0) + (filter.prescription_required !== "" ? 1 : 0) + (filter.returnable !== "" ? 1 : 0)
    + (br.isAdmin && br.branch ? 1 : 0);
  const clearFilters = () => { setSearchInput(""); update({ search: "", category_id: "", prescription_required: "", returnable: "" }); };

  const firstLoad = loading && medicines.length === 0 && !listError;
  const formOpen = formState.open;

  /* ─────────── shared elements ─────────── */

  const searchField = (
    <TextField
      size="small" fullWidth
      placeholder={compact ? "Search name, code or shelf" : "Search name, brand, code, barcode or shelf"}
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") update({ search: searchInput.trim() });
        if (e.key === "Escape" && searchInput) { setSearchInput(""); update({ search: "" }); }
      }}
      inputProps={{ "aria-label": "Search medicines", enterKeyHint: "search" }}
      InputProps={{
        sx: { borderRadius: "10px", bgcolor: "background.paper" },
        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        endAdornment: searchInput && (
          <InputAdornment position="end">
            <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => { setSearchInput(""); update({ search: "" }); }}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  const categorySelect = (props) => (
    <TextField select size="small" label="Category" value={filter.category_id}
      onChange={(e) => update({ category_id: e.target.value })}
      SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
      InputProps={{ sx: { borderRadius: "10px" } }} {...props}>
      <MenuItem value="">All categories</MenuItem>
      {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.category_name}</MenuItem>)}
    </TextField>
  );

  const optionSelect = (label, key, options, props) => (
    <TextField select size="small" label={label} value={filter[key]}
      onChange={(e) => update({ [key]: e.target.value })}
      SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}
      InputProps={{ sx: { borderRadius: "10px" } }} {...props}>
      {options.map((o) => <MenuItem key={o.value || "all"} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  );

  const chipGroup = (key, options) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {options.map((o) => {
        const active = filter[key] === o.value;
        return (
          <Chip key={o.value || "all"} label={o.label} clickable
            color={active ? "primary" : "default"} variant={active ? "filled" : "outlined"}
            onClick={() => update({ [key]: o.value })} sx={{ height: 36, borderRadius: "10px" }} />
        );
      })}
    </Box>
  );

  const statusControl = (m) => {
    if (!canEdit) return <Pill tone={m.status === "active" ? "success" : null}>{m.status === "active" ? "Active" : "Inactive"}</Pill>;
    return (
      <Stack direction="row" alignItems="center" spacing={0.5} onClick={(e) => e.stopPropagation()}>
        {togglingId === m.id ? (
          <Box sx={{ width: 40, display: "grid", placeItems: "center" }}><CircularProgress size={18} /></Box>
        ) : (
          <Switch size="small" checked={m.status === "active"} onChange={() => toggleStatus(m)}
            inputProps={{ "aria-label": `${m.medicine_name} active` }} />
        )}
        <Typography variant="caption" color={m.status === "active" ? "text.primary" : "text.secondary"} sx={{ fontWeight: 600 }}>
          {m.status === "active" ? "Active" : "Inactive"}
        </Typography>
      </Stack>
    );
  };

  const rowActions = (m) => (
    <Stack direction="row" spacing={0.25} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
      {canEdit && (
        <Tooltip title="Edit">
          <IconButton size="small" aria-label={`Edit ${m.medicine_name}`} onClick={() => openEdit(m)}><EditOutlinedIcon fontSize="small" /></IconButton>
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip title="More">
          <IconButton size="small" aria-label={`More actions for ${m.medicine_name}`} onClick={(e) => setRowMenu({ anchor: e.currentTarget, row: m })}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );

  const subtitleText = !hasLoaded ? "Loading…"
    : `${totalCount.toLocaleString("en-IN")} ${totalCount === 1 ? "medicine" : "medicines"}${
      hasActiveFilters ? (isPhone ? " found" : " match your filters") : !isPhone && filter.status === "active" ? " in your active inventory" : ""}`;

  const tableCols = 5 + (wide ? 1 : 0) + (mid ? 2 : 0);

  /* ─────────── render ─────────── */

  return (
    <Box ref={shellRef} sx={{
      height: shellHeight, maxHeight: "86vh", display: "flex", flexDirection: "column", overflow: "hidden",
      minWidth: 0, contain: "inline-size", bgcolor: "background.default",
    }}>
      {/* ═════════ the list (kept mounted behind the form, so its filters and page survive) ═════════ */}
      <Box sx={{ display: formOpen ? "none" : "flex", flexDirection: "column", flex: 1, minHeight: 0, p: { xs: 1.5, sm: 2, md: 3 }, pb: { xs: 1, md: 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: { xs: 1.5, md: 2 }, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 1.75 }} sx={{ minWidth: 0 }}>
            <Box sx={{
              width: { xs: 40, sm: 44 }, height: { xs: 40, sm: 44 }, borderRadius: "12px", flexShrink: 0, display: "grid", placeItems: "center",
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.12), color: "primary.main",
            }}>
              <LocalPharmacyOutlinedIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2, fontSize: { xs: 20, sm: 22 } }}>
                {readOnly || isPhone ? "Medicines" : "Manage medicines"}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: 13 }} aria-live="polite">
                {readOnly ? "Reference list (view only) · " : ""}{subtitleText}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {canCreate && (isPhone ? (
              <Tooltip title="Import from CSV">
                <IconButton aria-label="Import from CSV" onClick={() => setCsvDialog(true)}
                  sx={{ width: 40, height: 40, border: 1, borderColor: "divider", borderRadius: "10px", bgcolor: "background.paper" }}>
                  <UploadFileOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => setCsvDialog(true)}
                sx={{ ...btn, height: 40, bgcolor: "background.paper" }}>
                Import CSV
              </Button>
            ))}
            {canCreate && (
              <Button variant="contained" disableElevation startIcon={<AddIcon />} onClick={openAdd} sx={{ ...btn, height: 40, fontWeight: 700 }}>
                {isPhone ? "Add" : "Add medicine"}
              </Button>
            )}
          </Stack>
        </Stack>

        {/* List card */}
        <Paper variant="outlined" sx={compact
          ? { border: 0, bgcolor: "transparent", overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }
          : { borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

          {/* Status tabs with counts */}
          <Tabs
            value={filter.status || "all"}
            onChange={(_, v) => update({ status: v === "all" ? "" : v })}
            variant={compact ? "fullWidth" : "standard"}
            aria-label="Filter by status"
            sx={{
              px: { md: 1.5 }, minHeight: 48, borderBottom: 1, borderColor: "divider", flexShrink: 0,
              "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: 14, minHeight: 48, minWidth: { xs: 0, md: 96 }, px: { xs: 1, md: 2 } },
            }}
          >
            {STATUS_TABS.map((t) => {
              const selected = (filter.status || "all") === t.value;
              return (
                <Tab key={t.value} value={t.value} label={
                  <Stack direction="row" alignItems="center" spacing={0.75} component="span">
                    <span>{t.label}</span>
                    {counts[t.value] != null && (
                      <Box component="span" sx={{
                        minWidth: 22, height: 20, px: 0.75, borderRadius: "999px", fontSize: 12, lineHeight: "20px", textAlign: "center", ...numeric,
                        bgcolor: selected ? alpha(theme.palette.primary.main, 0.12) : "action.selected",
                        color: selected ? "primary.main" : "text.secondary",
                      }}>
                        {Number(counts[t.value]).toLocaleString("en-IN")}
                      </Box>
                    )}
                  </Stack>
                } />
              );
            })}
          </Tabs>

          {/* Toolbar */}
          {compact ? (
            <Box sx={{ flexShrink: 0 }}>
              <Stack direction="row" spacing={1} sx={{ py: 1.5 }}>
                {searchField}
                <Badge color="primary" badgeContent={sheetCount} overlap="rectangular" sx={{ "& .MuiBadge-badge": { top: 4, right: 4 } }}>
                  <Button variant="outlined" color="inherit" onClick={() => setFilterSheet(true)} aria-label="Filters"
                    sx={{ minWidth: 40, height: 40, px: 1.25, borderRadius: "10px", borderColor: "divider", bgcolor: "background.paper", ...btn }}>
                    <TuneIcon fontSize="small" />
                    <Box component="span" sx={{ ml: 0.75, display: { xs: "none", sm: "inline" } }}>Filters</Box>
                  </Button>
                </Badge>
              </Stack>
              {sheetCount > 0 && (
                <Stack direction="row" spacing={1} sx={{ pb: 1.5, overflowX: "auto" }}>
                  {br.isAdmin && br.branch && <Chip size="small" label={br.branch} onDelete={() => br.setBranch("")} />}
                  {filter.category_id && <Chip size="small" label={categoryName[String(filter.category_id)] || "Category"} onDelete={() => update({ category_id: "" })} />}
                  {filter.prescription_required !== "" && <Chip size="small" label={filter.prescription_required === "true" ? "Rx only" : "OTC only"} onDelete={() => update({ prescription_required: "" })} />}
                  {filter.returnable !== "" && <Chip size="small" label={filter.returnable === "true" ? "Returnable" : "Non-returnable"} onDelete={() => update({ returnable: "" })} />}
                </Stack>
              )}
            </Box>
          ) : (
            // one row when there's room; on tablets the search gets its own row so it stays readable
            <Box sx={roomy
              ? { display: "flex", alignItems: "center", gap: 1.5, p: 2, flexShrink: 0 }
              : { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1.5, p: 2, flexShrink: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center"
                sx={roomy ? { flex: "1 1 auto", maxWidth: 400, minWidth: 0 } : { gridColumn: "1 / -1", minWidth: 0 }}>
                {searchField}
                {!roomy && <BranchPicker state={br} sx={{ flexShrink: 0 }} />}
                {!roomy && hasActiveFilters && (
                  <Button onClick={clearFilters} startIcon={<ClearIcon />} sx={{ ...btn, height: 40, flexShrink: 0 }}>Clear</Button>
                )}
              </Stack>
              {categorySelect(roomy ? { sx: { width: 180, flexShrink: 0 } } : { fullWidth: true })}
              {optionSelect("Prescription", "prescription_required", RX_FILTERS, roomy ? { sx: { width: 140, flexShrink: 0 } } : { fullWidth: true })}
              {optionSelect("Returns", "returnable", RETURN_FILTERS, roomy ? { sx: { width: 160, flexShrink: 0 } } : { fullWidth: true })}
              {roomy && hasActiveFilters && (
                <Button onClick={clearFilters} startIcon={<ClearIcon />} sx={{ ...btn, height: 40, flexShrink: 0 }}>Clear filters</Button>
              )}
              {roomy && <Box sx={{ ml: "auto", flexShrink: 0 }}><BranchPicker state={br} /></Box>}
            </Box>
          )}

          <Box sx={{ height: 2, flexShrink: 0 }}>{loading && !firstLoad && <LinearProgress sx={{ height: 2 }} />}</Box>

          {listError && (
            <Alert severity="error" sx={{ mx: compact ? 0 : 2, my: 2, borderRadius: "10px", flexShrink: 0 }}
              action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
              {listError}
            </Alert>
          )}
          {stockNote && !listError && (
            <Alert severity="info" sx={{ mx: compact ? 0 : 2, mb: 1, borderRadius: "10px", flexShrink: 0, py: 0 }}>
              Stock isn’t shown: {stockNote}
            </Alert>
          )}

          {/* Results */}
          {compact ? (
            <Box sx={{
              flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", pb: 0.5,
              opacity: loading && !firstLoad ? 0.55 : 1, transition: "opacity .15s",
            }}>
              {firstLoad ? (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Paper key={i} variant="outlined" sx={{ borderRadius: "14px", p: 2 }}>
                      <Skeleton width="60%" height={22} /><Skeleton width="45%" /><Skeleton width="35%" height={28} sx={{ mt: 1 }} />
                    </Paper>
                  ))}
                </Box>
              ) : medicines.length > 0 ? (
                <Box component="ul" aria-label="Medicines" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" } }}>
                  {medicines.map((m) => (
                    <Box component="li" key={m.id} sx={{ display: "flex", minWidth: 0 }}>
                      <Paper variant="outlined" onClick={() => setDetail(m)}
                        sx={{
                          flex: 1, minWidth: 0, borderRadius: "14px", p: 2, pb: 1.25, display: "flex", flexDirection: "column", gap: 1.25,
                          opacity: m.status === "active" ? 1 : 0.75, cursor: "pointer", "&:hover": { borderColor: "primary.main" },
                        }}>
                        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ overflowWrap: "anywhere" }}>
                              {m.medicine_name} {m.prescription_required ? <RxBadge /> : null}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div" noWrap>
                              {[detailText(m), m.pack_label].filter(Boolean).join(" · ") || "—"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div" noWrap>
                              {[m.category_name, m.manufacturer].filter(Boolean).join(" · ")}
                            </Typography>
                          </Box>
                          {rowActions(m)}
                        </Stack>
                        <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 1.5, alignItems: "start" }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary" }}>Stock</Typography>
                            <StockCell m={m} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary" }}>Location</Typography>
                            <LocationText m={m} dense />
                          </Box>
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 17, ...numeric }}>
                            {money(m.selling_price)}{" "}
                            <Box component="span" sx={{ fontSize: 12.5, fontWeight: 500, color: "text.secondary" }}>{perWord(m)}</Box>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="div" noWrap sx={numeric}>
                            {[tabletPrice(m), priceCaption(m, true), `GST ${Number(m.gst_percentage || 0)}%`].filter(Boolean).join(" · ")}
                          </Typography>
                        </Box>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ minHeight: 32 }}>
                          {statusControl(m)}
                          <PolicyPill raw={m.return_policy} />
                        </Stack>
                      </Paper>
                    </Box>
                  ))}
                </Box>
              ) : !listError && !loading && (
                <Paper variant="outlined" sx={{ borderRadius: "14px" }}>
                  <EmptyState filtered={hasActiveFilters} onClear={clearFilters} onAdd={canCreate ? openAdd : null} />
                </Paper>
              )}
            </Box>
          ) : (
            <TableContainer sx={{ flex: "1 1 auto", minHeight: 0, position: "relative" }}>
              {/* Fixed layout: every column has a set width and Medicine takes the rest, so long names
                  never push the table wider than the card */}
              <Table stickyHeader sx={{
                minWidth: 700, tableLayout: "fixed",
                "& th": {
                  fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: "text.secondary",
                  whiteSpace: "nowrap", py: 1.25, bgcolor: "background.paper",
                  backgroundImage: `linear-gradient(${alpha(theme.palette.text.primary, 0.03)}, ${alpha(theme.palette.text.primary, 0.03)})`,
                },
                "& td": { py: 1.1 },
                "& tr:last-of-type td": { borderBottom: 0 },
                ...(width != null && width < 1100 && { "& th, & td": { px: 1.25 } }),
              }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Medicine</TableCell>
                    {wide && <TableCell sx={{ width: 150 }}>Category</TableCell>}
                    <TableCell sx={{ width: 176 }}>Stock</TableCell>
                    <TableCell sx={{ width: 168 }}>Location</TableCell>
                    <TableCell align="right" sx={{ width: 150 }}>Price / strip</TableCell>
                    {mid && <TableCell align="right" sx={{ width: 64 }}>GST</TableCell>}
                    {mid && <TableCell sx={{ width: 132 }}>Returns</TableCell>}
                    <TableCell sx={{ width: 122 }}>Status</TableCell>
                    <TableCell align="right" sx={{ width: canDelete ? 88 : 56 }}><Box component="span" sx={srOnly}>Actions</Box></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={{ opacity: loading && !firstLoad ? 0.55 : 1, transition: "opacity .15s" }}>
                  {firstLoad && Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      {Array.from({ length: tableCols + 1 }).map((__, j) => <TableCell key={j}><Skeleton width={j === 0 ? 180 : 70} /></TableCell>)}
                    </TableRow>
                  ))}
                  {medicines.map((m) => (
                    <TableRow key={m.id} hover onClick={() => setDetail(m)}
                      sx={{ cursor: "pointer", "& td": { opacity: m.status === "active" ? 1 : 0.7 } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                          {m.medicine_name} {m.prescription_required ? <RxBadge /> : null}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="div" noWrap>
                          {[detailText(m), m.pack_label, m.medicine_code && `#${m.medicine_code}`].filter(Boolean).join(" · ") || "—"}
                        </Typography>
                        {!wide && (
                          <Typography variant="caption" color="text.secondary" component="div" noWrap>
                            {[m.category_name, m.manufacturer].filter(Boolean).join(" · ")}
                          </Typography>
                        )}
                      </TableCell>
                      {wide && (
                        <TableCell>
                          <Typography variant="body2" noWrap title={m.category_name || undefined}>{m.category_name || "—"}</Typography>
                          <Typography variant="caption" color="text.secondary" component="div" noWrap title={m.manufacturer || undefined}>{m.manufacturer || ""}</Typography>
                        </TableCell>
                      )}
                      <TableCell><StockCell m={m} /></TableCell>
                      <TableCell sx={{ overflow: "hidden" }}><LocationText m={m} /></TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} sx={numeric}>{money(m.selling_price)}</Typography>
                        <Typography variant="caption" color="text.secondary" component="div" noWrap sx={numeric}
                          title={priceCaption(m) ? `${priceCaption(m, true)} (per ${packOf(m).word})` : undefined}>
                          {tabletPrice(m) || (packOf(m).upp > 1 ? priceCaption(m) : perWord(m))}
                        </Typography>
                      </TableCell>
                      {mid && <TableCell align="right"><Typography variant="body2" sx={numeric}>{Number(m.gst_percentage || 0)}%</Typography></TableCell>}
                      {mid && <TableCell><PolicyPill raw={m.return_policy} /></TableCell>}
                      <TableCell>{statusControl(m)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{rowActions(m)}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && medicines.length === 0 && !listError && (
                    <TableRow>
                      <TableCell colSpan={tableCols + 1} sx={{ p: 0 }}>
                        <EmptyState filtered={hasActiveFilters} onClear={clearFilters} onAdd={canCreate ? openAdd : null} />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination — the shared pager (at most three page numbers) */}
          <AppPager
            page={page}
            pageSize={rowsPerPage}
            total={totalCount}
            onPageChange={setPage}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageSizeChange={(n) => { setRowsPerPage(n); setPage(1); }}
            disabled={loading}
            sx={compact ? { bgcolor: "transparent", px: 0.5 } : undefined}
          />
        </Paper>
      </Box>

      {/* ═════════ Add / edit — in the page, in place of the list ═════════ */}
      <MedicineForm
        state={formState}
        categories={categories}
        isPhone={isPhone}
        onClose={closeForm}
        onSaved={(message) => { closeForm(); showMessage(message); reload(); }}
        onEditExisting={canEdit ? (row) => openEdit(row) : null}
      />

      {/* Row menu */}
      <Menu anchorEl={rowMenu.anchor} open={Boolean(rowMenu.anchor)} onClose={() => setRowMenu({ anchor: null, row: null })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        {canEdit && rowMenu.row && (
          <MenuItem onClick={() => { const r = rowMenu.row; setRowMenu({ anchor: null, row: null }); openEdit(r); }}>
            <ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {canDelete && rowMenu.row && (
          <MenuItem onClick={() => { const r = rowMenu.row; setRowMenu({ anchor: null, row: null }); setDeleteDialog({ open: true, row: r, busy: false }); }}
            sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "inherit" }}><DeleteOutlineIcon fontSize="small" /></ListItemIcon><ListItemText>Remove…</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Phone / narrow: filter sheet */}
      <Drawer anchor="bottom" open={compact && filterSheet} onClose={() => setFilterSheet(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88vh" } }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mt: 1.25 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pt: 1, pb: 0.5 }}>
          <Typography variant="h6" fontWeight={700}>Filters</Typography>
          <IconButton aria-label="Close filters" onClick={() => setFilterSheet(false)}><CloseIcon /></IconButton>
        </Stack>
        <Stack spacing={2.5} sx={{ px: 2.5, pt: 1.5, pb: 2, overflowY: "auto" }}>
          {br.multi && <BranchPicker state={br} sx={{ width: "100%" }} />}
          {categorySelect({ fullWidth: true })}
          <Box>
            <Typography variant="overline" color="text.secondary" component="div">Prescription</Typography>
            {chipGroup("prescription_required", RX_FILTERS)}
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" component="div">Returns</Typography>
            {chipGroup("returnable", RETURN_FILTERS)}
          </Box>
        </Stack>
        <Divider />
        <Stack direction="row" spacing={1.5} sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}>
          <Button fullWidth variant="outlined" onClick={() => update({ category_id: "", prescription_required: "", returnable: "" })} sx={{ ...btn, height: 48 }}>Reset</Button>
          <Button fullWidth variant="contained" disableElevation onClick={() => setFilterSheet(false)} sx={{ ...btn, height: 48 }}>
            {loading ? "Show results" : `Show ${totalCount.toLocaleString("en-IN")} ${totalCount === 1 ? "result" : "results"}`}
          </Button>
        </Stack>
      </Drawer>

      {/* Detail drawer: stock, shelves and batches */}
      <MedicineDrawer
        medicine={detail}
        isPhone={isPhone}
        branch={br}
        canEdit={canEdit}
        onClose={() => setDetail(null)}
        onEdit={(m) => openEdit(m)}
        onLocationSaved={(message) => { showMessage(message); reload(); }}
      />

      {/* Remove */}
      <Dialog open={deleteDialog.open} onClose={() => !deleteDialog.busy && setDeleteDialog({ open: false, row: null, busy: false })}
        maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "18px" } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Remove {deleteDialog.row?.medicine_name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            It won't appear in POS or billing any more. Existing stock records and sale history are kept.
          </Typography>
          {canEdit && deleteDialog.row?.status === "active" && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Only pausing it for a while? Use the Active switch instead — you can turn it back on any time.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, row: null, busy: false })} disabled={deleteDialog.busy} sx={btn}>Cancel</Button>
          <Button color="error" variant="contained" disableElevation onClick={confirmDelete} disabled={deleteDialog.busy}
            startIcon={deleteDialog.busy ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon />} sx={btn}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV import */}
      <CsvImportDialog
        open={csvDialog}
        isPhone={isPhone}
        onClose={() => setCsvDialog(false)}
        categories={categories}
        onComplete={() => { setCsvDialog(false); reload(); }}
        showMessage={showMessage}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={(_, r) => { if (r !== "clickaway") setSnackbar((s) => ({ ...s, open: false })); }}
        anchorOrigin={{ vertical: "bottom", horizontal: isPhone ? "center" : "left" }}>
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%", borderRadius: "10px" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ============================================================
   Detail drawer — what a pharmacist needs at the counter:
   how much is left, where it is, and every batch (FEFO first)
============================================================ */
function MedicineDrawer({ medicine, isPhone, branch, canEdit, onClose, onEdit, onLocationSaved }) {
  const [batches, setBatches] = useState(null);
  const [error, setError] = useState("");
  const [locFor, setLocFor] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const open = Boolean(medicine);
  const id = medicine?.id;
  const branchParams = branch.params;

  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    setError("");
    axios
      .get(BATCHES_API, {
        params: { medicine_id: id, in_stock_only: 1, sort_by: "expiry_date", sort_order: "ASC", limit: 100, ...branchParams },
        withCredentials: true, signal: controller.signal,
      })
      .then((r) => setBatches(r.data.data || []))
      .catch((e) => {
        if (axios.isCancel(e) || e.code === "ERR_CANCELED") return;
        setError(errMsg(e, "Couldn't load the batches."));
        setBatches([]);
      });
    return () => controller.abort();
  }, [id, branchParams, reloadKey]);

  useEffect(() => { if (!open) setBatches(null); }, [open]);

  const m = medicine || {};
  const { upp, word } = packOf(m);
  const level = Number(m.reorder_level) || 0;
  const showBranch = branch.multi && !branch.branch;

  const stat = (label, children, sub) => (
    <Box sx={{ minWidth: 0, p: 1.5, borderRadius: 2.5, border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary" }}>{label}</Typography>
      <Box sx={{ mt: 0.25 }}>{children}</Box>
      {sub && <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.25 }}>{sub}</Typography>}
    </Box>
  );

  return (
    <Drawer
      anchor={isPhone ? "bottom" : "right"}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: isPhone
          ? { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "92dvh", display: "flex", flexDirection: "column" }
          : { width: 480, maxWidth: "100vw", display: "flex", flexDirection: "column", bgcolor: "background.default" },
      }}
    >
      {open && (
        <>
          <Box sx={{ px: 2.5, pt: isPhone ? 1 : 2, pb: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
            {isPhone && <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mb: 1 }} />}
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.25 }}>
                  {m.medicine_name} {m.prescription_required ? <RxBadge /> : null}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                  {[detailText(m), m.category_name, m.manufacturer].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
              <IconButton aria-label="Close" onClick={onClose} sx={{ mt: -0.5, mr: -1 }}><CloseIcon /></IconButton>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2.5, py: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 1.25 }}>
              {stat(
                branch.branch ? `Stock · ${branch.branch}` : branch.multi && branch.isAdmin ? "Stock · all branches" : "Stock",
                <StockCell m={m} />,
              )}
              {stat("Location", <LocationText m={m} />, m.storage_location ? `Default shelf: ${m.storage_location}` : "No default shelf")}
              {stat(
                "Pack",
                <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{upp > 1 ? `${upp} tablets per ${word}` : `Sold by the ${word}`}</Typography>,
                m.pack_size ? `Label: ${m.pack_size}` : null,
              )}
              {stat(
                `Price ${perWord(m)}`,
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, ...numeric }}>{money(m.selling_price)}</Typography>,
                [tabletPrice(m), priceCaption(m, true)].filter(Boolean).join(" · ") || null,
              )}
              {stat(
                `Reorder level (${plural(word, 2)})`,
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, ...numeric }}>{level ? `${level} ${plural(word, level)}` : "Not set"}</Typography>,
                m.maximum_stock ? `Max ${m.maximum_stock} ${plural(word, m.maximum_stock)}` : null,
              )}
              {stat("GST · HSN", <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{Number(m.gst_percentage || 0)}%</Typography>, m.hsn_code ? `HSN ${m.hsn_code}` : null)}
            </Box>

            <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mt: 3, mb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Batches with stock</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>First to expire first</Typography>
            </Stack>
            {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
            {batches == null ? (
              <Stack spacing={1}>{[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 2 }} />)}</Stack>
            ) : !batches.length && !error ? (
              <Paper variant="outlined" sx={{ borderRadius: 2.5, p: 2.5, textAlign: "center" }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>No stock{branch.branch ? ` in ${branch.branch}` : ""}</Typography>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>Batches appear here when a purchase order is received.</Typography>
              </Paper>
            ) : (
              <Stack spacing={1}>
                {batches.map((b) => (
                  <Paper key={b.id} variant="outlined" sx={{ borderRadius: 2.5, px: 1.5, py: 1.25 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1.2fr)", gap: 1.25, alignItems: "start" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} noWrap>{b.batch_number}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                          {b.units_per_pack > 1 ? `${b.units_per_pack} / ${b.pack_word}` : `1 ${b.pack_word}`}
                          {showBranch ? ` · ${b.branch || "No branch"}` : ""}
                        </Typography>
                      </Box>
                      <ExpiryText date={b.expiry_date} days={b.days_to_expiry} status={b.stock_status} />
                      <StockText text={b.stock_text} tablets={b.units_per_pack > 1 ? b.quantity_available : null} align="right" />
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                        <PlaceOutlinedIcon sx={{ fontSize: 15, color: b.location ? cssVar("primary") : "text.disabled" }} />
                        <Typography noWrap sx={{ fontSize: 12.5, fontWeight: b.location && !b.location_is_default ? 600 : 500, fontStyle: b.location_is_default ? "italic" : "normal", color: b.location ? "text.primary" : "text.disabled" }}>
                          {b.location || "No shelf"}{b.location_is_default ? " (default)" : ""}
                        </Typography>
                      </Stack>
                      {canEdit && (
                        <Button size="small" onClick={() => setLocFor({ ...b, medicine_name: m.medicine_name })} sx={{ ...btn, height: 28, flexShrink: 0 }}>
                          Move
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          {canEdit && (
            <Box sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: "divider", bgcolor: "background.paper", flexShrink: 0, pb: isPhone ? "calc(12px + env(safe-area-inset-bottom))" : 1.5 }}>
              <Button fullWidth variant="contained" disableElevation startIcon={<EditOutlinedIcon />} onClick={() => onEdit(m)} sx={{ ...btn, height: 44 }}>
                Edit medicine
              </Button>
            </Box>
          )}

          <LocationDialog
            open={Boolean(locFor)}
            batch={locFor}
            suggestions={[...(batches || []).map((b) => b.location), ...(m.locations || [])]}
            onClose={() => setLocFor(null)}
            onSaved={(row, message) => {
              setLocFor(null);
              setBatches((prev) => (prev || []).map((b) => (b.id === row.id ? { ...b, ...row } : b)));
              setReloadKey((k) => k + 1);
              onLocationSaved(message || "Location saved");
            }}
          />
        </>
      )}
    </Drawer>
  );
}

/* ============================================================
   Add / edit form — in the page, sectioned, with inline validation
   Identity · Pack & storage · Pricing per strip · Stock levels in strips · Returns
============================================================ */
function MedicineForm({ state, categories, isPhone, onClose, onSaved, onEditExisting }) {
  const { open, id: editingId, loading, initial, packed } = state;
  const isEdit = Boolean(editingId);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [start, setStart] = useState(null); // the form as it opened — to know about unsaved changes
  const [uppTouched, setUppTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [leavePrompt, setLeavePrompt] = useState(null); // { proceed }
  const [repackPrompt, setRepackPrompt] = useState(false); // "recount the batches in packs?"

  // catalog search
  const [mdOptions, setMdOptions] = useState([]);
  const [mdQuery, setMdQuery] = useState("");
  const [mdLoading, setMdLoading] = useState(false);
  const [mdValue, setMdValue] = useState(null);

  // "already in your inventory" — known while searching, so nobody fills the whole form for nothing
  const [existing, setExisting] = useState(null); // inventory row of the picked medicine, if it's already there
  const [checking, setChecking] = useState(false);
  const [serverDuplicate, setServerDuplicate] = useState("");
  const pickToken = useRef(0);

  useEffect(() => {
    if (open && initial) {
      const next = { ...EMPTY_FORM, ...initial, return_policy: { ...EMPTY_FORM.return_policy, ...initial.return_policy } };
      setForm(next);
      setStart(next);
      setUppTouched(Boolean(initial.units_per_pack));
      setSubmitted(false);
      setSaveError("");
      setMdValue(null);
      setMdQuery("");
      setMdOptions([]);
      setExisting(null);
      setChecking(false);
      setServerDuplicate("");
      setLeavePrompt(null);
      setRepackPrompt(false);
      pickToken.current += 1;
    }
  }, [open, initial]);

  const dirty = open && !loading && !!start && JSON.stringify(form) !== JSON.stringify(start);

  // Moving to another page with unsaved changes asks first
  useLeaveGuard(dirty && !saving, (proceed) => setLeavePrompt({ proceed }));

  const tryClose = () => {
    if (saving) return;
    if (dirty) setLeavePrompt({ proceed: onClose });
    else onClose();
  };

  // Catalog search + which of the results this pharmacy already stocks (both at once)
  useEffect(() => {
    let active = true;
    if (mdQuery.length < 2) { setMdOptions([]); setMdLoading(false); return undefined; }
    setMdLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [catalog, stocked] = await Promise.all([
          axios.get(`${API}/api/pharmacy/medicine-data/get`, {
            params: { search: mdQuery, status: "active", limit: 20 }, withCredentials: true,
          }).then((res) => res.data.data || []),
          findInInventory(mdQuery).catch(() => []), // if this fails, the check on pick still runs
        ]);
        if (active) setMdOptions(catalog.map((o) => ({ ...o, _inventory: stocked.find((r) => sameMedicine(r, o)) || null })));
      } catch {
        if (active) setMdOptions([]);
      } finally {
        if (active) setMdLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [mdQuery]);

  const pickMedicine = async (val) => {
    const token = (pickToken.current += 1);
    setMdValue(val);
    setServerDuplicate("");
    setForm((f) => ({ ...f, medicine_data_id: val?.id || null, medicine_data_label: val ? medicineLabel(val) : "" }));
    setExisting(val?._inventory || null);
    setChecking(false);
    if (!val || val._inventory) return;
    // The search may have matched on another word (e.g. the generic name), so confirm by this medicine's own name
    setChecking(true);
    try {
      const rows = await findInInventory(val.medicine_name);
      if (pickToken.current === token) setExisting(rows.find((r) => sameMedicine(r, val)) || null);
    } catch {
      /* the server still refuses a duplicate on save */
    } finally {
      if (pickToken.current === token) setChecking(false);
    }
  };

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setPolicy = (patch) => setForm((f) => ({ ...f, return_policy: { ...f.return_policy, ...patch } }));
  const policy = form.return_policy;

  // The pack label fills in "tablets per strip" until you type that yourself
  const setPackLabel = (text) => {
    const parsed = parsePackSize(text);
    setForm((f) => ({ ...f, pack_size: text, ...(!uppTouched && parsed ? { units_per_pack: String(parsed) } : {}) }));
  };

  const uppNum = Number(form.units_per_pack);
  const uppValid = form.units_per_pack !== "" && Number.isInteger(uppNum) && uppNum >= 1 && uppNum <= 10000;
  const upp = uppValid ? uppNum : 1;
  const word = packWord({ unit: form.unit }, uppValid ? upp : 2); // "strip" until told otherwise
  const words = plural(word, 2);

  const purchase = Number(form.purchase_price) || 0;
  const selling = Number(form.selling_price) || 0;
  const gst = Number(form.gst_percentage);
  const marginText = selling > 0 && purchase > 0
    ? `Margin ${money(selling - purchase)} (${Math.round(((selling - purchase) / selling) * 100)}%)`
    : "";
  const belowCost = selling > 0 && purchase > 0 && selling < purchase;
  const reorder = Number(form.reorder_level) || 0;
  const maxStock = form.maximum_stock === "" ? null : Number(form.maximum_stock);

  const uppHint = !uppValid ? "" : upp === 1
    ? `Sold whole — one ${word} at a time`
    : selling > 0
      ? `${money(selling)} per ${word} = ₹${rateText(selling / upp)} per tablet`
      : `${upp} tablets in one ${word}`;

  const errors = {
    medicine: isEdit ? ""
      : !form.medicine_data_id ? "Pick the medicine from the catalog"
        : existing ? "Already in your inventory"
          : serverDuplicate,
    category: !form.category_id ? "Choose a category" : "",
    upp: !uppValid ? "Enter the tablets in one strip (1 for a bottle, tube or injection)" : "",
    location: form.storage_location.trim().length > 100 ? "At most 100 characters" : "",
    gst: Number.isNaN(gst) || gst < 0 || gst > 100 ? "Enter a GST between 0 and 100" : "",
    max: maxStock != null && maxStock > 0 && maxStock < reorder ? "Can't be below the reorder level" : "",
    window: policy.is_returnable && !(Number(policy.window_days) >= 0) ? "Enter the number of days" : "",
  };
  const errorCount = Object.values(errors).filter(Boolean).length;
  const show = (key) => (submitted ? errors[key] : "");
  const duplicate = !isEdit && Boolean(existing);
  const dimmed = duplicate ? { opacity: 0.4, pointerEvents: "none", transition: "opacity .15s" } : { transition: "opacity .15s" };
  const uppChanged = isEdit && start && String(start.units_per_pack) !== String(form.units_per_pack) && uppValid;
  // Its pack size is being set for the first time (it was 1) and some batches are still counted
  // in packs → saving recounts them: packs × tablets per strip (the server does it, with a ledger row each)
  const repack = isEdit && start && Number(start.units_per_pack) === 1 && uppValid && upp > 1 && packed?.batches > 0
    ? { ...packed, tablets: packed.packs * upp } : null;

  const handleSave = async (confirmed = false) => {
    setSubmitted(true);
    setSaveError("");
    if (errorCount > 0) return;
    if (repack && repack.with_stock > 0 && !confirmed) {
      setRepackPrompt(true);
      return;
    }
    setRepackPrompt(false);

    const returnPolicy = policy.is_returnable
      ? {
        is_returnable: true,
        window_days: Number(policy.window_days) || 7,
        condition: policy.condition || "unopened_only",
        requires_approval_after_window: !!policy.requires_approval_after_window,
        notes: policy.notes?.trim() || null,
      }
      : {
        is_returnable: false,
        reason: policy.reason?.trim() || "This medicine is marked as non-returnable",
      };

    const payload = {
      medicine_data_id: form.medicine_data_id,
      category_id: form.category_id,
      manufacturer: form.manufacturer || null,
      pack_size: form.pack_size || null,
      units_per_pack: uppNum,
      storage_location: form.storage_location.trim() || null,
      unit: form.unit || null,
      medicine_code: form.medicine_code || null,
      barcode: form.barcode || null,
      hsn_code: form.hsn_code || null,
      gst_percentage: Number(form.gst_percentage) || 0,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      maximum_stock: form.maximum_stock === "" ? null : Number(form.maximum_stock),
      prescription_required: form.prescription_required,
      return_policy: returnPolicy,
      status: form.status,
    };

    setSaving(true);
    try {
      if (isEdit) {
        delete payload.medicine_data_id; // cannot change on update
        const res = await axios.put(`${API}/api/pharmacy/medicines/${editingId}`, payload, { withCredentials: true });
        onSaved(res.data?.repacked ? res.data.message : "Medicine updated");
      } else {
        await axios.post(`${API}/api/pharmacy/medicines/post`, payload, { withCredentials: true });
        onSaved("Medicine added to inventory");
      }
    } catch (err) {
      if (!isEdit && isDuplicateError(err)) {
        // Server says it's already there: point at it instead of a generic failure
        const message = errMsg(err, "This medicine is already in your inventory");
        setServerDuplicate(message);
        if (mdValue) {
          findInInventory(mdValue.medicine_name)
            .then((rows) => { const row = rows.find((r) => sameMedicine(r, mdValue)); if (row) setExisting(row); else setSaveError(message); })
            .catch(() => setSaveError(message));
        } else {
          setSaveError(message);
        }
      } else {
        setSaveError(errMsg(err, "The medicine wasn't saved. Please try again."));
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const field = (props) => (
    <TextField size="small" fullWidth InputProps={{ sx: { borderRadius: "10px" }, ...(props.InputProps || {}) }} {...props} />
  );
  const moneyField = (label, key, extra = {}) => field({
    label, value: form[key], onChange: (e) => set({ [key]: e.target.value.replace(/[^\d.]/g, "") }),
    inputProps: { inputMode: "decimal" },
    InputProps: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, ...extra,
  });
  const countField = (label, key, extra = {}) => field({
    label, value: form[key], onChange: (e) => set({ [key]: e.target.value.replace(/\D/g, "") }),
    inputProps: { inputMode: "numeric" }, ...extra,
  });

  const grid = (cols) => ({ display: "grid", gap: 1.5, gridTemplateColumns: cols });

  const saveButton = duplicate && onEditExisting ? (
    // The medicine is already stocked: the main action becomes "edit that one"
    <Button variant="contained" disableElevation onClick={() => onEditExisting(existing)} startIcon={<EditOutlinedIcon />}
      sx={{ ...btn, height: 40, px: 2.5, fontWeight: 700, flex: { xs: 1, sm: "0 0 auto" } }}>
      Edit existing medicine
    </Button>
  ) : (
    <Button variant="contained" disableElevation onClick={() => handleSave()} disabled={saving || loading || !initial || duplicate || checking}
      startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
      sx={{ ...btn, height: 40, px: 3, fontWeight: 700, flex: { xs: 1, sm: "0 0 auto" } }}>
      {saving ? "Saving…" : isEdit ? "Save changes" : "Add to inventory"}
    </Button>
  );

  const statusLine = duplicate ? "Already in your inventory — no need to add it again"
    : submitted && errorCount ? `Fix ${errorCount} highlighted ${errorCount === 1 ? "field" : "fields"} to save`
      : dirty ? "Unsaved changes" : "";

  return (
    <Box component="section" aria-labelledby="medicine-form-title"
      sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default" }}>
      {/* Header: back, title, actions */}
      <Box sx={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 1.25, px: { xs: 1, sm: 2, md: 3 }, py: 1.25,
        bgcolor: "background.paper", borderBottom: 1, borderColor: "divider",
      }}>
        <Tooltip title="Back to medicines">
          <IconButton aria-label="Back to medicines" onClick={tryClose} disabled={saving}><ArrowBackIcon /></IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id="medicine-form-title" component="h2" sx={{ fontWeight: 700, fontSize: { xs: 17, md: 19 }, letterSpacing: "-0.01em" }} noWrap>
            {isEdit ? `Edit ${form.medicine_data_label ? form.medicine_data_label.split(" · ")[0] : "medicine"}` : "Add medicine to inventory"}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
            {isEdit ? (loading ? "Loading…" : form.medicine_data_label) : "Pick it from the catalog, then set its pack, price and stock levels"}
          </Typography>
        </Box>
        {!isPhone && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            {statusLine && (
              <Typography sx={{
                fontSize: 12.5, mr: 1, fontWeight: duplicate || (submitted && errorCount) ? 600 : 400,
                color: duplicate ? "warning.dark" : submitted && errorCount ? "error.main" : "text.secondary",
              }}>
                {statusLine}
              </Typography>
            )}
            <Button onClick={tryClose} disabled={saving} sx={{ ...btn, height: 40 }}>Cancel</Button>
            {saveButton}
          </Stack>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, md: 2.5 } }}>
        <Paper variant="outlined" sx={{ maxWidth: 1040, mx: "auto", borderRadius: "16px", px: { xs: 2, md: 3.5 }, py: { xs: 0.5, md: 1 } }}>
          {loading || !initial ? (
            <Stack spacing={2} sx={{ py: 3 }}>
              <Skeleton variant="rounded" height={44} sx={{ borderRadius: "10px" }} />
              <Box sx={grid("1fr 1fr")}><Skeleton variant="rounded" height={40} /><Skeleton variant="rounded" height={40} /></Box>
              <Box sx={grid("repeat(4, 1fr)")}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={40} />)}</Box>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: "12px" }} />
            </Stack>
          ) : (
            <>
              {/* Identity */}
              <FormSection title="Identity" hint="Which medicine this is, and how it's coded on bills">
                <Stack spacing={1.5}>
                  {isEdit ? (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1.25, borderRadius: "10px", bgcolor: "action.hover" }}>
                      <LinkIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{form.medicine_data_label}</Typography>
                        <Typography variant="caption" color="text.secondary">Linked to the catalog — this can't be changed</Typography>
                      </Box>
                    </Stack>
                  ) : (
                    <Autocomplete
                      options={mdOptions}
                      loading={mdLoading}
                      value={mdValue}
                      filterOptions={(x) => x}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      getOptionLabel={(o) => (o ? `${medicineLabel(o)}${brandIfNew(o) ? ` (${o.brand_name})` : ""}` : "")}
                      noOptionsText={mdQuery.length < 2 ? "Type at least 2 letters" : "Not in the catalog — add it in Medicine Catalog first"}
                      onChange={(_, val) => pickMedicine(val)}
                      onInputChange={(_, val, reason) => { if (reason !== "reset") setMdQuery(val); }} // "reset" = text filled in after a pick
                      renderOption={(props, o) => {
                        const { key, ...rest } = props;
                        return (
                          <li key={key ?? o.id} {...rest}>
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: "100%", minWidth: 0 }}>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" fontWeight={600} color={o._inventory ? "text.secondary" : "text.primary"}>{o.medicine_name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {[o.brand_name, o.strength, o.dosage_form, o.generic_name].filter(Boolean).join(" · ")}
                                </Typography>
                              </Box>
                              {o._inventory && (
                                <Pill tone={o._inventory.status === "inactive" ? null : "success"} outlined
                                  title={o._inventory.status === "inactive" ? "Already in your inventory, switched off" : "Already in your inventory"}>
                                  {o._inventory.status === "inactive" ? "In inventory · off" : "In inventory"}
                                </Pill>
                              )}
                            </Stack>
                          </li>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField {...params} size="small" label="Medicine from catalog" required autoFocus={!isPhone}
                          placeholder="Search by name or brand"
                          error={Boolean(show("medicine")) && !existing}
                          helperText={existing ? undefined
                            : show("medicine") || (checking ? "Checking your inventory…" : "Can't find it? Add it in Medicine Catalog first.")}
                          InputProps={{
                            ...params.InputProps,
                            sx: { borderRadius: "10px" },
                            startAdornment: <><InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>{params.InputProps.startAdornment}</>,
                            endAdornment: <>{mdLoading ? <CircularProgress size={16} /> : null}{params.InputProps.endAdornment}</>,
                          }} />
                      )}
                    />
                  )}
                  {!isEdit && existing && (
                    <Alert severity="warning" sx={{ borderRadius: "10px", alignItems: "center" }}
                      action={onEditExisting && (
                        <Button color="inherit" size="small" onClick={() => onEditExisting(existing)} sx={{ ...btn, whiteSpace: "nowrap" }}>
                          Edit it
                        </Button>
                      )}>
                      <b>{form.medicine_data_label || existing.medicine_name}</b> is already in your inventory
                      {existing.status === "inactive" ? " but switched off" : ""}.{" "}
                      {onEditExisting
                        ? existing.status === "inactive" ? "Edit it and turn it back on instead of adding it again." : "Edit it instead of adding it again."
                        : "Ask someone who can edit medicines to update it."}
                    </Alert>
                  )}
                  <Box sx={{ ...grid({ xs: "1fr", sm: "1fr 1fr" }), alignItems: "start", ...dimmed }}>
                    <TextField select size="small" fullWidth label="Category" required value={form.category_id}
                      onChange={(e) => set({ category_id: e.target.value })}
                      error={Boolean(show("category"))} helperText={show("category") || undefined}
                      InputProps={{ sx: { borderRadius: "10px" } }}>
                      <MenuItem value="" disabled>Choose a category</MenuItem>
                      {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.category_name}</MenuItem>)}
                    </TextField>
                    {field({ label: "Manufacturer", value: form.manufacturer, onChange: (e) => set({ manufacturer: e.target.value }) })}
                  </Box>
                  <Box sx={{ ...grid({ xs: "1fr 1fr", sm: "repeat(3, minmax(0, 1fr))" }), ...dimmed }}>
                    {field({ label: "Medicine code", value: form.medicine_code, onChange: (e) => set({ medicine_code: e.target.value }) })}
                    {field({ label: "Barcode", value: form.barcode, onChange: (e) => set({ barcode: e.target.value }), inputProps: { inputMode: "numeric" } })}
                    <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                      {field({ label: "HSN code", value: form.hsn_code, onChange: (e) => set({ hsn_code: e.target.value }), inputProps: { inputMode: "numeric" } })}
                    </Box>
                  </Box>
                  <Box sx={{ ...grid({ xs: "1fr", sm: isEdit ? "1fr 1fr" : "1fr" }), ...dimmed }}>
                    <Box sx={{ display: "flex", alignItems: "center", px: 1.5, borderRadius: "10px", border: 1, borderColor: "divider", minHeight: 40 }}>
                      <Switch checked={form.prescription_required} onChange={(e) => set({ prescription_required: e.target.checked })}
                        inputProps={{ "aria-label": "Prescription required" }} />
                      <Box sx={{ ml: 0.5, py: 0.75 }}>
                        <Typography variant="body2" fontWeight={600}>Prescription required</Typography>
                        <Typography variant="caption" color="text.secondary">Check a prescription before selling</Typography>
                      </Box>
                    </Box>
                    {isEdit && (
                      <Box sx={{ display: "flex", alignItems: "center", px: 1.5, borderRadius: "10px", border: 1, borderColor: "divider", minHeight: 40 }}>
                        <Switch checked={form.status === "active"} onChange={(e) => set({ status: e.target.checked ? "active" : "inactive" })}
                          inputProps={{ "aria-label": "Active" }} />
                        <Box sx={{ ml: 0.5, py: 0.75 }}>
                          <Typography variant="body2" fontWeight={600}>{form.status === "active" ? "Active" : "Inactive"}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {form.status === "active" ? "Shown in POS and billing" : "Hidden from POS and billing until you turn it back on"}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Stack>
              </FormSection>

              {/* Pack & storage */}
              <FormSection title="Pack & storage" hint="How it comes from the supplier, and where it's kept" sx={dimmed}>
                <Box sx={{ ...grid({ xs: "1fr 1fr", sm: "repeat(3, minmax(0, 1fr))" }), alignItems: "start" }}>
                  {field({
                    label: "Tablets per strip", required: true, type: "number", value: form.units_per_pack,
                    onChange: (e) => { setUppTouched(true); set({ units_per_pack: e.target.value.replace(/[^\d]/g, "").slice(0, 5) }); },
                    inputProps: { min: 1, max: 10000, step: 1, inputMode: "numeric" },
                    error: Boolean(show("upp")),
                    helperText: show("upp") || uppHint || "1 for a bottle, tube or injection",
                    FormHelperTextProps: { sx: { fontWeight: uppHint && !show("upp") ? 600 : 400, color: uppHint && !show("upp") ? toneInk("primary") : undefined } },
                  })}
                  <Autocomplete
                    freeSolo
                    options={UNIT_OPTIONS}
                    inputValue={form.unit}
                    onInputChange={(_, v) => set({ unit: v })}
                    renderInput={(params) => (
                      <TextField {...params} size="small" label="Sold as" placeholder="strip"
                        helperText="What one pack is called on the bill"
                        InputProps={{ ...params.InputProps, sx: { borderRadius: "10px" } }} />
                    )}
                  />
                  <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                    {field({
                      label: "Pack label", placeholder: uppValid && upp > 1 ? `${upp} tablets` : "e.g. 1x10, 15'S",
                      value: form.pack_size, onChange: (e) => setPackLabel(e.target.value),
                      helperText: form.pack_size ? "As printed on the pack" : uppValid ? `Empty shows “${upp > 1 ? `${upp} tablets` : `1 ${word}`}”` : "Optional",
                    })}
                  </Box>
                </Box>
                {uppChanged && repack ? (
                  <Alert severity="warning" sx={{ mt: 1.5, borderRadius: "10px" }}>
                    {repack.batches} {repack.batches === 1 ? "batch is" : "batches are"} still counted in packs. Saving recounts{" "}
                    {repack.batches === 1 ? "it" : "them"} as strips of {upp}: {repack.packs} {plural("pack", repack.packs)} → {repack.tablets} tablets.
                  </Alert>
                ) : uppChanged && (
                  <Alert severity="info" sx={{ mt: 1.5, borderRadius: "10px" }}>
                    Used for the next purchase. Batches already in stock keep the pack size they arrived in.
                  </Alert>
                )}
                <Box sx={{ mt: 1.5 }}>
                  {field({
                    label: "Default shelf / location", placeholder: "Rack B / Shelf 3",
                    value: form.storage_location, onChange: (e) => set({ storage_location: e.target.value.slice(0, 120) }),
                    error: Boolean(errors.location),
                    helperText: errors.location || "New batches are put here unless you choose another shelf",
                    InputProps: { startAdornment: <InputAdornment position="start"><PlaceOutlinedIcon fontSize="small" /></InputAdornment> },
                  })}
                </Box>
              </FormSection>

              {/* Pricing per strip */}
              <FormSection title={`Pricing per ${word}`} hint={`As on the supplier's invoice and the printed MRP — for one ${word}${upp > 1 ? ` of ${upp} tablets` : ""}`} sx={dimmed}>
                <Box sx={{ ...grid({ xs: "1fr 1fr", sm: "1fr 1fr 1fr" }), alignItems: "start" }}>
                  {moneyField(`Purchase price / ${word}`, "purchase_price", { helperText: upp > 1 && purchase > 0 ? `₹${rateText(purchase / upp)} per tablet` : " " })}
                  {moneyField(`Selling price / ${word}`, "selling_price", {
                    helperText: belowCost ? "Below your purchase price" : marginText || " ",
                    FormHelperTextProps: { sx: { color: belowCost ? "warning.dark" : undefined, fontWeight: belowCost ? 600 : 400 } },
                  })}
                  <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                    {field({
                      label: "GST", value: form.gst_percentage, onChange: (e) => set({ gst_percentage: e.target.value.replace(/[^\d.]/g, "") }),
                      inputProps: { inputMode: "decimal" }, error: Boolean(show("gst")), helperText: show("gst") || " ",
                      InputProps: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                    })}
                  </Box>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 1 }}>
                  <Typography variant="caption" color="text.secondary">GST slab</Typography>
                  {GST_SLABS.map((g) => {
                    const active = Number(form.gst_percentage) === g && form.gst_percentage !== "";
                    return (
                      <Chip key={g} label={`${g}%`} size="small" clickable color={active ? "primary" : "default"} variant={active ? "filled" : "outlined"}
                        onClick={() => set({ gst_percentage: g })} sx={{ borderRadius: "8px", fontWeight: 600 }} />
                    );
                  })}
                </Stack>
              </FormSection>

              {/* Stock levels in strips */}
              <FormSection title={`Stock levels in ${words}`} hint={`It shows in Low stock when fewer ${words} than the reorder level are left`} sx={dimmed}>
                <Box sx={{ ...grid({ xs: "1fr 1fr", sm: "1fr 1fr" }), alignItems: "start", maxWidth: 520 }}>
                  {countField("Reorder level", "reorder_level", {
                    InputProps: { endAdornment: <InputAdornment position="end">{words}</InputAdornment> },
                    helperText: reorder > 0 && upp > 1 ? `= ${reorder * upp} tablets` : " ",
                  })}
                  {countField("Max stock", "maximum_stock", {
                    placeholder: "Optional",
                    InputProps: { endAdornment: <InputAdornment position="end">{words}</InputAdornment> },
                    error: Boolean(show("max") || (maxStock != null && errors.max)),
                    helperText: errors.max || "Reorders fill up to this",
                  })}
                </Box>
              </FormSection>

              {/* Returns */}
              <FormSection title="Returns" hint="Used when a pharmacist processes a sales return" sx={dimmed}>
                <ToggleButtonGroup exclusive fullWidth={isPhone} value={policy.is_returnable ? "yes" : "no"}
                  onChange={(_, v) => v && setPolicy({ is_returnable: v === "yes" })} size="small"
                  sx={{ mb: 2, "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 600, px: 2, gap: 1 } }}>
                  <ToggleButton value="yes" color="success"><CheckCircleIcon fontSize="small" /> Returnable</ToggleButton>
                  <ToggleButton value="no" color="error"><BlockIcon fontSize="small" /> Not returnable</ToggleButton>
                </ToggleButtonGroup>

                {policy.is_returnable ? (
                  <Stack spacing={1.5}>
                    <Box sx={grid({ xs: "1fr", sm: "1fr 1fr" })}>
                      <Box>
                        {field({
                          label: "Return window", value: policy.window_days, error: Boolean(show("window")), helperText: show("window") || " ",
                          onChange: (e) => setPolicy({ window_days: e.target.value.replace(/\D/g, "") }), inputProps: { inputMode: "numeric" },
                          InputProps: { endAdornment: <InputAdornment position="end">days</InputAdornment> },
                        })}
                        <Stack direction="row" spacing={1} sx={{ mt: -0.5 }}>
                          {WINDOW_PRESETS.map((d) => {
                            const active = Number(policy.window_days) === d;
                            return <Chip key={d} label={`${d} days`} size="small" clickable color={active ? "primary" : "default"} variant={active ? "filled" : "outlined"}
                              onClick={() => setPolicy({ window_days: d })} sx={{ borderRadius: "8px" }} />;
                          })}
                        </Stack>
                      </Box>
                      <TextField select size="small" fullWidth label="Condition" value={policy.condition}
                        onChange={(e) => setPolicy({ condition: e.target.value })} helperText="What the item must look like to be taken back"
                        InputProps={{ sx: { borderRadius: "10px" } }}>
                        {CONDITION_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                      </TextField>
                    </Box>
                    <Stack direction="row" alignItems="center" sx={{ px: 1.5, borderRadius: "10px", border: 1, borderColor: "divider" }}>
                      <Switch checked={policy.requires_approval_after_window}
                        onChange={(e) => setPolicy({ requires_approval_after_window: e.target.checked })}
                        inputProps={{ "aria-label": "Manager can override past window" }} />
                      <Box sx={{ ml: 0.5, py: 0.75 }}>
                        <Typography variant="body2" fontWeight={600}>Manager can approve late returns</Typography>
                        <Typography variant="caption" color="text.secondary">After the window, a manager can still accept it with a reason</Typography>
                      </Box>
                    </Stack>
                    {field({
                      label: "Note for the pharmacist", placeholder: "e.g. Pack seal must be intact",
                      value: policy.notes, onChange: (e) => setPolicy({ notes: e.target.value }),
                    })}
                  </Stack>
                ) : (
                  field({
                    label: "Reason shown when a return is blocked", placeholder: "e.g. Injection — non-returnable per clinic policy",
                    value: policy.reason, onChange: (e) => setPolicy({ reason: e.target.value }),
                    helperText: "Leave empty to show “This medicine is marked as non-returnable”",
                  })
                )}
              </FormSection>

              {saveError && <Alert severity="error" sx={{ borderRadius: "10px", mb: 2.5 }}>{saveError}</Alert>}
            </>
          )}
        </Paper>
      </Box>

      {/* Phone: the actions sit at the bottom, always in reach */}
      {isPhone && (
        <Box sx={{
          flexShrink: 0, px: 1.5, pt: 1, pb: "calc(10px + env(safe-area-inset-bottom))", bgcolor: "background.paper",
          borderTop: 1, borderColor: "divider",
        }}>
          {statusLine && (
            <Typography sx={{ fontSize: 12, mb: 0.75, fontWeight: 600, color: duplicate ? "warning.dark" : submitted && errorCount ? "error.main" : "text.secondary" }}>
              {statusLine}
            </Typography>
          )}
          <Stack direction="row" spacing={1}>
            <Button onClick={tryClose} disabled={saving} variant="outlined" sx={{ ...btn, height: 40 }}>Cancel</Button>
            {saveButton}
          </Stack>
        </Box>
      )}

      {/* Setting the pack size of a medicine whose stock is still counted in packs */}
      <Dialog open={repackPrompt && Boolean(repack)} onClose={() => !saving && setRepackPrompt(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: "18px" } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Recount the stock?</DialogTitle>
        {repack && (
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              {repack.batches} {repack.batches === 1 ? "batch" : "batches"} of {form.medicine_data_label.split(" · ")[0] || "this medicine"}{" "}
              {repack.batches === 1 ? "is" : "are"} counted in packs. With {upp} tablets per strip, each pack becomes one strip of {upp}:
            </Typography>
            <Box sx={{ mt: 1.5, px: 1.5, py: 1.25, borderRadius: "10px", bgcolor: fade(cssVar("warning"), 0.1), color: toneInk("warning"), fontWeight: 700, fontSize: 15, ...numeric }}>
              {repack.packs} {plural("pack", repack.packs)} → {repack.tablets} tablets ({repack.packs} {plural("strip", repack.packs)})
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Do this only if each pack on the shelf really is a strip of {upp}. A stock-ledger entry records the change for every batch.
            </Typography>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setRepackPrompt(false)} disabled={saving} sx={btn}>Cancel</Button>
          <Button variant="contained" disableElevation onClick={() => handleSave(true)} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null} sx={btn}>
            Recount and save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unsaved changes */}
      <Dialog open={Boolean(leavePrompt)} onClose={() => setLeavePrompt(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "18px" } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Discard your changes?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {isEdit ? "The changes to this medicine haven't been saved." : "This medicine hasn't been added yet."} If you leave now, what you typed is lost.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setLeavePrompt(null)} sx={btn}>Keep editing</Button>
          <Button color="error" variant="contained" disableElevation sx={btn}
            onClick={() => { const go = leavePrompt?.proceed; setLeavePrompt(null); if (go) go(); }}>
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ============================================================
   CSV import — upload → review → import → result

   Expected CSV columns (first row = header):
     medicine_name, generic_name, brand_name, dosage_form, strength,
     category_name, manufacturer, pack_size, units_per_pack, unit, storage_location,
     medicine_code, barcode, hsn_code,
     gst_percentage, purchase_price, selling_price,      (prices PER STRIP)
     reorder_level, maximum_stock, prescription_required (levels IN STRIPS)
   units_per_pack (tablets in one strip) may be left out: it is read from pack_size
   ("10 tablets", "15'S", "1x10" → 10 / 15 / 10), else 1 (a bottle, tube or injection).

   Per row (unchanged):
     1. Look up medicine_data by medicine_name (+strength +dosage_form)
     2. If not found → create it in medicine_data
     3. Look up category_id from the loaded categories
     4. POST pharmacy_medicines
   New: rows that can't work (no name, unknown category, bad units_per_pack) are flagged before you import
   and skipped, and Excel's invisible BOM at the start of the file no longer breaks the headers.
============================================================ */
function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, ""); // Excel adds a BOM that would break the first header
  // keep each row's real line number so messages point at the right line in the file
  const lines = clean.split(/\r?\n/).map((l, i) => ({ text: l, line: i + 1 })).filter((l) => l.text.trim() !== "");
  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line) => {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; }
      } else if (c === "," && !inQ) {
        out.push(cur); cur = "";
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = splitLine(lines[0].text).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map(({ text: line, line: lineNo }) => {
    const vals = splitLine(line);
    const row = { __line: lineNo };
    headers.forEach((h, i) => { row[h] = (vals[i] ?? "").trim(); });
    return row;
  });
  return { headers, rows };
}

/** tablets per strip for a CSV row: its units_per_pack, else read from pack_size, else 1. null = invalid. */
function csvUnitsPerPack(r) {
  const raw = String(r.units_per_pack ?? "").trim();
  if (raw) {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : null;
  }
  return parsePackSize(r.pack_size) || 1;
}

function CsvImportDialog({ open, isPhone, onClose, categories, onComplete, showMessage }) {
  const theme = useTheme();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [statuses, setStatuses] = useState([]); // per row: { state, message }
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState("");

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [String(c.category_name || "").trim().toLowerCase(), c.id])),
    [categories]
  );

  // What would go wrong for each row, before importing
  const precheck = useCallback((r) => {
    if (!r.medicine_name?.trim()) return "Missing medicine_name";
    const cat = (r.category_name || "").trim().toLowerCase();
    if (!cat) return "Missing category_name";
    if (!categoryMap[cat]) return `Category '${r.category_name}' not found`;
    if (csvUnitsPerPack(r) == null) return "units_per_pack must be a whole number from 1 to 10000";
    if ((r.storage_location || "").length > 100) return "storage_location can be at most 100 characters";
    return "";
  }, [categoryMap]);

  const reset = () => {
    setFileName(""); setRows([]); setHeaders([]); setStatuses([]); setDone(false); setFileError("");
  };

  const readFile = (file) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setFileError("Choose a .csv file. In Excel use File → Save As → CSV.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCsv(String(ev.target.result || ""));
      if (!parsed.rows.length) {
        setFileError("This file has no rows under the header line.");
        return;
      }
      setFileError("");
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setStatuses(parsed.rows.map((r) => {
        const problem = precheck(r);
        return problem ? { state: "skipped", message: problem } : { state: "ready", message: "" };
      }));
      setDone(false);
    };
    reader.readAsText(file);
  };

  const readyCount = statuses.filter((s) => s.state === "ready").length;
  const skippedCount = statuses.filter((s) => s.state === "skipped").length;
  const importedCount = statuses.filter((s) => s.state === "imported").length;
  const failedCount = statuses.filter((s) => s.state === "failed").length;
  const processed = importedCount + failedCount;
  const toImport = done ? 0 : readyCount + (running ? statuses.filter((s) => s.state === "importing").length : 0);
  const missingRequired = headers.length > 0 && !["medicine_name", "category_name"].every((h) => headers.includes(h));

  const setRowStatus = (i, next) => setStatuses((prev) => { const copy = [...prev]; copy[i] = next; return copy; });

  const runImport = async () => {
    const targets = statuses.map((s, i) => (s.state === "ready" ? i : -1)).filter((i) => i >= 0);
    if (!targets.length) return;
    setRunning(true);
    let ok = 0;
    let failed = 0;

    for (const i of targets) {
      const r = rows[i];
      setRowStatus(i, { state: "importing", message: "" });
      try {
        // 1. Find or create medicine_data
        const name = r.medicine_name.trim();
        const findRes = await axios.get(`${API}/api/pharmacy/medicine-data/get`, {
          params: { search: name, limit: 20 }, withCredentials: true,
        });
        const match = (findRes.data.data || []).find((m) =>
          m.medicine_name?.toLowerCase() === name.toLowerCase() &&
          (!r.strength || (m.strength || "").toLowerCase() === r.strength.toLowerCase()) &&
          (!r.dosage_form || (m.dosage_form || "").toLowerCase() === r.dosage_form.toLowerCase()));

        let medDataId = match?.id ?? null;
        if (!medDataId) {
          const createRes = await axios.post(`${API}/api/pharmacy/medicine-data/post`, {
            medicine_name: name,
            generic_name: r.generic_name || null,
            brand_name: r.brand_name || null,
            dosage_form: r.dosage_form || null,
            strength: r.strength || null,
          }, { withCredentials: true });
          medDataId = createRes.data.data?.id;
        }

        // 2. Category
        const catId = categoryMap[(r.category_name || "").trim().toLowerCase()];
        if (!catId) throw new Error(`Category '${r.category_name}' not found`);

        // 3. Create pharmacy_medicine
        let parsedPolicy;
        if (r.return_policy) { try { parsedPolicy = JSON.parse(r.return_policy); } catch { parsedPolicy = undefined; } }
        await axios.post(`${API}/api/pharmacy/medicines/post`, {
          medicine_data_id: medDataId,
          category_id: catId,
          manufacturer: r.manufacturer || null,
          pack_size: r.pack_size || null,
          units_per_pack: csvUnitsPerPack(r),
          storage_location: r.storage_location || null,
          unit: r.unit || null,
          medicine_code: r.medicine_code || null,
          barcode: r.barcode || null,
          hsn_code: r.hsn_code || null,
          gst_percentage: Number(r.gst_percentage) || 0,
          purchase_price: Number(r.purchase_price) || 0,
          selling_price: Number(r.selling_price) || 0,
          reorder_level: Number(r.reorder_level) || 0,
          maximum_stock: r.maximum_stock ? Number(r.maximum_stock) : null,
          prescription_required: ["1", "true", "yes", "y"].includes((r.prescription_required || "").toLowerCase()),
          return_policy: parsedPolicy,
        }, { withCredentials: true });

        ok += 1;
        setRowStatus(i, { state: "imported", message: "" });
      } catch (err) {
        failed += 1;
        setRowStatus(i, { state: "failed", message: errMsg(err, err.message || "Failed") });
      }
    }

    setRunning(false);
    setDone(true);
    const skipped = statuses.filter((s) => s.state === "skipped").length;
    if (failed === 0 && skipped === 0) showMessage(`Imported ${ok} ${ok === 1 ? "medicine" : "medicines"}`);
    else showMessage(`Imported ${ok} of ${rows.length} — ${failed + skipped} need attention`, "warning");
  };

  const downloadTemplate = () => {
    const header = CSV_COLUMNS.join(",");
    const example = "Paracetamol 500mg,Paracetamol,Dolo,Tablet,500mg,Analgesics,Micro Labs,15 tablets,15,strip,Rack B / Shelf 3,PCM500,8901234567890,30049099,12,24.50,30.00,10,100,0";
    const blob = new Blob([`${header}\n${example}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medicines-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusPill = (s) => {
    switch (s?.state) {
      case "ready": return <Pill tone="primary" outlined>Ready</Pill>;
      case "importing": return <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={14} /><Typography variant="caption">Importing</Typography></Stack>;
      case "imported": return <Pill tone="success">Imported</Pill>;
      case "failed": return <Pill tone="error" title={s.message}>Failed</Pill>;
      case "skipped": return <Pill tone="warning" title={s.message}>Skipped</Pill>;
      default: return null;
    }
  };

  // Closing after an import still refreshes the list
  const close = () => {
    if (running) return;
    const imported = importedCount > 0;
    reset();
    if (imported) onComplete(); else onClose();
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth fullScreen={isPhone}
      PaperProps={{ sx: { borderRadius: isPhone ? 0 : "18px" } }}>
      <DialogTitle component="div" sx={{ display: "flex", alignItems: "flex-start", gap: 1, borderBottom: 1, borderColor: "divider", pb: 1.5,
        pt: isPhone ? "calc(16px + env(safe-area-inset-top))" : undefined }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h2" fontWeight={700}>Import medicines from CSV</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {rows.length ? `${fileName} · ${rows.length} ${rows.length === 1 ? "row" : "rows"}` : "Add many medicines to your inventory at once"}
          </Typography>
        </Box>
        <IconButton aria-label="Close" onClick={close} disabled={running} sx={{ mt: -0.5, mr: -1 }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: "20px !important" }}>
        {rows.length === 0 ? (
          <Stack spacing={2.5}>
            <Box
              component="label"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files?.[0]); }}
              sx={{
                display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 1, cursor: "pointer",
                px: 3, py: { xs: 5, sm: 6 }, borderRadius: "16px", border: "2px dashed",
                borderColor: dragOver ? "primary.main" : "divider",
                bgcolor: dragOver ? alpha(theme.palette.primary.main, 0.06) : "action.hover",
                transition: "border-color .15s, background-color .15s",
                "&:focus-within": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
              }}
            >
              <UploadFileOutlinedIcon sx={{ fontSize: 40, color: "primary.main" }} />
              <Typography fontWeight={700}>Drop your CSV here</Typography>
              <Typography variant="body2" color="text.secondary">or <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>choose a file</Box></Typography>
              <input type="file" hidden accept=".csv,text/csv" onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ""; }} />
            </Box>
            {fileError && <Alert severity="error" sx={{ borderRadius: "10px" }}>{fileError}</Alert>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700}>Columns</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Required: <b>medicine_name</b>, <b>category_name</b> (must match a category you already have).
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                  Optional: {CSV_COLUMNS.filter((c) => c !== "medicine_name" && c !== "category_name").join(", ")}. Prices are per strip, reorder_level and maximum_stock in strips. units_per_pack is read from pack_size when left empty. Use 1 or 0 for prescription_required.
                </Typography>
              </Box>
              <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={downloadTemplate} sx={{ ...btn, flexShrink: 0 }}>
                Download template
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2}>
            {missingRequired && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>
                This file is missing the <b>medicine_name</b> or <b>category_name</b> column, so every row will be skipped. Check the header row against the template.
              </Alert>
            )}
            {categories.length === 0 && (
              <Alert severity="warning" sx={{ borderRadius: "10px" }}>Your categories haven't loaded, so rows can't be matched to a category. Close this and try again.</Alert>
            )}

            {/* Summary */}
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, minmax(0, 1fr))" } }}>
              {[
                { label: done ? "Imported" : "Ready to import", value: done ? importedCount : readyCount + statuses.filter((s) => s.state === "importing" || s.state === "imported").length, tone: done ? "success" : "primary" },
                { label: "Skipped", value: skippedCount, tone: skippedCount ? "warning" : null, hint: "Fix these in the file" },
                { label: "Failed", value: failedCount, tone: failedCount ? "error" : null },
                { label: "Rows in file", value: rows.length, tone: null },
              ].map((t) => (
                <Box key={t.label} sx={{ p: 1.5, borderRadius: "12px", border: 1, borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary">{t.label}</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, ...numeric, color: t.tone ? toneText(theme, t.tone) : "text.primary" }}>{t.value}</Typography>
                </Box>
              ))}
            </Box>

            {(running || done) && (
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption">{running ? `Importing… ${processed} of ${processed + toImport}` : "Finished"}</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={processed + toImport > 0 ? (processed / (processed + toImport)) * 100 : 100}
                  sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            )}

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: { xs: "none", sm: 320 }, borderRadius: "12px" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 48 }}>Row</TableCell>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Pack</TableCell>
                    <TableCell align="right">Price / strip</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, i) => {
                    const s = statuses[i];
                    return (
                      <TableRow key={i} sx={{ bgcolor: s?.state === "failed" || s?.state === "skipped" ? alpha(theme.palette.warning.main, 0.06) : undefined }}>
                        <TableCell sx={{ color: "text.secondary", ...numeric }}>{r.__line ?? i + 2}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{r.medicine_name || "—"}</Typography>
                          <Typography variant="caption" color="text.secondary">{[r.strength, r.dosage_form].filter(Boolean).join(" · ")}</Typography>
                        </TableCell>
                        <TableCell><Typography variant="body2">{r.category_name || "—"}</Typography></TableCell>
                        <TableCell sx={numeric}>
                          <Typography variant="body2">{csvUnitsPerPack(r) > 1 ? `${csvUnitsPerPack(r)} / strip` : csvUnitsPerPack(r) === 1 ? "1 pack" : "—"}</Typography>
                          {r.storage_location && <Typography variant="caption" color="text.secondary">{r.storage_location}</Typography>}
                        </TableCell>
                        <TableCell align="right" sx={numeric}>{money(r.selling_price)}</TableCell>
                        <TableCell>
                          {statusPill(s)}
                          {(s?.state === "skipped" || s?.state === "failed") && (
                            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25, maxWidth: 260 }}>{s.message}</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary">Row numbers match the lines in your file (line 1 is the header).</Typography>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, gap: 1, borderTop: 1, borderColor: "divider",
        pb: isPhone ? "calc(12px + env(safe-area-inset-bottom))" : 1.5 }}>
        {done ? (
          <>
            <Button onClick={reset} sx={btn}>Import another file</Button>
            <Button variant="contained" disableElevation onClick={close} sx={{ ...btn, px: 3 }}>Done</Button>
          </>
        ) : rows.length ? (
          <>
            <Button onClick={reset} disabled={running} sx={btn}>Choose another file</Button>
            <Button variant="contained" disableElevation onClick={runImport} disabled={readyCount === 0 || running}
              startIcon={running ? <CircularProgress size={16} color="inherit" /> : <UploadFileOutlinedIcon />} sx={{ ...btn, px: 3 }}>
              {running ? "Importing…" : `Import ${readyCount} ${readyCount === 1 ? "medicine" : "medicines"}`}
            </Button>
          </>
        ) : (
          <Button onClick={close} sx={btn}>Cancel</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}