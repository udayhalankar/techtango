// client/src/pages/Logout.js
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

export default function Logout() {
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    localStorage.removeItem('token'); // Clear auth token
    setLoggedOut(true);               // Trigger redirect
  }, []);

  if (loggedOut) return <Navigate to="/login" />;

  return <p>Logging out...</p>;
}
