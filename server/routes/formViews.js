// server/routes/formviews.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

/* ──────────────────────────────────────────────────────────────
   Param guards
   ────────────────────────────────────────────────────────────── */
// Guard every :id param used in THIS router (numeric only)
router.param("id", (req, res, next, id) => {
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: "viewId must be an integer" });
  }
  next();
});

/* ──────────────────────────────────────────────────────────────
   FORM VIEWS
   ────────────────────────────────────────────────────────────── */

// GET all form views
router.get("/list", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fv.id, fv.view_name, fv.view_type, fv.template_id,
             ft.template_name, fv.created_at, fv.updated_at
      FROM form_views fv
      JOIN form_templates ft ON ft.id = fv.template_id
      ORDER BY fv.updated_at DESC NULLS LAST, fv.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching form views:", err);
    res.status(500).json({ error: "Failed to fetch form views" });
  }
});

// GET all views for a specific template (keep BEFORE /:id)
router.get("/by-template/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;
    const result = await pool.query(
      `SELECT * FROM form_views WHERE template_id = $1`,
      [templateId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching views for template:", err);
    res.status(500).json({ error: "Failed to fetch views for template" });
  }
});

// CREATE / UPDATE view (primary or update depending on existing primary)
router.post("/save", async (req, res) => {
  const { template_id, view_name, layout, created_by } = req.body;

  try {
    const { rows: existingPrimaries } = await pool.query(
      `SELECT * FROM form_views WHERE template_id = $1 AND view_type = 'primary'`,
      [template_id]
    );

    // No primary -> create primary and set its own primary_view_id
    if (existingPrimaries.length === 0) {
      const { rows } = await pool.query(
        `INSERT INTO form_views (template_id, view_name, view_type, layout, created_by, created_at)
         VALUES ($1, $2, 'primary', $3, $4, NOW())
         RETURNING id`,
        [template_id, view_name, JSON.stringify(layout), created_by]
      );

      const newId = rows[0].id;

      await pool.query(
        `UPDATE form_views SET primary_view_id = $1, updated_at = now() WHERE id = $1`,
        [newId]
      );

      return res.json({ success: true, message: "Primary view created", id: newId });
    }

    // Primary exists
    const primary = existingPrimaries[0];

    // Same name as primary -> update primary
    if (primary.view_name === view_name) {
      await pool.query(
        `UPDATE form_views SET layout = $1, updated_at = now() WHERE id = $2`,
        [JSON.stringify(layout), primary.id]
      );
      return res.json({ success: true, message: "Primary view updated" });
    }

    // Different name -> create an 'update' view tied to primary
    const { rows } = await pool.query(
      `INSERT INTO form_views (template_id, view_name, view_type, primary_view_id, layout, created_by, created_at)
       VALUES ($1, $2, 'update', $3, $4, $5, NOW())
       RETURNING id`,
      [template_id, view_name, primary.id, JSON.stringify(layout), created_by]
    );

    return res.json({ success: true, message: "Update view inserted", id: rows[0].id });
  } catch (err) {
    console.error("Error saving form view:", err);
    res.status(500).json({ error: "Error saving form view" });
  }
});

// UPDATE existing primary by id
router.put("/:id(\\d+)", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { view_name, layout, updated_by } = req.body;

    const result = await pool.query(
      `UPDATE form_views
       SET view_name = $1, layout = $2, updated_by = $3, updated_at = NOW()
       WHERE id = $4 AND view_type = 'primary'`,
      [view_name, JSON.stringify(layout), updated_by || 1, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Primary view not found or not editable" });
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error("❌ Error updating form view:", err);
    res.status(500).json({ error: "Failed to update form view" });
  }
});

