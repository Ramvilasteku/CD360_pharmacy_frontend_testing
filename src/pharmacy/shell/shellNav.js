// src/pharmacy/shell/shellNav.js
//
// The menu model for the pharmacy staff shell (/pharmacy/*): which links exist, their icons,
// their URLs, the page title for a URL, and where each role lands after a role switch.
//
// The pharmacy links come from the same registry as before — Routes/pharmacyRoutes.jsx,
// filtered by Routes/usePharmacyRoutes.js — so adding a pharmacy screen there still puts it
// in this sidebar with no edit here. Only the "Profile" category is defined in this file.
//
// Works for any role that has the pharmacy module (pharmacist, chemist, cashier, a custom
// role…): nothing below names a role except roleHome(), which mirrors the login redirect in
// components/Otpverification.js so a role switch lands exactly where a fresh login would.

import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import MedicationOutlinedIcon from "@mui/icons-material/MedicationOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PointOfSaleOutlinedIcon from "@mui/icons-material/PointOfSaleOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";

import { pharmacyRoutes, pharmacySections } from "../../Routes/pharmacyRoutes";

/** Where this shell is mounted (App.js). */
export const SHELL_BASE = "/pharmacy";

/** One icon per pharmacy section (pharmacyRoutes.jsx section keys). Unknown keys get a folder. */
const SECTION_ICONS = {
  medicines: MedicationOutlinedIcon,
  inventory: Inventory2OutlinedIcon,
  procurement: LocalShippingOutlinedIcon,
  sales: PointOfSaleOutlinedIcon,
};
export const sectionIcon = (key) => SECTION_ICONS[key] || FolderOutlinedIcon;
export const DashboardIcon = DashboardOutlinedIcon;

/** "pharmacy/sales/*" → "/pharmacy/sales", "pharmacy" → "/pharmacy/dashboard" */
export const toShellPath = (registryPath) => {
  const clean = String(registryPath || "")
    .replace(/\/\*$/, "")
    .replace(/^pharmacy\/?/, "");
  return `${SHELL_BASE}/${clean || "dashboard"}`;
};

/** The Profile category: the staff member's own pages. */
export const PROFILE_LINKS = [
  { key: "profile", path: `${SHELL_BASE}/profile`, label: "My profile", icon: PersonOutlineOutlinedIcon },
  { key: "attendance", path: `${SHELL_BASE}/attendance`, label: "Attendance", icon: EventAvailableOutlinedIcon },
];

/* ------------------------------------------------------------------ */
/* Page titles                                                          */
/* ------------------------------------------------------------------ */
// Every URL this shell knows → { title, section }. Built once from the registry.
const TITLES = (() => {
  const out = [{ path: `${SHELL_BASE}/dashboard`, title: "Dashboard", section: "Pharmacy" }];
  for (const s of pharmacySections) {
    for (const r of s.routes) out.push({ path: toShellPath(r.path), title: r.label, section: s.label });
  }
  for (const r of pharmacyRoutes) {
    const p = toShellPath(r.path);
    if (!out.some((t) => t.path === p)) out.push({ path: p, title: r.label, section: "Pharmacy" });
  }
  for (const l of PROFILE_LINKS) out.push({ path: l.path, title: l.label, section: "Profile" });
  // longest first, so /pharmacy/stock/low wins over /pharmacy/stock
  return out.sort((a, b) => b.path.length - a.path.length);
})();

/** The title for the page on show: the longest registered path the URL starts with. */
export function pageFor(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || SHELL_BASE;
  return TITLES.find((t) => p === t.path || p.startsWith(`${t.path}/`)) || { title: "Pharmacy", section: null };
}

/* ------------------------------------------------------------------ */
/* Roles                                                                */
/* ------------------------------------------------------------------ */
const titleCase = (s) =>
  String(s || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

/** The login can carry roles as objects ({ role_key, role_name, is_primary }) or bare keys. */
export const normaliseRoles = (roles) =>
  (Array.isArray(roles) ? roles : [])
    .map((r) =>
      typeof r === "string"
        ? { role_key: r, role_name: titleCase(r), is_primary: false }
        : { ...r, role_key: r.role_key || r.key || r.role, role_name: r.role_name || r.name || titleCase(r.role_key || r.key || r.role) }
    )
    .filter((r) => r.role_key);

export const roleLabel = (key, roles) => normaliseRoles(roles).find((r) => r.role_key === key)?.role_name || titleCase(key);

const hasPharmacy = (modules) =>
  (Array.isArray(modules) ? modules : []).some((m) =>
    typeof m === "string" ? m === "pharmacy" : [m?.module_key, m?.moduleKey, m?.key, m?.name].includes("pharmacy")
  );

/** Where a role lands — the same rules as the login redirect (Otpverification.js). */
export function roleHome(role, modules) {
  if (role === "admin") return "/AdminDashboard";
  if (role === "doctor") return "/doctor/dashboard";
  if (role === "receptionist") return "/receptionist/dashboard";
  if (role === "client") return "/client";
  if (hasPharmacy(modules)) return `${SHELL_BASE}/dashboard`;
  return "/AdminDashboard";
}
