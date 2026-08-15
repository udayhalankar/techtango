// server/rmrequest/routes.js
const express = require("express");
const router = express.Router();
const svc = require("./service");
const v = require("./validators");
const db = require("../../db");


// ---------- specific routes MUST come before '/:id' ----------
// GET /api/rmrequest/me
router.get("/me", async (req, res, next) => {
  try {
    const uid = req?.user?.id;
    if (!uid) return res.status(401).json({ ok: false, error: "Not authenticated" });
    const { rows } = await db.query(
      `SELECT u.id, u.firstname, u.lastname, u.department, u.tenant_id,
             COALESCE(t.tenantname,'') AS tenant_name
         FROM public.users u
         LEFT JOIN public.tenants t ON t.id = u.tenant_id
        WHERE u.id = $1`,
      [uid]
    );
    const r = rows[0] || {};
    res.json({
      ok: true,
      profile: {
        userId: r.id,
        name: `${r.firstname || ""} ${r.lastname || ""}`.trim(),
        department: r.department || "",
        tenantId: r.tenant_id || null,
        tenantName: r.tenant_name || "",
      }
    });
  } catch (e) { next(e); }
});

// // POST /api/rmrequest/material
// router.post("/material", async (req, res, next) => {
//   try {
//     const p = v.parseMaterialCreate({
//       requestType: req.body?.requestType,
//       quantity: req.body?.quantity ?? req.body?.materialQty,
//       instructions: req.body?.instructions,
//       user: req.user || {},
//       userIP: (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null,
//     });
//     const out = await svc.createMaterial(p, req.user);
//     res.json(out);
//   } catch (e) { next(e); }
// });

// server/physicalrecords/rmrequest/routes.js
router.post("/material", async (req, res, next) => {
  try {
    const out = await svc.createMaterial(req.body, req.user);
    res.json(out);
  } catch (e) { next(e); }
});


// Process material request (generate IDs & update quantities/status)
router.post("/:id/material/process", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { issueQty } = v.parseProcessMaterial(req.body);
    const out = await svc.processMaterial(id, issueQty, req.user);
    res.json(out);
  } catch (e) { next(e); }
});




// Search (paged / filtered)
router.post("/search", async (req, res, next) => {
  try {
    const p = v.parseSearch(req.body);
    res.json(await svc.search(p));
  } catch (e) { next(e); }
});

// Create a request
router.post("/", async (req, res, next) => {
  try {
    const p = v.parseCreate(req.body);
    res.json(await svc.create(p));
  } catch (e) { next(e); }
});

// Get by id
// // Get by id (guard non-numeric)
router.get("/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ ok: false, error: "Invalid request id" });
  }
  try { res.json(await svc.getById(id)); }
  catch (e) { next(e); }
});

// Patch (update a subset of fields)
router.patch("/:id", async (req, res, next) => {
  try {
    const p = v.parsePatch(req.body);
    res.json(await svc.patch(Number(req.params.id), p));
  } catch (e) { next(e); }
});

// Update only status (handy for workflows)
router.post("/:id/status", async (req, res, next) => {
  try {
    const { requestStatus } = v.parseStatusOnly(req.body);
    res.json(await svc.updateStatus(Number(req.params.id), requestStatus));
  } catch (e) { next(e); }
});

// Delete (optional)
router.delete("/:id", async (req, res, next) => {
  try { res.json(await svc.remove(Number(req.params.id))); }
  catch (e) { next(e); }
});

// Cancel with reason
router.post("/:id/cancel", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { reason } = v.parseCancel(req.body);
    res.json(await svc.cancel(id, reason, req.user));
  } catch (e) { next(e); }
});







module.exports = router;
