// src/pages/Login/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaGoogle } from "react-icons/fa";
import { useGoogleLogin } from "@react-oauth/google";
import api from "../../services/api";
import logo from "../../components/navbar/ttlogo.png";
import heroImage from "./loginpage.png";
import "./Login.scss";
import { jwtDecode } from "jwt-decode";  // make sure it's installed

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", form);
      const { token } = res.data;

      if (!token) throw new Error("No token returned");

      localStorage.setItem("token", token);

      const subs = await api.get("/subscription/subscriptions");
      localStorage.setItem("subscriptions", JSON.stringify(subs.data));

      // navigate("/");
      navigate("/home", { replace: true });   // ⬅️ go to the new post-login home
    } catch (err) {
      console.error("Login error:", err);
      alert(err.response?.data?.message || "Login failed");
    }
  };

  const loginWithGoogle = useGoogleLogin({
    flow: "auth-code",
    scope: "openid profile email",
    onSuccess: async (codeResponse) => {
      try {
        console.log("▶▶ Google auth code:", codeResponse.code);
        const res = await api.post("/auth/google", {
          code: codeResponse.code,
        });

        const { token } = res.data;
        


        if (!token) throw new Error("No token returned");

        localStorage.setItem("token", token);

        // 🧠 Decode name/photo from token
        const decoded = jwtDecode(token);
        localStorage.setItem("firstname", decoded.firstname);
        localStorage.setItem("lastname", decoded.lastname);
        localStorage.setItem("picture", decoded.picture);

        const subs = await api.get("/subscription/subscriptions");
        localStorage.setItem("subscriptions", JSON.stringify(subs.data));

        navigate("/");
      } catch (err) {
        console.error("Google login failed:", err.response?.data || err.message);
        alert("Google login failed: " + (err.response?.data?.message || err.message));
      }
    },
    onError: (errorResponse) => {
      console.error("Google login error:", errorResponse);
      alert("Google login error");
    },
  });

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-left">
          <img src={logo} alt="Augmis Logo" className="login-logo" />
          <h1>Hello!</h1>
          <p className="subtitle">Welcome to Augmis</p>

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
        <div className="login-right" aria-hidden="true">
          <img src={heroImage} alt="" className="login-hero-image" />
        </div>
      </div>
    </div>
  );
}
