import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import "../../firebase"
import { FaShoppingCart, FaCalendarDay, FaMoneyBillWave } from "react-icons/fa";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    todaysOrders: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "BOOKINGS"));
        let totalOrders = 0;
        let todaysOrders = 0;
        let totalAmount = 0;

        const today = new Date().toDateString();

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          totalOrders++;
          totalAmount += data.totalAmount || 0;

          const bookingDate = data.bookingDateTime
            ? new Date(data.bookingDateTime).toDateString()
            : null;

          if (bookingDate === today) {
            todaysOrders++;
          }
        });

        setStats({ totalOrders, todaysOrders, totalAmount });
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchBookings();
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
      value: `$${stats.totalAmount.toFixed(2)}`,
      icon: <FaMoneyBillWave />,
      color: "from-yellow-500 to-orange-500",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Dashboard Overview
      </h1>

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
            <p className="text-4xl font-bold">{card.value}</p>
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
