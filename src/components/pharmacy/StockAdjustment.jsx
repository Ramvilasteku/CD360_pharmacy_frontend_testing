import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import InventoryBranchFrame from "../../pharmacy/inventory/Inventorybranchframe";
import BranchPicker from "../../pharmacy/shared/BranchPicker";

// ---------------------------------------------------------------
// Endpoints — adjust to match server.js
// ---------------------------------------------------------------
const API_BASE = process.env.REACT_APP_API_URL;
const ADJUSTMENTS_URL = `${API_BASE}/pharmacy/stock-adjustments`;
const BATCHES_URL = `${API_BASE}/pharmacy/batches`;

// MUST match VALID_REASONS in the backend route, or the POST returns 400.
const REASONS = [
  { value: "damaged", label: "Damaged" },
  { value: "expired", label: "Expired" },
  { value: "lost", label: "Lost / missing" },
  { value: "theft", label: "Theft" },
  { value: "correction", label: "Stock count correction" },
  { value: "return", label: "Customer return" },
  { value: "other", label: "Other" },
];

const PRIMARY = "#3f6f7a";
const PRIMARY_DARK = "#2c4e56";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

const batchLabel = (b) =>
  `${[b.brand_name || b.medicine_name, b.strength].filter(Boolean).join(" ")} · ${b.batch_number}`;

