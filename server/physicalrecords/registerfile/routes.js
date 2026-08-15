// server/physicalrecords/registerfile/routes.js
const express = require('express');
const router  = express.Router();

const svc = require('./service');
const v   = require('./validators');

// ✅ you already have verifyToken; requireAuth wasn’t a function.
const { verifyToken } = require('../../middleware/authMiddleware');

// All routes require login
router.use(verifyToken);

/** List files (table) */
router.get('/files', async (req, res) => {
  try {
    const qp  = v.parseListQuery(req.query || {});
    const out = await svc.listFiles(req.user, qp);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

/** One file (+optional dm_data) */
router.get('/files/:id', async (req, res) => {
  try {
    const id  = v.parseIdParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const out = await svc.getOne(req.user, id);   // <— returns { file, dm_data }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

/** Create / Update (single endpoint used by modal) */
router.post('/register-file', async (req, res) => {
  try {
    const body = v.parseUpsertBody(req.body || {});
    const out  = await svc.upsert(req.user, body); // user contains id for validation/audit
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Save failed' });
  }
});

/** PATCH variant (optional) */
router.patch('/register-file', async (req, res) => {
  try {
    const body = v.parseUpsertBody(req.body || {});
    if (!body.id) return res.status(400).json({ error: 'id is required for update' });
    const out  = await svc.upsert(req.user, body);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Update failed' });
  }
});

/** Delete (hard delete rmfilemaster + dm_data) */
router.delete('/files/:id', async (req, res) => {
  try {
    const id = v.parseIdParam(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const out = await svc.remove(req.user, id);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Delete failed' });
  }
});

/** Optional: dm_data fetch for a file */
router.get('/dm-data', async (req, res) => {
  try {
    const entityType = String(req.query.entity_type || 'file');
    const entityId   = v.parseIdParam(req.query.entity_id);
    if (!entityId) return res.status(400).json({ error: 'Invalid entity_id' });
    const out = await svc.dmDataFor(req.user, entityType, entityId);
    res.json(out || {});
  } catch (e) {
    res.status(500).json({ error: e.message || 'Server error' });
  }
});

module.exports = router;


// // server/physicalrecords/registerfile/routes.js
// const express = require("express");
// const router  = express.Router();

// const svc     = require("./service");
// const v       = require("./validators");

// // CHANGE THIS to your auth middleware import:
// const { verifyToken } = require("../../middleware/authMiddleware"); // adjust path

// // All routes require login
// router.use(verifyToken);

// /** List files (used by table on page) */
// router.get("/register/files", async (req, res) => {
//   try {
//     const qp = v.parseListQuery(req.query || {});
//     const out = await svc.listFiles(qp);
//     res.json(out);
//   } catch (e) {
//     res.status(500).json({ error: e.message || "Server error" });
//   }
// });

// /** One file + dm_data */
// router.get("/register/files/:id", async (req, res) => {
//   try {
//     const id = v.parseIdParam(req.params.id);
//     if (!id) return res.status(400).json({ error: "Invalid id" });
//     const out = await svc.getOne(id);
//     res.json(out);
//   } catch (e) {
//     res.status(500).json({ error: e.message || "Server error" });
//   }
// });

// /** Create / Update (single endpoint used by the modal)
//  *  - CREATE when body.id is null -> validates the QR ownership rule
//  *  - UPDATE when body.id is present
//  */
// router.post("/register/register-file", async (req, res) => {
//   try {
//     const body = v.parseUpsertBody(req.body || {});
//     const out  = await svc.upsert(body, req.user);
//     res.json(out);
//   } catch (e) {
//     res.status(400).json({ error: e.message || "Save failed" });
//   }
// });

// /** PATCH variant (optional, same logic) */
// router.patch("/register/register-file", async (req, res) => {
//   try {
//     const body = v.parseUpsertBody(req.body || {});
//     if (!body.id) return res.status(400).json({ error: "id is required for update" });
//     const out  = await svc.upsert(body, req.user);
//     res.json(out);
//   } catch (e) {
//     res.status(400).json({ error: e.message || "Update failed" });
//   }
// });

// /** Delete (hard delete) */
// router.delete("/register/register-file/:id", async (req, res) => {
//   try {
//     const id = v.parseIdParam(req.params.id);
//     if (!id) return res.status(400).json({ error: "Invalid id" });
//     const out = await svc.remove(id);
//     res.json(out);
//   } catch (e) {
//     res.status(400).json({ error: e.message || "Delete failed" });
//   }
// });

// /** Optional: dm_data fetch for a file (prefill edit) */
// router.get("/register/dm-data", async (req, res) => {
//   try {
//     const entityType = String(req.query.entity_type || "file");
//     const entityId = v.parseIdParam(req.query.entity_id);
//     if (!entityId) return res.status(400).json({ error: "Invalid entity_id" });
//     const out = await svc.dmDataFor(entityType, entityId);
//     res.json(out || {});
//   } catch (e) {
//     res.status(500).json({ error: e.message || "Server error" });
//   }
// });

// module.exports = router;
