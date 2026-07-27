import React, { useEffect, useState, useMemo, useCallback } from "react";

import {
  Box,
  Button,
  Modal,
  Typography,
  TextField,
  IconButton,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  CircularProgress,
  Card,
  Grid,
  Skeleton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import { LocalHospital } from "@mui/icons-material";
import { InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import IpdDetailModal from "./IPDAdmissionModals/IpdDetailModal";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 700,
  bgcolor: "background.paper",
  borderRadius: "20px",
  boxShadow: 24,
  p: 4,
  maxHeight: "90vh",
  overflowY: "auto",
};

function IPDAdmissions() {
  // =========================================
  // STATES
  // =========================================

  const [ipdAdmissions, setIpdAdmissions] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    patient_name: "",
    doctor_name: "",
    ward_type: "",
    room_number: "",
    bed_number: "",
    admission_date: "",
    admission_time: "",
    admission_status: "Admitted",
    symptoms: "",
  });

  // =========================================
  // MODAL HANDLERS
  // =========================================

  const handleOpen = () => setOpen(true);

  const handleClose = () => setOpen(false);

  // =========================================
  // FORM CHANGE
  // useCallback Optimization
  // =========================================

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // =========================================
  // FETCH IPD ADMISSIONS
  // =========================================
  const fetchIPDAdmissions = async (searchText = "") => {
    try {
      setLoading(true);

      /* ================= 3 SEC DELAY ================= */
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let url = `${process.env.REACT_APP_URL_IPD}/api/get/ipdadmission`;

      if (searchText.trim()) {
        url = `${process.env.REACT_APP_URL_IPD}/api/search/ipdadmission?search=${encodeURIComponent(searchText)}`;
      }

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setIpdAdmissions(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchIPDAdmissions(search);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search]);

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

  // =========================================
  // DATAGRID COLUMNS
  // =========================================

  const columns = [
    {
      field: "id",
      headerName: "IPD ID",
      width: 120,

      renderCell: (params) => (
        <Typography
          onClick={() => setDetailAdmission(params.row)}
          sx={{
            color: "#2563eb",
            cursor: "pointer",
            fontWeight: 700,
            py: 1.8,
            textDecoration: "underline",
          }}
        >
          {highlightText(params.value)}
        </Typography>
      ),
    },

    {
      field: "client_name",
      headerName: "Patient Name",
      flex: 0.8,
      renderCell: (params) => (
        <Typography>{highlightText(params.value)}</Typography>
      ),
    },

    {
      field: "doctor_name",
      headerName: "Doctor",
      flex: 0.6,

      renderCell: (params) => (
        <Typography>{highlightText(params.value)}</Typography>
      ),
    },

    {
      field: "branch_name",
      headerName: "Branch Name",
      flex: 0.6,

      renderCell: (params) => (
        <Typography>{highlightText(params.value)}</Typography>
      ),
    },

    {
      field: "admission_date",
      headerName: "Admission Date",
      width: 150,

      renderCell: (params) => (
        <Typography>
          {highlightText(new Date(params.row.created_at).toLocaleDateString())}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,

      renderCell: (params) => (
        <span
          style={{
            color: params.value === "Admitted" ? "green" : "red",

            fontWeight: 600,
          }}
        >
          {highlightText(params.value)}
        </span>
      ),
    },
  ];

  // =========================================
  // View Modal
  // =========================================

  const [detailAdmission, setDetailAdmission] = useState(null);

  // =========================================
  // JSX
  // =========================================

  return (
    <Box
      sx={{
        p: 2,
        background: "#f4f6f8",
        minHeight: "70vh",
        borderRadius: "16px",
      }}
    >
      {/* ================================= */}
      {/* TOP HEADER */}
      {/* ================================= */}
      <Card
        sx={{
          mb: 1.5,
          borderRadius: "16px",
          boxShadow: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: "9vh",
            gap: 2,
            mr: 1,
          }}
        >
          <Card
            sx={{
              borderRadius: "0",
              background: "linear-gradient(180deg, #3f6f7a, #5f9aa6)",
              color: "#fff",
              boxShadow: 2,
              height: "9vh",
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
              <LocalHospital sx={{ fontSize: 25 }} />

              <Typography
                sx={{
                  fontSize: "18px",
                  fontWeight: 500,
                }}
              >
                Total IPD Admissions :
              </Typography>

              <Typography
                sx={{
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                {ipdAdmissions.length}
              </Typography>
            </Box>
          </Card>

          <TextField
            size="small"
            label="Search IPD Details"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon sx={{ color: "#64748b" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: {
                xs: "100%",
                sm: "400px",
              },
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                backgroundColor: "#fff",
              },
            }}
          />
        </Box>
      </Card>

      {/* ================================= */}
      {/* DATAGRID */}
      {/* ================================= */}

      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
        }}
      >
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
                <Skeleton variant="rounded" width="15%" height={40} />

                <Skeleton variant="rounded" width="25%" height={40} />

                <Skeleton variant="rounded" width="20%" height={40} />

                <Skeleton variant="rounded" width="20%" height={40} />

                <Skeleton variant="rounded" width="20%" height={40} />
              </Box>
            ))}
          </Box>
        ) : (
          <DataGrid
            rows={loading ? [] : ipdAdmissions}
            columns={columns}
            loading={loading}
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
            slots={{
              loadingOverlay: () => (
                <Box
                  sx={{
                    width: "100%",
                    p: 2,
                  }}
                >
                  {[1, 2, 3, 4, 5].map((item) => (
                    <Box
                      key={item}
                      sx={{
                        display: "flex",
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Skeleton variant="rounded" width="15%" height={40} />

                      <Skeleton variant="rounded" width="25%" height={40} />

                      <Skeleton variant="rounded" width="20%" height={40} />

                      <Skeleton variant="rounded" width="20%" height={40} />

                      <Skeleton variant="rounded" width="20%" height={40} />
                    </Box>
                  ))}
                </Box>
              ),
            }}
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
      </Box>

      {/* ================================= */}
      {/* ADD MODAL */}
      {/* ================================= */}

      {detailAdmission && (
        <IpdDetailModal
          admission={detailAdmission}
          onClose={() => setDetailAdmission(null)}
        />
      )}
    </Box>
  );
}

export default React.memo(IPDAdmissions);
