// server/routes/experiencebuilder.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/checkSubscription");

function normalizePageLayout(layout) {
  if (!layout) return {};
  if (typeof layout === "string") {
    try {
      return JSON.parse(layout);
    } catch {
      return {};
    }
  }
  return layout;
}

async function ensureExperienceTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS experiencebuilder (
      id BIGSERIAL PRIMARY KEY,
      dbtable_id JSONB DEFAULT '[]'::jsonb,
      page_name TEXT NOT NULL,
      page_url TEXT,
      status TEXT DEFAULT 'Active',
      validations JSONB DEFAULT '{}'::jsonb,
      access JSONB DEFAULT '{}'::jsonb,
      details JSONB DEFAULT '{}'::jsonb,
      create_edit TEXT,
      description TEXT,
      created_by BIGINT,
      date_created TIMESTAMPTZ NOT NULL DEFAULT now(),
      modified_by BIGINT,
      date_modified TIMESTAMPTZ,
      tenant_id JSONB DEFAULT '[]'::jsonb,
      layout JSONB DEFAULT '[]'::jsonb
    );
  `);

  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS dbtable_id JSONB;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS page_name TEXT;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS page_url TEXT;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS status TEXT;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS validations JSONB;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS access JSONB;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS details JSONB;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS create_edit TEXT;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS description TEXT;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS created_by BIGINT;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS date_created TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS modified_by BIGINT;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS date_modified TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS tenant_id JSONB;`);
  await pool.query(`ALTER TABLE experiencebuilder ADD COLUMN IF NOT EXISTS layout JSONB;`);
}

async function getTenantId(userId) {
  const q = await pool.query(`SELECT tenant_id FROM users WHERE id=$1`, [userId]);
  return q.rows[0]?.tenant_id ?? null;
}

router.use(verifyToken, checkSubscription("Business Automation"));

router.get("/", async (_req, res) => {
  try {
    await ensureExperienceTable();
    const { rows } = await pool.query(`
      SELECT id, page_name, page_url, status, description, created_by, date_created, date_modified, layout
      FROM experiencebuilder
      ORDER BY id DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    await ensureExperienceTable();
    const { rows } = await pool.query(
      `SELECT *
       FROM experiencebuilder
       WHERE id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Experience page not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  const { pageName, description, layout, status, pageUrl } = req.body || {};
  const userId = req.user?.id || null;

  if (!pageName) {
    return res.status(400).json({ error: "pageName is required" });
  }
  if (!layout) {
    return res.status(400).json({ error: "layout is required" });
  }

  try {
    await ensureExperienceTable();
    const tenantId = Number(req.user?.tenant_id ?? null) || null;
    const tenantList = tenantId ? [tenantId] : [];
    const normalizedLayout = normalizePageLayout(layout);
    const layoutJson = JSON.stringify(normalizedLayout || {});
    const tenantJson = JSON.stringify(tenantList);

    const { rows } = await pool.query(
      `INSERT INTO experiencebuilder (page_name, description, layout, page_url, status, created_by, tenant_id)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7::jsonb)
       RETURNING id, page_name, description, layout, page_url, status, created_by, date_created, date_modified`,
      [
        pageName,
        description || null,
        layoutJson,
        pageUrl || null,
        status || "Active",
        userId,
        tenantJson,
      ]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await ensureExperienceTable();
    const { pageName, description, layout, status, pageUrl } = req.body || {};
    if (!layout) {
      return res.status(400).json({ error: "layout is required" });
    }
    const userId = req.user?.id || null;
    const normalizedLayout = normalizePageLayout(layout);
    const layoutJson = JSON.stringify(normalizedLayout || {});
    const { rows } = await pool.query(
      `UPDATE experiencebuilder
       SET page_name=COALESCE($1, page_name),
           description=COALESCE($2, description),
           layout=$3::jsonb,
           page_url=COALESCE($4, page_url),
           status=COALESCE($5, status),
           modified_by=$6,
           date_modified=now()
       WHERE id=$7
       RETURNING id, page_name, description, layout, page_url, status, created_by, date_created, modified_by, date_modified`,
      [pageName || null, description || null, layoutJson, pageUrl || null, status || null, userId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Experience page not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await ensureExperienceTable();
    const { rows } = await pool.query(
      `DELETE FROM experiencebuilder
       WHERE id=$1
       RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Experience page not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
