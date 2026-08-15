// client/src/pages/businessautomation/simple_workflowbuilder/api.js
import api from "../../../services/api";

// ---- Auth/user context ----
export async function fetchLoginContext() {
  // expect { user_id, user_name, tenant_id }
  const { data } = await api.get("/auth/me");
  return data;
}

// ---- Tables dropdown ----
export async function fetchWorkflowTables(prefix = "custwf_") {
  // GET /api/db/tables (your server exposes this “publicly”, i.e., before the global gate)
  // Still safe to call with axios – it’ll include token if present.
  const { data } = await api.get("/db/tables");
  const arr = Array.isArray(data) ? data : (data?.tables || []);
  return arr
    .map(t => (typeof t === 'string' ? t : (t.table_name || t.name || '')))
    .filter(Boolean)
    .filter(t => t.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b));
}



// ---- Workflow header (simple_workflowbuilder) ----
export async function listWorkflows(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const { data } = await api.get(`/simple_workflowbuilder${qs ? `?${qs}` : ''}`);
  return data;
}

export async function createWorkflow(payload) {
  const { data } = await api.post(`/simple_workflowbuilder`, payload);
  return data;
}

export async function deleteWorkflow(id) {
  const { data } = await api.delete(`/simple_workflowbuilder/${id}`);
  return data;
}

export async function fetchWorkflow(id) {
  const { data } = await api.get(`/simple_workflowbuilder/${id}`);
  return data;
}

export async function publishWorkflow(id) {
  const { data } = await api.patch(`/simple_workflowbuilder/${id}/publish`);
  return data;
}

export async function unpublishWorkflow(id) {
  const { data } = await api.patch(`/simple_workflowbuilder/${id}/unpublish`);
  return data;
}

// ---- Steps (simple_workflowbuilder_steps) ----
export async function listWorkflowSteps(workflow_id) {
  const { data } = await api.get(`/simple_workflowbuilder/steps/${workflow_id}`);
  return data;
}

// export async function bulkCreateSteps(workflow_id, steps) {
//   const { data } = await api.post(`/simple_workflowbuilder/steps/${workflow_id}/bulk`, { steps });
//   return data;
// }

export async function bulkCreateSteps(workflow_id, steps) {
  // server route: /api/simple_workflowbuilder/steps/:id/bulk
  const { data } = await api.post(`/simple_workflowbuilder/steps/${workflow_id}/bulk`, { steps });
  return data;
}

export async function updateStep(step_id, patch) {
  const { data } = await api.patch(`/simple_workflowbuilder/steps/${step_id}`, patch);
  return data;
}

// Insert a step at a specific position (renumbering subsequent steps)
export async function insertWorkflowStep(workflow_id, payload) {
  const { data } = await api.post(`/simple_workflowbuilder/steps/${workflow_id}/insert`, payload);
  return data;
}

// fetch the columns of a Postgres table from your server's db-meta route
export async function fetchTableColumns(table) {
  // adjust to your real endpoint if needed
  // your server already has /api/db (dbmeta) mounted; one common pattern is /api/db/columns?table=<name>
  const { data } = await api.get(`/db/columns`, { params: { table } });
  // normalize a little
  const cols = Array.isArray(data) ? data : (data?.columns || []);
  return cols.map(c => ({
    column_name: c.column_name || c.name || c.column || '',
    data_type: (c.data_type || c.udt_name || '').toLowerCase(),
  })).filter(c => c.column_name);
}


export async function deleteWorkflowStep(step_id) {
  const { data } = await api.delete(`/simple_workflowbuilder/steps/${step_id}`);
  return data;
}

// ---- Instances (assignments) ----
export async function listAssignments(box = "inbox") {
  const { data } = await api.get(`/simple_workflow_instances`, { params: { box }});
  return data;
}
