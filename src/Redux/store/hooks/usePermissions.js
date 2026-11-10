// src/redux/hooks/usePermissions.js
import { useSelector } from "react-redux";

/**
 * ═══════════════════════════════════════════════════════════════════
 * PERMISSION HOOKS
 * ═══════════════════════════════════════════════════════════════════
 * 
 * One-line permission checks anywhere in the app.
 * All hooks handle admin bypass automatically.
 */

/**
 * Check single permission
 * 
 * Usage:
 *   const canCreateSale = usePermission("pharmacy.sales.create");
 *   {canCreateSale && <NewSaleButton />}
 */
export function usePermission(permissionKey) {
  const permissions = useSelector((s) => s.auth.permissions || []);
  const role = useSelector((s) => s.auth.role);
  
  if (role === "admin") return true;
  return permissions.includes(permissionKey);
}

/**
 * Check ANY of many permissions
 * 
 * Usage:
 *   const canManageSales = useAnyPermission([
 *     "pharmacy.sales.edit",
 *     "pharmacy.sales.cancel",
 *     "pharmacy.sales-returns.create"
 *   ]);
 */
export function useAnyPermission(permissionKeys) {
  const permissions = useSelector((s) => s.auth.permissions || []);
  const role = useSelector((s) => s.auth.role);
  
  if (role === "admin") return true;
  return permissionKeys.some((key) => permissions.includes(key));
}

/**
 * Check ALL permissions
 */
export function useAllPermissions(permissionKeys) {
  const permissions = useSelector((s) => s.auth.permissions || []);
  const role = useSelector((s) => s.auth.role);
  
  if (role === "admin") return true;
  return permissionKeys.every((key) => permissions.includes(key));
}

/**
 * Check if user is admin
 */
export function useIsAdmin() {
  const role = useSelector((s) => s.auth.role);
  return role === "admin";
}

/**
 * Get current plan type
 */
export function usePlanType() {
  return useSelector((s) => s.auth.plan_type);
}

/**
 * Check if plan supports feature
 */
export function usePlanSupports(feature) {
  const planType = usePlanType();
  
  const featureMap = {
    dispensing: ["clinic", "hospital"],
    pos: ["pharmacy", "clinic", "hospital"],
    external_customers: ["pharmacy", "hospital"],
    registered_patients: ["clinic", "hospital"],
  };
  
  return featureMap[feature]?.includes(planType) ?? false;
}

/**
 * Combined: permission AND plan support
 */
export function useCanAccess(permission, feature) {
  const hasPermission = usePermission(permission);
  const planSupports = usePlanSupports(feature);
  return hasPermission && planSupports;
}

/* ═══════════════════════════════════════════════════════════════════
   BUSINESS-SPECIFIC HOOKS
   Higher-level checks for sales workflow
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Can user edit a specific sale?
 * Considers: permission + sale status + time window + payment
 */
export function useCanEditSale(sale) {
  const canEdit = usePermission("pharmacy.sales.edit");
  const canEditPaid = usePermission("pharmacy.sales.edit"); // L7: the server has no sales.edit_paid key
  
  if (!canEdit || !sale) return false;
  if (sale.status !== "completed") return false;
  
  const hoursSinceCreated = 
    (Date.now() - new Date(sale.created_at).getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreated > 24) return false;
  
  if (Number(sale.paid_amount) > 0 && !canEditPaid) return false;
  
  return true;
}

/**
 * Can user cancel a specific sale?
 */
export function useCanCancelSale(sale) {
  const canCancel = usePermission("pharmacy.sales.cancel");
  
  if (!canCancel || !sale) return false;
  if (sale.status !== "completed") return false;
  
  const daysSinceCreated = 
    (Date.now() - new Date(sale.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated > 7) return false;
  
  return true;
}

/**
 * Can user process return on this sale?
 */
export function useCanReturnSale(sale) {
  const canReturn = usePermission("pharmacy.sales-returns.create"); // L7: the key the Returns routes check
  
  if (!canReturn || !sale) return false;
  if (sale.status !== "completed") return false;
  
  const daysSinceCreated =
    (Date.now() - new Date(sale.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated > 30) return false;
  
  return true;
}