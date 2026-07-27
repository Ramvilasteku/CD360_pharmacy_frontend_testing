// IpdBills.jsx
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  memo,
  lazy,
  Suspense,
  useRef,
} from "react";
import axios from "axios";
import "./IpdBills.css";
import ProtectedActionButton from "../components/ProtectedActionButton";
// IpdBills.jsx — add these imports at the top
import { useDispatch } from "react-redux";
import { setDischargedPatients } from "./redux/slices/ipdSlice";

const API  = process.env.REACT_APP_API_URL  || "http://localhost:5001/api";
const SITE = process.env.REACT_APP_SITE_URL || "http://localhost:5001";

const PAGE_SIZE = 5;

/* ── Lazy-loaded heavy modals ── */
const GenerateBillModal = lazy(() =>
  import("./GenerateBillModal").then((m) => ({ default: m.GenerateBillModal }))
);
const ViewBillModal = lazy(() =>
  import("./ViewBillModal").then((m) => ({ default: m.ViewBillModal }))
);
const EditBillModal = lazy(() =>
  import("./EditBillModal").then((m) => ({ default: m.EditBillModal }))
);

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/* ─────────────────────────────────────────────
   FULL-PAGE CENTERED LOADER  (first mount only)
───────────────────────────────────────────── */
export const PageLoader = memo(({ text = "Loading…" }) => (
  <div className="ipd-page-loader">
    <div className="ipd-loader-ring">
      <div /><div /><div /><div />
    </div>
    <p className="ipd-loader-text">{text}</p>
  </div>
));

/* ─────────────────────────────────────────────
   OVERLAY LOADER  (subsequent fetches — non-blocking)
───────────────────────────────────────────── */
const OverlayLoader = memo(() => (
  <div className="ipd-overlay-loader" aria-live="polite" aria-label="Refreshing bills">
    <div className="ipd-loader-ring sm">
      <div /><div /><div /><div />
    </div>
    <span>Refreshing…</span>
  </div>
));

