// src/pages/AddCustomer.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { db, storage } from "../../firebase";

/* helpers */
function generateReferralCode(length = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < length; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

const Field = ({ children }) => (
  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }} className="w-full">
    {children}
  </motion.div>
);

export default function AddCustomer() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setFile(f);
    setForm((s) => ({ ...s, profileImageUrl: "" }));
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFileAndGetUrl = (docId) => {
    if (!file) return Promise.resolve(null);
    const sanitizedName = file.name.replace(/\s+/g, "_");
    const path = `customer_profile_images/${docId}_${Date.now()}_${sanitizedName}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);

    return new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          const pct = snapshot.totalBytes ? Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
          setProgress(pct);
        },
        (err) => {
          console.error("Upload failed:", err);
          setError("Image upload failed. Check console / storage rules.");
          reject(err);
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (gErr) {
            console.error("getDownloadURL failed:", gErr);
            setError("Failed to get uploaded image URL.");
            reject(gErr);
          }
        }
      );
    });
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
      const docId = docRef.id;

      if (file) {
        try {
          const downloadUrl = await uploadFileAndGetUrl(docId);
          if (downloadUrl) {
            await updateDoc(firestoreDoc(db, "customer", docId), { profileImage: downloadUrl });
          }
        } catch (upErr) {
          console.error("Upload or updateDoc failed:", upErr);
          setError("Image upload/update failed. Customer created without image.");
        }
      }

      try {
        await updateDoc(firestoreDoc(db, "customer", docId), { customerId: docId });
      } catch (cidErr) {
        console.warn("Failed to set customerId field:", cidErr);
      }

      setSuccessMessage("Customer added successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);

      setLoading(false);
      setFile(null);
      setPreview(null);
      setProgress(0);

      navigate("/customers");
    } catch (err) {
      console.error("Add customer failed:", err);
      setError("Failed to add customer. Check console / Firestore rules.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-3 px-2 overflow-x-hidden">
      {/* very compact mobile width, expands on sm/lg */}
      <div className="mx-auto w-full max-w-[340px] sm:max-w-[560px] lg:max-w-2xl">
        {/* compact header */}
        <div className="mb-3">
          <div className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3 py-2 flex items-center gap-2 shadow-sm">
            <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
              <Icons.UserPlus size={16} />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-snug">Add Customer</h1>
              <p className="text-[11px] opacity-95 mt-0.5">Compact mobile-friendly form</p>
            </div>
          </div>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="bg-white rounded-xl shadow p-3 sm:p-4"
        >
          {error && (
            <div className="mb-2 text-xs text-rose-600 flex items-center gap-2">
              <Icons.AlertTriangle size={12} /> <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-2 p-2 bg-emerald-50 text-emerald-800 rounded text-xs flex items-center gap-2">
              <Icons.CheckCircle size={12} /> <span>{successMessage}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start gap-2">
            {/* avatar */}
            <div className="w-full sm:w-24 flex-shrink-0 flex justify-center sm:justify-start">
              <div className="flex flex-col items-center">
                <div className="w-18 h-18 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border overflow-hidden flex items-center justify-center shadow-sm">
                  {preview ? (
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  ) : form.profileImageUrl ? (
                    <img src={form.profileImageUrl} alt="preview-url" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  ) : (
                    <div className="text-slate-400 px-1">
                      <Icons.User size={22} />
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Preview</div>
              </div>
            </div>

            {/* inputs */}
            <div className="flex-1 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field>
                  <label className="block text-[11px] text-slate-600">Full name *</label>
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    required
                    className="mt-1 w-full border rounded px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Name"
                  />
                </Field>

                <Field>
                  <label className="block text-[11px] text-slate-600">Role</label>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    {["customer"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm((s) => ({ ...s, role: r }))}
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${form.role === r ? "bg-indigo-600 text-white border-transparent" : "bg-white text-slate-700"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field>
                  <label className="block text-[11px] text-slate-600">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1 w-full border rounded px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="email@example.com"
                  />
                </Field>

                <Field>
                  <label className="block text-[11px] text-slate-600">Phone</label>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    className="mt-1 w-full border rounded px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="+91 98765 43210"
                  />
                </Field>

                <Field>
                  <label className="block text-[11px] text-slate-600">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                    className="mt-1 w-full border rounded px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </Field>

                <Field>
                  <label className="block text-[11px] text-slate-600">Joined</label>
                  <div className="mt-1 text-[12px] text-slate-500">Auto</div>
                </Field>
              </div>

              <Field>
                <label className="block text-[11px] text-slate-600 mt-2">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full border rounded px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Optional notes..."
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-[11px] text-slate-600">Profile image (URL)</label>
                  <input
                    value={form.profileImageUrl}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, profileImageUrl: e.target.value }));
                      if (file) clearFile();
                    }}
                    className="mt-1 w-full border rounded px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="https://..."
                  />
                  <div className="text-[11px] text-slate-400 mt-1">Or upload (max 2MB)</div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600">Upload</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input ref={fileInputRef} id="profileFile" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    <label htmlFor="profileFile" className="cursor-pointer px-2 py-1 rounded border bg-white text-xs flex items-center gap-2">
                      <Icons.Upload size={14} /> Choose
                    </label>

                    {(file || form.profileImageUrl) && (
                      <button type="button" onClick={() => { setForm((s) => ({ ...s, profileImageUrl: "" })); clearFile(); }} className="px-2 py-1 rounded border text-xs bg-slate-100">
                        Clear
                      </button>
                    )}
                  </div>

                  {progress > 0 && (
                    <div className="mt-1">
                      <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                        <motion.div animate={{ width: `${progress}%` }} className="h-full bg-indigo-500" />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Uploading: {progress}%</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Link to="/customers" className="w-full sm:w-auto">
                  <button type="button" className="w-full sm:w-auto px-3 py-2 rounded bg-slate-100 text-sm" disabled={loading}>
                    Cancel
                  </button>
                </Link>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-3 py-2 rounded bg-indigo-600 text-white text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Icons.Loader2 className="animate-spin" size={14} /> <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Check size={14} /> <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
