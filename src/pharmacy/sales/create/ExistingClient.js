// src/components/pharmacy/sales/create/ExistingClient.jsx
// v2 — per-item Discount (₹) and GST (%) support added
//   • Each cart item now has its own Discount & GST inputs (mobile card + desktop table)
//   • Subtotal = (items gross) − (sum of per-item discounts)
//   • Bill-level discount applies on top of per-item discounts
//   • GST default: per-item sum. If overall GST is set, it OVERRIDES per-item GST
//   • Payment summary shows per-item discount total as a separate line
//   • Park payload now sends actual per-item discount_amount & gst_percentage

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { usePermission } from "../../../Redux/store/hooks/usePermissions";
import {
  Box, Paper, Stack, Typography, TextField, IconButton, Button,
  Avatar, Chip, Divider, CircularProgress, Snackbar, Alert, Fade,
  Popper, Grow, ClickAwayListener, List, ListItemButton, ListItemText,
  InputAdornment, Table, TableHead, TableBody, TableRow, TableCell,
  Tooltip, LinearProgress, Zoom, Dialog, DialogTitle, DialogContent,
  DialogActions, ToggleButton, ToggleButtonGroup, useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import SearchIcon from "@mui/icons-material/Search";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocalPharmacyOutlinedIcon from "@mui/icons-material/LocalPharmacyOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import PercentIcon from "@mui/icons-material/Percent";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import EventIcon from "@mui/icons-material/Event";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import CheckoutDialog from "./CheckoutDialog";
import PrescriptionsPanel from "./PrescriptionsPanel";
const API = process.env.REACT_APP_URL;

const BRAND = {
  teal: "#0f766e",
  tealLight: "#14b8a6",
  tealSoft: "#f0fdfa",
  accent: "#7A2E9C",
  success: "#10b981",
  warning: "#f59e0b",
  warningSoft: "#fef3c7",
  danger: "#ef4444",
  bg: "#f8fafc",
};

function monthsUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.round((d - new Date()) / (1000 * 60 * 60 * 24 * 30));
}
function formatExpiry(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function StepIndicator({ currentStep }) {
  const steps = [
    { num: 1, label: "Find Patient", short: "Patient" },
    { num: 2, label: "Add Medicines", short: "Medicines" },
    { num: 3, label: "Review & Pay", short: "Pay" },
  ];
  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 1,
      p: 1.5, borderRadius: 2,
      bgcolor: alpha(BRAND.teal, 0.04),
      border: `1px solid ${alpha(BRAND.teal, 0.1)}`,
      flexWrap: "wrap",
    }}>
      {steps.map((s, i) => {
        const done = currentStep > s.num;
        const active = currentStep === s.num;
        return (
          <React.Fragment key={s.num}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Box sx={{
                width: 24, height: 24, borderRadius: "50%",
                display: "grid", placeItems: "center",
                fontSize: 12, fontWeight: 700,
                bgcolor: done || active ? BRAND.teal : alpha("#000", 0.08),
                color: done || active ? "#fff" : "text.secondary",
                transition: "all .2s",
              }}>
                {done ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : s.num}
              </Box>
              <Typography variant="body2" fontWeight={active ? 700 : 500}
                sx={{
                  color: done || active ? BRAND.teal : "text.secondary",
                  display: { xs: "none", sm: "inline" },
                }}>{s.label}</Typography>
              <Typography variant="body2" fontWeight={active ? 700 : 500}
                sx={{
                  color: done || active ? BRAND.teal : "text.secondary",
                  display: { xs: "inline", sm: "none" },
                }}>{s.short}</Typography>
            </Stack>
            {i < steps.length - 1 && (
              <KeyboardArrowRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, color = BRAND.teal, action }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{
          width: 40, height: 40, borderRadius: "12px",
          bgcolor: alpha(color, 0.1), color,
          display: "grid", placeItems: "center",
        }}>
          <Icon />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: 16, lineHeight: 1.3 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          )}
        </Box>
      </Stack>
      {action}
    </Stack>
  );
}

function QuantityStepper({ value, max, onChange, size = "medium" }) {
  const theme = useTheme();
  const btnSize = size === "small" ? 28 : 32;
  const inputW = size === "small" ? 44 : 52;
  return (
    <Stack direction="row" alignItems="center"
      sx={{
        border: `1.5px solid ${theme.palette.divider}`,
        borderRadius: 2, overflow: "hidden", bgcolor: "background.paper",
        width: "fit-content",
      }}>
      <IconButton size="small" disabled={value <= 0} onClick={() => onChange(value - 1)}
        sx={{ width: btnSize, height: btnSize, borderRadius: 0, "&:hover": { bgcolor: alpha(BRAND.teal, 0.08) } }}>
        <RemoveIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <TextField value={value}
        onChange={(e) => {
          const n = Math.max(0, Math.min(max, Number(e.target.value) || 0));
          onChange(n);
        }}
        variant="standard"
        inputProps={{
          style: {
            textAlign: "center", width: inputW, fontWeight: 700,
            fontSize: size === "small" ? 13 : 14, padding: "4px 0", border: "none",
          },
        }}
        InputProps={{ disableUnderline: true }} />
      <IconButton size="small" disabled={value >= max} onClick={() => onChange(value + 1)}
        sx={{ width: btnSize, height: btnSize, borderRadius: 0, "&:hover": { bgcolor: alpha(BRAND.teal, 0.08) } }}>
        <AddIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Stack>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <Box sx={{
      textAlign: "center", py: 5, px: 3,
      border: "2px dashed", borderColor: "divider",
      borderRadius: 3, bgcolor: alpha("#000", 0.01),
    }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: "50%",
        display: "grid", placeItems: "center", mx: "auto", mb: 2,
        bgcolor: alpha(BRAND.teal, 0.08), color: BRAND.teal,
      }}>
        <Icon sx={{ fontSize: 28 }} />
      </Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, mx: "auto" }}>
        {hint}
      </Typography>
    </Box>
  );
}

/* ⭐ NEW — compact two-input row for per-item Disc + GST */
function ItemAdjustRow({ item, idx, overallGstActive, onDiscount, onGst }) {
  const lineMax = item.unit_price * item.quantity;
  const lineNet = lineMax - (Number(item.discount_amount) || 0);
  const lineGst = (lineNet * (Number(item.gst_percentage) || 0)) / 100;

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ mt: 1, flexWrap: "wrap", alignItems: "center" }}
    >
      <TextField
        size="small"
        label="Disc"
        type="number"
        value={item.discount_amount || ""}
        onChange={(e) => onDiscount(idx, e.target.value)}
        placeholder="0"
        InputProps={{
          sx: { fontSize: 13, bgcolor: "#fff" },
          startAdornment: (
            <InputAdornment position="start" sx={{ "& p": { fontSize: 12 } }}>₹</InputAdornment>
          ),
        }}
        inputProps={{ min: 0, max: lineMax, step: "0.01" }}
        sx={{ width: { xs: "48%", sm: 110 } }}
      />
      <TextField
        size="small"
        label="GST"
        type="number"
        value={item.gst_percentage || ""}
        onChange={(e) => onGst(idx, e.target.value)}
        placeholder="0"
        InputProps={{
          sx: { fontSize: 13, bgcolor: "#fff" },
          endAdornment: (
            <InputAdornment position="end" sx={{ "& p": { fontSize: 12 } }}>%</InputAdornment>
          ),
        }}
        inputProps={{ min: 0, max: 100, step: "0.1" }}
        sx={{ width: { xs: "48%", sm: 100 } }}
        disabled={overallGstActive}
        helperText={overallGstActive ? "Overridden" : ""}
        FormHelperTextProps={{
          sx: { fontSize: 10, mx: 0, mt: 0, color: "#9a3412" },
        }}
      />

      {(item.discount_amount > 0 || (item.gst_percentage > 0 && !overallGstActive)) && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ ml: { sm: "auto" }, fontVariantNumeric: "tabular-nums" }}
        >
          {item.discount_amount > 0 && (
            <Box component="span" sx={{ color: BRAND.success, mr: 1 }}>
              − ₹{Number(item.discount_amount).toFixed(2)}
            </Box>
          )}
          {item.gst_percentage > 0 && !overallGstActive && (
            <Box component="span" sx={{ color: "#64748b" }}>
              + GST ₹{lineGst.toFixed(2)}
            </Box>
          )}
        </Typography>
      )}
    </Stack>
  );
}

