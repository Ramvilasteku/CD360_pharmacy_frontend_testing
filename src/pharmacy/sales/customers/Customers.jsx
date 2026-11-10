// src/pharmacy/sales/customers/Customers.jsx      (route: pharmacy/sales/customers — see Routes/pharmacyRoutes.jsx)
//
// The pharmacy's customer book — the people billed at the counter
// (pharmacy_customer_pos, one row per customer per tenant).
//
// WHY THIS SCREEN EXISTS
//   routes/Pharmacy/pharmacyCustomer.js has had full CRUD since it was written — create,
//   list with search and paging, lookup by mobile, get, update, delete, each permission
//   gated. Nothing ever called it except the POS type-ahead. So customers could be created
//   (silently, at bill time) but never corrected, never reviewed, and never deleted. A
//   mistyped phone number was permanent and invisible.
//
//   Pairing it with the removal of the implicit create is the point: creation became
//   deliberate, so there has to be somewhere to see and fix what was created.
//
// PERMISSIONS — one per action, the same keys the router guards on
//   pharmacy.customers.view     opens this page (enforced in Routes/usePharmacyRoutes.js)
//   pharmacy.customers.create   "Add customer"
//   pharmacy.customers.edit     the row's Edit
//   pharmacy.customers.delete   the row's Delete
//   Controls the user cannot use are not rendered — filling in a form and then being told
//   no is the thing to avoid.
//
// NO BRANCH PICKER
//   A customer belongs to the tenant, not a branch — the same reasoning that took the
//   branch dropdown off Medicines. Every branch bills the same people.
//
// LAYOUT
//   Table on wide screens, cards below ~760px of real width (measured on this element, not
//   the window, so it behaves behind the pharmacy sidebar). Shared AppPager, three page
//   numbers. Skeletons while loading, an empty state that differs for "no customers yet"
//   and "no matches".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, IconButton, InputAdornment,
  MenuItem, Paper, Skeleton, Snackbar, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";

import { usePermission } from "../../../Redux/store/hooks/usePermissions";
import { useElementWidth } from "../useFitToScreen";
import AppPager from "../../shared/AppPager";
import AccessDenied from "../../shared/AccessDenied";
import CustomerFormDialog from "./CustomerFormDialog";

const API = process.env.REACT_APP_URL;

