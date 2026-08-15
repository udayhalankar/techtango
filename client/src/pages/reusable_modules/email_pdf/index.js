// Reusable helper to send arbitrary HTML as a PDF email attachment.
// Requires server route mounted at /api/email_pdf (see server/routes/email_pdf.js).
import api from '../../../services/api';

const withAuth = (token) =>
  token
    ? {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      }
    : {};

/**
 * Send HTML content as a PDF attachment by calling /api/email_pdf/send
 * @param {Object} params
 * @param {string} params.html - HTML string to render into PDF and embed in email body
 * @param {string|string[]} params.to - recipient(s)
 * @param {string|string[]} [params.cc]
 * @param {string|string[]} [params.bcc]
 * @param {string} [params.subject='Document']
 * @param {string} [params.text] - optional plain text body
 * @param {string} [params.filename='document.pdf']
 * @param {Object} [params.pdfOptions] - passed to puppeteer page.pdf()
 * @param {string} [token] - optional bearer token
 */
export async function sendEmailPdf(params, token) {
  const payload = { ...params };
  // Normalize recipient arrays
  ['to', 'cc', 'bcc'].forEach((k) => {
    if (payload[k] && !Array.isArray(payload[k])) {
      payload[k] = [payload[k]];
    }
  });

  const { data } = await api.post('/email_pdf/send', payload, {
    headers: withAuth(token),
  });
  return data;
}
