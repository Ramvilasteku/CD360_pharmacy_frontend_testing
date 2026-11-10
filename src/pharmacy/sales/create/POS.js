// src/components/pharmacy/sales/create/POS.jsx
// v6 — adds PER-ITEM discount (₹) and GST (%) inputs alongside overall ones
//   • Each cart item now shows a compact "Disc ₹ | GST %" input row
//   • Per-item discount subtracts from that line's subtotal
//   • Per-item GST applies unless overall GST override is set at bill level
//   • Everything else (v5 behavior) intact: substitute search, drafts,
//     overall discount/GST, park logic, inline Pay button

import React, { useState, useEffect } from "react";
import axios from "axios";
import { usePermission } from "../../../Redux/store/hooks/usePermissions";
import {
  Box, Paper, Typography, TextField, Button, IconButton, MenuItem,
  Autocomplete, CircularProgress, Alert, Snackbar, Chip, Avatar,
  Stack, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButtonGroup, ToggleButton, InputAdornment, Divider, Badge,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import InventoryIcon from "@mui/icons-material/Inventory2";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PercentIcon from "@mui/icons-material/Percent";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SearchIcon from "@mui/icons-material/Search";
import CustomerSection from "./CustomerSection";
import CheckoutDialog from "./CheckoutDialog";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import CloseIcon from "@mui/icons-material/Close";

const API = process.env.REACT_APP_URL;

const CENTERED = {
  "& .MuiDialog-container": {
    alignItems: "center",
    justifyContent: "center",
  },
};

export const buildCustomerPayload = (customer) => ({
  id: customer.id || null,
  name: customer.name ? String(customer.name).trim() : "",
  mobile: customer.mobile ? String(customer.mobile).trim() : "",
  email: customer.email ? String(customer.email).trim() : null,
  gender: customer.gender || null,
  age:
    customer.age !== undefined && customer.age !== null && customer.age !== ""
      ? Number(customer.age)
      : null,
  isNew: !!customer.isNew,
});

export default function POS({ branchState, branchParams = {} }) {
  // The branch chosen in the Sales header. Appended to every stock-aware lookup so the
  // counter is only ever offered stock that is actually in this branch.
  const bq = branchParams.branch ? `&branch=${encodeURIComponent(branchParams.branch)}` : "";

  // ─── Permissions ───────────────────────────────────────────────────────────
  // 25 Oct 2026 — this used to be:
  //
  //     const permissions = useSelector((s) => s.auth?.permissions || []);
  //     const can = (p) => permissions.includes(p);
  //
  // which is the bug behind "the employee only sees Park Sale, no Pay button", and behind
  // the admin not seeing Pay either. Reading the raw array skips the admin bypass that
  // Redux/store/hooks/usePermissions.js gives you, and buildUserAccess() in
  // controllers/authController.js returns permissions: [] for every tenant admin (its
  // role-id fallback is staff-only, so the permission query never runs). An empty array
  // means can() is false for everything, so the admin lost the button too.
  //
  // usePermission() returns true for role === "admin", mirroring allowPermissions.js
  // server-side, and is kept current by usePermissionPolling() in App.js.
  const canCreateSale = usePermission("pharmacy.sales.create");
  const canAddCustomer = usePermission("pharmacy.customers.create");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [customer, setCustomer] = useState({
    id: null, name: "", mobile: "", email: "", gender: "", age: "", isNew: false,
  });
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");

  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [overallGstPct, setOverallGstPct] = useState("");

  const [medicineOptions, setMedicineOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState("");

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [currentDraftNumber, setCurrentDraftNumber] = useState("");
  const [parkDialogOpen, setParkDialogOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [parkReason, setParkReason] = useState("waiting_payment");
  const [parkNotes, setParkNotes] = useState("");
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  const [substituteDialogOpen, setSubstituteDialogOpen] = useState(false);
  const [substituteSearchInput, setSubstituteSearchInput] = useState("");
  const [substituteResults, setSubstituteResults] = useState([]);
  const [substituteRequested, setSubstituteRequested] = useState(null);
  const [substituteLoading, setSubstituteLoading] = useState(false);
  const [substituteSource, setSubstituteSource] = useState(null);

  const showMessage = (message, severity = "success") =>
    setSnackbar({ open: true, message, severity });

  /* BARCODE SCAN */
  const scanBarcode = async (barcode) => {
    const clean = (barcode || "").replace(/\D/g, "").trim();
    if (clean.length < 8) return false;
    try {
      const res = await axios.get(
        `${API}/api/pharmacy/medicines/lookup/barcode/${clean}`,
        { withCredentials: true }
      );
      const medicine = res.data?.data;
      if (medicine) {
        await addMedicine(medicine);
        showMessage(`✓ ${medicine.medicine_name} added`, "success");
        return true;
      }
      showMessage(`No medicine for barcode ${clean}`, "warning");
    } catch (err) {
      showMessage(
        err.response?.status === 404
          ? `No medicine for barcode ${clean}`
          : "Barcode lookup failed",
        err.response?.status === 404 ? "warning" : "error"
      );
    }
    return false;
  };

  const searchMedicines = async (query) => {
    setSearchLoading(true);
    try {
      const url = query && query.length >= 2
        ? `${API}/api/pharmacy/medicines?search=${encodeURIComponent(query)}&status=active&limit=10${bq}`
        : `${API}/api/pharmacy/medicines?status=active&limit=10${bq}`;
      const res = await axios.get(url, { withCredentials: true });
      setMedicineOptions(res.data.data || []);
    } catch {
      setMedicineOptions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const addMedicine = async (medicine) => {
    if (!medicine) return;
    try {
      const res = await axios.get(
        `${API}/api/pharmacy/batches?medicine_id=${medicine.id}&status=active${bq}`,
        { withCredentials: true }
      );
      const batches = (res.data.data || []).filter((b) => b.quantity_available > 0);
      if (batches.length === 0) {
        showMessage(`${medicine.medicine_name} is out of stock`, "warning");
        return;
      }
      batches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
      const firstBatch = batches[0];
      const existingIdx = items.findIndex(
        (i) => i.medicine_id === medicine.id && i.batch_id === firstBatch.id
      );
      if (existingIdx >= 0) {
        updateQuantity(existingIdx, items[existingIdx].quantity + 1);
      } else {
        setItems([
          ...items,
          {
            medicine_id: medicine.id,
            medicine_name: medicine.medicine_name,
            manufacturer: medicine.manufacturer,
            pack_size: medicine.pack_size,
            batch_id: firstBatch.id,
            batch_number: firstBatch.batch_number,
            expiry_date: firstBatch.expiry_date,
            available: firstBatch.quantity_available,
            quantity: 1,
            unit_price: Number(firstBatch.selling_price || medicine.selling_price),
            discount_amount: 0,
            gst_percentage: Number(medicine.gst_percentage || 0),
            availableBatches: batches,
          },
        ]);
      }
      setSelectedMedicine(null);
    } catch {
      showMessage("Failed to add medicine", "error");
    }
  };

  const openSubstituteDialog = () => {
    setSearchFocused(false);
    setMedicineOptions([]);
    setSelectedMedicine(null);
    setSubstituteSearchInput(searchInputValue || "");
    setSubstituteResults([]);
    setSubstituteRequested(null);
    setSubstituteSource(null);
    setSubstituteDialogOpen(true);
    if (searchInputValue && searchInputValue.length >= 2) {
      searchForSubstitute(searchInputValue);
    }
  };

  const closeSubstituteDialog = () => {
    setSubstituteDialogOpen(false);
    setSubstituteResults([]);
    setSubstituteRequested(null);
    setSubstituteSource(null);
    setSubstituteSearchInput("");
  };

  const searchForSubstitute = async (term) => {
    if (!term || term.length < 2) {
      setSubstituteResults([]);
      setSubstituteRequested(null);
      setSubstituteSource(null);
      return;
    }
    setSubstituteLoading(true);
    try {
      const [invRes, catRes] = await Promise.all([
        axios.get(
          `${API}/api/pharmacy/medicines?search=${encodeURIComponent(term)}&status=active&limit=5${bq}`,
          { withCredentials: true }
        ).catch(() => ({ data: { data: [] } })),
        axios.get(
          `${API}/api/pharmacy/medicines/catalog-search?search=${encodeURIComponent(term)}&limit=1`,
          { withCredentials: true }
        ).catch(() => ({ data: { data: [] } })),
      ]);

      const invMatches = invRes.data?.data || [];
      const invFirst = invMatches[0] || null;
      const catMatch = catRes.data?.data?.[0] || null;

      if (!invFirst && !catMatch) {
        setSubstituteResults([]); setSubstituteRequested(null); setSubstituteSource(null);
        return;
      }

      const medicineDataId = invFirst?.medicine_data_id || catMatch?.id || null;
      const requested = {
        medicine_data_id: medicineDataId,
        pharmacy_medicine_id: invFirst?.id || null,
        name: invFirst?.medicine_name || catMatch?.name || catMatch?.medicine_name || term,
        composition:
          invFirst?.composition ||
          invFirst?.generic_name ||
          invFirst?.salt_composition ||
          catMatch?.composition ||
          catMatch?.generic_name ||
          "—",
      };
      setSubstituteRequested(requested);

      let substitutes = [];
      if (medicineDataId) {
        try {
          const subRes = await axios.get(
            `${API}/api/pharmacy/medicines/substitutes?medicine_data_id=${medicineDataId}${bq}`,
            { withCredentials: true }
          );
          substitutes = subRes.data?.data?.substitutes || [];
        } catch { /* fallback */ }
      }

      if (substitutes.length === 0 && invMatches.length > 0) {
        substitutes = invMatches.map((m) => ({
          pharmacy_medicine_id: m.id,
          medicine_name: m.medicine_name,
          manufacturer: m.manufacturer,
          pack_size: m.pack_size,
          selling_price: m.selling_price,
          gst_percentage: m.gst_percentage,
          total_available: m.total_available ?? m.quantity_available ?? 0,
          nearest_expiry: m.nearest_expiry || m.expiry_date || null,
        }));
        setSubstituteSource("inventory");
      } else {
        setSubstituteSource(substitutes.length > 0 ? "substitutes" : null);
      }

      setSubstituteResults(substitutes);
    } catch (err) {
      setSubstituteResults([]); setSubstituteRequested(null); setSubstituteSource(null);
      showMessage("Failed to load substitutes", "error");
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
      const batches = (batchRes.data.data || []).filter((b) => b.quantity_available > 0);
      if (batches.length === 0) {
        showMessage("No stock for this medicine", "warning"); return;
      }
      batches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
      const firstBatch = batches[0];

      let substitutionLogId = null;
      const isActualSubstitution =
        substituteRequested?.medicine_data_id &&
        substitute.pharmacy_medicine_id !== substituteRequested.pharmacy_medicine_id;

      if (isActualSubstitution) {
        try {
          const logRes = await axios.post(
            `${API}/api/pharmacy/substitutions`,
            {
              requested_medicine_data_id: substituteRequested.medicine_data_id,
              substituted_pharmacy_medicine_id: substitute.pharmacy_medicine_id,
              reason: "out_of_stock",
            },
            { withCredentials: true }
          );
          substitutionLogId = logRes.data.data?.id || null;
        } catch (err) {
          console.error("Substitution log failed:", err.response?.data || err.message);
        }
      }

      setItems((prev) => [
        ...prev,
        {
          medicine_id: substitute.pharmacy_medicine_id,
          medicine_name: substitute.medicine_name,
          manufacturer: substitute.manufacturer,
          pack_size: substitute.pack_size,
          batch_id: firstBatch.id,
          batch_number: firstBatch.batch_number,
          expiry_date: firstBatch.expiry_date,
          available: firstBatch.quantity_available,
          quantity: 1,
          unit_price: Number(firstBatch.selling_price || substitute.selling_price),
          discount_amount: 0,
          gst_percentage: Number(substitute.gst_percentage || 0),
          availableBatches: batches,
          substituted_for: isActualSubstitution ? substituteRequested?.name : null,
          substitution_log_id: substitutionLogId,
        },
      ]);

      showMessage(
        isActualSubstitution
          ? `${substitute.medicine_name} added (substituted for ${substituteRequested?.name})`
          : `${substitute.medicine_name} added`,
        "success"
      );
      closeSubstituteDialog();
    } catch {
      showMessage("Failed to add medicine", "error");
    }
  };

  /* PARK SALE */
  const handleParkSale = async () => {
    if (!customer.name || !customer.mobile) {
      showMessage("Add customer first", "warning"); return;
    }
    if (items.length === 0) {
      showMessage("Cart is empty", "warning"); return;
    }
    try {
      const payload = {
        customer: buildCustomerPayload(customer),
        items: items.map((i) => ({
          medicine_id: i.medicine_id, batch_id: i.batch_id,
          quantity: i.quantity, unit_price: i.unit_price,
          discount_amount: i.discount_amount || 0,
          gst_percentage: i.gst_percentage || 0,
        })),
        subtotal: itemsSubtotal,
        discount_amount: safeDiscountAmount,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        status: "draft",
        park_reason: parkReason,
        park_notes: parkNotes.trim() || null,
        notes: buildNotes(),
      };
      const res = await axios.post(
        `${API}/api/pharmacy/sales/post`, payload, { withCredentials: true }
      );
      const data = res.data?.data;
      if (data?.customer_created) {
        showMessage(`✓ New patient added · Parked as ${data.sale_number}`, "success");
      } else {
        showMessage(`Parked as ${data?.sale_number}`, "success");
      }
      resetAll();
      setParkDialogOpen(false);
      setParkReason("waiting_payment");
      setParkNotes("");
      loadDrafts();
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to park sale", "error");
    }
  };

  /* DRAFTS */
  const loadDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await axios.get(`${API}/api/pharmacy/sales/drafts`, { params: branchParams, withCredentials: true });
      setDrafts(res.data.data || []);
    } catch {
      setDrafts([]);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleResumeDraft = async (draftId) => {
    try {
      const res = await axios.get(
        `${API}/api/pharmacy/sales/drafts/${draftId}`, { withCredentials: true }
      );
      const { sale, items: draftItems } = res.data.data;
      setCustomer({
        id: sale.customer_id, name: sale.customer_name, mobile: sale.customer_phone,
        email: "", gender: "", age: "", isNew: false,
      });
      setItems(draftItems);
      if (sale.discount_amount && Number(sale.discount_amount) > 0) {
        setDiscountType("flat");
        setDiscountValue(String(sale.discount_amount));
      }
      setCurrentDraftId(draftId);
      setCurrentDraftNumber(sale.sale_number);
      setDraftsOpen(false);
      showMessage(`Resumed ${sale.sale_number}`, "info");
    } catch {
      showMessage("Failed to load draft", "error");
    }
  };

  const handleDiscardDraft = async (draftId, draftNumber) => {
    if (!window.confirm(`Discard ${draftNumber}?`)) return;
    try {
      await axios.delete(`${API}/api/pharmacy/sales/drafts/${draftId}`, { withCredentials: true });
      showMessage("Draft discarded", "info");
      loadDrafts();
    } catch {
      showMessage("Failed to discard", "error");
    }
  };

  useEffect(() => { loadDrafts(); }, []);

  const updateQuantity = (idx, qty) => {
    const updated = [...items];
    updated[idx].quantity = Math.max(1, Math.min(Number(qty) || 1, updated[idx].available));
    setItems(updated);
  };

  // ⭐ NEW — per-item discount (₹) handler
  const updateItemDiscount = (idx, val) => {
    const updated = [...items];
    const num = Math.max(0, Number(val) || 0);
    const lineMax = updated[idx].unit_price * updated[idx].quantity;
    updated[idx].discount_amount = Math.min(num, lineMax);
    setItems(updated);
  };

  // ⭐ NEW — per-item GST (%) handler
  const updateItemGst = (idx, val) => {
    const updated = [...items];
    const num = Math.max(0, Math.min(100, Number(val) || 0));
    updated[idx].gst_percentage = num;
    setItems(updated);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const resetAll = () => {
    setCustomer({ id: null, name: "", mobile: "", email: "", gender: "", age: "", isNew: false });
    setItems([]); setNotes("");
    setDiscountType("percent"); setDiscountValue(""); setOverallGstPct("");
    setCurrentDraftId(null); setCurrentDraftNumber("");
  };

  /* TOTALS */
  const itemsSubtotal = items.reduce(
    (s, i) => s + i.unit_price * i.quantity - (i.discount_amount || 0), 0
  );
  const discountNum = Math.max(0, Number(discountValue) || 0);
  const _discountFinal =
    discountType === "percent"
      ? (itemsSubtotal * Math.min(discountNum, 100)) / 100
      : Math.min(discountNum, itemsSubtotal);
  const safeDiscountAmount = Math.round(_discountFinal * 100) / 100;
  const afterDiscount = Math.max(0, itemsSubtotal - safeDiscountAmount);
  const overallGstNum = Math.max(0, Number(overallGstPct) || 0);
  const perItemTax = items.reduce((s, i) => {
    const net = i.unit_price * i.quantity - (i.discount_amount || 0);
    return s + (net * (i.gst_percentage || 0)) / 100;
  }, 0);
  const taxAmount =
    overallGstNum > 0
      ? Math.round(((afterDiscount * overallGstNum) / 100) * 100) / 100
      : Math.round(perItemTax * 100) / 100;
  const grandTotal = Math.round((afterDiscount + taxAmount) * 100) / 100;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const perItemDiscountTotal = items.reduce((s, i) => s + (i.discount_amount || 0), 0);

  const buildNotes = () => {
    const extra = [];
    if (safeDiscountAmount > 0) extra.push(`discount:${discountType}:${discountNum}`);
    if (overallGstNum > 0) extra.push(`overall_gst:${overallGstNum}`);
    const base = notes?.trim();
    return [base, extra.join("|")].filter(Boolean).join(" | ") || null;
  };

  const canCheckout = items.length > 0 && customer.name && customer.mobile;

  // ─── Branch: can this counter take stock out at all? ───────────────────────
  // utils/pharmacyBranch.js → resolveScope({ forWrite: true }) rejects a sale outright in
  // two cases, and until now the screen knew about neither: you could build a whole bill
  // and only learn at Pay.
  //
  //   admin, no branch chosen        400 "Choose the branch first."
  //   staff with no staff.branch     403 "Your profile has no branch. Ask your admin…"
  //
  // Both are now said up front, and Pay is held until they are resolved. Single-branch
  // pharmacies are unaffected: branchState.multi is false and neither case can arise.
  const branchBlock =
    branchState?.loading || !branchState?.multi
      ? null
      : branchState.isAdmin
        ? (branchState.needsChoice
            ? "Choose the branch at the top of the page — its stock is what you sell."
            : null)
        : (branchState.myBranch
            ? null
            : "Your profile has no branch, so there is no stock to sell from. Ask your admin to set your branch.");

  /* ═════ RENDER ═════ */
  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 1.5, sm: 2.5, md: 3 } }}>
        <Stack spacing={{ xs: 2, sm: 2.5 }}>

          <CustomerSection
            customer={customer}
            setCustomer={setCustomer}
            canAddCustomer={canAddCustomer}
          />

          {currentDraftId && (
            <Alert
              severity="warning" icon={<BookmarkIcon />}
              sx={{ borderRadius: 2.5, fontWeight: 600 }}
              action={<Button size="small" color="inherit" onClick={resetAll}>Cancel</Button>}
            >
              Resuming parked sale <strong>{currentDraftNumber}</strong> — complete payment to finalize it
            </Alert>
          )}

          {/* ═════ SEARCH + QUICK ACTIONS ═════ */}
          <Paper elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2.5 },
              border: "2px solid #0f766e",
              borderRadius: 3, bgcolor: "#fff",
              position: "relative", overflow: "hidden",
            }}>
            <Box sx={{
              position: "absolute", top: -20, right: -20, width: 100, height: 100,
              bgcolor: "#0f766e10", borderRadius: "50%",
            }} />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={1.5} sx={{ mb: 2 }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{ bgcolor: "#0f766e", width: 36, height: 36 }}>
                  <QrCodeScannerIcon fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Scan or search medicine
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Scanner is ready — scan a barcode, or type to search by name
                  </Typography>
                </Box>
              </Stack>

              <Tooltip title={drafts.length > 0 ? `${drafts.length} parked sale${drafts.length === 1 ? "" : "s"}` : "No parked sales"}>
                <Badge
                  badgeContent={drafts.length}
                  color="warning"
                  overlap="rectangular"
                  sx={{ "& .MuiBadge-badge": { fontWeight: 700 } }}
                >
                  <Button
                    variant="outlined" size="small"
                    startIcon={<BookmarkIcon />}
                    onClick={() => setDraftsOpen(true)}
                    sx={{
                      textTransform: "none", borderRadius: 2, fontWeight: 700,
                      borderColor: "#f59e0b", color: "#92400e",
                      bgcolor: "#fffbeb",
                      "&:hover": { borderColor: "#d97706", bgcolor: "#fef3c7" },
                      px: 2,
                    }}
                  >
                    Drafts
                  </Button>
                </Badge>
              </Tooltip>
            </Stack>

            <Autocomplete
              value={selectedMedicine}
              onChange={(_, v) => addMedicine(v)}
              options={medicineOptions}
              getOptionLabel={(o) => `${o.medicine_name} — ${o.manufacturer || ""}`}
              loading={searchLoading}
              onInputChange={(_, v) => { setSearchInputValue(v); searchMedicines(v); }}
              open={searchFocused && medicineOptions.length > 0}
              onOpen={() => setSearchFocused(true)}
              onClose={() => setSearchFocused(false)}
              noOptionsText="Type at least 2 letters to search"
              loadingText="Loading medicines…"
              filterOptions={(x) => x}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id} sx={{ py: 1.2 }}>
                  <Avatar sx={{
                    width: 36, height: 36, mr: 1.5,
                    bgcolor: "#0f766e15", color: "#0f766e", fontSize: 14, fontWeight: 700,
                  }}>
                    {option.medicine_name?.[0]?.toUpperCase() || "?"}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={600} fontSize={14} noWrap>
                      {option.medicine_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.manufacturer} · {option.pack_size} · ₹{option.selling_price}
                    </Typography>
                  </Box>
                  <Chip label={`GST ${option.gst_percentage}%`} size="small"
                    sx={{ height: 20, fontSize: 10 }} />
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Scan barcode or type medicine name…"
                  autoFocus size="medium"
                  onFocus={() => {
                    setSearchFocused(true);
                    if (medicineOptions.length === 0) searchMedicines("");
                  }}
                  onKeyDown={async (e) => {
                    if (e.key !== "Enter") return;
                    const value = (e.target.value || "").trim();
                    if (!/^\d{8,14}$/.test(value)) return;
                    e.preventDefault(); e.stopPropagation();
                    const added = await scanBarcode(value);
                    if (added) {
                      e.target.blur();
                      setTimeout(() => e.target.focus(), 0);
                      setMedicineOptions([]); setSelectedMedicine(null);
                    }
                  }}
                  InputProps={{
                    ...params.InputProps,
                    sx: { fontSize: 16, bgcolor: "#f8fafc", borderRadius: 2 },
                    endAdornment: <>{searchLoading && <CircularProgress size={18} />}{params.InputProps.endAdornment}</>,
                  }}
                />
              )}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}
              sx={{ mt: 1.5 }} alignItems={{ sm: "center" }}>
              <Button
                variant="outlined" size="small"
                startIcon={<SwapHorizIcon />}
                onClick={openSubstituteDialog}
                fullWidth={isMobile}
                sx={{
                  textTransform: "none", borderRadius: 2, fontWeight: 600,
                  borderColor: "#f59e0b", color: "#92400e", bgcolor: "#fffbeb",
                  "&:hover": { borderColor: "#d97706", bgcolor: "#fef3c7" },
                }}
              >
                Find similar medicine
              </Button>
              <Typography variant="caption" color="text.secondary"
                sx={{ display: { xs: "none", md: "block" } }}>
                Same composition from your stock when the exact one is unavailable
              </Typography>
            </Stack>
          </Paper>

          {/* ═════ CART CARD ═════ */}
          {items.length > 0 ? (
            <Paper elevation={0}
              sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3, border: "1px solid #e2e8f0" }}>
              <Stack direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                spacing={1} sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <ShoppingCartOutlinedIcon sx={{ color: "#0f766e" }} />
                  <Typography variant="h6" fontWeight={700}>Cart</Typography>
                  <Chip
                    label={`${items.length} ${items.length === 1 ? "medicine" : "medicines"} · ${totalItems} units`}
                    size="small"
                    sx={{ bgcolor: "#0f766e15", color: "#0f766e", fontWeight: 600 }}
                  />
                </Stack>
                <Button size="small" color="error" onClick={() => setItems([])}
                  sx={{ textTransform: "none" }}>
                  Clear all
                </Button>
              </Stack>

              <Stack spacing={1.5}>
                {items.map((item, idx) => {
                  const lineGross = item.unit_price * item.quantity;
                  const lineNet = lineGross - (item.discount_amount || 0);
                  const lineTotal = lineNet + (lineNet * (item.gst_percentage || 0)) / 100;
                  const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
                  const monthsLeft = expiryDate
                    ? Math.round((expiryDate - new Date()) / (1000 * 60 * 60 * 24 * 30))
                    : null;
                  const expirySoon = monthsLeft !== null && monthsLeft < 6;
                  const lowStock = item.available < 10;

                  return (
                    <Paper key={idx} elevation={0}
                      sx={{
                        p: 2, borderRadius: 2.5, bgcolor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        transition: "all 0.15s",
                        "&:hover": { borderColor: "#0f766e", boxShadow: "0 2px 8px #0f766e15" },
                      }}>
                      {/* ─── MAIN ROW ─── */}
                      <Box sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "40px 1fr auto",
                          sm: "40px 1fr auto auto 40px",
                        },
                        gap: { xs: 1, sm: 2 }, alignItems: "center",
                      }}>
                        <Avatar sx={{
                          width: 40, height: 40,
                          bgcolor: "#0f766e15", color: "#0f766e", fontWeight: 700,
                        }}>
                          <LocalPharmacyIcon fontSize="small" />
                        </Avatar>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={600} fontSize={14} noWrap>
                            {item.medicine_name}
                          </Typography>
                          {item.substituted_for && (
                            <Typography variant="caption"
                              sx={{ color: "#f59e0b", fontStyle: "italic", display: "block" }}>
                              Substituted for {item.substituted_for}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}
                            alignItems="center" flexWrap="wrap">
                            <Chip label={item.batch_number} size="small"
                              sx={{ height: 18, fontSize: 10, bgcolor: "#fff" }} />
                            {item.pack_size && (
                              <Typography variant="caption" color="text.secondary">
                                {item.pack_size}
                              </Typography>
                            )}
                            {expirySoon && (
                              <Chip label={`Exp ${monthsLeft}mo`} size="small" color="warning"
                                sx={{ height: 18, fontSize: 10 }} />
                            )}
                            {lowStock && (
                              <Chip label={`Only ${item.available} left`} size="small" color="error"
                                sx={{ height: 18, fontSize: 10 }} />
                            )}
                          </Stack>

                          {/* mobile inline qty + remove */}
                          <Stack direction="row" spacing={1}
                            sx={{ mt: 1, display: { xs: "flex", sm: "none" } }}
                            alignItems="center">
                            <Stack direction="row" alignItems="center"
                              sx={{
                                bgcolor: "#fff", borderRadius: 2,
                                border: "1px solid #e2e8f0", overflow: "hidden",
                              }}>
                              <IconButton size="small"
                                onClick={() => updateQuantity(idx, item.quantity - 1)}
                                disabled={item.quantity <= 1}>
                                <RemoveIcon fontSize="small" />
                              </IconButton>
                              <Typography sx={{ width: 32, textAlign: "center", fontWeight: 700, fontSize: 13 }}>
                                {item.quantity}
                              </Typography>
                              <IconButton size="small"
                                onClick={() => updateQuantity(idx, item.quantity + 1)}
                                disabled={item.quantity >= item.available}>
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                            <IconButton size="small" onClick={() => removeItem(idx)}
                              sx={{ color: "#ef4444", "&:hover": { bgcolor: "#fef2f2" } }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Box>

                        {/* desktop qty */}
                        <Stack direction="row" alignItems="center"
                          sx={{
                            display: { xs: "none", sm: "flex" },
                            bgcolor: "#fff", borderRadius: 2,
                            border: "1px solid #e2e8f0", overflow: "hidden",
                          }}>
                          <IconButton size="small"
                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                            disabled={item.quantity <= 1}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ width: 36, textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                            {item.quantity}
                          </Typography>
                          <IconButton size="small"
                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                            disabled={item.quantity >= item.available}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Box sx={{ textAlign: "right", minWidth: 90 }}>
                          <Typography fontWeight={700} fontSize={15} color="#0f172a">
                            ₹{lineTotal.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ₹{item.unit_price.toFixed(2)} × {item.quantity}
                          </Typography>
                        </Box>

                        <Tooltip title="Remove">
                          <IconButton size="small" onClick={() => removeItem(idx)}
                            sx={{
                              display: { xs: "none", sm: "inline-flex" },
                              color: "#ef4444", "&:hover": { bgcolor: "#fef2f2" },
                            }}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* ─── PER-ITEM DISCOUNT + GST ROW (NEW) ─── */}
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          mt: 1.5,
                          pl: { xs: 0, sm: 7 },
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <TextField
                          size="small"
                          label="Disc"
                          type="number"
                          value={item.discount_amount || ""}
                          onChange={(e) => updateItemDiscount(idx, e.target.value)}
                          placeholder="0"
                          InputProps={{
                            sx: { fontSize: 13, bgcolor: "#fff" },
                            startAdornment: (
                              <InputAdornment position="start" sx={{ "& p": { fontSize: 12 } }}>
                                ₹
                              </InputAdornment>
                            ),
                          }}
                          inputProps={{ min: 0, max: lineGross, step: "0.01" }}
                          sx={{ width: { xs: "48%", sm: 110 } }}
                        />

                        <TextField
                          size="small"
                          label="GST"
                          type="number"
                          value={item.gst_percentage || ""}
                          onChange={(e) => updateItemGst(idx, e.target.value)}
                          placeholder="0"
                          InputProps={{
                            sx: { fontSize: 13, bgcolor: "#fff" },
                            endAdornment: (
                              <InputAdornment position="end" sx={{ "& p": { fontSize: 12 } }}>
                                %
                              </InputAdornment>
                            ),
                          }}
                          inputProps={{ min: 0, max: 100, step: "0.1" }}
                          sx={{ width: { xs: "48%", sm: 100 } }}
                          disabled={overallGstNum > 0}
                          helperText={overallGstNum > 0 ? "Overridden" : ""}
                          FormHelperTextProps={{
                            sx: { fontSize: 10, mx: 0, mt: 0, color: "#9a3412" },
                          }}
                        />

                        {/* Line math breakdown — reassures the cashier */}
                        {(item.discount_amount > 0 || item.gst_percentage > 0) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: { sm: "auto" }, fontVariantNumeric: "tabular-nums" }}
                          >
                            {item.discount_amount > 0 && (
                              <Box component="span" sx={{ color: "#10b981", mr: 1 }}>
                                − ₹{Number(item.discount_amount).toFixed(2)}
                              </Box>
                            )}
                            {item.gst_percentage > 0 && overallGstNum === 0 && (
                              <Box component="span" sx={{ color: "#64748b" }}>
                                + GST ₹{((lineNet * item.gst_percentage) / 100).toFixed(2)}
                              </Box>
                            )}
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>

              {/* ═════ BILL-LEVEL ADJUSTMENTS ═════ */}
              <Paper elevation={0}
                sx={{
                  mt: 2.5, p: { xs: 1.5, sm: 2 },
                  borderRadius: 2.5, bgcolor: "#fff8f0",
                  border: "1px solid #fed7aa",
                }}>
                <Typography variant="overline" fontWeight={700} color="#9a3412">
                  Bill-level adjustments
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
                  Applied on top of per-item values above
                </Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}
                  sx={{ mt: 1.5 }} alignItems={{ md: "flex-start" }}>
                  <Box sx={{ flex: 1, width: "100%" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Bill Discount
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <ToggleButtonGroup exclusive size="small"
                        value={discountType}
                        onChange={(_, v) => v && setDiscountType(v)}
                        sx={{ height: 40 }}>
                        <ToggleButton value="percent" sx={{ textTransform: "none" }}>
                          <PercentIcon fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="flat" sx={{ textTransform: "none" }}>
                          <CurrencyRupeeIcon fontSize="small" />
                        </ToggleButton>
                      </ToggleButtonGroup>
                      <TextField size="small" type="number" value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === "percent" ? "0 – 100" : "0"}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              {discountType === "percent" ? "%" : "₹"}
                            </InputAdornment>
                          ),
                        }}
                        sx={{ flex: 1, bgcolor: "#fff" }} />
                    </Stack>
                    {safeDiscountAmount > 0 && (
                      <Typography variant="caption" color="success.main"
                        sx={{ mt: 0.5, display: "block" }}>
                        − ₹{safeDiscountAmount.toFixed(2)} off bill
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ flex: 1, width: "100%" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Overall GST (overrides per-item)
                    </Typography>
                    <TextField size="small" type="number" value={overallGstPct}
                      onChange={(e) => setOverallGstPct(e.target.value)}
                      placeholder="Leave empty = per-item GST"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      sx={{ mt: 0.5, bgcolor: "#fff", width: "100%" }} />
                    {overallGstNum > 0 ? (
                      <Typography variant="caption" color="#9a3412"
                        sx={{ mt: 0.5, display: "block" }}>
                        Overriding per-item GST → {overallGstNum}% on ₹{afterDiscount.toFixed(2)}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary"
                        sx={{ mt: 0.5, display: "block" }}>
                        Using each medicine's own GST %
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>

              {/* Notes */}
              <TextField label="Notes (optional)" value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth size="small" multiline rows={2}
                sx={{ mt: 2 }} />

              {/* ═════ FINAL PAYMENT ═════ */}
              <Paper elevation={0}
                sx={{
                  mt: 2.5, p: { xs: 2, sm: 2.5 },
                  borderRadius: 2.5,
                  background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)",
                  border: "1px solid #99f6e4",
                }}>
                <Stack spacing={0.75}>
                  <Row label="Items subtotal (gross)"
                    value={`₹${items.reduce((s, i) => s + i.unit_price * i.quantity, 0).toFixed(2)}`} />
                  {perItemDiscountTotal > 0 && (
                    <Row label="Per-item discounts"
                      value={`− ₹${perItemDiscountTotal.toFixed(2)}`}
                      color="#10b981" />
                  )}
                  <Row label="Subtotal (after item discounts)"
                    value={`₹${itemsSubtotal.toFixed(2)}`} />
                  {safeDiscountAmount > 0 && (
                    <Row
                      label={`Bill discount (${discountType === "percent" ? `${discountNum}%` : "flat"})`}
                      value={`− ₹${safeDiscountAmount.toFixed(2)}`}
                      color="#10b981"
                    />
                  )}
                  <Row
                    label={`GST${overallGstNum > 0 ? ` (${overallGstNum}% overall)` : " (per-item)"}`}
                    value={`₹${taxAmount.toFixed(2)}`}
                  />
                </Stack>

                <Divider sx={{ my: 1.5, borderColor: "#99f6e4" }} />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={1}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}
                      sx={{ letterSpacing: 0.5 }}>
                      TOTAL PAYABLE
                    </Typography>
                    <Typography
                      fontWeight={900}
                      sx={{
                        fontSize: { xs: 32, sm: 36, md: 40 },
                        color: "#0f766e", lineHeight: 1,
                      }}
                    >
                      ₹{grandTotal.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                      {items.length} {items.length === 1 ? "medicine" : "medicines"} · {totalItems} units
                    </Typography>
                  </Box>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    {/* Parking a sale WRITES a draft, so it needs the same permission as
                        billing one. Before this the two disagreed: Park Sale had no gate at
                        all while Pay had one, which is why a user with no sales.create saw a
                        Park button and nothing else. */}
                    {canCreateSale && customer.name && (
                      <Button
                        variant="outlined" size="large"
                        startIcon={<PauseCircleOutlineIcon />}
                        onClick={() => setParkDialogOpen(true)}
                        // 26 Oct: the server now needs a branch to park too (the draft's
                        // branch is what completing it will draw from), so Park waits for
                        // the same thing Pay waits for.
                        disabled={!!branchBlock}
                        fullWidth={isMobile}
                        sx={{
                          borderRadius: 2.5, textTransform: "none", fontWeight: 700,
                          borderColor: "#f59e0b", color: "#92400e",
                          bgcolor: "#fff",
                          "&:hover": { borderColor: "#d97706", bgcolor: "#fef3c7" },
                        }}
                      >
                        Park Sale
                      </Button>
                    )}

                    {canCreateSale && (
                      <Button
                        variant="contained" size="large"
                        startIcon={<PointOfSaleIcon />}
                        onClick={() => setCheckoutOpen(true)}
                        disabled={!canCheckout || !!branchBlock}
                        fullWidth={isMobile}
                        sx={{
                          bgcolor: "#0f766e",
                          px: { xs: 2, sm: 4 }, py: { xs: 1.2, sm: 1.5 },
                          fontSize: { xs: 15, sm: 16 }, fontWeight: 700,
                          textTransform: "none", borderRadius: 2.5,
                          boxShadow: "0 4px 14px #0f766e40",
                          "&:hover": { bgcolor: "#0d5a54" },
                        }}
                      >
                        Pay ₹{grandTotal.toFixed(2)}
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {/* Why you cannot pay yet — the branch reason first, since it blocks the
                    sale no matter how complete the bill is. A hidden control with no
                    explanation is the thing that generates support calls. */}
                {branchBlock && (
                  <Alert severity="warning"
                    sx={{ mt: 1.5, borderRadius: 2, fontSize: 13 }}>
                    {branchBlock}
                  </Alert>
                )}

                {!branchBlock && !canCheckout && items.length > 0 && (
                  <Alert severity="warning"
                    sx={{ mt: 1.5, borderRadius: 2, fontSize: 13 }}>
                    Add customer name and mobile number to continue
                  </Alert>
                )}

                {!canCreateSale && items.length > 0 && (
                  <Alert severity="info"
                    sx={{ mt: 1.5, borderRadius: 2, fontSize: 13 }}>
                    You can look up medicines but not bill a sale. Ask your admin for
                    "Create Sale" (pharmacy.sales.create).
                  </Alert>
                )}
              </Paper>
            </Paper>
          ) : (
            <Paper elevation={0}
              sx={{
                p: { xs: 4, sm: 6 }, borderRadius: 3,
                border: "2px dashed #cbd5e1",
                textAlign: "center", bgcolor: "#fff",
              }}>
              <InventoryIcon sx={{ fontSize: 56, color: "#cbd5e1", mb: 1 }} />
              <Typography color="text.secondary" fontWeight={600}>Cart is empty</Typography>
              <Typography variant="caption" color="text.secondary">
                Scan a barcode or search above to add medicines
              </Typography>
            </Paper>
          )}
        </Stack>
      </Box>

      {/* CHECKOUT DIALOG */}
      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        customer={customer}
        customerPayload={buildCustomerPayload(customer)}
        items={items}
        notes={buildNotes()}
        subtotal={itemsSubtotal}
        discountAmount={safeDiscountAmount}
        taxAmount={taxAmount}
        grandTotal={grandTotal}
        currentDraftId={currentDraftId}
        branchParams={branchParams}
        onSuccess={async (saleNumber, paid, saleId, serverData = {}) => {
          const logIds = items.filter((i) => i.substitution_log_id).map((i) => i.substitution_log_id);
          if (logIds.length > 0 && saleId) {
            await Promise.all(logIds.map((logId) =>
              axios.patch(
                `${API}/api/pharmacy/substitutions/${logId}/link-sale`,
                { sale_id: saleId }, { withCredentials: true }
              ).catch(() => {})
            ));
          }
          // The server used to report customer_created here and this said "✓ New patient
          // added". It no longer creates customers at bill time (see resolveCustomer in
          // routes/Pharmacy/pharmacySales.js), so it now reports customer_walkin instead —
          // the bill went through without a customer record, which is worth saying plainly
          // so the counter knows to use "Add customer" if they wanted one kept.
          if (serverData?.customer_walkin) {
            showMessage(
              `Sale ${saleNumber} complete · ₹${Number(paid).toFixed(2)} collected · billed as walk-in, not saved to customers`,
              "success"
            );
          } else {
            showMessage(
              `Sale ${saleNumber} complete · ₹${Number(paid).toFixed(2)} collected`, "success"
            );
          }
          resetAll();
          setCheckoutOpen(false);
          loadDrafts();
        }}
      />

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

      {/* PARK DIALOG */}
      <Dialog
        open={parkDialogOpen} onClose={() => setParkDialogOpen(false)}
        maxWidth="sm" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
        sx={CENTERED}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Park this sale?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save for later — resume anytime from "Drafts." Stock stays free for other customers.
          </Typography>
          <TextField select fullWidth label="Reason"
            value={parkReason} onChange={(e) => setParkReason(e.target.value)}
            sx={{ mb: 2 }}>
            <MenuItem value="waiting_payment">Customer getting payment</MenuItem>
            <MenuItem value="awaiting_prescription">Awaiting prescription</MenuItem>
            <MenuItem value="awaiting_insurance">Awaiting insurance</MenuItem>
            <MenuItem value="customer_browsing">Customer still browsing</MenuItem>
            <MenuItem value="shift_change">Shift change</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          <TextField fullWidth multiline rows={2}
            label="Notes (optional)" value={parkNotes}
            onChange={(e) => setParkNotes(e.target.value)}
            placeholder="e.g. Yellow shirt customer, will return in 10 min" />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setParkDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleParkSale}
            sx={{ bgcolor: "#f59e0b", "&:hover": { bgcolor: "#d97706" } }}>
            Park Sale
          </Button>
        </DialogActions>
      </Dialog>

      {/* DRAFTS DIALOG */}
      <Dialog
        open={draftsOpen} onClose={() => setDraftsOpen(false)}
        maxWidth="sm" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
        sx={CENTERED}
      >
        <DialogTitle sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          bgcolor: "#fef3c7", borderBottom: "1px solid #fde68a",
        }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BookmarkIcon sx={{ color: "#f59e0b" }} />
            <Typography variant="h6" fontWeight={700}>Parked Sales</Typography>
            {drafts.length > 0 && (
              <Chip label={drafts.length} size="small"
                sx={{ bgcolor: "#f59e0b", color: "#fff", fontWeight: 700 }} />
            )}
          </Stack>
          <IconButton onClick={() => setDraftsOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {loadingDrafts ? (
            <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
          ) : drafts.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <BookmarkIcon sx={{ fontSize: 56, color: "#cbd5e1", mb: 1 }} />
              <Typography color="text.secondary" fontWeight={600}>No parked sales</Typography>
              <Typography variant="caption" color="text.secondary">
                Use "Park" on a cart to save it for later
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {drafts.map((d) => (
                <Paper key={d.id} elevation={0}
                  sx={{
                    p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, cursor: "pointer",
                    border: "1px solid #e2e8f0", transition: "all 0.15s",
                    "&:hover": { borderColor: "#f59e0b", boxShadow: "0 2px 10px #f59e0b30" },
                  }}
                  onClick={() => handleResumeDraft(d.id)}>
                  <Stack direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", sm: "flex-start" }}
                    spacing={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center"
                        sx={{ mb: 0.5 }} flexWrap="wrap">
                        <Chip label={d.sale_number} size="small"
                          sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700 }} />
                        <Typography fontWeight={600} noWrap>{d.customer_name}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {d.customer_phone} · {d.items_count} items · parked {d.parked_minutes_ago}m ago
                      </Typography>
                      {d.park_notes && (
                        <Typography variant="caption" display="block"
                          sx={{ mt: 0.5, fontStyle: "italic", color: "#64748b" }}>
                          "{d.park_notes}"
                        </Typography>
                      )}
                      {d.park_reason && (
                        <Chip label={d.park_reason.replace(/_/g, " ")} size="small"
                          sx={{
                            mt: 0.75, height: 18, fontSize: 10,
                            bgcolor: "#f1f5f9", color: "#475569", textTransform: "capitalize",
                          }} />
                      )}
                    </Box>
                    <Stack direction={{ xs: "row", sm: "column" }}
                      alignItems={{ xs: "center", sm: "flex-end" }}
                      justifyContent={{ xs: "space-between", sm: "flex-start" }}
                      spacing={0.5}>
                      <Typography fontWeight={700} fontSize={16} color="#0f766e">
                        ₹{Number(d.grand_total).toFixed(2)}
                      </Typography>
                      <IconButton size="small" color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDiscardDraft(d.id, d.sale_number);
                        }}>
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

      {/* SUBSTITUTE DIALOG */}
      <Dialog
        open={substituteDialogOpen} onClose={closeSubstituteDialog}
        maxWidth="md" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
        sx={CENTERED}
      >
        <DialogTitle sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid #fde68a", bgcolor: "#fef3c7",
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <Avatar sx={{ bgcolor: "#f59e0b", width: 36, height: 36, flexShrink: 0 }}>
              <SwapHorizIcon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} fontSize={{ xs: 14, sm: 16 }} noWrap>
                Find similar medicine
              </Typography>
              <Typography variant="caption" color="text.secondary"
                sx={{ display: { xs: "none", sm: "block" } }}>
                Searches your inventory first, then the global catalog
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={closeSubstituteDialog}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <TextField
            autoFocus fullWidth size="medium"
            label="Medicine name"
            placeholder="e.g., Crocin 500mg, Paracetamol"
            value={substituteSearchInput}
            onChange={(e) => {
              setSubstituteSearchInput(e.target.value);
              searchForSubstitute(e.target.value);
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: substituteLoading && <CircularProgress size={20} />,
            }}
            sx={{ mb: 2 }}
          />

          {substituteRequested && (
            <Paper elevation={0}
              sx={{
                p: 2, mb: 2, bgcolor: "#fef3c7",
                borderRadius: 2, border: "1px solid #fde68a",
              }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                <Box>
                  <Typography fontWeight={700} fontSize={14} color="#92400e">
                    Looking for: {substituteRequested.name}
                  </Typography>
                  <Typography variant="caption" color="#92400e">
                    Composition: {substituteRequested.composition}
                  </Typography>
                </Box>
                {substituteSource === "inventory" && (
                  <Chip label="From your inventory" size="small"
                    sx={{ bgcolor: "#fff", color: "#92400e", fontWeight: 600, height: 22 }} />
                )}
                {substituteSource === "substitutes" && (
                  <Chip label="Same composition" size="small"
                    sx={{ bgcolor: "#fff", color: "#92400e", fontWeight: 600, height: 22 }} />
                )}
              </Stack>
            </Paper>
          )}

          {substituteLoading ? (
            <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
          ) : substituteResults.length > 0 ? (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5 }}>
                {substituteResults.length}{" "}
                {substituteSource === "inventory" ? "IN-STOCK MATCHES" : "IN-STOCK ALTERNATIVES"}
              </Typography>
              {substituteResults.map((sub) => (
                <Paper key={sub.pharmacy_medicine_id} elevation={0}
                  sx={{
                    p: { xs: 1.5, sm: 2 }, borderRadius: 2,
                    border: "1px solid #e2e8f0",
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr auto auto" },
                    gap: { xs: 1, sm: 2 },
                    alignItems: "center",
                    transition: "all 0.15s",
                    "&:hover": { borderColor: "#f59e0b", boxShadow: "0 2px 10px #f59e0b30" },
                  }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} fontSize={15} noWrap>
                      {sub.medicine_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {sub.manufacturer} · {sub.pack_size || "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Nearest expiry:{" "}
                      {sub.nearest_expiry
                        ? new Date(sub.nearest_expiry).toLocaleDateString()
                        : "—"}
                    </Typography>
                  </Box>
                  <Box sx={{
                    textAlign: { xs: "left", sm: "right" },
                    display: "flex",
                    flexDirection: { xs: "row", sm: "column" },
                    alignItems: { xs: "center", sm: "flex-end" },
                    justifyContent: { xs: "space-between", sm: "flex-start" },
                    gap: 1,
                  }}>
                    <Typography fontWeight={700} fontSize={15}>
                      ₹{Number(sub.selling_price).toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {sub.total_available ?? 0} in stock
                    </Typography>
                  </Box>
                  <Button variant="contained" size="medium"
                    fullWidth={isMobile}
                    startIcon={<AddIcon />}
                    onClick={() => addSubstituteFromDialog(sub)}
                    disabled={(sub.total_available ?? 0) <= 0}
                    sx={{
                      bgcolor: "#f59e0b",
                      textTransform: "none", fontWeight: 700, px: 2.5,
                      "&:hover": { bgcolor: "#d97706" },
                    }}>
                    Add
                  </Button>
                </Paper>
              ))}
            </Stack>
          ) : substituteSearchInput && substituteSearchInput.length >= 2 ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <InventoryIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
              <Typography color="text.secondary" fontWeight={600}>
                No matches found
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Try a shorter name, salt name (e.g. "paracetamol"),<br />
                or check your spelling
              </Typography>
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <SearchIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
              <Typography color="text.secondary" fontSize={14}>
                Type a medicine name above to search
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                We'll check your inventory first, then the global catalog
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={closeSubstituteDialog} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const Row = ({ label, value, color }) => (
  <Stack direction="row" justifyContent="space-between">
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={color ? { color } : undefined}>
      {value}
    </Typography>
  </Stack>
);