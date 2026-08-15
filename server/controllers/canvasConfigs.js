const pool = require('../db'); // keep path consistent

// Helpers
function required(value, name) {
  if (value === undefined || value === null || value === '') {
    const err = new Error(`${name} is required`);
    err.status = 400;
    throw err;
  }
}
const must = (v, n) => {
  if (v === undefined || v === null || v === '') {
    const e = new Error(`${n} is required`); e.status = 400; throw e;
  }
};

/* GET /api/canvas-configs/:id */
exports.getCanvasConfig = async (req, res) => {
  const id = Number(req.params.id);
  must(id, 'id');
  const { rows } = await pool.query('SELECT * FROM canvas_configs WHERE id=$1', [id]);
  if (!rows.length) return res.status(404).json({ message: 'Not found' });
  res.json(rows[0]);
};

/* GET /api/canvas-configs?page=&pageSize=&q=&archived= */
exports.listCanvasConfigs = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20', 10)));
  const q = (req.query.q || '').trim();
  const archived = req.query.archived === 'true';        // default false
  const orgId = req.query.org_id ? Number(req.query.org_id) : null; // since no auth

  const wheres = ['(is_archived = $1)'];
  const params = [archived];
  let p = 2;

  if (orgId) {
    wheres.push(`org_id = $${p}`); params.push(orgId); p++;
  }
  if (q) {
    wheres.push(`(
      canvas_name ILIKE $${p}
      OR COALESCE(description,'') ILIKE $${p}
      OR canvas_config::text ILIKE $${p}
    )`);
    params.push(`%${q}%`); p++;
  }

  const whereSql = `WHERE ${wheres.join(' AND ')}`;
  const off = (page - 1) * pageSize;

  const totalSql = `SELECT COUNT(*)::int AS cnt FROM canvas_configs ${whereSql}`;
  const listSql = `
    SELECT id, canvas_name, description, org_id, is_archived,
           created_by, created_at, updated_by, updated_at
    FROM canvas_configs
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT $${p} OFFSET $${p + 1}
  `;

  const [{ rows: [{ cnt }] }, { rows }] = await Promise.all([
    pool.query(totalSql, params),
    pool.query(listSql, [...params, pageSize, off]),
  ]);

  res.json({ items: rows, total: cnt, page, pageSize });
};

/* PATCH /api/canvas-configs/:id/archive */
exports.archiveCanvasConfig = async (req, res) => {
  const id = Number(req.params.id);
  must(id, 'id');
  const userId = req.body.updated_by || null; // no auth yet

  const { rows } = await pool.query(
    `UPDATE canvas_configs
     SET is_archived = TRUE, updated_by = $2
     WHERE id = $1
     RETURNING id, is_archived, updated_at`,
    [id, userId]
  );
  if (!rows.length) return res.status(404).json({ message: 'Not found' });
  res.json(rows[0]);
};

/* POST /api/canvas-configs */
exports.createCanvasConfig = async (req, res) => {
  try {
    const { canvas_name, description = null, canvas_config, org_id = null, created_by = null } = req.body;
    required(canvas_name, 'canvas_name');
    required(canvas_config, 'canvas_config');

    const sql = `
      INSERT INTO canvas_configs
        (canvas_name, description, org_id, created_by, updated_by, canvas_config)
      VALUES ($1, $2, $3, $4, $4, $5::jsonb)
      RETURNING id, canvas_name, description, org_id, created_by, created_at, updated_by, updated_at
    `;
    const params = [
      canvas_name,
      description,
      org_id,
      created_by,                          // used for both created_by and updated_by
      JSON.stringify(canvas_config),
    ];

    const { rows } = await pool.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('createCanvasConfig error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to create canvas config' });
  }
};

/* PUT /api/canvas-configs/:id */
exports.updateCanvasConfig = async (req, res) => {
  try {
    const id = Number(req.params.id);
    required(id, 'id');

    const { canvas_name, description = null, canvas_config, updated_by = null } = req.body;
    required(canvas_name, 'canvas_name');
    required(canvas_config, 'canvas_config');

    const sql = `
      UPDATE canvas_configs
      SET canvas_name = $2,
          description = $3,
          updated_by  = $4,
          canvas_config = $5::jsonb
      WHERE id = $1
      RETURNING id, canvas_name, description, org_id, created_by, created_at, updated_by, updated_at
    `;
    const params = [ id, canvas_name, description, updated_by, JSON.stringify(canvas_config) ];

    const { rows } = await pool.query(sql, params);
    if (!rows.length) return res.status(404).json({ message: 'Canvas not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('updateCanvasConfig error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to update canvas config' });
  }
};
