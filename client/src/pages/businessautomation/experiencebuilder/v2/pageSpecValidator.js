import {
  AGGREGATIONS,
  CHART_TYPES,
  CONTENT_WIDTH_OPTIONS,
  DENSITY_OPTIONS,
  IMAGE_FIT_OPTIONS,
  IMAGE_POSITION_OPTIONS,
  PAGE_SPEC_SCHEMA_VERSION,
  PAGE_STYLE_OPTIONS,
  COMPOSITION_MODE_OPTIONS,
  PREVIEW_DEVICE_OPTIONS,
  SECTION_LAYOUT_OPTIONS,
  WIDGET_TYPES,
  createDefaultDesignerInput,
} from "./PageSpecSchema";

const DEFAULT_THEME = createDefaultDesignerInput().theme;
const DEFAULT_SECTION = createDefaultDesignerInput().layout.sections[0];

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const ensureKnownKeys = (obj, allowedKeys, path) => {
  const unknown = Object.keys(obj || {}).filter((key) => !allowedKeys.includes(key));
  assert(unknown.length === 0, `${path} contains unsupported keys: ${unknown.join(", ")}`);
};

const ensureString = (value, path, allowEmpty = false) => {
  assert(typeof value === "string", `${path} must be a string`);
  if (!allowEmpty) assert(value.trim().length > 0, `${path} cannot be empty`);
};

const ensureEnum = (value, allowed, path) => {
  ensureString(value, path);
  assert(allowed.includes(value), `${path} must be one of: ${allowed.join(", ")}`);
};

const ensureInteger = (value, path, min = Number.NEGATIVE_INFINITY) => {
  assert(Number.isInteger(value), `${path} must be an integer`);
  assert(value >= min, `${path} must be greater than or equal to ${min}`);
};

const ensureNumber = (value, path, min = Number.NEGATIVE_INFINITY) => {
  assert(typeof value === "number" && Number.isFinite(value), `${path} must be a number`);
  assert(value >= min, `${path} must be greater than or equal to ${min}`);
};

const ensureArray = (value, path) => {
  assert(Array.isArray(value), `${path} must be an array`);
};

const normalizeThemeSpec = (theme) => {
  const safeTheme = isPlainObject(theme) ? theme : {};
  return {
    ...DEFAULT_THEME,
    ...safeTheme,
    primaryColor: String(safeTheme.primaryColor || DEFAULT_THEME.primaryColor).trim() || DEFAULT_THEME.primaryColor,
    accentColor: String(safeTheme.accentColor || DEFAULT_THEME.accentColor).trim() || DEFAULT_THEME.accentColor,
    backgroundColor: String(safeTheme.backgroundColor || DEFAULT_THEME.backgroundColor).trim() || DEFAULT_THEME.backgroundColor,
    neutralColor: String(safeTheme.neutralColor || DEFAULT_THEME.neutralColor).trim() || DEFAULT_THEME.neutralColor,
    borderColor: String(safeTheme.borderColor || DEFAULT_THEME.borderColor).trim() || DEFAULT_THEME.borderColor,
    fontFamily: String(safeTheme.fontFamily || DEFAULT_THEME.fontFamily).trim() || DEFAULT_THEME.fontFamily,
    iconStyle: String(safeTheme.iconStyle || DEFAULT_THEME.iconStyle).trim() || DEFAULT_THEME.iconStyle,
    density: safeTheme.density || DEFAULT_THEME.density,
  };
};

const normalizeSectionSpec = (section) => {
  const safeSection = isPlainObject(section) ? section : {};
  return {
    ...DEFAULT_SECTION,
    ...safeSection,
    borderColor: String(safeSection.borderColor || DEFAULT_SECTION.borderColor).trim() || DEFAULT_SECTION.borderColor,
    backgroundColor: String(safeSection.backgroundColor || DEFAULT_SECTION.backgroundColor).trim() || DEFAULT_SECTION.backgroundColor,
  };
};

