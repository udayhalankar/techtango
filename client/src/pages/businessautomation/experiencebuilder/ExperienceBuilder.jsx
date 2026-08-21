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
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import api from "../../../services/api";
import Chart from "chart.js/auto";
import { useLocation } from "react-router-dom";
import ShellOptionsModal from "./ShellOptionsModal";

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

const SHELL = { headerHeight: 64, leftWidth: 250, rightWidth: 250, bottomHeight: 90 };
const DEFAULT_SHELL_VISIBILITY = {
  navbar: true,
  header: true,
  left: true,
  right: true,
  bottom: true,
  cardShadow: true,
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
  const pageId = String(row?.id ?? pageData?.id ?? `pg_${index + 1}`);
  const shell = { ...(DEFAULT_SHELL_VISIBILITY || {}), ...(pageData?.shell || {}) };
  const shellSizes = { ...(DEFAULT_SHELL_SIZES || {}), ...(pageData?.shellSizes || {}) };
  const shellChrome = {
    header: {
      title: "Header (Fixed)",
      subtitle: "",
      note: "",
      ...(pageData?.shellChrome?.header || {}),
    },
    footer: {
      title: "Footer (Fixed)",
      subtitle: "",
      note: "",
      ...(pageData?.shellChrome?.footer || {}),
    },
    menu: {
      title: "Menu (Fixed)",
      subtitle: "",
      note: "",
      ...(pageData?.shellChrome?.menu || {}),
    },
  };
  const canvasLayoutRows = Math.max(2, Math.floor(Number(pageData?.canvasLayoutRows) || 3));

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
    shellChrome,
    canvasLayoutRows,
    canvasRows: normalizeCanvasRows(pageData?.canvasRows, canvasLayoutRows),
    canvasBadgePosition: pageData?.canvasBadgePosition || null,
    sectionMerges: Array.isArray(pageData?.sectionMerges) ? pageData.sectionMerges : [],
    sectionConfigs: pageData?.sectionConfigs || {},
    createdAt: pageData?.createdAt || row?.date_created || new Date().toISOString(),
    updatedAt: row?.date_modified || pageData?.updatedAt || null,
    pageUrl: row?.page_url || pageData?.pageUrl || "",
    status: row?.status || pageData?.status || "Active",
  };
};

