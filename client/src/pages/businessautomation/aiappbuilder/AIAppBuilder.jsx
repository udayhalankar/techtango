import CrudAppRenderer from "./renderers/CrudAppRenderer";
import ChartAppRenderer from "./renderers/ChartAppRenderer";
import DashboardAppRenderer from "./renderers/DashboardAppRenderer";
import BookingChartRenderer from "./renderers/BookingChartRenderer";
import CalendarAppRenderer from "./renderers/CalendarAppRenderer";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  MenuItem,
  Pagination,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";
import api from "../../../services/api";
import ReusableFormModal from "../../../components/ReusableFormModal";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 15, 20, 25];

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toTitle = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatTimeValue = (value) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{2}):(\d{2})/);
  if (!match) return String(value);
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = ((hours + 11) % 12) + 1;
  return `${String(normalizedHours).padStart(2, "0")}:${minutes} ${suffix}`;
};

const formatRecordCell = (field, value) => {
  if (value === null || value === undefined || value === "") return "";
  if (field?.name === "date_created" || field?.type === "date") {
    return formatDateValue(value);
  }
  if (field?.type === "time") {
    return formatTimeValue(value);
  }
  if (field?.type === "checkbox") {
    return value ? "Yes" : "No";
  }
  return String(value);
};

const DASHBOARD_SYSTEM_COLUMN_NAMES = new Set([
  "id",
  "transaction_data",
  "tenant_id",
  "created_by",
  "date_created",
  "modified_by",
  "date_modified",
  "is_active",
  "is_deleted",
  "deleted_by",
  "deleted_at",
  "version_no",
]);

const isNumericDataType = (dataType = "") =>
  [
    "smallint",
    "integer",
    "bigint",
    "decimal",
    "numeric",
    "real",
    "double precision",
    "money",
    "int2",
    "int4",
    "int8",
    "float4",
    "float8",
  ].includes(String(dataType).toLowerCase());

const isDateLikeDataType = (dataType = "") =>
  [
    "date",
    "timestamp without time zone",
    "timestamp with time zone",
    "time without time zone",
    "time with time zone",
    "timestamp",
    "timestamptz",
  ].includes(String(dataType).toLowerCase());

const normalizeDbColumns = (columns = []) =>
  columns
    .map((column) => ({
      name: String(column?.column_name || column?.name || "").trim(),
      dataType: String(column?.data_type || column?.udt_name || "").trim().toLowerCase(),
    }))
    .filter((column) => Boolean(column.name));

const getDashboardColumnsForTable = (tableName, dashboardColumnMap, selectedTables = []) => {
  const rawColumns = dashboardColumnMap?.[tableName] || [];
  const normalized = normalizeDbColumns(rawColumns);
  if (normalized.length) {
    return normalized;
  }

  const fallbackTables = Array.isArray(selectedTables) ? selectedTables : [];
  for (const fallbackTable of fallbackTables) {
    const fallbackColumns = normalizeDbColumns(dashboardColumnMap?.[fallbackTable] || []);
    if (fallbackColumns.length) {
      return fallbackColumns;
    }
  }

  return [
    { name: "id", dataType: "bigint" },
    { name: "date_created", dataType: "timestamp with time zone" },
    { name: "created_by", dataType: "bigint" },
  ];
};

const getDashboardColumnNames = (tableName, dashboardColumnMap, selectedTables = []) =>
  getDashboardColumnsForTable(tableName, dashboardColumnMap, selectedTables)
    .map((column) => column.name)
    .filter(Boolean);

const pickDashboardDefaultColumn = (columns, mode = "x") => {
  const safeColumns = Array.isArray(columns) ? columns.filter((column) => column?.name) : [];
  if (!safeColumns.length) return "";

  const visibleColumns = safeColumns.filter((column) => !DASHBOARD_SYSTEM_COLUMN_NAMES.has(column.name));
  const pool = visibleColumns.length ? visibleColumns : safeColumns;

  if (mode === "y" || mode === "value") {
    const preferred = [
      ...pool.filter((column) => isNumericDataType(column.dataType)),
      ...pool.filter((column) => isDateLikeDataType(column.dataType)),
      ...pool,
    ];
    return preferred[0]?.name || pool[0]?.name || safeColumns[0]?.name || "";
  }

  if (mode === "table") {
    return pool[0]?.name || safeColumns[0]?.name || "";
  }

  const preferred = [
    ...pool.filter((column) => isDateLikeDataType(column.dataType)),
    ...pool.filter((column) => !isNumericDataType(column.dataType) && !isDateLikeDataType(column.dataType)),
    ...pool.filter((column) => isNumericDataType(column.dataType)),
    ...pool,
  ];
  return preferred[0]?.name || pool[0]?.name || safeColumns[0]?.name || "";
};

const getDashboardDefaultColumnList = (columns, limit = 4) => {
  const safeColumns = Array.isArray(columns) ? columns.filter((column) => column?.name) : [];
  const visibleColumns = safeColumns.filter((column) => !DASHBOARD_SYSTEM_COLUMN_NAMES.has(column.name));
  const pool = visibleColumns.length ? visibleColumns : safeColumns;
  return pool.slice(0, Math.max(1, limit)).map((column) => column.name);
};

const defaultValueForField = (field) => {
  if (!field) return "";
  if (field.type === "checkbox") return Boolean(field.defaultValue);
  if (field.defaultValue !== undefined && field.defaultValue !== null) return field.defaultValue;
  return field.type === "number" ? "" : "";
};

