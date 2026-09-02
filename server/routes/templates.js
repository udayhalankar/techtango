const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require("../middleware/authMiddleware");
const { checkSubscription } = require("../middleware/checkSubscription");
const { camelToSnake } = require('../utils/stringUtils');

async function ensureTemplateColumns() {
  await db.query(`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS validations JSONB`);
  await db.query(`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS access JSONB`);
   await db.query(`ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS template_description TEXT`);
   await db.query(`
    ALTER TABLE form_templates
    ADD COLUMN IF NOT EXISTS template_type VARCHAR(20)
    NOT NULL DEFAULT 'simple'
  `);
}

router.use(verifyToken, checkSubscription("Business Automation"));

// router.post('/create', async (req, res) => {
//   const { templateName, templateDescription, fields, createdBy, validations, access } = req.body;

//   if (!templateName || !fields?.length) {
//     return res.status(400).json({ error: 'Missing template name or fields' });
//   }

//   if (!/^[a-z0-9]+$/.test(templateName) || templateName.length > 20) {
//     return res.status(400).json({ error: 'Invalid template name format' });
//   }

//   const tableName = `cust_form_${templateName.toLowerCase()}`;

//   try {
//     await ensureTemplateColumns();
//     // 1. Create actual table
//     const fieldSQL = fields.map(f => {
//       if (!f.fieldname || !f.datatype) throw new Error('Invalid field: missing name or datatype');

//       const fieldName = camelToSnake(f.fieldname);
//       const typeMap = {
//         TEXT: 'TEXT',
//         INTEGER: 'INTEGER',
//         DATE: 'DATE'
//       };

//       const sqlType = typeMap[f.datatype.trim().toUpperCase()];
//       if (!sqlType) throw new Error(`Unsupported field type: ${f.datatype}`);

//       return `"${fieldName}" ${sqlType}`;
//     });

//     fieldSQL.push(
//       `created_by INTEGER`,
//       `date_created TIMESTAMP DEFAULT NOW()`,
//       `modified_by INTEGER`,
//       `date_modified TIMESTAMP`,
//       `crudpageid INTEGER`,
//       `tenant_id INTEGER`
//       // `validations JSONB`,
//       // `access JSONB`
//     );

//     const createQuery = `CREATE TABLE "${tableName}" (
//       id SERIAL PRIMARY KEY,
//       ${fieldSQL.join(',\n')}
//     );`;

//     await db.query(createQuery);

//     // 2. Save template metadata and get ID
//     const tplRes = await db.query(
//         `INSERT INTO form_templates (
//             template_name,
//             template_description,
//             table_name,
//             created_by,
//             validations,
//             access
//         )
//         VALUES ($1, $2, $3, $4, $5, $6)
//         RETURNING id`,
//         [
//           templateName,
//           templateDescription?.trim() || null,
//           tableName,
//           createdBy,
//           validations || {},
//           access || {}
//         ]
//       );
//     const templateId = tplRes.rows[0].id;

//     // 3. Save each field with inputtype, options, format
//     for (const f of fields) {
//       await db.query(
//         `INSERT INTO form_fields (template_id, fieldname, datatype, inputtype, options, format)
//         VALUES ($1, $2, $3, $4, $5, $6)`,
//         [
//           templateId,
//           f.fieldname,
//           f.datatype,
//           f.inputtype,
//           f.options || null,
//           f.format || null
//         ]
//       );
//     }


//     res.status(201).json({ message: 'Template created successfully', table: tableName });

//   } catch (err) {
//     console.error(err);
//     if (err.code === '42P07' || err.code === '23505') {
//       return res.status(400).json({ error: 'Template name already exists' });
//     }
//     res.status(500).json({ error: 'Failed to create template' });
//   }
// });



// GET /templates/list

