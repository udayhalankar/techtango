const SHELL_SECTION_TITLES = ["header", "footer", "left menu", "right menu", "top navbar", "navbar", "bottom bar"];
const SHELL_SECTION_TYPES = ["header", "footer", "leftmenu", "rightmenu", "navbar", "bottombar"];

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const isShellSection = (section) => {
  const title = String(section?.title || "").toLowerCase().trim();
  const type = String(section?.type || "").toLowerCase().trim();
  return SHELL_SECTION_TITLES.includes(title) || SHELL_SECTION_TYPES.includes(type);
};

const wantsPattern = (text, pattern) => pattern.test(String(text || "").toLowerCase());
export const inferPageFamily = (brief = "") => {
  const text = String(brief || "").toLowerCase();
  if (/\b(dashboard|chart|charts|table|tables|kpi|analytics|metrics|report)\b/.test(text)) return "dashboard";
  if (/\b(landing|homepage|marketing|campaign|lead)\b/.test(text)) return "landing";
  if (/\b(form|register|signup|onboarding|wizard)\b/.test(text)) return "form";
  if (/\b(article|news|blog|content|editorial)\b/.test(text)) return "editorial";
  if (/\b(pharma|pharmaceutical|medicine|drug|healthcare|medical|clinic|hospital)\b/.test(text)) return "corporate";
  if (/\b(company|business|enterprise|organization|profile|about)\b/.test(text)) return "corporate";
  return "general";
};

export const normalizePageSpec = (pageSpec = {}, brief = "") => {
  const normalized = isPlainObject(pageSpec) ? JSON.parse(JSON.stringify(pageSpec)) : {};
  const shell = isPlainObject(normalized.shell) ? normalized.shell : {};
  const layout = isPlainObject(normalized.layout) ? normalized.layout : {};
  const pageMeta = isPlainObject(normalized.pageMeta) ? normalized.pageMeta : {};
  const widgets = Array.isArray(normalized.widgets) ? normalized.widgets : [];
  const cleanBrief = String(brief || "").trim();
  const pageFamily = inferPageFamily(cleanBrief);

  shell.showTopNavbar = Boolean(shell.topNavbar?.visible || shell.showTopNavbar || wantsPattern(cleanBrief, /\b(top navbar|navbar)\b/));
  shell.showHeader = Boolean(shell.header?.visible || shell.showHeader || wantsPattern(cleanBrief, /\bheader\b/));
  shell.showFooter = Boolean(shell.footer?.visible || shell.showFooter || wantsPattern(cleanBrief, /\bfooter\b/));
  shell.showBottomBar = Boolean(shell.bottomBar?.visible || shell.showBottomBar || wantsPattern(cleanBrief, /\bbottom bar\b/));
  shell.showLeftMenu = Boolean(shell.leftMenu?.visible || shell.showLeftMenu || wantsPattern(cleanBrief, /\bleft menu\b/));
  shell.showRightMenu = Boolean(shell.rightMenu?.visible || shell.showRightMenu || wantsPattern(cleanBrief, /\bright menu\b/));

  shell.topNavbar = { ...(isPlainObject(shell.topNavbar) ? shell.topNavbar : {}), visible: shell.showTopNavbar };
  shell.header = { ...(isPlainObject(shell.header) ? shell.header : {}), visible: shell.showHeader };
  shell.footer = { ...(isPlainObject(shell.footer) ? shell.footer : {}), visible: shell.showFooter };
  shell.bottomBar = { ...(isPlainObject(shell.bottomBar) ? shell.bottomBar : {}), visible: shell.showBottomBar };
  shell.leftMenu = { ...(isPlainObject(shell.leftMenu) ? shell.leftMenu : {}), visible: shell.showLeftMenu };
  shell.rightMenu = { ...(isPlainObject(shell.rightMenu) ? shell.rightMenu : {}), visible: shell.showRightMenu };

  layout.layoutPreset = String(layout.layoutPreset || "custom").trim() || "custom";
  layout.compositionMode = String(layout.compositionMode || "balanced").trim() || "balanced";
  layout.compositionVariant = String(layout.compositionVariant || "insight-led").trim() || "insight-led";
  layout.visualWeight = String(layout.visualWeight || "high").trim() || "high";
  layout.surface = String(layout.surface || "elevated").trim() || "elevated";
  layout.alignment = String(layout.alignment || "split").trim() || "split";
  layout.emphasis = String(layout.emphasis || "primary").trim() || "primary";
  layout.designSeed = String(layout.designSeed || "enterprise-insight-001").trim() || "enterprise-insight-001";

  if (wantsPattern(cleanBrief, /\b(dashboard|chart|charts|table|tables|kpi|analytics)\b/)) {
    layout.compositionMode = "dashboard-led";
    layout.alignment = "left";
  }

  if (pageFamily === "corporate") {
    shell.showTopNavbar = shell.showTopNavbar || true;
    shell.showHeader = shell.showHeader || true;
    shell.showFooter = shell.showFooter || true;
    shell.contentWidth = "full";
    shell.contentMaxWidth = 0;

    layout.compositionMode = layout.compositionMode === "dashboard-led" ? "dashboard-led" : "content-led";
    layout.alignment = "center";
    layout.visualWeight = layout.visualWeight || "medium";
    layout.surface = layout.surface || "elevated";
    layout.sectionPadding = Math.max(Number(layout.sectionPadding) || 0, 10);
    layout.sectionGap = Math.max(Number(layout.sectionGap) || 0, 10);
    layout.sectionRadius = Math.max(Number(layout.sectionRadius) || 0, 16);
    layout.sectionBorder = true;
  }

  const canvasSections = Array.isArray(layout.sections) ? layout.sections.filter((section) => !isShellSection(section)) : [];
  const cleanedSections = canvasSections.map((section, index) => {
    const safeSection = isPlainObject(section) ? section : {};
    return {
      ...safeSection,
      id: String(safeSection.id || `section_${index + 1}`),
      title: String(safeSection.title || `Section ${index + 1}`),
      widgetIds: Array.isArray(safeSection.widgetIds) ? safeSection.widgetIds.filter(Boolean).map(String) : [],
    };
  });

  const validSectionIds = new Set(cleanedSections.map((section) => section.id));
  const cleanedWidgets = widgets
    .map((widget, index) => {
      const safeWidget = isPlainObject(widget) ? widget : {};
      return {
        ...safeWidget,
        id: String(safeWidget.id || `widget_${index + 1}`),
        sectionId: String(safeWidget.sectionId || "section_1"),
        title: String(safeWidget.title || `${safeWidget.type || "widget"} widget`),
        order: Number.isInteger(safeWidget.order) ? safeWidget.order : index,
        visible: safeWidget.visible !== false,
        config: isPlainObject(safeWidget.config) ? safeWidget.config : {},
      };
    })
    .filter((widget) => validSectionIds.has(widget.sectionId));

  cleanedSections.forEach((section) => {
    const widgetIds = cleanedWidgets.filter((widget) => widget.sectionId === section.id).map((widget) => widget.id);
    section.widgetIds = widgetIds;
  });

  normalized.pageMeta = {
    name: String(pageMeta.name || "").trim(),
    purpose: String(pageMeta.purpose || "").trim(),
    audience: String(pageMeta.audience || "").trim(),
    domain: String(pageMeta.domain || "").trim(),
    tone: String(pageMeta.tone || "professional").trim() || "professional",
    style: String(pageMeta.style || "modern").trim() || "modern",
  };
  normalized.shell = shell;
  normalized.layout = { ...layout, sections: cleanedSections };
  normalized.widgets = cleanedWidgets;

  return normalized;
};
