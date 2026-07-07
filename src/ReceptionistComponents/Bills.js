import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Typography,
  Pagination,
  useMediaQuery,
  Tooltip,
  IconButton,
  colors,
} from "@mui/material";
import axios from "axios";
import dayjs from "dayjs";
import DownloadForOfflineIcon from "@mui/icons-material/DownloadForOffline";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { COLORS } from "./Themes";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LaunchIcon from "@mui/icons-material/Launch";
import AppointmentDetailsModal from "./Appointments/AppointmentViewModal";
import InvoicePreviewModal from "./InvoiceModalPreview";
import AddBillModal from "./AddBillModal";
import EditIcon from "@mui/icons-material/Edit";
import EditBillModal from "./EditBillModal";

const Bills = () => {
  const isMobile = useMediaQuery("(max-width:768px)");
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 4;

  const [selectedBill, setSelectedBill] = useState(null);

  const [openAppointment, setOpenAppointment] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const handleOpenAppointment = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    setOpenAppointment(true);
  };

  // ---------------- FETCH ----------------
  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_URL}/bill/bills`, {
        withCredentials: true,
      });

      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.bills)
            ? res.data.bills
            : [];

      setBills(list);
    } catch (err) {
      console.error("Fetch bills error:", err.response || err);
      setBills([]);
    }
  };

  // ---------------- PAGINATION ----------------
  const totalPages = Math.ceil((filteredBills?.length || 0) / rowsPerPage);

  const paginatedBills = filteredBills.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  const handleDownload = async (id) => {
    try {
      if (!id) {
        alert("Invalid invoice ID");
        return;
      }

      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/invoices/${id}/download`,
        {
          withCredentials: true, // ✅ send auth cookie
          responseType: "blob", // ✅ receive PDF
        },
      );

      // ✅ Create downloadable file
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${id}.pdf`;
      document.body.appendChild(a);
      a.click();

      // cleanup
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Invoice download failed:", error);
      alert("Failed to download invoice");
    }
  };

  const [openPreview, setOpenPreview] = useState(false);
  const [previewBillId, setPreviewBillId] = useState(null);
  const handlePreview = (billId) => {
    setPreviewBillId(billId);
    setOpenPreview(true);
  };

  // Column background helper
  const colBg = (index) => ({
    backgroundColor:
      index % 2 === 0 ? `${COLORS.activeBg}` : `${COLORS.texWhite}`,
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return COLORS.success; // green
      case "pending":
        return COLORS.warning; // orange
      case "overdue":
        return COLORS.danger; // red
      case "cancelled":
        return COLORS.textGray; // default
      default:
        return; // red
    }
  };

  // ---------------- FILTER ----------------

  const [filters, setFilters] = useState({
    search: "",
    date: "",
  });

  useEffect(() => {
    let data = [...bills];

    // 🔍 Global Search (frontend only)
    if (filters.search) {
      const searchText = filters.search.toLowerCase();

      data = data.filter((bill) =>
        [
          bill.bill_id,
          bill.appointment_id,
          bill.client_id,
          bill.client_name,
          bill.doctor_name,
          bill.bill_status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchText)),
      );
    }

    // 📅 Date filter
    if (filters.date) {
      data = data.filter(
        (bill) => dayjs(bill.created_at).format("YYYY-MM-DD") === filters.date,
      );
    }

    // 📌 Default sorting (latest first)
    data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredBills(data);
    setPage(1);
  }, [filters, bills]);

  const inputSx = {
    "& .MuiInputBase-root": {
      height: 40,
      fontSize: "12px",
    },
    "& .MuiInputLabel-root": {
      fontSize: "11px",
    },
  };

  const handleReset = () => {
    setFilters({
      search: "",
      date: "",
    });
    setFilteredBills(bills);
    setPage(1);
  };

  // ---------------- Open Add Modal ----------------

  const [openAddBill, setOpenAddBill] = useState(false);

  // ---------------- Edit Modal ----------------

  const [openEdit, setOpenEdit] = useState(false);
  const [editBill, setEditBill] = useState(null);

  const handleEdit = (bill) => {
    setEditBill(bill);
    setOpenEdit(true);
  };

  return (
    <Box
      px={{ xs: 1, md: 1 }}
      sx={{
        pt: 2.8,
      }}
    >
      <Box display="flex" justifyContent="flex-end" px={2}>
        <Button
          sx={{
            bgcolor: COLORS.primary,
            color: "#fff",
            mb: { xs: 1, md: "none" },
            borderRadius: 2,
            borderTopRightRadius: 60,

            height: { xs: "38px", md: "53px" },
            width: { xs: "120px", md: "239px" },
            fontSize: { xs: "10px", md: "16px" },
            textTransform: "capitalize",
          }}
          onClick={() => setOpenAddBill(true)}
        >
          Add Bill
        </Button>
      </Box>
      {/* ================= HEADING ================= */}
      <Box
        sx={{
          bgcolor: COLORS.primary,
          color: "#fff",
          fontSize: { xs: "14px", md: "18px" },
          px: 1,
          py: 1,
          width: { xs: "70%", md: "20%" },
          borderTopRightRadius: 60,
        }}
      >
        View All Bills
      </Box>

      {/* ================= FILTER BAR (UNCHANGED) ================= */}
      {isMobile ? (
        /* ================= FILTER BAR Mobile ================= */

        <Box sx={{ width: "100%", my: 1 }}>
          {/* 🔍 Search */}
          <TextField
            size="small"
            fullWidth
            label="Search bills (Patient, Doctor, ID...)"
            placeholder="Search by patient name, doctor, bill ID.."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            sx={inputSx}
          />

          {/* 📅 Date */}
          <Box sx={{ mt: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Bill Date"
                value={filters.date ? dayjs(filters.date) : null}
                onChange={(v) =>
                  setFilters((prev) => ({
                    ...prev,
                    date: v ? v.format("YYYY-MM-DD") : "",
                  }))
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    sx: inputSx,
                  },
                }}
              />
            </LocalizationProvider>
          </Box>

          <Button
            fullWidth
            sx={{
              mt: 1,
              height: 40,
              fontSize: "12px",
              textTransform: "capitalize",
              bgcolor: COLORS.primary,
              color: "#fff",
              "&:hover": { bgcolor: COLORS.primary },
            }}
            onClick={handleReset}
          >
            Reset
          </Button>
        </Box>
      ) : (
        /* ================= FILTER BAR Desktop ================= */

        <Box
          sx={{
            width: "100%",
            display: "flex",
            gap: 2,
            my: 2,
            alignItems: "center",
          }}
        >
          {/* 🔍 Search */}
          <TextField
            size="small"
            label="Search bills (Patient, Doctor, ID...)"
            placeholder="Search by patient name, doctor, bill ID.."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            sx={{ width: 300 }}
          />

          {/* 📅 Date */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Bill Date"
              value={filters.date ? dayjs(filters.date) : null}
              onChange={(v) =>
                setFilters((prev) => ({
                  ...prev,
                  date: v ? v.format("YYYY-MM-DD") : "",
                }))
              }
              slotProps={{
                textField: { size: "small", sx: { width: 200 } },
              }}
            />
          </LocalizationProvider>

          <Button
            variant="outlined"
            sx={{
              height: 40,
              minWidth: 120,
              textTransform: "capitalize",
              bgcolor: COLORS.primary,
              color: "#fff",
              "&:hover": { bgcolor: COLORS.primary },
            }}
            onClick={() =>
              setFilters({
                search: "",
                date: "",
              })
            }
          >
            Reset
          </Button>
        </Box>
      )}

      {/* ================= TABLE ================= */}
      {!isMobile && (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            overflowY: "auto", // enable vertical scroll
            maxHeight: 380, // adjust height as needed

            /* ===== Scrollbar Styling ===== */
            scrollbarColor: COLORS.primary,

            "&::-webkit-scrollbar": {
              width: 8, // Chrome / Edge / Safari
              backgroundColor: "#f8f6f6",
            },
            "&::-webkit-scrollbar-track": {
              borderRadius: 10,
              backgroundColor: "#f8f6f6",
            },
            "&::-webkit-scrollbar-thumb": {
              borderRadius: 10,
              backgroundColor: COLORS.primary,
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: COLORS.primary,
            },
          }}
        >
          <Table stickyHeader sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: COLORS.primary }}>
                <TableCell
                  align="center"
                  sx={{
                    color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                  }}
                >
                  ID
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                  }}
                >
                  App ID
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                  }}
                >
                  Patient ID
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                  }}
                >
                  Sub Total
                </TableCell>

                 <TableCell
                  align="center"
                  sx={{
                     color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                  }}
                >
                  Discount
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                  }}
                >
                  Tax Amount
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                  }}
                >
                  Total Amount
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                  }}
                >
                  Status
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                  }}
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedBills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography fontWeight={600} color="text.secondary">
                      No bills Found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {paginatedBills.map((b) => (
                <TableRow
                  key={b.bill_id}
                  sx={{
                    "& td": {
                      borderBottom: "1px dotted #9ECACA",
                      fontSize: 13,
                    },
                  }}
                >
                  <TableCell align="center">ID {b.bill_id}</TableCell>
                  <TableCell align="center" sx={colBg(0)}>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      sx={{ cursor: "pointer", justifyContent: "center" }}
                      onClick={() => handleOpenAppointment(b.appointment_id)}
                    >
                      <Typography
                        sx={{
                          color: COLORS.primary,
                          fontWeight: 500,
                          fontSize: { xs: 10, md: 12 },
                        }}
                      >
                        App ID - {b.appointment_id}
                      </Typography>

                      <OpenInNewIcon
                        sx={{
                          fontSize: { xs: 10, md: 12 },
                          color: "#0F7C7C",
                        }}
                      />
                    </Stack>
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={
                      {
                        // bgcolor: colBg(2),
                      }
                    }
                  >
                    {b.client_id}
                  </TableCell>

                  <TableCell align="center" sx={colBg(2)}>
                    {b.subtotal}
                  </TableCell>
                  <TableCell align="center" sx={colBg(2)}>
                    {b.discount_amount}
                  </TableCell>
                  <TableCell align="center">{b.tax_amount}</TableCell>
                  <TableCell align="center" sx={colBg(6)}>
                    {b.total_amount}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={b.bill_status}
                      size="small"
                      sx={{
                        background: getStatusColor(b.bill_status),
                        color: "#fff",
                        fontSize: 11,
                      }}
                    />
                  </TableCell>

                  <TableCell align="center" sx={colBg(8)}>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      {/* EDIT */}
                      <Tooltip
                        title={
                          b.bill_status === "Paid"
                            ? "Paid bills cannot be edited"
                            : "Edit bill"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={b.bill_status === "Paid"}
                            sx={{
                              background:
                                b.bill_status === "Paid"
                                  ? "#bdbdbd"
                                  : "#ed6c02",
                              color: "#fff",
                              "&:hover": {
                                background:
                                  b.bill_status === "Paid"
                                    ? "#bdbdbd"
                                    : "#c45a00",
                              },
                            }}
                            onClick={() => handleEdit(b)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* VIEW */}
                      <Tooltip title="View bill details">
                        <IconButton
                          size="small"
                          sx={{
                            background: "#1976d2",
                            color: "#fff",
                            "&:hover": { background: "#115293" },
                          }}
                          onClick={() => handlePreview(b.bill_id)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* DOWNLOAD */}
                      <Tooltip title="Download invoice">
                        <IconButton
                          size="small"
                          sx={{
                            background: "#0F7C7C",
                            color: "#fff",
                            "&:hover": { background: "#0B5F5F" },
                          }}
                          onClick={() => handleDownload(b.bill_id)}
                        >
                          <DownloadForOfflineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* ================= MOBILE VIEW ================= */}
      {isMobile && paginatedBills.length === 0 && (
        <Paper sx={{ p: 2, mt: 2, textAlign: "center" }}>
          <Typography fontWeight={600} color="text.secondary">
            No bills Found
          </Typography>
        </Paper>
      )}
      {/* ================= MOBILE VIEW (SCROLLABLE) ================= */}

      {isMobile && (
        <Box
          sx={{
            mt: 2,
            maxHeight: 440, // 👈 SAME IDEA AS DESKTOP
            overflowY: "auto", // 👈 ENABLE SCROLL
            borderRadius: 2,
          }}
        >
          {paginatedBills.length === 0 && (
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography fontWeight={600} color="text.secondary">
                No bills Found
              </Typography>
            </Paper>
          )}

          {paginatedBills.map((b, index) => {
            const bgColor = index % 2 === 0 ? COLORS.activeBg : COLORS.texWhite;

            return (
              <Paper
                key={b.bill_id}
                sx={{
                  p: 2,
                  backgroundColor: bgColor, // 👈 alternating bg
                }}
              >
                <Stack spacing={1}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography fontWeight={600}>ID - {b.bill_id}</Typography>

                    <Stack direction="row" spacing={1} justifyContent="center">
                      {/* EDIT */}
                      <Tooltip
                        title={
                          b.bill_status === "Paid"
                            ? "Paid bills cannot be edited"
                            : "Edit bill"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={b.bill_status === "Paid"}
                            sx={{
                              background:
                                b.bill_status === "Paid"
                                  ? "#bdbdbd"
                                  : "#ed6c02",
                              color: "#fff",
                              "&:hover": {
                                background:
                                  b.bill_status === "Paid"
                                    ? "#bdbdbd"
                                    : "#c45a00",
                              },
                            }}
                            onClick={() => handleEdit(b)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* VIEW */}
                      <Tooltip title="View bill details">
                        <IconButton
                          size="small"
                          sx={{
                            background: "#1976d2",
                            color: "#fff",
                            "&:hover": { background: "#115293" },
                          }}
                          onClick={() => handlePreview(b.bill_id)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* DOWNLOAD */}
                      <Tooltip title="Download invoice">
                        <IconButton
                          size="small"
                          sx={{
                            background: "#0F7C7C",
                            color: "#fff",
                            "&:hover": { background: "#0B5F5F" },
                          }}
                          onClick={() => handleDownload(b.bill_id)}
                        >
                          <DownloadForOfflineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>

                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Tooltip title="View appointment details">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        onClick={() => handleOpenAppointment(b.appointment_id)}
                        sx={{
                          cursor: "pointer",
                          color: COLORS.primary,
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        <Typography fontWeight={600}>
                          App ID - {b.appointment_id}
                        </Typography>
                        <LaunchIcon sx={{ fontSize: 16 }} />
                      </Stack>
                    </Tooltip>

                    <Chip
                      label={b.bill_status}
                      size="small"
                      sx={{
                        background: getStatusColor(b.bill_status),
                        color: "#fff",
                      }}
                    />
                  </Box>

                  <Typography>Client : {b.client_id}</Typography>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography>Total : {b.total_amount}₹</Typography>
                    <Typography>
                      Date : {dayjs(b.created_at).format("DD/MM/YYYY")}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* ================= Pagination ================= */}

      {totalPages > 1 && (
        <Box
          display="flex"
          justifyContent="center"
          sx={{
            my: { xs: 1, md: 2 },
          }}
        >
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, v) => setPage(v)}
          />
        </Box>
      )}

      {/* ================= MODALS For Preview ================= */}

      <AppointmentDetailsModal
        open={openAppointment}
        appointmentId={selectedAppointmentId}
        onClose={() => setOpenAppointment(false)}
      />
      <AddBillModal
        open={openAddBill}
        onClose={() => setOpenAddBill(false)}
        bills={bills}
        onBillAdded={fetchBills}
      />

      <EditBillModal
        open={openEdit}
        bill={editBill}
        onClose={() => setOpenEdit(false)}
        onUpdated={fetchBills}
      />

      <InvoicePreviewModal
        open={openPreview}
        billId={previewBillId}
        onClose={() => setOpenPreview(false)}
      />
    </Box>
  );
};

export default Bills;