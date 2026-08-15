import React from "react";
import { Grid, Paper, Typography, FormControl, InputLabel, Select, MenuItem, Tooltip, TextField } from "@mui/material";

export default function StepBehaviour({
  local,
  change,
  mode,
  setMode,
  isInitiate,
  stepsLessThanCurrent,
  blueLabelSx,
  inputWhiteSx,
  ATTACH_MODE_OPTIONS,
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        pt: 1.25,
        bgcolor: "grey.50",
        borderRadius: 2,
        height: "100%",
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: "brown", fontWeight: 600, letterSpacing: 0.8 }}
      >
        Behaviour
      </Typography>

      <Grid container spacing={2} sx={{ mt: 0.1 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth sx={inputWhiteSx} size="small">
            <InputLabel
              sx={{
                color: "primary.main",
                "&.Mui-focused": { color: "primary.main" },
              }}
            >
              Attachments rule
            </InputLabel>
            <Select
              label="Attachments rule"
              value={local.attachments_allowed || "none"}
              onChange={(e) => change("attachments_allowed", e.target.value)}
            >
              {ATTACH_MODE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth sx={inputWhiteSx} size="small">
            <InputLabel
              sx={{
                color: "primary.main",
                "&.Mui-focused": { color: "primary.main" },
              }}
            >
              Step action
            </InputLabel>
            {isInitiate ? (
              <Select label="Step action" value="create" disabled>
                <MenuItem value="create">Create</MenuItem>
              </Select>
            ) : (
              <Select
                label="Step action"
                value={mode}
                onChange={(e) => {
                  const v = e.target.value;
                  setMode(v);
                  change("step_action", v);
                }}
              >
                <MenuItem value="approve">Approve</MenuItem>
                <MenuItem value="send">Send</MenuItem>
              </Select>
            )}
          </FormControl>
        </Grid>

        {!isInitiate && (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={inputWhiteSx} size="small">
                <InputLabel
                  sx={{
                    color: "primary.main",
                    "&.Mui-focused": { color: "primary.main" },
                  }}
                >
                  Allow review
                </InputLabel>
                <Select
                  label="Allow review"
                  value={mode === "send" ? "0" : local.review_allowed ? "1" : "0"}
                  onChange={(e) => change("review_allowed", e.target.value === "1")}
                  disabled={mode === "send"}
                >
                  <MenuItem value="1">Yes</MenuItem>
                  <MenuItem value="0">No</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Tooltip
                arrow
                placement="top"
                title={
                  mode === "send"
                    ? "Disabled because Step Action is Send. Switch to Approve to set a reject path."
                    : "Required when Step Action is Approve."
                }
              >
                <FormControl fullWidth sx={inputWhiteSx} size="small" required={mode === "approve"} disabled={mode === "send"}>
                  <InputLabel
                    sx={{
                      color: "primary.main",
                      "&.Mui-focused": { color: "primary.main" },
                    }}
                  >
                    Next step on reject
                  </InputLabel>

                  <Select
                    label="Next step on reject"
                    disabled={mode === "send"}
                    value={local.next_step_after_reject ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      change(
                        "next_step_after_reject",
                        v === "" ? null : Number(v)
                      );
                    }}
                  >
                    <MenuItem value="">
                      <em>- Required -</em>
                    </MenuItem>
                    {(stepsLessThanCurrent || []).map((opt) => (
                      <MenuItem key={opt.step_no} value={opt.step_no}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Tooltip>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Approve button text"
                fullWidth
                size="small"
                value={mode === "send" ? "Send" : local.approve_button_name ?? ""}
                disabled={mode === "send"}
                onChange={(e) => change("approve_button_name", e.target.value)}
                InputLabelProps={{
                  sx: {
                    color: "primary.main",
                    "&.Mui-focused": { color: "primary.main" },
                  },
                }}
                sx={inputWhiteSx}
              />
            </Grid>

            {mode === "approve" && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="Reject button text"
                  fullWidth
                  size="small"
                  value={local.reject_button_name ?? ""}
                  onChange={(e) => change("reject_button_name", e.target.value)}
                  InputLabelProps={{
                    sx: {
                      color: "primary.main",
                      "&.Mui-focused": { color: "primary.main" },
                    },
                  }}
                  sx={inputWhiteSx}
                />
              </Grid>
            )}
          </>
        )}
      </Grid>
    </Paper>
  );
}
