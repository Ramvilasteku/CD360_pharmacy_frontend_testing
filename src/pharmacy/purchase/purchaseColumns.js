// src/pharmacy/purchase/purchaseColumns.js
//
// The purchase-line columns — ONE definition for Receive stock, an opened purchase order and
// Generate PO, so a heading means the same thing everywhere.
//
//   Item Name · Loc. · Batch · Exp. · Pack · MRP · PTR · D.Price · Qty · Free · Sch. Amt ·
//   Taxable · GST% · Amount
//
// Headings are short; hovering one says what it means (HeadTip). Every money figure is per
// STRIP (as on the supplier's bill); Pack is the tablets in one strip; Qty and Free are strips.
//
//   D.Price   = PTR less the discount %            (₹137.32 (5%))
//   Taxable   = Qty × D.Price − Sch. Amt
//   Amount    = Taxable + GST

import React from "react";
import { Box, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

export const COLUMNS = {
  item: { short: "Item Name", tip: "The medicine — its manufacturer and pack are shown underneath" },
  loc: { short: "Loc.", tip: "Storage location — the shelf / rack where this batch is kept" },
  batch: { short: "Batch", tip: "Batch number printed on the pack" },
  exp: { short: "Exp.", tip: "Expiry month / year (MM/YY)" },
  pack: { short: "Pack", tip: "Units in one pack — tablets in a strip, 1 for a bottle / tube / vial", right: true },
  mrp: { short: "MRP", tip: "Maximum retail price, per pack (strip, bottle…)", right: true },
  ptr: { short: "PTR", tip: "Price to retailer — your purchase rate per pack, before discount", right: true },
  dprice: { short: "D.Price", tip: "Rate per pack after the discount — the discount % is in brackets", right: true },
  qty: { short: "Qty", tip: "Packs bought and paid for (strips, bottles…)", right: true },
  free: { short: "Free", tip: "Free packs from the supplier — they cost nothing", right: true },
  sch: { short: "Sch. Amt", tip: "Scheme discount in ₹ for this line, on top of the discount %", right: true },
  taxable: { short: "Taxable", tip: "Qty × D.Price − Sch. Amt — the value GST is charged on", right: true },
  gst: { short: "GST%", tip: "GST rate on this line", right: true },
  amount: { short: "Amount", tip: "Taxable + GST — what this line costs", right: true },
  onOrder: { short: "On order", tip: "Strips already on open orders for this medicine", right: true },
  stock: { short: "In stock", tip: "What is on the shelf in this branch now — whole packs, with the loose tablets" },
  orderAmount: { short: "Amount", tip: "Packs × PTR. Discount, scheme and GST come on the supplier's bill and are entered when you receive", right: true },
  orderQty: { short: "Qty", tip: "How many packs to order (strips, bottles…)" },
  sold: { short: "Sold", tip: "What sold in the period you picked, and how much a day on average", right: true },
};

/** A short column heading; hovering (or focusing) it shows what it means. */
export function HeadTip({ col, children, sx }) {
  const c = COLUMNS[col] || {};
  return (
    <Tooltip title={c.tip || ""} arrow placement="top" enterDelay={150}>
      <Box
        tabIndex={0}
        aria-label={c.tip ? `${c.short}: ${c.tip}` : undefined}
        sx={{
          minWidth: 0,
          textAlign: c.right ? "right" : "left",
          cursor: "help",
          outline: "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          "& > span": {
            borderBottom: "1px dotted",
            borderColor: "text.disabled",
          },
          "&:focus-visible > span": { color: "primary.main" },
          ...sx,
        }}
      >
        <span>{children || c.short}</span>
      </Box>
    </Tooltip>
  );
}

