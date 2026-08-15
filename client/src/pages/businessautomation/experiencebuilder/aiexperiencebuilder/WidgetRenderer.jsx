import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SubjectOutlinedIcon from "@mui/icons-material/SubjectOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ViewQuiltOutlinedIcon from "@mui/icons-material/ViewQuiltOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";

const COLORS = {
  chart: "#2f7dd6",
  table: "#4f87ff",
  text: "#1f5fd1",
  image: "#7b61ff",
  icon: "#00a389",
  kpi: "#0f7b49",
  form: "#9a5cff",
  syncedblock: "#ff8a3d",
  templatepart: "#6979f8",
};

const CHART_PALETTE = ["#2f7dd6", "#6aa7ff", "#35b0a6", "#7b61ff", "#f59e0b", "#ef4444"];

const getChartPaletteColor = (index) => CHART_PALETTE[index % CHART_PALETTE.length];

const getLayoutNumbers = (layoutSettings = {}) => {
  const cardPadding = 10;
  const cardGap = 10;
  const rowHeight = Math.max(150, Number(layoutSettings?.rowHeight) || 150);
  const chartPadding = 10;

  return { cardPadding, cardGap, rowHeight, chartPadding };
};

const getWidgetColor = (widgetType) => COLORS[widgetType] || "#1f5fd1";

const getWidgetIcon = (widgetType) => {
  if (widgetType === "chart") return <AssessmentOutlinedIcon fontSize="small" />;
  if (widgetType === "table") return <TableChartOutlinedIcon fontSize="small" />;
  if (widgetType === "text") return <SubjectOutlinedIcon fontSize="small" />;
  if (widgetType === "image") return <ImageOutlinedIcon fontSize="small" />;
  if (widgetType === "kpi") return <InsightsOutlinedIcon fontSize="small" />;
  if (widgetType === "form") return <AssignmentOutlinedIcon fontSize="small" />;
  if (widgetType === "syncedblock" || widgetType === "templatepart") return <ViewQuiltOutlinedIcon fontSize="small" />;
  return <AutoAwesomeOutlinedIcon fontSize="small" />;
};

const toDisplayValue = (value) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-";
  const text = String(value).trim();
  return text || "-";
};

const normalizeRows = (rows) => (Array.isArray(rows) ? rows.filter((row) => row && typeof row === "object") : []);

const getWidgetRows = (widget) => {
  const config = widget?.config || {};

  return normalizeRows(
    config.dataRows ||
      config.rows ||
      config.tableRows ||
      config.previewRows ||
      config.sampleRows ||
      widget?.dataRows ||
      widget?.rows ||
      []
  );
};

const getWidgetColumns = (widget, rows = []) => {
  const config = widget?.config || {};

  return inferColumnsFromRows(
    rows,
    config.columns ||
      config.selectedColumns ||
      config.fields ||
      widget?.columns ||
      []
  );
};

const inferColumnsFromRows = (rows = [], fallbackColumns = []) => {
  if (Array.isArray(fallbackColumns) && fallbackColumns.length) return fallbackColumns.map((column) => String(column));
  const firstRow = normalizeRows(rows)[0];
  return firstRow ? Object.keys(firstRow) : ["id", "name", "value"];
};

const getRowValue = (row, column, index) => {
  if (!row || typeof row !== "object") return "-";
  const direct = row[column];
  if (direct !== undefined) return direct;
  const lowerKey = Object.keys(row).find((key) => key.toLowerCase() === String(column || "").toLowerCase());
  if (lowerKey) return row[lowerKey];
  if (column === "id") return index + 1;
  return "-";
};

