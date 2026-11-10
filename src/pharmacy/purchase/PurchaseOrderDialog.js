// src/components/pharmacy/PurchaseOrderDialog.js
//
// One purchase order, opened from anywhere: its money, every medicine on it, and
// the payments made against it — which can be recorded, corrected or removed right
// here, so settling a supplier never needs a trip to another screen.
//
// This file is the leaf of the pair — PurchaseOrderList imports it, and also the
// formatting helpers it exports, so the two screens that show orders can never
// drift apart on how a rupee or an expiry date is printed.
//
// Backend
//   routes/pharmacy/pharmacyPurchaseOrders.js @ /api/pharmacy/purchase-orders
//     GET    /get/:id               the order, with its items AND its payments
//   routes/pharmacy/pharmacy_payments.js @ /api/pharmacy
//     POST   /post/payment          record a payment   { purchase_id, amount, payment_method, … }
//     PUT    /update/payment/:id    correct one        { amount, payment_method, transaction_reference, notes, payment_date }
//     DELETE /delete/payment/:id    remove one
//   All three keep the order's paid / due / payment status in step on the server.
//
// Who sees which button (the server enforces the same rules):
//   Record payment   pharmacy.payments.create  or  pharmacy.purchase.edit
//   Edit a payment   pharmacy.purchase.edit    or  pharmacy.payments.update
//   Delete one       pharmacy.purchase.edit    or  pharmacy.payments.delete
//
// Usage
//   <PurchaseOrderDialog
//     order={rowFromTheList}      // for an instant header while the rest loads
//     supplierName="Apex Pharma"  // optional; the row usually carries it
//     onClose={() => setOpen(null)}
//     onChanged={() => reloadList()}      // optional: a payment was saved / removed
//     onReceive={(order) => …}            // optional: shows "Receive stock" on an ordered PO
//   />
//   Buttons along the foot, beside each other:
//     Send to supplier  only while the order is still going out — a draft or an ordered order that
//                       has a supplier. Not once it is received, and not when it is cancelled.
//                       The PDF by email, and on a phone by WhatsApp (SendPurchaseOrderDialog).
//     Download PDF      on EVERY order, whatever its status — the same PDF the supplier gets
//                       (GET /pdf/:id?download=1). A draft or cancelled copy says so on it.
//
//   Scrolling: the dialog has ONE scroll area — the part between the header and the buttons.
//   The medicines are paged (5 / 10 / 20 a page, the shared AppPager) and simply grow the page, so
//   there is never a scroller inside the scroller to get stuck in.
//
//   In the page, not a popup: pass `inline` and the order opens as a section of the page in
//   place of the list (Back arrow at the top left; the list stays mounted behind it, so its page
//   and filters are still there when you come back). Small things — record / edit / delete a
//   payment, place the order, choose a supplier, send it — stay as popups.
//
//   Units: a line's quantity and free quantity are STRIPS (or bottles / tubes for items sold
//   whole), rates are per strip, and each line says what one strip holds ("strip of 10").
//
//   Drafts (pharmacy.purchase.edit):
//     Place order       PATCH /status/:id  { status: "ordered" }   — a draft becomes a real order
//     Choose supplier   PUT   /update/:id  { supplier_id }         — for a draft saved from
//                       Generate PO without a supplier. Until one is chosen it can't be placed
//                       or sent (the server refuses both).
//   Render it only when there is an order to show — `order` being null closes it.

import axios from "axios";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CurrencyRupeeOutlinedIcon from "@mui/icons-material/CurrencyRupeeOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import MedicationOutlinedIcon from "@mui/icons-material/MedicationOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";

import { useLocation, useNavigate } from "react-router-dom";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import useAccess from "../../hooks/useAccess";
import SendPurchaseOrderDialog from "./SendPurchaseOrderDialog";
import { Surface } from "./b2bShared";
import AppPager, { clampPage, pageSlice } from "../shared/AppPager";
import { plural, unitsPerPack } from "../shared/pharmacyUnits";
import { HeadTip, SubLine, inr2, lineMoney, packText, pctText, toMMYY } from "./purchaseColumns";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const API_BASE = process.env.REACT_APP_SITE_URL || "";
export const ORDERS_API = `${API_BASE}/api/pharmacy/purchase-orders`;
export const PAYMENTS_API = `${API_BASE}/api/pharmacy`;
// JWT lives in an HttpOnly cookie → send cookies.
export const http = axios.create({ withCredentials: true });

export const PAY_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const METHOD_ICON = {
  debit_note: AssignmentReturnOutlinedIcon, // set off by a purchase return (Purchase Returns)
  cash: PaymentsOutlinedIcon,
  upi: QrCode2Icon,
  bank_transfer: AccountBalanceOutlinedIcon,
  card: CreditCardOutlinedIcon,
  other: MoreHorizIcon,
};

// The medicines are paged (the shared AppPager), 5 / 10 / 20 at a time.
const LINE_PAGE_SIZES = [5, 10, 20, 50, 100]; // orders per page
 // medicines per page
// Item Name · Loc. · Batch · Exp. · Pack · MRP · PTR · D.Price · Qty · Free · Sch. Amt · Taxable · GST% · Amount
const PO_LINE_COLS = "minmax(150px, 1.6fr) 68px 80px 52px 44px 70px 70px 104px 44px 40px 64px 80px 46px 90px";
const PO_LINE_MIN_WIDTH = 1130; // px — below this the medicines scroll sideways

/* ------------------------------------------------------------------ */
/* Shared formatting — exported so the list prints things identically   */
/* ------------------------------------------------------------------ */
export const nums = { fontVariantNumeric: "tabular-nums" };

const money2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const inr = (n) =>
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// 1,24,500 → 1.25L. Keeps a totals strip readable on a phone.
export const compactInr = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return inr(v);
};

export const fmtDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

export const fmtShortDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

// Expiry always carries its year — a batch marked "exp 30 Sept" tells a pharmacist nothing.
export const fmtExpiry = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
};

// Expired → "error", inside six months → "warning", otherwise nothing to flag.
const expiryTone = (v) => {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) return null;
  const months = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months < 0) return "error";
  if (months < 6) return "warning";
  return null;
};

// bank_transfer → Bank transfer, upi → UPI
export const prettyMethod = (v) =>
  !v
    ? ""
    : PAY_METHODS.find((m) => m.value === v)?.label ||
      String(v)
        .replace(/_/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase());

