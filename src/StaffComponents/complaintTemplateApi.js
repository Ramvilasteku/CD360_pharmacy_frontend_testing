/* ═══════════════════════════════════════════════════════════════════
   Chief-complaint template API (dynamic Rx pad)

   Uses the same REACT_APP_SITE_URL your PrescriptionPreview.jsx uses,
   so there is nothing extra to configure. The fallback below only
   applies if that env var is missing.
═══════════════════════════════════════════════════════════════════ */

let BASE = "http://localhost:5000";
try {
  // CRA inlines these at build time; the try/catch keeps other bundlers safe.
  BASE = process.env.REACT_APP_SITE_URL || process.env.REACT_APP_API_BASE || BASE;
} catch (_) {
  /* process is not defined outside CRA — keep the fallback */
}

const ROOT = `${BASE.replace(/\/+$/, "")}/api/prescriptions/complaint-templates`;

async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    /* empty / non-JSON body */
  }

  if (!res.ok || (data && data.success === false)) {
    throw new Error((data && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

const qs = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

export const complaintTemplateApi = {
  /** Autocomplete list → [{ id, chief_complaint, diagnosis, medicine_count, test_count, use_count, is_own, doctor_name }] */
  search: (q, doctorId) =>
    request(`${ROOT}?${qs({ q, doctor_id: doctorId })}`).then((d) => (d && d.data) || []),

  /** Full saved Rx for one complaint, or null when nothing is saved yet */
  lookup: (complaint, doctorId) =>
    request(`${ROOT}/lookup?${qs({ complaint, doctor_id: doctorId })}`).then(
      (d) => (d && d.data) || null
    ),

  /** Forget the saved Rx for a complaint */
  remove: (templateId) => request(`${ROOT}/${templateId}`, { method: "DELETE" }),
};

/** Same normalisation the server uses, so "Fever " and "fever" match */
export const complaintKey = (text) =>
  String(text ?? "").trim().replace(/\s+/g, " ").toLowerCase();
