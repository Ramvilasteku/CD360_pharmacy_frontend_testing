// src/pharmacy/shell/PharmacyTopBar.jsx
//
// The pharmacy staff top bar.
//
//   [≡]  Procurement / Generate Purchase Order        [Branch] [Role ▾] [(K) Kavya ▾]
//
//   ≡            desktop: shrink / widen the sidebar · phone: open the menu drawer
//   title        the page on show, with its section — from the same registry as the sidebar
//   Branch       the branch this login works in (staff.branch), when there is one
//   Role ▾       RoleSwitcher — only for staff with more than one role
//   name ▾       My profile · Attendance · Log out

import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Avatar, Box, ButtonBase, Divider, IconButton, ListItemIcon, Menu, MenuItem, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";

import RoleSwitcher from "./RoleSwitcher";
import { PROFILE_LINKS, pageFor, roleLabel } from "./shellNav";

const readLocal = (k) => {
  try {
    return localStorage.getItem(k) || "";
  } catch (_) {
    return "";
  }
};

export default function PharmacyTopBar({ collapsed, onToggleSidebar, onOpenDrawer, onLogout }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("md"));
  const small = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();

  const auth = useSelector((s) => s.auth || {});
  const name = auth.user?.name || readLocal("userName") || readLocal("adminName") || "User";
  const roleKey = auth.activeRole || auth.role || readLocal("role");
  const branch = readLocal("branch");

  const [menu, setMenu] = useState(null);
  const page = pageFor(location.pathname);
  const showProfile = true; // every staff member has their own profile and attendance
  // the bar is the theme's primary colour (like the sidebar); text and controls use its contrast colour
  const ink = (a = 1) => alpha(theme.palette.primary.contrastText, a);

  return (
    <Box
      component="header"
      sx={{
        height: 64,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, md: 1.5 },
        px: { xs: 1, md: 2 },
        bgcolor: "primary.main",
        color: "primary.contrastText",
        boxShadow: `0 1px 0 ${ink(0.12)}`,
      }}
    >
      <Tooltip title={phone ? "Menu" : collapsed ? "Show the menu" : "Shrink the menu"}>
        <IconButton color="inherit" onClick={phone ? onOpenDrawer : onToggleSidebar} sx={{ "&:hover": { bgcolor: ink(0.12) } }} aria-label={phone ? "Open the menu" : collapsed ? "Show the menu" : "Shrink the menu"}>
          {phone || collapsed ? <MenuIcon /> : <MenuOpenIcon />}
        </IconButton>
      </Tooltip>

      {/* ---------- where you are ---------- */}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {page.section && !small && (
          <Typography sx={{ fontSize: 11.5, color: ink(0.75), lineHeight: 1.2 }} noWrap>
            {page.section}
          </Typography>
        )}
        <Typography component="h1" sx={{ fontSize: { xs: 15.5, md: 16.5 }, fontWeight: 800,color:"#ffffff", lineHeight: 1.25, letterSpacing: "-0.01em" }} noWrap>
          {page.title}
        </Typography>
      </Box>

      {/* ---------- branch ---------- */}
      {branch && (
        <Tooltip title="Your branch">
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 0.75,
              height: 38,
              px: 1.25,
              borderRadius: 2,
              bgcolor: ink(0.14),
              color: ink(0.92),
              flexShrink: 0,
            }}
          >
            <StoreOutlinedIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600, maxWidth: 160 }} noWrap>
              {branch}
            </Typography>
          </Box>
        </Tooltip>
      )}

      <RoleSwitcher compact={small} onDark />

      {/* ---------- you ---------- */}
      <ButtonBase
        onClick={(e) => setMenu(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={!!menu}
        aria-label={`${name} — account menu`}
        sx={{ height: 44, pl: 0.5, pr: { xs: 0.5, md: 1 }, gap: 1, borderRadius: 2.5, flexShrink: 0, color: "inherit", "&:hover": { bgcolor: ink(0.12) } }}
      >
        <Avatar sx={{ width: 34, height: 34, fontSize: 14.5, fontWeight: 800, bgcolor: "primary.contrastText", color: "primary.main" }}>{name.charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ display: { xs: "none", md: "block" }, textAlign: "left", minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, maxWidth: 150 }} noWrap>
            {name}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: ink(0.75), lineHeight: 1.25, maxWidth: 150 }} noWrap>
            {roleLabel(roleKey, auth.roles)}
          </Typography>
        </Box>
        <ExpandMoreIcon sx={{ display: { xs: "none", md: "block" }, fontSize: 18, color: ink(0.75) }} />
      </ButtonBase>

      <Menu
        anchorEl={menu}
        open={!!menu}
        onClose={() => setMenu(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { mt: 0.75, minWidth: 220, borderRadius: 2 } }}
      >
        <Box sx={{ px: 2, pt: 0.75, pb: 1.25 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800 }} noWrap>
            {name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
            {roleLabel(roleKey, auth.roles)}
            {branch ? ` · ${branch}` : ""}
          </Typography>
        </Box>
        <Divider />
        {showProfile &&
          PROFILE_LINKS.map((l) => (
            <MenuItem
              key={l.key}
              onClick={() => {
                setMenu(null);
                navigate(l.path);
              }}
              sx={{ fontSize: 13.5, mt: 0.5 }}
            >
              <ListItemIcon>
                <l.icon fontSize="small" />
              </ListItemIcon>
              {l.label}
            </MenuItem>
          ))}
        {showProfile && <Divider />}
        <MenuItem
          onClick={() => {
            setMenu(null);
            onLogout();
          }}
          sx={{ fontSize: 13.5, color: "error.main", mt: 0.5 }}
        >
          <ListItemIcon>
            <LogoutOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </Box>
  );
}