import React, { useEffect, useState } from "react";
import axios from "axios";

import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Grid,
} from "@mui/material";
import TablePagination from "@mui/material/TablePagination";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";

const TestsPage = () => {
  const [tests, setTests] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [formData, setFormData] = useState({
    test_name: "",
    test_type: "",
    description: "",
  });

  /* ================= FETCH TESTS ================= */
  const fetchTests = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_SITE_URL}/api/tests`,
        { withCredentials: true }
      );
      setTests(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  /* ================= HANDLE INPUT ================= */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

    const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /* ================= OPEN MODAL ================= */
  const handleOpen = (test = null) => {
    if (test) {
      setFormData(test);
      setEditingId(test.id);
    } else {
      setFormData({
        test_name: "",
        test_type: "",
        description: "",
      });
      setEditingId(null);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    try {
      if (editingId) {
        await axios.put(
          `${process.env.REACT_APP_SITE_URL}/api/tests/${editingId}`,
          formData,
          { withCredentials: true }
        );
      } else {
        await axios.post(
          `${process.env.REACT_APP_SITE_URL}/api/tests`,
          formData,
          { withCredentials: true }
        );
      }

      handleClose();
      fetchTests();
    } catch (error) {
      console.error(error);
      alert("Error saving test");
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this test?")) return;

    try {
      await axios.delete(
        `${process.env.REACT_APP_SITE_URL}/api/tests/${id}`,
        { withCredentials: true }
      );
      fetchTests();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: "100vh" }}>
      {/* ================= HEADER ================= */}
      <Paper elevation={0} sx={{ p: 3, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Medical Tests
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Manage lab tests, imaging & diagnostics
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{
              backgroundColor: "#3f6f7a",
              borderRadius: 3,
              px: 3,
              "&:hover": { backgroundColor: "#3f6f7a" },
            }}
          >
            Add Test
          </Button>
        </Box>
      </Paper>

      {/* ================= TABLE ================= */}
      <Paper sx={{ borderRadius: 4 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#3f6f7a" }}>
                <TableCell sx={{ color: "#fff" }}><b>Test Name</b></TableCell>
                <TableCell sx={{ color: "#fff" }}><b>Type</b></TableCell>
                <TableCell sx={{ color: "#fff" }}><b>Description</b></TableCell>
                <TableCell sx={{ color: "#fff" }} align="center"><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
          {tests
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((test) => (
                <TableRow key={test.id} hover>
                  <TableCell>{test.test_name}</TableCell>
                  <TableCell>{test.test_type}</TableCell>
                  <TableCell>{test.description}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleOpen(test)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(test.id)}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {tests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    No tests added yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
        component="div"
        count={tests.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5]}
      />
      </Paper>

      {/* ================= DIALOG ================= */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
          }}
        >
          {editingId ? "Edit Test" : "Add New Test"}
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Test Name"
                name="test_name"
                value={formData.test_name}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Test Type"
                name="test_type"
                value={formData.test_type}
                onChange={handleChange}
              />
            </Grid>

           <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              inputProps={{
                style: {
                  whiteSpace: "nowrap",
                  overflowX: "auto",
                },
              }}
              sx={{
                "& input": {
                  overflowX: "auto",
                },
              }}
            />
          </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              background: "linear-gradient(135deg, #3f6f7a, #5f9aa6)",
              borderRadius: 3,
            }}
          >
            {editingId ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestsPage;