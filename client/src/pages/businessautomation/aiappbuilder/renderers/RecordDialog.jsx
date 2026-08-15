import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

const defaultValueForField = (field) => {
  if (!field) return "";
  if (field.type === "checkbox") return Boolean(field.defaultValue);
  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    return field.defaultValue;
  }
  return "";
};

const buildInitialValues = (schema, source = null) =>
  (schema?.fields || []).reduce((acc, field) => {
    const existing = source?.transaction_data?.[field.name] ?? source?.[field.name];
    acc[field.name] = existing !== undefined ? existing : defaultValueForField(field);
    return acc;
  }, {});

const validateRecord = (schema, values) => {
  const errors = {};

  (schema?.fields || []).forEach((field) => {
    const value = values?.[field.name];
    const textValue = String(value ?? "").trim();

    if (field.required && !textValue) {
      errors[field.name] = `${field.label || field.name} is required`;
    }
  });

  return errors;
};

const FieldControl = ({ field, value, error, onChange }) => {
  const commonProps = {
    fullWidth: true,
    size: "small",
    label: field.label || field.name,
    value: value ?? "",
    error: Boolean(error),
    helperText: error || field.placeholder || field.helperText || "",
    onChange: (event) => onChange(field.name, event.target.value),
  };

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
      <FormControl error={Boolean(error)} fullWidth>
        <FormLabel>{field.label || field.name}</FormLabel>
        <RadioGroup
          row
          value={value ?? ""}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          {(field.options || []).map((option) => (
            <FormControlLabel
              key={`${field.name}-${option}`}
              value={option}
              control={<Radio size="small" />}
              label={option}
            />
          ))}
        </RadioGroup>
        <FormHelperText>{error || ""}</FormHelperText>
      </FormControl>
    );
  }

  if (field.type === "checkbox") {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(value)}
            onChange={(event) => onChange(field.name, event.target.checked)}
          />
        }
        label={field.label || field.name}
      />
    );
  }

  return (
    <TextField
      {...commonProps}
      type={
        field.type === "number"
          ? "number"
          : field.type === "date" || field.type === "time"
            ? field.type
            : field.type === "email"
              ? "email"
              : field.type === "tel"
                ? "tel"
                : "text"
      }
      multiline={field.type === "textarea"}
      minRows={field.type === "textarea" ? 3 : undefined}
      InputLabelProps={
        field.type === "date" || field.type === "time"
          ? { shrink: true }
          : undefined
      }
    />
  );
};

export default function RecordDialog({
  open,
  schema,
  record,
  existingRecords,
  onClose,
  onSave,
}) {
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
    const nextErrors = validateRecord(schema, values, existingRecords);
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
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            px: 4,
            py: 3.25,
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
}