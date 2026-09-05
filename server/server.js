// server/server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

console.log('[boot] SMTP config', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER || process.env.EMAIL_USER,
});

const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const responseTime = require('response-time');
const rateLimit = require('express-rate-limit');
const http = require('http');

// ───────────────────────────────────────────────────────────────────────────────
// 1) Merge DB env from config/dbconfig.json — BEFORE requiring ./db
(function mergeDbEnvEarly() {
  try {
    const cfgPath = path.join(__dirname, 'config', 'dbconfig.json');
    let raw = fs.readFileSync(cfgPath, 'utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    const cfg = JSON.parse(raw || '{}');

    const isPlaceholder = v =>
      v === undefined || v === null || String(v).trim() === '' ||
      v === 'YOUR_DB_USER' || v === 'YOUR_DB_NAME' || v === 'YOUR_DB_PASSWORD';

    if (isPlaceholder(process.env.DB_USER)     && !isPlaceholder(cfg.DB_USER))     process.env.DB_USER = String(cfg.DB_USER);
    if (isPlaceholder(process.env.DB_NAME)     && !isPlaceholder(cfg.DB_NAME))     process.env.DB_NAME = String(cfg.DB_NAME);
    if (isPlaceholder(process.env.DB_HOST)     && !isPlaceholder(cfg.DB_HOST))     process.env.DB_HOST = String(cfg.DB_HOST);
    if (isPlaceholder(process.env.DB_PASSWORD) && !isPlaceholder(cfg.DB_PASSWORD)) process.env.DB_PASSWORD = String(cfg.DB_PASSWORD);
    if (isPlaceholder(process.env.DB_PORT)     && !isPlaceholder(cfg.DB_PORT))     process.env.DB_PORT = String(cfg.DB_PORT);
    if (process.env.DB_SSL === undefined && cfg.DB_SSL !== undefined)              process.env.DB_SSL = String(cfg.DB_SSL);

    console.log('[boot] DB env merged', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      hasPassword: !!(process.env.DB_PASSWORD || '').length
    });
  } catch (e) {
    console.warn('[boot] Could not merge dbconfig.json:', e.message);
  }
})();

// ───────────────────────────────────────────────────────────────────────────────
// 2) App & core middleware (CORS/security/body parsers BEFORE routes)
const app = express();
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

const configuredOrigins = String(process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const fallbackOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3008',
  'http://127.0.0.1:3008',
];
const allowedOrigins = [...new Set([...configuredOrigins, ...fallbackOrigins])];

