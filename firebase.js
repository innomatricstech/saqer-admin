// src/firebase.js
// Modular Firebase v9 setup. Replace values by env vars for production.
// NOTE: Firebase client config is safe to include in client code, but
// you should move actual values to environment variables for security
// and to avoid committing credentials to source control.

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDM2z4RQLDvb-z_XizpMPQcuO9J5fXIvzs",
  authDomain: "saqer-driver-booking-app.firebaseapp.com",
  projectId: "saqer-driver-booking-app",
  storageBucket: "saqer-driver-booking-app.appspot.com",
  messagingSenderId: "887982633599",
  appId: "1:887982633599:web:bdc26913e39a7fcf3c054a",
  measurementId: "G-GMEWHEYB6W",
};

const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

// Auth
export const auth = getAuth(app);

// Optional: analytics (only initialize when supported, avoids errors in SSR/test envs)
export let analytics = null;
(async () => {
  try {
    if (await analyticsIsSupported()) {
      analytics = getAnalytics(app);
    }
  } catch (err) {
    // analytics not supported or failed to initialize (safe to ignore)
    // console.debug("Firebase analytics not initialized:", err);
  }
})();

// Export app as default in case you need it elsewhere
export default app;
