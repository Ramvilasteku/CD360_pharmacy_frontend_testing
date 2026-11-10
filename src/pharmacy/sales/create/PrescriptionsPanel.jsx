// src/pharmacy/sales/create/PrescriptionsPanel.jsx
//
// Drop-in replacement for the "Doctor's Prescription" section in ExistingClient.
//
// Props:
//   patient              — { id, name }     (required)
//   onUsePrescription    — (rx) => void     (called when user confirms "Use this prescription")
//   selectedPrescription — current selected (if any) to show the "using" banner
//   onChange             — () => void       (called when user clicks "Change" to unselect)
//
// Features:
//   • Fetches ALL prescriptions via GET /api/prescriptions, filters by patient.id client-side
//   • Clean table view: Date · Doctor · Medicines · Tests · Appointment · Actions
//   • "View" opens a details dialog with the actual medicines & tests pulled from JSON
//   • "Use this prescription" button inside the dialog adds everything to the cart
//   • Mobile: table collapses into cards; dialog goes fullscreen
//
// Backend: your GET / returns id, patient_id, doctor_id, appointment_id, created_at,
//          medicine_count, test_count, patient_name, appointment_date.
//          For details, we read medicines_json/tests_json from the row itself —
//          if your API already returns them in GET /:id, call that for freshest data.

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Box, Paper, Stack, Typography, Table, TableHead, TableBody, TableRow,
  TableCell, Chip, Button, IconButton, Avatar, LinearProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, useMediaQuery,
  Fade, Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MedicationOutlinedIcon from "@mui/icons-material/MedicationOutlined";
import BiotechOutlinedIcon from "@mui/icons-material/BiotechOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import LocalPharmacyOutlinedIcon from "@mui/icons-material/LocalPharmacyOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";

const API = process.env.REACT_APP_URL;

const BRAND = {
  teal: "#0f766e",
  tealSoft: "#f0fdfa",
  accent: "#7A2E9C",
  accentSoft: "#f5efff",
  warning: "#f59e0b",
  warningSoft: "#fef3c7",
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  }) : "—";

const fmtRelative = (d) => {
  if (!d) return "";
  const diff = (Date.now() - new Date(d).getTime()) / 86400000;
  if (diff < 1) return "today";
  if (diff < 2) return "yesterday";
  if (diff < 7) return `${Math.floor(diff)} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) > 1 ? "s" : ""} ago`;
  if (diff < 365) return `${Math.floor(diff / 30)} month${Math.floor(diff / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diff / 365)}y ago`;
};

