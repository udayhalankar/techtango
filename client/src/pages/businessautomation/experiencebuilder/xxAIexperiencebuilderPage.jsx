import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../../services/api";
import { AIPageRenderer } from "./AIexperiencebuilder";
import { buildStageOneHtmlPrompt, buildStageTwoJsonPrompt } from "./v2/aiPromptBuilder";
import { validatePageSpec } from "./v2/pageSpecValidator";
import { createDefaultDesignerInput } from "./v2/PageSpecSchema";
import { normalizePageSpec } from "./aiexperiencebuilder/pageSpecNormalizer";
import HtmlPreviewRenderer from "./aiexperiencebuilder/HtmlPreviewRenderer";
import SectionOptionsModal from "./SectionOptionsModal";

const extractPageName = (brief) => {
  const text = String(brief || "").trim();
  if (!text) return "AI Page";
  const firstLine = text.split(/\r?\n/).find(Boolean) || text;
  return firstLine.length > 48 ? `${firstLine.slice(0, 45).trim()}...` : firstLine;
};

const formatRichInteractionSpec = (richSpec = {}) => {
  const lines = [
    richSpec.interactionGoals ? `Interaction goals: ${String(richSpec.interactionGoals).trim()}` : null,
    richSpec.primaryActions ? `Primary actions: ${String(richSpec.primaryActions).trim()}` : null,
    richSpec.buttons ? `Buttons: ${String(richSpec.buttons).trim()}` : null,
    richSpec.tabs ? `Tabs: ${String(richSpec.tabs).trim()}` : null,
    richSpec.forms ? `Forms: ${String(richSpec.forms).trim()}` : null,
    richSpec.charts ? `Charts: ${String(richSpec.charts).trim()}` : null,
    richSpec.dynamicBehavior ? `Dynamic behavior: ${String(richSpec.dynamicBehavior).trim()}` : null,
    richSpec.stateNotes ? `State notes: ${String(richSpec.stateNotes).trim()}` : null,
    richSpec.dataNotes ? `Dummy data: ${String(richSpec.dataNotes).trim()}` : null,
    richSpec.validationNotes ? `Validation: ${String(richSpec.validationNotes).trim()}` : null,
  ].filter(Boolean);

  return lines.join("\n");
};

const composePagePurpose = (brief, generationMode, richSpec) => {
  const sections = [String(brief || "").trim()];

  if (generationMode === "rich") {
    sections.push("Mode: Rich HTML with JS.");
    const spec = formatRichInteractionSpec(richSpec);
    if (spec) sections.push(spec);
  } else {
    sections.push("Mode: Plain HTML.");
    sections.push("Keep the output static, structural, and React-friendly.");
  }

  return sections.filter(Boolean).join("\n\n");
};

const formatErrorDetails = (details) => {
  if (!details) return "";
  if (typeof details === "string") return details;
  if (Array.isArray(details)) return details.map(formatErrorDetails).filter(Boolean).join(", ");

  const parts = [];
  if (details.stage) parts.push(`stage=${details.stage}`);
  if (details.status) parts.push(`status=${details.status}`);
  if (details.statusText) parts.push(`statusText=${details.statusText}`);
  if (details.error) parts.push(`error=${details.error}`);
  if (details.message) parts.push(`message=${details.message}`);
  if (details.code) parts.push(`code=${details.code}`);
  if (details.syscall) parts.push(`syscall=${details.syscall}`);
  if (details.address) parts.push(`address=${details.address}`);
  if (details.port) parts.push(`port=${details.port}`);

  const cause = details.cause;
  if (cause && typeof cause === "object") {
    const causeParts = [];
    if (cause.name) causeParts.push(cause.name);
    if (cause.code) causeParts.push(cause.code);
    if (cause.message) causeParts.push(cause.message);
    if (cause.syscall) causeParts.push(`syscall=${cause.syscall}`);
    if (cause.address) causeParts.push(`address=${cause.address}`);
    if (cause.port) causeParts.push(`port=${cause.port}`);
    if (causeParts.length) parts.push(`cause=${causeParts.join(" | ")}`);
  }

  return parts.join(" | ");
};

