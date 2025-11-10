// src/components/VehicleList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiFilter,
  FiChevronDown,
  FiSave,
  FiShoppingCart,
  FiX,
} from "react-icons/fi";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

/** Pricing fallback (AED) */
const TYPE_PRICING = {
  "Comfort / Hala Taxi": { baseFare: 8.0, pricePerKm: 2.0 },
  Executive: { baseFare: 18.0, pricePerKm: 3.5 },
  Electric: { baseFare: 8.0, pricePerKm: 1.8 },
  Premier: { baseFare: 16.0, pricePerKm: 3.2 },
  "Eco-friendly": { baseFare: 8.0, pricePerKm: 1.9 },
  "Hala Max": { baseFare: 18.0, pricePerKm: 4.0 },
  "Max 6": { baseFare: 18.0, pricePerKm: 3.8 },
  Default: { baseFare: 10.0, pricePerKm: 2.5 },
};
function getPricingForType(type) {
  if (!type) return TYPE_PRICING.Default;
  return TYPE_PRICING[type] || TYPE_PRICING.Default;
}

/* Motion variants */
const listVariants = {
  hidden: { opacity: 0.98 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 28 } },
  hover: { scale: 1.02, y: -4, transition: { type: "spring", stiffness: 350 } },
};
const modalBackdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalPanel = { hidden: { y: 20, opacity: 0, scale: 0.98 }, visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 28 } } };

