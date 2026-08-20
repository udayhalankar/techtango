import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import logo from "../../components/navbar/ttlogo.png";
import heroImage from "../Login/loginpage.png";
import "./ResetPassword.scss";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("This reset link is missing a token.");
      return;
    }

    if (form.newPassword.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword: form.newPassword,
      });
      alert(res.data?.message || "Password reset successfully");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Reset password error:", err);
      setMessage(err.response?.data?.message || "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">
        <div className="reset-password-panel">
          <img src={logo} alt="Augmis Logo" className="reset-password-logo" />
          <h1>Set New Password</h1>
          <p className="reset-password-subtitle">
            Choose a new password for your account.
          </p>

          <form onSubmit={handleSubmit} className="reset-password-form">
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="New password"
              className="reset-password-input"
              required
            />
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              className="reset-password-input"
              required
            />
            <button type="submit" className="reset-password-button" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          {message ? <div className="reset-password-message">{message}</div> : null}

          <div className="reset-password-back">
            <Link to="/login">Back to login</Link>
          </div>
        </div>

        <div className="reset-password-hero" aria-hidden="true">
          <img src={heroImage} alt="" className="reset-password-hero-image" />
        </div>
      </div>
    </div>
  );
}
