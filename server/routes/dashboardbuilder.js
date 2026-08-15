// server/routes/dashboardbuilder.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/checkSubscription");

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function normalizeLayoutDefinition(layoutDefinition) {
  if (!layoutDefinition) return layoutDefinition || {};
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

async function ensureDashboardTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dashboardbuilder (
      id BIGSERIAL PRIMARY KEY,
      dbtable_id JSONB,
      page_name TEXT,
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
      layout JSONB DEFAULT '{}'::jsonb
    );
  `);

  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS dbtable_id JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS page_name TEXT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS page_url TEXT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS status TEXT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS validations JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS access JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS details JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS create_edit TEXT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS description TEXT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS created_by BIGINT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS date_created TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS modified_by BIGINT;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS date_modified TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS tenant_id JSONB;`);
  await pool.query(`ALTER TABLE dashboardbuilder ADD COLUMN IF NOT EXISTS layout JSONB;`);
}

async function getTenantId(userId) {
  const q = await pool.query(`SELECT tenant FROM users WHERE id=$1`, [userId]);
  return q.rows[0]?.tenant ?? null;
}

router.use(verifyToken, checkSubscription("Business Automation"));

router.get("/", async (_req, res) => {
  try {
    await ensureDashboardTable();
    const { rows } = await pool.query(`
      SELECT id, page_name, description, page_url, status, created_by, date_created, date_modified
      FROM dashboardbuilder
      ORDER BY id DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    await ensureDashboardTable();
    const { rows } = await pool.query(
      `SELECT *
       FROM dashboardbuilder WHERE id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Dashboard not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/:id/chart-data", async (req, res) => {
  try {
    await ensureDashboardTable();
    const { rows } = await pool.query(
      `SELECT id, layout, dbtable_id FROM dashboardbuilder WHERE id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Dashboard not found" });

    const layout = rows[0]?.layout || {};
    const layoutIndex = Number(req.query?.layoutIndex ?? 0);
    let charts = Array.isArray(layout?.charts) ? layout.charts : [];
    if (Number.isFinite(layoutIndex) && layoutIndex > 0) {
      const extras = Array.isArray(layout?.meta?.additionalLayouts)
        ? layout.meta.additionalLayouts
        : [];
      const selected = extras[layoutIndex - 1];
      charts = Array.isArray(selected?.charts) ? selected.charts : [];
    }
    const results = [];

    for (const chart of charts) {
      const tableName = String(chart?.tableName || "");
      const chartType = chart?.chartType || "";
      const chartName = chart?.chartName || "";
      const xAxis = String(chart?.xAxis || "");
      const yAxis = String(chart?.yAxis || "");
      const aggregation = String(chart?.aggregation || "actual");
      if (!tableName || !IDENT.test(tableName)) {
        results.push({
          tableName,
          chartType,
          chartName,
          labels: [],
          values: [],
          error: "Invalid table",
        });
        continue;
      }

      if (xAxis && !IDENT.test(xAxis)) {
        results.push({ tableName, chartType, chartName, labels: [], values: [], error: "Invalid xAxis" });
        continue;
      }
      if (yAxis && !IDENT.test(yAxis)) {
        results.push({ tableName, chartType, chartName, labels: [], values: [], error: "Invalid yAxis" });
        continue;
      }

      let labels = [];
      let values = [];

      if (xAxis && (yAxis || aggregation === "count")) {
        const cols = await pool.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema='public' AND table_name=$1 AND column_name = ANY($2::text[])`,
          [tableName, yAxis ? [xAxis, yAxis] : [xAxis]]
        );
        const found = new Set(cols.rows.map((c) => c.column_name));
        if (!found.has(xAxis) || (yAxis && !found.has(yAxis))) {
          results.push({
            tableName,
            chartType,
            chartName,
            labels: [],
            values: [],
            error: "Axis column not found",
          });
          continue;
        }
        try {
          if (aggregation === "count") {
            const data = await pool.query(
              `SELECT "${xAxis}" AS x, COUNT(*)::int AS y
               FROM "${tableName}"
               GROUP BY x
               ORDER BY x
               LIMIT 7`
            );
            labels = data.rows.map((r) => (r.x ?? "").toString());
            values = data.rows.map((r) => Number(r.y ?? 0));
          } else if (aggregation === "avg" || aggregation === "sum") {
            const fn = aggregation === "avg" ? "AVG" : "SUM";
            const data = await pool.query(
              `SELECT "${xAxis}" AS x, ${fn}(("${yAxis}")::numeric) AS y
               FROM "${tableName}"
               GROUP BY x
               ORDER BY x
               LIMIT 7`
            );
            labels = data.rows.map((r) => (r.x ?? "").toString());
            values = data.rows.map((r) => Number(r.y ?? 0));
          } else {
            const data = await pool.query(
              `SELECT "${xAxis}" AS x, "${yAxis}" AS y
               FROM "${tableName}"
               ORDER BY id DESC
               LIMIT 7`
            );
            const rowsAsc = [...data.rows].reverse();
            labels = rowsAsc.map((r) => (r.x ?? "").toString());
            values = rowsAsc.map((r) => Number(r.y ?? 0));
          }
        } catch (e) {
          results.push({
            tableName,
            chartType,
            chartName,
            labels: [],
            values: [],
            error: "Aggregation error",
          });
          continue;
        }
      } else {
        const hasDate = await pool.query(
          `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='date_created'`,
          [tableName]
        );
        if (!hasDate.rows.length) {
          results.push({
            tableName,
            chartType,
            chartName,
            labels: [],
            values: [],
            error: "date_created column not found",
          });
          continue;
        }

        const data = await pool.query(
          `SELECT date_created::date AS day, COUNT(*)::int AS count
           FROM "${tableName}"
           GROUP BY day
           ORDER BY day DESC
           LIMIT 7`
        );

        const rowsAsc = [...data.rows].reverse();
        labels = rowsAsc.map((r) =>
          r.day ? new Date(r.day).toISOString().slice(0, 10) : ""
        );
        values = rowsAsc.map((r) => Number(r.count || 0));
      }

      results.push({ tableName, chartType, chartName, labels, values, aggregation });
    }

    res.json({ charts: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  const { pageName, description, layout, dbtableId, status, pageUrl } = req.body || {};
  const userId = req.user?.id || null;

  if (!pageName) {
    return res.status(400).json({ error: "pageName is required" });
  }
  if (!layout) {
    return res.status(400).json({ error: "layout is required" });
  }
  if (!dbtableId) {
    return res.status(400).json({ error: "dbtableId is required" });
  }

  const parsedLayout = typeof layout === "string" ? JSON.parse(layout) : layout;
  const parsedDbtableId =
    typeof dbtableId === "string" ? JSON.parse(dbtableId) : dbtableId;

  try {
    await ensureDashboardTable();
    const tenantId = userId ? await getTenantId(userId) : null;
    const tenantList = tenantId ? [tenantId] : [];
    const normalizedLayout = {
      ...(parsedLayout || {}),
      layoutDefinition: normalizeLayoutDefinition(parsedLayout?.layoutDefinition),
    };
    const layoutJson = JSON.stringify(normalizedLayout || {});
    const dbtableJson = JSON.stringify(parsedDbtableId || []);
    const tenantJson = JSON.stringify(tenantList);

    const { rows } = await pool.query(
      `INSERT INTO dashboardbuilder (page_name, description, layout, dbtable_id, page_url, status, created_by, tenant_id)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8::jsonb)
       RETURNING id, page_name, description, layout, dbtable_id, page_url, status, created_by, date_created`,
      [
        pageName,
        description || null,
        layoutJson,
        dbtableJson,
        pageUrl || null,
        status || "Active",
        userId,
        tenantJson,
      ]
    );

    let row = rows[0];
    if (!row.page_url) {
      const url = `/dashboardbuilder/${row.id}`;
      const upd = await pool.query(
        `UPDATE dashboardbuilder SET page_url=$1 WHERE id=$2
         RETURNING id, page_name, description, layout, dbtable_id, page_url, status, created_by, date_created`,
        [url, row.id]
      );
      row = upd.rows[0];
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await ensureDashboardTable();
    const layout = req.body?.layout;
    if (!layout) {
      return res.status(400).json({ error: "layout is required" });
    }
    const userId = req.user?.id || null;
    const normalizedLayout = {
      ...(layout || {}),
      layoutDefinition: normalizeLayoutDefinition(layout?.layoutDefinition),
    };
    const layoutJson = JSON.stringify(normalizedLayout || {});
    const { rows } = await pool.query(
      `UPDATE dashboardbuilder
       SET layout=$1::jsonb, modified_by=$2, date_modified=now()
       WHERE id=$3
       RETURNING id, page_name, description, layout, dbtable_id, page_url, status, created_by, date_created, modified_by, date_modified`,
      [layoutJson, userId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Dashboard not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await ensureDashboardTable();
    const { rows } = await pool.query(
      `DELETE FROM dashboardbuilder
       WHERE id=$1
       RETURNING id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Dashboard not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
