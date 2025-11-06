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
import heroImg from "../assets/saqer.png"; // place your image here

export default function AdminLoginPage() {
  const navigate = useNavigate();

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // variants (NO hover/rotate variant anymore)
  const cardVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.995 },
    enter: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 120, damping: 18 },
    },
  };

  const bgFloat = {
    initial: { scale: 1.02, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        scale: { duration: 6, repeat: Infinity, repeatType: "reverse" },
        opacity: { duration: 0.8 },
      },
    },
  };

  // Error shake kept (only for error feedback). Remove if you want everything static.
  const shakeAnim = {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.6 },
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
      // ensure persistence so first-time login persists
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

      setTimeout(() => navigate("/", { replace: true }), 900);
    } catch (err) {
      console.error("Sign in error:", err);
      if (err?.code === "auth/user-not-found") setError("No user found with this email.");
      else if (err?.code === "auth/wrong-password") setError("Incorrect password.");
      else if (err?.code === "auth/too-many-requests")
        setError("Too many attempts — try again later.");
      else setError(err?.message || "Sign in failed.");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(false), 1400);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white overflow-hidden p-6">
      {/* ambient decorative blobs */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.9, scale: 1 }}
        transition={{ duration: 1 }}
        className="pointer-events-none absolute -left-40 -top-36 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-indigo-400 via-purple-500 to-pink-400 opacity-18"
        style={{ filter: "blur(72px)" }}
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 0.9, scale: 1 }}
        transition={{ duration: 1.2 }}
        className="pointer-events-none absolute -right-32 -bottom-28 w-[380px] h-[380px] rounded-full bg-gradient-to-br from-cyan-300 to-indigo-500 opacity-12"
        style={{ filter: "blur(56px)" }}
      />

      {/* centered single-column card (logo centered above title) */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="enter"
        className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* subtle background using the hero image, blurred and faint */}
        <motion.div
          variants={bgFloat}
          initial="initial"
          animate="animate"
          aria-hidden
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${heroImg})`,
              filter: "contrast(0.8) saturate(0.6) blur(8px)",
              opacity: 0.08,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90" />
        </motion.div>

        {/* content */}
        <div className="relative p-6 md:p-8">
          {/* NEW: centered logo above title */}
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-lg bg-white/80 flex items-center justify-center shadow">
              <img src={heroImg} alt="logo" className="w-12 h-12 object-contain" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-3">
                Admin
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                  Panel
                </span>
              </h1>
            </div>
          </div>

          {/* error */}
          {error && (
            <motion.div
              className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700 text-sm"
              animate={shakeAnim}
              role="alert"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Email</label>
              <div className="flex items-center gap-3 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300 transition bg-white/70">
                <FiMail className="text-slate-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 text-sm outline-none placeholder-slate-400 bg-transparent"
                  type="email"
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Password</label>
              <div className="flex items-center gap-3 border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300 transition bg-white/70">
                <FiLock className="text-slate-400" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 text-sm outline-none placeholder-slate-400 bg-transparent"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={loading || success}
                className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-lg disabled:opacity-60"
              >
                {loading && (
                  <svg className="animate-spin -ml-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}

                {!loading && !success && <span className="text-sm md:text-base">Login</span>}

                {success && (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Log in</span>
                  </span>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
