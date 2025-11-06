// src/pages/AddCustomer.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { motion } from "framer-motion";
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc as firestoreDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase"; // ensure path points to src/firebase.js

function generateReferralCode(length = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < length; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

const Field = ({ children }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="w-full">
    {children}
  </motion.div>
);

export default function AddCustomer() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "",
    notes: "",
    profileImageUrl: "",
    role: "customer",
  });

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (file) setPreview(URL.createObjectURL(file));
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  function validateEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  const onFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB.");
      return;
    }
    setError(null);
    setFile(f);
    if (f) setForm((s) => ({ ...s, profileImageUrl: "" }));
  };

  // improved upload with logs & errors
  const uploadFileAndGetUrl = async (docId) => {
    if (!file) return null;
    try {
      const sanitizedName = file.name.replace(/\s+/g, "_");
      const fileRef = storageRef(storage, `customer_profile_images/${docId}_${Date.now()}_${sanitizedName}`);
      const task = uploadBytesResumable(fileRef, file);

      return await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snapshot) => {
            const pct = Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setProgress(pct);
            console.log("Upload progress:", pct, "%");
          },
          (err) => {
            console.error("Upload failed:", err);
            setError("Image upload failed. See console.");
            reject(err);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(task.snapshot.ref);
              console.log("Got download URL:", downloadUrl);
              resolve(downloadUrl);
            } catch (gErr) {
              console.error("getDownloadURL failed:", gErr);
              setError("Failed to get uploaded image URL.");
              reject(gErr);
            }
          }
        );
      });
    } catch (err) {
      console.error("uploadFileAndGetUrl unexpected error", err);
      setError("Unexpected upload error");
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (form.email && !validateEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setProgress(0);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
        gender: form.gender || null,
        notes: form.notes.trim() || null,
        profileImage: form.profileImageUrl?.trim() || null,
        role: form.role || "customer",
        ownReferralCode: generateReferralCode(),
        referralCode: null,
        averageRating: null,
        ratingCount: null,
        completedRides: null,
        fcmToken: null,
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      const colRef = collection(db, "customer");
      const docRef = await addDoc(colRef, payload);
      console.log("Added customer doc:", docRef.id);

      // upload file (if present) and update the doc
      if (file) {
        try {
          const downloadUrl = await uploadFileAndGetUrl(docRef.id);
          if (downloadUrl) {
            await updateDoc(firestoreDoc(db, "customer", docRef.id), { profileImage: downloadUrl });
            console.log("Updated doc with profileImage:", downloadUrl);
          } else {
            console.warn("No downloadUrl returned for file upload.");
          }
        } catch (upErr) {
          console.error("Upload or updateDoc failed:", upErr);
          setError("Upload failed — check console and Firebase Storage rules.");
        }
      }

      // ensure customerId stored
      await updateDoc(firestoreDoc(db, "customer", docRef.id), { customerId: docRef.id });

      setSuccessMessage("Customer added successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);

      // Wait a tick so user sees success; only navigate after complete
      navigate("/customers");
    } catch (err) {
      console.error("Add customer failed:", err);
      setError("Failed to add customer. Check console and Firestore rules.");
    } finally {
      setLoading(false);
      setFile(null);
      setPreview(null);
      setProgress(0);
    }
  };

  const RolePill = ({ value }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => setForm((s) => ({ ...s, role: value }))}
      type="button"
      className={`px-3 py-1 rounded-full text-sm font-medium border ${form.role === value ? "bg-indigo-600 text-white border-transparent" : "bg-white text-slate-700"}`}
    >
      {value}
    </motion.button>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-6">
        <h1 className="text-2xl font-bold">Add Customer</h1>
        <p className="text-sm text-slate-500 mt-1">Create a customer account — clean UI, progressive image upload, and subtle animations.</p>
      </motion.div>

      <motion.form onSubmit={handleSubmit} initial={{ scale: 0.995, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-rose-600">
            <Icons.AlertTriangle className="inline mr-2" size={14} /> {error}
          </motion.div>
        )}

        {successMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-emerald-50 text-emerald-800 rounded text-sm">
            <Icons.CheckCircle className="inline mr-2" size={14} /> {successMessage}
          </motion.div>
        )}

        <div className="flex items-start gap-6">
          <div className="w-28 flex-shrink-0">
            <motion.div layout className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-100 to-white border flex items-center justify-center overflow-hidden shadow-sm">
              {preview ? (
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              ) : form.profileImageUrl ? (
                <img src={form.profileImageUrl} alt="preview-url" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-400 text-xs text-center px-2">
                  <Icons.User size={36} />
                  <div className="mt-1">No photo</div>
                </div>
              )}
            </motion.div>

            <div className="text-xs text-slate-400 mt-2">Profile preview</div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <label className="block text-xs text-slate-600">Full name *</label>
                <div className="mt-1 relative">
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    required
                    className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Name"
                  />
                </div>
              </Field>

              <Field>
                <label className="block text-xs text-slate-600">Role</label>
                <div className="mt-1 flex gap-2">
                  <RolePill value="customer" />
                  <RolePill value="driver" />
                  <RolePill value="admin" />
                </div>
              </Field>

              <Field>
                <label className="block text-xs text-slate-600">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="email@example.com"
                />
              </Field>

              <Field>
                <label className="block text-xs text-slate-600">Phone</label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  className="mt-1 w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="+91 9876543210"
                />
              </Field>

              <Field>
                <label className="block text-xs text-slate-600">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="mt-1 w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                >
                  <option value="">Select gender (optional)</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </Field>

              <Field>
                <label className="block text-xs text-slate-600">Joined on</label>
                <div className="mt-1 text-sm text-slate-500">Auto</div>
              </Field>
            </div>

            <Field>
              <label className="block text-xs text-slate-600">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="mt-1 w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Optional notes..."
              />
            </Field>

            <div className="grid md:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs text-slate-600">Profile image (paste URL)</label>
                <input
                  value={form.profileImageUrl}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, profileImageUrl: e.target.value }));
                    if (file) {
                      setFile(null);
                      setPreview(null);
                    }
                  }}
                  className="mt-1 w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="https://..."
                />
                <div className="text-xs text-slate-400 mt-1">Or upload an image below (max 2MB)</div>
              </div>

              <div>
                <label className="block text-xs text-slate-600">Upload profile image</label>
                <input type="file" accept="image/*" onChange={onFileChange} className="mt-1 block w-full text-sm" />

                {progress > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-slate-100 rounded overflow-hidden">
                      <motion.div animate={{ width: `${progress}%` }} className="h-full bg-indigo-500" />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Uploading: {progress}%</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-md bg-slate-50 hover:bg-slate-100" disabled={loading}>
                Cancel
              </button>

              <motion.button whileTap={{ scale: 0.97 }} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Icons.Loader2 className="animate-spin" size={16} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Icons.Check size={16} />
                    <span>Save Customer</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.form>
    </div>
  );
}
