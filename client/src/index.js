// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';           // ← CLIENT import only
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import App from './App';
import reportWebVitals from './reportWebVitals';

// Make sure this matches your .env: REACT_APP_GOOGLE_CLIENT_ID
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

// Optional: performance measurements
reportWebVitals();