/** "strip" / "strips", "bottle" / "bottles" … — the line's pack word (the server sends pack_word;
    strip when not known). */
export const unitWord = (it, n = 2) => {
  const w = String(it?.pack_word || it?.unit || "strip").trim().toLowerCase() || "strip";
  if (Number(n) === 1) return w;
  return /(s|x|ch|sh)$/.test(w) ? `${w}es` : `${w}s`;
};
/** True when every line is counted in strips (or the pack word isn't known, which means strips). */
export const allStrips = (items) =>
  (items || []).every((it) => {
    const w = it.pack_word || it.unit;
    return !w || /strip/i.test(w);
  });

/** What one unit of a line's quantity holds: "strip of 10", "100 ml", "bottle". */
export const packOf = (it) => {
  const upp = unitsPerPack(it);
  if (upp > 1) return `${unitWord(it, 1)} of ${upp}`;
  return String(it?.pack_size || "").trim() || unitWord(it, 1);
};

/** "10 strips (+1 free)" for a line */
export const lineQtyText = (it) => {
  const q = Number(it.quantity) || 0;
  const f = Number(it.free_quantity) || 0;
  return `${q} ${unitWord(it, q)}${f ? ` (+${f} free)` : ""}`;
};

export const medicineLabel = (it) =>
  [it.brand_name || it.medicine_name, it.strength].filter(Boolean).join(" ") ||
  it.medicine_name ||
  `Medicine #${it.medicine_id}`;

/* What the purchase-order route can store, and the colour each one reads as. */
export const ORDER_TONE = {
  draft: "default",
  ordered: "info",
  received: "success",
  cancelled: "error",
};
export const PAY_TONE = {
  unpaid: "error",
  partial: "warning",
  paid: "success",
};

// A failed download arrives as a Blob (that is what we asked axios for), with the server's JSON
// message inside it — unwrap that too.
export async function apiMessage(err, fallback) {
  const d = err?.response?.data;
  if (typeof Blob !== "undefined" && d instanceof Blob) {
    try {
      return JSON.parse(await d.text()).message || fallback;
    } catch {
      return fallback;
    }
  }
  return d?.message || err?.message || fallback;
}

// A payment's calendar day as YYYY-MM-DD, for a date input. The server sends
// payment_day (no timezone games); fall back to the local day of payment_date.
const dayOf = (p) => {
  if (p?.payment_day) return String(p.payment_day).slice(0, 10);
  const d = new Date(p?.payment_date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const todayStr = () => dayOf({ payment_date: new Date() });

/* A thin scrollbar in the theme colour. */
const thinScroll = (c) => ({
  scrollbarWidth: "thin",
  scrollbarColor: `${alpha(c, 0.4)} transparent`,
  "&::-webkit-scrollbar": { width: 6 },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: alpha(c, 0.35),
    borderRadius: 3,
  },
});

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */
export function Detail({ label, value, mono, span }) {
  return (
    <Box sx={{ minWidth: 0, gridColumn: span ? "1 / -1" : undefined }}>
      <Typography
        sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary" }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 14.5,
          fontWeight: 500,
          ...(mono ? nums : {}),
          wordBreak: "break-word",
          color: value ? "text.primary" : "text.disabled",
        }}
      >
        {value || "Not on file"}
      </Typography>
    </Box>
  );
}

export function SectionTitle({ children, sx }) {
  return (
    <Typography
      sx={{
        fontSize: 12,
        fontWeight: 700,
        color: "text.secondary",
        letterSpacing: "0.03em",
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

export function StatusChips({ status, paymentStatus, size = 20 }) {
  return (
    <>
      {status && (
        <Chip
          size="small"
          label={status}
          color={ORDER_TONE[status] || "default"}
          variant={status === "received" ? "filled" : "outlined"}
          sx={{
            height: size,
            fontSize: size > 19 ? 10.5 : 10,
            fontWeight: 700,
            textTransform: "capitalize",
          }}
        />
      )}
      {paymentStatus && (
        <Chip
          size="small"
          label={paymentStatus}
          color={PAY_TONE[paymentStatus] || "default"}
          variant="outlined"
          sx={{
            height: size,
            fontSize: size > 19 ? 10.5 : 10,
            fontWeight: 700,
            textTransform: "capitalize",
          }}
        />
      )}
    </>
  );
}

/* A rounded square with an icon in it, tinted in `color`. */
function IconTile({ icon: Icon, color, size = 32, radius = 2 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        bgcolor: alpha(color, 0.12),
      }}
    >
      <Icon sx={{ fontSize: Math.round(size * 0.56), color }} />
    </Box>
  );
}

/* One bit of the header's sub-line: icon + text. */
function Meta({ icon: Icon, children }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        minWidth: 0,
        color: "text.secondary",
        fontSize: 12.5,
        fontWeight: 500,
      }}
    >
      <Icon sx={{ fontSize: 15, color: "primary.main", opacity: 0.8 }} />
      <Box
        component="span"
        sx={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/* One money figure with its icon. */
function MoneyTile({ icon, label, value, tone = "primary", strong }) {
  const theme = useTheme();
  const c = theme.palette[tone]?.main || theme.palette.text.secondary;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        p: 1.25,
        minWidth: 0,
        borderRadius: 2.5,
        bgcolor: "background.paper",
        border: 1,
        borderColor: alpha(c, 0.2),
      }}
    >
      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <IconTile icon={icon} color={c} size={36} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 10.5,
            fontWeight: 700,
            color: "text.secondary",
            letterSpacing: "0.05em",
          }}
          noWrap
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: 14.5, sm: 15.5 },
            fontWeight: 800,
            ...nums,
            color: strong ? c : "text.primary",
          }}
          noWrap
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/* A section heading: icon tile, title, count, an optional hint and an action on the right. */
function SectionHead({ icon, title, count, hint, action }) {
  const theme = useTheme();
  const c = theme.palette.primary.main;
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{ minWidth: 0 }}
    >
      <IconTile icon={icon} color={c} size={30} radius={1.75} />
      <Typography
        sx={{
          fontSize: 12.5,
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
        noWrap
      >
        {title}
      </Typography>
      {count != null && (
        <Chip
          size="small"
          label={count}
          sx={{
            height: 20,
            fontSize: 11,
            fontWeight: 800,
            bgcolor: alpha(c, 0.12),
            color: "primary.main",
          }}
        />
      )}
      {hint && (
        <Typography
          sx={{
            fontSize: 12,
            color: "text.secondary",
            display: { xs: "none", sm: "block" },
          }}
          noWrap
        >
          {hint}
        </Typography>
      )}
      <Box sx={{ flex: 1 }} />
      {action}
    </Stack>
  );
}

