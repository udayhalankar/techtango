// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';



import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import reportWebVitals from './reportWebVitals';

import axios from 'axios';
import { handleAuthError } from './auth/sessionManager';
// import * as serviceWorkerRegistration from './serviceWorkerRegistration';
// serviceWorkerRegistration.unregister();

if (process.env.NODE_ENV === 'development') {
  window.axios = axios;
}

axios.interceptors.response.use(
  (response) => response,
  (error) => handleAuthError(error)
);

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);

// Optional: Performance metrics
reportWebVitals();
