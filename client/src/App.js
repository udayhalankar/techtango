// src/App.js
import React, { useEffect } from 'react';
import { Routes, Route, useNavigate  } from "react-router-dom";
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedModuleRoute from './components/ProtectedModuleRoute';
import Layout from './components/Layout';

import Home from "./pages/home/Home";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Logout from "./pages/Logout";
import AuthWrapper from "./AuthWrapper";

import modulesConfig from './config/modulesConfig';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();

export default function App() {


   //END added by UH 

     const navigate = useNavigate();

  useEffect(() => {
    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    const checkInactivity = setInterval(() => {
      const last = parseInt(localStorage.getItem('lastActivity') || "0", 10);
      const now = Date.now();
      if (now - last > 15 * 60 * 1000) {
        localStorage.removeItem('token');
        localStorage.removeItem('lastActivity');
        navigate('/login');
      }
    }, 60000); // check every 1 min

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    updateActivity();

    return () => {
      clearInterval(checkInactivity);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [navigate]);

    //END added by UH




  return (

    <QueryClientProvider client={queryClient}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/logout" element={<Logout />} />

        {/* All the protected pages share the Layout (navbar/sidebar) */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* Home */}
          <Route path="/" element={<AuthWrapper><Home /></AuthWrapper>} />

          {/* Dynamically map your modulesConfig */}
          {Object.entries(modulesConfig).map(([moduleName, config]) => {
            const Element = config.component;
            return (
              <Route
                key={config.path}
                path={config.path}
                element={
                  config.protected
                    ? (
                      <ProtectedModuleRoute moduleName={moduleName}>
                        <Element />
                      </ProtectedModuleRoute>
                    )
                    : <Element />
                }
              />
            );
          })}
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}




// import React from 'react';
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import ProtectedRoute from './components/ProtectedRoute';
// import ProtectedModuleRoute from './components/ProtectedModuleRoute';
// import Layout from './components/Layout';

// import Home from "./pages/home/Home";
// import Login from "./pages/Login/Login";
// import Register from "./pages/Register/Register";
// import Logout from "./pages/Logout";
// import AuthWrapper from "./AuthWrapper";

// import modulesConfig from './config/modulesConfig';

// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// const queryClient = new QueryClient();

// export default function App() {
//   return (
//     <QueryClientProvider client={queryClient}>
//       <BrowserRouter>
//         <Routes>
//           {/* Public Routes */}
//           <Route path="/login" element={<Login />} />
//           <Route path="/register" element={<Register />} />
//           <Route path="/logout" element={<Logout />} />

//           {/* Protected Routes wrapped in Layout (Navbar + Page) */}
//           <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
//             <Route path="/" element={<AuthWrapper><Home /></AuthWrapper>} />

//             {/* Auto-mapped module routes */}
//             {Object.entries(modulesConfig).map(([moduleName, config]) => {
//               const Element = config.component;
//               return (
//                 <Route
//                   key={config.path}
//                   path={config.path}
//                   element={
//                     config.protected ? (
//                       <ProtectedModuleRoute moduleName={moduleName}>
//                         <Element />
//                       </ProtectedModuleRoute>
//                     ) : (
//                       <Element />
//                     )
//                   }
//                 />
//               );
//             })}
//           </Route>
//         </Routes>
//       </BrowserRouter>
//     </QueryClientProvider>
//   );
// }
