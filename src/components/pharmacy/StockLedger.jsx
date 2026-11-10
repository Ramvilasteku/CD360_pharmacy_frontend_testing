import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
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
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InventoryBranchFrame from "../../pharmacy/inventory/Inventorybranchframe";
import BranchPicker from "../../pharmacy/shared/BranchPicker";

// ---------------------------------------------------------------
// Endpoint — adjust to match server.js
// ---------------------------------------------------------------
const API_BASE = process.env.REACT_APP_API_URL;
const LEDGER_URL = `${API_BASE}/pharmacy/stock-transactions`;

const PRIMARY = "#3f6f7a";

// Colours per transaction type. Anything not listed falls back to grey,
// so a new type from the backend still renders sensibly.
const TYPE_STYLES = {
  sale: { bg: "#e8f0fe", color: "#1a56c4", label: "Sale" },
  dispense: { bg: "#e8f0fe", color: "#1a56c4", label: "Dispense" },
  purchase: { bg: "#e6f4ea", color: "#1e7d3a", label: "Purchase" },
  return: { bg: "#fff4e0", color: "#e67e00", label: "Return" },
  sale_return: { bg: "#fff4e0", color: "#e67e00", label: "Sale return" },
  purchase_return: { bg: "#fdecec", color: "#d84315", label: "Purchase return" },
  adjustment: { bg: "#f3e8fd", color: "#7b3fb8", label: "Adjustment" },
  increase: { bg: "#e6f4ea", color: "#1e7d3a", label: "Increase" },
  decrease: { bg: "#fdecec", color: "#c62828", label: "Decrease" },
  damaged: { bg: "#fdecec", color: "#c62828", label: "Damaged" },
  expired: { bg: "#fdecec", color: "#c62828", label: "Expired" },
  lost: { bg: "#fdecec", color: "#c62828", label: "Lost" },
  theft: { bg: "#fdecec", color: "#c62828", label: "Theft" },
  correction: { bg: "#eef2f6", color: "#5f6b7a", label: "Correction" },
  transfer: { bg: "#eef2f6", color: "#5f6b7a", label: "Transfer" },
  opening: { bg: "#eef2f6", color: "#5f6b7a", label: "Opening" },
};

const titleCase = (s) =>
  String(s || "")
    .replace(/_/g, " ")
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());

const TypeChip = ({ type }) => {
  const s = TYPE_STYLES[type] || { bg: "#eef2f6", color: "#5f6b7a", label: titleCase(type) };
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 22 }}
    />
  );
};

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const DIRECTIONS = [
  { value: "", label: "All movements" },
  { value: "in", label: "Stock in" },
  { value: "out", label: "Stock out" },
];

