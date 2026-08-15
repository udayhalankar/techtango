import React from "react";
import {
  Autocomplete,
  Box,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

export default function NotificationsRegular({
  local,
  change,
  mailNotificationOptions,
  blueLabelSx,
  inputWhiteSx,
}) {
  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Regular notifications
      </Typography>
      <Grid container spacing={2}>
    {/* Mail notifications */}
    <Grid item xs={12} md={6}>
      <Autocomplete
        multiple
        limitTags={1}
        size="small"
        fullWidth
        options={mailNotificationOptions}
        getOptionLabel={(option) =>
          option.email
            ? `${option.label} (${option.email})`
            : option.label
        }
        value={mailNotificationOptions.filter((u) =>
          Array.isArray(local.mail_notification_users)
            ? local.mail_notification_users
                .map((v) => Number(v))
                .includes(u.id)
            : false
        )}
        onChange={(_, newValue) =>
          change(
            "mail_notification_users",
            newValue.map((u) => u.id)
          )
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Mail notifications (multi-select)"
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

    {/* Subject */}
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        size="small"
        label="Regular notification subject"
        multiline
        minRows={2}
        value={local.mail_notification_subject || ""}
        onChange={(e) =>
          change("mail_notification_subject", e.target.value)
        }
        InputLabelProps={{ sx: blueLabelSx }}
        sx={inputWhiteSx}
      />
    </Grid>
      </Grid>
    </Box>
  );
}
