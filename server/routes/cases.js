// server/routes/cases.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const triggerEmailOnStatusChange = require('../helpers/triggerEmailOnStatusChange');

router.post('/', async (req, res) => {
  const {
    enquiryNo,
    enquiryDetails,
    specialInstructions,
    technicalSubmissionDate,
    estimationSubmissionDate,
    proposalSubmissionDate,
    workflowId
  } = req.body;

  try {
    // 1️⃣ Insert new case with default status "New"
    const insertQuery = `
      INSERT INTO enquiries (
        enquiry_no,
        enquiry_details,
        special_instructions,
        technical_submission_date,
        estimation_submission_date,
        proposal_submission_date,
        workflow_id,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'New')
      RETURNING id
    `;

    const values = [
      enquiryNo,
      enquiryDetails,
      specialInstructions,
      technicalSubmissionDate,
      estimationSubmissionDate,
      proposalSubmissionDate,
      workflowId
    ];

    const result = await pool.query(insertQuery, values);
    const caseId = result.rows[0].id;

    // 2️⃣ Fetch inserted case to get all email fields
    const { rows } = await pool.query('SELECT * FROM enquiries WHERE id = $1', [caseId]);
    const newCase = rows[0];

    // 3️⃣ Trigger email notifications based on status & workflow
    await triggerEmailOnStatusChange(newCase);

    res.status(201).json({ message: 'Case submitted and email sent', caseId });
  } catch (err) {
    console.error('Error inserting case:', err);
    res.status(500).json({ error: 'Failed to submit case' });
  }
});

module.exports = router;
