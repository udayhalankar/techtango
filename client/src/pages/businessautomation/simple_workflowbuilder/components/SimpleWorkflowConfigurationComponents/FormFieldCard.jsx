import React from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  InputLabel,
} from "@mui/material";
import api from "../../../../../services/api";

export default function FormFieldCard({
  r,
  idx,
  isInitiate,
  inputWhiteSx,
  blueLabelSx,
  onChangeRow,
  ATTACHMENT_TYPE,
  DATE_GRANULARITIES,
  INPUT_TYPES,
  recordId,
  header,
}) {
  const ro = !!r.read_only;
  const roDisplayOnly = false; // enforced by parent rules; keep UI simple here
  const dt = String(r.data_type || "").toLowerCase();
  const isWorkflowId = String(r.column || "").toLowerCase() === "workflow_id";
  const isDateType = dt === "date" || dt === "timestamp" || dt === "timestamptz";

  const supportsOptions = ["checkbox", "radio", "dropdownlist"].includes(String(r.input_type).toLowerCase());

  const inputTypeChoices = INPUT_TYPES.map((opt) => (opt.value === "date" && !isDateType ? { ...opt, disabled: true } : opt));

  const effectiveInputType = isDateType ? "date" : r.input_type || "text";

  React.useEffect(() => {
    if (!isWorkflowId) return;
    const patch = {};
    if (r.read_only !== true) patch.read_only = true;
    if (r.data_entry) patch.data_entry = false;
    if (r.mandatory) patch.mandatory = false;
    if (Object.keys(patch).length) {
      onChangeRow(idx, patch);
    }
  }, [isWorkflowId, r.read_only, r.data_entry, r.mandatory, idx, onChangeRow]);

  async function handleAttachmentUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const uploaded = [];
      for (const f of files) {
        const form = new FormData();
        form.append("file", f);
        form.append("ref_table", header?.workflow_table_name || "approval_items");
        form.append("ref_table_id", recordId || r?.current_row_id || "");
        if (recordId) form.append("workflow_id", String(recordId));

        const { data } = await api.post("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (data?.file) uploaded.push(data.file);
        else if (Array.isArray(data?.files)) uploaded.push(...data.files);
        else uploaded.push(data);
      }
      onChangeRow(idx, {
        attachments: [...(r.attachments || []), ...uploaded],
      });
    } catch (err) {
      console.error("upload failed", err);
      alert("Upload failed. Please try again.");
    } finally {
      e.target.value = "";
    }
  }

  function removeAttachment(i) {
    const next = [...(r.attachments || [])];
    next.splice(i, 1);
    onChangeRow(idx, { attachments: next });
  }

  return (
    <Paper
      key={r.column}
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 2,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "260px 1fr",
        },
      }}
    >
      <Box
        sx={{
          bgcolor: "#4b5563",
          color: "common.white",
          p: 2,
          borderRight: { md: "1px solid rgba(255,255,255,0.12)" },
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 16,
            mb: 1,
            textDecoration: "underline dotted",
          }}
        >
          {r.column}
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Database column details
        </Typography>

        <Box component="ul" sx={{ pl: 2, m: 0, fontSize: 12, lineHeight: 1.8 }}>
          <li>column_name: {r.column}</li>
          <li>data_type: {r.data_type}</li>
        </Box>
      </Box>

      <Box sx={{ p: 2.25 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "text.primary" }}>
          Form Field Settings
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              label="Label name"
              value={r.label || ""}
              onChange={(e) => onChangeRow(idx, { label: e.target.value })}
              disabled={ro}
              sx={inputWhiteSx}
              InputLabelProps={{ sx: blueLabelSx }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            {isInitiate ? (
              <FormControl fullWidth size="small" sx={inputWhiteSx} disabled={ro || isDateType}>
                <InputLabel sx={blueLabelSx}>Input type</InputLabel>
                <Select
                  label="Input type"
                  value={effectiveInputType}
                  onChange={(e) => {
                    const it = e.target.value;
                    const isOpt = ["checkbox", "radio", "dropdownlist"].includes(it);
                    onChangeRow(idx, {
                      input_type: isDateType ? "date" : it,
                      options: isOpt ? r.options || "" : "",
                    });
                  }}
                >
                  {inputTypeChoices.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                fullWidth
                size="small"
                label="Input type"
                value={effectiveInputType}
                disabled
                sx={{
                  ...inputWhiteSx,
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#f3f4f6",
                  },
                }}
                InputLabelProps={{ sx: blueLabelSx }}
              />
            )}
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small" sx={inputWhiteSx} disabled={!isInitiate || !isDateType || ro}>
              <InputLabel sx={blueLabelSx}>Date granularity</InputLabel>
              <Select
                label="Date granularity"
                value={r.date_granularity || (isDateType ? "date" : "")}
                onChange={(e) => onChangeRow(idx, { date_granularity: e.target.value })}
              >
                {isDateType ? (
                  DATE_GRANULARITIES.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="">
                    <em>-</em>
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            {String(effectiveInputType).toLowerCase() === "attachment" ? (
              <Box>
                <Button variant="outlined" size="small" component="label" disabled={!isInitiate || ro} sx={{ textTransform: "none" }}>
                  Upload attachments
                  <input type="file" multiple hidden onChange={handleAttachmentUpload} />
                </Button>

                {(r.attachments || []).length > 0 && (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {(r.attachments || []).map((f, i) => {
                      const name = f.originalname || f.name || f.filename || f.url || `file_${i + 1}`;
                      return (
                        <Box
                          key={`${name}-${i}`}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            border: "1px solid #e5e7eb",
                            borderRadius: 1,
                            px: 1,
                            py: 0.5,
                            fontSize: 12,
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {name}
                          </span>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => removeAttachment(i)}
                            disabled={!isInitiate || ro}
                            sx={{
                              textTransform: "none",
                              fontSize: 11,
                              minWidth: 0,
                              px: 1,
                            }}
                          >
                            Remove
                          </Button>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            ) : (
              <TextField
                fullWidth
                size="small"
                label="Options (Enter your options, each seperated by a comma)"
                placeholder={supportsOptions ? "e.g. Male, Female, Other" : "-"}
                value={supportsOptions ? r.options || "" : ""}
                onChange={(e) => onChangeRow(idx, { options: e.target.value })}
                disabled={ro || !supportsOptions}
                sx={inputWhiteSx}
                InputLabelProps={{
                  sx: blueLabelSx,
                }}
              />
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: "text.secondary" }}>
              Field behaviour
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ flexWrap: "wrap" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={isWorkflowId ? false : !!r.data_entry}
                    onChange={(e) => onChangeRow(idx, { data_entry: e.target.checked })}
                    disabled={isWorkflowId || r.read_only || roDisplayOnly}
                  />
                }
                label="Data entry"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={isWorkflowId ? true : !!r.read_only}
                    onChange={(e) => onChangeRow(idx, { read_only: e.target.checked })}
                    disabled={isWorkflowId || !!r.data_entry || roDisplayOnly}
                  />
                }
                label="Read only"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={!!r.visible}
                    onChange={(e) => onChangeRow(idx, { visible: e.target.checked })}
                  />
                }
                label="Visible"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={isWorkflowId ? false : !!r.mandatory}
                    onChange={(e) => onChangeRow(idx, { mandatory: e.target.checked })}
                    disabled={isWorkflowId || !r.data_entry || r.read_only || roDisplayOnly}
                  />
                }
                label="Mandatory"
              />
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
