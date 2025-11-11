// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { auth, db } from "../../firebase"; // ensure this path matches your project

const AuthContext = createContext({
  admin: null,
  loading: true,
  error: null,
  signOutAdmin: async () => {},
});

async function findAdminDocForUser(user) {
  if (!user) return null;

  const adminsCol = collection(db, "admins");

  // Try by uid
  try {
    if (user.uid) {
      const q = query(adminsCol, where("uid", "==", user.uid));
      const res = await getDocs(q);
      if (!res.empty) {
        const snap = res.docs[0];
        return { id: snap.id, data: snap.data(), ref: doc(db, "admins", snap.id) };
      }
    }
  } catch (err) {
    // non-fatal; continue to next attempt
    console.warn("[findAdminDocForUser] query by uid failed:", err);
  }

  // Try by email (lowercased)
  try {
    const email = (user.email || "").trim().toLowerCase();
    if (!email) return null;
    const q = query(adminsCol, where("email", "==", email));
    const res = await getDocs(q);
    if (!res.empty) {
      const snap = res.docs[0];
      return { id: snap.id, data: snap.data(), ref: doc(db, "admins", snap.id) };
    }
  } catch (err) {
    console.warn("[findAdminDocForUser] query by email failed:", err);
  }

  return null;
}

/**
 * AdminLogin provider — listens to Firebase Auth and enriches user with admin doc data.
 * Wrap your app with <AdminLogin>...</AdminLogin>
 */
export function AdminLogin({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth || !db) {
      console.error("[AdminLogin] auth or db not initialized. Check src/firebase exports.");
      setError("Firebase not initialized (see console).");
      setLoading(false);
      return;
    }

    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      setLoading(true);
      setError(null);

      if (!user) {
        setAdmin(null);
        setLoading(false);
        return;
      }

      try {
        const found = await findAdminDocForUser(user);
        const docData = found?.data || {};

        // Build normalized admin object
        const adminObj = {
          uid: user.uid,
          email: (user.email || "").trim().toLowerCase(),
          name: docData.name || user.displayName || "Admin",
          photoURL: docData.photoURL || user.photoURL || null, // null instead of ""
          _docId: found?.id || null,
        };

        setAdmin(adminObj);

        // store minimal flags locally for convenience (non-critical)
        try {
          localStorage.setItem("isAdminLoggedIn", "true");
          localStorage.setItem("adminEmail", adminObj.email || "");
          localStorage.setItem("adminUid", adminObj.uid || "");
        } catch (e) {
          // ignore localStorage errors (e.g., privacy mode)
        }
      } catch (err) {
        console.error("[AdminLogin] failed to fetch admin doc:", err);
        setError(String(err?.message || err));

        // fallback to a safe admin shape from firebase user
        setAdmin({
          uid: user.uid,
          email: (user.email || "").trim().toLowerCase(),
          name: user.displayName || "Admin",
          photoURL: user.photoURL || null,
          _docId: null,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  async function signOutAdmin() {
    try {
      await firebaseSignOut(auth);
      setAdmin(null);
      try {
        localStorage.removeItem("isAdminLoggedIn");
        localStorage.removeItem("adminEmail");
        localStorage.removeItem("adminUid");
      } catch (e) {}
    } catch (err) {
      console.error("Sign out failed:", err);
      setError(String(err?.message || err));
      throw err;
    }
  }

  const value = { admin, loading, error, signOutAdmin };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Backwards-compatible alias (if you used <AuthProvider> previously)
export const AuthProvider = AdminLogin;

export function useAuth() {
  return useContext(AuthContext);
}