/* ================================================================== */
/* Record / edit one payment                                           */
/* ================================================================== */
/**
 * `form` is { mode: "add" } or { mode: "edit", payment }. Mount it only while a form
 * is open (with a key per payment) so every field starts from the right values.
 *
 * `order` must be the FRESH order (paid_amount / due_amount as the server has them),
 * because the most a payment can be is worked out from it:
 *   add   → what is still due
 *   edit  → the order value less the OTHER payments
 */
function PaymentFormDialog({ form, order, onClose, onSaved }) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const editing = form.mode === "edit";
  const p = form.payment;
  const isRefund = editing && Number(p.amount) < 0; // refunds keep their amount; only the details change

  const grand = money2(order.grand_total);
  const paid = money2(order.paid_amount);
  const due = Math.max(0, money2(grand - paid));
  const ceiling = editing
    ? Math.max(0, money2(grand - (paid - Number(p.amount))))
    : due;

  const [amount, setAmount] = useState(
    editing ? String(Math.abs(Number(p.amount))) : due > 0 ? String(due) : "",
  );
  const [method, setMethod] = useState(editing ? p.payment_method : "cash");
  const [ref, setRef] = useState(editing ? p.transaction_reference || "" : "");
  const [day, setDay] = useState(editing ? dayOf(p) : "");
  const [notes, setNotes] = useState(editing ? p.notes || "" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const amt = money2(Number(String(amount).replace(/,/g, "")));
  let problem = null;
  if (!isRefund) {
    if (!(amt > 0)) problem = "Enter the amount paid";
    else if (amt > ceiling + 0.005) {
      problem = editing
        ? `Can't be more than ₹${inr(ceiling)} — the order value less the other payments`
        : `Can't be more than the balance due (₹${inr(ceiling)})`;
    }
  }
  if (!problem && editing && day && day > todayStr())
    problem = "The date can't be in the future";

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      let r;
      if (editing) {
        r = await http.put(`${PAYMENTS_API}/update/payment/${p.id}`, {
          ...(isRefund ? {} : { amount: amt }),
          payment_method: method,
          // a cash payment has no reference — clear any left over from a previous method
          transaction_reference: method === "cash" ? "" : ref.trim(),
          notes: notes.trim(),
          ...(day ? { payment_date: day } : {}),
        });
      } else {
        r = await http.post(`${PAYMENTS_API}/post/payment`, {
          purchase_id: order.id,
          amount: amt,
          payment_method: method,
          ...(method !== "cash" && ref.trim()
            ? { transaction_reference: ref.trim() }
            : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
      }
      onSaved(editing ? "Payment updated" : "Payment recorded", r.data?.data);
    } catch (e) {
      setError(
        await apiMessage(
          e,
          editing
            ? "Couldn't update the payment"
            : "Couldn't record the payment",
        ),
      );
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={() => !saving && onClose()}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        component="div"
        sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1.25 }}
      >
        <IconTile
          icon={editing ? EditOutlinedIcon : PaymentsOutlinedIcon}
          color={primary}
          size={34}
        />
        <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
          {editing ? "Edit payment" : "Record payment"}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack
          spacing={0.5}
          sx={{
            mb: 2,
            p: 1.25,
            borderRadius: 2,
            bgcolor: alpha(primary, 0.05),
            border: 1,
            borderColor: alpha(primary, 0.15),
          }}
        >
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Purchase order
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, ...nums }}>
              {order.purchase_number}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              {editing ? "Most this payment can be" : "Balance due"}
            </Typography>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 800,
                color: "primary.main",
                ...nums,
              }}
            >
              ₹{inr(ceiling)}
            </Typography>
          </Stack>
        </Stack>

        <Stack spacing={2}>
          <TextField
            label="Amount paid (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isRefund || saving}
            error={!!problem && !/future/.test(problem)}
            helperText={
              isRefund ? (
                "A refund's amount can't be changed — delete it and record it again."
              ) : !editing && due > 0 ? (
                <Box
                  component="span"
                  role="button"
                  tabIndex={0}
                  onClick={() => setAmount(String(due))}
                  onKeyDown={(e) => e.key === "Enter" && setAmount(String(due))}
                  sx={{
                    cursor: "pointer",
                    color: "primary.main",
                    fontWeight: 600,
                  }}
                >
                  Pay the full balance (₹{inr(due)})
                </Box>
              ) : undefined
            }
            inputProps={{ inputMode: "decimal", style: { textAlign: "right" } }}
            size="small"
            fullWidth
            autoFocus
          />

          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: "text.secondary",
                mb: 0.6,
              }}
            >
              Paid by
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {PAY_METHODS.map((m) => {
                const MIcon = METHOD_ICON[m.value] || PaymentsOutlinedIcon;
                return (
                  <Chip
                    key={m.value}
                    label={m.label}
                    icon={<MIcon sx={{ fontSize: 16 }} />}
                    size="small"
                    clickable
                    disabled={saving}
                    color={method === m.value ? "primary" : "default"}
                    variant={method === m.value ? "filled" : "outlined"}
                    onClick={() => setMethod(m.value)}
                    sx={{ fontWeight: 600, px: 0.25 }}
                  />
                );
              })}
            </Box>
          </Box>

          {method !== "cash" && (
            <TextField
              label={
                method === "upi"
                  ? "UPI reference (optional)"
                  : "Reference no. (optional)"
              }
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder={
                method === "bank_transfer" ? "e.g. NEFT / UTR number" : ""
              }
              disabled={saving}
              size="small"
              fullWidth
            />
          )}

          {editing && (
            <TextField
              label="Paid on"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              disabled={saving}
              error={!!problem && /future/.test(problem)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: todayStr() }}
              size="small"
              fullWidth
            />
          )}

          <TextField
            label="Note (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
            size="small"
            fullWidth
            multiline
            maxRows={3}
          />

          {problem && (
            <Typography sx={{ fontSize: 12.5, color: "error.main" }}>
              {problem}
            </Typography>
          )}
          {error && (
            <Alert
              severity="error"
              variant="outlined"
              sx={{ borderRadius: 2, fontSize: 13 }}
            >
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={submit}
          disabled={saving || !!problem}
          startIcon={
            saving ? <CircularProgress size={16} color="inherit" /> : null
          }
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          {saving
            ? "Saving…"
            : editing
              ? "Save changes"
              : `Record ₹${inr(amt)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ================================================================== */
/* Choose (or change) a draft's supplier                               */
/* ================================================================== */
function ChooseSupplierDialog({ order, onClose, onDone }) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [to, setTo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    http
      .get(`${ORDERS_API}/suppliers`)
      .then((r) => alive && setList(r.data.data || []))
      .catch(() => alive && setList([]))
      .finally(() => alive && setLoadingList(false));
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await http.put(`${ORDERS_API}/update/${order.id}`, { supplier_id: to.id });
      onDone(to);
    } catch (e) {
      setErr(await apiMessage(e, "Couldn't set the supplier"));
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={() => !busy && onClose()} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle
        component="div"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          backgroundImage: `linear-gradient(135deg, ${alpha(primary, 0.1)} 0%, ${alpha(primary, 0.02)} 100%)`,
        }}
      >
        <IconTile icon={StorefrontOutlinedIcon} color={primary} size={40} radius={2.5} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 800 }}>Choose a supplier</Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", fontWeight: 400 }} noWrap>
            Who will supply {order.purchase_number}?
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: "20px !important" }}>
        <Autocomplete
          options={list}
          loading={loadingList}
          value={to}
          onChange={(_, v) => setTo(v)}
          getOptionLabel={(o) => o.supplier_name || ""}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          noOptionsText="No active suppliers — add one in Suppliers first"
          renderInput={(params) => <TextField {...params} label="Supplier" autoFocus />}
        />
        {err && (
          <Alert severity="error" variant="outlined" sx={{ borderRadius: 2, mt: 2, fontSize: 13 }}>
            {err}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!to || busy}
          onClick={save}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Save supplier
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ================================================================== */
/* The dialog                                                          */
/* ================================================================== */
export default function PurchaseOrderDialog({
  order,
  supplierName,
  onClose,
  onChanged,
  onReceive,
  inline = false, // a section of the page in place of the list, instead of a popup
}) {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"));
  const { canAny } = useAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const id = order?.id;


  // `order` is the row the list already has — enough for the header. The items and
  // payments arrive from /get/:id, so the dialog opens instantly instead of after a
  // round trip.
  const [full, setFull] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0); // bump to fetch the order again after a payment change

  const [payForm, setPayForm] = useState(null); // { mode: "add" } | { mode: "edit", payment }
  const [delPay, setDelPay] = useState(null); // the payment about to be deleted
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState(null);
  const [notice, setNotice] = useState(null); // { severity, text }
  const [sendOpen, setSendOpen] = useState(false); // the "Send to supplier" dialog
  const [assignOpen, setAssignOpen] = useState(false); // "Choose supplier" (a draft saved without one)
  const [placeOpen, setPlaceOpen] = useState(false); // "Place this order?"
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState(null);

  // medicine table paging (1-based, as AppPager counts)
  const [linePage, setLinePage] = useState(1);
  const [linesPerPage, setLinesPerPage] = useState(LINE_PAGE_SIZES[0]);
  const contentRef = useRef(null); // the dialog's one scroll area
  const tableRef = useRef(null);
  const firstPaint = useRef(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Turning to another page of medicines: if the top of the table has scrolled out of sight
  // (you were at the bottom, on the page buttons), bring it back, so the new page starts at its top.
  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    const table = tableRef.current;
    const area = contentRef.current;
    if (table && area && table.getBoundingClientRect().top < area.getBoundingClientRect().top) {
      table.scrollIntoView?.({ block: "start" });
    }
  }, [linePage, linesPerPage]);

  useEffect(() => {
    setFull(null);
    setNotice(null);
    setPayForm(null);
    setDelPay(null);
    setLinePage(1);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setFull(null);
      setError(null);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    http
      .get(`${ORDERS_API}/get/${id}`)
      .then((r) => {
        if (alive) setFull(r.data.data);
      })
      .catch(async (e) => {
        const msg = await apiMessage(e, "Couldn't open that order");
        if (alive) setError(msg);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, reload]);

  // A different order opened → start clean.
  useEffect(() => {
    setFull(null);
    setNotice(null);
    setPayForm(null);
    setDelPay(null);
  }, [id]);

  const afterChange = useCallback(
    (text) => {
      setPayForm(null);
      setDelPay(null);
      setNotice({ severity: "success", text });
      setReload((n) => n + 1);
      if (onChanged) onChanged();
    },
    [onChanged],
  );

  const confirmDelete = async () => {
    setDeleting(true);
    setDelError(null);
    try {
      await http.delete(`${PAYMENTS_API}/delete/payment/${delPay.id}`);
      setDeleting(false);
      afterChange("Payment deleted");
    } catch (e) {
      setDelError(await apiMessage(e, "Couldn't delete the payment"));
      setDeleting(false);
    }
  };

  if (!order) return null;

  const o = full || order;
  const items = full?.items || [];
  const payments = full?.payments || [];
  const who = supplierName || o.supplier_name;

  const status = o.status;
  const payable = status === "ordered" || status === "received";
  const due = Math.max(0, money2(o.due_amount));
  const canAdd = canAny("pharmacy.payments.create", "pharmacy.purchase.edit");
  const canEdit =
    status !== "cancelled" &&
    canAny("pharmacy.purchase.edit", "pharmacy.payments.update");
  const canDelete =
    status !== "cancelled" &&
    canAny("pharmacy.purchase.edit", "pharmacy.payments.delete");
  const showAdd = !!full && canAdd && payable && due > 0.001;
  const canEditOrder = canAny("pharmacy.purchase.edit");
  // a received order: send some of it back (opens Purchase Returns with this order picked)
  const canReturn = status === "received" && canAny("pharmacy.purchase_return.create");
  const returnToSupplier = () => {
    try {
      sessionStorage.setItem("caredesk:return-po", JSON.stringify({ id: o.id, purchase_number: o.purchase_number }));
    } catch {
      /* private mode — Purchase Returns opens without the order picked */
    }
    // the sibling screen sits next to this one in every layout: swap the last part of the address
    const next = location.pathname.replace(/[^/]+\/?$/, "purchase-returns");
    navigate(next === location.pathname ? "/pharmacy/purchase-returns" : next);
  };
  const noSupplier = status === "draft" && !!full && !o.supplier_id;
  const canPlace = status === "draft" && !!full && !noSupplier && canEditOrder;

  const placeOrder = async () => {
    setPlacing(true);
    setPlaceError(null);
    try {
      await http.patch(`${ORDERS_API}/status/${o.id}`, { status: "ordered" });
      setPlacing(false);
      setPlaceOpen(false);
      afterChange("Order placed — it can now be sent to the supplier and received");
    } catch (e) {
      setPlaceError(await apiMessage(e, "Couldn't place the order"));
      setPlacing(false);
    }
  };

  // The same PDF the supplier is sent, saved to this device. Allowed for every order.
  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const r = await http.get(`${ORDERS_API}/pdf/${o.id}`, { params: { download: 1 }, responseType: "blob" });
      const blob = r.data instanceof Blob ? r.data : new Blob([r.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${String(o.purchase_number || `PO-${o.id}`).replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setNotice({ severity: "error", text: await apiMessage(e, "Couldn't get the PDF") });
      contentRef.current?.scrollTo?.({ top: 0 }); // the message sits at the top of the page
    } finally {
      setPdfBusy(false);
    }
  };

  // Sending is for an order that is still going out. Received → done; cancelled → never.
  const canSend = (status === "draft" || status === "ordered") && !noSupplier;

  const primary = theme.palette.primary.main;
  const errorC = theme.palette.error.main;
  const warningC = theme.palette.warning.main;
  const successC = theme.palette.success.main;

  // Counted in the pack the order is placed in — strips. A received order says "received".
  const totalUnits = items.reduce(
    (t, it) => t + (Number(it.quantity) || 0) + (Number(it.free_quantity) || 0),
    0,
  );
  const freeUnits = items.reduce((t, it) => t + (Number(it.free_quantity) || 0), 0);
  // what the strips come to on the shelf — the stock is counted in tablets
  const totalTablets = items.reduce(
    (t, it) => t + ((Number(it.quantity) || 0) + (Number(it.free_quantity) || 0)) * unitsPerPack(it),
    0,
  );
  const stripsOnly = allStrips(items);
  const packNoun = stripsOnly ? (totalUnits === 1 ? "strip" : "strips") : totalUnits === 1 ? "pack" : "packs";
  const totalHint =
    `${totalUnits} ${packNoun} ${status === "received" ? "received" : status === "cancelled" ? "" : "ordered"}`.trim() +
    (freeUnits ? ` (${freeUnits} free)` : "") +
    (stripsOnly && totalTablets > totalUnits ? ` · ${totalTablets.toLocaleString("en-IN")} ${plural("tablet", totalTablets)}` : "");

  const safePage = clampPage(linePage, items.length, linesPerPage);
  const pageItems = pageSlice(items, safePage, linesPerPage);
  const paged = items.length > LINE_PAGE_SIZES[0];

  return (
    <>
      <Surface
        inline={inline}
        open
        onClose={onClose}
        labelledBy="po-dialog-title"
        maxWidth="lg"
        fullWidth
        fullScreen={narrow}
        PaperProps={{
          sx: {
            borderRadius: narrow ? 0 : 3,
            maxHeight: narrow ? "100%" : "88dvh",
            // only the middle scrolls (the DialogContent) — the header and the buttons stay put
            overflow: "hidden",
          },
        }}
      >
        {/* ---------------- header ---------------- */}
        <DialogTitle
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            py: 1.75,
            px: { xs: 2, sm: 3 },
            backgroundImage: `linear-gradient(135deg, ${alpha(primary, 0.1)} 0%, ${alpha(primary, 0.02)} 100%)`,
            ...(inline ? { flexShrink: 0, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" } : {}),
          }}
        >
          {inline && (
            <Tooltip title="Back to purchase orders">
              <IconButton onClick={onClose} aria-label="Back to purchase orders" size="small" edge="start">
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ display: { xs: inline ? "none" : "block", sm: "block" } }}>
            <IconTile
              icon={ReceiptLongOutlinedIcon}
              color={primary}
              size={42}
              radius={2.5}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* the number is never cut short: on a narrow screen the chips drop to the next line */}
            <Stack
              direction="row"
              alignItems="center"
              sx={{ minWidth: 0, flexWrap: "wrap", columnGap: 1, rowGap: 0.4 }}
            >
              <Typography
                id="po-dialog-title"
                component="h2"
                sx={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  ...nums,
                }}
              >
                {o.purchase_number}
              </Typography>
              <StatusChips status={o.status} paymentStatus={o.payment_status} />
            </Stack>
            <Stack
              direction="row"
              sx={{
                mt: 0.4,
                columnGap: 1.75,
                rowGap: 0.25,
                flexWrap: "wrap",
                minWidth: 0,
              }}
            >
              {who ? (
                <Meta icon={StorefrontOutlinedIcon}>{who}</Meta>
              ) : noSupplier ? (
                <Meta icon={StorefrontOutlinedIcon}>No supplier yet</Meta>
              ) : null}
              {o.purchase_date && (
                <Meta icon={CalendarMonthOutlinedIcon}>
                  {fmtDate(o.purchase_date)}
                </Meta>
              )}
              {o.invoice_number && (
                <Meta icon={DescriptionOutlinedIcon}>
                  Invoice {o.invoice_number}
                </Meta>
              )}
              {o.branch && (
                <Meta icon={PlaceOutlinedIcon}>
                  {status === "received" ? "Received at" : "Deliver to"} {o.branch}
                </Meta>
              )}
            </Stack>
          </Box>
          {!inline && (
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close"
              sx={{
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                "&:hover": { bgcolor: alpha(primary, 0.08) },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent
          ref={contentRef}
          dividers
          sx={{
            px: { xs: 1.5, sm: 3 },
            py: 2.25,
            overscrollBehavior: "contain", // reaching the end doesn't start scrolling the page behind
            ...(inline ? { flex: 1, minHeight: 0, overflowY: "auto", bgcolor: "background.default" } : {}),
            ...thinScroll(primary),
          }}
        >
          <Box sx={inline ? { maxWidth: 1320, mx: "auto" } : undefined}>
          {error ? (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{ borderRadius: 2, fontSize: 13 }}
            >
              {error}
            </Alert>
          ) : !full ? (
            <Stack spacing={1}>
              <Skeleton
                variant="rounded"
                height={90}
                sx={{ borderRadius: 3 }}
              />
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" height={44} />
              ))}
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              {notice && (
                <Alert
                  severity={notice.severity}
                  variant="outlined"
                  onClose={() => setNotice(null)}
                  sx={{ borderRadius: 2, fontSize: 13 }}
                >
                  {notice.text}
                </Alert>
              )}

              {noSupplier && (
                <Alert
                  severity="warning"
                  variant="outlined"
                  sx={{ borderRadius: 2, fontSize: 13, alignItems: "center" }}
                >
                  This draft has no supplier yet. Choose one (below) to place the order or send it.
                </Alert>
              )}

              {/* ---------------- money ---------------- */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  border: 1,
                  borderColor: alpha(primary, 0.15),
                  backgroundImage: `linear-gradient(135deg, ${alpha(primary, 0.06)}, ${alpha(primary, 0.015)})`,
                  opacity: loading ? 0.6 : 1,
                  transition: "opacity .15s",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 1,
                  }}
                >
                  <MoneyTile
                    icon={CurrencyRupeeOutlinedIcon}
                    label="ORDER VALUE"
                    value={`₹${inr(o.grand_total)}`}
                    tone="primary"
                  />
                  <MoneyTile
                    icon={PaidOutlinedIcon}
                    label="PAID"
                    value={`₹${inr(o.paid_amount)}`}
                    tone="success"
                    strong
                  />
                  <MoneyTile
                    icon={AccountBalanceWalletOutlinedIcon}
                    label="DUE"
                    value={`₹${inr(o.due_amount)}`}
                    tone={due > 0 ? "error" : "success"}
                    strong={due > 0}
                  />
                </Box>

              </Box>

              {/* ---------------- medicines ---------------- */}
              <Stack spacing={1.25}>
                <SectionHead
                  icon={MedicationOutlinedIcon}
                  title="Medicines on this order"
                  count={items.length}
                  hint={
                    items.length
                      ? totalHint
                      : null
                  }
                />

                {!items.length ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: "1px dashed",
                      borderColor: "divider",
                      textAlign: "center",
                    }}
                  >
                    <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                      This order has no lines on it.
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    ref={tableRef}
                    sx={{
                      border: 1,
                      borderColor: alpha(primary, 0.18),
                      borderRadius: 2.5,
                      overflow: "hidden",
                      bgcolor: "background.paper",
                    }}
                  >
                    {/* one line per medicine, the columns of the supplier's bill (purchaseColumns.js);
                        when the screen is narrower than a line it scrolls sideways, Item Name pinned */}
                    <Box sx={{ overflowX: "auto", overscrollBehaviorX: "contain", ...thinScroll(primary) }}>
                      <Box sx={{ minWidth: PO_LINE_MIN_WIDTH }}>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: PO_LINE_COLS,
                            columnGap: 1,
                            alignItems: "center",
                            pr: 1.5,
                            minHeight: 38,
                            bgcolor: "background.paper",
                            backgroundImage: `linear-gradient(${alpha(primary, 0.09)}, ${alpha(primary, 0.09)})`,
                            borderBottom: 1,
                            borderColor: alpha(primary, 0.18),
                            "& > *": { fontSize: 12.5, fontWeight: 700, color: "primary.dark" },
                          }}
                        >
                          <HeadTip
                            col="item"
                            sx={{
                              position: "sticky",
                              left: 0,
                              zIndex: 1,
                              alignSelf: "stretch",
                              display: "flex",
                              alignItems: "center",
                              pl: 1.5,
                              bgcolor: "background.paper",
                              backgroundImage: `linear-gradient(${alpha(primary, 0.09)}, ${alpha(primary, 0.09)})`,
                            }}
                          />
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
                          <HeadTip col="amount" sx={{ pr: 1 }} />
                        </Box>

                        {pageItems.map((it, i) => {
                          const xt = expiryTone(it.expiry_date);
                          const upp = unitsPerPack(it);
                          const mm = lineMoney({
                            quantity: it.quantity,
                            purchase_price: it.purchase_price,
                            discount_percent: it.discount_percent != null && it.scheme_amount != null ? it.discount_percent : undefined,
                            discount_amount: it.discount_amount,
                            scheme_amount: it.scheme_amount,
                            gst_percentage: it.gst_percentage,
                          });
                          const stripe = i % 2 ? alpha(primary, 0.025) : null;
                          const maker = it.manufacturer || it.manufacturer_name || "";
                          const pack = packText(upp, unitWord(it, 1), upp > 1 ? null : it.pack_size);
                          const sub = [[maker, pack].filter(Boolean).join(" | "), it.medicine_code].filter(Boolean).join("  ·  ");
                          const cell = { fontSize: 13, textAlign: "right", whiteSpace: "nowrap", ...nums };
                          return (
                            <Box
                              key={it.id}
                              sx={{
                                display: "grid",
                                gridTemplateColumns: PO_LINE_COLS,
                                columnGap: 1,
                                alignItems: "center",
                                pr: 1.5,
                                minHeight: 52,
                                borderTop: i ? 1 : 0,
                                borderColor: "divider",
                                bgcolor: stripe || "transparent",
                                transition: "background-color .15s",
                                "&:hover": { bgcolor: alpha(primary, 0.06) },
                              }}
                            >
                              {/* Item Name — pinned on the left */}
                              <Box
                                sx={{
                                  position: "sticky",
                                  left: 0,
                                  zIndex: 1,
                                  alignSelf: "stretch",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "center",
                                  minWidth: 0,
                                  pl: 1.5,
                                  pr: 1,
                                  py: 0.75,
                                  background: stripe
                                    ? `linear-gradient(${stripe}, ${stripe}), ${theme.palette.background.paper}`
                                    : theme.palette.background.paper,
                                }}
                              >
                                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "primary.dark" }} noWrap title={medicineLabel(it)}>
                                  {medicineLabel(it)}
                                </Typography>
                                {sub && <SubLine sx={{ mt: 0.2 }}>{sub}</SubLine>}
                              </Box>
                              <Typography sx={{ fontSize: 12.5, color: it.storage_location ? "text.primary" : "text.disabled" }} noWrap>
                                {it.storage_location || "—"}
                              </Typography>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 600, ...nums }} noWrap>
                                {it.batch_number || "—"}
                              </Typography>
                              <Typography
                                sx={{ fontSize: 12.5, ...nums, color: xt ? `${xt}.main` : "text.primary", fontWeight: xt ? 700 : 400 }}
                                noWrap
                                title={it.expiry_date ? `${xt === "error" ? "Expired" : "Expires"} ${fmtExpiry(it.expiry_date)}` : undefined}
                              >
                                {it.expiry_date ? toMMYY(String(it.expiry_date).slice(0, 10)) : "—"}
                              </Typography>
                              <Typography sx={cell}>{upp > 1 ? upp : 1}</Typography>
                              <Typography sx={{ ...cell, color: "text.secondary" }}>
                                {Number(it.mrp) > 0 ? `₹${inr(it.mrp)}` : "—"}
                              </Typography>
                              <Typography sx={cell}>₹{inr(it.purchase_price)}</Typography>
                              {/* the rate after the discount — only when there is one (otherwise it is just the PTR again) */}
                              {mm.pct > 0 ? (
                                <Typography sx={{ ...cell, color: "info.dark", fontWeight: 600 }} title={`after ${pctText(mm.pct)}% discount`}>
                                  ₹{inr2(mm.dprice)}
                                  <Box component="span" sx={{ fontWeight: 500, fontSize: 11.5, ml: 0.4 }}>
                                    ({pctText(mm.pct)}%)
                                  </Box>
                                </Typography>
                              ) : (
                                <Typography sx={{ ...cell, color: "text.disabled" }}>—</Typography>
                              )}
                              <Typography sx={{ ...cell, fontWeight: 600 }}>{it.quantity}</Typography>
                              <Typography sx={{ ...cell, color: Number(it.free_quantity) ? "success.main" : "text.secondary" }}>
                                {Number(it.free_quantity) || 0}
                              </Typography>
                              <Typography sx={{ ...cell, color: it.scheme_amount != null ? "text.primary" : "text.disabled" }}>
                                {it.scheme_amount != null ? inr2(it.scheme_amount) : "—"}
                              </Typography>
                              <Typography sx={cell}>₹{inr2(mm.taxable)}</Typography>
                              <Typography sx={cell}>{pctText(it.gst_percentage)}</Typography>
                              <Box
                                sx={{
                                  alignSelf: "stretch",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  px: 1,
                                  bgcolor: alpha(theme.palette.error.main, 0.045),
                                }}
                              >
                                <Typography sx={{ fontSize: 14, fontWeight: 800, color: "primary.dark", ...nums }} noWrap>
                                  ₹{inr(it.total_amount)}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>

                    {/* pager — only when there's more than one page's worth */}
                    {paged && (
                      <AppPager
                        page={safePage}
                        pageSize={linesPerPage}
                        total={items.length}
                        onPageChange={setLinePage}
                        pageSizeOptions={LINE_PAGE_SIZES}
                        onPageSizeChange={(n) => {
                          setLinesPerPage(n);
                          setLinePage(1);
                        }}
                        sx={{ borderColor: alpha(primary, 0.18), bgcolor: alpha(primary, 0.04) }}
                      />
                    )}
                  </Box>
                )}
              </Stack>
              {/* ---------------- payments — record, correct, remove ---------------- */}
              {(payments.length > 0 || showAdd) && (
                <Stack spacing={1.25}>
                  <SectionHead
                    icon={PaymentsOutlinedIcon}
                    title="Payments"
                    count={payments.length || null}
                    action={
                      showAdd && (
                        <Button
                          size="small"
                          variant="contained"
                          disableElevation
                          startIcon={<AddIcon sx={{ fontSize: 17 }} />}
                          onClick={() => setPayForm({ mode: "add" })}
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 2,
                            flexShrink: 0,
                          }}
                        >
                          Record payment
                        </Button>
                      )
                    }
                  />

                  {!payments.length ? (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        border: "1px dashed",
                        borderColor: alpha(errorC, 0.4),
                        bgcolor: alpha(errorC, 0.04),
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                      }}
                    >
                      <IconTile
                        icon={AccountBalanceWalletOutlinedIcon}
                        color={errorC}
                        size={34}
                      />
                      <Typography sx={{ fontSize: 13 }}>
                        Nothing paid yet —{" "}
                        <Box
                          component="span"
                          sx={{ fontWeight: 800, color: "error.main", ...nums }}
                        >
                          ₹{inr(due)}
                        </Box>{" "}
                        is due to {who || "the supplier"}.
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={0.75}>
                      {payments.map((p) => {
                        const refund = Number(p.amount) < 0;
                        const MIcon =
                          METHOD_ICON[p.payment_method] || PaymentsOutlinedIcon;
                        const c = refund ? errorC : successC;
                        return (
                          <Stack
                            key={p.id}
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            sx={{
                              pl: 1.25,
                              pr: 0.75,
                              py: 1,
                              border: 1,
                              borderColor: "divider",
                              borderRadius: 2.5,
                              bgcolor: "background.paper",
                              transition:
                                "border-color .15s, background-color .15s",
                              "&:hover": {
                                borderColor: alpha(primary, 0.4),
                                bgcolor: alpha(primary, 0.02),
                              },
                            }}
                          >
                            <IconTile icon={MIcon} color={c} size={36} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="baseline"
                                sx={{ minWidth: 0 }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: refund
                                      ? "error.main"
                                      : "text.primary",
                                    ...nums,
                                  }}
                                >
                                  {refund ? "−" : ""}₹
                                  {inr(Math.abs(Number(p.amount)))}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: 12.5,
                                    color: "text.secondary",
                                    fontWeight: 500,
                                  }}
                                  noWrap
                                >
                                  {[
                                    refund ? "Refund" : null,
                                    prettyMethod(p.payment_method),
                                    p.transaction_reference,
                                  ]
                                    .filter(Boolean)
                                    .join("  ·  ")}
                                </Typography>
                              </Stack>
                              <Typography
                                sx={{ fontSize: 11.5, color: "text.secondary" }}
                                noWrap
                              >
                                {[
                                  fmtDate(p.payment_date),
                                  p.payment_number,
                                  p.notes,
                                ]
                                  .filter(Boolean)
                                  .join("  ·  ")}
                              </Typography>
                            </Box>
                            {/* a debit note belongs to its purchase return — undone by cancelling the return */}
                            {canEdit && p.payment_method !== "debit_note" && (
                              <Tooltip title="Edit this payment">
                                <IconButton
                                  size="small"
                                  aria-label={`Edit payment of ${inr(Math.abs(Number(p.amount)))}`}
                                  onClick={() =>
                                    setPayForm({ mode: "edit", payment: p })
                                  }
                                  sx={{
                                    "&:hover": {
                                      color: "primary.main",
                                      bgcolor: alpha(primary, 0.08),
                                    },
                                  }}
                                >
                                  <EditOutlinedIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canDelete && p.payment_method !== "debit_note" && (
                              <Tooltip title="Delete this payment">
                                <IconButton
                                  size="small"
                                  aria-label={`Delete payment of ${inr(Math.abs(Number(p.amount)))}`}
                                  onClick={() => {
                                    setDelError(null);
                                    setDelPay(p);
                                  }}
                                  sx={{
                                    "&:hover": {
                                      color: "error.main",
                                      bgcolor: alpha(errorC, 0.08),
                                    },
                                  }}
                                >
                                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        );
                      })}
                    </Stack>
                  )}
                </Stack>
              )}

              {/* ---------------- notes ---------------- */}
              {o.notes && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1.25,
                    p: 1.5,
                    borderRadius: 2.5,
                    bgcolor: alpha(warningC, 0.06),
                    border: 1,
                    borderColor: alpha(warningC, 0.25),
                  }}
                >
                  <IconTile
                    icon={StickyNote2OutlinedIcon}
                    color={warningC}
                    size={30}
                    radius={1.75}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "text.secondary",
                        letterSpacing: "0.05em",
                      }}
                    >
                      NOTES
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {o.notes}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Stack>
          )}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            bgcolor: inline ? "background.paper" : alpha(primary, 0.025),
            gap: 1,
            flexWrap: "wrap", // on a phone the buttons go onto a second line instead of off the edge
            ...(inline
              ? { flexShrink: 0, justifyContent: "flex-start", borderTop: 1, borderColor: "divider", "& > :not(style) ~ :not(style)": { ml: 0 } }
              : {}),
          }}
        >
          {onReceive && status === "ordered" && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<InventoryOutlinedIcon />}
              onClick={() => onReceive(o)}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Receive stock
            </Button>
          )}
          {status === "draft" && !!full && !loading && !error && canEditOrder && (
            noSupplier ? (
              <Button
                variant="contained"
                disableElevation
                startIcon={<StorefrontOutlinedIcon />}
                onClick={() => setAssignOpen(true)}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
              >
                Choose supplier
              </Button>
            ) : (
              <Button
                variant="contained"
                disableElevation
                startIcon={<LocalShippingOutlinedIcon />}
                onClick={() => {
                  setPlaceError(null);
                  setPlaceOpen(true);
                }}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
              >
                Place order
              </Button>
            )
          )}
          {canReturn && !loading && !error && (
            <Button
              variant="outlined"
              disableElevation
              startIcon={<AssignmentReturnOutlinedIcon />}
              onClick={returnToSupplier}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Return to supplier
            </Button>
          )}
          {canSend && !loading && !error && (
            <Button
              variant={
                (onReceive && status === "ordered") || canPlace ? "outlined" : "contained"
              }
              disableElevation
              startIcon={<SendOutlinedIcon />}
              onClick={() => setSendOpen(true)}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Send to supplier
            </Button>
          )}
          {/* every order can be downloaded — draft, ordered, received or cancelled */}
          {!loading && !error && (
            <Button
              variant="outlined"
              disableElevation
              disabled={pdfBusy}
              startIcon={pdfBusy ? <CircularProgress size={16} /> : <FileDownloadOutlinedIcon />}
              onClick={downloadPdf}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Download PDF
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          {!inline && (
            <Button
              onClick={onClose}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Close
            </Button>
          )}
        </DialogActions>
      </Surface>

      {/* send the PDF — a sibling, like the payment dialogs, so closing it never touches the order */}
      {sendOpen && (
        <SendPurchaseOrderDialog
          order={{
            id: o.id,
            purchase_number: o.purchase_number,
            supplier_name: o.supplier_name || supplierName,
          }}
          onClose={() => setSendOpen(false)}
        />
      )}

      {/* choose the supplier of a draft that was saved without one */}
      {assignOpen && (
        <ChooseSupplierDialog
          order={o}
          onClose={() => setAssignOpen(false)}
          onDone={(sup) => {
            setAssignOpen(false);
            afterChange(`Supplier set to ${sup.supplier_name}`);
          }}
        />
      )}

      {/* place a draft */}
      <Dialog
        open={placeOpen}
        onClose={() => !placing && setPlaceOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle component="div" sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1.25 }}>
          <IconTile icon={LocalShippingOutlinedIcon} color={primary} size={36} radius={2.25} />
          <Typography sx={{ fontSize: 17, fontWeight: 800 }}>Place this order?</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5 }}>
            {o.purchase_number} will be marked as ordered{who ? ` with ${who}` : ""}. It can then be sent to the
            supplier and received. A placed order can't go back to a draft.
          </Typography>
          {placeError && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: 2, mt: 2, fontSize: 13 }}>
              {placeError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPlaceOpen(false)} disabled={placing} sx={{ textTransform: "none", fontWeight: 600 }}>
            Not yet
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={placeOrder}
            disabled={placing}
            startIcon={placing ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            Place order
          </Button>
        </DialogActions>
      </Dialog>

      {/* add / edit one payment — siblings of the order dialog, not children, so closing
          one never touches the other */}
      {payForm && full && (
        <PaymentFormDialog
          key={payForm.payment?.id ?? "new"}
          form={payForm}
          order={full}
          onClose={() => setPayForm(null)}
          onSaved={afterChange}
        />
      )}

      {/* delete one payment */}
      <Dialog
        open={!!delPay}
        onClose={() => !deleting && setDelPay(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          component="div"
          sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1.25 }}
        >
          <IconTile icon={DeleteOutlineIcon} color={errorC} size={34} />
          <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
            Delete this payment?
          </Typography>
        </DialogTitle>
        <DialogContent>
          {delPay && (
            <Typography sx={{ fontSize: 13.5 }}>
              ₹{inr(Math.abs(Number(delPay.amount)))} by{" "}
              {prettyMethod(delPay.payment_method).toLowerCase()} on{" "}
              {fmtDate(delPay.payment_date)} will be removed, and{" "}
              {o.purchase_number}'s paid and due amounts will be worked out
              again. If you only entered it wrongly, edit it instead.
            </Typography>
          )}
          {delError && (
            <Alert
              severity="error"
              variant="outlined"
              sx={{ borderRadius: 2, mt: 2, fontSize: 13 }}
            >
              {delError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDelPay(null)}
            disabled={deleting}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Keep it
          </Button>
          <Button
            color="error"
            variant="contained"
            disableElevation
            onClick={confirmDelete}
            disabled={deleting}
            startIcon={
              deleting ? <CircularProgress size={16} color="inherit" /> : null
            }
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            {deleting ? "Deleting…" : "Delete payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}