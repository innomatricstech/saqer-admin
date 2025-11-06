// src/layouts/MainLayout.jsx
import React from "react";
import Sidebar from "../components/Sidebar";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main content: add left margin equal to sidebar width (w-64 -> ml-64).
          Use md:ml-64 if you want the sidebar only fixed on md+ screens.
          Add safe padding and max-w container as needed.
      */}
      <main className="ml-64 p-6 transition-all duration-200">
        {/* optional header inside main if needed */}
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
