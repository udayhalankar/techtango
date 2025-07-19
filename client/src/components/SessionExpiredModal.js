import React from 'react';
import './SessionExpiredModal.scss';

export default function SessionExpiredModal({ onConfirm }) {
  return (
    <div className="session-modal-backdrop" role="dialog" aria-modal="true">
      <div className="session-modal">
        <h3>Session Expired</h3>
        <p>Your session has expired. Please log in again to continue.</p>
        <button onClick={onConfirm} className="confirm-button">
          Go to Login
        </button>
      </div>
    </div>
  );
}
