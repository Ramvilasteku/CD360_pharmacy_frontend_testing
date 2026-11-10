// src/pharmacy/b2b/B2BInvoiceList.js
//
// Every B2B invoice — what you sold to other pharmacies, what they have paid, what is still due.
//
// Layout contract (same as the purchase list): a flex COLUMN that fills the box you give it;
// only the row area scrolls. Give it a parent with a real height (flex: 1, minHeight: 0).
//
// Backend: routes/pharmacy/pharmacyB2BSales.js @ /api/pharmacy/b2b-sales
//   GET /get?status=&payment_status=&search=&page=&limit=
//        → { data (this page), pagination {page, limit, total, total_pages},
//            summary {count, value, paid, due, open} for EVERY matching invoice }
//
// Paging: 20 invoices at a time (5 / 10 / 20 / 50 / 100) with the shared <AppPager> (at most three page
// numbers). It is on screen while there is at least one invoice, so a short filtered list still shows
// "1–3 of 3". Changing any filter, the search or the branch goes back to page 1; a change made in the
// invoice dialog reloads in place.
//
// Colours: all from purchaseStyles (src/theme/appColors.js).
//
// Needs pharmacy.b2b_sales.view. With canView={false} it says so instead of firing a request that 403s.
//
// Usage
//   <B2BInvoiceList canView={can("pharmacy.b2b_sales.view")} reloadKey={n} branchParams={br.params} />
//   `reloadKey` — bump it (e.g. after issuing an invoice) to reload the current page.
//   `branchParams` — { branch } from usePharmacyBranch (admin of several branches); {} = all branches.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, IconButton, InputAdornment, MenuItem,
  Skeleton, Stack, TextField, Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import PointOfSaleOutlinedIcon from "@mui/icons-material/PointOfSaleOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CurrencyRupeeOutlinedIcon from "@mui/icons-material/CurrencyRupeeOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";

import { ColHead, IconTile, fade, inputSx, nums, thinScroll, tints, toneColor } from "../purchase/purchaseStyles";
import B2BInvoiceDialog from "./B2BInvoiceDialog";
import AppPager from "../shared/AppPager";
import {
  B2B_API, InvoiceChips, STATUS_TONE, apiMessage, compactInr, fmtShortDate, http, inr,
} from "./b2bShared";