// GET single view by ID (numeric-only, keep LAST among /:... routes)
router.get("/:id(\\d+)", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await pool.query(`SELECT * FROM form_views WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Form view not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching form view:", err);
    res.status(500).json({ error: "Failed to fetch form view" });
  }
});

/* ──────────────────────────────────────────────────────────────
   FORM DATA (via form_configs)
   ────────────────────────────────────────────────────────────── */

// UPDATE an existing entry (Update configs only)
router.post("/formdata/update", verifyToken, async (req, res) => {
  const configId = Number(req.body.configId);
  const entryId = Number(req.body.entryId);
  const formData = req.body.formData || {};

  if (!Number.isInteger(configId)) return res.status(400).json({ error: "Invalid configId" });
  if (!Number.isInteger(entryId)) return res.status(400).json({ error: "Invalid entryId" });

  const client = await pool.connect();
  try {
    const cfg = await client.query(
      `SELECT id, template_name, table_name, type FROM form_configs WHERE id = $1`,
      [configId]
    );
    if (!cfg.rows.length) return res.status(404).json({ error: "Config not found" });

    const { table_name, type } = cfg.rows[0];
    if (!table_name) return res.status(400).json({ error: "Config missing table_name" });
    if (String(type).toLowerCase() !== "update") {
      return res.status(400).json({ error: "Only Update configs can update" });
    }

    // Filter out labels + reserved columns
    const RESERVED = new Set(["id", "created_at", "created_by", "updated_at", "updated_by"]);
    const entries = Object.entries(formData)
      .filter(([k]) => !k.startsWith("label_"))
      .filter(([k]) => !RESERVED.has(k));

    if (!entries.length) return res.status(400).json({ error: "No updatable fields provided" });

    const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(", ");
    const vals = entries.map(([, v]) => v);

    const q = `
      UPDATE ${table_name}
      SET ${sets}, updated_at = NOW()
      WHERE id = $${entries.length + 1}
      RETURNING *
    `;
    const out = await client.query(q, [...vals, entryId]);

    res.json({ success: true, data: out.rows[0] });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// INSERT (Master configs only)
router.post("/formdata/insert", verifyToken, async (req, res) => {
  const { configId, formData } = req.body;

  const client = await pool.connect();
  try {
    const cfg = await client.query(
      `SELECT id, template_name, table_name, type FROM form_configs WHERE id = $1`,
      [configId]
    );
    if (!cfg.rows.length) return res.status(404).json({ error: "Config not found" });

    const { table_name, type } = cfg.rows[0];
    if (!table_name) return res.status(400).json({ error: "Config missing table_name" });
    if (String(type).toLowerCase() !== "master") {
      return res.status(400).json({ error: "Only Master configs can insert" });
    }

    const entries = Object.entries(formData || {}).filter(([k]) => !k.startsWith("label_"));
    if (!entries.length) return res.status(400).json({ error: "No fields provided" });

    const cols = entries.map(([k]) => k);
    const vals = entries.map(([, v]) => v);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(",");

    const q = `
      INSERT INTO ${table_name} (${cols.join(",")}, created_by, created_at)
      VALUES (${placeholders}, $${cols.length + 1}, NOW())
      RETURNING *
    `;
    const out = await client.query(q, [...vals, req.user.id]); // using userId from verifyToken

    res.json({ success: true, data: out.rows[0] });
  } catch (err) {
    console.error("Insert Error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// GET ids list (for Update picker)
router.get("/formdata/:configId/ids", verifyToken, async (req, res) => {
  const configId = Number(req.params.configId);
  if (!Number.isInteger(configId)) {
    return res.status(400).json({ error: "Invalid configId" });
  }
  const client = await pool.connect();
  try {
    const cfg = await client.query(
      `SELECT table_name FROM form_configs WHERE id = $1`,
      [configId]
    );
    if (!cfg.rows.length) return res.status(404).json({ error: "Config not found" });

    const { table_name } = cfg.rows[0];
    const r = await client.query(`SELECT id FROM ${table_name} ORDER BY id DESC LIMIT 100`);
    res.json(r.rows.map((x) => x.id));
  } catch (err) {
    console.error("IDs error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// GET one row for Update prefill
router.get("/formdata/:configId/:entryId", verifyToken, async (req, res) => {
  const { configId, entryId } = req.params;
  const client = await pool.connect();
  try {
    const cfg = await client.query(
      `SELECT table_name FROM form_configs WHERE id = $1`,
      [configId]
    );
    if (!cfg.rows.length) return res.status(404).json({ error: "Config not found" });

    const { table_name } = cfg.rows[0];
    const row = await client.query(`SELECT * FROM ${table_name} WHERE id = $1`, [entryId]);
    res.json({ success: true, data: row.rows[0] || null });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

module.exports = router;