export default function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("recommended");
  const [loading, setLoading] = useState(true);
  const [distances, setDistances] = useState({});
  const [editingPriceFor, setEditingPriceFor] = useState(null);
  const [priceEdits, setPriceEdits] = useState({});
  const [bookingModal, setBookingModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { vehicle }
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  // Realtime Firestore listener
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, "customer_cars");
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVehicles(data);
        setLoading(false);
      },
      (err) => {
        console.error("vehicles snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // derived categories for filter
  const categories = useMemo(() => ["All", ...Array.from(new Set(vehicles.map((v) => v.carType || "Unknown")))], [vehicles]);

  // filtered + sorted; memoized and keyed so list animation triggers when criteria change
  const filtered = useMemo(() => {
    let arr = vehicles.filter((v) => {
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        (v.brand && v.brand.toLowerCase().includes(q)) ||
        (v.carType && v.carType.toLowerCase().includes(q)) ||
        (v.city && v.city.toLowerCase().includes(q)) ||
        (v.color && v.color.toLowerCase().includes(q));
      const matchCat = category === "All" ? true : v.carType === category;
      return matchQ && matchCat;
    });

    if (sort === "price-asc")
      arr = arr.sort(
        (a, b) =>
          (a.pricePerKm ?? getPricingForType(a.carType).pricePerKm) - (b.pricePerKm ?? getPricingForType(b.carType).pricePerKm)
      );
    else if (sort === "price-desc")
      arr = arr.sort(
        (a, b) =>
          (b.pricePerKm ?? getPricingForType(b.carType).pricePerKm) - (a.pricePerKm ?? getPricingForType(a.carType).pricePerKm)
      );

    return arr;
  }, [vehicles, query, category, sort]);

  /* CRUD actions now use a modal + toast */
  async function performDelete(vehicle) {
    // Called after user confirms in modal
    try {
      await deleteDoc(doc(db, "customer_cars", vehicle.id));
      setToast("Vehicle deleted");
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error(err);
      setToast("Failed to delete vehicle");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setDeleteModal(null);
    }
  }

  function handleEdit(vehicle) {
    navigate(`/customers/vehicles/add?vehicleId=${vehicle.id}`);
  }

  function setDistanceFor(id, value) {
    setDistances((p) => ({ ...p, [id]: value }));
  }

  function estimateFareValues(vehicle, kmOverride) {
    const pricePerKm = Number(vehicle.pricePerKm ?? getPricingForType(vehicle.carType).pricePerKm);
    const baseFare = Number(vehicle.baseFare ?? getPricingForType(vehicle.carType).baseFare);
    const km = Number(kmOverride ?? distances[vehicle.id] ?? 5);
    const total = baseFare + pricePerKm * km;
    return { baseFare, pricePerKm, km, total };
  }

  function openBookingModal(vehicle) {
    const { baseFare, pricePerKm, km, total } = estimateFareValues(vehicle);
    setBookingModal({ vehicle, baseFare, pricePerKm, km, total });
  }

  async function confirmBooking() {
    if (!bookingModal) return;
    const { vehicle, km, total } = bookingModal;
    try {
      await addDoc(collection(db, "BOOKINGS"), {
        vehicleId: vehicle.id,
        brand: vehicle.brand ?? null,
        carType: vehicle.carType ?? null,
        customerId: vehicle.customerId ?? null,
        distanceKm: Number(km),
        totalFare: Number(total),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setBookingModal(null);
      setToast("Booking created");
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error(err);
      setToast("Failed to create booking");
      setTimeout(() => setToast(null), 2500);
    }
  }

  function startEditingPrice(vehicle) {
    setEditingPriceFor(vehicle.id);
    setPriceEdits((p) => ({
      ...p,
      [vehicle.id]: {
        baseFare: vehicle.baseFare ?? getPricingForType(vehicle.carType).baseFare,
        pricePerKm: vehicle.pricePerKm ?? getPricingForType(vehicle.carType).pricePerKm,
      },
    }));
  }

  async function savePriceEdits(vehicleId) {
    const edits = priceEdits[vehicleId];
    if (!edits) return;
    const parsedBase = Number(edits.baseFare);
    const parsedPerKm = Number(edits.pricePerKm);
    if (Number.isNaN(parsedBase) || Number.isNaN(parsedPerKm)) {
      setToast("Enter valid numbers");
      setTimeout(() => setToast(null), 1800);
      return;
    }
    try {
      await updateDoc(doc(db, "customer_cars", vehicleId), {
        baseFare: parsedBase,
        pricePerKm: parsedPerKm,
      });
      setEditingPriceFor(null);
      setToast("Pricing updated");
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.error(err);
      setToast("Failed to update pricing");
      setTimeout(() => setToast(null), 2000);
    }
  }

  /* UI small components inside file */
  const SkeletonCard = () => (
    <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg p-4 animate-pulse">
      <div className="h-10 w-10 rounded bg-slate-200 mb-2" />
      <div className="h-3 bg-slate-200 rounded mb-2 w-3/4" />
      <div className="h-2 bg-slate-200 rounded mb-1 w-1/2" />
      <div className="mt-4 h-8 bg-slate-200 rounded" />
    </div>
  );

  return (
    <div className="w-full">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">Vehicle List</h2>
          <p className="text-xs sm:text-sm text-gray-500">Manage & book vehicles — fares in AED</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-white shadow-sm rounded-lg px-3 py-2 w-full sm:w-80">
            <FiSearch className="text-gray-400 mr-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brand / type / city"
              className="outline-none w-full text-sm"
            />
          </div>

          <div className="bg-white shadow-sm rounded-lg p-2 flex items-center gap-2 text-sm">
            <FiFilter />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-transparent outline-none"
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-2 flex items-center gap-2 text-sm">
            <FiChevronDown />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent outline-none">
              <option value="recommended">Recommended</option>
              <option value="price-asc">Price (Low → High)</option>
              <option value="price-desc">Price (High → Low)</option>
            </select>
          </div>

          <Link to="/customers/vehicles/add" className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg shadow-sm text-sm">
            <FiPlus /> Add Vehicle
          </Link>
        </div>
      </header>

      {/* Animated List: when query/category/sort changes, filtered is re-calculated and layout animates */}
      <section>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No vehicles found.</div>
        ) : (
          <motion.div
            key={`${category}-${sort}-${query}`} // key forces a subtle fade + re-animate on filter change
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence>
              {filtered.map((v) => {
                const pricing = estimateFareValues(v);
                return (
                  <motion.article
                    key={v.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    exit={{ opacity: 0, y: -8 }}
                    layout
                    className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg border border-transparent hover:border-slate-100 flex flex-col justify-between"
                    role="group"
                    aria-labelledby={`veh-${v.id}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {v.brandImage ? (
                              <img src={v.brandImage} alt={v.brand} className="max-h-10 object-contain" />
                            ) : (
                              <div className="text-xs font-medium text-indigo-600">{(v.brand || v.carType || "VEH").slice(0,3).toUpperCase()}</div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 id={`veh-${v.id}`} className="text-sm sm:text-base font-semibold truncate">{v.brand ?? v.carType ?? "Vehicle"}</h3>
                            <p className="text-xs text-gray-500 truncate">{v.carType} • {v.city || "Unknown"}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] text-gray-400">Base</div>
                          <div className="text-base font-bold">AED {(v.baseFare ?? getPricingForType(v.carType).baseFare).toFixed(2)}</div>
                          <div className="text-[11px] text-gray-400">+ AED {(v.pricePerKm ?? getPricingForType(v.carType).pricePerKm).toFixed(2)}/km</div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-600">
                        <div>Color: <span className="font-medium">{v.color || "N/A"}</span></div>
                        <div>Fuel: <span className="font-medium">{v.fuelType || "N/A"}</span></div>
                        <div>Seats: <span className="font-medium">{v.seats || "N/A"}</span></div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-xs text-gray-500">Km</label>
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={distances[v.id] ?? 5}
                          onChange={(e) => setDistanceFor(v.id, e.target.value)}
                          className="w-20 rounded-md border p-1 text-xs"
                        />
                        <div className="ml-2 text-xs text-gray-500 hidden sm:block">Est: <span className="font-medium">AED {pricing.total.toFixed(2)}</span></div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openBookingModal(v)}
                          className="px-3 py-1 rounded-md bg-amber-500 text-white text-xs inline-flex items-center gap-2 shadow-sm"
                        >
                          <FiShoppingCart /> <span>Book</span>
                        </motion.button>

                        {editingPriceFor === v.id ? (
                          <>
                            <input
                              type="number"
                              step="0.1"
                              className="w-20 rounded-md border p-1 text-xs"
                              value={priceEdits[v.id]?.baseFare ?? ""}
                              onChange={(e) => setPriceEdits((p) => ({ ...p, [v.id]: { ...p[v.id], baseFare: e.target.value } }))}
                              placeholder="Base"
                            />
                            <input
                              type="number"
                              step="0.1"
                              className="w-20 rounded-md border p-1 text-xs"
                              value={priceEdits[v.id]?.pricePerKm ?? ""}
                              onChange={(e) => setPriceEdits((p) => ({ ...p, [v.id]: { ...p[v.id], pricePerKm: e.target.value } }))}
                              placeholder="Per km"
                            />
                            <motion.button whileTap={{ scale: 0.98 }} onClick={() => savePriceEdits(v.id)} className="px-2 py-1 rounded-md bg-emerald-600 text-white text-xs">Save</motion.button>
                            <button onClick={() => setEditingPriceFor(null)} className="px-2 py-1 rounded-md border text-xs">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditingPrice(v)} className="px-2 py-1 rounded-md border text-xs" title="Edit price"><FiEdit /></button>
                            <button onClick={() => handleEdit(v)} className="px-2 py-1 rounded-md border text-xs" title="Edit vehicle">Edit</button>
                            <button onClick={() => setDeleteModal(v)} className="px-2 py-1 rounded-md border text-xs text-rose-600" title="Delete"><FiTrash2 /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* Booking Modal */}
      <AnimatePresence>
        {bookingModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial="hidden" animate="visible" exit="hidden" variants={modalBackdrop}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setBookingModal(null)} />

            <motion.div variants={modalPanel} className="relative bg-white w-full max-w-md rounded-2xl shadow-xl p-5 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Confirm Booking</h3>
                  <p className="text-xs text-gray-500">{bookingModal.vehicle.brand} — {bookingModal.vehicle.carType}</p>
                </div>
                <button onClick={() => setBookingModal(null)} className="text-gray-500"><FiX /></button>
              </div>

              <div className="mt-4 text-sm text-gray-700 space-y-2">
                <div className="flex justify-between"><div>Distance</div><div>{bookingModal.km} km</div></div>
                <div className="flex justify-between"><div>Base fare</div><div>AED {bookingModal.baseFare.toFixed(2)}</div></div>
                <div className="flex justify-between"><div>Per km</div><div>AED {bookingModal.pricePerKm.toFixed(2)}/km</div></div>
                <div className="flex justify-between font-bold"><div>Estimated total</div><div>AED {bookingModal.total.toFixed(2)}</div></div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setBookingModal(null)} className="px-3 py-2 rounded-md border text-sm">Cancel</button>
                <button onClick={confirmBooking} className="px-3 py-2 rounded-md bg-green-600 text-white text-sm">Confirm</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal (replaces window.confirm) */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial="hidden" animate="visible" exit="hidden" variants={modalBackdrop}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteModal(null)} />

            <motion.div variants={modalPanel} className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-rose-600">Delete Vehicle</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
                <button onClick={() => setDeleteModal(null)} className="text-gray-500"><FiX /></button>
              </div>

              <div className="mt-4 text-sm text-gray-700">
                Are you sure you want to permanently delete <span className="font-medium">{deleteModal.brand ?? deleteModal.carType}</span>?
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setDeleteModal(null)} className="px-3 py-2 rounded-md border text-sm">Cancel</button>
                <button onClick={() => performDelete(deleteModal)} className="px-3 py-2 rounded-md bg-rose-600 text-white text-sm">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="fixed right-4 bottom-6 z-60">
            <div className="bg-slate-900 text-white px-4 py-2 rounded-md shadow">{toast}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
