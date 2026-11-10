// src/pharmacy/inventory/Inventory.js        (routes: pharmacy/batches, pharmacy/stock,
//                                             pharmacy/stock/low, pharmacy/stock/expiring)
//
// One screen, four views of the same stock:
//
//   view="batches"    every batch on the shelves — expiry, tablets per strip, stock, shelf, branch
//   view="expiring"   batches with stock that expire soon (30 / 60 / 90 / 180 days) or already have
//   view="stock"      stock per MEDICINE (all its batches added up); open a row to see its batches
//   view="low"        medicines with fewer strips than their reorder level, the biggest gap first
//
// Units: stock is counted in TABLETS and shown as "12 strips + 5 tablets"; reorder levels are
// in strips. Branches: staff see their own branch; the admin sees every branch or picks one.
//
// From any batch row:
//   • the shelf (Location) — click it to move the batch (pharmacy.medicines.edit)
//   • Write off / adjust — a small popup (pharmacy.stock.create)
//
// Backend
//   GET   /api/pharmacy/batches                       batch views (server-side paging + filters)
//   GET   /api/pharmacy/medicines                     medicine views (stock_status / low_stock)
//   PATCH /api/pharmacy/batches/update/location/:id   move a batch
//   POST  /api/pharmacy/stock-adjustments/post        write off / correct
//
// The page never scrolls: it measures where it starts and fills the rest of the window; only
// the rows scroll, inside the list.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Collapse, IconButton, InputAdornment, LinearProgress, MenuItem, Paper,
  Skeleton, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import SearchOffIcon from "@mui/icons-material/SearchOff";

import { ColorRoot, cssVar, fade, toneInk } from "../../theme/appColors";
import useAccess, { AccessDenied } from "../../hooks/useAccess";
import AppPager from "../shared/AppPager";
import BranchPicker, { usePharmacyBranch } from "../shared/BranchPicker";
import { plural } from "../shared/pharmacyUnits";
import {
  BATCHES_API, MEDICINES_API, PERM, BatchStatusPill, ExpiryText, Pill, StockText, apiMessage, buttonSx,
  headCellSx, http, isCancel, nums, useFitsWindow,
} from "./inventoryShared";
import LocationDialog from "./LocationDialog";
import AdjustStockDialog from "./AdjustStockDialog";
import AssignBranchDialog from "./AssignBranchDialog";

const SHELL_HEIGHT = "calc(100dvh - var(--inventory-offset, 0px))";
const SEARCH_DELAY = 350;

/* ---------- the four views ---------- */
const VIEWS = {
  batches: {
    mode: "batch",
    title: "Batches",
    subtitle: "Every batch on your shelves — expiry, pack size, stock and where it sits",
    icon: LayersOutlinedIcon,
    filterLabel: "Show",
    filters: [
      { value: "with_stock", label: "With stock", params: { in_stock_only: 1 } },
      { value: "sellable", label: "Sellable", params: { status: "in_stock" } },
      { value: "expiring", label: "Expiring in 90 days", params: { expiring_days: 90 } },
      { value: "expired", label: "Expired", params: { status: "expired" } },
      { value: "sold_out", label: "Sold out", params: { status: "out_of_stock" } },
      { value: "blocked", label: "Blocked", params: { status: "blocked" } },
      { value: "all", label: "All batches", params: {} },
    ],
    defaultFilter: "with_stock",
    sort: { sort_by: "expiry_date", sort_order: "ASC" },
    noun: ["batch", "batches"],
  },
  expiring: {
    mode: "batch",
    title: "Expiring",
    subtitle: "Sell these first, return them to the supplier, or write them off",
    icon: EventBusyOutlinedIcon,
    filterLabel: "Expiring",
    filters: [
      { value: "30", label: "Within 30 days", params: { expiring_days: 30 } },
      { value: "60", label: "Within 60 days", params: { expiring_days: 60 } },
      { value: "90", label: "Within 90 days", params: { expiring_days: 90 } },
      { value: "180", label: "Within 6 months", params: { expiring_days: 180 } },
      { value: "expired", label: "Already expired", params: { status: "expired", in_stock_only: 1 } },
    ],
    defaultFilter: "90",
    sort: { sort_by: "expiry_date", sort_order: "ASC" },
    noun: ["batch", "batches"],
  },
  stock: {
    mode: "medicine",
    title: "Stock view",
    subtitle: "Stock per medicine, all its batches added up — open a row to see the batches",
    icon: Inventory2OutlinedIcon,
    filterLabel: "Stock",
    filters: [
      { value: "all", label: "All medicines", params: {} },
      { value: "in", label: "In stock", params: { stock_status: "in" } },
      { value: "low", label: "Running low", params: { stock_status: "low" } },
      { value: "out", label: "Out of stock", params: { stock_status: "out" } },
    ],
    defaultFilter: "all",
    sort: { sort_by: "medicine_name", sort_order: "ASC" },
    noun: ["medicine", "medicines"],
  },
  low: {
    mode: "medicine",
    title: "Low stock",
    subtitle: "Fewer strips left than the reorder level — the biggest gap first",
    icon: TrendingDownIcon,
    filterLabel: null,
    filters: [{ value: "low", label: "Running low", params: { low_stock: 1 } }],
    defaultFilter: "low",
    sort: { sort_by: "shortfall", sort_order: "DESC" },
    noun: ["medicine", "medicines"],
  },
};