export default function ExistingClient({ branchState, branchParams = {} }) {
  // Branch chosen in the Sales header, appended to every stock-aware lookup so this
  // counter only ever offers stock that is really in this branch.
  const bq = branchParams.branch ? `&branch=${encodeURIComponent(branchParams.branch)}` : "";
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  // See the note in POS.js: reading s.auth.permissions directly loses the admin bypass,
  // and buildUserAccess() returns an empty permissions array for every tenant admin, so the
  // Pay button disappeared for admins as well as for staff. usePermission() bypasses on
  // role === "admin" the same way allowPermissions.js does on the server.
  const canCreateSale = usePermission("pharmacy.sales.create");

  const [patient, setPatient] = useState(null);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientOptions, setPatientOptions] = useState([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientPopperOpen, setPatientPopperOpen] = useState(false);
  const patientAnchorRef = useRef(null);

  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const [medicineQuery, setMedicineQuery] = useState("");
  const [medicineOptions, setMedicineOptions] = useState([]);
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [medicinePopperOpen, setMedicinePopperOpen] = useState(false);
  const medicineAnchorRef = useRef(null);

  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const [batchPickerMedicine, setBatchPickerMedicine] = useState(null);
  const [batchPickerBatches, setBatchPickerBatches] = useState([]);

  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");

  const [discountType, setDiscountType] = useState("amount");
  const [discountValue, setDiscountValue] = useState(0);
  const [saleGstPercent, setSaleGstPercent] = useState(0);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [currentDraftNumber, setCurrentDraftNumber] = useState("");
  const [parkDialogOpen, setParkDialogOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [parkNotes, setParkNotes] = useState("");
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [parking, setParking] = useState(false);

  const [substituteDialogOpen, setSubstituteDialogOpen] = useState(false);
  const [substituteSearchInput, setSubstituteSearchInput] = useState("");
  const [substituteResults, setSubstituteResults] = useState([]);
  const [substituteRequested, setSubstituteRequested] = useState(null);
  const [substituteLoading, setSubstituteLoading] = useState(false);

  const showMessage = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  const currentStep = !patient ? 1 : items.length === 0 ? 2 : 3;

  // ═══ Debounced patient search ═══
  useEffect(() => {
    if (patient) return;
    const q = patientQuery.trim();
    if (q.length < 2) { setPatientOptions([]); setPatientPopperOpen(false); return; }
    let active = true;
    setPatientLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API}/api/clients/search?q=${encodeURIComponent(q)}`,
          { withCredentials: true }
        );
        if (!active) return;
        const d = res.data?.data ?? res.data ?? [];
        const results = Array.isArray(d) ? d : [];
        setPatientOptions(results);
        setPatientPopperOpen(results.length > 0);
      } catch {
        if (active) { setPatientOptions([]); setPatientPopperOpen(false); }
      } finally {
        if (active) setPatientLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [patientQuery, patient]);

  // ═══ Debounced medicine search ═══
  useEffect(() => {
    const q = medicineQuery.trim();
    if (q.length < 2) { setMedicineOptions([]); setMedicinePopperOpen(false); return; }
    let active = true;
    setMedicineLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API}/api/pharmacy/medicines?search=${encodeURIComponent(q)}&status=active&limit=10${bq}`,
          { withCredentials: true }
        );
        if (!active) return;
        const d = res.data?.data ?? [];
        const medicines = Array.isArray(d) ? d : [];
        const enriched = await Promise.all(
          medicines.map(async (med) => {
            try {
              const br = await axios.get(
                `${API}/api/pharmacy/batches?medicine_id=${med.id}&status=active${bq}`,
                { withCredentials: true }
              );
              const bd = br.data?.data ?? [];
              const batches = (Array.isArray(bd) ? bd : [])
                .filter((b) => b.quantity_available > 0)
                .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
              const totalStock = batches.reduce((s, b) => s + Number(b.quantity_available || 0), 0);
              return { ...med, batches, totalStock };
            } catch {
              return { ...med, batches: [], totalStock: 0 };
            }
          })
        );
        if (!active) return;
        setMedicineOptions(enriched);
        setMedicinePopperOpen(enriched.length > 0);
      } catch {
        if (active) { setMedicineOptions([]); setMedicinePopperOpen(false); }
      } finally {
        if (active) setMedicineLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [medicineQuery]);

  const handlePickPatient = async (p) => {
    setPatient(p);
    setPatientPopperOpen(false);
    setPatientQuery("");
    setPrescriptionsLoading(true);
    try {
      const res = await axios.get(
        `${API}/api/prescriptions/patient/${p.id}`,
        { withCredentials: true }
      );
      const d = res.data?.data ?? res.data ?? [];
      setPrescriptions(Array.isArray(d) ? d : []);
    } catch (err) {
      setPrescriptions([]);
    } finally {
      setPrescriptionsLoading(false);
    }
  };

const loadPrescription = async (rx) => {
  setSelectedPrescription({
    id: rx.id,
    doctor_name: rx.doctor_name,
    created_at: rx.created_at,
  });
  showMessage("Checking inventory for prescribed medicines…", "info");

  try {
    // Stock is matched in the branch this sale is for (staff: their own branch).
    const res = await axios.get(
      `${API}/api/prescriptions/pharmacy/resolve/${rx.id}`,
      { params: branchParams, withCredentials: true }
    );
    const resolved = res.data?.data || [];
    const summary = res.data?.summary || {};

    const cartItems = [];
    for (const r of resolved) {
      if (!r.in_stock) continue;              // skip unavailable
      const pharm = r.pharmacy_medicine;
      const batch = r.batches[0];             // FEFO (sorted by expiry)
      cartItems.push({
        medicine_id: pharm.id,
        medicine_name: pharm.medicine_name,
        manufacturer: pharm.manufacturer,
        pack_size: pharm.pack_size,
        batch_id: batch.id,
        batch_number: batch.batch_number,
        expiry_date: batch.expiry_date,
        available: Number(batch.quantity_available),
        prescribed_quantity: Number(r.rx_medicine.quantity) || 1,
        quantity: Math.min(Number(r.rx_medicine.quantity) || 1, Number(batch.quantity_available)),
        unit_price: Number(batch.selling_price),
        discount_amount: 0,
        gst_percentage: Number(pharm.gst_percentage || 0),
        from_prescription: true,
        rx_medicine_name: r.rx_medicine.medicine_name,
        rx_when_to_take: r.rx_medicine.when_to_take,
        rx_duration: r.rx_medicine.duration,
        rx_description: r.rx_medicine.description,
      });
    }

    setItems(cartItems);

    const { total, in_stock, not_in_inventory, out_of_stock } = summary;
    if (in_stock === 0) {
      const reasons = [];
      if (not_in_inventory > 0) reasons.push(`${not_in_inventory} not in your inventory`);
      if (out_of_stock > 0) reasons.push(`${out_of_stock} out of stock`);
      showMessage(`No medicines added — ${reasons.join(" · ")}`, "warning");
    } else if (in_stock < total) {
      const reasons = [];
      if (not_in_inventory > 0) reasons.push(`${not_in_inventory} not in inventory`);
      if (out_of_stock > 0) reasons.push(`${out_of_stock} out of stock`);
      showMessage(`Added ${in_stock} of ${total} · ${reasons.join(" · ")}`, "warning");
    } else {
      showMessage(`✓ All ${in_stock} medicines added`, "success");
    }
  } catch (err) {
    console.error("Resolve prescription error:", err);
    showMessage("Failed to load prescription", "error");
  }
};

  const openBatchPicker = (medicine) => {
    setBatchPickerMedicine(medicine);
    setBatchPickerBatches(medicine.batches || []);
    setBatchPickerOpen(true);
    setMedicinePopperOpen(false);
  };

  const addBatchToCart = (medicine, batch) => {
    const existingIdx = items.findIndex(
      (i) => i.medicine_id === medicine.id && i.batch_id === batch.id
    );
    if (existingIdx >= 0) {
      const current = items[existingIdx];
      if (current.quantity >= current.available) {
        showMessage(`Only ${current.available} left in this batch`, "warning");
        return;
      }
      const updated = [...items];
      updated[existingIdx] = { ...current, quantity: current.quantity + 1 };
      setItems(updated);
      showMessage(`${medicine.medicine_name} — qty +1`, "success");
    } else {
      setItems([...items, {
        medicine_id: medicine.id,
        medicine_name: medicine.medicine_name,
        batch_id: batch.id,
        batch_number: batch.batch_number,
        expiry_date: batch.expiry_date,
        available: Number(batch.quantity_available),
        prescribed_quantity: 0,
        quantity: 1,
        unit_price: Number(batch.selling_price),
        discount_amount: 0,                                        // ⭐ NEW
        gst_percentage: Number(medicine.gst_percentage || 0),      // ⭐ NEW
        from_prescription: false,
      }]);
      showMessage(`✓ Added ${medicine.medicine_name} (batch ${batch.batch_number})`, "success");
    }
    setBatchPickerOpen(false);
    setMedicineQuery("");
    setMedicineOptions([]);
  };

  const updateQty = (idx, qty) => {
    const updated = [...items];
    const item = updated[idx];
    item.quantity = Math.max(0, Math.min(Number(qty) || 0, item.available));
    // Cap discount to new line gross
    const newLineMax = item.unit_price * item.quantity;
    if ((item.discount_amount || 0) > newLineMax) item.discount_amount = newLineMax;
    setItems(updated);
  };

  // ⭐ NEW — per-item discount handler
  const updateItemDiscount = (idx, val) => {
    const updated = [...items];
    const num = Math.max(0, Number(val) || 0);
    const lineMax = updated[idx].unit_price * updated[idx].quantity;
    updated[idx].discount_amount = Math.min(num, lineMax);
    setItems(updated);
  };

  // ⭐ NEW — per-item GST handler
  const updateItemGst = (idx, val) => {
    const updated = [...items];
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    updated[idx].gst_percentage = num;
    setItems(updated);
  };

  const removeItem = (idx) => {
    const name = items[idx].medicine_name;
    setItems(items.filter((_, i) => i !== idx));
    showMessage(`Removed ${name}`, "info");
  };

  const resetAll = () => {
    setPatient(null);
    setPrescriptions([]);
    setSelectedPrescription(null);
    setItems([]);
    setNotes("");
    setDiscountType("amount");
    setDiscountValue(0);
    setSaleGstPercent(0);
    setPatientQuery("");
    setPatientOptions([]);
    setCurrentDraftId(null);
    setCurrentDraftNumber("");
  };

  // ═══ TOTALS (per-item + bill-level) ═══
  const itemsGross = useMemo(
    () => items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
    [items]
  );
  const perItemDiscountTotal = useMemo(
    () => items.reduce((s, i) => s + (Number(i.discount_amount) || 0), 0),
    [items]
  );
  const subtotal = Math.max(0, itemsGross - perItemDiscountTotal);

  const discountAmount = useMemo(() => {
    const v = Math.max(0, Number(discountValue) || 0);
    if (discountType === "percent") return Math.min(subtotal, (subtotal * v) / 100);
    return Math.min(v, subtotal);
  }, [discountType, discountValue, subtotal]);

  const netAfterDiscount = Math.max(0, subtotal - discountAmount);

  const perItemGstTotal = useMemo(
    () => items.reduce((s, i) => {
      const net = i.unit_price * i.quantity - (Number(i.discount_amount) || 0);
      return s + (net * (Number(i.gst_percentage) || 0)) / 100;
    }, 0),
    [items]
  );
  const overallGstActive = Number(saleGstPercent) > 0;
  const gstAmount = overallGstActive
    ? (netAfterDiscount * Number(saleGstPercent)) / 100
    : perItemGstTotal;

  const grandTotal = Math.round((netAfterDiscount + gstAmount) * 100) / 100;
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const dispensedCount = items.filter((i) => i.quantity > 0).length;

  // ═══ SUBSTITUTE SEARCH ═══
  const openSubstituteDialog = () => {
    setMedicinePopperOpen(false);
    setMedicineOptions([]);
    setSubstituteSearchInput(medicineQuery || "");
    setSubstituteResults([]);
    setSubstituteRequested(null);
    setSubstituteDialogOpen(true);
    if (medicineQuery && medicineQuery.length >= 2) searchForSubstitute(medicineQuery);
  };

  const searchForSubstitute = async (term) => {
    if (!term || term.length < 2) {
      setSubstituteResults([]); setSubstituteRequested(null); return;
    }
    setSubstituteLoading(true);
    try {
      const catalogRes = await axios.get(
        `${API}/api/pharmacy/medicines/catalog-search?search=${encodeURIComponent(term)}&limit=1`,
        { withCredentials: true }
      );
      const catalogMatch = catalogRes.data?.data?.[0];
      if (!catalogMatch) {
        setSubstituteResults([]); setSubstituteRequested(null); return;
      }
      const subRes = await axios.get(
        `${API}/api/pharmacy/medicines/substitutes?medicine_data_id=${catalogMatch.id}${bq}`,
        { withCredentials: true }
      );
      const { substitutes = [], requested } = subRes.data?.data || {};
      setSubstituteRequested(requested);
      setSubstituteResults(Array.isArray(substitutes) ? substitutes : []);
    } catch {
      setSubstituteResults([]); setSubstituteRequested(null);
    } finally {
      setSubstituteLoading(false);
    }
  };

  const addSubstituteFromDialog = async (substitute) => {
    try {
      const batchRes = await axios.get(
        `${API}/api/pharmacy/batches?medicine_id=${substitute.pharmacy_medicine_id}&status=active${bq}`,
        { withCredentials: true }
      );
      const bd = batchRes.data?.data ?? [];
      const batches = (Array.isArray(bd) ? bd : []).filter((b) => b.quantity_available > 0);
      if (batches.length === 0) { showMessage("No stock for this substitute", "warning"); return; }
      batches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
      const firstBatch = batches[0];

      let substitutionLogId = null;
      try {
        const logRes = await axios.post(
          `${API}/api/pharmacy/substitutions`,
          {
            requested_medicine_data_id: substituteRequested?.medicine_data_id,
            substituted_pharmacy_medicine_id: substitute.pharmacy_medicine_id,
            reason: "out_of_stock",
          },
          { withCredentials: true }
        );
        substitutionLogId = logRes.data?.data?.id || null;
      } catch { /* soft fail */ }

      setItems((prev) => [...prev, {
        medicine_id: substitute.pharmacy_medicine_id,
        medicine_name: substitute.medicine_name,
        batch_id: firstBatch.id,
        batch_number: firstBatch.batch_number,
        expiry_date: firstBatch.expiry_date,
        available: firstBatch.quantity_available,
        prescribed_quantity: 0,
        quantity: 1,
        unit_price: Number(firstBatch.selling_price || substitute.selling_price),
        discount_amount: 0,                                              // ⭐ NEW
        gst_percentage: Number(substitute.gst_percentage || 0),          // ⭐ NEW
        from_prescription: false,
        substituted_for: substituteRequested?.name,
        substitution_log_id: substitutionLogId,
      }]);

      showMessage(`✓ ${substitute.medicine_name} added (sub for ${substituteRequested?.name})`, "success");
      setSubstituteDialogOpen(false);
      setSubstituteResults([]); setSubstituteRequested(null); setSubstituteSearchInput("");
      setMedicineQuery("");
    } catch {
      showMessage("Failed to add substitute", "error");
    }
  };

  // ═══ PARK ═══
  const handleParkSale = async () => {
    if (!patient) { showMessage("Pick a patient first", "warning"); return; }
    if (items.length === 0) { showMessage("Add at least one medicine", "warning"); return; }
    setParking(true);
    try {
      const payload = {
        prescription_id: selectedPrescription?.id || 0,
        patient_id: patient.id,
        doctor_name: selectedPrescription?.doctor_name || null,
        notes: parkNotes.trim() || notes || null,
        status: "pending",
        order_discount_type: discountType,
        order_discount_value: Number(discountValue) || 0,
        extra_gst_percent: Number(saleGstPercent) || 0,
        items: items.map((i) => ({
          medicine_id: i.medicine_id,
          batch_id: i.batch_id,
          prescribed_quantity: i.prescribed_quantity || 0,
          dispensed_quantity: i.quantity,
          unit_price: i.unit_price,
          discount_amount: Number(i.discount_amount) || 0,              // ⭐ actual
          gst_percentage: Number(i.gst_percentage) || 0,                // ⭐ actual
          notes: i.substituted_for ? `substituted for ${i.substituted_for}` : null,
        })),
      };
      const res = await axios.post(
        `${API}/api/pharmacy/dispensing`, { ...payload, ...(branchParams.branch ? { branch: branchParams.branch } : {}) }, { withCredentials: true }
      );
      showMessage(`✓ Parked as ${res.data?.data?.dispensing_number || "draft"}`, "success");
      resetAll();
      setParkDialogOpen(false);
      setParkNotes("");
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to park sale", "error");
    } finally {
      setParking(false);
    }
  };

  const loadDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await axios.get(`${API}/api/pharmacy/dispensing/drafts`, { params: branchParams, withCredentials: true });
      const d = res.data?.data ?? [];
      setDrafts(Array.isArray(d) ? d : []);
    } catch { setDrafts([]); }
    finally { setLoadingDrafts(false); }
  };
  useEffect(() => { if (draftsOpen) loadDrafts(); }, [draftsOpen]);

  const handleResumeDraft = async (draftId) => {
    try {
      const res = await axios.get(
        `${API}/api/pharmacy/dispensing/drafts/${draftId}`,
        { withCredentials: true }
      );
      const { dispensing, items: dItems } = res.data?.data || {};
      if (!dispensing) { showMessage("Draft not found", "error"); return; }

      setPatient({
        id: dispensing.patient_id,
        name: dispensing.patient_name || "Unknown",
        mobile: dispensing.patient_mobile || "",
        email: dispensing.patient_email || "",
        gender: dispensing.patient_gender || "",
        age: dispensing.patient_age || "",
      });

      const rebuilt = (Array.isArray(dItems) ? dItems : []).map((di) => ({
        medicine_id: di.medicine_id,
        medicine_name: di.medicine_name || "Medicine",
        batch_id: di.batch_id,
        batch_number: di.batch_number || "—",
        expiry_date: di.expiry_date,
        available: Number(di.available || di.dispensed_quantity || 0),
        prescribed_quantity: di.prescribed_quantity || 0,
        quantity: di.dispensed_quantity || 0,
        unit_price: Number(di.unit_price || 0),
        discount_amount: Number(di.discount_amount) || 0,              // ⭐ restore
        gst_percentage: Number(di.gst_percentage) || 0,                // ⭐ restore
        from_prescription: dispensing.prescription_id > 0,
      }));
      setItems(rebuilt);

      setDiscountType(dispensing.order_discount_type || "amount");
      setDiscountValue(Number(dispensing.order_discount_value) || 0);
      setSaleGstPercent(Number(dispensing.extra_gst_percent) || 0);

      setNotes(dispensing.notes || "");
      setCurrentDraftId(draftId);
      setCurrentDraftNumber(dispensing.dispensing_number);
      setDraftsOpen(false);

      if (dispensing.prescription_id > 0) {
        setSelectedPrescription({
          id: dispensing.prescription_id,
          doctor_name: dispensing.doctor_name,
        });
      }
      showMessage(`Resumed ${dispensing.dispensing_number}`, "info");
    } catch {
      showMessage("Failed to load draft", "error");
    }
  };

  const handleDiscardDraft = async (draftId, draftNumber) => {
    if (!window.confirm(`Discard ${draftNumber}?`)) return;
    try {
      await axios.delete(`${API}/api/pharmacy/dispensing/drafts/${draftId}`, { withCredentials: true });
      showMessage("Draft discarded", "info");
      loadDrafts();
    } catch { showMessage("Failed to discard", "error"); }
  };

  const checkoutCustomer = useMemo(
    () => (patient ? {
      id: patient.id, name: patient.name,
      mobile: patient.mobile || patient.phone || "",
      email: patient.email || "", isNew: false,
      prescription_id: selectedPrescription?.id || null,
      doctor_name: selectedPrescription?.doctor_name || null,
    } : null),
    [patient, selectedPrescription]
  );

  // CheckoutDialog calls onSuccess(saleNumber, paid, saleId, data).
  // N8: a resumed parked prescription is billed by CheckoutDialog as a normal sale (stock
  // and payment are taken there), so the draft is only CLOSED here — finalize with
  // sale_id never moves stock a second time.
  const onCheckoutSuccess = async (saleNumber, paid, saleId = null) => {
    let draftLeftOpen = false;
    if (currentDraftId && saleId) {
      try {
        await axios.put(
          `${API}/api/pharmacy/dispensing/${currentDraftId}/finalize`,
          { sale_id: saleId },
          { withCredentials: true }
        );
      } catch (err) {
        // The sale itself went through; only the parked copy is still open.
        draftLeftOpen = true;
        showMessage(
          `Billed as ${saleNumber}, but ${currentDraftNumber || "the parked sale"} is still in Parked — discard it there.`,
          "warning"
        );
        console.warn("Closing parked prescription failed:", err.message);
      }
    }
    setCheckoutOpen(false);
    if (!draftLeftOpen) showMessage(`✓ Collected ₹${Number(paid).toFixed(2)}`, "success");
    resetAll();
  };

  const canCheckout = items.length > 0 && patient && dispensedCount > 0;

  // Same two blockers as the walk-in counter — see the fuller note in POS.js.
  // resolveScope({ forWrite: true }) in utils/pharmacyBranch.js refuses the dispense
  // outright for an admin who has not chosen a branch, and for a staff member whose
  // profile carries no branch. Both are now said before the bill is built, not after.
  const branchBlock =
    branchState?.loading || !branchState?.multi
      ? null
      : branchState.isAdmin
        ? (branchState.needsChoice
            ? "Choose the branch at the top of the page — its stock is what you dispense."
            : null)
        : (branchState.myBranch
            ? null
            : "Your profile has no branch, so there is no stock to dispense from. Ask your admin to set your branch.");

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0, bgcolor: BRAND.bg }}>
      <Box sx={{
        flex: "1 1 auto", minHeight: 0, overflowY: "auto",
        pb: items.length > 0 ? { xs: 22, sm: 18 } : 2.5,
      }}>
        <Box sx={{ maxWidth: 960, mx: "auto", px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, sm: 2, md: 2.5 } }}>
          <Box sx={{ mb: 2 }}><StepIndicator currentStep={currentStep} /></Box>

          {currentDraftId && (
            <Alert severity="warning" icon={<BookmarkIcon />}
              sx={{ borderRadius: 2.5, fontWeight: 600, mb: 2 }}
              action={<Button size="small" color="inherit" onClick={resetAll}>Cancel</Button>}>
              Resuming parked sale <strong>{currentDraftNumber}</strong> — complete payment to finalize
            </Alert>
          )}

          <Stack spacing={2.5}>

            {/* ━━ FIND PATIENT ━━ */}
            {!patient && (
              <Fade in timeout={300}>
                <Paper elevation={0} sx={{
                  p: { xs: 2, sm: 3 }, borderRadius: 3,
                  border: `1px solid ${alpha(BRAND.teal, 0.2)}`,
                  boxShadow: `0 2px 8px ${alpha(BRAND.teal, 0.08)}`,
                  bgcolor: "#fff",
                }}>
                  <SectionHeader icon={PersonSearchIcon} title="Who's this for?"
                    subtitle="Search for a patient to begin dispensing"
                    action={
                      <Button size="small" variant="outlined" startIcon={<BookmarkIcon />}
                        onClick={() => setDraftsOpen(true)}
                        sx={{
                          textTransform: "none", borderRadius: 2,
                          borderColor: BRAND.warning, color: BRAND.warning,
                          "&:hover": { borderColor: BRAND.warning, bgcolor: alpha(BRAND.warning, 0.08) },
                        }}>
                        Open Drafts
                      </Button>
                    } />

                  <Box ref={patientAnchorRef} sx={{ position: "relative" }}>
                    <TextField value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)}
                      onFocus={() => { if (patientOptions.length > 0) setPatientPopperOpen(true); }}
                      placeholder="Type patient's name or mobile number…"
                      fullWidth autoFocus autoComplete="off"
                      InputProps={{
                        sx: { borderRadius: 2.5, fontSize: 15, py: 0.5, "& input": { py: 1.5 } },
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: patientQuery ? BRAND.teal : "action.active" }} />
                          </InputAdornment>
                        ),
                        endAdornment: patientLoading && (
                          <InputAdornment position="end"><CircularProgress size={18} sx={{ color: BRAND.teal }} /></InputAdornment>
                        ),
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      <InfoOutlinedIcon sx={{ fontSize: 13, verticalAlign: "middle", mr: 0.5 }} />
                      Type at least 2 characters to search
                    </Typography>

                    <Popper open={patientPopperOpen} anchorEl={patientAnchorRef.current}
                      placement="bottom-start" transition
                      style={{ zIndex: 1300, width: patientAnchorRef.current?.offsetWidth }}>
                      {({ TransitionProps }) => (
                        <Grow {...TransitionProps} style={{ transformOrigin: "top" }}>
                          <Paper elevation={12} sx={{
                            mt: 1, maxHeight: 360, overflow: "auto",
                            borderRadius: 2.5, border: "1px solid", borderColor: "divider",
                          }}>
                            <ClickAwayListener onClickAway={() => setPatientPopperOpen(false)}>
                              <Box>
                                <Box sx={{
                                  px: 2, py: 1, bgcolor: BRAND.tealSoft,
                                  borderBottom: 1, borderColor: alpha(BRAND.teal, 0.1),
                                }}>
                                  <Typography variant="caption" sx={{ color: BRAND.teal, fontWeight: 700 }}>
                                    {patientOptions.length} patient{patientOptions.length !== 1 ? "s" : ""} match "{patientQuery}"
                                  </Typography>
                                </Box>
                                <List dense disablePadding>
                                  {patientOptions.map((o, idx) => (
                                    <React.Fragment key={o.id}>
                                      <ListItemButton onClick={() => handlePickPatient(o)}
                                        sx={{ py: 1.5, px: 2, "&:hover": { bgcolor: BRAND.tealSoft } }}>
                                        <Avatar sx={{
                                          width: 40, height: 40, mr: 2,
                                          bgcolor: alpha(BRAND.teal, 0.12), color: BRAND.teal,
                                          fontSize: 15, fontWeight: 700,
                                        }}>
                                          {o.name?.[0]?.toUpperCase() || "?"}
                                        </Avatar>
                                        <ListItemText
                                          primary={
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                              <Typography variant="body2" fontWeight={700}>{o.name}</Typography>
                                              {o.gender && (
                                                <Chip label={o.gender} size="small"
                                                  sx={{
                                                    height: 18, fontSize: 10, textTransform: "capitalize",
                                                    bgcolor: alpha("#000", 0.06),
                                                  }} />
                                              )}
                                            </Stack>
                                          }
                                          secondary={
                                            <Typography variant="caption" color="text.secondary">
                                              {o.mobile || o.phone}
                                              {o.age && ` · ${o.age} years old`}
                                            </Typography>
                                          }
                                        />
                                        <ArrowForwardIcon sx={{ color: BRAND.teal, fontSize: 18 }} />
                                      </ListItemButton>
                                      {idx < patientOptions.length - 1 && <Divider component="li" />}
                                    </React.Fragment>
                                  ))}
                                </List>
                              </Box>
                            </ClickAwayListener>
                          </Paper>
                        </Grow>
                      )}
                    </Popper>
                  </Box>
                </Paper>
              </Fade>
            )}

            {/* ━━ PATIENT HEADER ━━ */}
            {patient && (
              <Zoom in timeout={400}>
                <Paper elevation={0} sx={{
                  p: { xs: 2, sm: 2.5 }, borderRadius: 3,
                  background: `linear-gradient(135deg, ${BRAND.teal} 0%, ${BRAND.tealLight} 100%)`,
                  color: "#fff",
                }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{
                        width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 },
                        bgcolor: "rgba(255,255,255,0.25)", color: "#fff",
                        fontWeight: 800, fontSize: { xs: 18, sm: 22 },
                        border: "2px solid rgba(255,255,255,0.3)",
                      }}>
                        {patient.name?.[0]?.toUpperCase() || "?"}
                      </Avatar>
                      <Box>
                        <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>Dispensing for</Typography>
                        <Typography variant="h5" fontWeight={800}
                          sx={{ lineHeight: 1.2, fontSize: { xs: 18, sm: 22 } }}>
                          {patient.name}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.95, mt: 0.25, fontSize: { xs: 12, sm: 14 } }}>
                          {patient.mobile || patient.phone}
                          {patient.age && ` · ${patient.age}y`}
                          {patient.gender && ` · ${patient.gender}`}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}>
                      <Button onClick={() => setDraftsOpen(true)} size="small" variant="outlined" startIcon={<BookmarkIcon />}
                        sx={{
                          color: "#fff", borderColor: "rgba(255,255,255,0.5)",
                          textTransform: "none", borderRadius: 2, flex: { xs: 1, sm: "none" },
                          "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
                        }}>Drafts</Button>
                      <Button onClick={resetAll} size="small" variant="outlined"
                        sx={{
                          color: "#fff", borderColor: "rgba(255,255,255,0.5)",
                          textTransform: "none", borderRadius: 2, flex: { xs: 1, sm: "none" },
                          "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
                        }}>Change</Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Zoom>
            )}

           
            {/* ━━ PRESCRIPTIONS ━━ */}
      {/* ━━ PRESCRIPTIONS ━━ */}
   {/* ━━ PRESCRIPTIONS ━━ */}
{patient && (
  <PrescriptionsPanel
    patient={patient}
    selectedPrescription={selectedPrescription}
    onUsePrescription={(rx) => loadPrescription(rx)}
    onChange={() => setSelectedPrescription(null)}
  />
)}

           

            {/* ━━ MEDICINE SEARCH ━━ */}
            {patient && (
              <Paper elevation={0} sx={{
                p: { xs: 2, sm: 2.5 }, borderRadius: 3,
                border: "1px solid", borderColor: "divider", bgcolor: "#fff",
              }}>
                <SectionHeader icon={LocalPharmacyOutlinedIcon}
                  title={selectedPrescription ? "Add Extra Medicines" : "Add Medicines"}
                  subtitle="See stock + batches before you pick" />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Box ref={medicineAnchorRef} sx={{ position: "relative", flex: 1 }}>
                    <TextField value={medicineQuery}
                      onChange={(e) => setMedicineQuery(e.target.value)}
                      onFocus={() => { if (medicineOptions.length > 0) setMedicinePopperOpen(true); }}
                      placeholder="Type a medicine name…"
                      fullWidth autoComplete="off"
                      InputProps={{
                        sx: { borderRadius: 2.5, fontSize: 15, "& input": { py: 1.5 } },
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: medicineQuery ? BRAND.teal : "action.active" }} />
                          </InputAdornment>
                        ),
                        endAdornment: medicineLoading && (
                          <InputAdornment position="end">
                            <CircularProgress size={18} sx={{ color: BRAND.teal }} />
                          </InputAdornment>
                        ),
                      }} />

                    <Popper open={medicinePopperOpen} anchorEl={medicineAnchorRef.current}
                      placement="bottom-start" transition
                      style={{ zIndex: 1300, width: medicineAnchorRef.current?.offsetWidth }}>
                      {({ TransitionProps }) => (
                        <Grow {...TransitionProps} style={{ transformOrigin: "top" }}>
                          <Paper elevation={12} sx={{
                            mt: 1, maxHeight: 400, overflow: "auto",
                            borderRadius: 2.5, border: "1px solid", borderColor: "divider",
                          }}>
                            <ClickAwayListener onClickAway={() => setMedicinePopperOpen(false)}>
                              <List dense disablePadding>
                                {medicineOptions.map((o, idx) => {
                                  const outOfStock = o.totalStock === 0;
                                  const lowStock = o.totalStock > 0 && o.totalStock <= 10;
                                  return (
                                    <React.Fragment key={o.id}>
                                      <ListItemButton onClick={() => openBatchPicker(o)}
                                        disabled={outOfStock}
                                        sx={{ py: 1.5, px: 2, "&:hover": { bgcolor: BRAND.tealSoft } }}>
                                        <Box sx={{
                                          width: 40, height: 40, borderRadius: 1.5, mr: 2,
                                          bgcolor: alpha(BRAND.teal, 0.1), color: BRAND.teal,
                                          display: "grid", placeItems: "center", flexShrink: 0,
                                        }}>
                                          <LocalPharmacyOutlinedIcon />
                                        </Box>
                                        <ListItemText
                                          primary={
                                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                              <Typography variant="body2" fontWeight={700}>
                                                {o.medicine_name}
                                              </Typography>
                                              {outOfStock ? (
                                                <Chip label="Out of stock" size="small"
                                                  sx={{
                                                    height: 20, fontSize: 10, fontWeight: 700,
                                                    bgcolor: alpha(BRAND.danger, 0.1), color: BRAND.danger,
                                                  }} />
                                              ) : (
                                                <Chip
                                                  label={`${o.totalStock} in stock`}
                                                  size="small"
                                                  sx={{
                                                    height: 20, fontSize: 10, fontWeight: 700,
                                                    bgcolor: lowStock ? alpha(BRAND.warning, 0.15) : alpha(BRAND.success, 0.15),
                                                    color: lowStock ? "#B47900" : BRAND.success,
                                                  }}
                                                />
                                              )}
                                            </Stack>
                                          }
                                          secondary={
                                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                                              <Typography variant="caption" color="text.secondary">
                                                {o.manufacturer}
                                              </Typography>
                                              {o.batches && o.batches.length > 0 && (
                                                <Chip
                                                  icon={<LayersOutlinedIcon sx={{ fontSize: 12 }} />}
                                                  label={`${o.batches.length} batch${o.batches.length !== 1 ? "es" : ""}`}
                                                  size="small"
                                                  sx={{
                                                    height: 18, fontSize: 10, fontWeight: 600,
                                                    bgcolor: alpha(BRAND.teal, 0.08), color: BRAND.teal,
                                                  }}
                                                />
                                              )}
                                              {o.selling_price && (
                                                <Typography variant="caption" sx={{ color: BRAND.teal, fontWeight: 700 }}>
                                                  from ₹{Number(o.batches?.[0]?.selling_price || o.selling_price).toFixed(2)}
                                                </Typography>
                                              )}
                                            </Stack>
                                          }

                                           primaryTypographyProps={{ component: "div" }}  
                                            
                                           secondaryTypographyProps={{ component: "div" }}  
                                        />
                                        {!outOfStock && (
                                          <ArrowForwardIcon sx={{ color: BRAND.teal, fontSize: 18, flexShrink: 0 }} />
                                        )}
                                      </ListItemButton>
                                      {idx < medicineOptions.length - 1 && <Divider component="li" />}
                                    </React.Fragment>
                                  );
                                })}
                              </List>
                            </ClickAwayListener>
                          </Paper>
                        </Grow>
                      )}
                    </Popper>
                  </Box>

                  <Button variant="outlined" startIcon={<SwapHorizIcon />} onClick={openSubstituteDialog}
                    sx={{
                      textTransform: "none", borderRadius: 2.5, fontWeight: 700,
                      borderColor: BRAND.warning, color: BRAND.warning, px: 2.5,
                      minWidth: { xs: "100%", sm: "auto" },
                      "&:hover": { borderColor: "#d97706", bgcolor: alpha(BRAND.warning, 0.08) },
                    }}>Find Substitute</Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
                  <InfoOutlinedIcon sx={{ fontSize: 13, verticalAlign: "middle", mr: 0.5 }} />
                  Click a medicine to see all its batches with expiry and stock
                </Typography>
              </Paper>
            )}

            {patient && items.length === 0 && (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "#fff" }}>
                <EmptyState icon={InventoryOutlinedIcon}
                  title="Nothing in the basket yet"
                  hint="Pick a prescription above, or search / find a substitute to add medicines." />
              </Paper>
            )}

            {/* ━━ CART ━━ */}
            {items.length > 0 && (
              <Fade in timeout={400}>
                <Paper elevation={0} sx={{
                  borderRadius: 3, overflow: "hidden",
                  border: `1px solid ${alpha(BRAND.teal, 0.2)}`,
                  boxShadow: `0 2px 12px ${alpha(BRAND.teal, 0.08)}`, bgcolor: "#fff",
                }}>
                  <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider", bgcolor: BRAND.tealSoft }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <ReceiptLongOutlinedIcon sx={{ color: BRAND.teal }} />
                        <Box>
                          <Typography fontWeight={700} sx={{ fontSize: 15 }}>Medicines to Dispense</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {items.length} {items.length === 1 ? "item" : "items"} · {totalUnits} units
                          </Typography>
                        </Box>
                      </Stack>
                      <Button size="small" onClick={() => setItems([])}
                        sx={{
                          textTransform: "none", color: "text.secondary",
                          "&:hover": { color: BRAND.danger, bgcolor: alpha(BRAND.danger, 0.08) },
                        }}>Clear all</Button>
                    </Stack>
                  </Box>

                  {/* MOBILE CARDS */}
                  <Box sx={{ display: { xs: "block", md: "none" } }}>
                    <Stack divider={<Divider />}>
                      {items.map((item, idx) => {
                        const lineNet = item.unit_price * item.quantity - (Number(item.discount_amount) || 0);
                        const lineTotal = lineNet + (lineNet * (Number(item.gst_percentage) || 0)) / 100;
                        return (
                          <Box key={idx} sx={{ p: 2 }}>
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                              <Box sx={{
                                width: 36, height: 36, borderRadius: 1.5, flexShrink: 0,
                                bgcolor: alpha(BRAND.teal, 0.1), color: BRAND.teal,
                                display: "grid", placeItems: "center",
                              }}>
                                <LocalPharmacyOutlinedIcon fontSize="small" />
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                  <Typography variant="body2" fontWeight={700}>{item.medicine_name}</Typography>
                                  {item.from_prescription && (
                                    <Chip label="Rx" size="small" sx={{
                                      height: 18, fontSize: 10, fontWeight: 700,
                                      bgcolor: alpha(BRAND.warning, 0.15), color: "#B47900",
                                    }} />
                                  )}
                                  {item.substituted_for && (
                                    <Chip label={`Sub for ${item.substituted_for}`} size="small" sx={{
                                      height: 18, fontSize: 10, fontWeight: 700,
                                      bgcolor: alpha(BRAND.warning, 0.15), color: "#92400e",
                                    }} />
                                  )}
                                </Stack>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Batch {item.batch_number}
                                  {item.expiry_date && ` · Exp ${formatExpiry(item.expiry_date)}`}
                                  {` · ${item.available} available`}
                                </Typography>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                                  <QuantityStepper value={item.quantity} max={item.available}
                                    onChange={(v) => updateQty(idx, v)} size="small" />
                                  <Box sx={{ textAlign: "right" }}>
                                    <Typography variant="caption" color="text.secondary">
                                      ₹{item.unit_price.toFixed(2)} each
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} sx={{ color: BRAND.teal }}>
                                      ₹{lineTotal.toFixed(2)}
                                    </Typography>
                                  </Box>
                                </Stack>

                                {/* ⭐ NEW — per-item Disc + GST */}
                                <ItemAdjustRow
                                  item={item}
                                  idx={idx}
                                  overallGstActive={overallGstActive}
                                  onDiscount={updateItemDiscount}
                                  onGst={updateItemGst}
                                />
                              </Box>
                              <IconButton size="small" onClick={() => removeItem(idx)}
                                sx={{ color: "text.secondary", "&:hover": { color: BRAND.danger } }}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>

                  {/* DESKTOP TABLE */}
                  <Box sx={{ display: { xs: "none", md: "block" } }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headCell}>Medicine · Batch</TableCell>
                          <TableCell sx={headCell}>Avail</TableCell>
                          <TableCell sx={{ ...headCell, textAlign: "center" }}>Qty</TableCell>
                          <TableCell align="right" sx={headCell}>Price</TableCell>
                          <TableCell align="center" sx={headCell}>Disc ₹</TableCell>{/* ⭐ NEW */}
                          <TableCell align="center" sx={headCell}>GST %</TableCell>{/* ⭐ NEW */}
                          <TableCell align="right" sx={headCell}>Total</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item, idx) => {
                          const lineMax = item.unit_price * item.quantity;
                          const lineNet = lineMax - (Number(item.discount_amount) || 0);
                          const lineTotal = lineNet + (lineNet * (Number(item.gst_percentage) || 0)) / 100;
                          const lowStock = item.available <= 5;
                          return (
                            <TableRow key={idx} hover>
                              <TableCell>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                  <Box sx={{
                                    width: 32, height: 32, borderRadius: 1.5,
                                    bgcolor: alpha(BRAND.teal, 0.08), color: BRAND.teal,
                                    display: "grid", placeItems: "center", flexShrink: 0,
                                  }}>
                                    <LocalPharmacyOutlinedIcon sx={{ fontSize: 18 }} />
                                  </Box>
                                  <Box>
                                    <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                                      <Typography variant="body2" fontWeight={600}>{item.medicine_name}</Typography>
                                      {item.from_prescription && (
                                        <Chip label="Rx" size="small" sx={{
                                          height: 16, fontSize: 9, fontWeight: 700,
                                          bgcolor: alpha(BRAND.warning, 0.15), color: "#B47900",
                                        }} />
                                      )}
                                      {item.substituted_for && (
                                        <Chip label="Sub" size="small" sx={{
                                          height: 16, fontSize: 9, fontWeight: 700,
                                          bgcolor: alpha(BRAND.warning, 0.15), color: "#92400e",
                                        }} />
                                      )}
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                      Batch {item.batch_number}
                                      {item.expiry_date && ` · Exp ${formatExpiry(item.expiry_date)}`}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Chip label={`${item.available}`} size="small"
                                  sx={{
                                    bgcolor: lowStock ? alpha(BRAND.warning, 0.1) : alpha(BRAND.success, 0.1),
                                    color: lowStock ? "#B47900" : BRAND.success,
                                    fontWeight: 600, height: 22,
                                  }} />
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: "flex", justifyContent: "center" }}>
                                  <QuantityStepper value={item.quantity} max={item.available}
                                    onChange={(v) => updateQty(idx, v)} size="small" />
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                  ₹{item.unit_price.toFixed(2)}
                                </Typography>
                              </TableCell>

                              {/* ⭐ NEW — Discount column */}
                              <TableCell align="center">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.discount_amount || ""}
                                  onChange={(e) => updateItemDiscount(idx, e.target.value)}
                                  placeholder="0"
                                  inputProps={{ min: 0, max: lineMax, step: "0.01" }}
                                  sx={{ width: 90, "& input": { textAlign: "center", py: 0.75 } }}
                                  InputProps={{
                                    sx: { fontSize: 13, bgcolor: "#fff" },
                                    startAdornment: (
                                      <InputAdornment position="start" sx={{ "& p": { fontSize: 11 } }}>₹</InputAdornment>
                                    ),
                                  }}
                                />
                              </TableCell>

                              {/* ⭐ NEW — GST column */}
                              <TableCell align="center">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.gst_percentage || ""}
                                  onChange={(e) => updateItemGst(idx, e.target.value)}
                                  placeholder="0"
                                  disabled={overallGstActive}
                                  inputProps={{ min: 0, max: 100, step: "0.1" }}
                                  sx={{ width: 80, "& input": { textAlign: "center", py: 0.75 } }}
                                  InputProps={{
                                    sx: { fontSize: 13, bgcolor: "#fff" },
                                    endAdornment: (
                                      <InputAdornment position="end" sx={{ "& p": { fontSize: 11 } }}>%</InputAdornment>
                                    ),
                                  }}
                                />
                              </TableCell>

                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={700}
                                  sx={{ fontVariantNumeric: "tabular-nums", color: BRAND.teal }}>
                                  ₹{lineTotal.toFixed(2)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Remove">
                                  <IconButton size="small" onClick={() => removeItem(idx)}
                                    sx={{
                                      color: "text.secondary",
                                      "&:hover": { color: BRAND.danger, bgcolor: alpha(BRAND.danger, 0.08) },
                                    }}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              </Fade>
            )}

            {/* ━━ PAYMENT SUMMARY ━━ */}
            {items.length > 0 && (
              <Fade in timeout={400}>
                <Paper elevation={0} sx={{
                  borderRadius: 3, overflow: "hidden",
                  border: `1px solid ${alpha(BRAND.teal, 0.2)}`,
                  bgcolor: "#fff",
                }}>
                  <Box sx={{ p: 2.5, borderBottom: 1, borderColor: "divider", bgcolor: alpha(BRAND.teal, 0.03) }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box sx={{
                        width: 40, height: 40, borderRadius: "12px",
                        bgcolor: alpha(BRAND.teal, 0.1), color: BRAND.teal,
                        display: "grid", placeItems: "center",
                      }}>
                        <PointOfSaleIcon />
                      </Box>
                      <Box>
                        <Typography fontWeight={700} fontSize={16}>Payment Summary</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Bill-level discount & GST applied on top of per-item values
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                 {/* Drop-in replacement for your <Box sx={{ p: ... }}> block.
    Uses the same state, BRAND tokens, <Row/> and icons you already have. */}

<Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
  <Stack spacing={{ xs: 2, sm: 2.5 }}>

    {/* ─── DISCOUNT + GST (single row) ─── */}
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: { xs: 1, sm: 2 },
        // very small phones (<360px): stack so nothing gets squeezed
        "@media (max-width:359px)": { gridTemplateColumns: "minmax(0, 1fr)" },
      }}
    >
      {/* Bill discount */}
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
          <LocalOfferOutlinedIcon sx={{ fontSize: 16, color: BRAND.warning }} />
          <Typography variant="body2" fontWeight={700} noWrap>
            Discount
          </Typography>
        </Stack>

        <TextField
          size="small"
          type="number"
          fullWidth
          value={discountValue === 0 ? "" : discountValue}
          onChange={(e) =>
            setDiscountValue(
              Math.max(
                0,
                Math.min(
                  discountType === "percent" ? 100 : Number.MAX_SAFE_INTEGER,
                  Number(e.target.value) || 0
                )
              )
            )
          }
          placeholder="0"
          inputProps={{
            min: 0,
            step: discountType === "percent" ? 1 : 10,
            max: discountType === "percent" ? 100 : undefined,
            inputMode: "decimal",
            "aria-label": "Bill discount value",
            style: { fontWeight: 600 },
          }}
          InputProps={{
            sx: { borderRadius: 2, pr: 0.5, minHeight: 44 },
            // ₹ / % switch lives inside the field to save space
            endAdornment: (
              <InputAdornment position="end" sx={{ ml: 0 }}>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={discountType}
                  onChange={(_, v) => v && setDiscountType(v)}
                  aria-label="Discount type"
                  sx={{
                    "& .MuiToggleButton-root": {
                      px: 1,
                      py: 0.25,
                      minWidth: 34,
                      minHeight: 32,
                      border: 0,
                      borderRadius: "8px !important",
                      fontWeight: 800,
                      fontSize: 14,
                      color: "text.secondary",
                      "&.Mui-selected": {
                        bgcolor: BRAND.teal,
                        color: "#fff",
                        "&:hover": { bgcolor: "#0d5a54" },
                      },
                    },
                  }}
                >
                  <ToggleButton value="amount" aria-label="Fixed amount">₹</ToggleButton>
                  <ToggleButton value="percent" aria-label="Percent">%</ToggleButton>
                </ToggleButtonGroup>
              </InputAdornment>
            ),
          }}
          helperText={
            discountAmount > 0 ? (
              <Box component="span" sx={{ color: "#B47900", fontWeight: 700 }}>
                −₹{discountAmount.toFixed(2)}
              </Box>
            ) : (
              " "
            )
          }
          FormHelperTextProps={{ sx: { mx: 0.5, mt: 0.5 } }}
        />
      </Box>

      {/* Overall GST */}
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
          <ReceiptLongOutlinedIcon sx={{ fontSize: 16, color: BRAND.teal }} />
          <Typography variant="body2" fontWeight={700} noWrap>
            GST
          </Typography>
        </Stack>

        <TextField
          size="small"
          type="number"
          fullWidth
          value={saleGstPercent === 0 ? "" : saleGstPercent}
          onChange={(e) =>
            setSaleGstPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
          }
          placeholder="Per item"
          inputProps={{
            min: 0,
            max: 100,
            step: 1,
            inputMode: "decimal",
            "aria-label": "Overall GST percent",
            style: { fontWeight: 600 },
          }}
          InputProps={{
            sx: { borderRadius: 2, minHeight: 44 },
            endAdornment: (
              <InputAdornment position="end">
                <PercentIcon sx={{ fontSize: 18, color: BRAND.teal }} />
              </InputAdornment>
            ),
          }}
          helperText={
            overallGstActive ? (
              <Box component="span" sx={{ color: BRAND.teal, fontWeight: 700 }}>
                {saleGstPercent}% on whole bill
                {gstAmount > 0 ? ` · +₹${gstAmount.toFixed(2)}` : ""}
              </Box>
            ) : (
              "Empty = per-item GST"
            )
          }
          FormHelperTextProps={{ sx: { mx: 0.5, mt: 0.5 } }}
        />
      </Box>
    </Box>

    {/* ─── BREAKDOWN ─── */}
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        bgcolor: alpha(BRAND.teal, 0.04),
        border: `1px solid ${alpha(BRAND.teal, 0.12)}`,
      }}
    >
      <Stack spacing={0.75}>
        <Row label="Items subtotal" value={`₹${itemsGross.toFixed(2)}`} />

        {perItemDiscountTotal > 0 && (
          <Row
            label="Item discounts"
            value={`−₹${perItemDiscountTotal.toFixed(2)}`}
            highlight={BRAND.success}
          />
        )}

        {perItemDiscountTotal > 0 && (
          <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />
        )}

        {discountAmount > 0 && (
          <Row
            label={`Bill discount${discountType === "percent" ? ` (${discountValue}%)` : ""}`}
            value={`−₹${discountAmount.toFixed(2)}`}
            highlight={BRAND.warning}
          />
        )}

        {gstAmount > 0 && (
          <Row
            label={overallGstActive ? `GST (${saleGstPercent}%)` : "GST (per item)"}
            value={`+₹${gstAmount.toFixed(2)}`}
          />
        )}

        <Divider sx={{ my: 0.5 }} />

        <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
          <Typography fontWeight={800} sx={{ fontSize: { xs: 15, sm: 16 } }}>
            Grand Total
          </Typography>
          <Typography
            fontWeight={900}
            sx={{
              color: BRAND.teal,
              fontSize: { xs: 22, sm: 26 },
              lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
              wordBreak: "break-all",
              textAlign: "right",
            }}
          >
            ₹{grandTotal.toFixed(2)}
          </Typography>
        </Stack>

        {discountAmount + perItemDiscountTotal > 0 && (
          <Chip
            size="small"
            label={`Customer saves ₹${(discountAmount + perItemDiscountTotal).toFixed(2)}`}
            sx={{
              alignSelf: "flex-end",
              height: 24,
              fontSize: 12,
              fontWeight: 700,
              bgcolor: alpha(BRAND.success, 0.12),
              color: BRAND.success,
            }}
          />
        )}
      </Stack>
    </Box>

    {/* ─── NOTES ─── */}
    <TextField
      label="Notes (optional)"
      placeholder="Any special instructions?"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      fullWidth
      multiline
      minRows={2}
      maxRows={5}
      size="small"
      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
    />
  </Stack>
