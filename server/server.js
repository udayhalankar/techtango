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

// Approvals module
app.use('/api/approvals', checkSubscription('Approvals'), approvalsRoutes);

// Workflows module
app.use('/api/workflows', checkSubscription('Workflows'), workflowsRoute);

// Form Builder module (covers form config + tables + runtime formviews)
app.use('/api/formconfig', checkSubscription('FormBuilder'), formRoutes);
app.use('/api/table',      checkSubscription('FormBuilder'), tableRoutes);
app.use('/api/form-views', checkSubscription('FormBuilder'), formViewsRoute);
app.use('/api/formviews',  checkSubscription('FormBuilder'), formviewsRoutes);

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


// // server/server.js
// require('dotenv').config();

// const express = require('express');
// const app = express();

// // ── Mount Chowkidar FIRST (no JSON body parsing needed)
// app.use('/api/chowkidar', require('./routes/chowkidar'));

// // ── JSON body AFTER chowkidar
// app.use(express.json());

// // ── Security / Perf middleware
// const helmet = require('helmet');
// const cors = require('cors');
// const compression = require('compression');
// const responseTime = require('response-time');
// const rateLimit = require('express-rate-limit');

// // ── Auth / Subscription
// const { verifyToken } = require('./middleware/authMiddleware');
// const { checkSubscription } = require('./middleware/checkSubscription'); // keep import available

// // ── HTTP / WS
// const http = require('http');
// const pool = require('./db');

// // ── Routers
// const authRoutes            = require('./routes/auth');
// const subscriptionRoutes    = require('./routes/subscription');
// const usersRoutes           = require('./routes/users');
// const approvalsRoutes       = require('./routes/approvals');
// const templatesRoute        = require('./routes/templates');
// const formViewsRoute        = require('./routes/formViews');
// const workflowsRoute        = require('./routes/workflows');
// const enquiriesRoute        = require('./routes/enquiries');
// const businessPartnerRoutes = require('./routes/businesspartner');
// const tableRoutes           = require('./routes/table');
// const template              = require('./routes/template');
// const uploadRoutes          = require('./routes/upload');
// const formRoutes            = require('./routes/forms');
// const formviewsRoutes       = require('./routes/formviews');

// // ───────────────────────────────────────────────────────────────────────────────
// // CORS (allowlist)
// const ALLOW_ORIGINS = [process.env.CLIENT_ORIGIN || 'http://localhost:3000'];
// app.use(
//   cors({
//     origin: ALLOW_ORIGINS,
//     credentials: true,
//   })
// );

// // Security headers + performance helpers
// app.use(helmet());
// app.use(compression());
// app.use(responseTime());

// // Rate limiting for all /api
// const apiLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 1000,
//   standardHeaders: true,
//   legacyHeaders: false,
// });
// app.use('/api', apiLimiter);

// // ── Start the agent once on boot, and the watcher in dev
// require('../agent/chowkidar');
// if (process.env.NODE_ENV !== 'production') {
//   require('../agent/fileWatcher');
// }

// // ── Global auth gate for /api (leave public routes before this gate)
// app.use('/api', (req, res, next) => {
//   // Public exceptions:
//   //  - /auth*            (login/register/etc.)
//   //  - /template*        (your existing public endpoints)
//   //  - /templates*
//   //  - /chowkidar*       (dashboard data)
//   const p = req.path || '';
//   if (
//     p.startsWith('/auth') ||
//     p.startsWith('/template') ||
//     p.startsWith('/templates') ||
//     p.startsWith('/chowkidar')
//   ) {
//     return next();
//   }
//   return verifyToken(req, res, next);
// });

// // ── API ROUTES
// app.use('/api/auth', authRoutes);
// app.use('/api/subscription', subscriptionRoutes);
// app.use('/api/users', usersRoutes);
// app.use('/api/approvals', approvalsRoutes);
// app.use('/api/workflows', workflowsRoute);
// app.use('/api/enquiries', enquiriesRoute);
// app.use('/api/form-views', formViewsRoute);
// app.use('/api/formviews', formviewsRoutes); // mount only under this prefix
// app.use('/api/businesspartner', businessPartnerRoutes);
// app.use('/api/templates', templatesRoute);
// app.use('/api/template', template);
// app.use('/api/upload', uploadRoutes);
// app.use('/api/formconfig', formRoutes);

