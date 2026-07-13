import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

const inputStyle = {
  width: "100%",
  height: 44,
  "& .MuiInputBase-root": { height: 44, borderRadius: "8px", backgroundColor: "#f9fafb", fontSize: "0.875rem" },
  "& .MuiOutlinedInput-root": {
    height: 44,
    borderRadius: "8px",
    backgroundColor: "#f9fafb",
    "& fieldset": { borderColor: "#d1d5db" },
    "&:hover fieldset": { borderColor: "#3f6f7a" },
    "&.Mui-focused fieldset": { borderColor: "#3f6f7a" },
  },
  "& .MuiInputLabel-root": { fontSize: "0.875rem", "&.Mui-focused": { color: "#3f6f7a" } },
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
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    setList(initialTests);
    setShowForm(initialTests.length === 0);
  }, [initialTests]);

  useEffect(() => {
    setLoading(true);
    setFetchError("");
    fetch(`${process.env.REACT_APP_SITE_URL}/api/tests`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load tests");
        return r.json();
      })
      .then((d) => setAllTests(d.data || []))
      .catch(() => setFetchError("Could not load tests. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (form.test_name && !selectedTest && allTests.length > 0) {
      const match = allTests.find((t) => t.test_name === form.test_name);
      if (match) setSelectedTest(match);
    }
  }, [allTests, form.test_name, selectedTest]);

  const findTestByName = (name) => allTests.find((t) => t.test_name === name) || null;

  const resetForm = (closeForm = true) => {
    setForm(empty);
    setSelectedTest(null);
    setFormError("");
    setEditIndex(null);
    if (closeForm) setShowForm(false);
  };

  const openAddForm = () => {
    setForm(empty);
    setSelectedTest(null);
    setFormError("");
    setEditIndex(null);
    setShowForm(true);
  };

  const save = () => {
    if (!form.test_name) {
      setFormError("Please select a test");
      return;
    }

    const isDuplicate = list.some(
      (t, i) => t.test_name === form.test_name && i !== editIndex
    );
    if (isDuplicate) {
      setFormError("This test is already in the list");
      return;
    }

    setFormError("");
    setList((prev) => {
      const newList =
        editIndex !== null
          ? prev.map((t, i) => (i === editIndex ? form : t))
          : [...prev, form];
      onTestsChange(newList);
      return newList;
    });
    resetForm();
  };

  const edit = (i) => {
    const item = list[i];
    setForm(item);
    setSelectedTest(findTestByName(item.test_name));
    setFormError("");
    setEditIndex(i);
    setShowForm(true);
  };

  const remove = (i) => {
    const updated = list.filter((_, idx) => idx !== i);
    setList(updated);
    onTestsChange(updated);

    if (editIndex === i) {
      resetForm();
    } else if (editIndex !== null && i < editIndex) {
      setEditIndex(editIndex - 1);
    }
  };

  const cancel = () => resetForm();

  return (
    <Box>
      {list.length > 0 && (
        <Box mb={showForm ? 3 : 0}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#3f6f7a" }}>
              Tests
              <Chip
                label={list.length}
                size="small"
                sx={{ ml: 1, backgroundColor: "#3f6f7a", color: "#fff", fontSize: "0.72rem", height: 18 }}
              />
            </Typography>
            {!showForm && (
              <Button
                startIcon={<AddIcon />}
                onClick={openAddForm}
                sx={{
                  height: 36,
                  backgroundColor: "#3f6f7a",
                  color: "#fff",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#2e5560" },
                }}
              >
                Add Test
              </Button>
            )}
          </Box>

          <TableContainer
            component={Paper}
            sx={{ borderRadius: "10px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}
          >
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
                  <TableRow
                    key={`${t.test_name}-${i}`}
                    sx={{
                      "&:hover": { backgroundColor: "#f9fafb" },
                      backgroundColor: editIndex === i ? "#f0f9f8" : "inherit",
                      transition: "background 0.15s",
                    }}
                  >
                    <TableCell sx={{ ...tdSx, color: "#9ca3af" }}>{i + 1}</TableCell>
                    <TableCell sx={{ ...tdSx, fontWeight: 600 }}>{t.test_name}</TableCell>
                    <TableCell sx={tdSx}>{t.test_type || "—"}</TableCell>
                    <TableCell sx={tdSx}>{t.description || "—"}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton onClick={() => edit(i)} size="small" sx={{ color: "#3f6f7a" }} title="Edit" aria-label="Edit test">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => remove(i)} size="small" color="error" title="Delete" aria-label="Delete test">
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

      {showForm && (
        <Card
          sx={{
            borderRadius: "12px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            border: editIndex !== null ? "1.5px solid #3f6f7a" : "1px solid #e5e7eb",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
              <Typography variant="h6" sx={{ color: "#3f6f7a", fontWeight: 600 }}>
                {editIndex !== null ? `Editing Row ${editIndex + 1}` : "Add Test"}
              </Typography>
              {list.length > 0 && (
                <IconButton onClick={cancel} size="small" sx={{ color: "#6b7280" }} aria-label="Close form">
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {fetchError && (
              <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                {fetchError}
              </Typography>
            )}

            <Grid container spacing={2} alignItems="flex-start">
              <Grid item size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>
                  Test Name
                </Typography>
                <Autocomplete
                  fullWidth
                  loading={loading}
                  disabled={loading || !!fetchError}
                  options={allTests}
                  value={selectedTest}
                  getOptionLabel={(option) => option?.test_name || ""}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) => {
                    setSelectedTest(value);
                    setFormError("");
                    if (value) {
                      setForm({
                        test_name: value.test_name,
                        test_type: value.test_type || "",
                        description: value.description || "",
                      });
                    } else {
                      setForm(empty);
                    }
                  }}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props;
                    return (
                      <Box component="li" key={key} {...rest}>
                        <Box>
                          <Typography fontWeight={600}>{option.test_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.test_type || ""}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search Test..."
                      error={!!formError}
                      helperText={formError}
                      sx={inputStyle}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>
                  Test Type
                </Typography>
                <TextField placeholder="Test Type" value={form.test_type} InputProps={{ readOnly: true }} sx={inputStyle} disabled />
              </Grid>

              <Grid item size={{ xs: 12, md: 5 }}>
                <Typography variant="caption" sx={{ color: "#6b7280", mb: 0.5, display: "block" }}>
                  Description
                </Typography>
                <TextField placeholder="Description" value={form.description} InputProps={{ readOnly: true }} sx={inputStyle} disabled />
              </Grid>

              <Grid item size={12}>
                <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
                  <Button
                    onClick={save}
                    disabled={loading || !!fetchError}
                    sx={{
                      height: 44, px: 3, backgroundColor: "#3f6f7a", color: "#fff",
                      borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600,
                      textTransform: "none", "&:hover": { backgroundColor: "#2e5560" },
                    }}
                  >
                    {editIndex !== null ? "Update Test" : "Add Test"}
                  </Button>
                  {list.length > 0 && (
                    <Button
                      onClick={cancel}
                      sx={{
                        height: 44, px: 3, border: "1px solid #d1d5db", color: "#6b7280",
                        borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600,
                        textTransform: "none", "&:hover": { backgroundColor: "#f9fafb" },
                      }}
                    >
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
          <Button
            startIcon={<AddIcon />}
            onClick={openAddForm}
            sx={{
              height: 44, px: 3, backgroundColor: "#3f6f7a", color: "#fff",
              borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600,
              textTransform: "none", "&:hover": { backgroundColor: "#2e5560" },
            }}
          >
            Add Test
          </Button>
        </Box>
      )}
    </Box>
  );
}