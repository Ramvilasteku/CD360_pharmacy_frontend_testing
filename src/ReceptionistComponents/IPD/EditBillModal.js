// EditBillModal.jsx
// ─────────────────────────────────────────────────────────────
// Full-featured standalone modal for editing an existing IPD
// bill — charge sections now use the same lazy-loaded
// components as IpdDetailModal (IpdBedChargesSection, etc.)
// with Add button retained.
//
// Lazy-loaded by IpdBills.jsx via:
//   const EditBillModal = lazy(() =>
//     import("./EditBillModal").then(m => ({ default: m.EditBillModal }))
//   );
//
// Props:
//   bill     — bill_summary object  { id, ipd_id, discount, total_amount, ... }
//   onClose  — () => void
//   onSaved  — () => void  (triggers parent list refresh)
// ─────────────────────────────────────────────────────────────

import React, {
  useEffect,
  useState,
  useCallback,
  lazy,
  Suspense,
} from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001/api";
const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

// ─────────────────────────────────────────────────────────────
// LAZY-LOADED SECTION COMPONENTS  (same as IpdDetailModal)
// ─────────────────────────────────────────────────────────────

const IpdBedChargesSection     = lazy(() => import("./Ipdadmissonview/IpdBedChargesSection"));
const IpdBedAllocationSection  = lazy(() => import("./Ipdadmissonview/IpdBedAllocationSection"));
const IpdDoctorVisitsSection   = lazy(() => import("./Ipdadmissonview/IpdDoctorVisitsSection"));
const IpdLabTestsSection       = lazy(() => import("./Ipdadmissonview/IpdLabTestsSection"));
const IpdProceduresSection     = lazy(() => import("./Ipdadmissonview/IpdProceduresSection"));
const IpdNursingChargesSection = lazy(() => import("./Ipdadmissonview/IpdNursingChargesSection"));
const IpdMiscChargesSection    = lazy(() => import("./Ipdadmissonview/IpdMiscChargesSection"));
const IpdPharmacySection       = lazy(() => import("./Ipdadmissonview/IpdPharmacySection.jsx"));

// ─────────────────────────────────────────────────────────────
// SECTION SKELETON  (same pattern as IpdDetailModal)
// ─────────────────────────────────────────────────────────────

