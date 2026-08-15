// server/rules/SimpleWorkflowRules.js
// Centralized workflow rules/helpers to keep routing logic consistent.

// ---------------------------------------------------------------------------
// Core utilities
// ---------------------------------------------------------------------------

function coerceNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function deriveUiActions(cfg) {
  const actionRaw = cfg?.step_action;
  if (actionRaw === undefined || actionRaw === null || String(actionRaw).trim() === '') {
    throw new Error('step_action is required and must be send or approve');
  }
  const action = String(actionRaw).trim().toLowerCase();
  if (!action || (action !== 'send' && action !== 'approve')) {
    throw new Error('step_action is required and must be send or approve');
  }
  const isSend = action === 'send';
  const approveLabelRaw = cfg?.approve_button_name;
  if (approveLabelRaw === undefined || approveLabelRaw === null) {
    throw new Error('approve_button_name is required');
  }
  const approveLabel = String(approveLabelRaw).trim();
  if (isSend) {
    if (approveLabel !== 'Send') {
      throw new Error('approve_button_name must be "Send" for send action');
    }
    if (cfg?.reject_button_name !== null) {
      throw new Error('reject_button_name must be null for send action');
    }
  } else {
    if (!approveLabel) {
      throw new Error('approve_button_name is required for approve action');
    }
    if (
      cfg?.reject_button_name === undefined ||
      cfg?.reject_button_name === null ||
      String(cfg.reject_button_name).trim() === ''
    ) {
      throw new Error('reject_button_name is required for approve action');
    }
  }
  const rejectLabel = isSend ? null : String(cfg.reject_button_name).trim();
  return {
    step_action: action,
    show_primary: true,
    show_review: !!cfg?.review_allowed && !isSend,
    show_reject: !isSend,
    primary_label: approveLabel,
    reject_label: rejectLabel,
  };
}

function normalizeAttachmentMode(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const v = String(raw).trim().toLowerCase();
  return ['view_upload', 'none', 'view_only', 'upload_only'].includes(v) ? v : null;
}

function deriveAttachmentAccess(raw) {
  const m = normalizeAttachmentMode(raw);
  if (!m) {
    throw new Error('attachments_allowed is required and must be one of: view_upload, view_only, upload_only, none');
  }
  if (m === 'view_upload') return { can_view: true, can_upload: true };
  if (m === 'view_only') return { can_view: true, can_upload: false };
  if (m === 'upload_only') return { can_view: false, can_upload: true };
  if (m === 'none') return { can_view: false, can_upload: false };
  throw new Error('attachments_allowed is invalid');
}

