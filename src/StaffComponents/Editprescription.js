import React, { useState, useEffect, useRef } from "react";
import {
  Box, Dialog, Select, MenuItem, Typography,
} from "@mui/material";
import AddMedicine from "./AddMedicine";
import AddTest from "./AddTests";
import AddConsultation from "./AddConsultation";
import PrescriptionPreview from "./PrescriptionPreview";
 
/* ── Scoped styles ─────────────────────────────────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@400;600;700&display=swap');

.rx-edit-wrap *, .rx-edit-wrap *::before, .rx-edit-wrap *::after { box-sizing: border-box; }
 
.rx-edit-wrap {
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
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
 
/* ── Header ── */
.rx-edit-header {
  background: var(--black);
  padding: 0 32px;
  height: 60px;
  min-height: 60px;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.rx-edit-header h1 {
  font-family: 'Sora', sans-serif;
  font-size: 1.05rem;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.01em;
  margin: 0;
}
.rx-edit-header-pill {
  margin-left: auto;
  background: rgba(255,180,0,0.25);
  color: #fbbf24;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 20px;
}
.rx-edit-header-close {
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  flex-shrink: 0;
}
.rx-edit-header-close:hover { background: rgba(255,255,255,0.2); }
 
/* ── Two-column body — fills remaining height, NO overflow ── */
.rx-edit-body {
  display: grid;
  grid-template-columns: 280px 1fr;
  flex: 1;
  min-height: 0;          /* critical: lets children scroll instead of expanding */
  overflow: hidden;
}
@media (max-width: 860px) {
  .rx-edit-body { grid-template-columns: 1fr; }
  .rx-edit-header { padding: 0 16px; }
}
 
/* ── LEFT PANEL — fixed, scrollable internally ── */
.rx-edit-left {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;       /* left panel scrolls if content overflows */
  height: 100%;
}
 
.rx-edit-left-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 4px;
  margin-bottom: 8px;
}
.rx-edit-pt-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;
}
.rx-edit-pt-info {
  background: var(--blue-light);
  border: 1px solid var(--blue-mid);
  border-radius: 8px;
  padding: 10px 12px;
}
.rx-edit-pt-info-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 3px;
}
.rx-edit-pt-info-sub {
  font-size: 0.75rem;
  color: var(--muted);
  margin-top: 2px;
}
.rx-edit-divider {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
  flex-shrink: 0;
}
 
/* ── Nav ── */
.rx-edit-nav { display: flex; flex-direction: column; gap: 4px; margin-bottom: 4px; }
.rx-edit-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.855rem;
  color: var(--muted);
  font-weight: 500;
  transition: all 0.15s;
  user-select: none;
}
.rx-edit-nav-item:hover { background: var(--bg); color: var(--text); }
.rx-edit-nav-item.active { background: var(--blue-light); color: var(--blue); font-weight: 600; }
.ni-icon { font-size: 1rem; line-height: 1; flex-shrink: 0; }
.rx-edit-nav-badge {
  margin-left: auto;
  background: var(--blue);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}
 
/* ── Left footer ── */
.rx-edit-left-footer {
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rx-edit-btn {
  width: 100%;
  padding: 11px 0;
  border: none;
  border-radius: 8px;
  font-size: 0.855rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s;
}
.rx-edit-btn-save { background: var(--blue); color: #fff; }
.rx-edit-btn-save:hover { background: var(--blue-dark); }
.rx-edit-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.rx-edit-btn-preview { background: var(--blue-light); color: var(--blue); border: 1px solid var(--blue-mid); }
.rx-edit-btn-preview:hover { background: var(--blue-mid); }
.rx-edit-btn-preview:disabled { opacity: 0.5; cursor: not-allowed; }
 
/* ── RIGHT PANEL — THIS IS THE KEY FIX ── */
.rx-edit-right {
  padding: 28px 32px;
  background: var(--bg);
  overflow-y: auto;       /* ← makes the right panel scrollable */
  height: 100%;           /* ← fills the grid row height */
}
@media (max-width: 860px) {
  .rx-edit-right { padding: 20px 16px; }
}
 
/* ── Section head ── */
.rx-edit-section-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}
.rx-edit-section-head-icon {
  width: 44px; height: 44px;
  border-radius: 10px;
  background: var(--blue-light);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
  border: 1px solid var(--blue-mid);
}
.rx-edit-section-head-text h2 {
  font-family: 'Sora', sans-serif;
  font-size: 1.05rem; font-weight: 600;
  color: var(--text); margin: 0 0 4px;
}
.rx-edit-section-head-text p {
  font-size: 0.82rem; color: var(--muted); margin: 0;
}
.rx-edit-content-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
}
 
/* ── Loading spinner ── */
.rx-edit-loading {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 200px; gap: 12px;
  color: var(--muted); font-size: 0.9rem;
}
.rx-edit-spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
 
