import React, { useEffect, useState } from "react";
import {
  Box, Card, CardContent, Grid, TextField, Select, MenuItem,
  Button, Typography, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip,
} from "@mui/material";
import { Checkbox, FormControlLabel } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { Autocomplete } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import debounce from "lodash.debounce";
import { useMemo } from "react";

const inputStyle = {
  width: "100%",
  height: 44,
  "& .MuiInputBase-root": { height: 44, borderRadius: "8px", backgroundColor: "#f9fafb", fontSize: "0.875rem" },
  "& .MuiOutlinedInput-root": {
    height: 44, borderRadius: "8px", backgroundColor: "#f9fafb",
    "& fieldset": { borderColor: "#d1d5db" },
    "&:hover fieldset": { borderColor: "#3f6f7a" },
    "&.Mui-focused fieldset": { borderColor: "#3f6f7a" },
  },
  "& .MuiInputLabel-root": { fontSize: "0.875rem", "&.Mui-focused": { color: "#3f6f7a" } },
};

const selectStyle = {
  width: "100%", height: 44, borderRadius: "8px", backgroundColor: "#f9fafb", fontSize: "0.875rem",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#d1d5db" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#3f6f7a" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3f6f7a" },
  "& .MuiSelect-select": { display: "flex", alignItems: "center", padding: "0 14px", height: "44px !important", minHeight: "unset" },
};

const thSx = { fontWeight: 600, color: "#3f6f7a", fontSize: "0.8125rem", whiteSpace: "nowrap" };
const tdSx = { fontSize: "0.875rem" };

const empty = {
  medicine_id: "", medicine_name: "", type: "", strength: "",
  unit: "", quantity: 1, when_to_take: [], duration: "", description: "",
};

const normalizeWhen = (val) => {
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "string") return val.split(",").map(v => v.trim()).join(", ");
  return "—";
};

