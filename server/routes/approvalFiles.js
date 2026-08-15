// server/routes/approvalFiles.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { decryptFile } = require("../utils/uploadEncryptedFiles");

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

router.get("/by-instance/:instanceId", async (req, res) => {
  try {
    const instanceId = Number(req.params.instanceId);
    if (!Number.isFinite(instanceId)) {
      return res.status(400).json({ error: "Invalid instance id" });
    }

    const refTable = req.query.ref_table || null;
    const refTableId = req.query.ref_table_id
      ? Number(req.query.ref_table_id)
      : null;

    const params = [instanceId];
    let where = "approval_id = $1";
    let idx = 1;

    // Only apply these filters if both are valid; otherwise behave as before
    if (refTable && refTableId && Number.isFinite(refTableId)) {
      idx += 1;
      params.push(refTable);
      where += ` AND ref_table = $${idx}`;

      idx += 1;
      params.push(refTableId);
      where += ` AND ref_table_id = $${idx}`;
    }

    const { rows } = await pool.query(
      `
      SELECT
        id,
        approval_id,
        original_filename,
        encrypted_path,
        uploaded_by,
        uploaded_at,
        ref_table,
        ref_table_id
      FROM approval_files
      WHERE ${where}
      ORDER BY uploaded_at ASC, id ASC
      `,
      params
    );

    // ✅ add a safe URL for FE open/download
    const filesWithUrl = rows.map((f) => ({
      ...f,
      download_url: `/approval_files/download/${f.id}`,
    }));

    return res.json(filesWithUrl);
  } catch (err) {
    console.error("GET /approval_files/by-instance error", err);
    return res.status(500).json({ error: "Failed to list attachments" });
  }
});

// ✅ Secure download endpoint
router.get("/download/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid file id" });
    }

    const { rows } = await pool.query(
      `
      SELECT id, original_filename, encrypted_path, iv
      FROM approval_files
      WHERE id = $1
      `,
      [id]
    );

    const file = rows[0];
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const rel = String(file.encrypted_path || "").replace(/^uploads[\\/]/i, "");
    const absPath = path.join(UPLOAD_DIR, rel);

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "dl-"));
    const tmpPath = path.join(tmpDir, file.original_filename || `file_${file.id}`);
    await decryptFile(absPath, tmpPath, file.iv);

    res.download(tmpPath, file.original_filename || undefined, async () => {
      try { await fs.promises.unlink(tmpPath); } catch (_) {}
      try { await fs.promises.rmdir(tmpDir); } catch (_) {}
    });
  } catch (err) {
    console.error("GET /approval_files/download error", err);
    return res.status(500).json({ error: "Failed to download file" });
  }
});

module.exports = router;



// // server/routes/approvalFiles.js
// const express = require('express');
// const router = express.Router();
// const pool = require('../db');

// // List attachments for a workflow instance
// // GET /api/approval_files/by-instance/:instanceId
// router.get('/by-instance/:instanceId', async (req, res) => {
//   try {
//     const instanceId = Number(req.params.instanceId);
//     if (!Number.isFinite(instanceId)) {
//       return res.status(400).json({ error: 'Invalid instance id' });
//     }

//     const { rows } = await pool.query(
//       `
//       SELECT
//         id,
//         approval_id,
//         original_filename,
//         encrypted_path,
//         uploaded_by,
//         uploaded_at,
//         ref_table,
//         ref_table_id
//       FROM approval_files
//       WHERE approval_id = $1
//       ORDER BY uploaded_at ASC, id ASC
//       `,
//       [instanceId]
//     );

//     return res.json(rows);
//   } catch (err) {
//     console.error('GET /approval_files/by-instance error', err);
//     return res.status(500).json({ error: 'Failed to list attachments' });
//   }
// });

// module.exports = router;
