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

    {/* TOP HEADER / ACTION BAR */}
    <Box
      sx={{
        minHeight: 44,
        px: 1.25,
        py: 0.75,

        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",

        flexWrap: "wrap",
        gap: 1,

        borderBottom: "1px solid #dce6ed",
        bgcolor: "#f8fbfd",
      }}
    >
      <Box>
        <Typography
          sx={{
            fontSize: 10.5,
            fontWeight: 800,
            color: "#17324d",
          }}
        >
          Form Field Configuration
        </Typography>

        <Typography
          sx={{
            mt: 0.15,
            fontSize: 8.2,
            color: "#75899a",
          }}
        >
          {isInitiate
            ? "Configure fields used when creating a record."
            : `Configure fields used by ${stepName || "this step"}.`}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 0.7 }}>
        <Button
          variant="contained"
          size="small"
          onClick={saveFormConfig}
          sx={{
            minHeight: 30,
            px: 1.25,
            borderRadius: "3px",
            textTransform: "none",
            fontSize: 9,
            fontWeight: 700,
            bgcolor: "#0879df",
            boxShadow: "none",

            "&:hover": {
              bgcolor: "#066dc8",
              boxShadow: "none",
            },
          }}
        >
          Save Fields
        </Button>

        {isInitiate && (
          <Button
            variant="outlined"
            size="small"
            onClick={handleApplyAllSteps}
            disabled={loadingForm || applyingAll}
            sx={{
              minHeight: 30,
              px: 1.15,
              borderRadius: "3px",
              textTransform: "none",
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            {applyingAll ? "Applying..." : "Apply to All Steps"}
          </Button>
        )}
      </Box>
    </Box>


    {/* ======================================================
        INNER FORM CONTENT
        THIS CREATES THE LEFT / RIGHT SPACING
    ====================================================== */}

    <Box
      sx={{
        px: 1.5,
        py: 1.4,
      }}
    >
      {loadingForm && (
        <Typography
          variant="body2"
          sx={{ py: 1 }}
        >
          Loading columns.
        </Typography>
      )}

      {!loadingForm &&
        formRows.length === 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderStyle: "dashed",
              borderRadius: "4px",
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

  </Box>
);
}
