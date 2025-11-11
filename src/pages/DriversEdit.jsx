// src/pages/DriversEdit.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../../firebase";

const IMAGE_FIELDS = [
  "driverImage",
  "idCardImage",
  "idCardBackImage",
  "licenceImage",
  "licenceBackImage",
];

function msToDateInput(ms) {
  if (!ms) return "";
  try {
    const d = new Date(Number(ms));
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function dateInputToMs(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const imageVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

export default function DriversEdit() {
  const { driverId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    address: "",
    city: "",
    age: "",
    dob: "",
    gender: "",
    licenceNumber: "",
    role: "",
    status: "",
    driverStatus: "",
    vehicleAutomationType: "",
    yearsOfExperience: "",
    vehicle: "",
    vehicleNo: "",
    driverImage: "",
    idCardImage: "",
    idCardBackImage: "",
    licenceImage: "",
    licenceBackImage: "",
    fcmToken: "",
    updatedProfileAt: null,
    createdAt: null,
  });

  const [fileMap, setFileMap] = useState({});
  const [previews, setPreviews] = useState({});

  useEffect(() => {
    if (!driverId) return;
    let mounted = true;
    setLoading(true);

    (async () => {
      try {
        const dRef = doc(db, "drivers", driverId);
        const snap = await getDoc(dRef);
        if (!snap.exists()) {
          alert("Driver not found");
          navigate("/drivers");
          return;
        }
        const data = snap.data();
        if (!mounted) return;

        setForm((_) => ({
          name: data.name ?? "",
          email: data.email ?? "",
          mobileNumber: data.mobileNumber ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          age: data.age ?? "",
          dob: msToDateInput(data.dob ?? data.DOB ?? data.dobMillis ?? data.dobMs ?? null),
          gender: data.gender ?? "",
          licenceNumber: data.licenceNumber ?? "",
          role: data.role ?? "",
          status: data.status ?? "",
          driverStatus: data.driverStatus ?? "",
          vehicleAutomationType: data.vehicleAutomationType ?? "",
          yearsOfExperience: data.yearsOfExperience ?? "",
          vehicle: data.vehicle ?? "",
          vehicleNo: data.vehicleNo ?? data.vehicleNumber ?? "",
          driverImage: data.driverImage ?? data.photoURL ?? "",
          idCardImage: data.idCardImage ?? "",
          idCardBackImage: data.idCardBackImage ?? "",
          licenceImage: data.licenceImage ?? "",
          licenceBackImage: data.licenceBackImage ?? "",
          fcmToken: data.fcmToken ?? "",
          updatedProfileAt: data.updatedProfileAt ?? null,
          createdAt: data.createdAt ?? null,
        }));

        const initialPreviews = {};
        IMAGE_FIELDS.forEach((k) => {
          if (data[k]) initialPreviews[k] = data[k];
        });
        setPreviews(initialPreviews);
      } catch (err) {
        console.error("Fetch driver error:", err);
        alert("Failed to fetch driver: " + err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      Object.values(previews || {}).forEach((u) => {
        try {
          if (u && u.startsWith("blob:")) URL.revokeObjectURL(u);
        } catch {}
      });
    };
  }, [driverId, navigate]);

  function handleChange(e) {
    const { name, value, type } = e.target;
    const next = type === "number" ? (value === "" ? "" : Number(value)) : value;
    setForm((p) => ({ ...p, [name]: next }));
  }

  function handleFileSelect(e, key) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileMap((p) => ({ ...p, [key]: file }));
    const url = URL.createObjectURL(file);
    setPreviews((p) => ({ ...p, [key]: url }));
  }

  async function uploadFile(file, key) {
    if (!file) return null;
    const path = `drivers/${driverId}/${key}_${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);

    return new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        () => {},
        (err) => reject(err),
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!driverId) {
      alert("Missing driver id");
      return;
    }
    setSaving(true);

    try {
      const uploadPromises = Object.entries(fileMap).map(([key, file]) =>
        uploadFile(file, key).then((url) => ({ key, url }))
      );

      const uploads = await Promise.allSettled(uploadPromises);

      const uploadedUrls = {};
      uploads.forEach((r) => {
        if (r.status === "fulfilled" && r.value) {
          uploadedUrls[r.value.key] = r.value.url;
        }
      });

      const updatePayload = {
        name: form.name || null,
        email: form.email || null,
        mobileNumber: form.mobileNumber || null,
        address: form.address || null,
        city: form.city || null,
        age: form.age === "" ? null : Number(form.age),
        gender: form.gender || null,
        licenceNumber: form.licenceNumber || null,
        role: form.role || null,
        status: form.status || null,
        driverStatus: form.driverStatus || null,
        vehicleAutomationType: form.vehicleAutomationType || null,
        yearsOfExperience: form.yearsOfExperience === "" ? null : Number(form.yearsOfExperience),
        vehicle: form.vehicle || null,
        vehicleNo: form.vehicleNo || null,
        updatedProfileAt: serverTimestamp(),
      };

      const dobMs = dateInputToMs(form.dob);
      if (dobMs) updatePayload.dob = dobMs;

      Object.keys(uploadedUrls).forEach((k) => {
        updatePayload[k] = uploadedUrls[k];
      });

      const docRef = doc(db, "drivers", driverId);
      await updateDoc(docRef, updatePayload);

      // Success notification with animation
      try {
        window?.toast?.success?.("Driver updated successfully!") ||
          window?.toast?.("✅ Driver updated successfully!");
      } catch {}

      setTimeout(() => {
        navigate("/drivers");
      }, 1000);

    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  }

  // Navigation tabs for mobile
  const navSections = [
    { id: "personal", label: "Personal", icon: Icons.User },
    { id: "driver", label: "Driver Info", icon: Icons.Truck },
    { id: "documents", label: "Documents", icon: Icons.FileText },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Icons.Loader2 size={48} className="mx-auto mb-4 animate-spin text-indigo-600" />
          <div className="text-lg font-semibold text-slate-700">Loading driver details...</div>
          <div className="text-sm text-slate-500 mt-2">Please wait while we fetch the information</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white rounded-2xl shadow-xl p-6 border border-slate-200"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <motion.button
                  whileHover={{ scale: 1.05, x: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/drivers")}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0"
                >
                  <Icons.ArrowLeft size={20} className="text-slate-600" />
                </motion.button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Edit Driver
                  </h1>
                  <p className="text-slate-600 mt-1">Update driver information and documents</p>
                </div>
              </div>
              
              {/* Driver ID Badge */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                  <div className="text-xs text-indigo-500 font-medium">Driver ID</div>
                  <div className="text-sm font-mono text-indigo-700 font-semibold">{driverId}</div>
                </div>
                {form.role && (
                  <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <div className="text-xs text-emerald-500 font-medium">Role</div>
                    <div className="text-sm text-emerald-700 font-semibold">{form.role}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Image Preview */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex-shrink-0"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-1 shadow-lg">
                <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                  {previews.driverImage ? (
                    <img
                      src={previews.driverImage}
                      alt="Driver"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icons.User size={32} className="text-slate-400" />
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Mobile Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden mb-6 bg-white rounded-xl shadow-lg p-2 border border-slate-200"
        >
          <div className="flex justify-between">
            {navSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg flex-1 mx-1 transition-all duration-200 ${
                    activeSection === section.id
                      ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-medium">{section.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block w-64 flex-shrink-0"
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200 sticky top-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Icons.Menu size={18} />
                Navigation
              </h3>
              <nav className="space-y-2">
                {navSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left ${
                        activeSection === section.id
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium">{section.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Quick Stats */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Icons.BarChart3 size={16} />
                  Quick Stats
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>FCM Token:</span>
                    <span className={`font-medium ${form.fcmToken ? "text-emerald-600" : "text-slate-400"}`}>
                      {form.fcmToken ? "Active" : "None"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Last Updated:</span>
                    <span className="font-medium text-slate-700">
                      {form.updatedProfileAt ? "Recently" : "Never"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Form Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1"
          >
            <form onSubmit={handleSave}>
              {/* Personal Information Section */}
              {(activeSection === "personal" || window.innerWidth >= 1024) && (
                <motion.div
                  variants={cardVariants}
                  className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-blue-50">
                      <Icons.User className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
                      <p className="text-slate-600 text-sm">Basic details and contact information</p>
                    </div>
                  </div>

                  <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full name *</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter full name"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email address</label>
                      <input
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        type="email"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="email@example.com"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Mobile number *</label>
                      <input
                        name="mobileNumber"
                        value={form.mobileNumber}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="+1 (555) 000-0000"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                      <input
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter city"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Age</label>
                      <input
                        name="age"
                        type="number"
                        min="0"
                        value={form.age ?? ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter age"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth</label>
                      <input
                        name="dob"
                        type="date"
                        value={form.dob ?? ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
                      <select
                        name="gender"
                        value={form.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </motion.div>

                    <motion.div variants={itemVariants} className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
                        placeholder="Enter complete address"
                      />
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}

              {/* Driver & Vehicle Section */}
              {(activeSection === "driver" || window.innerWidth >= 1024) && (
                <motion.div
                  variants={cardVariants}
                  className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-green-50">
                      <Icons.Truck className="text-green-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Driver & Vehicle Information</h2>
                      <p className="text-slate-600 text-sm">Professional details and vehicle information</p>
                    </div>
                  </div>

                  <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Licence Number</label>
                      <input
                        name="licenceNumber"
                        value={form.licenceNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter licence number"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Years of Experience</label>
                      <input
                        name="yearsOfExperience"
                        type="number"
                        min="0"
                        value={form.yearsOfExperience ?? ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter years"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Type</label>
                      <input
                        name="vehicle"
                        value={form.vehicle}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter vehicle type"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle Number</label>
                      <input
                        name="vehicleNo"
                        value={form.vehicleNo}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter vehicle number"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Automation Type</label>
                      <input
                        name="vehicleAutomationType"
                        value={form.vehicleAutomationType}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter automation type"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Driver Status</label>
                      <select
                        name="driverStatus"
                        value={form.driverStatus}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="">Select status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Active">Active</option>
                        <option value="Offline">Offline</option>
                        <option value="Busy">Busy</option>
                      </select>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Online Status</label>
                      <input
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="online/offline"
                      />
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}

              {/* Documents Section */}
              {(activeSection === "documents" || window.innerWidth >= 1024) && (
                <motion.div
                  variants={cardVariants}
                  className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-orange-50">
                      <Icons.FileText className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Documents & Images</h2>
                      <p className="text-slate-600 text-sm">Upload or update driver documents and photos</p>
                    </div>
                  </div>

                  <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key: "driverImage", label: "Profile Photo", hint: "Square image recommended", icon: Icons.User },
                      { key: "idCardImage", label: "ID Card (Front)", hint: "Clear front side", icon: Icons.CreditCard },
                      { key: "idCardBackImage", label: "ID Card (Back)", hint: "Clear back side", icon: Icons.CreditCard },
                      { key: "licenceImage", label: "Licence (Front)", hint: "Valid driving licence", icon: Icons.FileCheck },
                      { key: "licenceBackImage", label: "Licence (Back)", hint: "Back of licence", icon: Icons.FileCheck },
                    ].map(({ key, label, hint, icon: Icon }) => (
                      <motion.div
                        key={key}
                        variants={itemVariants}
                        whileHover={{ scale: 1.02 }}
                        className="bg-slate-50 rounded-xl p-4 border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-all duration-200"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Icon size={16} className="text-slate-500" />
                          <div className="text-sm font-medium text-slate-700">{label}</div>
                        </div>
                        
                        <motion.div
                          variants={imageVariants}
                          className="h-32 mb-3 flex items-center justify-center bg-white rounded-lg border border-slate-200 overflow-hidden"
                        >
                          {previews[key] ? (
                            <img
                              src={previews[key]}
                              alt={label}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          ) : (
                            <div className="text-slate-400 flex flex-col items-center gap-2">
                              <Icons.ImageOff size={24} />
                              <div className="text-xs">No image</div>
                            </div>
                          )}
                        </motion.div>

                        <div className="space-y-2">
                          <label className="block text-xs text-slate-600 font-medium">Upload new file</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e, key)}
                            className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
                          />
                          {hint && <div className="text-xs text-slate-500">{hint}</div>}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row gap-3 justify-end bg-white rounded-2xl shadow-xl p-6 border border-slate-200"
              >
                <motion.button
                  type="button"
                  onClick={() => navigate("/drivers")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={saving}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-200 font-medium flex items-center gap-2 justify-center"
                >
                  <Icons.X size={18} />
                  Cancel
                </motion.button>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center gap-2 justify-center shadow-lg"
                >
                  {saving ? (
                    <>
                      <Icons.Loader2 className="animate-spin" size={18} />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Icons.Save size={18} />
                      Save Changes
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}