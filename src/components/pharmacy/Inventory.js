import React, { useState, useMemo, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  FormControlLabel,
  Switch,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import InventoryBranchFrame from "../../pharmacy/inventory/Inventorybranchframe";
import BranchPicker from "../../pharmacy/shared/BranchPicker";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const API_BASE = process.env.REACT_APP_API_URL || "";
// Adjust to wherever routes/pharmacy/pharmacyMedicineBatches.js is mounted in server.js
const BATCHES_API = `${API_BASE}/pharmacy/batches`;

// Batches are grouped into one row per medicine, so the whole set is fetched
// and paginated in the browser rather than page-by-page from the server.
const FETCH_LIMIT = 500;
const EXPIRING_SOON_DAYS = 90;

// JWT lives in an HttpOnly cookie → send cookies.
const http = axios.create({ withCredentials: true });

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const medicineLabel = (b) => [b.brand_name || b.medicine_name, b.strength].filter(Boolean).join(" ");

// One row per medicine: stock summed, batches counted, earliest expiry kept.
function groupByMedicine(batches) {
  const map = new Map();
  for (const b of batches) {
    const id = b.medicine_id;
    if (!map.has(id)) {
      map.set(id, {
        id,
        brand_name: b.brand_name || b.medicine_name || "",
        medicine: medicineLabel(b),
        generic: b.medicine_name || "",
        form: [b.dosage_form, b.strength].filter(Boolean).join(" · "),
        medicine_code: b.medicine_code || "",
        stock: 0,
        batches: 0,
        earliest: null,
        days_to_expiry: null,
        suppliers: new Set(),
      });
    }
    const row = map.get(id);
    row.stock += Number(b.quantity_available) || 0;
    row.batches += 1;
    if (b.supplier_name) row.suppliers.add(b.supplier_name);
    if (b.expiry_date && (!row.earliest || b.expiry_date < row.earliest)) {
      row.earliest = b.expiry_date;
      row.days_to_expiry = b.days_to_expiry;
    }
  }
  return [...map.values()]
    .map((r) => ({ ...r, suppliers: [...r.suppliers].join(", ") }))
    .sort((a, b) => a.medicine.localeCompare(b.medicine));
}

const getStatus = (row) => {
  if (row.stock === 0) return { label: "Out Of Stock", tone: "error" };
  if (row.days_to_expiry !== null && row.days_to_expiry <= EXPIRING_SOON_DAYS)
    return { label: "Expiring Soon", tone: "warning" };
  return { label: "OK", tone: "success" };
};

const statusStyles = {
  success: { bg: "#e6f4ea", color: "#1e7d3a" },
  warning: { bg: "#fef3e2", color: "#c07a1a" },
  error: { bg: "#fdecec", color: "#c53030" },
};

const columns = ["Medicine", "Form / Strength", "Stock", "Batches", "Earliest expiry", "Supplier", "Status"];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
// branchParams / branchState come from InventoryBranchFrame (Routes/pharmacyRoutes.jsx).
//   admin, several branches  { branch: "Kukatpally" } or {} for All branches
//   staff / one branch       {} — the server scopes staff to their own branch regardless
const InventoryScreen = ({ branchParams = {}, branchState }) => {
  const branch = branchParams.branch || "";
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await http.get(BATCHES_API, {
        params: {
          limit: FETCH_LIMIT,
          page: 1,
          status: "active",
          sort_by: "expiry_date",
          sort_order: "ASC",
          ...(inStockOnly ? { in_stock_only: "true" } : {}),
          ...(branch ? { branch } : {}),
        },
      });
      setBatches(r.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Couldn't load inventory");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [inStockOnly, branch]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => groupByMedicine(batches), [batches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    return grouped.filter(
      (row) =>
        row.brand_name.toLowerCase().includes(q) ||
        row.generic.toLowerCase().includes(q) ||
        row.form.toLowerCase().includes(q) ||
        row.medicine_code.toLowerCase().includes(q)
    );
  }, [search, grouped]);

  // Go back to the first page whenever the search/filter changes
  useEffect(() => {
    setPage(0);
  }, [filtered.length]);

  const paginatedRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totalUnits = useMemo(() => filtered.reduce((s, r) => s + r.stock, 0), [filtered]);

  return (
    <Box sx={{ pl: 3, pr: 3, minHeight: "60vh" }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f1e2b" }}>
            Inventory
          </Typography>
          <Typography variant="body2" sx={{ color: "#5f6b7a", mt: 0.5 }}>
            {loading
              ? "Loading live stock…"
              : `${filtered.length} medicine${filtered.length === 1 ? "" : "s"} · ${totalUnits} units across all batches${
                  branchState?.multi && branchState?.branch ? ` in ${branchState.branch}` : ""
                }`}
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={load} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Card */}
      <Paper elevation={0} sx={{ borderRadius: 3, p: 2, border: "1px solid #eef1f4" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Search */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search medicine, form, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#3f6f7a" }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 2, bgcolor: "#fafbfc" },
            }}
          />
          <FormControlLabel
            control={<Switch checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />}
            label={<Typography sx={{ fontSize: 13, color: "#3a4753", whiteSpace: "nowrap" }}>In stock only</Typography>}
          />
          {/* Branch — shows only in a multi-branch pharmacy */}
          <BranchPicker state={branchState} sx={{ flexShrink: 0, minWidth: { sm: 180 } }} />
        </Stack>

        {/* Table */}
        <TableContainer sx={{ maxHeight: 360, overflowY: "auto", overflowX: "auto" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#0f1e2b",
                      bgcolor: "#f5f7fa",
                      borderBottom: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                paginatedRows.map((row) => {
                  const status = getStatus(row);
                  const s = statusStyles[status.tone];
                  return (
                    <TableRow key={row.id} sx={{ "&:hover": { bgcolor: "#fafbfc" } }}>
                      <TableCell>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#0f1e2b" }}>
                          {row.brand_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#5f9aa6", fontWeight: 500, fontSize: 7 }}>
                          {row.medicine_code || row.generic}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, color: "#3a4753" }}>{row.form || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 10, fontWeight: 700, color: "#0f1e2b" }}>{row.stock}</TableCell>
                      <TableCell sx={{ fontSize: 10, color: "#3a4753" }}>{row.batches}</TableCell>
                      <TableCell sx={{ fontSize: 10, color: "#3a4753" }}>
                        {fmtDate(row.earliest) || "—"}
                        {row.days_to_expiry !== null && row.days_to_expiry <= EXPIRING_SOON_DAYS && (
                          <Typography component="span" sx={{ fontSize: 8, color: "#c07a1a", ml: 0.5 }}>
                            ({row.days_to_expiry}d)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, color: "#3a4753" }}>{row.suppliers || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={status.label}
                          size="small"
                          sx={{
                            bgcolor: s.bg,
                            color: s.color,
                            fontSize: 10,
                            fontWeight: 700,
                            borderRadius: "999px",
                            px: 0.5,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}

              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: "#5f6b7a" }}>
                    {search ? "No matching medicines found." : "No stock yet — receive a purchase order to add batches."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            borderTop: "1px solid #eef1f4",
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              fontSize: 12,
              color: "#5f6b7a",
            },
          }}
        />
      </Paper>
    </Box>
  );
};

/* The branch bar (6 Nov 2026). Routes/pharmacyRoutes.jsx wraps this page in
   InventoryBranchFrame; if this page is ever rendered without it (another menu, an older
   copy of the route file), it adds the bar itself. Given branchState → already framed, so
   there is never a second bar. */
export default function Inventory(props) {
  if (props.branchState) return <InventoryScreen {...props} />;
  return (
    <InventoryBranchFrame mode="read">
      <InventoryScreen {...props} />
    </InventoryBranchFrame>
  );
}