// server/physicalrecords/registerfile/service.js
const pool = require('../../db');

async function lookupTenantId(client, masterId) {
  const r = await client.query(
    `SELECT tenantid FROM public.rmfilemaster WHERE id = $1`,
    [masterId]
  );
  // rmfilemaster.tenantid is integer; return null if not present
  return r.rows[0]?.tenantid ?? null;
}

// Helpers
const asItems = (maybe) => Array.isArray(maybe?.rows) ? maybe.rows : [];

/** List files by filestatus (ignores rm_status) + free-text search */
exports.listFiles = async (user, qp) => {
  const { text, rmStatus, page, pageSize, sortBy, sortDir } = qp;
  const offset = (page - 1) * pageSize;

  const where = [];
  const vals  = [];

  // ✅ filter only on filestatus, case-insensitive
  vals.push(rmStatus || 'CIRCULATION');
  where.push(`UPPER(filestatus) = UPPER($${vals.length})`);

  // optional search
  if (text) {
    vals.push(`%${text}%`);
    where.push(`(
      fileid ILIKE $${vals.length} OR
      COALESCE(deptfileid, subtenantdeptcode, subtenantcode) ILIKE $${vals.length} OR
      title ILIKE $${vals.length} OR
      custodian ILIKE $${vals.length}
    )`);
  }

  // naive sort allowlist
  const allowedSort = new Set(['date_created','title','fileid','deptfileid','id']);
  const sCol = allowedSort.has(sortBy) ? sortBy : 'date_created';
  const sDir = sortDir === 'asc' ? 'asc' : 'desc';

  const sql = `
    SELECT id, fileid, deptfileid, title, date_created, filestatus, custodian
    FROM public.rmfilemaster
    WHERE ${where.join(' AND ')}
    ORDER BY ${sCol} ${sDir}
    LIMIT ${pageSize} OFFSET ${offset}
  `;
  const { rows } = await pool.query(sql, vals);
  return { items: rows, page, pageSize };
};

/** One file + (optionally) a quick lookup of dm_data */
exports.getOne = async (_user, id) => {
  const f = await pool.query(
    `SELECT * FROM public.rmfilemaster WHERE id = $1 LIMIT 1`, [id]
  );
  const file = f.rows[0];
  if (!file) return null;

  let dm_row = null;
  if (file.dm_data_id) {
    const d1 = await pool.query(
      `SELECT id, category_id, entity_type, entity_id, de_data
         FROM public.dm_data
        WHERE id = $1`, [file.dm_data_id]
    );
    dm_row = d1.rows[0] || null;
  } else {
    const d2 = await pool.query(
      `SELECT id, category_id, entity_type, entity_id, de_data
         FROM public.dm_data
        WHERE entity_type = 'file' AND entity_id = $1
        ORDER BY id DESC LIMIT 1`, [id]
    );
    dm_row = d2.rows[0] || null;
  }

  return { file, dm_data: dm_row };
};

/** dm_data by entity */
exports.dmDataFor = async (_user, entityType, entityId) => {
  const { rows } = await pool.query(
    `SELECT id, category_id, entity_type, entity_id, de_data
       FROM public.dm_data
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY id DESC
      LIMIT 1`, [entityType, entityId]
  );
  return rows[0] || null;
};

/** Create/Update both rmfilemaster and dm_data in a single transaction */
// exports.upsert = async (user, body) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     const uidTxt = String(user?.id ?? '0');

//     let masterId = body.id || null;

//     if (!masterId) {
//       // Validate QR ownership: must be a pre-generated row by this user
//       const chk = await client.query(
//         `SELECT id
//            FROM public.rmfilemaster
//           WHERE fileid = $1
//             AND filestatus = 'ID Generated'
//             AND created_by::text = $2::text
//           LIMIT 1`,
//         [body.fileid, uidTxt]
//       );
//       if (!chk.rowCount) {
//         throw new Error('This QR/File ID is not eligible: it must be "ID Generated" and created by you.');
//       }
//       masterId = chk.rows[0].id;

//       // ✅ Update that pre-generated row to registered state
//       await client.query(
//         `UPDATE public.rmfilemaster
//             SET title = $1,
//                 fileplan_id = $2,
//                 filestatus = 'CIRCULATION',
//                 date_modified = NOW(),
//                 modified_by = $3
//           WHERE id = $4`,
//         [body.title, body.fileplan_id, uidTxt, masterId]
//       );
//     } else {
//       // Edit existing (no change to filestatus here)
//       await client.query(
//         `UPDATE public.rmfilemaster
//             SET title = $1,
//                 fileplan_id = $2,
//                 date_modified = NOW(),
//                 modified_by = $3
//           WHERE id = $4`,
//         [body.title, body.fileplan_id, uidTxt, masterId]
//       );
//     }

