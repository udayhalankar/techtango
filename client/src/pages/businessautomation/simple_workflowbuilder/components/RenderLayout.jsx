// RenderLayout.jsx
import React from "react";
import { materializeLayout } from "./simpleWorkflowFormLayouts";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  MenuItem,
  Button,
} from "@mui/material";

function titleCase(s = "") {
  return s
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * Pure visual renderer for layout_def + previewFields.
 * If onChangeColumnSpan is provided, shows small controls to tweak col.span.
 *
 * Props:
 *  - layoutDef: JSON saved in simple_workflowbuilder_formviews.layout_def
 *  - previewFields: result of getPreviewFields() from the step config
 *  - onChangeColumnSpan?(sectionId, colId, newSpan)
 *  - readOnly?: boolean  (if true, hides editing controls even if handler exists)
 */
export default function RenderLayout({
  layoutDef,
  previewFields,
  onChangeColumnSpan,
  readOnly = false,
  step,
}) {
  if (!layoutDef) return null;

  let sections = materializeLayout(layoutDef, previewFields) || [];
  // Enforce: step_comments must render in Main above audit_trail (preview only)
  try {
    const lc = (s) => String(s || '').toLowerCase();
    const mainIdx = sections.findIndex((s) => lc(s.id) === 'main');
    if (mainIdx >= 0) {
      // Remove any step_comments/audit_trail from all sections
      const pulled = { comments: null, audit: null };
      sections = sections.map((sec) => {
        const cols = (sec.columns || []).map((col) => {
          const kept = [];
          (col.fields || []).forEach((f) => {
            const name = lc(f?.fieldMeta?.column || f?.field);
            if (name === 'step_comments') pulled.comments = f;
            else if (name === 'audit_trail') pulled.audit = f;
            else kept.push(f);
          });
          return { ...col, fields: kept };
        });
        return { ...sec, columns: cols };
      });

      if (pulled.comments || pulled.audit) {
        const main = sections[mainIdx];
        // Ensure at least one column exists
        const mcols = Array.isArray(main.columns) && main.columns.length ? main.columns.slice() : [{ id: 'col1', span: 4, fields: [] }];
        // Append to the end of the first column so they appear after other fields
        const first = { ...mcols[0], fields: [...(mcols[0].fields || [])] };
        const nextFields = first.fields.slice();
        if (pulled.comments) nextFields.push(pulled.comments);
        if (pulled.audit) nextFields.push(pulled.audit);
        mcols[0] = { ...first, fields: nextFields };
        sections[mainIdx] = { ...main, columns: mcols };
      }
    }
  } catch {}
  if (!sections.length) return null;

  const globalLabelStyle = layoutDef.label_style || "side";

  const handleSpanChange = (secId, colId, event) => {
    if (!onChangeColumnSpan || readOnly) return;
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    const safe = Math.min(Math.max(value, 1), 4);
    onChangeColumnSpan(secId, colId, safe);
  };

  const renderBlock = (blk, idx) => {
    const t = String(blk?.type || '').toLowerCase();
    if (t === 'image' && blk?.src) {
      const style = {
        maxWidth: '100%',
        maxHeight: blk.maxHeight || 64,
        objectFit: 'contain',
        display: 'block',
        marginBottom: 8,
      };
      return <img key={`b_img_${idx}`} src={blk.src} alt={blk.alt || ''} style={style} />;
    }
    if (t === 'text' && blk?.html) {
      const style = {
        textAlign: blk.align || blk.textAlign || 'left',
        color: blk.color || blk.fontColor || undefined,
        fontSize: blk.fontSize ? Number(blk.fontSize) : undefined,
        fontWeight: blk.fontWeight || undefined,
        marginBottom: 8,
      };
      return (
        <div
          key={`b_txt_${idx}`}
          style={style}
          dangerouslySetInnerHTML={{ __html: blk.html }}
        />
      );
    }
    if (t === 'line') {
      const h = Math.max(1, Number(blk.thickness || 2));
      const style = {
        border: 'none',
        height: h,
        background: blk.color || '#cbd5e1',
        margin: `${blk.marginY ?? 8}px 0`,
      };
      return <div key={`b_line_${idx}`} style={style} />;
    }
    return null;
  };

  const renderFieldControl = (fieldObj, labelStyleOverride) => {
    const meta = fieldObj.fieldMeta || {};
    const colName = meta.column || meta.field || "";
    const label = meta.label || titleCase(colName);
    const t = String(meta.input_type || meta.data_type || "").toLowerCase();

    const effectiveLabelStyle =
      labelStyleOverride || fieldObj.label_position || globalLabelStyle;

    const options = Array.isArray(meta.option_list) ? meta.option_list : [];

    // ---- Build the actual input control (disabled preview) ----
    const buildControl = (withLabel) => {
      // text / integer / generic
      if (t === "text" || t === "integer" || t === "" || t === "input") {
        return (
          <TextField
            fullWidth
            size="small"
            disabled
            label={withLabel ? label : undefined}
            placeholder={!withLabel ? label : ""}
          />
        );
      }

      if (t === "textarea") {
        return (
          <TextField
            fullWidth
            size="small"
            disabled
            multiline
            minRows={3}
            label={withLabel ? label : undefined}
            placeholder={!withLabel ? "(multi-line text)" : ""}
          />
        );
      }

      if (t === "date") {
        return (
          <TextField
            fullWidth
            size="small"
            disabled
            label={withLabel ? label : undefined}
            placeholder={!withLabel ? "(date)" : ""}
          />
        );
      }

      if (t === "dropdownlist") {
        const opts =
          options.length > 0
            ? options
            : [
                { label: "Option 1", value: "1" },
                { label: "Option 2", value: "2" },
              ];

        return (
          <TextField
            fullWidth
            size="small"
            disabled
            select
            label={withLabel ? label : undefined}
          >
            {opts.map((opt, idx) => (
              <MenuItem key={idx} value={opt.value ?? opt.label}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        );
      }

      if (t === "checkbox") {
        const opts =
          options.length > 0
            ? options
            : [
                { label: "Option 1", value: "1" },
                { label: "Option 2", value: "2" },
              ];

        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-start" }}>
            {opts.map((opt, idx) => (
              <FormControlLabel
                key={idx}
                control={<Checkbox disabled size="small" />}
                label={opt.label}
              />
            ))}
          </Box>
        );
      }

      if (t === "radio") {
       const opts =
         options.length > 0
           ? options
           : [
               { label: "Option 1", value: "1" },
               { label: "Option 2", value: "2" },
             ];

       // Disabled preview of radio options
       return (
         <RadioGroup>
           {opts.map((opt, idx) => (
             <FormControlLabel
               key={idx}
               value={opt.value ?? opt.label}
               control={<Radio size="small" disabled />}
               label={opt.label}
             />
           ))}
         </RadioGroup>
       );
     }

      if (t === "attachment") {
        return (
          <Button
            variant="outlined"
            size="small"
            disabled
            sx={{ textTransform: "none" }}
          >
            Upload attachments
          </Button>
        );
      }

      // fallback – treat as simple text input
      return (
        <TextField
          fullWidth
          size="small"
          disabled
          label={withLabel ? label : undefined}
          placeholder={!withLabel ? "(input)" : ""}
        />
      );
    };

    // SIDE LABELS: label on the left, control on the right
    if (effectiveLabelStyle === "side") {
      return (
        <Box key={colName} sx={{ mb: 1.5 }}>
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {label}
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              {buildControl(false /* label already on the left */)}
            </Grid>
          </Grid>
        </Box>
      );
    }

    // TOP LABELS: label above control (MUI style)
    return (
      <Box key={colName} sx={{ mb: 1.5 }}>
        {buildControl(true /* let control show label */)}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "background.paper",
        ...(layoutDef?.container_style?.border === false
          ? {}
          : {
              border: `${layoutDef?.container_style?.width ?? 1}px solid ${
                layoutDef?.container_style?.color ?? "#d1d5db"
              }`,
              borderRadius: layoutDef?.container_style?.radius ?? 12,
            }),
      }}
    >
      {sections.map((sec, idx) => (
        <Box key={sec.id} sx={{ mb: 3 }}>
          {idx > 0 && (
            <Box
              sx={{
                borderTop: "1px dashed #e5e7eb",
                mb: 1.5,
              }}
            />
          )}
          {sec.title && (
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1.5,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                fontWeight: 600,
                color: "text.secondary",
              }}
            >
              {sec.title}
            </Typography>
          )}

          <Grid container spacing={2}>
            {sec.columns
              .filter((col) => {
                const hasFields = Array.isArray(col.fields) && col.fields.length > 0;
                const hasBlocks = sec.id === 'header' && Array.isArray(col.blocks) && col.blocks.length > 0;
                return Number(col.span) > 0 && (hasFields || hasBlocks);
              })
              .map((col) => (
                <Grid key={col.id} item xs={12} md={col.span * 3}>
                  <Box sx={{ display: "grid", gap: 1.5 }}>
                {sec.id === 'header' && Array.isArray(col.blocks) && col.blocks.map(renderBlock)}
                {col.fields.map((f) => renderFieldControl(f))}
              </Box>
            </Grid>
              ))}
            {/* Buttons and attachments belong to Details (main) section */}
            {sec.id === "main" && step && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: "1px dashed #e5e7eb",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    justifyContent: "flex-end",
                  }}
                >
                  {step.attachments_allowed &&
                    step.attachments_allowed !== "none" && (
                      <Button
                        variant="outlined"
                        size="small"
                        disabled
                        sx={{ textTransform: "none" }}
                      >
                        Upload attachments
                      </Button>
                    )}

                  {step.step_type === "create" && (
                    <Button
                      variant="contained"
                      size="small"
                      disabled
                      sx={{ textTransform: "none" }}
                    >
                      {step.approve_button_name || "Submit"}
                    </Button>
                  )}

                  {step.step_type === "update" && (
                    <>
                      <Button
                        variant="contained"
                        size="small"
                        disabled
                        sx={{ textTransform: "none" }}
                      >
                        {step.approve_button_name || "Approve"}
                      </Button>
                      {step.step_action === "approve" &&
                        (step.reject_button_name || "Reject") && (
                          <Button
                            variant="outlined"
                            size="small"
                            disabled
                            sx={{ textTransform: "none" }}
                          >
                            {step.reject_button_name || "Reject"}
                          </Button>
                        )}
                    </>
                  )}
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