const normalizeLayoutSpec = (layout) => {
  const safeLayout = isPlainObject(layout) ? layout : {};
  return {
    ...safeLayout,
    layoutPreset: String(safeLayout.layoutPreset || "custom").trim() || "custom",
    compositionMode: String(safeLayout.compositionMode || "balanced").trim() || "balanced",
    compositionVariant: String(safeLayout.compositionVariant || "insight-led").trim() || "insight-led",
    visualWeight: String(safeLayout.visualWeight || "high").trim() || "high",
    surface: String(safeLayout.surface || "elevated").trim() || "elevated",
    alignment: String(safeLayout.alignment || "split").trim() || "split",
    emphasis: String(safeLayout.emphasis || "primary").trim() || "primary",
    designSeed: String(safeLayout.designSeed || "enterprise-insight-001").trim() || "enterprise-insight-001",
  };
};

const isShellSectionTitle = (value) => {
  const title = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  return ["header", "left menu", "right menu", "top navbar", "footer", "bottom bar"].includes(title);
};

const validateShell = (shell) => {
  assert(isPlainObject(shell), "shell must be an object");
  ensureKnownKeys(shell, [
    "topNavbar",
    "header",
    "footer",
    "bottomBar",
    "leftMenu",
    "rightMenu",
    "showTopNavbar",
    "showHeader",
    "showFooter",
    "showBottomBar",
    "showLeftMenu",
    "showRightMenu",
    "leftMenuCollapsible",
    "rightMenuCollapsible",
    "collapseTriggerStyle",
    "headerBehavior",
    "footerBehavior",
    "leftMenuBehavior",
    "rightMenuBehavior",
    "showBreadcrumbs",
    "showUtilityIcons",
    "showPageTitle",
    "showHeaderActions",
    "brandName",
    "tagline",
    "logoText",
    "logoImageUrl",
    "pageTitle",
    "contentWidth",
    "contentMaxWidth",
    "shellPadding",
  ], "shell");
  ensureEnum(shell.contentWidth, CONTENT_WIDTH_OPTIONS, "shell.contentWidth");
  if (shell.contentMaxWidth !== undefined) {
    ensureInteger(shell.contentMaxWidth, "shell.contentMaxWidth", 0);
  }
  [
    "showTopNavbar",
    "showHeader",
    "showFooter",
    "showBottomBar",
    "showLeftMenu",
    "showRightMenu",
    "leftMenuCollapsible",
    "rightMenuCollapsible",
    "showBreadcrumbs",
    "showUtilityIcons",
    "showPageTitle",
    "showHeaderActions",
  ].forEach((field) => {
    if (shell[field] !== undefined) assert(typeof shell[field] === "boolean", `shell.${field} must be a boolean`);
  });
  [
    "brandName",
    "tagline",
    "logoText",
    "logoImageUrl",
    "pageTitle",
    "headerBehavior",
    "footerBehavior",
    "leftMenuBehavior",
    "rightMenuBehavior",
    "collapseTriggerStyle",
  ].forEach((field) => {
    if (shell[field] !== undefined) ensureString(shell[field], `shell.${field}`, true);
  });
  ensureInteger(shell.shellPadding, "shell.shellPadding", 0);
};

const validateTheme = (theme) => {
  assert(isPlainObject(theme), "theme must be an object");
  ensureKnownKeys(theme, [
    "brandName",
    "tagline",
    "logoText",
    "primaryColor",
    "accentColor",
    "backgroundColor",
    "neutralColor",
    "borderColor",
    "fontFamily",
    "iconStyle",
    "density",
  ], "theme");
  ensureString(theme.primaryColor, "theme.primaryColor");
  ensureString(theme.accentColor, "theme.accentColor");
  ensureString(theme.backgroundColor, "theme.backgroundColor");
  ensureString(theme.neutralColor, "theme.neutralColor");
  ensureString(theme.borderColor, "theme.borderColor");
  ensureString(theme.fontFamily, "theme.fontFamily");
  ensureString(theme.iconStyle, "theme.iconStyle");
  ensureEnum(theme.density, DENSITY_OPTIONS, "theme.density");
};

