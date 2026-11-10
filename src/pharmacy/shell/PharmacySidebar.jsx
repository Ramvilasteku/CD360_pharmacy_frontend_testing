// src/pharmacy/shell/PharmacySidebar.jsx
//
// The pharmacy staff sidebar.
//
//   ┌──────────────────────┐
//   │ [logo] Company name  │  header — same height as the top bar
//   │        Pharmacy      │
//   ├──────────────────────┤
//   │ PHARMACY             │  the pharmacy screens this role can open
//   │  ▣ Dashboard         │  (Routes/pharmacyRoutes.jsx via usePharmacyAccess)
//   │  ▣ Medicines      ▾  │
//   │  ▣ Procurement    ▾  │  a section opens to its screens; the one you're on is open
//   │     · Suppliers      │
//   │ PROFILE              │  the staff member's own pages
//   │  ▣ My profile        │
//   │  ▣ Attendance        │  (always — every staff member has their own)
//   ├──────────────────────┤
//   │  ⎋ Log out           │
//   └──────────────────────┘
//
// Collapsed (desktop) it is a 72px rail of icons: hover an icon for its name, click a
// section's icon for a small menu of its screens. On a phone the shell shows it in a drawer.

import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Box, Collapse, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";

import { usePharmacyAccess } from "../../Routes/usePharmacyRoutes";
import { DashboardIcon, PROFILE_LINKS, SHELL_BASE, pageFor, sectionIcon, toShellPath } from "./shellNav";

export const SIDEBAR_WIDTH = 256;
export const RAIL_WIDTH = 72;

/* ------------------------------------------------------------------ */
/* Styles — every colour comes from the theme (theme/appColors.js):    */
/* the sidebar is the primary colour, its text the primary's contrast. */
/* ------------------------------------------------------------------ */
const ink = (t, a = 1) => alpha(t.palette.primary.contrastText, a); // text on the sidebar

const itemSx = ({ active, collapsed, depth = 0 }) => ({
  display: "flex",
  alignItems: "center",
  gap: 1.5,
  width: "100%",
  minHeight: depth ? 34 : 40,
  px: collapsed ? 0 : depth ? 1.25 : 1.25,
  justifyContent: collapsed ? "center" : "flex-start",
  border: 0,
  borderRadius: 2,
  bgcolor: active && !depth ? (t) => ink(t, 0.18) : "transparent",
  color: (t) => (active ? ink(t) : ink(t, 0.78)),
  font: "inherit",
  fontSize: depth ? 13 : 13.5,
  fontWeight: active ? 700 : 500,
  textAlign: "left",
  textDecoration: "none",
  cursor: "pointer",
  transition: "background-color .12s, color .12s",
  "&:hover": {
    bgcolor: (t) => (active && !depth ? ink(t, 0.22) : ink(t, 0.1)),
    color: (t) => ink(t),
  },
  "&:focus-visible": { outline: "2px solid", outlineColor: (t) => ink(t, 0.8), outlineOffset: -2 },
  "& .nav-icon": { fontSize: 20, flexShrink: 0 },
});

/* A small caps heading over a group of links ("PHARMACY", "PROFILE"). */
function GroupHead({ children, collapsed, first }) {
  if (collapsed) return first ? <Box sx={{ height: 12 }} /> : <Box sx={{ mx: 2.5, my: 1.25, borderTop: 1, borderColor: (t) => ink(t, 0.18) }} />;
  return (
    <Typography sx={{ px: 2.75, pt: 2, pb: 0.75, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: (t) => ink(t, 0.55) }}>
      {children}
    </Typography>
  );
}

/* One link. Collapsed, it is an icon with its name on hover. */
function NavItem({ to, label, icon: Icon, active, collapsed, onNavigate }) {
  const link = (
    <Box component={NavLink} to={to} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-label={collapsed ? label : undefined} sx={itemSx({ active, collapsed })}>
      <Icon className="nav-icon" />
      {!collapsed && (
        <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </Box>
      )}
    </Box>
  );
  return collapsed ? (
    <Tooltip title={label} placement="right" arrow>
      {link}
    </Tooltip>
  ) : (
    link
  );
}

