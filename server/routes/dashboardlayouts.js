// server/routes/dashboardlayouts.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const multer = require("multer");
const path = require("path");
const { parse } = require("node-html-parser");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/checkSubscription");

const upload = multer({ storage: multer.memoryStorage() });

async function isAdminUser(user) {
  try {
    const userId =
      user?.id ??
      user?.userId ??
      user?.user_id ??
      null;

    const email =
      user?.email ??
      user?.username ??
      null;

    let result;

    /*
     * Prefer the authenticated user ID.
     */
    if (userId) {
      result = await pool.query(
        `
        SELECT
          id,
          email,
          role
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );
    }

    /*
     * Fallback to email if the JWT does not
     * expose the numeric user ID.
     */
    else if (email) {
      result = await pool.query(
        `
        SELECT
          id,
          email,
          role
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        `,
        [email]
      );
    }

    else {
      console.warn(
        "ADMIN CHECK: no user id/email in req.user",
        user
      );

      return false;
    }

    const dbUser =
      result?.rows?.[0];

    if (!dbUser) {
      console.warn(
        "ADMIN CHECK: user not found",
        {
          userId,
          email,
        }
      );

      return false;
    }

    const role =
      String(
        dbUser.role || ""
      )
        .trim()
        .toLowerCase();

    console.log(
      "ADMIN CHECK:",
      {
        id: dbUser.id,
        email: dbUser.email,
        role,
      }
    );

    return (
      role === "admin" ||
      role === "full admin" ||
      role === "super admin"
    );

  } catch (err) {
    console.error(
      "ADMIN CHECK FAILED",
      err
    );

    return false;
  }
}

async function ensureLayoutsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dashboard_layouts (
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

function sanitizeHtml(input) {
  const html = String(input || "");
  const lower = html.toLowerCase();
  const forbidden = [
    "<script",
    "<iframe",
    "<object",
    "<embed",
    "<link",
    "javascript:",
  ];
  if (forbidden.some((t) => lower.includes(t))) {
    return { ok: false, error: "HTML contains forbidden tags or protocols." };
  }
  if (/(?:^|\s)on[a-z]+\s*=/.test(lower)) {
    return { ok: false, error: "HTML contains inline event handlers." };
  }

  const matches = [...html.matchAll(/data-chart\s*=\s*["']?([a-zA-Z0-9_-]+)["']?/g)];
  if (!matches.length) {
    return { ok: false, error: "HTML must include at least one data-chart placeholder." };
  }
  const chartSlots = matches.map((m) => m[1]);

  const allowedTags = new Set([
    "div",
    "section",
    "main",
    "aside",
    "header",
    "footer",
    "nav",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "span",
    "ul",
    "ol",
    "li",
    "button",
    "i",
    "strong",
    "em",
    "small",
    "br",
    "hr",
    "style",
  ]);

  const root = parse(html, {
    lowerCaseTagName: true,
    comment: false,
    blockTextElements: { script: true, style: true, pre: true },
  });

  const styleNodes = root.querySelectorAll("style");
  const styleText = styleNodes.map((n) => n.text).join("\n");
  if (styleText.toLowerCase().includes("javascript:")) {
    return { ok: false, error: "HTML contains forbidden tags or protocols." };
  }

  const sanitizeAttrs = (attrs) => {
    const props = {};
    Object.entries(attrs || {}).forEach(([key, value]) => {
      const lowerKey = String(key || "").toLowerCase();
      if (!lowerKey || lowerKey.startsWith("on")) return;
      if (lowerKey === "class") {
        props.className = value;
        return;
      }
      if (lowerKey.startsWith("data-")) {
        props[lowerKey] = value;
        return;
      }
      if (lowerKey.startsWith("aria-") || lowerKey === "role") {
        props[lowerKey] = value;
      }
    });
    return props;
  };

  const buildSchema = (node) => {
    if (!node) return null;
    if (node.nodeType === 3) {
      const text = node.rawText || "";
      if (!text.trim()) return null;
      return { type: "text", text };
    }
    if (node.nodeType !== 1) return null;

    const tag = String(node.tagName || "").toLowerCase();
    if (!allowedTags.has(tag)) {
      const children = (node.childNodes || []).map(buildSchema).filter(Boolean);
      return { type: "fragment", children };
    }

    const props = sanitizeAttrs(node.attributes || {});
    const children = (node.childNodes || []).map(buildSchema).filter(Boolean);
    return { type: "element", tag, props, children };
  };

  const normalizeNode = (node) => {
    if (!node) return [];
    if (node.type === "fragment") return node.children || [];
    return [node];
  };

  const bodyNode = root.querySelector("body") || root;
  const bodyChildren = (bodyNode.childNodes || [])
    .map(buildSchema)
    .filter(Boolean)
    .flatMap(normalizeNode);

  const schemaChildren = [];
  if (styleText.trim()) {
    schemaChildren.push({
      type: "element",
      tag: "style",
      props: {},
      children: [{ type: "text", text: styleText }],
    });
  }
  schemaChildren.push(...bodyChildren);

  const schema = { type: "fragment", children: schemaChildren };

  return { ok: true, html, chartSlots, schema };
}

router.use(verifyToken, checkSubscription("Business Automation"));

router.get("/", async (req, res) => {
  try {
    await ensureLayoutsTable();
    const isAdmin =
      await isAdminUser(
        req.user
      );
    const tenantId = Number(req.user?.tenant_id) || null;

    if (isAdmin) {
      const { rows } = await pool.query(
        `SELECT id, tenant_id, dashboard_name, description, layout_definition, status, created_by, date_created
         FROM dashboard_layouts
         ORDER BY id DESC`
      );
      return res.json(rows);
    }

    if (!tenantId) {
      return res.status(400).json({ error: "Invalid tenant" });
    }

    const { rows } = await pool.query(
      `SELECT id, tenant_id, dashboard_name, description, layout_definition, status, created_by, date_created
       FROM dashboard_layouts
       WHERE tenant_id IN (0, $1)
       ORDER BY id DESC`,
      [tenantId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


/* =============================================================================
   REGISTER / UPDATE CODE-BASED DASHBOARD TEMPLATE
============================================================================= */

router.post("/register-template", async (req, res) => {
  try {
    await ensureLayoutsTable();

     console.log(
  "REGISTER TEMPLATE AUTH USER:",
  req.user
);

const isAdmin =
  await isAdminUser(
    req.user
  );

if (!isAdmin) {
  return res.status(403).json({
    error:
      "Admin access required to register dashboard templates",
  });
}

    const {
      dashboardName,
      description,
      layoutDefinition,
    } = req.body || {};

    if (!dashboardName) {
      return res.status(400).json({
        error:
          "dashboardName is required",
      });
    }

    if (
      !layoutDefinition ||
      typeof layoutDefinition !==
        "object"
    ) {
      return res.status(400).json({
        error:
          "layoutDefinition is required",
      });
    }

    const templateKey =
      String(
        layoutDefinition.templateKey ||
          ""
      ).trim();

    if (!templateKey) {
      return res.status(400).json({
        error:
          "layoutDefinition.templateKey is required",
      });
    }

    if (!layoutDefinition.schema) {
      return res.status(400).json({
        error:
          "layoutDefinition.schema is required",
      });
    }

    /*
     * Look for an existing system template
     * with the same templateKey.
     */

    const existing =
      await pool.query(
        `
        SELECT id
        FROM dashboard_layouts
        WHERE tenant_id = 0
          AND layout_definition->>'templateKey' = $1
        LIMIT 1
        `,
        [templateKey]
      );

    let result;

    /* -------------------------------------------------------------------------
       UPDATE EXISTING TEMPLATE
    ------------------------------------------------------------------------- */

    if (existing.rows.length) {
      result =
        await pool.query(
          `
          UPDATE dashboard_layouts
          SET
            dashboard_name = $1,
            description = $2,
            layout_definition = $3::jsonb,
            status = 'Active',
            modified_by = $4,
            date_modified = now()
          WHERE id = $5
          RETURNING
            id,
            tenant_id,
            dashboard_name,
            description,
            layout_definition,
            status,
            created_by,
            date_created,
            modified_by,
            date_modified
          `,
          [
            dashboardName,
            description || null,
            JSON.stringify(
              layoutDefinition
            ),
            req.user?.id || null,
            existing.rows[0].id,
          ]
        );
    }

    /* -------------------------------------------------------------------------
       INSERT NEW TEMPLATE
    ------------------------------------------------------------------------- */

    else {
      result =
        await pool.query(
          `
          INSERT INTO dashboard_layouts
          (
            tenant_id,
            dashboard_name,
            description,
            layout_definition,
            status,
            created_by
          )
          VALUES
          (
            0,
            $1,
            $2,
            $3::jsonb,
            'Active',
            $4
          )
          RETURNING
            id,
            tenant_id,
            dashboard_name,
            description,
            layout_definition,
            status,
            created_by,
            date_created
          `,
          [
            dashboardName,
            description || null,
            JSON.stringify(
              layoutDefinition
            ),
            req.user?.id || null,
          ]
        );
    }

    res.json(result.rows[0]);

  } catch (e) {
    console.error(
      "Failed to register dashboard template",
      e
    );

    res.status(500).json({
      error: e.message,
    });
  }
});


router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    await ensureLayoutsTable();
    const isAdmin =
      await isAdminUser(
        req.user
      );
    const tenantId = Number(req.user?.tenant_id) || null;

    /*
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }
    */

    const file = req.file;
    if (!file) return res.status(400).json({ error: "File is required" });

    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ext !== ".html" && ext !== ".txt") {
      return res.status(400).json({ error: "Only .html or .txt allowed" });
    }

    const raw = file.buffer.toString("utf8");
    const sanitized = sanitizeHtml(raw);
    if (!sanitized.ok) {
      return res.status(400).json({ error: sanitized.error });
    }

    const dashboardName =
      String(req.body?.dashboardName || "").trim() ||
      path.basename(file.originalname, ext);

    if (!dashboardName) {
      return res.status(400).json({ error: "dashboardName is required" });
    }

    const layoutDefinition = {
      html: sanitized.html,
      schema: sanitized.schema,
      chartSlots: sanitized.chartSlots,
    };

    const tenantToSave = isAdmin ? 0 : tenantId;

    const { rows } = await pool.query(
      `INSERT INTO dashboard_layouts (tenant_id, dashboard_name, description, layout_definition, status, created_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6)
       RETURNING id, tenant_id, dashboard_name, description, layout_definition, status, created_by, date_created`,
      [
        tenantToSave,
        dashboardName,
        req.body?.description || null,
        JSON.stringify(layoutDefinition),
        "Active",
        req.user?.id || null,
      ]
    );

    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
