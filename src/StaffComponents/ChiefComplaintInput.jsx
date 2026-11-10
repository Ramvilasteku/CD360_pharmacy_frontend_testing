import React, { useEffect, useRef, useState } from "react";
import { complaintTemplateApi } from "./complaintTemplateApi";

/* ═══════════════════════════════════════════════════════════════════
   ChiefComplaintInput
   Autocomplete box that suggests chief complaints the doctor has
   already written an Rx for. Picking one (or pressing Enter / leaving
   the box) calls onCommit(text) so the parent can load the saved Rx.

   Props
     value, onChange(text)    controlled text
     onCommit(text)           complaint confirmed → parent looks up template
     doctorId                 whose templates rank first
     canDelete                show "forget" on the doctor's own templates
     placeholder
═══════════════════════════════════════════════════════════════════ */

function Highlight({ text, query }) {
  const q = (query || "").trim().toLowerCase();
  const idx = q ? text.toLowerCase().indexOf(q) : -1;
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function ChiefComplaintInput({
  value,
  onChange,
  onCommit,
  doctorId,
  canDelete = false,
  placeholder = "Chief complaint (e.g. Fever, Toothache)…",
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState("");
  const seq = useRef(0);

  /* debounced search while the list is open */
  useEffect(() => {
    if (!open) return undefined;
    const mySeq = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      complaintTemplateApi
        .search(value || "", doctorId)
        .then((rows) => {
          if (mySeq !== seq.current) return;
          setItems(rows);
          setActive(-1);
          setError("");
        })
        .catch((err) => {
          if (mySeq !== seq.current) return;
          setItems([]);
          setError(err.message);
        })
        .finally(() => {
          if (mySeq === seq.current) setLoading(false);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [value, open, doctorId]);

  const commit = (text) => {
    setOpen(false);
    setConfirmId(null);
    if (text && text.trim()) onCommit?.(text.trim());
  };

  const pick = (item) => {
    onChange(item.chief_complaint);
    commit(item.chief_complaint);
  };

  const removeItem = async (item) => {
    if (confirmId !== item.id) {
      setConfirmId(item.id);
      return;
    }
    try {
      await complaintTemplateApi.remove(item.id);
      setItems((cur) => cur.filter((x) => x.id !== item.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmId(null);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && items[active]) pick(items[active]);
      else commit(value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showEmptyHint = open && !loading && !error && !items.length && (value || "").trim();

  return (
    <div className="cct-wrap">
      <input
        className="cct-input"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => commit(value)}
        onKeyDown={onKeyDown}
      />

      {open && (items.length > 0 || loading || showEmptyHint || error) && (
        <ul className="cct-list" role="listbox">
          {loading && !items.length && <li className="cct-note">Searching saved prescriptions…</li>}

          {error && <li className="cct-note cct-error">⚠ {error}</li>}

          {showEmptyHint && (
            <li className="cct-note">
              No saved Rx for “{value.trim()}” yet — it will be remembered when you save this
              prescription.
            </li>
          )}

          {items.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === active}
              className={`cct-item${i === active ? " active" : ""}`}
              onMouseDown={(e) => e.preventDefault()} /* keep focus so blur doesn't fire first */
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(item)}
            >
              <div className="cct-item-main">
                <span className="cct-item-name">
                  <Highlight text={item.chief_complaint} query={value} />
                </span>
                {!item.is_own && item.doctor_name && (
                  <span className="cct-badge">by {item.doctor_name}</span>
                )}
                {canDelete && item.is_own && (
                  <button
                    type="button"
                    className={`cct-del${confirmId === item.id ? " confirm" : ""}`}
                    title="Forget this saved Rx"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(item);
                    }}
                  >
                    {confirmId === item.id ? "Forget?" : "✕"}
                  </button>
                )}
              </div>
              <div className="cct-item-meta">
                {item.diagnosis ? `Dx: ${item.diagnosis} · ` : ""}
                {item.medicine_count} med{item.medicine_count === 1 ? "" : "s"} ·{" "}
                {item.test_count} test{item.test_count === 1 ? "" : "s"} · used {item.use_count}×
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
