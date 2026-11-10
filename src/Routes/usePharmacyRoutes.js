// src/Routes/usePharmacyRoutes.js
//
// Which pharmacy screens this user may open. Feeds the staff sidebar
// (pharmacy/shell/PharmacySidebar.jsx) and the route list (Routes/PharmacyStaffRoutes.jsx).
//
// THREE GATES, in order. A screen shows only if it passes all three:
//
//   1. module      the tenant has licensed "pharmacy" at all (admin_modules)
//   2. feature_key the role has the feature on (role_features). Decides whole sections.
//   3. permission_key  the role holds this exact permission (role_permissions). Decides a
//                  single page inside a section — four Purchase Orders pages share
//                  feature_key "purchase", and five Sales pages share "sales".
//
// Gate 3 is new on 25 Oct 2026. Before that this hook read feature_key only, so
// permission_key in pharmacyRoutes.jsx was honoured inside each screen but never in the
// sidebar or routing. Two things were wrong because of it:
//   • Sales carried no keys of any kind, and a missing key counts as "allowed"
//     (`!key` → true), so every pharmacy employee saw all of Sales including New sale.
//   • Procurement's per-page keys did nothing to the menu — a role without
//     pharmacy.purchase.generate_create still saw Generate PO, just with its buttons gone.
//
// WHERE THE PERMISSIONS COME FROM
//   The redux auth slice: s.auth.permissions, kept current by usePermissionPolling()
//   (App.js) which refetches GET /api/getMyAccess on mount, every 60s and on tab focus.
//   Synchronous, so there is no loading state to deal with here — no empty-sidebar flash
//   and no race on a refreshed deep link.
//
// ADMIN BYPASS — important
//   buildUserAccess() in controllers/authController.js returns features: [] and
//   permissions: [] for a tenant admin: its STEP 1 finds no user_role_assignments row for
//   an admin, and the fallback that resolves a role_id is explicitly staff-only
//   (`if (userType !== "admin" …)`), so STEPs 5 and 6 never run. An admin's arrays are
//   therefore always empty and EVERY check here must bypass on role === "admin", exactly
//   as middlewares/allowPermissions.js does server-side (`if (isAdmin) return next();`).
//   This mirrors Redux/store/hooks/usePermissions.js, which bypasses the same way.

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { pharmacyRoutes, pharmacySections } from "./pharmacyRoutes";

export function usePharmacyAccess() {
  const modules     = useSelector((s) => s.auth?.modules     || []);
  const features    = useSelector((s) => s.auth?.features    || []);
  const permissions = useSelector((s) => s.auth?.permissions || []);
  const role        = useSelector((s) => s.auth?.role);

  return useMemo(() => {
    const isAdmin = role === "admin";
    const hasPharmacyModule = isAdmin || modules.includes("pharmacy");

    // A route with no key of a given kind is not restricted by that kind — that is what
    // keeps every module not yet split behaving exactly as it did.
    const hasFeature = (key) => isAdmin || !key || features.includes(key);
    const hasPermission = (key) => isAdmin || !key || permissions.includes(key);

    // Gate 2 AND gate 3. Keeping it in one place is what stops the sidebar and the route
    // list from ever disagreeing — a link you cannot see must also be a URL you cannot type.
    const canOpen = (r) => hasFeature(r.feature_key) && hasPermission(r.permission_key);

    const visibleRoutes = hasPharmacyModule ? pharmacyRoutes.filter(canOpen) : [];

    const visibleSections = hasPharmacyModule
      ? pharmacySections
          .filter((s) => hasFeature(s.feature_key))
          .map((s) => ({ ...s, routes: s.routes.filter(canOpen) }))
          // a section whose every page is hidden should not show an empty heading
          .filter((s) => s.routes.length > 0)
      : [];

    return {
      visibleRoutes,
      visibleSections,
      hasPharmacyModule,
      /** Can this user open this registry path? For route-level guards and tab filtering. */
      canOpenPath: (path) => {
        const r = pharmacyRoutes.find((x) => x.path === path);
        return !!r && hasPharmacyModule && canOpen(r);
      },
      /** A bare permission check with the admin bypass, for screens that need one inline. */
      can: hasPermission,
      isAdmin,
    };
  }, [modules, features, permissions, role]);
}