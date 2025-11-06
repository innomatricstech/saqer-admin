// src/index.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AdminLogin } from "./context/AuthContext";
import "./index.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminLogin>
      <App />
    </AdminLogin>
  </React.StrictMode>
);
