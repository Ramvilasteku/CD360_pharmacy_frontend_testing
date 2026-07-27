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

import {
  Add,
  Edit,
  Delete,
  Search,
  Refresh,
  LocalHospital,
  Folder,
} from "@mui/icons-material";

import { DataGrid } from "@mui/x-data-grid";

const WardType = () => {
  const [wardTypes, setWardTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);

  const [editId, setEditId] = useState(null);

  const [search, setSearch] = useState("");

  const [branches, setBranches] = useState([]);

  const [branchFilter, setBranchFilter] = useState("all");

  const [pageSize, setPageSize] = useState(5);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [formData, setFormData] = useState({
    ward_type_name: "",
    branch_name: "",
  });

  // ========================= SNACKBAR =========================

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  // ========================= FETCH DATA =========================

  const fetchWardTypes = useCallback(async () => {
    try {
      setLoading(true);

      /* ================= 3 SEC DELAY ================= */
      await new Promise((resolve) => setTimeout(resolve, 1500));

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
      } else {
        showSnackbar(data.message || "Failed to fetch ward types", "error");
      }
    } catch (error) {
      console.log(error);

      showSnackbar("Server Error", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================= GET BRANCH =========================

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
  useEffect(() => {
    fetchWardTypes();
    fetchBranches();
  }, [fetchWardTypes]);

  // ========================= HANDLE CHANGE =========================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ========================= ADD =========================

  const handleAdd = () => {
    setEditId(null);

    setFormData({
      ward_type_name: "",
      branch_name: "",
    });

    setOpenModal(true);
  };

  // ========================= EDIT =========================

  const handleEdit = (row) => {
    setEditId(row.id);

    setFormData({
      ward_type_name: row.ward_type_name || "",
      branch_name: row.branch_name || "",
    });

    setOpenModal(true);
  };

  // ========================= SUBMIT =========================

  const handleSubmit = async () => {
    try {
      if (!formData.ward_type_name) {
        return showSnackbar("Please Enter Ward Type Name", "warning");
      }

      if (!formData.branch_name) {
        return showSnackbar("Please Enter Branch Name", "warning");
      }
      console.log("REACT_APP_URL_IPD:", process.env.REACT_APP_URL_IPD);
      const url = editId
        ? `${process.env.REACT_APP_URL_IPD}/api/update/wardtype/${editId}`
        : `${process.env.REACT_APP_URL_IPD}/api/post/wardtype`;

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
          editId
            ? "Ward Type Updated Successfully"
            : "Ward Type Added Successfully",
        );

        setOpenModal(false);

        fetchWardTypes();
      } else {
        showSnackbar(data.message || "Something went wrong", "error");
      }
    } catch (error) {
      console.log(error);

      showSnackbar("Server Error", "error");
    }
  };

  // ========================= DELETE =========================

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this ward type?",
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_URL_IPD}/api/delete/wardtype/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.ok) {
        showSnackbar("Ward Type Deleted Successfully");

        fetchWardTypes();
      } else {
        showSnackbar(data.message || "Delete Failed", "error");
      }
    } catch (error) {
      console.log(error);

      showSnackbar("Server Error", "error");
    }
  };

  // ========================= UNIQUE BRANCHES =========================

  const uniqueBranches = useMemo(() => {
    const branchMap = new Map();

    wardTypes.forEach((item) => {
      const originalBranch = item.branch_name || "";

      const normalizedBranch = originalBranch.trim().toLowerCase();

      if (!branchMap.has(normalizedBranch)) {
        branchMap.set(
          normalizedBranch,
          originalBranch
            .toLowerCase()
            .replace(/\\b\\w/g, (char) => char.toUpperCase()),
        );
      }
    });

    return Array.from(branchMap.values());
  }, [wardTypes]);

  // ========================= FILTER DATA =========================

  const filteredData = useMemo(() => {
    return wardTypes.filter((item) => {
      const matchesSearch = item.ward_type_name
        ?.toLowerCase()
        .includes(search.toLowerCase());

      const matchesBranch =
        branchFilter === "all"
          ? true
          : item.branch_name?.toLowerCase() === branchFilter.toLowerCase();

      return matchesSearch && matchesBranch;
    });
  }, [wardTypes, search, branchFilter]);

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

  // ========================= DATAGRID COLUMNS =========================

  const columns = [
    {
      field: "id",
      headerName: "ID",
      width: 80,
    },

    {
      field: "ward_type_name",
      headerName: "Ward Type Name",
      flex: 1,
      minWidth: 220,
      renderCell: (params) => (
        <Typography>{highlightText(params.value)}</Typography>
      ),
    },

    {
      field: "branch_name",
      headerName: "Branch Name",
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Typography>
          {highlightText(
            params.row.branch_name
              ?.toLowerCase()
              .replace(/\b\w/g, (char) => char.toUpperCase()),
          )}
        </Typography>
      ),
    },

    {
      field: "created_at",
      headerName: "Created Date",
      flex: 1,
      minWidth: 180,

      renderCell: (params) =>
        new Date(params.row.created_at).toLocaleDateString(),
    },
    {
      field: "updated_at",
      headerName: "Updated Date",
      flex: 1,
      minWidth: 180,

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
            {/* ================= TOTAL WARD TYPES BOX ================= */}

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
                  <LocalHospital sx={{ fontSize: 20 }} />

                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    Total Ward Types :
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
                  placeholder="Search Ward Type"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
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
                        {branch.charAt(0).toUpperCase() +
                          branch.slice(1).toLowerCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  sx={{
                    textTransform: "none",
                    background: "linear-gradient(180deg, #3f6f7a, #5f9aa6)",
                  }}
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAdd}
                >
                  Add Ward Type
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

                  <Skeleton variant="rounded" width="30%" height={40} />

                  <Skeleton variant="rounded" width="30%" height={40} />

                  <Skeleton variant="rounded" width="15%" height={40} />

                  <Skeleton variant="rounded" width="15%" height={40} />

                  <Skeleton variant="rounded" width="15%" height={40} />
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ width: "100%" }}>
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
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ================= ADD / EDIT MODAL ================= */}

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
            {editId ? "Update Ward Type" : "Add Ward Type"}
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
              <FormControl>
                <InputLabel>Select Branch</InputLabel>

                <Select
                  name="branch_name"
                  value={formData.branch_name}
                  onChange={handleChange}
                  label="Select Branch"
                  sx={{
                    borderRadius: 2,
                    backgroundColor: "#fafafa",
                    width: "200px",
                  }}
                >
                  {branches.map((branch, index) => (
                    <MenuItem key={index} value={branch}>
                      {branch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>{" "}
            <Grid item xs={12}>
              <TextField
                label="Ward Type Name"
                name="ward_type_name"
                value={formData.ward_type_name}
                onChange={handleChange}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: "#fafafa",
                  },
                  width: "200px",
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
            {editId ? "Update Ward Type" : "Submit"}
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

export default WardType;
