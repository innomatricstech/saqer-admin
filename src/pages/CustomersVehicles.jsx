// src/pages/CustomersVehicles.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, onSnapshot, orderBy, query, getDoc, doc as firestoreDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";

/**
 * Reads:
 *  - customer_cars collection (documents like in your screenshot)
 *  - customer collection (owner info)
 *
 * Field assumptions (from your screenshot):
 *  - brand, brandImage, carType, city, color, createdAt, customerId, fuelType, id, plate (optional)
 *
 * Adjust field names if your schema differs.
 */

/* ---------- helpers ---------- */
const nameToGradient = (name = "") => {
  const grads = [
    "from-indigo-500 to-purple-500",
    "from-rose-400 to-orange-400",
    "from-emerald-400 to-teal-500",
    "from-yellow-400 to-red-400",
    "from-sky-400 to-indigo-600",
  ];
  if (!name) return grads[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i);
  return grads[Math.abs(h) % grads.length];
};

const formatDate = (ts) => {
  if (!ts) return "—";
  try {
    const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleString();
  } catch {
    return "—";
  }
};

/* ---------- Avatar ---------- */
const Avatar = ({ url, label, size = "sm" }) => {
  const initials = (label || "V").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const sizeClass = size === "lg" ? "w-16 h-16" : "w-10 h-10";
  return (
    <div className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center bg-slate-100 shadow-sm`}>
      {url ? (
        <img src={url} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center text-white font-semibold bg-gradient-to-br ${nameToGradient(label || "")}`}>
          <span className={size === "lg" ? "text-lg" : "text-sm"}>{initials}</span>
        </div>
      )}
    </div>
  );
};