const validateLayout = (layout) => {
  assert(isPlainObject(layout), "layout must be an object");
  ensureKnownKeys(layout, [
    "layoutPreset",
    "compositionMode",
    "compositionVariant",
    "visualWeight",
    "surface",
    "alignment",
    "emphasis",
    "designSeed",
    "sectionCount",
    "columnsPerSection",
    "rowsPerSection",
    "sectionGap",
    "sectionPadding",
    "sectionRadius",
    "sectionBorder",
    "fullWidthCanvas",
    "density",
    "sections",
  ], "layout");
  ensureString(layout.layoutPreset, "layout.layoutPreset");
  ensureEnum(layout.compositionMode, COMPOSITION_MODE_OPTIONS, "layout.compositionMode");
  ensureEnum(layout.compositionVariant, ["insight-led", "executive-summary", "split-proof", "report-style", "hero-led", "workflow-led", "landing-led", "editorial"], "layout.compositionVariant");
  ensureEnum(layout.visualWeight, ["low", "medium", "high"], "layout.visualWeight");
  ensureEnum(layout.surface, ["flat", "tinted", "elevated", "gradient"], "layout.surface");
  ensureEnum(layout.alignment, ["left", "center", "split"], "layout.alignment");
  ensureEnum(layout.emphasis, ["primary", "secondary", "supporting"], "layout.emphasis");
  ensureString(layout.designSeed, "layout.designSeed");
  ensureInteger(layout.sectionCount, "layout.sectionCount", 1);
  ensureInteger(layout.columnsPerSection, "layout.columnsPerSection", 1);
  ensureInteger(layout.rowsPerSection, "layout.rowsPerSection", 1);
  ensureInteger(layout.sectionGap, "layout.sectionGap", 0);
  ensureInteger(layout.sectionPadding, "layout.sectionPadding", 0);
  ensureInteger(layout.sectionRadius, "layout.sectionRadius", 0);
  assert(typeof layout.sectionBorder === "boolean", "layout.sectionBorder must be a boolean");
  assert(typeof layout.fullWidthCanvas === "boolean", "layout.fullWidthCanvas must be a boolean");
  ensureEnum(layout.density, DENSITY_OPTIONS, "layout.density");
  ensureArray(layout.sections, "layout.sections");
  assert(layout.sections.length > 0, "layout.sections cannot be empty");
  layout.sections = layout.sections.map((section) => normalizeSectionSpec(section));
  layout.sections.forEach((section, index) => validateSection(section, `layout.sections[${index}]`));
  const shellSections = layout.sections.filter((section) => isShellSectionTitle(section.title));
  assert(shellSections.length === 0, "AI incorrectly created shell chrome as page sections");
};

const validateSection = (section, path) => {
  assert(isPlainObject(section), `${path} must be an object`);
  ensureKnownKeys(section, [
    "id",
    "title",
    "type",
    "columns",
    "rows",
    "width",
    "padding",
    "gap",
    "border",
    "borderColor",
    "backgroundColor",
    "radius",
    "widgetIds",
  ], path);
  ensureString(section.id, `${path}.id`);
  ensureString(section.title, `${path}.title`);
  ensureEnum(section.type, SECTION_LAYOUT_OPTIONS, `${path}.type`);
  ensureInteger(section.columns, `${path}.columns`, 1);
  ensureInteger(section.rows, `${path}.rows`, 1);
  ensureInteger(section.padding, `${path}.padding`, 0);
  ensureInteger(section.gap, `${path}.gap`, 0);
  assert(typeof section.border === "boolean", `${path}.border must be a boolean`);
  ensureString(section.borderColor, `${path}.borderColor`);
  ensureString(section.backgroundColor, `${path}.backgroundColor`);
  ensureInteger(section.radius, `${path}.radius`, 0);
  ensureArray(section.widgetIds, `${path}.widgetIds`);
  section.widgetIds.forEach((id, index) => ensureString(id, `${path}.widgetIds[${index}]`));
};

const validateWidget = (widget, path) => {
  assert(isPlainObject(widget), `${path} must be an object`);
  ensureKnownKeys(widget, [
    "id",
    "type",
    "sectionId",
    "title",
    "order",
    "width",
    "height",
    "visible",
    "config",
  ], path);
  ensureString(widget.id, `${path}.id`);
  ensureEnum(widget.type, WIDGET_TYPES, `${path}.type`);
  ensureString(widget.sectionId, `${path}.sectionId`);
  ensureString(widget.title, `${path}.title`);
  ensureInteger(widget.order, `${path}.order`, 0);
  if (widget.width !== undefined) ensureNumber(widget.width, `${path}.width`, 0);
  if (widget.height !== undefined) ensureNumber(widget.height, `${path}.height`, 0);
  if (widget.visible !== undefined) assert(typeof widget.visible === "boolean", `${path}.visible must be a boolean`);
  assert(isPlainObject(widget.config), `${path}.config must be an object`);
  validateWidgetConfig(widget, path);
};