const medDetail = (m) => [m.strength, m.dosage_form].filter(Boolean).join(" · ");
const perStrip = (upp, word) => (upp > 1 ? `${upp} / ${word || "strip"}` : `1 ${word || "pack"}`);

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */
function LocationCell({ batch, canEdit, onEdit, dense }) {
  const text = batch.location;
  const label = (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
      <PlaceOutlinedIcon sx={{ fontSize: 15, color: text ? cssVar("primary") : "text.disabled", flexShrink: 0 }} />
      <Typography
        noWrap
        sx={{
          fontSize: dense ? 12.5 : 13,
          fontWeight: text && !batch.location_is_default ? 600 : 500,
          color: text ? "text.primary" : "text.disabled",
          fontStyle: batch.location_is_default ? "italic" : "normal",
          minWidth: 0,
        }}
      >
        {text || (canEdit ? "Set shelf" : "No shelf")}
      </Typography>
      {canEdit && <EditOutlinedIcon className="loc-edit" sx={{ fontSize: 14, color: "text.secondary", opacity: 0, transition: "opacity .12s", flexShrink: 0 }} />}
    </Stack>
  );
  if (!canEdit) {
    return batch.location_is_default ? <Tooltip title="The medicine's default shelf">{label}</Tooltip> : label;
  }
  return (
    <Tooltip title={batch.location_is_default ? "The medicine's default shelf — click to set this batch's own" : "Move to another shelf"}>
      <Box
        component="button"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(batch);
        }}
        aria-label={`Change the shelf of batch ${batch.batch_number}`}
        sx={{
          all: "unset",
          boxSizing: "border-box",
          cursor: "pointer",
          display: "flex",
          maxWidth: "100%",
          px: 0.75,
          py: 0.4,
          mx: -0.75,
          borderRadius: 1.5,
          border: 1,
          borderColor: "transparent",
          "&:hover, &:focus-visible": { borderColor: fade(cssVar("primary"), 0.35), bgcolor: fade(cssVar("primary"), 0.05) },
          "&:hover .loc-edit, &:focus-visible .loc-edit": { opacity: 1 },
        }}
      >
        {label}
      </Box>
    </Tooltip>
  );
}

function LocationsList({ locations }) {
  if (!locations || !locations.length) {
    return <Typography sx={{ fontSize: 13, color: "text.disabled" }}>No shelf</Typography>;
  }
  const [first, ...rest] = locations;
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
      <PlaceOutlinedIcon sx={{ fontSize: 15, color: cssVar("primary"), flexShrink: 0 }} />
      <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, minWidth: 0 }}>
        {first}
      </Typography>
      {rest.length > 0 && (
        <Tooltip title={locations.join(" · ")}>
          <Box component="span" sx={{ fontSize: 11.5, fontWeight: 700, color: toneInk("primary"), bgcolor: fade(cssVar("primary"), 0.1), borderRadius: 1, px: 0.6, flexShrink: 0 }}>
            +{rest.length}
          </Box>
        </Tooltip>
      )}
    </Stack>
  );
}

function MedicineStatus({ m }) {
  if (m.stock_tablets === 0) return <Pill tone="error">Out of stock</Pill>;
  if (m.low_stock) return <Pill tone="warning">Low</Pill>;
  return <Pill tone="success">In stock</Pill>;
}

