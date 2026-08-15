// src/pages/workflows/api.js

const API_BASE =
  (process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE || "/api").replace(/\/+$/, '');

async function fetchJSON(path, options = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
    if ((res.status === 401 || res.status === 403) && /token/i.test(msg)) {
      console.warn('[api] auth error → clearing token:', msg);
      localStorage.removeItem('token');
    }
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** -------- Catalog (only your real endpoints) -------- */
const catalog = {
  forms:   () => fetchJSON('/catalog/forms'),
  users:   () => fetchJSON('/catalog/users'),
  reports: () => fetchJSON('/catalog/reports'),
  // harmless stubs so Promise.all never explodes:
  queries: async () => [],
  emails:  async () => [],
};

/** -------- Workflows (match server routes exactly) -------- */
const workflows = {
  list: () => fetchJSON('/workflows'),

  get: (id, version) =>
    fetchJSON(`/workflows/${id}${version ? `?version=${encodeURIComponent(version)}` : ''}`),

  // CREATE — for Designer graph send top-level { workflowMeta, nodes, edges }
  create: (payload) =>
    fetchJSON('/workflows', { method: 'POST', body: JSON.stringify(payload) }),

  // UPDATE — overwrite graph for an existing workflow
  update: (id, payload) =>
    fetchJSON(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // SAFE wrappers (no-ops if server doesn’t have them)
  checkName: async (name) => {
    try { return await fetchJSON(`/workflows/check-name?name=${encodeURIComponent(name)}`); }
    catch (e) { console.warn('[workflows.checkName] treating as unique:', e.message); return { unique: true }; }
  },
  listVersions: async (id) => {
    try { return await fetchJSON(`/workflows/${id}/versions`); }
    catch (e) { console.warn('[workflows.listVersions] unavailable:', e.message); return []; }
  },
  createVersion: async (id, payload) => {
    try { return await fetchJSON(`/workflows/${id}/versions`, { method: 'POST', body: JSON.stringify(payload) }); }
    catch (e) {
      console.warn('[workflows.createVersion] fallback → POST /workflows:', e.message);
      return await fetchJSON('/workflows', { method: 'POST', body: JSON.stringify(payload) });
    }
  },
  rollback: async (id, version) => {
    try { return await fetchJSON(`/workflows/${id}/rollback`, { method: 'POST', body: JSON.stringify({ version }) }); }
    catch { throw new Error('Rollback not available on this server'); }
  },
};

export { catalog, workflows };
export default { catalog, workflows };


// // src/pages/workflows/api.js

// const API_BASE =
//   process.env.REACT_APP_API_BASE ||
//   (window.location.port === '3000' ? 'http://localhost:5000/api' : '/api');

// async function fetchJSON(path, options = {}) {
//   const token = localStorage.getItem('token');

//   const res = await fetch(`${API_BASE}${path}`, {
//     ...options,
//     headers: {
//       'Content-Type': 'application/json',
//       ...(options.headers || {}),
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//     credentials: 'include',
//   });

//   const text = await res.text();
//   let data = null;
//   try { data = text ? JSON.parse(text) : null; } catch (_) {}

//   if (!res.ok) {
//     const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
//     if ((res.status === 401 || res.status === 403) && /token/i.test(msg)) {
//       console.warn('[api] auth error → clearing token:', msg);
//       localStorage.removeItem('token');
//     }
//     const err = new Error(msg);
//     err.status = res.status;
//     err.data = data;
//     throw err;
//   }
//   return data;
// }

// /** -------- Catalog (only the endpoints you actually have) -------- */
// const catalog = {
//   forms:   () => fetchJSON('/catalog/forms'),
//   users:   () => fetchJSON('/catalog/users'),
//   reports: () => fetchJSON('/catalog/reports'),
//   // harmless stubs so Promise.all never explodes:
//   queries: async () => [],
//   emails:  async () => [],
// };



// /** -------- Workflows (with graceful fallbacks) -------- */
// const workflows = {
//   list: () => fetchJSON('/workflows'),

//   get: (id, version) =>
//     fetchJSON(`/workflows/${id}${version ? `?version=${encodeURIComponent(version)}` : ''}`),

//   create: (payload) =>
//     fetchJSON('/workflows', { method: 'POST', body: JSON.stringify(payload) }),

//   // SAFE: if endpoint 404/500s, treat as unique so save can proceed.
//   checkName: async (name) => {
//     try {
//       return await fetchJSON(`/workflows/check-name?name=${encodeURIComponent(name)}`);
//     } catch (e) {
//       console.warn('[workflows.checkName] ignoring error and treating as unique:', e.message);
//       return { unique: true };
//     }
//   },

//   // SAFE: if versions endpoint not available, return empty list (UI still works).
//   listVersions: async (id) => {
//     try {
//       return await fetchJSON(`/workflows/${id}/versions`);
//     } catch (e) {
//       console.warn('[workflows.listVersions] endpoint unavailable:', e.message);
//       return [];
//     }
//   },

//   // SAFE: try dedicated versions endpoint; if missing, fall back to /workflows POST.
//   createVersion: async (id, payload) => {
//     try {
//       return await fetchJSON(`/workflows/${id}/versions`, {
//         method: 'POST',
//         body: JSON.stringify(payload),
//       });
//     } catch (e) {
//       console.warn('[workflows.createVersion] falling back to POST /workflows:', e.message);
//       return await fetchJSON('/workflows', { method: 'POST', body: JSON.stringify(payload) });
//     }
//   },

//   // SAFE: if rollback unsupported, surface friendly error
//   rollback: async (id, version) => {
//     try {
//       return await fetchJSON(`/workflows/${id}/rollback`, {
//         method: 'POST',
//         body: JSON.stringify({ version }),
//       });
//     } catch (e) {
//       throw new Error('Rollback not available on this server');
//     }
//   },
// };

// export { catalog, workflows };
// export default { catalog, workflows };
