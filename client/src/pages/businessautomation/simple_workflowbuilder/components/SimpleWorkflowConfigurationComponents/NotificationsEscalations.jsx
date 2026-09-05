import React from "react";
import {
  Autocomplete,
  Box,
  Checkbox,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

const LABEL_SX = {
  fontSize: "8px",
  fontWeight: 700,
  color: "#64798c",
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
      bgcolor: "#f6f8fa",
    },
  },

  "& .MuiInputBase-input": {
    py: "6px",

    fontSize: "10px",
  },
};

export default function NotificationsEscalations({
  local,
  change,
  userOpts,
}) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        sx={{
          mb: 1,

          fontSize: 9,

          fontWeight: 800,

          color: "#d4493f",
        }}
      >
        Escalations
      </Typography>

      {/* COLUMN HEADERS */}

      <Box
        sx={{
          display: {
            xs: "none",
            md: "grid",
          },

          gridTemplateColumns:
            "125px 92px 190px minmax(0,1fr)",

          gap: 1,

          px: "2px",
          mb: 0.6,
        }}
      >
        <Typography sx={LABEL_SX}>
          Escalation No
        </Typography>

        <Typography sx={LABEL_SX}>
          Days Overdue
        </Typography>

        <Typography sx={LABEL_SX}>
          Select Users To Notify
        </Typography>

        <Typography sx={LABEL_SX}>
          Subject
        </Typography>
      </Box>

      {[1, 2, 3].map(
        (idx) => {
          const enabledKey =
            `escalation${idx}_enabled`;

          const daysKey =
            `escalation${idx}_days`;

          const usersKey =
            `escalation${idx}_users`;

          const subjectKey =
            `escalation${idx}_subject`;

          const enabled =
            Boolean(
              local[
                enabledKey
              ]
            );

          return (
            <Box
              key={idx}
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",
                  md:
                    "125px 92px 190px minmax(0,1fr)",
                },

                gap: 1,

                mb: 0.85,

                alignItems:
                  "center",
              }}
            >
              {/* ENABLE */}

              <Box
                sx={{
                  height: 31,

                  px: 0.8,

                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap: 0.6,

                  border:
                    "1px solid #bfd1e0",

                  borderRadius:
                    "6px",

                  bgcolor:
                    "#ffffff",

                  cursor:
                    "pointer",
                }}
                onClick={() =>
                  change(
                    enabledKey,
                    !enabled
                  )
                }
              >
                <Checkbox
                  size="small"
                  checked={
                    enabled
                  }
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  onChange={(e) =>
                    change(
                      enabledKey,
                      e.target
                        .checked
                    )
                  }
                  sx={{
                    p: 0.2,

                    "& .MuiSvgIcon-root":
                      {
                        fontSize:
                          16,
                      },
                  }}
                />

                <Typography
                  sx={{
                    fontSize:
                      9.5,

                    color:
                      "#617487",
                  }}
                >
                  Escalation{" "}
                  {idx}
                </Typography>
              </Box>

              {/* DAYS */}

              <TextField
                size="small"
                disabled={
                  !enabled
                }
                value={
                  local[
                    daysKey
                  ] ?? ""
                }
                onChange={(e) =>
                  change(
                    daysKey,
                    e.target
                      .value ===
                      ""
                      ? null
                      : Number(
                          e.target
                            .value
                        )
                  )
                }
                placeholder="Days"
                inputProps={{
                  inputMode:
                    "numeric",
                  pattern:
                    "[0-9]*",
                }}
                sx={CONTROL_SX}
              />

              {/* USERS */}

              <Autocomplete
                multiple
                limitTags={1}
                size="small"
                fullWidth
                disabled={
                  !enabled
                }
                options={
                  userOpts
                }
                getOptionLabel={(
                  option
                ) =>
                  option.email
                    ? `${option.label} (${option.email})`
                    : option.label
                }
                value={userOpts.filter(
                  (user) =>
                    Array.isArray(
                      local[
                        usersKey
                      ]
                    )
                      ? local[
                          usersKey
                        ]
                          .map(
                            Number
                          )
                          .includes(
                            user.id
                          )
                      : false
                )}
                onChange={(
                  _,
                  newValue
                ) =>
                  change(
                    usersKey,
                    newValue.map(
                      (user) =>
                        user.id
                    )
                  )
                }
                isOptionEqualToValue={(option, value) =>
                      Number(option.id) === Number(value.id)
                    }
                    renderOption={(props, option) => {
                      const { key: _muiKey, ...optionProps } = props;
                      return (
                        <li
                          {...optionProps}
                          key={`escalation-${idx}-${String(option.id)}`}
                        >
                          {option.email
                            ? `${option.label} (${option.email})`
                            : option.label}
                        </li>
                      );
                    }}
                    renderInput={(
                  params
                ) => (
                  <TextField
                    {...params}
                    placeholder="Select users"
                    sx={
                      CONTROL_SX
                    }
                  />
                )}
              />

              {/* SUBJECT */}

              <TextField
                fullWidth
                size="small"
                disabled={
                  !enabled
                }
                value={
                  local[
                    subjectKey
                  ] || ""
                }
                onChange={(e) =>
                  change(
                    subjectKey,
                    e.target
                      .value
                  )
                }
                placeholder="Enter subject"
                sx={CONTROL_SX}
              />
            </Box>
          );
        }
      )}
    </Box>
  );
}