// src/components/RegisterForm.js

import React, { useState } from 'react';
import api from '../services/api';

export default function Register() {
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', password: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', form);
      console.log('Registered:', res.data);
      alert('Registered! Now login.');
    } catch (err) {
      console.error(err);
      alert('Register failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="firstname" placeholder="First Name" onChange={handleChange} />
      <input name="lastname" placeholder="Last Name" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="password" type="password" placeholder="Password" onChange={handleChange} />
      <button type="submit">Register</button>
    </form>
  );
}
