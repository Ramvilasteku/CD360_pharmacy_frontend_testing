import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
} from "@mui/material";
import { NavLink } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import React, { useState, useEffect } from "react";
import api from "./services/api";
import { useSelector } from "react-redux";

import PersonIcon from "@mui/icons-material/Person";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventIcon from "@mui/icons-material/Event";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentIcon from "@mui/icons-material/Assignment";
import LogoutIcon from "@mui/icons-material/Logout";
import DescriptionIcon from "@mui/icons-material/Description";
import MedicationIcon from "@mui/icons-material/Medication";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";

import DoctorProfileModal from "./DoctorProfileModal";
import PharmacySidebarBlock from "../pharmacy/PharmacySidebarBlock";

export const drawerWidth = 240;
export const drawerWidthClosed = 70;

export default function Sidebar({ isOpen, onToggle, company }) {
  const staffRole = localStorage.getItem("role");
  const staffName = localStorage.getItem("userName");
  const [openProfile, setOpenProfile] = useState(false);
  const [staff, setStaff] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  const reduxModules = useSelector((s) => s.auth?.modules);
  const reduxFeatures = useSelector((s) => s.auth?.features);

  /* ═══════════════════════════════════════════════════════════
     ALLOWED MODULES / FEATURES — defined BEFORE hasAccess uses them
  ═══════════════════════════════════════════════════════════ */
  const allowedModules = reduxModules?.length
    ? reduxModules
    : JSON.parse(localStorage.getItem("modules") || "[]");

  const allowedFeatures = reduxFeatures?.length
    ? reduxFeatures
    : JSON.parse(localStorage.getItem("features") || "[]");

  /* Module→children map used by hasAccess */
  const moduleAccessMap = {
    appointments: ["appointments", "reviews", "add_slots"],
    attendance: ["attendance", "leave_requests"],
    prescriptions: [
      "medicine",
      "medical_tests",
      "consultation_types",
      "prescriptions",
    ],
    documents: ["documents"],
    bills: ["bills"],
    notifications: ["notifications"],
    clients: ["clients"],
    employees: ["employees"],
  };

  const hasAccess = (itemKey) => {
    return allowedModules.some((module) => {
      const children = moduleAccessMap[module];
      if (children) return children.includes(itemKey);
      return module === itemKey;
    });
  };

  const hasFeatureAccess = (featureKey) =>
    allowedFeatures.includes(featureKey);

 const handleLogout = async () => {
  try {
    await fetch(process.env.REACT_APP_LOGOUT, {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("Logout failed", err);
  } finally {
    // ⭐ Always clear localStorage BEFORE redirect, no matter what
    localStorage.clear();
    // ⭐ Also reset Redux (optional but safer)
    // dispatch(logoutAction());
    window.location.replace("/");  // full page reload → fresh Redux
  }
};

  /* ═══════════════════════════════════════════════════════════
     MASTER MENU (Pharmacy is NOT in this array — it's rendered
     separately via <PharmacySidebarBlock />)
  ═══════════════════════════════════════════════════════════ */
  const menuItems = [
    {
      text: "Dashboard",
      module_key: "dashboard",
      icon: <DashboardIcon />,
      path: "/doctor/dashboard",
    },
    {
      text: "Appointment",
      module_key: "appointments",
      icon: <EventIcon />,
      path: "/doctor/dashboard/appointments",
    },
    {
      text: "Attendance",
      module_key: "attendance",
      icon: <AccessTimeIcon />,
      path: "/doctor/dashboard/attendance",
    },
    {
      text: "Appointment Review",
      module_key: "reviews",
      icon: <AssignmentIcon />,
      path: "/doctor/dashboard/task-review",
    },
    {
      text: "Documents",
      module_key: "documents",
      icon: <DescriptionIcon />,
      path: "/doctor/dashboard/documents",
    },
    {
      text: "Add Prescription",
      module_key: "prescriptions",
      icon: <MedicationIcon />,
      path: "/doctor/dashboard/prescription",
    },
    {
      text: "IPD Doctor Visits",
      module_key: "ipd",
      icon: <PersonIcon />,
      path: "/doctor/dashboard/doctorvisits",
    },
    {
      text: "Logout",
      module_key: "logout",
      icon: <LogoutIcon />,
      onClick: () => handleLogout(),
    },
  ];

  const defaultModules = ["dashboard", "profile", "logout"];

  const filteredMenu = menuItems
    .filter(
      (item) =>
        defaultModules.includes(item.module_key) ||
        hasAccess(item.module_key)
    )
    .map((item) => {
      if (!item.children) return item;

      const visibleChildren = item.children.filter((child) => {
        if (!child.feature_key) return true;
        return hasFeatureAccess(child.feature_key);
      });

      if (visibleChildren.length === 0) return null;
      return { ...item, children: visibleChildren };
    })
    .filter(Boolean);

  /* Split menu into two groups so Pharmacy sits ABOVE Logout */
  const menuBeforePharmacy = filteredMenu.filter(
    (item) => item.text !== "Logout"
  );
  const logoutItem = filteredMenu.find((item) => item.text === "Logout");

  /* Fetch staff profile */
  const fetchStaff = async () => {
    try {
      const res = await api.get("/api/staff/self");
      setStaff(res.data.data);
    } catch (err) {
      console.error("Failed to load staff profile", err);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleProfileClose = () => {
    setOpenProfile(false);
    fetchStaff();
  };

  /* ═══════════════════════════════════════════════════════════
     Render helper — one menu item (link OR dropdown)
  ═══════════════════════════════════════════════════════════ */
  const renderMenuItem = (item) => {
    const isLogout = item.text === "Logout";

    if (item.children) {
      return (
        <Box key={item.text}>
          <ListItem
            onClick={() =>
              setOpenDropdown(openDropdown === item.text ? null : item.text)
            }
            sx={{
              cursor: "pointer",
              borderRadius: 2,
              color: "white",
              px: isOpen ? 2 : 1,
              minHeight: "44px",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.15)" },
            }}
          >
            <ListItemIcon
              sx={{ color: "white", minWidth: isOpen ? 36 : "auto" }}
            >
              {item.icon}
            </ListItemIcon>
            {isOpen && (
              <>
                <ListItemText primary={item.text} />
                <Typography fontSize="12px">
                  {openDropdown === item.text ? "▲" : "▼"}
                </Typography>
              </>
            )}
          </ListItem>

          {openDropdown === item.text &&
            item.children.map((child) => (
              <ListItem
                key={child.text}
                component={NavLink}
                to={child.path}
                sx={{
                  pl: 5,
                  py: 0.5,
                  color: "white",
                  borderRadius: 2,
                  "&.active": { backgroundColor: "rgba(255,255,255,0.2)" },
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 24, color: "white" }}>
                  {child.icon}
                </ListItemIcon>
                <ListItemText
                  primary={child.text}
                  sx={{ "& .MuiTypography-root": { fontSize: "13px" } }}
                />
              </ListItem>
            ))}
        </Box>
      );
    }

    return (
      <ListItem
        key={item.text}
        component={isLogout ? "div" : NavLink}
        to={!isLogout ? item.path : undefined}
        end={!isLogout && item.path === "/doctor/dashboard"}
        onClick={isLogout ? item.onClick : undefined}
        sx={{
          cursor: "pointer",
          borderRadius: 2,
          color: "white",
          textDecoration: "none",
          justifyContent: isOpen ? "flex-start" : "center",
          px: isOpen ? 2 : 1,
          py: 0.5,
          minHeight: "44px",
          transition: "all 0.2s",
          "&.active": !isLogout
            ? {
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              }
            : {},
          "&.active .MuiListItemIcon-root": {
            color: "white",
            transform: "scale(1.1)",
          },
          "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.15)" },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: isOpen ? 36 : "auto",
            justifyContent: "center",
            color: "white",
            transition: "all 0.2s",
          }}
        >
          {item.icon}
        </ListItemIcon>
        {isOpen && (
          <ListItemText
            primary={item.text}
            sx={{
              "& .MuiTypography-root": { fontSize: "14px", fontWeight: 500 },
            }}
          />
        )}
      </ListItem>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        flexShrink: 0,
        width: isOpen ? drawerWidth : drawerWidthClosed,
        "& .MuiDrawer-paper": {
          width: isOpen ? drawerWidth : drawerWidthClosed,
          boxSizing: "border-box",
          background: "#F8F6F6",
          transition: "width 0.3s ease-in-out",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          border: "none",
        },
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          backgroundColor: "#F8F6F6",
          p: isOpen ? 4 : 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: isOpen ? "flex-start" : "center",
          gap: 1.5,
          transition: "all 0.3s",
          cursor: { xs: "pointer", md: "default" },
        }}
        onClick={() => {
          if (window.innerWidth < 900) onToggle();
        }}
      >
        <Box
          sx={{
            width: isOpen ? 60 : 48,
            height: isOpen ? 60 : 48,
            flexShrink: 0,
            transition: "all 0.3s ease",
          }}
        >
          <Box
            component="img"
            src={
              company?.company_logo
                ? `${process.env.REACT_APP_SITE_URL}/Images/${company.company_logo}`
                : "/RVlogo.png"
            }
            alt="Company Logo"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/RVlogo.png";
            }}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              border: "0px solid black",
            }}
          />
        </Box>
      </Box>

      {/* Blue Section */}
      <Box
        sx={{
          flex: 1,
          background: "linear-gradient(180deg, #2C5E6A 0%,#80BECD 100%)",
          borderTopRightRadius: { md: 80, xs: 40 },
          pt: { xs: 2, sm: 0 },
          overflowY: "auto",
          overflowX: "hidden",
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(255,255,255,0.3)",
            borderRadius: "4px",
          },
        }}
      >
        {/* Profile */}
        <Box
          sx={{
            py: 2,
            px: isOpen ? 3 : 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <Avatar
            src={
              staff?.profile_photo
                ? `${process.env.REACT_APP_SITE_URL}/Images/${staff.profile_photo}`
                : ""
            }
            onClick={() => setOpenProfile(true)}
            sx={{
              width: isOpen ? 70 : 40,
              height: isOpen ? 70 : 40,
              mx: "auto",
              mb: 1,
              cursor: "pointer",
              transition: "all 0.3s",
              border: "3px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            {!staff?.profile_photo && staffName?.charAt(0)}
          </Avatar>

          <Typography
            fontWeight="bold"
            sx={{
              color: "white",
              fontSize: { md: "14px", xs: "10px" },
              textAlign: "center",
            }}
          >
            {staffName}
          </Typography>
        </Box>

        {/* Divider */}
        <Box
          sx={{
            height: "1px",
            backgroundColor: "rgba(236, 239, 240, 0.4)",
            mx: 2,
            my: 1.5,
          }}
        />

        {/* ═════ MENU ═════ */}
        <List sx={{ px: 2 }}>
          {/* 1. Everything except Logout */}
          {menuBeforePharmacy.map((item) => renderMenuItem(item))}

          {/* 2. Shared pharmacy block */}
          <PharmacySidebarBlock rolePrefix="/doctor/dashboard" />

          {/* 3. Logout — always last */}
          {logoutItem && renderMenuItem(logoutItem)}
        </List>

        <DoctorProfileModal
          open={openProfile}
          onClose={handleProfileClose}
        />
      </Box>
    </Drawer>
  );
}