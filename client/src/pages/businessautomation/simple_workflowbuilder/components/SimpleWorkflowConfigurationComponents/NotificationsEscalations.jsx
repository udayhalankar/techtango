import React from "react";
import {
  Autocomplete,
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

export default function NotificationsEscalations({
  local,
  change,
  userOpts,
  blueLabelSx,
  inputWhiteSx,
}) {
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
        Escalations
      </Typography>
      <Grid container spacing={2}>
        {[1, 2, 3].map((idx) => {
          const enabledKey = `escalation${idx}_enabled`;
          const daysKey = `escalation${idx}_days`;
          const usersKey = `escalation${idx}_users`;
          const subjectKey = `escalation${idx}_subject`;

          const enabled = !!local[enabledKey];

          return (
            <React.Fragment key={idx}>
              {/* Enable + days */}
              <Grid item xs={12} md={6}>
                <Box
                  onClick={() => change(enabledKey, !enabled)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    width: "100%",
                    flexWrap: "nowrap",
                    cursor: "pointer",
                    userSelect: "none",
                    pointerEvents: "auto",
                    zIndex: 1,
                  }}
                >
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={enabled}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => change(enabledKey, e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ minWidth: 95 }}>
                        {`Escalation ${idx}:`}
                      </Typography>
                    }
                  />

                  <TextField
                    size="small"
                    value={local[daysKey] ?? ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      change(
                        daysKey,
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    sx={{ width: 90 }}
                    disabled={!enabled}
                    InputProps={{
                      inputProps: { inputMode: "numeric", pattern: "[0-9]*" },
                    }}
                  />

                  <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                    day(s) overdue
                  </Typography>
                </Box>
              </Grid>

              {/* Users (right, aligned with Regular subject column) */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  limitTags={1}
                  size="small"
                  fullWidth
                  disabled={!enabled}
                  options={userOpts}
                  getOptionLabel={(option) =>
                    option.email
                      ? `${option.label} (${option.email})`
                      : option.label
                  }
                  value={userOpts.filter((u) =>
                    Array.isArray(local[usersKey])
                      ? local[usersKey].map((v) => Number(v)).includes(u.id)
                      : false
                  )}
                  onChange={(_, newValue) =>
                    change(
                      usersKey,
                      newValue.map((u) => u.id)
                    )
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={`Escalate to (Escalation ${idx})`}
                      multiline
                      minRows={2}
                      InputLabelProps={{
                        ...params.InputLabelProps,
                        sx: blueLabelSx,
                      }}
                      sx={inputWhiteSx}
                    />
                  )}
                />
              </Grid>

              {/* Subject (full width) */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  disabled={!enabled}
                  label={`Escalation ${idx} Subject`}
                  multiline
                  minRows={2}
                  value={local[subjectKey] || ""}
                  onChange={(e) => change(subjectKey, e.target.value)}
                  InputLabelProps={{ sx: blueLabelSx }}
                  sx={inputWhiteSx}
                />
              </Grid>

              {/* small gap between blocks */}
              {idx !== 3 && (
                <Grid item xs={12}>
                  <Box sx={{ height: 6 }} />
                </Grid>
              )}
            </React.Fragment>
          );
        })}
      </Grid>
    </Box>
  );
}
