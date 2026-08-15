/** Utility helpers kept isolated for reuse */

/** Convert number N => [1..N] */
export const range = (n) => Array.from({ length: n }, (_, i) => i + 1);

/**
 * Build the default set of steps given user count N.
 * Rules:
 *  - Always include Initiate at step_no 0 (type create)
 *  - Then steps 1..X as update (approval/send)
 *  - Always include Terminate at the end (type update but labelled terminate)
 */
export function buildDefaultSteps(count) {
  const n = Number.isFinite(count) && count > 0 ? count : 1; // Step 1..n

  const steps = [];
  // 1) Initiate
  steps.push({
    step_name: "INITIATE",
    step_no: 0,
    step_type: "create",
  });

  // 2) Step 1..n
  range(n).forEach((k, idx) => {
    steps.push({
      step_name: `STEP ${k}`,
      step_no: idx + 1, // after Initiate
      step_type: "update",
    });
  });

  // 3) Terminate
  steps.push({
    step_name: "TERMINATE",
    step_no: steps.length,
    step_type: "update", // stored as update; label terminate in UI
    is_terminate: true,
  });

  // Wire next/prev
  for (let i = 0; i < steps.length; i++) {
    const cur = steps[i];
    const next = steps[i + 1];
    const prev = steps[i - 1];
    cur.next_step_name_after_approve = next ? next.step_name : null; // terminate -> null
    if (cur.step_name === "INITIATE") {
      cur.next_step_name_if_reject = null; // NA
    } else if (cur.is_terminate) {
      cur.next_step_name_if_reject = steps[steps.length - 2]?.step_name || null; // previous
    } else {
      cur.next_step_name_if_reject = prev ? prev.step_name : null;
    }
  }
  return steps;
}

/**
 * Create default form configuration per your spec.
 * - INITIATE: show all fields except id + step_comments, all mandatory
 * - Others: initiator + audit_trail readonly; step_comments visible+mandatory
 * This function expects a column list from the selected workflow table.
 */
export function buildDefaultFormConfig(columns, isInitiate) {
  const IGNORE_FOR_INITIATE = new Set(["id", "step_comments"]);
  const cfg = {};
  (columns || []).forEach((col) => {
    const key = col.name || col.column_name || col; // support different shapes
    if (!key) return;
    if (isInitiate) {
      if (IGNORE_FOR_INITIATE.has(key)) return;
      cfg[key] = {
        data_type: col.data_type || "text",
        input_type: guessInputType(col.data_type),
        options: [],
        date_granularity: "date",
        visible: true,
        data_entry_allowed: true,
        read_only: false,
        mandatory: true,
      };
    } else {
      cfg[key] = {
        data_type: col.data_type || "text",
        input_type: guessInputType(col.data_type),
        options: [],
        date_granularity: "date",
        visible: true,
        data_entry_allowed: !["initiator", "audit_trail"].includes(key),
        read_only: ["initiator", "audit_trail"].includes(key),
        mandatory: key === "step_comments",
      };
    }
  });
  return cfg;
}

export function guessInputType(dt) {
  const t = String(dt || "").toLowerCase();
  if (t.includes("int")) return "integer";
  if (t.includes("json")) return "textarea";
  if (t.includes("date")) return "date";
  return "text";
}
