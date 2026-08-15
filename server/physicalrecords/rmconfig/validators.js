// server/physicalrecords/rmconfig/validators.js
// Central place to validate resources, ids, list params, and whitelist body fields.

"use strict";

/**
 * What resources are allowed and where they live in the DB.
 * name -> { table, key }
 * key can be a string (single PK) or array (composite PK).
 */
const ALLOWED = new Map([
  ["retention-policies",   { table: "public.rm_retention_policy",  key: "id" }],
  ["fileplan-nodes",       { table: "public.rm_fileplan_node",     key: "id" }],
  ["record-events",        { table: "public.rm_record_event",      key: "id" }],
  ["disposition-batches",  { table: "public.rm_disposition_batch", key: "id" }],
  ["disposition-items",    { table: "public.rm_disposition_item",  key: "id" }],
  ["holds",                { table: "public.rm_hold",              key: "id" }],
  ["hold-records",         { table: "public.rm_hold_record",       key: ["hold_id","record_id"] }],
  ["locations",            { table: "public.rm_location",          key: "id" }],
  ["acl",                  { table: "public.rm_acl",               key: "id" }],
  ["audit-log",            { table: "public.rm_audit_log",         key: "id" }],
  ["classifications",      { table: "public.rm_classification",    key: "id" }],
  ["metadata-categories",  { table: "public.rm_metadata_category", key: "id" }], // <-- FIX
  //["metadata-categories",  { table: "public.metadata_categories",  key: "id" }],

]);

exports.resolveResource = (res) => {
  const k = String(res || "").toLowerCase();
  if (!ALLOWED.has(k)) throw new Error("Unknown resource: " + res);
  return { name: k, ...ALLOWED.get(k) };
};

/**
 * Per-resource body whitelists for create/patch.
 * Only these fields will be forwarded to INSERT/UPDATE.
 * (Audit fields like created_by / modified_by are added here in validators.)
 */
const BODY_ALLOW = {
  "retention-policies": {
    create: ["code","name","trigger_event","period_years","period_months","cutoff_on_event","disposition_action","is_default"],
    patch:  ["code","name","trigger_event","period_years","period_months","cutoff_on_event","disposition_action","is_default"],
  },
  "fileplan-nodes": {
    create: ["parent_id","code","title","description","retention_policy_id","order_no","path"],
    patch:  ["parent_id","code","title","description","retention_policy_id","order_no","path"],
  },
  "record-events": {
    create: ["record_id","type","event_ts","user_id","data"],
    patch:  ["record_id","type","event_ts","user_id","data"],
  },
  "disposition-batches": {
    create: ["status","scheduled_date","approved_by","executed_by","notes"],
    patch:  ["status","scheduled_date","approved_by","executed_by","notes"],
  },
  "disposition-items": {
    create: ["batch_id","record_id","proposed_action","eligible_on","decision","decision_by","decision_ts"],
    patch:  ["batch_id","record_id","proposed_action","eligible_on","decision","decision_by","decision_ts"],
  },
  "holds": {
    create: ["title","reason","status","requested_by","date_released"],
    patch:  ["title","reason","status","requested_by","date_released"],
  },
  "hold-records": {
    create: ["hold_id","record_id"],
    patch:  ["hold_id","record_id"],
  },
  "locations": {
    create: ["facility","room","aisle","bay","shelf","bin","barcode","is_active"],
    patch:  ["facility","room","aisle","bay","shelf","bin","barcode","is_active"],
  },
  "acl": {
    create: ["entity_type","entity_id","principal_type","principal_id","permission","grant"],
    patch:  ["entity_type","entity_id","principal_type","principal_id","permission","grant"],
  },
  "audit-log": {
    create: ["actor_user_id","action","entity_type","entity_id","before","after","ip","ts"],
    patch:  ["actor_user_id","action","entity_type","entity_id","before","after","ip","ts"],
  },
  "classifications": {
    create: ["code","label","description","rank","is_default"],
    patch:  ["code","label","description","rank","is_default"],
  },
  // Include fields_json so your custom Metadata Category modal can save its schema
  "metadata-categories": {
    create: ["code","name","description","is_active","fields_json"],
    patch:  ["code","name","description","is_active","fields_json"],
  },
  
};

/**
 * Parse a URL :id param into an object matching the table's PK.
 * Works for single and composite keys.
 *  e.g. "123" -> { id: 123 }
 *       "10,200" (or "10:200" / "10-200") -> { key1:10, key2:200 }
 */
exports.parseKeyParam = (resName, raw) => {
  const { key } = exports.resolveResource(resName);
  if (Array.isArray(key)) {
    const parts = String(raw).split(/[,:-]/).map(s => parseInt(s, 10));
    if (parts.length !== key.length || parts.some(n => !Number.isFinite(n))) return null;
    return Object.fromEntries(key.map((k, i) => [k, parts[i]]));
  }
  const n = Number(raw);
  return Number.isFinite(n) ? { [key]: n } : null;
};

/**
 * List/query params with sane defaults and guards.
 */
exports.parseList = (body = {}) => ({
  text: String(body.text || body.q || ""),
  page: Math.max(1, parseInt(body.page || 1, 10)),
  pageSize: Math.min(200, Math.max(1, parseInt(body.pageSize || 20, 10))),
  sortBy: String(body.sortBy || "date_created"),
  sortDir: String(body.sortDir || "desc").toLowerCase() === "asc" ? "asc" : "desc",
});

/**
 * Simple numeric id parser (legacy callers).
 */
exports.parseId = (id) => {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
};

/**
 * Build a safe body for INSERT (create).
 * - Keeps only whitelisted fields for the resource.
 * - Adds audit columns created_by / modified_by from req.user.
 */
