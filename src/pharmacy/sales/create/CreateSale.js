// src/components/pharmacy/sales/create/CreateSale.jsx
//
// New sale — one fixed frame that fills exactly the space left on screen (no page scrollbar).
//   • Walk-in sale / Existing patient is a compact segmented switch at the top of the frame
//   • Standalone pharmacy plan: no switch, just the POS
//   • Each mode keeps its bill when you switch between them (both stay mounted once opened)
//   • POS / ExistingClient render inside the frame with a definite height (height: 100%),
//     so their own lists can scroll inside while totals and buttons stay put
//   • Phones keep normal page scrolling (a fixed frame on a phone keyboard is worse, not better)

import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { Box, Paper, Stack, Typography, Tabs, Tab, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LocalMallOutlinedIcon from "@mui/icons-material/LocalMallOutlined";
import PersonSearchOutlinedIcon from "@mui/icons-material/PersonSearchOutlined";
import { useFitToScreen } from "../useFitToScreen";
import POS from "./POS";
import ExistingClient from "./ExistingClient";

const MODES = [
  { key: "walkin", label: "Walk-in sale", hint: "Bill a customer at the counter", Icon: LocalMallOutlinedIcon },
  { key: "patient", label: "Existing patient", hint: "Bill against a patient's record", Icon: PersonSearchOutlinedIcon },
];
const MODE_KEY = "pharmacy.newSale.mode";

const readMode = () => {
  try { return localStorage.getItem(MODE_KEY) === "patient" ? "patient" : "walkin"; } catch { return "walkin"; }
};

export default function CreateSale({ branchState, branchParams = {} }) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true }); // < 600px
  const planType = useSelector((s) => s.auth?.plan_type);
  const pharmacyOnly = planType === "pharmacy";

  const [mode, setMode] = useState(readMode);
  const [visited, setVisited] = useState(() => new Set([readMode()]));

  // The frame ends at the bottom of the screen; POS gets the rest of the space
  const frameRef = useRef(null);
  const frameHeight = useFitToScreen(frameRef, !isPhone, { min: 420 });

  const switchTo = (key) => {
    setMode(key);
    setVisited((v) => (v.has(key) ? v : new Set(v).add(key)));
    try { localStorage.setItem(MODE_KEY, key); } catch { /* not available */ }
  };

  const current = MODES.find((m) => m.key === mode);
  const panelBg = theme.palette.mode === "dark" ? theme.palette.background.default : "#f8fafc";

  const panels = pharmacyOnly
    ? [{ key: "walkin", node: <POS branchState={branchState} branchParams={branchParams} /> }]
    : MODES.filter((m) => m.key === mode || visited.has(m.key)).map((m) => ({
      key: m.key,
      node: m.key === "walkin"
        ? <POS branchState={branchState} branchParams={branchParams} />
        : <ExistingClient branchState={branchState} branchParams={branchParams} />,
    }));

  return (
    <Paper
      ref={frameRef}
      variant="outlined"
      sx={{
        borderRadius: { xs: "14px", sm: "16px" }, overflow: "hidden", minWidth: 0,
        display: "flex", flexDirection: "column",
        height: frameHeight ?? "auto", // exact screen fit on tablets/desktops; natural on phones
      }}
    >
      {/* Mode switch */}
      {!pharmacyOnly && (
        <Stack
          direction="row" alignItems="center" justifyContent="space-between" spacing={2}
          sx={{ px: { xs: 1.25, sm: 2 }, py: { xs: 1.25, sm: 1.25 }, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
        >
          <Tabs
            value={mode}
            onChange={(_, key) => switchTo(key)}
            variant={isPhone ? "fullWidth" : "standard"}
            aria-label="Type of sale"
            sx={{
              minHeight: 0, p: 0.5, borderRadius: "12px", width: { xs: "100%", sm: "auto" },
              bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.08 : 0.05),
              "& .MuiTabs-flexContainer": { gap: 0.5 },
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": {
                minHeight: 38, minWidth: { xs: 0, sm: 150 }, px: { xs: 1, sm: 2 }, borderRadius: "9px",
                textTransform: "none", fontWeight: 600, fontSize: 14, color: "text.secondary",
                transition: "background-color .15s, color .15s",
                "&:hover": { color: "text.primary" },
                "&.Mui-selected": {
                  color: "primary.main", bgcolor: "background.paper",
                  boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.12)}, 0 0 0 1px ${theme.palette.divider}`,
                },
                "&.Mui-focusVisible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
                "& .MuiTab-iconWrapper": { mr: 1 },
              },
            }}
          >
            {MODES.map(({ key, label, Icon }) => (
              <Tab key={key} value={key} id={`sale-mode-${key}`} aria-controls={`sale-mode-panel-${key}`}
                icon={<Icon sx={{ fontSize: 19 }} />} iconPosition="start" label={label} />
            ))}
          </Tabs>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ display: { xs: "none", md: "block" } }}>
            {current.hint}
          </Typography>
        </Stack>
      )}

      {/* Sale screen — fills the rest of the frame */}
      <Box sx={{
        flex: "1 1 auto", minHeight: 0, minWidth: 0, position: "relative", bgcolor: panelBg,
        overflow: frameHeight ? "auto" : "visible", // safety net: only scrolls if POS itself is taller
        overscrollBehavior: "contain",
      }}>
        {panels.map(({ key, node }) => (
          <Box
            key={key}
            role={pharmacyOnly ? undefined : "tabpanel"}
            id={`sale-mode-panel-${key}`}
            aria-labelledby={pharmacyOnly ? undefined : `sale-mode-${key}`}
            hidden={!pharmacyOnly && key !== mode}
            sx={{ height: frameHeight ? "100%" : "auto", minWidth: 0 }}
          >
            {node}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}