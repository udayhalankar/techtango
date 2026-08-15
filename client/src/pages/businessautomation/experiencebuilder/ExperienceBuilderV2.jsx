import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import api from "../../../services/api";
import Chart from "chart.js/auto";
import { useLocation } from "react-router-dom";
import ThemeToolsDialog from "./themeTools/ThemeToolsDialog";
import DesignerInputPanel from "./v2/DesignerInputPanel";
import { buildAiPagePrompt } from "./v2/aiPromptBuilder";
import { createDefaultDesignerInput } from "./v2/PageSpecSchema";
import { appendRevisionLog, loadRevisionLog } from "./v2/revisionLog";
import { validateDesignerInput, validatePageSpec } from "./v2/pageSpecValidator";
import {
  THEME_TOOL_PRESETS,
  applyThemeToolsPatch,
  buildThemePresetPatch,
  DEFAULT_THEME_TOOLS,
  getThemeWidgetLibrary,
  normalizeThemeTools,
} from "./themeTools/themeTools";

const STORAGE_KEY = "experience_builder_pages_v1";
const PREVIEW_SNAPSHOT_KEY = "experience_builder_preview_snapshot_v1";

const LAYOUT_OPTIONS = [
  { id: "layout-a", name: "Two Column", description: "Balanced workspace", cols: 96, rows: 72 },
  { id: "layout-b", name: "Three Column", description: "Wide canvas center", cols: 96, rows: 72 },
  { id: "layout-c", name: "Dense Builder", description: "High density grid", cols: 96, rows: 72 },
];

const WIDGET_LIBRARY = [
  { type: "text", name: "Text Block", defaultW: 6, defaultH: 3 },
  { type: "kpi", name: "KPI Card", defaultW: 4, defaultH: 3 },
  { type: "chart", name: "Chart", defaultW: 8, defaultH: 5 },
];

const BASE_SECTION_WIDGETS = ["Chart", "Table", "Text Block", "Image", "Icon"];

