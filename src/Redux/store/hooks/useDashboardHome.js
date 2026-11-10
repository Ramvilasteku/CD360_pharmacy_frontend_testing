import { useLocation } from "react-router-dom";

/**
 * Returns the correct "Back to Dashboard" path for whichever role/dashboard
 * the user is currently inside. URL-driven — works for any custom role added
 * later (chemist, cashier, inventory-manager…) as long as they're mounted
 * under an existing dashboard prefix.
 */
export function useDashboardHome() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/AdminDashboard"))         return "/AdminDashboard/home";
  if (pathname.startsWith("/doctor/dashboard"))       return "/doctor/dashboard";
  if (pathname.startsWith("/receptionist/dashboard")) return "/receptionist/dashboard";
  if (pathname.startsWith("/pharmacy"))               return "/pharmacy/dashboard";

  return "/pharmacy/dashboard";  // safe fallback
}