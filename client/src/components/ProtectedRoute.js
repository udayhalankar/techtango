// client/src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

function isTokenExpired(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload || typeof payload.exp !== 'number') return true;
    return payload.exp * 1000 <= Date.now();
  } catch (_) {
    return true;
  }
}

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    return <Navigate to="/login" replace />;
  }
  return children;
}
