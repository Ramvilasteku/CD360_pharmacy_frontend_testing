// src/components/pharmacy/medicines/Medicines.jsx
//
// Main Medicines inventory page.
// Changes vs. the original single-file version:
//   • Split into 4 files:
//       Medicines.jsx           (this)
//       MedicineForm.jsx
//       MedicineCsvImport.jsx
//       medicinesShared.js
//   • Page size is now 10 records per page (PAGE_SIZE in shared).
//   • NO internal scroll on the list / table — removed useFitToScreen,
//     the TableContainer flex:1/overflow:auto, and the compact wrapper's
//     overflowY:auto. The browser owns the vertical scroll; the page
//     grows as tall as it needs.

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePermission } from "../../Redux/store/hooks/usePermissions";
import axios from "axios";
import {
  Box, Stack, Paper, Typography, Button, IconButton, TextField, MenuItem,
  Menu, ListItemIcon, ListItemText, InputAdornment, Tabs, Tab,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  TablePagination, Pagination, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Drawer, Switch, Chip, Badge, Alert, Snackbar,
  CircularProgress, LinearProgress, Skeleton, Divider, useMediaQuery,
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
import LocalPharmacyOutlinedIcon from "@mui/icons-material/LocalPharmacyOutlined";

import MedicineForm from "./MedicineForm";
import MedicineCsvImport from "./MedicineCsvImport";
import {
  // NO_PERMISSIONS dropped from this import on 25 Oct — permissions now come from
  // usePermission() rather than a raw useSelector, so the stable-reference fallback is
  // no longer needed here. It is still exported from medicinesShared.js for other callers.
  API, EMPTY_FORM, STATUS_TABS, RX_FILTERS, RETURN_FILTERS,
  DEFAULT_FILTER, PAGE_SIZE, numeric, btn, srOnly,
  Pill, PolicyPill, RxBadge, EmptyState,
  money, parsePolicy, detailText, medicineLabel, priceCaption,
  useElementWidth, errMsg,
} from "./medicinesShared";
import BranchPicker, { usePharmacyBranch } from "../shared/BranchPicker";

export default function Medicines() {
  // A medicine is tenant-level master data, so the medicine ROWS are never filtered by
  // branch — every branch sells the same catalogue, and P2 can see Dolo even though only
  // P1 holds it.
  //
  // 26 Oct 2026: the branch picker is back (it was removed on 24 Oct), matching Ram's
  // Medicines list. It drives the STOCK column and the low-stock colouring only — never
  // which medicines are listed. Admin: opens on All branches (the whole pharmacy's stock)
  // and can pick one; staff: always their own branch, shown as a chip, not changeable.
  // defaultAll keeps this pick local to this screen, so it can't change what POS sells from.
  const br = usePharmacyBranch({ allowAll: true, defaultAll: true });
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });

  // Reading s.auth.permissions directly skipped the admin bypass, and buildUserAccess() in
  // controllers/authController.js returns permissions: [] for every tenant admin (its
  // role-id fallback is staff-only), so the admin saw this catalogue as read-only on their
  // own pharmacy. usePermission() bypasses on role === "admin", matching
  // middlewares/allowPermissions.js server-side. See the fuller note in POS.js.
  const canCreate = usePermission("pharmacy.medicines.create");
  const canEdit = usePermission("pharmacy.medicines.edit");
  const canDelete = usePermission("pharmacy.medicines.delete");
  const readOnly = !canEdit && !canCreate;

  // Breakpoints keyed to the page's real width (useful behind narrow sidebars)
  const rootRef = useRef(null);
  const width = useElementWidth(rootRef);
  const compact = width == null ? isPhone : width < 760; // → cards
  const wide = width == null ? !isPhone : width >= 1100; // separate Category / Manufacturer columns
  const roomy = width == null ? !isPhone : width >= 960; // search + filters on one row

  /* ─────────── list state ─────────── */
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [listError, setListError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({});
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE); // 10 by default
  const [filterSheet, setFilterSheet] = useState(false);

  /* ─────────── dialogs ─────────── */
  const [formState, setFormState] = useState({
    open: false, id: null, loading: false, initial: null,
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false, row: null, busy: false,
  });
  const [csvDialog, setCsvDialog] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [rowMenu, setRowMenu] = useState({ anchor: null, row: null });

  const [snackbar, setSnackbar] = useState({
    open: false, message: "", severity: "success",
  });
  const showMessage = useCallback(
    (message, severity = "success") =>
      setSnackbar({ open: true, message, severity }),
    []
  );

  const reload = () => setReloadKey((k) => k + 1);
  const update = useCallback((patch) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(0);
  }, []);

  // Debounced search
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
    if (f.prescription_required !== "")
      params.prescription_required = f.prescription_required;
    if (f.returnable !== "") params.returnable = f.returnable;
    return params;
  }, []);

  // Page of medicines
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setListError("");
      try {
        const params = {
          page: page + 1,
          limit: rowsPerPage,
          sort_by: "created_at",
          sort_order: "DESC",
          ...filterParams(filter),
          ...br.params,
        };
        if (filter.status) params.status = filter.status;
        const res = await axios.get(`${API}/api/pharmacy/medicines`, {
          params,
          withCredentials: true,
          signal: controller.signal,
        });
        const list = res.data.data || [];
        const total =
          res.data.pagination?.total ?? res.data.total ?? list.length;
        setMedicines(list);
        setTotalCount(total);
        setHasLoaded(true);
        if (list.length === 0 && total > 0 && page > 0)
          setPage(Math.max(0, Math.ceil(total / rowsPerPage) - 1));
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;
        setListError(
          errMsg(err, "Couldn't load medicines. Check your connection and try again.")
        );
        setMedicines([]);
        setTotalCount(0);
        setHasLoaded(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [page, rowsPerPage, filter, reloadKey, filterParams, br.branch]);

  // Tab counts
  const {
    search: fSearch,
    category_id: fCat,
    prescription_required: fRx,
    returnable: fRet,
  } = filter;
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const base = filterParams({
          search: fSearch,
          category_id: fCat,
          prescription_required: fRx,
          returnable: fRet,
        });
        const entries = await Promise.all(
          STATUS_TABS.map(async ({ value }) => {
            const params = { ...base, page: 1, limit: 1, ...br.params };
            if (value !== "all") params.status = value;
            const res = await axios.get(`${API}/api/pharmacy/medicines`, {
              params,
              withCredentials: true,
              signal: controller.signal,
            });
            return [
              value,
              res.data.pagination?.total ?? res.data.total ?? null,
            ];
          })
        );
        setCounts(Object.fromEntries(entries));
      } catch (err) {
        if (!(axios.isCancel(err) || err.code === "ERR_CANCELED"))
          setCounts({});
      }
    })();
    return () => controller.abort();
  }, [fSearch, fCat, fRx, fRet, reloadKey, filterParams]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/api/pharmacy/categories`, {
          params: { status: "active", limit: 500 },
          withCredentials: true,
        });
        setCategories(res.data.data || []);
      } catch {
        /* not fatal */
      }
    })();
  }, []);

  const categoryName = useMemo(
    () => Object.fromEntries(categories.map((c) => [String(c.id), c.category_name])),
    [categories]
  );

  /* ─────────── actions ─────────── */

  const openAdd = () =>
    setFormState({ open: true, id: null, loading: false, initial: { ...EMPTY_FORM } });

  const openEdit = async (row) => {
    setFormState({ open: true, id: row.id, loading: true, initial: null });
    try {
      const res = await axios.get(`${API}/api/pharmacy/medicines/${row.id}`, {
        params: br.params,
        withCredentials: true,
      });
      const m = res.data.data;
      const policy = parsePolicy(m.return_policy) || undefined;
      setFormState({
        open: true,
        id: row.id,
        loading: false,
        initial: {
          medicine_data_id: m.medicine_data_id,
          medicine_data_label: medicineLabel(m),
          category_id: m.category_id ?? "",
          manufacturer: m.manufacturer || "",
          pack_size: m.pack_size || "",
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
            requires_approval_after_window:
              policy?.requires_approval_after_window !== false,
            reason: policy?.reason || "",
            notes: policy?.notes || "",
          },
        },
      });
    } catch (err) {
      setFormState({ open: false, id: null, loading: false, initial: null });
      showMessage(
        errMsg(err, "Couldn't open this medicine. Please try again."),
        "error"
      );
    }
  };

  const closeForm = () =>
    setFormState({ open: false, id: null, loading: false, initial: null });

  const toggleStatus = async (row) => {
    setTogglingId(row.id);
    try {
      await axios.patch(
        `${API}/api/pharmacy/medicines/${row.id}/status`,
        {},
        { withCredentials: true }
      );
      showMessage(
        `${row.medicine_name} is now ${
          row.status === "active" ? "inactive" : "active"
        }`
      );
      reload();
    } catch (err) {
      showMessage(
        errMsg(err, "Couldn't change the status. Please try again."),
        "error"
      );
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    const row = deleteDialog.row;
    if (!row) return;
    setDeleteDialog((d) => ({ ...d, busy: true }));
    try {
      await axios.delete(`${API}/api/pharmacy/medicines/${row.id}`, {
        withCredentials: true,
      });
      showMessage(`${row.medicine_name} removed`);
      setDeleteDialog({ open: false, row: null, busy: false });
      reload();
    } catch (err) {
      showMessage(
        errMsg(err, "Couldn't remove this medicine. Please try again."),
        "error"
      );
      setDeleteDialog((d) => ({ ...d, busy: false }));
    }
  };

  const hasActiveFilters = Boolean(
    filter.search ||
      filter.category_id ||
      filter.prescription_required !== "" ||
      filter.returnable !== ""
  );
  const sheetCount =
    (filter.category_id ? 1 : 0) +
    (filter.prescription_required !== "" ? 1 : 0) +
    (filter.returnable !== "" ? 1 : 0);
  const clearFilters = () => {
    setSearchInput("");
    update({
      search: "", category_id: "",
      prescription_required: "", returnable: "",
    });
  };

  const pageCount = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const firstLoad = loading && medicines.length === 0 && !listError;
  const rowsClickable = canEdit;

  /* ─────────── shared field factories ─────────── */

  const searchField = (
    <TextField
      size="small" fullWidth
      placeholder={
        compact ? "Search name, code or barcode" : "Search name, brand, code or barcode"
      }
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") update({ search: searchInput.trim() });
        if (e.key === "Escape" && searchInput) {
          setSearchInput("");
          update({ search: "" });
        }
      }}
      inputProps={{ "aria-label": "Search medicines", enterKeyHint: "search" }}
      InputProps={{
        sx: { borderRadius: "10px", bgcolor: "background.paper" },
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: searchInput && (
          <InputAdornment position="end">
            <IconButton
              size="small" edge="end"
              aria-label="Clear search"
              onClick={() => { setSearchInput(""); update({ search: "" }); }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  const categorySelect = (props) => (
    <TextField
      select size="small" label="Category"
      value={filter.category_id}
      onChange={(e) => update({ category_id: e.target.value })}
      SelectProps={{ displayEmpty: true }}
      InputLabelProps={{ shrink: true }}
      InputProps={{ sx: { borderRadius: "10px" } }}
      {...props}
    >
      <MenuItem value="">All categories</MenuItem>
      {categories.map((c) => (
        <MenuItem key={c.id} value={c.id}>
          {c.category_name}
        </MenuItem>
      ))}
    </TextField>
  );

  const optionSelect = (label, key, options, props) => (
    <TextField
      select size="small" label={label}
      value={filter[key]}
      onChange={(e) => update({ [key]: e.target.value })}
      SelectProps={{ displayEmpty: true }}
      InputLabelProps={{ shrink: true }}
      InputProps={{ sx: { borderRadius: "10px" } }}
      {...props}
    >
      {options.map((o) => (
        <MenuItem key={o.value || "all"} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );

  const chipGroup = (key, options) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
      {options.map((o) => {
        const active = filter[key] === o.value;
        return (
          <Chip
            key={o.value || "all"}
            label={o.label}
            clickable
            color={active ? "primary" : "default"}
            variant={active ? "filled" : "outlined"}
            onClick={() => update({ [key]: o.value })}
            sx={{ height: 36, borderRadius: "10px" }}
          />
        );
      })}
    </Box>
  );

  const statusControl = (m) => {
    if (!canEdit)
      return (
        <Pill tone={m.status === "active" ? "success" : null}>
          {m.status === "active" ? "Active" : "Inactive"}
        </Pill>
      );
    return (
      <Stack
        direction="row" alignItems="center" spacing={0.5}
        onClick={(e) => e.stopPropagation()}
      >
        {togglingId === m.id ? (
          <Box sx={{ width: 40, display: "grid", placeItems: "center" }}>
            <CircularProgress size={18} />
          </Box>
        ) : (
          <Switch
            size="small"
            checked={m.status === "active"}
            onChange={() => toggleStatus(m)}
            inputProps={{ "aria-label": `${m.medicine_name} active` }}
          />
        )}
        <Typography
          variant="caption"
          color={m.status === "active" ? "text.primary" : "text.secondary"}
          sx={{ fontWeight: 600 }}
        >
          {m.status === "active" ? "Active" : "Inactive"}
        </Typography>
      </Stack>
    );
  };

  const rowActions = (m) => (
    <Stack
      direction="row" spacing={0.25} justifyContent="flex-end"
      onClick={(e) => e.stopPropagation()}
    >
      {canEdit && (
        <Tooltip title="Edit">
          <IconButton
            size="small"
            aria-label={`Edit ${m.medicine_name}`}
            onClick={() => openEdit(m)}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip title="More">
          <IconButton
            size="small"
            aria-label={`More actions for ${m.medicine_name}`}
            onClick={(e) => setRowMenu({ anchor: e.currentTarget, row: m })}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );

  const subtitleText = !hasLoaded
    ? "Loading…"
    : `${totalCount.toLocaleString("en-IN")} ${
        totalCount === 1 ? "medicine" : "medicines"
      }${
        hasActiveFilters
          ? isPhone
            ? " found"
            : " match your filters"
          : !isPhone && filter.status === "active"
          ? " in your active inventory"
          : ""
      }`;

  /* ─────────── render ─────────── */

  return (
    <Box
      ref={rootRef}
      sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minWidth: 0, contain: "inline-size" }}
    >
      {/* Header */}
      <Stack
        direction="row" alignItems="center" justifyContent="space-between"
        spacing={2} sx={{ mb: { xs: 2, md: 2.5 } }}
      >
        <Stack
          direction="row" alignItems="center"
          spacing={{ xs: 1.5, sm: 1.75 }}
          sx={{ minWidth: 0 }}
        >
          <Box
            sx={{
              width: { xs: 40, sm: 44 }, height: { xs: 40, sm: 44 },
              borderRadius: "12px", flexShrink: 0,
              display: "grid", placeItems: "center",
              bgcolor: alpha(
                theme.palette.primary.main,
                theme.palette.mode === "dark" ? 0.2 : 0.12
              ),
              color: "primary.main",
            }}
          >
            <LocalPharmacyOutlinedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h5" component="h1"
              sx={{
                fontWeight: 800, letterSpacing: "-0.01em",
                lineHeight: 1.2, fontSize: { xs: 20, sm: 22 },
              }}
            >
              {readOnly || isPhone ? "Medicines" : "Manage medicines"}
            </Typography>
            <Typography
              variant="body2" color="text.secondary"
              noWrap sx={{ fontSize: 13 }}
              aria-live="polite"
            >
              {readOnly ? "Reference list (view only) · " : ""}
              {subtitleText}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {canCreate &&
            (isPhone ? (
              <Tooltip title="Import from CSV">
                <IconButton
                  aria-label="Import from CSV"
                  onClick={() => setCsvDialog(true)}
                  sx={{
                    width: 40, height: 40, border: 1, borderColor: "divider",
                    borderRadius: "10px", bgcolor: "background.paper",
                  }}
                >
                  <UploadFileOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                variant="outlined"
                startIcon={<UploadFileOutlinedIcon />}
                onClick={() => setCsvDialog(true)}
                sx={{ ...btn, height: 40, bgcolor: "background.paper" }}
              >
                Import CSV
              </Button>
            ))}
          {canCreate && (
            <Button
              variant="contained" disableElevation
              startIcon={<AddIcon />}
              onClick={openAdd}
              sx={{ ...btn, height: 40, fontWeight: 700 }}
            >
              {isPhone ? "Add" : "Add medicine"}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* List card — NO internal scroll; flows with the page */}
      <Paper
        variant="outlined"
        sx={
          compact
            ? { border: 0, bgcolor: "transparent", overflow: "visible" }
            : { borderRadius: "16px", overflow: "hidden" }
        }
      >
        {/* Status tabs */}
        <Tabs
          value={filter.status || "all"}
          onChange={(_, v) => update({ status: v === "all" ? "" : v })}
          variant={compact ? "fullWidth" : "standard"}
          aria-label="Filter by status"
          sx={{
            px: { md: 1.5 }, minHeight: 48,
            borderBottom: 1, borderColor: "divider",
            "& .MuiTab-root": {
              textTransform: "none", fontWeight: 600, fontSize: 14,
              minHeight: 48, minWidth: { xs: 0, md: 96 }, px: { xs: 1, md: 2 },
            },
          }}
        >
          {STATUS_TABS.map((t) => {
            const selected = (filter.status || "all") === t.value;
            return (
              <Tab
                key={t.value}
                value={t.value}
                label={
                  <Stack
                    direction="row" alignItems="center" spacing={0.75}
                    component="span"
                  >
                    <span>{t.label}</span>
                    {counts[t.value] != null && (
                      <Box
                        component="span"
                        sx={{
                          minWidth: 22, height: 20, px: 0.75,
                          borderRadius: "999px", fontSize: 12,
                          lineHeight: "20px", textAlign: "center", ...numeric,
                          bgcolor: selected
                            ? alpha(theme.palette.primary.main, 0.12)
                            : "action.selected",
                          color: selected ? "primary.main" : "text.secondary",
                        }}
                      >
                        {Number(counts[t.value]).toLocaleString("en-IN")}
                      </Box>
                    )}
                  </Stack>
                }
              />
            );
          })}
        </Tabs>

        {/* Toolbar */}
        {compact ? (
          <Box>
            <Stack direction="row" spacing={1} sx={{ py: 1.5 }}>
              {searchField}
              <Badge
                color="primary" badgeContent={sheetCount} overlap="rectangular"
                sx={{ "& .MuiBadge-badge": { top: 4, right: 4 } }}
              >
                <Button
                  variant="outlined" color="inherit"
                  onClick={() => setFilterSheet(true)}
                  aria-label="Filters"
                  sx={{
                    minWidth: 40, height: 40, px: 1.25,
                    borderRadius: "10px", borderColor: "divider",
                    bgcolor: "background.paper", ...btn,
                  }}
                >
                  <TuneIcon fontSize="small" />
                  <Box
                    component="span"
                    sx={{ ml: 0.75, display: { xs: "none", sm: "inline" } }}
                  >
                    Filters
                  </Box>
                </Button>
              </Badge>
            </Stack>
            {sheetCount > 0 && (
              <Stack
                direction="row" spacing={1}
                sx={{ pb: 1.5, overflowX: "auto" }}
              >
                {filter.category_id && (
                  <Chip
                    size="small"
                    label={categoryName[String(filter.category_id)] || "Category"}
                    onDelete={() => update({ category_id: "" })}
                  />
                )}
                {filter.prescription_required !== "" && (
                  <Chip
                    size="small"
                    label={
                      filter.prescription_required === "true"
                        ? "Rx only"
                        : "OTC only"
                    }
                    onDelete={() => update({ prescription_required: "" })}
                  />
                )}
                {filter.returnable !== "" && (
                  <Chip
                    size="small"
                    label={
                      filter.returnable === "true" ? "Returnable" : "Non-returnable"
                    }
                    onDelete={() => update({ returnable: "" })}
                  />
                )}
              </Stack>
            )}
          </Box>
        ) : (
          <Box
            sx={
              roomy
                ? { display: "flex", alignItems: "center", gap: 1.5, p: 2 }
                : {
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 1.5, p: 2,
                  }
            }
          >
            <Stack
              direction="row" spacing={1} alignItems="center"
              sx={
                roomy
                  ? { flex: "1 1 auto", maxWidth: 440, minWidth: 0 }
                  : { gridColumn: "1 / -1", minWidth: 0 }
              }
            >
              {searchField}
              {!roomy && hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  startIcon={<ClearIcon />}
                  sx={{ ...btn, height: 40, flexShrink: 0 }}
                >
                  Clear
                </Button>
              )}
            </Stack>
            {categorySelect(
              roomy ? { sx: { width: 190, flexShrink: 0 } } : { fullWidth: true }
            )}
            {optionSelect(
              "Prescription", "prescription_required", RX_FILTERS,
              roomy ? { sx: { width: 150, flexShrink: 0 } } : { fullWidth: true }
            )}
            {optionSelect(
              "Returns", "returnable", RETURN_FILTERS,
              roomy ? { sx: { width: 170, flexShrink: 0 } } : { fullWidth: true }
            )}
            {/* Stock branch — renders nothing in a single-branch pharmacy */}
            <BranchPicker
              state={br}
              label="Stock in"
              sx={roomy ? { width: 180, flexShrink: 0 } : { width: "100%" }}
            />
            {roomy && hasActiveFilters && (
              <Button
                onClick={clearFilters}
                startIcon={<ClearIcon />}
                sx={{ ...btn, height: 40, ml: "auto", flexShrink: 0 }}
              >
                Clear filters
              </Button>
            )}
          </Box>
        )}

        <Box sx={{ height: 2 }}>
          {loading && !firstLoad && <LinearProgress sx={{ height: 2 }} />}
        </Box>

        {listError && (
          <Alert
            severity="error"
            sx={{ mx: compact ? 0 : 2, my: 2, borderRadius: "10px" }}
            action={
              <Button color="inherit" size="small" onClick={reload}>
                Retry
              </Button>
            }
          >
            {listError}
          </Alert>
        )}

        {/* Results — compact (cards) OR table. Both flow naturally; no internal scrollbar */}
        {compact ? (
          <Box
            sx={{
              opacity: loading && !firstLoad ? 0.55 : 1,
              transition: "opacity .15s",
              pb: 0.5,
            }}
          >
            {firstLoad ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "minmax(0, 1fr)",
                    sm: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 1.5,
                }}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Paper key={i} variant="outlined" sx={{ borderRadius: "14px", p: 2 }}>
                    <Skeleton width="60%" height={22} />
                    <Skeleton width="45%" />
                    <Skeleton width="35%" height={28} sx={{ mt: 1 }} />
                  </Paper>
                ))}
              </Box>
            ) : medicines.length > 0 ? (
              <Box
                component="ul"
                aria-label="Medicines"
                sx={{
                  listStyle: "none", m: 0, p: 0,
                  display: "grid", gap: 1.5,
                  gridTemplateColumns: {
                    xs: "minmax(0, 1fr)",
                    sm: "repeat(2, minmax(0, 1fr))",
                  },
                }}
              >
                {medicines.map((m) => (
                  <Box component="li" key={m.id} sx={{ display: "flex", minWidth: 0 }}>
                    <Paper
                      variant="outlined"
                      onClick={rowsClickable ? () => openEdit(m) : undefined}
                      sx={{
                        flex: 1, minWidth: 0,
                        borderRadius: "14px", p: 2, pb: 1.25,
                        display: "flex", flexDirection: "column", gap: 1.25,
                        opacity: m.status === "active" ? 1 : 0.75,
                        ...(rowsClickable && {
                          cursor: "pointer",
                          "&:hover": { borderColor: "primary.main" },
                        }),
                      }}
                    >
                      <Stack
                        direction="row" justifyContent="space-between"
                        spacing={1} alignItems="flex-start"
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle2" fontWeight={700}
                            sx={{ overflowWrap: "anywhere" }}
                          >
                            {m.medicine_name}{" "}
                            {m.prescription_required ? <RxBadge /> : null}
                          </Typography>
                          <Typography
                            variant="caption" color="text.secondary"
                            component="div"
                          >
                            {detailText(m) || "—"}
                          </Typography>
                          <Typography
                            variant="caption" color="text.secondary"
                            component="div" noWrap
                          >
                            {[m.category_name, m.manufacturer].filter(Boolean).join(" · ")}
                          </Typography>
                        </Box>
                        {rowActions(m)}
                      </Stack>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 18, ...numeric }}>
                          {money(m.selling_price)}
                        </Typography>
                        <Typography
                          variant="caption" color="text.secondary"
                          component="div" noWrap sx={numeric}
                        >
                          {[priceCaption(m, true), `GST ${Number(m.gst_percentage || 0)}%`]
                            .filter(Boolean).join(" · ")}
                        </Typography>
                      </Box>
                      <Divider />
                      <Stack
                        direction="row" justifyContent="space-between"
                        alignItems="center" spacing={1}
                        sx={{ minHeight: 32 }}
                      >
                        {statusControl(m)}
                        <PolicyPill raw={m.return_policy} />
                      </Stack>
                    </Paper>
                  </Box>
                ))}
              </Box>
            ) : (
              !listError &&
              !loading && (
                <Paper variant="outlined" sx={{ borderRadius: "14px" }}>
                  <EmptyState
                    filtered={hasActiveFilters}
                    onClear={clearFilters}
                    onAdd={canCreate ? openAdd : null}
                  />
                </Paper>
              )
            )}
          </Box>
        ) : (
          // Table — removed flex:1/minHeight:0/stickyHeader. Lets the page scroll naturally.
          <TableContainer>
            <Table
              sx={{
                minWidth: 640,
                tableLayout: "fixed",
                "& th": {
                  fontSize: 12, fontWeight: 600, letterSpacing: ".04em",
                  textTransform: "uppercase", color: "text.secondary",
                  whiteSpace: "nowrap", py: 1.25, bgcolor: "background.paper",
                  backgroundImage: `linear-gradient(${alpha(
                    theme.palette.text.primary, 0.03
                  )}, ${alpha(theme.palette.text.primary, 0.03)})`,
                },
                "& td": { py: 1.25 },
                "& tr:last-of-type td": { borderBottom: 0 },
                ...(width != null && width < 1000 && { "& th, & td": { px: 1.25 } }),
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Medicine</TableCell>
                  {wide && <TableCell sx={{ width: 150 }}>Category</TableCell>}
                  {wide && <TableCell sx={{ width: 150 }}>Manufacturer</TableCell>}
                  <TableCell align="right" sx={{ width: 150 }}>Price</TableCell>
                  <TableCell align="right" sx={{ width: 64 }}>GST</TableCell>
                  <TableCell sx={{ width: 136 }}>Returns</TableCell>
                  <TableCell sx={{ width: 124 }}>Status</TableCell>
                  <TableCell align="right" sx={{ width: canDelete ? 92 : 60 }}>
                    <Box component="span" sx={srOnly}>Actions</Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody
                sx={{
                  opacity: loading && !firstLoad ? 0.55 : 1,
                  transition: "opacity .15s",
                }}
              >
                {firstLoad &&
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      {Array.from({ length: wide ? 8 : 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton width={j === 0 ? 180 : 70} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {medicines.map((m) => (
                  <TableRow
                    key={m.id}
                    hover
                    onClick={rowsClickable ? () => openEdit(m) : undefined}
                    sx={{
                      cursor: rowsClickable ? "pointer" : "default",
                      "& td": { opacity: m.status === "active" ? 1 : 0.7 },
                    }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2" fontWeight={600}
                        sx={{ overflowWrap: "anywhere" }}
                      >
                        {m.medicine_name}{" "}
                        {m.prescription_required ? <RxBadge /> : null}
                      </Typography>
                      <Typography
                        variant="caption" color="text.secondary"
                        component="div" noWrap
                      >
                        {[detailText(m), m.medicine_code && `#${m.medicine_code}`]
                          .filter(Boolean).join(" · ") || "—"}
                      </Typography>
                      {!wide && (
                        <Typography
                          variant="caption" color="text.secondary"
                          component="div" noWrap
                        >
                          {[m.category_name, m.manufacturer].filter(Boolean).join(" · ")}
                        </Typography>
                      )}
                    </TableCell>
                    {wide && (
                      <TableCell>
                        <Typography variant="body2" noWrap title={m.category_name || undefined}>
                          {m.category_name || "—"}
                        </Typography>
                      </TableCell>
                    )}
                    {wide && (
                      <TableCell>
                        <Typography variant="body2" noWrap title={m.manufacturer || undefined}>
                          {m.manufacturer || "—"}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} sx={numeric}>
                        {money(m.selling_price)}
                      </Typography>
                      {priceCaption(m) && (
                        <Typography
                          variant="caption" color="text.secondary"
                          component="div" noWrap sx={numeric}
                          title="Purchase price · margin on the selling price"
                        >
                          {priceCaption(m)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={numeric}>
                        {Number(m.gst_percentage || 0)}%
                      </Typography>
                    </TableCell>
                    <TableCell><PolicyPill raw={m.return_policy} /></TableCell>
                    <TableCell>{statusControl(m)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {rowActions(m)}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && medicines.length === 0 && !listError && (
                  <TableRow>
                    <TableCell colSpan={wide ? 8 : 6} sx={{ p: 0 }}>
                      <EmptyState
                        filtered={hasActiveFilters}
                        onClear={clearFilters}
                        onAdd={canCreate ? openAdd : null}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination — flows at bottom of card, not sticky */}
        {totalCount > 0 &&
          (compact ? (
            <Stack alignItems="center" spacing={1} sx={{ pt: 2, pb: 1 }}>
              {pageCount > 1 && (
                <Pagination
                  count={pageCount}
                  page={page + 1}
                  onChange={(_, p) => setPage(p - 1)}
                  siblingCount={0}
                  boundaryCount={1}
                  shape="rounded"
                  color="primary"
                />
              )}
              <Typography variant="caption" color="text.secondary">
                Showing {page * rowsPerPage + 1}–
                {Math.min(totalCount, (page + 1) * rowsPerPage)} of{" "}
                {totalCount.toLocaleString("en-IN")}
              </Typography>
            </Stack>
          ) : (
            <TablePagination
              component="div"
              count={totalCount}
              page={Math.min(page, pageCount - 1)}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              showFirstButton
              showLastButton
              sx={{ borderTop: 1, borderColor: "divider" }}
            />
          ))}
      </Paper>

      {/* Row menu */}
      <Menu
        anchorEl={rowMenu.anchor}
        open={Boolean(rowMenu.anchor)}
        onClose={() => setRowMenu({ anchor: null, row: null })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {canEdit && rowMenu.row && (
          <MenuItem
            onClick={() => {
              const r = rowMenu.row;
              setRowMenu({ anchor: null, row: null });
              openEdit(r);
            }}
          >
            <ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {canDelete && rowMenu.row && (
          <MenuItem
            onClick={() => {
              const r = rowMenu.row;
              setRowMenu({ anchor: null, row: null });
              setDeleteDialog({ open: true, row: r, busy: false });
            }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon sx={{ color: "inherit" }}>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Remove…</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Filter sheet (phone / narrow) */}
      <Drawer
        anchor="bottom"
        open={compact && filterSheet}
        onClose={() => setFilterSheet(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "88vh",
          },
        }}
      >
        <Box
          sx={{
            width: 36, height: 4, borderRadius: 2,
            bgcolor: "divider", mx: "auto", mt: 1.25,
          }}
        />
        <Stack
          direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, pt: 1, pb: 0.5 }}
        >
          <Typography variant="h6" fontWeight={700}>Filters</Typography>
          <IconButton aria-label="Close filters" onClick={() => setFilterSheet(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Stack spacing={2.5} sx={{ px: 2.5, pt: 1.5, pb: 2, overflowY: "auto" }}>
          <BranchPicker state={br} label="Stock in" sx={{ width: "100%" }} />
          {categorySelect({ fullWidth: true })}
          <Box>
            <Typography variant="overline" color="text.secondary" component="div">
              Prescription
            </Typography>
            {chipGroup("prescription_required", RX_FILTERS)}
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" component="div">
              Returns
            </Typography>
            {chipGroup("returnable", RETURN_FILTERS)}
          </Box>
        </Stack>
        <Divider />
        <Stack
          direction="row" spacing={1.5}
          sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}
        >
          <Button
            fullWidth variant="outlined"
            onClick={() =>
              update({ category_id: "", prescription_required: "", returnable: "" })
            }
            sx={{ ...btn, height: 48 }}
          >
            Reset
          </Button>
          <Button
            fullWidth variant="contained" disableElevation
            onClick={() => setFilterSheet(false)}
            sx={{ ...btn, height: 48 }}
          >
            {loading
              ? "Show results"
              : `Show ${totalCount.toLocaleString("en-IN")} ${
                  totalCount === 1 ? "result" : "results"
                }`}
          </Button>
        </Stack>
      </Drawer>

      {/* Add / edit */}
      <MedicineForm
        state={formState}
        categories={categories}
        isPhone={isPhone}
        onClose={closeForm}
        onSaved={(message) => { closeForm(); showMessage(message); reload(); }}
        onEditExisting={canEdit ? (row) => openEdit(row) : null}
      />

      {/* Remove */}
      <Dialog
        open={deleteDialog.open}
        onClose={() =>
          !deleteDialog.busy &&
          setDeleteDialog({ open: false, row: null, busy: false })
        }
        maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: "18px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Remove {deleteDialog.row?.medicine_name}?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            It won't appear in POS or billing any more. Existing stock records
            and sale history are kept.
          </Typography>
          {canEdit && deleteDialog.row?.status === "active" && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Only pausing it for a while? Use the Active switch instead —
              you can turn it back on any time.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, row: null, busy: false })}
            disabled={deleteDialog.busy}
            sx={btn}
          >
            Cancel
          </Button>
          <Button
            color="error" variant="contained" disableElevation
            onClick={confirmDelete} disabled={deleteDialog.busy}
            startIcon={
              deleteDialog.busy
                ? <CircularProgress size={16} color="inherit" />
                : <DeleteOutlineIcon />
            }
            sx={btn}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV import */}
      <MedicineCsvImport
        open={csvDialog}
        isPhone={isPhone}
        onClose={() => setCsvDialog(false)}
        categories={categories}
        onComplete={() => { setCsvDialog(false); reload(); }}
        showMessage={showMessage}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={(_, r) => {
          if (r !== "clickaway") setSnackbar((s) => ({ ...s, open: false }));
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: isPhone ? "center" : "left" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%", borderRadius: "10px" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