const validateWidgetConfig = (widget, path) => {
  const config = widget.config || {};
  if (widget.type === "chart") {
    if (config.chartType !== undefined) ensureEnum(config.chartType, CHART_TYPES, `${path}.config.chartType`);
    if (config.aggregation !== undefined) ensureEnum(config.aggregation, AGGREGATIONS, `${path}.config.aggregation`);
  } else if (widget.type === "table") {
    if (config.rowLimit !== undefined) ensureInteger(config.rowLimit, `${path}.config.rowLimit`, 1);
    if (config.columns !== undefined) {
      ensureArray(config.columns, `${path}.config.columns`);
      config.columns.forEach((col, index) => ensureString(col, `${path}.config.columns[${index}]`));
    }
  } else if (widget.type === "text") {
    if (config.textSource !== undefined) ensureEnum(config.textSource, ["manual", "ai"], `${path}.config.textSource`);
  } else if (widget.type === "image") {
    if (config.imageFit !== undefined) ensureEnum(config.imageFit, IMAGE_FIT_OPTIONS, `${path}.config.imageFit`);
    if (config.imagePosition !== undefined) ensureEnum(config.imagePosition, IMAGE_POSITION_OPTIONS, `${path}.config.imagePosition`);
  } else if (widget.type === "icon") {
    if (config.iconSize !== undefined) ensureNumber(config.iconSize, `${path}.config.iconSize`, 1);
  } else if (widget.type === "kpi") {
  }
};

const validateBehaviors = (behaviors) => {
  assert(isPlainObject(behaviors), "behaviors must be an object");
  ensureKnownKeys(behaviors, [
    "responsive",
    "previewDevice",
    "stickyHeader",
    "stickyFooter",
    "collapsibleMenus",
    "scrollBehavior",
    "animateEntry",
  ], "behaviors");
  assert(typeof behaviors.responsive === "boolean", "behaviors.responsive must be a boolean");
  ensureEnum(behaviors.previewDevice, PREVIEW_DEVICE_OPTIONS, "behaviors.previewDevice");
  assert(typeof behaviors.stickyHeader === "boolean", "behaviors.stickyHeader must be a boolean");
  assert(typeof behaviors.stickyFooter === "boolean", "behaviors.stickyFooter must be a boolean");
  assert(typeof behaviors.collapsibleMenus === "boolean", "behaviors.collapsibleMenus must be a boolean");
  ensureString(behaviors.scrollBehavior, "behaviors.scrollBehavior");
  assert(typeof behaviors.animateEntry === "boolean", "behaviors.animateEntry must be a boolean");
};

const validateGeneration = (generation) => {
  assert(isPlainObject(generation), "generation must be an object");
  ensureKnownKeys(generation, ["createdAt", "source", "model", "promptVersion", "revisionId", "notes"], "generation");
  ensureString(generation.createdAt, "generation.createdAt");
  ensureString(generation.source, "generation.source");
  ensureString(generation.revisionId, "generation.revisionId");
  if (generation.model !== undefined) ensureString(generation.model, "generation.model");
  if (generation.promptVersion !== undefined) ensureString(generation.promptVersion, "generation.promptVersion");
  if (generation.notes !== undefined) ensureString(generation.notes, "generation.notes");
};

export function normalizeDesignerInput(input) {
  return createDefaultDesignerInput(input);
}

