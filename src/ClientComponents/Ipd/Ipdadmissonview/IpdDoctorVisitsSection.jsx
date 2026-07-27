// IpdDoctorVisitsSection.jsx
// Section inside IpdDetailModal for Doctor Visits.
// API endpoints used:
//   GET  /get/doctor-visits/byipd/:ipd_id
//   POST /post/doctor-visit/              body: { ipd_id, doctor_id, visit_date, visit_notes, visit_charge }
//   PUT  /update/doctor-visit/:id         body: { visit_date, visit_notes, visit_charge }
//   DELETE /delete/doctor-visit/:id

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;
const SITE = process.env.REACT_APP_SITE_URL;

const EMPTY_FORM = { doctor_id: "", visit_date: "", visit_notes: "", visit_charge: "" };

export default function IpdDoctorVisitsSection({ ipdId }) {
  const [rows, setRows]           = useState([]);
  const [doctors, setDoctors]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await axios.get(`${SITE}/api/staff/branch-doctors`, { withCredentials: true });
      setDoctors(res.data.data || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/get/doctor-visits/byipd/${ipdId}`, { withCredentials: true });
      setRows(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [ipdId]);

  useEffect(() => { fetch(); fetchDoctors(); }, [fetch, fetchDoctors]);

  const openAdd = () => { setEditRow(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      doctor_id:    row.doctor_id,
      visit_date:   row.visit_date ? new Date(row.visit_date).toISOString().slice(0, 16) : "",
      visit_notes:  row.visit_notes  || "",
      visit_charge: row.visit_charge || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this visit?")) return;
    try {
      await axios.delete(`${API}/delete/doctor-visit/${id}`, { withCredentials: true });
      fetch();
    } catch (e) { alert(e.response?.data?.message || "Delete failed"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editRow) {
        await axios.put(`${API}/update/doctor-visit/${editRow.id}`, {
          visit_date:   form.visit_date,
          visit_notes:  form.visit_notes,
          visit_charge: form.visit_charge,
        }, { withCredentials: true });
        alert("Updated successfully");
      } else {
        await axios.post(`${API}/post/doctor-visit/`, { ipd_id: ipdId, ...form }, { withCredentials: true });
        alert("Visit added successfully");
      }
      setShowModal(false);
      fetch();
    } catch (e) {
      alert(e.response?.data?.message || "Error");
    } finally { setSubmitting(false); }
  };

  const f = (v) => v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="ipd-section">
      <div className="ipd-section-header">
        <h3 className="ipd-section-title">Doctor Visits</h3>
        {/* <button className="ipd-section-add-btn" onClick={openAdd}>+ Add</button> */}
      </div>

      <div className="ipd-section-table-wrap">
        {loading ? <p className="ipd-section-empty">Loading…</p> :
         rows.length === 0 ? <p className="ipd-section-empty">No doctor visits found.</p> : (
          <table className="ipd-section-table">
            <thead>
              <tr><th>#</th><th>Doctor</th><th>Visit Date</th><th>Notes</th><th>Charge</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.doctor_name || r.doctor_id}</td>
                  <td>{f(r.visit_date)}</td>
                  <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{r.visit_notes || "—"}</td>
                  <td>₹{r.visit_charge}</td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="ipd-sub-overlay" onClick={() => setShowModal(false)}>
          <div className="ipd-sub-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ipd-sub-header">
              <h4 className="ipd-sub-title">{editRow ? "Edit Visit" : "Add Doctor Visit"}</h4>
              <button className="idm-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="ipd-sub-body">
                {!editRow && (
                  <div className="ipd-form-group">
                    <label>Doctor</label>
                    <select required value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}>
                      <option value="">Select Doctor</option>
                      {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="ipd-form-group">
                  <label>Visit Date & Time</label>
                  <input type="datetime-local" required value={form.visit_date}
                    onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>Visit Notes</label>
                  <textarea rows={3} value={form.visit_notes}
                    onChange={(e) => setForm({ ...form, visit_notes: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>Charge (₹)</label>
                  <input type="number" step="0.01" value={form.visit_charge}
                    onChange={(e) => setForm({ ...form, visit_charge: e.target.value })} />
                </div>
              </div>
              <div className="ipd-sub-footer">
                <button type="button" className="ipd-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="ipd-btn-submit" disabled={submitting}>
                  {submitting ? "Please wait…" : editRow ? "Update" : "Add Visit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}