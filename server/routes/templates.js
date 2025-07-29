const express = require('express');
const router = express.Router();
const db = require('../db');
const { camelToSnake } = require('../utils/stringUtils');

router.post('/create', async (req, res) => {
  const { templateName, fields, createdBy } = req.body;

  if (!templateName || !fields?.length) {
    return res.status(400).json({ error: 'Missing template name or fields' });
  }

  if (!/^[a-z0-9]+$/.test(templateName) || templateName.length > 20) {
    return res.status(400).json({ error: 'Invalid template name format' });
  }

  const tableName = `cust_form_${templateName.toLowerCase()}`;

  try {
    // 1. Create actual table
    const fieldSQL = fields.map(f => {
      if (!f.fieldname || !f.datatype) throw new Error('Invalid field: missing name or datatype');

      const fieldName = camelToSnake(f.fieldname);
      const typeMap = {
        TEXT: 'TEXT',
        INTEGER: 'INTEGER',
        DATE: 'DATE'
      };

      const sqlType = typeMap[f.datatype.trim().toUpperCase()];
      if (!sqlType) throw new Error(`Unsupported field type: ${f.datatype}`);

      return `"${fieldName}" ${sqlType}`;
    });

    fieldSQL.push(`created_by INTEGER`, `created_at TIMESTAMP DEFAULT NOW()`);

    const createQuery = `CREATE TABLE "${tableName}" (
      id SERIAL PRIMARY KEY,
      ${fieldSQL.join(',\n')}
    );`;

    await db.query(createQuery);

    // 2. Save template metadata and get ID
    const tplRes = await db.query(
      `INSERT INTO form_templates (template_name, table_name, created_by) VALUES ($1, $2, $3) RETURNING id`,
      [templateName, tableName, createdBy]
    );
    const templateId = tplRes.rows[0].id;

    // 3. Save each field with inputtype, options, format
    for (const f of fields) {
      await db.query(
        `INSERT INTO form_fields (template_id, fieldname, datatype, inputtype, options, format)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          templateId,
          f.fieldname,
          f.datatype,
          f.inputtype,
          f.options || null,
          f.format || null
        ]
      );
    }


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

// GET /templates/:id/fields
router.get('/:id/fields', async (req, res) => {
  const templateId = req.params.id;

  try {
    const result = await db.query(
      `SELECT id, fieldname, datatype, inputtype, options, format
       FROM form_fields
       WHERE template_id = $1
       ORDER BY id`,
      [templateId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching fields for template:", err);
    res.status(500).json({ error: 'Failed to fetch form fields' });
  }
});



module.exports = router;
