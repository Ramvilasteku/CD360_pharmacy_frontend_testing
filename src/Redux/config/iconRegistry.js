// src/Redux/config/iconRegistry.js

/**
 * Icon Registry
 * 
 * Maps iconName strings from menuConfig to actual MUI icon components.
 * This lets us keep menuConfig JSON-serializable (no JSX in config).
 */

import HomeIcon from "@mui/icons-material/Home";
import BadgeIcon from "@mui/icons-material/Badge";
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
import ContactSupportIcon from "@mui/icons-material/ContactSupport";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import HotelIcon from "@mui/icons-material/Hotel";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import KingBedIcon from "@mui/icons-material/KingBed";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

// Pharmacy Icons
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CategoryIcon from "@mui/icons-material/Category";
import LayersIcon from "@mui/icons-material/Layers";
import TuneIcon from "@mui/icons-material/Tune";
import HistoryIcon from "@mui/icons-material/History";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DescriptionIcon from "@mui/icons-material/Description";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import BusinessIcon from "@mui/icons-material/Business";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export const ICON_MAP = {
  HomeIcon,
  BadgeIcon,
  ContactEmergencyIcon,
  CalendarMonthIcon,
  PendingActionsIcon,
  DirectionsRunIcon,
  ReviewsIcon,
  ReceiptIcon,
  PaymentIcon,
  MedicationIcon,
  BiotechIcon,
  MedicalServicesIcon,
  ContactSupportIcon,
  LocalHospitalIcon,
  DashboardIcon,
  AssignmentIndIcon,
  HotelIcon,
  MeetingRoomIcon,
  KingBedIcon,
  AdminPanelSettingsIcon,
  LocalPharmacyIcon,
  Inventory2Icon,
  PointOfSaleIcon,
  WarningAmberIcon,
  CategoryIcon,
  LayersIcon,
  TuneIcon,
  HistoryIcon,
  LocalShippingIcon,
  DescriptionIcon,
  CallReceivedIcon,
  BusinessIcon,
  ReceiptLongIcon,
  KeyboardReturnIcon,
  PersonAddIcon,
    ChevronRightIcon, 
    
};

/**
 * Get icon component by name with fallback
 */
export function getIcon(iconName) {
  const Icon = ICON_MAP[iconName];
  if (!Icon) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[iconRegistry] Missing icon: "${iconName}"`);
    }
    return ChevronRightIcon;
  }
  return Icon;
}