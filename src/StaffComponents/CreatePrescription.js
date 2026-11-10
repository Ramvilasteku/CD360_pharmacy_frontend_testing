import React, { useState, useEffect } from "react";
import {
  Box, Select, MenuItem, Dialog, Snackbar, Alert,
} from "@mui/material";
import AddMedicine from "./AddMedicine";
import AddTest from "./AddTests";
import PrescriptionPreview from "./PrescriptionPreview";
import PrescriptionTable from "./PrescriptionTable";
import AddConsultation from "./AddConsultation";
import "./CreatePrescription.css";
 
/* ── API base ── */
const BASE = process.env.REACT_APP_SITE_URL;
 
export default function CreatePrescription() {
  const [patients, setPatients]             = useState([]);
  const [patientId, setPatientId]           = useState("");
  const [appointments, setAppointments]     = useState([]);
  const [appointmentId, setAppointmentId]   = useState("");
  const [medicines, setMedicines]           = useState([]);
  const [tests, setTests]                   = useState([]);
  const [company, setCompany]               = useState(null);
  const [doctor, setDoctor]                 = useState(null);
  const [rxId, setRxId]                     = useState(null);
  const [savedId, setSavedId]               = useState(null);
  const [consultation, setConsultation]     = useState([]);
  const [previewOpen, setPreviewOpen]       = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [activeSection, setActiveSection]   = useState("medicines");
  const [refreshRxTable, setRefreshRxTable] = useState(0);
  const [popupOpen, setPopupOpen]           = useState(false);
 
  /* ── Toast state ── */
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const showToast = (message, severity = "success") =>
    setToast({ open: true, message, severity });
  const closeToast = () => setToast(t => ({ ...t, open: false }));
  const [notes, setNotes] = useState({
  chiefComplaint: "",
  treatmentPlan: "",
  doctorNotes: "",
  });
  const [draftNotes, setDraftNotes] = useState({
  chiefComplaint: "",
  treatmentPlan: "",
  doctorNotes: "",
  });
 
  /* Keep the editable draft in sync whenever the committed notes change
     (e.g. when loading an existing prescription for edit). */
  useEffect(() => {
    setDraftNotes(notes);
  }, [notes]);
 
  /* ── Fetch company info ── */
  useEffect(() => {
    fetch(`${BASE}/api/company-info/full`, { credentials: "include" })
      .then(res => res.json())
      .then(d => {
        if (d.success) setCompany({
          name:    d.data.company_name || "",
          logo:    d.data.company_logo ? `${BASE}/Images/${d.data.company_logo}` : null,
          address: d.data.address || "",
          phone:   d.data.mobile || d.data.phone || "",
          email:   d.data.email || "",
        });
      })
      .catch(err => console.error("Company info error:", err));
  }, []);
 
  /* ── Fetch doctor ── */
  useEffect(() => {
    fetch(`${BASE}/api/staff/self`, { credentials: "include" })
      .then(res => res.json())
      .then(d => { if (d.success) setDoctor(d.data); })
      .catch(err => console.error("Staff fetch error:", err));
  }, []);
 
  useEffect(() => {
  console.log("appointments changed:", appointments);
  }, [appointments]);
 
  /* ── Fetch patients ── */
  const fetchPatients = () => {
    fetch(`${BASE}/appointment/appointments/pending/clients`, { credentials: "include" })
      .then(res => res.json())
      .then(d => {
        if (!d.success) return;
        const uniquePatients = Array.from(
          new Map(d.data.map(p => [p.id, {
            id: p.id, name: p.name, email: p.email,
            mobile: p.mobile, gender: p.gender,
            dob: p.dob, blood_group: p.blood_group,
          }])).values()
        );
        setPatients(uniquePatients);
        setAppointments(
          d.data.map(a => {
            // Different backends/endpoints have used different key names for
            // this field over time — check them all so this doesn't silently
            // break again if the API response shape changes.
            const purpose =
              a.appointment_purpose ??
              a.purpose ??
              a.reason ??
              a.reason_for_visit ??
              a.chief_complaint ??
              "";
 
            if (!purpose) {
              // Helps diagnose in devtools if the backend ever renames the
              // field again — remove once you've confirmed the key.
              console.warn(
                "No appointment purpose found on appointment record:",
                a
              );
            }
 
            return {
              id: a.appointment_id,
              client_id: a.id,
              appointment_date: a.appointment_date,
              doctor_name: a.doctor_name,
              status: a.appointment_status,
              prescription_id: a.prescription_id || null,
              appointment_purpose: purpose,
            };
          })
        );
      })
      .catch(err => console.error("Pending appointment clients error:", err));
  };
 
  useEffect(() => { fetchPatients(); }, []);
 
  const patientAppointments = patientId
    ? appointments.filter(a => String(a.client_id) === String(patientId))
    : [];
 
  /* ── Edit existing prescription ── */
  const handleEditPrescription = async (id) => {
    try {
      const res  = await fetch(`${BASE}/api/prescriptions/${id}`, { credentials: "include" });
      const data = await res.json();
      if (!data.success) return showToast("Failed to load prescription", "error");
      setRxId(id);
      setSavedId(id);
      setPatientId(data.data.patient.id);
      setAppointmentId(data.data.appointment_id || "");
      setMedicines(data.data.medicines || []);
      setTests(data.data.tests || []);
      setConsultation(data.data.consultations || []);
      setActiveSection("medicines");
      setPopupOpen(true);
    } catch (err) {
      console.error("Edit prescription error:", err);
      showToast("Failed to load prescription", "error");
    }
  };
 
  /* ── Preview ── */
  const previewPrescription = () => {
    if (!patientId) return showToast("Please select a patient", "warning");
    if (!medicines.length && !tests.length)
      return showToast("Add at least one medicine or test", "warning");
    setPreviewOpen(true);
  };
 
  /* ─────────────────────────────────────────────────────────────────
     SAVE PRESCRIPTION
     1. POST/PUT to /api/prescriptions  (backend auto-sends mail)
     2. If that mail attempt fails on the backend, we call
        /api/prescriptions/send-mail/:id as a fallback
     3. Show a toast for success / failure
     4. onClose() is called by PrescriptionPreview AFTER this resolves
  ───────────────────────────────────────────────────────────────── */
  const savePrescription = async () => {
  if (!patientId) throw new Error("Please select a patient");
 
  const payload = {
    patient_id: patientId,
    appointment_id: appointmentId || null,
    consultation_types: consultation,
    medicines,
    tests,
    notes: notes,
  };
 
  const url = rxId
    ? `${BASE}/api/prescriptions/${rxId}`
    : `${BASE}/api/prescriptions`;
 
  const method = rxId ? "PUT" : "POST";
 
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
 
  const data = await res.json();
 
  if (!data.success) throw new Error(data.message || "Save failed");
 
  const prescriptionId = data?.data?.prescription_id || rxId || null;
 
  setSavedId(prescriptionId);
  setRefreshRxTable(v => v + 1);
 
  showToast("Prescription saved & email sent ✓", "success");
};
 
 
  /* ── Reset ── */
  const resetForm = () => {
    setPatientId("");
    setAppointmentId("");
    setMedicines([]);
    setTests([]);
    setSavedId(null);
    setRxId(null);
    setConsultation([]);
    setActiveSection("medicines");
  };
 
  const handlePopupClose = () => {
  setPopupOpen(false);
  setTimeout(() => {
    resetForm();
  }, 200);
};
 
  const openNewPopup = () => {
    resetForm();
    setPopupOpen(true);
  };
 
  /* ── Derived ── */
  const clinicData = {
    name: company?.name || "", logo: company?.logo || null,
    phone: company?.phone || "", email: company?.email || "",
    address: company?.address || "",
  };
  const selectedPatient = patients.find(p => p.id === patientId);
 
  const sectionMeta = {
    medicines:    { title: "Medicines",              desc: "Add medications with dosage, route and frequency.",  icon: "💊" },
    tests:        { title: "Tests & Investigations", desc: "Order lab tests and diagnostic investigations.",     icon: "🔬" },
    consultation: { title: "Consultation Types",     desc: "Select applicable consultation categories.",         icon: "📋" },
      notes: {
    title: "Doctor Notes",
    desc: "Enter chief complaint, treatment plan and doctor's notes.",
    icon: "📝",
  },
  };
 
  const muiSelectSx = {
    fontSize: "0.86rem", borderRadius: "8px", background: "#fff",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1a56db" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1a56db", borderWidth: "1.5px" },
  };
 
  const SummaryList = ({ items, getLabel }) => {
    if (!items || !items.length) return null;
    const visible = items.slice(0, 3);
    const extra   = items.length - 3;
    return (
      <div className="rx-summary">
        {visible.map((item, i) => (
          <div className="rx-summary-item" key={i}>
            <div className="rx-summary-dot" />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {getLabel(item)}
            </span>
          </div>
        ))}
        {extra > 0 && <div className="rx-summary-more">+{extra} more…</div>}
      </div>
    );
  };
 
  return (
    <>
      <div className="rx-wrap">
 
        {/* ── Header ── */}
        <div className="rx-header">
          <h1>Prescriptions</h1>
          <button className="rx-header-create-btn" onClick={openNewPopup}>
            <span>＋</span>
            <span className="btn-text">Create Prescription</span>
          </button>
        </div>
 
        {/* ── History / Table ── */}
        <div className="rx-history">
          <PrescriptionTable
            onEdit={handleEditPrescription}
            currentData={{
              id: savedId,
              patient: patients.find(p => p.id === patientId) || {},
              appointment: appointments.find(a => a.id === appointmentId) || null,
              doctor, branch: doctor?.branch || "—", clinic: clinicData,
              consultations: consultation, medicines, tests,notes
            }}
            refreshKey={refreshRxTable}
          />
        </div>
 
        {/* ══════════════════════════════════════
            POPUP
        ══════════════════════════════════════ */}
        {popupOpen && (
          <div
            className="rx-popup-overlay"
            onClick={e => { if (e.target === e.currentTarget) handlePopupClose(); }}
          >
            <div className="rx-popup" role="dialog" aria-modal="true">
 
              <div className="rx-popup-header">
                <h2>{rxId ? "Edit Prescription" : "Create Prescription"}</h2>
                <div className="rx-popup-header-actions">
                  <button className="rx-popup-btn-preview" onClick={previewPrescription}>
                    <span>👁</span> Preview
                  </button>
                  <button className="rx-popup-close" onClick={handlePopupClose} aria-label="Close">✕</button>
                </div>
              </div>
 
              <div className="rx-popup-body">
 
                {/* LEFT PANEL */}
                <div className="rx-left">
                  <div className="rx-left-label">Patient</div>
                  <div className="rx-pt-card">
                    <Select
                      fullWidth displayEmpty size="small"
                      value={patientId}
                      onChange={e => {
                        setPatientId(e.target.value);
                        setAppointmentId("");
                        setSavedId(null);
                        setRxId(null);
                        setMedicines([]);
                        setTests([]);
                        setConsultation([]);
                      }}
                      sx={muiSelectSx}
                    >
                      <MenuItem value="">
                        <em style={{ color: "#64748b", fontStyle: "normal" }}>Select Patient…</em>
                      </MenuItem>
                      {patients.map(p => (
                        <MenuItem key={p.id} value={p.id}>{p.id} — {p.name}</MenuItem>
                      ))}
                    </Select>
 
                    {patientId && (
                      <Select
                        fullWidth displayEmpty size="small"
                        value={appointmentId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setAppointmentId(id);
 
                          const selectedAppointment = appointments.find(
                            (a) => String(a.id) === String(id)
                          );
 
                          // Only prefill the DRAFT — never touch the
                          // committed `notes` here. Committing happens
                          // only when the user presses Submit in the
                          // Notes tab. This also avoids clobbering
                          // anything the user already typed elsewhere.
                          if (selectedAppointment) {
                            setDraftNotes((prev) => ({
                              ...prev,
                              chiefComplaint:
                                selectedAppointment.appointment_purpose || "",
                            }));
                          }
                        }}
                        sx={muiSelectSx}
                      >
                        <MenuItem value="">
                          <em style={{ color: "#64748b", fontStyle: "normal" }}>Select Appointment…</em>
                        </MenuItem>
                        {patientAppointments.map(a => (
                          <MenuItem key={a.id} value={a.id}>
                            #{a.id} &nbsp;|&nbsp; {a.appointment_date} &nbsp;|&nbsp; {a.doctor_name}
                          </MenuItem>
                        ))}
                        {patientAppointments.length === 0 && (
                          <MenuItem disabled>No pending appointments</MenuItem>
                        )}
                      </Select>
                    )}
 
                    {selectedPatient && (
                      <div className="rx-pt-info">
                        <div className="rx-pt-info-name">{selectedPatient.name}</div>
                        {(selectedPatient.gender || selectedPatient.mobile) && (
                          <div className="rx-pt-info-sub">
                            {[selectedPatient.gender, selectedPatient.mobile].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
 
                  <div className="rx-divider" />
 
                  <div className="rx-left-label">Sections</div>
                  <div className="rx-nav">
 
                    <div
                      className={`rx-nav-item ${activeSection === "medicines" ? "active" : ""}`}
                      onClick={() => setActiveSection("medicines")}
                    >
                      <span className="ni-icon">💊</span>
                      Medicines
                      {medicines.length > 0 && <span className="rx-nav-badge">{medicines.length}</span>}
                    </div>
                    {medicines.length > 0 && activeSection !== "medicines" && (
                      <SummaryList items={medicines} getLabel={m => m.medicine_name || m.name || "Medicine"} />
                    )}
 
                    <div
                      className={`rx-nav-item ${activeSection === "tests" ? "active" : ""}`}
                      onClick={() => setActiveSection("tests")}
                    >
                      <span className="ni-icon">🔬</span>
                      Tests
                      {tests.length > 0 && <span className="rx-nav-badge">{tests.length}</span>}
                    </div>
                    {tests.length > 0 && activeSection !== "tests" && (
                      <SummaryList items={tests} getLabel={t => t.test_name || t.name || "Test"} />
                    )}
 
                    <div
                      className={`rx-nav-item ${activeSection === "consultation" ? "active" : ""}`}
                      onClick={() => setActiveSection("consultation")}
                    >
                      <span className="ni-icon">📋</span>
                      Consultation Types
                      {Array.isArray(consultation) && consultation.length > 0 && (
                        <span className="rx-nav-badge">{consultation.length}</span>
                      )}
                    </div>
 
 
                   <div
  className={`rx-nav-item ${activeSection === "notes" ? "active" : ""}`}
  onClick={() => setActiveSection("notes")}
>
  <span className="ni-icon">📝</span>
  Notes
 
</div>
 
 
 
 
                 
                    {Array.isArray(consultation) && consultation.length > 0 && activeSection !== "consultation" && (
                      <SummaryList
                        items={consultation}
                        getLabel={c => typeof c === "string" ? c : c.type || c.name || "Consultation"}
                      />
                    )}
 
                  </div>
 
                  <div className="rx-divider" />
 
                  <div className="rx-left-footer">
                    <button className="rx-btn-preview" onClick={previewPrescription}>
                      <span>👁</span> Preview Prescription
                    </button>
                  </div>
                </div>
 
                {/* RIGHT PANEL */}
                <div className="rx-right">
                  {!patientId ? (
                    <div className="rx-empty">
                      <div className="rx-empty-icon">🏥</div>
                      <h3>Select a Patient</h3>
                      <p>Choose a patient from the left panel to start building a prescription.</p>
                    </div>
                  ) : (
                    <>
                      <div className="rx-section-head">
                        <div className="rx-section-head-icon">{sectionMeta[activeSection].icon}</div>
                        <div className="rx-section-head-text">
                          <h2>{sectionMeta[activeSection].title}</h2>
                          <p>{sectionMeta[activeSection].desc}</p>
                        </div>
                      </div>
                      <div className="rx-content-card">
                        {activeSection === "medicines" && (
                          <AddMedicine initialMedicines={medicines} onMedicinesChange={setMedicines} />
                        )}
                        {activeSection === "tests" && (
                          <AddTest initialTests={tests} onTestsChange={setTests} />
                        )}
                        {activeSection === "consultation" && (
                          <AddConsultation initialConsultation={consultation} onConsultationChange={setConsultation} />
                        )}
                        {activeSection === "notes" && (
  <div className="rx-notes-container">
 
    <div className="rx-form-group">
      <div className="rx-form-group-header">
       
        <label>Chief Complaint / Appointment Purpose</label>
      </div>
      <textarea
        rows={4}
        className="rx-input"
        placeholder="Enter chief complaint..."
        value={draftNotes.chiefComplaint}
        onChange={(e) =>
          setDraftNotes({
            ...draftNotes,
            chiefComplaint: e.target.value,
          })
        }
      />
    </div>
 
    <div className="rx-form-group">
      <div className="rx-form-group-header">
       
        <label>Treatment Plan</label>
      </div>
      <textarea
        rows={4}
        className="rx-input"
        placeholder="Enter treatment plan..."
        value={draftNotes.treatmentPlan}
        onChange={(e) =>
          setDraftNotes({
            ...draftNotes,
            treatmentPlan: e.target.value,
          })
        }
      />
    </div>
 
    <div className="rx-form-group">
      <div className="rx-form-group-header">
     
        <label>Doctor Notes</label>
      </div>
      <textarea
        rows={4}
        className="rx-input"
        placeholder="Enter doctor notes..."
        value={draftNotes.doctorNotes}
        onChange={(e) =>
          setDraftNotes({
            ...draftNotes,
            doctorNotes: e.target.value,
          })
        }
      />
    </div>
 
    <div className="rx-notes-actions">
      <button
        type="button"
        className="rx-submit-btn"
        onClick={() => {
          const updatedNotes = { ...draftNotes };
          setNotes(updatedNotes);
          showToast("Notes saved successfully", "success");
        }}
      >
        <span>✓</span> Submit
      </button>
    </div>
 
  </div>
)}
                      </div>
                    </>
                  )}
                </div>
 
              </div>
            </div>
          </div>
        )}
 
        {/* ── Preview Dialog ── */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          fullWidth
          maxWidth="lg"
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <Box sx={{ height: "90vh", display: "flex", flexDirection: "column" }}>
            <PrescriptionPreview
              data={{
                id:            savedId,
                patient:       patients.find(p => p.id === patientId) || {},
                appointment:   appointments.find(a => a.id === appointmentId) || null,
                doctor,
                branch:        doctor?.branch || "—",
                clinic:        clinicData,
                consultations: consultation,
                medicines,
                tests,
                notes,
              }}
              onConfirmSave={savePrescription}
              saving={saving}
              onClose={() => {
                setPreviewOpen(false);
                // If saved, also close popup and reset
                if (savedId) {
                  handlePopupClose();
                }
              }}
            />
          </Box>
        </Dialog>
 
        {/* ── Global Toast ── */}
        <Snackbar
          open={toast.open}
          autoHideDuration={5000}
          onClose={closeToast}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={closeToast}
            severity={toast.severity}
            variant="filled"
            sx={{ width: "100%", fontWeight: 600, borderRadius: 2 }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
 
      </div>
    </>
  );
}