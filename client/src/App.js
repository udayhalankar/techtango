// src/App.js
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import "./i18n";
import { useTranslation } from "react-i18next";
import DirectionProvider from "./theme/DirectionProvider";
import LanguageMenu from "./components/LanguageMenu";

import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedModuleRoute from "./components/ProtectedModuleRoute";
import Layout from "./components/Layout";
import SessionBoundary from "./components/SessionBoundary";
import "d3-transition";
import Home from "./pages/home/Home";
import LandingPage from "./pages/public/LandingPage";
import Login from "./pages/login/Login";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Register from "./pages/Register/Register";
import Logout from "./pages/Logout";
import AuthWrapper from "./AuthWrapper";

import modulesConfig from "./config/modulesConfig";
import PrintWorkflow from "./pages/businessautomation/simple_workflowbuilder/components/PrintWorkflow";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();

export default function App() {
  const { i18n } = useTranslation();
  const dir = i18n.dir(i18n.language || "en");
  const location = useLocation();
  const isStandalonePublishedExperiencePage =
    location.pathname === "/experiencebuilder" &&
    new URLSearchParams(location.search || "").has("pagepub");

  return (
    <DirectionProvider dir={dir}>
      <SessionBoundary>
        <QueryClientProvider client={queryClient}>
          {!isStandalonePublishedExperiencePage && <LanguageMenu floating />}
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register" element={<Register />} />
            <Route path="/logout" element={<Logout />} />
            {/* Public print route for PDF capture */}
            <Route path="/print/workflow/:id" element={<PrintWorkflow />} />

            {/* Protected layout wrapper */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/home" element={<AuthWrapper><Home /></AuthWrapper>} />

              {/* Dynamically map routes from modulesConfig */}
              {Object.entries(modulesConfig).map(([moduleName, config]) => {
                const C = config?.component;

                // Guard + logger: skip bad entries so app can render
                if (typeof C !== "function") {
                  // This will tell you exactly which import/export is wrong
                  console.error(
                    `[routes] Invalid component for ${moduleName} @ ${config?.path}`,
                    { imported: C, typeofC: typeof C }
                  );
                  return null;
                }

                return (
                  <Route
                    key={config.path}
                    path={config.path}
                    element={
                      config.protected ? (
                        <ProtectedModuleRoute
                          moduleId={config.moduleId}
                          moduleName={config.moduleName || moduleName}
                        >
                          <C />
                        </ProtectedModuleRoute>
                      ) : (
                        <C />
                      )
                    }
                  />
                );
              })}
            </Route>
          </Routes>
        </QueryClientProvider>
      </SessionBoundary>
    </DirectionProvider>
  );
}














// import React, { useEffect } from 'react';
// import { Routes, Route, useNavigate  } from "react-router-dom";

// import "./i18n";                                // ⬅️ init i18n once
// import { useTranslation } from "react-i18next";
// import DirectionProvider from "./theme/DirectionProvider"; // ⬅️ RTL wrapper
// import LanguageMenu from "./components/LanguageMenu";      // ⬅️ selector

// import ProtectedRoute from './components/ProtectedRoute';
// import ProtectedModuleRoute from './components/ProtectedModuleRoute';
// import Layout from './components/Layout';
// import 'd3-transition';
// import Home from "./pages/home/Home";
// import LandingPage from "./pages/public/LandingPage";   // ⬅️ add
// import Login from "./pages/login/Login";
// import Register from "./pages/Register/Register";
// import Logout from "./pages/Logout";
// import AuthWrapper from "./AuthWrapper";

// import modulesConfig from './config/modulesConfig';

// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// const queryClient = new QueryClient();

// export default function App() {

//   const { i18n } = useTranslation();
//   const dir = i18n.dir(i18n.language || "en");  // "rtl" for Arabic, else "ltr"

//    //END added by UH 

//      const navigate = useNavigate();

//   useEffect(() => {
//     const updateActivity = () => {
//       localStorage.setItem('lastActivity', Date.now().toString());
//     };

//     const checkInactivity = setInterval(() => {
//       const last = parseInt(localStorage.getItem('lastActivity') || "0", 10);
//       const now = Date.now();
//       if (now - last > 15 * 60 * 1000) {
//         localStorage.removeItem('token');
//         localStorage.removeItem('lastActivity');
//         navigate('/login');
//       }
//     }, 60000); // check every 1 min

//     window.addEventListener('mousemove', updateActivity);
//     window.addEventListener('keydown', updateActivity);
//     window.addEventListener('click', updateActivity);
//     updateActivity();

//     return () => {
//       clearInterval(checkInactivity);
//       window.removeEventListener('mousemove', updateActivity);
//       window.removeEventListener('keydown', updateActivity);
//       window.removeEventListener('click', updateActivity);
//     };
//   }, [navigate]);

//     //END added by UH




//   return (
//     <DirectionProvider dir={dir}>
//     <QueryClientProvider client={queryClient}>
//       <LanguageMenu floating /> 
//       <Routes>
//         {/* Public Routes */}
//         <Route path="/" element={<LandingPage />} /> 
//         <Route path="/login" element={<Login />} />
//         <Route path="/register" element={<Register />} />
//         <Route path="/logout" element={<Logout />} />

//         {/* All the protected pages share the Layout (navbar/sidebar) */}
//         <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
//           {/* Home */}
//           {/* <Route path="/" element={<AuthWrapper><Home /></AuthWrapper>} /> */}
//           {/* Home (now at /home) */}
// +          <Route path="/home" element={<AuthWrapper><Home /></AuthWrapper>} />

//           {/* Dynamically map your modulesConfig */}
//           {Object.entries(modulesConfig).map(([moduleName, config]) => {
//             const Element = config.component;
//             return (
//               <Route
//                 key={config.path}
//                 path={config.path}
//                 element={
//                   config.protected
//                     ? (
//                       // <ProtectedModuleRoute moduleName={moduleName}>
//                       <ProtectedModuleRoute moduleId={config.moduleId} moduleName={moduleName}>
//                         <Element />
//                       </ProtectedModuleRoute>
//                     )
//                     : <Element />
//                 }
//               />
//             );
//           })}
//         </Route>
//       </Routes>
//     </QueryClientProvider>
//     </DirectionProvider>
//   );
// }