const extractChartSeries = (rows = [], fallbackLabelColumns = []) => {
  const normalizedRows = normalizeRows(rows);
  if (!normalizedRows.length) return [];
  const labelColumn = fallbackLabelColumns[0] || Object.keys(normalizedRows[0] || {})[0] || "label";
  const numericColumns = Object.keys(normalizedRows[0] || {}).filter((key) =>
    normalizedRows.some((row) => Number.isFinite(Number(row?.[key])))
  );
  const valueColumn = numericColumns.find((key) => key !== labelColumn) || numericColumns[0];
  return normalizedRows.slice(0, 6).map((row, index) => ({
    label: toDisplayValue(getRowValue(row, labelColumn, index)),
    value: valueColumn ? Number(row?.[valueColumn]) || index + 1 : index + 1,
  }));
};

const WidgetHeader = ({ widget, color, subtitle }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" gap="10px" sx={{ mb: 0 }}>
    <Stack direction="row" alignItems="center" gap="10px">
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          color: "#fff",
          bgcolor: color,
          boxShadow: `0 8px 18px ${alpha(color, 0.25)}`,
        }}
      >
        {getWidgetIcon(widget.type)}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 800, color: "#16233b", lineHeight: 1.15 }}>
          {widget.title || `${widget.type} widget`}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Stack>
    {widget.type ? (
      <Chip
        size="small"
        label={widget.type}
        sx={{
          bgcolor: alpha(color, 0.12),
          color,
          fontWeight: 700,
          textTransform: "capitalize",
          borderRadius: 999,
        }}
      />
    ) : null}
  </Stack>
);

