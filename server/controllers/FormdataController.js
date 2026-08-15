const pool = require('../db');
exports.insertFormData = async (req, res) => {
const { viewId, data } = req.body;
// Get the target table based on viewId
const config = await pool.query('SELECT * FROM form_configs WHERE id = $1', [viewId]);
const tableName = config.rows[0].table_name;
// Insert logic (make sure columns match data keys)
const keys = Object.keys(data);
const values = Object.values(data);
const placeholders = keys.map((_, i) => `$${i + 1}`);
const query = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`;
try {
const result = await pool.query(query, values);
res.json(result.rows[0]);
} catch (err) {
console.error('Insert Error:', err);
res.status(500).json({ error: 'Failed to insert form data' });
}
};