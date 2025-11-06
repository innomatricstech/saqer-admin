// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase"; // make sure your firebase export matches
import { FaShoppingCart, FaCalendarDay, FaMoneyBillWave } from "react-icons/fa";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    todaysOrders: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  // redirect if not logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isAdminLoggedIn");
    if (!isLoggedIn) {
      navigate("/admin-login", { replace: true });
    }
  }, [navigate]);

  // fetch bookings & compute stats
  useEffect(() => {
    let mounted = true;

    const fetchBookings = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "BOOKINGS"));
        let totalOrders = 0;
        let todaysOrders = 0;
        let totalAmount = 0;

        const todayStr = new Date().toDateString();

        querySnapshot.forEach((doc) => {
          const data = doc.data() || {};
          totalOrders++;

          const amt = Number(data.totalAmount) || 0;
          totalAmount += amt;

          // bookingDateTime might be a Firestore Timestamp, ISO string, or Date
          let bookingDate = null;
          const raw = data.bookingDateTime;

          if (raw) {
            if (raw.seconds && typeof raw.seconds === "number") {
              bookingDate = new Date(raw.seconds * 1000);
            } else {
              // try to parse string or Date object
              bookingDate = new Date(raw);
            }
          }

          if (bookingDate && !isNaN(bookingDate.getTime())) {
            if (bookingDate.toDateString() === todayStr) {
              todaysOrders++;
            }
          }
        });

        if (mounted) {
          setStats({ totalOrders, todaysOrders, totalAmount });
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchBookings();

    return () => {
      mounted = false;
    };
  }, []);

  const statCards = [
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: <FaShoppingCart />,
      color: "from-blue-500 to-blue-700",
    },
    {
      title: "Today's Orders",
      value: stats.todaysOrders,
      icon: <FaCalendarDay />,
      color: "from-green-500 to-emerald-600",
    },
    {
      title: "Total Amount",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(stats.totalAmount || 0),
      icon: <FaMoneyBillWave />,
      color: "from-yellow-500 to-orange-500",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Summary of recent activity and key metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className={`relative p-6 rounded-xl shadow-lg text-white bg-gradient-to-br ${card.color} overflow-hidden transform transition-transform hover:scale-105`}
          >
            <div className="absolute opacity-20 text-6xl right-5 top-5">
              {card.icon}
            </div>
            <h3 className="text-lg font-medium mb-1">{card.title}</h3>
            <p className="text-4xl font-bold">{loading ? "—" : card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Recent Bookings</h2>
        <p className="text-gray-500">
          (You can expand this section later to show detailed booking tables)
        </p>
      </div>
    </div>
  );
}
