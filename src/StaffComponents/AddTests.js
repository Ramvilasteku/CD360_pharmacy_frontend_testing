import React, { useEffect, useState } from "react";
import {
  Box, Card, CardContent, Grid, Typography, Select, MenuItem,
  TextField, Button, IconButton, Table, TableHead, TableRow,
  TableCell, TableBody, Paper, TableContainer, Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

const inputStyle = {
  width: "100%", height: 44,
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

const thSx = { fontWeight: 600, color: "#3f6f7a", fontSize: "0.8125rem" };
const tdSx = { fontSize: "0.875rem" };

const empty = { test_name: "", test_type: "", description: "" };

export default function AddTest({ onTestsChange, initialTests = [] }) {
  const [allTests, setAllTests] = useState([]);
  const [list, setList] = useState(initialTests);
  const [editIndex, setEditIndex] = useState(null);
  const [showForm, setShowForm] = useState(initialTests.length === 0);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (initialTests.length > 0) { setList(initialTests); setShowForm(false); }
  }, [initialTests]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_SITE_URL}/api/tests`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setAllTests(d.data || []));
  }, []);

  const selectTest = (name) => {
    const t = allTests.find(x => x.test_name === name);
    if (!t) return;
    setForm({ test_name: t.test_name, test_type: t.test_type || "", description: t.description || "" });
  };

  const save = () => {
    if (!form.test_name) { alert("Select a test"); return; }
    setList(prev => {
      const newList = editIndex !== null ? prev.map((t, i) => i === editIndex ? form : t) : [...prev, form];
      onTestsChange(newList);
      return newList;
    });
    setForm(empty); setEditIndex(null); setShowForm(false);
  };

  const edit = (i) => { setForm(list[i]); setEditIndex(i); setShowForm(true); };

  const remove = (i) => {
    const updated = list.filter((_, idx) => idx !== i);
    setList(updated); onTestsChange(updated);
    if (editIndex === i) { setForm(empty); setEditIndex(null); setShowForm(false); }
  };

  const cancel = () => { setForm(empty); setEditIndex(null); setShowForm(false); };

  return (
    <Box>
      {/* ── TABLE ── */}
      {list.length > 0 && (
        <Box mb={showForm ? 3 : 0}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#3f6f7a" }}>
              Tests
              <Chip label={list.length} size="small"
                sx={{ ml: 1, backgroundColor: "#3f6f7a", color: "#fff", fontSize: "0.72rem", height: 18 }} />
            </Typography>
            {!showForm && (
              <Button startIcon={<AddIcon />} onClick={() => { setForm(empty); setEditIndex(null); setShowForm(true); }}
                sx={{ height: 36, backgroundColor: "#3f6f7a", color: "#fff", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600, textTransform: "none", "&:hover": { backgroundColor: "#2e5560" } }}>
                Add Test
              </Button>
            )}
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: "10px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f0f7f9" }}>
                  <TableCell sx={thSx}>#</TableCell>
                  <TableCell sx={thSx}>Test</TableCell>
                  <TableCell sx={thSx}>Type</TableCell>
                  <TableCell sx={thSx}>Description</TableCell>
                  <TableCell align="center" sx={thSx}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((t, i) => (
                  <TableRow key={i}
                    sx={{ "&:hover": { backgroundColor: "#f9fafb" }, backgroundColor: editIndex === i ? "#f0f9f8" : "inherit", transition: "background 0.15s" }}>
                    <TableCell sx={{ ...tdSx, color: "#9ca3af" }}>{i + 1}</TableCell>
                    <TableCell sx={{ ...tdSx, fontWeight: 600 }}>{t.test_name}</TableCell>
                    <TableCell sx={tdSx}>{t.test_type || "—"}</TableCell>
                    <TableCell sx={tdSx}>{t.description || "—"}</TableCell>
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
        <Card sx={{ borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: editIndex !== null ? "1.5px solid #3f6f7a" : "1px solid #e5e7eb" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
              <Typography variant="h6" sx={{ color: "#3f6f7a", fontWeight: 600 }}>
                {editIndex !== null ? `Editing Row ${editIndex + 1}` : "Add Test"}
              </Typography>
              {list.length > 0 && (
                <IconButton onClick={cancel} size="small" sx={{ color: "#6b7280" }}><CloseIcon fontSize="small" /></IconButton>
              )}
            </Box>

            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>Test Name</Typography>
                <Select displayEmpty value={form.test_name} onChange={(e) => selectTest(e.target.value)} sx={selectStyle}>
                  <MenuItem value="" sx={{ color: "#9ca3af", fontSize: "0.875rem" }}>Select Test</MenuItem>
                  {allTests.map(t => <MenuItem key={t.id} value={t.test_name} sx={{ fontSize: "0.875rem" }}>{t.test_name}</MenuItem>)}
                </Select>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>Test Type</Typography>
                <TextField placeholder="Test Type" value={form.test_type} InputProps={{ readOnly: true }} sx={inputStyle} />
              </Grid>

              <Grid item xs={12} md={5}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>Description</Typography>
                <TextField placeholder="Description" value={form.description} InputProps={{ readOnly: true }} sx={inputStyle} />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
                  <Button onClick={save}
                    sx={{ height: 44, px: 3, backgroundColor: "#3f6f7a", color: "#fff", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, textTransform: "none", "&:hover": { backgroundColor: "#2e5560" } }}>
                    {editIndex !== null ? "Update Test" : "Add Test"}
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

      {list.length === 0 && !showForm && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Button startIcon={<AddIcon />} onClick={() => setShowForm(true)}
            sx={{ height: 44, px: 3, backgroundColor: "#3f6f7a", color: "#fff", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, textTransform: "none", "&:hover": { backgroundColor: "#2e5560" } }}>
            Add Test
          </Button>
        </Box>
      )}
    </Box>
  );
}