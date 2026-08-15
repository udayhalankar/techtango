import React, { useMemo } from "react";
import { Box, Paper, Typography } from "@mui/material";

const ensureDocumentHtml = (html) => {
  const trimmed = String(html || "").trim();
  if (!trimmed) return "";
  if (/<html[\s>]/i.test(trimmed)) return trimmed;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>${trimmed}</body>
</html>`;
};

const HtmlPreviewRenderer = ({ html }) => {
  const srcDoc = useMemo(() => ensureDocumentHtml(html), [html]);

  if (!srcDoc) {
    return (
      <Paper
        elevation={0}
        sx={{
          minHeight: 320,
          border: "1px dashed #d7deea",
          borderRadius: 3,
          bgcolor: "#fff",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Typography sx={{ color: "#5f6f8a" }}>No HTML preview available.</Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #d7deea",
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "#fff",
        boxShadow: "0 16px 36px rgba(29, 62, 120, 0.08)",
      }}
    >
      <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid #d7deea", bgcolor: "#f8fbff" }}>
        <Typography sx={{ fontWeight: 800, color: "#16233b" }}>HTML Preview</Typography>
        <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
          Rendered directly from the AI-produced HTML inside a sandboxed iframe.
        </Typography>
      </Box>
      <Box sx={{ width: "100%", height: { xs: "calc(100vh - 340px)", md: "calc(100vh - 300px)" }, minHeight: 900 }}>
        <Box
          component="iframe"
          title="AI HTML preview"
          srcDoc={srcDoc}
          sandbox=""
          sx={{
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
            bgcolor: "#fff",
          }}
        />
      </Box>
    </Paper>
  );
};

export default HtmlPreviewRenderer;
