const pool = require('../db');
const sendTaskEmail = require('../utils/sendEmail');
const { appUrl } = require('../utils/appBaseUrl');

// // keys use underscores (UI-mode style); we'll canonicalize DB status to match
// const NEXT_ASSIGNEE_FIELD = {
//   New: 'technical_recipient_mail_id',
//   Technical_Submission: 'technical_approver_mail_id',
//   Technical_Approval: 'estimation_recipient_mail_id',
//   Estimate_Submission: 'estimation_approver_mail_id',
//   Estimate_Approval: 'proposal_creator_mail_id',
//   Proposal_Creation: 'proposal_approver_mail_id',
//   Proposal_Approval: 'proposal_creator_mail_id',
//   Proposal_Submission: 'proposal_approver_mail_id',
//   Proposal_Submitted: 'proposal_approver_mail_id',
//   PO_Received: 'proposal_approver_mail_id',
//   PO_Accepted: null,
// };

// Who gets notified next at each DB status:
const NEXT_ASSIGNEE_FIELD = {
  'New':                  'technical_recipient_mail_id',
  'Technical Submitted':  'technical_approver_mail_id',
  'Technical Approved':   'estimation_recipient_mail_id',
  'Technical Rejected':   'technical_recipient_mail_id',   // back to Tech

  'Estimation Submitted': 'estimation_approver_mail_id',
  'Estimation Approved':  'proposal_creator_mail_id',
  'Estimation Rejected':  'estimation_recipient_mail_id',  // back to Estimation

  'Proposal Submitted':   'proposal_approver_mail_id',
  'Proposal Approved':    'proposal_creator_mail_id',
  'Proposal Rejected':    'proposal_creator_mail_id',
};

function toKeyFromDbStatus(status) {
  // "Technical Submission" -> "Technical_Submission"
  return String(status || '').trim().replace(/\s+/g, '_');
}

async function triggerEmailOnStatusChange(caseData) {
  try {
    if (!caseData) return;
    const { id, status, enquiry_no } = caseData;

    // 1) Direct assignee by status matrix
    const key = toKeyFromDbStatus(status);
    const field = NEXT_ASSIGNEE_FIELD[key];
    if (field) {
      const userId = caseData[field];
      if (userId) {
        const { rows: [u] } = await pool.query(
          'SELECT email, firstname, lastname FROM users WHERE id = $1',
          [userId]
        );
        if (u?.email) {
          await sendTaskEmail({
            to: u.email,
            recipientName: u.firstname || u.lastname || 'User',
            message: `Enquiry <b>#${id}</b> moved to <b>${status}</b>. Please take action.`,
            link: appUrl(`/enquiry/${id}`)
          });
        }
      }
    }

    // 2) Workflow step-based fallback (optional)
    if (caseData.workflow_id && status) {
      const { rows: stepRows } = await pool.query(
        `SELECT * FROM workflow_steps 
         WHERE workflow_id = $1 AND status_on_completion = $2
         LIMIT 1`,
        [caseData.workflow_id, status]
      );

      if (stepRows.length) {
        const step = stepRows[0];
        const to = step.send_email_to || step.assigned_user || null;
        const message = `
          A case has progressed to <strong>step: ${step.step_name}</strong>.<br>
          Enquiry No: <strong>${enquiry_no || id}</strong><br>
          Please take the next action.
        `;
        const link = appUrl(`/enquiry/${id}`);

        if (to) {
          await sendTaskEmail({
            to,
            recipientName: to.split('@')[0] || 'User',
            message,
            link
          });
        }
        if (Array.isArray(step.cc_list)) {
          for (const ccEmail of step.cc_list) {
            await sendTaskEmail({
              to: ccEmail,
              recipientName: ccEmail.split('@')[0] || 'User',
              message,
              link
            });
          }
        }
      }
    }

    console.log(`Emails triggered for enquiry ${caseData.id} at status ${caseData.status}`);
  } catch (err) {
    console.error('Error in triggerEmailOnStatusChange:', err);
  }
}

module.exports = triggerEmailOnStatusChange;




// // helpers/triggerEmailOnStatusChange.js
// const pool = require('../db');
// const sendTaskEmail = require('../utils/sendEmail');

// // Map current status -> field on enquiry that holds the NEXT assignee's userId
// const NEXT_ASSIGNEE_FIELD = {
//   New: 'technical_recipient_mail_id',
//   Technical_Submission: 'technical_approver_mail_id',
//   Technical_Approval: 'estimation_recipient_mail_id',
//   Estimate_Submission: 'estimation_approver_mail_id',
//   Estimate_Approval: 'proposal_creator_mail_id',
//   Proposal_Creation: 'proposal_approver_mail_id',
//   Proposal_Approval: 'proposal_creator_mail_id',
//   Proposal_Submission: 'proposal_approver_mail_id',
//   Proposal_Submitted: 'proposal_approver_mail_id',
//   PO_Received: 'proposal_approver_mail_id',
//   PO_Accepted: null,
// };


// async function getUserById(id) {
//   if (!id) return null;
//   const { rows } = await pool.query(
//     'SELECT id, email, firstname, lastname FROM users WHERE id = $1',
//     [id]
//   );
//   return rows[0] || null;
// }

// module.exports = async function triggerEmailOnStatusChange(enquiry) {
//   try {
//     if (!enquiry) return;

//     const { id, status, enquiry_no, workflow_id } = enquiry;
//     const recipients = new Map(); // email -> {name}

//     // 1) Recipient by NEXT_ASSIGNEE_FIELD
//     // const field = NEXT_ASSIGNEE_FIELD[status];
//     const key = String(status || '').replace(/\s+/g, '_');      // "Technical Submission" -> "Technical_Submission"
//     const field = NEXT_ASSIGNEE_FIELD[key];

