// src/pharmacy/Reports/ExpiringSoon/ExpiringSoonReport.jsx
//
// Expiring Soon (30 / 60 / 90 days) — batches with qty > 0 that are expiring
// soon or already expired. Shows the money at risk of being written off.
//
// Columns: batch · medicine · qty · expiry · days · value at cost · urgency
//
// Styling matches DailyCollection + LowStockReport:
//   • Brand teal #2E606C for headings & dark surfaces
//   • Slate greyscale for body/numbers
//   • Mobile-first responsive (cards on phone, table on desktop)
//   • Roboto Mono for numeric values

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Box, Paper, Stack, Typography, Button, TextField,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  LinearProgress, Alert, IconButton, Tooltip, Grid, Divider, Avatar,
  ToggleButtonGroup, ToggleButton, useMediaQuery, InputAdornment,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import CurrencyRupeeOutlinedIcon from "@mui/icons-material/CurrencyRupeeOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import BranchPicker, { usePharmacyBranch } from "../../shared/BranchPicker";

const API = process.env.REACT_APP_URL;
const MONO = `'Roboto Mono', 'Courier New', monospace`;

const INK = {
  heading:   "#2E606C",
  ink:       "#0f172a",
  slate:     "#1e293b",
  text:      "#334155",
  muted:     "#64748b",
  mutedLo:   "#94a3b8",
  line:      "#cbd5e1",
  lineSoft:  "#e2e8f0",
  bgSoft:    "#f8fafc",
  bgTint:    "#f1f5f9",
  surface:   "#ffffff",
  shadow:    "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
  shadowMd:  "0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
  shadowLg:  "0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.05)",
};

