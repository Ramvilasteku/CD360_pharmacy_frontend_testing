import { useEffect, useMemo, useRef, useState } from "react";
import {
  AUTO_FIELDS,
  DEFAULT_VALUES,
  computeAuto,
  computeTerms,
  fileNameFor,
} from "./content.js";
import { fmtLong, rupee } from "./format.js";
import { useNavigate } from "react-router-dom";
import "./ServiceAgreementGenerator.css";

const STORAGE_KEY = "ridgeveda-service-agreement-draft-v1";

// pdf-lib is large, so the PDF engine is loaded only when this component mounts.
const loadEngine = () => import("./pdfEngine.js");
function readDraft(key) {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(key, values) {
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* storage unavailable – ignore */
  }
}

function Field({ label, hint, children, wide }) {
  return (
    <div className={`rsa-field${wide ? " rsa-wide" : ""}`}>
      <label className="rsa-field">
        <span className="rsa-label">{label}</span>
        {children}
      </label>
      {hint && <span className="rsa-hint">{hint}</span>}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="rsa-section">
      <header>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </header>
      <div className="rsa-grid">{children}</div>
    </section>
  );
}

/**
 * Service Agreement generator: a form for every highlighted field of the sample agreement,
 * a live preview and a "Download PDF" button that produces a replica of the original.
 *
 * Props:
 *  - assetBase: URL folder holding letterhead.pdf, Tinos-*.ttf, stamp.png, signature.png
 *  - initialValues: optional starting values (merged over the sample defaults)
 *  - storageKey: localStorage key used to keep the last draft (pass null to disable)
 */
