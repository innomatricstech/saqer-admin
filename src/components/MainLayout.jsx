
// import React, { useEffect, useState } from "react";
// import Sidebar from "../components/Sidebar";

// export default function MainLayout({ children }) {
//   const [sidebarWidth, setSidebarWidth] = useState(() => {
//     try {
//       const collapsed = localStorage.getItem("sidebar-collapsed") === "1";
//       return collapsed ? 80 : 256;
//     } catch {
//       return 256;
//     }
//   });

//   const [isDesktop, setIsDesktop] = useState(() => {
//     if (typeof window === "undefined") return true;
//     return window.matchMedia("(min-width: 768px)").matches;
//   });

//   useEffect(() => {
//     function onResize() {
//       setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
//     }
//     const mq = window.matchMedia("(min-width: 768px)");
//     mq.addEventListener ? mq.addEventListener("change", onResize) : mq.addListener(onResize);
//     window.addEventListener("resize", onResize);
//     return () => {
//       mq.removeEventListener ? mq.removeEventListener("change", onResize) : mq.removeListener(onResize);
//       window.removeEventListener("resize", onResize);
//     };
//   }, []);

//   useEffect(() => {
//     function onSidebarResize(e) {
//       if (!e?.detail || typeof e.detail.width !== "number") return;
//       setSidebarWidth(e.detail.width);
//     }
//     window.addEventListener("sidebar-resize", onSidebarResize);
//     return () => window.removeEventListener("sidebar-resize", onSidebarResize);
//   }, []);

//   const appliedLeft = isDesktop ? `${sidebarWidth}px` : "0px";

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Sidebar />
//       <main style={{ marginLeft: appliedLeft, transition: "margin-left 200ms ease", paddingTop: 72 }} className="transition-all duration-200">
//         <div className="max-w-7xl mx-auto p-6">{children}</div>
//       </main>

//       <style>{`
//         @media (max-width: 767px) {
//           main { margin-left: 0 !important; }
//         }
//       `}</style>
//     </div>
//   );
// }
