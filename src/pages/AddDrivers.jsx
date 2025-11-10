// src/pages/AddDrivers.jsx
import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";

/**
 * AddDrivers modal
 * Props:
 *  - open: boolean
 *  - onClose: fn
 */
export default function AddDrivers({ open, onClose }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    vehicle: "",
    plate: "",
    status: "Active",
    trips: 0,
    driverImage: "",
    address: "",
    age: "",
    city: "",
    dob: "", // yyyy-mm-dd string — will store as ms
    licenceNumber: "",
    vehicleNumber: "",
    yearsOfExperience: "",
    role: "Driver",
    ownReferralCode: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setForm({
        name: "",
        phone: "",
        email: "",
        vehicle: "",
        plate: "",
        status: "Active",
        trips: 0,
        driverImage: "",
        address: "",
        age: "",
        city: "",
        dob: "",
        licenceNumber: "",
        vehicleNumber: "",
        yearsOfExperience: "",
        role: "Driver",
        ownReferralCode: "",
      });
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  const handleChange = (k) => (e) => {
    const val = e.target.value;
    setForm((s) => ({ ...s, [k]: k === "trips" || k === "age" || k === "yearsOfExperience" ? Number(val || 0) : val }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (form.phone && form.phone.replace(/\D/g, "").length < 6) return "Enter valid phone";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        mobileNumber: form.phone.trim() || "",
        email: form.email.trim() || "",
        vehicle: form.vehicle.trim() || "",
        vehicleNumber: form.vehicleNumber.trim() || null,
        plate: form.plate.trim() || "",
        driverStatus: form.status || "Active",
        status: form.status || "Active",
        trips: Number(form.trips || 0),
        driverImage: form.driverImage?.trim() || null,
        address: form.address?.trim() || null,
        age: form.age ? Number(form.age) : null,
        city: form.city?.trim() || null,
        dob: form.dob ? Number(Date.parse(form.dob)) : null, // store ms like screenshots
        licenceNumber: form.licenceNumber?.trim() || null,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
        role: form.role || "Driver",
        ownReferralCode: form.ownReferralCode?.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, "drivers"), payload);

      // write back driverId field so UI shows it
      await updateDoc(doc(db, "drivers", ref.id), { driverId: ref.id });

      setSubmitting(false);
      onClose();
      try { window?.toast?.("Driver added"); } catch {}
    } catch (err) {
      console.error("Failed to add driver:", err);
      setError("Failed to add driver. See console.");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.18 }}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between p-5 border-b bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                  <Icons.UserPlus />
                </div>
                <div>
                  <div className="text-lg font-semibold">Add New Driver</div>
                  <div className="text-sm text-slate-500">Create a driver record</div>
                </div>
              </div>

              <button className="p-2 rounded-full hover:bg-slate-100" onClick={onClose} aria-label="Close add driver">
                <Icons.X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="text-sm text-rose-600">{error}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Name *</label>
                  <input value={form.name} onChange={handleChange("name")} className="w-full px-3 py-2 border rounded-lg" placeholder="Driver name" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Phone</label>
                  <input value={form.phone} onChange={handleChange("phone")} className="w-full px-3 py-2 border rounded-lg" placeholder="+971..." />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Email</label>
                  <input value={form.email} onChange={handleChange("email")} className="w-full px-3 py-2 border rounded-lg" placeholder="email@example.com" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Vehicle (type)</label>
                  <input value={form.vehicle} onChange={handleChange("vehicle")} className="w-full px-3 py-2 border rounded-lg" placeholder="Car / Bike / Van" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Plate / Licence</label>
                  <input value={form.plate} onChange={handleChange("plate")} className="w-full px-3 py-2 border rounded-lg" placeholder="ABC-1234" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={handleChange("status")} className="w-full px-3 py-2 border rounded-lg">
                    <option>Active</option>
                    <option>Offline</option>
                    <option>Busy</option>
                    <option>Approved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Trips (initial)</label>
                  <input type="number" min="0" value={form.trips} onChange={handleChange("trips")} className="w-full px-3 py-2 border rounded-lg" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Driver Image URL</label>
                  <input value={form.driverImage} onChange={handleChange("driverImage")} className="w-full px-3 py-2 border rounded-lg" placeholder="https://..." />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Address</label>
                  <input value={form.address} onChange={handleChange("address")} className="w-full px-3 py-2 border rounded-lg" placeholder="Street, area, city" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">City</label>
                  <input value={form.city} onChange={handleChange("city")} className="w-full px-3 py-2 border rounded-lg" placeholder="Abu Dhabi" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Age</label>
                  <input type="number" value={form.age} onChange={handleChange("age")} className="w-full px-3 py-2 border rounded-lg" min="0" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">DOB</label>
                  <input type="date" value={form.dob} onChange={handleChange("dob")} className="w-full px-3 py-2 border rounded-lg" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Licence Number</label>
                  <input value={form.licenceNumber} onChange={handleChange("licenceNumber")} className="w-full px-3 py-2 border rounded-lg" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Vehicle Number</label>
                  <input value={form.vehicleNumber} onChange={handleChange("vehicleNumber")} className="w-full px-3 py-2 border rounded-lg" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Years of Experience</label>
                  <input type="number" value={form.yearsOfExperience} onChange={handleChange("yearsOfExperience")} className="w-full px-3 py-2 border rounded-lg" min="0" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Referral Code (own)</label>
                  <input value={form.ownReferralCode} onChange={handleChange("ownReferralCode")} className="w-full px-3 py-2 border rounded-lg" />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Role</label>
                  <select value={form.role} onChange={handleChange("role")} className="w-full px-3 py-2 border rounded-lg">
                    <option>Driver</option>
                    <option>Partner</option>
                    <option>Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white border hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                  {submitting ? "Saving..." : "Add Driver"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
