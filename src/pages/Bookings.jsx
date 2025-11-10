// src/pages/Bookings.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  FiSearch,
  FiFilter,
  FiClock,
  FiUsers,
  FiDollarSign,
  FiEye,
  FiX,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc as firestoreDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';

/* ---------------- small useMediaQuery hook (in-file) ---------------- */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    setMatches(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, [query]);

  return matches;
}

/* ---------------- helpers ---------------- */
const money = (n) => {
  try {
    const num = typeof n === 'number' ? n : Number(n || 0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(isNaN(num) ? 0 : num);
  } catch {
    return '₹0.00';
  }
};

function useAnimatedNumber(target, duration = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = Number(val) || 0;
    const to = Number(target) || 0;
    if (to === from) return setVal(to);
    let raf = null;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = from + (to - from) * eased;
      setVal(cur);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return Math.round(val);
}

/* ---------------- UI primitives (smaller sizes) ---------------- */
const StatCard = ({ Icon, title, value, accent = 'indigo' }) => {
  const accentMap = {
    indigo: 'from-indigo-500 to-indigo-400',
    blue: 'from-blue-500 to-blue-400',
    green: 'from-green-500 to-green-400',
  }[accent] || 'from-indigo-500 to-indigo-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 14px 30px rgba(2,6,23,0.05)' }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="bg-white rounded-xl p-3 flex items-center justify-between"
    >
      <div>
        <div className="text-xs text-gray-500">{title}</div>
        <div className="mt-1 text-lg font-semibold text-gray-800">{value}</div>
      </div>
      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${accentMap} text-white shadow flex items-center justify-center ml-3`}>
        {Icon ? <Icon size={18} /> : null}
      </div>
    </motion.div>
  );
};

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  const base = 'px-2.5 py-0.5 text-xs font-medium rounded-full';
  if (s === 'completed') return <span className={`${base} bg-green-100 text-green-800`}>Completed</span>;
  if (s === 'accepted') return <span className={`${base} bg-blue-100 text-blue-800`}>Accepted</span>;
  if (s === 'cancelled' || s === 'canceled') return <span className={`${base} bg-red-100 text-red-800`}>Cancelled</span>;
  if (s === 'active') return <span className={`${base} bg-indigo-100 text-indigo-800`}>Active</span>;
  return <span className={`${base} bg-gray-100 text-gray-800`}>{status}</span>;
};

const Skeleton = ({ className = '' }) => (
  <div className={`rounded bg-gray-200 relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 transform -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
  </div>
);

const listVariant = { hidden: {}, visible: { transition: { staggerChildren: 0.03 } } };
const itemVariant = { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 4 } };

