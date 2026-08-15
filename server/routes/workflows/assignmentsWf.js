// server/routes/workflows/assignmentswf.js
const express = require('express');
const router = express.Router();

const pool = require('../../db');
const { verifyToken } = require('../../middleware/authMiddleware');

// Require a valid JWT for all routes here
router.use(verifyToken);

// tiny query helper
async function q(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

/* ---------------------------------------------
 * WHOAMI: see what your token exposes
 * --------------------------------------------- */
router.get('/whoami', (req, res) => {
  res.json({ user: req.user ?? null });
});

/* ---------------------------------------------
 * Identity helpers (id + email)
 * --------------------------------------------- */
function getIdentity(req) {
  const userId = req.user?.userId ?? req.user?.id ?? null; // integer expected
  const uidText = (userId !== null && userId !== undefined) ? String(userId) : '';
  const email =
    req.user?.email ??
    req.user?.user_email ??
    req.user?.mail ??
    '';
  return { userId: (userId === null ? null : Number(userId)), uidText, email };
}

/* ---------------------------------------------
 * INBOX (workflow_instances): assigned_to = me
 * Supports ?all=1 to bypass scoping
 * --------------------------------------------- */
router.get('/inbox', async (req, res) => {
  try {
    const all = String(req.query?.all || '').toLowerCase();
    const bypass = (all === '1' || all === 'true');

    const { userId } = getIdentity(req);

    // If not bypassing, require a numeric user id for assigned_to matching
    if (!bypass && (userId === null || Number.isNaN(userId))) {
      return res.status(400).json({ error: 'Missing numeric user id for inbox scoping' });
    }

    const where = bypass ? '' : 'WHERE i.assigned_to = $1';
    const params = bypass ? [] : [userId];

    const sql = `
      SELECT
        i.id                    AS instance_id,
        COALESCE(i.workflow_name, 'Workflow') AS workflow_name,
        COALESCE(i.status, 'OPEN')            AS instance_status,
        i.started_at,
        i.workflow_id,
        i.workflow_row_id,
        i.version,
        i.master_form_id,
        i.master_row_id,
        i.started_by,

        -- Convenience/current step fields you asked to add
        i.step_name,
        i.assigned_to,
        i.step_performer,
        i.step_due_date,
        i.updateform_id,

        -- Performer details (from users)
        TRIM(
          COALESCE(
            NULLIF(CONCAT(COALESCE(u.firstname, u.first_name, ''), ' ', COALESCE(u.lastname, u.last_name, '')), ' '),
            ''
          )
        ) AS step_performer_name,
        u.email AS step_performer_email,

        -- UI-compat placeholders so existing components don't blow up
        'instance'::text        AS node_type,
        COALESCE(i.updateform_id, i.master_form_id) AS form_id,
        NULL::int               AS task_id,
        i.master_row_id         AS record_id
      FROM workflow_instances i
      LEFT JOIN public.users u ON u.id = i.step_performer
      ${where}
      ORDER BY i.started_at DESC NULLS LAST, i.id DESC
      LIMIT 200
    `;

    const rows = await q(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /inbox error:', err);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

/* ---------------------------------------------
 * OUTBOX (workflow_instances): started_by = me
 * We match either:
 *  - started_by == user id as text (e.g. '233')
 *  - started_by == email (e.g. 'user@domain')
 * Supports ?all=1 to bypass scoping
 * --------------------------------------------- */
router.get('/outbox', async (req, res) => {
  try {
    const all = String(req.query?.all || '').toLowerCase();
    const bypass = (all === '1' || all === 'true');

    const { uidText, email } = getIdentity(req);

    if (!bypass && !uidText && !email) {
      return res.status(400).json({ error: 'Missing user identity for outbox scoping' });
    }

    const where = bypass
      ? ''
      : `WHERE (
            ($1 <> '' AND i.started_by = $1)
         OR ($2 <> '' AND i.started_by = $2)
         )`;

    const params = bypass ? [] : [uidText, email];

    const sql = `
      SELECT
        i.id                    AS instance_id,
        COALESCE(i.workflow_name, 'Workflow') AS workflow_name,
        COALESCE(i.status, 'OPEN')            AS instance_status,
        i.started_at,
        i.workflow_id,
        i.workflow_row_id,
        i.version,
        i.master_form_id,
        i.master_row_id,
        i.started_by,

        -- Convenience/current step fields
        i.step_name,
        i.assigned_to,
        i.step_performer,
        i.step_due_date,
        i.updateform_id,
        TRIM(
          COALESCE(
            NULLIF(CONCAT(COALESCE(u.firstname, u.first_name, ''), ' ', COALESCE(u.lastname, u.last_name, '')), ' '),
            ''
          )
        ) AS step_performer_name,
        u.email AS step_performer_email

      FROM workflow_instances i
      LEFT JOIN public.users u ON u.id = i.step_performer
      ${where}
      ORDER BY i.started_at DESC NULLS LAST, i.id DESC
      LIMIT 200
    `;

    const rows = await q(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /outbox error:', err);
    res.status(500).json({ error: 'Failed to fetch outbox' });
  }
});

module.exports = router;
