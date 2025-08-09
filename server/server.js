require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('ws');
const pool = require('./db');

const authRoutes         = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');
const usersRoutes        = require('./routes/users');
const approvalsRoutes    = require('./routes/approvals');
const templatesRoute = require('./routes/templates');

const app = express();
const formViewsRoute = require("./routes/formViews");
const workflowsRoute = require('./routes/workflows');
const enquiriesRoute = require('./routes/enquiries'); // 👈 make sure this matches filename
const businessPartnerRoutes = require('./routes/businesspartner');
const tableRoutes = require('./routes/table'); // ✅ Import your route file
const template = require('./routes/template')
const uploadRoutes = require('./routes/upload');
const formRoutes = require('./routes/forms');
const formviewsRoutes = require('./routes/formviews');

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
// app.use(cors());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, // if using cookies or auth headers
}));
app.use(express.json());
app.use("/api/form-views", formViewsRoute);
app.use('/api/businesspartner', businessPartnerRoutes);
// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/workflows', workflowsRoute);
app.use('/api/enquiries', enquiriesRoute);             // 👈 this defines the URL path


app.use('/api/templates', templatesRoute); // <-- mounts the endpoint
app.use('/api/template', template); // <-- mounts the endpoint
app.use('/api/upload', uploadRoutes);
app.use('/api/formconfig', formRoutes);
app.use('/api', formviewsRoutes);


// ─── TEST ROUTES ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('OK');
});

// ✅ Register the route under /api/table
app.use('/api/table', tableRoutes);

// 🔍 Optional: add /api/subscriptions list if still needed
app.get('/api/subscriptions', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM subscriptions'); 
    return res.json(rows);
  } catch (err) {
    console.error('Subscriptions error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/todos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM todo');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/todos error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── WEBSOCKET SERVER SETUP ───────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new Server({ server });

wss.on('connection', ws => {
  console.log('🔌 WebSocket client connected');
  ws.send('👋 Hello from WebSocket server!');

  ws.on('message', message => {
    console.log('📨 Received via WS:', message);
  });

  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
  });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
