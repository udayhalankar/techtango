// server/routes/tableRows.js
const express = require("express");
const router = express.Router();
const pool = require('../db');

function sqlIdent(name) { return name.replace(/"/g, '""'); } // naive sanitize

// Query column names + PostgreSQL data_type for a public table
async function getColumnTypes(table) {
  const q = `
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = $1
  `;
  const r = await pool.query(q, [table]);
  const map = new Map();
  for (const row of r.rows) {
    map.set(String(row.column_name).toLowerCase(), String(row.data_type).toLowerCase());
  }
  return map;
}

// Coerce values by DB type; turn "" into NULL for typed columns
function coerceByType(value, type) {
  // undefined → null, "" → NULL for typed columns
  if (value === undefined || value === "") return type ? null : "";

  if (!type) return value;

  // 👇 NEW: flatten JS arrays when DB column is scalar text/varchar
  if (Array.isArray(value) && (type === "text" || type.includes("char"))) {
    value = value[0] ?? null;   // take first selected option
    if (value === null) return null;
  }

  // integers
  if (type.includes("int")) {
    if (value === null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? (Number.isInteger(n) ? n : Math.trunc(n)) : value;
  }

  // numeric/decimal/real/double
  if (type.includes("numeric") || type.includes("decimal") || type.includes("real") || type.includes("double")) {
    if (value === null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }

  // boolean
  if (type === "boolean") {
    if (value === null) return null;
    if (typeof value === "boolean") return value;
    const s = String(value).toLowerCase();
    if (["1","true","t","yes","y","on"].includes(s)) return true;
    if (["0","false","f","no","n","off"].includes(s)) return false;
    return value;
  }

  // date/timestamp/timestamptz
  if (type.includes("date") || type.includes("time")) {
    return value === null ? null : String(value);
  }

  // arrays/json/jsonb etc – pass through
  return value;
}


// Keep only keys that exist in the table (case-insensitive)
// function filterToKnownColumns(obj, typeMap) {
//   const out = {};
//   for (const [k, v] of Object.entries(obj || {})) {
//     const lc = String(k).toLowerCase();

//     // 🚫 skip workflow-only columns
//     if (RESERVED_WF_COLUMNS.has(lc)) continue;

//     if (typeMap.has(lc)) {
//       out[k] = coerceByType(v, typeMap.get(lc));
//     }
//   }
//   return out;
// }

function filterToKnownColumns(obj, typeMap) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const lc = String(k).toLowerCase();

    if (RESERVED_WF_COLUMNS.has(lc)) continue;

    if (typeMap.has(lc)) {
      // ✅ store under the DB column name (lowercase) so it matches the table
      out[lc] = coerceByType(v, typeMap.get(lc));
    }
  }
  return out;
}



const RESERVED_WF_COLUMNS = new Set([
  'performer',
  'wf_status',
  'review_requestor',
  'reviewer',
  'initiator',
  'audit_trail',
  'step_comments',
]);


router.post("/rows/:table", async (req, res) => {
  try {
    const rawTable = req.params.table;        // e.g. "custwf_sample_workflow"
    const table = sqlIdent(rawTable);        // quoted identifier

    console.log("POST /db/rows body for", rawTable, req.body);

    const typeMap = await getColumnTypes(rawTable);
    console.log("typeMap keys:", Array.from(typeMap.keys()));
    
    const clean = filterToKnownColumns(req.body || {}, typeMap);
    console.log("clean keys after filter:", Object.keys(clean));

    const cols = Object.keys(clean);
    if (!cols.length) {
      return res.status(400).json({ error: "no valid columns to insert" });
    }

    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const values = cols.map((c) => clean[c]);

    const insertSql = `
      INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")})
      VALUES (${placeholders.join(",")})
      RETURNING *;
    `;
    const insertResult = await pool.query(insertSql, values);
    const row = insertResult.rows?.[0];

    if (!row) {
      return res.status(500).json({ error: "Insert failed (no row returned)" });
    }

    // ✅ Just return the id; no more audit_trail on custwf_*
    return res.json({ id: row.id });
  } catch (e) {
    console.error("POST /db/rows failed:", e);
    res.status(400).json({ error: e.message });
  }
});



router.put("/rows/:table/:id", async (req, res) => {
  try {
    const rawTable = req.params.table;
    const table = sqlIdent(rawTable);
    const id = req.params.id;

    // ✅ use the helpers
    const typeMap = await getColumnTypes(rawTable);
    const clean = filterToKnownColumns(req.body || {}, typeMap);

    const cols = Object.keys(clean);
    if (!cols.length) return res.json({ ok: true });

    const sets = cols.map((c, i) => `"${c}" = $${i + 1}`).join(", ");
    const values = cols.map(c => clean[c]);

    const text = `UPDATE "${table}" SET ${sets} WHERE id = $${cols.length + 1}`;
    await pool.query(text, [...values, id]);

    res.json({ ok: true });
  } catch (e) {
    console.error("PUT /db/rows failed:", e);
    res.status(400).json({ error: e.message });
  }
});



router.post("/table/rows/:table", async (req, res) => {
  try {
    const table = req.params.table;
    const values = req.body?.values ?? req.body ?? {};
    if (!table) return res.status(400).json({ error: "Missing table" });
    if (!values || typeof values !== "object")
      return res.status(400).json({ error: "Missing values" });

    const cols = Object.keys(values).map((c) => `"${c}"`);
    const params = Object.values(values);
    const placeholders = params.map((_, i) => `$${i + 1}`);
    const sql = `INSERT INTO "${table}" (${cols.join(",")}) VALUES (${placeholders.join(",")}) RETURNING id;`;

    const out = await db.query(sql, params);
    return res.json({ id: out.rows?.[0]?.id, row: out.rows?.[0] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});



module.exports = router;