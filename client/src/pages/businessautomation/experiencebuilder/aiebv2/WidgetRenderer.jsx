import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import api from "../../../../services/api";

const normalizeRows = (rows) => (Array.isArray(rows) ? rows.filter((row) => row && typeof row === "object") : []);

const inferColumnsFromRows = (rows = [], fallbackColumns = []) => {
  if (Array.isArray(fallbackColumns) && fallbackColumns.length) return fallbackColumns.map((column) => String(column));
  const firstRow = normalizeRows(rows)[0];
  return firstRow ? Object.keys(firstRow) : ["id", "name", "value"];
};

const getRowValue = (row, column, index) => {
  if (!row || typeof row !== "object") return "-";
  if (row[column] !== undefined) return row[column];
  const lowerKey = Object.keys(row).find((key) => key.toLowerCase() === String(column || "").toLowerCase());
  if (lowerKey) return row[lowerKey];
  if (column === "id") return index + 1;
  return "-";
};

const toDisplayValue = (value) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value).trim();
  return text || "-";
};

const parseNumber = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const COLORS = ["#2f7dd6", "#6aa7ff", "#35b0a6", "#7b61ff", "#f59e0b", "#ef4444"];

const getPaletteColor = (index) => COLORS[index % COLORS.length];

const getChartSeries = (rows, fallbackLabelColumns = []) => {
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

const WidgetFrame = ({ widget, children, hostProps = {} }) => {
  const { as, sx: hostSx, style: hostStyle, className: hostClassName, ...restHostProps } = hostProps;
  const mergedStyle = {
    width: "100%",
    minWidth: 0,
    ...(hostStyle || {}),
  };
  const className = [hostClassName, `ai-widget ai-widget-${widget.type}`].filter(Boolean).join(" ").trim();

  return (
    <Box
      component={as || "div"}
      {...restHostProps}
      className={className}
      style={mergedStyle}
      sx={{
        width: "100%",
        minWidth: 0,
        ...(hostSx || {}),
      }}
    >
      {children}
    </Box>
  );
};

const ChartWidget = ({ widget, hostProps }) => {
  const config = widget?.config || {};
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tableName = String(config.tableName || config.dataTable || "").trim();
  const chartType = String(config.chartType || "bar").toLowerCase();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!tableName) {
        setRows([]);
        setColumns(Array.isArray(config.columns) ? config.columns.map(String) : []);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [colsRes, rowsRes] = await Promise.all([
          api.get("/db/columns", { params: { table: tableName } }),
          api.get(`/tables/data/${encodeURIComponent(tableName)}`, { params: { limit: Math.max(1, parseNumber(config.rowLimit || config.limit || 10, 10)) } }),
        ]);
        const cols = Array.isArray(colsRes.data?.columns)
          ? colsRes.data.columns
          : Array.isArray(colsRes.data)
            ? colsRes.data
            : [];
        const rowsData = Array.isArray(rowsRes.data?.rows)
          ? rowsRes.data.rows
          : Array.isArray(rowsRes.data)
            ? rowsRes.data
            : [];
        if (!active) return;
        setColumns(cols.map((col) => col?.column_name || col).filter(Boolean));
        setRows(rowsData);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || err?.message || "Unable to load chart data.");
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [tableName]);

  const series = useMemo(() => {
    const fallbackColumns = columns.length ? columns : Array.isArray(config.columns) ? config.columns : [];
    const chartSeries = getChartSeries(rows, fallbackColumns);
    return chartSeries.length
      ? chartSeries
      : [42, 28, 58, 36, 50, 32].map((value, index) => ({ label: `Item ${index + 1}`, value }));
  }, [rows, columns, config.columns]);

  const title = String(widget?.title || config.chartName || config.seriesName || "Chart").trim();
  const subtitle = [config.seriesName || "Series", tableName || "data source"].filter(Boolean).join(" • ");

  const minHeight = 220;
  const usableWidth = 420;
  const usableHeight = 120;
  const linePadding = 12;
  const lineRange = Math.max(1, usableHeight - linePadding * 2);

  if (chartType === "pie" || chartType === "donut") {
    const pieSeries = series.slice(0, 6);
    const total = Math.max(1, pieSeries.reduce((sum, item) => sum + Math.max(1, Number(item.value) || 0), 0));
    let cursor = 0;
    const segments = pieSeries.map((entry, index) => {
      const share = Math.max(1, Number(entry.value) || 0) / total;
      const start = cursor;
      const end = cursor + share * 100;
      cursor = end;
      return `${getPaletteColor(index)} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    });

    return (
      <WidgetFrame widget={widget} hostProps={hostProps}>
        <Stack gap={1} sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: "#16233b" }}>{title}</Typography>
              <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
                {subtitle}
              </Typography>
            </Box>
            {loading ? <Chip size="small" label="Loading" /> : null}
          </Box>
          <Box
            sx={{
              width: "100%",
              height: minHeight,
              minHeight,
              display: "grid",
              placeItems: "center",
              bgcolor: "#fafdff",
              borderRadius: 2,
              border: "1px solid #dfe6f2",
              p: 1,
            }}
          >
            <Box
              sx={{
                width: "min(100%, 220px)",
                maxWidth: 220,
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                background: `conic-gradient(${segments.join(", ") || `${getPaletteColor(0)} 0% 100%`})`,
                position: "relative",
                boxShadow: `inset 0 0 0 1px ${alpha("#fff", 0.45)}`,
              }}
            >
              {chartType === "donut" ? (
                <Box sx={{ position: "absolute", inset: "24%", borderRadius: "50%", bgcolor: "#fff" }} />
              ) : null}
            </Box>
          </Box>
          {error ? <Typography variant="caption" sx={{ color: "#b42318" }}>{error}</Typography> : null}
        </Stack>
      </WidgetFrame>
    );
  }

  const values = series.map((entry) => Math.max(1, Number(entry.value) || 1));
  const maxValue = Math.max(1, ...values);
  const linePoints = series
    .map((entry, index) => {
      const x = series.length === 1 ? usableWidth / 2 : linePadding + (index * (usableWidth - linePadding * 2)) / (series.length - 1);
      const normalized = Math.max(0.12, Math.min(1, (Number(entry.value) || 1) / maxValue));
      const y = usableHeight - linePadding - normalized * lineRange;
      return { x, y, color: getPaletteColor(index) };
    })
    .filter(Boolean);

  return (
    <WidgetFrame widget={widget} hostProps={hostProps}>
      <Stack gap={1} sx={{ width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#16233b" }}>{title}</Typography>
            <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
              {subtitle}
            </Typography>
          </Box>
          {loading ? <Chip size="small" label="Loading" /> : null}
        </Box>
        <Box
          sx={{
            width: "100%",
            minHeight,
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#fafdff",
            border: "1px solid #dfe6f2",
            p: 1,
          }}
        >
          <svg viewBox="0 0 420 120" width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block", width: "100%" }}>
            {linePoints.length > 1 ? (
              <path
                d={linePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")}
                fill="none"
                stroke={getPaletteColor(0)}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {(linePoints.length ? linePoints : [{ x: 30, y: 98, color: getPaletteColor(0) }]).map((point, index) => (
              <circle key={`${widget.id}-point-${index}`} cx={point.x} cy={point.y} r="5" fill={point.color} stroke="#fff" strokeWidth="2" />
            ))}
          </svg>
        </Box>
        {error ? <Typography variant="caption" sx={{ color: "#b42318" }}>{error}</Typography> : null}
      </Stack>
    </WidgetFrame>
  );
};

const TableWidget = ({ widget, hostProps }) => {
  const config = widget?.config || {};
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(Math.max(1, Math.min(25, Number(config.rowLimit || config.limit || 10) || 10)));

  const tableName = String(config.tableName || config.dataTable || "").trim();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!tableName) {
        setRows([]);
        setColumns(Array.isArray(config.columns) ? config.columns.map(String) : []);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [colsRes, rowsRes] = await Promise.all([
          api.get("/db/columns", { params: { table: tableName } }),
          api.get(`/tables/data/${encodeURIComponent(tableName)}`, { params: { limit: 100 } }),
        ]);
        const cols = Array.isArray(colsRes.data?.columns)
          ? colsRes.data.columns
          : Array.isArray(colsRes.data)
            ? colsRes.data
            : [];
        const rowsData = Array.isArray(rowsRes.data?.rows)
          ? rowsRes.data.rows
          : Array.isArray(rowsRes.data)
            ? rowsRes.data
            : [];
        if (!active) return;
        setColumns(cols.map((col) => col?.column_name || col).filter(Boolean));
        setRows(rowsData);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || err?.message || "Unable to load table data.");
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [tableName]);

  useEffect(() => {
    setRowsPerPage(Math.max(1, Math.min(25, Number(config.rowLimit || config.limit || 10) || 10)));
    setPage(0);
  }, [tableName, config.rowLimit, config.limit]);

  const headers = inferColumnsFromRows(rows, columns.length ? columns : config.columns || []);
  const pageRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const tableNameLabel = String(config.tableName || config.dataTable || widget?.title || "Table").trim();

  return (
    <WidgetFrame widget={widget} hostProps={hostProps}>
      <Stack gap={1} sx={{ width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#16233b" }}>{widget?.title || tableNameLabel}</Typography>
            <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
              {tableNameLabel}
            </Typography>
          </Box>
          {loading ? <Chip size="small" label="Loading" /> : null}
        </Box>
        <Box sx={{ width: "100%", overflowX: "auto" }}>
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
                <TableRow key={`${widget.id}-row-${page}-${rowIndex}`} sx={{ "&:nth-of-type(odd)": { bgcolor: "#fbfdff" } }}>
                  {headers.slice(0, 6).map((head, cellIndex) => {
                    const value = toDisplayValue(getRowValue(row, head, page * rowsPerPage + rowIndex));
                    return (
                      <TableCell key={`${widget.id}-cell-${page}-${rowIndex}-${cellIndex}`} sx={{ borderBottom: "1px solid #edf2f8", py: 0.85, whiteSpace: "normal", wordBreak: "break-word" }}>
                        {value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ color: "#1e2d4a", whiteSpace: "nowrap" }}>
              Rows per page:
            </Typography>
            <TextField
              select
              size="small"
              value={rowsPerPage}
              onChange={(event) => {
                const next = Math.max(1, Number(event.target.value) || rowsPerPage);
                setRowsPerPage(next);
                setPage(0);
              }}
              sx={{ width: 88 }}
            >
              {[5, 10, 15, 25].map((value) => (
                <MenuItem key={`${widget.id}-rpp-${value}`} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button size="small" variant="contained" disabled={page <= 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
              Prev
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={(page + 1) * rowsPerPage >= rows.length}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </Box>
        </Box>
        {error ? <Typography variant="caption" sx={{ color: "#b42318" }}>{error}</Typography> : null}
      </Stack>
    </WidgetFrame>
  );
};

const BaseWidget = ({ widget, hostProps }) => {
  const type = String(widget?.type || "").toLowerCase();
  if (type === "chart") return <ChartWidget widget={widget} hostProps={hostProps} />;
  if (type === "table") return <TableWidget widget={widget} hostProps={hostProps} />;

  return (
    <WidgetFrame widget={widget} hostProps={hostProps}>
      <Stack gap={0.75} sx={{ width: "100%" }}>
        <Typography sx={{ fontWeight: 800, color: "#16233b" }}>{widget?.title || widget?.config?.title || "Widget"}</Typography>
        <Typography variant="body2" sx={{ color: "#30415d" }}>
          {String(widget?.config?.textContent || widget?.config?.subtext || widget?.config?.label || "Widget content").trim()}
        </Typography>
      </Stack>
    </WidgetFrame>
  );
};

export default BaseWidget;
