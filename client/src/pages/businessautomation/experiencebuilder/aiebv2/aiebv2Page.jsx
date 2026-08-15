import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import api from "../../../../services/api";
import HtmlToReactWidgetCompiler from "./HtmlToReactWidgetCompiler";
import { buildStageOneHtmlPrompt } from "./aiPromptBuilder";

const extractPageName = (brief) => {
  const text = String(brief || "").trim();
  if (!text) return "AI Page";
  const firstLine = text.split(/\r?\n/).find(Boolean) || text;
  return firstLine.length > 48 ? `${firstLine.slice(0, 45).trim()}...` : firstLine;
};

const HtmlFrame = ({ html }) => {
  const srcDoc = useMemo(() => {
    const trimmed = String(html || "").trim();
    if (!trimmed) return "";
    if (/<html[\s>]/i.test(trimmed)) return trimmed;
    return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>${trimmed}</body></html>`;
  }, [html]);

  if (!srcDoc) {
    return (
      <Paper elevation={0} sx={{ minHeight: 240, border: "1px dashed #d7deea", borderRadius: 3, display: "grid", placeItems: "center" }}>
        <Typography sx={{ color: "#5f6f8a" }}>No HTML preview available.</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: "1px solid #d7deea", borderRadius: 3, overflow: "hidden", bgcolor: "#fff" }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid #d7deea", bgcolor: "#f8fbff" }}>
        <Typography sx={{ fontWeight: 800, color: "#16233b" }}>HTML Preview</Typography>
        <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
          Rendered directly from the AI-produced HTML.
        </Typography>
      </Box>
      <Box sx={{ width: "100%", height: { xs: "calc(100vh - 320px)", md: "calc(100vh - 280px)" }, minHeight: 860 }}>
        <Box component="iframe" title="AI HTML preview" srcDoc={srcDoc} sandbox="" sx={{ width: "100%", height: "100%", border: 0, display: "block" }} />
      </Box>
    </Paper>
  );
};

export default function AIEBV2Page() {
  const [brief, setBrief] = useState("Dashboard page with 2 rows: 4 charts and 1 table");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState("html");
  const [htmlPreview, setHtmlPreview] = useState("");

  const generate = async () => {
    if (!String(brief || "").trim()) {
      setError("Enter a page requirement before generating HTML.");
      return;
    }

    setBusy(true);
    setError("");
    setHtmlPreview("");

    try {
      const prompt = buildStageOneHtmlPrompt(brief, {
        pageName: extractPageName(brief),
        contentMode: "dashboard",
        dataNotes: "4 charts in a single row and 1 full-width table below them.",
      });

      const designerInput = {
        pageMeta: {
          name: extractPageName(brief),
          purpose: brief,
          audience: "Enterprise users",
          domain: "dashboard",
          tone: "professional",
          style: "dashboard",
        },
      };

      const res = await api.post("/experiencebuilder-ai/generate", {
        designerInput,
        prompt: prompt.userPrompt,
        generationMode: "html",
      });

      const nextHtml = String(res.data?.htmlPreview || "").trim();
      if (!nextHtml) {
        throw new Error("Stage 1 HTML preview was empty.");
      }
      setHtmlPreview(nextHtml);
      setPreviewMode("html");
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to generate HTML.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <Box sx={{ bgcolor: "#1f355d", color: "#fff", px: 4, py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          AI Experience Builder V2
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
          HTML is the source of truth. The React preview compiles the same HTML and swaps only widget-marked nodes.
        </Typography>
      </Box>

      <Container maxWidth={false} disableGutters sx={{ py: 2, px: 0 }}>
        <Stack gap={2}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Paper elevation={0} sx={{ p: 3, border: "1px solid #d7deea", borderRadius: 3, bgcolor: "#fff" }}>
            <Stack gap={2}>
              <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Generate controlled HTML</Typography>
              <TextField
                label="Page Requirement"
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                fullWidth
                multiline
                minRows={6}
                placeholder="Describe the page you want in plain English."
              />
              <Stack direction="row" gap={1.5} flexWrap="wrap" justifyContent="space-between" alignItems="center">
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  color="primary"
                  value={previewMode}
                  onChange={(_event, nextMode) => {
                    if (nextMode) setPreviewMode(nextMode);
                  }}
                >
                  <ToggleButton value="html" sx={{ textTransform: "none", px: 2 }}>
                    HTML preview
                  </ToggleButton>
                  <ToggleButton value="react" sx={{ textTransform: "none", px: 2 }}>
                    React preview
                  </ToggleButton>
                </ToggleButtonGroup>
                <Button variant="contained" onClick={generate} disabled={busy || !String(brief || "").trim()} sx={{ textTransform: "none" }}>
                  {busy ? "Generating..." : "Generate HTML"}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {htmlPreview ? (
            previewMode === "html" ? (
              <HtmlFrame html={htmlPreview} />
            ) : (
              <Paper elevation={0} sx={{ border: "1px solid #d7deea", borderRadius: 3, overflow: "hidden", bgcolor: "#fff" }}>
                <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid #d7deea", bgcolor: "#f8fbff" }}>
                  <Typography sx={{ fontWeight: 800, color: "#16233b" }}>React Preview</Typography>
                  <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                    Compiled from the same HTML with widget markers preserved.
                  </Typography>
                </Box>
                <Box sx={{ width: "100%", minWidth: 0 }}>
                  <HtmlToReactWidgetCompiler html={htmlPreview} />
                </Box>
              </Paper>
            )
          ) : (
            <Paper elevation={0} sx={{ minHeight: 240, border: "1px dashed #d7deea", borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "#fff" }}>
              <Typography sx={{ color: "#5f6f8a" }}>Click Generate HTML to build the first preview.</Typography>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
