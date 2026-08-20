import {
  COMPOSITION_MODE_OPTIONS,
  PAGE_SPEC_SCHEMA,
  PAGE_SPEC_SCHEMA_VERSION,
  createDefaultDesignerInput,
} from "./PageSpecSchema";
import { normalizeDesignerInput } from "./pageSpecValidator";

const sectionBlueprints = {
  balanced: [
    { title: "Header / Hero", type: "hero" },
    { title: "Section 2", type: "content" },
    { title: "Footer / Support", type: "footer" },
  ],
  "hero-led": [
    { title: "Hero Spotlight", type: "hero" },
    { title: "Supporting Story", type: "content" },
    { title: "Action Footer", type: "footer" },
  ],
  "split-screen": [
    { title: "Left Narrative", type: "sidebar" },
    { title: "Primary Workspace", type: "content" },
    { title: "Auxiliary Panel", type: "dashboard" },
  ],
  "dashboard-led": [
    { title: "Executive KPIs", type: "dashboard" },
    { title: "Operational Detail", type: "dashboard" },
    { title: "Footer / Support", type: "footer" },
  ],
  "content-led": [
    { title: "Lead Story", type: "content" },
    { title: "Deep Detail", type: "content" },
    { title: "Footer / Support", type: "footer" },
  ],
  "form-led": [
    { title: "Lead Capture", type: "form" },
    { title: "Support Content", type: "content" },
    { title: "Footer / Support", type: "footer" },
  ],
  editorial: [
    { title: "Masthead", type: "hero" },
    { title: "Article Body", type: "content" },
    { title: "Gallery / Related", type: "gallery" },
  ],
};

const buildSectionSummary = (designerInput) => {
  const sectionCount = Math.max(1, Number(designerInput?.layout?.sectionCount) || 3);
  const columns = Math.max(1, Number(designerInput?.layout?.columnsPerSection) || 1);
  const rows = Math.max(1, Number(designerInput?.layout?.rowsPerSection) || 1);
  const widgets = Array.isArray(designerInput?.widgets) ? designerInput.widgets : [];
  const mode = String(designerInput?.layout?.compositionMode || "balanced");
  const blueprint = sectionBlueprints[mode] || sectionBlueprints.balanced;
  return Array.from({ length: sectionCount }, (_item, index) => ({
    id: `section_${index + 1}`,
    title: blueprint[index]?.title || `Section ${index + 1}`,
    type: blueprint[index]?.type || (index === sectionCount - 1 ? "footer" : "content"),
    columns,
    rows,
    width: "full",
    padding: Number(designerInput?.layout?.sectionPadding) || 0,
    gap: Number(designerInput?.layout?.sectionGap) || 0,
    border: Boolean(designerInput?.layout?.sectionBorder),
    borderColor: designerInput?.theme?.borderColor || "#d7deea",
    backgroundColor: designerInput?.theme?.backgroundColor || "#ffffff",
    radius: Number(designerInput?.layout?.sectionRadius) || 0,
    widgetIds: widgets
      .filter((widget) => {
        const sectionId = String(widget?.sectionId || "").trim();
        return sectionId === `section_${index + 1}`;
      })
      .map((widget) => String(widget?.id || "").trim())
      .filter(Boolean),
  }));
};

const buildWidgetSummary = (designerInput) => {
  const sectionCount = Math.max(1, Number(designerInput?.layout?.sectionCount) || 3);
  const widgets = Array.isArray(designerInput?.widgets) ? designerInput.widgets : [];
  return widgets.map((widget, index) => ({
    id: widget.id || `widget_${index + 1}`,
    type: widget.type,
    sectionId: widget.sectionId || `section_${Math.min(sectionCount, 1 + (index % sectionCount))}`,
    title: widget.title || `${widget.type} widget`,
    order: Number.isInteger(widget.order) ? widget.order : index,
    width: Number(widget.width) || 0,
    height: Number(widget.height) || 0,
    visible: widget.visible !== false,
    config: { ...(widget.config || {}) },
  }));
};

const joinList = (values = []) => {
  const items = values.map((value) => String(value || "").trim()).filter(Boolean);
  if (!items.length) return "none";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
};

