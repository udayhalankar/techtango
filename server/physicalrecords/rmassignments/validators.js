// server/rmassignments/validators.js
//const TASKS = new Set(["Retrieval","Refiling", "Delivery", "Audit", "Insertion", "Box Delivery","File ID Delivery","Box ID Delivery", "File ID","Box ID","Permout Delivery","Permout Destruction",]);
const TASKS = new Set([
  "Retrieval","Refiling","Delivery","Audit","Insertion",
  "Box Delivery","File ID Delivery","Box ID Delivery","File ID","Box ID",
  "Permout Delivery","Permout Destruction",
  "Refiling Pickup","Inward Pickup", "Refiling Files", "Inward Files", "Files Delivery", "Files Destruction","Material Delivery"
  // ⬅️ new
]);
const STATUSES = new Set(["Assigned","Accepted","Completed","Cancelled"]);

exports.parseSearch = (body = {}) => {
  const page = Number(body.page || 1);
  const pageSize = Math.min(100, Number(body.pageSize || 10));
  const sortBy = String(body.sortBy || 'date_assigned'); // also: assignment_status | task_name
  const sortDir = String(body.sortDir || 'desc');

  return {
    text: body.text ? String(body.text) : "",
    requestId: body.requestId ? Number(body.requestId) : undefined,
    taskName: body.taskName ? String(body.taskName) : undefined,
    assignmentStatus: body.assignmentStatus ? String(body.assignmentStatus) : undefined,
    userAssignedTo: body.userAssignedTo ? Number(body.userAssignedTo) : undefined,
    dateFrom: body.dateFrom || undefined,
    dateTo: body.dateTo || undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10,
    sortBy, sortDir,
  };
};

exports.parseCreate = (body = {}) => {
  const out = {
    requestId: Number(body.requestId),
    taskName: String(body.taskName || ""),
    userAssignedTo: body.userAssignedTo === undefined ? null : Number(body.userAssignedTo),
    userAssignedToName: body.userAssignedToName ?? null,
    otp: body.otp ?? null,
    assignmentStatus: String(body.assignmentStatus || "Assigned"),
    assignedBy: body.assignedBy ?? null,
    comments: body.comments ?? null,
  };
  if (!TASKS.has(out.taskName)) throw new Error(`Invalid taskName. Allowed: ${Array.from(TASKS).join(", ")}`);
  if (!STATUSES.has(out.assignmentStatus)) throw new Error(`Invalid assignmentStatus. Allowed: ${Array.from(STATUSES).join(", ")}`);
  if (!Number.isFinite(out.requestId)) throw new Error("requestId is required");
  return out;
};

exports.parsePatch = (body = {}) => {
  const out = {};
  ["taskName","userAssignedTo","userAssignedToName","otp","assignmentStatus","assignedBy","comments"].forEach(k => {
    if (body[k] !== undefined) out[k] = body[k];
  });
  return out;
};

exports.parseStatusOnly = (body = {}) => {
  const assignmentStatus = String(body.assignmentStatus || "");
  if (!STATUSES.has(assignmentStatus)) {
    throw new Error(`Invalid assignmentStatus. Allowed: ${Array.from(STATUSES).join(", ")}`);
  }
  return { assignmentStatus };
};
