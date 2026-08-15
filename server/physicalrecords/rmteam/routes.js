// server/rmteam/routes.js
const express = require("express");
const router = express.Router();
const svc = require("./service");
const v = require("./validators");

// Search
router.post("/search", async (req, res, next) => {
  try {
    const p = v.parseSearch(req.body);
    res.json(await svc.search(p));
  } catch (e) { next(e); }
});

// Create
router.post("/", async (req, res, next) => {
  try {
    const p = v.parseCreate(req.body);
    // augment with login user if available
    p.createdBy = p.createdBy ?? req.user?.id ?? "system";
    p.modifiedBy = p.modifiedBy ?? req.user?.id ?? "system";
    res.json(await svc.create(p));
  } catch (e) { next(e); }
});

// Get
router.get("/:id", async (req, res, next) => {
  try { res.json(await svc.getById(Number(req.params.id))); }
  catch (e) { next(e); }
});

// Patch
router.patch("/:id", async (req, res, next) => {
  try {
    const p = v.parsePatch(req.body);
    p.modifiedBy = p.modifiedBy ?? req.user?.id ?? "system";
    res.json(await svc.patch(Number(req.params.id), p));
  } catch (e) { next(e); }
});

// Delete
router.delete("/:id", async (req, res, next) => {
  try { res.json(await svc.remove(Number(req.params.id))); }
  catch (e) { next(e); }
});

module.exports = router;
