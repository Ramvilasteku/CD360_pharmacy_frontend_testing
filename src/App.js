import './App.css';
import Login from './components/Login';
import PatientRegister from './components/PatientRegister';
import AdminDashboard from './components/AdminDashboard';
import OtpVerification from './components/Otpverification';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from "./StaffComponents/DashboardLayout";
import DashboardHome from "./StaffComponents/DashboardHome";
import Appointments from "./StaffComponents/Appointment";
import Attendance from "./StaffComponents/Attendance";
import TaskReview from "./StaffComponents/TaskReview";
// import Login from "./StaffComponents/StaffDashboardLogin";
import ServiceRequest from "./StaffComponents/ServiceRequest";
import Calculator from './StaffComponents/Calculator';
import ProtectedRoute from './StaffComponents/ProtectedRoute';
import Document from './StaffComponents/Documents';
import Profile from './StaffComponents/Profile';
// import Sidebar from "./ClientComponents/Sidebar";
// import Dashboard from "./Pages/Dashboard";
// import Documents from "./Pages/Documents";
// import ClientServiceRequestPage from './Pages/ClientServiceRequest';
// import Reviews from "./Pages/Reviews";
// import Bills from "./Pages/Bills";
// import Payments from "./Pages/Payments";
// import AppointmentsPage from "./Pages/Appointments/Appointment";
import { SocketProvider } from "./context/SocketContext";
import NotificationListener from "./NotificationListener";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AppRoutes from './Routes/AppRoutes'; // or Routes/AppRoutes
import ReceptionistAppRoutes from './Routes/ReceptionistAppRoutes';
import Sidebar from "./ClientComponents/Components/DashboardLayout";
import Dashboard from "./ClientComponents/Dashboard/Dashboard";
import Documents from "./ClientComponents/Documents";
import Reviews from "./ClientComponents/Reviews";
import Bills from "./ClientComponents/Bills";
import AppointmentsPage from "./ClientComponents/Appointments/Appointment";
import Navbar from "./landingcomponents/components/Navbar";
import Hero from "./landingcomponents/components/Hero";
import FeaturesStrip from "./landingcomponents/components/FeaturesStrip";
import DigitalVisibilityPlan from './landingcomponents/components/DigitalVisibilityPlan';
import FeatureSections from "./landingcomponents/components/FeatureSections";
import CTABanner from "./landingcomponents/components/CTABanner";
import Comparison from "./landingcomponents/components/Comparison";
import WhyUs from "./landingcomponents/components/WhyUs";
import Footer from "./landingcomponents/components/Footer";
import './Styles/global.css';
import SuperAdminLogin from "./Pages/Login";
import SuperAdminDashboard from './Pages/SuperAdminDashboard';
import ClientPrescriptions from './ClientComponents/ClientPrescriptions';
import IpdAdmission from './ClientComponents/Ipd/IpdAdmission';
import IpdClientBills from './ClientComponents/Ipd/ipdbills';
import IpdPayments from './ClientComponents/Ipd/IpdPayments';

import AboutCareDesk360 from './landingcomponents/components/About';
import Register from './landingcomponents/components/Register';
import Payment from './landingcomponents/components/payment';
import PaymentStatus from './payments/paymentstatus';


function App() {
  const userId =
    localStorage.getItem("adminId") ||
    localStorage.getItem("userId") ||
    localStorage.getItem("id");

function LandingPage() {
    return (
      <div>
        <Navbar />
        <Hero />
        <FeaturesStrip />
        <FeatureSections />
        <CTABanner />
        {/* <Comparison /> */}
        <AboutCareDesk360 />
        <WhyUs />
        <Footer />
      </div>
    );
  }

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/admin" />;
}


  return (
    <BrowserRouter>
      {/* LISTEN FOR SOCKET EVENTS */}
      <NotificationListener />

      {/* REQUIRED FOR TOASTS */}
      <ToastContainer position="top-right" autoClose={5000} />
      <SocketProvider userId={userId}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<Comparison />} />
          <Route path="/paymentstatus" element={<PaymentStatus />} />
        <Route path="/admin" element={<SuperAdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
          <Route path='/login' element={<Login />} />
          <Route path='/otp-verify' element={<OtpVerification />} />
          <Route path='/register' element={<PatientRegister />} />
          <Route path='/AdminDashboard' element={<AdminDashboard />} />
          <Route path="/doctor/*" element={<AppRoutes />} />
          <Route path="/receptionist/*" element={<ReceptionistAppRoutes />} />

          <Route path="/client" element={<Sidebar />}>
            <Route index element={<Navigate to="dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="documents" element={<Documents />} />
            <Route path="appointment" element={<AppointmentsPage />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="bills" element={<Bills />} />
            <Route path="prescriptions" element={<ClientPrescriptions />} />
             <Route path="ipdhistory" element={<IpdAdmission />} />
            <Route path="ipdbills" element={<IpdClientBills />} />
            <Route path="ipdpayments" element={<IpdPayments />} />
          </Route>
          <Route path="/" element={<Register />} />

        <Route
          path="/payment/:registrationId"
          element={<Payment />}
        />
        </Routes>

      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;