// // ── TEST / UTILITY ROUTES
// app.get('/', (req, res) => res.send('OK'));

// app.use('/api/table', tableRoutes);

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

// // ── WebSocket server
// const server = http.createServer(app);
// const { Server } = require('ws');
// const wss = new Server({ server });

// wss.on('connection', (ws) => {
//   console.log('🔌 WebSocket client connected');
//   ws.send('👋 Hello from WebSocket server!');
//   ws.on('message', (message) => console.log('📨 Received via WS:', message));
//   ws.on('close', () => console.log('❌ WebSocket client disconnected'));
// });

// // ── Centralized error handler (keep last)
// app.use((err, req, res, next) => {
//   console.error('Unhandled error:', err);
//   res.status(500).json({ error: 'Internal server error' });
// });

// // ── Start server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`🚀 Server listening on port ${PORT}`);
// });



// // require('dotenv').config();
// // const express = require('express');
// // const app = express();

// // // 1) Mount Chowkidar FIRST (it doesn’t need JSON body parsing)
// // app.use('/api/chowkidar', require('./routes/chowkidar'));
// // // 2) Now enable JSON for other routes -  JSON body after chowkidar
// // app.use(express.json());

// // //monitoring protocol
// // const helmet = require('helmet');
// // const cors = require('cors');
// // const compression = require('compression');
// // const responseTime = require('response-time');
// // const rateLimit = require('express-rate-limit');
// // const { verifyToken } = require('./middleware/authMiddleware');
// // const { checkSubscription } = require('./middleware/checkSubscription'); // add this if not present

// // //monitoring protocol

// // const http = require('http');
// // // const { Server } = require('ws');
// // const pool = require('./db');

// // const authRoutes         = require('./routes/auth');
// // const subscriptionRoutes = require('./routes/subscription');
// // const usersRoutes        = require('./routes/users');
// // const approvalsRoutes    = require('./routes/approvals');
// // const templatesRoute     = require('./routes/templates');

// // const formViewsRoute     = require("./routes/formViews");
// // const workflowsRoute     = require('./routes/workflows');
// // const enquiriesRoute     = require('./routes/enquiries'); // 👈 make sure this matches filename
// // const businessPartnerRoutes = require('./routes/businesspartner');
// // const tableRoutes        = require('./routes/table'); // ✅ Import your route file
// // const template           = require('./routes/template')
// // const uploadRoutes       = require('./routes/upload');
// // const formRoutes         = require('./routes/forms');
// // const formviewsRoutes    = require('./routes/formviews');
// // const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 1000, standardHeaders: true, legacyHeaders: false });


// // // ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
// // // app.use(cors());
// // app.use(cors({
// //   origin: 'http://localhost:3000',
// //   credentials: true, // if using cookies or auth headers
// // }));

// // // 1) CORS allowlist (edit domains as needed)
// // const ALLOW_ORIGINS = ['http://localhost:3000'];
// // app.use(cors({ origin: ALLOW_ORIGINS, credentials: true }));

// // //monitoring protocol
// // app.use(helmet());
// // app.use(compression());
// // app.use(responseTime());
// // //monitoring protocol

// // // Run a full scan once on boot (optional)
// // require('../agent/chowkidar');

// // // Start watcher in dev
// // if (process.env.NODE_ENV !== 'production') {
// //   require('../agent/fileWatcher');
// //   // run one full scan on boot (non-blocking)
// // }

// // // ─── API ROUTES ───────────────────────────────────────────────────────────────
// // // 4) Global auth gate for API (leave public routes before this gate)
// // app.use('/api', (req, res, next) => {
// //   // public exceptions
// //   if (req.path.startsWith('/auth') || req.path.startsWith('/template') || req.path.startsWith('/templates')) {
// //     return next();
// //   }
// //   return verifyToken(req, res, next);
// // });

