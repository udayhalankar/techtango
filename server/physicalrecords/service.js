// server/physicalrecords/service.js
const db = require("../db"); // correct relative path from /physicalrecords to /server/db  (your file already uses this) 

const SELECT_COLUMNS = `
  id, tenantid, subtenantid, owner, custodian, requestid, requesttype,
  fileid, binid, fileplanname, subtenantdeptcode, subtenantcode,
  filestatus, activestorage, inactivestorage, facility, location,
  deptfileid, inwarddate, vitalstatus, rmclassification, cutoffdt,
  retentionperiodpostcutoff, classification, category, isarchive,
   holdstatus, isrecord,
  isscancopyavailable, scancopyurl, ispotentialrecord, 
  date_created, created_by, date_modified, modified_by
`;

const search = async function ({ text = "" }) {
  const term = `%${text}%`;
  const { rows } = await db.query(
    `
    SELECT ${SELECT_COLUMNS}
    FROM rmfilemaster
    WHERE $1 = '%%'
       OR fileid ILIKE $1
       OR deptfileid ILIKE $1
       OR binid ILIKE $1
       OR custodian ILIKE $1
       OR requesttype ILIKE $1
       OR filestatus ILIKE $1
    ORDER BY date_created DESC, id DESC
    LIMIT 200
    `,
    [term]
  );

  const items = rows.map((r) => ({
    id: r.id,
    fileId: r.fileid,
    departmentFileId: r.deptfileid,
    boxId: r.binid,
    dateCreated: r.date_created,
    status: r.filestatus,
    custodian: r.custodian,
    requestType: r.requesttype,
  }));
  return { items, total: rows.length };
};

// server/physicalrecords/service.js
const submit = async function (req) {
  const body = req.body || {};
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return { ok: false, error: "No file IDs provided." };

  // Request Type must come from the input field
  const requestType = String(body.requestType || "").trim();
  if (!requestType) return { ok: false, error: "Request type is required." };

  // Logged-in user (set by verifyToken) + tenant
  const user = req.user || {};
  const requestorId = user.id ?? null;
  const tenantId    = user.tenant_id ?? null;

  // ✅ use this exact name everywhere below
  const isUserAuthenticated = !!requestorId;

  // IP
  const userIP = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;

  // DB-allowed category & status
  const requestCategory = "Service";
  const requestStatus   = "New";

  const createdBy  = requestorId;
  const modifiedBy = requestorId;

  // 1) Create rm_request (RETURNING so we can update rmfilemaster)
  const insertReqSql = `
    INSERT INTO public.rm_request (
      tenant_id, request_type, request_category, request_status,
      requestor_id, is_user_authenticated, user_ip,
      created_by, modified_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING request_id
  `;
  const insertParams = [
    tenantId,
    requestType,           // <-- from input
    requestCategory,
    requestStatus,
    requestorId,
    isUserAuthenticated,   // <-- use the same variable name
    userIP,
    createdBy,
    modifiedBy,
  ];
  const { rows: reqRows } = await db.query(insertReqSql, insertParams);
  const requestId = reqRows?.[0]?.request_id;
  if (!requestId) return { ok: false, error: "Failed to create rm_request." };

  // 2) Attach files: set requestid + "<requestType>_requested"
  const newStatus = `${requestType}_requested`;
  const updateSql = `
    UPDATE rmfilemaster
       SET requestid = $1,
           filestatus = $2,
           modified_by = $3,
           date_modified = NOW()
     WHERE id = ANY($4::int[])
  `;
  const { rowCount } = await db.query(updateSql, [
    requestId,
    newStatus,
    modifiedBy,
    ids,
  ]);

  return {
    ok: true,
    requestId,
    updatedFiles: rowCount,
    requestType,       // echoes input
    requestCategory,   // "Material"
    requestStatus,     // "New"
  };
};


