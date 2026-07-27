// IpdProceduresSection.jsx
// Section inside IpdDetailModal for Procedures.
// API endpoints used:
//   GET  /get/procedure/ipd/:ipd_id
//   POST /post/procedures              body: { ipd_id, procedure_name, procedure_date, doctor_id, notes, procedure_charge }
//   PUT  /update/procedure/:id         body: { procedure_name, procedure_date, doctor_id, notes, procedure_charge }
//   DELETE /delete/procedure/:id

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API  = process.env.REACT_APP_API_URL;
const SITE = process.env.REACT_APP_SITE_URL;

const EMPTY_FORM = { procedure_name: "", procedure_date: "", doctor_id: "", notes: "", procedure_charge: "" };

export default function IpdProceduresSection({ ipdId }) {
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
      const res = await axios.get(`${API}/get/procedure/ipd/${ipdId}`, { withCredentials: true });
      setRows(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [ipdId]);

  useEffect(() => { fetch(); fetchDoctors(); }, [fetch, fetchDoctors]);

  const openAdd = () => { setEditRow(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      procedure_name:   row.procedure_name,
      procedure_date:   row.procedure_date ? new Date(row.procedure_date).toISOString().slice(0, 16) : "",
      doctor_id:        row.doctor_id  || "",
      notes:            row.notes      || "",
      procedure_charge: row.procedure_charge || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this procedure?")) return;
    try {
      await axios.delete(`${API}/delete/procedure/${id}`, { withCredentials: true });
      fetch();
    } catch (e) { alert(e.response?.data?.message || "Delete failed"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editRow) {
        await axios.put(`${API}/update/procedure/${editRow.id}`, form, { withCredentials: true });
        alert("Updated successfully");
      } else {
        await axios.post(`${API}/post/procedures`, { ipd_id: ipdId, ...form }, { withCredentials: true });
        alert("Procedure added");
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
        <h3 className="ipd-section-title">Procedures</h3>
        {/* <button className="ipd-section-add-btn" onClick={openAdd}>+ Add</button> */}
      </div>

      <div className="ipd-section-table-wrap">
        {loading ? <p className="ipd-section-empty">Loading…</p> :
         rows.length === 0 ? <p className="ipd-section-empty">No procedures found.</p> : (
          <table className="ipd-section-table">
            <thead>
              <tr><th>#</th><th>Procedure</th><th>Date</th><th>Doctor</th><th>Notes</th><th>Charge</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.procedure_name}</td>
                  <td>{f(r.procedure_date)}</td>
                  <td>{r.doctor_id || "—"}</td>
                  <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{r.notes || "—"}</td>
                  <td>₹{r.procedure_charge}</td>
                 
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
              <h4 className="ipd-sub-title">{editRow ? "Edit Procedure" : "Add Procedure"}</h4>
              <button className="idm-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="ipd-sub-body">
                <div className="ipd-form-group">
                  <label>Procedure Name</label>
                  <input type="text" required value={form.procedure_name}
                    onChange={(e) => setForm({ ...form, procedure_name: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>Procedure Date & Time</label>
                  <input type="datetime-local" required value={form.procedure_date}
                    onChange={(e) => setForm({ ...form, procedure_date: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>Doctor (optional)</label>
                  <select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}>
                    <option value="">Select Doctor</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="ipd-form-group">
                  <label>Notes</label>
                  <textarea rows={3} value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>Charge (₹)</label>
                  <input type="number" step="0.01" value={form.procedure_charge}
                    onChange={(e) => setForm({ ...form, procedure_charge: e.target.value })} />
                </div>
              </div>
              <div className="ipd-sub-footer">
                <button type="button" className="ipd-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="ipd-btn-submit" disabled={submitting}>
                  {submitting ? "Please wait…" : editRow ? "Update" : "Add Procedure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}