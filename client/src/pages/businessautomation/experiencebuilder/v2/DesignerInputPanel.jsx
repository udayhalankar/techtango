import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  ListItemText,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Tooltip,
} from "@mui/material";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PagePreview from "./PagePreview";
import {
  AGGREGATIONS,
  CHART_TYPES,
  DEFAULT_DESIGNER_INPUT,
  IMAGE_FIT_OPTIONS,
  IMAGE_POSITION_OPTIONS,
  PAGE_STYLE_OPTIONS,
  COMPOSITION_MODE_OPTIONS,
  PREVIEW_DEVICE_OPTIONS,
  SHELL_COLLAPSE_TRIGGER_OPTIONS,
  WIDGET_TYPES,
} from "./PageSpecSchema";
import { summarizePageSpec } from "./revisionLog";

const widgetDefaults = (type, index, sectionCount = 3) => ({
  id: `widget_${Date.now()}_${index}`,
  type,
  sectionId: `section_${Math.min(sectionCount, (index % sectionCount) + 1)}`,
  title: `${type} widget`,
  order: index,
  width: 12,
  height: 4,
  visible: true,
  config: type === "chart"
    ? { dataTable: "", chartType: "bar", xAxis: "", yAxis: "", aggregation: "actual", legendPosition: "top" }
    : type === "table"
      ? { tableName: "", rowLimit: 10, columns: [], sortOrder: "desc", compact: false }
      : type === "text"
        ? { textContent: "", textSource: "manual", fontSize: 16, textColor: "#16233b", bold: false, italic: false, underline: false }
        : type === "image"
          ? { imageUrl: "", imageFit: "contain", imagePosition: "center", alt: "" }
      : type === "icon"
            ? { iconKey: "", iconColor: "#1f5fd1", iconSize: 32, label: "" }
          : type === "kpi"
            ? { kpiLabel: "", kpiValue: "0", trend: "", trendDirection: "up", subtext: "" }
            : type === "form"
              ? { formName: "", submitLabel: "Submit", action: "ajax" }
              : type === "syncedBlock"
                ? { blockName: "hero", sync: true, content: "Shared synced content" }
                : type === "templatePart"
                  ? { templatePart: "header", variant: "default", content: "" }
                  : {},
});

const tabs = ["Basics", "Shell", "Layout", "Widgets", "Theme", "Behavior"];

const panelCardSx = {
  p: 2,
  border: "1px solid #d7deea",
  borderRadius: 3,
  bgcolor: "#fff",
  boxShadow: "0 16px 32px rgba(18, 38, 73, 0.06)",
};

const gradientHeroSx = {
  p: 2,
  borderRadius: 3,
  color: "#fff",
  background: "linear-gradient(135deg, #10284b 0%, #1f5fd1 58%, #4f87ff 100%)",
};

const widgetTypeLabels = {
  chart: "Chart",
  table: "Table",
  text: "Text Block",
  image: "Image",
  icon: "Icon",
  kpi: "KPI",
  form: "Form",
  syncedBlock: "Synced Block",
  templatePart: "Template Part",
};