const TableSectionWidget = ({ section, config, tableRowsByTable, tableErrorsByTable, columnsByTable }) => {
  const widgetConfig = {
    limit: 10,
    ...(config?.widgetConfig || {}),
  };
  const tableName = String(widgetConfig.tableName || "").trim();
  const rows = tableRowsByTable?.[tableName] || [];
  const tableError = tableErrorsByTable?.[tableName];
  const normalizedColumns = normalizeColumnNames(columnsByTable?.[tableName]);
  const columns = normalizedColumns.length ? normalizedColumns : Object.keys(rows[0] || {});
  const defaultRowsPerPage = clamp(Math.floor(readNumeric(widgetConfig.limit, 10)), 1, 100);
  const rowsPerPageOptions = [5, 10, 15, 20, 25, 50, 100];
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [page, setPage] = useState(0);
  const [searchText, setSearchText] = useState("");

  const filteredRows = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      columns.some((col) => String(row?.[col] ?? "").toLowerCase().includes(needle))
    );
  }, [rows, columns, searchText]);

  useEffect(() => {
    setPage(0);
  }, [tableName, rowsPerPage, searchText]);

  useEffect(() => {
    setRowsPerPage(defaultRowsPerPage);
    setPage(0);
  }, [tableName, defaultRowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const pageRows = filteredRows.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);

  if (!tableName) {
    return <Typography sx={{ fontSize: 12, color: "#8a97ad" }}>Select table.</Typography>;
  }
  if (tableError) {
    return <Typography sx={{ fontSize: 12, color: "#c62828" }}>{tableError}</Typography>;
  }
  if (!rows.length) {
    return <Typography sx={{ fontSize: 12, color: "#8a97ad" }}>No rows available.</Typography>;
  }
  if (!filteredRows.length) {
    return <Typography sx={{ fontSize: 12, color: "#8a97ad" }}>No matching rows found.</Typography>;
  }

  return (
    <Box sx={{ width: "100%", height: "100%", overflow: "auto", display: "grid", gap: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <TextField
          size="small"
          label="Search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search rows"
          sx={{
            width: "20%",
            maxWidth: 240,
          }}
        />
      </Box>

      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f6f9ff" }}>
              <TableCell sx={{ fontWeight: 800, color: "#16233b", borderBottom: "none", py: 0.8, width: 72 }}>
                #
              </TableCell>
              {columns.slice(0, 7).map((col) => (
                <TableCell
                  key={`${section.anchorKey}-head-${col}`}
                  sx={{ fontWeight: 800, color: "#16233b", borderBottom: "none", py: 0.8 }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((row, rowIndex) => {
              const rowNo = safePage * rowsPerPage + rowIndex + 1;
              return (
                <TableRow key={`${section.anchorKey}-row-${safePage}-${rowIndex}`} sx={{ "&:nth-of-type(odd)": { bgcolor: "#fbfdff" } }}>
                  <TableCell sx={{ borderBottom: "1px solid #edf2f8", py: 0.85, fontWeight: 700, color: "#1e2d4a" }}>
                    {rowNo}
                  </TableCell>
                  {columns.slice(0, 7).map((col, cellIndex) => {
                    const value = String(row?.[col] ?? "");
                    return (
                      <TableCell
                        key={`${section.anchorKey}-cell-${safePage}-${rowIndex}-${cellIndex}`}
                        sx={{ borderBottom: "1px solid #edf2f8", py: 0.85, whiteSpace: "normal", wordBreak: "break-word" }}
                      >
                        {value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
          pt: 1,
          borderTop: "1px solid #edf2f8",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="body2" sx={{ color: "#1e2d4a", whiteSpace: "nowrap" }}>
            Rows per page:
          </Typography>
          <TextField
            select
            size="small"
            value={rowsPerPage}
            onChange={(event) => {
              const next = clamp(Math.floor(Number(event.target.value) || defaultRowsPerPage), 1, 100);
              setRowsPerPage(next);
              setPage(0);
            }}
            sx={{ width: 92 }}
          >
            {rowsPerPageOptions.map((value) => (
              <MenuItem key={`${section.anchorKey}-rpp-${value}`} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" sx={{ color: "#1e2d4a", whiteSpace: "nowrap" }}>
            Page {safePage + 1} of {totalPages}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage <= 0}
            sx={{ minWidth: 88 }}
          >
            Prev
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={safePage >= totalPages - 1}
            sx={{ minWidth: 88 }}
          >
            Next
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

const widgetTitle = (widget) => {
  if (widget.type === "text") return "Text Block";
  if (widget.type === "kpi") return "KPI Card";
  if (widget.type === "chart") return "Chart Widget";
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
  const [configurePageOpen, setConfigurePageOpen] = useState(false);
  const [shellOptionsOpen, setShellOptionsOpen] = useState(false);
  const [shellOptionsSlot, setShellOptionsSlot] = useState("header");
  const [rowModalOpen, setRowModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
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
  const pageHeaderRef = useRef(null);
  const pageShellRef = useRef(null);
  const dragStateRef = useRef(null);
  const canvasToolbarDragRef = useRef(null);
  const resizeStateRef = useRef(null);
  const shellResizeRef = useRef(null);

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

  const tilesPerPage = 8;
  const pageCount = Math.max(1, Math.ceil(filteredPages.length / tilesPerPage));
  const [pageIndex, setPageIndex] = useState(0);
  const pagedPages = useMemo(
    () => filteredPages.slice(pageIndex * tilesPerPage, (pageIndex + 1) * tilesPerPage),
    [filteredPages, pageIndex]
  );

  useEffect(() => {
    setPageIndex((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setPageIndex(0);
  }, [search]);

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

  const shellVisibility = useMemo(
    () => ({ ...DEFAULT_SHELL_VISIBILITY, ...(activePage?.shell || {}) }),
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
          let nextPages = activePages;
          let exists = nextPages.some((page) => String(page.id) === String(routePageId));
          if (!exists) {
            try {
              const singleRes = await api.get(`/experiencebuilder/${encodeURIComponent(routePageId)}`);
              const singlePage = normalizeExperiencePageRecord(singleRes.data, nextPages.length);
              if (queryPublishedId && String(singlePage.status || "").toLowerCase() !== "published") {
                throw new Error("Published page is not available.");
              }
              nextPages = [singlePage, ...nextPages];
              exists = true;
            } catch {
              if (snapshotHasQuery) {
                nextPages = snapshotPages;
                exists = true;
              }
            }
          }

          if (queryPageId && !queryPublishedId) {
            nextPages = nextPages.map((page) =>
              String(page.id) === String(routePageId)
                ? {
                    ...page,
                    shell: {
                      ...DEFAULT_SHELL_VISIBILITY,
                      ...(page.shell || {}),
                      header: true,
                    },
                  }
                : page
            );
          }

          setPages(nextPages);
          if (exists) {
            setActivePageId(routePageId);
          } else if (nextPages[0]?.id) {
            setActivePageId(String(nextPages[0].id));
          }
          setMode(isPreviewMode || isPublishedMode ? "published" : "edit");
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

  const syncActivePageToServer = async (nextStatus) => {
    if (!activePage) return null;
    const normalizedNextStatus = String(nextStatus || activePage.status || "Active");
    const nextIsPublished = normalizedNextStatus.toLowerCase() === "published";
    const currentIsPublished = String(activePage.status || "").toLowerCase() === "published";
    const pagePayload = {
      ...activePage,
      status: normalizedNextStatus,
    };
    const pageUrl = nextIsPublished
      ? getPublishedPageUrl(activePage.id)
      : currentIsPublished
        ? activePage.pageUrl || getPublishedPageUrl(activePage.id)
        : null;
    const res = await api.put(`/experiencebuilder/${encodeURIComponent(activePage.id)}`, {
      pageName: pagePayload.name || pagePayload.page_name || `Experience Page ${activePage.id}`,
      description: pagePayload.description || null,
      layout: pagePayload,
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
        await syncActivePageToServer("Active");
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
        const saved = await syncActivePageToServer("Published");
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
    setCreateOpen(true);
  };

  const handleCreatePage = async () => {
    const pageId = `pg_${Date.now()}`;
    const layoutDefinition = normalizeExperienceLayoutDefinition(selectedLayout?.layoutDefinition || {});
    const nextPage = {
      id: pageId,
      name: `Experience Page ${pages.length + 1}`,
      description: "",
      layoutId: selectedLayout.id,
      layoutName: selectedLayout.name,
      cols: Math.max(1, Math.floor(Number(selectedLayout?.cols) || 96)),
      rows: Math.max(1, Math.floor(Number(selectedLayout?.rows) || 72)),
      widgets: [],
      shell: { ...DEFAULT_SHELL_VISIBILITY, ...(layoutDefinition.shell || {}) },
      shellSizes: { ...DEFAULT_SHELL_SIZES, ...(layoutDefinition.shellSizes || {}) },
      canvasLayoutRows: Math.max(2, Math.floor(Number(layoutDefinition.canvasLayoutRows) || 3)),
      canvasRows: normalizeCanvasRows(layoutDefinition.canvasRows, layoutDefinition.canvasLayoutRows || 3),
      sectionMerges: [],
      sectionConfigs: {},
      createdAt: new Date().toISOString(),
      status: "Active",
    };
    try {
      const res = await api.post("/experiencebuilder", {
        pageName: nextPage.name,
        description: nextPage.description || null,
        layout: nextPage,
        status: nextPage.status,
        pageUrl: null,
      });
      const savedPage = normalizeExperiencePageRecord(res.data, pages.length);
      setPages((prev) => [savedPage, ...prev]);
      setActivePageId(savedPage.id);
      setMode("edit");
      setCreateOpen(false);
      window.open(getConfigurePageUrl(savedPage.id), "_blank");
    } catch (error) {
      console.error("Failed to create experience page", error);
      window.alert(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to create experience page."
      );
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
    const widgetDef = WIDGET_LIBRARY.find((item) => item.type === widgetType);
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
        ...DEFAULT_SHELL_VISIBILITY,
        ...(page.shell || {}),
        [key]: checked,
      },
    }));
  };

  const openShellOptionsModal = (slotKey) => {
    setShellOptionsSlot(slotKey);
    setShellOptionsOpen(true);
  };

  const saveShellOptions = (slotKey, draft) => {
    if (!activePage) return;
    setActivePagePatch((page) => ({
      ...page,
      shellChrome: {
        ...(page.shellChrome || {}),
        [slotKey]: {
          ...(page.shellChrome?.[slotKey] || {}),
          title: String(draft?.title || "").trim(),
          subtitle: String(draft?.subtitle || "").trim(),
          note: String(draft?.note || "").trim(),
        },
      },
    }));
    setShellOptionsOpen(false);
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
    const removeStandardPadding = shellVisibility.standardPadding === false;
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
  }, [canvasRows, activePage, canvasWidth, canvasHeight, shellVisibility.standardPadding]);

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

  const startCanvasToolbarDrag = (event) => {
    if (mode !== "edit" || !activePage || !pageHeaderRef.current) return;
    const headerRect = pageHeaderRef.current.getBoundingClientRect();
    const toolbarRect = event.currentTarget.getBoundingClientRect();
    canvasToolbarDragRef.current = {
      offsetX: event.clientX - toolbarRect.left,
      offsetY: event.clientY - toolbarRect.top,
      width: toolbarRect.width,
      height: toolbarRect.height,
      headerLeft: headerRect.left,
      headerTop: headerRect.top,
      headerWidth: headerRect.width,
      headerHeight: headerRect.height,
    };
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    const onMove = (event) => {
      if (!activePage) return;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const cellW = canvasRect ? canvasRect.width / activePage.cols : 0;
      const cellH = canvasRect ? canvasRect.height / activePage.rows : 0;

      if (dragStateRef.current) {
        if (!canvasRect) return;
        const drag = dragStateRef.current;
        setActivePagePatch((page) => {
          const nextWidgets = (page.widgets || []).map((widget) => {
            if (widget.id !== drag.id) return widget;
            const x = clamp(
              Math.round((event.clientX - canvasRect.left - drag.startOffsetX) / cellW),
              0,
              page.cols - widget.w
            );
            const y = clamp(
              Math.round((event.clientY - canvasRect.top - drag.startOffsetY) / cellH),
              0,
              page.rows - widget.h
            );
            return { ...widget, x, y };
          });
          return { ...page, widgets: nextWidgets };
        });
      }

      if (resizeStateRef.current) {
        if (!canvasRect) return;
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

      if (canvasToolbarDragRef.current) {
        const drag = canvasToolbarDragRef.current;
        const headerRect = pageHeaderRef.current?.getBoundingClientRect();
        if (!headerRect) return;
        const maxX = Math.max(0, headerRect.width - drag.width);
        const maxY = Math.max(0, headerRect.height - drag.height);
        const nextX = clamp(Math.round(event.clientX - headerRect.left - drag.offsetX), 0, maxX);
        const nextY = clamp(Math.round(event.clientY - headerRect.top - drag.offsetY), 0, maxY);
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
      canvasToolbarDragRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [activePage, activePageId]);

  const renderSectionWidget = (section, config) => {
    const widgetType = config?.widgetType || "";
    const widgetConfig = {
      ...defaultWidgetConfig(widgetType),
      ...(config?.widgetConfig || {}),
    };
    const tableName = String(widgetConfig.tableName || "").trim();
    const rows = tableRowsByTable[tableName] || [];
    const tableError = tableErrorsByTable[tableName];

    if (widgetType === "Chart") {
      if (tableError) {
        return <Typography sx={{ fontSize: 12, color: "#c62828" }}>{tableError}</Typography>;
      }
      return <SectionChart config={widgetConfig} rows={rows} />;
    }

    if (widgetType === "Table") {
      return (
        <TableSectionWidget
          section={section}
          config={config}
          tableRowsByTable={tableRowsByTable}
          tableErrorsByTable={tableErrorsByTable}
          columnsByTable={columnsByTable}
        />
      );
    }

    if (widgetType === "Text Block") {
      const text = String(widgetConfig.text || "").trim();
      if (!text) {
        return <Typography sx={{ fontSize: 12, color: "#8a97ad" }}>Enter text.</Typography>;
      }
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

    return <Typography sx={{ fontSize: 12, color: "#8a97ad" }}>Select widget.</Typography>;
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

              <Box sx={{ mt: 3, position: "relative" }}>
                {pageCount > 1 ? (
                  <IconButton
                    aria-label="Previous experience pages"
                    onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                    disabled={pageIndex === 0}
                    sx={{
                      position: "absolute",
                      left: { md: -48, lg: -64 },
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#b8c2d4",
                      backgroundColor: "transparent",
                      "&:hover": { backgroundColor: "transparent", color: "#94a3b8" },
                      "&.Mui-disabled": { color: "#d7dee9" },
                    }}
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                ) : null}
                <Grid container spacing={2}>
            {pagedPages.map((page) => {
              const isPublished = String(page.status || "").toLowerCase() === "published";
              const pageUrl = isPublished
                ? page.pageUrl || getPublishedPageUrl(page.id)
                : getConfigurePageUrl(page.id);
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
                      height: 180,
                      minHeight: 180,
                      maxHeight: 180,
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
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 1,
                          minHeight: 32,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: "#1a4fd8",
                            lineHeight: 1.2,
                          }}
                        >
                          {page.name}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          {isPublished && (
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
                      <Typography
                        sx={{
                          minHeight: 18,
                          mt: 0.25,
                          fontSize: 12,
                          fontWeight: isPublished ? 600 : 400,
                          color: isPublished ? "#ef6c00" : "#51607d",
                        }}
                      >
                        Status: {page.status || "-"}
                      </Typography>
                      <Box sx={{ minHeight: 54, mt: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: "#51607d" }}>
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
                {pageCount > 1 ? (
                  <IconButton
                    aria-label="Next experience pages"
                    onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
                    disabled={pageIndex === pageCount - 1}
                    sx={{
                      position: "absolute",
                      right: { md: -48, lg: -64 },
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#b8c2d4",
                      backgroundColor: "transparent",
                      "&:hover": { backgroundColor: "transparent", color: "#94a3b8" },
                      "&.Mui-disabled": { color: "#d7dee9" },
                    }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                ) : null}
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
            const shellChrome = activePage?.shellChrome || {};
            const bodyMinHeight = isFullscreenCanvas
              ? bodyViewportHeight
              : `calc(${bodyViewportHeight} - ${variableShellHeights}px)`;

            return (
              <>
                {pageHeaderVisible && (
                  <Box
                    ref={pageHeaderRef}
                    sx={{
                      height: SHELL.headerHeight,
                      borderBottom: "1px solid #d8dde7",
                      px: shellChromePadding,
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      bgcolor: "#fbfcff",
                      boxShadow: "0 1px 0 rgba(216, 221, 231, 0.6)",
                    }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                      <Typography sx={{ fontWeight: 700, color: "#1e2d4a" }}>
                        {shellChrome.header?.title || "Header (Fixed)"}
                      </Typography>
                      {shellChrome.header?.subtitle ? (
                        <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>{shellChrome.header.subtitle}</Typography>
                      ) : null}
                    </Box>
                    {mode === "edit" && (
                      <Tooltip title="Header placeholder options">
                        <IconButton
                          size="small"
                          aria-label="Header placeholder options"
                          onClick={() => openShellOptionsModal("header")}
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 24,
                            height: 24,
                            bgcolor: "rgba(255,255,255,0.92)",
                            border: "1px solid #d8dde7",
                            "&:hover": { bgcolor: "#ffffff" },
                          }}
                        >
                          <MoreVertIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>
                      {activePage.name} | {activePage.layoutName} | {activePage.cols}x{activePage.rows}
                    </Typography>
                    {mode === "edit" && (
                      <Box
                        onMouseDown={startCanvasToolbarDrag}
                        sx={{
                          position: "absolute",
                          top:
                            Number.isFinite(activePage?.canvasBadgePosition?.y)
                              ? `${activePage.canvasBadgePosition.y}px`
                              : 10,
                          left:
                            Number.isFinite(activePage?.canvasBadgePosition?.x)
                              ? `${activePage.canvasBadgePosition.x}px`
                              : 180,
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
                          <Typography sx={{ fontSize: 12 }}>Grid {activePage.cols}x{activePage.rows}</Typography>
                          <Typography sx={{ fontSize: 12 }}>Rows {canvasLayoutRows}</Typography>
                          <Typography sx={{ fontSize: 11, color: "#5f6f8a", ml: 0.5 }}>
                            Drag to move
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                <Box
                  ref={pageShellRef}
                  sx={{
                    height: bodyViewportHeight,
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    <Typography sx={{ fontWeight: 700, color: "#1e2d4a" }}>
                      {shellChrome.menu?.title || "Left Menu (Fixed)"}
                    </Typography>
                    {shellChrome.menu?.subtitle ? (
                      <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>{shellChrome.menu.subtitle}</Typography>
                    ) : null}
                  </Box>
                  {mode === "edit" && (
                    <Tooltip title="Left menu placeholder options">
                      <IconButton
                        size="small"
                        aria-label="Left menu placeholder options"
                        onClick={() => openShellOptionsModal("menu")}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 24,
                          width: 24,
                          height: 24,
                          bgcolor: "rgba(255,255,255,0.92)",
                          border: "1px solid #d8dde7",
                          "&:hover": { bgcolor: "#ffffff" },
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
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
                  p: 0,
                  minHeight: bodyMinHeight,
                }}
              >
                {!isFullscreenCanvas && gridMarkersVisible && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {/* <Typography sx={{ fontWeight: 700, color: "#1e2d4a" }}>Canvas</Typography> */}
                      {/* <Tooltip title="Configure Page">
                        <IconButton
                          size="small"
                          aria-label="Configure Page"
                          onClick={() => setConfigurePageOpen(true)}
                        >
                          <SettingsOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip> */}
                    </Box>
                  </Box>
                )}

                <Box
                  ref={canvasRef}
                  onDragOver={(event) => {
                    if (mode === "edit") event.preventDefault();
                  }}
                  onDrop={handleCanvasDrop}
                  sx={{
                    height: isFullscreenCanvas ? bodyMinHeight : `${canvasHeight}px`,
                    position: "relative",
                  }}
                >
                  {sectionLayout.visibleSections.map((section) => {
                    const config = activePage?.sectionConfigs?.[section.anchorKey] || {};
                    const sectionPadding = resolveSectionPadding(config);
                    const sectionStyle = {
                      ...defaultSectionStyle,
                      ...(config.style || {}),
                    };
                    const cardShadow = shellVisibility.cardShadow !== false;
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
                            boxShadow: cardShadow ? "0 3px 8px rgba(16, 24, 40, 0.16)" : "none",
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              position: "absolute",
                              inset: 6,
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    <Typography sx={{ fontWeight: 700, color: "#1e2d4a" }}>
                      {shellChrome.menu?.title || "Right Menu (Fixed)"}
                    </Typography>
                    {shellChrome.menu?.subtitle ? (
                      <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>{shellChrome.menu.subtitle}</Typography>
                    ) : null}
                  </Box>
                  {mode === "edit" && (
                    <Tooltip title="Right menu placeholder options">
                      <IconButton
                        size="small"
                        aria-label="Right menu placeholder options"
                        onClick={() => openShellOptionsModal("menu")}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 24,
                          height: 24,
                          bgcolor: "rgba(255,255,255,0.92)",
                          border: "1px solid #d8dde7",
                          "&:hover": { bgcolor: "#ffffff" },
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
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
                }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    <Typography sx={{ fontWeight: 700, color: "#1e2d4a" }}>
                      {shellChrome.footer?.title || "Bottom Bar Center (Fixed)"}
                    </Typography>
                    {shellChrome.footer?.subtitle ? (
                      <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>{shellChrome.footer.subtitle}</Typography>
                    ) : null}
                  </Box>
                  {mode === "edit" && (
                    <Tooltip title="Footer placeholder options">
                      <IconButton
                        size="small"
                        aria-label="Footer placeholder options"
                        onClick={() => openShellOptionsModal("footer")}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 24,
                          height: 24,
                          bgcolor: "rgba(255,255,255,0.92)",
                          border: "1px solid #d8dde7",
                          "&:hover": { bgcolor: "#ffffff" },
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Page</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: "#5f6f8a" }}>
            Select page layout and create an empty experience page.
          </Typography>
          <Grid container spacing={2}>
            {layoutOptions.map((layout) => {
              const isActive = selectedLayoutId === layout.id;
              return (
                <Grid item xs={12} md={4} key={layout.id}>
                  <Paper
                    onClick={() => setSelectedLayoutId(layout.id)}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: isActive ? "2px solid #1976d2" : "1px solid #cfd5e2",
                      borderRadius: 2,
                      cursor: "pointer",
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>{layout.name}</Typography>
                    <Typography sx={{ mt: 0.5, color: "#5f6f8a" }}>{layout.description}</Typography>
                    <Typography sx={{ mt: 1, fontSize: 12, color: "#334363" }}>
                      Grid {layout.cols}x{layout.rows}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleCreatePage} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

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
              control={<Switch checked={shellVisibility.cardShadow !== false} onChange={toggleShellVisibility("cardShadow")} />}
              label="Add / Remove Shadow"
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

      <ShellOptionsModal
        open={shellOptionsOpen}
        slotKey={shellOptionsSlot}
        value={activePage?.shellChrome?.[shellOptionsSlot] || {}}
        onClose={() => setShellOptionsOpen(false)}
        onSave={(draft) => saveShellOptions(shellOptionsSlot, draft)}
      />

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
              <MenuItem value="Chart">Add Chart</MenuItem>
              <MenuItem value="Table">Add Table</MenuItem>
              <MenuItem value="Text Block">Add Text Block</MenuItem>
              <MenuItem value="Image">Add Image</MenuItem>
              <MenuItem value="Icon">Add Icon</MenuItem>
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
