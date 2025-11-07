import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaBars, FaTimes } from "react-icons/fa";
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

  // Mobile-specific
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef(null);

  // Profile dropdown
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (mobileSearchOpen && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setMobileSearchOpen(false);
        setConfirmOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  function openMobileSidebar() {
    window.dispatchEvent(new CustomEvent("toggle-sidebar", { detail: { open: true } }));
  }

  const dropdownVariants = {
    hidden: { opacity: 0, y: -8, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 28 } },
    exit: { opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.12 } },
  };

  const buttonTap = { scale: 0.97 };
  const buttonHover = { scale: 1.02 };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 md:py-3 flex items-center justify-between gap-3">
          {/* LEFT: Menu (mobile) + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              onClick={openMobileSidebar}
              aria-label="Open sidebar"
              whileTap={buttonTap}
              whileHover={buttonHover}
              className="md:hidden p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition"
            >
              <FaBars className="w-4 h-4" />
            </motion.button>

            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-white truncate">
                <span className="hidden sm:inline">Admin Dashboard</span>
                <span className="inline sm:hidden">Dashboard</span>
              </h2>
            </div>
          </div>

          {/* CENTER: Search (desktop large input, mobile icon -> expand) */}
          <div className="flex-1 flex items-center justify-center">
            <div className="hidden sm:flex items-center relative">
              <motion.div whileHover={{ scale: 1.01 }} className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-1.5 md:py-2 rounded-lg text-sm bg-white/12 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30 w-44 md:w-64 transition-all backdrop-blur-sm"
                  aria-label="Search"
                />
              </motion.div>
            </div>

            <div className="sm:hidden flex items-center">
              <motion.button
                onClick={() => setMobileSearchOpen((s) => !s)}
                aria-expanded={mobileSearchOpen}
                aria-label="Open search"
                whileTap={buttonTap}
                whileHover={buttonHover}
                className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition"
              >
                {mobileSearchOpen ? <FaTimes className="w-4 h-4" /> : <FaSearch className="w-4 h-4" />}
              </motion.button>
            </div>
          </div>

          {/* RIGHT: Avatar / profile menu (bell removed) */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative" ref={profileRef}>
              <motion.button
                onClick={() => setProfileOpen((s) => !s)}
                aria-haspopup="true"
                aria-expanded={profileOpen}
                whileTap={buttonTap}
                whileHover={buttonHover}
                className="flex items-center gap-2 p-1 rounded-md hover:bg-white/10 transition"
              >
                <img
                  src={avatar}
                  alt="Admin Avatar"
                  className="w-9 h-9 rounded-full border-2 border-white object-cover ring-2 ring-white/20 shadow-sm"
                />
                <div className="hidden sm:flex flex-col text-white text-left leading-tight max-w-[140px] truncate">
                  <span className="font-medium text-sm truncate">{displayName}</span>
                  {email && <span className="text-xs text-white/70 truncate">{email}</span>}
                </div>
              </motion.button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={dropdownVariants}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"
                    role="menu"
                    aria-label="Profile menu"
                  >
                    <div className="p-3 text-sm text-slate-700 border-b border-slate-100">
                      <div className="font-medium truncate">{displayName}</div>
                      {email && <div className="text-xs text-slate-500 truncate">{email}</div>}
                    </div>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/profile");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                      role="menuitem"
                    >
                      View Profile
                    </button>

                    <button
                      onClick={() => {
                        setConfirmOpen(true);
                        setProfileOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-slate-50"
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile search area */}
        <AnimatePresence>
          {mobileSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "64px", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="sm:hidden px-3 pb-2"
            >
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.04 }} className="relative">
                <input
                  ref={mobileSearchRef}
                  type="search"
                  aria-label="Mobile search"
                  placeholder="Search..."
                  className="w-full rounded-lg py-3 pl-3 pr-12 text-sm bg-white/95 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => setMobileSearchOpen(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md"
                  aria-label="Close search"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {confirmOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmOpen(false)}
            />

            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M16 13v-2H7V8l-5 4 5 4v-3z" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20 20v-2a4 4 0 00-4-4H9" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">Confirm logout</h3>
                    <p className="mt-1 text-xs text-slate-500">Are you sure you want to log out? You will need to log in again to access the admin panel.</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3">
                  <button onClick={() => setConfirmOpen(false)} className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition" disabled={signingOut}>
                    Cancel
                  </button>

                  <button onClick={performSignOut} className="inline-flex items-center gap-2 px-3 py-2 bg-rose-600 text-white text-sm rounded-md shadow hover:bg-rose-700 transition" disabled={signingOut}>
                    {signingOut ? (
                      <svg className="animate-spin -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    ) : null}
                    Log out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 420px) {
          header h2 { font-size: 1rem; }
          header { padding-top: 0.35rem; padding-bottom: 0.35rem; }
        }
      `}</style>
    </>
  );
}
