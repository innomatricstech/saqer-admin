// src/index.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AdminLogin } from "./context/AuthContext";
import { BookingsProvider } from "./context/BookingsContext";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Keep AdminLogin (auth) at the top so auth is available to children */}
    <AdminLogin>
      {/* Provide bookings context to the app */}
      <BookingsProvider>
        <App />
      </BookingsProvider>
    </AdminLogin>
  </React.StrictMode>
);
