import axios from 'axios';
import ReactDOM from 'react-dom';
import SessionExpiredModal from '../components/SessionExpiredModal';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// ✅ Attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Handle session expiration globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      // Avoid showing multiple modals
      if (!document.getElementById('session-expired-modal')) {
        const container = document.createElement('div');
        container.id = 'session-expired-modal';
        document.body.appendChild(container);

        ReactDOM.render(
          <SessionExpiredModal
            onConfirm={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('subscriptions');
              window.location.href = '/login';
            }}
          />,
          container
        );
      }
    }

    return Promise.reject(error);
  }
);

export default api;
