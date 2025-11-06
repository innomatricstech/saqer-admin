// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaCarSide,
  FaGift,
  FaClipboardList,
  FaCog,
  FaQuestionCircle,
  FaSignOutAlt,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

const menuItems = [
  { label: "Dashboard", path: "/", icon: <FaTachometerAlt /> },
  {
    label: "Customers",
    path: "/customers",
    icon: <FaUsers />,
    children: [{ label: "Customers - Vehicles", path: "/customers/vehicles", icon: <FaCarSide /> }],
  },
  { label: "Drivers", path: "/drivers", icon: <FaCarSide /> },
  { label: "Rewards", path: "/rewards", icon: <FaGift /> },
  { label: "Bookings", path: "/bookings", icon: <FaClipboardList /> },
  { label: "Settings", path: "/settings", icon: <FaCog /> },
  { label: "Help & Support", path: "/help-support", icon: <FaQuestionCircle /> },
];

export default function Sidebar() {
  const location = useLocation();
  const [openMap, setOpenMap] = useState({});

  useEffect(() => {
    const path = location.pathname;
    const newOpen = {};
    for (const item of menuItems) {
      if (item.children) {
        newOpen[item.label] =
          path === item.path ||
          path.startsWith(item.path + "/") ||
          item.children.some((ch) => path === ch.path || path.startsWith(ch.path + "/") || (ch.path !== "/" && path.startsWith(ch.path)));
      }
    }
    setOpenMap((prev) => ({ ...prev, ...newOpen }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggle = (label) => setOpenMap((s) => ({ ...s, [label]: !s[label] }));

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 flex flex-col p-5 shadow-xl z-50">
      {/* Inner scrollable area so sidebar stays fixed while its content scrolls */}
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="mb-8 text-center select-none">
          <h1 className="text-3xl font-extrabold text-white tracking-wide">Admin<span className="text-blue-400">Hub</span></h1>
          <p className="text-xs text-gray-400 mt-1">Control Center</p>
        </div>

        <nav className="space-y-2 flex-1 px-1">
          {menuItems.map((item) => {
            if (item.children) {
              const isOpen = !!openMap[item.label];
              const parentActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/") ||
                item.children.some((ch) => location.pathname === ch.path || location.pathname.startsWith(ch.path + "/") || (ch.path !== "/" && location.pathname.startsWith(ch.path)));

              return (
                <div key={item.label} className="mb-1">
                  <div className="w-full flex items-center justify-between gap-3 rounded-lg">
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 flex-1 ${
                        parentActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "hover:bg-gray-700 text-gray-300 hover:text-white"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>

                    <button
                      onClick={() => toggle(item.label)}
                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label}`}
                      className={`ml-2 px-3 py-2 rounded-full transition-colors ${
                        parentActive ? "bg-blue-600 text-white" : "bg-transparent text-gray-400 hover:bg-gray-700 hover:text-white"
                      }`}
                      type="button"
                    >
                      {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-2 ml-3 space-y-1">
                      {item.children.map((child) => {
                        const isActive = location.pathname === child.path || location.pathname.startsWith(child.path + "/");
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors duration-200 ${
                              isActive ? "bg-blue-500 text-white shadow" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                            }`}
                          >
                            {child.icon && <span className="text-sm">{child.icon}</span>}
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 ${
                  isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "hover:bg-gray-700 text-gray-300 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
