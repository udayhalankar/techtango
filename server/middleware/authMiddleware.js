// server/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
require('dotenv').config(); // ✅ Load env vars

const JWT_SECRET = process.env.JWT_SECRET; // ✅ Use secret from .env

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user; // sets req.user.userId, req.user.email, req.user.role
    next();
  });
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { verifyToken, authorizeRole };
