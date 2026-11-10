// src/pages/pharmacy/ReceivePurchaseOrder.js
//
// Receive stock — the supplier's invoice, checked line by line, then committed.
//
// Layout: the page fills its container and never scrolls as a whole.
//   Step 1 (delivery): two panels side by side, no scrolling on desktop —
//     left  = what you type or pick (delivery from, invoice details, options)
//     right = getting the lines in (drop zone, template, fill from order, add a line)
//   Step 2 (lines): context strip, the line list (the only scrolling region), and a
//     commit bar pinned at the bottom. Each line is one row with the bill's columns; when the
//     space beside the sidebar is too narrow the columns wrap under the name — never sideways.
//
// If your app has a fixed top bar, set --receive-offset on a wrapper (or change
// SHELL_HEIGHT below) so the screen stops at the right place:
//   <div style={{ "--receive-offset": "64px" }}><ReceivePurchaseOrder /></div>
//
// Backend: routes/pharmacy/pharmacyReceivePurchaseOrder.js (v1.3)
//   GET  /pending            POs waiting to be received
//   GET  /po/:id             a PO and its ordered lines
//   GET  /suppliers          active suppliers (direct receipt)
//   GET  /medicine-lookup    catalog search, to resolve a line by hand
//   GET  /template[/:id]     CSV template, pre-filled for a PO
//   POST /import             upload the invoice  → preview (writes nothing)
//   POST /preview            re-check edited lines → preview (writes nothing)
//   POST /confirm            receive for real (one transaction)
//
// Paying the supplier is part of receiving. The confirm dialog has a Payment
// section (Not paid yet / Part paid / Fully paid + method + reference). The stock is
// received FIRST, then the payment is posted in a second call, so a payment problem
// can never undo or block a delivery — if it fails, the "Stock received" screen says
// so and offers Retry. A delivery that was left unpaid can be paid from the same screen.
//   POST /api/pharmacy/post/payment   { purchase_id, amount, payment_method, … }
//        updates the PO's paid_amount / due_amount / payment_status
//
// Opened from the Purchase Orders page. Two ways in:
//   • the "Receive stock" button  → starts with "Direct delivery" (an uploaded supplier invoice)
//   • a row's "Receive" shortcut  → starts "Against an order" with that order already picked
//     (the Purchase Orders page leaves { id } in sessionStorage under RECEIVE_PRESELECT_KEY)
//
// UX notes:
//   • The Receive button always says why it is (or isn't) available.
//   • Text fields open a text keyboard, number fields a number pad; 16px on phones (no iOS zoom).
//   • Each line shows the catalog medicine it matched, and a coloured status badge.
//   • "All / To sort out" filter, Undo on remove, and a warning before leaving with unsaved lines.
//   • Ctrl/⌘ + Enter opens the receive dialog when everything checks out.
//
// Needs the pharmacy.purchase.view / .receive permissions. Recording a payment also
// needs pharmacy.payments.create or pharmacy.purchase.edit; without either the
// Payment section simply isn't shown.
//
// Strips and tablets (src/pharmacy/shared/pharmacyUnits.js): a line is bought in whole STRIPS
// (+ free strips), priced per strip. Each line says how many tablets one strip holds ("Tablets /
// strip" — from the order, the medicine, or the file's pack column "1x15"), and shows live
// "= 110 tablets into stock". Every value on a line can be changed before receiving: batch,
// expiry, mfg date, tablets / strip, strips, free, rate, MRP, selling price (≤ MRP; blank = MRP),
// discount, GST, HSN, manufacturer and the storage location. What the receipt will change in
// the catalog (a new pack size, prices, the shelf) is shown on the line before you confirm.
//
// Branch: an order with a deliver-to branch is received there. Otherwise staff receive into their
// own branch, and the admin of a multi-branch pharmacy picks one (shared BranchPicker) first.
//
// Leaving with unreceived lines asks first — the Back arrow, the sidebar, anything that
// navigates (useLeaveGuard.js).

import { ColorRoot } from "../../theme/appColors";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";

import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";

import useAccess, { AccessDenied } from "../../hooks/useAccess";
import useLeaveGuard from "./useLeaveGuard";
import BranchPicker, { usePharmacyBranch } from "../shared/BranchPicker";
import { plural as unitPlural } from "../shared/pharmacyUnits";
import { HeadTip, PackWordPicker, SubLine, commonPackWord, fromMMYY, inr2, lineMoney, packText, pctText, toMMYY } from "./purchaseColumns";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const API_BASE = process.env.REACT_APP_SITE_URL || "";
const RECEIVE_API = `${API_BASE}/api/pharmacy/purchase-receive`;
const PAYMENT_API = `${API_BASE}/api/pharmacy/post/payment`;
const ORDERS_API = `${API_BASE}/api/pharmacy/purchase-orders`;
// JWT lives in an HttpOnly cookie → send cookies. Swap for your shared axios instance if you have one.
const http = axios.create({ withCredentials: true });

// The screen fills the viewport minus whatever chrome sits above it.
const SHELL_HEIGHT = "calc(80vh - var(--receive-offset, 0px))";
const RECHECK_DELAY = 900; // ms of no typing before the server re-checks
// The supplier's invoice is imported from CSV or Excel only (the server accepts the same three)
const IMPORT_TYPES = [
  { label: "CSV", ext: ".csv" },
  { label: "Excel", ext: ".xlsx" },
  { label: "Excel 97–2003", ext: ".xls" },
];
const IMPORT_RE = /\.(csv|xlsx|xls)$/i;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (n) =>
  money(n).toLocaleString("en-IN", { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const compact = (n) => Number(n || 0).toLocaleString("en-IN");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const isIso = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const nums = { fontVariantNumeric: "tabular-nums" };
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/* ---------- paying the supplier ---------- */
const PAY_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];
const PAY_STATUS = {
  paid: "Paid in full",
  partial: "Part paid",
  unpaid: "Not paid",
};

// What is still owed, from a totals object — null when it can't be worked out.
const dueFrom = (t) => {
  if (!t) return null;
  if (
    t.due_amount !== undefined &&
    t.due_amount !== null &&
    Number.isFinite(Number(t.due_amount))
  ) {
    return money(Math.max(0, Number(t.due_amount)));
  }
  if (t.grand_total !== undefined && t.grand_total !== null) {
    return money(Math.max(0, num(t.grand_total) - num(t.paid_amount)));
  }
  return null;
};
const payAmountOf = (mode, text, due) =>
  mode === "full" ? money(due) : money(num(text));
// A message when the payment can't be sent as entered, otherwise null.
const checkPayment = (mode, text, due) => {
  if (mode === "unpaid") return null;
  const amt = payAmountOf(mode, text, due);
  if (!(amt > 0)) return "Enter the amount paid";
  if (amt > due + 0.005) return `More than the balance due (₹${inr(due)})`;
  return null;
};

// Set by the Purchase Orders page ("Receive" on a row) to open this screen with that
// order already picked. Same key as RECEIVE_PRESELECT_KEY in PurchaseOrders.js.
const PRESELECT_KEY = "caredesk:receive-po";
const readPreselect = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(PRESELECT_KEY) || "null");
    return v && v.id ? v : null;
  } catch {
    return null;
  }
};
const clearPreselect = () => {
  try {
    sessionStorage.removeItem(PRESELECT_KEY);
  } catch {
    /* nothing to clear */
  }
};

async function apiMessage(err, fallback) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const j = JSON.parse(await data.text());
      return j.message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || err?.message || fallback;
}

/* The row fields the server accepts. Everything else (our local key, the
   verdict) is stripped before the body goes out. */
const BODY_FIELDS = [
  "row",
  "item_id",
  "medicine_id",
  "medicine_code",
  "barcode",
  "name",
  "strength",
  "dosage_form",
  "create_new",
  "new_medicine",
  "batch_number",
  "manufacturing_date",
  "expiry_date",
  "units_per_pack",
  "quantity",
  "free_quantity",
  "purchase_price",
  "mrp",
  "selling_price",
  "discount_amount",
  "discount_percent",
  "scheme_amount",
  "gst_percentage",
  "hsn_code",
  "pack_size",
  "manufacturer",
  "storage_location",
  "unit",
  "file_amount",
];
const toBodyRow = (r) => {
  const out = {};
  for (const f of BODY_FIELDS) {
    const v = r[f];
    if (v !== undefined && v !== null && v !== "") out[f] = v;
  }
  return out;
};

let keySeq = 0;
const withKey = (r) => ({ ...r, key: `r${++keySeq}` });

const blankRow = () =>
  withKey({
    name: "",
    batch_number: "",
    expiry_date: "",
    quantity: "",
    purchase_price: "",
    mrp: "",
  });

// A PO line turned into a receipt row: quantity and rate come from the order,
// batch and expiry stay blank because those are read off the physical pack.
/* A PO line's discount, as the receive screen types it: discount_percent when the order kept it,
   otherwise the trade part of discount_amount (the stored total less the scheme). */
const poDiscount = (it) => {
  const scheme = Number(it.scheme_amount) > 0 ? Number(it.scheme_amount) : 0;
  const out = scheme ? { scheme_amount: scheme } : {};
  if (it.discount_percent != null && it.discount_percent !== "" && Number(it.discount_percent) > 0)
    return { ...out, discount_percent: Number(it.discount_percent) };
  const trade = Math.round(((Number(it.discount_amount) || 0) - scheme) * 100) / 100;
  return trade > 0 ? { ...out, discount_amount: trade } : out;
};
const rowFromPoItem = (it) =>
  withKey({
    item_id: it.id,
    name: it.medicine,
    batch_number: "",
    expiry_date: "",
    quantity: it.quantity,
    free_quantity: it.free_quantity || 0,
    purchase_price: it.purchase_price,
    mrp: Number(it.mrp) || "",
    selling_price: Number(it.selling_price) || "",
    hsn_code: it.hsn_code || it.hsn || "",
    // the order's discount % and scheme ₹ (Sch. Amt) come along, so the line is priced as ordered
    ...poDiscount(it),
    // tablets per strip on the order — only a hint for the screen until the server checks the line
    _upp: Number(it.units_per_pack) || undefined,
  });

/* The verdict rail: one glance down the left edge says what is left to do. */
const RAIL = {
  fix: { tone: "error", label: "Fix this" },
  choose: { tone: "warning", label: "Needs a choice" },
  clear: { tone: "success", label: "Ready" },
  idle: { tone: "grey", label: "Not checked" },
};
function railOf(verdict, stale) {
  if (stale || !verdict) return "idle";
  if (verdict.problems?.length) return "fix";
  if (verdict.action === "ambiguous" || verdict.action === "unresolved")
    return "choose";
  return "clear";
}
const railColor = (theme, kind) =>
  kind === "idle" ? theme.palette.divider : theme.palette[RAIL[kind].tone].main;

/* ---------- strips → tablets, on screen (the server does the same sum) ---------- */
const wholeNum = (v) => {
  const t = String(v ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : null;
};
/** tablets per strip for a line: what's typed → what the server worked out → the medicine's (from the
    order or the catalog pick) → an older check. null while nothing says. */
const lineUpp = (row, verdict, stale = false) => {
  const typed = wholeNum(row.units_per_pack);
  if (typed && typed >= 1) return typed;
  const checked = Number(verdict?.values?.units_per_pack) || null;
  if (checked && !stale) return checked;
  return Number(row._upp) || checked || null;
};
/** what one pack on a line is sold as: picked on the line → what the server worked out → strip */
const lineWord = (row, verdict) =>
  (row.unit && String(row.unit).trim().toLowerCase()) || verdict?.pack_word || "strip";
/** "= 110 tablets into stock" / "= 11 bottles into stock" — nothing until there is a quantity and
    the tablets per strip are known */
const intoStockText = (row, verdict, stale = false) => {
  const q = wholeNum(row.quantity);
  const f = wholeNum(row.free_quantity) ?? 0;
  if (q == null || q + f <= 0) return null;
  const upp = lineUpp(row, verdict, stale);
  if (!upp) return null;
  const word = lineWord(row, verdict);
  if (upp <= 1) {
    const w = word === "strip" ? "pack" : word;
    return `= ${q + f} ${unitPlural(w, q + f)} into stock`;
  }
  const t = (q + f) * upp;
  return `= ${t.toLocaleString("en-IN")} ${unitPlural("tablet", t)} into stock`;
};
/* The totals in words, for lines that may be strips, bottles, tubes…:
     "21 strips (+1 free)" · "= 380 tablets"   all strips
     "12 bottles"                              all one-per-pack (nothing to convert)
     "33 packs (+1 free)" · "= 392 units"      a mix */
function packTotals(s, words, upps) {
  if (!s) return null;
  const word = commonPackWord(words);
  const n = Number(s.total_strips) || 0;
  const free = Number(s.total_free_strips) || 0;
  const multi = upps.some((u) => u > 1);
  const single = upps.some((u) => u <= 1);
  const t = Number(s.total_tablets_in) || 0;
  return {
    label: `${word.charAt(0).toUpperCase()}${word.slice(1)}s`.replace(/xs$/, "xes"),
    count: `${compact(n)}${free ? ` + ${compact(free)} free` : ""}`,
    packs: `${compact(n)} ${unitPlural(word, n)}${free ? ` (+${compact(free)} free)` : ""}`,
    into: !multi ? null : `${compact(t)} ${unitPlural(single ? "unit" : "tablet", t)}`,
  };
}

const CHANGE_LABEL = {
  quantity: "packs",
  free_quantity: "free packs",
  purchase_price: "rate / pack",
  units_per_pack: "tablets / strip",
};



/* ------------------------------------------------------------------ */
/* Fitting the window                                                  */
/* ------------------------------------------------------------------ */
/**
 * Measures where this screen actually begins and sizes it to the rest of the
 * window, so it never runs past the bottom and makes the BROWSER scroll.
 * --receive-offset still applies as the first-paint fallback.
 */
function useFitsWindow(fallback) {
  const ref = useRef(null);
  const lastTop = useRef(-1);
  const [height, setHeight] = useState(fallback);

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = Math.max(0, Math.round(el.getBoundingClientRect().top));
      // Only react to a real move. Without this the height we just set could
      // feed back into the next measurement and oscillate.
      if (Math.abs(top - lastTop.current) < 1) return;
      lastTop.current = top;
      setHeight(`calc(100dvh - ${top}px)`);
    };

    measure();
    window.addEventListener("resize", measure);
    // A header that grows (a toolbar wrapping on a phone) moves us down.
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    if (ro) ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
    };
  }, []);

  return [ref, height];
}

/* ------------------------------------------------------------------ */
/* Field primitives                                                    */
/* ------------------------------------------------------------------ */
/* Values stay TEXT on purpose. The server reports a figure it cannot read
   ("1O", "15O") and blocks on it, so the bad text has to stay on screen to be
   corrected — a number input would quietly swallow it.
   Right-aligned fields are figures → number pad on phones; everything else
   (names, batch numbers, references) gets the normal keyboard. */
/* A form field: a bordered box. */
const boxedField = (error) => ({
  bgcolor: "background.paper",
  border: 1,
  borderColor: error ? "error.main" : "divider",
  borderRadius: 1.5,
  transition: "border-color .15s, box-shadow .15s",
  "&:hover": { borderColor: error ? "error.main" : "text.disabled" },
  "&:focus": {
    borderColor: error ? "error.main" : "primary.main",
    boxShadow: (t) => `0 0 0 3px ${alpha(t.palette[error ? "error" : "primary"].main, 0.16)}`,
  },
});
/* A cell on an invoice line: plain text, like the bill — no box. Hovering shows it can be typed in,
   typing underlines it, and a value the server can't accept is red and underlined red. */
