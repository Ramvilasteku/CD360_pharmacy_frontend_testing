// src/pages/pharmacy/GeneratePurchaseOrder.js
//
// Generate Purchase Order page — two order types:
//   Out of stock → pick from the reorder list (stock ≤ reorder level)
//   New order    → search any medicine in the catalog
// Save as draft, or Generate → PO is locked in as "ordered" and the PDF
// can be downloaded / opened straight away.
//
// Backend: routes/pharmacy/pharmacyPurchaseOrders.js (v5-generate)
// Adjust PO_API below to wherever that router is mounted.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, CardHeader, Checkbox, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControlLabel, IconButton, InputAdornment, Paper, Skeleton, Snackbar, Stack, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import SendIcon from "@mui/icons-material/Send";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const API_BASE = process.env.REACT_APP_API_URL || "";
const PO_API = `${API_BASE}/api/pharmacy/purchase-orders`;
// JWT lives in an HttpOnly cookie → send cookies. Swap for your shared axios instance if you have one.
const http = axios.create({ withCredentials: true });

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (n) =>
  money(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Same math as the server (server is the source of truth; this is the live preview)
function priceLine(l) {
  const qty = Number(l.quantity) || 0;
  const rate = Number(l.purchase_price) || 0;
  const disc = Number(l.discount_amount) || 0;
  const gst = Number(l.gst_percentage) || 0;
  const gross = money(qty * rate);
  const taxable = money(Math.max(0, gross - disc));
  const tax = money((taxable * gst) / 100);
  return { gross, tax, total: money(taxable + tax) };
}

function lineError(l) {
  if (!Number.isInteger(Number(l.quantity)) || Number(l.quantity) <= 0) return "Qty must be a whole number above 0";
  if (l.free_quantity !== "" && (!Number.isInteger(Number(l.free_quantity)) || Number(l.free_quantity) < 0))
    return "Free qty must be a whole number";
  if (Number(l.purchase_price) < 0) return "Rate can't be negative";
  const g = Number(l.gst_percentage);
  if (!Number.isFinite(g) || g < 0 || g > 100) return "GST must be 0–100";
  if (Number(l.discount_amount) > money(Number(l.quantity) * Number(l.purchase_price))) return "Discount is more than line value";
  return null;
}

async function apiMessage(err, fallback) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const j = JSON.parse(await data.text());
      return j.message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || err?.message || fallback;
}

const toLine = (m) => ({
  key: `${m.medicine_id}`,
  medicine_id: m.medicine_id,
  medicine: m.medicine,
  dosage_form: m.dosage_form,
  medicine_code: m.medicine_code,
  current_stock: m.current_stock,
  on_order: m.on_order,
  reorder_level: m.reorder_level,
  quantity: m.suggested_quantity > 0 ? m.suggested_quantity : Math.max(m.reorder_level || 0, 1),
  free_quantity: 0,
  purchase_price: m.purchase_price ?? 0,
  discount_amount: 0,
  gst_percentage: m.gst_percentage ?? 0,
  mrp: m.mrp ?? 0,
});

function StockChip({ m }) {
  if (m.current_stock <= 0) return <Chip size="small" color="error" label="Out of stock" />;
  if (m.current_stock <= m.reorder_level) return <Chip size="small" color="warning" label={`Low · ${m.current_stock}`} />;
  return <Chip size="small" variant="outlined" label={`In stock · ${m.current_stock}`} />;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function GeneratePurchaseOrder() {
  // header
  const [orderType, setOrderType] = useState("out_of_stock");
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [supplier, setSupplier] = useState(null);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [orderDiscount, setOrderDiscount] = useState("");
  const [otherCharges, setOtherCharges] = useState("");

  // lines
  const [lines, setLines] = useState([]);

  // out-of-stock picker
  const [reorder, setReorder] = useState([]);
  const [reorderSummary, setReorderSummary] = useState(null);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderSearch, setReorderSearch] = useState("");
  const [onlySupplierItems, setOnlySupplierItems] = useState(false);
  const [hideOnOrder, setHideOnOrder] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  // new-order picker
  const [searchInput, setSearchInput] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef();

  // submit + feedback
  const [saving, setSaving] = useState(null); // "draft" | "ordered" | null
  const [result, setResult] = useState(null); // created PO
  const [pdfBusy, setPdfBusy] = useState(null);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const [confirmReset, setConfirmReset] = useState(false);

  const notify = (message, severity = "success") => setSnack({ open: true, severity, message });

  /* ---------- load suppliers ---------- */
  useEffect(() => {
    let alive = true;
    http
      .get(`${PO_API}/suppliers`)
      .then((r) => alive && setSuppliers(r.data.data || []))
      .catch(async (e) => alive && notify(await apiMessage(e, "Couldn't load suppliers"), "error"))
      .finally(() => alive && setSuppliersLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  /* ---------- reorder list ---------- */
  const loadReorder = useCallback(async () => {
    setReorderLoading(true);
    try {
      const params = { include_on_order: hideOnOrder ? 0 : 1 };
      if (reorderSearch.trim()) params.search = reorderSearch.trim();
      if (onlySupplierItems && supplier) params.supplier_id = supplier.id;
      const r = await http.get(`${PO_API}/reorder-suggestions`, { params });
      setReorder(r.data.data || []);
      setReorderSummary(r.data.summary || null);
      setSelected(new Set());
    } catch (e) {
      notify(await apiMessage(e, "Couldn't load the reorder list"), "error");
    } finally {
      setReorderLoading(false);
    }
  }, [hideOnOrder, reorderSearch, onlySupplierItems, supplier]);

  useEffect(() => {
    if (orderType !== "out_of_stock") return undefined;
    const t = setTimeout(loadReorder, reorderSearch ? 350 : 0);
    return () => clearTimeout(t);
  }, [orderType, loadReorder, reorderSearch]);

  /* ---------- catalog search ---------- */
  useEffect(() => {
    if (orderType !== "new_order") return undefined;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const r = await http.get(`${PO_API}/medicine-search`, { params: { q: searchInput.trim(), limit: 25 } });
        setSearchOptions(r.data.data || []);
      } catch (e) {
        notify(await apiMessage(e, "Search failed"), "error");
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput, orderType]);

  /* ---------- line ops ---------- */
  const inOrder = useMemo(() => new Set(lines.map((l) => l.medicine_id)), [lines]);

  const addMedicines = (meds) => {
    const fresh = meds.filter((m) => !inOrder.has(m.medicine_id));
    if (!fresh.length) {
      notify("Already on the order", "info");
      return;
    }
    setLines((prev) => [...prev, ...fresh.map(toLine)]);
    notify(`${fresh.length} medicine${fresh.length > 1 ? "s" : ""} added`);
  };

  const updateLine = (key, field, value) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));

  /* ---------- totals ---------- */
  const totals = useMemo(() => {
    const priced = lines.map(priceLine);
    const subtotal = money(priced.reduce((s, p) => s + p.gross, 0));
    const itemDiscount = money(lines.reduce((s, l) => s + (Number(l.discount_amount) || 0), 0));
    const tax = money(priced.reduce((s, p) => s + p.tax, 0));
    const linesTotal = money(priced.reduce((s, p) => s + p.total, 0));
    const grand = money(linesTotal - (Number(orderDiscount) || 0) + (Number(otherCharges) || 0));
    const qty = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
    return { subtotal, itemDiscount, tax, grand, qty };
  }, [lines, orderDiscount, otherCharges]);

  const errors = useMemo(() => Object.fromEntries(lines.map((l) => [l.key, lineError(l)])), [lines]);
  const hasLineErrors = Object.values(errors).some(Boolean);
  const blockers = [
    !supplier && "Select a supplier",
    !lines.length && "Add at least one medicine",
    hasLineErrors && "Fix the highlighted lines",
    totals.grand < 0 && "Order discount is more than the order value",
  ].filter(Boolean);

  /* ---------- submit ---------- */
  const submit = async (status) => {
    if (blockers.length) {
      notify(blockers[0], "warning");
      return;
    }
    setSaving(status);
    try {
      const body = {
        order_type: orderType,
        supplier_id: supplier.id,
        status,
        expected_delivery_date: expectedDate || null,
        notes: notes.trim() || null,
        discount_amount: Number(orderDiscount) || 0,
        other_charges: Number(otherCharges) || 0,
        items: lines.map((l) => ({
          medicine_id: l.medicine_id,
          quantity: Number(l.quantity),
          free_quantity: Number(l.free_quantity) || 0,
          purchase_price: Number(l.purchase_price) || 0,
          discount_amount: Number(l.discount_amount) || 0,
          gst_percentage: Number(l.gst_percentage) || 0,
          mrp: Number(l.mrp) || 0,
        })),
      };
      const r = await http.post(`${PO_API}/post`, body);
      setResult({ ...r.data.data, message: r.data.message });
    } catch (e) {
      notify(await apiMessage(e, "Couldn't save the purchase order"), "error");
    } finally {
      setSaving(null);
    }
  };

  const generateDraft = async () => {
    setSaving("ordered");
    try {
      const r = await http.post(`${PO_API}/generate/${result.id}`);
      setResult({ ...r.data.data, message: r.data.message });
    } catch (e) {
      notify(await apiMessage(e, "Couldn't generate the order"), "error");
    } finally {
      setSaving(null);
    }
  };

  /* ---------- pdf ---------- */
  const fetchPdf = async (po, mode) => {
    setPdfBusy(mode);
    try {
      const r = await http.get(`${PO_API}/pdf/${po.id}`, {
        params: mode === "download" ? { download: 1 } : {},
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      if (mode === "download") {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${String(po.purchase_number).replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(url, "_blank", "noopener");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      notify(await apiMessage(e, "Couldn't build the PDF"), "error");
    } finally {
      setPdfBusy(null);
    }
  };

  const resetForm = () => {
    setLines([]);
    setNotes("");
    setOrderDiscount("");
    setOtherCharges("");
    setExpectedDate("");
    setResult(null);
    setSelected(new Set());
    if (orderType === "out_of_stock") loadReorder();
  };

  /* ---------- reorder table selection ---------- */
  const selectable = reorder.filter((m) => !inOrder.has(m.medicine_id));
  const allSelected = selectable.length > 0 && selectable.every((m) => selected.has(m.medicine_id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectable.map((m) => m.medicine_id)));
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ================================================================ */
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Generate Purchase Order</Typography>
          <Typography variant="body2" color="text.secondary">
            Reorder what's running low, or place a new order — then download the PO to send to your supplier.
          </Typography>
        </Box>
        {lines.length > 0 && (
          <Button color="inherit" onClick={() => setConfirmReset(true)}>Clear order</Button>
        )}
      </Stack>

      {/* ---------------- Order setup ---------------- */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <ToggleButtonGroup
              exclusive
              value={orderType}
              onChange={(_, v) => v && setOrderType(v)}
              color="primary"
              sx={{ flexWrap: "wrap" }}
            >
              <ToggleButton value="out_of_stock" sx={{ px: 3, textTransform: "none" }}>
                <ReportProblemOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                Out of stock · Reorder
              </ToggleButton>
              <ToggleButton value="new_order" sx={{ px: 3, textTransform: "none" }}>
                <AddShoppingCartIcon fontSize="small" sx={{ mr: 1 }} />
                New order
              </ToggleButton>
            </ToggleButtonGroup>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Autocomplete
                sx={{ flex: 2, minWidth: 260 }}
                options={suppliers}
                loading={suppliersLoading}
                value={supplier}
                onChange={(_, v) => setSupplier(v)}
                getOptionLabel={(o) => o.supplier_name || ""}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderOption={(props, o) => (
                  <li {...props} key={o.id}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{o.supplier_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[o.contact_person, o.phone, o.gst_number && `GSTIN ${o.gst_number}`].filter(Boolean).join(" · ")}
                      </Typography>
                    </Box>
                  </li>
                )}
                noOptionsText="No active suppliers — add one in Suppliers first"
                renderInput={(params) => <TextField {...params} label="Supplier *" />}
              />
              <TextField
                sx={{ flex: 1, minWidth: 180 }}
                type="date"
                label="Expected delivery"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: today() }}
              />
              <TextField
                sx={{ flex: 2, minWidth: 220 }}
                label="Notes for supplier"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Urgent — deliver before Friday"
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* ---------------- Picker ---------------- */}
      {orderType === "out_of_stock" ? (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader
            title="Medicines running low"
            subheader={
              reorderSummary
                ? `${reorderSummary.out_of_stock} out of stock · ${reorderSummary.low} low · ${reorderSummary.already_on_order} already on order`
                : "Stock at or below the reorder level"
            }
            action={
              <Tooltip title="Refresh">
                <IconButton onClick={loadReorder}><RefreshIcon /></IconButton>
              </Tooltip>
            }
          />
          <Divider />
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} mb={2}>
              <TextField
                size="small"
                placeholder="Search medicine or code"
                value={reorderSearch}
                onChange={(e) => setReorderSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                sx={{ minWidth: 260 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={onlySupplierItems}
                    onChange={(e) => setOnlySupplierItems(e.target.checked)}
                    disabled={!supplier}
                  />
                }
                label={supplier ? `Only items last bought from ${supplier.supplier_name}` : "Only this supplier's items (pick a supplier)"}
              />
              <FormControlLabel
                control={<Switch checked={hideOnOrder} onChange={(e) => setHideOnOrder(e.target.checked)} />}
                label="Hide items already covered by open orders"
              />
              <Box flex={1} />
              <Button
                variant="contained"
                startIcon={<PlaylistAddIcon />}
                disabled={!selected.size}
                onClick={() => addMedicines(reorder.filter((m) => selected.has(m.medicine_id)))}
              >
                Add selected ({selected.size})
              </Button>
            </Stack>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={selected.size > 0 && !allSelected}
                        onChange={toggleAll}
                        disabled={!selectable.length}
                      />
                    </TableCell>
                    <TableCell>Medicine</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Reorder lvl</TableCell>
                    <TableCell align="right">On order</TableCell>
                    <TableCell>Last supplier</TableCell>
                    <TableCell align="right">Last rate</TableCell>
                    <TableCell align="right">Suggested</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reorderLoading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}><Skeleton /></TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {!reorderLoading && !reorder.length && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Stack alignItems="center" spacing={1} py={5} color="text.secondary">
                          <Inventory2OutlinedIcon fontSize="large" />
                          <Typography>Nothing is running low right now.</Typography>
                          <Typography variant="caption">Switch to “New order” to order any medicine.</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                  {!reorderLoading &&
                    reorder.map((m) => {
                      const added = inOrder.has(m.medicine_id);
                      return (
                        <TableRow
                          key={m.medicine_id}
                          hover
                          selected={selected.has(m.medicine_id)}
                          onClick={() => !added && toggleOne(m.medicine_id)}
                          sx={{ cursor: added ? "default" : "pointer", opacity: added ? 0.55 : 1 }}
                        >
                          <TableCell padding="checkbox">
                            {added ? (
                              <Chip size="small" label="Added" />
                            ) : (
                              <Checkbox
                                checked={selected.has(m.medicine_id)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggleOne(m.medicine_id)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{m.medicine}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {[m.dosage_form, m.medicine_code].filter(Boolean).join(" · ")}
                              {m.expired_stock > 0 && ` · ${m.expired_stock} expired (not counted)`}
                            </Typography>
                          </TableCell>
                          <TableCell><StockChip m={m} /></TableCell>
                          <TableCell align="right">
                            <Tooltip title={m.reorder_level_is_default ? "Default level — set a reorder level on the medicine" : ""}>
                              <span>{m.reorder_level}{m.reorder_level_is_default ? "*" : ""}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">{m.on_order || "-"}</TableCell>
                          <TableCell>{m.last_supplier_name || <Typography variant="caption" color="text.secondary">Never bought</Typography>}</TableCell>
                          <TableCell align="right">{m.purchase_price ? inr(m.purchase_price) : "-"}</TableCell>
                          <TableCell align="right"><b>{m.suggested_quantity}</b></TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader title="Add medicines" subheader="Search your pharmacy catalog by name, brand, code or barcode" />
          <Divider />
          <CardContent>
            <Autocomplete
              options={searchOptions}
              loading={searchLoading}
              filterOptions={(x) => x}
              value={null}
              inputValue={searchInput}
              onInputChange={(_, v, reason) => reason !== "reset" && setSearchInput(v)}
              onChange={(_, v) => {
                if (v) addMedicines([v]);
                setSearchInput("");
              }}
              getOptionLabel={(o) => o.medicine || ""}
              getOptionDisabled={(o) => inOrder.has(o.medicine_id)}
              isOptionEqualToValue={(a, b) => a.medicine_id === b.medicine_id}
              renderOption={(props, o) => (
                <li {...props} key={o.medicine_id}>
                  <Stack direction="row" alignItems="center" spacing={2} width="100%">
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={600}>{o.medicine}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[o.dosage_form, o.medicine_code, o.last_supplier_name && `Last from ${o.last_supplier_name}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    </Box>
                    {inOrder.has(o.medicine_id) ? <Chip size="small" label="Added" /> : <StockChip m={o} />}
                    <Typography variant="body2" sx={{ minWidth: 80, textAlign: "right" }}>
                      {o.purchase_price ? `₹${inr(o.purchase_price)}` : ""}
                    </Typography>
                  </Stack>
                </li>
              )}
              noOptionsText={searchInput ? "No matching medicine in your catalog" : "Start typing a medicine name"}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type to search, press Enter to add"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                    endAdornment: (
                      <>
                        {searchLoading ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* ---------------- Order lines + totals ---------------- */}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="flex-start">
        <Card variant="outlined" sx={{ flex: 1, width: "100%" }}>
          <CardHeader
            title={`Order lines (${lines.length})`}
            subheader="Rates are expected rates — batch, expiry and final rate come from the supplier invoice at receiving."
          />
          <Divider />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Medicine</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right" sx={{ width: 90 }}>Qty</TableCell>
                  <TableCell align="right" sx={{ width: 80 }}>Free</TableCell>
                  <TableCell align="right" sx={{ width: 110 }}>Rate</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>Disc ₹</TableCell>
                  <TableCell align="right" sx={{ width: 80 }}>GST %</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {!lines.length && (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Stack alignItems="center" spacing={1} py={5} color="text.secondary">
                        <AddShoppingCartIcon fontSize="large" />
                        <Typography>No medicines on this order yet.</Typography>
                        <Typography variant="caption">
                          {orderType === "out_of_stock" ? "Tick items in the reorder list above and click “Add selected”." : "Search above to add medicines."}
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {lines.map((l, i) => {
                  const p = priceLine(l);
                  const err = errors[l.key];
                  const num = (field, extra = {}) => (
                    <TextField
                      size="small"
                      type="number"
                      value={l[field]}
                      onChange={(e) => updateLine(l.key, field, e.target.value)}
                      inputProps={{ min: 0, style: { textAlign: "right" }, ...extra }}
                      sx={{ width: "100%" }}
                    />
                  );
                  return (
                    <TableRow key={l.key} hover sx={err ? { bgcolor: (t) => alpha(t.palette.error.main, 0.06) } : undefined}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{l.medicine}</Typography>
                        <Typography variant="caption" color={err ? "error" : "text.secondary"}>
                          {err || [l.dosage_form, l.medicine_code, l.on_order ? `${l.on_order} already on order` : null].filter(Boolean).join(" · ")}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{l.current_stock}</TableCell>
                      <TableCell>{num("quantity", { step: 1, min: 1 })}</TableCell>
                      <TableCell>{num("free_quantity", { step: 1 })}</TableCell>
                      <TableCell>{num("purchase_price", { step: "0.01" })}</TableCell>
                      <TableCell>{num("discount_amount", { step: "0.01" })}</TableCell>
                      <TableCell>{num("gst_percentage", { step: "0.01", max: 100 })}</TableCell>
                      <TableCell align="right"><b>{inr(p.total)}</b></TableCell>
                      <TableCell>
                        <Tooltip title="Remove">
                          <IconButton size="small" onClick={() => removeLine(l.key)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Card variant="outlined" sx={{ width: { xs: "100%", lg: 340 }, flexShrink: 0, position: { lg: "sticky" }, top: 16 }}>
          <CardHeader title="Summary" subheader={`${lines.length} item(s) · ${totals.qty} units`} />
          <Divider />
          <CardContent>
            <Stack spacing={1.2}>
              <Row label="Sub total" value={inr(totals.subtotal)} />
              {totals.itemDiscount > 0 && <Row label="Item discount" value={`- ${inr(totals.itemDiscount)}`} />}
              <Row label="GST" value={inr(totals.tax)} />
              <TextField
                size="small"
                type="number"
                label="Order discount ₹"
                value={orderDiscount}
                onChange={(e) => setOrderDiscount(e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
              />
              <TextField
                size="small"
                type="number"
                label="Other charges ₹ (freight etc.)"
                value={otherCharges}
                onChange={(e) => setOtherCharges(e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
              />
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography fontWeight={700}>Grand total</Typography>
                <Typography variant="h6" fontWeight={700} color="primary">₹{inr(totals.grand)}</Typography>
              </Stack>

              {blockers.length > 0 && lines.length > 0 && (
                <Alert severity="warning" variant="outlined" sx={{ py: 0 }}>{blockers[0]}</Alert>
              )}

              <Button
                variant="contained"
                size="large"
                startIcon={saving === "ordered" ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                disabled={!!saving || blockers.length > 0}
                onClick={() => submit("ordered")}
              >
                Generate PO
              </Button>
              <Button
                variant="outlined"
                startIcon={saving === "draft" ? <CircularProgress size={18} /> : <SaveOutlinedIcon />}
                disabled={!!saving || blockers.length > 0}
                onClick={() => submit("draft")}
              >
                Save as draft
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* ---------------- Result dialog ---------------- */}
      <Dialog open={!!result} maxWidth="xs" fullWidth onClose={() => {}}>
        <DialogTitle>
          {result?.status === "ordered" ? "Purchase order generated" : "Draft saved"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Alert severity={result?.status === "ordered" ? "success" : "info"}>{result?.message}</Alert>
            <Row label="PO number" value={result?.purchase_number} bold />
            <Row label="Supplier" value={result?.supplier_name} />
            <Row label="Items" value={result?.items?.length} />
            <Row label="Total" value={`₹${inr(result?.grand_total)}`} bold />
            {result?.status === "draft" && (
              <Typography variant="caption" color="text.secondary">
                The draft PDF carries a DRAFT watermark. Generate it when you're ready to send it to the supplier.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}>
          <Button onClick={resetForm}>New order</Button>
          <Box flex={1} />
          {result?.status === "draft" && (
            <Button variant="outlined" onClick={generateDraft} disabled={!!saving}>
              {saving ? <CircularProgress size={18} /> : "Generate now"}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={pdfBusy === "view" ? <CircularProgress size={16} /> : <OpenInNewIcon />}
            disabled={!!pdfBusy}
            onClick={() => fetchPdf(result, "view")}
          >
            View
          </Button>
          <Button
            variant="contained"
            startIcon={pdfBusy === "download" ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            disabled={!!pdfBusy}
            onClick={() => fetchPdf(result, "download")}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- Clear confirm ---------------- */}
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Clear this order?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">All {lines.length} line(s) will be removed. Nothing has been saved yet.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>Keep</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmReset(false);
              resetForm();
            }}
          >
            Clear
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function Row({ label, value, bold }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={bold ? 700 : 500}>{value ?? "-"}</Typography>
    </Stack>
  );
}