/* ───────── MAIN PANEL ───────── */
export default function PrescriptionsPanel({
  patient,
  selectedPrescription,
  onUsePrescription,
  onChange,
}) {

      console.log("[Rx Panel] rendered. patient:", patient, "selected:", selectedPrescription);

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRx, setViewRx] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [tests, setTests] = useState([]);

  /* Fetch all prescriptions for this admin — then filter by patient client-side */
  useEffect(() => {
  if (!patient?.id) return;
  let alive = true;
  setLoading(true);
  setError(null);
  (async () => {
    try {
      // ⭐ DEBUG 1
      console.log("[Rx] fetching for patient.id:", patient.id);

      const res = await axios.get(
        `${API}/api/prescriptions/pharmacy/get?patient_id=${patient.id}`,
        { withCredentials: true }
      );
      const data = res.data?.data ?? res.data ?? [];

      // ⭐ DEBUG 2
      console.log("[Rx] got rows:", data.length, data);

      if (!alive) return;
      setAll(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!alive) return;
      setError(err.response?.status === 403
        ? "Access denied — need pharmacy.sales.view"
        : "Couldn't load prescriptions");
    } finally {
      if (alive) setLoading(false);
    }
  })();
  return () => { alive = false; };
}, [patient?.id]);

  const forPatient = useMemo(
    () => all.filter((r) => Number(r.patient_id) === Number(patient?.id)),
    [all, patient?.id]
  );

  /* Open details dialog */
  const openDetails = async (rx) => {
    setViewRx(rx);
    setViewOpen(true);
    setDetailsLoading(true);
    setMedicines([]);
    setTests([]);
    try {
      // Try fetching full details — safely falls back to the row itself if API returns the same shape
      const res = await axios.get(`${API}/api/prescriptions/pharmacy/get/${rx.id}`, { withCredentials: true });
      const d = res.data?.data ?? res.data ?? {};
      const meds = parseJSON(d.medicines_json ?? d.medicines);
      const tsts = parseJSON(d.tests_json ?? d.tests);
      setMedicines(Array.isArray(meds) ? meds : []);
      setTests(Array.isArray(tsts) ? tsts : []);
    } catch {
      setMedicines([]);
      setTests([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  /* ───────── EMPTY / LOADING / ERROR ───────── */
  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "#fff" }}>
        <SectionHeader />
        <Box sx={{ py: 2 }}>
          <LinearProgress sx={{ borderRadius: 1, height: 4 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Loading prescriptions for {patient?.name}…
          </Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "#fff" }}>
        <SectionHeader />
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Paper>
    );
  }

  if (forPatient.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "#fff" }}>
        <SectionHeader />
        <Box sx={{
          textAlign: "center", py: 5, px: 3,
          border: "2px dashed", borderColor: "divider", borderRadius: 3,
          bgcolor: alpha("#000", 0.01),
        }}>
          <DescriptionOutlinedIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1 }} />
          <Typography fontWeight={700}>No prescriptions on file</Typography>
          <Typography variant="caption" color="text.secondary">
            Add medicines manually using the search below.
          </Typography>
        </Box>
      </Paper>
    );
  }

  /* ───────── "USING" BANNER if a prescription is selected ───────── */
  if (selectedPrescription) {
    return (
      <Fade in timeout={300}>
        <Paper elevation={0} sx={{
          p: 2, borderRadius: 2.5,
          bgcolor: BRAND.warningSoft,
          border: `1px solid ${alpha(BRAND.warning, 0.3)}`,
        }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CheckCircleIcon sx={{ color: BRAND.warning }} />
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  Using prescription from Dr. {selectedPrescription.doctor_name || selectedPrescription.doctor_id || "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Dated {fmtDate(selectedPrescription.created_at)} · Medicines auto-added
                </Typography>
              </Box>
            </Stack>
            <Button size="small" onClick={onChange}
              sx={{ textTransform: "none", color: BRAND.warning }}>Change</Button>
          </Stack>
        </Paper>
      </Fade>
    );
  }

  /* ───────── TABLE / CARDS ───────── */
  return (
    <>
      <Fade in timeout={400}>
        <Paper elevation={0} sx={{
          borderRadius: 3, overflow: "hidden",
          border: "1px solid", borderColor: "divider", bgcolor: "#fff",
        }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider", bgcolor: BRAND.accentSoft }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar sx={{ bgcolor: alpha(BRAND.accent, 0.15), color: BRAND.accent, width: 40, height: 40 }}>
                <DescriptionOutlinedIcon />
              </Avatar>
              <Box>
                <Typography fontWeight={700} fontSize={15}>Doctor's Prescriptions</Typography>
                <Typography variant="caption" color="text.secondary">
                  {forPatient.length} prescription{forPatient.length !== 1 ? "s" : ""} for {patient.name}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* DESKTOP TABLE */}
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha("#f8fafc", 0.7) }}>
                  <TableCell sx={headCell}>Date</TableCell>
                  <TableCell sx={headCell}>Doctor</TableCell>
                  <TableCell sx={headCell} align="center">Medicines</TableCell>
                  <TableCell sx={headCell} align="center">Tests</TableCell>
                  <TableCell sx={headCell}>Appointment</TableCell>
                  <TableCell sx={headCell} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {forPatient.map((rx) => (
                  <TableRow key={rx.id} hover
                    sx={{ cursor: "pointer", "&:hover": { bgcolor: BRAND.accentSoft } }}
                    onClick={() => openDetails(rx)}>
                    <TableCell>
                      <Typography fontWeight={600} fontSize={13.5}>{fmtDate(rx.created_at)}</Typography>
                      <Typography variant="caption" color="text.secondary">{fmtRelative(rx.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13.5}>Dr. {rx.doctor_name || `#${rx.doctor_id}` || "—"}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={<MedicationOutlinedIcon sx={{ fontSize: 14 }} />}
                        label={rx.medicine_count || 0}
                        sx={{
                          height: 24, fontWeight: 700,
                          bgcolor: Number(rx.medicine_count) > 0 ? alpha(BRAND.teal, 0.1) : alpha("#000", 0.05),
                          color: Number(rx.medicine_count) > 0 ? BRAND.teal : "text.secondary",
                          "& .MuiChip-icon": { color: "inherit", ml: 0.5 },
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={<BiotechOutlinedIcon sx={{ fontSize: 14 }} />}
                        label={rx.test_count || 0}
                        sx={{
                          height: 24, fontWeight: 700,
                          bgcolor: Number(rx.test_count) > 0 ? alpha(BRAND.accent, 0.1) : alpha("#000", 0.05),
                          color: Number(rx.test_count) > 0 ? BRAND.accent : "text.secondary",
                          "& .MuiChip-icon": { color: "inherit", ml: 0.5 },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {rx.appointment_date ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <CalendarMonthOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                          <Typography variant="caption">{fmtDate(rx.appointment_date)}</Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View details">
                        <IconButton size="small"
                          onClick={(e) => { e.stopPropagation(); openDetails(rx); }}
                          sx={{ color: BRAND.accent, "&:hover": { bgcolor: alpha(BRAND.accent, 0.08) } }}>
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {/* MOBILE CARDS */}
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            <Stack divider={<Divider />}>
              {forPatient.map((rx) => (
                <Box key={rx.id} sx={{ p: 2, cursor: "pointer" }} onClick={() => openDetails(rx)}>
                  <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                    <Avatar sx={{
                      width: 36, height: 36,
                      bgcolor: alpha(BRAND.accent, 0.12), color: BRAND.accent,
                    }}>
                      <DescriptionOutlinedIcon fontSize="small" />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={700} fontSize={14}>
                        Dr. {rx.doctor_name || `#${rx.doctor_id}` || "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {fmtDate(rx.created_at)} · {fmtRelative(rx.created_at)}
                      </Typography>
                      <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                        <Chip size="small" icon={<MedicationOutlinedIcon sx={{ fontSize: 12 }} />}
                          label={`${rx.medicine_count || 0} med`}
                          sx={{ height: 20, fontSize: 11, fontWeight: 600,
                            bgcolor: alpha(BRAND.teal, 0.1), color: BRAND.teal }} />
                        <Chip size="small" icon={<BiotechOutlinedIcon sx={{ fontSize: 12 }} />}
                          label={`${rx.test_count || 0} test`}
                          sx={{ height: 20, fontSize: 11, fontWeight: 600,
                            bgcolor: alpha(BRAND.accent, 0.1), color: BRAND.accent }} />
                      </Stack>
                    </Box>
                    <IconButton size="small" sx={{ color: BRAND.accent }}>
                      <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Paper>
      </Fade>

      {/* ───────── DETAILS DIALOG ───────── */}
      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        maxWidth="md" fullWidth fullScreen={isXs}
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 3 } } }}
      >
        <DialogTitle sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          bgcolor: BRAND.accentSoft, borderBottom: 1, borderColor: "divider",
        }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar sx={{ bgcolor: BRAND.accent, width: 40, height: 40 }}>
              <DescriptionOutlinedIcon />
            </Avatar>
            <Box>
              <Typography fontWeight={700} fontSize={16}>
                Prescription #{viewRx?.id}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dr. {viewRx?.doctor_name || `#${viewRx?.doctor_id}` || "—"}
                {" · "}{fmtDate(viewRx?.created_at)}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setViewOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          {detailsLoading ? (
            <LinearProgress sx={{ borderRadius: 1 }} />
          ) : (
            <Stack spacing={3}>
              {/* MEDICINES */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <LocalPharmacyOutlinedIcon sx={{ color: BRAND.teal, fontSize: 20 }} />
                  <Typography fontWeight={700} fontSize={14}>
                    Prescribed Medicines ({medicines.length})
                  </Typography>
                </Stack>
                {medicines.length === 0 ? (
                  <Typography variant="caption" color="text.secondary"
                    sx={{ display: "block", py: 2, textAlign: "center", fontStyle: "italic" }}>
                    No medicines in this prescription
                  </Typography>
                ) : (
                  <Table size="small" sx={{
                    border: "1px solid", borderColor: "divider", borderRadius: 1.5,
                  }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha("#f8fafc", 0.6) }}>
                        <TableCell sx={headCell}>Medicine</TableCell>
                        <TableCell sx={headCell} align="center">Qty</TableCell>
                        <TableCell sx={headCell}>Dosage</TableCell>
                        <TableCell sx={headCell}>Instructions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {medicines.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Typography fontWeight={600} fontSize={13.5}>
                              {m.medicine_name || m.name || `Medicine #${m.medicine_id}`}
                            </Typography>
                            {m.strength && (
                              <Typography variant="caption" color="text.secondary">{m.strength}</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={m.quantity ?? m.qty ?? "—"} size="small"
                              sx={{
                                height: 22, fontWeight: 700, minWidth: 36,
                                bgcolor: alpha(BRAND.teal, 0.1), color: BRAND.teal,
                              }} />
                          </TableCell>
                          <TableCell>
                            <Typography fontSize={12.5}>
                              {m.dosage || m.frequency || "—"}
                            </Typography>
                            {m.duration && (
                              <Typography variant="caption" color="text.secondary">
                                for {m.duration}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {m.instructions || m.notes || "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>

              {/* TESTS */}
              {tests.length > 0 && (
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <ScienceOutlinedIcon sx={{ color: BRAND.accent, fontSize: 20 }} />
                    <Typography fontWeight={700} fontSize={14}>
                      Lab Tests ({tests.length})
                    </Typography>
                  </Stack>
                  <Table size="small" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha("#f8fafc", 0.6) }}>
                        <TableCell sx={headCell}>Test</TableCell>
                        <TableCell sx={headCell}>Instructions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tests.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Typography fontWeight={600} fontSize={13.5}>
                              {t.test_name || t.name || `Test #${t.id}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {t.instructions || t.notes || "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {medicines.length === 0 && tests.length === 0 && !detailsLoading && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  This prescription has no medicines or tests recorded.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Button onClick={() => setViewOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
          {medicines.length > 0 && (
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={() => {
                onUsePrescription({ ...viewRx, medicines, tests });
                setViewOpen(false);
              }}
              sx={{
                bgcolor: BRAND.teal, textTransform: "none", fontWeight: 700,
                borderRadius: 2, "&:hover": { bgcolor: "#0d5a54" },
              }}
            >
              Use this prescription ({medicines.length} medicines)
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

/* ───────── helpers ───────── */
const headCell = {
  fontSize: 11, fontWeight: 700, color: "text.secondary",
  letterSpacing: ".06em", textTransform: "uppercase",
};

function SectionHeader() {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
      <Avatar sx={{ bgcolor: alpha(BRAND.accent, 0.12), color: BRAND.accent, width: 40, height: 40 }}>
        <DescriptionOutlinedIcon />
      </Avatar>
      <Box>
        <Typography fontWeight={700} fontSize={15}>Doctor's Prescription</Typography>
        <Typography variant="caption" color="text.secondary">Tap one to view details</Typography>
      </Box>
    </Stack>
  );
}

function parseJSON(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return []; }
  }
  if (typeof v === "object") return v;
  return [];
}