/* ── Info bar ── */
.rx-edit-info-bar {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.8rem;
  color: #92400e;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
`;
 
const muiSelectSx = {
  fontSize: "0.86rem",
  borderRadius: "8px",
  background: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1a56db" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1a56db", borderWidth: "1.5px" },
};
 
const navSections = [
  {
    key: "medicines",
    label: "Medicines",
    icon: "💊",
  },
  {
    key: "tests",
    label: "Tests",
    icon: "🔬",
  },
  {
    key: "consultation",
    label: "Consultation Types",
    icon: "📋",
  },
  {
    key: "notes",
    label: "Notes",
    icon: "📝",
  },
];
 
const sectionMeta = {
  medicines: {
    title: "Medicines",
    desc: "Edit medications with dosage, route and frequency.",
    icon: "💊",
  },
 
  tests: {
    title: "Tests & Investigations",
    desc: "Edit lab tests and diagnostic investigations.",
    icon: "🔬",
  },
 
  consultation: {
    title: "Consultation Types",
    desc: "Select applicable consultation categories.",
    icon: "📋",
  },
 
  notes: {
    title: "Doctor Notes",
    desc: "Edit chief complaint, treatment plan and doctor's notes.",
    icon: "📝",
  },
};
 
export default function EditPrescription({ prescriptionId, onClose, onSaved }) {
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [activeSection, setActiveSection] = useState("medicines");
  const [previewOpen, setPreviewOpen]     = useState(false);
 
  const [patient, setPatient]             = useState(null);
  const [appointment, setAppointment]     = useState(null);
  const [medicines, setMedicines]         = useState([]);
  const [tests, setTests]                 = useState([]);
  const [consultation, setConsultation]   = useState([]);
  const [company, setCompany]             = useState(null);
  const [doctor, setDoctor]               = useState(null);
  const [notes, setNotes] = useState({
  chiefComplaint: "",
  treatmentPlan: "",
  doctorNotes: "",
});
  // Ref to scroll the right panel to top when switching sections
  const rightPanelRef = useRef(null);
 
  // ── Fetch company ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${process.env.REACT_APP_SITE_URL}/api/company-info/full`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCompany({
            name:    d.data.company_name || "",
            logo:    d.data.company_logo ? `${process.env.REACT_APP_SITE_URL}/Images/${d.data.company_logo}` : null,
            address: d.data.address || "",
            phone:   d.data.mobile || d.data.phone || "",
            email:   d.data.email || "",
          });
        }
      })
      .catch(console.error);
  }, []);
 
  // ── Fetch doctor ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${process.env.REACT_APP_SITE_URL}/api/staff/self`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.success) setDoctor(d.data); })
      .catch(console.error);
  }, []);
 
  // ── Fetch prescription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!prescriptionId) return;
    setLoading(true);
    fetch(`${process.env.REACT_APP_SITE_URL}/api/prescriptions/${prescriptionId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (!d.success) { alert("Failed to load prescription"); onClose(); return; }
        const rx = d.data;
        let parsedNotes = {};
 
        try {
          parsedNotes =
            typeof rx.notes === "string"
              ? JSON.parse(rx.notes)
              : (rx.notes || {});
        } catch (e) {
          parsedNotes = {};
        }
        setPatient(rx.patient || null);
        setAppointment(rx.appointment || null);
        setMedicines(rx.medicines || []);
        setTests(rx.tests || []);
        setConsultation(rx.consultations || []);
 
      setNotes({
    chiefComplaint: rx.appointment?.purpose || "",
    treatmentPlan: rx.description || "",
    doctorNotes: rx.notes || "",
});
 
      })
      .catch(err => { console.error(err); alert("Error loading prescription"); onClose(); })
      .finally(() => setLoading(false));
  }, [prescriptionId]);
 
  // Scroll right panel to top when switching sections
  const switchSection = (key) => {
    setActiveSection(key);
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollTop = 0;
    }
  };
 
  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(
        `${process.env.REACT_APP_SITE_URL}/api/prescriptions/${prescriptionId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        appointment_id: appointment?.id || null,
        consultation_types: consultation,
        medicines,
        tests,
        notes,
      }),
        }
      );
      const data = await res.json();
      if (!data.success) { alert(data.message || "Update failed"); return; }
      alert("Prescription updated successfully!");
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error while saving");
    } finally {
      setSaving(false);
    }
  };
 
  const navWithCounts = navSections.map(s => ({
    ...s,
    count:
      s.key === "medicines"    ? medicines.length :
      s.key === "tests"        ? tests.length :
      Array.isArray(consultation) ? consultation.length : 0,
  }));
 
  const clinicData = {
    name:    company?.name    || "",
    logo:    company?.logo    || null,
    phone:   company?.phone   || "",
    email:   company?.email   || "",
    address: company?.address || "",
  };
 
  return (
    <>
      <style>{STYLES}</style>
      <div className="rx-edit-wrap">
 
        {/* ── Header ── */}
        <div className="rx-edit-header">
          <h1>✏️ Edit Prescription #{prescriptionId}</h1>
          <span className="rx-edit-header-pill">Editing</span>
          <button className="rx-edit-header-close" onClick={onClose} title="Close">✕</button>
        </div>
 
        {/* ── Body ── */}
        <div className="rx-edit-body">
 
          {/* LEFT */}
          <div className="rx-edit-left">
            <div className="rx-edit-left-label">Patient</div>
            <div className="rx-edit-pt-card">
              {loading ? (
                <Typography variant="body2" color="text.secondary">Loading…</Typography>
              ) : patient ? (
                <div className="rx-edit-pt-info">
                  <div className="rx-edit-pt-info-name">{patient.name}</div>
                  <div className="rx-edit-pt-info-sub">ID: {patient.id}</div>
                  {appointment?.appointment_date && (
                    <div className="rx-edit-pt-info-sub" style={{ marginTop: 6 }}>
                      📅 {new Date(appointment.appointment_date).toLocaleDateString("en-IN")}
                    </div>
                  )}
                </div>
              ) : (
                <Typography variant="body2" color="text.secondary">No patient info</Typography>
              )}
            </div>
 
            <div className="rx-edit-divider" />
 
            <div className="rx-edit-left-label">Sections</div>
            <div className="rx-edit-nav">
              {navWithCounts.map(s => (
                <div
                  key={s.key}
                  className={`rx-edit-nav-item ${activeSection === s.key ? "active" : ""}`}
                  onClick={() => switchSection(s.key)}
                >
                  <span className="ni-icon">{s.icon}</span>
                  {s.label}
                  {s.count > 0 && <span className="rx-edit-nav-badge">{s.count}</span>}
                </div>
              ))}
            </div>
 
            <div className="rx-edit-divider" />
 
            <div className="rx-edit-left-footer">
              <button
                className="rx-edit-btn rx-edit-btn-preview"
                onClick={() => setPreviewOpen(true)}
                disabled={loading}
              >
                <span>👁</span> Preview
              </button>
              <button
                className="rx-edit-btn rx-edit-btn-save"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving ? "Saving…" : "💾 Save Changes"}
              </button>
            </div>
          </div>
 
          {/* RIGHT — scrollable */}
          <div className="rx-edit-right" ref={rightPanelRef}>
            {loading ? (
              <div className="rx-edit-loading">
                <div className="rx-edit-spinner" />
                Loading prescription data…
              </div>
            ) : (
              <>
                <div className="rx-edit-info-bar">
                  ⚠️ Editing Prescription <strong>#{prescriptionId}</strong> — changes will overwrite the existing record.
                </div>
 
                <div className="rx-edit-section-head">
                  <div className="rx-edit-section-head-icon">{sectionMeta[activeSection].icon}</div>
                  <div className="rx-edit-section-head-text">
                    <h2>{sectionMeta[activeSection].title}</h2>
                    <p>{sectionMeta[activeSection].desc}</p>
                  </div>
                </div>
 
                <div className="rx-edit-content-card">
                  {activeSection === "medicines" && (
                    <AddMedicine
                      initialMedicines={medicines}
                      onMedicinesChange={setMedicines}
                    />
                  )}
                  {activeSection === "tests" && (
                    <AddTest
                      initialTests={tests}
                      onTestsChange={setTests}
                    />
                  )}
                  {activeSection === "consultation" && (
                    <AddConsultation
                      initialConsultations={consultation}
                      onConsultationChange={setConsultation}
                    />
                  )}
 
                  {activeSection === "notes" && (
                    <div>
 
                      <div style={{ marginBottom: 20 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          Chief Complaint
                        </Typography>
 
                        <textarea
                          rows={4}
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            resize: "vertical",
                          }}
                          value={notes.chiefComplaint}
                          onChange={(e) =>
                            setNotes({
                              ...notes,
                              chiefComplaint: e.target.value,
                            })
                          }
                        />
                      </div>
 
                      <div style={{ marginBottom: 20 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          Treatment Plan
                        </Typography>
 
                        <textarea
                          rows={4}
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            resize: "vertical",
                          }}
                          value={notes.treatmentPlan}
                          onChange={(e) =>
                            setNotes({
                              ...notes,
                              treatmentPlan: e.target.value,
                            })
                          }
                        />
                      </div>
 
                      <div>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, mb: 1 }}
                        >
                          Doctor Notes
                        </Typography>
 
                        <textarea
                          rows={4}
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            resize: "vertical",
                          }}
                          value={notes.doctorNotes}
                          onChange={(e) =>
                            setNotes({
                              ...notes,
                              doctorNotes: e.target.value,
                            })
                          }
                        />
                      </div>
 
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
 
      {/* ── Preview Dialog ── */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="lg">
        <Box sx={{ p: 2 }}>
          <PrescriptionPreview
            data={{
              id:            prescriptionId,
              patient:       patient || {},
              appointment,
              doctor,
              branch:        doctor?.branch || "—",
              clinic:        clinicData,
              consultations: consultation,
              medicines,
              tests,
              notes,                 // ← Add this line
            }}
            onConfirmSave={handleSave}
            saving={saving}
            onClose={() => setPreviewOpen(false)}
          />
        </Box>
      </Dialog>
    </>
  );
}
 
