const express = require("express");
const router = express.Router();
const svc = require("./service");

// If you gate APIs, import your auth middleware:
// const { verifyToken } = require("../../middleware/authMiddleware");

// GET /api/processing/:id/info
router.get("/:id/info", /*verifyToken,*/ async (req, res, next) => {
  try { res.json(await svc.getInfo(Number(req.params.id))); }
  catch (e) { next(e); }
});

// POST /api/processing/:id/validate-box { barcode }
router.post("/:id/validate-box", /*verifyToken,*/ async (req, res, next) => {
  try {
    const out = await svc.validateBox(Number(req.params.id), String(req.body?.barcode || ""));
    res.json(out);
  } catch (e) { next(e); }
});

// POST /api/processing/:id/validate-file { barcode, boxBarcode? }
router.post("/:id/validate-file", /*verifyToken,*/ async (req, res, next) => {
  try {
    const out = await svc.validateFile(
      Number(req.params.id),
      String(req.body?.barcode || ""),
      req.body?.boxBarcode ? String(req.body.boxBarcode) : null
    );
    res.json(out);
  } catch (e) { next(e); }
});

// POST /api/processing/:id/process-files { files: [fileId,...] }
router.post("/:id/process-files", /*verifyToken,*/ async (req, res, next) => {
  try {
    const out = await svc.processFiles(
      Number(req.params.id),
      Array.isArray(req.body?.files) ? req.body.files : [],
      req.user || null
    );
    res.json(out);
  } catch (e) { next(e); }
});

module.exports = router;
