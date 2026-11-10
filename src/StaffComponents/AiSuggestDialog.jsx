import React, { useEffect, useRef, useState } from "react";
import { Dialog, Checkbox, CircularProgress } from "@mui/material";
import "./AiSuggestDialog.css";

/* ═══════════════════════════════════════════════════════════════════
   AiSuggestDialog — review an AI draft before it touches the Rx pad

   Props
     open, onClose
     complaint        chief complaint text
     patientId        sent so the server can use age/gender (never name/phone)
     padHasContent    true → offer "Add to current" and "Replace current"
     onApply(draft, mode)   mode "replace" | "merge"
       draft = { chief_complaint, diagnosis, treatment_plan, medicines, tests }
═══════════════════════════════════════════════════════════════════ */

const BASE = (process.env.REACT_APP_SITE_URL || "").replace(/\/+$/, "");

const num = (v) => (String(v ?? "").match(/\d+(\.\d+)?/) || [""])[0];

/* AI said "650 mg" but the chosen catalogue item says "250mg" → warn */
const strengthMismatch = (m, pickId) => {
  if (pickId === "") return null;
  const row = (m.ai.alternatives || []).find((a) => String(a.id) === String(pickId));
  const want = num(m.ai.strength);
  const have = num(row?.strength);
  if (!row || !want || !have || want === have) return null;
  return `Strength differs: AI suggested ${m.ai.strength}, your list has ${row.strength}${row.unit || ""}. This is what prints on the Rx — check it.`;
};

const pattern = (when = []) =>
  ["Morning", "Afternoon", "Night"].map((s) => (when.includes(s) ? "1" : "0")).join("-") +
  (when.includes("Evening") ? " + evening" : "");

/* pad shape only — drop the review-only "ai" info */
const toPadMedicine = (m, catalogRow) => {
  const { ai, ...rest } = m;
  if (!catalogRow || String(catalogRow.id) === String(m.medicine_id)) return rest;
  return {
    ...rest,
    medicine_id: catalogRow.id,
    medicine_name: catalogRow.medicine_name,
    type: catalogRow.type || rest.type,
    strength: catalogRow.strength || "",
    unit: catalogRow.unit || "",
    amount: Number(catalogRow.amount || 0),
  };
};
const toPadTest = (t) => {
  const { ai, ...rest } = t;
  return rest;
};

