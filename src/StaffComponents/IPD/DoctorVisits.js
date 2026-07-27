// DoctorVisits.jsx
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  memo,
} from "react";
import axios from "axios";
import "./Doctorvisits.css";

import {
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001/api";
const PAGE_SIZE = 5;

/* ─── Helpers ─── */
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

/* ─── Skeleton ─── */
const SkeletonRow = memo(() => (
  <tr className="dv-skeleton-row">
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i}>
        <div className="dv-skeleton-cell" />
      </td>
    ))}
  </tr>
));

const SkeletonCard = memo(() => (
  <div className="dv-card dv-skeleton-card">
    <div className="dv-skeleton-cell" style={{ height: 16, width: "55%", marginBottom: 8 }} />
    <div className="dv-skeleton-cell" style={{ height: 12, width: "40%" }} />
  </div>
));

/* ─── Visit Card (mobile) ─── */
const VisitCard = memo(({ visit, onEdit, onDelete, currentUserRole }) => (
  <div className="dv-card">
    <div className="dv-card-header">
      <div className="dv-card-ids">
        <span className="dv-card-ipd">IPD {visit.ipd_id}</span>
        <span className="dv-card-date">{fmtDate(visit.visit_date)}</span>
      </div>
      {/* <span className="dv-charge-badge">{fmt(visit.visit_charge)}</span> */}
    </div>
    <div className="dv-card-body">
      <div className="dv-card-field">
        <span className="dv-card-label">Doctor</span>
        <span className="dv-card-value">{visit.doctor_name || "—"}</span>
      </div>
      <div className="dv-card-field">
        <span className="dv-card-label">Branch</span>
        <span className="dv-card-value">{visit.doctor_branch || "—"}</span>
      </div>
      <div className="dv-card-field">
        <span className="dv-card-label">Notes</span>
        <span className="dv-card-value dv-notes-preview">
          {visit.visit_notes || "—"}
        </span>
      </div>
    </div>
  </div>
));

/* ─── Visit Row (desktop) ─── */
const VisitRow = memo(({ visit }) => (
  <tr>
    <td className="td-mono">{visit.ipd_id}</td>
    <td>{visit.doctor_name || "—"}</td>
    <td>{visit.doctor_branch || "—"}</td>
    <td>{fmtDateTime(visit.visit_date)}</td>
    {/* <td className="td-charge">{fmt(visit.visit_charge)}</td> */}
    <td className="td-notes">{visit.visit_notes || "—"}</td>
  </tr>
));

/* ─── Pagination ─── */
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
    if (currentPage - delta > 2) range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");
    return [1, ...range, totalPages];
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="dv-pagination">
      <span className="dv-pg-info">{start}–{end} of {totalItems}</span>
      <div className="dv-pg-controls">
        <button
          className="dv-pg-btn dv-pg-arrow"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >‹</button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`e-${idx}`} className="dv-pg-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`dv-pg-btn${p === currentPage ? " dv-pg-active" : ""}`}
              onClick={() => onPageChange(p)}
            >{p}</button>
          )
        )}
        <button
          className="dv-pg-btn dv-pg-arrow"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >›</button>
      </div>
    </div>
  );
});

/* ─── Icons ─── */
const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════
   SEARCHABLE SELECT  — exact same component as IpdAdmission.jsx
