const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const triggerEmailOnStatusChange = require('../helpers/triggerEmailOnStatusChange');
const { verifyToken } = require('../middleware/authMiddleware');
const { uploadEnquiryFiles } = require('../utils/uploadEncryptedFiles'); // writes to enquiry_files

const upload = multer({ dest: 'uploads/' });

// turn empty/placeholder values into real NULL for Postgres
const toDb = (v) =>
  (v === '' || v === null || v === undefined || v === 'null' || v === 'undefined') ? null : v;

/** ─────────────────────────────────────────────────────────────
 *  Status enum mapping helpers
 *  We discover valid enum labels from DB and map inputs like
 *  "Technical_Submission" or "technical submission" to the real label.
 *  ───────────────────────────────────────────────────────────── */
// Keep only columns that truly live in the enquiries table
const pick = (obj, keys) =>
  keys.reduce((a, k) => (Object.prototype.hasOwnProperty.call(obj, k) ? (a[k] = obj[k], a) : a), {});




// const CANON = (s) => String(s || '').toLowerCase().replace(/[_\s]+/g, '').trim();

// let _statusMapPromise = null;
// async function _loadCaseStatusMap() {
//   const { rows } = await pool.query(`
//     SELECT e.enumlabel AS label
//     FROM pg_type t
//     JOIN pg_enum e ON t.oid = e.enumtypid
//     WHERE t.typname = 'case_status'
//     ORDER BY e.enumsortorder
//   `);
//   const map = Object.create(null);
//   for (const r of rows) map[CANON(r.label)] = r.label; // canonical -> real label
//   return { map, allowed: rows.map(r => r.label) };
// }
// async function getStatusLabel(candidate) {
//   if (!candidate) return null;
//   if (!_statusMapPromise) _statusMapPromise = _loadCaseStatusMap();
//   const { map } = await _statusMapPromise;
//   return map[CANON(candidate)] || null;
// }
// async function getAllowedStatuses() {
//   if (!_statusMapPromise) _statusMapPromise = _loadCaseStatusMap();
//   const { allowed } = await _statusMapPromise;
//   return allowed;
// }

// ── Status enum mapping helpers ────────────────────────────────
// Canonicalizer: lowercase + strip spaces/underscores
const CANON = (s) => String(s || '').toLowerCase().replace(/[_\s]+/g, '').trim();

// Accept common UI synonyms and map them to the DB's enum labels
//Allowed list of statusus
const SYNONYMS = {
  // Technical
  technicalsubmission: 'Technical Submitted',
  technicalsubmitted:  'Technical Submitted',
  technicalapproval:   'Technical Approved',
  technicalapproved:   'Technical Approved',
  technicalrejected:   'Technical Rejected',

  // Estimation
  estimatesubmission:   'Estimation Submitted',
  estimationsubmission: 'Estimation Submitted',
  estimatesubmitted:    'Estimation Submitted',
  estimationsubmitted:  'Estimation Submitted',
  estimateapproval:     'Estimation Approved',
  estimationapproval:   'Estimation Approved',
  estimateapproved:     'Estimation Approved',
  estimationapproved:   'Estimation Approved',
  estimaterejected:     'Estimation Rejected',
  estimationrejected:   'Estimation Rejected',

  // Proposal
  proposalsubmission: 'Proposal Submitted',
  proposalsubmitted:  'Proposal Submitted',

  proposalcreated:  'Proposal Created',

  proposalapproval:   'Proposal Approved',
  proposalapproved:   'Proposal Approved',

  // UI-only stages → best effort mapping
  proposalcreation: 'Proposal Created',
  poreceived:       'PO Received',
  poaccepted:       'PO Accepted',
};

let _statusMapPromise = null;
async function _loadCaseStatusMap() {
  const { rows } = await pool.query(`
    SELECT e.enumlabel AS label
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'case_status'
    ORDER BY e.enumsortorder
  `);
  const map = Object.create(null);
  for (const r of rows) map[CANON(r.label)] = r.label; // canonical -> real label
  return { map, allowed: rows.map(r => r.label) };
}

