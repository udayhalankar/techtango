export const ELEMENTOR_FEATURES = [
  {
    id: "drag-drop",
    title: "Drag & Drop Live Editor",
    detail: "Visual editing directly on the page canvas.",
  },
  {
    id: "widgets",
    title: "Widget Library",
    detail: "A wide set of blocks/widgets for page construction.",
  },
  {
    id: "responsive-editing",
    title: "Responsive Editing",
    detail: "Device-aware editing for desktop, tablet, and mobile.",
  },
  {
    id: "templates",
    title: "Template Library",
    detail: "Prebuilt layouts and sections to accelerate design.",
  },
  {
    id: "custom-positioning",
    title: "Custom Positioning",
    detail: "Precise layout control using fixed or absolute placement.",
  },
  {
    id: "global-styles",
    title: "Global Styles",
    detail: "Fonts and colors that remain consistent site-wide.",
  },
];

export const createElementorPack = () => ({
  id: "elementor",
  name: "Elementor",
  description: "Drag-and-drop builder pack with responsive editing, widgets, templates, and global styles.",
  enabled: true,
  features: ELEMENTOR_FEATURES,
  capabilities: {
    liveEditor: true,
    widgets: true,
    responsiveEditing: true,
    templates: true,
    customPositioning: true,
    globalStyles: true,
  },
});

export const applyElementorPack = (page, enabled = true) => ({
  ...page,
  builderPacks: {
    ...(page?.builderPacks || {}),
    elementor: {
      ...(page?.builderPacks?.elementor || {}),
      enabled,
      features: ELEMENTOR_FEATURES,
    },
  },
});

export const getElementorCapabilities = (page) =>
  page?.builderPacks?.elementor?.capabilities || createElementorPack().capabilities;
