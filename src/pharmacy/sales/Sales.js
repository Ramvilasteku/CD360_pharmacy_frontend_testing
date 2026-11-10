// src/components/pharmacy/sales/Sales.jsx
//
// Sales module
//   • One header card frames the module: title, today's date and bill count, the section tabs,
//     and a "New sale" button
//   • With 1000px+ of space it's a single slim row (title · tabs · button); narrower → two rows;
//     on phones it runs edge to edge with an icon tab strip
//   • Tabs: New sale · All sales · Dues (with a count of bills that have money pending) · Returns
//   • The screens below don't repeat their own big heading — the selected tab already says where you are
//   • The open tab is kept in the URL (?tab=dues), so refresh and shared links land on it
//   • SCROLLING: the module ROOT scrolls vertically. Panels inside flow naturally (no card-level
//     scrollbars). This works even when the parent app shell uses a fixed-height layout.
//   • New sale stays mounted once opened, so a half-built bill survives a quick look elsewhere;
//     the other tabs reload each time you open them, so their lists are always current

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Box, Stack, Paper, Typography, Button, Tabs, Tab, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import PointOfSaleOutlinedIcon from "@mui/icons-material/PointOfSaleOutlined";
import AddShoppingCartOutlinedIcon from "@mui/icons-material/AddShoppingCartOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import { useElementWidth } from "./useFitToScreen";
import { usePharmacyAccess } from "../../Routes/usePharmacyRoutes";
import AccessDenied from "../shared/AccessDenied";
import CreateSale from "./create/CreateSale";
import AllSales from "./list/AllSales";
import Payments from "./payments/Payments";
import SalesReturns from "./returns/SalesReturns";
// The Branch dropdown, the same component Procurement and Inventory use.
import BranchPicker, { usePharmacyBranch } from "../shared/BranchPicker";

const API = process.env.REACT_APP_URL;
const TAB_PARAM = "tab";

// `path` is the registry path in Routes/pharmacyRoutes.jsx that opens this tab. The tab
// strip is filtered through usePharmacyAccess so it can never offer a tab the sidebar
// hides — a cashier with only pharmacy.sales.create gets New sale and nothing else,
// instead of four tabs that 403 when touched.
const SECTIONS = [
  { key: "new", label: "New sale", Icon: AddShoppingCartOutlinedIcon, path: "pharmacy/sales/new" },
  { key: "all", label: "All sales", short: "Sales", Icon: ReceiptLongOutlinedIcon, path: "pharmacy/sales/all" },
  { key: "dues", label: "Payments", Icon: AccountBalanceWalletOutlinedIcon, path: "pharmacy/sales/payments" },
  { key: "returns", label: "Returns", Icon: AssignmentReturnOutlinedIcon, path: "pharmacy/sales/returns" },
];


const DEFAULT_TAB = SECTIONS[0].key;
const KEEP_ALIVE = new Set(["new"]);

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// `allowed` is the list of tabs this user may open. A bookmarked ?tab=returns must not
// land someone on a tab their role does not include, so an unavailable key falls back to
// the first tab they CAN open rather than to a fixed default.
function readTabFromUrl(allowed = SECTIONS) {
  const fallback = (allowed[0] || SECTIONS[0]).key;
  try {
    const key = new URLSearchParams(window.location.search).get(TAB_PARAM);
    return allowed.some((s) => s.key === key) ? key : fallback;
  } catch {
    return fallback;
  }
}

function writeTabToUrl(key) {
  try {
    const url = new URL(window.location.href);
    if (key === DEFAULT_TAB) url.searchParams.delete(TAB_PARAM);
    else url.searchParams.set(TAB_PARAM, key);
    window.history.replaceState(window.history.state, "", url);
  } catch { /* URL not writable here; tabs still work */ }
}

async function countSales(query, signal) {
  const res = await axios.get(`${API}/api/pharmacy/sales?${query}&page=1&limit=1`, { withCredentials: true, signal });
  const total = res.data.total ?? res.data.pagination?.total;
  return total == null ? null : Number(total);
}

function CountPill({ count }) {
  const theme = useTheme();
  const tone = theme.palette.error;
  return (
    <Box component="span" sx={{
      minWidth: 20, height: 20, px: 0.75, borderRadius: "999px", fontSize: 12, fontWeight: 700,
      lineHeight: "20px", textAlign: "center", fontVariantNumeric: "tabular-nums",
      bgcolor: alpha(tone.main, theme.palette.mode === "dark" ? 0.22 : 0.12),
      color: theme.palette.mode === "dark" ? tone.light : tone.dark,
    }}>
      {count > 99 ? "99+" : count}
    </Box>
  );
}

