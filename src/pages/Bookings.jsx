// src/pages/Bookings.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  FiSearch,
  FiFilter,
  FiCalendar,
  FiUsers,
  FiDollarSign,
  FiClock,
  FiEye,
  FiX,
  FiMapPin,
  FiInfo,
  FiTag,
  FiPercent,
  FiPhone,
} from 'react-icons/fi';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc as firestoreDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';

/*
  Enhanced Bookings.jsx
  - Rich, polished UI using Tailwind (no dynamic class names)
  - Strong animations via framer-motion (stagger, spring, layout, hover)
  - Animated stat counters (requestAnimationFrame)
  - Expanding search input with subtle icon micro-interaction
  - Table rows with hover transform + glow, mobile cards with entrance animation
  - Modal with blurred backdrop and smooth scale/slide
  - Skeleton shimmer implemented with CSS keyframes

  Drop into src/pages/Bookings.jsx and keep your existing Tailwind + framer-motion setup.
*/

/* ---------------- utility helpers ---------------- */
const money = (n) => {
  try {
    const num = typeof n === 'number' ? n : Number(n || 0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(isNaN(num) ? 0 : num);
  } catch (e) {
    return '₹0.00';
  }
};

const fmtTime = (t) => {
  try {
    if (!t) return '—';
    if (typeof t?.toDate === 'function') return t.toDate().toLocaleString();
    const d = new Date(t);
    if (!isNaN(d)) return d.toLocaleString();
    return String(t);
  } catch {
    return String(t);
  }
};

/* ---------------- animated counter hook ---------------- */
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
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
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

/* ---------------- color map (concrete tailwind classes) ---------------- */
const COLOR_MAP = {
  indigo: { text: 'text-indigo-600', iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
  blue: { text: 'text-blue-600', iconBg: 'bg-blue-50', iconText: 'text-blue-600' },
  green: { text: 'text-green-600', iconBg: 'bg-green-50', iconText: 'text-green-600' },
  gray: { text: 'text-gray-700', iconBg: 'bg-gray-50', iconText: 'text-gray-700' },
};

/* ---------------- small UI pieces ---------------- */
const StatCard = ({ icon: Icon, title, value, color = 'indigo' }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.indigo;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, boxShadow: '0 12px 30px rgba(2,6,23,0.08)' }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="bg-white p-5 rounded-2xl shadow-lg flex items-center justify-between border border-transparent"
    >
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-3xl font-extrabold mt-1 ${c.text}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-full ${c.iconBg} ${c.iconText}`}>{Icon ? <Icon size={22} /> : null}</div>
    </motion.div>
  );
};

const StatusBadge = ({ status }) => {
  const base = 'px-3 py-1 inline-flex text-sm leading-5 font-medium rounded-full';
  const s = (status || '').toString().trim().toLowerCase();
  if (s === 'completed') return <span className={`${base} bg-green-100 text-green-800`}>Completed</span>;
  if (s === 'pending') return <span className={`${base} bg-gray-100 text-gray-700`}>Pending</span>;
  if (s === 'arrived') return <span className={`${base} bg-gray-100 text-gray-700`}>Arrived</span>;
  if (s === 'accepted') return <span className={`${base} bg-gray-100 text-gray-700`}>Accepted</span>;
  if (s === 'active') return <span className={`${base} bg-blue-100 text-blue-800`}>Active</span>;
  if (s === 'scheduled') return <span className={`${base} bg-yellow-100 text-yellow-800`}>Scheduled</span>;
  if (s === 'cancelled' || s === 'canceled') return <span className={`${base} bg-red-100 text-red-800`}>Cancelled</span>;
  return <span className={`${base} bg-gray-100 text-gray-700`}>{status}</span>;
};

/* skeleton shimmer (tailwind + custom keyframes) */
const Skeleton = ({ className = '' }) => (
  <div className={`rounded bg-gray-200 relative overflow-hidden ${className}`}>
    <div className="absolute inset-0 transform -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
  </div>
);

/* ---------------- ChatMessage (compact) ---------------- */
function ChatMessage({ chat }) {
  const [showRaw, setShowRaw] = useState(false);
  const copyRaw = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(chat.raw ?? {}, null, 2));
    } catch (e) {
      console.error(e);
      alert('Copy failed — check browser permissions.');
    }
  };

  return (
    <div className="bg-white p-3 rounded shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-700 mr-2">{chat.senderId ?? 'unknown'}</span>
              <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">{chat.senderRole ?? 'role?'}</span>
            </div>
            <div className="text-xs text-gray-400">{fmtTime(chat.timestamp)}</div>
          </div>

          <div className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">{chat.message ?? '—'}</div>

          <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
            <div>
              type: <span className="font-medium text-gray-700 ml-1">{chat.type ?? '—'}</span>
            </div>

            <button onClick={() => setShowRaw((s) => !s)} className="ml-auto text-xs text-indigo-600 hover:underline focus:outline-none">
              {showRaw ? 'Hide raw' : 'Show raw'}
            </button>

            <button onClick={copyRaw} className="text-xs text-gray-600 hover:text-gray-900 ml-2 focus:outline-none" title="Copy raw JSON">
              Copy raw
            </button>
          </div>

          {showRaw && <pre className="mt-2 text-xs p-2 bg-gray-900 text-gray-50 rounded max-h-48 overflow-auto">{JSON.stringify(chat.raw ?? {}, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- DetailsModal ---------------- */
function DetailsModal({ open, onClose, booking }) {
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [open]);

  const g = (path, fallback = null) => {
    if (!booking?.raw) return fallback;
    const parts = path.split('.');
    let cur = booking.raw;
    for (const p of parts) {
      if (cur == null) return fallback;
      cur = cur[p];
    }
    return cur ?? fallback;
  };

  useEffect(() => {
    if (!open || !booking?.id) {
      setChats([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    const chatCollectionRef = collection(db, 'BOOKINGS', booking.id, 'chat');
    let q;
    try {
      q = query(chatCollectionRef, orderBy('timestamp', 'asc'));
    } catch {
      try {
        q = query(chatCollectionRef, orderBy('createdAt', 'asc'));
      } catch {
        q = chatCollectionRef;
      }
    }

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            message: data?.message ?? data?.text ?? data?.msg ?? '',
            senderId: data?.senderId ?? data?.sender ?? data?.from ?? null,
            senderRole: data?.senderRole ?? data?.role ?? null,
            timestamp: data?.timestamp ?? data?.createdAt ?? data?.time ?? null,
            type: data?.type ?? null,
            raw: data,
          };
        });
        setChats(arr);
        setLoadingChats(false);
        setTimeout(() => {
          if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }, 60);
      },
      (err) => {
        console.error('chat onSnapshot error', err);
        setLoadingChats(false);
      }
    );

    return () => unsub();
  }, [open, booking?.id]);

  const bookingIdVal = booking?.bookingId ?? booking?.id ?? '—';
  const customerVal = booking?.customer ?? g('customerName') ?? g('customer') ?? g('customerId') ?? '—';
  const customerPhoneVal = g('customerMobileNumber') ?? g('customerMobile') ?? g('customerPhone') ?? '—';
  const driverVal = booking?.driver ?? g('driverName') ?? g('driver') ?? (g('driverId') ? 'Assigned' : 'Unassigned');
  const vehicleTypeVal = g('vehicleType') ?? g('vehicle') ?? '—';

  let amountValRaw = null;
  if (booking?.amount != null) amountValRaw = booking.amount;
  else if (g('amount') != null) amountValRaw = g('amount');
  else if (g('customerFare') != null) amountValRaw = g('customerFare');
  else if (g('totalAmount') != null) amountValRaw = g('totalAmount');
  const amountVal = typeof amountValRaw === 'number' ? money(amountValRaw) : (amountValRaw != null ? money(Number(amountValRaw)) : '—');

  const tipsRaw = g('tipsAmount') ?? g('tips') ?? null;
  const tipsVal = tipsRaw != null ? money(Number(tipsRaw)) : '—';
  const gstVal = g('gst') ?? '—';
  const paymentTypeVal = g('paymentType') ?? g('paymentMethod') ?? '—';

  const pickupVal = g('pickupAddress') ?? g('pickupLocation') ?? ((g('pickupLat') && g('pickupLng')) ? `${g('pickupLat')}, ${g('pickupLng')}` : '—');
  const dropVal = g('dropAddress') ?? g('dropLocation') ?? ((g('dropLat') && g('dropLng')) ? `${g('dropLat')}, ${g('dropLng')}` : '—');

  const bookingDateVal = booking?.date ?? (g('bookingDateTime') ?? g('bookingDate') ?? '—');

  const important = [
    { label: 'Booking ID', value: bookingIdVal, Icon: FiInfo },
    { label: 'Customer', value: customerVal, Icon: FiUsers },
    { label: 'Customer Phone', value: customerPhoneVal, Icon: FiPhone },
    { label: 'Driver', value: driverVal, Icon: FiUsers },
    { label: 'Vehicle Type', value: vehicleTypeVal, Icon: FiTag },
    { label: 'Amount (₹)', value: amountVal, Icon: FiDollarSign },
    { label: 'Tips', value: tipsVal, Icon: FiTag },
    { label: 'GST', value: gstVal, Icon: FiPercent },
    { label: 'Payment Type', value: paymentTypeVal, Icon: FiDollarSign },
    { label: 'Pickup', value: pickupVal, Icon: FiMapPin },
    { label: 'Drop', value: dropVal, Icon: FiMapPin },
    { label: 'Booking Date/Time', value: bookingDateVal, Icon: FiClock },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
          style={{ backdropFilter: 'blur(5px)' }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.22, type: 'spring', stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
            className="w-full max-w-4xl mx-4 bg-white rounded-3xl shadow-2xl z-50 ring-1 ring-gray-100 overflow-auto"
            style={{ maxHeight: '92vh' }}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 id="booking-modal-title" className="text-lg font-bold text-gray-900">Booking Details</h3>
                  <p className="text-sm text-gray-500 mt-1">Compact details + full chat (all fields shown)</p>
                </div>

                <button onClick={onClose} className="rounded p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-200" aria-label="Close">
                  <FiX size={18} />
                </button>
              </div>

              {!booking ? (
                <div className="mt-6 space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {important.map((f) => (
                      <div key={f.label} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex items-start gap-3">
                          {f.Icon && <div className="text-gray-400 mt-1"><f.Icon size={16} /></div>}
                          <div>
                            <div className="text-xs text-gray-500">{f.label}</div>
                            <div className="text-sm text-gray-900 break-words whitespace-pre-wrap">{f.value ?? '—'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Chats</h4>

                    <div ref={chatBoxRef} className="max-h-56 overflow-auto space-y-3 p-3 bg-gray-50 rounded border border-gray-100">
                      {loadingChats ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      ) : chats.length === 0 ? (
                        <div className="text-xs text-gray-500">No chat messages found for this booking.</div>
                      ) : (
                        chats.map((c) => <ChatMessage key={c.id} chat={c} />)
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Main Bookings ---------------- */
export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [highlightNew, setHighlightNew] = useState(null);

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
          let dateStr = '';
          if (data?.bookingDateTime && typeof data.bookingDateTime.toDate === 'function') dateStr = data.bookingDateTime.toDate().toLocaleString();
          else if (data?.bookingDateTime) dateStr = String(data.bookingDateTime);
          else if (data?.date && typeof data.date.toDate === 'function') dateStr = data.date.toDate().toLocaleString();
          else if (data?.date) dateStr = String(data.date);

          const rawAmount = data?.amount ?? data?.customerFare ?? data?.totalAmount ?? 0;
          const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount) || 0;
          const status = data?.status ?? data?.bookingStatus ?? data?.state ?? 'Unknown';

          return {
            id: d.id,
            bookingId: data?.bookingId ?? d.id,
            customer: data?.customerName ?? data?.customer ?? (data?.customerId ? data.customerId : 'Unknown'),
            driver: data?.driverName ?? data?.driver ?? (data?.driverId ? 'Assigned' : 'Unassigned'),
            date: dateStr || '—',
            amount,
            status,
            raw: data,
          };
        });

        // detect newly-added doc (simple heuristic: first doc id has changed)
        if (arr.length > 0 && bookings.length > 0 && arr[0].id !== bookings[0]?.id) {
          setHighlightNew(arr[0].id);
          setTimeout(() => setHighlightNew(null), 2200);
        }

        setBookings(arr);
        setLoading(false);
      },
      (err) => {
        console.error('bookings onSnapshot error', err);
        setLoading(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // stats (animated)
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter((b) => (b.status || '').toString().toLowerCase() === 'active').length;
  const totalRevenueNumber = bookings.filter((b) => (b.status || '').toString().toLowerCase() === 'completed').reduce((s, b) => s + (Number(b.amount || 0)), 0);

  const animatedTotal = useAnimatedNumber(totalBookings, 600);
  const animatedActive = useAnimatedNumber(activeBookings, 600);
  const animatedRevenue = useAnimatedNumber(totalRevenueNumber, 700);

  const filteredBookings = bookings.filter((booking) => {
    if (filterStatus !== 'All') {
      const bs = (booking.status || '').toString().toLowerCase();
      if (filterStatus.toLowerCase() !== bs) return false;
    }
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return ((booking.bookingId || booking.id).toString().toLowerCase().includes(s) || (booking.customer || '').toLowerCase().includes(s) || (booking.driver || '').toLowerCase().includes(s));
  });

  const openDetails = (id) => {
    const b = bookings.find((x) => x.id === id);
    setSelected(b || null);
    setModalOpen(true);
  };

  const handleCancelBooking = async (id) => {
    const ok = window.confirm(`Cancel booking ${id}?`);
    if (!ok) return;
    try {
      const ref = firestoreDoc(db, 'BOOKINGS', id);
      await updateDoc(ref, { status: 'Cancelled' });
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      alert('Failed to cancel booking — see console.');
    }
  };

  /* framer variants */
  const listVariant = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
  const itemVariant = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 6 } };

  /* controls for animated search micro-interaction */
  const searchControls = useAnimation();
  const onSearchFocus = () => searchControls.start({ scale: 1.03 });
  const onSearchBlur = () => searchControls.start({ scale: 1 });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-6 sm:p-8">
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%);} 100%{transform: translateX(100%);} }
        .animate-shimmer { animation: shimmer 1.2s linear infinite; }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="w-full lg:w-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={FiUsers} title="Total Bookings" value={animatedTotal} color="indigo" />
              <StatCard icon={FiClock} title="Active Now" value={animatedActive} color="blue" />
              <StatCard icon={FiDollarSign} title="Revenue (Completed)" value={<span className="text-2xl">{money(animatedRevenue)}</span>} color="green" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <motion.div animate={searchControls} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="bg-white p-4 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full md:max-w-xl">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition ease-out"
              type="search"
              placeholder="Search by ID, customer or driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:bg-gray-100 rounded focus:outline-none" aria-label="Clear search">
                <FiX size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center text-sm text-gray-600 gap-2">
              <FiFilter />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200">
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Arrived">Arrived</option>
                <option value="Accepted">Accepted</option>
                <option value="Active">Active</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Mobile card list */}
        <AnimatePresence>
          <motion.div variants={listVariant} initial="hidden" animate="visible" className="space-y-4 md:hidden">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <motion.div key={i} variants={itemVariant} className="bg-white p-4 rounded-2xl shadow border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">Booking ID</div>
                        <div className="font-semibold text-gray-900">—</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Amount</div>
                        <div className="font-semibold">—</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-gray-500 flex items-center justify-between">
                      <div>Customer — —</div>
                      <div>
                        <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">—</div>
                      </div>
                    </div>
                  </motion.div>
                ))
              : filteredBookings.length > 0
              ? filteredBookings.map((b) => (
                  <motion.div key={b.id} variants={itemVariant} whileHover={{ scale: 1.01 }} className={`bg-white p-4 rounded-2xl shadow border border-gray-100 ${highlightNew === b.id ? 'ring-2 ring-indigo-200' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-gray-400">Booking ID</div>
                        <div className="font-semibold text-indigo-600">{b.bookingId || b.id}</div>

                        <div className="mt-2 text-xs text-gray-400">Customer</div>
                        <div className="text-sm text-gray-900">{b.customer}</div>

                        <div className="mt-2 text-xs text-gray-400">Driver</div>
                        <div className="text-sm text-gray-700">{b.driver}</div>
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="text-xs text-gray-400">Amount</div>
                        <div className="font-semibold text-gray-900">{money(b.amount || 0)}</div>

                        <div className="mt-3"><StatusBadge status={b.status} /></div>

                        <div className="mt-4 flex items-center gap-2">
                          <button onClick={() => openDetails(b.id)} className="p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                            <FiEye />
                          </button>
                          {b.status && !['completed', 'cancelled'].includes((b.status + '').toLowerCase()) && (
                            <button onClick={() => handleCancelBooking(b.id)} className="px-3 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 text-sm">
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              : (
                <div className="text-center text-gray-500 p-6 bg-white rounded-2xl border border-gray-100">No bookings found.</div>
              )}
          </motion.div>
        </AnimatePresence>

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-800">Recent Bookings {loading ? <span className="text-sm text-gray-500"> — loading…</span> : `(${filteredBookings.length})`}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                  <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="w-1/8 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                  <th className="w-1/8 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="w-1/8 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-100">
                <AnimatePresence>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <motion.tr key={`skeleton-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-gray-50">
                        <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-36" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                      </motion.tr>
                    ))
                  ) : filteredBookings.length > 0 ? (
                    filteredBookings.map((booking) => (
                      <motion.tr
                        key={booking.id}
                        variants={itemVariant}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        whileHover={{ scale: 1.01, boxShadow: '0 8px 30px rgba(2,6,23,0.06)' }}
                        transition={{ duration: 0.12 }}
                        className={`bg-white ${highlightNew === booking.id ? 'ring-2 ring-indigo-200' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 break-words max-w-[12rem]">{booking.bookingId || booking.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.customer}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.driver}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{money(booking.amount || 0)}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={booking.status} /></td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                          <button onClick={() => openDetails(booking.id)} className="p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-200" aria-label={`View booking ${booking.bookingId || booking.id}`} title="View details">
                            <FiEye size={18} />
                          </button>

                          {booking.status && booking.status.toString().toLowerCase() !== 'completed' && booking.status.toString().toLowerCase() !== 'cancelled' && (
                            <button onClick={() => handleCancelBooking(booking.id)} className="ml-2 px-3 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-100">Cancel</button>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <td colSpan="7" className="px-6 py-10 text-center text-gray-500">No bookings found matching your criteria.</td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        <DetailsModal open={modalOpen} onClose={() => setModalOpen(false)} booking={selected} />
      </div>
    </div>
  );
}
