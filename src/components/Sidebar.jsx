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
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/saqer.jpeg"

const menuItems = [
  { label: "Dashboard", path: "/", icon: <FaTachometerAlt /> },
  { label: "Customers", path: "/customers", icon: <FaUsers /> },
  { label: "Drivers", path: "/drivers", icon: <FaCarSide /> },
  { label: "Rewards", path: "/rewards", icon: <FaGift /> },
  { label: "Bookings", path: "/bookings", icon: <FaClipboardList /> },
  { label: "Help & Support", path: "/help-support", icon: <FaQuestionCircle /> },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onToggle(e) {
      if (!e?.detail) return;
      setMobileOpen(Boolean(e.detail.open));
    }
    window.addEventListener("toggle-sidebar", onToggle);
    return () => window.removeEventListener("toggle-sidebar", onToggle);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = mobileOpen ? "hidden" : prev || "";
    return () => {
      el.style.overflow = prev || "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    if (mobileOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const drawerVariants = {
    hidden: { x: "-100%" },
    visible: { x: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
    exit: { x: "-100%", transition: { type: "tween", duration: 0.18 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04 } }),
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-gray-100 p-6 shadow-2xl z-30">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo section */}
          <div className="mb-6 select-none">
            <div className="flex flex-col items-center gap-3">
              <img
                src={logo}
                alt="Saqer Logo"
                className="w-28 h-auto object-contain rounded-md shadow-sm bg-white/5"
              />
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Saqer<span className="text-blue-300">Service</span>
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1" aria-label="Main navigation">
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <motion.div
                  key={item.path}
                  custom={idx}
                  initial="hidden"
                  animate="visible"
                  variants={itemVariants}
                >
                  <Link
                    to={item.path}
                    className={`group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 select-none ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                        : "text-slate-200 hover:bg-white/5 hover:translate-x-1"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span
                      className={`p-2 rounded-md bg-white/6 text-lg ${
                        isActive ? "bg-white/10" : "group-hover:bg-white/8"
                      } flex items-center justify-center`}
                    >
                      {item.icon}
                    </span>

                    <span className="font-medium">{item.label}</span>

                    {isActive && (
                      <span
                        className="ml-auto w-2 h-8 rounded-full bg-white/20 shadow-inner"
                        aria-hidden
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

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
                <div className="flex items-center gap-2">
                  <img
                    src="/mnt/data/saqer.jpeg"
                    alt="Saqer Logo"
                    className="w-10 h-10 object-contain rounded-md"
                  />
                  <h2 className="text-lg font-bold">SaqerService</h2>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 bg-white/6 rounded-md"
                  aria-label="Close menu"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Mobile navigation">
                {menuItems.map((item, idx) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <motion.div
                      key={item.path}
                      custom={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.03 } }}
                    >
                      <Link
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                            : "hover:bg-white/5 text-slate-200"
                        }`}
                      >
                        <span className="p-2 rounded-md bg-white/6 text-lg flex items-center justify-center">
                          {item.icon}
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              <div className="border-t border-white/6 pt-4 text-sm text-gray-300">
                <div className="text-xs text-slate-400">
                  Need help? Visit Help & Support
                </div>
                <Link
                  to="/help-support"
                  onClick={() => setMobileOpen(false)}
                  className="block mt-2 underline"
                >
                  Open Support
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 420px) {
          aside { width: 78vw; max-width: 260px; }
        }
      `}</style>
    </>
  );
}
