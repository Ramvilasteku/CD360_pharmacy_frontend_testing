import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import InventoryBranchFrame from "../../pharmacy/inventory/Inventorybranchframe";
import BranchPicker from "../../pharmacy/shared/BranchPicker";

// ---------------------------------------------------------------
// API endpoint — the /low-stock route on pharmacyMedicineBatches.js.
// Filtering, sorting and paging all happen server-side.
// ---------------------------------------------------------------
const API_BASE = process.env.REACT_APP_API_URL;
const LOW_STOCK_URL =`${API_BASE}/pharmacy/batches/low-stock`;

const PRIMARY = "#3f6f7a";
const PRIMARY_DARK = "#2c4e56";

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const inr = (n) =>
  (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SeverityChip = ({ status }) =>
  status === "out_of_stock" ? (
    <Chip
      label="Out Of Stock"
      size="small"
      sx={{ bgcolor: "#fde8e8", color: "#c62828", fontWeight: 700, fontSize: 11, height: 22 }}
    />
  ) : (
    <Chip
      label="Low"
      size="small"
      sx={{ bgcolor: "#fff4e0", color: "#e67e00", fontWeight: 700, fontSize: 11, height: 22 }}
    />
  );

// branchParams / branchState come from InventoryBranchFrame (Routes/pharmacyRoutes.jsx).
// "Low" is checked per branch: a branch can only sell its own batches. With one branch picked
// (or for staff) that branch's stock is compared; under All branches the server returns one
// row per medicine × branch that is low, and `item.branch` names the branch.
function LowStockScreen({ onCreatePurchase, branchParams = {}, branchState }) {
  const branch = branchParams.branch || "";
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [only, setOnly] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Debounce the search box so typing doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter change starts again from the first page
  useEffect(() => {
    setPage(0);
  }, [debounced, only, branch]);

  // Only the newest request may update the screen (quick branch / filter changes).
  const seq = useRef(0);

  const fetchLowStock = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        only,
        page: String(page + 1),
        limit: String(rowsPerPage),
      });
      if (debounced) params.set("search", debounced);
      if (branch) params.set("branch", branch);

      const res = await fetch(`${LOW_STOCK_URL}?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      const json = await res.json();
      if (mine !== seq.current) return;
      if (!res.ok || json.success === false)
        throw new Error(json?.message || "Failed to load low stock");

      setItems(json.data || []);
      setSummary(json.summary || null);
      setTotal(json.pagination?.total ?? (json.data || []).length);
    } catch (err) {
      if (mine !== seq.current) return;
      console.error(err);
      setError(err.message || "Something went wrong");
      setItems([]);
      setTotal(0);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [only, page, rowsPerPage, debounced, branch]);

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  const headSx = {
    fontWeight: 700,
    fontSize: 12.5,
    color: "#1f2937",
    bgcolor: "#f5f7fa",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  return (
    <Box sx={{ px: 4, py: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="#111827">
            Low stock
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5,fontSize: 12 }}>
            Medicines at or below reorder level — order these next
            {!loading && summary && (
              <>
                {" "}· {summary.total} item{summary.total === 1 ? "" : "s"}
                {summary.out_of_stock > 0 && `, ${summary.out_of_stock} out of stock`}
                {summary.already_on_order > 0 && `, ${summary.already_on_order} already on order`}
              </>
            )}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search medicine or code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ bgcolor: "#fff", borderRadius: 2, minWidth: 220 }}
          />
          <BranchPicker state={branchState} sx={{ minWidth: 170, bgcolor: "#fff" }} />
          <Button
            variant="outlined"
            onClick={fetchLowStock}
            startIcon={<RefreshIcon />}
            sx={{ textTransform: "none", borderColor: PRIMARY, color: PRIMARY, borderRadius: 2 }}
          >
            Refresh
          </Button>
          {onCreatePurchase && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => onCreatePurchase(items)}
              disabled={!items.length}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                bgcolor: PRIMARY,
                borderRadius: 2,
                px: 2.5,
                ":hover": { bgcolor: PRIMARY_DARK },
              }}
            >
              Create purchase order
            </Button>
          )}
        </Box>
      </Box>

      {/* Filter */}
      <ToggleButtonGroup
        exclusive
        size="small"
        value={only}
        onChange={(_, v) => v && setOnly(v)}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="all" sx={{ textTransform: "none", px: 2,fontSize: 10 }}>
          All{summary ? ` (${summary.total})` : ""}
        </ToggleButton>
        <ToggleButton value="out_of_stock" sx={{ textTransform: "none", px: 2,fontSize: 10 }}>
          Out of stock{summary ? ` (${summary.out_of_stock})` : ""}
        </ToggleButton>
        <ToggleButton value="low" sx={{ textTransform: "none", px: 2,fontSize: 10 }}>
          Low{summary ? ` (${summary.low})` : ""}
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #eef0f3", p: 2.5 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: PRIMARY }} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ py: 4, textAlign: "center" }}>
            {error}
          </Typography>
        ) : items.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            {debounced
              ? "No medicines match your search."
              : "All medicines are above their reorder level."}
          </Typography>
        ) : (
          <>
            <TableContainer sx={{ height: 340, overflowY: "auto", overflowX: "auto" }}>
              <Table size="small" stickyHeader sx={{ "& .MuiTableCell-root": { fontSize: 13, py: 1.1 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>Medicine</TableCell>
                    <TableCell sx={headSx} align="right">Stock</TableCell>
                    <TableCell sx={headSx} align="right">Reorder level</TableCell>
                    <TableCell sx={headSx} align="right">On order</TableCell>
                    <TableCell sx={headSx} align="right">Suggested</TableCell>
                    <TableCell sx={headSx}>Earliest expiry</TableCell>
                    <TableCell sx={headSx} align="right">Last rate</TableCell>
                    <TableCell sx={{ ...headSx, pl: 4 }}>Severity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={`${item.medicine_id}|${item.branch || ""}`}
                      hover
                      sx={{ "& td": { borderBottom: "1px solid #eef0f3" } }}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#0f1e2b" }}>
                          {item.brand_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 8 }}>
                          {[item.dosage_form, item.pack_size, item.medicine_code, item.branch]
                            .filter(Boolean)
                            .join(" · ")}
                          {item.expired_stock > 0 && ` · ${item.expired_stock} expired (not counted)`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700,fontSize: 10 }}>
                        <Typography sx={{ fontSize: 10 }}>
                        {item.current_stock}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: 10 }}>
                        <Tooltip
                          title={
                            item.reorder_level_is_default
                              ? "Default level — set a reorder level on this medicine"
                              : ""
                          }
                        >
                          <span>
                            {item.reorder_level}
                            {item.reorder_level_is_default ? "*" : ""}
                          </span>
                        </Tooltip>
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 10 }}>
                        <Typography sx={{ fontSize: 10 }}>{item.on_order || "—"}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: PRIMARY, fontSize: 10 }}>
                        <Typography sx={{ fontSize: 10 }}>
                        {item.suggested_quantity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 10 }}>
                          {fmtDate(item.earliest_expiry) || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 10 }}>
                        <Typography sx={{ fontSize: 10 }}>
                          {item.purchase_price ? `₹${inr(item.purchase_price)}` : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ pl: 4 }}>
                        <SeverityChip status={item.stock_status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {summary?.default_reorder_level != null &&
              items.some((i) => i.reorder_level_is_default) && (
                <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                  * No reorder level set — using the default of {summary.default_reorder_level}.
                </Typography>
              )}

            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{
                borderTop: "1px solid #eef0f3",
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiTablePagination-select":
                  { fontSize: 13 },
              }}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}

/* The branch bar (6 Nov 2026). Routes/pharmacyRoutes.jsx wraps this page in
   InventoryBranchFrame; if this page is ever rendered without it (another menu, an older
   copy of the route file), it adds the bar itself. Given branchState → already framed, so
   there is never a second bar. */
export default function LowStock(props) {
  if (props.branchState) return <LowStockScreen {...props} />;
  return (
    <InventoryBranchFrame mode="read">
      <LowStockScreen {...props} />
    </InventoryBranchFrame>
  );
}