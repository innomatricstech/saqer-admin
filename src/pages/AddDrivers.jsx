// src/components/AddDrivers.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../firebase";

/* SafeIcon helpers */
function FallbackIcon({ size = 14 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function SafeIcon({ name, size = 14, className }) {
  if (!name) return <FallbackIcon size={size} className={className} />;
  const Comp = Icons[name];
  if (typeof Comp === "function" || typeof Comp === "object") {
    return <Comp size={size} className={className} />;
  }
  return <FallbackIcon size={size} className={className} />;
}

/* Full component with mobile responsiveness, animations, and local image upload */
export default function AddDrivers({ open, onClose }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    vehicle: "",
    plate: "",
    status: "Pending",
    trips: 0,
    driverImage: "",
    address: "",
    city: "",
    latitude: null,
    longitude: null,
    age: "",
    dob: "",
    licenceNumber: "",
    vehicleNumber: "",
    yearsOfExperience: "",
    role: "Driver",
    ownReferralCode: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const storage = getStorage();

  // Lock background scroll while modal is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev || ""; };
    }
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setForm({
        name: "",
        phone: "",
        email: "",
        vehicle: "",
        plate: "",
        status: "Pending",
        trips: 0,
        driverImage: "",
        address: "",
        city: "",
        latitude: null,
        longitude: null,
        age: "",
        dob: "",
        licenceNumber: "",
        vehicleNumber: "",
        yearsOfExperience: "",
        role: "Driver",
        ownReferralCode: "",
      });
      setError("");
      setSubmitting(false);
      setGeoLoading(false);
      setImageUploading(false);
      setImagePreview(null);
    }
  }, [open]);

  const computedAge = useMemo(() => {
    if (!form.dob) return "";
    const diff = Date.now() - Date.parse(form.dob);
    if (isNaN(diff)) return "";
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }, [form.dob]);

  const handleChange = (k) => (e) => {
    const val = e.target ? e.target.value : e;
    setForm((s) => ({ 
      ...s, 
      [k]: ["trips", "age", "yearsOfExperience"].includes(k) ? Number(val || 0) : val 
    }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (form.phone && form.phone.replace(/\D/g, "").length < 6) return "Enter valid phone";
    return null;
  };

  // Handle image upload
  const handleImageUpload = async (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setImageUploading(true);
    setError("");

    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Upload to Firebase Storage
      const storageRef = ref(storage, `driver-images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update form with image URL
      setForm(prev => ({ ...prev, driverImage: downloadURL }));
      
      try { window?.toast?.("Profile image uploaded successfully!"); } catch {}
    } catch (err) {
      console.error("Failed to upload image:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setImageUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        mobileNumber: form.phone.trim() || "",
        email: form.email.trim() || "",
        vehicle: form.vehicle.trim() || "",
        vehicleNumber: form.vehicleNumber?.trim() || null,
        plate: form.plate.trim() || "",
        driverStatus: form.status || "Pending",
        status: form.status || "Pending",
        trips: Number(form.trips || 0),
        driverImage: form.driverImage?.trim() || null,
        address: form.address?.trim() || null,
        city: form.city?.trim() || null,
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
        age: form.age ? Number(form.age) : computedAge ? Number(computedAge) : null,
        dob: form.dob ? Number(Date.parse(form.dob)) : null,
        licenceNumber: form.licenceNumber?.trim() || null,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
        role: form.role || "Driver",
        ownReferralCode: form.ownReferralCode?.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, "drivers"), payload);
      await updateDoc(doc(db, "drivers", ref.id), { driverId: ref.id });

      setSubmitting(false);
      onClose();
      try { window?.toast?.("Driver added successfully! 🎉"); } catch {}
    } catch (err) {
      console.error("Failed to add driver:", err);
      setError("Failed to add driver. Please try again.");
      setSubmitting(false);
    }
  };

  const genReferral = () => {
    const code = `DR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setForm((s) => ({ ...s, ownReferralCode: code }));
  };

  // Geolocation functions
  async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
    try {
      const resp = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!resp.ok) throw new Error("Reverse geocode failed");
      const data = await resp.json();
      return data;
    } catch (err) {
      console.error("reverseGeocode error", err);
      throw err;
    }
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser.");
      return;
    }
    setError("");
    setGeoLoading(true);

    const getPosition = () =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60 * 1000 }
        );
      });

    try {
      const pos = await getPosition();
      const { latitude, longitude } = pos.coords;
      try {
        const data = await reverseGeocode(latitude, longitude);
        const display = data.display_name || "";
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || addr.state || "";

        setForm((s) => ({
          ...s,
          address: display,
          city,
          latitude,
          longitude,
        }));
      } catch (rgErr) {
        setForm((s) => ({ ...s, latitude, longitude }));
        setError("Got location but failed to reverse-geocode address.");
      }
    } catch (geoErr) {
      console.error("Geolocation error", geoErr);
      if (geoErr.code === 1) setError("Permission denied. Allow location access to auto-fill address.");
      else if (geoErr.code === 3) setError("Location request timed out. Try again.");
      else setError("Could not get location. Try again.");
    } finally {
      setGeoLoading(false);
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const slideInVariants = {
    hidden: { x: -50, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {open && (
        <div className="relative z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Main Container */}
          <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ 
                duration: 0.4,
                type: "spring",
                damping: 25,
                stiffness: 300
              }}
              role="dialog"
              aria-modal="true"
              className="bg-gradient-to-br from-white to-slate-50/90 border border-slate-200/70 shadow-2xl shadow-black/20 w-full h-full md:w-[95%] md:max-w-6xl md:h-[95vh] rounded-none md:rounded-3xl overflow-hidden flex flex-col md:flex-row"
            >
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />

              {/* Mobile Header - Visible only on mobile */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="md:hidden bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-slate-200/60"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Add New Driver</h2>
                    <p className="text-sm text-slate-600">Create driver profile</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-white/50 transition-colors"
                  >
                    <SafeIcon name="X" size={20} className="text-slate-600" />
                  </motion.button>
                </div>

                {/* Mobile Profile Section */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white/80 rounded-2xl border border-slate-200/60 shadow-sm"
                >
                  <div className="relative">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 border-2 border-white shadow-lg overflow-hidden flex items-center justify-center relative cursor-pointer"
                      onClick={triggerFileInput}
                    >
                      {imagePreview || form.driverImage ? (
                        <img
                          src={imagePreview || form.driverImage}
                          alt="Driver preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-blue-400 flex flex-col items-center justify-center gap-1">
                          <SafeIcon name="User" size={24} />
                          <div className="text-[10px] text-blue-500/70">No photo</div>
                        </div>
                      )}
                      
                      {/* Upload overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <SafeIcon name="Camera" size={20} className="text-white" />
                      </div>

                      {/* Uploading spinner */}
                      {imageUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <SafeIcon name="Loader" size={20} className="text-white" />
                          </motion.div>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  <div className="flex-1">
                    <div className="font-bold text-lg text-slate-800 truncate">
                      {form.name || "New Driver"}
                    </div>
                    <div className="text-sm text-slate-600 truncate">
                      {form.vehicle || "Vehicle"} • {form.city || "City"}
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={triggerFileInput}
                      disabled={imageUploading}
                      className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      <SafeIcon name={imageUploading ? "Loader" : "Upload"} size={14} className={imageUploading ? "animate-spin" : ""} />
                      {imageUploading ? "Uploading..." : "Upload Photo"}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>

              {/* Left Sidebar - Hidden on mobile */}
              <motion.div
                variants={slideInVariants}
                initial="hidden"
                animate="visible"
                className="hidden md:flex md:flex-col md:shrink-0 md:w-1/3 p-6 bg-gradient-to-b from-blue-50/90 to-indigo-50/80 border-r border-slate-200/60 relative overflow-hidden"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200/20 rounded-full -translate-y-20 translate-x-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-200/20 rounded-full -translate-x-16 translate-y-16"></div>
                
                <div className="flex flex-col items-center gap-6 relative z-10">
                  {/* Profile Image with Upload */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative group"
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center relative cursor-pointer"
                      onClick={triggerFileInput}
                    >
                      {imagePreview || form.driverImage ? (
                        <motion.img
                          initial={{ opacity: 0, scale: 1.1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          src={imagePreview || form.driverImage}
                          alt="Driver preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-blue-400 flex flex-col items-center justify-center gap-2"
                        >
                          <SafeIcon name="User" size={36} />
                          <div className="text-sm text-blue-500/70">Upload Photo</div>
                        </motion.div>
                      )}
                      
                      {/* Upload overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2">
                        <SafeIcon name="Camera" size={24} className="text-white" />
                        <div className="text-white text-sm font-medium">Click to upload</div>
                      </div>

                      {/* Uploading spinner */}
                      {imageUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-3xl">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="flex flex-col items-center gap-2"
                          >
                            <SafeIcon name="Loader" size={24} className="text-white" />
                            <div className="text-white text-xs">Uploading...</div>
                          </motion.div>
                        </div>
                      )}
                    </motion.div>

                    {/* Upload button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={triggerFileInput}
                      disabled={imageUploading}
                      className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/25"
                    >
                      <SafeIcon name={imageUploading ? "Loader" : "Upload"} size={16} className={imageUploading ? "animate-spin" : ""} />
                      {imageUploading ? "Uploading Image..." : "Upload Profile Photo"}
                    </motion.button>
                  </motion.div>

                  {/* Driver Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center w-full"
                  >
                    <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {form.name || "New Driver"}
                    </div>
                    <div className="text-sm text-slate-600 mt-2">
                      {form.vehicle || "Vehicle"} • {form.city || "City"}
                    </div>
                  </motion.div>

                  {/* Location Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="w-full space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700">Location</label>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        disabled={geoLoading}
                        onClick={useMyLocation}
                        className="px-3 py-2 bg-white border border-slate-300/60 rounded-xl text-xs font-medium hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                      >
                        {geoLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <SafeIcon name="Loader" size={12} />
                          </motion.div>
                        ) : (
                          <SafeIcon name="Crosshair" size={12} />
                        )}
                        {geoLoading ? "Locating..." : "Use My Location"}
                      </motion.button>
                    </div>

                    <div className="p-4 bg-white/70 border border-slate-300/40 rounded-2xl space-y-2">
                      <div className="text-sm text-slate-700 break-words min-h-[40px]">
                        {form.address || "No address filled yet"}
                      </div>
                      {form.latitude && form.longitude && (
                        <div className="text-xs text-slate-500 font-mono">
                          📍 Lat: {form.latitude.toFixed(6)}, Lng: {form.longitude.toFixed(6)}
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Referral Code Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="w-full"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-700">Referral Code</label>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={genReferral}
                        className="px-3 py-2 bg-white border border-slate-300/60 rounded-xl text-xs font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm"
                      >
                        <SafeIcon name="Sparkles" size={12} />
                        Generate
                      </motion.button>
                    </div>
                    <div className="p-4 bg-white/70 border border-slate-300/40 rounded-2xl">
                      <div className="text-sm font-mono text-slate-800 break-all text-center font-semibold">
                        {form.ownReferralCode || "DR-XXXXXX"}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col bg-white/90">
                {/* Desktop Header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="hidden md:flex items-start justify-between p-6 border-b border-slate-200/60 bg-gradient-to-r from-white to-slate-50/50"
                >
                  <div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      Add New Driver
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Create a driver record with profile & vehicle details</div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-slate-100/80 transition-colors duration-200 group"
                  >
                    <SafeIcon name="X" size={20} className="text-slate-500 group-hover:text-slate-700" />
                  </motion.button>
                </motion.div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="px-4 md:px-6 py-3 bg-red-50 border-b border-red-200/60"
                    >
                      <div className="flex items-center gap-2 text-sm text-red-700">
                        <SafeIcon name="AlertCircle" size={16} />
                        {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="p-4 md:p-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { label: "Full Name *", iconName: "User", key: "name", type: "text", placeholder: "Enter driver's full name" },
                        { label: "Phone Number", iconName: "Phone", key: "phone", type: "tel", placeholder: "+971 XX XXX XXXX" },
                        { label: "Email Address", iconName: "Mail", key: "email", type: "email", placeholder: "driver@example.com" },
                        { label: "Vehicle Type", iconName: "Truck", key: "vehicle", type: "text", placeholder: "Car, Bike, Van, Truck" },
                        { label: "License Plate", iconName: "Hash", key: "plate", type: "text", placeholder: "ABC-1234" },
                        { label: "Status", iconName: "CheckSquare", key: "status", type: "select", options: ["Pending", "Approved", "Rejected", "Active", "Offline"] },
                        { label: "Total Trips", iconName: "Map", key: "trips", type: "number", placeholder: "0" },
                        { label: "City", iconName: "MapPin", key: "city", type: "text", placeholder: "Dubai, Abu Dhabi, etc." },
                        { label: "Age", iconName: "Calendar", key: "age", type: "number", placeholder: "25" },
                        { label: "Date of Birth", iconName: "Calendar", key: "dob", type: "date" },
                        { label: "License Number", iconName: "FileText", key: "licenceNumber", type: "text", placeholder: "DL-XXXXXX" },
                        { label: "Vehicle Number", iconName: "Monitor", key: "vehicleNumber", type: "text", placeholder: "VH-XXXXXX" },
                        { label: "Experience (years)", iconName: "BarChart", key: "yearsOfExperience", type: "number", placeholder: "3" },
                        { label: "Role", iconName: "UserCheck", key: "role", type: "select", options: ["Driver", "Partner", "Admin"] },
                        { label: "Address", iconName: "Map", key: "address", type: "textarea", placeholder: "Enter complete address" },
                      ].map((field, index) => (
                        <motion.div
                          key={field.key}
                          variants={itemVariants}
                          custom={index}
                          className={field.key === "address" ? "sm:col-span-2 lg:col-span-3" : ""}
                        >
                          <EnhancedField
                            label={field.label}
                            iconName={field.iconName}
                            value={form[field.key]}
                            onChange={handleChange(field.key)}
                            type={field.type}
                            placeholder={field.placeholder}
                            options={field.options}
                            computedAge={field.key === "age" ? computedAge : null}
                            isAddressField={field.key === "address"}
                            form={form}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Footer Actions */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-slate-200/60 bg-white/80 backdrop-blur-sm sticky bottom-0"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={onClose}
                      className="px-6 py-3 rounded-xl bg-white border border-slate-300/60 text-slate-700 hover:bg-slate-50 transition-all duration-200 font-medium flex items-center gap-2 shadow-sm"
                    >
                      <SafeIcon name="X" size={16} />
                      Cancel
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25"
                    >
                      {submitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <SafeIcon name="Loader" size={16} />
                          </motion.div>
                          Saving Driver...
                        </>
                      ) : (
                        <>
                          <SafeIcon name="UserPlus" size={16} />
                          Add Driver
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* Enhanced Field Component */
function EnhancedField({ label, iconName, value, onChange, type = "text", placeholder, options, computedAge, isAddressField = false, form }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group"
    >
      <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <motion.span
          whileHover={{ scale: 1.1 }}
          className="text-blue-500/80"
        >
          <SafeIcon name={iconName} size={14} />
        </motion.span>
        <span>{label}</span>
      </label>

      <motion.div
        className={`relative transition-all duration-200 ${
          isFocused ? 'transform scale-[1.02]' : 'group-hover:scale-[1.01]'
        }`}
      >
        {type === "select" ? (
          <div className="relative">
            <select
              value={value}
              onChange={onChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full px-4 py-3 border border-slate-300/60 rounded-xl bg-white/80 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 appearance-none shadow-sm"
            >
              {options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <SafeIcon
              name="ChevronDown"
              size={14}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        ) : isAddressField ? (
          <div>
            <textarea
              value={value ?? ""}
              onChange={onChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              rows={3}
              placeholder={placeholder}
              className="w-full px-4 py-3 border border-slate-300/60 rounded-xl bg-white/80 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-slate-400 shadow-sm resize-none"
            />
            {form?.latitude && form?.longitude && (
              <div className="mt-2 text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded-lg">
                📍 Lat: {form.latitude.toFixed(6)} • Lng: {form.longitude.toFixed(6)}
              </div>
            )}
          </div>
        ) : label === "Age" ? (
          <div className="flex gap-2">
            <input
              type={type}
              value={value ?? ""}
              onChange={onChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="w-full px-4 py-3 border border-slate-300/60 rounded-xl bg-white/80 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-slate-400 shadow-sm"
            />
            <div className="px-4 py-3 rounded-xl border border-slate-300/40 bg-slate-50/80 text-sm text-slate-600 min-w-[100px] flex items-center justify-center font-medium">
              {computedAge ? `${computedAge} yrs` : "Auto"}
            </div>
          </div>
        ) : (
          <input
            type={type}
            value={value ?? ""}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="w-full px-4 py-3 border border-slate-300/60 rounded-xl bg-white/80 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-slate-400 shadow-sm"
          />
        )}

        {/* Focus border animation */}
        <motion.div
          className={`absolute inset-0 rounded-xl pointer-events-none border-2 ${
            isFocused ? 'border-blue-500/30' : 'border-transparent'
          }`}
          initial={false}
          animate={{
            opacity: isFocused ? 1 : 0,
            scale: isFocused ? 1 : 0.95
          }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>
    </motion.div>
  );
}

/* Helper to update driver status */
export async function updateDriverStatus(driverId, newStatus) {
  if (!driverId) throw new Error("driverId required");
  if (!["Pending", "Approved", "Rejected"].includes(newStatus)) throw new Error("invalid status");
  try {
    await updateDoc(doc(db, "drivers", driverId), {
      status: newStatus,
      driverStatus: newStatus,
      updatedAt: serverTimestamp()
    });
    try { window?.toast?.(`Status updated to ${newStatus}`); } catch {}
    return true;
  } catch (err) {
    console.error("Failed to update driver status:", err);
    try { window?.toast?.("Failed to update status"); } catch {}
    return false;
  }
}