import { getStylePreset } from "./EnterpriseStylePresets";

export const resolveThemeTokens = (pageSpec = {}) => {
  const style = String(pageSpec?.pageMeta?.style || pageSpec?.theme?.style || "modern").toLowerCase();
  const preset = getStylePreset(style);
  const theme = pageSpec?.theme || {};
  return {
    style,
    preset,
    colors: {
      primary: theme.primaryColor || preset.palette.primaryColor,
      accent: theme.accentColor || preset.palette.accentColor,
      background: theme.backgroundColor || preset.palette.backgroundColor,
      neutral: theme.neutralColor || preset.palette.neutralColor,
      border: theme.borderColor || preset.palette.borderColor,
      surface: theme.surfaceColor || preset.palette.surfaceColor,
      surfaceMuted: theme.surfaceMutedColor || preset.palette.surfaceMutedColor,
    },
    typography: {
      fontFamily: theme.fontFamily || "Inter, system-ui, sans-serif",
      density: theme.density || preset.density,
      iconStyle: theme.iconStyle || "outlined",
    },
    layout: {
      radii: preset.radii,
      spacing: preset.spacing,
    },
    effects: {
      shadow: preset.shadow,
      sectionShadow: preset.sectionShadow,
    },
  };
};

export default resolveThemeTokens;
