import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import api from "../../../services/api";

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

const CompactTextField = (props) => (
  <TextField
    fullWidth
    size="small"
    sx={compactTextFieldSx}
    {...props}
  />
);

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
  
  const [defaultSortDirection, setDefaultSortDirection] = useState("Descending");
  
  const [error, setError] = useState("");
  // const isBookingApp = /meeting|room|booking|schedule/i.test(`${appName} ${requirement}`);
  const isBookingApp = appType === "booking";
  const isDataViewApp = ["chart", "dashboard", "report", "booking_chart", "calendar"].includes(appType);
  // useEffect(() => {
  //   if (open) {
  //     setError("");
      //const nextBookingMode = /meeting|room|booking|schedule/i.test(`${appName} ${requirement}`);
    //   setFields(
    //     isBookingApp
    //       ? [
    //           createDefaultField(1, true),
    //           createDefaultField(2, true),
    //           {
    //             ...createDefaultField(3, true),
    //             label: "Booked By",
    //             name: "booked_by",
    //             type: "text",
    //             defaultValue: "",
    //             helperText: "Enter requester name",
    //             uniqueValue: false,
    //           },
    //           {
    //             ...createDefaultField(4, true),
    //             label: "Status",
    //             name: "status",
    //             type: "select",
    //             options: "Pending, Approved, Rejected",
    //             defaultValue: "Pending",
    //             helperText: "Current booking status",
    //             showInTable: true,
    //           },
    //           {
    //             ...createDefaultField(5, true),
    //             label: "Remarks",
    //             name: "remarks",
    //             type: "textarea",
    //             defaultValue: "",
    //             helperText: "Optional comments",
    //             showInTable: false,
    //             uniqueValue: false,
    //           },
    //         ]
    //       : [
    //           createDefaultField(1, false),
    //           {
    //             ...createDefaultField(2, false),
    //             label: "Description",
    //             name: "description",
    //             type: "textarea",
    //             showInTable: true,
    //           },
    //         ]
    //   );
    //   setDependencies(isBookingApp ? [createDefaultDependencyRule()] : []);
    //   setValidationRules(
    //     isBookingApp
    //       ? [
    //           createDefaultValidationRule(),
    //           {
    //             id: `rule_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    //             type: "Prevent Time Overlap",
    //             fields: "booking_date, start_time, duration_slots",
    //             runAt: "Backend Only",
    //             errorMessage: "This room is already booked during the selected time slot.",
    //             resourceField: "room_name",
    //             dateField: "booking_date",
    //             startTimeField: "start_time",
    //             durationField: "duration_slots",
    //             slotMinutes: 30,
    //           },
    //         ]
    //       : []
    //   );
    // }


//     setFields([
//   createDefaultField(1),
//   {
//     ...createDefaultField(2),
//     label: "Description",
//     name: "description",
//     type: "textarea",
//     showInTable: true,
//   },
// ]);