// branchParams / branchState come from InventoryBranchFrame mode="write" (Routes/pharmacyRoutes.jsx).
//   admin, several branches   the WORKING branch (shared with New sale / Receive / B2B). Only its
//                             batches are offered, and it is sent with the adjustment — the server
//                             refuses an adjustment from an admin with no branch chosen.
//   staff                     their own branch; the server holds them to it regardless.
//   one branch                nothing changes.
function StockAdjustmentScreen({ branchParams = {}, branchState }) {
  const branch = branchParams.branch || "";
  const needsBranch = !!branchState?.needsChoice;
  const branchLoading = !!branchState?.loading; // don't search all branches before we know which one
  // form
  const [batch, setBatch] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState("decrease");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // batch search
  const [searchInput, setSearchInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);

  // history
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const notify = (message, severity = "success") => setSnack({ open: true, severity, message });

  /* ---------- batch search ---------- */
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // A batch picked in one branch can't be adjusted from another — drop it when the branch changes.
  const lastBranch = useRef(branch);
  useEffect(() => {
    if (lastBranch.current === branch) return;
    lastBranch.current = branch;
    setBatch(null);
    setSearchInput("");
  }, [branch]);

  useEffect(() => {
    let alive = true;
    if (needsBranch || branchLoading) {
      setOptions([]);
      setSearching(branchLoading);
      return undefined;
    }
    (async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ limit: "25", status: "active" });
        if (debounced) params.set("search", debounced);
        if (branch) params.set("branch", branch);
        const res = await fetch(`${BATCHES_URL}?${params.toString()}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (alive) setOptions(json?.data || []);
      } catch (e) {
        if (alive) setOptions([]);
      } finally {
        if (alive) setSearching(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debounced, branch, needsBranch, branchLoading]);

  /* ---------- recent adjustments ---------- */
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const q = branch ? `&branch=${encodeURIComponent(branch)}` : "";
      const res = await fetch(`${ADJUSTMENTS_URL}/get?limit=20${q}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || json.success === false)
        throw new Error(json?.message || "Couldn't load recent adjustments");
      setHistory(json.data || []);
    } catch (e) {
      setHistoryError(e.message);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /* ---------- submit ---------- */
  const qty = Number(quantity);
  const qtyValid = Number.isInteger(qty) && qty > 0;
  const overdraw =
    batch && adjustmentType === "decrease" && qtyValid && qty > Number(batch.quantity_available);

  const blocker =
    (needsBranch && "Choose the branch first") ||
    (!batch && "Pick a batch") ||
    (!qtyValid && "Enter a whole number above 0") ||
    (overdraw && `Only ${batch.quantity_available} unit(s) in this batch`) ||
    (!reason && "Pick a reason") ||
    null;

  const newQuantity =
    batch && qtyValid
      ? Number(batch.quantity_available) + (adjustmentType === "increase" ? qty : -qty)
      : null;

  const submit = async () => {
    if (blocker) {
      notify(blocker, "warning");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${ADJUSTMENTS_URL}/post`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicine_id: batch.medicine_id,
          batch_id: batch.id,
          adjustment_type: adjustmentType,
          quantity: qty,
          // The batch list gives quantity_available in STRIPS (utils/pharmacyStripView.js), so the
          // number typed here is strips too. Without this the server read it as tablets.
          unit: "strip",
          reason,
          notes: notes.trim() || undefined,
          ...(branch ? { branch } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false)
        throw new Error(json?.message || "Couldn't record the adjustment");

      notify(json.message || "Stock adjustment recorded");

      // Keep the batch selected but show its new stock, so a second
      // adjustment on the same batch starts from the right number.
      // The server answers with the batch in TABLETS — shown here in strips, like the list.
      const after = json.data?.batch;
      if (after && after.quantity_available != null) {
        const upp = Math.max(1, Number(after.units_per_pack) || 1);
        setBatch((b) =>
          b ? { ...b, quantity_available: Math.floor(Number(after.quantity_available) / upp) } : b
        );
      }
      setQuantity("");
      setNotes("");
      setReason("");
      loadHistory();
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

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
          Stock adjustment
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5,fontSize: 12 }}>
          Correct the stock on a batch — damage, loss, a recount. Every change is logged.
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="flex-start">
        {/* ---------------- Form ---------------- */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #eef0f3",
            p: 3,
            width: { xs: "100%", lg: 420 },
            flexShrink: 0,
          }}
        >
          <Stack spacing={2.5}>
            {/* Branch — the stock being adjusted lives here (multi-branch pharmacies only) */}
            <BranchPicker
              state={branchState}
              label="Branch *"
              sx={branchState?.isAdmin ? { width: "100%" } : { alignSelf: "flex-start" }}
            />
            <Autocomplete
              size="small"
              options={options}
              loading={searching}
              filterOptions={(x) => x}
              value={batch}
              onChange={(_, v) => setBatch(v)}
              inputValue={searchInput}
              onInputChange={(_, v, reason) => reason !== "reset" && setSearchInput(v)}
              getOptionLabel={(o) => (o ? batchLabel(o) : "")}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderOption={(props, o) => (
                <li {...props} key={o.id}>
                  <Box sx={{ width: "100%" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" fontWeight={600}>
                        {[o.brand_name || o.medicine_name, o.strength].filter(Boolean).join(" ")}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${o.quantity_available} in stock`}
                        sx={{ fontSize: 10, height: 20 }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Batch {o.batch_number} · exp {fmtDate(o.expiry_date)}
                      {o.medicine_code ? ` · ${o.medicine_code}` : ""}
                    </Typography>
                  </Box>
                </li>
              )}
              noOptionsText={
                needsBranch
                  ? "Choose the branch first"
                  : searchInput
                  ? "No matching batch"
                  : "Type a medicine or batch number"
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Batch *"
                  placeholder="Search medicine or batch number"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                    endAdornment: (
                      <>
                        {searching ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            {batch && (
              <Box sx={{ bgcolor: "#f8fafb", borderRadius: 2, p: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Current stock
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {batch.quantity_available}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Expiry
                  </Typography>
                  <Typography variant="body2">{fmtDate(batch.expiry_date)}</Typography>
                </Stack>
                {newQuantity !== null && !overdraw && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        After this adjustment
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color={PRIMARY}>
                        {newQuantity}
                      </Typography>
                    </Stack>
                  </>
                )}
              </Box>
            )}

            <ToggleButtonGroup
              exclusive
              fullWidth
              value={adjustmentType}
              onChange={(_, v) => v && setAdjustmentType(v)}
              color="primary"
              size="small"
            >
              <ToggleButton value="decrease" sx={{ textTransform: "none" }}>
                <RemoveIcon fontSize="small" sx={{ mr: 0.5 }} />
                Decrease
              </ToggleButton>
              <ToggleButton value="increase" sx={{ textTransform: "none" }}>
                <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
                Increase
              </ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label="Quantity *"
              size="small"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputProps={{ min: 1, step: 1 }}
              error={!!overdraw}
              helperText={overdraw ? `Only ${batch.quantity_available} unit(s) available` : " "}
            />

            <TextField
              select
              size="small"
              label="Reason *"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              minRows={2}
              placeholder="What happened — useful when someone reviews this later"
            />

            {blocker && batch && (
              <Alert severity="warning" variant="outlined" sx={{ py: 0 }}>
                {blocker}
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              disabled={saving || !!blocker}
              onClick={submit}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                bgcolor: PRIMARY,
                borderRadius: 2,
                ":hover": { bgcolor: PRIMARY_DARK },
              }}
            >
              Record adjustment
            </Button>
          </Stack>
        </Paper>

        {/* ---------------- History ---------------- */}
        <Paper
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #eef0f3", p: 2.5, flex: 1, width: "100%" }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} color="#111827">
              Recent adjustments
            </Typography>
            <Button
              size="small"
              onClick={loadHistory}
              startIcon={<RefreshIcon fontSize="small" />}
              sx={{ textTransform: "none", color: PRIMARY }}
            >
              Refresh
            </Button>
          </Stack>

          {historyLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress sx={{ color: PRIMARY }} />
            </Box>
          ) : historyError ? (
            <Typography color="error" sx={{ py: 4, textAlign: "center" }}>
              {historyError}
            </Typography>
          ) : history.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
              No adjustments recorded yet.
            </Typography>
          ) : (
            <TableContainer sx={{ height: 350, overflowY: "auto", overflowX: "auto" }}>
              <Table
                size="small"
                stickyHeader
                sx={{ "& .MuiTableCell-root": { fontSize: 10, py: 1.1 } }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>When</TableCell>
                    <TableCell sx={headSx}>Medicine</TableCell>
                    <TableCell sx={headSx}>Batch</TableCell>
                    <TableCell sx={headSx} align="right">Change</TableCell>
                    <TableCell sx={headSx}>Reason</TableCell>
                    <TableCell sx={headSx}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h) => {
                    const up = h.adjustment_type === "increase";
                    return (
                      <TableRow key={h.id} hover sx={{ "& td": { borderBottom: "1px solid #eef0f3" } }}>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {fmtDateTime(h.created_at || h.adjusted_at)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {h.medicine ||
                            [h.brand_name || h.medicine_name, h.strength].filter(Boolean).join(" ") ||
                            `#${h.medicine_id}`}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                          {h.batch_number || (h.batch_id ? `#${h.batch_id}` : "—")}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, color: up ? "#1e7d3a" : "#c62828" }}
                        >
                          {up ? "+" : "−"}
                          {h.quantity}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={REASONS.find((r) => r.value === h.reason)?.label || h.reason}
                            sx={{ fontSize: 11, height: 22, bgcolor: "#eef2f6", color: "#3a4753" }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: "#5f6b7a", maxWidth: 220 }}>
                          {h.notes || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* The branch bar (6 Nov 2026). Routes/pharmacyRoutes.jsx wraps this page in
   InventoryBranchFrame; if this page is ever rendered without it (another menu, an older
   copy of the route file), it adds the bar itself. Given branchState → already framed, so
   there is never a second bar. */
export default function StockAdjustment(props) {
  if (props.branchState) return <StockAdjustmentScreen {...props} />;
  return (
    <InventoryBranchFrame mode="write">
      <StockAdjustmentScreen {...props} />
    </InventoryBranchFrame>
  );
}