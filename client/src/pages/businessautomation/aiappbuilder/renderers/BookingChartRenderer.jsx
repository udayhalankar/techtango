import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

const normalizeRecord = (record) => ({
  id: record?.id ?? record?.transaction_id,
  ...(record?.transaction_data || {}),
});

const toDateKey = (date) => date.toISOString().slice(0, 10);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getMonday = (date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = next.getDate() - day + (day === 0 ? -6 : 1);
  next.setDate(diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

const defaultTimes = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

const getFieldValue = (row, names) => {
  for (const name of names) {
    if (row?.[name] !== undefined && row?.[name] !== null && row?.[name] !== "") {
      return row[name];
    }
  }
  return "";
};

export default function BookingChartRenderer({ schema, records = [] }) {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));

  const rows = useMemo(() => records.map(normalizeRecord), [records]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const rooms = useMemo(() => {
    const values = rows
      .map((row) => getFieldValue(row, ["room", "room_name", "room_no", "resource", "resource_name"]))
      .filter(Boolean);

    return Array.from(new Set(values)).sort();
  }, [rows]);

  const bookingLookup = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      const room = getFieldValue(row, ["room", "room_name", "room_no", "resource", "resource_name"]);
      const date = getFieldValue(row, ["booking_date", "date", "slot_date"]);
      const time = getFieldValue(row, ["start_time", "booking_time", "time", "slot_time"]);

      if (!room || !date || !time) return;

      const dateKey = String(date).slice(0, 10);
      const timeKey = String(time).slice(0, 5);
      map.set(`${room}|${dateKey}|${timeKey}`, row);
    });

    return map;
  }, [rows]);

  return (
    <Stack gap={0}>
      <Box
        sx={{
          px: 3,
          py: 2,
          background: "linear-gradient(135deg, #f8fbff 0%, #eef5ff 100%)",
          borderBottom: "1px solid #dbeafe",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#0f2f57", lineHeight: 1.15 }}>
              {schema?.title || "Booking Slot View"}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 12.5, color: "#64748b" }}>
              Source: {schema?.sourceTable || "Not selected"} | Bookings: {rows.length}
            </Typography>
          </Box>

          <Stack direction="row" gap={0.75} flexWrap="wrap">
            <Button
              variant="outlined"
              size="small"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              sx={{ minHeight: 34, px: 1.6, fontSize: 11.5, textTransform: "none" }}
            >
              Previous Week
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setWeekStart(getMonday(new Date()))}
              sx={{ minHeight: 34, px: 1.6, fontSize: 11.5, textTransform: "none" }}
            >
              This Week
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              sx={{ minHeight: 34, px: 1.6, fontSize: 11.5, textTransform: "none" }}
            >
              Next Week
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 3 }}>
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #e2e8f0",
            borderRadius: 2.5,
            overflow: "auto",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}
        >
          <Box sx={{ minWidth: 1200 }}>
            <Grid
              container
              sx={{
                bgcolor: "#0f2f57",
                color: "#ffffff",
                fontWeight: 800,
                position: "sticky",
                top: 0,
                zIndex: 2,
              }}
            >
              <Grid item xs={1.4} sx={{ p: 1, borderRight: "1px solid rgba(255,255,255,0.12)", fontSize: 13 }}>
                Room
              </Grid>

              {weekDays.map((day) => (
                <Grid item xs key={toDateKey(day)} sx={{ p: 1, borderRight: "1px solid rgba(255,255,255,0.12)", fontSize: 13 }}>
                  {day.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                </Grid>
              ))}
            </Grid>

            {(rooms.length ? rooms : ["No room data"]).map((room) => (
              <Grid container key={room} sx={{ borderBottom: "1px solid #e2e8f0" }}>
                <Grid
                  item
                  xs={1.4}
                  sx={{
                    p: 1,
                    bgcolor: "#f8fafc",
                    borderRight: "1px solid #e2e8f0",
                    fontWeight: 800,
                    color: "#0f2f57",
                    fontSize: 13,
                  }}
                >
                  {room}
                </Grid>

                {weekDays.map((day) => (
                  <Grid item xs key={`${room}-${toDateKey(day)}`} sx={{ p: 0.75, borderRight: "1px solid #e2e8f0" }}>
                    <Stack gap={0.5}>
                      {defaultTimes.map((time) => {
                        const booking = bookingLookup.get(`${room}|${toDateKey(day)}|${time}`);
                        return (
                          <Box
                            key={`${room}-${toDateKey(day)}-${time}`}
                            sx={{
                              p: 0.5,
                              borderRadius: 1.25,
                              border: booking ? "1px solid #fbcaca" : "1px solid #cdeed6",
                              bgcolor: booking ? "#fff7f7" : "#f9fdf9",
                              minHeight: 38,
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                              <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#334155", lineHeight: 1 }}>
                                {time}
                              </Typography>
                              <Chip
                                size="small"
                                label={booking ? "Occupied" : "Available"}
                                sx={{
                                  height: 18,
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  bgcolor: booking ? "#fde8e8" : "#e7f7ea",
                                  color: booking ? "#9f1239" : "#166534",
                                  "& .MuiChip-label": { px: 0.75 },
                                }}
                              />
                            </Stack>

                            {booking ? (
                              <Typography sx={{ mt: 0.35, fontSize: 10.5, color: "#64748b", lineHeight: 1.15 }}>
                                {getFieldValue(booking, ["booked_by", "customer_name", "requested_by", "title", "meeting_agenda"]) || "Booked"}
                              </Typography>
                            ) : null}
                          </Box>
                        );
                      })}
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            ))}
          </Box>
        </Paper>
      </Box>
    </Stack>
  );
}
