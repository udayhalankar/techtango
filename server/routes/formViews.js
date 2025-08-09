// server/routes/formviews.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/authMiddleware");

/* =========================
   form_views (unchanged)
   ========================= */

// GET all form views
router.get("/list", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fv.id, fv.view_name, fv.view_type, fv.template_id,
             ft.template_name, fv.created_at, fv.updated_at
      FROM form_views fv
      JOIN form_templates ft ON ft.id = fv.template_id
      ORDER BY fv.updated_at DESC NULLS LAST, fv.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching form views:", err);
    res.status(500).json({ error: "Failed to fetch form views" });
  }
});

// GET all views for a specific template (put BEFORE /:id)
router.get("/by-template/:templateId", async (req, res) => {
  try {
    const { templateId } = req.params;
    const result = await pool.query(
      `SELECT * FROM form_views WHERE template_id = $1`,
      [templateId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching views for template:", err);
    res.status(500).json({ error: "Failed to fetch views for template" });
  }
});

// CREATE / UPDATE view
router.post("/save", async (req, res) => {
  const { template_id, view_name, layout, created_by } = req.body;

  try {
    const { rows: existingPrimaries } = await pool.query(
      `SELECT * FROM form_views WHERE template_id = $1 AND view_type = 'primary'`,
      [template_id]
    );

    if (existingPrimaries.length === 0) {
      const { rows } = await pool.query(
        `INSERT INTO form_views (template_id, view_name, view_type, layout, created_by, created_at)
         VALUES ($1, $2, 'primary', $3, $4, NOW())
         RETURNING id`,
        [template_id, view_name, JSON.stringify(layout), created_by]
      );

      const newId = rows[0].id;

      await pool.query(
        `UPDATE form_views SET primary_view_id = $1, updated_at = now() WHERE id = $1`,
        [newId]
      );

      return res.json({ success: true, message: "Primary view created", id: newId });
    }

    const primary = existingPrimaries[0];

    if (primary.view_name === view_name) {
      await pool.query(
        `UPDATE form_views SET layout = $1, updated_at = now() WHERE id = $2`,
        [JSON.stringify(layout), primary.id]
      );

      return res.json({ success: true, message: "Primary view updated" });
    }

    const { rows } = await pool.query(
      `INSERT INTO form_views (template_id, view_name, view_type, primary_view_id, layout, created_by, created_at)
       VALUES ($1, $2, 'update', $3, $4, $5, NOW())
       RETURNING id`,
      [template_id, view_name, primary.id, JSON.stringify(layout), created_by]
    );

    return res.json({ success: true, message: "Update view inserted", id: rows[0].id });
  } catch (err) {
    console.error("Error saving form view:", err);
    res.status(500).json({ error: "Error saving form view" });
  }
});


// POST /api/formdata/update
router.post("/formdata/update", verifyToken, async (req, res) => {
  const configId = Number(req.body.configId);
  const entryId = Number(req.body.entryId);
  const formData = req.body.formData || {};

  if (!Number.isInteger(configId)) return res.status(400).json({ error: "Invalid configId" });
  if (!Number.isInteger(entryId)) return res.status(400).json({ error: "Invalid entryId" });

  const client = await pool.connect();
  try {
    const cfg = await client.query(
      `SELECT id, template_name, table_name, type FROM form_configs WHERE id = $1`,
      [configId]
    );
    if (!cfg.rows.length) return res.status(404).json({ error: "Config not found" });

    const { table_name, type } = cfg.rows[0];
    if (!table_name) return res.status(400).json({ error: "Config missing table_name" });
    if (String(type).toLowerCase() !== "update") {
      return res.status(400).json({ error: "Only Update configs can update" });
    }

    // Filter out labels + reserved columns to avoid duplicate updated_at, etc.
    const RESERVED = new Set(["id", "created_at", "created_by", "updated_at", "updated_by"]);
    const entries = Object.entries(formData)
      .filter(([k]) => !k.startsWith("label_"))
      .filter(([k]) => !RESERVED.has(k));

    if (!entries.length) return res.status(400).json({ error: "No updatable fields provided" });

    const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(", ");
    const vals = entries.map(([, v]) => v);

    const q = `
      UPDATE ${table_name}
      SET ${sets}, updated_at = NOW()
      WHERE id = $${entries.length + 1}
      RETURNING *
    `;
    const out = await client.query(q, [...vals, entryId]);

    res.json({ success: true, data: out.rows[0] });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});



// UPDATE existing primary by id
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { view_name, layout, updated_by } = req.body;

    const result = await pool.query(
      `UPDATE form_views
       SET view_name = $1, layout = $2, updated_by = $3, updated_at = NOW()
       WHERE id = $4 AND view_type = 'primary'`,
      [view_name, JSON.stringify(layout), updated_by || 1, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Primary view not found or not editable" });
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error("❌ Error updating form view:", err);
    res.status(500).json({ error: "Failed to update form view" });
  }
});

// GET single view by ID (keep this LAST among /:... routes)
router.get("/:id", async (req, res) => {
  const viewId = req.params.id;
  try {
    const result = await pool.query(
      `SELECT * FROM form_views WHERE id = $1`,
      [viewId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Form view not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching form view:", err);
    res.status(500).json({ error: "Failed to fetch form view" });
  }
});

/* =========================
   FORM DATA via form_configs
   =========================
   Expect: configId -> form_configs.id
   Uses: form_configs.table_name, form_configs.type (Master/Update)
   NOTE: keep these BEFORE any generic /:id routes (already done)
*/

// INSERT (Master config only)
router.post("/formdata/insert", verifyToken, async (req, res) => {
  const { configId, formData } = req.body;
  const client = await pool.connect();
  try {
    const cfg = await client.query(
      `SELECT id, template_name, table_name, type FROM form_configs WHERE id = $1`,
      [configId]
    );
    if (!cfg.rows.length) return res.status(404).json({ error: "Config not found" });

    const { table_name, type } = cfg.rows[0];
    if (!table_name) return res.status(400).json({ error: "Config missing table_name" });
    if (String(type).toLowerCase() !== "master") {
      return res.status(400).json({ error: "Only Master configs can insert" });
    }

    const entries = Object.entries(formData || {}).filter(([k]) => !k.startsWith("label_"));
    if (!entries.length) return res.status(400).json({ error: "No fields provided" });

    const cols = entries.map(([k]) => k);
    const vals = entries.map(([, v]) => v);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(",");

    const q = `
      INSERT INTO ${table_name} (${cols.join(",")}, created_by, created_at)
      VALUES (${placeholders}, $${cols.length + 1}, NOW())
      RETURNING *
    `;
    const out = await client.query(q, [...vals, req.user.userId]); // <-- use userId

    res.json({ success: true, data: out.rows[0] });
  } catch (err) {
    console.error("Insert Error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// // GET ids list (for Update picker)
// router.get("/formdata/:configId/ids", verifyToken, async (req, res) => {
//   const { configId } = req.params;
//   const client = await pool.connect();
//   try {
//     const cfg = await client.query(
//       `SELECT table_name FROM form_configs WHERE id = $1`,
//       [configId]
//     );
//     if (!cfg.rows.length) return res.status(404).json({ error: "Config not found" });

//     const { table_name } = cfg.rows[0];
//     const r = await client.query(`SELECT id FROM ${table_name} ORDER BY id DESC LIMIT 100`);
//     res.json(r.rows.map((x) => x.id));
//   } catch (err) {
//     console.error("IDs error:", err);
//     res.status(500).json({ error: "Server error" });
//   } finally {
//     client.release();
//   }
// });



// GET /api/formdata/:configId/ids
router.get("/formdata/:configId/ids", verifyToken, async (req, res) => {
  const configId = Number(req.params.configId);
  if (!Number.isInteger(configId)) {
    return res.status(400).json({ error: "Invalid configId" });
  }
  const client = await pool.connect();
  try {
    const cfg = await client.query(
      `SELECT table_name FROM form_configs WHERE id = $1`,
      [configId]
    );
    if (!cfg.rows.length) return res.status(404).json({ error: "Config not found" });

    const { table_name } = cfg.rows[0];
    const r = await client.query(`SELECT id FROM ${table_name} ORDER BY id DESC LIMIT 100`);
    res.json(r.rows.map((x) => x.id));
  } catch (err) {
    console.error("IDs error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});



// GET one row for Update prefill
router.get("/formdata/:configId/:entryId", verifyToken, async (req, res) => {
  const { configId, entryId } = req.params;
  const client = await pool.connect();
  try {
    const cfg = await client.query(
      `SELECT table_name FROM form_configs WHERE id = $1`,
      [configId]
    );
    if (!cfg.rows.length) return res.status(404).json({ error: "Config not found" });

    const { table_name } = cfg.rows[0];
    const row = await client.query(`SELECT * FROM ${table_name} WHERE id = $1`, [entryId]);
    res.json({ success: true, data: row.rows[0] || null });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// UPDATE (Update config only)
// router.post("/formdata/update", verifyToken, async (req, res) => {
//   const { configId, entryId, formData } = req.body;
//   const client = await pool.connect();
//   try {
//     const cfg = await client.query(
//       `SELECT id, template_name, table_name, type FROM form_configs WHERE id = $1`,
//       [configId]
//     );
//     if (!cfg.rows.length) return res.status(404).json({ error: "Config not found" });

//     const { table_name, type } = cfg.rows[0];
//     if (!table_name) return res.status(400).json({ error: "Config missing table_name" });
//     if (String(type).toLowerCase() !== "update") {
//       return res.status(400).json({ error: "Only Update configs can update" });
//     }

//     const entries = Object.entries(formData || {}).filter(([k]) => !k.startsWith("label_"));
//     if (!entries.length) return res.status(400).json({ error: "No fields provided" });

//     const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(", ");
//     const vals = entries.map(([, v]) => v);

//     const q = `
//       UPDATE ${table_name}
//       SET ${sets}, updated_at = NOW()
//       WHERE id = $${entries.length + 1}
//       RETURNING *
//     `;
//     const out = await client.query(q, [...vals, entryId]);

//     res.json({ success: true, data: out.rows[0] });
//   } catch (err) {
//     console.error("Update Error:", err);
//     res.status(500).json({ error: "Server error" });
//   } finally {
//     client.release();
//   }
// });

module.exports = router;





// // const express = require("express");
// // const router = express.Router();
// // const pool = require("../db"); // PostgreSQL connection pool


// // //Get form-views
// // router.get("/list", async (req, res) => {
// //   try {
// //     const result = await pool.query(`
// //       SELECT fv.id, fv.view_name, fv.view_type, ft.template_name
// //       FROM form_views fv
// //       JOIN form_templates ft ON ft.id = fv.template_id
// //       ORDER BY fv.created_at DESC
// //     `);
// //     res.json(result.rows);
// //   } catch (err) {
// //     console.error("Error fetching form views:", err);
// //     res.status(500).json({ error: "Failed to fetch form views" });
// //   }
// // });

// // router.get("/:id", async (req, res) => {
// //   const viewId = req.params.id;
// //   try {
// //     const result = await pool.query(
// //       `SELECT id, view_name, template_id, layout FROM form_views WHERE id = $1`,
// //       [viewId]
// //     );

// //     if (result.rows.length === 0) {
// //       return res.status(404).json({ error: "Form view not found" });
// //     }

// //     res.json(result.rows[0]);
// //   } catch (err) {
// //     console.error("Error fetching form view:", err);
// //     res.status(500).json({ error: "Failed to fetch form view" });
// //   }
// // });



// // // Check if primary view already exists
// // const existingPrimary = await db.query(
// //   'SELECT id FROM form_views WHERE template_id = $1 AND view_type = $2',
// //   [templateId, 'primary']
// // );

// // let viewType = existingPrimary.rows.length > 0 ? 'update' : 'primary';

// // // Then insert
// // await db.query(
// //   'INSERT INTO form_views (template_id, view_name, view_type, layout) VALUES ($1, $2, $3, $4)',
// //   [templateId, viewName, viewType, layout]
// // );




// // // Save a form view (create or update)
// // router.post("/save", async (req, res) => {
// //   try {
// //     const { template_id, view_name, layout, created_by } = req.body;

// //     console.log("➡️ Incoming save request:");
// //     console.log("template_id:", template_id);
// //     console.log("view_name:", view_name);
// //     console.log("created_by:", created_by);
// //     console.log("layout preview:", Array.isArray(layout) ? layout.length : layout);

// //     if (!template_id || !view_name || !layout || !created_by) {
// //       return res.status(400).json({ error: "Missing required fields" });
// //     }

// //     const result = await pool.query(
// //       `SELECT id FROM form_views WHERE template_id = $1 AND view_type = 'create' LIMIT 1`,
// //       [template_id]
// //     );

// //     let view_type = "primary"; // must match database
// //     let primary_view_id = null;

// //     if (result.rows.length > 0) {
// //       view_type = "update";
// //       primary_view_id = result.rows[0].id;
// //     }

// //     const insertRes = await pool.query(
// //       `INSERT INTO form_views (template_id, view_name, view_type, primary_view_id, layout, created_by, created_at)
// //        VALUES ($1, $2, $3, $4, $5, $6, NOW())
// //        RETURNING id`,
// //       [
// //         template_id,
// //         view_name,
// //         view_type,
// //         primary_view_id,
// //         JSON.stringify(layout),
// //         created_by,
// //       ]
// //     );

// //     const newId = insertRes.rows[0].id;

// //     if (view_type === "create") {
// //       await pool.query(
// //         `UPDATE form_views SET primary_view_id = $1 WHERE id = $1`,
// //         [newId]
// //       );
// //     }

// //     console.log("✅ Saved form view:", newId);
// //     res.json({ success: true, id: newId, view_type });

// //   } catch (err) {
// //     console.error("❌ Error saving form view:", err);
// //     res.status(500).json({ error: "Failed to save form view" });
// //   }
// // });


// // module.exports = router;




// const express = require("express");
// const router = express.Router();
// const pool = require("../db");

// // 📌 GET all form views
// router.get("/list", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT fv.id, fv.view_name, fv.view_type, ft.template_name
//       FROM form_views fv
//       JOIN form_templates ft ON ft.id = fv.template_id
//       ORDER BY fv.created_at DESC
//     `);
//     res.json(result.rows);
//   } catch (err) {
//     console.error("❌ Error fetching form views:", err);
//     res.status(500).json({ error: "Failed to fetch form views" });
//   }
// });

// // 📌 GET a single form view by ID
// router.get("/:id", async (req, res) => {
//   const viewId = req.params.id;
//   try {
//     const result = await pool.query(
//       `SELECT id, view_name, template_id, layout FROM form_views WHERE id = $1`,
//       [viewId]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Form view not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("❌ Error fetching form view:", err);
//     res.status(500).json({ error: "Failed to fetch form view" });
//   }
// });

// // 📌 SAVE a form view (create new)
// router.post("/save", async (req, res) => {
//   try {
//     const { template_id, view_name, layout, created_by } = req.body;

//     if (!template_id || !view_name || !layout || !created_by) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // ✅ Check if a primary view already exists for this template
//     const existingPrimary = await pool.query(
//       `SELECT id FROM form_views WHERE template_id = $1 AND view_type = 'primary' LIMIT 1`,
//       [template_id]
//     );

//     const view_type = existingPrimary.rows.length > 0 ? "update" : "primary";
//     const primary_view_id = existingPrimary.rows.length > 0 ? existingPrimary.rows[0].id : null;

//     // ✅ Insert new view
//     const insertRes = await pool.query(
//       `INSERT INTO form_views (template_id, view_name, view_type, primary_view_id, layout, created_by, created_at)
//        VALUES ($1, $2, $3, $4, $5, $6, NOW())
//        RETURNING id`,
//       [
//         template_id,
//         view_name,
//         view_type,
//         primary_view_id,
//         JSON.stringify(layout),
//         created_by,
//       ]
//     );

//     const newId = insertRes.rows[0].id;

//     // ✅ If it's the primary view, update its own primary_view_id
//     if (view_type === "primary") {
//       await pool.query(
//         `UPDATE form_views SET primary_view_id = $1,
//     updated_at = now()
//      WHERE id = $1`,
//         [newId]
//       );
//     }

//     console.log(`✅ Saved [${view_type}] view:`, newId);
//     res.json({ success: true, id: newId, view_type });

//   } catch (err) {
//     console.error("❌ Error saving form view:", err);
//     res.status(500).json({ error: "Failed to save form view" });
//   }
// });

// module.exports = router;

// const express = require("express");
// const router = express.Router();
// const pool = require("../db");
// const { verifyToken } = require('../middleware/authMiddleware');



// // 📌 GET all form views
// router.get("/list", async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT fv.id, fv.view_name, fv.view_type, fv.template_id, ft.template_name, fv.created_at, fv.updated_at
//       FROM form_views fv
//       JOIN form_templates ft ON ft.id = fv.template_id
//       ORDER BY fv.updated_at DESC NULLS LAST, fv.created_at DESC
//     `);
//     res.json(result.rows);
//   } catch (err) {
//     console.error("❌ Error fetching form views:", err);
//     res.status(500).json({ error: "Failed to fetch form views" });
//   }
// });

// // 📌 GET single view by ID
// router.get("/:id", async (req, res) => {
//   const viewId = req.params.id;
//   try {
//     const result = await pool.query(
//       `SELECT * FROM form_views WHERE id = $1`,
//       [viewId]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "Form view not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("❌ Error fetching form view:", err);
//     res.status(500).json({ error: "Failed to fetch form view" });
//   }
// });

// // 📌 GET all views for a specific template (for frontend logic)
// router.get("/by-template/:templateId", async (req, res) => {
//   try {
//     const { templateId } = req.params;
//     const result = await pool.query(
//       `SELECT * FROM form_views WHERE template_id = $1`,
//       [templateId]
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error("❌ Error fetching views for template:", err);
//     res.status(500).json({ error: "Failed to fetch views for template" });
//   }
// });







// // 📌 CREATE new form view
// // router.post("/save", async (req, res) => {
// //   try {
// //     const { template_id, view_name, layout, created_by } = req.body;

// //     if (!template_id || !view_name || !layout || !created_by) {
// //       return res.status(400).json({ error: "Missing required fields" });
// //     }

// //     // Check if a primary exists for the template
// //     const existingPrimary = await pool.query(
// //       `SELECT id FROM form_views WHERE template_id = $1 AND view_type = 'primary' LIMIT 1`,
// //       [template_id]
// //     );

// //     let view_type = "primary";
// //     let primary_view_id = null;

// //     if (existingPrimary.rows.length > 0) {
// //       view_type = "update";
// //       primary_view_id = existingPrimary.rows[0].id;
// //     }

// //     const insertRes = await pool.query(
// //       `INSERT INTO form_views (template_id, view_name, view_type, primary_view_id, layout, created_by, created_at, updated_at)
// //        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
// //        RETURNING id`,
// //       [
// //         template_id,
// //         view_name,
// //         view_type,
// //         primary_view_id,
// //         JSON.stringify(layout),
// //         created_by,
// //       ]
// //     );

// //     const newId = insertRes.rows[0].id;

// //     // If it's a primary view, set primary_view_id to itself
// //     if (view_type === "primary") {
// //       await pool.query(
// //         `UPDATE form_views SET primary_view_id = $1 WHERE id = $1`,
// //         [newId]
// //       );
// //     }

// //     console.log(`✅ Inserted ${view_type} view: ${newId}`);
// //     res.json({ success: true, id: newId, view_type });

// //   } catch (err) {
// //     console.error("❌ Error saving form view:", err);
// //     res.status(500).json({ error: "Failed to save form view" });
// //   }
// // });




// // POST /form-views/save
// router.post("/save", async (req, res) => {
//   const { template_id, view_name, layout, created_by } = req.body;

//   try {
//     // 1. Check if a primary view exists for the given template
//     const { rows: existingPrimaries } = await pool.query(
//       `SELECT * FROM form_views WHERE template_id = $1 AND view_type = 'primary'`,
//       [template_id]
//     );

//     // 2. If no primary exists → create one
//     if (existingPrimaries.length === 0) {
//       const { rows } = await pool.query(
//         `INSERT INTO form_views (template_id, view_name, view_type, layout, created_by, created_at)
//          VALUES ($1, $2, 'primary', $3, $4, NOW())
//          RETURNING id`,
//         [template_id, view_name, JSON.stringify(layout), created_by]
//       );

//       const newId = rows[0].id;

//       // Set its own primary_view_id
//       await pool.query(
//         `UPDATE form_views SET primary_view_id = $1, updated_at = now() WHERE id = $1`,
//         [newId]
//       );

//       return res.json({ success: true, message: "Primary view created", id: newId });
//     }

//     // 3. Primary exists – check if the view_name matches the primary one
//     const primary = existingPrimaries[0];

//     if (primary.view_name === view_name) {
//       // Update primary view directly
//       await pool.query(
//         `UPDATE form_views
//          SET layout = $1, updated_at = now()
//          WHERE id = $2`,
//         [JSON.stringify(layout), primary.id]
//       );

//       return res.json({ success: true, message: "Primary view updated" });
//     }

//     // 4. Else, insert a new update view
//     const { rows } = await pool.query(
//       `INSERT INTO form_views (template_id, view_name, view_type, primary_view_id, layout, created_by, created_at)
//        VALUES ($1, $2, 'update', $3, $4, $5, NOW())
//        RETURNING id`,
//       [template_id, view_name, primary.id, JSON.stringify(layout), created_by]
//     );

//     return res.json({ success: true, message: "Update view inserted", id: rows[0].id });

//   } catch (err) {
//     console.error("Error saving form view:", err);
//     res.status(500).json({ error: "Error saving form view" });
//   }
// });






// // 📌 UPDATE existing view (only for editing primary)
// router.put("/:id", async (req, res) => {
//   try {
//     const id = req.params.id;
//     const { template_id, view_name, layout, updated_by } = req.body;

//     const result = await pool.query(
//       `UPDATE form_views
//        SET view_name = $1,
//            layout = $2,
//            updated_by = $3,
//            updated_at = NOW()
//        WHERE id = $4 AND view_type = 'primary'`,
//       [
//         view_name,
//         JSON.stringify(layout),
//         updated_by || 1,
//         id,
//       ]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "Primary view not found or not editable" });
//     }

//     console.log(`✅ Updated primary view: ${id}`);
//     res.json({ success: true, id });

//   } catch (err) {
//     console.error("❌ Error updating form view:", err);
//     res.status(500).json({ error: "Failed to update form view" });
//   }
// });




// //API's for cust_forms
// //Post
// router.post('/formdata/insert', verifyToken, async (req, res) => {
//   const { viewId, formData } = req.body;

//   const client = await pool.connect();
//   try {
//     // Step 1: Fetch view info
//     const viewRes = await client.query(
//       `SELECT template_id, view_type FROM form_views WHERE id = $1`,
//       [viewId]
//     );
//     if (!viewRes.rows.length) return res.status(404).json({ error: "View not found" });

//     const { template_id, view_type } = viewRes.rows[0];
//     if (view_type !== 'primary')
//       return res.status(400).json({ error: 'Only primary views can insert data' });

//     // Step 2: Get target table name
//     const templateRes = await client.query(
//       `SELECT table_name FROM form_templates WHERE id = $1`,
//       [template_id]
//     );
//     const tableName = templateRes.rows[0].table_name;

//     // Step 3: Build insert query
//     // const keys = Object.keys(formData);
//     // const values = Object.values(formData);

//     const filteredEntries = Object.entries(formData).filter(
//   ([key]) => !key.startsWith('label_')
// );

//     const keys = filteredEntries.map(([key]) => key);
// const values = filteredEntries.map(([, value]) => value);
//     const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');

//     const insertQuery = `
//       INSERT INTO ${tableName} (${keys.join(',')}, created_by, created_at)
//       VALUES (${placeholders}, $${keys.length + 1}, NOW())
//       RETURNING *
//     `;
//     const result = await client.query(insertQuery, [...values, req.user.id]);

//     res.json({ success: true, data: result.rows[0] });
//   } catch (err) {
//     console.error('Insert Error:', err);
//     res.status(500).json({ error: 'Server error' });
//   } finally {
//     client.release();
//   }
// });

// //GET
// router.get('/formdata/:viewId/:entryId', verifyToken, async (req, res) => {
//   const { viewId, entryId } = req.params;

//   const client = await pool.connect();
//   try {
//     // Step 1: Get form view
//     const viewRes = await client.query(
//       `SELECT template_id, primary_view_id FROM form_views WHERE id = $1`,
//       [viewId]
//     );
//     if (!viewRes.rows.length) return res.status(404).json({ error: "View not found" });

//     const templateId = viewRes.rows[0].template_id;

//     const templateRes = await client.query(
//       `SELECT table_name FROM form_templates WHERE id = $1`,
//       [templateId]
//     );
//     const tableName = templateRes.rows[0].table_name;

//     // Step 2: Get entry
//     const dataRes = await client.query(
//       `SELECT * FROM ${tableName} WHERE id = $1`,
//       [entryId]
//     );

//     res.json({ success: true, data: dataRes.rows[0] });
//   } catch (err) {
//     console.error('Fetch error:', err);
//     res.status(500).json({ error: 'Server error' });
//   } finally {
//     client.release();
//   }
// });


// //Update
// router.post('/formdata/update', verifyToken, async (req, res) => {
//   const { viewId, entryId, formData } = req.body;

//   const client = await pool.connect();
//   try {
//     // Step 1: Verify view type
//     const viewRes = await client.query(
//       `SELECT template_id, view_type FROM form_views WHERE id = $1`,
//       [viewId]
//     );
//     if (!viewRes.rows.length) return res.status(404).json({ error: "View not found" });

//     if (viewRes.rows[0].view_type !== 'update')
//       return res.status(400).json({ error: "Only update views can update data" });

//     const templateId = viewRes.rows[0].template_id;

//     const templateRes = await client.query(
//       `SELECT table_name FROM form_templates WHERE id = $1`,
//       [templateId]
//     );
//     const tableName = templateRes.rows[0].table_name;

//     // Step 2: Build dynamic update query
//     // const keys = Object.keys(formData);
//     // const values = Object.values(formData);
//     const filteredEntries = Object.entries(formData).filter(
//   ([key]) => !key.startsWith('label_')
// );

//     const keys = filteredEntries.map(([key]) => key);
// const values = filteredEntries.map(([, value]) => value);
//     const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

//     const updateQuery = `
//       UPDATE ${tableName}
//       SET ${setClause}, updated_at = NOW()
//       WHERE id = $${keys.length + 1}
//       RETURNING *
//     `;
//     const result = await client.query(updateQuery, [...values, entryId]);

//     res.json({ success: true, data: result.rows[0] });
//   } catch (err) {
//     console.error('Update Error:', err);
//     res.status(500).json({ error: 'Server error' });
//   } finally {
//     client.release();
//   }
// });



// module.exports = router;
