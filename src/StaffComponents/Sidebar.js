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
import { useEffect } from "react";
import api from "./services/api";
import PersonIcon from "@mui/icons-material/Person";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventIcon from "@mui/icons-material/Event";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentIcon from "@mui/icons-material/Assignment";
import LogoutIcon from "@mui/icons-material/Logout";
import DescriptionIcon from "@mui/icons-material/Description";
import DoctorProfileModal from "./DoctorProfileModal";
import MedicationIcon from "@mui/icons-material/Medication";
import React, { useState } from "react";
import AddPrescription from "./AddPrescription";
import CreatePrescription from "./CreatePrescription";
export const drawerWidth = 240;
export const drawerWidthClosed = 70;


export default function Sidebar({ isOpen, onToggle, company }) {
  const staffRole = localStorage.getItem('role');
  const staffName = localStorage.getItem('userName');
  const [openProfile, setOpenProfile] = useState(false);
  const [staff, setStaff] = useState(null);
  
  const moduleAccessMap = {
  appointments: ["appointments", "reviews","add_slots"],
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

    // if module has child mapping
    if (children) {
      return children.includes(itemKey);
    }

    // fallback direct match
    return module === itemKey;
  });
};
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
          text: " IPD Doctor Visits",
          module_key: "ipd",
          icon: <PersonIcon />,
          path: "doctorvisits",
        },
        {
          text: "Logout",
          module_key: "logout",
          icon: <LogoutIcon />,
          onClick: () => handleLogout(),
        },
      ];

  const storedModules = localStorage.getItem("modules");
  const allowedModules = storedModules ? JSON.parse(storedModules) : [];

  const defaultModules = ["dashboard", "profile", "logout"];

  const filteredMenu = menuItems.filter(
  (item) =>
    defaultModules.includes(item.module_key) || hasAccess(item.module_key)
  );

  const handleLogout = async () => {
    try {
      await fetch(process.env.REACT_APP_LOGOUT, {
        method: "POST",
        credentials: "include", // 🔴 REQUIRED
      });
      localStorage.clear(); // optional (admin_id, role, etc.)
      window.location.replace("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // ✅ Fetch staff profile
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

  // ✅ Handle profile modal close + refresh
  const handleProfileClose = () => {
    setOpenProfile(false);
    fetchStaff(); // Refresh profile data after modal closes
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
          border: "none"
        },
      }}
    >
      {/* Mobile-only divider */}
      {/* <Box
        sx={{
          display: { xs: "block", md: "none" },
          height: "1px",
          backgroundColor: "rgba(255,255,255,0.4)",
          mx: 2,
          my: 1.5,
        }}
      /> */}

      {/* Mobile-only Toggle Button */}
      {/* <Box
        sx={{
          display: { xs: "flex", md: "none" },
          justifyContent: "end",
          pb: 1,
        }}
      >
        <IconButton
          onClick={onToggle}
          size="small"
          sx={{
            color: "black",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "50%",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.15)",
            },
          }}
        >
          {isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box> */}

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
          cursor: { xs: "pointer", md: "default" }, // clickable only on mobile
        }}
        onClick={() => {
          // Toggle sidebar only on mobile (xs view)
          if (window.innerWidth < 900) {
            onToggle();
          }
        }}
      >
        {/* Company Logo */}
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

        {/* Company Name */}
        {/* {isOpen && (
    <Typography ...>{company?.company_name || "HEALTHCARE"}</Typography>
  )} */}
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
          "&::-webkit-scrollbar": {
            width: "6px",
          },
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


          <Typography fontWeight="bold" sx={{ color: "white", fontSize: { md: "14px", xs: "10px" }, textAlign: "center" }}>
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

        {/* Menu */}
        <List sx={{ px: 2 }}>
          {filteredMenu.map((item) => {
            const isLogout = item.text === "Logout";

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

                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                  },
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
                      "& .MuiTypography-root": {
                        fontSize: "14px",
                        fontWeight: 500,
                      },
                    }}
                  />
                )}
              </ListItem>
            );
          })}
        </List>

        <DoctorProfileModal
          open={openProfile}
          onClose={handleProfileClose}
        />
      </Box>
    </Drawer>
  );
}