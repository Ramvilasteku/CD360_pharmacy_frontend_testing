// File: PaymentUpdateModal.jsx

import React, { useState } from "react";

const PaymentUpdateModal = ({
  payment,
  onClose,
  onSubmit,
  updating,
}) => {
  const [formData, setFormData] = useState({
   amount:
  payment.payment_method === "insurance"
    ? payment.claim_amount
    : payment.amount,
    notes:          payment.notes          || "",
    payment_method: payment.payment_method || "cash",
    policy_company: payment.policy_company || "",
    policy_number:  payment.policy_number  || "",
    claim_amount:   payment.claim_amount   || 0,
  });
   const [taxRate, setTaxRate] = useState(0);
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitHandler = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target.classList.contains("modal-overlay") && onClose()}>
      <div className="modal-box">

        {/* HEADER */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-wrap">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div>
              <h3>Update Payment</h3>
              <p className="modal-sub">Receipt: {payment.receipt_number}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* PATIENT INFO STRIP */}
        <div className="patient-strip">
          <div className="ps-field">
            <span className="ps-label">Patient</span>
            <span className="ps-value">{payment.patient_name}</span>
          </div>
          <div className="ps-field">
            <span className="ps-label">IPD ID</span>
            <span className="ps-tag">{payment.ipd_id}</span>
          </div>
          <div className="ps-field">
            <span className="ps-label">Balance</span>
            <span className="ps-balance">₹ {Number(payment.running_balance).toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* FORM */}
       {/* FORM */}
<div className="modal-scroll">
  <form onSubmit={submitHandler}>

    <div className="form-section-label">Edit Payment</div>

    {/* Payment Method — always first */}
    <div className="form-group">
      <label>Payment Method</label>
      <select name="payment_method" value={formData.payment_method} onChange={handleChange}>
        <option value="cash">Cash</option>
        <option value="upi">UPI</option>
        <option value="card">Card</option>
        <option value="insurance">Insurance</option>
        <option value="creditcard">Credit Card</option>
        <option value="debitcard">Debit Card</option>
      </select>
    </div>

    {/* Amount — hidden when insurance */}
    {formData.payment_method !== "insurance" && (
      <div className="form-group">
        <label>Amount (₹) <span className="required">*</span></label>
        <div className="amount-input-wrap">
          <span className="amount-prefix">₹</span>
          <input
            type="number"
            name="amount"
            className="amount-input"
            value={formData.amount}
            onChange={handleChange}
            required
          />
        </div>
      </div>
    )}

    {/* Tax Rate */}
    {/* <div className="form-group">
      <label>Tax Rate (%)</label>
      <div className="amount-input-wrap">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={taxRate}
          style={{ paddingRight: "32px" }}
          onChange={(e) => setTaxRate(e.target.value)}
        />
        <span style={{
          position: "absolute", right: "12px", top: "50%",
          transform: "translateY(-50%)", color: "var(--text-muted)",
          fontWeight: 600, fontSize: "0.875rem"
        }}>%</span>
      </div>
      {Number(taxRate) > 0 && (
        <small style={{ display:"block", marginTop:"5px", fontSize:"0.75rem", color:"var(--brand)" }}>
          Tax: ₹ {(
            (Number(formData.payment_method === "insurance"
              ? formData.claim_amount
              : formData.amount) * Number(taxRate)) / 100
          ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </small>
      )}
    </div> */}

    {/* Insurance block */}
    {formData.payment_method === "insurance" && (
      <div className="insurance-block">
        <div className="insurance-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Insurance Details
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Policy Company</label>
            <input type="text" name="policy_company" value={formData.policy_company} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Policy Number</label>
            <input type="text" name="policy_number" value={formData.policy_number} onChange={handleChange} />
          </div>
        </div>
        <div className="form-group">
          <label>Claim Amount (₹)</label>
          <div className="amount-input-wrap">
            <span className="amount-prefix">₹</span>
            <input type="number" name="claim_amount" className="amount-input" value={formData.claim_amount} onChange={handleChange} />
          </div>
        </div>
      </div>
    )}

    <div className="form-group">
      <label>Notes</label>
      <textarea rows="3" name="notes" placeholder="Any remarks about this payment…" value={formData.notes} onChange={handleChange} />
    </div>

    <div className="modal-footer">
      <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
      <button type="submit" className="submit-btn" disabled={updating}>
        {updating ? (
          <><span className="btn-spinner"/> Updating…</>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Update Payment
          </>
        )}
      </button>
    </div>

  </form>
