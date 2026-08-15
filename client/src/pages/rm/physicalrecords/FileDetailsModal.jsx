// src/components/FileDetailsModal.jsx
import React from "react";
import { Dialog, DialogContent, DialogActions, Typography, Button, Box, Stack } from "@mui/material";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {object|null} props.details - the object to render; can be any keys
 * @param {Array<[string,string]>} [props.fieldOrder] - optional: [key,label] pairs to control order/labels
 * @param {string} [props.softcopyNameKey="softcopy"] - key in details that holds the softcopy name
 */
export default function FileDetailsModal({
  open,
  onClose,
  details,
  fieldOrder,
  softcopyNameKey = "softcopy",
}) {
  if (!open || !details) return null;

  // Build list of [label, value] rows
  const rows = fieldOrder
    ? fieldOrder.map(([key, label]) => [label, details?.[key] ?? "—"])
    : Object.entries(details).map(([k, v]) => [startCase(k), v ?? "—"]);

  const softcopyName = details?.[softcopyNameKey];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent sx={{ display: "flex", gap: 3, minHeight: 600 }}>
        {/* Left column: auto-mapped fields */}
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            File Details
          </Typography>

          <Stack spacing={1}>
            {rows.map(([label, value]) => (
              <Box key={label}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {label}
                </Typography>
                <Typography variant="subtitle2">{String(value)}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Right column: soft copy pane */}
        <Box sx={{ flex: 2, minWidth: 360 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Soft Copy{softcopyName ? `: ${softcopyName}` : ""}
          </Typography>
          <Box
            sx={{
              border: "1px solid #ccc",
              borderRadius: 1,
              minHeight: 550,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#f9f9f9",
              color: "text.secondary",
            }}
          >
            No Softcopy Available
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// helper to turn "deptFileId" -> "Dept File Id" if you don't pass fieldOrder
function startCase(str = "") {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}
