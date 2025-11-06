// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const isLogged = localStorage.getItem("isAdminLoggedIn") === "true";

  if (!isLogged) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}