const formatInteractionSpec = (richSpec = {}) => {
  const spec = richSpec || {};
  const lines = [
    spec.interactionGoals ? `Interaction goals: ${String(spec.interactionGoals).trim()}` : null,
    spec.primaryActions ? `Primary actions: ${String(spec.primaryActions).trim()}` : null,
    spec.buttons ? `Buttons: ${String(spec.buttons).trim()}` : null,
    spec.tabs ? `Tabs: ${String(spec.tabs).trim()}` : null,
    spec.forms ? `Forms: ${String(spec.forms).trim()}` : null,
    spec.charts ? `Charts: ${String(spec.charts).trim()}` : null,
    spec.dynamicBehavior ? `Dynamic behavior: ${String(spec.dynamicBehavior).trim()}` : null,
    spec.stateNotes ? `State notes: ${String(spec.stateNotes).trim()}` : null,
    spec.dataNotes ? `Dummy data: ${String(spec.dataNotes).trim()}` : null,
    spec.validationNotes ? `Validation: ${String(spec.validationNotes).trim()}` : null,
  ].filter(Boolean);

  return lines.length ? lines.join("\n") : "";
};

const inferPageFamily = (brief = "") => {
  const text = String(brief || "").toLowerCase();
  if (/\b(dashboard|chart|charts|table|tables|kpi|analytics|metrics|report)\b/.test(text)) return "dashboard";
  if (/\b(landing|homepage|marketing|campaign|lead)\b/.test(text)) return "landing";
  if (/\b(form|register|signup|onboarding|wizard)\b/.test(text)) return "form";
  if (/\b(article|news|blog|content|editorial)\b/.test(text)) return "editorial";
  if (/\b(pharma|pharmaceutical|medicine|drug|healthcare|medical|clinic|hospital)\b/.test(text)) return "corporate";
  if (/\b(company|business|enterprise|organization|profile|about)\b/.test(text)) return "corporate";
  return "general";
};

const describeWidget = (widget, index) => {
  const title = widget.title || `${widget.type} widget`;
  const section = widget.sectionId || "section_1";
  const config = widget.config || {};
  const parts = [`${index + 1}. ${title}`, `type ${widget.type}`, `place in ${section}`];

  if (widget.type === "chart") {
    parts.push(
      `chart type ${config.chartType || "bar"}`,
      `source table ${config.dataTable || config.tableName || "not specified"}`,
      `x-axis ${config.xAxis || "not specified"}`,
      `y-axis ${config.yAxis || "not specified"}`,
      `aggregation ${config.aggregation || "actual"}`
    );
  } else if (widget.type === "table") {
    parts.push(
      `source table ${config.tableName || config.dataTable || "not specified"}`,
      `row limit ${config.rowLimit || config.limit || 10}`,
      `columns ${joinList(config.columns || [])}`,
      `sort order ${config.sortOrder || "desc"}`
    );
  } else if (widget.type === "text") {
    parts.push(`text source ${config.textSource || "manual"}`, `font size ${config.fontSize || 16}`);
  } else if (widget.type === "image") {
    parts.push(`image fit ${config.imageFit || "contain"}`, `image position ${config.imagePosition || "center"}`);
  } else if (widget.type === "icon") {
    parts.push(`icon key ${config.iconKey || "not specified"}`, `label ${config.label || "none"}`);
  } else if (widget.type === "kpi") {
    parts.push(`kpi label ${config.kpiLabel || "not specified"}`, `trend ${config.trendDirection || "up"}`);
  } else if (widget.type === "form") {
    parts.push(`form name ${config.formName || "lead capture form"}`, `action ${config.action || "ajax"}`);
  } else if (widget.type === "syncedBlock") {
    parts.push(`synced block ${config.blockName || "hero"}`, `sync ${config.sync !== false ? "enabled" : "disabled"}`);
  } else if (widget.type === "templatePart") {
    parts.push(`template part ${config.templatePart || "header"}`, `variant ${config.variant || "default"}`);
  }

  return parts.join(", ");
};

