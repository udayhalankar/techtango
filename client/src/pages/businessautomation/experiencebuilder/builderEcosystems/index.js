export { GUTENBERG_FEATURES, applyGutenbergPack, createGutenbergPack, getGutenbergCapabilities } from "./gutenberg";
export { ELEMENTOR_FEATURES, applyElementorPack, createElementorPack, getElementorCapabilities } from "./elementor";
export {
  ELEMENTOR_PRO_FEATURES,
  applyElementorProPack,
  createElementorProPack,
  getElementorProCapabilities,
} from "./elementorPro";
export { WPBAKERY_FEATURES, applyWPBakeryPack, createWPBakeryPack, getWPBakeryCapabilities } from "./wpbakery";

export const createBuilderEcosystemState = (page = {}) => ({
  ...(page?.builderPacks || {}),
  gutenberg: {
    ...(page?.builderPacks?.gutenberg || {}),
    enabled: true,
  },
  elementor: {
    ...(page?.builderPacks?.elementor || {}),
    enabled: true,
  },
  "elementor-pro": {
    ...(page?.builderPacks?.["elementor-pro"] || {}),
    enabled: true,
  },
  wpbakery: {
    ...(page?.builderPacks?.wpbakery || {}),
    enabled: true,
  },
});