</div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --brand:       rgb(36, 122, 135);
          --brand-dark:  rgb(27, 96, 107);
          --brand-light: rgba(36, 122, 135, 0.10);
          --brand-mid:   rgba(36, 122, 135, 0.18);
          --pending:     #dc2626;
          --pending-bg:  #fee2e2;
          --border:      #e2e8f0;
          --bg:          #f0f4f8;
          --surface:     #ffffff;
          --text-primary:#0f172a;
          --text-muted:  #64748b;
          --radius-sm:   8px;
          --radius:      12px;
          --radius-lg:   16px;
          --radius-xl:   20px;
          --font:        'Plus Jakarta Sans', sans-serif;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: flex-end;
          z-index: 9999;
          padding: 0;
        }

        @media (min-width: 600px) {
          .modal-overlay { align-items: center; padding: 20px; }
        }

        .modal-box {
          width: 100%;
          max-width: 500px;
          background: var(--surface);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          font-family: var(--font);
          animation: slideUp 0.22s ease;
          overflow: hidden;
        }

        @media (min-width: 600px) {
          .modal-box {
            border-radius: var(--radius-xl);
            animation: fadeScale 0.22s ease;
          }
        }

        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        @keyframes fadeScale {
          from { transform: scale(0.97); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .modal-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .modal-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: var(--brand);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .modal-header h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .modal-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 1px;
          font-family: monospace;
        }

        .modal-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--text-muted);
          transition: background 0.15s, color 0.15s;
        }

        .modal-close:hover { background: #fef2f2; color: var(--pending); border-color: #fca5a5; }

        /* PATIENT STRIP */
        .patient-strip {
          display: flex;
          gap: 0;
          background: var(--brand-light);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .ps-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 16px;
          border-right: 1px solid var(--brand-mid);
        }

        .ps-field:last-child { border-right: none; }

        .ps-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--brand-dark);
        }

        .ps-value {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ps-tag {
          display: inline-block;
          background: var(--brand);
          color: #fff;
          padding: 2px 8px;
          border-radius: 5px;
          font-size: 0.72rem;
          font-weight: 600;
          font-family: monospace;
          margin-top: 1px;
        }

        .ps-balance {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--pending);
        }

        /* FORM */
        .modal-scroll {
          overflow-y: auto;
          padding: 20px;
          flex: 1;
        }

        .form-section-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--brand);
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 1.5px solid var(--brand-light);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-group {
          margin-bottom: 14px;
        }

        .form-group label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .required { color: var(--pending); margin-left: 2px; }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          font-family: var(--font);
          font-size: 0.875rem;
          color: var(--text-primary);
          background: #fff;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(36,122,135,0.10);
        }

        .amount-input-wrap {
          position: relative;
        }

        .amount-prefix {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-weight: 600;
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .amount-input { padding-left: 28px !important; }

        .insurance-block {
          background: var(--brand-light);
          border: 1.5px dashed var(--brand-mid);
          border-radius: var(--radius);
          padding: 14px;
          margin-bottom: 14px;
        }

        .insurance-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--brand-dark);
          margin-bottom: 12px;
        }

        /* FOOTER */
        .modal-footer {
          display: flex;
          gap: 10px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
          margin-top: 8px;
        }

        .cancel-btn {
          flex: 1;
          padding: 11px;
          background: transparent;
          color: var(--text-muted);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          font-family: var(--font);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }

        .cancel-btn:hover { background: var(--bg); }

        .submit-btn {
          flex: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 11px;
          background: var(--brand);
          color: #fff;
          border: none;
          border-radius: var(--radius);
          font-family: var(--font);
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s, transform 0.12s;
        }

        .submit-btn:hover  { background: var(--brand-dark); transform: translateY(-1px); }
        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .btn-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .form-row    { grid-template-columns: 1fr; }
          .patient-strip { flex-direction: column; }
          .ps-field { border-right: none; border-bottom: 1px solid var(--brand-mid); }
          .ps-field:last-child { border-bottom: none; }
        }
      `}</style>
    </div>
  );
};

export default PaymentUpdateModal;