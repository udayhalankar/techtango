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

const resolveLogoUrl = (headerOverlay = {}) =>
  String(headerOverlay?.logoUrl || headerOverlay?.logoImageUrl || headerOverlay?.logo?.url || "").trim();

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeAttr = (value) => escapeHtml(value).replace(/"/g, "&quot;");

const injectHeaderOverlay = (srcDoc, headerOverlay = {}) => {
  const logoUrl = resolveLogoUrl(headerOverlay);
  if (!logoUrl && !headerOverlay?.visible && !headerOverlay?.showHeader) {
    return srcDoc;
  }

  const headerTitle = String(headerOverlay?.logoText || headerOverlay?.brandName || headerOverlay?.pageTitle || headerOverlay?.title || "Tymebound").trim();
  const overlayHtml = `
    <div style="position:sticky;top:0;z-index:9999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#0b4a8b;color:#fff;border-bottom:1px solid rgba(255,255,255,.12);box-shadow:0 2px 8px rgba(29,62,120,.12);">
      <div style="display:flex;align-items:center;gap:12px;min-width:0;">
      ${logoUrl ? `<img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(headerTitle)}" style="display:block;max-height:42px;max-width:220px;object-fit:contain;flex-shrink:0;" />` : ""}
      </div>
      <button type="button" aria-label="Header options" style="width:28px;height:28px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.14);color:#fff;font-size:18px;line-height:1;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">⋮</button>
    </div>
  `;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(srcDoc, "text/html");
    const body = doc.body;
    if (!body) return srcDoc;

    if (body.firstElementChild) {
      body.firstElementChild.remove();
    }

    body.insertAdjacentHTML("afterbegin", overlayHtml);
    return `<!doctype html>${doc.documentElement.outerHTML}`;
  } catch {
    if (/<body[^>]*>/i.test(srcDoc)) {
      return srcDoc.replace(/<body([^>]*)>/i, `<body$1>${overlayHtml}`);
    }

    return srcDoc.replace(/<\/head>/i, `</head><body>${overlayHtml}`);
  }
};

const HtmlPreviewRenderer = ({ html, headerOverlay = null }) => {
  const srcDoc = useMemo(() => injectHeaderOverlay(ensureDocumentHtml(html), headerOverlay || {}), [html, headerOverlay]);

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
