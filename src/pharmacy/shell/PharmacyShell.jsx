// src/pharmacy/shell/PharmacyShell.jsx
//
// The frame around every pharmacy staff page (/pharmacy/*): sidebar on the left, top bar
// above the page. Replaces pharmacy/PharmacyLayout.jsx for these routes (that file is left
// as it was, unused).
//
//   desktop   sidebar 256px, or a 72px icon rail — the ≡ button switches, and the choice
//             is remembered on this device
//   phone     the sidebar opens as a drawer from the ≡ button and closes when you pick a page
//
// The page scrolls inside the main area; the sidebar and the top bar stay put.
//
// Company name and logo: GET /api/pharmacy/account/get/company (routes/Pharmacy/pharmacyAccount.js).
// Log out: the same call the old pharmacy layout made, then a full load of /login so no state
// from this session survives in memory.

import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import axios from "axios";
import { Box, Drawer, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { ColorRoot } from "../../theme/appColors";
import PharmacySidebar, { RAIL_WIDTH, SIDEBAR_WIDTH } from "./PharmacySidebar";
import PharmacyTopBar from "./PharmacyTopBar";

const API_BASE = process.env.REACT_APP_SITE_URL || "";
const COLLAPSE_KEY = "caredesk:pharmacy-sidebar-collapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch (_) {
    return false;
  }
};

function Shell() {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [company, setCompany] = useState(null);

  // company name + logo, once
  useEffect(() => {
    let live = true;
    axios
      .get(`${API_BASE}/api/pharmacy/account/get/company`, { withCredentials: true })
      .then((r) => live && setCompany(r.data?.data || null))
      .catch(() => {}); // the shell still works without it — the sidebar says "Pharmacy"
    return () => {
      live = false;
    };
  }, []);

  // a new page closes the phone drawer
  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch (_) {
        /* not remembered — fine */
      }
      return !c;
    });

  const logout = async () => {
    try {
      await fetch(`${process.env.REACT_APP_URL || ""}/logout`, { method: "POST", credentials: "include" });
    } catch (_) {
      /* signed out locally either way */
    }
    try {
      localStorage.clear();
    } catch (_) {
      /* nothing to clear */
    }
    window.location.assign("/login");
  };

  const width = collapsed ? RAIL_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: "flex", height: "100dvh", overflow: "hidden", bgcolor: "background.default" }}>
      {/* ---------- sidebar ---------- */}
      {phone ? (
        <Drawer open={drawer} onClose={() => setDrawer(false)} PaperProps={{ sx: { width: 280, maxWidth: "86vw" } }} ModalProps={{ keepMounted: true }}>
          <PharmacySidebar company={company} onNavigate={() => setDrawer(false)} onLogout={logout} />
        </Drawer>
      ) : (
        <Box
          sx={{
            width,
            flexShrink: 0,
            height: "100%",
            transition: "width .2s ease",
            overflow: "hidden",
          }}
        >
          <PharmacySidebar collapsed={collapsed} company={company} onLogout={logout} />
        </Box>
      )}

      {/* ---------- top bar + page ---------- */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
        <PharmacyTopBar collapsed={collapsed} onToggleSidebar={toggle} onOpenDrawer={() => setDrawer(true)} onLogout={logout} />
        <Box component="main" sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", p: { xs: 1.5, md: 2 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

/** Sidebar, top bar and every page inside take their colours from theme/appColors.js —
    change COLORS there and the whole pharmacy area follows. */
export default function PharmacyShell() {
  return (
    <ColorRoot>
      <Shell />
    </ColorRoot>
  );
}
