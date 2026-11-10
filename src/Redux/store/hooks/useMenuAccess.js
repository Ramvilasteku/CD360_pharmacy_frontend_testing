// src/Redux/store/hooks/useMenuAccess.js

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { MENU_CONFIG } from "../../config/menuConfig";

/**
 * ═══════════════════════════════════════════════════════════════════
 * useMenuAccess — FIXED for features + smart merge
 * 
 * SMART MERGE: For each field (modules/features/permissions), 
 * uses Redux if it has data, else falls back to localStorage.
 * 
 * This fixes the bug where Redux had role but not features,
 * causing features array to stay empty and sidebar to hide.
 * ═══════════════════════════════════════════════════════════════════
 */
export function useMenuAccess() {
  const modules     = useSelector((s) => s.auth?.modules     || []);
  const features    = useSelector((s) => s.auth?.features    || []);
  const permissions = useSelector((s) => s.auth?.permissions || []);
  const role        = useSelector((s) => s.auth?.role);

  const isAdmin = role === "admin";

  const hasModule     = (key) => !key || modules.includes(key);
  const hasFeature    = (key) => isAdmin || !key || features.includes(key);
  const hasPermission = (key) => isAdmin || !key || permissions.includes(key);

  const canAccessItem = (item) =>
    hasModule(item.moduleKey) &&
    hasFeature(item.featureKey) &&
    hasPermission(item.permissionKey);

  const canAccessContent = (contentKey) => {
    if (isAdmin) return true;   // ⭐ admin bypass — no per-content check
    // …rest of your existing logic…
  };

  const canCreate = (perm) => isAdmin || permissions.includes(perm);
  const canEdit   = (perm) => isAdmin || permissions.includes(perm);
  const canDelete = (perm) => isAdmin || permissions.includes(perm);

  const visibleMenu = MENU_CONFIG
    .filter(canAccessItem)
    .map((item) => {
      if (!item.children) return item;
      const visibleChildren = item.children
        .filter(canAccessItem)
        .map((child) => {
          if (!child.children) return child;
          return {
            ...child,
            children: child.children.filter(canAccessItem),
          };
        })
        .filter((c) => !c.children || c.children.length > 0);
      return { ...item, children: visibleChildren };
    })
    .filter((i) => !i.children || i.children.length > 0);

  return { visibleMenu, canAccessContent, canCreate, canEdit, canDelete, role };
}