function isAllowedDevOrigin(origin) {
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(String(origin || ''));
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && isAllowedDevOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Last-Activity'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

app.use(helmet());
app.use(compression());
app.use(responseTime());

app.use(express.json( { limit: '10mb' } ));
app.use(express.urlencoded({ extended: true }));

// ───────────────────────────────────────────────────────────────────────────────
// 3) DB clients (require AFTER env merged)
const pool = require('./db');

// Optional: immediate pool check at boot
pool.query('SELECT 1')
  .then(() => console.log('[pg] OK'))
  .catch(e => console.error('[pg] FAIL', e.message));

// 4) Sequelize (lazy & gated)
const { isEnabled, createSequelize, testSequelize } = require('./sequelize');
let sequelize = null;
let models = {};
(async () => {
  if (isEnabled()) {
    const orm = createSequelize();
    sequelize = orm?.sequelize || null;
    models = orm?.models || {};
    try { await testSequelize(sequelize); console.log('[sequelize] OK'); }
    catch (e) { console.error('❌ [sequelize] FAIL:', e.message); }
  } else {
    console.log('[sequelize] disabled (USE_SEQUELIZE=false)');
  }
})();

// Make ORM handles available to all routes
app.use((req, _res, next) => {
  req.db = { sequelize, models };

  const p = req.path || '';
  if (
    p.startsWith('/api/auth/me') ||
    p.startsWith('/api/db') ||
    p.startsWith('/api/simple_workflowbuilder')
  ) {
    console.log(`[TRACE] ${req.method} ${req.originalUrl} auth=${!!req.headers.authorization}`);
  }
  next();
});


// app.get('/api/simple_workflowbuilder/__echo', (req, res) => {
//   console.log('[SWB __echo] ok auth=', !!req.headers.authorization);
//   res.json({ ok: true, at: Date.now() });
// });


// ───────────────────────────────────────────────────────────────────────────────
// 5) Health & diagnostics (PUBLIC and BEFORE auth gate)
app.use('/api/health', require('./routes/health'));
app.get('/health', (_req, res) => res.send('OK'));
app.use('/api/db', require('./routes/dbdiag'));
app.use('/api/db', require('./routes/dbcolumns'));

// ───────────────────────────────────────────────────────────────────────────────
// 6) Route helpers
const getRouter = (mod, name = 'router') => {
  const r =
    (typeof mod === 'function' && mod) ||
    (mod && typeof mod.default === 'function' && mod.default) ||
    (mod && typeof mod.router === 'function' && mod.router) ||
    null;
  if (!r) console.error(`[BOOT] ${name}: invalid export (expected a router function).`);
  return r;
};


// Routers (import once)
const authRoutes            = getRouter(require('./routes/auth'),            'auth');
const subscriptionRoutes    = getRouter(require('./routes/subscription'),    'subscription');
const usersRoutes           = getRouter(require('./routes/users'),           'users');
const approvalsRoutes       = getRouter(require('./routes/approvals'),       'approvals');
const templatesRoute        = getRouter(require('./routes/templates'),       'templates');
const formViewsRoute        = getRouter(require('./routes/formViews'),       'formViews');
const workflowsRoute        = getRouter(require('./routes/workflows'),       'workflows');
const enquiriesRoute        = getRouter(require('./routes/enquiries'),       'enquiries');
const businessPartnerRoutes = getRouter(require('./routes/businesspartner'), 'businesspartner');
const tablesRouter          = getRouter(require('./routes/table'),           'table');
const templateRoute         = getRouter(require('./routes/template'),        'template');
const uploadRoutes          = getRouter(require('./routes/upload'),          'upload');
const formRoutes            = getRouter(require('./routes/forms'),           'forms');
const formviewsRoutes       = getRouter(require('./routes/formViews'),       'formviews');
const chowkidarRoutes       = getRouter(require('./routes/chowkidar'),       'chowkidar');
const formdataRoutes        = getRouter(require('./routes/formdata'),        'formdata');
const tableConfigsRoutes    = getRouter(require('./routes/tableConfigs'),    'tableConfigs');
const formConfigsRoutes     = getRouter(require('./routes/formConfigs'),     'formConfigs');
const canvasConfigsRoutes   = getRouter(require('./routes/canvasConfigs'),   'canvasConfigs');
const assignmentsRouter     = getRouter(require('./routes/assignments'),     'assignments');
const wfAssignmentsRoutes   = require('./routes/workflows/assignmentsWf');
const wfAdvanceRoutes       = require('./routes/workflows/advance');
const dbmetaRoutes          = getRouter(require('./routes/dbmeta'),          'dbmeta');
const chartConfigsRoutes    = getRouter(require('./routes/chartConfigs'),    'chartConfigs');
const wfSequelizeRoutes     = getRouter(require('./routes/workflows.sequelize'), 'workflows.sequelize');
const seqRoutes             = getRouter(require('./routes/seq'), 'seq');
const crudPagesRoutes       = require('./routes/crudpages');
const dashboardBuilderRoutes = require('./routes/dashboardbuilder');
const dashboardWidgetsRoutes = require('./routes/dashboardwidgets');
const dashboardLayoutsRoutes = require('./routes/dashboardlayouts');
const experienceBuilderRoutes = require('./routes/experiencebuilder');
const experienceLayoutsRoutes = require('./routes/experiencelayouts');
const experienceBuilderAiRoutes = require('./routes/experiencebuilder-ai');
const aiAppBuilderRoutes = require('./routes/aiappbuilder');

// AI Simple Application Builder
const aiSimpleAppBuilderRoutes = require('./routes/aiSimpleAppBuilderRoutes');
//const swbRoutes             = getRouter(require('./routes/simple_workflowbuilder'), 'simple_workflowbuilder');
//const swbStepsRoutes        = getRouter(require('./routes/simple_workflowbuilder_steps'), 'simple_workflowbuilder_steps');
const swfiRoutes            = getRouter(require('./routes/simple_workflow_instances'), 'simple_workflow_instances');
// header routes (list/create/get/delete)
const swbHeaderRoutes = require('./routes/simple_workflowbuilder');
// step routes (list/bulk/patch)
const swbStepRoutes   = require('./routes/simple_workflowbuilder_steps');
const tableRows = require("./routes/tableRows");
// server/index.js or wherever you configure routes
const approvalFilesRouter = require('./routes/approvalFiles');
const simpleWorkflowbuilderFormViewsRouter = require('./routes/simple_workflowbuilder_formviews');
const simpleWorkflowMapViewsRouter = require('./routes/simple_workflowmap_views');



// ───────────────────────────────────────────────────────────────────────────────
// 7) Targeted TRACE + per-route timeout for /auth/login (diagnostics)
app.use('/api/auth/login', (req, res, next) => {
  console.log(`[TRACE] /api/auth/login ENTER ${req.method} @ ${new Date().toISOString()}`);
  res.setTimeout(12_000, () => {
    if (!res.headersSent) {
      console.warn('[TRACE] /api/auth/login TIMED OUT (12s)');
      res.status(504).json({ error: 'Login timed out' });
    }
  });
  res.once('finish', () => {
    console.log(`[TRACE] /api/auth/login EXIT ${res.statusCode}`);
  });
  next();
});

// Optional: quick echo to prove pipeline (comment out after debugging)
// app.post('/api/auth/login', (req, res) => res.json({ echo: req.body, ok: true }));

// Small one-off logger BEFORE mounting authRoutes
app.post('/api/auth/login', (req, _res, next) => {
  console.log('[LOGIN] INCOMING', { contentType: req.headers['content-type'], body: req.body });
  next();
});

app.post('/api/simple_workflowbuilder/__echo', (req, res) => {
  console.log('[SWB:__echo]', req.body);
  res.json({ ok: true, got: req.body });
});

// ───────────────────────────────────────────────────────────────────────────────
// 8) PUBLIC routes (NO TOKEN) — mount BEFORE auth gate
if (authRoutes)         app.use('/api/auth', authRoutes);          // login lives here
if (chowkidarRoutes)    app.use('/api/chowkidar', chowkidarRoutes);
app.use('/api/catalog', require('./routes/catalog'));
if (templatesRoute)     app.use('/api/templates', templatesRoute);
if (templateRoute)      app.use('/api/template', templateRoute);
if (tablesRouter)       app.use('/api/tables', tablesRouter);
if (dbmetaRoutes)       app.use('/api/db', dbmetaRoutes);
if (chartConfigsRoutes) app.use('/api/chart-configs', chartConfigsRoutes);
if (seqRoutes)          app.use('/api/seq', seqRoutes); // sequelize demo/health
app.use('/api/dashboardbuilder', dashboardBuilderRoutes);
app.use('/api/dashboardwidgets', dashboardWidgetsRoutes);
app.use('/api/dashboardlayouts', dashboardLayoutsRoutes);

// 9) Rate limit for all /api
// 9) Rate limit for all /api (but skip some internal-heavy endpoints)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', (req, res, next) => {
  const p = req.path || '';

  // 🔹 Skip rate limiting for column metadata endpoints
  //   - /api/table/columns/:table
  //   - /api/db/columns/:table    (if you use that too)
  if (
    p.startsWith('/tables/columns') ||
    p.startsWith('/table/columns') ||   // if used anywhere
    p.startsWith('/db/columns') ||
    p.startsWith('/simple_workflowbuilder') ||
    p.startsWith('/simple_workflowbuilder_formviews') ||
    p.startsWith('/formviews') ||
    p.startsWith('/form-views') ||
    p.startsWith('/crudpages') ||
    p.startsWith('/table-configs') ||
    p.startsWith('/table-config') ||
    p.startsWith('/form-configs') ||
    p.startsWith('/formdata') ||
    p.startsWith('/db')            
  ) {
    return next();
  }

  // everything else under /api is rate-limited
  return apiLimiter(req, res, next);
});