const buildNaturalLanguagePrompt = (designerInput) => {
  const pageMeta = designerInput?.pageMeta || {};
  const shell = designerInput?.shell || {};
  const layout = designerInput?.layout || {};
  const theme = designerInput?.theme || {};
  const behaviors = designerInput?.behaviors || {};
  const widgets = Array.isArray(designerInput?.widgets) ? designerInput.widgets : [];

  const enabledShellParts = [
    shell.showTopNavbar ? "top navbar" : null,
    shell.showHeader ? "header" : null,
    shell.showFooter ? "footer" : null,
    shell.showBottomBar ? "bottom bar" : null,
    shell.showLeftMenu ? "left menu" : null,
    shell.showRightMenu ? "right menu" : null,
  ].filter(Boolean);

  const disabledShellParts = [
    !shell.showTopNavbar ? "top navbar" : null,
    !shell.showHeader ? "header" : null,
    !shell.showFooter ? "footer" : null,
    !shell.showBottomBar ? "bottom bar" : null,
    !shell.showLeftMenu ? "left menu" : null,
    !shell.showRightMenu ? "right menu" : null,
  ].filter(Boolean);

  const widgetLines = widgets.length ? widgets.map(describeWidget).join("\n") : "No widgets were selected.";

  return [
    `Create a ${pageMeta.style || "modern"} ${pageMeta.tone || "professional"} page for ${pageMeta.name || "Untitled Page"}.`,
    pageMeta.purpose ? `The page should ${String(pageMeta.purpose).toLowerCase()}.` : "The page should communicate its purpose clearly and support the selected widgets.",
    pageMeta.audience ? `Target audience: ${pageMeta.audience}.` : null,
    pageMeta.domain ? `Domain: ${pageMeta.domain}.` : null,
    "Avoid a plain default dashboard layout. Use a polished enterprise composition with stronger visual hierarchy, depth, contrast, and spacing.",
    "Prefer a distinct layout personality instead of equal generic blocks. Let the page feel intentionally designed, not templated.",
    "",
    `Use compositionMode ${layout.compositionMode || "balanced"} as design intent, not as a rigid grid.`,
    `Use compositionVariant ${layout.compositionVariant || "insight-led"}, visualWeight ${layout.visualWeight || "high"}, surface ${layout.surface || "elevated"}, alignment ${layout.alignment || "split"}, emphasis ${layout.emphasis || "primary"}, and designSeed ${layout.designSeed || "enterprise-insight-001"} to vary the design.`,
    `Keep exactly ${layout.sectionCount || 3} sections and preserve the requested widget-to-section assignments, but vary section emphasis, surface treatment, typography rhythm, spacing hierarchy, and layout balance.`,
    layout.layoutPreset ? `Treat the layout preset as ${layout.layoutPreset}.` : null,
    `Spacing should use section gap ${layout.sectionGap || 0}, section padding ${layout.sectionPadding || 0}, section radius ${layout.sectionRadius || 0}, and section border ${layout.sectionBorder ? "enabled" : "disabled"}.`,
    layout.fullWidthCanvas ? "The canvas should span the full available width." : "Use a centered canvas if that better fits the design.",
    layout.density ? `Overall density should be ${layout.density}.` : null,
    "",
    enabledShellParts.length ? `Include these shell areas: ${joinList(enabledShellParts)}.` : "Do not include any shell areas unless required for the design.",
    disabledShellParts.length ? `Avoid these shell areas: ${joinList(disabledShellParts)} unless the design specifically needs them.` : null,
    shell.showTopNavbar
      ? `The top navbar should use brand text "${shell.brandName || "Augmis"}" and tagline "${shell.tagline || "Manage Information Effortlessly"}".`
      : null,
    shell.showHeader && shell.pageTitle ? `Show the header title "${shell.pageTitle}".` : null,
    shell.leftMenuCollapsible ? `The left menu should be collapsible using a ${shell.collapseTriggerStyle || "arrow"} trigger.` : null,
    shell.rightMenuCollapsible ? `The right menu should be collapsible using a ${shell.collapseTriggerStyle || "arrow"} trigger.` : null,
    "",
    `Style direction: primary color ${theme.primaryColor || "#1f5fd1"}, accent color ${theme.accentColor || "#4f87ff"}, background ${theme.backgroundColor || "#f7f9fc"}, border ${theme.borderColor || "#d7deea"}, font family ${theme.fontFamily || "Inter, system-ui, sans-serif"}, and icon style ${theme.iconStyle || "outlined"}.`,
    "Use style-specific visual language. For modern and business pages, favor layered cards, tinted surfaces, strong hero/summary bands, and a clear content hierarchy. For IT pages, use sharper structure and denser operational panels. For landing pages, create a hero-led composition with a dominant call-to-action area. For dashboard pages, use KPI strips, charts, and side panels instead of a uniform grid.",
    "Do not repeat the same default three-panel pattern unless the brief truly calls for it. Vary section widths, widget emphasis, and surface treatments based on the brief and the designSeed.",
    behaviors.responsive ? "Make the page responsive." : "Responsive behavior is optional unless needed.",
    behaviors.stickyHeader ? "Use a sticky header if a header is present." : "Keep the header non-sticky unless needed.",
    behaviors.stickyFooter ? "Keep the footer sticky if a footer is present." : "Keep the footer non-sticky.",
    behaviors.collapsibleMenus ? "Menus may collapse on smaller screens." : "Keep menus static unless the design needs collapse behavior.",
    behaviors.animateEntry ? "Use subtle entry animation." : "Keep motion minimal.",
    behaviors.scrollBehavior ? `Scrolling should feel ${behaviors.scrollBehavior}.` : null,
    "",
    "Critical shell rule: header, left menu, right menu, top navbar, footer, and bottom bar are shell chrome only and must not be created as layout sections.",
    "Do not invent extra data widgets. You may add decorative layout treatments through section styling, text content, spacing, and hierarchy when supported by the schema.",
    "Widgets to place:",
    widgetLines,
    "",
    "For charts and tables, choose the exact table, axis, column, row limit, aggregation, and other widget settings that match the selected inputs.",
    "If a widget is a text block, image, icon, KPI, form, synced block, or template part, use the selected details to decide its final content and presentation.",
    "Forms should render visible labels and meaningful field names, not empty unlabeled input shells.",
    "You may improve the layout and visual hierarchy as needed, but keep the selected shell areas and widgets aligned with the user input.",
  ]
  .filter(Boolean)
  .join("\n");
};

