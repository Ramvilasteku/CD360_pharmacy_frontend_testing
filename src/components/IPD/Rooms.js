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
  Divider,
} from "@mui/material";

import { Add, Edit, Delete, Search, MeetingRoom } from "@mui/icons-material";

import { DataGrid } from "@mui/x-data-grid";

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [wardTypes, setWardTypes] = useState([]);

  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);

  const [editId, setEditId] = useState(null);

  const [search, setSearch] = useState("");

  const [branches, setBranches] = useState([]);

  const [branchFilter, setBranchFilter] = useState("all");
  const [wardTypeFilter, setWardTypeFilter] = useState("all");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [formData, setFormData] = useState({
    room_number: "",
    branch_name: "",
    ward_type_id: "",
  });

  // ================= SNACKBAR =================

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  // ================= FETCH ROOMS =================

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);

      /* ================= 3 SEC DELAY ================= */
      await new Promise((resolve) => setTimeout(resolve, 1500));

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
      } else {
        showSnackbar(data.message || "Failed to fetch rooms", "error");
      }
    } catch (error) {
      console.log(error);
      showSnackbar("Server Error", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // ================= FETCH WARD TYPES =================

  const fetchWardTypes = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_URL_IPD}/api/getall/wardtype`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.ok) {
        setWardTypes(data.data || []);
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_URL}/api/staff/get`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.ok) {
        // UNIQUE BRANCHES
        const uniqueBranches = [
          ...new Set(data.data.map((item) => item.branch)),
        ];

        setBranches(uniqueBranches);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const filteredWardTypes = useMemo(() => {
    if (!formData.branch_name) return [];

    return wardTypes.filter(
      (item) =>
        item.branch_name?.toLowerCase() === formData.branch_name?.toLowerCase(),
    );
  }, [wardTypes, formData.branch_name]);

  useEffect(() => {
    fetchRooms();
    fetchWardTypes();
    fetchBranches();
  }, [fetchRooms, fetchWardTypes]);

  // ================= HANDLE CHANGE =================

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "branch_name") {
      setFormData((prev) => ({
        ...prev,
        branch_name: value,
        ward_type_id: "", // reset ward when branch changes
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
      room_number: "",
      ward_type_id: "",
      branch_name: "",
    });

    setOpenModal(true);
  };

  // ================= EDIT =================

  const handleEdit = (row) => {
    setEditId(row.id);

    setFormData({
      room_number: row.room_number || "",
      ward_type_id: row.ward_type_id || "",
      branch_name: row.branch_name || "",
    });

    setOpenModal(true);
  };

  // ================= SUBMIT =================

  const handleSubmit = async () => {
    try {
      if (!formData.room_number) {
        return showSnackbar("Please Enter Room Number", "warning");
      }

      if (!formData.ward_type_id) {
        return showSnackbar("Please Select Ward Type", "warning");
      }

      const url = editId
        ? `${process.env.REACT_APP_URL_IPD}/api/update/room/${editId}`
        : `${process.env.REACT_APP_URL_IPD}/api/post/room`;

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
          editId ? "Room Updated Successfully" : "Room Added Successfully",
        );

        setOpenModal(false);

        fetchRooms();
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
      "Are you sure you want to delete this room?",
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_URL_IPD}/api/delete/room/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.ok) {
        showSnackbar("Room Deleted Successfully");

        fetchRooms();
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

    rooms.forEach((item) => {
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
  }, [rooms]);

  // ================= UNIQUE WARD TPE =================

  const uniqueWardType = useMemo(() => {
    const wardTypeMap = new Map();

    rooms.forEach((item) => {
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
  }, [rooms]);

  // ================= FILTER DATA =================

  const filteredData = useMemo(() => {
    return rooms.filter((item) => {
      const matchesSearch = item.room_number
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
  }, [rooms, search, branchFilter, wardTypeFilter]);

  // ================= Highlight Text =================

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
      field: "room_number",
      headerName: "Room Number",
      flex: 1,
      minWidth: 180,

      renderCell: (params) => (
        <Typography>{highlightText(params.value)}</Typography>
      ),
    },

    {
      field: "ward_type_name",
      headerName: "Ward Type",
      flex: 1,
      minWidth: 220,
    },

    {
      field: "branch_name",
      headerName: "Branch Name",
      flex: 1,
      minWidth: 180,
    },

    {
      field: "created_at",
      headerName: "Created Date",
      flex: 0.6,
      minWidth: 100,

      renderCell: (params) =>
        new Date(params.row.created_at).toLocaleDateString(),
    },

    {
      field: "updated_at",
      headerName: "Updated Date",
      flex: 0.6,
      minWidth: 100,

      renderCell: (params) =>
        new Date(params.row.updated_at).toLocaleDateString(),
    },

    {
      field: "actions",
      headerName: "Actions",
      width: 140,
      sortable: false,

      renderCell: (params) => (
        <Box>
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
            {/* ================= TOTAL ROOMS ================= */}

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
                  <MeetingRoom sx={{ fontSize: 20 }} />

                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    Total Rooms :
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

            {/* ================= SEARCH + FILTER ================= */}

            <Grid item xs={12} md={9}>
              <Box
                display="flex"
                justifyContent={{ xs: "start", md: "end" }}
                gap={2}
                flexWrap="wrap"
              >
                <TextField
                  size="small"
                  placeholder="Search Room Number"
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
                  Add Room
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ================= DATAGRID ================= */}

      <Card
        sx={{
          borderRadius: "16px",
          boxShadow: 3,
          p: 0,
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

                  <Skeleton variant="rounded" width="25%" height={40} />

                  <Skeleton variant="rounded" width="25%" height={40} />

                  <Skeleton variant="rounded" width="25%" height={40} />

                  <Skeleton variant="rounded" width="15%" height={40} />

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
                  width: "100%",
                  textAlign: "center",
                },

                /* ================= CENTER HEADER ================= */
                "& .MuiDataGrid-columnHeader": {
                  justifyContent: "center",
                },

                /* ================= CENTER CELL CONTENT ================= */
                "& .MuiDataGrid-cell": {
                  display: "flex",
                  alignItems: "center",
                  // justifyContent: "center",
                  // textAlign: "center",
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
            {editId ? "Update Room" : "Add Room"}
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
                  sx={{
                    borderRadius: 2,
                    backgroundColor: "#fafafa",
                    width: "160px",
                  }}
                >
                  {branches.map((branch, index) => (
                    <MenuItem key={index} value={branch}>
                      {branch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Ward Type</InputLabel>
                <Select
                  name="ward_type_id"
                  value={formData.ward_type_id}
                  label="Ward Type"
                  onChange={handleChange}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: "#fafafa",
                    width: "160px",
                  }}
                >
                  {filteredWardTypes.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.ward_type_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Room Number"
                name="room_number"
                value={formData.room_number}
                onChange={handleChange}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: "#fafafa",
                  },
                  width: "160px",
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

        {/* Footer */}
        <DialogActions
          sx={{
            px: 3,
            py: 1.5,
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
            {editId ? "Update Room" : "Submit"}
          </Button>
        </DialogActions>
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

export default Rooms;