exports.pickCreateBody = (resName, body, user) => {
  const uid = user?.id ?? null;
  const allow = BODY_ALLOW[resName]?.create || [];
  const out = {};
  for (const k of allow) if (body[k] !== undefined) out[k] = body[k];
  out.created_by  = uid;
  out.modified_by = uid;
  return out;
};

/**
 * Build a safe body for UPDATE (patch).
 * - Keeps only whitelisted fields for the resource.
 * - Adds audit column modified_by.
 */
exports.pickPatchBody = (resName, body, user) => {
  const uid = user?.id ?? null;
  const allow = BODY_ALLOW[resName]?.patch || BODY_ALLOW[resName]?.create || [];
  const out = {};
  for (const k of allow) if (body[k] !== undefined) out[k] = body[k];
  out.modified_by = uid;
  return out;
};











// // server/physicalrecords/rmconfig/validators.js
// const ALLOWED = new Map([
//   ["retention-policies",   { table: "public.rm_retention_policy", key: "id" }],
//   ["fileplan-nodes",       { table: "public.rm_fileplan_node",    key: "id" }],
//   ["record-events",        { table: "public.rm_record_event",     key: "id" }],
//   ["disposition-batches",  { table: "public.rm_disposition_batch",key: "id" }],
//   ["disposition-items",    { table: "public.rm_disposition_item", key: "id" }],
//   ["holds",                { table: "public.rm_hold",             key: "id" }],
//   ["hold-records",         { table: "public.rm_hold_record",      key: ["hold_id","record_id"] }],
//   ["locations",            { table: "public.rm_location",         key: "id" }],
//   ["acl",                  { table: "public.rm_acl",              key: "id" }],
//   ["audit-log",            { table: "public.rm_audit_log",        key: "id" }],
//   ["classifications",      { table: "public.rm_classification",   key: "id" }],
//   ["metadata-categories",  { table: "public.metadata_categories", key: "id" }],
// ]);

// exports.resolveResource = (res) => {
//   const k = String(res || "").toLowerCase();
//   if (!ALLOWED.has(k)) throw new Error("Unknown resource: " + res);
//   return { name: k, ...ALLOWED.get(k) };
// };

// // exports.parseKeyParam = (resName, raw) => {
// //   const { key } = exports.resolveResource(resName);
// //   if (Array.isArray(key)) {
// //     const parts = String(raw).split(/[,:-]/).map(s => parseInt(s, 10));
// //     if (parts.length !== key.length || parts.some(n => !Number.isFinite(n))) return null;
// //     return Object.fromEntries(key.map((k, i) => [k, parts[i]]));
// //   }
// //   const n = Number(raw);
// //   return Number.isFinite(n) ? { [key]: n } : null;
// // };

// exports.parseKeyParam = (resName, raw) => {
//   const { key } = exports.resolveResource(resName);  // uses your ALLOWED map
//   if (Array.isArray(key)) {
//     const parts = String(raw).split(/[,:-]/).map(s => parseInt(s, 10));
//     if (parts.length !== key.length || parts.some(n => !Number.isFinite(n))) return null;
//     return Object.fromEntries(key.map((k, i) => [k, parts[i]]));
//   }
//   const n = Number(raw);
//   return Number.isFinite(n) ? { [key]: n } : null;
// };

// exports.parseList = (body = {}) => ({
//   text: String(body.text || ""),
//   page: Math.max(1, parseInt(body.page || 1, 10)),
//   pageSize: Math.min(200, Math.max(1, parseInt(body.pageSize || 20, 10))),
//   sortBy: String(body.sortBy || "date_created"),
//   sortDir: String(body.sortDir || "desc").toLowerCase() === "asc" ? "asc" : "desc",
// });

// exports.parseId = (id) => {
//   const n = Number(id);
//   return Number.isFinite(n) ? n : null;
// };

// exports.pickCreateBody = (resName, body, user) => {
//   const uid = user?.id ?? null;

//   // Whitelist minimal columns per resource (extend as needed)
//   const allow = {
//     "retention-policies": [
//       "code","name","trigger_event","period_years","period_months",
//       "cutoff_on_event","disposition_action","is_default"
//     ],
//     "fileplan-nodes": [
//       "parent_id","code","title","description","retention_policy_id",
//       "order_no","path"
//     ],
//     "record-events": [
//       "record_id","type","event_ts","user_id","data"
//     ],
//     "disposition-batches": [
//       "status","scheduled_date","approved_by","executed_by","notes"
//     ],
//     "disposition-items": [
//       "batch_id","record_id","proposed_action","eligible_on","decision","decision_by","decision_ts"
//     ],
//     "holds": [
//       "title","reason","status","requested_by","date_released"
//     ],
//     "hold-records": [
//       "hold_id","record_id"
//     ],
//     "locations": [
//       "facility","room","aisle","bay","shelf","bin","barcode","is_active"
//     ],
//     "acl": [
//       "entity_type","entity_id","principal_type","principal_id","permission","grant"
//     ],
//     "audit-log": [
//       "actor_user_id","action","entity_type","entity_id","before","after","ip","ts"
//     ],
//     "classifications": [
//       "code","label","description","rank","is_default"
//     ],
//     "metadata-categories": [
//       "code","name","description","is_active"
//     ],
//   }[resName] || [];
  

//   const out = {};
//   allow.forEach(k => { if (body[k] !== undefined) out[k] = body[k]; });
//   // audit columns
//   out.created_by  = uid;
//   out.modified_by = uid;
//   return out;
// };

// exports.pickPatchBody = (resName, body, user) => {
//   const base = exports.pickCreateBody(resName, body, user);
//   delete base.created_by; // only on insert
//   return base;
// };