function validateStepConfig(step) {
  if (step?.step_name === undefined || step?.step_name === null) {
    return 'step_name is required';
  }
  const stepName = String(step.step_name).trim().toLowerCase();
  if (!stepName) {
    return 'step_name is required';
  }
  const actionRaw = step?.step_action;
  const isTerminate = stepName === 'terminate';
  if (isTerminate) {
    if (step.next_step_after_approve !== null || step.next_step_after_reject !== null) {
      return 'next_step_after_approve and next_step_after_reject must be null for terminate step';
    }
    if (step.approve_button_name !== null) {
      return 'approve_button_name must be null for terminate step';
    }
    if (step.reject_button_name !== null) {
      return 'reject_button_name must be null for terminate step';
    }
    return null;
  }
  const action = String(actionRaw).trim().toLowerCase();
  if (!action || (action !== 'send' && action !== 'approve')) {
    return 'step_action is required and must be send or approve';
  }
  if (step.next_step_after_approve === undefined || step.next_step_after_approve === null || step.next_step_after_approve === '') {
    return 'next_step_after_approve is required for send/approve action';
  }
  if (!Number.isFinite(coerceNumber(step.next_step_after_approve))) {
    return 'next_step_after_approve must be numeric';
  }
  if (action === 'approve') {
    if (step.next_step_after_reject === undefined || step.next_step_after_reject === null || step.next_step_after_reject === '') {
      return 'next_step_after_reject is required for approve action';
    }
    if (!Number.isFinite(coerceNumber(step.next_step_after_reject))) {
      return 'next_step_after_reject must be numeric for approve action';
    }
    if (step.reject_button_name === undefined || step.reject_button_name === null || String(step.reject_button_name).trim() === '') {
      return 'reject_button_name is required for approve action';
    }
    if (step.approve_button_name === undefined || step.approve_button_name === null || String(step.approve_button_name).trim() === '') {
      return 'approve_button_name is required for approve action';
    }
  }
  if (action === 'send') {
    if (step.approve_button_name === undefined || step.approve_button_name === null || String(step.approve_button_name).trim() !== 'Send') {
      return 'approve_button_name must be "Send" for send action';
    }
    if (step.next_step_after_reject !== null) {
      return 'next_step_after_reject must be null for send action';
    }
    if (step.reject_button_name !== null) {
      return 'reject_button_name must be null for send action';
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Bulk create validation (strict; no fallbacks)
// ---------------------------------------------------------------------------
function validateBulkCreateStep(step) {
  if (step?.step_name === undefined || step?.step_name === null) {
    return { error: 'step_name is required' };
  }
  const step_name = String(step.step_name).trim();
  if (!step_name) {
    return { error: 'step_name is required' };
  }

  const rawStepNo = coerceNumber(step?.step_no);
  if (!Number.isFinite(rawStepNo) || rawStepNo < 0) {
    return { error: 'step_no is required and must be >= 0' };
  }
  const step_no = rawStepNo; // already 0-based
  const isTerminateName = step_name.toLowerCase() === 'terminate';
  const step_type = step_no === 0 ? 'create' : 'update';


  const stepNameLower = step_name.toLowerCase();
  if (stepNameLower === 'initiate' && step_no !== 0) {
    return { error: 'initiate step_no must be 0' };
  }
  if (step_no === 0 && stepNameLower !== 'initiate') {
    return { error: 'step_no 0 must be INITIATE' };
  }

  const bulkRules = applyBulkCreateRules({ step_name, step_no });
  const isTerminate = bulkRules.isTerminate;
  const isInitiate = bulkRules.isInitiate;
  const step_action = bulkRules.step_action;
  if (step?.step_action === undefined) {
    return { error: 'step_action is required for bulk create' };
  }
  if (isTerminate) {
    if (step.step_action !== null) {
      return { error: 'step_action must be null for bulk create terminate step' };
    }
  } else if (String(step.step_action).trim().toLowerCase() !== step_action) {
    return { error: 'step_action must be send for bulk create' };
  }

  if (step?.step_performer !== undefined && step?.step_performer !== null) {
    if (!Number.isFinite(Number(step.step_performer))) {
      return { error: 'step_performer must be numeric or null' };
    }
  }
  const step_performer =
    step?.step_performer === undefined || step?.step_performer === null
      ? null
      : Number(step.step_performer);

  if (step?.attachments_allowed === undefined || step?.attachments_allowed === null) {
    return { error: 'attachments_allowed is required for bulk create' };
  }
  if (String(step.attachments_allowed).toLowerCase() !== bulkRules.attachments_allowed) {
    return { error: 'attachments_allowed must be view_upload for bulk create' };
  }
  const attachments_allowed = bulkRules.attachments_allowed;

  if (step?.review_allowed === undefined || step?.review_allowed === null) {
    return { error: 'review_allowed is required for bulk create' };
  }
  if (!!step.review_allowed !== bulkRules.review_allowed) {
    return { error: 'review_allowed must be true for bulk create (non-terminate)' };
  }
  const review_allowed = bulkRules.review_allowed;

  const expectedNextApprove = isTerminate ? null : step_no + 1;
  if (step?.next_step_after_approve === undefined) {
    return { error: 'next_step_after_approve is required for bulk create' };
  }
  if (
    (expectedNextApprove === null && step.next_step_after_approve !== null) ||
    (expectedNextApprove !== null && Number(step.next_step_after_approve) !== expectedNextApprove)
  ) {
    return { error: 'next_step_after_approve must match sequential step_no for bulk create' };
  }
  const next_step_after_approve = expectedNextApprove;

  if (step?.next_step_after_reject === undefined || step.next_step_after_reject !== null) {
    return { error: 'next_step_after_reject must be null for bulk create' };
  }
  const next_step_after_reject = null;

  if (step?.approve_button_name === undefined) {
    return { error: 'approve_button_name is required for bulk create' };
  }
  if (isTerminate) {
    if (step.approve_button_name !== null) {
      return { error: 'approve_button_name must be null for bulk create terminate step' };
    }
  } else if (step.approve_button_name !== bulkRules.approve_button_name) {
    return { error: 'approve_button_name must be Send for bulk create' };
  }
  if (step?.reject_button_name === undefined || step.reject_button_name !== null) {
    return { error: 'reject_button_name must be null for bulk create' };
  }
  const approve_button_name = bulkRules.approve_button_name;
  const reject_button_name = bulkRules.reject_button_name;

  const stepValidation = validateStepConfig({
    step_name,
    step_action,
    approve_button_name,
    reject_button_name,
    next_step_after_approve,
    next_step_after_reject,
  });
  if (stepValidation) {
    return { error: stepValidation };
  }

  if (!Array.isArray(step?.mail_notification_users)) {
    return { error: 'mail_notification_users must be an array' };
  }
  const mail_notification_users = JSON.stringify(step.mail_notification_users);

  if (step?.mail_content == null || typeof step.mail_content !== 'object') {
    return { error: 'mail_content is required and must be an object' };
  }

  if (step?.step_form_configuration == null || typeof step.step_form_configuration !== 'object') {
    return { error: 'step_form_configuration is required and must be an object' };
  }
  if (step?.version_info == null || typeof step.version_info !== 'object') {
    return { error: 'version_info is required and must be an object' };
  }
  if (!Number.isFinite(Number(step?.step_due_in_days))) {
    return { error: 'step_due_in_days is required and must be numeric' };
  }

  return {
    value: {
      step_type,
      step_name,
      step_no,
      step_action,
      step_performer,
      attachments_allowed,
      review_allowed,
      next_step_after_approve,
      next_step_after_reject,
      approve_button_name,
      reject_button_name,
      mail_notification_users,
      mail_content: step.mail_content,
      step_form_configuration: JSON.stringify(step.step_form_configuration),
      version_info: JSON.stringify(step.version_info),
      step_due_in_days: Number(step.step_due_in_days),
      isTerminate,
      isInitiate,
    },
  };
}

function validateBulkCreateSequence(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return 'steps are required for bulk create';
  }

  const nums = [];
  const seen = new Set();
  for (const s of steps) {
    const n = coerceNumber(s?.step_no);
    if (!Number.isInteger(n) || n < 0) {
      return 'step_no must be an integer >= 0 for bulk create';
    }
    if (seen.has(n)) {
      return 'step_no must be unique for bulk create';
    }
    seen.add(n);
    nums.push(n);
  }

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min !== 0) {
    return 'step_no must start at 0 for bulk create';
  }
  if (max !== steps.length - 1) {
    return 'step_no must be sequential with no gaps for bulk create';
  }

  const initStep = steps.find((s) => Number(s.step_no) === 0);
  if (!initStep || String(initStep.step_name || '').trim().toLowerCase() !== 'initiate') {
    return 'step_no 0 must be INITIATE for bulk create';
  }

  const termStep = steps.find((s) => Number(s.step_no) === max);
  if (!termStep || String(termStep.step_name || '').trim().toLowerCase() !== 'terminate') {
    return 'last step must be TERMINATE for bulk create';
  }

  const strayInit = steps.find(
    (s) => String(s.step_name || '').trim().toLowerCase() === 'initiate' && Number(s.step_no) !== 0
  );
  if (strayInit) {
    return 'INITIATE must only be step_no 0 for bulk create';
  }

  const strayTerm = steps.find(
    (s) => String(s.step_name || '').trim().toLowerCase() === 'terminate' && Number(s.step_no) !== max
  );
  if (strayTerm) {
    return 'TERMINATE must be the last step for bulk create';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Bulk create rules (no fallbacks)
// ---------------------------------------------------------------------------
function applyBulkCreateRules(step) {
  if (step?.step_name === undefined || step?.step_name === null) {
    throw new Error('step_name is required for bulk create rules');
  }
  const stepName = String(step.step_name).trim().toLowerCase();
  if (!stepName) {
    throw new Error('step_name is required for bulk create rules');
  }
  const stepNo = coerceNumber(step?.step_no);
  if (!Number.isFinite(stepNo)) {
    throw new Error('step_no is required for bulk create rules');
  }
  const isTerminate = stepName === 'terminate';
  const isInitiate = stepName === 'initiate' || stepNo === 0;

  if (isTerminate) {
    return {
      step_action: null,
      attachments_allowed: 'view_upload',
      review_allowed: false,
      approve_button_name: null,
      reject_button_name: null,
      isTerminate,
      isInitiate,
    };
  }

  return {
    step_action: 'send',
    attachments_allowed: 'view_upload',
    review_allowed: true,
    approve_button_name: 'Send',
    reject_button_name: null,
    isTerminate,
    isInitiate,
  };
}

// ---------------------------------------------------------------------------
// Routeinfo normalization rules (no fallbacks)
// ---------------------------------------------------------------------------
function normalizeRouteinfo(routeinfoRaw, initiatorId = null) {
  if (!Array.isArray(routeinfoRaw)) {
    throw new Error('routeinfo must be an array');
  }
  const routeinfo = routeinfoRaw;

  let changed = false;
  const normalized = routeinfo.map((r) => {
    const out = { ...r };
    if (out.step_name === undefined || out.step_name === null) {
      throw new Error('step_name is required in routeinfo');
    }
    const stepName = String(out.step_name).trim().toLowerCase();
    if (!stepName) {
      throw new Error('step_name is required in routeinfo');
    }
    const isTerminate = stepName === 'terminate';
    const rawPerformer = coerceNumber(out.step_performer);
    if (rawPerformer === null || rawPerformer === 0) {
      const initId = Number(initiatorId);
      if (!Number.isFinite(initId) || initId <= 0) {
        throw new Error('initiatorId is required to resolve Initiator step_performer');
      }
      out.step_performer = initId;
      changed = true;
    } else if (rawPerformer !== out.step_performer) {
      out.step_performer = rawPerformer;
      changed = true;
    }

    const stepValidation = validateStepConfig(out);
    if (stepValidation) {
      throw new Error(stepValidation);
    }

    if (out.next_step_after_approve === '') {
      throw new Error('next_step_after_approve must be a number or null');
    }
    if (out.next_step_after_reject === '') {
      throw new Error('next_step_after_reject must be a number or null');
    }
    const nextApprove = coerceNumber(out.next_step_after_approve);
    const nextReject = coerceNumber(out.next_step_after_reject);
    if (
      out.next_step_after_approve !== null &&
      out.next_step_after_approve !== undefined &&
      nextApprove === null
    ) {
      throw new Error('next_step_after_approve must be numeric or null');
    }
    if (
      out.next_step_after_reject !== null &&
      out.next_step_after_reject !== undefined &&
      nextReject === null
    ) {
      throw new Error('next_step_after_reject must be numeric or null');
    }
    if (nextApprove !== out.next_step_after_approve) {
      out.next_step_after_approve = nextApprove;
      changed = true;
    }
    if (nextReject !== out.next_step_after_reject) {
      out.next_step_after_reject = nextReject;
      changed = true;
    }

    const attachmentAccess = deriveAttachmentAccess(out.attachments_allowed);
    if (JSON.stringify(out.attachment_access) !== JSON.stringify(attachmentAccess)) {
      out.attachment_access = attachmentAccess;
      changed = true;
    }

    if (isTerminate) {
      if (out.ui_actions !== null && out.ui_actions !== undefined) {
        out.ui_actions = null;
        changed = true;
      }
    } else {
      const ui = deriveUiActions(out);
      if (JSON.stringify(out.ui_actions) !== JSON.stringify(ui)) {
        out.ui_actions = ui;
        changed = true;
      }
    }
    return out;
  });

  return { normalized, changed };
}

// ---------------------------------------------------------------------------
// Routeinfo creation rules (no fallbacks)
// ---------------------------------------------------------------------------
function buildRouteinfo(allSteps, formviewMap, initiatorId = null) {
  return allSteps.map((s) => {
    if (s.step_name === undefined || s.step_name === null || String(s.step_name).trim() === '') {
      throw new Error('step_name is required for routeinfo');
    }
    const stepNo = coerceNumber(s.step_no);
    if (!Number.isFinite(stepNo)) {
      throw new Error('step_no is required for routeinfo');
    }
    const rawPerformer = coerceNumber(s.step_performer);
    let stepPerformer = rawPerformer;
    if (stepPerformer === null || stepPerformer === 0) {
      const initId = Number(initiatorId);
      if (!Number.isFinite(initId) || initId <= 0) {
        throw new Error('initiatorId is required to resolve Initiator step_performer');
      }
      stepPerformer = initId;
    }
    const nextApprove = coerceNumber(s.next_step_after_approve);
    const nextReject = coerceNumber(s.next_step_after_reject);
    const stepName = String(s.step_name).trim().toLowerCase();
    const isTerminate = stepName === 'terminate';
    const stepActionRaw = s.step_action;
    if (isTerminate) {
      if (stepActionRaw !== null) {
        throw new Error('terminate step must not define step_action');
      }
      if (s.next_step_after_approve !== null || s.next_step_after_reject !== null) {
        throw new Error('terminate step must not define next_step_after_approve/next_step_after_reject');
      }
    }
    const stepAction = String(stepActionRaw).trim().toLowerCase();
    if (isTerminate) {
      // handled above
    } else if (!stepAction || (stepAction !== 'send' && stepAction !== 'approve')) {
      throw new Error('step_action is required and must be send or approve');
    }
    if (!isTerminate && (s.next_step_after_approve === undefined || s.next_step_after_approve === null || nextApprove === null)) {
      throw new Error('next_step_after_approve is required for routeinfo');
    }
    if (stepAction === 'approve' && (s.next_step_after_reject === undefined || s.next_step_after_reject === null || nextReject === null)) {
      throw new Error('next_step_after_reject is required for approve action');
    }
    if (stepAction === 'send' && s.next_step_after_reject !== null) {
      throw new Error('next_step_after_reject must be null for send action');
    }
    const stepValidation = validateStepConfig({
      step_name: s.step_name,
      step_action: stepActionRaw,
      approve_button_name: s.approve_button_name,
      reject_button_name: s.reject_button_name,
      next_step_after_approve: s.next_step_after_approve,
      next_step_after_reject: s.next_step_after_reject,
    });
    if (stepValidation) {
      throw new Error(stepValidation);
    }
    return {
      step_no: stepNo,
      step_name: s.step_name,
      step_type: s.step_type,
      step_action: stepAction,
      step_performer: stepPerformer,
      attachments_allowed: s.attachments_allowed,
      attachment_access: deriveAttachmentAccess(s.attachments_allowed),
      review_allowed: s.review_allowed,
      next_step_after_approve: nextApprove,
      next_step_after_reject: nextReject,
      approve_button_name: s.approve_button_name,
      reject_button_name: s.reject_button_name,
      mail_notification_users: s.mail_notification_users,
      mail_content: s.mail_content,
      step_form_configuration: s.step_form_configuration,
      tenant_id: s.tenant_id,
      version_info: s.version_info,
      step_due_in_days: s.step_due_in_days,
      view_key: formviewMap.get(Number(s.step_no))?.view_key,
      layout_def: formviewMap.get(Number(s.step_no))?.layout_def,
      ui_actions: isTerminate
        ? null
        : deriveUiActions({
            step_action: stepAction,
            review_allowed: s.review_allowed,
            approve_button_name: s.approve_button_name,
            reject_button_name: s.reject_button_name,
          }),
    };
  });
}

function findCfg(routeinfo, stepNo) {
  if (!Array.isArray(routeinfo) || !routeinfo.length) return null;
  if (!Number.isFinite(stepNo)) return null;
  return routeinfo.find((r) => Number(r.step_no) === Number(stepNo)) || null;
}

function validatePatchPayload(body) {
  if (body.routeinfo !== undefined && body.routeinfo !== null) {
    return 'routeinfo updates are not allowed';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Instance transition (PATCH) rules
// ---------------------------------------------------------------------------
function applyPatchRules({
  body,
  routeinfo,
  currentStepNo,
  initiatorId,
  action,
  userId,
}) {
  const out = { ...body };
  const targetStepNo =
    out.step_no !== undefined && out.step_no !== null && out.step_no !== ''
      ? Number(out.step_no)
      : null;

  const targetCfg = findCfg(routeinfo, targetStepNo);
  const currentCfg = findCfg(routeinfo, currentStepNo);

  if (Number.isFinite(targetStepNo) && !targetCfg) {
    return { error: `routeinfo not found for step_no ${targetStepNo}` };
  }
  if (!Number.isFinite(targetStepNo)) {
    return { error: 'step_no is required' };
  }

  if (targetCfg) {
    if (out.step_name === undefined) {
      return { error: 'step_name is required' };
    }
    if (out.step_performer === undefined) {
      return { error: 'step_performer is required' };
    }
    if (out.next_step_after_approve === undefined) {
      return { error: 'next_step_after_approve is required' };
    }
    if (out.next_step_after_reject === undefined) {
      return { error: 'next_step_after_reject is required' };
    }
  }

  if (action === 'approve' || action === 'reject') {
    if (!Number.isFinite(targetStepNo)) {
      return { error: 'step_no is required for approve/reject' };
    }
    if (!currentCfg) {
      return { error: `routeinfo not found for step_no ${currentStepNo}` };
    }
    if (action === 'approve') {
      const expected = currentCfg.next_step_after_approve;
      if (expected === undefined || expected === null || expected === '') {
        return { error: `routeinfo missing next_step_after_approve for step_no ${currentStepNo}` };
      }
      if (Number(expected) !== Number(targetStepNo)) {
        return { error: `step_no must match next_step_after_approve (${expected})` };
      }
    } else {
      const expected = currentCfg.next_step_after_reject;
      if (expected === undefined || expected === null || expected === '') {
        return { error: `routeinfo missing next_step_after_reject for step_no ${currentStepNo}` };
      }
      if (Number(expected) !== Number(targetStepNo)) {
        return { error: `step_no must match next_step_after_reject (${expected})` };
      }
    }
  }

  if (targetCfg) {
    if (out.next_step_after_approve !== undefined) {
      const bodyNextApprove = out.next_step_after_approve;
      if (targetCfg.next_step_after_approve === undefined) {
        return {
          error: `routeinfo missing next_step_after_approve for step ${targetCfg.step_no}`,
        };
      }
      const cfgNextApprove = targetCfg.next_step_after_approve;
      if (
        (bodyNextApprove === null || bodyNextApprove === '' || bodyNextApprove === undefined)
          ? cfgNextApprove !== null && cfgNextApprove !== ''
          : Number(bodyNextApprove) !== Number(cfgNextApprove)
      ) {
        return {
          error: `routeinfo mismatch for next_step_after_approve on step ${targetCfg.step_no}`,
        };
      }
    }
    if (out.next_step_after_reject !== undefined) {
      const bodyNextReject = out.next_step_after_reject;
      if (targetCfg.next_step_after_reject === undefined) {
        return {
          error: `routeinfo missing next_step_after_reject for step ${targetCfg.step_no}`,
        };
      }
      const cfgNextReject = targetCfg.next_step_after_reject;
      if (
        (bodyNextReject === null || bodyNextReject === '' || bodyNextReject === undefined)
          ? cfgNextReject !== null && cfgNextReject !== ''
          : Number(bodyNextReject) !== Number(cfgNextReject)
      ) {
        return {
          error: `routeinfo mismatch for next_step_after_reject on step ${targetCfg.step_no}`,
        };
      }
    }
  }

  const wfStatusHasReview =
    typeof out.wf_status === 'string' &&
    out.wf_status.toLowerCase().includes('review');
  const isReviewAction = action === 'review';
  if (!action && wfStatusHasReview) {
    return { error: 'action is required for review workflow updates' };
  }

  if (action === 'return') {
    const raw = Number(out.step_performer);
    if (!Number.isFinite(raw) || raw <= 0) {
      return {
        error: 'step_performer is required and must be a positive user id for review return',
      };
    }
    out.step_performer = raw;
  } else if (isReviewAction) {
    const raw = Number(out.step_performer);
    if (!Number.isFinite(raw) || raw <= 0) {
      return {
        error: 'step_performer is required and must be a positive user id for review',
      };
    }
    out.step_performer = raw;
  } else {
    const cfg = targetCfg;
    const cfgStepNo = Number.isFinite(targetStepNo)
      ? targetStepNo
      : Number.isFinite(currentStepNo)
      ? currentStepNo
      : null;
    if (!cfg) {
      return { error: `routeinfo not found for step_no ${cfgStepNo}` };
    }
    const rawPerformer = Number(cfg.step_performer);
    if (!Number.isFinite(rawPerformer) || rawPerformer <= 0) {
      return {
        error: `routeinfo does not specify a valid performer for step_no ${cfgStepNo}`,
      };
    }
    out.step_performer = rawPerformer;
  }

  if (action === 'return') {
    if (out.review_requestor !== undefined && out.review_requestor !== null) {
      const rr = Number(out.review_requestor);
      if (!Number.isFinite(rr) || rr <= 0) {
        return { error: 'review_requestor must be a positive user id for review return' };
      }
    }
  } else if (isReviewAction) {
    const loginUserId = userId != null ? Number(userId) : null;
    if (!Number.isFinite(loginUserId) || loginUserId <= 0) {
      return { error: 'review_requestor is required for review' };
    }
    out.review_requestor = loginUserId;
  }

  if (action === 'return') {
    if (!currentCfg?.step_name) {
      return { error: 'routeinfo missing step_name for review return' };
    }
    const requiredStatus = `${currentCfg.step_name}_Reviewed`;
    if (!out.wf_status || out.wf_status !== requiredStatus) {
      return { error: `wf_status must be ${requiredStatus} for review return` };
    }
  }

  return { body: out, initiatorId, targetCfg, currentCfg };
}

// ---------------------------------------------------------------------------
// Step table normalization rules (no fallbacks)
// ---------------------------------------------------------------------------
function resolveNextStepsForWorkflow(steps) {
  return steps.map((s) => {
    const nextApprove = coerceNumber(s.next_step_after_approve);
    const nextReject = coerceNumber(s.next_step_after_reject);
    return {
      id: s.id,
      next_step_after_approve: nextApprove,
      next_step_after_reject: nextReject,
    };
  });
}

// ---------------------------------------------------------------------------
// Mail rules (no fallbacks)
// ---------------------------------------------------------------------------
function normalizeMailUsers(users) {
  let out = users;
  if (typeof out === 'string') {
    try {
      out = JSON.parse(out);
    } catch (_) {
      return null;
    }
  }
  if (!Array.isArray(out)) return null;
  return out;
}

function resolveMailRecipients({ action, stepCfg, instance }) {
  if (action === 'review') {
    const reviewerId = Number(instance?.step_performer);
    if (!Number.isFinite(reviewerId) || reviewerId <= 0) {
      return { error: 'review recipient (step_performer) is required for review mail' };
    }
    return { users: [reviewerId] };
  }
  if (action === 'return') {
    const requestorId = Number(instance?.review_requestor);
    if (!Number.isFinite(requestorId) || requestorId <= 0) {
      return { error: 'review_requestor is required for review return mail' };
    }
    return { users: [requestorId] };
  }

  const users = normalizeMailUsers(stepCfg?.mail_notification_users);
  if (!Array.isArray(users) || users.length === 0) {
    return { error: 'no recipients' };
  }
  const initiatorId = Number(instance?.initiator);
  const resolved = [];
  for (const u of users) {
    if (u === 'Initiator' || u === 'initiator' || Number(u) === 0) {
      if (!Number.isFinite(initiatorId) || initiatorId <= 0) {
        return { error: 'initiator is required to resolve Initiator mail recipient' };
      }
      resolved.push(initiatorId);
      continue;
    }
    const id = Number(u);
    if (!Number.isFinite(id) || id <= 0) {
      return { error: 'mail_notification_users must contain valid user ids or Initiator' };
    }
    resolved.push(id);
  }
  return { users: resolved };
}

function resolveMailTokenUserId({ action, stepCfg, instance }) {
  if (action === 'review') {
    const reviewerId = Number(instance?.step_performer);
    return Number.isFinite(reviewerId) && reviewerId > 0 ? reviewerId : null;
  }
  if (action === 'return') {
    const requestorId = Number(instance?.review_requestor);
    return Number.isFinite(requestorId) && requestorId > 0 ? requestorId : null;
  }

  const raw = Number(instance?.step_performer);
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

module.exports = {
  coerceNumber,
  deriveUiActions,
  deriveAttachmentAccess,
  validateStepConfig,
  normalizeRouteinfo,
  buildRouteinfo,
  validatePatchPayload,
  applyPatchRules,
  resolveNextStepsForWorkflow,
  applyBulkCreateRules,
  normalizeMailUsers,
  resolveMailRecipients,
  resolveMailTokenUserId,
  validateBulkCreateStep,
  validateBulkCreateSequence,
};