const SHELL = { headerHeight: 64, leftWidth: 250, rightWidth: 250, bottomHeight: 90 };
const DEFAULT_SHELL_VISIBILITY = {
  navbar: true,
  header: true,
  left: true,
  right: true,
  bottom: true,
  standardPadding: true,
  grid: true,
};
const DEFAULT_SHELL_SIZES = { leftWidth: 250, rightWidth: 250, bottomHeight: 90 };
const CHART_TYPES = ["Bar", "H. Bar", "Line", "Pie", "Doughnut"];
const AGGREGATIONS = ["actual", "count", "avg", "sum"];
const IMAGE_POSITIONS = [
  "center",
  "top-left",
  "top-center",
  "top-right",
  "left",
  "right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const createCanvasRow = (overrides = {}) => ({
  id: `row_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
  columns: 1,
  height: 220,
  padding: 8,
  gap: 8,
  ...overrides,
});

const mapAiWidgetTypeToBuilderType = (widgetType) => {
  const normalized = String(widgetType || "").trim().toLowerCase();
  if (normalized === "chart") return "Chart";
  if (normalized === "table") return "Table";
  if (normalized === "text") return "Text Block";
  if (normalized === "image") return "Image";
  if (normalized === "icon") return "Icon";
  if (normalized === "kpi") return "KPI";
  if (normalized === "form") return "Form";
  if (normalized === "syncedblock") return "Synced Block";
  if (normalized === "templatepart") return "Template Part";
  return "Text Block";
};

const mapAiChartTypeToBuilderType = (chartType) => {
  const normalized = String(chartType || "").trim().toLowerCase();
  if (normalized === "horizontalbar" || normalized === "h. bar" || normalized === "hbar") return "H. Bar";
  if (normalized === "line") return "Line";
  if (normalized === "pie") return "Pie";
  if (normalized === "doughnut") return "Doughnut";
  return "Bar";
};

const normalizeAiWidgetConfig = (widget = {}) => {
  const config = widget?.config || {};
  const rowLimit = Math.max(1, Math.floor(Number(config.rowLimit || config.limit) || 10));
  const textContent = String(config.textContent || config.text || "").trim();
  const imageUrl = String(config.imageUrl || config.src || "").trim();
  const iconLabel = String(config.label || config.iconKey || config.iconText || widget?.title || "").trim();
  const kpiValue = String(config.kpiValue || config.value || "").trim();
  return {
    dataTable: String(config.dataTable || config.tableName || "").trim(),
    chartType: mapAiChartTypeToBuilderType(config.chartType),
    xAxis: String(config.xAxis || "").trim(),
    yAxis: String(config.yAxis || "").trim(),
    aggregation: String(config.aggregation || "actual"),
    legendPosition: String(config.legendPosition || "top"),
    seriesName: String(config.seriesName || widget?.title || "").trim(),
    tableName: String(config.tableName || config.dataTable || "").trim(),
    rowLimit,
    limit: rowLimit,
    columns: Array.isArray(config.columns) ? config.columns.map((col) => String(col)) : [],
    sortOrder: String(config.sortOrder || "asc"),
    emptyStateText: String(config.emptyStateText || ""),
    compact: Boolean(config.compact),
    textContent,
    text: textContent,
    textSource: String(config.textSource || "manual"),
    fontSize: Math.max(1, Math.floor(Number(config.fontSize) || 16)),
    color: String(config.textColor || config.color || "#1e2d4a"),
    textColor: String(config.textColor || config.color || "#1e2d4a"),
    bold: Boolean(config.bold),
    italic: Boolean(config.italic),
    underline: Boolean(config.underline),
    imageUrl,
    src: imageUrl,
    imageFit: String(config.imageFit || config.fit || "contain"),
    fit: String(config.imageFit || config.fit || "contain"),
    imagePosition: String(config.imagePosition || config.position || "center"),
    position: String(config.imagePosition || config.position || "center"),
    alt: String(config.alt || widget?.title || ""),
    iconKey: String(config.iconKey || "").trim(),
    iconColor: String(config.iconColor || config.color || "#1e2d4a"),
    iconSize: Math.max(1, Math.floor(Number(config.iconSize) || 24)),
    label: iconLabel,
    iconText: iconLabel,
    kpiLabel: String(config.kpiLabel || widget?.title || "").trim(),
    kpiValue,
    trend: String(config.trend || ""),
    trendDirection: String(config.trendDirection || ""),
    subtext: String(config.subtext || ""),
    formName: String(config.formName || widget?.title || "").trim(),
    action: String(config.action || "ajax"),
    submitLabel: String(config.submitLabel || "Submit"),
    blockName: String(config.blockName || "").trim(),
    content: String(config.content || ""),
    sync: config.sync !== false,
    templatePart: String(config.templatePart || "header"),
    variant: String(config.variant || "default"),
  };
};

const buildRuntimePageFromDesignerSpec = (pageSpec = {}) => {
  const sections = Array.isArray(pageSpec?.layout?.sections) ? pageSpec.layout.sections : [];
  const widgets = Array.isArray(pageSpec?.widgets) ? pageSpec.widgets : [];
  const canvasRows = sections.length
    ? sections.map((section, index) => ({
        id: section?.id || `row_${index + 1}`,
        columns: Math.max(1, Math.floor(Number(section?.columns) || 1)),
        height: Math.max(220, Math.floor(Number(section?.rows) || 1) * 180 || 220),
        padding: Math.max(0, Math.floor(Number(section?.padding) || 0)),
        gap: Math.max(0, Math.floor(Number(section?.gap) || 0)),
      }))
    : normalizeCanvasRows(null, Math.max(2, Math.floor(Number(pageSpec?.layout?.sectionCount) || 3)));
  const sectionMerges = [];
  const sectionConfigs = {};
  sections.forEach((section, index) => {
    const rowColumns = Math.max(1, Math.floor(Number(section?.columns) || 1));
    if (rowColumns > 1) {
      sectionMerges.push({ row: index, col: 0, rowSpan: 1, colSpan: rowColumns });
    }
    const sectionWidgets = widgets
      .filter((widget) => String(widget?.sectionId || "") === String(section?.id || ""))
      .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
    const primaryWidget = sectionWidgets[0] || null;
    sectionConfigs[`${index}:0`] = {
      widgetType: primaryWidget ? mapAiWidgetTypeToBuilderType(primaryWidget?.type) : "",
      widgetConfig: primaryWidget ? normalizeAiWidgetConfig(primaryWidget || {}) : {},
      widgets: sectionWidgets.map((widget) => ({
        ...widget,
        title: widget?.title || widget?.type || "Widget",
        config: normalizeAiWidgetConfig(widget),
      })),
      style: {
        ...defaultSectionStyle,
        heightPercent: 100,
        backgroundColor: section?.backgroundColor || "#ffffff",
        borderWidth: section?.border === false ? 0 : 1,
        borderColor: section?.borderColor || "#d8dde7",
        borderRadius: Math.max(0, Math.floor(Number(section?.radius) || 0)),
      },
      paddingTop: Math.max(0, Math.floor(Number(section?.padding) || 0)),
      paddingRight: Math.max(0, Math.floor(Number(section?.padding) || 0)),
      paddingBottom: Math.max(0, Math.floor(Number(section?.padding) || 0)),
      paddingLeft: Math.max(0, Math.floor(Number(section?.padding) || 0)),
      title: section?.title || "",
      sectionType: section?.type || "content",
      sectionId: section?.id || `section_${index + 1}`,
      widgetIds: Array.isArray(section?.widgetIds) ? section.widgetIds : sectionWidgets.map((widget) => widget?.id).filter(Boolean),
    };
  });

  return {
    shell: pageSpec?.shell || {},
    shellSizes: pageSpec?.shellSizes || {},
    cols: Math.max(1, Math.floor(Number(pageSpec?.cols) || 96)),
    rows: Math.max(1, Math.floor(Number(pageSpec?.rows) || 72)),
    widgets,
    theme: pageSpec?.theme || {},
    behaviors: pageSpec?.behaviors || {},
    canvasLayoutRows: Math.max(2, sections.length || Math.floor(Number(pageSpec?.layout?.sectionCount) || 3)),
    canvasRows,
    sectionMerges,
    sectionConfigs,
    generatedSpec: pageSpec,
  };
};

const normalizeCanvasRows = (canvasRows, fallbackCount = 3) => {
  if (Array.isArray(canvasRows) && canvasRows.length > 0) {
    return canvasRows.map((row, index) => ({
      // Backward-compat: old rows stored proportional unit values like 1/2/3.
      // Treat very small values as legacy units and convert them to practical px.
      id: row?.id || `row_existing_${index}`,
      columns: clamp(Number(row?.columns) || 1, 1, 8),
      height: (() => {
        const raw = Math.floor(Number(row?.height) || 0);
        if (raw <= 0) return 220;
        if (raw <= 20) return raw * 220;
        return raw;
      })(),
      padding: Math.max(0, Math.floor(Number(row?.padding) || 0)),
      gap: Math.max(0, Math.floor(Number(row?.gap) || 0)),
    }));
  }
  const count = Math.max(2, Math.floor(Number(fallbackCount) || 3));
  return Array.from({ length: count }, () => createCanvasRow());
};

const parsePages = (raw) => {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeLoadPages = () => {
  try {
    return parsePages(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
};

const safeSavePages = (pages) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // Ignore storage write issues in restricted/private browser modes.
  }
};

const safeLoadPreviewSnapshot = () => {
  try {
    const raw = localStorage.getItem(PREVIEW_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.pages)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const safeSavePreviewSnapshot = (pages, activePageId) => {
  try {
    localStorage.setItem(
      PREVIEW_SNAPSHOT_KEY,
      JSON.stringify({
        pages,
        activePageId,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore snapshot write issues; preview can still fall back to saved pages.
  }
};

const normalizeExperienceLayoutDefinition = (layoutDefinition) => {
  if (!layoutDefinition) return {};
  if (typeof layoutDefinition === "string") {
    try {
      return JSON.parse(layoutDefinition);
    } catch {
      return {};
    }
  }
  return layoutDefinition;
};

const normalizeExperienceLayoutRecord = (row, index = 0) => {
  const layoutDefinition = normalizeExperienceLayoutDefinition(row?.layout_definition || row?.layoutDefinition);
  return {
    id: String(row?.id ?? layoutDefinition?.id ?? `layout_${index + 1}`),
    name:
      row?.layout_name ||
      row?.dashboard_name ||
      row?.experience_name ||
      row?.page_name ||
      layoutDefinition?.name ||
      `Layout ${index + 1}`,
    description: row?.description || layoutDefinition?.description || "",
    cols: Math.max(1, Math.floor(Number(layoutDefinition?.cols) || 96)),
    rows: Math.max(1, Math.floor(Number(layoutDefinition?.rows) || 72)),
    layoutDefinition,
    tenantId: row?.tenant_id ?? null,
    status: row?.status || "Active",
  };
};

const normalizeExperiencePageRecord = (row, index = 0) => {
  const layout = normalizeExperienceLayoutDefinition(row?.layout);
  const pageData = Object.keys(layout || {}).length ? layout : row || {};
  const runtimeFromSpec = pageData?.generatedSpec ? buildRuntimePageFromDesignerSpec(pageData.generatedSpec) : null;
  const pageId = String(row?.id ?? pageData?.id ?? `pg_${index + 1}`);
  const shell = pageData?.generatedSpec
    ? { ...(pageData?.shell || {}) }
    : { ...(DEFAULT_SHELL_VISIBILITY || {}), ...(pageData?.shell || {}) };
  const shellSizes = { ...(DEFAULT_SHELL_SIZES || {}), ...(pageData?.shellSizes || {}) };
  const canvasLayoutRows = Math.max(
    2,
    Math.floor(Number(pageData?.canvasLayoutRows || runtimeFromSpec?.canvasLayoutRows) || 3)
  );

  return {
    ...pageData,
    id: pageId,
    name: pageData?.name || row?.page_name || `Experience Page ${index + 1}`,
    description: row?.description || pageData?.description || "",
    layoutId: pageData?.layoutId || pageData?.layout_id || null,
    layoutName:
      pageData?.layoutName ||
      row?.page_name ||
      row?.dashboard_name ||
      row?.layout_name ||
      row?.experience_name ||
      pageData?.name ||
      "",
    cols: Math.max(1, Math.floor(Number(pageData?.cols) || 96)),
    rows: Math.max(1, Math.floor(Number(pageData?.rows) || 72)),
    widgets: Array.isArray(pageData?.widgets) ? pageData.widgets : [],
    shell,
    shellSizes,
    canvasLayoutRows,
    canvasRows: normalizeCanvasRows(pageData?.canvasRows || runtimeFromSpec?.canvasRows, canvasLayoutRows),
    sectionMerges: Array.isArray(pageData?.sectionMerges) ? pageData.sectionMerges : [],
    sectionConfigs: pageData?.sectionConfigs || runtimeFromSpec?.sectionConfigs || {},
    canvasBadgePosition: pageData?.canvasBadgePosition || null,
    createdAt: pageData?.createdAt || row?.date_created || new Date().toISOString(),
    updatedAt: row?.date_modified || pageData?.updatedAt || null,
    pageUrl: row?.page_url || pageData?.pageUrl || "",
    status: row?.status || pageData?.status || "Active",
  };
};

const widgetTitle = (widget) => {
  if (widget.type === "text") return "Text Block";
  if (widget.type === "kpi") return "KPI Card";
  if (widget.type === "chart") return "Chart Widget";
  if (widget.type === "image") return "Image";
  if (widget.type === "icon") return "Icon";
  if (widget.type === "form") return "Form";
  if (widget.type === "syncedBlock") return "Synced Block";
  if (widget.type === "templatePart") return "Template Part";
  return "Widget";
};

const defaultSectionStyle = {
  heightPercent: 100,
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: "#d8dde7",
  borderRadius: 8,
};

const defaultWidgetConfig = (widgetType) => {
  if (widgetType === "Chart") {
    return {
      tableName: "",
      chartType: "",
      chartName: "",
      xAxis: "",
      yAxis: "",
      aggregation: "actual",
    };
  }
  if (widgetType === "Table") {
    return {
      tableName: "",
      limit: 10,
    };
  }
  if (widgetType === "Text Block") {
    return {
      text: "",
      fontSize: 16,
      color: "#1e2d4a",
      bold: false,
      italic: false,
      underline: false,
    };
  }
  if (widgetType === "Image") {
    return {
      src: "",
      fit: "contain",
      position: "center",
    };
  }
  if (widgetType === "Icon") {
    return {
      iconText: "*",
      color: "#1e2d4a",
      fontSize: 24,
    };
  }
  if (widgetType === "Form") {
    return {
      formName: "",
      submitLabel: "Submit",
      action: "ajax",
    };
  }
  if (widgetType === "Synced Block") {
    return {
      blockName: "hero",
      sync: true,
      content: "Shared synced content",
    };
  }
  if (widgetType === "Template Part") {
    return {
      templatePart: "header",
      variant: "default",
    };
  }
  return {};
};

const toChartJsType = (chartType) => {
  if (chartType === "Bar") return "bar";
  if (chartType === "H. Bar") return "bar";
  if (chartType === "Line") return "line";
  if (chartType === "Pie") return "pie";
  if (chartType === "Doughnut") return "doughnut";
  return "bar";
};

const readNumeric = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const resolveSectionPadding = (config = {}) => {
  const legacy = Math.max(0, Math.floor(readNumeric(config?.padding, 0)));
  return {
    top: Math.max(0, Math.floor(readNumeric(config?.paddingTop, legacy))),
    right: Math.max(0, Math.floor(readNumeric(config?.paddingRight, legacy))),
    bottom: Math.max(0, Math.floor(readNumeric(config?.paddingBottom, legacy))),
    left: Math.max(0, Math.floor(readNumeric(config?.paddingLeft, legacy))),
  };
};

const normalizeColumnNames = (rawColumns) => {
  if (!Array.isArray(rawColumns)) return [];
  return rawColumns
    .map((col) => {
      if (typeof col === "string") return col;
      if (col && typeof col === "object") {
        return col.column_name || col.name || col.field || "";
      }
      return "";
    })
    .map((name) => String(name || "").trim())
    .filter(Boolean);
};

const renderChartValues = (rows, xAxis, yAxis, aggregation) => {
  if (!Array.isArray(rows) || !xAxis || !yAxis) {
    return { labels: [], values: [] };
  }
  const groups = new Map();
  rows.forEach((row) => {
    const label = String(row?.[xAxis] ?? "").trim();
    if (!label) return;
    const valueRaw = row?.[yAxis];
    const value = Number(valueRaw);
    const numeric = Number.isFinite(value) ? value : 0;
    if (!groups.has(label)) {
      groups.set(label, { sum: 0, count: 0 });
    }
    const item = groups.get(label);
    item.sum += numeric;
    item.count += 1;
  });
  const labels = Array.from(groups.keys());
  const values = labels.map((label) => {
    const item = groups.get(label);
    if (!item) return 0;
    if (aggregation === "count") return item.count;
    if (aggregation === "avg") return item.count ? item.sum / item.count : 0;
    if (aggregation === "sum") return item.sum;
    return item.sum;
  });
  return { labels, values };
};

function SectionChart({ config, rows }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const prepared = useMemo(
    () => renderChartValues(rows, config?.xAxis, config?.yAxis, config?.aggregation),
    [rows, config?.xAxis, config?.yAxis, config?.aggregation]
  );

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    if (!canvasRef.current) return;
    if (!config?.chartType || !prepared.labels.length) return;

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top", align: "start" } },
    };
    if (config.chartType === "H. Bar") {
      options.indexAxis = "y";
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: toChartJsType(config.chartType),
      data: {
        labels: prepared.labels,
        datasets: [
          {
            label: config.chartName || config.tableName || "Dataset",
            data: prepared.values,
          },
        ],
      },
      options,
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config, prepared]);

  if (!config?.tableName || !config?.chartType || !config?.xAxis || !config?.yAxis) {
    return (
      <Typography sx={{ fontSize: 12, color: "#8a97ad" }}>
        Configure chart fields.
      </Typography>
    );
  }
  if (!prepared.labels.length) {
    return (
      <Typography sx={{ fontSize: 12, color: "#8a97ad" }}>
        No chart data available.
      </Typography>
    );
  }

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", minHeight: 120 }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </Box>
  );
}

export default function ExperienceBuilder() {
  const location = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStarterPresetId, setSelectedStarterPresetId] = useState(DEFAULT_THEME_TOOLS.starterPresetId);
  const [configurePageOpen, setConfigurePageOpen] = useState(false);
  const [rowModalOpen, setRowModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [themeToolsOpen, setThemeToolsOpen] = useState(false);
  const [designerInitialValue, setDesignerInitialValue] = useState(() => createDefaultDesignerInput());
  const [designerPreviewSpec, setDesignerPreviewSpec] = useState(null);
  const [designerPromptBundle, setDesignerPromptBundle] = useState(null);
  const [designerBusy, setDesignerBusy] = useState(false);
  const [designerCommitting, setDesignerCommitting] = useState(false);
  const [designerError, setDesignerError] = useState("");
  const [revisionEntries, setRevisionEntries] = useState(() => loadRevisionLog());
  const [sectionOptionsTab, setSectionOptionsTab] = useState(0);
  const [selectedLayoutId, setSelectedLayoutId] = useState(LAYOUT_OPTIONS[0].id);
  const [experienceLayouts, setExperienceLayouts] = useState([]);
  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [mode, setMode] = useState("edit");
  const [canvasHeight, setCanvasHeight] = useState(520);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [rowFormColumns, setRowFormColumns] = useState(1);
  const [rowFormHeight, setRowFormHeight] = useState(1);
  const [rowFormPadding, setRowFormPadding] = useState(8);
  const [rowFormGap, setRowFormGap] = useState(8);
  const [selectedSection, setSelectedSection] = useState(null);
  const [splitColumnsCount, setSplitColumnsCount] = useState(2);
  const [splitRowsCount, setSplitRowsCount] = useState(2);
  const [tableOptions, setTableOptions] = useState([]);
  const [columnsByTable, setColumnsByTable] = useState({});
  const [tableRowsByTable, setTableRowsByTable] = useState({});
  const [tableErrorsByTable, setTableErrorsByTable] = useState({});
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState({ open: false, severity: "success", message: "" });
  const canvasRef = useRef(null);
  const pageShellRef = useRef(null);
  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);
  const shellResizeRef = useRef(null);
  const canvasBadgeDragRef = useRef(null);

  const describeApiError = (error, fallbackMessage) => {
    const status = error?.response?.status ? `HTTP ${error.response.status}` : "";
    const responseData = error?.response?.data;
    const serverMessage =
      responseData?.error ||
      responseData?.message ||
      (typeof responseData === "string" ? responseData : "") ||
      "";
    const code = error?.response?.data?.code || error?.code || "";
    const clientMessage = error?.message || fallbackMessage;
    return [status, code, serverMessage, clientMessage].filter(Boolean).join(" - ");
  };

  const notify = (severity, message) => {
    setNotice({ open: true, severity, message });
  };

  const searchParams = useMemo(() => new URLSearchParams(location.search || ""), [location.search]);
  const queryPageId = searchParams.get("page");
  const queryPublishedId = searchParams.get("pagepub");
  const isPreviewMode = searchParams.get("preview") === "1";
  const isPublishedMode = Boolean(queryPublishedId);

  const layoutOptions = useMemo(() => {
    if (Array.isArray(experienceLayouts) && experienceLayouts.length > 0) {
      return experienceLayouts;
    }
    return LAYOUT_OPTIONS;
  }, [experienceLayouts]);

  const filteredPages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((page) => {
      const name = String(page.name || page.page_name || "").toLowerCase();
      const layout = String(page.layoutName || "").toLowerCase();
      const status = String(page.status || "").toLowerCase();
      return name.includes(q) || layout.includes(q) || status.includes(q) || String(page.id || "").includes(q);
    });
  }, [pages, search]);

  const selectedLayout = useMemo(
    () => layoutOptions.find((layout) => layout.id === selectedLayoutId) || layoutOptions[0],
    [layoutOptions, selectedLayoutId]
  );

  useEffect(() => {
    if (!layoutOptions.length) return;
    const exists = layoutOptions.some((layout) => String(layout.id) === String(selectedLayoutId));
    if (!exists) {
      setSelectedLayoutId(layoutOptions[0].id);
    }
  }, [layoutOptions, selectedLayoutId]);

  const activePage = useMemo(
    () => pages.find((page) => String(page.id) === String(activePageId)) || null,
    [pages, activePageId]
  );

  const activeLayout = useMemo(() => {
    if (!activePage) return selectedLayout;
    return (
      layoutOptions.find((layout) => layout.id === activePage.layoutId) || {
        ...selectedLayout,
        cols: activePage.cols,
        rows: activePage.rows,
      }
    );
  }, [activePage, layoutOptions, selectedLayout]);

  const themeTools = useMemo(() => normalizeThemeTools(activePage?.themeTools), [activePage?.themeTools]);
  const activeWidgetLibrary = useMemo(
    () => getThemeWidgetLibrary(WIDGET_LIBRARY, themeTools),
    [themeTools]
  );

  const shellVisibility = useMemo(
    () =>
      activePage?.generatedSpec
        ? { ...(activePage?.shell || {}) }
        : { ...DEFAULT_SHELL_VISIBILITY, ...(activePage?.shell || {}) },
    [activePage]
  );
  const effectiveShellVisibility = useMemo(
    () => ({
      ...shellVisibility,
    }),
    [shellVisibility]
  );
  const gridMarkersVisible = effectiveShellVisibility.grid !== false;

  const shellSizes = useMemo(
    () => ({ ...DEFAULT_SHELL_SIZES, ...(activePage?.shellSizes || {}) }),
    [activePage]
  );

  const canvasLayoutRows = useMemo(() => {
    const raw = Number(activePage?.canvasLayoutRows);
    if (!Number.isFinite(raw)) return 3;
    return Math.max(2, Math.floor(raw));
  }, [activePage]);

  const canvasRows = useMemo(
    () => normalizeCanvasRows(activePage?.canvasRows, canvasLayoutRows),
    [activePage, canvasLayoutRows]
  );

  const rowGeometry = useMemo(() => {
    const totalPx = canvasRows.reduce((sum, row) => sum + Math.max(1, Number(row.height) || 0), 0) || 1;
    let cumulativePx = 0;
    return canvasRows.map((row, index) => {
      const rowHeightPx = Math.max(1, Number(row.height) || 1);
      const startPct = (cumulativePx / totalPx) * 100;
      const heightPct = (rowHeightPx / totalPx) * 100;
      cumulativePx += rowHeightPx;
      return { row, index, startPct, heightPct };
    });
  }, [canvasRows]);

  const selectedSectionConfig = useMemo(() => {
    if (!selectedSection || !activePage) return null;
    const current = activePage.sectionConfigs?.[selectedSection.anchorKey] || {};
    const widgetType = current.widgetType || "";
    const widgetConfig = { ...defaultWidgetConfig(widgetType), ...(current.widgetConfig || {}) };
    const style = { ...defaultSectionStyle, ...(current.style || {}) };
    const padding = resolveSectionPadding(current);
    return {
      ...current,
      widgetType,
      widgetConfig,
      style,
      paddingTop: padding.top,
      paddingRight: padding.right,
      paddingBottom: padding.bottom,
      paddingLeft: padding.left,
    };
  }, [selectedSection, activePage]);

  const availableSectionWidgets = useMemo(
    () =>
      BASE_SECTION_WIDGETS.filter((widgetType) => {
        const pluginFlags = themeTools.plugins || {};
        if (widgetType === "Chart" || widgetType === "Table") return pluginFlags.analyticsWidgets !== false;
        if (widgetType === "Image" || widgetType === "Icon") return pluginFlags.mediaWidgets !== false;
        return pluginFlags.textWidgets !== false;
      }),
    [themeTools]
  );

  const setActivePagePatch = (patcher) => {
    setPages((prev) =>
      prev.map((page) => (String(page.id) === String(activePageId) ? patcher(page) : page))
    );
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [pagesRes, layoutsRes] = await Promise.all([
          api.get("/experiencebuilder"),
          api.get("/experiencelayouts"),
        ]);
        if (cancelled) return;

        const backendLayouts = Array.isArray(layoutsRes.data)
          ? layoutsRes.data.map((row, index) => normalizeExperienceLayoutRecord(row, index))
          : [];
        setExperienceLayouts(backendLayouts.length ? backendLayouts : LAYOUT_OPTIONS);

        const backendPages = Array.isArray(pagesRes.data)
          ? pagesRes.data.map((row, index) => normalizeExperiencePageRecord(row, index))
          : [];
        const legacyPages = safeLoadPages().map((row, index) => normalizeExperiencePageRecord(row, index));

        const previewSnapshot = isPreviewMode ? safeLoadPreviewSnapshot() : null;
        const snapshotPages = Array.isArray(previewSnapshot?.pages)
          ? previewSnapshot.pages.map((page, index) => normalizeExperiencePageRecord(page, index))
          : [];
        const snapshotHasQuery = queryPageId
          ? snapshotPages.some((page) => String(page.id) === String(queryPageId))
          : false;

        const useSnapshot = isPreviewMode && snapshotPages.length > 0;
        const activePages = useSnapshot ? snapshotPages : backendPages.length > 0 ? backendPages : legacyPages;
        const routePageId = queryPageId || queryPublishedId;
        if (routePageId) {
          if (queryPublishedId) {
            try {
              const pageRes = await api.get(`/experiencebuilder/${encodeURIComponent(routePageId)}`);
              const pageRow = pageRes.data || {};
              const publishedLayoutId = Number(pageRow?.layout?.publishedLayoutId) || Number(pageRow?.publishedLayoutId) || null;

              const publishedLayouts = backendLayouts.filter(
                (layout) => String(layout.status || "").toLowerCase() === "published"
              );
              const layoutPool = [
                ...publishedLayouts,
                ...backendLayouts.filter(
                  (layout) => String(layout.status || "").toLowerCase() !== "published"
                ),
              ];
              let layoutRow =
                layoutPool.find((layout) => String(layout.id) === String(publishedLayoutId)) ||
                layoutPool.find(
                  (layout) =>
                    String(layout.name || "").trim().toLowerCase() ===
                    String(pageRow?.page_name || pageRow?.name || "").trim().toLowerCase()
                ) ||
                layoutPool.find(
                  (layout) =>
                    String(layout.name || "").trim().toLowerCase() ===
                    String(pageRow?.layout?.name || pageRow?.layout?.layoutName || "").trim().toLowerCase()
                ) ||
                null;

              if (!layoutRow) {
                throw new Error("Published page is not available.");
              }

              const draftLayout = normalizeExperienceLayoutDefinition(pageRow?.layout || {});
              const publishedLayout = normalizeExperienceLayoutDefinition(layoutRow.layout_definition || {});
              const mergedLayout = {
                ...draftLayout,
                ...publishedLayout,
              };

              const publishedPage = normalizeExperiencePageRecord(
                {
                  ...pageRow,
                  id: routePageId,
                  page_name: layoutRow.dashboard_name || pageRow.page_name,
                  description: layoutRow.description || pageRow.description,
                  status: "Published",
                  layout: mergedLayout,
                },
                0
              );
              publishedPage.publishedLayoutId = publishedLayoutId || Number(layoutRow.id) || null;
              publishedPage.pageUrl = pageRow.page_url || "";
              publishedPage.layout = mergedLayout;
              publishedPage.status = "Published";
              publishedPage.name = layoutRow.dashboard_name || publishedPage.name;
              publishedPage.layoutName = layoutRow.dashboard_name || publishedPage.layoutName || publishedPage.name;
              publishedPage.description = layoutRow.description || publishedPage.description;
              publishedPage.cols = Math.max(1, Math.floor(Number(mergedLayout?.cols) || publishedPage.cols || 96));
              publishedPage.rows = Math.max(1, Math.floor(Number(mergedLayout?.rows) || publishedPage.rows || 72));
              publishedPage.canvasLayoutRows = Math.max(
                2,
                Math.floor(Number(mergedLayout?.canvasLayoutRows) || publishedPage.canvasLayoutRows || 3)
              );
              publishedPage.canvasRows = normalizeCanvasRows(
                mergedLayout?.canvasRows || publishedPage.canvasRows,
                publishedPage.canvasLayoutRows
              );
              publishedPage.sectionMerges = Array.isArray(mergedLayout?.sectionMerges)
                ? mergedLayout.sectionMerges
                : publishedPage.sectionMerges;
              publishedPage.sectionConfigs = mergedLayout?.sectionConfigs || publishedPage.sectionConfigs;
              publishedPage.widgets = Array.isArray(publishedLayout?.widgets)
                ? publishedLayout.widgets
                : Array.isArray(draftLayout?.widgets)
                  ? draftLayout.widgets
                  : publishedPage.widgets;
              publishedPage.shell = {
                ...(publishedPage.shell || {}),
              };

              setPages([publishedPage]);
              setActivePageId(routePageId);
              setMode("published");
              return;
            } catch (error) {
              if (snapshotHasQuery) {
                setPages(snapshotPages);
                setActivePageId(routePageId);
                setMode("published");
                return;
              }
              throw error;
            }
          }

          let nextPages = activePages;
          let exists = nextPages.some((page) => String(page.id) === String(routePageId));
          if (!exists) {
            try {
              const singleRes = await api.get(`/experiencebuilder/${encodeURIComponent(routePageId)}`);
              const singlePage = normalizeExperiencePageRecord(singleRes.data, nextPages.length);
              nextPages = [singlePage, ...nextPages];
              exists = true;
            } catch {
              if (snapshotHasQuery) {
                nextPages = snapshotPages;
                exists = true;
              }
            }
          }

          nextPages = nextPages.map((page) =>
            String(page.id) === String(routePageId)
              ? {
                  ...page,
                  shell: {
                    ...(page.shell || {}),
                  },
                }
              : page
          );

          setPages(nextPages);
          if (exists) {
            setActivePageId(routePageId);
          } else if (nextPages[0]?.id) {
            setActivePageId(String(nextPages[0].id));
          }
          setMode("edit");
          return;
        }

        setPages(activePages);
      } catch (error) {
        if (cancelled) return;
        const previewSnapshot = isPreviewMode ? safeLoadPreviewSnapshot() : null;
        const snapshotPages = Array.isArray(previewSnapshot?.pages)
          ? previewSnapshot.pages.map((page, index) => normalizeExperiencePageRecord(page, index))
          : [];
        setExperienceLayouts(LAYOUT_OPTIONS);
        setPages(snapshotPages);
        if (queryPageId) setActivePageId(queryPageId);
        console.error("Failed to load experience builder data", error);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [queryPageId, queryPublishedId, isPreviewMode, isPublishedMode]);

  useLayoutEffect(() => {
    if (isPreviewMode) return;
    safeSavePreviewSnapshot(pages, activePageId);
  }, [pages, activePageId, isPreviewMode]);

  useEffect(() => {
    const handlePreparePreview = (event) => {
      safeSavePreviewSnapshot(pages, activePageId);
    };

    window.addEventListener("experiencebuilder:prepare-preview", handlePreparePreview);
    return () => {
      window.removeEventListener("experiencebuilder:prepare-preview", handlePreparePreview);
    };
  }, [pages, activePageId]);

  useEffect(() => {
    if (!activePage || !canvasRef.current) return;

    const updateCanvasSize = () => {
      if (!canvasRef.current) return;
      const width = canvasRef.current.clientWidth || 0;
      if (!width || !activePage.cols || !activePage.rows) return;
      const totalRowPx = canvasRows.reduce(
        (sum, row) => sum + Math.max(1, Math.floor(Number(row?.height) || 0)),
        0
      );
      const nextHeight = Math.max(120, totalRowPx || 0);
      setCanvasWidth(width);
      setCanvasHeight(nextHeight);
    };

    updateCanvasSize();

    const observer = new ResizeObserver(() => {
      updateCanvasSize();
    });

    observer.observe(canvasRef.current);
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [activePage, canvasRows]);

  useEffect(() => {
    const navbarEl = document.querySelector(".app-navbar");
    const pageContentEl = document.querySelector(".page-content");
    if (!navbarEl) return undefined;

    const shouldHideNavbar = Boolean(
      (queryPageId || queryPublishedId) &&
        activePage &&
        (isPreviewMode || isPublishedMode)
    );
    const prevNavbarDisplay = navbarEl.style.display;
    const prevPageContentMarginTop = pageContentEl ? pageContentEl.style.marginTop : "";
    const prevPageContentPaddingTop = pageContentEl ? pageContentEl.style.paddingTop : "";

    if (shouldHideNavbar) {
      navbarEl.style.display = "none";
      if (pageContentEl) {
        pageContentEl.style.marginTop = "0";
        pageContentEl.style.paddingTop = "0";
      }
    } else {
      navbarEl.style.display = prevNavbarDisplay || "";
      if (pageContentEl) {
        pageContentEl.style.marginTop = prevPageContentMarginTop || "";
        pageContentEl.style.paddingTop = prevPageContentPaddingTop || "";
      }
    }

    return () => {
      navbarEl.style.display = prevNavbarDisplay;
      if (pageContentEl) {
        pageContentEl.style.marginTop = prevPageContentMarginTop;
        pageContentEl.style.paddingTop = prevPageContentPaddingTop;
      }
    };
  }, [queryPageId, queryPublishedId, activePage?.id, effectiveShellVisibility.navbar, isPreviewMode, isPublishedMode]);

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
    if (!safeTable || columnsByTable[safeTable]) return;
    try {
      const res = await api.get(`/db/columns/${encodeURIComponent(safeTable)}`);
      const rawCols = Array.isArray(res.data?.columns)
        ? res.data.columns
        : Array.isArray(res.data)
          ? res.data
          : [];
      const cols = normalizeColumnNames(rawCols);
      setColumnsByTable((prev) => ({ ...prev, [safeTable]: cols }));
    } catch {
      setColumnsByTable((prev) => ({ ...prev, [safeTable]: [] }));
    }
  };

  const loadTableRows = async (tableName) => {
    const safeTable = String(tableName || "").trim();
    if (!safeTable || tableRowsByTable[safeTable]) return;
    try {
      const res = await api.get(`/tables/data/${encodeURIComponent(safeTable)}`, {
        params: { limit: 200 },
      });
      const rows = Array.isArray(res.data?.rows)
        ? res.data.rows
        : Array.isArray(res.data)
          ? res.data
          : [];
      setTableRowsByTable((prev) => ({ ...prev, [safeTable]: rows }));
      setTableErrorsByTable((prev) => ({ ...prev, [safeTable]: "" }));
    } catch {
      setTableRowsByTable((prev) => ({ ...prev, [safeTable]: [] }));
      setTableErrorsByTable((prev) => ({
        ...prev,
        [safeTable]: "Unable to load table rows for this model.",
      }));
    }
  };

  useEffect(() => {
    loadTableOptions();
  }, []);

  useEffect(() => {
    if (!activePage?.sectionConfigs) return;
    const tables = new Set();
    Object.values(activePage.sectionConfigs).forEach((config) => {
      const tableName = String(config?.widgetConfig?.tableName || "").trim();
      if (tableName) {
        tables.add(tableName);
      }
    });
    tables.forEach((tableName) => {
      loadColumns(tableName);
      loadTableRows(tableName);
    });
  }, [activePage?.id, activePage?.sectionConfigs]);

  const syncActivePageToServer = async (nextStatus, options = {}) => {
    if (!activePage) return null;
    const normalizedNextStatus = String(nextStatus || activePage.status || "Active");
    const shouldSyncPublishedLayout = Boolean(options.syncPublishedLayout);
    const nextIsPublished = normalizedNextStatus.toLowerCase() === "published";
    const existingPublishedLayoutId = Number(activePage?.publishedLayoutId) || Number(activePage?.layout?.publishedLayoutId) || null;
    const pagePayload = {
      ...activePage,
      status: normalizedNextStatus,
    };
    const pageUrl = nextIsPublished ? getPublishedPageUrl(activePage.id) : activePage.pageUrl || null;
    let publishedLayoutId = existingPublishedLayoutId;
    if (shouldSyncPublishedLayout && nextIsPublished) {
      const layoutDefinition = { ...pagePayload };
      delete layoutDefinition.publishedLayoutId;
      if (layoutDefinition.layout && typeof layoutDefinition.layout === "object") {
        delete layoutDefinition.layout.publishedLayoutId;
      }
      const layoutPayload = {
        layoutName: pagePayload.name || pagePayload.page_name || `Experience Page ${activePage.id}`,
        description: pagePayload.description || null,
        layoutDefinition,
        status: "published",
      };
      const layoutRes = publishedLayoutId
        ? await api.put(`/experiencelayouts/${encodeURIComponent(publishedLayoutId)}`, layoutPayload)
        : await api.post("/experiencelayouts", layoutPayload);
      publishedLayoutId = Number(layoutRes.data?.id) || publishedLayoutId || null;
    }
    const nextLayout = publishedLayoutId
      ? { ...pagePayload, publishedLayoutId }
      : pagePayload;
    const res = await api.put(`/experiencebuilder/${encodeURIComponent(activePage.id)}`, {
      pageName: nextLayout.name || nextLayout.page_name || `Experience Page ${activePage.id}`,
      description: nextLayout.description || null,
      layout: nextLayout,
      status: pagePayload.status,
      pageUrl,
    });
    const savedPage = normalizeExperiencePageRecord(res.data, 0);
    setPages((prev) =>
      prev.map((page) => (String(page.id) === String(savedPage.id) ? savedPage : page))
    );
    return savedPage;
  };

  useEffect(() => {
    const handleSavePage = async () => {
      try {
        await syncActivePageToServer(activePage?.status || "Active", { syncPublishedLayout: false });
        safeSavePreviewSnapshot(pages, activePageId);
        notify("success", "Page saved.");
      } catch (error) {
        console.error("Failed to save experience page", error);
        notify(
          "error",
          error?.response?.data?.error || error?.response?.data?.message || "Failed to save experience page."
        );
      }
    };

    const handlePublishPage = async () => {
      try {
        const saved = await syncActivePageToServer("Published", { syncPublishedLayout: true });
        if (saved) {
          setMode("published");
        }
        safeSavePreviewSnapshot(pages, activePageId);
        notify("success", "Page published.");
      } catch (error) {
        console.error("Failed to publish experience page", error);
        notify(
          "error",
          error?.response?.data?.error || error?.response?.data?.message || "Failed to publish experience page."
        );
      }
    };

    window.addEventListener("experiencebuilder:save-page", handleSavePage);
    window.addEventListener("experiencebuilder:publish-page", handlePublishPage);
    return () => {
      window.removeEventListener("experiencebuilder:save-page", handleSavePage);
      window.removeEventListener("experiencebuilder:publish-page", handlePublishPage);
    };
  }, [activePage, activePageId, pages]);

  const getPageUrl = (pageId) => `${window.location.origin}${window.location.pathname}?page=${pageId}`;
  const getPublishedPageUrl = (pageId) => `${window.location.origin}${window.location.pathname}?pagepub=${pageId}`;
  const getConfigurePageUrl = (pageId) => `${window.location.origin}${window.location.pathname}?page=${pageId}`;
  const isPageRoute = Boolean(queryPageId || queryPublishedId);

  const openCreateDialog = () => {
    setSelectedLayoutId(layoutOptions[0]?.id || LAYOUT_OPTIONS[0].id);
    setSelectedStarterPresetId(DEFAULT_THEME_TOOLS.starterPresetId);
    setDesignerPreviewSpec(null);
    setDesignerPromptBundle(null);
    setDesignerError("");
    setDesignerInitialValue(
      createDefaultDesignerInput({
        pageMeta: {
          name: `Experience Page ${pages.length + 1}`,
          purpose: "",
          audience: "",
          domain: "",
          tone: "professional",
          style: "modern",
        },
        layout: {
          layoutPreset: selectedLayout?.name || "custom",
          sectionCount: 3,
        },
      })
    );
    setCreateOpen(true);
  };

  const handleGenerateDesignerPreview = async (designerInput) => {
    let normalized = null;
    setDesignerBusy(true);
    setDesignerError("");
    try {
      normalized = validateDesignerInput(designerInput);
      const promptBundle = buildAiPagePrompt(normalized, {
        model: process.env.REACT_APP_OPENAI_MODEL || undefined,
      });
      setDesignerPromptBundle(promptBundle);
      const res = await api.post("/experiencebuilder-ai/generate", {
        designerInput: normalized,
        prompt: promptBundle.userPrompt,
        systemPrompt: promptBundle.systemPrompt,
        schema: promptBundle.responseFormat.schema,
        model: process.env.REACT_APP_OPENAI_MODEL || undefined,
      });
      const pageSpec = validatePageSpec(res.data?.pageSpec || res.data);
      setDesignerPreviewSpec(pageSpec);
      const nextLog = appendRevisionLog({
        action: "preview_generated",
        pageId: pageSpec?.generation?.revisionId || null,
        pageName: pageSpec?.pageMeta?.name || normalized.pageMeta.name,
        style: pageSpec?.pageMeta?.style || normalized.pageMeta.style,
        summary: `${pageSpec?.pageMeta?.name || normalized.pageMeta.name} • ${pageSpec?.layout?.sections?.length || 0} sections • ${pageSpec?.widgets?.length || 0} widgets`,
        spec: pageSpec,
        prompt: promptBundle.userPrompt,
        schemaVersion: pageSpec?.schemaVersion || "v2.0",
        status: "ok",
      });
      setRevisionEntries(nextLog);
      return pageSpec;
    } catch (error) {
      const message = describeApiError(error, "Failed to generate page preview.");
      setDesignerPreviewSpec(null);
      setDesignerError(message);
      appendRevisionLog({
        action: "preview_failed",
        pageName: normalized?.pageMeta?.name || designerInput?.pageMeta?.name || "Untitled",
        style: normalized?.pageMeta?.style || designerInput?.pageMeta?.style || "modern",
        summary: message,
        status: "error",
        error: message,
      });
      throw error;
    } finally {
      setDesignerBusy(false);
    }
  };

  const handleCreatePage = async (designerInput) => {
    if (!designerPreviewSpec) {
      setDesignerError("Generate a valid preview before creating the page.");
      return;
    }
    let normalized = null;
    let persistedPage = null;
    try {
      normalized = validateDesignerInput(designerInput);
      const runtimeLayout = buildRuntimePageFromDesignerSpec(designerPreviewSpec);
      persistedPage = {
        ...normalized,
        id: `pg_${Date.now()}`,
        name: designerPreviewSpec.pageMeta?.name || normalized.pageMeta.name || `Experience Page ${pages.length + 1}`,
        description: designerPreviewSpec.pageMeta?.purpose || normalized.pageMeta.purpose || "",
        layoutId: selectedLayout?.id || selectedLayoutId,
        layoutName: selectedLayout?.name || "AI Designer",
        cols: runtimeLayout.cols,
        rows: runtimeLayout.rows,
        widgets: [],
        shell: runtimeLayout.shell || designerPreviewSpec.shell || {},
        shellSizes: { ...DEFAULT_SHELL_SIZES },
        canvasLayoutRows: runtimeLayout.canvasLayoutRows,
        canvasRows: runtimeLayout.canvasRows,
        sectionMerges: runtimeLayout.sectionMerges || [],
        sectionConfigs: runtimeLayout.sectionConfigs || {},
        theme: runtimeLayout.theme || designerPreviewSpec.theme || {},
        behaviors: runtimeLayout.behaviors || designerPreviewSpec.behaviors || {},
        generatedBy: "ai-designer",
        generation: designerPreviewSpec.generation || {},
        createdAt: new Date().toISOString(),
        themeTools: {
          ...(designerPreviewSpec.themeTools || {}),
          starterPresetId: selectedStarterPresetId,
        },
        status: "Active",
        generatedSpec: designerPreviewSpec,
      };
    } catch (error) {
      console.error("Failed to validate experience page before create", error);
      window.alert(describeApiError(error, "Failed to create experience page."));
      return;
    }
    setDesignerCommitting(true);
    try {
      const res = await api.post("/experiencebuilder", {
        pageName: persistedPage.name,
        description: persistedPage.description || null,
        layout: persistedPage,
        status: persistedPage.status,
        pageUrl: null,
      });
      const savedPage = normalizeExperiencePageRecord(res.data, pages.length);
      setPages((prev) => [savedPage, ...prev]);
      setActivePageId(savedPage.id);
      setMode("edit");
      setCreateOpen(false);
      appendRevisionLog({
        action: "page_created",
        pageId: savedPage.id,
        pageName: savedPage.name,
        style: designerPreviewSpec.pageMeta?.style || normalized?.pageMeta?.style || "modern",
        summary: `${savedPage.name} created from AI design`,
        spec: designerPreviewSpec,
        status: "ok",
      });
      setRevisionEntries(loadRevisionLog());
      window.open(getConfigurePageUrl(savedPage.id), "_blank");
    } catch (error) {
      console.error("Failed to create experience page", error);
      window.alert(describeApiError(error, "Failed to create experience page."));
    } finally {
      setDesignerCommitting(false);
    }
  };

  const deletePage = async (page) => {
    if (!page?.id) return;
    const ok = window.confirm(`Delete ${page.name || "this page"}?`);
    if (!ok) return;
    try {
      await api.delete(`/experiencebuilder/${encodeURIComponent(page.id)}`);
      setPages((prev) => prev.filter((item) => String(item.id) !== String(page.id)));
      if (String(activePageId) === String(page.id)) {
        setActivePageId(null);
      }
      notify("success", "Page deleted.");
    } catch (error) {
      console.error("Failed to delete experience page", error);
      notify(
        "error",
        error?.response?.data?.error || error?.response?.data?.message || "Failed to delete experience page."
      );
    }
  };

  const toGridCoord = (clientX, clientY) => {
    if (!canvasRef.current || !activePage) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const cellW = rect.width / activePage.cols;
    const cellH = rect.height / activePage.rows;
    const x = clamp(Math.floor((clientX - rect.left) / cellW), 0, activePage.cols - 1);
    const y = clamp(Math.floor((clientY - rect.top) / cellH), 0, activePage.rows - 1);
    return { x, y, cellW, cellH };
  };

  const handleCanvasDrop = (event) => {
    event.preventDefault();
    if (mode !== "edit" || !activePage) return;
    const widgetType = event.dataTransfer.getData("application/x-widget-type");
    const widgetDef = activeWidgetLibrary.find((item) => item.type === widgetType);
    if (!widgetDef) return;
    const coord = toGridCoord(event.clientX, event.clientY);
    if (!coord) return;
    const w = Math.min(widgetDef.defaultW, activePage.cols);
    const h = Math.min(widgetDef.defaultH, activePage.rows);
    const widget = {
      id: `w_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: widgetDef.type,
      x: clamp(coord.x, 0, activePage.cols - w),
      y: clamp(coord.y, 0, activePage.rows - h),
      w,
      h,
    };
    setActivePagePatch((page) => ({ ...page, widgets: [...(page.widgets || []), widget] }));
  };

  const toggleShellVisibility = (key) => (_event, checked) => {
    if (!activePage) return;
    setActivePagePatch((page) => ({
      ...page,
      shell: {
        ...(page.shell || {}),
        [key]: checked,
      },
    }));
  };

  const updateThemeTools = (patch) => {
    if (!activePage) return;
    setActivePagePatch((page) => applyThemeToolsPatch(page, patch));
  };

  const applyThemePreset = (presetId) => {
    if (!activePage) return;
    setActivePagePatch((page) => buildThemePresetPatch(page, presetId));
  };

  useEffect(() => {
    if (!sectionModalOpen || sectionOptionsTab !== 1 || !selectedSection || !canvasRows.length) return;
    const sectionRow = Math.max(0, Math.floor(Number(selectedSection.row) || 0));
    const safeIndex = Math.min(sectionRow, canvasRows.length - 1);
    const target = canvasRows[safeIndex];
    if (!target) return;
    setSelectedRowIndex(safeIndex);
    setRowFormColumns(target.columns);
    setRowFormHeight(target.height);
    setRowFormPadding(target.padding);
    setRowFormGap(target.gap);
  }, [sectionModalOpen, sectionOptionsTab, selectedSection, canvasRows]);

  const loadRowFormFromIndex = (rowIndex) => {
    const target = canvasRows[rowIndex];
    if (!target) return;
    setSelectedRowIndex(rowIndex);
    setRowFormColumns(target.columns);
    setRowFormHeight(target.height);
    setRowFormPadding(target.padding);
    setRowFormGap(target.gap);
  };

  const openRowModal = (rowIndex) => {
    loadRowFormFromIndex(rowIndex);
    setRowModalOpen(true);
  };

  const saveRowSettings = (closeDialog = true) => {
    if (selectedRowIndex < 0) return;
    setActivePagePatch((page) => {
      const rows = normalizeCanvasRows(page.canvasRows, page.canvasLayoutRows || 3);
      const nextRows = rows.map((row, index) =>
        index === selectedRowIndex
          ? {
              ...row,
              columns: clamp(Number(rowFormColumns) || 1, 1, 8),
              height: Math.max(1, Math.floor(Number(rowFormHeight) || 1)),
              padding: Math.max(0, Math.floor(Number(rowFormPadding) || 0)),
              gap: Math.max(0, Math.floor(Number(rowFormGap) || 0)),
            }
          : row
      );
      return { ...page, canvasRows: nextRows, canvasLayoutRows: nextRows.length };
    });
    if (closeDialog) setRowModalOpen(false);
  };

  const addWidgetRow = (closeDialog = true) => {
    if (selectedRowIndex < 0) return;
    setActivePagePatch((page) => {
      const rows = normalizeCanvasRows(page.canvasRows, page.canvasLayoutRows || 3);
      const nextRows = [...rows];
      nextRows.splice(selectedRowIndex + 1, 0, createCanvasRow());
      return { ...page, canvasRows: nextRows, canvasLayoutRows: nextRows.length, sectionMerges: [] };
    });
    if (closeDialog) setRowModalOpen(false);
  };

  const duplicateRow = (closeDialog = true) => {
    if (selectedRowIndex < 0) return;
    setActivePagePatch((page) => {
      const rows = normalizeCanvasRows(page.canvasRows, page.canvasLayoutRows || 3);
      const source = rows[selectedRowIndex];
      if (!source) return page;
      const copy = createCanvasRow({
        columns: source.columns,
        height: source.height,
        padding: source.padding,
        gap: source.gap,
      });
      const nextRows = [...rows];
      nextRows.splice(selectedRowIndex + 1, 0, copy);
      return { ...page, canvasRows: nextRows, canvasLayoutRows: nextRows.length, sectionMerges: [] };
    });
    if (closeDialog) setRowModalOpen(false);
  };

  const deleteRow = (closeDialog = true) => {
    if (selectedRowIndex < 0) return;
    setActivePagePatch((page) => {
      const rows = normalizeCanvasRows(page.canvasRows, page.canvasLayoutRows || 3);
      if (rows.length <= 1) return page;
      const nextRows = rows.filter((_row, index) => index !== selectedRowIndex);
      return { ...page, canvasRows: nextRows, canvasLayoutRows: nextRows.length, sectionMerges: [] };
    });
    if (closeDialog) setRowModalOpen(false);
  };

  const addNewRowAtBottom = () => {
    setActivePagePatch((page) => {
      const rows = normalizeCanvasRows(page.canvasRows, page.canvasLayoutRows || 3);
      const nextRows = [...rows, createCanvasRow()];
      return { ...page, canvasRows: nextRows, canvasLayoutRows: nextRows.length, sectionMerges: [] };
    });
  };

  const setAllRowsPadding = (paddingValue) => {
    setActivePagePatch((page) => {
      const rows = normalizeCanvasRows(page.canvasRows, page.canvasLayoutRows || 3);
      const nextRows = rows.map((row) => ({ ...row, padding: Math.max(0, Math.floor(paddingValue)) }));
      return { ...page, canvasRows: nextRows, canvasLayoutRows: nextRows.length };
    });
  };

  const setAllRowsGap = (gapValue) => {
    setActivePagePatch((page) => {
      const rows = normalizeCanvasRows(page.canvasRows, page.canvasLayoutRows || 3);
      const nextRows = rows.map((row) => ({ ...row, gap: Math.max(0, Math.floor(gapValue)) }));
      return { ...page, canvasRows: nextRows, canvasLayoutRows: nextRows.length };
    });
  };

  const sectionLayout = useMemo(() => {
    const rows = canvasRows;
    const rawMerges = Array.isArray(activePage?.sectionMerges) ? activePage.sectionMerges : [];
    const removeStandardPadding = true;
    const occupied = new Map();
    const mergeByAnchor = new Map();
    const validMerges = [];

    rawMerges.forEach((merge) => {
      const row = Math.floor(Number(merge?.row));
      const col = Math.floor(Number(merge?.col));
      const rowSpan = Math.max(1, Math.floor(Number(merge?.rowSpan) || 1));
      const colSpan = Math.max(1, Math.floor(Number(merge?.colSpan) || 1));
      if (!Number.isFinite(row) || !Number.isFinite(col)) return;
      if (row < 0 || row + rowSpan > rows.length) return;
      const baseColumns = rows[row]?.columns || 1;
      if (col < 0 || col + colSpan > baseColumns) return;
      for (let r = row; r < row + rowSpan; r += 1) {
        if ((rows[r]?.columns || 1) !== baseColumns) return;
      }
      for (let r = row; r < row + rowSpan; r += 1) {
        for (let c = col; c < col + colSpan; c += 1) {
          const key = `${r}:${c}`;
          if (occupied.has(key)) return;
        }
      }
      const normalized = { row, col, rowSpan, colSpan };
      const anchorKey = `${row}:${col}`;
      validMerges.push(normalized);
      mergeByAnchor.set(anchorKey, normalized);
      for (let r = row; r < row + rowSpan; r += 1) {
        for (let c = col; c < col + colSpan; c += 1) {
          occupied.set(`${r}:${c}`, anchorKey);
        }
      }
    });

    const totalHeightPx = rows.reduce(
      (sum, row) => sum + Math.max(1, Math.floor(Number(row?.height) || 0)),
      0
    ) || 1;
    const rowStarts = [];
    const rowStartsPx = [];
    const rowHeightPct = [];
    const rowHeightPx = [];
    let runningPxLogical = 0;
    let runningPx = 0;
    rows.forEach((row) => {
      const px = Math.max(1, Math.floor(Number(row?.height) || 0));
      const pct = (px / totalHeightPx) * 100;
      rowStarts.push((runningPxLogical / totalHeightPx) * 100);
      rowStartsPx.push(runningPx);
      rowHeightPct.push(pct);
      rowHeightPx.push(px);
      runningPxLogical += px;
      runningPx += px;
    });
    const visibleSections = [];
    rows.forEach((row, rowIndex) => {
      const sectionWidth = 100 / row.columns;
      const sectionGap = removeStandardPadding ? 0 : Math.max(0, Number(row.gap) || 0);
      const sectionPadding = removeStandardPadding ? 0 : Math.max(0, Number(row.padding) || 0);
      const usableWidthPx = Math.max(0, canvasWidth - 2 * sectionPadding - (row.columns - 1) * sectionGap);
      const colWidthPx = row.columns > 0 ? usableWidthPx / row.columns : 0;
      for (let col = 0; col < row.columns; col += 1) {
        const key = `${rowIndex}:${col}`;
        const anchorKey = occupied.get(key);
        if (anchorKey && anchorKey !== key) continue;

        const merge = anchorKey ? mergeByAnchor.get(anchorKey) : null;
        const rowSpan = merge ? merge.rowSpan : 1;
        const colSpan = merge ? merge.colSpan : 1;
        const topPct = rowStarts[rowIndex];
        const heightPct = rowHeightPct
          .slice(rowIndex, rowIndex + rowSpan)
          .reduce((sum, value) => sum + value, 0);
        const topPx = rowStartsPx[rowIndex] + sectionPadding;
        const mergedHeightPx = rowHeightPx
          .slice(rowIndex, rowIndex + rowSpan)
          .reduce((sum, value) => sum + value, 0);
        const bottomPadding = removeStandardPadding
          ? 0
          : Math.max(0, Number(rows[rowIndex + rowSpan - 1]?.padding) || 0);
        const heightPx = Math.max(8, mergedHeightPx - sectionPadding - bottomPadding);
        const leftPx = sectionPadding + col * (colWidthPx + sectionGap);
        const widthPx = Math.max(8, colWidthPx * colSpan + sectionGap * (colSpan - 1));
        visibleSections.push({
          row: rowIndex,
          col,
          rowSpan,
          colSpan,
          columns: row.columns,
          leftPct: col * sectionWidth,
          topPct,
          widthPct: sectionWidth * colSpan,
          heightPct,
          leftPx,
          topPx,
          widthPx,
          heightPx,
          merged: Boolean(merge),
          anchorKey: `${rowIndex}:${col}`,
        });
      }
    });

    return { visibleSections, occupied, validMerges };
  }, [canvasRows, activePage, canvasWidth]);

  const openSectionModal = (section) => {
    setSelectedSection(section);
    setSectionOptionsTab(0);
    if (Number.isFinite(section?.row)) {
      loadRowFormFromIndex(section.row);
    }
    setSectionModalOpen(true);
  };

  const canMergeRight = useMemo(() => {
    if (!selectedSection) return false;
    const rightNeighbor = sectionLayout.visibleSections.find(
      (section) =>
        section.row === selectedSection.row &&
        section.rowSpan === selectedSection.rowSpan &&
        section.col === selectedSection.col + selectedSection.colSpan
    );
    return Boolean(rightNeighbor);
  }, [selectedSection, sectionLayout]);

  const canMergeDown = useMemo(() => {
    if (!selectedSection) return false;
    const downNeighbor = sectionLayout.visibleSections.find(
      (section) =>
        section.col === selectedSection.col &&
        section.colSpan === selectedSection.colSpan &&
        section.row === selectedSection.row + selectedSection.rowSpan
    );
    return Boolean(downNeighbor);
  }, [selectedSection, sectionLayout]);

  const mergeSectionRight = () => {
    if (!selectedSection || !canMergeRight) return;
    setActivePagePatch((page) => {
      const merges = Array.isArray(page.sectionMerges) ? page.sectionMerges : [];
      const rightNeighbor = sectionLayout.visibleSections.find(
        (section) =>
          section.row === selectedSection.row &&
          section.rowSpan === selectedSection.rowSpan &&
          section.col === selectedSection.col + selectedSection.colSpan
      );
      if (!rightNeighbor) return page;
      const filtered = merges.filter((merge) => {
        const key = `${Number(merge?.row)}:${Number(merge?.col)}`;
        return key !== selectedSection.anchorKey && key !== rightNeighbor.anchorKey;
      });
      return {
        ...page,
        sectionMerges: [
          ...filtered,
          {
            row: selectedSection.row,
            col: selectedSection.col,
            rowSpan: selectedSection.rowSpan,
            colSpan: selectedSection.colSpan + rightNeighbor.colSpan,
          },
        ],
      };
    });
    setSectionModalOpen(false);
  };

  const mergeSectionDown = () => {
    if (!selectedSection || !canMergeDown) return;
    setActivePagePatch((page) => {
      const merges = Array.isArray(page.sectionMerges) ? page.sectionMerges : [];
      const downNeighbor = sectionLayout.visibleSections.find(
        (section) =>
          section.col === selectedSection.col &&
          section.colSpan === selectedSection.colSpan &&
          section.row === selectedSection.row + selectedSection.rowSpan
      );
      if (!downNeighbor) return page;
      const filtered = merges.filter((merge) => {
        const key = `${Number(merge?.row)}:${Number(merge?.col)}`;
        return key !== selectedSection.anchorKey && key !== downNeighbor.anchorKey;
      });
      return {
        ...page,
        sectionMerges: [
          ...filtered,
          {
            row: selectedSection.row,
            col: selectedSection.col,
            rowSpan: selectedSection.rowSpan + downNeighbor.rowSpan,
            colSpan: selectedSection.colSpan,
          },
        ],
      };
    });
    setSectionModalOpen(false);
  };

  const unmergeSection = () => {
    if (!selectedSection || !selectedSection.merged) return;
    setActivePagePatch((page) => {
      const merges = Array.isArray(page.sectionMerges) ? page.sectionMerges : [];
      return {
        ...page,
        sectionMerges: merges.filter(
          (merge) =>
            !(
              Number(merge?.row) === selectedSection.row &&
              Number(merge?.col) === selectedSection.col
            )
        ),
      };
    });
    setSectionModalOpen(false);
  };

  const updateSelectedSectionConfig = (patcher) => {
    if (!selectedSection) return;
    setActivePagePatch((page) => {
      const sectionConfigs = { ...(page.sectionConfigs || {}) };
      const current = sectionConfigs[selectedSection.anchorKey] || {};
      const next = patcher(current);
      sectionConfigs[selectedSection.anchorKey] = next;
      return { ...page, sectionConfigs };
    });
  };

  const setSectionWidget = (widgetType) => {
    if (!selectedSection) return;
    updateSelectedSectionConfig((current) => ({
      ...(() => {
        const padding = resolveSectionPadding(current);
        return {
          paddingTop: padding.top,
          paddingRight: padding.right,
          paddingBottom: padding.bottom,
          paddingLeft: padding.left,
        };
      })(),
      ...current,
      widgetType,
      widgetConfig: widgetType
        ? {
            ...defaultWidgetConfig(widgetType),
            ...(current.widgetType === widgetType ? current.widgetConfig || {} : {}),
          }
        : {},
      style: { ...defaultSectionStyle, ...(current.style || {}) },
    }));
  };

  const updateSectionWidgetField = (field, value) => {
    updateSelectedSectionConfig((current) => {
      const widgetType = current.widgetType || "";
      return {
        ...current,
        widgetConfig: {
          ...defaultWidgetConfig(widgetType),
          ...(current.widgetConfig || {}),
          [field]: value,
        },
      };
    });
  };

  const updateSectionStyleField = (field, value) => {
    updateSelectedSectionConfig((current) => ({
      ...current,
      style: {
        ...defaultSectionStyle,
        ...(current.style || {}),
        [field]: value,
      },
    }));
  };

  const setSectionPaddingSide = (side, value) => {
    if (!selectedSection) return;
    const padding = Math.max(0, Math.floor(Number(value) || 0));
    const map = {
      top: "paddingTop",
      right: "paddingRight",
      bottom: "paddingBottom",
      left: "paddingLeft",
    };
    const field = map[side];
    if (!field) return;
    updateSelectedSectionConfig((current) => ({
      ...current,
      [field]: padding,
    }));
  };

  const parseSectionKey = (key) => {
    const [r, c] = String(key || "").split(":");
    return { row: Number(r), col: Number(c) };
  };

  const splitSectionIntoColumns = () => {
    if (!selectedSection) return;
    const count = clamp(Math.floor(Number(splitColumnsCount) || 2), 2, 8);
    if (selectedSection.merged) {
      setActivePagePatch((page) => {
        const merges = Array.isArray(page.sectionMerges) ? page.sectionMerges : [];
        return {
          ...page,
          sectionMerges: merges.filter(
            (merge) =>
              !(
                Number(merge?.row) === selectedSection.row &&
                Number(merge?.col) === selectedSection.col
              )
          ),
        };
      });
      setSectionModalOpen(false);
      return;
    }
    if (selectedSection.rowSpan !== 1 || selectedSection.colSpan !== 1) {
      window.alert("Split into columns is supported only for a single unmerged section.");
      return;
    }

    setActivePagePatch((page) => {
      const merges = Array.isArray(page.sectionMerges) ? page.sectionMerges : [];

      const rows = normalizeCanvasRows(page.canvasRows, page.canvasLayoutRows || 3);
      const targetRow = rows[selectedSection.row];
      if (!targetRow) return page;

      const oldCols = targetRow.columns;
      const factor = count;
      const newCols = oldCols * factor;

      const nextRows = rows.map((row, idx) =>
        idx === selectedSection.row ? { ...row, columns: newCols } : row
      );

      const nextMerges = merges.filter((merge) => {
        const row = Number(merge?.row);
        const rowSpan = Math.max(1, Number(merge?.rowSpan) || 1);
        if (!Number.isFinite(row)) return false;
        return !(selectedSection.row >= row && selectedSection.row < row + rowSpan);
      });
      for (let col = 0; col < oldCols; col += 1) {
        if (col === selectedSection.col) continue;
        nextMerges.push({
          row: selectedSection.row,
          col: col * factor,
          rowSpan: 1,
          colSpan: factor,
        });
      }

      const prevConfigs = page.sectionConfigs || {};
      const nextConfigs = {};
      Object.entries(prevConfigs).forEach(([key, value]) => {
        const { row, col } = parseSectionKey(key);
        if (!Number.isFinite(row) || !Number.isFinite(col)) return;
        if (row === selectedSection.row) {
          nextConfigs[`${row}:${col * factor}`] = value;
          return;
        }
        nextConfigs[key] = value;
      });

      return {
        ...page,
        canvasRows: nextRows,
        canvasLayoutRows: nextRows.length,
        sectionMerges: nextMerges,
        sectionConfigs: nextConfigs,
      };
    });
    setSectionModalOpen(false);
  };

  const splitSectionIntoRows = () => {
    if (!selectedSection) return;
    const count = clamp(Math.floor(Number(splitRowsCount) || 2), 2, 8);
    if (selectedSection.merged && selectedSection.colSpan === 1 && selectedSection.rowSpan > 1) {
      setActivePagePatch((page) => {
        const merges = Array.isArray(page.sectionMerges) ? page.sectionMerges : [];
        return {
          ...page,
          sectionMerges: merges.filter(
            (merge) =>
              !(
                Number(merge?.row) === selectedSection.row &&
                Number(merge?.col) === selectedSection.col
              )
          ),
        };
      });
      setSectionModalOpen(false);
      return;
    }
    if (selectedSection.merged || selectedSection.rowSpan !== 1 || selectedSection.colSpan !== 1) {
      window.alert("Split into rows is supported only for a single unmerged section.");
      return;
    }

    setActivePagePatch((page) => {
      const merges = Array.isArray(page.sectionMerges) ? page.sectionMerges : [];

      const rows = normalizeCanvasRows(page.canvasRows, page.canvasLayoutRows || 3);
      const targetRow = rows[selectedSection.row];
      if (!targetRow) return page;

      const totalHeight = Math.max(1, Math.floor(Number(targetRow.height) || 1));
      const baseHeight = Math.max(1, Math.floor(totalHeight / count));
      let remainder = totalHeight - baseHeight * count;
      const splitRows = Array.from({ length: count }).map(() =>
        createCanvasRow({
          columns: targetRow.columns,
          height: baseHeight + (remainder-- > 0 ? 1 : 0),
          padding: targetRow.padding,
          gap: targetRow.gap,
        })
      );

      const nextRows = [...rows];
      nextRows.splice(selectedSection.row, 1, ...splitRows);

      const nextMerges = [];
      merges.forEach((merge) => {
        const row = Number(merge?.row);
        const rowSpan = Math.max(1, Number(merge?.rowSpan) || 1);
        if (!Number.isFinite(row)) return;
        if (selectedSection.row < row) {
          nextMerges.push({ ...merge, row: row + (count - 1) });
          return;
        }
        if (selectedSection.row >= row + rowSpan) {
          nextMerges.push(merge);
        }
      });

      for (let col = 0; col < targetRow.columns; col += 1) {
        if (col === selectedSection.col) continue;
        nextMerges.push({
          row: selectedSection.row,
          col,
          rowSpan: count,
          colSpan: 1,
        });
      }

      const prevConfigs = page.sectionConfigs || {};
      const nextConfigs = {};
      Object.entries(prevConfigs).forEach(([key, value]) => {
        const { row, col } = parseSectionKey(key);
        if (!Number.isFinite(row) || !Number.isFinite(col)) return;
        if (row > selectedSection.row) {
          nextConfigs[`${row + (count - 1)}:${col}`] = value;
          return;
        }
        nextConfigs[key] = value;
      });

      return {
        ...page,
        canvasRows: nextRows,
        canvasLayoutRows: nextRows.length,
        sectionMerges: nextMerges,
        sectionConfigs: nextConfigs,
      };
    });
    setSectionModalOpen(false);
  };

  const startDragWidget = (event, widget) => {
    if (mode !== "edit" || !activePage || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStateRef.current = {
      id: widget.id,
      startOffsetX: event.clientX - (rect.left + (widget.x / activePage.cols) * rect.width),
      startOffsetY: event.clientY - (rect.top + (widget.y / activePage.rows) * rect.height),
    };
    event.preventDefault();
  };

  const startResizeWidget = (event, widget) => {
    if (mode !== "edit" || !activePage) return;
    resizeStateRef.current = {
      id: widget.id,
      startX: event.clientX,
      startY: event.clientY,
      startW: widget.w,
      startH: widget.h,
    };
    event.stopPropagation();
    event.preventDefault();
  };

  const startShellResize = (side) => (event) => {
    if (!activePage || !pageShellRef.current) return;
    shellResizeRef.current = {
      side,
      startX: event.clientX,
      startY: event.clientY,
      startLeftWidth: shellSizes.leftWidth,
      startRightWidth: shellSizes.rightWidth,
      startBottomHeight: shellSizes.bottomHeight,
    };
    event.preventDefault();
    event.stopPropagation();
  };

  const startCanvasBadgeDrag = (event) => {
    if (mode !== "edit" || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const badgeRect = event.currentTarget.getBoundingClientRect();
    canvasBadgeDragRef.current = {
      offsetX: event.clientX - badgeRect.left,
      offsetY: event.clientY - badgeRect.top,
      badgeWidth: badgeRect.width,
      badgeHeight: badgeRect.height,
      canvasLeft: canvasRect.left,
      canvasTop: canvasRect.top,
    };
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    const onMove = (event) => {
      if (!activePage || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const cellW = rect.width / activePage.cols;
      const cellH = rect.height / activePage.rows;

      if (dragStateRef.current) {
        const drag = dragStateRef.current;
        setActivePagePatch((page) => {
          const nextWidgets = (page.widgets || []).map((widget) => {
            if (widget.id !== drag.id) return widget;
            const x = clamp(
              Math.round((event.clientX - rect.left - drag.startOffsetX) / cellW),
              0,
              page.cols - widget.w
            );
            const y = clamp(
              Math.round((event.clientY - rect.top - drag.startOffsetY) / cellH),
              0,
              page.rows - widget.h
            );
            return { ...widget, x, y };
          });
          return { ...page, widgets: nextWidgets };
        });
      }

      if (resizeStateRef.current) {
        const resize = resizeStateRef.current;
        setActivePagePatch((page) => {
          const nextWidgets = (page.widgets || []).map((widget) => {
            if (widget.id !== resize.id) return widget;
            const deltaW = Math.round((event.clientX - resize.startX) / cellW);
            const deltaH = Math.round((event.clientY - resize.startY) / cellH);
            const nextW = clamp(resize.startW + deltaW, 2, page.cols - widget.x);
            const nextH = clamp(resize.startH + deltaH, 2, page.rows - widget.y);
            return { ...widget, w: nextW, h: nextH };
          });
          return { ...page, widgets: nextWidgets };
        });
      }

      if (shellResizeRef.current) {
        const shellResize = shellResizeRef.current;
        const shellRect = pageShellRef.current?.getBoundingClientRect();
        const shellWidth = shellRect?.width || window.innerWidth;
        const shellHeight = shellRect?.height || window.innerHeight;
        const minSidebar = 120;
        const maxSidebar = Math.max(minSidebar, Math.floor(shellWidth * 0.45));
        const minBottom = 56;
        const maxBottom = Math.max(minBottom, Math.floor(shellHeight * 0.5));

        setActivePagePatch((page) => {
          const nextSizes = { ...DEFAULT_SHELL_SIZES, ...(page.shellSizes || {}) };
          if (shellResize.side === "left") {
            const deltaX = event.clientX - shellResize.startX;
            nextSizes.leftWidth = clamp(shellResize.startLeftWidth + deltaX, minSidebar, maxSidebar);
          }
          if (shellResize.side === "right") {
            const deltaX = shellResize.startX - event.clientX;
            nextSizes.rightWidth = clamp(shellResize.startRightWidth + deltaX, minSidebar, maxSidebar);
          }
          if (shellResize.side === "bottom") {
            const deltaY = shellResize.startY - event.clientY;
            nextSizes.bottomHeight = clamp(shellResize.startBottomHeight + deltaY, minBottom, maxBottom);
          }
          return { ...page, shellSizes: nextSizes };
        });
      }

      if (canvasBadgeDragRef.current) {
        const drag = canvasBadgeDragRef.current;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const maxX = Math.max(0, canvasRect.width - drag.badgeWidth);
        const maxY = Math.max(0, canvasRect.height - drag.badgeHeight);
        const nextX = clamp(Math.round(event.clientX - canvasRect.left - drag.offsetX), 0, maxX);
        const nextY = clamp(Math.round(event.clientY - canvasRect.top - drag.offsetY), 0, maxY);
        setActivePagePatch((page) => ({
          ...page,
          canvasBadgePosition: { x: nextX, y: nextY },
        }));
      }
    };

    const onUp = () => {
      dragStateRef.current = null;
      resizeStateRef.current = null;
      shellResizeRef.current = null;
      canvasBadgeDragRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [activePage, activePageId]);

  const renderAiWidgetPreview = (widget) => {
    const type = String(widget?.type || "").trim().toLowerCase();
    const config = widget?.config || {};

    if (type === "chart") {
      const tableName = String(config.dataTable || config.tableName || "").trim();
      const rows = tableRowsByTable[tableName] || [];
      const chartConfig = {
        tableName,
        chartType: mapAiChartTypeToBuilderType(config.chartType),
        chartName: config.seriesName || widget?.title || tableName || "Dataset",
        xAxis: String(config.xAxis || "").trim(),
        yAxis: String(config.yAxis || "").trim(),
        aggregation: String(config.aggregation || "actual"),
      };
      return (
        <Box sx={{ width: "100%", minHeight: 120 }}>
          <SectionChart config={chartConfig} rows={rows} />
        </Box>
      );
    }

    if (type === "table") {
      const tableName = String(config.tableName || config.dataTable || "").trim();
      const limit = clamp(Math.floor(readNumeric(config.rowLimit || config.limit, 10)), 1, 100);
      const rows = tableRowsByTable[tableName] || [];
      if (!tableName) {
        return <Typography sx={{ fontSize: 12, color: "#8a97ad" }}>Select table.</Typography>;
      }
      if (!rows.length) {
        return <Typography sx={{ fontSize: 12, color: "#8a97ad" }}>No rows available.</Typography>;
      }
      const normalizedColumns = normalizeColumnNames(columnsByTable[tableName]);
      const columns = Array.isArray(config.columns) && config.columns.length
        ? config.columns
        : normalizedColumns.length
          ? normalizedColumns
          : Object.keys(rows[0] || {});
      return (
        <Box sx={{ width: "100%", height: "100%", overflow: "auto" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <Box component="thead">
              <Box component="tr">
                {columns.slice(0, 8).map((col) => (
                  <Box key={`${widget?.id}-head-${col}`} component="th" sx={{ textAlign: "left", borderBottom: "1px solid #d8dde7", p: 0.5 }}>
                    {String(col)}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {rows.slice(0, limit).map((row, idx) => (
                <Box component="tr" key={`${widget?.id}-row-${idx}`}>
                  {columns.slice(0, 8).map((col) => (
                    <Box key={`${widget?.id}-${idx}-${col}`} component="td" sx={{ borderBottom: "1px solid #edf0f6", p: 0.5 }}>
                      {String(row?.[col] ?? "")}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      );
    }

    if (type === "text") {
      const text = String(config.textContent || config.text || "").trim();
      return (
        <Typography
          sx={{
            fontSize: clamp(Math.floor(readNumeric(config.fontSize, 16)), 8, 96),
            color: config.textColor || config.color || "#1e2d4a",
            fontWeight: config.bold ? 700 : 400,
            fontStyle: config.italic ? "italic" : "normal",
            textDecoration: config.underline ? "underline" : "none",
            whiteSpace: "pre-wrap",
          }}
        >
          {text || "Enter text."}
        </Typography>
      );
    }

    if (type === "image") {
      const src = String(config.imageUrl || config.src || "").trim();
      if (!src) {
        return <Typography sx={{ fontSize: 12, color: "#8a97ad" }}>Select image.</Typography>;
      }
      const map = {
        center: "center center",
        "top-left": "left top",
        "top-center": "center top",
        "top-right": "right top",
        left: "left center",
        right: "right center",
        "bottom-left": "left bottom",
        "bottom-center": "center bottom",
        "bottom-right": "right bottom",
      };
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            minHeight: 100,
            backgroundImage: `url(${src})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: (config.imageFit || config.fit) === "cover" ? "cover" : "contain",
            backgroundPosition: map[config.imagePosition || config.position] || "center center",
          }}
        />
      );
    }

    if (type === "icon") {
      return (
        <Typography
          sx={{
            fontSize: clamp(Math.floor(readNumeric(config.iconSize, 24)), 8, 120),
            color: config.iconColor || "#1e2d4a",
            lineHeight: 1,
          }}
        >
          {config.label || config.iconText || config.iconKey || "*"}
        </Typography>
      );
    }

    if (type === "kpi") {
      return (
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f4f8ff", border: "1px solid #d7deea" }}>
          <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
            {config.kpiLabel || widget?.title || "KPI"}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#1f5fd1" }}>
            {config.kpiValue || "0"}
          </Typography>
          {config.subtext ? (
            <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
              {config.subtext}
            </Typography>
          ) : null}
        </Box>
      );
    }

    if (type === "form") {
      return (
        <Box sx={{ display: "grid", gap: 1, width: "100%" }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#1e2d4a" }}>
            {config.formName || widget?.title || "Form"}
          </Typography>
          <TextField size="small" label="Name" disabled />
          <TextField size="small" label="Email" disabled />
          <Button variant="contained" sx={{ justifySelf: "start" }}>
            {config.submitLabel || "Submit"}
          </Button>
        </Box>
      );
    }

    if (type === "syncedblock") {
      return (
        <Box sx={{ display: "grid", gap: 0.75, width: "100%" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1e2d4a" }}>
            {config.blockName || "Synced Block"}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>
            {config.sync ? "Synced" : "Detached"} block content
          </Typography>
          <Box sx={{ p: 1, border: "1px dashed #9cb4df", borderRadius: 1, bgcolor: "#f8fbff" }}>
            <Typography sx={{ fontSize: 12, color: "#334363" }}>
              {config.content || "Shared block content appears here."}
            </Typography>
          </Box>
        </Box>
      );
    }

    if (type === "templatepart") {
      return (
        <Box sx={{ display: "grid", gap: 0.75, width: "100%" }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1e2d4a" }}>
            {String(config.templatePart || "header").toUpperCase()} TEMPLATE PART
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>
            Variant: {config.variant || "default"}
          </Typography>
          <Box sx={{ p: 1, border: "1px solid #d8dde7", borderRadius: 1, bgcolor: "#fbfcff" }}>
            <Typography sx={{ fontSize: 12, color: "#334363" }}>
              Theme Builder output placeholder for {config.templatePart || "header"}.
            </Typography>
          </Box>
        </Box>
      );
    }

    return null;
  };

  const renderSectionWidget = (section, config) => {
    const stackedWidgets = Array.isArray(config?.widgets) ? config.widgets : [];
    if (stackedWidgets.length) {
      return (
        <Stack gap={1}>
          {stackedWidgets.map((widget, index) => (
            <Box
              key={`${section.anchorKey}-${widget?.id || index}`}
              sx={{
                p: 1.25,
                border: "1px dashed #d7deea",
                borderRadius: 1.5,
                bgcolor: "#fff",
              }}
            >
              {renderAiWidgetPreview(widget)}
            </Box>
          ))}
        </Stack>
      );
    }
    const widgetType = config?.widgetType || "";
    if (!widgetType) {
      return null;
    }
    const widgetConfig = {
      ...defaultWidgetConfig(widgetType),
      ...(config?.widgetConfig || {}),
    };
    const tableName = String(widgetConfig.tableName || "").trim();
    const rows = tableRowsByTable[tableName] || [];
    const tableError = tableErrorsByTable[tableName];

    if (widgetType === "Chart") {
      if (!widgetConfig.tableName || !widgetConfig.chartType || !widgetConfig.xAxis || !widgetConfig.yAxis) return null;
      if (tableError) return null;
      return <SectionChart config={widgetConfig} rows={rows} />;
    }

    if (widgetType === "Table") {
      const limit = clamp(Math.floor(readNumeric(widgetConfig.limit, 10)), 1, 100);
      if (!tableName) return null;
      if (tableError) return null;
      if (!rows.length) return null;
      const normalizedColumns = normalizeColumnNames(columnsByTable[tableName]);
      const columns = normalizedColumns.length ? normalizedColumns : Object.keys(rows[0] || {});
      return (
        <Box sx={{ width: "100%", height: "100%", overflow: "auto" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <Box component="thead">
              <Box component="tr">
                {columns.slice(0, 8).map((col) => (
                  <Box key={`${section.anchorKey}-head-${col}`} component="th" sx={{ textAlign: "left", borderBottom: "1px solid #d8dde7", p: 0.5 }}>
                    {String(col)}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {rows.slice(0, limit).map((row, idx) => (
                <Box component="tr" key={`${section.anchorKey}-row-${idx}`}>
                  {columns.slice(0, 8).map((col) => (
                    <Box key={`${section.anchorKey}-${idx}-${col}`} component="td" sx={{ borderBottom: "1px solid #edf0f6", p: 0.5 }}>
                      {String(row?.[col] ?? "")}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      );
    }

    if (widgetType === "Text Block") {
      const text = String(widgetConfig.text || "").trim();
      if (!text) return null;
      return (
        <Typography
          sx={{
            fontSize: clamp(Math.floor(readNumeric(widgetConfig.fontSize, 16)), 8, 96),
            color: widgetConfig.color || "#1e2d4a",
            fontWeight: widgetConfig.bold ? 700 : 400,
            fontStyle: widgetConfig.italic ? "italic" : "normal",
            textDecoration: widgetConfig.underline ? "underline" : "none",
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
        </Typography>
      );
    }

    if (widgetType === "Image") {
      const src = String(widgetConfig.src || "").trim();
      if (!src) return null;
      const map = {
        center: "center center",
        "top-left": "left top",
        "top-center": "center top",
        "top-right": "right top",
        left: "left center",
        right: "right center",
        "bottom-left": "left bottom",
        "bottom-center": "center bottom",
        "bottom-right": "right bottom",
      };
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            minHeight: 100,
            backgroundImage: `url(${src})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: widgetConfig.fit === "cover" ? "cover" : "contain",
            backgroundPosition: map[widgetConfig.position] || "center center",
          }}
        />
      );
    }

    if (widgetType === "Icon") {
      return (
        <Typography
          sx={{
            fontSize: clamp(Math.floor(readNumeric(widgetConfig.fontSize, 24)), 8, 120),
            color: widgetConfig.color || "#1e2d4a",
            lineHeight: 1,
          }}
        >
          {widgetConfig.iconText || "*"}
        </Typography>
      );
    }

    if (widgetType === "Form") {
      const formName = String(widgetConfig.formName || "Lead Capture Form").trim();
      const submitLabel = String(widgetConfig.submitLabel || "Submit").trim();
      return (
        <Box sx={{ display: "grid", gap: 1, width: "100%", p: 1.25, border: "1px solid #d7deea", borderRadius: 2, bgcolor: "#fbfcff" }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#1e2d4a" }}>
            {formName}
          </Typography>
          <TextField size="small" label="Name" disabled />
          <TextField size="small" label="Email" disabled />
          <TextField size="small" label="Subject" disabled />
          <Button variant="contained" sx={{ justifySelf: "start" }}>
            {submitLabel}
          </Button>
        </Box>
      );
    }

    if (widgetType === "Synced Block") {
      const blockName = String(widgetConfig.blockName || "").trim();
      const syncedBlock = activePage?.syncedBlocks?.[blockName] || null;
      if (!blockName && !widgetConfig.content) return null;
      return (
        <Box sx={{ display: "grid", gap: 0.75, width: "100%" }}>
          {syncedBlock?.content || widgetConfig.content || null}
        </Box>
      );
    }

    if (widgetType === "Template Part") {
      const content = String(widgetConfig.content || "").trim();
      if (!content) return null;
      return <Typography sx={{ fontSize: 12, color: "#334363", whiteSpace: "pre-wrap" }}>{content}</Typography>;
    }

    return null;
  };

  const handleSectionImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateSectionWidgetField("src", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      {!isPageRoute && (
        <>
          <Box sx={{ bgcolor: "#1f355d", color: "#fff", px: 4, py: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Experience Builder
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
              Create and configure experience pages with cards, URLs, drag/drop, snap and resize.
            </Typography>
          </Box>

          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ maxWidth: 1200, mx: "auto", borderRadius: 2, p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Button variant="contained" onClick={openCreateDialog} sx={{ textTransform: "none" }}>
                  Create New Page
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <TextField
                  size="small"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{ sx: { bgcolor: "#f8fafc" } }}
                  sx={{ flex: "1 1 320px", maxWidth: 520 }}
                />
              </Box>

              <Box sx={{ mt: 3 }}>
                <Grid container spacing={2}>
            {filteredPages.map((page) => {
              const isPublished = String(page.status || "").toLowerCase() === "published";
              const pageUrl = isPublished ? page.pageUrl || "" : getConfigurePageUrl(page.id);
              return (
                <Grid item key={page.id} xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    onClick={() => window.open(getConfigurePageUrl(page.id), "_blank", "noopener,noreferrer")}
                    sx={{
                      bgcolor: "#ffffff",
                      color: "#1f355d",
                      border: "1px solid #2f5fff",
                      boxShadow: "0 4px 10px rgba(16, 24, 40, 0.16)",
                      borderRadius: 2,
                      p: 2,
                      minHeight: 160,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 1.5,
                      cursor: "pointer",
                      transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 10px 18px rgba(16, 24, 40, 0.22)",
                        borderColor: "#1a4fd8",
                      },
                    }}
                  >
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: 16,
                            color: "#1a4fd8",
                            lineHeight: 1.2,
                          }}
                        >
                          {page.name}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          {isPublished && (
                            <Tooltip title="Published">
                              <CheckCircleRoundedIcon sx={{ color: "#2e7d32", fontSize: 22 }} />
                            </Tooltip>
                          )}
                          {isPublished && pageUrl && (
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                window.open(pageUrl, "_blank", "noopener,noreferrer");
                              }}
                              sx={{
                                width: 28,
                                height: 28,
                                border: "1px solid #9fbaf4",
                                borderRadius: 1,
                                color: "#2f7dd6",
                                "&:hover": {
                                  bgcolor: "rgba(47,125,214,0.08)",
                                  borderColor: "#2f7dd6",
                                },
                              }}
                              aria-label="Open published page"
                            >
                              <OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: 12, color: "#51607d", mt: 1 }}>
                        Template ID: {page.id}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#51607d" }}>
                        Created by: {page.created_by ?? "-"}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#51607d" }}>
                        Last Modified:{" "}
                        {page.date_modified
                          ? new Date(page.date_modified).toLocaleDateString()
                          : page.date_created
                            ? new Date(page.date_created).toLocaleDateString()
                            : "-"}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        sx={{ textTransform: "none" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          deletePage(page);
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "none", borderRadius: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.alert("TODO: Manage access");
                        }}
                      >
                        Manage Access
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
                </Grid>
              </Box>
            </Box>
          </Container>
        </>
      )}

      {isPageRoute && activePage && (
        <Box sx={{ p: 0 }}>
          {(() => {
            const isEditPageRoute = Boolean(queryPageId) && !queryPublishedId && !isPreviewMode;
            const pageHeaderVisible = isEditPageRoute ? true : effectiveShellVisibility.header;
            const isFullscreenCanvas =
              !pageHeaderVisible &&
              !effectiveShellVisibility.left &&
              !effectiveShellVisibility.right &&
              !effectiveShellVisibility.bottom;
            const gridTemplateColumns = [
              effectiveShellVisibility.left ? `${shellSizes.leftWidth}px` : null,
              "1fr",
              effectiveShellVisibility.right ? `${shellSizes.rightWidth}px` : null,
            ]
              .filter(Boolean)
              .join(" ");
            const hostNavbarHeight = effectiveShellVisibility.navbar === false ? 0 : 65;
            const hostFooterHeight = 45;
            const shellViewportHeight = `calc(100vh - ${hostNavbarHeight}px - ${hostFooterHeight}px)`;
            const pageHeaderHeight = pageHeaderVisible ? SHELL.headerHeight : 0;
            const bodyViewportHeight = `calc(${shellViewportHeight} - ${pageHeaderHeight}px)`;
            const variableShellHeights = effectiveShellVisibility.bottom ? shellSizes.bottomHeight : 0;
            const useStandardPadding = effectiveShellVisibility.standardPadding !== false;
            const shellChromePadding = useStandardPadding ? 2 : 0;
            const bodyMinHeight = isFullscreenCanvas
              ? bodyViewportHeight
              : `calc(${bodyViewportHeight} - ${variableShellHeights}px)`;

            return (
              <>
                {pageHeaderVisible && (
                  <Box
                    sx={{
                      height: SHELL.headerHeight,
                      borderBottom: "1px solid #d8dde7",
                      px: shellChromePadding,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      bgcolor: "#fbfcff",
                      boxShadow: "0 1px 0 rgba(216, 221, 231, 0.6)",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: themeTools.whiteLabel.primaryColor }}>
                        Header (Fixed)
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>
                        {themeTools.whiteLabel.hideBranding ? themeTools.whiteLabel.brandName : themeTools.whiteLabel.brandName || "Tymebound"}
                        {themeTools.whiteLabel.tagline ? ` | ${themeTools.whiteLabel.tagline}` : ""}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>
                        {activePage.name} | {activePage.layoutName} | {activePage.cols}x{activePage.rows}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Box
                  ref={pageShellRef}
                  sx={{
                    border: "1px solid #d8dde7",
                    borderRadius: useStandardPadding ? 2 : 0,
                    overflow: "hidden",
                    bgcolor: "#ffffff",
                    height: bodyViewportHeight,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
            <Box sx={{ display: "grid", gridTemplateColumns, flex: 1, minHeight: 0 }}>
              {effectiveShellVisibility.left && (
                <Box
                  sx={{
                    minHeight: bodyMinHeight,
                    borderRight: "1px solid #d8dde7",
                    p: shellChromePadding,
                    bgcolor: "#f8faff",
                    position: "relative",
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: themeTools.whiteLabel.primaryColor }}>
                    Left Menu (Fixed)
                  </Typography>
                  <Box
                    onMouseDown={startShellResize("left")}
                    sx={{
                      position: "absolute",
                      top: 0,
                      right: -3,
                      width: 6,
                      height: "100%",
                      cursor: "col-resize",
                      zIndex: 10,
                      "&:hover": { bgcolor: "rgba(47,125,214,0.18)" },
                    }}
                  />
                </Box>
              )}

              <Box
                sx={{
                  p: mode === "edit" ? 0 : isFullscreenCanvas ? 0 : useStandardPadding ? 2 : 0,
                  minHeight: bodyMinHeight,
                }}
              >
                <Box
                  ref={canvasRef}
                  onDragOver={(event) => {
                    if (mode === "edit") event.preventDefault();
                  }}
                  onDrop={handleCanvasDrop}
                  sx={{
                    height: isFullscreenCanvas ? bodyMinHeight : `${canvasHeight}px`,
                    border: mode === "edit" ? "none" : `1px solid ${themeTools.whiteLabel.accentColor || "#d8dde7"}`,
                    borderRadius: mode === "edit" ? 0 : 1.5,
                    position: "relative",
                    overflow: "hidden",
                    backgroundColor: mode === "edit" ? "transparent" : "#ffffff",
                  }}
                >
                  {mode === "edit" && gridMarkersVisible &&
                    rowGeometry.map((rowMeta, index) =>
                      index === 0 ? null : (
                        <Box
                          key={`row-divider-${rowMeta.row.id}`}
                          sx={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: `${rowMeta.startPct}%`,
                            borderTop: "2px solid rgba(47,125,214,0.3)",
                            zIndex: 3,
                            pointerEvents: "none",
                          }}
                        />
                      )
                    )}

                  {sectionLayout.visibleSections.map((section) => {
                    const config = activePage?.sectionConfigs?.[section.anchorKey] || {};
                    const sectionPadding = resolveSectionPadding(config);
                    const sectionStyle = {
                      ...defaultSectionStyle,
                      ...(config.style || {}),
                    };
                    const sectionHeightPercent = clamp(
                      Math.floor(readNumeric(sectionStyle.heightPercent, 100)),
                      10,
                      300
                    );
                    const sectionVerticalPadding = sectionPadding.top + sectionPadding.bottom;
                    return (
                      <Box
                        key={`section-cell-${section.row}-${section.col}`}
                        sx={{
                          position: "absolute",
                          left: `${section.leftPx}px`,
                          top: `${section.topPx}px`,
                          width: `${section.widthPx}px`,
                          height: `${section.heightPx}px`,
                          zIndex: 4,
                          pointerEvents: "none",
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            top: `${sectionPadding.top}px`,
                            right: `${sectionPadding.right}px`,
                            left: `${sectionPadding.left}px`,
                            // Apply vertical paddings into computed height so bottom padding takes effect.
                            height: `max(8px, calc(${sectionHeightPercent}% - ${sectionVerticalPadding}px))`,
                            borderStyle: "solid",
                            borderWidth: `${Math.max(0, Number(sectionStyle.borderWidth) || 0)}px`,
                            borderColor: sectionStyle.borderColor || "#d8dde7",
                            borderRadius: `${Math.max(0, Number(sectionStyle.borderRadius) || 0)}px`,
                            bgcolor: sectionStyle.backgroundColor || "#ffffff",
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              inset: 0,
                              pointerEvents: "auto",
                              overflow: "auto",
                            }}
                          >
                            {renderSectionWidget(section, config)}
                          </Box>
                        </Box>
                        {mode === "edit" && config.widgetType && (
                          <Box
                            sx={{
                              position: "absolute",
                              left: `${sectionPadding.left + 6}px`,
                              top: `${sectionPadding.top + 6}px`,
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 0.75,
                              bgcolor: "rgba(47,125,214,0.12)",
                              color: "#1e2d4a",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {config.widgetType}
                          </Box>
                        )}
                        {mode === "edit" && (
                          <>
                            {gridMarkersVisible && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: `${sectionPadding.top}px`,
                                  right: `${sectionPadding.right}px`,
                                  bottom: `${sectionPadding.bottom}px`,
                                  left: `${sectionPadding.left}px`,
                                  border: section.merged
                                    ? "2px solid rgba(47,125,214,0.5)"
                                    : "1px dashed rgba(47,125,214,0.2)",
                                }}
                              />
                            )}
                            <Box sx={{ position: "absolute", top: 2, right: 2, pointerEvents: "auto" }}>
                              <Tooltip title={`Row ${section.row + 1} | Section ${section.col + 1}`}>
                                <IconButton
                                  size="small"
                                  aria-label={`Row ${section.row + 1} section ${section.col + 1} options`}
                                  onClick={() => openSectionModal(section)}
                                  sx={{
                                    width: 18,
                                    height: 18,
                                    bgcolor: "rgba(255,255,255,0.92)",
                                    border: "1px solid #d8dde7",
                                    "&:hover": { bgcolor: "#ffffff" },
                                  }}
                                >
                                  <MoreVertIcon sx={{ fontSize: 12 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </>
                        )}
                      </Box>
                    );
                  })}

                  {mode === "edit" && gridMarkersVisible &&
                    rowGeometry.flatMap((rowMeta) =>
                      Array.from({ length: rowMeta.row.columns - 1 }).map((_item, dividerIndex) => {
                        const leftPct = ((dividerIndex + 1) / rowMeta.row.columns) * 100;
                        return (
                          <Box
                            key={`section-divider-${rowMeta.row.id}-${dividerIndex}`}
                            sx={{
                              position: "absolute",
                              top: `${rowMeta.startPct}%`,
                              height: `${rowMeta.heightPct}%`,
                              left: `calc(${leftPct}% - 1px)`,
                              borderLeft: "2px dashed rgba(47,125,214,0.28)",
                              zIndex: 3,
                              pointerEvents: "none",
                            }}
                          />
                        );
                      })
                    )}

                  {mode === "edit" && (
                    <Box
                      onMouseDown={startCanvasBadgeDrag}
                      sx={{
                        position: "absolute",
                        top:
                          Number.isFinite(activePage?.canvasBadgePosition?.y)
                            ? `${activePage.canvasBadgePosition.y}px`
                            : isFullscreenCanvas
                              ? 12
                              : 10,
                        left:
                          Number.isFinite(activePage?.canvasBadgePosition?.x)
                            ? `${activePage.canvasBadgePosition.x}px`
                            : isFullscreenCanvas
                              ? 12
                              : 10,
                        zIndex: 6,
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: 12,
                        bgcolor: "rgba(25,118,210,0.08)",
                        color: "#124a8c",
                        border: "1px solid rgba(25,118,210,0.15)",
                        cursor: "move",
                        userSelect: "none",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Canvas</Typography>
                        <Tooltip title="Configure Page">
                          <IconButton
                            size="small"
                            aria-label="Configure Page"
                            onClick={() => setConfigurePageOpen(true)}
                            sx={{ p: 0.25 }}
                          >
                            <SettingsOutlinedIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Theme Tools">
                          <IconButton
                            size="small"
                            aria-label="Theme Tools"
                            onClick={() => setThemeToolsOpen(true)}
                            sx={{ p: 0.25 }}
                          >
                            <AutoAwesomeOutlinedIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Typography sx={{ fontSize: 12 }}>Grid {activePage.cols}x{activePage.rows}</Typography>
                        <Typography sx={{ fontSize: 12 }}>Rows {canvasLayoutRows}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#5f6f8a", ml: 0.5 }}>
                          Drag to move
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {(activePage.widgets || []).map((widget) => (
                    <Box
                      key={widget.id}
                      onMouseDown={(event) => startDragWidget(event, widget)}
                      sx={{
                        position: "absolute",
                        left: `${(widget.x / activePage.cols) * 100}%`,
                        top: `${(widget.y / activePage.rows) * 100}%`,
                        width: `${(widget.w / activePage.cols) * 100}%`,
                        height: `${(widget.h / activePage.rows) * 100}%`,
                        border: "1px solid #2f7dd6",
                        borderRadius: 1,
                        bgcolor: "#ffffff",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                        p: 1,
                        zIndex: 2,
                        cursor: mode === "edit" ? "move" : "default",
                        userSelect: "none",
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#1e2d4a" }}>
                        {widgetTitle(widget)}
                      </Typography>
                      {widget.type === "text" && (
                        <Typography sx={{ mt: 0.5, fontSize: 12, color: "#5f6f8a" }}>
                          Editable text placeholder
                        </Typography>
                      )}
                      {widget.type === "kpi" && (
                        <Typography sx={{ mt: 1, fontSize: 20, fontWeight: 700, color: "#124a8c" }}>
                          0
                        </Typography>
                      )}
                      {widget.type === "chart" && (
                        <Box
                          sx={{
                            mt: 1,
                            height: "70%",
                            borderRadius: 1,
                            bgcolor: "#f1f6ff",
                            border: "1px dashed #9cb4df",
                          }}
                        />
                      )}
                      {mode === "edit" && (
                        <Box
                          onMouseDown={(event) => startResizeWidget(event, widget)}
                          sx={{
                            position: "absolute",
                            right: 0,
                            bottom: 0,
                            width: 12,
                            height: 12,
                            bgcolor: "#2f7dd6",
                            cursor: "nwse-resize",
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>

              {effectiveShellVisibility.right && (
                <Box
                  sx={{
                    minHeight: bodyMinHeight,
                    borderLeft: "1px solid #d8dde7",
                    p: shellChromePadding,
                    bgcolor: "#f8faff",
                    position: "relative",
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: themeTools.whiteLabel.primaryColor }}>
                    Right Menu (Fixed)
                  </Typography>
                  <Box
                    onMouseDown={startShellResize("right")}
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: -3,
                      width: 6,
                      height: "100%",
                      cursor: "col-resize",
                      zIndex: 10,
                      "&:hover": { bgcolor: "rgba(47,125,214,0.18)" },
                    }}
                  />
                </Box>
              )}
            </Box>

            {effectiveShellVisibility.bottom && (
              <Box
                sx={{
                  height: shellSizes.bottomHeight,
                  borderTop: "1px solid #d8dde7",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  bgcolor: "#fbfcff",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography sx={{ fontWeight: 700, color: themeTools.whiteLabel.primaryColor }}>
                    Bottom Bar Center (Fixed)
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>
                    {themeTools.whiteLabel.brandName || "Tymebound"}
                    {themeTools.whiteLabel.tagline ? ` | ${themeTools.whiteLabel.tagline}` : ""}
                  </Typography>
                </Box>
                <Box
                  onMouseDown={startShellResize("bottom")}
                  sx={{
                    position: "absolute",
                    top: -3,
                    left: 0,
                    width: "100%",
                    height: 6,
                    cursor: "row-resize",
                    zIndex: 10,
                    "&:hover": { bgcolor: "rgba(47,125,214,0.18)" },
                  }}
                />
              </Box>
            )}
          </Box>
              </>
            );
          })()}
        </Box>
      )}

      {isPageRoute && !activePage && (
        <Box sx={{ p: 3 }}>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #cfd5e2", borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, color: "#16233b" }}>
              {queryPublishedId ? "Published page not available" : "Page not found"}
            </Typography>
            <Typography sx={{ mt: 0.75, color: "#5f6f8a" }}>
              {queryPublishedId
                ? "This page has not been published or is unavailable."
                : "This page id does not exist in the experience builder store."}
            </Typography>
            <Button sx={{ mt: 1.5 }} variant="outlined" onClick={() => (window.location.href = window.location.pathname)}>
              Back to Pages
            </Button>
          </Paper>
        </Box>
      )}

      <DesignerInputPanel
        open={createOpen}
        initialValue={designerInitialValue}
        previewSpec={designerPreviewSpec}
        promptBundle={designerPromptBundle}
        revisions={revisionEntries}
        tableOptions={tableOptions}
        tableColumnsByTable={columnsByTable}
        generating={designerBusy}
        committing={designerCommitting}
        error={designerError}
        onLoadTableColumns={loadColumns}
        onClose={() => {
          setCreateOpen(false);
          setDesignerPromptBundle(null);
        }}
        onDraftChange={() => {
          setDesignerPreviewSpec(null);
          setDesignerError("");
        }}
        onGenerate={handleGenerateDesignerPreview}
        onCreate={handleCreatePage}
      />

      <Dialog open={configurePageOpen} onClose={() => setConfigurePageOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Page</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gap: 0.5, pt: 0.5 }}>
            <FormControlLabel
              control={<Switch checked={shellVisibility.navbar} onChange={toggleShellVisibility("navbar")} />}
              label="Show / Hide Navbar"
            />
            <FormControlLabel
              control={<Switch checked={shellVisibility.header} onChange={toggleShellVisibility("header")} />}
              label="Add / Remove Header"
            />
            <FormControlLabel
              control={<Switch checked={shellVisibility.left} onChange={toggleShellVisibility("left")} />}
              label="Add / Remove Side Bar (Left)"
            />
            <FormControlLabel
              control={<Switch checked={shellVisibility.right} onChange={toggleShellVisibility("right")} />}
              label="Add / Remove Side Bar (Right)"
            />
            <FormControlLabel
              control={<Switch checked={shellVisibility.bottom} onChange={toggleShellVisibility("bottom")} />}
              label="Add / Remove Bottom Bar"
            />
            <FormControlLabel
              control={<Switch checked={shellVisibility.standardPadding} onChange={toggleShellVisibility("standardPadding")} />}
              label="Add / Remove Standard Padding"
            />
            <FormControlLabel
              control={<Switch checked={shellVisibility.grid} onChange={toggleShellVisibility("grid")} />}
              label="Show / Hide Grid"
            />
            <Box sx={{ mt: 1.25 }}>
              <Button variant="outlined" onClick={addNewRowAtBottom}>
                Add New Row
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setConfigurePageOpen(false)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rowModalOpen} onClose={() => setRowModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Row Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gap: 1.25, pt: 0.5 }}>
            <Typography sx={{ fontSize: 13, color: "#5f6f8a" }}>
              Row {selectedRowIndex + 1}
            </Typography>
            <TextField
              select
              size="small"
              label="No. of Columns"
              value={String(clamp(Number(rowFormColumns) || 1, 1, 8))}
              onChange={(event) =>
                setRowFormColumns(clamp(Number(event.target.value) || 1, 1, 8))
              }
            >
              {Array.from({ length: 8 }).map((_item, index) => (
                <MenuItem key={`row-col-${index + 1}`} value={index + 1}>
                  {index + 1}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="number"
              label="Row Height (px)"
              value={rowFormHeight}
              onChange={(event) => setRowFormHeight(Math.max(1, Number(event.target.value) || 1))}
              inputProps={{ min: 1, step: 1 }}
              helperText="Exact row height in pixels"
            />
            <TextField
              size="small"
              type="number"
              label="Row Padding"
              value={rowFormPadding}
              onChange={(event) => setRowFormPadding(Math.max(0, Number(event.target.value) || 0))}
              inputProps={{ min: 0, step: 1 }}
            />
            <TextField
              size="small"
              type="number"
              label="Gap Between Sections"
              value={rowFormGap}
              onChange={(event) => setRowFormGap(Math.max(0, Number(event.target.value) || 0))}
              inputProps={{ min: 0, step: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={addWidgetRow}>
              Add Widget Row
            </Button>
            <Button variant="outlined" onClick={duplicateRow}>
              Duplicate Row
            </Button>
            <Button variant="outlined" color="error" onClick={deleteRow} disabled={canvasRows.length <= 1}>
              Delete Row
            </Button>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={() => setRowModalOpen(false)}>
              Close
            </Button>
            <Button variant="contained" onClick={saveRowSettings}>
              Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={sectionModalOpen} onClose={() => setSectionModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Section Options</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: "#5f6f8a", mb: 1.5 }}>
            Row {selectedSection ? selectedSection.row + 1 : "-"} | Section {selectedSection ? selectedSection.col + 1 : "-"}
          </Typography>
          <Tabs
            value={sectionOptionsTab}
            onChange={(_event, next) => setSectionOptionsTab(next)}
            sx={{ borderBottom: "1px solid #e1e6ef", mb: 1.5 }}
          >
            <Tab label="Section Options" />
            <Tab label="Row Configuration" />
          </Tabs>
          {sectionOptionsTab === 0 && (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1, alignItems: "center" }}>
              <TextField
                size="small"
                type="number"
                label="Split into Columns"
                value={splitColumnsCount}
                onChange={(event) =>
                  setSplitColumnsCount(clamp(Math.floor(Number(event.target.value) || 2), 2, 8))
                }
                inputProps={{ min: 2, max: 8, step: 1 }}
              />
              <Button variant="outlined" onClick={splitSectionIntoColumns}>
                Split
              </Button>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1, alignItems: "center" }}>
              <TextField
                size="small"
                type="number"
                label="Split into Rows"
                value={splitRowsCount}
                onChange={(event) =>
                  setSplitRowsCount(clamp(Math.floor(Number(event.target.value) || 2), 2, 8))
                }
                inputProps={{ min: 2, max: 8, step: 1 }}
              />
              <Button variant="outlined" onClick={splitSectionIntoRows}>
                Split
              </Button>
            </Box>
            <TextField
              select
              size="small"
              label="Add Widget"
              value={selectedSectionConfig?.widgetType || ""}
              onChange={(event) => setSectionWidget(event.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {availableSectionWidgets.map((widgetType) => (
                <MenuItem key={`section-widget-${widgetType}`} value={widgetType}>
                  Add {widgetType}
                </MenuItem>
              ))}
            </TextField>
            {selectedSectionConfig?.widgetType === "Chart" && (
              <>
                <TextField
                  select
                  size="small"
                  label="Select Table"
                  value={selectedSectionConfig.widgetConfig.tableName || ""}
                  onChange={(event) => {
                    const tableName = event.target.value;
                    updateSectionWidgetField("tableName", tableName);
                    updateSectionWidgetField("xAxis", "");
                    updateSectionWidgetField("yAxis", "");
                    loadColumns(tableName);
                    loadTableRows(tableName);
                  }}
                >
                  {tableOptions.map((tableName) => (
                    <MenuItem key={`chart-table-${tableName}`} value={tableName}>
                      {tableName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Chart Type"
                  value={selectedSectionConfig.widgetConfig.chartType || ""}
                  onChange={(event) => updateSectionWidgetField("chartType", event.target.value)}
                >
                  {CHART_TYPES.map((type) => (
                    <MenuItem key={`chart-type-${type}`} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Chart Name"
                  value={selectedSectionConfig.widgetConfig.chartName || ""}
                  onChange={(event) => updateSectionWidgetField("chartName", event.target.value)}
                />
                <TextField
                  select
                  size="small"
                  label="X-Axis (Column)"
                  value={selectedSectionConfig.widgetConfig.xAxis || ""}
                  onChange={(event) => updateSectionWidgetField("xAxis", event.target.value)}
                  disabled={!selectedSectionConfig.widgetConfig.tableName}
                >
                  {normalizeColumnNames(
                    columnsByTable[selectedSectionConfig.widgetConfig.tableName] || []
                  ).map((column) => (
                    <MenuItem key={`chart-x-${column}`} value={column}>
                      {column}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Y-Axis (Column)"
                  value={selectedSectionConfig.widgetConfig.yAxis || ""}
                  onChange={(event) => updateSectionWidgetField("yAxis", event.target.value)}
                  disabled={!selectedSectionConfig.widgetConfig.tableName}
                >
                  {normalizeColumnNames(
                    columnsByTable[selectedSectionConfig.widgetConfig.tableName] || []
                  ).map((column) => (
                    <MenuItem key={`chart-y-${column}`} value={column}>
                      {column}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Aggregation"
                  value={selectedSectionConfig.widgetConfig.aggregation || "actual"}
                  onChange={(event) => updateSectionWidgetField("aggregation", event.target.value)}
                >
                  {AGGREGATIONS.map((agg) => (
                    <MenuItem key={`agg-${agg}`} value={agg}>
                      {agg}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
            {selectedSectionConfig?.widgetType === "Table" && (
              <>
                <TextField
                  select
                  size="small"
                  label="Select Table"
                  value={selectedSectionConfig.widgetConfig.tableName || ""}
                  onChange={(event) => {
                    const tableName = event.target.value;
                    updateSectionWidgetField("tableName", tableName);
                    loadColumns(tableName);
                    loadTableRows(tableName);
                  }}
                >
                  {tableOptions.map((tableName) => (
                    <MenuItem key={`table-widget-${tableName}`} value={tableName}>
                      {tableName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  label="Rows Limit"
                  value={selectedSectionConfig.widgetConfig.limit || 10}
                  onChange={(event) =>
                    updateSectionWidgetField(
                      "limit",
                      clamp(Math.floor(readNumeric(event.target.value, 10)), 1, 100)
                    )
                  }
                  inputProps={{ min: 1, max: 100, step: 1 }}
                />
              </>
            )}
            {selectedSectionConfig?.widgetType === "Text Block" && (
              <>
                <TextField
                  size="small"
                  label="Text"
                  value={selectedSectionConfig.widgetConfig.text || ""}
                  onChange={(event) => updateSectionWidgetField("text", event.target.value)}
                  multiline
                  minRows={3}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Font Size"
                  value={selectedSectionConfig.widgetConfig.fontSize || 16}
                  onChange={(event) =>
                    updateSectionWidgetField(
                      "fontSize",
                      clamp(Math.floor(readNumeric(event.target.value, 16)), 8, 96)
                    )
                  }
                  inputProps={{ min: 8, max: 96, step: 1 }}
                />
                <TextField
                  size="small"
                  label="Color"
                  value={selectedSectionConfig.widgetConfig.color || "#1e2d4a"}
                  onChange={(event) => updateSectionWidgetField("color", event.target.value)}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(selectedSectionConfig.widgetConfig.bold)}
                      onChange={(_event, checked) => updateSectionWidgetField("bold", checked)}
                    />
                  }
                  label="Bold"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(selectedSectionConfig.widgetConfig.italic)}
                      onChange={(_event, checked) => updateSectionWidgetField("italic", checked)}
                    />
                  }
                  label="Italic"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(selectedSectionConfig.widgetConfig.underline)}
                      onChange={(_event, checked) => updateSectionWidgetField("underline", checked)}
                    />
                  }
                  label="Underline"
                />
              </>
            )}
            {selectedSectionConfig?.widgetType === "Image" && (
              <>
                <TextField
                  size="small"
                  label="Image URL"
                  value={selectedSectionConfig.widgetConfig.src || ""}
                  onChange={(event) => updateSectionWidgetField("src", event.target.value)}
                />
                <Button variant="outlined" component="label">
                  Upload Image
                  <input hidden type="file" accept="image/*" onChange={handleSectionImageUpload} />
                </Button>
                <TextField
                  select
                  size="small"
                  label="Position"
                  value={selectedSectionConfig.widgetConfig.position || "center"}
                  onChange={(event) => updateSectionWidgetField("position", event.target.value)}
                >
                  {IMAGE_POSITIONS.map((position) => (
                    <MenuItem key={`img-pos-${position}`} value={position}>
                      {position}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Fit"
                  value={selectedSectionConfig.widgetConfig.fit || "contain"}
                  onChange={(event) => updateSectionWidgetField("fit", event.target.value)}
                >
                  <MenuItem value="contain">contain</MenuItem>
                  <MenuItem value="cover">cover</MenuItem>
                </TextField>
              </>
            )}
            {selectedSectionConfig?.widgetType === "Icon" && (
              <>
                <TextField
                  size="small"
                  label="Icon Text"
                  value={selectedSectionConfig.widgetConfig.iconText || "*"}
                  onChange={(event) => updateSectionWidgetField("iconText", event.target.value)}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Icon Size"
                  value={selectedSectionConfig.widgetConfig.fontSize || 24}
                  onChange={(event) =>
                    updateSectionWidgetField(
                      "fontSize",
                      clamp(Math.floor(readNumeric(event.target.value, 24)), 8, 120)
                    )
                  }
                  inputProps={{ min: 8, max: 120, step: 1 }}
                />
                <TextField
                  size="small"
                  label="Icon Color"
                  value={selectedSectionConfig.widgetConfig.color || "#1e2d4a"}
                  onChange={(event) => updateSectionWidgetField("color", event.target.value)}
                />
              </>
            )}
            {selectedSectionConfig?.widgetType === "Form" && (
              <>
                <TextField
                  size="small"
                  label="Form Name"
                  value={selectedSectionConfig.widgetConfig.formName || ""}
                  onChange={(event) => updateSectionWidgetField("formName", event.target.value)}
                />
                <TextField
                  size="small"
                  label="Submit Label"
                  value={selectedSectionConfig.widgetConfig.submitLabel || "Submit"}
                  onChange={(event) => updateSectionWidgetField("submitLabel", event.target.value)}
                />
                <TextField
                  select
                  size="small"
                  label="Action"
                  value={selectedSectionConfig.widgetConfig.action || "ajax"}
                  onChange={(event) => updateSectionWidgetField("action", event.target.value)}
                >
                  <MenuItem value="ajax">AJAX Submit</MenuItem>
                  <MenuItem value="static">Static Submit</MenuItem>
                </TextField>
              </>
            )}
            {selectedSectionConfig?.widgetType === "Synced Block" && (
              <>
                <TextField
                  size="small"
                  label="Block Name"
                  value={selectedSectionConfig.widgetConfig.blockName || ""}
                  onChange={(event) => updateSectionWidgetField("blockName", event.target.value)}
                />
                <TextField
                  size="small"
                  label="Shared Content"
                  value={selectedSectionConfig.widgetConfig.content || ""}
                  onChange={(event) => updateSectionWidgetField("content", event.target.value)}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedSectionConfig.widgetConfig.sync !== false}
                      onChange={(_event, checked) => updateSectionWidgetField("sync", checked)}
                    />
                  }
                  label="Sync across uses"
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    const blockName = String(selectedSectionConfig.widgetConfig.blockName || "hero").trim() || "hero";
                    updateSelectedSectionConfig((current) => ({
                      ...current,
                      widgetConfig: {
                        ...current.widgetConfig,
                        blockName,
                        sync: current.widgetConfig?.sync !== false,
                      },
                    }));
                    setActivePagePatch((page) => ({
                      ...page,
                      syncedBlocks: {
                        ...(page.syncedBlocks || {}),
                        [blockName]: {
                          title: blockName,
                          content: selectedSectionConfig.widgetConfig.content || "Shared synced content",
                        },
                      },
                    }));
                  }}
                >
                  Save Synced Block
                </Button>
              </>
            )}
            {selectedSectionConfig?.widgetType === "Template Part" && (
              <>
                <TextField
                  select
                  size="small"
                  label="Template Part"
                  value={selectedSectionConfig.widgetConfig.templatePart || "header"}
                  onChange={(event) => updateSectionWidgetField("templatePart", event.target.value)}
                >
                  <MenuItem value="header">Header</MenuItem>
                  <MenuItem value="footer">Footer</MenuItem>
                  <MenuItem value="single">Single</MenuItem>
                  <MenuItem value="archive">Archive</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  label="Variant"
                  value={selectedSectionConfig.widgetConfig.variant || "default"}
                  onChange={(event) => updateSectionWidgetField("variant", event.target.value)}
                />
              </>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <TextField
                size="small"
                type="number"
                label="Padding Top"
                value={selectedSectionConfig?.paddingTop ?? 0}
                onChange={(event) => setSectionPaddingSide("top", event.target.value)}
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Padding Right"
                value={selectedSectionConfig?.paddingRight ?? 0}
                onChange={(event) => setSectionPaddingSide("right", event.target.value)}
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Padding Bottom"
                value={selectedSectionConfig?.paddingBottom ?? 0}
                onChange={(event) => setSectionPaddingSide("bottom", event.target.value)}
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Padding Left"
                value={selectedSectionConfig?.paddingLeft ?? 0}
                onChange={(event) => setSectionPaddingSide("left", event.target.value)}
                inputProps={{ min: 0, step: 1 }}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: "#334363" }}>Background Color</Typography>
              <TextField
                size="small"
                type="color"
                value={selectedSectionConfig?.style?.backgroundColor ?? "#ffffff"}
                onChange={(event) => updateSectionStyleField("backgroundColor", event.target.value)}
                sx={{ width: 90 }}
                inputProps={{ "aria-label": "Background Color" }}
              />
            </Box>
            <TextField
              size="small"
              type="number"
              label="Border Thickness"
              value={selectedSectionConfig?.style?.borderWidth ?? 1}
              onChange={(event) =>
                updateSectionStyleField(
                  "borderWidth",
                  clamp(Math.floor(readNumeric(event.target.value, 1)), 0, 24)
                )
              }
              inputProps={{ min: 0, max: 24, step: 1 }}
            />
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Typography sx={{ fontSize: 13, color: "#334363" }}>Border Color</Typography>
              <TextField
                size="small"
                type="color"
                value={selectedSectionConfig?.style?.borderColor ?? "#d8dde7"}
                onChange={(event) => updateSectionStyleField("borderColor", event.target.value)}
                sx={{ width: 90 }}
                inputProps={{ "aria-label": "Border Color" }}
              />
            </Box>
            <TextField
              size="small"
              type="number"
              label="Corner Radius"
              value={selectedSectionConfig?.style?.borderRadius ?? 8}
              onChange={(event) =>
                updateSectionStyleField(
                  "borderRadius",
                  clamp(Math.floor(readNumeric(event.target.value, 8)), 0, 120)
                )
              }
              inputProps={{ min: 0, max: 120, step: 1 }}
            />
          </Box>
          )}
          {sectionOptionsTab === 1 && (
            <Box sx={{ display: "grid", gap: 1.25, pt: 0.25 }}>
              <Typography sx={{ fontSize: 13, color: "#5f6f8a" }}>
                Row {selectedRowIndex >= 0 ? selectedRowIndex + 1 : "-"}
              </Typography>
              <TextField
                select
                size="small"
                label="No. of Columns"
                value={String(clamp(Number(rowFormColumns) || 1, 1, 8))}
                onChange={(event) =>
                  setRowFormColumns(clamp(Number(event.target.value) || 1, 1, 8))
                }
              >
                {Array.from({ length: 8 }).map((_item, index) => (
                  <MenuItem key={`section-row-col-${index + 1}`} value={index + 1}>
                    {index + 1}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="number"
                label="Row Height (px)"
                value={rowFormHeight}
                onChange={(event) => setRowFormHeight(Math.max(1, Number(event.target.value) || 1))}
                inputProps={{ min: 1, step: 1 }}
                helperText="Exact row height in pixels"
              />
              <TextField
                size="small"
                type="number"
                label="Row Padding"
                value={rowFormPadding}
                onChange={(event) => setRowFormPadding(Math.max(0, Number(event.target.value) || 0))}
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Gap Between Sections"
                value={rowFormGap}
                onChange={(event) => setRowFormGap(Math.max(0, Number(event.target.value) || 0))}
                inputProps={{ min: 0, step: 1 }}
              />
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                <Button size="small" variant="outlined" onClick={() => duplicateRow(false)}>
                  Duplicate Row
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    deleteRow(false);
                    setSectionModalOpen(false);
                  }}
                  disabled={canvasRows.length <= 1}
                >
                  Delete Row
                </Button>
                <Button size="small" variant="contained" onClick={() => saveRowSettings(false)}>
                  Save
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {sectionOptionsTab === 0 && (
              <>
                <Button variant="outlined" onClick={mergeSectionRight} disabled={!canMergeRight}>
                  Merge Horizontal (Right)
                </Button>
                <Button variant="outlined" onClick={mergeSectionDown} disabled={!canMergeDown}>
                  Merge Vertical (Down)
                </Button>
                <Button variant="outlined" color="error" onClick={unmergeSection} disabled={!selectedSection?.merged}>
                  Unmerge
                </Button>
              </>
            )}
          </Box>
          <Button variant="contained" onClick={() => setSectionModalOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <ThemeToolsDialog
        open={themeToolsOpen}
        page={activePage}
        mode={mode}
        onClose={() => setThemeToolsOpen(false)}
        onApplyPreset={applyThemePreset}
        onUpdateThemeTools={updateThemeTools}
      />

      <Snackbar
        open={notice.open}
        autoHideDuration={3000}
        onClose={() => setNotice((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={notice.severity}
          variant="filled"
          onClose={() => setNotice((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