const PAGE_SIZES = [5, 10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DELAY = 300;

const STATUS_OPTIONS = [
  { value: "all", label: "All invoices" },
  { value: "completed", label: "Issued" },
  { value: "cancelled", label: "Cancelled" },
];
const PAYMENT_OPTIONS = [
  { value: "all", label: "All payments" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Part paid" },
  { value: "paid", label: "Paid" },
];

/* One number in the strip above the rows. */
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
          sx={{ fontSize: { xs: 15, md: 17 }, fontWeight: 800, lineHeight: 1.25, ...nums, color: tone ? toneColor(theme, tone) : "text.primary" }}
          noWrap
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/* A plain dropdown filter; turns primary-tinted when it is narrowing the list. */
function FilterSelect({ label, value, onChange, options, width }) {
  const theme = useTheme();
  const active = value !== "all";
  const color = active ? toneColor(theme, "primary") : toneColor(theme, "neutral");
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width, flexShrink: 0, ...inputSx(color, active) }}
      SelectProps={{ MenuProps: { PaperProps: { sx: { mt: 0.75, borderRadius: 2.5, minWidth: 190 } } } }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value} sx={{ fontSize: 14, fontWeight: o.value === value ? 700 : 500 }}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default function B2BInvoiceList({
  canView = true,          // pharmacy.b2b_sales.view
  reloadKey = 0,           // bump to reload the page on screen
  title = null,
  pageSize: startPageSize = DEFAULT_PAGE_SIZE,
  emptyTitle = "No B2B invoices yet",
  emptyHint = "Sell to another pharmacy with New invoice, and it shows up here.",
  canSend,                 // passed through to the dialog (defaults to its own permission check)
  onChanged,               // () => void — an invoice was paid / cancelled in the dialog
  inline = false,          // open an invoice as a section of the page (list hidden behind it) instead of a popup
  onViewing,               // (bool) => void — an invoice is open / closed (the page uses it to hide its own header)
  branchParams,            // { branch } — only this branch's invoices (admin); omit for all
}) {
  const branch = (branchParams && branchParams.branch) || "";
  const theme = useTheme();
  const act = tints(theme, "primary");

  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(startPageSize);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);

  const [search, setSearch] = useState("");
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const rowsRef = useRef(null);
  const latest = useRef(0); // a slow answer to an old click must never overwrite a newer one

  const pick = (setter) => (v) => {
    setter(v);
    setPage(1);
  };
  const pickStatus = pick(setStatus);
  const pickPayment = pick(setPayment);
  const pickPageSize = pick(setPageSize);

  const clearFilters = () => {
    setStatus("all");
    setPayment("all");
    setTyped("");
    setSearch("");
    setPage(1);
  };

  /* ---------- load ---------- */
  const load = useCallback(async () => {
    const mine = ++latest.current;
    if (!canView) {
      setInvoices([]);
      setTotal(0);
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    let steppedBack = false;
    try {
      const params = { page, limit: pageSize };
      if (branch) params.branch = branch;
      if (search.trim()) params.search = search.trim();
      if (status !== "all") params.status = status;
      if (payment !== "all") params.payment_status = payment;
      const r = await http.get(`${B2B_API}/get`, { params });
      if (mine !== latest.current) return;
      const rows = r.data.data || [];
      const pg = r.data.pagination || {};
      const count = pg.total ?? rows.length;
      const pages = Math.max(1, pg.total_pages || Math.ceil(count / pageSize) || 1);
      // The page we asked for no longer exists (its last invoice was filtered away) → step back to the
      // new last page. The old rows stay (dimmed) until it arrives.
      if (!rows.length && count > 0 && page > pages) {
        steppedBack = true;
        setPage(pages);
        return;
      }
      setInvoices(rows);
      setTotal(count);
      setSummary(r.data.summary || null);
    } catch (e) {
      if (mine !== latest.current) return;
      setInvoices([]);
      setTotal(0);
      setSummary(null);
      setError(await apiMessage(e, "Couldn't load the invoices"));
    } finally {
      if (mine === latest.current && !steppedBack) setLoading(false);
    }
  }, [canView, page, pageSize, search, status, payment, branch]);

  useEffect(() => {
    load();
    // reloadKey is a deliberate extra trigger: the parent bumps it after issuing an invoice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, reloadKey]);

  // typing waits a moment so a request isn't sent for every letter; a new search starts at page 1
  useEffect(() => {
    const next = typed.trim();
    if (next === search) return undefined;
    const t = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, next ? SEARCH_DELAY : 0);
    return () => clearTimeout(t);
  }, [typed, search]);

  useEffect(() => {
    rowsRef.current?.scrollTo?.({ top: 0 });
  }, [page, pageSize]);

  // another branch → start again at page 1
  const firstBranch = useRef(branch);
  useEffect(() => {
    if (firstBranch.current === branch) return;
    firstBranch.current = branch;
    setPage(1);
  }, [branch]);

  /* ---------- the numbers ---------- */
  const money = useMemo(() => {
    if (summary) {
      return {
        count: total,
        value: Number(summary.value) || 0,
        paid: Number(summary.paid) || 0,
        due: Number(summary.due) || 0,
        open: Number(summary.open) || 0,
      };
    }
    const live = invoices.filter((o) => o.status !== "cancelled");
    const sum = (k) => live.reduce((t, o) => t + (Number(o[k]) || 0), 0);
    return {
      count: total,
      value: sum("grand_total"),
      paid: sum("paid_amount"),
      due: sum("due_amount"),
      open: live.filter((o) => o.payment_status !== "paid").length,
    };
  }, [invoices, total, summary]);

  const filtered = search || status !== "all" || payment !== "all";
  const COLS = "1.3fr 1.3fr 0.6fr 0.5fr 0.8fr 0.8fr 1.1fr";
  const pageSizes = PAGE_SIZES.includes(startPageSize)
    ? PAGE_SIZES
    : [...PAGE_SIZES, startPageSize].sort((a, b) => a - b);

  const showingInvoice = inline && !!open;
  useEffect(() => {
    if (onViewing) onViewing(showingInvoice);
  }, [showingInvoice]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <Box sx={{ flex: 1, minHeight: 0, display: showingInvoice ? "none" : "flex", flexDirection: "column" }}>
      {/* ---------------- totals ---------------- */}
      {canView && (
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
          <Stat label="INVOICES" icon={ReceiptLongOutlinedIcon} iconTone="primary" value={loading && !summary ? "—" : money.count} />
          <Stat
            label="NOT SETTLED"
            icon={PendingActionsOutlinedIcon}
            iconTone="info"
            value={loading && !summary ? "—" : money.open}
            tone={money.open ? "info" : undefined}
          />
          <Stat label="BILLED" icon={PointOfSaleOutlinedIcon} iconTone="secondary" value={loading && !summary ? "—" : `₹${compactInr(money.value)}`} />
          <Stat label="RECEIVED" icon={PaidOutlinedIcon} iconTone="success" value={loading && !summary ? "—" : `₹${compactInr(money.paid)}`} tone="success" />
          <Stat
            label="TO COLLECT"
            icon={AccountBalanceWalletOutlinedIcon}
            iconTone="error"
            value={loading && !summary ? "—" : `₹${compactInr(money.due)}`}
            tone={money.due > 0 ? "error" : undefined}
          />
        </Box>
      )}

      {/* ---------------- filters ---------------- */}
      {canView && (
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            flexWrap: "wrap",
            px: { xs: 2, md: 2.5 },
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: fade(toneColor(theme, "primary"), 0.025),
          }}
        >
          <FilterSelect label="Status" value={status} onChange={pickStatus} options={STATUS_OPTIONS} width={{ xs: "calc(50% - 5px)", sm: 165 }} />
          <FilterSelect label="Payment" value={payment} onChange={pickPayment} options={PAYMENT_OPTIONS} width={{ xs: "calc(50% - 5px)", sm: 165 }} />
          <TextField
            size="small"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Search invoice number, buyer, phone, GSTIN…"
            sx={{
              flex: 1,
              minWidth: { xs: "100%", sm: 220 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2.5,
                bgcolor: "background.paper",
                fontSize: 14,
                ...(typed && { "& fieldset": { borderColor: fade(toneColor(theme, "primary"), 0.55) } }),
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: typed ? "primary.main" : "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: typed ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setTyped("")} aria-label="Clear search">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          {(filtered || typed) && (
            <Button
              size="small"
              onClick={clearFilters}
              startIcon={<FilterAltOffOutlinedIcon />}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                color: "text.secondary",
                flexShrink: 0,
                "&:hover": { color: "error.main", bgcolor: fade(toneColor(theme, "error"), 0.06) },
              }}
            >
              Clear
            </Button>
          )}
        </Box>
      )}

      {title && (
        <Box sx={{ flexShrink: 0, px: { xs: 2, md: 2.5 }, pt: 1.5, pb: 0.75, display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>{title}</Typography>
          <Box sx={{ flex: 1 }} />
          {loading && <CircularProgress size={14} />}
        </Box>
      )}

      {/* ---------------- column headings — desktop only ---------------- */}
      {canView && !!invoices.length && (
        <Box sx={{ flexShrink: 0, display: { xs: "none", md: "block" }, px: 2.5, pt: 1.25, pb: 0.75, overflowY: "hidden", scrollbarGutter: "stable" }}>
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
            <ColHead icon={ReceiptLongOutlinedIcon}>Invoice</ColHead>
            <ColHead icon={StorefrontOutlinedIcon}>Buyer</ColHead>
            <ColHead icon={CalendarMonthOutlinedIcon}>Date</ColHead>
            <ColHead icon={InventoryOutlinedIcon} right>Lines</ColHead>
            <ColHead icon={CurrencyRupeeOutlinedIcon} right>Total</ColHead>
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
          opacity: loading && invoices.length ? 0.55 : 1,
          pointerEvents: loading && invoices.length ? "none" : "auto",
          transition: "opacity .12s",
        }}
      >
        {!canView ? (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: 2, fontSize: 13, mt: 1 }}>
            Your role can't see B2B sales, so the invoices are hidden.
          </Alert>
        ) : error ? (
          <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2, fontSize: 13, mt: 1 }}>
            {error}
          </Alert>
        ) : loading && !invoices.length ? (
          <Stack spacing={1} sx={{ pt: 1 }} data-testid="invoice-skeleton">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        ) : !invoices.length ? (
          <Stack alignItems="center" spacing={1} sx={{ py: 6, textAlign: "center" }}>
            <Box sx={{ width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: act.soft, mb: 0.5 }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 28, color: act.main }} />
            </Box>
            <Typography sx={{ fontSize: 14.5, fontWeight: 700 }}>{filtered ? "Nothing matches those filters" : emptyTitle}</Typography>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary", maxWidth: 340 }}>
              {filtered ? "Try a different status, payment or search." : emptyHint}
            </Typography>
            {filtered && (
              <Button size="small" onClick={clearFilters} startIcon={<FilterAltOffOutlinedIcon />} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, mt: 0.5 }}>
                Clear filters
              </Button>
            )}
          </Stack>
        ) : (
          <Stack spacing={0.75} sx={{ pt: 0.5 }}>
            {invoices.map((o) => {
              const dead = o.status === "cancelled";
              const due = dead ? 0 : Number(o.due_amount) || 0;
              const stripe = toneColor(theme, STATUS_TONE[o.status] === "error" ? "error" : o.payment_status === "paid" ? "success" : o.payment_status === "partial" ? "warning" : "primary");
              return (
                <Box
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpen(o)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpen(o);
                    }
                  }}
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
                    boxShadow: `inset 3px 0 0 ${stripe}`,
                    transition: "border-color .15s, background-color .15s, box-shadow .15s",
                    "&:hover": { borderColor: act.main, bgcolor: act.wash, boxShadow: `inset 3px 0 0 ${stripe}, 0 2px 8px ${act.ring}` },
                    "&:focus-visible": { outline: "none", boxShadow: `inset 3px 0 0 ${stripe}, 0 0 0 3px ${act.ring}` },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, ...nums }} noWrap>
                      {o.invoice_number}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                      <Box component="span" sx={{ display: { xs: "inline", md: "none" } }}>
                        {o.buyer_name || "—"}
                        {"  ·  "}
                        {fmtShortDate(o.invoice_date)}
                        {"  ·  "}
                        {o.items_count || 0} line{Number(o.items_count) === 1 ? "" : "s"}
                      </Box>
                      <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                        {o.buyer_gstin ? `GSTIN ${o.buyer_gstin}` : "No GSTIN"}
                      </Box>
                    </Typography>
                  </Box>

                  <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13 }} noWrap>
                      {o.buyer_name || "—"}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }} noWrap>
                      {o.buyer_phone || ""}
                    </Typography>
                  </Box>

                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", display: { xs: "none", md: "block" }, ...nums }} noWrap>
                    {fmtShortDate(o.invoice_date)}
                  </Typography>

                  <Typography sx={{ fontSize: 13, textAlign: "right", display: { xs: "none", md: "block" }, ...nums }}>
                    {o.items_count || 0}
                  </Typography>

                  <Box sx={{ textAlign: "right", minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, ...nums }} noWrap>
                      ₹{inr(o.grand_total)}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, display: { md: "none" }, color: due > 0 ? "error.main" : "text.secondary", ...nums }} noWrap>
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

                  <Box sx={{ display: { xs: "none", md: "flex" }, justifyContent: "flex-end", alignItems: "center", gap: 0.5 }}>
                    <InvoiceChips status={o.status} paymentStatus={o.payment_status} />
                  </Box>

                  <Box sx={{ display: { xs: "flex", md: "none" }, gridColumn: "1 / -1", gap: 0.5, pt: 0.4 }}>
                    <InvoiceChips status={o.status} paymentStatus={o.payment_status} />
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
          sx={{ borderColor: act.line, bgcolor: act.wash }}
        />
      )}
    </Box>

    <B2BInvoiceDialog
      inline={inline}
      invoice={open}
      canSend={canSend}
      onClose={() => setOpen(null)}
      onChanged={() => {
        load();
        if (onChanged) onChanged();
      }}
    />
    </>
  );
}