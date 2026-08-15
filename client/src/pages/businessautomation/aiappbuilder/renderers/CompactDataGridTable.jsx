import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";
import { DataGrid, GridToolbarColumnsButton, GridToolbarContainer, GridToolbarDensitySelector, GridToolbarFilterButton } from "@mui/x-data-grid";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";

const toTitle = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateValue = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const isNumeric = (value) =>
  value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

const normalizeLabel = (value) => String(value || "").toLowerCase();

const getStatusTone = (value) => {
  const text = normalizeLabel(value);
  if (!text) return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
  if (text.includes("rejected") || text.includes("failed") || text.includes("inactive")) {
    return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
  }
  if (text.includes("partial") || text.includes("pending") || text.includes("hold")) {
    return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
  }
  if (text.includes("filled") || text.includes("approved") || text.includes("open") || text.includes("active")) {
    return { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" };
  }
  return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
};

const formatPercent = (value) => {
  if (!isNumeric(value)) return null;
  const number = Number(value);
  const percent = number <= 1 ? number * 100 : number;
  return Math.max(0, Math.min(100, percent));
};

const formatCellValue = (column, value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (column?.type === "date") return formatDateValue(value);
  if (column?.type === "boolean" || column?.type === "checkbox") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const chartPalette = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316"];

export default function CompactDataGridTable({
  rows = [],
  columns = [],
  search = "",
  setSearch,
  onEditRow,
  onDeleteRow,
  defaultVisibleCount = 6,
}) {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({});
  const [chartOpen, setChartOpen] = useState(false);
  const [chartType, setChartType] = useState("bar");
  const [chartXField, setChartXField] = useState("");
  const [chartYField, setChartYField] = useState("");

  const dataColumns = useMemo(
    () => (Array.isArray(columns) ? columns.filter((column) => column?.field && column.field !== "__actions__") : []),
    [columns]
  );

  const defaultVisibilityModel = useMemo(
    () =>
      dataColumns.reduce((acc, column, index) => {
        acc[column.field] = index < defaultVisibleCount;
        return acc;
      }, {}),
    [dataColumns, defaultVisibleCount]
  );

  useEffect(() => {
    setColumnVisibilityModel(defaultVisibilityModel);
  }, [defaultVisibilityModel]);

  const numericFields = useMemo(() => {
    return dataColumns.filter((column) => {
      if (column.type === "number" || column.type === "currency" || column.type === "percentage") return true;
      return rows.some((row) => isNumeric(row?.[column.field]));
    });
  }, [dataColumns, rows]);

  const categoricalFields = useMemo(() => {
    return dataColumns.filter((column) => column.field !== "__actions__");
  }, [dataColumns]);

  useEffect(() => {
    if (!chartXField && categoricalFields.length) {
      setChartXField(categoricalFields[0].field);
    }
  }, [categoricalFields, chartXField]);

  useEffect(() => {
    if (!chartYField && numericFields.length) {
      setChartYField(numericFields[0].field);
    }
  }, [numericFields, chartYField]);

  const filteredRows = useMemo(() => {
    const term = String(search || "").trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [rows, search]);

  const gridColumns = useMemo(() => {
    const mapped = dataColumns.map((column) => ({
      field: column.field,
      headerName: column.headerName || toTitle(column.field),
      flex: column.flex ?? 1,
      minWidth: column.minWidth ?? 130,
      sortable: true,
      filterable: true,
      hideable: column.hideable !== false,
      align: column.type === "number" ? "right" : "left",
      headerAlign: column.type === "number" ? "right" : "left",
      renderCell: (params) => {
        const value = formatCellValue(column, params.value);
        const label = String(params.value ?? "");
        const isStatusField = /status|state|approval|filled/i.test(
          `${column.field} ${column.headerName || ""}`
        );
        const isProgressField = /filled|progress|percent|ratio|completion|rate/i.test(
          `${column.field} ${column.headerName || ""}`
        ) && isNumeric(params.value);

        if (isProgressField) {
          const percent = formatPercent(params.value);
          if (percent !== null) {
            const fillTone =
              percent >= 80 ? "#16a34a" : percent >= 50 ? "#f59e0b" : "#ef4444";
            return (
              <Box sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 78,
                    height: 22,
                    position: "relative",
                    borderRadius: 1,
                    overflow: "hidden",
                    border: "1px solid #dbeafe",
                    bgcolor: "#ffffff",
                  }}
                >
                  <Box
                    sx={{
                      width: `${percent}%`,
                      height: "100%",
                      bgcolor: fillTone,
                      opacity: 0.75,
                    }}
                  />
                </Box>
                <Typography sx={{ minWidth: 58, fontSize: 12, fontWeight: 700, color: "#334155", textAlign: "right" }}>
                  {percent.toFixed(2)}%
                </Typography>
              </Box>
            );
          }
        }

        if (isStatusField) {
          const tone = getStatusTone(label);
          return (
            <Chip
              size="small"
              label={value}
              sx={{
                height: 24,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: tone.bg,
                color: tone.color,
                border: `1px solid ${tone.border}`,
                "& .MuiChip-label": { px: 1 },
              }}
            />
          );
        }

        return (
          <Tooltip title={value} placement="top" arrow>
            <Box
              sx={{
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 12.5,
                lineHeight: 1.25,
              }}
            >
              {value}
            </Box>
          </Tooltip>
        );
      },
    }));

    return [
      ...mapped,
        {
        field: "__actions__",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        hideable: false,
        width: 84,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25, width: "100%" }}>
            <Tooltip title="Edit" arrow>
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditRow?.(params.row);
                }}
                sx={{ color: "#1976d2" }}
              >
                <EditOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete" arrow>
              <IconButton
                size="small"
                color="error"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteRow?.(params.row);
                }}
                sx={{ color: "#d32f2f" }}
              >
                <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ];
  }, [dataColumns, onDeleteRow, onEditRow]);

  const chartRows = useMemo(() => {
    const xField = chartXField || categoricalFields[0]?.field || "";
    const yField = chartYField || numericFields[0]?.field || "";
    if (!xField) return [];

    const groups = new Map();
    filteredRows.forEach((row) => {
      const name = String(row?.[xField] ?? "").trim();
      if (!name) return;
      const current = groups.get(name) || { name, value: 0, count: 0 };
      current.count += 1;
      const raw = row?.[yField];
      if (yField && isNumeric(raw)) {
        current.value += Number(raw);
        current.numeric = true;
      }
      groups.set(name, current);
    });

    const values = Array.from(groups.values()).map((item) => ({
      name: item.name,
      value: item.numeric ? item.value : item.count,
    }));

    return values;
  }, [categoricalFields, filteredRows, numericFields, chartXField, chartYField]);

  const pieData = useMemo(() => {
    return chartRows.map((item, index) => ({
      id: index,
      label: item.name,
      value: Number(item.value || 0),
      color: chartPalette[index % chartPalette.length],
    }));
  }, [chartRows]);

  const chartLabel = useMemo(() => {
    if (chartYField) return toTitle(chartYField);
    return "Count";
  }, [chartYField]);

  const RecordsToolbar = () => (
    <GridToolbarContainer
      sx={{
        gap: 1,
        px: 1.25,
        py: 1,
        borderBottom: "1px solid #dbeafe",
        bgcolor: "#f8fbff",
      }}
    >
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <Button
        size="small"
        variant="outlined"
        startIcon={<InsertChartOutlinedIcon />}
        onClick={() => setChartOpen(true)}
        sx={{ textTransform: "none", minHeight: 32 }}
      >
        Charts
      </Button>
    </GridToolbarContainer>
  );

  return (
    <Box sx={{ px: 3, pb: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 1.25,
        }}
      >
        <Typography sx={{ color: "#5f6f8a", fontSize: 12.5 }}>
          Select columns from the toolbar. Default view shows only the first {defaultVisibleCount} columns.
        </Typography>
        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch?.(event.target.value)}
          placeholder="Search records..."
          sx={{ width: 260, "& .MuiInputBase-root": { height: 36, fontSize: 13 } }}
        />
      </Box>

      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <DataGrid
          autoHeight
          rows={filteredRows}
          columns={gridColumns}
          disableRowSelectionOnClick
          pagination
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25, 50]}
          density="compact"
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          slots={{ toolbar: RecordsToolbar }}
          getRowHeight={() => 42}
          rowHeight={42}
          sx={{
            border: "1px solid #dbeafe",
            borderRadius: 2.5,
            bgcolor: "#ffffff",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "#0f2f57",
              color: "#fff",
              minHeight: 42,
              maxHeight: 42,
              borderBottom: "none",
            },
            "& .MuiDataGrid-columnHeader": {
              px: 1.25,
              fontSize: 12,
              fontWeight: 700,
            },
            "& .MuiDataGrid-cell": {
              px: 1.25,
              fontSize: 12.25,
              lineHeight: 1.2,
              alignItems: "center",
            },
            "& .MuiDataGrid-row:hover": {
              bgcolor: "#f8fbff",
            },
            "& .MuiDataGrid-columnSeparator": {
              color: "rgba(255,255,255,0.16)",
            },
          }}
        />
      </Box>

      <Dialog open={chartOpen} onClose={() => setChartOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#0f2f57" }}>
                Charts
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>
                Build a compact visual summary from the selected grid fields.
              </Typography>
            </Box>
            <IconButton onClick={() => setChartOpen(false)} size="small" aria-label="Close chart dialog">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#fbfdff" }}>
          <Stack gap={2}>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <ToggleButtonGroup
                size="small"
                exclusive
                value={chartType}
                onChange={(_event, value) => value && setChartType(value)}
              >
                <ToggleButton value="bar">Bar</ToggleButton>
                <ToggleButton value="line">Line</ToggleButton>
                <ToggleButton value="pie">Pie</ToggleButton>
              </ToggleButtonGroup>

              <TextField
                select
                size="small"
                label="Category"
                value={chartXField}
                onChange={(event) => setChartXField(event.target.value)}
                sx={{ minWidth: 180 }}
              >
                {categoricalFields.map((column) => (
                  <MenuItem key={column.field} value={column.field}>
                    {column.headerName || toTitle(column.field)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Value"
                value={chartYField}
                onChange={(event) => setChartYField(event.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">Count</MenuItem>
                {numericFields.map((column) => (
                  <MenuItem key={column.field} value={column.field}>
                    {column.headerName || toTitle(column.field)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 22px rgba(15, 23, 42, 0.05)",
              }}
            >
              {chartRows.length ? (
                <>
                  {chartType === "pie" ? (
                    <PieChart
                      height={360}
                      series={[
                        {
                          data: pieData,
                          innerRadius: 42,
                          outerRadius: 130,
                          paddingAngle: 2,
                          cornerRadius: 5,
                        },
                      ]}
                      slotProps={{
                        legend: {
                          direction: "row",
                        },
                      }}
                    />
                  ) : chartType === "line" ? (
                    <LineChart
                      height={360}
                      dataset={chartRows}
                      xAxis={[{ scaleType: "band", dataKey: "name" }]}
                      series={[
                        {
                          dataKey: "value",
                          label: chartLabel,
                          color: chartPalette[0],
                        },
                      ]}
                    />
                  ) : (
                    <BarChart
                      height={360}
                      dataset={chartRows}
                      xAxis={[{ scaleType: "band", dataKey: "name" }]}
                      series={[
                        {
                          dataKey: "value",
                          label: chartLabel,
                          color: chartPalette[0],
                        },
                      ]}
                    />
                  )}
                </>
              ) : (
                <Typography sx={{ color: "#64748b", fontSize: 13 }}>
                  No data available for the chart.
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
