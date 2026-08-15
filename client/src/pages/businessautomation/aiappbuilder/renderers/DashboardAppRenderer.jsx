// src/pages/businessautomation/aiappbuilder/renderers/DashboardAppRenderer.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import NumbersIcon from "@mui/icons-material/Numbers";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import api from "../../../../services/api";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

const DEFAULT_WIDGET_STYLE = {
  backgroundColor: "#ffffff",
  borderColor: "#e2e8f0",
  titleColor: "#0f2f57",
  accentColor: "#2563eb",
};

const mergeWidgetStyle = (style = {}) => ({
  backgroundColor: String(style.backgroundColor || DEFAULT_WIDGET_STYLE.backgroundColor),
  borderColor: String(style.borderColor || DEFAULT_WIDGET_STYLE.borderColor),
  titleColor: String(style.titleColor || DEFAULT_WIDGET_STYLE.titleColor),
  accentColor: String(style.accentColor || DEFAULT_WIDGET_STYLE.accentColor),
});

const normalizeEditableDashboardConfig = (dashboardConfig = {}, fallbackSourceTable = "") => {
  const config = dashboardConfig && typeof dashboardConfig === "object" ? dashboardConfig : {};
  return {
    sourceTables: Array.isArray(config.sourceTables) ? config.sourceTables.filter(Boolean) : [fallbackSourceTable].filter(Boolean),
    cards: Array.isArray(config.cards) && config.cards.length
      ? config.cards.map((card) => ({
          ...card,
          style: mergeWidgetStyle(card.style),
        }))
      : [],
    charts: Array.isArray(config.charts) && config.charts.length
      ? config.charts.map((chart) => ({
          ...chart,
          style: mergeWidgetStyle(chart.style),
        }))
      : [],
    tables: Array.isArray(config.tables) && config.tables.length
      ? config.tables.map((table) => ({
          ...table,
          style: mergeWidgetStyle(table.style),
        }))
      : [],
  };
};

const normalizeRecord = (record) => ({
  id: record?.id ?? record?.transaction_id,
  date_created: record?.date_created,
  created_by: record?.created_by_name || record?.created_by,
  ...record,
  ...(record?.transaction_data || {}),
});

const normalizeRecordsPayload = (records) => {
  if (Array.isArray(records)) {
    return {
      __default: records.map(normalizeRecord),
    };
  }

  if (!records || typeof records !== "object") {
    return { __default: [] };
  }

  return Object.fromEntries(
    Object.entries(records).map(([tableName, rows]) => [
      tableName,
      Array.isArray(rows) ? rows.map(normalizeRecord) : [],
    ])
  );
};

const toTitle = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

const getRowsForTable = (recordsByTable, tableName, fallbackTable = "") => {
  if (!recordsByTable || typeof recordsByTable !== "object") {
    return [];
  }

  const resolvedTable = String(tableName || "").trim();
  const resolvedFallback = String(fallbackTable || "").trim();
  const directRows = resolvedTable ? recordsByTable[resolvedTable] : null;
  if (resolvedTable) {
    return Array.isArray(directRows) ? directRows : [];
  }

  const fallbackRows = resolvedFallback ? recordsByTable[resolvedFallback] : null;
  if (Array.isArray(fallbackRows)) {
    return fallbackRows;
  }

  return recordsByTable.__default || [];
};

const applyFilter = (rows, filterField, filterValue) => {
  if (!filterField || filterValue === undefined || filterValue === "") return rows;
  return rows.filter((row) => String(row?.[filterField] ?? "") === String(filterValue));
};

const calculateMetric = (rows, card) => {
  const filtered = applyFilter(rows, card.filterField, card.filterValue);
  const metric = String(card.metric || "count").toLowerCase();
  const field = card.field;

  if (metric === "count") return filtered.length;

  const values = filtered.map((row) => getNumber(row?.[field]));

  if (metric === "sum") return values.reduce((a, b) => a + b, 0);
  if (metric === "average" || metric === "avg") {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }
  if (metric === "min") return values.length ? Math.min(...values) : 0;
  if (metric === "max") return values.length ? Math.max(...values) : 0;

  return filtered.length;
};

