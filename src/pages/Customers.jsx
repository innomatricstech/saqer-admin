// src/pages/Customers.jsx
import React, { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
  doc as firestoreDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

/* ---------- helpers (same as your original) ---------- */
function nameToGradient(name = "") {
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
}

const genderLabel = (g) => {
  if (!g) return "—";
  if (g === "male") return "Male";
  if (g === "female") return "Female";
  if (g === "other") return "Other";
  if (g === "prefer_not_to_say") return "Prefer not to say";
  return g;
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

const capitalize = (s) => {
  if (!s) return "—";
  return s
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
};

/* ---------- Avatar (same) ---------- */
const Avatar = ({ person, variant = "sm" }) => {
  const imgUrl = person?.profileImage || person?.profileImageUrl || person?.profileImageUrlString || null;
  const name = person?.fullName || person?.name || "Unknown";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const [imgError, setImgError] = useState(false);
  React.useEffect(() => setImgError(false), [person?.id, imgUrl]);
  const sizeClass = variant === "lg" ? "w-16 h-16" : "w-10 h-10";

  return (
    <div className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center bg-slate-100 shadow-sm`}>
      {imgUrl && !imgError ? (
        <img src={imgUrl} alt={name} onError={() => setImgError(true)} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center text-white font-semibold bg-gradient-to-br ${nameToGradient(name)}`}>
          <span className={variant === "lg" ? "text-lg" : "text-sm"}>{initials}</span>
        </div>
      )}
    </div>
  );
};

/* ---------- Motion variants ---------- */
const rowVariant = { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 }, hover: { scale: 1.01 } };
const listVariant = { visible: { transition: { staggerChildren: 0.03 } } };
const backdropVariant = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const modalVariant = {
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 28 } },
  exit: { opacity: 0, scale: 0.97, y: -4 },
};

