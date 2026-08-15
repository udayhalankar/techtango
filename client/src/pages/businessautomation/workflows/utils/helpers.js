// src/pages/workflows/utils/helpers.js
export const makeId = () => Math.random().toString(36).slice(2, 9);

export const fetchJSON = async (url, opts = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...(opts.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, { ...opts, headers });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
  return json;
};

// Small defaults used when APIs aren’t reachable
export const defaultForms = [
  { id: 1, name: "Enquiry (Master)", type: "Master", template: "Enquiry" },
  { id: 2, name: "Enquiry - Update", type: "Update", template: "Enquiry" },
];
export const defaultQueries = [{ id: 1, name: "List Pending Approvals" }];
export const defaultReports = [{ id: 1, report_name: "Daily Summary" }];
export const defaultUsers  = [
  { id: 101, full_name: "Uday Halankar" },
  { id: 102, full_name: "Alice Xavier" },
];
