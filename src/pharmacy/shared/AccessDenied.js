// src/pharmacy/shared/AccessDenied.js
//
// What a pharmacy screen shows when the user may not open it.
//
// Two places need this:
//   • Routes/PharmacyStaffRoutes.jsx — a URL typed by hand for a page that is not in this
//     user's sidebar. Hiding the link is not a guard on its own.
//   • A screen whose own view permission is missing (a page reached from a stale bookmark,
//     or still open when an admin unticks the permission — usePermissionPolling picks that
//     up within 60 seconds).
//
// There is a near-identical component in hooks/useAccess.jsx. This one is deliberately
// separate: the pharmacy module reads permissions from redux (Redux/store/hooks/
// usePermissions.js), not from useAccess, and importing from that module here would quietly
// tie the two systems back together.
//
// Deliberately says what to do next rather than only what went wrong — "ask your admin for
// X" is actionable, "403" is not. The permission key is shown because it is what the admin
// has to find on the Roles screen.

import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

export default function AccessDenied({ what = "this screen", permission, onBack }) {
  const theme = useTheme();
  const tint = (c, light, dark) => alpha(c, theme.palette.mode === "dark" ? dark : light);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: "grid", placeItems: "center", minHeight: 320 }}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: "16px",
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              display: "grid",
              placeItems: "center",
              bgcolor: tint(theme.palette.warning.main, 0.12, 0.2),
              color: "warning.main",
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 28 }} />
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
              You don't have access to {what}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Your role doesn't include this page. Ask your admin to turn it on for you.
            </Typography>
          </Box>

          {permission && (
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: "8px",
                bgcolor: tint(theme.palette.text.primary, 0.05, 0.1),
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 12.5,
                color: "text.secondary",
                wordBreak: "break-all",
              }}
            >
              {permission}
            </Box>
          )}

          {onBack && (
            <Button
              variant="outlined"
              onClick={onBack}
              sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 600 }}
            >
              Go back
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}