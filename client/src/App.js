import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedModuleRoute from './components/ProtectedModuleRoute';
import Layout from './components/Layout';

import Home from "./pages/home/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Logout from "./pages/Logout";
import AuthWrapper from "./AuthWrapper";

import modulesConfig from './config/modulesConfig';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/logout" element={<Logout />} />

          {/* Protected Routes wrapped in Layout (Navbar + Page) */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<AuthWrapper><Home /></AuthWrapper>} />

            {/* Auto-mapped module routes */}
            {Object.entries(modulesConfig).map(([moduleName, config]) => {
              const Element = config.component;
              return (
                <Route
                  key={config.path}
                  path={config.path}
                  element={
                    config.protected ? (
                      <ProtectedModuleRoute moduleName={moduleName}>
                        <Element />
                      </ProtectedModuleRoute>
                    ) : (
                      <Element />
                    )
                  }
                />
              );
            })}
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
