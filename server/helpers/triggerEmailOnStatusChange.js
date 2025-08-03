// helpers/triggerEmailOnStatusChange.js
const pool = require('../db');
const sendTaskEmail = require('../utils/sendEmail');

async function triggerEmailOnStatusChange(caseData) {
  try {
    const { id: caseId, workflow_id, status, enquiry_no } = caseData;

    // 🔍 Get matching workflow step for current status
    const { rows: stepRows } = await pool.query(
      `SELECT * FROM workflow_steps 
       WHERE workflow_id = $1 AND status_on_completion = $2`,
      [workflow_id, status]
    );

    if (stepRows.length === 0) {
      console.warn(`No matching workflow step found for status: ${status}`);
      return;
    }

    const step = stepRows[0];

    // ✅ Email content
    const to = step.send_email_to || step.assigned_user;
    const recipientName = to?.split('@')[0] || 'User';
    const message = `
      A case has progressed to <strong>step: ${step.step_name}</strong>.<br>
      Enquiry No: <strong>${enquiry_no}</strong><br>
      Please take the next action.
    `;
    const link = `http://localhost:3000/enquiry/${caseId}`;

    // ✉️ Send email to main recipient
    if (to) {
      await sendTaskEmail({ to, recipientName, message, link });
    }

    // 📩 Send emails to CC list
    if (Array.isArray(step.cc_list) && step.cc_list.length > 0) {
      for (let ccEmail of step.cc_list) {
        const ccName = ccEmail.split('@')[0];
        await sendTaskEmail({ to: ccEmail, recipientName: ccName, message, link });
      }
    }

    console.log(`Emails triggered for case ${caseId} at status ${status}`);
  } catch (err) {
    console.error('Error in triggerEmailOnStatusChange:', err);
  }
}

module.exports = triggerEmailOnStatusChange;
