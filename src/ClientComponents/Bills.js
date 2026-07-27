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
import LaunchIcon from "@mui/icons-material/Launch";
import AppointmentDetailsModal from "./AppointmentViewModal";

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

      console.log("bills data is",list);
    } catch (err) {
      console.error("Fetch bills error:", err.response || err);
      setBills([]);
    }
  };

  // ---------------- PAGINATION ----------------
  const totalPages = Math.ceil((filteredBills?.length || 0) / rowsPerPage);

  const paginatedBills = filteredBills.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
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
        }
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
    billId: "",
    appointmentId: "",
    status: "",
    date: "",
  });

  useEffect(() => {
    let data = [...bills];

    if (filters.billId) {
      data = data.filter((b) => String(b.bill_id).includes(filters.billId));
    }

    if (filters.appointmentId) {
      data = data.filter((b) =>
        String(b.appointment_id).includes(filters.appointmentId)
      );
    }

    if (filters.status) {
      data = data.filter((b) => b.bill_status === filters.status);
    }

    if (filters.date) {
      data = data.filter(
        (b) => dayjs(b.created_at).format("YYYY-MM-DD") === filters.date
      );
    } else {
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setFilteredBills(data);

    // ✅ prevent cursor jump
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
      billId: "",
      appointmentId: "",
      status: "",
      date: "",
    });
    setFilteredBills(bills);
    setPage(1);
  };

  return (
    <Box
      px={{ xs: 1, md: 1 }}
      sx={{
        pt: 2.8,
      }}
    >
      {/* Heading */}
      <Box
        sx={{
          bgcolor: COLORS.primary,
          color: "#fff",
          fontSize: { xs: "14px", md: "24px" },
          px: 1,
          py: 1,
          my: 1,
          width: { xs: "50%", md: "30%" },
          borderTopRightRadius: 60,
          fontWeight: 600,
        }}
      >
        View Your Bills
      </Box>
      {/* ================= FILTER BAR (UNCHANGED) ================= */}
      {isMobile ? (
        /* ================= FILTER BAR Mobile ================= */

        <Box sx={{ width: "100%", my: 1 }}>
          {/* ROW 1: Bill ID + Appointment ID */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              mb: 1,
            }}
          >
            <TextField
              size="small"
              fullWidth
              label="Bill ID"
              value={filters.billId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, billId: e.target.value }))
              }
              sx={inputSx}
            />

            <TextField
              size="small"
              fullWidth
              label="Appointment ID"
              value={filters.appointmentId}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  appointmentId: e.target.value,
                }))
              }
              sx={inputSx}
            />
          </Box>

          {/* ROW 2: Date (full width) */}
          <Box sx={{ mb: 1 }}>
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

          {/* ROW 3: Status + Reset */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
            }}
          >
            <TextField
              size="small"
              select
              fullWidth
              label="Status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              sx={inputSx}
            >
              <MenuItem value="">All</MenuItem>
              {[...new Set(bills.map((b) => b.bill_status))].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>

            <Button
              fullWidth
              sx={{
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
          <TextField
            size="small"
            label="Bill ID"
            value={filters.billId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, billId: e.target.value }))
            }
            sx={{ width: 200 }}
          />

          <TextField
            size="small"
            label="Appointment ID"
            value={filters.appointmentId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, appointmentId: e.target.value }))
            }
            sx={{ width: 200 }}
          />

          <TextField
            size="small"
            select
            label="Status"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            sx={{ width: 200 }}
          >
            <MenuItem value="">All</MenuItem>
            {[...new Set(bills.map((b) => b.bill_status))].map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

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
              fontSize: "18px",
              bgcolor: COLORS.primary,
              color: "#fff",
              "&:hover": {
                bgcolor: COLORS.primary,
              },
            }}
            onClick={handleReset}
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
                  Appointment ID
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                    width: 250,
                    maxWidth: 250,
                  }}
                >
                  Hospital Name
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
                  Created Date
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    color: COLORS.texWhite,
                    bgcolor: COLORS.primary,
                    fontWeight: 600,
                  }}
                >
                  Download
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
                  key={b.id}
                  sx={{
                    "& td": {
                      borderBottom: "1px dotted #9ECACA",
                      fontSize: 13,
                      py: 1,
                    },
                  }}
                >
                  <TableCell align="center" sx={colBg(0)}>
                    {" "}
                    ID {b.bill_id}
                  </TableCell>
                  <TableCell align="center">
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      sx={{ cursor: "pointer", justifyContent: "center" }}
                      onClick={() => handleOpenAppointment(b.appointment_id)}
                    >
                      <Typography
                        sx={{
                          color: "#0F7C7C",
                          fontWeight: 500,
                        }}
                      >
                        App ID - {b.appointment_id}
                      </Typography>

                      <OpenInNewIcon
                        sx={{
                          fontSize: 16,
                          color: "#0F7C7C",
                        }}
                      />
                    </Stack>
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{
                      bgcolor: colBg(2),
                      width: 250,
                      maxWidth: 350,
                    }}
                  >
                    {b.company_name}
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

                  <TableCell align="center" sx={colBg(4)}>
                    {b.total_amount}
                  </TableCell>

                  <TableCell align="center">
                    {dayjs(b.created_at).format("DD/MM/YYYY")}
                  </TableCell>

                  <TableCell align="center" sx={colBg(6)}>
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
                key={b.id}
                sx={{
                  p: 2,
                  backgroundColor: bgColor, // 👈 alternating bg
                }}
              >
                <Stack spacing={1}>
                  <Typography fontWeight={600}>ID - {b.bill_id}</Typography>

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

                  <Typography>Total : {b.total_amount}₹</Typography>
                  <Typography> Hospital Name: {b.company_name}</Typography>
                  <Typography>
                    Date : {dayjs(b.created_at).format("DD/MM/YYYY")}
                  </Typography>

                  <Button
                    size="small"
                    startIcon={<DownloadForOfflineIcon />}
                    onClick={() => handleDownload(b.id)}
                  >
                    Download
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Box>
      )}

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
      <AppointmentDetailsModal
        open={openAppointment}
        appointmentId={selectedAppointmentId}
        onClose={() => setOpenAppointment(false)}
      />
    </Box>
  );
};

export default Bills;