/* ── Suspense fallback ── */
const ModalFallback = () => (
  <div className="bill-modal-overlay">
    <div className="modal-lazy-loader">
      <div className="ipd-loader-ring sm">
        <div /><div /><div /><div />
      </div>
      <span>Loading…</span>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────── */
const StatusBadge = memo(({ status }) => (
  <span className={`bill-status ${status}`}>{status}</span>
));

/* ─────────────────────────────────────────────
   BILL CARD  (mobile / tablet)
───────────────────────────────────────────── */
const BillCard = memo(({ bill, handleDownload, handleEdit, handleView }) => (
  <div className="bill-card">
    <div className="bill-card-header">
      <div className="bill-card-ids">
        <span className="bill-card-num">Bill #{bill.id}</span>
        <span className="bill-card-ipd">IPD {bill.ipd_id}</span>
      </div>
      <StatusBadge status={bill.bill_status} />
    </div>

    <div className="bill-card-body">
      <div className="bill-card-field">
        <span className="bill-card-label">Total</span>
        <span className="bill-card-value amount">{fmt(bill.grand_total)}</span>
      </div>
      <div className="bill-card-field">
        <span className="bill-card-label">Discount</span>
        <span className="bill-card-value amount">{fmt(bill.discount)}</span>
      </div>
      <div className="bill-card-field">
        <span className="bill-card-label">Paid</span>
        <span className="bill-card-value amount paid">{fmt(bill.paid_amount)}</span>
      </div>
      <div className="bill-card-field">
        <span className="bill-card-label">Balance</span>
        <span className="bill-card-value amount balance">{fmt(bill.balance_amount)}</span>
      </div>
      <div className="bill-card-field">
        <span className="bill-card-label">Date</span>
        <span className="bill-card-value">{fmtDate(bill.created_at)}</span>
      </div>
    </div>

    <div className="bill-card-footer">
      <button className="view-btn" onClick={handleView}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
        View
      </button>
     <ProtectedActionButton
      ipdId={bill.ipd_id}
      hideWhenDischarged={false}  // ← now it disables instead
      className="edit-btn"
      onClick={handleEdit}
    >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </ProtectedActionButton>
      <button className="download-btn" onClick={() => handleDownload(bill.id)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        PDF
      </button>
    </div>
  </div>
));

/* ─────────────────────────────────────────────
   BILL ROW  (desktop)
───────────────────────────────────────────── */
const BillRow = memo(({ bill, handleDownload, handleEdit, handleView }) => (
  <tr>
    <td className="td-mono">{bill.id}</td>
    <td className="td-mono">{bill.ipd_id}</td>
    <td className="td-amount">{fmt(bill.grand_total)}</td>
    {/* <td>{fmt(bill.discount)}</td> */}
    <td className="td-paid">{fmt(bill.paid_amount)}</td>
    <td className="td-balance">{fmt(bill.balance_amount)}</td>
    <td><StatusBadge status={bill.bill_status} /></td>
    <td className="td-date">{fmtDate(bill.created_at)}</td>
    <td>
      <div className="bill-actions">
        <button className="view-btn" onClick={handleView}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
          View
        </button>
        <ProtectedActionButton
        ipdId={bill.ipd_id}
        hideWhenDischarged={true}
        className="edit-btn"
        onClick={handleEdit}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit
      </ProtectedActionButton>
        <button className="download-btn" onClick={() => handleDownload(bill.id)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          PDF
        </button>
      </div>
    </td>
  </tr>
));

/* ─────────────────────────────────────────────
   SKELETON  (loading placeholders)
───────────────────────────────────────────── */
const SkeletonRow = memo(() => (
  <tr className="skeleton-row">
    {Array.from({ length: 9 }).map((_, i) => (
      <td key={i}><div className="skeleton-cell" /></td>
    ))}
  </tr>
));

const SkeletonCard = memo(() => (
  <div className="bill-card skeleton-card">
    <div className="skeleton-cell" style={{ height: 18, width: "60%", marginBottom: 10 }} />
    <div className="skeleton-cell" style={{ height: 14, width: "40%" }} />
  </div>
));

/* ─────────────────────────────────────────────
   PAGINATION COMPONENT
───────────────────────────────────────────── */
const Pagination = memo(({ currentPage, totalPages, onPageChange, totalItems, pageSize }) => {
  const pages = useMemo(() => {
    if (totalPages <= 1) return [];
    const delta = 1;
    const range = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) range.push(i);

    if (currentPage - delta > 2)              range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");

    return [1, ...range, totalPages];
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="bills-pagination">
      <span className="pg-info">{start}–{end} of {totalItems} bills</span>
      <div className="pg-controls">
        <button
          className="pg-btn pg-arrow"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="pg-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`pg-btn${p === currentPage ? " pg-active" : ""}`}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className="pg-btn pg-arrow"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function IpdBills() {
  const [bills,       setBills]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [searchRaw,   setSearchRaw]   = useState("");
  const [search,      setSearch]      = useState("");
  const [admissions,  setAdmissions]  = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const isFirstLoad = useRef(true);
  const dispatch = useDispatch(); // ← add this

  /* modal states */
  const [showGenerate, setShowGenerate] = useState(false);
  const [viewBill,     setViewBill]     = useState(null);
  const [editBill,     setEditBill]     = useState(null);

  /* debounce timer */
  const searchTimer = useRef(null);

  /* ── debounced search — resets to page 1 ── */
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchRaw(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 300);
  }, []);

  /* ── fetch bills ── */
  const fetchBills = useCallback(async () => {
    if (isFirstLoad.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await axios.get(`${API}/getall/bills`, {
        withCredentials: true,
        signal: controller.signal,
      });
      clearTimeout(timer);
      setBills(res.data.success ? res.data.data || [] : []);
    } catch (err) {
      if (err.name !== "CanceledError") console.error("FETCH BILL ERROR:", err);
      setBills([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFirstLoad.current = false;
    }
  }, []);

  /* ── fetch admissions ── */
 const fetchAdmissions = useCallback(async () => {

  
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await axios.get(`${API}/get/branch/ipdadmission`, {
        withCredentials: true,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.data.success) {
        const admissionsData = res.data.data || [];
        setAdmissions(admissionsData);

        // ← Build and dispatch the discharged map
       // fetchAdmissions — build map with BOTH the raw id and the prefixed string
        const dischargedMap = {};
        admissionsData.forEach((item) => {
          if (item.status === "discharged") {
            dischargedMap[item.id] = true;              // 731852
            dischargedMap[`IPD${item.id}`] = true;      // "IPD731852"
            dischargedMap[String(item.id)] = true;      // "731852"
          }
        });
        dispatch(setDischargedPatients(dischargedMap));
      }
      

    } catch {}
  }, [dispatch]);
  useEffect(() => {
    fetchBills();
    fetchAdmissions();
    return () => clearTimeout(searchTimer.current);
  }, [fetchBills, fetchAdmissions]);

  /* ── download PDF ── */
  const handleDownload = useCallback(async (billId) => {
    try {
      const response = await axios.get(
        `${API}/get/bill/invoice-pdf/${billId}`,
        { responseType: "blob", withCredentials: true }
      );
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      window.open(url);
    } catch {
      alert("Failed to download invoice");
    }
  }, []);

  /* ── filtered bills ── */
  const filteredBills = useMemo(() => {
    if (!search.trim()) return bills;
    const q = search.toLowerCase();
    return bills.filter((item) =>
      String(item.bill_summary?.ipd_id || "").toLowerCase().includes(q)
    );
  }, [bills, search]);

  /* ── pagination derived values ── */
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE)),
    [filteredBills.length]
  );

  const safePage = useMemo(
    () => Math.min(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const pagedBills = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredBills.slice(start, start + PAGE_SIZE);
  }, [filteredBills, safePage]);

  const handlePageChange = useCallback((p) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ── modal handlers ── */
  const openEdit = useCallback((bs)   => setEditBill(bs),  []);
  const openView = useCallback((item) => setViewBill(item), []);

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div className="ipd-bills-container">

      {/* OVERLAY LOADER */}
      {refreshing && <OverlayLoader />}

      {/* PAGE HEADER */}
      <div className="bill-topbar">
        <div className="bill-topbar-left">
          <div className="bill-topbar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h2>IPD Bills</h2>
            <p className="bill-topbar-sub">Inpatient billing &amp; invoices</p>
          </div>
        </div>

        <div className="bill-topbar-actions">
          <div className="search-wrap">
            <svg className="search-icon-inp" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by IPD ID…"
              value={searchRaw}
              onChange={handleSearchChange}
            />
          </div>
          <button className="generate-btn" onClick={() => setShowGenerate(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
           Discount
          </button>
        </div>
      </div>

      {/* STATS BAR */}
      {!loading && bills.length > 0 && (
        <div className="bills-stats-bar">
          <div className="bstat">
            <span className="bstat-num">{bills.length}</span>
            <span className="bstat-lbl">Total Bills</span>
          </div>
          <div className="bstat">
            <span className="bstat-num paid-col">
              {bills.filter((b) => b.bill_summary?.bill_status === "paid").length}
            </span>
            <span className="bstat-lbl">Paid</span>
          </div>
          <div className="bstat">
            <span className="bstat-num partial-col">
              {bills.filter((b) => b.bill_summary?.bill_status === "partial").length}
            </span>
            <span className="bstat-lbl">Partial</span>
          </div>
          <div className="bstat">
            <span className="bstat-num pending-col">
              {bills.filter((b) => b.bill_summary?.bill_status === "pending").length}
            </span>
            <span className="bstat-lbl">Pending</span>
          </div>
        </div>
      )}

      {/* LOADING STATE (first mount) */}
      {loading ? (
        <>
          <div className="bills-grid">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="table-wrapper">
            <table className="bills-table">
              <thead>
                <tr>
                  {["Bill ID", "IPD ID", "Total", "Paid", "Balance", "Status", "Date", "Actions"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        </>
      ) : filteredBills.length === 0 ? (
        <div className="bills-empty">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p>{search ? `No bills matching "${search}"` : "No bills found."}</p>
        </div>
      ) : (
        <>
          {/* MOBILE / TABLET CARD GRID */}
          <div className="bills-grid">
            {pagedBills.map((item) => (
              <BillCard
                key={item.bill_summary?.id}
                bill={item.bill_summary}
                handleDownload={handleDownload}
                handleEdit={() => openEdit(item.bill_summary)}
                handleView={() => openView(item)}
              />
            ))}
          </div>

          {/* DESKTOP TABLE */}
          <div className="table-wrapper">
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>IPD ID</th>
                  <th>Total</th>
                  
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedBills.map((item) => (
                  <BillRow
                    key={item.bill_summary?.id}
                    bill={item.bill_summary}
                    handleDownload={handleDownload}
                    handleEdit={() => openEdit(item.bill_summary)}
                    handleView={() => openView(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={filteredBills.length}
            pageSize={PAGE_SIZE}
          />
        </>
      )}

      {/* LAZY MODALS */}
      {showGenerate && (
        <Suspense fallback={<ModalFallback />}>
          <GenerateBillModal
            admissions={admissions.filter(
              (admission) =>
                String(admission.status).toLowerCase() === "admitted"
            )}
            onClose={() => setShowGenerate(false)}
            onCreated={fetchBills}
          />
        </Suspense>
      )}

      {viewBill && (
        <Suspense fallback={<ModalFallback />}>
          <ViewBillModal
            data={viewBill}
            onClose={() => setViewBill(null)}
          />
        </Suspense>
      )}

      {editBill && (
        <Suspense fallback={<ModalFallback />}>
          <EditBillModal
            bill={editBill}
            onClose={() => setEditBill(null)}
            onSaved={fetchBills}
          />
        </Suspense>
      )}
    </div>
  );
}