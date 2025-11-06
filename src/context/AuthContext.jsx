// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { auth, db } from "../../firebase"; // correct relative path

const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

async function findAdminDocForUser(user) {
  if (!user) return null;
  const adminsCol = collection(db, "admins");

  try {
    const q = query(adminsCol, where("uid", "==", user.uid));
    const res = await getDocs(q);
    if (!res.empty) {
      const snap = res.docs[0];
      return { id: snap.id, data: snap.data(), ref: doc(db, "admins", snap.id) };
    }
  } catch (err) {
    console.warn("[findAdminDocForUser] query by uid failed:", err);
  }

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
 * AdminLogin provider — wrap your app with <AdminLogin>...</AdminLogin>
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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
        const adminObj = {
          uid: user.uid,
          email: (user.email || "").trim().toLowerCase(),
          name: docData.name || user.displayName || "Admin",
          photoURL: docData.photoURL || user.photoURL || null,
          _docId: found?.id || null,
        };
        setAdmin(adminObj);

        try {
          localStorage.setItem("isAdminLoggedIn", "true");
          localStorage.setItem("adminEmail", adminObj.email || "");
          localStorage.setItem("adminUid", adminObj.uid || "");
        } catch (e) {
          /* ignore localStorage errors */
        }
      } catch (err) {
        console.error("[AdminLogin] failed to fetch admin doc:", err);
        setError(String(err?.message || err));
        setAdmin({
          uid: user.uid,
          email: (user.email || "").trim().toLowerCase(),
          name: user.displayName || "Admin",
          photoURL: user.photoURL || null,
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function signOutAdmin() {
    try {
      await firebaseSignOut(auth);
      setAdmin(null);
      localStorage.removeItem("isAdminLoggedIn");
      localStorage.removeItem("adminEmail");
      localStorage.removeItem("adminUid");
    } catch (err) {
      console.error("Sign out failed:", err);
      setError(String(err?.message || err));
    }
  }

  const value = { admin, loading, error, signOutAdmin };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
