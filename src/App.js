import "./App.css";
import React, { useEffect } from "react";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import OtpVerification from "./components/Otpverification";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./StaffComponents/DashboardLayout";
import DashboardHome from "./StaffComponents/DashboardHome";
import Appointments from "./StaffComponents/Appointment";
import Attendance from "./StaffComponents/Attendance";
import TaskReview from "./StaffComponents/TaskReview";
// import Login from "./StaffComponents/StaffDashboardLogin";
import ServiceRequest from "./StaffComponents/ServiceRequest";
import Calculator from "./StaffComponents/Calculator";
import ProtectedRoute from "./StaffComponents/ProtectedRoute";
import Document from "./StaffComponents/Documents";
import Profile from "./StaffComponents/Profile";
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
import { createTheme, ThemeProvider } from "@mui/material/styles";
import AppRoutes from "./Routes/AppRoutes"; // or Routes/AppRoutes
import ReceptionistAppRoutes from "./Routes/ReceptionistAppRoutes";
import Sidebar from "./ClientComponents/Components/DashboardLayout";
import Dashboard from "./ClientComponents/Dashboard/Dashboard";
import Documents from "./ClientComponents/Documents";
import Reviews from "./ClientComponents/Reviews";
import Bills from "./ClientComponents/Bills";
import AppointmentsPage from "./ClientComponents/Appointments/Appointment";
import Navbar from "./landingcomponents/components/Navbar";
import Hero from "./landingcomponents/components/Hero";
import FeaturesStrip from "./landingcomponents/components/FeaturesStrip";
import DigitalVisibilityPlan from "./landingcomponents/components/DigitalVisibilityPlan";
import FeatureSections from "./landingcomponents/components/FeatureSections";
import CTABanner from "./landingcomponents/components/CTABanner";
import Pricing from "./landingcomponents/components/Pricing";
import WhyUs from "./landingcomponents/components/WhyUs";
import Footer from "./landingcomponents/components/Footer";
import "./Styles/global.css";
import SuperAdminLogin from "./Pages/Login";
import SuperAdminDashboard from "./Pages/SuperAdminDashboard";
import ClientPrescriptions from "./ClientComponents/ClientPrescriptions";
import AboutCareDesk360 from "./landingcomponents/components/About";
import Register from "./landingcomponents/components/Register";
import Payment from "./landingcomponents/components/payment";
import PaymentStatus from "./payments/paymentstatus";
import Comparison from "./landingcomponents/components/Comparison";
import OurWork from "./landingcomponents/components/OurWork";
// PharmacyDashboard is mounted by Routes/PharmacyStaffRoutes.jsx now, not here.
import { usePermissionPolling } from "./Redux/store/hooks/usePermissionPolling";
// import PatientRegister from "./components/PatientRegister";

// import CD360GroWth1 from "./LandingPages/CD360Growth1";
// import CareDesk360Landing from "./LandingPages/CD360Growth2";
import GrowthQuest from "./landingcomponents/components/growthQuest/GrowthQuest";

/* ═══════════════════════════════════════════════════════════════════
   ⭐ NEW REDUX IMPORTS
   ═══════════════════════════════════════════════════════════════════ */
import { PersistGate } from "redux-persist/integration/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { store, persistor } from "./Redux/store";
import { bootstrapFromLocalStorage } from "./Redux/store/slices/authSlice";

// redux selections, dispatches,
import { Provider, useDispatch, useSelector } from "react-redux";
import { refreshAccess } from "./Redux/store/slices/authSlice";
import Sales from "./pharmacy/sales/Sales";
// 26 Oct 2026 — was PharmacyLayout. That layout mounted every pharmacy screen with no
// permission check, and had no role switch and no Profile / Attendance links. The shell
// that has them (pharmacy/shell/*) was written to replace it, but App.js was never
// switched over, so none of it had ever rendered. PharmacyLayout and
// PharmacySidebarBlock are left in place, now unused.
import PharmacyStaffRoutes from "./Routes/PharmacyStaffRoutes";
import Medicines from "./pharmacy/Medicines/Medicines";

