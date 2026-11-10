// src/pharmacy/shared/pharmacyUnits.js
//
// The strip / tablet rules on screen — the same as the server's utils/pharmacyUnits.js.
//
//   • Stock is counted in TABLETS (a capsule / sachet = one). Shown as "12 strips + 5 tablets".
//   • Prices are PER STRIP (as on the invoice and the printed MRP). One tablet costs
//     strip price ÷ tablets per strip; a full strip always costs exactly the strip price.
//   • units_per_pack = tablets in one strip. 1 = sold whole only (syrup, tube, injection).

export const money = (v) => Math.round((Number(v) || 0) * 100) / 100;
export const rate4 = (v) => Math.round((Number(v) || 0) * 10000) / 10000;

const MULTI_RE = /^\s*\d+\s*[x×*]\s*(\d+)\s*(?:'?s|n|nos|pcs|tabs?|tablets?|caps?|capsules?)?\s*$/i;
const SINGLE_RE = /^\s*(\d+)\s*(?:'?s|n|nos|pcs|tabs?|tablets?|caps?|capsules?)?\s*$/i;
const OF_RE = /\b(?:strip|pack|blister)\s+of\s+(\d+)\b/i;

/** "10 tablets" / "15" / "10'S" / "1x10" → 10 / 15 / 10 / 10. null when it isn't a count. */
export function parsePackSize(text) {
  const s = String(text == null ? "" : text).trim();
  if (!s) return null;
  const m = MULTI_RE.exec(s) || SINGLE_RE.exec(s) || OF_RE.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : null;
}

/** Tablets per strip for a medicine or batch row: its own units_per_pack → pack_size → 1. */
export function unitsPerPack(row) {
  if (!row) return 1;
  const own = Number(row.units_per_pack);
  if (Number.isInteger(own) && own >= 1) return own;
  return parsePackSize(row.pack_size) || 1;
}

export const plural = (word, n) => {
  const w = String(word || "").toLowerCase();
  if (Number(n) === 1) return w;
  return /(s|x|ch|sh)$/.test(w) ? `${w}es` : `${w}s`;
};

const LOOSE_WORD = /^(tablets?|tabs?|capsules?|caps?|pcs|pieces?|nos|units?)$/i;
/** The pack word: "strip", or the item's own unit ("bottle", "tube"). */
export const packWord = (row, upp) => {
  const u = String((row && row.unit) || "").trim();
  if (u && !LOOSE_WORD.test(u)) return u.toLowerCase();
  return (upp || unitsPerPack(row)) > 1 ? "strip" : "pack";
};

export const splitTablets = (tablets, upp) => {
  const t = Math.max(0, Math.floor(Number(tablets) || 0));
  const u = Math.max(1, Math.floor(Number(upp) || 1));
  return { strips: Math.floor(t / u), loose: t % u };
};

/** "12 strips + 5 tablets", "5 tablets", "3 bottles" */
export function describeStock(tablets, upp, word = "strip") {
  const u = Math.max(1, Number(upp) || 1);
  const { strips, loose } = splitTablets(tablets, u);
  if (u === 1) return `${strips} ${plural(word === "strip" ? "pack" : word, strips)}`;
  if (strips && loose) return `${strips} ${plural(word, strips)} + ${loose} ${plural("tablet", loose)}`;
  if (loose) return `${loose} ${plural("tablet", loose)}`;
  return `${strips} ${plural(word, strips)}`;
}

/** "2 strips", "7 tablets", "1 bottle" for a sale line */
export function describeSaleQty(saleUnit, qty, word = "strip") {
  if (saleUnit === "tablet") return `${qty} ${plural("tablet", qty)}`;
  if (saleUnit === "pack") return `${qty} ${plural(word === "strip" ? "pack" : word, qty)}`;
  return `${qty} ${plural(word, qty)}`;
}

/** price of ONE unit sold, from the per-strip price */
export const unitPriceFor = (saleUnit, stripPrice, upp) =>
  saleUnit === "tablet" ? rate4((Number(stripPrice) || 0) / Math.max(1, upp)) : rate4(stripPrice);

/** tablets leaving stock */
export const tabletsFor = (saleUnit, qty, upp) => (saleUnit === "tablet" ? Number(qty) || 0 : (Number(qty) || 0) * Math.max(1, upp));

/** ₹1,234.50 */
export const inr = (n) =>
  money(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹13.3333 → "13.33" for display; keeps 4 decimals only when they matter */
export const rateText = (n) => {
  const v = rate4(n);
  return Number.isInteger(v * 100) ? inr(v) : v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
};