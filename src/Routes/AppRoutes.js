
import { Routes, Route } from "react-router-dom";

import DashboardLayout from "../StaffComponents/DashboardLayout";
import DashboardHome from "../StaffComponents/DashboardHome";
import Appointments from "../StaffComponents/Appointment";
import Attendance from "../StaffComponents/Attendance";
import TaskReview from "../StaffComponents/TaskReview";
import ServiceRequest from "../StaffComponents/ServiceRequest";
import Document from "../StaffComponents/Documents";
import Profile from "../StaffComponents/Profile";
import AddPrescription from "../StaffComponents/CreatePrescription";
import Doctorvisits from "../StaffComponents/IPD/DoctorVisits";

import { usePharmacyAccess } from "./usePharmacyRoutes";

export default function AppRoutes() {
  // Get pharmacy routes available to the logged-in user
  const { visibleRoutes = [] } = usePharmacyAccess();

  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="task-review" element={<TaskReview />} />
        <Route path="service-request" element={<ServiceRequest />} />
        <Route path="documents" element={<Document />} />
        <Route path="profile" element={<Profile />} />
        <Route path="prescription" element={<AddPrescription />} />
        <Route path="doctorvisits" element={<Doctorvisits />} />

        {/* Pharmacy routes accessible to doctor */}
        {visibleRoutes.map((r) => (
          <Route
            key={r.path}
            path={r.path}
            element={r.element}
          />
        ))}
      </Route>

      <Route path="*" element={<h2>404 | Page Not Found</h2>} />
    </Routes>
  );
}
