import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaGoogle } from "react-icons/fa";
import "./Login.scss";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: replace with your real login call
    // const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, { ... })
    // if (res.ok) navigate("/");
    console.log("Logging in with", form);
    navigate("/"); // temporary
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-left">
          <img src="/logo192.png" alt="TechTango Logo" className="login-logo" />
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
              <Link to="/forgot-password">Forgot Password</Link>
            </div>
            <button type="submit" className="btn-login">
              Log In
            </button>
          </form>
          <div className="or-divider">
            <span>Or</span>
          </div>
          <button className="btn-google">
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





// // src/components/LoginForm.js

// import React, { useState } from 'react';
// import api from '../services/api';

// export default function LoginForm() {
//   const [form, setForm] = useState({ email: '', password: '' });

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const res = await api.post('/auth/login', form);
//       localStorage.setItem('token', res.data.token);
//       alert('Login success!');
//     } catch (err) {
//       console.error(err);
//       alert('Login failed');
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <input name="email" placeholder="Email" onChange={handleChange} />
//       <input name="password" type="password" placeholder="Password" onChange={handleChange} />
//       <button type="submit">Login</button>
//     </form>
//   );
// }
