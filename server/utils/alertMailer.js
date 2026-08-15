const nodemailer = require('nodemailer');

function buildTransporter() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'udayhalankar@gmail.com';
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '';

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });
}

async function sendAlertEmail({ subject, html, text = '', to = process.env.ALERT_EMAIL || process.env.MAIL_ALERT_TO || process.env.SMTP_USER || process.env.EMAIL_USER || 'udayhalankar@gmail.com' }) {
  if (!subject || !html || !to) return null;

  const transporter = buildTransporter();
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'udayhalankar@gmail.com',
    to,
    subject,
    text: text || undefined,
    html,
  });
}

module.exports = { sendAlertEmail };
