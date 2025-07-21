require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('ws');
const pool = require('./db');
const router  = express.Router();

const authRoutes          = require('./routes/auth');
const subscriptionRoutes  = require('./routes/subscription');
const usersRoutes         = require('./routes/users');

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('OK');
});

// ─── API ROUTES ────────────────────────────────────────────────────────────────
// Authentication (register, login, Google, etc.)
// GET /api/subscriptions
router.get('/', async (req, res) => {
console.log('▶▶ HIT /api/subscriptions');

  try {
    const { rows } = await pool.query('SELECT * FROM subscriptions'); 
    return res.json(rows);
  } catch (err) {
    console.error('Subscriptions error:', err);
    return res.status(500).json({ error: err.message });
  }
});


app.use('/api/auth', authRoutes);

// Subscription management
// app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/subscription', subscriptionRoutes);

// User CRUD
app.use('/api/users', usersRoutes);

// Example TODOs endpoint (now under /api/todos)
app.get('/api/todos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM todo');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/todos error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── HTTP & WEBSOCKET SERVER SETUP ─────────────────────────────────────────────
const server = http.createServer(app);
const wss = new Server({ server });

wss.on('connection', ws => {
  console.log('🔌 WebSocket client connected');
  ws.send('👋 Hello from WebSocket server!');

  ws.on('message', message => {
    console.log('📨 Received via WS:', message);
    // (Optionally broadcast or handle the message here)
  });

  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
  });
});

// ─── START SERVER ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
