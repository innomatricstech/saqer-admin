// src/components/Sidebar.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaCarSide,
  FaGift,
  FaClipboardList,
  FaQuestionCircle,
  FaTimes,
  FaCar,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/saqer.jpeg"; // ensure this file exists
import { useBookings } from "../context/BookingsContext"; // adjust path if needed

const menuItems = [
  { key: "dashboard", label: "Dashboard", path: "/", icon: <FaTachometerAlt /> },
  { key: "customers", label: "Customers", path: "/customers", icon: <FaUsers /> },
  { key: "vehicles", label: "Vehicles", path: "/vehicles", icon: <FaCar /> },
  { key: "drivers", label: "Drivers", path: "/drivers", icon: <FaCarSide /> },
  { key: "rewards", label: "Rewards", path: "/rewards", icon: <FaGift /> },
  { key: "bookings", label: "Bookings", path: "/bookings", icon: <FaClipboardList />},
  { key: "help", label: "Help & Support", path: "/help-support", icon: <FaQuestionCircle /> },
];

const listVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.03 } },
};
const itemVariants = { hidden: { opacity: 0, y: -6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.26 } } };

export default function Sidebar() {
  const location = useLocation();
  const { badgeCount = 0 } = useBookings(); // live booking badge from context
  const [mobileOpen, setMobileOpen] = useState(false);

  // toggle via custom event (keeps compatibility with previous toggle-sidebar usage)
  useEffect(() => {
    function onToggle(e) {
      if (!e?.detail) return;
      setMobileOpen(Boolean(e.detail.open));
    }
    window.addEventListener("toggle-sidebar", onToggle);
    return () => window.removeEventListener("toggle-sidebar", onToggle);
  }, []);

  // close mobile drawer on navigation
  useEffect(() => setMobileOpen(false), [location.pathname]);

  // prevent background scroll when mobile drawer is open
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = mobileOpen ? "hidden" : prev || "";
    return () => {
      el.style.overflow = prev || "";
    };
  }, [mobileOpen]);

  // allow Escape to close mobile drawer
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    if (mobileOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const drawerVariants = {
    hidden: { x: "-100%" },
    visible: { x: 0, transition: { type: "spring", stiffness: 280, damping: 28 } },
    exit: { x: "-100%", transition: { type: "tween", duration: 0.16 } },
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-gray-100 p-6 shadow-2xl z-30">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo */}
          <div className="mb-6 select-none">
            <div className="flex flex-col items-center gap-3">
              <img
                src={logo}
                alt="Saqer Logo"
                loading="lazy"
                className="w-28 h-auto object-contain rounded-md shadow-lg bg-white/5 ring-1 ring-white/5"
              />
              <div className="text-center">
                <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                  Saqer <span className="text-indigo-300">Service</span>
                </h1>
                <div className="text-xs text-slate-300 mt-1">Admin dashboard</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <motion.nav className="flex-1 mt-2" aria-label="Main navigation" initial="hidden" animate="visible" variants={listVariants}>
            <div className="space-y-2">
              {menuItems.map((item, idx) => {
                const isActive = location.pathname === item.path;
                return (
                  <motion.div key={item.key} variants={itemVariants} custom={idx}>
                    <div className="relative group">
                      <Link
                        to={item.path}
                        className={`relative z-10 flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 transform ${
                          isActive ? "text-white" : "text-slate-200 hover:translate-x-1 hover:scale-[1.01]"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                        title={item.label}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-bg"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600/95 shadow-lg"
                            initial={false}
                            aria-hidden
                          />
                        )}

                        <motion.span
                          className={`relative z-10 p-2 rounded-md bg-white/6 text-lg flex items-center justify-center ${isActive ? "bg-white/10" : "group-hover:bg-white/8"}`}
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <motion.span className="inline-block" initial={{ rotate: 0 }} whileHover={{ rotate: 10 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} aria-hidden>
                            {item.icon}
                          </motion.span>
                        </motion.span>

                        <span className="relative z-10 font-medium leading-tight">{item.label}</span>

                        {/* Badge (Bookings) */}
                        {item.hasBadge && (
                          <span className="relative z-10 ml-auto flex items-center gap-2">
                            {badgeCount > 0 ? (
                              <span role="status" aria-label={`${badgeCount} active bookings`} className="inline-flex items-center gap-1">
                                <span className="text-xs font-semibold">{badgeCount}</span>
                                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-pulse animate-pulse" aria-hidden />
                              </span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-rose-500/90 animate-ping-slow" aria-hidden />
                            )}
                          </span>
                        )}
                      </Link>

                      {/* simple tooltip on hover (desktop) */}
                      <div className="hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 pointer-events-none">
                        <div className="opacity-0 group-hover:opacity-100 transform transition-all duration-150">
                          <div className="bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-md shadow-md whitespace-nowrap" aria-hidden>
                            {item.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.nav>

          <div className="mt-6 text-xs text-slate-400">Version 1.0</div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />

            <motion.aside
              className="fixed top-0 left-0 h-full w-4/5 max-w-xs bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-gray-100 z-50 shadow-2xl flex flex-col p-4"
              role="dialog"
              aria-modal="true"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={drawerVariants}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Saqer Logo" loading="lazy" className="w-10 h-10 object-contain rounded-md bg-white/5 shadow-sm" />
                  <div>
                    <h2 className="text-base font-bold leading-tight">SaqerService</h2>
                    <div className="text-xs text-slate-400">Admin panel</div>
                  </div>
                </div>

                <button onClick={() => setMobileOpen(false)} className="p-2 bg-white/6 rounded-md" aria-label="Close menu">
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              <motion.nav className="flex-1 space-y-2 overflow-y-auto pb-4" initial="hidden" animate="visible" variants={listVariants} aria-label="Mobile navigation">
                {menuItems.map((item, idx) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <motion.div key={item.key} variants={itemVariants} custom={idx}>
                      <Link
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors transform ${
                          isActive ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg" : "hover:bg-white/5 text-slate-200"
                        }`}
                        title={item.label}
                      >
                        <span className="p-2 rounded-md bg-white/6 text-lg flex items-center justify-center">
                          <motion.span whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.98 }}>
                            {item.icon}
                          </motion.span>
                        </span>

                        <span className="font-medium">{item.label}</span>

                        {item.hasBadge && (
                          <span className="ml-auto">
                            {badgeCount > 0 ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="text-xs font-semibold">{badgeCount}</span>
                                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                              </span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-rose-500/90 animate-ping" />
                            )}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.nav>

              <div className="border-t border-white/6 pt-4 text-sm text-gray-300">
                <div className="text-xs text-slate-400">Need help? Visit Help & Support</div>
                <Link to="/help-support" onClick={() => setMobileOpen(false)} className="block mt-2 underline">
                  Open Support
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* helper styles */}
      <style>{`
        @keyframes pulse-soft { 0% { box-shadow: 0 0 0 0 rgba(255, 99, 132, 0.35);} 70% { box-shadow: 0 0 0 10px rgba(255, 99, 132, 0);} 100% { box-shadow: 0 0 0 0 rgba(255, 99, 132, 0);} }
        .shadow-pulse { animation: pulse-soft 1.8s infinite; }
        .animate-ping-slow { animation: ping 1.6s cubic-bezier(0,0,0.2,1) infinite; }
        @media (max-width: 420px) { aside { width: 78vw; max-width: 260px; } }
        .shadow-2xl { box-shadow: 0 18px 50px rgba(2,6,23,0.55); }
      `}</style>
    </>
  );
}