export default function ServiceAgreementGenerator({
  assetBase = "/agreement-assets",
  initialValues,
  storageKey = STORAGE_KEY,
}) {
  const [values, setValues] = useState(() => ({
    ...DEFAULT_VALUES,
    ...(initialValues || {}),
    ...(readDraft(storageKey) || {}),
  }));
  const [assets, setAssets] = useState(null); // { engine, files }
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState([]);
  const [showPreview, setShowPreview] = useState(true);
  const urlRef = useRef("");

  const auto = useMemo(() => computeAuto(values), [values]);
  const terms = useMemo(() => computeTerms(values), [values]);
  const overrides = values.overrides || {};

  useEffect(() => {
    let alive = true;
    loadEngine()
      .then(async (engine) => ({
        engine,
        files: await engine.loadAgreementAssets(assetBase),
      }))
      .then((a) => alive && setAssets(a))
      .catch(
        (e) =>
          alive &&
          setError(
            `Could not load agreement assets from ${assetBase}: ${e.message}`,
          ),
      );
    return () => {
      alive = false;
    };
  }, [assetBase]);

  useEffect(() => writeDraft(storageKey, values), [values, storageKey]);

  // Live preview (debounced)
  useEffect(() => {
    if (!assets || !showPreview) return undefined;
    const run = { cancelled: false };
    const timer = setTimeout(async () => {
      try {
        const { bytes, missingChars } =
          await assets.engine.generateAgreementPdf(values, assets.files);
        if (run.cancelled) return;
        const url = URL.createObjectURL(
          new Blob([bytes], { type: "application/pdf" }),
        );
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setPreviewUrl(url);
        setMissing(missingChars);
        setError("");
      } catch (e) {
        if (!run.cancelled) setError(`Preview failed: ${e.message}`);
      }
    }, 450);
    return () => {
      run.cancelled = true;
      clearTimeout(timer);
    };
  }, [values, assets, showPreview]);

  useEffect(
    () => () => urlRef.current && URL.revokeObjectURL(urlRef.current),
    [],
  );

  const set = (key) => (e) => {
    const { type, value } = e.target;
    setValues((v) => ({
      ...v,
      [key]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const setOverride = (key, text) => {
    setValues((v) => {
      const next = { ...(v.overrides || {}) };
      if (text === computeAuto(v)[key]) delete next[key];
      else next[key] = text;
      return { ...v, overrides: next };
    });
  };

  const resetOverride = (key) =>
    setValues((v) => {
      const next = { ...(v.overrides || {}) };
      delete next[key];
      return { ...v, overrides: next };
    });

  const resetAll = () => {
    if (
      window.confirm("Reset every field back to the sample agreement values?")
    )
      setValues({ ...DEFAULT_VALUES });
  };

  const clearClient = () => {
    setValues((v) => ({ ...v, clientName: "", clinicName: "", overrides: {} }));
  };

  const download = async () => {
    if (!assets) return;
    setBusy(true);
    try {
      const { bytes, missingChars } = await assets.engine.generateAgreementPdf(
        values,
        assets.files,
      );
      setMissing(missingChars);
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameFor(values);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      setError(`Could not create the PDF: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const autoInput = (f, multiline) => {
    const edited = overrides[f.key] != null;
    const val = edited ? overrides[f.key] : auto[f.key];
    const Tag = multiline ? "textarea" : "input";
    return (
      <div
        key={f.key}
        className={`rsa-field rsa-wide rsa-auto${edited ? " is-edited" : ""}`}
      >
        <div className="rsa-auto-head">
          <span className="rsa-label">{f.label}</span>
          {edited ? (
            <button
              type="button"
              className="rsa-link"
              onClick={() => resetOverride(f.key)}
            >
              Edited · reset to auto
            </button>
          ) : (
            <span className="rsa-badge">Auto</span>
          )}
        </div>
        <Tag
          aria-label={
            f.group === "annexure" ? `Annexure A – ${f.label}` : f.label
          }
          value={val}
          rows={
            multiline
              ? Math.min(6, Math.max(2, Math.ceil(String(val).length / 70)))
              : undefined
          }
          onChange={(e) => setOverride(f.key, e.target.value)}
        />
      </div>
    );
  };

  // ---- Annexure A rows
  const hidden = new Set(values.annexHidden || []);
  const customRows = values.annexCustomRows || [];
  const shortsOn = (Number(values.youtubeShorts) || 0) > 0;

  const toggleRow = (key) =>
    setValues((v) => {
      const h = new Set(v.annexHidden || []);
      if (h.has(key)) h.delete(key);
      else h.add(key);
      return { ...v, annexHidden: [...h] };
    });

  const updateCustom = (fn) =>
    setValues((v) => ({
      ...v,
      annexCustomRows: fn([...(v.annexCustomRows || [])]),
    }));
  const addCustom = () =>
    updateCustom((rows) => [
      ...rows,
      {
        id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        label: "",
        value: "",
      },
    ]);
  const editCustom = (id, field, value) =>
    updateCustom((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  const removeCustom = (id) =>
    updateCustom((rows) => rows.filter((r) => r.id !== id));
  const moveCustom = (i, d) =>
    updateCustom((rows) => {
      const j = i + d;
      if (j < 0 || j >= rows.length) return rows;
      [rows[i], rows[j]] = [rows[j], rows[i]];
      return rows;
    });

  const annexStdRow = (f) => {
    if (f.key === "annex_shorts" && !shortsOn) return null;
    const off = hidden.has(f.key);
    return (
      <div key={f.key} className={`rsa-annex-row${off ? " is-off" : ""}`}>
        <label
          className="rsa-check"
          title={off ? "Include this row" : "Leave this row out"}
        >
          <input
            type="checkbox"
            checked={!off}
            onChange={() => toggleRow(f.key)}
            aria-label={`Include ${f.label}`}
          />
        </label>
        {off ? (
          <div className="rsa-field rsa-wide rsa-auto">
            <span className="rsa-label">{f.label}</span>
            <span className="rsa-hint">Not included in Annexure A</span>
          </div>
        ) : (
          autoInput(f, false)
        )}
      </div>
    );
  };

  const nOverrides = Object.keys(overrides).length;
const navigate = useNavigate();

  return (
    <>

      <div className={`rsa-root${showPreview ? "" : " no-preview"}`}>
        <div className="rsa-form">
          <div className="rsa-titlebar">
            <div>
              <h2>Service Agreement</h2>
              <p>
                Fill in the details — the PDF is generated on the Ridgeveda
                letterhead, identical to the standard agreement.
              </p>
            </div>
          </div>

          <div className="rsa-summary" aria-live="polite">
            <div>
              <span>Term</span>
              <strong>{terms.total} months</strong>
              <em>
                {fmtLong(terms.start)} – {fmtLong(terms.end)}
              </em>
            </div>
            <div>
              <span>Total fee</span>
              <strong>{rupee(terms.subtotal)}</strong>
              <em>
                {terms.paid} paid × {rupee(terms.fee)}
              </em>
            </div>
          </div>

          <Section title="Client">
            <Field label="Client name">
              <input
                value={values.clientName}
                onChange={set("clientName")}
                placeholder="e.g. Shilpa Reddy"
              />
            </Field>
            <Field label="Clinic / business name">
              <input
                value={values.clinicName}
                onChange={set("clinicName")}
                placeholder="e.g. Sanctuary Dental"
              />
            </Field>
            <Field
              label="Specialties"
              wide
              hint="Shown in the Engagement Summary and Annexure A"
            >
              <input value={values.specialties} onChange={set("specialties")} />
            </Field>
          </Section>

          <Section
            title="Plan & term"
            subtitle="Term dates, monthly periods and month-end dates are calculated automatically."
          >
            <Field label="Plan name">
              <input
                value={values.planName}
                onChange={set("planName")}
                placeholder="Growth"
              />
            </Field>
            <Field label="Agreement date">
              <input
                type="date"
                value={values.agreementDate}
                onChange={set("agreementDate")}
              />
            </Field>
            <Field label="Effective (start) date">
              <input
                type="date"
                value={values.startDate}
                onChange={set("startDate")}
              />
            </Field>
            <Field label="Paid months">
              <input
                type="number"
                min="1"
                max="36"
                value={values.paidMonths}
                onChange={set("paidMonths")}
              />
            </Field>
            <Field label="Complimentary months">
              <input
                type="number"
                min="0"
                max="12"
                value={values.freeMonths}
                onChange={set("freeMonths")}
              />
            </Field>
          </Section>

          <Section title="Fees">
            <Field label="Monthly fee (₹)">
              <input
                type="number"
                min="0"
                step="500"
                value={values.monthlyFee}
                onChange={set("monthlyFee")}
              />
            </Field>
            <Field label="Payment due on or before">
              <input
                type="date"
                value={values.paymentDate}
                onChange={set("paymentDate")}
              />
            </Field>
          </Section>

          <Section
            title="Monthly deliverables"
            subtitle="Used in clauses 2.2–2.4 and Annexure A."
          >
            <Field label="Static / carousel posts">
              <input
                type="number"
                min="0"
                value={values.staticPosts}
                onChange={set("staticPosts")}
              />
            </Field>
            <Field label="High-quality reels">
              <input
                type="number"
                min="0"
                value={values.reels}
                onChange={set("reels")}
              />
            </Field>
            <Field label="Blogs">
              <input
                type="number"
                min="0"
                value={values.blogs}
                onChange={set("blogs")}
              />
            </Field>
            <Field
              label="YouTube Shorts"
              hint="0 = not offered (left out of the agreement)"
            >
              <input
                type="number"
                min="0"
                value={values.youtubeShorts ?? 0}
                onChange={set("youtubeShorts")}
              />
            </Field>
            <Field label="UGC influencer collaborations (Term)">
              <input
                type="number"
                min="0"
                value={values.ugcCollabs}
                onChange={set("ugcCollabs")}
              />
            </Field>
            <Field label="Meta awareness campaigns">
              <input
                type="number"
                min="0"
                value={values.metaCampaigns}
                onChange={set("metaCampaigns")}
              />
            </Field>
          </Section>

          <Section title="Signatures">
            <Field label="Service Provider signing date">
              <input
                type="date"
                value={values.providerSignDate}
                onChange={set("providerSignDate")}
              />
            </Field>
          </Section>

          <details className="rsa-section rsa-details">
            <summary>
              <h3>Generated wording</h3>
              <p>
                Sentences built from the fields above. Edit any of them by hand
                if a deal needs different wording.
              </p>
            </summary>
            <div className="rsa-grid">
              {AUTO_FIELDS.filter((f) => f.group === "clauses").map((f) =>
                autoInput(f, true),
              )}
            </div>
          </details>

          <details className="rsa-section rsa-details">
            <summary>
              <h3>Annexure A – deliverables table</h3>
              <p>
                Untick a row to leave it out, edit any value, or add your own
                rows at the end.
              </p>
            </summary>
            <div className="rsa-annex">
              {AUTO_FIELDS.filter((f) => f.group === "annexure").map(
                annexStdRow,
              )}
            </div>
            <div className="rsa-custom">
              <div className="rsa-custom-head">
                <span className="rsa-label">Additional rows</span>
                <span className="rsa-hint">
                  {customRows.length
                    ? "Printed after the standard rows, in this order"
                    : "None yet"}
                </span>
              </div>
              {customRows.map((r, i) => (
                <div key={r.id} className="rsa-custom-row">
                  <input
                    aria-label={`Additional row ${i + 1} – deliverable`}
                    placeholder="Deliverable (left column)"
                    value={r.label}
                    onChange={(e) => editCustom(r.id, "label", e.target.value)}
                  />
                  <input
                    aria-label={`Additional row ${i + 1} – details`}
                    placeholder="Details (right column)"
                    value={r.value}
                    onChange={(e) => editCustom(r.id, "value", e.target.value)}
                  />
                  <div className="rsa-row-tools">
                    <button
                      type="button"
                      className="rsa-icon"
                      onClick={() => moveCustom(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rsa-icon"
                      onClick={() => moveCustom(i, 1)}
                      disabled={i === customRows.length - 1}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="rsa-icon rsa-danger"
                      onClick={() => removeCustom(r.id)}
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="rsa-ghost rsa-add"
                onClick={addCustom}
              >
                + Add row
              </button>
            </div>
          </details>

          <div className="rsa-footer-actions">
            <button type="button" className="rsa-ghost" onClick={clearClient}>
              New client
            </button>
            <button type="button" className="rsa-ghost" onClick={resetAll}>
              Reset to sample
            </button>
            {nOverrides > 0 && (
              <span className="rsa-note">
                {nOverrides} hand-edited {nOverrides === 1 ? "line" : "lines"}
              </span>
            )}
          </div>
        </div>

        <aside className="rsa-preview">
          <div className="rsa-preview-bar">
            <button
              type="button"
              className="rsa-ghost"
              onClick={() => navigate("/")}
            >
              Back to home
            </button>

            <button
              type="button"
              className="rsa-ghost"
              onClick={() => setShowPreview((s) => !s)}
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
            <button
              type="button"
              className="rsa-primary"
              onClick={download}
              disabled={!assets || busy}
            >
              {busy ? "Preparing…" : "Download PDF"}
            </button>
          </div>
          {error && <div className="rsa-alert">{error}</div>}
          {missing.length > 0 && (
            <div className="rsa-alert rsa-warn">
              These characters are not available in the agreement font and were
              printed as “?”: {missing.join(" ")}
            </div>
          )}
          {showPreview && (
            <div className="rsa-frame">
              {previewUrl ? (
                <iframe
                  title="Agreement preview"
                  src={`${previewUrl}#view=FitH`}
                />
              ) : (
                <div className="rsa-loading">
                  {assets ? "Building preview…" : "Loading letterhead…"}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
