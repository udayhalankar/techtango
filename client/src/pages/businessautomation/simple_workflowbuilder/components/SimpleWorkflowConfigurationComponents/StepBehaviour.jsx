import React from "react";
import {
  Box,
  Grid,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  TextField,
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

export default function StepBehaviour({
  local,
  change,
  mode,
  setMode,
  isInitiate,
  stepsLessThanCurrent,
  ATTACH_MODE_OPTIONS,
}) {
  return (
    <Box
      sx={{
        border:
          "1px solid #cfddea",

        borderRadius: "9px",

        overflow: "hidden",

        bgcolor: "#ffffff",
      }}
    >
      {/* HEADER */}

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

            textAlign:
              "center",

            fontSize: 10,

            color: "#0d4f82",
          }}
        >
          ⚙
        </Box>

        <Typography
          sx={{
            fontSize: 12,

            fontWeight: 800,

            color: "#0d4f82",
          }}
        >
          Behaviour
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
            md={9}
          >
            <Typography sx={LABEL_SX}>
              Attachment Rule
            </Typography>

            <FormControl
              fullWidth
              size="small"
              sx={CONTROL_SX}
            >
              <Select
                value={
                  local.attachments_allowed ||
                  "none"
                }
                onChange={(e) =>
                  change(
                    "attachments_allowed",
                    e.target.value
                  )
                }
              >
                {ATTACH_MODE_OPTIONS.map(
                  (option) => (
                    <MenuItem
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid
            item
            xs={12}
            md={3}
          >
            <Typography sx={LABEL_SX}>
              Step Action
            </Typography>

            <FormControl
              fullWidth
              size="small"
              sx={CONTROL_SX}
            >
              {isInitiate ? (
                <Select
                  value="create"
                  disabled
                >
                  <MenuItem value="create">
                    Create
                  </MenuItem>
                </Select>
              ) : (
                <Select
                  value={mode}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setMode(value);

                    change(
                      "step_action",
                      value
                    );
                  }}
                >
                  <MenuItem value="approve">
                    Approve
                  </MenuItem>

                  <MenuItem value="send">
                    Send
                  </MenuItem>
                </Select>
              )}
            </FormControl>
          </Grid>

          {!isInitiate && (
            <>
              <Grid
                item
                xs={12}
                md={6}
              >
                <Typography
                  sx={LABEL_SX}
                >
                  Allow Review
                </Typography>

                <FormControl
                  fullWidth
                  size="small"
                  sx={CONTROL_SX}
                >
                  <Select
                    value={
                      mode ===
                      "send"
                        ? "0"
                        : local.review_allowed
                          ? "1"
                          : "0"
                    }
                    onChange={(e) =>
                      change(
                        "review_allowed",
                        e.target
                          .value ===
                          "1"
                      )
                    }
                    disabled={
                      mode ===
                      "send"
                    }
                  >
                    <MenuItem value="1">
                      Yes
                    </MenuItem>

                    <MenuItem value="0">
                      No
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid
                item
                xs={12}
                md={6}
              >
                <Typography
                  sx={LABEL_SX}
                >
                  Next Step On
                  Reject
                </Typography>

                <Tooltip
                  arrow
                  placement="top"
                  title={
                    mode ===
                    "send"
                      ? "Disabled because Step Action is Send."
                      : "Required when Step Action is Approve."
                  }
                >
                  <FormControl
                    fullWidth
                    size="small"
                    required={
                      mode ===
                      "approve"
                    }
                    disabled={
                      mode ===
                      "send"
                    }
                    sx={CONTROL_SX}
                  >
                    <Select
                      value={
                        local.next_step_after_reject ??
                        ""
                      }
                      onChange={(
                        e
                      ) =>
                        change(
                          "next_step_after_reject",
                          e.target
                            .value ===
                            ""
                            ? null
                            : Number(
                                e
                                  .target
                                  .value
                              )
                        )
                      }
                    >
                      <MenuItem value="">
                        <em>
                          Select previous
                          step
                        </em>
                      </MenuItem>

                      {(
                        stepsLessThanCurrent ||
                        []
                      ).map(
                        (
                          option
                        ) => (
                          <MenuItem
                            key={
                              option.step_no
                            }
                            value={
                              option.step_no
                            }
                          >
                            {
                              option.label
                            }
                          </MenuItem>
                        )
                      )}
                    </Select>
                  </FormControl>
                </Tooltip>
              </Grid>

              <Grid
                item
                xs={12}
                md={6}
              >
                <Typography
                  sx={LABEL_SX}
                >
                  Approve Button Text
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  value={
                    mode ===
                    "send"
                      ? "Send"
                      : local.approve_button_name ??
                        ""
                  }
                  disabled={
                    mode ===
                    "send"
                  }
                  onChange={(e) =>
                    change(
                      "approve_button_name",
                      e.target.value
                    )
                  }
                  sx={CONTROL_SX}
                />
              </Grid>

              {mode ===
                "approve" && (
                <Grid
                  item
                  xs={12}
                  md={6}
                >
                  <Typography
                    sx={
                      LABEL_SX
                    }
                  >
                    Reject Button
                    Text
                  </Typography>

                  <TextField
                    fullWidth
                    size="small"
                    value={
                      local.reject_button_name ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        "reject_button_name",
                        e.target
                          .value
                      )
                    }
                    sx={
                      CONTROL_SX
                    }
                  />
                </Grid>
              )}
            </>
          )}
        </Grid>
      </Box>
    </Box>
  );
}