const buildFreeformPrompt = (designerInput) => {
  const pageMeta = designerInput?.pageMeta || {};
  const brief = String(pageMeta.purpose || "").trim();
  const pageName = String(pageMeta.name || "Untitled Page").trim();
  const lowerBrief = brief.toLowerCase();
  const dashboardLike = /\b(dashboard|chart|charts|table|tables|kpi|analytics)\b/.test(lowerBrief);
  const chromeLike = /\b(header|footer|top navbar|navbar|left menu|right menu|menu)\b/.test(lowerBrief);

  return [
    `Create a polished React + MUI enterprise page for ${pageName}.`,
    brief ? `User brief: ${brief}` : "User brief: create a page that the AI should fully design from scratch.",
    "Use the brief as the only design input.",
    "Freely decide shell chrome visibility, section structure, widget selection, hierarchy, spacing, and styling.",
    "Do not follow preset controls or hardcoded layout recipes from the UI.",
    "Header, footer, top navbar, left menu, and right menu are shell chrome only. Do not create them as layout sections. Set the appropriate shell visibility fields instead.",
    dashboardLike
      ? "For dashboard pages, use dashboard-led composition, multiple columns, responsive chart grid, and tables below charts. Do not use generic stacked sections."
      : null,
    chromeLike ? "If the user asks for chrome areas such as header, footer, navbar, or menus, render them only through shell chrome." : null,
    "Always output a non-empty layoutPreset value. Use custom unless the brief clearly maps to a named preset.",
    "Create a layout that feels intentionally designed, with one visually dominant area and supporting areas when appropriate.",
    "Use polished enterprise surfaces, layered cards, strong spacing, colored icon placeholders, and an intentional executive feel when the brief suggests a dashboard or analytics page.",
    "Populate all required widget config fields with safe defaults.",
    "For charts, infer realistic placeholder dataTable, xAxis, yAxis, aggregation, legendPosition, and seriesName.",
    "For text widgets, write meaningful dashboard copy.",
    "For icon widgets, use colored icon placeholders with meaningful labels.",
    "Forms should only appear if the brief explicitly asks for one.",
    "Produce an intentionally designed enterprise page, not a generic template.",
  ]
    .filter(Boolean)
    .join("\n");
};

