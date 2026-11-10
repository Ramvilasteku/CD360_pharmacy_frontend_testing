// src/components/pharmacy/sales/list/AllSales.jsx
//
// Responsive sales list — orchestrator only.
// Pieces live in SalesListPieces.jsx, helpers in salesListHelpers.js, config in salesListConstants.js.
//
// Usage:
//   <AllSales />                                         // self-contained (modal + PDF built-in)
//   <AllSales onView={fn} onPrint={fn} />                // parent handles actions
//   <AllSales onNewSale={fn} title="Sales" />            // header controls

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { usePermission } from "../../../Redux/store/hooks/usePermissions";
import {
  Box, Stack, Paper, Typography, TextField, MenuItem, Button, IconButton,
  InputAdornment, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, TableSortLabel, TablePagination, Pagination, LinearProgress,
  Skeleton, Alert, Tooltip, Badge, Chip, Drawer, Divider, useMediaQuery,
  CircularProgress,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import SwapVertIcon from "@mui/icons-material/SwapVert";

import { useElementWidth, useFitToScreen } from "../useFitToScreen";
import InvoicePreviewDialog from "./InvoicePreviewDialog";
import { generateInvoicePdf } from "../utils/generateInvoicePdf";

import {
  STATUS_TABS, STATUS_META, COLUMNS, DATE_RANGES, SORT_OPTIONS,
  DEFAULT_QUERY, SKELETON_ROWS, srOnly, numeric,
} from "./salesListConstants";
import {
  money, rangeToDates, formatSaleDate, rangeLabel,
} from "./salesListHelpers";
import {
  StatusPill, BalanceText, EmptyState, SaleCard, SaleCardSkeleton,
} from "./SalesListPieces";

/* ───────────────────────────── main ───────────────────────────── */

export default function AllSales({ onView, onPrint, onNewSale, title = "Sales", branchParams = {} }) {
  // Added 25 Oct: this screen had no permission check of any kind. The page itself is now
  // opened by pharmacy.sales.view at the route level (Routes/pharmacyRoutes.jsx), and the
  // one action on it that writes anything is the New sale shortcut, which needs
  // pharmacy.sales.create — the same key POS checks before it will bill.
  const canCreateSale = usePermission("pharmacy.sales.create");
  const theme = useTheme();
  const isMobileViewport = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const isWideViewport = useMediaQuery(theme.breakpoints.up("lg"), { noSsr: true });

  // Layout follows the space this screen really has (after any sidebar), not the window size
  const topRef = useRef(null);
  const listRef = useRef(null);
  const width = useElementWidth(topRef);
  const isMobile = width == null ? isMobileViewport : width < 700;
  const isWide = width == null ? isWideViewport : width >= 1060;
  const isPhoneViewport = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const fitHeight = useFitToScreen(listRef, !isPhoneViewport);

  // Query state
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [range, setRange] = useState("all");

  // Data state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Invoice preview + PDF state
  const [previewSaleId, setPreviewSaleId] = useState(null);
  const [printingId, setPrintingId] = useState(null);

  const searchRef = useRef(null);

  const update = useCallback((patch) => {
    setQuery((q) => ({ ...q, page: 0, ...patch }));
  }, []);

  /* ─────────── default view/print handlers (used if parent didn't pass any) ─────────── */

  const defaultView = useCallback((sale) => {
    setPreviewSaleId(sale.id);
  }, []);

  const defaultPrint = useCallback(async (sale) => {
    if (printingId) return; // Already printing something — ignore double-click
    setPrintingId(sale.id);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_URL}/api/pharmacy/sales/${sale.id}/invoice`,
        { withCredentials: true }
      );
      await generateInvoicePdf(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate PDF");
    } finally {
      setPrintingId(null);
    }
  }, [printingId]);

  // Resolve handlers: parent-provided prop wins; otherwise fall back to defaults.
  const viewHandler = onView || defaultView;
  const printHandler = onPrint || defaultPrint;

  /* ─────────── search debounce + keyboard shortcut ─────────── */

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === query.search) return;
    const t = setTimeout(() => update({ search: trimmed }), 400);
    return () => clearTimeout(t);
  }, [searchInput, query.search, update]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target;
      if (el?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el?.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dateRangeInvalid = Boolean(query.from && query.to && query.from > query.to);

  /* ─────────── fetch effect ─────────── */

  useEffect(() => {
    if (dateRangeInvalid) return;
    const controller = new AbortController();

    const params = new URLSearchParams();
    params.set("page", query.page + 1);
    params.set("limit", query.limit);
    params.set("sort_by", query.sortBy);
    params.set("sort_order", query.sortDir.toUpperCase());
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("payment_status", query.status);
    if (query.from) params.set("start_date", query.from);
    if (query.to) params.set("end_date", query.to);
    // Branch chosen in the Sales header; absent means every branch.
    if (branchParams.branch) params.set("branch", branchParams.branch);

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_URL}/api/pharmacy/sales?${params}`,
          { withCredentials: true, signal: controller.signal }
        );
        const list = res.data.data || [];
        const count = res.data.total ?? res.data.pagination?.total ?? list.length;
        setRows(list);
        setTotal(count);
        setHasLoaded(true);

        // Jump to the new last page if filtering emptied the current one
        if (list.length === 0 && count > 0 && query.page > 0) {
          setQuery((q) => ({ ...q, page: Math.max(0, Math.ceil(count / q.limit) - 1) }));
        }
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Could not load sales. Please check your connection and try again.");
        setRows([]);
        setTotal(0);
        setHasLoaded(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [query, dateRangeInvalid, reloadKey, branchParams.branch]);

  /* ─────────── handlers ─────────── */

  const handleSort = (columnId) => {
    const isAsc = query.sortBy === columnId && query.sortDir === "asc";
    update({ sortBy: columnId, sortDir: isAsc ? "desc" : "asc" });
  };

  const selectRange = (value) => {
    setRange(value);
    if (value === "custom") return;
    update(rangeToDates(value));
  };

  const hasActiveFilters = Boolean(query.search || query.status || query.from || query.to);
  const isDefaultSort = query.sortBy === DEFAULT_QUERY.sortBy && query.sortDir === DEFAULT_QUERY.sortDir;

  const clearFilters = () => {
    setSearchInput("");
    setRange("all");
    update({ search: "", status: "", from: "", to: "" });
  };

  const resetSheet = () => {
    setRange("all");
    update({ from: "", to: "", sortBy: DEFAULT_QUERY.sortBy, sortDir: DEFAULT_QUERY.sortDir });
  };

  const goToPage = (page) => {
    setQuery((q) => ({ ...q, page }));
    const top = topRef.current;
    if (top && top.getBoundingClientRect().top < 0) {
      top.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    update({ search: "" });
  };

  const sortValue = `${query.sortBy}:${query.sortDir}`;
  const sortOptions = SORT_OPTIONS.some((o) => o.value === sortValue)
    ? SORT_OPTIONS
    : [...SORT_OPTIONS, {
      value: sortValue,
      label: `${COLUMNS.find((c) => c.id === query.sortBy)?.label ?? query.sortBy} (${query.sortDir === "asc" ? "ascending" : "descending"})`,
    }];
  const sortLabel = sortOptions.find((o) => o.value === sortValue)?.label;

  const sheetFilterCount = (range !== "all" ? 1 : 0) + (isDefaultSort ? 0 : 1);
  const visibleColumns = COLUMNS.filter((c) => !c.wideOnly || isWide);
  const showSkeleton = loading && rows.length === 0 && !error;
  const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const firstShown = total === 0 ? 0 : query.page * query.limit + 1;
  const lastShown = Math.min(total, (query.page + 1) * query.limit);

  const subtitle = !hasLoaded
    ? "Loading sales…"
    : total === 0 && hasActiveFilters
      ? "No sales match your filters"
      : `${total.toLocaleString("en-IN")} ${total === 1 ? "sale" : "sales"}${hasActiveFilters ? " match your filters" : ""}`;

  /* ─────────── shared field elements ─────────── */

  const searchField = (
    <TextField
      size="small"
      fullWidth
      placeholder={isMobile ? "Search sale # or customer" : "Search by sale # or customer name"}
      value={searchInput}
      inputRef={searchRef}
      onChange={(e) => setSearchInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") update({ search: searchInput.trim() });
        if (e.key === "Escape" && searchInput) clearSearch();
      }}
      inputProps={{ "aria-label": "Search sales", enterKeyHint: "search", maxLength: 50 }}
      InputProps={{
        sx: { borderRadius: "10px", bgcolor: "background.paper" },
        startAdornment: (
          <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
        ),
        endAdornment: searchInput ? (
          <InputAdornment position="end">
            <IconButton size="small" edge="end" aria-label="Clear search" onClick={clearSearch}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : !isMobile && (
          <InputAdornment position="end">
            <Box component="kbd" title="Press / to search" sx={{
              fontFamily: "inherit", fontSize: 12, lineHeight: "18px", px: "6px", borderRadius: "5px",
              border: 1, borderColor: "divider", color: "text.secondary",
            }}>/</Box>
          </InputAdornment>
        ),
      }}
    />
  );

  const dateFields = (
    <>
      <TextField
        size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
        value={query.from} inputProps={{ max: query.to || undefined }}
        error={dateRangeInvalid}
        onChange={(e) => update({ from: e.target.value })}
        InputProps={{ sx: { borderRadius: "10px" } }}
        sx={{ minWidth: 0 }}
      />
      <TextField
        size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
        value={query.to} inputProps={{ min: query.from || undefined }}
        error={dateRangeInvalid}
        helperText={dateRangeInvalid ? "Must be on or after 'From'" : ""}
        onChange={(e) => update({ to: e.target.value })}
        InputProps={{ sx: { borderRadius: "10px" } }}
        sx={{ minWidth: 0 }}
      />
    </>
  );

  /* ─────────── render ─────────── */

  return (
    <Box ref={topRef} sx={{ scrollMarginTop: 80, minWidth: 0, contain: "inline-size" }}>
      {title && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}
          sx={{ mb: { xs: 2, md: 3 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" fontWeight={700}
              sx={{ fontSize: { xs: 22, md: 26 } }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" aria-live="polite">
              {subtitle}
            </Typography>
          </Box>
          {onNewSale && canCreateSale && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={onNewSale}
              disableElevation
              sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 600, flexShrink: 0, px: { xs: 2, md: 2.5 } }}>
              New sale
            </Button>
          )}
        </Stack>
      )}

      <Paper
        ref={listRef}
        variant="outlined"
        sx={isMobile
          ? {
            border: 0, bgcolor: "transparent", overflow: "visible",
            ...(fitHeight && { display: "flex", flexDirection: "column", maxHeight: fitHeight }),
          }
          : {
            borderRadius: "16px", overflow: "hidden",
            display: "flex", flexDirection: "column", maxHeight: fitHeight ?? undefined,
          }}
      >
        {/* Status tabs */}
        <Tabs
          value={query.status || "all"}
          onChange={(_, v) => update({ status: v === "all" ? "" : v })}
          variant={isMobile ? "fullWidth" : "standard"}
          aria-label="Filter by payment status"
          sx={{
            px: { md: 1.5 }, minHeight: 48, borderBottom: 1, borderColor: "divider", flexShrink: 0,
            "& .MuiTab-root": {
              textTransform: "none", fontWeight: 600, fontSize: 14,
              minHeight: 48, minWidth: { xs: 0, md: 88 },
            },
          }}
        >
          {STATUS_TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={
              <Stack direction="row" alignItems="center" spacing={0.75} component="span">
                {STATUS_META[t.value] && (
                  <Box component="span" sx={{
                    width: 7, height: 7, borderRadius: "50%",
                    bgcolor: `${STATUS_META[t.value].color}.main`,
                  }} />
                )}
                <span>{t.label}</span>
              </Stack>
            } />
          ))}
        </Tabs>

        {/* Toolbar */}
        {isMobile ? (
          <>
            <Stack direction="row" spacing={1} sx={{ py: 1.5 }}>
              {searchField}
              <Badge color="primary" badgeContent={sheetFilterCount} overlap="rectangular"
                sx={{ "& .MuiBadge-badge": { top: 4, right: 4 } }}>
                <Button
                  variant="outlined" color="inherit" onClick={() => setDrawerOpen(true)}
                  aria-label="Date and sort options"
                  sx={{
                    minWidth: 40, height: 40, px: 1.25, borderRadius: "10px", borderColor: "divider",
                    bgcolor: "background.paper", textTransform: "none", fontWeight: 600,
                  }}
                >
                  <TuneIcon fontSize="small" />
                  <Box component="span" sx={{ ml: 0.75, display: { xs: "none", sm: "inline" } }}>
                    Filters
                  </Box>
                </Button>
              </Badge>
            </Stack>

            {(range !== "all" || !isDefaultSort) && (
              <Stack direction="row" spacing={1} sx={{ pb: 1.5, overflowX: "auto" }}>
                {range !== "all" && (
                  <Chip size="small" icon={<EventOutlinedIcon />}
                    label={rangeLabel(range, query.from, query.to)}
                    onDelete={() => selectRange("all")}
                    onClick={() => setDrawerOpen(true)} />
                )}
                {!isDefaultSort && (
                  <Chip size="small" icon={<SwapVertIcon />} label={sortLabel}
                    onDelete={() => update({ sortBy: DEFAULT_QUERY.sortBy, sortDir: DEFAULT_QUERY.sortDir })}
                    onClick={() => setDrawerOpen(true)} />
                )}
              </Stack>
            )}
          </>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-start", p: 2 }}>
            <Box sx={{ flex: "1 1 280px", maxWidth: 440 }}>{searchField}</Box>
            <TextField
              select size="small" label="Date" value={range}
              onChange={(e) => selectRange(e.target.value)}
              sx={{ width: 190 }}
              InputProps={{
                sx: { borderRadius: "10px" },
                startAdornment: (
                  <InputAdornment position="start">
                    <EventOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            >
              {DATE_RANGES.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>
            {range === "custom" && (
              <Box sx={{ display: "grid", gridTemplateColumns: "160px 160px", gap: 1.5 }}>
                {dateFields}
              </Box>
            )}
            {hasActiveFilters && (
              <Button onClick={clearFilters} startIcon={<ClearIcon />}
                sx={{ height: 40, ml: "auto", textTransform: "none", fontWeight: 600, borderRadius: "10px" }}>
                Clear filters
              </Button>
            )}
          </Box>
        )}

        {/* Loading bar (refreshing existing results) */}
        <Box sx={{ height: 2, mx: isMobile ? 0 : undefined }}>
          {loading && !showSkeleton && <LinearProgress sx={{ height: 2 }} />}
        </Box>

        {error && (
          <Alert severity="error"
            sx={{ mx: isMobile ? 0 : 2, my: 2, borderRadius: "10px" }}
            action={<Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>}>
            {error}
          </Alert>
        )}

        {/* Results */}
        {isMobile ? (
          <Box sx={{
            opacity: loading && !showSkeleton ? 0.55 : 1, transition: "opacity .15s",
            ...(fitHeight && {
              flex: "1 1 auto", minHeight: 0, overflowY: "auto",
              overscrollBehavior: "contain", pb: 0.5,
            }),
          }}>
            {showSkeleton ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                {Array.from({ length: 4 }).map((_, i) => <SaleCardSkeleton key={i} />)}
              </Box>
            ) : rows.length > 0 ? (
              <Box component="ul" aria-label="Sales"
                sx={{
                  listStyle: "none", m: 0, p: 0, display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5,
                }}>
                {rows.map((s) => (
                  <Box component="li" key={s.id ?? s.sale_number}
                    sx={{ display: "flex", "& > *": { flex: 1 } }}>
                    <SaleCard sale={s} onView={viewHandler} />
                  </Box>
                ))}
              </Box>
            ) : !error && !loading && (
              <Paper variant="outlined" sx={{ borderRadius: "14px" }}>
                <EmptyState filtered={hasActiveFilters} onClear={clearFilters} />
              </Paper>
            )}
          </Box>
        ) : (
          <TableContainer sx={{ flex: "1 1 auto", minHeight: 0, position: "relative" }}>
            <Table stickyHeader sx={{
              minWidth: 680,
              "& th": {
                fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase",
                color: "text.secondary", whiteSpace: "nowrap", py: 1.25,
                bgcolor: "background.paper",
                backgroundImage: `linear-gradient(${alpha(theme.palette.text.primary, 0.03)}, ${alpha(theme.palette.text.primary, 0.03)})`,
              },
              "& td": { py: 1.5 },
              "& tr:last-of-type td": { borderBottom: 0 },
              ...(width != null && width < 1000 && { "& th, & td": { px: 1.25 } }),
            }}>
              <TableHead>
                <TableRow>
                  {visibleColumns.map((c) => (
                    <TableCell key={c.id} align={c.align}
                      sortDirection={query.sortBy === c.id ? query.sortDir : false}>
                      {c.sortable ? (
                        <TableSortLabel
                          active={query.sortBy === c.id}
                          direction={query.sortBy === c.id ? query.sortDir : "asc"}
                          onClick={() => handleSort(c.id)}>
                          {c.label}
                        </TableSortLabel>
                      ) : c.hiddenLabel
                        ? <Box component="span" sx={srOnly}>{c.label}</Box>
                        : c.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody sx={{ opacity: loading && !showSkeleton ? 0.55 : 1, transition: "opacity .15s" }}>
                {showSkeleton && Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {visibleColumns.map((c) => (
                      <TableCell key={c.id} align={c.align}>
                        <Skeleton
                          width={c.id === "customer_name" ? 140 : c.id === "actions" ? 64 : 80}
                          sx={{ display: "inline-block" }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {rows.map((s) => {
                  const date = formatSaleDate(s.sale_date);
                  const customer = s.customer_name?.trim();
                  const isPrintingThis = printingId === s.id;
                  return (
                    <TableRow key={s.id ?? s.sale_number} hover
                      onClick={() => viewHandler(s)}
                      sx={{ cursor: "pointer" }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap color="primary.main">
                          {s.sale_number}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography variant="body2">{date.day}</Typography>
                        {date.time && (
                          <Typography variant="caption" color="text.secondary">{date.time}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="body2" noWrap
                          color={customer ? "text.primary" : "text.secondary"}>
                          {customer || "Walk-in"}
                        </Typography>
                        {s.customer_phone && (
                          <Typography variant="caption" color="text.secondary"
                            noWrap component="div">
                            {s.customer_phone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} sx={numeric}>
                          {money(s.grand_total)}
                        </Typography>
                      </TableCell>
                      {isWide && (
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary" sx={numeric}>
                            {money(s.paid_amount)}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell align="right"><BalanceText sale={s} /></TableCell>
                      <TableCell><StatusPill status={s.payment_status} /></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap", py: 0.5 }}
                        onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="View sale">
                          <IconButton size="small"
                            aria-label={`View sale ${s.sale_number}`}
                            onClick={() => viewHandler(s)}>
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={isPrintingThis ? "Preparing PDF..." : "Print bill"}>
                          <span>
                            <IconButton size="small"
                              aria-label={`Print sale ${s.sale_number}`}
                              onClick={() => printHandler(s)}
                              disabled={isPrintingThis}>
                              {isPrintingThis
                                ? <CircularProgress size={16} />
                                : <PrintOutlinedIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!loading && rows.length === 0 && !error && (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} sx={{ p: 0 }}>
                      <EmptyState filtered={hasActiveFilters} onClear={clearFilters} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination */}
        {total > 0 && (isMobile ? (
          <Stack alignItems="center" spacing={1} sx={{ pt: 2.5, pb: 1 }}>
            <Pagination
              count={pageCount} page={query.page + 1}
              onChange={(_, p) => goToPage(p - 1)}
              siblingCount={0} boundaryCount={1} shape="rounded" color="primary"
            />
            <Typography variant="caption" color="text.secondary">
              Showing {firstShown}–{lastShown} of {total.toLocaleString("en-IN")}
            </Typography>
          </Stack>
        ) : (
          <TablePagination
            component="div"
            count={total}
            page={Math.min(query.page, pageCount - 1)}
            rowsPerPage={query.limit}
            rowsPerPageOptions={[10, 25, 50, 100]}
            onPageChange={(_, page) => goToPage(page)}
            onRowsPerPageChange={(e) => update({ limit: parseInt(e.target.value, 10) })}
            showFirstButton
            showLastButton
            sx={{ borderTop: 1, borderColor: "divider", flexShrink: 0 }}
          />
        ))}
      </Paper>

      {/* Mobile: date + sort sheet */}
      <Drawer
        anchor="bottom"
        open={isMobile && drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88vh" } }}
      >
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "divider", mx: "auto", mt: 1.25 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, pt: 1, pb: 0.5 }}>
          <Typography variant="h6" fontWeight={700}>Filters</Typography>
          <IconButton aria-label="Close filters" onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box sx={{ px: 2.5, pb: 2, overflowY: "auto" }}>
          <Typography variant="overline" color="text.secondary" component="div">Date</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
            {DATE_RANGES.map((r) => (
              <Chip key={r.value} label={r.label} clickable
                color={range === r.value ? "primary" : "default"}
                variant={range === r.value ? "filled" : "outlined"}
                onClick={() => selectRange(r.value)}
                sx={{ height: 36, borderRadius: "10px", fontWeight: 500 }} />
            ))}
          </Box>
          {range === "custom" && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 2 }}>
              {dateFields}
            </Box>
          )}

          <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 3 }}>
            Sort by
          </Typography>
          <TextField select fullWidth size="small" value={sortValue}
            onChange={(e) => {
              const [sortBy, sortDir] = e.target.value.split(":");
              update({ sortBy, sortDir });
            }}
            InputProps={{ sx: { borderRadius: "10px" } }}
            inputProps={{ "aria-label": "Sort by" }}>
            {sortOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        </Box>

        <Divider />
        <Stack direction="row" spacing={1.5}
          sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}>
          <Button fullWidth variant="outlined" onClick={resetSheet}
            sx={{ height: 48, borderRadius: "12px", textTransform: "none", fontWeight: 600 }}>
            Reset
          </Button>
          <Button fullWidth variant="contained" disableElevation onClick={() => setDrawerOpen(false)}
            sx={{ height: 48, borderRadius: "12px", textTransform: "none", fontWeight: 600 }}>
            {loading || dateRangeInvalid
              ? "Show results"
              : `Show ${total.toLocaleString("en-IN")} ${total === 1 ? "result" : "results"}`}
          </Button>
        </Stack>
      </Drawer>

      {/* Invoice preview — opens when View is clicked (unless parent gave custom onView) */}
      <InvoicePreviewDialog
        open={!!previewSaleId}
        saleId={previewSaleId}
        onClose={() => setPreviewSaleId(null)}
      />
    </Box>
  );
}