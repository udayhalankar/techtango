// server/routes/enquiries.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const triggerEmailOnStatusChange = require('../helpers/triggerEmailOnStatusChange');
const { uploadEncryptedFiles } = require('../utils/uploadEncryptedFiles');
const { verifyToken } = require('../middleware/authMiddleware');

const upload = multer({ dest: 'uploads/' });

// 🔹 POST /api/enquiries/upload – Create enquiry + upload encrypted files
router.post('/upload', verifyToken, upload.array('files'), async (req, res) => {
  const data = req.body;
  const userId = req.user.userId;

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
    'workflow_id', 'client_id', 'initiator_id', 'initiator_email', 'recipient'
  ];

  const values = columns.map((col) => data[col] || null);

  try {
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `
      INSERT INTO enquiries (${columns.join(', ')}, created_at)
      VALUES (${placeholders}, NOW()) RETURNING id
    `;
    const result = await pool.query(insertQuery, values);
    const enquiryId = result.rows[0].id;

    // 🔐 Upload files securely
    await uploadEncryptedFiles(enquiryId, userId, req.files);

    // 📧 Send email
    const { rows } = await pool.query('SELECT * FROM enquiries WHERE id = $1', [enquiryId]);
    const newCase = rows[0];
    await triggerEmailOnStatusChange(newCase);

    res.status(201).json({ message: 'Enquiry submitted and files uploaded successfully', enquiryId });
  } catch (err) {
    console.error('❌ Error uploading enquiry with files:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// 🔹 POST /api/enquiries – For JSON-only cases (no files)
router.post('/', async (req, res) => {
  const data = req.body;

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
    'workflow_id', 'client_id', 'initiator_id', 'initiator_email', 'recipient'
  ];

  const values = columns.map((col) => data[col] || null);

  try {
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `
      INSERT INTO enquiries (${columns.join(', ')}, created_at)
      VALUES (${placeholders}, NOW()) RETURNING id
    `;

    const result = await pool.query(insertQuery, values);
    const caseId = result.rows[0].id;

    const { rows } = await pool.query('SELECT * FROM enquiries WHERE id = $1', [caseId]);
    const newCase = rows[0];

    await triggerEmailOnStatusChange(newCase);

    res.status(201).json({ message: 'Case submitted and email sent', caseId });
  } catch (err) {
    console.error('Error inserting case:', err);
    res.status(500).json({ error: 'Failed to submit case' });
  }
});

// 🔹 GET /api/enquiries – Get all enquiries
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM enquiries ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching cases:', err);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// 🔹 PUT /api/enquiries/:id – Update enquiry
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const fields = Object.keys(data);
  const values = Object.values(data);

  try {
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const updateQuery = `UPDATE enquiries SET ${setClause} WHERE id = $${fields.length + 1}`;
    await pool.query(updateQuery, [...values, id]);
    res.json({ message: 'Case updated successfully' });
  } catch (err) {
    console.error('Error updating case:', err);
    res.status(500).json({ error: 'Failed to update case' });
  }
});

module.exports = router;
