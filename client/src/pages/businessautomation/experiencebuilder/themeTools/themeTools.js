const DEFAULT_SHELL_VISIBILITY = {
  navbar: true,
  header: true,
  left: true,
  right: true,
  bottom: true,
  standardPadding: true,
  grid: true,
};

const DEFAULT_SHELL_SIZES = {
  leftWidth: 250,
  rightWidth: 250,
  bottomHeight: 90,
};

export const THEME_TOOL_PRESETS = [
  {
    id: "marketing-landing",
    name: "Marketing Landing",
    description: "Header-forward landing page with a clean focus area.",
    shell: { left: false, right: false, bottom: false, grid: false, standardPadding: true },
    canvasLayoutRows: 2,
    canvasRows: [
      { id: "row_hero", columns: 1, height: 320, padding: 0, gap: 0 },
      { id: "row_story", columns: 2, height: 260, padding: 12, gap: 12 },
    ],
    widgetHints: ["Text Block", "Chart", "Image"],
  },
  {
    id: "operations-dashboard",
    name: "Operations Dashboard",
    description: "Balanced three-panel workspace with persistent side rails.",
    shell: { left: true, right: true, bottom: true, grid: true, standardPadding: true },
    canvasLayoutRows: 3,
    canvasRows: [
      { id: "row_kpis", columns: 3, height: 180, padding: 8, gap: 8 },
      { id: "row_analysis", columns: 2, height: 280, padding: 8, gap: 8 },
      { id: "row_activity", columns: 1, height: 220, padding: 8, gap: 8 },
    ],
    widgetHints: ["KPI Card", "Chart", "Table"],
  },
  {
    id: "content-board",
    name: "Content Board",
    description: "Publishing-style layout for long-form page content.",
    shell: { left: true, right: false, bottom: false, grid: false, standardPadding: true },
    canvasLayoutRows: 3,
    canvasRows: [
      { id: "row_banner", columns: 1, height: 220, padding: 0, gap: 0 },
      { id: "row_columns", columns: 2, height: 300, padding: 12, gap: 12 },
      { id: "row_footer", columns: 1, height: 180, padding: 12, gap: 12 },
    ],
    widgetHints: ["Text Block", "Image", "Form"],
  },
];

export const THEME_TOOL_PLUGINS = [
  {
    id: "textWidgets",
    name: "Text Widgets",
    description: "Basic editorial content blocks.",
    enabledByDefault: true,
  },
  {
    id: "analyticsWidgets",
    name: "Analytics Widgets",
    description: "KPI and chart widgets for dashboards.",
    enabledByDefault: true,
  },
  {
    id: "mediaWidgets",
    name: "Media Widgets",
    description: "Image and media composition widgets.",
    enabledByDefault: true,
  },
  {
    id: "formWidgets",
    name: "Form Widgets",
    description: "Inquiry and lead capture forms.",
    enabledByDefault: true,
  },
];

export const THEME_TOOL_WIZARD_STEPS = [
  {
    id: "choose-start",
    title: "Choose a starter layout",
    detail: "Pick a preset that matches the page you want to build.",
  },
  {
    id: "brand",
    title: "Set branding",
    detail: "Apply white-label naming, colors, and display preferences.",
  },
  {
    id: "widgets",
    title: "Enable widgets",
    detail: "Switch on the packs needed for this page.",
  },
  {
    id: "review",
    title: "Review diagnostics",
    detail: "Check whether the draft or published layout is complete.",
  },
];

export const THEME_TOOL_TROUBLESHOOTING = [
  {
    id: "published-source",
    title: "Published source",
    detail: "Published pages should render from experience_layouts.layout_definition.",
  },
  {
    id: "navbar-offset",
    title: "Navbar offset",
    detail: "Edit mode should keep the Augmis navbar visible while published mode hides it.",
  },
  {
    id: "section-padding",
    title: "Section padding",
    detail: "Spacing should come from section options when the outer container is removed.",
  },
  {
    id: "bottom-bar",
    title: "Bottom bar",
    detail: "Toggle should add or remove the bottom shell strip in the builder.",
  },
];

export const DEFAULT_THEME_TOOLS = {
  starterPresetId: "operations-dashboard",
  whiteLabel: {
    brandName: "Augmis",
    tagline: "Manage Information Effortlessly",
    primaryColor: "#1e3a6d",
    accentColor: "#2f7dd6",
    logoText: "Augmis",
    hideBranding: false,
  },
  plugins: THEME_TOOL_PLUGINS.reduce((acc, plugin) => {
    acc[plugin.id] = plugin.enabledByDefault;
    return acc;
  }, {}),
};

