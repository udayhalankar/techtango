const nodemailer = require('nodemailer');

function getMailConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'udayhalankar@gmail.com';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '';
  const from = process.env.MAIL_FROM || `"Approvals System" <${user}>`;
  return { host, port, secure, user, pass, from };
}

function createTransporter() {
  const cfg = getMailConfig();
  if (!cfg.user || !cfg.pass) {
    const err = new Error('SMTP credentials missing: set SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS');
    err.code = 'SMTP_CONFIG_MISSING';
    throw err;
  }

  return {
    transporter: nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.pass
      }
    }),
    config: cfg
  };
}

async function sendTaskEmail({ to, recipientName, message, link }) {
  const html = `
    <p>Dear ${recipientName},</p>
    <p>${message}</p>
    <a href="${link}" style="
      padding: 8px 16px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      display: inline-block;
      margin-top: 8px;
    ">Click here to view the task</a>
    <p><br>Regards,<br>Approvals System</p>
  `;

  const { transporter, config } = createTransporter();
  await transporter.sendMail({
    from: config.from,
    to,
    subject: 'Task Notification',
    html
  });
}

module.exports = sendTaskEmail;
