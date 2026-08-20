import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import {
  THEME_TOOL_PRESETS,
  THEME_TOOL_PLUGINS,
  THEME_TOOL_TROUBLESHOOTING,
  THEME_TOOL_WIZARD_STEPS,
  buildThemeDiagnostics,
  getThemePreset,
  normalizeThemeTools,
} from "./themeTools";

const tabStyles = {
  minHeight: 44,
  "& .MuiTab-root": {
    minHeight: 44,
    textTransform: "none",
    fontWeight: 700,
  },
};

export default function ThemeToolsDialog({
  open,
  page,
  mode,
  onClose,
  onApplyPreset,
  onUpdateThemeTools,
}) {
  const [tab, setTab] = useState(0);
  const themeTools = useMemo(() => normalizeThemeTools(page?.themeTools), [page?.themeTools]);
  const [brandName, setBrandName] = useState(themeTools.whiteLabel.brandName);
  const [tagline, setTagline] = useState(themeTools.whiteLabel.tagline);
  const [logoText, setLogoText] = useState(themeTools.whiteLabel.logoText);
  const [primaryColor, setPrimaryColor] = useState(themeTools.whiteLabel.primaryColor);
  const [accentColor, setAccentColor] = useState(themeTools.whiteLabel.accentColor);
  const [hideBranding, setHideBranding] = useState(themeTools.whiteLabel.hideBranding);
  const diagnostics = useMemo(
    () => buildThemeDiagnostics(page, { isPublishedMode: mode === "published" }),
    [page, mode]
  );

  useEffect(() => {
    if (!open) return;
    setTab(0);
  }, [open]);

  useEffect(() => {
    setBrandName(themeTools.whiteLabel.brandName);
    setTagline(themeTools.whiteLabel.tagline);
    setLogoText(themeTools.whiteLabel.logoText);
    setPrimaryColor(themeTools.whiteLabel.primaryColor);
    setAccentColor(themeTools.whiteLabel.accentColor);
    setHideBranding(themeTools.whiteLabel.hideBranding);
  }, [themeTools]);

  const saveWhiteLabel = () => {
    onUpdateThemeTools?.({
      whiteLabel: {
        brandName,
        tagline,
        logoText,
        primaryColor,
        accentColor,
        hideBranding,
      },
    });
  };

  const togglePlugin = (pluginId) => (_event, checked) => {
    onUpdateThemeTools?.({
      plugins: {
        [pluginId]: checked,
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Theme Tools</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={tabStyles}>
          <Tab icon={<BuildOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Wizard" />
          <Tab icon={<AutoAwesomeOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Starter Layouts" />
          <Tab icon={<ExtensionOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Plugins" />
          <Tab icon={<PaletteOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="White Label" />
          <Tab icon={<BugReportOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Troubleshooting" />
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          {tab === 0 && (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 700 }}>Theme Options Wizard</Typography>
              <Typography sx={{ color: "#5f6f8a" }}>
                Pick a layout, brand it, enable the right widget packs, then review the page health checks.
              </Typography>
              <Grid container spacing={1.5}>
                {THEME_TOOL_WIZARD_STEPS.map((step, index) => (
                  <Grid item xs={12} md={6} key={step.id}>
                    <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        {index + 1}. {step.title}
                      </Typography>
                      <Typography sx={{ mt: 0.5, color: "#5f6f8a" }}>{step.detail}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 700 }}>Pre-made Websites</Typography>
              <Typography sx={{ color: "#5f6f8a" }}>
                Apply a starter layout to the current page. This only changes builder configuration, not current
                database metadata.
              </Typography>
              <Grid container spacing={1.5}>
                {THEME_TOOL_PRESETS.map((preset) => {
                  const active = String(themeTools.starterPresetId) === String(preset.id);
                  return (
                    <Grid item xs={12} md={4} key={preset.id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          height: "100%",
                          borderColor: active ? "#2f7dd6" : "#d8dde7",
                          bgcolor: active ? "rgba(47,125,214,0.05)" : "#fff",
                        }}
                      >
                        <Typography sx={{ fontWeight: 700 }}>{preset.name}</Typography>
                        <Typography sx={{ mt: 0.5, color: "#5f6f8a" }}>{preset.description}</Typography>
                        <Typography sx={{ mt: 1, fontSize: 12, color: "#5f6f8a" }}>
                          Rows {preset.canvasLayoutRows} | Widgets {preset.widgetHints.join(", ")}
                        </Typography>
                        <Button sx={{ mt: 1.5 }} variant={active ? "contained" : "outlined"} onClick={() => onApplyPreset?.(preset.id)}>
                          {active ? "Applied" : "Apply"}
                        </Button>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          )}

          {tab === 2 && (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 700 }}>Plugins</Typography>
              <Typography sx={{ color: "#5f6f8a" }}>
                Toggle the widget packs that should be available to the page builder.
              </Typography>
              <Grid container spacing={1.25}>
                {THEME_TOOL_PLUGINS.map((plugin) => (
                  <Grid item xs={12} md={6} key={plugin.id}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={themeTools.plugins?.[plugin.id] !== false}
                            onChange={togglePlugin(plugin.id)}
                          />
                        }
                        label={plugin.name}
                      />
                      <Typography sx={{ color: "#5f6f8a", fontSize: 13 }}>{plugin.description}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}

          {tab === 3 && (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 700 }}>White Label</Typography>
              <Typography sx={{ color: "#5f6f8a" }}>
                Store branding preferences with the page layout so the builder can present a white-labeled experience.
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Brand Name" value={brandName} onChange={(event) => setBrandName(event.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Logo Text" value={logoText} onChange={(event) => setLogoText(event.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Tagline" value={tagline} onChange={(event) => setTagline(event.target.value)} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Primary Color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Accent Color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
                </Grid>
              </Grid>
              <FormControlLabel
                control={<Switch checked={hideBranding} onChange={(_event, checked) => setHideBranding(checked)} />}
                label="Hide Augmis branding"
              />
              <Button variant="contained" onClick={saveWhiteLabel}>
                Save White Label
              </Button>
            </Stack>
          )}

          {tab === 4 && (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 700 }}>Troubleshooting</Typography>
              <Typography sx={{ color: "#5f6f8a" }}>
                Quick checks pulled from the same feature rules used by the builder.
              </Typography>
              <Grid container spacing={1.25}>
                {diagnostics.map((item) => (
                  <Grid item xs={12} md={6} key={item.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderColor: item.ok ? "#b9e2c5" : "#f3c7c7",
                        bgcolor: item.ok ? "rgba(46,125,50,0.05)" : "rgba(211,47,47,0.05)",
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                      <Typography sx={{ mt: 0.5, color: "#5f6f8a" }}>{item.detail}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <Divider />
              <Typography sx={{ fontWeight: 700 }}>Reference Checks</Typography>
              <Grid container spacing={1.25}>
                {THEME_TOOL_TROUBLESHOOTING.map((item) => (
                  <Grid item xs={12} md={6} key={item.id}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                      <Typography sx={{ mt: 0.5, color: "#5f6f8a" }}>{item.detail}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <Divider />
              <Typography sx={{ fontSize: 13, color: "#5f6f8a" }}>
                Theme reference: {getThemePreset(themeTools.starterPresetId).name}. Published mode: {mode === "published" ? "Yes" : "No"}.
              </Typography>
            </Stack>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
