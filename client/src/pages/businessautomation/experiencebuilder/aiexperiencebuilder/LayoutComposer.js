import { resolveThemeTokens } from "./ThemeResolver";

export const composeLayoutModel = (pageSpec = {}) => {
  const theme = resolveThemeTokens(pageSpec);
  const sections = Array.isArray(pageSpec?.layout?.sections) ? pageSpec.layout.sections : [];
  const widgets = Array.isArray(pageSpec?.widgets) ? pageSpec.widgets : [];
  const widgetsBySection = new Map();

  widgets.forEach((widget) => {
    if (!widget?.sectionId) return;
    const list = widgetsBySection.get(widget.sectionId) || [];
    list.push(widget);
    widgetsBySection.set(widget.sectionId, list);
  });

  widgetsBySection.forEach((list) => {
    list.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  });

  return {
    theme,
    shell: pageSpec?.shell || {},
    pageMeta: pageSpec?.pageMeta || {},
    behaviors: pageSpec?.behaviors || {},
    sections: sections.map((section) => ({
      ...section,
      widgets: widgetsBySection.get(section.id) || [],
    })),
  };
};

export default composeLayoutModel;
