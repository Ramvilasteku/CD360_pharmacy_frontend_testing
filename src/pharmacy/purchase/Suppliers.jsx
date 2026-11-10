// src/pages/pharmacy/Suppliers.js
//
// Suppliers — one screen. The list on the left, and on the right everything about
// the supplier you picked: their numbers, and every order you have placed with them.
//
// Layout rules this file keeps to:
//   • The page itself NEVER scrolls — not vertically, not sideways. It fills its
//     container exactly. Only two regions scroll, each on its own: the supplier
//     list, and the order list.
//   • Adding and editing open IN the page, in place of the panes (Back arrow; the list keeps
//     its search, filters and page behind it). Leaving with unsaved changes asks first.
//   • Everything about a supplier that doesn't fit in the header sits behind the
//     ⓘ icon next to their name — the full profile, also in the page.
//   • The list pages on the server (the shared pager: at most three page numbers, rows per page).
//
// If your app has a fixed top bar, tell the page how tall it is or it will run off
// the bottom of the window and the BROWSER will scroll — which is the usual cause
// of a scrollbar you didn't ask for:
//   <div style={{ "--suppliers-offset": "64px" }}><Suppliers /></div>
//
// Backend
//   routes/pharmacy/pharmacySupplier.js      @ /api/pharmacy/suppliers
//     GET    /                 list — search, status, page, limit, sort_by, sort_order
//     GET    /:id              one supplier
//     POST   /post             create
//     PUT    /:id              update
//     PATCH  /:id/status       activate / deactivate
//     DELETE /:id              deactivate (refused while purchase orders are open)
//   routes/pharmacy/pharmacyPurchaseOrders.js @ /api/pharmacy/purchase-orders
//     GET    /get?supplier_id= orders from this supplier
//     GET    /get/:id          one order, with its items and payments
//
// Permissions
//   pharmacy.suppliers.view / .create / .edit / .delete
//   pharmacy.purchases.view  — without it the order side is simply not shown

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Alert, AlertTitle, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, LinearProgress, Menu, MenuItem, Skeleton, Snackbar, Stack,
  Tooltip, Typography, useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/SwapVert";

import useAccess, { AccessDenied } from "../../hooks/useAccess";
import PurchaseOrderList from "../../pharmacy/purchase/PurchaseOrderList";
import AppPager from "../shared/AppPager";
import { ColorRoot } from "../../theme/appColors";
import useLeaveGuard from "./useLeaveGuard";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
const API_BASE = process.env.REACT_APP_SITE_URL || "";
const SUPPLIERS_API = `${API_BASE}/api/pharmacy/suppliers`;
// JWT lives in an HttpOnly cookie → send cookies. Swap for your shared axios instance if you have one.
const http = axios.create({ withCredentials: true });

const SHELL_HEIGHT = "calc(70vh - var(--suppliers-offset, 0px))";
const PAGE_SIZES = [5, 10, 20, 50, 100]; // orders per page

const SEARCH_DELAY = 300;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const inr = (n) =>
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const nums = { fontVariantNumeric: "tabular-nums" };

const fmtDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

async function apiMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

/* The same rules the server applies, so a mistake is caught before the round
   trip. The server stays the authority — these only save a wasted save. */
const RULES = {
  email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Doesn't look like an email address"),
  phone: (v) => (!v || /^\d{7,15}$/.test(v.replace(/[\s\-()+]/g, "")) ? null : "7 to 15 digits"),
  gst_number: (v) =>
    !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[Z]{1}[0-9A-Z]{1}$/i.test(v.trim())
      ? null
      : "15 characters, like 36AAAAA0000A1Z5",
  pincode: (v) => (!v || /^\d{4,10}$/.test(v.trim()) ? null : "4 to 10 digits"),
  supplier_name: (v) =>
    !v || !v.trim() ? "A name is needed" : v.trim().length > 255 ? "Too long (255 characters max)" : null,
  opening_balance: (v) =>
    v === "" || v === null || v === undefined
      ? null
      : !Number.isFinite(Number(v))
        ? "Numbers only"
        : Number(v) < 0
          ? "Can't be negative"
          : null,
};
const FIELD_RULE = {
  supplier_name: RULES.supplier_name,
  email: RULES.email,
  phone: RULES.phone,
  alternate_phone: RULES.phone,
  gst_number: RULES.gst_number,
  pincode: RULES.pincode,
  opening_balance: RULES.opening_balance,
};

const EMPTY = {
  supplier_name: "", contact_person: "", phone: "", alternate_phone: "", email: "",
  address: "", city: "", state: "", pincode: "", gst_number: "", drug_license_number: "",
  opening_balance: "",
};

const errorsOf = (form) =>
  Object.fromEntries(
    Object.entries(FIELD_RULE)
      .map(([k, rule]) => [k, rule(form[k])])
      .filter(([, msg]) => msg)
  );

// What a pharmacy actually needs on file before the first invoice arrives.
const missingPaperwork = (s) => !s.gst_number || !s.drug_license_number;

const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const placeOf = (s) => [s.city, s.state].filter(Boolean).join(", ");