async function getStatusLabel(candidate) {
  if (!candidate) return null;
  const key = CANON(candidate);

  // 1) Try explicit synonyms
  if (SYNONYMS[key]) return SYNONYMS[key];

  // 2) Try exact enum labels (space/underscore agnostic)
  if (!_statusMapPromise) _statusMapPromise = _loadCaseStatusMap();
  const { map } = await _statusMapPromise;
  return map[key] || null;
}

async function getAllowedStatuses() {
  if (!_statusMapPromise) _statusMapPromise = _loadCaseStatusMap();
  const { allowed } = await _statusMapPromise;
  return allowed;
}


/* ──────────────────────────────────────────────────────────────
   Files (list & download)
   ────────────────────────────────────────────────────────────── */

router.get('/:id/files', verifyToken, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, original_name, stored_path, created_at, uploaded_by
       FROM enquiry_files
      WHERE enquiry_id = $1
      ORDER BY id DESC`,
    [req.params.id]
  );
  res.json(rows);
});

router.get('/files/:fileId/download', verifyToken, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT original_name, stored_path
       FROM enquiry_files
      WHERE id = $1`,
    [req.params.fileId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'File not found' });
  const { original_name, stored_path } = rows[0];
  return res.download(stored_path, original_name);
});

/* ──────────────────────────────────────────────────────────────
   Create with file upload
   ────────────────────────────────────────────────────────────── */




