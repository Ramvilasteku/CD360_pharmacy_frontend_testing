import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Typography, AppBar, Toolbar,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import PharmacySidebarBlock from "../pharmacy/PharmacySidebarBlock";

const drawerWidth = 240;

export default function PharmacyLayout() {
  const navigate = useNavigate();
  const userName =
    localStorage.getItem("userName") ||
    localStorage.getItem("adminName") ||
    "User";
  const role = localStorage.getItem("role") || "";

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.REACT_APP_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) { /* ignore */ }
    localStorage.clear();
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f7f8fa" }}>
      {/* ═════ TOP BAR ═════ */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: 1201,
          bgcolor: "#3f6f7a",
          boxShadow: "none",
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Pharmacy
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {role} · {userName}
          </Typography>
          <Avatar sx={{ bgcolor: "#5f9aa6" }}>{userName.charAt(0)}</Avatar>
        </Toolbar>
      </AppBar>

      {/* ═════ SIDEBAR ═════ */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            bgcolor: "#3f6f7a",
            color: "#fff",
            mt: "64px",
            height: "calc(100vh - 64px)",
            borderTopRightRadius: "16px",
          },
        }}
      >
        <List>
          {/* Dashboard + Medicines / Inventory / Procurement / Sales —
              built from pharmacyRoutes.jsx, filtered by this user's features */}
          <PharmacySidebarBlock rolePrefix="/pharmacy" />

          {/* Logout */}
          <ListItem disablePadding sx={{ mt: 2 }}>
            <ListItemButton onClick={handleLogout} sx={{ color: "#fff" }}>
              <ListItemIcon sx={{ color: "#fff" }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {/* ═════ MAIN CONTENT ═════ */}
      <Box component="main" sx={{ flexGrow: 1, mt: "64px", p: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}