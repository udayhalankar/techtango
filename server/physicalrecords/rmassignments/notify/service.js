// server/physicalrecords/rmassignments/notify/service.js
const nodemailer = require("nodemailer");
let twilioClient = null;

// -------- EMAIL (SMTP via Nodemailer) --------
let mailer = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendEmail(to, subject, text, html) {
  if (!mailer) {
    console.log("[EMAIL:DRYRUN]", { to, subject, text });
    return { dryRun: true };
  }
  const info = await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html: html || `<pre style="font-family:monospace">${text}</pre>`,
  });
  console.log("[EMAIL:sent]", info.messageId, "->", to);
  return { messageId: info.messageId };
}

// -------- SMS (Twilio optional) --------
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = require("twilio");
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}
async function sendSms(to, body) {
  if (!twilioClient || !process.env.TWILIO_FROM) {
    console.log("[SMS:DRYRUN]", { to, body });
    return { dryRun: true };
  }
  const msg = await twilioClient.messages.create({
    to: to.replace(/\s+/g, ""),
    from: process.env.TWILIO_FROM,
    body,
  });
  console.log("[SMS:sent]", msg.sid, "->", to);
  return { sid: msg.sid };
}

module.exports = { sendEmail, sendSms };
