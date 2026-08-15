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
import {
  getElementorProModeSummary,
  getWPBakeryModeSummary,
  normalizeElementorProMode,
  normalizeWPBakeryMode,
} from "./builderModes";

const tabStyles = {
  minHeight: 44,
  "& .MuiTab-root": {
    minHeight: 44,
    textTransform: "none",
    fontWeight: 700,
  },
};

const normalizeLines = (value) =>
  Array.isArray(value)
    ? value
    : String(value || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

export default function BuilderModesDialog({
  open,
  page,
  onClose,
  onUpdateElementorProMode,
  onUpdateWPBakeryMode,
}) {
  const [tab, setTab] = useState(0);
  const elementorProMode = useMemo(() => normalizeElementorProMode(page), [page]);
  const wpbakeryMode = useMemo(() => normalizeWPBakeryMode(page), [page]);
  const elementorSummary = useMemo(() => getElementorProModeSummary(page), [page]);
  const wpbakerySummary = useMemo(() => getWPBakeryModeSummary(page), [page]);

  const [dynamicTemplates, setDynamicTemplates] = useState("");
  const [popupRules, setPopupRules] = useState("");
  const [allowedRoles, setAllowedRoles] = useState("");
  const [thirdPartyIntegrations, setThirdPartyIntegrations] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab(0);
  }, [open]);

  useEffect(() => {
    setDynamicTemplates(elementorProMode.dynamicTemplates.join("\n"));
    setPopupRules(
      elementorProMode.popupRules
        .map((rule) => [rule.name, rule.trigger, rule.condition].filter(Boolean).join(" | "))
        .join("\n")
    );
    setAllowedRoles(wpbakeryMode.allowedRoles.join(", "));
    setThirdPartyIntegrations(wpbakeryMode.thirdPartyIntegrations.join("\n"));
  }, [elementorProMode, wpbakeryMode]);

  const saveElementorProLists = () => {
    onUpdateElementorProMode?.({
      dynamicTemplates: normalizeLines(dynamicTemplates),
      popupRules: popupRules
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name = "", trigger = "", condition = ""] = line
            .split("|")
            .map((part) => part.trim());
          return { name, trigger, condition };
        }),
    });
  };

  const saveWPBakeryLists = () => {
    onUpdateWPBakeryMode?.({
      allowedRoles: allowedRoles.split(",").map((item) => item.trim()).filter(Boolean),
      thirdPartyIntegrations: normalizeLines(thirdPartyIntegrations),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Builder Mode Panels</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={tabStyles}>
          <Tab label="Elementor Pro" />
          <Tab label="WPBakery" />
        </Tabs>
        <Box sx={{ p: 2.5 }}>
          {tab === 0 && (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 700 }}>Elementor Pro Panel</Typography>
              <Typography sx={{ color: "#5f6f8a" }}>
                Theme Builder, Popup Builder, Dynamic Content, and template flows are exposed here as editable
                builder controls.
              </Typography>
              <Grid container spacing={1.25}>
                {elementorSummary.map((item) => (
                  <Grid item xs={12} md={6} key={item.id}>
                    <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
                      <Typography sx={{ fontWeight: 700 }}>{item.label}</Typography>
                      <Typography sx={{ mt: 0.5, color: "#5f6f8a" }}>{item.value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <Divider />
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={elementorProMode.themeBuilder !== false}
                      onChange={(_event, checked) => onUpdateElementorProMode?.({ themeBuilder: checked })}
                    />
                  }
                  label="Theme Builder"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={elementorProMode.popupBuilder !== false}
                      onChange={(_event, checked) => onUpdateElementorProMode?.({ popupBuilder: checked })}
                    />
                  }
                  label="Popup Builder"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={elementorProMode.dynamicContent !== false}
                      onChange={(_event, checked) => onUpdateElementorProMode?.({ dynamicContent: checked })}
                    />
                  }
                  label="Dynamic Content"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={elementorProMode.customCode === true}
                      onChange={(_event, checked) => onUpdateElementorProMode?.({ customCode: checked })}
                    />
                  }
                  label="Custom Code"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={elementorProMode.woocommerceBuilder === true}
                      onChange={(_event, checked) => onUpdateElementorProMode?.({ woocommerceBuilder: checked })}
                    />
                  }
                  label="WooCommerce Builder"
                />
              </Stack>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Dynamic Templates"
                value={dynamicTemplates}
                onChange={(event) => setDynamicTemplates(event.target.value)}
                helperText="One template ID per line."
              />
              <Button variant="contained" onClick={saveElementorProLists}>
                Save Elementor Pro Panel
              </Button>
            </Stack>
          )}
          {tab === 1 && (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 700 }}>WPBakery Panel</Typography>
              <Typography sx={{ color: "#5f6f8a" }}>
                Frontend and backend builder modes, role control, and third-party integration hooks are managed here.
              </Typography>
              <Grid container spacing={1.25}>
                {wpbakerySummary.map((item) => (
                  <Grid item xs={12} md={6} key={item.id}>
                    <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
                      <Typography sx={{ fontWeight: 700 }}>{item.label}</Typography>
                      <Typography sx={{ mt: 0.5, color: "#5f6f8a" }}>{item.value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <Divider />
              <TextField
                select
                fullWidth
                label="Editor Mode"
                value={wpbakeryMode.editorMode}
                onChange={(event) => onUpdateWPBakeryMode?.({ editorMode: event.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="frontend">Frontend Editor</option>
                <option value="backend">Backend Editor</option>
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={wpbakeryMode.roleManager !== false}
                    onChange={(_event, checked) => onUpdateWPBakeryMode?.({ roleManager: checked })}
                  />
                }
                label="Role Manager"
              />
              <TextField
                fullWidth
                label="Allowed Roles"
                value={allowedRoles}
                onChange={(event) => setAllowedRoles(event.target.value)}
                helperText="Comma-separated roles."
              />
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Third-party Integrations"
                value={thirdPartyIntegrations}
                onChange={(event) => setThirdPartyIntegrations(event.target.value)}
                helperText="One integration per line."
              />
              <Button variant="contained" onClick={saveWPBakeryLists}>
                Save WPBakery Panel
              </Button>
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