//     if (field && enquiry[field]) {
//       const u = await getUserById(enquiry[field]);
//       if (u?.email) recipients.set(u.email, `${u.firstname || ''} ${u.lastname || ''}`.trim());
//     }

//     // 2) Also include explicit recipient column if present
//     if (enquiry.recipient) {
//       const r = await getUserById(enquiry.recipient);
//       if (r?.email) recipients.set(r.email, `${r.firstname || ''} ${r.lastname || ''}`.trim());
//     }

//     // 3) Workflow step recipients (send_email_to / cc_list)
//     if (workflow_id && status) {
//       const { rows: stepRows } = await pool.query(
//         `SELECT * FROM workflow_steps 
//          WHERE workflow_id = $1 AND status_on_completion = $2`,
//         [workflow_id, status]
//       );
//       if (stepRows.length) {
//         const step = stepRows[0];
//         if (step.send_email_to) {
//           recipients.set(step.send_email_to, step.send_email_to.split('@')[0]);
//         }
//         if (Array.isArray(step.cc_list)) {
//           for (const cc of step.cc_list) {
//             if (cc) recipients.set(cc, (cc.split('@')[0] || 'User'));
//           }
//         }
//       }
//     }

//     if (!recipients.size) return;

//     const link = `http://localhost:3000/enquiry/${id}`;
//     const subject = `Enquiry #${id} moved to ${status}`;
//     const html = `
//       <p>Hi,</p>
//       <p>Enquiry <b>#${id}</b>${enquiry_no ? ` (Client Ref: <b>${enquiry_no}</b>)` : ''} is now at <b>${status}</b>.</p>
//       <p>Please take action in Origin.</p>
//       <p><a href="${link}">Open Enquiry</a></p>
//     `;

//     // send all (deduped)
//     for (const [email, name] of recipients.entries()) {
//       await sendTaskEmail({
//         to: email,
//         recipientName: name || 'User',
//         subject,
//         html,
//         message: '', // sendTaskEmail supports (to, recipientName, message, link) or (to, subject, html)
//         link
//       });
//     }

//     console.log(`Emails triggered for enquiry ${id} at status ${status}`);
//   } catch (err) {
//     console.error('Error in triggerEmailOnStatusChange:', err);
//   }
// };


// // // helpers/triggerEmailOnStatusChange.js
// // const pool = require('../db');
// // const sendTaskEmail = require('../utils/sendEmail');

// // const NEXT_ASSIGNEE_FIELD = {
// //   New: 'technical_recipient_mail_id',
// //   Technical_Submission: 'technical_approver_mail_id',
// //   Technical_Approval: 'estimation_recipient_mail_id',
// //   Estimate_Submission: 'estimation_approver_mail_id',
// //   Estimate_Approval: 'proposal_creator_mail_id',
// //   Proposal_Creation: 'proposal_approver_mail_id',
// //   Proposal_Approval: 'proposal_creator_mail_id',
// //   Proposal_Submission: 'proposal_approver_mail_id',
// //   Proposal_Submitted: 'proposal_approver_mail_id',
// //   PO_Received: 'proposal_approver_mail_id',
// //   PO_Accepted: null,
// // };




// // async function triggerEmailOnStatusChange(caseData) {
// //   try {
// //     const { id: caseId, workflow_id, status, enquiry_no } = caseData;


// //       const field = NEXT_ASSIGNEE_FIELD[enquiry.status];
// //   if (!field) return;

// //   const userId = enquiry[field];
// //   if (!userId) return;

// //   const { rows: [u] } = await pool.query(
// //     'SELECT email, firstname, lastname FROM users WHERE id = $1',
// //     [userId]
// //   );
// //   if (!u?.email) return;

// //   await sendEmail({
// //     to: u.email,
// //     subject: `Enquiry #${enquiry.id} moved to ${enquiry.status}`,
// //     html: `<p>Hi ${u.firstname || ''},</p><p>Enquiry <b>#${enquiry.id}</b> is now at <b>${enquiry.status}</b>. Please take action in Origin.</p>`
// //   });






// //     // 🔍 Get matching workflow step for current status
// //     const { rows: stepRows } = await pool.query(
// //       `SELECT * FROM workflow_steps 
// //        WHERE workflow_id = $1 AND status_on_completion = $2`,
// //       [workflow_id, status]
// //     );

// //     if (stepRows.length === 0) {
// //       console.warn(`No matching workflow step found for status: ${status}`);
// //       return;
// //     }

// //     const step = stepRows[0];

// //     // ✅ Email content
// //     const to = step.send_email_to || step.assigned_user;
// //     const recipientName = to?.split('@')[0] || 'User';
// //     const message = `
// //       A case has progressed to <strong>step: ${step.step_name}</strong>.<br>
// //       Enquiry No: <strong>${enquiry_no}</strong><br>
// //       Please take the next action.
// //     `;
// //     const link = `http://localhost:3000/enquiry/${caseId}`;

// //     // ✉️ Send email to main recipient
// //     if (to) {
// //       await sendTaskEmail({ to, recipientName, message, link });
// //     }

// //     // 📩 Send emails to CC list
// //     if (Array.isArray(step.cc_list) && step.cc_list.length > 0) {
// //       for (let ccEmail of step.cc_list) {
// //         const ccName = ccEmail.split('@')[0];
// //         await sendTaskEmail({ to: ccEmail, recipientName: ccName, message, link });
// //       }
// //     }

// //     console.log(`Emails triggered for case ${caseId} at status ${status}`);
// //   } catch (err) {
// //     console.error('Error in triggerEmailOnStatusChange:', err);
// //   }
// // }

// // module.exports = triggerEmailOnStatusChange;
