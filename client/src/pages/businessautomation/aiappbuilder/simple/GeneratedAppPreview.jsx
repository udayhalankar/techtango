import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import ViewQuiltOutlinedIcon from "@mui/icons-material/ViewQuiltOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";

import api from "../../../../services/api";
import SecureAiFreedomCanvas from "./SecureAiFreedomCanvas";

const FALLBACK_ACCENT = "#0b78d0";

const TONES = {
  blue: { main: "#147cc1", soft: "#eaf4fd", dark: "#075b97" },
  green: { main: "#27ae4b", soft: "#edf9f0", dark: "#168438" },
  orange: { main: "#fb8c00", soft: "#fff6e8", dark: "#c96a00" },
  purple: { main: "#7c3aed", soft: "#f3edff", dark: "#5b21b6" },
  red: { main: "#ef4444", soft: "#fff0f0", dark: "#c62828" },
  teal: { main: "#16a6b6", soft: "#eafafb", dark: "#0d7d89" },
  brown: { main: "#9a6428", soft: "#f8f1e8", dark: "#724718" },
};

const ICONS = {
  default: DashboardOutlinedIcon,
  dashboard: DashboardOutlinedIcon,
  booking: EventAvailableOutlinedIcon,
  meeting_room: MeetingRoomOutlinedIcon,
  meeting: MeetingRoomOutlinedIcon,
  form: AssignmentOutlinedIcon,
  register: AssignmentOutlinedIcon,
  action_item: FactCheckOutlinedIcon,
  document: DescriptionOutlinedIcon,
  users: GroupsOutlinedIcon,
  department: BusinessOutlinedIcon,
  calendar: CalendarMonthOutlinedIcon,
  inventory: Inventory2OutlinedIcon,
  task: PendingActionsOutlinedIcon,
  status: CheckCircleOutlineRoundedIcon,
  alert: WarningAmberOutlinedIcon,
  bolt: BoltOutlinedIcon,
  category: CategoryOutlinedIcon,
};

const normalizeHex = (value) =>
  /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : FALLBACK_ACCENT;

const normalized = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getTone = (tone = "blue") => TONES[String(tone || "").toLowerCase()] || TONES.blue;
const getIcon = (name = "default") => ICONS[String(name || "").toLowerCase()] || ICONS.default;

function parseTimeToMinutes(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function rowTransactionData(row) {
  return row?.transaction_data && typeof row.transaction_data === "object"
    ? row.transaction_data
    : {};
}

function findBackendFieldForColumn(column, fields) {
  const target = normalized(column?.key || column?.label);
  if (!target) return null;

  let match = fields.find(
    (field) => normalized(field.name) === target || normalized(field.label) === target
  );
  if (match) return match;

  const aliasGroups = [
    [/(^|_)date$|bookingdate|reservationdate/, /date/],
    [/from|start|begin/, /from|start|begin/],
    [/to|end|finish/, /to|end|finish/],
    [/room|resource|vehicle|equipment|asset|location/, /room|resource|vehicle|equipment|asset|location/],
    [/status/, /status/],
    [/progress|percentage|percent/, /progress|percentage|percent/],
  ];

  for (const [columnRegex, fieldRegex] of aliasGroups) {
    if (columnRegex.test(String(column?.key || column?.label || "").toLowerCase())) {
      match = fields.find((field) => fieldRegex.test(`${field.name} ${field.label}`.toLowerCase()));
      if (match) return match;
    }
  }
  return null;
}

function findBackendFieldForFrontend(frontendField, backendFields) {
  if (!frontendField || !Array.isArray(backendFields)) return null;

  const frontendName = normalized(frontendField.name);
  const frontendLabel = normalized(frontendField.label);
  const frontendText = `${frontendField.name || ""} ${frontendField.label || ""}`.toLowerCase();

  let match = backendFields.find((field) => {
    const backendName = normalized(field.name);
    const backendLabel = normalized(field.label);
    return (
      (frontendName && (backendName === frontendName || backendLabel === frontendName)) ||
      (frontendLabel && (backendName === frontendLabel || backendLabel === frontendLabel))
    );
  });
  if (match) return match;

  const aliases = [
    { front: /room|resource|vehicle|equipment|asset|location/, back: /room|resource|vehicle|equipment|asset|location/ },
    { front: /booking.?date|reservation.?date|(^|[^a-z])date([^a-z]|$)/, back: /booking.?date|reservation.?date|(^|[^a-z])date([^a-z]|$)/ },
    { front: /from|start|begin/, back: /from|start|begin/ },
    { front: /to|end|finish/, back: /to|end|finish/ },
    { front: /status/, back: /status/ },
  ];

  for (const alias of aliases) {
    if (!alias.front.test(frontendText)) continue;
    match = backendFields.find((field) => {
      if (frontendField.type && field.type && frontendField.type !== field.type) return false;
      return alias.back.test(`${field.name || ""} ${field.label || ""}`.toLowerCase());
    });
    if (match) return match;
  }

  if (frontendField.type) {
    const sameType = backendFields.filter((field) => field.type === frontendField.type);
    if (sameType.length === 1) return sameType[0];
  }
  return null;
}

function rowValue(row, column, fields) {
  const data = rowTransactionData(row);
  if (data[column.key] !== undefined && data[column.key] !== null) return String(data[column.key]);
  if (row?.[column.key] !== undefined && row?.[column.key] !== null) return String(row[column.key]);
  const field = findBackendFieldForColumn(column, fields);
  if (field && data[field.name] !== undefined && data[field.name] !== null) return String(data[field.name]);
  return "—";
}



// =============================================================================
// V2.9.1 DYNAMIC KPI / AGGREGATION ENGINE
// =============================================================================
function kpiRawValue(row, fieldName) {
  const field = String(fieldName || "").trim();
  if (!field) return undefined;

  const data = rowTransactionData(row);
  if (Object.prototype.hasOwnProperty.call(data, field)) {
    return data[field];
  }

  if (row && Object.prototype.hasOwnProperty.call(row, field)) {
    return row[field];
  }

  return undefined;
}

function kpiNumericValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value ?? "").trim();
  if (!text) return null;

  // Accept common stored/display numeric values such as 12,300.50 or SAR 500.
  const normalizedNumber = text
    .replace(/,/g, "")
    .replace(/[^0-9+\-.]/g, "");

  if (!normalizedNumber || normalizedNumber === "-" || normalizedNumber === "+") {
    return null;
  }

  const parsed = Number(normalizedNumber);
  return Number.isFinite(parsed) ? parsed : null;
}

function kpiComparable(value) {
  const numeric = kpiNumericValue(value);
  if (numeric !== null) {
    return { kind: "number", value: numeric };
  }

  return {
    kind: "text",
    value: String(value ?? "").trim().toLowerCase(),
  };
}

function kpiFilterMatches(row, filter = {}) {
  const field = String(filter?.field || "").trim();
  const operator = String(filter?.operator || "equals").trim().toLowerCase();
  const raw = kpiRawValue(row, field);
  const text = String(raw ?? "").trim();
  const normalizedText = text.toLowerCase();
  const requested = String(filter?.value ?? "").trim();
  const requestedNormalized = requested.toLowerCase();
  const requestedValues = Array.isArray(filter?.values)
    ? filter.values.map((value) => String(value ?? "").trim().toLowerCase())
    : [];

  if (operator === "empty") return !text;
  if (operator === "not_empty") return Boolean(text);
  if (operator === "equals") return normalizedText === requestedNormalized;
  if (operator === "not_equals") return normalizedText !== requestedNormalized;
  if (operator === "contains") return normalizedText.includes(requestedNormalized);
  if (operator === "not_contains") return !normalizedText.includes(requestedNormalized);
  if (operator === "in") return requestedValues.includes(normalizedText);
  if (operator === "not_in") return !requestedValues.includes(normalizedText);

  if (["gt", "gte", "lt", "lte"].includes(operator)) {
    const left = kpiComparable(raw);
    const right = kpiComparable(requested);

    // Numeric comparison when both values are numeric; otherwise lexical.
    const leftValue = left.kind === "number" && right.kind === "number"
      ? left.value
      : String(raw ?? "").toLowerCase();
    const rightValue = left.kind === "number" && right.kind === "number"
      ? right.value
      : requestedNormalized;

    if (operator === "gt") return leftValue > rightValue;
    if (operator === "gte") return leftValue >= rightValue;
    if (operator === "lt") return leftValue < rightValue;
    if (operator === "lte") return leftValue <= rightValue;
  }

  return true;
}

function kpiRowsForEntity(rows = [], sourceEntity = "", defaultEntity = "") {
  const safeRows = Array.isArray(rows) ? rows : [];
  const targetEntity = String(sourceEntity || defaultEntity || "").trim();
  if (!targetEntity) return safeRows;

  const hasTypedRows = safeRows.some((row) =>
    String(rowTransactionData(row)?.record_type || "").trim()
  );

  // Legacy single-entity tables have no record_type. In that case all rows belong
  // to the only application entity even when the KPI carries a sourceEntity name.
  if (!hasTypedRows) return safeRows;

  return safeRows.filter((row) =>
    String(rowTransactionData(row)?.record_type || "").trim() === targetEntity
  );
}

