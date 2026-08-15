// Independent email-as-PDF helper route.
// Mount it (manually) in server/server.js:
//   const emailPdf = getRouter(require('./routes/email_pdf'), 'email_pdf');
//   if (emailPdf) app.use('/api/email_pdf', emailPdf());

const express = require('express');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');

// Basic transporter using env; prefers SMTP_* then EMAIL_* fallbacks
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpSecure = (process.env.SMTP_SECURE || '').toString().toLowerCase() === 'true';
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || '';
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
});

async function renderPdfFromHtml(html = '', pdfOptions = {}) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      printBackground: true,
      format: 'A4',
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      ...pdfOptions,
    });
    await browser.close();
    return pdf;
  } catch (err) {
    await browser.close();
    throw err;
  }
}

module.exports = function emailPdfRouter() {
  const router = express.Router();

  // POST /api/email_pdf/send
  // body: { html, subject, text, to, cc, bcc, filename, pdfOptions }
  router.post('/send', async (req, res) => {
    try {
      const {
        html = '',
        subject = 'Document',
        text = '',
        to = [],
        cc = [],
        bcc = [],
        filename = 'document.pdf',
        pdfOptions = {},
      } = req.body || {};

      const recips = []
        .concat(to || [])
        .concat(cc || [])
        .concat(bcc || [])
        .map((r) => (r || '').toString())
        .filter((r) => r.includes('@'));

      if (!html || !recips.length) {
        return res.status(400).json({ error: 'Missing html or recipients' });
      }

      const pdf = await renderPdfFromHtml(html, pdfOptions);

      const info = await transporter.sendMail({
        from: smtpUser || undefined,
        to: to,
        cc: cc,
        bcc: bcc,
        subject,
        text: text || undefined,
        html,
        attachments: [
          {
            filename,
            content: pdf,
            contentType: 'application/pdf',
          },
        ],
      });

      return res.json({ sent: true, messageId: info.messageId });
    } catch (e) {
      console.error('[email_pdf/send]', e);
      return res.status(500).json({ error: 'Failed to send email', detail: e.message });
    }
  });

  return router;
};
