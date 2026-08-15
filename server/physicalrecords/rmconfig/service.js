// server/physicalrecords/rmconfig/service.js
const db = require("../../db");
const { resolveResource } = require("./validators");

async function auditLog({ tenant_id, actor_user_id, action, entity_type, entity_id, before, after, ip }) {
  if (entity_type === "audit-log") return;
  try {
    await db.query(
      `INSERT INTO public.rm_audit_log
       (tenant_id, actor_user_id, action, entity_type, entity_id, before, after, ip, created_by, modified_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$2,$2)`,
      [tenant_id ?? null, actor_user_id ?? null, action, entity_type, entity_id ?? null, before ?? null, after ?? null, ip ?? null]
    );
  } catch { /* non-blocking */ }
}

function toSqlIdent(s) {
  return String(s || "").replace(/[^a-zA-Z0-9_]/g, "") || "id";
}

function normalizeJsonFields(obj, resName) {
  const out = { ...obj };

  // Parse any "*_json" string fields
  for (const [k, v] of Object.entries(out)) {
    if (k.endsWith('_json') && typeof v === 'string') {
      const s = v.trim();
      if (!s) { out[k] = null; continue; }
      try { out[k] = JSON.parse(s); }
      catch (e) {
        const err = new Error(`Invalid JSON for ${k}: ${e.message}`);
        err.status = 400;
        throw err;
      }
    }
  }

  // Metadata Categories: always end up with array of plain objects
  if (resName === 'metadata-categories') {
    let fj = out.fields_json;
    if (fj == null) fj = [];
    if (typeof fj === 'string') {
      try { fj = JSON.parse(fj); } catch { fj = []; }
    }
    if (!Array.isArray(fj)) fj = [fj];

    // If any element arrived as a JSON string like '{"field_name":"..."}'
    fj = fj.map(x => {
      if (typeof x === 'string') {
        try { return JSON.parse(x); } catch { return null; }
      }
      return (x && typeof x === 'object') ? x : null;
    }).filter(Boolean);

    out.fields_json = fj;
  }

  return out;
}



function buildPkWhere(keyDef, keyObj, start = 1, alias = "t") {
  const keys = Array.isArray(keyDef) ? keyDef : [keyDef];
  const clause = keys.map((k, i) => `${alias}.${toSqlIdent(k)} = $${start + i}`).join(" AND ");
  const values = keys.map((k) => keyObj[k]);
  return { clause, values, next: start + keys.length };
}

function pickAuditEntityId(keyDef, rowOrKeyObj) {
  if (Array.isArray(keyDef)) return null;             // composite keys: no single id
  const k = keyDef;
  const v = rowOrKeyObj?.[k];
  return Number.isFinite(Number(v)) ? Number(v) : null;
}

function requireTenant(user) {
  const tid = Number(user?.tenant_id);
  if (!Number.isFinite(tid)) {
    const err = new Error("Missing tenant in session");
    err.status = 401;
    throw err;
  }
  return tid;
}

// Whitelist columns you actually have per resource
const ALLOWED_SORTS = {
  "retention-policies": ["id","code","name","date_created"],
  "fileplan-nodes":     ["id","code","title","order_no","date_created"],
  // add others as needed...
};
// Optional aliasing (lets old clients send policy_name)
const SORT_ALIAS = { policy_name: "name" };