const aggregateChartData = (rows, chart) => {
  const xField = chart.xField;
  const yField = chart.yField;
  const groupBy = chart.groupBy;
  const aggregate = String(chart.aggregate || "count").toLowerCase();

  if (!xField) return [];

  const map = new Map();

  rows.forEach((row) => {
    const xValue = row?.[xField];
    if (xValue === undefined || xValue === null || xValue === "") return;

    const xKey = String(xValue).slice(0, 10);
    const groupKey = groupBy ? String(row?.[groupBy] || "Unspecified") : "Value";

    if (!map.has(xKey)) map.set(xKey, {});
    const bucket = map.get(xKey);

    if (!bucket[groupKey]) bucket[groupKey] = { count: 0, sum: 0 };
    bucket[groupKey].count += 1;
    bucket[groupKey].sum += getNumber(row?.[yField]);
  });

  return Array.from(map.entries())
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([name, groups]) => {
      const item = { name };
      Object.entries(groups).forEach(([group, stats]) => {
        item[group] = aggregate === "sum" ? stats.sum : stats.count;
      });
      return item;
    });
};

const getRowColumns = (rows = []) => {
  const firstRow = Array.isArray(rows) ? rows.find((row) => row && typeof row === "object") : null;
  if (!firstRow) return [];
  return Object.keys(firstRow).filter((column) => column !== "transaction_data");
};