export default function Customers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // customer modal selected
  const [selectedVehicle, setSelectedVehicle] = useState(null); // vehicle modal selected
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inline expansion state
  const [expandedRows, setExpandedRows] = useState(new Set());
  const vehiclesUnsubRef = useRef({}); // map: customerKey -> unsub fn
  const [vehiclesByCustomer, setVehiclesByCustomer] = useState({}); // map: customerKey -> { loading, error, vehicles }

  // deletion flow state
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'customer' | 'vehicle', payload: obj }
  const [deleting, setDeleting] = useState(false);

  // flash message
  const [flash, setFlash] = useState(null); // { type: 'success'|'error', text }

  const modalRef = useRef(null);

  /* ---------- subscribe to customers collection (realtime) ---------- */
  useEffect(() => {
    const q = query(collection(db, "customer"), orderBy("joinedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCustomers(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Failed to load customers:", err);
        setError("Failed to load customers.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  /* ---------- cleanup all vehicle listeners when component unmounts ---------- */
  useEffect(() => {
    return () => {
      Object.values(vehiclesUnsubRef.current).forEach((u) => {
        try {
          u && u();
        } catch { }
      });
      vehiclesUnsubRef.current = {};
    };
  }, []);

  const getPhone = (c) => c?.phoneNumber || c?.phone || c?.phoneNo || "";

  const qtext = (search || "").trim().toLowerCase();
  const filtered = customers.filter((c) => {
    const phoneStr = String(getPhone(c) || "");
    return (
      (c.fullName || "").toLowerCase().includes(qtext) ||
      (c.email || "").toLowerCase().includes(qtext) ||
      phoneStr.toLowerCase().includes(qtext) ||
      (String(c.customerId || c.id || "") || "").toLowerCase().includes(qtext)
    );
  });

  /* ---------- subscribe to a customer's vehicles (realtime). used for inline expand & modal ---------- */
  const subscribeToCustomerVehicles = async (customerKey) => {
    if (!customerKey) return;
    if (vehiclesUnsubRef.current[customerKey]) return; // already subscribed

    setVehiclesByCustomer((p) => ({ ...p, [customerKey]: { loading: true, error: null, vehicles: [] } }));

    const tryFallback = (custKey) => {
      try {
        const q2 = query(collection(db, "customer_cars"), where("customerId", "==", custKey));
        const unsub2 = onSnapshot(
          q2,
          (snap) => {
            const arr = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
            arr.sort((a, b) => {
              const as = a.createdAt?.seconds ?? (new Date(a.createdAt).getTime?.() ?? 0);
              const bs = b.createdAt?.seconds ?? (new Date(b.createdAt).getTime?.() ?? 0);
              return bs - as;
            });
            setVehiclesByCustomer((p) => ({ ...p, [custKey]: { loading: false, error: null, vehicles: arr } }));
          },
          (err) => {
            console.error("Fallback customer_cars error:", err);
            setVehiclesByCustomer((p) => ({ ...p, [custKey]: { loading: false, error: "Failed to load vehicles.", vehicles: [] } }));
          }
        );
        vehiclesUnsubRef.current[custKey] = unsub2;
      } catch (err) {
        console.error("Fallback subscribe failed", err);
        setVehiclesByCustomer((p) => ({ ...p, [custKey]: { loading: false, error: "Failed to load vehicles.", vehicles: [] } }));
      }
    };

    try {
      const q1 = query(collection(db, "customer_cars"), where("customerId", "==", customerKey), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(
        q1,
        (snap) => {
          const arr = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
          setVehiclesByCustomer((p) => ({ ...p, [customerKey]: { loading: false, error: null, vehicles: arr } }));
        },
        (err) => {
          console.warn("Primary customer_cars snapshot error:", err);
          // possibly index error: fallback to where-only
          tryFallback(customerKey);
        }
      );
      vehiclesUnsubRef.current[customerKey] = unsub;
    } catch (err) {
      console.warn("subscribe thrown:", err);
      tryFallback(customerKey);
    }
  };

  const unsubscribeCustomerVehicles = (customerKey) => {
    const unsub = vehiclesUnsubRef.current[customerKey];
    if (unsub) {
      try {
        unsub();
      } catch { }
      delete vehiclesUnsubRef.current[customerKey];
    }
    setVehiclesByCustomer((p) => {
      const copy = { ...p };
      delete copy[customerKey];
      return copy;
    });
  };

  /* ---------- toggle inline expand ---------- */
  const toggleExpand = (customer) => {
    const key = customer.customerId || customer.id;
    const newSet = new Set(expandedRows);
    if (newSet.has(key)) {
      newSet.delete(key);
      setExpandedRows(newSet);
      unsubscribeCustomerVehicles(key);
    } else {
      newSet.add(key);
      setExpandedRows(newSet);
      subscribeToCustomerVehicles(key);
    }
  };

  /* ---------- deleteVehicle (implemented already) ---------- */
  async function deleteVehicle(docId) {
    if (!docId) return;
    if (!confirm("Delete this vehicle?")) return;
    try {
      await deleteDoc(firestoreDoc(db, "customer_cars", docId));
      // remove from local vehiclesByCustomer state for immediate UI update
      Object.keys(vehiclesByCustomer).forEach((key) => {
        const st = vehiclesByCustomer[key];
        if (!st) return;
        const newArr = st.vehicles.filter((v) => v.docId !== docId);
        setVehiclesByCustomer((p) => ({ ...p, [key]: { ...p[key], vehicles: newArr } }));
      });
      setFlash({ type: "success", text: "Vehicle deleted." });
      // close vehicle modal if it showed the deleted vehicle
      if (selectedVehicle && selectedVehicle.docId === docId) setSelectedVehicle(null);
      setTimeout(() => setFlash(null), 3500);
    } catch (err) {
      console.error("Failed to delete vehicle:", err);
      setFlash({ type: "error", text: "Failed to delete vehicle." });
      setTimeout(() => setFlash(null), 3500);
    }
  }

  /* ---------- deleteCustomer: delete customer doc and their vehicles (safe, with confirmation modal & animations) ---------- */
  const requestDeleteCustomer = (customer) => {
    setConfirmDelete({ type: "customer", payload: customer });
  };

  const doDeleteCustomer = async () => {
    if (!confirmDelete || confirmDelete.type !== "customer") return;
    const customer = confirmDelete.payload;
    const key = customer.customerId || customer.id;
    if (!key) {
      setFlash({ type: "error", text: "Invalid customer id." });
      setConfirmDelete(null);
      return;
    }

    // begin deletion
    setDeleting(true);
    setFlash(null);

    try {
      // 1) Delete related vehicles (gently)
      const qv = query(collection(db, "customer_cars"), where("customerId", "==", key));
      const snap = await getDocs(qv);
      const deletions = snap.docs.map((d) => deleteDoc(firestoreDoc(db, "customer_cars", d.id)));
      // Wait for all deletions (if any)
      await Promise.allSettled(deletions);

      // 2) Delete customer doc
      await deleteDoc(firestoreDoc(db, "customer", key));

      // 3) Local cleanup: remove from customers and vehicles state, and unsubscribe any listeners
      setCustomers((p) => p.filter((c) => (c.customerId || c.id) !== key));
      if (vehiclesUnsubRef.current[key]) {
        try {
          vehiclesUnsubRef.current[key]();
        } catch { }
        delete vehiclesUnsubRef.current[key];
      }
      setVehiclesByCustomer((p) => {
        const copy = { ...p };
        delete copy[key];
        return copy;
      });

      setFlash({ type: "success", text: "Customer and their vehicles deleted." });
      setTimeout(() => setFlash(null), 3500);
      setConfirmDelete(null);
    } catch (err) {
      console.error("Failed to delete customer:", err);
      setFlash({ type: "error", text: "Failed to delete customer. Check console." });
      setTimeout(() => setFlash(null), 3500);
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- keyboard escape hides modal ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSelected(null);
        setSelectedVehicle(null);
        setConfirmDelete(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!selected) return;
    // ensure modal's vehicles are subscribed (modal uses vehiclesByCustomer map)
    const key = selected.customerId || selected.id;
    subscribeToCustomerVehicles(key);
    if (modalRef.current) modalRef.current.focus();
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    return () => {
      const key = selected.customerId || selected.id;
      if (!expandedRows.has(key)) {
        unsubscribeCustomerVehicles(key);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  /* ---------- derived state helper for modal vehicles ---------- */
  const modalVehiclesKey = selected ? (selected.customerId || selected.id) : null;
  const modalVehicleState = modalVehiclesKey ? (vehiclesByCustomer[modalVehiclesKey] || { loading: false, error: null, vehicles: [] }) : { loading: false, error: null, vehicles: [] };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Flash message (top) */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mb-4 p-3 rounded ${flash.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-rose-50 border border-rose-200 text-rose-700"}`}
            >
              <div className="flex items-center gap-3">
                {flash.type === "success" ? <Icons.CheckCircle className="text-emerald-600" /> : <Icons.XCircle className="text-rose-600" />}
                <div className="text-sm">{flash.text}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
            <p className="text-sm text-slate-500">All customers and recent activity</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-white border rounded-full px-3 py-2 shadow-sm flex-1 md:flex-none min-w-[220px]">
              <Icons.Search className="text-slate-400" size={16} />
              <input
                className="ml-2 outline-none bg-transparent placeholder:text-slate-400 text-sm w-full md:w-64"
                placeholder="Search name, email, phone or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="ml-2 p-1 rounded-full hover:bg-slate-100">
                  <Icons.X size={14} />
                </button>
              )}
            </div>

            <Link to="/customers/add" data-testid="add-customer-btn" className="ml-2">
              <motion.button whileTap={{ scale: 0.96 }} className="px-4 py-2 rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-700 flex items-center gap-2">
                <Icons.PlusCircle size={16} /> <span className="text-sm font-medium">Add Customer</span>
              </motion.button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100">
          <div className="px-6 py-3 border-b bg-slate-50 flex justify-between items-center">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{filtered.length}</span> customers
            </div>
            <div className="text-xs text-slate-400">Click the eye icon to expand vehicles or open details</div>
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
            ) : (
              <motion.div initial="hidden" animate="visible" variants={listVariant}>
                <table className="min-w-full text-sm text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide border-b">
                      <th className="px-6 py-3 w-[55%]">Customer</th>
                      <th className="px-6 py-3 w-[25%]">Email</th>
                      <th className="px-6 py-3 w-[20%] text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.length > 0 ? (
                      filtered.map((c, i) => {
                        const key = c.customerId || c.id;
                        const isExpanded = expandedRows.has(key);
                        const vehicleState = vehiclesByCustomer[key] || { loading: false, error: null, vehicles: [] };

                        return (
                          <React.Fragment key={key}>
                            <motion.tr
                              layout
                              variants={rowVariant}
                              className="border-b hover:bg-slate-50"
                              whileHover="hover"
                              initial="hidden"
                              animate="visible"
                              transition={{ duration: 0.22, delay: i * 0.02 }}
                            >
                              <td className="px-6 py-4 flex items-center gap-3">
                                <Avatar person={c} />
                                <div className="truncate">
                                  <div className="font-medium text-slate-800 truncate max-w-[360px]">{c.fullName || "Unnamed"}</div>
                                  <div className="text-xs text-slate-400 truncate">ID: {key}</div>
                                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{capitalize(c.role || "customer")}</span>
                                    <span className="ml-2 text-xs text-slate-500">Ref: {c.ownReferralCode || "—"}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4 text-slate-600 truncate">{c.email || "—"}</td>

                              <td className="px-6 py-4 text-center">
                                <div className="flex justify-center gap-2">
                                  {/* inline expand */}
                                  <motion.button
                                    onClick={() => toggleExpand(c)}
                                    whileTap={{ scale: 0.96 }}
                                    className="p-2 rounded-md bg-white hover:bg-slate-100 border shadow-sm"
                                    title={isExpanded ? "Collapse vehicles" : "Expand vehicles"}
                                  >
                                    <Icons.ChevronsDown size={16} className="text-indigo-600" />
                                  </motion.button>

                                  {/* open modal details */}
                                  <motion.button
                                    onClick={() => setSelected(c)}
                                    whileTap={{ scale: 0.96 }}
                                    className="p-2 rounded-md bg-white hover:bg-slate-100 border shadow-sm"
                                    title="View"
                                  >
                                    <Icons.Eye size={16} className="text-indigo-600" />
                                  </motion.button>

                                  {/* edit customer */}
                                  <motion.button
                                    onClick={() => navigate(`/customers/add?customerId=${encodeURIComponent(key)}`)}
                                    whileTap={{ scale: 0.96 }}
                                    className="p-2 rounded-md bg-white hover:bg-slate-100 border shadow-sm"
                                    title="Edit"
                                  >
                                    <Icons.Edit size={16} className="text-emerald-600" />
                                  </motion.button>

                                  {/* delete customer: opens styled confirmation modal */}
                                  <motion.button
                                    onClick={() => requestDeleteCustomer(c)}
                                    whileTap={{ scale: 0.96 }}
                                    className="p-2 rounded-md bg-white hover:bg-slate-100 border shadow-sm text-rose-600"
                                    title="Delete"
                                  >
                                    <Icons.Trash2 size={16} />
                                  </motion.button>
                                </div>
                              </td>
                            </motion.tr>

                            {/* Inline expanded vehicles row */}
                            {isExpanded && (
                              <tr className="bg-slate-50">
                                <td colSpan="3" className="px-6 py-4">
                                  <div className="mb-3 flex items-center justify-between">
                                    <div className="text-slate-600 font-medium">Vehicles for {c.fullName || "Unnamed"}</div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-xs text-slate-400 mr-2">{vehicleState.loading ? "Loading…" : `${vehicleState.vehicles.length} total`}</div>
                                      <Link to={`/customers/vehicles/add?customerId=${encodeURIComponent(key)}`}>
                                        <button className="px-3 py-1 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700">Add Vehicle</button>
                                      </Link>
                                    </div>
                                  </div>

                                  {vehicleState.loading ? (
                                    <div className="py-4 text-center text-slate-400">Loading vehicles…</div>
                                  ) : vehicleState.error ? (
                                    <div className="py-4 text-center text-rose-500">{vehicleState.error}</div>
                                  ) : vehicleState.vehicles.length === 0 ? (
                                    <div className="py-4 text-center text-slate-400">No vehicles added yet</div>
                                  ) : (
                                    <div className="space-y-2">
                                      {vehicleState.vehicles.map((v) => (
                                        <div key={v.docId} className="flex items-center justify-between bg-white p-3 rounded border">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded overflow-hidden bg-white flex items-center justify-center border">
                                              {v.brandImage ? (
                                                <img src={v.brandImage} alt={v.brand} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                                              ) : (
                                                <div className={`w-full h-full flex items-center justify-center text-white font-semibold bg-gradient-to-br ${nameToGradient(v.brand || "")}`}>
                                                  <span className="text-sm">{(v.brand || "").slice(0, 2).toUpperCase()}</span>
                                                </div>
                                              )}
                                            </div>

                                            <div className="min-w-0">
                                              <div className="font-medium text-slate-800 truncate">{(v.brand || "Unknown") + (v.carType ? ` • ${v.carType}` : "")}</div>
                                              <div className="text-xs text-slate-500 truncate">{v.licensePlateNumber || v.plate || v.registration || "—"}</div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <div className="text-xs text-slate-400 mr-4">{formatDate(v.createdAt)}</div>
                                            <button onClick={() => navigate(`/customers/vehicles/add?customerId=${encodeURIComponent(key)}&vehicleId=${encodeURIComponent(v.docId)}`)} className="p-2 rounded-md bg-white border hover:bg-slate-100"><Icons.Edit size={14} /></button>

                                            {/* NEW: open vehicle detail modal */}
                                            <button
                                              onClick={() => setSelectedVehicle({ ...v, customerKey: key, customerName: c.fullName || "Unnamed" })}
                                              className="p-2 rounded-md bg-white border hover:bg-slate-100"
                                              title="View vehicle"
                                            >
                                              <Icons.Eye size={14} />
                                            </button>

                                            <button onClick={() => deleteVehicle(v.docId)} className="p-2 rounded-md bg-white border hover:bg-slate-100 text-rose-600"><Icons.Trash2 size={14} /></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-10 text-center text-slate-400">
                          <Icons.Box className="mx-auto mb-2 text-slate-300" size={26} />
                          No customers found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </motion.div>
            )}
          </div>
        </div>

        {/* ---------- Confirmation modal (delete customer) ---------- */}
        <AnimatePresence>
          {confirmDelete && confirmDelete.type === "customer" && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              variants={backdropVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => !deleting && setConfirmDelete(null)}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

              <motion.div
                onClick={(e) => e.stopPropagation()}
                variants={modalVariant}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 ring-1 ring-slate-100"
                role="dialog"
                aria-modal="true"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                    <Icons.Trash2 />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800">Delete customer?</h3>
                    <p className="text-sm text-slate-500 mt-1">This will remove the customer and all their vehicles from the system. This action cannot be undone.</p>
                  </div>
                </div>

                <div className="text-sm text-slate-700 space-y-3 mb-4">
                  <div><strong>Name:</strong> {confirmDelete.payload.fullName || "Unnamed"}</div>
                  <div><strong>ID:</strong> <span className="font-mono">{confirmDelete.payload.customerId || confirmDelete.payload.id}</span></div>
                  <div className="text-xs text-slate-400">All associated vehicles will be deleted as well.</div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200">Cancel</button>
                  <button
                    onClick={doDeleteCustomer}
                    disabled={deleting}
                    className={`px-4 py-2 rounded-md text-white ${deleting ? "bg-rose-400" : "bg-rose-600 hover:bg-rose-700"}`}
                  >
                    {deleting ? <span className="inline-flex items-center gap-2"><Icons.Loader2 className="animate-spin" size={14} /> Deleting...</span> : "Yes, delete"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- Vehicle Detail Modal (NEW) ---------- */}
        <AnimatePresence>
          {selectedVehicle && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              variants={backdropVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSelectedVehicle(null)}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

              <motion.div
                onClick={(e) => e.stopPropagation()}
                variants={modalVariant}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 ring-1 ring-slate-100"
                role="dialog"
                aria-modal="true"
              >
                <button onClick={() => setSelectedVehicle(null)} className="absolute top-3 right-3 p-2 hover:bg-slate-100 rounded-full focus:outline-none" aria-label="Close">
                  <Icons.X size={16} />
                </button>

                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded overflow-hidden bg-white flex items-center justify-center border">
                    {selectedVehicle.brandImage ? (
                      <img src={selectedVehicle.brandImage} alt={selectedVehicle.brand} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-white font-semibold bg-gradient-to-br ${nameToGradient(selectedVehicle.brand || "")}`}>
                        <span className="text-sm">{(selectedVehicle.brand || "").slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800">{selectedVehicle.brand || "Unknown"} {selectedVehicle.model ? `• ${selectedVehicle.model}` : ""}</h3>
                    <div className="text-xs text-slate-500 mt-1">Owner: {selectedVehicle.customerName || selectedVehicle.customerKey || "—"}</div>
                    <div className="text-xs text-slate-400 mt-2">{selectedVehicle.notes || ""}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 mb-4">
                  <div>
                    <div className="text-xs text-slate-500">License plate</div>
                    <div className="font-medium">{selectedVehicle.licensePlateNumber || selectedVehicle.plate || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Registration</div>
                    <div className="font-medium">{selectedVehicle.registration || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Fuel</div>
                    <div className="font-medium">{selectedVehicle.fuelType || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Transmission</div>
                    <div className="font-medium">{selectedVehicle.transmission || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Seats</div>
                    <div className="font-medium">{selectedVehicle.seats || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Color</div>
                    <div className="font-medium">{selectedVehicle.color || "—"}</div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setSelectedVehicle(null)} className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200">Close</button>

                  <button
                    onClick={() => navigate(`/customers/vehicles/add?customerId=${encodeURIComponent(selectedVehicle.customerKey || "")}&vehicleId=${encodeURIComponent(selectedVehicle.docId)}`)}
                    className="px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => {
                      if (!confirm("Delete this vehicle?")) return;
                      deleteVehicle(selectedVehicle.docId);
                    }}
                    className="px-3 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- Modal details (customer) ---------- */}
        <AnimatePresence>
          {selected && (
            <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4" variants={backdropVariant} initial="hidden" animate="visible" exit="exit" onClick={() => setSelected(null)}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

              <motion.div ref={modalRef} tabIndex={-1} onClick={(e) => e.stopPropagation()} variants={modalVariant} initial="hidden" animate="visible" exit="exit" className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 ring-1 ring-slate-100" role="dialog" aria-modal="true">
                <button onClick={() => setSelected(null)} className="absolute top-3 right-3 p-2 hover:bg-slate-100 rounded-full focus:outline-none" aria-label="Close">
                  <Icons.X size={16} />
                </button>

                <div className="flex items-start gap-4 mb-4">
                  <Avatar person={selected} variant="lg" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">{selected.fullName || "Unnamed"}</h3>
                        <p className="text-sm text-slate-500">{selected.email || "—"}</p>
                      </div>

                      <div className="ml-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                          <Icons.User size={14} /> {capitalize(selected.role || "customer")}
                        </span>

                        <Link to={`/customers/vehicles/add?customerId=${encodeURIComponent(selected.customerId || selected.id || "")}`}>
                          <button className="px-3 py-1 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700">Add Vehicle</button>
                        </Link>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 mt-2 flex flex-wrap gap-3 items-center">
                      <span className="text-xs">ID: <span className="font-mono">{selected.customerId || selected.id}</span></span>
                      <span className="text-xs">Ref: <span className="font-mono">{selected.ownReferralCode || "—"}</span></span>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-slate-700 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span>{selected?.phoneNumber || selected?.phone || "—"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Gender</span>
                    <span>{genderLabel(selected.gender)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Joined</span>
                    <span>{selected.joinedAt ? formatDate(selected.joinedAt) : "—"}</span>
                  </div>

                  <div>
                    <div className="text-slate-500 text-xs mb-2">Notes</div>
                    <div className="text-sm text-slate-700 mt-1">{selected.notes || "— No notes —"}</div>
                  </div>

                  {/* ---------- Vehicles inside modal (reads same vehiclesByCustomer state) ---------- */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-slate-600 font-medium">Vehicles</div>
                      <div className="text-xs text-slate-400">{modalVehicleState.loading ? "Loading…" : `${modalVehicleState.vehicles.length} total`}</div>
                    </div>

                    {modalVehicleState.loading ? (
                      <div className="py-6 text-center text-slate-400">Loading vehicles…</div>
                    ) : modalVehicleState.error ? (
                      <div className="py-4 text-center text-rose-500">{modalVehicleState.error}</div>
                    ) : modalVehicleState.vehicles.length === 0 ? (
                      <div className="py-4 text-center text-slate-400">No vehicles added yet</div>
                    ) : (
                      <div className="space-y-2">
                        {modalVehicleState.vehicles.map((v) => (
                          <div key={v.docId} className="flex items-center justify-between bg-slate-50 p-3 rounded">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded overflow-hidden bg-white flex items-center justify-center border">
                                {v.brandImage ? (
                                  <img src={v.brandImage} alt={v.brand} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center text-white font-semibold bg-gradient-to-br ${nameToGradient(v.brand || "")}`}>
                                    <span className="text-sm">{(v.brand || "").slice(0, 2).toUpperCase()}</span>
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="font-medium text-slate-800 truncate">{(v.brand || "Unknown") + (v.carType ? ` • ${v.carType}` : "")}</div>
                                <div className="text-xs text-slate-500 truncate">{v.licensePlateNumber || v.plate || v.registration || "—"}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-xs text-slate-400 mr-4">{formatDate(v.createdAt)}</div>
                              <button onClick={() => navigate(`/customers/vehicles/add?customerId=${encodeURIComponent(selected.customerId || selected.id || "")}&vehicleId=${encodeURIComponent(v.docId)}`)} className="p-2 rounded-md bg-white border hover:bg-slate-100"><Icons.Edit size={14} /></button>

                              {/* view vehicle modal from inside customer modal */}
                              <button
                                onClick={() => setSelectedVehicle({ ...v, customerKey: selected.customerId || selected.id, customerName: selected.fullName })}
                                className="p-2 rounded-md bg-white border hover:bg-slate-100"
                              >
                                <Icons.Eye size={14} />
                              </button>

                              <button onClick={() => deleteVehicle(v.docId)} className="p-2 rounded-md bg-white border hover:bg-slate-100 text-rose-600"><Icons.Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => alert("Message customer")} className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200">Message</button>
                  <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Close</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