let POLICY_NAME_COL = "name";
(async () => {
  try {
    const q = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='rm_retention_policy'
        AND column_name IN ('name','policy_name','policyname')
      LIMIT 1
    `);
    POLICY_NAME_COL = q.rows[0]?.column_name || "name";
    console.log("[rmconfig] policy name column:", POLICY_NAME_COL);
  } catch (e) {
    console.warn("[rmconfig] could not detect policy name column:", e.message);
  }
})();

module.exports = {
  async list(resName, params = {}, user) {
    const { table } = resolveResource(resName);
    const {
      text = "",
      page = 1,
      pageSize = 20,
      sortBy = "id",
      sortDir = "asc",
    } = params;

    const tenantId = requireTenant(user);

    // const sort = toSqlIdent(sortBy);
    // const dir = String(sortDir).toLowerCase() === "desc" ? "desc" : "asc";
    const reqSort   = SORT_ALIAS[sortBy] || sortBy || "id";
    const allowed   = ALLOWED_SORTS[resName] || ["id"];
    const safeSort  = allowed.includes(reqSort) ? reqSort : "id";
    const sort      = toSqlIdent(safeSort);
    const dir       = String(sortDir).toLowerCase() === "desc" ? "desc" : "asc";

    const offset = (page - 1) * pageSize;

    const where = [`t.tenant_id = $1`];
    const values = [tenantId];
    let i = 2;

    if (text) {
      where.push(`to_jsonb(t)::text ILIKE $${i++}`);
      values.push(`%${text}%`);
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;

    const { rows: cnt } = await db.query(
      `SELECT COUNT(*)::int AS c FROM ${table} t ${whereSql}`,
      values
    );
    const total = cnt[0]?.c || 0;

    // const { rows } = await db.query(
    //   `SELECT * FROM ${table} t ${whereSql}
    //    ORDER BY ${sort} ${dir}
    //    LIMIT $${i} OFFSET $${i + 1}`,
    //   [...values, pageSize, offset]
    // );

   const selectSql =
      resName === "fileplan-nodes"
        ? `SELECT t.*,
            rp.code AS retention_policy_code,
            rp.name AS retention_policy_name
             FROM ${table} t
             LEFT JOIN public.rm_retention_policy rp
               ON rp.id = t.retention_policy_id`
        : `SELECT * FROM ${table} t`;

    const { rows } = await db.query(
      `${selectSql} ${whereSql}
       ORDER BY ${sort} ${dir}
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, pageSize, offset]
    );

    return { items: rows, page, pageSize, total, hasMore: offset + rows.length < total };
  },

  async create(resName, body, user, ip) {
    const { table, key } = resolveResource(resName);
    const tenantId = requireTenant(user);

    // Force tenant_id and normalize json-ish fields
    body = { ...body, tenant_id: tenantId };
    body = normalizeJsonFields(body, resName);

    const cols = Object.keys(body);
    const vals = Object.values(body);
    const params = cols.map((_, idx) => `$${idx + 1}`).join(",");

    // Ensure jsonb gets valid JSON text
if (resName === 'metadata-categories') {
  const idx = cols.indexOf('fields_json');
  if (idx !== -1) {
    try {
      vals[idx] = JSON.stringify(vals[idx] ?? []);
    } catch (e) {
      const err = new Error(`Invalid fields_json: ${e.message}`);
      err.status = 400;
      throw err;
    }
  }
}


    const { rows } = await db.query(
      `INSERT INTO ${table} (${cols.map(toSqlIdent).join(",")})
       VALUES (${params})
       RETURNING *`,
      vals
    );
    const row = rows[0] || null;

    await auditLog({
      tenant_id: row?.tenant_id ?? tenantId,
      actor_user_id: user?.id ?? null,
      action: "create",
      entity_type: resName,
      entity_id: row ? pickAuditEntityId(key, row) : null,
      before: null,
      after: row,
      ip
    });

    return row;
  },

  async get(resName, idOrObj, user) {
    const { table, key } = resolveResource(resName);
    const tenantId = requireTenant(user);
    const keyObj = typeof idOrObj === "object" ? idOrObj : { [key]: idOrObj };

    const { clause, values, next } = buildPkWhere(key, keyObj, 2, "t");
    const { rows } = await db.query(
      `SELECT * FROM ${table} t WHERE t.tenant_id = $1 AND ${clause}`,
      [tenantId, ...values]
    );
    return rows[0] || null;
  },

  async patch(resName, keyObj, body, user, ip) {
    const { table, key } = resolveResource(resName);
    const tenantId = requireTenant(user);

    // Disallow tenant changes
    if ("tenant_id" in body) delete body.tenant_id;

    // Confirm row exists in this tenant
    const before = await this.get(resName, keyObj, user);
    if (!before) return null;

    if (resName === 'metadata-categories') {
  console.log('[rmconfig] incoming fields_json typeof:', typeof body.fields_json, 
              'example:', Array.isArray(body.fields_json) ? body.fields_json[0] : body.fields_json);
}

    body = normalizeJsonFields(body, resName);

    const sets = [];
    const vals = [];
    let i = 1;
    for (const [k, v] of Object.entries(body)) {
      sets.push(`${toSqlIdent(k)} = $${i++}`);
      vals.push(v);
    }
    if (resName === 'metadata-categories') {
  const fi = Object.keys(body).indexOf('fields_json');
  if (fi !== -1) {
    try {
      vals[fi] = JSON.stringify(vals[fi] ?? []);
    } catch (e) {
      const err = new Error(`Invalid fields_json: ${e.message}`);
      err.status = 400;
      throw err;
    }
  }
}

    sets.push(`date_modified = NOW()`);

    // WHERE t.tenant_id = $i AND (pk = ...)
    const tenantParam = `$${i++}`;
    vals.push(tenantId);
    const { clause, values: keyVals } = buildPkWhere(key, keyObj, i, "t");
    vals.push(...keyVals);

    const { rows } = await db.query(
      `UPDATE ${table} t
         SET ${sets.join(", ")}
       WHERE t.tenant_id = ${tenantParam} AND ${clause}
       RETURNING *`,
      vals
    );
    const row = rows[0] || null;

    await auditLog({
      tenant_id: row?.tenant_id ?? tenantId,
      actor_user_id: user?.id ?? null,
      action: "update",
      entity_type: resName,
      entity_id: row ? pickAuditEntityId(key, row) : pickAuditEntityId(key, keyObj),
      before,
      after: row,
      ip
    });

    return row;
  },

  async remove(resName, keyObj, user, ip) {
    const { table, key } = resolveResource(resName);
    const tenantId = requireTenant(user);

    // Confirm row exists in this tenant
    const before = await this.get(resName, keyObj, user);
    if (!before) return { ok: false, deleted: 0 };

    // DELETE with tenant guard
    const { clause, values } = buildPkWhere(key, keyObj, 2, "t");
    const { rowCount } = await db.query(
      `DELETE FROM ${table} t
        WHERE t.tenant_id = $1 AND ${clause}`,
      [tenantId, ...values]
    );

    await auditLog({
      tenant_id: before?.tenant_id ?? tenantId,
      actor_user_id: user?.id ?? null,
      action: "delete",
      entity_type: resName,
      entity_id: pickAuditEntityId(key, before) ?? pickAuditEntityId(key, keyObj),
      before,
      after: null,
      ip
    });

    return { ok: true, deleted: rowCount };
  },
};


// // server/physicalrecords/rmconfig/service.js
// const db = require("../../db");
// const { resolveResource } = require("./validators");

// function resolveTenantForCreate(user, body, opts = {}) {
//   if (!user?.tenant_id && !opts.sudoAll) {
//     throw new Error("Missing tenant in session");
//   }
//   // If sudoAll and a tenant_id is explicitly provided in body, allow that; else fallback to user.tenant_id
//   const bodyTenant = body?.tenant_id;
//   if (opts.sudoAll && bodyTenant) return Number(bodyTenant);
//   return Number(user?.tenant_id);
// }

// async function auditLog({
//   tenant_id, actor_user_id, action, entity_type, entity_id, before, after, ip,
// }) {
//   // avoid recursive logging on audit table itself
//   if (entity_type === "audit-log") return;
//   try {
//     await db.query(
//       `INSERT INTO public.rm_audit_log
//        (tenant_id, actor_user_id, action, entity_type, entity_id, before, after, ip, created_by, modified_by)
//        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$2,$2)`,
//       [
//         tenant_id ?? null,
//         actor_user_id ?? null,
//         action,
//         entity_type,
//         entity_id ?? null,        // may be null for composite PKs
//         before ?? null,
//         after ?? null,
//         ip ?? null,
//       ],
//     );
//   } catch {
//     /* non-blocking */
//   }
// }

// function toSqlIdent(s) {
//   return String(s || "")
//     .replace(/[^a-zA-Z0-9_]/g, "")
//     || "id";
// }

// function buildPkWhere(keyDef, keyObj, start = 1) {
//   const keys = Array.isArray(keyDef) ? keyDef : [keyDef];
//   const clause = keys.map((k, i) => `${toSqlIdent(k)} = $${start + i}`).join(" AND ");
//   const values = keys.map((k) => keyObj[k]);
//   return { clause, values, next: start + keys.length };
// }

// function pickAuditEntityId(keyDef, keyObjOrRow) {
//   // Only return a numeric id if the PK is single-column (e.g., "id").
//   if (Array.isArray(keyDef)) return null;
//   const k = keyDef;
//   const v = keyObjOrRow?.[k];
//   return Number.isFinite(Number(v)) ? Number(v) : null;
// }

// module.exports = {
//   async list(resName, params = {}, user, opts = {}) {
//     const { table } = resolveResource(resName);
//     const {
//       text = "",
//       page = 1,
//       pageSize = 20,
//       sortBy = "id",
//       sortDir = "asc",
//     } = params;

//     const sort = toSqlIdent(sortBy);
//     const dir = String(sortDir).toLowerCase() === "desc" ? "desc" : "asc";
//     const offset = (page - 1) * pageSize;

//     const where = [];
//     const values = [];
//     let i = 1;

//      //Tenant filter unless superadmin with all-tenants toggle
//    if (!opts.sudoAll) {
//     where.push(`t.tenant_id = $${i++}`);
//     values.push(Number(user?.tenant_id));
//   }

//     if (text) {
//       where.push(`to_jsonb(t)::text ILIKE $${i++}`);
//       values.push(`%${text}%`);
//     }
//     const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

//     const { rows: cnt } = await db.query(
//       `SELECT COUNT(*)::int AS c FROM ${table} t ${whereSql}`,
//       values,
//     );
//     const total = cnt[0]?.c || 0;

//     const { rows } = await db.query(
//       `SELECT * FROM ${table} t ${whereSql}
//        ORDER BY ${sort} ${dir}
//        LIMIT $${i} OFFSET $${i + 1}`,
//       [...values, pageSize, offset],
//     );

//     return { items: rows, page, pageSize, total, hasMore: offset + rows.length < total };
//   },

//   async create(resName, body, user, ip, opts = {}) {
//     const { table, key } = resolveResource(resName);

//     // Force tenant_id on the server side
//    const tenantId = resolveTenantForCreate(user, body, opts);
//    body = { ...body, tenant_id: tenantId }

//     const cols = Object.keys(body);
//     const vals = Object.values(body);
//     const params = cols.map((_, idx) => `$${idx + 1}`).join(",");

//     const { rows } = await db.query(
//       `INSERT INTO ${table} (${cols.map(toSqlIdent).join(",")})
//        VALUES (${params})
//        RETURNING *`,
//       vals,
//     );

//     const row = rows[0] || null;

//     await auditLog({
//       //tenant_id: row?.tenant_id ?? body.tenant_id ?? null,
//       tenant_id: row?.tenant_id ?? user?.tenant_id ?? null,
//       actor_user_id: user?.id ?? null,
//       action: "create",
//       entity_type: resName,
//       entity_id: row ? pickAuditEntityId(key, row) : null,
//       before: null,
//       after: row,
//       ip,
//     });

//     return row;
//   },

//   async get(resName, idOrObj) {
//     const { table, key } = resolveResource(resName);
//     const keyObj = typeof idOrObj === "object" ? idOrObj : { [key]: idOrObj };
//     const { clause, values } = buildPkWhere(key, keyObj, 1);
//     const { rows } = await db.query(`SELECT * FROM ${table} WHERE ${clause}`, values);
//     return rows[0] || null;
//   },

//   async patch(resName, keyObj, body, user, ip, opts = {}) {
//     const { table, key } = resolveResource(resName);
//     const before = await this.get(resName, keyObj);

//     // Prevent clients from changing tenant; allow only for sudoAll
//   if ("tenant_id" in body && !opts.sudoAll) {
//      delete body.tenant_id;
//    }

//     const sets = [];
//     const vals = [];
//     let i = 1;
//     for (const [k, v] of Object.entries(body)) {
//       sets.push(`${toSqlIdent(k)} = $${i++}`);
//       vals.push(v);
//     }
//     sets.push(`date_modified = NOW()`);

//     const { clause, values: keyVals } = buildPkWhere(key, keyObj, i);
//     vals.push(...keyVals);

//     const { rows } = await db.query(
//       `UPDATE ${table} SET ${sets.join(", ")} WHERE ${clause} RETURNING *`,
//       vals,
//     );
//     const row = rows[0] || null;

//     await auditLog({
//       tenant_id: row?.tenant_id ?? before?.tenant_id ?? null,
//       actor_user_id: user?.id ?? null,
//       action: "update",
//       entity_type: resName,
//       entity_id: row ? pickAuditEntityId(key, row) : pickAuditEntityId(key, keyObj),
//       before,
//       after: row,
//       ip,
//     });

//     return row;
//   },

//   async remove(resName, keyObj, user, ip) {
//     const { table, key } = resolveResource(resName);
//     const before = await this.get(resName, keyObj);

//     const { clause, values } = buildPkWhere(key, keyObj, 1);
//     const { rowCount } = await db.query(`DELETE FROM ${table} WHERE ${clause}`, values);

//     await auditLog({
//       tenant_id: before?.tenant_id ?? null,
//       actor_user_id: user?.id ?? null,
//       action: "delete",
//       entity_type: resName,
//       entity_id: pickAuditEntityId(key, before) ?? pickAuditEntityId(key, keyObj),
//       before,
//       after: null,
//       ip,
//     });

//     return { ok: true, deleted: rowCount };
//   },
// };


// // // server/physicalrecords/rmconfig/service.js
// // const db = require("../../db");          // <- same db helper path as your other modules
// // const { resolveResource } = require("./validators");

// // async function auditLog({ tenant_id, actor_user_id, action, entity_type, entity_id, before, after, ip }) {
// //   // avoid recursive logging when writing audit-log itself
// //   if (entity_type === "audit-log") return;
// //   try {
// //     await db.query(
// //       `INSERT INTO public.rm_audit_log
// //        (tenant_id, actor_user_id, action, entity_type, entity_id, before, after, ip, created_by, modified_by)
// //        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$2,$2)`,
// //       [tenant_id ?? null, actor_user_id ?? null, action, entity_type, entity_id ?? null, before ?? null, after ?? null, ip ?? null]
// //     );
// //   } catch { /* non-blocking */ }
// // }

// // function toSqlIdent(s) { return s.replace(/[^a-zA-Z0-9_]/g, ""); }

// // function buildPkWhere(keyDef, keyObj, start = 1) {
// //   const keys = Array.isArray(keyDef) ? keyDef : [keyDef];
// //   const clause = keys.map((k, i) => `${k} = $${start + i}`).join(" AND ");
// //   const values = keys.map(k => keyObj[k]);
// //   return { clause, values, next: start + keys.length };
// // }

// // module.exports = {
// //   async list(resName, params) {
// //     const { table } = resolveResource(resName);
// //     const { text, page, pageSize, sortBy, sortDir } = params;

// //     // Safe sort
// //     const sort = toSqlIdent(sortBy);
// //     const dir  = sortDir === "asc" ? "asc" : "desc";

// //     const offset = (page - 1) * pageSize;

// //     const where = [];
// //     const values = [];
// //     let i = 1;

// //     if (text) {
// //       where.push(`to_jsonb(t)::text ILIKE $${i++}`);
// //       values.push(`%${text}%`);
// //     }
// //     const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

// //     const { rows: cnt } = await db.query(`SELECT COUNT(*)::int AS c FROM ${table} t ${whereSql}`, values);
// //     const total = cnt[0]?.c || 0;

// //     const { rows } = await db.query(
// //      `SELECT * FROM ${table} t ${whereSql} ORDER BY ${sort} ${dir} LIMIT $${i} OFFSET $${i+1}`,
// //      [...values, pageSize, offset]
// //    );

// //     return { items: rows, page, pageSize, total, hasMore: offset + rows.length < total };
// //   },

// //   async create(resName, body, user, ip) {
// //     const { table } = resolveResource(resName);

// //     const cols = Object.keys(body);
// //     const vals = Object.values(body);
// //     const params = cols.map((_, idx) => `$${idx+1}`).join(",");

// //     const { rows } = await db.query(
// //       `INSERT INTO ${table} (${cols.map(toSqlIdent).join(",")})
// //        VALUES (${params})
// //        RETURNING *`,
// //       vals
// //     );

// //     await auditLog({
// //       tenant_id: body.tenant_id ?? null,
// //       actor_user_id: user?.id ?? null,
// //       action: "create",
// //       entity_type: resName,
// //       entity_id: rows[0]?.id ?? null,
// //       before: null,
// //       after: rows[0] ?? null,
// //       ip
// //     });

// //     return rows[0];
// //   },

// //   async get(resName, idOrObj) {
// //    const { table, key } = resolveResource(resName);
// //    const keyObj = typeof idOrObj === "object" ? idOrObj : { [key]: idOrObj };
// //    const { clause, values } = buildPkWhere(key, keyObj, 1);
// //    const { rows } = await db.query(`SELECT * FROM ${table} WHERE ${clause}`, values);
// //     return rows[0] || null;
// //   },

// //   // get()
// //   async get(resName, keyObj) {
// //   const { table, key } = resolveResource(resName);
// //   const { clause, values } = buildPkWhere(key, keyObj, 1);
// //   const { rows } = await db.query(`SELECT * FROM ${table} WHERE ${clause}`, values);
// //   return rows[0] || null;
// // }


// //   async patch(resName, keyObj, body, user, ip) {
// //   const { table, key } = resolveResource(resName);
// //   const before = await this.get(resName, keyObj);

// //     const before = await this.get(resName, keyObj);

// //     const sets = [];
// //     const vals = [];
// //     let i = 1;
// //     for (const [k, v] of Object.entries(body)) {
// //       sets.push(`${toSqlIdent(k)} = $${i++}`);
// //       vals.push(v);
// //     }
// //     sets.push(`date_modified = NOW()`);

// //     const { clause, values: keyVals, next } = buildPkWhere(key, keyObj, i);
// //   vals.push(...keyVals);
// //   const { rows } = await db.query(
// //     `UPDATE ${table} SET ${sets.join(", ")} WHERE ${clause} RETURNING *`,
// //     vals
// //   );

// //     await auditLog({
// //       tenant_id: rows[0]?.tenant_id ?? null,
// //       actor_user_id: user?.id ?? null,
// //       action: "update",
// //       entity_type: resName,
// //       entity_id: id,
// //       before,
// //       after: rows[0] ?? null,
// //       ip
// //     });

// //     return rows[0] || null;
// //   },

// //   async remove(resName, keyObj, user, ip) {
// //   const { table, key } = resolveResource(resName);
// //   const before = await this.get(resName, keyObj);
// //   const { clause, values } = buildPkWhere(key, keyObj, 1);
// //   const { rowCount } = await db.query(`DELETE FROM ${table} WHERE ${clause}`, values);

// //     await auditLog({
// //       tenant_id: before?.tenant_id ?? null,
// //       actor_user_id: user?.id ?? null,
// //       action: "delete",
// //       entity_type: resName,
// //       entity_id: id,
// //       before,
// //       after: null,
// //       ip
// //     });

// //     return { ok: true, deleted: rowCount };
// //   }
// // };
