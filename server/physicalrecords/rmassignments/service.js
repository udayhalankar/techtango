// server/physicalrecords/rmassignments/service.js
const db = require("../../db");
const notify = require("./notify/service"); // you said notify is under rmassignments/notify
const { appUrl } = require("../../utils/appBaseUrl");



function generateOtp(len = 5) {
  const min = Math.pow(10, len - 1);
  const max = Math.pow(10, len) - 1;
  return String(Math.floor(min + Math.random() * (max - min))); // e.g., 23456
}

function formatPhone(mobile) {
  // expect "91-9999900000" -> "+91 9999900000"
  if (!mobile) return null;
  const [cc, num] = String(mobile).split("-");
  return cc && num ? `+${cc.trim()}${num.trim()}` : mobile; // no space
}

// which task_names should bump rm_request on Accept?

// request status to set immediately when an assignment is created (by task)
const REQUEST_STATUS_ON_ASSIGN = new Map([
  ["refiling pickup", "Refiling_Pickup_Assigned"],
  // optional, if you also want this behavior for inward pickup:
  ["inward pickup",  "File_Inward_Pickup_Assigned"],
]);

// ---- Status rules (single source of truth) ----
// Helper for prettier labels on dynamic statuses (optional)
const toLabel = (s = "") =>
  String(s)
    .trim()
    .split(/\s+/)
    .map(w => (w.toLowerCase() === "id" ? "ID" : w[0]?.toUpperCase() + w.slice(1)))
    .join(" ");

// Canonicalize
const canon = s => String(s || "").trim().toLowerCase();

// Acceptable tasks for dynamic "In-Process"
const ACCEPT_TASKS = new Set([
  "retrieval","audit","insertion","delivery","refiling","refiling files",
  "refiling pickup","file inward pickup","file id delivery","box id delivery",
  "permout delivery","permout destruction","box delivery", "files delivery",
]);

// ---- Unified rules ----
const RULES = {
  // When an assignment is created
  assign: [
    // pickup shortcuts
    { when: (t,s,task) => task === "refiling pickup", to: "Refiling_Pickup_Assigned" },
    { when: (t,s,task) => task === "inward pickup",  to: "File_Inward_Pickup_Assigned" },

    // type + current status driven
    { when: (t,s) => t === "refiling"    && s === "refiling_inward_processed", to: "Refiling_Assigned" },
    { when: (t,s) => t === "file inward" && s === "file_inward_processed",     to: "File_Inward_Activity_Assigned" },
    { when: (t,s) => t === "file inward" && s === "ready_for_file_inward",     to: "File_Inward_Activity_Assigned" },

    // (optional) “progression” rules — keep only if you really need them here
    { when: (t,s) => t === "refiling" && s === "refiling_assigned",   to: "Refiling In-Process" },
    { when: (t,s) => t === "refiling" && s === "refiling_in_process", to: "Refiling Completed" },

    { when: (t,s) => t === "audit" && s === "new", to: "Audit Retrieval Assigned" },


    

    // default
    { when: () => true, to: "Assigned" },
  ],

  // After OTP is verified (Accept)
  accept: [
    {
      when: (t,s,task) => ACCEPT_TASKS.has(task),
      // dynamic status: "<Task> In-Process"
      // Use rawTask to preserve original casing, or toLabel(task) for Title Case
      to: ({ rawTask }) => `${rawTask} In-Process`,
      // alternative: to: ({ task }) => `${toLabel(task)} In-Process`,
    },
    // default: no bump (return null)
  ],

  // When assignment is completed
  complete: [
    // task-name overrides (NB: task is lower-case here)
    { when: (t,s,task) => task === "files delivery",   to: "Request_Closed" },
    { when: (t,s,task) => task === "refiling files",   to: "Request_Closed" },
    { when: (t,s,task) => task === "inward files",   to: "Request_Closed" },

    // type fallbacks (t is lower-case)
    { when: (t) => ["retrieval","audit","insertion","permout delivery","permout destruction"].includes(t), to: "Documents_Retrieved" },
    { when: (t) => t === "refiling",      to: "Refiling_Pickup_Completed" },
    { when: (t) => t === "file inward",   to: "File_Inward_Pickup_Completed" },
    { when: (t) => ["box delivery","box id delivery","file id delivery"].includes(t), to: "Delivery_Completed" },
    { when: (t) => ["file_id","box_id"].includes(t), to: "ID_printed" },

    { when: () => true, to: "Completed" },
  ],
};

