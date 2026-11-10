import React from "react";
import { Route } from "react-router-dom";
import { useSelector } from "react-redux";

// Renders only routes the current user has permission for.
export function useRenderRoutes(routes) {
  const permissions = useSelector((s) => s.auth?.permissions || []);
  const modules     = useSelector((s) => s.auth?.modules     || []);

  const has = (perm) => !perm || permissions.includes(perm);
  const hasModule = (mod) => !mod || modules.includes(mod);

  return routes
    .filter((r) => hasModule(r.module) && has(r.perm))
    .map((r) => <Route key={r.path} path={r.path} element={r.element} />);
}