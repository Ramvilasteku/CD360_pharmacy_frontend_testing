// src/Routes/PharmacyStaffRoutes.jsx
//
// The routes for pharmacy staff — any role that has the pharmacy module (pharmacist,
// chemist, cashier, or a role made later), mounted in App.js at /pharmacy/*.
// Login already sends these roles to /pharmacy/dashboard (components/Otpverification.js).
//
//   /pharmacy/dashboard               the pharmacy dashboard
//   /pharmacy/<screen>                every screen in pharmacyRoutes.jsx — add one there and it
//                                     mounts here and shows in the sidebar, no edit to this file
//   /pharmacy/profile                 My profile   ┐ the "Profile" category, for every staff member
//   /pharmacy/attendance              Attendance   ┘ (pharmacy/account/*, API: routes/Pharmacy/pharmacyAccount.js —
//                                                    the doctor/receptionist staff screens are left as they are)
//
// Everything sits inside PharmacyShell (sidebar + top bar + role switch), and takes its colours
// from theme/appColors.js.
// Doctor, receptionist and admin routes are untouched — they keep their own files.

import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import PharmacyShell from "../pharmacy/shell/PharmacyShell";
import PharmacyDashboard from "../Redux/dashboard/PharmacyDashboard";
import MyProfile from "../pharmacy/account/MyProfile";
import MyAttendance from "../pharmacy/account/MyAttendance";
import AccessDenied from "../pharmacy/shared/AccessDenied";
import { pharmacyRoutes } from "./pharmacyRoutes";
import { usePharmacyAccess } from "./usePharmacyRoutes";

export default function PharmacyStaffRoutes() {
  // 25 Oct 2026 — every screen used to be mounted here unconditionally, so a page missing
  // from the sidebar was still reachable by typing its URL. Hiding a link is not a guard.
  //
  // Every route is still MOUNTED (so the URL resolves and the shell renders normally); the
  // ones this user may not open render AccessDenied instead of the screen. Mounting them
  // all keeps the 404 fallback meaning "no such page" rather than "no access", which are
  // different things and should not look the same.
  //
  // The server guards each endpoint regardless — this is so the user is told, not so the
  // data is protected.
  const { canOpenPath } = usePharmacyAccess();

  return (
    <Routes>
      <Route element={<PharmacyShell />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PharmacyDashboard />} />

        {/* "pharmacy/suppliers" → "suppliers", "pharmacy/sales/*" → "sales/*" */}
        {pharmacyRoutes
          .filter((r) => r.path !== "pharmacy")
          .map((r) => (
            <Route
              key={r.path}
              path={r.path.replace(/^pharmacy\//, "")}
              element={
                canOpenPath(r.path)
                  ? r.element
                  : <AccessDenied what={r.label} permission={r.permission_key} />
              }
            />
          ))}

        {/* every staff member's own pages */}
        <Route path="profile" element={<MyProfile />} />
        <Route path="attendance" element={<MyAttendance />} />

        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}