const GENDER_FILTERS = [
  { value: "", label: "Any gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

// sort_by is validated server-side against this same list; anything else falls back to
// created_at, so keeping them in step is what makes the control honest.
const SORTS = [
  { value: "created_at:DESC", label: "Newest first" },
  { value: "created_at:ASC", label: "Oldest first" },
  { value: "name:ASC", label: "Name A–Z" },
  { value: "name:DESC", label: "Name Z–A" },
  { value: "updated_at:DESC", label: "Recently changed" },
];

const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const prettyDate = (v) => {
  if (!v) return "—";
  // MySQL hands back "2026-10-25 14:05:00"; Safari cannot parse the space form.
  const d = new Date(String(v).replace(" ", "T"));
  return isNaN(d) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const errMsg = (err, fallback) =>
  err?.response?.data?.message || (err?.response ? fallback : "Can't reach the server. Check your connection.");

export default function Customers() {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });

  const canView = usePermission("pharmacy.customers.view");
  const canCreate = usePermission("pharmacy.customers.create");
  const canEdit = usePermission("pharmacy.customers.edit");
  const canDelete = usePermission("pharmacy.customers.delete");

  // Breakpoints from this element's own width, so the layout is right behind a sidebar.
  const rootRef = useRef(null);
  const width = useElementWidth(rootRef);
  const compact = width == null ? isPhone : width < 760;
  const showEmail = width == null ? !isPhone : width >= 1040;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [sort, setSort] = useState(SORTS[0].value);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const say = (message, severity = "success") => setToast({ open: true, message, severity });

  // Debounce the search box. 350ms matches the other pharmacy lists.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");
      const [sort_by, sort_order] = sort.split(":");
      try {
        const res = await axios.get(`${API}/api/pharmacy/customers/get`, {
          withCredentials: true,
          signal,
          params: {
            search: search || undefined,
            gender: gender || undefined,
            page,
            limit,
            sort_by,
            sort_order,
          },
        });
        setRows(res.data?.data || []);
        setTotal(Number(res.data?.pagination?.total) || 0);
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;
        setRows([]);
        setTotal(0);
        setError(errMsg(err, "Could not load customers."));
      } finally {
        setLoading(false);
      }
    },
    [search, gender, sort, page, limit]
  );

  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, canView]);

  const reload = () => {
    const controller = new AbortController();
    load(controller.signal);
  };

  // A delete can empty the last page. Step back rather than showing "no matches" for a
  // filter the user never set.
  const afterDelete = () => {
    if (rows.length === 1 && page > 1) setPage((p) => p - 1);
    else reload();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/api/pharmacy/customers/delete/${deleteTarget.id}`, {
        withCredentials: true,
      });
      say(`${deleteTarget.name} removed from customers`);
      setDeleteTarget(null);
      afterDelete();
    } catch (err) {
      say(errMsg(err, "Could not delete this customer."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtersOn = !!(search || gender);

  const headerStats = useMemo(() => {
    if (loading && !rows.length) return null;
    if (filtersOn) return `${total.toLocaleString("en-IN")} ${total === 1 ? "match" : "matches"}`;
    return `${total.toLocaleString("en-IN")} ${total === 1 ? "customer" : "customers"}`;
  }, [loading, rows.length, filtersOn, total]);

  // The route already blocks this, but a permission can be revoked while the page is open —
  // usePermissionPolling refreshes every 60 seconds.
  if (!canView) {
    return <AccessDenied what="Customers" permission="pharmacy.customers.view" />;
  }

  const tint = (c, light, dark) => alpha(c, theme.palette.mode === "dark" ? dark : light);
  const divider = `1px solid ${theme.palette.divider}`;

  /* ─────────────────────────── row renderers ─────────────────────────── */

  const rowActions = (r) => (
    <Stack direction="row" spacing={0.25} justifyContent="flex-end">
      {canEdit && (
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => { setEditingRow(r); setFormOpen(true); }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => setDeleteTarget(r)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );

  const cards = (
    <Stack spacing={1.25}>
      {rows.map((r) => (
        <Paper key={r.id} variant="outlined" sx={{ p: 1.75, borderRadius: "14px" }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar
              sx={{
                width: 40, height: 40, fontSize: 14, fontWeight: 700,
                bgcolor: tint(theme.palette.primary.main, 0.12, 0.22),
                color: "primary.main",
              }}
            >
              {initials(r.name)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
                {r.name}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                <PhoneOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {r.mobile}
                </Typography>
              </Stack>
              {r.email && (
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                  <EmailOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary" noWrap>{r.email}</Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                {r.gender && (
                  <Chip label={r.gender} size="small" sx={{ height: 20, fontSize: 11, textTransform: "capitalize" }} />
                )}
                {r.age !== null && r.age !== undefined && r.age !== "" && (
                  <Chip label={`${r.age} yrs`} size="small" sx={{ height: 20, fontSize: 11 }} />
                )}
                <Typography variant="caption" color="text.secondary">
                  Added {prettyDate(r.created_at)}
                </Typography>
              </Stack>
            </Box>
            {rowActions(r)}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );

  const table = (
    <TableContainer>
      <Table size="small" sx={{ "& td, & th": { borderColor: theme.palette.divider } }}>
        <TableHead>
          <TableRow sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap", bgcolor: tint(theme.palette.text.primary, 0.03, 0.06) } }}>
            <TableCell>Customer</TableCell>
            <TableCell>Mobile</TableCell>
            {showEmail && <TableCell>Email</TableCell>}
            <TableCell>Gender</TableCell>
            <TableCell align="right">Age</TableCell>
            <TableCell>Added</TableCell>
            <TableCell align="right" sx={{ width: 96 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.id}
              hover
              sx={{ "&:last-child td": { border: 0 } }}
            >
              <TableCell>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                  <Avatar
                    sx={{
                      width: 30, height: 30, fontSize: 12, fontWeight: 700,
                      bgcolor: tint(theme.palette.primary.main, 0.12, 0.22),
                      color: "primary.main",
                    }}
                  >
                    {initials(r.name)}
                  </Avatar>
                  <Typography sx={{ fontWeight: 600 }} noWrap>{r.name}</Typography>
                </Stack>
              </TableCell>
              <TableCell sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.mobile}</TableCell>
              {showEmail && (
                <TableCell sx={{ maxWidth: 220 }}>
                  <Typography variant="body2" color={r.email ? "text.primary" : "text.secondary"} noWrap>
                    {r.email || "—"}
                  </Typography>
                </TableCell>
              )}
              <TableCell sx={{ textTransform: "capitalize" }}>{r.gender || "—"}</TableCell>
              <TableCell align="right">
                {r.age === null || r.age === undefined || r.age === "" ? "—" : r.age}
              </TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{prettyDate(r.created_at)}</TableCell>
              <TableCell align="right">{rowActions(r)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const skeletons = (
    <Stack spacing={1}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={compact ? 92 : 44} sx={{ borderRadius: "12px" }} />
      ))}
    </Stack>
  );

  const emptyState = (
    <Box sx={{ py: 7, px: 3, textAlign: "center" }}>
      <Box
        sx={{
          width: 56, height: 56, borderRadius: "16px", mx: "auto", mb: 1.5,
          display: "grid", placeItems: "center",
          bgcolor: tint(theme.palette.text.primary, 0.05, 0.1), color: "text.secondary",
        }}
      >
        {filtersOn ? <PersonSearchIcon /> : <PeopleOutlineIcon />}
      </Box>
      <Typography sx={{ fontWeight: 700 }}>
        {filtersOn ? "No customers match" : "No customers yet"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 420, mx: "auto" }}>
        {filtersOn
          ? "Try a different name, number or filter."
          : "Customers you add at the counter appear here. A walk-in bill doesn't create one — use Add customer to keep someone on file."}
      </Typography>
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
        {filtersOn && (
          <Button
            variant="outlined"
            onClick={() => { setSearchInput(""); setGender(""); setPage(1); }}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px" }}
          >
            Clear filters
          </Button>
        )}
        {!filtersOn && canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditingRow(null); setFormOpen(true); }}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}
          >
            Add customer
          </Button>
        )}
      </Stack>
    </Box>
  );

  /* ─────────────────────────── render ─────────────────────────── */

  return (
    <Box ref={rootRef} sx={{ px: { xs: 0, md: 0 }, pb: 3, minWidth: 0 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 2, p: { xs: 2, sm: 2.5 }, borderRadius: "16px", border: divider,
          backgroundImage: `linear-gradient(180deg, ${tint(theme.palette.primary.main, 0.05, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0)} 80%)`,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Stack direction="row" spacing={1.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 44, height: 44, borderRadius: "12px", flexShrink: 0,
                display: "grid", placeItems: "center",
                bgcolor: tint(theme.palette.primary.main, 0.12, 0.2), color: "primary.main",
              }}
            >
              <PeopleOutlineIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.25 }}>
                Customers
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {headerStats || "Loading…"}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Refresh">
              <IconButton onClick={reload} disabled={loading} size="small">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => { setEditingRow(null); setFormOpen(true); }}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px", flexShrink: 0 }}
              >
                Add customer
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Filters */}
      <Paper elevation={0} sx={{ mb: 2, p: { xs: 1.5, sm: 2 }, borderRadius: "16px", border: divider }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, mobile or email"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchInput("")} aria-label="Clear search">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
          />
          <TextField
            select
            size="small"
            label="Gender"
            value={gender}
            onChange={(e) => { setGender(e.target.value); setPage(1); }}
            sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
          >
            {GENDER_FILTERS.map((g) => (
              <MenuItem key={g.value || "any"} value={g.value}>{g.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Sort"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            sx={{ minWidth: 180, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
          >
            {SORTS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {/* List */}
      <Paper elevation={0} sx={{ borderRadius: "16px", border: divider, overflow: "hidden" }}>
        {error ? (
          <Box sx={{ p: 2 }}>
            <Alert
              severity="error"
              action={<Button color="inherit" size="small" onClick={reload}>Try again</Button>}
            >
              {error}
            </Alert>
          </Box>
        ) : loading && !rows.length ? (
          <Box sx={{ p: 2 }}>{skeletons}</Box>
        ) : rows.length === 0 ? (
          emptyState
        ) : (
          <>
            <Box sx={{ p: compact ? 1.5 : 0, opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
              {compact ? cards : table}
            </Box>
            <Box sx={{ px: 2, py: 1.25, borderTop: divider }}>
              <AppPager
                page={page}
                pageSize={limit}
                total={total}
                onPageChange={setPage}
                pageSizeOptions={[10, 20, 50]}
                onPageSizeChange={(n) => { setLimit(n); setPage(1); }}
              />
            </Box>
          </>
        )}
      </Paper>

      {/* Add / edit */}
      <CustomerFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingRow(null); }}
        customer={editingRow}
        onSaved={(saved, meta) => {
          say(meta?.created ? `${saved?.name || "Customer"} added` : `${saved?.name || "Customer"} updated`);
          reload();
        }}
      />

      {/* Delete confirmation.
          routes/Pharmacy/pharmacyCustomer.js does a HARD delete (its own TODO says to block
          this once a customer has sales history, which it does not yet do). So the wording
          is explicit that it cannot be undone, and says what happens to past bills: they
          keep the customer's name and number in their own columns on pharmacy_sales, so no
          bill is lost or changed — it just stops linking to a customer record. */}
      <Dialog
        open={!!deleteTarget}
        onClose={deleting ? undefined : () => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete this customer?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.mobile}) will be removed
              from your customer list. This can't be undone.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Past bills aren't affected — they keep this name and number, they just stop
              linking to a customer record.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon />}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}