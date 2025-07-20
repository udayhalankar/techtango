// src/pages/Login/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaGoogle } from "react-icons/fa";
import { useGoogleLogin } from "@react-oauth/google";
import api from "../../services/api";
import logo from "../../logo.svg";
import "./Login.scss";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const apiBase = process.env.REACT_APP_API_URL;

  // ➊ Email/password change handler
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ➋ Email/password submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", form);
      const { token } = res.data;
      // store JWT
      localStorage.setItem("token", token);
      // fetch & store subscriptions
      const subs = await api.get("/subscriptions");
      localStorage.setItem(
        "subscriptions",
        JSON.stringify(subs.data)
      );
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      alert(err.response?.data?.message || "Login failed");
    }
  };

  // ➌ Google login hook
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (credentialResponse) => {
      try {
        const res = await api.post("/auth/google", {
          idToken: credentialResponse.credential,
        });
        const { token } = res.data;
        localStorage.setItem("token", token);
        const subs = await api.get("/subscriptions");
        localStorage.setItem(
          "subscriptions",
          JSON.stringify(subs.data)
        );
        navigate("/");
      } catch (err) {
        console.error("Google login failed", err);
        alert("Google login failed");
      }
    },
    onError: () => {
      console.error("Google login error");
      alert("Google login error");
    },
  });

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-left">
          <img src={logo} alt="TechTango Logo" className="login-logo" />
          <h1>Hello!</h1>
          <p className="subtitle">Welcome to TechTango</p>

          <form onSubmit={handleSubmit}>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="login-input"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="login-input"
              required
            />
            <div className="forgot-password">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>
            <button type="submit" className="btn-login">
              Log In
            </button>
          </form>

          <div className="or-divider">
            <span>Or</span>
          </div>

          {/* ➍ Custom Google button */}
          <button
            type="button"
            className="btn-google"
            onClick={() => loginWithGoogle()}
          >
            <FaGoogle className="google-icon" />
            Login with Google
          </button>

          <div className="signup-link">
            Don’t have an Account? <Link to="/register">Signup</Link>
          </div>
        </div>
        <div className="login-right" />
      </div>
    </div>
  );
}
