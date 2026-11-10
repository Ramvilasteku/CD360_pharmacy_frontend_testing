// src/pharmacy/purchase/AutoReorder.js
//
// Two menu pages, one screen:
//
//   Generate Purchase Order   <AutoReorder />                 (pharmacy/generate-purchase-order)
//       Opens on everything at or below its reorder level, sorted into a list per supplier
//       (the one you last bought each medicine from). Clear it and it is a blank form: start
//       a list for a supplier and add medicines by hand.
//
//   Sale-based Order          <AutoReorder variant="sales" />  (pharmacy/sale-based-order)
//       Opens on what the till says you are about to run out of: medicines that sold over the
//       last 7 / 30 / 90 days, ordered so the stock covers the next 7 / 15 / 30 days of selling.
//
// Layout, top to bottom:
//   header      title, one summary line, (sales: period + cover), branch, refresh
//   tabs        one tab per supplier list — name, medicines, amount. "+" starts another list.
//   toolbar     ticked count · Add a medicine · Change supplier · ⋮
//   lines       one plain row per medicine — no boxes, no pills
//   commit bar  Receive by · email the PDF · Save as draft · Generate order
//
// What you Save or Generate acts on the list on show alone: one list → one supplier → one order.
//
// A list does not need a supplier. "No supplier" is a plain medicine list you can save as a
// DRAFT and give a supplier to later (from the order in Purchase orders). It can't be placed
// or sent until someone is chosen to supply it.
//
// Leaving: if you have lists you've worked on and not saved, moving to another section asks
// first — Save to drafts, Stay here, or Leave without saving (useLeaveGuard.js).
//
// Units: everything here is counted in the medicine's pack (strip / bottle / …). Stock shows the
// whole packs with the loose tablets under them; rates are per pack.
//
// Branch: the suggestions are for ONE branch — its stock, its sales, its open orders — and the
// order is delivered there. Staff work in their own branch; the admin of a multi-branch pharmacy
// picks one first (the shared BranchPicker in the header).
//
// State note: the lines are ONE FLAT LIST, each carrying its own supplier_id, and the lists are
// derived. Moving a line to another supplier is a single field change.
//
// Backend: routes/pharmacy/pharmacyPurchaseOrders.js
//   GET  /auto-preview        Generate Purchase Order: what is low, grouped by supplier
//   GET  /sales-preview       Sale-based Order: ?days=7|30|90&cover_days=7|15|30
//   POST /auto-generate       raise the order(s), in one transaction
//   GET  /suppliers           active suppliers, for starting lists and moving lines
//   GET  /medicine-search     catalog search, to add anything not low
//
// Needs pharmacy.purchase.view to look, pharmacy.purchase.create to save or generate.

import { ColorRoot } from "../../theme/appColors";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  Popover,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import MedicationOutlinedIcon from "@mui/icons-material/MedicationOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import PlaylistAddCheckOutlinedIcon from "@mui/icons-material/PlaylistAddCheckOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import useAccess, { AccessDenied } from "../../hooks/useAccess";
import SendPurchaseOrderDialog from "./SendPurchaseOrderDialog";
import useLeaveGuard from "./useLeaveGuard";
import BranchPicker, { usePharmacyBranch } from "../shared/BranchPicker";
import { plural as unitPlural } from "../shared/pharmacyUnits";
import {
  IconTile,
  ROLE,
  buttonSx,
  headWash,
  inputSx,
  nums,
  thinScroll,
} from "./purchaseStyles";
import { HeadTip } from "./purchaseColumns";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const API_BASE = process.env.REACT_APP_SITE_URL || "";
const PO_API = `${API_BASE}/api/pharmacy/purchase-orders`;
// JWT lives in an HttpOnly cookie → send cookies.
const http = axios.create({ withCredentials: true });

const SHELL_HEIGHT = "calc(100dvh - var(--reorder-offset, 0px))";
const UNASSIGNED = "__none__"; // the key of the list that has no supplier

// "Sale based" knobs. The backend accepts any 1–365 / 1–180; these are the ones on offer.
const PERIODS = [7, 30, 90]; // how far back to look at sales
const COVERS = [7, 15, 30]; // how many days of selling the order should last
const EMAIL_PREF_KEY = "caredesk:po-email-on-generate"; // remembers the "email the PDF" tick
const DEFAULT_PERIOD = 30;
const DEFAULT_COVER = 15;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
// today as YYYY-MM-DD in the browser's own time zone (for the "Receive by" date's minimum)
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;

/* The same arithmetic priceOrderLine() does on the server, so the figure on
   screen is the figure that gets saved: strips x rate. (Orders carry no GST or discount —
   they are worked out on the supplier's invoice when the stock is received.) */
function priceLine(l) {
  const qty = Number(l.quantity) || 0;
  const rate = Number(l.purchase_price) || 0;
  const gross = money(qty * rate);
  return { gross, tax: 0, total: gross };
}

/* What stops a line being SAVED AS A DRAFT: only things the server would refuse. */
function draftProblem(l) {
  const q = Number(l.quantity);
  if (!Number.isInteger(q) || q <= 0)
    return "Quantity must be a whole number above 0";
  const r = Number(l.purchase_price);
  if (!Number.isFinite(r) || r < 0) return "Rate can't be negative";
  return null;
}

/* What stops a line being PLACED on an order: the same as a draft. There is no rate on this
   screen — the order carries the last purchase rate (or none, for a medicine never bought), and
   the real rate is entered from the supplier's bill when the stock is received. */
const lineProblem = draftProblem;

async function apiMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

/* A preview line → the editable row this page works with. */
const toRow = (l, supplierId, supplierName, inactive) => ({
  uid: `m${l.medicine_id}`,
  medicine_id: l.medicine_id,
  medicine: l.medicine,
  dosage_form: l.dosage_form,
  medicine_code: l.medicine_code,
  current_stock: l.current_stock, // whole strips
  stock_tablets: l.stock_tablets ?? null,
  stock_text: l.stock_text || null, // "4 strips + 5 tablets"
  units_per_pack: Number(l.units_per_pack) || 1,
  pack_size: l.pack_size || null,
  pack_word: l.pack_word || "strip",
  reorder_level: l.reorder_level,
  reorder_level_is_default: l.reorder_level_is_default,
  on_order: l.on_order,
  stock_status: l.stock_status,
  suggested_quantity: l.suggested_quantity,
  last_purchase_date: l.last_purchase_date,
  last_supplier_name: l.last_supplier_name || null,
  // sale based only; null on a normal line
  sold_qty: l.sold_qty ?? null, // strips
  sold_tablets: l.sold_tablets ?? null,
  avg_daily: l.avg_daily ?? null, // strips a day
  days_left: l.days_left ?? null,
  supplier_id: supplierId,
  supplier_name: supplierName,
  supplier_inactive: !!inactive,
  // nothing to order means the open PO already covers it — off by default,
  // but still on screen so the pharmacist can see why
  include: l.suggested_quantity > 0,
  quantity: l.suggested_quantity > 0 ? l.suggested_quantity : 1,
  purchase_price: l.purchase_price ?? 0,
  mrp: l.mrp ?? 0,
  added: false,
  touched: false, // the pharmacist has changed this line (or put it here) — it is work worth keeping
});

/**
 * Measures where this screen begins and sizes it to the rest of the window, so
 * it never runs past the bottom and makes the browser scroll.
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
      if (Math.abs(top - lastTop.current) < 1) return;
      lastTop.current = top;
      setHeight(`calc(100dvh - ${top}px)`);
    };
    measure();
    window.addEventListener("resize", measure);
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
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

/* A number the pharmacist types over — plain, like a bill: no box, an underline shows on
   hover and focus. Text, not type=number: a spinner that silently rounds, or a scroll wheel
   that changes an order quantity, is worse than letting a bad value show and be flagged. */
function NumCell({ value, onChange, width, disabled, error, label }) {
  return (
    <Box
      component="input"
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.target.select()}
      inputMode="decimal"
      sx={{
        width: width || "100%",
        minWidth: 0,
        height: 30,
        px: 0.75,
        font: "inherit",
        fontSize: 13.5,
        fontWeight: 600,
        textAlign: "right",
        ...nums,
        outline: "none",
        border: 0,
        borderRadius: 1,
        color: error ? "error.main" : "text.primary",
        bgcolor: error
          ? (t) => alpha(t.palette.error.main, 0.06)
          : "transparent",
        boxShadow: (t) =>
          `inset 0 -1px 0 ${error ? t.palette.error.main : t.palette.divider}`,
        transition: "background-color .12s, box-shadow .12s",
        "&:hover:not(:disabled)": {
          bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
        },
        "&:focus": {
          bgcolor: "background.paper",
          boxShadow: (t) =>
            `inset 0 -2px 0 ${t.palette[error ? "error" : "primary"].main}`,
        },
        "&:disabled": {
          color: "text.disabled",
          boxShadow: "none",
          cursor: "default",
        },
      }}
    />
  );
}

