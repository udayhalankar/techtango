import { createBuilderEcosystemState } from "./builderEcosystems";
import { normalizeThemeTools } from "./themeTools/themeTools";

const PACK_WIDGET_RULES = {
  text: ["gutenberg", "elementor", "wpbakery"],
  kpi: ["elementor", "elementor-pro", "wpbakery"],
  chart: ["elementor", "elementor-pro", "wpbakery"],
  table: ["elementor-pro", "wpbakery"],
  image: ["elementor", "elementor-pro", "wpbakery"],
  icon: ["elementor", "wpbakery"],
  form: ["elementor-pro", "wpbakery", "elementor"],
  syncedBlock: ["gutenberg"],
  templatePart: ["elementor-pro", "gutenberg"],
};

const PLUGIN_WIDGET_RULES = {
  textWidgets: ["text"],
  analyticsWidgets: ["kpi", "chart"],
  mediaWidgets: ["image", "icon"],
  formWidgets: ["form"],
};

const allowsWidgetType = (widgetType, enabledPacks, themeTools) => {
  const allowedPacks = PACK_WIDGET_RULES[widgetType];
  const packAllowed = !allowedPacks || allowedPacks.some((packId) => enabledPacks.has(packId));
  if (!packAllowed) return false;

  const plugins = normalizeThemeTools(themeTools)?.plugins || {};
  const pluginRule = Object.entries(PLUGIN_WIDGET_RULES).find(([_pluginId, widgetTypes]) =>
    widgetTypes.includes(widgetType)
  );
  if (!pluginRule) return true;

  const [pluginId] = pluginRule;
  return plugins[pluginId] !== false;
};

const SECTION_WIDGET_RULES = {
  Chart: ["elementor", "elementor-pro", "wpbakery"],
  Table: ["elementor-pro", "wpbakery"],
  "Text Block": ["gutenberg", "elementor", "wpbakery"],
  Image: ["elementor", "elementor-pro", "wpbakery"],
  Icon: ["elementor", "wpbakery"],
  "Synced Block": ["gutenberg"],
  Form: ["elementor-pro", "elementor", "wpbakery"],
  "Template Part": ["elementor-pro", "gutenberg"],
};

export const normalizeBuilderPacks = (page = {}) => createBuilderEcosystemState(page);

export const isPackEnabled = (page, packId) => {
  const packs = normalizeBuilderPacks(page);
  return packs?.[packId]?.enabled !== false;
};

export const getEnabledPackIds = (page) =>
  Object.entries(normalizeBuilderPacks(page))
    .filter(([_id, config]) => config?.enabled !== false)
    .map(([id]) => id);

export const getEnabledWidgetTypes = (page, baseWidgetLibrary = []) => {
  const enabledPacks = new Set(getEnabledPackIds(page));
  const themeTools = normalizeThemeTools(page?.themeTools);
  const base = Array.isArray(baseWidgetLibrary) ? baseWidgetLibrary : [];
  const extraTypes = [];

  if ((enabledPacks.has("elementor-pro") || enabledPacks.has("wpbakery")) && themeTools.plugins.mediaWidgets !== false) {
    extraTypes.push({ type: "image", name: "Image", defaultW: 6, defaultH: 4 });
  }
  if ((enabledPacks.has("elementor") || enabledPacks.has("wpbakery")) && themeTools.plugins.mediaWidgets !== false) {
    extraTypes.push({ type: "icon", name: "Icon", defaultW: 3, defaultH: 3 });
  }
  if ((enabledPacks.has("elementor-pro") || enabledPacks.has("wpbakery")) && themeTools.plugins.formWidgets !== false) {
    extraTypes.push({ type: "form", name: "Form", defaultW: 6, defaultH: 5 });
  }
  if (enabledPacks.has("gutenberg")) {
    extraTypes.push({ type: "syncedBlock", name: "Synced Block", defaultW: 6, defaultH: 4 });
  }
  if (enabledPacks.has("elementor-pro") || enabledPacks.has("gutenberg")) {
    extraTypes.push({ type: "templatePart", name: "Template Part", defaultW: 6, defaultH: 4 });
  }

  const combined = [...base, ...extraTypes]
    .filter((item) => allowsWidgetType(item.type, enabledPacks, themeTools))
    .filter((item, index, self) => self.findIndex((candidate) => candidate.type === item.type) === index);
  return combined;
};

export const getSectionWidgetOptions = (page, themeToolsOverride = null) => {
  const enabledPacks = new Set(getEnabledPackIds(page));
  const themeTools = normalizeThemeTools(themeToolsOverride || page?.themeTools);
  return Object.entries(SECTION_WIDGET_RULES)
    .filter(([widgetType, packs]) => {
      if (!packs.some((packId) => enabledPacks.has(packId))) return false;
      const pluginMatch = Object.entries(PLUGIN_WIDGET_RULES).find(([_pluginId, widgetTypes]) =>
        widgetTypes.includes(widgetType)
      );
      if (!pluginMatch) return true;
      const [pluginId] = pluginMatch;
      return themeTools.plugins?.[pluginId] !== false;
    })
    .map(([widgetType]) => widgetType);
};

export const getEditorModes = (page) => {
  const wpbakeryEnabled = isPackEnabled(page, "wpbakery");
  const elementorEnabled = isPackEnabled(page, "elementor");
  return {
    viewportModes: elementorEnabled
      ? ["desktop", "tablet", "mobile"]
      : ["desktop"],
    builderModes: wpbakeryEnabled ? ["frontend", "backend"] : ["frontend"],
  };
};

export const getPackBehaviorSummary = (page) => ({
  gutenberg: {
    enabled: isPackEnabled(page, "gutenberg"),
    sections: isPackEnabled(page, "gutenberg") ? ["sections", "synced blocks"] : [],
  },
  elementor: {
    enabled: isPackEnabled(page, "elementor"),
    widgets: isPackEnabled(page, "elementor") ? ["live widgets", "responsive breakpoints"] : [],
  },
  elementorPro: {
    enabled: isPackEnabled(page, "elementor-pro"),
    flows: isPackEnabled(page, "elementor-pro")
      ? ["theme builder", "popup builder", "dynamic content"]
      : [],
  },
  wpbakery: {
    enabled: isPackEnabled(page, "wpbakery"),
    modes: isPackEnabled(page, "wpbakery") ? ["frontend editor", "backend editor"] : [],
  },
});

export const applyPackBehavior = (page, packId) => {
  const next = { ...page };
  const packs = normalizeBuilderPacks(page);
  next.builderPacks = {
    ...packs,
    [packId]: {
      ...(packs[packId] || {}),
      enabled: true,
    },
  };

  if (packId === "gutenberg") {
    next.syncedBlocks = {
      ...(next.syncedBlocks || {}),
      hero: next.syncedBlocks?.hero || {
        title: "Hero synced block",
        content: "Shared content used across sections.",
      },
      footer: next.syncedBlocks?.footer || {
        title: "Footer synced block",
        content: "Shared footer content used across layouts.",
      },
    };
  }

  if (packId === "elementor") {
    next.builderViewport = next.builderViewport || "desktop";
    next.responsiveBreakpoints = next.responsiveBreakpoints || {
      desktop: 1024,
      tablet: 768,
      mobile: 480,
    };
  }

  if (packId === "elementor-pro") {
    next.dynamicTemplates = next.dynamicTemplates || [];
    next.popupRules = next.popupRules || [];
  }

  if (packId === "wpbakery") {
    next.builderMode = next.builderMode || "frontend";
  }

  return next;
};
