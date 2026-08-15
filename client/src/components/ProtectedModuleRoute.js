// client/src/components/ProtectedModuleRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSubscribedModuleIds } from '../store/subscriptions';

export default function ProtectedModuleRoute({ moduleId, moduleName, children }) {
  const { ids, list, loading, err } = useSubscribedModuleIds();
  const loc = useLocation();
  const moduleIdNum = moduleId != null ? Number(moduleId) : null;
  const normalize = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  if (loading) return <div style={{ padding: 16 }}>Checking subscription.</div>;
  const cache = JSON.parse(localStorage.getItem('subscriptions') || '[]');

  // Decide with live list first, then fallback cache
  const hasById =
    (Array.isArray(ids) && moduleIdNum != null && ids.some((id) => normalize(id) === moduleIdNum)) ||
    (Array.isArray(cache) && moduleIdNum != null && cache.some((s) => normalize(s.module_id) === moduleIdNum));

  const hasByName =
    (moduleName && (
      (Array.isArray(list)  && list.some((s) => String(s.module_name || '').toLowerCase() === moduleName.toLowerCase() && String(s.status).toLowerCase() === 'active')) ||
      (Array.isArray(cache) && cache.some((s) => String(s.module_name || '').toLowerCase() === moduleName.toLowerCase() && String(s.status).toLowerCase() === 'active'))
    ));

  const ok = hasById || hasByName;

  if (!ok) {
    return <Navigate to="/login" replace state={{ from: loc, reason: "no-subscription", moduleId, moduleName }} />;
  }
  return children;
}



// import React from 'react';
// import { Navigate } from 'react-router-dom';

// export default function ProtectedModuleRoute({ moduleName, children }) {
//   const subscriptions = JSON.parse(localStorage.getItem('subscriptions'));

//   console.log("?? Checking subscription for module:", moduleName);
//   console.log("?? Subscriptions:", subscriptions);

//   const isSubscribed = subscriptions?.some(
//     (s) =>
//       s.module_name &&
//       s.status === 'active' &&
//       s.module_name.toLowerCase() === moduleName.toLowerCase()
//   );

//   if (!isSubscribed) {
//     console.warn(`? Not subscribed to: ${moduleName}, redirecting to home`);
//     return <Navigate to="/" replace />;
//   }
  
//   return children;
// }
