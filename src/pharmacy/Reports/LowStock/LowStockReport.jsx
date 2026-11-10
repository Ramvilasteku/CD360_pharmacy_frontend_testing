// src/pharmacy/Reports/LowStock/LowStockReport.jsx
//
// Low Stock / Reorder Alert — medicines where quantity_available ≤ reorder_level.
// Sorted by urgency (CRITICAL first). Drives the daily supplier order.
//
// Styling matches DailyCollection:
//   • Brand teal #2E606C for headings & dark surfaces
//   • Slate greyscale for body/numbers
//   • Mobile-first responsive (cards on phone, table on desktop)
//   • Roboto Mono for numeric values
//
// REQUIREMENT: Add to public/index.html <head>:
// <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

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
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
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
  CRITICAL: { label: "Critical", rank: 0 },
  HIGH:     { label: "High",     rank: 1 },
  MEDIUM:   { label: "Medium",   rank: 2 },
  LOW:      { label: "Low",      rank: 3 },
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return String(d); }
};

export default function LowStockReport() {
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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${API}/api/pharmacy/sales-reports/low-stock`,
        { params: br.params, withCredentials: true }
      );
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load low-stock report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [br.branch]);

  const summary = data?.summary;
  const items = data?.items || [];
  // All branches in a multi-branch pharmacy: the server checks each branch on its own and
  // returns one row per medicine x branch, so the table needs a Branch column (26 Oct 2026).
  const perBranch = !!data?.per_branch;
  const rowKey = (i) => `${i.pharmacy_medicine_id}-${i.branch || ""}`;

  const visibleItems = useMemo(() => {
    let list = items;
    if (filter !== "ALL") list = list.filter((i) => i.urgency === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) =>
        (i.medicine_name || "").toLowerCase().includes(q) ||
        (i.generic_name || "").toLowerCase().includes(q) ||
        (i.branch || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, search]);

  const exportCSV = () => {
    if (!items.length) return;
    const rows = [
      ["Low Stock / Reorder Alert"],
      ["Generated", new Date().toLocaleString("en-IN")],
      [],
      [...(perBranch ? ["Branch"] : []), "Medicine", "Generic", "Strength", "Form",
       "Available", "Reorder Level", "Stock %", "Urgency",
       "Nearest Expiry", "Batches", "Suggested Order"],
      ...visibleItems.map((i) => [
        ...(perBranch ? [i.branch || ""] : []),
        i.medicine_name, i.generic_name, i.strength, i.form,
        i.quantity_available, i.reorder_level, `${i.stock_pct}%`, i.urgency,
        i.nearest_expiry || "—", i.batch_count, i.suggested_order,
      ]),
    ];
    const csv = rows.map((r) =>
      r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    // carry the picked branch — the PDF used to ignore the dropdown and always print All
    const qs = new URLSearchParams(br.params).toString();
    window.open(`${API}/api/pharmacy/sales-reports/low-stock/pdf${qs ? `?${qs}` : ""}`, "_blank");
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
              <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />
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
              Low Stock &amp; Reorder Alert
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: { xs: 12.5, sm: 13 }, color: INK.muted, pl: { xs: 0, sm: 5 } }}>
            Medicines at or below reorder level — sorted by urgency
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
              onClick={load}
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
                    Items Needing Reorder
                  </Typography>
                </Stack>
                <Typography sx={{
                  fontSize: { xs: 48, sm: 60, md: 72 },
                  fontWeight: 700, color: "#fff",
                  fontFamily: MONO, lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}>
                  {summary.total_items}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap">
                  <StatPill icon={<LocalShippingOutlinedIcon sx={{ fontSize: 14 }} />}
                    label={`${summary.total_suggested_units} units to order`} dark />
                </Stack>
              </Grid>

              <Grid item xs={12} md={7}>
                <Grid container spacing={1.5}>
                  <Grid item xs={6} sm={3}>
                    <HeroStat label="Out of Stock" value={summary.out_of_stock} badge="CRITICAL" />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <HeroStat label="High" value={summary.high} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <HeroStat label="Medium" value={summary.medium} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <HeroStat label="Low" value={summary.low} />
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
              <ToggleButtonGroup
                value={filter}
                exclusive
                size={isMobile ? "small" : "medium"}
                onChange={(_, v) => v && setFilter(v)}
                sx={{
                  gap: { xs: 0.5, md: 0.75 },
                  flexWrap: "wrap",
                  width: { xs: "100%", lg: "auto" },
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
                    fontSize: { xs: 12.5, md: 13.5 },
                    px: { xs: 1.5, md: 2.5 },
                    py: { xs: 0.75, md: 1 },
                    gap: 0.75,
                    color: INK.muted,
                    "&.Mui-selected": {
                      bgcolor: INK.surface,
                      color: INK.ink,
                      boxShadow: INK.shadow,
                      "&:hover": { bgcolor: INK.surface },
                    },
                    "&:hover": { bgcolor: alpha(INK.surface, 0.6) },
                  },
                }}
              >
                <ToggleButton value="ALL">All ({items.length})</ToggleButton>
                <ToggleButton value="CRITICAL">Critical ({summary.out_of_stock})</ToggleButton>
                <ToggleButton value="HIGH">High ({summary.high})</ToggleButton>
                <ToggleButton value="MEDIUM">Medium ({summary.medium})</ToggleButton>
                <ToggleButton value="LOW">Low ({summary.low})</ToggleButton>
              </ToggleButtonGroup>

              <TextField
                size="small"
                placeholder="Search medicine…"
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
                sx={{ minWidth: { lg: 240 } }}
              />
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
                <Inventory2OutlinedIcon />
              </Box>
              <Typography sx={{ color: INK.muted, fontSize: 14 }}>
                {items.length === 0
                  ? "No medicines need reordering. All stock levels healthy."
                  : "No items match the current filter."}
              </Typography>
            </Paper>
          ) : isTablet ? (
            /* ─── Mobile / Tablet: Cards ─── */
            <Stack spacing={1.5}>
              {visibleItems.map((it) => (
                <ItemCard key={rowKey(it)} item={it} showBranch={perBranch} />
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
                    {perBranch && <TableCell sx={headCell}>Branch</TableCell>}
                    <TableCell sx={headCell}>Medicine</TableCell>
                    <TableCell sx={headCell}>Strength / Form</TableCell>
                    <TableCell sx={headCell} align="right">Available</TableCell>
                    <TableCell sx={headCell} align="right">Reorder</TableCell>
                    <TableCell sx={headCell}>Stock Level</TableCell>
                    <TableCell sx={headCell}>Nearest Expiry</TableCell>
                    <TableCell sx={headCell}>Urgency</TableCell>
                    <TableCell sx={headCell} align="right">Order Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleItems.map((it) => (
                    <TableRow
                      key={rowKey(it)}
                      sx={{
                        "&:hover": { bgcolor: INK.bgSoft },
                        transition: "background 0.15s",
                      }}
                    >
                      {perBranch && (
                        <TableCell sx={{ ...bodyCell, fontSize: 12.5, fontWeight: 600, color: INK.text, whiteSpace: "nowrap" }}>
                          {it.branch}
                        </TableCell>
                      )}
                      <TableCell sx={bodyCell}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: INK.ink }}>
                          {it.medicine_name}
                        </Typography>
                        {it.generic_name && (
                          <Typography sx={{ fontSize: 11.5, color: INK.mutedLo }}>
                            {it.generic_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={bodyCell}>
                        <Typography sx={{ fontSize: 12.5, color: INK.text }}>
                          {it.strength || "—"}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: INK.mutedLo }}>
                          {it.form || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontWeight: 700, fontSize: 14, color: INK.ink }} align="right">
                        {it.quantity_available}
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontSize: 13, color: INK.muted }} align="right">
                        {it.reorder_level}
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, minWidth: 140 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{
                            flex: 1, height: 6, borderRadius: 3,
                            bgcolor: INK.lineSoft, overflow: "hidden",
                          }}>
                            <Box sx={{
                              height: "100%",
                              width: `${Math.min(100, it.stock_pct)}%`,
                              bgcolor: INK.heading,
                              borderRadius: 3,
                              transition: "width 0.6s ease",
                            }} />
                          </Box>
                          <Typography sx={{
                            fontSize: 11, fontFamily: MONO, fontWeight: 600,
                            color: INK.muted, minWidth: 36, textAlign: "right",
                          }}>
                            {it.stock_pct}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontSize: 12 }}>
                        {it.nearest_expiry ? fmtDate(it.nearest_expiry) : "—"}
                      </TableCell>
                      <TableCell sx={bodyCell}>
                        <UrgencyChip urgency={it.urgency} />
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontWeight: 700, fontSize: 14, color: INK.ink }} align="right">
                        {it.suggested_order}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Footer note */}
          <Typography sx={{
            fontSize: 11.5, color: INK.mutedLo, textAlign: "center",
            mt: 2.5, fontFamily: MONO,
          }}>
            Urgency: CRITICAL = 0% · HIGH ≤ 25% · MEDIUM ≤ 50% · LOW ≤ 100% of reorder level
            {" · "}Order Qty = reorder × 2 − available
          </Typography>
        </>
      )}
    </Box>
  );
}

/* ═══════════════════ Item card (mobile) ═══════════════════ */
function ItemCard({ item: it, showBranch = false }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${INK.lineSoft}`,
        borderRadius: 2.5,
        bgcolor: INK.surface,
        boxShadow: INK.shadow,
        ...(it.urgency === "CRITICAL" && { borderColor: INK.heading, borderWidth: 2 }),
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Avatar sx={{
          bgcolor: INK.heading, color: "#fff",
          width: 40, height: 40,
          boxShadow: INK.shadow,
        }}>
          <Inventory2OutlinedIcon sx={{ fontSize: 20 }} />
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
              {showBranch && it.branch && (
                <Typography sx={{ fontSize: 11.5, color: INK.text, fontWeight: 600, mt: 0.25 }}>
                  {it.branch}
                </Typography>
              )}
              {(it.strength || it.generic_name) && (
                <Typography sx={{ fontSize: 11.5, color: INK.muted, mt: 0.25 }}>
                  {it.strength}{it.strength && it.form ? " · " : ""}{it.form}
                  {it.generic_name && ` · ${it.generic_name}`}
                </Typography>
              )}
            </Box>
            <UrgencyChip urgency={it.urgency} />
          </Stack>

          <Divider sx={{ my: 1.25, borderColor: INK.lineSoft }} />

          {/* Numbers row */}
          <Grid container spacing={1.5} sx={{ mb: 1 }}>
            <Grid item xs={4}>
              <Typography sx={cardLabel}>Available</Typography>
              <Typography sx={{ ...cardValue, color: INK.ink }}>
                {it.quantity_available}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography sx={cardLabel}>Reorder</Typography>
              <Typography sx={{ ...cardValue, color: INK.muted }}>
                {it.reorder_level}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography sx={cardLabel}>Order Qty</Typography>
              <Typography sx={{ ...cardValue, color: INK.heading, fontWeight: 700 }}>
                {it.suggested_order}
              </Typography>
            </Grid>
          </Grid>

          {/* Stock bar */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{
              flex: 1, height: 5, borderRadius: 3,
              bgcolor: INK.lineSoft, overflow: "hidden",
            }}>
              <Box sx={{
                height: "100%",
                width: `${Math.min(100, it.stock_pct)}%`,
                bgcolor: INK.heading,
                borderRadius: 3,
                transition: "width 0.6s ease",
              }} />
            </Box>
            <Typography sx={{
              fontSize: 11, fontFamily: MONO, fontWeight: 600,
              color: INK.muted, minWidth: 36, textAlign: "right",
            }}>
              {it.stock_pct}%
            </Typography>
          </Stack>

          {it.nearest_expiry && (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
              <EventOutlinedIcon sx={{ fontSize: 12, color: INK.mutedLo }} />
              <Typography sx={{ fontSize: 11, color: INK.muted, fontFamily: MONO }}>
                Nearest expiry: {fmtDate(it.nearest_expiry)}
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

/* ═══════════════════ Urgency chip ═══════════════════ */
function UrgencyChip({ urgency }) {
  const isCritical = urgency === "CRITICAL";
  const label = URGENCY_META[urgency]?.label || urgency;

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1, py: 0.4,
        bgcolor: isCritical ? INK.heading : INK.bgTint,
        color: isCritical ? "#fff" : INK.slate,
        borderRadius: 10,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        border: isCritical ? "none" : `1px solid ${INK.lineSoft}`,
      }}
    >
      {isCritical && <ReportProblemOutlinedIcon sx={{ fontSize: 12 }} />}
      {!isCritical && urgency === "HIGH" && <TrendingDownOutlinedIcon sx={{ fontSize: 12 }} />}
      {label}
    </Box>
  );
}

/* ═══════════════════ Hero stat ═══════════════════ */
function HeroStat({ label, value, badge }) {
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