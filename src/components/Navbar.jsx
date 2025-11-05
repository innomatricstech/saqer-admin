// src/components/Navbar.jsx
import React from "react";
import { FaSearch, FaBell } from "react-icons/fa";

export default function Navbar() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md">
      {/* ✅ Constrain width inside */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
        {/* Left: Title + Search */}
        <div className="flex items-center gap-4">
          <h2 className="text-xl md:text-2xl font-semibold text-white tracking-wide">
            Admin Dashboard
          </h2>

          {/* Search input */}
          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-4 py-1.5 md:py-2 rounded-lg text-sm bg-white/20 text-white placeholder-white/70 
                         focus:outline-none focus:ring-2 focus:ring-white/40 w-44 md:w-64 transition-all"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80" />
          </div>
        </div>

        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Bell icon */}
          <button className="relative hover:scale-110 transition-transform">
            <FaBell className="text-white text-lg md:text-xl" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] text-white px-1.5 py-0.5 rounded-full">
              3
            </span>
          </button>

          {/* Profile */}
          <div className="flex items-center gap-2 cursor-pointer">
            <img
              src="https://i.pravatar.cc/40"
              alt="Admin Avatar"
              className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-white object-cover"
            />
            <div className="hidden sm:block text-white leading-tight">
              <p className="font-medium text-sm">Admin</p>
              <p className="text-xs text-white/80">Superuser</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