function formatKpiResult(kpi = {}, numericValue = 0, aggregation = "") {
  const format = String(kpi?.format || "auto").trim().toLowerCase();
  const decimalsRaw = Number(kpi?.decimals);
  const decimals = Number.isFinite(decimalsRaw)
    ? Math.max(0, Math.min(6, Math.trunc(decimalsRaw)))
    : aggregation === "count"
      ? 0
      : 0;
  const prefix = String(kpi?.prefix || "");
  const suffix = String(kpi?.suffix || "");

  let rendered = "";

  if (format === "currency") {
    const currency = String(kpi?.currency || "USD").trim().toUpperCase() || "USD";
    try {
      rendered = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(numericValue);
    } catch {
      rendered = `${currency} ${new Intl.NumberFormat(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(numericValue)}`;
    }
  } else if (format === "percentage") {
    rendered = `${new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericValue)}%`;
  } else {
    const maximumFractionDigits = format === "integer" || aggregation === "count"
      ? 0
      : decimals;
    rendered = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits,
    }).format(numericValue);
  }

  return `${prefix}${rendered}${suffix}`;
}

function evaluateStructuredKpi({
  kpi = {},
  rows = [],
  defaultEntity = "",
}) {
  const aggregation = String(kpi?.aggregation || "").trim().toLowerCase();

  // Missing aggregation means this is an older V2.9 KPI. Let the caller run the
  // legacy label heuristic so existing applications do not change unexpectedly.
  if (!aggregation) {
    return { handled: false, value: kpi?.value };
  }

  if (aggregation === "static") {
    return { handled: true, value: String(kpi?.value ?? "") };
  }

  if (!["count", "sum", "average", "min", "max"].includes(aggregation)) {
    return { handled: true, value: String(kpi?.value ?? "") };
  }

  const sourceRows = kpiRowsForEntity(
    rows,
    String(kpi?.sourceEntity || ""),
    defaultEntity
  );

  const filters = Array.isArray(kpi?.filters) ? kpi.filters : [];
  const filteredRows = sourceRows.filter((row) =>
    filters.every((filter) => kpiFilterMatches(row, filter))
  );

  if (aggregation === "count") {
    return {
      handled: true,
      value: formatKpiResult(kpi, filteredRows.length, aggregation),
    };
  }

  const field = String(kpi?.field || "").trim();
  const numbers = filteredRows
    .map((row) => kpiNumericValue(kpiRawValue(row, field)))
    .filter((value) => value !== null);

  let result = 0;
  if (aggregation === "sum") {
    result = numbers.reduce((total, value) => total + value, 0);
  } else if (aggregation === "average") {
    result = numbers.length
      ? numbers.reduce((total, value) => total + value, 0) / numbers.length
      : 0;
  } else if (aggregation === "min") {
    result = numbers.length ? Math.min(...numbers) : 0;
  } else if (aggregation === "max") {
    result = numbers.length ? Math.max(...numbers) : 0;
  }

  return {
    handled: true,
    value: formatKpiResult(kpi, result, aggregation),
  };
}


function validatePayloadAgainstBackendSchema({ schema, payload, rows, excludeId = null }) {
  const fields = Array.isArray(schema?.fields) ? schema.fields : [];

  for (const field of fields) {
    const value = payload?.[field.name];
    const text = String(value ?? "").trim();
    const validation = field?.validation && typeof field.validation === "object" ? field.validation : {};

    if (field.required && !text) return `${field.label || field.name} is required`;

    if ((validation.type === "date_not_past" || validation.dateNotPast) && text) {
      const parsed = new Date(`${text}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!Number.isNaN(parsed.getTime()) && parsed < today) {
        return validation.message || `${field.label || field.name} cannot be in the past`;
      }
    }

    if (validation.type === "greater_than" && validation.compareWith) {
      const current = parseTimeToMinutes(text);
      const compare = parseTimeToMinutes(payload?.[validation.compareWith]);
      if (current !== null && compare !== null && current <= compare) {
        return validation.message || `${field.label || field.name} must be after ${validation.compareWith}`;
      }
    }

    if (field.type === "number" && text) {
      const numeric = Number(text);
      if (Number.isNaN(numeric)) return `${field.label || field.name} must be a number`;
      if (validation.min !== undefined && numeric < Number(validation.min)) {
        return validation.message || `${field.label || field.name} must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && numeric > Number(validation.max)) {
        return validation.message || `${field.label || field.name} must not exceed ${validation.max}`;
      }
    }
  }

  const comparableRows = (Array.isArray(rows) ? rows : []).filter(
    (row) => excludeId === null || String(row?.id) !== String(excludeId)
  );

  const uniqueRules = Array.isArray(schema?.uniqueRules) ? schema.uniqueRules : [];
  for (const rule of uniqueRules) {
    const names = Array.isArray(rule?.fields) ? rule.fields : [];
    if (names.length < 2) continue;
    const duplicate = comparableRows.some((row) => {
      const data = rowTransactionData(row);
      return names.every((name) => String(data?.[name] ?? "") === String(payload?.[name] ?? ""));
    });
    if (duplicate) return rule.message || "Duplicate record is not allowed";
  }

  const overlapRules = Array.isArray(schema?.overlapRules) ? schema.overlapRules : [];
  for (const rule of overlapRules) {
    const resourceField = String(rule?.resourceField || "");
    const dateField = String(rule?.dateField || "");
    const startField = String(rule?.startTimeField || "");
    const endField = String(rule?.endTimeField || "");
    const durationField = String(rule?.durationField || "");
    const slotMinutes = Math.max(1, Number(rule?.slotMinutes || 30));

    const resource = String(payload?.[resourceField] ?? "").trim();
    const date = String(payload?.[dateField] ?? "").trim();
    const start = parseTimeToMinutes(payload?.[startField]);
    if (!resource || !date || start === null) continue;

    let end = endField ? parseTimeToMinutes(payload?.[endField]) : null;
    if (end === null && durationField) {
      const duration = Number(payload?.[durationField]);
      if (!Number.isNaN(duration) && duration > 0) end = start + duration * slotMinutes;
    }
    if (end === null) end = start + slotMinutes;

    const conflict = comparableRows.some((row) => {
      const data = rowTransactionData(row);
      if (String(data?.[resourceField] ?? "").trim() !== resource) return false;
      if (String(data?.[dateField] ?? "").trim() !== date) return false;

      const otherStart = parseTimeToMinutes(data?.[startField]);
      if (otherStart === null) return false;

      let otherEnd = endField ? parseTimeToMinutes(data?.[endField]) : null;
      if (otherEnd === null && durationField) {
        const duration = Number(data?.[durationField]);
        if (!Number.isNaN(duration) && duration > 0) otherEnd = otherStart + duration * slotMinutes;
      }
      if (otherEnd === null) otherEnd = otherStart + slotMinutes;

      return start < otherEnd && end > otherStart;
    });

    if (conflict) return rule.message || "This time slot conflicts with an existing booking.";
  }
  return "";
}