const plainCell = (error) => ({
  bgcolor: error ? (t) => alpha(t.palette.error.main, 0.06) : "transparent",
  color: error ? "error.main" : "text.primary",
  border: 0,
  borderRadius: 1,
  boxShadow: (t) => (error ? `inset 0 -1.5px 0 ${t.palette.error.main}` : "none"),
  transition: "background-color .12s, box-shadow .12s",
  "&:hover": { bgcolor: (t) => alpha(t.palette.text.primary, error ? 0.04 : 0.05) },
  "&:focus": {
    bgcolor: "background.paper",
    boxShadow: (t) => `inset 0 -2px 0 ${t.palette[error ? "error" : "primary"].main}`,
  },
});

let fieldSeq = 0;
function Field({
  label,
  value,
  onChange,
  align = "left",
  width,
  error,
  placeholder,
  type,
  sx,
  labelDisplay = "block",
  inputMode,
  ariaLabel,
  max,
  min,
  onBlur,
  dense = false, // a cell on an invoice line: plain (no box), smaller text (16px stays on phones — no iOS zoom)
}) {
  const idRef = useRef(null);
  if (!idRef.current) idRef.current = `rcv-field-${++fieldSeq}`;
  const id = idRef.current;
  const asDate = type === "date" && (isIso(value) || !value);
  const keyboard =
    type === "date"
      ? undefined
      : inputMode || (align === "right" ? "decimal" : "text");

  return (
    <Box sx={{ width: width || "auto", minWidth: 0, ...sx }}>
      {label && (
        <Typography
          component="label"
          htmlFor={id}
          sx={{
            display: labelDisplay,
            fontSize: 11,
            fontWeight: 600,
            color: "text.secondary",
            mb: 0.4,
          }}
        >
          {label}
        </Typography>
      )}
      <Box
        component="input"
        id={id}
        aria-label={ariaLabel || label || undefined}
        aria-invalid={error ? true : undefined}
        type={type === "date" ? (asDate ? "date" : "text") : "text"}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        inputMode={keyboard}
        autoComplete="off"
        {...(asDate && max ? { max } : {})}
        {...(asDate && min ? { min } : {})}
        sx={{
          width: "100%",
          font: "inherit",
          // 16px on phones stops iOS from zooming into the field on focus.
          fontSize: dense ? { xs: 16, md: 13 } : { xs: 16, md: 14 },
          fontWeight: 500,
          ...nums,
          textAlign: align,
          px: dense ? 0.5 : 1,
          py: dense ? { xs: 0.6, md: 0.45 } : { xs: 1, md: 0.85 },
          color: "text.primary",
          outline: "none",
          "&::placeholder": { color: "text.disabled", fontWeight: 400 },
          ...(dense ? plainCell(error) : boxedField(error)),
        }}
      />
    </Box>
  );
}

function Stat({ label, value, strong }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="baseline"
      spacing={2}
    >
      <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: strong ? 15 : 13,
          fontWeight: strong ? 700 : 500,
          ...nums,
        }}
      >
        {value ?? "—"}
      </Typography>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* A numbered section heading on the first step                        */
