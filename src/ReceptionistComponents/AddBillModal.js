import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, IconButton, TextField,
  Button, Autocomplete, Snackbar, Alert, Typography, Box, Stack,
  useMediaQuery, useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { COLORS } from "./Themes";
import { fieldSx, labelSx } from "./Prescription/Billconstants";
import SectionNav from "./Prescription/Sectionnav";
import SectionHeader from "./Prescription/Sectionheader";
import AddConsultationItem from "./Prescription/Addconsultationitem";
import AddMedicineItem from "./Prescription/Addmedicineitem";
import AddTestItem from "./Prescription/Addtestitem";
import EditableCostTable from "./Prescription/CostTables";

// Top-level bill-creation modal. Owns all state: patient/appointment
// selection, the fetched prescription, the three editable line-item
// sections (consultations/medicines/tests), tax, notes, and submission.
export default function AddBillModal({ open, onClose, bills = [], onBillAdded }) {
  const [patients,     setPatients]     = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patient,      setPatient]      = useState(null);
  const [appointment,  setAppointment]  = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [notes,        setNotes]        = useState("");
  const [loadingRx,    setLoadingRx]    = useState(false);
  const [alert,        setAlert]        = useState({ open: false, type: "success", message: "" });
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [consultations, setConsultations] = useState([]);
  const [medicines,     setMedicines]     = useState([]);
  const [tests,         setTests]         = useState([]);

  const [activeSection, setActiveSection] = useState("consultations");

  // ── Responsive helpers (layout only — no behavior changes) ──────────
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));  // phones
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));  // phones + tablets

  /* ── helpers ── */
  const deleteRow = (setter, index) =>
    setter(prev => prev.filter((_, i) => i !== index));

  const deleteSection = (setter) => setter([]);

  const addRow = (setter, row) => setter(prev => [...prev, row]);

  const editSaveRow = (setter, index, draft, isMed) =>
    setter(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (isMed) {
          const qty = Number(draft.quantity ?? item.quantity ?? 1);
          const amt = Number(draft.amount   ?? item.amount   ?? 0);
          return { ...item, quantity: qty, amount: amt, cost: qty * amt };
        }
        return { ...item, cost: Number(draft.cost ?? item.cost) };
      })
  );

  /* ── 1. Fetch patients ── */
  useEffect(() => {
    if (!open) return;
    axios
      .get(`${process.env.REACT_APP_URL}/appointment/billing-patients`, { withCredentials: true })
      .then((res) => { if (res.data.success) setPatients(res.data.data); })
      .catch((err) => console.error("Billing patients fetch error:", err));
  }, [open]);


  /* ── 2. Fetch appointments ── */
  useEffect(() => {
    if (!patient) { setAppointments([]); setAppointment(null); return; }
    axios
      .get(`${process.env.REACT_APP_URL}/appointment/billing-appointments`, {
        params: { patient_id: patient.id },
        withCredentials: true,
      })
      .then((res) => { if (res.data.success) setAppointments(res.data.data); })
      .catch((err) => console.error("Billing appointments fetch error:", err));
  }, [patient]);

  /* ── 3. Fetch prescription ── */
  useEffect(() => {
    if (!patient || !appointment) {
      setPrescription(null);
      setConsultations([]); setMedicines([]); setTests([]);
      return;
    }
    setLoadingRx(true);
    axios
      .get(`${process.env.REACT_APP_URL}/api/prescriptions/by-appointment`, {
        params: { patient_id: patient.id, appointment_id: appointment.id },
        withCredentials: true,
      })
      .then((res) => {
        if (res.data.success && res.data.data) {
          const rx = res.data.data;
          setPrescription(rx);
          setConsultations((rx.consultations || []).map(c => ({ ...c, cost: Number(c.cost || 0) })));
          setMedicines((rx.medicines || []).map(m => {
            const quantity = Number(m.quantity || 1);
            const amount   = Number(m.amount   || 0);
            return { ...m, quantity, amount, cost: quantity * amount };
          }));
          setTests((rx.tests || []).map(t => ({ ...t, cost: Number(t.cost || 0) })));
        } else {
          setPrescription(null);
          setConsultations([]); setMedicines([]); setTests([]);
        }
        setActiveSection("consultations");
      })
      .catch(() => {
        setPrescription(null);
        setConsultations([]); setMedicines([]); setTests([]);
      })
      .finally(() => setLoadingRx(false));
  }, [patient, appointment]);

  /* ── Update cost inline (non-edit-mode) ── */
  const updateCost = (setter, index, value) =>
    setter(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, cost: value === "" ? "" : Number(value) } : item
      )
    );

  /* ── Totals ── */
 const consultationTotal = consultations.reduce(
  (s, c) => s + Number(c.cost || 0),
  0
);

