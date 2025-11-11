// src/pages/Drivers.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc as firestoreDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

// import the new request modal (ensure DriverRequest.jsx is in same folder)
import DriverRequest from "./DriverRequest";
// import Add Driver modal component
import AddDrivers from "./AddDrivers";

/* Small gradient generator for avatars */
function nameToGradient(name = "") {
  const grads = [
    "from-indigo-500 to-purple-500",
    "from-rose-400 to-orange-400",
    "from-emerald-400 to-teal-500",
    "from-yellow-400 to-red-400",
    "from-sky-400 to-indigo-600",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i);
  return grads[Math.abs(h) % grads.length];
}

/** Helper to format any Firestore value safely for display */
function formatValue(v) {
  if (v === null || v === undefined || v === "") return "—";
  // Firestore timestamp-like (has seconds or _seconds)
  if (typeof v === "object" && (v.seconds || v._seconds)) {
    const seconds = v.seconds ?? v._seconds;
    return new Date(seconds * 1000).toLocaleString();
  }
  // Arrays
  if (Array.isArray(v)) {
    try {
      return v.length ? v.join(", ") : "—";
    } catch {
      return JSON.stringify(v);
    }
  }
  // Objects (maps)
  if (typeof v === "object") {
    try {
      const keys = Object.keys(v);
      if (keys.length <= 6) {
        const pairs = keys.map((k) => {
          const val = v[k];
          if (typeof val === "object" && (val.seconds || val._seconds)) {
            return `${k}: ${formatValue(val)}`;
          }
          if (typeof val === "object") {
            try {
              return `${k}: ${JSON.stringify(val)}`;
            } catch {
              return `${k}: [object]`;
            }
          }
          return `${k}: ${String(val)}`;
        });
        return pairs.join(" · ");
      }
      const s = JSON.stringify(v);
      return s.length > 120 ? s.slice(0, 117) + "…" : s;
    } catch {
      return String(v);
    }
  }
  // primitives
  return String(v);
}

