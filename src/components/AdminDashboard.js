import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { styled, useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import Employees from "./Employees";
import Clients from "./Clients";
import AdminProfile from "./AdminProfile";
import Appointments from "./Appointments";
import StaffAttendance from "./StaffAttendance";
import LeaveRequest from "./LeaveRequest";
import AdminReviews from "./AdminReviews";
import AdminBills from "./AdminBills";
import SendNotification from "./UpdatedNotifications";
import PaymentsTable from "./Payments";
import Passwordrepository from "./Passwordrepository";
import ContactEmergencyIcon from "@mui/icons-material/ContactEmergency";
import LockPersonIcon from "@mui/icons-material/LockPerson";
import logo from "../images/RVlogo.png";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import HomeIcon from "@mui/icons-material/Home";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ReviewsIcon from "@mui/icons-material/Reviews";
import ReceiptIcon from "@mui/icons-material/Receipt";
import StarIcon from "@mui/icons-material/Star";
import ArticleIcon from "@mui/icons-material/Article";
import ContactsIcon from "@mui/icons-material/Contacts";
import ContactSupportIcon from "@mui/icons-material/ContactSupport";
import GroupsIcon from "@mui/icons-material/Groups";
import MedicationIcon from "@mui/icons-material/Medication";
import AddMedicine from "./AddMedicine";
import BiotechIcon from "@mui/icons-material/Biotech";
import AddMedicalTests from "./AddMedicalTests";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import {
  Avatar,
  FormControl,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import BadgeIcon from "@mui/icons-material/Badge";
import DisplaySettingsIcon from "@mui/icons-material/DisplaySettings";
import PaymentIcon from "@mui/icons-material/Payment";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import ServiceRequest from "./ServiceRequest";
import Dashboard from "./Dashboard";
import ClientsCards from "./ClientsCards";
import NotificationListener from "../NotificationListener";
import NotificationBell from "../NotificationBell";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import ConsultationTypes from "./Consultationtypes";
import RoleModuleManager from "./RoleModuleManager";

import Collapse from "@mui/material/Collapse";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

// IPD imports

import IPDAdmissions from "./IPD/IPDAdmissions";
import WardType from "./IPD/WardType";
import Rooms from "./IPD/Rooms";
import Beds from "./IPD/Beds";
import IPDAnalytics from "./IPD/IPDAnalytics/IPDAnalytics";

import { IPDFilterContext } from "../components/IPD/IPDAnalytics/IPDFilterContext";

// IPD icons

import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import HotelIcon from "@mui/icons-material/Hotel";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import KingBedIcon from "@mui/icons-material/KingBed";
import DownloadIcon from "@mui/icons-material/Download";
import IPDReportDownload from "./IPD/IPDAnalytics/IPDReportDownload";

const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

export default function AdminDashboard() {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState("Home"); // State to manage the displayed content
  const [apiResponse, setApiResponse] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  const profileopen = Boolean(anchorEl);
  // const allowedModules = JSON.parse(localStorage.getItem("modules") || "[]");

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await fetch(process.env.REACT_APP_LOGOUT, {
        method: "POST",
        credentials: "include", // 🔴 REQUIRED
      });
      localStorage.clear(); // optional (admin_id, role, etc.)
      navigate("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.content) {
      setContent(location.state.content);
    }
  }, [location.state]);
  useEffect(() => {
    fetch(process.env.REACT_APP_DOCUMENTS_ADMINFETCH, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setApiResponse(data));
  }, []);

  const companyfetch = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_URL}/api/admin/get/${localStorage.getItem("adminId")}`,
        {
          method: "GET",
          credentials: "include",
        },
      );
      const data = await response.json();
      localStorage.setItem("companyName", data.data.company_name);
      localStorage.setItem("companyLogo", data.data.company_logo);
    } catch (error) {
      console.error("Error fetching company name:", error);
    }
  };

  useEffect(() => {
    companyfetch();
    fetchBranches();
  }, []);

  const companyName = localStorage.getItem("companyName");
  const companyLogo = localStorage.getItem("companyLogo");

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 550,
    bgcolor: "background.paper",
    boxShadow: 24,
    p: 4,
    maxHeight: "500px",
    overflowY: "auto",
  };

  const ProfileName = localStorage.getItem("adminName");
  const drawerWidth = 250;

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
  // safer parsing
  const storedModules = localStorage.getItem("modules");
  const allowedModules = storedModules ? JSON.parse(storedModules) : [];

  // Sidebar Menu Configuration
  const menuItems = [
    { text: "Home", module_key: "home", icon: <HomeIcon /> },

    { text: "Employees", module_key: "employees", icon: <BadgeIcon /> },

    // { text: "Clients", module_key: "clients", icon: <GroupsIcon /> },

    // { text: "Documents", module_key: "documents", icon: <ArticleIcon /> },

    { text: "Profile", module_key: "profile", icon: <ContactEmergencyIcon /> },

    {
      text: "Appointments",
      module_key: "appointments",
      icon: <CalendarMonthIcon />,
    },

    {
      text: "Attendance",
      module_key: "attendance",
      icon: <PendingActionsIcon />,
    },

    {
      text: "Leave Requests",
      module_key: "leave_requests",
      icon: <DirectionsRunIcon />,
    },

    { text: "Reviews", module_key: "reviews", icon: <ReviewsIcon /> },

    { text: "Bills", module_key: "bills", icon: <ReceiptIcon /> },

    { text: "Payments", module_key: "payments", icon: <PaymentIcon /> },

    {
      text: "Add Medicine",
      module_key: "medicine",
      icon: <MedicationIcon sx={{ color: "white" }} />,
    },

    {
      text: "Add Medical Tests",
      module_key: "medical_tests",
      icon: <BiotechIcon />,
    },

    {
      text: "Add Consultation Types",
      module_key: "consultation_types",
      icon: <MedicalServicesIcon />,
    },
    {
      text: "Role-Based Permissions",
      module_key: "role_module_manager",
      icon: <LockPersonIcon />,
    },
    {
      text: "Notifications",
      module_key: "notifications",
      icon: <ContactSupportIcon />,
    },
  ];

  // filter menu based on permissions
  const filteredMenu = menuItems.filter(
    (item) => item.module_key === "home" || hasAccess(item.module_key),
  );

  // ipd required code

  const [openIPD, setOpenIPD] = useState(false);

  const ipdMenus = [
    {
      text: "IPD Home",
      icon: <DashboardIcon fontSize="small" />,
    },
    {
      text: "IPD Admissions",
      icon: <AssignmentIndIcon fontSize="small" />,
    },
    {
      text: "Ward Type",
      icon: <HotelIcon fontSize="small" />,
    },
    {
      text: "Rooms",
      icon: <MeetingRoomIcon fontSize="small" />,
    },
    {
      text: "Beds",
      icon: <KingBedIcon fontSize="small" />,
    },
  ];
  // ipd report download And ipd filters

  const [openDownloadModal, setOpenDownloadModal] = useState(false);

  const handleOpenDownloadModal = () => {
    setOpenDownloadModal(true);
  };

  const handleCloseDownloadModal = () => {
    setOpenDownloadModal(false);
  };

  const [branchFilter, setBranchFilter] = useState("all");
  const [branches, setBranches] = useState([]);

  const [filters, setFilters] = useState({
    filter_type: "currentmonth",
    branch_name: "all",
    start_date: "",
    end_date: "",
  });
  const [analytics, setAnalytics] = useState({});
  const fetchBranches = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_URL_IPD}/api/get/ipdadmission`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      if (response.ok) {
        const uniqueBranches = [
          ...new Set(
            data.data
              .filter((item) => item.branch_name)
              .map((item) => {
                // 1. Clean the string and make it lowercase first
                const cleanName = item.branch_name.trim().toLowerCase();

                // 2. Split by spaces, capitalize the first letter of each word, and join back
                return cleanName
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
              }),
          ),
        ];

        setBranches(uniqueBranches);
      }
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    fetchBranches();
  }, []);

  return (
    <>
      <IPDFilterContext.Provider
        value={{
          filters,
          setFilters,
          branches,
          setBranches,
          analytics,
          setAnalytics,
        }}
      >
        {/*  ADMIN SOCKET NOTIFICATIONS */}
        <NotificationListener />
        <Box sx={{ display: "flex", backgroundColor: "#f7f5f5" }}>
          <AppBar
            position="fixed"
            elevation={0}
            sx={{
              backgroundColor: "transparent",
              boxShadow: "none",
              ml: `${drawerWidth}px`,
              mt: 0,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              px: 3,
            }}
          >
            {/* LEFT BOX – IMAGE / LOGO */}
            <Box
              sx={{
                width: "17%",
                height: "100px",
                display: "flex",
                alignItems: "center",
                justifyContent: "start",
              }}
            >
              <Box
                component="img"
                src={`${process.env.REACT_APP_URL}/Images/${companyLogo}`} // 🔁 replace with your image
                alt="Logo"
                sx={{
                  width: 200,
                  height: 100,
                  objectFit: "contain",
                  borderRadius: 4,
                }}
              />
            </Box>

            {/* RIGHT BOX – HEADER CONTENT */}
            <Box
              sx={{
                width: "83%",
                backgroundColor: "#3f6f7a",
                borderRadius: "16px",
                px: 3,
                py: 1.5,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Toolbar disableGutters sx={{ width: "100%" }}>
                {/* LEFT – Company Name */}
                <Typography
                  variant="h5"
                  sx={{ color: "#fff", fontWeight: 600, ml: 2 }}
                >
                  {companyName}
                </Typography>

                {/* RIGHT – Notification + Profile */}
                <Box
                  sx={{
                    ml: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    pr: 2,
                  }}
                >
                  <IconButton
                    sx={{
                      color: "#fff",
                      "&:hover": {
                        backgroundColor: "rgba(255,255,255,0.1)",
                      },
                    }}
                  >
                    <NotificationBell setAdminContent={setContent} />
                  </IconButton>

                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    onClick={handleClick}
                    sx={{
                      cursor: "pointer",
                      px: 1.5,
                      py: 0.8,
                      borderRadius: 2,
                      "&:hover": { backgroundColor: "#5f9aa6" },
                    }}
                  >
                    <Avatar sx={{ bgcolor: "#5f9aa6", width: 38, height: 38 }}>
                      {ProfileName?.charAt(0)}
                    </Avatar>

                    <Box sx={{ display: { xs: "none", sm: "block" } }}>
                      <Typography
                        variant="subtitle1"
                        color="#fff"
                        fontWeight={600}
                      >
                        {ProfileName}
                      </Typography>
                      <Typography variant="caption" color="#fff">
                        {today}
                      </Typography>
                    </Box>
                  </Stack>

                  <Menu
                    anchorEl={anchorEl}
                    open={profileopen}
                    onClose={handleClose}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                    <MenuItem
                      onClick={() => {
                        setContent("Profile");
                        handleClose();
                      }}
                    >
                      <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                      Profile
                    </MenuItem>

                    <Divider />

                    <MenuItem
                      onClick={() => {
                        handleLogout();
                        handleClose();
                      }}
                      sx={{ color: "error.main" }}
                    >
                      <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                      Logout
                    </MenuItem>
                  </Menu>
                </Box>
              </Toolbar>
            </Box>
          </AppBar>

          <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            aria-label="mailbox folders"
          >
            <Drawer
              variant="permanent"
              open
              sx={{
                "& .MuiDrawer-paper": {
                  width: drawerWidth,
                  background: "#3f6f7a",
                  color: "#fff",
                  borderTopRightRadius: "40px",
                  // borderBottomRightRadius: "40px",
                  marginTop: "140px",

                  // ✅ Important changes
                  height: "calc(100vh - 140px)", // Full remaining screen height
                  // Firefox
                },
              }}
            >
              {/* <List>
              {['Home', 'Employees', 'Clients', 'Documents', 'Profile'].map((text) => {
               
                const iconMapping = {
                  Home: <HomeIcon />,
                  Employees: <BadgeIcon />,
                  Clients: <GroupsIcon />,
                  Documents: <ArticleIcon />,
                  Profile: <ContactEmergencyIcon />,
                };

                return (
                  <ListItem key={text} disablePadding sx={{ marginTop: "5px" }}>
                    <ListItemButton
                      onClick={() => setContent(text)} 
                      sx={{
                        maxHeight: 38,
                        justifyContent: open ? 'initial' : 'center',
                        px: 2.5,
                        backgroundColor: content === text ? '#5f9aa6' : 'transparent', 
                        color: content === text ? '#fff' : 'inherit',
                      }}
                    >
                      <ListItemIcon
                        sx={{ color: '#fff', minWidth: 36 }}
                      >
                        {iconMapping[text]} 
                      </ListItemIcon>
                      <ListItemText primary={text} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
             
              {['Appointments', 'Attendance', 'Leave Requests', 'Reviews', 'Bills', 'Notifications','Add Medicine',"Add Medical Tests","Add Consultation Types"].map((text) => {
               
                const iconMapping = {
                  Appointments: <CalendarMonthIcon />,
                  Attendance: <PendingActionsIcon />,
                  'Leave Requests': <DirectionsRunIcon />,
                  Reviews: <ReviewsIcon />,
                  Bills: <ReceiptIcon />,
                  Notifications: <ContactSupportIcon />,
                  'Add Medicine': <MedicationIcon sx={{color:"white"}} />,
                  'Add Medical Tests': <BiotechIcon />,
                  'Add Consultation Types': <MedicalServicesIcon />
                };

                return (
                  <ListItem key={text} disablePadding >
                    <ListItemButton
                      onClick={() => setContent(text)} 
                      sx={{
                        maxHeight: 38,
                        justifyContent: open ? 'initial' : 'center',
                        px: 2.5,
                        backgroundColor: content === text ? '#5f9aa6' : 'transparent', 
                        color: content === text ? 'white' : 'inherit',
                      }}
                    >
                      <ListItemIcon
                          sx={{ color: '#fff', minWidth: 36 }}
                      >
                        {iconMapping[text]} 
                      </ListItemIcon>
                      <ListItemText primary={text} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List> */}

              <List
                sx={{
                  overflowY: "auto",
                  overflowX: "hidden",

                  // Firefox
                  scrollbarWidth: "thin",
                  scrollbarColor: "#cce0e1 transparent",

                  // Chrome, Edge, Safari
                  "&::-webkit-scrollbar": {
                    width: "6px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "transparent",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#cce0e1",
                    borderRadius: "10px",
                  },
                  "&::-webkit-scrollbar-thumb:hover": {
                    backgroundColor: "#5f9aa6",
                  },
                }}
              >
                {filteredMenu.filter((item) => item.text !== "clients")
                  .map((item) => (
                  <React.Fragment key={item.text}>
                    {/* IPD DROPDOWN BEFORE NOTIFICATIONS */}
                    {item.text === "Notifications" && (
                      <>
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() => setOpenIPD(!openIPD)}
                            sx={{
                              px: 2.5,
                              backgroundColor: openIPD
                                ? "transparent"
                                : "transparent",
                              color: "#fff",
                            }}
                          >
                            <ListItemIcon sx={{ color: "#fff", minWidth: 36 }}>
                              <LocalHospitalIcon />
                            </ListItemIcon>

                            <ListItemText primary="IPD" />

                            {openIPD ? <ExpandLess /> : <ExpandMore />}
                          </ListItemButton>
                        </ListItem>

                        <Collapse in={openIPD} timeout="auto" unmountOnExit>
                          <List component="div" disablePadding>
                            {ipdMenus.map((menu) => (
                              <ListItem key={menu.text} disablePadding>
                                <ListItemButton
                                  onClick={() => setContent(menu.text)}
                                  sx={{
                                    pl: 5,
                                    py: 0.3,
                                    backgroundColor:
                                      content === menu.text
                                        ? "#5f9aa6"
                                        : "transparent",
                                    color: "#fff",
                                  }}
                                >
                                  <ListItemIcon
                                    sx={{
                                      color: "#fff",
                                      minWidth: 32,
                                    }}
                                  >
                                    {menu.icon}
                                  </ListItemIcon>

                                  <ListItemText primary={menu.text} />
                                </ListItemButton>
                              </ListItem>
                            ))}
                          </List>
                        </Collapse>
                      </>
                    )}

                    {/* NORMAL MENU ITEMS */}
                    <ListItem disablePadding sx={{ marginTop: "5px" }}>
                      <ListItemButton
                        onClick={() => setContent(item.text)}
                        sx={{
                          maxHeight: 25,
                          justifyContent: open ? "initial" : "center",
                          px: 2.5,
                          backgroundColor:
                            content === item.text ? "#5f9aa6" : "transparent",
                          color: content === item.text ? "#fff" : "inherit",
                        }}
                      >
                        <ListItemIcon sx={{ color: "#fff", minWidth: 36 }}>
                          {item.icon}
                        </ListItemIcon>

                        <ListItemText primary={item.text}  />
                      </ListItemButton>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Drawer>
          </Box>
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              mt: 14,
              mr: 3,
              ml: 3,
              backgroundColor: "#f7f5f5",
            }}
          >
            <Box
              sx={{
                backgroundColor: "#fff",
                borderRadius: "20px",
                p: 2,
                minHeight: "80vh",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: "black",
                    fontWeight: 600,
                  }}
                >
                  Dashboard / {content}
                </Typography>

                {content === "IPD Home" && (
                  <>
                    {/* FILTERS RESTORED HERE */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      {/* Branch Filter */}
                      <FormControl size="small">
                        <Select
                          value={filters.branch_name}
                          displayEmpty
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              branch_name: e.target.value,
                            }))
                          }
                          sx={{
                            minWidth: 150,
                            height: 35,
                            borderRadius: "999px",
                          }}
                        >
                          <MenuItem value="all">All Branches</MenuItem>
                          {branches.map((branch) => (
                            <MenuItem key={branch} value={branch}>
                              {branch}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Date Filter */}
                      <FormControl size="small">
                        <Select
                          value={filters.filter_type}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              filter_type: e.target.value,
                            })
                          }
                          sx={{
                            minWidth: 150,
                            height: 35,
                            borderRadius: "999px",
                          }}
                        >
                          <MenuItem value="currentmonth">
                            Current Month
                          </MenuItem>
                          <MenuItem value="7days">Last 7 Days</MenuItem>
                          <MenuItem value="1month">Last 30 Days</MenuItem>
                          <MenuItem value="3months">Last 90 Days</MenuItem>
                          <MenuItem value="6months">Last 6 Months</MenuItem>
                          <MenuItem value="1year">Last 1 Year</MenuItem>
                          <MenuItem value="custom">Custom Date</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Custom Dates */}
                      {filters.filter_type === "custom" && (
                        <>
                          <TextField
                            size="small"
                            type="date"
                            value={filters.start_date}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                start_date: e.target.value,
                              })
                            }
                            sx={{
                              minWidth: 160,
                              "& .MuiOutlinedInput-root": {
                                height: 35,
                                borderRadius: "999px",
                                bgcolor: "#fff",
                              },
                            }}
                          />
                          <TextField
                            size="small"
                            type="date"
                            value={filters.end_date}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                end_date: e.target.value,
                              })
                            }
                            sx={{
                              minWidth: 160,
                              "& .MuiOutlinedInput-root": {
                                height: 35,
                                borderRadius: "999px",
                                bgcolor: "#fff",
                              },
                            }}
                          />
                        </>
                      )}

                      <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={handleOpenDownloadModal}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          textTransform: "none",
                          fontSize: "1em",
                          px: 2,
                          py: 0.5,
                          bgcolor: "#3f6f7a",
                          color: "#fff",
                          borderRadius: 5,
                          fontWeight: 700,
                          ":hover": { cursor: "pointer", bgcolor: "#2c4e56" },
                        }}
                      >
                        Download Report
                      </Button>
                    </Box>
                  </>
                )}
              </Box>

              {/* Conditionally render content based on the state */}
              {content === "Home" && (
                <>
                  <Dashboard />
                </>
              )}
              {content === "Employees" && (
                <>
                  <Employees />
                </>
              )}
              {/* {content === "Clients" && (
                <>
                  <Clients />
                </>
              )} */}
              {/* {content === 'ServiceRequest' &&
              (
                <>
                  <ServiceRequest />
                </>
              )} */}
              {content === "Documents" && (
                <>
                  <ClientsCards data={apiResponse} />
                </>
              )}
              {content === "Profile" && (
                <>
                  <AdminProfile />
                </>
              )}
              {/* {content === 'PasswordRepository' &&
              (
                <>
                  <Passwordrepository />
                </>
              )} */}

              {content === "Leave Requests" && (
                <>
                  <LeaveRequest />
                </>
              )}

              {content === "Appointments" && (
                <>
                  <Appointments />
                </>
              )}
              {content === "Attendance" && (
                <>
                  <StaffAttendance />
                </>
              )}
              {content === "Reviews" && (
                <>
                  <AdminReviews />
                </>
              )}
              {content === "Bills" && (
                <>
                  <AdminBills />
                </>
              )}
              {/* {content === 'Payments' && (
              <>
                <PaymentsTable />
              </>
            )} */}
              {content === "Notifications" && (
                <>
                  <SendNotification />
                </>
              )}
              {content === "Add Medicine" && (
                <>
                  <AddMedicine />
                </>
              )}
              {content === "Add Medical Tests" && (
                <>
                  <AddMedicalTests />
                </>
              )}
              {content === "Add Consultation Types" && (
                <>
                  <ConsultationTypes />
                </>
              )}
              {content === "Role-Based Permissions" && (
                <>
                  <RoleModuleManager />
                </>
              )}

              {content === "Ward Type" && (
                <>
                  <WardType />
                </>
              )}

              {content === "Rooms" && (
                <>
                  <Rooms />
                </>
              )}

              {content === "Beds" && (
                <>
                  <Beds />
                </>
              )}

              {content === "IPD Admissions" && (
                <>
                  <IPDAdmissions />
                </>
              )}

              {content === "IPD Home" && (
                <>
                  <IPDAnalytics />
                </>
              )}

              {/* {content === "Beds" && (
              <>
                <Beds />
              </>
            )} */}
            </Box>
          </Box>
        </Box>{" "}
        <IPDReportDownload
          open={openDownloadModal}
          handleClose={handleCloseDownloadModal}
        />
      </IPDFilterContext.Provider>
    </>
  );
}
