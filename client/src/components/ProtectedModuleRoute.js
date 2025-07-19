import { Navigate } from 'react-router-dom';

export default function ProtectedModuleRoute({ moduleName, children }) {
  const subscriptions = JSON.parse(localStorage.getItem('subscriptions'));

  const isSubscribed = subscriptions?.some(
    (s) =>
      s.module_name &&
      s.status === 'active' &&
      s.module_name.toLowerCase() === moduleName.toLowerCase()
  );

  if (!isSubscribed) return <Navigate to="/" />;
  return children;
}


