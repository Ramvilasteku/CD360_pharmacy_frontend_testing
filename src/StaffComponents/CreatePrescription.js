import React, { useState, useEffect } from "react";
import {
  Box, Select, MenuItem, Dialog, Snackbar, Alert,
} from "@mui/material";
import AddMedicine from "./AddMedicine";
import AddTest from "./AddTests";
import PrescriptionPreview from "./PrescriptionPreview";
import PrescriptionTable from "./PrescriptionTable";
import AddConsultation from "./AddConsultation";

/* ── Scoped styles ─────────────────────────────────────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@400;600;700&display=swap');

.rx-wrap *, .rx-wrap *::before, .rx-wrap *::after { box-sizing: border-box; }

.rx-wrap {
  --blue:       #1a56db;
  --blue-dark:  #1341b0;
  --blue-light: #eff4ff;
  --blue-mid:   #dbeafe;
  --black:      #3f6f7a;
  --dark:       #1e293b;
  --text:       #0f172a;
  --muted:      #64748b;
  --border:     #e2e8f0;
  --surface:    #ffffff;
  --bg:         #f8fafc;
  --radius:     10px;
  --shadow:     0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.12);
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  min-height: 100vh;
}

/* ── Top header ── */
.rx-header {
  background: var(--black);
  padding: 0 32px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.rx-header h1 {
  font-family: 'Sora', sans-serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.01em;
  margin: 0;
}
.rx-header-create-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  background: rgb(90,155,165);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.84rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 2px 8px rgb(87, 174, 187);
  white-space: nowrap;
}
.rx-header-create-btn:hover {
  background: rgb(87, 174, 187);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgb(87, 174, 187);
}
.rx-header-create-btn:active { transform: translateY(0); }
@media (max-width: 860px) {
  .rx-header { padding: 0 16px; }
  .rx-header-create-btn .btn-text { display: none; }
  .rx-header-create-btn { padding: 8px 12px; }
}

/* ── History area ── */
.rx-history { padding: 24px 32px 40px; background: var(--bg); }
@media (max-width: 860px) { .rx-history { padding: 16px 16px 40px; } }

.rx-history-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 0 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}
.rx-history-bar h3 {
  font-family: 'Sora', sans-serif;
  font-size: 1rem; font-weight: 600;
  color: var(--text); margin: 0;
}
.rx-history-badge {
  font-size: 0.74rem;
  background: var(--blue-light);
  color: var(--blue);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid var(--blue-mid);
}

/* ══════════════════════════════════════════
   POPUP OVERLAY & CONTAINER
══════════════════════════════════════════ */
.rx-popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: rx-overlay-in 0.18s ease;
}
@keyframes rx-overlay-in {
  from { opacity: 0; } to { opacity: 1; }
}

.rx-popup {
  background: var(--bg);
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.22);
  width: 100%;
  max-width: 980px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: rx-popup-in 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes rx-popup-in {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Popup header bar */
.rx-popup-header {
  background: var(--black);
  padding: 0 20px;
  height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.rx-popup-header h2 {
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
  flex: 1;
}
.rx-popup-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rx-popup-btn-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.rx-popup-btn-preview:hover { background: rgba(255,255,255,0.2); }
.rx-popup-close {
  width: 30px; height: 30px;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-size: 1rem;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
  flex-shrink: 0;
}
.rx-popup-close:hover { background: rgba(220,38,38,0.5); border-color: rgba(220,38,38,0.4); }

/* Popup body: two columns */
.rx-popup-body {
  display: grid;
  grid-template-columns: 280px 1fr;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
@media (max-width: 860px) {
  .rx-popup-body { grid-template-columns: 1fr; overflow-y: auto; }
}

/* ══════════════════════════════════════════════
   LEFT PANEL
══════════════════════════════════════════════ */
.rx-left {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 20px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}
@media (max-width: 860px) {
  .rx-left { border-right: none; border-bottom: 1px solid var(--border); overflow-y: visible; }
}

.rx-left-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
  padding: 0 4px;
  margin-bottom: 8px;
}
.rx-pt-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 4px;
}
.rx-pt-info {
  background: var(--blue-light);
  border: 1px solid var(--blue-mid);
  border-radius: 8px;
  padding: 10px 12px;
}
.rx-pt-info-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 3px;
}
.rx-pt-info-sub { font-size: 0.75rem; color: var(--muted); }

.rx-divider {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
  flex-shrink: 0;
}
.rx-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 4px;
}
.rx-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.855rem;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}
.rx-nav-item:hover { background: var(--bg); color: var(--text); }
.rx-nav-item.active { background: var(--blue-light); color: var(--blue); font-weight: 600; }
.ni-icon { font-size: 1rem; line-height: 1; flex-shrink: 0; }
.rx-nav-badge {
  margin-left: auto;
  background: var(--blue);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 5px;
}
.rx-left-footer {
  margin-top: auto;
  padding-top: 16px;
}
.rx-btn-preview {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  background: var(--black);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.855rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.rx-btn-preview:hover { background: #2e5560; transform: translateY(-1px); }
.rx-btn-preview:active { transform: translateY(0); }

.rx-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 4px 0 6px 22px;
}
.rx-summary-item {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 9px;
  font-size: 0.76rem;
  color: var(--text);
}
.rx-summary-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--blue);
  flex-shrink: 0;
}
.rx-summary-more {
  font-size: 0.72rem;
  color: var(--muted);
  padding-left: 2px;
  margin-top: 1px;
}

/* ══════════════════════════════════════════════
   RIGHT PANEL
══════════════════════════════════════════════ */
.rx-right {
  padding: 28px 32px;
  overflow-y: auto;
}
@media (max-width: 860px) { .rx-right { padding: 20px 16px; } }

.rx-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  color: var(--muted);
}
.rx-empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
.rx-empty h3 {
  font-family: 'Sora', sans-serif;
  font-size: 1.15rem; font-weight: 600;
  color: var(--text); margin: 0 0 8px;
}
.rx-empty p { font-size: 0.875rem; max-width: 320px; line-height: 1.6; margin: 0; }

.rx-section-head { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 20px; }
.rx-section-head-icon { font-size: 1.6rem; line-height: 1; margin-top: 2px; }
.rx-section-head-text h2 {
  font-family: 'Sora', sans-serif;
  font-size: 1.1rem; font-weight: 700;
  color: var(--text); margin: 0 0 4px;
}
.rx-section-head-text p { font-size: 0.82rem; color: var(--muted); margin: 0; }

.rx-content-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
}
`;

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
        setAppointments(d.data.map(a => ({
          id: a.appointment_id, client_id: a.id,
          appointment_date: a.appointment_date,
          doctor_name: a.doctor_name, status: a.appointment_status,
          prescription_id: a.prescription_id || null,
        })));
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
      <style>{STYLES}</style>
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
              consultations: consultation, medicines, tests,
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
                        onChange={e => setAppointmentId(e.target.value)}
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