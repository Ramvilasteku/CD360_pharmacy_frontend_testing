import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MedicationIcon from "@mui/icons-material/Medication";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import InsertChartIcon from "@mui/icons-material/InsertChart";
import { usePharmacyAccess } from "../Routes/usePharmacyRoutes";

const SECTION_ICONS = {
  medicines: <MedicationIcon />,
  inventory: <Inventory2Icon />,
  procurement: <LocalShippingIcon />,
  sales: <PointOfSaleIcon />,

  sales_reports: <InsertChartIcon />,
};

/**
 * Shared pharmacy sidebar block — drop into any dashboard sidebar.
 *
 * <PharmacySidebarBlock rolePrefix="/doctor/dashboard" />
 * <PharmacySidebarBlock rolePrefix="/receptionist/dashboard" />
 * <PharmacySidebarBlock rolePrefix="/pharmacy" />
 */
export default function PharmacySidebarBlock({
  rolePrefix,
  textColor = "white",
}) {
  const { visibleSections, hasPharmacyModule } = usePharmacyAccess();
  const [pharmacyOpen, setPharmacyOpen] = useState(true);
  const [openSection, setOpenSection] = useState(null);

  if (!hasPharmacyModule) return null;

  const buildPath = (routePath) => {
    const clean = routePath.replace(/\/\*$/, "");
    if (rolePrefix === "/pharmacy") {
      return `/pharmacy/${clean.replace(/^pharmacy\/?/, "") || "dashboard"}`;
    }
    return `${rolePrefix}/${clean}`;
  };

  return (
    <>
      {/* Pharmacy parent */}
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => setPharmacyOpen(!pharmacyOpen)}
          sx={{
            color: textColor,
            "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
          }}
        >
          <ListItemIcon sx={{ color: textColor, minWidth: 36 }}>
            <LocalPharmacyIcon />
          </ListItemIcon>
          <ListItemText primary="Pharmacy" />
          {pharmacyOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
      </ListItem>

      <Collapse in={pharmacyOpen} timeout="auto" unmountOnExit>
        <List disablePadding>
          {/* Dashboard link */}
          <ListItem disablePadding>
            <ListItemButton
              component={NavLink}
              to={buildPath("pharmacy")}
              end
              sx={{
                pl: 4,
                color: textColor,
                "&.active": { backgroundColor: "rgba(255,255,255,0.2)" },
                "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
              }}
            >
              <ListItemIcon sx={{ color: textColor, minWidth: 32 }}>
                <DashboardIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Dashboard"
                primaryTypographyProps={{ fontSize: "13px" }}
              />
            </ListItemButton>
          </ListItem>

          {/* 4 feature sections */}
          {visibleSections.map((section) => (
            <SectionItem
              key={section.key}
              section={section}
              buildPath={buildPath}
              textColor={textColor}
              open={openSection === section.key}
              onToggle={() =>
                setOpenSection(openSection === section.key ? null : section.key)
              }
            />
          ))}
        </List>
      </Collapse>
    </>
  );
}

/* ─────────── Section (dropdown or single-link) ─────────── */
function SectionItem({ section, buildPath, textColor, open, onToggle }) {
  // Single-route section → direct link
  if (section.routes.length === 1) {
    const route = section.routes[0];
    return (
      <ListItem disablePadding>
        <ListItemButton
          component={NavLink}
          to={buildPath(route.path)}
          sx={{
            pl: 4,
            color: textColor,
            "&.active": { backgroundColor: "rgba(255,255,255,0.2)" },
            "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
          }}
        >
          <ListItemIcon sx={{ color: textColor, minWidth: 32 }}>
            {SECTION_ICONS[section.key]}
          </ListItemIcon>
          <ListItemText
            primary={section.label}
            primaryTypographyProps={{ fontSize: "13px" }}
          />
        </ListItemButton>
      </ListItem>
    );
  }

  // Multi-route section → nested dropdown
  return (
    <>
      <ListItem disablePadding>
        <ListItemButton
          onClick={onToggle}
          sx={{
            pl: 4,
            color: textColor,
            "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
          }}
        >
          <ListItemIcon sx={{ color: textColor, minWidth: 32 }}>
            {SECTION_ICONS[section.key]}
          </ListItemIcon>
          <ListItemText
            primary={section.label}
            primaryTypographyProps={{ fontSize: "13px" }}
          />
          {open ? (
            <ExpandLess fontSize="small" />
          ) : (
            <ExpandMore fontSize="small" />
          )}
        </ListItemButton>
      </ListItem>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {section.routes.map((route) => (
            <ListItem key={route.path} disablePadding>
              <ListItemButton
                component={NavLink}
                to={buildPath(route.path)}
                sx={{
                  pl: 7,
                  color: textColor,
                  "&.active": { backgroundColor: "rgba(255,255,255,0.2)" },
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 24, color: textColor }}>
                  <ChevronRightIcon sx={{ fontSize: 16 }} />
                </ListItemIcon>
                <ListItemText
                  primary={route.label}
                  primaryTypographyProps={{ fontSize: "12px" }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Collapse>
    </>
  );
}
