// File: PaymentsManagement.jsx

import React, { useEffect, useState, lazy, Suspense, useMemo } from "react";
import axios from "axios";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import Skeleton from "@mui/material/Skeleton";

const PaymentModal = lazy(() => import("./PaymentUpdateModal"));

const API_BASE = process.env.REACT_APP_API_URL;

const PaymentsSkeleton = () => {
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>Receipt #</th>
            <th>Patient</th>
            <th>IPD ID</th>
            <th>Amount Paid</th>
            <th>Method</th>
            <th>Status</th>
            <th>Balance</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {[...Array(6)].map((_, index) => (
            <tr key={index}>
              <td><Skeleton variant="text" width={100} /></td>
              <td><Skeleton variant="text" width={140} /></td>
              <td><Skeleton variant="rounded" width={80} height={24} /></td>
              <td><Skeleton variant="text" width={90} /></td>
              <td><Skeleton variant="rounded" width={70} height={24} /></td>
              <td><Skeleton variant="rounded" width={70} height={24} /></td>
              <td><Skeleton variant="text" width={90} /></td>
              <td><Skeleton variant="text" width={100} /></td>
              <td>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Skeleton variant="circular" width={34} height={34} />
                  <Skeleton variant="circular" width={34} height={34} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PaymentsManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [search, setSearch] = useState("");
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [taxRate, setTaxRate] = useState("");
  const [receiptTaxRates, setReceiptTaxRates] = useState({});

  const [createForm, setCreateForm] = useState({
    ipd_id: "",
    bill_id: "",
    total_bill_amount: "",
    amount: "",
    payment_method: "cash",
    payment_type: "partial",
    transaction_id: "",
    notes: "",
    policy_company: "",
    policy_number: "",
    claim_amount: "",
  });
  const [fetchingBill, setFetchingBill] = useState(false);
  const [billInfo, setBillInfo] = useState(null);
  
  useEffect(() => {
  if (createForm.ipd_id.trim()) {
    const timer = setTimeout(() => {
      fetchBillDetails(createForm.ipd_id);
    }, 500);

    return () => clearTimeout(timer);
  }
  }, [createForm.ipd_id]);

  /* =========================================================
      FETCH PAYMENTS
  ========================================================= */
  const fetchBillDetails = async (ipdId) => {
    try {
      if (!ipdId) return;
      setFetchingBill(true);
      const res = await axios.get(`${API_BASE}/get/ipd-bill/${ipdId}`, {
        withCredentials: true,
      });
      const bill = res.data.data;
      setBillInfo(bill);
      setCreateForm((prev) => ({
        ...prev,
        ipd_id: bill.ipd_id,
        bill_id: bill.bill_id,
        total_bill_amount: bill.grand_total,
        amount: bill.balance_amount,
      }));
    } catch (err) {
      console.error(err);
      setBillInfo(null);
      setCreateForm((prev) => ({
        ...prev,
        bill_id: "",
        total_bill_amount: "",
        amount: "",
      }));
      alert(err?.response?.data?.message || "Bill not found");
    } finally {
      setFetchingBill(false);
    }
  };

const handleCreatePayment = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post(`${API_BASE}/post/payments`, createForm, {
      withCredentials: true,
    });

    // ← your POST API returns payment_id directly, not res.data.data.id
    const newPaymentId = res.data.payment_id;
    if (newPaymentId) {
      setReceiptTaxRates(prev => ({ ...prev, [newPaymentId]: Number(taxRate) || 0 }));
    }

    alert("Payment created successfully");
    setOpenCreateModal(false);
    setCreateForm({
      ipd_id: "",
      bill_id: "",
      total_bill_amount: "",
      amount: "",
      payment_method: "cash",
      payment_type: "partial",
      transaction_id: "",
      notes: "",
      policy_company: "",
      policy_number: "",
      claim_amount: "",
    });
    setTaxRate("");
    fetchPayments();
  } catch (err) {
    console.error(err);
    alert(err?.response?.data?.message || "Failed to create payment");
  }
};

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/getall/payments`, {
        withCredentials: true,
      });
      setPayments(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  /* =========================================================
      FILTER PAYMENTS
  ========================================================= */
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      const text = search.toLowerCase();
      return (
        item.patient_name?.toLowerCase().includes(text) ||
        item.ipd_id?.toLowerCase().includes(text) ||
        item.receipt_number?.toLowerCase().includes(text) ||
        item.payment_method?.toLowerCase().includes(text)
      );
    });
  }, [payments, search]);

  /* =========================================================
      UPDATE PAYMENT
  ========================================================= */
  const handleUpdate = async (updatedData) => {
    try {
      setUpdating(true);
      await axios.put(
        `${API_BASE}/update/payments/${selectedPayment.id}`,
        updatedData,
        { withCredentials: true }
      );
      alert("Payment updated successfully");
      setSelectedPayment(null);
      fetchPayments();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to update payment");
    } finally {
      setUpdating(false);
    }
  };

  /* =========================================================
      STATUS BADGE
  ========================================================= */
  const getStatusClass = (status) => {
    switch (status) {
      case "paid":
        return "status paid";
      case "partial":
        return "status partial";
      default:
        return "status pending";
    }
  };

  /* =========================================================
      LOADER
  ========================================================= */
  if (loading) {
  return (
    <div className="payments-page">
      <div className="page-header">
        <Skeleton variant="rounded" width={250} height={50} />
        <Skeleton variant="rounded" width={180} height={40} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {[...Array(4)].map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={90}
          />
        ))}
      </div>

      <PaymentsSkeleton />
    </div>
  );
}

  return (
    <div className="payments-page">

      {/* ── PAGE HEADER ── */}
      <div className="page-header">
        <div className="page-title-block">
          <div className="page-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title">IPD Payments</h1>
            <p className="page-subtitle">Manage inpatient billing &amp; receipts</p>
          </div>
        </div>

        <div className="top-actions">
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search patient, receipt, IPD…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-box"
            />
          </div>

          <button className="create-btn" onClick={() => setOpenCreateModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Payment
          </button>
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div className="stats-strip">
        <div className="stat-card">
          <span className="stat-label">Total Records</span>
          <span className="stat-value">{payments.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Paid</span>
          <span className="stat-value stat-paid">{payments.filter(p => p.bill_status === "paid").length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Partial</span>
          <span className="stat-value stat-partial">{payments.filter(p => p.bill_status === "partial").length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value stat-pending">{payments.filter(p => !["paid","partial"].includes(p.bill_status)).length}</span>
        </div>
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Patient</th>
              <th>IPD ID</th>
              <th>Amount Paid</th>
              <th>Method</th>
              <th>Bill Status</th>
              <th>Balance</th>
              <th>Date</th>
              <th>Action</th>
             
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map((item) => (
                <tr key={item.id}>
                  <td className="receipt-cell">{item.receipt_number}</td>
                  <td className="patient-cell">
                    <div className="avatar-name">
                      {/* <div className="avatar">{item.patient_name?.[0]?.toUpperCase() || "?"}</div> */}
                      <span>{item.patient_name}</span>
                    </div>
                  </td>
                  <td><span className="ipd-tag">{item.ipd_id}</span></td>
                 <td className="amount-cell">
                    ₹{" "}
                    {Number(
                      item.payment_method === "insurance"
                        ? item.claim_amount
                        : item.amount
                    ).toLocaleString("en-IN")}
                  </td>
                  <td><span className="method-badge">{item.payment_method}</span></td>
                  <td><span className={getStatusClass(item.bill_status)}>{item.bill_status}</span></td>
                 <td
                  className={
                    Number(item.running_balance) < 0
                      ? "balance-cell excess-balance"
                      : "balance-cell"
                  }
                >
                  ₹ {Math.abs(Number(item.running_balance)).toLocaleString("en-IN")}
                </td>
                    <td className="date-cell">{new Date(item.payment_date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</td>
                 <td className="action-buttons">
  {/* Edit */}
  {/* <button
    className="update-btn action-icon-btn"
    onClick={() => setSelectedPayment(item)}
    title="Edit Payment"
  >
    <EditIcon fontSize="small" />
  </button> */}

  {/* Download Receipt */}
  <a
    href={`${API_BASE}/get/bill/payment-receipt/${item.id}?tax_rate=${receiptTaxRates[item.id] || 0}`}
    target="_blank"
    rel="noreferrer"
    className="receipt-btn action-icon-btn"
    title="Download Receipt"
  >
    <DownloadIcon fontSize="small" />
  </a>
</td>

                 
                </tr>
              ))
            ) : (
              <tr>
                <td
  colSpan="9"
  style={{
    height: "200px",
    textAlign: "center",
    verticalAlign: "middle",
  }}
>
  <div style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "8px"
  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <p>No payments found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── MOBILE CARDS ── */}
      <div className="mobile-cards">
        {filteredPayments.length > 0 ? (
          filteredPayments.map((item) => (
            <div className="payment-card" key={item.id}>
              <div className="card-header">
                <div className="card-avatar-name">
                  <div className="avatar">{item.patient_name?.[0]?.toUpperCase() || "?"}</div>
                  <div>
                    <h3>{item.patient_name}</h3>
                    <span className="ipd-tag">{item.ipd_id}</span>
                  </div>
                </div>
                <span className={getStatusClass(item.bill_status)}>{item.bill_status}</span>
              </div>

              <div className="card-divider"/>

              <div className="card-grid">
                <div className="card-field">
                  <span className="field-label">Receipt</span>
                  <span className="field-value">{item.receipt_number}</span>
                </div>
                <div className="card-field">
                  <span className="field-label">Method</span>
                  <span className="method-badge">{item.payment_method}</span>
                </div>
                <div className="card-field">
                  <span className="field-label">Amount Paid</span>
                  <span className="field-value amount-val">
                    ₹{" "}
                    {Number(
                      item.payment_method === "insurance"
                        ? item.claim_amount
                        : item.amount
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="card-field">
                  <span className="field-label">Balance</span>
                  <span className="field-value balance-val">₹ {Number(item.balance_amount).toLocaleString("en-IN")}</span>
                </div>
                <div className="card-field">
                  <span className="field-label">Date</span>
                  <span className="field-value">{new Date(item.payment_date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</span>
                </div>
              </div>

              <button className="update-btn mobile-update-btn" onClick={() => setSelectedPayment(item)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Update Payment
              </button>

               <a
              href={`${API_BASE}/get/bill/payment-receipt/${item.id}?tax_rate=${receiptTaxRates[item.id] || 0}`}
                target="_blank"           
                rel="noreferrer"
                className="receipt-btn mobile-update-btn"
                style={{marginTop:"8px", textDecoration:"none", display:"flex",
                        alignItems:"center", justifyContent:"center", gap:"6px"}}
              >
                Download Receipt
              </a>
            </div>
          ))
        ) : (
          <div className="no-data-card">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>No payments found</p>
          </div>
        )}
      </div>

      {/* ── CREATE PAYMENT MODAL ── */}
      {openCreateModal && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains("modal-overlay") && setOpenCreateModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-icon-wrap">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <h3>Create IPD Payment</h3>
              </div>
              <button className="modal-close" onClick={() => setOpenCreateModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="modal-scroll">
              <form onSubmit={handleCreatePayment}>

                <div className="form-section-label">Patient &amp; Bill Info</div>

                <div className="form-row">
                  <div className="form-group">
                    <label>IPD ID <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IPD-2024-001"
                      value={createForm.ipd_id}
                      onChange={(e) => setCreateForm({ ...createForm, ipd_id: e.target.value })}
                     
                    />
                    {fetchingBill && <small className="hint-info">Fetching bill details…</small>}
                  </div>

                  <div className="form-group">
                    <label>Bill ID</label>
                    <input type="number" value={createForm.bill_id} readOnly className="readonly-field" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Bill Amount</label>
                    <input type="number" value={createForm.total_bill_amount} readOnly className="readonly-field" />
                  </div>

                  <div className="form-group">
                    <label>Pending Balance</label>
                    <input type="number" value={billInfo?.balance_amount || ""} readOnly className="readonly-field balance-field" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Bill Status</label>
                  <input type="text" value={billInfo?.bill_status || ""} readOnly className="readonly-field" />
                </div>

                <div className="form-section-label" style={{marginTop:"20px"}}>Payment Details</div>
                 
                   <div className="form-row">
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      value={createForm.payment_method}
                      onChange={(e) => setCreateForm({ ...createForm, payment_method: e.target.value })}
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="insurance">Insurance</option>
                      <option value="creditcard">Credit Card</option>
                      <option value="debitcard">Debit Card</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Type</label>
                    <select
                      value={createForm.payment_type}
                      onChange={(e) => setCreateForm({ ...createForm, payment_type: e.target.value })}
                    >
                      <option value="advance">Advance</option>
                      <option value="partial">Partial</option>
                      <option value="final">Final</option>
                      <option value="refund">Refund</option>
                    </select>
                  </div>

                  {/* <div className="form-group">
  <label>Tax Rate (%)</label>
  <div className="amount-input-wrap">
    <input
      type="number"
      min="0"
      max="100"
      step="0.01"
      placeholder="0"
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
    <small className="hint-info">
      Tax: ₹ {(
        (Number(createForm.payment_method === "insurance"
          ? createForm.claim_amount
          : createForm.amount) * Number(taxRate)) / 100
      ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
    </small>
  )}
                  </div> */}
                </div>


               {createForm.payment_method !== "insurance" && (
                <div className="form-group">
                  <label>
                    Payment Made (₹) <span className="required">*</span>
                  </label>

                  <div className="amount-input-wrap">
                    <span className="amount-prefix">₹</span>

                    <input
                      type="text"
                      required
                      value={createForm.amount}
                      className="amount-input"
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setCreateForm({
                          ...createForm,
                          amount: value,
                        });
                      }}
                    />
                  </div>
                </div>
                )}

              

                {createForm.payment_method === "insurance" && (
                  <div className="insurance-block">
                    <div className="insurance-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      Insurance Details
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Policy Company</label>
                        <input type="text" value={createForm.policy_company} onChange={(e) => setCreateForm({ ...createForm, policy_company: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Policy Number</label>
                        <input type="text" value={createForm.policy_number} onChange={(e) => setCreateForm({ ...createForm, policy_number: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Claim Amount (₹)</label>
                      <div className="amount-input-wrap">
                        <span className="amount-prefix">₹</span>
                        <input type="number" value={createForm.claim_amount} className="amount-input" onChange={(e) => setCreateForm({ ...createForm, claim_amount: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Transaction ID</label>
                  <input type="text" placeholder="UTR / Ref number (optional)" value={createForm.transaction_id} onChange={(e) => setCreateForm({ ...createForm, transaction_id: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea rows="3" placeholder="Any additional remarks…" value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} />
                </div>

                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setOpenCreateModal(false)}>Cancel</button>
                  <button type="submit" className="submit-btn">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Create Payment
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── LAZY-LOADED UPDATE MODAL ── */}
      {selectedPayment && (
        <Suspense fallback={
          <div className="loader-wrapper">
            <div className="loader-ring"><div/><div/><div/><div/></div>
          </div>
        }>
          <PaymentModal
            payment={selectedPayment}
            onClose={() => setSelectedPayment(null)}
            onSubmit={handleUpdate}
            updating={updating}
          />
        </Suspense>
      )}

      {/* ── STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --brand:       rgb(36, 122, 135);
          --brand-dark:  rgb(27, 96, 107);
          --brand-light: rgba(36, 122, 135, 0.10);
          --brand-mid:   rgba(36, 122, 135, 0.18);
          --paid:        #16a34a;
          --paid-bg:     #dcfce7;
          --paid-text:   #14532d;
          --partial:     #d97706;
          --partial-bg:  #fef3c7;
          --partial-text:#78350f;
          --pending:     #dc2626;
          --pending-bg:  #fee2e2;
          --pending-text:#7f1d1d;
          --surface:     #ffffff;
          --bg:          #f0f4f8;
          --border:      #e2e8f0;
          --text-primary:#0f172a;
          --text-muted:  #64748b;
          --text-subtle: #94a3b8;
          --radius-sm:   8px;
          --radius:      12px;
          --radius-lg:   16px;
          --radius-xl:   20px;
          --shadow-sm:   0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --shadow:      0 4px 16px rgba(0,0,0,0.08);
          --shadow-lg:   0 12px 40px rgba(0,0,0,0.12);
          --font:        'Plus Jakarta Sans', sans-serif;
        }

        .payments-page {
          font-family: var(--font);
          background: var(--bg);
          min-height: 100vh;
          padding: 24px 20px 40px;
          color: var(--text-primary);
        }

        /* ── PAGE HEADER ── */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .page-title-block {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .excess-balance {
          color: #2563eb !important;
          font-weight: 700 !important;
        }
          
        .page-icon {
          width: 46px;
          height: 46px;
          border-radius: var(--radius);
          background: var(--brand);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .page-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .top-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 220px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-subtle);
          pointer-events: none;
        }

        .search-box {
          width: 100%;
          padding: 10px 14px 10px 38px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          font-family: var(--font);
          font-size: 0.875rem;
          color: var(--text-primary);
          background: var(--surface);
          outline: none;
          transition: border-color 0.18s;
        }

        .search-box:focus { border-color: var(--brand); }

        .create-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 20px;
          background: var(--brand);
          color: #fff;
          border: none;
          border-radius: var(--radius);
          font-family: var(--font);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.18s, transform 0.12s;
        }

        .create-btn:hover { background: var(--brand-dark); transform: translateY(-1px); }
        .create-btn:active { transform: translateY(0); }

        /* ── STATS STRIP ── */
        .stats-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: var(--surface);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-subtle);
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .stat-paid    { color: var(--paid); }
        .stat-partial { color: var(--partial); }
        .stat-pending { color: var(--pending); }

        /* ── TABLE ── */
        .table-card {
          background: var(--surface);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow);
          border: 1px solid var(--border);
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        thead tr {
          background: linear-gradient(90deg, rgb(20,74,82) 0%, var(--brand) 100%);
        }

        th {
          padding: 14px 16px;
          text-align: left;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.85);
          white-space: nowrap;
        }

        td {
          padding: 13px 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
          vertical-align: middle;
          white-space: nowrap;
        }

        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover { background: #f8fffe; }

        .receipt-cell { font-family: monospace; font-size: 0.8rem; color: var(--text-muted); }
        .amount-cell  { font-weight: 600; }
        .balance-val, .balance-cell { color: var(--pending); font-weight: 600; }
        .amount-val   { color: var(--paid); font-weight: 600; }
        .date-cell    { font-size: 0.82rem; color: var(--text-muted); }

        .avatar-name {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--brand-light);
          color: var(--brand);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.78rem;
          font-weight: 700;
          flex-shrink: 0;
          border: 1.5px solid var(--brand-mid);
        }

        .ipd-tag {
          display: inline-block;
          padding: 3px 9px;
          background: var(--brand-light);
          color: var(--brand-dark);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: monospace;
        }

        .method-badge {
          display: inline-block;
          padding: 4px 10px;
          // background: #eff6ff;
          color: #1d4ed8;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: capitalize;
          letter-spacing: 0.02em;
        }

        .paid    { background: var(--paid-bg);    color: var(--paid-text); }
        .partial { background: var(--partial-bg);  color: var(--partial-text); }
        .pending { background: var(--pending-bg);  color: var(--pending-text); }

        .update-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--brand);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-family: var(--font);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.18s, transform 0.12s;
          white-space: nowrap;
        }

        .update-btn:hover  { background: var(--brand-dark); transform: translateY(-1px); }
        .update-btn:active { transform: translateY(0); }

        /* ── EMPTY STATE ── */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 40px 0;
          color: var(--text-subtle);
          font-size: 0.9rem;
        }

        /* ── MOBILE CARDS ── */
        .mobile-cards { display: none; }

        .payment-card {
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          padding: 16px;
          margin-bottom: 12px;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .card-avatar-name {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-avatar-name h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .card-avatar-name .ipd-tag { margin-top: 3px; }

        .card-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 12px;
        }

        .card-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }

        .card-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .field-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-subtle);
        }

        .field-value {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .mobile-update-btn {
          width: 100%;
          justify-content: center;
          padding: 11px;
          font-size: 0.875rem;
          border-radius: var(--radius);
        }

        .mobile-update-btn {
        width: 100% !important;
        justify-content: center !important;
        padding: 11px !important;
        font-size: 0.875rem;
        border-radius: var(--radius);
        display: flex;
        align-items: center;
      }
      .action-icon-btn {
        width: 34px;
        height: 34px;
        border: none;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
        .no-data-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: var(--surface);
          padding: 40px 20px;
          border-radius: var(--radius-lg);
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        /* ── LOADER ── */
        .loader-wrapper {
          height: 80vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 16px;
          font-family: var(--font);
        }

        .loader-text {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .loader-ring {
          position: relative;
          width: 48px;
          height: 48px;
        }

        .loader-ring div {
          box-sizing: border-box;
          display: block;
          position: absolute;
          width: 48px;
          height: 48px;
          border: 4px solid transparent;
          border-top-color: var(--brand);
          border-radius: 50%;
          animation: spin 0.9s cubic-bezier(0.6,0.2,0.4,0.8) infinite;
        }

        .loader-ring div:nth-child(2) { animation-delay: -0.3s; border-top-color: rgba(36,122,135,0.5); }
        .loader-ring div:nth-child(3) { animation-delay: -0.6s; border-top-color: rgba(36,122,135,0.25); }
        .loader-ring div:nth-child(4) { display:none; }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── MODAL ── */
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
          max-width: 560px;
          background: var(--surface);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.22s ease;
        }

        @media (min-width: 600px) {
          .modal-box {
            border-radius: var(--radius-xl);
            max-height: 90vh;
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
          width: 34px;
          height: 34px;
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
          margin-bottom: 12px;
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

        .readonly-field {
          background: var(--bg) !important;
          color: var(--text-muted) !important;
          cursor: not-allowed;
        }

        .balance-field { color: var(--pending) !important; font-weight: 600 !important; }

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

        .amount-input {
          padding-left: 28px !important;
        }

        .hint-info  { display: block; margin-top: 5px; font-size: 0.75rem; color: var(--brand); }
        .hint-muted { display: block; margin-top: 5px; font-size: 0.75rem; color: var(--text-muted); }

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
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--brand-dark);
          margin-bottom: 12px;
        }

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

        /* ── RESPONSIVE ── */
        @media (max-width: 1100px) {
          .stats-strip { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 992px) {
          .table-card  { display: none; }
          .mobile-cards { display: block; }
        }

        @media (max-width: 640px) {
          .payments-page { padding: 16px 14px 32px; }
          .page-title { font-size: 1.2rem; }
          .page-header { gap: 12px; }
          .stats-strip { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .stat-value { font-size: 1.3rem; }
          .search-wrap { min-width: 100%; order: 1; flex: auto; }
          .create-btn  { order: 2; flex: 1; justify-content: center; }
          .top-actions { width: 100%; }
          .form-row { grid-template-columns: 1fr; }
          .card-grid { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 400px) {
          .stats-strip { grid-template-columns: repeat(2, 1fr); }
          .card-grid   { grid-template-columns: 1fr; }
        }
         .receipt-btn {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 8px 14px;
              background: #f0fdf4;
              color: #16a34a;
              border: 1.5px solid #bbf7d0;
              border-radius: var(--radius-sm);
              font-family: var(--font);
              font-size: 0.8rem;
              font-weight: 600;
              cursor: pointer;
              white-space: nowrap;
              transition: background 0.18s, transform 0.12s;
            }
            .receipt-btn:hover { background: #dcfce7; transform: translateY(-1px); }
            .receipt-btn:active { transform: translateY(0); }
             
             .action-buttons {
              display: flex;
              gap: 8px;
              align-items: center;
            }

            .update-btn,
            .receipt-btn {
              width: 34px;
              height: 34px;
              border: none;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              text-decoration: none;
            }

            .update-btn {
              background: #e3f2fd;
              color: #1976d2;
            }

            .receipt-btn {
              background: #e8f5e9;
              color: #2e7d32;
            }

            .update-btn:hover {
              background: #bbdefb;
            }

            .receipt-btn:hover {
              background: #c8e6c9;
            }

      `}</style>
    </div>
  );
};

export default PaymentsManagement;