export const buildStageOneHtmlPrompt = (designerInput, options = {}) => {
  const normalized = normalizeDesignerInput(designerInput || createDefaultDesignerInput());
  const revisionId = options.revisionId || `rev_${Date.now()}`;
  const brief = String(normalized?.pageMeta?.purpose || "").trim();
  const contentMode = String(options.contentMode || "plain").toLowerCase();
  const interactionSpec = formatInteractionSpec(options.richSpec);

  const systemPrompt = "";

  const userPrompt = [
    "Create a polished enterprise HTML preview.",
    contentMode === "rich" ? "Content mode: rich HTML with JS-style interaction placeholders." : "Content mode: plain HTML. Keep the page static and structurally faithful.",
    "",
    "Brief:",
    brief || "create a webpage for a pharma company",
    interactionSpec ? ["", "Interaction spec:", interactionSpec].join("\n") : null,
    "",
    "Use CSS grid and flexbox to create a realistic enterprise composition.",
    contentMode === "plain"
      ? "Do not use script blocks or interactive behavior beyond semantic HTML and CSS."
      : "You may include buttons, forms, tabs, chart placeholders, and other interactive-looking markup, but keep the structure deterministic and React-friendly.",
    "Return HTML only.",
  ].join("\n");

  return {
    stage: "html-preview",
    schemaVersion: PAGE_SPEC_SCHEMA_VERSION,
    designerInput: normalized,
    generation: {
      createdAt: new Date().toISOString(),
      source: "experiencebuilder-v2-designer",
      model: options.model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
      promptVersion: "experiencebuilder-v2-stage1-html-v1",
      revisionId,
      notes: "Stage 1 HTML preview for a React + Node + MUI experience builder.",
    },
    systemPrompt,
    userPrompt,
    openAiInput: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: userPrompt }],
      },
    ],
  };
};