/* A section with several screens: opens in place, or — collapsed — as a small menu. */
function NavSection({ section, links, activePath, open, onToggle, collapsed, onNavigate }) {
  const [anchor, setAnchor] = useState(null);
  const Icon = sectionIcon(section.key);
  const holdsActive = links.some((l) => l.path === activePath);

  if (collapsed) {
    return (
      <>
        <Tooltip title={section.label} placement="right" arrow disableHoverListener={!!anchor}>
          <Box
            component="button"
            type="button"
            aria-label={section.label}
            aria-haspopup="menu"
            aria-expanded={!!anchor}
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={itemSx({ active: holdsActive, collapsed })}
          >
            <Icon className="nav-icon" />
          </Box>
        </Tooltip>
        <Menu
          anchorEl={anchor}
          open={!!anchor}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{ sx: { ml: 1, minWidth: 210, borderRadius: 2 } }}
        >
          <Typography sx={{ px: 2, pt: 0.5, pb: 0.75, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "text.disabled" }}>
            {section.label.toUpperCase()}
          </Typography>
          {links.map((l) => (
            <MenuItem
              key={l.path}
              component={NavLink}
              to={l.path}
              selected={l.path === activePath}
              onClick={() => {
                setAnchor(null);
                if (onNavigate) onNavigate();
              }}
              sx={{ fontSize: 13.5, fontWeight: l.path === activePath ? 700 : 500 }}
            >
              {l.label}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  return (
    <>
      <Box component="button" type="button" onClick={onToggle} aria-expanded={open} sx={itemSx({ active: holdsActive && !open, collapsed })}>
        <Icon className="nav-icon" />
        <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: holdsActive ? "primary.contrastText" : undefined, fontWeight: holdsActive ? 700 : undefined }}>
          {section.label}
        </Box>
        <ExpandMoreIcon sx={{ fontSize: 18, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none", color: (t) => ink(t, 0.6) }} />
      </Box>
      <Collapse in={open} timeout="auto">
        <Box sx={{ ml: "21px", pl: 1.5, my: 0.25, borderLeft: 1, borderColor: (t) => ink(t, 0.22) }}>
          {links.map((l) => {
            const active = l.path === activePath;
            return (
              <Box key={l.path} component={NavLink} to={l.path} onClick={onNavigate} aria-current={active ? "page" : undefined} sx={{ ...itemSx({ active, collapsed, depth: 1 }), position: "relative" }}>
                {active && <Box sx={{ position: "absolute", left: -13.5, top: 9, bottom: 9, width: 2.5, borderRadius: 2, bgcolor: "primary.contrastText" }} />}
                <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.label}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </>
  );
}

/* ================================================================== */
export default function PharmacySidebar({ collapsed = false, company, onNavigate, onLogout }) {
  const location = useLocation();
  const { visibleSections } = usePharmacyAccess();
  const activePath = pageFor(location.pathname).path;

  // the pharmacy sections as links this shell can open
  const sections = useMemo(
    () =>
      visibleSections.map((s) => ({
        section: s,
        links: s.routes.map((r) => ({ path: toShellPath(r.path), label: r.label })),
      })),
    [visibleSections]
  );
  // every staff member has their own profile and attendance
  const showProfile = true;

  // the section holding the page on show is open; others open and close by hand
  const [open, setOpen] = useState(() => new Set());
  useEffect(() => {
    const holder = sections.find((x) => x.links.length > 1 && x.links.some((l) => l.path === activePath));
    if (holder) setOpen((prev) => (prev.has(holder.section.key) ? prev : new Set(prev).add(holder.section.key)));
  }, [activePath, sections]);
  const toggle = (key) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const name = company?.company_name || "Pharmacy";
  // company_logo is a file name served from /Images (as on the admin profile), or a full URL
  const rawLogo = company?.company_logo || null;
  const logoUrl = rawLogo ? (/^(https?:|data:|\/)/i.test(rawLogo) ? rawLogo : `${process.env.REACT_APP_URL || ""}/Images/${rawLogo}`) : null;
  const [logoBroken, setLogoBroken] = useState(false);
  const logo = logoUrl && !logoBroken ? logoUrl : null;

  return (
    <Box
      component="nav"
      aria-label="Main menu"
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "primary.main",
        backgroundImage: (t) => `linear-gradient(180deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
        color: "primary.contrastText",
        overflow: "hidden",
      }}
    >
      {/* ---------- brand ---------- */}
      <Box
        sx={{
          height: 64,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: collapsed ? 0 : 2.25,
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: 1,
          borderColor: (t) => ink(t, 0.15),
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            bgcolor: "primary.contrastText",
            color: "primary.main",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          {logo ? <Box component="img" src={logo} alt="" onError={() => setLogoBroken(true)} sx={{ width: "100%", height: "100%", objectFit: "contain" }} /> : name.charAt(0).toUpperCase()}
        </Box>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.2 }} noWrap title={name}>
              {name}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: (t) => ink(t, 0.7), lineHeight: 1.3 }} noWrap>
              Pharmacy
            </Typography>
          </Box>
        )}
      </Box>

      {/* ---------- links ---------- */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          px: collapsed ? 1.25 : 1.5,
          pb: 1.5,
          scrollbarWidth: "thin",
          scrollbarColor: (t) => `${ink(t, 0.3)} transparent`,
          "& > * + *": { mt: 0.25 },
        }}
      >
        <GroupHead collapsed={collapsed} first>
          PHARMACY
        </GroupHead>
        <NavItem to={`${SHELL_BASE}/dashboard`} label="Dashboard" icon={DashboardIcon} active={activePath === `${SHELL_BASE}/dashboard`} collapsed={collapsed} onNavigate={onNavigate} />
        {sections.map(({ section, links }) =>
          links.length === 1 ? (
            <NavItem key={section.key} to={links[0].path} label={section.label} icon={sectionIcon(section.key)} active={links[0].path === activePath} collapsed={collapsed} onNavigate={onNavigate} />
          ) : (
            <NavSection
              key={section.key}
              section={section}
              links={links}
              activePath={activePath}
              open={open.has(section.key)}
              onToggle={() => toggle(section.key)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          )
        )}

        {showProfile && (
          <>
            <GroupHead collapsed={collapsed}>PROFILE</GroupHead>
            {PROFILE_LINKS.map((l) => (
              <NavItem key={l.key} to={l.path} label={l.label} icon={l.icon} active={activePath === l.path} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </Box>

      {/* ---------- log out ---------- */}
      <Box sx={{ flexShrink: 0, p: collapsed ? 1.25 : 1.5, borderTop: 1, borderColor: (t) => ink(t, 0.15) }}>
        {collapsed ? (
          <Tooltip title="Log out" placement="right" arrow>
            <Box component="button" type="button" aria-label="Log out" onClick={onLogout} sx={{ ...itemSx({ collapsed }) }}>
              <LogoutOutlinedIcon className="nav-icon" />
            </Box>
          </Tooltip>
        ) : (
          <Box component="button" type="button" onClick={onLogout} sx={{ ...itemSx({ collapsed }) }}>
            <LogoutOutlinedIcon className="nav-icon" />
            Log out
          </Box>
        )}
      </Box>
    </Box>
  );
}
