// Reusable helpers for emailing/downloading workflow instances as PDF
// Relies on the server routes:
//   - GET  /api/simple_workflow_instances/:id/print (HTML)
//   - GET  /api/simple_workflow_instances/:id/pdf   (PDF buffer)
//   - POST /api/simple_workflow_instances/:id/mail  (uses step mail_content config)
import api from '../../../services/api';

function withAuthHeader(token) {
  return token
    ? {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      }
    : {};
}

export async function fetchPrintableHtml(instanceId, token) {
  const { data } = await api.get(`/simple_workflow_instances/${instanceId}/print`, {
    headers: {
      Accept: 'text/html',
      ...withAuthHeader(token),
    },
    responseType: 'text',
    transformResponse: (r) => r, // keep raw HTML
  });
  return data;
}

export async function fetchPrintablePdf(instanceId, token) {
  const { data } = await api.get(`/simple_workflow_instances/${instanceId}/pdf`, {
    headers: {
      Accept: 'application/pdf',
      ...withAuthHeader(token),
    },
    responseType: 'blob',
  });
  return data;
}

export async function downloadPrintablePdf(instanceId, filename = '', token) {
  const blob = await fetchPrintablePdf(instanceId, token);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `workflow_${instanceId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Trigger server-side mail (uses step mail_content & mail_notification_users)
export async function sendWorkflowMail(instanceId, { action = 'manual' } = {}, token) {
  const { data } = await api.post(
    `/simple_workflow_instances/${instanceId}/mail`,
    { action },
    {
      headers: withAuthHeader(token),
    }
  );
  return data;
}
