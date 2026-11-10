/* ======================================================================
   Google Sheets (Apps Script Web App) client
   - POST uses text/plain so the browser skips the CORS preflight
     (Apps Script can't answer OPTIONS).
   - One URL, routed by `action`.
   ====================================================================== */
import { SHEETS_URL, SHEETS_KEY, LB_CACHE_MS } from '../config';

export const sheetsConfigured = () => Boolean(SHEETS_URL);

/* Reads the reply and turns every failure into a readable message. */
async function readReply(res) {
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) {
    console.error('[GrowthQuest] Sheets replied with non-JSON (HTTP ' + res.status + '):', text.slice(0, 400));
    if (res.status === 404) throw new Error('Script not found (404) — redeploy as Web app, access "Anyone", use the /exec URL');
    if (/accounts\.google\.com|ServiceLogin|sign in/i.test(text)) throw new Error('Script needs login — set "Who has access" to Anyone and redeploy');
    throw new Error('Script error (HTTP ' + res.status + ') — see console');
  }
  if (!json.ok) {
    console.error('[GrowthQuest] Sheets error:', json.error);
    if (json.error === 'unauthorized') throw new Error('Key mismatch — SECRET in Code.gs ≠ REACT_APP_GQ_SHEETS_KEY');
    throw new Error(json.error || 'Sheets rejected the request');
  }
  return json;
}

async function send(url, options) {
  try {
    return await fetch(url, options);
  } catch (e) {
    console.error('[GrowthQuest] Network/CORS error calling', url, e);
    throw new Error('Could not reach Google Script — check the /exec URL and that access is "Anyone"');
  }
}

async function post(action, data) {
  if (!SHEETS_URL) throw new Error('Sheets URL missing — set REACT_APP_GQ_SHEETS_URL and restart npm start');
  const res = await send(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, key: SHEETS_KEY, data }),
  });
  return readReply(res);
}

async function get(params) {
  if (!SHEETS_URL) throw new Error('Sheets URL missing — set REACT_APP_GQ_SHEETS_URL and restart npm start');
  const qs = new URLSearchParams(params).toString();
  const res = await send(SHEETS_URL + (SHEETS_URL.includes('?') ? '&' : '?') + qs);
  return readReply(res);
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