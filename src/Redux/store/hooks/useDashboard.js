// src/redux/hooks/useDashboard.js
import { useMemo } from "react";
import { useSelector } from "react-redux";
import {
  KPI_WIDGETS,
  TABLE_WIDGETS,
  HEADER_ACTIONS,
} from "../../config/widgetRegistry";

/* ═══════════════════════════════════════════════════════════════════
   Permission check helper
   Returns true if user can see this widget
   ═══════════════════════════════════════════════════════════════════ */
function canSeeWidget(widget, permissions, isAdmin, planType, hiddenWidgets) {
  // User customization - hidden by preference
  if (hiddenWidgets.includes(widget.id)) {
    return false;
  }

  // Admin bypass (but still respect plan_type)
  if (isAdmin) {
    if (widget.plan_type && !widget.plan_type.includes(planType)) {
      return false;
    }
    return true;
  }

  // Check plan compatibility first
  if (widget.plan_type && !widget.plan_type.includes(planType)) {
    return false;
  }

  // Check permission
  if (widget.permission) {
    return permissions.includes(widget.permission);
  }

  return true;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN HOOK
   Returns filtered widgets for current user
   ═══════════════════════════════════════════════════════════════════ */
export function useVisibleWidgets() {
  const permissions = useSelector((s) => s.auth.permissions || []);
  const planType = useSelector((s) => s.auth.plan_type);
  const role = useSelector((s) => s.auth.role);
  const hiddenWidgets = useSelector(
    (s) => s.ui.dashboardCustomization?.hiddenWidgets || []
  );
  
  const isAdmin = role === "admin";

  return useMemo(() => {
    // Filter KPIs
    const kpis = KPI_WIDGETS
      .filter((w) => canSeeWidget(w, permissions, isAdmin, planType, hiddenWidgets))
      .sort((a, b) => b.priority - a.priority);

    // Filter tables
    const tables = TABLE_WIDGETS
      .filter((w) => canSeeWidget(w, permissions, isAdmin, planType, hiddenWidgets))
      .sort((a, b) => b.priority - a.priority);

    // Filter header actions
    const headerActions = HEADER_ACTIONS
      .filter((a) => canSeeWidget(a, permissions, isAdmin, planType, hiddenWidgets));

    return { kpis, tables, headerActions };
  }, [permissions, planType, isAdmin, hiddenWidgets]);
}