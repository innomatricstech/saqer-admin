// src/pages/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaShoppingCart,
  FaCalendarDay,
  FaMoneyBillWave,
  FaChevronRight,
  FaUsers,
  FaCar,
  FaChartLine,
  FaSync,
  FaArrowUp,
  FaArrowDown,
  FaStar,
  FaEye
} from "react-icons/fa";
import { useBookings } from "../context/BookingsContext";

/* ---------------- helpers ---------------- */
const money = (n, iso = "AED") => {
  try {
    const num = typeof n === "number" ? n : Number(n || 0);
    return new Intl.NumberFormat('en-US', {
      style: "currency",
      currency: "AED",
      maximumFractionDigits: 0,
    }).format(isNaN(num) ? 0 : num);
  } catch {
    return `AED 0`;
  }
};

function formatDateStr(d) {
  try {
    if (!d) return "—";
    const date = d.seconds ? new Date(d.seconds * 1000) : new Date(d);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return "—";
  }
}

/* ---------------- animated number hook ---------------- */
function useAnimatedNumber(target, duration = 900) {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    let raf = null;
    const start = performance.now();
    const from = Number(val) || 0;
    const to = Number(target) || 0;
    if (to === from) {
      setVal(to);
      return;
    }
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = from + (to - from) * eased;
      setVal(cur);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return Math.round(val);
}

/* ---------------- Enhanced Sparkline ---------------- */
function Sparkline({ values = [], width = 120, height = 40, color = "currentColor" }) {
  if (!values || values.length === 0) return <div className="text-xs text-white/60">no data</div>;

  const w = width;
  const h = height;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - ((v - min) / range) * h;
    return [x, y];
  });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <defs>
        <linearGradient id="sparkGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGradient)" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point[0]}
          cy={point[1]}
          r={i === points.length - 1 ? 2 : 1}
          fill={color}
          opacity={i === points.length - 1 ? 1 : 0}
        />
      ))}
    </svg>
  );
}

