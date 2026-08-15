import { normalizeElementorProMode } from "./elementorPro";
import { normalizeWPBakeryMode } from "./wpbakery";

export { normalizeElementorProMode, applyElementorProModePatch, getElementorProModeSummary } from "./elementorPro";
export { normalizeWPBakeryMode, applyWPBakeryModePatch, getWPBakeryModeSummary } from "./wpbakery";

export const createBuilderModesState = (page = {}) => ({
  elementorPro: {
    ...normalizeElementorProMode(page),
  },
  wpbakery: {
    ...normalizeWPBakeryMode(page),
  },
});
