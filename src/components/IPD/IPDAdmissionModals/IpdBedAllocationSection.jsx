// IpdBedAllocationSection.jsx
// Section inside IpdDetailModal for Bed Allocations.
// API endpoints used:
//   GET  /getall/allocated-beds          (filtered client-side by ipd_id)
//   POST /post/allocate-bed              body: { ipd_id, bed_id, start_time }
//   PUT  /update/allocated-bed/:id       body: { bed_id, start_time, end_time, allocation_status }
//   DELETE /delete/allocated-bed/:id

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

const EMPTY_FORM = { bed_id: "", start_time: "", end_time: "", allocation_status: "active" };

export default function IpdBedAllocationSection({ ipdId }) {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // 1. Add this useEffect inside the section component, where `showForm` is
//    whatever boolean state controls the popup open/close:
 
useEffect(() => {
  if (showForm) {
    // Lock the body AND the idm-overlay behind it
    document.body.style.overflow = "hidden";
 
    const overlay = document.querySelector(".idm-overlay");
    if (overlay) overlay.classList.add("scroll-locked");
  } else {
    document.body.style.overflow = "";
 
    const overlay = document.querySelector(".idm-overlay");
    if (overlay) overlay.classList.remove("scroll-locked");
  }
 
  // Cleanup on unmount
  return () => {
    document.body.style.overflow = "";
    const overlay = document.querySelector(".idm-overlay");
    if (overlay) overlay.classList.remove("scroll-locked");
  };
}, [showForm]);


  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/getall/allocated-beds`, { withCredentials: true });
      const all = res.data.data || [];
      setRows(all.filter((r) => r.ipd_id === ipdId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [ipdId]);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => { setEditRow(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      bed_id: row.bed_id,
      start_time: row.start_time ? new Date(row.start_time).toISOString().slice(0, 16) : "",
      end_time:   row.end_time   ? new Date(row.end_time).toISOString().slice(0, 16)   : "",
      allocation_status: row.allocation_status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this allocation?")) return;
    try {
      await axios.delete(`${API}/delete/allocated-bed/${id}`, { withCredentials: true });
      fetch();
    } catch (e) { alert(e.response?.data?.message || "Delete failed"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editRow) {
        await axios.put(`${API}/update/allocated-bed/${editRow.id}`, form, { withCredentials: true });
        alert("Updated successfully");
      } else {
        await axios.post(`${API}/post/allocate-bed`, { ipd_id: ipdId, ...form }, { withCredentials: true });
        alert("Bed allocated successfully");
      }
      setShowModal(false);
      fetch();
    } catch (e) {
      alert(e.response?.data?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const f = (v) => v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const showActionsColumn = rows.some(
  (r) => r.allocation_status !== "completed"
  );

  return (
    <div className="ipd-section">
      <div className="ipd-section-header">
        <h3 className="ipd-section-title">Bed Allocation</h3>
        {/* <button className="ipd-section-add-btn" onClick={openAdd}>+ Add</button> */}
      </div>

      <div className="ipd-section-table-wrap">
        {loading ? <p className="ipd-section-empty">Loading…</p> :
         rows.length === 0 ? <p className="ipd-section-empty">No allocations found.</p> : (
          <table className="ipd-section-table">
            <thead>
              <tr><th>#</th><th>Bed ID</th><th>Bed No.</th><th>Start</th><th>End</th><th>Status</th>
               {/* {showActionsColumn && <th>Actions</th>} */}
              </tr>
            </thead>
            <tbody>
          {rows.map((r) => (
        <tr key={r.id}>
          <td>{r.id}</td>
          <td>{r.bed_id}</td>
          <td>{r.bed_number || "—"}</td>
          <td>{f(r.start_time)}</td>
          <td>{f(r.end_time)}</td>
          <td>
            <span
              className={`idm-status ${
                r.allocation_status === "active"
                  ? "admitted"
                  : "discharged"
              }`}
            >
              {r.allocation_status}
            </span>
          </td>

          {/* {showActionsColumn && (
            <td>
              {r.allocation_status !== "completed" && (
                <>
                  <button
                    className="ipd-act-btn edit"
                    onClick={() => openEdit(r)}
                  >
                    Edit
                  </button>

                  <button
                    className="ipd-act-btn delete"
                    onClick={() => handleDelete(r.id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </td>
          )} */}
        </tr>
        ))}
      </tbody>
          </table>
        )}
      </div>

      {/* {showModal && (
        <div className="ipd-sub-overlay" onClick={() => setShowModal(false)}>
          <div className="ipd-sub-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ipd-sub-header">
              <h4 className="ipd-sub-title">{editRow ? "Edit Allocation" : "Add Bed Allocation"}</h4>
              <button className="idm-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="ipd-sub-body">
                <div className="ipd-form-group">
                  <label>Bed ID</label>
                  <input type="number" required value={form.bed_id}
                    onChange={(e) => setForm({ ...form, bed_id: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>Start Time</label>
                  <input type="datetime-local" required value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>End Time</label>
                  <input type="datetime-local" value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
                {editRow && (
                  <div className="ipd-form-group">
                    <label>Status</label>
                    <select value={form.allocation_status} onChange={(e) => setForm({ ...form, allocation_status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="ipd-sub-footer">
                <button type="button" className="ipd-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="ipd-btn-submit" disabled={submitting}>
                  {submitting ? "Please wait…" : editRow ? "Update" : "Allocate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )} */}
    </div>
  );
}