// Apply rules for an event ("assign" | "accept" | "complete")
function computeNextStatus(event, { taskName, reqType, reqStatus }) {
  const task = canon(taskName);
  const t = canon(reqType);
  const s = canon(reqStatus);
  const rules = RULES[event] || [];
  const rule = rules.find(r => r.when(t, s, task));
  if (!rule) return null;
  // Support static string OR dynamic function
  return (typeof rule.to === "function")
    ? rule.to({ task, t, s, rawTask: taskName, rawType: reqType, rawStatus: reqStatus })
    : rule.to;
}



async function search({
  text = "",
  requestId,
  taskName,
  assignmentStatus,
  userAssignedTo,
  dateFrom,
  dateTo,
  page = 1,
  pageSize = 10,
  sortBy = "date_assigned",
  sortDir = "desc",
}) {
  const allowedSort = new Set(["date_assigned", "assignment_status", "task_name", "id", "request_id"]);
  if (!allowedSort.has(sortBy)) sortBy = "date_assigned";
  sortDir = String(sortDir).toLowerCase() === "asc" ? "asc" : "desc";

  const where = [];
  const params = [];
  let i = 1;

  if (text) {
  where.push(`(comments ILIKE $${i} OR CAST(assigned_by AS TEXT) ILIKE $${i} OR user_assigned_to_name ILIKE $${i})`);
  params.push(`%${text}%`); i++;
  }
  if (requestId) { where.push(`request_id = $${i}`); params.push(Number(requestId)); i++; }
  if (taskName) { where.push(`task_name = $${i}`); params.push(taskName); i++; }
  if (assignmentStatus) { where.push(`assignment_status = $${i}`); params.push(assignmentStatus); i++; }
  if (userAssignedTo) { where.push(`user_assigned_to = $${i}`); params.push(Number(userAssignedTo)); i++; }
  if (dateFrom) { where.push(`date_assigned >= $${i}`); params.push(dateFrom); i++; }
  if (dateTo) { where.push(`date_assigned < $${i}`); params.push(dateTo); i++; }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countSql = `SELECT COUNT(*)::int AS cnt FROM public.rm_assignments ${whereSql}`;
  const { rows: cntRows } = await db.query(countSql, params);
  const total = cntRows[0]?.cnt || 0;
  const offset = Math.max(0, (page - 1) * pageSize);

  const listSql = `
    SELECT
      id, request_id, task_name, user_assigned_to, user_assigned_to_name,
      otp, assignment_status, date_assigned, assigned_by, comments,
      date_created, date_modified, created_by, modified_by
    FROM public.rm_assignments
    ${whereSql}
    ORDER BY ${sortBy} ${sortDir}
    LIMIT $${i} OFFSET $${i + 1}
  `;
  const { rows } = await db.query(listSql, [...params, pageSize, offset]);
  return { items: rows, page, pageSize, total, hasMore: offset + rows.length < total };
}




