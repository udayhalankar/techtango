// server/rmassignments/routes.js
const express = require("express");
const router = express.Router();
const svc = require("./service");
const v = require("./validators");

const { verifyToken } = require("../../middleware/authMiddleware");

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
    res.json(await svc.create(p, req.user));
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
    res.json(await svc.patch(Number(req.params.id), p));
  } catch (e) { next(e); }
});

// Update only status
router.post("/:id/status", async (req, res, next) => {
  try {
    const { assignmentStatus } = v.parseStatusOnly(req.body);
    res.json(await svc.updateStatus(Number(req.params.id), assignmentStatus));
  } catch (e) { next(e); }
});



// Verify OTP
router.post("/:id/verify-otp", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const code = String(req.body?.otp || "");
    if (!/^\d{4,8}$/.test(code)) throw new Error("Invalid OTP format");
    res.json(await svc.verifyOtp(id, code, req));
  } catch (e) { next(e); }
});


// Delete
router.delete("/:id", async (req, res, next) => {
  try { res.json(await svc.remove(Number(req.params.id))); }
  catch (e) { next(e); }
});

// below your other routes
router.post("/:id/complete", verifyToken, async (req, res, next) => {
  try {
    const out = await svc.complete(Number(req.params.id), req.user);
    res.json(out);
  } catch (err) { next(err); }
});


module.exports = router;
