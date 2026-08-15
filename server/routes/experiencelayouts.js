// server/routes/experiencelayouts.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/checkSubscription");

function normalizeLayoutDefinition(layoutDefinition) {
  if (!layoutDefinition) return {};
  if (typeof layoutDefinition === "string") {
    try {
      return JSON.parse(layoutDefinition);
    } catch {
      const trimmed = layoutDefinition.trim();
      if (trimmed.startsWith("<")) {
        return { html: layoutDefinition };
      }
      return {};
    }
  }
  return layoutDefinition;
}

async function ensureExperienceLayoutsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS experience_layouts (
      id BIGSERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      dashboard_name TEXT NOT NULL,
      description TEXT,
      layout_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT,
      created_by BIGINT,
      date_created TIMESTAMPTZ NOT NULL DEFAULT now(),
      modified_by BIGINT,
      date_modified TIMESTAMPTZ
    );
  `);
}

router.use(verifyToken, checkSubscription("Business Automation"));

router.get("/", async (req, res) => {
  try {
    await ensureExperienceLayoutsTable();
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const isAdmin = roles.some((r) => String(r).toLowerCase() === "admin");
    const tenantId = Number(req.user?.tenant_id) || null;

    if (isAdmin) {
      const { rows } = await pool.query(
        `SELECT id, tenant_id, dashboard_name, description, layout_definition, status, created_by, date_created
         FROM experience_layouts
         ORDER BY id DESC`
      );
      return res.json(rows);
    }

    if (!tenantId) {
      return res.status(400).json({ error: "Invalid tenant" });
    }

    const { rows } = await pool.query(
      `SELECT id, tenant_id, dashboard_name, description, layout_definition, status, created_by, date_created
       FROM experience_layouts
       WHERE tenant_id IN (0, $1)
       ORDER BY id DESC`,
      [tenantId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    await ensureExperienceLayoutsTable();
    const { rows } = await pool.query(
      `SELECT id, tenant_id, dashboard_name, description, layout_definition, status, created_by, date_created, modified_by, date_modified
       FROM experience_layouts
       WHERE id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Experience layout not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureExperienceLayoutsTable();
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const isAdmin = roles.some((r) => String(r).toLowerCase() === "admin");
    const tenantId = Number(req.user?.tenant_id) || null;
    const layoutName = String(req.body?.layoutName || req.body?.experienceName || req.body?.dashboardName || "").trim();
    if (!layoutName) {
      return res.status(400).json({ error: "dashboardName is required" });
    }

    const layoutDefinition = normalizeLayoutDefinition(req.body?.layoutDefinition || {});
    const tenantToSave = isAdmin ? 0 : tenantId;
    const { rows } = await pool.query(
      `INSERT INTO experience_layouts (tenant_id, dashboard_name, description, layout_definition, status, created_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6)
       RETURNING id, tenant_id, dashboard_name, description, layout_definition, status, created_by, date_created`,
      [
        tenantToSave,
        layoutName,
        req.body?.description || null,
        JSON.stringify(layoutDefinition),
        req.body?.status || "Active",
        req.user?.id || null,
      ]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await ensureExperienceLayoutsTable();
    const layoutDefinition = normalizeLayoutDefinition(req.body?.layoutDefinition || {});
    const { rows } = await pool.query(
      `UPDATE experience_layouts
       SET dashboard_name=COALESCE($1, dashboard_name),
           description=COALESCE($2, description),
           layout_definition=$3::jsonb,
           status=COALESCE($4, status),
           modified_by=$5,
           date_modified=now()
       WHERE id=$6
       RETURNING id, tenant_id, dashboard_name, description, layout_definition, status, created_by, date_created, modified_by, date_modified`,
      [
        req.body?.layoutName || req.body?.experienceName || null,
        req.body?.description || null,
        JSON.stringify(layoutDefinition),
        req.body?.status || null,
        req.user?.id || null,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: "Experience layout not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await ensureExperienceLayoutsTable();
    const { rows } = await pool.query(
      `DELETE FROM experience_layouts
       WHERE id=$1
       RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Experience layout not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
