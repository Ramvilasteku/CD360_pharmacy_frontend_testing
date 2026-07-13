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
  Checkbox,
  Autocomplete
} from "@mui/material";
import TablePagination from "@mui/material/TablePagination";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import { DataGrid } from "@mui/x-data-grid";

const MedicinesPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medicine_name: "",
    type: "",
    strength: "",
    unit: "",
    quantity: 1,
    amount: "",
    when_to_take: [],
    duration: "",
    description: "",
  });

  const columns = [
    {
      field: "medicine_name",
      headerName: "Medicine",
      flex: 1.5,
      minWidth: 180,
    },
    // {
    //   field: "type",
    //   headerName: "Type",
    //   flex: 1,
    //   minWidth: 120,
    // },
    // {
    //   field: "strength",
    //   headerName: "Strength",
    //   flex: 1,
    //   minWidth: 100,
    // },
    // {
    //   field: "unit",
    //   headerName: "Unit",
    //   flex: 0.8,
    //   minWidth: 80,
    // },
    {
      field: "quantity",
      headerName: "Qty",
      type: "number",
      flex: 0.8,
      minWidth: 90,
    },
    {
      field: "amount",
      headerName: "Amount (₹)",
      type: "number",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "when_to_take",
      headerName: "When To Take",
      flex: 1.5,
      minWidth: 180,
      valueGetter: (value) =>
        Array.isArray(value) ? value.join(", ") : value || "",
    },
    {
      field: "duration",
      headerName: "Duration",
      flex: 1,
      minWidth: 120,
    },
    // {
    //   field: "actions",
    //   headerName: "Actions",
    //   sortable: false,
    //   filterable: false,
    //   width: 140,
    //   renderCell: (params) => (
    //     <>
    //       <IconButton
    //         color="primary"
    //         onClick={() => handleOpen(params.row)}
    //       >
    //         <EditIcon />
    //       </IconButton>

    //       <IconButton
    //         color="error"
    //         onClick={() => handleDelete(params.row.id)}
    //       >
    //         <DeleteIcon />
    //       </IconButton>
    //     </>
    //   ),
    // },
  ];

  const whenToTakeOptions = ["Morning", "Afternoon", "Night"];

  /* ================= FETCH ================= */
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_SITE_URL}/api/medicines/search-all`,
        { withCredentials: true }
      );
      setMedicines(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  /* ================= INPUT ================= */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedMedicines = medicines.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  /* ================= OPEN MODAL ================= */
  const handleOpen = (medicine = null) => {
    if (medicine) {
      setFormData({
        ...medicine,
        when_to_take: Array.isArray(medicine.when_to_take)
          ? medicine.when_to_take
          : medicine.when_to_take?.split(",").map(v => v.trim()) || []
      });
      setEditingId(medicine.id);
    } else {
      setFormData({
        medicine_name: "",
        type: "",
        strength: "",
        unit: "",
        quantity: 1,
        amount: "",
        when_to_take: [],
        duration: "",
      });
      setEditingId(null);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        amount: Number(formData.amount),
        when_to_take: formData.when_to_take,
      };

      if (editingId) {
        await axios.put(
          `${process.env.REACT_APP_SITE_URL}/api/medicines/${editingId}`,
          payload,
          { withCredentials: true }
        );
      } else {
        await axios.post(
          `${process.env.REACT_APP_SITE_URL}/api/medicines`,
          payload,
          { withCredentials: true }
        );
      }

      handleClose();
      fetchMedicines();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "An error occurred while saving the medicine.");
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this medicine?")) return;

    try {
      await axios.delete(
        `${process.env.REACT_APP_SITE_URL}/api/medicines/${id}`,
        { withCredentials: true }
      );
      fetchMedicines();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 0,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Medicine Management
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{
            backgroundColor: "#3f6f7a",
            "&:hover": { backgroundColor: "#2f5560" },
          }}
        >
          Add Medicine
        </Button>
      </Box>

      {/* Table */}
      {/* <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: "#3f6f7a" }}>
            <TableRow>
              <TableCell sx={{ color: "#ffffff" }}><b>Name</b></TableCell>
              <TableCell sx={{ color: "#ffffff" }}><b>Type</b></TableCell>
              <TableCell sx={{ color: "#ffffff" }}><b>Strength</b></TableCell>
              <TableCell sx={{ color: "#ffffff" }}><b>Unit</b></TableCell>
              <TableCell sx={{ color: "#ffffff" }}><b>Quantity</b></TableCell>
              <TableCell sx={{ color: "#ffffff" }}><b>Amount</b></TableCell>
              <TableCell sx={{ color: "#ffffff" }}><b>When To Take</b></TableCell>
              <TableCell sx={{ color: "#ffffff" }}><b>Duration</b></TableCell>
              <TableCell sx={{ color: "#ffffff" }} align="center"><b>Actions</b></TableCell>
            </TableRow>
          </TableHead>
          {
            loading ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ height: 100 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                      }}
                    >
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {paginatedMedicines.map((med) => (
                  <TableRow key={med.id} hover>
                    <TableCell>{med.medicine_name}</TableCell>
                    <TableCell>{med.type}</TableCell>
                    <TableCell>{med.strength}</TableCell>
                    <TableCell>{med.unit}</TableCell>
                    <TableCell>{med.quantity}</TableCell>
                    <TableCell>{med.amount}</TableCell>
                    <TableCell>
                      {Array.isArray(med.when_to_take) ? med.when_to_take.join(", ") : ""}
                    </TableCell>
                    <TableCell>{med.duration}</TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" onClick={() => handleOpen(med)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(med.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}

                {medicines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No medicines added yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            )
          }

        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={medicines.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      /> */}

      <Box
        sx={{
          height: 500,
          width: "100%",
          bgcolor: "#fff",
          borderRadius: 2,
        }}
      >
        <DataGrid
          rows={medicines}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          pageSizeOptions={[5, 10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
          }}
          disableRowSelectionOnClick
          sx={{
            border: 0,

            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#3f6f7a",
              color: "black",
              fontWeight: 600,
            },

            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 600,
            },

            "& .MuiDataGrid-cell": {
              alignItems: "center",
            },

            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#f8fafc",
            },
          }}
        />
      </Box>
      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          {editingId ? "Edit Medicine" : "Add New Medicine"}
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="Medicine Name" name="medicine_name"
                value={formData.medicine_name} onChange={handleChange} />
            </Grid>

            <Grid item xs={6}>
              <TextField fullWidth label="Type" name="type"
                value={formData.type} onChange={handleChange} />
            </Grid>

            <Grid item xs={6}>
              <TextField fullWidth label="Strength" name="strength"
                value={formData.strength} onChange={handleChange} />
            </Grid>

            <Grid item xs={6}>
              <TextField fullWidth label="Unit" name="unit"
                value={formData.unit} onChange={handleChange} />
            </Grid>

            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Quantity" name="quantity"
                value={formData.quantity} onChange={handleChange} />
            </Grid>

            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Amount" name="amount"
                value={formData.amount} onChange={handleChange} />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={whenToTakeOptions}
                value={formData.when_to_take}
                onChange={(e, val) =>
                  setFormData({ ...formData, when_to_take: val })
                }
                renderInput={(params) =>
                  <TextField {...params} label="When to Take" />
                }
              />
            </Grid>

            <Grid item xs={6}>
              <TextField fullWidth label="Duration" name="duration"
                value={formData.duration} onChange={handleChange} />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              backgroundColor: "#3f6f7a",
              "&:hover": { backgroundColor: "#2f5560" },
            }}
          >
            {editingId ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicinesPage;