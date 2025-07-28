const express = require('express');
const router = express.Router();
const db = require('../db');
const { camelToSnake } = require('../utils/stringUtils');

router.post('/create', async (req, res) => {
  const { templateName, fields, createdBy } = req.body;

  // Input validations
  if (!templateName || !fields?.length) {
    return res.status(400).json({ error: 'Missing template name or fields' });
  }

  if (!/^[a-z0-9]+$/.test(templateName) || templateName.length > 20) {
    return res.status(400).json({ error: 'Invalid template name format' });
  }

  const tableName = `cust_form_${templateName.toLowerCase()}`;

  try {
    // Build CREATE TABLE SQL
    const fieldSQL = fields.map(f => {
      const fieldName = camelToSnake(f.name);
      const typeMap = {
        text: 'TEXT',
        number: 'INTEGER',
        date: 'DATE'
      };
      const sqlType = typeMap[f.type];
      if (!sqlType) throw new Error(`Unsupported field type: ${f.type}`);
      return `"${fieldName}" ${sqlType}`;
    });

    // Add audit fields
    fieldSQL.push(`created_by INTEGER`, `created_at TIMESTAMP DEFAULT NOW()`);

    const createQuery = `CREATE TABLE "${tableName}" (
      id SERIAL PRIMARY KEY,
      ${fieldSQL.join(',\n')}
    );`;

    // Execute CREATE TABLE
    await db.query(createQuery);

    // Save metadata
    await db.query(
      `INSERT INTO form_templates (template_name, table_name, created_by) VALUES ($1, $2, $3)`,
      [templateName, tableName, createdBy]
    );

    res.status(201).json({ message: 'Template created successfully', table: tableName });

  } catch (err) {
    console.error(err);

    if (err.code === '42P07' || err.code === '23505') {
      return res.status(400).json({ error: 'Template name already exists' });
    }

    res.status(500).json({ error: 'Failed to create template' });
  }
});


// GET /templates/list
router.get('/list', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, template_name, table_name, created_by, created_at 
       FROM form_templates 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching template list:", err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});


module.exports = router;
