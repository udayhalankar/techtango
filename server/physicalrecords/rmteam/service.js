// server/rmteam/service.js
const db = require("../../db");

module.exports = {
  async search({ text = "", role, active, page = 1, pageSize = 10, sortBy = "date_created", sortDir = "desc" }) {
    const allowedSort = new Set(["date_created","name","role","active"]);
    if (!allowedSort.has(sortBy)) sortBy = "date_created";
    sortDir = (String(sortDir).toLowerCase() === "asc") ? "asc" : "desc";

    const where = [];
    const params = [];
    let i = 1;

    if (text) { where.push(`(name ILIKE $${i} OR role ILIKE $${i} OR email ILIKE $${i} OR mobile ILIKE $${i})`); params.push(`%${text}%`); i++; }
    if (role) { where.push(`role = $${i}`); params.push(role); i++; }
    if (active !== undefined) { where.push(`active = $${i}`); params.push(!!active); i++; }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countSql = `SELECT COUNT(*)::int AS cnt FROM public.rmteam ${whereSql}`;
    const { rows: cntRows } = await db.query(countSql, params);
    const total = cntRows[0]?.cnt || 0;
    const offset = Math.max(0, (page - 1) * pageSize);

    const listSql = `
      SELECT id, name, role, date_created, date_modified, created_by, modified_by, active, mobile, email
      FROM public.rmteam
      ${whereSql}
      ORDER BY ${sortBy} ${sortDir}
      LIMIT $${i} OFFSET $${i+1}
    `;
    const { rows } = await db.query(listSql, [...params, pageSize, offset]);
    return { items: rows, page, pageSize, total, hasMore: offset + rows.length < total };
  },

  async create(body) {
    const q = `
      INSERT INTO public.rmteam (name, role, created_by, modified_by, active, mobile, email)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, date_created, date_modified
    `;
    const p = [body.name, body.role, body.createdBy, body.modifiedBy, body.active ?? true, body.mobile, body.email];
    const { rows } = await db.query(q, p);
    return { ok: true, id: rows[0].id, dateCreated: rows[0].date_created, dateModified: rows[0].date_modified };
  },

  async getById(id) {
    const { rows } = await db.query(`SELECT * FROM public.rmteam WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async patch(id, body) {
    const sets = [];
    const params = [];
    let i = 1;

    const map = {
      name: body.name,
      role: body.role,
      active: body.active,
      mobile: body.mobile,
      email: body.email,
      modified_by: body.modifiedBy,
    };
    Object.entries(map).forEach(([col,val]) => {
      if (val !== undefined) { sets.push(`${col} = $${i++}`); params.push(val); }
    });
    if (!sets.length) return { ok: true, updated: 0 };

    const sql = `UPDATE public.rmteam SET ${sets.join(", ")} WHERE id = $${i}`;
    params.push(id);
    const { rowCount } = await db.query(sql, params);
    return { ok: true, updated: rowCount };
  },

  async remove(id) {
    const { rowCount } = await db.query(`DELETE FROM public.rmteam WHERE id = $1`, [id]);
    return { ok: true, deleted: rowCount };
  },
};