// // app.use('/api/auth', authRoutes);
// // app.use('/api/subscription', subscriptionRoutes);
// // app.use('/api/users', usersRoutes);
// // app.use('/api/approvals', approvalsRoutes);
// // app.use('/api/workflows', workflowsRoute);
// // app.use('/api/enquiries', enquiriesRoute);             // 👈 this defines the URL path
// // app.use("/api/form-views", formViewsRoute);
// // // ADD this (safe, specific prefix):
// // app.use("/api/formviews", formviewsRoutes);
// // app.use('/api/businesspartner', businessPartnerRoutes);
// // app.use('/api/templates', templatesRoute); // <-- mounts the endpoint
// // app.use('/api/template', template);        // <-- mounts the endpoint
// // app.use('/api/upload', uploadRoutes);
// // app.use('/api/formconfig', formRoutes);
// // // app.use('/api', formviewsRoutes);

// // // ⛔ IMPORTANT: DO NOT forward *all* /api traffic into formviewsRoutes.
// // // It causes /api/chowkidar to be treated as an :id.
// // // ✅ Instead, only forward /api/formviews/* into that router:
// // app.use('/api', (req, res, next) => {
// //   if (!req.path.startsWith('/formviews')) return next();  // let other /api routes handle it
// //   return formviewsRoutes(req, res, next);                 // only /api/formviews/* goes here
// // });

// // // ❗ Please remove this line below to prevent route collisions:
// // // app.use('/api', formviewsRoutes);



// // // ─── TEST ROUTES ──────────────────────────────────────────────────────────────
// // app.get('/', (req, res) => {
// //   res.send('OK');
// // });

// // // ✅ Register the route under /api/table
// // app.use('/api/table', tableRoutes);

// // // 🔍 Optional: add /api/subscriptions list if still needed
// // app.get('/api/subscriptions', async (req, res) => {
// //   try {
// //     const { rows } = await pool.query('SELECT * FROM subscriptions'); 
// //     return res.json(rows);
// //   } catch (err) {
// //     console.error('Subscriptions error:', err);
// //     return res.status(500).json({ error: err.message });
// //   }
// // });

// // app.get('/api/todos', async (req, res) => {
// //   try {
// //     const { rows } = await pool.query('SELECT * FROM todo');
// //     res.json(rows);
// //   } catch (err) {
// //     console.error('GET /api/todos error:', err);
// //     res.status(500).json({ error: 'Server error' });
// //   }
// // });

// // // ─── WEBSOCKET SERVER SETUP ───────────────────────────────────────────────────
// // const server = http.createServer(app);
// // const { Server } = require('ws'); // ensure this require is present after http server creation
// // const wss = new Server({ server });

// // wss.on('connection', ws => {
// //   console.log('🔌 WebSocket client connected');
// //   ws.send('👋 Hello from WebSocket server!');

// //   ws.on('message', message => {
// //     console.log('📨 Received via WS:', message);
// //   });

// //   ws.on('close', () => {
// //     console.log('❌ WebSocket client disconnected');
// //   });
// // });


// // // server.js (bottom, after routes)
// // app.use((err, req, res, next) => {
// //   console.error('Unhandled error:', err);
// //   res.status(500).json({ error: 'Internal server error' });
// // });

// // // ─── START SERVER ─────────────────────────────────────────────────────────────
// // const PORT = process.env.PORT || 5000;
// // server.listen(PORT, () => {
// //   console.log(`🚀 Server listening on port ${PORT}`);
// // });


// // // require('dotenv').config();
// // // const express = require('express');

// // // //monitoring protocol
// // // const helmet = require('helmet');


// // // //monitoring protocol

// // // const cors = require('cors');
// // // const http = require('http');
// // // const { Server } = require('ws');
// // // const pool = require('./db');

// // // const authRoutes         = require('./routes/auth');
// // // const subscriptionRoutes = require('./routes/subscription');
// // // const usersRoutes        = require('./routes/users');
// // // const approvalsRoutes    = require('./routes/approvals');
// // // const templatesRoute = require('./routes/templates');

