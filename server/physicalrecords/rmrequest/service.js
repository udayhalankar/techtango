// server/physicalrecords/rmrequest/service.js
const db = require("../../db");

// Helpers
const toDbBool = (v) => (v === true || v === "true") ? true : (v === false || v === "false") ? false : null;

// put near the top with other helpers
const to3 = (s) => String(s || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3);


module.exports = {
  /**
   * Search with pagination + filters
   * body: { text?, status?, type?, category?, dateFrom?, dateTo?, page?, pageSize?, sortBy?, sortDir? }
   */
  async search({
    text = "",
    status,
    type,
    category,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 10,
    sortBy = "date_created",
    sortDir = "desc",
  }) {
    const allowedSort = new Set([
      "request_id", "date_created", "request_status", "request_type"
    ]);
    if (!allowedSort.has(sortBy)) sortBy = "date_created";
    sortDir = (String(sortDir).toLowerCase() === "asc") ? "asc" : "desc";

    const where = [];
    const params = [];
    let i = 1;

    if (text) {
      where.push(`(
        request_type ILIKE $${i} OR
        request_status ILIKE $${i} OR
        delivered_to ILIKE $${i} OR
        
        primary_request_id::text ILIKE $${i} OR
        primary_request_type ILIKE $${i}
      )`);
      params.push(`%${text}%`); i++;
    }
    if (status) { where.push(`request_status = $${i}`); params.push(status); i++; }
    if (type)   { where.push(`request_type = $${i}`);   params.push(type);   i++; }
    if (category){where.push(`request_category = $${i}`);params.push(category);i++; }
    if (dateFrom){where.push(`date_created >= $${i}`);  params.push(dateFrom);i++; }
    if (dateTo)  {where.push(`date_created <  $${i}`);  params.push(dateTo);  i++; }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*)::int AS cnt FROM public.rm_request ${whereSql}`;
    const { rows: countRows } = await db.query(countSql, params);
    const total = countRows[0]?.cnt || 0;

    const offset = Math.max(0, (page - 1) * pageSize);

    const listSql = `
      SELECT
        request_id, tenant_id, sub_tenant_id,
        request_type, request_category, request_status,
        sub_tenant_deptcode, requestor_id,
        primary_request_id, primary_request_type,
        req_cancel_reason,
        material_qty, material_quantity_issued,
        material_quantity_balance,
        audit_date_from, audit_date_to,
        was_delivery_validated, delivered_to,
        is_user_authenticated, user_ip, request_close_date,
        instructions,
        date_created, created_by, date_modified, modified_by
      FROM public.rm_request
      ${whereSql}
      ORDER BY ${sortBy} ${sortDir}
      LIMIT $${i} OFFSET $${i + 1}
    `;
    const { rows } = await db.query(listSql, [...params, pageSize, offset]);

    return {
      items: rows.map(r => ({
        id: String(r.request_id),
        requestId: r.request_id,
        tenantId: r.tenant_id,
        subTenantId: r.sub_tenant_id,
        requestType: r.request_type,
        requestCategory: r.request_category,
        requestStatus: r.request_status,
        subTenantdeptCode: r.sub_tenant_deptcode,
        requestorId: r.requestor_id,
        primaryRequestID: r.primary_request_id,
        primaryRequestType: r.primary_request_type,
        reqCancelReason: r.req_cancel_reason,
        materialQty: r.material_qty,
        materialQuantityIssued: r.material_quantity_issued,
        materialQuantityBalance: r.material_quantity_balance,
        auditDateFrom: r.audit_date_from,
        auditDateTo: r.audit_date_to,
        wasDeliveryValidated: r.was_delivery_validated,
        deliveredTo: r.delivered_to,
        isUserAuthenticated: r.is_user_authenticated,
        userIP: r.user_ip,
        requestCloseDate: r.request_close_date,
        instructions: r.instructions,
        dateCreated: r.date_created,
        createdBy: r.created_by,
        dateModified: r.date_modified,
        modifiedBy: r.modified_by,
      })),
      page,
      pageSize,
      total,
      hasMore: offset + rows.length < total,
    };
  },

  /** Create */
  async create(body) {
    const q = `
      INSERT INTO public.rm_request (
        tenant_id, sub_tenant_id,
        request_type, request_category, request_status,
        sub_tenant_deptcode, requestor_id,
        primary_request_id, primary_request_type,
        req_cancel_reason,
        material_qty, audit_date_from, audit_date_to,
        material_quantity_issued, was_delivery_validated,
        delivered_to, is_user_authenticated, user_ip,
        request_close_date, instructions,
        created_by, modified_by
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
      )
      RETURNING request_id, date_created, date_modified
    `;
    const params = [
      body.tenantId ?? null,
      body.subTenantId ?? null,
      body.requestType ?? null,
      body.requestCategory ?? null,
      body.requestStatus ?? 'New',
      body.subTenantdeptCode ?? null,
      body.requestorId ?? null,
      body.primaryRequestID ?? null,
      body.primaryRequestType ?? null,
      body.reqCancelReason ?? null,
      body.materialQty ?? null,
      body.auditDateFrom ?? null,
      body.auditDateTo ?? null,
      body.materialQuantityIssued ?? null,
      body.wasDeliveryValidated ?? null,
      body.deliveredTo ?? null,
      body.isUserAuthenticated ?? null,
      body.userIP ?? null,
      body.requestCloseDate ?? null,
      body.instructions ?? null,
      body.createdBy ?? null,
      body.modifiedBy ?? null,
    ];
    const { rows } = await db.query(q, params);
    return { ok: true, id: rows[0].request_id, dateCreated: rows[0].date_created, dateModified: rows[0].date_modified };
  },

  /** Get one */
  async getById(id) {
    const { rows } = await db.query(
      `SELECT * FROM public.rm_request WHERE request_id = $1`,
      [id]
    );
    return rows[0] || null;
  },

    

  /** Patch (partial update) */
  async patch(id, body) {
    // Build dynamic SET list
    const sets = [];
    const params = [];
    let i = 1;

    const map = {
      tenant_id: body.tenantId,
      sub_tenant_id: body.subTenantId,
      request_type: body.requestType,
      request_category: body.requestCategory,
      request_status: body.requestStatus,
      sub_tenant_deptcode: body.sub_tenant_deptcode,
      requestor_id: body.requestorId,
      primary_request_id: body.primaryRequestID,
      primary_request_type: body.primaryRequestType,
      req_cancel_reason: body.reqCancelReason,
      material_qty: body.materialQty,
      audit_date_from: body.auditDateFrom,
      audit_date_to: body.auditDateTo,
      material_quantity_issued: body.materialQuantityIssued,
      was_delivery_validated: body.wasDeliveryValidated,
      delivered_to: body.deliveredTo,
      is_user_authenticated: body.isUserAuthenticated,
      user_ip: body.userIP,
      request_close_date: body.requestCloseDate,
      instructions: body.instructions,
      modified_by: body.modifiedBy,
    };

    Object.entries(map).forEach(([col, val]) => {
      if (val !== undefined) {
        sets.push(`${col} = $${i++}`);
        params.push(val);
      }
    });

    if (!sets.length) return { ok: true, updated: 0 };

    const sql = `UPDATE public.rm_request SET ${sets.join(", ")} WHERE request_id = $${i} RETURNING request_id`;
    params.push(id);

    const { rowCount } = await db.query(sql, params);
    return { ok: true, updated: rowCount };
  },

  /** Update only status */
  async updateStatus(id, requestStatus) {
    const { rowCount } = await db.query(
      `UPDATE public.rm_request SET request_status = $1 WHERE request_id = $2`,
      [requestStatus, id]
    );
    return { ok: true, updated: rowCount };
  },





    // ...existing methods above...

  /**
   * Generate IDs and update material quantities / status.
   * For "File ID Request": IDs go to rmfilemaster (prefix ...-F-)
   * For "Bin ID Request":  IDs go to rmbinmaster (prefix ...-B-)
   * For "Bin Request":     no IDs generated; only quantity/status update
   */
  async processMaterial(requestId, issueQty, user) {
    const uid = user?.id ?? null;
    if (!requestId || !issueQty) throw new Error("Invalid request");

    // 1) Load request
    const rq = await db.query(
      `SELECT request_id, tenant_id, request_type, sub_tenant_deptcode,
              COALESCE(material_qty,0) AS qty,
              COALESCE(material_quantity_issued,0) AS issued
         FROM public.rm_request
        WHERE request_id = $1`,
      [requestId]
    );
    if (!rq.rows[0]) throw new Error("Request not found");
    const R = rq.rows[0];

    // 2) Validate balance
    const balance = Math.max(0, Number(R.qty) - Number(R.issued));
    if (issueQty > balance) {
      throw new Error(`Issue quantity ${issueQty} exceeds balance ${balance}`);
    }

    // 3) Resolve tenant + dept
    const tn = await db.query(`SELECT tenantname FROM public.tenants WHERE id = $1`, [R.tenant_id]);
    const tenant3 = to3(tn.rows[0]?.tenantname || "");
    // Dept: prefer on request; fall back to user profile
    let deptCode = String(R.sub_tenant_deptcode || "");
    if (!deptCode && uid) {
      const u = await db.query(`SELECT department FROM public.users WHERE id = $1`, [uid]);
      deptCode = u.rows[0]?.department || "";
    }
    const dept3 = to3(deptCode);

    const typeRaw = String(R.request_type || "").trim();
    const isFileId = /^file\s*id\s*request$/i.test(typeRaw);
    const isBinId  = /^bin\s*id\s*request$/i.test(typeRaw);
    const isBinReq = /^bin\s*request$/i.test(typeRaw);

    let prefix, table, col, letter;
    if (isFileId) { table = "rmfilemaster"; col = "fileid"; letter = "F"; }
    else if (isBinId) { table = "rmbinmaster"; col = "bin_qr_id"; letter = "B"; }
    else if (isBinReq) { table = null; } // no IDs generated
    else {
      throw new Error(`Unsupported request type: ${typeRaw}`);
    }

    // 4) Start TX
    await db.query("BEGIN");

    let firstId = null;
    let lastId  = null;

    try {
      if (table) {
        prefix = `${tenant3}-${dept3}-${letter}-`;

        // 4a) find last number for this prefix
        let lastNumber = 0;
        if (table === "rmfilemaster") {
          const q = await db.query(
            `SELECT MAX( ((regexp_match(fileid, '-([0-9]+)$'))[1])::int ) AS last
               FROM public.rmfilemaster
              WHERE tenantid = $1
                AND COALESCE(subtenantdeptcode,'') = $2
                AND fileid LIKE $3`,
            [R.tenant_id, deptCode || "", `${prefix}%`]
          );
          lastNumber = q.rows[0]?.last || 0;
        } else {
          const q = await db.query(
            `SELECT MAX( ((regexp_match(bin_qr_id, '-([0-9]+)$'))[1])::int ) AS last
               FROM public.rmbinmaster
              WHERE tenant_id = $1
                AND COALESCE(sub_tenant_deptcode,'') = $2
                AND bin_qr_id LIKE $3`,
            [R.tenant_id, deptCode || "", `${prefix}%`]
          );
          lastNumber = q.rows[0]?.last || 0;
        }

        const start = lastNumber + 1;
        const end   = start + issueQty - 1;

        // 4b) insert generated IDs, minimal safe set of columns
        for (let n = start; n <= end; n++) {
          const idStr = `${prefix}${n}`;
          if (!firstId) firstId = idStr;
          lastId = idStr;

          if (table === "rmfilemaster") {
            await db.query(
              `INSERT INTO public.rmfilemaster
                 (tenantid, requestid, requesttype, fileid, subtenantdeptcode,
                  filestatus, date_created, created_by, date_modified, modified_by)
               VALUES ($1,$2,$3,$4,$5,'ID Generated',NOW(),$6,NOW(),$6)`,
              [R.tenant_id, requestId, typeRaw, idStr, deptCode || "", uid]
            );
          } else {
            await db.query(
              `INSERT INTO public.rmbinmaster
                 (tenant_id, request_id, request_type, sub_tenant_deptcode,
                  box_status, date_created, created_by, date_modified, modified_by, bin_qr_id)
               VALUES ($1,$2,$3,$4,'ID Generated',NOW(),$5,NOW(),$5,$6)`,
              [R.tenant_id, requestId, typeRaw, deptCode || "", uid, idStr]
            );
          }
        }
      }

      // 4c) update quantities + status (applies to all 3 types)
          const newIssued = Number(R.issued) + Number(issueQty);
          const newStatus =
          newIssued >= Number(R.qty) ? "All ID's generated" : "ID's Partially Generated";

          // Do NOT touch generated column material_quantity_balance
          const updateRes = await db.query(
          `UPDATE public.rm_request
              SET material_quantity_issued = COALESCE(material_quantity_issued,0) + $2,
                  request_status           = $3,
                  modified_by              = $4,
                  date_modified            = NOW()
            WHERE request_id = $1
            RETURNING material_qty, COALESCE(material_quantity_issued,0) AS issued`,
          [requestId, issueQty, newStatus, uid]
          );

          // Optional: compute balance for the response (not written to DB)
          const { material_qty, issued } = updateRes.rows[0] || {};
          const newBalance = Math.max(0, Number(material_qty || 0) - Number(issued || 0));

      await db.query("COMMIT");

      return {
              ok: true,
              message: table
                ? `Generated ${issueQty} ${(isFileId ? "file" : "bin")} IDs: ${firstId} → ${lastId}`
                : `Processed ${issueQty} units (no IDs for 'Bin Request')`,
              requestStatus: newStatus,
              fromId: firstId,
              toId: lastId,
              count: issueQty,
              balance: newBalance,
            };
    } catch (e) {
      await db.query("ROLLBACK");
      throw e;
    }
  },

  // ... keep existing remove below ...


  


  /** Cancel with reason (only when status = 'New') */
  async cancel(id, reason, user) {
    const reqId = Number(id);
    const cancelReason = String(reason || "").trim();
    if (!reqId) throw new Error("Invalid request id");
    if (cancelReason.length < 3) throw new Error("Cancellation reason required (min 3 chars)");

    // 1) must exist and be 'New'
    const { rows } = await db.query(
      `SELECT request_status FROM public.rm_request WHERE request_id = $1`,
      [reqId]
    );
    if (!rows[0]) throw new Error("Request not found");

    const current = String(rows[0].request_status || "").toLowerCase();
    if (current !== "new") {
      return { ok: false, error: "Only 'New' requests can be cancelled" };
    }

    // 2) update status + reason + audit
    const { rows: upd } = await db.query(
      `UPDATE public.rm_request
         SET request_status = 'Cancelled',
             req_cancel_reason = $2,
             modified_by = $3,
             date_modified = NOW()
       WHERE request_id = $1
       RETURNING request_id, request_status, req_cancel_reason, date_modified`,
      [reqId, cancelReason, user?.id ?? null]
    );

    return { ok: true, updated: 1, item: upd[0] };
  },

  /** Delete */
  async remove(id) {
    const { rowCount } = await db.query(`DELETE FROM public.rm_request WHERE request_id = $1`, [id]);
    return { ok: true, deleted: rowCount };
  },
};


function toPositiveInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}


// Create a "Material Request" using the logged-in user's tenant_id
async function createMaterial(body, reqUser) {
  // validate
  const qty = toPositiveInt(body?.quantity ?? body?.materialQty);
  if (!qty) throw new Error("Quantity is required");
  const requestType = String(body?.requestType || "").trim(); // "File ID Request" | "Bin ID Request" | "Bin Request"
  if (!requestType) throw new Error("requestType is required");

  // infer tenant from users.tenant_id
  let tenantId = null;
  if (reqUser?.id) {
    const u = await db.query(`SELECT tenant_id FROM public.users WHERE id = $1`, [reqUser.id]);
    tenantId = u.rows[0]?.tenant_id ?? null;
  }

  const q = `
    INSERT INTO public.rm_request (
      tenant_id, sub_tenant_id,
      request_type, request_category, request_status,
      sub_tenant_deptcode, requestor_id,
      primary_request_id, primary_request_type,
      req_cancel_reason,
      material_qty, audit_date_from, audit_date_to,
      material_quantity_issued, was_delivery_validated,
      delivered_to, is_user_authenticated, user_ip,
      request_close_date, instructions,
      created_by, modified_by, date_created, date_modified
    )
    VALUES (
      $1, NULL,
      $2, 'Material', 'New Material Request',
      NULL, $3,
      NULL, NULL,
      NULL,
      $4, NULL, NULL,
      NULL, NULL,
      NULL, TRUE, NULL,
      NULL, $5,
      $6, $6, NOW(), NOW()
    )
    RETURNING request_id, date_created
  `;

  const params = [
    tenantId,
    requestType,
    reqUser?.id ?? null,
    qty,
    body?.instructions ?? null,
    reqUser?.id ?? null,
  ];

  const { rows } = await db.query(q, params);
  return { ok: true, id: rows[0].request_id, dateCreated: rows[0].date_created };
}

module.exports.createMaterial = createMaterial;


//   /** Cancel with reason (only when status = 'New') */
//   async cancel(id, reason, user) {
//     const reqId = Number(id);
//     const cancelReason = String(reason || "").trim();
//     if (!reqId) throw new Error("Invalid request id");
//     if (!cancelReason || cancelReason.length < 3) {
//       throw new Error("Cancellation reason required (min 3 chars)");
//     }

//     // 1) Must exist and be in 'New'
//     const { rows } = await db.query(
//       `SELECT request_status FROM public.rm_request WHERE request_id = $1`,
//       [reqId]
//     );
//     if (!rows[0]) throw new Error("Request not found");

//     const current = String(rows[0].request_status || "").toLowerCase();
//     if (current !== "new") {
//       return { ok: false, error: "Only 'New' requests can be cancelled" };
//     }

//     // 2) Update status + reason + audit
//     const { rows: upd } = await db.query(
//       `UPDATE public.rm_request
//          SET request_status = 'Cancelled',
//              req_cancel_reason = $2,
//              modified_by = $3,
//              date_modified = NOW()
//        WHERE request_id = $1
//        RETURNING request_id, request_status, req_cancel_reason, date_modified`,
//       [reqId, cancelReason, user?.id ?? null]
//     );

//     return { ok: true, updated: 1, item: upd[0] };
//   },
// module.exports.cancel = cancel;