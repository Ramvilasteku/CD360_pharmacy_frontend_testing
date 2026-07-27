// IpdDetailModal.jsx
// Main modal that opens when clicking on an IPD ID row.
// Shows patient details + all sub-sections (Bed Charges, Bed Allocation,
// Doctor Visits, Lab Tests, Procedures, Nursing Charges, Misc Charges).
//
// HOW TO USE:
//   1. Place this file and all other files from this set in your src/components/ipd/ folder.
//   2. Import and render <IpdDetailModal /> inside IpdAdmission.jsx (see bottom of this file for example).
//   3. Pass the selected admission object as `admission` prop and an `onClose` callback.
//
// DEPENDENCIES: axios, ./IpdBedChargesSection, ./IpdBedAllocationSection,
//   ./IpdDoctorVisitsSection, ./IpdLabTestsSection, ./IpdProceduresSection,
//   ./IpdNursingChargesSection, ./IpdMiscChargesSection, ./IpdDetailModal.css
import { Skeleton, Box, Grid } from "@mui/material";
import React, { useEffect, useState } from "react";
import axios from "axios";

import IpdBedChargesSection     from "./IpdBedChargesSection";
import IpdBedAllocationSection  from "./IpdBedAllocationSection";
import IpdDoctorVisitsSection   from "./IpdDoctorVisitsSection";
import IpdLabTestsSection       from "./IpdLabTestsSection";
import IpdProceduresSection     from "./IpdProceduresSection";
import IpdNursingChargesSection from "./IpdNursingChargesSection";
import IpdMiscChargesSection    from "./IpdMiscChargesSection";
import IpdPharmacySection       from "./IpdPharmacySection";


import "./IpdDetailModal.css";

export default function IpdDetailModal({ admission, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch full IPD detail (clients, doctors info may already be on the admission object)
  // We just enrich it if needed; for now we use the passed admission directly.
  useEffect(() => {
  if (!admission) return;

  setLoading(true);

  const timer = setTimeout(() => {
    setDetail(admission);
    setLoading(false);
  }, 3000); // 👈 minimum 3 seconds skeleton

  return () => clearTimeout(timer);
}, [admission]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!admission) return null;

  return (
    <div className="idm-overlay" onClick={onClose}>
      <div className="idm-panel" onClick={(e) => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="idm-header">
          <div className="idm-header-left">
            <span className="idm-badge">IPD</span>
            <h2 className="idm-title">{admission.id}</h2>
          </div>
          <button className="idm-close" onClick={onClose}>✕</button>
        </div>

       {loading ? (
  <Box sx={{ p: 2 }}>
    
    {/* Header skeleton */}
    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
      <Skeleton variant="text" width={120} height={40} />
      <Skeleton variant="circular" width={30} height={30} />
    </Box>

    {/* Info grid skeleton */}
    <Grid container spacing={2}>
      {Array.from({ length: 10 }).map((_, i) => (
        <Grid item xs={6} key={i}>
          <Skeleton variant="text" height={25} />
          <Skeleton variant="text" width="80%" />
        </Grid>
      ))}
    </Grid>

    {/* Section skeletons */}
    <Box sx={{ mt: 3 }}>
      <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />
      <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />
      <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />
    </Box>

  </Box>
) : (
          <div className="idm-body">

            {/* ── PATIENT INFO CARD ── */}
            <div className="idm-info-grid">
              <InfoItem label="Client ID"       value={detail.client_id} />
              <InfoItem label="Client Name"     value={detail.client_name || "—"} />
              <InfoItem label="Doctor ID"       value={detail.doctor_id   || "—"} />
              <InfoItem label="Doctor Name"     value={detail.doctor_name || "—"} />
              <InfoItem label="Bed ID"          value={detail.bed_id      || "—"} />
              <InfoItem label="Branch"          value={detail.branch_name || "—"} />
              <InfoItem label="Admission Date"  value={fmtDate(detail.admission_date)} />
              <InfoItem label="Discharge Date"  value={fmtDate(detail.discharge_date)} />
              <InfoItem label="Status"
                value={
                  <span className={`idm-status ${detail.status}`}>
                    {detail.status}
                  </span>
                }
              />
              <InfoItem label="Admission Reason" value={detail.admission_reason || "—"} wide />
              <InfoItem label="Discharge Summary" value={detail.discharge_summary || "—"} wide />
            </div>

            {/* ── SECTIONS ── */}
            <IpdBedChargesSection     ipdId={admission.id} />
            <IpdBedAllocationSection  ipdId={admission.id} />
            <IpdDoctorVisitsSection   ipdId={admission.id} />
            <IpdLabTestsSection       ipdId={admission.id} />
            <IpdProceduresSection     ipdId={admission.id} />
            <IpdNursingChargesSection ipdId={admission.id} />
            <IpdMiscChargesSection    ipdId={admission.id} />
            <IpdPharmacySection       ipdId={admission.id} />
            
          </div>
        )}
      </div>
    </div>
  );
}

// ── tiny helper components ──────────────────────────────────────────────────
function InfoItem({ label, value, wide }) {
  return (
    <div className={`idm-info-item ${wide ? "wide" : ""}`}>
      <span className="idm-info-label">{label}</span>
      <span className="idm-info-value">{value ?? "—"}</span>
    </div>
  );
}

function fmtDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOW TO WIRE THIS INTO IpdAdmission.jsx
   ─────────────────────────────────────────────────────────────────────────────
   1. Add state:
        const [detailAdmission, setDetailAdmission] = useState(null);

   2. Make the IPD ID cell clickable in AdmissionRow:
        <td
          className="ipd-id-link"
          onClick={() => setDetailAdmission(admission)}
          style={{ cursor: "pointer", color: "#2563eb", textDecoration: "underline" }}
        >
          {admission.id}
        </td>

   3. Render the modal at the bottom of IpdAdmission return (after existing modal):
        {detailAdmission && (
          <IpdDetailModal
            admission={detailAdmission}
            onClose={() => setDetailAdmission(null)}
          />
        )}
   ───────────────────────────────────────────────────────────────────────────── */