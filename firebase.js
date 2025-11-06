// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";

/* ---------- Firebase Config ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDM2z4RQLDvb-z_XizpMPQcuO9J5fXIvzs",
  authDomain: "saqer-driver-booking-app.firebaseapp.com",
  projectId: "saqer-driver-booking-app",
  storageBucket: "saqer-driver-booking-app.appspot.com",
  messagingSenderId: "887982633599",
  appId: "1:887982633599:web:bdc26913e39a7fcf3c054a",
  measurementId: "G-GMEWHEYB6W",
};

/* ---------- Initialize Firebase ---------- */
const app = initializeApp(firebaseConfig);

/* ---------- Core Firebase Services ---------- */
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/* ---------- Optional: Firebase Analytics (browser only) ---------- */
export let analytics = null;
(async () => {
  try {
    if (await analyticsIsSupported()) {
      analytics = getAnalytics(app);
      console.log("✅ Firebase Analytics initialized");
    } else {
      console.log("⚠️ Analytics not supported in this environment.");
    }
  } catch (err) {
    console.warn("⚠️ Analytics initialization failed:", err);
  }
})();

/* ---------- Export Default App ---------- */
export default app;