//     // Upsert dm_data (store category_id + metadata JSON)
//     const dm = await client.query(
//       `SELECT id FROM public.dm_data
//         WHERE entity_type='file' AND entity_id=$1
//         ORDER BY id DESC LIMIT 1`,
//       [masterId]
//     );

//     const categoryId = body.category_id ?? null;
//     const deJson     = JSON.stringify(body.metadata || {});

//     if (dm.rowCount) {
//       await client.query(
//         `UPDATE public.dm_data
//             SET category_id = $1,
//                 de_data     = $2::jsonb,
//                 date_modified = NOW(),
//                 modified_by = $3
//           WHERE id = $4`,
//         [categoryId, deJson, user.id || null, dm.rows[0].id]
//       );
//     } else {
//       await client.query(
//         `INSERT INTO public.dm_data
//            (tenant_id, category_id, entity_type, entity_id, de_data, date_created, created_by, date_modified, modified_by)
//          VALUES
//            (NULL,     $1,          'file',      $2,        $3::jsonb, NOW(),       $4,         NOW(),       $4)`,
//         [categoryId, masterId, deJson, user.id || null]
//       );
//     }

//     await client.query('COMMIT');

//     const out = await this.getOne(user, masterId);
//     return out || { ok: true, id: masterId };

//   } catch (e) {
//     await client.query('ROLLBACK');
//     throw e;
//   } finally {
//     client.release();
//   }
// };

exports.upsert = async (user, body) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const uidTxt  = String(user?.id ?? '0');
    let   masterId = body.id || null;

    if (!masterId) {
      // validate pre-generated QR belongs to current user
      const chk = await client.query(
        `SELECT id
           FROM public.rmfilemaster
          WHERE fileid = $1
            AND filestatus = 'ID Generated'
            AND created_by::text = $2::text
          LIMIT 1`,
        [body.fileid, uidTxt]
      );
      if (!chk.rowCount) {
        throw new Error('This QR/File ID is not eligible: it must be "ID Generated" and created by you.');
      }
      masterId = chk.rows[0].id;

      // promote to registered file
      await client.query(
        `UPDATE public.rmfilemaster
            SET title = $1,
                fileplan_id = $2,
                filestatus = 'CIRCULATION',
                date_modified = NOW(),
                modified_by = $3
          WHERE id = $4`,
        [body.title, body.fileplan_id, uidTxt, masterId]
      );
    } else {
      // edit file
      await client.query(
        `UPDATE public.rmfilemaster
            SET title = $1,
                fileplan_id = $2,
                date_modified = NOW(),
                modified_by = $3
          WHERE id = $4`,
        [body.title, body.fileplan_id, uidTxt, masterId]
      );
    }

    // figure tenant_id (required by dm_data)
    let tenantId = user?.tenant_id ?? user?.tenantId ?? null;
    if (!tenantId) {
      const r = await client.query(`SELECT tenantid FROM public.rmfilemaster WHERE id=$1`, [masterId]);
      tenantId = r.rows[0]?.tenantid ?? null;
    }
    if (!tenantId) throw new Error('tenant_id is required but could not be resolved.');

    // upsert dm_data and capture its id
    const categoryId = body.category_id ?? null;
    const deJson     = JSON.stringify(body.metadata || {});

    const existing = await client.query(
      `SELECT id FROM public.dm_data
        WHERE entity_type='file' AND entity_id=$1
        ORDER BY id DESC LIMIT 1`, [masterId]
    );

    let dmId;
    if (existing.rowCount) {
      const upd = await client.query(
        `UPDATE public.dm_data
            SET tenant_id     = $1,
                category_id   = $2,
                de_data       = $3::jsonb,
                date_modified = NOW(),
                modified_by   = $4
          WHERE id = $5
        RETURNING id`,
        [tenantId, categoryId, deJson, user.id || null, existing.rows[0].id]
      );
      dmId = upd.rows[0].id;
    } else {
      const ins = await client.query(
        `INSERT INTO public.dm_data
           (tenant_id, category_id, entity_type, entity_id, de_data,
            date_created, created_by, date_modified, modified_by)
         VALUES
           ($1,        $2,          'file',      $3,        $4::jsonb,
            NOW(),      $5,          NOW(),       $5)
         RETURNING id`,
        [tenantId, categoryId, masterId, deJson, user.id || null]
      );
      dmId = ins.rows[0].id;
    }

    // write pointer to rmfilemaster
    await client.query(
      `UPDATE public.rmfilemaster
          SET dm_data_id = $1
        WHERE id = $2`,
      [dmId, masterId]
    );

    await client.query('COMMIT');
    return await this.getOne(user, masterId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};


/** Delete both master and dm_data (unchanged) */
exports.remove = async (_user, id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM public.dm_data WHERE entity_type='file' AND entity_id=$1`,
      [id]
    );
    await client.query(
      `DELETE FROM public.rmfilemaster WHERE id=$1`,
      [id]
    );
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
