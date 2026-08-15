const db = require("../../db");


function isRefilingType(reqTypeRaw) {
  const t = String(reqTypeRaw || "").toLowerCase();
  return t === "refiling" || t === "file refiling request";
}

function isFileInwardType(reqTypeRaw) {
  const t = String(reqTypeRaw || "").toLowerCase();
  return t === "file inward" || t === "inward files" || t === "file inward request";
}


// --- fix file status target ---
function targetFileStatus(reqTypeRaw) {
  const t = String(reqTypeRaw || "").toLowerCase();
  // Refiling and File Inward both put the file back IN
  if (t === "file refiling request" || t === "refiling" || t === "file inward" || t === "inward files") {
    return "IN";
  }
  // Retrieval / Audit / Insertion / Permout* etc. keep files OUT
  return "OUT";
}

// keep the helper name but fix the value to match your validators ("In-process")
function nextRequestStatus(total, processedNow, totalProcessedAfter) {
  return totalProcessedAfter >= total ? "Ready_for_Delivery" : "In-process";
}

exports.getInfo = async function getInfo(requestId) {
  // basic request row
  const rq = await db.query(
    `SELECT request_id, request_type, sub_tenant_deptcode, request_status, requestor_id
       FROM public.rm_request
      WHERE request_id = $1`,
    [requestId]
  );
  if (!rq.rows[0]) throw new Error("Request not found");
  const r = rq.rows[0];

  // derive tenant/subdept from any file of this request
  const fx = await db.query(
    `SELECT tenantid, subtenantdeptcode, binid
       FROM public.rmfilemaster
      WHERE requestid = $1
      LIMIT 1`,
    [requestId]
  );
  const tenantId = fx.rows[0]?.tenantid ?? null;
  const subDept = r.sub_tenant_deptcode ?? fx.rows[0]?.subtenantdeptcode ?? null;

  // tenant name (best-effort)
  let tenantName = tenantId == null ? "" : String(tenantId);
  if (tenantId != null) {
    const tn = await db.query(
      `SELECT tenantname AS name FROM public.tenants WHERE id = $1`,
      [tenantId]
    );
    tenantName = tn.rows[0]?.name || String(tenantId);
  }

  // pending = files for this request NOT already at target status
  const tgt = targetFileStatus(r.request_type);
  const pending = await db.query(
    `SELECT COUNT(*)::int AS cnt
       FROM public.rmfilemaster
      WHERE requestid = $1
        AND COALESCE(filestatus,'') <> $2`,
    [requestId, tgt]
  );

  return {
    requestId: r.request_id,           // <-- fix
    requestType: r.request_type,
    tenantName,
    subDept,
    pendingCount: pending.rows[0]?.cnt ?? 0,
  };
};



exports.validateBox = async function validateBox(requestId, boxBarcode) {
  if (!boxBarcode) return { ok: false, error: "Box barcode required" };
  const q = await db.query(
    `SELECT binid
       FROM public.rmfilemaster
      WHERE requestid = $1 AND (binid = $2)
      LIMIT 1`,
    [requestId, boxBarcode]
  );
  if (!q.rows[0]) return { ok: false, error: "Box not part of this request" };
  return { ok: true, canonical: q.rows[0].binid };
};

exports.validateFile = async function validateFile(requestId, fileBarcode, boxBarcode) {
  if (!fileBarcode) return { ok: false, error: "File barcode required" };

  // require file to belong to this request (and optionally to the active box)
  const whereBox = boxBarcode ? ` AND (binid = $3 OR binid = $3)` : "";
  const params = boxBarcode ? [requestId, fileBarcode, boxBarcode] : [requestId, fileBarcode];

  const q = await db.query(
    `SELECT fileid, COALESCE(binid,'') AS binid, COALESCE(deptfileid, fileid)::text AS label,
            COALESCE(filestatus,'') AS status
       FROM public.rmfilemaster
      WHERE requestid = $1
        AND (fileid = $2 OR deptfileid = $2)
      ${whereBox}
      LIMIT 1`,
    params
  );
  if (!q.rows[0]) return { ok: false, error: "File not part of this request (or wrong box)" };
  return { ok: true, file: { fileId: q.rows[0].fileid, boxId: q.rows[0].binid, label: q.rows[0].label } };
};

exports.processFiles = async function processFiles(requestId, fileIds, user) {
  if (!Array.isArray(fileIds) || !fileIds.length) {
    return { ok: false, error: "No files provided" };
  }

  const rq = await db.query(
    `SELECT request_type FROM public.rm_request WHERE request_id=$1`,
    [requestId]
  );
  if (!rq.rows[0]) throw new Error("Request not found");

  const reqType = rq.rows[0].request_type;
  const tgt = targetFileStatus(reqType); // IN for File Inward/Refiling, else OUT

  try {
    await db.query("BEGIN");

    // total files in request
    const totalQ = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM public.rmfilemaster WHERE requestid = $1`,
      [requestId]
    );
    const total = totalQ.rows[0]?.cnt || 0;

    // mark selected files
    const upd = await db.query(
      `UPDATE public.rmfilemaster
          SET filestatus = $2, date_modified = NOW()
        WHERE requestid = $1
          AND fileid = ANY($3::text[])`,
      [requestId, tgt, fileIds]
    );
    const processed = upd.rowCount || 0;

    // how many now at target
    const atTgt = await db.query(
      `SELECT COUNT(*)::int AS cnt
         FROM public.rmfilemaster
        WHERE requestid = $1
          AND COALESCE(filestatus,'') = $2`,
      [requestId, tgt]
    );
    const totalProcessedAfter = atTgt.rows[0]?.cnt || 0;

    // ---- Request status rules ----
    let newReqStatus;
    if (isRefilingType(reqType)) {
      newReqStatus = "Refiling_Inward_Processed";
    } else if (isFileInwardType(reqType)) {
      // File Inward gets its own "ready" status
      newReqStatus =
        totalProcessedAfter >= total ? "Ready_for_File_Inward" : "In-process";
    } else {
      // Retrieval/Audit/Insertion/Permout* → existing behavior
      newReqStatus =
        totalProcessedAfter >= total ? "Ready_for_Delivery" : "In-process";
    }

    await db.query(
      `UPDATE public.rm_request
          SET request_status = $2, modified_by = $3, date_modified = NOW()
        WHERE request_id = $1`,
      [requestId, newReqStatus, user?.id ?? null]
    );

    await db.query("COMMIT");
    return {
      ok: true,
      processed,
      requestStatus: newReqStatus,
      deliveryRequestId: null, // you disabled auto child creation
    };
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
};

