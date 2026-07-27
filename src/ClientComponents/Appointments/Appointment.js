import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Paper,
  Stack,
  Snackbar,
  Alert,
  Pagination,
  useMediaQuery,
  Card,
  CardContent,
  colors,
  Chip,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import axios from "axios";
import AppointmentForm from "./AppointmentForm";

// DATE PICKER
import dayjs from "dayjs";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { COLORS } from "../Themes";

/* 🎨 COLORS – MATCH IMAGE */
const Colors = {
  primary: COLORS.primary,
  primaryDark: COLORS.primary,
  rowAlt: COLORS.softBg,
  bg: "#f6f8f8",
};

const AppointmentsPage = () => {
  const isMobile = useMediaQuery("(max-width:900px)");

  const [openForm, setOpenForm] = useState(false);
  const [allAppointments, setAllAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");

  const [filters, setFilters] = useState({
    appointmentId: "",
    status: "",
    date: "",
  });

  const [filterOptions, setFilterOptions] = useState({
    statuses: [],
    dates: [],
  });

  /* ---------------- FETCH ---------------- */
  const fetchAppointments = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_URL}/appointment/appointments`,
        { withCredentials: true }
      );

      const list = res.data.appointments.map((a) => ({
        id: a.id,
        purpose: a.purpose,
        date: a.appointment_date,
        from_time: a.from_time,
        to_time: a.to_time,
        status: a.status,
        selected_branch: a.selected_branch,
        company_name: a.company_name,
        company_logo: a.company_logo,
        admin_name: a.admin_name,
        doctor_name: a.doctor_name,
      }));

      setAllAppointments(list);
      setFilteredAppointments(list);

      
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  /* ---------------- FILTER OPTIONS ---------------- */
  useEffect(() => {
    if (!allAppointments.length) return;

    setFilterOptions({
      statuses: [
        ...new Set(allAppointments.map((a) => a.status).filter(Boolean)),
      ],
      dates: [...new Set(allAppointments.map((a) => a.date).filter(Boolean))],
    });
  }, [allAppointments]);

  /* ---------------- APPLY FILTERS ---------------- */
  useEffect(() => {
    let data = [...allAppointments];

    if (filters.appointmentId)
      data = data.filter((a) => a.id === Number(filters.appointmentId));

    if (filters.status) data = data.filter((a) => a.status === filters.status);

    if (filters.date) data = data.filter((a) => a.date === filters.date);

    setFilteredAppointments(data);
    setPage(1);
  }, [filters, allAppointments]);

  /* ---------------- PAGINATION ---------------- */
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(filteredAppointments.length / rowsPerPage);

  const paginatedAppointments = filteredAppointments.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  /* ---------------- CANCEL ---------------- */
  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm("Cancel this appointment?")) return;

    await axios.put(
      `${process.env.REACT_APP_URL}/appointment/client/appointment/cancel`,
      { appointmentId }, // ✅ MATCH backend
      { withCredentials: true }
    );

    fetchAppointments();
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = Number(hours);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${suffix}`;
  };

  const ROW_COLORS = {
    even: COLORS.texWhite,
    odd: COLORS.activeBg, // 🌱 light green
  };

  const STATUS_COLORS = {
    completed: COLORS.success,
    assigned: COLORS.warning,
    cancelled: COLORS.danger,
  };

  const inputSx = {
    "& .MuiInputBase-root": {
      height: 40,
      fontSize: "12px",
    },
    "& .MuiInputLabel-root": {
      fontSize: "11px",
    },
  };

  return (
    <Box px={{ xs: "none", md: 1 }} sx={{ pt: 2 }}>
      {/* ================= TOP ACTION ================= */}
      <Box display="flex" justifyContent="flex-end" px={2}>
        <Button
          sx={{
            bgcolor: Colors.primary,
            color: "#fff",
            mb: { xs: 1, md: "none" },
            borderTopRightRadius: 0,
            borderBottomRightRadius: { xs: 15, md: 30 },
            borderTopLeftRadius: { xs: 15, md: 30 },
            borderBottomLeftRadius: 0,
            height: { xs: "38px", md: "53px" },
            width: { xs: "120px", md: "239px" },
            fontSize: { xs: "10px", md: "16px" },
            textTransform: "capitalize",
          }}
          onClick={() => setOpenForm(true)}
        >
          Make An Appointment
        </Button>
      </Box>

      {/* ================= HEADING ================= */}
      <Box
        sx={{
          bgcolor: Colors.primary,
          color: "#fff",
          fontSize: { xs: "14px", md: "24px" },
          px: 1,
          py: 1,
          width: { xs: "70%", md: "40%" },
          borderTopRightRadius: 60,
          fontWeight: 600,
        }}
      >
        View Your Past Appointments
      </Box>

      {/* ================= FILTERS (UNCHANGED) ================= */}
      {/* 👉 KEEP YOUR EXISTING FILTER CODE HERE (MOBILE + DESKTOP) */}
      {/* I did not modify filters */}

      {/* ================= FILTER SECTION ================= */}
      {isMobile ? (
        /* -------- MOBILE FILTER -------- */
        <Box sx={{ width: "100%", my: 1 }}>
          {/* Row 1: Appointment ID + Status */}
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

            <TextField
              size="small"
              select
              fullWidth
              label="Status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
              sx={inputSx}
            >
              <MenuItem value="">All</MenuItem>
              {filterOptions.statuses.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Row 2: Date */}
          <Box sx={{ mb: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Appointment Date"
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

          {/* Row 3: Reset */}
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
            onClick={() =>
              setFilters({
                appointmentId: "",
                status: "",
                date: "",
              })
            }
          >
            Reset
          </Button>
        </Box>
      ) : (
        /* -------- DESKTOP FILTER -------- */
        <Box
          sx={{
            width: "100%",
            display: "flex",
            gap: 2,
            my: 1,
            alignItems: "center",
          }}
        >
          <TextField
            size="small"
            label="Appointment ID"
            value={filters.appointmentId}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                appointmentId: e.target.value,
              }))
            }
            sx={{ width: 200 }}
          />

          <TextField
            size="small"
            select
            label="Status"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value,
              }))
            }
            sx={{ width: 200 }}
          >
            <MenuItem value="">All</MenuItem>
            {filterOptions.statuses.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Appointment Date"
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
            onClick={() =>
              setFilters({
                appointmentId: "",
                status: "",
                date: "",
              })
            }
          >
            Reset
          </Button>
        </Box>
      )}

      {/* ================= DESKTOP TABLE ================= */}
      {!isMobile && (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            overflowY: "auto",
            maxHeight: 340,

            /* ===== Scrollbar Styling ===== */
            scrollbarColor: Colors.primary,

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
              backgroundColor: Colors.primary,
            },
            "&::-webkit-scrollbar-thumb:hover": {
              backgroundColor: Colors.primary,
            },
          }}
        >
          <Table stickyHeader sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                {[
                  "ID",
                   "Hospital Name",
                   "Doctor",
                  "Date",
                  "From Time",
                  "To Time",
                  "Purpose",
                 
                  "Selected Branch",
                  "Status",
                  "Action",
                ].map((head) => (
                  <TableCell
                    key={head}
                    align="center"
                    sx={{
                      bgcolor: Colors.primary,
                      color: COLORS.texWhite,
                      fontWeight: 600,
                    }}
                  >
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedAppointments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography fontWeight={600} color="text.secondary">
                      No appointments found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {[...paginatedAppointments]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((row, index) => (
                  <TableRow
                    key={row.id}
                    sx={{
                      "& td": {
                        borderBottom: "1px dotted #9ECACA",
                        fontSize: 13,
                        py: 1,
                        backgroundColor:
                          index % 2 === 0 ? ROW_COLORS.odd : ROW_COLORS.even,
                      },
                    }}
                  >
                    <TableCell align="center">{row.id}</TableCell>
                     <TableCell fontSize="12px">
                        {row.company_name}
                      </TableCell>
                      <TableCell align="center">
                      {row.doctor_name}
                    </TableCell>
                    <TableCell align="center">{row.date}</TableCell>
                    <TableCell align="center">
                      {formatTime(row.from_time)}
                    </TableCell>
                    <TableCell align="center">
                      {formatTime(row.to_time)}
                    </TableCell>
                   <TableCell
                      sx={{
                        minWidth: 250,
                        maxWidth: 250,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        verticalAlign: "top",
                        py: 2,
                      }}
                    >
                      {row.purpose}
                    </TableCell>
                    

                    <TableCell align="center">{row.selected_branch}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={
                          row.status.charAt(0).toUpperCase() +
                          row.status.slice(1)
                        }
                        sx={{
                          background: STATUS_COLORS[row.status],
                          color: "#fff",
                          fontSize: 11,
                          width: 90,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        sx={{ textTransform: "capitalize" }}
                        onClick={() => cancelAppointment(row.id)}
                        disabled={
                          row.status === "cancelled" ||
                          row.status === "completed"
                        }
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ================= MOBILE CARDS (UNCHANGED) ================= */}
      {isMobile && (
        <Box
          sx={{
            maxHeight: 430, // 👈 same idea as desktop table
            overflowY: "auto", // 👈 enables inner scrolling
            borderRadius: 2,
          }}
        >
          {paginatedAppointments.length === 0 && (
            <Box
              sx={{
                textAlign: "center",
                py: 5,
                color: "#777",
                bgcolor: COLORS.activeBg,
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              No appointments found
            </Box>
          )}

          {paginatedAppointments.map((row, index) => {
            const bgColor = index % 2 === 0 ? ROW_COLORS.even : ROW_COLORS.odd;

            return (
              <Card
                key={row.id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  backgroundColor: bgColor,
                }}
              >
                <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                  <Stack spacing={0.4}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography fontSize="12px">
                        <b>App ID:</b> {row.id}
                      </Typography>

                      <Typography component="span" fontSize="12px">
                        <b>Status:</b>{" "}
                        <Chip
                          size="small"
                          label={
                            row.status.charAt(0).toUpperCase() +
                            row.status.slice(1)
                          }
                          sx={{
                            height: 18,
                            width: 80,
                            fontSize: "10px",
                            fontWeight: 600,
                            bgcolor: STATUS_COLORS[row.status],
                            color: "#fff",
                          }}
                        />
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography fontSize="12px">
                        <b>Date:</b> {row.date}
                      </Typography>

                      <Typography fontSize="12px">
                        <b>Time:</b> {formatTime(row.from_time)} –{" "}
                        {formatTime(row.to_time)}
                      </Typography>

                      
                    </Box>
                    <Typography fontSize="12px">
                      <b>Purpose :</b> {row.purpose}
                    </Typography>

                      <Typography fontSize="12px">
                        <b>Hospital Name:</b> {row.company_name}
                      </Typography>
                    <Typography fontSize="12px">
                      <b>Selected Branch:</b> {row.selected_branch}
                    </Typography>

                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      fullWidth
                      sx={{
                        fontSize: "11px",
                        px: 1,
                        py: 0.2,
                        textTransform: "capitalize",
                      }}
                      onClick={() => cancelAppointment(row.id)}
                      disabled={
                        row.status === "cancelled" || row.status === "completed"
                      }
                    >
                      Cancel
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ================= PAGINATION ================= */}
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

      {/* ================= MODAL & SNACKBAR ================= */}
     <AppointmentForm
      open={openForm}
      onClose={() => setOpenForm(false)}
      onSuccess={(data) => {

  console.log("SUCCESS FROM FORM:", data);

  setOpenForm(false);

  setSuccessMsg(data?.msg || "Appointment booked");

  fetchAppointments();

}}
    />

      <Snackbar
        open={!!successMsg}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="success"
          onClose={() => setSuccessMsg("")}
          sx={{ width: "100%" }}
        >
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AppointmentsPage;