const medicineTotal = medicines.reduce(
  (s, m) => s + Number(m.cost || 0),
  0
);

const testTotal = tests.reduce(
  (s, t) => s + Number(t.cost || 0),
  0
);

    const subtotal = consultationTotal + medicineTotal + testTotal;

    const discountAmount =
      (subtotal * Number(discountPercentage || 0)) / 100;

    const taxableAmount = subtotal - discountAmount;

    const taxAmount =
      (taxableAmount * Number(taxPercentage || 0)) / 100;

    const totalAmount = taxableAmount + taxAmount;

      const sectionCounts = {
        consultations: consultations.length,
        medicines: medicines.length,
        tests: tests.length,
      };

      /* ── Submit ── */
      const handleSubmit = async () => {
  if (!patient) {
    setAlert({
      open: true,
      type: "warning",
      message: "Please select a patient",
    });
    return;
  }

  if (!appointment) {
    setAlert({
      open: true,
      type: "warning",
      message: "Please select an appointment",
    });
    return;
  }

  try {
    await axios.post(
      `${process.env.REACT_APP_URL}/bill/bills`,
      {
        appointment_id: appointment.id,
        prescription_id: prescription?.id || null,

        // Only send the inputs required for calculation
        subtotal,

        discount_percentage: discountPercentage,
        tax_percentage: taxPercentage,

        notes,

        bill_breakdown_json: {
          consultations,
          medicines,
          tests,
        },
      },
      { withCredentials: true }
    );

    onBillAdded?.();

    setAlert({
      open: true,
      type: "success",
      message: "Bill created successfully",
    });

    setTimeout(() => {
      resetForm();
      onClose();
    }, 1200);

  } catch (err) {
    setAlert({
      open: true,
      type: "error",
      message: err.response?.data?.message || "Server error",
    });
  }
};

    const resetForm = () => {
  setPatient(null);
  setAppointment(null);
  setPrescription(null);

  setPatients([]);
  setAppointments([]);

  setConsultations([]);
  setMedicines([]);
  setTests([]);

  setNotes("");

  setDiscountPercentage(0);
  setTaxPercentage(0);

  setActiveSection("consultations");
};

      /* ── active section content ── */
      const renderActiveSection = () => {
        if (activeSection === "consultations") {
          return (
            <>
              <SectionHeader
                title="Consultation Fees"
                subtotal={consultationTotal}
                onDeleteSection={() => deleteSection(setConsultations)}
              />
              <AddConsultationItem
                onAdd={(row) => addRow(setConsultations, row)}
              />
              <EditableCostTable
                rows={consultations}
                nameKey="name"
                onCostChange={(i, v) => updateCost(setConsultations, i, v)}
                onDelete={(i) => deleteRow(setConsultations, i)}
                onEditSave={(i, draft) => editSaveRow(setConsultations, i, draft, false)}
              />
            </>
          );
        }
        if (activeSection === "medicines") {
          return (
            <>
              <SectionHeader
                title="Medicines"
                subtotal={medicineTotal}
                onDeleteSection={() => deleteSection(setMedicines)}
              />
              <AddMedicineItem
                onAdd={(row) => addRow(setMedicines, row)}
              />
              <EditableCostTable
                rows={medicines}
                nameKey="medicine_name"
                onCostChange={(i, v) => updateCost(setMedicines, i, v)}
                onDelete={(i) => deleteRow(setMedicines, i)}
                onEditSave={(i, draft) => editSaveRow(setMedicines, i, draft, true)}
                isMedicine
                extraColumns={[
                  { label: "Qty",        render: (row) => row.quantity },
                  { label: "Unit Price", render: (row) => `₹${Number(row.amount || 0).toFixed(2)}` },
                ]}
              />
            </>
          );
        }
        return (
          <>
            <SectionHeader
              title="Tests"
              subtotal={testTotal}
              onDeleteSection={() => deleteSection(setTests)}
            />
            <AddTestItem
              onAdd={(row) => addRow(setTests, row)}
            />
            <EditableCostTable
              rows={tests}
              nameKey="test_name"
              onCostChange={(i, v) => updateCost(setTests, i, v)}
              onDelete={(i) => deleteRow(setTests, i)}
              onEditSave={(i, draft) => editSaveRow(setTests, i, draft, false)}
            />
          </>
        );
      };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
      >
        <DialogTitle
          sx={{
            display: "flex", justifyContent: "space-between",
            px: { xs: 2, sm: 3 }, py: 2,
          }}
        >
          <Typography fontWeight={600} fontSize={{ xs: 16, sm: 18 }} color={COLORS.primary}>
            Add Bill
          </Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 1 }}>
          <Stack spacing={2}>

            {/* PATIENT */}
            <Box>
              <Typography sx={labelSx}>Patient</Typography>
              <Autocomplete
                fullWidth
                options={patients}
                getOptionLabel={(o) => `${o.name} (ID: ${o.id})`}
                value={patient}
                onChange={(_, v) => {
                  setPatient(v);
                  setAppointment(null); setPrescription(null);
                  setConsultations([]); setMedicines([]); setTests([]);
                }}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Select patient" sx={fieldSx} />
                )}
              />
            </Box>

            {/* APPOINTMENT */}
            {patient && (
              <Box>
                <Typography sx={labelSx}>Appointment</Typography>
                <Autocomplete
                  fullWidth
                  options={appointments}
                  getOptionLabel={(o) =>
                    `#${o.id} — ${o.appointment_date} | ${o.from_time}–${o.to_time} | ${o.purpose || "—"}`
                  }
                  value={appointment}
                  onChange={(_, v) => setAppointment(v)}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Select appointment" sx={fieldSx} />
                  )}
                />
              </Box>
            )}

            {/* DOCTOR */}
            {appointment && (
              <Box>
                <Typography sx={labelSx}>Doctor</Typography>
                <TextField fullWidth disabled value={appointment?.doctor_name || ""} sx={fieldSx} />
              </Box>
            )}

            {loadingRx && (
              <Typography color="text.secondary" fontSize={13}>Fetching prescription...</Typography>
            )}

            {/* ── SIDEBAR + SECTION CONTENT (only once appointment is selected) ──
                Mobile/tablet: sidebar stacks ABOVE the content, full width,
                instead of a fixed-width column beside it.
                Laptop/desktop: original side-by-side layout, unchanged. */}
            {appointment && !loadingRx && (
              <Box sx={{ border: `1px solid ${COLORS.primary}`, borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, minHeight: { xs: "auto", md: 320 } }}>
                  {/* Sidebar */}
                  <Box
                    sx={{
                      bgcolor: "#fafbfc",
                      borderRight: { xs: "none", md: "1px solid #e2e8f0" },
                      borderBottom: { xs: "1px solid #e2e8f0", md: "none" },
                      p: { xs: 1, md: 1.5 },
                      width: { xs: "100%", md: "auto" },
                      overflowX: { xs: "auto", md: "visible" },
                    }}
                  >
                    <SectionNav
                      active={activeSection}
                      onChange={setActiveSection}
                      counts={sectionCounts}
                    />
                  </Box>
                  {/* Content */}
                  <Box sx={{ flex: 1, p: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
                    {renderActiveSection()}
                  </Box>
                </Box>
              </Box>
            )}

            {/* TOTALS */}
           {/* TOTALS */}
            {appointment && (
              <Box sx={{ bgcolor: "#f5f5f5", borderRadius: 2, p: { xs: 1.5, sm: 2 } }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Consultation Total</Typography>
                  <Typography fontWeight={600}>
                    ₹{consultationTotal.toFixed(2)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" mt={0.5}>
                  <Typography color="text.secondary">Medicine Total</Typography>
                  <Typography fontWeight={600}>
                    ₹{medicineTotal.toFixed(2)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" mt={0.5}>
                  <Typography color="text.secondary">Test Total</Typography>
                  <Typography fontWeight={600}>
                    ₹{testTotal.toFixed(2)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" mt={0.5}>
                  <Typography fontWeight={600}>Subtotal</Typography>
                  <Typography fontWeight={600}>
                    ₹{subtotal.toFixed(2)}
                  </Typography>
                </Stack>

                {/* Discount */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={1}
                  mt={2}
                >
                  <Typography>Discount (%)</Typography>

                  <TextField
                    type="number"
                    value={discountPercentage}
                    onChange={(e) =>
                      setDiscountPercentage(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    sx={{ width: { xs: "100%", sm: 120 } }}
                    inputProps={{
                      min: 0,
                      max: 100,
                      step: 0.01,
                    }}
                  />
                </Stack>

                <Stack direction="row" justifyContent="space-between" mt={1}>
                  <Typography color="text.secondary">
                    Discount Amount
                  </Typography>

                  <Typography color="error">
                    - ₹{discountAmount.toFixed(2)}
                  </Typography>
                </Stack>

                {/* GST */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={1}
                  mt={2}
                >
                  <Typography>GST (%)</Typography>

                  <TextField
                    type="number"
                    value={taxPercentage}
                    onChange={(e) =>
                      setTaxPercentage(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    sx={{ width: { xs: "100%", sm: 120 } }}
                    inputProps={{
                      min: 0,
                      max: 100,
                      step: 0.01,
                    }}
                  />
                </Stack>

                <Stack direction="row" justifyContent="space-between" mt={1}>
                  <Typography color="text.secondary">
                    GST Amount
                  </Typography>

                  <Typography>
                    ₹{taxAmount.toFixed(2)}
                  </Typography>
                </Stack>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  mt={2}
                  sx={{
                    borderTop: "1px solid #ccc",
                    pt: 1,
                  }}
                >
                  <Typography fontWeight={700}>
                    Grand Total
                  </Typography>

                  <Typography
                    fontWeight={700}
                    color={COLORS.primary}
                  >
                    ₹{totalAmount.toFixed(2)}
                  </Typography>
                </Stack>
              </Box>
            )}

            {/* NOTES */}
            <Box>
              <Typography sx={labelSx}>Notes</Typography>
              <TextField
                fullWidth multiline rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
                sx={{
                  ...fieldSx,
                  "& .MuiInputBase-root": { height: "auto", border: `2px solid ${COLORS.primary}` },
                }}
              />
            </Box>

            {/* SUBMIT */}
            <Box display="flex" justifyContent="center" pb={1}>
              <Button
                onClick={handleSubmit}
                fullWidth={isTablet}
                sx={{
                  bgcolor: COLORS.primary, color: "#fff",
                  px: { xs: 4, sm: 6 }, py: 1.2,
                  maxWidth: { xs: "100%", sm: 320 },
                  borderRadius: "24px",
                  fontWeight: 600, textTransform: "capitalize",
                }}
              >
                Create Bill
              </Button>
            </Box>

          </Stack>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={alert.type} onClose={() => setAlert({ ...alert, open: false })}>
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
}