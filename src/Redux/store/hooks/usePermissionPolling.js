// src/Redux/hooks/usePermissionPolling.js

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { refreshAccess } from "../slices/authSlice";

/**
 * ═══════════════════════════════════════════════════════════════════
 * usePermissionPolling Hook
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Automatically refreshes user permissions from the backend WITHOUT
 * requiring the user to logout and login again.
 * 
 * HOW IT WORKS:
 * 1. On mount → fetches fresh permissions once
 * 2. Every 60 seconds → fetches fresh permissions (silent background)
 * 3. When tab regains focus → fetches immediately (user came back)
 * 4. On unmount → cleans up timer and event listener
 * 
 * CALLS: GET /api/getMyAccess
 * UPDATES: Redux auth slice (which updates ALL components using usePermission)
 * 
 * USAGE: Call ONCE at app root (App.js)
 *   function App() {
 *     usePermissionPolling();   // ← starts polling for whole app
 *     return <YourRoutes />;
 *   }
 * ═══════════════════════════════════════════════════════════════════
 */
export function usePermissionPolling(intervalMs = 60_000) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);

  useEffect(() => {
    // Only poll if user is logged in
    if (!isAuthenticated) return;

    // ─── Initial refresh on mount ───────────────────────────────
    dispatch(refreshAccess());

    // ─── Polling every 60 seconds ───────────────────────────────
    const timer = setInterval(() => {
      dispatch(refreshAccess());
    }, intervalMs);

    // ─── Refresh immediately when user comes back to the tab ───
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        dispatch(refreshAccess());
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ─── Cleanup on unmount or logout ──────────────────────────
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch, isAuthenticated, intervalMs]);
}