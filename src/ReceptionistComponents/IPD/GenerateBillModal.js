// GenerateBillModal.jsx
// ─────────────────────────────────────────────────────────────
// Changes from previous version:
//  • IPD Admission select replaced with custom IpdSearchDropdown
//    — search input lives inside the dropdown panel itself
//  • ipdSearch / setIpdSearch props no longer needed from parent
//  • All other functionality unchanged
// ─────────────────────────────────────────────────────────────

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";

// const API = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

// const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

/* ─────────────────────────────────────────────
   IPD SEARCHABLE DROPDOWN
   — search input pinned inside the open panel
───────────────────────────────────────────── */
function IpdSearchDropdown({ admissions, value, onChange }) {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState("");
  const ref      = useRef(null);
  const inputRef = useRef(null);

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

   
  // focus search input when panel opens
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

 const filtered = useMemo(() => {
  if (!query.trim()) return admissions;

  const q = query.trim().toLowerCase().replace(/^ipd\s*/i, "");

  return admissions.filter((a) => {
    const id = String(a.id).toLowerCase();
    const patient = String(a.client_name || "").toLowerCase();

    return (
      id.includes(q) ||
      patient.includes(q)
    );
  });
}, [admissions, query]);

  const selected = admissions.find((a) => String(a.id) === String(value));

  const handleSelect = (a) => {
    onChange(String(a.id));
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  return (
    <div className="modal-group" ref={ref} style={{ position: "relative" }}>
      <label>IPD Admission</label>

      {/* Trigger button — looks like a native select */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 44, padding: "0 12px",
          border: `1.5px solid ${open ? "#0d9488" : "#e4eaf0"}`,
          borderRadius: 8, background: open ? "#fff" : "#f7f9fb",
          cursor: "pointer", fontSize: 14,
          color: selected ? "#111827" : "#9ca3af",
          boxSizing: "border-box", userSelect: "none",
          transition: "border-color 0.2s",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? `IPD #${selected.id} — ${selected.client_name}` : "— Select Admission —"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {selected && (
            <span
              onClick={handleClear}
              style={{ color: "#9ca3af", fontSize: 16, lineHeight: 1, padding: "0 2px", cursor: "pointer" }}
              title="Clear"
            >×</span>
          )}
          {/* chevron */}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1.5px solid #e4eaf0",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          zIndex: 999999, overflow: "hidden",
        }}>
          {/* Search input pinned at top of panel */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ position: "relative" }}>
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", opacity: 0.4, pointerEvents: "none" }}
              >
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search IPD ID or patient name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                style={{
                  width: "100%", height: 34, paddingLeft: 28, paddingRight: 10,
                  border: "1.5px solid #e4eaf0", borderRadius: 6,
                  fontSize: 13, background: "#f7f9fb", outline: "none",
                  color: "#111827", boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0d9488")}
                onBlur={(e)  => (e.target.style.borderColor = "#e4eaf0")}
              />
            </div>
          </div>

          {/* Options list */}
          <ul style={{
            listStyle: "none", margin: 0, padding: "4px 0",
            maxHeight: 220, overflowY: "auto",
          }}>
            {filtered.length === 0 ? (
              <li style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                No results found
              </li>
            ) : (
              filtered.map((a) => (
                <li
                  key={a.id}
                  onClick={() => handleSelect(a)}
                  style={{
                    padding: "9px 14px", fontSize: 13, cursor: "pointer",
                    background: String(a.id) === String(value) ? "#f0fdf4" : "transparent",
                    color: String(a.id) === String(value) ? "#16a34a" : "#374151",
                    fontWeight: String(a.id) === String(value) ? 600 : 400,
                    transition: "background 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                  onMouseEnter={(e) => {
                    if (String(a.id) !== String(value)) e.currentTarget.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (String(a.id) !== String(value)) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>
                    <strong style={{ color: "#0d9488" }}>#{a.id}</strong>
                    {" — "}{a.client_name}
                  </span>
                  {String(a.id) === String(value) && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </li>
              ))
            )}
          </ul>

          {/* Result count footer */}
          {query.trim() && (
            <div style={{
              padding: "6px 14px", borderTop: "1px solid #f1f5f9",
              fontSize: 11, color: "#9ca3af",
            }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const API = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

const fmt = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");

/* ─────────────────────────────────────────────
   CHARGE FORM POPUP
───────────────────────────────────────────── */
function ChargeFormPopup({
  title, columns, form, setForm, onSave, onClose, saving, isEdit,
}) {
  return (
    <div className="charge-popup-overlay" onClick={onClose}>
      <div className="charge-popup" onClick={(e) => e.stopPropagation()}>
        <div className="charge-popup-header">
          <h4 className="charge-popup-title">
            {isEdit ? `Edit — ${title}` : `Add — ${title}`}
          </h4>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="charge-popup-body">
          {columns.map((c) => (
            <div
              className={`charge-popup-group${c.fullWidth ? " full-width" : ""}`}
              key={c.key}
            >
              <label>{c.label}</label>
              {c.type === "select" ? (
                <select
                  value={form[c.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                >
                  {c.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={c.inputType || "text"}
                  placeholder={`Enter ${c.label.toLowerCase()}`}
                  value={form[c.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>

        <div className="charge-popup-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CHARGE SECTION
───────────────────────────────────────────── */
function ChargeSection({
  title, rows, loading, onRefresh, columns,
  amountKey, emptyForm, addFn, updateFn, deleteFn,
}) {
  const [mode,    setMode]    = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [form,    setForm]    = useState(emptyForm);
  const [saving,  setSaving]  = useState(false);

  const total = rows.reduce((s, r) => s + Number(r[amountKey] || 0), 0);

  const openAdd = useCallback(() => {
    setForm({ ...emptyForm });
    setEditRow(null);
    setMode("add");
  }, [emptyForm]);

  const openEdit = useCallback((row) => {
    const f = {};
    columns.forEach((c) => (f[c.key] = row[c.key] ?? ""));
    setForm(f);
    setEditRow(row);
    setMode("edit");
  }, [columns]);

  const closePopup = useCallback(() => {
    setMode(null);
    setEditRow(null);
    setForm(emptyForm);
  }, [emptyForm]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      if (mode === "edit") {
        await updateFn(editRow.id, form);
      } else {
        await addFn(form);
      }
      closePopup();
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [mode, editRow, form, addFn, updateFn, closePopup, onRefresh]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteFn(id);
      await onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  }, [deleteFn, onRefresh]);

  return (
    <>
      <div className="charge-section">
        <div className="charge-section-header">
          <h4 className="charge-section-title">{title}</h4>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {total > 0 && (
              <span className="charge-section-total">{fmt(total)}</span>
            )}
            <button className="add-row-btn" onClick={openAdd}>+ Add</button>
          </div>
        </div>

        <div className="charge-table-wrap">
          {loading ? (
            <div className="charge-section-loader">
              <div className="cs-loader-ring"><div/><div/><div/><div/></div>
              <span>Loading…</span>
            </div>
          ) : rows.length === 0 ? (
            <p className="charge-empty">No records yet. Click + Add to begin.</p>
          ) : (
            <table className="charge-table">
              <thead>
                <tr>
                  {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.isAmount ? "amount-cell" : ""}>
                        {c.isAmount ? fmt(row[c.key]) : (row[c.key] ?? "—")}
                      </td>
                    ))}
                    <td>
                      <button className="ch-edit-btn"   onClick={() => openEdit(row)}>Edit</button>
                      <button className="ch-delete-btn" onClick={() => handleDelete(row.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {mode && (
        <ChargeFormPopup
          title={title}
          columns={columns}
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onClose={closePopup}
          saving={saving}
          isEdit={mode === "edit"}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   GENERATE BILL MODAL
───────────────────────────────────────────── */
export function GenerateBillModal({ admissions, onClose, onCreated }) {
  const [selectedAdmission, setSelectedAdmission] = useState("");
  const [discount, setDiscount] = useState("");
  const [saving, setSaving] = useState(false);
  const [createDiscount,    setCreateDiscount]    = useState(0);
  const [creatingBill,      setCreatingBill]      = useState(false);

  const makeSection = () => ({ rows: [], loading: false });
  const [sections, setSections] = useState({
    bed_charges:     makeSection(),
    pharmacy:        makeSection(),
    lab_tests:       makeSection(),
    doctor_visits:   makeSection(),
    procedures:      makeSection(),
    nursing_charges: makeSection(),
    misc_charges:    makeSection(),
  });
  
  useEffect(() => {
  if (!selectedAdmission) {
    setDiscount("");
    return;
  }

  const fetchDiscount = async () => {
  try {
    const res = await axios.get(
      `${API}/getall/bills`,
      {
        params: {
          ipd_id: selectedAdmission,
        },
        withCredentials: true,
      }
    );

    if (res.data.success && res.data.data.length > 0) {
      setDiscount(
        res.data.data[0].bill_summary?.discount || ""
      );
    }
  } catch (err) {
    console.error(err);
  }
};

  fetchDiscount();
}, [selectedAdmission]);


  const setSection = useCallback((key, patch) =>
    setSections((s) => ({ ...s, [key]: { ...s[key], ...patch } })), []);

  /* ── fetch all sections when IPD selected ── */
  useEffect(() => {
    if (!selectedAdmission) return;
    const ipdId = selectedAdmission;
    const hdr = { withCredentials: true };

    const fetchWithTimeout = async (key, fetcher) => {
      setSection(key, { loading: true });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const rows = await fetcher({ ...hdr, signal: controller.signal });
        setSection(key, { rows, loading: false });
      } catch {
        setSection(key, { loading: false });
      } finally {
        clearTimeout(timer);
      }
    };

    fetchWithTimeout("bed_charges", async (opts) => {
      const r = await axios.get(`${API}/getall/bed-charges`, { ...opts, params: { ipd_id: ipdId } });
      return r.data.data || [];
    });
    fetchWithTimeout("pharmacy", async (opts) => {
      const r = await axios.get(`${API}/getall/pharmacy`, { ...opts, params: { ipd_id: ipdId } });
      return r.data.data || [];
    });
    fetchWithTimeout("lab_tests", async (opts) => {
      const r = await axios.get(`${API}/get/lab-tests/ipd/${ipdId}`, opts);
      return r.data.data || r.data.tests || [];
    });
    fetchWithTimeout("doctor_visits", async (opts) => {
      const r = await axios.get(`${API}/get/doctor-visits/byipd/${ipdId}`, opts);
      return r.data.data || r.data.visits || [];
    });
    fetchWithTimeout("procedures", async (opts) => {
      const r = await axios.get(`${API}/get/procedure/ipd/${ipdId}`, opts);
      return r.data.data || r.data.procedures || [];
    });
    fetchWithTimeout("nursing_charges", async (opts) => {
      const r = await axios.get(`${API}/getall/nursing-charges`, { ...opts, params: { ipd_id: ipdId } });
      return r.data.data || [];
    });
    fetchWithTimeout("misc_charges", async (opts) => {
      const r = await axios.get(`${API}/getall/misc-charges`, { ...opts, params: { ipd_id: ipdId } });
      return r.data.data || [];
    });
  }, [selectedAdmission, setSection]);


   const handleUpdateDiscount = async () => {
  if (!selectedAdmission) {
    alert("Please select IPD");
    return;
  }

  if (Number(discount) > 100 || Number(discount) < 0) {
    alert("Discount percentage must be between 0 and 100");
    return;
  }

  try {
    setSaving(true);

    const res = await axios.put(
      `${API}/update/discount/${selectedAdmission}`,
      {
        discount: Number(discount),
      },
      {
        withCredentials: true,
      }
    );

    if (res.data.success) {
      await refreshAllSections();

      alert(res.data.message);

      console.log("New Balance:", res.data.new_balance);
      console.log("Status:", res.data.status);

      onClose();
    }
  } catch (err) {
    alert(
      err.response?.data?.message ||
      "Failed to update discount"
    );
  } finally {
    setSaving(false);
  }
};


  /* ── section refreshers (stable) ── */
  const makeRefresh = useCallback(
    (key, urlOrFn) => async () => {
      const hdr = { withCredentials: true };
      setSection(key, { loading: true });
      try {
        const rows = typeof urlOrFn === "function"
          ? await urlOrFn(hdr)
          : await axios.get(urlOrFn, { ...hdr, params: { ipd_id: selectedAdmission } })
              .then((r) => r.data.data || []);
        setSection(key, { rows, loading: false });
      } catch {
        setSection(key, { loading: false });
      }
    },
    [selectedAdmission, setSection]
  );

  const refreshBedCharges = makeRefresh("bed_charges",     `${API}/getall/bed-charges`);
  const refreshPharmacy   = makeRefresh("pharmacy",        `${API}/getall/pharmacy`);
  const refreshNursing    = makeRefresh("nursing_charges", `${API}/getall/nursing-charges`);
  const refreshMisc       = makeRefresh("misc_charges",    `${API}/getall/misc-charges`);
  const refreshLab        = makeRefresh("lab_tests",       (h) =>
    axios.get(`${API}/get/lab-tests/ipd/${selectedAdmission}`, h)
      .then((r) => r.data.data || r.data.tests || []));
  const refreshDoctor     = makeRefresh("doctor_visits",   (h) =>
    axios.get(`${API}/get/doctor-visits/byipd/${selectedAdmission}`, h)
      .then((r) => r.data.data || r.data.visits || []));
  const refreshProcedures = makeRefresh("procedures",      (h) =>
    axios.get(`${API}/get/procedure/ipd/${selectedAdmission}`, h)
      .then((r) => r.data.data || r.data.procedures || []));

  /* ── create bill ── */
  const handleCreateBill = useCallback(async () => {
    if (!selectedAdmission) return alert("Select IPD Admission");
    if (Number(createDiscount) > 100 || Number(createDiscount) < 0) {
      return alert("Discount percentage must be between 0 and 100");
    }
    try {
      setCreatingBill(true);
      const res = await axios.post(
        `${API}/post/bills`,
        { ipd_id: selectedAdmission, discount: Number(createDiscount) || 0 },
        { withCredentials: true }
      );
      if (res.data.success) {
        alert("Bill Created Successfully");
        onCreated();
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create bill");
    } finally {
      setCreatingBill(false);
    }
  }, [selectedAdmission, createDiscount, onCreated, onClose]);

  const ipdId = selectedAdmission;
  const hdr   = { withCredentials: true };

  /* ── section definitions ── */
  const sectionDefs = [
    {
      key: "bed_charges", title: "Bed Charges", amountKey: "charge_amount",
      emptyForm: { charge_type: "full_day", hours_used: "", rate_per_day: "", charge_amount: "" },
      columns: [
        { key: "charge_date",   label: "Date" },
        { key: "bed_number",    label: "Bed" },
        { key: "charge_type",   label: "Type", type: "select", options: [
            { value: "full_day", label: "Full Day" },
            { value: "half_day", label: "Half Day" },
            { value: "hourly",   label: "Hourly" },
        ]},
        { key: "hours_used",    label: "Hours",    inputType: "number" },
        { key: "rate_per_day",  label: "Rate/Day", inputType: "number", isAmount: true },
        { key: "charge_amount", label: "Amount",   inputType: "number", isAmount: true },
      ],
      refresh:  refreshBedCharges,
      addFn:    (f) => axios.post(`${API}/post/bed-charges`,            { ipd_id: ipdId, ...f }, hdr),
      updateFn: (id, f) => axios.put(`${API}/update/bed-charges/${id}`, f, hdr),
      deleteFn: (id) => axios.delete(`${API}/delete/bed-charges/${id}`, hdr),
    },
    {
      key: "pharmacy", title: "Pharmacy / Medicines", amountKey: "total_price",
      emptyForm: { medicine_name: "", quantity: "", unit_price: "", total_price: "" },
      columns: [
        { key: "medicine_name", label: "Medicine" },
        { key: "quantity",      label: "Qty",       inputType: "number" },
        { key: "unit_price",    label: "Unit Price", inputType: "number", isAmount: true },
        { key: "total_price",   label: "Total",      inputType: "number", isAmount: true },
      ],
      refresh:  refreshPharmacy,
      addFn:    (f) => axios.post(`${API}/post/pharmacy-issue`,             { ipd_id: ipdId, ...f }, hdr),
      updateFn: (id, f) => axios.put(`${API}/update/pharmacy-issue/${id}`,  f, hdr),
      deleteFn: (id) => axios.delete(`${API}/delete/pharmacy-issue/${id}`,  hdr),
    },
    {
      key: "lab_tests", title: "Lab Tests", amountKey: "test_charge",
      emptyForm: { test_name: "", test_charge: "" },
      columns: [
        { key: "test_name",   label: "Test Name" },
        { key: "test_charge", label: "Charge", inputType: "number", isAmount: true },
      ],
      refresh:  refreshLab,
      addFn:    (f) => axios.post(`${API}/post/lab-tests/`,          { ipd_id: ipdId, ...f }, hdr),
      updateFn: (id, f) => axios.put(`${API}/update/lab-test/${id}`, f, hdr),
      deleteFn: (id) => axios.delete(`${API}/delete/lab-test/${id}`, hdr),
    },
    {
      key: "doctor_visits", title: "Doctor Visits", amountKey: "visit_charge",
      emptyForm: { doctor_id: "", visit_date: "", visit_charge: "", notes: "" },
      columns: [
        { key: "doctor_name",  label: "Doctor" },
        { key: "visit_date",   label: "Date" },
        { key: "visit_charge", label: "Charge", inputType: "number", isAmount: true },
        { key: "notes",        label: "Notes",   fullWidth: true },
      ],
      refresh:  refreshDoctor,
      addFn:    (f) => axios.post(`${API}/post/doctor-visit/`,            { ipd_id: ipdId, ...f }, hdr),
      updateFn: (id, f) => axios.put(`${API}/update/doctor-visit/${id}`,  f, hdr),
      deleteFn: (id) => axios.delete(`${API}/delete/doctor-visit/${id}`,  hdr),
    },
    {
      key: "procedures", title: "Procedures", amountKey: "procedure_charge",
      emptyForm: { procedure_name: "", procedure_charge: "", notes: "" },
      columns: [
        { key: "procedure_name",   label: "Procedure" },
        { key: "procedure_charge", label: "Charge",  inputType: "number", isAmount: true },
        { key: "notes",            label: "Notes",    fullWidth: true },
      ],
      refresh:  refreshProcedures,
      addFn:    (f) => axios.post(`${API}/post/procedures`,            { ipd_id: ipdId, ...f }, hdr),
      updateFn: (id, f) => axios.put(`${API}/update/procedure/${id}`, f, hdr),
      deleteFn: (id) => axios.delete(`${API}/delete/procedure/${id}`, hdr),
    },
    {
      key: "nursing_charges", title: "Nursing Charges", amountKey: "charge_amount",
      emptyForm: { service_name: "", charge_amount: "" },
      columns: [
        { key: "service_name",  label: "Service" },
        { key: "charge_amount", label: "Amount", inputType: "number", isAmount: true },
      ],
      refresh:  refreshNursing,
      addFn:    (f) => axios.post(`${API}/post/nursing-charges`,            { ipd_id: ipdId, ...f }, hdr),
      updateFn: (id, f) => axios.put(`${API}/update/nursing-charges/${id}`, f, hdr),
      deleteFn: (id) => axios.delete(`${API}/delete/nursing-charges/${id}`, hdr),
    },
    {
      key: "misc_charges", title: "Miscellaneous Charges", amountKey: "charge_amount",
      emptyForm: { description: "", charge_amount: "" },
      columns: [
        { key: "description",   label: "Description", fullWidth: true },
        { key: "charge_amount", label: "Amount",      inputType: "number", isAmount: true },
      ],
      refresh:  refreshMisc,
      addFn:    (f) => axios.post(`${API}/post/misc-charges`,            { ipd_id: ipdId, ...f }, hdr),
      updateFn: (id, f) => axios.put(`${API}/update/misc-charges/${id}`, f, hdr),
      deleteFn: (id) => axios.delete(`${API}/delete/misc-charges/${id}`, hdr),
    },
  ];

  const refreshAllSections = async () => {
  try {
    await Promise.all([
      refreshBedCharges(),
      refreshPharmacy(),
      refreshLab(),
      refreshDoctor(),
      refreshProcedures(),
      refreshNursing(),
      refreshMisc(),
    ]);
  } catch (err) {
    console.error("Refresh failed:", err);
  }
};
  return (
  <div className="bill-modal-overlay">
  <div className="discount-modal">

    <div className="discount-modal-header">
      <h3>Update IPD Discount</h3>

      <button
        className="discount-close-btn"
        onClick={onClose}
      >
        ✕
      </button>
    </div>

    <div className="discount-modal-body">

      <IpdSearchDropdown
        admissions={admissions}
        value={selectedAdmission} 
        onChange={setSelectedAdmission}
      />

     <div className="discount-form-group">
      <label>Discount (%)</label>

      <div style={{ position: "relative" }}>
        <input
          type="number"
          min="0"
          max="100"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          placeholder="Enter discount percentage"
          style={{ paddingRight: "30px" }}
        />

        <span
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          %
        </span>
      </div>
    </div>

    </div>

    <div className="discount-modal-footer">

      <button
        className="discount-cancel-btn"
        onClick={onClose}
      >
        Cancel
      </button>

      <button
        className="discount-save-btn"
        disabled={saving}
        onClick={handleUpdateDiscount}
      >
        {saving ? "Updating..." : "Update Discount"}
      </button>

    </div>

  </div>
</div>
  );
}