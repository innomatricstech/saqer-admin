// src/pages/Bookings.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  FiSearch,
  FiFilter,
  FiUsers,
  FiDollarSign,
  FiEye,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiTrendingUp,
  FiToggleLeft,
  FiToggleRight,
  FiCopy,
  FiChevronLeft,
  FiChevronRight,
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
// Changed locale & currency to AED
const money = (n) => {
  try {
    const num = typeof n === 'number' ? n : Number(n || 0);
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 2 }).format(isNaN(num) ? 0 : num);
  } catch {
    return 'AED 0.00';
  }
};

function useAnimatedNumber(target, duration = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = Number(val) || 0;
    const to = Number(target) || 0;
    if (to === from) {
      setVal(to);
      return;
    }
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

/* ---------------- UI primitives ---------------- */
const StatCard = ({ Icon, title, value, accent = 'indigo', children }) => {
  const accentMap = {
    indigo: 'from-indigo-500 to-indigo-400',
    blue: 'from-blue-500 to-blue-400',
    green: 'from-green-500 to-green-400',
    yellow: 'from-yellow-400 to-orange-400',
  }[accent] || 'from-indigo-500 to-indigo-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, boxShadow: '0 18px 40px rgba(2,6,23,0.06)' }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="bg-white rounded-xl p-4 flex items-start justify-between"
    >
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">{title}</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
          </div>
          <div className={`p-2.5 rounded-lg bg-gradient-to-br ${accentMap} text-white shadow flex items-center justify-center`}>
            {Icon ? <Icon size={18} /> : null}
          </div>
        </div>
        {children}
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

/* ---------------- Utilities for JSON viewer ---------------- */
function formatFirestoreTimestamp(val) {
  if (!val) return null;
  if (typeof val?.toDate === 'function') {
    try {
      const d = val.toDate();
      return d.toLocaleString();
    } catch {}
  }
  if (typeof val === 'object' && typeof val.seconds === 'number') {
    try {
      return new Date(val.seconds * 1000).toLocaleString();
    } catch {}
  }
  return null;
}
function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v) && !(typeof v?.toDate === 'function');
}
function prettifyKey(k) {
  if (!k) return '';
  // handle snake_case and camelCase and UPPER_SNAKE
  const s = String(k).replace(/_/g, ' ');
  const spaced = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced
    .split(' ')
    .map((p) => (p.length === 0 ? '' : p[0].toUpperCase() + p.slice(1).toLowerCase()))
    .join(' ');
}

