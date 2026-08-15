import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import logo from "../../components/navbar/ttlogo.png";
import heroImage from "../Login/loginpage.png";
import "./ForgotPassword.scss";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setResetUrl("");

    try {
      const res = await api.post("/auth/forgot-password", {
        email,
        appBaseUrl: window.location.origin,
      });
      setMessage(res.data?.message || "If the account exists, a reset link has been sent.");
      setResetUrl(res.data?.resetUrl || "");
    } catch (err) {
      console.error("Forgot password error:", err);
      setMessage(err.response?.data?.message || "Could not process your request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        <div className="forgot-password-panel">
          <img src={logo} alt="Tymebound Logo" className="forgot-password-logo" />
          <h1>Reset Password</h1>
          <p className="forgot-password-subtitle">
            Enter your email and we will send you a password reset link.
          </p>

          <form onSubmit={handleSubmit} className="forgot-password-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="forgot-password-input"
              required
            />
            <button type="submit" className="forgot-password-button" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          {message ? <div className="forgot-password-message">{message}</div> : null}
          {resetUrl ? (
            <div className="forgot-password-dev-link">
              <span>Development reset link:</span>
              <a href={resetUrl}>{resetUrl}</a>
            </div>
          ) : null}

          <div className="forgot-password-back">
            <Link to="/login">Back to login</Link>
          </div>
        </div>

        <div className="forgot-password-hero" aria-hidden="true">
          <img src={heroImage} alt="" className="forgot-password-hero-image" />
        </div>
      </div>
    </div>
  );
}
