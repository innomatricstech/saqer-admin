// src/pages/Drivers.jsx
import React, { useEffect, useState } from "react";
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
import { db } from "../../firebase"; // adjust path to your firebase export

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

/**
 * Drivers page - realtime from Firestore
 * - shows thumbnails in table (driverImage + doc images)
 * - modal shows larger images + all useful fields
 */
export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "drivers"), orderBy("name", "asc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() || {};
          // Map/normalize fields (use what your documents contain)
          return {
            id: d.id,
            name: data.name || data.fullName || "Unknown",
            phone: data.mobileNumber || data.phone || data.mobile || "",
            email: data.email || "",
            vehicle: data.vehicle || data.vehicleType || "-",
            plate:
              data.licenceNumber ||
              data.vehicleNo ||
              data.vehiclePlate ||
              data.plate ||
              "-",
            status: data.driverStatus || data.status || data.currentStatus || "Pending",
            joined:
              (data.createdAt && data.createdAt.seconds && new Date(data.createdAt.seconds * 1000).toLocaleDateString()) ||
              (data.joinedAt && data.joinedAt.seconds && new Date(data.joinedAt.seconds * 1000).toLocaleDateString()) ||
              data.updatedProfileAt ||
              "-",
            trips: Number(data.trips) || Number(data.totalTrips) || 0,
            notes: data.notes || data.note || "",
            // image fields from your screenshots
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
      (d.plate || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete driver? This will remove driver from Firestore.");
    if (!ok) return;
    try {
      await deleteDoc(firestoreDoc(db, "drivers", id));
    } catch (err) {
      console.error("Failed to delete driver:", err);
      alert("Failed to delete driver. Check the console for details.");
    }
  };

  const toggleStatus = async (id) => {
    const d = drivers.find((x) => x.id === id);
    if (!d) return;
    const newStatus = d.status === "Active" ? "Offline" : "Active";
    try {
      await updateDoc(firestoreDoc(db, "drivers", id), { driverStatus: newStatus, status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Check the console for details.");
    }
  };

  const openView = (driver) => {
    setSelected(driver);
    setOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeView = () => {
    setOpen(false);
    setSelected(null);
    document.body.style.overflow = "";
  };

  // Helper: render small thumbnail(s) for table column
  function Thumbnails({ driver }) {
    const thumbs = [];
    if (driver.driverImage) thumbs.push({ src: driver.driverImage, title: "Profile" });
    if (driver.idCardImage) thumbs.push({ src: driver.idCardImage, title: "ID front" });
    if (driver.idCardBackImage) thumbs.push({ src: driver.idCardBackImage, title: "ID back" });
    if (driver.licenceImage) thumbs.push({ src: driver.licenceImage, title: "License front" });
    if (driver.licenceBackImage) thumbs.push({ src: driver.licenceBackImage, title: "License back" });

    if (thumbs.length === 0) {
      return (
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-200 text-slate-500">
          <Icons.User />
        </div>
      );
    }

    // show up to 3 thumbnails stacked
    return (
      <div className="flex -space-x-2 items-center">
        {thumbs.slice(0, 3).map((t, i) => (
          <img
            key={i}
            src={t.src}
            alt={t.title}
            title={t.title}
            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
            onError={(e) => {
              // hide broken images
              e.currentTarget.style.display = "none";
            }}
          />
        ))}
        {thumbs.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-slate-100 text-xs text-slate-600 flex items-center justify-center border-2 border-white">
            +{thumbs.length - 3}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Drivers</h2>
          <p className="text-sm text-slate-500">Manage drivers and view uploaded documents</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/5 rounded-full px-3 py-2 shadow-sm">
            <Icons.Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, vehicle or plate..."
              className="ml-2 bg-transparent outline-none placeholder:text-slate-400 text-sm w-64"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-lg shadow"
            onClick={() => alert("Wire up Add Driver modal or route")}
          >
            <Icons.UserPlus size={16} />
            Add Driver
          </motion.button>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{filtered.length}</span> drivers
          </div>
          <div className="text-xs text-slate-400">Click View to see profile & all documents</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-500">
                <th className="px-6 py-3">Driver</th>
                <th className="px-6 py-3">Docs</th>
                <th className="px-6 py-3">Vehicle</th>
                <th className="px-6 py-3">Plate</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3 text-center">Trips</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((d, idx) => (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18, delay: idx * 0.03 }}
                      className="border-b last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 flex items-center gap-3">
                        {d.driverImage ? (
                          <img src={d.driverImage} alt={d.name} className="w-10 h-10 rounded-full object-cover border" onError={(e)=>e.currentTarget.style.display='none'} />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br ${nameToGradient(d.name)}`}>
                            {d.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-800">{d.name}</div>
                          <div className="text-xs text-slate-400">Joined {d.joined}</div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Thumbnails driver={d} />
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">{d.vehicle}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{d.plate}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{d.phone}</td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-700 shadow-sm">
                          {d.trips}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => toggleStatus(d.id)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            d.status === "Active"
                              ? "bg-emerald-100 text-emerald-700"
                              : d.status === "Offline"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                          title="Toggle status"
                        >
                          {d.status}
                        </motion.button>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openView(d)}
                            className="p-2 rounded-md bg-white hover:bg-slate-50 shadow-sm"
                            title="View"
                          >
                            <Icons.Eye size={16} className="text-indigo-600" />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => alert("Edit driver - implement flow")}
                            className="p-2 rounded-md bg-white hover:bg-slate-50 shadow-sm"
                            title="Edit"
                          >
                            <Icons.Edit size={16} className="text-emerald-600" />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(d.id)}
                            className="p-2 rounded-md bg-white hover:bg-slate-50 shadow-sm"
                            title="Delete"
                          >
                            <Icons.Trash2 size={16} className="text-rose-600" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <Icons.Truck size={36} className="mx-auto mb-3 text-slate-300" />
                      No drivers found. Try a different search or add a driver.
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {open && selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={closeView}
            />

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold ${nameToGradient(selected.name)} bg-gradient-to-br text-lg overflow-hidden`}>
                    {selected.driverImage ? (
                      <img src={selected.driverImage} alt={selected.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      selected.name.split(" ").map((n) => n[0]).slice(0, 2).join("")
                    )}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-800">{selected.name}</div>
                    <div className="text-sm text-slate-500">{selected.email}</div>
                  </div>
                </div>

                <button onClick={closeView} className="p-2 rounded-full hover:bg-slate-100">
                  <Icons.X size={18} />
                </button>
              </div>

              <div className="px-6 py-6 overflow-y-auto max-h-[70vh]">
                {/* images grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {[
                    { key: "driverImage", label: "Profile Photo" },
                    { key: "idCardImage", label: "ID (Front)" },
                    { key: "idCardBackImage", label: "ID (Back)" },
                    { key: "licenceImage", label: "License (Front)" },
                    { key: "licenceBackImage", label: "License (Back)" },
                  ].map(({ key, label }) => {
                    const url = selected[key];
                    return (
                      <div key={key} className="bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs text-slate-400 mb-2">{label}</div>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="block">
                            <img src={url} alt={label} className="w-full h-44 object-contain rounded-md bg-white" onError={(e)=>e.currentTarget.style.display='none'} />
                          </a>
                        ) : (
                          <div className="h-44 flex items-center justify-center text-slate-400 bg-white rounded-md">No image</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* key/value details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(selected.raw || {}).map(([k, v]) => {
                    // don't duplicate big image fields in the list (we showed them above)
                    if (["driverImage","idCardImage","idCardBackImage","licenceImage","licenceBackImage"].includes(k)) return null;
                    // format timestamps nicely
                    let display = v;
                    if (v && typeof v === "object" && (v.seconds || v._seconds)) {
                      // Firestore timestamp-like
                      const seconds = v.seconds || v._seconds;
                      display = new Date(seconds * 1000).toLocaleString();
                    }
                    if (typeof display === "boolean") display = display ? "Yes" : "No";
                    if (display === null || display === undefined || display === "") display = "—";

                    return (
                      <div key={k} className="bg-white p-3 rounded-lg border">
                        <div className="text-xs text-slate-400">{k}</div>
                        <div className="text-sm text-slate-700 mt-1 break-words">{String(display)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button onClick={() => alert("Message feature")} className="px-4 py-2 rounded-md bg-slate-50 hover:bg-slate-100">Message</button>
                <button onClick={() => alert("Open trips list")} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Trips</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