async function create(body, reqUser) {
  // 1) Resolve assignee details (for notification + display name)
  let assignee = null;
  if (body.userAssignedTo) {
    const { rows } = await db.query(
      `SELECT id, name, mobile, email FROM public.rmteam WHERE id = $1`,
      [body.userAssignedTo]
    );
    assignee = rows[0] || null;
  }

  // 2) OTP (generate if not provided)
  const otp = body.otp ?? generateOtp(5);

  // 3) Insert assignment (default status 'Assigned'), include audit columns if present
  const q = `
    INSERT INTO public.rm_assignments
      (request_id, task_name, user_assigned_to, user_assigned_to_name,
       otp, assignment_status, assigned_by, comments, created_by, modified_by)
    VALUES ($1,$2,$3,$4,$5,COALESCE($6,'Assigned'),$7,$8,$9,$9)
    RETURNING id, date_assigned
  `;

  // after the INSERT (once you have `id`)

  const p = [
    body.requestId,
    body.taskName,
    body.userAssignedTo ?? null,
    body.userAssignedToName ?? (assignee?.name || null),
    otp,
    body.assignmentStatus,                  // undefined -> COALESCE to 'Assigned'
    reqUser?.id ?? body.assignedBy ?? null, // who assigned
    body.comments ?? null,
    reqUser?.id ?? null,
  ];
  const { rows } = await db.query(q, p);
const id = rows[0].id;

// Read current request type/status so we can compute the correct next status
const reqRow = await db.query(
  `SELECT request_type, request_status
     FROM public.rm_request
    WHERE request_id = $1`,
  [body.requestId]
);
const curType   = reqRow.rows[0]?.request_type  || "";
const curStatus = reqRow.rows[0]?.request_status || "";

// Decide status for this assign action using rules
const nextReqStatus = computeNextStatus("assign", {
  taskName: body.taskName, reqType: curType, reqStatus: curStatus
});

// Bump rm_request (only if we got a status)
if (nextReqStatus) {
  await db.query(
    `UPDATE public.rm_request
       SET request_status = $2, modified_by = $3, date_modified = NOW()
     WHERE request_id = $1`,
    [body.requestId, nextReqStatus, reqUser?.id ?? null]
  );
}


// // const link = `${process.env.APP_BASE_URL}/processrequest?verify=${id}`;
// // const msg = `Task assigned: ${body.taskName} for Request #${body.requestId}.
// OTP: ${otp}
// Enter OTP: ${link}`;
// // await notify.sendSms(prettyPhone, msg);
// // await notify.sendEmail(assignee.email, "Task Assigned", msg, `<p>Task assigned: <b>${body.taskName}</b> for Request #${body.requestId}.</p><p><b>OTP:</b> ${otp}</p><p><a href="${link}">Click here to enter OTP</a></p>`);


  // 4) Notify assignee (best-effort)
try {
  const link = appUrl(`/verify-otp?assignment=${id}`); // new standalone page
  const text =
`Task assigned: ${body.taskName} for Request #${body.requestId}.
OTP: ${otp}
Enter OTP: ${link}`;

  const html =
    `<p>Task assigned: <b>${body.taskName}</b> for Request #${body.requestId}.</p>
     <p><b>OTP:</b> ${otp}</p>
     <p><a href="${link}">Click here to enter OTP</a></p>`;

  const prettyPhone = assignee?.mobile ? formatPhone(assignee.mobile) : null;

  // Try both, but don't let one failure kill the other
  const jobs = [];

  if (assignee?.email) {
    jobs.push(
      notify.sendEmail(assignee.email, "Task Assigned", text, html)
            .catch(e => console.error("[notify] email failed:", e))
    );
  }

  if (prettyPhone) {
    jobs.push(
      notify.sendSms(prettyPhone, text)
            .catch(e => console.error("[notify] sms failed:", e))
    );
  }

  // Run in parallel, ignore individual failures
  await Promise.allSettled(jobs);

} catch (e) {
  // This catch is just a final safety net; it should almost never run now
  console.error("[notify] unexpected error:", e);
}

 
  return { ok: true, id, dateAssigned: rows[0].date_assigned };
}