export default function Sales() {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });

  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const headerRef = useRef(null);
  const width = useElementWidth(rootRef);
  const oneRow = !isPhone && width != null && width >= 1000;

  // Which of the four tabs this user may open, by the same rules as the sidebar
  // (Routes/usePharmacyRoutes.js → feature_key + permission_key, admin bypassed).
  const { canOpenPath } = usePharmacyAccess();
  const sections = SECTIONS.filter((s) => canOpenPath(s.path));

  const [tab, setTab] = useState(() => readTabFromUrl(sections));
  const [visited, setVisited] = useState(() => new Set([readTabFromUrl(sections)]));
  const [dueCount, setDueCount] = useState(null);
  const [todayCount, setTodayCount] = useState(null);

  // Permissions are refreshed in the background by usePermissionPolling() in App.js, so the
  // tab on screen can stop being allowed mid-session — an admin unticking a permission
  // takes effect within 60 seconds. Move to the first tab still open rather than leaving a
  // screen up that the server will now refuse.
  useEffect(() => {
    if (sections.length > 0 && !sections.some((s) => s.key === tab)) {
      const next = sections[0].key;
      setTab(next);
      setVisited((v) => (v.has(next) ? v : new Set(v).add(next)));
      writeTabToUrl(next);
    }
  }, [sections, tab]);

  const todayLabel = new Date().toLocaleDateString("en-IN", isPhone
    ? { weekday: "short", day: "numeric", month: "short" }
    : { weekday: "long", day: "numeric", month: "long" });

  const go = (key) => {
    if (key === tab) return;
    setTab(key);
    setVisited((v) => (v.has(key) ? v : new Set(v).add(key)));
    writeTabToUrl(key);
    // Return to the top of the Sales viewport when switching tabs
    const scroller = scrollRef.current;
    if (scroller && scroller.scrollTop > 0) {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Which branch this module is working in. "New sale" takes stock out, so it needs a
  // branch chosen (allowAll false); the list tabs are read-only and may show every branch.
  const br = usePharmacyBranch({ allowAll: tab !== "new" });
  // Spread into every request: { branch } for an admin who has picked one, {} otherwise.
  const branchParams = br.params;

  // Both counts read the sales list endpoint, which needs pharmacy.sales.view. Asking for
  // them without it is a guaranteed 403 on every tab change, so they are skipped instead —
  // the header simply shows no count.
  const canSeeSalesList = canOpenPath("pharmacy/sales/all");
  const canSeeDues = canOpenPath("pharmacy/sales/payments");

  useEffect(() => {
    if (!canSeeSalesList) return;
    const controller = new AbortController();
    const d = ymd(new Date());
    const bq = br.branch ? `&branch=${encodeURIComponent(br.branch)}` : "";
    countSales(`start_date=${d}&end_date=${d}${bq}`, controller.signal).then(setTodayCount).catch(() => {});
    if (canSeeDues) {
      countSales(`payment_status=partial,unpaid${bq}`, controller.signal).then(setDueCount).catch(() => {});
    }
    return () => controller.abort();
  }, [tab, br.branch, canSeeSalesList, canSeeDues]);

  // Every section receives naturalScroll so its list renders inline, not inside its own scroll card.
  const renderSection = (key) => {
    switch (key) {
      case "new":     return <CreateSale naturalScroll branchState={br} branchParams={branchParams} />;
      case "all":     return <AllSales   naturalScroll title={null} onNewSale={() => go("new")} branchParams={branchParams} />;
      case "dues":    return <Payments   naturalScroll title={null} branchParams={branchParams} />;
      case "returns": return <SalesReturns naturalScroll title={null} branchParams={branchParams} />;
      default: return null;
    }
  };

  // The tenant has the `sales` feature on but this role holds none of the five page
  // permissions. Without this the module rendered its header and then nothing at all,
  // which reads as a broken screen rather than as a permissions matter.
  if (sections.length === 0) {
    return <AccessDenied what="Sales" permission="pharmacy.sales.view" />;
  }

  const tint = (c, light, dark) => alpha(c, theme.palette.mode === "dark" ? dark : light);
  const divider = `1px solid ${theme.palette.divider}`;
  const tabHeight = oneRow ? 68 : isPhone ? 58 : 52;

  const titleBlock = (
    <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 1.75 }} sx={{ minWidth: 0 }}>
      <Box sx={{
        width: { xs: 40, sm: 44 }, height: { xs: 40, sm: 44 }, borderRadius: "12px", flexShrink: 0,
        display: "grid", placeItems: "center",
        bgcolor: tint(theme.palette.primary.main, 0.12, 0.2), color: "primary.main",
      }}>
        <PointOfSaleOutlinedIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2, fontSize: { xs: 20, sm: 22 } }}>
          Sales
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: 13 }}>
          {todayLabel}
          {todayCount != null && (
            <>
              {" · "}
              <Box component="span" sx={{ color: "text.primary", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {todayCount.toLocaleString("en-IN")}
              </Box>
              {` ${todayCount === 1 ? "bill" : "bills"} today`}
            </>
          )}
        </Typography>
      </Box>
    </Stack>
  );

  const newSaleButton = tab !== "new" && sections.some((s) => s.key === "new") && (
    <Button
      variant="contained" disableElevation startIcon={<AddIcon />} onClick={() => go("new")}
      sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 700, flexShrink: 0, height: 40, px: { xs: 1.75, sm: 2.25 } }}
    >
      New sale
    </Button>
  );

  const tabs = (
    <Tabs
      value={tab}
      onChange={(_, key) => go(key)}
      variant={isPhone ? "fullWidth" : "standard"}
      aria-label="Sales sections"
      sx={{
        minHeight: tabHeight, px: { sm: oneRow ? 1 : 1.5 },
        ...(oneRow ? { flex: "1 1 auto", alignSelf: "stretch", borderLeft: divider, ml: 3 } : {}),
        ...(isPhone ? { borderTop: divider } : {}),
        "& .MuiTabs-flexContainer": { height: "100%" },
        "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
        "& .MuiTab-root": {
          minHeight: tabHeight, minWidth: { xs: 0, sm: 104 }, px: { xs: 0.5, sm: 2 },
          textTransform: "none", fontWeight: 600, fontSize: { xs: 12.5, sm: 15 }, color: "text.secondary",
          gap: { xs: 0.25, sm: 0 }, transition: "color .15s",
          "&:hover": { color: "text.primary" },
          "&.Mui-selected": { color: "primary.main" },
          "&.Mui-focusVisible": { bgcolor: tint(theme.palette.primary.main, 0.08, 0.16) },
          "& .MuiTab-iconWrapper": { mb: { xs: 0.25, sm: 0 }, mr: { sm: 1 } },
        },
      }}
    >
      {sections.map(({ key, label, short, Icon }) => (
        <Tab
          key={key}
          value={key}
          id={`sales-tab-${key}`}
          aria-controls={`sales-panel-${key}`}
          icon={<Icon sx={{ fontSize: { xs: 22, sm: 20 } }} />}
          iconPosition={isPhone ? "top" : "start"}
          label={
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
              {isPhone && short ? short : label}
              {key === "dues" && dueCount > 0 && <CountPill count={dueCount} />}
            </Box>
          }
        />
      ))}
    </Tabs>
  );

  return (
    // ⭐ ROOT = flex column that fills whatever height the parent gives it.
    // The INNER box (scrollRef) is the actual scroll container → the page scrolls vertically.
    // This works whether the app shell gives us 100vh or a fixed container height.
    <Box
      ref={rootRef}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        width: "100%",
      }}
    >
      <Box
        ref={scrollRef}
        sx={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",        // ⭐ THE page vertical scroll lives HERE
          overflowX: "hidden",
          // Smooth scrolling + a nicer scrollbar on webkit
          scrollBehavior: "smooth",
          "&::-webkit-scrollbar": { width: 10 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: alpha(theme.palette.text.primary, 0.15),
            borderRadius: 8,
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: alpha(theme.palette.text.primary, 0.25),
          },
        }}
      >
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            pb: { xs: 3, md: 3 },
            pt: { xs: 0, sm: 2 },
            maxWidth: 1600, mx: "auto",
            minWidth: 0,
          }}
        >
          {/* ─── Module header ─── */}
          <Paper
            ref={headerRef}
            elevation={0}
            sx={{
              mb: 2, scrollMarginTop: 72, overflow: "hidden",
              mx: { xs: -2, sm: 0 },
              borderRadius: { xs: 0, sm: "16px" },
              border: { xs: "none", sm: divider },
              borderBottom: { xs: divider, sm: divider },
              backgroundImage: `linear-gradient(180deg, ${tint(theme.palette.primary.main, 0.05, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0)} 80%)`,
              ...(oneRow && { display: "flex", alignItems: "center" }),
            }}
          >
            {oneRow ? (
              <>
                <Box sx={{ pl: 3, py: 1.5, flexShrink: 0 }}>{titleBlock}</Box>
                {tabs}
                <Box sx={{ pl: 2, flexShrink: 0 }}><BranchPicker state={br} /></Box>
                {newSaleButton && <Box sx={{ pr: 3, pl: 2, flexShrink: 0 }}>{newSaleButton}</Box>}
              </>
            ) : (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}
                  sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2 }, pb: { xs: 1.5, sm: 1.5 } }}>
                  {titleBlock}
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <BranchPicker state={br} />
                    {newSaleButton}
                  </Stack>
                </Stack>
                {tabs}
              </>
            )}
          </Paper>

          {/* ─── Panels — flow naturally; the OUTER scroll container above handles scrolling ─── */}
          {sections.map(({ key }) => {
            const active = tab === key;
            const mounted = active || (KEEP_ALIVE.has(key) && visited.has(key));
            if (!mounted) return null;
            return (
              <Box
                key={key}
                role="tabpanel"
                id={`sales-panel-${key}`}
                aria-labelledby={`sales-tab-${key}`}
                hidden={!active}
                sx={{
                  minWidth: 0,
                  height: "auto",
                  overflow: "visible",
                }}
              >
                {renderSection(key)}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}