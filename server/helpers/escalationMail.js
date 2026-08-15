// server/helpers/escalationMail.js
const { sendMail } = require('./mail'); // your existing mail transport wrapper
const { fetchUserEmailsByIds } = require('./users'); // implement

function normalizeMailContent(mail_content) {
  if (typeof mail_content === 'string') {
    try { return JSON.parse(mail_content); } catch { return {}; }
  }
  return mail_content || {};
}

async function sendEscalationMail({ row, tier }) {
  const mc = normalizeMailContent(row.mail_content);
  const recipients = tier.users?.length ? tier.users : row.mail_notification_users || [];
  const emails = await fetchUserEmailsByIds(recipients);
  if (!emails.length) throw new Error('no escalation recipients');

  const subject =
    tier.subject?.trim() ||
    mc.notification_subject ||
    mc.mail_notification_subject ||
    row.mail_notification_subject ||
    `Workflow Overdue: Instance ${row.instance_id}`;

  const body = mc.body || 'This step is overdue.';
  const wrappedBody = mc.wrap_content !== false
    ? `<div data-mail-wrap="1" style="border:1px solid #d1d5db;border-radius:5px;padding:12px;">${body}</div>`
    : body;

  await sendMail({
    to: emails,
    subject,
    html: wrappedBody,
    attachments: [], // add PDF/report if needed
  });
}

module.exports = { sendEscalationMail };
