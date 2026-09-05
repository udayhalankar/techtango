import React from "react";
import {
  Autocomplete,
  Box,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

const LABEL_SX = {
  display: "block",

  mb: "5px",
  ml: "1px",

  fontSize: "8px",

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
  },

  "& .MuiInputBase-input": {
    py: "6px",
    px: "9px",

    fontSize: "10px",
  },
};

export default function NotificationsRegular({
  local,
  change,
  mailNotificationOptions,
}) {
  return (
    <Box>
      <Typography
        sx={{
          mb: 1.25,

          fontSize: 9,

          fontWeight: 800,

          color: "#17324d",
        }}
      >
        Regular Notifications
      </Typography>

      <Grid
        container
        columnSpacing={1.25}
        rowSpacing={1}
      >
        <Grid
          item
          xs={12}
          md={4}
        >
          <Typography sx={LABEL_SX}>
            Select Users To Notify
          </Typography>

          <Autocomplete
            multiple
            limitTags={1}
            size="small"
            fullWidth
            options={
              mailNotificationOptions
            }
            getOptionLabel={(
              option
            ) =>
              option.email
                ? `${option.label} (${option.email})`
                : option.label
            }
            value={mailNotificationOptions.filter(
              (user) =>
                Array.isArray(
                  local.mail_notification_users
                )
                  ? local.mail_notification_users
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
                "mail_notification_users",
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
                          key={`notify-${String(option.id)}`}
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
                sx={CONTROL_SX}
              />
            )}
          />
        </Grid>

        <Grid
          item
          xs={12}
          md={8}
        >
          <Typography sx={LABEL_SX}>
            Subject
          </Typography>

          <TextField
            fullWidth
            size="small"
            value={
              local.mail_notification_subject ||
              ""
            }
            onChange={(e) =>
              change(
                "mail_notification_subject",
                e.target.value
              )
            }
            placeholder="Enter notification subject"
            sx={CONTROL_SX}
          />
        </Grid>
      </Grid>
    </Box>
  );
}