// ───────────────────────────────────────────────────────────────────────────────
// 10) Global AUTH gate (everything below needs token)
const rmUiRouter        = require('./rm/rm');
const rmConfigRouter    = require('./physicalrecords/rmconfig/routes');
const registerRoutes    = require('./physicalrecords/registerfile/routes');
const { verifyToken }   = require('./middleware/authMiddleware');
const { checkSubscription } = require('./middleware/checkSubscription');
const { tenantContext } = require('./middleware/tenantContext');



app.use('/api', (req, res, next) => {
  const p = req.path || '';
  if (
    p.startsWith('/auth') ||
    p.startsWith('/health') ||
    p.startsWith('/chowkidar') ||
    p.startsWith('/catalog') ||
    p.startsWith('/tables') ||
    p.startsWith('/template') ||
    p.startsWith('/templates') ||
    p.startsWith('/db') ||
    p.startsWith('/chart-configs') ||
    p.startsWith('/seq')
  ) return next();
  return verifyToken(req, res, next);
});

// Seed tenant context for all authenticated API requests so downstream
// routes and tenant-aware helpers can rely on a consistent request shape.
app.use('/api', tenantContext({ requireTenant: false, allowAdminBypass: true }));

// 11) PROTECTED routes (will verify token and check subscription)
app.use("/api/physicalrecords", checkSubscription('RMS'), require("./physicalrecords/routes"));
app.use("/api/rmrequest", checkSubscription('RMS'), require("./physicalrecords/rmrequest/routes"));
app.use("/api/rmteam", verifyToken, checkSubscription('RMS'), require("./physicalrecords/rmteam/routes"));
app.use("/api/rmassignments", verifyToken, checkSubscription('RMS'), require("./physicalrecords/rmassignments/routes"));
app.use('/api/rm/register', verifyToken, checkSubscription('RMS'), registerRoutes);
app.use('/api/rmconfig', verifyToken, checkSubscription('RMS'), rmConfigRouter);
app.use('/api/rm', verifyToken, checkSubscription('RMS'), rmUiRouter);
app.use("/api/processing", checkSubscription('RMS'), require("./physicalrecords/processing/routes"));
// 🟢 SWB mounts (only once; after the auth gate so they require a token)
app.use('/api/simple_workflowbuilder', swbHeaderRoutes);
app.use('/api/simple_workflowbuilder/steps', swbStepRoutes()); // ✅ invoke it
app.get('/api/simple_workflowbuilder/__echo', (req,res)=>res.json({ok:true,at:Date.now()}));
app.use("/api/table", tableRows);
app.use('/api/upload', require('./routes/upload'));
app.use('/api/approval_files', approvalFilesRouter);
app.use('/api/simple_workflowbuilder_formviews',simpleWorkflowbuilderFormViewsRouter());
app.use('/api/simple_workflowmap_views', simpleWorkflowMapViewsRouter());
// app.use("/api/physicalrecords", require("./physicalrecords/routes"));
// app.use("/api/rmrequest", require("./physicalrecords/rmrequest/routes"));
// // AFTER: app.use('/api', verifyToken) ...
// app.use("/api/rmteam", verifyToken, require("./physicalrecords/rmteam/routes"));
// app.use("/api/rmassignments", verifyToken, require("./physicalrecords/rmassignments/routes"));
// app.use('/api/rm/register', verifyToken, registerRoutes);
// //app.use("/api/rm/register", require("./physicalrecords/registerfile/routes")); // adjust path if needed
// app.use('/api/rmconfig', verifyToken, rmConfigRouter);
// //app.use("/api/rmconfig", require("./physicalrecords/rmconfig/routes"));
// app.use('/api/rm', verifyToken, rmUiRouter);
// //app.use("/api/rm", require("./rm/rm")); // <— matches your UI endpoints
// app.use("/api/processing", require("./physicalrecords/processing/routes"));

