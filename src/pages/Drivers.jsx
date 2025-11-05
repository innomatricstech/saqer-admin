import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* Small gradient generator for avatars */
function nameToGradient(name) {
  const grads = [
    "from-indigo-500 to-purple-500",
    "from-rose-400 to-orange-400",
    "from-emerald-400 to-teal-500",
    "from-yellow-400 to-red-400",
    "from-sky-400 to-indigo-600",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i);
  return grads[Math.abs(h) % grads.length];
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Replace with fetch/Axios from your backend
    const sample = [
      { id: 1, name: "Ravi Kumar", phone: "9876543210", email: "ravi@drivers.com", vehicle: "Toyota Innova", plate: "KA01 AB1234", status: "Active", joined: "2024-02-01", trips: 124, notes: "Top-rated driver" },
      { id: 2, name: "Sana Ahmed", phone: "9123456780", email: "sana@drivers.com", vehicle: "Suzuki Dzire", plate: "KA05 XY9876", status: "On Leave", joined: "2023-11-10", trips: 88, notes: "Prefers morning shifts" },
      { id: 3, name: "Vikram Singh", phone: "9988776655", email: "vikram@drivers.com", vehicle: "Honda City", plate: "KA03 GH5555", status: "Active", joined: "2024-06-15", trips: 43, notes: "" },
      { id: 4, name: "Meera Joshi", phone: "9765432101", email: "meera@drivers.com", vehicle: "Hyundai Verna", plate: "KA07 CD4444", status: "Suspended", joined: "2022-08-20", trips: 210, notes: "Under review" },
    ];
    setDrivers(sample);
  }, []);

  const filtered = drivers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search) ||
    d.vehicle.toLowerCase().includes(search.toLowerCase()) ||
    d.plate.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id) => {
    if (confirm("Delete driver? This cannot be undone.")) {
      setDrivers((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const toggleStatus = (id) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: d.status === "Active" ? "Suspended" : "Active" } : d))
    );
  };

  const openView = (driver) => {
    setSelected(driver);
    setOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeView = () => {
    setOpen(false);
    setSelected(null);
    document.body.style.overflow = "";
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Drivers</h2>
          <p className="text-sm text-slate-500">Manage drivers, vehicles and statuses</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/5 rounded-full px-3 py-2 shadow-sm">
            <Icons.Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, vehicle or plate..."
              className="ml-2 bg-transparent outline-none placeholder:text-slate-400 text-sm w-64"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-lg shadow"
            onClick={() => alert("Wire up Add Driver modal or route")}
          >
            <Icons.UserPlus size={16} />
            Add Driver
          </motion.button>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="text-sm text-slate-500">Showing <span className="font-semibold text-slate-700">{filtered.length}</span> drivers</div>
          <div className="text-xs text-slate-400">Tip: toggle status or click view for details</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-500">
                <th className="px-6 py-3">Driver</th>
                <th className="px-6 py-3">Vehicle</th>
                <th className="px-6 py-3">Plate</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3 text-center">Trips</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence>
                {filtered.length > 0 ? (
                  filtered.map((d, idx) => (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18, delay: idx * 0.03 }}
                      className="border-b last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${nameToGradient(d.name)} bg-gradient-to-br`}>
                          {d.name.split(" ").map(n => n[0]).slice(0,2).join("")}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{d.name}</div>
                          <div className="text-xs text-slate-400">Joined {d.joined}</div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">{d.vehicle}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{d.plate}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{d.phone}</td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-700 shadow-sm">
                          {d.trips}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => toggleStatus(d.id)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            d.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                            d.status === "On Leave" ? "bg-yellow-100 text-yellow-700" :
                            "bg-rose-100 text-rose-700"
                          }`}
                          title="Toggle status"
                        >
                          {d.status}
                        </motion.button>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openView(d)}
                            className="p-2 rounded-md bg-white hover:bg-slate-50 shadow-sm"
                            title="View"
                          >
                            <Icons.Eye size={16} className="text-indigo-600" />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => alert("Edit driver - implement flow")}
                            className="p-2 rounded-md bg-white hover:bg-slate-50 shadow-sm"
                            title="Edit"
                          >
                            <Icons.Edit size={16} className="text-emerald-600" />
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(d.id)}
                            className="p-2 rounded-md bg-white hover:bg-slate-50 shadow-sm"
                            title="Delete"
                          >
                            <Icons.Trash2 size={16} className="text-rose-600" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <Icons.Truck size={36} className="mx-auto mb-3 text-slate-300" />
                      No drivers found. Try a different search or add a driver.
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {open && selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={closeView}
            />

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-lg bg-white rounded-2xl shadow-2xl"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold ${nameToGradient(selected.name)} bg-gradient-to-br text-lg`}>
                    {selected.name.split(" ").map(n => n[0]).slice(0,2).join("")}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-800">{selected.name}</div>
                    <div className="text-sm text-slate-500">{selected.email}</div>
                  </div>
                </div>

                <button onClick={closeView} className="p-2 rounded-full hover:bg-slate-100">
                  <Icons.X size={18} />
                </button>
              </div>

              <div className="px-6 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400">Phone</div>
                    <div className="font-medium text-slate-700">{selected.phone}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">Vehicle</div>
                    <div className="font-medium text-slate-700">{selected.vehicle}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">Plate</div>
                    <div className="font-medium text-slate-700">{selected.plate}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">Status</div>
                    <div className="font-medium text-slate-700">{selected.status}</div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-xs text-slate-400">Notes</div>
                    <div className="text-sm text-slate-600 mt-2">{selected.notes || "— No notes —"}</div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button onClick={() => alert("Send message")} className="px-4 py-2 rounded-md bg-slate-50 hover:bg-slate-100">Message</button>
                <button onClick={() => alert("Open trips list")} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Trips</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