const getRequest = async function (id) {
  const { rows } = await db.query(
    `SELECT ${SELECT_COLUMNS} FROM rmfilemaster WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

const processService = async function (id, body) {
  await db.query(`UPDATE rmfilemaster SET modified_by = $2 WHERE id = $1`, [
    id,
    body?.user || "system",
  ]);
  return { ok: true, id, type: "SERVICE" };
};

const processMaterial = async function (id, body) {
  await db.query(`UPDATE rmfilemaster SET modified_by = $2 WHERE id = $1`, [
    id,
    body?.user || "system",
  ]);
  return { ok: true, id, type: "MATERIAL" };
};

const inwardBoxes = async function (body) { return { ok: true, received: body }; };
const inwardFiles = async function (body) { return { ok: true, received: body }; };

const register = async function (body) {
  const r = body || {};
  const { rows } = await db.query(
    `
    INSERT INTO public.rm_request (
    tenant_id, request_type, request_category, request_status,
    requestor_id, is_user_authenticated, user_ip,
    created_by, modified_by
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING id
    `,
    [tenantId, requestType, requestCategory, requestStatus,
    requestorId, isAuth, userIP, createdBy, modifiedBy]);
  return { ok: true, id: rows[0].id };
};

module.exports = {
  search,
  submit,
  getRequest,
  processService,
  processMaterial,
  inwardBoxes,
  inwardFiles,
  register,
};



// // module.exports = {
// // async search({ text }) {
// // // TODO: replace with DB. Returning demo rows matching your screenshot columns.
// // return {
// // items: [
// // { id: 1, fileId: "TM-FIN-F2345", departmentFileId: "Budget 1 — 2022", boxId: "TM-FIN-B23", dateCreated: "21 July 2022", status: "IN", custodian: "RECORDS", requestType: "SERVICE", objectId: 1004, owner: "Uday Halankar", category: "Finance", period: "Jan to Mar 23", recordsManager: "Uday Halankar", recordsClassification: "Finance Records" },
// // ],
// // };
// // },
// // async submit(payload) { return { ok: true, submitted: payload?.ids?.length || 0 }; },
// // async getRequest(id) { return { id, history: [] }; },
// // async processService(id, body) { return { ok: true, id, type: "SERVICE" }; },
// // async processMaterial(id, body) { return { ok: true, id, type: "MATERIAL" }; },
// // async inwardBoxes(body) { return { ok: true }; },
// // async inwardFiles(body) { return { ok: true }; },
// // async register(body) { return { ok: true, id: 1234 }; },
// // };


// const db = require("../db");

// const SELECT_COLUMNS = `
//   id, tenantid, subtenantid, owner, custodian, requestid, requesttype,
//   fileid, binid, fileplanname, subtenantdeptcode, subtenantcode,
//   filestatus, activestorage, inactivestorage, facility, location,
//   deptfileid, inwarddate, vitalstatus, rmclassification, cutoffdt,
//   retentionperiodpostcutoff, classification, category, isarchive,
//   otherdetails1, otherdetails2, otherdetails3, holdstatus, isrecord,
//   isscancopyavailable, scancopyurl, ispotentialrecord, idcreatedate,
//   date_created, created_by, date_modified, modified_by, recordlastaltered
// `;

// module.exports = {
//   async search({ text = "" }) {
//     const term = `%${text}%`;
//     const { rows } = await db.query(
//       `
//       SELECT ${SELECT_COLUMNS}
//       FROM rmfilemaster
//       WHERE $1 = '%%'
//          OR fileid ILIKE $1
//          OR deptfileid ILIKE $1
//          OR binid ILIKE $1
//          OR custodian ILIKE $1
//          OR requesttype ILIKE $1
//          OR filestatus ILIKE $1
//       ORDER BY date_created DESC, id DESC
//       LIMIT 200
//       `,
//       [term]
//     );

//     const items = rows.map(r => ({
//       id: r.id,
//       fileId: r.fileid,
//       departmentFileId: r.deptfileid,
//       boxId: r.binid,
//       dateCreated: r.date_created,
//       status: r.filestatus,
//       custodian: r.custodian,
//       requestType: r.requesttype,
//     }));
//     return { items, total: rows.length };
//   },

//   // async submit(payload) {
//   //   const count = Array.isArray(payload?.ids) ? payload.ids.length : 0;
//   //   return { ok: true, submitted: count };
//   // },

//   /**
//    * Create rm_request + attach selected rmfilemaster rows to that request
//    * Expects body: { ids: number[], requestType: string }
//    * Pulls requestor/tenant/auth/ip from req
//    */
//   async submit(req) {
//     const body = req.body || {};
//     const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
//     if (!ids.length) return { ok: false, error: "No file IDs provided." };

//     const requestType = String(body.requestType || "").trim();
//     if (!requestType) return { ok: false, error: "Request type is required." };

//     // --- derive context from auth/session ---
//     const user = req.user || {};
//     const requestorId = user.id ?? user.user_id ?? null;               // map from your auth
//     const tenantId    = user.tenant_id ?? user.tenantId ?? null;       // map from your auth
//     const isUserAuthenticated = !!requestorId;
//     const userIP = (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) || req.ip || null;

//     // Business constants (as requested)
//     const requestCategory = "Service Request";
//     const requestStatus   = "New";

//     // --- create rm_request using the rmrequest service ---
//     const { create } = require("../rmrequest/service"); // reuse existing module
//     const createRes = await create({
//       tenantId,
//       subTenantId: null,
//       requestType,
//       requestCategory,
//       requestStatus,
//       subTenantdeptCode: null,
//       requestorId,
//       primaryRequestID: null,
//       primaryRequestType: null,
//       reqCancelReason: null,
//       materialQty: null,
//       auditDateFrom: null,
//       auditDateTo: null,
//       materialQuantityIssued: null,
//       wasDeliveryValidated: null,
//       deliveredTo: null,
//       isUserAuthenticated,
//       userIP,
//       requestCloseDate: null,
//       instructions: null,
//       createdBy: requestorId || "system",
//       modifiedBy: requestorId || "system",
//     });

//     if (!createRes?.ok || !createRes?.id) {
//       return { ok: false, error: "Failed to create rm_request." };
//     }
//     const requestId = createRes.id;

//     // --- attach files: set requestid + filestatus = "<type>_requested" ---
//     const newStatus = `${requestType}_requested`;
//     const sql = `
//       UPDATE rmfilemaster
//          SET requestid = $1,
//              filestatus = $2,
//              modified_by = $3,
//              date_modified = NOW()
//        WHERE id = ANY($4::int[])
//     `;
//     const params = [requestId, newStatus, requestorId || "system", ids];
//     const { rowCount } = await db.query(sql, params);

//     return {
//       ok: true,
//       requestId,
//       updatedFiles: rowCount,
//       requestType,
//       requestCategory,
//       requestStatus,
//     };
//   },

//   async getRequest(id) {
//     const { rows } = await db.query(
//       `SELECT ${SELECT_COLUMNS} FROM rmfilemaster WHERE id = $1`,
//       [id]
//     );
//     return rows[0] || null;
//   },

//   async processService(id, body) {
//     await db.query(
//       `UPDATE rmfilemaster SET modified_by = $2 WHERE id = $1`,
//       [id, body?.user || "system"]
//     );
//     return { ok: true, id, type: "SERVICE" };
//   },

//   async processMaterial(id, body) {
//     await db.query(
//       `UPDATE rmfilemaster SET modified_by = $2 WHERE id = $1`,
//       [id, body?.user || "system"]
//     );
//     return { ok: true, id, type: "MATERIAL" };
//   },

//   async inwardBoxes(body)  { return { ok: true, received: body }; },
//   async inwardFiles(body)  { return { ok: true, received: body }; },

//   async register(body) {
//     const r = body || {};
//     const { rows } = await db.query(
//       `
//       INSERT INTO rmfilemaster
//         (tenantid, subtenantid, owner, custodian, requestid, requesttype,
//          fileid, binid, fileplanname, subtenantdeptcode, subtenantcode,
//          filestatus, facility, location, deptfileid, inwarddate,
//          created_by, modified_by)
//       VALUES
//         ($1,$2,$3,$4,$5,$6,
//          $7,$8,$9,$10,$11,
//          $12,$13,$14,$15,$16,
//          $17,$18)
//       RETURNING id
//       `,
//       [
//         r.tenantId ?? null,
//         r.subTenantId ?? null,
//         r.owner ?? null,
//         r.custodian ?? null,
//         r.requestId ?? null,
//         r.requestType ?? null,
//         r.fileId,
//         r.binId ?? null,
//         r.fileplanName ?? null,
//         r.subTenantDeptcode ?? null,
//         r.subTenantcode ?? null,
//         r.fileStatus ?? "IN",
//         r.facility ?? null,
//         r.location ?? null,
//         r.deptFileId,
//         r.inwardDate ?? new Date(),
//         r.created_By ?? "system",
//         r.modified_By ?? "system",
//       ]
//     );
//     return { ok: true, id: rows[0].id };
//   },
// };