export default function DesignerInputPanel({
  open,
  initialValue,
  previewSpec,
  promptBundle,
  revisions = [],
  tableOptions = [],
  tableColumnsByTable = {},
  generating = false,
  committing = false,
  error = "",
  onClose,
  onDraftChange,
  onGenerate,
  onCreate,
  onLoadTableColumns,
}) {
  const [tab, setTab] = useState(0);
  const [draft, setDraft] = useState(initialValue || DEFAULT_DESIGNER_INPUT);

  useEffect(() => {
    setDraft(initialValue || DEFAULT_DESIGNER_INPUT);
  }, [initialValue]);

  const latestSummary = useMemo(() => summarizePageSpec(previewSpec), [previewSpec]);
  const combinedPrompt = useMemo(() => {
    if (!promptBundle) return "";
    return [
      "SYSTEM PROMPT",
      promptBundle.systemPrompt || "",
      "",
      "USER PROMPT",
      promptBundle.userPrompt || "",
    ].join("\n");
  }, [promptBundle]);
  const safeDraft = draft || DEFAULT_DESIGNER_INPUT;
  const safePageMeta = safeDraft.pageMeta || DEFAULT_DESIGNER_INPUT.pageMeta;
  const safeShell = safeDraft.shell || DEFAULT_DESIGNER_INPUT.shell;
  const safeLayout = safeDraft.layout || DEFAULT_DESIGNER_INPUT.layout;
  const safeTheme = safeDraft.theme || DEFAULT_DESIGNER_INPUT.theme;
  const safeBehaviors = safeDraft.behaviors || DEFAULT_DESIGNER_INPUT.behaviors;
  const widgets = Array.isArray(safeDraft.widgets) ? safeDraft.widgets : [];

  const updateDraft = (patch) => {
    setDraft((current) => {
      const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      if (onDraftChange) onDraftChange(next);
      return next;
    });
  };

  const updateNested = (key) => (field, value) => {
    updateDraft((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        [field]: value,
      },
    }));
  };

  const addWidget = () => {
    updateDraft((current) => ({
      ...current,
      widgets: [...(current.widgets || []), widgetDefaults("text", (current.widgets || []).length, current.layout?.sectionCount || 3)],
    }));
  };

  const updateWidget = (index, patch) => {
    updateDraft((current) => {
      const widgets = [...(current.widgets || [])];
      widgets[index] = { ...widgets[index], ...patch };
      return { ...current, widgets };
    });
  };

  const patchWidgetConfig = (index, patch) => {
    updateWidget(index, {
      config: {
        ...((safeDraft.widgets || [])[index]?.config || {}),
        ...patch,
      },
    });
  };

  const removeWidget = (index) => {
    updateDraft((current) => ({
      ...current,
      widgets: (current.widgets || []).filter((_item, itemIndex) => itemIndex !== index),
    }));
  };

  const replaceWidgetType = (index, nextType) => {
    const currentWidget = (safeDraft.widgets || [])[index];
    const sectionCount = safeDraft.layout?.sectionCount || 3;
    const defaults = widgetDefaults(nextType, index, sectionCount);
    updateWidget(index, {
      ...defaults,
      id: currentWidget?.id || defaults.id,
      sectionId: currentWidget?.sectionId || defaults.sectionId,
      order: Number.isInteger(currentWidget?.order) ? currentWidget.order : defaults.order,
      visible: currentWidget?.visible !== false,
      title: currentWidget?.title || widgetTypeLabels[nextType] || defaults.title,
    });
  };

  const uploadImageForWidget = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      patchWidgetConfig(index, {
        imageUrl: String(reader.result || ""),
        alt: file.name || "Uploaded image",
      });
    };
    reader.readAsDataURL(file);
  };

  const getWidgetColumns = (tableName) => tableColumnsByTable?.[tableName] || [];

  const copyToClipboard = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.warn("Unable to copy prompt text", error);
    }
  };

  const handleGenerate = async () => {
    try {
      await onGenerate?.(draft);
    } catch (error) {
      console.error("Generate preview failed", error);
      throw error;
    }
  };

  const handleCreate = async () => {
    try {
      await onCreate?.(draft);
    } catch (error) {
      console.error("Create page failed", error);
      throw error;
    }
  };

  const widgetCount = widgets.length;

  return (
    <Dialog open={open} onClose={generating || committing ? undefined : onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { height: "92vh" } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#16233b" }}>AI Designer</Typography>
            <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
              Collect design intent, generate a structured page spec, preview it, then commit it.
            </Typography>
          </Box>
          <Stack direction="row" gap={1} alignItems="center">
            {latestSummary?.name ? (
              <Chip label={`${latestSummary.name} • ${latestSummary.sectionCount} sections • ${latestSummary.widgetCount} widgets`} size="small" />
            ) : null}
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ overflow: "hidden", bgcolor: "#f4f7fc" }}>
        {error ? (
          <Alert severity="error" variant="filled" sx={{ mb: 2, alignItems: "center", fontWeight: 600 }}>
            {error}
          </Alert>
        ) : null}
        <Grid container spacing={2} sx={{ height: "100%" }}>
          <Grid item xs={12} lg={5} sx={{ height: "100%", overflow: "auto" }}>
            <Stack gap={2}>
              <Paper elevation={0} sx={gradientHeroSx}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
                  <Box>
                    <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <AutoAwesomeOutlinedIcon fontSize="small" />
                      <Typography sx={{ fontWeight: 800, letterSpacing: 0.2 }}>AI Page Designer</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ opacity: 0.92, maxWidth: 420 }}>
                      Shape shell chrome, layout structure, and widget data bindings before the AI generates the page spec.
                    </Typography>
                  </Box>
                  <Tooltip title="The AI outputs structured page spec JSON, not free-form markup.">
                    <Chip
                      label={`${latestSummary?.widgetCount || 0} widgets • ${latestSummary?.sectionCount || 0} sections`}
                      size="small"
                      sx={{ bgcolor: "rgba(255,255,255,0.14)", color: "#fff", fontWeight: 700 }}
                    />
                  </Tooltip>
                </Stack>
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
                  <Chip size="small" label={`Style: ${safePageMeta.style || "modern"}`} sx={{ bgcolor: "rgba(255,255,255,0.16)", color: "#fff" }} />
                  <Chip size="small" label={`Layout: ${safeLayout.layoutPreset || "custom"}`} sx={{ bgcolor: "rgba(255,255,255,0.16)", color: "#fff" }} />
                  <Chip size="small" label={`Density: ${safeTheme.density || "normal"}`} sx={{ bgcolor: "rgba(255,255,255,0.16)", color: "#fff" }} />
                  <Chip size="small" label={`Preview: ${safeBehaviors.previewDevice || "desktop"}`} sx={{ bgcolor: "rgba(255,255,255,0.16)", color: "#fff" }} />
                </Stack>
              </Paper>

              <Paper elevation={0} sx={panelCardSx}>
              <Tabs value={tab} onChange={(_event, next) => setTab(next)} variant="scrollable" scrollButtons="auto">
                {tabs.map((label) => (
                  <Tab key={label} label={label} sx={{ textTransform: "none" }} />
                ))}
              </Tabs>
              <Box sx={{ mt: 2 }}>
                {tab === 0 && (
                  <Stack gap={2}>
                    <Paper elevation={0} sx={{ ...panelCardSx, bgcolor: "#f8fbff" }}>
                      <Stack gap={1.5}>
                        <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Page intent</Typography>
                        <Grid container spacing={1.5}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Page Name"
                              value={safePageMeta.name}
                              onChange={(event) => updateNested("pageMeta")("name", event.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Audience"
                              value={safePageMeta.audience}
                              onChange={(event) => updateNested("pageMeta")("audience", event.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              label="Purpose"
                              value={safePageMeta.purpose}
                              onChange={(event) => updateNested("pageMeta")("purpose", event.target.value)}
                              fullWidth
                              multiline
                              minRows={3}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Industry / Domain"
                              value={safePageMeta.domain}
                              onChange={(event) => updateNested("pageMeta")("domain", event.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Tone"
                              value={safePageMeta.tone}
                              onChange={(event) => updateNested("pageMeta")("tone", event.target.value)}
                              fullWidth
                            />
                          </Grid>
                        </Grid>
                      </Stack>
                    </Paper>
                    <Paper elevation={0} sx={panelCardSx}>
                      <Stack gap={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Design style</Typography>
                            <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                              Pick the overall visual language for the generated page.
                            </Typography>
                          </Box>
                          <Chip size="small" label={safePageMeta.style} />
                        </Stack>
                        <ToggleButtonGroup
                          value={safePageMeta.style}
                          exclusive
                          onChange={(_event, next) => next && updateNested("pageMeta")("style", next)}
                          sx={{ flexWrap: "wrap", gap: 1 }}
                        >
                          {PAGE_STYLE_OPTIONS.map((style) => (
                            <ToggleButton key={style} value={style} sx={{ textTransform: "none", flex: "1 1 30%" }}>
                              {style}
                            </ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </Stack>
                    </Paper>
                  </Stack>
                )}

                {tab === 1 && (
                  <Stack gap={2}>
                    <Paper elevation={0} sx={panelCardSx}>
                      <Stack gap={1.5}>
                        <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Shell chrome</Typography>
                        <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                          Define which structural pieces appear around the page and how the chrome behaves.
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Stack gap={1}>
                              <Typography variant="caption" sx={{ color: "#5f6f8a", fontWeight: 700 }}>
                                Visibility
                              </Typography>
                              {[
                                ["showTopNavbar", "Show Top Navbar"],
                                ["showHeader", "Show Fixed Header"],
                                ["showFooter", "Show Footer"],
                                ["showBottomBar", "Show Bottom Bar"],
                                ["showLeftMenu", "Show Left Menu"],
                                ["showRightMenu", "Show Right Menu"],
                              ].map(([field, label]) => (
                                <FormControlLabel
                                  key={field}
                                  control={<Switch checked={Boolean(safeShell[field])} onChange={(_e, checked) => updateNested("shell")(field, checked)} />}
                                  label={label}
                                />
                              ))}
                            </Stack>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Stack gap={1}>
                              <Typography variant="caption" sx={{ color: "#5f6f8a", fontWeight: 700 }}>
                                Navigation behavior
                              </Typography>
                              {[
                                ["showBreadcrumbs", "Show Breadcrumbs"],
                                ["showUtilityIcons", "Show Utility Icons"],
                                ["showPageTitle", "Show Page Title"],
                                ["showHeaderActions", "Show Header Actions"],
                                ["leftMenuCollapsible", "Left Menu Collapsible"],
                                ["rightMenuCollapsible", "Right Menu Collapsible"],
                              ].map(([field, label]) => (
                                <FormControlLabel
                                  key={field}
                                  control={<Switch checked={Boolean(safeShell[field])} onChange={(_e, checked) => updateNested("shell")(field, checked)} />}
                                  label={label}
                                />
                              ))}
                            </Stack>
                          </Grid>
                        </Grid>
                      </Stack>
                    </Paper>

                    <Paper elevation={0} sx={panelCardSx}>
                      <Stack gap={1.5}>
                        <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Branding and sizing</Typography>
                        <Grid container spacing={1.5}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Brand Name"
                              value={safeShell.brandName}
                              onChange={(event) => updateNested("shell")("brandName", event.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Tagline"
                              value={safeShell.tagline}
                              onChange={(event) => updateNested("shell")("tagline", event.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Logo Text"
                              value={safeShell.logoText}
                              onChange={(event) => updateNested("shell")("logoText", event.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Logo Image URL"
                              value={safeShell.logoImageUrl}
                              onChange={(event) => updateNested("shell")("logoImageUrl", event.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Page Title"
                              value={safeShell.pageTitle}
                              onChange={(event) => updateNested("shell")("pageTitle", event.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              select
                              label="Collapse Trigger Style"
                              value={safeShell.collapseTriggerStyle}
                              onChange={(event) => updateNested("shell")("collapseTriggerStyle", event.target.value)}
                              fullWidth
                            >
                              {SHELL_COLLAPSE_TRIGGER_OPTIONS.map((option) => (
                                <MenuItem key={option} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              select
                              label="Content Width"
                              value={safeShell.contentWidth}
                              onChange={(event) => updateNested("shell")("contentWidth", event.target.value)}
                              fullWidth
                            >
                              {["full", "centered", "fixed"].map((value) => (
                                <MenuItem key={value} value={value}>
                                  {value}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              type="number"
                              label="Content Max Width"
                              value={safeShell.contentMaxWidth}
                              onChange={(event) => updateNested("shell")("contentMaxWidth", Math.max(0, Number(event.target.value) || 0))}
                              inputProps={{ min: 0, step: 1 }}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              type="number"
                              label="Shell Padding"
                              value={safeShell.shellPadding}
                              onChange={(event) => updateNested("shell")("shellPadding", Math.max(0, Number(event.target.value) || 0))}
                              inputProps={{ min: 0, step: 1 }}
                              fullWidth
                            />
                          </Grid>
                        </Grid>
                      </Stack>
                    </Paper>
                  </Stack>
                )}

                {tab === 2 && (
                  <Stack gap={2}>
                    <Paper elevation={0} sx={panelCardSx}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                        <Box>
                          <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Layout blueprint</Typography>
                          <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                            Control the page skeleton, section density, and spacing model.
                          </Typography>
                        </Box>
                        <Chip size="small" label={`${safeLayout.sectionCount || 0} sections`} />
                      </Stack>
                    </Paper>

                    <Paper elevation={0} sx={panelCardSx}>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Layout Preset"
                            value={safeLayout.layoutPreset}
                            onChange={(event) => updateNested("layout")("layoutPreset", event.target.value)}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            select
                            label="Composition Mode"
                            value={safeLayout.compositionMode}
                            onChange={(event) => updateNested("layout")("compositionMode", event.target.value)}
                            fullWidth
                          >
                            {COMPOSITION_MODE_OPTIONS.map((mode) => (
                              <MenuItem key={mode} value={mode}>
                                {mode}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            type="number"
                            label="Section Count"
                            value={safeLayout.sectionCount}
                            onChange={(event) => updateNested("layout")("sectionCount", Math.max(1, Number(event.target.value) || 1))}
                            inputProps={{ min: 1, step: 1 }}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            type="number"
                            label="Columns Per Section"
                            value={safeLayout.columnsPerSection}
                            onChange={(event) => updateNested("layout")("columnsPerSection", Math.max(1, Number(event.target.value) || 1))}
                            inputProps={{ min: 1, step: 1 }}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            type="number"
                            label="Rows Per Section"
                            value={safeLayout.rowsPerSection}
                            onChange={(event) => updateNested("layout")("rowsPerSection", Math.max(1, Number(event.target.value) || 1))}
                            inputProps={{ min: 1, step: 1 }}
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                    </Paper>

                    <Paper elevation={0} sx={panelCardSx}>
                      <Stack gap={1.5}>
                        <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Spacing and chrome</Typography>
                        <Grid container spacing={1.5}>
                          <Grid item xs={12} md={4}>
                            <TextField
                              type="number"
                              label="Section Gap"
                              value={safeLayout.sectionGap}
                              onChange={(event) => updateNested("layout")("sectionGap", Math.max(0, Number(event.target.value) || 0))}
                              inputProps={{ min: 0, step: 1 }}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              type="number"
                              label="Section Padding"
                              value={safeLayout.sectionPadding}
                              onChange={(event) => updateNested("layout")("sectionPadding", Math.max(0, Number(event.target.value) || 0))}
                              inputProps={{ min: 0, step: 1 }}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              type="number"
                              label="Section Radius"
                              value={safeLayout.sectionRadius}
                              onChange={(event) => updateNested("layout")("sectionRadius", Math.max(0, Number(event.target.value) || 0))}
                              inputProps={{ min: 0, step: 1 }}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <FormControlLabel
                              control={<Switch checked={safeLayout.sectionBorder} onChange={(_e, checked) => updateNested("layout")("sectionBorder", checked)} />}
                              label="Section Border"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <FormControlLabel
                              control={<Switch checked={safeLayout.fullWidthCanvas} onChange={(_e, checked) => updateNested("layout")("fullWidthCanvas", checked)} />}
                              label="Full Width Canvas"
                            />
                          </Grid>
                        </Grid>
                      </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{ ...panelCardSx, bgcolor: "#f8fbff" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                        <Box>
                          <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Layout feel</Typography>
                          <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                            Choose how dense the page should feel when the AI lays out the sections.
                          </Typography>
                        </Box>
                        <Chip size="small" label={safeLayout.density || "normal"} />
                      </Stack>
                      <ToggleButtonGroup
                        value={safeLayout.density}
                        exclusive
                        onChange={(_event, next) => next && updateNested("layout")("density", next)}
                        sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}
                      >
                        {["compact", "normal", "spacious"].map((density) => (
                          <ToggleButton key={density} value={density} sx={{ textTransform: "none", flex: "1 1 30%" }}>
                            {density}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Paper>
                  </Stack>
                )}

                {tab === 3 && (
                  <Stack gap={2}>
                    <Paper elevation={0} sx={panelCardSx}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                        <Box>
                          <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Widgets</Typography>
                          <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                            Add charts, tables, text blocks, images, icons, KPIs, forms, synced blocks, or template parts.
                          </Typography>
                        </Box>
                        <Button variant="outlined" startIcon={<AddCircleOutlineOutlinedIcon />} onClick={addWidget}>
                          Add Widget
                        </Button>
                      </Stack>
                    </Paper>

                    {widgetCount > 0 ? (
                      widgets.map((widget, index) => {
                        const widgetColumns = getWidgetColumns(widget.config?.dataTable || widget.config?.tableName);
                        const selectedColumns = Array.isArray(widget.config?.columns) ? widget.config.columns : [];
                        return (
                          <Accordion
                            key={widget.id || index}
                            disableGutters
                            elevation={0}
                            sx={{
                              border: "1px solid #d7deea",
                              borderRadius: 3,
                              overflow: "hidden",
                              bgcolor: "#fff",
                              "&:before": { display: "none" },
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ width: "100%" }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography sx={{ fontWeight: 800, color: "#16233b" }} noWrap>
                                    {widget.title || `Widget ${index + 1}`}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
                                    Section {widget.sectionId} • Order {widget.order}
                                  </Typography>
                                </Box>
                                <Chip label={widget.type} size="small" sx={{ bgcolor: "#eef4ff", color: "#1f5fd1", fontWeight: 700 }} />
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Stack gap={1.5}>
                                <Grid container spacing={1.5}>
                                  <Grid item xs={12} md={8}>
                                    <TextField
                                      select
                                      label="Widget Type"
                                      value={widget.type}
                                      onChange={(event) => replaceWidgetType(index, event.target.value)}
                                      fullWidth
                                    >
                                      {WIDGET_TYPES.map((type) => (
                                        <MenuItem key={type} value={type}>
                                          {widgetTypeLabels[type] || type}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  </Grid>
                                  <Grid item xs={12} md={4}>
                                    <Stack direction="row" justifyContent="flex-end" alignItems="center" height="100%">
                                      <IconButton aria-label="remove widget" onClick={() => removeWidget(index)}>
                                        <DeleteOutlineOutlinedIcon fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      label="Widget Title"
                                      value={widget.title}
                                      onChange={(event) => updateWidget(index, { title: event.target.value })}
                                      fullWidth
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      label="Section Target"
                                      value={widget.sectionId}
                                      onChange={(event) => updateWidget(index, { sectionId: event.target.value })}
                                      helperText="Example: section_1"
                                      fullWidth
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={4}>
                                    <TextField
                                      type="number"
                                      label="Order"
                                      value={widget.order}
                                      onChange={(event) => updateWidget(index, { order: Math.max(0, Number(event.target.value) || 0) })}
                                      inputProps={{ min: 0, step: 1 }}
                                      fullWidth
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={4}>
                                    <TextField
                                      type="number"
                                      label="Width"
                                      value={widget.width}
                                      onChange={(event) => updateWidget(index, { width: Math.max(0, Number(event.target.value) || 0) })}
                                      inputProps={{ min: 0, step: 1 }}
                                      fullWidth
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={4}>
                                    <TextField
                                      type="number"
                                      label="Height"
                                      value={widget.height}
                                      onChange={(event) => updateWidget(index, { height: Math.max(0, Number(event.target.value) || 0) })}
                                      inputProps={{ min: 0, step: 1 }}
                                      fullWidth
                                    />
                                  </Grid>
                                </Grid>

                                {widget.type === "chart" && (
                                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f8fbff" }}>
                                    <Grid container spacing={1.5}>
                                      <Grid item xs={12} md={6}>
                                        <FormControl fullWidth>
                                          <InputLabel id={`chart-table-label-${index}`}>Data Table</InputLabel>
                                          <Select
                                            labelId={`chart-table-label-${index}`}
                                            value={widget.config?.dataTable || ""}
                                            label="Data Table"
                                            onChange={(event) => {
                                              const tableName = event.target.value;
                                              patchWidgetConfig(index, { dataTable: tableName, xAxis: "", yAxis: "" });
                                              onLoadTableColumns?.(tableName);
                                            }}
                                          >
                                            {tableOptions.map((tableName) => (
                                              <MenuItem key={`chart-table-${tableName}`} value={tableName}>
                                                {tableName}
                                              </MenuItem>
                                            ))}
                                          </Select>
                                        </FormControl>
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <TextField
                                          select
                                          label="Chart Type"
                                          value={widget.config?.chartType || "bar"}
                                          onChange={(event) => patchWidgetConfig(index, { chartType: event.target.value })}
                                          fullWidth
                                        >
                                          {CHART_TYPES.map((chartType) => (
                                            <MenuItem key={chartType} value={chartType}>
                                              {chartType}
                                            </MenuItem>
                                          ))}
                                        </TextField>
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <TextField
                                          select
                                          label="X Axis"
                                          value={widget.config?.xAxis || ""}
                                          onChange={(event) => patchWidgetConfig(index, { xAxis: event.target.value })}
                                          fullWidth
                                          disabled={!widget.config?.dataTable}
                                        >
                                          {widgetColumns.map((column) => (
                                            <MenuItem key={`chart-x-${column}`} value={column}>
                                              {column}
                                            </MenuItem>
                                          ))}
                                        </TextField>
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <TextField
                                          select
                                          label="Y Axis"
                                          value={widget.config?.yAxis || ""}
                                          onChange={(event) => patchWidgetConfig(index, { yAxis: event.target.value })}
                                          fullWidth
                                          disabled={!widget.config?.dataTable}
                                        >
                                          {widgetColumns.map((column) => (
                                            <MenuItem key={`chart-y-${column}`} value={column}>
                                              {column}
                                            </MenuItem>
                                          ))}
                                        </TextField>
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <TextField
                                          select
                                          label="Aggregation"
                                          value={widget.config?.aggregation || "actual"}
                                          onChange={(event) => patchWidgetConfig(index, { aggregation: event.target.value })}
                                          fullWidth
                                        >
                                          {AGGREGATIONS.map((aggregation) => (
                                            <MenuItem key={aggregation} value={aggregation}>
                                              {aggregation}
                                            </MenuItem>
                                          ))}
                                        </TextField>
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <TextField
                                          label="Legend Position"
                                          value={widget.config?.legendPosition || "top"}
                                          onChange={(event) => patchWidgetConfig(index, { legendPosition: event.target.value })}
                                          fullWidth
                                        />
                                      </Grid>
                                    </Grid>
                                  </Paper>
                                )}

                                {widget.type === "table" && (
                                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f8fbff" }}>
                                    <Grid container spacing={1.5}>
                                      <Grid item xs={12} md={6}>
                                        <FormControl fullWidth>
                                          <InputLabel id={`table-source-label-${index}`}>Select Table</InputLabel>
                                          <Select
                                            labelId={`table-source-label-${index}`}
                                            value={widget.config?.tableName || ""}
                                            label="Select Table"
                                            onChange={(event) => {
                                              const tableName = event.target.value;
                                              patchWidgetConfig(index, { tableName, columns: [] });
                                              onLoadTableColumns?.(tableName);
                                            }}
                                          >
                                            {tableOptions.map((tableName) => (
                                              <MenuItem key={`table-widget-${tableName}`} value={tableName}>
                                                {tableName}
                                              </MenuItem>
                                            ))}
                                          </Select>
                                        </FormControl>
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <TextField
                                          type="number"
                                          label="Row Limit"
                                          value={widget.config?.rowLimit || 10}
                                          onChange={(event) => patchWidgetConfig(index, { rowLimit: Math.max(1, Number(event.target.value) || 1) })}
                                          inputProps={{ min: 1, step: 1 }}
                                          fullWidth
                                        />
                                      </Grid>
                                      <Grid item xs={12}>
                                        <FormControl fullWidth>
                                          <InputLabel id={`table-columns-label-${index}`}>Columns</InputLabel>
                                          <Select
                                            labelId={`table-columns-label-${index}`}
                                            multiple
                                            value={selectedColumns}
                                            onChange={(event) => patchWidgetConfig(index, { columns: event.target.value })}
                                            input={<OutlinedInput label="Columns" />}
                                            renderValue={(selected) => (
                                              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                                                {(selected || []).map((column) => (
                                                  <Chip key={`${widget.id}-${column}`} label={column} size="small" />
                                                ))}
                                              </Box>
                                            )}
                                          >
                                            {widgetColumns.length ? (
                                              widgetColumns.map((column) => (
                                                <MenuItem key={`table-column-${column}`} value={column}>
                                                  <Checkbox checked={selectedColumns.includes(column)} />
                                                  <ListItemText primary={column} />
                                                </MenuItem>
                                              ))
                                            ) : (
                                              <MenuItem disabled value="">
                                                Load a table first
                                              </MenuItem>
                                            )}
                                          </Select>
                                        </FormControl>
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <TextField
                                          select
                                          label="Sort Order"
                                          value={widget.config?.sortOrder || "desc"}
                                          onChange={(event) => patchWidgetConfig(index, { sortOrder: event.target.value })}
                                          fullWidth
                                        >
                                          {["asc", "desc"].map((sortOrder) => (
                                            <MenuItem key={sortOrder} value={sortOrder}>
                                              {sortOrder}
                                            </MenuItem>
                                          ))}
                                        </TextField>
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <TextField
                                          label="Empty State Text"
                                          value={widget.config?.emptyStateText || ""}
                                          onChange={(event) => patchWidgetConfig(index, { emptyStateText: event.target.value })}
                                          fullWidth
                                        />
                                      </Grid>
                                      <Grid item xs={12}>
                                        <FormControlLabel
                                          control={<Switch checked={Boolean(widget.config?.compact)} onChange={(_e, checked) => patchWidgetConfig(index, { compact: checked })} />}
                                          label="Compact Table"
                                        />
                                      </Grid>
                                    </Grid>
                                  </Paper>
                                )}

                                {widget.type === "text" && (
                                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f8fbff" }}>
                                    <Stack gap={1.5}>
                                      <TextField
                                        label="Text Content"
                                        value={widget.config?.textContent || ""}
                                        onChange={(event) => patchWidgetConfig(index, { textContent: event.target.value })}
                                        fullWidth
                                        multiline
                                        minRows={3}
                                      />
                                      <TextField
                                        select
                                        label="Text Source"
                                        value={widget.config?.textSource || "manual"}
                                        onChange={(event) => patchWidgetConfig(index, { textSource: event.target.value })}
                                        fullWidth
                                      >
                                        <MenuItem value="manual">Manual</MenuItem>
                                        <MenuItem value="ai">AI generated</MenuItem>
                                      </TextField>
                                    </Stack>
                                  </Paper>
                                )}

                                {widget.type === "image" && (
                                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f8fbff" }}>
                                    <Stack gap={1.5}>
                                      <TextField
                                        label="Image URL"
                                        value={widget.config?.imageUrl || ""}
                                        onChange={(event) => patchWidgetConfig(index, { imageUrl: event.target.value })}
                                        fullWidth
                                      />
                                      <Button variant="outlined" component="label">
                                        Upload Image
                                        <input
                                          hidden
                                          type="file"
                                          accept="image/*"
                                          onChange={(event) => uploadImageForWidget(index, event.target.files?.[0] || null)}
                                        />
                                      </Button>
                                      <Grid container spacing={1.5}>
                                        <Grid item xs={12} md={6}>
                                          <TextField
                                            select
                                            label="Fit"
                                            value={widget.config?.imageFit || "contain"}
                                            onChange={(event) => patchWidgetConfig(index, { imageFit: event.target.value })}
                                            fullWidth
                                          >
                                            {IMAGE_FIT_OPTIONS.map((fit) => (
                                              <MenuItem key={fit} value={fit}>
                                                {fit}
                                              </MenuItem>
                                            ))}
                                          </TextField>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                          <TextField
                                            select
                                            label="Position"
                                            value={widget.config?.imagePosition || "center"}
                                            onChange={(event) => patchWidgetConfig(index, { imagePosition: event.target.value })}
                                            fullWidth
                                          >
                                            {IMAGE_POSITION_OPTIONS.map((position) => (
                                              <MenuItem key={position} value={position}>
                                                {position}
                                              </MenuItem>
                                            ))}
                                          </TextField>
                                        </Grid>
                                      </Grid>
                                    </Stack>
                                  </Paper>
                                )}

                                {widget.type === "icon" && (
                                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f8fbff" }}>
                                    <Stack gap={1.5}>
                                      <TextField label="Icon Key" value={widget.config?.iconKey || ""} onChange={(event) => patchWidgetConfig(index, { iconKey: event.target.value })} fullWidth />
                                      <Grid container spacing={1.5}>
                                        <Grid item xs={12} md={6}>
                                          <TextField label="Icon Color" value={widget.config?.iconColor || "#1f5fd1"} onChange={(event) => patchWidgetConfig(index, { iconColor: event.target.value })} fullWidth />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                          <TextField
                                            type="number"
                                            label="Icon Size"
                                            value={widget.config?.iconSize || 32}
                                            onChange={(event) => patchWidgetConfig(index, { iconSize: Math.max(1, Number(event.target.value) || 1) })}
                                            inputProps={{ min: 1, step: 1 }}
                                            fullWidth
                                          />
                                        </Grid>
                                      </Grid>
                                      <TextField label="Label" value={widget.config?.label || ""} onChange={(event) => patchWidgetConfig(index, { label: event.target.value })} fullWidth />
                                    </Stack>
                                  </Paper>
                                )}
                              </Stack>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })
                    ) : (
                      <Paper variant="outlined" sx={{ p: 2, textAlign: "center", borderRadius: 3, bgcolor: "#fff" }}>
                        <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                          No widgets selected yet.
                        </Typography>
                      </Paper>
                    )}
                  </Stack>
                )}

                {tab === 4 && (
                  <Stack gap={2}>
                    <Paper elevation={0} sx={panelCardSx}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                        <Box>
                          <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Theme palette</Typography>
                          <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                            Tune the colors, typography, and icon treatment used by the generated page.
                          </Typography>
                        </Box>
                        <Chip size="small" label={safeTheme.fontFamily?.split(",")?.[0] || "system"} />
                      </Stack>
                    </Paper>

                    <Paper elevation={0} sx={panelCardSx}>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Primary Color"
                            value={safeTheme.primaryColor}
                            onChange={(event) => updateNested("theme")("primaryColor", event.target.value)}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Accent Color"
                            value={safeTheme.accentColor}
                            onChange={(event) => updateNested("theme")("accentColor", event.target.value)}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Background Color"
                            value={safeTheme.backgroundColor}
                            onChange={(event) => updateNested("theme")("backgroundColor", event.target.value)}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Neutral Color"
                            value={safeTheme.neutralColor}
                            onChange={(event) => updateNested("theme")("neutralColor", event.target.value)}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Border Color"
                            value={safeTheme.borderColor}
                            onChange={(event) => updateNested("theme")("borderColor", event.target.value)}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Font Family"
                            value={safeTheme.fontFamily}
                            onChange={(event) => updateNested("theme")("fontFamily", event.target.value)}
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                    </Paper>

                    <Paper elevation={0} sx={{ ...panelCardSx, bgcolor: "#f8fbff" }}>
                      <Stack gap={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                          <Box>
                            <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Typography and icons</Typography>
                            <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                              Keep the generated design language consistent across widgets.
                            </Typography>
                          </Box>
                          <Chip size="small" label={safeTheme.density || "normal"} />
                        </Stack>
                        <Grid container spacing={1.5}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Icon Style"
                              value={safeTheme.iconStyle}
                              onChange={(event) => updateNested("theme")("iconStyle", event.target.value)}
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              select
                              label="Density"
                              value={safeTheme.density}
                              onChange={(event) => updateNested("theme")("density", event.target.value)}
                              fullWidth
                            >
                              {["compact", "normal", "spacious"].map((density) => (
                                <MenuItem key={density} value={density}>
                                  {density}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                        </Grid>
                      </Stack>
                    </Paper>
                  </Stack>
                )}

                {tab === 5 && (
                  <Stack gap={2}>
                    <TextField
                      select
                      label="Preview Device"
                      value={draft.behaviors.previewDevice}
                      onChange={(event) => updateNested("behaviors")("previewDevice", event.target.value)}
                      fullWidth
                    >
                      {PREVIEW_DEVICE_OPTIONS.map((device) => (
                        <MenuItem key={device} value={device}>
                          {device}
                        </MenuItem>
                      ))}
                    </TextField>
                    <FormControlLabel
                      control={<Switch checked={draft.behaviors.responsive} onChange={(_e, checked) => updateNested("behaviors")("responsive", checked)} />}
                      label="Responsive"
                    />
                    <FormControlLabel
                      control={<Switch checked={draft.behaviors.stickyHeader} onChange={(_e, checked) => updateNested("behaviors")("stickyHeader", checked)} />}
                      label="Sticky Header"
                    />
                    <FormControlLabel
                      control={<Switch checked={draft.behaviors.stickyFooter} onChange={(_e, checked) => updateNested("behaviors")("stickyFooter", checked)} />}
                      label="Sticky Footer"
                    />
                    <FormControlLabel
                      control={<Switch checked={draft.behaviors.collapsibleMenus} onChange={(_e, checked) => updateNested("behaviors")("collapsibleMenus", checked)} />}
                      label="Collapsible Menus"
                    />
                    <TextField
                      label="Scroll Behavior"
                      value={draft.behaviors.scrollBehavior}
                      onChange={(event) => updateNested("behaviors")("scrollBehavior", event.target.value)}
                      fullWidth
                    />
                    <FormControlLabel
                      control={<Switch checked={draft.behaviors.animateEntry} onChange={(_e, checked) => updateNested("behaviors")("animateEntry", checked)} />}
                      label="Animate Entry"
                    />
                  </Stack>
                )}
              </Box>
            </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={7} sx={{ height: "100%", overflow: "auto" }}>
            <Stack gap={2}>
              <Paper elevation={0} sx={{ p: 2, border: "1px solid #d7deea", borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Preview</Typography>
                    <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                      Generate a page spec to inspect the layout before creating the page.
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={1}>
                    <Button variant="outlined" onClick={handleGenerate} disabled={generating || committing}>
                      {generating ? "Generating..." : "Generate Preview"}
                    </Button>
                    <Button variant="contained" onClick={handleCreate} disabled={!previewSpec || generating || committing}>
                      {committing ? "Creating..." : "Create Page"}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, border: "1px solid #d7deea", borderRadius: 2, bgcolor: "#fbfcff" }}>
                <Stack gap={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: "#16233b" }}>Generated Prompt</Typography>
                      <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                        This is the exact prompt bundle sent to OpenAI when you generate a preview.
                      </Typography>
                    </Box>
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      <Button size="small" variant="outlined" onClick={() => copyToClipboard(promptBundle?.systemPrompt)}>
                        Copy System
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => copyToClipboard(promptBundle?.userPrompt)}>
                        Copy User
                      </Button>
                      <Button size="small" variant="contained" onClick={() => copyToClipboard(combinedPrompt)}>
                        Copy All
                      </Button>
                    </Stack>
                  </Stack>

                  {promptBundle ? (
                    <Stack gap={1.25}>
                      <TextField
                        label="System Prompt"
                        value={promptBundle.systemPrompt || ""}
                        multiline
                        minRows={6}
                        fullWidth
                        InputProps={{ readOnly: true, sx: { fontSize: 12 } }}
                      />
                      <TextField
                        label="User Prompt"
                        value={promptBundle.userPrompt || ""}
                        multiline
                        minRows={10}
                        fullWidth
                        InputProps={{ readOnly: true, sx: { fontSize: 12 } }}
                      />
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#5f6f8a" }}>
                      Click Generate Preview to populate the exact prompt text here.
                    </Typography>
                  )}
                </Stack>
              </Paper>

              <Box sx={{ overflowX: "auto", overflowY: "auto", minHeight: 0 }}>
                <Box sx={{ minWidth: 1120 }}>
                  <PagePreview pageSpec={previewSpec} dense />
                </Box>
              </Box>

              <Paper elevation={0} sx={{ p: 1.25, border: "1px solid #d7deea", borderRadius: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#16233b", mb: 0.75 }}>
                  Revision Log
                </Typography>
                <Stack gap={0.75}>
                  {revisions.slice(0, 5).map((entry) => (
                    <Box key={entry.id} sx={{ p: 0.75, borderRadius: 1.5, bgcolor: "#f8faff", border: "1px solid #d7deea" }}>
                      <Typography variant="caption" sx={{ color: "#5f6f8a", fontSize: 10 }}>
                        {entry.timestamp} • {entry.action}
                      </Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: 11, color: "#16233b", lineHeight: 1.25 }}>
                        {entry.pageName || entry.summary || "Revision"}
                      </Typography>
                    </Box>
                  ))}
                  {!revisions.length ? (
                    <Typography variant="body2" sx={{ color: "#5f6f8a", fontSize: 11 }}>
                      No revisions recorded yet.
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={generating || committing}>
          Close
        </Button>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" onClick={handleGenerate} disabled={generating || committing}>
            {generating ? "Generating..." : "Generate Preview"}
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={!previewSpec || generating || committing}>
            {committing ? "Creating..." : "Create Page"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
