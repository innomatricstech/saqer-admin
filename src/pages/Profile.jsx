import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { getDownloadURL, ref as storageRef, uploadBytesResumable, deleteObject } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../../firebase"; // <- adjust path to your firebase init
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { admin, loading: authLoading } = useAuth(); // assumes admin.uid, admin.email, admin.name, admin.photoURL
  const uid = admin?.uid;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPhoto, setCurrentPhoto] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (admin) {
      setName(admin.name || "");
      setEmail(admin.email || "");
      setCurrentPhoto(admin.photoURL || "");
    }
  }, [admin]);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    return () => {
      reader.abort && reader.abort();
    };
  }, [file]);

  if (authLoading) {
    return <div className="p-6">Loading...</div>;
  }

  async function handleUpload(e) {
    e.preventDefault();
    setMsg("");
    if (!uid) return setMsg("No admin user found.");
    if (!file) return setMsg("Please choose an image to upload.");

    setBusy(true);
    setUploadProgress(0);
    try {
      // Create a storage reference
      // Use a folder like `admins/{uid}/profile.jpg` so each admin has their own path
      const ext = file.name.split(".").pop();
      const storagePath = `admins/${uid}/profile.${ext}`;
      const sRef = storageRef(storage, storagePath);

      // Upload with resumable to get progress
      const uploadTask = uploadBytesResumable(sRef, file);

      // Listen for progress
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (error) => {
          console.error("Upload failed:", error);
          setMsg("Upload failed. Try again.");
          setBusy(false);
        },
        async () => {
          // Completed — get URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Update Firestore admins/{uid}
          await updateDoc(doc(db, "admins", uid), {
            photoURL: downloadURL,
            // optionally update name: name
          });

          setCurrentPhoto(downloadURL);
          setPreview("");
          setFile(null);
          setMsg("Profile photo updated.");
          setBusy(false);
          setUploadProgress(0);
        }
      );
    } catch (err) {
      console.error(err);
      setMsg("Unexpected error. Check console.");
      setBusy(false);
    }
  }

  // Optional: remove current photo from storage (if you want)
  async function handleRemovePhoto() {
    if (!uid || !currentPhoto) return;
    try {
      setBusy(true);
      // Attempt to delete the object by deriving storage ref from the URL.
      // NOTE: deleting via get path is safer if you stored the storage path as well.
      // Here we attempt to create a ref to the exact file path used earlier.
      // If you used `admins/${uid}/profile.ext` earlier you can build the path.
      // For simplicity, we'll update Firestore photoURL to null and leave deletion for manual handling.
      await updateDoc(doc(db, "admins", uid), { photoURL: null });
      setCurrentPhoto("");
      setMsg("Photo removed (Firestore updated).");
    } catch (err) {
      console.error("Remove error:", err);
      setMsg("Could not remove photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-white rounded-2xl shadow p-6 border"
      >
        <h2 className="text-lg font-semibold mb-4">Profile</h2>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: avatar & upload */}
          <div className="w-full md:w-1/3 flex flex-col items-center">
            <div className="w-36 h-36 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center mb-3">
              <img
                src={preview || currentPhoto || "/images/saqer.jpeg"}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full">
              <label className="block text-xs text-slate-600 mb-1">Change profile photo</label>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (f) setFile(f);
                }}
                className="text-sm"
                disabled={busy}
              />

              {file && (
                <div className="mt-3">
                  <div className="text-xs text-slate-500 mb-2">Preview:</div>
                  <div className="w-full bg-slate-50 p-2 rounded">
                    <img src={preview} alt="preview" className="w-full h-36 object-contain" />
                  </div>
                </div>
              )}

              {uploadProgress > 0 && (
                <div className="w-full mt-3">
                  <div className="h-2 bg-slate-200 rounded overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{uploadProgress}%</div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={busy || !file}
                  className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
                >
                  {busy ? "Uploading..." : "Upload"}
                </button>

                <button
                  onClick={() => {
                    setFile(null);
                    setPreview("");
                    if (inputRef.current) inputRef.current.value = "";
                    setMsg("");
                  }}
                  disabled={busy}
                  className="px-3 py-2 rounded border text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={handleRemovePhoto}
                  disabled={busy || !currentPhoto}
                  className="px-3 py-2 rounded border text-sm text-rose-600 disabled:opacity-60"
                >
                  Remove
                </button>
              </div>

              {msg && <div className="mt-3 text-sm text-slate-600">{msg}</div>}
            </div>
          </div>

          {/* Right: info */}
          <div className="flex-1">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setMsg("Name update not implemented here. Implement if needed.");
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs text-slate-600">Name</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600">Email</label>
                <input className="mt-1 w-full rounded border px-3 py-2 bg-slate-50" value={email} disabled />
              </div>

              <div className="pt-2">
                <button type="submit" className="px-4 py-2 rounded bg-amber-500 text-white">
                  Save (placeholder)
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
