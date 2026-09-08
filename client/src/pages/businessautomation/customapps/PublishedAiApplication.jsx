import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import api from "../../../services/api";
import GeneratedAppPreview from "../aiappbuilder/simple/GeneratedAppPreview";

export default function PublishedAiApplication() {
  const { appSlug = "" } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [applicationFullscreen, setApplicationFullscreen] =
    useState(false);

  const [notice, setNotice] = useState({
    open: false,
    severity: "success",
    text: "",
  });

  const showNotice = (
    text,
    severity = "success"
  ) => {
    setNotice({
      open: true,
      severity,
      text: String(text || ""),
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadPublishedApplication =
      async () => {
        setLoading(true);
        setLoadError("");

        try {
          const response = await api.get(
            `/aiappbuilder/published/${encodeURIComponent(
              String(appSlug || "")
            )}`
          );

          if (cancelled) return;

          const loadedApp =
            response?.data?.app || null;

          const loadedSchema =
            response?.data?.schema ||
            loadedApp?.schema_json ||
            null;

          if (
            !loadedApp ||
            !loadedSchema
          ) {
            throw new Error(
              "Published application could not be loaded."
            );
          }

          const frontendSpec =
            loadedSchema?.ui
              ?.frontendSpec;

          const isSimpleBuilderApp =
            String(
              loadedSchema?.ui
                ?.builder || ""
            ).toLowerCase() ===
              "simple" &&
            frontendSpec &&
            typeof frontendSpec ===
              "object";

          // Advanced/legacy published applications keep their
          // existing runtime routes. The new V2.9.2 published
          // runtime is authoritative for Simple Builder apps.
          if (!isSimpleBuilderApp) {
            const mode = String(
              loadedSchema?.appMode ||
                ""
            ).toLowerCase();

            navigate(
              mode === "crud"
                ? `/aicrudapp/${loadedApp.id}`
                : `/aidashboardapp/${loadedApp.id}`,
              { replace: true }
            );

            return;
          }

          setApp(loadedApp);
          setSchema(loadedSchema);
        } catch (error) {
          if (cancelled) return;

          console.error(
            "[PUBLISHED_AI_APP_LOAD]",
            error
          );

          setLoadError(
            error?.response?.data
              ?.error ||
              error.message ||
              "Failed to load published application."
          );
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    if (appSlug) {
      loadPublishedApplication();
    } else {
      setLoadError(
        "Application identifier is missing."
      );
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [appSlug, navigate]);

  useEffect(() => {
    if (!applicationFullscreen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setApplicationFullscreen(false);
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [applicationFullscreen]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight:
            "calc(100vh - 72px)",
          display: "grid",
          placeItems: "center",
          bgcolor: "#f5f6f7",
        }}
      >
        <Stack
          alignItems="center"
          spacing={1.5}
        >
          <CircularProgress size={28} />

          <Typography
            sx={{
              color: "#61788d",
              fontSize: 13,
            }}
          >
            Loading published
            application...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box
        sx={{
          minHeight:
            "calc(100vh - 72px)",
          display: "grid",
          placeItems: "center",
          bgcolor: "#f5f6f7",
          p: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "min(560px, 96vw)",
            p: 3,
            border:
              "1px solid #dde5ec",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              color: "#173854",
              mb: 1,
            }}
          >
            Application could not be
            opened
          </Typography>

          <Typography
            sx={{
              color: "#73879a",
              fontSize: 12.5,
              mb: 2,
            }}
          >
            {loadError}
          </Typography>

          <Button
            variant="contained"
            startIcon={
              <ArrowBackRoundedIcon />
            }
            onClick={() =>
              navigate("/customapps")
            }
            sx={{
              textTransform: "none",
            }}
          >
            Back to Custom Applications
          </Button>
        </Paper>
      </Box>
    );
  }

  const frontendSpec =
    schema?.ui?.frontendSpec;

  return (
    <Box
      sx={
        applicationFullscreen
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 1500,
              bgcolor: "#f5f6f7",
              overflow: "auto",
            }
          : {
              minHeight:
                "calc(100vh - 72px)",
              bgcolor: "#f5f6f7",
            }
      }
    >
      {!applicationFullscreen ? (
        <Box
          sx={{
            height: 46,
            px: 2,
            display: "flex",
            alignItems: "center",
            bgcolor: "#ffffff",
            borderBottom:
              "1px solid #dce5ed",
          }}
        >
          <Button
            size="small"
            startIcon={
              <ArrowBackRoundedIcon />
            }
            onClick={() =>
              navigate("/customapps")
            }
            sx={{
              textTransform: "none",
              fontSize: 11.5,
            }}
          >
            Custom Applications
          </Button>
        </Box>
      ) : null}

      <Box
        sx={{
          minHeight: applicationFullscreen
            ? "100vh"
            : "calc(100vh - 118px)",
        }}
      >
        <GeneratedAppPreview
          spec={frontendSpec}
          backendApp={app}
          backendSchema={schema}
          onNotice={showNotice}
          applicationFullscreen={
            applicationFullscreen
          }
          onToggleApplicationFullscreen={() =>
            setApplicationFullscreen(
              (prev) => !prev
            )
          }
        />
      </Box>

      <Snackbar
        open={notice.open}
        autoHideDuration={3500}
        onClose={() =>
          setNotice((prev) => ({
            ...prev,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity={notice.severity}
          variant="filled"
          onClose={() =>
            setNotice((prev) => ({
              ...prev,
              open: false,
            }))
          }
        >
          {notice.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