═══════════════════════════════════════════════════════════════ */
const SearchableSelect = ({
  label,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  helperText,
  error = false,
  size = "medium",
  placeholder = "",
}) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => String(o.label).toLowerCase().includes(q)) : options;
  }, [options, search]);

  const displayLabel = useMemo(() => {
    if (value === "" || value === null || value === undefined) return "";
    return options.find((o) => String(o.id) === String(value))?.label ?? String(value);
  }, [options, value]);

  return (
    <FormControl fullWidth required={required} disabled={disabled} error={error} size={size}>
      <InputLabel shrink={!!displayLabel || undefined}>{label}</InputLabel>
      <Select
        value={value === "" ? "" : String(value)}
        label={label}
        displayEmpty
        onChange={(e) => {
          const raw = e.target.value;
          const asNum = Number(raw);
          onChange(isNaN(asNum) || raw === "" ? raw : asNum);
        }}
        onClose={() => setSearch("")}
        renderValue={() =>
          displayLabel ? (
            displayLabel
          ) : (
            <Typography component="span" sx={{ color: "text.disabled", fontStyle: "italic" }}>
              {placeholder}
            </Typography>
          )
        }
        MenuProps={{
          PaperProps: { sx: { maxHeight: 320 } },
          disableAutoFocusItem: true,
        }}
      >
        {/* Pinned search box — identical to IpdAdmission */}
        <ListSubheader sx={{ p: "8px 10px", bgcolor: "background.paper", lineHeight: "normal" }}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            placeholder="Type to search…"
            value={search}
            onChange={(e) => { e.stopPropagation(); setSearch(e.target.value); }}
            onKeyDown={(e) => e.stopPropagation()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
          />
        </ListSubheader>

        <MenuItem value=""><em style={{ color: "#94a3b8" }}>None</em></MenuItem>

        {filtered.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="caption" color="text.disabled">No results</Typography>
          </MenuItem>
        ) : (
          filtered.map((o) => (
            <MenuItem key={o.id} value={String(o.id)}>{o.label}</MenuItem>
          ))
        )}
      </Select>
      {helperText && (
        <FormHelperText sx={{ mx: "14px" }}>{helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

/* ─── Add / Edit Modal ─── */
const VisitModal = memo(({
  mode,
  initial,
  branches,
  userBranch,
  userRole,
  ipdAdmissions,
  onClose,
  onSaved,
}) => {
  const today = new Date().toISOString().slice(0, 16);

  const [form, setForm] = useState({
    ipd_id:       initial?.ipd_id      || "",
    doctor_id:    initial?.doctor_id   || "",
    visit_date:   initial?.visit_date
      ? new Date(initial.visit_date).toISOString().slice(0, 16)
      : today,
    visit_notes:  initial?.visit_notes  || "",
    visit_charge: initial?.visit_charge || "",
  });

  const [doctors, setDoctors] = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  /* Build options for SearchableSelect — same pattern as clientOptions in IpdAdmission */
  const ipdOptions = useMemo(
    () => ipdAdmissions.map((a) => ({ id: a.id, label: `${a.id} – ${a.client_name}` })),
    [ipdAdmissions]
  );

  useEffect(() => {
    axios
      .get(`${API}/staff/branch-doctors`, { withCredentials: true })
      .then((r) => setDoctors(r.data.data || r.data || []))
      .catch(() => setDoctors([]));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ipd_id || !form.visit_date) {
      setError("IPD ID and visit date are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ipd_id:       form.ipd_id,
        doctor_id:    form.doctor_id || undefined,
        visit_date:   form.visit_date,
        visit_notes:  form.visit_notes  || null,
        visit_charge: form.visit_charge ? Number(form.visit_charge) : 0,
      };
      if (mode === "add") {
        await axios.post(`${API}/post/doctor-visit/`, payload, { withCredentials: true });
      } else {
        await axios.put(`${API}/update/doctor-visit/${initial.id}`, payload, { withCredentials: true });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dv-modal-overlay" onClick={onClose}>
      <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dv-modal-header">
          <div className="dv-modal-title-wrap">
            <div className="dv-modal-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h3 className="dv-modal-title">
                {mode === "add" ? "Add Doctor Visit" : "Edit Doctor Visit"}
              </h3>
              <p className="dv-modal-sub">Fill in the visit details below</p>
            </div>
          </div>
          <button className="dv-modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="dv-modal-body" onSubmit={handleSubmit}>
          {error && <div className="dv-form-error">{error}</div>}

          {/* Row 1: IPD Patient — SearchableSelect (exact IpdAdmission pattern) */}
          <div className="dv-form-row">
            <div className="dv-form-group">
              <label>
                IPD Patient <span className="dv-required">*</span>
              </label>
              <SearchableSelect
                // label="IPD Patient"
                value={form.ipd_id}
                onChange={(id) => set("ipd_id", id)}
                options={ipdOptions}
                required
                placeholder="Search active IPD patient…"
                size="small"
              />
            </div>
          </div>

          {/* Row 2: Doctor (receptionist only) | Visit Date */}
          <div className="dv-form-row">
            {userRole === "receptionist" && (
              <div className="dv-form-group">
                <label>Doctor <span className="dv-required">*</span></label>
                <select
                  value={form.doctor_id}
                  onChange={(e) => set("doctor_id", e.target.value)}
                  required
                >
                  <option value="">— Select Doctor —</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="dv-form-group">
              <label>Visit Date & Time <span className="dv-required">*</span></label>
              <input
                type="datetime-local"
                value={form.visit_date}
                onChange={(e) => set("visit_date", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Row 3: Charge | Notes */}
          <div className="dv-form-row">
           {/*  <div className="dv-form-group">
              <label>Visit Charge (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.visit_charge}
                onChange={(e) => set("visit_charge", e.target.value)}
              />
            </div>
            */}

            <div className="dv-form-group dv-form-group--full">
              <label>Visit Notes</label>
              <textarea
                rows={3}
                placeholder="Enter visit notes…"
                value={form.visit_notes}
                onChange={(e) => set("visit_notes", e.target.value)}
              />
            </div>
          </div> 

          <div className="dv-modal-footer">
            <button type="button" className="dv-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dv-btn-save" disabled={saving}>
              {saving ? "Saving…" : mode === "add" ? "Add Visit" : "Update Visit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

/* ─── Delete Confirm Modal ─── */
const DeleteModal = memo(({ visit, onClose, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/delete/doctor-visit/${visit.id}`, {
        withCredentials: true,
      });
      onDeleted();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="dv-modal-overlay" onClick={onClose}>
      <div className="dv-modal dv-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="dv-modal-header">
          <h3 className="dv-modal-title">Delete Visit</h3>
          <button className="dv-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="dv-modal-body">
          <p className="dv-delete-msg">
            Are you sure you want to delete the visit for IPD{" "}
            <strong>{visit.ipd_id}</strong> on{" "}
            <strong>{fmtDate(visit.visit_date)}</strong>? This cannot be undone.
          </p>
        </div>
        <div className="dv-modal-footer">
          <button className="dv-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="dv-btn-delete-confirm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function DoctorVisits() {
  const currentUserRole   = localStorage.getItem("role")   || "doctor";
  const currentUserBranch = localStorage.getItem("branch") || "";

  const [visits,      setVisits]      = useState([]);
  const [branches,    setBranches]    = useState([]);
  const [admissions,  setAdmissions]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  /* filters */
  const [filterIpd,  setFilterIpd]  = useState("");
  const [filterDate, setFilterDate] = useState("");

  /* modals */
  const [showAdd,     setShowAdd]     = useState(false);
  const [editVisit,   setEditVisit]   = useState(null);
  const [deleteVisit, setDeleteVisit] = useState(null);

  /* ── fetch visits ── */
  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/getall/doctor-visits/`, { withCredentials: true });
      setVisits(Array.isArray(res.data) ? res.data : []);
    } catch {
      setVisits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── fetch branches ── */
  const fetchBranches = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/get/admin/branches`, { withCredentials: true });
      setBranches(res.data.data || []);
    } catch {}
  }, []);

  /* ── fetch admissions for the IPD dropdown ── */
  const fetchAdmissions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/get/active-ipdadmissions`, { withCredentials: true });
      setAdmissions(res.data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchVisits();
    fetchBranches();
    fetchAdmissions();
  }, [fetchVisits, fetchBranches, fetchAdmissions]);

  /* ── filtered visits ── */
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const matchIpd = !filterIpd.trim() ||
        String(v.ipd_id || "").toLowerCase().includes(filterIpd.toLowerCase());
      const matchDate = !filterDate ||
        new Date(v.visit_date).toLocaleDateString("en-CA") === filterDate;
      return matchIpd && matchDate;
    });
  }, [visits, filterIpd, filterDate]);

  /* ── pagination ── */
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredVisits.length / PAGE_SIZE)),
    [filteredVisits.length]
  );
  const safePage = Math.min(currentPage, totalPages);
  const pagedVisits = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredVisits.slice(start, start + PAGE_SIZE);
  }, [filteredVisits, safePage]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const uniqueBranches = useMemo(
    () => [...new Set(visits.map((v) => v.doctor_branch).filter(Boolean))],
    [visits]
  );

  /* ── render ── */
  return (
    <div className="dv-container">

      {/* ── Top Bar ── */}
      <div className="dv-topbar">
        <div className="dv-topbar-left">
          <div className="dv-topbar-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <h2 className="dv-topbar-title">Doctor Visits</h2>
            <p className="dv-topbar-sub">IPD visit records &amp; charges</p>
          </div>
        </div>
        <button className="dv-add-btn" onClick={() => setShowAdd(true)}>
          <PlusIcon /> Add Visit
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="dv-filters">
        <div className="dv-filter-group">
          <label className="dv-filter-label">IPD ID</label>
          <input
            className="dv-filter-input"
            type="text"
            placeholder="Search IPD…"
            value={filterIpd}
            onChange={handleFilterChange(setFilterIpd)}
          />
        </div>

        <div className="dv-filter-group">
          <label className="dv-filter-label">Visit Date</label>
          <input
            className="dv-filter-input"
            type="date"
            value={filterDate}
            onChange={handleFilterChange(setFilterDate)}
          />
        </div>

        <div className="dv-filter-count">
          {filteredVisits.length} record{filteredVisits.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <>
          <div className="dv-cards-grid">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="dv-table-wrapper">
            <table className="dv-table">
              <thead>
                <tr>
                  {["IPD ID", "Doctor", "Branch", "Visit Date", "Notes"].map((h) => (
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
      ) : filteredVisits.length === 0 ? (
        <div className="dv-empty">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <p>No visits found{filterIpd || filterDate ? " for the selected filters" : ""}.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="dv-cards-grid">
            {pagedVisits.map((v) => (
              <VisitCard
                key={v.id}
                visit={v}
                onEdit={setEditVisit}
                onDelete={setDeleteVisit}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="dv-table-wrapper">
            <table className="dv-table">
              <thead>
                <tr>
                  <th>IPD ID</th>
                  <th>Doctor</th>
                  <th>Branch</th>
                  <th>Visit Date</th>
                  {/* <th>Charge</th> */}
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {pagedVisits.map((v) => (
                  <VisitRow
                    key={v.id}
                    visit={v}
                    onEdit={setEditVisit}
                    onDelete={setDeleteVisit}
                    currentUserRole={currentUserRole}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            totalItems={filteredVisits.length}
            pageSize={PAGE_SIZE}
          />
        </>
      )}

      {/* ── Modals ── */}
      {showAdd && (
        <VisitModal
          mode="add"
          initial={null}
          branches={branches}
          userBranch={currentUserBranch}
          userRole={currentUserRole}
          ipdAdmissions={admissions}
          onClose={() => setShowAdd(false)}
          onSaved={fetchVisits}
        />
      )}

      {editVisit && (
        <VisitModal
          mode="edit"
          initial={editVisit}
          branches={branches}
          userBranch={currentUserBranch}
          userRole={currentUserRole}
          ipdAdmissions={admissions}
          onClose={() => setEditVisit(null)}
          onSaved={fetchVisits}
        />
      )}

      {deleteVisit && (
        <DeleteModal
          visit={deleteVisit}
          onClose={() => setDeleteVisit(null)}
          onDeleted={fetchVisits}
        />
      )}
    </div>
  );
}