import React, { useMemo } from "react";
import {
  Box,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const shellFrame = {
  border: "1px solid #d7deea",
  borderRadius: 3,
  overflow: "hidden",
  background: "#fff",
};

const renderChartBars = (widget) => {
  const bars = [60, 35, 75, 50];
  return (
    <Stack direction="row" alignItems="end" gap={1} sx={{ height: 120, px: 1, pb: 1 }}>
      {bars.map((height, index) => (
        <Box
          key={`${widget.id}-bar-${index}`}
          sx={{
            width: "100%",
            maxWidth: 48,
            height,
            borderRadius: 1,
            bgcolor: index % 2 === 0 ? "#7db5ff" : "#a8d3ff",
          }}
        />
      ))}
    </Stack>
  );
};

const renderWidget = (widget) => {
  if (!widget) return null;
  if (widget.type === "text") {
    const text = String(widget.config?.textContent || "").trim();
    if (!text) return null;
    return (
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", color: "#334363" }}>
        {text}
      </Typography>
    );
  }
  if (widget.type === "image") {
    const src = String(widget.config?.imageUrl || "").trim();
    if (!src) return null;
    return (
      <Box
        component="img"
        src={src}
        alt={widget.config?.alt || widget.title || "Preview image"}
        sx={{
          width: "100%",
          maxHeight: 180,
          objectFit: widget.config?.imageFit || "cover",
          borderRadius: 1,
          background: "transparent",
          minHeight: 120,
        }}
      />
    );
  }
  if (widget.type === "icon") {
    const label = String(widget.config?.label || "").trim();
    if (!label && !widget.config?.iconKey) return null;
    return (
      <Stack direction="row" alignItems="center" gap={1}>
        <Box
          sx={{
            width: widget.config?.iconSize || 32,
            height: widget.config?.iconSize || 32,
            borderRadius: "50%",
            bgcolor: widget.config?.iconColor || "#1f5fd1",
          }}
        />
        {label ? <Typography variant="body2">{label}</Typography> : null}
      </Stack>
    );
  }
  if (widget.type === "kpi") {
    const label = String(widget.config?.kpiLabel || "").trim();
    const value = String(widget.config?.kpiValue || "").trim();
    if (!label && !value) return null;
    return (
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f4f8ff", border: "1px solid #d7deea" }}>
        <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
          {label || widget.title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#1f5fd1" }}>
          {value || "0"}
        </Typography>
      </Box>
    );
  }
  if (widget.type === "table") {
    const tableName = String(widget.config?.tableName || "").trim();
    if (!tableName) return null;
    return (
      <Table size="small">
        <TableHead>
          <TableRow>
            {["id", "clientname", "created_by"].map((head) => (
              <TableCell key={`${widget.id}-${head}`} sx={{ fontWeight: 700 }}>
                {head}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: Math.min(widget.config?.rowLimit || 3, 3) }).map((_item, index) => (
            <TableRow key={`${widget.id}-row-${index}`}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>test</TableCell>
              <TableCell>{index === 2 ? "233" : "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  if (widget.type === "chart") {
    if (!widget.config?.chartType || !widget.config?.xAxis || !widget.config?.yAxis) return null;
    return (
      <Box>
        {renderChartBars(widget)}
      </Box>
    );
  }
  if (widget.type === "form") {
    const formName = String(widget.config?.formName || widget.title || "Lead Capture Form").trim();
    const submitLabel = String(widget.config?.submitLabel || "Submit").trim();
    return (
      <Stack gap={1} sx={{ p: 1.25, border: "1px solid #d7deea", borderRadius: 2, bgcolor: "#fbfcff" }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#1e2d4a" }}>
          {formName}
        </Typography>
        {["Name", "Email", "Subject"].map((label) => (
          <Box
            key={`${widget.id}-${label}`}
            sx={{
              p: 1,
              borderRadius: 1,
              border: "1px solid #d7deea",
              bgcolor: "#fff",
            }}
          >
            <Typography variant="caption" sx={{ display: "block", color: "#5f6f8a", mb: 0.5 }}>
              {label}
            </Typography>
            <Box sx={{ height: 14, borderRadius: 0.75, bgcolor: "#eef3fb" }} />
          </Box>
        ))}
        <Box sx={{ alignSelf: "flex-start", px: 2, py: 0.9, borderRadius: 999, bgcolor: "#1f5fd1", color: "#fff", fontWeight: 700, fontSize: 12 }}>
          {submitLabel}
        </Box>
      </Stack>
    );
  }
  if (widget.type === "syncedBlock") {
    const blockName = String(widget.config?.blockName || "").trim();
    const content = String(widget.config?.content || "").trim();
    if (!blockName && !content) return null;
    return <Typography variant="body2">{content || blockName}</Typography>;
  }
  if (widget.type === "templatePart") {
    const content = String(widget.config?.content || "").trim();
    if (!content) return null;
    return <Typography variant="body2">{content}</Typography>;
  }
  return null;
};

export default function PagePreview({ pageSpec, dense = false }) {
  const sections = useMemo(() => Array.isArray(pageSpec?.layout?.sections) ? pageSpec.layout.sections : [], [pageSpec]);
  const widgets = useMemo(() => Array.isArray(pageSpec?.widgets) ? pageSpec.widgets : [], [pageSpec]);
  const shell = pageSpec?.shell || {};
  const theme = pageSpec?.theme || {};

  const widgetsBySection = useMemo(() => {
    const grouped = new Map();
    widgets.forEach((widget) => {
      const list = grouped.get(widget.sectionId) || [];
      list.push(widget);
      grouped.set(widget.sectionId, list);
    });
    grouped.forEach((list) => list.sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
    return grouped;
  }, [widgets]);

  if (!pageSpec) {
    return (
      <Paper elevation={0} sx={{ ...shellFrame, minHeight: 320, display: "grid", placeItems: "center", bgcolor: "#f7f9fc" }}>
        <Typography sx={{ color: "#5f6f8a" }}>Generate a page spec to preview the layout here.</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ ...shellFrame, backgroundColor: theme.backgroundColor || "#f7f9fc" }}>
      {shell.topNavbar?.visible !== false && (
        <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid #d7deea", bgcolor: "#fff" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
            <Stack>
              <Typography sx={{ fontWeight: 800, color: "#16233b" }}>
                {theme.brandName || shell.topNavbar?.brandName || "Tymebound"}
              </Typography>
              <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
                {theme.tagline || shell.topNavbar?.tagline || "Manage Information Effortlessly"}
              </Typography>
            </Stack>
            <Stack direction="row" gap={1}>
              {["View Page", "Save", "Publish"].map((label) => (
                <Box
                  key={label}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 999,
                    border: "1px solid #cfd8ea",
                    color: "#23406f",
                    fontSize: 12,
                    fontWeight: 700,
                    bgcolor: "#f7faff",
                  }}
                >
                  {label}
                </Box>
              ))}
            </Stack>
          </Stack>
        </Box>
      )}

      {shell.header?.visible !== false && (
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #d7deea", bgcolor: "#fbfcff" }}>
          <Typography sx={{ fontWeight: 800, color: "#16233b" }}>
            {pageSpec?.pageMeta?.name || "Header (Fixed)"}
          </Typography>
          <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
            {pageSpec?.pageMeta?.purpose || pageSpec?.pageMeta?.domain || "AI-designed experience"}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr", minHeight: 420 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 0 }}>
          {shell.leftMenu?.visible !== false && (
            <Box sx={{ borderRight: "1px solid #d7deea", bgcolor: "#f8faff", p: 2 }}>
              <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Left Menu</Typography>
              <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
                {shell.leftMenu?.collapsible ? "Collapsible" : "Static"}
              </Typography>
            </Box>
          )}

          <Box sx={{ minWidth: 0, p: dense ? 1 : 2 }}>
            <Stack gap={dense ? 1 : 1.5}>
              {sections.map((section) => {
                const sectionWidgets = widgetsBySection.get(section.id) || [];
                const hasFrame = Boolean(section.border);
                return (
                  <Box
                    key={section.id}
                    sx={{
                      p: dense ? 1 : 1.5,
                      bgcolor: section.backgroundColor || "transparent",
                      border: hasFrame ? `1px solid ${section.borderColor || "#d7deea"}` : "none",
                      borderRadius: hasFrame ? `${section.radius || 0}px` : 0,
                    }}
                  >
                    <Stack gap={1}>
                      {hasFrame ? <Divider /> : null}
                      <Stack gap={1}>
                        {sectionWidgets.length ? (
                          sectionWidgets.map((widget) => (
                            <Box
                              key={widget.id}
                              sx={{
                                p: 1,
                                borderRadius: 0,
                                bgcolor: "transparent",
                              }}
                            >
                              {renderWidget(widget)}
                            </Box>
                          ))
                        ) : null}
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          {shell.rightMenu?.visible !== false && (
            <Box sx={{ borderLeft: "1px solid #d7deea", bgcolor: "#f8faff", p: 2 }}>
              <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Right Menu</Typography>
              <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
                {shell.rightMenu?.collapsible ? "Collapsible" : "Static"}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {shell.footer?.visible !== false && (
        <Box sx={{ px: 2, py: 1.25, borderTop: "1px solid #d7deea", bgcolor: "#fff" }}>
          <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
            Footer preview
          </Typography>
        </Box>
      )}

      {shell.bottomBar?.visible !== false && (
        <Box sx={{ px: 2, py: 1, borderTop: "1px solid #d7deea", bgcolor: "#f9fbff" }}>
          <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
            Bottom bar preview
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
