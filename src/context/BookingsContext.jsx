// src/context/BookingsContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase"; // adjust path if needed

const BookingsContext = createContext(null);

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error("useBookings must be used within BookingsProvider");
  return ctx;
}

export function BookingsProvider({ children }) {
  const [bookingsRaw, setBookingsRaw] = useState([]); // raw docs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    let qRef;
    try {
      qRef = query(collection(db, "BOOKINGS"), orderBy("bookingDateTime", "desc"));
    } catch {
      qRef = collection(db, "BOOKINGS");
    }

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        try {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setBookingsRaw(docs);
          setError(null);
        } catch (err) {
          console.error("BookingsContext: failed to parse snapshot", err);
          setError(err);
          setBookingsRaw([]);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("BookingsContext: snapshot error", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // computed stats (memoized)
  const computed = useMemo(() => {
    const todayStr = new Date().toDateString();
    let todaysCount = 0;
    let todaysRevenue = 0;
    let totalCompletedRevenue = 0;

    for (const d of bookingsRaw) {
      const amount = Number(d.amount ?? d.totalAmount ?? d.customerFare ?? 0) || 0;
      const status = (d.status ?? d.bookingStatus ?? "").toString().toLowerCase();

      if (status === "completed") {
        totalCompletedRevenue += amount;
      }

      let bookingDate = null;
      const rawDate = d.bookingDateTime ?? d.createdAt ?? d.date ?? null;
      if (rawDate) {
        if (rawDate?.seconds && typeof rawDate.seconds === "number") {
          bookingDate = new Date(rawDate.seconds * 1000);
        } else {
          bookingDate = new Date(rawDate);
        }
      }

      if (bookingDate && !isNaN(bookingDate.getTime()) && bookingDate.toDateString() === todayStr) {
        todaysCount++;
        todaysRevenue += amount;
      } else if (!bookingDate && typeof d.date === "string") {
        const parsed = new Date(d.date);
        if (!isNaN(parsed.getTime()) && parsed.toDateString() === todayStr) {
          todaysCount++;
          todaysRevenue += amount;
        }
      }
    }

    // prepare recent bookings sorted by timestamp (desc)
    const recent = bookingsRaw
      .map((b) => {
        const raw = b.bookingDateTime ?? b.createdAt ?? b.date;
        let ts = 0;
        if (raw) {
          if (raw.seconds && typeof raw.seconds === "number") ts = raw.seconds * 1000;
          else ts = new Date(raw).getTime() || 0;
        }
        return { ...b, _ts: ts };
      })
      .sort((a, b) => (b._ts || 0) - (a._ts || 0));

    // weekly revenue (7 days ending today)
    const DAYS = 7;
    const revMap = {};
    for (let i = 0; i < DAYS; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (DAYS - 1 - i));
      revMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const b of bookingsRaw) {
      const amt = Number(b.amount ?? b.totalAmount ?? b.customerFare ?? 0) || 0;
      let bookingDate = null;
      const raw = b.bookingDateTime ?? b.createdAt ?? b.date ?? null;
      if (raw) {
        if (raw.seconds && typeof raw.seconds === "number") bookingDate = new Date(raw.seconds * 1000);
        else bookingDate = new Date(raw);
      }
      try {
        const key = bookingDate && !isNaN(bookingDate.getTime()) ? bookingDate.toISOString().slice(0, 10) : (typeof b.date === "string" ? new Date(b.date).toISOString().slice(0, 10) : null);
        if (key && revMap.hasOwnProperty(key)) revMap[key] += amt;
      } catch {}
    }
    const dailyRevenue7 = Object.keys(revMap).map((k) => revMap[k]);

    // badge count: non-completed bookings
    const badgeCount = bookingsRaw.reduce((acc, d) => {
      const s = (d.status ?? d.bookingStatus ?? "").toString().toLowerCase();
      return s !== "completed" ? acc + 1 : acc;
    }, 0);

    return {
      todaysCount,
      todaysRevenue,
      totalCompletedRevenue,
      recent,
      dailyRevenue7,
      badgeCount,
    };
  }, [bookingsRaw]);

  return (
    <BookingsContext.Provider
      value={{
        bookingsRaw,
        recentBookings: computed.recent,
        dailyRevenue7: computed.dailyRevenue7,
        todaysCount: computed.todaysCount,
        todaysRevenue: computed.todaysRevenue,
        totalCompletedRevenue: computed.totalCompletedRevenue,
        badgeCount: computed.badgeCount,
        loading,
        error,
      }}
    >
      {children}
    </BookingsContext.Provider>
  );
}