// // // const app = express();
// // // const formViewsRoute = require("./routes/formViews");
// // // const workflowsRoute = require('./routes/workflows');
// // // const enquiriesRoute = require('./routes/enquiries'); // 👈 make sure this matches filename
// // // const businessPartnerRoutes = require('./routes/businesspartner');
// // // const tableRoutes = require('./routes/table'); // ✅ Import your route file
// // // const template = require('./routes/template')
// // // const uploadRoutes = require('./routes/upload');
// // // const formRoutes = require('./routes/forms');
// // // const formviewsRoutes = require('./routes/formviews');

// // // // ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
// // // // app.use(cors());
// // // app.use(cors({
// // //   origin: 'http://localhost:3000',
// // //   credentials: true, // if using cookies or auth headers
// // // }));

// // // app.use(express.json());

// // // //monitoring protocol
// // // app.use(helmet());
// // // //monitoring protocol

// // //  require('../agent/chowkidar');
 
// // // // Start watcher in dev
// // // if (process.env.NODE_ENV !== 'production') {
// // //   require('../agent/fileWatcher');
// // //   // run one full scan on boot (non-blocking)
 
// // // }

// // // // ─── API ROUTES ───────────────────────────────────────────────────────────────
// // // app.use('/api/auth', authRoutes);
// // // app.use('/api/subscription', subscriptionRoutes);
// // // app.use('/api/users', usersRoutes);
// // // app.use('/api/approvals', approvalsRoutes);
// // // app.use('/api/workflows', workflowsRoute);
// // // app.use('/api/enquiries', enquiriesRoute);             // 👈 this defines the URL path
// // // app.use("/api/form-views", formViewsRoute);
// // // app.use('/api/businesspartner', businessPartnerRoutes);
// // // app.use('/api/templates', templatesRoute); // <-- mounts the endpoint
// // // app.use('/api/template', template); // <-- mounts the endpoint
// // // app.use('/api/upload', uploadRoutes);
// // // app.use('/api/formconfig', formRoutes);
// // // // app.use('/api', formviewsRoutes);


// // // // ─── TEST ROUTES ──────────────────────────────────────────────────────────────
// // // app.get('/', (req, res) => {
// // //   res.send('OK');
// // // });

// // // // ✅ Register the route under /api/table
// // // app.use('/api/table', tableRoutes);

// // // // 🔍 Optional: add /api/subscriptions list if still needed
// // // app.get('/api/subscriptions', async (req, res) => {
// // //   try {
// // //     const { rows } = await pool.query('SELECT * FROM subscriptions'); 
// // //     return res.json(rows);
// // //   } catch (err) {
// // //     console.error('Subscriptions error:', err);
// // //     return res.status(500).json({ error: err.message });
// // //   }
// // // });

// // // app.get('/api/todos', async (req, res) => {
// // //   try {
// // //     const { rows } = await pool.query('SELECT * FROM todo');
// // //     res.json(rows);
// // //   } catch (err) {
// // //     console.error('GET /api/todos error:', err);
// // //     res.status(500).json({ error: 'Server error' });
// // //   }
// // // });

// // // // ─── WEBSOCKET SERVER SETUP ───────────────────────────────────────────────────
// // // const server = http.createServer(app);
// // // const wss = new Server({ server });

// // // wss.on('connection', ws => {
// // //   console.log('🔌 WebSocket client connected');
// // //   ws.send('👋 Hello from WebSocket server!');

// // //   ws.on('message', message => {
// // //     console.log('📨 Received via WS:', message);
// // //   });

// // //   ws.on('close', () => {
// // //     console.log('❌ WebSocket client disconnected');
// // //   });
// // // });

// // // // ─── START SERVER ─────────────────────────────────────────────────────────────
// // // const PORT = process.env.PORT || 5000;
// // // server.listen(PORT, () => {
// // //   console.log(`🚀 Server listening on port ${PORT}`);
// // // });