router.post('/create', async (req, res) => {
  const {
    templateName,
    templateDescription,
    tableType = "simple",
    fields,
    createdBy,
    validations,
    access,
  } = req.body;

  /* ---------------------------------------------------------
     BASIC VALIDATION
  --------------------------------------------------------- */

  if (!templateName || !fields?.length) {
    return res.status(400).json({
      error:
        "Missing template name or fields",
    });
  }

  if (
    !/^[a-z0-9]+$/.test(templateName) ||
    templateName.length > 20
  ) {
    return res.status(400).json({
      error:
        "Invalid template name format",
    });
  }

  const normalizedTableType =
    String(tableType || "simple")
      .trim()
      .toLowerCase();

  if (
    ![
      "simple",
      "workflow",
    ].includes(normalizedTableType)
  ) {
    return res.status(400).json({
      error:
        "Invalid table type",
    });
  }

  /* ---------------------------------------------------------
     TABLE NAME
  --------------------------------------------------------- */

  const tableName =
    normalizedTableType === "workflow"
      ? `custwf_${templateName.toLowerCase()}`
      : `cust_form_${templateName.toLowerCase()}`;

  /* ---------------------------------------------------------
     RESERVED COLUMNS
  --------------------------------------------------------- */

  const workflowReservedColumns =
    new Set([
      "id",
      "date_created",
      "date_modified",
      "created_by",
      "modified_by",
      "table_type",
      "tenant_id",
      "workflow_id",
      "comments",
    ]);

  const simpleReservedColumns =
    new Set([
      "id",
      "created_by",
      "date_created",
      "modified_by",
      "date_modified",
      "crudpageid",
      "tenant_id",
    ]);

  const reservedColumns =
    normalizedTableType ===
    "workflow"
      ? workflowReservedColumns
      : simpleReservedColumns;

  try {
    await ensureTemplateColumns();

    /* -------------------------------------------------------
       BUILD USER DEFINED COLUMNS
    ------------------------------------------------------- */

    const typeMap = {
      TEXT: "TEXT",
      INTEGER: "INTEGER",
      DATE: "DATE",
    };

    const fieldSQL = fields.map(
      (f) => {
        if (
          !f.fieldname ||
          !f.datatype
        ) {
          throw new Error(
            "Invalid field: missing name or datatype"
          );
        }

        const fieldName =
          camelToSnake(
            f.fieldname
          );

        if (
          reservedColumns.has(
            String(
              fieldName
            ).toLowerCase()
          )
        ) {
          throw new Error(
            `Reserved system field cannot be manually created: ${fieldName}`
          );
        }

        const sqlType =
          typeMap[
            String(
              f.datatype
            )
              .trim()
              .toUpperCase()
          ];

        if (!sqlType) {
          throw new Error(
            `Unsupported field type: ${f.datatype}`
          );
        }

        return `"${fieldName}" ${sqlType}`;
      }
    );

    /* -------------------------------------------------------
       CREATE SIMPLE FORM TABLE
    ------------------------------------------------------- */

    let createQuery;

    if (
      normalizedTableType ===
      "simple"
    ) {
      const simpleSystemFields = [
        `created_by INTEGER`,
        `date_created TIMESTAMP DEFAULT NOW()`,
        `modified_by INTEGER`,
        `date_modified TIMESTAMP`,
        `crudpageid INTEGER`,
        `tenant_id INTEGER`,
      ];

      const allFields = [
        ...fieldSQL,
        ...simpleSystemFields,
      ];

      createQuery = `
        CREATE TABLE "${tableName}" (
          id SERIAL PRIMARY KEY,
          ${allFields.join(",\n")}
        );
      `;
    }

    /* -------------------------------------------------------
       CREATE WORKFLOW FORM TABLE
    ------------------------------------------------------- */

    else {
      /*
       * This structure follows the workflow table
       * schema already being used by AUGMIS.
       *
       * User fields remain dynamic.
       * Workflow infrastructure fields are automatic.
       */

      const allFields = [
        `date_created TIMESTAMPTZ NOT NULL DEFAULT NOW()`,

        `date_modified TIMESTAMPTZ NOT NULL DEFAULT NOW()`,

        `created_by BIGINT`,

        `modified_by BIGINT`,

        `table_type TEXT NOT NULL DEFAULT 'Workflow'`,

        `tenant_id BIGINT`,

        ...fieldSQL,

        /*
         * workflow_id links this business row
         * to simple_workflow_instances.id
         */
        `workflow_id BIGINT`,

        /*
         * general persisted workflow/form comments
         */
        `comments TEXT`,
      ];

      createQuery = `
        CREATE TABLE "${tableName}" (
          id BIGSERIAL PRIMARY KEY,
          ${allFields.join(",\n")}
        );
      `;
    }

    /* -------------------------------------------------------
       CREATE PHYSICAL TABLE
    ------------------------------------------------------- */

    await db.query(createQuery);

    /* -------------------------------------------------------
       SAVE TEMPLATE METADATA
    ------------------------------------------------------- */

    const tplRes =
      await db.query(
        `
        INSERT INTO form_templates
            (
              template_name,
              table_name,
              created_by,
              validations,
              access,
              template_type
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `,
        [
          templateName,
          tableName,
          createdBy,
          validations || {},
          access || {},
          normalizedTableType,
        ]
      );

    const templateId =
      tplRes.rows[0].id;

    /* -------------------------------------------------------
       SAVE USER FIELDS ONLY
    ------------------------------------------------------- */

    for (const f of fields) {
      await db.query(
        `
        INSERT INTO form_fields
        (
          template_id,
          fieldname,
          datatype,
          inputtype,
          options,
          format
        )
        VALUES
        ($1, $2, $3, $4, $5, $6)
        `,
        [
          templateId,
          f.fieldname,
          f.datatype,
          f.inputtype,
          f.options || null,
          f.format || null,
        ]
      );
    }

    /* -------------------------------------------------------
       RESPONSE
    ------------------------------------------------------- */

    res.status(201).json({
      message:
        "Template created successfully",

      table: tableName,

      tableType:
        normalizedTableType,
    });
  } catch (err) {
    console.error(
      "Template creation failed:",
      err
    );

    if (
      err.code === "42P07" ||
      err.code === "23505"
    ) {
      return res.status(400).json({
        error:
          "Template name already exists",
      });
    }

    if (
      String(
        err?.message || ""
      ).includes(
        "Reserved system field"
      )
    ) {
      return res.status(400).json({
        error: err.message,
      });
    }

    res.status(500).json({
      error:
        err?.message ||
        "Failed to create template",
    });
  }
});


router.get('/list', async (req, res) => {
  try {
    await ensureTemplateColumns();
    const result = await db.query(
          `SELECT
            id,
            template_name,
            table_name,
            template_type,
            created_by,
            created_at,
            validations,
            access
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
  const {  templateDescription, fields, validations, access } = req.body;

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

    await db.query(
  `UPDATE form_templates
   SET
      template_description = $1,
      validations = $2,
      access = $3
   WHERE id = $4`,
  [
    templateDescription?.trim() || null,
    validations || {},
    access || {},
    templateId
  ]
);

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