// branchParams / branchState come from InventoryBranchFrame (Routes/pharmacyRoutes.jsx).
// The ledger has no branch column of its own: a movement belongs to the branch of the batch
// it moved, and the server filters on that. Staff are always held to their own branch.
function StockLedgerScreen({ branchParams = {}, branchState }) {
  const branch = branchParams.branch || "";
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [types, setTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState("");
  const [direction, setDirection] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debounced, type, direction, from, to, branch]);

  // Transaction types for the dropdown — counts follow the branch on screen
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const q = branch ? `?branch=${encodeURIComponent(branch)}` : "";
        const res = await fetch(`${LEDGER_URL}/types${q}`, { credentials: "include" });
        const json = await res.json();
        if (alive) setTypes(json?.data || []);
      } catch {
        if (alive) setTypes([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [branch]);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (debounced) p.set("search", debounced);
    if (type) p.set("type", type);
    if (direction) p.set("direction", direction);
    if (from) p.set("date_from", from);
    if (to) p.set("date_to", to);
    if (branch) p.set("branch", branch);
    return p;
  }, [debounced, type, direction, from, to, branch]);

  // Only the newest request may update the screen — switching branch quickly must never
  // leave the previous branch's movements on view.
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError("");
    try {
      const p = buildParams();
      p.set("page", String(page + 1));
      p.set("limit", String(rowsPerPage));

      const [listRes, sumRes] = await Promise.all([
        fetch(`${LEDGER_URL}/get?${p.toString()}`, { credentials: "include" }),
        fetch(`${LEDGER_URL}/summary?${buildParams().toString()}`, { credentials: "include" }),
      ]);

      const listJson = await listRes.json();
      if (mine !== seq.current) return;
      if (!listRes.ok || listJson.success === false)
        throw new Error(listJson?.message || "Failed to load the stock ledger");

      setRows(listJson.data || []);
      setTotal(listJson.pagination?.total ?? (listJson.data || []).length);

      const sumJson = await sumRes.json().catch(() => null);
      if (mine !== seq.current) return;
      setSummary(sumJson?.summary || null);
    } catch (e) {
      if (mine !== seq.current) return;
      console.error(e);
      setError(e.message || "Something went wrong");
      setRows([]);
      setTotal(0);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [buildParams, page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="#111827">
          Stock ledger
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5,fontSize: 12 }}>
          Every stock in/out with reference — the source of truth for reconciliations
          {!loading && summary && (
            <>
              {" "}· {summary.movements} movement{summary.movements === 1 ? "" : "s"}, +
              {summary.total_in} in / −{summary.total_out} out (net{" "}
              {summary.net >= 0 ? "+" : ""}
              {summary.net})
            </>
          )}
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #eef0f3", p: 2.5 }}>
        {/* Filters */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ md: "center" }}
          sx={{ mb: 2, flexWrap: "wrap" }}
        >
          <TextField
            size="small"
            placeholder="Medicine,batch,ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ bgcolor: "#fff", borderRadius: 2, minWidth: 180, flex: 1 }}
          />
          <BranchPicker state={branchState} sx={{ minWidth: 170, bgcolor: "#fff" }} />
          <TextField
            size="small"
            select
            value={type}
            label="Type"
            onChange={(e) => setType(e.target.value)}
            sx={{ minWidth: 160, bgcolor: "#fff" }}
          >
            <MenuItem value="">Type: All</MenuItem>
            {types.map((t) => (
              <MenuItem key={t.type} value={t.type}>
                {TYPE_STYLES[t.type]?.label || titleCase(t.type)} ({t.count})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            select
            value={direction}
            label="Movements"
            onChange={(e) => setDirection(e.target.value)}
            sx={{ minWidth: 150, bgcolor: "#fff" }}
          >
            {DIRECTIONS.map((d) => (
              <MenuItem key={d.value} value={d.value}>
                {d.label}
              </MenuItem>
            ))}
          </TextField>
                    <TextField
            size="small"
            type="date"
            label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: to || undefined }}
            sx={{ minWidth: 150, bgcolor: "#fff" }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: from || undefined }}
            sx={{ minWidth: 150, bgcolor: "#fff" }}
          />
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: PRIMARY }} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ py: 4, textAlign: "center" }}>
            {error}
          </Typography>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            {debounced || type || direction || from || to
              ? "No movements match these filters."
              : "No stock movements recorded yet."}
          </Typography>
        ) : (
          <>
            <TableContainer sx={{ height: 350, overflowY: "auto", overflowX: "auto" }}>
              <Table
                size="small"
                stickyHeader
                sx={{ "& .MuiTableCell-root": { fontSize: 10, py: 1.1 } }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>Date</TableCell>
                    <TableCell sx={headSx}>Medicine</TableCell>
                    <TableCell sx={headSx}>Batch</TableCell>
                    <TableCell sx={headSx}>Type</TableCell>
                    <TableCell sx={headSx}>Reference</TableCell>
                    <TableCell sx={headSx} align="right">In</TableCell>
                    <TableCell sx={headSx} align="right">Out</TableCell>
                    <TableCell sx={headSx} align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} hover sx={{ "& td": { borderBottom: "1px solid #eef0f3" } }}>
                      <TableCell sx={{ whiteSpace: "nowrap", color: "#3a4753" }}>
                        {fmtDateTime(r.transaction_date)}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 10, fontWeight: 600, color: "#111827" }}>
                          {r.medicine}
                        </Typography>
                        {r.medicine_code && (
                          <Typography variant="caption" color="text.secondary">
                            {r.medicine_code}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 10 }}>
                        {r.batch_number || "—"}
                      </TableCell>
                      <TableCell>
                        <TypeChip type={r.transaction_type} />
                      </TableCell>
                      <TableCell sx={{ color: "#3a4753", whiteSpace: "nowrap" }}>
                        {r.notes ? (
                          <Tooltip title={r.notes}>
                            <span>{r.reference_number || "—"}</span>
                          </Tooltip>
                        ) : (
                          r.reference_number || "—"
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#1e7d3a", fontWeight: 700 }}>
                        {r.quantity_in > 0 ? `+${r.quantity_in}` : ""}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#c62828", fontWeight: 700 }}>
                        {r.quantity_out > 0 ? `−${r.quantity_out}` : ""}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#111827" }}>
                        {r.balance_quantity ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

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
              rowsPerPageOptions={[10, 25, 50, 100]}
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
export default function StockLedger(props) {
  if (props.branchState) return <StockLedgerScreen {...props} />;
  return (
    <InventoryBranchFrame mode="read">
      <StockLedgerScreen {...props} />
    </InventoryBranchFrame>
  );
}