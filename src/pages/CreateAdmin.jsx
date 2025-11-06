// src/pages/CreateAdmin.jsx
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase"; // adjust path if necessary

export default function CreateAdmin() {
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    photoURL: "",
    fcmToken: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage("");
    const { email, password, name, photoURL, fcmToken } = form;
    if (!email || !password || !name) {
      setMessage("Please provide name, email and password.");
      return;
    }

    setLoading(true);
    try {
      // create user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;

      // write admin doc in Firestore with requested fields
      await setDoc(doc(db, "admins", user.uid), {
        email: user.email,
        name: name,
        password: password, // WARNING: insecure in production
        uid: user.uid,
        fcmToken: fcmToken || null,
        photoURL: photoURL || null,
        createdAt: serverTimestamp(),
      });

      setMessage("✅ Admin created successfully. UID: " + user.uid);
      setForm({ email: "", password: "", name: "", photoURL: "", fcmToken: "" });
    } catch (err) {
      console.error("Create admin error:", err);
      setMessage("Error: " + (err.message || err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <form onSubmit={handleCreate} className="w-full max-w-md bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Create Admin (one-time)</h2>

        <label className="block mb-2 text-sm">
          <div className="text-xs text-slate-600">Name</div>
          <input name="name" value={form.name} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2" />
        </label>

        <label className="block mb-2 text-sm">
          <div className="text-xs text-slate-600">Email</div>
          <input name="email" type="email" value={form.email} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2" />
        </label>

        <label className="block mb-2 text-sm">
          <div className="text-xs text-slate-600">Password</div>
          <input name="password" type="password" value={form.password} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2" />
        </label>

        <label className="block mb-2 text-sm">
          <div className="text-xs text-slate-600">Photo URL (optional)</div>
          <input name="photoURL" value={form.photoURL} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2" />
        </label>

        <label className="block mb-4 text-sm">
          <div className="text-xs text-slate-600">FCM Token (optional)</div>
          <input name="fcmToken" value={form.fcmToken} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2" />
        </label>

        <div className="flex gap-2">
          <button disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">
            {loading ? "Creating..." : "Create Admin"}
          </button>
          <button type="button" onClick={() => setForm({ email: "", name: "", password: "", photoURL: "", fcmToken: "" })} className="px-4 py-2 bg-gray-100 rounded">
            Reset
          </button>
        </div>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </form>
    </div>
  );
}
