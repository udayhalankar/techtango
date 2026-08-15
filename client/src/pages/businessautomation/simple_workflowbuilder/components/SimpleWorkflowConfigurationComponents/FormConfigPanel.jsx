import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import FormFieldCard from "./FormFieldCard";

export default function FormConfigPanel({
  formRows,
  loadingForm,
  saveFormConfig,
  handleApplyAllSteps,
  isInitiate,
  applyingAll,
  onChangeRow,
  inputWhiteSx,
  blueLabelSx,
  ATTACHMENT_TYPE,
  DATE_GRANULARITIES,
  INPUT_TYPES,
  recordId,
  header,
  stepName,
}) {
  return (
    <Box>
      <Box
        sx={{
          mt: 1.5,
          mb: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Manage Form Field Settings for:&nbsp;
          <Box component="span" sx={{ fontWeight: 600 }}>
            {isInitiate ? "Initiate" : stepName || "Step"}
          </Box>
          <Box component="span" sx={{ opacity: 0.7 }}>
            {" "}
            ({isInitiate ? "Insert Record" : "Update Record"})
          </Box>
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="contained" size="small" onClick={saveFormConfig} sx={{ textTransform: "none", borderRadius: 2 }}>
            Save Form Field Configuration
          </Button>
          {isInitiate && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleApplyAllSteps}
              sx={{ textTransform: "none", borderRadius: 2 }}
              disabled={loadingForm || applyingAll}
            >
              {applyingAll ? "Applying..." : "Apply to All Steps"}
            </Button>
          )}
        </Box>
      </Box>

      {loadingForm && (
        <Typography variant="body2" sx={{ py: 1 }}>
          Loading columns.
        </Typography>
      )}

      {!loadingForm && formRows.length === 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderStyle: "dashed",
            borderRadius: 2,
            color: "text.secondary",
          }}
        >
          No columns found for this table.
        </Paper>
      )}

      {!loadingForm &&
        formRows.map((r, idx) => (
          <FormFieldCard
            key={r.column}
            r={r}
            idx={idx}
            isInitiate={isInitiate}
            inputWhiteSx={inputWhiteSx}
            blueLabelSx={blueLabelSx}
            onChangeRow={onChangeRow}
            ATTACHMENT_TYPE={ATTACHMENT_TYPE}
            DATE_GRANULARITIES={DATE_GRANULARITIES}
            INPUT_TYPES={INPUT_TYPES}
            recordId={recordId}
            header={header}
          />
        ))}
    </Box>
  );
}
