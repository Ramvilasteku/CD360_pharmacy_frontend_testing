import { Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "../ReceptionistComponents/DashboardLayout";
import DashboardHome from "../ReceptionistComponents/DashboardHome";
import Appointments from "../ReceptionistComponents/Appointments/Appointment";
import Attendance from "../ReceptionistComponents/Attendance";
import TaskReview from "../ReceptionistComponents/TaskReview";
import Login from "../ReceptionistComponents/StaffDashboardLogin";
import ServiceRequest from "../ReceptionistComponents/ServiceRequest";
import ProtectedRoute from '../ReceptionistComponents/ProtectedRoute';
import Document from '../ReceptionistComponents/Documents';
import Profile from '../ReceptionistComponents/Profile';
import Appointmentdoctorschedule from '../ReceptionistComponents/Appointmentdoctorschedule';
import Bills from "../ReceptionistComponents/Bills";
import Clients from '../ReceptionistComponents/Clients/Clients';
import Slots from '../ReceptionistComponents/TimeSlots/TimeSlots';
import Prescription from '../ReceptionistComponents/AddPrescription';
import AddMedicine from '../ReceptionistComponents/AddMedicine';
import AddTests from '../ReceptionistComponents/AddTests';
// import Ipd from '../ReceptionistComponents/IPD/Ipd';
import BedAllocation from '../ReceptionistComponents/IPD/BedAllocation.js';
import BedCreation from '../ReceptionistComponents/IPD/BedCreation.js';
import IpdAdmission from '../ReceptionistComponents/IPD/IpdAdmission.js';
import IpdBills from '../ReceptionistComponents/IPD/IpdBills.js';
import IpdDetails from '../ReceptionistComponents/IPD/IpdDetails.js';
import IpdPayments from '../ReceptionistComponents/IPD/Payments.js';


export default function ReceptionistAppRoutes() {
  return (
    <>
    <Routes>
      <Route
        path="/dashboard"
        element={
          // <ProtectedRoute>
          // </ProtectedRoute>
            <DashboardLayout />
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="task-review" element={<TaskReview />} />
        <Route path="service-request" element={<ServiceRequest />} />
        <Route path="documents" element={<Document />} />
        <Route path="schedule" element={<Appointmentdoctorschedule />} />
         <Route path="bills" element={<Bills />} />
         <Route path="clients" element={<Clients />} />
        <Route path="add-slots" element={<Slots />} />


        <Route path="profile" element={<Profile />} />
        <Route path="medicine" element={<AddMedicine />} />
        <Route path="medicaltests" element={<AddTests />} />
        <Route path="prescription" element={<Prescription />} />
        {/* <Route path="calculator" element={<Calculator />} /> */}

       
                <Route path="ipd/bed-creation" element={<BedCreation />} />
                <Route path="ipd/ipd-admission" element={<IpdAdmission />} />
                <Route path="ipd/bed-allocation" element={<BedAllocation />} />
                <Route path="ipd/ipd-bills" element={<IpdBills />} />
                <Route path="ipd/ipd-details" element={<IpdDetails />} />
                <Route path="ipd/ipd-payments" element={<IpdPayments />} />

      </Route>

      <Route path="*" element={<h2>404 | Page Not Found</h2>} />
      </Routes>
  </>);
}
