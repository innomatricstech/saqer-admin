// src/firebase.js
// Firebase modular SDK (v9+) initialization
// This file exports: app (default), auth, db, storage, analytics (may be null)

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";

/* ---------- Firebase Config (already filled) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDM2z4RQLDvb-z_XizpMPQcuO9J5fXIvzs",
  authDomain: "saqer-driver-booking-app.firebaseapp.com",
  projectId: "saqer-driver-booking-app",
  storageBucket: "saqer-driver-booking-app.appspot.com",
  messagingSenderId: "887982633599",
  appId: "1:887982633599:web:bdc26913e39a7fcf3c054a",
  measurementId: "G-GMEWHEYB6W",
};

/* ---------- Initialize Firebase App ---------- */
const app = initializeApp(firebaseConfig);

/* ---------- Core Firebase Services (named exports) ---------- */
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/* ---------- Optional: Firebase Analytics (browser-only safe init) ---------- */
export let analytics = null;

(async () => {
  try {
    if (await analyticsIsSupported()) {
      analytics = getAnalytics(app);
      // eslint-disable-next-line no-console
      console.log("✅ Firebase Analytics initialized");
    } else {
      // eslint-disable-next-line no-console
      console.log("⚠️ Firebase analytics not supported in this environment");
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("⚠️ Firebase analytics initialization failed:", err);
  }
})();

/* ---------- Helpful dev log to confirm storage bucket ---------- */
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.log("Firebase initialized. storageBucket:", firebaseConfig.storageBucket);
}

/* ---------- Default export (app) ---------- */
export default app;
