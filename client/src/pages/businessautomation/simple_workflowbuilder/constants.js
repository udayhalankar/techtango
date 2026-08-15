// Central constants to avoid duplication across pages/components
export const WF_TABLE_PREFIX = "custwf_"; // dropdown filter

export const STEP_TYPES = Object.freeze({
  INITIATE: "create",
  APPROVAL: "update",
  TERMINATE: "terminate",
});

export const ATTACHMENT_OPTIONS = [
  { value: "view", label: "View" },
  { value: "no_view", label: "Cannot View Attachments" },
  { value: "add", label: "Add New Attachments" },
  { value: "no_add", label: "Cannot Add Attachments" },
];

export const DEFAULT_APPROVE_ACTION = "Approve";
export const DEFAULT_REJECT_ACTION = "Reject";

export const TABLE_TYPE_WORKFLOW = "Workflow";

export const DEFAULTS = Object.freeze({
  NO_OF_STEPS: 1, // user input fallback
  STEP_DUE_IN_DAYS: 2,
});

export const FORM_VIS_FLAGS = Object.freeze({
  VISIBLE: true,
  READONLY: false,
  MANDATORY: false,
});

export const MODAL_TABS = Object.freeze({ STEP_DETAILS: "Step Details", FORM: "Form" });

// Keys used in JSONB structures
export const JSON_KEYS = Object.freeze({
  USER_ACCESS: "user_access",
  VERSION_INFO: "version_info",
  AUDIT_TRAIL: "audit_trail",
  STEP_FORM_CONFIGURATION: "step_form_configuration",
});
