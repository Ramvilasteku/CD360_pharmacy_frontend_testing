import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  Stack,
  Snackbar,
  Alert,
  IconButton,
  MenuItem,
  Backdrop,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import axios from "axios";
import CommonCalendar from "../CommonCalendar";
import { COLORS } from "../Themes";

const AppointmentForm = ({ open, onClose, onSuccess }) => {
  const isMobile = useMediaQuery("(max-width:900px)");

  /* ---------------- STATE ---------------- */
  const [doctors, setDoctors] = useState([]);
  const [userBranch, setUserBranch] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [search, setSearch] = useState("");

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  const [purpose, setPurpose] = useState("");
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [noSlots, setNoSlots] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [snack, setSnack] = useState({ open: false, msg: "", type: "success" });

  const canShowSlots = doctorId && !loadingSlots;

  /* ---------------- FETCH DOCTORS OF RECEPTIONIST BRANCH ---------------- */
  useEffect(() => {
    if (!open) return;

    const fetchBranchDoctors = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_URL}/api/staff/branch-doctors`,
          { withCredentials: true }
        );

        if (res.data.success) {
          setDoctors(res.data.data || []);
          setUserBranch(res.data.branch || "");
        }
      } catch (error) {
        console.error("Doctor fetch failed:", error);
        setDoctors([]);
        setUserBranch("");
      }
    };

    fetchBranchDoctors();
  }, [open]);

  /* ---------------- FETCH CLIENTS ---------------- */
  useEffect(() => {
    if (!open) return;

    const fetchClients = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_URL}/api/client/get`,
          { withCredentials: true }
        );
        setClients(res?.data?.data || []);
      } catch {
        setClients([]);
      }
    };

    fetchClients();
  }, [open]);

  /* ---------------- FETCH SLOTS ---------------- */
  const fetchSlots = useCallback(async () => {
    if (!open || !selectedClient || !doctorId || !selectedDate) return;

    try {
      setLoadingSlots(true);
      setNoSlots(false);
      setSlots([]);
      setSelectedSlot(null);

      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/staff/time-slots/unbooked/filter`,
        {
          params: {
            date: selectedDate.format("YYYY-MM-DD"),
            doctorId,
          },
          withCredentials: true,
        }
      );

      const slotList = res?.data?.slots || [];
      setSlots(slotList);
      if (slotList.length === 0) setNoSlots(true);
    } catch {
      setNoSlots(true);
    } finally {
      setLoadingSlots(false);
    }
  }, [open, selectedClient, doctorId, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  /* ---------------- UTIL ---------------- */
  const formatTo12Hour = (time) =>
    dayjs(`${selectedDate.format("YYYY-MM-DD")} ${time}`).format("hh:mm A");

  const isSlotDisabled = (slot) => {
    if (selectedDate.isBefore(dayjs(), "day")) return true;
    if (selectedDate.isSame(dayjs(), "day")) {
      return dayjs(
        `${selectedDate.format("YYYY-MM-DD")} ${slot.slot_time_from}`
      ).isBefore(dayjs());
    }
    return false;
  };

  /* ---------------- VALIDATION ---------------- */
  const validateForm = () => {
    const newErrors = {};
    if (!selectedClient) newErrors.client = "Client is required";
    if (!purpose.trim()) newErrors.purpose = "Purpose is required";
    if (!doctorId) newErrors.doctor = "Select doctor";
    if (!selectedSlot) newErrors.slot = "Select time slot";
    if (!userBranch) newErrors.branch = "Branch not found";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      await axios.post(
        `${process.env.REACT_APP_URL}/appointment/appointment/request`,
        {
          doctorId,
          client_id: selectedClient.id,
          appointment_date: selectedDate.format("YYYY-MM-DD"),
          from_time: selectedSlot.slot_time_from,
          to_time: selectedSlot.slot_time_to,
          purpose: purpose.trim(),
          selected_branch: userBranch, // ✅ receptionist branch
        },
        { withCredentials: true }
      );

      handleClose();
      onSuccess?.({ type: "success", msg: "Appointment booked successfully" });
    } catch {
      handleClose();
      onSuccess?.({ type: "error", msg: "Booking failed. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- CLOSE ---------------- */
  const handleClose = () => {
    setDoctorId("");
    setSelectedClient(null);
    setPurpose("");
    setSelectedSlot(null);
    setSlots([]);
    setErrors({});
    setNoSlots(false);
    onClose();
  };

  const compactInputSx = {
    "& .MuiInputBase-root": {
      height: 36,
      fontSize: "1rem",
    },
    "& .MuiInputBase-input": {
      padding: "6px 10px",
    },
    "& .MuiInputLabel-root": {
      fontSize: "1rem",
      top: "-8px",
    },
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 12,
              top: 12,
              color: COLORS.danger,
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box p={isMobile ? 2 : 4}>
            <Stack direction={isMobile ? "column" : "row"} spacing={3}>
              {/* LEFT */}
              <Box flex={1}>
                <Typography fontWeight={600}>Select Date</Typography>
                <CommonCalendar
                  value={selectedDate}
                  onChange={setSelectedDate}
                />

                {canShowSlots && (
                  <>
                    <Typography fontWeight={600} mt={2}>
                      Available Slots
                    </Typography>

                    {!selectedClient && (
                      <Typography color="text.secondary" mt={2}>
                        Please select a patient to view available slots
                      </Typography>
                    )}

                    {noSlots && (
                      <Typography color="error">No slots available</Typography>
                    )}

                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {slots.map((slot) => (
                        <Button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          disabled={isSlotDisabled(slot)}
                          variant={
                            selectedSlot?.id === slot.id
                              ? "contained"
                              : "outlined"
                          }
                          sx={{
                            borderRadius: 20,
                            backgroundColor:
                              selectedSlot?.id === slot.id
                                ? COLORS.primary
                                : COLORS.texWhite,
                            color:
                              selectedSlot?.id === slot.id
                                ? COLORS.texWhite
                                : COLORS.primary,
                            border: `solid 2px ${COLORS.primary}`,
                          }}
                        >
                          {formatTo12Hour(slot.slot_time_from)}
                        </Button>
                      ))}
                    </Box>
                  </>
                )}
              </Box>

              {/* RIGHT */}
              <Box
                flex={0.5}
                sx={{
                  bgcolor: COLORS.activeBg,
                  display: "flex",
                  alignItems: "center", // vertical center
                  justifyContent: "center", // horizontal center
                }}
                p={2}
                borderRadius={3}
              >
                <Stack spacing={2}>
                  {/* CLIENT */}
                  <Autocomplete
                    options={clients}
                    value={selectedClient}
                    onChange={(e, v) => setSelectedClient(v)}
                    getOptionLabel={(o) => `${o.name} (ID: ${o.id})`}
                    sx={compactInputSx}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Patient Name"
                        error={!!errors.client}
                        helperText={errors.client}
                      />
                    )}
                  />

                  {/* PURPOSE */}
                  <TextField
                    label="Purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    error={!!errors.purpose}
                    helperText={errors.purpose}
                    sx={compactInputSx}
                  />

                  {/* DOCTOR */}
                  <TextField
                    select
                    label="Doctor"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    error={!!errors.doctor}
                    helperText={errors.doctor}
                    sx={compactInputSx}
                  >
                    {doctors.map((doc) => (
                      <MenuItem key={doc.id} value={doc.id}>
                        Dr. {doc.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* BUTTON */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedSlot || submitting}
                    size="small"
                    sx={{
                      mt: 3,
                      backgroundColor: selectedSlot ? "#0f766e" : "#9ca3af",
                      color: "#fff",
                      borderRadius: "16px",
                      px: 3,
                      py: 0.6,
                      fontSize: "0.85rem",
                      textTransform: "capitalize",
                      cursor: submitting ? "not-allowed" : "pointer",
                      "&:hover": {
                        backgroundColor: selectedSlot ? "#115e59" : "#9ca3af",
                      },
                    }}
                  >
                    {submitting ? (
                      <CircularProgress size={18} sx={{ color: "#fff" }} />
                    ) : selectedSlot ? (
                      "Booking"
                    ) : (
                      "Select a slot to continue"
                    )}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </DialogContent>

        <Backdrop open={submitting}>
          <CircularProgress />
        </Backdrop>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000}>
        <Alert severity={snack.type}>{snack.msg}</Alert>
      </Snackbar>
    </>
  );
};

export default AppointmentForm;