// setDependencies([]);
// setValidationRules([]);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [open]);

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

  const updateField = (index, key, value) => {
    setFields((prev) => prev.map((field, idx) => (idx === index ? { ...field, [key]: value } : field)));
  };

  const updateDependency = (index, key, value) => {
    setDependencies((prev) => prev.map((dep, idx) => (idx === index ? { ...dep, [key]: value } : dep)));
  };

  const updateValidationRule = (index, key, value) => {
    setValidationRules((prev) => prev.map((rule, idx) => (idx === index ? { ...rule, [key]: value } : rule)));
  };

  const handleGenerate = () => {
    const trimmedName = appName.trim();
    if (!trimmedName) {
      setError("Application name is required");
      return;
    }
    if (isDataViewApp && !sourceTable.trim()) {
        setError("Source table is required for chart, dashboard, report, calendar and booking chart apps.");
        return;
      }
    onCreate?.({
                appName: trimmedName,
                requirement: requirement.trim(),
                appType,
                sourceTable: sourceTable.trim(),
                builderSpec: null,
              });
          };

 

  return (
    <Dialog
          open={open}
          onClose={onClose}
          maxWidth={false}
          fullWidth
          PaperProps={{
            sx: {
              width: "75vw",
              maxWidth: "900px",
              height: "94vh",
              maxHeight: "94vh",
              borderRadius: 4,
              overflow: "hidden",
              m: 0.5,
              border: "3px solid #f97316",
              outline: "1px solid rgba(249, 115, 22, 0.18)",
              boxShadow: "0 30px 50px rgba(149, 115, 22, 0.18)",
            },
          }}
        >
      <DialogContent
          sx={{
            p: 0,
            bgcolor: "#ffffff",
            overflowY: "auto",
            borderRadius: 0,
            "&::-webkit-scrollbar": {
              width: 8,
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#fdba74",
              borderRadius: 8,
            },
          }}
        >
        <Box
            sx={{
              width: "100%",
              maxWidth: "none",
              mx: 0,
              my: 0,
              bgcolor: "#ffffff",
              borderRadius: 0,
              overflow: "hidden",
              border: "none",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
              display: "flex",
              flexDirection: "column",
              minHeight: "100%",
            }}
          >
          <Box sx={{ px: 4, py: 3, background: "linear-gradient(135deg, #f8fbff, #eef5ff)", borderBottom: "1px solid #dbeafe" }}>
            <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#0f2f57" }}>
              Create a New Application
            </Typography>
            <Typography sx={{ mt: 1, color: "#64748b", fontSize: 14 }}>
              Define fields, table display, dependencies and validation rules before AI generates the CRUD schema.
            </Typography>
          </Box>

          <Box sx={{ px: 2.5, py: 2.5 }}>
            <Stack gap={3}>
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

                      {isDataViewApp ? (
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
            </Stack>
          </Box>

          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              bgcolor: "#fffaf5",
              borderTop: "1px solid #fed7aa",
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="outlined"
              onClick={onClose}
              size="small"
              sx={{
                minWidth: 82,
                height: 34,
                borderRadius: 2,
                textTransform: "none",
                fontSize: 12,
                fontWeight: 700,
                borderColor: "#fdba74",
                color: "#9a3412",
                px: 1.5,
                "&:hover": {
                  borderColor: "#f97316",
                  bgcolor: "#fff7ed",
                },
              }}
            >
              Cancel
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleGenerate()}
              size="small"
              sx={{
                minWidth: 108,
                height: 34,
                borderRadius: 2,
                textTransform: "none",
                fontSize: 12,
                fontWeight: 700,
                borderColor: "#fdba74",
                color: "#9a3412",
                px: 1.75,
                "&:hover": {
                  borderColor: "#f97316",
                  bgcolor: "#fff7ed",
                },
              }}
            >
              Preview Schema
            </Button>

            <Button
              variant="contained"
              onClick={handleGenerate}
              size="small"
              sx={{
                minWidth: 132,
                height: 34,
                borderRadius: 2,
                textTransform: "none",
                fontSize: 12,
                fontWeight: 700,
                px: 2,
                bgcolor: "#f97316",
                boxShadow: "0 8px 18px rgba(249, 115, 22, 0.28)",
                "&:hover": {
                  bgcolor: "#ea580c",
                },
              }}
            >
              Generate Application
            </Button>
          </Box>
          {error ? (
            <Box sx={{ px: 2.5, pb: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : null}
        </Box>
      </DialogContent>
    </Dialog>
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

  const notify = (severity, message) => setNotice({ open: true, severity, message });

  const loadApplications = async (preferredSlug = "") => {
    const res = await api.get("/aiappbuilder");
    const list = Array.isArray(res.data) ? res.data : [];
    setApplications(list);
    const nextSlug = preferredSlug || selectedSlug || list[0]?.app_slug || "";
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
      setSchema(schemaRes.data?.schema || null);
      setSelectedApp(schemaRes.data?.app || null);
      setRecords(Array.isArray(recordsRes.data) ? recordsRes.data : []);
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

  const normalizedRecords = useMemo(() => records.map(normalizeRecord), [records]);
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

  const openNewRecord = () => {
    setEditingRecord(null);
    setRecordDialogOpen(true);
  };

  const openEditRecord = (record) => {
    setEditingRecord(record);
    setRecordDialogOpen(true);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb", p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid #d8dde7",
          bgcolor: "#ffffff",
          boxShadow: "0 8px 28px rgba(16, 24, 40, 0.06)",
        }}
      >
        <Stack gap={2}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ fontSize: 26, fontWeight: 800, color: "#16233b" }}>
                AI App Builder
              </Typography>
              <Typography sx={{ color: "#5f6f8a", fontSize: 13 }}>
                Build one-page CRUD applications from AI-generated schemas.
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              Create New Application
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  border: "1px solid #d8dde7",
                  borderRadius: 2,
                  bgcolor: "#fbfcff",
                  height: "100%",
                }}
              >
                <Stack gap={1.25}>
                  <TextField
                    size="small"
                    value={appSearch}
                    onChange={(event) => setAppSearch(event.target.value)}
                    placeholder="Search applications"
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ fontSize: 18, color: "#7b8aa1", mr: 1 }} />,
                    }}
                  />
                  <Divider />
                  <Stack gap={1} sx={{ maxHeight: "72vh", overflow: "auto" }}>
                    {filteredApplications.length ? (
                      filteredApplications.map((app) => {
                        const active = app.app_slug === selectedSlug;
                        return (
                          <Card
                            key={app.id}
                            sx={{
                              border: active ? "1px solid #2f7dd6" : "1px solid #d8dde7",
                              boxShadow: active ? "0 8px 20px rgba(47,125,214,0.12)" : "none",
                            }}
                          >
                            <CardActionArea onClick={() => setSelectedSlug(app.app_slug)}>
                              <CardContent>
                                <Stack gap={0.5}>
                                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                                    <Typography sx={{ fontWeight: 800, color: "#16233b" }}>
                                      {app.app_name}
                                    </Typography>
                                    {active ? <Chip size="small" label="Open" color="primary" /> : null}
                                  </Box>
                                  <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>
                                    {app.table_name}
                                  </Typography>
                                  <Typography sx={{ fontSize: 12, color: "#5f6f8a" }}>
                                    {app.requirement ? String(app.requirement).slice(0, 90) : "No requirement summary"}
                                  </Typography>
                                </Stack>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        );
                      })
                    ) : (
                      <Typography sx={{ fontSize: 13, color: "#5f6f8a", p: 1 }}>
                        No applications yet.
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={9}>
              <Paper
                elevation={0}
                sx={{
                  p: 0,
                  borderRadius: 4,
                  minHeight: 520,
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.12)",
                }}
              >
                {selectedApp && schema ? (
                  <Stack gap={0}>
                    <Box
                      sx={{
                        px: 3.5,
                        py: 2.75,
                        background: "linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%)",
                        borderBottom: "1px solid #dbeafe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#0f2f57" }}>
                          {schema.title || schema.appName}
                        </Typography>
                        <Typography sx={{ mt: 0.75, fontSize: 14, color: "#64748b" }}>
                          {schema.description || selectedApp.requirement || "Manage records for this application."}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openNewRecord}
                        sx={{
                          height: 42,
                          px: 2.5,
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 700,
                          bgcolor: "#2563eb",
                          boxShadow: "0 10px 22px rgba(37, 99, 235, 0.25)",
                          "&:hover": { bgcolor: "#1d4ed8" },
                        }}
                      >
                        Create New
                      </Button>
                    </Box>

                    <Box
                      sx={{
                        px: 3.5,
                        pt: 2.5,
                        pb: 2,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                      >
                        <Typography sx={{ color: "#5f6f8a", fontSize: 13 }}>
                          {schema.description || selectedApp.requirement || "No description"}
                        </Typography>
                        <TextField
                          size="small"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search records..."
                          sx={{
                            width: 260,
                            maxWidth: "100%",
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              bgcolor: "#ffffff",
                            },
                          }}
                        />
                      </Box>

                    <Box sx={{ px: 3.5, pb: 0.5, overflowX: "auto" }}>
                      <Box
                        component="table"
                        sx={{
                          width: "100%",
                          borderCollapse: "collapse",
                          minWidth: 900,
                          fontSize: 14,
                          overflow: "hidden",
                        }}
                      >
                        <Box component="thead">
                          <Box component="tr" sx={{ bgcolor: "#0f2f57", color: "#ffffff" }}>
                            {tableColumns.map((column) => {
                              const field = tableFields.find((item) => item.name === column)
                                || auditColumns.find((item) => item.name === column);
                              return (
                                <Box
                                  key={`head-${column}`}
                                  component="th"
                                  sx={{
                                    textAlign: "left",
                                    px: 2,
                                    py: 1.75,
                                    color: "#fff",
                                    fontSize: 12,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {field?.label || toTitle(column)}
                                </Box>
                              );
                            })}
                            <Box
                              component="th"
                              sx={{
                                textAlign: "center",
                                px: 2,
                                py: 1.75,
                                color: "#fff",
                                width: 170,
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Actions
                            </Box>
                          </Box>
                        </Box>
                        <Box component="tbody">
                          {pageRecords.length ? (
                            pageRecords.map((record, index) => (
                              <Box
                                component="tr"
                                key={record.id}
                                sx={{
                                  "&:nth-of-type(odd)": { bgcolor: "#fbfdff" },
                                  "&:hover": { bgcolor: "#f8fbff" },
                                }}
                              >
                                {tableColumns.map((column) => (
                                  <Box
                                    component="td"
                                    key={`${record.id}-${column}`}
                                    sx={{
                                      px: 2,
                                      py: 1.8,
                                      color: "#334155",
                                      borderBottom: "1px solid #e2e8f0",
                                      wordBreak: "break-word",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {column === "status" ? (
                                      <Chip
                                        size="small"
                                        label={String(record[column] || "")}
                                        sx={{
                                          height: 28,
                                          borderRadius: 999,
                                          fontWeight: 700,
                                          bgcolor:
                                            String(record[column] || "").toLowerCase() === "approved"
                                              ? "#ecfdf5"
                                              : String(record[column] || "").toLowerCase() === "rejected"
                                                ? "#fef2f2"
                                                : "#fff7ed",
                                          color:
                                            String(record[column] || "").toLowerCase() === "approved"
                                              ? "#047857"
                                              : String(record[column] || "").toLowerCase() === "rejected"
                                                ? "#b91c1c"
                                                : "#c2410c",
                                        }}
                                      />
                                    ) : (
                                      formatRecordCell(
                                        tableFields.find((item) => item.name === column)
                                          || auditColumns.find((item) => item.name === column),
                                        record[column]
                                      )
                                    )}
                                  </Box>
                                ))}
                                <Box component="td" sx={{ px: 2, py: 1.8, borderBottom: "1px solid #e2e8f0" }}>
                                  <Stack direction="row" spacing={1} justifyContent="center">
                                    <Tooltip title="Edit">
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => openEditRecord(record)}
                                        startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
                                        sx={{
                                          borderRadius: 2,
                                          minWidth: 0,
                                          px: 1.6,
                                          py: 0.6,
                                          borderColor: "#cbd5e1",
                                          color: "#334155",
                                          bgcolor: "#ffffff",
                                          fontWeight: 700,
                                          textTransform: "none",
                                        }}
                                      >
                                        Edit
                                      </Button>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleDeleteRecord(record)}
                                        startIcon={<DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
                                        sx={{
                                          borderRadius: 2,
                                          minWidth: 0,
                                          px: 1.6,
                                          py: 0.6,
                                          borderColor: "#fecaca",
                                          color: "#b91c1c",
                                          bgcolor: "#fffafa",
                                          fontWeight: 700,
                                          textTransform: "none",
                                          "&:hover": {
                                            borderColor: "#fca5a5",
                                            bgcolor: "#fff5f5",
                                          },
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </Tooltip>
                                  </Stack>
                                </Box>
                              </Box>
                            ))
                          ) : (
                            <Box component="tr">
                              <Box component="td" colSpan={tableColumns.length + 1} sx={{ px: 2, py: 2.5, color: "#5f6f8a" }}>
                                No records found.
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        px: 3.5,
                        pt: 0.5,
                        pb: 2.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 1.5,
                        flexWrap: "wrap",
                        background: "#f8fafc",
                        borderTop: "1px solid #e2e8f0",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography sx={{ color: "#334155", fontSize: 13, fontWeight: 600 }}>Rows per page:</Typography>
                        <TextField
                          select
                          size="small"
                          value={rowsPerPage}
                          onChange={(event) => {
                            setRowsPerPage(Number(event.target.value) || 10);
                            setPage(1);
                          }}
                          sx={{
                            width: 96,
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              bgcolor: "#ffffff",
                            },
                          }}
                        >
                          {ROWS_PER_PAGE_OPTIONS.map((value) => (
                            <MenuItem key={`rpp-${value}`} value={value}>
                              {value}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                      <Pagination
                        count={totalPages}
                        page={safePage}
                        onChange={(_event, nextPage) => setPage(nextPage)}
                        color="primary"
                        sx={{
                          "& .MuiPaginationItem-root": {
                            borderRadius: 2,
                            fontWeight: 700,
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                ) : (
                  <Box sx={{ display: "grid", placeItems: "center", minHeight: 400, color: "#5f6f8a" }}>
                    <Stack gap={1} alignItems="center">
                      <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#16233b" }}>
                        No application selected
                      </Typography>
                      <Typography sx={{ fontSize: 13 }}>
                        Create an application to start generating the schema and rendering the one-page CRUD app.
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Paper>

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
