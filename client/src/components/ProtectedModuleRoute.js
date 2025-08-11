import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedModuleRoute({ moduleName, children }) {
  const subscriptions = JSON.parse(localStorage.getItem('subscriptions'));

  console.log("🔒 Checking subscription for module:", moduleName);
  console.log("📦 Subscriptions:", subscriptions);

  const isSubscribed = subscriptions?.some(
    (s) =>
      s.module_name &&
      s.status === 'active' &&
      s.module_name.toLowerCase() === moduleName.toLowerCase()
  );

  if (!isSubscribed) {
    console.warn(`❌ Not subscribed to: ${moduleName}, redirecting to home`);
    return <Navigate to="/" replace />;
  }
  
  return children;
}




