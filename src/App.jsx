// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Outlet,
  Navigate,
} from "react-router-dom";

// Components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./pages/ProtectedRoute";

// Pages
import CreateAdmin from "./pages/CreateAdmin";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import AddCustomer from "./pages/AddCustomer";
import AddVehicle from "./pages/AddVehicle";
import Drivers from "./pages/Drivers";
import Bookings from "./pages/Bookings";
import Rewards from "./pages/Rewards";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";
import AdminLoginPage from "./pages/AdminLogin";
import Profile from "./pages/Profile"; // ✅ Added

// ---------- LAYOUT COMPONENT ----------
function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar (always visible on desktop) */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-h-screen ml-0 md:ml-64 transition-all duration-300">
        {/* Navbar */}
        <Navbar />

        {/* Page content */}
        <main
          key={location.pathname}
          className="p-4 sm:p-6 flex-1 overflow-x-hidden"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ---------- MAIN APP ROUTING ----------
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/create-admin" element={<CreateAdmin />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />

        {/* Protected Layout for Authenticated Admins */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Dashboard />} />

          {/* Customers */}
          <Route path="customers" element={<Customers />} />
          <Route path="customers/add" element={<AddCustomer />} />

          {/* Add Vehicle */}
          <Route path="customers/vehicles/add" element={<AddVehicle />} />

          {/* Drivers */}
          <Route path="drivers" element={<Drivers />} />

          {/* Bookings */}
          <Route path="bookings" element={<Bookings />} />

          {/* Rewards */}
          <Route path="rewards" element={<Rewards />} />

          {/* Profile (new page) */}
          <Route path="profile" element={<Profile />} />

          {/* Settings */}
          <Route path="settings" element={<Settings />} />

          {/* Help & Support */}
          <Route path="help-support" element={<HelpSupport />} />

          {/* Default redirect inside protected area */}
          <Route path="*" element={<Navigate to="/customers" replace />} />
        </Route>

        {/* Catch-all: redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/admin-login" replace />} />
      </Routes>
    </Router>
  );
}
