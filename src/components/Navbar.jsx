// src/components/Navbar.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { admin, loading, signOutAdmin } = useAuth();
  const navigate = useNavigate();

  const avatar = admin?.photoURL || "https://i.pravatar.cc/40";
  const displayName = admin?.name || (loading ? "Loading..." : "Admin");
  const email = admin?.email || "";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Called when user clicks "Logout" button (opens confirmation dialog)
  function onRequestLogout() {
    setConfirmOpen(true);
  }

  // Perform the actual sign out (called when user confirms)
  async function performSignOut() {
    setSigningOut(true);
    try {
      await signOutAdmin();
    } catch (err) {
      console.warn("Sign out error (non-fatal):", err);
    } finally {
      navigate("/admin-login", { replace: true });
    }
  }

  // Modal animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.18 } },
  };

  const modalVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 260, damping: 24 },
    },
    exit: { opacity: 0, y: 8, scale: 0.99, transition: { duration: 0.12 } },
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
          {/* ---------- Left: Title + Search ---------- */}
          <div className="flex items-center gap-4">
            <h2 className="text-xl md:text-2xl font-semibold text-white tracking-wide">
              Admin Dashboard
            </h2>

            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-1.5 md:py-2 rounded-lg text-sm bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/40 w-44 md:w-64 transition-all"
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80" />
            </div>
          </div>

          {/* ---------- Right: Notifications + Profile ---------- */}
          {admin && (
            <div className="flex items-center gap-4 md:gap-6">
              {/* Notifications */}
              <button className="relative hover:scale-110 transition-transform">
                <FaBell className="text-white text-lg md:text-xl" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] text-white px-1.5 py-0.5 rounded-full">
                  3
                </span>
              </button>

              {/* Profile Section */}
              <div className="flex items-center gap-2">
                <img
                  src={avatar}
                  alt="Admin Avatar"
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-white object-cover"
                />

                {/* Name + Email */}
                <div className="hidden sm:block text-white leading-tight max-w-[160px] truncate">
                  <p className="font-medium text-sm truncate">{displayName}</p>
                  {email && (
                    <p className="text-xs text-white/70 truncate" title={email}>
                      {email}
                    </p>
                  )}
                </div>

                {/* 🔥 Even more attractive Logout Button (hover reveals glow + text) */}
                <div className="ml-3 relative inline-block">
                  {/* background glow that appears on hover */}
                  <span
                    aria-hidden
                    className="absolute -inset-1 rounded-lg opacity-0 transform scale-95 transition-all duration-300 pointer-events-none
                               bg-gradient-to-r from-rose-400 via-pink-500 to-fuchsia-500 blur-lg
                               group-hover:opacity-80 group-hover:scale-100"
                  />

                  {/* Use group to control reveal of text/icon */}
                  <motion.button
                    onClick={onRequestLogout}
                    title="Logout"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative z-10 group flex items-center gap-2 text-white font-medium text-sm px-3 py-1.5
                               rounded-lg bg-gradient-to-r from-rose-500 to-pink-500
                               shadow-md hover:shadow-xl transition-all duration-300
                               focus:outline-none focus:ring-2 focus:ring-white/30"
                    aria-label="Logout"
                  >
                    {/* icon always visible */}
                    <span className="flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                        />
                      </svg>
                    </span>

                    {/* text reveals smoothly on hover (hidden initially on very small widths) */}
                    <span
                      className="overflow-hidden whitespace-nowrap max-w-0 opacity-0 translate-x-0 transition-all duration-300
                                 group-hover:max-w-[90px] group-hover:opacity-100 group-hover:translate-x-0"
                      style={{ transitionTimingFunction: "cubic-bezier(.2,.9,.2,1)" }}
                    >
                      Logout
                    </span>

                    {/* subtle ring that appears only on hover for extra polish */}
                    <span
                      className="absolute inset-0 rounded-lg ring-0 transition-all duration-300 pointer-events-none
                                 group-hover:ring-2 group-hover:ring-rose-300/30"
                      aria-hidden
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.header>

      {/* ---------- Logout Confirmation Modal ---------- */}
      <AnimatePresence>
        {confirmOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setConfirmOpen(false)}
            />

            {/* Centered Modal */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <motion.div
                className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-5"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-title"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M16 13v-2H7V8l-5 4 5 4v-3z"
                        stroke="#f59e0b"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M20 20v-2a4 4 0 00-4-4H9"
                        stroke="#f59e0b"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3
                      id="logout-title"
                      className="text-sm font-semibold text-slate-900"
                    >
                      Confirm logout
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Are you sure you want to log out? You will need to log in
                      again to access the admin panel.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setConfirmOpen(false)}
                    className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition"
                    disabled={signingOut}
                  >
                    Cancel
                  </button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={performSignOut}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-rose-600 text-white text-sm rounded-md shadow hover:bg-rose-700 transition"
                    disabled={signingOut}
                  >
                    {signingOut ? (
                      <svg
                        className="animate-spin -ml-1 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                      </svg>
                    ) : null}
                    Log out
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
