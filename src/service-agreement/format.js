// Date, number and currency helpers used to build the agreement text.
// All dates are handled as UTC "YYYY-MM-DD" strings so time zones never shift a day.

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function parseDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function toISO(dt) {
  return dt.toISOString().slice(0, 10);
}

const pad2 = (n) => String(n).padStart(2, '0');

/** Adds calendar months, clamping to the last day of the target month (31 Jan + 1 = 28/29 Feb). */
export function addMonths(dt, n) {
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + n;
  const target = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(dt.getUTCDate(), lastDay));
  return target;
}

export function addDays(dt, n) {
  return new Date(dt.getTime() + n * 86400000);
}

/** "03 November 2026" */
export function fmtLong(dt) {
  if (!dt) return '';
  return `${pad2(dt.getUTCDate())} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

/** "03 November" */
export function fmtDayMonth(dt) {
  return `${pad2(dt.getUTCDate())} ${MONTHS[dt.getUTCMonth()]}`;
}

/** "26/09/2026" */
export function fmtSlash(dt) {
  if (!dt) return '';
  return `${pad2(dt.getUTCDate())}/${pad2(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;
}

/** "03 November–02 December 2026" (same year) or "03 December 2026–02 January 2027". */
export function fmtRange(a, b) {
  if (a.getUTCFullYear() === b.getUTCFullYear()) return `${fmtDayMonth(a)}–${fmtLong(b)}`;
  return `${fmtLong(a)}–${fmtLong(b)}`;
}

export function ordinalSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  return { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
}

/** Monthly service periods starting from `start`: [{start, end}, ...] */
export function monthPeriods(start, count, offset = 0) {
  const out = [];
  for (let i = offset; i < offset + count; i++) {
    out.push({ start: addMonths(start, i), end: addDays(addMonths(start, i + 1), -1) });
  }
  return out;
}

// ---------- numbers ----------

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function below1000(n) {
  const parts = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));
  } else if (n > 0 || parts.length === 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

/** Lower-case English words using the Indian system (lakh, crore). 150000 -> "one lakh fifty thousand" */
export function numberWords(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n < 1000) return below1000(n);
  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${numberWords(crore)} crore`);
  if (lakh) parts.push(`${below1000(lakh)} lakh`);
  if (thousand) parts.push(`${below1000(thousand)} thousand`);
  if (n) parts.push(below1000(n));
  return parts.join(' ');
}

const titleCase = (s) => s.replace(/(^|[\s-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

/** "Rupees Thirty Thousand Only" */
export function rupeesInWords(n) {
  return `Rupees ${titleCase(numberWords(n))} Only`;
}

const ORD_SPECIAL = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };

/** 4 -> "fourth", 21 -> "twenty-first" */
export function ordinalWord(n) {
  const w = numberWords(n);
  return w.replace(/([a-z]+)$/, (last) => {
    if (ORD_SPECIAL[last]) return ORD_SPECIAL[last];
    if (last.endsWith('y')) return `${last.slice(0, -1)}ieth`;
    return `${last}th`;
  });
}

/** "six (6)" */
export function wordAndDigit(n) {
  return `${numberWords(n)} (${n})`;
}

/** Indian digit grouping: 150000 -> "1,50,000" */
export function groupIN(n) {
  const neg = Number(n) < 0;
  const [int, dec] = String(Math.abs(Number(n) || 0)).split('.');
  let out = int;
  if (int.length > 3) {
    const last3 = int.slice(-3);
    const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    out = `${rest},${last3}`;
  }
  return (neg ? '-' : '') + out + (dec ? `.${dec}` : '');
}

/** "₹30,000" */
export const rupee = (n) => `₹${groupIN(n)}`;

export const plural = (n, one, many) => (Number(n) === 1 ? one : many);
