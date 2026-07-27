// IpdDetailModal.jsx
// Optimized version with:
// ✅ Skeleton Loader
// ✅ Memoization
// ✅ Lazy section rendering
// ✅ Reduced re-renders
// ✅ Better date formatting performance
// ✅ Callback optimization
// ✅ Scroll performance optimization

import React, {
  useEffect,
  useState,
  memo,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";

import "./IpdDetailModal.css";

// ─────────────────────────────────────────────────────────────
// LAZY LOAD SECTIONS
// Prevents loading all heavy components immediately
// ─────────────────────────────────────────────────────────────

const IpdBedChargesSection = lazy(() =>
  import("./IpdBedChargesSection")
);

const IpdBedAllocationSection = lazy(() =>
  import("./IpdBedAllocationSection")
);

const IpdDoctorVisitsSection = lazy(() =>
  import("./IpdDoctorVisitsSection")
);

const IpdLabTestsSection = lazy(() =>
  import("./IpdLabTestsSection")
);

const IpdProceduresSection = lazy(() =>
  import("./IpdProceduresSection")
);

const IpdNursingChargesSection = lazy(() =>
  import("./IpdNursingChargesSection")
);

const IpdMiscChargesSection = lazy(() =>
  import("./IpdMiscChargesSection")
);

const IpdPharmacySection = lazy(() =>
  import("./IpdPharmacySection.jsx")
);

const IpdBillSection = lazy(() =>
  import("./IpdBillSection.js")
);

const IpdPaymentSection = lazy(() =>
  import("./IpdPaymentSection.js")
);

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

function IpdDetailModal({ admission, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // ───────────────────────────────────────────────────────────
  // MEMOIZED DATE FORMATTER
  // Prevents recreation on every render
  // ───────────────────────────────────────────────────────────

  const formatter = useMemo(() => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // ───────────────────────────────────────────────────────────
  // FETCH DETAIL
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!admission) return;

    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        // If future API call needed:
        // const res = await axios.get(...)

        if (mounted) {
          setDetail(admission);
        }
      } catch (err) {
        console.error("Error loading IPD detail:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [admission]);

  // ───────────────────────────────────────────────────────────
  // PREVENT BODY SCROLL
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ───────────────────────────────────────────────────────────
  // MEMOIZED CLOSE HANDLER
  // ───────────────────────────────────────────────────────────

  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // ───────────────────────────────────────────────────────────
  // MEMOIZED FORMATTED DATES
  // ───────────────────────────────────────────────────────────

  const formattedAdmissionDate = useMemo(() => {
    if (!detail?.admission_date) return "—";

    return formatter.format(new Date(detail.admission_date));
  }, [detail?.admission_date, formatter]);

  const formattedDischargeDate = useMemo(() => {
    if (!detail?.discharge_date) return "—";

    return formatter.format(new Date(detail.discharge_date));
  }, [detail?.discharge_date, formatter]);

  if (!admission) return null;

  return (
    <div className="idm-overlay" onClick={handleOverlayClick}>
      <div className="idm-panel" onClick={stopPropagation}>

        {/* ───────────────── HEADER ───────────────── */}

        <div className="idm-header">
          <div className="idm-header-left">
            <span className="idm-badge">IPD</span>

            <h2 className="idm-title">
              {admission.id}
            </h2>
          </div>

          <button
            className="idm-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* ───────────────── BODY ───────────────── */}

        {loading ? (
          <IpdDetailSkeleton />
        ) : (
          <div className="idm-body">

            {/* ───────────── PATIENT INFO ───────────── */}

            <div className="idm-info-grid">

              <MemoInfoItem
                label="Client ID"
                value={detail?.client_id}
              />

              <MemoInfoItem
                label="Client Name"
                value={detail?.client_name || "—"}
              />

              <MemoInfoItem
                label="Doctor ID"
                value={detail?.doctor_id || "—"}
              />

              <MemoInfoItem
                label="Doctor Name"
                value={detail?.doctor_name || "—"}
              />

              <MemoInfoItem
                label="Bed ID"
                value={detail?.bed_id || "—"}
              />

              <MemoInfoItem
                label="Branch"
                value={detail?.branch_name || "—"}
              />

              <MemoInfoItem
                label="Admission Date"
                value={formattedAdmissionDate}
              />

              <MemoInfoItem
                label="Discharge Date"
                value={formattedDischargeDate}
              />

              <MemoInfoItem
                label="Status"
                value={
                  <span
                    className={`idm-status ${detail?.status}`}
                  >
                    {detail?.status}
                  </span>
                }
              />

              <MemoInfoItem
                label="Admission Reason"
                value={detail?.admission_reason || "—"}
                wide
              />

              <MemoInfoItem
                label="Discharge Summary"
                value={detail?.discharge_summary || "—"}
                wide
              />
            </div>

            {/* ───────────── SECTIONS ───────────── */}

            <Suspense fallback={<SectionSkeleton />}>
              <IpdBedChargesSection ipdId={admission.id} />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdBedAllocationSection ipdId={admission.id} />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdDoctorVisitsSection ipdId={admission.id} />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdLabTestsSection ipdId={admission.id} />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdProceduresSection ipdId={admission.id} />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdNursingChargesSection ipdId={admission.id} />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdMiscChargesSection ipdId={admission.id} />
            </Suspense>
            <Suspense fallback={<SectionSkeleton />}>
              <IpdPharmacySection
                ipdId={admission.id}
              />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <IpdBillSection
                ipdId={admission.id}
              />
            </Suspense>

             <Suspense fallback={<SectionSkeleton />}>
              <IpdPaymentSection
                ipdId={admission.id}
              />
            </Suspense>

          </div>
        )}
      </div>
    </div>
  );
}

export default memo(IpdDetailModal);

// ─────────────────────────────────────────────────────────────
// MEMOIZED INFO ITEM
// Prevents unnecessary re-renders
// ─────────────────────────────────────────────────────────────

const MemoInfoItem = memo(function InfoItem({
  label,
  value,
  wide,
}) {
  return (
    <div className={`idm-info-item ${wide ? "wide" : ""}`}>
      <span className="idm-info-label">
        {label}
      </span>

      <span className="idm-info-value">
        {value ?? "—"}
      </span>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// FULL PAGE SKELETON
// ─────────────────────────────────────────────────────────────

function IpdDetailSkeleton() {
  return (
    <div className="idm-skeleton-wrapper">

      <div className="idm-skeleton-grid">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`idm-skeleton-item ${
              i > 7 ? "wide" : ""
            }`}
          >
            <div className="idm-skeleton-label shimmer" />
            <div className="idm-skeleton-value shimmer" />
          </div>
        ))}
      </div>

      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION SKELETON
// ─────────────────────────────────────────────────────────────

function SectionSkeleton() {
  return (
    <div className="idm-section-skeleton">

      <div className="idm-section-title shimmer" />

      <div className="idm-section-table">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="idm-table-row shimmer"
          />
        ))}
      </div>
    </div>
  );
}