function SectionSkeleton() {
  return (
    <div className="idm-section-skeleton">
      <div className="idm-section-title shimmer" />
      <div className="idm-section-table">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="idm-table-row shimmer" />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EDIT BILL MODAL  (main export)
───────────────────────────────────────────── */
export function EditBillModal({ bill, onClose, onSaved }) {

  const [billData,   setBillData]   = useState(bill);
  const [discount, setDiscount] = useState(
    bill?.discount_percent ?? 0
  );
  const [gstPercentage, setGstPercentage] = useState("");
  const [savingDisc, setSavingDisc] = useState(false);
  const [savingGst, setSavingGst] = useState(false);

  const ipdId = billData?.ipd_id;
  const hdr   = { withCredentials: true };

  // Keep local state in sync if parent passes a new bill prop
   useEffect(() => {

  if (bill) {

    setBillData(bill);

    setDiscount(
      bill.discount_percent ?? 0
    );

    setGstPercentage(
      bill.gst_percentage ?? 18
    );

  }

}, [bill]);


    


  // ── save discount ──────────────────────────────────────────
 const handleSaveDiscount = useCallback(async () => {

 try {

   const discountValue = Number(discount);

   setSavingDisc(true);


   await axios.put(
     `${API}/update/discount/${ipdId}`,
     {
       discount: discountValue
     },
     {
       withCredentials:true
     }
   );


  setBillData(prev=>({
 ...prev,
 gst_percentage:Number(gstPercentage)
}));


   await onSaved();

   alert("Discount updated successfully");


 } catch(err){

   alert(
    err.response?.data?.message ||
    "Failed"
   );

 } finally {

   setSavingDisc(false);

 }

},[
 ipdId,
 discount,
 onSaved
]);



  const fetchGst = useCallback(async () => {
  try {
    const res = await axios.get(
      `${API}/get/gst/${ipdId}`,
      { withCredentials: true }
    );

    setGstPercentage(
      res.data.gst_percentage ?? 0
    );
  } catch (err) {
    console.error("GST Fetch Error:", err);
  }
}, [ipdId]);

useEffect(() => {
  if (ipdId) {
    fetchGst();
  }
}, [ipdId, fetchGst]);

  const handleSaveGst = useCallback(async () => {
    try {
      const gstValue = Number(gstPercentage);

      if (isNaN(gstValue) || gstValue < 0 || gstValue > 100) {
        alert("GST percentage must be between 0 and 100");
        return;
      }

      setSavingGst(true);

      await axios.put(
        `${API}/update/gst/${ipdId}`,
        {
          gst_percentage: gstValue,
        },
        {
          withCredentials: true,
        }
      );

      const res = await axios.get(`${API}/getall/bills`, {
        params: { bill_id: bill.id },
        withCredentials: true,
      });

      setBillData(res.data.data?.[0]?.bill_summary || billData);

      await onSaved();

      await fetchGst();

      alert("GST updated successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update GST");
    } finally {
      setSavingGst(false);
    }
  }, [ipdId, gstPercentage, bill?.id, billData, onSaved]);

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="bill-modal-overlay">
      <div className="bill-modal generate-wide">

        {/* ── HEADER ── */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <h3>  {ipdId}  -  Bills Id - {billData?.id ?? "—"}  </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── LAYOUT ── */}
        <div className="generate-modal-layout">

          {/* TOP FORM STRIP — read-only info + editable discount */}
        <div className="generate-form-strip">

  {/* <div className="modal-group" style={{ maxWidth: 130 }}>
    <label>Bill ID</label>
    <input type="text" value={billData?.id ?? "—"} disabled />
  </div> */}

 

 <div className="modal-group total-amount">
  <label>Total Amount</label>
  <input type="text" value={fmt(billData?.grand_total)} disabled />
</div>

<div className="modal-group paid-amount">
  <label>Paid Amount</label>
  <input type="text" value={fmt(billData?.paid_amount)} disabled />
</div>

<div className="modal-group discount-field">
  <label>Discount (%)</label>
  <input
    type="number"
    min="0"
    max="100"
    value={discount}
    onChange={(e) => setDiscount(e.target.value)}
  />
</div>
 <button
    className="save-btn"
    onClick={handleSaveDiscount}
    disabled={savingDisc}
  >
    {savingDisc ? "Saving..." : "Save Discount"}
  </button>
<div className="modal-group gst-field">
  <label>GST (%)</label>
  <input
    type="number"
    min="0"
    max="100"
    step="0.01"
    value={gstPercentage}
    onChange={(e) => setGstPercentage(e.target.value)}
  />
</div>

 

  
  <button
    className="save-btn"
    onClick={handleSaveGst}
    disabled={savingGst}
  >
    {savingGst ? "Saving..." : "Save GST"}
  </button>

  <button
    className="cancel-btn"
    onClick={onClose}
  >
    Close
  </button>

</div>


          
          



          {/* ── CHARGE SECTIONS ── */}
          {/* Each section component matches IpdDetailModal layout exactly,
              with showActions / Add button support passed via prop */}
          <div className="generate-charges-area">

            <Suspense fallback={<SectionSkeleton />}>
              <IpdBedChargesSection     ipdId={ipdId} showActions />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdBedAllocationSection  ipdId={ipdId} showActions />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdPharmacySection       ipdId={ipdId} showActions />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdLabTestsSection       ipdId={ipdId} showActions />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdDoctorVisitsSection   ipdId={ipdId} showActions />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdProceduresSection     ipdId={ipdId} showActions />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdNursingChargesSection ipdId={ipdId} showActions />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdMiscChargesSection    ipdId={ipdId} showActions />
            </Suspense>

          </div>

        </div>
      </div>
    </div>
  );
}