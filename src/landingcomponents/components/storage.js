/* ======================================================================
   Google Sheets (Apps Script Web App) client
   - POST uses text/plain so the browser skips the CORS preflight
     (Apps Script can't answer OPTIONS).
   - One URL, routed by `action`.
   ====================================================================== */
import { SHEETS_URL, SHEETS_KEY, LB_CACHE_MS } from '../config';

export const sheetsConfigured = () => Boolean(SHEETS_URL);

async function post(action, data) {
  if (!SHEETS_URL) throw new Error('Google Sheets URL is not configured (REACT_APP_GQ_SHEETS_URL)');
  const res = await fetch(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, key: SHEETS_KEY, data }),
  });
  if (!res.ok) throw new Error('Sheets request failed (' + res.status + ')');
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Sheets rejected the request');
  return json;
}

async function get(params) {
  if (!SHEETS_URL) throw new Error('Google Sheets URL is not configured');
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(SHEETS_URL + (SHEETS_URL.includes('?') ? '&' : '?') + qs);
  if (!res.ok) throw new Error('Sheets request failed (' + res.status + ')');
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Sheets rejected the request');
  return json;
}

/* 1) Quiz + booking → tab "GrowthCalls" */
export function submitBooking(payload) {
  return post('booking', payload);
}

/* 2) Spin reward → tab "SpinRewards"
   Returns { ok, duplicate, offer } — duplicate=true means this mobile already
   has an active code; `offer` is the existing one. */
export function submitSpin(payload) {
  return post('spin', payload);
}

/* check before spinning: { ok, exists, offer } */
export function checkSpin(mobile) {
  return post('spin_check', { mobile });
}

/* 3) Leaderboard → tab "Leaderboard" */
let lbCache = { at: 0, rows: null };

export async function addLeaderboardRun(entry) {
  const json = await post('leaderboard_add', entry);
  lbCache = { at: 0, rows: null };
  return json;
}

export async function getLeaderboardTop(limit = 10) {
  if (lbCache.rows && Date.now() - lbCache.at < LB_CACHE_MS) return lbCache.rows;
  const json = await get({ action: 'leaderboard_top', limit });
  lbCache = { at: Date.now(), rows: json.leaderboard || [] };
  return lbCache.rows;
}
