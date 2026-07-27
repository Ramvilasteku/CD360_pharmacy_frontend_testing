// IpdNursingChargesSection.jsx
// Section inside IpdDetailModal for Nursing Charges.
// API endpoints used:
//   GET  /getall/nursing-charges?ipd_id=<id>
//   POST /post/nursing-charges              body: { ipd_id, charge_date, description, charge_amount }
//   PUT  /update/nursing-charges/:id        body: { charge_date, description, charge_amount }
//   DELETE /delete/nursing-charges/:id

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import ProtectedActionButton from "../../components/ProtectedActionButton";

const API = process.env.REACT_APP_API_URL;

const EMPTY_FORM = { charge_date: "", description: "", charge_amount: "" };

export default function IpdNursingChargesSection({ ipdId }) {
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
      const res = await axios.get(`${API}/getall/nursing-charges`, {
        params: { ipd_id: ipdId },
        withCredentials: true,
      });
      setRows(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [ipdId]);

  useEffect(() => { fetch(); }, [fetch]);

  const getCurrentDate = () => {
  return new Date().toISOString().split("T")[0];
};

  const openAdd = () => {
  setEditRow(null);

  setForm({
    ...EMPTY_FORM,
    charge_date: getCurrentDate(),
  });

  setShowModal(true);
};

  const openEdit = (row) => {
  setEditRow(row);

  setForm({
    charge_date: row.charge_date
      ? new Date(row.charge_date).toISOString().split("T")[0]
      : "",
    description: row.description || "",
    charge_amount: row.charge_amount || "",
  });

  setShowModal(true);
};

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this nursing charge?")) return;
    try {
      await axios.delete(`${API}/delete/nursing-charges/${id}`, { withCredentials: true });
      fetch();
    } catch (e) { alert(e.response?.data?.message || "Delete failed"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editRow) {
        await axios.put(`${API}/update/nursing-charges/${editRow.id}`, form, { withCredentials: true });
        alert("Updated successfully");
      } else {
        await axios.post(`${API}/post/nursing-charges`, { ipd_id: ipdId, ...form }, { withCredentials: true });
        alert("Nursing charge added");
      }
      setShowModal(false);
      fetch();
    } catch (e) {
      alert(e.response?.data?.message || "Error");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="ipd-section">
      <div className="ipd-section-header">
        <h3 className="ipd-section-title">Nursing Charges</h3>
       <ProtectedActionButton
        ipdId={ipdId}
        hideWhenDischarged={true}
        className="ipd-section-add-btn"
        onClick={openAdd}
      >
        + Add
      </ProtectedActionButton>
      </div>

      <div className="ipd-section-table-wrap">
        {loading ? <p className="ipd-section-empty">Loading…</p> :
         rows.length === 0 ? <p className="ipd-section-empty">No nursing charges found.</p> : (
          <table className="ipd-section-table">
            <thead>
              <tr><th>#</th><th>Charge Date</th><th>Description</th><th>Amount</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.charge_date}</td>
                  <td>{r.description || "—"}</td>
                  <td>₹{r.charge_amount}</td>
                  <td>
                  <ProtectedActionButton
                    ipdId={ipdId}
                    hideWhenDischarged={true}
                    className="ipd-act-btn edit"
                    onClick={() => openEdit(r)}
                  >
                    Edit
                  </ProtectedActionButton>

                  <ProtectedActionButton
                    ipdId={ipdId}
                    hideWhenDischarged={true}
                    className="ipd-act-btn delete"
                    onClick={() => handleDelete(r.id)}
                  >
                    Delete
                  </ProtectedActionButton>
                </td>
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
              <h4 className="ipd-sub-title">{editRow ? "Edit Nursing Charge" : "Add Nursing Charge"}</h4>
              <button className="idm-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="ipd-sub-body">
                <div className="ipd-form-group">
                  <label>Charge Date</label>
                  <input type="date" required value={form.charge_date}
                    onChange={(e) => setForm({ ...form, charge_date: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>Description</label>
                  <input type="text" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>Amount (₹)</label>
                  <input type="number" step="0.01" value={form.charge_amount}
                    onChange={(e) => setForm({ ...form, charge_amount: e.target.value })} />
                </div>
              </div>
              <div className="ipd-sub-footer">
                <button type="button" className="ipd-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="ipd-btn-submit" disabled={submitting}>
                  {submitting ? "Please wait…" : editRow ? "Update" : "Add Charge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}