// src/pages/DriverRequest.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * DriverRequest modal with list + tabbed details and status badges
 * Props:
 *  - open: boolean
 *  - onClose: fn
 *  - driver: object (selected driver) - may be null
 */
export default function DriverRequest({ open, onClose, driver }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReq, setActiveReq] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const q = query(collection(db, "driverRequest"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRequests(arr);
        setLoading(false);

        // If the modal opened for a specific driver, auto-select the first matching request.
        if (driver) {
          const match = arr.find(
            (r) =>
              (r.driverId && driver.id && r.driverId.toLowerCase() === driver.id.toLowerCase()) ||
              (r.driverName && driver.name && r.driverName.toLowerCase().includes(driver.name.toLowerCase()))
          );
          setActiveReq(match || null);
        } else {
          // when no driver supplied, select the first doc if nothing selected yet
          setActiveReq((cur) => cur || arr[0] || null);
        }
      },
      (err) => {
        console.error("driverRequest onSnapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, driver]);

  // Filter list by selected driver (if provided) — otherwise show all requests
  const listFiltered = requests.filter((r) => {
    if (!driver) return true;
    if (r.driverId && driver.id) return r.driverId.toLowerCase() === driver.id.toLowerCase();
    if (r.driverName && driver.name) return r.driverName.toLowerCase().includes(driver.name.toLowerCase());
    return false;
  });

  // Keep a safe formatter
  const formatValue = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "object") {
      if (v.seconds || v._seconds) {
        const s = v.seconds ?? v._seconds;
        return new Date(s * 1000).toLocaleString();
      }
      try {
        return JSON.stringify(v, null, 2);
      } catch {
        return String(v);
      }
    }
    return String(v);
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: Icons.Eye },
    { key: "customer", label: "Customer", icon: Icons.User },
    { key: "driver", label: "Driver", icon: Icons.Truck },
    { key: "route", label: "Route", icon: Icons.MapPin },
    { key: "feedback", label: "Feedback", icon: Icons.Star },
  ];

  const s = (obj, key) => (obj && obj[key] !== undefined ? obj[key] : null);

  useEffect(() => {
    setActiveTab("overview");
  }, [activeReq?.id]);

  // Status pill helper
  function StatusPill({ status }) {
    const st = (status || "").toString();
    let classes = "inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-semibold";
    let Icon = Icons.Circle;
    switch (st.toLowerCase()) {
      case "completed":
        classes += " bg-emerald-100 text-emerald-700";
        Icon = Icons.CheckCircle;
        break;
      case "on-trip":
      case "ongoing":
        classes += " bg-sky-100 text-sky-700";
        Icon = Icons.Activity;
        break;
      case "pending":
      case "requested":
        classes += " bg-amber-100 text-amber-800";
        Icon = Icons.Clock;
        break;
      case "cancelled":
      case "rejected":
        classes += " bg-rose-100 text-rose-700";
        Icon = Icons.XCircle;
        break;
      case "scheduled":
      case "accepted":
        classes += " bg-indigo-100 text-indigo-700";
        Icon = Icons.Calendar;
        break;
      default:
        classes += " bg-slate-100 text-slate-700";
        Icon = Icons.Flag;
    }
    return (
      <span className={classes} title={st}>
        <Icon size={14} />
        <span className="capitalize">{st || "—"}</span>
      </span>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50"
            onClick={onClose}
          />

          {/* Modal container */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.22 }}
            className="fixed z-60 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {driver ? (driver.name || "?").charAt(0).toUpperCase() : "R"}
                </div>
                <div>
                  <div className="text-lg font-semibold">{driver ? driver.name : "Driver Requests"}</div>
                  <div className="text-sm text-slate-500">{driver ? driver.email : `${listFiltered.length} total requests`}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-slate-500 mr-2 hidden sm:block">
                  Showing {listFiltered.length} / {requests.length}
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100" aria-label="Close driver requests">
                  <Icons.X />
                </button>
              </div>
            </div>

            {/* Content: left list + right tabbed area */}
            <div className="flex flex-col lg:flex-row">
              {/* Left list: NOTE -> use listFiltered (only matching driver when driver prop exists) */}
              <div className="w-full lg:w-1/3 border-r max-h-[68vh] overflow-y-auto bg-slate-50 p-4">
                {loading ? (
                  <div className="text-center py-12 text-slate-400">
                    <Icons.Loader2 className="animate-spin mx-auto mb-2" />
                    Loading...
                  </div>
                ) : listFiltered.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Icons.Inbox className="mx-auto mb-2" />
                    {driver ? "No requests for this driver." : "No requests."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listFiltered.map((req) => {
                      const isMatch =
                        driver &&
                        ((req.driverId && driver.id && req.driverId.toLowerCase() === driver.id.toLowerCase()) ||
                          (req.driverName && driver.name && req.driverName.toLowerCase().includes(driver.name.toLowerCase())));
                      const isActive = activeReq && activeReq.id === req.id;
                      return (
                        <button
                          key={req.id}
                          onClick={() => setActiveReq(req)}
                          className={`w-full text-left p-3 rounded-lg transition-shadow flex items-start gap-3 ${isActive ? "bg-white shadow" : "hover:bg-white/60"}`}
                        >
                          <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 font-semibold flex-shrink-0">
                            {req.customerName ? req.customerName.split(" ").map(s => s[0]).slice(0,2).join("") : "C"}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-slate-800 truncate">{req.customerName || req.bookingId || req.id}</div>
                              <div className="text-xs text-slate-400">{req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleString() : "-"}</div>
                            </div>

                            <div className="text-xs text-slate-500 mt-1 truncate">
                              {req.pickupLocation?.address ? `${req.pickupLocation.address} → ${req.dropOfLocation?.address || "—"}` : (req.status || "—")}
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              {isMatch && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Matches driver</span>}
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{req.distanceinKM ? `${Number(req.distanceinKM).toFixed(2)} km` : "—"}</span>
                              <span className="text-xs text-slate-400 ml-auto">{req.fare ? `AED ${Number(req.fare).toFixed(2)}` : "-"}</span>
                            </div>

                            <div className="mt-2">
                              <StatusPill status={req.status} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Tabbed detail */}
              <div className="w-full lg:w-2/3 p-6 max-h-[68vh] overflow-y-auto">
                {!activeReq ? (
                  <div className="text-center text-slate-400 py-16">
                    <Icons.Inbox className="mx-auto mb-3" />
                    Select a request to view details
                  </div>
                ) : (
                  <>
                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto">
                      {tabs.map((t) => {
                        const Icon = t.icon;
                        const active = activeTab === t.key;
                        return (
                          <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors whitespace-nowrap ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                            aria-current={active ? "true" : "false"}
                          >
                            <Icon size={14} />
                            <span className="text-sm">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="bg-white border rounded-lg shadow-sm p-5">
                      <AnimatePresence mode="wait">
                        {activeTab === "overview" && (
                          <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-lg font-semibold text-slate-800 mb-1">Booking Overview</h4>
                                <div className="text-sm text-slate-600 mb-3">{activeReq.vehicleType || "—"}</div>

                                <div className="text-sm text-slate-700 space-y-1">
                                  <div><strong>Booking ID:</strong> {activeReq.bookingId || activeReq.id}</div>
                                  <div className="flex items-center gap-2"><strong>Status:</strong> <StatusPill status={activeReq.status} /></div>
                                  <div><strong>Fare:</strong> {activeReq.fare ? `AED ${Number(activeReq.fare).toFixed(2)}` : "—"}</div>
                                  <div><strong>Created:</strong> {formatValue(activeReq.createdAt)}</div>
                                </div>
                              </div>

                              <div className="text-right text-sm text-slate-500">
                                <div>{activeReq.distanceinKM ? `${Number(activeReq.distanceinKM).toFixed(2)} km` : "—"}</div>
                                <div className="mt-2">
                                  <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs">{activeReq.status || "—"}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <h5 className="text-sm font-semibold text-slate-700 mb-1">Pickup</h5>
                                <div className="text-sm text-slate-600">{activeReq.pickupLocation?.address || "—"}</div>
                                <div className="text-xs text-slate-400 mt-1">Lat: {s(activeReq.pickupLocation, "latitude") ?? "—"} • Lng: {s(activeReq.pickupLocation, "longitude") ?? "—"}</div>
                              </div>

                              <div>
                                <h5 className="text-sm font-semibold text-slate-700 mb-1">Drop</h5>
                                <div className="text-sm text-slate-600">{activeReq.dropOfLocation?.address || "—"}</div>
                                <div className="text-xs text-slate-400 mt-1">Lat: {s(activeReq.dropOfLocation, "latitude") ?? "—"} • Lng: {s(activeReq.dropOfLocation, "longitude") ?? "—"}</div>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {activeTab === "customer" && (
                          <motion.div key="customer" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                            <h4 className="text-lg font-semibold text-slate-800 mb-3">Customer Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                              <div><strong>Name:</strong> {activeReq.customerName || "—"}</div>
                              <div><strong>ID:</strong> {activeReq.customerId || "—"}</div>
                              <div><strong>Mobile:</strong> {activeReq.customerMobileNumber || "—"}</div>
                              <div><strong>FCM:</strong> <div className="break-words text-xs text-slate-500">{activeReq.customerFcm || "—"}</div></div>
                            </div>
                          </motion.div>
                        )}

                        {activeTab === "driver" && (
                          <motion.div key="driver" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                            <h4 className="text-lg font-semibold text-slate-800 mb-3">Driver Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
                              <div><strong>Name:</strong> {activeReq.driverName || "—"}</div>
                              <div><strong>ID:</strong> {activeReq.driverId || "—"}</div>
                              <div><strong>Vehicle No:</strong> {activeReq.driverVehicleNumber || "—"}</div>
                              <div><strong>Payment Confirmed:</strong> {String(activeReq.driverPaymentConfirmed ?? "—")}</div>
                              <div><strong>Driver FCM:</strong> <div className="break-words text-xs text-slate-500">{activeReq.driverFcm || "—"}</div></div>
                              <div><strong>Lat/Lng:</strong> {activeReq.driverLatitude ?? "—"} , {activeReq.driverLongitude ?? "—"}</div>
                            </div>
                          </motion.div>
                        )}

                        {activeTab === "route" && (
                          <motion.div key="route" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                            <h4 className="text-lg font-semibold text-slate-800 mb-3">Route & Ride Info</h4>
                            <div className="text-sm text-slate-700 space-y-2">
                              <p><strong>Pickup:</strong> {activeReq.pickupLocation?.address || "—"}</p>
                              <p><strong>Drop:</strong> {activeReq.dropOfLocation?.address || "—"}</p>
                              <p><strong>Duration (mins):</strong> {activeReq.durationinMinutes ?? "—"}</p>
                              <p><strong>End Ride Reason:</strong> {activeReq.endRideReason || "—"}</p>
                              <p><strong>Drop Time:</strong> {formatValue(activeReq.dropDateTime)}</p>
                            </div>
                          </motion.div>
                        )}

                        {activeTab === "feedback" && (
                          <motion.div key="feedback" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                            <h4 className="text-lg font-semibold text-slate-800 mb-3">Feedback</h4>
                            {activeReq.feedback ? (
                              <div className="text-sm text-slate-700 space-y-2">
                                <div><strong>Rider ID:</strong> {activeReq.feedback.bookingRiderId || "—"}</div>
                                <div><strong>Rating:</strong> {activeReq.feedback.starRating ?? "—"}</div>
                                <div><strong>Feedback Text:</strong> {activeReq.feedback.feedbackText || "—"}</div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500">No feedback available.</div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* footer actions */}
                    <div className="mt-4 flex items-center justify-end gap-3">
                      <a className="text-indigo-600 text-sm hover:underline" href={activeReq.bookingId ? `/#/bookings/${activeReq.bookingId}` : "#"} target="_blank" rel="noreferrer">
                        View Booking
                      </a>
                      <button onClick={() => { navigator.clipboard?.writeText(activeReq.driverId || ""); alert("Driver ID copied to clipboard"); }} className="px-3 py-1 rounded-md bg-slate-100 text-sm">
                        Copy Driver ID
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-slate-50 text-right">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white border hover:bg-slate-100">
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
