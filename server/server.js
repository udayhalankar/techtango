require('dotenv').config();
const express = require('express');
const app = express();

// 1) Mount Chowkidar FIRST (it doesn’t need JSON body parsing)
app.use('/api/chowkidar', require('./routes/chowkidar'));

// 2) Now enable JSON for other routes
app.use(express.json());

//monitoring protocol
const helmet = require('helmet');

//monitoring protocol
const cors = require('cors');
const http = require('http');
// const { Server } = require('ws');
const pool = require('./db');

const authRoutes         = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');
const usersRoutes        = require('./routes/users');
const approvalsRoutes    = require('./routes/approvals');
const templatesRoute     = require('./routes/templates');

const formViewsRoute     = require("./routes/formViews");
const workflowsRoute     = require('./routes/workflows');
const enquiriesRoute     = require('./routes/enquiries'); // 👈 make sure this matches filename
const businessPartnerRoutes = require('./routes/businesspartner');
const tableRoutes        = require('./routes/table'); // ✅ Import your route file
const template           = require('./routes/template')
const uploadRoutes       = require('./routes/upload');
const formRoutes         = require('./routes/forms');
const formviewsRoutes    = require('./routes/formviews');

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
// app.use(cors());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, // if using cookies or auth headers
}));

//monitoring protocol
app.use(helmet());
//monitoring protocol

// Run a full scan once on boot (optional)
require('../agent/chowkidar');

// Start watcher in dev
if (process.env.NODE_ENV !== 'production') {
  require('../agent/fileWatcher');
  // run one full scan on boot (non-blocking)
}

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/workflows', workflowsRoute);
app.use('/api/enquiries', enquiriesRoute);             // 👈 this defines the URL path
app.use("/api/form-views", formViewsRoute);
// ADD this (safe, specific prefix):
app.use("/api/formviews", formviewsRoutes);
app.use('/api/businesspartner', businessPartnerRoutes);
app.use('/api/templates', templatesRoute); // <-- mounts the endpoint
app.use('/api/template', template);        // <-- mounts the endpoint
app.use('/api/upload', uploadRoutes);
app.use('/api/formconfig', formRoutes);
// app.use('/api', formviewsRoutes);

// ⛔ IMPORTANT: DO NOT forward *all* /api traffic into formviewsRoutes.
// It causes /api/chowkidar to be treated as an :id.
// ✅ Instead, only forward /api/formviews/* into that router:
app.use('/api', (req, res, next) => {
  if (!req.path.startsWith('/formviews')) return next();  // let other /api routes handle it
  return formviewsRoutes(req, res, next);                 // only /api/formviews/* goes here
});

// ❗ Please remove this line below to prevent route collisions:
// app.use('/api', formviewsRoutes);

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
const { Server } = require('ws'); // ensure this require is present after http server creation
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


// require('dotenv').config();
// const express = require('express');

// //monitoring protocol
// const helmet = require('helmet');


// //monitoring protocol

// const cors = require('cors');
// const http = require('http');
// const { Server } = require('ws');
// const pool = require('./db');

// const authRoutes         = require('./routes/auth');
// const subscriptionRoutes = require('./routes/subscription');
// const usersRoutes        = require('./routes/users');
// const approvalsRoutes    = require('./routes/approvals');
// const templatesRoute = require('./routes/templates');

// const app = express();
// const formViewsRoute = require("./routes/formViews");
// const workflowsRoute = require('./routes/workflows');
// const enquiriesRoute = require('./routes/enquiries'); // 👈 make sure this matches filename
// const businessPartnerRoutes = require('./routes/businesspartner');
// const tableRoutes = require('./routes/table'); // ✅ Import your route file
// const template = require('./routes/template')
// const uploadRoutes = require('./routes/upload');
// const formRoutes = require('./routes/forms');
// const formviewsRoutes = require('./routes/formviews');

// // ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
// // app.use(cors());
// app.use(cors({
//   origin: 'http://localhost:3000',
//   credentials: true, // if using cookies or auth headers
// }));

// app.use(express.json());

// //monitoring protocol
// app.use(helmet());
// //monitoring protocol

//  require('../agent/chowkidar');
 
// // Start watcher in dev
// if (process.env.NODE_ENV !== 'production') {
//   require('../agent/fileWatcher');
//   // run one full scan on boot (non-blocking)
 
// }

// // ─── API ROUTES ───────────────────────────────────────────────────────────────
// app.use('/api/auth', authRoutes);
// app.use('/api/subscription', subscriptionRoutes);
// app.use('/api/users', usersRoutes);
// app.use('/api/approvals', approvalsRoutes);
// app.use('/api/workflows', workflowsRoute);
// app.use('/api/enquiries', enquiriesRoute);             // 👈 this defines the URL path
// app.use("/api/form-views", formViewsRoute);
// app.use('/api/businesspartner', businessPartnerRoutes);
// app.use('/api/templates', templatesRoute); // <-- mounts the endpoint
// app.use('/api/template', template); // <-- mounts the endpoint
// app.use('/api/upload', uploadRoutes);
// app.use('/api/formconfig', formRoutes);
// // app.use('/api', formviewsRoutes);


// // ─── TEST ROUTES ──────────────────────────────────────────────────────────────
// app.get('/', (req, res) => {
//   res.send('OK');
// });

// // ✅ Register the route under /api/table
// app.use('/api/table', tableRoutes);

// // 🔍 Optional: add /api/subscriptions list if still needed
// app.get('/api/subscriptions', async (req, res) => {
//   try {
//     const { rows } = await pool.query('SELECT * FROM subscriptions'); 
//     return res.json(rows);
//   } catch (err) {
//     console.error('Subscriptions error:', err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// app.get('/api/todos', async (req, res) => {
//   try {
//     const { rows } = await pool.query('SELECT * FROM todo');
//     res.json(rows);
//   } catch (err) {
//     console.error('GET /api/todos error:', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// // ─── WEBSOCKET SERVER SETUP ───────────────────────────────────────────────────
// const server = http.createServer(app);
// const wss = new Server({ server });

// wss.on('connection', ws => {
//   console.log('🔌 WebSocket client connected');
//   ws.send('👋 Hello from WebSocket server!');

//   ws.on('message', message => {
//     console.log('📨 Received via WS:', message);
//   });

//   ws.on('close', () => {
//     console.log('❌ WebSocket client disconnected');
//   });
// });

// // ─── START SERVER ─────────────────────────────────────────────────────────────
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`🚀 Server listening on port ${PORT}`);
// });