/* What the order is counted in for this medicine: "strip" / "bottle" … */
const packOf = (row) => String(row.pack_word || "strip").toLowerCase();
/* "strip of 10", "100 ml", "bottle" */
const packLabel = (row) =>
  row.units_per_pack > 1
    ? `${packOf(row)} of ${row.units_per_pack}`
    : String(row.pack_size || "").trim() || packOf(row);
/* "4 strips" */
const packs = (row, n) => `${n} ${unitPlural(packOf(row), n)}`;
/* loose tablets beside the whole packs, when the server sent the tablet count */
const looseOf = (row) =>
  row.stock_tablets != null && row.units_per_pack > 1
    ? Math.max(
        0,
        Number(row.stock_tablets) -
          Number(row.current_stock || 0) * row.units_per_pack,
      )
    : 0;

/* How a medicine stands, as two short lines of text: the stock, and what it means. */
function stockLines(row, cover) {
  const loose = looseOf(row);
  const none =
    row.stock_status === "out_of_stock" &&
    !(row.stock_tablets > 0) &&
    !(row.current_stock > 0);
  const main = none
    ? "Out of stock"
    : packs(row, Number(row.current_stock) || 0);
  const mainColor =
    row.stock_status === "out_of_stock"
      ? "error.main"
      : row.sold_qty == null && !row.added
        ? "warning.dark"
        : "text.primary";
  const bits = [];
  if (loose > 0) bits.push(`+ ${loose} ${unitPlural("tablet", loose)}`);
  let subColor = "text.secondary";
  if (row.sold_qty != null) {
    if (row.days_left != null && !none) {
      bits.push(
        `lasts ${row.days_left} ${row.days_left === 1 ? "day" : "days"}`,
      );
      if (row.days_left < Math.min(3, cover)) subColor = "error.main";
    }
  } else if (!row.added && row.reorder_level != null) {
    bits.push(`reorder at ${row.reorder_level}`);
  }
  return { main, mainColor, sub: bits.join(" · "), subColor };
}

/* A small native select, styled as plain text with a caret. */
function PlainSelect({ value, options, onChange, label, disabled }) {
  return (
    <Box
      component="select"
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      sx={{
        font: "inherit",
        fontSize: 13,
        fontWeight: 700,
        color: "text.primary",
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        borderRadius: 1.5,
        height: 32,
        pl: 1,
        pr: 0.5,
        cursor: "pointer",
        outline: "none",
        "&:hover": { borderColor: "text.disabled" },
        "&:focus-visible": { borderColor: "primary.main" },
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o} days
        </option>
      ))}
    </Box>
  );
}

/* One supplier list as a tab: name on top, medicines · amount under it. */
function SupplierTab({ list, active, onClick }) {
  const none = list.key === UNASSIGNED;
  const warn = none || list.supplier_inactive;
  return (
    <Box
      component="button"
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      sx={{
        flexShrink: 0,
        maxWidth: 240,
        px: 1.75,
        pt: 1,
        pb: 0.9,
        border: 0,
        bgcolor: "transparent",
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
        color: "text.primary",
        boxShadow: (t) =>
          active
            ? `inset 0 -2.5px 0 ${t.palette[warn ? "warning" : "primary"].main}`
            : "none",
        transition: "background-color .12s",
        "&:hover": { bgcolor: (t) => alpha(t.palette.text.primary, 0.035) },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: -2,
        },
      }}
    >
      <Typography
        noWrap
        sx={{
          fontSize: 13.5,
          fontWeight: active ? 800 : 600,
          color: warn
            ? "warning.dark"
            : active
              ? "text.primary"
              : "text.secondary",
        }}
      >
        {none ? "No supplier" : list.supplier_name}
        {list.supplier_inactive ? " · inactive" : ""}
      </Typography>
      <Typography
        noWrap
        sx={{ fontSize: 11.5, color: "text.secondary", ...nums }}
      >
        {list.lines.length
          ? `${list.chosen} of ${plural(list.lines.length, "medicine")}`
          : "Empty"}
      </Typography>
    </Box>
  );
}

/* Follows an element's width, so the lines can switch between one row and a stacked card.
   Returns a callback ref: the list area comes and goes (loading, empty list), and this follows it. */
function useWidth() {
  const [el, setEl] = useState(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!el) return undefined;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width];
}

