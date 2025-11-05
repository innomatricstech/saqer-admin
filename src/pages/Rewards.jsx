// src/pages/Rewards.jsx
import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc as firestoreDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

/**
 * Animated Rewards page (ready-to-drop)
 * - Reads `rewards` collection
 * - Shows animated cards with image, title/subtitle, description, discount info
 * - Toggle active state and delete reward (writes to Firestore)
 *
 * Keep field names as: rewardId, title, subtitle, description, imageUrl, discountType, discountValue, buttonText, isActive, createdAt
 * Adjust field names if your schema differs.
 */

/* ---------- helpers ---------- */
function formatDate(ts) {
  if (!ts) return "—";
  try {
    const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleString();
  } catch {
    return "—";
  }
}
const getImage = (r) => r.imageUrl || r.imageURL || r.brandImage || r.image || null;
const discountLabel = (r) => {
  if (!r) return "—";
  const dt = r.discountType;
  const val = r.discountValue;
  if (dt === "percentage") return `${val ?? "—"}% off`;
  if (dt === "fixed") return `${r.currency || "₹"}${val ?? "—"} off`;
  if (val !== undefined && val !== null) return `${val}`;
  return "—";
};

/* ---------- motion variants ---------- */
const container = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};
const card = {
  hidden: { opacity: 0, y: 8, scale: 0.995 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
  hover: { y: -6, scale: 1.01, transition: { type: "spring", stiffness: 400, damping: 18 } },
};

export default function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "rewards"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
        setRewards(arr);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Failed to subscribe to rewards:", err);
        setError("Failed to load rewards.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Toggle active/inactive
  const toggleActive = async (r) => {
    const id = r.docId;
    if (!id) return;
    setBusyId(id);
    try {
      await updateDoc(firestoreDoc(db, "rewards", id), { isActive: !Boolean(r.isActive) });
    } catch (err) {
      console.error("toggleActive error:", err);
      alert("Failed to update reward. Check console.");
    } finally {
      setBusyId(null);
    }
  };

  // Delete reward
  const removeReward = async (r) => {
    const id = r.docId;
    if (!id) return;
    if (!confirm(`Delete reward "${r.title || r.rewardId || id}"? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      await deleteDoc(firestoreDoc(db, "rewards", id));
    } catch (err) {
      console.error("delete reward error:", err);
      alert("Failed to delete reward. Check console.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Icons.Gift className="text-indigo-600" size={28} />
          Rewards Management
        </h1>
        <p className="text-sm text-gray-600 mt-1">Manage promotional rewards, vouchers and loyalty offers.</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => alert("Create Reward flow not implemented — add form required")}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            aria-label="Add reward"
          >
            <Icons.Plus size={16} /> Add Reward
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 700);
            }}
            className="inline-flex items-center gap-2 bg-white border px-3 py-2 rounded-lg hover:bg-gray-50 focus:outline-none"
            aria-label="Refresh rewards"
          >
            <Icons.RefreshCw size={16} /> Refresh
          </motion.button>
        </div>

        <div className="text-sm text-gray-500">Total rewards: <span className="font-medium text-gray-800">{rewards.length}</span></div>
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white animate-pulse h-44" />
            ))}
          </div>
        ) : error ? (
          <div className="text-rose-600">{error}</div>
        ) : rewards.length === 0 ? (
          <div className="text-slate-500">No rewards found.</div>
        ) : (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={container} initial="hidden" animate="visible">
            <AnimatePresence>
              {rewards.map((r) => {
                const img = getImage(r);
                const title = r.title || r.rewardId || "Untitled reward";
                return (
                  <motion.article
                    key={r.docId}
                    className="bg-white rounded-xl shadow p-4 flex flex-col"
                    variants={card}
                    whileHover="hover"
                    layout
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.995, y: 8 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                        {img ? (
                          // eslint-disable-next-line jsx-a11y/img-redundant-alt
                          <img src={img} alt={title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-slate-500 text-xs px-2 text-center">No image</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 id={`reward-${r.docId}`} className="font-semibold text-lg text-slate-900 truncate">{title}</h2>
                            {r.subtitle && <div className="text-xs text-slate-500 mt-1 truncate">{r.subtitle}</div>}
                          </div>

                          <div className="text-right">
                            <div className={`text-xs px-2 py-1 rounded-full ${r.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                              {r.isActive ? "Active" : "Inactive"}
                            </div>
                            <div className="text-xs text-slate-400 mt-2">{formatDate(r.createdAt)}</div>
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 mt-3 line-clamp-3">{r.description || "—"}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-700">
                        <div className="font-medium">{discountLabel(r)}</div>
                        <div className="text-xs text-slate-400">{r.buttonText || "Redeem"}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => toggleActive(r)}
                          disabled={busyId === r.docId}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                            r.isActive ? "bg-slate-100 text-slate-800 hover:bg-slate-200" : "bg-indigo-600 text-white hover:bg-indigo-700"
                          }`}
                          aria-pressed={Boolean(r.isActive)}
                          aria-label={r.isActive ? "Set inactive" : "Set active"}
                        >
                          {busyId === r.docId ? "..." : r.isActive ? "Set Inactive" : "Set Active"}
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => removeReward(r)}
                          disabled={busyId === r.docId}
                          className="px-3 py-1 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm"
                          aria-label="Delete reward"
                        >
                          Delete
                        </motion.button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* small footer */}
      <div className="mt-8 bg-white p-4 rounded-xl border border-dashed border-gray-200 text-gray-500">
        <div className="text-sm font-medium mb-2">Quick Analytics</div>
        <div className="text-xs">
          Active rewards: <span className="font-medium">{rewards.filter((x) => x.isActive).length}</span> • Total rewards: <span className="font-medium">{rewards.length}</span>
        </div>
      </div>
    </div>
  );
}
