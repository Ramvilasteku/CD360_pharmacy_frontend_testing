// src/Redux/store/selectors/authSelectors.js

/* ═══════════════════════════════════════════════════════════════════
   AUTH SELECTORS — clean access to any auth field
   ═══════════════════════════════════════════════════════════════════ */

/* Identity */
export const selectUser           = (s) => s.auth?.user;
export const selectUserId         = (s) => s.auth?.user?.id;
export const selectUserName       = (s) => s.auth?.user?.name;
export const selectUserType       = (s) => s.auth?.userType;
export const selectIsAuthenticated = (s) => s.auth?.isAuthenticated || false;

/* Roles */
export const selectRole           = (s) => s.auth?.role;
export const selectActiveRole     = (s) => s.auth?.activeRole || s.auth?.role;
export const selectPrimaryRole    = (s) => s.auth?.primaryRole || s.auth?.role;
export const selectRoles          = (s) => s.auth?.roles || [];
export const selectIsAdmin        = (s) => s.auth?.role === "admin";
export const selectHasMultipleRoles = (s) => (s.auth?.roles || []).length > 1;

/* Plan */
export const selectPlanType       = (s) => s.auth?.plan_type;
export const selectIsPharmacyPlan = (s) => s.auth?.plan_type === "pharmacy";
export const selectIsClinicPlan   = (s) => s.auth?.plan_type === "clinic";
export const selectIsHospitalPlan = (s) => s.auth?.plan_type === "hospital";

/* Access data */
export const selectModules        = (s) => s.auth?.modules || [];
export const selectFeatures       = (s) => s.auth?.features || [];         // ⭐ NEW
export const selectPermissions    = (s) => s.auth?.permissions || [];
export const selectAdminModules   = (s) => s.auth?.adminModules || [];

/* Composite checks */
export const selectHasPharmacyAccess = (s) =>
  s.auth?.role === "admin" || (s.auth?.modules || []).includes("pharmacy");

export const selectHasFeature = (featureKey) => (s) =>
  s.auth?.role === "admin" || (s.auth?.features || []).includes(featureKey);

export const selectHasPermission = (permissionKey) => (s) =>
  s.auth?.role === "admin" || (s.auth?.permissions || []).includes(permissionKey);

export const selectCanAction = (feature, action) => (s) =>
  s.auth?.role === "admin" ||
  (s.auth?.permissions || []).includes(`${feature}.${action}`);

/* Session state */
export const selectAuthLoading    = (s) => s.auth?.loading || false;
export const selectAuthError      = (s) => s.auth?.error;
export const selectLastLoggedIn   = (s) => s.auth?.lastLoggedIn;