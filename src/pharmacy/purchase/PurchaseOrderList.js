// src/pharmacy/purchase/PurchaseOrderList.js
//
// Every purchase order, or one supplier's. The same component fills the right-hand
// pane of the Suppliers screen and the whole of the Purchase Orders screen — so a
// change to how an order reads happens once.
//
// Layout contract: this component is a flex COLUMN that fills whatever box you give
// it, and only its row area scrolls. Give it a parent with a real height
// (flex: 1, minHeight: 0) and the page around it never scrolls.
//
// Backend: routes/pharmacy/pharmacyPurchaseOrders.js @ /api/pharmacy/purchase-orders
//   GET /get?supplier_id=&status=&payment_status=&search=&date_from=&date_to=&page=&limit=&sort_order=
//        → { data (this page), pagination {page, limit, total, total_pages},
//            summary {count, value, paid, due, open} for EVERY matching order }
//   GET /suppliers    active suppliers, for the filter
//
// Paging: 20 orders at a time (5 / 10 / 20 / 50 / 100 from the shared AppPager at the foot). The figures
// in the strip above the rows come from the server's summary, so they cover every matching
// order, not just the page on screen. Changing a filter or the search goes back to page 1.
//
// Colours: all from purchaseStyles (your :root colours) — no alpha() here.
//
// Needs pharmacy.purchase.view. Without it, render it with canView={false} and it
// says so instead of firing a request that will 403.
//
// Usage
//   <PurchaseOrderList supplierId={selected.id} canView={canSeeOrders} />
//   <PurchaseOrderList showFilters title="ALL PURCHASE ORDERS" />
//   <PurchaseOrderList showFilters onReceive={(order) => goReceive(order)} />
//
// Opening a row shows the order with its payments, which can be recorded, edited or
// deleted there (PurchaseOrderDialog). The list reloads itself after any change.
// With `inline` the order opens IN the page, in place of the list (Back arrow) — the list
// stays mounted behind it, so its page, filters and scroll are kept. `onViewing(bool)` tells
// the page an order is open (the Purchase Orders page hides its own header then).
//
// Branches: each order shows the branch it is delivered to. With several branches the filter
// row carries the branch picker — the admin can look at one branch or all; staff see their
// own branch's orders (and the ones with no branch yet), which the server enforces.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Skeleton, Stack, Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import InventoryOutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CurrencyRupeeOutlinedIcon from "@mui/icons-material/CurrencyRupeeOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";

import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";

import PurchaseOrderFilters from "./PurchaseOrderFilters";
import AppPager from "../shared/AppPager";
import BranchPicker, { usePharmacyBranch } from "../shared/BranchPicker";
import { ColHead, IconTile, thinScroll, tints, toneColor } from "./purchaseStyles";
import PurchaseOrderDialog, {
  ORDERS_API, http, apiMessage, compactInr, fmtShortDate, inr, nums, ORDER_TONE, PAY_TONE, SectionTitle,
} from "./PurchaseOrderDialog";

const PAGE_SIZES = [5, 10, 20, 50, 100]; // orders per page
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DELAY = 300;

