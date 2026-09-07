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
import PublishedAiApplication from "./pages/businessautomation/customapps/PublishedAiApplication";

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
          {!isStandalonePublishedExperiencePage && (
            <LanguageMenu floating />
          )}

          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/forgot-password"
              element={<ForgotPassword />}
            />
            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />
            <Route path="/register" element={<Register />} />
            <Route path="/logout" element={<Logout />} />

            {/* Public print route for PDF capture */}
            <Route
              path="/print/workflow/:id"
              element={<PrintWorkflow />}
            />

            {/* Protected layout wrapper */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route
                path="/home"
                element={
                  <AuthWrapper>
                    <Home />
                  </AuthWrapper>
                }
              />

              {/* V2.9.2 Published AI Application Runtime */}
              <Route
                path="/customapps/:appSlug"
                element={
                  <ProtectedModuleRoute
                    moduleId={8}
                    moduleName="Business Automation"
                  >
                    <PublishedAiApplication />
                  </ProtectedModuleRoute>
                }
              />

              {/* Dynamically map routes from modulesConfig */}
              {Object.entries(modulesConfig).map(
                ([moduleName, config]) => {
                  const C = config?.component;

                  // Guard + logger: skip bad entries so app can render
                  if (typeof C !== "function") {
                    console.error(
                      `[routes] Invalid component for ${moduleName} @ ${config?.path}`,
                      {
                        imported: C,
                        typeofC: typeof C,
                      }
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
                            moduleName={
                              config.moduleName ||
                              moduleName
                            }
                          >
                            <C />
                          </ProtectedModuleRoute>
                        ) : (
                          <C />
                        )
                      }
                    />
                  );
                }
              )}
            </Route>
          </Routes>
        </QueryClientProvider>
      </SessionBoundary>
    </DirectionProvider>
  );
}
