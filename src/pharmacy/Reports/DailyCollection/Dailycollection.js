// src/pharmacy/Reports/DailyCollection/DailyCollection.jsx
//
// Sophisticated monochrome Collection & Credit Dues report
//   • Charcoal + slate greyscale (no color)
//   • Soft shadows, rounded corners, generous whitespace
//   • Mini progress bars, pill badges, icon chips
//   • Mobile-first responsive (cards on phone, tables on desktop)
//
// REQUIREMENT: Add to public/index.html <head>:
// <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Box, Paper, Stack, Typography, Button, TextField,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  LinearProgress, Alert, IconButton, Tooltip, Grid, Divider, Avatar,
  ToggleButtonGroup, ToggleButton, useMediaQuery,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TodayIcon from "@mui/icons-material/Today";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import QrCodeScannerOutlinedIcon from "@mui/icons-material/QrCodeScannerOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import BranchPicker, { usePharmacyBranch } from "../../shared/BranchPicker";

const API = process.env.REACT_APP_URL;
const MONO = `'Roboto Mono', 'Courier New', monospace`;

/* Sophisticated palette — teal headings + slate greyscale */
const BRAND_HEADING = "#2E606C";  // ⭐ brand teal for all headings

const INK = {
  heading:   "#2E606C",   // ⭐ brand teal — titles, section headers
  ink:       "#0f172a",   // deepest - numbers, body emphasis
  slate:     "#1e293b",   // dark - secondary emphasis
  text:      "#334155",   // body
  muted:     "#64748b",   // meta
  mutedLo:   "#94a3b8",   // labels
  line:      "#cbd5e1",   // borders
  lineSoft:  "#e2e8f0",   // dividers
  bgSoft:    "#f8fafc",   // page bg
  bgTint:    "#f1f5f9",   // card alt bg
  surface:   "#ffffff",
  shadow:    "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
  shadowMd:  "0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
  shadowLg:  "0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.05)",
};

const METHOD_META = {
  cash:          { label: "Cash",           Icon: PaidOutlinedIcon },
  upi:           { label: "UPI",            Icon: QrCodeScannerOutlinedIcon },
  card:          { label: "Card",           Icon: CreditCardOutlinedIcon },
  bank_transfer: { label: "Bank Transfer",  Icon: AccountBalanceOutlinedIcon },
  mixed:         { label: "Mixed",          Icon: DonutLargeOutlinedIcon },
  credit:        { label: "Credit",         Icon: WarningAmberOutlinedIcon },
};

const AGING_LABEL = {
  "0-30":  "0–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+":   "Over 90 days",
};

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

const compactMoney = (n) => {
  const num = Number(n || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
};

const localIsoDate = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

function rangeFor(period, customStart, customEnd) {
  const today = new Date();
  const todayISO = localIsoDate(today);

  switch (period) {
    case "today":
      return { start_date: todayISO, end_date: todayISO };
    case "week": {
      const dow = (today.getDay() + 6) % 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - dow);
      return { start_date: localIsoDate(monday), end_date: todayISO };
    }
    case "month": {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start_date: localIsoDate(first), end_date: todayISO };
    }
    case "year": {
      const first = new Date(today.getFullYear(), 0, 1);
      return { start_date: localIsoDate(first), end_date: todayISO };
    }
    case "custom":
      return { start_date: customStart, end_date: customEnd };
    default:
      return { start_date: todayISO, end_date: todayISO };
  }
}

const periodLabel = (period, s, e) => {
  if (period === "today")
    return `Today · ${new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}`;
  if (period === "week")
    return `This Week · ${new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → Today`;
  if (period === "month")
    return new Date(s).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  if (period === "year")
    return String(new Date(s).getFullYear());
  return `${new Date(s).toLocaleDateString("en-IN")} → ${new Date(e).toLocaleDateString("en-IN")}`;
};