const parseTimeToMinutes = (value) => {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const parsed = new Date(`${String(value).trim()}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const extractRuleFields = (schema, key) => {
  const raw = Array.isArray(schema?.[key]) ? schema[key] : [];
  return raw.filter((rule) => rule && typeof rule === "object");
};

const getRuleEndMinutes = (values, rule, slotMinutes = 30) => {
  const endField = String(rule?.endTimeField || "").trim();
  const durationField = String(rule?.durationField || "").trim();
  const startMinutes = parseTimeToMinutes(values?.[rule?.startTimeField]);
  if (startMinutes === null) return null;
  if (endField) {
    const explicitEnd = parseTimeToMinutes(values?.[endField]);
    if (explicitEnd !== null) return explicitEnd;
  }
  if (durationField) {
    const durationValue = Number(values?.[durationField]);
    if (!Number.isNaN(durationValue) && durationValue > 0) {
      return startMinutes + Math.round(durationValue * Number(rule?.slotMinutes || slotMinutes));
    }
  }
  return startMinutes + Number(rule?.slotMinutes || slotMinutes);
};

const normalizeRecord = (record) => ({
  id: record?.id ?? record?.transaction_id,
  date_created: record?.date_created,
  created_by: record?.created_by_name || record?.created_by,
  created_by_id: record?.created_by,
  date_modified: record?.date_modified,
  modified_by: record?.modified_by_name || record?.modified_by,
  modified_by_id: record?.modified_by,
  ...(record?.transaction_data || {}),
});

const buildInitialValues = (schema, source = null) =>
  (schema?.fields || []).reduce((acc, field) => {
    const existing = source?.transaction_data?.[field.name];
    acc[field.name] = existing !== undefined ? existing : defaultValueForField(field);
    return acc;
  }, {});

const validateRecord = (schema, values, existingRecords = [], currentId = null) => {
  const errors = {};
  (schema?.fields || []).forEach((field) => {
    const value = values?.[field.name];
    const textValue = String(value ?? "").trim();
    if (field.required && (textValue === "" || value === null || value === undefined)) {
      errors[field.name] = `${field.label || field.name} is required`;
      return;
    }
    const validation = field.validation || {};
    if (field.type === "email" && textValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textValue)) {
      errors[field.name] = "Enter a valid email address";
      return;
    }
    if (field.type === "tel" && textValue && !/^[0-9+\-()\s]{7,}$/.test(textValue)) {
      errors[field.name] = "Enter a valid phone number";
      return;
    }
    if (validation.minLength && textValue.length < Number(validation.minLength)) {
      errors[field.name] = `Minimum length is ${validation.minLength}`;
      return;
    }
    if (validation.maxLength && textValue.length > Number(validation.maxLength)) {
      errors[field.name] = `Maximum length is ${validation.maxLength}`;
      return;
    }
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern, validation.flags || "");
      if (textValue && !regex.test(textValue)) {
        errors[field.name] = validation.message || `${field.label || field.name} is invalid`;
        return;
      }
    }
    if ((field.type === "select" || field.type === "radio") && Array.isArray(field.options) && field.options.length && textValue) {
      const allowed = field.options.map((option) => String(option));
      if (!allowed.includes(String(value))) {
        errors[field.name] = `${field.label || field.name} must be one of the allowed values`;
        return;
      }
    }
    if (field.type === "number" && textValue !== "") {
      const numberValue = Number(textValue);
      if (Number.isNaN(numberValue)) {
        errors[field.name] = "Enter a valid number";
        return;
      }
      if (validation.min !== undefined && numberValue < Number(validation.min)) {
        errors[field.name] = `Minimum value is ${validation.min}`;
        return;
      }
      if (validation.max !== undefined && numberValue > Number(validation.max)) {
        errors[field.name] = `Maximum value is ${validation.max}`;
      }
    }
  });

  const datePastFields = (schema?.fields || []).filter((field) => {
    const validation = field.validation || {};
    return Boolean(validation.dateNotPast || validation.type === "date_not_past");
  });
  datePastFields.forEach((field) => {
    const parsed = parseDateOnly(values?.[field.name]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed && parsed < today) {
      errors[field.name] = field.validation?.message || `${field.label || field.name} cannot be in the past`;
    }
  });

  const timeOrderFields = (schema?.fields || []).filter((field) => {
    const validation = field.validation || {};
    return Boolean(validation.greaterThan || validation.type === "greater_than");
  });
  timeOrderFields.forEach((field) => {
    const compareWith = String(field.validation?.compareWith || "").trim();
    if (!compareWith) return;
    const startMinutes = parseTimeToMinutes(values?.[compareWith]);
    const endMinutes = parseTimeToMinutes(values?.[field.name]);
    if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
      errors[field.name] = field.validation?.message || `${field.label || field.name} must be after ${compareWith}`;
    }
  });

  const uniqueRules = extractRuleFields(schema, "uniqueRules");
  uniqueRules.forEach((rule) => {
    const fields = Array.isArray(rule.fields) ? rule.fields.filter(Boolean) : [];
    if (!fields.length || fields.some((field) => values?.[field] === undefined || values?.[field] === "" || values?.[field] === null)) {
      return;
    }
    const conflict = existingRecords.find((record) => {
      if (currentId !== null && currentId !== undefined && String(record.id) === String(currentId)) {
        return false;
      }
      return fields.every((field) => String(record?.[field] ?? "") === String(values?.[field] ?? ""));
    });
    if (conflict) {
      const primaryField = fields[0];
      errors[primaryField] = rule.message || "Duplicate record is not allowed";
    }
  });

  const overlapRules = extractRuleFields(schema, "overlapRules");
  overlapRules.forEach((rule) => {
    const resourceField = String(rule.resourceField || "").trim();
    const dateField = String(rule.dateField || "").trim();
    const startTimeField = String(rule.startTimeField || "").trim();
    if (!resourceField || !dateField || !startTimeField) return;
    const resourceValue = String(values?.[resourceField] ?? "").trim();
    const dateValue = String(values?.[dateField] ?? "").trim();
    const startMinutes = parseTimeToMinutes(values?.[startTimeField]);
    if (!resourceValue || !dateValue || startMinutes === null) return;
    const endMinutes = getRuleEndMinutes(values, rule, 30);
    if (endMinutes === null) return;
    const conflict = existingRecords.find((record) => {
      if (currentId !== null && currentId !== undefined && String(record.id) === String(currentId)) {
        return false;
      }
      if (String(record?.[resourceField] ?? "").trim() !== resourceValue) return false;
      if (String(record?.[dateField] ?? "").trim() !== dateValue) return false;
      const otherStart = parseTimeToMinutes(record?.[startTimeField]);
      if (otherStart === null) return false;
      const otherEnd = getRuleEndMinutes(record, rule, 30);
      if (otherEnd === null) return false;
      return startMinutes < otherEnd && endMinutes > otherStart;
    });
    if (conflict) {
      errors[startTimeField] = rule.message || "Time slot conflict detected";
    }
  });

  return errors;
};

const FieldControl = ({ field, value, error, onChange }) => {
  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      minHeight: 36,
      borderRadius: 1.5,
      bgcolor: "#ffffff",
      "& fieldset": {
        borderColor: "#cbd5e1",
      },
      "&:hover fieldset": {
        borderColor: "#9fb7dd",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#2563eb",
        borderWidth: 1,
      },
    },
    "& .MuiInputLabel-root": {
      color: "#334155",
      fontSize: 11,
      fontWeight: 600,
    },
    "& .MuiFormHelperText-root": {
      marginLeft: 0,
      marginTop: 0.75,
      fontSize: 11,
      color: "#64748b",
    },
  };
  const commonProps = {
    fullWidth: true,
    size: "small",
    label: field.label || field.name,
    error: Boolean(error),
    helperText: error || field.placeholder || "",
    value: value ?? "",
    onChange: (event) => onChange(field.name, field.type === "number" ? event.target.value : event.target.value),
    sx: fieldSx,
  };
  const pickerProps = field.type === "date" || field.type === "time"
    ? {
        InputLabelProps: { shrink: true },
        inputProps: field.type === "time" ? { step: 300 } : undefined,
      }
    : {};

  if (field.type === "select") {
    return (
      <TextField select {...commonProps}>
        {(field.options || []).map((option) => (
          <MenuItem key={`${field.name}-${option}`} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === "radio") {
    return (
      <FormControl error={Boolean(error)} sx={{ width: "100%" }}>
        <FormLabel sx={{ fontSize: 13 }}>{field.label || field.name}</FormLabel>
        <RadioGroup row value={value ?? ""} onChange={(event) => onChange(field.name, event.target.value)}>
          {(field.options || []).map((option) => (
            <FormControlLabel key={`${field.name}-${option}`} value={option} control={<Radio size="small" />} label={option} />
          ))}
        </RadioGroup>
        <FormHelperText>{error || ""}</FormHelperText>
      </FormControl>
    );
  }

  if (field.type === "checkbox") {
    return (
      <FormControlLabel
        control={<Switch checked={Boolean(value)} onChange={(event) => onChange(field.name, event.target.checked)} />}
        label={field.label || field.name}
        sx={{
          alignItems: "flex-start",
          "& .MuiFormControlLabel-label": {
            fontSize: 13,
            color: "#334155",
            fontWeight: 600,
          },
        }}
      />
    );
  }

//   const renderSelectedApplication = () => {
//   const mode = String(schema?.appMode || "crud").toLowerCase();

//   const commonProps = {
//     selectedApp,
//     schema,
//     records,
//     loading,
//     search,
//     setSearch,
//     notify,
//     reload: () => loadSelectedApp(selectedApp.app_slug),
//   };

//   if (mode === "chart" || mode === "report") {
//     return <ChartAppRenderer {...commonProps} />;
//   }

//   if (mode === "dashboard") {
//     return <DashboardAppRenderer {...commonProps} />;
//   }

//   if (mode === "booking_chart") {
//     return <BookingChartRenderer {...commonProps} />;
//   }

//   if (mode === "calendar") {
//     return <CalendarAppRenderer {...commonProps} />;
//   }

//   return (
//     <CrudAppRenderer
//       {...commonProps}
//       onSaveRecord={handleSaveRecord}
//       onDeleteRecord={handleDeleteRecord}
//     />
//   );
// };

  return (
    <TextField
      {...commonProps}
      {...pickerProps}
      type={field.type === "number" ? "number" : field.type === "date" || field.type === "time" ? field.type : field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
      multiline={field.type === "textarea"}
      minRows={field.type === "textarea" ? 3 : undefined}
    />
  );
};

const RecordDialog = ({ open, schema, record, existingRecords, onClose, onSave }) => {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setValues(buildInitialValues(schema, record));
      setErrors({});
    }
  }, [open, schema, record]);

  const handleChange = (name, nextValue) => {
    setValues((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSave = () => {
    const nextErrors = validateRecord(schema, values, existingRecords, record?.id);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const payload = (schema?.fields || []).reduce((acc, field) => {
      const rawValue = values[field.name];
      if (field.type === "number" && rawValue !== "") {
        acc[field.name] = Number(rawValue);
      } else if (field.type === "checkbox") {
        acc[field.name] = Boolean(rawValue);
      } else {
        acc[field.name] = rawValue ?? "";
      }
      return acc;
    }, {});
    onSave?.(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: 980,
          borderRadius: "18px",
          overflow: "hidden",
          bgcolor: "#ffffff",
          border: "3px solid #f97316",
          //boxShadow: "0 28px 80px rgba(15, 23, 42, 0.28)",
          // border: "3px solid #1e3a5f",
          // outline: "1px solid rgba(15, 47, 87, 0.08)",        
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            px: 4,
            py: 3.25,
            bgcolor: "#f4f8fe",
            background: "linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%)",
            borderBottom: "1px solid #dbeafe",
          }}
        >
          <Typography sx={{ fontSize: 26, fontWeight: 700, color: "#0f2f57" }}>
            {record ? "Edit" : "Create"} {schema?.title || schema?.appName || "Application"}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 14, color: "#64748b" }}>
            {schema?.description || "Fill in the details and save the record."}
          </Typography>
        </Box>

        <Box sx={{ px: 4, py: 3.75 }}>
          <Stack gap={3}>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#2563eb", mb: 2.5 }}>
                {schema?.title || schema?.appName || "Application"} Record
              </Typography>
              <Grid container spacing={3}>
                {(schema?.fields || []).map((field) => (
                  <Grid item xs={12} md={field.type === "textarea" ? 12 : 6} key={field.name}>
                    <FieldControl
                      field={field}
                      value={values[field.name]}
                      error={errors[field.name]}
                      onChange={handleChange}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          px: 4,
          py: 2.25,
          borderTop: "1px solid #e2e8f0",
          bgcolor: "#f8fafc",
        }}
      >
        <Button variant="outlined" onClick={onClose} sx={{ minWidth: 96, borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            minWidth: 132,
            borderRadius: 2,
            bgcolor: "#2563eb",
            boxShadow: "0 10px 22px rgba(37, 99, 235, 0.25)",
            "&:hover": { bgcolor: "#1d4ed8" },
          }}
        >
          Save Record
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const FIELD_TYPE_OPTIONS = [
  "text",
  "number",
  "date",
  "time",
  "textarea",
  "select",
  "checkbox",
  "radio",
  "email",
  "tel",
];

const VALIDATION_TYPE_OPTIONS = [
  "Required",
  "Unique Field",
  "Unique Combination",
  "Prevent Time Overlap",
  "Date Cannot Be Past",
  "End Date Greater Than Start Date",
  "End Time Greater Than Start Time",
  "Number Min / Max",
  "Text Min / Max Length",
  "Email Format",
  "Phone Format",
  "Regex Pattern",
  "Allowed File Types",
  "Maximum File Size",
  "Conditional Required Field",
  "Show / Hide Field",
  "Load Dropdown Options",
  "Read Only / Auto Generated Field",
  "Default Value",
  "Backend Only Validation",
];

const CONDITION_OPTIONS = [
  "is not empty",
  "equals",
  "not equals",
  "greater than",
  "less than",
];

const ACTION_OPTIONS = [
  "Show field",
  "Hide field",
  "Make required",
  "Load options from API",
  "Disable field",
];

const RUN_AT_OPTIONS = [
  "Frontend and Backend",
  "Frontend Only",
  "Backend Only",
];

const createDefaultField = (index = 1) => ({
  id: `field_${index}`,
  label: `Field ${index}`,
  name: `field_${index}`,
  type: "text",
  options: "",
  defaultValue: "",
  helperText: "",
  required: true,
  showInTable: true,
  searchable: true,
  readOnly: false,
  uniqueValue: false,
});

const createDefaultValidationRule = () => ({
  id: `rule_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  type: "Required",
  fields: "",
  runAt: "Frontend and Backend",
  errorMessage: "",
  resourceField: "",
  dateField: "",
  startTimeField: "",
  durationField: "",
  slotMinutes: "",
  compareField: "",
  targetField: "",
});



