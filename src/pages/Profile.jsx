// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { admin, loading: authLoading } = useAuth();
  const uid = admin?.uid ?? null;

  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  // Compact animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  useEffect(() => {
    if (admin) setCurrentPhoto(admin.photoURL || null);
    const timer = setTimeout(() => setPageLoaded(true), 50);
    return () => clearTimeout(timer);
  }, [admin]);

  const handleImageLoad = () => setIsImageLoaded(true);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"
          />
          <p className="text-sm text-slate-600">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-6 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2"
        >
          Admin Profile
        </motion.h1>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "60px" }}
          transition={{ delay: 0.4 }}
          className="h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"
        />
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={pageLoaded ? "visible" : "hidden"}
        className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Profile Picture Card */}
        <motion.div
          variants={cardVariants}
          className="bg-white/90 rounded-2xl shadow-lg border border-white/50 p-6"
        >
          <motion.h2
            variants={itemVariants}
            className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            Profile Picture
          </motion.h2>

          <div className="flex flex-col items-center space-y-4">
            <motion.div
              variants={itemVariants}
              className="relative"
            >
              <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  {currentPhoto ? (
                    <motion.img
                      key="profile-image"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={currentPhoto}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onLoad={handleImageLoad}
                    />
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-blue-400 flex flex-col items-center gap-2"
                    >
                      <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-xs text-slate-500">No photo</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="text-xs text-slate-500 text-center max-w-xs"
            >
              Profile picture synced with authentication provider
            </motion.p>
          </div>
        </motion.div>

        {/* Account Info Card */}
        <motion.div
          variants={cardVariants}
          className="bg-white/90 rounded-2xl shadow-lg border border-white/50 p-6"
        >
          <motion.h2
            variants={itemVariants}
            className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            Account Information
          </motion.h2>

          <motion.div variants={itemVariants} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wide">
                Full Name
              </label>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 text-sm">
                {admin?.name || "Not set"}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wide">
                Email Address
              </label>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 text-sm">
                {admin?.email || "Not set"}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 uppercase tracking-wide">
                User ID
              </label>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <code className="text-xs text-slate-600 break-all font-mono">
                  {uid}
                </code>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}