/* ---------- main ---------- */
export default function CustomersVehicles() {
  const [cars, setCars] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);
  const navigate = useNavigate();

  // load customers into map
  useEffect(() => {
    const q = query(collection(db, "customer"), orderBy("fullName", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const m = {};
        snap.docs.forEach((d) => (m[d.id] = { id: d.id, ...d.data() }));
        setCustomersMap(m);
      },
      (err) => {
        console.error("Failed to load customers:", err);
      }
    );
    return () => unsub();
  }, []);

  // load customer_cars collection
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "customer_cars"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
        // ensure each car has an id field (from your screenshot 'id': "2")
        setCars(arr);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("customer_cars snapshot error:", err);
        setError("Failed to load cars.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ESC closes modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (selected && modalRef.current) modalRef.current.focus();
  }, [selected]);

  const qtext = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!qtext) return cars;
    return cars.filter((c) => {
      const owner = customersMap[c.customerId];
      return (
        (c.brand || "").toLowerCase().includes(qtext) ||
        (c.carType || "").toLowerCase().includes(qtext) ||
        (c.color || "").toLowerCase().includes(qtext) ||
        (c.id || "").toString().toLowerCase().includes(qtext) ||
        (c.plate || "").toLowerCase().includes(qtext) ||
        (owner?.fullName || "").toLowerCase().includes(qtext) ||
        (c.city || "").toLowerCase().includes(qtext)
      );
    });
  }, [cars, customersMap, qtext]);

  // helper: ensure we can fetch missing customer on demand
  const refreshCustomer = async (customerId) => {
    try {
      const docRef = firestoreDoc(db, "customer", customerId);
      const snap = await getDoc(docRef);
      if (snap.exists()) setCustomersMap((m) => ({ ...m, [snap.id]: { id: snap.id, ...snap.data() } }));
    } catch (err) {
      console.error("refreshCustomer error", err);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Customer Vehicles</h2>
            <p className="text-sm text-slate-500">Vehicles (from customer_cars)</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-white border rounded-full px-3 py-2 shadow-sm flex-1 md:flex-none min-w-[220px]">
              <Icons.Search className="text-slate-400" size={16} />
              <input
                className="ml-2 outline-none bg-transparent placeholder:text-slate-400 text-sm w-full md:w-64"
                placeholder="Search brand, type, color, city, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="ml-2 p-1 rounded-full hover:bg-slate-100">
                  <Icons.X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => navigate("/customers/vehicles/add")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:-translate-y-0.5"
            >
              <Icons.Plus size={16} /> Add Vehicle
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100">
          <div className="px-6 py-3 border-b bg-slate-50 flex justify-between items-center">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{filtered.length}</span> vehicles
            </div>
            <div className="text-xs text-slate-400">Click a row to view vehicle details</div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-md bg-slate-50 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="w-3/5 h-3 bg-slate-200 rounded" />
                      <div className="w-1/3 h-2 bg-slate-200 rounded" />
                    </div>
                    <div className="w-40 h-8 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-10 text-rose-600">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Icons.Box className="mx-auto mb-2 text-slate-300" size={26} />
                No vehicles found
              </div>
            ) : (
              <div className="p-3">
                <div className="grid gap-2">
                  {filtered.map((c) => {
                    const owner = customersMap[c.customerId];
                    const title = `${c.brand || ""} ${c.carType || ""}`.trim() || "Unnamed car";
                    const imageUrl = c.brandImage || c.imageUrl || null;
                    return (
                      <motion.div
                        key={c.docId || c.id || title}
                        layout
                        whileHover={{ scale: 1.01 }}
                        onClick={() => {
                          // if owner missing, try refresh
                          if (c.customerId && !owner) refreshCustomer(c.customerId);
                          setSelected(c);
                        }}
                        className="cursor-pointer p-3 rounded-md border hover:shadow-sm flex items-center gap-4 bg-white"
                      >
                        <Avatar url={imageUrl} label={title} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="truncate">
                              <div className="font-medium text-slate-800 truncate">{title}</div>
                              <div className="text-xs text-slate-400 truncate">Doc ID: {c.docId || c.id}</div>
                            </div>

                            <div className="text-right text-sm text-slate-500">
                              <div className="font-mono">{c.plate || c.registration || "—"}</div>
                              <div className="text-xs mt-1">{formatDate(c.createdAt)}</div>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-slate-500 flex items-center gap-3">
                            <span>
                              Owner:{" "}
                              <span className="text-slate-700">
                                {owner?.fullName || (c.customerId ? `#${String(c.customerId).slice(0, 6)}` : "—")}
                              </span>
                            </span>
                            {owner?.phoneNumber && <span>| {owner.phoneNumber}</span>}
                            {c.city && <span>| {c.city}</span>}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* details modal */}
        <AnimatePresence>
          {selected && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

              <motion.div
                ref={modalRef}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.98, y: -8, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.98, y: -6, opacity: 0 }}
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 ring-1 ring-slate-100"
                role="dialog"
                aria-modal="true"
              >
                <button onClick={() => setSelected(null)} className="absolute top-3 right-3 p-2 hover:bg-slate-100 rounded-full">
                  <Icons.X size={16} />
                </button>

                <div className="flex items-start gap-4 mb-4">
                  <Avatar url={selected.brandImage || selected.imageUrl || null} label={`${selected.brand || ""} ${selected.carType || ""}`} size="lg" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">{(selected.brand || "") + (selected.carType ? " " + selected.carType : "")}</h3>
                        <p className="text-sm text-slate-500">{selected.plate || selected.registration || "—"}</p>
                      </div>

                      <div>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                          <Icons.Truck size={14} /> Vehicle
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 mt-2 flex flex-wrap gap-3 items-center">
                      <span className="text-xs">Doc ID: <span className="font-mono">{selected.docId || selected.id}</span></span>
                      <span className="text-xs">Created: <span className="font-mono">{formatDate(selected.createdAt)}</span></span>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-slate-700 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Brand</span>
                    <span>{selected.brand || "—"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Type</span>
                    <span>{selected.carType || "—"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Fuel</span>
                    <span>{selected.fuelType || "—"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Color</span>
                    <span>{selected.color || "—"}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-slate-500">Owner</span>
                    <div className="text-right">
                      <div className="font-medium">{customersMap[selected.customerId]?.fullName || (selected.customerId ? `#${String(selected.customerId).slice(0, 6)}` : "—")}</div>
                      <div className="text-xs text-slate-500">{customersMap[selected.customerId]?.email || customersMap[selected.customerId]?.phoneNumber || ""}</div>
                    </div>
                  </div>

                  {selected.brandImage && (
                    <div>
                      <div className="text-slate-500 text-xs">Brand / Car Image</div>
                      <img src={selected.brandImage} alt="car" className="w-full h-48 object-cover rounded-md mt-2 shadow-sm" />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => navigate(`/customers/vehicles/${selected.docId || selected.id}/edit`)} className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200">
                    Edit
                  </button>
                  <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