export default function AddMedicine({ onMedicinesChange, initialMedicines = [] }) {
  const [dbMeds, setDbMeds] = useState([]);
  const [options, setOptions] = useState({ types: [], strengths: [], units: [], durations: [], when_to_take: [] });
  const [list, setList] = useState(initialMedicines);
  const [editIndex, setEditIndex] = useState(null);
  const [showForm, setShowForm] = useState(initialMedicines.length === 0);
  const [form, setForm] = useState(empty);
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  useEffect(() => {
    if (initialMedicines.length > 0) { setList(initialMedicines); setShowForm(false); }
  }, [initialMedicines]);

  const f = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetch(`${process.env.REACT_APP_SITE_URL}/api/medicines/options`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOptions(d.options || {});
        }
      });
  }, []);

  const searchMedicines = async (search = "") => {
    try {
      setMedicineLoading(true);

      const res = await fetch(
        `${process.env.REACT_APP_SITE_URL}/api/medicines/search?search=${encodeURIComponent(
          search
        )}&page=1&limit=20`,
        {
          credentials: "include",
        }
      );

      const data = await res.json();

      if (data.success) {
        setDbMeds(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMedicineLoading(false);
    }
  };

  const debouncedSearch = useMemo(
    () => debounce(searchMedicines, 400),
    []
  );

  useEffect(() => {
    searchMedicines(""); // Load first 20 medicines
  }, []);

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const selectMedicine = (medicine) => {
    if (!medicine) {
      setSelectedMedicine(null);
      setForm(empty);
      return;
    }

    setSelectedMedicine(medicine);

    setForm((prev) => ({
      ...prev,
      medicine_id: medicine.id,
      medicine_name: medicine.medicine_name,
      type: medicine.type || "",
      strength: medicine.strength || "",
      unit: medicine.unit || "",
      quantity: prev.quantity,
      when_to_take: medicine.when_to_take || [],
      duration: medicine.duration || "",
      description: medicine.description || "",
    }));
  };

  const toggleWhen = (value) => {
    const exists = form.when_to_take.includes(value);
    f("when_to_take", exists ? form.when_to_take.filter(v => v !== value) : [...form.when_to_take, value]);
  };

  const save = () => {
    if (!form.medicine_name) { alert("Medicine required"); return; }
    const updated = { ...form, quantity: Number(form.quantity) };
    setList(prev => {
      const newList = editIndex !== null ? prev.map((m, i) => i === editIndex ? updated : m) : [...prev, updated];
      onMedicinesChange(newList);
      return newList;
    });
    setForm(empty); setEditIndex(null); setShowForm(false);
    setSelectedMedicine(null);
    setDbMeds([]);
  };

  const remove = (i) => {
    const updated = list.filter((_, idx) => idx !== i);
    setList(updated); onMedicinesChange(updated);
    if (editIndex === i) { setForm(empty); setEditIndex(null); setShowForm(false); }
  };

  const edit = (i) => {
    setForm({ ...list[i], when_to_take: list[i].when_to_take || [] });
    setEditIndex(i); setShowForm(true);
    // Let React render the form first, then scroll to it within the scrollable panel
    setTimeout(() => {
      document.getElementById("med-form-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const cancel = () => { setForm(empty); setEditIndex(null); setShowForm(false); };

  return (
    <Box>
      {/* ── TABLE ── */}
      {list.length > 0 && (
        <Box mb={showForm ? 3 : 0}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#3f6f7a" }}>
              Medicines
              <Chip label={list.length} size="small"
                sx={{ ml: 1, backgroundColor: "#3f6f7a", color: "#fff", fontSize: "0.72rem", height: 18 }} />
            </Typography>
            {!showForm && (
              <Button startIcon={<AddIcon />} onClick={() => { setForm(empty); setEditIndex(null); setShowForm(true); }}
                sx={{ height: 36, backgroundColor: "#3f6f7a", color: "#fff", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600, textTransform: "none", "&:hover": { backgroundColor: "#2e5560" } }}>
                Add Medicine
              </Button>
            )}
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: "10px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f0f7f9" }}>
                  <TableCell sx={thSx}>#</TableCell>
                  <TableCell sx={thSx}>Medicine</TableCell>
                  {/* <TableCell sx={thSx}>Type</TableCell>
                  <TableCell sx={thSx}>Strength</TableCell> */}
                  <TableCell sx={thSx}>Qty</TableCell>
                  <TableCell sx={thSx}>When</TableCell>
                  <TableCell sx={thSx}>Duration</TableCell>
                  <TableCell sx={thSx}>Notes</TableCell>
                  <TableCell align="center" sx={thSx}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((m, i) => (
                  <TableRow key={i}
                    sx={{ "&:hover": { backgroundColor: "#f9fafb" }, backgroundColor: editIndex === i ? "#f0f9f8" : "inherit", transition: "background 0.15s" }}>
                    <TableCell sx={{ ...tdSx, color: "#9ca3af" }}>{i + 1}</TableCell>
                    <TableCell sx={{ ...tdSx, fontWeight: 600 }}>{m.medicine_name}</TableCell>
                    {/* <TableCell sx={tdSx}>{m.type || "—"}</TableCell>
                    <TableCell sx={tdSx}>{m.strength ? `${m.strength}${m.unit || ""}` : "—"}</TableCell> */}
                    <TableCell sx={tdSx}>{m.quantity}</TableCell>
                    <TableCell sx={tdSx}>{normalizeWhen(m.when_to_take)}</TableCell>
                    <TableCell sx={tdSx}>{m.duration || "—"}</TableCell>
                    <TableCell sx={tdSx}>{m.description || "—"}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton onClick={() => edit(i)} size="small" sx={{ color: "#3f6f7a" }} title="Edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => remove(i)} size="small" color="error" title="Delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <Card id="med-form-anchor" sx={{ borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: editIndex !== null ? "1.5px solid #3f6f7a" : "1px solid #e5e7eb" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
              <Typography variant="h6" sx={{ color: "#3f6f7a", fontWeight: 600 }}>
                {editIndex !== null ? `Editing Row ${editIndex + 1}` : "Add Medicine"}
              </Typography>
              {list.length > 0 && (
                <IconButton onClick={cancel} size="small" sx={{ color: "#6b7280" }}><CloseIcon fontSize="small" /></IconButton>
              )}
            </Box>

            <Grid container spacing={2} alignItems="flex-start">
              <Grid item
                size={{
                  xs: 12,
                  sm: 12,
                  md: 6,
                  lg: 12,
                  xl: 12,
                }}
              >
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>Medicine Name</Typography>
                <Autocomplete
                  fullWidth
                  options={dbMeds}
                  loading={medicineLoading}
                  value={selectedMedicine}
                  filterOptions={(x) => x}
                  getOptionLabel={(option) => option?.medicine_name || ""}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(event, value) => {
                    selectMedicine(value);
                  }}
                  onOpen={() => {
                    searchMedicines("");
                  }}
                  onInputChange={(event, value, reason) => {
                    if (reason === "input") {
                      debouncedSearch(value);
                    }
                  }}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box sx={{ py: 0.5 }}>
                        <Typography fontWeight={600}>
                          {option.medicine_name}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {option.type || ""}

                          {option.strength
                            ? ` • ${option.strength}${option.unit || ""}`
                            : ""}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search medicine..."
                      sx={inputStyle}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {medicineLoading && (
                              <CircularProgress
                                size={18}
                                color="inherit"
                              />
                            )}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* <Grid item xs={6} md={2}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>Type</Typography>
                <Select value={form.type} displayEmpty onChange={(e) => f("type", e.target.value)} sx={selectStyle}>
                  <MenuItem value="" sx={{ color: "#9ca3af", fontSize: "0.875rem" }}>Type</MenuItem>
                  {options.types?.map(v => <MenuItem key={v} value={v} sx={{ fontSize: "0.875rem" }}>{v}</MenuItem>)}
                </Select>
              </Grid>

              <Grid item xs={6} md={2}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>Strength</Typography>
                <Autocomplete freeSolo options={options.strengths || []} value={form.strength || ""}
                  onChange={(e, v) => f("strength", v)} onInputChange={(e, v) => f("strength", v)}
                  renderInput={(params) => <TextField {...params} placeholder="Strength" sx={inputStyle} />}
                  sx={{ "& .MuiAutocomplete-inputRoot": { padding: "0 !important" }, width: 70 }} />
              </Grid>

              <Grid item xs={6} md={2}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>Unit</Typography>
                <Select value={form.unit} displayEmpty onChange={(e) => f("unit", e.target.value)} sx={selectStyle}>
                  <MenuItem value="" sx={{ color: "#9ca3af", fontSize: "0.875rem" }}>Unit</MenuItem>
                  {options.units?.map(v => <MenuItem key={v} value={v} sx={{ fontSize: "0.875rem" }}>{v}</MenuItem>)}
                </Select>
              </Grid> */}

              <Grid item xs={6} md={2}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>Qty / Dose</Typography>
                <TextField type="number" placeholder="Qty" value={form.quantity} onChange={(e) => f("quantity", e.target.value)} sx={inputStyle} />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 1, display: "block" }}>When to Take</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, p: 1.5, borderRadius: "8px", backgroundColor: "#f9fafb", border: "1px solid #d1d5db" }}>
                  {options.when_to_take?.map(time => (
                    <FormControlLabel key={time}
                      label={<Typography sx={{ fontSize: "0.875rem", color: "#374151" }}>{time}</Typography>}
                      control={<Checkbox checked={form.when_to_take.includes(time)} onChange={() => toggleWhen(time)} size="small"
                        sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#3f6f7a" } }} />}
                      sx={{ mr: 1 }} />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>Duration</Typography>
                <Autocomplete freeSolo options={options.durations || []} value={form.duration || ""}
                  onChange={(e, v) => f("duration", v || "")} onInputChange={(e, v) => f("duration", v)}
                  renderInput={(params) => <TextField {...params} placeholder="Select or type" sx={inputStyle} />}
                  sx={{ "& .MuiAutocomplete-inputRoot": { padding: "0 !important" }, width: 150 }} />
              </Grid>

              <Grid item xs={6} md={3}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>Notes</Typography>
                <TextField placeholder="Notes" value={form.description} onChange={(e) => f("description", e.target.value)} sx={inputStyle} />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
                  <Button onClick={save}
                    sx={{ height: 44, px: 3, backgroundColor: "#3f6f7a", color: "#fff", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, textTransform: "none", "&:hover": { backgroundColor: "#2e5560" } }}>
                    {editIndex !== null ? "Update Medicine" : "Add Medicine"}
                  </Button>
                  {list.length > 0 && (
                    <Button onClick={cancel}
                      sx={{ height: 44, px: 3, border: "1px solid #d1d5db", color: "#6b7280", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, textTransform: "none", "&:hover": { backgroundColor: "#f9fafb" } }}>
                      Cancel
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* ── Empty + no form ── */}
      {list.length === 0 && !showForm && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Button startIcon={<AddIcon />} onClick={() => setShowForm(true)}
            sx={{ height: 44, px: 3, backgroundColor: "#3f6f7a", color: "#fff", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, textTransform: "none", "&:hover": { backgroundColor: "#2e5560" } }}>
            Add Medicine
          </Button>
        </Box>
      )}
    </Box>
  );
}