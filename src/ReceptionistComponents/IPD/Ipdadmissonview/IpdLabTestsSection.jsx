// IpdLabTestsSection.jsx
// Section inside IpdDetailModal for Lab Tests.
// API endpoints used:
//   GET  /get/lab-tests/ipd/:ipd_id
//   POST /post/lab-tests/              body: { ipd_id, test_name, test_date, result_status, test_charge }
//   PUT  /update/lab-test/:id          body: { test_name, test_date, result_status, test_charge }
//   DELETE /delete/lab-test/:id

import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import ProtectedActionButton from "../../components/ProtectedActionButton";

const API = process.env.REACT_APP_API_URL;

const EMPTY_FORM = { test_name: "", test_date: "", result_status: "pending", test_charge: "" };

export default function IpdLabTestsSection({ ipdId }) {
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
      const res = await axios.get(`${API}/get/lab-tests/ipd/${ipdId}`, { withCredentials: true });
      setRows(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [ipdId]);

  useEffect(() => { fetch(); }, [fetch]);

  const formatDateTimeLocal = (dateString) => {
  const d = new Date(dateString);

  const offset = d.getTimezoneOffset();

  return new Date(d.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 16);
};

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 16);
};

 const openAdd = () => {
  setEditRow(null);

  setForm({
    test_name: "",
    test_date: getCurrentDateTimeLocal(),
    result_status: "pending",
    test_charge: "",
  });

  setShowModal(true);
};
    const openEdit = (row) => {
      console.log("Lab Test Date:", row.test_date);

      setEditRow(row);

      setForm({
        test_name: row.test_name,
        test_date: row.test_date
          ? formatDateTimeLocal(row.test_date)
          : "",
        result_status: row.result_status,
        test_charge: row.test_charge,
      });

      setShowModal(true);
    };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lab test?")) return;
    try {
      await axios.delete(`${API}/delete/lab-test/${id}`, { withCredentials: true });
      fetch();
    } catch (e) { alert(e.response?.data?.message || "Delete failed"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editRow) {
        await axios.put(`${API}/update/lab-test/${editRow.id}`, form, { withCredentials: true });
        alert("Updated successfully");
      } else {
        await axios.post(`${API}/post/lab-tests/`, { ipd_id: ipdId, ...form }, { withCredentials: true });
        alert("Lab test added");
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
        <h3 className="ipd-section-title">Lab Tests</h3>
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
         rows.length === 0 ? <p className="ipd-section-empty">No lab tests found.</p> : (
          <table className="ipd-section-table">
            <thead>
              <tr><th>#</th><th>Test Name</th><th>Test Date</th><th>Status</th><th>Charge</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.test_name}</td>
                  <td>{f(r.test_date)}</td>
                  <td>
                    <span className={`idm-status ${r.result_status === "completed" ? "discharged" : "admitted"}`}>
                      {r.result_status}
                    </span>
                  </td>
                  <td>₹{r.test_charge}</td>
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
              <h4 className="ipd-sub-title">{editRow ? "Edit Lab Test" : "Add Lab Test"}</h4>
              <button className="idm-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="ipd-sub-body">
                <div className="ipd-form-group">
                  <label>Test Name</label>
                  <input type="text" required value={form.test_name}
                    onChange={(e) => setForm({ ...form, test_name: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>Test Date & Time</label>
                  <input type="datetime-local" required value={form.test_date}
                    onChange={(e) => setForm({ ...form, test_date: e.target.value })} />
                </div>
                <div className="ipd-form-group">
                  <label>Result Status</label>
                  <select value={form.result_status} onChange={(e) => setForm({ ...form, result_status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="ipd-form-group">
                  <label>Charge (₹)</label>
                  <input type="number" step="0.01" value={form.test_charge}
                    onChange={(e) => setForm({ ...form, test_charge: e.target.value })} />
                </div>
              </div>
              <div className="ipd-sub-footer">
                <button type="button" className="ipd-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="ipd-btn-submit" disabled={submitting}>
                  {submitting ? "Please wait…" : editRow ? "Update" : "Add Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}