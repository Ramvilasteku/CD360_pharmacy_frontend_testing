// src/redux/hooks/usePharmacyAccess.js

import { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchPharmacyAccess } from "../slices/pharmacyAccessSlice";

/**
 * ═══════════════════════════════════════════════════════════════════
 * usePharmacyAccess Hook - TWO-LAYER STRATEGY
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Layer 1 (INSTANT): Reads Redux for immediate display
 *   - Uses auth.modules from login response
 *   - Uses auth.permissions from login response
 *   - Uses auth.role for admin bypass
 *   - Zero delay - shows pharmacy immediately
 * 
 * Layer 2 (BACKGROUND): Fetches fresh data from DB
 *   - Confirms user still has access
 *   - Updates Redux if changed
 *   - User never sees the delay
 * 
 * PRIORITY:
 * 1. If Redux has module data → USE IT INSTANTLY
 * 2. DB fetch happens in background silently
 * 3. If DB check contradicts Redux → UI updates smoothly
 * ═══════════════════════════════════════════════════════════════════
 */
export function usePharmacyAccess() {
  const dispatch = useDispatch();

  /* ═══════════════════════════════════════════════════════════════════
     LAYER 1: INSTANT DATA FROM REDUX (auth slice)
     This is what user gets IMMEDIATELY - no waiting
     ═══════════════════════════════════════════════════════════════════ */
  const authRole = useSelector((s) => s.auth?.role);
  const authModules = useSelector((s) => s.auth?.modules || []);
  const authPermissions = useSelector((s) => s.auth?.permissions || []);
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);

  /* ═══════════════════════════════════════════════════════════════════
     LAYER 2: BACKGROUND DB VALIDATION
     Fetches fresh data silently, updates Redux if needed
     ═══════════════════════════════════════════════════════════════════ */
  const {
    hasPharmacyAccess: dbHasPharmacyAccess,
    pharmacySubModules: dbPharmacySubModules,
    permissions: dbPermissions,
    role: dbRole,
    userType,
    loading: dbLoading,
    error: dbError,
    lastFetched,
  } = useSelector((state) => state.pharmacyAccess || {});

  /* ═══════════════════════════════════════════════════════════════════
     COMPUTE INSTANT ACCESS FROM REDUX AUTH SLICE
     This runs synchronously - no waiting for DB
     ═══════════════════════════════════════════════════════════════════ */
  const instantAccess = useMemo(() => {
    // Not logged in yet
    if (!isAuthenticated) {
      return {
        hasPharmacyAccess: false,
        subModules: [],
        source: "not_authenticated",
      };
    }

    // ADMIN BYPASS - Admin gets pharmacy access immediately
    if (authRole === "admin") {
      return {
        hasPharmacyAccess: true,
        subModules: [
          "pharmacy",
          "pharmacy_medicines",
          "pharmacy_categories",
          "pharmacy_batches",
          "pharmacy_stock",
          "pharmacy_low_stock",
          "pharmacy_expiry",
          "pharmacy_adjustments",
          "pharmacy_ledger",
          "pharmacy_suppliers",
          "pharmacy_purchase_orders",
          "pharmacy_grn",
          "pharmacy_purchase_returns",
          "pharmacy_customers",
          "pharmacy_pos",
          "pharmacy_sales",
          "pharmacy_sales_returns",
          "pharmacy_payments",
        ],
        source: "redux_admin",
      };
    }

    // NON-ADMIN: Check modules array from Redux
    const pharmacyModules = authModules.filter(
      (m) => m === "pharmacy" || m.startsWith("pharmacy_")
    );

    return {
      hasPharmacyAccess: pharmacyModules.length > 0,
      subModules: pharmacyModules,
      source: "redux_modules",
    };
  }, [isAuthenticated, authRole, authModules]);

  /* ═══════════════════════════════════════════════════════════════════
     BACKGROUND FETCH - Silent DB validation
     Only fetches if:
     - User is authenticated
     - No recent fetch (cache for 5 minutes)
     - Not currently fetching
     ═══════════════════════════════════════════════════════════════════ */
  /* ═══════════════════════════════════════════════════════════════════
   BACKGROUND FETCH + REAL-TIME POLLING
   - Initial fetch on mount (if stale)
   - Poll every 60s to catch admin permission changes
   - Immediate refresh when tab regains focus
   ═══════════════════════════════════════════════════════════════════ */