const SHELL_SLOT_OPTION_MAP = {
  header: [
    { value: "brandHeader", label: "Brand header" },
    { value: "navigation", label: "Navigation" },
    { value: "text", label: "Text block" },
  ],
  leftMenu: [
    { value: "navigationList", label: "Navigation list" },
    { value: "text", label: "Text block" },
    { value: "quickActions", label: "Quick actions" },
  ],
  rightMenu: [
    { value: "quickActions", label: "Quick actions" },
    { value: "insightsPanel", label: "Insights panel" },
    { value: "text", label: "Text block" },
  ],
  footer: [
    { value: "footerText", label: "Footer text" },
    { value: "linksRow", label: "Links row" },
    { value: "socialLinks", label: "Social links" },
  ],
};

const AI_MODAL_WIDGET_TYPES = ["Chart", "Table", "Text Block", "Image", "Icon", "Form"];
const AI_MODAL_CHART_TYPES = ["Bar", "Line", "Area", "Pie", "Donut"];
const AI_MODAL_AGGREGATIONS = ["actual", "sum", "average", "count"];
const AI_MODAL_IMAGE_POSITIONS = ["center", "top", "bottom", "left", "right"];
const DEFAULT_AI_ROW_HEIGHT = 150;

const getShellSlotLabel = (slotKey) =>
  ({
    header: "Header",
    leftMenu: "Left menu",
    rightMenu: "Right menu",
    footer: "Footer",
  }[slotKey] || "Shell");

const getDefaultWidgetTitle = (type) =>
  ({
    chart: "Chart",
    table: "Table",
    text: "Text block",
    image: "Image",
    kpi: "KPI",
    form: "Form",
  }[String(type || "").toLowerCase()] || "Widget");

const clampRange = (value, min, max) => {
  const next = Math.floor(Number(value) || 0);
  return Math.max(min, Math.min(max, next));
};

const splitHeaderLines = (value) =>
  String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const formatHeaderItemsText = (items = [], withIcon = false) => {
  if (!Array.isArray(items)) return String(items || "");
  return items
    .map((item) => {
      if (!item) return "";
      const label = String(item.label || item.text || item.name || "").trim();
      const url = String(item.url || item.href || item.link || "").trim();
      const iconText = String(item.iconText || item.icon || item.iconUrl || "").trim();
      const parts = [label, url];
      if (withIcon) parts.push(iconText);
      return parts.filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .join("\n");
};

const parseHeaderItemsText = (value, withIcon = false) =>
  splitHeaderLines(value)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
      const label = String(parts[0] || "").trim();
      const url = String(parts[1] || "").trim();
      const iconText = String(parts[2] || label.slice(0, 1) || "").trim();
      const nextItem = withIcon ? { label, url, iconText } : { label, url };
      return nextItem;
    })
    .filter((item) => item.label || item.url || (withIcon && item.iconText));

const buildShellHeaderEditorConfig = (header = {}) => {
  const safeHeader = header && typeof header === "object" ? header : {};
  return {
    type: "brandHeader",
    visible: safeHeader.visible !== false,
    pageWidth: clampRange(safeHeader.pageWidth ?? safeHeader.width ?? 100, 20, 100),
    width: clampRange(safeHeader.width ?? safeHeader.pageWidth ?? 100, 20, 100),
    height: clampRange(safeHeader.height ?? 72, 40, 100),
    logoUrl: String(safeHeader.logoUrl || safeHeader.logoImageUrl || safeHeader.logo?.url || "").trim(),
    logoHeight: clampRange(safeHeader.logoHeight ?? safeHeader.logo?.height ?? 32, 16, 100),
    logoWidth: clampRange(safeHeader.logoWidth ?? safeHeader.logo?.width ?? 20, 5, 20),
    menuItemsText: formatHeaderItemsText(safeHeader.menuItems || safeHeader.items || safeHeader.links || [], false),
    rightIconsText: formatHeaderItemsText(safeHeader.rightIcons || safeHeader.actions || safeHeader.icons || [], true),
  };
};

