// src/pages/Customers.jsx
import React, { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

/* ---------- helpers ---------- */
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

/* ---------- Avatar ---------- */
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
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "customer"), orderBy("joinedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setCustomers(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError("Failed to load customers.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (selected && modalRef.current) {
      modalRef.current.focus();
    }
  }, [selected]);

  const getPhone = (c) => c?.phoneNumber || c?.phone || c?.phoneNo || "—";

  const q = search.trim().toLowerCase();
  const filtered = customers.filter((c) => {
    return (
      (c.fullName || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (getPhone(c) || "").toLowerCase().includes(q) ||
      (c.customerId || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
            <p className="text-sm text-slate-500">All customers and recent activity</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-white border rounded-full px-3 py-2 shadow-sm flex-1 md:flex-none min-w-[220px]">
              <Icons.Search className="text-slate-400" size={16} />
              <input className="ml-2 outline-none bg-transparent placeholder:text-slate-400 text-sm w-full md:w-64" placeholder="Search name, email, phone or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch("")} className="ml-2 p-1 rounded-full hover:bg-slate-100">
                  <Icons.X size={14} />
                </button>
              )}
            </div>

            {/* <-- ADDED: Add Customer button */}
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
            <div className="text-xs text-slate-400">Click the eye icon to view details</div>
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
              <motion.table className="min-w-full text-sm text-slate-700" initial="hidden" animate="visible" variants={listVariant}>
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide border-b">
                    <th className="px-6 py-3 w-[55%]">Customer</th>
                    <th className="px-6 py-3 w-[25%]">Email</th>
                    <th className="px-6 py-3 w-[20%] text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((c, i) => (
                      <motion.tr
                        layout
                        key={c.id}
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
                            <div className="text-xs text-slate-400 truncate">ID: {c.customerId || c.id}</div>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{capitalize(c.role || "customer")}</span>
                              <span className="ml-2 text-xs text-slate-500">Ref: {c.ownReferralCode || "—"}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-600 truncate">{c.email || "—"}</td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <motion.button onClick={() => setSelected(c)} whileTap={{ scale: 0.96 }} className="p-2 rounded-md bg-white hover:bg-slate-100 border shadow-sm" title="View">
                              <Icons.Eye size={16} className="text-indigo-600" />
                            </motion.button>

                            <motion.button onClick={() => alert("Edit flow coming soon")} whileTap={{ scale: 0.96 }} className="p-2 rounded-md bg-white hover:bg-slate-100 border shadow-sm" title="Edit">
                              <Icons.Edit size={16} className="text-emerald-600" />
                            </motion.button>

                            <motion.button onClick={() => { if (confirm("Delete this customer?")) { /* delete logic */ } }} whileTap={{ scale: 0.96 }} className="p-2 rounded-md bg-white hover:bg-slate-100 border shadow-sm" title="Delete">
                              <Icons.Trash2 size={16} className="text-rose-600" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-10 text-center text-slate-400">
                        <Icons.Box className="mx-auto mb-2 text-slate-300" size={26} />
                        No customers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </motion.table>
            )}
          </div>
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" variants={backdropVariant} initial="hidden" animate="visible" exit="exit" onClick={() => setSelected(null)}>
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

                      <div className="ml-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                          <Icons.User size={14} /> {capitalize(selected.role || "customer")}
                        </span>
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
                    <span className="text-slate-500">Role</span>
                    <span>{capitalize(selected.role || "customer")}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Joined</span>
                    <span>{selected.joinedAt ? formatDate(selected.joinedAt) : "—"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Last active</span>
                    <span>{selected.lastActiveAt ? formatDate(selected.lastActiveAt) : "—"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Referral Code</span>
                    <span>{selected.ownReferralCode || "—"}</span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-slate-500">FCM Token</span>
                    <span className="truncate max-w-[300px] text-xs text-slate-600">{selected.fcmToken || "—"}</span>
                  </div>

                  <div>
                    <div className="text-slate-500 text-xs">Notes</div>
                    <div className="text-sm text-slate-700 mt-1">{selected.notes || "— No notes —"}</div>
                  </div>

                  {selected.profileImage ? (
                    <div>
                      <div className="text-slate-500 text-xs">Profile Image</div>
                      <img src={selected.profileImage} alt="profile" className="w-28 h-28 object-cover rounded-md mt-2 shadow-sm" />
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => alert("Message customer")} className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200">
                    Message
                  </button>
                  <button onClick={() => alert("View orders")} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
                    View Orders
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
