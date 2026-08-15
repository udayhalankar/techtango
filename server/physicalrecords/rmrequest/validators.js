// server/rmrequest/validators.js

// Very light validation to keep your style;
// upgrade to Zod/Joi if you want stricter rules.

const STATUSES = new Set(['New','In-process','Delivered','Closed','Cancelled','Open','Exported', 'File_Delivery_Assigned']);

exports.parseSearch = (body = {}) => {
  const page = Number(body.page || 1);
  const pageSize = Math.min(100, Number(body.pageSize || 10));
  const sortBy = String(body.sortBy || 'date_created');
  const sortDir = String(body.sortDir || 'desc');
  const status = body.status ? String(body.status) : undefined;
  const type = body.type ? String(body.type) : undefined;
  const category = body.category ? String(body.category) : undefined;

  return {
    text: body.text ? String(body.text) : "",
    status,
    type,
    category,
    dateFrom: body.dateFrom || undefined,
    dateTo: body.dateTo || undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10,
    sortBy,
    sortDir,
  };
};

exports.parseCreate = (body = {}) => {
  // minimally required: type/category/status can be defaulted
  return {
    tenantId: body.tenantId ?? null,
    subTenantId: body.subTenantId ?? null,
    requestType: body.requestType ?? null,
    requestCategory: body.requestCategory ?? 'Material',
    requestStatus: body.requestStatus ?? 'New',
    subTenantdeptCode: body.subTenantdeptCode ?? null,
    requestorId: body.requestorId ?? null,
    primaryRequestID: body.primaryRequestID ?? null,
    primaryRequestType: body.primaryRequestType ?? null,
    reqCancelReason: body.reqCancelReason ?? null,
    materialQty: body.materialQty ?? null,
    auditDateFrom: body.auditDateFrom ?? null,
    auditDateTo: body.auditDateTo ?? null,
    materialQuantityIssued: body.materialQuantityIssued ?? null,
    wasDeliveryValidated: body.wasDeliveryValidated ?? null,
    deliveredTo: body.deliveredTo ?? null,
    isUserAuthenticated: body.isUserAuthenticated ?? null,
    userIP: body.userIP ?? null,
    requestCloseDate: body.requestCloseDate ?? null,
    instructions: body.instructions ?? null,
    createdBy: body.createdBy ?? null,
    modifiedBy: body.modifiedBy ?? null,
  };
};

exports.parsePatch = (body = {}) => {
  const out = {};
  [
    "tenantId","subTenantId","requestType","requestCategory","requestStatus",
    "subTenantdeptCode","requestorId","primaryRequestID","primaryRequestType",
    "reqCancelReason","materialQty","auditDateFrom","auditDateTo",
    "materialQuantityIssued","wasDeliveryValidated","deliveredTo",
    "isUserAuthenticated","userIP","requestCloseDate","instructions",
    "modifiedBy"
  ].forEach(k => { if (body[k] !== undefined) out[k] = body[k]; });
  return out;
};

exports.parseStatusOnly = (body = {}) => {
  const requestStatus = String(body.requestStatus || "");
  if (!STATUSES.has(requestStatus)) {
    throw new Error(`Invalid requestStatus. Allowed: ${Array.from(STATUSES).join(", ")}`);
  }
  return { requestStatus };
};


exports.parseCancel= (body = {}) => {
  const reason = String(body?.reason || "").trim();
  if (!reason || reason.length < 3) throw new Error("Cancellation reason required");
  return { reason };
};

function parseProcessMaterial(body = {}) {
  const n = Number(body.issueQty);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("issueQty must be a positive number");
  }
  return { issueQty: n };
}


// ADD to server/physicalrecords/rmrequest/validators.js

exports.parseMaterialCreate = ({ requestType, quantity, instructions, user, userIP }) => {
  return {
    // infer who is filing the request from auth
    requestorId: user?.id ?? null,
    createdBy:   user?.id ?? null,
    modifiedBy:  user?.id ?? null,

    // business fields
    requestType: requestType ?? null,              // "File ID Request" | "Bin ID Request" | "Bin Request"
    requestCategory: "Material",                   // per spec
    requestStatus: "New",                          // default
    materialQty: Number(quantity) || null,
    instructions: instructions ?? null,

    // audit-ish flags
    isUserAuthenticated: user?.id ? true : null,
    userIP: userIP ?? null,
  };
};

exports.parseProcessMaterial = parseProcessMaterial;