export default function AIexperiencebuilderPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [generationMode, setGenerationMode] = useState("plain");
  const [richSpec, setRichSpec] = useState({
    interactionGoals: "",
    primaryActions: "",
    buttons: "",
    tabs: "",
    forms: "",
    charts: "",
    dynamicBehavior: "",
    stateNotes: "",
    dataNotes: "",
    validationNotes: "",
  });
  const [generatedSpec, setGeneratedSpec] = useState(null);
  const [generatedArtifacts, setGeneratedArtifacts] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState("prompt");
  const [previewMode, setPreviewMode] = useState("html");
  const [tableOptions, setTableOptions] = useState([]);
  const [columnsByTable, setColumnsByTable] = useState({});
  const [tableRowsByTable, setTableRowsByTable] = useState({});
  const [chromeEditorOpen, setChromeEditorOpen] = useState(false);
  const [chromeTarget, setChromeTarget] = useState(null);
  const [chromeChoice, setChromeChoice] = useState("");
  const [chromeWidgetConfig, setChromeWidgetConfig] = useState({});
  const [chromeSectionPadding, setChromeSectionPadding] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  const [chromeSectionStyle, setChromeSectionStyle] = useState({
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d8dde7",
    borderRadius: 8,
  });
  const [chromeSectionTab, setChromeSectionTab] = useState(0);
  const [chromeRowHeight, setChromeRowHeight] = useState(DEFAULT_AI_ROW_HEIGHT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lastHtmlPreviewRef = useRef("");

  const renderPipeline = useMemo(
    () => `AppShell
  -> PageCanvas
    -> SectionRenderer (section.widgetIds + widget.sectionId)
      -> WidgetRenderer
        -> chart/table/text/image/icon/kpi/form`,
    []
  );

  const openDialog = () => {
    setBrief("");
    setGenerationMode("plain");
    setRichSpec({
      interactionGoals: "",
      primaryActions: "",
      buttons: "",
      tabs: "",
      forms: "",
      charts: "",
      dynamicBehavior: "",
      stateNotes: "",
      dataNotes: "",
      validationNotes: "",
    });
    setError("");
    setCreateOpen(true);
  };

  const loadTableOptions = async () => {
    try {
      const res = await api.get("/crudpages/db/meta/tables");
      const allTables = Array.isArray(res.data) ? res.data : [];
      setTableOptions(allTables.filter((name) => String(name || "").toLowerCase().startsWith("cust_")));
    } catch {
      setTableOptions([]);
    }
  };

  const loadColumns = async (tableName) => {
    const safeTable = String(tableName || "").trim();
    if (!safeTable) return [];
    if (columnsByTable[safeTable]) {
      if (chromeTarget?.kind === "widget" && chromeTarget.widgetId) {
        updateGeneratedWidgetConfig(chromeTarget.widgetId, (currentConfig) => ({
          ...(currentConfig || {}),
          columns: columnsByTable[safeTable],
          tableName: safeTable,
          dataTable: safeTable,
        }));
      }
      return columnsByTable[safeTable];
    }
    try {
      const res = await api.get("/db/columns", { params: { table: safeTable } });
      const rawCols = Array.isArray(res.data?.columns)
        ? res.data.columns
        : Array.isArray(res.data)
          ? res.data
          : [];
      const cols = rawCols.map((column) => column?.column_name || column).filter(Boolean);
      setColumnsByTable((prev) => ({ ...prev, [safeTable]: cols }));
      if (chromeTarget?.kind === "widget" && chromeTarget.widgetId) {
        updateGeneratedWidgetConfig(chromeTarget.widgetId, (currentConfig) => ({
          ...(currentConfig || {}),
          columns: cols,
          tableName: safeTable,
          dataTable: safeTable,
        }));
      }
      return cols;
    } catch {
      setColumnsByTable((prev) => ({ ...prev, [safeTable]: [] }));
      if (chromeTarget?.kind === "widget" && chromeTarget.widgetId) {
        updateGeneratedWidgetConfig(chromeTarget.widgetId, (currentConfig) => ({
          ...(currentConfig || {}),
          columns: [],
          tableName: safeTable,
          dataTable: safeTable,
        }));
      }
      return [];
    }
  };

  const loadTableRows = async (tableName) => {
    const safeTable = String(tableName || "").trim();
    if (!safeTable) return [];
    if (tableRowsByTable[safeTable]) {
      if (chromeTarget?.kind === "widget" && chromeTarget.widgetId) {
        updateGeneratedWidgetConfig(chromeTarget.widgetId, (currentConfig) => ({
          ...(currentConfig || {}),
          dataRows: tableRowsByTable[safeTable],
          tableName: safeTable,
          dataTable: safeTable,
        }));
      }
      return tableRowsByTable[safeTable];
    }
    try {
      const res = await api.get(`/tables/data/${encodeURIComponent(safeTable)}`, {
        params: { limit: 50 },
      });
      const rows = Array.isArray(res.data?.rows)
        ? res.data.rows
        : Array.isArray(res.data)
          ? res.data
          : [];
      setTableRowsByTable((prev) => ({ ...prev, [safeTable]: rows }));
      if (chromeTarget?.kind === "widget" && chromeTarget.widgetId) {
        updateGeneratedWidgetConfig(chromeTarget.widgetId, (currentConfig) => ({
          ...(currentConfig || {}),
          dataRows: rows,
          tableName: safeTable,
          dataTable: safeTable,
        }));
      }
      return rows;
    } catch {
      setTableRowsByTable((prev) => ({ ...prev, [safeTable]: [] }));
      if (chromeTarget?.kind === "widget" && chromeTarget.widgetId) {
        updateGeneratedWidgetConfig(chromeTarget.widgetId, (currentConfig) => ({
          ...(currentConfig || {}),
          dataRows: [],
          tableName: safeTable,
          dataTable: safeTable,
        }));
      }
      return [];
    }
  };

  const closeDialog = () => {
    if (busy) return;
    setCreateOpen(false);
  };

  const updateGeneratedWidgetConfig = (widgetId, updater) => {
    const safeWidgetId = String(widgetId || "").trim();
    if (!safeWidgetId) return;
    setGeneratedSpec((currentSpec) => {
      if (!currentSpec || !Array.isArray(currentSpec.widgets)) return currentSpec;
      let changed = false;
      const nextWidgets = currentSpec.widgets.map((widget) => {
        if (String(widget?.id || "") !== safeWidgetId) return widget;
        changed = true;
        const currentConfig = widget?.config || {};
        const nextConfig = typeof updater === "function" ? updater(currentConfig) : { ...currentConfig, ...(updater || {}) };
        return {
          ...widget,
          config: nextConfig,
        };
      });
      return changed
        ? {
            ...currentSpec,
            widgets: nextWidgets,
          }
        : currentSpec;
    });
  };

  useEffect(() => {
    loadTableOptions();
  }, []);

  const openShellSlotOptions = (slotKey) => {
    const currentShell = generatedSpec?.shell || {};
    const currentHeader = currentShell?.[slotKey] || {};
    setChromeTarget({ kind: "shell", slotKey });
    setChromeChoice(currentHeader?.type || SHELL_SLOT_OPTION_MAP[slotKey]?.[0]?.value || "text");
    setChromeWidgetConfig(
      slotKey === "header"
        ? buildShellHeaderEditorConfig(currentHeader)
        : {}
    );
    setChromeSectionPadding({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    setChromeSectionStyle({
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: "#d8dde7",
      borderRadius: 8,
    });
    setChromeRowHeight(DEFAULT_AI_ROW_HEIGHT);
    setChromeSectionTab(0);
    setChromeEditorOpen(true);
  };

  const openWidgetOptions = (widget) => {
    if (!widget?.id) return;
    const widgetConfig = widget.config || {};
    setChromeTarget({ kind: "widget", widgetId: widget.id });
    setChromeChoice(getDefaultWidgetTitle(widget.type || "chart"));
    setChromeWidgetConfig(widgetConfig);
    setChromeSectionPadding({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    setChromeSectionStyle({
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: "#d8dde7",
      borderRadius: 8,
    });
    setChromeRowHeight(DEFAULT_AI_ROW_HEIGHT);
    setChromeSectionTab(0);
    setChromeEditorOpen(true);
    if (widgetConfig.tableName) {
      void loadColumns(widgetConfig.tableName);
      void loadTableRows(widgetConfig.tableName);
    }
  };

  const handleChromeChoiceChange = (nextValue) => {
    setChromeChoice(nextValue);
  };

  const updateChromeWidgetField = (field, value) => {
    setChromeWidgetConfig((current) => {
      const nextConfig = {
        ...(current || {}),
        [field]: value,
      };
      if (chromeTarget?.kind === "shell" && chromeTarget.slotKey === "header") {
        const persistedHeader = {
          type: "brandHeader",
          visible: true,
          pageWidth: clampRange(nextConfig.pageWidth ?? 100, 20, 100),
          width: clampRange(nextConfig.width ?? 100, 20, 100),
          height: clampRange(nextConfig.height ?? 72, 40, 100),
          logoUrl: String(nextConfig.logoUrl || "").trim(),
          logoImageUrl: String(nextConfig.logoUrl || "").trim(),
          logoHeight: clampRange(nextConfig.logoHeight ?? 32, 16, 100),
          logoWidth: clampRange(nextConfig.logoWidth ?? 20, 5, 20),
          menuItems: parseHeaderItemsText(nextConfig.menuItemsText || nextConfig.menuItems || "", false),
          rightIcons: parseHeaderItemsText(nextConfig.rightIconsText || nextConfig.rightIcons || "", true),
        };
        setGeneratedSpec((currentSpec) => {
          if (!currentSpec) return currentSpec;
          return {
            ...currentSpec,
            shell: {
              ...(currentSpec.shell || {}),
              showHeader: true,
              pageWidth: persistedHeader.pageWidth,
              header: persistedHeader,
            },
          };
        });
      } else if (chromeTarget?.kind === "widget" && chromeTarget.widgetId) {
        updateGeneratedWidgetConfig(chromeTarget.widgetId, (currentConfig) => ({
          ...(currentConfig || {}),
          ...nextConfig,
        }));
      }
      return nextConfig;
    });
  };

  const updateChromeSectionStyleField = (field, value) => {
    setChromeSectionStyle((current) => ({
      ...(current || {}),
      [field]: field === "borderWidth" || field === "borderRadius" ? Number(value) || 0 : value,
    }));
  };

  const updateChromeSectionPaddingSide = (side, value) => {
    setChromeSectionPadding((current) => ({
      ...(current || {}),
      [side]: Math.max(0, Number(value) || 0),
    }));
  };

  const updateChromeRowHeight = (value) => {
    setChromeRowHeight(Math.max(1, Number(value) || DEFAULT_AI_ROW_HEIGHT));
  };

  const handleChromeImageUpload = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      if (chromeTarget?.kind === "shell" && chromeTarget.slotKey === "header") {
        updateChromeWidgetField("logoUrl", dataUrl);
      } else {
        updateChromeWidgetField("src", dataUrl);
      }
    };
    reader.readAsDataURL(file);
    if (event?.target) event.target.value = "";
  };

  const removeChromeSelection = (mode = "component") => {
    setChromeChoice("");
    setChromeWidgetConfig({});
    setChromeTarget(null);
    setChromeEditorOpen(false);
  };

  const handleGenerate = async () => {
    if (!String(brief || "").trim()) {
      setError("Enter a page requirement before generating a blueprint.");
      return;
    }

    setGeneratedSpec(null);
    setGeneratedArtifacts(null);
    setPreviewMode("html");
    lastHtmlPreviewRef.current = "";
    setBusy(true);
    setError("");

    try {
      const composedPurpose = composePagePurpose(brief, generationMode, richSpec);
      const designerInput = createDefaultDesignerInput({
        pageMeta: {
          name: extractPageName(brief),
          purpose: composedPurpose,
          tone: "professional",
          style: "modern",
        },
      });

      const stage1Bundle = buildStageOneHtmlPrompt(designerInput, {
        model: process.env.REACT_APP_OPENAI_MODEL || undefined,
        contentMode: generationMode,
        richSpec,
      });
      setGeneratedArtifacts({
        stage1: {
          userPrompt: stage1Bundle.userPrompt,
        },
        stage2: null,
        htmlPreview: "",
      });

      const stage1Res = await api.post("/experiencebuilder-ai/generate", {
        designerInput,
        prompt: stage1Bundle.userPrompt,
        generationMode: "html",
        model: process.env.REACT_APP_OPENAI_MODEL || undefined,
      });

      const htmlPreview = String(stage1Res.data?.htmlPreview || "").trim();
      if (!htmlPreview) {
        throw new Error("Stage 1 HTML preview was empty.");
      }
      setGeneratedArtifacts((current) => ({
        ...(current || {}),
        htmlPreview,
      }));
      lastHtmlPreviewRef.current = htmlPreview;
      const stage2Bundle = buildStageTwoJsonPrompt(designerInput, htmlPreview, {
        model: process.env.REACT_APP_OPENAI_MODEL || undefined,
        contentMode: generationMode,
        richSpec,
      });

      setGeneratedArtifacts((current) => ({
        ...(current || {}),
        stage2: {
          userPrompt: stage2Bundle.userPrompt,
        },
        htmlPreview,
      }));

      const res = await api.post("/experiencebuilder-ai/generate", {
        designerInput,
        prompt: stage2Bundle.userPrompt,
        schema: stage2Bundle.responseFormat.schema,
        generationMode: "json",
        htmlPreview,
        model: process.env.REACT_APP_OPENAI_MODEL || undefined,
      });

      const normalizedPageSpec = normalizePageSpec(res.data?.pageSpec || res.data, brief);
      const pageSpec = validatePageSpec(normalizedPageSpec);
      setGeneratedSpec(pageSpec);
      setPreviewMode("html");
      setCreateOpen(false);
      setInspectorTab("json");
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to generate blueprint.";
      const details = formatErrorDetails(err?.response?.data?.details || err?.response?.data?.raw || err?.cause);
      if (!lastHtmlPreviewRef.current) {
        setGeneratedSpec(null);
      }
      setError(details ? `${message}${details ? `\n${details}` : ""}` : message);
    } finally {
      setBusy(false);
    }
  };

  const chromeModalSubtitle =
    chromeTarget?.kind === "shell"
      ? chromeTarget.slotKey === "header"
        ? "Configure the header width, logo, menu items, and right-side icons."
        : `${getShellSlotLabel(chromeTarget.slotKey)} placeholder`
      : chromeTarget?.kind === "widget"
        ? "Widget placeholder"
        : "Choose the object type for this placeholder.";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <Box sx={{ bgcolor: "#1f355d", color: "#fff", px: 4, py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          AI Experience Builder
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
          Start with a natural-language brief. The AI will decide the structure, layout, and styling.
        </Typography>
      </Box>

      <Container maxWidth={false} disableGutters sx={{ py: 2, px: 0 }}>
        <Stack gap={2}>
          {error ? (
            <Alert severity="error" sx={{ whiteSpace: "pre-wrap" }}>
              {error}
            </Alert>
          ) : null}

          <Paper elevation={0} sx={{ p: 3, border: "1px solid #d7deea", borderRadius: 3, bgcolor: "#fff" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Create a new AI page</Typography>
                <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                  Give the AI a single plain-English requirement and let it freely generate the page blueprint.
                </Typography>
              </Box>
              <Stack direction="row" gap={1.5} flexWrap="wrap">
                <Button
                  variant="outlined"
                  sx={{ textTransform: "none" }}
                  onClick={() => setInspectorOpen(true)}
                  disabled={!generatedSpec}
                >
                  Inspect Output
                </Button>
                <Button variant="contained" sx={{ textTransform: "none" }} onClick={openDialog}>
                  Create New
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {generatedArtifacts?.htmlPreview ? (
            <Stack gap={1.25}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  border: "1px solid #d7deea",
                  borderRadius: 3,
                  bgcolor: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Preview Mode</Typography>
                  <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                    Switch between the exact HTML output and the React-rendered builder preview.
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  exclusive
                  color="primary"
                  size="small"
                  value={previewMode}
                  onChange={(_event, nextMode) => {
                    if (nextMode) setPreviewMode(nextMode);
                  }}
                >
                  <ToggleButton value="html" sx={{ textTransform: "none", px: 2 }}>
                    HTML preview
                  </ToggleButton>
                  <ToggleButton value="react" sx={{ textTransform: "none", px: 2 }}>
                    React preview
                  </ToggleButton>
                </ToggleButtonGroup>
              </Paper>
              {previewMode === "html" ? (
                <HtmlPreviewRenderer html={generatedArtifacts.htmlPreview} />
              ) : (
                <AIPageRenderer
                  pageSpec={generatedSpec}
                  showEditorChrome
                  onShellSlotOptions={openShellSlotOptions}
                  onWidgetOptions={openWidgetOptions}
                />
              )}
            </Stack>
          ) : generatedSpec ? (
            <AIPageRenderer
              pageSpec={generatedSpec}
              showEditorChrome
              onShellSlotOptions={openShellSlotOptions}
              onWidgetOptions={openWidgetOptions}
            />
          ) : (
            <Paper
              elevation={0}
              sx={{
                minHeight: 240,
                border: "1px dashed #d7deea",
                borderRadius: 3,
                bgcolor: "#fbfcff",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Typography sx={{ color: "#5f6f8a" }}>
                Click Create New, enter a prompt, and generate the first AI blueprint.
              </Typography>
            </Paper>
          )}
        </Stack>
      </Container>

      <Dialog open={createOpen} onClose={closeDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack gap={0.5}>
            <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Create New Page</Typography>
            <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
              Choose a content mode, then describe the page. Plain HTML stays structural. Rich HTML collects interaction intent for React-safe behavior.
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f8fbff" }}>
          <Stack gap={2}>
            <Alert severity="info">
              Example: “Create a professional IT dashboard for tracking customer onboarding with a hero summary, KPI strip, chart, and data table.”
            </Alert>
            <ToggleButtonGroup
              exclusive
              color="primary"
              value={generationMode}
              onChange={(_event, nextMode) => {
                if (nextMode) setGenerationMode(nextMode);
              }}
              sx={{ alignSelf: "flex-start" }}
            >
              <ToggleButton value="plain" sx={{ textTransform: "none", px: 2 }}>
                Plain HTML
              </ToggleButton>
              <ToggleButton value="rich" sx={{ textTransform: "none", px: 2 }}>
                Rich HTML with JS
              </ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label="Page Requirement"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              fullWidth
              multiline
              minRows={8}
              placeholder="Describe the page you want in plain English."
            />
            {generationMode === "rich" ? (
              <Paper elevation={0} sx={{ p: 2, border: "1px solid #d7deea", borderRadius: 2, bgcolor: "#fff" }}>
                <Stack gap={2}>
                  <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Rich interaction spec</Typography>
                  <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                    Collect the interaction intent here. The compiler stays declarative, so these notes guide the AI toward React-safe buttons, tabs, forms, and placeholders.
                  </Typography>
                  <TextField
                    label="Interaction Goals"
                    value={richSpec.interactionGoals}
                    onChange={(event) => setRichSpec((current) => ({ ...current, interactionGoals: event.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Example: Allow the user to switch product tabs, filter a table, and open a detail drawer."
                  />
                  <TextField
                    label="Primary Actions"
                    value={richSpec.primaryActions}
                    onChange={(event) => setRichSpec((current) => ({ ...current, primaryActions: event.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Example: Create, Save Draft, Publish, Export PDF."
                  />
                  <TextField
                    label="Buttons"
                    value={richSpec.buttons}
                    onChange={(event) => setRichSpec((current) => ({ ...current, buttons: event.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Example: Primary CTA, secondary CTA, icon button, segmented action buttons."
                  />
                  <TextField
                    label="Tabs"
                    value={richSpec.tabs}
                    onChange={(event) => setRichSpec((current) => ({ ...current, tabs: event.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Example: Overview, Metrics, Activity, Settings."
                  />
                  <TextField
                    label="Forms"
                    value={richSpec.forms}
                    onChange={(event) => setRichSpec((current) => ({ ...current, forms: event.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Example: Contact form, login form, multi-step registration, filter form."
                  />
                  <TextField
                    label="Charts"
                    value={richSpec.charts}
                    onChange={(event) => setRichSpec((current) => ({ ...current, charts: event.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Example: Line chart for trends, bar chart for category totals, donut chart for share."
                  />
                  <TextField
                    label="Dynamic Behavior"
                    value={richSpec.dynamicBehavior}
                    onChange={(event) => setRichSpec((current) => ({ ...current, dynamicBehavior: event.target.value }))}
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="Example: Clicking a tab swaps content, clicking a row opens a modal, submit updates success state."
                  />
                  <TextField
                    label="State Notes"
                    value={richSpec.stateNotes}
                    onChange={(event) => setRichSpec((current) => ({ ...current, stateNotes: event.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Example: Default active tab is Overview. Sidebar collapsed on mobile."
                  />
                  <TextField
                    label="Dummy Data"
                    value={richSpec.dataNotes}
                    onChange={(event) => setRichSpec((current) => ({ ...current, dataNotes: event.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Example: Use 3 placeholder cards, 4 sample rows, and 1 demo dataset."
                  />
                  <TextField
                    label="Validation Notes"
                    value={richSpec.validationNotes}
                    onChange={(event) => setRichSpec((current) => ({ ...current, validationNotes: event.target.value }))}
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Example: Name and email required, submit button disabled until both are filled."
                  />
                </Stack>
              </Paper>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" onClick={closeDialog} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleGenerate} disabled={busy || !String(brief || "").trim()} sx={{ textTransform: "none" }}>
            {busy ? "Generating..." : "Generate Blueprint"}
          </Button>
        </DialogActions>
      </Dialog>

      <SectionOptionsModal
        open={chromeEditorOpen}
        title="Section Options"
        subtitle={chromeModalSubtitle}
        shellSlotKey={chromeTarget?.kind === "shell" ? chromeTarget.slotKey : ""}
        sectionOptionsTab={chromeSectionTab}
        onSectionOptionsTabChange={setChromeSectionTab}
        showRowConfigurationTab={false}
        splitColumnsCount={2}
        onSplitColumnsCountChange={() => {}}
        onSplitColumns={() => {}}
        splitRowsCount={2}
        onSplitRowsCountChange={() => {}}
        onSplitRows={() => {}}
        selectedWidgetType={chromeChoice}
        onSelectedWidgetTypeChange={handleChromeChoiceChange}
        availableWidgets={AI_MODAL_WIDGET_TYPES}
        widgetConfig={chromeWidgetConfig}
        onUpdateWidgetField={updateChromeWidgetField}
        tableOptions={tableOptions}
        columnsByTable={columnsByTable}
        chartTypes={AI_MODAL_CHART_TYPES}
        aggregations={AI_MODAL_AGGREGATIONS}
        imagePositions={AI_MODAL_IMAGE_POSITIONS}
        onLoadColumns={loadColumns}
        onLoadTableRows={loadTableRows}
        onHandleImageUpload={handleChromeImageUpload}
        sectionPadding={chromeSectionPadding}
        onSetSectionPaddingSide={updateChromeSectionPaddingSide}
        sectionStyle={chromeSectionStyle}
        onUpdateSectionStyleField={updateChromeSectionStyleField}
        rowFormColumns={1}
        onRowFormColumnsChange={() => {}}
        rowFormHeight={chromeRowHeight}
        onRowFormHeightChange={updateChromeRowHeight}
        rowFormPadding={0}
        onRowFormPaddingChange={() => {}}
        rowFormGap={0}
        onRowFormGapChange={() => {}}
        onDuplicateRow={() => {}}
        onDeleteRow={() => {}}
        onSaveRowSettings={() => {}}
        canDeleteRow={false}
        canMergeRight={false}
        canMergeDown={false}
        canUnmerge={false}
        onMergeRight={() => {}}
        onMergeDown={() => {}}
        onUnmerge={() => {}}
        onRemoveComponent={() => removeChromeSelection("component")}
        canRemoveComponent={Boolean(chromeTarget?.nodeKey)}
        onRemoveSection={() => removeChromeSelection("card")}
        canRemoveSection={Boolean(chromeTarget?.nodeKey)}
        onClose={() => setChromeEditorOpen(false)}
      />

      <Dialog open={inspectorOpen} onClose={() => setInspectorOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack gap={0.5}>
            <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Blueprint Inspector</Typography>
            <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
              View the exact prompt, returned JSON, and renderer pipeline used for this page.
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f8fbff" }}>
          <Tabs value={inspectorTab} onChange={(_event, next) => setInspectorTab(next)} sx={{ mb: 2 }}>
            <Tab value="prompt" label="Prompt" />
            <Tab value="html" label="HTML" />
            <Tab value="json" label="JSON" />
            <Tab value="render" label="Render Code" />
          </Tabs>

          {inspectorTab === "prompt" ? (
            <Stack gap={2}>
              <TextField
                label="Stage 1 User Prompt"
                value={generatedArtifacts?.stage1?.userPrompt || ""}
                fullWidth
                multiline
                minRows={8}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Stage 2 User Prompt"
                value={generatedArtifacts?.stage2?.userPrompt || ""}
                fullWidth
                multiline
                minRows={12}
                InputProps={{ readOnly: true }}
              />
            </Stack>
          ) : null}

          {inspectorTab === "html" ? (
            <TextField
              label="HTML Preview"
              value={generatedArtifacts?.htmlPreview || ""}
              fullWidth
              multiline
              minRows={24}
              InputProps={{ readOnly: true, sx: { fontFamily: "monospace", fontSize: 13 } }}
            />
          ) : null}

          {inspectorTab === "json" ? (
            <TextField
              label="Returned JSON"
              value={generatedSpec ? JSON.stringify(generatedSpec, null, 2) : ""}
              fullWidth
              multiline
              minRows={24}
              InputProps={{ readOnly: true, sx: { fontFamily: "monospace", fontSize: 13 } }}
            />
          ) : null}

          {inspectorTab === "render" ? (
            <Stack gap={2}>
              <Alert severity="info">
                The page is rendered from normalized AI JSON. Shell chrome is handled by <b>AppShell</b>, then main content renders through <b>PageCanvas</b>, then section widgets render through <b>SectionRenderer</b> and <b>WidgetRenderer</b>.
              </Alert>
              <TextField
                label="Renderer Pipeline"
                value={renderPipeline}
                fullWidth
                multiline
                minRows={8}
                InputProps={{ readOnly: true, sx: { fontFamily: "monospace", fontSize: 13 } }}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="outlined" onClick={() => setInspectorOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
