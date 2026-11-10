import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
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
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

// ---------------------------------------------------------------
// API endpoint — the /expiry-alerts route on pharmacyMedicineBatches.js
// ---------------------------------------------------------------
const API_BASE = process.env.REACT_APP_API_URL;
const EXPIRY_URL =`${API_BASE}/pharmacy/batches/expiry-alerts`;

const PRIMARY = "#3f6f7a";

const HORIZONS = [
  { value: 30, label: "Next 30 days" },
  { value: 90, label: "Next 90 days" },
  { value: 180, label: "Next 6 months" },
  { value: 365, label: "Next year" },
];

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const inr = (n) =>
  (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "Expired 12 days ago" / "18 days left"
const expiryText = (days) => {
  if (days === null || days === undefined) return "—";
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `${days} day${days === 1 ? "" : "s"} left`;
};

const SEVERITY = {
  expired: { label: "Expired", bg: "#fde8e8", color: "#c62828" },
  critical: { label: "Critical", bg: "#fdecec", color: "#d84315" },
  warning: { label: "Expiring", bg: "#fff4e0", color: "#e67e00" },
  watch: { label: "Watch", bg: "#eef2f6", color: "#5f6b7a" },
};

const SeverityChip = ({ severity }) => {
  const s = SEVERITY[severity] || SEVERITY.watch;
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 22 }}
    />
  );
};

export default function ExpiryAlerts() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [only, setOnly] = useState("all");
  const [within, setWithin] = useState(90);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debounced, only, within]);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        only,
        within: String(within),
        page: String(page + 1),
        limit: String(rowsPerPage),
      });
      if (debounced) params.set("search", debounced);

      const res = await fetch(`${EXPIRY_URL}?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || json.success === false)
        throw new Error(json?.message || "Failed to load expiry alerts");

      setItems(json.data || []);
      setSummary(json.summary || null);
      setTotal(json.pagination?.total ?? (json.data || []).length);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [only, within, page, rowsPerPage, debounced]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

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
            Expiry alerts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5,fontSize: 12 }}>
            Batches expiring soon — clear, return or discount these
            {!loading && summary && (
              <>
                {" "}· {summary.units_at_risk} units worth ₹{inr(summary.value_at_risk)}
                {summary.expired > 0 &&
                  `, incl. ₹${inr(summary.value_expired)} already expired`}
              </>
            )}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small"
            select
            value={within}
            onChange={(e) => setWithin(Number(e.target.value))}
            sx={{ bgcolor: "#fff", borderRadius: 2, minWidth: 150 }}
          >
            {HORIZONS.map((h) => (
              <MenuItem key={h.value} value={h.value}>
                {h.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            placeholder="Search medicine or batch"
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
          <Button
            variant="outlined"
            onClick={fetchAlerts}
            startIcon={<RefreshIcon />}
            sx={{ textTransform: "none", borderColor: PRIMARY, color: PRIMARY, borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Filter */}
      <ToggleButtonGroup
        exclusive
        size="small"
        value={only}
        onChange={(_, v) => v && setOnly(v)}
        sx={{ mb: 2, flexWrap: "wrap" }}
      >
        <ToggleButton value="all" sx={{ textTransform: "none", px: 2,fontSize: 10 }}>
          All{summary ? ` (${summary.total})` : ""}
        </ToggleButton>
        <ToggleButton value="expired" sx={{ textTransform: "none", px: 2,fontSize: 10 }}>
          Expired{summary ? ` (${summary.expired})` : ""}
        </ToggleButton>
        <ToggleButton value="critical" sx={{ textTransform: "none", px: 2,fontSize: 10 }}>
          Within {summary?.critical_days ?? 30}d{summary ? ` (${summary.critical})` : ""}
        </ToggleButton>
        <ToggleButton value="expiring" sx={{ textTransform: "none", px: 2,fontSize: 10 }}>
          Expiring
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
              ? "No batches match your search."
              : "Nothing expiring in this window — stock is in good shape."}
          </Typography>
        ) : (
          <>
            <TableContainer sx={{ height: 340, overflowY: "auto", overflowX: "auto" }}>
              <Table
                size="small"
                stickyHeader
                sx={{ "& .MuiTableCell-root": { fontSize: 13, py: 1.1 } }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>Medicine</TableCell>
                    <TableCell sx={headSx}>Batch</TableCell>
                    <TableCell sx={headSx}>Expiry</TableCell>
                    <TableCell sx={headSx}>Time left</TableCell>
                    <TableCell sx={headSx} align="right">Stock</TableCell>
                    <TableCell sx={headSx} align="right">Value at risk</TableCell>
                    <TableCell sx={headSx}>Supplier</TableCell>
                    <TableCell sx={{ ...headSx, pl: 4 }}>Severity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.batch_id}
                      hover
                      sx={{ "& td": { borderBottom: "1px solid #eef0f3" } }}
                    >
                      <TableCell>
                        <Typography sx={{ fontSize: 10, fontWeight: 600, color: "#111827" }}>
                          {item.brand_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 8 }}>
                          {[item.dosage_form, item.pack_size, item.medicine_code]
                            .filter(Boolean)
                            .join(" · ")}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace" }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 600, color: "#111827" }}>
                          {item.batch_number}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography sx={{ fontSize: 10 }}>{fmtDate(item.expiry_date) || "—"}</Typography></TableCell>
                      <TableCell
                        sx={{
                          color: item.days_to_expiry < 0 ? "#c62828" : "#3a4753",
                          fontWeight: item.days_to_expiry < 0 ? 700 : 400,
                        }}
                      >
                        <Typography sx={{ fontSize: 10 }}>
                        {expiryText(item.days_to_expiry)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        <Typography sx={{ fontSize: 10 }}>
                          {item.quantity_available}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: 10 }}>
                          ₹{inr(item.value_at_risk)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 10 }}>
                          {item.supplier_name || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ pl: 4,fontSize:10 }}>
                        <SeverityChip severity={item.severity} />
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