/* ---------------- numbers ---------------- */
const num = (v) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const inr2 = (n) =>
  r2(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "5" / "12.5" — a percentage without trailing zeros */
export const pctText = (p) => {
  const v = Math.round((Number(p) || 0) * 100) / 100;
  return Number.isInteger(v) ? String(v) : String(v);
};

/**
 * The money on one purchase line, from what is stored (or typed):
 *   quantity (strips), purchase_price (PTR / strip), discount_percent | trade discount ₹,
 *   scheme_amount ₹, gst_percentage.
 * discount_amount as stored is the TOTAL discount (trade + scheme).
 * Returns { gross, trade, scheme, pct, dprice, taxable, tax, total }.
 */
export function lineMoney({ quantity, purchase_price, discount_percent, trade_discount, discount_amount, scheme_amount, gst_percentage }) {
  const qty = num(quantity) || 0;
  const ptr = num(purchase_price) || 0;
  const gross = r2(qty * ptr);
  const scheme = num(scheme_amount) || 0;
  let trade;
  if (num(discount_percent) !== null) trade = r2((gross * Number(discount_percent)) / 100);
  else if (num(trade_discount) !== null) trade = Number(trade_discount);
  else trade = Math.max(0, (num(discount_amount) || 0) - scheme);
  const pct = gross > 0 ? Math.round((trade / gross) * 10000) / 100 : num(discount_percent) || 0;
  const dprice = qty > 0 ? r2((gross - trade) / qty) : r2(ptr * (1 - pct / 100));
  const taxable = r2(gross - trade - scheme);
  const gst = num(gst_percentage) || 0;
  const tax = r2((taxable * gst) / 100);
  return { gross, trade: r2(trade), scheme: r2(scheme), pct, dprice, taxable, tax, total: r2(taxable + tax) };
}

/* ---------------- expiry as MM/YY ---------------- */
/** "2028-01-31" → "01/28"; anything else is returned as it is */
export const toMMYY = (v) => {
  const m = String(v || "").match(/^(\d{4})-(\d{2})-\d{2}/);
  return m ? `${m[2]}/${m[1].slice(2)}` : String(v || "");
};

/** "01/28", "1/2028", "01-28" → "2028-01-31" (the last day of that month); null when it isn't one */
export const fromMMYY = (text) => {
  const m = String(text || "").trim().match(/^(\d{1,2})\s*[/.-]\s*(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return null;
  const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
};

/** "Strip of 10" / "1 bottle" — the pack, for the line under the medicine name */
export const packText = (upp, word = "strip", label) => {
  const n = Number(upp) || 0;
  if (label && String(label).trim()) {
    const l = String(label).trim();
    return n > 1 && !/\d/.test(l) ? `${l} (${n})` : l;
  }
  if (n > 1) return `${word.charAt(0).toUpperCase()}${word.slice(1)} of ${n}`;
  return `1 ${word === "strip" ? "pack" : word}`;
};

/** The small grey line under a name: "GSK · Strip of 10" */
export function SubLine({ children, sx }) {
  return (
    <Typography sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.35, ...sx }} noWrap component="div">
      {children}
    </Typography>
  );
}

/* ---------------- what a pack is sold as ---------------- */
/** The pack words — the same list as the Medicines screen (pharmacy_medicines.unit). */
export const PACK_UNITS = ["strip", "bottle", "tube", "vial", "sachet", "box", "pack", "jar"];
const cap = (w) => (w ? `${w.charAt(0).toUpperCase()}${w.slice(1)}` : w);

/**
 * The pack word as plain text with a small ▾ — click to change what the medicine is sold as.
 * Reads as part of the sentence it sits in ("GSK | Strip ▾ of 10").
 */
export function PackWordPicker({ value, onChange, ariaLabel = "Sold as", capitalize = true, disabled }) {
  const [anchor, setAnchor] = React.useState(null);
  const word = String(value || "strip").toLowerCase();
  const options = PACK_UNITS.includes(word) ? PACK_UNITS : [word, ...PACK_UNITS];
  return (
    <>
      <Box
        component="button"
        type="button"
        disabled={disabled}
        aria-label={`${ariaLabel}: ${word}. Change`}
        aria-haspopup="menu"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          p: 0,
          m: 0,
          border: 0,
          bgcolor: "transparent",
          font: "inherit",
          color: "primary.main",
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: 0.5,
          verticalAlign: "baseline",
          "&:hover": { textDecoration: "underline" },
          "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 1 },
          "&:disabled": { color: "inherit", cursor: "default", textDecoration: "none" },
        }}
      >
        {capitalize ? cap(word) : word}
        {!disabled && <ArrowDropDownIcon sx={{ fontSize: 16, ml: -0.25, mr: -0.5 }} />}
      </Box>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <Typography sx={{ px: 2, pt: 0.5, pb: 0.75, fontSize: 11.5, fontWeight: 700, color: "text.secondary" }}>
          SOLD AS
        </Typography>
        {options.map((w) => (
          <MenuItem
            key={w}
            dense
            sx={{ minWidth: 140 }}
            selected={w === word}
            onClick={() => {
              setAnchor(null);
              if (w !== word) onChange(w);
            }}
          >
            {cap(w)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** One word for several lines: their pack word when they all share it, else "pack". */
export const commonPackWord = (words) => {
  const set = new Set((words || []).filter(Boolean));
  return set.size === 1 ? [...set][0] : "pack";
};