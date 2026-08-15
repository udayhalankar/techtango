export const GUTENBERG_FEATURES = [
  {
    id: "blocks",
    title: "Blocks",
    detail: "Composable editor units for text, media, layout, and dynamic content.",
  },
  {
    id: "patterns",
    title: "Block Patterns",
    detail: "Predefined block layouts that can be inserted and customized.",
  },
  {
    id: "reusable-blocks",
    title: "Reusable Blocks",
    detail: "Synced content snippets that update everywhere they are used.",
  },
  {
    id: "templates",
    title: "Templates",
    detail: "Default editor structures for consistent page start states.",
  },
  {
    id: "template-parts",
    title: "Template Parts",
    detail: "Reusable header/footer style building parts for site structure.",
  },
  {
    id: "styles",
    title: "Styles",
    detail: "Theme-level styles and variations for consistent presentation.",
  },
];

export const createGutenbergPack = () => ({
  id: "gutenberg",
  name: "Gutenberg",
  description: "Block editor pack with synced patterns, reusable blocks, templates, and template parts.",
  enabled: true,
  features: GUTENBERG_FEATURES,
  capabilities: {
    blocks: true,
    patterns: true,
    reusableBlocks: true,
    templates: true,
    templateParts: true,
    styles: true,
  },
});

export const applyGutenbergPack = (page, enabled = true) => ({
  ...page,
  builderPacks: {
    ...(page?.builderPacks || {}),
    gutenberg: {
      ...(page?.builderPacks?.gutenberg || {}),
      enabled,
      features: GUTENBERG_FEATURES,
    },
  },
});

export const getGutenbergCapabilities = (page) =>
  page?.builderPacks?.gutenberg?.capabilities || createGutenbergPack().capabilities;
