// src/components/Layout.js
import React from "react";
import Navbar from "./navbar/Navbar";
import Footer from "./footer/Footer";
import { Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();
  const params = new URLSearchParams(location.search || "");
  const embedded = params.get("embedded") === "1";
  const preview = params.get("preview") === "1";
  const standalonePublishedExperiencePage =
    location.pathname === "/experiencebuilder" && Boolean(params.get("pagepub"));

  if (embedded || preview || standalonePublishedExperiencePage) {
    return <Outlet />;
  }
  return (
    <>
      <Navbar />
      <div className="page-content" style={{ paddingTop: "65px", paddingBottom: "45px" }}>
        <Outlet />
      </div>
      <Footer />
    </>
  );
}



// import { Outlet, Link } from "react-router-dom";
// import Users from '../pages/users/Users'; // ✅ Make sure this import is correct

// const Layout = () => {
//   return (
//     <>
//       <nav>
//         <ul>
//           <li>
//             <Link to="/">Home</Link>
//           </li>
//           <li>
//             <Link to="/Bpm">BPM</Link>
//           </li>
//           <li>
//             <Link to="/Users">USERS</Link>
//           </li>
//         </ul>
//       </nav>

//       <Outlet />
//     </>
//   )
// };

// export default Layout;