// import Medicines from "./components/pharmacy/Medicines";

/* ═══════════════════════════════════════════════════════════════════
   ⭐ REACT QUERY CLIENT
   Handles server data fetching with automatic caching
   ═══════════════════════════════════════════════════════════════════ */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,           // Data fresh for 30 seconds
      cacheTime: 5 * 60 * 1000,        // Cache kept for 5 minutes
      refetchOnWindowFocus: false,     // Don't refetch when tab regains focus
      retry: 1,                        // Retry failed requests once
    },
    mutations: {
      retry: 0,
    },
  },
});

/* ═══════════════════════════════════════════════════════════════════
   ⭐ SERVICE AGREEMENT PAGE
   Assets are served from public/agreement-assets.
   CRA uses process.env.PUBLIC_URL (Vite's import.meta.env.BASE_URL
   does not exist in a CRA build).
   ═══════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════
   ⭐ LOADING COMPONENT - Shown during Redux rehydration
   ═══════════════════════════════════════════════════════════════════ */
const AppLoading = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#f7f5f5",
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: "50px",
          height: "50px",
          border: "4px solid #3f6f7a",
          borderTop: "4px solid transparent",
          borderRadius: "50%",
          margin: "0 auto 20px",
          animation: "spin 1s linear infinite",
        }}
      />
      <p style={{ color: "#3f6f7a", fontWeight: 600 }}>Loading CareDesk360...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   ⭐ INNER APP COMPONENT - Has access to Redux dispatch
   Bootstraps auth from localStorage on mount for INSTANT pharmacy display
   ═══════════════════════════════════════════════════════════════════ */
function AppContent() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);

  const userId =
    localStorage.getItem("adminId") ||
    localStorage.getItem("userId") ||
    localStorage.getItem("id");

  /* Bootstrap Redux from localStorage on app start */
  useEffect(() => {
    dispatch(bootstrapFromLocalStorage());
  }, [dispatch]);

  /* ⭐ POLLING — refresh access every 60 seconds */
  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(refreshAccess());
    const interval = setInterval(() => dispatch(refreshAccess()), 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, dispatch]);

  function LandingPage() {
    return (
      <div>
        <Navbar />
        <Hero />
        <FeaturesStrip />
        <FeatureSections />
        <CTABanner />
        <OurWork />
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
      <NotificationListener />
      <SocketProvider userId={userId}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/aboutus" element={<AboutCareDesk360 />} />
          <Route path="/whyus" element={<WhyUs />} />
          <Route path="/paymentstatus" element={<PaymentStatus />} />
          <Route path="/admin" element={<SuperAdminLogin />} />
          <Route path="/clinic-growth-score" element={<GrowthQuest />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/otp-verify" element={<OtpVerification />} />

       
          {/* ⭐ Admin — single wildcard, AdminDashboard handles content internally */}
          <Route path="/AdminDashboard/*" element={<AdminDashboard />} />

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
          </Route>

          <Route path="/payment/:registrationId" element={<Payment />} />

          {/* Pharmacy-only staff (pharmacist, chemist, cashier).
              PharmacyStaffRoutes mounts the whole staff app: the shell (sidebar + top bar +
              role switch), every screen in Routes/pharmacyRoutes.jsx, and the Profile and
              Attendance pages. It also renders AccessDenied for a screen this role may not
              open — the block that used to be here mounted all of them unguarded, so a page
              hidden from the sidebar was still reachable by typing its URL. */}
          <Route path="/pharmacy/*" element={<PharmacyStaffRoutes />} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ⭐ MAIN APP - Wraps everything with Redux + React Query providers
   ═══════════════════════════════════════════════════════════════════ */
function App() {
  usePermissionPolling();
  return (
    <Provider store={store}>
      <PersistGate loading={<AppLoading />} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <AppContent />
          {process.env.NODE_ENV === "development" && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;