/* ------------------------------------------------------------------ */
/* Fitting the window                                                  */
/* ------------------------------------------------------------------ */
/**
 * Measures where this screen actually begins and sizes it to the rest of the
 * window, so it never runs past the bottom and makes the BROWSER scroll.
 *
 * Why measured rather than configured: the old way needed a CSS variable set to
 * the exact height of whatever sits above — the fixed top bar, plus any padding
 * the layout adds. Get it wrong by a pixel and you get a scrollbar; change the
 * header later and every page needs updating. Reading the real offset costs one
 * getBoundingClientRect and is right by construction.
 *
 * --suppliers-offset still wins if it is set, for a layout that needs to override.
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
    // A header that grows (a wrapped toolbar on a phone) moves us down.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
    };
  }, []);

  return [ref, height];
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */
function Field({ label, value, onChange, error, placeholder, hint, multiline, disabled, uppercase, sx }) {
  return (
    <Box sx={{ minWidth: 0, ...sx }}>
      {label && (
        <Typography
          component="label"
          sx={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "text.secondary", mb: 0.4 }}
        >
          {label}
        </Typography>
      )}
      <Box
        component={multiline ? "textarea" : "input"}
        rows={multiline ? 2 : undefined}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        sx={{
          width: "100%",
          font: "inherit",
          fontSize: 14.5,
          fontWeight: 500,
          resize: multiline ? "vertical" : undefined,
          px: 1.25,
          py: 1,
          color: "text.primary",
          bgcolor: disabled ? "action.hover" : "background.paper",
          border: 1,
          borderColor: error ? "error.main" : "divider",
          borderRadius: 1.5,
          outline: "none",
          transition: "border-color .15s, box-shadow .15s",
          "&:hover": { borderColor: error ? "error.main" : "text.disabled" },
          "&:focus": {
            borderColor: error ? "error.main" : "primary.main",
            boxShadow: (t) => `0 0 0 3px ${alpha(t.palette[error ? "error" : "primary"].main, 0.16)}`,
          },
          "&::placeholder": { color: "text.disabled", fontWeight: 400 },
        }}
      />
      {(error || hint) && (
        <Typography sx={{ fontSize: 11.5, mt: 0.35, color: error ? "error.main" : "text.secondary" }}>
          {error || hint}
        </Typography>
      )}
    </Box>
  );
}

function Monogram({ name, active, size = 36 }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
        letterSpacing: "0.02em",
        color: active ? "success.dark" : "text.disabled",
        bgcolor: active ? alpha(theme.palette.success.main, 0.14) : "action.hover",
        border: 1,
        borderColor: active ? alpha(theme.palette.success.main, 0.3) : "divider",
      }}
    >
      {initials(name)}
    </Box>
  );
}

