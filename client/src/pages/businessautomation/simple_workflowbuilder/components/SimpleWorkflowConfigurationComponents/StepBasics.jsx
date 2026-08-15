import React from "react";
import { Box, Grid, Paper, TextField, Tooltip, Autocomplete, Typography } from "@mui/material";

export default function StepBasics({
  local,
  change,
  isInitiate,
  isTerminate,
  performerOptions,
  blueLabelSx,
  inputWhiteSx,
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        pt: 1.25,
        borderRadius: 2,
        bgcolor: "grey.50",
        height: "100%",
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: "brown", fontWeight: 600, letterSpacing: 0.8 }}
      >
        Basic info
      </Typography>

      <Grid container spacing={2} sx={{ mt: 0.1 }}>
        <Grid item xs={12} md={8}>
          <TextField
            label="Step name"
            required
            fullWidth
            size="small"
            value={local.step_name || ""}
            onChange={(e) => change("step_name", e.target.value)}
            disabled={isInitiate || isTerminate}
            InputLabelProps={{
              sx: blueLabelSx,
            }}
            sx={inputWhiteSx}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="Step no"
            fullWidth
            size="small"
            type="number"
            value={Number(local.step_no) || 0}
            disabled
            InputLabelProps={{
              sx: blueLabelSx,
            }}
          />
        </Grid>

        {!isInitiate && (
          <>
            <Grid item xs={12} md={8}>
              <Tooltip
                arrow
                placement="top"
                title="Assign a single user or choose Initiator so the step is performed by whoever started this workflow."
              >
                <Autocomplete
                  size="small"
                  fullWidth
                  options={performerOptions}
                  getOptionLabel={(option) =>
                    option.email ? `${option.label} (${option.email})` : option.label
                  }
                  value={
                    performerOptions.find(
                      (opt) =>
                        Number(opt.id) ===
                        (Number.isFinite(Number(local.step_performer))
                          ? Number(local.step_performer)
                          : NaN)
                    ) || null
                  }
                  onChange={(_, newValue) => {
                    change("step_performer", newValue ? Number(newValue.id) : null);
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Step performer (user / role)"
                      sx={inputWhiteSx}
                      InputLabelProps={{
                        ...params.InputLabelProps,
                        sx: blueLabelSx,
                      }}
                    />
                  )}
                />
              </Tooltip>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Step due (days)"
                type="number"
                fullWidth
                size="small"
                inputProps={{ min: 1 }}
                value={Number(local.step_due_in_days) || 1}
                onChange={(e) => change("step_due_in_days", Number(e.target.value))}
                InputLabelProps={{
                  sx: {
                    color: "primary.main",
                    "&.Mui-focused": { color: "primary.main" },
                  },
                }}
                sx={inputWhiteSx}
              />
            </Grid>
          </>
        )}
      </Grid>
    </Paper>
  );
}
