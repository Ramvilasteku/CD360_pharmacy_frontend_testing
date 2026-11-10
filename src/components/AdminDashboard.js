import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { styled, useTheme } from "@mui/material/styles";
import { useDispatch } from "react-redux";

/* MUI imports */
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Avatar, Menu, MenuItem, Stack } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";

/* Material-UI icons for sidebar menu items */
import HomeIcon from "@mui/icons-material/Home";
import BadgeIcon from "@mui/icons-material/Badge";
import GroupsIcon from "@mui/icons-material/Groups";
import ArticleIcon from "@mui/icons-material/Article";
import ContactEmergencyIcon from "@mui/icons-material/ContactEmergency";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import ReviewsIcon from "@mui/icons-material/Reviews";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PaymentIcon from "@mui/icons-material/Payment";
import MedicationIcon from "@mui/icons-material/Medication";
import BiotechIcon from "@mui/icons-material/Biotech";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import LockPersonIcon from "@mui/icons-material/LockPerson";
import ContactSupportIcon from "@mui/icons-material/ContactSupport";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import HotelIcon from "@mui/icons-material/Hotel";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import KingBedIcon from "@mui/icons-material/KingBed";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
/* ═══════════════════════════════════════════════════════════════════
   ⭐ MODULE-DRIVEN IMPORTS
   ═══════════════════════════════════════════════════════════════════ */
import { useMenuAccess } from "../Redux/store/hooks/useMenuAccess";
import { getIcon } from "../Redux/config/iconRegistry";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
/* Content components (your existing ones) */
import Dashboard from "./Dashboard";
import Employees from "./Employees";
import AdminProfile from "./AdminProfile";
import Appointments from "./Appointments";
import StaffAttendance from "./StaffAttendance";
import LeaveRequest from "./LeaveRequest";
import AdminReviews from "./AdminReviews";
import AdminBills from "./AdminBills";
import PaymentsTable from "./Payments";
import AddMedicine from "./AddMedicine";
import AddMedicalTests from "./AddMedicalTests";
import ConsultationTypes from "./Consultationtypes";
import SendNotification from "./UpdatedNotifications";
import RoleManager from "./RoleModule/RoleManager";
import ClientsCards from "./ClientsCards";

/* IPD components */
import IPDAdmissions from "./IPD/IPDAdmissions";
import WardType from "./IPD/WardType";
import Rooms from "./IPD/Rooms";
import Beds from "./IPD/Beds";
import IPDAnalytics from "./IPD/IPDAnalytics/IPDAnalytics";
import { useSelector } from "react-redux";


/* Notification listener */
import NotificationListener from "../NotificationListener";
import NotificationBell from "../NotificationBell";

// pharmacy routes 
import { pharmacySections, pharmacyRoutes } from "../Routes/pharmacyRoutes";

const drawerWidth = 250;

/* ═══════════════════════════════════════════════════════════════════
   PLACEHOLDER FOR "COMING SOON" PAGES
   ═══════════════════════════════════════════════════════════════════ */
