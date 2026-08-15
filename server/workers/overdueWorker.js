// server/workers/overdueWorker.js
const pool = require('../db');
const { sendEscalationMail } = require('../helpers/escalationMail'); // see below

async function findOverdue(limit = 200) {
  // current_step_due_in_days is in steps; fallback to instance.step_due_in_days if you store it there
  const q = `
    SELECT i.id AS instance_id,
           i.workflow_id,
           i.current_step_id,
           i.tenant_id,
           i.date_assigned,
           i.overdue_triggered_at,
           i.overdue_escalation_level,
           s.step_due_in_days,
           s.mail_content,
           s.mail_notification_users,
           s.mail_notification_subject,
           s.escalation1_enabled, s.escalation1_days, s.escalation1_users, s.escalation1_subject,
           s.escalation2_enabled, s.escalation2_days, s.escalation2_users, s.escalation2_subject,
           s.escalation3_enabled, s.escalation3_days, s.escalation3_users, s.escalation3_subject
      FROM public.simple_workflow_instances i
      JOIN public.simple_workflowbuilder_steps s ON s.id = i.current_step_id
     WHERE i.status = 'pending' -- adjust to your pending status
       AND s.step_due_in_days IS NOT NULL
       AND s.step_due_in_days > 0
       AND i.date_assigned IS NOT NULL
       AND (i.overdue_triggered_at IS NULL OR i.overdue_escalation_level IS NULL OR i.overdue_escalation_level < 3)
       AND now() >= i.date_assigned + (s.step_due_in_days || ' days')::interval
     ORDER BY i.overdue_triggered_at NULLS FIRST, i.id
     LIMIT $1
  `;
  const { rows } = await pool.query(q, [limit]);
  return rows;
}

function pickEscalation(row) {
  const elapsedDays = (Date.now() - new Date(row.date_assigned).getTime()) / (1000 * 60 * 60 * 24);
  const tiers = [1, 2, 3].map((n) => ({
    n,
    enabled: row[`escalation${n}_enabled`],
    days: Number(row[`escalation${n}_days`]),
    users: row[`escalation${n}_users`] || [],
    subject: row[`escalation${n}_subject`] || row.mail_notification_subject || '',
  }));
  // pick highest eligible not yet fired
  for (let i = tiers.length - 1; i >= 0; i -= 1) {
    const t = tiers[i];
    if (!t.enabled) continue;
    if (!Number.isFinite(t.days)) continue;
    if (elapsedDays >= t.days && (row.overdue_escalation_level || 0) < t.n) {
      return t;
    }
  }
  return null;
}

async function processBatch() {
  const rows = await findOverdue();
  for (const row of rows) {
    const tier = pickEscalation(row);
    if (!tier) continue;
    try {
      await sendEscalationMail({ row, tier });
      await pool.query(
        `UPDATE public.simple_workflow_instances
            SET overdue_triggered_at = now(),
                overdue_escalation_level = $2,
                date_modified = now()
          WHERE id = $1`,
        [row.instance_id, tier.n]
      );
    } catch (e) {
      console.error('[overdue] failed', row.instance_id, e.message);
    }
  }
}

function startOverdueWorker(intervalMs = 5 * 60 * 1000) {
  processBatch().catch((e) => console.error('[overdue] first run', e.message));
  return setInterval(() => processBatch().catch((e) => console.error('[overdue] run', e.message)), intervalMs);
}

module.exports = { startOverdueWorker, processBatch };
