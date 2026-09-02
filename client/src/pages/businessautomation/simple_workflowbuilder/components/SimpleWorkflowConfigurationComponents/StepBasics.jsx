import React from "react";
import {
  Box,
  Grid,
  TextField,
  Tooltip,
  Autocomplete,
  Typography,
} from "@mui/material";

const LABEL_SX = {
  display: "block",
  mb: "5px",
  ml: "1px",

  fontSize: "8px",
  lineHeight: 1,

  fontWeight: 800,
  letterSpacing: ".35px",
  textTransform: "uppercase",

  color: "#5d7184",
};

const CONTROL_SX = {
  "& .MuiOutlinedInput-root": {
    minHeight: 31,
    bgcolor: "#ffffff",
    borderRadius: "6px",

    "& fieldset": {
      borderColor: "#bfd1e0",
    },

    "&:hover fieldset": {
      borderColor: "#9ebbd1",
    },

    "&.Mui-focused fieldset": {
      borderColor: "#62a8d8",
      borderWidth: "1px",
    },

    "&.Mui-disabled": {
      bgcolor: "#fafafa",

      "& fieldset": {
        borderColor: "#e1e5e8",
      },
    },
  },

  "& .MuiInputBase-input": {
    px: 1,
    py: "6px",
    fontSize: "10px",
    color: "#29435a",
  },

  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: "#8d969e",
    color: "#8d969e",
  },

  "& .MuiSelect-select.Mui-disabled": {
    WebkitTextFillColor: "#8d969e",
    color: "#8d969e",
  },
};

export default function StepBasics({
  local,
  change,
  isInitiate,
  isTerminate,
  performerOptions,
}) {
  return (
    <Box
      sx={{
        border: "1px solid #cfddea",
        borderRadius: "11px",
        overflow: "hidden",
        bgcolor: "#ffffff",
      }}
    >
      {/* SECTION HEADER */}

      <Box
        sx={{
          height: 28,
          px: 1.35,

          display: "flex",
          alignItems: "center",
          gap: 0.75,

          background:
            "linear-gradient(#ffffff,#eceeef)",

          borderBottom:
            "1px solid #cfddea",
        }}
      >
        <Box
          sx={{
            width: 13,
            textAlign: "center",
            color: "#0d4f82",
            fontSize: 10,
          }}
        >
          ▣
        </Box>

        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 800,
            color: "#0d4f82",
          }}
        >
          Basic Info
        </Typography>
      </Box>

      {/* BODY */}

      <Box sx={{ p: "12px 11px 11px" }}>
        <Grid
          container
          columnSpacing={1.25}
          rowSpacing={1.25}
        >
          <Grid
            item
            xs={12}
            md={
              isInitiate ||
              isTerminate
                ? 9
                : 8
            }
          >
            <Typography sx={LABEL_SX}>
              Step Name
            </Typography>

            <TextField
              fullWidth
              size="small"
              required
              value={
                local.step_name || ""
              }
              onChange={(e) =>
                change(
                  "step_name",
                  e.target.value
                )
              }
              disabled={
                isInitiate ||
                isTerminate
              }
              placeholder="Enter step name"
              sx={CONTROL_SX}
            />
          </Grid>

          <Grid
            item
            xs={12}
            md={
              isInitiate ||
              isTerminate
                ? 3
                : 4
            }
          >
            <Typography sx={LABEL_SX}>
              Step No
            </Typography>

            <TextField
              fullWidth
              size="small"
              type="number"
              value={
                Number(
                  local.step_no
                ) || 0
              }
              disabled
              sx={CONTROL_SX}
            />
          </Grid>

          {!isInitiate && (
            <>
              <Grid
                item
                xs={12}
                md={8}
              >
                <Typography
                  sx={LABEL_SX}
                >
                  Step Performer
                </Typography>

                <Tooltip
                  arrow
                  placement="top"
                  title="Assign a single user or choose Initiator so the step is performed by whoever started this workflow."
                >
                  <Autocomplete
                    size="small"
                    fullWidth
                    options={
                      performerOptions
                    }
                    getOptionLabel={(
                      option
                    ) =>
                      option.email
                        ? `${option.label} (${option.email})`
                        : option.label
                    }
                    value={
                      performerOptions.find(
                        (opt) =>
                          Number(
                            opt.id
                          ) ===
                          (Number.isFinite(
                            Number(
                              local.step_performer
                            )
                          )
                            ? Number(
                                local.step_performer
                              )
                            : NaN)
                      ) || null
                    }
                    onChange={(
                      _,
                      value
                    ) =>
                      change(
                        "step_performer",
                        value
                          ? Number(
                              value.id
                            )
                          : null
                      )
                    }
                    isOptionEqualToValue={(
                      option,
                      value
                    ) =>
                      option.id ===
                      value.id
                    }
                    renderInput={(
                      params
                    ) => (
                      <TextField
                        {...params}
                        placeholder="Select performer"
                        sx={
                          CONTROL_SX
                        }
                      />
                    )}
                  />
                </Tooltip>
              </Grid>

              <Grid
                item
                xs={12}
                md={4}
              >
                <Typography
                  sx={LABEL_SX}
                >
                  Step Due (Days)
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  inputProps={{
                    min: 1,
                  }}
                  value={
                    Number(
                      local.step_due_in_days
                    ) || 1
                  }
                  onChange={(e) =>
                    change(
                      "step_due_in_days",
                      Number(
                        e.target.value
                      )
                    )
                  }
                  sx={CONTROL_SX}
                />
              </Grid>
            </>
          )}
        </Grid>
      </Box>
    </Box>
  );
}