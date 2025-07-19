// src/components/Layout.js
import React from "react";
import Navbar from "./navbar/Navbar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <Navbar />
      <div className="page-content">
        <Outlet />
      </div>
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