const WidgetActions = ({ style, onEdit, onRemove }) => (
  <Stack direction="row" spacing={0.5} sx={{ position: "absolute", top: 8, right: 8 }}>
    {onEdit ? (
      <Tooltip title="Customize widget">
        <IconButton size="small" onClick={onEdit} sx={{ color: style.accentColor }}>
          <SettingsOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    ) : null}
    {onRemove ? (
      <Tooltip title="Remove widget">
        <IconButton size="small" onClick={onRemove} sx={{ color: "#ef4444" }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    ) : null}
  </Stack>
);

const KpiCard = ({ title, value, subtitle, style, onEdit, onRemove }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 3,
      border: `1px solid ${style.borderColor}`,
      bgcolor: style.backgroundColor,
      boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
      height: "100%",
      position: "relative",
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <WidgetActions style={style} onEdit={onEdit} onRemove={onRemove} />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 28, fontWeight: 900, color: style.titleColor }}>
            {formatNumber(value)}
          </Typography>
          {subtitle ? (
            <Typography sx={{ mt: 0.5, fontSize: 12, color: "#94a3b8" }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 2.5,
            bgcolor: "#eff6ff",
            color: style.accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <NumbersIcon />
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const ChartWidget = ({ chart, rows, style, onEdit, onRemove }) => {
  const data = useMemo(() => aggregateChartData(rows, chart), [rows, chart]);
  const keys = data.length ? Object.keys(data[0]).filter((key) => key !== "name") : [];
  const chartType = String(chart.chartType || "bar").toLowerCase();

  const renderChart = () => {
    if (!data.length) {
      return (
        <Box sx={{ p: 4, textAlign: "center", color: "#64748b" }}>
          No chart data available.
        </Box>
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            {keys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={3}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "pie" || chartType === "donut") {
      const pieData = data.map((row) => ({
        name: row.name,
        value: getNumber(row[keys[0]]),
      }));

      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <RechartsTooltip />
            <Legend />
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              outerRadius={105}
              innerRadius={chartType === "donut" ? 55 : 0}
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          {keys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={COLORS[index % COLORS.length]}
              radius={[6, 6, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${style.borderColor}`,
        bgcolor: style.backgroundColor,
        boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
        height: "100%",
        position: "relative",
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <WidgetActions style={style} onEdit={onEdit} onRemove={onRemove} />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: style.titleColor }}>
              {chart.title || "Chart"}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#64748b" }}>
              {toTitle(chart.chartType || "bar")} | {chart.aggregate || "count"}
            </Typography>
          </Box>
          <AssessmentIcon sx={{ color: style.accentColor }} />
        </Stack>

        {renderChart()}
      </CardContent>
    </Card>
  );
};

const TableWidget = ({ table, rows, style, onEdit, onRemove }) => {
  const columns = Array.isArray(table.columns) && table.columns.length
    ? table.columns
    : Object.keys(rows[0] || {}).slice(0, 6);

  const limit = Number(table.limit || 10);
  const visibleRows = rows.slice(0, limit);

  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${style.borderColor}`, bgcolor: style.backgroundColor, position: "relative" }}>
      <CardContent sx={{ p: 2.5 }}>
        <WidgetActions style={style} onEdit={onEdit} onRemove={onRemove} />
        <Typography sx={{ fontSize: 16, fontWeight: 800, color: style.titleColor, mb: 2 }}>
          {table.title || "Recent Records"}
        </Typography>

        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: "#0f2f57" }}>
                {columns.map((column) => (
                  <Box component="th" key={column} sx={{ color: "#fff", textAlign: "left", p: 1.25 }}>
                    {toTitle(column)}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {visibleRows.map((row, rowIndex) => (
                <Box component="tr" key={row.id || rowIndex}>
                  {columns.map((column) => (
                    <Box component="td" key={column} sx={{ p: 1.25, borderBottom: "1px solid #e2e8f0" }}>
                      {String(row?.[column] ?? "")}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const WidgetSettingsDialog = ({
  open,
  widgetType,
  widget,
  tableOptions = [],
  columnsByTable = {},
  onClose,
  onSave,
  onRemove,
}) => {
  const [draft, setDraft] = useState(widget ? { ...widget, style: mergeWidgetStyle(widget.style) } : null);

  useEffect(() => {
    setDraft(widget ? { ...widget, style: mergeWidgetStyle(widget.style) } : null);
  }, [widget, open]);

  const selectedColumns = Array.isArray(columnsByTable[draft?.table]) ? columnsByTable[draft.table] : [];
  const tableLabel = widgetType === "card" ? "Card" : widgetType === "chart" ? "Chart" : "Table";

  if (!open || !draft) {
    return null;
  }

  const setField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const setStyle = (key, value) => {
    setDraft((prev) => ({
      ...prev,
      style: {
        ...mergeWidgetStyle(prev?.style),
        [key]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{tableLabel} Settings</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 1 }}>
          <TextField fullWidth size="small" label="Title" value={draft.title || ""} onChange={(e) => setField("title", e.target.value)} />
          <TextField select fullWidth size="small" label="Table" value={draft.table || ""} onChange={(e) => setField("table", e.target.value)}>
            {tableOptions.map((table) => (
              <MenuItem key={table} value={table}>
                {table}
              </MenuItem>
            ))}
          </TextField>

          {widgetType === "card" ? (
            <>
              <TextField select fullWidth size="small" label="Metric" value={draft.metric || "count"} onChange={(e) => setField("metric", e.target.value)}>
                {["count", "sum", "average", "min", "max"].map((metric) => (
                  <MenuItem key={metric} value={metric}>
                    {toTitle(metric)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select fullWidth size="small" label="Value Field" value={draft.field || ""} onChange={(e) => setField("field", e.target.value)}>
                {selectedColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {toTitle(column)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField fullWidth size="small" label="Filter Field" value={draft.filterField || ""} onChange={(e) => setField("filterField", e.target.value)} />
              <TextField fullWidth size="small" label="Filter Value" value={draft.filterValue ?? ""} onChange={(e) => setField("filterValue", e.target.value)} />
            </>
          ) : null}

          {widgetType === "chart" ? (
            <>
              <TextField select fullWidth size="small" label="Chart Type" value={draft.chartType || "bar"} onChange={(e) => setField("chartType", e.target.value)}>
                {["bar", "line", "pie", "donut", "area"].map((type) => (
                  <MenuItem key={type} value={type}>
                    {toTitle(type)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select fullWidth size="small" label="X Field" value={draft.xField || ""} onChange={(e) => setField("xField", e.target.value)}>
                {selectedColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {toTitle(column)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select fullWidth size="small" label="Y Field" value={draft.yField || ""} onChange={(e) => setField("yField", e.target.value)}>
                {selectedColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {toTitle(column)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select fullWidth size="small" label="Aggregate" value={draft.aggregate || "count"} onChange={(e) => setField("aggregate", e.target.value)}>
                {["count", "sum", "average"].map((aggregate) => (
                  <MenuItem key={aggregate} value={aggregate}>
                    {toTitle(aggregate)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select fullWidth size="small" label="Group By" value={draft.groupBy || ""} onChange={(e) => setField("groupBy", e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {selectedColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {toTitle(column)}
                  </MenuItem>
                ))}
              </TextField>
            </>
          ) : null}

          {widgetType === "table" ? (
            <>
              <TextField fullWidth size="small" label="Columns" value={Array.isArray(draft.columns) ? draft.columns.join(", ") : String(draft.columns || "")} onChange={(e) => setField("columns", String(e.target.value).split(",").map((value) => value.trim()).filter(Boolean))} helperText="Comma separated column names" />
              <TextField fullWidth size="small" label="Limit" type="number" value={draft.limit ?? 10} onChange={(e) => setField("limit", Number(e.target.value || 10))} />
            </>
          ) : null}

          <Stack direction="row" gap={1}>
            <TextField
              fullWidth
              size="small"
              type="color"
              label="Background"
              value={draft.style?.backgroundColor || DEFAULT_WIDGET_STYLE.backgroundColor}
              onChange={(e) => setStyle("backgroundColor", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              size="small"
              type="color"
              label="Accent"
              value={draft.style?.accentColor || DEFAULT_WIDGET_STYLE.accentColor}
              onChange={(e) => setStyle("accentColor", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              size="small"
              type="color"
              label="Border"
              value={draft.style?.borderColor || DEFAULT_WIDGET_STYLE.borderColor}
              onChange={(e) => setStyle("borderColor", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        {onRemove ? (
          <Button onClick={onRemove} color="error" startIcon={<DeleteOutlineIcon />}>
            Remove
          </Button>
        ) : null}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(draft)}>Apply</Button>
      </DialogActions>
    </Dialog>
  );
};

export default function DashboardAppRenderer({
  schema,
  selectedApp,
  records = [],
  notify,
  saveRequestToken = 0,
  disableWidgetEditing = false,
}) {
  const dashboardConfig = useMemo(() => schema?.dashboardConfig || {}, [schema?.dashboardConfig]);
  const [dashboardState, setDashboardState] = useState(() =>
    normalizeEditableDashboardConfig(dashboardConfig, schema?.sourceTable || "")
  );
  const [widgetEditorOpen, setWidgetEditorOpen] = useState(false);
  const [widgetEditorTarget, setWidgetEditorTarget] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const widgetEditingEnabled = !disableWidgetEditing;

  const recordsByTable = useMemo(() => normalizeRecordsPayload(records), [records]);
  useEffect(() => {
    setDashboardState(normalizeEditableDashboardConfig(dashboardConfig, schema?.sourceTable || ""));
  }, [dashboardConfig, schema?.sourceTable]);

  const dashboardTables = useMemo(() => {
    const sourceTables = Array.isArray(dashboardState.sourceTables) ? dashboardState.sourceTables.filter(Boolean) : [];
    if (sourceTables.length) return sourceTables;
    return [schema?.sourceTable || ""].filter(Boolean);
  }, [dashboardState.sourceTables, schema?.sourceTable]);

  const tableColumnsMap = useMemo(() => {
    const entries = Object.entries(recordsByTable)
      .filter(([tableName, rows]) => !String(tableName).startsWith("__") && Array.isArray(rows));
    return Object.fromEntries(entries.map(([tableName, rows]) => [tableName, getRowColumns(rows)]));
  }, [recordsByTable]);

  const primaryTable = useMemo(
    () => (dashboardTables.length
      ? dashboardTables[0]
      : schema?.sourceTable || ""),
    [dashboardTables, schema?.sourceTable]
  );
  const fallbackRows = useMemo(() => {
    if (Array.isArray(recordsByTable.__default) && recordsByTable.__default.length) {
      return recordsByTable.__default;
    }
    if (primaryTable && Array.isArray(recordsByTable[primaryTable])) {
      return recordsByTable[primaryTable];
    }
    const firstKey = Object.keys(recordsByTable).find((key) => Array.isArray(recordsByTable[key]) && recordsByTable[key].length);
    return firstKey ? recordsByTable[firstKey] : [];
  }, [primaryTable, recordsByTable]);

  const cards = Array.isArray(dashboardState.cards) && dashboardState.cards.length
    ? dashboardState.cards
    : [
        {
          title: "Total Records",
          table: primaryTable || schema?.sourceTable || "",
          metric: "count",
          field: "",
        },
      ];

  const charts = Array.isArray(dashboardState.charts) ? dashboardState.charts : [];
  const tables = Array.isArray(dashboardState.tables) ? dashboardState.tables : [];

  const openWidgetEditor = (type, index) => {
    setWidgetEditorTarget({ type, index });
    setWidgetEditorOpen(true);
  };

  const closeWidgetEditor = () => {
    setWidgetEditorOpen(false);
    setWidgetEditorTarget(null);
  };

  const updateWidget = (type, index, patch) => {
    setDashboardState((prev) => {
      const key = type === "card" ? "cards" : type === "chart" ? "charts" : "tables";
      const list = Array.isArray(prev[key]) ? prev[key] : [];
      return {
        ...prev,
        [key]: list.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
      };
    });
  };

  const removeWidget = (type, index) => {
    setDashboardState((prev) => {
      const key = type === "card" ? "cards" : type === "chart" ? "charts" : "tables";
      const list = Array.isArray(prev[key]) ? prev[key] : [];
      return {
        ...prev,
        [key]: list.filter((_, itemIndex) => itemIndex !== index),
      };
    });
    setWidgetEditorOpen(false);
    setWidgetEditorTarget(null);
  };

  const saveDashboardChanges = async () => {
    const appSlug = String(selectedApp?.app_slug || schema?.appSlug || schema?.app_slug || "").trim();
    if (!appSlug) {
      notify?.("error", "Application slug is missing, so changes cannot be saved.");
      return;
    }

    setSaveState("saving");
    try {
      const payloadSchema = {
        ...(schema || {}),
        dashboardConfig: dashboardState,
      };
      const res = await api.patch(`/aiappbuilder/${encodeURIComponent(appSlug)}/schema`, {
        schema: payloadSchema,
      });
      const savedSchema = res?.data?.schema_json || res?.data?.schema || payloadSchema;
      setDashboardState(normalizeEditableDashboardConfig(savedSchema.dashboardConfig || dashboardState, schema?.sourceTable || ""));
      notify?.("success", "Dashboard changes saved.");
    } catch (error) {
      notify?.("error", error?.response?.data?.error || error?.message || "Failed to save dashboard changes.");
    } finally {
      setSaveState("idle");
    }
  };

  useEffect(() => {
  if (!saveRequestToken) return;
  saveDashboardChanges();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [saveRequestToken]);

  return (
    <Stack gap={0}>
      <Box
        sx={{
          px: 3.5,
          py: 2.75,
          background: "linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%)",
          borderBottom: "1px solid #dbeafe",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 900, color: "#0f2f57" }}>
              {schema?.title || "Dashboard"}
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: 14, color: "#64748b" }}>
              {schema?.description || "AI-generated dashboard view."}
            </Typography>
          </Box>

          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            {/* <Button
              variant="outlined"
              size="small"
              onClick={saveDashboardChanges}
              disabled={saveState === "saving"}
              startIcon={<SaveOutlinedIcon />}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 999,
                px: 2,
                minHeight: 34,
                borderColor: "#60a5fa",
                color: "#2563eb",
                bgcolor: "#ffffff",
              }}
            >
              {saveState === "saving" ? "Saving..." : "Save Changes"}
            </Button> */}

            <Chip
              icon={<DashboardIcon />}
              label={`Source: ${schema?.sourceTable || "Multiple / Not selected"}`}
              sx={{ bgcolor: "#eff6ff", color: "#2563eb", fontWeight: 800 }}
            />
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 3.5 }}>
        <Grid container spacing={2}>
          {cards.map((card, index) => {
            const rows = getRowsForTable(recordsByTable, card.table, primaryTable);
            const style = mergeWidgetStyle(card.style);
            return (
              <Grid item xs={12} md={3} key={`${card.title}-${index}`}>
                <KpiCard
                  title={card.title || "Metric"}
                  value={calculateMetric(rows, card)}
                  subtitle={card.table || schema?.sourceTable || ""}
                  style={style}
                  onEdit={widgetEditingEnabled ? () => openWidgetEditor("card", index) : null}
                  onRemove={widgetEditingEnabled ? () => removeWidget("card", index) : null}
                />
              </Grid>
            );
          })}
        </Grid>

        {charts.length ? (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {charts.map((chart, index) => {
              const rows = getRowsForTable(recordsByTable, chart.table, primaryTable) || fallbackRows;
              const style = mergeWidgetStyle(chart.style);
              return (
                <Grid item xs={12} md={chart.size === "full" ? 12 : 6} key={`${chart.title}-${index}`}>
                  <ChartWidget
                    chart={chart}
                    rows={rows}
                    style={style}
                    onEdit={widgetEditingEnabled ? () => openWidgetEditor("chart", index) : null}
                    onRemove={widgetEditingEnabled ? () => removeWidget("chart", index) : null}
                  />
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 3,
              borderRadius: 3,
              border: "1px dashed #cbd5e1",
              bgcolor: "#f8fafc",
            }}
          >
            <Typography sx={{ fontWeight: 800, color: "#0f2f57" }}>
              No chart widgets configured yet.
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 13, color: "#64748b" }}>
              Add charts in dashboardConfig.charts with table, chartType, xField, yField, aggregate and groupBy.
            </Typography>
          </Paper>
        )}

        {tables.length ? (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {tables.map((table, index) => {
              const rows = getRowsForTable(recordsByTable, table.table, primaryTable) || fallbackRows;
              const style = mergeWidgetStyle(table.style);
              return (
                <Grid item xs={12} key={`${table.title}-${index}`}>
                  <TableWidget
                    table={table}
                    rows={rows}
                    style={style}
                    onEdit={widgetEditingEnabled ? () => openWidgetEditor("table", index) : null}
                    onRemove={widgetEditingEnabled ? () => removeWidget("table", index) : null}
                  />
                </Grid>
              );
            })}
          </Grid>
        ) : null}
      </Box>

      {widgetEditingEnabled ? (
        <WidgetSettingsDialog
          open={widgetEditorOpen}
          widgetType={widgetEditorTarget?.type || "card"}
          widget={widgetEditorTarget
            ? (widgetEditorTarget.type === "card" ? cards[widgetEditorTarget.index] : widgetEditorTarget.type === "chart" ? charts[widgetEditorTarget.index] : tables[widgetEditorTarget.index])
            : null}
          tableOptions={dashboardTables}
          columnsByTable={tableColumnsMap}
          onClose={closeWidgetEditor}
          onSave={(nextWidget) => {
            if (!widgetEditorTarget) return;
            updateWidget(widgetEditorTarget.type, widgetEditorTarget.index, nextWidget);
            closeWidgetEditor();
          }}
          onRemove={() => {
            if (!widgetEditorTarget) return;
            removeWidget(widgetEditorTarget.type, widgetEditorTarget.index);
          }}
        />
      ) : null}
    </Stack>
  );
}
