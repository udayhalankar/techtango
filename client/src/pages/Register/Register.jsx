import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../components/navbar/ttlogo.png";
import heroImage from "../Login/loginpage.png";
import api from "../../services/api";
import "./Register.scss";

export default function Register() {
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/register", form);
      alert("Registration successful! Please check your email to activate.");
      navigate("/login");
    } catch (err) {
      console.error("Register error:", err);
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-left">
          <img src={logo} alt="Augmis Logo" className="register-logo" />
          <h1>Welcome!</h1>
          <p className="subtitle">Create your Augmis account</p>
          <form onSubmit={handleSubmit}>
            <input
              name="firstname"
              type="text"
              placeholder="First Name"
              value={form.firstname}
              onChange={handleChange}
              className="register-input"
              required
            />
            <input
              name="lastname"
              type="text"
              placeholder="Last Name"
              value={form.lastname}
              onChange={handleChange}
              className="register-input"
              required
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="register-input"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="register-input"
              required
            />
            <button type="submit" className="btn-register">
              Sign Up
            </button>
          </form>
          <div className="login-link">
            Already have an account? <Link to="/login">Log In</Link>
          </div>
        </div>
        <div className="register-right" aria-hidden="true">
          <img src={heroImage} alt="" className="register-hero-image" />
        </div>
      </div>
    </div>
  );
}
