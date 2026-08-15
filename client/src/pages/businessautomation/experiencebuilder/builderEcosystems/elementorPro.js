export const ELEMENTOR_PRO_FEATURES = [
  {
    id: "theme-builder",
    title: "Theme Builder",
    detail: "Design headers, footers, archives, single pages, and WooCommerce templates.",
  },
  {
    id: "dynamic-content",
    title: "Dynamic Content",
    detail: "Bind page parts to custom fields, custom post types, and CMS data.",
  },
  {
    id: "form-builder",
    title: "Form Builder",
    detail: "Create forms, collect leads, and route submissions with actions.",
  },
  {
    id: "popup-builder",
    title: "Popup Builder",
    detail: "Create custom popups with display conditions, triggers, and rules.",
  },
  {
    id: "custom-code-css",
    title: "Custom Code & CSS",
    detail: "Add page or template-specific code and styling.",
  },
  {
    id: "woocommerce",
    title: "WooCommerce Builder",
    detail: "Design commerce pages and conversion-focused product flows.",
  },
];

export const createElementorProPack = () => ({
  id: "elementor-pro",
  name: "Elementor Pro",
  description: "Advanced builder pack for theme templates, forms, popups, and dynamic content.",
  enabled: true,
  features: ELEMENTOR_PRO_FEATURES,
  capabilities: {
    themeBuilder: true,
    dynamicContent: true,
    formBuilder: true,
    popupBuilder: true,
    customCode: true,
    woocommerceBuilder: true,
  },
});

export const applyElementorProPack = (page, enabled = true) => ({
  ...page,
  builderPacks: {
    ...(page?.builderPacks || {}),
    "elementor-pro": {
      ...(page?.builderPacks?.["elementor-pro"] || {}),
      enabled,
      features: ELEMENTOR_PRO_FEATURES,
    },
  },
});

export const getElementorProCapabilities = (page) =>
  page?.builderPacks?.["elementor-pro"]?.capabilities || createElementorProPack().capabilities;
