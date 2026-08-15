// src/pages/businessautomation/aiappbuilder/renderers/ChartAppRenderer.jsx

import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import TableChartIcon from "@mui/icons-material/TableChart";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/* =========================================================
   Helpers
========================================================= */

const CHART_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#ec4899",
  "#6366f1",
];

const normalizeRecord = (record) => ({
  id: record?.id ?? record?.transaction_id,
  ...(record?.transaction_data || {}),
});

const toTitle = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return String(value);
};

const isNumeric = (value) => {
  if (value === null || value === undefined || value === "") return false;
  return !Number.isNaN(Number(value));
};

const aggregateData = ({
  rows,
  xField,
  yField,
  aggregate = "count",
  groupBy,
}) => {
  if (!xField) return [];

  const grouped = new Map();

  rows.forEach((row) => {
    const xValue = row?.[xField];
    if (xValue === undefined || xValue === null || xValue === "") return;

    const xKey = String(xValue);
    const groupValue =
      groupBy && row?.[groupBy] !== undefined && row?.[groupBy] !== null
        ? String(row[groupBy])
        : "Value";

    if (!grouped.has(xKey)) {
      grouped.set(xKey, {});
    }

    const bucket = grouped.get(xKey);

    if (!bucket[groupValue]) {
      bucket[groupValue] = {
        count: 0,
        sum: 0,
      };
    }

    bucket[groupValue].count += 1;

    if (yField && isNumeric(row[yField])) {
      bucket[groupValue].sum += Number(row[yField]);
    }
  });

  const result = [];

  Array.from(grouped.entries())
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .forEach(([key, value]) => {
      const row = { name: key };

      Object.entries(value).forEach(([groupKey, stats]) => {
        if (aggregate === "sum") {
          row[groupKey] = stats.sum;
        } else {
          row[groupKey] = stats.count;
        }
      });

      result.push(row);
    });

  return result;
};

/* =========================================================
   Stat Card
========================================================= */

const StatCard = ({ label, value, icon, color }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 3,
      border: "1px solid #e2e8f0",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
      height: "100%",
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              mt: 1,
              fontSize: 28,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            {value}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: `${color}15`,
            color,
          }}
        >
          {icon}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

/* =========================================================
   Main Component
========================================================= */

export default function ChartAppRenderer({ schema, records = [] }) {
  const rows = useMemo(() => records.map(normalizeRecord), [records]);

  const chartConfig = schema?.chartConfig || {};

  const [chartType, setChartType] = useState(
    chartConfig.chartType || "bar"
  );

  const [xField, setXField] = useState(chartConfig.xField || "");
  const [yField, setYField] = useState(chartConfig.yField || "");
  const [groupBy, setGroupBy] = useState(chartConfig.groupBy || "");
  const [aggregate, setAggregate] = useState(
    chartConfig.aggregate || "count"
  );

  const availableFields = useMemo(() => {
    if (!rows.length) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const chartData = useMemo(
    () =>
      aggregateData({
        rows,
        xField,
        yField,
        aggregate,
        groupBy,
      }),
    [rows, xField, yField, aggregate, groupBy]
  );

  const seriesKeys = useMemo(() => {
    if (!chartData.length) return [];
    return Object.keys(chartData[0]).filter((key) => key !== "name");
  }, [chartData]);

  const totalRecords = rows.length;
  const totalGroups = chartData.length;

  /* =========================================================
     Render Chart
  ========================================================= */

  const renderChart = () => {
    if (!xField) {
      return (
        <Typography sx={{ color: "#64748b", fontSize: 14 }}>
          Select an X-axis field to render the chart.
        </Typography>
      );
    }

    if (!chartData.length) {
      return (
        <Typography sx={{ color: "#64748b", fontSize: 14 }}>
          No data available for the selected configuration.
        </Typography>
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {seriesKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={3}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "pie") {
      const pieData = chartData.map((item) => ({
        name: item.name,
        value: Number(item[seriesKeys[0]] || 0),
      }));

      return (
        <ResponsiveContainer width="100%" height={420}>
          <RePieChart>
            <Tooltip />
            <Legend />
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              outerRadius={150}
              label
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
          </RePieChart>
        </ResponsiveContainer>
      );
    }

    // Default = Bar Chart
    return (
      <ResponsiveContainer width="100%" height={420}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {seriesKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              radius={[6, 6, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Stack gap={3}>
      {/* Header */}
      <Box
        sx={{
          px: 3.5,
          py: 2.75,
          background:
            "linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%)",
          borderBottom: "1px solid #dbeafe",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 26,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {schema?.title || "Chart Report"}
            </Typography>

            <Typography
              sx={{
                mt: 0.75,
                fontSize: 14,
                color: "#64748b",
              }}
            >
              {schema?.description ||
                "AI-generated chart and reporting view."}
            </Typography>
          </Box>

          <Chip
            icon={<TableChartIcon />}
            label={`Source: ${schema?.sourceTable || "N/A"}`}
            sx={{
              bgcolor: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: 700,
            }}
          />
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ px: 3.5 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <StatCard
              label="Total Records"
              value={formatValue(totalRecords)}
              icon={<TableChartIcon />}
              color="#2563eb"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <StatCard
              label="Chart Groups"
              value={formatValue(totalGroups)}
              icon={<BarChartIcon />}
              color="#10b981"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <StatCard
              label="Chart Type"
              value={toTitle(chartType)}
              icon={<ShowChartIcon />}
              color="#f59e0b"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Configuration Panel */}
      <Box sx={{ px: 3.5 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
                mb: 2.5,
              }}
            >
              Chart Configuration
            </Typography>

            <Grid container spacing={2}>
              {[
                {
                  label: "Chart Type",
                  value: chartType,
                  setter: setChartType,
                  options: ["bar", "line", "pie"],
                },
                {
                  label: "X Axis",
                  value: xField,
                  setter: setXField,
                  options: availableFields,
                },
                {
                  label: "Y Field",
                  value: yField,
                  setter: setYField,
                  options: ["", ...availableFields],
                },
                {
                  label: "Group By",
                  value: groupBy,
                  setter: setGroupBy,
                  options: ["", ...availableFields],
                },
                {
                  label: "Aggregate",
                  value: aggregate,
                  setter: setAggregate,
                  options: ["count", "sum"],
                },
              ].map((item) => (
                <Grid item xs={12} md={2.4} key={item.label}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{item.label}</InputLabel>
                    <Select
                      label={item.label}
                      value={item.value}
                      onChange={(e) => item.setter(e.target.value)}
                    >
                      {item.options.map((option) => (
                        <MenuItem key={String(option)} value={option}>
                          {option === ""
                            ? "None"
                            : toTitle(option)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Chart */}
      <Box sx={{ px: 3.5, pb: 3.5 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <PieChartIcon sx={{ color: "#2563eb" }} />
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                Chart Preview
              </Typography>
            </Stack>

            {renderChart()}
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}