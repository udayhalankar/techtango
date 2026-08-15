const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/checkSubscription");
const { camelToSnake } = require('../utils/stringUtils');

async function ensureTemplateColumns() {
  await db.query(`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS validations JSONB`);
  await db.query(`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS access JSONB`);
}

router.use(verifyToken, checkSubscription("Business Automation"));

router.post('/create', async (req, res) => {
  const { templateName, fields, createdBy, validations, access } = req.body;

  if (!templateName || !fields?.length) {
    return res.status(400).json({ error: 'Missing template name or fields' });
  }

  if (!/^[a-z0-9]+$/.test(templateName) || templateName.length > 20) {
    return res.status(400).json({ error: 'Invalid template name format' });
  }

  const tableName = `cust_form_${templateName.toLowerCase()}`;

  try {
    await ensureTemplateColumns();
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

    fieldSQL.push(
      `created_by INTEGER`,
      `date_created TIMESTAMP DEFAULT NOW()`,
      `modified_by INTEGER`,
      `date_modified TIMESTAMP`,
      `crudpageid INTEGER`,
      `tenant_id INTEGER`
      // `validations JSONB`,
      // `access JSONB`
    );

    const createQuery = `CREATE TABLE "${tableName}" (
      id SERIAL PRIMARY KEY,
      ${fieldSQL.join(',\n')}
    );`;

    await db.query(createQuery);

    // 2. Save template metadata and get ID
    const tplRes = await db.query(
      `INSERT INTO form_templates (template_name, table_name, created_by, validations, access)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [templateName, tableName, createdBy, validations || {}, access || {}]
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
    await ensureTemplateColumns();
    const result = await db.query(
      `SELECT id, template_name, table_name, created_by, created_at, validations, access
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

// PUT /templates/:id
router.put('/:id', async (req, res) => {
  const templateId = req.params.id;
  const { fields, validations, access } = req.body;

  if (!Array.isArray(fields)) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    await ensureTemplateColumns();
    const tplRes = await db.query(
      `SELECT id, table_name FROM form_templates WHERE id = $1`,
      [templateId]
    );
    if (tplRes.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const tableName = tplRes.rows[0].table_name;
    const existingRes = await db.query(
      `SELECT id, fieldname, datatype, inputtype, options, format
       FROM form_fields
       WHERE template_id = $1`,
      [templateId]
    );

    const hasDataRes = await db.query(
      `SELECT EXISTS (SELECT 1 FROM "${tableName}" LIMIT 1) AS has_data`
    );
    const hasData = Boolean(hasDataRes.rows[0]?.has_data);

    const typeMap = {
      TEXT: 'TEXT',
      INTEGER: 'INTEGER',
      DATE: 'DATE'
    };

    const existingByName = new Map(
      existingRes.rows.map((row) => [row.fieldname, row])
    );
    const incomingByName = new Map(
      fields.map((f) => [f.fieldname, f])
    );

    const existingNames = new Set(existingByName.keys());
    const incomingNames = new Set(incomingByName.keys());

    const removed = [...existingNames].filter((name) => !incomingNames.has(name));
    const added = [...incomingNames].filter((name) => !existingNames.has(name));

    if (hasData) {
      if (removed.length > 0) {
        return res.status(400).json({ error: 'Cannot remove fields when table has data' });
      }
      for (const name of existingNames) {
        const incoming = incomingByName.get(name);
        if (!incoming) continue;
        const existing = existingByName.get(name);
        const incomingType = typeMap[String(incoming.datatype || '').trim().toUpperCase()];
        const existingType = typeMap[String(existing.datatype || '').trim().toUpperCase()];
        if (incomingType && existingType && incomingType !== existingType) {
          return res.status(400).json({ error: 'Cannot modify field types when table has data' });
        }
      }
    } else {
      for (const name of existingNames) {
        const incoming = incomingByName.get(name);
        if (!incoming) continue;
        const existing = existingByName.get(name);
        const incomingType = typeMap[String(incoming.datatype || '').trim().toUpperCase()];
        const existingType = typeMap[String(existing.datatype || '').trim().toUpperCase()];
        if (incomingType && existingType && incomingType !== existingType) {
          return res.status(400).json({ error: 'Field type cannot be changed' });
        }
      }
    }

    // Add new columns
    for (const name of added) {
      const incoming = incomingByName.get(name);
      const sqlType = typeMap[String(incoming?.datatype || '').trim().toUpperCase()];
      if (!sqlType) {
        return res.status(400).json({ error: `Unsupported field type: ${incoming?.datatype}` });
      }
      const columnName = camelToSnake(name);
      await db.query(
        `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${columnName}" ${sqlType}`
      );
      await db.query(
        `INSERT INTO form_fields (template_id, fieldname, datatype, inputtype, options, format)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          templateId,
          name,
          incoming?.datatype,
          incoming?.inputtype,
          incoming?.options || null,
          incoming?.format || null
        ]
      );
    }

    // Remove columns + metadata when allowed
    if (!hasData && removed.length > 0) {
      for (const name of removed) {
        const columnName = camelToSnake(name);
        await db.query(
          `ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${columnName}"`
        );
        await db.query(
          `DELETE FROM form_fields WHERE template_id = $1 AND fieldname = $2`,
          [templateId, name]
        );
      }
    }

    // Update metadata for existing fields (inputtype/options/format only)
    for (const name of existingNames) {
      const incoming = incomingByName.get(name);
      if (!incoming) continue;
      await db.query(
        `UPDATE form_fields
         SET inputtype = $1, options = $2, format = $3
         WHERE template_id = $4 AND fieldname = $5`,
        [
          incoming?.inputtype,
          incoming?.options || null,
          incoming?.format || null,
          templateId,
          name
        ]
      );
    }

    if (validations !== undefined || access !== undefined) {
      await db.query(
        `UPDATE form_templates SET validations = $1, access = $2 WHERE id = $3`,
        [validations || {}, access || {}, templateId]
      );
    }

    res.json({ message: 'Template updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});


// DELETE /templates/:id
router.delete('/:id', async (req, res) => {
  const templateId = req.params.id;

  try {
    const tplRes = await db.query(
      `SELECT id, table_name FROM form_templates WHERE id = $1`,
      [templateId]
    );
    if (tplRes.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const tableName = tplRes.rows[0].table_name;

    await db.query('BEGIN');
    await db.query(`DROP TABLE IF EXISTS "${tableName}"`);
    await db.query(`DELETE FROM form_fields WHERE template_id = $1`, [templateId]);
    await db.query(`DELETE FROM form_templates WHERE id = $1`, [templateId]);
    await db.query('COMMIT');

    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});


module.exports = router;