const renderChart = (widget, color, layoutSettings = {}) => {
  const chartType = String(widget?.config?.chartType || "bar").toLowerCase();
  const rows = getWidgetRows(widget);
const columns = getWidgetColumns(widget, rows);
  const series = extractChartSeries(rows, columns);
  const layout = getLayoutNumbers(layoutSettings);
  const minChartHeight = Math.max(120, layout.rowHeight - layout.chartPadding * 2);
  const defaultSeries = [42, 28, 58, 36, 50, 32].map((value, index) => ({
    label: `Item ${index + 1}`,
    value,
  }));
  const chartSeries = series.length ? series : defaultSeries;
  const usableWidth = 420;
  const usableHeight = 120;
  const linePadding = 12;
  const lineRange = Math.max(1, usableHeight - linePadding * 2);
  const lineValues = chartSeries.map((entry) => Math.max(1, Number(entry.value) || 1));
  const lineMax = Math.max(...lineValues, 1);
  const linePoints = chartSeries
    .map((entry, index) => {
      const x = chartSeries.length === 1 ? usableWidth / 2 : linePadding + (index * (usableWidth - linePadding * 2)) / (chartSeries.length - 1);
      const normalized = Math.max(0.12, Math.min(1, (Number(entry.value) || 1) / lineMax));
      const y = usableHeight - linePadding - normalized * lineRange;
      return { x, y, color: getChartPaletteColor(index), label: entry.label };
    })
    .filter(Boolean);

  if (chartType === "line") {
    return (
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          height: minChartHeight,
          minHeight: minChartHeight,
          borderRadius: 2,
          overflow: "visible",
          p: `${layout.chartPadding}px`,
          backgroundImage:
            "linear-gradient(to right, rgba(95,111,138,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(95,111,138,0.10) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          backgroundColor: "#fafdff",
          position: "relative",
          display: "flex",
        }}
      >
        <svg viewBox="0 0 420 120" width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", width: "100%", minWidth: 0 }}>
          <defs>
            <linearGradient id={`line-stroke-${widget.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={getChartPaletteColor(0)} />
              <stop offset="55%" stopColor={getChartPaletteColor(2)} />
              <stop offset="100%" stopColor={getChartPaletteColor(4)} />
            </linearGradient>
            <linearGradient id={`line-fill-${widget.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={alpha(getChartPaletteColor(1), 0.22)} />
              <stop offset="100%" stopColor={alpha(getChartPaletteColor(1), 0.02)} />
            </linearGradient>
          </defs>
          {linePoints.length > 1 ? <path d={`${linePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")} L 408 108 L 12 108 Z`} fill={`url(#line-fill-${widget.id})`} /> : null}
          {linePoints.length > 1 ? (
            <path
              d={linePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")}
              fill="none"
              stroke={`url(#line-stroke-${widget.id})`}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {(linePoints.length ? linePoints : [{ x: 30, y: 98, color: getChartPaletteColor(0) }]).map((point, index) => (
            <circle
              key={`${widget.id}-line-point-${index}`}
              cx={point.x}
              cy={point.y}
              r="5"
              fill={point.color}
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}
        </svg>
      </Box>
    );
  }

  if (chartType === "pie" || chartType === "doughnut") {
    const pieSeries = chartSeries.slice(0, 6);
    const total = Math.max(1, pieSeries.reduce((sum, item) => sum + Math.max(1, Number(item.value) || 0), 0));
    let cursor = 0;
    const pieSegments = pieSeries.map((entry, index) => {
      const share = Math.max(1, Number(entry.value) || 0) / total;
      const start = cursor;
      const end = cursor + share * 100;
      cursor = end;
      return `${getChartPaletteColor(index)} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    });
    return (
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          height: minChartHeight,
          minHeight: minChartHeight,
          display: "grid",
          placeItems: "center",
          bgcolor: "#fafdff",
          borderRadius: 2,
          overflow: "hidden",
          p: `${layout.chartPadding}px`,
        }}
      >
        <Box
          sx={{
            width: "min(100%, 220px)",
            maxWidth: 220,
            aspectRatio: "1 / 1",
            borderRadius: "50%",
            background: `conic-gradient(${pieSegments.join(", ") || `${color} 0% 100%`})`,
            position: "relative",
            boxShadow: `inset 0 0 0 1px ${alpha("#fff", 0.45)}`,
          }}
        >
          {chartType === "doughnut" ? (
            <Box
              sx={{
                position: "absolute",
                inset: "24%",
                borderRadius: "50%",
                bgcolor: "#fff",
                boxShadow: "inset 0 1px 8px rgba(31, 62, 120, 0.06)",
              }}
            />
          ) : null}
        </Box>
      </Box>
    );
  }

  const horizontal = chartType === "horizontalbar";
  const barValues = chartSeries;
  const maxBarValue = Math.max(1, ...barValues.map((entry) => Math.max(1, Number(entry.value) || 0)));
  const barMaxHeight = Math.max(54, minChartHeight - 42);
  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        minHeight: minChartHeight,
        height: "100%",
        borderRadius: 2,
        overflow: "hidden",
        backgroundImage:
          "linear-gradient(to right, rgba(95,111,138,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(95,111,138,0.10) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        backgroundColor: "#fafdff",
        p: `${layout.chartPadding}px`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {horizontal ? (
        <Stack gap={1.2} sx={{ pt: 1.2 }}>
          {barValues.map((entry, index) => (
            <Box key={`${widget.id}-hbar-${index}`} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ width: 54, color: "#5f6f8a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry.label || `Row ${index + 1}`}
              </Typography>
              <Box
                sx={{
                  height: 16,
                  width: `${Math.max(16, Math.min(100, (Math.max(1, Number(entry.value) || 0) / maxBarValue) * 100))}%`,
                  borderRadius: 99,
                  bgcolor: getChartPaletteColor(index),
                  boxShadow: `0 8px 18px ${alpha(color, 0.14)}`,
                }}
              />
            </Box>
          ))}
        </Stack>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(1, barValues.length)}, minmax(0, 1fr))`,
            gap: `${layout.chartPadding}px`,
            alignItems: "end",
            height: "100%",
            width: "100%",
            minWidth: 0,
            overflow: "hidden",
            px: 0.5,
            pb: 0.5,
          }}
        >
          {barValues.map((entry, index) => {
            const barHeight = Math.max(18, Math.min(barMaxHeight, (Math.max(1, Number(entry.value) || 0) / maxBarValue) * barMaxHeight));
            return (
              <Stack key={`${widget.id}-bar-${index}`} alignItems="center" justifyContent="end" gap={0.35} sx={{ minWidth: 0, height: "100%", overflow: "hidden" }}>
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: "100%",
                    height: barHeight,
                    borderRadius: 1.5,
                    bgcolor: getChartPaletteColor(index),
                    boxShadow: `0 10px 22px ${alpha(getChartPaletteColor(index), 0.18)}`,
                    minWidth: 0,
                  }}
                />
                <Typography variant="caption" sx={{ color: "#5f6f8a", maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.label || `Row ${index + 1}`}
                </Typography>
              </Stack>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

const ChartWidget = ({ widget, color, onOptions, layoutSettings }) => {
  const layout = getLayoutNumbers(layoutSettings);
  const subtitle = [widget?.config?.seriesName || "Series", widget?.config?.dataTable || widget?.config?.tableName || "data source"]
    .filter(Boolean)
    .join(" • ");

  return (
    <Box
      sx={{
        position: "relative",
        p: `${layout.cardPadding}px`,
        borderRadius: 2.5,
        bgcolor: "#fff",
        border: "1px solid #dfe6f2",
        boxShadow: "0 10px 18px rgba(31, 62, 120, 0.05)",
        width: "100%",
        minWidth: 0,
        minHeight: layout.rowHeight,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: `${layout.cardGap}px`,
        overflow: "hidden",
      }}
    >
      {onOptions ? (
        <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 4 }}>
          <Tooltip title="Chart options">
            <IconButton
              size="small"
              aria-label="Chart options"
              onClick={() => onOptions(widget)}
              sx={{
                width: 24,
                height: 24,
                bgcolor: "rgba(255,255,255,0.98)",
                border: "1px solid #9fbaf4",
                boxShadow: "0 1px 4px rgba(16, 24, 40, 0.18)",
                "&:hover": { bgcolor: "#ffffff", borderColor: "#2f7dd6" },
              }}
            >
              <MoreVertIcon sx={{ fontSize: 15, color: "#2f7dd6" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : null}
      <WidgetHeader widget={widget} color={color} subtitle={subtitle || "Chart placeholder"} />
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "visible" }}>
        {renderChart(widget, color, layoutSettings)}
      </Box>
    </Box>
  );
};

const TableWidget = ({ widget, color, onOptions, layoutSettings }) => {
  const config = widget?.config || {};
  const layout = getLayoutNumbers(layoutSettings);
  const tableName = String(config.tableName || config.dataTable || widget?.title || "Data table").trim();
  const defaultRowsPerPage = Math.max(1, Math.min(25, Number(config.rowsPerPage || config.rowLimit || config.limit || 10) || 10));
  const rowsPerPageOptions = config.rowsPerPageOptions || [5, 10, 15, 25];
  const dataRows = getWidgetRows(widget);
  const fallbackRows = useMemo(
    () =>
      Array.from({ length: defaultRowsPerPage }).map((_item, index) =>
        Object.fromEntries(
          inferColumnsFromRows([], config.columns)
            .slice(0, 6)
            .map((head, headerIndex) => {
              if (headerIndex === 0) return [head, index + 1];
              if (headerIndex === 1) return [head, index === 0 ? "test" : "sample"];
              if (headerIndex === inferColumnsFromRows([], config.columns).slice(0, 6).length - 1) return [head, index % 2 === 0 ? "Active" : "Pending"];
              return [head, "-"];
            })
        )
      ),
    [config.columns, defaultRowsPerPage]
  );
  const rows = dataRows.length ? dataRows : fallbackRows;
  const headers = getWidgetColumns(widget, rows);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  useEffect(() => {
    setRowsPerPage(defaultRowsPerPage);
    setPage(0);
  }, [tableName, defaultRowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const pageRows = rows.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);
  const pageLabel = `Page ${safePage + 1} of ${totalPages}`;
  const tableBodyHeight = Math.max(48, pageRows.length * 42);
  const estimatedTableHeight = Math.max(
    layout.rowHeight,
    layout.cardPadding * 2 + 36 + 24 + tableBodyHeight + 72
  );

  return (
    <Box
      sx={{
        position: "relative",
        p: `${layout.cardPadding}px`,
        borderRadius: 2.5,
        overflow: "visible",
        border: "1px solid #dfe6f2",
        bgcolor: "#fff",
        boxShadow: "0 10px 18px rgba(31, 62, 120, 0.05)",
        width: "100%",
        minWidth: 0,
        minHeight: estimatedTableHeight,
        height: "auto",
        display: "flex",
        flexDirection: "column",
        gap: `${layout.cardGap}px`,
      }}
    >
      {onOptions ? (
        <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 4 }}>
          <Tooltip title="Table options">
            <IconButton
              size="small"
              aria-label="Table options"
              onClick={() => onOptions(widget)}
              sx={{
                width: 24,
                height: 24,
                bgcolor: "rgba(255,255,255,0.98)",
                border: "1px solid #9fbaf4",
                boxShadow: "0 1px 4px rgba(16, 24, 40, 0.18)",
                "&:hover": { bgcolor: "#ffffff", borderColor: "#2f7dd6" },
              }}
            >
              <MoreVertIcon sx={{ fontSize: 15, color: "#2f7dd6" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : null}
      <WidgetHeader widget={widget} color={color} subtitle={tableName} />
      <Box sx={{ display: "block", width: "100%" }}>
        <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f6f9ff" }}>
              {headers.slice(0, 6).map((head) => (
                <TableCell key={`${widget.id}-${head}`} sx={{ fontWeight: 800, color: "#16233b", borderBottom: "none", py: 0.8 }}>
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((row, rowIndex) => (
              <TableRow key={`${widget.id}-row-${safePage}-${rowIndex}`} sx={{ "&:nth-of-type(odd)": { bgcolor: "#fbfdff" } }}>
                {headers.slice(0, 6).map((head, cellIndex) => {
                  const value = toDisplayValue(getRowValue(row, head, safePage * rowsPerPage + rowIndex));
                  return (
                    <TableCell key={`${widget.id}-cell-${safePage}-${rowIndex}-${cellIndex}`} sx={{ borderBottom: "1px solid #edf2f8", py: 0.85, whiteSpace: "normal", wordBreak: "break-word" }}>
                      {value === "Active" || value === "Pending" ? (
                        <Chip
                          size="small"
                          label={value}
                          sx={{
                            bgcolor: value === "Active" ? "#e7f7ef" : "#fff4e8",
                            color: value === "Active" ? "#0f7b49" : "#b45309",
                            fontWeight: 700,
                            borderRadius: 999,
                          }}
                        />
                      ) : (
                        value
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box
          sx={{
            mt: "10px",
            pt: "10px",
            gap: "10px",
            borderTop: "1px solid #edf2f8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ color: "#1e2d4a", whiteSpace: "nowrap" }}>
              Rows per page:
            </Typography>
            <TextField
              select
              size="small"
              value={rowsPerPage}
              onChange={(event) => {
                const next = Math.max(1, Number(event.target.value) || defaultRowsPerPage);
                setRowsPerPage(next);
                setPage(0);
              }}
              sx={{ width: 88 }}
            >
              {Array.from(new Set([defaultRowsPerPage, ...rowsPerPageOptions]))
                .filter((value) => Number(value) > 0)
                .sort((a, b) => a - b)
                .map((value) => (
                  <MenuItem key={`${widget.id}-rpp-${value}`} value={value}>
                    {value}
                  </MenuItem>
                ))}
            </TextField>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
            <Typography variant="body2" sx={{ color: "#1e2d4a", whiteSpace: "nowrap", ml: 1 }}>
              {pageLabel}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const isTextList = (text = "") => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 1 && lines.every((line) => /^[-*•\d.]+\s+/.test(line) || line.length < 140);
};

const getTextVariant = (widgetTitle = "", sectionType = "") => {
  const title = String(widgetTitle || "").toLowerCase();
  const section = String(sectionType || "").toLowerCase();
  if (title.includes("button") || title.includes("cta")) return "button";
  if (title.includes("headline") || title.includes("hero title")) return "headline";
  if (title.includes("title")) return section === "hero" ? "headline" : "title";
  if (title.includes("list")) return "list";
  return section === "hero" ? "heroText" : "body";
};

const WidgetRenderer = ({ widget, section, sectionType = "", onOptions, layoutSettings = {} }) => {
  if (!widget) return null;
  const type = String(widget.type || "").toLowerCase();
  const config = widget.config || {};
  const color = getWidgetColor(type);
  const normalizedSectionType = String(sectionType || section?.type || "").toLowerCase();

  if (type === "text") {
    const text = String(config.textContent || widget.title || "Dashboard summary text").trim();
    const variant = getTextVariant(widget.title || "", normalizedSectionType);
    const isButton = variant === "button";
    const isList = variant === "list" || isTextList(text);
    const isHeadline = variant === "headline" || variant === "heroText" || normalizedSectionType === "hero";

    if (isButton) {
      return (
        <Button variant="contained" sx={{ alignSelf: "flex-start", textTransform: "none", borderRadius: 999, px: 2.5, py: 1 }}>
          {text || "Get in Touch"}
        </Button>
      );
    }

    if (isList) {
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.replace(/^[-*•\d.]+\s+/, "").trim())
        .filter(Boolean);
      return (
        <Box sx={{ pl: 2 }}>
          <Box component="ul" sx={{ m: 0, pl: 2, color: "#24324f" }}>
            {lines.map((line, index) => (
              <Box component="li" key={`${widget.id}-${index}`} sx={{ mb: 0.75 }}>
                <Typography sx={{ color: "#24324f", fontSize: 15, lineHeight: 1.6 }}>{line}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{ py: isHeadline ? 0.75 : 0.25 }}>
        <Typography
          sx={{
            whiteSpace: "pre-wrap",
            color: "#24324f",
            fontWeight: isHeadline ? 800 : 400,
            fontSize: isHeadline ? 18 : 15,
            lineHeight: isHeadline ? 1.35 : 1.65,
          }}
        >
          {text}
        </Typography>
      </Box>
    );
  }

  if (type === "image") {
    const src = String(config.imageUrl || "").trim();
    const hasImage = Boolean(src);
    return (
      <Box sx={{ borderRadius: 2.5, overflow: "hidden" }}>
        {hasImage ? (
          <Box
            component="img"
            src={src}
            alt={config.alt || widget.title || "Preview image"}
            sx={{ width: "100%", borderRadius: 2, objectFit: config.imageFit || "cover", maxHeight: 320 }}
          />
        ) : (
          <Box
            sx={{
              minHeight: 140,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: "#fafdff",
              border: "1px dashed #d7deea",
            }}
          >
            <Stack alignItems="center" gap={1}>
              <Box sx={{ width: 54, height: 54, borderRadius: "50%", bgcolor: alpha(color, 0.14), display: "grid", placeItems: "center", color }} />
              <Typography sx={{ color: "#5f6f8a" }}>Image placeholder</Typography>
            </Stack>
          </Box>
        )}
      </Box>
    );
  }

  if (type === "icon") {
    const label = String(config.label || widget.title || "Icon label").trim();
    return (
      <Box
        sx={{
          p: 1.25,
          borderRadius: 2.5,
          bgcolor: "#fff",
          border: "1px solid #dfe6f2",
          boxShadow: "0 10px 18px rgba(31, 62, 120, 0.05)",
          width: "100%",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1.4}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              bgcolor: config.iconColor || color,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              boxShadow: `0 10px 22px ${alpha(config.iconColor || color, 0.22)}`,
            }}
          >
            <AutoAwesomeOutlinedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#16233b" }}>{label}</Typography>
            <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
              Colored icon placeholder
            </Typography>
          </Box>
        </Stack>
      </Box>
    );
  }

  if (type === "kpi") {
    const label = String(config.kpiLabel || widget.title || "KPI").trim();
    const value = String(config.kpiValue || "0").trim();
    return (
      <Box sx={{ p: 1.15, borderRadius: 2.5, border: "1px solid #d7deea", bgcolor: "#fff", boxShadow: "0 10px 18px rgba(31, 62, 120, 0.05)" }}>
        <WidgetHeader widget={widget} color={color} subtitle="KPI summary" />
        <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, color, mt: 0.35 }}>
          {value}
        </Typography>
        <Divider sx={{ my: 0.85 }} />
        <Chip size="small" label={config.trendDirection || "up"} sx={{ bgcolor: alpha(color, 0.12), color, borderRadius: 999 }} />
      </Box>
    );
  }

  if (type === "table") {
    return <TableWidget widget={widget} color={color} onOptions={onOptions} layoutSettings={layoutSettings} />;
  }

  if (type === "form") {
    const title = String(config.formName || widget.title || "Form").trim();
    const submitLabel = String(config.submitLabel || "Submit").trim();
    return (
      <Stack gap={0.85} sx={{ p: 1.25, borderRadius: 2.5, border: "1px solid #d7deea", bgcolor: "#fff", boxShadow: "0 10px 18px rgba(31, 62, 120, 0.05)" }}>
        <WidgetHeader widget={widget} color={color} subtitle="Form placeholder" />
        <Typography sx={{ fontWeight: 800, color: "#1e2d4a" }}>{title}</Typography>
        {["Full Name", "Email Address", "Subject"].map((label) => (
          <Box key={`${widget.id}-${label}`} sx={{ p: 0.9, borderRadius: 1.5, border: "1px solid #d7deea", bgcolor: "#fbfcff" }}>
            <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
              {label}
            </Typography>
          </Box>
        ))}
        <Button variant="contained" sx={{ alignSelf: "flex-start", textTransform: "none" }}>
          {submitLabel}
        </Button>
      </Stack>
    );
  }

  if (type === "syncedblock") {
    const content = String(config.content || widget.title || "Synced block").trim();
    return (
      <Box sx={{ p: 1.1, borderRadius: 2.25, bgcolor: "#fff7ea", border: "1px solid #f1dfb5" }}>
        <WidgetHeader widget={widget} color={color} subtitle="Synced content" />
        <Typography sx={{ color: "#4a3b1f" }}>{content}</Typography>
      </Box>
    );
  }

  if (type === "templatepart") {
    const content = String(config.content || widget.title || "Template part").trim();
    return (
      <Box sx={{ p: 1.1, borderRadius: 2.25, bgcolor: "#f6f8ff", border: "1px solid #dbe3fb" }}>
        <WidgetHeader widget={widget} color={color} subtitle="Reusable template part" />
        <Typography sx={{ color: "#283553" }}>{content}</Typography>
      </Box>
    );
  }

  if (type === "chart") {
    return <ChartWidget widget={widget} color={color} onOptions={onOptions} layoutSettings={layoutSettings} />;
  }

  return (
    <Box sx={{ p: 1.1, borderRadius: 2.5, bgcolor: "#fff", border: "1px solid #dfe6f2", boxShadow: "0 10px 18px rgba(31, 62, 120, 0.05)" }}>
      <WidgetHeader widget={widget} color={color} subtitle="Widget placeholder" />
      <Typography sx={{ color: "#5f6f8a" }}>No renderer is defined for this widget type yet.</Typography>
    </Box>
  );
};

export default WidgetRenderer;
