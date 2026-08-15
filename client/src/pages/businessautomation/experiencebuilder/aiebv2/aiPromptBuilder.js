const joinLines = (values = []) => values.map((value) => String(value || "").trim()).filter(Boolean).join("\n");

const buildWidgetManifestSpec = () => [
  "Every widget must be annotated with explicit metadata.",
  'Use data-ai-widget="chart|table|kpi|text|image|form".',
  "Use data-ai-widget-id with a stable unique id.",
  "Use data-ai-title for the widget title.",
  "Use data-ai-table for widgets that bind to a table.",
  "Use data-ai-chart-type for chart widgets.",
  "You may add any other useful data-ai-* attributes that help the parser reconstruct the widget.",
].join(" ");

export const buildStageOneHtmlPrompt = (brief, options = {}) => {
  const pageName = String(options.pageName || "AI Experience Builder").trim();
  const contentMode = String(options.contentMode || "dashboard").trim();
  const dataNotes = String(options.dataNotes || "").trim();
  const briefText = String(brief || "").trim();

  const widgetSpec = [
    buildWidgetManifestSpec(),
    "Include an optional JSON manifest in a script tag with id ai-widget-manifest and type application/json.",
    "The manifest should contain shell, layout, and widgets metadata that mirrors the annotated HTML.",
    "Do not generate guessed JSON layout as the primary output.",
    "The HTML must remain the source of truth.",
  ].join(" ");

  return {
    pageName,
    contentMode,
    userPrompt: joinLines([
      `Create controlled AI-generated HTML for ${pageName}.`,
      `Brief: ${briefText || "Create a dashboard page."}`,
      `Mode: ${contentMode}.`,
      "Return HTML only.",
      "The output must be structurally complete and visually polished.",
      "The HTML must include explicit widget markers and preserve all wrapper classes and inline styles.",
      widgetSpec,
      "Only replace widget-marked nodes in the React preview. All other HTML must render as-is.",
      dataNotes ? `Data notes: ${dataNotes}` : null,
    ]),
  };
};

export default buildStageOneHtmlPrompt;
