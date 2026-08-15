// server/routes/crudpages.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/checkSubscription");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

const upload = multer({ storage: multer.memoryStorage() });

// Simple guard for identifiers
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const algorithm = "aes-256-cbc";
const key = Buffer.from((process.env.FILE_ENCRYPT_KEY || "").trim(), "hex");
const ivLength = 16;

async function writeTemp(buffer, suffix = ".bin") {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "up-"));
  const p = path.join(dir, `buf${suffix}`);
  await fs.promises.writeFile(p, buffer);
  return p;
}

async function encryptFileFromPath(sourcePath, destPath, iv) {
  return new Promise((resolve, reject) => {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const input = fs.createReadStream(sourcePath);
    const output = fs.createWriteStream(destPath);
    input.pipe(cipher).pipe(output).on("finish", resolve).on("error", reject);
  });
}

async function ensureUploadsDir() {
  const dir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function getPkName(table, client) {
  const q = await (client || pool).query(
    `
    SELECT a.attname as col
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass AND i.indisprimary;
    `,
    [table]
  );
  return q.rows[0]?.col || "id";
}

async function getTenantId(userId, client) {
  const q = await (client || pool).query(
    `SELECT tenant FROM users WHERE id=$1`,
    [userId]
  );
  return q.rows[0]?.tenant ?? null;
}

const ATTACH_PREFIX = "attachment__";

// ───────────────────────────────────────────────────────────
// 0) All endpoints below require token + BA subscription
router.use(verifyToken, checkSubscription("Business Automation"));

// 1) Helper: list DB tables (schema public only)
router.get("/db/meta/tables", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json(rows.map(r => r.table_name));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2) Create storage table if not exists (id, tenant & timestamps, plus names)
async function ensureCrudTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crudwebpagetable (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL DEFAULT 1,
      dbtable_id BIGINT,
      created_by BIGINT,
      date_created TIMESTAMPTZ NOT NULL DEFAULT now(),
      modified_by BIGINT,
      date_modified TIMESTAMPTZ,
      page_name TEXT,
      form_name TEXT,
      table_name TEXT,
      page_url  TEXT,
      status    TEXT DEFAULT 'Active',
      description TEXT,
      validations JSONB,
      create_edit TEXT
    );
  `);
    // add columns if table already existed
  await pool.query(`ALTER TABLE crudwebpagetable ADD COLUMN IF NOT EXISTS page_url TEXT;`);
  await pool.query(`ALTER TABLE crudwebpagetable ADD COLUMN IF NOT EXISTS status TEXT;`);
  await pool.query(`ALTER TABLE crudwebpagetable ADD COLUMN IF NOT EXISTS description TEXT;`);
  await pool.query(`ALTER TABLE crudwebpagetable ADD COLUMN IF NOT EXISTS validations JSONB;`);
  await pool.query(`ALTER TABLE crudwebpagetable ADD COLUMN IF NOT EXISTS create_edit TEXT;`);
  await pool.query(`
    UPDATE crudwebpagetable c
    SET dbtable_id = t.id
    FROM form_templates t
    WHERE c.dbtable_id IS NULL
      AND c.table_name = t.table_name
  `);
}

// 3) List CRUD pages
router.get("/", async (req, res) => {
  try {
    await ensureCrudTable();
    const { rows } = await pool.query(`
      SELECT id, page_name, form_name, table_name, description, date_created, page_url, status
      FROM crudwebpagetable 
      ORDER BY id DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// NEW: get a single CRUD page meta by id (used by /crudwebpage/:pageId)
router.get("/:id", async (req, res) => {
  try {
    await ensureCrudTable();
    const q = await pool.query(
      `SELECT id, page_name, form_name, table_name, description, dbtable_id, validations, create_edit, date_created, page_url, status
       FROM crudwebpagetable WHERE id=$1`,
      [req.params.id]
    );
    if (!q.rows.length) return res.status(404).json({ error: "Page not found" });
    res.json(q.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

//3b) Get one CRUD page
router.get("/:id", async (req, res) => {
  await ensureCrudTable();
  const { rows } = await pool.query(
    `SELECT id, page_name, form_name, table_name, description, dbtable_id, validations, create_edit, page_url, status, date_created
     FROM crudwebpagetable WHERE id=$1`,
    [Number(req.params.id)]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// 4) Create a CRUD page
router.post("/", async (req, res) => {
  const { pageName, formName, tableName, pageUrl, status, dbtableId, description } = req.body || {};
  const dbId = Number(dbtableId);
  if (!pageName || !formName || !tableName || !dbId) {
    return res.status(400).json({ error: "pageName, formName, tableName, dbtableId required" });
  }
  if (!IDENT.test(tableName)) {
    return res.status(400).json({ error: "Invalid table name" });
  }
  try {
    await ensureCrudTable();
    const { rows } = await pool.query(
      `INSERT INTO crudwebpagetable(page_name, form_name, table_name, dbtable_id, page_url, status, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, page_name, form_name, table_name, description, dbtable_id, page_url, status, date_created`,
      [pageName, formName, tableName, dbId, pageUrl || null, status || 'Active', description, req.user?.id || null]
    );
    // If page_url not provided, generate it now and persist
    let row = rows[0];
    if (!row.page_url) {
      const url  = `/crudwebpage/${row.id}`;
      const upd  = await pool.query(
        `UPDATE crudwebpagetable SET page_url=$1 WHERE id=$2
         RETURNING id, page_name, form_name, table_name, description, dbtable_id, page_url, status, date_created`,
        [url, row.id]
      );
      row = upd.rows[0];
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5) Columns & primary key for a CRUD page
router.get("/:id/columns", async (req, res) => {
  try {
    const pg = await pool.query(`SELECT table_name FROM crudwebpagetable WHERE id=$1`, [req.params.id]);
    if (!pg.rows.length) return res.status(404).json({ error: "Page not found" });
    const table = pg.rows[0].table_name;
    if (!IDENT.test(table)) return res.status(400).json({ error: "Invalid table" });

    const cols = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position
    `, [table]);
    // naive pk detection
    const pk = await pool.query(`
      SELECT a.attname as col
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary;
    `, [table]);
    res.json({ columns: cols.rows.map(r=>r.column_name), primaryKey: pk.rows[0]?.col || "id" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 6) Fetch records (simple search)
router.get("/:id/records", async (req, res) => {
  try {
    const pg = await pool.query(`SELECT table_name FROM crudwebpagetable WHERE id=$1`, [req.params.id]);
    if (!pg.rows.length) return res.status(404).json({ error: "Page not found" });
    const table = pg.rows[0].table_name;
    if (!IDENT.test(table)) return res.status(400).json({ error: "Invalid table" });

    const { rows } = await pool.query(
      `SELECT * FROM "${table}" WHERE crudpageid=$1 ORDER BY 1 DESC LIMIT 500`,
      [Number(req.params.id)]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 7) Create record
router.post("/:id/records", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const pg = await pool.query(`SELECT table_name FROM crudwebpagetable WHERE id=$1`, [req.params.id]);
    if (!pg.rows.length) return res.status(404).json({ error: "Page not found" });
    const table = pg.rows[0].table_name;
    if (!IDENT.test(table)) return res.status(400).json({ error: "Invalid table" });
    const crudPageId = Number(req.params.id);
    const tenantId = await getTenantId(userId);
    if (!tenantId) return res.status(400).json({ error: "Invalid tenant" });

    // Build insert from body keys
    const data = { ...(req.body || {}), created_by: userId, tenant_id: tenantId };
    const keys = Object.keys(data || {}).filter(k => IDENT.test(k));
    if (!keys.length) return res.status(400).json({ error: "No values" });
    const cols = keys.map(k => `"${k}"`).join(",");
    const params = keys.map((_k,i)=>`$${i+1}`).join(",");
    const vals = keys.map(k => data[k]);

    await pool.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS crudpageid BIGINT`);
    const ins = await pool.query(
      `INSERT INTO "${table}" (${cols}) VALUES (${params}) RETURNING *`,
      vals
    );
    await pool.query(
      `UPDATE "${table}" SET crudpageid=$1 WHERE id=$2`,
      [crudPageId, ins.rows[0]?.id]
    );
    const updated = await pool.query(
      `SELECT * FROM "${table}" WHERE id=$1`,
      [ins.rows[0]?.id]
    );
    res.json(updated.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 7b) Create record + encrypted attachments (atomic DB transaction)
router.post("/:id/records-with-files", upload.any(), async (req, res) => {
  if (!key || key.length !== 32) {
    return res.status(500).json({
      error: "Server misconfiguration",
      message: "FILE_ENCRYPT_KEY invalid or missing (needs 64 hex chars).",
    });
  }
  const dataRaw = req.body?.data;
  if (!dataRaw) return res.status(400).json({ error: "Missing data payload" });

  let data;
  try {
    data = JSON.parse(dataRaw);
  } catch {
    return res.status(400).json({ error: "Invalid data payload" });
  }
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "Invalid data payload" });
  }

  const files = Array.isArray(req.files) ? req.files : [];
  const filesByField = new Map();
  files.forEach((f) => {
    const fieldName = String(f.fieldname || "");
    if (!fieldName.startsWith(ATTACH_PREFIX)) return;
    const keyName = fieldName.slice(ATTACH_PREFIX.length);
    if (!keyName) return;
    const list = filesByField.get(keyName) || [];
    list.push(f);
    filesByField.set(keyName, list);
  });

  const client = await pool.connect();
  const createdPaths = [];
  try {
    await client.query("BEGIN");
    const userId = req.user?.id;
    if (!userId) {
      await client.query("ROLLBACK");
      return res.status(401).json({ error: "Unauthorized" });
    }
    const pg = await client.query(`SELECT table_name FROM crudwebpagetable WHERE id=$1`, [req.params.id]);
    if (!pg.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Page not found" });
    }
    const table = pg.rows[0].table_name;
    if (!IDENT.test(table)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid table" });
    }
    const tenantId = await getTenantId(userId, client);
    if (!tenantId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid tenant" });
    }

    const insertData = { ...(data || {}), created_by: userId, tenant_id: tenantId };
    const keys = Object.keys(insertData || {}).filter((k) => IDENT.test(k));
    if (!keys.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No values" });
    }
    const cols = keys.map((k) => `"${k}"`).join(",");
    const params = keys.map((_k, i) => `$${i + 1}`).join(",");
    const vals = keys.map((k) => insertData[k]);

    const pkName = await getPkName(table, client);
    const ins = await client.query(
      `INSERT INTO "${table}" (${cols}) VALUES (${params}) RETURNING *`,
      vals
    );
    const row = ins.rows[0];
    const recordId = row?.[pkName];
    const crudPageId = Number(req.params.id);
    await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS crudpageid BIGINT`);
    await client.query(
      `UPDATE "${table}" SET crudpageid=$1 WHERE "${pkName}"=$2`,
      [crudPageId, recordId]
    );

    const uploadedBy = req.user?.id ?? req.user?.userId ?? null;
    const updates = {};

    for (const [field, list] of filesByField.entries()) {
      if (!IDENT.test(field)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Invalid attachment field: ${field}` });
      }
      const saved = [];
      for (const f of list) {
        const originalname = (f.originalname || "file").slice(0, 255);
        const stamp = Date.now().toString(36);
        const rand = crypto.randomBytes(8).toString("hex");
        const fname = `${stamp}_${rand}.enc`;
        const dir = await ensureUploadsDir();
        const destFS = path.join(dir, fname);
        const dbPath = path.posix.join("uploads", fname);

        const tmpPath = await writeTemp(f.buffer, ".bin");
        const iv = crypto.randomBytes(ivLength);
        await encryptFileFromPath(tmpPath, destFS, iv);
        try { await fs.promises.unlink(tmpPath); } catch (_) {}

        createdPaths.push(destFS);
        const { rows } = await client.query(
          `INSERT INTO approval_files
            (approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv, ref_table, ref_table_id)
           VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7)
           RETURNING id, approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv, ref_table, ref_table_id`,
          [
            null,
            originalname,
            dbPath,
            uploadedBy,
            iv.toString("hex"),
            table,
            recordId,
          ]
        );
        saved.push(rows[0]);
      }
      updates[field] = JSON.stringify(saved);
    }

    const updateKeys = Object.keys(updates);
    if (updateKeys.length) {
      const setters = updateKeys.map((k, i) => `"${k}"=$${i + 1}`).join(", ");
      const valsUpd = updateKeys.map((k) => updates[k]);
      valsUpd.push(recordId);
      await client.query(
        `UPDATE "${table}" SET ${setters} WHERE "${pkName}"=$${updateKeys.length + 1}`,
        valsUpd
      );
    }

    await client.query("COMMIT");
    res.json(row);
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    for (const p of createdPaths) {
      try { await fs.promises.unlink(p); } catch (_) {}
    }
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// 8) Update record (assumes numeric pk, commonly "id")
router.put("/:id/records/:pk", async (req, res) => {
  try {
    const pg = await pool.query(`SELECT table_name FROM crudwebpagetable WHERE id=$1`, [req.params.id]);
    if (!pg.rows.length) return res.status(404).json({ error: "Page not found" });
    const table = pg.rows[0].table_name;
    if (!IDENT.test(table)) return res.status(400).json({ error: "Invalid table" });

    const keys = Object.keys(req.body || {}).filter(k => IDENT.test(k));
    if (!keys.length) return res.status(400).json({ error: "No values" });

    const setters = keys.map((k,i)=> `"${k}"=$${i+1}`).join(", ");
    const vals = keys.map(k => req.body[k]);
    vals.push(Number(req.params.pk));

    const upd = await pool.query(
      `UPDATE "${table}" SET ${setters} WHERE id=$${keys.length+1} RETURNING *`,
      vals
    );
    res.json(upd.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 8b) Update record + encrypted attachments (atomic DB transaction)
router.put("/:id/records/:pk/with-files", upload.any(), async (req, res) => {
  if (!key || key.length !== 32) {
    return res.status(500).json({
      error: "Server misconfiguration",
      message: "FILE_ENCRYPT_KEY invalid or missing (needs 64 hex chars).",
    });
  }
  const dataRaw = req.body?.data;
  if (!dataRaw) return res.status(400).json({ error: "Missing data payload" });

  let data;
  try {
    data = JSON.parse(dataRaw);
  } catch {
    return res.status(400).json({ error: "Invalid data payload" });
  }
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "Invalid data payload" });
  }

  const files = Array.isArray(req.files) ? req.files : [];
  const filesByField = new Map();
  files.forEach((f) => {
    const fieldName = String(f.fieldname || "");
    if (!fieldName.startsWith(ATTACH_PREFIX)) return;
    const keyName = fieldName.slice(ATTACH_PREFIX.length);
    if (!keyName) return;
    const list = filesByField.get(keyName) || [];
    list.push(f);
    filesByField.set(keyName, list);
  });

  const client = await pool.connect();
  const createdPaths = [];
  try {
    await client.query("BEGIN");
    const pg = await client.query(`SELECT table_name FROM crudwebpagetable WHERE id=$1`, [req.params.id]);
    if (!pg.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Page not found" });
    }
    const table = pg.rows[0].table_name;
    if (!IDENT.test(table)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid table" });
    }

    const pkName = await getPkName(table, client);
    const keys = Object.keys(data || {}).filter((k) => IDENT.test(k));
    if (keys.length) {
      const setters = keys.map((k, i) => `"${k}"=$${i + 1}`).join(", ");
      const vals = keys.map((k) => data[k]);
      vals.push(Number(req.params.pk));
      await client.query(
        `UPDATE "${table}" SET ${setters} WHERE "${pkName}"=$${keys.length + 1}`,
        vals
      );
    }
    const recordId = Number(req.params.pk);
    const uploadedBy = req.user?.id ?? req.user?.userId ?? null;
    const updates = {};

    if (filesByField.size) {
      const fields = Array.from(filesByField.keys()).filter((f) => IDENT.test(f));
      const cols = fields.map((c) => `"${c}"`).join(", ");
      const existingRes = await client.query(
        `SELECT ${cols} FROM "${table}" WHERE "${pkName}"=$1`,
        [recordId]
      );
      const existingRow = existingRes.rows[0] || {};

      for (const [field, list] of filesByField.entries()) {
        if (!IDENT.test(field)) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: `Invalid attachment field: ${field}` });
        }
        const saved = [];
        for (const f of list) {
          const originalname = (f.originalname || "file").slice(0, 255);
          const stamp = Date.now().toString(36);
          const rand = crypto.randomBytes(8).toString("hex");
          const fname = `${stamp}_${rand}.enc`;
          const dir = await ensureUploadsDir();
          const destFS = path.join(dir, fname);
          const dbPath = path.posix.join("uploads", fname);

          const tmpPath = await writeTemp(f.buffer, ".bin");
          const iv = crypto.randomBytes(ivLength);
          await encryptFileFromPath(tmpPath, destFS, iv);
          try { await fs.promises.unlink(tmpPath); } catch (_) {}

          createdPaths.push(destFS);
          const { rows } = await client.query(
            `INSERT INTO approval_files
              (approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv, ref_table, ref_table_id)
             VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7)
             RETURNING id, approval_id, original_filename, encrypted_path, uploaded_by, uploaded_at, iv, ref_table, ref_table_id`,
            [
              null,
              originalname,
              dbPath,
              uploadedBy,
              iv.toString("hex"),
              table,
              recordId,
            ]
          );
          saved.push(rows[0]);
        }

        let existing = [];
        const raw = existingRow[field];
        if (raw) {
          try {
            const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed)) existing = parsed;
          } catch (_) {}
        }
        updates[field] = JSON.stringify([...existing, ...saved]);
      }
    }

    const updateKeys = Object.keys(updates);
    if (updateKeys.length) {
      const setters = updateKeys.map((k, i) => `"${k}"=$${i + 1}`).join(", ");
      const valsUpd = updateKeys.map((k) => updates[k]);
      valsUpd.push(recordId);
      await client.query(
        `UPDATE "${table}" SET ${setters} WHERE "${pkName}"=$${updateKeys.length + 1}`,
        valsUpd
      );
    }

    const finalRes = await client.query(
      `SELECT * FROM "${table}" WHERE "${pkName}"=$1 LIMIT 1`,
      [recordId]
    );
    await client.query("COMMIT");
    res.json(finalRes.rows[0]);
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    for (const p of createdPaths) {
      try { await fs.promises.unlink(p); } catch (_) {}
    }
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// 9) Delete record
router.delete("/:id/records/:pk", async (req, res) => {
  try {
    const pg = await pool.query(`SELECT table_name FROM crudwebpagetable WHERE id=$1`, [req.params.id]);
    if (!pg.rows.length) return res.status(404).json({ error: "Page not found" });
    const table = pg.rows[0].table_name;
    if (!IDENT.test(table)) return res.status(400).json({ error: "Invalid table" });

    await pool.query(`DELETE FROM "${table}" WHERE id=$1`, [Number(req.params.pk)]);
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 10) Delete one CRUD page
router.delete("/:id", async (req, res) => {
  await ensureCrudTable();
  await pool.query(`DELETE FROM crudwebpagetable WHERE id=$1`, [Number(req.params.id)]);
  res.json({ ok: true });
});

// 10b) Update validation config for a CRUD page
router.put("/:id/validation-config", async (req, res) => {
  await ensureCrudTable();
  const { validations, createEdit } = req.body || {};
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  await pool.query(
    `UPDATE crudwebpagetable
     SET validations=$1, create_edit=$2, modified_by=$3, date_modified=NOW()
     WHERE id=$4`,
    [validations ?? null, createEdit ?? null, req.user?.id || null, id]
  );
  res.json({ ok: true });
});

// 11) Bulk delete CRUD pages
router.post("/bulk-delete", async (req, res) => {
  const ids = (req.body?.ids || []).map(Number).filter(Boolean);
  if (!ids.length) return res.status(400).json({ error: "no ids" });
  await ensureCrudTable();
  await pool.query(`DELETE FROM crudwebpagetable WHERE id = ANY($1::bigint[])`, [ids]);
  res.json({ ok: true, count: ids.length });
});

module.exports = router;