/* One number in the strip above the rows, with its icon tile. */
function Stat({ label, value, icon, iconTone = "primary", tone }) {
  const theme = useTheme();
  return (
    <Box sx={{ minWidth: 0, px: { xs: 1.25, md: 1.75 }, py: 1.1, display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <IconTile icon={icon} tone={iconTone} size={36} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: "text.secondary", letterSpacing: "0.05em" }} noWrap>
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: 15, md: 17 },
            fontWeight: 800,
            lineHeight: 1.25,
            ...nums,
            color: tone ? toneColor(theme, tone) : "text.primary",
          }}
          noWrap
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function PurchaseOrderList({
  supplierId = null,       // null → every supplier
  canView = true,          // pharmacy.purchase.view
  showFilters = false,     // status / payment / supplier dropdowns + search
  showTotals = true,
  showSupplierColumn,      // defaults to "only when not filtered to one supplier"
  title = "WHAT YOU HAVE ORDERED",
  emptyTitle = "Nothing ordered yet",
  emptyHint = "Once a purchase order is raised, every order shows up here.",
  pageSize: startPageSize = DEFAULT_PAGE_SIZE, // orders per page to begin with
  onTotals,                // (totals) => void — so a parent can show the same figures
  onReceive,               // (order) => void — adds a Receive shortcut to orders still 'ordered'
  inline = false,          // open an order as a section of the page (list hidden behind it) instead of a popup
  onViewing,               // (bool) => void — an order is open / closed (inline only)
}) {
  const theme = useTheme();
  const act = tints(theme, "primary"); // main / dark / wash / soft / tile / line / ring
  const withSupplier = showSupplierColumn ?? !supplierId;
  // which branch's orders (the admin may pick one or all; staff are always their own — server side)
  const br = usePharmacyBranch({ allowAll: true });
  const branchParam = showFilters ? br.branch : null;

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null); // the server's figures for every matching order
  const [page, setPage] = useState(1); // 1-based
  const [pageSize, setPageSize] = useState(startPageSize);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null); // the order being read

  /* filters — only used when showFilters */
  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState(""); // what the search box shows; `search` follows it after a pause
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [suppliers, setSuppliers] = useState([]);
  const rowsRef = useRef(null);
  const latest = useRef(0); // a slow answer to an old click must never overwrite a newer one

  // Another supplier's history → start at its first page.
  const [seenSupplier, setSeenSupplier] = useState(supplierId);
  if (seenSupplier !== supplierId) {
    setSeenSupplier(supplierId);
    setPage(1);
  }

  // Every filter goes back to page 1 in the same render that changes it — one request, not two.
  const pick = (setter) => (v) => {
    setter(v);
    setPage(1);
  };
  const pickStatus = pick(setStatus);
  const pickPayment = pick(setPayment);
  const pickSupplier = pick(setSupplier);
  const pickPageSize = pick(setPageSize);

  const clearFilters = () => {
    setStatus("all");
    setPayment("all");
    setSupplier("all");
    if (br.isAdmin && br.branch) br.setBranch("");
    setTyped("");
    setSearch(""); // straight away, not after the typing pause
    setPage(1);
  };

  /* ---------- load ---------- */
  const load = useCallback(async () => {
    const mine = ++latest.current;
    if (!canView) {
      setOrders([]);
      setTotal(0);
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    let steppedBack = false;
    try {
      const params = { page, limit: pageSize, sort_order: "DESC" };
      const only = supplierId ?? (supplier !== "all" ? supplier : null);
      if (only) params.supplier_id = only;
      if (showFilters) {
        if (search.trim()) params.search = search.trim();
        if (status !== "all") params.status = status;
        if (payment !== "all") params.payment_status = payment;
        if (branchParam) params.branch = branchParam;
      }
      const r = await http.get(`${ORDERS_API}/get`, { params });
      if (mine !== latest.current) return;
      const rows = r.data.data || [];
      const pg = r.data.pagination || {};
      const count = pg.total ?? rows.length;
      const pages = Math.max(1, pg.total_pages || Math.ceil(count / pageSize) || 1);
      // The last order on this page was cancelled, moved or filtered away → step back to the new last
      // page. The old rows stay on screen (dimmed) until that page arrives — no flash of "nothing here".
      if (!rows.length && count > 0 && page > pages) {
        steppedBack = true;
        setPage(pages);
        return;
      }
      setOrders(rows);
      setTotal(count);
      setSummary(r.data.summary || null);
    } catch (e) {
      if (mine !== latest.current) return;
      setOrders([]);
      setTotal(0);
      setSummary(null);
      setError(await apiMessage(e, "Couldn't load the purchase orders"));
    } finally {
      if (mine === latest.current && !steppedBack) setLoading(false);
    }
  }, [canView, page, pageSize, supplierId, supplier, showFilters, search, status, payment, branchParam]);

  useEffect(() => {
    load();
  }, [load]);

  // typing waits a moment, so a request isn't sent for every letter; a new search starts at page 1
  useEffect(() => {
    const next = typed.trim();
    if (next === search) return undefined;
    const t = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, next ? SEARCH_DELAY : 0);
    return () => clearTimeout(t);
  }, [typed, search]);

  // a new page starts at the top of its rows
  useEffect(() => {
    rowsRef.current?.scrollTo?.({ top: 0 });
  }, [page, pageSize]);

  /* the supplier picker only matters on the unfiltered screen */
  useEffect(() => {
    if (!showFilters || supplierId || !canView) return;
    http
      .get(`${ORDERS_API}/suppliers`)
      .then((r) => setSuppliers(r.data.data || []))
      .catch(() => setSuppliers([]));
  }, [showFilters, supplierId, canView]);

  /* ---------- the numbers ---------- */
  const money = useMemo(() => {
    // the server's figures cover EVERY matching order, whichever page is showing
    if (summary) {
      return {
        count: total,
        value: Number(summary.value) || 0,
        paid: Number(summary.paid) || 0,
        due: Number(summary.due) || 0,
        open: Number(summary.open) || 0,
      };
    }
    // (a server that doesn't send a summary yet: add up the page we have)
    const live = orders.filter((o) => o.status !== "cancelled");
    const sum = (k) => live.reduce((t, o) => t + (Number(o[k]) || 0), 0);
    return {
      count: total,
      value: sum("grand_total"),
      paid: sum("paid_amount"),
      due: sum("due_amount"),
      open: live.filter((o) => o.status === "draft" || o.status === "ordered").length,
    };
  }, [orders, total, summary]);

  // Hand the figures up, for a parent that shows them somewhere else (the supplier
  // profile modal does). Reported after each load, not on every render.
  useEffect(() => {
    if (onTotals) onTotals(money);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [money]);

  const filtered = showFilters && (search || status !== "all" || payment !== "all" || supplier !== "all" || !!branchParam);

  /* the grid, shared by the headings and the rows so they can never disagree */
  const COLS = withSupplier
    ? "1.3fr 1.1fr 0.6fr 0.5fr 0.8fr 0.8fr 1.6fr"
    : "1.4fr 0.7fr 0.7fr 0.85fr 0.85fr 1.6fr";

  const pageSizes = PAGE_SIZES.includes(startPageSize)
    ? PAGE_SIZES
    : [...PAGE_SIZES, startPageSize].sort((a, b) => a - b);

  // an order open in the page hides the list (kept mounted, so page / filters / scroll stay)
  const showingOrder = inline && !!open;
  useEffect(() => {
    if (onViewing) onViewing(showingOrder);
  }, [showingOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // a different branch picked → back to page 1 (the effect, not the click: the picker owns the value)
  const [seenBranch, setSeenBranch] = useState(branchParam);
  if (seenBranch !== branchParam) {
    setSeenBranch(branchParam);
    setPage(1);
  }

  return (
    <>
    <Box sx={{ flex: 1, minHeight: 0, display: showingOrder ? "none" : "flex", flexDirection: "column" }}>
      {/* ---------------- totals ---------------- */}
      {showTotals && canView && (
        <Box
          sx={{
            flexShrink: 0,
            px: { xs: 0.75, md: 1 },
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "grid",
            gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "repeat(5, 1fr)" },
            "& > *:not(:last-of-type)": { borderRight: 1, borderColor: "divider" },
          }}
        >
          <Stat label="ORDERS" icon={ReceiptLongOutlinedIcon} iconTone="primary" value={loading ? "—" : money.count} />
          <Stat
            label="STILL OPEN"
            icon={PendingActionsOutlinedIcon}
            iconTone="info"
            value={loading ? "—" : money.open}
            tone={money.open ? "info" : undefined}
          />
          <Stat
            label="ORDERED"
            icon={ShoppingCartOutlinedIcon}
            iconTone="secondary"
            value={loading ? "—" : `₹${compactInr(money.value)}`}
          />
          <Stat
            label="PAID"
            icon={PaidOutlinedIcon}
            iconTone="success"
            value={loading ? "—" : `₹${compactInr(money.paid)}`}
            tone="success"
          />
          <Stat
            label="DUE"
            icon={AccountBalanceWalletOutlinedIcon}
            iconTone="error"
            value={loading ? "—" : `₹${compactInr(money.due)}`}
            tone={money.due > 0 ? "error" : undefined}
          />
        </Box>
      )}

      {/* ---------------- filters ---------------- */}
      {showFilters && (
        <PurchaseOrderFilters
          status={status}
          onStatusChange={pickStatus}
          payment={payment}
          onPaymentChange={pickPayment}
          supplier={supplier}
          onSupplierChange={pickSupplier}
          suppliers={supplierId ? null : suppliers}
          branchPicker={br.multi ? <BranchPicker
                state={br}
                label="Deliver to"
                sx={{
                  minWidth: { sm: 170 },
                  "& .MuiOutlinedInput-root": { borderRadius: 2.5, fontSize: 14, bgcolor: "background.paper" },
                  "& .MuiSelect-select": { py: "8.5px" },
                }}
              /> : null}
          branchActive={br.isAdmin && !!br.branch}
          search={typed}
          onSearchChange={setTyped}
          onClear={clearFilters}
        />
      )}

      {/* ---------------- heading ---------------- */}
      {title && (
        <Box
          sx={{
            flexShrink: 0,
            px: { xs: 2, md: 2.5 },
            pt: 1.5,
            pb: 0.75,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <SectionTitle>{title}</SectionTitle>
          <Box sx={{ flex: 1 }} />
          {loading && <CircularProgress size={14} />}
        </Box>
      )}

      {/* ---------------- column headings — desktop only ----------------
          Same side padding + 1px border as a row, and the same scrollbar gutter as
          the row area, so every heading sits exactly over its column. */}
      {canView && !!orders.length && (
        <Box
          sx={{
            flexShrink: 0,
            display: { xs: "none", md: "block" },
            px: 2.5,
            pt: 1.25,
            pb: 0.75,
            overflowY: "hidden",
            scrollbarGutter: "stable",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: COLS,
              gap: 1.5,
              alignItems: "center",
              px: 1.25,
              py: 0.9,
              border: 1,
              borderRadius: 2,
              borderColor: act.line,
              bgcolor: act.soft,
            }}
          >
            <ColHead icon={ReceiptLongOutlinedIcon}>Order</ColHead>
            {withSupplier && <ColHead icon={StorefrontOutlinedIcon}>Supplier</ColHead>}
            <ColHead icon={CalendarMonthOutlinedIcon}>Date</ColHead>
            <ColHead icon={InventoryOutlinedIcon} right>Items</ColHead>
            <ColHead icon={CurrencyRupeeOutlinedIcon} right>Value</ColHead>
            <ColHead icon={AccountBalanceWalletOutlinedIcon} right>Due</ColHead>
            <ColHead icon={FlagOutlinedIcon} right>Status</ColHead>
          </Box>
        </Box>
      )}

      {/* ---------------- rows — the only scrolling region ---------------- */}
      <Box
        ref={rowsRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          scrollbarGutter: "stable",
          ...thinScroll(act.main),
          px: { xs: 2, md: 2.5 },
          pb: 2,
          // another page on its way: the old rows stay put, dimmed and not clickable
          opacity: loading && orders.length ? 0.55 : 1,
          pointerEvents: loading && orders.length ? "none" : "auto",
          transition: "opacity .12s",
        }}
      >
        {!canView ? (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: 2, fontSize: 13, mt: 1 }}>
            Your role can't see purchase orders, so the order history is hidden.
          </Alert>
        ) : error ? (
          <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2, fontSize: 13, mt: 1 }}>
            {error}
          </Alert>
        ) : loading && !orders.length ? (
          <Stack spacing={1} sx={{ pt: 1 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        ) : !orders.length ? (
          <Stack alignItems="center" spacing={1} sx={{ py: 6, textAlign: "center" }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: act.soft,
                mb: 0.5,
              }}
            >
              <InventoryOutlinedIcon sx={{ fontSize: 28, color: act.main }} />
            </Box>
            <Typography sx={{ fontSize: 14.5, fontWeight: 700 }}>
              {filtered ? "Nothing matches those filters" : emptyTitle}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary", maxWidth: 340 }}>
              {filtered ? "Try a different status, payment, supplier or search." : emptyHint}
            </Typography>
            {filtered && (
              <Button
                size="small"
                onClick={clearFilters}
                startIcon={<FilterAltOffOutlinedIcon />}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, mt: 0.5 }}
              >
                Clear filters
              </Button>
            )}
          </Stack>
        ) : (
          <Stack spacing={0.75} sx={{ pt: 0.5 }}>
            {orders.map((o) => {
              const dead = o.status === "cancelled";
              // A cancelled order owes nothing. It is left out of the totals above,
              // so showing a due against it here would contradict them.
              const due = dead ? 0 : Number(o.due_amount) || 0;
              const stripe = toneColor(theme, ORDER_TONE[o.status]);
              return (
                <Box
                  key={o.id}
                  onClick={() => setOpen(o)}
                  sx={{
                    opacity: dead ? 0.6 : 1,
                    display: "grid",
                    gap: { xs: 0.25, md: 1.5 },
                    gridTemplateColumns: { xs: "1fr auto", md: COLS },
                    alignItems: "center",
                    px: 1.25,
                    py: 1,
                    cursor: "pointer",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    // status stripe on the left edge — an inset shadow, so it doesn't move the columns
                    boxShadow: `inset 3px 0 0 ${stripe}`,
                    transition: "border-color .15s, background-color .15s, box-shadow .15s",
                    "&:hover": {
                      borderColor: act.main,
                      bgcolor: act.wash,
                      boxShadow: `inset 3px 0 0 ${stripe}, 0 2px 8px ${act.ring}`,
                    },
                  }}
                >
                  {/* order number — and on a phone, everything else underneath */}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, ...nums }} noWrap>
                      {o.purchase_number}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                      {o.invoice_number ? `Invoice ${o.invoice_number}` : "No invoice number"}
                      {o.branch ? (
                        <Box component="span" title={`Deliver to ${o.branch}`} sx={{ color: "text.primary", fontWeight: 600 }}>
                          {"  ·  "}
                          <PlaceOutlinedIcon sx={{ fontSize: 12, verticalAlign: "-2px", mr: 0.25, color: "primary.main" }} />
                          {o.branch}
                        </Box>
                      ) : null}
                      <Box component="span" sx={{ display: { md: "none" } }}>
                        {withSupplier && o.supplier_name ? `  ·  ${o.supplier_name}` : ""}
                        {"  ·  "}
                        {fmtShortDate(o.purchase_date)}
                        {"  ·  "}
                        {o.items_count || 0} item{Number(o.items_count) === 1 ? "" : "s"}
                      </Box>
                    </Typography>
                  </Box>

                  {withSupplier && (
                    <Typography sx={{ fontSize: 13, display: { xs: "none", md: "block" } }} noWrap>
                      {o.supplier_name || "—"}
                    </Typography>
                  )}

                  <Typography
                    sx={{ fontSize: 12.5, color: "text.secondary", display: { xs: "none", md: "block" }, ...nums }}
                    noWrap
                  >
                    {fmtShortDate(o.purchase_date)}
                  </Typography>

                  <Typography sx={{ fontSize: 13, textAlign: "right", display: { xs: "none", md: "block" }, ...nums }}>
                    {o.items_count || 0}
                  </Typography>

                  {/* value — on a phone this is the right-hand column */}
                  <Box sx={{ textAlign: "right", minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, ...nums }} noWrap>
                      ₹{inr(o.grand_total)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        display: { md: "none" },
                        color: due > 0 ? "error.main" : "text.secondary",
                        ...nums,
                      }}
                      noWrap
                    >
                      {due > 0 ? `₹${inr(due)} due` : dead ? "cancelled" : "settled"}
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 13,
                      textAlign: "right",
                      display: { xs: "none", md: "block" },
                      fontWeight: due > 0 ? 600 : 400,
                      color: due > 0 ? "error.main" : "text.disabled",
                      ...nums,
                    }}
                    noWrap
                  >
                    {due > 0 ? `₹${inr(due)}` : "—"}
                  </Typography>

                  <Box
                    sx={{
                      display: { xs: "none", md: "flex" },
                      justifyContent: "flex-end",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 0.5,
                    }}
                  >
                    {onReceive && o.status === "ordered" && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReceive(o);
                        }}
                        sx={{ textTransform: "none", fontSize: 11.5, fontWeight: 700, py: 0, px: 1, minWidth: 0, lineHeight: 1.8 }}
                      >
                        Receive
                      </Button>
                    )}
                    <Chip
                      size="small"
                      label={o.status}
                      color={ORDER_TONE[o.status] || "default"}
                      variant={o.status === "received" ? "filled" : "outlined"}
                      sx={{ height: 20, fontSize: 10.5, fontWeight: 700, textTransform: "capitalize" }}
                    />
                    {!dead && o.status !== "draft" && o.payment_status && (
                      <Chip
                        size="small"
                        label={o.payment_status}
                        color={PAY_TONE[o.payment_status] || "default"}
                        variant="outlined"
                        sx={{ height: 20, fontSize: 10.5, fontWeight: 700, textTransform: "capitalize" }}
                      />
                    )}
                  </Box>

                  {/* phone: both chips ride under the value */}
                  <Box sx={{ display: { xs: "flex", md: "none" }, gridColumn: "1 / -1", gap: 0.5, pt: 0.4 }}>
                    <Chip
                      size="small"
                      label={o.status}
                      color={ORDER_TONE[o.status] || "default"}
                      variant={o.status === "received" ? "filled" : "outlined"}
                      sx={{ height: 19, fontSize: 10, fontWeight: 700, textTransform: "capitalize" }}
                    />
                    <Chip
                      size="small"
                      label={o.payment_status}
                      color={PAY_TONE[o.payment_status] || "default"}
                      variant="outlined"
                      sx={{ height: 19, fontSize: 10, fontWeight: 700, textTransform: "capitalize" }}
                    />
                    {onReceive && o.status === "ordered" && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReceive(o);
                        }}
                        sx={{ textTransform: "none", fontSize: 11, fontWeight: 700, py: 0, px: 1, minWidth: 0, ml: "auto !important" }}
                      >
                        Receive
                      </Button>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* ---------------- pager — pinned under the rows ---------------- */}
      {canView && !error && total > 0 && (
        <AppPager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          pageSizeOptions={pageSizes}
          onPageSizeChange={pickPageSize}
          disabled={loading}
          sx={{ px: { xs: 2, md: 2.5 }, borderColor: act.line, bgcolor: act.wash }}
        />
      )}
    </Box>

      <PurchaseOrderDialog
        inline={inline}
        order={open}
        onClose={() => setOpen(null)}
        onChanged={load}
        onReceive={
          onReceive
            ? (o) => {
              setOpen(null);
              onReceive(o);
            }
            : undefined
        }
      />
    </>
  );
}