const URGENCY_META = {
  EXPIRED: { label: "Expired",    short: "EXPIRED" },
  DANGER:  { label: "≤ 30 days",  short: "≤30d" },
  WARNING: { label: "31–60 days", short: "31-60d" },
  WATCH:   { label: "61–90 days", short: "61-90d" },
};

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2, minimumFractionDigits: 2,
  })}`;

const compactMoney = (n) => {
  const num = Number(n || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return String(d); }
};

export default function ExpiringSoonReport() {
  // Branch dropdown — reports only read, so "All branches" is allowed.
  const br = usePharmacyBranch({ allowAll: true, defaultAll: true }); // opens on All branches (26 Oct 2026)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [windowDays, setWindowDays] = useState(90);

  const load = async (w = windowDays) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${API}/api/pharmacy/sales-reports/expiring-soon?window=${w}`,
        { params: br.params, withCredentials: true }
      );
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load expiring-soon report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(windowDays); /* eslint-disable-next-line */ }, [windowDays, br.branch]);

  const summary = data?.summary;
  const items = data?.items || [];
  // All branches in a multi-branch pharmacy: show which branch holds each batch. A batch
  // with no branch (stock from before branches) shows here as "No branch" and under no
  // single branch — the same rule as the POS, which cannot sell it either (26 Oct 2026).
  const showBranch = !!data?.multi && !data?.branch;

  const visibleItems = useMemo(() => {
    let list = items;
    if (filter !== "ALL") list = list.filter((i) => i.urgency === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) =>
        (i.medicine_name || "").toLowerCase().includes(q) ||
        (i.generic_name || "").toLowerCase().includes(q) ||
        (i.batch_number || "").toLowerCase().includes(q) ||
        (i.branch || "no branch").toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, search]);

  const exportCSV = () => {
    if (!items.length) return;
    const rows = [
      ["Expiring Soon — Next " + windowDays + " Days + Expired"],
      ["Generated", new Date().toLocaleString("en-IN")],
      [],
      [...(showBranch ? ["Branch"] : []), "Medicine", "Generic", "Strength", "Form", "Batch Number",
       "Expiry Date", "Days to Expiry", "Qty Available",
       "Unit Cost (₹)", "Value at Cost (₹)", "Urgency"],
      ...visibleItems.map((i) => [
        ...(showBranch ? [i.branch || "No branch"] : []),
        i.medicine_name, i.generic_name, i.strength, i.form, i.batch_number,
        i.expiry_date, i.days_to_expiry, i.quantity_available,
        i.purchase_price, i.value_at_cost, i.urgency,
      ]),
    ];
    const csv = rows.map((r) =>
      r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expiring-soon-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    // carry the picked branch — the PDF used to ignore the dropdown and always print All
    const qs = new URLSearchParams({ window: String(windowDays), ...br.params }).toString();
    const url = `${API}/api/pharmacy/sales-reports/expiring-soon/pdf?${qs}`;
    window.open(url, "_blank");
  };

  return (
    <Box sx={{
      p: { xs: 2, sm: 2.5, md: 3, lg: 4 },
      bgcolor: INK.bgSoft,
      minHeight: "100vh",
      color: INK.text,
    }}>
      {/* ═══════════ TOP BAR ═══════════ */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: { xs: 2.5, md: 3 } }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: 1.5,
              bgcolor: INK.heading, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: INK.shadow,
            }}>
              <HourglassBottomOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 20, sm: 22, md: 26 },
                fontWeight: 700,
                color: INK.heading,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              Expiring Soon
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: { xs: 12.5, sm: 13 }, color: INK.muted, pl: { xs: 0, sm: 5 } }}>
            Batches expiring in the next {windowDays} days — money about to be written off
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          justifyContent={{ xs: "stretch", md: "flex-end" }}
          sx={{ "& > *": { flex: { xs: 1, md: "0 0 auto" } } }}
        >
          <Box sx={{ flex: "0 0 auto !important" }}>
            <BranchPicker state={br} />
          </Box>
          <Tooltip title="Refresh">
            <IconButton
              onClick={() => load(windowDays)}
              disabled={loading}
              sx={{
                border: `1px solid ${INK.line}`,
                borderRadius: 1.5,
                color: INK.slate,
                bgcolor: INK.surface,
                boxShadow: INK.shadow,
                flex: "0 0 auto !important",
                "&:hover": { bgcolor: INK.bgTint, borderColor: INK.muted },
              }}
            >
              <RefreshOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={exportCSV}
            disabled={!items.length}
            sx={btnOutlined}
          >
            CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfOutlinedIcon />}
            onClick={downloadPDF}
            disabled={!items.length}
            sx={btnDark}
          >
            Download PDF
          </Button>
        </Stack>
      </Stack>

      {loading && (
        <LinearProgress
          sx={{
            mb: 2, borderRadius: 2, height: 3,
            bgcolor: INK.lineSoft,
            "& .MuiLinearProgress-bar": { bgcolor: INK.heading },
          }}
        />
      )}
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2, borderRadius: 2,
            border: `1px solid ${INK.line}`,
            bgcolor: INK.surface, color: INK.slate,
            boxShadow: INK.shadow,
          }}
        >
          {error}
        </Alert>
      )}

      {data && summary && (
        <>
          {/* ═══════════ HERO SUMMARY ═══════════ */}
          <Paper
            elevation={0}
            sx={{
              position: "relative",
              overflow: "hidden",
              p: { xs: 2.5, sm: 3, md: 4 },
              mb: { xs: 2, md: 3 },
              borderRadius: 3,
              bgcolor: INK.heading,
              color: "#fff",
              boxShadow: INK.shadowLg,
            }}
          >
            <Box sx={{
              position: "absolute", right: -40, top: -40,
              width: 200, height: 200, borderRadius: "50%",
              bgcolor: alpha("#fff", 0.03),
              pointerEvents: "none",
            }} />
            <Box sx={{
              position: "absolute", right: 40, bottom: -60,
              width: 160, height: 160, borderRadius: "50%",
              bgcolor: alpha("#fff", 0.02),
              pointerEvents: "none",
            }} />

            <Grid container spacing={{ xs: 2.5, md: 4 }} alignItems="center" sx={{ position: "relative" }}>
              <Grid item xs={12} md={5}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Box sx={{
                    width: 6, height: 6, borderRadius: "50%",
                    bgcolor: "#fff", opacity: 0.6,
                  }} />
                  <Typography sx={{
                    fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                    textTransform: "uppercase", opacity: 0.7,
                  }}>
                    Value at Risk (at cost)
                  </Typography>
                </Stack>
                <Typography sx={{
                  fontSize: { xs: 36, sm: 44, md: 52 },
                  fontWeight: 700, color: "#fff",
                  fontFamily: MONO, lineHeight: 1,
                  letterSpacing: "-0.03em",
                  wordBreak: "break-all",
                }}>
                  {money(summary.total_value_at_cost)}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap">
                  <StatPill icon={<Inventory2OutlinedIcon sx={{ fontSize: 14 }} />}
                    label={`${summary.total_batches} batches`} dark />
                  <StatPill icon={<CurrencyRupeeOutlinedIcon sx={{ fontSize: 14 }} />}
                    label={`${summary.total_qty.toLocaleString("en-IN")} units`} dark />
                </Stack>
              </Grid>

              <Grid item xs={12} md={7}>
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={3}>
                    <HeroStat
                      label="Expired"
                      value={summary.buckets.EXPIRED.count}
                      sub={compactMoney(summary.buckets.EXPIRED.amount)}
                      badge="RISK"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <HeroStat
                      label="≤ 30 days"
                      value={summary.buckets.DANGER.count}
                      sub={compactMoney(summary.buckets.DANGER.amount)}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <HeroStat
                      label="31–60 days"
                      value={summary.buckets.WARNING.count}
                      sub={compactMoney(summary.buckets.WARNING.amount)}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <HeroStat
                      label="61–90 days"
                      value={summary.buckets.WATCH.count}
                      sub={compactMoney(summary.buckets.WATCH.amount)}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Paper>

          {/* ═══════════ FILTER BAR ═══════════ */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, md: 2 },
              mb: { xs: 2, md: 3 },
              borderRadius: 2.5,
              border: `1px solid ${INK.lineSoft}`,
              bgcolor: INK.surface,
              boxShadow: INK.shadow,
            }}
          >
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", lg: "center" }}
              justifyContent="space-between"
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <ToggleButtonGroup
                  value={filter}
                  exclusive
                  size={isMobile ? "small" : "medium"}
                  onChange={(_, v) => v && setFilter(v)}
                  sx={toggleGroupSx}
                >
                  <ToggleButton value="ALL">All ({items.length})</ToggleButton>
                  <ToggleButton value="EXPIRED">Expired ({summary.buckets.EXPIRED.count})</ToggleButton>
                  <ToggleButton value="DANGER">≤30d ({summary.buckets.DANGER.count})</ToggleButton>
                  <ToggleButton value="WARNING">31-60d ({summary.buckets.WARNING.count})</ToggleButton>
                  <ToggleButton value="WATCH">61-90d ({summary.buckets.WATCH.count})</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <ToggleButtonGroup
                  value={windowDays}
                  exclusive
                  size="small"
                  onChange={(_, v) => v && setWindowDays(v)}
                  sx={{
                    ...toggleGroupSx,
                    "& .MuiToggleButton-root": {
                      ...toggleGroupSx["& .MuiToggleButton-root"],
                      fontSize: 12, px: 1.5,
                    },
                  }}
                >
                  <ToggleButton value={30}>30d</ToggleButton>
                  <ToggleButton value={60}>60d</ToggleButton>
                  <ToggleButton value={90}>90d</ToggleButton>
                  <ToggleButton value={180}>180d</ToggleButton>
                </ToggleButtonGroup>

                <TextField
                  size="small"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlinedIcon sx={{ fontSize: 18, color: INK.muted }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 1.5, fontSize: 14 },
                  }}
                  sx={{ minWidth: { lg: 200 } }}
                />
              </Stack>
            </Stack>
          </Paper>

          {/* ═══════════ ITEMS ═══════════ */}
          {visibleItems.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 5, textAlign: "center",
                border: `1px solid ${INK.lineSoft}`, borderRadius: 2.5,
                bgcolor: INK.surface, boxShadow: INK.shadow,
              }}
            >
              <Box sx={{
                width: 48, height: 48, borderRadius: "50%",
                bgcolor: INK.bgTint, color: INK.muted,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                mb: 1.5,
              }}>
                <EventOutlinedIcon />
              </Box>
              <Typography sx={{ color: INK.muted, fontSize: 14 }}>
                {items.length === 0
                  ? `No batches expiring in the next ${windowDays} days.`
                  : "No batches match the current filter."}
              </Typography>
            </Paper>
          ) : isTablet ? (
            /* ─── Mobile/Tablet: Cards ─── */
            <Stack spacing={1.5}>
              {visibleItems.map((it) => (
                <BatchCard key={it.batch_id} item={it} showBranch={showBranch} />
              ))}
            </Stack>
          ) : (
            /* ─── Desktop: Table ─── */
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: `1px solid ${INK.lineSoft}`,
                borderRadius: 2.5,
                bgcolor: INK.surface,
                boxShadow: INK.shadow,
                overflow: "hidden",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: INK.bgTint }}>
                    {showBranch && <TableCell sx={headCell}>Branch</TableCell>}
                    <TableCell sx={headCell}>Medicine</TableCell>
                    <TableCell sx={headCell}>Batch</TableCell>
                    <TableCell sx={headCell}>Expiry</TableCell>
                    <TableCell sx={headCell} align="right">Days</TableCell>
                    <TableCell sx={headCell} align="right">Qty</TableCell>
                    <TableCell sx={headCell} align="right">Unit Cost</TableCell>
                    <TableCell sx={headCell} align="right">Value @ Cost</TableCell>
                    <TableCell sx={headCell}>Urgency</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleItems.map((it) => (
                    <TableRow
                      key={it.batch_id}
                      sx={{
                        "&:hover": { bgcolor: INK.bgSoft },
                        transition: "background 0.15s",
                      }}
                    >
                      {showBranch && (
                        <TableCell sx={{ ...bodyCell, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", color: it.branch ? INK.text : INK.mutedLo, fontStyle: it.branch ? "normal" : "italic" }}>
                          {it.branch || "No branch"}
                        </TableCell>
                      )}
                      <TableCell sx={bodyCell}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: INK.ink }}>
                          {it.medicine_name}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: INK.mutedLo }}>
                          {[it.strength, it.form].filter(Boolean).join(" · ") || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontSize: 12.5, color: INK.text }}>
                        {it.batch_number || "—"}
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontSize: 12.5 }}>
                        {fmtDate(it.expiry_date)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          ...bodyCell,
                          fontFamily: MONO,
                          fontWeight: 700,
                          fontSize: 13,
                          color: it.days_to_expiry < 0 ? INK.heading : INK.ink,
                        }}
                      >
                        {it.days_to_expiry < 0 ? it.days_to_expiry : it.days_to_expiry}
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontSize: 13 }} align="right">
                        {it.quantity_available}
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontSize: 12.5, color: INK.muted }} align="right">
                        {money(it.purchase_price)}
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontWeight: 700, fontSize: 14, color: INK.ink }} align="right">
                        {money(it.value_at_cost)}
                      </TableCell>
                      <TableCell sx={bodyCell}>
                        <UrgencyChip urgency={it.urgency} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography sx={{
            fontSize: 11.5, color: INK.mutedLo, textAlign: "center",
            mt: 2.5, fontFamily: MONO,
          }}>
            Value @ Cost = quantity × purchase price · negative days = already expired
          </Typography>
        </>
      )}
    </Box>
  );
}

