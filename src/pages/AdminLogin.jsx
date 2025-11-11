// src/pages/AdminLogin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { auth } from "../../firebase"; // adjust if needed
import heroImg from "../assets/saqer.jpeg"; // replace with your image

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    enter: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 120, damping: 18 },
    },
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      setSuccess(true);
      try {
        localStorage.setItem("isAdminLoggedIn", "true");
        localStorage.setItem("adminEmail", userCredential.user.email || "");
      } catch (e) {
        /* ignore */
      }

      setTimeout(() => navigate("/", { replace: true }), 800);
    } catch (err) {
      console.error("Sign in error:", err);
      if (err?.code === "auth/user-not-found")
        setError("No user found with this email.");
      else if (err?.code === "auth/wrong-password")
        setError("Incorrect password.");
      else if (err?.code === "auth/too-many-requests")
        setError("Too many attempts — try again later.");
      else setError(err?.message || "Sign in failed.");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(false), 1200);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-safe px-4 py-8">
      {/* Decorative blobs: hidden on small screens to avoid overflow */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ duration: 0.9 }}
        className="hidden lg:block pointer-events-none absolute -left-40 -top-36 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-indigo-400 via-purple-500 to-pink-400 opacity-20"
        style={{ filter: "blur(72px)" }}
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 1.1 }}
        className="hidden lg:block pointer-events-none absolute -right-32 -bottom-28 w-[380px] h-[380px] rounded-full bg-gradient-to-br from-cyan-300 to-indigo-500 opacity-12"
        style={{ filter: "blur(56px)" }}
      />

      {/* Card container: full width on small screens, constrained on larger */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="enter"
        className="relative z-10 w-full max-w-xl md:max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-md border border-slate-100 overflow-hidden"
        style={{ minWidth: 0 }}
      >
        {/* subtle background image inside card (low opacity) - hide on very small screens */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 bg-center bg-cover hidden sm:block"
            style={{
              backgroundImage: `url(${heroImg})`,
              opacity: 0.06,
              filter: "contrast(0.85) saturate(0.6) blur(6px)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/95" />
        </div>

        <div className="relative px-4 py-6 sm:px-6 sm:py-8">
          {/* header: logo + title - scales down on mobile */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white flex items-center justify-center shadow-sm ring-1 ring-slate-100">
              {/* hide big logo on very small screens by shrinking it */}
              <img
                src={heroImg}
                alt="logo"
                className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-md"
              />
            </div>

            <div className="text-center">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-800">
                Admin Panel
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Welcome to the admin
              </p>
            </div>
          </div>

          {/* error box */}
          {error && (
            <div className="mb-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700 text-sm p-2">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            {/* Email */}
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Email</label>
              <div className="flex items-center gap-3 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300 transition bg-white">
                <FiMail className="text-slate-400 w-4 h-4" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="flex-1 text-sm sm:text-base outline-none placeholder-slate-400 bg-transparent"
                  required
                  inputMode="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Password</label>
              <div className="flex items-center gap-3 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300 transition bg-white">
                <FiLock className="text-slate-400 w-4 h-4" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="flex-1 text-sm sm:text-base outline-none placeholder-slate-400 bg-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-slate-500 hover:text-slate-700 p-1 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={loading || success}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm sm:text-base font-medium shadow-sm disabled:opacity-60"
              >
                {loading ? (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : null}
                {!loading && !success && <span>Login</span>}
                {success && <span>Logged in…</span>}
              </button>
            </div>
          </form>

          {/* small footer - stacked on small screens */}
          <div className="mt-4 text-xs text-center text-slate-400">
            © {new Date().getFullYear()} Your Company
          </div>
        </div>
      </motion.div>
    </div>
  );
}