// ───────── POST /api/enquiries/upload ─────────
router.post('/upload', verifyToken, upload.array('files'), async (req, res) => {
  try {
    const dataIn = req.body || {};
    const userId = req.user?.userId || req.user?.id || null;

    // normalize/validate status against enum
    if (dataIn.status) {
      const mapped = await getStatusLabel(dataIn.status);
      if (!mapped) {
        const allowed = await getAllowedStatuses();
        return res.status(400).json({
          error: `Invalid status '${dataIn.status}'. Allowed: ${allowed.join(', ')}`
        });
      }
      dataIn.status = mapped;
    }

    const columns = [
      'case_no', 'enquiry_no', 'enquiry_details', 'special_instructions',
      'technical_no', 'estimation_no', 'proposal_no',
      'attach_email', 'attach_supporting_docs', 'attach_technical', 'attach_technical_supportings',
      'attach_estimation', 'attach_estimation_supportings', 'attach_proposal', 'attach_proposal_supportings',
      'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date',
      'technical_comments', 'technical_decision', 'technical_approval_comment',
      'estimation_comments', 'estimation_approval', 'estimation_approval_comment',
      'proposal_comments', 'proposal_approval', 'proposal_approval_comments',
      'status', 'initiator_mail_id', 'technical_recipient_mail_id', 'technical_approver_mail_id',
      'estimation_recipient_mail_id', 'estimation_approver_mail_id',
      'proposal_creator_mail_id', 'proposal_approver_mail_id', 'client_mail_id',
      'workflow_id', 'client_id', 'initiator_id', 'initiator_email', 'recipient',
      // NEW fields
      'enquiry_date','offer_date','source','repeat_or_new','enquiry_type','qty','size_model',
      'offer_value_in_inr','country','po_no','po_date','po_value_in_inr','po_value_in_usd',
      'exchange_rate','project_code','key_decision_maker',
      'date_technical_created','date_technical_approved',
      'date_estimate_created','date_estimate_approved',
      'date_proposal_created','date_proposal_approved','date_proposal_sent'
    ];

    const values = columns.map((col) => toDb(dataIn[col]));

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `
      INSERT INTO enquiries (${columns.join(', ')}, created_at)
      VALUES (${placeholders}, NOW())
      RETURNING id
    `;
    const result = await pool.query(insertQuery, values);
    const enquiryId = result.rows[0].id;

    // Save files
    const fileRecords = await uploadEnquiryFiles(enquiryId, userId, req.files || []);

    // Notify
    const { rows } = await pool.query('SELECT * FROM enquiries WHERE id = $1', [enquiryId]);
    try { await triggerEmailOnStatusChange(rows[0]); } catch (e) { console.error('Email error:', e); }

    return res.status(201).json({
      message: 'Enquiry submitted and files uploaded successfully',
      enquiryId,
      files: fileRecords
    });
  } catch (err) {
    console.error('❌ Insert (multipart) failed:', err?.message, err?.detail);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// ───────── POST /api/enquiries (JSON-only) ─────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const dataIn = req.body || {};

    // normalize/validate status against enum
    if (dataIn.status) {
      const mapped = await getStatusLabel(dataIn.status);
      if (!mapped) {
        const allowed = await getAllowedStatuses();
        return res.status(400).json({
          error: `Invalid status '${dataIn.status}'. Allowed: ${allowed.join(', ')}`
        });
      }
      dataIn.status = mapped;
    }

    const columns = [
      'case_no', 'enquiry_no', 'enquiry_details', 'special_instructions',
      'technical_no', 'estimation_no', 'proposal_no',
      'attach_email', 'attach_supporting_docs', 'attach_technical', 'attach_technical_supportings',
      'attach_estimation', 'attach_estimation_supportings', 'attach_proposal', 'attach_proposal_supportings',
      'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date',
      'technical_comments', 'technical_decision', 'technical_approval_comment',
      'estimation_comments', 'estimation_approval', 'estimation_approval_comment',
      'proposal_comments', 'proposal_approval', 'proposal_approval_comments',
      'status', 'initiator_mail_id', 'technical_recipient_mail_id', 'technical_approver_mail_id',
      'estimation_recipient_mail_id', 'estimation_approver_mail_id',
      'proposal_creator_mail_id', 'proposal_approver_mail_id', 'client_mail_id',
      'workflow_id', 'client_id', 'initiator_id', 'initiator_email', 'recipient',
      // NEW fields too
      'enquiry_date','offer_date','source','repeat_or_new','enquiry_type','qty','size_model',
      'offer_value_in_inr','country','po_no','po_date','po_value_in_inr','po_value_in_usd',
      'exchange_rate','project_code','key_decision_maker',
      'date_technical_created','date_technical_approved',
      'date_estimate_created','date_estimate_approved',
      'date_proposal_created','date_proposal_approved','date_proposal_sent'
    ];

    const values = columns.map((col) => toDb(dataIn[col]));

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `
      INSERT INTO enquiries (${columns.join(', ')}, created_at)
      VALUES (${placeholders}, NOW())
      RETURNING id
    `;
    const result = await pool.query(insertQuery, values);
    const caseId = result.rows[0].id;

    const { rows } = await pool.query('SELECT * FROM enquiries WHERE id = $1', [caseId]);
    try { await triggerEmailOnStatusChange(rows[0]); } catch (e) { console.error('Email error:', e); }

    return res.status(201).json({ message: 'Case submitted and email sent', caseId });
  } catch (err) {
    console.error('❌ Insert (JSON) failed:', err?.message, err?.detail);
    return res.status(500).json({ error: 'Failed to submit case' });
  }
});

/* ──────────────────────────────────────────────────────────────
   Read & update
   ────────────────────────────────────────────────────────────── */

