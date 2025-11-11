// src/pages/CreateAdmin.jsx
import React, { useState, useRef, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { auth, db, storage } from "../../firebase"; // adjust path if necessary

// Preset images (must exist in public/images/)
const PRESETS = [
  { id: "saqer", label: "Saqer Logo", url: "/images/saqer.jpeg" },
  { id: "saqer2", label: "Saqer Alt", url: "/images/saqer2.png" }, // optional
];

export default function CreateAdmin() {
  const [form, setForm] = useState({ email: "", name: "", password: "", fcmToken: "" });
  const [selectedPreset, setSelectedPreset] = useState(null); // preset id or null
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    return () => {
      try { reader.abort && reader.abort(); } catch (e) {}
    };
  }, [file]);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }
    setFile(f);
    setSelectedPreset(null); // clear preset when custom file chosen
    setMessage("");
  }

  function choosePreset(presetId) {
    const p = PRESETS.find((x) => x.id === presetId);
    setSelectedPreset(p ? p.id : null);
    setFile(null);
    setPreview("");
    setMessage("");
  }

  // upload helper used after user creation
  function uploadFileForUid(uid, fileToUpload) {
    return new Promise((resolve, reject) => {
      const ext = (fileToUpload.name || "jpg").split(".").pop();
      const path = `admins/${uid}/profile.${ext}`;
      const sRef = storageRef(storage, path);
      const metadata = { contentType: fileToUpload.type || "image/jpeg" };
      const uploadTask = uploadBytesResumable(sRef, fileToUpload, metadata);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (err) => {
          console.error("Upload error", err);
          reject(err);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage("");
    const { email, password, name, fcmToken } = form;
    if (!email || !password || !name) {
      setMessage("Please provide name, email and password.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // create user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;
      const uid = user.uid;

      // Determine photoURL:
      // - if preset selected -> use preset URL (public path)
      // - else if file selected -> upload and get downloadURL
      // - else -> null
      let photoURL = null;
      if (selectedPreset) {
        const p = PRESETS.find((x) => x.id === selectedPreset);
        if (p) photoURL = p.url;
      } else if (file) {
        photoURL = await uploadFileForUid(uid, file);
      }

      // create admins/{uid} doc
      // NOTE: Do NOT store plaintext passwords in production. Kept for parity with your earlier code.
      await setDoc(doc(db, "admins", uid), {
        email: user.email,
        name: name,
        password: password, // remove in production!
        uid: uid,
        fcmToken: fcmToken || null,
        photoURL: photoURL || null,
        createdAt: serverTimestamp(),
      });

      setMessage("✅ Admin created successfully. UID: " + uid);
      setForm({ email: "", password: "", name: "", fcmToken: "" });
      setFile(null);
      setPreview("");
      setSelectedPreset(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Create admin error:", err);
      // Many errors possible: auth/email-already-in-use etc.
      setMessage("Error: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <form onSubmit={handleCreate} className="w-full max-w-md bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Create Admin (one-time)</h2>

        {/* PRESET CHOICES */}
        <div className="mb-3">
          <div className="text-xs text-slate-600 mb-2">Choose a preset avatar (or upload below)</div>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => choosePreset(p.id)}
                className={`border rounded p-1 ${selectedPreset === p.id ? "ring-2 ring-indigo-500" : ""}`}
              >
                <img src={p.url} alt={p.label} className="w-16 h-16 object-cover rounded" />
              </button>
            ))}
          </div>
        </div>

        {/* OR upload */}
        <div className="mb-4">
          <div className="text-xs text-slate-600 mb-2">Or upload a custom image</div>
          <div className="flex items-start gap-4">
            <div
              className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-xs text-center text-slate-500 px-1">Click to select</div>
              )}
            </div>

            <div className="flex-1">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
              {file && (
                <div className="text-xs text-slate-500 mb-2">Selected: {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</div>
              )}
              {uploadProgress > 0 && (
                <div className="w-full">
                  <div className="h-2 bg-slate-200 rounded overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{uploadProgress}%</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form fields */}
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

        <label className="block mb-4 text-sm">
          <div className="text-xs text-slate-600">FCM Token (optional)</div>
          <input name="fcmToken" value={form.fcmToken} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2" />
        </label>

        <div className="flex gap-2 mt-4">
          <button disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">
            {loading ? "Creating..." : "Create Admin"}
          </button>

          <button
            type="button"
            onClick={() => {
              setForm({ email: "", name: "", password: "", fcmToken: "" });
              setFile(null);
              setPreview("");
              setSelectedPreset(null);
              setUploadProgress(0);
              if (fileInputRef.current) fileInputRef.current.value = "";
              setMessage("");
            }}
            className="px-4 py-2 bg-gray-100 rounded"
          >
            Reset
          </button>
        </div>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </form>
    </div>
  );
}