function Detail({ label, value, mono, span }) {
  return (
    <Box sx={{ minWidth: 0, gridColumn: span ? "1 / -1" : undefined }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary" }}>{label}</Typography>
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

function SectionTitle({ children, sx }) {
  return (
    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", letterSpacing: "0.03em", ...sx }}>
      {children}
    </Typography>
  );
}

/* ================================================================== */
/* Screen                                                              */
/* ================================================================== */
function SuppliersPage() {
  const [shellRef, shellHeight] = useFitsWindow(SHELL_HEIGHT);
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"));

  /* ---------- what this user is allowed to do ---------- */
  const { loading: accessLoading, can } = useAccess();
  const canView = can("pharmacy.suppliers.view");
  const canCreate = can("pharmacy.suppliers.create");
  const canEdit = can("pharmacy.suppliers.edit");
  const canDelete = can("pharmacy.suppliers.delete");
  const canSeeOrders = can("pharmacy.purchase.view");

  /* ---------- list ---------- */
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // active | inactive | all
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [sort, setSort] = useState({ by: "supplier_name", order: "ASC" });
  const [sortAnchor, setSortAnchor] = useState(null);

  /* ---------- selection ---------- */
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);

  /* ---------- orders ----------
     PurchaseOrderList fetches and renders them; it hands the totals back so the
     profile modal can show what this supplier has cost so far. */
  const [orderTotals, setOrderTotals] = useState({ count: 0, value: 0, paid: 0, due: 0 });
  // an order of this supplier is open in the page (PurchaseOrderList inline) → it gets the whole screen
  const [viewingOrder, setViewingOrder] = useState(false);

  /* ---------- in-page sections (profile, add / edit) and small popups ---------- */
  const [profileOpen, setProfileOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false); // false | "new" | "edit"
  const [form, setForm] = useState(EMPTY);
  const [formStart, setFormStart] = useState(EMPTY); // the form as it opened — to spot unsaved changes
  const [leavePrompt, setLeavePrompt] = useState(null); // { proceed }
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState(null); // { message, existing_id }
  const [confirmOff, setConfirmOff] = useState(null);

  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const [denied, setDenied] = useState(null);
  const searchTimer = useRef();

  const notify = (message, severity = "success") => setSnack({ open: true, severity, message });
  const report = async (e, fallback) => {
    if (e?.response?.status === 403 || e?.response?.status === 401) {
      setDenied(await apiMessage(e, "You don't have permission to manage suppliers"));
      return null;
    }
    const msg = await apiMessage(e, fallback);
    notify(msg, "error");
    return msg;
  };

  /* ---------- load the list ---------- */
  const load = useCallback(
    async (opts = {}) => {
      setLoading(true);
      try {
        const params = {
          page: opts.page ?? page,
          limit: pageSize,
          sort_by: sort.by,
          sort_order: sort.order,
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter !== "all") params.status = statusFilter;
        const r = await http.get(SUPPLIERS_API, { params });
        const list = r.data.data || [];
        const t = r.data.pagination?.total ?? list.length;
        setRows(list);
        setTotal(t);
        // the last page emptied (a filter / deactivation) → step back to the new last page
        if (!list.length && t > 0 && (opts.page ?? page) > 1) setPage(Math.max(1, Math.ceil(t / pageSize)));
      } catch (e) {
        await report(e, "Couldn't load the suppliers");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, search, statusFilter, sort]
  );

  useEffect(() => {
    if (accessLoading || !canView) {
      setLoading(false);
      return undefined;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(), search ? SEARCH_DELAY : 0);
    return () => clearTimeout(searchTimer.current);
  }, [load, search, accessLoading, canView]);

  /* ---------- derived ---------- */
  const shown = useMemo(() => (onlyIncomplete ? rows.filter(missingPaperwork) : rows), [rows, onlyIncomplete]);
  const incompleteCount = useMemo(() => rows.filter(missingPaperwork).length, [rows]);
  const errors = useMemo(() => (formOpen ? errorsOf(form) : {}), [formOpen, form]);
  const showError = (k) => (touched[k] ? errors[k] : undefined);
  const dirty = !!formOpen && JSON.stringify(form) !== JSON.stringify(formStart);

  // Moving to another page with unsaved changes asks first
  useLeaveGuard(dirty && !saving, (proceed) => setLeavePrompt({ proceed }));

  /* ---------- actions ---------- */
  const openSupplier = (s) => {
    setViewingOrder(false);
    setSelected(s);
    setDuplicate(null);
  };

  const startNew = () => {
    setForm(EMPTY);
    setFormStart(EMPTY);
    setProfileOpen(false);
    setTouched({});
    setDuplicate(null);
    setFormOpen("new");
  };

  const startEdit = () => {
    if (!selected) return;
    const start = Object.fromEntries(
      Object.keys(EMPTY).map((k) => [k, selected[k] === null || selected[k] === undefined ? "" : String(selected[k])])
    );
    setForm(start);
    setFormStart(start);
    setTouched({});
    setDuplicate(null);
    setProfileOpen(false);
    setFormOpen("edit");
  };

  const closeFormNow = () => {
    setFormOpen(false);
    setTouched({});
    setDuplicate(null);
  };

  // Back / Cancel: ask first when something was typed
  const closeForm = () => {
    if (saving) return;
    if (dirty) setLeavePrompt({ proceed: closeFormNow });
    else closeFormNow();
  };

  const save = async () => {
    const found = errorsOf(form);
    if (Object.keys(found).length) {
      setTouched(Object.fromEntries(Object.keys(FIELD_RULE).map((k) => [k, true])));
      notify("Check the highlighted fields", "warning");
      return;
    }
    setSaving(true);
    setDuplicate(null);
    try {
      const body = { ...form };
      if (body.opening_balance === "") delete body.opening_balance;
      const r =
        formOpen === "new"
          ? await http.post(`${SUPPLIERS_API}/post`, body)
          : await http.put(`${SUPPLIERS_API}/${selected.id}`, body);
      const saved = r.data.data;
      setSelected(saved);
      notify(formOpen === "new" ? `${saved.supplier_name} added` : "Changes saved");
      setFormOpen(false);
      setTouched({});
      load();
    } catch (e) {
      if (e?.response?.status === 409) {
        setDuplicate({ message: e.response.data.message, existing_id: e.response.data.existing_id });
      } else {
        await report(e, "Couldn't save the supplier");
      }
    } finally {
      setSaving(false);
    }
  };

  const openExisting = async (id) => {
    try {
      const r = await http.get(`${SUPPLIERS_API}/${id}`);
      setSelected(r.data.data);
      setFormOpen(false);
      setDuplicate(null);
      setTouched({});
      if (statusFilter === "active" && r.data.data.status !== "active") setStatusFilter("all");
    } catch (e) {
      await report(e, "Couldn't open that supplier");
    }
  };

  const toggleStatus = async (s) => {
    setBusyId(s.id);
    try {
      const r = await http.patch(`${SUPPLIERS_API}/${s.id}/status`);
      const status = r.data.data?.status || (s.status === "active" ? "inactive" : "active");
      setRows((prev) => prev.map((x) => (x.id === s.id ? { ...x, status } : x)));
      if (selected?.id === s.id) setSelected((prev) => ({ ...prev, status }));
      notify(r.data.message || `${s.supplier_name} ${status === "active" ? "activated" : "deactivated"}`);
      if (statusFilter !== "all") load();
    } catch (e) {
      await report(e, "Couldn't change the status");
    } finally {
      setBusyId(null);
      setConfirmOff(null);
    }
  };

  const removeSupplier = async (s) => {
    setBusyId(s.id);
    try {
      const r = await http.delete(`${SUPPLIERS_API}/${s.id}`);
      notify(r.data.message || `${s.supplier_name} deactivated`);
      if (selected?.id === s.id) setSelected((prev) => ({ ...prev, status: "inactive" }));
      load();
    } catch (e) {
      await report(e, "Couldn't deactivate the supplier");
    } finally {
      setBusyId(null);
      setConfirmOff(null);
    }
  };

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setTouched((p) => ({ ...p, [k]: true }));
  };

  /* ---------- no permission to be here at all ---------- */
  if (!accessLoading && !canView) {
    return (
      <Box ref={shellRef} sx={{ height: shellHeight, display: "flex", overflow: "hidden", bgcolor: "background.default" }}>
        <AccessDenied what="Suppliers" />
      </Box>
    );
  }

  const detailOpen = !!selected;
  const showProfile = profileOpen && !!selected;
  const covered = !!formOpen || showProfile; // a section of the page takes the place of the panes

  /* ================================================================ */
  return (
    <Box
      ref={shellRef}
      sx={{
        maxHeight:"86vh",
        height: shellHeight,
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
          py: { xs: 1.25, md: 1.5 },
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: covered || viewingOrder ? "none" : "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: { xs: 17, md: 19 }, fontWeight: 700, letterSpacing: "-0.01em" }} noWrap>
            Suppliers
          </Typography>
          <Typography
            sx={{ fontSize: 12.5, color: "text.secondary", display: { xs: "none", lg: "block" } }}
            noWrap
          >
            Who you buy from, and everything you have ordered
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Box
          sx={{
            display: { xs: detailOpen ? "none" : "flex", md: "flex" },
            alignItems: "center",
            gap: 1,
            px: 1.25,
            py: 0.25,
            width: { xs: "auto", sm: 260, md: 320 },
            flex: { xs: 1, sm: "0 0 auto" },
            minWidth: 0,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.paper",
            "&:focus-within": { borderColor: "primary.main" },
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
          <Box
            component="input"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Name, phone, GSTIN, licence"
            sx={{
              flex: 1, minWidth: 0, font: "inherit", fontSize: 14, py: 0.9,
              border: 0, outline: "none", bgcolor: "transparent", color: "text.primary",
            }}
          />
          {search && (
            <IconButton size="small" onClick={() => setSearch("")} aria-label="Clear the search">
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>

        {canCreate && (
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon />}
            onClick={startNew}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: { xs: 1.5, sm: 2.5 },
              flexShrink: 0,
              display: { xs: detailOpen ? "none" : "inline-flex", md: "inline-flex" },
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Add supplier</Box>
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Add</Box>
          </Button>
        )}
      </Box>

      {denied && (
        <Alert severity="error" onClose={() => setDenied(null)} sx={{ borderRadius: 0, flexShrink: 0 }}>
          <AlertTitle sx={{ mb: 0.25, fontSize: 14 }}>Not allowed</AlertTitle>
          <Typography sx={{ fontSize: 13 }}>{denied}</Typography>
        </Alert>
      )}

      {/* ---------------- the two panes ---------------- */}
      <Box sx={{ flex: 1, minHeight: 0, display: covered ? "none" : "flex", position: "relative", overflow: "hidden" }}>
        {/* ======== list ======== */}
        <Box
          sx={{
            width: { xs: "100%", md: 340, lg: 400 },
            flexShrink: 0,
            borderRight: { md: 1 },
            borderColor: { md: "divider" },
            display: viewingOrder ? "none" : "flex",
            flexDirection: "column",
            minHeight: 0,
            bgcolor: "background.paper",
          }}
        >
          {/* filters */}
          <Box
            sx={{
              flexShrink: 0,
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexWrap: "wrap",
            }}
          >
            {[
              { v: "active", label: "Active" },
              { v: "inactive", label: "Inactive" },
              { v: "all", label: "All" },
            ].map((f) => (
              <Chip
                key={f.v}
                size="small"
                label={f.label}
                onClick={() => {
                  setStatusFilter(f.v);
                  setPage(1);
                }}
                color={statusFilter === f.v ? "primary" : "default"}
                variant={statusFilter === f.v ? "filled" : "outlined"}
                sx={{ fontWeight: 600, fontSize: 12 }}
              />
            ))}
            {incompleteCount > 0 && (
              <Tooltip title="Missing a GSTIN or a drug licence number">
                <Chip
                  size="small"
                  label={`Needs details · ${incompleteCount}`}
                  onClick={() => setOnlyIncomplete((v) => !v)}
                  color={onlyIncomplete ? "warning" : "default"}
                  variant={onlyIncomplete ? "filled" : "outlined"}
                  sx={{ fontWeight: 600, fontSize: 12 }}
                />
              </Tooltip>
            )}
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Sort">
              <IconButton size="small" onClick={(e) => setSortAnchor(e.currentTarget)}>
                <SortIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={sortAnchor} open={!!sortAnchor} onClose={() => setSortAnchor(null)}>
              {[
                { by: "supplier_name", order: "ASC", label: "Name, A to Z" },
                { by: "supplier_name", order: "DESC", label: "Name, Z to A" },
                { by: "created_at", order: "DESC", label: "Newest first" },
                { by: "city", order: "ASC", label: "City" },
                { by: "opening_balance", order: "DESC", label: "Opening balance" },
              ].map((o) => (
                <MenuItem
                  key={o.label}
                  selected={sort.by === o.by && sort.order === o.order}
                  onClick={() => {
                    setSort({ by: o.by, order: o.order });
                    setSortAnchor(null);
                    setPage(1);
                  }}
                  sx={{ fontSize: 14 }}
                >
                  {o.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>
          {loading && <LinearProgress sx={{ height: 2, flexShrink: 0 }} />}

          {/* rows — scrolls on its own */}
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
            {loading && !rows.length ? (
              <Stack spacing={0} sx={{ p: 2 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.25 }}>
                    <Skeleton variant="circular" width={38} height={38} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="60%" height={18} />
                      <Skeleton width="40%" height={14} />
                    </Box>
                  </Stack>
                ))}
              </Stack>
            ) : !shown.length ? (
              <Stack alignItems="center" spacing={1.25} sx={{ py: 7, px: 3, textAlign: "center" }}>
                <LocalShippingOutlinedIcon sx={{ fontSize: 34, color: "text.disabled" }} />
                <Typography sx={{ fontSize: 14.5, fontWeight: 600 }}>
                  {search || onlyIncomplete || statusFilter !== "active"
                    ? "Nothing matches that"
                    : "No suppliers yet"}
                </Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                  {search || onlyIncomplete || statusFilter !== "active"
                    ? "Try a different search, or clear the filters."
                    : "Add the distributors you buy from — you'll need them to raise a purchase order."}
                </Typography>
                {canCreate && !search && !onlyIncomplete && statusFilter === "active" && (
                  <Button
                    variant="contained"
                    disableElevation
                    startIcon={<AddIcon />}
                    onClick={startNew}
                    sx={{ textTransform: "none", mt: 1 }}
                  >
                    Add the first supplier
                  </Button>
                )}
              </Stack>
            ) : (
              shown.map((s) => {
                const active = s.status === "active";
                const isSelected = selected?.id === s.id;
                return (
                  <Box
                    key={s.id}
                    onClick={() => openSupplier(s)}
                    sx={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2,
                      py: 1.1,
                      cursor: "pointer",
                      borderBottom: 1,
                      borderColor: "divider",
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.07) : "transparent",
                      "&:hover": {
                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.09) : "action.hover",
                      },
                      "&:before": isSelected
                        ? {
                          content: '""',
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          bgcolor: "primary.main",
                        }
                        : undefined,
                    }}
                  >
                    <Monogram name={s.supplier_name} active={active} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography
                          sx={{
                            fontSize: 14.5,
                            fontWeight: 600,
                            color: active ? "text.primary" : "text.secondary",
                          }}
                          noWrap
                        >
                          {s.supplier_name}
                        </Typography>
                        {!active && (
                          <Chip size="small" label="Inactive" sx={{ height: 18, fontSize: 10.5, fontWeight: 600 }} />
                        )}
                      </Stack>
                      <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
                        {[s.contact_person, s.phone, placeOf(s)].filter(Boolean).join("  ·  ") ||
                          "No contact details"}
                      </Typography>
                    </Box>
                    {missingPaperwork(s) && (
                      <Tooltip
                        title={`Missing ${!s.gst_number ? "GSTIN" : ""}${
                          !s.gst_number && !s.drug_license_number ? " and " : ""
                        }${!s.drug_license_number ? "drug licence" : ""}`}
                      >
                        <Box sx={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, bgcolor: "warning.main" }} />
                      </Tooltip>
                    )}
                  </Box>
                );
              })
            )}
          </Box>

          {/* paging — the shared pager, on the server */}
          <AppPager
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            pageSizeOptions={PAGE_SIZES}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            disabled={loading}
            sx={{ px: 1.5, flexWrap: "wrap", rowGap: 0.5, "&& > nav": { ml: "auto" } }}
          />
        </Box>

        {/* ======== details ======== */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: { xs: detailOpen ? "flex" : "none", md: "flex" },
            flexDirection: "column",
            position: { xs: "absolute", md: "static" },
            inset: { xs: 0, md: "auto" },
            zIndex: { xs: 3, md: "auto" },
            overflow: "hidden",
            bgcolor: "background.default",
          }}
        >
          {!selected ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              spacing={1.25}
              sx={{ flex: 1, px: 4, textAlign: "center" }}
            >
              <ReceiptLongOutlinedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
              <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Pick a supplier</Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary", maxWidth: 360 }}>
                You'll see everything you have ordered from them, what it came to, and what's still owed.
              </Typography>
            </Stack>
          ) : (
            <>
              {/* ---- detail header (hidden while one of their orders is open in the page) ---- */}
              <Box
                sx={{
                  flexShrink: 0,
                  px: { xs: 2, md: 2.5 },
                  py: 1.25,
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  display: viewingOrder ? "none" : "flex",
                  alignItems: "center",
                  gap: 1.25,
                }}
              >
                {narrow && (
                  <IconButton size="small" onClick={() => setSelected(null)} aria-label="Back to the list">
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                )}
                <Monogram name={selected.supplier_name} active={selected.status === "active"} size={40} />

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 16.5, fontWeight: 700, minWidth: 0 }} noWrap>
                      {selected.supplier_name}
                    </Typography>

                    {/* the ⓘ next to the name — everything about them, in a modal */}
                    <Tooltip title="Full profile">
                      <IconButton
                        size="small"
                        onClick={() => setProfileOpen(true)}
                        aria-label={`Full profile of ${selected.supplier_name}`}
                        sx={{ flexShrink: 0, color: "primary.main" }}
                      >
                        <Typography color="initial" sx={{fontSize:"12px"}}>View Full Profile</Typography>
                        <InfoOutlinedIcon sx={{ fontSize: 19 }}  /> 
                      </IconButton>
                    </Tooltip>

                    {selected.status !== "active" && (
                      <Chip size="small" label="Inactive" sx={{ height: 20, fontSize: 11, fontWeight: 600, flexShrink: 0 }} />
                    )}
                    {missingPaperwork(selected) && (
                      <Tooltip title="GSTIN or drug licence number is missing">
                        <Chip
                          size="small"
                          color="warning"
                          variant="outlined"
                          label="Paperwork"
                          onClick={canEdit ? startEdit : undefined}
                          sx={{ height: 20, fontSize: 11, fontWeight: 600, flexShrink: 0, display: { xs: "none", sm: "inline-flex" } }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
                    {[selected.contact_person, selected.phone, placeOf(selected)].filter(Boolean).join("  ·  ") ||
                      "No contact details on file"}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0 }}>
                  {selected.phone && (
                    <Tooltip title={`Call ${selected.phone}`}>
                      <IconButton size="small" component="a" href={`tel:${selected.phone}`}>
                        <CallOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {selected.email && (
                    <Tooltip title={`Email ${selected.email}`}>
                      <IconButton
                        size="small"
                        component="a"
                        href={`mailto:${selected.email}`}
                        sx={{ display: { xs: "none", sm: "inline-flex" } }}
                      >
                        <EmailOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canEdit && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={startEdit}
                      aria-label="Edit this supplier"
                      sx={{
                        textTransform: "none", fontWeight: 600, borderRadius: 2, ml: 0.5,
                        minWidth: { xs: 36, sm: 64 }, px: { xs: 0.5, sm: 1.5 },
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 18, display: { xs: "block", sm: "none" } }} />
                      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Edit</Box>
                    </Button>
                  )}
                  {(selected.status === "active" ? canDelete : canEdit) && (
                    <Tooltip title={selected.status === "active" ? "Deactivate" : "Activate"}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={busyId === selected.id}
                          onClick={() =>
                            selected.status === "active" ? setConfirmOff(selected) : toggleStatus(selected)
                          }
                        >
                          {busyId === selected.id ? <CircularProgress size={16} /> : <MoreVertIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </Box>

              {/* ---- this supplier's orders ----
                   The same component the Purchase Orders screen uses, filtered to
                   one supplier. It owns the totals, the rows, its own scrolling and
                   the order modal, so neither screen can drift from the other. */}
              <PurchaseOrderList
                key={selected.id}
                inline
                onViewing={setViewingOrder}
                supplierId={selected.id}
                canView={canSeeOrders}
                onTotals={setOrderTotals}
                emptyTitle="Nothing ordered from them yet"
                emptyHint={`Once you raise a purchase order against ${selected.supplier_name}, every order shows up here.`}
              />
            </>
          )}
        </Box>
      </Box>

      {/* ================================================================
          IN THE PAGE — the full profile, behind the ⓘ
      ================================================================ */}
      {showProfile && (
        <Box
          component="section"
          aria-labelledby="supplier-profile-title"
          sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default" }}
        >
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 1, md: 2.5 },
              py: 1.25,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "center",
              gap: 1.25,
            }}
          >
            <Tooltip title="Back to suppliers">
              <IconButton onClick={() => setProfileOpen(false)} aria-label="Back to suppliers">
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
            <Monogram name={selected.supplier_name} active={selected.status === "active"} size={40} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography id="supplier-profile-title" component="h2" sx={{ fontSize: 17, fontWeight: 700 }} noWrap>
                {selected.supplier_name}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
                {selected.status === "active" ? "Active supplier" : "Inactive"} · added {fmtDate(selected.created_at)}
              </Typography>
            </Box>
            {canEdit && (
              <Button
                variant="contained"
                disableElevation
                startIcon={<EditOutlinedIcon />}
                onClick={startEdit}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, flexShrink: 0 }}
              >
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Edit details</Box>
                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>Edit</Box>
              </Button>
            )}
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", px: { xs: 1.5, md: 3 }, py: { xs: 1.5, md: 2.5 } }}>
            <Box sx={{ maxWidth: 820, mx: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              {missingPaperwork(selected) && (
                <Alert
                  severity="warning"
                  variant="outlined"
                  sx={{ borderRadius: 2, fontSize: 13, bgcolor: "background.paper" }}
                  action={
                    canEdit ? (
                      <Button size="small" color="inherit" onClick={startEdit} sx={{ textTransform: "none", fontWeight: 600 }}>
                        Add it
                      </Button>
                    ) : null
                  }
                >
                  <AlertTitle sx={{ fontSize: 13.5, mb: 0.25 }}>Paperwork is incomplete</AlertTitle>
                  <Typography sx={{ fontSize: 12.5 }}>
                    {[!selected.gst_number && "GSTIN", !selected.drug_license_number && "drug licence number"]
                      .filter(Boolean)
                      .join(" and ")}{" "}
                    missing. You&apos;ll want {!selected.gst_number && !selected.drug_license_number ? "both" : "it"} on
                    file before the first invoice.
                  </Typography>
                </Alert>
              )}

              {[
                {
                  title: "CONTACT",
                  cols: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
                  body: (
                    <>
                      <Detail label="Contact person" value={selected.contact_person} />
                      <Detail label="Phone" value={selected.phone} mono />
                      <Detail label="Alternate phone" value={selected.alternate_phone} mono />
                      <Detail label="Email" value={selected.email} span />
                    </>
                  ),
                },
                {
                  title: "PAPERWORK",
                  cols: { xs: "1fr", sm: "1fr 1fr" },
                  body: (
                    <>
                      <Detail label="GSTIN" value={selected.gst_number} mono />
                      <Detail label="Drug licence" value={selected.drug_license_number} mono />
                    </>
                  ),
                },
                {
                  title: "ADDRESS",
                  cols: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
                  body: (
                    <>
                      <Detail
                        label="Address"
                        value={[selected.address, placeOf(selected), selected.pincode].filter(Boolean).join(", ")}
                        span
                      />
                      <Detail label="City" value={selected.city} />
                      <Detail label="State" value={selected.state} />
                      <Detail label="Pincode" value={selected.pincode} mono />
                    </>
                  ),
                },
                {
                  title: "MONEY",
                  cols: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
                  body: (
                    <>
                      <Detail label="Opening balance" value={`₹${inr(selected.opening_balance)}`} mono />
                      {canSeeOrders && <Detail label="Ordered so far" value={`₹${inr(orderTotals.value)}`} mono />}
                      {canSeeOrders && <Detail label="Still due" value={`₹${inr(orderTotals.due)}`} mono />}
                    </>
                  ),
                },
              ].map((sec) => (
                <Box
                  key={sec.title}
                  sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "background.paper" }}
                >
                  <SectionTitle sx={{ mb: 1.5 }}>{sec.title}</SectionTitle>
                  <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: sec.cols }}>{sec.body}</Box>
                </Box>
              ))}

              <Typography sx={{ fontSize: 12, color: "text.disabled", px: 0.5 }}>
                Added {fmtDate(selected.created_at)}
                {selected.updated_at && selected.updated_at !== selected.created_at
                  ? `, last changed ${fmtDate(selected.updated_at)}`
                  : ""}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ================================================================
          IN THE PAGE — add / edit
      ================================================================ */}
      {!!formOpen && (
        <Box
          component="section"
          aria-labelledby="supplier-form-title"
          sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default" }}
        >
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 1, md: 2.5 },
              py: 1.25,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "center",
              gap: 1.25,
            }}
          >
            <Tooltip title="Back to suppliers">
              <span>
                <IconButton onClick={closeForm} disabled={saving} aria-label="Back to suppliers">
                  <ArrowBackIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography id="supplier-form-title" component="h2" sx={{ fontSize: 17, fontWeight: 700 }} noWrap>
                {formOpen === "new" ? "Add a supplier" : `Edit ${selected?.supplier_name || "supplier"}`}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }} noWrap>
                {formOpen === "new" ? "Only the name is required — the rest can wait" : "Nothing is saved until you press save"}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, display: { xs: "none", sm: "flex" } }}>
              <Typography sx={{ fontSize: 12.5, color: Object.keys(errors).length && Object.keys(touched).length ? "error.main" : "text.secondary", mr: 0.5 }}>
                {Object.keys(errors).length && Object.keys(touched).length
                  ? `${Object.keys(errors).length} field${Object.keys(errors).length === 1 ? "" : "s"} to fix`
                  : dirty
                    ? "Unsaved changes"
                    : ""}
              </Typography>
              <Button onClick={closeForm} disabled={saving} sx={{ textTransform: "none" }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                disableElevation
                onClick={save}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 3 }}
              >
                {formOpen === "new" ? "Add supplier" : "Save changes"}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", px: { xs: 1.5, md: 3 }, py: { xs: 1.5, md: 2.5 } }}>
            <Box sx={{ maxWidth: 820, mx: "auto", p: { xs: 2, sm: 3 }, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
              {duplicate && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2.5, borderRadius: 2 }}
                  action={
                    duplicate.existing_id ? (
                      <Button
                        size="small"
                        onClick={() => openExisting(duplicate.existing_id)}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        Open it
                      </Button>
                    ) : null
                  }
                >
                  {duplicate.message}
                </Alert>
              )}

              <Stack spacing={2}>
                <SectionTitle>WHO THEY ARE</SectionTitle>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                  <Field
                    label="Supplier name"
                    value={form.supplier_name}
                    onChange={(v) => setField("supplier_name", v)}
                    error={showError("supplier_name")}
                    placeholder="ABC Medical Distributors"
                    sx={{ gridColumn: { sm: "1 / -1" } }}
                  />
                  <Field
                    label="Contact person"
                    value={form.contact_person}
                    onChange={(v) => setField("contact_person", v)}
                    placeholder="Who you speak to"
                  />
                  <Field
                    label="Phone"
                    value={form.phone}
                    onChange={(v) => setField("phone", v)}
                    error={showError("phone")}
                    placeholder="98480 11122"
                  />
                  <Field
                    label="Alternate phone"
                    value={form.alternate_phone}
                    onChange={(v) => setField("alternate_phone", v)}
                    error={showError("alternate_phone")}
                  />
                  <Field
                    label="Email"
                    value={form.email}
                    onChange={(v) => setField("email", v)}
                    error={showError("email")}
                    placeholder="orders@example.com"
                  />
                </Box>

                <Divider sx={{ my: 0.5 }} />
                <SectionTitle>PAPERWORK</SectionTitle>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                  <Field
                    label="GSTIN"
                    value={form.gst_number}
                    onChange={(v) => setField("gst_number", v)}
                    error={showError("gst_number")}
                    hint={!showError("gst_number") ? "Needed to claim input tax" : undefined}
                    placeholder="36AAAAA0000A1Z5"
                    uppercase
                  />
                  <Field
                    label="Drug licence number"
                    value={form.drug_license_number}
                    onChange={(v) => setField("drug_license_number", v)}
                    placeholder="20B/1234"
                    hint="As printed on their invoice"
                  />
                </Box>

                <Divider sx={{ my: 0.5 }} />
                <SectionTitle>WHERE THEY ARE</SectionTitle>
                <Field
                  label="Address"
                  value={form.address}
                  onChange={(v) => setField("address", v)}
                  multiline
                  placeholder="Street, area, landmark"
                />
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" } }}>
                  <Field label="City" value={form.city} onChange={(v) => setField("city", v)} />
                  <Field label="State" value={form.state} onChange={(v) => setField("state", v)} />
                  <Field
                    label="Pincode"
                    value={form.pincode}
                    onChange={(v) => setField("pincode", v)}
                    error={showError("pincode")}
                  />
                </Box>

                <Divider sx={{ my: 0.5 }} />
                <SectionTitle>MONEY</SectionTitle>
                <Field
                  label="Opening balance ₹"
                  value={form.opening_balance}
                  onChange={(v) => setField("opening_balance", v)}
                  error={showError("opening_balance")}
                  hint={!showError("opening_balance") ? "What you already owe them when you start, if anything" : undefined}
                  sx={{ maxWidth: 260 }}
                />
              </Stack>
            </Box>
          </Box>

          {/* phones: the actions stay in reach at the bottom */}
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              flexShrink: 0,
              gap: 1,
              px: 1.5,
              pt: 1,
              pb: "calc(10px + env(safe-area-inset-bottom))",
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Button variant="outlined" onClick={closeForm} disabled={saving} sx={{ textTransform: "none", borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              fullWidth
              variant="contained"
              disableElevation
              onClick={save}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              {formOpen === "new" ? "Add supplier" : "Save changes"}
            </Button>
          </Box>
        </Box>
      )}

      {/* ---------------- unsaved changes ---------------- */}
      <Dialog open={!!leavePrompt} onClose={() => setLeavePrompt(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Discard your changes?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5 }}>
            {formOpen === "new" ? "This supplier hasn't been added yet." : "Your changes to this supplier haven't been saved."} If you
            leave now, what you typed is lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeavePrompt(null)} sx={{ textTransform: "none" }}>
            Keep editing
          </Button>
          <Button
            variant="contained"
            disableElevation
            color="error"
            onClick={() => {
              const go = leavePrompt?.proceed;
              setLeavePrompt(null);
              if (go) go();
            }}
            sx={{ textTransform: "none" }}
          >
            Discard
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- deactivate ---------------- */}
      <Dialog open={!!confirmOff} onClose={() => setConfirmOff(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Deactivate {confirmOff?.supplier_name}?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5 }}>
            They stop appearing when you raise a purchase order or receive stock. Nothing already
            recorded against them changes, and you can bring them back at any time.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOff(null)} sx={{ textTransform: "none" }}>
            Keep active
          </Button>
          <Button
            variant="contained"
            disableElevation
            color="warning"
            onClick={() => removeSupplier(confirmOff)}
            sx={{ textTransform: "none" }}
          >
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ mb: { xs: 8, md: 0 } }}
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

/** The page, wrapped so it reads its colours from src/theme/appColors.js (like the other purchase screens). */
export default function Suppliers() {
  return (
    <ColorRoot>
      <SuppliersPage />
    </ColorRoot>
  );
}