function ComingSoon({ title }) {
  return (
    <Box sx={{ p: 4, textAlign: "center", minHeight: "60vh" }}>
      <Typography variant="h4" sx={{ color: "#3f6f7a", fontWeight: 600, mb: 2 }}>
        {title}
      </Typography>
      <Typography color="text.secondary">Coming soon</Typography>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ACCESS DENIED (When user tries to access content they don't have)
   ═══════════════════════════════════════════════════════════════════ */
function AccessDenied() {
  return (
    <Box sx={{ p: 4, textAlign: "center", minHeight: "60vh" }}>
      <Typography variant="h5" sx={{ color: "#a32d2d", fontWeight: 600, mb: 2 }}>
        Access Denied
      </Typography>
      <Typography color="text.secondary">
        You don't have permission to view this section.
      </Typography>
    </Box>
  );
}

const buildAdminPharmacyMenu = () => ({
  key: "pharmacy",
  type: "dropdown",
  label: "Pharmacy",
  icon: <LocalPharmacyIcon />,
  children: [
    { 
      key: "pharmacy-dashboard", 
      type: "item", 
      label: "Dashboard", 
      icon: <DashboardIcon fontSize="small" />, 
      contentKey: "Pharmacy Dashboard" 
    },
    ...pharmacySections.map((section) => ({
      key: `pharmacy-${section.key}`,
      type: section.routes.length === 1 ? "item" : "section",
      label: section.label,
      icon: <MedicationIcon fontSize="small" />,
      ...(section.routes.length === 1
        ? { contentKey: section.routes[0].label }
        : {
            children: section.routes.map((r) => ({
              key: r.path,
              type: "item",
              label: r.label,
              icon: <ChevronRightIcon fontSize="small" />,
              contentKey: r.label,
            })),
          }),
    })),
  ],
});

/* ═══════════════════════════════════════════════════════════════════
   Auto-generated from shared pharmacyRoutes — single source of truth
   ═══════════════════════════════════════════════════════════════════ */
const PHARMACY_CONTENT = Object.fromEntries(
  pharmacyRoutes.map((r) => [r.label, r.element])
);

const PHARMACY_URL_TO_CONTENT = Object.fromEntries(
  pharmacyRoutes.map((r) => [
    r.path.replace(/\/\*$/, ""),   // strip trailing "/*" from wildcard routes
    r.label,
  ])
);


/* URL path → CONTENT_MAP key mapper
   Lets deep links land on the right section */
const URL_TO_CONTENT = {
  "": "Home",
  home: "Home",
  employees: "Employees",
  profile: "Profile",
  appointments: "Appointments",
  attendance: "Attendance",
  reviews: "Reviews",
  bills: "Bills",
  payments: "Payments",
  medicine: "Add Medicine",
  "medical-tests": "Add Medical Tests",
  "consultation-types": "Add Consultation Types",
  notifications: "Notifications",
  "role-management": "Role Management",

  /* ⭐ Pharmacy — auto-generated from shared pharmacyRoutes */
  ...PHARMACY_URL_TO_CONTENT,

  /* IPD */
  ipd: "IPD Home",
  "ipd/admissions": "IPD Admissions",
  "ipd/wards": "Ward Type",
  "ipd/rooms": "Rooms",
  "ipd/beds": "Beds",
};

/* ═══════════════════════════════════════════════════════════════════
   CONTENT REGISTRY - Maps contentKey to component
   ═══════════════════════════════════════════════════════════════════ */
const CONTENT_MAP = {
  Home: <Dashboard />,
  Employees: <Employees />,
   Clients: <ClientsCards data={[]} />,     // ← ADD
  Documents: <ClientsCards data={[]} />, 
  Profile: <AdminProfile />,
  Appointments: <Appointments />,
  Attendance: <StaffAttendance />,
  "Leave Requests": <LeaveRequest />,
  Reviews: <AdminReviews />,
  Bills: <AdminBills />,
  Payments: <PaymentsTable />,
  "Add Medicine": <AddMedicine />,
  "Add Medical Tests": <AddMedicalTests />,
  "Add Consultation Types": <ConsultationTypes />,
  Notifications: <SendNotification />,
  "Role Management": <RoleManager />,

  /* IPD */
  "IPD Home": <IPDAnalytics />,
  "IPD Admissions": <IPDAdmissions />,
  "Ward Type": <WardType />,
  Rooms: <Rooms />,
  Beds: <Beds />,

  /* ⭐ Pharmacy — auto-generated from shared pharmacyRoutes */
  ...PHARMACY_CONTENT,
  // …etc — these stay hardcoded until you add them as real screens to pharmacyRoutes
};


const buildAdminStaticMenu = (modules) => {
  const menu = [
    { key: "home",         type: "item", label: "Home",         icon: <HomeIcon />,                   contentKey: "Home" },
    { key: "employees",    type: "item", label: "Employees",    icon: <BadgeIcon />,                  contentKey: "Employees" },
    { key: "clients",      type: "item", label: "Clients",      icon: <GroupsIcon />,                 contentKey: "Clients" },
    { key: "documents",    type: "item", label: "Documents",    icon: <ArticleIcon />,                contentKey: "Documents" },
    { key: "profile",      type: "item", label: "Profile",      icon: <ContactEmergencyIcon />,       contentKey: "Profile" },
    { key: "appointments", type: "item", label: "Appointments", icon: <CalendarMonthIcon />,          contentKey: "Appointments" },
    { key: "attendance",   type: "item", label: "Attendance",   icon: <PendingActionsIcon />,         contentKey: "Attendance" },
    { key: "leave",        type: "item", label: "Leave Requests", icon: <DirectionsRunIcon />,        contentKey: "Leave Requests" },
    { key: "reviews",      type: "item", label: "Reviews",      icon: <ReviewsIcon />,                contentKey: "Reviews" },
    { key: "bills",        type: "item", label: "Bills",        icon: <ReceiptIcon />,                contentKey: "Bills" },
    { key: "payments",     type: "item", label: "Payments",     icon: <PaymentIcon />,                contentKey: "Payments" },
    { key: "medicine",     type: "item", label: "Add Medicine",         icon: <MedicationIcon />,     contentKey: "Add Medicine" },
    { key: "tests",        type: "item", label: "Add Medical Tests",    icon: <BiotechIcon />,        contentKey: "Add Medical Tests" },
    { key: "consultation", type: "item", label: "Add Consultation Types", icon: <MedicalServicesIcon />, contentKey: "Add Consultation Types" },
    { key: "role",         type: "item", label: "Role Management", icon: <LockPersonIcon />,         contentKey: "Role Management" },
    { key: "notifications", type: "item", label: "Notifications", icon: <ContactSupportIcon />,      contentKey: "Notifications" },
  ];

  // IPD dropdown — only if admin has ipd module
  if (modules.includes("ipd")) {
    menu.push({
      key: "ipd",
      type: "dropdown",
      label: "IPD",
      icon: <LocalHospitalIcon />,
      children: [
        { key: "ipd-home",       type: "item", label: "IPD Home",       icon: <DashboardIcon fontSize="small" />,       contentKey: "IPD Home" },
        { key: "ipd-admissions", type: "item", label: "IPD Admissions", icon: <AssignmentIndIcon fontSize="small" />,   contentKey: "IPD Admissions" },
        { key: "ipd-wards",      type: "item", label: "Ward Type",      icon: <HotelIcon fontSize="small" />,           contentKey: "Ward Type" },
        { key: "ipd-rooms",      type: "item", label: "Rooms",          icon: <MeetingRoomIcon fontSize="small" />,     contentKey: "Rooms" },
        { key: "ipd-beds",       type: "item", label: "Beds",           icon: <KingBedIcon fontSize="small" />,         contentKey: "Beds" },
      ],
    });
  }

  return menu;
};


/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [content, setContent] = useState("Home");
  const [openDropdowns, setOpenDropdowns] = useState({});   // Track expanded dropdowns
  const [anchorEl, setAnchorEl] = useState(null);
  const profileopen = Boolean(anchorEl);

  const location = useLocation();
  const navigate = useNavigate();

  /* ⭐ THE MAGIC: filtered menu based on user's modules */
  const { visibleMenu, canAccessContent, role } = useMenuAccess();
  const reduxModules = useSelector((s) => s.auth?.modules || []);

 useEffect(() => {
  /* 1. Legacy: still support state-based navigation */
  if (location.state?.content) {
    setContent(location.state.content);
    return;
  }

  /* 2. New: read the URL after /AdminDashboard/ */
  const subPath = location.pathname
    .replace(/^\/AdminDashboard\/?/, "")   // strip prefix
    .replace(/\/$/, "")                    // strip trailing slash
    .toLowerCase();

  const mapped = URL_TO_CONTENT[subPath];
  if (mapped) setContent(mapped);
}, [location.pathname, location.state]);

  const toggleDropdown = (key) => {
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

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

  const companyName = localStorage.getItem("companyName");
  const companyLogo = localStorage.getItem("companyLogo");
  const ProfileName = localStorage.getItem("adminName") || localStorage.getItem("userName");

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const mergedMenu = React.useMemo(() => {
  // For admin, use the full static menu
  if (role === "admin") {
    const base = buildAdminStaticMenu(reduxModules);
    // Append pharmacy if licensed
    if (reduxModules.includes("pharmacy")) {
      return [...base, buildAdminPharmacyMenu()];
    }
    return base;
  }
  
  // For non-admin roles, use the module-filtered menu
  if (!reduxModules.includes("pharmacy")) return visibleMenu;
  return [...visibleMenu, buildAdminPharmacyMenu()];
}, [visibleMenu, reduxModules, role]);

  /* ═══════════════════════════════════════════════════════════════════
     RENDER: Single menu item
     ═══════════════════════════════════════════════════════════════════ */
  const renderItem = (item, depth = 0) => {
    const IconComponent = getIcon(item.iconName);
    const isSelected = content === item.contentKey;
    const paddingLeft = 2.5 + depth * 2;

    return (
      <ListItem key={item.key} disablePadding>
        <ListItemButton
          onClick={() => {
  console.log("clicked:", item.label, "contentKey:", item.contentKey);
  const urlKey = Object.entries(URL_TO_CONTENT).find(
    ([, v]) => v === item.contentKey
  )?.[0];
  console.log("urlKey found:", urlKey);
  setContent(item.contentKey);
  if (urlKey !== undefined) {
    navigate(`/AdminDashboard/${urlKey}`, { replace: false });
  }
}}
          sx={{
            pl: paddingLeft,
            py: depth > 0 ? 0.3 : 0.5,
            backgroundColor: isSelected ? "#5f9aa6" : "transparent",
            color: "#fff",
            "&:hover": {
              backgroundColor: isSelected ? "#5f9aa6" : "rgba(255,255,255,0.05)",
            },
          }}
        >
          <ListItemIcon sx={{ color: "#fff", minWidth: depth > 0 ? 32 : 36 }}>
          {item.icon}
        </ListItemIcon>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{ fontSize: depth > 0 ? "0.85rem" : "0.95rem" }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDER: Section (sub-group inside dropdown)
     ═══════════════════════════════════════════════════════════════════ */
  const renderSection = (section, depth = 0) => {
    const IconComponent = getIcon(section.iconName);
    const isOpen = openDropdowns[section.key];

    return (
      <React.Fragment key={section.key}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => toggleDropdown(section.key)}
            sx={{
              pl: 2.5 + depth * 2,
              py: 0.5,
              color: "#fff",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
            }}
          >
           <ListItemIcon sx={{ color: "#fff", minWidth: 32 }}>
            {section.icon}
          </ListItemIcon>
            <ListItemText
              primary={section.label}
              primaryTypographyProps={{ fontSize: "0.9rem" }}
            />
            {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </ListItemButton>
        </ListItem>

        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {section.children.map((child) => renderItem(child, depth + 2))}
          </List>
        </Collapse>
      </React.Fragment>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDER: Dropdown (top-level with children)
     ═══════════════════════════════════════════════════════════════════ */
  const renderDropdown = (dropdown) => {
  const IconComponent = getIcon(dropdown.iconName);
  const isOpen = openDropdowns[dropdown.key];

  return (
    <React.Fragment key={dropdown.key}>
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => toggleDropdown(dropdown.key)}
          sx={{
            px: 2.5,
            color: "#fff",
            backgroundColor: isOpen ? "rgba(255,255,255,0.05)" : "transparent",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
          }}
        >
          {/* ⭐ LEFT-SIDE ARROW — only for dropdowns (items with children) */}
          <ListItemIcon sx={{ color: "#fff", minWidth: 24 }}>
            {isOpen ? (
              <ExpandMore fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </ListItemIcon>

          <ListItemIcon sx={{ color: "#fff", minWidth: 36 }}>
          {dropdown.icon}
        </ListItemIcon>
          <ListItemText primary={dropdown.label} />
        </ListItemButton>
      </ListItem>

      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {dropdown.children.map((child) => {
            if (child.type === "section") return renderSection(child, 1);
            return renderItem(child, 1);
          })}
        </List>
      </Collapse>
    </React.Fragment>
  );
};

  /* ═══════════════════════════════════════════════════════════════════
     RENDER: Route menu item to correct renderer
     ═══════════════════════════════════════════════════════════════════ */
  const renderMenuItem = (item) => {
    if (item.type === "item") return renderItem(item);
    if (item.type === "dropdown") return renderDropdown(item);
    if (item.type === "section") return renderSection(item);
    return null;
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDER: Content area with access check
     ═══════════════════════════════════════════════════════════════════ */
  const renderContent = () => {
  const isAdmin = role === "admin";

  // ⭐ Admin bypasses per-content permission checks — module access is enough
  if (!isAdmin && !canAccessContent(content)) {
    return <AccessDenied />;
  }

  return CONTENT_MAP[content] || <ComingSoon title={content} />;
};

  return (
    <>
      <NotificationListener />
      <Box sx={{ display: "flex", backgroundColor: "#f7f5f5" }}>
        {/* ═════ APP BAR ═════ */}
        <MuiAppBar
          position="fixed"
          elevation={0}
          sx={{
            backgroundColor: "transparent",
            boxShadow: "none",
            ml: `${drawerWidth}px`,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            px: 3,
          }}
        >
          <Box sx={{ width: "17%", height: "100px", display: "flex", alignItems: "center" }}>
            {companyLogo && (
              <Box
                component="img"
                src={`${process.env.REACT_APP_URL}/Images/${companyLogo}`}
                alt="Logo"
                sx={{ width: 200, height: 100, objectFit: "contain", borderRadius: 4 }}
              />
            )}
          </Box>

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
              <Typography variant="h5" sx={{ color: "#fff", fontWeight: 600, ml: 2 }}>
                {companyName}
              </Typography>

              <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 2, pr: 2 }}>
                <IconButton sx={{ color: "#fff" }}>
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
                    <Typography variant="subtitle1" color="#fff" fontWeight={600}>
                      {ProfileName}
                    </Typography>
                    <Typography variant="caption" color="#fff">
                      {role} · {today}
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
        </MuiAppBar>

        {/* ═════ SIDEBAR (FULLY MODULE-DRIVEN) ═════ */}
        <Box component="nav" sx={{ width: drawerWidth, flexShrink: 0 }}>
          <MuiDrawer
            variant="permanent"
            open
            sx={{
              "& .MuiDrawer-paper": {
                width: drawerWidth,
                background: "#3f6f7a",
                color: "#fff",
                borderTopRightRadius: "40px",
                marginTop: "140px",
                height: "calc(100vh - 140px)",
              },
            }}
          >
            <List
              sx={{
                overflowY: "auto",
                overflowX: "hidden",
                scrollbarWidth: "thin",
                scrollbarColor: "#cce0e1 transparent",
                "&::-webkit-scrollbar": { width: "6px" },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "#cce0e1",
                  borderRadius: "10px",
                },
              }}
            >
              {/* ⭐ THIS IS THE MAGIC LINE ⭐ */}
              {/* Every user sees a different menu based on their modules[] */}
{mergedMenu.map((item) => renderMenuItem(item))}
            </List>
          </MuiDrawer>
        </Box>

        {/* ═════ MAIN CONTENT ═════ */}
        <Box
          component="main"
          sx={{ flexGrow: 1, mt: 14, mr: 3, ml: 3, backgroundColor: "#f7f5f5" }}
        >
          <Box
            sx={{
              backgroundColor: "#fff",
              borderRadius: "20px",
              p: 2,
              minHeight: "80vh",
            }}
          >
            <Typography variant="h6" sx={{ color: "black", fontWeight: 600, mb: 2 }}>
              Dashboard / {content}
            </Typography>

            {/* Content with access check */}
            {renderContent()}
          </Box>
        </Box>
      </Box>
    </>
  );
}