export function validateDesignerInput(input) {
  const normalized = normalizeDesignerInput(input);
  assert(isPlainObject(normalized), "designer input must be an object");
  ensureKnownKeys(normalized, ["pageMeta", "shell", "layout", "theme", "widgets", "behaviors"], "designer input");
  assert(isPlainObject(normalized.pageMeta), "designerInput.pageMeta must be an object");
  ensureString(normalized.pageMeta.name, "designerInput.pageMeta.name");
  ensureEnum(normalized.pageMeta.style, PAGE_STYLE_OPTIONS, "designerInput.pageMeta.style");
  ensureString(normalized.pageMeta.purpose, "designerInput.pageMeta.purpose", true);
  ensureString(normalized.pageMeta.audience, "designerInput.pageMeta.audience", true);
  ensureString(normalized.pageMeta.domain, "designerInput.pageMeta.domain", true);
  ensureString(normalized.pageMeta.tone, "designerInput.pageMeta.tone", true);
  validateShell(normalized.shell);
  validateLayout(normalized.layout);
  validateTheme(normalized.theme);
  ensureArray(normalized.widgets, "designerInput.widgets");
  normalized.widgets.forEach((widget, index) => {
    assert(isPlainObject(widget), `designerInput.widgets[${index}] must be an object`);
    ensureKnownKeys(widget, [
      "id",
      "type",
      "sectionId",
      "title",
      "order",
      "width",
      "height",
      "visible",
      "config",
    ], `designerInput.widgets[${index}]`);
    ensureString(widget.id, `designerInput.widgets[${index}].id`);
    ensureEnum(widget.type, WIDGET_TYPES, `designerInput.widgets[${index}].type`);
    ensureString(widget.sectionId, `designerInput.widgets[${index}].sectionId`);
    ensureString(widget.title, `designerInput.widgets[${index}].title`);
    ensureInteger(widget.order, `designerInput.widgets[${index}].order`, 0);
    if (widget.width !== undefined) ensureNumber(widget.width, `designerInput.widgets[${index}].width`, 0);
    if (widget.height !== undefined) ensureNumber(widget.height, `designerInput.widgets[${index}].height`, 0);
    if (widget.visible !== undefined) assert(typeof widget.visible === "boolean", `designerInput.widgets[${index}].visible must be a boolean`);
    assert(isPlainObject(widget.config), `designerInput.widgets[${index}].config must be an object`);
  });
  validateBehaviors(normalized.behaviors);
  return normalized;
}

export function validatePageSpec(pageSpec) {
  assert(isPlainObject(pageSpec), "page spec must be an object");
  ensureKnownKeys(pageSpec, ["schemaVersion", "pageMeta", "theme", "shell", "layout", "widgets", "behaviors", "generation"], "page spec");
  ensureString(pageSpec.schemaVersion, "pageSpec.schemaVersion");
  assert(pageSpec.schemaVersion === PAGE_SPEC_SCHEMA_VERSION, `pageSpec.schemaVersion must be ${PAGE_SPEC_SCHEMA_VERSION}`);
  assert(isPlainObject(pageSpec.pageMeta), "pageSpec.pageMeta must be an object");
  ensureKnownKeys(pageSpec.pageMeta, ["name", "purpose", "audience", "domain", "tone", "style"], "pageSpec.pageMeta");
  ensureString(pageSpec.pageMeta.name, "pageSpec.pageMeta.name");
  ensureEnum(pageSpec.pageMeta.style, PAGE_STYLE_OPTIONS, "pageSpec.pageMeta.style");
  ensureString(pageSpec.pageMeta.purpose, "pageSpec.pageMeta.purpose", true);
  ensureString(pageSpec.pageMeta.audience, "pageSpec.pageMeta.audience", true);
  ensureString(pageSpec.pageMeta.domain, "pageSpec.pageMeta.domain", true);
  ensureString(pageSpec.pageMeta.tone, "pageSpec.pageMeta.tone", true);
  pageSpec.theme = normalizeThemeSpec(pageSpec.theme);
  pageSpec.layout = normalizeLayoutSpec(pageSpec.layout);
  validateTheme(pageSpec.theme);
  validateShell(pageSpec.shell);
  validateLayout(pageSpec.layout);
  ensureArray(pageSpec.widgets, "pageSpec.widgets");
  pageSpec.widgets.forEach((widget, index) => validateWidget(widget, `pageSpec.widgets[${index}]`));
  validateBehaviors(pageSpec.behaviors);
  validateGeneration(pageSpec.generation);

  const sectionIds = new Set(pageSpec.layout.sections.map((section) => section.id));
  pageSpec.widgets.forEach((widget, index) => {
    assert(sectionIds.has(widget.sectionId), `pageSpec.widgets[${index}].sectionId does not match any layout section`);
  });

  return pageSpec;
}
