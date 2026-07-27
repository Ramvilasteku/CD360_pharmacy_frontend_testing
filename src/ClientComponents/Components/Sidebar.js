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
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import { NavLink } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import StarBorderIcon from "@mui/icons-material/StarBorder";
// import ReceiptIcon from "@mui/icons-material/Receipt";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import DashboardIcon from "@mui/icons-material/Dashboard";
import EventIcon from "@mui/icons-material/Event";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentIcon from "@mui/icons-material/Assignment";
import LogoutIcon from "@mui/icons-material/Logout";
import ListAltIcon from "@mui/icons-material/ListAlt";
import DescriptionIcon from "@mui/icons-material/Description";
import PersonIcon from "@mui/icons-material/Person";
import MenuIcon from "@mui/icons-material/Menu";
import { useEffect, useState } from "react";
import { COLORS } from "../Themes";
import ClientProfileModal from "../ClientProfileModal";
import axios from "axios";
import Collapse from "@mui/material/Collapse";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import HistoryIcon from '@mui/icons-material/History';
import RestoreIcon from '@mui/icons-material/Restore';
import BedIcon from '@mui/icons-material/Bed';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';

export const drawerWidth = 240;
export const drawerWidthClosed = 70;


// const menuItems = [
//   { text: "Dashboard", icon: <DashboardIcon />, path: "dashboard" },
//   {
//     text: "Document Upload",
//     icon: <UploadFileIcon />,
//     path: "documents",
//   },
//   { text: "Appointment", icon: <EventIcon />, path: "appointment" },

//   { text: "Reviews", icon: <StarBorderIcon />, path: "reviews" },
//   { text: "Bills", icon: <ReceiptIcon />, path: "bills" },
//     { text: "Prescriptions", icon: <ReceiptIcon />, path: "prescriptions" },

// ];

// ✅ MASTER MENU WITH module_key


