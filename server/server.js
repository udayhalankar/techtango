// server/server.js
require('dotenv').config();

const express = require('express');
const app = express();

// ── Public: Chowkidar FIRST (no JSON body parsing needed)
app.use('/api/chowkidar', require('./routes/chowkidar'));

// ── JSON body AFTER chowkidar
app.use(express.json());

// ── Security / Perf middleware
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const responseTime = require('response-time');
const rateLimit = require('express-rate-limit');

// ── Auth / Subscription
const { verifyToken } = require('./middleware/authMiddleware');
const { checkSubscription } = require('./middleware/checkSubscription'); // << keep this name

// ── HTTP / WS
const http = require('http');
const pool = require('./db');

// ── Routers
const authRoutes            = require('./routes/auth');
const subscriptionRoutes    = require('./routes/subscription');
const usersRoutes           = require('./routes/users');
const approvalsRoutes       = require('./routes/approvals');
const templatesRoute        = require('./routes/templates');
const formViewsRoute        = require('./routes/formViews');
const workflowsRoute        = require('./routes/workflows');
const enquiriesRoute        = require('./routes/enquiries');
const businessPartnerRoutes = require('./routes/businesspartner');
const tableRoutes           = require('./routes/table');
const template              = require('./routes/template');
const uploadRoutes          = require('./routes/upload');
const formRoutes            = require('./routes/forms');
const formviewsRoutes       = require('./routes/formviews');


// ───────────────────────────────────────────────────────────────────────────────
// CORS (allowlist)
const ALLOW_ORIGINS = [process.env.CLIENT_ORIGIN || 'http://localhost:3000'];
app.use(
  cors({
    origin: ALLOW_ORIGINS,
    credentials: true,
  })
);

// Security headers + performance helpers
app.use(helmet());
app.use(compression());
app.use(responseTime());

// Rate limiting for all /api
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// ── Start the agent once on boot, and the watcher in dev
require('../agent/chowkidar');
if (process.env.NODE_ENV !== 'production') {
  require('../agent/fileWatcher');
}

// ── Public/unauth routes BEFORE auth gate
app.use('/api/auth', authRoutes);
app.use('/api/templates', templatesRoute);
app.use('/api/template', template);

// (Optional) health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Global auth gate for /api (everything below requires a valid token)
app.use('/api', (req, res, next) => {
  const p = req.path || '';
  // Already public above: /auth*, /template*, /templates*, /chowkidar*
  if (
    p.startsWith('/auth') ||
    p.startsWith('/template') ||
    p.startsWith('/templates') ||
    p.startsWith('/chowkidar') ||
    p.startsWith('/health')
  ) {
    return next();
  }
  return verifyToken(req, res, next);
});

// ── Routes that require auth but NOT a module subscription
// (e.g., managing a user’s own subscriptions, uploads, etc.)
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRoutes); // keep outside subscription to avoid bootstrapping deadlock

// ── Module-gated routes (subscription checks at MOUNT time)
// Choose module keys that MATCH your DB values in subscriptions.module

// Enquiries module
app.use('/api/enquiries', checkSubscription('Enquiries'), enquiriesRoute);
// app.use('/api/enquiries', checkSubscription('Enquiries'), enquiriesRoute);

// Approvals module
app.use('/api/approvals', checkSubscription('Approvals'), approvalsRoutes);

// Workflows module
//app.use('/api/workflows', checkSubscription('Workflows'), workflowsRoute);

// Form Builder module (covers form config + tables + runtime formviews)
app.use('/api/formconfig', checkSubscription('forms'), formRoutes);
app.use('/api/table',      checkSubscription('forms'), tableRoutes);
app.use('/api/form-views', checkSubscription('forms'), formViewsRoute);
app.use('/api/formviews',  checkSubscription('forms'), formviewsRoutes);

// (Optional) CRM/BP module — only gate if you have a subscription for it
// app.use('/api/businesspartner', checkSubscription('BusinessPartner'), businessPartnerRoutes);
app.use('/api/businesspartner', businessPartnerRoutes);

// ── TEST / UTILITY ROUTES (authenticated)
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

// ── WebSocket server
const server = http.createServer(app);
const { Server } = require('ws');
const wss = new Server({ server });

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  ws.send('👋 Hello from WebSocket server!');
  ws.on('message', (message) => console.log('📨 Received via WS:', message));
  ws.on('close', () => console.log('❌ WebSocket client disconnected'));
});

// ── Centralized error handler (keep last)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