router.get('/', verifyToken, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        e.*,
        e.created_at,
        bp.name  AS business_partner_name,
        bp.email AS business_partner_email
      FROM enquiries e
      LEFT JOIN businesspartner bp ON bp.id = e.client_id
      ORDER BY e.created_at DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching cases:', err);
    return res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    // clean + normalize payload
    const cleaned = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (v === undefined) continue;
      cleaned[k] = (v === '' || v === 'null' || v === 'undefined') ? null : v;
    }
    if (cleaned.status) {
      const mapped = await getStatusLabel(cleaned.status);
      if (!mapped) {
        const allowed = await getAllowedStatuses();
        return res.status(400).json({
          error: `Invalid status '${cleaned.status}'. Allowed: ${allowed.join(', ')}`
        });
      }
      cleaned.status = mapped;
    }

    const fields = Object.keys(cleaned);
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map((f) => cleaned[f]);

    const updateQuery = `
      UPDATE enquiries
      SET ${setClause}
      WHERE id = $${fields.length + 1}
      RETURNING *`;
    const { rows } = await pool.query(updateQuery, [...values, id]);
    const updated = rows[0];

    try { await triggerEmailOnStatusChange(updated); } catch (e) {
      console.error('Email error:', e?.message || e);
    }

    return res.json({ message: 'Case updated successfully', enquiry: updated });
  } catch (err) {
    console.error('Error updating case:', err?.message, err?.detail, err?.stack);
    return res.status(500).json({ error: 'Failed to update case' });
  }
});

// ✅ Update an enquiry (GENERAL update)
// Only updates real columns; ignores derived fields like business_partner_name/email
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);

  // 🚫 Drop display-only fields that came from JOIN aliases
  delete req.body.business_partner_name;
  delete req.body.business_partner_email;

  // ✅ Only allow real columns from enquiries (add/remove to match your schema)
  const body = pick(req.body, [
    'status',                 // case_status enum in your DB
    'status_comments',
    'client_id',
    'recipient_user_id',
    'assignor_user_id',
    'proposal_submission_date',
    'created_date',
    // add any other REAL columns from enquiries if you need them
  ]);

  if (Object.keys(body).length === 0) {
    return res.status(400).json({ ok: false, error: 'No updatable fields in payload.' });
  }

  // Build UPDATE ... SET ... safely
  const sets = [];
  const values = [];
  for (const [k, v] of Object.entries(body)) {
    values.push(v);
    if (k === 'status') {
      // Your status column is the enum type case_status
      sets.push(`status = $${values.length}::case_status`);
    } else {
      sets.push(`${k} = $${values.length}`);
    }
  }

  values.push(id);
  const sql = `UPDATE enquiries SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING id, status::text AS status;`;

  try {
    const r = await req.app.get('db')?.query?.(sql, values) || await req.pool?.query?.(sql, values) || await require('../db').query(sql, values);
    // Fallback path above supports common project setups; if you already import `pool`, replace the line with: const r = await pool.query(sql, values);
    return res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    // If someone sends a bad status value, Postgres enum will complain here
    if (String(err?.message || '').includes('invalid input value for enum')) {
      return res.status(400).json({
        ok: false,
        error: `Invalid status '${body.status}'. Allowed values: New, Proposal Created, Technical Submitted, Technical Approved, Technical Rejected, Estimation Submitted, Estimation Approved, Estimation Rejected, Proposal Submitted, Proposal Approved, Proposal Rejected`,
      });
    }
    console.error('PATCH /enquiries/:id failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to update enquiry.' });
  }
});





// POST /api/enquiries/:id/files  → attach files to an existing enquiry
router.post('/:id/files', verifyToken, upload.array('files'), async (req, res) => {
  try {
    const enquiryId = Number(req.params.id);
    if (!enquiryId) return res.status(400).json({ error: 'Invalid enquiry id' });

    // optional: ensure the enquiry exists
    const { rows: exists } = await pool.query('SELECT id FROM enquiries WHERE id = $1', [enquiryId]);
    if (!exists[0]) return res.status(404).json({ error: 'Enquiry not found' });

    const userId = req.user?.userId || req.user?.id || null;
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files uploaded' });

    // write rows into enquiry_files (you already have this util)
    const records = await uploadEnquiryFiles(enquiryId, userId, files);

    return res.status(201).json({
      message: 'Files attached successfully',
      enquiryId,
      files: records,
    });
  } catch (err) {
    console.error('Attach files failed:', err?.message || err);
    return res.status(500).json({ error: 'Failed to attach files' });
  }
});



module.exports = router;