export const normalizeThemeTools = (rawThemeTools = {}) => ({
  ...DEFAULT_THEME_TOOLS,
  ...rawThemeTools,
  whiteLabel: {
    ...DEFAULT_THEME_TOOLS.whiteLabel,
    ...(rawThemeTools.whiteLabel || {}),
  },
  plugins: {
    ...DEFAULT_THEME_TOOLS.plugins,
    ...(rawThemeTools.plugins || {}),
  },
});

export const getThemePreset = (presetId) =>
  THEME_TOOL_PRESETS.find((preset) => String(preset.id) === String(presetId)) || THEME_TOOL_PRESETS[0];

export const buildThemePresetPatch = (page, presetId) => {
  const preset = getThemePreset(presetId);
  const themeTools = normalizeThemeTools(page?.themeTools);
  const nextThemeTools = {
    ...themeTools,
    starterPresetId: preset.id,
  };

  return {
    ...page,
    layoutName: preset.name,
    description: page?.description || preset.description,
    themeTools: nextThemeTools,
    shell: {
      ...DEFAULT_SHELL_VISIBILITY,
      ...(page?.shell || {}),
      ...(preset.shell || {}),
    },
    shellSizes: {
      ...DEFAULT_SHELL_SIZES,
      ...(page?.shellSizes || {}),
    },
    canvasLayoutRows: Math.max(2, Math.floor(Number(preset.canvasLayoutRows) || 3)),
    canvasRows: Array.isArray(preset.canvasRows)
      ? preset.canvasRows.map((row, index) => ({
          id: row.id || `preset_row_${index}`,
          columns: Math.max(1, Math.floor(Number(row.columns) || 1)),
          height: Math.max(1, Math.floor(Number(row.height) || 220)),
          padding: Math.max(0, Math.floor(Number(row.padding) || 0)),
          gap: Math.max(0, Math.floor(Number(row.gap) || 0)),
        }))
      : page?.canvasRows || [],
    widgets: [],
    sectionConfigs: {},
    sectionMerges: [],
  };
};

export const applyThemeToolsPatch = (page, patch = {}) => {
  const current = normalizeThemeTools(page?.themeTools);
  return {
    ...page,
    themeTools: {
      ...current,
      ...patch,
      whiteLabel: {
        ...current.whiteLabel,
        ...(patch.whiteLabel || {}),
      },
      plugins: {
        ...current.plugins,
        ...(patch.plugins || {}),
      },
    },
  };
};

export const buildThemeDiagnostics = (page, { isPublishedMode = false } = {}) => {
  const themeTools = normalizeThemeTools(page?.themeTools);
  return [
    {
      id: "starter-layout",
      ok: Boolean(themeTools.starterPresetId),
      title: "Starter layout selected",
      detail: `Current preset: ${getThemePreset(themeTools.starterPresetId).name}`,
    },
    {
      id: "branding",
      ok: Boolean(themeTools.whiteLabel?.brandName),
      title: "White label configured",
      detail: themeTools.whiteLabel?.brandName || "Brand name is not set.",
    },
    {
      id: "published-layout",
      ok: !isPublishedMode || Boolean(page?.publishedLayoutId || page?.layout?.publishedLayoutId),
      title: "Published layout linked",
      detail: isPublishedMode
        ? "Published pages should resolve from experience_layouts."
        : "Draft mode uses the experiencebuilder record.",
    },
    {
      id: "section-padding",
      ok: Array.isArray(page?.canvasRows) && page.canvasRows.length > 0,
      title: "Canvas rows available",
      detail: "Rows are required for section padding and widget placement.",
    },
  ];
};

export const getThemeWidgetLibrary = (widgetLibrary, themeTools) => {
  const tools = normalizeThemeTools(themeTools);
  const hasText = tools.plugins.textWidgets !== false;
  const hasAnalytics = tools.plugins.analyticsWidgets !== false;
  const hasMedia = tools.plugins.mediaWidgets !== false;
  const hasForms = tools.plugins.formWidgets !== false;

  return (Array.isArray(widgetLibrary) ? widgetLibrary : []).filter((widget) => {
    if (widget.type === "text") return hasText;
    if (widget.type === "kpi" || widget.type === "chart") return hasAnalytics;
    if (widget.type === "image") return hasMedia;
    if (widget.type === "form") return hasForms;
    return true;
  });
};