const BA = 'Business Automation';
if (subscriptionRoutes) app.use('/api/subscription', subscriptionRoutes);
if (uploadRoutes)       app.use('/api/upload', uploadRoutes);
if (usersRoutes)        app.use('/api/users', usersRoutes);
if (enquiriesRoute)     app.use('/api/enquiries',  checkSubscription('Enquiries'), enquiriesRoute);
if (approvalsRoutes)    app.use('/api/approvals',  checkSubscription('Assignments'), approvalsRoutes);
if (workflowsRoute)     app.use('/api/workflows',  workflowsRoute);

if (formRoutes)         app.use('/api/formconfig',    checkSubscription(BA),     formRoutes);
if (tablesRouter)       app.use('/api/table',         checkSubscription(BA),     tablesRouter);
if (formViewsRoute)     app.use('/api/form-views',    checkSubscription(BA),     formViewsRoute);
if (formviewsRoutes)    app.use('/api/formviews',     checkSubscription(BA),     formviewsRoutes);
if (formdataRoutes)     app.use('/api/formdata',      checkSubscription(BA), formdataRoutes);
if (tableConfigsRoutes) app.use('/api/table-configs', checkSubscription(BA), tableConfigsRoutes);
if (formConfigsRoutes)  app.use('/api/form-configs',  checkSubscription(BA), formConfigsRoutes);
if (canvasConfigsRoutes)app.use('/api/canvas-configs',checkSubscription(BA), canvasConfigsRoutes);
if (crudPagesRoutes) app.use('/api/crudpages',        checkSubscription(BA), crudPagesRoutes);
if (experienceBuilderRoutes) app.use('/api/experiencebuilder', experienceBuilderRoutes);
if (experienceLayoutsRoutes) app.use('/api/experiencelayouts', experienceLayoutsRoutes);
if (experienceBuilderAiRoutes) app.use('/api/experiencebuilder-ai', verifyToken, checkSubscription(BA), experienceBuilderAiRoutes);
if (aiAppBuilderRoutes) app.use('/api/aiappbuilder', aiAppBuilderRoutes);
if (aiSimpleAppBuilderRoutes) {app.use('/api/aiappbuilder-simple', aiSimpleAppBuilderRoutes);
  
}
// simple workflow header routes (list/create/delete/etc)
//if (swbRoutes)      app.use('/api/simple_workflowbuilder', swbRoutes);

