const DEFAULT_WPBAKERY_MODE = {
  editorMode: "frontend",
  roleManager: true,
  allowedRoles: ["administrator", "editor"],
  thirdPartyIntegrations: [],
};

const normalizeStringList = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

export const normalizeWPBakeryMode = (page = {}) => {
  const current = page?.builderModes?.wpbakery || {};
  return {
    ...DEFAULT_WPBAKERY_MODE,
    ...current,
    editorMode: current.editorMode || page?.builderMode || DEFAULT_WPBAKERY_MODE.editorMode,
    allowedRoles: normalizeStringList(current.allowedRoles),
    thirdPartyIntegrations: normalizeStringList(current.thirdPartyIntegrations),
  };
};

export const applyWPBakeryModePatch = (page, patch = {}) => {
  const current = normalizeWPBakeryMode(page);
  const nextMode = {
    ...current,
    ...patch,
    editorMode: patch.editorMode || current.editorMode,
    allowedRoles: normalizeStringList(patch.allowedRoles ?? current.allowedRoles),
    thirdPartyIntegrations: normalizeStringList(
      patch.thirdPartyIntegrations ?? current.thirdPartyIntegrations
    ),
  };

  return {
    ...page,
    builderModes: {
      ...(page?.builderModes || {}),
      wpbakery: nextMode,
    },
    builderMode: nextMode.editorMode,
  };
};

export const getWPBakeryModeSummary = (page = {}) => {
  const mode = normalizeWPBakeryMode(page);
  return [
    { id: "frontend-editor", label: "Frontend Editor", value: mode.editorMode === "frontend" ? "Active" : "Inactive" },
    { id: "backend-editor", label: "Backend Editor", value: mode.editorMode === "backend" ? "Active" : "Inactive" },
    { id: "role-manager", label: "Role Manager", value: mode.roleManager ? "Enabled" : "Disabled" },
    {
      id: "allowed-roles",
      label: "Allowed Roles",
      value: mode.allowedRoles.length ? mode.allowedRoles.join(", ") : "No roles set",
    },
    {
      id: "third-party",
      label: "Third-party Integrations",
      value: `${mode.thirdPartyIntegrations.length} saved`,
    },
  ];
};