export default function Sidebar({ isOpen, onToggle }) {
  // const staffRole = localStorage.getItem("role");
  const UserName = localStorage.getItem("userName");
  // ✅ GET MODULES FROM STORAGE
  const [allowedModules, setAllowedModules] = useState([]);
  const [openIPD, setOpenIPD] = useState(false);

  const ipdSubMenu = [
    {
      text: "Application History",
      module_key: "ipd_history",
      icon: <BedIcon />,
      path: "ipdhistory",
    },
    {
      text: "IPD Bills",
      module_key: "ipd_bills",
      icon: <ReceiptIcon />,
      path: "ipdbills",
    },
    {
      text: "IPD Payments",
      module_key: "ipd_payments",
      icon: <CurrencyRupeeIcon />,
      path: "ipdpayments",
    },
  ];

  useEffect(() => {
    const storedModules = localStorage.getItem("modules");

    console.log("RAW:", storedModules); // 👈 ADD
    if (storedModules) {
      try {
        const parsed = JSON.parse(storedModules);
        console.log("PARSED:", parsed); // 👈 ADD
        setAllowedModules(parsed);
      } catch (err) {
        console.error("Invalid modules JSON", err);
        setAllowedModules([]);
      }
    }
  }, []);

  const handleConfirmLogout = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_URL}/logout`,
        {},
        { withCredentials: true }
      );

      setOpenAlert(true); // ✅ THIS WAS MISSING

      setTimeout(() => {
        localStorage.clear();
        window.location.href = "/";
      }, 100);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const moduleAccessMap = {
    appointments: ["appointments", "reviews"],
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
    ipd: ['ipd_history', 'ipd_bills']
  };

  const hasAccess = (itemKey) => {
    return allowedModules.some((module) => {
      const children = moduleAccessMap[module];

      // match direct module
      if (module === itemKey) return true;

      // match children
      if (children) {
        return children.includes(itemKey);
      }

      return false;
    });
  };


  const menuItems = [
    {
      text: "Dashboard",
      module_key: "dashboard",
      icon: <DashboardIcon />,
      path: "dashboard",
    },
    {
      text: "Document Upload",
      module_key: "documents",
      icon: <UploadFileIcon />,
      path: "documents",
    },
    {
      text: "Appointment",
      module_key: "appointments",
      icon: <EventIcon />,
      path: "appointment",
    },
    {
      text: "Reviews",
      module_key: "appointment_review", // ✅ FIXED
      icon: <StarBorderIcon />,
      path: "reviews",
    },
    {
      text: "Bills",
      module_key: "bills",
      icon: <ReceiptIcon />,
      path: "bills",
    },
    {
      text: "Prescriptions",
      module_key: "prescriptions",
      icon: <ReceiptIcon />,
      path: "prescriptions",
    },
    // {
    //    text: "Ipd History",
    //   module_key: "ipd_history",
    //   icon: <ReceiptIcon />,
    //   path: "ipdhistory",
    // },
    // {
    //    text: "Ipd Bills",
    //   module_key: "ipd_bills",
    //   icon: <ReceiptIcon />,
    //   path: "ipdbills",
    // }
    {
      text: "IPD",
      module_key: "ipd",
      icon: <LocalHospitalIcon />,
      children: [
        { text: "History", module_key: "ipd_history", icon: <HistoryIcon />, path: "ipdhistory" },
        { text: "Bills", module_key: "ipd_bills", icon: <HistoryIcon />, path: "ipdbills" },
        { text: "Payments", module_key: "ipd_payments", icon: <CurrencyRupeeIcon />, path: "ipdpayments" }
      ]
    }
  ];

  const defaultModules = ["dashboard", "profile"];

  moduleAccessMap.ipd = ["ipd_history", "ipd_bills", "ipd_payments"];

  const ipdVisible = ipdSubMenu.some((sub) => hasAccess(sub.module_key));
  const filteredMenu = menuItems.filter((item) => {
    if (item.module_key === "ipd") {
      return ipdVisible; // 👈 show only if DB has any IPD permission
    }

    return hasAccess(item.module_key);
  });

  const getAvatarLetters = (name = "") => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const [openProfile, setOpenProfile] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString();
  const formattedDate = currentTime.toLocaleDateString();

  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_URL}/api/company-info`,
          {
            withCredentials: true,
          }
        );

        if (res.data.success) {
          setCompanyLogo(res.data.data.company_logo);
          setCompanyName(res.data.data.company_name);
        }
      } catch (error) {
        console.error("Failed to fetch company info", error);
      }
    };

    fetchCompanyInfo();
  }, []);

  const [openAlert, setOpenAlert] = useState(false);


  return (
    <Drawer
      variant="permanent"
      sx={{
        bgcolor: "#f8f6f6",
        flexShrink: 0,
        width: isOpen ? drawerWidth : drawerWidthClosed,
        "& .MuiDrawer-paper": {
          width: isOpen ? drawerWidth : drawerWidthClosed,
          boxSizing: "border-box",
          // ✅ keep drawer white
          transition: "width 0.3s ease-in-out",
          display: "flex", // ✅ REQUIRED
          flexDirection: "column", // ✅ REQUIRED
          height: "100vh",
          border: "none",
          bgcolor: "#f8f6f6", // ✅ ADD THIS
        },
      }}
    >
      {/* Mobile-only divider */}
      <Box
        sx={{
          display: { xs: "block", md: "none" }, // ✅ mobile only
          height: "1px",
          bgcolor: "#f8f6f6",

          mx: 2,
          my: 1.5,
        }}
      />

      {/* Mobile-only Toggle Button */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" }, // ✅ mobile only
          justifyContent: "end",
          pb: 1,
          bgcolor: "#f8f6f6",
        }}
      >
        <IconButton
          onClick={onToggle}
          size="small"
          sx={{
            color: "black",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "50%",
            mx: 2.2,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.15)",
            },
          }}
        >
          {isOpen ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Box>

      {/* Logo Section */}
      <Box
        sx={{
          bgcolor: "#f8f6f6",
          p: isOpen ? 4 : 1,
          display: "flex",
          flexDirection: "column", // 🔹 column layout
          alignItems: "center",
          justifyContent: isOpen ? "flex-start" : "center",
          gap: 1.5,
          transition: "all 0.3s",
        }}
      >
        {companyLogo ? (
          <Box
            sx={{
              width: "100%",
              height: "80px",
              display: "flex",
              alignItems: "center",
              justifyContent: "start",
            }}
          >
            <Box
              component="img"
              src={`${process.env.REACT_APP_URL}/Images/${companyLogo}`}
              alt="Logo"
              sx={{
                width: 200,
                height: 100,
                objectFit: "contain",
                borderRadius: 4,
              }}
            />
          </Box>
        ) : (
          <Typography
            sx={{
              fontSize: { xs: "10px", md: "12px" },
              fontWeight: "bold",
              color: "primary.main",
              textAlign: "center",
            }}
          >
            {companyName}
          </Typography>
        )}
      </Box>

      {/* Blue Section */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(180deg, ${COLORS.primary} 0%, ${COLORS.softBg} 100%)`,
          borderTopRightRadius: { md: 80, xs: 40 },
          overflow: "hidden", // important
        }}
      >
        {/* Decorative divider */}
        {/* <Box
          sx={{
            height: "1px",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            mx: 2,
            my: 1,
          }}
        /> */}

        {/* Toggle Button */}

        {/* ================= PROFILE ================= */}
        <Box
          sx={{
            flexShrink: 0,
            py: { xs: 1, md: 4 },
            px: isOpen ? 3 : 0,
          }}
        >
          {/* Avatar */}
          <Avatar
            onClick={() => setOpenProfile(true)}
            sx={{
              width: isOpen ? 70 : 40,
              height: isOpen ? 70 : 40,
              mx: "auto",
              mb: 1,
              cursor: "pointer",
              transition: "all 0.3s ease",
              bgcolor: COLORS.activeBg,
              color: COLORS.primary,
              fontWeight: "bold",
              fontSize: isOpen ? "28px" : "14px",
              border: `3px solid ${COLORS.texWhite}`,
              "&:hover": {
                opacity: 0.9,
                transform: "scale(1.05)",
              },
            }}
          >
            {getAvatarLetters(UserName)}
          </Avatar>

          {/* Username */}
          <Typography
            fontWeight="bold"
            sx={{
              color: COLORS.texWhite,
              fontSize: { xs: "10px", md: "18px" },
              mb: { xs: "8px", md: "auto" },
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {UserName}
          </Typography>

          {/* Date & Time */}
          <Typography
            variant="body2"
            component="div"
            sx={{
              color: COLORS.texWhite,
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: "center",
              gap: { xs: 0.5, md: 1 },
            }}
          >
            <Box sx={{ fontSize: { xs: "10px", md: "16px" } }}>
              {formattedDate}
            </Box>

            {/* Responsive separator */}
            <Box
              sx={{
                backgroundColor: "rgba(255,255,255,0.6)",
                width: { xs: "100%", md: "1px" },
                height: { xs: "1px", md: "14px" },
              }}
            />

            <Box sx={{ fontSize: { xs: "10px", md: "15px" } }}>
              {formattedTime}
            </Box>
          </Typography>

          {/* Divider (NOT sticky) */}
          <Box
            sx={{
              height: "1px",
              backgroundColor: "rgba(255, 255, 255, 0.53)",
              mx: 1,
              my: 1,
              width: "100%",
              borderRadius: 2,
            }}
          />
        </Box>

        {/* White divider after Profile */}

        {/* Menu */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            px: 1,

            "&::-webkit-scrollbar": {
              width: "6px",
            },

            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },

            "&::-webkit-scrollbar-thumb": {
              background: "rgba(255,255,255,0.3)",
              borderRadius: "20px",
            },

            "&::-webkit-scrollbar-thumb:hover": {
              background: "rgba(255,255,255,0.5)",
            },
          }}
        >
          <List sx={{ px: 2 }}>
            {menuItems.map((item) => {
              // Parent Menu (IPD)
              if (item.children) {
                return (
                  <Box key={item.module_key}>
                    <ListItem
                      onClick={() => setOpenIPD(!openIPD)}
                      sx={{
                        color: "white",
                        borderRadius: 2,
                        cursor: "pointer",
                        justifyContent: isOpen ? "flex-start" : "center",
                        "&:hover": {
                          backgroundColor: "rgba(255,255,255,0.15)",
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: "white",
                          minWidth: isOpen ? 36 : "auto",
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>

                      {isOpen && <ListItemText primary={item.text} />}

                      {isOpen &&
                        (openIPD ? <ExpandLess /> : <ExpandMore />)}
                    </ListItem>

                    <Collapse in={openIPD} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.children.map((sub) => (
                          <ListItem
                            key={sub.module_key}
                            component={NavLink}
                            to={sub.path}
                            sx={{
                              pl: 4,
                              color: "white",
                              borderRadius: 2,
                              "&.active": {
                                backgroundColor:
                                  "rgba(255,255,255,0.2)",
                              },
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                color: "white",
                                minWidth: 32,
                              }}
                            >
                              {sub.icon}
                            </ListItemIcon>

                            <ListItemText primary={sub.text} />
                          </ListItem>
                        ))}
                      </List>
                    </Collapse>
                  </Box>
                );
              }

              // Normal Menu
              return (
                <ListItem
                  key={item.module_key}
                  component={NavLink}
                  to={item.path}
                  sx={{
                    mb: 0.5,
                    borderRadius: 2,
                    color: "white",
                    textDecoration: "none",
                    justifyContent: isOpen ? "flex-start" : "center",
                    px: isOpen ? 2 : 1,
                    py: 1,
                    minHeight: "44px",

                    "&.active": {
                      backgroundColor:
                        "rgba(255,255,255,0.25)",
                    },

                    "&:hover": {
                      backgroundColor:
                        "rgba(255,255,255,0.15)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: isOpen ? 36 : "auto",
                      color: "white",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>

                  {isOpen && (
                    <ListItemText primary={item.text} />
                  )}
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Logout */}
        <Box
          sx={{
            flexShrink: 0,
            p: 2,
            borderTop: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <ListItem
            onClick={handleConfirmLogout}
            sx={{
              color: "white",
              borderRadius: 2,
              cursor: "pointer",
              justifyContent: isOpen ? "flex-start" : "center",
              "&:hover": {
                backgroundColor: "rgba(255,0,0,0.25)",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: isOpen ? 36 : "auto",
                color: "white",
              }}
            >
              <LogoutIcon />
            </ListItemIcon>

            {isOpen && <ListItemText primary="Logout" />}
          </ListItem>
        </Box>
      </Box>

      <ClientProfileModal
        open={openProfile}
        onClose={() => setOpenProfile(false)}
      />
      <Snackbar
        open={openAlert}
        autoHideDuration={1500}
        onClose={() => setOpenAlert(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled">
          Thank you 👋 Logged out successfully
        </Alert>
      </Snackbar>
    </Drawer >
  );
}
