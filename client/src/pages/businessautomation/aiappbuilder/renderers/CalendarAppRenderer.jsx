import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

export default function CalendarAppRenderer({ schema, records }) {
  return (
    <Stack gap={0}>
      <Box sx={{ px: 3.5, py: 2.75, background: "linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%)", borderBottom: "1px solid #dbeafe" }}>
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#0f2f57" }}>
          {schema?.title || "Calendar View"}
        </Typography>
        <Typography sx={{ mt: 0.75, fontSize: 14, color: "#64748b" }}>
          Source: {schema?.sourceTable || "Not selected"} | Events: {records.length}
        </Typography>
      </Box>

      <Box sx={{ p: 3.5 }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f2f57", mb: 1 }}>
            Calendar Renderer Placeholder
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: 13 }}>
            Next step: render calendar rows using calendarConfig dateField, titleField, startTimeField and endTimeField.
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}