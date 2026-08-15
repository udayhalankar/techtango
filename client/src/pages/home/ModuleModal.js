// src/pages/home/ModuleModal.js
import React, { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
import VerifiedIcon from "@mui/icons-material/Verified";
import { getModuleIconByName } from "./moduleIcons";

export default function ModuleModal({ onClose }) {
  const [allModules, setAllModules] = useState([]);
  const [subs, setSubs] = useState(new Set()); // holds module_id values
  const [loading, setLoading] = useState(true);

  // fetch modules + current subscriptions
  useEffect(() => {
    (async () => {
      try {
        const [modsRes, subsRes] = await Promise.all([
          api.get("/subscription/modules"),
          api.get("/subscription/subscriptions"),
        ]);
        setAllModules(Array.isArray(modsRes.data) ? modsRes.data : []);
        const ids = new Set(
          (Array.isArray(subsRes.data) ? subsRes.data : []).map((s) => s.module_id)
        );
        setSubs(ids);
      } catch (e) {
        console.error("Error loading modules/subscriptions", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subscribe = useCallback(async (moduleId) => {
    try {
      await api.post("/subscription/subscribe", { moduleId });
      setSubs((prev) => new Set(prev).add(moduleId));
    } catch (e) {
      console.error("Failed to subscribe", e);
    }
  }, []);

  const cancel = useCallback(async (moduleId) => {
    try {
      // NEW: use DELETE /subscription/subscriptions/:moduleId
      await api.delete(`/subscription/subscriptions/${moduleId}`);
      setSubs((prev) => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
    } catch (e) {
      console.error("Failed to cancel subscription", e);
    }
  }, []);

  return (
    <Dialog
      open
      onClose={onClose}              // closes on backdrop click & Esc by default
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: { borderRadius: 2, overflow: "hidden" },
      }}
    >
      <DialogTitle
  sx={{
    pr: 6,
    py: 1.25,
    bgcolor: (theme) =>
      theme.palette.mode === "dark" ? theme.palette.grey[600] : theme.palette.grey[300],
    borderBottom: 1,
    borderColor: "divider",
  }}
>
  <Typography variant="subtitle1" component="div" fontWeight={700}>
    All Modules
  </Typography>
  <IconButton
    onClick={onClose}
    size="small"
    sx={{ position: "absolute", right: 8, top: 6 }}
    aria-label="Close"
  >
    <CloseIcon fontSize="small" />
  </IconButton>
</DialogTitle>


      <DialogContent dividers sx={{ pt: 1, pb: 2 }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        ) : allModules.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No modules returned from the server.
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {allModules.map((mod) => {
              const isSub = subs.has(mod.id);
              const ModuleIcon = getModuleIconByName(mod.name);
              return (
                <Grid key={mod.id} item xs={12} sm={6} md={3}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      bgcolor: "#fff",
                      boxShadow: 1,                       // subtle shadow
                      "&:hover": { boxShadow: 3 },
                      borderRadius: 2,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent sx={{ p: 1.25, pb: 0.75 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: "rgba(47,125,214,0.1)",
                          color: "#1a4fd8",
                          mb: 1,
                        }}
                      >
                        <ModuleIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          noWrap
                          title={mod.name}
                        >
                          {mod.name}
                        </Typography>
                        {isSub && (
                          <Chip
                            size="small"
                            color="success"
                            icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                            label="Subscribed"
                            sx={{ ml: "auto" }}
                          />
                        )}
                      </Stack>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          overflow: "hidden",
                          mt: 0.5,
                        }}
                        title={mod.description || "No description"}
                      >
                        {mod.description || "No description"}
                      </Typography>
                    </CardContent>

                    <Box sx={{ flexGrow: 1 }} />

                    <CardActions
                      sx={{
                        p: 1,
                        pt: 0.5,
                        justifyContent: "space-between",
                      }}
                    >
                      {isSub ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon fontSize="small" />}
                          onClick={() => cancel(mod.id)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<AddIcon fontSize="small" />}
                          onClick={() => subscribe(mod.id)}
                        >
                          Subscribe
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
}