/* ---------------- Recursive JSON viewer component ---------------- */
function RenderValue({ value, keyName, depth = 0, expandAll = false, searchTerm = '' }) {
  const [collapsed, setCollapsed] = useState(depth >= 2 && !expandAll);
  const indent = Math.min(depth * 10, 72);

  useEffect(() => {
    // expandAll overrides
    if (expandAll) {
      setCollapsed(false);
      return;
    }
    setCollapsed(depth >= 2);
  }, [expandAll, depth]);

  // auto-expand when search matches content
  useEffect(() => {
    if (!searchTerm) return;
    try {
      const json = JSON.stringify(value);
      if (json.toLowerCase().includes(searchTerm.toLowerCase())) {
        setCollapsed(false);
      }
    } catch {}
  }, [searchTerm, value]);

  const tsFormatted = formatFirestoreTimestamp(value);

  if (tsFormatted) {
    return (
      <div style={{ paddingLeft: indent }} className="py-1">
        <div className="text-xs text-gray-400">{prettifyKey(keyName)}</div>
        <div className="text-sm text-gray-800">{tsFormatted}</div>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div style={{ paddingLeft: indent }} className="py-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed((s) => !s)}
            className="text-xs text-gray-500 p-1 rounded hover:bg-gray-100"
            aria-expanded={!collapsed}
          >
            {collapsed ? '+' : '–'}
          </button>
          <div className="text-xs text-gray-500">{prettifyKey(keyName)} <span className="text-gray-400">[Array · {value.length}]</span></div>
        </div>

        {!collapsed && (
          <div className="mt-2 space-y-1">
            {value.map((v, i) => (
              <RenderValue key={i} keyName={`${i}`} value={v} depth={depth + 1} expandAll={expandAll} searchTerm={searchTerm} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    return (
      <div style={{ paddingLeft: indent }} className="py-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed((s) => !s)}
            className="text-xs text-gray-500 p-1 rounded hover:bg-gray-100"
            aria-expanded={!collapsed}
          >
            {collapsed ? '+' : '–'}
          </button>
          <div className="text-xs text-gray-500">{prettifyKey(keyName)} <span className="text-gray-400">{'{ }'}</span></div>
        </div>

        {!collapsed && (
          <div className="mt-2 space-y-1">
            {keys.length === 0 ? (
              <div className="text-xs text-gray-400 pl-6">empty</div>
            ) : (
              keys.map((k) => (
                <RenderValue key={k} keyName={k} value={value[k]} depth={depth + 1} expandAll={expandAll} searchTerm={searchTerm} />
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // primitive
  const display = value === null ? 'null' : typeof value === 'boolean' ? String(value) : String(value);
  return (
    <div style={{ paddingLeft: indent }} className="py-1 flex items-start gap-3">
      <div className="text-xs text-gray-400 w-36 sm:w-44 break-words">{prettifyKey(keyName)}</div>
      <div className="text-sm text-gray-800 break-words">{display}</div>
    </div>
  );
}

/* ---------------- SlidePanel ---------------- */
function SlidePanel({ open, booking, onClose, onCancel }) {
  const [expandAll, setExpandAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredKeys, setFilteredKeys] = useState([]);

  useEffect(() => {
    if (!booking?.raw) {
      setFilteredKeys([]);
      return;
    }
    const topKeys = Object.keys(booking.raw);
    setFilteredKeys(topKeys);
  }, [booking]);

  useEffect(() => {
    if (!booking?.raw) {
      setFilteredKeys([]);
      return;
    }
    if (!searchTerm) {
      setFilteredKeys(Object.keys(booking.raw));
      return;
    }
    const s = searchTerm.toLowerCase();
    const keys = Object.keys(booking.raw).filter((k) => {
      try {
        const json = JSON.stringify({ [k]: booking.raw[k] });
        return json.toLowerCase().includes(s) || k.toLowerCase().includes(s);
      } catch {
        return String(k).toLowerCase().includes(s);
      }
    });
    setFilteredKeys(keys);
  }, [searchTerm, booking]);

  // copy JSON to clipboard
  const copyToClipboard = async () => {
    try {
      const json = JSON.stringify(booking.raw ?? {}, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(json);
        alert('JSON copied to clipboard');
      } else {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = json;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('JSON copied to clipboard');
      }
    } catch (err) {
      console.error('copy failed', err);
      alert('Copy failed');
    }
  };

  useEffect(() => {
    if (!open) {
      setExpandAll(false);
      setSearchTerm('');
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed right-0 top-0 h-full w-full md:w-[560px] bg-white shadow-lg z-50 border-l border-gray-100 overflow-auto"
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
                  <button onClick={onClose} type="button" className="p-2 rounded hover:bg-gray-100"><FiX /></button>
                </div>
              </div>

              {!booking ? (
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="mt-4 space-y-3 text-sm text-gray-800">
                  {/* Summary header */}
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-100 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Customer</div>
                      <div className="text-sm text-gray-900">{booking.customer}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-500">Amount</div>
                      <div className="text-sm font-semibold">{money(booking.amount)}</div>
                      <div className="mt-1"><StatusBadge status={booking.status} /></div>
                    </div>
                  </div>

                  {/* Controls: search, expand/fold, copy */}
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <div className="flex-1 relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search inside document keys/values"
                        className="w-full pl-9 pr-10 py-2 text-sm border border-gray-200 rounded-lg"
                      />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:bg-gray-100 rounded">
                          <FiX />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandAll(true)}
                        className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded text-sm inline-flex items-center gap-2"
                      >
                        <FiChevronDown /> Expand All
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandAll(false)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm inline-flex items-center gap-2"
                      >
                        <FiChevronLeft /> Fold All
                      </button>
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="px-3 py-2 bg-emerald-600 text-white rounded text-sm inline-flex items-center gap-2"
                        title="Copy raw JSON to clipboard"
                      >
                        <FiCopy /> Copy JSON
                      </button>
                    </div>
                  </div>

                  {/* Raw viewer */}
                  <div className="bg-white p-3 rounded-md border border-gray-100">
                    <div className="text-xs text-gray-400 mb-2">Full document (raw) — collapsible</div>

                    <div className="text-sm space-y-1">
                      {!booking.raw || Object.keys(booking.raw).length === 0 ? (
                        <div className="text-xs text-gray-400">No raw document</div>
                      ) : (
                        // render only filtered top-level keys (search-aware)
                        (filteredKeys.length === 0 ? Object.keys(booking.raw) : filteredKeys).map((k) => (
                          <RenderValue
                            key={k}
                            keyName={k}
                            value={booking.raw[k]}
                            depth={0}
                            expandAll={expandAll}
                            searchTerm={searchTerm}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={copyToClipboard} className="flex-1 px-3 py-2 rounded bg-indigo-50 text-indigo-700 text-sm inline-flex items-center gap-2">
                      <FiCopy /> Copy JSON
                    </button>
                    <button type="button" onClick={() => onCancel(booking.id)} className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm">Cancel</button>
                  </div>

                  <div className="mt-2 text-xs text-gray-400">Created: {booking.raw?.createdAt?.toDate ? booking.raw.createdAt.toDate().toLocaleString() : booking.date}</div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Sparkline helper ---------------- */
function Sparkline({ data = [], width = 120, height = 36, strokeWidth = 2 }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const len = data.length;
  if (len === 0) return <div className="text-xs text-gray-400">No data</div>;

  const points = data;
  const step = width / Math.max(1, points.length - 1);
  const coords = points.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return [x, y];
  });

  const path = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <defs>
        <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(99,102,241,0.18)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke="#6366f1" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c[0]} cy={c[1]} r={i === points.length - 1 ? 2.6 : 1.6} fill="#6366f1" />
      ))}
    </svg>
  );
}

/* ---------------- main component ---------------- */
export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [openCard, setOpenCard] = useState(null);

  const [slideBooking, setSlideBooking] = useState(null);
  const [slideOpen, setSlideOpen] = useState(false);

  const [todaysCount, setTodaysCount] = useState(0);
  const [todaysRevenue, setTodaysRevenue] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [dailyRevenue7, setDailyRevenue7] = useState([]);
  const [compareMode, setCompareMode] = useState('yesterday');

  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    setLoading(true);
    let qRef;
    try {
      qRef = query(collection(db, 'BOOKINGS'), orderBy('bookingDateTime', 'desc'));
    } catch {
      qRef = collection(db, 'BOOKINGS');
    }

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const arr = snap.docs.map((d) => {
          const data = d.data();
          const date = data?.bookingDateTime?.toDate?.()?.toLocaleString?.() ?? data?.date ?? '—';
          const amount = Number(data?.amount ?? data?.customerFare ?? data?.totalAmount ?? 0);
          const status = data?.status ?? data?.bookingStatus ?? 'Unknown';
          let bookingDate = null;
          const raw = data?.bookingDateTime ?? data?.createdAt ?? null;
          if (raw) {
            if (raw.seconds && typeof raw.seconds === 'number') {
              bookingDate = new Date(raw.seconds * 1000);
            } else {
              bookingDate = new Date(raw);
            }
          }
          return {
            id: d.id,
            bookingId: data?.bookingId ?? d.id,
            customer: data?.customerName ?? data?.customer ?? 'Unknown',
            driver: data?.driverName ?? data?.driver ?? 'Unassigned',
            date,
            amount,
            status,
            raw: data,
            bookingDate,
          };
        });

        const today = new Date();
        const todayStr = today.toDateString();

        let tCount = 0;
        let tRevenue = 0;
        let allCompletedRevenue = 0;

        const revMap = {};
        const DAYS = 7;
        for (let i = 0; i < DAYS; i++) {
          const d = new Date();
          d.setDate(today.getDate() - (DAYS - 1 - i));
          const key = d.toISOString().slice(0, 10);
          revMap[key] = 0;
        }

        for (const b of arr) {
          const amt = Number(b.amount || 0);
          if ((b.status || '').toLowerCase() === 'completed') {
            allCompletedRevenue += amt;
          }

          if (b.bookingDate && !isNaN(b.bookingDate.getTime()) && b.bookingDate.toDateString() === todayStr) {
            tCount++;
            tRevenue += amt;
          } else {
            if (!b.bookingDate && typeof b.date === 'string') {
              const parsed = new Date(b.date);
              if (!isNaN(parsed.getTime()) && parsed.toDateString() === todayStr) {
                tCount++;
                tRevenue += amt;
              }
            }
          }

          try {
            const dayKey = (b.bookingDate && !isNaN(b.bookingDate.getTime()))
              ? b.bookingDate.toISOString().slice(0,10)
              : (typeof b.date === 'string' ? (new Date(b.date)).toISOString().slice(0,10) : null);
            if (dayKey && revMap.hasOwnProperty(dayKey)) {
              revMap[dayKey] += amt;
            }
          } catch {}
        }

        const dailyArr = Object.keys(revMap).map((k) => revMap[k]);

        setBookings(arr);
        setTodaysCount(tCount);
        setTodaysRevenue(tRevenue);
        setTotalRevenue(allCompletedRevenue);
        setDailyRevenue7(dailyArr);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const animatedTotalOrders = useAnimatedNumber(bookings.length);
  const animatedTodaysCount = useAnimatedNumber(todaysCount);
  const animatedTodaysRevenue = useAnimatedNumber(Math.round(todaysRevenue));
  const animatedTotalRevenue = useAnimatedNumber(Math.round(totalRevenue));

  const compare = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const yKey = yesterday.toDateString();

    const weekStart = new Date(today); weekStart.setDate(today.getDate() - 7);

    let yesterdayRevenue = 0;
    let weekAgoRevenue = 0;

    for (const b of bookings) {
      const d = b.bookingDate && !isNaN(b.bookingDate?.getTime()) ? b.bookingDate : (typeof b.date === 'string' ? new Date(b.date) : null);
      if (!d || isNaN(d.getTime())) continue;
      const dStr = d.toDateString();
      const amt = Number(b.amount || 0);
      if (dStr === yKey) yesterdayRevenue += amt;
      if (d >= weekStart && d < today) weekAgoRevenue += amt;
    }
    return { yesterdayRevenue, weekAgoRevenue };
  }, [bookings]);

  const pctChange = useMemo(() => {
    if (compareMode === 'yesterday') {
      const prev = compare.yesterdayRevenue || 0;
      const curr = todaysRevenue || 0;
      if (prev === 0 && curr === 0) return { pct: 0, dir: 'same' };
      if (prev === 0) return { pct: 100, dir: 'up' };
      const diff = ((curr - prev) / Math.abs(prev)) * 100;
      return { pct: Math.round(diff), dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' };
    } else {
      const days = 7;
      const avg = (compare.weekAgoRevenue || 0) / days;
      const curr = todaysRevenue || 0;
      if (avg === 0 && curr === 0) return { pct: 0, dir: 'same' };
      if (avg === 0) return { pct: 100, dir: 'up' };
      const diff = ((curr - avg) / Math.abs(avg)) * 100;
      return { pct: Math.round(diff), dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' };
    }
  }, [compare, compareMode, todaysRevenue]);

  const filtered = bookings.filter((b) => {
    if (filterStatus !== 'All' && (String(b.status || '').toLowerCase() !== String(filterStatus || '').toLowerCase())) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (b.bookingId + b.customer + b.driver).toLowerCase().includes(s);
  });

  const openSlide = (b) => {
    setSlideBooking(b);
    setSlideOpen(true);
    setOpenCard(null);
    try { document.documentElement.style.overflow = 'hidden'; } catch {}
  };

  const closeSlide = () => {
    setSlideOpen(false);
    setTimeout(() => {
      setSlideBooking(null);
      try { document.documentElement.style.overflow = ''; } catch {}
    }, 260);
  };

  const handleCancelBooking = async (id) => {
    const ok = window.confirm('Cancel this booking?');
    if (!ok) return;
    try {
      const ref = firestoreDoc(db, 'BOOKINGS', id);
      await updateDoc(ref, { status: 'Cancelled' });
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

      {/* Top header */}
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
                <button onClick={() => setSearch('')} type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:bg-gray-100 rounded">
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
        <StatCard Icon={FiUsers} title="Total Orders" value={animatedTotalOrders} accent="indigo" />

        <StatCard Icon={FiCalendar} title="Today's Orders" value={animatedTodaysCount} accent="blue">
          <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
            <FiTrendingUp />
            <span>{compareMode === 'yesterday' ? 'vs Yesterday' : 'vs Last 7-day avg'}</span>
            <div className={`ml-auto text-sm ${pctChange.dir === 'up' ? 'text-green-600' : pctChange.dir === 'down' ? 'text-rose-600' : 'text-gray-600'}`}>
              {pctChange.dir === 'up' ? '+' : pctChange.dir === 'down' ? '' : ''}{pctChange.pct}% {pctChange.dir === 'up' ? '↑' : pctChange.dir === 'down' ? '↓' : ''}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setCompareMode('yesterday')}
              className={`px-2 py-1 text-xs rounded ${compareMode === 'yesterday' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setCompareMode('week')}
              className={`px-2 py-1 text-xs rounded ${compareMode === 'week' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Last 7-day avg
            </button>
          </div>
        </StatCard>

        <StatCard Icon={FiDollarSign} title="Total Revenue (Completed)" value={money(animatedTotalRevenue)} accent="green">
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-gray-400">Today's revenue</div>
              <div className="text-sm font-semibold">{money(animatedTodaysRevenue)}</div>
            </div>
            <div className="w-32">
              <Sparkline data={dailyRevenue7} width={120} height={36} />
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
            <FiToggleLeft />
            <span>Realtime updates</span>
            <span className="ml-auto text-xs text-gray-400">Auto refresh from Firestore</span>
          </div>
        </StatCard>
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
                                <button title="View" type="button" onClick={() => openSlide(b)} className="p-2 rounded hover:bg-gray-100"><FiEye /></button>
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

            <SlidePanel open={slideOpen} booking={slideBooking} onClose={closeSlide} onCancel={handleCancelBooking} />
          </>
        ) : (
          <div ref={mobileRef} className="mt-3 space-y-3">
            <AnimatePresence>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <motion.div key={i} variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }} initial="hidden" animate="visible" exit="exit" className="bg-white p-3 rounded-xl shadow border border-gray-100">
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
                              <div className="text-[10px] text-gray-400">Booking ID</div>
                              <div className="text-indigo-600 font-semibold text-xs">{b.bookingId}</div>
                            </div>

                            <div className="text-right">
                              <div className="text-[10px] text-gray-400">Amount</div>
                              <div className="font-semibold text-xs">{money(b.amount)}</div>
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-gray-700">
                            <div><span className="text-[10px] text-gray-400">Customer: </span>{b.customer}</div>
                            <div className="mt-1"><span className="text-[10px] text-gray-400">Driver: </span>{b.driver}</div>
                            <div className="mt-1"><span className="text-[10px] text-gray-400">Date: </span>{b.date}</div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-start gap-2">
                          <StatusBadge status={b.status} />
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setOpenCard((prev) => (prev === b.id ? null : b.id))}
                              className="p-1 rounded-full hover:bg-gray-100"
                              aria-expanded={isOpen}
                              aria-controls={`card-${b.id}`}
                            >
                              {isOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                            </button>

                            <button
                              type="button"
                              onClick={() => openSlide(b)}
                              className="mt-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs"
                            >
                              View
                            </button>
                          </div>
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
                            <div className="text-xs text-gray-700 space-y-2">
                              <div><strong className="text-[10px]">Status:</strong> {b.status}</div>
                              <div><strong className="text-[10px]">Driver:</strong> {b.driver}</div>
                              <div><strong className="text-[10px]">Booking ID:</strong> {b.bookingId}</div>
                              <div><strong className="text-[10px]">Customer:</strong> {b.customer}</div>
                              <div><strong className="text-[10px]">Date:</strong> {b.date}</div>
                              <div><strong className="text-[10px]">Amount:</strong> {money(b.amount)}</div>
                              <div className="mt-2 flex gap-2">
                                <button type="button" onClick={() => openSlide(b)} className="flex-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded">View Details</button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('Cancel this booking?')) handleCancelBooking(b.id);
                                  }}
                                  className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded"
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
