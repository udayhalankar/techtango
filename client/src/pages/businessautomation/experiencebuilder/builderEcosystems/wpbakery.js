export const WPBAKERY_FEATURES = [
  {
    id: "frontend-editor",
    title: "Inline Frontend Editor",
    detail: "Edit content directly on the rendered page.",
  },
  {
    id: "backend-editor",
    title: "Backend Editor",
    detail: "Build content in a schematic layout view.",
  },
  {
    id: "content-elements",
    title: "Content Elements",
    detail: "Use built-in page elements and element presets to build layouts.",
  },
  {
    id: "templates",
    title: "Templates",
    detail: "Reuse prebuilt sections and page structures.",
  },
  {
    id: "role-manager",
    title: "Role Manager",
    detail: "Control element access and editor capabilities by role.",
  },
  {
    id: "third-party",
    title: "Third-party Integrations",
    detail: "Extend with supported plugin elements and add-ons.",
  },
];

export const createWPBakeryPack = () => ({
  id: "wpbakery",
  name: "WPBakery",
  description: "Page builder pack with inline editing, backend editing, content elements, and role controls.",
  enabled: true,
  features: WPBAKERY_FEATURES,
  capabilities: {
    frontendEditor: true,
    backendEditor: true,
    contentElements: true,
    templates: true,
    roleManager: true,
    thirdPartyIntegrations: true,
  },
});

export const applyWPBakeryPack = (page, enabled = true) => ({
  ...page,
  builderPacks: {
    ...(page?.builderPacks || {}),
    wpbakery: {
      ...(page?.builderPacks?.wpbakery || {}),
      enabled,
      features: WPBAKERY_FEATURES,
    },
  },
});

export const getWPBakeryCapabilities = (page) =>
  page?.builderPacks?.wpbakery?.capabilities || createWPBakeryPack().capabilities;
