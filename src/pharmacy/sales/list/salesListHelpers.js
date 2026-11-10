// src/components/pharmacy/sales/list/salesListHelpers.js
// Pure helpers for the sales list. No React, no side effects — easy to unit test.

import { DATE_RANGES } from "./salesListConstants";

/** Format a number as INR currency: ₹1,234.00 */
export const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

/** Outstanding balance for a sale — never negative, rounded to 2 decimals */
export const balanceOf = (sale) =>
  Math.max(0, Math.round((Number(sale.grand_total || 0) - Number(sale.paid_amount || 0)) * 100) / 100);

/**
 * Local-time YYYY-MM-DD (toISOString() is UTC and would shift the date
 * in IST before 5:30 am — bugs on same-day filters).
 */
export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Preset date range → { from, to } strings. */
export function rangeToDates(range) {
  const today = new Date();
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };
  switch (range) {
    case "today":
      return { from: ymd(today), to: ymd(today) };
    case "yesterday":
      return { from: ymd(daysAgo(1)), to: ymd(daysAgo(1)) };
    case "7d":
      return { from: ymd(daysAgo(6)), to: ymd(today) };
    case "30d":
      return { from: ymd(daysAgo(29)), to: ymd(today) };
    case "month":
      return {
        from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: ymd(today),
      };
    case "lastMonth":
      return {
        from: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: ymd(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    default:
      return { from: "", to: "" };
  }
}

/**
 * Accepts:
 *   - "2026-10-10"
 *   - "2026-10-10 14:05:00" (MySQL — Safari can't parse the space, must convert to ISO)
 *   - ISO strings
 *   - Date instances
 * Returns a Date or null.
 */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(/^\d{4}-\d{2}-\d{2} /.test(s) ? s.replace(" ", "T") : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Pretty-format a sale date — returns { day: "Today"|"Yesterday"|"24 Oct, 2026", time: "2:15 PM" } */
export function formatSaleDate(value) {
  const d = parseDate(value);
  if (!d) return { day: "—", time: "" };
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const day =
    d.toDateString() === now.toDateString() ? "Today"
      : d.toDateString() === yesterday.toDateString() ? "Yesterday"
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const hasTime = d.getHours() || d.getMinutes() || d.getSeconds();
  return {
    day,
    time: hasTime
      ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
      : "",
  };
}

/** Short date like "24 Oct" — used in filter chips. */
export const shortDate = (s) =>
  parseDate(s)?.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) ?? "";

/** Human-readable label for the current date range (handles presets AND custom). */
export function rangeLabel(range, from, to) {
  if (range !== "custom") {
    return DATE_RANGES.find((r) => r.value === range)?.label ?? "";
  }
  if (from && to) {
    return from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;
  }
  if (from) return `From ${shortDate(from)}`;
  if (to) return `Until ${shortDate(to)}`;
  return "Custom range";
}
