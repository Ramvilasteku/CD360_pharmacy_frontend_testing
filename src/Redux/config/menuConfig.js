// src/Redux/config/menuConfig.js

/**
 * ═══════════════════════════════════════════════════════════════════
 * PERMISSION-DRIVEN MENU CONFIGURATION
 *
 * NOTE: The Pharmacy dropdown is NOT defined here.
 * It's auto-generated in AdminDashboard.jsx via buildAdminPharmacyMenu()
 * reading from src/routes/pharmacyRoutes.js — the single source of truth
 * shared across admin, doctor, receptionist, and pharmacist dashboards.
 *
 * Key format:
 *   • moduleKey     → "ipd" (module)
 *   • featureKey    → "medicines" (short — matches features table)
 *   • permissionKey → "pharmacy.medicines.view" (dotted — matches permissions table)
 * ═══════════════════════════════════════════════════════════════════
 */

export const MENU_CONFIG = [
  /* ═════ Top-level items ═════ */
  {
    type: "item",
    key: "Home",
    label: "Home",
    iconName: "HomeIcon",
    moduleKey: "home",
    contentKey: "Home",
  },
  {
    type: "item",
    key: "Employees",
    label: "Employees",
    iconName: "BadgeIcon",
    moduleKey: "employees",
    contentKey: "Employees",
  },
  {
    type: "item",
    key: "Profile",
    label: "Profile",
    iconName: "ContactEmergencyIcon",
    moduleKey: "profile",
    contentKey: "Profile",
  },
  {
    type: "item",
    key: "Appointments",
    label: "Appointments",
    iconName: "CalendarMonthIcon",
    moduleKey: "appointments",
    contentKey: "Appointments",
  },
  {
    type: "item",
    key: "Attendance",
    label: "Attendance",
    iconName: "PendingActionsIcon",
    moduleKey: "attendance",
    contentKey: "Attendance",
  },
  {
    type: "item",
    key: "Leave Requests",
    label: "Leave Requests",
    iconName: "DirectionsRunIcon",
    moduleKey: "leave_requests",
    contentKey: "Leave Requests",
  },
  {
    type: "item",
    key: "Reviews",
    label: "Reviews",
    iconName: "ReviewsIcon",
    moduleKey: "reviews",
    contentKey: "Reviews",
  },
  {
    type: "item",
    key: "Bills",
    label: "Bills",
    iconName: "ReceiptIcon",
    moduleKey: "bills",
    contentKey: "Bills",
  },
  {
    type: "item",
    key: "Payments",
    label: "Payments",
    iconName: "PaymentIcon",
    moduleKey: "payments",
    contentKey: "Payments",
  },
  {
    type: "item",
    key: "Add Medicine",
    label: "Add Medicine",
    iconName: "MedicationIcon",
    moduleKey: "medicine",
    contentKey: "Add Medicine",
  },
  {
    type: "item",
    key: "Add Medical Tests",
    label: "Add Medical Tests",
    iconName: "BiotechIcon",
    moduleKey: "medical_tests",
    contentKey: "Add Medical Tests",
  },
  {
    type: "item",
    key: "Add Consultation Types",
    label: "Add Consultation Types",
    iconName: "MedicalServicesIcon",
    moduleKey: "consultation_types",
    contentKey: "Add Consultation Types",
  },
  {
    type: "item",
    key: "Notifications",
    label: "Notifications",
    iconName: "ContactSupportIcon",
    moduleKey: "notifications",
    contentKey: "Notifications",
  },

  /* ═════ IPD dropdown ═════ */
  {
    type: "dropdown",
    key: "IPD",
    label: "IPD",
    iconName: "LocalHospitalIcon",
    moduleKey: "ipd",
    children: [
      {
        type: "item",
        key: "IPD Home",
        label: "IPD Home",
        iconName: "DashboardIcon",
        moduleKey: "ipd",
        contentKey: "IPD Home",
      },
      {
        type: "item",
        key: "IPD Admissions",
        label: "IPD Admissions",
        iconName: "AssignmentIndIcon",
        moduleKey: "ipd_admissions",
        contentKey: "IPD Admissions",
      },
      {
        type: "item",
        key: "Ward Type",
        label: "Ward Type",
        iconName: "HotelIcon",
        moduleKey: "ipd_ward_type",
        contentKey: "Ward Type",
      },
      {
        type: "item",
        key: "Rooms",
        label: "Rooms",
        iconName: "MeetingRoomIcon",
        moduleKey: "ipd_rooms",
        contentKey: "Rooms",
      },
      {
        type: "item",
        key: "Beds",
        label: "Beds",
        iconName: "KingBedIcon",
        moduleKey: "ipd_beds",
        contentKey: "Beds",
      },
    ],
  },

  /* ═════════════════════════════════════════════════════════════════
     ⭐ PHARMACY DROPDOWN — INTENTIONALLY REMOVED FROM THIS FILE
     Now auto-generated from src/routes/pharmacyRoutes.js via
     buildAdminPharmacyMenu() in AdminDashboard.jsx.
     Do NOT re-add pharmacy items here — it will cause duplicates.
     Edit pharmacySections in pharmacyRoutes.js instead.
     ═════════════════════════════════════════════════════════════════ */

  /* ═════ Role Management ═════ */
  {
    type: "item",
    key: "Role Management",
    label: "Role Management",
    iconName: "AdminPanelSettingsIcon",
    moduleKey: "role_module_manager",
    contentKey: "Role Management",
  },
];