// steps live under a child path; mount them at /steps
// and adjust the router to define routes relative to /steps
//if (swbStepsRoutes) app.use('/api/simple_workflowbuilder/steps', swbStepsRoutes);
if (swfiRoutes) app.use('/api/simple_workflow_instances', swfiRoutes());



if (assignmentsRouter)  app.use('/api', assignmentsRouter);
if (wfAssignmentsRoutes) app.use('/api/workflows/assignments', wfAssignmentsRoutes);
if (wfAdvanceRoutes) app.use('/api/workflows', wfAdvanceRoutes);

if (businessPartnerRoutes) app.use('/api/businesspartner', businessPartnerRoutes);

if (wfSequelizeRoutes)  app.use('/api/wfseq', wfSequelizeRoutes);




// ───────────────────────────────────────────────────────────────────────────────
// 12) WebSocket server
const server = http.createServer(app);
const { Server } = require('ws');
const wss = new Server({ server });
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  ws.send('👋 Hello from WebSocket server!');
  ws.on('message', (message) => console.log('📨 Received via WS:', message));
  ws.on('close', () => console.log('❌ WebSocket client disconnected'));
});

// 13) Centralized error handler — keep last
app.use((err, _req, res, _next) => {
  console.error('API Error:', err);
  res.status(500).json({ ok: false, error: err.message || "Server error" });
});

// 14) Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