/* ---------------- Enhanced StatCard ---------------- */
function StatCard({ title, value, unit, Icon, gradient = "from-blue-500 to-cyan-500", sparkData, trend, change }) {
  const animated = useAnimatedNumber(typeof value === "number" ? value : Number(value || 0), 900);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{
        y: -8,
        scale: 1.02,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
      className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-2xl bg-gradient-to-br ${gradient} backdrop-blur-sm border border-white/10`}
    >
      {/* Animated background elements */}
      <motion.div
        className="absolute -right-6 -top-6 opacity-20 text-7xl pointer-events-none"
        animate={{ rotate: [0, 5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        {Icon ? <Icon /> : null}
      </motion.div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="text-sm font-medium opacity-90 mb-1">{title}</div>
            <div className="text-3xl font-bold tracking-tight">
              {unit ? `${money(animated, unit)}` : animated.toLocaleString()}
            </div>

            {/* Trend indicator */}
            {trend && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === 'up' ? 'text-green-200' : 'text-red-200'
                  }`}
              >
                {trend === 'up' ? <FaArrowUp className="text-xs" /> : <FaArrowDown className="text-xs" />}
                <span>{change}% this week</span>
              </motion.div>
            )}
          </div>

          <motion.div
            className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {Icon ? <Icon className="text-lg" /> : null}
          </motion.div>
        </div>

        {/* Sparkline */}
        {sparkData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            <Sparkline values={sparkData} color="rgba(255,255,255,0.9)" width={120} height={32} />
          </motion.div>
        )}
      </div>

      {/* Shine effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full"
        whileHover={{ translateX: "200%" }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

/* ---------------- Booking Card Component ---------------- */
function BookingCard({ booking, index }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 group cursor-pointer"
      onClick={() => navigate("/bookings")}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {String(booking.bookingId || booking.id).slice(0, 2).toUpperCase()}
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {booking.customerName || booking.customer || "Customer"}
              </div>
              <motion.div
                className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : booking.status === 'active'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                  }`}
                whileHover={{ scale: 1.05 }}
              >
                {booking.status || 'pending'}
              </motion.div>
            </div>

            <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
              <FaCar className="text-gray-400" />
              <span>{booking.driverName || booking.driver || "Unassigned"}</span>
            </div>

            <div className="text-xs text-gray-400">
              {formatDateStr(booking.bookingDateTime ?? booking.date ?? booking.createdAt)}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-gray-900 mb-1">
            {money(Number(booking.totalAmount ?? booking.amount ?? booking.customerFare ?? 0), "AED")}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <FaEye className="text-xs" />
            View
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Enhanced Dashboard ---------------- */
export default function Dashboard() {
  const navigate = useNavigate();
  const {
    recentBookings = [],
    dailyRevenue7 = [],
    todaysCount = 0,
    totalCompletedRevenue = 0,
    loading = true,
  } = useBookings();

  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isAdminLoggedIn");
    if (!isLoggedIn) navigate("/admin-login", { replace: true });
  }, [navigate]);

  // Enhanced stats with trends
  const stats = React.useMemo(() => {
    const totalOrders = (recentBookings || []).length;

    // Mock trends for demo (you can replace with real data)
    const trends = {
      totalOrders: { value: totalOrders, trend: 'up', change: 12 },
      todaysOrders: { value: todaysCount, trend: 'up', change: 8 },
      totalAmount: { value: totalCompletedRevenue, trend: 'up', change: 15 },
      customers: { value: Math.floor(totalOrders * 0.7), trend: 'up', change: 5 }
    };

    return trends;
  }, [recentBookings, todaysCount, totalCompletedRevenue]);

  const statCards = [
    {
      title: "Total Bookings",
      value: stats.totalOrders.value,
      Icon: FaShoppingCart,
      gradient: "from-violet-600 to-purple-600",
      sparkData: dailyRevenue7,
      trend: stats.totalOrders.trend,
      change: stats.totalOrders.change
    },
    {
      title: "Today's Orders",
      value: stats.todaysOrders.value,
      Icon: FaCalendarDay,
      gradient: "from-blue-500 to-cyan-500",
      sparkData: dailyRevenue7,
      trend: stats.todaysOrders.trend,
      change: stats.todaysOrders.change
    },
    {
      title: "Total Revenue",
      value: stats.totalAmount.value,
      Icon: FaMoneyBillWave,
      unit: "AED",
      gradient: "from-emerald-500 to-green-500",
      sparkData: dailyRevenue7,
      trend: stats.totalAmount.trend,
      change: stats.totalAmount.change
    },
    {
      title: "Active Customers",
      value: stats.customers.value,
      Icon: FaUsers,
      gradient: "from-orange-500 to-red-500",
      sparkData: dailyRevenue7,
      trend: stats.customers.trend,
      change: stats.customers.change
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Enhanced Header */}
      <motion.div
        className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8"
        variants={itemVariants}
      >
        <div className="flex-1">
          <motion.h1
            className="text-4xl font-black text-gray-900 mb-2 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Dashboard Overview
          </motion.h1>
        </div>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 rounded-xl bg-white shadow-lg border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-medium transition-all duration-300"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaSync className="text-gray-500" />
            Refresh Data
          </motion.button>

          <motion.button
            onClick={() => navigate("/bookings")}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl flex items-center gap-2 font-medium transition-all duration-300"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            View All Bookings
            <FaChevronRight className="text-sm" />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Enhanced Stat Cards Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8"
        variants={containerVariants}
      >
        {statCards.map((card, index) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            unit={card.unit}
            Icon={card.Icon}
            gradient={card.gradient}
            sparkData={card.sparkData}
            trend={card.trend}
            change={card.change}
          />
        ))}
      </motion.div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Revenue Chart Section */}
        <motion.div
          className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-xl border border-gray-100"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FaChartLine className="text-blue-600" />
                Revenue Analytics (AED)
              </h3>
              <p className="text-gray-500 mt-1">Last 7 days performance overview</p>
            </div>
            <motion.div
              className="flex items-center gap-2 text-sm text-gray-500"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Current Period
            </motion.div>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <motion.div
                  className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-48 flex items-center justify-center bg-gradient-to-b from-blue-50 to-white rounded-xl border border-gray-200">
                  <Sparkline values={dailyRevenue7} width={400} height={120} color="#3B82F6" />
                </div>

                <div className="grid grid-cols-7 gap-2 text-center">
                  {dailyRevenue7.map((value, index) => {
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    return (
                      <motion.div
                        key={index}
                        className="p-2 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-xs text-gray-500 mb-1">{days[index]}</div>
                        <div className="text-sm font-semibold text-gray-900">{money(value, "AED")}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Bookings Section */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FaStar className="text-yellow-500" />
                Recent Bookings
              </h3>
              <p className="text-gray-500 mt-1">Latest customer activities</p>
            </div>
            <motion.div
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              whileHover={{ scale: 1.05 }}
            >
              {loading ? "..." : `${recentBookings.length} total`}
            </motion.div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="animate-pulse bg-gray-100 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-200"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : recentBookings.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-gray-500"
                >
                  <FaShoppingCart className="text-4xl text-gray-300 mx-auto mb-4" />
                  <div>No recent bookings found</div>
                </motion.div>
              ) : (
                recentBookings.slice(0, 6).map((booking, index) => (
                  <BookingCard key={booking.id} booking={booking} index={index} />
                ))
              )}
            </AnimatePresence>
          </div>

          <motion.div
            className="mt-6 pt-4 border-t border-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button
              onClick={() => navigate("/bookings")}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 text-gray-700 font-medium border border-gray-200 transition-all duration-300 flex items-center justify-center gap-2"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View All Bookings
              <FaChevronRight className="text-sm" />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </motion.div>
  );
}