export default function DailyCollection() {
  // Branch dropdown — reports only read, so "All branches" is allowed.
  const br = usePharmacyBranch({ allowAll: true, defaultAll: true }); // opens on All branches (26 Oct 2026)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [period, setPeriod] = useState("today");
  const [customStart, setCustomStart] = useState(localIsoDate());
  const [customEnd, setCustomEnd] = useState(localIsoDate());

  const { start_date, end_date } = useMemo(
    () => rangeFor(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${API}/api/pharmacy/sales-reports/daily-collection?start_date=${start_date}&end_date=${end_date}`,
        { params: br.params, withCredentials: true }
      );
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [start_date, end_date, br.branch]);

  const col   = data?.collection_summary;
  const sales = data?.sales_summary;
  const dues  = data?.credit_dues;
  const totalCollected = col?.total_collected || 0;

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Collection Report"],
      ["Period", periodLabel(period, start_date, end_date)],
      ["From", start_date, "To", end_date],
      [],
      ["COLLECTION BY METHOD"],
      ["Method", "Count", "Amount"],
      ...Object.entries(col.by_method).map(([k, v]) => [METHOD_META[k]?.label || k, v.count, v.amount]),
      ["Total", col.total_payments, col.total_collected],
      [],
      ["SALES SUMMARY"],
      ["Bills", sales.bill_count],
      ["Gross sales", sales.gross_sales],
      ["Returns", sales.returns],
      ["Net sales", sales.net_sales],
      ["Collected at sale", sales.collected_at_sale],
      ["Credit added in period", sales.credit_added],
      [],
      ["CREDIT DUES (all-time)"],
      ["Total outstanding", dues.total_outstanding],
      ["Customers", dues.customer_count],
      ["Bills", dues.bill_count],
      [],
      ["Ageing bucket", "Count", "Amount"],
      ...Object.entries(dues.aging).map(([k, v]) => [AGING_LABEL[k] || k, v.count, v.amount]),
      [],
      ["CUSTOMER DUES"],
      ["Customer", "Phone", "Bills", "Oldest", "Days", "Bucket", "Due"],
      ...dues.customers.map((c) => [
        c.customer_name, c.customer_phone, c.sales_count,
        c.oldest_due_date, c.days_old, c.aging_bucket, c.total_due,
      ]),
    ];
    const csv = rows.map((r) =>
      r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collection-${start_date}_to_${end_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const url =
      `${API}/api/pharmacy/sales-reports/daily-collection/pdf` +
      `?start_date=${start_date}&end_date=${end_date}`;
    window.open(url, "_blank");
  };

  return (
    <Box sx={{
      p: { xs: 2, sm: 2.5, md: 3, lg: 4 },
      bgcolor: INK.bgSoft,
      minHeight: "100vh",
      color: INK.text,
    }}>
      {/* ═══════════════════ TOP BAR ═══════════════════ */}
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
              <TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />
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
              Collection &amp; Credit Dues
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: { xs: 12.5, sm: 13 }, color: INK.muted, pl: { xs: 0, sm: 5 } }}>
            {periodLabel(period, start_date, end_date)}
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
            disabled={!data}
            sx={btnOutlined}
          >
            CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfOutlinedIcon />}
            onClick={downloadPDF}
            disabled={!data}
            sx={btnDark}
          >
            Download PDF
          </Button>
        </Stack>
      </Stack>

      {/* ═══════════════════ PERIOD SELECTOR ═══════════════════ */}
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
            value={period}
            exclusive
            size={isMobile ? "small" : "medium"}
            onChange={(_, v) => v && setPeriod(v)}
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
            <ToggleButton value="today">
              <TodayIcon sx={{ fontSize: 15 }} /> Today
            </ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="year">Year</ToggleButton>
            <ToggleButton value="custom">
              <CalendarMonthIcon sx={{ fontSize: 15 }} /> Custom
            </ToggleButton>
          </ToggleButtonGroup>

          {period === "custom" && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{
                p: { xs: 1.5, sm: 0.75 },
                borderRadius: 2,
                bgcolor: INK.bgTint,
              }}
            >
              <TextField
                type="date" size="small" value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                label="From"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  sx: {
                    borderRadius: 1.5, fontFamily: MONO, fontSize: 13,
                    bgcolor: INK.surface,
                  },
                }}
                sx={{ minWidth: { sm: 155 } }}
              />
              <Typography sx={{ color: INK.muted, textAlign: "center", fontSize: 14 }}>→</Typography>
              <TextField
                type="date" size="small" value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                label="To"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  sx: {
                    borderRadius: 1.5, fontFamily: MONO, fontSize: 13,
                    bgcolor: INK.surface,
                  },
                }}
                sx={{ minWidth: { sm: 155 } }}
              />
            </Stack>
          )}
        </Stack>
      </Paper>

      {loading && (
        <LinearProgress
          sx={{
            mb: 2, borderRadius: 2, height: 3,
            bgcolor: INK.lineSoft,
            "& .MuiLinearProgress-bar": { bgcolor: INK.ink },
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
            "& .MuiAlert-icon": { color: INK.slate },
          }}
        >
          {error}
        </Alert>
      )}

      {data && (
        <>
          {/* ═══════════════════ HERO CARD ═══════════════════ */}
          <Paper
            elevation={0}
            sx={{
              position: "relative",
              overflow: "hidden",
              p: { xs: 2.5, sm: 3, md: 4 },
              mb: { xs: 2, md: 3 },
              borderRadius: 3,
              bgcolor: INK.heading,                     // ⭐ brand teal background
              color: "#fff",
              boxShadow: INK.shadowLg,
            }}
          >
            {/* subtle decorative pattern */}
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
              <Grid item xs={12} md={6}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Box sx={{
                    width: 6, height: 6, borderRadius: "50%",
                    bgcolor: "#fff", opacity: 0.6,
                  }} />
                  <Typography sx={{
                    fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                    textTransform: "uppercase", opacity: 0.7,
                  }}>
                    Total Collected
                  </Typography>
                </Stack>
                <Typography sx={{
                  fontSize: { xs: 36, sm: 46, md: 56 },
                  fontWeight: 700, color: "#fff",
                  fontFamily: MONO, lineHeight: 1,
                  letterSpacing: "-0.03em",
                  wordBreak: "break-all",
                }}>
                  {money(totalCollected)}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap">
                  <StatPill icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 14 }} />}
                    label={`${col.total_payments} payment${col.total_payments !== 1 ? "s" : ""}`} dark />
                  <StatPill icon={<PaymentOutlinedIcon sx={{ fontSize: 14 }} />}
                    label={`${sales.bill_count} bill${sales.bill_count !== 1 ? "s" : ""}`} dark />
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}><HeroStat label="Net Sales" value={money(sales.net_sales)} /></Grid>
                  <Grid item xs={6}><HeroStat label="Collected" value={money(sales.collected_at_sale)} /></Grid>
                  <Grid item xs={6}><HeroStat label="Returns" value={money(sales.returns)} /></Grid>
                  <Grid item xs={6}><HeroStat label="Credit Added" value={money(sales.credit_added)} /></Grid>
                </Grid>
              </Grid>
            </Grid>
          </Paper>

          {/* ═══════════════════ PAYMENT METHOD TILES ═══════════════════ */}
          <SectionHeader
            title="Collection by Payment Method"
            subtitle="Breakdown across all channels"
          />
          <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: { xs: 3, md: 4 } }}>
            {Object.entries(col.by_method).map(([method, v]) => {
              const meta = METHOD_META[method] || { label: method, Icon: PaymentOutlinedIcon };
              const { Icon } = meta;
              const pct = totalCollected > 0 ? (v.amount / totalCollected) * 100 : 0;
              return (
                <Grid item xs={6} sm={4} md={4} lg={2} key={method}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 1.75, md: 2 },
                      borderRadius: 2.5,
                      border: `1px solid ${INK.lineSoft}`,
                      bgcolor: INK.surface,
                      height: "100%",
                      boxShadow: INK.shadow,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: INK.shadowMd,
                        borderColor: INK.line,
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: 1.5,
                        bgcolor: INK.bgTint, color: INK.slate,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon sx={{ fontSize: 17 }} />
                      </Box>
                      <Typography sx={{
                        fontSize: 11, fontWeight: 700, color: INK.ink, fontFamily: MONO,
                      }}>
                        {pct.toFixed(1)}%
                      </Typography>
                    </Stack>
                    <Typography sx={{
                      fontSize: 11, fontWeight: 700, color: INK.muted,
                      textTransform: "uppercase", letterSpacing: 0.5, mb: 0.5,
                    }}>
                      {meta.label}
                    </Typography>
                    <Typography sx={{
                      fontSize: { xs: 15, md: 17 },
                      fontWeight: 700, color: INK.ink,
                      fontFamily: MONO, lineHeight: 1.1,
                      wordBreak: "break-all",
                    }}>
                      {money(v.amount)}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: INK.mutedLo, fontFamily: MONO, mt: 0.5, mb: 1 }}>
                      {v.count} payment{v.count !== 1 ? "s" : ""}
                    </Typography>
                    {/* mini progress bar */}
                    <Box sx={{
                      height: 3, borderRadius: 2, bgcolor: INK.bgTint, overflow: "hidden",
                    }}>
                      <Box sx={{
                        height: "100%", width: `${pct}%`,
                        bgcolor: INK.heading, borderRadius: 2,       // ⭐ teal fill
                        transition: "width 0.6s ease",
                      }} />
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {/* ═══════════════════ SALES SUMMARY ═══════════════════ */}
          <SectionHeader
            title="Sales Summary"
            subtitle={periodLabel(period, start_date, end_date)}
          />
          <Paper
            elevation={0}
            sx={{
              mb: { xs: 3, md: 4 },
              border: `1px solid ${INK.lineSoft}`,
              borderRadius: 2.5,
              overflow: "hidden",
              bgcolor: INK.surface,
              boxShadow: INK.shadow,
            }}
          >
            <Table size={isMobile ? "small" : "medium"}>
              <TableBody>
                <KVRow label="Bills completed" value={sales.bill_count} icon={ReceiptLongOutlinedIcon} />
                <KVRow label="Gross sales"     value={money(sales.gross_sales)} />
                <KVRow label="Returns"         value={`− ${money(sales.returns)}`} />
                <KVRow label="Net sales"       value={money(sales.net_sales)} emphasize />
                <KVRow label="Collected at sale"      value={money(sales.collected_at_sale)} />
                <KVRow label="Credit added in period" value={money(sales.credit_added)} last />
              </TableBody>
            </Table>
          </Paper>

          {/* ═══════════════════ CREDIT DUES ═══════════════════ */}
          <SectionHeader
            title="Outstanding Credit Dues"
            subtitle="All-time balance"
          />
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              mb: 2,
              borderRadius: 2.5,
              border: `1px solid ${INK.lineSoft}`,
              bgcolor: INK.surface,
              boxShadow: INK.shadow,
            }}
          >
            <Grid container spacing={{ xs: 2.5, md: 3 }} alignItems="center">
              <Grid item xs={12} md={5}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 1.5,
                    bgcolor: INK.heading, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: INK.shadow,
                  }}>
                    <WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography sx={{
                      fontSize: 10.5, fontWeight: 700, color: INK.muted,
                      textTransform: "uppercase", letterSpacing: 0.6,
                    }}>
                      Total Outstanding
                    </Typography>
                    <Typography sx={{
                      fontSize: { xs: 26, sm: 32, md: 36 },
                      fontWeight: 700, color: INK.ink, fontFamily: MONO,
                      lineHeight: 1, letterSpacing: "-0.02em",
                      wordBreak: "break-all",
                    }}>
                      {money(dues.total_outstanding)}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, pl: { xs: 0, md: 6 } }} flexWrap="wrap">
                  <StatPill icon={<PersonOutlineIcon sx={{ fontSize: 13 }} />}
                    label={`${dues.customer_count} customers`} />
                  <StatPill icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 13 }} />}
                    label={`${dues.bill_count} bills`} />
                </Stack>
              </Grid>

              <Grid item xs={12} md={7}>
                <Grid container spacing={1}>
                  {Object.entries(dues.aging).map(([bucket, v]) => {
                    const pct = dues.total_outstanding > 0
                      ? (v.amount / dues.total_outstanding) * 100 : 0;
                    return (
                      <Grid item xs={6} sm={3} key={bucket}>
                        <Box sx={{
                          p: { xs: 1.5, md: 1.75 },
                          border: `1px solid ${INK.lineSoft}`,
                          borderRadius: 2,
                          bgcolor: INK.bgSoft,
                          height: "100%",
                          position: "relative",
                        }}>
                          <Typography sx={{
                            fontSize: 10, fontWeight: 700, color: INK.muted,
                            textTransform: "uppercase", letterSpacing: 0.4,
                          }}>
                            {AGING_LABEL[bucket]}
                          </Typography>
                          <Typography sx={{
                            fontSize: { xs: 15, md: 17 },
                            fontWeight: 700, color: INK.ink, fontFamily: MONO,
                            lineHeight: 1.1, mt: 0.75,
                            wordBreak: "break-all",
                          }}>
                            {compactMoney(v.amount)}
                          </Typography>
                          <Typography sx={{
                            fontSize: 10.5, color: INK.mutedLo,
                            fontFamily: MONO, mt: 0.5,
                          }}>
                            {v.count} bill{v.count !== 1 ? "s" : ""}
                          </Typography>
                          <Box sx={{
                            mt: 1, height: 3, borderRadius: 2,
                            bgcolor: INK.lineSoft, overflow: "hidden",
                          }}>
                            <Box sx={{
                              height: "100%", width: `${pct}%`,
                              bgcolor: INK.heading, borderRadius: 2,     // ⭐ teal fill
                              transition: "width 0.6s ease",
                            }} />
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Grid>
            </Grid>
          </Paper>

          {/* ═══════════════════ CUSTOMER DUES ═══════════════════ */}
          <SectionHeader
            title="Customer-wise Outstanding"
            subtitle={`${dues.customers.length} customer${dues.customers.length !== 1 ? "s" : ""} with pending dues`}
          />

          {dues.customers.length === 0 ? (
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
                <PersonOutlineIcon />
              </Box>
              <Typography sx={{ color: INK.muted, fontSize: 14 }}>
                No outstanding dues.
              </Typography>
            </Paper>
          ) : isTablet ? (
            /* ─── Mobile/Tablet: Cards ─── */
            <Stack spacing={1.5}>
              {dues.customers.map((c, i) => (
                <Paper
                  key={i}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: `1px solid ${INK.lineSoft}`,
                    borderRadius: 2.5,
                    bgcolor: INK.surface,
                    boxShadow: INK.shadow,
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                    <Avatar sx={{
                      bgcolor: INK.heading, color: "#fff",             // ⭐ teal avatar
                      width: 40, height: 40,
                      fontSize: 15, fontWeight: 700,
                      boxShadow: INK.shadow,
                    }}>
                      {c.customer_name?.[0]?.toUpperCase() || <PersonOutlineIcon fontSize="small" />}
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
                            {c.customer_name || "Walk-in"}
                          </Typography>
                          {c.customer_phone && (
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25 }}>
                              <PhoneOutlinedIcon sx={{ fontSize: 12, color: INK.mutedLo }} />
                              <Typography sx={{ fontSize: 12, color: INK.muted, fontFamily: MONO }}>
                                {c.customer_phone}
                              </Typography>
                            </Stack>
                          )}
                        </Box>
                        <Typography sx={{
                          fontSize: 16, fontWeight: 700, color: INK.ink,
                          fontFamily: MONO, whiteSpace: "nowrap",
                        }}>
                          {money(c.total_due)}
                        </Typography>
                      </Stack>

                      <Divider sx={{ my: 1.25, borderColor: INK.lineSoft }} />

                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <MiniBadge icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 12 }} />}
                          label={`${c.sales_count} bill${c.sales_count !== 1 ? "s" : ""}`} />
                        <MiniBadge icon={<AccessTimeOutlinedIcon sx={{ fontSize: 12 }} />}
                          label={`${c.days_old}d old`} />
                        <MiniBadge label={AGING_LABEL[c.aging_bucket] || c.aging_bucket} solid />
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
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
                    <TableCell sx={headCell}>Customer</TableCell>
                    <TableCell sx={headCell}>Phone</TableCell>
                    <TableCell sx={headCell} align="right">Bills</TableCell>
                    <TableCell sx={headCell}>Oldest Due</TableCell>
                    <TableCell sx={headCell} align="right">Days</TableCell>
                    <TableCell sx={headCell}>Bucket</TableCell>
                    <TableCell sx={headCell} align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dues.customers.map((c, i) => (
                    <TableRow
                      key={i}
                      sx={{
                        "&:hover": { bgcolor: INK.bgSoft },
                        transition: "background 0.15s",
                      }}
                    >
                      <TableCell sx={bodyCell}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <Avatar sx={{
                            bgcolor: INK.heading, color: "#fff",       // ⭐ teal avatar
                            width: 30, height: 30, fontSize: 12.5, fontWeight: 700,
                          }}>
                            {c.customer_name?.[0]?.toUpperCase() || "?"}
                          </Avatar>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: INK.ink }}>
                            {c.customer_name || "Walk-in"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontSize: 12.5 }}>
                        {c.customer_phone || "—"}
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO }} align="right">
                        {c.sales_count}
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontSize: 12.5 }}>
                        {new Date(c.oldest_due_date).toLocaleDateString("en-IN",
                          { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO }} align="right">
                        {c.days_old}
                      </TableCell>
                      <TableCell sx={bodyCell}>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            px: 1.25, py: 0.4,
                            bgcolor: INK.heading,                      // ⭐ teal pill
                            color: "#fff",
                            borderRadius: 10,
                            fontSize: 10.5, fontWeight: 700,
                            letterSpacing: 0.3,
                          }}
                        >
                          {AGING_LABEL[c.aging_bucket] || c.aging_bucket}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ ...bodyCell, fontFamily: MONO, fontWeight: 700, fontSize: 14, color: INK.ink }} align="right">
                        {money(c.total_due)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* ═══════════════════ TILL RECONCILIATION ═══════════════════ */}
          {period === "today" && (
            <Box sx={{ mt: { xs: 3, md: 4 } }}>
              <SectionHeader
                title="Till Reconciliation"
                subtitle="End-of-day sign-off"
              />
              <Paper
                elevation={0}
                sx={{
                  position: "relative",
                  p: { xs: 2.5, md: 3 },
                  borderRadius: 2.5,
                  bgcolor: INK.surface,
                  boxShadow: INK.shadow,
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    padding: "2px",
                    background: `repeating-linear-gradient(90deg, ${INK.line} 0, ${INK.line} 6px, transparent 6px, transparent 12px)`,
                    mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                    maskComposite: "exclude",
                    WebkitMaskComposite: "xor",
                    pointerEvents: "none",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Box sx={{
                    width: 24, height: 24, borderRadius: 1,
                    bgcolor: INK.heading, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <AccountBalanceOutlinedIcon sx={{ fontSize: 14 }} />
                  </Box>
                  <Typography sx={{
                    fontSize: 11.5, fontWeight: 700, color: INK.heading,
                    textTransform: "uppercase", letterSpacing: 0.8,
                  }}>
                    End-of-day Cash-up
                  </Typography>
                </Stack>

                <Grid container spacing={{ xs: 2, md: 2.5 }}>
                  {[
                    { label: "Cash in till",       amount: col.by_method.cash?.amount },
                    { label: "UPI Deposits",       amount: col.by_method.upi?.amount },
                    { label: "Card Settlements",   amount: col.by_method.card?.amount },
                    { label: "Grand Total",        amount: totalCollected, bold: true },
                  ].map((row, i) => (
                    <Grid item xs={6} sm={6} md={3} key={i}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: row.bold ? INK.heading : INK.bgSoft,  // ⭐ teal grand-total
                        color: row.bold ? "#fff" : "inherit",
                      }}>
                        <Typography sx={{
                          fontSize: 10.5, fontWeight: 700,
                          color: row.bold ? alpha("#fff", 0.7) : INK.muted,
                          textTransform: "uppercase", letterSpacing: 0.5,
                        }}>
                          {row.label}
                        </Typography>
                        <Typography sx={{
                          fontSize: { xs: 17, md: 20 },
                          fontWeight: 700,
                          color: row.bold ? "#fff" : INK.ink,
                          fontFamily: MONO, mt: 0.5,
                          wordBreak: "break-all",
                        }}>
                          {money(row.amount)}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 2.5, borderColor: INK.lineSoft }} />
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 1.5, sm: 3 }}
                  justifyContent="space-between"
                >
                  {/* <Typography sx={{ fontSize: 12, color: INK.muted, fontFamily: MONO }}>
                    Signed by: ___________________________
                  </Typography> */}
                  <Typography sx={{ fontSize: 12, color: INK.muted, fontFamily: MONO }}>
                    Date: {new Date().toLocaleDateString("en-IN")}
                  </Typography>
                </Stack>
              </Paper>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

/* ═══════════════════ Shared styles ═══════════════════ */
const btnDark = {
  textTransform: "none",
  borderRadius: 1.5,
  fontWeight: 600,
  fontSize: 14,
  bgcolor: INK.heading,                                   // ⭐ teal button
  color: "#fff",
  boxShadow: INK.shadow,
  px: 2, py: 0.85,
  "&:hover": { bgcolor: "#244d57", boxShadow: INK.shadowMd }, // darker teal on hover
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

/* ═══════════════════ Section header ═══════════════════ */
function SectionHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{
          width: 3, height: 18, borderRadius: 1, bgcolor: INK.heading,
        }} />
        <Typography sx={{
          fontSize: { xs: 15, md: 16 },
          fontWeight: 700,
          color: INK.heading,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
        }}>
          {title}
        </Typography>
      </Stack>
      {subtitle && (
        <Typography sx={{ fontSize: 12.5, color: INK.muted, mt: 0.5, pl: 1.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

/* ═══════════════════ Hero stat (inside dark card) ═══════════════════ */
function HeroStat({ label, value }) {
  return (
    <Box sx={{
      p: 1.5,
      border: `1px solid ${alpha("#fff", 0.1)}`,
      bgcolor: alpha("#fff", 0.05),
      borderRadius: 2,
      backdropFilter: "blur(4px)",
      height: "100%",
    }}>
      <Typography sx={{
        fontSize: 10, fontWeight: 700, color: alpha("#fff", 0.6),
        textTransform: "uppercase", letterSpacing: 0.5,
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: { xs: 15, md: 18 },
        fontWeight: 700, color: "#fff", fontFamily: MONO,
        lineHeight: 1.1, mt: 0.5,
        wordBreak: "break-all",
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

/* ═══════════════════ Mini badge ═══════════════════ */
function MiniBadge({ icon, label, solid }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}
      sx={{
        px: 1, py: 0.4,
        bgcolor: solid ? INK.heading : INK.bgTint,     // ⭐ teal solid badge
        color: solid ? "#fff" : INK.slate,
        borderRadius: 10,
      }}>
      {icon}
      <Typography sx={{ fontSize: 11, fontWeight: 600, fontFamily: solid ? "inherit" : MONO }}>
        {label}
      </Typography>
    </Stack>
  );
}

/* ═══════════════════ Key/value row ═══════════════════ */
function KVRow({ label, value, emphasize, last, icon: IconComp }) {
  return (
    <TableRow
      sx={{
        "&:hover": { bgcolor: INK.bgSoft },
        transition: "background 0.15s",
        ...(emphasize && { bgcolor: INK.bgTint }),
      }}
    >
      <TableCell sx={{
        ...bodyCell,
        fontWeight: emphasize ? 700 : 500,
        fontSize: emphasize ? 14 : 13,
        color: emphasize ? INK.ink : INK.text,
        borderBottom: last ? "none" : `1px solid ${INK.lineSoft}`,
      }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          {IconComp && (
            <Box sx={{
              width: 24, height: 24, borderRadius: 1,
              bgcolor: INK.bgSoft, color: INK.muted,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconComp sx={{ fontSize: 14 }} />
            </Box>
          )}
          <span>{label}</span>
        </Stack>
      </TableCell>
      <TableCell
        align="right"
        sx={{
          ...bodyCell,
          fontFamily: MONO,
          fontWeight: emphasize ? 700 : 600,
          fontSize: emphasize ? 15.5 : 13.5,
          color: INK.ink,
          borderBottom: last ? "none" : `1px solid ${INK.lineSoft}`,
        }}
      >
        {value}
      </TableCell>
    </TableRow>
  );
}