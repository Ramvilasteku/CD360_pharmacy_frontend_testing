import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Badge,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import NotificationsIcon from "@mui/icons-material/Notifications";
import MailIcon from "@mui/icons-material/Mail";
import NotificationBell from '../NotificationBell';

// 26 Oct 2026 — the role switch, shared with the pharmacy shell's top bar. It renders
// nothing unless this staff member holds two or more active roles, so adding it here is
// invisible to a receptionist with a single role. Switching posts to
// /api/pharmacy/account/switch-role, which is guarded by loginAuth only (no pharmacy
// module or permission check), so it works for any staff member; the server re-issues
// the cookie and roleHome() sends them to the new role's own dashboard.
import RoleSwitcher from "../pharmacy/shell/RoleSwitcher";

export default function Topbar({ sidebarOpen, company }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const sidebarWidth = sidebarOpen ? 240 : 70;

  return (
    <AppBar
      position="sticky"

      elevation={0}
      sx={{
        backgroundColor: "#437986",
        width: { xs: "100%", md: "98%" },
        borderRadius: { xs: 0, md: 2 },
        mt: { xs: 0, md: 3 },
        ml: { xs: 0, md: 2 },
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >


      <Toolbar
        sx={{
          px: { xs: 2, sm: 3 },
          minHeight: 64,
          display: "flex",
        }}
      >
        {/* LEFT SECTION */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            pl: { xs: 2 }
          }}
        >
      <Typography fontWeight={700}>
  {company?.company_name || "Company"}
</Typography>
        </Box>

        {/* RIGHT SECTION (NOTIFICATIONS) */}
        <Box
          sx={{
            marginLeft: "auto", // ✅ pushes icons to the right
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >

       <RoleSwitcher compact={isMobile} onDark />
       <NotificationBell />
        </Box>
      </Toolbar>
    </AppBar>
  );
}