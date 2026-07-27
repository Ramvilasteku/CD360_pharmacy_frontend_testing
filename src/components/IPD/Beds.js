import React, { useEffect, useMemo, useState, useCallback } from "react";

import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Snackbar,
  Alert,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
} from "@mui/material";

import {
  Add,
  Edit,
  Delete,
  Search,
  Bed,
  PanoramaFishEye,
  RemoveRedEyeOutlined,
  RememberMeRounded,
  RemoveRedEye,
} from "@mui/icons-material";

import { DataGrid } from "@mui/x-data-grid";

import NorthEastIcon from "@mui/icons-material/NorthEast";

// viewModal
import { Stack, Chip, Divider } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MeetingRoom from "@mui/icons-material/MeetingRoom";
import LocalHospital from "@mui/icons-material/LocalHospital";
import Business from "@mui/icons-material/Business";
import CurrencyRupee from "@mui/icons-material/CurrencyRupee";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import Update from "@mui/icons-material/Update";

const Beds = () => {
  const [beds, setBeds] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);

  const [editId, setEditId] = useState(null);

  const [search, setSearch] = useState("");

  const [branchFilter, setBranchFilter] = useState("all");

  const [wardTypeFilter, setWardTypeFilter] = useState("all");

  const [formData, setFormData] = useState({
    room_id: "",
    bed_number: "",
    bed_charge: "",
    bed_status: "available",
    branch_name: "",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ================= SNACKBAR =================

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  // ================= FETCH BEDS =================

  const fetchBeds = useCallback(async () => {
    try {
      setLoading(true);

      /* ================= 3 SEC DELAY ================= */
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const response = await fetch(
        `${process.env.REACT_APP_URL_IPD}/api/getall/beds`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.ok) {
        setBeds(data.data || []);
      } else {
        showSnackbar(data.message || "Failed to fetch beds", "error");
      }
    } catch (error) {
      console.log(error);
      showSnackbar("Server Error", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // ================= FETCH ROOMS =================

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_URL_IPD}/api/getall/rooms`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.ok) {
        setRooms(data.data || []);
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    fetchBeds();
    fetchRooms();
  }, [fetchBeds, fetchRooms]);

  const filteredRooms = useMemo(() => {
    if (!formData.branch_name) return [];

    return rooms.filter(
      (room) =>
        room.branch_name?.toLowerCase() === formData.branch_name?.toLowerCase(),
    );
  }, [rooms, formData.branch_name]);

  // ================= HANDLE CHANGE =================

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "branch_name") {
      setFormData((prev) => ({
        ...prev,
        branch_name: value,
        room_id: "", // reset room when branch changes
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  // ================= ADD =================

  const handleAdd = () => {
    setEditId(null);

    setFormData({
      room_id: "",
      bed_number: "",
      bed_charge: "",
      bed_status: "available",
      branch_name: "",
    });

    setOpenModal(true);
  };

  // ================= EDIT =================

  const handleEdit = (row) => {
    setEditId(row.id);

    setFormData({
      room_id: row.room_id || "",
      bed_number: row.bed_number || "",
      bed_charge: row.bed_charge || "",
      bed_status: row.bed_status || "available",
      branch_name: row.branch_name || "",
    });

    setOpenModal(true);
  };

  // ================= SUBMIT =================

  const handleSubmit = async () => {
    try {
      if (!formData.room_id) {
        return showSnackbar("Please Select Room", "warning");
      }

      if (!formData.bed_number) {
        return showSnackbar("Please Enter Bed Number", "warning");
      }

      const url = editId
        ? `${process.env.REACT_APP_URL_IPD}/api/update/bed/${editId}`
        : `${process.env.REACT_APP_URL_IPD}/api/post/bed`;

      const method = editId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        showSnackbar(
          editId ? "Bed Updated Successfully" : "Bed Added Successfully",
        );

        setOpenModal(false);

        fetchBeds();
      } else {
        showSnackbar(data.message || "Something went wrong", "error");
      }
    } catch (error) {
      console.log(error);

      showSnackbar("Server Error", "error");
    }
  };

  // ================= DELETE =================

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this bed?",
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_URL_IPD}/api/delete/bed/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.ok) {
        showSnackbar("Bed Deleted Successfully");

        fetchBeds();
      } else {
        showSnackbar(data.message || "Delete Failed", "error");
      }
    } catch (error) {
      console.log(error);

      showSnackbar("Server Error", "error");
    }
  };

  // ================= UNIQUE BRANCHES =================

  const uniqueBranches = useMemo(() => {
    const branchMap = new Map();

    beds.forEach((item) => {
      const originalBranch = item.branch_name || "";

      const normalizedBranch = originalBranch.trim().toLowerCase();

      if (!branchMap.has(normalizedBranch)) {
        branchMap.set(
          normalizedBranch,
          originalBranch
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase()),
        );
      }
    });

    return Array.from(branchMap.values());
  }, [beds]);

  // ================= UNIQUE WARD TYPES =================

  const uniqueWardType = useMemo(() => {
    const wardTypeMap = new Map();

    beds.forEach((item) => {
      const originalWardType = item.ward_type_name || "";

      const normalizedWardType = originalWardType.trim().toLowerCase();

      if (!wardTypeMap.has(normalizedWardType)) {
        wardTypeMap.set(
          normalizedWardType,
          originalWardType
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase()),
        );
      }
    });

    return Array.from(wardTypeMap.values());
  }, [beds]);

  // ================= FILTER DATA =================

  const filteredData = useMemo(() => {
    return beds.filter((item) => {
      const matchesSearch = item.bed_number
        ?.toLowerCase()
        .includes(search.toLowerCase());

      const matchesBranch =
        branchFilter === "all"
          ? true
          : item.branch_name?.toLowerCase() === branchFilter.toLowerCase();

      const matchesWardType =
        wardTypeFilter === "all"
          ? true
          : item.ward_type_name?.toLowerCase() === wardTypeFilter.toLowerCase();

      return matchesSearch && matchesBranch && matchesWardType;
    });
  }, [beds, search, branchFilter, wardTypeFilter]);

  // ================= VIEW DETAILS =================

  const [viewModal, setViewModal] = useState(false);

  const [selectedBed, setSelectedBed] = useState(null);

  const handleView = (row) => {
    setSelectedBed(row);
    setViewModal(true);
  };

  const Detail = ({ icon, label, children }) => (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          color: "#0F7C7C",
          display: "flex",
          alignItems: "center",
        }}
      >
        {icon}
      </Box>

      <Typography variant="body2">
        <b>{label}:</b> {children}
      </Typography>
    </Stack>
  );

  // ========================= Highlight Text =========================

  const highlightText = (text) => {
    if (!search) return text;

    const regex = new RegExp(`(${search})`, "gi");

    const parts = String(text || "").split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span
          key={index}
          style={{
            backgroundColor: "yellow",
            fontWeight: 700,
            padding: "0",
          }}
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  // ================= COLUMNS =================

  const columns = [
    {
      field: "id",
      headerName: "ID",
      width: 80,
    },

    {
      field: "bed_number",
      headerName: "Bed Number",
      flex: 1,
      minWidth: 180,

      renderCell: (params) => (
        <Typography>{highlightText(params.value)}</Typography>
      ),
    },

    {
      field: "room_number",
      headerName: "Room Number",
      flex: 1,
      minWidth: 140,
    },

    {
      field: "ward_type_name",
      headerName: "Ward Type",
      flex: 1,
      minWidth: 180,
    },

    {
      field: "branch_name",
      headerName: "Branch Name",
      flex: 1,
      minWidth: 180,
    },

    {
      field: "bed_charge",
      headerName: "Bed Charge",
      flex: 1,
      minWidth: 80,
    },

    {
      field: "bed_status",
      headerName: "Status",
      flex: 1,
      minWidth: 80,
    },

    // {
    //   field: "created_at",
    //   headerName: "Created Date",
    //   flex: 0.8,
    //   minWidth: 130,

    //   renderCell: (params) =>
    //     new Date(params.row.created_at).toLocaleDateString(),
    // },

    // {
    //   field: "updated_at",
    //   headerName: "Updated Date",
    //   flex: 0.8,
    //   minWidth: 130,

    //   renderCell: (params) =>
    //     new Date(params.row.updated_at).toLocaleDateString(),
    // },

    {
      field: "actions",
      headerName: "Actions",
      width: 140,
      sortable: false,

      renderCell: (params) => (
        <Box>
          {/* <Typography
            sx={{
              color: "#4992db",
              cursor: "pointer",
              py: 2,
              fontWeight: 600,
              textDecorationLine: "underline",
            }}
            onClick={() => handleView(params.row)}
          >
            {params.row.id}
            <NorthEastIcon sx={{ fontSize: "16px" }} />
          </Typography> */}

          <Tooltip title="View">
            <IconButton color="success" onClick={() => handleView(params.row)}>
              <RemoveRedEye fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit">
            <IconButton color="primary" onClick={() => handleEdit(params.row)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete">
            <IconButton
              color="error"
              onClick={() => handleDelete(params.row.id)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        p: 1.5,
        background: "#f4f6f8",
        minHeight: "60vh",
        borderRadius: "16px",
      }}
    >
      {/* ================= HEADER ================= */}

      <Card
        sx={{
          mb: 1,
          borderRadius: "16px",
          boxShadow: 3,
        }}
      >
        <CardContent
          sx={{
            py: 1.5,
            px: 1.5,
            height: "62px",
          }}
        >
          <Grid container spacing={2} alignItems="center">
            {/* ================= TOTAL BEDS ================= */}

            <Grid item xs={12} md="auto">
              <Card
                sx={{
                  borderRadius: "8px",
                  background: "linear-gradient(180deg, #3f6f7a, #5f9aa6)",
                  color: "#fff",
                  boxShadow: 2,
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                }}
              >
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={1}
                >
                  <Bed sx={{ fontSize: 20 }} />

                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    Total Beds :
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                  >
                   {filteredData.length}
                  </Typography>
                </Box>
              </Card>
            </Grid>

            {/* ================= FILTERS ================= */}

            <Grid item xs={12} md={9}>
              <Box
                display="flex"
                justifyContent={{ xs: "start", md: "end" }}
                gap={2}
                flexWrap="wrap"
              >
                <TextField
                  size="small"
                  placeholder="Search Bed Number"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Branch</InputLabel>

                  <Select
                    value={branchFilter}
                    label="Branch"
                    onChange={(e) => setBranchFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Branches</MenuItem>

                    {uniqueBranches.map((branch, index) => (
                      <MenuItem key={index} value={branch}>
                        {branch}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Ward Type</InputLabel>

                  <Select
                    value={wardTypeFilter}
                    label="Ward Type"
                    onChange={(e) => setWardTypeFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Ward Types</MenuItem>

                    {uniqueWardType.map((ward, index) => (
                      <MenuItem key={index} value={ward}>
                        {ward}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAdd}
                  sx={{
                    textTransform: "none",
                    background: "linear-gradient(180deg, #3f6f7a, #5f9aa6)",
                  }}
                >
                  Add Bed
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ================= TABLE ================= */}

      <Card
        sx={{
          borderRadius: "16px",
          boxShadow: 3,
        }}
      >
        <CardContent>
          {loading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3, 4, 5].map((item) => (
                <Box
                  key={item}
                  sx={{
                    display: "flex",
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Skeleton variant="rounded" width="10%" height={40} />

                  <Skeleton variant="rounded" width="20%" height={40} />

                  <Skeleton variant="rounded" width="30%" height={40} />

                  <Skeleton variant="rounded" width="25%" height={40} />

                  <Skeleton variant="rounded" width="20%" height={40} />

                  <Skeleton variant="rounded" width="15%" height={40} />

                  <Skeleton variant="rounded" width="15%" height={40} />
                </Box>
              ))}
            </Box>
          ) : (
            <DataGrid
              rows={filteredData}
              columns={columns}
              autoHeight
              pageSizeOptions={[5, 10, 20]}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 5,
                  },
                },
              }}
              disableRowSelectionOnClick
              sx={{
                "& .MuiDataGrid-columnHeaderTitle": {
                  color: "#3f6f7a",
                  fontWeight: 700,
                },

                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                  {
                    marginTop: "0px",
                    marginBottom: "0px",
                  },

                borderRadius: "10px",
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* ================= MODAL ================= */}

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #3f6f7a, #5f9aa6)",
            color: "#fff",
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            {editId ? "Update Bed" : "Add New Bed"}
          </Typography>

          <Button
            onClick={() => setOpenModal(false)}
            sx={{
              minWidth: 0,
              width: 34,
              height: 34,
              borderRadius: "10%",
              backgroundColor: "#3F6F7A",
              color: "#fff",
              fontSize: "18px",
              fontWeight: "bold",
              "&:hover": {
                backgroundColor: "#ef1414",
              },
            }}
          >
            ✕
          </Button>
        </DialogTitle>

        <Divider />

        {/* Content */}
        <DialogContent sx={{ p: 3, mt: 1 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Branch</InputLabel>
                <Select
                  name="branch_name"
                  value={formData.branch_name}
                  label="Branch"
                  onChange={handleChange}
                  sx={{ width: "265px" }}
                >
                  {uniqueBranches.map((branch, index) => (
                    <MenuItem key={index} value={branch}>
                      {branch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Room</InputLabel>
                <Select
                  name="room_id"
                  value={formData.room_id}
                  label="Room"
                  onChange={handleChange}
                  sx={{ width: "265px" }}
                >
                  {filteredRooms.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.room_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bed Number"
                name="bed_number"
                value={formData.bed_number}
                onChange={handleChange}
                sx={{ width: "170px" }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Bed Charge"
                name="bed_charge"
                value={formData.bed_charge}
                onChange={handleChange}
                sx={{ width: "170px" }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="bed_status"
                  value={formData.bed_status}
                  label="Status"
                  onChange={handleChange}
                  sx={{ width: "170px" }}
                >
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="occupied">Occupied</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

        {/* Footer */}
        <DialogActions
          sx={{
            px: 3,
            py: 1.5,
            gap: 1,
            bgcolor: "#fafafa",
          }}
        >
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              borderRadius: 2,
              px: 4,
              textTransform: "none",
              fontWeight: 600,
              background: "linear-gradient(135deg, #3f6f7a, #5f9aa6)",
              boxShadow: "0 8px 20px rgba(63,111,122,0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #355d67, #4c8792)",
                transform: "translateY(-1px)",
              },
            }}
          >
            {editId ? "Update Bed" : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================= VIEW MODAL ================= */}

      <Dialog
        open={viewModal}
        onClose={() => setViewModal(false)}
        maxWidth="sm"
        fullWidth
      >
        {/* HEADER */}

        <DialogTitle
          sx={{
            bgcolor: "#e8f4f4",
            color: "#0F7C7C",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
          }}
        >
          {selectedBed ? `#${selectedBed.id} Bed Details` : "Bed Details"}

          <IconButton
            onClick={() => setViewModal(false)}
            sx={{ color: "#0F7C7C" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* CONTENT */}

        <DialogContent sx={{ p: 3 }}>
          {selectedBed && (
            <Stack spacing={2}>
              {/* BED ID */}

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  pt: 2,
                }}
              >
                <Typography fontWeight={600}>Bed Status</Typography>

                <Chip
                  label={selectedBed.bed_status}
                  sx={{
                    bgcolor:
                      selectedBed.bed_status === "available"
                        ? "#0F7C7C"
                        : selectedBed.bed_status === "occupied"
                          ? "#d32f2f"
                          : "#ed6c02",

                    color: "#fff",
                    textTransform: "capitalize",
                    fontSize: 12,
                  }}
                />
              </Box>

              <Divider />

              {/* DETAILS */}

              <Stack spacing={1.5}>
                <Detail icon={<Bed sx={{ fontSize: 20 }} />} label="Bed Number">
                  {selectedBed.bed_number}
                </Detail>

                <Detail
                  icon={<MeetingRoom sx={{ fontSize: 20 }} />}
                  label="Room Number"
                >
                  {selectedBed.room_number}
                </Detail>

                <Detail
                  icon={<LocalHospital sx={{ fontSize: 20 }} />}
                  label="Ward Type"
                >
                  {selectedBed.ward_type_name}
                </Detail>

                <Detail
                  icon={<Business sx={{ fontSize: 20 }} />}
                  label="Branch"
                >
                  {selectedBed.branch_name}
                </Detail>

                <Detail
                  icon={<CurrencyRupee sx={{ fontSize: 20 }} />}
                  label="Bed Charge"
                >
                  ₹ {selectedBed.bed_charge}
                </Detail>

                <Detail
                  icon={<CalendarMonth sx={{ fontSize: 20 }} />}
                  label="Created Date"
                >
                  {new Date(selectedBed.created_at).toLocaleDateString()}
                </Detail>

                <Detail
                  icon={<Update sx={{ fontSize: 20 }} />}
                  label="Updated Date"
                >
                  {new Date(selectedBed.updated_at).toLocaleDateString()}
                </Detail>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= SNACKBAR ================= */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={1500}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        onClose={() =>
          setSnackbar((prev) => ({
            ...prev,
            open: false,
          }))
        }
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Beds;