</Box>
                </Paper>
              </Fade>
            )}

          </Stack>
        </Box>
      </Box>

      {/* ═══ STICKY BOTTOM BAR ═══ */}
      {items.length > 0 && (
        <Paper elevation={8}
          sx={{
            position: "sticky", bottom: 0, zIndex: 1100,
            borderRadius: 0, borderTop: "1px solid",
            borderColor: alpha(BRAND.teal, 0.2),
            bgcolor: "#fff",
            py: { xs: 1.5, sm: 2 }, px: { xs: 1.5, sm: 3 },
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
          }}>
          <Box sx={{ maxWidth: 960, mx: "auto" }}>
            <Stack direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between" spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={2.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.6}>ITEMS</Typography>
                  <Typography fontWeight={700} fontSize={15}>{items.length} · {totalUnits} units</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.6}>TOTAL PAYABLE</Typography>
                  <Typography fontWeight={800} fontSize={{ xs: 20, sm: 24 }} color={BRAND.teal} lineHeight={1}>
                    ₹{grandTotal.toFixed(2)}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                {/* Park writes a draft, so it takes the same permission as billing —
                    see the matching note in POS.js. */}
                {canCreateSale && patient && (
                  <Button variant="outlined" size={isXs ? "medium" : "large"}
                    disabled={!!branchBlock}
                    startIcon={<PauseCircleOutlineIcon />} onClick={() => setParkDialogOpen(true)}
                    sx={{
                      textTransform: "none", borderRadius: 2.5, fontWeight: 700,
                      borderColor: BRAND.warning, color: BRAND.warning,
                      "&:hover": { borderColor: "#d97706", bgcolor: alpha(BRAND.warning, 0.08) },
                    }}>Park</Button>
                )}
                {canCreateSale && (
                  <Button variant="contained" size={isXs ? "medium" : "large"}
                    startIcon={<PointOfSaleIcon />} disabled={!canCheckout || !!branchBlock}
                    onClick={() => setCheckoutOpen(true)}
                    sx={{
                      bgcolor: BRAND.teal,
                      px: { xs: 2.5, sm: 4 }, py: { xs: 1, sm: 1.3 },
                      fontSize: { xs: 14, sm: 15 }, fontWeight: 700,
                      textTransform: "none", borderRadius: 2.5,
                      boxShadow: `0 4px 14px ${alpha(BRAND.teal, 0.4)}`,
                      "&:hover": { bgcolor: "#0d5a54" },
                      "&.Mui-disabled": { bgcolor: alpha("#000", 0.08) },
                    }}>
                    Pay ₹{grandTotal.toFixed(2)}
                  </Button>
                )}
              </Stack>
            </Stack>

            {/* Why Pay is held, said here rather than at the server's 400/403 */}
            {branchBlock && (
              <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2, fontSize: 13 }}>
                {branchBlock}
              </Alert>
            )}

            {!canCreateSale && (
              <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2, fontSize: 13 }}>
                You can view this patient's prescriptions but not dispense or bill. Ask your
                admin for "Create Sale" (pharmacy.sales.create).
              </Alert>
            )}
          </Box>
        </Paper>
      )}

      {/* ═══ BATCH PICKER DIALOG ═══ */}
      <Dialog
        open={batchPickerOpen}
        onClose={() => setBatchPickerOpen(false)}
        maxWidth="sm" fullWidth fullScreen={isXs}
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
        sx={{ "& .MuiDialog-container": { alignItems: "center", justifyContent: "center" } }}
      >
        <DialogTitle sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid", borderColor: "divider",
          bgcolor: BRAND.tealSoft, py: 2,
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: BRAND.teal, width: 40, height: 40 }}>
              <LayersOutlinedIcon />
            </Avatar>
            <Box>
              <Typography fontWeight={700} fontSize={16}>Choose a batch</Typography>
              <Typography variant="caption" color="text.secondary">
                {batchPickerMedicine?.medicine_name} · {batchPickerBatches.length} batch{batchPickerBatches.length !== 1 ? "es" : ""} available
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setBatchPickerOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{
            p: 1.5, mb: 2, borderRadius: 2,
            bgcolor: alpha(BRAND.teal, 0.04),
            border: `1px dashed ${alpha(BRAND.teal, 0.2)}`,
          }}>
            <Typography variant="caption" color="text.secondary">
              <InfoOutlinedIcon sx={{ fontSize: 13, verticalAlign: "middle", mr: 0.5 }} />
              Batches sorted by nearest expiry first (FEFO). Pick the one you want to dispense from.
            </Typography>
          </Box>

          {batchPickerBatches.length === 0 ? (
            <EmptyState icon={InventoryOutlinedIcon}
              title="No batches available"
              hint="This medicine has no active stock. Try Find Substitute above." />
          ) : (
            <Stack spacing={1.25}>
              {batchPickerBatches.map((b, idx) => {
                const months = monthsUntil(b.expiry_date);
                const expiringSoon = months !== null && months < 6;
                const lowStock = b.quantity_available <= 10;
                const isFefo = idx === 0;
                return (
                  <Paper key={b.id} elevation={0}
                    sx={{
                      p: 2, borderRadius: 2.5,
                      border: "1.5px solid", borderColor: isFefo ? alpha(BRAND.success, 0.5) : "divider",
                      bgcolor: isFefo ? alpha(BRAND.success, 0.03) : "#fff",
                      transition: "all .2s",
                      "&:hover": {
                        borderColor: BRAND.teal,
                        boxShadow: `0 2px 10px ${alpha(BRAND.teal, 0.15)}`,
                      },
                    }}>
                    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={2}>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                          <Typography fontWeight={700} fontSize={15}>Batch {b.batch_number}</Typography>
                          {isFefo && (
                            <Chip label="FEFO · Suggested" size="small"
                              sx={{
                                height: 20, fontSize: 10, fontWeight: 700,
                                bgcolor: alpha(BRAND.success, 0.15), color: BRAND.success,
                              }} />
                          )}
                          {expiringSoon && (
                            <Chip label={`Expires in ${months} mo`} size="small"
                              sx={{
                                height: 20, fontSize: 10, fontWeight: 700,
                                bgcolor: alpha(BRAND.warning, 0.15), color: "#B47900",
                              }} />
                          )}
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 0.75 }} flexWrap="wrap">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <EventIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary">
                              Exp {formatExpiry(b.expiry_date)}
                            </Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <InventoryOutlinedIcon sx={{ fontSize: 15, color: lowStock ? BRAND.warning : BRAND.success }} />
                            <Typography variant="caption" sx={{ color: lowStock ? "#B47900" : BRAND.success, fontWeight: 600 }}>
                              {b.quantity_available} available
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                        <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                          <Typography variant="caption" color="text.secondary">Price</Typography>
                          <Typography fontWeight={800} fontSize={16} color={BRAND.teal}>
                            ₹{Number(b.selling_price).toFixed(2)}
                          </Typography>
                        </Box>
                        <Button variant="contained" size="medium"
                          startIcon={<AddCircleOutlineIcon />}
                          onClick={() => addBatchToCart(batchPickerMedicine, b)}
                          sx={{
                            bgcolor: BRAND.teal, textTransform: "none",
                            fontWeight: 700, px: 2, borderRadius: 2,
                            boxShadow: `0 2px 8px ${alpha(BRAND.teal, 0.3)}`,
                            "&:hover": { bgcolor: "#0d5a54" },
                          }}>
                          Add
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ CHECKOUT DIALOG ═══ */}
      {checkoutCustomer && (
        <Dialog
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          maxWidth="md" fullWidth fullScreen={isXs}
          scroll="paper"
          PaperProps={{
            sx: {
              borderRadius: { xs: 0, sm: 3 },
              maxHeight: { xs: "100vh", sm: "90vh" },
              m: { xs: 0, sm: 2 },
            },
          }}
          sx={{ "& .MuiDialog-container": { alignItems: "center", justifyContent: "center" } }}
        >
          <CheckoutDialog
            open={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            customer={checkoutCustomer}
            items={items}
            notes={notes}
            subtotal={netAfterDiscount}
            taxAmount={gstAmount}
            grandTotal={grandTotal}
            discountAmount={discountAmount /* order-level only; line discounts travel on the items */}
            overallGstPercent={Number(saleGstPercent) || 0}
            discountType={discountType}
            discountValue={discountValue}
            saleGstPercent={saleGstPercent}
            currentDraftId={currentDraftId}
            draftKind="dispensing"
            onSuccess={onCheckoutSuccess}
            embedded
          />
        </Dialog>
      )}

      {/* ═══ SUBSTITUTE DIALOG ═══ */}
      <Dialog
        open={substituteDialogOpen}
        onClose={() => {
          setSubstituteDialogOpen(false);
          setSubstituteResults([]); setSubstituteRequested(null); setSubstituteSearchInput("");
        }}
        maxWidth="md" fullWidth fullScreen={isXs}
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
        sx={{ "& .MuiDialog-container": { alignItems: "center", justifyContent: "center" } }}
      >
        <DialogTitle sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid", borderColor: "divider",
          bgcolor: BRAND.warningSoft, pb: 2,
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: BRAND.warning, width: 40, height: 40 }}>
              <SwapHorizIcon />
            </Avatar>
            <Box>
              <Typography fontWeight={700} fontSize={16}>Find Substitute Medicine</Typography>
              <Typography variant="caption" color="text.secondary">
                In-stock medicines with the same composition
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => {
            setSubstituteDialogOpen(false);
            setSubstituteResults([]); setSubstituteRequested(null); setSubstituteSearchInput("");
          }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField autoFocus fullWidth size="medium"
            label="Medicine name" placeholder="e.g. Crocin 500mg, Paracetamol"
            value={substituteSearchInput}
            onChange={(e) => { setSubstituteSearchInput(e.target.value); searchForSubstitute(e.target.value); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchIcon sx={{ color: BRAND.warning }} /></InputAdornment>
              ),
              endAdornment: substituteLoading && (
                <InputAdornment position="end"><CircularProgress size={18} /></InputAdornment>
              ),
            }}
            sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />

          {substituteRequested && (
            <Paper elevation={0} sx={{
              p: 2, mb: 2, borderRadius: 2,
              bgcolor: BRAND.warningSoft,
              border: `1px solid ${alpha(BRAND.warning, 0.3)}`,
            }}>
              <Typography fontWeight={700} fontSize={14} color="#92400e">
                Looking for: {substituteRequested.name}
              </Typography>
              {substituteRequested.composition && (
                <Typography variant="caption" sx={{ color: "#92400e" }}>
                  Composition: {substituteRequested.composition}
                </Typography>
              )}
            </Paper>
          )}

          {substituteLoading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress sx={{ color: BRAND.warning }} />
            </Box>
          ) : substituteResults.length > 0 ? (
            <Stack spacing={1.5}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.6}>
                {substituteResults.length} IN-STOCK ALTERNATIVE{substituteResults.length !== 1 ? "S" : ""}
              </Typography>
              {substituteResults.map((sub) => (
                <Paper key={sub.pharmacy_medicine_id} elevation={0}
                  sx={{
                    p: 2, borderRadius: 2.5, border: "1px solid", borderColor: "divider",
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr auto auto" },
                    gap: 2, alignItems: "center",
                    "&:hover": {
                      borderColor: BRAND.warning,
                      boxShadow: `0 2px 10px ${alpha(BRAND.warning, 0.25)}`,
                    },
                  }}>
                  <Box>
                    <Typography fontWeight={700} fontSize={15}>{sub.medicine_name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {sub.manufacturer} · {sub.pack_size || "—"}
                    </Typography>
                    {sub.nearest_expiry && (
                      <Typography variant="caption" color="text.secondary">
                        Nearest expiry: {new Date(sub.nearest_expiry).toLocaleDateString("en-IN")}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                    <Typography fontWeight={700} fontSize={15}>₹{Number(sub.selling_price).toFixed(2)}</Typography>
                    <Typography variant="caption" color="text.secondary">{sub.total_available} in stock</Typography>
                  </Box>
                  <Button variant="contained" size="medium"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => addSubstituteFromDialog(sub)}
                    sx={{
                      bgcolor: BRAND.warning, textTransform: "none", fontWeight: 700, px: 2.5,
                      borderRadius: 2, boxShadow: `0 2px 8px ${alpha(BRAND.warning, 0.3)}`,
                      "&:hover": { bgcolor: "#d97706" },
                    }}>Add to cart</Button>
                </Paper>
              ))}
            </Stack>
          ) : substituteSearchInput && substituteSearchInput.length >= 2 ? (
            <EmptyState icon={InventoryOutlinedIcon}
              title="No substitutes available"
              hint="You don't stock any medicine with the same composition." />
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary" fontSize={14}>
                Type a medicine name to search for substitutes
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ PARK DIALOG ═══ */}
      <Dialog open={parkDialogOpen} onClose={() => setParkDialogOpen(false)}
        maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}
        sx={{ "& .MuiDialog-container": { alignItems: "center", justifyContent: "center" } }}>
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ bgcolor: alpha(BRAND.warning, 0.15), color: BRAND.warning, width: 36, height: 36 }}>
            <PauseCircleOutlineIcon />
          </Avatar>
          Park this sale?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save for later — resume anytime from "Open Drafts."
          </Typography>
          <Box sx={{
            p: 2, mb: 2, borderRadius: 2,
            bgcolor: alpha(BRAND.teal, 0.04),
            border: `1px solid ${alpha(BRAND.teal, 0.1)}`,
          }}>
            <Typography variant="caption" color="text.secondary">Patient</Typography>
            <Typography variant="body2" fontWeight={700}>
              {patient?.name} · {patient?.mobile || patient?.phone}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {items.length} items · ₹{grandTotal.toFixed(2)}
            </Typography>
          </Box>
          <TextField fullWidth multiline rows={2}
            label="Note (optional)" value={parkNotes}
            onChange={(e) => setParkNotes(e.target.value)}
            placeholder="e.g. Will come back after lunch" autoFocus />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setParkDialogOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={handleParkSale} disabled={parking}
            startIcon={parking ? <CircularProgress size={16} color="inherit" /> : <BookmarkIcon />}
            sx={{ bgcolor: BRAND.warning, textTransform: "none", fontWeight: 700, "&:hover": { bgcolor: "#d97706" } }}>
            {parking ? "Parking…" : "Park Sale"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ DRAFTS DIALOG ═══ */}
      <Dialog open={draftsOpen} onClose={() => setDraftsOpen(false)}
        maxWidth="sm" fullWidth fullScreen={isXs}
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
        sx={{ "& .MuiDialog-container": { alignItems: "center", justifyContent: "center" } }}>
        <DialogTitle sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: 1, borderColor: "divider",
        }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BookmarkIcon sx={{ color: BRAND.warning }} />
            <Typography variant="h6" fontWeight={700}>Parked Sales</Typography>
            {drafts.length > 0 && (
              <Chip label={drafts.length} size="small"
                sx={{ bgcolor: BRAND.warning, color: "#fff", fontWeight: 700 }} />
            )}
          </Stack>
          <IconButton onClick={() => setDraftsOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {loadingDrafts ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress sx={{ color: BRAND.warning }} />
            </Box>
          ) : drafts.length === 0 ? (
            <EmptyState icon={BookmarkIcon} title="No parked sales"
              hint="Use the 'Park' button on an open cart to save it for later." />
          ) : (
            <Stack spacing={1.5}>
              {drafts.map((d) => (
                <Paper key={d.id} elevation={0}
                  sx={{
                    p: 2, borderRadius: 2.5, cursor: "pointer",
                    border: "1px solid", borderColor: "divider",
                    "&:hover": {
                      borderColor: BRAND.warning,
                      boxShadow: `0 2px 10px ${alpha(BRAND.warning, 0.2)}`,
                    },
                  }}
                  onClick={() => handleResumeDraft(d.id)}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }} flexWrap="wrap">
                        <Chip label={d.dispensing_number} size="small"
                          sx={{ bgcolor: alpha(BRAND.warning, 0.15), color: "#92400e", fontWeight: 700 }} />
                        <Typography fontWeight={600}>{d.patient_name || "Walk-in"}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {d.patient_mobile} · {d.items_count} items · parked {d.parked_minutes_ago || 0}m ago
                      </Typography>
                      {d.notes && (
                        <Typography variant="caption" display="block"
                          sx={{ mt: 0.5, fontStyle: "italic", color: "text.secondary" }}>
                          "{d.notes}"
                        </Typography>
                      )}
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.5}>
                      <Typography fontWeight={700} fontSize={16} color={BRAND.teal}>
                        ₹{Number(d.grand_total || 0).toFixed(2)}
                      </Typography>
                      <IconButton size="small" color="error"
                        onClick={(e) => { e.stopPropagation(); handleDiscardDraft(d.id, d.dispensing_number); }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })} variant="filled"
          sx={{ borderRadius: 2, boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ━━ PRESCRIPTIONS (handled by PrescriptionsPanel) ━━ */}
      
    </Box>
  );
}

const headCell = {
  fontSize: 11, fontWeight: 700, color: "text.secondary",
  letterSpacing: ".06em", textTransform: "uppercase",
  bgcolor: alpha("#f8fafc", 0.8),
};

const Row = ({ label, value, highlight }) => (
  <Stack direction="row" justifyContent="space-between">
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600}
      sx={{ fontVariantNumeric: "tabular-nums", color: highlight || "inherit" }}>
      {value}
    </Typography>
  </Stack>
);