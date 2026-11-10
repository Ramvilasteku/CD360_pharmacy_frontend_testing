// src/components/pharmacy/categories/Categories.jsx
//
// Main Categories page. Composes:
//   - CategoryFormDialog  (add/edit)
//   - BulkUploadDialog    (CSV/Excel bulk)
//   - categoriesUtils     (useDebounced)
//
// Page size: 10 records per page (matches the backend limit param).

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { usePermission } from "../../Redux/store/hooks/usePermissions";
import {
  Box, Paper, Typography, TextField, Button, IconButton, Chip, Avatar,
  Stack, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Pagination, MenuItem, Alert, Snackbar,
  InputAdornment, Switch, Card, CardContent,
  useMediaQuery, Skeleton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CategoryIcon from "@mui/icons-material/Category";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";

import CategoryFormDialog from "./CategoryFormDialog";
import BulkUploadDialog from "./BulkUploadDialog";
import { useDebounced } from "./categoriesUtils";

const API = process.env.REACT_APP_URL;
const PAGE_SIZE = 10;

export default function Categories() {
  // Added 25 Oct: this screen had no permission check of any kind, so every user who could
  // see it was offered Add / Edit / Delete / Bulk Upload and got a 403 from
  // routes/Pharmacy/categories.js on pressing one. A category is medicine master data, so
  // it rides on the medicines keys — which is what that router already guards on.
  const canCreate = usePermission("pharmacy.medicines.create");
  const canEdit = usePermission("pharmacy.medicines.edit");
  const canDelete = usePermission("pharmacy.medicines.delete");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const useCards = useMediaQuery(theme.breakpoints.down("md")); // phone + tablet

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const dSearch = useDebounced(search, 400);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showMessage = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create mode; object = edit mode
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  /* ═════ LOAD ═════ */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort_by: "created_at",
        sort_order: "DESC",
      });
      if (dSearch.trim()) params.set("search", dSearch.trim());
      if (statusFilter) params.set("status", statusFilter);
      const res = await axios.get(
        `${API}/api/pharmacy/categories?${params}`,
        { withCredentials: true }
      );
      setRows(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to load categories", "error");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, dSearch, statusFilter]);

  useEffect(() => { load(); }, [load]);

  /* ═════ SAVE (create or update) ═════ */
  const handleSave = async (payload) => {
    try {
      if (editing?.id) {
        await axios.put(
          `${API}/api/pharmacy/categories/${editing.id}`,
          payload,
          { withCredentials: true }
        );
        showMessage(`"${payload.category_name}" updated`, "success");
      } else {
        await axios.post(
          `${API}/api/pharmacy/categories/post`,
          payload,
          { withCredentials: true }
        );
        showMessage(`"${payload.category_name}" created`, "success");
      }
      setFormOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      showMessage(
        err.response?.data?.message || "Failed to save category",
        err.response?.status === 409 ? "warning" : "error"
      );
      throw err; // keep form open on failure
    }
  };

  /* ═════ DELETE ═════ */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(
        `${API}/api/pharmacy/categories/${deleteTarget.id}`,
        { withCredentials: true }
      );
      showMessage(`"${deleteTarget.category_name}" deactivated`, "info");
      setDeleteTarget(null);
      load();
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to deactivate", "error");
    }
  };

  /* ═════ TOGGLE STATUS ═════ */
  const toggleStatus = async (row) => {
    try {
      await axios.patch(
        `${API}/api/pharmacy/categories/${row.id}/status`,
        {},
        { withCredentials: true }
      );
      showMessage(
        row.status === "active"
          ? `"${row.category_name}" deactivated`
          : `"${row.category_name}" activated`,
        "info"
      );
      load();
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to toggle status", "error");
    }
  };

  const resultCountLabel = useMemo(() => {
    if (loading) return "Loading…";
    if (total === 0) return "No categories";
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    return `${from}–${to} of ${total}`;
  }, [loading, total, page]);

  /* ═════ RENDER ═════ */
  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 1.5, sm: 2.5, md: 3 } }}>
        <Stack spacing={{ xs: 2, sm: 2.5 }}>

          {/* ═════ PAGE HEADER ═════ */}
          <Paper elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3, bgcolor: "#fff",
              border: "1px solid #e2e8f0",
            }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
              spacing={2}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ bgcolor: "#0f766e", width: 44, height: 44 }}>
                  <CategoryIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ fontSize: { xs: 20, sm: 24 } }}>
                    Medicine Categories
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Group your inventory for faster search and reporting
                  </Typography>
                </Box>
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ width: { xs: "100%", md: "auto" } }}
              >
                {canCreate && (
                  <Button
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    onClick={() => setBulkOpen(true)}
                    fullWidth={isMobile}
                    sx={{
                      textTransform: "none", borderRadius: 2, fontWeight: 700,
                      borderColor: "#f59e0b", color: "#92400e", bgcolor: "#fffbeb",
                      "&:hover": { borderColor: "#d97706", bgcolor: "#fef3c7" },
                    }}
                  >
                    Bulk Upload
                  </Button>
                )}
                {canCreate && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => { setEditing(null); setFormOpen(true); }}
                    fullWidth={isMobile}
                    sx={{
                      bgcolor: "#0f766e", textTransform: "none",
                      borderRadius: 2, fontWeight: 700,
                      "&:hover": { bgcolor: "#0d5a54" },
                    }}
                  >
                    Add Category
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>

          {/* ═════ TOOLBAR — search + filter ═════ */}
          <Paper elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 3, bgcolor: "#fff",
              border: "1px solid #e2e8f0",
            }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ sm: "center" }}
            >
              <TextField
                placeholder="Search by name or description…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: search && (
                    <IconButton size="small" onClick={() => setSearch("")}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
                sx={{ flex: 1, bgcolor: "#f8fafc" }}
              />

              <TextField
                select size="small"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                sx={{ minWidth: { xs: "100%", sm: 180 }, bgcolor: "#f8fafc" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterListIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">All statuses</MenuItem>
                <MenuItem value="active">Active only</MenuItem>
                <MenuItem value="inactive">Inactive only</MenuItem>
              </TextField>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ minWidth: 80, textAlign: "right" }}>
                  {resultCountLabel}
                </Typography>
                <Tooltip title="Refresh">
                  <IconButton onClick={load} size="small">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Paper>

          {/* ═════ CONTENT ═════ */}
          {loading ? (
            <Paper elevation={0}
              sx={{ p: 2, borderRadius: 3, border: "1px solid #e2e8f0" }}>
              <Stack spacing={1.2}>
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={48} />
                ))}
              </Stack>
            </Paper>
          ) : rows.length === 0 ? (
            <Paper elevation={0}
              sx={{
                p: { xs: 4, sm: 6 }, borderRadius: 3,
                border: "2px dashed #cbd5e1",
                textAlign: "center", bgcolor: "#fff",
              }}>
              <CategoryIcon sx={{ fontSize: 56, color: "#cbd5e1", mb: 1 }} />
              <Typography color="text.secondary" fontWeight={600}>
                {dSearch || statusFilter ? "No matches" : "No categories yet"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                {dSearch || statusFilter
                  ? "Try a different search or filter"
                  : "Add your first category or upload a CSV / Excel file"}
              </Typography>
              {!dSearch && !statusFilter && canCreate && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="center">
                  <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setEditing(null); setFormOpen(true); }}
                    sx={{
                      bgcolor: "#0f766e", textTransform: "none", borderRadius: 2,
                      fontWeight: 700, "&:hover": { bgcolor: "#0d5a54" },
                    }}>
                    Add Category
                  </Button>
                  <Button variant="outlined" startIcon={<UploadFileIcon />}
                    onClick={() => setBulkOpen(true)}
                    sx={{
                      textTransform: "none", borderRadius: 2, fontWeight: 700,
                      borderColor: "#f59e0b", color: "#92400e",
                    }}>
                    Bulk Upload
                  </Button>
                </Stack>
              )}
            </Paper>
          ) : useCards ? (
            /* ─── Cards layout for phone + tablet ─── */
            <Stack spacing={1.5}>
              {rows.map((r) => (
                <Card key={r.id} elevation={0}
                  sx={{
                    borderRadius: 2.5, border: "1px solid #e2e8f0",
                    transition: "all 0.15s",
                    "&:hover": { borderColor: "#0f766e", boxShadow: "0 2px 10px #0f766e15" },
                  }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700} noWrap>{r.category_name}</Typography>
                        {r.description && (
                          <Typography variant="caption" color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}>
                            {r.description}
                          </Typography>
                        )}
                        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 1 }}>
                          <Chip
                            label={r.status === "active" ? "Active" : "Inactive"}
                            size="small"
                            color={r.status === "active" ? "success" : "default"}
                            sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Added {new Date(r.created_at).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      </Box>
                      <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                        <Switch
                          size="small"
                          checked={r.status === "active"}
                          disabled={!canEdit}
                          onChange={() => toggleStatus(r)}
                          color="success"
                        />
                        <Stack direction="row">
                          {canEdit && (
                            <Tooltip title="Edit">
                              <IconButton size="small"
                                onClick={() => { setEditing(r); setFormOpen(true); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error"
                                onClick={() => setDeleteTarget(r)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            /* ─── Table layout for laptop / desktop ─── */
            <Paper elevation={0}
              sx={{ borderRadius: 3, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                      <TableCell sx={{ fontWeight: 700, color: "#334155" }}>CATEGORY</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#334155" }}>DESCRIPTION</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#334155", width: 120 }}>STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#334155", width: 150 }}>ADDED</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#334155", width: 140, textAlign: "right" }}>
                        ACTIONS
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id} hover
                        sx={{ "&:last-child td": { border: 0 } }}>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar sx={{
                              width: 32, height: 32, bgcolor: "#0f766e15",
                              color: "#0f766e", fontSize: 13, fontWeight: 700,
                            }}>
                              {r.category_name?.[0]?.toUpperCase() || "?"}
                            </Avatar>
                            <Typography fontWeight={600}>{r.category_name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ color: "#64748b", maxWidth: 400 }}>
                          <Typography variant="body2"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}>
                            {r.description || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Switch
                              size="small"
                              checked={r.status === "active"}
                              disabled={!canEdit}
                              onChange={() => toggleStatus(r)}
                              color="success"
                            />
                            <Chip
                              label={r.status === "active" ? "Active" : "Inactive"}
                              size="small"
                              color={r.status === "active" ? "success" : "default"}
                              sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ color: "#64748b" }}>
                          <Typography variant="body2">
                            {new Date(r.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          {canEdit && (
                            <Tooltip title="Edit">
                              <IconButton size="small"
                                onClick={() => { setEditing(r); setFormOpen(true); }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error"
                                onClick={() => setDeleteTarget(r)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* ═════ PAGINATION — always shown when total > PAGE_SIZE ═════ */}
          {!loading && total > PAGE_SIZE && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
              sx={{ pt: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                Page {page} of {Math.ceil(total / PAGE_SIZE)} · {PAGE_SIZE} per page
              </Typography>
              <Pagination
                count={Math.ceil(total / PAGE_SIZE)}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
                size={isMobile ? "small" : "medium"}
                shape="rounded"
                showFirstButton
                showLastButton
                siblingCount={isMobile ? 0 : 1}
              />
            </Stack>
          )}
        </Stack>
      </Box>

      {/* ═════ CREATE / EDIT DIALOG ═════ */}
      <CategoryFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
        isMobile={isMobile}
      />

      {/* ═════ DELETE CONFIRM ═════ */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Deactivate category?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>{deleteTarget?.category_name}</strong> will be marked inactive and hidden
            from pickers. Existing medicines keep their link. You can reactivate it anytime.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═════ BULK UPLOAD DIALOG ═════ */}
      <BulkUploadDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        isMobile={isMobile}
        onComplete={() => { setBulkOpen(false); load(); }}
      />

      {/* ═════ SNACKBAR ═════ */}
      <Snackbar
        open={snackbar.open} autoHideDuration={3500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled"
          sx={{ borderRadius: 2, fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}