export default function AiSuggestDialog({ open, onClose, complaint, patientId, padHasContent, onApply }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [medOn, setMedOn] = useState([]);
  const [testOn, setTestOn] = useState([]);
  const [medPick, setMedPick] = useState([]);     // chosen catalogue row id per medicine
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");
  const [extra, setExtra] = useState("");
  const reqSeq = useRef(0);

  const ask = async (extraNotes = "") => {
    const mySeq = ++reqSeq.current;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/prescriptions/ai-suggest`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chief_complaint: complaint, patient_id: patientId || null, extra_notes: extraNotes }),
      });
      const json = await res.json().catch(() => ({}));
      if (mySeq !== reqSeq.current) return;
      if (!res.ok || !json.success) throw new Error(json.message || `Request failed (${res.status})`);

      const d = json.data;
      setData(d);
      setMedOn(d.medicines.map(() => true));
      setTestOn(d.tests.map(() => true));
      setMedPick(d.medicines.map((m) => (m.medicine_id === "" ? "" : String(m.medicine_id))));
      setDiagnosis(
        [d.provisional_diagnosis, d.differential_diagnoses.length ? `Differentials: ${d.differential_diagnoses.join(", ")}` : ""]
          .filter(Boolean).join("\n")
      );
      setPlan([d.treatment_plan, ...d.advice.map((a) => `• ${a}`)].filter(Boolean).join("\n"));
    } catch (err) {
      if (mySeq === reqSeq.current) setError(err.message);
    } finally {
      if (mySeq === reqSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (open && complaint) {
      setData(null);
      setExtra("");
      ask("");
    }
    if (!open) reqSeq.current += 1; // ignore a reply that lands after closing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, complaint]);

  const apply = (mode) => {
    if (!data) return;
    const medicines = data.medicines
      .map((m, i) => {
        if (!medOn[i]) return null;
        if (medPick[i] === "") {
          /* doctor chose "as typed": use the AI's generic name, not a catalogue item */
          const num = (String(m.ai.strength || "").match(/\d+(\.\d+)?/) || [""])[0];
          return toPadMedicine({
            ...m,
            medicine_id: "",
            medicine_name: `${m.ai.generic_name} ${m.ai.strength}`.trim(),
            strength: num,
            unit: String(m.ai.strength || "").replace(/^[\d.\s]+/, ""),
            amount: 0,
          }, null);
        }
        const row = (m.ai.alternatives || []).find((a) => String(a.id) === medPick[i]);
        return toPadMedicine(m, row);
      })
      .filter(Boolean);
    const tests = data.tests.filter((_, i) => testOn[i]).map(toPadTest);
    onApply({ chief_complaint: data.chief_complaint, diagnosis, treatment_plan: plan, medicines, tests }, mode);
  };

  const toggle = (setter, i) => setter((cur) => cur.map((v, k) => (k === i ? !v : v)));
  const chosen = medOn.filter(Boolean).length + testOn.filter(Boolean).length;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3 } }}>
      <div className="ai-dlg">
        <div className="ai-head">
          <div>
            <div className="ai-title">✨ AI suggestion</div>
            <div className="ai-sub">for “{complaint}”</div>
          </div>
          <button type="button" className="ai-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ai-disclaimer">
          AI-generated draft. Check every diagnosis, medicine, dose and test — the prescription is your
          clinical decision. Only age, gender and the complaint were sent; no patient name or phone.
        </div>

        {loading && (
          <div className="ai-loading">
            <CircularProgress size={28} sx={{ color: "#3f6f7a" }} />
            <div>Preparing a suggestion… usually 5–20 seconds</div>
          </div>
        )}

        {!loading && error && (
          <div className="ai-error">
            ⚠ {error}
            <button type="button" className="cct-btn" onClick={() => ask(extra)}>Try again</button>
          </div>
        )}

        {!loading && data && (
          <div className="ai-body">
            {data.red_flags.length > 0 && (
              <div className="ai-box ai-red">
                <b>Red flags — refer urgently if present</b>
                <ul>{data.red_flags.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}

            {(!data.enough_information || data.follow_up_questions.length > 0) && (
              <div className="ai-box ai-blue">
                <b>{data.enough_information ? "Worth checking" : "The AI needs more details to suggest treatment safely"}</b>
                <ul>{data.follow_up_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                <div className="ai-ask">
                  <input
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    placeholder="Add findings, e.g. fever 3 days 101°F, no cough, BP 120/80"
                  />
                  <button type="button" className="cct-btn solid" disabled={!extra.trim()} onClick={() => ask(extra)}>
                    Ask again
                  </button>
                </div>
              </div>
            )}

            <div className="ai-grid">
              <label className="ai-field">
                <span>Diagnosis</span>
                <textarea rows={8} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              </label>
              <label className="ai-field">
                <span>Treatment plan &amp; advice</span>
                <textarea rows={8} value={plan} onChange={(e) => setPlan(e.target.value)} />
              </label>
            </div>

            <div className="ai-section">Medicines</div>
            {data.medicines.length === 0 && <div className="ai-empty">No medicines suggested.</div>}
            {data.medicines.map((m, i) => (
              <div key={i} className={`ai-row${medOn[i] ? "" : " off"}`}>
                <Checkbox size="small" checked={!!medOn[i]} onChange={() => toggle(setMedOn, i)}
                  sx={{ "&.Mui-checked": { color: "#3f6f7a" } }} />
                <div className="ai-row-main">
                  <div className="ai-row-top">
                    {m.ai.alternatives.length > 0 ? (
                      <select
                        className="ai-pick"
                        value={medPick[i] ?? ""}
                        onChange={(e) => setMedPick((cur) => cur.map((v, k) => (k === i ? e.target.value : v)))}
                      >
                        {m.ai.alternatives.map((a) => (
                          <option key={a.id} value={String(a.id)}>
                            {a.medicine_name}{a.strength ? ` · ${a.strength}${a.unit || ""}` : ""}
                          </option>
                        ))}
                        <option value="">{m.ai.generic_name} {m.ai.strength} (as typed, not from your list)</option>
                      </select>
                    ) : (
                      <span className="ai-name">{m.medicine_name}</span>
                    )}
                    <span className={`ai-chip ${m.ai.in_catalog && medPick[i] !== "" ? "ok" : "warn"}`}>
                      {m.ai.in_catalog && medPick[i] !== "" ? "In your list" : "Not in your list"}
                    </span>
                  </div>
                  <div className="ai-row-meta">
                    {m.ai.generic_name} {m.ai.strength} · {m.quantity} × {pattern(m.when_to_take)}
                    {m.duration ? ` · ${m.duration.replace("_", " ")}` : ""}
                    {m.description ? ` · ${m.description}` : ""}
                  </div>
                  {m.ai.purpose && <div className="ai-row-purpose">{m.ai.purpose}</div>}
                  {m.ai.caution && <div className="ai-row-caution">⚠ {m.ai.caution}</div>}
                  {strengthMismatch(m, medPick[i]) && (
                    <div className="ai-row-mismatch">⚠ {strengthMismatch(m, medPick[i])}</div>
                  )}
                </div>
              </div>
            ))}

            <div className="ai-section">Tests</div>
            {data.tests.length === 0 && <div className="ai-empty">No tests suggested.</div>}
            {data.tests.map((t, i) => (
              <div key={i} className={`ai-row${testOn[i] ? "" : " off"}`}>
                <Checkbox size="small" checked={!!testOn[i]} onChange={() => toggle(setTestOn, i)}
                  sx={{ "&.Mui-checked": { color: "#3f6f7a" } }} />
                <div className="ai-row-main">
                  <div className="ai-row-top">
                    <span className="ai-name">{t.test_name}</span>
                    <span className={`ai-chip ${t.ai.in_catalog ? "ok" : "warn"}`}>
                      {t.ai.in_catalog ? "In your list" : "Not in your list"}
                    </span>
                  </div>
                  <div className="ai-row-meta">{t.ai.reason}</div>
                </div>
              </div>
            ))}

            {data.cautions.length > 0 && (
              <div className="ai-box ai-amber">
                <b>Check before prescribing</b>
                <ul>{data.cautions.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        <div className="ai-foot">
          <span className="ai-count">{data ? `${chosen} item${chosen === 1 ? "" : "s"} selected` : ""}</span>
          <button type="button" className="cct-btn ghost" onClick={onClose}>Cancel</button>
          {padHasContent ? (
            <>
              <button type="button" className="cct-btn" disabled={!data || loading} onClick={() => apply("merge")}>
                Add to current
              </button>
              <button type="button" className="cct-btn solid" disabled={!data || loading} onClick={() => apply("replace")}>
                Replace current
              </button>
            </>
          ) : (
            <button type="button" className="cct-btn solid" disabled={!data || loading} onClick={() => apply("replace")}>
              Use selected
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}