/* ═══════════════════ Batch card (mobile) ═══════════════════ */
function BatchCard({ item: it, showBranch = false }) {
  const isExpired = it.urgency === "EXPIRED";
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${INK.lineSoft}`,
        borderRadius: 2.5,
        bgcolor: INK.surface,
        boxShadow: INK.shadow,
        ...(isExpired && { borderColor: INK.heading, borderWidth: 2 }),
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Avatar sx={{
          bgcolor: INK.heading, color: "#fff",
          width: 40, height: 40,
          boxShadow: INK.shadow,
        }}>
          <HourglassBottomOutlinedIcon sx={{ fontSize: 20 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{
                fontSize: 14.5, fontWeight: 700, color: INK.ink,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {it.medicine_name}
              </Typography>
              {showBranch && (
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, mt: 0.25, color: it.branch ? INK.text : INK.mutedLo, fontStyle: it.branch ? "normal" : "italic" }}>
                  {it.branch || "No branch"}
                </Typography>
              )}
              {(it.strength || it.form) && (
                <Typography sx={{ fontSize: 11.5, color: INK.muted, mt: 0.25 }}>
                  {[it.strength, it.form].filter(Boolean).join(" · ")}
                </Typography>
              )}
            </Box>
            <UrgencyChip urgency={it.urgency} />
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.75 }}>
            <Typography sx={{ fontSize: 10, color: INK.mutedLo, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>
              Batch
            </Typography>
            <Typography sx={{ fontSize: 12, color: INK.text, fontFamily: MONO, fontWeight: 600 }}>
              {it.batch_number || "—"}
            </Typography>
          </Stack>

          <Divider sx={{ my: 1.25, borderColor: INK.lineSoft }} />

          <Grid container spacing={1.5} sx={{ mb: 1 }}>
            <Grid item xs={4}>
              <Typography sx={cardLabel}>Qty</Typography>
              <Typography sx={{ ...cardValue, color: INK.ink }}>
                {it.quantity_available}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography sx={cardLabel}>Days left</Typography>
              <Typography sx={{
                ...cardValue,
                color: it.days_to_expiry < 0 ? INK.heading : INK.ink,
              }}>
                {it.days_to_expiry}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography sx={cardLabel}>Value @ Cost</Typography>
              <Typography sx={{ ...cardValue, color: INK.heading, fontWeight: 700 }}>
                {compactMoney(it.value_at_cost)}
              </Typography>
            </Grid>
          </Grid>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <EventOutlinedIcon sx={{ fontSize: 12, color: INK.mutedLo }} />
            <Typography sx={{ fontSize: 11, color: INK.muted, fontFamily: MONO }}>
              {isExpired ? "Expired on" : "Expires on"} {fmtDate(it.expiry_date)}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}

/* ═══════════════════ Urgency chip ═══════════════════ */
function UrgencyChip({ urgency }) {
  const isExpired = urgency === "EXPIRED";
  const isDanger = urgency === "DANGER";
  const label = URGENCY_META[urgency]?.short || urgency;

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1, py: 0.4,
        bgcolor: isExpired ? INK.heading : INK.bgTint,
        color: isExpired ? "#fff" : INK.slate,
        borderRadius: 10,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        border: isExpired ? "none" : `1px solid ${INK.lineSoft}`,
        whiteSpace: "nowrap",
      }}
    >
      {isExpired && <ReportProblemOutlinedIcon sx={{ fontSize: 12 }} />}
      {!isExpired && isDanger && <WarningAmberOutlinedIcon sx={{ fontSize: 12 }} />}
      {label}
    </Box>
  );
}

/* ═══════════════════ Hero stat ═══════════════════ */
function HeroStat({ label, value, sub, badge }) {
  return (
    <Box sx={{
      p: 1.5,
      border: `1px solid ${alpha("#fff", 0.1)}`,
      bgcolor: alpha("#fff", 0.05),
      borderRadius: 2,
      backdropFilter: "blur(4px)",
      height: "100%",
    }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.25 }}>
        <Typography sx={{
          fontSize: 10, fontWeight: 700, color: alpha("#fff", 0.6),
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          {label}
        </Typography>
        {badge && (
          <Box sx={{
            fontSize: 8.5, fontWeight: 700, color: "#fff",
            bgcolor: alpha("#fff", 0.2),
            px: 0.5, py: 0.1, borderRadius: 0.5,
            letterSpacing: 0.3,
          }}>
            {badge}
          </Box>
        )}
      </Stack>
      <Typography sx={{
        fontSize: { xs: 22, md: 26 },
        fontWeight: 700, color: "#fff", fontFamily: MONO,
        lineHeight: 1.1, mt: 0.5,
      }}>
        {value}
      </Typography>
      {sub && (
        <Typography sx={{
          fontSize: 11, color: alpha("#fff", 0.75), fontFamily: MONO, mt: 0.25,
        }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

/* ═══════════════════ Stat pill ═══════════════════ */
function StatPill({ icon, label, dark }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}
      sx={{
        px: 1, py: 0.4,
        border: `1px solid ${dark ? alpha("#fff", 0.2) : INK.lineSoft}`,
        bgcolor: dark ? alpha("#fff", 0.08) : INK.bgTint,
        borderRadius: 10,
        color: dark ? "#fff" : INK.slate,
      }}>
      {icon}
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, fontFamily: MONO }}>
        {label}
      </Typography>
    </Stack>
  );
}

/* ═══════════════════ Shared styles ═══════════════════ */
const btnDark = {
  textTransform: "none",
  borderRadius: 1.5,
  fontWeight: 600,
  fontSize: 14,
  bgcolor: INK.heading,
  color: "#fff",
  boxShadow: INK.shadow,
  px: 2, py: 0.85,
  "&:hover": { bgcolor: "#244d57", boxShadow: INK.shadowMd },
  "&.Mui-disabled": { bgcolor: INK.lineSoft, color: INK.mutedLo },
};

const btnOutlined = {
  textTransform: "none",
  borderRadius: 1.5,
  fontWeight: 600,
  fontSize: 14,
  color: INK.slate,
  borderColor: INK.line,
  bgcolor: INK.surface,
  boxShadow: INK.shadow,
  px: 2, py: 0.85,
  "&:hover": { borderColor: INK.muted, bgcolor: INK.bgTint },
};

const toggleGroupSx = {
  gap: { xs: 0.5, md: 0.75 },
  flexWrap: "wrap",
  bgcolor: INK.bgTint,
  p: 0.5,
  borderRadius: 2,
  "& .MuiToggleButtonGroup-grouped": {
    margin: 0,
    border: "none !important",
    borderRadius: "8px !important",
    flex: { xs: "1 1 auto", lg: "0 0 auto" },
  },
  "& .MuiToggleButton-root": {
    textTransform: "none",
    fontWeight: 600,
    fontSize: { xs: 12.5, md: 13 },
    px: { xs: 1.5, md: 2 },
    py: { xs: 0.75, md: 0.85 },
    gap: 0.5,
    color: INK.muted,
    "&.Mui-selected": {
      bgcolor: INK.surface,
      color: INK.ink,
      boxShadow: INK.shadow,
      "&:hover": { bgcolor: INK.surface },
    },
    "&:hover": { bgcolor: alpha(INK.surface, 0.6) },
  },
};

const headCell = {
  fontSize: 11,
  fontWeight: 700,
  color: INK.muted,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  borderBottom: `1px solid ${INK.lineSoft}`,
  py: 1.5,
};

const bodyCell = {
  fontSize: 13,
  color: INK.text,
  borderBottom: `1px solid ${INK.lineSoft}`,
  py: 1.5,
};

const cardLabel = {
  fontSize: 10, fontWeight: 700, color: INK.mutedLo,
  textTransform: "uppercase", letterSpacing: 0.4,
};

const cardValue = {
  fontSize: 17, fontWeight: 600, fontFamily: MONO, lineHeight: 1.1, mt: 0.25,
};