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
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const isAdmin = roles.some((r) => String(r).toLowerCase() === "admin");
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

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    await ensureLayoutsTable();
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const isAdmin = roles.some((r) => String(r).toLowerCase() === "admin");
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
