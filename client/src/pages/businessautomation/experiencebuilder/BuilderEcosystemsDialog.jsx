import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  ELEMENTOR_FEATURES,
  ELEMENTOR_PRO_FEATURES,
  GUTENBERG_FEATURES,
  WPBAKERY_FEATURES,
  createBuilderEcosystemState,
} from "./builderEcosystems";

const PACKS = [
  { id: "gutenberg", title: "Gutenberg", features: GUTENBERG_FEATURES },
  { id: "elementor", title: "Elementor", features: ELEMENTOR_FEATURES },
  { id: "elementor-pro", title: "Elementor Pro", features: ELEMENTOR_PRO_FEATURES },
  { id: "wpbakery", title: "WPBakery", features: WPBAKERY_FEATURES },
];

export default function BuilderEcosystemsDialog({
  open,
  page,
  onClose,
  onApplyPack,
  onUpdateBuilderPacks,
}) {
  const [tab, setTab] = useState(0);
  const builderPacks = useMemo(() => createBuilderEcosystemState(page), [page]);

  useEffect(() => {
    if (open) setTab(0);
  }, [open]);

  const setPackEnabled = (packId) => (_event, checked) => {
    onUpdateBuilderPacks?.({
      [packId]: {
        enabled: checked,
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Builder Ecosystems</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={{ minHeight: 44 }}>
          {PACKS.map((pack) => (
            <Tab key={pack.id} label={pack.title} sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }} />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          <Stack spacing={1.25}>
            {PACKS.map((pack, index) => {
              const state = builderPacks[pack.id] || {};
              const enabled = state.enabled !== false;
              return (
                <Box key={pack.id} sx={{ display: tab === index ? "block" : "none" }}>
                  <Stack spacing={1.5}>
                    <Typography sx={{ fontWeight: 700 }}>{pack.title}</Typography>
                    <Typography sx={{ color: "#5f6f8a" }}>
                      {pack.title === "Gutenberg" && "Block editor ecosystem: blocks, patterns, reusable blocks, templates, and template parts."}
                      {pack.title === "Elementor" && "Live editor ecosystem: widgets, responsive editing, templates, and global styles."}
                      {pack.title === "Elementor Pro" && "Premium ecosystem: theme builder, dynamic content, forms, popups, and custom code."}
                      {pack.title === "WPBakery" && "Classic page builder ecosystem: frontend editor, backend editor, content elements, and role manager."}
                    </Typography>
                    <FormControlLabel
                      control={<Switch checked={enabled} onChange={setPackEnabled(pack.id)} />}
                      label={`Enable ${pack.title}`}
                    />
                    <Grid container spacing={1.25}>
                      {pack.features.map((feature) => (
                        <Grid item xs={12} md={6} key={feature.id}>
                          <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
                            <Typography sx={{ fontWeight: 700 }}>{feature.title}</Typography>
                            <Typography sx={{ mt: 0.5, color: "#5f6f8a" }}>{feature.detail}</Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                    <Button
                      variant="contained"
                      onClick={() => onApplyPack?.(pack.id)}
                      disabled={!enabled}
                    >
                      Apply {pack.title} Pack
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