export const buildStageTwoJsonPrompt = (designerInput, htmlPreview, options = {}) => {
  const normalized = normalizeDesignerInput(designerInput || createDefaultDesignerInput());
  const revisionId = options.revisionId || `rev_${Date.now()}`;
  const cleanHtml = String(htmlPreview || "").trim();
  const family = inferPageFamily(normalized?.pageMeta?.purpose || "");
  const contentMode = String(options.contentMode || "plain").toLowerCase();
  const interactionSpec = formatInteractionSpec(options.richSpec);
  const pageSpecSeed = {
    schemaVersion: PAGE_SPEC_SCHEMA_VERSION,
    pageMeta: normalized.pageMeta,
    theme: normalized.theme,
    shell: {
      topNavbar: {
        visible: Boolean(normalized.shell.showTopNavbar),
        sticky: Boolean(normalized.behaviors.stickyHeader),
        brandName: normalized.shell.brandName,
        tagline: normalized.shell.tagline,
        logoText: normalized.shell.logoText,
        logoImageUrl: normalized.shell.logoImageUrl || "",
        showUtilityIcons: Boolean(normalized.shell.showUtilityIcons),
        showBreadcrumbs: Boolean(normalized.shell.showBreadcrumbs),
        showHeaderActions: Boolean(normalized.shell.showHeaderActions),
      },
      header: {
        visible: Boolean(normalized.shell.showHeader),
        behavior: normalized.shell.headerBehavior,
        showPageTitle: Boolean(normalized.shell.showPageTitle),
        pageTitle: normalized.shell.pageTitle || normalized.pageMeta.name,
      },
      footer: {
        visible: Boolean(normalized.shell.showFooter),
        behavior: normalized.shell.footerBehavior,
      },
      bottomBar: {
        visible: Boolean(normalized.shell.showBottomBar),
        behavior: normalized.shell.footerBehavior,
      },
      leftMenu: {
        visible: Boolean(normalized.shell.showLeftMenu),
        collapsible: Boolean(normalized.shell.leftMenuCollapsible),
        behavior: normalized.shell.leftMenuBehavior,
        collapseTriggerStyle: normalized.shell.collapseTriggerStyle,
      },
      rightMenu: {
        visible: Boolean(normalized.shell.showRightMenu),
        collapsible: Boolean(normalized.shell.rightMenuCollapsible),
        behavior: normalized.shell.rightMenuBehavior,
        collapseTriggerStyle: normalized.shell.collapseTriggerStyle,
      },
      contentWidth: normalized.shell.contentWidth,
      contentMaxWidth: Number(normalized.shell.contentMaxWidth) || 1440,
      shellPadding: Number(normalized.shell.shellPadding) || 0,
    },
    layout: {
      layoutPreset: normalized.layout.layoutPreset || "custom",
      compositionMode: normalized.layout.compositionMode || "balanced",
      compositionVariant: normalized.layout.compositionVariant || "insight-led",
      visualWeight: normalized.layout.visualWeight || "high",
      surface: normalized.layout.surface || "elevated",
      alignment: normalized.layout.alignment || "split",
      emphasis: normalized.layout.emphasis || "primary",
      designSeed: normalized.layout.designSeed || "enterprise-insight-001",
      sectionCount: Number(normalized.layout.sectionCount) || 1,
      columnsPerSection: Number(normalized.layout.columnsPerSection) || 1,
      rowsPerSection: Number(normalized.layout.rowsPerSection) || 1,
      sectionGap: Number(normalized.layout.sectionGap) || 0,
      sectionPadding: Number(normalized.layout.sectionPadding) || 0,
      sectionRadius: Number(normalized.layout.sectionRadius) || 0,
      sectionBorder: Boolean(normalized.layout.sectionBorder),
      fullWidthCanvas: Boolean(normalized.layout.fullWidthCanvas),
      density: normalized.layout.density || normalized.theme.density || "normal",
      sections: normalized.layout.sections,
    },
    widgets: normalized.widgets,
    behaviors: normalized.behaviors,
    designBrief: {
      pageName: normalized.pageMeta.name,
      style: normalized.pageMeta.style,
      tone: normalized.pageMeta.tone,
      audience: normalized.pageMeta.audience,
      contentMode,
      interactionSpec: interactionSpec || "",
      shell: {
        topNavbar: normalized.shell.showTopNavbar,
        header: normalized.shell.showHeader,
        footer: normalized.shell.showFooter,
        bottomBar: normalized.shell.showBottomBar,
        leftMenu: normalized.shell.showLeftMenu,
        rightMenu: normalized.shell.showRightMenu,
        leftMenuCollapsible: normalized.shell.leftMenuCollapsible,
        rightMenuCollapsible: normalized.shell.rightMenuCollapsible,
      },
      sectionCount: normalized.layout.sectionCount,
      compositionMode: normalized.layout.compositionMode,
      widgetTypes: normalized.widgets.map((widget) => widget.type),
      widgetTargets: normalized.widgets.map((widget) => `${widget.type}:${widget.sectionId}`),
    },
    generation: {
      createdAt: new Date().toISOString(),
      source: "experiencebuilder-v2-designer",
      model: options.model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
      promptVersion: "experiencebuilder-v2-stage2-json-v1",
      revisionId,
      notes: "Stage 2 JSON conversion for a React + Node + MUI experience builder.",
    },
  };

  const systemPrompt = [
    "",
  ].join(" ");

  const userPrompt = [
    "Convert this HTML preview into Experience Builder V2 JSON.",
    `Original user brief: ${String(normalized?.pageMeta?.purpose || "").trim() || "Create a polished enterprise page."}`,
    `Original page name: ${String(normalized?.pageMeta?.name || "Untitled Page").trim()}`,
    `Page family: ${family}`,
    "Rules:",
    "- Header, footer, top navbar, left menu, right menu, and bottom bar are shell chrome only.",
    "- Do not create shell chrome as layout sections.",
    contentMode === "rich"
      ? [
          "- Content mode is rich HTML with JS-style interactions.",
          "- Preserve buttons, tabs, forms, chart placeholders, and other interactive-looking UI as explicit sections, widgets, or behaviors in the JSON output.",
          "- Prefer declarative interaction modeling over arbitrary embedded script logic.",
        ].join("\n")
      : [
          "- Content mode is plain HTML.",
          "- Preserve the structure and styling faithfully, but avoid inventing interactive behavior.",
        ].join("\n"),
    family === "corporate"
      ? [
          "- For corporate webpages, map the HTML into webpage-style sections such as hero, about, products, news, features, trust, and call-to-action areas.",
          "- Do not convert corporate pages into dashboard layouts.",
          "- Preserve the webpage composition from the HTML preview: a visible brand/header area, a strong hero block, supporting content sections, product or service cards, news or research blocks, and a contact/footer area when present.",
          "- Keep the main content visually centered like a polished company website, not full-bleed like an analytics dashboard.",
          "- Render text content as webpage content blocks, not as oversized generic cards.",
          "- Render headings, paragraphs, buttons, product cards, and news items as natural webpage content blocks and widgets.",
          "- Use icon or image widgets for product/service cards when they appear in the HTML preview.",
        ].join("\n")
      : null,
    family === "dashboard"
      ? [
          "- Main canvas content becomes layout.sections.",
          "- Chart cards become chart widgets.",
          "- Table cards become table widgets.",
          "- Text headings become text widgets only when they are part of the main content.",
        ].join("\n")
      : [
          "- Main canvas content becomes layout.sections.",
          "- Use the widget types that best preserve the HTML hierarchy.",
        ].join("\n"),
    "- Preserve the visual hierarchy from the HTML preview.",
    "- Every widget must reference a valid sectionId.",
    "- Every section must list widgetIds that exist.",
    "- Populate all required config fields with safe defaults.",
    "- Return one valid JSON object that matches the Experience Builder V2 schema exactly.",
    cleanHtml ? `HTML preview:\n${cleanHtml}` : "HTML preview: not provided.",
    "Required output: return one valid JSON object matching the Experience Builder V2 schema exactly.",
  ].join("\n");

  return {
    stage: "html-to-json",
    schemaVersion: PAGE_SPEC_SCHEMA_VERSION,
    designerInput: normalized,
    htmlPreview: cleanHtml,
    pageSpecSeed,
    systemPrompt,
    userPrompt,
    openAiInput: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: userPrompt }],
      },
    ],
    responseFormat: {
      type: "json_schema",
      name: "experience_builder_page_spec",
      strict: true,
      schema: PAGE_SPEC_SCHEMA,
    },
  };
};