const builderStateToSpec = (state) => {
  const fields = (state.fields || []).map((field) => {
    const options = String(field.options || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const validation = {};
    if (field.type === "number") {
      const min = Number(field.minValue);
      const max = Number(field.maxValue);
      if (!Number.isNaN(min)) validation.min = min;
      if (!Number.isNaN(max)) validation.max = max;
    }
    if (field.type === "text" || field.type === "textarea") {
      const minLength = Number(field.minLength);
      const maxLength = Number(field.maxLength);
      if (!Number.isNaN(minLength)) validation.minLength = minLength;
      if (!Number.isNaN(maxLength)) validation.maxLength = maxLength;
    }
    if (field.pattern) {
      validation.pattern = field.pattern;
    }

    return {
      label: field.label,
      name: field.name,
      type: field.type,
      required: Boolean(field.required),
      showInTable: Boolean(field.showInTable),
      searchable: Boolean(field.searchable),
      readOnly: Boolean(field.readOnly),
      uniqueValue: Boolean(field.uniqueValue),
      defaultValue: field.defaultValue,
      placeholder: field.helperText,
      helperText: field.helperText,
      options,
      validation,
    };
  });

  const validations = [];
  const uniqueRules = [];
  const overlapRules = [];

  (state.validationRules || []).forEach((rule) => {
    const type = String(rule.type || "").trim();
    if (!type) return;
    const fieldsUsed = String(rule.fields || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (type === "Unique Combination") {
      uniqueRules.push({
        name: `unique_${fieldsUsed.join("_") || "rule"}`,
        fields: fieldsUsed,
        message: rule.errorMessage || "Duplicate record is not allowed",
      });
      return;
    }
    if (type === "Prevent Time Overlap") {
      overlapRules.push({
        name: `overlap_${rule.resourceField || "resource"}`,
        resourceField: rule.resourceField || "room_name",
        dateField: rule.dateField || "booking_date",
        startTimeField: rule.startTimeField || "start_time",
        endTimeField: rule.endTimeField || "",
        durationField: rule.durationField || "duration_slots",
        slotMinutes: Number(rule.slotMinutes) || 30,
        message: rule.errorMessage || "Time slot conflict detected",
      });
      return;
    }

    const validation = {
      type: type.toLowerCase().replace(/\s+/g, "_"),
      field: fieldsUsed[0] || rule.targetField || "",
      compareWith: rule.compareField || "",
      fields: fieldsUsed,
      message: rule.errorMessage || "",
    };

    if (type === "Date Cannot Be Past") {
      validation.type = "date_not_past";
    }
    if (type === "End Date Greater Than Start Date") {
      validation.type = "greater_than";
      validation.compareWith = rule.compareField || "start_date";
    }
    if (type === "End Time Greater Than Start Time") {
      validation.type = "greater_than";
      validation.compareWith = rule.compareField || "start_time";
    }
    if (type === "Number Min / Max") {
      validation.min = Number(rule.minValue);
      validation.max = Number(rule.maxValue);
    }
    if (type === "Text Min / Max Length") {
      validation.minLength = Number(rule.minLength);
      validation.maxLength = Number(rule.maxLength);
    }
    if (type === "Regex Pattern") {
      validation.pattern = rule.pattern || "";
      validation.flags = rule.patternFlags || "";
    }
    if (type === "Conditional Required Field") {
      validation.type = "conditional_required";
      validation.dependsOn = rule.dependsOn || "";
      validation.value = rule.conditionValue || "";
    }
    if (type === "Show / Hide Field") {
      validation.type = "visibility";
      validation.dependsOn = rule.dependsOn || "";
      validation.value = rule.conditionValue || "";
      validation.showWhen = rule.showWhen || "";
    }
    if (type === "Load Dropdown Options") {
      validation.type = "load_options";
      validation.dependsOn = rule.dependsOn || "";
    }
    if (type === "Read Only / Auto Generated Field") {
      validation.type = "read_only";
    }
    if (type === "Default Value") {
      validation.type = "default_value";
      validation.value = rule.defaultValue || "";
    }
    if (type === "Backend Only Validation") {
      validation.type = "backend_only";
    }

    validations.push(validation);
  });

  const dependencies = (state.dependencies || []).map((dep) => ({
    field: dep.targetField || "",
    dependsOn: dep.dependsOn || "",
    value: dep.conditionValue ?? null,
    showWhen: `${dep.condition || "is not empty"} => ${dep.action || "Show field"}`,
  })).filter((dep) => dep.field && dep.dependsOn);

  return {
    appName: state.appName.trim(),
    title: state.appName.trim(),
    description: state.requirement.trim(),
    tableColumns: String(state.tableColumns || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    fields,
    validations,
    uniqueRules,
    overlapRules,
    dependencies,
    ui: {
      defaultSortField: state.defaultSortField || "",
      defaultSortDirection: state.defaultSortDirection || "Descending",
    },
  };
};



const createDefaultDependencyRule = () => ({
  id: `dep_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  targetField: "",
  dependsOn: "",
  condition: "is not empty",
  action: "Show field",
});


 const compactTextFieldSx = {
  "& .MuiInputBase-root": {
    minHeight: 36,
    fontSize: 13,
    borderRadius: 1.5,
  },
  "& .MuiInputBase-input": {
    padding: "8px 10px",
    fontSize: 13,
  },
  "& .MuiSelect-select": {
    padding: "8px 10px",
    fontSize: 13,
  },
  "& .MuiInputLabel-root": {
    fontSize: 12,
  },
  "& .MuiFormHelperText-root": {
    fontSize: 11,
    marginTop: "3px",
  },
};

const CompactTextField = ({ SelectProps, ...props }) => (
  <TextField
    fullWidth
    size="small"
    sx={compactTextFieldSx}
    SelectProps={{
      ...SelectProps,
      MenuProps: {
        hideBackdrop: true,
        ...SelectProps?.MenuProps,
      },
    }}
    {...props}
  />
);




const createDefaultDashboardCard = () => ({
  id: `card_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  title: "Total Records",
  table: "",
  metric: "count",
  field: "",
  filterField: "",
  filterValue: "",
  color: "#2563eb",
  icon: "numbers",
  size: "small",
});

const createDefaultDashboardChart = () => ({
  id: `chart_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  title: "New Chart",
  table: "",
  chartType: "bar",
  xField: "",
  yField: "",
  aggregate: "count",
  groupBy: "",
  size: "medium",
});

const createDefaultDashboardTable = () => ({
  id: `table_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  title: "Recent Records",
  table: "",
  columns: "",
  sortBy: "",
  limit: 10,
  enableSearch: true,
  enableExport: true,
});

const createDefaultTextBlock = () => ({
  id: `text_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  title: "Information",
  content: "Add dashboard note here.",
  size: "full",
});







const CreateApplicationDialog = ({ open, onClose, onCreate }) => {
  const [appName, setAppName] = useState("");
  const [tableName, setTableName] = useState("");
  const [sourceTable, setSourceTable] = useState("");
  const [sourceTables, setSourceTables] = useState([]);
  const [requirement, setRequirement] = useState("");
  const [defaultSortField, setDefaultSortField] = useState("");
  const [tableColumns, setTableColumns] = useState("");
  const [appType, setAppType] = useState("auto");
  const [fields, setFields] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [validationRules, setValidationRules] = useState([]);
  const [dashboardTables, setDashboardTables] = useState([]);
  const [dashboardCards, setDashboardCards] = useState([createDefaultDashboardCard()]);
  const [dashboardCharts, setDashboardCharts] = useState([createDefaultDashboardChart()]);
  const [dashboardTablesConfig, setDashboardTablesConfig] = useState([]);
  const [dashboardTextBlocks, setDashboardTextBlocks] = useState([]);
  const [dashboardColumnMap, setDashboardColumnMap] = useState({});
  const [defaultSortDirection, setDefaultSortDirection] = useState("Descending");
  
  const [error, setError] = useState("");
  // const isBookingApp = /meeting|room|booking|schedule/i.test(`${appName} ${requirement}`);
  const isBookingApp = appType === "booking";
  const isDataViewApp = ["chart", "dashboard", "report", "booking_chart", "calendar"].includes(appType);
  const isDashboardApp = appType === "dashboard";
  

useEffect(() => {
  if (!open) return;

  setError("");

  setFields([
    createDefaultField(1),
    {
      ...createDefaultField(2),
      label: "Description",
      name: "description",
      type: "textarea",
      showInTable: true,
    },
  ]);

  api.get("/aiappbuilder/source-tables")
    .then((res) => {
      setSourceTables(Array.isArray(res.data) ? res.data : []);
    })
    .catch(() => {
      setSourceTables([]);
    });

  setDependencies([]);
  setValidationRules([]);
}, [open]);

  useEffect(() => {
    if (!open || appType !== "dashboard") return;

    const selectedTables = dashboardTables.filter(Boolean);
    if (!selectedTables.length) {
      setDashboardColumnMap({});
      return;
    }

    let cancelled = false;

    Promise.all(
      selectedTables.map(async (tableName) => {
        try {
          const res = await api.get(`/db/columns/${encodeURIComponent(tableName)}`);
          return [tableName, normalizeDbColumns(res.data?.columns || [])];
        } catch {
          return [tableName, []];
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      const nextMap = Object.fromEntries(entries);
      setDashboardColumnMap(nextMap);
    });

    return () => {
      cancelled = true;
    };
  }, [open, appType, dashboardTables]);

  useEffect(() => {
    if (!open || appType !== "dashboard") return;

    const defaultTable = dashboardTables[0] || "";

    setDashboardCards((prev) => {
      let changed = false;
      const next = prev.map((card) => {
        const resolvedTable = card.table || defaultTable;
        const columns = getDashboardColumnsForTable(resolvedTable, dashboardColumnMap, dashboardTables);
        const nextCard = { ...card };
        if (!nextCard.table && resolvedTable) {
          nextCard.table = resolvedTable;
          changed = true;
        }
        const defaultField = pickDashboardDefaultColumn(columns, "value");
        if (!nextCard.field && defaultField) {
          nextCard.field = defaultField;
          changed = true;
        }
        return nextCard;
      });
      return changed ? next : prev;
    });

    setDashboardCharts((prev) => {
      let changed = false;
      const next = prev.map((chart) => {
        const resolvedTable = chart.table || defaultTable;
        const columns = getDashboardColumnsForTable(resolvedTable, dashboardColumnMap, dashboardTables);
        const nextChart = { ...chart };
        if (!nextChart.table && resolvedTable) {
          nextChart.table = resolvedTable;
          changed = true;
        }
        const defaultXField = pickDashboardDefaultColumn(columns, "x");
        if (!nextChart.xField && defaultXField) {
          nextChart.xField = defaultXField;
          changed = true;
        }
        const defaultYField = pickDashboardDefaultColumn(columns, "value");
        if (!nextChart.yField && defaultYField) {
          nextChart.yField = defaultYField;
          changed = true;
        }
        return nextChart;
      });
      return changed ? next : prev;
    });

    setDashboardTablesConfig((prev) => {
      let changed = false;
      const next = prev.map((tableWidget) => {
        const resolvedTable = tableWidget.table || defaultTable;
        const columns = getDashboardColumnsForTable(resolvedTable, dashboardColumnMap, dashboardTables);
        const nextTableWidget = { ...tableWidget };
        if (!nextTableWidget.table && resolvedTable) {
          nextTableWidget.table = resolvedTable;
          changed = true;
        }
        if (!String(nextTableWidget.columns || "").trim()) {
          const defaultColumns = getDashboardDefaultColumnList(columns, 4);
          if (defaultColumns.length) {
            nextTableWidget.columns = defaultColumns.join(", ");
            changed = true;
          }
        }
        return nextTableWidget;
      });
      return changed ? next : prev;
    });
  }, [open, appType, dashboardTables, dashboardColumnMap, dashboardCards, dashboardCharts, dashboardTablesConfig]);

  const updateField = (index, key, value) => {
    setFields((prev) => prev.map((field, idx) => (idx === index ? { ...field, [key]: value } : field)));
  };

  const updateDependency = (index, key, value) => {
    setDependencies((prev) => prev.map((dep, idx) => (idx === index ? { ...dep, [key]: value } : dep)));
  };

  const updateValidationRule = (index, key, value) => {
    setValidationRules((prev) => prev.map((rule, idx) => (idx === index ? { ...rule, [key]: value } : rule)));
  };

  const updateDashboardCard = (index, key, value) => {
    setDashboardCards((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const nextItem = { ...item, [key]: value };
        if (key === "table") {
          const columns = getDashboardColumnsForTable(value, dashboardColumnMap, dashboardTables);
          if (!String(nextItem.field || "").trim()) {
            nextItem.field = pickDashboardDefaultColumn(columns, "value");
          }
        }
        return nextItem;
      })
    );
  };

  const updateDashboardChart = (index, key, value) => {
    setDashboardCharts((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const nextItem = { ...item, [key]: value };
        if (key === "table") {
          const columns = getDashboardColumnsForTable(value, dashboardColumnMap, dashboardTables);
          if (!String(nextItem.xField || "").trim()) {
            nextItem.xField = pickDashboardDefaultColumn(columns, "x");
          }
          if (!String(nextItem.yField || "").trim()) {
            nextItem.yField = pickDashboardDefaultColumn(columns, "value");
          }
        }
        return nextItem;
      })
    );
  };

  const updateDashboardTable = (index, key, value) => {
    setDashboardTablesConfig((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const nextItem = { ...item, [key]: value };
        if (key === "table" && !String(nextItem.columns || "").trim()) {
          const columns = getDashboardColumnsForTable(value, dashboardColumnMap, dashboardTables);
          const defaultColumns = getDashboardDefaultColumnList(columns, 4);
          if (defaultColumns.length) {
            nextItem.columns = defaultColumns.join(", ");
          }
        }
        return nextItem;
      })
    );
  };

const updateDashboardTextBlock = (index, key, value) => {
  setDashboardTextBlocks((prev) =>
    prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
  );
};

const isBlank = (value) => String(value ?? "").trim() === "";

const validateDashboardBuilder = (cards, charts, tablesConfig, tables) => {
  if (!tables.length) {
    return "Select at least one source table for the dashboard.";
  }

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    const metric = String(card.metric || "count").toLowerCase();
    if (isBlank(card.title)) {
      return `KPI card ${index + 1}: Card Title is required.`;
    }
    if (isBlank(card.table)) {
      return `KPI card ${index + 1}: Table is required.`;
    }
    if (isBlank(card.metric)) {
      return `KPI card ${index + 1}: Metric is required.`;
    }
    if (metric !== "count" && isBlank(card.field)) {
      return `KPI card ${index + 1}: Value Field is required for ${metric} metrics.`;
    }
  }

  for (let index = 0; index < charts.length; index += 1) {
    const chart = charts[index];
    const aggregate = String(chart.aggregate || "count").toLowerCase();
    if (isBlank(chart.title)) {
      return `Chart ${index + 1}: Chart Title is required.`;
    }
    if (isBlank(chart.table)) {
      return `Chart ${index + 1}: Table is required.`;
    }
    if (isBlank(chart.chartType)) {
      return `Chart ${index + 1}: Chart Type is required.`;
    }
    if (isBlank(chart.xField)) {
      return `Chart ${index + 1}: X Field is required.`;
    }
    if (aggregate !== "count" && isBlank(chart.yField)) {
      return `Chart ${index + 1}: Y Field is required for ${aggregate} aggregate charts.`;
    }
  }

  for (let index = 0; index < tablesConfig.length; index += 1) {
    const table = tablesConfig[index];
    if (isBlank(table.title)) {
      return `Table widget ${index + 1}: Widget Title is required.`;
    }
    if (isBlank(table.table)) {
      return `Table widget ${index + 1}: Table is required.`;
    }
    const columns = String(table.columns || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!columns.length) {
      return `Table widget ${index + 1}: Columns are required.`;
    }
  }

  return "";
};

  const handleGenerate = () => {
    const trimmedName = appName.trim();
    if (!trimmedName) {
      setError("Application name is required");
      return;
    }
    if (isDataViewApp && appType !== "dashboard" && !sourceTable.trim()) {
          setError("Source table is required for chart, report, calendar and booking chart apps.");
    return;
  }

    const resolvedDashboardTables = (dashboardTables.length ? dashboardTables : [sourceTable.trim()])
      .map((table) => String(table || "").trim())
      .filter(Boolean);
    const primaryDashboardTable = resolvedDashboardTables[0] || "";
    const normalizeDashboardTableColumns = (tableName) =>
      getDashboardColumnsForTable(tableName, dashboardColumnMap, resolvedDashboardTables);

    const normalizedDashboardCards = appType === "dashboard"
      ? dashboardCards
          .map((card, index) => {
            const table = String(card.table || primaryDashboardTable || "").trim();
            const columns = normalizeDashboardTableColumns(table);
            const metric = String(card.metric || "count").toLowerCase();
            const defaultValueField = pickDashboardDefaultColumn(columns, "value");
            return {
              ...card,
              title: String(card.title || `KPI Card ${index + 1}`).trim(),
              table,
              metric,
              field: metric === "count" ? String(card.field || defaultValueField || "").trim() : String(card.field || defaultValueField || "").trim(),
            };
          })
          .filter((card) => card.title && card.table && card.metric && (String(card.metric).toLowerCase() === "count" || card.field))
      : [];

    const normalizedDashboardCharts = appType === "dashboard"
      ? dashboardCharts
          .map((chart, index) => {
            const table = String(chart.table || primaryDashboardTable || "").trim();
            const columns = normalizeDashboardTableColumns(table);
            const aggregate = String(chart.aggregate || "count").toLowerCase();
            const defaultXField = pickDashboardDefaultColumn(columns, "x");
            const defaultYField = pickDashboardDefaultColumn(columns, "value");
            const resolvedXField = String(chart.xField || defaultXField || "").trim();
            const resolvedYField = String(chart.yField || defaultYField || resolvedXField).trim();
            const resolvedGroupBy = String(chart.groupBy || resolvedXField || "").trim();
            return {
              ...chart,
              title: String(chart.title || `Chart ${index + 1}`).trim(),
              table,
              chartType: String(chart.chartType || "bar").trim(),
              xField: resolvedXField,
              yField: resolvedYField,
              aggregate,
              groupBy: resolvedGroupBy,
            };
          })
          .filter((chart) => chart.title && chart.table && chart.chartType && chart.xField && chart.yField)
      : [];

    const normalizedDashboardTablesConfig = appType === "dashboard"
      ? dashboardTablesConfig
          .map((tableWidget, index) => {
            const table = String(tableWidget.table || primaryDashboardTable || "").trim();
            const columns = normalizeDashboardTableColumns(table);
            const defaultColumns = getDashboardDefaultColumnList(columns, 4);
            const resolvedColumns = String(tableWidget.columns || defaultColumns.join(", ")).trim();
            return {
              ...tableWidget,
              title: String(tableWidget.title || `Table Widget ${index + 1}`).trim(),
              table,
              columns: resolvedColumns || defaultColumns.join(", "),
            };
          })
          .filter((tableWidget) => tableWidget.title && tableWidget.table && String(tableWidget.columns || "").trim())
      : [];

    if (appType === "dashboard") {
      const dashboardError = validateDashboardBuilder(
        normalizedDashboardCards,
        normalizedDashboardCharts,
        normalizedDashboardTablesConfig,
        resolvedDashboardTables
      );
      if (dashboardError) {
        setError(dashboardError);
        return;
      }
    }

    const dashboardConfig =
  appType === "dashboard"
    ? {
        sourceTables: resolvedDashboardTables,

        cards: normalizedDashboardCards
          .map(({ id, ...item }) => item)
          .filter((card) => card.table && card.title && card.metric),

        charts: normalizedDashboardCharts.map(({ id, ...item }) => item),

        tables: normalizedDashboardTablesConfig
          .map(({ id, columns, ...item }) => ({
            ...item,
            columns: String(columns || "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          })),

        textBlocks: dashboardTextBlocks
          .map(({ id, ...item }) => item)
          .filter((block) => block.title || block.content),
      }
    : null;

        onCreate?.({
          appName: trimmedName,
          requirement: requirement.trim(),
          appType,
          sourceTable: sourceTable.trim(),
          builderSpec: dashboardConfig
            ? {
                appName: trimmedName,
                title: trimmedName,
                description: requirement.trim(),
                appMode: "dashboard",
                sourceTable: dashboardTables[0] || sourceTable.trim(),
                dashboardConfig,
                fields: [],
                validations: [],
                uniqueRules: [],
                overlapRules: [],
                dependencies: [],
                tableColumns: [],
                ui: {},
              }
            : null,
        });
          };

 

  return (
    <ReusableFormModal
      open={open}
      onClose={onClose}
      icon="🤝"
      title="Create a New Application"
      subtitle="Define fields, table display, dependencies and validation rules before AI generates the CRUD schema."
    >
      <Box
        className="rfm-form"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
          pr: 0.5,
          "&::-webkit-scrollbar": {
            width: 8,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#c7d3e4",
            borderRadius: 999,
          },
        }}
      >
        <Stack gap={2}>
              <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 3, p: 1.5, bgcolor: "#fbfdff" }}>
                <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#0f2f57", mb: 1.5 }}>
                  Application Details
                </Typography>

                <Grid container spacing={1.25}>
                <Grid item xs={12} md={isDataViewApp ? 3 : 4}>
                        <CompactTextField
                          select
                          label="Application Type"
                          value={appType}
                          onChange={(event) => setAppType(event.target.value)}
                        >
                          <MenuItem value="auto">Auto Detect</MenuItem>
                          <MenuItem value="crud">CRUD / Form App</MenuItem>
                          <MenuItem value="chart">Chart / Report</MenuItem>
                          <MenuItem value="dashboard">Dashboard</MenuItem>
                          <MenuItem value="booking_chart">Booking Chart / Slot View</MenuItem>
                          <MenuItem value="calendar">Calendar View</MenuItem>
                          <MenuItem value="inventory">Inventory</MenuItem>
                          <MenuItem value="workflow">Workflow / Approval</MenuItem>
                          <MenuItem value="checklist">Checklist / Inspection</MenuItem>
                        </CompactTextField>
                      </Grid>

                      {isDataViewApp && appType !== "dashboard" ? (
                        <Grid item xs={12} md={3}>
                          <CompactTextField
                            select
                            label="Source Table *"
                            value={sourceTable}
                            onChange={(event) => setSourceTable(event.target.value)}
                            helperText="Select a cust_* table"
                          >
                            {sourceTables.map((table) => (
                              <MenuItem key={table} value={table}>
                                {table}
                              </MenuItem>
                            ))}
                          </CompactTextField>
                        </Grid>
                      ) : null}
                  

                  <Grid item xs={12} md={isDataViewApp ? 3 : 4}>
                    <CompactTextField
                      label="Application Name *"
                      value={appName}
                      onChange={(event) => setAppName(event.target.value)}
                      helperText="Used for title and app slug."
                    />
                  </Grid>

                  <Grid item xs={12} md={isDataViewApp ? 3 : 4}>
                    <CompactTextField
                      label="Table Name"
                      value={tableName}
                      onChange={(event) => setTableName(event.target.value)}
                      helperText="Backend sanitizes and prefixes with cust_."
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <CompactTextField
                      label="Application Requirement *"
                      value={requirement}
                      onChange={(event) => setRequirement(event.target.value)}
                      multiline
                      minRows={3}
                      helperText="Natural language requirement for AI context."
                    />
                  </Grid>
                </Grid>
              </Box>


              {isDashboardApp ? (
  <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 3, p: 1.5, bgcolor: "#fbfdff" }}>
    <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#0f2f57", mb: 1.5 }}>
      Dashboard Builder
    </Typography>

    <Stack gap={2}>
      <CompactTextField
        select
        label="Source Tables *"
        required
        value={dashboardTables}
        onChange={(event) => {
          const value = event.target.value;
          setDashboardTables(typeof value === "string" ? value.split(",") : value);
        }}
        SelectProps={{ multiple: true }}
        helperText="Select one or more cust_* tables for this dashboard."
      >
        {sourceTables.map((table) => (
          <MenuItem key={table} value={table}>
            {table}
          </MenuItem>
        ))}
      </CompactTextField>

      <Divider />

      <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#0f2f57" }}>
        KPI / Status Cards
      </Typography>

      {dashboardCards.map((card, index) => (
        <Box key={card.id} sx={{ p: 1.5, border: "1px solid #dbeafe", borderRadius: 2.5, bgcolor: "#fff" }}>
          {(() => {
            const valueFieldOptions = getDashboardColumnNames(card.table, dashboardColumnMap, dashboardTables);
            return (
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={3}>
              <CompactTextField required label="Card Title *" value={card.title} onChange={(e) => updateDashboardCard(index, "title", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <CompactTextField required select label="Table *" value={card.table} onChange={(e) => updateDashboardCard(index, "table", e.target.value)}>
                {dashboardTables.map((table) => <MenuItem key={table} value={table}>{table}</MenuItem>)}
              </CompactTextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <CompactTextField required select label="Metric *" value={card.metric} onChange={(e) => updateDashboardCard(index, "metric", e.target.value)}>
                {["count", "sum", "average", "min", "max"].map((m) => <MenuItem key={m} value={m}>{toTitle(m)}</MenuItem>)}
              </CompactTextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <CompactTextField
                required
                select
                label="Value Field *"
                value={card.field}
                onChange={(e) => updateDashboardCard(index, "field", e.target.value)}
                helperText={valueFieldOptions.length ? "Select a column for the KPI value." : "Loading columns..."}
              >
                {valueFieldOptions.map((column) => (
                  <MenuItem key={`${card.table || "value"}-${column}`} value={column}>
                    {toTitle(column)}
                  </MenuItem>
                ))}
              </CompactTextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <CompactTextField label="Filter Value" value={card.filterValue} onChange={(e) => updateDashboardCard(index, "filterValue", e.target.value)} />
            </Grid>
          </Grid>
            );
          })()}
        </Box>
      ))}

      <Button variant="outlined" size="small" onClick={() => setDashboardCards((prev) => [...prev, createDefaultDashboardCard()])}>
        + Add KPI Card
      </Button>

      <Divider />

      <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#0f2f57" }}>
        Charts
      </Typography>

      {dashboardCharts.map((chart, index) => (
        <Box key={chart.id} sx={{ p: 1.5, border: "1px solid #dbeafe", borderRadius: 2.5, bgcolor: "#fff" }}>
          {(() => {
            const chartColumnNames = getDashboardColumnNames(chart.table, dashboardColumnMap, dashboardTables);
            return (
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={3}>
              <CompactTextField required label="Chart Title *" value={chart.title} onChange={(e) => updateDashboardChart(index, "title", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <CompactTextField required select label="Table *" value={chart.table} onChange={(e) => updateDashboardChart(index, "table", e.target.value)}>
                {dashboardTables.map((table) => <MenuItem key={table} value={table}>{table}</MenuItem>)}
              </CompactTextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <CompactTextField required select label="Chart Type *" value={chart.chartType} onChange={(e) => updateDashboardChart(index, "chartType", e.target.value)}>
                {["bar", "line", "pie", "donut", "area"].map((type) => <MenuItem key={type} value={type}>{toTitle(type)}</MenuItem>)}
              </CompactTextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <CompactTextField required select label="X Field *" value={chart.xField} onChange={(e) => updateDashboardChart(index, "xField", e.target.value)} helperText={chartColumnNames.length ? "Select the category or date column." : "Loading columns..."}>
                {chartColumnNames.map((column) => (
                  <MenuItem key={`${chart.table || "x"}-${column}`} value={column}>
                    {toTitle(column)}
                  </MenuItem>
                ))}
              </CompactTextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <CompactTextField
                required
                select
                label="Y Field *"
                value={chart.yField}
                onChange={(e) => updateDashboardChart(index, "yField", e.target.value)}
                helperText={chartColumnNames.length ? "Select the metric column." : "Loading columns..."}
              >
                {chartColumnNames.map((column) => (
                  <MenuItem key={`${chart.table || "y"}-${column}`} value={column}>
                    {toTitle(column)}
                  </MenuItem>
                ))}
              </CompactTextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <CompactTextField required select label="Aggregate *" value={chart.aggregate} onChange={(e) => updateDashboardChart(index, "aggregate", e.target.value)}>
                {["count", "sum", "average"].map((a) => <MenuItem key={a} value={a}>{toTitle(a)}</MenuItem>)}
              </CompactTextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <CompactTextField label="Group By" value={chart.groupBy} onChange={(e) => updateDashboardChart(index, "groupBy", e.target.value)} />
            </Grid>
          </Grid>
            );
          })()}
        </Box>
      ))}

      <Button variant="outlined" size="small" onClick={() => setDashboardCharts((prev) => [...prev, createDefaultDashboardChart()])}>
        + Add Chart
      </Button>

      <Divider />

      <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#0f2f57" }}>
        Tables
      </Typography>

      {dashboardTablesConfig.map((table, index) => (
        <Box key={table.id} sx={{ p: 1.5, border: "1px solid #dbeafe", borderRadius: 2.5, bgcolor: "#fff" }}>
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={3}>
              <CompactTextField required label="Widget Title *" value={table.title} onChange={(e) => updateDashboardTable(index, "title", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <CompactTextField required select label="Table *" value={table.table} onChange={(e) => updateDashboardTable(index, "table", e.target.value)}>
                {dashboardTables.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </CompactTextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <CompactTextField required label="Columns *" value={table.columns} onChange={(e) => updateDashboardTable(index, "columns", e.target.value)} helperText="Comma separated fields" />
            </Grid>
            <Grid item xs={12} md={2}>
              <CompactTextField label="Limit" value={table.limit} onChange={(e) => updateDashboardTable(index, "limit", e.target.value)} />
            </Grid>
          </Grid>
        </Box>
      ))}

      <Button variant="outlined" size="small" onClick={() => setDashboardTablesConfig((prev) => [...prev, createDefaultDashboardTable()])}>
        + Add Table Widget
      </Button>

      <Divider />

      <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#0f2f57" }}>
        Text Blocks
      </Typography>

      {dashboardTextBlocks.map((block, index) => (
        <Box key={block.id} sx={{ p: 1.5, border: "1px solid #dbeafe", borderRadius: 2.5, bgcolor: "#fff" }}>
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={4}>
              <CompactTextField label="Title" value={block.title} onChange={(e) => updateDashboardTextBlock(index, "title", e.target.value)} />
            </Grid>
            <Grid item xs={12} md={8}>
              <CompactTextField label="Content" value={block.content} onChange={(e) => updateDashboardTextBlock(index, "content", e.target.value)} multiline minRows={2} />
            </Grid>
          </Grid>
        </Box>
      ))}

      <Button variant="outlined" size="small" onClick={() => setDashboardTextBlocks((prev) => [...prev, createDefaultTextBlock()])}>
        + Add Text Block
      </Button>
    </Stack>
  </Box>
) : null}



{!isDataViewApp && (
  <>
              <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 3, p: 1.5, bgcolor: "#fbfdff" }}>
                  <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#0f2f57", mb: 1.5 }}>
                    Fields
                  </Typography>

                  <Stack gap={1.5}>
                    {fields.map((field, index) => (
                      <Box
                        key={field.id || `${field.name}-${index}`}
                        sx={{
                          border: "1px solid #dbeafe",
                          borderRadius: 2.5,
                          p: 1.5,
                          bgcolor: "#ffffff",
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.25 }}>
                          <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0f2f57" }}>
                            Field {index + 1}
                          </Typography>
                          <Chip
                            size="small"
                            label={field.label || "Field"}
                            sx={{
                              height: 22,
                              bgcolor: "#eef5ff",
                              color: "#2563eb",
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          />
                        </Box>

                        <Grid container spacing={1.25}>
                          <Grid item xs={12} md={4}>
                            <CompactTextField
                              label="Field Label *"
                              value={field.label}
                              onChange={(event) => updateField(index, "label", event.target.value)}
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <CompactTextField
                              label="Field Name *"
                              value={field.name}
                              onChange={(event) => updateField(index, "name", slugify(event.target.value))}
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <CompactTextField
                              select
                              label="Field Type *"
                              value={field.type}
                              onChange={(event) => updateField(index, "type", event.target.value)}
                            >
                              {FIELD_TYPE_OPTIONS.map((option) => (
                                <MenuItem key={option} value={option}>
                                  {toTitle(option)}
                                </MenuItem>
                              ))}
                            </CompactTextField>
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <CompactTextField
                              label="Options"
                              value={field.options}
                              onChange={(event) => updateField(index, "options", event.target.value)}
                              helperText="For select, radio or checkbox group."
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <CompactTextField
                              label="Default Value"
                              value={field.defaultValue}
                              onChange={(event) => updateField(index, "defaultValue", event.target.value)}
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <CompactTextField
                              label="Helper Text"
                              value={field.helperText}
                              onChange={(event) => updateField(index, "helperText", event.target.value)}
                            />
                          </Grid>

                          <Grid item xs={12} md={2.4}>
                            <CompactTextField
                              label="Min Value"
                              value={field.minValue || ""}
                              onChange={(event) => updateField(index, "minValue", event.target.value)}
                            />
                          </Grid>

                          <Grid item xs={12} md={2.4}>
                            <CompactTextField
                              label="Max Value"
                              value={field.maxValue || ""}
                              onChange={(event) => updateField(index, "maxValue", event.target.value)}
                            />
                          </Grid>

                          <Grid item xs={12} md={2.4}>
                            <CompactTextField
                              label="Min Length"
                              value={field.minLength || ""}
                              onChange={(event) => updateField(index, "minLength", event.target.value)}
                            />
                          </Grid>

                          <Grid item xs={12} md={2.4}>
                            <CompactTextField
                              label="Max Length"
                              value={field.maxLength || ""}
                              onChange={(event) => updateField(index, "maxLength", event.target.value)}
                            />
                          </Grid>

                          <Grid item xs={12} md={2.4}>
                            <CompactTextField
                              label="Pattern"
                              value={field.pattern || ""}
                              onChange={(event) => updateField(index, "pattern", event.target.value)}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}>
                              <FormControlLabel
                                control={<Switch size="small" checked={Boolean(field.required)} onChange={(event) => updateField(index, "required", event.target.checked)} />}
                                label="Required"
                                sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }}
                              />

                              <FormControlLabel
                                control={<Switch size="small" checked={Boolean(field.showInTable)} onChange={(event) => updateField(index, "showInTable", event.target.checked)} />}
                                label="Show in Table"
                                sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }}
                              />

                              <FormControlLabel
                                control={<Switch size="small" checked={Boolean(field.searchable)} onChange={(event) => updateField(index, "searchable", event.target.checked)} />}
                                label="Searchable"
                                sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }}
                              />

                              <FormControlLabel
                                control={<Switch size="small" checked={Boolean(field.readOnly)} onChange={(event) => updateField(index, "readOnly", event.target.checked)} />}
                                label="Read Only"
                                sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }}
                              />

                              <FormControlLabel
                                control={<Switch size="small" checked={Boolean(field.uniqueValue)} onChange={(event) => updateField(index, "uniqueValue", event.target.checked)} />}
                                label="Unique Value"
                                sx={{ "& .MuiFormControlLabel-label": { fontSize: 13 } }}
                              />
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}

                    <Button
                      variant="outlined"
                      size="small"
                      // onClick={() => setFields((prev) => [...prev, createDefaultField(prev.length + 1, isBookingApp)])}
                      onClick={() => setFields((prev) => [...prev, createDefaultField(prev.length + 1)])}
                      sx={{ alignSelf: "flex-start", borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                    >
                      + Add Field
                    </Button>
                  </Stack>
                </Box>

              <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 3, p: 1.5, bgcolor: "#fbfdff" }}>
                <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#0f2f57", mb: 1.5 }}>
                  Field Dependencies
                </Typography>

                <Stack gap={1.5}>
                  {dependencies.map((dep, index) => (
                    <Grid container spacing={1.25} key={dep.id}>
                      <Grid item xs={12} md={3}>
                        <CompactTextField
                          select
                          label="Target Field"
                          value={dep.targetField}
                          onChange={(event) => updateDependency(index, "targetField", event.target.value)}
                        >
                          {fields.map((field) => (
                            <MenuItem key={field.name} value={field.name}>{field.label}</MenuItem>
                          ))}
                        </CompactTextField>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <CompactTextField
                          select
                          label="Depends On"
                          value={dep.dependsOn}
                          onChange={(event) => updateDependency(index, "dependsOn", event.target.value)}
                        >
                          {fields.map((field) => (
                            <MenuItem key={field.name} value={field.name}>{field.label}</MenuItem>
                          ))}
                        </CompactTextField>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <CompactTextField
                          select
                          label="Condition"
                          value={dep.condition}
                          onChange={(event) => updateDependency(index, "condition", event.target.value)}
                        >
                          {CONDITION_OPTIONS.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </CompactTextField>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <CompactTextField
                          select
                          label="Action"
                          value={dep.action}
                          onChange={(event) => updateDependency(index, "action", event.target.value)}
                        >
                          {ACTION_OPTIONS.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </CompactTextField>
                      </Grid>
                    </Grid>
                  ))}

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setDependencies((prev) => [...prev, createDefaultDependencyRule()])}
                    sx={{ alignSelf: "flex-start", borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                  >
                    + Add Dependency Rule
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 3, p: 1.5, bgcolor: "#fbfdff" }}>
                  <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#0f2f57", mb: 1.5 }}>
                    Validation Rules
                  </Typography>

                  <Stack gap={1.5}>
                    {validationRules.map((rule, index) => (
                      <Box key={rule.id} sx={{ border: "1px solid #dbeafe", borderRadius: 2.5, p: 1.5, bgcolor: "#ffffff" }}>
                        <Grid container spacing={1.25}>
                          <Grid item xs={12} md={4}>
                            <CompactTextField
                              select
                              label="Validation Type"
                              value={rule.type}
                              onChange={(event) => updateValidationRule(index, "type", event.target.value)}
                            >
                              {VALIDATION_TYPE_OPTIONS.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                              ))}
                            </CompactTextField>
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <CompactTextField
                              label="Fields Used"
                              value={rule.fields || ""}
                              onChange={(event) => updateValidationRule(index, "fields", event.target.value)}
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <CompactTextField
                              select
                              label="Run At"
                              value={rule.runAt}
                              onChange={(event) => updateValidationRule(index, "runAt", event.target.value)}
                            >
                              {RUN_AT_OPTIONS.map((option) => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                              ))}
                            </CompactTextField>
                          </Grid>

                          {rule.type === "Prevent Time Overlap" ? (
                            <>
                              <Grid item xs={12} md={2.4}>
                                <CompactTextField label="Resource Field" value={rule.resourceField || ""} onChange={(event) => updateValidationRule(index, "resourceField", event.target.value)} />
                              </Grid>
                              <Grid item xs={12} md={2.4}>
                                <CompactTextField label="Date Field" value={rule.dateField || ""} onChange={(event) => updateValidationRule(index, "dateField", event.target.value)} />
                              </Grid>
                              <Grid item xs={12} md={2.4}>
                                <CompactTextField label="Start Time Field" value={rule.startTimeField || ""} onChange={(event) => updateValidationRule(index, "startTimeField", event.target.value)} />
                              </Grid>
                              <Grid item xs={12} md={2.4}>
                                <CompactTextField label="Duration Field" value={rule.durationField || ""} onChange={(event) => updateValidationRule(index, "durationField", event.target.value)} />
                              </Grid>
                              <Grid item xs={12} md={2.4}>
                                <CompactTextField label="Slot Minutes" value={rule.slotMinutes || ""} onChange={(event) => updateValidationRule(index, "slotMinutes", event.target.value)} />
                              </Grid>
                            </>
                          ) : null}

                          <Grid item xs={12}>
                            <CompactTextField
                              label="Error Message"
                              value={rule.errorMessage || ""}
                              onChange={(event) => updateValidationRule(index, "errorMessage", event.target.value)}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    ))}

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setValidationRules((prev) => [...prev, createDefaultValidationRule()])}
                      sx={{ alignSelf: "flex-start", borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                    >
                      + Add Validation Rule
                    </Button>
                  </Stack>
                </Box>

  </>
)}

{!isDashboardApp ? (
              <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 3, p: 1.5, bgcolor: "#fbfdff" }}>
                <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#0f2f57", mb: 1.5 }}>
                  Table Settings
                </Typography>

                <Grid container spacing={1.25}>
                  <Grid item xs={12} md={6}>
                    <CompactTextField
                      label="Default Sort Field"
                      value={defaultSortField}
                      onChange={(event) => setDefaultSortField(event.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <CompactTextField
                      select
                      label="Default Sort Direction"
                      value={defaultSortDirection}
                      onChange={(event) => setDefaultSortDirection(event.target.value)}
                    >
                      {["Descending", "Ascending"].map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </CompactTextField>
                  </Grid>

                  <Grid item xs={12}>
                    <CompactTextField
                      label="Table Columns"
                      value={tableColumns}
                      onChange={(event) => setTableColumns(event.target.value)}
                      helperText="Only selected fields will appear in the main list."
                    />
                  </Grid>
                </Grid>
              </Box>
              ) : null}
            </Stack>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
              flexWrap: "wrap",
            }}
            className="rfm-actions"
          >
            <Button
              variant="outlined"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleGenerate()}
            >
              Preview Schema
            </Button>

            <Button
              variant="contained"
              onClick={handleGenerate}
            >
              Generate Application
            </Button>
          </Box>
          {error ? (
            <Box>
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : null}
      </Box>
    </ReusableFormModal>
  );


};

const SchemaReviewDialog = ({ open, onClose, appName, schema, requirement, onSave }) => {
  const [schemaText, setSchemaText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSchemaText(JSON.stringify(schema || {}, null, 2));
      setError("");
    }
  }, [open, schema]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(schemaText || "{}");
      setError("");
      onSave?.(parsed);
    } catch (err) {
      setError("Schema JSON is invalid. Fix the JSON before creating the application.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Review AI Generated Schema</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 0.5 }}>
          <Typography sx={{ color: "#5f6f8a", fontSize: 13 }}>
            Review and edit the generated schema before the application and database table are created.
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              bgcolor: "#fbfcff",
              borderColor: "#d8dde7",
            }}
          >
            <Stack gap={0.5}>
              <Typography sx={{ fontWeight: 800, color: "#16233b" }}>{appName || "Application"}</Typography>
              <Typography sx={{ fontSize: 13, color: "#5f6f8a" }}>
                {requirement || "No requirement text provided."}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>
                Fields: {(schema?.fields || []).length} | Table: {schema?.tableName || "cust_app"}
              </Typography>
            </Stack>
          </Paper>
          <TextField
            label="Schema JSON"
            value={schemaText}
            onChange={(event) => setSchemaText(event.target.value)}
            multiline
            minRows={22}
            fullWidth
            error={Boolean(error)}
            helperText={error || "Edit the JSON schema if needed, then create the application."}
            sx={{ fontFamily: "monospace" }}
            InputProps={{
              sx: {
                fontFamily: "monospace",
                alignItems: "flex-start",
              },
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Back
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Create Application
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function AIAppBuilder() {
  const { id: routeAppId } = useParams();
  const { pathname } = useLocation();
  const isPublishedRoute = Boolean(routeAppId);
  const hideDashboardWidgetActions = String(pathname || "").startsWith("/aidashboardapp/");
  const [applications, setApplications] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [schema, setSchema] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [appSearch, setAppSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pendingApplication, setPendingApplication] = useState(null);
  const [schemaReviewOpen, setSchemaReviewOpen] = useState(false);
  const [notice, setNotice] = useState({ open: false, severity: "success", message: "" });
  const [dashboardSaveToken, setDashboardSaveToken] = useState(0);
  const [appDrawerOpen, setAppDrawerOpen] = useState(false);
  
  const notify = (severity, message) => setNotice({ open: true, severity, message });

  const loadApplications = async (preferredSlug = "") => {
    const res = await api.get("/aiappbuilder");
    const list = Array.isArray(res.data) ? res.data : [];
    setApplications(list);
    const nextSlug = preferredSlug || selectedSlug || (routeAppId ? "" : list[0]?.app_slug || "");
    if (nextSlug && nextSlug !== selectedSlug) {
      setSelectedSlug(nextSlug);
    }
    return list;
  };

  const loadSelectedApp = async (appSlug) => {
    if (!appSlug) return;
    setLoading(true);
    try {
      const [schemaRes, recordsRes] = await Promise.all([
        api.get(`/aiappbuilder/${encodeURIComponent(appSlug)}/schema`),
        api.get(`/aiappbuilder/${encodeURIComponent(appSlug)}/records`),
      ]);
      const loadedSchema = schemaRes.data?.schema || null;
      const loadedApp = schemaRes.data?.app || null;
      const loadedRecords = recordsRes.data;
      setSchema(loadedSchema);
      setSelectedApp(loadedApp);
      setRecords(
        String(loadedSchema?.appMode || "crud").toLowerCase() === "dashboard"
          ? (loadedRecords && typeof loadedRecords === "object" && !Array.isArray(loadedRecords) ? loadedRecords : {})
          : (Array.isArray(loadedRecords) ? loadedRecords : [])
      );
      setPage(1);
      setSearch("");
    } catch (error) {
      notify("error", error?.response?.data?.error || error?.message || "Failed to load application.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications().catch((error) => {
      notify("error", error?.response?.data?.error || error?.message || "Failed to load applications.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!routeAppId || !applications.length) return;
    const match = applications.find((app) => String(app.id) === String(routeAppId));
    if (match?.app_slug && match.app_slug !== selectedSlug) {
      setSelectedSlug(match.app_slug);
    }
  }, [applications, routeAppId, selectedSlug]);

  useEffect(() => {
    if (selectedSlug) {
      loadSelectedApp(selectedSlug);
    } else {
      setSchema(null);
      setSelectedApp(null);
      setRecords([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  const filteredApplications = useMemo(() => {
    const term = appSearch.trim().toLowerCase();
    if (!term) return applications;
    return applications.filter((app) =>
      [app.app_name, app.app_slug, app.table_name, app.requirement]
        .some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [applications, appSearch]);

  const recentApplications = useMemo(
    () => filteredApplications.slice(0, 2),
    [filteredApplications]
  );

  const normalizedRecords = useMemo(() => (
    Array.isArray(records) ? records.map(normalizeRecord) : []
  ), [records]);
  const tableFields = useMemo(() => schema?.fields || [], [schema]);
  const auditColumns = useMemo(
    () => [
      { name: "date_created", label: "Date Created", type: "date" },
      { name: "created_by", label: "Created By", type: "text" },
    ],
    []
  );
  const tableColumns = useMemo(() => {
    const schemaColumns = Array.isArray(schema?.tableColumns) && schema.tableColumns.length
      ? schema.tableColumns
      : tableFields.filter((field) => field.showInTable !== false).map((field) => field.name);
    const baseColumns = schemaColumns.length ? schemaColumns : tableFields.map((field) => field.name);
    return Array.from(new Set([...baseColumns, ...auditColumns.map((field) => field.name)]));
  }, [schema, tableFields, auditColumns]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return normalizedRecords;
    return normalizedRecords.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [normalizedRecords, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const pageRecords = filteredRecords.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const handleCreateApplication = async ({ appName, requirement, appType, sourceTable, builderSpec }) => {
    setLoading(true);
    try {
      const generated = await api.post("/aiappbuilder/generate", {
              appName,
              requirement,
              appType,
              sourceTable,
              builderSpec,
            });
      setPendingApplication({
        appName,
        requirement,
        appType,
        builderSpec,
        schema: generated.data?.schema || {},
      });
      setCreateOpen(false);
      setSchemaReviewOpen(true);
    } catch (error) {
      notify("error", error?.response?.data?.error || error?.message || "Failed to create application.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSchema = async (schemaDraft) => {
    if (!pendingApplication) return;
    setLoading(true);
    try {
      const payload = {
        appName: pendingApplication.appName,
        requirement: pendingApplication.requirement,
        schema: schemaDraft,
      };
      const created = await api.post("/aiappbuilder", payload);
      notify("success", "Application created.");
      setSchemaReviewOpen(false);
      setPendingApplication(null);
      const list = await loadApplications(created.data?.app_slug || slugify(pendingApplication.appName));
      if (!list.some((app) => app.app_slug === created.data?.app_slug)) {
        setSelectedSlug(created.data?.app_slug || slugify(pendingApplication.appName));
      }
    } catch (error) {
      notify("error", error?.response?.data?.error || error?.message || "Failed to create application.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecord = async (values) => {
    if (!selectedApp?.app_slug) return;
    setLoading(true);
    try {
      if (editingRecord?.id) {
        await api.put(
          `/aiappbuilder/${encodeURIComponent(selectedApp.app_slug)}/records/${editingRecord.id}`,
          { transaction_data: values }
        );
      } else {
        await api.post(`/aiappbuilder/${encodeURIComponent(selectedApp.app_slug)}/records`, {
          transaction_data: values,
        });
      }
      setRecordDialogOpen(false);
      setEditingRecord(null);
      notify("success", "Record saved.");
      await loadSelectedApp(selectedApp.app_slug);
    } catch (error) {
      notify("error", error?.response?.data?.error || error?.message || "Failed to save record.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (record) => {
    if (!selectedApp?.app_slug || !record?.id) return;
    if (!window.confirm("Delete this record?")) return;
    setLoading(true);
    try {
      await api.delete(
        `/aiappbuilder/${encodeURIComponent(selectedApp.app_slug)}/records/${record.id}`
      );
      notify("success", "Record deleted.");
      await loadSelectedApp(selectedApp.app_slug);
    } catch (error) {
      notify("error", error?.response?.data?.error || error?.message || "Failed to delete record.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishApplication = async (app) => {
    if (!app?.app_slug) return;
    if (!window.confirm(`Publish ${app.app_name || app.app_slug}?`)) return;
    setLoading(true);
    try {
      await api.patch(`/aiappbuilder/${encodeURIComponent(app.app_slug)}/publish`);
      notify("success", "Application published.");
      await loadApplications(app.app_slug);
      if (selectedApp?.app_slug === app.app_slug) {
        await loadSelectedApp(app.app_slug);
      }
    } catch (error) {
      notify("error", error?.response?.data?.error || error?.message || "Failed to publish application.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApplication = async (app) => {
    if (!app?.app_slug) return;
    if (!window.confirm(`Delete ${app.app_name || app.app_slug}? This will remove the application and its table.`)) return;

    setLoading(true);
    try {
      await api.delete(`/aiappbuilder/${encodeURIComponent(app.app_slug)}`);
      notify("success", "Application deleted.");

      const res = await api.get("/aiappbuilder");
      const list = Array.isArray(res.data) ? res.data : [];
      setApplications(list);

      if (selectedSlug === app.app_slug) {
        const nextSlug = list[0]?.app_slug || "";
        setSelectedSlug(nextSlug);
        if (!nextSlug) {
          setSelectedApp(null);
          setSchema(null);
          setRecords([]);
        }
      }
    } catch (error) {
      notify("error", error?.response?.data?.error || error?.message || "Failed to delete application.");
    } finally {
      setLoading(false);
    }
  };

  // const handleSaveApplicationChanges = async (app) => {
  //   if (!app?.app_slug) return;
  //   if (String(app?.schema_json?.appMode || "").toLowerCase() !== "dashboard") {
  //     notify("error", "Save Changes is only available for dashboard applications.");
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     const currentSchema = selectedApp?.app_slug === app.app_slug && schema
  //       ? schema
  //       : app.schema_json || {};

  //     const res = await api.patch(`/aiappbuilder/${encodeURIComponent(app.app_slug)}/schema`, {
  //       schema: currentSchema,
  //     });

  //     notify("success", "Application changes saved.");
  //     await loadApplications(app.app_slug);
  //     if (selectedApp?.app_slug === app.app_slug) {
  //       setSchema(res.data?.schema_json || currentSchema);
  //       await loadSelectedApp(app.app_slug);
  //     }
  //   } catch (error) {
  //     notify("error", error?.response?.data?.error || error?.message || "Failed to save application changes.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSaveApplicationChanges = async (app) => {
  if (!app?.app_slug) return;

  if (String(app?.schema_json?.appMode || "").toLowerCase() !== "dashboard") {
    notify("error", "Save Changes is only available for dashboard applications.");
    return;
  }

  if (selectedApp?.app_slug !== app.app_slug) {
    notify("error", "Open the dashboard first, then save changes.");
    return;
  }

  setDashboardSaveToken((prev) => prev + 1);
};

  const openNewRecord = () => {
    setEditingRecord(null);
    setRecordDialogOpen(true);
  };

  const openEditRecord = (record) => {
    setEditingRecord(record);
    setRecordDialogOpen(true);
  };

  const renderSelectedApplication = () => {
  const mode = String(schema?.appMode || "crud").toLowerCase();

  const commonProps = {
    selectedApp,
    schema,
    records,
    loading,
    search,
    setSearch,
    notify,
    reload: () => loadSelectedApp(selectedApp.app_slug),
  };

  if (mode === "chart" || mode === "report") {
    return <ChartAppRenderer {...commonProps} />;
  }

  // if (mode === "dashboard") {
  //   return <DashboardAppRenderer {...commonProps} />;
  // }

  return (
  <DashboardAppRenderer
    {...commonProps}
    saveRequestToken={dashboardSaveToken}
    disableWidgetEditing={hideDashboardWidgetActions}
  />
);

  if (mode === "booking_chart") {
    return <BookingChartRenderer {...commonProps} />;
  }

  if (mode === "calendar") {
    return <CalendarAppRenderer {...commonProps} />;
  }

  return (
    <CrudAppRenderer
      {...commonProps}
      onSaveRecord={handleSaveRecord}
      onDeleteRecord={handleDeleteRecord}
    />
  );
};

  if (isPublishedRoute) {
    return selectedApp && schema ? renderSelectedApplication() : <Typography sx={{ p: 2 }}>Loading application...</Typography>;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#edf3fb",
        background:
          "linear-gradient(180deg, #f4f8fd 0%, #edf3fb 100%)",
      }}
    >
      <Drawer
        anchor="left"
        open={appDrawerOpen}
        onClose={() => setAppDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: 370,
            maxWidth: "92vw",
            boxShadow: "20px 0 50px rgba(15,35,60,.18)",
            bgcolor: "#fff",
          },
        }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              px: 2.25,
              py: 2.25,
              borderBottom: "1px solid #dfe6ef",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box>
              <Typography sx={{ m: 0, color: "#15385f", fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>
                Applications
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 12, color: "#8190a2" }}>
                {filteredApplications.length} available
              </Typography>
            </Box>
            <IconButton
              onClick={() => setAppDrawerOpen(false)}
              sx={{ width: 38, height: 38, border: "1px solid #dfe6ef", bgcolor: "#fff" }}
            >
              <ChevronLeftRoundedIcon />
            </IconButton>
          </Box>

          <Box sx={{ p: 1.9, overflow: "auto", flex: 1 }}>
            <TextField
              size="small"
              fullWidth
              value={appSearch}
              onChange={(event) => setAppSearch(event.target.value)}
              placeholder="Search applications..."
              InputProps={{
                startAdornment: <SearchIcon sx={{ fontSize: 18, color: "#7b8aa1", mr: 1 }} />,
              }}
              sx={{
                mb: 1.5,
                "& .MuiOutlinedInput-root": {
                  height: 42,
                  borderRadius: 2.5,
                  bgcolor: "#fff",
                },
              }}
            />

            {recentApplications.length ? (
              <>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#92a0b2", textTransform: "uppercase", m: "15px 3px 8px" }}>
                  Recent
                </Typography>
                <Stack gap={1}>
                  {recentApplications.map((app) => {
                    const active = app.app_slug === selectedSlug;
                    return (
                      <Box
                        key={`recent-${app.id}`}
                        onClick={() => {
                          setSelectedSlug(app.app_slug);
                          setAppDrawerOpen(false);
                        }}
                        sx={{
                          p: 1.5,
                          border: "1px solid #e5eaf1",
                          borderRadius: "11px",
                          cursor: "pointer",
                          bgcolor: active ? "#f7faff" : "#fff",
                          borderColor: active ? "#9eb8dd" : "#e5eaf1",
                        }}
                      >
                        <Typography sx={{ color: "#17385f", fontWeight: 800, fontSize: 15 }}>
                          {app.app_name}
                        </Typography>
                        <Typography sx={{ mt: 0.5, color: "#758397", fontSize: 12 }}>
                          {(app.requirement || app.table_name || "No description")} · {app.status || "Active"}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </>
            ) : null}

            <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#92a0b2", textTransform: "uppercase", m: "15px 3px 8px" }}>
              All Applications
            </Typography>
            <Stack gap={1}>
              {filteredApplications.length ? (
                filteredApplications.map((app) => {
                  const active = app.app_slug === selectedSlug;
                  const isDashboard = String(app?.schema_json?.appMode || "").toLowerCase() === "dashboard";
                  return (
                    <Box
                      key={app.id}
                      onClick={() => {
                        setSelectedSlug(app.app_slug);
                        setAppDrawerOpen(false);
                      }}
                      sx={{
                        p: 1.5,
                        border: "1px solid #e5eaf1",
                        borderRadius: "11px",
                        cursor: "pointer",
                        bgcolor: active ? "#f7faff" : "#fff",
                        borderColor: active ? "#9eb8dd" : "#e5eaf1",
                        "&:hover": {
                          bgcolor: "#f7faff",
                          borderColor: "#9eb8dd",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ color: "#17385f", fontWeight: 800, fontSize: 15 }}>
                            {app.app_name}
                          </Typography>
                          <Typography sx={{ mt: 0.5, color: "#758397", fontSize: 12 }}>
                            {(app.requirement || app.table_name || "No description")} · {app.status || "Active"}
                          </Typography>
                        </Box>
                        <Tooltip title="Delete application">
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteApplication(app);
                            }}
                            sx={{
                              width: 28,
                              height: 28,
                              color: "#7f91ab",
                              border: "1px solid #d8e4f2",
                              bgcolor: "#fff",
                              "&:hover": {
                                color: "#c62828",
                                borderColor: "#f1b2b2",
                                bgcolor: "#fff5f5",
                              },
                            }}
                          >
                            <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ mt: 1.1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                        <Typography sx={{ fontSize: 12, color: "#60758f" }}>
                          {app.table_name}
                        </Typography>
                        <Stack direction="row" spacing={0.75}>
                          {isDashboard ? (
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{ minWidth: 0, px: 0.85, minHeight: 26, fontSize: 10.5, textTransform: "none", borderRadius: 2 }}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSaveApplicationChanges(app);
                              }}
                            >
                              Save
                            </Button>
                          ) : null}
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ minWidth: 0, px: 0.85, minHeight: 26, fontSize: 10.5, textTransform: "none", borderRadius: 2 }}
                            onClick={(event) => {
                              event.stopPropagation();
                              handlePublishApplication(app);
                            }}
                            disabled={String(app.status || "").toLowerCase() === "published"}
                          >
                            {String(app.status || "").toLowerCase() === "published" ? "Published" : "Publish"}
                          </Button>
                        </Stack>
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <Typography sx={{ fontSize: 13, color: "#5f6f8a", p: 1 }}>
                  No applications yet.
                </Typography>
              )}
            </Stack>
          </Box>

          <Box sx={{ mt: "auto", p: 1.9, borderTop: "1px solid #dfe6ef" }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setAppDrawerOpen(false);
                setCreateOpen(true);
              }}
              sx={{
                minHeight: 44,
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 800,
              }}
            >
              Create New Application
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Box
        sx={{
          minHeight: "calc(100vh - 72px)",
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: { xs: 2, md: 3 },
              py: 1.75,
              borderBottom: "1px solid #dfe6ef",
              bgcolor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {selectedApp ? (
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", lg: "center" }}
                sx={{ width: "100%" }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flexWrap: "wrap", rowGap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setAppDrawerOpen(true)}
                    startIcon={<MenuIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      minHeight: 50,
                      borderRadius: 2.25,
                      px: 2,
                      textTransform: "none",
                      borderColor: "#dfe6ef",
                      bgcolor: "#fff",
                      color: "#334155",
                      fontWeight: 700,
                      fontSize: 14,
                      "& .MuiButton-startIcon": {
                        mr: 0.75,
                      },
                    }}
                  >
                    Applications {applications.length}
                  </Button>
                  <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: "#15386d", lineHeight: 1.05 }}>
                    {selectedApp.app_name}
                  </Typography>
                  <Chip
                    label={selectedApp.status || "Active"}
                    sx={{
                      height: 29,
                      borderRadius: 999,
                      bgcolor: String(selectedApp.status || "").toLowerCase() === "published" ? "#eef8f3" : "#f7fafc",
                      color: String(selectedApp.status || "").toLowerCase() === "published" ? "#15966a" : "#46617d",
                      border: "1px solid #d8e4f2",
                      fontWeight: 700,
                      "& .MuiChip-label": {
                        px: 1.15,
                        fontSize: 12,
                      },
                    }}
                  />
                  <Chip
                    icon={<DashboardCustomizeRoundedIcon />}
                    label={`Source: ${selectedApp.table_name || "N/A"}`}
                    sx={{
                      height: 29,
                      borderRadius: 999,
                      bgcolor: "#f5f7fb",
                      color: "#67758a",
                      border: "1px solid #e5eaf0",
                      fontWeight: 500,
                      "& .MuiChip-label": {
                        pr: 1.15,
                        fontSize: 12,
                      },
                      "& .MuiChip-icon": {
                        fontSize: 15,
                      },
                    }}
                  />
                </Stack>
                <Box sx={{ flex: "0 0 auto", alignSelf: "center" }}>
                  <Typography sx={{ fontSize: { xs: 18, md: 22 }, fontWeight: 600, color: "#15386d", lineHeight: 1.05 }}>
                    AI App Builder
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Button
                    variant="outlined"
                    sx={{
                      minHeight: 42,
                      px: 1.75,
                      borderRadius: 2.5,
                      textTransform: "none",
                      borderColor: "#dfe6ef",
                      color: "#334155",
                      fontWeight: 700,
                    }}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="contained"
                    sx={{
                      minHeight: 42,
                      px: 1.75,
                      borderRadius: 2.5,
                      textTransform: "none",
                      bgcolor: "#eef4ff",
                      color: "#2563eb",
                      boxShadow: "none",
                      fontWeight: 700,
                      "&:hover": {
                        bgcolor: "#e4edff",
                        boxShadow: "none",
                      },
                    }}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="contained"
                    sx={{
                      minHeight: 42,
                      px: 1.75,
                      borderRadius: 2.5,
                      textTransform: "none",
                      bgcolor: "#2563eb",
                      fontWeight: 700,
                    }}
                  >
                    Publish
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateOpen(true)}
                    sx={{
                      minHeight: 42,
                      px: 2,
                      borderRadius: 2.5,
                      textTransform: "none",
                      fontWeight: 800,
                      bgcolor: "#173a67",
                      "&:hover": {
                        bgcolor: "#133257",
                      },
                    }}
                  >
                    Create New Application
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Box>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.5, flexWrap: "wrap", rowGap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setAppDrawerOpen(true)}
                    startIcon={<MenuIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      minHeight: 50,
                      borderRadius: 2.25,
                      px: 2,
                      textTransform: "none",
                      borderColor: "#dfe6ef",
                      bgcolor: "#fff",
                      color: "#334155",
                      fontWeight: 700,
                      fontSize: 14,
                      "& .MuiButton-startIcon": {
                        mr: 0.75,
                      },
                    }}
                  >
                    Applications {applications.length}
                  </Button>
                  <Typography sx={{ fontSize: 22, fontWeight: 600, color: "#15386d" }}>
                    AI App Builder
                  </Typography>
                </Stack>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              bgcolor: "transparent",
            }}
          >
            {selectedApp && schema ? (
              renderSelectedApplication()
            ) : (
              <Box
                sx={{
                  minHeight: 420,
                  display: "grid",
                  placeItems: "center",
                  px: 3,
                }}
              >
                <Stack spacing={1.5} alignItems="center" sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 68,
                      height: 68,
                      borderRadius: 3,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "#eaf2ff",
                      color: "#2563eb",
                    }}
                  >
                    <AppsRoundedIcon sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, color: "#16233b", fontSize: 22 }}>
                    No application selected
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: 14, maxWidth: 420 }}>
                    Select an application from the left panel or create a new one.
                  </Typography>
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <CreateApplicationDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateApplication}
      />

      <SchemaReviewDialog
        open={schemaReviewOpen}
        onClose={() => {
          setSchemaReviewOpen(false);
          setPendingApplication(null);
        }}
        appName={pendingApplication?.appName || ""}
        requirement={pendingApplication?.requirement || ""}
        schema={pendingApplication?.schema || {}}
        onSave={handleConfirmSchema}
      />

      <RecordDialog
        open={recordDialogOpen}
        schema={schema}
        record={editingRecord}
        existingRecords={normalizedRecords}
        onClose={() => {
          setRecordDialogOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
      />

      <Snackbar
        open={notice.open}
        autoHideDuration={3500}
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

      {loading ? (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(255,255,255,0.35)",
            zIndex: 1400,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </Box>
  );
}