/* ================================================================== */
/* Screen                                                              */
/* ================================================================== */
function AutoReorderPage({ variant }) {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"));
  const [shellRef, shellHeight] = useFitsWindow(SHELL_HEIGHT);
  const primary = theme.palette.primary.main;

  // Generate PO and Sale-based Order are separate menu pages with a permission each.
  // There is nothing to "view" here — you open the page to raise an order — so one
  // permission governs both seeing the page and saving from it.
  const salesMode = variant === "sales";
  const pagePerm = salesMode
    ? "pharmacy.purchase.salebased_create"
    : "pharmacy.purchase.generate_create";
  const { loading: accessLoading, can } = useAccess();
  const canView = can(pagePerm);
  const canCreate = canView;

  const navigate = useNavigate();
  const location = useLocation();

  // the branch the order is for (staff: their own; the admin of several branches picks one)
  const br = usePharmacyBranch({ allowAll: false });
  const branchKey = br.loading ? "…" : br.needsChoice ? "" : br.branch || "-";

  const [days, setDays] = useState(DEFAULT_PERIOD);
  const [coverDays, setCoverDays] = useState(DEFAULT_COVER);
  const [listEdited, setListEdited] = useState(false); // lines were taken off / the list cleared
  const [confirm, setConfirm] = useState(null); // { title, body, run }

  const [rows, setRows] = useState([]);
  const [notes, setNotes] = useState([]);
  const [notesOpen, setNotesOpen] = useState(true);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [extras, setExtras] = useState([]); // lists started by hand that have no lines yet
  const [sel, setSel] = useState(null); // the key of the list on show

  const [suppliers, setSuppliers] = useState([]);
  const [pick, setPick] = useState(null); // { kind: "start" | "move", rows?, whole?, fromKey? }
  const [pickTo, setPickTo] = useState(null);
  const [doneAnchor, setDoneAnchor] = useState(null); // the "Saved" button, when its list is open
  const [listRef, listWidth] = useWidth();
  const tabsRef = useRef(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addOptions, setAddOptions] = useState([]);
  const [addBusy, setAddBusy] = useState(false);
  const [addedNow, setAddedNow] = useState(0);
  const addTimer = useRef();
  const loadSeq = useRef(0);

  const [emailPdf, setEmailPdf] = useState(() => {
    try {
      return localStorage.getItem(EMAIL_PREF_KEY) === "1";
    } catch (_) {
      return false;
    }
  });
  const [receiveBy, setReceiveBy] = useState(""); // "Receive by" date (YYYY-MM-DD), optional
  const [sendOrder, setSendOrder] = useState(null); // the order whose Send dialog is open
  const [emailed, setEmailed] = useState({}); // id → { status, to?, error? }
  const [done, setDone] = useState([]); // orders saved on this screen, newest first

  const [saving, setSaving] = useState(null); // "draft" | "ordered"
  const [result, setResult] = useState(null);
  const [leave, setLeave] = useState(null); // { proceed, busy, error } — the "save before leaving?" popup
  const [snack, setSnack] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const notify = (message, severity = "success") =>
    setSnack({ open: true, severity, message });

  const toggleEmailPdf = (on) => {
    setEmailPdf(on);
    try {
      localStorage.setItem(EMAIL_PREF_KEY, on ? "1" : "0");
    } catch (_) {
      /* a private window — the tick just isn't remembered */
    }
  };

  /* ---------- load the preview ---------- */
  const branchParams = useMemo(
    () => (br.branch && br.isAdmin ? { branch: br.branch } : {}),
    [br.branch, br.isAdmin],
  );
  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    const seq = ++loadSeq.current;
    // no branch picked yet (admin, several branches) → nothing to work out
    if (branchKey === "…") return;
    if (branchKey === "") {
      setRows([]);
      setNotes([]);
      setSummary(null);
      setExtras([]);
      setSel(null);
      setListEdited(false);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = salesMode
        ? await http.get(`${PO_API}/sales-preview`, {
            params: { days, cover_days: coverDays, ...branchParams },
          })
        : await http.get(`${PO_API}/auto-preview`, { params: branchParams });
      if (seq !== loadSeq.current) return; // a newer request has taken over
      const d = r.data.data;
      setRows([
        ...d.groups.flatMap((g) =>
          g.lines.map((l) =>
            toRow(
              l,
              g.supplier_id,
              g.supplier_name,
              g.supplier_inactive || g.supplier_missing,
            ),
          ),
        ),
        ...d.unassigned.lines.map((l) => toRow(l, null, null, false)),
      ]);
      setNotes(d.notes || []);
      setNotesOpen(true);
      setSummary(d.summary || null);
      setExtras([]);
      setSel(null);
      setListEdited(false);
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setError(await apiMessage(e, "Couldn't work out what needs ordering"));
      setRows([]);
      setNotes([]);
      setSummary(null);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [canView, salesMode, days, coverDays, branchKey, branchParams]);

  useEffect(() => {
    if (!accessLoading) load();
  }, [accessLoading, load]);

  /* suppliers, for starting lists and moving lines */
  useEffect(() => {
    if (!canView) return;
    http
      .get(`${PO_API}/suppliers`)
      .then((r) => setSuppliers(r.data.data || []))
      .catch(() => setSuppliers([]));
  }, [canView]);

  /* ---------- catalog search, for adding a medicine that isn't low ---------- */
  useEffect(() => {
    if (!addOpen) return undefined;
    clearTimeout(addTimer.current);
    addTimer.current = setTimeout(async () => {
      setAddBusy(true);
      try {
        const r = await http.get(`${PO_API}/medicine-search`, {
          params: { q: addQuery.trim(), limit: 25, ...branchParams },
        });
        setAddOptions(r.data.data || []);
      } catch (e) {
        setAddOptions([]);
      } finally {
        setAddBusy(false);
      }
    }, 300);
    return () => clearTimeout(addTimer.current);
  }, [addQuery, addOpen, branchParams]);

  /* ---------- derived: the lists ---------- */
  const lists = useMemo(() => {
    const by = new Map();
    const ensure = (key, base) => {
      if (!by.has(key)) {
        by.set(key, {
          key,
          supplier_id: base.supplier_id ?? null,
          supplier_name: base.supplier_name ?? null,
          supplier_inactive: !!base.supplier_inactive,
          lines: [],
        });
      }
      return by.get(key);
    };
    for (const r of rows) ensure(r.supplier_id ?? UNASSIGNED, r).lines.push(r);
    for (const x of extras) ensure(x.key, x);
    return [...by.values()]
      .map((g) => {
        const ready = g.lines.filter((l) => l.include && !lineProblem(l));
        return {
          ...g,
          chosen: g.lines.filter((l) => l.include).length,
          units: ready.reduce((s, l) => s + (Number(l.quantity) || 0), 0),
          total: money(ready.map(priceLine).reduce((s, p) => s + p.total, 0)),
          // worked on and still wanted: this is what would be lost by walking away
          work: g.lines.some((l) => l.touched && l.include),
        };
      })
      .sort((a, b) => {
        if (a.key === UNASSIGNED) return -1; // it needs a decision, so it goes first
        if (b.key === UNASSIGNED) return 1;
        return String(a.supplier_name).localeCompare(String(b.supplier_name));
      });
  }, [rows, extras]);

  const keys = lists.map((l) => l.key);
  // A list is always on show — the first real supplier, or "No supplier" if that is all there is.
  const firstKey = keys.find((k) => k !== UNASSIGNED) ?? keys[0] ?? null;
  const activeKey = keys.includes(sel) ? sel : firstKey;
  const active = lists.find((l) => l.key === activeKey) || null;
  const activeNone = !!active && active.key === UNASSIGNED;

  /* keep the tab on show scrolled into view (a new list, a moved one, a phone) */
  useEffect(() => {
    const bar = tabsRef.current;
    const tab = bar && bar.querySelector('[aria-selected="true"]');
    if (tab && typeof tab.scrollIntoView === "function")
      tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeKey]);

  const dirty = listEdited || rows.some((r) => r.touched);
  const workLists = useMemo(() => lists.filter((l) => l.work), [lists]);
  const unsaved = canCreate && workLists.length > 0;

  const totals = useMemo(() => {
    const chosenRows = rows.filter((r) => r.include);
    const good = chosenRows.filter((l) => !lineProblem(l));
    return {
      lists: lists.filter((l) => l.chosen > 0).length,
      chosen: chosenRows.length,
      units: good.reduce((s, l) => s + (Number(l.quantity) || 0), 0),
      grand: money(good.map(priceLine).reduce((s, p) => s + p.total, 0)),
      outOfStock: rows.filter((r) => r.stock_status === "out_of_stock").length,
      sold: rows.reduce((s, r) => s + (Number(r.sold_qty) || 0), 0),
    };
  }, [rows, lists]);

  /* What stops this list being saved as a draft / placed. */
  const blockFor = useCallback(
    (list, status) => {
      const out = [];
      if (!list) return ["Pick a list first"];
      const ticked = list.lines.filter((l) => l.include);
      if (!ticked.length) out.push("Tick at least one medicine");
      if (status === "ordered" && !list.supplier_id)
        out.push(
          "Choose a supplier to place this order — or save the list as a draft",
        );
      if (list.supplier_id && list.supplier_inactive)
        out.push(
          `${list.supplier_name} is inactive — choose another supplier, or reactivate it`,
        );
      const bad = ticked.filter((l) =>
        status === "ordered" ? lineProblem(l) : draftProblem(l),
      ).length;
      if (bad)
        out.push(
          `${plural(bad, "line")} ${bad === 1 ? "has" : "have"} a value to fix`,
        );
      if (receiveBy && receiveBy < todayStr())
        out.push("The receive-by date is in the past");
      return out;
    },
    [receiveBy],
  );
  const draftBlock = active ? blockFor(active, "draft") : [];
  const orderBlock = active ? blockFor(active, "ordered") : [];

  /* ---------- edits ---------- */
  const patch = (uid, field, value) =>
    setRows((prev) =>
      prev.map((r) =>
        r.uid === uid ? { ...r, [field]: value, touched: true } : r,
      ),
    );

  const removeRow = (uid) => {
    setListEdited(true);
    setRows((prev) => prev.filter((r) => r.uid !== uid));
  };

  const tickList = (list, on) =>
    setRows((prev) =>
      prev.map((r) =>
        (r.supplier_id ?? UNASSIGNED) === list.key
          ? { ...r, include: on, touched: true }
          : r,
      ),
    );

  /* Start a list for a supplier (or none). If it exists already, just open it. */
  const startList = (sup) => {
    const key = sup ? sup.id : UNASSIGNED;
    if (!lists.some((l) => l.key === key)) {
      setExtras((prev) => [
        ...prev,
        {
          key,
          supplier_id: sup ? sup.id : null,
          supplier_name: sup ? sup.supplier_name : null,
          supplier_inactive: false,
        },
      ]);
    }
    setSel(key);
    setPick(null);
    setPickTo(null);
  };

  /* Medicines are added to the list on show. */
  const addMedicine = (m) => {
    const there = rows.find((r) => r.medicine_id === m.medicine_id);
    if (there) {
      notify(
        `${m.medicine} is already on ${there.supplier_id ? `${there.supplier_name}'s` : "the no-supplier"} list`,
        "info",
      );
      return;
    }
    if (!active) return;
    setRows((prev) => [
      {
        ...toRow(
          { ...m, suggested_quantity: Math.max(m.suggested_quantity || 0, 1) },
          active.supplier_id,
          active.supplier_name,
          active.supplier_inactive,
        ),
        added: true,
        include: true,
        touched: true,
      },
      ...prev,
    ]);
    setAddedNow((n) => n + 1);
    setAddQuery("");
    notify(`${m.medicine} added`);
  };

  const openAdd = () => {
    setAddedNow(0);
    setAddQuery("");
    setAddOpen(true);
  };

  /* Move lines (one, or the whole list) to another supplier — or to none. */
  const applyMove = (sup) => {
    if (!pick || pick.kind !== "move") return;
    const ids = new Set(pick.rows.map((r) => r.uid));
    setRows((prev) =>
      prev.map((r) =>
        ids.has(r.uid)
          ? {
              ...r,
              supplier_id: sup ? sup.id : null,
              supplier_name: sup ? sup.supplier_name : null,
              supplier_inactive: false,
              touched: true,
            }
          : r,
      ),
    );
    if (pick.whole) {
      setExtras((prev) => prev.filter((x) => x.key !== pick.fromKey));
      setSel(sup ? sup.id : UNASSIGNED);
    }
    setPick(null);
    setPickTo(null);
  };

  /* Anything that throws the work away asks first, if there is something to lose. */
  const guard = (title, body, run) => {
    if (!dirty) run();
    else setConfirm({ title, body, run });
  };

  const pickPeriod = (v) => {
    if (!v || v === days) return;
    guard(
      "Recalculate and lose your changes?",
      "Changing the period rebuilds the suggestions from scratch.",
      () => setDays(v),
    );
  };
  const pickCover = (v) => {
    if (!v || v === coverDays) return;
    guard(
      "Recalculate and lose your changes?",
      "Changing the cover rebuilds the suggestions from scratch.",
      () => setCoverDays(v),
    );
  };
  const reload = () =>
    guard(
      "Check again and lose your changes?",
      "The lists will be rebuilt from today's stock.",
      load,
    );
  // the branch picker, asking first when there is work to lose
  const branchState = {
    ...br,
    setBranch: (b) => {
      if ((b || "") === (br.branch || "")) return;
      guard(
        "Switch branch and lose your changes?",
        "The lists are worked out from each branch's own stock, sales and open orders, so they will be rebuilt.",
        () => br.setBranch(b),
      );
    },
  };
  const needBranch = branchKey === "";
  const clearAll = () =>
    guard(
      "Clear every list?",
      "Every medicine comes off. You can then start a list and add medicines by hand.",
      () => {
        setRows([]);
        setNotes([]);
        setExtras([]);
        setSel(null);
        setListEdited(true);
      },
    );
  const clearThisList = (list) => {
    const run = () => {
      setRows((prev) =>
        prev.filter((r) => (r.supplier_id ?? UNASSIGNED) !== list.key),
      );
      setExtras((prev) => prev.filter((x) => x.key !== list.key));
      setSel(null);
      setListEdited(true);
    };
    if (list.lines.some((l) => l.touched)) {
      setConfirm({
        title: "Remove this list?",
        body: `${list.key === UNASSIGNED ? "The no-supplier list" : `${list.supplier_name}'s list`} and the changes you made to it will be dropped.`,
        run,
      });
    } else run();
  };

  /* ---------- saving ---------- */
  const post = (targets, status, withEmail) =>
    http.post(`${PO_API}/auto-generate`, {
      status,
      ...branchParams, // deliver-to (staff: the server uses their own branch)
      // a low-stock top-up is an out_of_stock order; one sized from sales is a planned new_order
      order_type: salesMode ? "new_order" : "out_of_stock",
      expected_delivery_date: receiveBy || undefined,
      notes: salesMode
        ? `Sale based: last ${days} days of sales, covering ${coverDays} days`
        : undefined,
      // only a placed order is mailed — a draft isn't something to send a supplier yet
      send_email: withEmail ? true : undefined,
      groups: targets.map((l) => ({
        supplier_id: l.supplier_id ?? null,
        items: l.lines
          .filter((x) => x.include)
          .map((x) => ({
            medicine_id: x.medicine_id,
            quantity: Number(x.quantity),
            purchase_price: Number(x.purchase_price) || 0,
            mrp: Number(x.mrp) || 0,
          })),
      })),
    });

  /* The saved lists leave the screen; whatever wasn't ticked stays where it was. */
  const afterSaved = (resp, status) => {
    const created = resp.data || [];
    const savedKeys = new Set(created.map((o) => o.supplier_id ?? UNASSIGNED));
    setRows((prev) =>
      prev.filter(
        (r) => !(savedKeys.has(r.supplier_id ?? UNASSIGNED) && r.include),
      ),
    );
    setExtras((prev) => prev.filter((x) => !savedKeys.has(x.key)));
    setDone((prev) => [
      ...created.map((o) => ({
        id: o.id,
        purchase_number: o.purchase_number,
        supplier_id: o.supplier_id ?? null,
        supplier_name: o.supplier_name || null,
        status,
        grand_total: o.grand_total,
        lines: (o.items || []).length,
      })),
      ...prev,
    ]);
    setEmailed((prev) => ({
      ...prev,
      ...Object.fromEntries(
        created.filter((o) => o.email).map((o) => [o.id, o.email]),
      ),
    }));
  };

  /* Save or place the list on show. One list, one supplier, one order. */
  const generateList = async (status) => {
    const blockers = blockFor(active, status);
    if (blockers.length) {
      notify(blockers[0], "warning");
      return;
    }
    setSaving(status);
    try {
      const r = await post(
        [active],
        status,
        status === "ordered" && emailPdf && !!active.supplier_id,
      );
      afterSaved(r.data, status);
      setResult({ ...r.data, status });
    } catch (e) {
      notify(await apiMessage(e, "Couldn't raise the purchase order"), "error");
    } finally {
      setSaving(null);
    }
  };

  /* The leave popup's "Save to drafts": every list worked on, one draft each. */
  const saveWorkAsDrafts = async () => {
    for (const l of workLists) {
      const b = blockFor(l, "draft");
      if (b.length) {
        setLeave((p) => ({
          ...p,
          error: `${l.key === UNASSIGNED ? "No supplier" : l.supplier_name}: ${b[0]}`,
        }));
        return;
      }
    }
    const proceed = leave.proceed;
    setLeave((p) => ({ ...p, busy: true, error: null }));
    try {
      const r = await post(workLists, "draft", false);
      afterSaved(r.data, "draft");
      const skipped = r.data.summary?.skipped || [];
      if (skipped.length) {
        setLeave((p) => ({
          ...p,
          busy: false,
          error: skipped.map((s) => s.reason).join(" · "),
        }));
        return;
      }
      setLeave(null);
      proceed();
    } catch (e) {
      const msg = await apiMessage(e, "Couldn't save the drafts");
      setLeave((p) => ({ ...p, busy: false, error: msg }));
    }
  };

  /* Moving to another section with work that isn't saved asks first. */
  useLeaveGuard(unsaved && !saving, (proceed) =>
    setLeave({ proceed, busy: false, error: null }),
  );

  const goToOrders = () => {
    // this page lives at …/generate-purchase-order or …/sale-based-order; Purchase orders sits beside it
    const next = location.pathname.replace(/[^/]+\/?$/, "purchase-orders");
    navigate(next === location.pathname ? "/pharmacy/purchase-orders" : next);
  };

  /* ---------- no permission ---------- */
  if (!accessLoading && !canView) {
    return (
      <Box
        sx={{
          height: shellHeight,
          maxHeight: "86vh",
          display: "flex",
          overflow: "hidden",
          bgcolor: "background.default",
        }}
      >
        <AccessDenied
          what={salesMode ? "Sale-based order" : "Generate purchase order"}
        />
      </Box>
    );
  }

  // One row per medicine when there is room for it; a stacked card when there isn't (a phone,
  // or a narrow window with the sidebar open). Item Name · In stock · (Sold) · Qty · On order ·
  // Action. No money here: the order carries the last purchase rate behind the scenes, and the
  // real rates, discount, scheme and GST are entered from the supplier's bill when it is received.
  const COLS = salesMode
    ? "minmax(200px, 2.2fr) minmax(128px, 1fr) minmax(100px, 0.8fr) minmax(130px, 1fr) minmax(100px, 0.8fr) 80px"
    : "minmax(200px, 2.4fr) minmax(128px, 1fr) minmax(130px, 1fr) minmax(100px, 0.8fr) 80px";
  const wide = listWidth >= (salesMode ? 840 : 720);
  const nothingAtAll = !loading && !error && !lists.length;
  const allTicked =
    !!active && active.lines.length > 0 && active.lines.every((l) => l.include);
  const someTicked = !!active && active.lines.some((l) => l.include);

  const pickMove = (rowsToMove, whole) => {
    setPickTo(null);
    setPick({
      kind: "move",
      rows: rowsToMove,
      whole: !!whole,
      fromKey: active ? active.key : null,
    });
  };
  const startPick = () => {
    setPickTo(null);
    setPick({ kind: "start" });
  };

  // the one line under the title
  const summaryLine = (() => {
    if (needBranch) return "Pick the branch you are ordering for";
    if (loading && !rows.length)
      return salesMode ? "Reading your sales…" : "Checking stock…";
    const bits = [];
    if (salesMode)
      bits.push(
        `Sold in the last ${days} days, stocked for the next ${coverDays}`,
      );
    bits.push(plural(rows.length, "medicine"));
    if (lists.length) bits.push(plural(lists.length, "supplier"));
    if (!salesMode && totals.outOfStock)
      bits.push(`${totals.outOfStock} out of stock`);
    if (!dirty && summary?.already_on_order > 0)
      bits.push(`${summary.already_on_order} already on order`);
    return bits.join(" · ");
  })();

  /* ---------- the orders already saved on this screen ---------- */
  const renderDone = () => (
    <Stack divider={<Divider />}>
      {done.map((o) => {
        const em = emailed[o.id];
        const canSend = !!o.supplier_id;
        return (
          <Box
            key={o.id}
            sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.9 }}
          >
            <CheckCircleIcon
              sx={{ fontSize: 18, color: "success.main", flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{ fontSize: 13, fontWeight: 800, ...nums }}
                noWrap
              >
                {o.purchase_number}
              </Typography>
              <Typography
                sx={{ fontSize: 11.5, color: "text.secondary" }}
                noWrap
              >
                {o.supplier_name || "No supplier"} ·{" "}
                {o.status === "ordered" ? "placed" : "draft"}
                {em?.status === "sent" ? " · emailed" : ""} ·{" "}
                {plural(o.lines, "medicine")}
              </Typography>
            </Box>
            {canSend && (
              <Tooltip
                title={`Send ${o.purchase_number} to ${o.supplier_name}`}
              >
                <IconButton
                  size="small"
                  aria-label={`Send ${o.purchase_number} to ${o.supplier_name}`}
                  onClick={() => {
                    setDoneAnchor(null);
                    setSendOrder({
                      id: o.id,
                      purchase_number: o.purchase_number,
                      supplier_name: o.supplier_name,
                    });
                  }}
                >
                  <SendOutlinedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      })}
    </Stack>
  );

  /* ---------- one medicine ---------- */
  const renderLine = (l) => {
    const q = Number(l.quantity);
    const qErr = !Number.isInteger(q) || q <= 0;
    const problem = l.include && draftProblem(l);
    const st = stockLines(l, coverDays);
    const meta =
      problem ||
      [
        packLabel(l),
        l.dosage_form,
        l.medicine_code,
        l.added ? "added by you" : null,
      ]
        .filter(Boolean)
        .join(" · ");
    const word = packOf(l);
    const off = !l.include || !canCreate;

    // the actions, as icons — the name shows on hover
    const actions = canCreate ? (
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.25 }}>
        <Tooltip title="Move to another supplier" arrow>
          <IconButton
            size="small"
            aria-label={`Move ${l.medicine} to another supplier`}
            onClick={() => pickMove([l], false)}
            sx={{
              color: "text.secondary",
              "&:hover": { color: "primary.main" },
            }}
          >
            <SwapHorizOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Take off the list" arrow>
          <IconButton
            size="small"
            aria-label={`Take ${l.medicine} off the list`}
            onClick={() => removeRow(l.uid)}
            sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    ) : null;

    const tick = (
      <Box
        component="input"
        type="checkbox"
        checked={l.include}
        disabled={!canCreate}
        onChange={(e) => patch(l.uid, "include", e.target.checked)}
        aria-label={`Include ${l.medicine}`}
        sx={{
          m: 0,
          width: 16,
          height: 16,
          flexShrink: 0,
          cursor: "pointer",
          accentColor: primary,
        }}
      />
    );

    const name = (
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}
          noWrap
          title={l.medicine}
        >
          {l.medicine}
        </Typography>
        <Typography
          sx={{
            fontSize: 11.5,
            color: problem ? "error.main" : "text.secondary",
            lineHeight: 1.35,
          }}
          noWrap
          title={meta}
        >
          {meta}
        </Typography>
      </Box>
    );

    const qtyCell = (inputWidth) => (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}
      >
        <NumCell
          value={l.quantity}
          onChange={(v) => patch(l.uid, "quantity", v)}
          width={inputWidth}
          error={qErr && l.include}
          disabled={off}
          label={`${unitPlural(word, 2)} for ${l.medicine}`}
        />
        <Typography
          sx={{ fontSize: 12, color: "text.secondary", minWidth: 0 }}
          noWrap
        >
          {unitPlural(word, q)}
        </Typography>
      </Box>
    );

    const rowSx = {
      px: { xs: 1.5, md: 2 },
      py: 0.85,
      opacity: l.include ? 1 : 0.6,
      bgcolor: problem ? alpha(theme.palette.error.main, 0.05) : "transparent",
      transition: "background-color .12s, opacity .12s",
      "&:hover": {
        bgcolor: problem ? undefined : alpha(theme.palette.text.primary, 0.025),
        opacity: 1,
      },
    };

    if (!wide) {
      const soldText =
        l.sold_qty != null
          ? `sold ${packs(l, Number(l.sold_qty) || 0)} · ${l.avg_daily}/day`
          : null;
      return (
        <Box key={l.uid} sx={rowSx}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
            <Box sx={{ pt: 0.4 }}>{tick}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>{name}</Box>
            <Box sx={{ mt: -0.5, mr: -0.75, flexShrink: 0 }}>{actions}</Box>
          </Box>
          <Box sx={{ pl: "28px" }}>
            <Typography sx={{ fontSize: 12, mt: 0.25, ...nums }} noWrap>
              <Box
                component="span"
                sx={{ fontWeight: 700, color: st.mainColor }}
              >
                {st.main}
              </Box>
              {st.sub && (
                <Box component="span" sx={{ color: st.subColor }}>
                  {" "}
                  · {st.sub}
                </Box>
              )}
              {soldText && (
                <Box component="span" sx={{ color: "text.secondary" }}>
                  {" "}
                  · {soldText}
                </Box>
              )}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                columnGap: 2,
                rowGap: 0.5,
                mt: 0.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                  Qty
                </Typography>
                {qtyCell(60)}
              </Box>
              {l.on_order > 0 && (
                <Typography
                  sx={{
                    fontSize: 11.5,
                    color: "info.main",
                    fontWeight: 600,
                    ...nums,
                  }}
                >
                  {packs(l, l.on_order)} on order
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      );
    }

    return (
      <Box
        key={l.uid}
        sx={{
          ...rowSx,
          display: "grid",
          gridTemplateColumns: COLS,
          columnGap: "16px",
          alignItems: "center",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}
        >
          {tick}
          {name}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{ fontSize: 13, fontWeight: 700, color: st.mainColor, ...nums }}
            noWrap
          >
            {st.main}
          </Typography>
          {st.sub && (
            <Typography
              sx={{ fontSize: 11.5, color: st.subColor, ...nums }}
              noWrap
              title={st.sub}
            >
              {st.sub}
            </Typography>
          )}
        </Box>
        {salesMode && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, ...nums }} noWrap>
              {packs(l, Number(l.sold_qty) || 0)}
            </Typography>
            <Typography
              sx={{ fontSize: 11.5, color: "text.secondary", ...nums }}
              noWrap
            >
              {l.avg_daily}/day
            </Typography>
          </Box>
        )}
        {qtyCell(64)}
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: l.on_order ? 600 : 400,
            color: l.on_order ? "info.main" : "text.disabled",
            ...nums,
          }}
          noWrap
        >
          {l.on_order ? packs(l, l.on_order) : "—"}
        </Typography>
        {actions || <Box />}
      </Box>
    );
  };

  /* a slim one-line notice under the tabs, with an optional button */
  const strip = (tone, text, action) => (
    <Box
      sx={{
        flexShrink: 0,
        px: { xs: 1.5, md: 2 },
        py: 0.6,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: alpha(theme.palette[tone].main, 0.07),
      }}
    >
      <Typography
        sx={{ flex: 1, minWidth: 0, fontSize: 12.5, color: `${tone}.dark` }}
      >
        {text}
      </Typography>
      {action}
    </Box>
  );

  /* ================================================================ */
  return (
    <Box
      ref={shellRef}
      sx={{
        height: shellHeight,
        maxHeight: "86vh",
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
          py: 1.25,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          columnGap: 1.5,
          rowGap: 1,
        }}
      >
        <Box sx={{ minWidth: 0, flex: "1 1 240px" }}>
          <Typography
            sx={{
              fontSize: { xs: 17, md: 19 },
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1.25,
            }}
            noWrap
          >
            {salesMode ? "Sale-based order" : "Generate purchase order"}
          </Typography>
          <Typography
            sx={{ fontSize: 12.5, color: "text.secondary", ...nums }}
            noWrap
            title={summaryLine}
          >
            {summaryLine}
          </Typography>
        </Box>

        {salesMode && (
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ flexShrink: 0 }}
          >
            <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
              Sales of last
            </Typography>
            <PlainSelect
              value={days}
              options={PERIODS}
              onChange={pickPeriod}
              label="Sales period"
              disabled={loading}
            />
            <Typography
              sx={{ fontSize: 12.5, color: "text.secondary", pl: 0.5 }}
            >
              Cover
            </Typography>
            <PlainSelect
              value={coverDays}
              options={COVERS}
              onChange={pickCover}
              label="Days the order should last"
              disabled={loading}
            />
          </Stack>
        )}

        {/* while no branch is picked, the question sits in the middle of the page instead */}
        {!needBranch && (
          <Box
            sx={{
              display: { xs: br.multi ? "block" : "none", sm: "block" },
              flexShrink: 0,
            }}
          >
            <BranchPicker state={branchState} label="Order for" />
          </Box>
        )}
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ flexShrink: 0, ml: "auto" }}
        >
          {!salesMode && canCreate && (
            <Tooltip title="Empty every list and key in your own order">
              <span>
                <Button
                  size="small"
                  color="inherit"
                  onClick={clearAll}
                  disabled={loading || !rows.length}
                  sx={{ ...buttonSx, color: "text.secondary" }}
                >
                  Clear all
                </Button>
              </span>
            </Tooltip>
          )}
          <Tooltip title={salesMode ? "Read sales again" : "Check stock again"}>
            <span>
              <IconButton
                size="small"
                onClick={reload}
                disabled={loading}
                aria-label={
                  salesMode ? "Read sales again" : "Check stock again"
                }
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ height: 2, flexShrink: 0 }} />}

      {/* ---------------- tabs + list ---------------- */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {error ? (
          <Box sx={{ p: 2.5 }}>
            <Alert
              severity="warning"
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              {error}
            </Alert>
          </Box>
        ) : loading && !rows.length ? (
          <Box sx={{ bgcolor: "background.paper", flex: 1 }}>
            <Stack
              direction="row"
              spacing={2}
              sx={{
                px: 2.5,
                py: 1.25,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" width={130} height={34} />
              ))}
            </Stack>
            <Stack spacing={1} sx={{ p: 2 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rounded" height={40} />
              ))}
            </Stack>
          </Box>
        ) : needBranch ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1.5}
            sx={{ flex: 1, p: 3, textAlign: "center" }}
          >
            <IconTile
              icon={StoreOutlinedIcon}
              tone={ROLE.attention}
              size={60}
              radius={4}
            />
            <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
              Which branch are you ordering for?
            </Typography>
            <Typography
              sx={{ fontSize: 13, color: "text.secondary", maxWidth: 420 }}
            >
              Stock, sales and open orders are counted per branch, and the order
              is delivered there. Pick the branch to see what it needs.
            </Typography>
            <BranchPicker
              state={branchState}
              label="Order for"
              sx={{ minWidth: 220 }}
            />
          </Stack>
        ) : nothingAtAll ? (
          <Box
            sx={{ flex: 1, overflowY: "auto", p: 3, ...thinScroll(primary) }}
          >
            <Stack
              alignItems="center"
              spacing={1.25}
              sx={{ py: { xs: 3, md: 6 }, textAlign: "center" }}
            >
              <IconTile
                icon={
                  done.length
                    ? CheckCircleIcon
                    : dirty
                      ? EditNoteOutlinedIcon
                      : PlaylistAddCheckOutlinedIcon
                }
                tone={done.length || !dirty ? ROLE.done : ROLE.quiet}
                size={60}
                radius={4}
              />
              <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
                {done.length
                  ? "Everything on your lists is done"
                  : dirty
                    ? "Your lists are empty"
                    : salesMode
                      ? "Nothing needs ordering from your sales"
                      : "Nothing is running low"}
              </Typography>
              <Typography
                sx={{ fontSize: 13, color: "text.secondary", maxWidth: 420 }}
              >
                {done.length
                  ? "Check again to see if anything else needs ordering, or start another list."
                  : dirty
                    ? "Start a list for a supplier and add the medicines you want, or check again to bring the suggestions back."
                    : salesMode
                      ? `Everything that sold in the last ${days} days is stocked, or already ordered, for the next ${coverDays}. Try a longer cover, or start a list by hand.`
                      : "Every medicine is above its reorder level. Start a list by hand if you want to order ahead."}
              </Typography>
              {canCreate && (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ pt: 1 }}
                >
                  <Button
                    variant="contained"
                    disableElevation
                    startIcon={<StorefrontOutlinedIcon />}
                    onClick={startPick}
                    sx={buttonSx}
                  >
                    Choose a supplier
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PersonOffOutlinedIcon />}
                    onClick={() => startList(null)}
                    sx={buttonSx}
                  >
                    Medicine list without a supplier
                  </Button>
                </Stack>
              )}
              {done.length > 0 && (
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={load}
                  sx={buttonSx}
                >
                  Check again
                </Button>
              )}
            </Stack>
            {done.length > 0 && (
              <Box sx={{ maxWidth: 460, mx: "auto", mt: 1 }}>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "text.secondary",
                    letterSpacing: "0.04em",
                  }}
                >
                  SAVED JUST NOW
                </Typography>
                {renderDone()}
              </Box>
            )}
          </Box>
        ) : (
          <>
            {/* ---------------- supplier tabs ---------------- */}
            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                alignItems: "stretch",
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Box
                ref={tabsRef}
                role="tablist"
                aria-label="Supplier lists"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "stretch",
                  overflowX: "auto",
                  overflowY: "hidden",
                  px: { xs: 0.5, md: 1.25 },
                  scrollbarWidth: "thin",
                  "&::-webkit-scrollbar": { height: 4 },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: "divider",
                    borderRadius: 2,
                  },
                }}
              >
                {lists.map((l) => (
                  <SupplierTab
                    key={String(l.key)}
                    list={l}
                    active={l.key === activeKey}
                    onClick={() => setSel(l.key)}
                  />
                ))}
                {canCreate && (
                  <Tooltip title="Start a list for another supplier">
                    <IconButton
                      size="small"
                      aria-label="Start a new list"
                      onClick={startPick}
                      sx={{ alignSelf: "center", mx: 0.75, flexShrink: 0 }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {done.length > 0 && (
                <Button
                  size="small"
                  color="success"
                  startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                  onClick={(e) => setDoneAnchor(e.currentTarget)}
                  sx={{
                    ...buttonSx,
                    alignSelf: "center",
                    flexShrink: 0,
                    mx: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  Saved {done.length}
                </Button>
              )}
            </Box>

            {active && (
              <>
                {/* ---------------- list toolbar ---------------- */}
                <Box
                  sx={{
                    flexShrink: 0,
                    px: { xs: 1.5, md: 2 },
                    py: 0.75,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: "background.paper",
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  {!wide && canCreate && active.lines.length > 0 && (
                    <Box
                      component="input"
                      type="checkbox"
                      checked={allTicked}
                      ref={(el) => {
                        if (el) el.indeterminate = someTicked && !allTicked;
                      }}
                      onChange={() => tickList(active, !allTicked)}
                      aria-label={allTicked ? "Untick all" : "Tick all"}
                      sx={{
                        m: 0,
                        mr: 0.5,
                        width: 16,
                        height: 16,
                        cursor: "pointer",
                        accentColor: primary,
                      }}
                    />
                  )}
                  <Typography
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 12.5,
                      color: "text.secondary",
                      ...nums,
                    }}
                    noWrap
                  >
                    {active.lines.length
                      ? `${active.chosen} of ${plural(active.lines.length, "medicine")} ticked · ${active.units} ${active.units === 1 ? "pack" : "packs"}`
                      : "Nothing on this list yet"}
                  </Typography>
                  {canCreate && (
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={openAdd}
                      sx={{ ...buttonSx, flexShrink: 0 }}
                    >
                      Add
                      <Box
                        component="span"
                        sx={{ display: { xs: "none", sm: "inline" } }}
                      >
                        &nbsp;a medicine
                      </Box>
                    </Button>
                  )}
                  {canCreate &&
                    !activeNone &&
                    !active.supplier_inactive &&
                    active.lines.length > 0 && (
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<SwapHorizOutlinedIcon />}
                        onClick={() => pickMove(active.lines, true)}
                        sx={{
                          ...buttonSx,
                          flexShrink: 0,
                          color: "text.secondary",
                          display: { xs: "none", sm: "inline-flex" },
                        }}
                      >
                        Change supplier
                      </Button>
                    )}
                  {canCreate && (
                    <Tooltip title="Remove this list" arrow>
                      <IconButton
                        size="small"
                        aria-label="Remove this list"
                        onClick={() => clearThisList(active)}
                        sx={{
                          mr: -0.5,
                          color: "text.secondary",
                          "&:hover": { color: "error.main" },
                        }}
                      >
                        <DeleteSweepOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {/* ---------------- notices ---------------- */}
                {activeNone &&
                  strip(
                    "warning",
                    "No supplier on this list. Save it as a draft and choose one later, or choose one now to place it.",
                    canCreate && active.lines.length > 0 ? (
                      <Button
                        size="small"
                        color="warning"
                        onClick={() => pickMove(active.lines, true)}
                        sx={{ ...buttonSx, whiteSpace: "nowrap" }}
                      >
                        Choose supplier
                      </Button>
                    ) : null,
                  )}
                {!activeNone &&
                  active.supplier_inactive &&
                  strip(
                    "warning",
                    `${active.supplier_name} is marked inactive, so an order can't go to them.`,
                    canCreate && active.lines.length > 0 ? (
                      <Button
                        size="small"
                        color="warning"
                        onClick={() => pickMove(active.lines, true)}
                        sx={{ ...buttonSx, whiteSpace: "nowrap" }}
                      >
                        Change supplier
                      </Button>
                    ) : null,
                  )}
                {!!notes.length && (
                  <Collapse in={notesOpen} unmountOnExit sx={{ flexShrink: 0 }}>
                    <Alert
                      severity="info"
                      variant="outlined"
                      onClose={() => setNotesOpen(false)}
                      sx={{
                        borderRadius: 0,
                        border: 0,
                        borderBottom: 1,
                        borderColor: "divider",
                        fontSize: 12.5,
                        py: 0,
                      }}
                    >
                      <AlertTitle
                        sx={{ fontSize: 12.5, mb: notes.length > 1 ? 0.25 : 0 }}
                      >
                        {notes.length === 1
                          ? "One thing to sort out"
                          : `${notes.length} things to sort out`}
                      </AlertTitle>
                      <Stack
                        component="ul"
                        sx={{ m: 0, pl: 2.25 }}
                        spacing={0.25}
                      >
                        {notes.map((n, i) => (
                          <Typography
                            key={i}
                            component="li"
                            sx={{ fontSize: 12.5 }}
                          >
                            {n}
                          </Typography>
                        ))}
                      </Stack>
                    </Alert>
                  </Collapse>
                )}

                {/* ---------------- the lines ---------------- */}
                <Box
                  ref={listRef}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "background.paper",
                  }}
                >
                  {active.lines.length === 0 ? (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={1.25}
                      sx={{ flex: 1, p: 3, textAlign: "center" }}
                    >
                      <IconTile
                        icon={MedicationOutlinedIcon}
                        size={52}
                        radius={3.5}
                      />
                      <Typography sx={{ fontSize: 15, fontWeight: 800 }}>
                        No medicines on this list yet
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: "text.secondary",
                          maxWidth: 360,
                        }}
                      >
                        Add the medicines you want to order
                        {activeNone ? "" : ` from ${active.supplier_name}`}.
                      </Typography>
                      {canCreate && (
                        <Button
                          variant="contained"
                          disableElevation
                          startIcon={<AddIcon />}
                          onClick={openAdd}
                          sx={buttonSx}
                        >
                          Add a medicine
                        </Button>
                      )}
                    </Stack>
                  ) : (
                    <>
                      {wide && (
                        <Box
                          sx={{
                            flexShrink: 0,
                            display: "grid",
                            gridTemplateColumns: COLS,
                            columnGap: "16px",
                            alignItems: "center",
                            px: 2,
                            py: 0.75,
                            borderBottom: 1,
                            borderColor: "divider",
                            "& > *": {
                              fontSize: 12,
                              fontWeight: 700,
                              color: "text.secondary",
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.25,
                              minWidth: 0,
                            }}
                          >
                            {canCreate && (
                              <Box
                                component="input"
                                type="checkbox"
                                checked={allTicked}
                                ref={(el) => {
                                  if (el)
                                    el.indeterminate = someTicked && !allTicked;
                                }}
                                onChange={() => tickList(active, !allTicked)}
                                aria-label={
                                  allTicked ? "Untick all" : "Tick all"
                                }
                                sx={{
                                  m: 0,
                                  width: 16,
                                  height: 16,
                                  flexShrink: 0,
                                  cursor: "pointer",
                                  accentColor: primary,
                                }}
                              />
                            )}
                            <HeadTip col="item" />
                          </Box>
                          <HeadTip col="stock" />
                          {salesMode && (
                            <HeadTip col="sold" sx={{ textAlign: "left" }} />
                          )}
                          <HeadTip col="orderQty" />
                          <HeadTip col="onOrder" sx={{ textAlign: "left" }} />
                          <Box sx={{ textAlign: "right", pr: 0.5 }}>Action</Box>
                        </Box>
                      )}
                      <Box
                        sx={{
                          flex: 1,
                          minHeight: 0,
                          overflowY: "auto",
                          overflowX: "hidden",
                          overscrollBehavior: "contain",
                          ...thinScroll(primary),
                        }}
                      >
                        <Stack divider={<Divider />}>
                          {active.lines.map(renderLine)}
                        </Stack>
                      </Box>
                    </>
                  )}
                </Box>
              </>
            )}
          </>
        )}
      </Box>

      {/* ---------------- commit bar ---------------- */}
      {active && !error && !needBranch && (
        <Box
          sx={{
            flexShrink: 0,
            px: { xs: 1.5, md: 2.5 },
            py: 1,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            flexWrap: { xs: "wrap", md: "nowrap" },
            columnGap: 1.5,
            rowGap: 0.75,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1, flexBasis: { xs: "100%", md: 0 } }}>
            <Typography
              sx={{ fontSize: 15, fontWeight: 800, minWidth: 0 }}
              noWrap
            >
              {activeNone
                ? "Draft — no supplier yet"
                : `To ${active.supplier_name}`}
              <Box
                component="span"
                sx={{
                  fontWeight: 500,
                  color: "text.secondary",
                  fontSize: 13,
                  ...nums,
                }}
              >
                {branchState.branch ? ` · ${branchState.branch}` : ""} ·{" "}
                {plural(active.chosen, "medicine")} · {active.units}{" "}
                {active.units === 1 ? "pack" : "packs"}
              </Box>
            </Typography>
            {orderBlock.length > 0 && (
              <Typography
                sx={{
                  fontSize: 12.5,
                  color: "warning.dark",
                  fontWeight: 600,
                  minWidth: 0,
                }}
                noWrap
                title={orderBlock[0]}
              >
                {orderBlock[0]}
              </Typography>
            )}
          </Box>

          {canCreate && (
            <>
              <TextField
                type="date"
                size="small"
                label="Receive by"
                value={receiveBy}
                onChange={(e) => setReceiveBy(e.target.value)}
                disabled={!!saving}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: todayStr(), "aria-label": "Receive by" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonthOutlinedIcon
                        sx={{ fontSize: 17, color: "text.secondary" }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: { xs: "calc(50% - 6px)", md: 170 },
                  flexShrink: 0,
                  ...inputSx(primary, !!receiveBy),
                }}
              />
              {!activeNone && (
                <FormControlLabel
                  sx={{
                    m: 0,
                    flexShrink: 0,
                    width: { xs: "calc(50% - 6px)", md: "auto" },
                  }}
                  control={
                    <Checkbox
                      size="small"
                      checked={emailPdf}
                      onChange={(e) => toggleEmailPdf(e.target.checked)}
                      disabled={!!saving}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.2 }}>
                      Email the PDF
                    </Typography>
                  }
                />
              )}
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  width: { xs: "100%", md: "auto" },
                  flexShrink: 0,
                }}
              >
                <Button
                  variant="outlined"
                  disabled={!!saving || !!draftBlock.length}
                  onClick={() => generateList("draft")}
                  startIcon={
                    saving === "draft" ? (
                      <CircularProgress size={16} />
                    ) : (
                      <SaveOutlinedIcon />
                    )
                  }
                  sx={{ ...buttonSx, flex: { xs: 1, md: "0 0 auto" } }}
                >
                  Save as draft
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  disabled={!!saving || !!orderBlock.length}
                  onClick={() => generateList("ordered")}
                  startIcon={
                    saving === "ordered" ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SendOutlinedIcon />
                    )
                  }
                  sx={{
                    ...buttonSx,
                    px: { xs: 1.5, md: 2.5 },
                    flex: { xs: 1, md: "0 0 auto" },
                  }}
                >
                  Generate order
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* ---------------- saved just now ---------------- */}
      <Popover
        open={!!doneAnchor}
        anchorEl={doneAnchor}
        onClose={() => setDoneAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 340,
            maxWidth: "calc(100vw - 32px)",
            px: 1.75,
            py: 1,
            borderRadius: 2,
          },
        }}
      >
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 800,
            color: "text.secondary",
            letterSpacing: "0.04em",
            pt: 0.5,
          }}
        >
          SAVED JUST NOW
        </Typography>
        {renderDone()}
      </Popover>

      {/* ---------------- start a list / move lines: which supplier? ---------------- */}
      <Dialog
        open={!!pick}
        onClose={() => setPick(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            ...headWash(theme),
          }}
        >
          <IconTile
            icon={
              pick?.kind === "start"
                ? PlaylistAddCheckOutlinedIcon
                : SwapHorizOutlinedIcon
            }
            size={40}
            radius={2.5}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800 }}>
              {pick?.kind === "start" ? "Start a list" : "Which supplier?"}
            </Typography>
            <Typography
              sx={{ fontSize: 12.5, color: "text.secondary", fontWeight: 400 }}
              noWrap
            >
              {pick?.kind === "start"
                ? "Who is this order for?"
                : pick?.rows?.length > 1
                  ? `${pick.rows.length} medicines will be ordered from the supplier you choose`
                  : `${pick?.rows?.[0]?.medicine || ""}${
                      pick?.rows?.[0]?.last_purchase_date
                        ? ` — last bought ${String(pick.rows[0].last_purchase_date).slice(0, 10)}`
                        : " — never purchased before"
                    }`}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: "20px !important" }}>
          <Autocomplete
            options={suppliers}
            value={pickTo}
            onChange={(_, v) => setPickTo(v)}
            getOptionLabel={(o) => o.supplier_name || ""}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Supplier"
                autoFocus
                sx={inputSx(primary, !!pickTo)}
              />
            )}
            noOptionsText="No active suppliers — add one in Suppliers first"
          />
          <Button
            startIcon={<PersonOffOutlinedIcon />}
            onClick={() =>
              pick.kind === "start" ? startList(null) : applyMove(null)
            }
            sx={{ ...buttonSx, mt: 1.5, color: "text.secondary" }}
          >
            {pick?.kind === "start"
              ? "Start without a supplier"
              : "No supplier for now"}
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPick(null)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            disabled={!pickTo}
            onClick={() =>
              pick.kind === "start" ? startList(pickTo) : applyMove(pickTo)
            }
            sx={buttonSx}
          >
            {pick?.kind === "start"
              ? "Start list"
              : pick?.rows?.length > 1
                ? "Move them"
                : "Move it"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- are you sure ---------------- */}
      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            ...headWash(theme, ROLE.attention),
          }}
        >
          <IconTile
            icon={WarningAmberOutlinedIcon}
            tone={ROLE.attention}
            size={40}
            radius={2.5}
          />
          <Typography sx={{ fontSize: 17, fontWeight: 800 }}>
            {confirm?.title}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <Typography sx={{ fontSize: 13.5 }}>{confirm?.body}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirm(null)}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Keep my changes
          </Button>
          <Button
            variant="contained"
            color="error"
            disableElevation
            onClick={() => {
              const run = confirm.run;
              setConfirm(null);
              run();
            }}
            sx={buttonSx}
          >
            Discard and continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- leaving with unsaved lists ---------------- */}
      <Dialog
        open={!!leave}
        onClose={() => !leave?.busy && setLeave(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            ...headWash(theme, ROLE.attention),
          }}
        >
          <IconTile
            icon={SaveOutlinedIcon}
            tone={ROLE.attention}
            size={42}
            radius={2.5}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800 }}>
              Save your work before leaving?
            </Typography>
            <Typography
              sx={{ fontSize: 12.5, color: "text.secondary", fontWeight: 400 }}
            >
              {plural(workLists.length, "list")} you've worked on{" "}
              {workLists.length === 1 ? "hasn't" : "haven't"} been saved.
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <Stack spacing={0.75}>
            {workLists.map((l) => (
              <Box
                key={String(l.key)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  p: 1,
                  borderRadius: 2.5,
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <IconTile
                  icon={
                    l.key === UNASSIGNED
                      ? PersonOffOutlinedIcon
                      : StorefrontOutlinedIcon
                  }
                  tone={l.key === UNASSIGNED ? ROLE.attention : ROLE.action}
                  size={32}
                  radius={2}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }} noWrap>
                    {l.key === UNASSIGNED ? "No supplier" : l.supplier_name}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12, color: "text.secondary" }}
                    noWrap
                  >
                    {plural(l.chosen, "medicine")} · {plural(l.units, "strip")}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 1.5 }}>
            “Save to drafts” keeps each list as a draft purchase order. You can
            finish and place them from Purchase orders.
          </Typography>
          {leave?.error && (
            <Alert
              severity="error"
              variant="outlined"
              sx={{ borderRadius: 2, mt: 1.5, fontSize: 13 }}
            >
              {leave.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <Button
            color="error"
            disabled={!!leave?.busy}
            onClick={() => {
              const proceed = leave.proceed;
              setLeave(null);
              proceed();
            }}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Leave without saving
          </Button>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              disabled={!!leave?.busy}
              onClick={() => setLeave(null)}
              sx={buttonSx}
            >
              Stay here
            </Button>
            <Button
              variant="contained"
              disableElevation
              disabled={!!leave?.busy}
              onClick={saveWorkAsDrafts}
              startIcon={
                leave?.busy ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SaveOutlinedIcon />
                )
              }
              sx={buttonSx}
            >
              Save to drafts
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* ---------------- add a medicine ---------------- */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={narrow}
        PaperProps={{ sx: { borderRadius: narrow ? 0 : 3 } }}
      >
        <DialogTitle
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            ...headWash(theme),
          }}
        >
          <IconTile icon={MedicationOutlinedIcon} size={40} radius={2.5} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800 }} noWrap>
              Add a medicine
            </Typography>
            <Typography
              sx={{ fontSize: 12.5, color: "text.secondary", fontWeight: 400 }}
              noWrap
            >
              {active
                ? `To ${activeNone ? "the no-supplier list" : `${active.supplier_name}'s list`}`
                : ""}{" "}
              — anything in your catalog, low or not
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setAddOpen(false)}
            aria-label="Close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Autocomplete
            options={addOptions}
            loading={addBusy}
            filterOptions={(x) => x}
            value={null}
            inputValue={addQuery}
            onInputChange={(_, v, reason) =>
              reason !== "reset" && setAddQuery(v)
            }
            onChange={(_, v) => v && addMedicine(v)}
            getOptionLabel={(o) => o.medicine || ""}
            getOptionDisabled={(o) =>
              rows.some((r) => r.medicine_id === o.medicine_id)
            }
            isOptionEqualToValue={(a, b) => a.medicine_id === b.medicine_id}
            renderOption={(props, o) => {
              const there = rows.find((r) => r.medicine_id === o.medicine_id);
              return (
                <li {...props} key={o.medicine_id}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }} noWrap>
                      {o.medicine}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 12, color: "text.secondary" }}
                      noWrap
                    >
                      {there
                        ? `Already on ${there.supplier_id ? `${there.supplier_name}'s` : "the no-supplier"} list`
                        : [
                            o.dosage_form,
                            o.medicine_code,
                            `${o.current_stock} in stock`,
                            o.last_supplier_name &&
                              `last from ${o.last_supplier_name}`,
                          ]
                            .filter(Boolean)
                            .join("  ·  ")}
                    </Typography>
                  </Box>
                </li>
              );
            }}
            noOptionsText={
              addQuery
                ? "Nothing in the catalog matches"
                : "Start typing a medicine name"
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Medicine"
                autoFocus
                placeholder="Search by name, brand or code"
                sx={inputSx(primary, !!addQuery)}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <SearchIcon
                      sx={{
                        fontSize: 18,
                        color: "text.disabled",
                        ml: 0.5,
                        mr: 0.5,
                      }}
                    />
                  ),
                  endAdornment: (
                    <>
                      {addBusy ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Typography sx={{ flex: 1, fontSize: 12.5, color: "text.secondary" }}>
            {addedNow ? `${addedNow} added so far` : ""}
          </Typography>
          <Button
            variant="contained"
            disableElevation
            onClick={() => setAddOpen(false)}
            sx={buttonSx}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- what got raised ---------------- */}
      <Dialog
        open={!!result}
        onClose={() => {}}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            ...headWash(theme, ROLE.done),
          }}
        >
          <IconTile
            icon={CheckCircleIcon}
            tone={ROLE.done}
            size={42}
            radius={2.5}
          />
          <Typography sx={{ fontSize: 17, fontWeight: 800 }}>
            {result?.status === "ordered"
              ? "Purchase order generated"
              : "Draft saved"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <Alert
            severity="success"
            variant="outlined"
            sx={{ borderRadius: 2, mb: 2, fontSize: 13 }}
          >
            {result?.message}
          </Alert>
          <Stack divider={<Divider />} spacing={0}>
            {(result?.data || []).map((o) => {
              const em = emailed[o.id];
              return (
                <Box key={o.id} sx={{ py: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{ fontSize: 13.5, fontWeight: 800, ...nums }}
                        noWrap
                      >
                        {o.purchase_number}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary" }}
                        noWrap
                      >
                        {o.supplier_name || "No supplier yet"} ·{" "}
                        {plural((o.items || []).length, "line")}
                      </Typography>
                    </Box>
                    {o.supplier_id ? (
                      <Button
                        size="small"
                        variant={em?.status === "sent" ? "text" : "outlined"}
                        startIcon={<SendOutlinedIcon sx={{ fontSize: 16 }} />}
                        onClick={() => setSendOrder(o)}
                        aria-label={`Send ${o.purchase_number} to ${o.supplier_name}`}
                        sx={{ ...buttonSx, flexShrink: 0, py: 0.2 }}
                      >
                        {em?.status === "sent" ? "Resend" : "Send"}
                      </Button>
                    ) : null}
                  </Stack>
                  {!o.supplier_id && (
                    <Typography
                      sx={{ fontSize: 12, mt: 0.25, color: "warning.dark" }}
                    >
                      Saved without a supplier. Open it in Purchase orders to
                      choose one, then you can place and send it.
                    </Typography>
                  )}
                  {em && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        mt: 0.25,
                        color:
                          em.status === "sent"
                            ? "success.main"
                            : em.status === "no_email" ||
                                em.status === "no_supplier"
                              ? "warning.dark"
                              : "error.main",
                      }}
                    >
                      {em.status === "sent"
                        ? `Emailed to ${(em.to || []).join(", ")}`
                        : em.status === "no_email"
                          ? "Not emailed — no email address on file. Use Send to type one."
                          : em.status === "no_supplier"
                            ? "Not emailed — no supplier chosen yet."
                            : `Couldn't email: ${em.error || "unknown error"}`}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
          {!!(result?.summary?.skipped || []).length && (
            <Alert
              severity="info"
              variant="outlined"
              sx={{ borderRadius: 2, mt: 2, fontSize: 12.5 }}
            >
              <AlertTitle sx={{ fontSize: 13, mb: 0.25 }}>
                Not raised
              </AlertTitle>
              {result.summary.skipped.map((s, i) => (
                <Typography key={i} sx={{ fontSize: 12.5 }}>
                  {s.reason}
                </Typography>
              ))}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setResult(null);
              goToOrders();
            }}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            View purchase orders
          </Button>
          <Button
            onClick={() => setResult(null)}
            variant="contained"
            disableElevation
            sx={buttonSx}
          >
            {lists.length ? "Next list" : "Done"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- send one order to its supplier ---------------- */}
      {sendOrder && (
        <SendPurchaseOrderDialog
          order={sendOrder}
          onClose={() => setSendOrder(null)}
          onSent={({ id, to }) =>
            setEmailed((prev) => ({ ...prev, [id]: { status: "sent", to } }))
          }
        />
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ mb: { xs: 9, md: 7 } }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ borderRadius: 2, fontSize: 13.5 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/** The page, wrapped so it reads its colours from src/theme/appColors.js.
 *  <AutoReorder />                  Generate Purchase Order (low / out of stock)
 *  <AutoReorder variant="sales" />  Sale-based Order (what sold, stocked for N days) */
export default function AutoReorder({ variant = "normal" }) {
  return (
    <ColorRoot>
      {/* a fresh page per variant, so switching menu items never carries one's lists into the other */}
      <AutoReorderPage
        key={variant}
        variant={variant === "sales" ? "sales" : "normal"}
      />
    </ColorRoot>
  );
}
