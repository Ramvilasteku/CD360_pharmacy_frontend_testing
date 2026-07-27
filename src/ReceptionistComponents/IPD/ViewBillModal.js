// ViewBillModal.jsx  +  EditBillModal.jsx
// Both are named exports, lazy-loaded by IpdBills.jsx
// ─────────────────────────────────────────────────────────────

import React, { useState, memo } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001/api";
const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

/* ─────────────────────────────────────────────
   VIEW BILL MODAL
───────────────────────────────────────────── */
export function ViewBillModal({ data, onClose }) {
  const { bill_summary: b, charges } = data;

  const chargeGroups = [
    { key: "bed_charges",     label: "Bed Charges",     amountKey: "charge_amount" },
    { key: "pharmacy",        label: "Pharmacy",         amountKey: "total_price" },
    { key: "lab_tests",       label: "Lab Tests",        amountKey: "test_charge" },
    { key: "doctor_visits",   label: "Doctor Visits",    amountKey: "visit_charge" },
    { key: "procedures",      label: "Procedures",       amountKey: "procedure_charge" },
    { key: "nursing_charges", label: "Nursing Charges",  amountKey: "charge_amount" },
    { key: "misc_charges",    label: "Misc Charges",     amountKey: "charge_amount" },
  ];

  return (
    <div className="bill-modal-overlay" onClick={(e) => e.target.classList.contains("bill-modal-overlay") && onClose()}>
      <div className="bill-modal view-wide">

        {/* HEADER */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h6>Bill Details — IPD {b?.ipd_id}</h6>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* SUMMARY GRID */}
      <div className="bill-summary-grid">
  <div className="summary-item">
    <span className="summary-label">Gross Amount</span>
    <span className="summary-value">{fmt(b?.gross_amount)}</span>
  </div>

  <div className="summary-item">
  <span className="summary-label">Discount</span>
  <span className="summary-value">
    {Number(b?.discount_percent || 0).toFixed(2)}%
    {" "}
    ({fmt(b?.discount_amount)})
  </span>
</div>

  <div className="summary-item">
    <span className="summary-label">Taxable Amount</span>
    <span className="summary-value">
      {fmt(b?.taxable_amount)}
    </span>
  </div>

  <div className="summary-item">
    <span className="summary-label">GST</span>
    <span className="summary-value">
      {b?.gst_percentage}% ({fmt(b?.gst_amount)})
    </span>
  </div>

  <div className="summary-item">
    <span className="summary-label">Grand Total</span>
    <span
      className="summary-value"
      style={{
        color: "#2563eb",
        fontWeight: 700,
      }}
    >
      {fmt(b?.grand_total)}
    </span>
  </div>

  <div className="summary-item">
    <span className="summary-label">Paid Amount</span>
    <span
      className="summary-value"
      style={{ color: "var(--success)" }}
    >
      {fmt(b?.paid_amount)}
    </span>
  </div>

  <div className="summary-item">
    <span className="summary-label">Balance Due</span>
    <span
      className="summary-value"
      style={{ color: "var(--danger)" }}
    >
      {fmt(b?.balance_amount)}
    </span>
  </div>
</div>

        {/* CHARGE SECTIONS */}
        <div className="view-charges-area">
          {chargeGroups.map(({ key, label, amountKey }) => {
            const rows  = charges?.[key] || [];
            const total = rows.reduce((s, r) => s + Number(r[amountKey] || 0), 0);

            return (
              <div key={key} className="charge-section">
                <div className="charge-section-header">
                  <h4 className="charge-section-title">{label}</h4>
                  {total > 0 && (
                    <span className="charge-section-total">{fmt(total)}</span>
                  )}
                </div>
                <div className="charge-table-wrap">
                  {rows.length === 0 ? (
                    <p className="charge-empty">No charges recorded.</p>
                  ) : (
                    <table className="charge-table">
                      <thead>
                        <tr>
                          {Object.keys(rows[0])
                            .filter((k) => !["id","ipd_id","admin_id","created_at","updated_at"].includes(k))
                            .map((k) => (
                              <th key={k}>{k.replaceAll("_", " ")}</th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i}>
                            {Object.entries(row)
                              .filter(([k]) => !["id","ipd_id","admin_id","created_at","updated_at"].includes(k))
                              .map(([k, v]) => (
                                <td key={k} className={k === amountKey ? "amount-cell" : ""}>
                                  {k === amountKey ? fmt(v) : String(v ?? "—")}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-buttons">
          <button className="cancel-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EDIT DISCOUNT MODAL
───────────────────────────────────────────── */
export function EditBillModal({ bill, onClose, onSaved }) {
  const [discount, setDiscount] = useState(
  bill?.discount_percent || 0
);
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      await axios.put(
        `${API}/update/discount/${bill.ipd_id}`,
        { discount },
        { withCredentials: true }
      );
      alert("Discount updated successfully");
      onSaved();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bill-modal-overlay" onClick={(e) => e.target.classList.contains("bill-modal-overlay") && onClose()}>
      <div className="bill-modal">

        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <h3>Edit Bill Discount</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* read-only info strip */}
          <div className="edit-bill-info-strip">
            <div className="ebi-field">
              <span className="ebi-label">IPD ID</span>
              <span className="ebi-value mono">{bill.ipd_id}</span>
            </div>
            <div className="ebi-field">
              <span className="ebi-label">Total Amount</span>
              <span className="ebi-value">{fmt(bill.total_amount)}</span>
            </div>
            <div className="ebi-field">
  <span className="ebi-label">Current Discount</span>
  <span className="ebi-value">
    {Number(bill.discount_percent || 0).toFixed(2)}%
    {" "}
    ({fmt(bill.discount_amount)})
  </span>
</div>
          </div>

          <div className="modal-group" style={{ marginTop: 16 }}>
           <label>New Discount (%)</label>
            <div className="amount-input-wrap">
              <span className="amount-prefix">₹</span>
              <input
                type="number"
                className="amount-input"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={save} disabled={saving}>
            {saving ? (
              <><span className="btn-spin" /> Saving…</>
            ) : "Save Discount"}
          </button>
        </div>
      </div>
    </div>
  );
}