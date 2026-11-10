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
import RateReviewIcon from "@mui/icons-material/RateReview";
import { useSelector } from "react-redux";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import KingBedIcon from "@mui/icons-material/KingBed";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";

import DoctorProfileModal from "./ReceptionistProfileModal";
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

  const allowedModules = reduxModules?.length
    ? reduxModules
    : JSON.parse(localStorage.getItem("modules") || "[]");

  const allowedFeatures = reduxFeatures?.length
    ? reduxFeatures
    : JSON.parse(localStorage.getItem("features") || "[]");

  const hasModuleAccess = (moduleKey) => allowedModules.includes(moduleKey);
  const hasFeatureAccess = (featureKey) => allowedFeatures.includes(featureKey);

  /* ═══════════════════════════════════════════════════════════
     MASTER MENU (WITH module_key)
     Pharmacy is rendered separately via <PharmacySidebarBlock />
  ═══════════════════════════════════════════════════════════ */
  const menuItems = [
    {
      text: "Dashboard",
      module_key: "dashboard",
      icon: <DashboardIcon />,
      path: "/receptionist/dashboard",
    },
    {
      text: "Appointment",
      module_key: "appointments",
      icon: <EventAvailableIcon />,
      path: "/receptionist/dashboard/appointments",
    },
    {
      text: "Doctor Schedule",
      module_key: "appointments",
      icon: <CalendarMonthIcon />,
      path: "/receptionist/dashboard/schedule",
    },
    {
      text: "Attendance",
      module_key: "attendance",
      icon: <AccessTimeIcon />,
      path: "/receptionist/dashboard/attendance",
    },
    {
      text: "Documents",
      module_key: "documents",
      icon: <DescriptionIcon />,
      path: "/receptionist/dashboard/documents",
    },
    {
      text: "Bills",
      module_key: "bills",
      icon: <ReceiptLongIcon />,
      path: "/receptionist/dashboard/bills",
    },
    {
      text: "Clients",
      module_key: "clients",
      icon: <PeopleAltIcon />,
      path: "/receptionist/dashboard/clients",
    },
    {
      text: "Add Slot",
      module_key: "appointments",
      icon: <AddCircleOutlineIcon />,
      path: "/receptionist/dashboard/add-slots",
    },
    {
      text: "QR & Forms",
      module_key: "qrform",
      icon: <QrCode2Icon />,
      children: [
        {
          text: "QR Code",
          path: "/receptionist/dashboard/qrgenerator",
          icon: <ChevronRightIcon sx={{ fontSize: 18 }} />,
        },
        {
          text: "Forms",
          path: "/receptionist/dashboard/forms",
          icon: <ChevronRightIcon sx={{ fontSize: 18 }} />,
        },
        {
          text: "Submitted Forms",
          path: "/receptionist/dashboard/form-submissions",
          icon: <ChevronRightIcon sx={{ fontSize: 18 }} />,
        },
      ],
    },
    {
      text: "Ipd",
      module_key: "ipd",
      icon: <KingBedIcon />,
      children: [
        {
          text: "Bed Creation",
          path: "/receptionist/dashboard/ipd/bed-creation",
          icon: <ChevronRightIcon sx={{ fontSize: 18 }} />,
        },
        {
          text: "IPD Admission",
          path: "/receptionist/dashboard/ipd/ipd-admission",
          icon: <ChevronRightIcon sx={{ fontSize: 18 }} />,
        },
        {
          text: "Bed Allocation",
          path: "/receptionist/dashboard/ipd/bed-allocation",
          icon: <ChevronRightIcon sx={{ fontSize: 18 }} />,
        },
        {
          text: "IPD Bills",
          path: "/receptionist/dashboard/ipd/ipd-bills",
          icon: <ChevronRightIcon sx={{ fontSize: 18 }} />,
        },
        {
          text: "IPD Payments",
          path: "/receptionist/dashboard/ipd/ipd-payments",
          icon: <ChevronRightIcon sx={{ fontSize: 18 }} />,
        },
      ],
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
        hasModuleAccess(item.module_key)
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

  /* ═══════════════════════════════════════════════════════════
     Split menu into two groups so Pharmacy sits ABOVE Logout
  ═══════════════════════════════════════════════════════════ */
  const menuBeforePharmacy = filteredMenu.filter(
    (item) => item.text !== "Logout"
  );
  const logoutItem = filteredMenu.find((item) => item.text === "Logout");

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
     Render helper — one menu item (item OR dropdown)
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
          "&.active": !isLogout
            ? { backgroundColor: "rgba(255,255,255,0.25)" }
            : {},
          "&:hover": { backgroundColor: "rgba(255,255,255,0.15)" },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: isOpen ? 36 : "auto",
            justifyContent: "center",
            color: "white",
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
      {/* Company Logo */}
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
                ? `${process.env.REACT_APP_SITE_URL}/Images/${staff.profile_photo}?t=${Date.now()}`
                : undefined
            }
            onClick={() => setOpenProfile(true)}
            sx={{
              width: isOpen ? 70 : 40,
              height: isOpen ? 70 : 40,
              mx: "auto",
              mb: 1,
              cursor: "pointer",
              border: "3px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            {!staff?.profile_photo && staffName?.charAt(0)}
          </Avatar>

          <Typography
            fontWeight="bold"
            sx={{ color: "white", fontSize: { md: "14px", xs: "10px" } }}
          >
            {staffName}
          </Typography>
        </Box>

        {/* White divider after Profile */}
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
          {/* 1️⃣ Everything except Logout */}
          {menuBeforePharmacy.map((item) => renderMenuItem(item))}

          {/* 2️⃣ Shared pharmacy block */}
          <PharmacySidebarBlock rolePrefix="/receptionist/dashboard" />

          {/* 3️⃣ Logout — always at the bottom */}
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