async function getById(id) {
  const { rows } = await db.query(`SELECT * FROM public.rm_assignments WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function patch(id, body) {
  const sets = [];
  const params = [];
  let i = 1;

  

  const map = {
    task_name: body.taskName,
    user_assigned_to: body.userAssignedTo,
    user_assigned_to_name: body.userAssignedToName,
    otp: body.otp,
    assignment_status: body.assignmentStatus,
    assigned_by: body.assignedBy,
    comments: body.comments,
    modified_by: body.modifiedBy,
  };
  Object.entries(map).forEach(([col, val]) => {
    if (val !== undefined) { sets.push(`${col} = $${i++}`); params.push(val); }
  });
  if (!sets.length) return { ok: true, updated: 0 };

  const sql = `UPDATE public.rm_assignments SET ${sets.join(", ")}, date_modified = NOW() WHERE id = $${i}`;
  params.push(id);
  const { rowCount } = await db.query(sql, params);
  return { ok: true, updated: rowCount };
}


async function updateStatus(id, assignmentStatus) {
  const { rowCount } = await db.query(
    `UPDATE public.rm_assignments SET assignment_status = $1, date_modified = NOW() WHERE id = $2`,
    [assignmentStatus, id]
  );
  return { ok: true, updated: rowCount };
}


async function verifyOtp(id, code, req) {
  // pull otp + request info
  const { rows } = await db.query(
    `SELECT id, request_id, task_name, otp, assignment_status
       FROM public.rm_assignments
      WHERE id = $1`,
    [id]
  );
  const row = rows[0];
  if (!row) throw new Error("Assignment not found");

  const ok = String(row.otp) === String(code);

  // audit attempt (always)
  await db.query(
    `INSERT INTO public.rm_assignment_otp_audit
       (assignment_id, attempted_otp, success, source, user_id, user_ip)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, String(code), ok, "api", req?.user?.id ?? null, req?.ip ?? null]
  );

  if (!ok) return { ok: false, error: "Invalid OTP" };

  // Compute the request status bump (single source of truth via RULES.accept)
  const bumpStatus = computeNextStatus("accept", {
    taskName: row.task_name,
    reqType: null,
    reqStatus: null,
  });

  // Apply updates atomically
  try {
    await db.query("BEGIN");

    await db.query(
      `UPDATE public.rm_assignments
         SET assignment_status = 'Accepted',
             modified_by = $2,
             date_modified = NOW()
       WHERE id = $1`,
      [id, req?.user?.id ?? null]
    );

    if (bumpStatus) {
      await db.query(
        `UPDATE public.rm_request
            SET request_status = $2,
                modified_by   = $3,
                date_modified = NOW()
          WHERE request_id = $1`,
        [row.request_id, bumpStatus, req?.user?.id ?? null]
      );
    }

    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }

  return {
    ok: true,
    updated: 1,
    requestId: row.request_id,
    // expose what we actually set (undefined if no bump applied)
    requestStatus: bumpStatus || undefined,
  };
}






async function remove(id) {
  const { rowCount } = await db.query(`DELETE FROM public.rm_assignments WHERE id = $1`, [id]);
  return { ok: true, deleted: rowCount };
}

async function complete(id, reqUser) {
  const a = await db.query(
    `SELECT id, request_id, task_name
       FROM public.rm_assignments
      WHERE id=$1`,
    [id]
  );
  if (!a.rows[0]) throw new Error("Assignment not found");
  const requestId = a.rows[0].request_id;
  const taskName  = a.rows[0].task_name;

  const r = await db.query(
    `SELECT request_type FROM public.rm_request WHERE request_id=$1`,
    [requestId]
  );
  if (!r.rows[0]) throw new Error("Request not found for assignment");

  // 🔁 Single source of truth:
  const newReqStatus =
    computeNextStatus("complete", {
      taskName,
      reqType: r.rows[0].request_type,
      reqStatus: null
    }) || "Completed"; // optional final fallback

  try {
    await db.query("BEGIN");
    await db.query(
      `UPDATE public.rm_assignments
         SET assignment_status='Completed', modified_by=$2, date_modified=NOW()
       WHERE id=$1`,
      [id, reqUser?.id ?? null]
    );
    await db.query(
      `UPDATE public.rm_request
         SET request_status=$2, modified_by=$3, date_modified=NOW()
       WHERE request_id=$1`,
      [requestId, newReqStatus, reqUser?.id ?? null]
    );
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }

  return { ok: true, updated: 1, requestId, requestStatus: newReqStatus };
}



module.exports = {
  search,
  create,
  getById,
  patch,
  updateStatus,
  verifyOtp,
  complete,
  remove,
};
