// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Drivers from "./pages/Drivers";
import Rewards from "./pages/Rewards";
import Bookings from "./pages/Bookings";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";

// CustomersVehicles page
import CustomersVehicles from "./pages/CustomersVehicles";

// Optional pages (implement if you want add/edit flows)
// import AddVehicle from "./pages/vehicles/AddVehicle";
// import EditVehicle from "./pages/vehicles/EditVehicle";

function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
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
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />

          {/* Customers */}
          <Route path="customers" element={<Customers />} />

          {/* Customers -> Vehicles */}
          <Route path="customers/vehicles" element={<CustomersVehicles />} />
          {/* Uncomment and implement these when ready:
            <Route path="customers/vehicles/add" element={<AddVehicle />} />
            <Route path="customers/vehicles/:id/edit" element={<EditVehicle />} />
          */}

          <Route path="drivers" element={<Drivers />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="rewards" element={<Rewards />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help-support" element={<HelpSupport />} />
        </Route>
      </Routes>
    </Router>
  );
}