function EmptyState({ view, filtered, onClear, within }) {
  let Icon = filtered ? SearchOffIcon : Inventory2OutlinedIcon;
  let title = filtered ? "Nothing matches that" : "No stock yet";
  let text = filtered ? "Try another name, batch number or shelf, or clear the search." : "Batches appear here when you receive a purchase order.";
  if (!filtered && view === "low") {
    Icon = TaskAltIcon;
    title = "Nothing is running low";
    text = "Every medicine has at least its reorder level of strips in stock.";
  }
  if (!filtered && view === "expiring") {
    Icon = TaskAltIcon;
    title = within === "expired" ? "No expired stock" : "Nothing expires soon";
    text = within === "expired" ? "There is no expired stock left on your shelves." : "No batch with stock expires in this period.";
  }
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: { xs: 6, md: 8 }, px: 3, textAlign: "center" }}>
      <Box sx={{ width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: fade(cssVar("primary"), 0.08), color: cssVar("primary"), mb: 0.5 }}>
        <Icon />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 15.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: 13.5, color: "text.secondary", maxWidth: 380 }}>{text}</Typography>
      {filtered && (
        <Button onClick={onClear} sx={{ ...buttonSx, mt: 0.5 }}>
          Clear search
        </Button>
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */
function InventoryPage({ view }) {
  const cfg = VIEWS[view] || VIEWS.batches;
  const isBatch = cfg.mode === "batch";
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("md"));
  const [shellRef, shellHeight] = useFitsWindow(SHELL_HEIGHT);

  const { loading: accessLoading, can } = useAccess();
  const canView = can(PERM.view);
  const canEditLoc = can(PERM.edit);
  const canAdjust = can(PERM.adjust);

  const br = usePharmacyBranch({ allowAll: true });
  const showBranch = br.multi && !br.branch;

  /* ---------- list state ---------- */
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(cfg.defaultFilter);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [filterSheet, setFilterSheet] = useState(false);

  /* ---------- medicine view: batches of the opened rows ---------- */
  const [expanded, setExpanded] = useState({}); // id → { loading, rows, error }

  /* ---------- popups ---------- */
  const [locFor, setLocFor] = useState(null);
  const [adjustFor, setAdjustFor] = useState(null);
  const [toast, setToast] = useState(null);

  /* ---------- batches with no branch yet (admin of several branches) ---------- */
  const canAssign = br.multi && br.isAdmin && canEditLoc;
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [bulkBranch, setBulkBranch] = useState("");
  const [assignFor, setAssignFor] = useState(null); // { batch } one batch · { all: true } every unassigned batch

  useEffect(() => {
    if (!canAssign || !isBatch) {
      setUnassignedCount(0);
      return undefined;
    }
    const ctl = new AbortController();
    http
      .get(BATCHES_API, { params: { unassigned: 1, limit: 1 }, signal: ctl.signal })
      .then((r) => setUnassignedCount(Number(r.data.pagination?.total) || 0))
      .catch(() => {});
    return () => ctl.abort();
  }, [canAssign, isBatch, reloadKey]);

  // search waits until you stop typing
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return undefined;
    const t = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DELAY);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const filterDef = cfg.filters.find((f) => f.value === filter) || cfg.filters[0];

  const params = useMemo(
    () => ({
      ...cfg.sort,
      ...filterDef.params,
      ...(isBatch ? {} : { status: "active" }),
      ...(search ? { search } : {}),
      ...br.params,
    }),
    [cfg.sort, filterDef, isBatch, search, br.params]
  );

  useEffect(() => {
    if (accessLoading || !canView || br.loading) return undefined;
    const ctl = new AbortController();
    setLoading(true);
    setError("");
    http
      .get(isBatch ? BATCHES_API : MEDICINES_API, { params: { ...params, page, limit }, signal: ctl.signal })
      .then((r) => {
        const list = r.data.data || [];
        const t = r.data.pagination?.total ?? list.length;
        setRows(list);
        setTotal(t);
        setLoaded(true);
        if (!list.length && t > 0 && page > 1) setPage(Math.max(1, Math.ceil(t / limit)));
      })
      .catch((e) => {
        if (isCancel(e)) return;
        setError(apiMessage(e, "Couldn't load the stock. Check your connection and try again."));
        setRows([]);
        setTotal(0);
        setLoaded(true);
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false);
      });
    return () => ctl.abort();
  }, [accessLoading, canView, br.loading, isBatch, params, page, limit, reloadKey]);

  /* ---------- the batches under one medicine ---------- */
  const loadBatchesOf = useCallback(
    (id) => {
      setExpanded((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), loading: true, error: "" } }));
      http
        .get(BATCHES_API, { params: { medicine_id: id, in_stock_only: 1, sort_by: "expiry_date", sort_order: "ASC", limit: 100, ...br.params } })
        .then((r) => setExpanded((prev) => (prev[id] ? { ...prev, [id]: { loading: false, rows: r.data.data || [], error: "" } } : prev)))
        .catch((e) => setExpanded((prev) => (prev[id] ? { ...prev, [id]: { loading: false, rows: [], error: apiMessage(e, "Couldn't load the batches") } } : prev)));
    },
    [br.params]
  );

  const toggle = (id) => {
    if (expanded[id]) {
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      loadBatchesOf(id);
    }
  };

  // a new branch / filter → close the opened rows (their batches belong to the old list)
  useEffect(() => {
    setExpanded({});
  }, [params]);

  const refresh = () => {
    setReloadKey((k) => k + 1);
    Object.keys(expanded).forEach((id) => loadBatchesOf(id));
  };

  const suggestions = useMemo(() => {
    const all = [];
    rows.forEach((r) => {
      if (r.location) all.push(r.location);
      (r.locations || []).forEach((l) => all.push(l));
    });
    Object.values(expanded).forEach((e) => (e.rows || []).forEach((b) => b.location && all.push(b.location)));
    return all;
  }, [rows, expanded]);

  /* ---------- no permission ---------- */
  if (!accessLoading && !canView) {
    return (
      <Box ref={shellRef} sx={{ height: shellHeight, display: "flex", overflow: "hidden", bgcolor: "background.default" }}>
        <AccessDenied what={cfg.title} />
      </Box>
    );
  }

  const firstLoad = loading && !loaded;
  const filtered = Boolean(search) || (view === "batches" && filter !== cfg.defaultFilter) || (view === "stock" && filter !== "all");
  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setFilter(cfg.defaultFilter);
    setPage(1);
  };
  const countText = loaded ? `${total.toLocaleString("en-IN")} ${total === 1 ? cfg.noun[0] : cfg.noun[1]}` : "Loading…";

  /* ---------- toolbar pieces ---------- */
  const searchField = (
    <TextField
      size="small"
      fullWidth
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      placeholder={isBatch ? "Medicine, batch no. or shelf" : "Medicine, code or shelf"}
      inputProps={{ "aria-label": "Search", enterKeyHint: "search" }}
      InputProps={{
        sx: { borderRadius: 2, bgcolor: "background.paper" },
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: searchInput ? (
          <InputAdornment position="end">
            <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => setSearchInput("")}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
    />
  );

  const filterSelect = cfg.filterLabel && (
    <TextField
      select
      size="small"
      label={cfg.filterLabel}
      value={filter}
      onChange={(e) => {
        setFilter(e.target.value);
        setPage(1);
      }}
      InputLabelProps={{ shrink: true }}
      sx={{ minWidth: 180, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.paper" } }}
    >
      {cfg.filters.map((f) => (
        <MenuItem key={f.value} value={f.value}>
          {f.label}
        </MenuItem>
      ))}
    </TextField>
  );

  // A batch with no branch in a pharmacy with several branches can't be adjusted: the
  // stock-adjustments endpoint needs the batch to sit in the branch it works in.
  const unassigned = (b) => br.multi && !b.branch;
  const adjustTip = "Give this batch a branch first — stock can only be adjusted inside a branch";

  /* ---------- one batch row (table) ---------- */
  const batchCells = (b, { nested = false } = {}) => (
    <>
      {!nested && (
        <TableCell>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap title={b.medicine_name}>
            {b.medicine_name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
            {medDetail(b) || b.medicine_code || "—"}
          </Typography>
        </TableCell>
      )}
      <TableCell>
        <Typography sx={{ fontSize: 13, fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} noWrap>
          {b.batch_number}
        </Typography>
        {b.supplier_name && !nested && (
          <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
            {b.supplier_name}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <ExpiryText date={b.expiry_date} days={b.days_to_expiry} status={b.stock_status} />
      </TableCell>
      <TableCell>
        <Typography sx={{ fontSize: 13, ...nums }} noWrap>
          {perStrip(b.units_per_pack, b.pack_word)}
        </Typography>
      </TableCell>
      <TableCell>
        <StockText text={b.stock_text} tablets={b.units_per_pack > 1 ? b.quantity_available : null} empty={!b.quantity_available} />
      </TableCell>
      <TableCell sx={{ overflow: "hidden" }}>
        <LocationCell batch={b} canEdit={canEditLoc} onEdit={setLocFor} />
      </TableCell>
      {showBranch && (
        <TableCell>
          {!b.branch && canAssign ? (
            <Tooltip title="This batch has no branch yet" describeChild>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={(e) => {
                  e.stopPropagation();
                  setAssignFor({ batch: b });
                }}
                sx={{ ...buttonSx, height: 26, px: 1, fontSize: 12, minWidth: 0, whiteSpace: "nowrap" }}
              >
                Assign branch
              </Button>
            </Tooltip>
          ) : (
            <Typography sx={{ fontSize: 13 }} noWrap>
              {b.branch || <Box component="span" sx={{ color: "text.disabled" }}>Unassigned</Box>}
            </Typography>
          )}
        </TableCell>
      )}
      <TableCell>
        <BatchStatusPill status={b.stock_status} />
      </TableCell>
      {canAdjust && (
        <TableCell align="right" sx={{ pr: 1.5 }}>
          <Tooltip title={unassigned(b) ? adjustTip : ""}>
            <span>
              <Button
                size="small"
                variant={b.stock_status === "expired" ? "contained" : "outlined"}
                color={b.stock_status === "expired" ? "error" : "primary"}
                disableElevation
                disabled={(b.stock_status === "blocked" && !b.quantity_available) || unassigned(b)}
                onClick={(e) => {
                  e.stopPropagation();
                  setAdjustFor(b);
                }}
                sx={{ ...buttonSx, height: 28, px: 1.25, fontSize: 12.5, whiteSpace: "nowrap" }}
              >
                {b.stock_status === "expired" ? "Write off" : "Adjust"}
              </Button>
            </span>
          </Tooltip>
        </TableCell>
      )}
    </>
  );

  /* ---------- batch card (phone) ---------- */
  const batchCard = (b, { nested = false } = {}) => (
    <Paper key={b.id} variant="outlined" sx={{ borderRadius: 3, p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
      <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          {!nested && (
            <Typography sx={{ fontSize: 14, fontWeight: 700 }} noWrap>
              {b.medicine_name}
            </Typography>
          )}
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
            Batch <b>{b.batch_number}</b> · {perStrip(b.units_per_pack, b.pack_word)}
            {showBranch && b.branch ? ` · ${b.branch}` : ""}
          </Typography>
        </Box>
        <BatchStatusPill status={b.stock_status} />
      </Stack>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>Stock</Typography>
          <StockText text={b.stock_text} empty={!b.quantity_available} />
        </Box>
        <Box sx={{ flexShrink: 0 }}>
          <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>Expiry</Typography>
          <ExpiryText date={b.expiry_date} days={b.days_to_expiry} status={b.stock_status} compact />
        </Box>
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ minHeight: 32 }}>
        <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden", pl: 0.75 }}>
          <LocationCell batch={b} canEdit={canEditLoc} onEdit={setLocFor} dense />
        </Box>
        {unassigned(b) && canAssign ? (
          <Button size="small" variant="outlined" onClick={() => setAssignFor({ batch: b })} sx={{ ...buttonSx, height: 30, flexShrink: 0 }}>
            Assign branch
          </Button>
        ) : canAdjust && (
          <Button
            size="small"
            variant={b.stock_status === "expired" ? "contained" : "outlined"}
            color={b.stock_status === "expired" ? "error" : "primary"}
            disableElevation
            disabled={unassigned(b)}
            title={unassigned(b) ? adjustTip : undefined}
            onClick={() => setAdjustFor(b)}
            sx={{ ...buttonSx, height: 30, flexShrink: 0 }}
          >
            {b.stock_status === "expired" ? "Write off" : "Adjust"}
          </Button>
        )}
      </Stack>
    </Paper>
  );

  /* ---------- medicine rows ---------- */
  const medStock = (m) => (
    <StockText
      text={m.stock_text}
      low={m.low_stock}
      empty={!m.stock_tablets}
      sub={m.low_stock ? `${m.stock_strips} of ${m.reorder_level} ${plural(m.pack_word || "strip", m.reorder_level)}` : m.batch_count ? `${m.batch_count} ${m.batch_count === 1 ? "batch" : "batches"}` : "No batches"}
    />
  );

  const nestedBatches = (m, cols) => {
    const e = expanded[m.id];
    if (!e) return null;
    return (
      <TableRow>
        <TableCell colSpan={cols} sx={{ p: 0, bgcolor: fade(cssVar("primary"), 0.03) }}>
          <Collapse in appear>
            <Box sx={{ pl: 6, pr: 1, py: 1 }}>
              {e.loading && !e.rows ? (
                <Stack spacing={0.75} sx={{ py: 1 }}>
                  <Skeleton width="60%" />
                  <Skeleton width="45%" />
                </Stack>
              ) : e.error ? (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {e.error}
                </Alert>
              ) : !e.rows.length ? (
                <Typography sx={{ fontSize: 13, color: "text.secondary", py: 1.5 }}>No batch holds stock of this medicine{br.branch ? ` in ${br.branch}` : ""}.</Typography>
              ) : (
                <Table size="small" sx={{ tableLayout: "fixed", "& td, & th": { borderColor: "divider" }, "& tr:last-of-type td": { borderBottom: 0 } }}>
                  <TableHead>
                    <TableRow sx={{ "& th": { fontSize: 11, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: ".04em", py: 0.75, bgcolor: "transparent" } }}>
                      <TableCell sx={{ width: 150 }}>Batch</TableCell>
                      <TableCell sx={{ width: 120 }}>Expiry</TableCell>
                      <TableCell sx={{ width: 120 }}>Tablets / strip</TableCell>
                      <TableCell sx={{ width: 170 }}>Stock</TableCell>
                      <TableCell>Location</TableCell>
                      {showBranch && <TableCell sx={{ width: 120 }}>Branch</TableCell>}
                      <TableCell sx={{ width: 100 }}>Status</TableCell>
                      {canAdjust && <TableCell sx={{ width: 104 }} />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {e.rows.map((b) => (
                      <TableRow key={b.id} hover>
                        {batchCells(b, { nested: true })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    );
  };

  const medCard = (m) => {
    const e = expanded[m.id];
    return (
      <Paper key={m.id} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", borderColor: m.low_stock ? fade(cssVar("error"), 0.35) : "divider" }}>
        <Box
          component="button"
          type="button"
          onClick={() => toggle(m.id)}
          aria-expanded={Boolean(e)}
          sx={{ all: "unset", boxSizing: "border-box", width: "100%", cursor: "pointer", display: "flex", flexDirection: "column", gap: 1, p: 1.5 }}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between" sx={{ width: "100%" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }} noWrap>
                {m.medicine_name}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
                {[medDetail(m), perStrip(m.pack_units, m.pack_word)].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
            <MedicineStatus m={m} />
          </Stack>
          <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ width: "100%" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>{medStock(m)}</Box>
            {view === "low" ? (
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600 }}>Short by</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: toneInk("error"), ...nums }}>
                  {m.shortfall_strips} {plural(m.pack_word || "strip", m.shortfall_strips)}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ minWidth: 0, maxWidth: "50%" }}>
                <LocationsList locations={m.locations} />
              </Box>
            )}
            {e ? <KeyboardArrowDownIcon sx={{ color: "text.secondary" }} /> : <KeyboardArrowRightIcon sx={{ color: "text.secondary" }} />}
          </Stack>
        </Box>
        {e && (
          <Box sx={{ px: 1.25, pb: 1.25, pt: 0.25, bgcolor: fade(cssVar("primary"), 0.03), borderTop: 1, borderColor: "divider" }}>
            {e.loading && !e.rows ? (
              <Skeleton height={60} />
            ) : e.error ? (
              <Alert severity="error">{e.error}</Alert>
            ) : !e.rows.length ? (
              <Typography sx={{ fontSize: 13, color: "text.secondary", py: 1 }}>No batch holds stock.</Typography>
            ) : (
              <Stack spacing={1} sx={{ pt: 1 }}>
                {e.rows.map((b) => batchCard(b, { nested: true }))}
              </Stack>
            )}
          </Box>
        )}
      </Paper>
    );
  };

  /* ---------- table layouts ---------- */
  const batchCols = 7 + (showBranch ? 1 : 0) + (canAdjust ? 1 : 0);
  const medCols = view === "low" ? 8 : 7;

  const Icon = cfg.icon;

  return (
    <Box
      ref={shellRef}
      sx={{ height: shellHeight, maxHeight: "86vh", display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default", minWidth: 0 }}
    >
      {/* ---------------- header ---------------- */}
      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 2, md: 3 },
          py: { xs: 1.25, md: 1.5 },
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: { xs: "none", sm: "grid" }, placeItems: "center", flexShrink: 0, color: cssVar("primary"), bgcolor: fade(cssVar("primary"), 0.1) }}>
          <Icon sx={{ fontSize: 21 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography component="h1" sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700, letterSpacing: "-0.01em" }} noWrap>
              {cfg.title}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary", ...nums }} noWrap aria-live="polite">
              {countText}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", display: { xs: "none", lg: "block" } }} noWrap>
            {cfg.subtitle}
          </Typography>
        </Box>
        {!phone && <BranchPicker state={br} />}
      </Box>

      {/* ---------------- toolbar ---------------- */}
      <Box sx={{ flexShrink: 0, px: { xs: 1.5, md: 3 }, pt: 1.5, pb: 1.25, display: "flex", alignItems: "center", gap: 1.25 }}>
        <Box sx={{ flex: phone ? 1 : "0 1 420px", minWidth: 0 }}>{searchField}</Box>
        {!phone && filterSelect}
        {phone && (cfg.filterLabel || br.multi) && (
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setFilterSheet((v) => !v)}
            aria-label="Filters"
            aria-expanded={filterSheet}
            sx={{ ...buttonSx, minWidth: 40, height: 40, px: 1.25, borderColor: "divider", bgcolor: "background.paper" }}
          >
            <TuneIcon fontSize="small" />
          </Button>
        )}
      </Box>
      {phone && (
        <Collapse in={filterSheet} sx={{ flexShrink: 0 }}>
          <Box sx={{ px: 1.5, pb: 1.25, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            {cfg.filterLabel && <Box sx={{ "& .MuiTextField-root": { width: "100%", minWidth: 0 } }}>{filterSelect}</Box>}
            <BranchPicker state={br} sx={{ minWidth: 0, width: "100%" }} />
          </Box>
        </Collapse>
      )}

      {/* ---------------- list ---------------- */}
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", px: { xs: 1.5, md: 3 }, pb: { xs: 1, md: 2 } }}>
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 3,
            ...(phone && { border: 0, bgcolor: "transparent", borderRadius: 0 }),
          }}
        >
          <Box sx={{ height: 2, flexShrink: 0 }}>{loading && !firstLoad && <LinearProgress sx={{ height: 2 }} />}</Box>
          {view === "batches" && canAssign && unassignedCount > 0 && (
            <Alert
              severity="warning"
              icon={false}
              sx={{ borderRadius: phone ? 2 : 0, mb: phone ? 1 : 0, flexShrink: 0, py: 0.5, alignItems: "center", "& .MuiAlert-message": { width: "100%", py: 0.5 } }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, flex: "1 1 260px", minWidth: 0 }}>
                  {unassignedCount} {unassignedCount === 1 ? "batch has" : "batches have"} no branch yet — they can't be sold or adjusted until they belong to one.
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 13 }}>Assign all to</Typography>
                  <TextField
                    select
                    size="small"
                    value={bulkBranch}
                    onChange={(e) => setBulkBranch(e.target.value)}
                    SelectProps={{ displayEmpty: true }}
                    inputProps={{ "aria-label": "Branch for the unassigned batches" }}
                    sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "background.paper", height: 34, fontSize: 13.5 } }}
                  >
                    <MenuItem value="" disabled>
                      Choose a branch
                    </MenuItem>
                    {br.branches.map((b) => (
                      <MenuItem key={b} value={b}>
                        {b}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="contained"
                    disableElevation
                    disabled={!bulkBranch}
                    onClick={() => setAssignFor({ all: true })}
                    sx={{ ...buttonSx, height: 34 }}
                  >
                    Assign
                  </Button>
                </Box>
              </Box>
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ m: 1.5, borderRadius: 2, flexShrink: 0 }} action={<Button color="inherit" size="small" onClick={refresh}>Retry</Button>}>
              {error}
            </Alert>
          )}

          {phone ? (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", opacity: loading && !firstLoad ? 0.6 : 1, transition: "opacity .15s" }}>
              {firstLoad ? (
                <Stack spacing={1}>
                  {[0, 1, 2, 3].map((i) => (
                    <Paper key={i} variant="outlined" sx={{ borderRadius: 3, p: 1.5 }}>
                      <Skeleton width="55%" height={22} />
                      <Skeleton width="40%" />
                      <Skeleton width="30%" height={26} />
                    </Paper>
                  ))}
                </Stack>
              ) : rows.length ? (
                <Stack spacing={1} sx={{ pb: 1 }}>
                  {rows.map((r) => (isBatch ? batchCard(r) : medCard(r)))}
                </Stack>
              ) : (
                !error && (
                  <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                    <EmptyState view={view} filtered={filtered} onClear={clearSearch} within={filter} />
                  </Paper>
                )
              )}
            </Box>
          ) : (
            <TableContainer sx={{ flex: 1, minHeight: 0 }}>
              {isBatch ? (
                <Table stickyHeader sx={{ tableLayout: "fixed", minWidth: 900, "& th": headCellSx, "& td": { py: 1 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Medicine</TableCell>
                      <TableCell sx={{ width: 132 }}>Batch</TableCell>
                      <TableCell sx={{ width: 118 }}>Expiry</TableCell>
                      <TableCell sx={{ width: 128 }}>Tablets / strip</TableCell>
                      <TableCell sx={{ width: 168 }}>Stock</TableCell>
                      <TableCell sx={{ width: 196 }}>Location</TableCell>
                      {showBranch && <TableCell sx={{ width: 132 }}>Branch</TableCell>}
                      <TableCell sx={{ width: 104 }}>Status</TableCell>
                      {canAdjust && <TableCell sx={{ width: 104 }} />}
                    </TableRow>
                  </TableHead>
                  <TableBody sx={{ opacity: loading && !firstLoad ? 0.6 : 1, transition: "opacity .15s" }}>
                    {firstLoad &&
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={`sk${i}`}>
                          {Array.from({ length: batchCols }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton width={j === 0 ? "70%" : "60%"} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    {rows.map((b) => (
                      <TableRow key={b.id} hover sx={{ "& td": { opacity: b.stock_status === "blocked" ? 0.65 : 1 } }}>
                        {batchCells(b)}
                      </TableRow>
                    ))}
                    {!loading && !rows.length && !error && (
                      <TableRow>
                        <TableCell colSpan={batchCols} sx={{ p: 0, borderBottom: 0 }}>
                          <EmptyState view={view} filtered={filtered} onClear={clearSearch} within={filter} />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table stickyHeader sx={{ tableLayout: "fixed", minWidth: 860, "& th": headCellSx, "& td": { py: 1.1 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 44, pr: 0 }} />
                      <TableCell>Medicine</TableCell>
                      <TableCell sx={{ width: 128 }}>Tablets / strip</TableCell>
                      <TableCell sx={{ width: 190 }}>Stock</TableCell>
                      <TableCell sx={{ width: 120 }}>Reorder at</TableCell>
                      {view === "low" && <TableCell sx={{ width: 110 }}>Short by</TableCell>}
                      <TableCell sx={{ width: 200 }}>Location</TableCell>
                      <TableCell sx={{ width: 118 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody sx={{ opacity: loading && !firstLoad ? 0.6 : 1, transition: "opacity .15s" }}>
                    {firstLoad &&
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={`sk${i}`}>
                          {Array.from({ length: medCols }).map((__, j) => (
                            <TableCell key={j}>{j ? <Skeleton width="60%" /> : null}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    {rows.map((m) => (
                      <React.Fragment key={m.id}>
                        <TableRow
                          hover
                          onClick={() => toggle(m.id)}
                          sx={{ cursor: "pointer", "& > td": { borderBottom: expanded[m.id] ? 0 : undefined } }}
                          aria-expanded={Boolean(expanded[m.id])}
                        >
                          <TableCell sx={{ pr: 0 }}>
                            <IconButton size="small" aria-label={expanded[m.id] ? `Hide batches of ${m.medicine_name}` : `Show batches of ${m.medicine_name}`}>
                              {expanded[m.id] ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap title={m.medicine_name}>
                              {m.medicine_name}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
                              {[medDetail(m), m.category_name].filter(Boolean).join(" · ") || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 13, ...nums }}>{perStrip(m.pack_units, m.pack_word)}</Typography>
                          </TableCell>
                          <TableCell>{medStock(m)}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 13, color: m.reorder_level ? "text.primary" : "text.disabled", ...nums }}>
                              {m.reorder_level ? `${m.reorder_level} ${plural(m.pack_word || "strip", m.reorder_level)}` : "Not set"}
                            </Typography>
                          </TableCell>
                          {view === "low" && (
                            <TableCell>
                              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: toneInk("error"), ...nums }}>
                                {m.shortfall_strips} {plural(m.pack_word || "strip", m.shortfall_strips)}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell sx={{ overflow: "hidden" }}>
                            <LocationsList locations={m.locations} />
                          </TableCell>
                          <TableCell>
                            <MedicineStatus m={m} />
                          </TableCell>
                        </TableRow>
                        {nestedBatches(m, medCols)}
                      </React.Fragment>
                    ))}
                    {!loading && !rows.length && !error && (
                      <TableRow>
                        <TableCell colSpan={medCols} sx={{ p: 0, borderBottom: 0 }}>
                          <EmptyState view={view} filtered={filtered} onClear={clearSearch} within={filter} />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          )}

          <AppPager
            page={page}
            pageSize={limit}
            total={total}
            onPageChange={setPage}
            pageSizeOptions={[20, 50, 100]}
            onPageSizeChange={(n) => {
              setLimit(n);
              setPage(1);
            }}
            disabled={loading}
            sx={phone ? { px: 0.5, bgcolor: "transparent" } : undefined}
          />
        </Paper>
      </Box>

      <LocationDialog
        open={Boolean(locFor)}
        batch={locFor}
        suggestions={suggestions}
        onClose={() => setLocFor(null)}
        onSaved={(row, message) => {
          setLocFor(null);
          setToast({ severity: "success", message: message || "Location saved" });
          // update the row in place (batch views) and in any opened medicine
          setRows((prev) => prev.map((r) => (isBatch && r.id === row.id ? { ...r, ...row } : r)));
          setExpanded((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((k) => {
              if (next[k].rows) next[k] = { ...next[k], rows: next[k].rows.map((b) => (b.id === row.id ? { ...b, ...row } : b)) };
            });
            return next;
          });
          if (!isBatch) setReloadKey((k) => k + 1);
        }}
      />

      <AssignBranchDialog
        open={Boolean(assignFor)}
        batch={assignFor?.batch || null}
        count={unassignedCount}
        branch={assignFor?.all ? bulkBranch : ""}
        branches={br.branches}
        onClose={() => setAssignFor(null)}
        onSaved={(message) => {
          setAssignFor(null);
          setBulkBranch("");
          setToast({ severity: "success", message });
          refresh();
        }}
      />

      <AdjustStockDialog
        open={Boolean(adjustFor)}
        batch={adjustFor}
        branch={br.branch}
        onClose={() => setAdjustFor(null)}
        onSaved={(message) => {
          setAdjustFor(null);
          setToast({ severity: "success", message });
          refresh();
        }}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4500}
        onClose={(_, r) => r !== "clickaway" && setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: phone ? "center" : "left" }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

/** The page, wrapped so it reads its colours from src/theme/appColors.js. */
export default function Inventory({ view = "batches" }) {
  return (
    <ColorRoot>
      <InventoryPage key={view} view={view} />
    </ColorRoot>
  );
}