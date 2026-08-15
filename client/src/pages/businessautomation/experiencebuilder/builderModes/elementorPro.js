const DEFAULT_ELEMENTOR_PRO_MODE = {
  themeBuilder: true,
  popupBuilder: true,
  dynamicContent: true,
  customCode: false,
  woocommerceBuilder: false,
  dynamicTemplates: [],
  popupRules: [],
  contentSources: [],
};

const normalizeStringList = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

const normalizeRuleList = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => ({
          name: String(item?.name || item?.title || "").trim(),
          trigger: String(item?.trigger || "").trim(),
          condition: String(item?.condition || "").trim(),
        }))
        .filter((item) => item.name || item.trigger || item.condition)
    : [];

export const normalizeElementorProMode = (page = {}) => {
  const current = page?.builderModes?.elementorPro || {};
  return {
    ...DEFAULT_ELEMENTOR_PRO_MODE,
    ...current,
    dynamicTemplates: normalizeStringList(current.dynamicTemplates || page?.dynamicTemplates),
    popupRules: normalizeRuleList(current.popupRules || page?.popupRules),
    contentSources: normalizeStringList(current.contentSources),
  };
};

export const applyElementorProModePatch = (page, patch = {}) => {
  const current = normalizeElementorProMode(page);
  const nextMode = {
    ...current,
    ...patch,
    dynamicTemplates: normalizeStringList(patch.dynamicTemplates ?? current.dynamicTemplates),
    popupRules: normalizeRuleList(patch.popupRules ?? current.popupRules),
    contentSources: normalizeStringList(patch.contentSources ?? current.contentSources),
  };

  return {
    ...page,
    builderModes: {
      ...(page?.builderModes || {}),
      elementorPro: nextMode,
    },
    dynamicTemplates: nextMode.dynamicTemplates,
    popupRules: nextMode.popupRules,
  };
};

export const getElementorProModeSummary = (page = {}) => {
  const mode = normalizeElementorProMode(page);
  return [
    { id: "theme-builder", label: "Theme Builder", value: mode.themeBuilder ? "Enabled" : "Disabled" },
    { id: "popup-builder", label: "Popup Builder", value: mode.popupBuilder ? "Enabled" : "Disabled" },
    { id: "dynamic-content", label: "Dynamic Content", value: mode.dynamicContent ? "Enabled" : "Disabled" },
    { id: "custom-code", label: "Custom Code", value: mode.customCode ? "Enabled" : "Disabled" },
    {
      id: "woocommerce-builder",
      label: "WooCommerce Builder",
      value: mode.woocommerceBuilder ? "Enabled" : "Disabled",
    },
    {
      id: "dynamic-templates",
      label: "Dynamic Templates",
      value: `${mode.dynamicTemplates.length} saved`,
    },
    {
      id: "popup-rules",
      label: "Popup Rules",
      value: `${mode.popupRules.length} saved`,
    },
  ];
};