useEffect(() => {
  if (!isAuthenticated) return;

  const CACHE_DURATION = 5 * 60 * 1000;  // 5-min cache for initial check
  const POLL_INTERVAL = 60 * 1000;        //  Poll every 60 seconds

  // Initial fetch (respects cache)
  const shouldFetchInitial = !lastFetched || Date.now() - lastFetched > CACHE_DURATION;
  if (shouldFetchInitial && !dbLoading) {
    dispatch(fetchPharmacyAccess());
  }

  //  Polling — forces refresh every 60s (ignores cache)
  const pollTimer = setInterval(() => {
    dispatch(fetchPharmacyAccess());
  }, POLL_INTERVAL);

  //  Refresh immediately when user comes back to the tab
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      dispatch(fetchPharmacyAccess());
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    clearInterval(pollTimer);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}, [dispatch, isAuthenticated]);  // Removed lastFetched/dbLoading to prevent re-mount

  /* ═══════════════════════════════════════════════════════════════════
     COMBINE BOTH LAYERS - Prefer DB if available, fallback to Redux
     ═══════════════════════════════════════════════════════════════════ */
  const combinedAccess = useMemo(() => {
    // If DB has responded, USE DB DATA (source of truth)
    if (lastFetched && dbPharmacySubModules && dbPharmacySubModules.length > 0) {
      return {
        hasPharmacyAccess: dbHasPharmacyAccess,
        subModules: dbPharmacySubModules,
        source: "database",
      };
    }

    // If DB says no access but Redux says admin, trust Redux (admin bypass)
    if (lastFetched && !dbHasPharmacyAccess && authRole === "admin") {
      return instantAccess;
    }

    // Otherwise use instant Redux data
    return instantAccess;
  }, [
    lastFetched,
    dbHasPharmacyAccess,
    dbPharmacySubModules,
    authRole,
    instantAccess,
  ]);

  /* ═══════════════════════════════════════════════════════════════════
     HELPER FUNCTIONS
     ═══════════════════════════════════════════════════════════════════ */

  /**
   * Check if user can access specific pharmacy sub-module
   */
  const canAccess = (subModuleKey) => {
    if (!combinedAccess.hasPharmacyAccess) return false;

    // Admin bypass - always allow
    if (authRole === "admin") return true;

    return combinedAccess.subModules.includes(subModuleKey);
  };

  /**
   * Check granular permission
   */
  const hasPermission = (permissionKey) => {
    if (authRole === "admin") return true;

    // Prefer DB permissions if available
    const perms = dbPermissions && dbPermissions.length > 0 
      ? dbPermissions 
      : authPermissions;

    return perms.includes(permissionKey);
  };

  return {
    // ⭐ MAIN ACCESS FLAG - Combines Redux + DB
    hasPharmacyAccess: combinedAccess.hasPharmacyAccess,
    subModules: combinedAccess.subModules,

    // Individual layers (for debugging)
    instantAccess: instantAccess.hasPharmacyAccess,      // From Redux (instant)
    verifiedAccess: dbHasPharmacyAccess,                  // From DB (verified)
    accessSource: combinedAccess.source,                  // Where access came from

    // Meta info
    role: dbRole || authRole,
    userType,
    isVerified: !!lastFetched,                            // Has DB been checked?
    isSyncing: dbLoading,                                 // Is DB check in progress?

    // Helper functions
    canAccess,
    hasPermission,

    // Manual refresh
    refresh: () => dispatch(fetchPharmacyAccess()),
  };
}