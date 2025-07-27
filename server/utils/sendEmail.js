// utils/sendTaskEmail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'udayhalankar@gmail.com',
    pass: process.env.EMAIL_PASS // set this in your .env as the Gmail App Password
  }
});

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

  await transporter.sendMail({
    from: '"Approvals System" <udayhalankar@gmail.com>',
    to,
    subject: 'Task Notification',
    html
  });
}

module.exports = sendTaskEmail;
