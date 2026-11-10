/* Safe localStorage helpers — never throw (private mode, blocked storage). */
export function readJSON(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
}

export function readText(key) {
  try { return window.localStorage.getItem(key); } catch (e) { return null; }
}

export function writeText(key, value) {
  try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

export function removeKeys(...keys) {
  keys.forEach((k) => { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } });
}

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const clean = (s) => String(s == null ? '' : s).replace(/[<>&]/g, '');

/* smooth scroll to a section id without touching the router */
export function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
}