// Enhanced Status Badge component with Pending → Approved/Rejected flow
function StatusBadge({ status, onStatusChange }) {
  const [showActions, setShowActions] = useState(false);

  const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ease-in-out cursor-pointer";
  let colorClasses = "";
  let icon = null;

  switch (status) {
    case "Pending":
      colorClasses = "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300";
      icon = <Icons.Clock size={12} className="inline mr-1" />;
      break;
    case "Approved":
      colorClasses = "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300";
      icon = <Icons.CheckCircle size={12} className="inline mr-1" />;
      break;
    case "Rejected":
      colorClasses = "bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300";
      icon = <Icons.XCircle size={12} className="inline mr-1" />;
      break;
    case "Active":
      colorClasses = "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300";
      icon = <Icons.CheckCircle size={12} className="inline mr-1" />;
      break;
    case "Offline":
      colorClasses = "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300";
      icon = <Icons.Moon size={12} className="inline mr-1" />;
      break;
    case "Busy":
      colorClasses = "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300";
      icon = <Icons.Clock size={12} className="inline mr-1" />;
      break;
    default:
      colorClasses = "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300";
  }

  const handleStatusChange = (newStatus) => {
    setShowActions(false);
    onStatusChange(newStatus);
  };

  if (status === "Pending") {
    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowActions(!showActions)}
          className={`${baseClasses} ${colorClasses} flex items-center gap-1`}
          title="Click to approve or reject"
        >
          {icon}
          {status}
          <Icons.ChevronDown size={10} className="ml-1" />
        </motion.button>

        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[120px]"
            >
              <button
                onClick={() => handleStatusChange("Approved")}
                className="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 rounded-t-lg"
              >
                <Icons.CheckCircle size={14} />
                Approve
              </button>
              <button
                onClick={() => handleStatusChange("Rejected")}
                className="w-full text-left px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 flex items-center gap-2 rounded-b-lg"
              >
                <Icons.XCircle size={14} />
                Reject
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close dropdown when clicking outside */}
        {showActions && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowActions(false)}
          />
        )}
      </div>
    );
  }

  // For non-pending statuses, show simple badge with hover effect
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${baseClasses} ${colorClasses} flex items-center gap-1`}
      title={`Current status: ${status}`}
    >
      {icon}
      {status}
    </motion.button>
  );
}

/**
 * Drivers page - realtime from Firestore
 */
export default function Drivers() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(null);

  // State to open the DriverRequest modal
  const [requestOpen, setRequestOpen] = useState(false);

  // State to open Add Driver modal
  const [addOpen, setAddOpen] = useState(false);

  // ADD THIS FUNCTION FOR EDIT NAVIGATION
  const handleEdit = useCallback((driverId) => {
    navigate(`/drivers/edit/${driverId}`);
  }, [navigate]);

  // Data Fetching via useEffect
  useEffect(() => {
    const q = query(collection(db, "drivers"), orderBy("name", "asc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() || {};
          const name = data.name || data.fullName || "Unknown";
          const phoneRaw = data.mobileNumber || data.phone || data.mobile || "";
          const vehicleRaw = data.vehicle || data.vehicleType || "-";
          const plateRaw =
            data.licenceNumber || data.vehicleNo || data.vehiclePlate || data.plate || "-";
          const joinedRaw = data.createdAt || data.joinedAt || data.updatedProfileAt || null;
          const joinedFormatted = joinedRaw ? formatValue(joinedRaw) : "-";

          // Default status to "Pending" if not set
          const status = data.driverStatus || data.status || data.currentStatus || "Pending";

          return {
            id: d.id,
            name,
            phone: formatValue(phoneRaw),
            email: formatValue(data.email || ""),
            vehicle: formatValue(vehicleRaw),
            plate: formatValue(plateRaw),
            status: status,
            joined: joinedFormatted,
            trips: Number(data.trips ?? data.totalTrips ?? 0),
            notes: typeof data.notes === "string" ? data.notes : formatValue(data.notes),
            driverImage: data.driverImage || data.photoURL || "",
            idCardImage: data.idCardImage || "",
            idCardBackImage: data.idCardBackImage || "",
            licenceImage: data.licenceImage || "",
            licenceBackImage: data.licenceBackImage || "",
            raw: data,
          };
        });
        setDrivers(list);
        setLoading(false);
      },
      (err) => {
        console.error("Drivers onSnapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filtered = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.phone || "").includes(search) ||
      (d.vehicle || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.plate || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.status || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    const d = drivers.find((x) => x.id === id);
    const ok = window.confirm(`Permanently delete driver: ${d.name}? This action cannot be undone.`);
    if (!ok) return;
    try {
      await deleteDoc(firestoreDoc(db, "drivers", id));
      setSelected(null);
    } catch (err) {
      console.error("Failed to delete driver:", err);
      alert("Failed to delete driver. Check the console for details.");
    }
  };

  const updateStatus = async (id, newStatus) => {
    setStatusUpdateLoading(id);
    try {
      await updateDoc(firestoreDoc(db, "drivers", id), {
        driverStatus: newStatus,
        statusUpdatedAt: new Date().toISOString()
      });

      // Show success notification
      try {
        window?.toast?.success?.(`Driver status updated to ${newStatus}`) ||
          window?.toast?.(`✅ Status updated to ${newStatus}`);
      } catch { }

    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Check the console for details.");
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const openView = useCallback((driver) => {
    setSelected(driver);
    setOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeView = useCallback(() => {
    setOpen(false);
    setSelected(null);
    document.body.style.overflow = "";
  }, []);

  // Helper: render small thumbnail(s) for table column
  function Thumbnails({ driver }) {
    const thumbs = [];
    if (driver.driverImage) thumbs.push({ src: driver.driverImage, title: "Profile" });
    if (driver.idCardImage) thumbs.push({ src: driver.idCardImage, title: "ID front" });
    if (driver.licenceImage) thumbs.push({ src: driver.licenceImage, title: "License front" });

    if (thumbs.length === 0) {
      return (
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-400 border border-slate-200">
          <Icons.FileText size={18} />
        </div>
      );
    }

    return (
      <div className="flex -space-x-2 items-center">
        {thumbs.slice(0, 3).map((t, i) => (
          <img
            key={i}
            src={t.src}
            alt={t.title}
            title={t.title}
            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md transition-transform duration-200 hover:scale-110"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ))}
        {thumbs.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-slate-100 text-xs text-slate-600 flex items-center justify-center border-2 border-white font-medium shadow-sm">
            +{thumbs.length - 3}
          </div>
        )}
      </div>
    );
  }

  // Card component for mobile view (Optimized for small screens)
  function MobileDriverCard({ driver, idx }) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.25, delay: idx * 0.04 }}
        className="bg-white rounded-xl shadow-lg p-4 mb-4 border border-slate-100 cursor-pointer transition-shadow duration-300 hover:shadow-xl"
        onClick={() => openView(driver)}
        role="listitem"
        tabIndex={0}
      >
        <div className="flex justify-between items-start mb-3 border-b pb-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            {driver.driverImage ? (
              <img
                src={driver.driverImage}
                alt={driver.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md flex-shrink-0"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br ${nameToGradient(
                  driver.name
                )} shadow-md flex-shrink-0`}
              >
                {driver.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-lg text-slate-800 truncate">{driver.name}</div>
              <div className="text-sm text-slate-500 truncate">{driver.phone}</div>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            {statusUpdateLoading === driver.id ? (
              <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center">
                <Icons.Loader2 size={12} className="animate-spin mr-1" />
                Updating...
              </div>
            ) : (
              <StatusBadge
                status={driver.status}
                onStatusChange={(newStatus) => updateStatus(driver.id, newStatus)}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-sm text-slate-600 mb-3">
          <div className="col-span-2 sm:col-span-1 flex items-center min-w-0">
            <Icons.Truck size={16} className="inline mr-2 text-slate-400 flex-shrink-0" />
            <span className="truncate">{driver.vehicle}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center min-w-0">
            <Icons.Badge size={16} className="inline mr-2 text-slate-400 flex-shrink-0" />
            <span className="truncate font-medium text-indigo-700">{driver.plate}</span>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center min-w-0">
            <Icons.Calendar size={16} className="inline mr-2 text-slate-400 flex-shrink-0" />
            <span className="truncate text-xs sm:text-sm">Joined {driver.joined.split(",")[0]}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center min-w-0">
            <Icons.Mail size={16} className="inline mr-2 text-slate-400 flex-shrink-0" />
            <span className="truncate text-xs sm:text-sm">{driver.email}</span>
          </div>
        </div>

        <div className="flex justify-between items-center border-t pt-3">
          <div className="flex items-center gap-2">
            <Thumbnails driver={driver} />
            <span className="text-xs text-slate-500 hidden sm:inline flex-shrink-0">
              ({[driver.driverImage, driver.idCardImage, driver.licenceImage].filter(Boolean).length} Docs)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-bold text-lg text-indigo-700">{driver.trips}</span>
            <span className="text-sm text-slate-500 hidden sm:inline">Trips</span>
            
            {/* ADD EDIT BUTTON IN MOBILE VIEW */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); handleEdit(driver.id); }}
              className="p-2 rounded-full bg-emerald-50 hover:bg-emerald-100 transition-colors"
              title="Edit Driver"
              aria-label={`Edit ${driver.name}`}
            >
              <Icons.Edit size={16} className="text-emerald-600" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); openView(driver); }}
              className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100 transition-colors"
              title="View Details"
              aria-label={`View details for ${driver.name}`}
            >
              <Icons.ArrowRight size={16} className="text-indigo-600" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Open requests modal (from inside view modal)
  const openRequestsForSelected = () => {
    setRequestOpen(true);
  };
  const closeRequests = () => setRequestOpen(false);

  // Open Add Driver modal
  const openAddDriver = () => setAddOpen(true);
  const closeAddDriver = () => setAddOpen(false);

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-slate-50">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Drivers</h2>
            <p className="text-sm text-slate-600 mt-1">Manage driver applications and status</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Search Bar */}
            <div className="flex items-center bg-white border border-slate-200 rounded-full px-4 py-2 shadow-inner flex-grow sm:flex-grow-0">
              <Icons.Search size={18} className="text-slate-400 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, plate..."
                className="ml-2 bg-transparent outline-none placeholder:text-slate-400 text-sm w-full sm:w-64"
                aria-label="Search drivers"
              />
            </div>

            {/* Status Filter */}
            <select
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-full bg-white text-sm shadow-inner"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Active">Active</option>
              <option value="Offline">Offline</option>
            </select>

            {/* Add Driver Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
              onClick={openAddDriver}
              aria-label="Add New Driver"
            >
              <Icons.UserPlus size={18} />
              <span className="hidden sm:inline">Add New Driver</span>
              <span className="inline sm:hidden">Add</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-100">
          <div className="text-2xl font-bold text-slate-800">{drivers.length}</div>
          <div className="text-sm text-slate-600">Total Drivers</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-lg border border-yellow-100">
          <div className="text-2xl font-bold text-yellow-600">
            {drivers.filter(d => d.status === "Pending").length}
          </div>
          <div className="text-sm text-slate-600">Pending Review</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-lg border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-600">
            {drivers.filter(d => d.status === "Approved" || d.status === "Active").length}
          </div>
          <div className="text-sm text-slate-600">Approved</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-lg border border-rose-100">
          <div className="text-2xl font-bold text-rose-600">
            {drivers.filter(d => d.status === "Rejected").length}
          </div>
          <div className="text-sm text-slate-600">Rejected</div>
        </div>
      </div>

      {/* Card/Table Container */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden ring-1 ring-slate-200">
        <div className="px-6 py-4 border-b flex flex-col sm:flex-row items-center justify-between bg-slate-50">
          <div className="text-sm text-slate-500 mb-2 sm:mb-0">
            Total: <span className="font-bold text-slate-700">{drivers.length}</span> / Showing{" "}
            <span className="font-bold text-slate-700">{filtered.length}</span> results
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            {drivers.filter(d => d.status === "Pending").length > 0 && (
              <span className="text-yellow-600 font-medium">
                {drivers.filter(d => d.status === "Pending").length} drivers pending review
              </span>
            )}
          </div>
        </div>

        {/* Desktop Table View (lg and up) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-slate-100">
              <tr className="text-left text-xs font-semibold uppercase text-slate-600 tracking-wider">
                <th className="px-6 py-3 w-1/4">Driver / Vehicle</th>
                <th className="px-6 py-3">Docs</th>
                <th className="px-6 py-3">Plate</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3 text-center">Trips</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center w-[150px]">Actions</th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <Icons.Loader2 size={24} className="mx-auto mb-3 animate-spin text-indigo-400" />
                      Loading Drivers...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((d, idx) => (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, delay: idx * 0.02, ease: "easeOut" }}
                      className="border-b last:border-b-0 hover:bg-indigo-50/50 cursor-pointer transition-colors duration-150"
                      onClick={() => openView(d)}
                      role="row"
                      tabIndex={0}
                    >
                      {/* Driver Name & Vehicle Consolidation */}
                      <td className="px-6 py-4 flex items-center gap-4">
                        {d.driverImage ? (
                          <img src={d.driverImage} alt={d.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md" onError={(e) => (e.currentTarget.style.display = "none")} />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br ${nameToGradient(d.name)} shadow-md`}>
                            {d.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                        )}
                        <div className="min-w-0 flex-grow">
                          <div className="font-medium text-slate-800 truncate max-w-[200px]">{d.name}</div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <Icons.Truck size={12} className="text-slate-400" />
                            <span className="truncate max-w-[200px]">{d.vehicle}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Thumbnails driver={d} />
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-indigo-700">{d.plate}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{d.phone}</td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-indigo-100 px-3 py-1 rounded-full text-xs font-bold text-indigo-700 shadow-sm">
                          {d.trips}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {statusUpdateLoading === d.id ? (
                          <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center">
                            <Icons.Loader2 size={12} className="animate-spin mr-1" />
                            Updating...
                          </div>
                        ) : (
                          <StatusBadge
                            status={d.status}
                            onStatusChange={(newStatus) => updateStatus(d.id, newStatus)}
                          />
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); openView(d); }}
                            className="p-2 rounded-full bg-indigo-50 hover:bg-indigo-100 transition-all shadow-sm"
                            title="View Full Profile"
                            aria-label={`View full profile for ${d.name}`}
                          >
                            <Icons.Eye size={16} className="text-indigo-600" />
                          </motion.button>

                          {/* UPDATE EDIT BUTTON TO USE handleEdit */}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); handleEdit(d.id); }}
                            className="p-2 rounded-full bg-emerald-50 hover:bg-emerald-100 transition-all shadow-sm"
                            title="Edit"
                            aria-label={`Edit details for ${d.name}`}
                          >
                            <Icons.Edit size={16} className="text-emerald-600" />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                            className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 transition-all shadow-sm"
                            title="Delete"
                            aria-label={`Delete ${d.name}`}
                          >
                            <Icons.Trash2 size={16} className="text-rose-600" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <Icons.Truck size={36} className="mx-auto mb-3 text-slate-300" />
                      No drivers found matching your search criteria.
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View (hidden on lg and up) */}
        <div className="lg:hidden p-4" role="list">
          <AnimatePresence mode="wait">
            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <Icons.Loader2 size={24} className="mx-auto mb-3 animate-spin text-indigo-400" />
                Loading Drivers...
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((d, idx) => <MobileDriverCard key={d.id} driver={d} idx={idx} />)
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-slate-400">
                <Icons.Truck size={36} className="mx-auto mb-3 text-slate-300" />
                No drivers found. Try a different search or add a driver.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {open && selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black z-40"
              onClick={closeView}
              aria-label="Close modal background"
            />

            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="driver-modal-title"
            >
              <div className="p-6 border-b flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold ${nameToGradient(
                      selected.name
                    )} bg-gradient-to-br text-lg overflow-hidden flex-shrink-0 shadow-md`}
                  >
                    {selected.driverImage ? (
                      <img src={selected.driverImage} alt={`Profile photo of ${selected.name}`} className="w-full h-full object-cover" />
                    ) : (
                      selected.name.split(" ").map((n) => n[0]).slice(0, 2).join("")
                    )}
                  </div>
                  <div>
                    <h2 id="driver-modal-title" className="text-xl font-bold text-slate-800">
                      {selected.name}
                    </h2>
                    <div className="text-sm text-slate-500">{selected.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {statusUpdateLoading === selected.id ? (
                    <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center">
                      <Icons.Loader2 size={12} className="animate-spin mr-1" />
                      Updating...
                    </div>
                  ) : (
                    <StatusBadge
                      status={selected.status}
                      onStatusChange={(newStatus) => updateStatus(selected.id, newStatus)}
                    />
                  )}
                  <motion.button
                    onClick={closeView}
                    className="p-2 rounded-full hover:bg-slate-200 transition-colors"
                    whileHover={{ rotate: 90 }}
                    title="Close"
                    aria-label="Close driver detail modal"
                  >
                    <Icons.X size={20} className="text-slate-600" />
                  </motion.button>
                </div>
              </div>

              <div className="px-6 py-6 overflow-y-auto max-h-[70vh]">
                <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">Documents & Images</h3>
                {/* images grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { key: "driverImage", label: "Profile Photo" },
                    { key: "idCardImage", label: "ID (Front)" },
                    { key: "idCardBackImage", label: "ID (Back)" },
                    { key: "licenceImage", label: "License (Front)" },
                    { key: "licenceBackImage", label: "License (Back)" },
                  ].map(({ key, label }) => {
                    const url = selected[key];
                    return (
                      <div key={key} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
                        <div className="text-xs font-medium text-slate-500 mb-2">{label}</div>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="block" title={`View ${label} in new tab`}>
                            <img
                              src={url}
                              alt={label}
                              className="w-full h-32 sm:h-44 object-contain rounded-lg bg-slate-100 border border-dashed border-slate-300 transition-opacity duration-300 hover:opacity-80"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                            <div className="text-center text-xs text-indigo-500 mt-2 flex items-center justify-center gap-1">
                              <Icons.Maximize2 size={12} /> Enlarge
                            </div>
                          </a>
                        ) : (
                          <div className="h-32 sm:h-44 flex flex-col items-center justify-center text-slate-400 bg-slate-100 rounded-lg">
                            <Icons.ImageOff size={24} />
                            <span className="text-sm mt-1">Missing</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">Raw Data & Other Details</h3>
                {/* key/value details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(selected.raw || {}).map(([k, v]) => {
                    // Skip displayed fields
                    if (
                      [
                        "driverImage",
                        "idCardImage",
                        "idCardBackImage",
                        "licenceImage",
                        "licenceBackImage",
                        "name",
                        "fullName",
                        "mobileNumber",
                        "phone",
                        "mobile",
                        "email",
                        "vehicle",
                        "vehicleType",
                        "licenceNumber",
                        "vehicleNo",
                        "vehiclePlate",
                        "plate",
                        "createdAt",
                        "joinedAt",
                        "updatedProfileAt",
                        "driverStatus",
                        "status",
                        "currentStatus",
                        "trips",
                        "totalTrips",
                      ].includes(k)
                    )
                      return null;

                    const display = formatValue(v);

                    return (
                      <div key={k} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <div className="text-xs text-slate-400 font-medium uppercase truncate" title={k}>
                          {k}
                        </div>
                        <div className="text-sm text-slate-700 mt-1 break-words font-mono bg-slate-50 p-1 rounded-md">{display}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
                {/* ADD EDIT BUTTON IN MODAL */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleEdit(selected.id);
                    closeView();
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-medium transition-colors flex items-center gap-2"
                  aria-label={`Edit ${selected.name}`}
                >
                  <Icons.Edit size={16} />
                  Edit Driver
                </motion.button>

                {/* Driver Requests button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    openRequestsForSelected();
                  }}
                  className="px-4 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium transition-colors flex items-center gap-2"
                  aria-label={`Show requests for ${selected.name}`}
                >
                  <Icons.ListChecks size={16} />
                  Driver Requests
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DriverRequest modal */}
      <DriverRequest open={requestOpen} onClose={closeRequests} driver={selected} />

      {/* Add Driver modal */}
      <AddDrivers open={addOpen} onClose={closeAddDriver} />
    </div>
  );
}