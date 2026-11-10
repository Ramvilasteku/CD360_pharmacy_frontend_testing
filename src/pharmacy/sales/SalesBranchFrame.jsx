// src/pharmacy/sales/SalesBranchFrame.jsx
//
// The branch bar for a Sales page reached from the sidebar — added 26 Oct 2026.
//
// WHY THIS EXISTS
//   Sales.js has a header with a branch picker, and every Sales screen (CreateSale,
//   AllSales, Payments, SalesReturns) takes `branchState` / `branchParams` props to use it.
//   But Sales.js is not mounted by any route. The sidebar links — pharmacy/sales/new, /all,
//   /payments, /returns in Routes/pharmacyRoutes.jsx — render those screens bare, so in the
//   app as it is actually used, no Sales screen ever received a branch: no picker for the
//   admin, every list showed the whole pharmacy, and New sale billed with no branch (which
//   is how NULL-branch sales kept being created).
//
//   This frame gives each routed Sales page the picker and passes the branch down, without
//   changing the pages themselves or the sidebar structure.
//
// TWO MODES
//   write   New sale. The admin's WORKING branch — must be chosen before billing (POS holds
//           Pay and Park until it is), shared with Receive / B2B, remembered on this device.
//   read    All sales, Payments, Returns. Opens on "All branches" every time; a branch
//           picked here filters this page only and never changes what New sale sells from.
//
// WHO SEES WHAT
//   single-branch pharmacy   nothing — the bar does not render at all
//   staff                    their own branch as a chip; they cannot change it, and the
//                            server enforces it regardless (utils/pharmacyBranch.js)
//   admin                    the Branch select

import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import BranchPicker, { usePharmacyBranch } from "../shared/BranchPicker";

const HINTS = {
  write: {
    admin: "Bill from this branch — its stock is what you sell.",
    staff: "You bill from your branch.",
  },
  read: {
    admin: "Showing every branch. Pick one to narrow the list.",
    staff: "Showing your branch only.",
  },
};

export default function SalesBranchFrame({ mode = "read", children }) {
  const theme = useTheme();
  const br = usePharmacyBranch(
    mode === "write" ? { allowAll: false } : { allowAll: true, defaultAll: true }
  );

  const child = React.isValidElement(children)
    ? React.cloneElement(children, { branchState: br, branchParams: br.params })
    : children;

  // Nothing to choose in a single-branch pharmacy (or before the branch list loads, so the
  // page never jumps when the bar appears for a pharmacy that has no use for it).
  // On an error the bar stays, showing why — hiding it looked like a one-branch pharmacy.
  if (br.loading || (!br.multi && !br.error)) return child;
  const warn = br.needsChoice || !!br.error;

  const who = br.isAdmin ? "admin" : "staff";
  let hint = HINTS[mode][who];
  if (mode === "read" && br.isAdmin && br.branch) hint = `Showing ${br.branch} only.`;
  if (mode === "write" && br.needsChoice) hint = "Choose the branch you are billing from.";
  if (br.error) hint = "Branches could not be loaded — check that you are logged in, then reload the page.";

  return (
    <Box sx={{ minWidth: 0 }}>
      <Paper
        elevation={0}
        sx={{
          mb: 1.5,
          px: { xs: 1.5, sm: 2 },
          py: 1,
          borderRadius: "12px",
          border: `1px solid ${
            warn ? theme.palette.warning.main : theme.palette.divider
          }`,
          bgcolor: warn
            ? alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.12 : 0.06)
            : "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <StoreOutlinedIcon
              sx={{ fontSize: 20, color: warn ? "warning.main" : "text.secondary" }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
              {hint}
            </Typography>
          </Stack>
          <BranchPicker
            state={br}
            sx={{ minWidth: { xs: 0, sm: 200 }, width: { xs: "100%", sm: "auto" } }}
          />
        </Stack>
      </Paper>
      {child}
    </Box>
  );
}