/* ------------------------------------------------------------------ */
function SectionHead({ n, title, hint, done }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{ mb: 1.25, minWidth: 0 }}
    >
      <Box
        sx={{
          width: 22,
          height: 22,
          flexShrink: 0,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: done ? "success.contrastText" : "text.secondary",
          bgcolor: done ? "success.main" : "action.selected",
          transition: "background-color .2s",
        }}
      >
        {done ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : n}
      </Box>
      <Typography sx={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>
        {title}
      </Typography>
      {hint && (
        <Typography
          sx={{
            fontSize: 12,
            color: "text.secondary",
            ml: "auto !important",
            minWidth: 0,
          }}
          noWrap
        >
          {hint}
        </Typography>
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Payment to the supplier — shared by the confirm and "record" dialogs */
/* ------------------------------------------------------------------ */
function PaymentFields({
  due,
  mode,
  setMode,
  amount,
  setAmount,
  method,
  setMethod,
  reference,
  setReference,
  allowUnpaid = true,
  error,
}) {
  const modes = [
    ...(allowUnpaid ? [{ v: "unpaid", label: "Not paid yet" }] : []),
    { v: "part", label: "Part paid" },
    { v: "full", label: "Fully paid" },
  ];
  return (
    <Stack spacing={1.5}>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        color="primary"
        value={mode}
        onChange={(_, v) => v && setMode(v)}
        aria-label="Payment status"
      >
        {modes.map((m) => (
          <ToggleButton
            key={m.v}
            value={m.v}
            sx={{ textTransform: "none", fontSize: 13, py: 0.75 }}
          >
            {m.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {mode === "unpaid" && (
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
          ₹{inr(due)} stays due on this order. You can record a payment later
          from the Purchase Orders list.
        </Typography>
      )}

      {mode !== "unpaid" && (
        <>
          {mode === "part" ? (
            <Field
              label={`Amount paid ₹ (balance due ₹${inr(due)})`}
              align="right"
              value={amount}
              onChange={setAmount}
              error={!!error}
              placeholder="0.00"
            />
          ) : (
            <Stat label="Amount paid" value={`₹${inr(due)}`} strong />
          )}

          <Box>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 600,
                color: "text.secondary",
                mb: 0.6,
              }}
            >
              Paid by
            </Typography>
            <Box
              role="radiogroup"
              aria-label="Paid by"
              sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}
            >
              {PAY_METHODS.map((m) => (
                <Chip
                  key={m.value}
                  role="radio"
                  aria-checked={method === m.value}
                  label={m.label}
                  clickable
                  icon={
                    method === m.value ? (
                      <CheckRoundedIcon sx={{ fontSize: 16 }} />
                    ) : undefined
                  }
                  color={method === m.value ? "primary" : "default"}
                  variant={method === m.value ? "filled" : "outlined"}
                  onClick={() => setMethod(m.value)}
                  sx={{ height: 32, fontSize: 13 }}
                />
              ))}
            </Box>
          </Box>

          {method !== "cash" && (
            <Field
              label={
                method === "upi"
                  ? "UPI reference (optional)"
                  : "Reference no. (optional)"
              }
              value={reference}
              onChange={setReference}
              placeholder={
                method === "bank_transfer" ? "e.g. NEFT / UTR number" : ""
              }
            />
          )}

          {error && (
            <Typography
              role="alert"
              sx={{ fontSize: 12.5, color: "error.main" }}
            >
              {error}
            </Typography>
          )}
        </>
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* The bill, as the confirm dialog shows it                            */
/* ------------------------------------------------------------------ */
const fmtDay = (iso) => {
  if (!isIso(iso)) return iso || "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/** The money on the checked lines: discounts (trade + scheme), GST by rate, and what the stock sells
    for (selling price — the MRP unless one was typed — × strips incl. free) for the margin. */
function billFigures(verdicts, totals) {
  const lines = (verdicts || []).map((v) => v?.values).filter((v) => v && v.total_amount != null);
  let trade = 0;
  let scheme = 0;
  let sellValue = 0;
  const slabs = new Map();
  for (const v of lines) {
    const s = num(v.scheme_amount);
    scheme += s;
    trade += v.trade_discount != null ? num(v.trade_discount) : Math.max(0, num(v.discount_amount) - s);
    const rate = num(v.gst_percentage);
    const slab = slabs.get(rate) || { rate, taxable: 0, tax: 0 };
    slab.taxable += num(v.taxable);
    slab.tax += num(v.tax_amount);
    slabs.set(rate, slab);
    sellValue += num(v.selling_price || v.mrp) * (num(v.quantity) + num(v.free_quantity));
  }
  const net = num(totals?.grand_total);
  const margin = sellValue > 0 ? money(sellValue - net) : null;
  return {
    trade: money(trade),
    scheme: money(scheme),
    lineDiscount: money(trade + scheme),
    slabs: [...slabs.values()].filter((s) => s.tax > 0 || s.rate > 0).sort((a, b) => a.rate - b.rate),
    margin,
    marginPct: margin != null ? Math.round((margin / sellValue) * 10000) / 100 : null,
  };
}

/* One row of the bill: label on the left, figure (or an input) on the right. */
function BillRow({ label, hint, value, tone, children, info }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minHeight: 34 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>{label}</Typography>
          {info}
        </Stack>
        {hint && (
          <Typography sx={{ fontSize: 11.5, color: "text.disabled", lineHeight: 1.3 }}>{hint}</Typography>
        )}
      </Box>
      {children || (
        <Typography sx={{ fontSize: 15, fontWeight: 600, ...nums, color: tone || "text.primary", whiteSpace: "nowrap" }}>
          {value}
        </Typography>
      )}
    </Stack>
  );
}

/* A ₹ figure typed straight into the bill (bill discount, additional charges). */
function BillInput({ value, onChange, ariaLabel, tone }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.25} sx={{ width: 120, flexShrink: 0 }}>
      <Typography sx={{ fontSize: 15, fontWeight: 600, color: tone || "text.primary" }}>₹</Typography>
      <Field
        dense
        align="right"
        ariaLabel={ariaLabel}
        value={value}
        placeholder="0.00"
        onChange={onChange}
        sx={{
          flex: 1,
          "& input": {
            fontSize: "15px !important",
            fontWeight: 600,
            color: tone || "text.primary",
            boxShadow: (t) => `inset 0 -1px 0 ${t.palette.divider}`,
          },
        }}
      />
    </Stack>
  );
}

function BillSummary({ totals, figures, stale, billDiscount, onBillDiscount, otherCharges, onOtherCharges }) {
  const theme = useTheme();
  const blue = theme.palette.primary.main;
  const orange = theme.palette.warning.dark;
  const rs = (n) => `₹${inr(n)}`;
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
      {/* Net Amount */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1.5, bgcolor: blue, color: theme.palette.primary.contrastText }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>Net Amount</Typography>
        {stale && <CircularProgress size={16} sx={{ color: "inherit", opacity: 0.8 }} />}
        <Typography
          sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 600, ...nums, lineHeight: 1.1, opacity: stale ? 0.6 : 1 }}
          aria-live="polite"
        >
          {totals ? rs(totals.grand_total) : "—"}
        </Typography>
      </Stack>
      {/* margin on this stock, at its selling price */}
      {figures.margin != null && (
        <Stack
          direction="row"
          alignItems="center"
          sx={{ px: 2, py: 0.75, bgcolor: alpha(theme.palette.text.primary, 0.05), fontSize: 13 }}
        >
          <Tooltip title="What this stock sells for (selling price — the MRP unless you set one — on every strip incl. free) less the net amount, as a share of the selling value">
            <Typography sx={{ fontSize: 13, color: "text.secondary", flex: 1, cursor: "help" }}>
              Margin%{" "}
              <Box component="span" sx={{ color: "text.primary", fontWeight: 600, ml: 0.75, ...nums }}>
                {pctText(figures.marginPct)}
              </Box>
            </Typography>
          </Tooltip>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            Margin{" "}
            <Box component="span" sx={{ color: figures.margin < 0 ? "error.main" : "text.primary", fontWeight: 600, ml: 0.75, ...nums }}>
              {rs(figures.margin)}
            </Box>
          </Typography>
        </Stack>
      )}
      <Stack sx={{ px: 2, py: 1 }} divider={<Divider flexItem sx={{ borderStyle: "dashed" }} />}>
        <BillRow label="Gross Amount" hint="Qty × PTR, all lines" value={totals ? rs(totals.subtotal) : "—"} />
        <BillRow
          label="Discount on lines"
          hint={
            figures.scheme > 0
              ? `${rs(figures.trade)} discount % + ${rs(figures.scheme)} scheme`
              : "the discount % on each line"
          }
          value={`− ${rs(figures.lineDiscount)}`}
          tone={figures.lineDiscount > 0 ? orange : "text.secondary"}
        />
        <BillRow label="Bill discount" hint="on the whole bill, after GST">
          <BillInput
            ariaLabel="Bill discount ₹"
            value={billDiscount}
            onChange={onBillDiscount}
            tone={num(billDiscount) > 0 ? orange : undefined}
          />
        </BillRow>
        <BillRow
          label="Total Taxes"
          value={totals ? rs(totals.tax_amount) : "—"}
          info={
            figures.slabs.length > 0 && (
              <Tooltip
                arrow
                title={
                  <Box sx={{ py: 0.25 }}>
                    {figures.slabs.map((s) => (
                      <Box key={s.rate} sx={{ ...nums, whiteSpace: "nowrap" }}>
                        GST {pctText(s.rate)}% on ₹{inr(s.taxable)} = ₹{inr(s.tax)}
                      </Box>
                    ))}
                  </Box>
                }
              >
                <InfoOutlinedIcon sx={{ fontSize: 16, color: "primary.main", cursor: "help" }} aria-label="GST by rate" />
              </Tooltip>
            )
          }
        />
        <BillRow label="Additional Charges" hint="freight, handling…">
          <BillInput ariaLabel="Additional charges ₹" value={otherCharges} onChange={onOtherCharges} />
        </BillRow>
      </Stack>
    </Paper>
  );
}

/* ------------------------------------------------------------------ */
/* One invoice line                                                    */
/* ------------------------------------------------------------------ */
// ONE line per medicine, the columns of the supplier's bill (purchaseColumns.js):
//   Item Name · Loc. · Batch · Exp. · Pack · MRP · PTR · D.Price · Qty · Free · Sch. Amt · Taxable ·
//   GST% · Amount · (more)
// Shared by the line and the headings above the lines so they can never disagree. The list never
// scrolls sideways: when the space left beside the app's sidebar is narrower than RCV_ONE_ROW, each
// line puts the name on top and the columns underneath (with their short headings), wrapping.
const RCV_COLS =
  "minmax(136px, 1fr) 58px 72px 50px 36px 56px 56px 98px 38px 34px 60px 70px 42px 84px 28px";
const RCV_GAP = "4px";
const RCV_ONE_ROW = 990; // px of list width needed for the one-row line (≈ a 1280 screen beside a 260px sidebar)

/* A highlighted note on a line: what the receipt will change besides the stock. */
function LineNote({ tone = "info", icon: Icon, children }) {
  const theme = useTheme();
  const c = theme.palette[tone].main;
  return (
    <Stack
      direction="row"
      spacing={0.9}
      alignItems="flex-start"
      sx={{
        px: 1.1,
        py: 0.7,
        borderRadius: 1.5,
        bgcolor: alpha(c, 0.07),
        border: 1,
        borderColor: alpha(c, 0.25),
      }}
    >
      <Icon sx={{ fontSize: 16, color: `${tone}.main`, mt: "1px", flexShrink: 0 }} />
      <Typography component="div" sx={{ fontSize: 12.5, color: "text.primary", minWidth: 0 }}>
        {children}
      </Typography>
    </Stack>
  );
}

const fmtVal = (field, v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (/price|mrp/.test(field)) return `₹${inr(v)}`;
  if (field === "gst_percentage") return `${v}%`;
  return String(v);
};

/* Expiry typed as MM/YY (as printed on the strip) and sent as the last day of that month. A value
   that isn't a month yet stays as typed, so the server can say what's wrong with it. */
function ExpiryField({ value, onChange, error, ariaLabel }) {
  const [text, setText] = useState(null); // what is being typed (null = show the value)
  const shown = text !== null ? text : toMMYY(value);
  return (
    <Field
      dense
      value={shown}
      placeholder="MM/YY"
      inputMode="numeric"
      ariaLabel={ariaLabel}
      error={error}
      onChange={(t) => {
        setText(t);
        const iso = fromMMYY(t);
        onChange(iso || t);
      }}
      onBlur={() => setText(null)}
    />
  );
}

function Line({
  index,
  row,
  verdict,
  stale,
  open,
  onToggle,
  onField,
  onPatch,
  onRemove,
  onPick,
  onAddAsNew,
  onEditNewMedicine,
  onSearch,
  reduceMotion,
  wide = true, // the whole line fits on one row
}) {
  const theme = useTheme();
  const kind = railOf(verdict, stale);
  const problems = (!stale && verdict?.problems) || [];
  // the batch price change is shown as a note on the line, not repeated in the list
  const warnings = ((!stale && verdict?.warnings) || []).filter((w) => !/prices change to this invoice/.test(w));
  const candidates = (!stale && verdict?.candidates) || [];
  const similar = (!stale && verdict?.similar) || [];
  const catalogChanges = (!stale && verdict?.catalog_changes) || [];
  const batchChanges = (!stale && verdict?.batch_changes) || [];
  const toppingUp = !stale && verdict?.batch_action === "add_to_existing_batch" && !problems.some((p) => /batch|pack size/i.test(p));
  const offer =
    !stale && verdict?.action === "ambiguous" ? verdict.new_medicine : null;
  const tone = kind === "idle" ? null : RAIL[kind].tone;
  const v = verdict?.values || {};
  const word = lineWord(row, verdict);
  const into = intoStockText(row, verdict, stale);
  const has = (f) => row[f] !== undefined && row[f] !== null && String(row[f]).trim() !== "";
  const flag = (re) => problems.some((p) => re.test(p));

  // tablets per strip shows what the line will use; typing makes it the line's own, clearing goes back
  const uppShown = row.units_per_pack !== undefined ? row.units_per_pack : v.units_per_pack ?? row._upp ?? "";
  const uppProps = {
    value: uppShown,
    onChange: (val) => onField("units_per_pack", val),
    onBlur: () => String(row.units_per_pack ?? "x").trim() === "" && onField("units_per_pack", undefined),
    align: "right",
    inputMode: "numeric",
    placeholder: "auto",
    error: flag(/tablets per strip|pack size/i),
  };
  const setDiscount = (field, val) =>
    onPatch(field === "discount_percent" ? { discount_percent: val, discount_amount: undefined } : { discount_amount: val, discount_percent: undefined });

  /* the money on the line — worked out here as you type (the same sums the server does) */
  const m = lineMoney({
    quantity: row.quantity,
    purchase_price: has("purchase_price") ? row.purchase_price : v.purchase_price,
    discount_percent: has("discount_percent") ? row.discount_percent : undefined,
    trade_discount: has("discount_percent") ? undefined : has("discount_amount") ? row.discount_amount : stale ? undefined : v.trade_discount,
    scheme_amount: has("scheme_amount") ? row.scheme_amount : stale ? undefined : v.scheme_amount,
    gst_percentage: has("gst_percentage") ? row.gst_percentage : v.gst_percentage,
  });
  const priced = num(row.quantity) > 0 && (has("purchase_price") || Number(v.purchase_price) > 0);
  const total = priced ? m.total : null;

  const title = row.create_new
    ? [row.new_medicine?.brand_name, row.new_medicine?.strength]
        .filter(Boolean)
        .join(" ") || "New medicine"
    : verdict?.medicine && !stale
      ? verdict.medicine
      : row.name || "—";

  // "GSK | Strip of 10" — the manufacturer and the pack, under the name (nothing else)
  const upp = lineUpp(row, verdict, stale);
  const maker = (has("manufacturer") ? row.manufacturer : v.manufacturer) || row.new_medicine?.manufacturer || "";
  const pack = upp ? packText(upp, word) : "";
  const subText = [maker, pack].filter(Boolean).join(" | ");
  // "Strip ▾ of 10" / "1 Bottle ▾" — the pack word can be changed right here (what it's sold as)
  const picker = (
    <PackWordPicker
      value={word}
      ariaLabel={`Line ${index + 1} sold as`}
      onChange={(w) => onField("unit", w)}
    />
  );
  const packPicker =
    upp && upp > 1 ? (
      <>
        {picker} of {upp}
      </>
    ) : (
      <>1 {picker}</>
    );

  const cellText = { fontSize: 13, ...nums, textAlign: "right", whiteSpace: "nowrap", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" };
  const L = (s) => `Line ${index + 1} ${s}`;

  /* Item Name — the line number doubles as the status badge */
  const itemCell = (
    <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
        <Tooltip title={RAIL[kind].label} placement="top" arrow>
          <Box
            aria-label={`Line ${index + 1}: ${RAIL[kind].label}`}
            sx={{
              width: 20,
              height: 20,
              flexShrink: 0,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10.5,
              fontWeight: 700,
              ...nums,
              color: tone ? `${tone}.main` : "text.disabled",
              bgcolor: tone ? alpha(theme.palette[tone].main, 0.12) : "action.hover",
              cursor: "default",
            }}
          >
            {index + 1}
          </Box>
        </Tooltip>
        {row.create_new ? (
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, minWidth: 0 }} noWrap title={title}>
            {title}
          </Typography>
        ) : (
          <Field
            dense
            value={row.name}
            onChange={(val) => onField("name", val)}
            placeholder="Name on the bill"
            ariaLabel={L("medicine name")}
            sx={{ flex: 1, minWidth: 0, "& input": { fontWeight: 600 } }}
          />
        )}
      </Stack>
      {row.create_new ? (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25, pl: 3.25, minWidth: 0 }}>
          <Chip
            size="small"
            label={row.new_medicine?.dosage_form ? `New · ${row.new_medicine.dosage_form}` : "New medicine"}
            sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
            color="secondary"
            variant="outlined"
          />
          <SubLine>{packPicker}</SubLine>
          <Button
            size="small"
            startIcon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={onEditNewMedicine}
            sx={{ minWidth: 0, px: 0.6, fontSize: 11.5, textTransform: "none" }}
          >
            Edit details
          </Button>
        </Stack>
      ) : (
        <Box sx={{ pl: 3.25, minWidth: 0 }} title={subText}>
          <SubLine>
            {maker ? `${maker} | ` : ""}
            {packPicker}
          </SubLine>
        </Box>
      )}
    </Box>
  );

  /* every other column of the bill, in order — [column, cell] */
  const cells = [
    ["loc", (
      <Field
        dense
        ariaLabel={L("storage location")}
        value={row.storage_location ?? ""}
        placeholder={v.storage_location || "—"}
        onChange={(val) => onField("storage_location", val)}
      />
    )],
    ["batch", (
      <Field
        dense
        ariaLabel={L("batch")}
        value={row.batch_number}
        placeholder="Batch"
        onChange={(val) => onField("batch_number", val)}
        error={flag(/batch/i)}
        inputMode="text"
      />
    )],
    ["exp", (
      <ExpiryField
        ariaLabel={L("expiry (MM/YY)")}
        value={row.expiry_date}
        onChange={(val) => onField("expiry_date", val)}
        error={flag(/expiry/i)}
      />
    )],
    ["pack", <Field dense ariaLabel={L("tablets per strip")} {...uppProps} />],
    ["mrp", (
      <Field
        dense
        ariaLabel={L("MRP per strip")}
        align="right"
        value={row.mrp}
        placeholder={Number(v.mrp) > 0 ? String(v.mrp) : "0.00"}
        onChange={(val) => onField("mrp", val)}
        error={flag(/MRP/)}
      />
    )],
    ["ptr", (
      <Field
        dense
        ariaLabel={L("PTR (rate per strip)")}
        align="right"
        value={row.purchase_price}
        placeholder={Number(v.purchase_price) > 0 ? String(v.purchase_price) : "0.00"}
        onChange={(val) => onField("purchase_price", val)}
        error={flag(/^rate/i)}
      />
    )],
    // D.Price — the rate after the discount, only when there IS a discount (otherwise it is just the
    // PTR again); the % is typed beside it
    ["dprice", (
      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ minWidth: 0, justifyContent: "flex-end" }}>
        {priced && m.pct > 0 && (
          <Typography
            sx={{ ...cellText, fontWeight: 600, color: "info.dark" }}
            title={`₹${inr2(m.dprice)} per strip after ${pctText(m.pct)}% discount`}
          >
            ₹{inr2(m.dprice)}
          </Typography>
        )}
        <Box sx={{ position: "relative", width: 38, flexShrink: 0 }}>
          <Field
            dense
            ariaLabel={L("discount %")}
            align="right"
            value={row.discount_percent ?? ""}
            placeholder={m.pct ? pctText(m.pct) : "0"}
            onChange={(val) => setDiscount("discount_percent", val)}
            error={flag(/discount %/i)}
            sx={{ "& input": { pr: "13px !important" } }}
          />
          <Typography
            aria-hidden
            sx={{ position: "absolute", right: 3, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "text.secondary", pointerEvents: "none" }}
          >
            %
          </Typography>
        </Box>
      </Stack>
    )],
    ["qty", (
      <Field
        dense
        ariaLabel={L("quantity (strips)")}
        align="right"
        inputMode="numeric"
        value={row.quantity}
        placeholder="0"
        onChange={(val) => onField("quantity", val)}
        error={flag(/^quantity/i)}
      />
    )],
    ["free", (
      <Field
        dense
        ariaLabel={L("free strips")}
        align="right"
        inputMode="numeric"
        value={row.free_quantity}
        placeholder="0"
        onChange={(val) => onField("free_quantity", val)}
        error={flag(/free quantity/i)}
      />
    )],
    ["sch", (
      <Field
        dense
        ariaLabel={L("scheme amount ₹")}
        align="right"
        value={row.scheme_amount ?? ""}
        placeholder={!stale && Number(v.scheme_amount) > 0 ? String(v.scheme_amount) : "0"}
        onChange={(val) => onField("scheme_amount", val)}
        error={flag(/scheme amount|discount .* more than/i)}
      />
    )],
    ["taxable", (
      <Typography sx={{ ...cellText, color: priced ? "text.primary" : "text.disabled" }} title={priced ? `₹${inr2(m.taxable)}` : undefined}>
        {priced ? `₹${inr2(m.taxable)}` : "—"}
      </Typography>
    )],
    ["gst", (
      <Field
        dense
        ariaLabel={L("GST %")}
        align="right"
        value={row.gst_percentage ?? ""}
        placeholder={v.gst_percentage != null ? pctText(v.gst_percentage) : "0"}
        onChange={(val) => onField("gst_percentage", val)}
        error={flag(/GST/)}
      />
    )],
    // Amount — and what reaches the shelf
    ["amount", (
      <Box sx={{ minWidth: 0, textAlign: "right" }}>
        <Typography
          sx={{ ...cellText, fontSize: 14, fontWeight: 800, color: total == null ? "text.disabled" : "text.primary" }}
          title={total == null ? undefined : `₹${inr(total)}`}
        >
          {total == null ? (stale ? "…" : "—") : `₹${inr(total)}`}
        </Typography>
        {into && upp > 1 && (
          <Typography
            data-testid="into-stock"
            sx={{ ...cellText, fontSize: 11, fontWeight: 600, color: "success.dark", lineHeight: 1.3 }}
            title={into}
          >
            {into.replace(/ into stock$/, "")}
          </Typography>
        )}
      </Box>
    )],
  ];

  const moreButton = (
    <Tooltip title={open ? "Hide details" : "More: selling price, discount in ₹, mfg date, HSN, manufacturer…"}>
      <IconButton size="small" onClick={onToggle} aria-expanded={open} aria-label={open ? "Hide details" : "Show details"}>
        <ExpandMoreIcon
          fontSize="small"
          sx={{ transform: open ? "rotate(180deg)" : "none", transition: reduceMotion ? "none" : "transform .18s" }}
        />
      </IconButton>
    </Tooltip>
  );

  return (
    <Box
      id={`line-${row.key}`}
      sx={{
        position: "relative",
        borderBottom: 1,
        borderColor: "divider",
        // the status colour down the left edge
        boxShadow: `inset 3px 0 0 ${railColor(theme, kind)}`,
        bgcolor: kind === "fix" ? alpha(theme.palette.error.main, 0.03) : "transparent",
        "&:hover, &:focus-within": {
          bgcolor: kind === "fix" ? alpha(theme.palette.error.main, 0.05) : "action.hover",
        },
      }}
    >
      {wide ? (
        /* the whole line on one row, the bill's columns */
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: RCV_COLS,
            columnGap: RCV_GAP,
            alignItems: "center",
            pl: 1.25,
            pr: 0.5,
            py: 0.6,
            minHeight: 50,
          }}
        >
          {itemCell}
          {cells.map(([col, node]) => (
            <Box key={col} sx={{ minWidth: 0 }}>{node}</Box>
          ))}
          <Box sx={{ textAlign: "right" }}>{moreButton}</Box>
        </Box>
      ) : (
        /* not enough room for one row (a narrow window or a phone): the name on top, the columns
           underneath — each with its short heading — wrapping onto as many rows as they need */
        <Box sx={{ pl: 1.25, pr: 0.5, py: 0.9 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>{itemCell}</Box>
            {moreButton}
          </Stack>
          <Box
            sx={{
              mt: 0.5,
              pl: 3.25,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, 86px)",
              columnGap: 1,
              rowGap: 0.5,
            }}
          >
            {cells.map(([col, node]) => (
              <Box key={col} sx={{ minWidth: 0, ...(col === "dprice" ? { gridColumn: "span 2" } : null) }}>
                <HeadTip col={col} sx={{ fontSize: 10.5, fontWeight: 600, color: "text.secondary", px: 0.5 }} />
                {node}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* what this line changes besides the stock — shown before you receive */}
      {(toppingUp || catalogChanges.length > 0) && (
        <Box sx={{ pl: { xs: 1.75, md: 4.75 }, pr: 1.5, pb: 1.25 }}>
          <Stack spacing={0.6} sx={{ maxWidth: 820 }}>
            {toppingUp && (
              <LineNote tone="info" icon={InventoryOutlinedIcon}>
                Adds to batch <b>{v.batch_number}</b> already on the shelf
                {verdict.batch_stock_text ? ` (${verdict.batch_stock_text})` : ""}.
                {batchChanges.length > 0 && (
                  <>
                    {" "}Its prices change to this invoice&apos;s:{" "}
                    {batchChanges.map((c) => `${c.field === "mrp" ? "MRP" : c.label.toLowerCase()} ₹${inr(c.from)} → ₹${inr(c.to)}`).join(" · ")} per strip.
                  </>
                )}
              </LineNote>
            )}
            {catalogChanges.length > 0 && (
              <LineNote
                tone={catalogChanges.some((c) => c.field === "units_per_pack") ? "warning" : "info"}
                icon={EditOutlinedIcon}
              >
                <b>Catalog update:</b>{" "}
                {catalogChanges
                  .filter((c) => c.field !== "pack_size")
                  .map((c) =>
                    c.note ||
                    (c.from === null || c.from === undefined || c.from === ""
                      ? `${c.label} set to ${fmtVal(c.field, c.to)}`
                      : `${c.label} ${fmtVal(c.field, c.from)} → ${fmtVal(c.field, c.to)}`),
                  )
                  .join(" · ")}
              </LineNote>
            )}
          </Stack>
        </Box>
      )}

      {/* what the server says, and how to resolve it */}
      {(problems.length > 0 || candidates.length > 0 || offer) && (
        <Box sx={{ pl: { xs: 1.75, md: 4.75 }, pr: 1.5, pb: 1.5 }}>
          <Stack spacing={1}>
            {problems.map((p, i) => (
              <Stack
                key={i}
                direction="row"
                spacing={0.75}
                alignItems="flex-start"
              >
                <PriorityHighRoundedIcon
                  sx={{ fontSize: 16, color: "error.main", mt: "1px" }}
                />
                <Typography
                  sx={{ fontSize: 12.5, color: "error.main", fontWeight: 500 }}
                >
                  {p}
                </Typography>
              </Stack>
            ))}
            {(candidates.length > 0 || offer) && (
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "text.secondary",
                    mb: 0.75,
                  }}
                >
                  Which one is it?
                </Typography>
                <Stack
                  direction="row"
                  alignItems="center"
                  sx={{ flexWrap: "wrap", gap: 0.75 }}
                >
                  {candidates.map((c) => (
                    <Button
                      key={c.medicine_id}
                      size="small"
                      variant="outlined"
                      onClick={() => onPick(c.medicine_id)}
                      sx={{ textTransform: "none", fontSize: 12.5, py: 0.35 }}
                    >
                      {c.medicine}
                      {c.dosage_form
                        ? ` · ${String(c.dosage_form).trim()}`
                        : ""}
                    </Button>
                  ))}
                  {offer && (
                    <Button
                      size="small"
                      variant="contained"
                      disableElevation
                      color="secondary"
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      onClick={() => onAddAsNew(offer)}
                      sx={{ textTransform: "none", fontSize: 12.5, py: 0.35 }}
                    >
                      Add as new
                      {offer.dosage_form ? ` (${offer.dosage_form})` : ""}
                    </Button>
                  )}
                  <Button
                    size="small"
                    startIcon={<SearchIcon sx={{ fontSize: 16 }} />}
                    onClick={onSearch}
                    sx={{ textTransform: "none", fontSize: 12.5 }}
                  >
                    Search catalog
                  </Button>
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {/* the rest of the line — the values that don't need a column */}
      <Collapse in={open} timeout={reduceMotion ? 0 : "auto"} unmountOnExit>
        <Box sx={{ pl: { xs: 1.75, md: 4.75 }, pr: 1.5, pb: 2, pt: 0.5 }}>
          <Box
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: {
                xs: "1fr 1fr",
                sm: "repeat(3, minmax(0, 1fr))",
                md: "repeat(6, minmax(0, 1fr))",
              },
              maxWidth: 980,
            }}
          >
            <Field
              label="Selling price / strip"
              align="right"
              value={row.selling_price}
              placeholder={Number(v.mrp) > 0 ? `= MRP ₹${inr(v.mrp)}` : ""}
              onChange={(val) => onField("selling_price", val)}
              error={flag(/selling price/i)}
            />
            <Field
              label="Discount ₹ (instead of %)"
              align="right"
              value={has("discount_percent") ? (stale ? "" : v.trade_discount ?? "") : row.discount_amount ?? ""}
              placeholder="0.00"
              onChange={(val) => setDiscount("discount_amount", val)}
              error={flag(/^discount \d/i)}
            />
            <Field
              label="Mfg date"
              type="date"
              max={today()}
              value={row.manufacturing_date ?? ""}
              onChange={(val) => onField("manufacturing_date", val)}
              error={flag(/manufacturing/i)}
            />
            <Field
              label="HSN"
              inputMode="numeric"
              value={row.hsn_code ?? ""}
              placeholder={v.hsn_code || ""}
              onChange={(val) => onField("hsn_code", val)}
            />
            <Field
              label="Manufacturer"
              value={row.manufacturer ?? ""}
              placeholder={v.manufacturer || ""}
              onChange={(val) => onField("manufacturer", val)}
              sx={{ gridColumn: { md: "span 2" } }}
            />
          </Box>

          <Stack spacing={0.75} sx={{ mt: 1.5 }}>
            {warnings.map((w, i) => (
              <Typography
                key={i}
                sx={{ fontSize: 12.5, color: "text.secondary" }}
              >
                {w}
              </Typography>
            ))}
            {verdict?.changes?.length > 0 && !stale && (
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                Different from the order:{" "}
                {verdict.changes
                  .map(
                    (c) =>
                      `${CHANGE_LABEL[c.field] || c.field.replace(/_/g, " ")} ${c.on_po} → ${c.received}`,
                  )
                  .join(", ")}
              </Typography>
            )}
            {similar.length > 0 &&
              verdict?.action === "new_medicine" &&
              !problems.length && (
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{ flexWrap: "wrap", gap: 0.5 }}
                >
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                    Already in the catalog?
                  </Typography>
                  {similar.map((sm) => (
                    <Button
                      key={sm.medicine_id}
                      size="small"
                      onClick={() => onPick(sm.medicine_id)}
                      sx={{ textTransform: "none", fontSize: 12.5 }}
                    >
                      {sm.medicine}
                    </Button>
                  ))}
                </Stack>
              )}
            <Box>
              <Button
                size="small"
                color="error"
                startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
                onClick={onRemove}
                sx={{ textTransform: "none", fontSize: 12.5, mt: 0.5 }}
              >
                Remove this line
              </Button>
            </Box>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Catalog picker                                                      */
/* ------------------------------------------------------------------ */
function MedicinePicker({ open, onClose, onPick, initialQuery }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [q, setQ] = useState(initialQuery || "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef();

  useEffect(() => {
    if (open) setQ(initialQuery || "");
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await http.get(`${RECEIVE_API}/medicine-lookup`, {
          params: { q: q.trim() },
        });
        setRows(r.data.data || []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q, open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={phone}
    >
      <DialogTitle sx={{ pb: 1 }}>Which medicine is this?</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            mb: 2,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.paper",
            "&:focus-within": { borderColor: "primary.main" },
          }}
        >
          <SearchIcon sx={{ fontSize: 20, color: "text.disabled" }} />
          <Box
            component="input"
            autoFocus
            aria-label="Search the catalog"
            placeholder="Name, item code or barcode"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{
              flex: 1,
              font: "inherit",
              fontSize: 16,
              py: 1.25,
              border: 0,
              outline: "none",
              bgcolor: "transparent",
              color: "text.primary",
            }}
          />
        </Box>
        {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}
        {!loading && !rows.length && (
          <Typography
            sx={{
              fontSize: 13,
              color: "text.secondary",
              py: 3,
              textAlign: "center",
            }}
          >
            Nothing matches that. Try the item code, or add it as a new
            medicine.
          </Typography>
        )}
        <Stack spacing={0.75}>
          {rows.map((m) => (
            <Box
              key={m.medicine_id}
              component="button"
              type="button"
              onClick={() => {
                onPick(m);
                onClose();
              }}
              sx={{
                width: "100%",
                textAlign: "left",
                font: "inherit",
                color: "text.primary",
                bgcolor: "background.paper",
                p: 1.25,
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
                cursor: "pointer",
                "&:hover, &:focus-visible": {
                  bgcolor: "action.hover",
                  borderColor: "primary.main",
                  outline: "none",
                },
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                {m.medicine}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                {[
                  m.dosage_form,
                  Number(m.units_per_pack) > 1
                    ? `${m.pack_word || "strip"} of ${m.units_per_pack}`
                    : m.pack_size,
                  m.medicine_code,
                  m.purchase_price
                    ? `last rate ₹${inr(m.purchase_price)} / ${m.pack_word || "strip"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </Typography>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* New-medicine details                                                */
/* ------------------------------------------------------------------ */
function NewMedicineDialog({ open, onClose, value, onSave }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [nm, setNm] = useState(value || {});
  useEffect(() => setNm(value || {}), [value, open]);
  const set = (k, v) => setNm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={phone}
    >
      <DialogTitle sx={{ pb: 0.5 }}>Medicine to be added</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
          Created when you receive. The dosage form matters — a tablet and an
          injection of the same name are two different medicines.
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          <Field
            label="Brand / medicine name *"
            value={nm.brand_name || ""}
            onChange={(v) => set("brand_name", v)}
          />
          <Field
            label="Strength"
            placeholder="650mg"
            value={nm.strength || ""}
            onChange={(v) => set("strength", v)}
          />
          <Field
            label="Dosage form"
            placeholder="Tablet, Capsule, Injection, Syrup, Cream"
            value={nm.dosage_form || ""}
            onChange={(v) => set("dosage_form", v)}
          />
          <Field
            label="Category id (blank = default)"
            inputMode="numeric"
            value={nm.category_id ?? ""}
            onChange={(v) => set("category_id", v)}
          />
          <Field
            label="Manufacturer"
            value={nm.manufacturer || ""}
            onChange={(v) => set("manufacturer", v)}
          />
          <Field
            label="Pack size"
            value={nm.pack_size || ""}
            onChange={(v) => set("pack_size", v)}
          />
          <Field
            label="HSN code"
            inputMode="numeric"
            value={nm.hsn_code || ""}
            onChange={(v) => set("hsn_code", v)}
          />
          <Field
            label="Item code"
            value={nm.medicine_code || ""}
            onChange={(v) => set("medicine_code", v)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!String(nm.brand_name || "").trim()}
          onClick={() => {
            const clean = { ...nm };
            if (clean.category_id === "" || clean.category_id === null)
              delete clean.category_id;
            else clean.category_id = Number(clean.category_id);
            onSave(clean);
            onClose();
          }}
          sx={{ textTransform: "none" }}
        >
          Save details
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ================================================================== */
/* Screen                                                              */
/* ================================================================== */
function ReceivePurchaseOrderPage() {
  const [shellRef, shellHeight] = useFitsWindow(SHELL_HEIGHT);
  const theme = useTheme();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const phone = useMediaQuery(theme.breakpoints.down("sm"));

  /* where the stock is going */
  const navigate = useNavigate();
  const location = useLocation();
  // Set when the user came from a row's "Receive" on the Purchase Orders page.
  // Read here, cleared once the order has been picked (see the effect below).
  const [preselect] = useState(readPreselect);
  const [step, setStep] = useState(0); // 0 = delivery, 1 = check the lines
  const [mode, setMode] = useState(preselect ? "po" : "direct");
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [po, setPo] = useState(null);
  const [poDetail, setPoDetail] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [supplier, setSupplier] = useState(null);

  /* the invoice */
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [receivedDate, setReceivedDate] = useState(today());
  const [otherCharges, setOtherCharges] = useState("");
  const [billDiscount, setBillDiscount] = useState(""); // ₹ off the whole bill (on top of the line discounts)
  const [notes, setNotes] = useState("");
  const [missingMode, setMissingMode] = useState("remove");
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  /* lines + the server's verdict */
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [openRows, setOpenRows] = useState(() => new Set());
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [issueKeys, setIssueKeys] = useState(() => new Set());
  const lastRemoved = useRef(null);

  /* flags, feedback */
  const [importing, setImporting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadingPo, setLoadingPo] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    severity: "success",
    message: "",
    undo: false,
  });
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [picker, setPicker] = useState(null);
  const [nmEditor, setNmEditor] = useState(null);
  const [denied, setDenied] = useState(null);
  const fileRef = useRef();
  // how wide the line list is (the page beside the app's sidebar) — a line goes on one row only
  // when it fits; it never scrolls sideways
  const listRef = useRef(null);
  const [listW, setListW] = useState(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    setListW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setListW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [step]);
  const wideLines = !listW || listW >= RCV_ONE_ROW;

  /* paying the supplier */
  const { loading: accessLoading, can } = useAccess();
  // template / import / preview / confirm all need this key on the server (pharmacy.purchase.receive)
  const canReceiveStock = can("pharmacy.purchase.receive");
  const canPay =
    can("pharmacy.payments.create") || can("pharmacy.purchase.edit");
  const [payMode, setPayMode] = useState("unpaid"); // unpaid | part | full
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [payLog, setPayLog] = useState([]); // payments saved from this screen, oldest first
  const [payFail, setPayFail] = useState(null); // why the last attempt didn't save
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [receivedPoId, setReceivedPoId] = useState(null);

  const notify = (message, severity = "success", undo = false) =>
    setSnack({ open: true, severity, message, undo });
  const target = mode === "po" ? po : supplier;

  /* where the stock goes: the order's deliver-to branch, else the receiver's (the admin picks) */
  const br = usePharmacyBranch({ allowAll: false });
  const poBranch = mode === "po" && po?.branch ? po.branch : null;
  const needBranch = !poBranch && br.needsChoice;
  const branchSent = !poBranch && br.isAdmin && br.branch ? br.branch : null;
  const ready = !!target && !needBranch; // lines can be brought in

  // A 403 almost always means the permission keys in the DB don't match the ones
  // the route checks — worth saying once, clearly, instead of a toast per call.
  const report = async (e, fallback) => {
    if (e?.response?.status === 403 || e?.response?.status === 401) {
      setDenied(
        await apiMessage(e, "You don't have permission to receive stock"),
      );
      return;
    }
    notify(await apiMessage(e, fallback), "error");
  };

  /* ---------- loads ---------- */
  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const r = await http.get(`${RECEIVE_API}/pending`);
      setPending(r.data.data || []);
    } catch (e) {
      await report(e, "Couldn't load the purchase orders");
    } finally {
      setPendingLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPending();
    http
      .get(`${RECEIVE_API}/suppliers`)
      .then((r) => setSuppliers(r.data.data || []))
      .catch((e) => report(e, "Couldn't load the suppliers"))
      .finally(() => setSuppliersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPending]);

  useEffect(() => {
    if (!po) {
      setPoDetail(null);
      return undefined;
    }
    let alive = true;
    setLoadingPo(true);
    http
      .get(`${RECEIVE_API}/po/${po.id}`)
      .then((r) => {
        if (!alive) return;
        setPoDetail(r.data.data);
        if (r.data.data?.invoice_number)
          setInvoiceNumber((v) => v || r.data.data.invoice_number);
        // the order's own bill discount / charges carry over (still editable before receiving)
        const d = r.data.data || {};
        if (Number(d.discount_amount) > 0) setBillDiscount((v) => v || String(Number(d.discount_amount)));
        if (Number(d.other_charges) > 0) setOtherCharges((v) => v || String(Number(d.other_charges)));
      })
      .catch((e) => alive && report(e, "Couldn't load the purchase order"))
      .finally(() => alive && setLoadingPo(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [po]);

  // Coming from "Receive" on an order: pick it as soon as the list of waiting orders is in.
  useEffect(() => {
    if (!preselect || pendingLoading) return;
    clearPreselect();
    const hit = pending.find((p) => String(p.id) === String(preselect.id));
    if (hit) setPo(hit);
    else
      notify(
        `${preselect.purchase_number || "That order"} isn't waiting to be received`,
        "warning",
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, pendingLoading]);

  // Back to the Purchase Orders screen in whichever layout we're in:
  //   /pharmacy/receive-purchase-order → /pharmacy/purchase-orders
  const toOrders = () => {
    const next = location.pathname.replace(
      /receive-purchase-order\/?$/i,
      "purchase-orders",
    );
    navigate(next === location.pathname ? "/pharmacy/purchase-orders" : next);
  };

  // Unsaved lines on screen → anything that navigates away (the Back arrow, the sidebar, a
  // link) asks first; closing the tab gets the browser's own question (useLeaveGuard).
  const hasWork = rows.length > 0 && !result;
  useLeaveGuard(hasWork, (proceed) => setLeaveOpen({ proceed }));
  const leave = () => toOrders();

  // switching between "Direct delivery" and "Against an order" clears the lines — ask first
  const [switchAsk, setSwitchAsk] = useState(null); // the mode waiting for a yes
  const switchMode = (v) => {
    if (v === mode) return;
    if (rows.length) {
      setSwitchAsk(v);
      return;
    }
    doSwitchMode(v);
  };
  const doSwitchMode = (v) => {
    setSwitchAsk(null);
    setMode(v);
    setPo(null);
    setSupplier(null);
    setRows([]);
    setPreview(null);
    setFileInfo(null);
    setOnlyIssues(false);
  };

  /* ---------- the body the server gets ---------- */
  const buildBody = useCallback(
    () => ({
      ...(mode === "po"
        ? { purchase_id: po?.id }
        : { supplier_id: supplier?.id }),
      ...(branchSent ? { branch: branchSent } : {}),
      invoice_number: invoiceNumber.trim() || null,
      invoice_date: invoiceDate || null,
      received_date: receivedDate,
      discount_amount: num(billDiscount),
      other_charges: num(otherCharges),
      missing_lines: missingMode,
      // the rates on the invoice become the catalog's defaults for next time (always on)
      update_catalog: true,
      ...(allowDuplicate ? { allow_duplicate_invoice: true } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      rows: rows.map(toBodyRow),
    }),
    [
      mode,
      po,
      supplier,
      branchSent,
      invoiceNumber,
      invoiceDate,
      receivedDate,
      otherCharges,
      billDiscount,
      missingMode,
      allowDuplicate,
      notes,
      rows,
    ],
  );

  /* ---------- re-check (writes nothing) ---------- */
  const recheck = useCallback(async () => {
    if (!target || !rows.length) return;
    setChecking(true);
    try {
      const r = await http.post(`${RECEIVE_API}/preview`, buildBody());
      setPreview(r.data.data);
      setDirty(false);
    } catch (e) {
      await report(e, "Couldn't check the lines");
    } finally {
      setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildBody, rows.length, target]);

  // Edits go back to the server a moment after typing stops, so every verdict
  // and total on screen is the server's answer, never ours.
  useEffect(() => {
    if (!dirty || !rows.length || !target) return undefined;
    const t = setTimeout(recheck, RECHECK_DELAY);
    return () => clearTimeout(t);
  }, [dirty, rows.length, target, recheck]);

  /* ---------- row edits ---------- */
  const touch = () => setDirty(true);

  // another branch picked with lines on screen → check them again (batches are matched per branch)
  const lastBranch = useRef(branchSent);
  useEffect(() => {
    if (lastBranch.current === branchSent) return;
    lastBranch.current = branchSent;
    if (rows.length) setDirty(true);
  }, [branchSent, rows.length]);
  const patchRow = (key, patch) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
    touch();
  };
  const setField = (key, field, value) => patchRow(key, { [field]: value });
  const removeRow = (key) => {
    const idx = rows.findIndex((r) => r.key === key);
    if (idx < 0) return;
    lastRemoved.current = { row: rows[idx], index: idx };
    setRows((prev) => prev.filter((r) => r.key !== key));
    touch();
    notify(`Line ${idx + 1} removed`, "info", true);
  };
  const undoRemove = () => {
    const lr = lastRemoved.current;
    if (!lr) return;
    lastRemoved.current = null;
    setRows((prev) => {
      const next = [...prev];
      next.splice(Math.min(lr.index, next.length), 0, lr.row);
      return next;
    });
    setOnlyIssues(false);
    touch();
    setSnack((s) => ({ ...s, open: false }));
  };
  const addRow = () => {
    const r = blankRow();
    setRows((prev) => [...prev, r]);
    setOpenRows((prev) => new Set(prev).add(r.key));
    setOnlyIssues(false);
    touch();
    setStep(1);
  };
  const toggleRow = (key) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const pickMedicine = (key, medicineId, uppHint) =>
    patchRow(key, {
      medicine_id: medicineId,
      create_new: undefined,
      new_medicine: undefined,
      _upp: Number(uppHint) || undefined,
    });
  const takeNewMedicine = (key, newMedicine) =>
    patchRow(key, {
      create_new: true,
      new_medicine: newMedicine,
      medicine_id: undefined,
    });

  /* ---------- import ---------- */
  const doImport = async (file) => {
    if (!file) return;
    if (!IMPORT_RE.test(file.name || "")) {
      notify(`"${file.name}" can't be read — upload a CSV (.csv) or Excel (.xlsx, .xls) file.`, "error");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (!target) {
      notify(
        mode === "po"
          ? "Pick the purchase order first"
          : "Pick the supplier first",
        "warning",
      );
      return;
    }
    if (needBranch) {
      notify("Choose the branch first", "warning");
      return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (mode === "po") fd.append("purchase_id", po.id);
      else fd.append("supplier_id", supplier.id);
      if (branchSent) fd.append("branch", branchSent);
      if (invoiceNumber.trim())
        fd.append("invoice_number", invoiceNumber.trim());
      if (invoiceDate) fd.append("invoice_date", invoiceDate);
      fd.append("received_date", receivedDate);
      fd.append("missing_lines", missingMode);
      fd.append("update_catalog", "true");
      const r = await http.post(`${RECEIVE_API}/import`, fd);
      const data = r.data.data;
      setFileInfo(r.data.file);
      setPreview(data);
      setRows((data.receive_body?.rows || []).map(withKey));
      setOpenRows(new Set());
      setOnlyIssues(false);
      setDirty(false);
      setStep(1);
      const n = r.data.file?.rows_read || 0;
      notify(
        `${n} line${n === 1 ? "" : "s"} read`,
        data.can_receive ? "success" : "info",
      );
    } catch (e) {
      await report(e, "Couldn't read that file");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /* ---------- template ---------- */
  const downloadTemplate = async () => {
    setTemplateBusy(true);
    try {
      const url =
        mode === "po" && po
          ? `${RECEIVE_API}/template/${po.id}`
          : `${RECEIVE_API}/template`;
      const r = await http.get(url, { responseType: "blob" });
      const name =
        mode === "po" && po
          ? `${String(po.purchase_number).replace(/[^A-Za-z0-9_-]/g, "_")}-receive.csv`
          : "receive-template.csv";
      const href = URL.createObjectURL(
        new Blob([r.data], { type: "text/csv" }),
      );
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 60000);
    } catch (e) {
      await report(e, "Couldn't build the template");
    } finally {
      setTemplateBusy(false);
    }
  };

  /* ---------- the PO's own lines, for typing off the packs ---------- */
  const loadPoLines = () => {
    const items = poDetail?.items || [];
    if (!items.length) {
      notify("This purchase order has no lines", "warning");
      return;
    }
    setRows(items.map(rowFromPoItem));
    setFileInfo(null);
    setPreview(null);
    setOpenRows(new Set());
    setOnlyIssues(false);
    touch();
    setStep(1);
    notify(
      `${items.length} ordered line(s) loaded — fill in batch and expiry`,
      "info",
    );
  };

  /* ---------- confirm ---------- */
  // The order this delivery landed on. The receive response may or may not carry its
  // id, so fall back to the order being received, then to a lookup by PO number.
  const resolvePurchaseId = async (data, hint) => {
    const direct = data?.purchase_id ?? data?.purchase?.id ?? hint;
    if (direct) return direct;
    if (!data?.purchase_number) return null;
    const r = await http.get(`${ORDERS_API}/get`, {
      params: { search: data.purchase_number, limit: 20 },
    });
    const hit = (r.data?.data || []).find(
      (o) => o.purchase_number === data.purchase_number,
    );
    return hit?.id ?? null;
  };

  // Post one payment. Never throws: a failure is kept in payFail and shown on the
  // "Stock received" screen, because the stock is already in and must stay in.
  const recordPayment = async ({ data, poId, amount }) => {
    setPaying(true);
    try {
      const id = await resolvePurchaseId(data, poId);
      if (!id) throw new Error("Couldn't find the purchase order to pay");
      const inv = data?.invoice_number || invoiceNumber.trim();
      const r = await http.post(PAYMENT_API, {
        purchase_id: id,
        amount,
        payment_method: payMethod,
        ...(payRef.trim() && payMethod !== "cash"
          ? { transaction_reference: payRef.trim() }
          : {}),
        notes: `Payment against ${data?.purchase_number || `PO #${id}`}${inv ? ` (invoice ${inv})` : ""}`,
      });
      setReceivedPoId(id);
      setPayLog((l) => [...l, r.data.data]);
      setPayFail(null);
      return true;
    } catch (e) {
      setPayFail(await apiMessage(e, "Couldn't record the payment"));
      return false;
    } finally {
      setPaying(false);
    }
  };

  const doConfirm = async () => {
    setConfirmOpen(false);
    setConfirming(true);
    // Work out the payment BEFORE the receive, from what the dialog showed.
    const dueBefore = dueFrom(preview?.totals) ?? 0;
    const payNow = canPay && payMode !== "unpaid" && dueBefore > 0;
    const payNowAmount = payNow
      ? payAmountOf(payMode, payAmount, dueBefore)
      : 0;
    const poHint = mode === "po" ? po?.id : null;
    try {
      const r = await http.post(`${RECEIVE_API}/confirm`, buildBody());
      const data = r.data.data;
      setPayLog([]);
      setPayFail(null);
      setReceivedPoId(
        data?.purchase_id ?? data?.purchase?.id ?? poHint ?? null,
      );
      setResult({ ...data, message: r.data.message });
      loadPending();
      if (payNow && payNowAmount > 0) {
        await recordPayment({ data, poId: poHint, amount: payNowAmount });
      }
    } catch (e) {
      await report(e, "Couldn't receive the stock");
      recheck(); // confirm re-validates, so a refusal means the preview is stale
    } finally {
      setConfirming(false);
    }
  };

  const resetAll = () => {
    setRows([]);
    setPreview(null);
    setFileInfo(null);
    setPo(null);
    setPoDetail(null);
    setSupplier(null);
    setInvoiceNumber("");
    setInvoiceDate("");
    setReceivedDate(today());
    setOtherCharges("");
    setBillDiscount("");
    setNotes("");
    setAllowDuplicate(false);
    setMissingMode("remove");
    setOpenRows(new Set());
    setOnlyIssues(false);
    setResult(null);
    setDirty(false);
    setStep(0);
    setPayMode("unpaid");
    setPayAmount("");
    setPayMethod("cash");
    setPayRef("");
    setPayLog([]);
    setPayFail(null);
    setPayOpen(false);
    setReceivedPoId(null);
  };

  /* ---------- pay after the fact (success screen) ---------- */
  const openPayDialog = () => {
    if (payMode === "unpaid") setPayMode("full");
    setPayOpen(true);
  };
  const submitLaterPayment = async () => {
    const amt = payAmountOf(laterMode, payAmount, dueAfter);
    const ok = await recordPayment({
      data: result,
      poId: receivedPoId,
      amount: amt,
    });
    if (ok) {
      setPayOpen(false);
      setPayMode("unpaid");
      setPayAmount("");
      setPayRef("");
      notify("Payment recorded");
    }
  };

  /* ---------- derived ---------- */
  const verdicts = preview?.rows || [];
  const totals = preview?.totals;
  // paying the supplier
  const dueNow = dueFrom(totals) ?? 0; // balance on this invoice, before receiving
  const showPayment = canPay && dueNow > 0;
  const payError = showPayment
    ? checkPayment(payMode, payAmount, dueNow)
    : null;
  const lastPay = payLog.length ? payLog[payLog.length - 1] : null;
  const dueAfter = lastPay
    ? money(lastPay.new_due)
    : (dueFrom(result?.totals) ?? dueFrom(totals) ?? 0); // balance after receiving
  const paidAfter = lastPay
    ? money(lastPay.new_paid_total)
    : money(num(result?.totals?.paid_amount ?? totals?.paid_amount));
  const payStatusAfter =
    lastPay?.payment_status ||
    (dueAfter <= 0.001 ? "paid" : paidAfter > 0 ? "partial" : "unpaid");
  const laterMode = payMode === "unpaid" ? "full" : payMode; // the record-payment dialog has no "unpaid"
  const laterError = checkPayment(laterMode, payAmount, dueAfter);
  const summary = preview?.summary;
  // the pack words and sizes of the checked lines — for "21 strips = 380 tablets" / "12 bottles"
  const lineWords = rows.map((r, i) => lineWord(r, verdicts[i]));
  const lineUpps = verdicts.map((v) => Number(v?.values?.units_per_pack) || 1);
  const pt = packTotals(summary, lineWords, lineUpps);
  const figures = billFigures(verdicts, totals);
  const okLineCount = verdicts.filter((v) => v?.values?.total_amount != null).length || rows.length;
  const supplierName =
    supplier?.supplier_name || poDetail?.supplier_name || po?.supplier_name || preview?.supplier?.supplier_name || "";
  // what this delivery brought in — from the saved receipt
  const rs = result?.summary;
  const rpt = packTotals(rs, lineWords, lineUpps);
  const stripsIn = rpt ? `${rpt.packs}${rpt.into ? ` = ${rpt.into}` : ""}` : "—";
  const canReceive =
    !!preview?.can_receive && !dirty && !checking && rows.length > 0;
  const attention = dirty
    ? 0
    : verdicts.filter((v) => v.problems?.length).length;
  const choices = dirty
    ? 0
    : verdicts.filter((v) => !v.problems?.length && v.action === "ambiguous")
        .length;
  const duplicateInvoice =
    !dirty &&
    preview &&
    !preview.can_receive &&
    preview.blocking_issues.some((b) => /already received/i.test(b));

  // Lines that need attention, frozen at the last clean check so the
  // "To sort out" filter doesn't reshuffle while the user is typing.
  useEffect(() => {
    if (dirty || !preview) return;
    const s = new Set();
    rows.forEach((r, i) => {
      const k = railOf(verdicts[i], false);
      if (k === "fix" || k === "choose") s.add(r.key);
    });
    setIssueKeys(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, dirty]);

  // Why the Receive button is (or isn't) available — always visible next to it.
  const gate = (() => {
    if (!rows.length)
      return { tone: "text.secondary", text: "Add at least one line" };
    if (checking)
      return { tone: "text.secondary", text: "Checking the lines…" };
    if (dirty)
      return { tone: "text.secondary", text: "Re-checking your changes…" };
    if (!preview)
      return { tone: "text.secondary", text: "Waiting for the check" };
    if (!preview.can_receive) {
      const n = attention + choices;
      return {
        tone: "error.main",
        text: n
          ? `Sort out ${plural(n, "line")} to receive`
          : preview.blocking_issues?.[0] || "Something above needs sorting out",
      };
    }
    return { tone: "success.main", text: "All lines check out" };
  })();

  // Ctrl/⌘ + Enter → open the receive dialog when everything is clear.
  useEffect(() => {
    if (step !== 1) return undefined;
    const onKey = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "Enter" &&
        canReceive &&
        !confirming &&
        !confirmOpen &&
        !result
      ) {
        e.preventDefault();
        setConfirmOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, canReceive, confirming, confirmOpen, result]);

  const jumpToFirstIssue = () => {
    const i = verdicts.findIndex(
      (v) => v.problems?.length || v.action === "ambiguous",
    );
    if (i < 0) return;
    const key = rows[i]?.key;
    if (!key) return;
    setOpenRows((prev) => new Set(prev).add(key));
    document
      .getElementById(`line-${key}`)
      ?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
  };

  const statusText = checking
    ? "Checking"
    : dirty
      ? "Lines changed"
      : preview
        ? preview.can_receive
          ? "Checked and clear"
          : `${attention + choices} line${attention + choices === 1 ? "" : "s"} to sort out`
        : "Not checked";

  const filtering = onlyIssues && !!preview;
  const visibleCount = filtering
    ? rows.filter((r) => issueKeys.has(r.key)).length
    : rows.length;
  const totalsStale = dirty || checking;

  // Search box used by both Autocompletes on step one (with dropdown arrow + clear button).
  const searchInput = (label, placeholder, busy) => (params) => (
    <Box>
      <Typography
        component="label"
        htmlFor={params.inputProps.id}
        sx={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: "text.secondary",
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Box
        ref={params.InputProps.ref}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 1,
          pl: 1.25,
          pr: 8,
          border: 1,
          borderColor: "divider",
          borderRadius: 1.5,
          bgcolor: "background.paper",
          transition: "border-color .15s, box-shadow .15s",
          "&:hover": { borderColor: "text.disabled" },
          "&:focus-within": {
            borderColor: "primary.main",
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}`,
          },
        }}
      >
        <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
        <Box
          component="input"
          {...params.inputProps}
          placeholder={placeholder}
          sx={{
            flex: 1,
            minWidth: 0,
            font: "inherit",
            fontSize: { xs: 16, md: 14 },
            py: 1,
            border: 0,
            outline: "none",
            bgcolor: "transparent",
            color: "text.primary",
          }}
        />
        {busy && <CircularProgress size={16} />}
        {params.InputProps.endAdornment}
      </Box>
    </Box>
  );

  /* ---------- no receive permission: say so instead of a form the server will refuse ---------- */
  if (!accessLoading && !canReceiveStock) {
    return (
      <Box
        ref={shellRef}
        data-testid="receive-denied"
        sx={{ height: shellHeight, maxHeight: "86vh", display: "flex", overflow: "hidden", bgcolor: "background.default" }}
      >
        <AccessDenied what="Receive stock" onBack={toOrders} />
      </Box>
    );
  }

  /* ================================================================ */
  return (
    <Box
      ref={shellRef}
      sx={{
        height: shellHeight,
        maxHeight:"86vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {/* ---------------- header ---------------- */}
      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 2, md: 3 },
          pt: { xs: 1.75, md: 2 },
          pb: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ minWidth: 0 }}
          >
            <Tooltip
              title={
                step === 1
                  ? "Back to the delivery details"
                  : "Back to Purchase orders"
              }
            >
              <IconButton
                size="small"
                aria-label={
                  step === 1
                    ? "Back to the delivery details"
                    : "Back to Purchase orders"
                }
                onClick={() => (step === 1 ? setStep(0) : leave())}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: 17, md: 19 },
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
                noWrap
              >
                Receive stock
              </Typography>
              <Typography
                sx={{ fontSize: 12.5, color: "text.secondary" }}
                noWrap
              >
                {step === 0
                  ? "Start with the delivery, then check the lines"
                  : [
                      mode === "po"
                        ? po?.purchase_number
                        : supplier?.supplier_name,
                      mode === "po"
                        ? poDetail?.supplier_name
                        : "direct receipt",
                      invoiceNumber || "no invoice number",
                      preview?.branch || poBranch || branchSent || null,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Stepper
              activeStep={step}
              sx={{
                display: { xs: "none", sm: "flex" },
                "& .MuiStepLabel-label": { fontSize: 12.5, fontWeight: 600 },
                "& .MuiStepConnector-line": { minWidth: 24 },
              }}
            >
              <Step completed={step > 0}>
                <StepLabel
                  onClick={() => step === 1 && setStep(0)}
                  sx={{
                    cursor: step === 1 ? "pointer" : "default",
                    "&:hover .MuiStepLabel-label":
                      step === 1 ? { color: "primary.main" } : undefined,
                  }}
                >
                  Delivery
                </StepLabel>
              </Step>
              <Step>
                <StepLabel>Check lines</StepLabel>
              </Step>
            </Stepper>
            {(rows.length > 0 || target) && (
              <>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setResetOpen(true)}
                  sx={{
                    textTransform: "none",
                    color: "text.secondary",
                    display: { xs: "none", sm: "inline-flex" },
                  }}
                >
                  Start over
                </Button>
                <Tooltip title="Start over">
                  <IconButton
                    size="small"
                    aria-label="Start over"
                    onClick={() => setResetOpen(true)}
                    sx={{ display: { xs: "inline-flex", sm: "none" } }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        </Stack>
      </Box>

      {denied && (
        <Alert
          severity="error"
          onClose={() => setDenied(null)}
          sx={{ borderRadius: 0, flexShrink: 0 }}
        >
          <AlertTitle sx={{ mb: 0.25, fontSize: 14 }}>Not allowed</AlertTitle>
          <Typography sx={{ fontSize: 13 }}>{denied}</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Your role needs the pharmacy purchase view and receive permissions.
            If you are an admin and still see this, the permission keys in the
            database don't match the ones the route checks.
          </Typography>
        </Alert>
      )}

      {/* ================= STEP 1 — the delivery (two panels, no scroll) ================= */}
      {step === 0 && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(340px, 5fr) minmax(0, 6fr)",
            },
            gridTemplateRows: { xs: "auto", md: "minmax(0, 1fr)" },
            gap: { xs: 2, md: 2.5 },
            p: { xs: 2, md: 2.5 },
            // Desktop: everything fits, nothing scrolls. Phones stack the two panels.
            overflowY: { xs: "auto", md: "hidden" },
            "@media (min-width: 900px) and (max-height: 680px)": {
              gap: 1.75,
              p: 1.75,
            },
          }}
        >
          {/* ---------------- LEFT · what you type or pick ---------------- */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              p: { xs: 2, md: 2 },
              minHeight: { xs: "auto", md: 0 }, // phones: never squeezed below its content
              display: "flex",
              flexDirection: "column",
              gap: 1,
              overflowY: { md: "auto" }, // safety net only for very short windows
              "@media (min-width: 900px) and (max-height: 680px)": {
                p: 1.75,
                gap: 1.25,
              },
            }}
          >
            {/* 1 · delivery from */}
            <Box>
              <SectionHead
                n={1}
                title="Delivery from"
                hint={
                  mode === "po"
                    ? "match it to your order"
                    : "no order was raised"
                }
                done={!!target}
              />
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                color="primary"
                value={mode}
                onChange={(_, v) => v && switchMode(v)}
                aria-label="Kind of delivery"
                sx={{
                  mb: 1.5,
                  "& .MuiToggleButton-root": {
                    textTransform: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    py: 0.85,
                    gap: 0.75,
                  },
                }}
              >
                <ToggleButton value="direct">
                  <LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />
                  Direct delivery
                </ToggleButton>
                <ToggleButton value="po">
                  <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />
                  Against an order
                </ToggleButton>
              </ToggleButtonGroup>

              {mode === "po" ? (
                pendingLoading ? (
                  <Skeleton variant="rounded" height={58} />
                ) : (
                  <Autocomplete
                    options={pending}
                    value={po}
                    onChange={(_, v) => setPo(v)}
                    getOptionLabel={(o) => o.purchase_number || ""}
                    filterOptions={(opts, { inputValue }) => {
                      const q = inputValue.trim().toLowerCase();
                      if (!q) return opts;
                      return opts.filter((o) =>
                        [o.purchase_number, o.supplier_name].some((s) =>
                          String(s || "")
                            .toLowerCase()
                            .includes(q),
                        ),
                      );
                    }}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderOption={(props, o) => (
                      <li {...props} key={o.id}>
                        <Box sx={{ width: "100%", py: 0.25 }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            spacing={1}
                          >
                            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                              {o.purchase_number}
                            </Typography>
                            <Typography
                              sx={{ fontSize: 13, fontWeight: 600, ...nums }}
                            >
                              ₹{inr(o.grand_total)}
                            </Typography>
                          </Stack>
                          <Typography
                            sx={{ fontSize: 12, color: "text.secondary" }}
                          >
                            {[
                              o.supplier_name,
                              `${o.items_count} item(s)`,
                              o.status,
                              o.branch ? `to ${o.branch}` : null,
                            ]
                              .filter(Boolean)
                              .join("  ·  ")}
                          </Typography>
                        </Box>
                      </li>
                    )}
                    noOptionsText="No orders are waiting to be received"
                    renderInput={searchInput(
                      "Purchase order",
                      "Order number or supplier",
                      loadingPo,
                    )}
                  />
                )
              ) : (
                <Autocomplete
                  options={suppliers}
                  loading={suppliersLoading}
                  value={supplier}
                  onChange={(_, v) => setSupplier(v)}
                  getOptionLabel={(o) => o.supplier_name || ""}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  noOptionsText="No active suppliers — add one in Suppliers first"
                  renderInput={searchInput(
                    "Supplier",
                    "Who delivered this?",
                    suppliersLoading,
                  )}
                />
              )}

              {/* fixed-height line so nothing jumps when a choice is made */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.75}
                sx={{ mt: 0.75, minHeight: 22, minWidth: 0 }}
              >
                {mode === "po" && po ? (
                  <>
                    {po.status && (
                      <Chip
                        size="small"
                        label={po.status}
                        color="info"
                        variant="outlined"
                        sx={{
                          height: 20,
                          fontSize: 10.5,
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      />
                    )}
                    <Typography
                      sx={{ fontSize: 12.5, color: "text.secondary", ...nums }}
                      noWrap
                    >
                      {[
                        po.supplier_name,
                        plural(Number(po.items_count) || 0, "item"),
                        `₹${inr(po.grand_total)}`,
                      ]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </Typography>
                  </>
                ) : mode === "direct" && supplier ? (
                  <Typography
                    sx={{ fontSize: 12.5, color: "text.secondary" }}
                    noWrap
                  >
                    Direct receipt from {supplier.supplier_name}
                  </Typography>
                ) : (
                  <Typography
                    sx={{ fontSize: 12.5, color: "text.disabled" }}
                    noWrap
                  >
                    {mode === "po"
                      ? "Pick the order this invoice is for"
                      : "Pick the supplier who delivered it"}
                  </Typography>
                )}
              </Stack>

              {/* where the stock goes */}
              {(poBranch || br.multi) && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.25}
                  sx={{ mt: 1, minWidth: 0, flexWrap: "wrap", rowGap: 0.75 }}
                >
                  {poBranch ? (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.25,
                        py: 0.6,
                        borderRadius: 2,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "primary.dark",
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      }}
                    >
                      <PlaceOutlinedIcon sx={{ fontSize: 17 }} />
                      Deliver to {poBranch}
                    </Box>
                  ) : (
                    <BranchPicker state={br} label="Receive into" sx={{ minWidth: 200 }} />
                  )}
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: needBranch ? "error.main" : "text.secondary",
                      fontWeight: needBranch ? 600 : 400,
                      minWidth: 0,
                    }}
                  >
                    {poBranch
                      ? "the order says where it goes"
                      : needBranch
                        ? "Choose the branch this stock goes into"
                        : br.isAdmin
                          ? "the stock goes into this branch"
                          : "your branch"}
                  </Typography>
                </Stack>
              )}
            </Box>

            <Divider />

            {/* 2 · invoice details */}
            <Box>
              <SectionHead
                n={2}
                title="Invoice details"
                hint="as printed on the bill"
                done={!!invoiceNumber.trim()}
              />
              <Stack spacing={1.25}>
                <Field
                  label="Supplier invoice no."
                  value={invoiceNumber}
                  onChange={(v) => {
                    setInvoiceNumber(v);
                    touch();
                  }}
                  placeholder="e.g. INV/2026/0451"
                />
                <Box
                  sx={{
                    display: "grid",
                    gap: 1.25,
                    gridTemplateColumns: "1fr 1fr",
                  }}
                >
                  <Field
                    label="Invoice date"
                    type="date"
                    max={today()}
                    value={invoiceDate}
                    onChange={(v) => {
                      setInvoiceDate(v);
                      touch();
                    }}
                  />
                  <Field
                    label="Received on"
                    type="date"
                    max={today()}
                    value={receivedDate}
                    onChange={(v) => {
                      setReceivedDate(v);
                      touch();
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            {mode === "po" && <Divider />}

            {/* options — only the "against an order" mode has any */}
            {mode === "po" && (
            <Box>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  mb: 0.75,
                }}
              >
                Options
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  // two columns when there's room, wraps only if the panel gets very narrow
                  gridTemplateColumns:
                    mode === "po"
                      ? "repeat(auto-fit, minmax(170px, 1fr))"
                      : "1fr",
                }}
              >
                {[
                  {
                    show: mode === "po",
                    checked: missingMode === "block",
                    set: (v) => setMissingMode(v ? "block" : "remove"),
                    label: "Block if a line is missing",
                    tip: "Stops receiving when an ordered line isn't on the invoice. When off, missing lines come off the order as not supplied.",
                  },
                ]
                  .filter((o) => o.show)
                  .map((o) => (
                    <Stack
                      key={o.label}
                      direction="row"
                      alignItems="center"
                      spacing={0.5}
                      sx={{
                        minWidth: 0,
                        minHeight: 38,
                        pl: 0.5,
                        pr: 1,
                        border: 1,
                        borderRadius: 2,
                        borderColor: o.checked
                          ? alpha(theme.palette.primary.main, 0.4)
                          : "divider",
                        bgcolor: o.checked
                          ? alpha(theme.palette.primary.main, 0.04)
                          : "transparent",
                        transition: "border-color .15s, background-color .15s",
                      }}
                    >
                      <FormControlLabel
                        sx={{ m: 0, flex: 1, minWidth: 0 }}
                        control={
                          <Switch
                            size="small"
                            checked={o.checked}
                            onChange={(e) => {
                              o.set(e.target.checked);
                              touch();
                            }}
                          />
                        }
                        label={
                          <Typography
                            sx={{
                              fontSize: 12.5,
                              fontWeight: 500,
                              lineHeight: 1.25,
                            }}
                          >
                            {o.label}
                          </Typography>
                        }
                      />
                      <Tooltip title={o.tip} placement="top" arrow>
                        <InfoOutlinedIcon
                          sx={{
                            fontSize: 16,
                            color: "text.disabled",
                            cursor: "help",
                            flexShrink: 0,
                          }}
                        />
                      </Tooltip>
                    </Stack>
                  ))}
              </Box>
            </Box>
            )}
          </Paper>

          {/* ---------------- RIGHT · upload only ---------------- */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              p: { xs: 2, md: 2.5 },
              // phones: the panels stack, so this one is never squeezed below its content
              minHeight: { xs: "auto", md: 0 },
              "@media (max-width: 899.95px)": { "& > *": { flexShrink: 0 } },
              display: "flex",
              flexDirection: "column",
              gap: 1.75,
              "@media (min-width: 900px) and (max-height: 680px)": {
                p: 1.75,
                gap: 1.25,
              },
            }}
          >
            <SectionHead
              n={3}
              title="Invoice lines"
              hint={
                rows.length
                  ? `${plural(rows.length, "line")} ready`
                  : "upload the bill or enter by hand"
              }
              done={rows.length > 0}
            />

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              hidden
              onChange={(e) => doImport(e.target.files?.[0])}
            />

            {/* the drop zone fills all the height the panel has */}
            <Box
              role="button"
              tabIndex={ready && !importing ? 0 : -1}
              aria-disabled={!ready}
              aria-label="Upload the supplier invoice — CSV (.csv) or Excel (.xlsx, .xls), up to 5 MB"
              onClick={() => ready && !importing && fileRef.current?.click()}
              onKeyDown={(e) => {
                if (
                  ready &&
                  !importing &&
                  (e.key === "Enter" || e.key === " ")
                ) {
                  e.preventDefault();
                  fileRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (ready) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (ready) doImport(e.dataTransfer.files?.[0]);
              }}
              sx={{
                flex: 1,
                minHeight: { xs: 220, md: 0 },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.25,
                textAlign: "center",
                px: 3,
                py: 2,
                borderRadius: 2.5,
                border: "2px dashed",
                borderColor: dragOver
                  ? "primary.main"
                  : ready
                    ? alpha(theme.palette.primary.main, 0.35)
                    : "divider",
                bgcolor: dragOver
                  ? alpha(theme.palette.primary.main, 0.08)
                  : ready
                    ? alpha(theme.palette.primary.main, 0.025)
                    : "action.hover",
                cursor: !ready
                  ? "not-allowed"
                  : importing
                    ? "progress"
                    : "pointer",
                outline: "none",
                transition: reduceMotion
                  ? "none"
                  : "border-color .15s, background-color .15s",
                "&:hover":
                  ready && !importing
                    ? {
                        borderColor: "primary.main",
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                      }
                    : undefined,
                "&:focus-visible": {
                  borderColor: "primary.main",
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.25)}`,
                },
              }}
            >
              {!ready ? (
                <>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "action.selected",
                      color: "text.disabled",
                    }}
                  >
                    <ArrowBackIcon
                      sx={{ display: { xs: "none", md: "block" } }}
                    />
                    <UploadFileOutlinedIcon
                      sx={{ display: { xs: "block", md: "none" } }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "text.secondary",
                    }}
                  >
                    {!target
                      ? mode === "po"
                        ? "Pick the order first"
                        : "Pick the supplier first"
                      : "Choose the branch first"}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      color: "text.disabled",
                      maxWidth: 300,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", md: "inline" } }}
                    >
                      Choose it on the left —
                    </Box>{" "}
                    then upload the invoice here.
                  </Typography>
                </>
              ) : importing ? (
                <>
                  <CircularProgress size={32} />
                  <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
                    Reading the invoice…
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                    Matching each line to your catalog
                  </Typography>
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: "primary.main",
                      transform: dragOver ? "scale(1.08)" : "none",
                      transition: reduceMotion ? "none" : "transform .15s",
                    }}
                  >
                    <UploadFileOutlinedIcon sx={{ fontSize: 30 }} />
                  </Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                    {dragOver
                      ? "Drop to read the invoice"
                      : "Upload the supplier's invoice"}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "text.secondary",
                      display: { xs: "none", md: "block" },
                    }}
                  >
                    Drag the file here, or
                  </Typography>
                  <Button
                    component="span"
                    tabIndex={-1}
                    aria-hidden
                    variant="contained"
                    disableElevation
                    size="small"
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 2.5,
                      pointerEvents: "none",
                    }}
                  >
                    Choose file
                  </Button>
                  {/* exactly which files work */}
                  <Stack alignItems="center" spacing={0.6}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "text.secondary", letterSpacing: "0.03em" }}>
                      ACCEPTED FILES
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", justifyContent: "center" }}>
                      {IMPORT_TYPES.map((t) => (
                        <Chip
                          key={t.ext}
                          size="small"
                          variant="outlined"
                          color="primary"
                          icon={<DescriptionOutlinedIcon sx={{ fontSize: 15 }} />}
                          label={
                            <span>
                              <b>{t.ext}</b> · {t.label}
                            </span>
                          }
                          sx={{ height: 24, fontSize: 12, bgcolor: "background.paper" }}
                        />
                      ))}
                    </Stack>
                    <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>
                      Up to 5 MB · PDF and photos of bills can&apos;t be read
                    </Typography>
                  </Stack>
                  {rows.length > 0 && (
                    <Chip
                      size="small"
                      color="warning"
                      variant="outlined"
                      label={`${plural(rows.length, "line")} loaded · a new file replaces them`}
                      sx={{ fontSize: 11.5, fontWeight: 600 }}
                    />
                  )}
                </>
              )}
            </Box>

            {/* secondary ways in */}
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1 }}
              >
                <Divider sx={{ flex: 1 }} />
                <Typography
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "text.secondary",
                    whiteSpace: "nowrap",
                  }}
                >
                  or enter the lines yourself
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: mode === "po" ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
                  },
                }}
              >
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={
                    templateBusy ? (
                      <CircularProgress size={14} />
                    ) : (
                      <FileDownloadOutlinedIcon />
                    )
                  }
                  disabled={templateBusy || (mode === "po" && !po)}
                  onClick={downloadTemplate}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    py: 0.75,
                  }}
                >
                  {mode === "po" && po ? "Order template" : "Download template"}
                </Button>
                {mode === "po" && (
                  <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    startIcon={<DescriptionOutlinedIcon />}
                    disabled={!poDetail?.items?.length}
                    onClick={loadPoLines}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: 2,
                      py: 0.75,
                    }}
                  >
                    {poDetail?.items?.length
                      ? `Fill from order (${poDetail.items.length})`
                      : "Fill from order"}
                  </Button>
                )}
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  disabled={!ready}
                  onClick={addRow}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    py: 0.75,
                  }}
                >
                  Add a line
                </Button>
              </Box>
            </Box>

            {rows.length > 0 && (
              <Button
                fullWidth
                variant="contained"
                disableElevation
                endIcon={<KeyboardArrowRightIcon />}
                onClick={() => setStep(1)}
                sx={{
                  py: 1.1,
                  borderRadius: 2,
                  textTransform: "none",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Continue to the {plural(rows.length, "line")}
              </Button>
            )}
          </Paper>
        </Box>
      )}

      {/* ================= STEP 2 — the lines ================= */}
      {step === 1 && (
        <>
          {/* status strip */}
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 2, md: 3 },
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              role="status"
              aria-live="polite"
            >
              {checking ? (
                <CircularProgress size={13} />
              ) : (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: dirty
                      ? "text.disabled"
                      : preview?.can_receive
                        ? "success.main"
                        : attention
                          ? "error.main"
                          : "warning.main",
                  }}
                />
              )}
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                {statusText}
              </Typography>
            </Stack>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ my: 0.5, display: { xs: "none", sm: "block" } }}
            />
            <Typography
              sx={{
                fontSize: 12.5,
                color: "text.secondary",
                whiteSpace: "nowrap",
                display: { xs: "none", sm: "block" },
                ...nums,
              }}
            >
              {plural(rows.length, "line")}
              {summary && !dirty
                ? `  ·  ${pt.packs}${pt.into ? ` = ${pt.into}` : ""}`
                : ""}
              {fileInfo?.name ? `  ·  from ${fileInfo.name}` : ""}
              {summary && !dirty && summary.new_medicines
                ? `  ·  ${summary.new_medicines} new`
                : ""}
            </Typography>

            {preview && (issueKeys.size > 0 || onlyIssues) && (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={onlyIssues ? "issues" : "all"}
                onChange={(_, v) => v && setOnlyIssues(v === "issues")}
                aria-label="Which lines to show"
                sx={{
                  "& .MuiToggleButton-root": {
                    textTransform: "none",
                    fontSize: 12,
                    py: 0.25,
                    px: 1.25,
                    ...nums,
                  },
                }}
              >
                <ToggleButton value="all">All {rows.length}</ToggleButton>
                <ToggleButton value="issues">
                  To sort out {issueKeys.size}
                </ToggleButton>
              </ToggleButtonGroup>
            )}

            <Box sx={{ flex: 1 }} />
            {(attention > 0 || choices > 0) && (
              <Button
                size="small"
                color={attention ? "error" : "warning"}
                onClick={jumpToFirstIssue}
                sx={{
                  textTransform: "none",
                  fontSize: 12.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                <Box
                  component="span"
                  sx={{ display: { xs: "none", sm: "inline" } }}
                >
                  Take me to the first one
                </Box>
                <Box
                  component="span"
                  sx={{ display: { xs: "inline", sm: "none" } }}
                >
                  First one
                </Box>
              </Button>
            )}
            <Tooltip title="Check again now">
              <span>
                <IconButton
                  size="small"
                  aria-label="Check again now"
                  onClick={recheck}
                  disabled={checking || !rows.length}
                >
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Add a line">
              <IconButton
                size="small"
                aria-label="Add a line"
                onClick={addRow}
                sx={{ display: { xs: "inline-flex", sm: "none" } }}
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
              onClick={addRow}
              sx={{
                textTransform: "none",
                fontSize: 12.5,
                display: { xs: "none", sm: "inline-flex" },
                whiteSpace: "nowrap",
              }}
            >
              Add line
            </Button>
          </Box>
          {checking && <LinearProgress sx={{ height: 2, flexShrink: 0 }} />}

          {/* the only scrolling region — up and down only, never sideways */}
          <Box
            ref={listRef}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              bgcolor: "background.paper",
            }}
          >
            {preview &&
              !dirty &&
              (preview.blocking_issues.length > 0 ||
                preview.missing_po_lines?.length > 0) && (
                <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, pb: 0.5 }}>
                  <Stack spacing={1.25}>
                    {preview.blocking_issues.length > 0 && (
                      <Alert
                        severity="error"
                        variant="outlined"
                        sx={{ borderRadius: 2, fontSize: 13 }}
                      >
                        <AlertTitle
                          sx={{
                            fontSize: 13.5,
                            mb: preview.blocking_issues.length > 1 ? 0.5 : 0,
                          }}
                        >
                          {preview.blocking_issues.length === 1
                            ? "One thing to sort out"
                            : `${preview.blocking_issues.length} things to sort out`}
                        </AlertTitle>
                        <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
                          {preview.blocking_issues.slice(0, 3).map((b, i) => (
                            <li key={i}>
                              <Typography sx={{ fontSize: 12.5 }}>
                                {b}
                              </Typography>
                            </li>
                          ))}
                        </Box>
                        {preview.blocking_issues.length > 3 && (
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: "text.secondary",
                              mt: 0.5,
                            }}
                          >
                            …and {preview.blocking_issues.length - 3} more,
                            marked on the lines below.
                          </Typography>
                        )}
                        {duplicateInvoice && (
                          <FormControlLabel
                            sx={{ mt: 0.5 }}
                            control={
                              <Switch
                                size="small"
                                checked={allowDuplicate}
                                onChange={(e) => {
                                  setAllowDuplicate(e.target.checked);
                                  touch();
                                }}
                              />
                            }
                            label={
                              <Typography sx={{ fontSize: 12.5 }}>
                                This really is a second delivery on the same
                                invoice number
                              </Typography>
                            }
                          />
                        )}
                      </Alert>
                    )}
                    {preview.missing_po_lines?.length > 0 && (
                      <Alert
                        severity={missingMode === "block" ? "error" : "warning"}
                        variant="outlined"
                        sx={{ borderRadius: 2, fontSize: 13 }}
                      >
                        <AlertTitle sx={{ fontSize: 13.5, mb: 0.25 }}>
                          {preview.missing_po_lines.length} ordered line(s) are
                          not on this invoice
                        </AlertTitle>
                        <Typography sx={{ fontSize: 12.5 }}>
                          {preview.missing_po_lines
                            .map((m) => `${m.medicine} (${m.quantity})`)
                            .join(", ")}
                        </Typography>
                        <Typography
                          sx={{ fontSize: 12, color: "text.secondary" }}
                        >
                          {missingMode === "block"
                            ? "Receiving is blocked while they're missing."
                            : "They'll come off the order as not supplied."}
                        </Typography>
                      </Alert>
                    )}
                  </Stack>
                </Box>
              )}

            {rows.length === 0 ? (
              <Stack
                alignItems="center"
                spacing={1}
                sx={{ py: 8, color: "text.secondary" }}
              >
                <InventoryOutlinedIcon
                  sx={{ fontSize: 34, color: "text.disabled" }}
                />
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                  No lines yet
                </Typography>
                <Typography sx={{ fontSize: 12.5 }}>
                  Upload the supplier's invoice or add the lines one by one.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setStep(0)}
                    sx={{ textTransform: "none" }}
                  >
                    Upload the invoice
                  </Button>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addRow}
                    sx={{ textTransform: "none" }}
                  >
                    Add a line
                  </Button>
                </Stack>
              </Stack>
            ) : filtering && visibleCount === 0 ? (
              <Stack
                alignItems="center"
                spacing={1}
                sx={{ py: 8, color: "text.secondary" }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                    color: "success.main",
                  }}
                >
                  <CheckRoundedIcon />
                </Box>
                <Typography
                  sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}
                >
                  Nothing left to sort out
                </Typography>
                <Button
                  onClick={() => setOnlyIssues(false)}
                  sx={{ textTransform: "none" }}
                >
                  Show all {plural(rows.length, "line")}
                </Button>
              </Stack>
            ) : (
              <Box>
                {/* column headings — short; hover one to see what it means (one-row lines only:
                    the wrapped lines carry their own) */}
                {wideLines && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: RCV_COLS,
                    columnGap: RCV_GAP,
                    alignItems: "center",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    pl: 1.25,
                    pr: 0.5,
                    minHeight: 34,
                    bgcolor: "background.paper",
                    borderBottom: 1.5,
                    borderColor: "divider",
                    "& > *": {
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "text.secondary",
                      px: 0.25,
                    },
                  }}
                >
                  <HeadTip col="item" sx={{ pl: "26px !important" }} />
                  <HeadTip col="loc" />
                  <HeadTip col="batch" />
                  <HeadTip col="exp" />
                  <HeadTip col="pack" />
                  <HeadTip col="mrp" />
                  <HeadTip col="ptr" />
                  <HeadTip col="dprice" />
                  <HeadTip col="qty" />
                  <HeadTip col="free" />
                  <HeadTip col="sch" />
                  <HeadTip col="taxable" />
                  <HeadTip col="gst" />
                  <HeadTip col="amount" />
                  <Box />
                </Box>
                )}
              {rows.map((r, i) =>
                filtering && !issueKeys.has(r.key) ? null : (
                  <Line
                    key={r.key}
                    index={i}
                    row={r}
                    verdict={verdicts[i]}
                    stale={dirty}
                    open={openRows.has(r.key)}
                    reduceMotion={reduceMotion}
                    wide={wideLines}
                    onToggle={() => toggleRow(r.key)}
                    onField={(f, v) => setField(r.key, f, v)}
                    onPatch={(patch) => patchRow(r.key, patch)}
                    onRemove={() => removeRow(r.key)}
                    onPick={(id) => pickMedicine(r.key, id)}
                    onAddAsNew={(nm) => takeNewMedicine(r.key, nm)}
                    onEditNewMedicine={() =>
                      setNmEditor({ key: r.key, value: r.new_medicine })
                    }
                    onSearch={() =>
                      setPicker({ key: r.key, query: r.name || "" })
                    }
                  />
                ),
              )}
              </Box>
            )}
            {rows.length > 0 && !filtering && (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addRow}
                  sx={{
                    textTransform: "none",
                    fontSize: 13,
                    color: "text.secondary",
                  }}
                >
                  Add another line
                </Button>
              </Box>
            )}
            <Box sx={{ height: 8 }} />
          </Box>

          {/* ---------------- commit bar ---------------- */}
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 2, md: 3 },
              py: { xs: 1.25, md: 1.5 },
              pb: { xs: "max(10px, env(safe-area-inset-bottom))", md: 1.5 },
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: `0 -4px 12px ${alpha(theme.palette.common.black, 0.04)}`,
              display: "flex",
              alignItems: "center",
              gap: { xs: 1.25, md: 3 },
              flexWrap: "wrap",
            }}
          >
            {/* the invoice total — the bill discount, charges and notes are in the Receive dialog */}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary" }}
              >
                Invoice total{totalsStale && totals ? " · updating" : ""}
              </Typography>
              <Stack direction="row" alignItems="baseline" spacing={0.75}>
                <Typography
                  sx={{
                    fontSize: { xs: 19, md: 21 },
                    fontWeight: 700,
                    ...nums,
                    lineHeight: 1.1,
                    opacity: totalsStale ? 0.45 : 1,
                    transition: "opacity .15s",
                  }}
                >
                  {totals ? `₹${inr(totals.grand_total)}` : "—"}
                </Typography>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, minWidth: 8 }} />

            <Typography
              role="status"
              aria-live="polite"
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                color: gate.tone,
                textAlign: "right",
                maxWidth: { xs: "48%", sm: 320 },
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              {gate.tone === "success.main" && (
                <CheckRoundedIcon sx={{ fontSize: 16 }} />
              )}
              {gate.text}
            </Typography>

            <Tooltip title={canReceive && !phone ? "Ctrl + Enter" : ""}>
              <Box
                component="span"
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  order: { xs: 3, sm: 0 },
                }}
              >
                <Button
                  variant="contained"
                  disableElevation
                  color="success"
                  size="large"
                  startIcon={
                    confirming ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <CheckRoundedIcon />
                    )
                  }
                  disabled={!canReceive || confirming}
                  onClick={() => setConfirmOpen(true)}
                  sx={{
                    textTransform: "none",
                    fontSize: 15,
                    fontWeight: 700,
                    px: { xs: 2.5, md: 4 },
                    py: 1.1,
                    borderRadius: 2,
                    width: { xs: "100%", sm: "auto" },
                  }}
                >
                  {confirming ? "Receiving…" : "Receive into stock"}
                </Button>
              </Box>
            </Tooltip>
          </Box>
        </>
      )}

      {/* ---------------- confirm: the delivery + payment on the left, the bill on the right ----------------
          wide enough that nothing scrolls on a laptop screen; a phone stacks the two */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth={false}
        fullWidth
        fullScreen={phone}
        PaperProps={{ sx: { maxWidth: 960, borderRadius: phone ? 0 : 3 } }}
        aria-labelledby="rcv-confirm-title"
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          spacing={1.5}
          sx={{ px: 3, pt: 2.25, pb: 1.5, borderBottom: 1, borderColor: "divider" }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id="rcv-confirm-title" component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>
              Receive this delivery?
            </Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }} noWrap>
              {mode === "po" && po?.purchase_number ? (
                <>
                  Against <b>{po.purchase_number}</b> from{" "}
                </>
              ) : (
                <>Direct delivery from </>
              )}
              <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>
                {supplierName || "the supplier"}
              </Box>
            </Typography>
          </Box>
          <IconButton aria-label="Close" onClick={() => setConfirmOpen(false)} sx={{ mt: -0.5, mr: -1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <DialogContent sx={{ px: 3, py: 2.25 }}>
          <Box
            sx={{
              display: "grid",
              // desktop: the delivery and the payment on the left, the bill down the right;
              // phone: delivery → bill → payment
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 380px" },
              gridTemplateAreas: { xs: '"brief" "bill" "pay"', md: '"brief bill" "pay bill"' },
              gridTemplateRows: { md: "auto 1fr" },
              columnGap: 3,
              rowGap: { xs: 2.5, md: 2 },
              alignItems: "start",
            }}
          >
            {/* ---------- the delivery ---------- */}
              <Box sx={{ gridArea: "brief", minWidth: 0 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", mb: 1 }}>
                  THE DELIVERY
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, minmax(0, 1fr))" },
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    overflow: "hidden",
                    // hairlines between the cells
                    gap: "1px",
                    bgcolor: "divider",
                  }}
                >
                  {[
                    ["Invoice", invoiceNumber.trim() || "not entered", invoiceDate ? fmtDay(invoiceDate) : null],
                    ["Received on", fmtDay(receivedDate), preview?.branch ? `into ${preview.branch}` : null],
                    ["Items", summary ? plural(okLineCount, "line") : "—", summary?.new_medicines ? `${summary.new_medicines} new to the catalog` : null],
                    [pt ? pt.label : "Packs", pt ? pt.count : "—", null],
                    ["Into stock", pt ? pt.into || pt.packs : "—", null],
                    [
                      "Batches",
                      summary ? `${compact(summary.new_batches || 0)} new` : "—",
                      summary?.existing_batches ? `+ ${summary.existing_batches} topped up` : null,
                    ],
                  ].map(([k, val, sub]) => (
                    <Box key={k} sx={{ px: 1.5, py: 1, bgcolor: "background.paper", minWidth: 0 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary" }}>{k}</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, ...nums }} noWrap title={String(val)}>
                        {val}
                      </Typography>
                      {sub && (
                        <Typography sx={{ fontSize: 11, color: "text.secondary" }} noWrap title={sub}>
                          {sub}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
                {(summary?.removed_po_lines > 0 || summary?.catalog_updates > 0) && (
                  <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.75 }}>
                    {[
                      summary.removed_po_lines > 0 ? `${plural(summary.removed_po_lines, "unsupplied line")} will be removed from the order` : null,
                      summary.catalog_updates > 0 ? `${plural(summary.catalog_updates, "medicine")} updated in the catalog` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Typography>
                )}
              </Box>

              {/* ---------- the payment ---------- */}
              {showPayment && (
                <Box sx={{ gridArea: "pay", minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", color: "text.secondary", mb: 1 }}>
                    PAYMENT TO {String(supplierName || "the supplier").toUpperCase()}
                  </Typography>
                  <PaymentFields
                    due={dueNow}
                    mode={payMode}
                    setMode={setPayMode}
                    amount={payAmount}
                    setAmount={setPayAmount}
                    method={payMethod}
                    setMethod={setPayMethod}
                    reference={payRef}
                    setReference={setPayRef}
                    error={payError}
                  />
                  {payMode !== "unpaid" && (
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 1 }}>
                      The stock is saved first, then the payment — if the payment fails, retry it on the next screen.
                    </Typography>
                  )}
                </Box>
              )}

            {/* ---------- the bill ---------- */}
            <Stack spacing={1.25} sx={{ gridArea: "bill", minWidth: 0 }}>
              <BillSummary
                totals={totals}
                figures={figures}
                stale={totalsStale}
                billDiscount={billDiscount}
                onBillDiscount={(v) => {
                  setBillDiscount(v);
                  touch();
                }}
                otherCharges={otherCharges}
                onOtherCharges={(v) => {
                  setOtherCharges(v);
                  touch();
                }}
              />
              {totals && Number(totals.paid_amount) > 0 && (
                <Stack spacing={0.75} sx={{ px: 0.5 }}>
                  <Stat label="Already paid" value={`₹${inr(totals.paid_amount)}`} />
                  <Stat label="Balance due" value={`₹${inr(dueNow)}`} strong />
                </Stack>
              )}
              {!totalsStale && preview?.blocking_issues?.length > 0 && (
                <Alert severity="error" sx={{ borderRadius: 2, fontSize: 12.5 }}>
                  {preview.blocking_issues.join(" ")}
                </Alert>
              )}
              <Field
                label="Notes (optional)"
                value={notes}
                onChange={setNotes}
                placeholder="e.g. 2 strips short, driver told"
              />
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 1.75,
            borderTop: 1,
            borderColor: "divider",
            gap: 1,
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          <Typography
            sx={{
              fontSize: 11.5,
              color: "text.secondary",
              display: "flex",
              gap: 0.75,
              flex: { xs: "1 1 100%", sm: 1 },
              minWidth: 0,
              mr: { sm: 1 },
              order: { xs: 3, sm: 0 },
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 15, mt: "1px", flexShrink: 0 }} />
            This writes the stock. A correction afterwards goes through a purchase return or a stock adjustment.
          </Typography>
          <Button onClick={() => setConfirmOpen(false)} sx={{ textTransform: "none", flexShrink: 0, ml: { xs: "auto !important", sm: 0 } }}>
            Not yet
          </Button>
          <Button
            variant="contained"
            disableElevation
            color="success"
            onClick={doConfirm}
            disabled={!!payError || !canReceive}
            sx={{ textTransform: "none", fontWeight: 700, px: 2.5, flexShrink: 0 }}
          >
            {totalsStale
              ? "Updating the total…"
              : showPayment && payMode !== "unpaid" && !payError
                ? `Receive & pay ₹${inr(payAmountOf(payMode, payAmount, dueNow))}`
                : `Receive · ₹${inr(totals?.grand_total)}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- done ---------------- */}
      <Dialog
        open={!!result}
        maxWidth="sm"
        fullWidth
        fullScreen={phone}
        onClose={() => {}}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(theme.palette.success.main, 0.14),
                color: "success.main",
              }}
            >
              <CheckRoundedIcon fontSize="small" />
            </Box>
            <span>Stock received</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {result?.message && (
            <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
              {result.message}
            </Typography>
          )}
          <Stack spacing={1.1} sx={{ mb: 2 }}>
            <Stat
              label="Purchase order"
              value={result?.purchase_number}
              strong
            />
            <Stat label="Into stock" value={stripsIn} strong />
            {result?.branch && <Stat label="Branch" value={result.branch} />}
            <Stat label="Supplier" value={result?.supplier?.supplier_name} />
            <Stat
              label="Invoice"
              value={result?.invoice_number || "not entered"}
            />
            <Stat
              label="Total"
              value={`₹${inr(result?.totals?.grand_total)}`}
              strong
            />
            {(payLog.length > 0 || paidAfter > 0 || dueAfter > 0) && (
              <>
                <Divider />
                <Stat label="Paid" value={`₹${inr(paidAfter)}`} />
                <Stat label="Balance due" value={`₹${inr(dueAfter)}`} strong />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                    Payment
                  </Typography>
                  <Chip
                    size="small"
                    label={PAY_STATUS[payStatusAfter]}
                    color={
                      payStatusAfter === "paid"
                        ? "success"
                        : payStatusAfter === "partial"
                          ? "warning"
                          : "default"
                    }
                    variant={
                      payStatusAfter === "unpaid" ? "outlined" : "filled"
                    }
                    sx={{ height: 22, fontSize: 11.5, fontWeight: 700 }}
                  />
                </Stack>
              </>
            )}
          </Stack>
          {payLog.map((p) => (
            <Alert
              key={p.payment_number}
              severity="success"
              variant="outlined"
              sx={{ borderRadius: 2, mb: 1.5, fontSize: 13 }}
            >
              Paid ₹{inr(p.amount)} by{" "}
              {(
                PAY_METHODS.find((m) => m.value === p.payment_method)?.label ||
                p.payment_method
              ).toLowerCase()}
              {" · "}
              {p.payment_number}
            </Alert>
          ))}
          {payFail && (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{ borderRadius: 2, mb: 1.5, fontSize: 13 }}
            >
              <AlertTitle sx={{ fontSize: 13.5, mb: 0.25 }}>
                The stock is in, but the payment wasn't saved
              </AlertTitle>
              {payFail}
            </Alert>
          )}
          {result?.created_medicines?.length > 0 && (
            <Alert
              severity="info"
              variant="outlined"
              sx={{ borderRadius: 2, mb: 2, fontSize: 13 }}
            >
              <AlertTitle sx={{ fontSize: 13.5, mb: 0.25 }}>
                Added to your catalog
              </AlertTitle>
              <Typography sx={{ fontSize: 12.5 }}>
                {result.created_medicines.map((c) => c.medicine).join(", ")}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                Set their category and selling price in Medicines.
              </Typography>
            </Alert>
          )}
          {result?.lines?.length > 0 && (
            <Paper
              variant="outlined"
              sx={{ borderRadius: 2, overflow: "hidden" }}
            >
              {result.lines.map((l, i) => (
                <Box
                  key={i}
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderTop: i ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap>
                      {l.medicine}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 12, color: "text.secondary", ...nums }}
                    >
                      batch {l.batch_number} · expires {l.expiry_date}
                      {l.storage_location ? ` · ${l.storage_location}` : ""}
                      {" · "}
                      {l.batch_action === "add_to_existing_batch" ? "added to the batch" : "new batch"}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: "success.dark",
                        ...nums,
                      }}
                    >
                      {l.text || `+${l.units_in}`}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            flexWrap: "wrap",
            gap: 1,
            "& > :not(:first-of-type)": { ml: 0 },
          }}
        >
          {canPay && dueAfter > 0.001 && (
            <Button
              variant={payFail ? "contained" : "outlined"}
              color={payFail ? "warning" : "primary"}
              disableElevation
              onClick={openPayDialog}
              disabled={paying}
              sx={{ textTransform: "none", mr: "auto !important" }}
            >
              {payFail ? "Retry payment" : "Record payment"}
            </Button>
          )}
          <Button onClick={toOrders} sx={{ textTransform: "none" }}>
            Purchase orders
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={resetAll}
            sx={{ textTransform: "none" }}
          >
            Receive another
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- record a payment on what was just received ---------------- */}
      <Dialog
        open={payOpen}
        onClose={() => !paying && setPayOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={phone}
      >
        <DialogTitle sx={{ pb: 1 }}>Record payment</DialogTitle>
        <DialogContent>
          <Stack spacing={1.1} sx={{ mb: 2 }}>
            <Stat
              label="Purchase order"
              value={result?.purchase_number}
              strong
            />
            <Stat label="Supplier" value={result?.supplier?.supplier_name} />
            <Stat label="Balance due" value={`₹${inr(dueAfter)}`} strong />
          </Stack>
          <PaymentFields
            due={dueAfter}
            allowUnpaid={false}
            mode={laterMode}
            setMode={setPayMode}
            amount={payAmount}
            setAmount={setPayAmount}
            method={payMethod}
            setMethod={setPayMethod}
            reference={payRef}
            setReference={setPayRef}
            error={laterError}
          />
          {payFail && (
            <Alert
              severity="error"
              variant="outlined"
              sx={{ borderRadius: 2, mt: 2, fontSize: 13 }}
            >
              {payFail}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPayOpen(false)}
            disabled={paying}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={submitLaterPayment}
            disabled={paying || !!laterError}
            startIcon={
              paying ? <CircularProgress size={16} color="inherit" /> : null
            }
            sx={{ textTransform: "none" }}
          >
            {paying
              ? "Saving…"
              : `Record ₹${inr(payAmountOf(laterMode, payAmount, dueAfter))}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- switch kind of delivery with lines on screen ---------------- */}
      <Dialog
        open={!!switchAsk}
        onClose={() => setSwitchAsk(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          {switchAsk === "po" ? "Receive against an order instead?" : "Make this a direct delivery instead?"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5 }}>
            The {plural(rows.length, "line")} on screen will be cleared, and you pick the{" "}
            {switchAsk === "po" ? "order" : "supplier"} again. Nothing has been saved yet.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            disableElevation
            onClick={() => setSwitchAsk(null)}
            sx={{ textTransform: "none" }}
          >
            Keep my lines
          </Button>
          <Button
            color="error"
            onClick={() => doSwitchMode(switchAsk)}
            sx={{ textTransform: "none" }}
          >
            Switch and clear
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- start over ---------------- */}
      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>Start over?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5 }}>
            {rows.length
              ? `The ${plural(rows.length, "line")} on screen and the invoice details will be cleared. Nothing has been saved yet.`
              : "The delivery and invoice details will be cleared."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setResetOpen(false)}
            sx={{ textTransform: "none" }}
          >
            Keep them
          </Button>
          <Button
            color="error"
            variant="contained"
            disableElevation
            onClick={() => {
              setResetOpen(false);
              resetAll();
            }}
            sx={{ textTransform: "none" }}
          >
            Clear everything
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- leave with unsaved lines ---------------- */}
      <Dialog
        open={!!leaveOpen}
        onClose={() => setLeaveOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>Leave without receiving?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5 }}>
            You have {plural(rows.length, "line")} that haven't been received.
            They'll be lost if you leave now.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            disableElevation
            onClick={() => setLeaveOpen(false)}
            sx={{ textTransform: "none" }}
          >
            Stay here
          </Button>
          <Button
            color="error"
            onClick={() => {
              const go = leaveOpen?.proceed;
              setLeaveOpen(false);
              if (go) go();
              else toOrders();
            }}
            sx={{ textTransform: "none" }}
          >
            Leave
          </Button>
        </DialogActions>
      </Dialog>

      <MedicinePicker
        open={!!picker}
        initialQuery={picker?.query}
        onClose={() => setPicker(null)}
        onPick={(m) => pickMedicine(picker.key, m.medicine_id, m.units_per_pack)}
      />

      <NewMedicineDialog
        open={!!nmEditor}
        value={nmEditor?.value}
        onClose={() => setNmEditor(null)}
        onSave={(nm) => patchRow(nmEditor.key, { new_medicine: nm })}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={snack.undo ? 6000 : 4000}
        onClose={(_, reason) =>
          reason !== "clickaway" && setSnack((s) => ({ ...s, open: false }))
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: phone ? "center" : "right",
        }}
        sx={{ mb: step === 1 ? { xs: 15, sm: 13 } : 0 }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          action={
            snack.undo ? (
              <Button
                color="inherit"
                size="small"
                onClick={undoRemove}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Undo
              </Button>
            ) : undefined
          }
          sx={{ borderRadius: 2, fontSize: 13.5, alignItems: "center" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/** The page, wrapped so it reads its colours from src/theme/appColors.js. */
export default function ReceivePurchaseOrder() {
  return (
    <ColorRoot>
      <ReceivePurchaseOrderPage />
    </ColorRoot>
  );
}