function FieldControl({ field, value, onChange, accent, disabled, errorText = "" }) {
  const helperText = errorText || field.helperText || "";
  const common = {
    fullWidth: true,
    size: "small",
    label: field.label,
    value: value ?? "",
    required: Boolean(field.required),
    disabled,
    error: Boolean(errorText),
    helperText,
    onChange: (event) => onChange(field.name, event.target.value),
    placeholder: field.placeholder || `Enter ${String(field.label || field.name || "value").toLowerCase()}`,
    InputLabelProps: { shrink: true },
    FormHelperTextProps: { sx: { ml: 0, mt: 0.55, fontSize: 10.5, lineHeight: 1.35 } },
  };

  if (field.type === "select" && field.controlStyle === "cards") {
    return (
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#53677b", mb: 0.9, textTransform: "uppercase", letterSpacing: ".025em" }}>
          {field.label}{field.required ? " *" : ""}
        </Typography>
        <Grid container spacing={1}>
          {(field.options || []).map((option) => {
            const selected = value === option;
            return (
              <Grid item xs={12} sm={6} md={4} key={option}>
                <Paper
                  elevation={0}
                  onClick={() => !disabled && onChange(field.name, option)}
                  sx={{
                    p: 1.25,
                    cursor: disabled ? "default" : "pointer",
                    opacity: disabled ? 0.65 : 1,
                    border: `1px solid ${selected ? accent : errorText ? "#d32f2f" : "#d8e3ec"}`,
                    bgcolor: selected ? `${accent}0d` : "#fff",
                    boxShadow: "none",
                    borderRadius: 1.3,
                    transition: "all .15s ease",
                    ...(!disabled && { "&:hover": { borderColor: accent } }),
                  }}
                >
                  <Typography sx={{ fontSize: 12.5, fontWeight: selected ? 800 : 650, color: "#16324f" }}>
                    {option}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
        {helperText ? (
          <Typography sx={{ mt: 0.55, fontSize: 10.5, color: errorText ? "#d32f2f" : "#7a8da0" }}>
            {helperText}
          </Typography>
        ) : null}
      </Box>
    );
  }

  if (field.type === "select") {
    return (
      <TextField {...common} select>
        {(field.options || []).map((option) => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === "textarea") return <TextField {...common} multiline minRows={4} />;
  return <TextField {...common} type={field.type || "text"} />;
}

function StatusValue({ value }) {
  const text = String(value || "—");
  const lower = text.toLowerCase();
  let tone = { bg: "#eef4fb", fg: "#1769aa" };
  if (/complete|approved|active|success|confirmed|closed/.test(lower)) tone = { bg: "#eaf7ef", fg: "#16834a" };
  else if (/progress|pending|review|waiting/.test(lower)) tone = { bg: "#fff3dc", fg: "#a96300" };
  else if (/reject|failed|error|cancel|blocked/.test(lower)) tone = { bg: "#fdecec", fg: "#c62828" };
  return <Chip size="small" label={text} sx={{ height: 22, bgcolor: tone.bg, color: tone.fg, fontWeight: 800, fontSize: 10.3, "& .MuiChip-label": { px: 1 } }} />;
}

function ProgressValue({ value }) {
  const numeric = Math.max(0, Math.min(100, Number(String(value || "0").replace("%", "")) || 0));
  return (
    <Stack direction="row" spacing={0.9} alignItems="center" sx={{ minWidth: 125 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, minWidth: 34, color: "#183a57" }}>{numeric}%</Typography>
      <LinearProgress
        variant="determinate"
        value={numeric}
        sx={{
          flex: 1,
          height: 6,
          borderRadius: 999,
          bgcolor: "#e5ebf1",
          "& .MuiLinearProgress-bar": {
            borderRadius: 999,
            bgcolor: numeric >= 100 ? "#22a447" : numeric >= 60 ? "#1594d0" : "#f39a13",
          },
        }}
      />
    </Stack>
  );
}

function EnterpriseKpiCard({ kpi, index, value }) {
  const tone = getTone(kpi?.tone || ["blue", "green", "orange", "purple", "red", "teal"][index % 6]);
  const Icon = getIcon(kpi?.icon || "dashboard");
  return (
    <Paper elevation={0} sx={{ height: 118, p: 1.9, border: "1px solid #dce5ed", borderRadius: "12px", bgcolor: "#fff", boxShadow: "0 3px 10px rgba(31,52,73,.04)", display: "flex", alignItems: "center", gap: 1.6 }}>
      <Box sx={{ width: 60, height: 60, borderRadius: "14px", display: "grid", placeItems: "center", flex: "0 0 auto", bgcolor: tone.main, color: "#fff", boxShadow: `0 7px 14px ${tone.main}33` }}>
        <Icon sx={{ fontSize: 27 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: tone.dark, fontSize: 10.8, fontWeight: 900, lineHeight: 1.25, textTransform: "uppercase", letterSpacing: ".025em" }}>{kpi.label}</Typography>
        <Typography sx={{ color: "#082d52", fontSize: 27, fontWeight: 900, lineHeight: 1.05, mt: 0.7 }}>{value}</Typography>
        {kpi.hint ? <Typography sx={{ color: "#637b91", fontSize: 10.9, mt: 0.45, lineHeight: 1.3 }}>{kpi.hint}</Typography> : null}
      </Box>
    </Paper>
  );
}

function AppIdentityHeader({ spec, isLive, applicationFullscreen, onToggleApplicationFullscreen }) {
  const accent = normalizeHex(spec?.accentColor);
  const Icon = getIcon(spec?.appIcon || "default");
  const tone = getTone(spec?.appIconTone || "teal");

  return (
    <Box sx={{ px: { xs: 2, md: 2.8 }, py: 1.75, bgcolor: tone.dark, color: "#fff", borderBottom: "1px solid rgba(0,0,0,.08)", position: "sticky", top: 0, zIndex: 5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: "12px", display: "grid", placeItems: "center", bgcolor: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.12)", flex: "0 0 auto" }}>
            <Icon sx={{ fontSize: 25, color: "#fff" }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: { xs: 17, md: 20 }, lineHeight: 1.2, fontWeight: 900, letterSpacing: "-.01em" }}>{spec.appTitle || "Generated Application"}</Typography>
            <Typography noWrap sx={{ mt: 0.35, color: "rgba(255,255,255,.82)", fontSize: 11.8 }}>{spec.appSubtitle || "AI generated application"}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.7} sx={{ flex: "0 0 auto" }}>
          <Chip
            icon={isLive ? <StorageRoundedIcon /> : <AutoAwesomeOutlinedIcon />}
            label={isLive ? "Backend Connected" : "AI Preview"}
            size="small"
            sx={{ height: 28, bgcolor: "rgba(255,255,255,.94)", color: isLive ? "#147044" : accent, fontWeight: 800, border: "1px solid rgba(255,255,255,.75)", "& .MuiChip-icon": { color: "inherit" } }}
          />
          {onToggleApplicationFullscreen ? (
            <Tooltip title={applicationFullscreen ? "Contract application" : "Expand application"}>
              <IconButton size="small" onClick={onToggleApplicationFullscreen} sx={{ width: 32, height: 32, bgcolor: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", color: "#fff", borderRadius: "10px", "&:hover": { bgcolor: "rgba(255,255,255,.20)" } }}>
                {applicationFullscreen ? <FullscreenExitRoundedIcon sx={{ fontSize: 20 }} /> : <FullscreenRoundedIcon sx={{ fontSize: 20 }} />}
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}

function FormBody({ spec, fields, formValues, formErrors, onFieldChange, accent, saving }) {
  const sections = Array.isArray(spec?.form?.sections) && spec.form.sections.length
    ? spec.form.sections
    : [{ title: spec?.form?.sectionTitle || "Details", description: "", fields: fields.map((field) => field.name) }];

  return (
    <Stack spacing={1.5}>
      {sections.map((section, sectionIndex) => {
        const names = Array.isArray(section?.fields) ? section.fields : [];
        const sectionFields = fields.filter((field) => names.includes(field.name));
        if (!sectionFields.length) return null;
        return (
          <Paper key={`${section.title}-${sectionIndex}`} elevation={0} sx={{ border: "1px solid #d8e4ee", borderRadius: "12px", overflow: "hidden", bgcolor: "#fff" }}>
            <Box sx={{ px: 1.7, py: 1.05, bgcolor: "#f2f7fb", borderBottom: "1px solid #d8e4ee" }}>
              <Typography sx={{ fontSize: 12, fontWeight: 900, color: "#13466e" }}>{section.title || "Details"}</Typography>
              {section.description ? <Typography sx={{ fontSize: 10.5, color: "#71869b", mt: 0.2 }}>{section.description}</Typography> : null}
            </Box>
            <Box sx={{ p: 1.7 }}>
              <Grid container spacing={1.45}>
                {sectionFields.map((field) => (
                  <Grid item xs={12} md={field.type === "textarea" || field.controlStyle === "cards" ? 12 : 6} key={field.name}>
                    <FieldControl field={field} value={formValues[field.name]} onChange={onFieldChange} accent={accent} disabled={saving} errorText={formErrors[field.name] || ""} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
}

function LegacyGeneratedAppPreview({
  spec,
  backendApp = null,
  backendSchema = null,
  onNotice,
  applicationFullscreen = false,
  onToggleApplicationFullscreen,
}) {
  const accent = normalizeHex(spec?.accentColor);
  const [formValues, setFormValues] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [liveRows, setLiveRows] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(Number(spec?.list?.defaultRowsPerPage || 10));
  const [filters, setFilters] = useState({});

  const isLive = Boolean(backendApp?.app_slug);
  const fields = useMemo(() => (Array.isArray(spec?.form?.fields) ? spec.form.fields : []), [spec]);
  const columns = useMemo(
    () =>
      (Array.isArray(spec?.list?.columns) ? spec.list.columns : []).filter(
        (column) =>
          !/^actions?$/i.test(String(column?.key || "").trim()) &&
          !/^actions?$/i.test(String(column?.label || "").trim())
      ),
    [spec]
  );
  const backendFields = useMemo(() => (Array.isArray(backendSchema?.fields) ? backendSchema.fields : []), [backendSchema]);
  const actions = Array.isArray(spec?.list?.actions) ? spec.list.actions : [];
  const canEdit = isLive && actions.includes("edit");
  const canDelete = isLive && actions.includes("delete");
  const canView = isLive || actions.includes("view");

  const tableConfig = {
    search: spec?.list?.search !== false,
    sorting: spec?.list?.sorting !== false,
    paging: spec?.list?.paging !== false,
    rowsPerPageOptions: Array.isArray(spec?.list?.rowsPerPageOptions) && spec.list.rowsPerPageOptions.length ? spec.list.rowsPerPageOptions : [10, 25, 50],
    filters: Array.isArray(spec?.list?.filters) ? spec.list.filters : [],
  };

  const modalPreferred =
    spec?.form?.presentation === "modal" ||
    (spec?.form?.presentation !== "inline" && (fields.length > 5 || isLive));

  const loadLiveRecords = async () => {
    if (!backendApp?.app_slug) return;
    setLoadingRecords(true);
    try {
      const response = await api.get(`/aiappbuilder/${backendApp.app_slug}/records`);
      setLiveRows(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      onNotice?.(error?.response?.data?.error || error.message || "Could not load live records", "error");
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (backendApp?.app_slug) loadLiveRecords();
    else setLiveRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendApp?.app_slug]);

  useEffect(() => {
    setRowsPerPage(Number(spec?.list?.defaultRowsPerPage || 10));
    setPage(0);
  }, [spec?.list?.defaultRowsPerPage]);

  const displayItems = useMemo(() => {
    if (!isLive) {
      const mockRows = Array.isArray(spec?.list?.mockRows) ? spec.list.mockRows : [];
      return mockRows.map((values, index) => ({ key: `mock-${index}`, raw: null, values: Array.isArray(values) ? values.map(String) : [] }));
    }
    return liveRows.map((row, index) => ({ key: row?.id || `live-${index}`, raw: row, values: columns.map((column) => rowValue(row, column, backendFields)) }));
  }, [isLive, liveRows, columns, backendFields, spec]);

  const filterOptions = useMemo(() => {
    const result = {};
    tableConfig.filters.forEach((filterKey) => {
      const columnIndex = columns.findIndex((column) => normalized(column.key) === normalized(filterKey) || normalized(column.label) === normalized(filterKey));
      if (columnIndex < 0) return;
      result[filterKey] = [...new Set(displayItems.map((item) => item.values[columnIndex]).filter((value) => value && value !== "—"))].sort();
    });
    return result;
  }, [tableConfig.filters, columns, displayItems]);

  const filteredItems = useMemo(() => {
    let next = [...displayItems];
    const query = search.trim().toLowerCase();
    if (query) next = next.filter((item) => item.values.join(" ").toLowerCase().includes(query));

    Object.entries(filters).forEach(([filterKey, selected]) => {
      if (!selected) return;
      const columnIndex = columns.findIndex((column) => normalized(column.key) === normalized(filterKey) || normalized(column.label) === normalized(filterKey));
      if (columnIndex >= 0) next = next.filter((item) => String(item.values[columnIndex] || "") === String(selected));
    });

    if (tableConfig.sorting && orderBy) {
      const columnIndex = columns.findIndex((column) => column.key === orderBy);
      if (columnIndex >= 0) {
        next.sort((a, b) => {
          const aValue = a.values[columnIndex] || "";
          const bValue = b.values[columnIndex] || "";
          const numericA = Number(String(aValue).replace(/[%,$]/g, ""));
          const numericB = Number(String(bValue).replace(/[%,$]/g, ""));
          const bothNumeric = !Number.isNaN(numericA) && !Number.isNaN(numericB);
          const comparison = bothNumeric
            ? numericA - numericB
            : String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: "base" });
          return order === "asc" ? comparison : -comparison;
        });
      }
    }
    return next;
  }, [displayItems, search, filters, columns, orderBy, order, tableConfig.sorting]);

  useEffect(() => { setPage(0); }, [search, filters, rowsPerPage]);

  const pagedItems = tableConfig.paging
    ? filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : filteredItems;

  const dynamicKpiValue = (kpi) => {
    if (!isLive) return kpi.value;

    const structured = evaluateStructuredKpi({
      kpi,
      rows: liveRows,
      defaultEntity: "",
    });

    if (structured.handled) {
      return structured.value;
    }

    // Backward compatibility for pre-V2.9.1 saved specifications.
    const label = String(kpi?.label || "").toLowerCase();
    const dateField = backendFields.find((field) => field.type === "date");
    const today = new Date().toISOString().slice(0, 10);
    if (dateField && /today/.test(label)) return String(liveRows.filter((row) => String(row?.transaction_data?.[dateField.name] || "") === today).length);
    if (dateField && /upcoming/.test(label)) return String(liveRows.filter((row) => String(row?.transaction_data?.[dateField.name] || "") >= today).length);
    if (/total (records|bookings|requests|reservations)|total/.test(label)) return String(liveRows.length);
    return kpi.value;
  };

  const handleFieldChange = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const buildBackendPayload = () => {
    const payload = {};
    backendFields.forEach((field) => {
      if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== "") payload[field.name] = field.defaultValue;
    });
    fields.forEach((frontendField) => {
      const value = formValues[frontendField.name];
      if (value === undefined || value === null || value === "") return;
      const backendField = findBackendFieldForFrontend(frontendField, backendFields);
      payload[backendField?.name || frontendField.name] = value;
    });
    return payload;
  };

  const validateForm = () => {
    const errors = {};
    fields.forEach((field) => {
      const value = formValues[field.name];
      if (field.required && !String(value ?? "").trim()) errors[field.name] = `${field.label || field.name} is required`;
    });
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      onNotice?.("Please complete the required fields.", "warning");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormValues({});
    setFormErrors({});
    setEditingId(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!isLive) {
      onNotice?.("This is a frontend preview. Build the backend before saving real records.", "info");
      return;
    }

    const payload = buildBackendPayload();
    const validationError = validatePayloadAgainstBackendSchema({ schema: backendSchema, payload, rows: liveRows, excludeId: editingId });
    if (validationError) {
      onNotice?.(validationError, "warning");
      return;
    }

    setSaving(true);
    try {
      const wasEditing = Boolean(editingId);
      if (editingId) await api.put(`/aiappbuilder/${backendApp.app_slug}/records/${editingId}`, { transaction_data: payload });
      else await api.post(`/aiappbuilder/${backendApp.app_slug}/records`, { transaction_data: payload });
      resetForm();
      if (modalPreferred) setFormOpen(false);
      await loadLiveRecords();
      onNotice?.(wasEditing ? "Record updated successfully." : "Record created successfully.", "success");
    } catch (error) {
      const message = error?.response?.data?.error || error.message || "Could not save record";
      onNotice?.(message, error?.response?.status === 409 ? "warning" : "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEditRecord = (item) => {
    const row = item?.raw;
    if (!row?.id) return;
    const data = rowTransactionData(row);
    const nextValues = {};
    fields.forEach((frontendField) => {
      const backendField = findBackendFieldForFrontend(frontendField, backendFields);
      const key = backendField?.name || frontendField.name;
      if (data[key] !== undefined && data[key] !== null) nextValues[frontendField.name] = data[key];
    });
    setFormValues(nextValues);
    setFormErrors({});
    setEditingId(row.id);
    if (modalPreferred) setFormOpen(true);
    onNotice?.("Record loaded for editing.", "info");
  };

  const confirmDelete = async () => {
    const row = deleteCandidate?.raw;
    if (!row?.id || deletingId) return;
    setDeletingId(row.id);
    try {
      await api.delete(`/aiappbuilder/${backendApp.app_slug}/records/${row.id}`);
      if (String(editingId) === String(row.id)) resetForm();
      setDeleteCandidate(null);
      await loadLiveRecords();
      onNotice?.("Record deleted successfully.", "success");
    } catch (error) {
      onNotice?.(error?.response?.data?.error || error.message || "Could not delete record", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const requestSort = (columnKey) => {
    if (!tableConfig.sorting) return;
    if (orderBy === columnKey) setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setOrderBy(columnKey);
      setOrder("asc");
    }
  };

  if (!spec) {
    return (
      <Box sx={{ height: "100%", minHeight: 560, display: "grid", placeItems: "center", bgcolor: "#f4f8fc", backgroundImage: "radial-gradient(#dce8f2 1px, transparent 1px)", backgroundSize: "18px 18px", p: 4 }}>
        <Box sx={{ textAlign: "center", maxWidth: 480 }}>
          <Box sx={{ width: 72, height: 72, borderRadius: 2, display: "grid", placeItems: "center", mx: "auto", mb: 2, bgcolor: "#eaf4fd", border: "1px solid #cfe3f7" }}>
            <ViewQuiltOutlinedIcon sx={{ fontSize: 34, color: FALLBACK_ACCENT }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#153653", mb: 1 }}>Your application will appear here</Typography>
          <Typography sx={{ color: "#6c8094", fontSize: 14, lineHeight: 1.65 }}>Describe the application in the AI panel. AUGMIS will ask only the questions it needs, then generate a working React preview using mock data.</Typography>
        </Box>
      </Box>
    );
  }

  const themeMode =
    spec?.themeMode === "ai_freedom"
      ? "ai_freedom"
      : "augmis_standard";

  if (themeMode === "ai_freedom") {
    return (
      <Box sx={{ height: "100%", overflow: "auto", bgcolor: "#f2f6fa" }}>
        <AppIdentityHeader
          spec={spec}
          isLive={isLive}
          applicationFullscreen={applicationFullscreen}
          onToggleApplicationFullscreen={onToggleApplicationFullscreen}
        />

        <Box
          sx={{
            p: { xs: 1.25, md: 1.7 },
            minHeight: "calc(100% - 78px)",
          }}
        >
          <SecureAiFreedomCanvas
            spec={spec}
            backendApp={backendApp}
            backendSchema={backendSchema}
            onNotice={onNotice}
          />

          <Box
            sx={{
              mt: 1.25,
              px: 1.5,
              py: 0.9,
              borderRadius: "10px",
              bgcolor: isLive ? "#edf9f2" : "#eef6fd",
              border: `1px solid ${isLive ? "#cfe9da" : "#d4e7f8"}`,
              color: isLive ? "#356b4d" : "#5a738b",
              fontSize: 10.8,
            }}
          >
            {isLive
              ? `AI Freedom sandbox connected to ${backendApp.table_name || backendApp.app_slug}. Only controlled current-app CRUD actions are permitted.`
              : "AI Freedom preview is isolated in a secure sandbox. Build Backend to enable controlled record operations."}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", overflow: "auto", bgcolor: "#f2f6fa" }}>
      <AppIdentityHeader spec={spec} isLive={isLive} applicationFullscreen={applicationFullscreen} onToggleApplicationFullscreen={onToggleApplicationFullscreen} />

      <Box sx={{ p: { xs: 1.5, md: 2.2 } }}>
        {Array.isArray(spec.navigation) && spec.navigation.length > 0 ? (
          <Stack direction="row" spacing={0.8} sx={{ mb: 1.6, flexWrap: "wrap", gap: 0.8 }}>
            {spec.navigation.map((item, index) => (
              <Button key={`${item}-${index}`} size="small" variant={index === 0 ? "contained" : "outlined"} sx={{ height: 31, textTransform: "none", borderRadius: "10px", boxShadow: "none", fontWeight: 700, fontSize: 11.2, ...(index === 0 ? { bgcolor: accent, "&:hover": { bgcolor: accent } } : { color: "#416079", borderColor: "#cfdae5", bgcolor: "#fff" }) }}>
                {item}
              </Button>
            ))}
          </Stack>
        ) : null}

        {Array.isArray(spec.kpis) && spec.kpis.length > 0 ? (
          <Grid container spacing={1.4} sx={{ mb: 1.7 }}>
            {spec.kpis.map((kpi, index) => (
              <Grid item xs={12} sm={6} md={4} lg={spec.kpis.length >= 5 ? 2.4 : spec.kpis.length === 4 ? 3 : 4} key={`${kpi.label}-${index}`}>
                <EnterpriseKpiCard kpi={kpi} index={index} value={dynamicKpiValue(kpi)} />
              </Grid>
            ))}
          </Grid>
        ) : null}

        {!modalPreferred && spec.form ? (
          <Paper elevation={0} sx={{ mb: 1.7, border: "1px solid #d8e4ee", borderRadius: "12px", overflow: "hidden", bgcolor: "#fff" }}>
            <Box sx={{ px: 1.8, py: 1.2, borderBottom: "1px solid #d8e4ee", bgcolor: "#fff" }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <EventAvailableOutlinedIcon sx={{ color: accent, fontSize: 20 }} />
                <Box>
                  <Typography sx={{ fontWeight: 900, color: "#123b5d", fontSize: 14.5 }}>{editingId ? `Edit ${spec.form.title || "Record"}` : spec.form.title || "Create Record"}</Typography>
                  {spec.form.description ? <Typography sx={{ color: "#75899c", fontSize: 10.8, mt: 0.2 }}>{spec.form.description}</Typography> : null}
                </Box>
              </Stack>
            </Box>
            <Box sx={{ p: 1.8 }}>
              <FormBody spec={spec} fields={fields} formValues={formValues} formErrors={formErrors} onFieldChange={handleFieldChange} accent={accent} saving={saving} />
              <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1.6 }}>
                {editingId ? <Button onClick={resetForm} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button> : null}
                <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ minWidth: 110, textTransform: "none", bgcolor: accent, boxShadow: "none", "&:hover": { bgcolor: accent } }}>
                  {saving ? "Saving…" : editingId ? "Update" : spec.form.submitText || "Save"}
                </Button>
              </Stack>
            </Box>
          </Paper>
        ) : null}

        {spec.list ? (
          <Paper elevation={0} sx={{ border: "1px solid #d8e4ee", borderRadius: "12px", bgcolor: "#fff", overflow: "hidden" }}>
            <Box sx={{ px: 1.8, py: 1.35, borderBottom: "1px solid #d8e4ee" }}>
              <Stack direction={{ xs: "column", lg: "row" }} alignItems={{ xs: "stretch", lg: "center" }} justifyContent="space-between" spacing={1.2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AssignmentOutlinedIcon sx={{ color: accent, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 900, color: "#123b5d", fontSize: 15 }}>{spec.list.title || "Records"}</Typography>
                  {loadingRecords ? <CircularProgress size={15} /> : null}
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={1} sx={{ flexWrap: "wrap" }}>
                  {tableConfig.search ? (
                    <TextField
                      size="small"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={spec.list.searchPlaceholder || "Search records..."}
                      sx={{ width: { xs: "100%", sm: 270 }, "& .MuiOutlinedInput-root": { height: 36, fontSize: 11.5, borderRadius: "18px" } }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 17, color: "#75899d" }} /></InputAdornment> }}
                    />
                  ) : null}

                  {tableConfig.filters.map((filterKey) => {
                    const options = filterOptions[filterKey] || [];
                    if (!options.length) return null;
                    const column = columns.find((item) => normalized(item.key) === normalized(filterKey) || normalized(item.label) === normalized(filterKey));
                    return (
                      <FormControl key={filterKey} size="small" sx={{ minWidth: 160 }}>
                        <Select displayEmpty value={filters[filterKey] || ""} onChange={(event) => setFilters((prev) => ({ ...prev, [filterKey]: event.target.value }))} sx={{ height: 36, fontSize: 11.3, borderRadius: "10px" }}>
                          <MenuItem value="">All {column?.label || filterKey}</MenuItem>
                          {options.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                        </Select>
                      </FormControl>
                    );
                  })}

                  {modalPreferred && spec.form ? (
                    <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateForm} sx={{ height: 36, textTransform: "none", bgcolor: accent, boxShadow: "none", fontWeight: 800, borderRadius: "10px", "&:hover": { bgcolor: accent } }}>
                      {spec.form.createButtonText || "Create New"}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Box>

            {spec.list.style === "cards" ? (
              <Box sx={{ p: 1.6 }}>
                <Grid container spacing={1.2}>
                  {pagedItems.length ? pagedItems.map((item) => (
                    <Grid item xs={12} sm={6} lg={4} key={item.key}>
                      <Paper elevation={0} sx={{ p: 1.5, border: "1px solid #dfe7ee", borderRadius: "12px" }}>
                        {columns.map((column, columnIndex) => (
                          <Box key={column.key} sx={{ mb: columnIndex === columns.length - 1 ? 0 : 0.75 }}>
                            <Typography sx={{ fontSize: 9.8, color: "#8092a4", fontWeight: 800, textTransform: "uppercase" }}>{column.label}</Typography>
                            <Typography sx={{ fontSize: 12.5, color: "#173854", fontWeight: 650 }}>{item.values[columnIndex] || "—"}</Typography>
                          </Box>
                        ))}
                        {isLive ? (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 1.2 }}>
                            {canView ? <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => setViewItem(item)} sx={{ textTransform: "none" }}>View</Button> : null}
                            {canEdit ? <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => handleEditRecord(item)} sx={{ textTransform: "none" }}>Edit</Button> : null}
                            {canDelete ? <Button size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => setDeleteCandidate(item)} sx={{ textTransform: "none" }}>Delete</Button> : null}
                          </Stack>
                        ) : null}
                      </Paper>
                    </Grid>
                  )) : (
                    <Grid item xs={12}><Typography sx={{ py: 3, textAlign: "center", color: "#7c8fa2", fontSize: 12 }}>{spec.list.emptyText || "No records found."}</Typography></Grid>
                  )}
                </Grid>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ minWidth: 760 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#0c4875" }}>
                      {columns.map((column) => (
                        <TableCell key={column.key} sortDirection={orderBy === column.key ? order : false} sx={{ py: 0.72, color: "#fff", borderBottom: "none", fontSize: 10.1, fontWeight: 900, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          {tableConfig.sorting ? (
                            <TableSortLabel active={orderBy === column.key} direction={orderBy === column.key ? order : "asc"} onClick={() => requestSort(column.key)} sx={{ color: "#fff !important", "& .MuiTableSortLabel-icon": { color: "#fff !important" } }}>{column.label}</TableSortLabel>
                          ) : column.label}
                        </TableCell>
                      ))}
                      {isLive ? <TableCell align="center" sx={{ py: 0.72, color: "#fff", borderBottom: "none", fontSize: 10.1, fontWeight: 900, textTransform: "uppercase", whiteSpace: "nowrap" }}>Actions</TableCell> : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedItems.length ? pagedItems.map((item) => (
                      <TableRow key={item.key} hover sx={{ "&:last-child td": { borderBottom: "none" } }}>
                        {columns.map((column, columnIndex) => {
                          const value = item.values[columnIndex];
                          const keyText = `${column.key} ${column.label}`.toLowerCase();
                          return (
                            <TableCell key={column.key} sx={{ py: 0.52, color: "#123b5d", fontSize: 11.15, borderColor: "#e3eaf0", verticalAlign: "middle" }}>
                              {/status/.test(keyText) ? <StatusValue value={value} /> : /progress|percentage|percent/.test(keyText) ? <ProgressValue value={value} /> : value || "—"}
                            </TableCell>
                          );
                        })}
                        {isLive ? (
                          <TableCell align="center" sx={{ py: 0.35, borderColor: "#e3eaf0", whiteSpace: "nowrap" }}>
                            <Tooltip title="View"><IconButton size="small" onClick={() => setViewItem(item)} sx={{ width: 30, height: 30, border: "1px solid #cfdeea", borderRadius: "8px", color: "#0a6fb5", mr: 0.5 }}><VisibilityOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                            {canEdit ? <Tooltip title="Edit"><IconButton size="small" onClick={() => handleEditRecord(item)} sx={{ width: 30, height: 30, border: "1px solid #cfdeea", borderRadius: "8px", color: "#0a6fb5", mr: 0.5 }}><EditOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip> : null}
                            {canDelete ? <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteCandidate(item)} sx={{ width: 30, height: 30, border: "1px solid #efd4d4", borderRadius: "8px", color: "#c62828" }}><DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip> : null}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={columns.length + (isLive ? 1 : 0)} sx={{ py: 4, textAlign: "center", color: "#7b8ea0", fontSize: 12 }}>{spec.list.emptyText || "No records found."}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {tableConfig.paging ? (
              <TablePagination
                component="div"
                count={filteredItems.length}
                page={Math.min(page, Math.max(0, Math.ceil(filteredItems.length / rowsPerPage) - 1))}
                onPageChange={(_event, nextPage) => setPage(nextPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }}
                rowsPerPageOptions={tableConfig.rowsPerPageOptions}
                sx={{
                  borderTop: "1px solid #e3eaf0",
                  "& .MuiTablePagination-toolbar": {
                    minHeight: 44,
                    px: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 0.25,
                  },
                  "& .MuiTablePagination-spacer": { flex: "1 1 auto" },
                  "& .MuiTablePagination-selectLabel": {
                    fontSize: 10.8,
                    mb: 0,
                    ml: 0,
                  },
                  "& .MuiTablePagination-select": {
                    fontSize: 10.8,
                    py: 0,
                  },
                  "& .MuiTablePagination-displayedRows": {
                    fontSize: 10.8,
                    mb: 0,
                    ml: 1.5,
                  },
                  "& .MuiTablePagination-actions": {
                    ml: 0.7,
                  },
                }}
              />
            ) : null}
          </Paper>
        ) : null}

        <Box sx={{ mt: 1.5, px: 1.5, py: 1, borderRadius: "10px", bgcolor: isLive ? "#edf9f2" : "#eef6fd", border: `1px solid ${isLive ? "#cfe9da" : "#d4e7f8"}`, color: isLive ? "#356b4d" : "#5a738b", fontSize: 10.8 }}>
          {isLive ? `Backend connected to ${backendApp.table_name || backendApp.app_slug}. New records are stored in the database.` : spec.notice || "Frontend preview only. No backend has been created yet."}
        </Box>
      </Box>

      <Dialog open={modalPreferred && formOpen} onClose={() => { if (!saving) { setFormOpen(false); resetForm(); } }} fullWidth maxWidth={false} PaperProps={{ sx: { width: "calc(100% - 40px)", maxWidth: 780, borderRadius: "14px", overflow: "hidden" } }}>
        <DialogTitle sx={{ p: 0 }}>
          <Box sx={{ px: 2.2, py: 1.55, bgcolor: getTone(spec?.appIconTone || "teal").dark, color: "#fff" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <Box sx={{ width: 42, height: 42, borderRadius: "12px", bgcolor: "rgba(255,255,255,.14)", display: "grid", placeItems: "center" }}>
                  {React.createElement(getIcon(spec?.appIcon || "form"), { sx: { fontSize: 22 } })}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>{editingId ? `Edit: ${spec.form.title || "Record"}` : `Create: ${spec.form.title || "Record"}`}</Typography>
                  <Typography sx={{ mt: 0.25, fontSize: 10.8, color: "rgba(255,255,255,.82)" }}>{spec.form.description || "Complete the form below."}</Typography>
                </Box>
              </Stack>
              <IconButton onClick={() => { if (!saving) { setFormOpen(false); resetForm(); } }} sx={{ color: "#fff" }}><CloseRoundedIcon /></IconButton>
            </Stack>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2.2, bgcolor: "#f7fafc" }}>
          <FormBody spec={spec} fields={fields} formValues={formValues} formErrors={formErrors} onFieldChange={handleFieldChange} accent={accent} saving={saving} />
        </DialogContent>
        <DialogActions sx={{ px: 2.2, py: 1.35, borderTop: "1px solid #dde6ee", bgcolor: "#fff" }}>
          <Button onClick={() => { setFormOpen(false); resetForm(); }} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ minWidth: 110, textTransform: "none", bgcolor: accent, boxShadow: "none", "&:hover": { bgcolor: accent } }}>
            {saving ? "Saving…" : editingId ? "Update" : spec.form.submitText || "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewItem)} onClose={() => setViewItem(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900, color: "#123b5d" }}>Record Details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.2}>
            {columns.map((column, index) => (
              <Box key={column.key}>
                <Typography sx={{ fontSize: 10, fontWeight: 800, color: "#7a8da0", textTransform: "uppercase" }}>{column.label}</Typography>
                <Typography sx={{ mt: 0.25, fontSize: 12.5, color: "#173854", fontWeight: 650 }}>{viewItem?.values?.[index] || "—"}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setViewItem(null)} sx={{ textTransform: "none" }}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteCandidate)} onClose={() => !deletingId && setDeleteCandidate(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, color: "#8f1f1f" }}>Delete Record?</DialogTitle>
        <DialogContent><Alert severity="warning">This will delete the selected record. This action cannot be undone.</Alert></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCandidate(null)} disabled={Boolean(deletingId)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={Boolean(deletingId)} sx={{ textTransform: "none" }}>{deletingId ? "Deleting…" : "Delete"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


// =============================================================================
// V2.9 MULTI-ENTITY / MULTI-FORM RENDERER
// =============================================================================
const v29Forms = (spec = {}) =>
  Array.isArray(spec?.forms)
    ? spec.forms.filter((form) => form && typeof form === "object")
    : [];

const isV29MultiEntitySpec = (spec = {}) => {
  const forms = v29Forms(spec);
  if (forms.length > 1) return true;
  return forms.some((form) =>
    (Array.isArray(form?.fields) ? form.fields : []).some(
      (field) => String(field?.lookupEntity || "").trim()
    )
  );
};

const v29EntityRows = (rows = [], entity = "") =>
  (Array.isArray(rows) ? rows : []).filter((row) =>
    String(rowTransactionData(row)?.record_type || "") === String(entity || "")
  );

function V29FieldControl({
  field,
  value,
  onChange,
  records,
  disabled,
  errorText = "",
}) {
  const lookupEntity = String(field?.lookupEntity || "").trim();
  const helperText = errorText || field?.helperText || "";

  if (lookupEntity) {
    const valueField = String(field?.lookupValueField || "id").trim() || "id";
    const labelField = String(field?.lookupLabelField || "").trim();
    const options = v29EntityRows(records, lookupEntity).map((row) => {
      const data = rowTransactionData(row);
      return {
        value:
          valueField === "id"
            ? String(row?.id ?? "")
            : String(data?.[valueField] ?? ""),
        label: String(
          (labelField && data?.[labelField]) ||
          data?.name ||
          data?.title ||
          data?.customer_name ||
          row?.id ||
          "Record"
        ),
      };
    });

    return (
      <TextField
        select
        fullWidth
        size="small"
        label={field.label}
        value={value ?? ""}
        required={Boolean(field.required)}
        disabled={disabled || options.length === 0}
        error={Boolean(errorText)}
        helperText={
          options.length === 0
            ? `Create a ${lookupEntity.replace(/_/g, " ")} record first.`
            : helperText
        }
        onChange={(event) => onChange(field.name, event.target.value)}
        InputLabelProps={{ shrink: true }}
        FormHelperTextProps={{ sx: { ml: 0, mt: 0.55, fontSize: 10.5 } }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  const common = {
    fullWidth: true,
    size: "small",
    label: field.label,
    value: value ?? "",
    required: Boolean(field.required),
    disabled,
    error: Boolean(errorText),
    helperText,
    onChange: (event) => onChange(field.name, event.target.value),
    placeholder:
      field.placeholder ||
      `Enter ${String(field.label || field.name || "value").toLowerCase()}`,
    InputLabelProps: { shrink: true },
    FormHelperTextProps: { sx: { ml: 0, mt: 0.55, fontSize: 10.5 } },
  };

  if (field.type === "select") {
    return (
      <TextField {...common} select>
        {(field.options || []).map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === "textarea") {
    return <TextField {...common} multiline minRows={4} />;
  }

  return <TextField {...common} type={field.type || "text"} />;
}

function V29MultiEntityPreview({
  spec,
  backendApp = null,
  backendSchema = null,
  onNotice,
  applicationFullscreen = false,
  onToggleApplicationFullscreen,
}) {
  const forms = useMemo(() => v29Forms(spec), [spec]);
  const accent = normalizeHex(spec?.accentColor);
  const appSlug = String(backendApp?.app_slug || "").trim();
  const isLive = Boolean(appSlug);

  const [activeFormId, setActiveFormId] = useState(forms?.[0]?.id || "");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (!forms.length) return;
    if (!forms.some((form) => String(form.id) === String(activeFormId))) {
      setActiveFormId(forms[0].id);
    }
  }, [forms, activeFormId]);

  const activeForm = useMemo(
    () =>
      forms.find((form) => String(form.id) === String(activeFormId)) ||
      forms[0] ||
      null,
    [forms, activeFormId]
  );

  const loadRecords = async () => {
    if (!isLive) {
      setRecords([]);
      return [];
    }
    setLoading(true);
    try {
      const response = await api.get(`/aiappbuilder/${appSlug}/records`);
      const next = Array.isArray(response?.data) ? response.data : [];
      setRecords(next);
      return next;
    } catch (error) {
      onNotice?.(
        error?.response?.data?.error || error.message || "Could not load records.",
        "error"
      );
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSlug]);

  useEffect(() => {
    setSearch("");
    setPage(0);
    setFormOpen(false);
    setViewOpen(false);
    setEditingId(null);
    setFormValues({});
    setFormErrors({});
  }, [activeFormId]);

  if (!activeForm) {
    return <LegacyGeneratedAppPreview spec={spec} backendApp={backendApp} backendSchema={backendSchema} onNotice={onNotice} applicationFullscreen={applicationFullscreen} onToggleApplicationFullscreen={onToggleApplicationFullscreen} />;
  }

  const fields = Array.isArray(activeForm.fields) ? activeForm.fields : [];
  const columns = Array.isArray(activeForm.listColumns) && activeForm.listColumns.length
    ? activeForm.listColumns.filter((column) => !/^actions?$/i.test(String(column?.key || column?.label || "")))
    : fields.slice(0, 6).map((field) => ({ key: field.name, label: field.label }));
  const entity = String(activeForm.entity || activeForm.id || "record");
  const entityRows = v29EntityRows(records, entity);

  const lookupDisplay = (field, rawValue) => {
    const lookupEntity = String(field?.lookupEntity || "").trim();
    if (!lookupEntity || rawValue === undefined || rawValue === null || rawValue === "") {
      return rawValue;
    }
    const valueField = String(field?.lookupValueField || "id").trim() || "id";
    const labelField = String(field?.lookupLabelField || "").trim();
    const parent = v29EntityRows(records, lookupEntity).find((row) => {
      const data = rowTransactionData(row);
      const candidate = valueField === "id" ? row?.id : data?.[valueField];
      return String(candidate ?? "") === String(rawValue ?? "");
    });
    if (!parent) return rawValue;
    const data = rowTransactionData(parent);
    return (
      (labelField && data?.[labelField]) ||
      data?.name ||
      data?.title ||
      data?.customer_name ||
      rawValue
    );
  };

  const rowDisplayValue = (row, column) => {
    const data = rowTransactionData(row);
    const field = fields.find((item) => normalized(item.name) === normalized(column.key));
    const value = data?.[column.key];
    if (field?.lookupEntity) return String(lookupDisplay(field, value) ?? "—");
    return value === undefined || value === null || value === "" ? "—" : String(value);
  };

  const filteredRows = entityRows.filter((row) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return columns.some((column) =>
      rowDisplayValue(row, column).toLowerCase().includes(query)
    );
  });

  const pagedRows = filteredRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const requiredLookupMissing = fields.some((field) =>
    Boolean(field.required) &&
    String(field.lookupEntity || "").trim() &&
    v29EntityRows(records, field.lookupEntity).length === 0
  );

  const handleFieldChange = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const resetForm = () => {
    setFormValues({});
    setFormErrors({});
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    fields.forEach((field) => {
      const value = formValues[field.name];
      if (field.required && !String(value ?? "").trim()) {
        errors[field.name] = `${field.label || field.name} is required`;
      }
    });
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      onNotice?.("Please complete the required fields.", "warning");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!isLive) {
      onNotice?.("Build Backend before saving real records.", "info");
      return;
    }

    const payload = { record_type: entity };
    fields.forEach((field) => {
      const value = formValues[field.name];
      if (value !== undefined && value !== null && value !== "") {
        payload[field.name] = value;
      }
    });

    setSaving(true);
    try {
      if (editingId) {
        await api.put(
          `/aiappbuilder/${appSlug}/records/${encodeURIComponent(editingId)}`,
          { transaction_data: payload }
        );
      } else {
        await api.post(`/aiappbuilder/${appSlug}/records`, {
          transaction_data: payload,
        });
      }
      setFormOpen(false);
      resetForm();
      await loadRecords();
      onNotice?.(
        editingId ? `${activeForm.tabLabel || activeForm.title} updated.` : `${activeForm.tabLabel || activeForm.title} created.`,
        "success"
      );
    } catch (error) {
      onNotice?.(
        error?.response?.data?.error || error.message || "Could not save record.",
        error?.response?.status === 409 ? "warning" : "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row) => {
    const data = rowTransactionData(row);
    const next = {};
    fields.forEach((field) => {
      if (data?.[field.name] !== undefined && data?.[field.name] !== null) {
        next[field.name] = data[field.name];
      }
    });
    setFormValues(next);
    setFormErrors({});
    setEditingId(row.id);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate?.id || !isLive) return;
    setDeleting(true);
    try {
      await api.delete(
        `/aiappbuilder/${appSlug}/records/${encodeURIComponent(deleteCandidate.id)}`
      );
      setDeleteCandidate(null);
      await loadRecords();
      onNotice?.("Record deleted successfully.", "success");
    } catch (error) {
      onNotice?.(
        error?.response?.data?.error || error.message || "Could not delete record.",
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  const dynamicKpi = (kpi) => {
    const structured = evaluateStructuredKpi({
      kpi,
      rows: records,
      defaultEntity: entity,
    });

    if (structured.handled) {
      return structured.value;
    }

    // Backward compatibility for V2.9 specifications that relied on labels.
    const label = String(kpi?.label || "").toLowerCase();
    const matchingForm = forms.find((form) =>
      label.includes(String(form?.entity || "").replace(/_/g, " ").toLowerCase()) ||
      label.includes(String(form?.tabLabel || "").toLowerCase().replace(/s$/, ""))
    );
    const baseRows = matchingForm
      ? v29EntityRows(records, matchingForm.entity)
      : entityRows;
    if (/total/.test(label)) return String(baseRows.length);

    const statusField = (matchingForm?.fields || fields).find((field) => /status/i.test(`${field.name} ${field.label}`));
    if (statusField) {
      const statusText = label.replace(/total|inquiries?|customers?|records?/g, "").trim();
      if (statusText) {
        const count = baseRows.filter((row) =>
          String(rowTransactionData(row)?.[statusField.name] || "").toLowerCase().includes(statusText)
        ).length;
        if (count || /new|open|closed|pending|progress|active|confirmed|won|lost/.test(statusText)) {
          return String(count);
        }
      }
    }
    return kpi.value;
  };

  const sections = Array.isArray(activeForm.sections) && activeForm.sections.length
    ? activeForm.sections
    : [{ title: activeForm.title, description: "", fields: fields.map((field) => field.name) }];

  return (
    <Box sx={{ height: "100%", overflow: "auto", bgcolor: "#f2f6fa" }}>
      <AppIdentityHeader
        spec={spec}
        isLive={isLive}
        applicationFullscreen={applicationFullscreen}
        onToggleApplicationFullscreen={onToggleApplicationFullscreen}
      />

      <Box sx={{ p: { xs: 1.5, md: 2.2 } }}>
        <Stack direction="row" spacing={0.8} sx={{ mb: 1.6, flexWrap: "wrap", gap: 0.8 }}>
          {forms.map((form) => {
            const selected = String(form.id) === String(activeFormId);
            return (
              <Button
                key={form.id}
                size="small"
                variant={selected ? "contained" : "outlined"}
                onClick={() => setActiveFormId(form.id)}
                sx={{
                  height: 32,
                  textTransform: "none",
                  borderRadius: "9px",
                  boxShadow: "none",
                  fontWeight: 800,
                  fontSize: 11.4,
                  ...(selected
                    ? { bgcolor: accent, "&:hover": { bgcolor: accent } }
                    : { bgcolor: "#fff", color: "#45627a", borderColor: "#cfdbe5" }),
                }}
              >
                {form.tabLabel || form.title || form.entity}
              </Button>
            );
          })}
        </Stack>

        {Array.isArray(spec.kpis) && spec.kpis.length ? (
          <Grid container spacing={1.4} sx={{ mb: 1.7 }}>
            {spec.kpis.map((kpi, index) => {
              const tone = getTone(kpi.tone);
              const Icon = getIcon(kpi.icon);
              return (
                <Grid item xs={12} sm={6} md={4} lg={spec.kpis.length === 4 ? 3 : 4} key={`${kpi.label}-${index}`}>
                  <Paper elevation={0} sx={{ p: 1.6, border: "1px solid #d8e3ec", borderRadius: "12px", bgcolor: "#fff" }}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box sx={{ width: 43, height: 43, borderRadius: "11px", display: "grid", placeItems: "center", bgcolor: tone.soft }}>
                        <Icon sx={{ color: tone.main, fontSize: 22 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 850, color: tone.dark, textTransform: "uppercase" }}>{kpi.label}</Typography>
                        <Typography sx={{ fontSize: 24, fontWeight: 850, color: "#173854", lineHeight: 1.08 }}>{isLive ? dynamicKpi(kpi) : kpi.value}</Typography>
                        {kpi.hint ? <Typography sx={{ fontSize: 10.3, color: "#7b8fa1" }}>{kpi.hint}</Typography> : null}
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        ) : null}

        {requiredLookupMissing ? (
          <Alert severity="info" sx={{ mb: 1.4 }}>
            {activeForm.tabLabel || activeForm.title} requires an existing related record. Create the required master record first.
          </Alert>
        ) : null}

        <Paper elevation={0} sx={{ border: "1px solid #d6e1ea", borderRadius: "12px", overflow: "hidden", bgcolor: "#fff" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" sx={{ px: 1.7, py: 1.35, borderBottom: "1px solid #dbe5ed" }}>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 850, color: "#183b58" }}>{activeForm.listTitle || activeForm.tabLabel || "Register"}</Typography>
              <Typography sx={{ fontSize: 10.6, color: "#7c90a2" }}>{entityRows.length} record{entityRows.length === 1 ? "" : "s"}</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(0); }}
                placeholder={activeForm.searchPlaceholder || "Search records..."}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
                sx={{ width: { xs: "100%", sm: 250 } }}
              />
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={openCreate}
                disabled={requiredLookupMissing}
                sx={{ textTransform: "none", boxShadow: "none", bgcolor: accent, whiteSpace: "nowrap", "&:hover": { bgcolor: accent } }}
              >
                {activeForm.createButtonText || `Create ${activeForm.tabLabel || "Record"}`}
              </Button>
            </Stack>
          </Stack>

          {loading ? <LinearProgress /> : null}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#103f63" }}>
                  {columns.map((column) => (
                    <TableCell key={column.key} sx={{ color: "#fff", fontSize: 10.5, fontWeight: 850, textTransform: "uppercase" }}>{column.label}</TableCell>
                  ))}
                  <TableCell align="right" sx={{ color: "#fff", fontSize: 10.5, fontWeight: 850, textTransform: "uppercase" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedRows.length ? pagedRows.map((row) => (
                  <TableRow key={row.id} hover>
                    {columns.map((column) => {
                      const value = rowDisplayValue(row, column);
                      return (
                        <TableCell key={column.key} sx={{ fontSize: 11.5, color: "#294760" }}>
                          {/status/i.test(String(column.key || column.label)) ? <StatusValue value={value} /> : value}
                        </TableCell>
                      );
                    })}
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.2} justifyContent="flex-end">
                        {(activeForm.actions || []).includes("view") ? <IconButton size="small" onClick={() => { setViewRow(row); setViewOpen(true); }}><VisibilityOutlinedIcon sx={{ fontSize: 18 }} /></IconButton> : null}
                        {(activeForm.actions || []).includes("edit") ? <IconButton size="small" onClick={() => openEdit(row)}><EditOutlinedIcon sx={{ fontSize: 18 }} /></IconButton> : null}
                        {(activeForm.actions || []).includes("delete") ? <IconButton size="small" onClick={() => setDeleteCandidate(row)}><DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} /></IconButton> : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 5, color: "#7d91a3", fontSize: 12 }}>
                      No {String(activeForm.tabLabel || entity).toLowerCase()} records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredRows.length}
            page={page}
            onPageChange={(_event, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </Paper>
      </Box>

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ bgcolor: "#0c679d", color: "#fff", py: 1.25 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: 16, fontWeight: 850 }}>{editingId ? `Edit ${activeForm.tabLabel || activeForm.title}` : activeForm.title}</Typography>
              {activeForm.description ? <Typography sx={{ fontSize: 10.8, opacity: 0.88 }}>{activeForm.description}</Typography> : null}
            </Box>
            <IconButton size="small" onClick={() => !saving && setFormOpen(false)} sx={{ color: "#fff" }}><CloseRoundedIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: "18px !important", bgcolor: "#fbfcfd" }}>
          <Stack spacing={1.4}>
            {sections.map((section, sectionIndex) => {
              const names = Array.isArray(section?.fields) ? section.fields : [];
              const sectionFields = fields.filter((field) => names.includes(field.name));
              if (!sectionFields.length) return null;
              return (
                <Paper key={`${section.title}-${sectionIndex}`} elevation={0} sx={{ border: "1px solid #d8e4ee", borderRadius: "12px", overflow: "hidden" }}>
                  <Box sx={{ px: 1.6, py: 1, bgcolor: "#f1f6fa", borderBottom: "1px solid #d8e4ee" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 850, color: "#174b72" }}>{section.title || "Details"}</Typography>
                    {section.description ? <Typography sx={{ fontSize: 10.4, color: "#768a9d" }}>{section.description}</Typography> : null}
                  </Box>
                  <Box sx={{ p: 1.6 }}>
                    <Grid container spacing={1.4}>
                      {sectionFields.map((field) => (
                        <Grid item xs={12} md={field.type === "textarea" ? 12 : 6} key={field.name}>
                          <V29FieldControl field={field} value={formValues[field.name]} onChange={handleFieldChange} records={records} disabled={saving} errorText={formErrors[field.name] || ""} />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.2, borderTop: "1px solid #e0e7ed" }}>
          <Button onClick={() => setFormOpen(false)} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || requiredLookupMissing} sx={{ textTransform: "none", minWidth: 120, boxShadow: "none", bgcolor: accent, "&:hover": { bgcolor: accent } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : activeForm.submitText || "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 850, color: "#183b58" }}>{activeForm.tabLabel || activeForm.title} Details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {fields.map((field) => {
              const raw = rowTransactionData(viewRow)?.[field.name];
              const value = field.lookupEntity ? lookupDisplay(field, raw) : raw;
              return (
                <Stack key={field.name} direction="row" spacing={1.5} justifyContent="space-between">
                  <Typography sx={{ fontSize: 11, color: "#7b8fa1" }}>{field.label}</Typography>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "#294760", textAlign: "right" }}>{String(value ?? "—")}</Typography>
                </Stack>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setViewOpen(false)} sx={{ textTransform: "none" }}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteCandidate)} onClose={() => !deleting && setDeleteCandidate(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 850 }}>Delete record?</DialogTitle>
        <DialogContent><Typography sx={{ fontSize: 12.5, color: "#5f7487" }}>This will remove the selected {String(activeForm.tabLabel || entity).toLowerCase()} record.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCandidate(null)} disabled={deleting} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting} sx={{ textTransform: "none", boxShadow: "none" }}>{deleting ? "Deleting..." : "Delete"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function GeneratedAppPreview(props) {
  if (isV29MultiEntitySpec(props?.spec)) {
    return <V29MultiEntityPreview {...props} />;
  }
  return <LegacyGeneratedAppPreview {...props} />;
}