export function buildAiPagePrompt(designerInput, options = {}) {
  const normalized = normalizeDesignerInput(designerInput || createDefaultDesignerInput());
  const revisionId = options.revisionId || `rev_${Date.now()}`;
  const pageSpecSeed = {
    schemaVersion: PAGE_SPEC_SCHEMA_VERSION,
    pageMeta: normalized.pageMeta,
    theme: normalized.theme,
    shell: {
      topNavbar: {
        visible: Boolean(normalized.shell.showTopNavbar),
        sticky: Boolean(normalized.behaviors.stickyHeader),
        brandName: normalized.shell.brandName,
        tagline: normalized.shell.tagline,
        logoText: normalized.shell.logoText,
        logoImageUrl: normalized.shell.logoImageUrl || "",
        showUtilityIcons: Boolean(normalized.shell.showUtilityIcons),
        showBreadcrumbs: Boolean(normalized.shell.showBreadcrumbs),
        showHeaderActions: Boolean(normalized.shell.showHeaderActions),
      },
      header: {
        visible: Boolean(normalized.shell.showHeader),
        behavior: normalized.shell.headerBehavior,
        showPageTitle: Boolean(normalized.shell.showPageTitle),
        pageTitle: normalized.shell.pageTitle || normalized.pageMeta.name,
      },
      footer: {
        visible: Boolean(normalized.shell.showFooter),
        behavior: normalized.shell.footerBehavior,
      },
      bottomBar: {
        visible: Boolean(normalized.shell.showBottomBar),
        behavior: normalized.shell.footerBehavior,
      },
      leftMenu: {
        visible: Boolean(normalized.shell.showLeftMenu),
        collapsible: Boolean(normalized.shell.leftMenuCollapsible),
        behavior: normalized.shell.leftMenuBehavior,
        collapseTriggerStyle: normalized.shell.collapseTriggerStyle,
      },
      rightMenu: {
        visible: Boolean(normalized.shell.showRightMenu),
        collapsible: Boolean(normalized.shell.rightMenuCollapsible),
        behavior: normalized.shell.rightMenuBehavior,
        collapseTriggerStyle: normalized.shell.collapseTriggerStyle,
      },
      contentWidth: normalized.shell.contentWidth,
      contentMaxWidth: Number(normalized.shell.contentMaxWidth) || 1440,
      shellPadding: Number(normalized.shell.shellPadding) || 0,
    },
    layout: {
      layoutPreset: normalized.layout.layoutPreset || "custom",
      sectionCount: Number(normalized.layout.sectionCount) || 1,
      columnsPerSection: Number(normalized.layout.columnsPerSection) || 1,
      rowsPerSection: Number(normalized.layout.rowsPerSection) || 1,
      sectionGap: Number(normalized.layout.sectionGap) || 0,
      sectionPadding: Number(normalized.layout.sectionPadding) || 0,
      sectionRadius: Number(normalized.layout.sectionRadius) || 0,
      sectionBorder: Boolean(normalized.layout.sectionBorder),
      fullWidthCanvas: Boolean(normalized.layout.fullWidthCanvas),
      density: normalized.layout.density || normalized.theme.density || "normal",
      sections: buildSectionSummary(normalized),
    },
    widgets: buildWidgetSummary(normalized),
    behaviors: normalized.behaviors,
    designBrief: {
      pageName: normalized.pageMeta.name,
      style: normalized.pageMeta.style,
      tone: normalized.pageMeta.tone,
      audience: normalized.pageMeta.audience,
      shell: {
        topNavbar: normalized.shell.showTopNavbar,
        header: normalized.shell.showHeader,
        footer: normalized.shell.showFooter,
        bottomBar: normalized.shell.showBottomBar,
        leftMenu: normalized.shell.showLeftMenu,
        rightMenu: normalized.shell.showRightMenu,
        leftMenuCollapsible: normalized.shell.leftMenuCollapsible,
        rightMenuCollapsible: normalized.shell.rightMenuCollapsible,
      },
      sectionCount: normalized.layout.sectionCount,
      compositionMode: normalized.layout.compositionMode,
      widgetTypes: normalized.widgets.map((widget) => widget.type),
      widgetTargets: normalized.widgets.map((widget) => `${widget.type}:${widget.sectionId}`),
    },
    generation: {
      createdAt: new Date().toISOString(),
      source: "experiencebuilder-v2-designer",
      model: options.model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
      promptVersion: "experiencebuilder-v2-prompt-v1",
      revisionId,
      notes: "Structured page spec for a React + Node + MUI experience builder.",
    },
  };

  const freeformBrief = Boolean(options.freeformBrief);
  const systemPrompt = freeformBrief
    ? [
        "You are an expert React and MUI page architect for Experience Builder V2.",
        "Return JSON only. Do not use markdown fences, prose, or HTML in the final response.",
        "Use the user's brief as the only design input and decide the best shell chrome, layout, widget mix, hierarchy, spacing, and styling freely.",
        "Do not follow preset UI controls or rigid default page recipes.",
        "Header, left menu, right menu, top navbar, footer, and bottom bar are shell chrome only; do not create them as layout sections.",
        "Produce an intentionally designed enterprise page, not a generic template.",
      ].join(" ")
    : [
        "You are an expert React and MUI page architect for Experience Builder V2.",
        "Interpret the user prompt as a natural-language design brief and convert it into a full page spec.",
        "Return JSON only. Do not use markdown fences, prose, or HTML in the final response.",
        "The target application uses React, Node, and MUI components; design with MUI-friendly layout semantics.",
        "Generate a full page spec that maps to sections, shell chrome, widgets, and behaviors.",
        "Critical shell rule: header, left menu, right menu, top navbar, footer, and bottom bar are shell chrome only and must not be created as layout sections.",
        "Default to the shell areas and widgets explicitly requested in the brief. Do not invent extra data widgets or shell chrome that were not asked for.",
        "Use the natural-language widget descriptions to infer chart/table/widget settings, but keep the output schema strict.",
        "Let the page composition vary meaningfully based on style, tone, audience, compositionMode, and the selected widgets.",
        `The layout compositionMode must be respected. Available modes: ${COMPOSITION_MODE_OPTIONS.join(", ")}.`,
        "Do not invent unsupported keys. Only output fields that satisfy the provided JSON schema.",
        "Use conservative, production-ready defaults when the user leaves an option unspecified.",
        "Every widget must reference a valid sectionId and every section must list widgetIds that exist in widgets.",
      ].join(" ");

  const userPrompt = [
    freeformBrief ? buildFreeformPrompt(normalized) : buildNaturalLanguagePrompt(normalized),
    "",
    "Output requirement: return one valid JSON object that matches the provided schema exactly.",
  ].join("\n");

  return {
    schemaVersion: PAGE_SPEC_SCHEMA_VERSION,
    designerInput: normalized,
    pageSpecSeed,
    systemPrompt,
    userPrompt,
    openAiInput: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: systemPrompt,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: userPrompt,
          },
        ],
      },
    ],
    responseFormat: {
      type: "json_schema",
      name: "experience_builder_page_spec",
      strict: true,
      schema: PAGE_SPEC_SCHEMA,
    },
  };
}