/* ---------------- SlidePanel (desktop details, smaller) ---------------- */
function SlidePanel({ open, booking, onClose, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed right-0 top-0 h-full w-full md:w-[380px] bg-white shadow-lg z-40 border-l border-gray-100 overflow-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Booking Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">{booking?.bookingId ?? ''}</p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><FiX /></button>
              </div>
            </div>

            {!booking ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <div className="bg-gray-50 p-2.5 rounded-md border border-gray-100">
                  <div className="text-xs text-gray-500">Customer</div>
                  <div className="text-sm text-gray-900">{booking.customer}</div>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-md border border-gray-100">
                  <div className="text-xs text-gray-500">Driver</div>
                  <div className="text-sm text-gray-900">{booking.driver}</div>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-md border border-gray-100">
                  <div className="text-xs text-gray-500">Pickup / Drop</div>
                  <div className="text-sm text-gray-900">{booking.raw?.pickupAddress ?? booking.raw?.pickupLocation ?? '—'}</div>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-md border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500">Amount</div>
                    <div className="text-sm font-semibold">{money(booking.amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>

                <div className="mt-2 flex gap-2">
                  <button onClick={() => alert(JSON.stringify(booking.raw ?? {}, null, 2))} className="flex-1 px-3 py-1.5 rounded bg-indigo-50 text-indigo-700 text-sm">View raw</button>
                  <button onClick={() => onCancel(booking.id)} className="px-3 py-1.5 rounded bg-red-50 text-red-700 text-sm">Cancel</button>
                </div>

                <div className="mt-3 text-xs text-gray-500">Created: {booking.raw?.createdAt?.toDate ? booking.raw.createdAt.toDate().toLocaleString() : booking.date}</div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ---------------- main component ---------------- */
export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState(null);

  // slide panel state
  const [slideBooking, setSlideBooking] = useState(null);
  const [slideOpen, setSlideOpen] = useState(false);

  // explicit media query: use 768px for md breakpoint (tailwind default)
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    setLoading(true);
    let q;
    try {
      q = query(collection(db, 'BOOKINGS'), orderBy('bookingDateTime', 'desc'));
    } catch {
      q = collection(db, 'BOOKINGS');
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => {
          const data = d.data();
          const date = data?.bookingDateTime?.toDate?.()?.toLocaleString?.() ?? data?.date ?? '—';
          const amount = Number(data?.amount ?? data?.customerFare ?? data?.totalAmount ?? 0);
          const status = data?.status ?? data?.bookingStatus ?? 'Unknown';
          return {
            id: d.id,
            bookingId: data?.bookingId ?? d.id,
            customer: data?.customerName ?? data?.customer ?? 'Unknown',
            driver: data?.driverName ?? data?.driver ?? 'Unassigned',
            date,
            amount,
            status,
            raw: data,
          };
        });
        setBookings(arr);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const total = bookings.length;
  const active = bookings.filter((b) => (b.status || '').toLowerCase() === 'active').length;
  const revenue = bookings.filter((b) => (b.status || '').toLowerCase() === 'completed').reduce((s, b) => s + Number(b.amount || 0), 0);

  const animatedTotal = useAnimatedNumber(total);
  const animatedActive = useAnimatedNumber(active);
  const animatedRevenue = useAnimatedNumber(revenue);

  const filtered = bookings.filter((b) => {
    if (filterStatus !== 'All' && b.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (b.bookingId + b.customer + b.driver).toLowerCase().includes(s);
  });

  // open slide for desktop
  const openSlide = (b) => {
    setSlideBooking(b);
    setSlideOpen(true);
  };

  const closeSlide = () => {
    setSlideOpen(false);
    setTimeout(() => setSlideBooking(null), 240);
  };

  const handleCancelBooking = async (id) => {
    const ok = window.confirm('Cancel this booking?');
    if (!ok) return;
    try {
      const ref = firestoreDoc(db, 'BOOKINGS', id);
      await updateDoc(ref, { status: 'Cancelled' });
      // close panel if it was open
      if (slideBooking?.id === id) closeSlide();
    } catch (err) {
      console.error('Cancel failed', err);
      alert('Failed to cancel — check console.');
    }
  };

  const mobileRef = useRef();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-3 md:p-6">
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%);} 100%{transform: translateX(100%);} } .animate-shimmer { animation: shimmer 1.1s linear infinite; }`}</style>

      {/* Top header - sticky controls */}
      <div className="sticky top-3 z-20">
        <div className="backdrop-blur-sm bg-white/80 rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Bookings</h2>
            <div className="text-xs text-gray-500 mt-0.5">Overview of recent bookings</div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none md:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by id, customer or driver"
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:bg-gray-100 rounded">
                  <FiX />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-500" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 text-sm border border-gray-200 rounded-lg">
                <option value="All">All</option>
                <option value="accepted">Accepted</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard Icon={FiUsers} title="Total" value={animatedTotal} accent="indigo" />
        <StatCard Icon={FiClock} title="Active" value={animatedActive} accent="blue" />
        <StatCard Icon={FiDollarSign} title="Revenue" value={money(animatedRevenue)} accent="green" />
      </div>

      {/* Content */}
      <div className="mt-4">
        {isDesktop ? (
          <>
            <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Recent Bookings ({filtered.length})</div>
                  <div className="text-xs text-gray-400">Click View to open details</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full table-auto text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Booking ID</th>
                      <th className="py-2.5 px-4 text-left">Customer</th>
                      <th className="py-2.5 px-4 text-left">Driver</th>
                      <th className="py-2.5 px-4 text-left">Date</th>
                      <th className="py-2.5 px-4 text-left">Amount</th>
                      <th className="py-2.5 px-4 text-left">Status</th>
                      <th className="py-2.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    <AnimatePresence>
                      {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <td className="py-2.5 px-4"><Skeleton className="h-3.5 w-20" /></td>
                            <td className="py-2.5 px-4"><Skeleton className="h-3.5 w-28" /></td>
                            <td className="py-2.5 px-4"><Skeleton className="h-3.5 w-24" /></td>
                            <td className="py-2.5 px-4"><Skeleton className="h-3.5 w-32" /></td>
                            <td className="py-2.5 px-4"><Skeleton className="h-3.5 w-20" /></td>
                            <td className="py-2.5 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                            <td className="py-2.5 px-4"><Skeleton className="h-5 w-14" /></td>
                          </motion.tr>
                        ))
                      ) : filtered.length === 0 ? (
                        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key="empty">
                          <td colSpan="7" className="py-6 text-center text-gray-400 text-sm">No bookings found</td>
                        </motion.tr>
                      ) : (
                        filtered.map((b) => (
                          <motion.tr
                            key={b.id}
                            whileHover={{ y: -3 }}
                            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                            className="hover:bg-gray-50"
                          >
                            <td className="py-2.5 px-4 text-indigo-600 font-medium">{b.bookingId}</td>
                            <td className="py-2.5 px-4">{b.customer}</td>
                            <td className="py-2.5 px-4">{b.driver}</td>
                            <td className="py-2.5 px-4">{b.date}</td>
                            <td className="py-2.5 px-4 font-semibold">{money(b.amount)}</td>
                            <td className="py-2.5 px-4"><StatusBadge status={b.status} /></td>
                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-2">
                                <button title="View" onClick={() => openSlide(b)} className="p-2 rounded hover:bg-gray-100"><FiEye /></button>
                                <button
                                  title="Cancel"
                                  onClick={() => {
                                    if (confirm('Cancel this booking?')) {
                                      handleCancelBooking(b.id);
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs hidden"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Slide panel component (desktop only visually) */}
            <SlidePanel open={slideOpen} booking={slideBooking} onClose={closeSlide} onCancel={handleCancelBooking} />
          </>
        ) : (
          <div ref={mobileRef} className="mt-3 space-y-3">
            <AnimatePresence>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <motion.div key={i} variants={itemVariant} initial="hidden" animate="visible" exit="exit" className="bg-white p-3 rounded-xl shadow border border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-gray-400">Booking ID</div>
                        <div className="text-indigo-600 font-semibold text-sm">—</div>
                        <div className="text-xs text-gray-400 mt-1">Customer</div>
                        <div className="text-sm text-gray-800">—</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Amount</div>
                        <div className="font-semibold text-sm">—</div>
                        <div className="mt-2"><Skeleton className="h-5 w-16 rounded-full" /></div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : filtered.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 rounded-xl text-center text-gray-400 border border-gray-100 text-sm">No bookings</motion.div>
              ) : (
                filtered.map((b) => {
                  const isOpen = openCard === b.id;
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      layout
                      className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden"
                    >
                      <div className="p-3 flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-400">Booking ID</div>
                              <div className="text-indigo-600 font-semibold text-sm">{b.bookingId}</div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-gray-400">Amount</div>
                              <div className="font-semibold text-sm">{money(b.amount)}</div>
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-gray-700">
                            <div><span className="text-xs text-gray-400">Customer: </span>{b.customer}</div>
                            <div className="mt-1"><span className="text-xs text-gray-400">Driver: </span>{b.driver}</div>
                            <div className="mt-1"><span className="text-xs text-gray-400">Date: </span>{b.date}</div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-start gap-2">
                          <StatusBadge status={b.status} />
                          <button
                            onClick={() => setOpenCard((prev) => (prev === b.id ? null : b.id))}
                            className="p-2 rounded-full hover:bg-gray-100"
                            aria-expanded={isOpen}
                            aria-controls={`card-${b.id}`}
                          >
                            {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            id={`card-${b.id}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="px-3 pb-3"
                          >
                            <div className="text-sm text-gray-700 space-y-2">
                              <div><strong className="text-xs">Raw status:</strong> {b.status}</div>
                              <div><strong className="text-xs">Driver:</strong> {b.driver}</div>
                              <div><strong className="text-xs">Booking id:</strong> {b.bookingId}</div>
                              <div className="mt-2 flex gap-2">
                                <button className="px-2 py-1 text-sm bg-indigo-50 text-indigo-700 rounded">View</button>
                                <button
                                  onClick={() => {
                                    if (confirm('Cancel this booking?')) handleCancelBooking(b.id);
                                  }}
                                  className="px-2 py-1 text-sm bg-red-50 text-red-700 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
