// src/components/pharmacy/medicines/MedicineForm.jsx
//
// Add / edit medicine dialog. Sectioned (Medicine · Pricing & tax ·
// Pack & codes · Stock & dispensing · Return policy) with inline
// validation and a "found in your inventory" duplicate check.

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Box, Stack, Typography, Button, IconButton, TextField, MenuItem,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, Chip, Alert, CircularProgress, Skeleton, Autocomplete,
  ToggleButton, ToggleButtonGroup, Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import LinkIcon from "@mui/icons-material/Link";

import {
  API, EMPTY_FORM, CONDITION_OPTIONS, GST_SLABS, WINDOW_PRESETS, btn,
  Pill, SectionTitle, money, parsePolicy, brandIfNew, medicineLabel,
  sameMedicine, findInInventory, isDuplicateError, errMsg,
} from "./medicinesShared";

export default function MedicineForm({
  state,
  categories,
  isPhone,
  onClose,
  onSaved,
  onEditExisting,
}) {
  const { open, id: editingId, loading, initial } = state;
  const isEdit = Boolean(editingId);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // catalog search
  const [mdOptions, setMdOptions] = useState([]);
  const [mdQuery, setMdQuery] = useState("");
  const [mdLoading, setMdLoading] = useState(false);
  const [mdValue, setMdValue] = useState(null);

  // "already in your inventory" guard
  const [existing, setExisting] = useState(null);
  const [checking, setChecking] = useState(false);
  const [serverDuplicate, setServerDuplicate] = useState("");
  const pickToken = useRef(0);

  useEffect(() => {
    if (open && initial) {
      setForm({
        ...EMPTY_FORM,
        ...initial,
        return_policy: {
          ...EMPTY_FORM.return_policy,
          ...initial.return_policy,
        },
      });
      setSubmitted(false);
      setSaveError("");
      setMdValue(null);
      setMdQuery("");
      setMdOptions([]);
      setExisting(null);
      setChecking(false);
      setServerDuplicate("");
      pickToken.current += 1;
    }
  }, [open, initial]);

  // Catalog + in-inventory check in parallel
  useEffect(() => {
    let active = true;
    if (mdQuery.length < 2) {
      setMdOptions([]);
      setMdLoading(false);
      return undefined;
    }
    setMdLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [catalog, stocked] = await Promise.all([
          axios
            .get(`${API}/api/pharmacy/medicine-data/get`, {
              params: { search: mdQuery, status: "active", limit: 20 },
              withCredentials: true,
            })
            .then((res) => res.data.data || []),
          findInInventory(mdQuery).catch(() => []),
        ]);
        if (active)
          setMdOptions(
            catalog.map((o) => ({
              ...o,
              _inventory: stocked.find((r) => sameMedicine(r, o)) || null,
            }))
          );
      } catch {
        if (active) setMdOptions([]);
      } finally {
        if (active) setMdLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mdQuery]);

  const pickMedicine = async (val) => {
    const token = (pickToken.current += 1);
    setMdValue(val);
    setServerDuplicate("");
    setForm((f) => ({
      ...f,
      medicine_data_id: val?.id || null,
      medicine_data_label: val ? medicineLabel(val) : "",
    }));
    setExisting(val?._inventory || null);
    setChecking(false);
    if (!val || val._inventory) return;
    setChecking(true);
    try {
      const rows = await findInInventory(val.medicine_name);
      if (pickToken.current === token)
        setExisting(rows.find((r) => sameMedicine(r, val)) || null);
    } catch {
      /* server still refuses a duplicate on save */
    } finally {
      if (pickToken.current === token) setChecking(false);
    }
  };

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setPolicy = (patch) =>
    setForm((f) => ({ ...f, return_policy: { ...f.return_policy, ...patch } }));
  const policy = form.return_policy;

  const purchase = Number(form.purchase_price) || 0;
  const selling = Number(form.selling_price) || 0;
  const gst = Number(form.gst_percentage);
  const marginText =
    selling > 0 && purchase > 0
      ? `Margin ${money(selling - purchase)} (${Math.round(
          ((selling - purchase) / selling) * 100
        )}%)`
      : "";
  const belowCost = selling > 0 && purchase > 0 && selling < purchase;

  const errors = {
    medicine: isEdit
      ? ""
      : !form.medicine_data_id
      ? "Pick the medicine from the catalog"
      : existing
      ? "Already in your inventory"
      : serverDuplicate,
    category: !form.category_id ? "Choose a category" : "",
    gst:
      Number.isNaN(gst) || gst < 0 || gst > 100
        ? "Enter a GST between 0 and 100"
        : "",
    window:
      policy.is_returnable && !(Number(policy.window_days) >= 0)
        ? "Enter the number of days"
        : "",
  };
  const errorCount = Object.values(errors).filter(Boolean).length;
  const show = (key) => (submitted ? errors[key] : "");
  const duplicate = !isEdit && Boolean(existing);
  const dimmed = duplicate
    ? { opacity: 0.4, pointerEvents: "none", transition: "opacity .15s" }
    : { transition: "opacity .15s" };

  const handleSave = async () => {
    setSubmitted(true);
    setSaveError("");
    if (errorCount > 0) return;

    const returnPolicy = policy.is_returnable
      ? {
          is_returnable: true,
          window_days: Number(policy.window_days) || 7,
          condition: policy.condition || "unopened_only",
          requires_approval_after_window: !!policy.requires_approval_after_window,
          notes: policy.notes?.trim() || null,
        }
      : {
          is_returnable: false,
          reason:
            policy.reason?.trim() ||
            "This medicine is marked as non-returnable",
        };

    const payload = {
      medicine_data_id: form.medicine_data_id,
      category_id: form.category_id,
      manufacturer: form.manufacturer || null,
      pack_size: form.pack_size || null,
      unit: form.unit || null,
      medicine_code: form.medicine_code || null,
      barcode: form.barcode || null,
      hsn_code: form.hsn_code || null,
      gst_percentage: Number(form.gst_percentage) || 0,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      maximum_stock:
        form.maximum_stock === "" ? null : Number(form.maximum_stock),
      prescription_required: form.prescription_required,
      return_policy: returnPolicy,
      status: form.status,
    };

    setSaving(true);
    try {
      if (isEdit) {
        delete payload.medicine_data_id;
        await axios.put(
          `${API}/api/pharmacy/medicines/${editingId}`,
          payload,
          { withCredentials: true }
        );
        onSaved("Medicine updated");
      } else {
        await axios.post(
          `${API}/api/pharmacy/medicines/post`,
          payload,
          { withCredentials: true }
        );
        onSaved("Medicine added to inventory");
      }
    } catch (err) {
      if (!isEdit && isDuplicateError(err)) {
        const message = errMsg(
          err,
          "This medicine is already in your inventory"
        );
        setServerDuplicate(message);
        if (mdValue) {
          findInInventory(mdValue.medicine_name)
            .then((rows) => {
              const row = rows.find((r) => sameMedicine(r, mdValue));
              if (row) setExisting(row);
              else setSaveError(message);
            })
            .catch(() => setSaveError(message));
        } else {
          setSaveError(message);
        }
      } else {
        setSaveError(
          errMsg(err, "The medicine wasn't saved. Please try again.")
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const field = (props) => (
    <TextField
      size="small" fullWidth
      InputProps={{ sx: { borderRadius: "10px" }, ...(props.InputProps || {}) }}
      {...props}
    />
  );
  const moneyField = (label, key, extra = {}) =>
    field({
      label,
      value: form[key],
      onChange: (e) => set({ [key]: e.target.value.replace(/[^\d.]/g, "") }),
      inputProps: { inputMode: "decimal" },
      InputProps: {
        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
      },
      ...extra,
    });
  const countField = (label, key, extra = {}) =>
    field({
      label,
      value: form[key],
      onChange: (e) => set({ [key]: e.target.value.replace(/\D/g, "") }),
      inputProps: { inputMode: "numeric" },
      ...extra,
    });

  const grid = (cols) => ({ display: "grid", gap: 1.5, gridTemplateColumns: cols });

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      fullWidth
      maxWidth="md"
      fullScreen={isPhone}
      PaperProps={{ sx: { borderRadius: isPhone ? 0 : "18px" } }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: "flex", alignItems: "flex-start", gap: 1,
          borderBottom: 1, borderColor: "divider", pb: 1.5,
          pt: isPhone ? "calc(16px + env(safe-area-inset-top))" : undefined,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h2" fontWeight={700}>
            {isEdit ? "Edit medicine" : "Add medicine to inventory"}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {isEdit
              ? loading
                ? "Loading…"
                : form.medicine_data_label
              : "Pick it from the catalog, then set your price and rules"}
          </Typography>
        </Box>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          disabled={saving}
          sx={{ mt: -0.5, mr: -1 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: "20px !important" }}>
        {loading || !initial ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={44} sx={{ borderRadius: "10px" }} />
            <Box sx={grid("1fr 1fr")}>
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={40} />
            </Box>
            <Box sx={grid("repeat(4, 1fr)")}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={40} />
              ))}
            </Box>
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: "12px" }} />
          </Stack>
        ) : (
          <Stack spacing={3} divider={<Divider flexItem />}>
            {/* Medicine */}
            <Box>
              <SectionTitle>Medicine</SectionTitle>
              <Stack spacing={1.5}>
                {isEdit ? (
                  <Stack
                    direction="row" alignItems="center" spacing={1}
                    sx={{
                      px: 1.5, py: 1.25, borderRadius: "10px",
                      bgcolor: "action.hover",
                    }}
                  >
                    <LinkIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {form.medicine_data_label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Linked to the catalog — this can't be changed
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Autocomplete
                    options={mdOptions}
                    loading={mdLoading}
                    value={mdValue}
                    filterOptions={(x) => x}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    getOptionLabel={(o) =>
                      o
                        ? `${medicineLabel(o)}${
                            brandIfNew(o) ? ` (${o.brand_name})` : ""
                          }`
                        : ""
                    }
                    noOptionsText={
                      mdQuery.length < 2
                        ? "Type at least 2 letters"
                        : "Not in the catalog — add it in Medicine Catalog first"
                    }
                    onChange={(_, val) => pickMedicine(val)}
                    onInputChange={(_, val, reason) => {
                      if (reason !== "reset") setMdQuery(val);
                    }}
                    renderOption={(props, o) => (
                      <li {...props} key={o.id}>
                        <Stack
                          direction="row" alignItems="center" spacing={1.5}
                          sx={{ width: "100%", minWidth: 0 }}
                        >
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color={o._inventory ? "text.secondary" : "text.primary"}
                            >
                              {o.medicine_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {[o.brand_name, o.strength, o.dosage_form, o.generic_name]
                                .filter(Boolean)
                                .join(" · ")}
                            </Typography>
                          </Box>
                          {o._inventory && (
                            <Pill
                              tone={o._inventory.status === "inactive" ? null : "success"}
                              outlined
                              title={
                                o._inventory.status === "inactive"
                                  ? "Already in your inventory, switched off"
                                  : "Already in your inventory"
                              }
                            >
                              {o._inventory.status === "inactive"
                                ? "In inventory · off"
                                : "In inventory"}
                            </Pill>
                          )}
                        </Stack>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Medicine from catalog"
                        required
                        autoFocus={!isPhone}
                        placeholder="Search by name or brand"
                        error={Boolean(show("medicine")) && !existing}
                        helperText={
                          existing
                            ? undefined
                            : show("medicine") ||
                              (checking
                                ? "Checking your inventory…"
                                : "Can't find it? Add it in Medicine Catalog first.")
                        }
                        InputProps={{
                          ...params.InputProps,
                          sx: { borderRadius: "10px" },
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
                              {mdLoading ? <CircularProgress size={16} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
                {!isEdit && existing && (
                  <Alert
                    severity="warning"
                    sx={{ borderRadius: "10px", alignItems: "center" }}
                    action={
                      onEditExisting && (
                        <Button
                          color="inherit"
                          size="small"
                          onClick={() => onEditExisting(existing)}
                          sx={{ ...btn, whiteSpace: "nowrap" }}
                        >
                          Edit it
                        </Button>
                      )
                    }
                  >
                    <b>{form.medicine_data_label || existing.medicine_name}</b> is
                    already in your inventory
                    {existing.status === "inactive" ? " but switched off" : ""}.{" "}
                    {onEditExisting
                      ? existing.status === "inactive"
                        ? "Edit it and turn it back on instead of adding it again."
                        : "Edit it instead of adding it again."
                      : "Ask someone who can edit medicines to update it."}
                  </Alert>
                )}
                <Box
                  sx={{
                    ...grid({ xs: "1fr", sm: "1fr 1fr" }),
                    alignItems: "start",
                    ...dimmed,
                  }}
                >
                  <TextField
                    select size="small" fullWidth label="Category" required
                    value={form.category_id}
                    onChange={(e) => set({ category_id: e.target.value })}
                    error={Boolean(show("category"))}
                    helperText={show("category") || undefined}
                    InputProps={{ sx: { borderRadius: "10px" } }}
                  >
                    <MenuItem value="" disabled>
                      Choose a category
                    </MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.category_name}
                      </MenuItem>
                    ))}
                  </TextField>
                  {field({
                    label: "Manufacturer",
                    value: form.manufacturer,
                    onChange: (e) => set({ manufacturer: e.target.value }),
                  })}
                </Box>
              </Stack>
            </Box>

            {/* Pricing & tax */}
            <Box sx={dimmed}>
              <SectionTitle hint="Selling price is what the customer pays per unit at the counter">
                Pricing & tax
              </SectionTitle>
              <Box
                sx={{
                  ...grid({ xs: "1fr 1fr", sm: "1fr 1fr 1fr" }),
                  alignItems: "start",
                }}
              >
                {moneyField("Purchase price", "purchase_price")}
                {moneyField("Selling price", "selling_price", {
                  helperText: belowCost
                    ? "Below your purchase price"
                    : marginText || undefined,
                  FormHelperTextProps: {
                    sx: {
                      color: belowCost ? "warning.dark" : undefined,
                      fontWeight: belowCost ? 600 : 400,
                    },
                  },
                })}
                <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                  {field({
                    label: "GST",
                    value: form.gst_percentage,
                    onChange: (e) =>
                      set({ gst_percentage: e.target.value.replace(/[^\d.]/g, "") }),
                    inputProps: { inputMode: "decimal" },
                    error: Boolean(show("gst")),
                    helperText: show("gst") || undefined,
                    InputProps: {
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    },
                  })}
                </Box>
              </Box>
              <Stack
                direction="row" spacing={1} alignItems="center"
                sx={{ mt: 1.25, flexWrap: "wrap", rowGap: 1 }}
              >
                <Typography variant="caption" color="text.secondary">
                  GST slab
                </Typography>
                {GST_SLABS.map((g) => {
                  const active =
                    Number(form.gst_percentage) === g && form.gst_percentage !== "";
                  return (
                    <Chip
                      key={g} label={`${g}%`} size="small" clickable
                      color={active ? "primary" : "default"}
                      variant={active ? "filled" : "outlined"}
                      onClick={() => set({ gst_percentage: g })}
                      sx={{ borderRadius: "8px", fontWeight: 600 }}
                    />
                  );
                })}
              </Stack>
            </Box>

            {/* Pack & codes */}
            <Box sx={dimmed}>
              <SectionTitle>Pack & codes</SectionTitle>
              <Box sx={grid({ xs: "1fr 1fr", sm: "repeat(5, minmax(0, 1fr))" })}>
                {field({
                  label: "Pack size", placeholder: "10 tabs",
                  value: form.pack_size,
                  onChange: (e) => set({ pack_size: e.target.value }),
                })}
                {field({
                  label: "Unit", placeholder: "strip",
                  value: form.unit,
                  onChange: (e) => set({ unit: e.target.value }),
                })}
                {field({
                  label: "Medicine code",
                  value: form.medicine_code,
                  onChange: (e) => set({ medicine_code: e.target.value }),
                })}
                {field({
                  label: "Barcode",
                  value: form.barcode,
                  onChange: (e) => set({ barcode: e.target.value }),
                  inputProps: { inputMode: "numeric" },
                })}
                <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                  {field({
                    label: "HSN code",
                    value: form.hsn_code,
                    onChange: (e) => set({ hsn_code: e.target.value }),
                    inputProps: { inputMode: "numeric" },
                  })}
                </Box>
              </Box>
            </Box>

            {/* Stock & dispensing */}
            <Box sx={dimmed}>
              <SectionTitle hint="You'll see it in Low stock when it drops to the reorder level">
                Stock & dispensing
              </SectionTitle>
              <Box sx={grid({ xs: "1fr 1fr", sm: "1fr 1fr 2fr" })}>
                {countField("Reorder level", "reorder_level")}
                {countField("Max stock", "maximum_stock", { placeholder: "Optional" })}
                <Box
                  sx={{
                    gridColumn: { xs: "1 / -1", sm: "auto" },
                    display: "flex", alignItems: "center",
                    px: 1.5, borderRadius: "10px", border: 1, borderColor: "divider",
                    minHeight: 40,
                  }}
                >
                  <Switch
                    checked={form.prescription_required}
                    onChange={(e) => set({ prescription_required: e.target.checked })}
                    inputProps={{ "aria-label": "Prescription required" }}
                  />
                  <Box sx={{ ml: 0.5, py: 0.75 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Prescription required
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Check a prescription before selling
                    </Typography>
                  </Box>
                </Box>
              </Box>
              {isEdit && (
                <Stack
                  direction="row" alignItems="center"
                  sx={{
                    mt: 1.5, px: 1.5, borderRadius: "10px",
                    border: 1, borderColor: "divider",
                  }}
                >
                  <Switch
                    checked={form.status === "active"}
                    onChange={(e) =>
                      set({ status: e.target.checked ? "active" : "inactive" })
                    }
                    inputProps={{ "aria-label": "Active" }}
                  />
                  <Box sx={{ ml: 0.5, py: 0.75 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {form.status === "active" ? "Active" : "Inactive"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {form.status === "active"
                        ? "Shown in POS and billing"
                        : "Hidden from POS and billing until you turn it back on"}
                    </Typography>
                  </Box>
                </Stack>
              )}
            </Box>

            {/* Return policy */}
            <Box sx={dimmed}>
              <SectionTitle hint="Used when a pharmacist processes a sales return">
                Return policy
              </SectionTitle>
              <ToggleButtonGroup
                exclusive
                fullWidth={isPhone}
                value={policy.is_returnable ? "yes" : "no"}
                onChange={(_, v) => v && setPolicy({ is_returnable: v === "yes" })}
                size="small"
                sx={{
                  mb: 2,
                  "& .MuiToggleButton-root": {
                    textTransform: "none", fontWeight: 600, px: 2, gap: 1,
                  },
                }}
              >
                <ToggleButton value="yes" color="success">
                  <CheckCircleIcon fontSize="small" /> Returnable
                </ToggleButton>
                <ToggleButton value="no" color="error">
                  <BlockIcon fontSize="small" /> Not returnable
                </ToggleButton>
              </ToggleButtonGroup>

              {policy.is_returnable ? (
                <Stack spacing={1.5}>
                  <Box sx={grid({ xs: "1fr", sm: "1fr 1fr" })}>
                    <Box>
                      {field({
                        label: "Return window",
                        value: policy.window_days,
                        error: Boolean(show("window")),
                        helperText: show("window") || " ",
                        onChange: (e) =>
                          setPolicy({ window_days: e.target.value.replace(/\D/g, "") }),
                        inputProps: { inputMode: "numeric" },
                        InputProps: {
                          endAdornment: (
                            <InputAdornment position="end">days</InputAdornment>
                          ),
                        },
                      })}
                      <Stack direction="row" spacing={1} sx={{ mt: -0.5 }}>
                        {WINDOW_PRESETS.map((d) => {
                          const active = Number(policy.window_days) === d;
                          return (
                            <Chip
                              key={d}
                              label={`${d} days`}
                              size="small"
                              clickable
                              color={active ? "primary" : "default"}
                              variant={active ? "filled" : "outlined"}
                              onClick={() => setPolicy({ window_days: d })}
                              sx={{ borderRadius: "8px" }}
                            />
                          );
                        })}
                      </Stack>
                    </Box>
                    <TextField
                      select size="small" fullWidth label="Condition"
                      value={policy.condition}
                      onChange={(e) => setPolicy({ condition: e.target.value })}
                      helperText="What the item must look like to be taken back"
                      InputProps={{ sx: { borderRadius: "10px" } }}
                    >
                      {CONDITION_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  <Stack
                    direction="row" alignItems="center"
                    sx={{
                      px: 1.5, borderRadius: "10px",
                      border: 1, borderColor: "divider",
                    }}
                  >
                    <Switch
                      checked={policy.requires_approval_after_window}
                      onChange={(e) =>
                        setPolicy({ requires_approval_after_window: e.target.checked })
                      }
                      inputProps={{ "aria-label": "Manager can override past window" }}
                    />
                    <Box sx={{ ml: 0.5, py: 0.75 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Manager can approve late returns
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        After the window, a manager can still accept it with a reason
                      </Typography>
                    </Box>
                  </Stack>
                  {field({
                    label: "Note for the pharmacist",
                    placeholder: "e.g. Pack seal must be intact",
                    value: policy.notes,
                    onChange: (e) => setPolicy({ notes: e.target.value }),
                  })}
                </Stack>
              ) : (
                field({
                  label: "Reason shown when a return is blocked",
                  placeholder: "e.g. Injection — non-returnable per clinic policy",
                  value: policy.reason,
                  onChange: (e) => setPolicy({ reason: e.target.value }),
                  helperText:
                    "Leave empty to show “This medicine is marked as non-returnable”",
                })
              )}
            </Box>

            {saveError && (
              <Alert severity="error" sx={{ borderRadius: "10px" }}>
                {saveError}
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 }, py: 1.5, gap: 1,
          borderTop: 1, borderColor: "divider",
          justifyContent: "space-between", flexWrap: "wrap",
          pb: isPhone ? "calc(12px + env(safe-area-inset-bottom))" : 1.5,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            minWidth: 0,
            fontWeight: duplicate ? 600 : 400,
            color: duplicate
              ? "warning.dark"
              : submitted && errorCount
              ? "error.main"
              : "text.secondary",
          }}
        >
          {duplicate
            ? "Already in your inventory — no need to add it again"
            : submitted && errorCount
            ? `Fix ${errorCount} highlighted ${
                errorCount === 1 ? "field" : "fields"
              } to save`
            : ""}
        </Typography>
        <Stack
          direction="row" spacing={1}
          sx={{ flex: { xs: "1 1 100%", sm: "0 0 auto" } }}
        >
          {!isPhone && (
            <Button
              onClick={onClose}
              disabled={saving}
              sx={{ ...btn, height: 44, px: 2.5 }}
            >
              Cancel
            </Button>
          )}
          {duplicate && onEditExisting ? (
            <Button
              variant="contained" disableElevation
              onClick={() => onEditExisting(existing)}
              startIcon={<EditOutlinedIcon />}
              sx={{
                ...btn, height: 44, px: 3, fontWeight: 700,
                flex: { xs: 1, sm: "0 0 auto" },
              }}
            >
              Edit existing medicine
            </Button>
          ) : (
            <Button
              variant="contained" disableElevation
              onClick={handleSave}
              disabled={saving || loading || !initial || duplicate || checking}
              startIcon={
                saving ? <CircularProgress size={16} color="inherit" /> : null
              }
              sx={{
                ...btn, height: 44, px: 3, fontWeight: 700,
                flex: { xs: 1, sm: "0 0 auto" },
              }}
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add to inventory"}
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
