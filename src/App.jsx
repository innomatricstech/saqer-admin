// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./pages/ProtectedRoute";

// Pages
import CreateAdmin from "./pages/CreateAdmin";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import AddCustomer from "./pages/AddCustomer";
import CustomersVehicles from "./pages/CustomersVehicles";
import Drivers from "./pages/Drivers";
import Bookings from "./pages/Bookings";
import Rewards from "./pages/Rewards";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";
import AdminLoginPage from "./pages/AdminLogin";

function Layout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <div className="ml-64 flex flex-col min-h-screen">
        <Navbar />
        <main key={location.pathname} className="p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/create-admin" element={<CreateAdmin />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/add" element={<AddCustomer />} />
          <Route path="customers/vehicles" element={<CustomersVehicles />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help-support" element={<HelpSupport />} />
          <Route path="*" element={<Navigate to="/customers" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin-login" replace />} />
      </Routes>
    </Router>
  );
}
