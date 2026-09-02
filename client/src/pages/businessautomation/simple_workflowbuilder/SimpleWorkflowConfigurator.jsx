  // client/src/pages/businessautomation/simple_workflowbuilder/SimpleWorkflowConfigurator.jsx

  import React, { useEffect, useMemo, useState } from "react";
  import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  TextField,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
  import { fetchWorkflow, listWorkflowSteps, updateStep, publishWorkflow, unpublishWorkflow, insertWorkflowStep } from "./api";
  import { Snackbar, Alert } from "@mui/material";
  import AccountTreeOutlinedIcon from
    "@mui/icons-material/AccountTreeOutlined";

  import CheckCircleOutlineRoundedIcon from
    "@mui/icons-material/CheckCircleOutlineRounded";

  import WarningAmberRoundedIcon from
    "@mui/icons-material/WarningAmberRounded";

  import TimerOutlinedIcon from
    "@mui/icons-material/TimerOutlined";

  import PlayArrowRoundedIcon from
    "@mui/icons-material/PlayArrowRounded";

  import AddRoundedIcon from
    "@mui/icons-material/AddRounded";

  import PersonOutlineRoundedIcon from
    "@mui/icons-material/PersonOutlineRounded";

  import BoltRoundedIcon from
    "@mui/icons-material/BoltRounded";

  import MailOutlineRoundedIcon from
    "@mui/icons-material/MailOutlineRounded";

  import HubOutlinedIcon from
    "@mui/icons-material/HubOutlined";

  import DashboardCustomizeOutlinedIcon from
    "@mui/icons-material/DashboardCustomizeOutlined";

  import api from "../../../services/api";
  import StepInlineConfigurator from "./components/SimpleWorkflowStepInlineConfiguration";
  import SimpleWorkflowMapRF from "../components/SimpleWorkflowMapRF";
  import StepModal from "./components/SimpleWorkflowStepInlineConfiguration";

  const ATTACH_OPTIONS = [
    { value: "view_upload", label: "Can view & upload" },
    { value: "view_only", label: "Can view, cannot upload" },
    { value: "upload_only", label: "Cannot view, can upload" },
    { value: "none", label: "Cannot view & cannot upload" },
  ];

  const SLA_OPTIONS = ["Normal", "High", "Critical"];

  export default function SimpleWorkflowConfigurator({ workflowIdParam }) {
    const workflowId =
      workflowIdParam || window.location.pathname.split("/").pop();

    const [header, setHeader] = useState(null);
    const [steps, setSteps] = useState([]);
    const [users, setUsers] = useState([]);

    const [selectedStepId, setSelectedStepId] = useState(null);
    const [stepDraft, setStepDraft] = useState(null); // editable copy for center panel

    const [editingStep, setEditingStep] = useState(null); // opens full Step/Form/View modal
    const [publishing, setPublishing] = useState(false);
    const [publishReady, setPublishReady] = useState(false);
    const [publishReasons, setPublishReasons] = useState([]);
    const [publishChecking, setPublishChecking] = useState(false);
    const [toast, setToast] = useState({ open:false, message:"", severity:"success" });
    const showToast = (m, s='success') => setToast({ open:true, message:m, severity:s });
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addStepName, setAddStepName] = useState("");
    const [addAfterId, setAddAfterId] = useState(null);
    const [addSaving, setAddSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState("studio");
    const [mapViewId, setMapViewId] = useState(null);
    const [mapViewSaving, setMapViewSaving] = useState(false);

    // ------- load workflow + steps -------
    useEffect(() => {
      (async () => {
        const [h, s] = await Promise.all([
          fetchWorkflow(workflowId),
          listWorkflowSteps(workflowId),
        ]);
        setHeader(h);
        setSteps(s || []);
        if (s && s.length > 0) {
          setSelectedStepId(s[0].id);
          setStepDraft({ ...s[0] });
        }
      })().catch((err) => console.error(err));
    }, [workflowId]);

    // ------- load users (for performer + mail notifications) -------
    useEffect(() => {
      if (!header) return;
      let cancelled = false;

      async function loadUsers() {
        try {
          const resp = await api.get("/users", {
            params: { tenant_id: header.tenant_id },
          });
          if (!cancelled) {
            setUsers(Array.isArray(resp.data) ? resp.data : []);
          }
        } catch (err) {
          console.error("[workflow-configurator] loadUsers failed", err);
          if (!cancelled) setUsers([]);
        }
      }

      loadUsers();
      return () => {
        cancelled = true;
      };
    }, [header]);

    useEffect(() => {
      if (viewMode !== "map" || !header?.id) return;
      let cancelled = false;

      async function loadMapView() {
        try {
          const resp = await api.get("/simple_workflowmap_views", {
            params: { workflow_id: header.id },
          });
          if (!cancelled) {
            setMapViewId(resp?.data?.view?.id || null);
          }
        } catch (err) {
          if (!cancelled) setMapViewId(null);
        }
      }

      loadMapView();
      return () => {
        cancelled = true;
      };
    }, [viewMode, header?.id]);

    // re-sync draft when steps list changes or selected step changes
    useEffect(() => {
      if (!selectedStepId) return;
      const src = steps.find((s) => s.id === selectedStepId);
      if (src) setStepDraft({ ...src });
    }, [selectedStepId, steps]);



  const selectedStep = useMemo(
    () => (steps || []).find((s) => s.id === selectedStepId) || null,
    [steps, selectedStepId]
  );

  const isInitiate =
    (stepDraft?.step_name || "").toUpperCase() === "INITIATE";
  const isTerminate =
    (stepDraft?.step_name || "").toUpperCase() === "TERMINATE";

  const initiateStep = useMemo(
    () =>
      (steps || []).find(
        (s) => (s.step_name || "").toUpperCase() === "INITIATE"
      ) || null,
    [steps]
  );


    const stepsLessThanCurrent = useMemo(() => {
      if (!selectedStep) return [];
      return (steps || [])
        .filter((x) => Number(x.step_no) < Number(selectedStep.step_no))
        .map((x) => ({
          value: Number(x.step_no),
          label: `${x.step_no}. ${x.step_name}`,
          step_no: Number(x.step_no),
        }));
    }, [steps, selectedStep]);

    

    const userOptions = useMemo(() => {
      return (users || []).map((u) => {
        const idRaw = u?.id ?? u?.value ?? null;
        const id = Number.isFinite(Number(idRaw)) ? Number(idRaw) : null;
        const first = (u?.firstname || u?.first_name || "").trim();
        const last = (u?.lastname || u?.last_name || "").trim();
        const full = [first, last].filter(Boolean).join(" ");
        const email = (u?.email || "").trim();
        return {
          id,
          label: full || email || `User ${id}`,
          email,
        };
      });
    }, [users]);

    const handleDraftChange = (field, value) => {
      setStepDraft((prev) => ({ ...(prev || {}), [field]: value }));
    };

    // ---------- Preflight publish readiness check ----------
    useEffect(() => {
      let cancelled = false;
      async function runCheck() {
        if (!header?.id) {
          setPublishReady(false);
          setPublishReasons(["Header not loaded"]);
          return;
        }
        if (!Array.isArray(steps) || steps.length === 0) {
          setPublishReady(false);
          setPublishReasons(["No steps defined"]);
          return;
        }

        setPublishChecking(true);
        const reasons = [];

        // Step count
        if (steps.length < 3) reasons.push("At least 3 steps required");
        // If only Initiate + Terminate remain, block publish explicitly
        const nonTerm = steps.filter(
          (s) => String(s.step_name || "").trim().toUpperCase() !== "TERMINATE"
        );
        const nonInit = steps.filter(
          (s) => String(s.step_name || "").trim().toUpperCase() !== "INITIATE"
        );
        if (steps.length <= 2 && nonTerm.length === 1 && nonInit.length === 1) {
          reasons.push("At least one intermediate step is required");
        }

        const hasInit = steps.some(
          (s) =>
            Number(s.step_no) === 0 ||
            String(s.step_type || "").toLowerCase() === "create" ||
            String(s.step_name || "").toUpperCase() === "INITIATE"
        );
        const hasTerm = steps.some(
          (s) => String(s.step_name || "").trim().toUpperCase() === "TERMINATE"
        );
        if (!hasInit) reasons.push("Initiate step required (step_no=0 or type=create)");
        if (!hasTerm) reasons.push("Terminate step required");

        // Views per non-Terminate step (exclude last highest step_no as terminal)
        const maxStepNo = Math.max(...steps.map((s) => Number(s.step_no) || 0));
        const nonTermSteps = steps.filter((s) => {
          const nameU = String(s.step_name || "").trim().toUpperCase();
          const isLast = Number(s.step_no) === maxStepNo;
          return nameU !== "TERMINATE" && !isLast;
        });
        try {
          const results = await Promise.all(
            nonTermSteps.map(async (s) => {
              try {
                const { data } = await api.get(
                  "/simple_workflowbuilder_formviews",
                  {
                    params: {
                      workflow_map_id: header.id,
                        step_no: s.step_no,
                    },
                  }
                );
                const list = Array.isArray(data?.views)
                  ? data.views
                  : Array.isArray(data)
                  ? data
                  : [];
                return { step: s, hasView: list.length > 0 };
              } catch (e) {
                return { step: s, hasView: false };
              }
            })
          );

          const missing = results
            .filter((r) => !r.hasView)
            .map((r) => r.step.step_name || `#${r.step.id}`);
          if (missing.length) {
            reasons.push(
              `Saved view required for steps: ${missing.join(", ")}`
            );
          }
        } catch {}

        if (!cancelled) {
          setPublishReasons(reasons);
          setPublishReady(reasons.length === 0);
          setPublishChecking(false);
        }
      }
      runCheck();
      return () => {
        cancelled = true;
      };
    }, [header?.id, JSON.stringify(steps)]);

    // Publish state helpers
    const isPublished = !!(header?.isPublished || header?.ispublished);

    async function handlePublishToggle() {
      if (!header?.id) return;
      setPublishing(true);
      try {
        const updated = isPublished
          ? await unpublishWorkflow(header.id)
          : await publishWorkflow(header.id);
        setHeader((prev) => ({ ...(prev || {}), ...updated }));
        showToast(isPublished ? 'Unpublished workflow' : 'Published workflow', 'success');
      } catch (e) {
        showToast(
          e?.response?.data?.error || (isPublished ? 'Failed to unpublish' : 'Failed to publish'),
          'error'
        );
      } finally {
        setPublishing(false);
      }
    }

    function handleDiscard(){
      if (selectedStep) setStepDraft({ ...selectedStep });
      showToast('Changes discarded', 'info');
    }

    const nonTerminateSteps = useMemo(() => {
      return (steps || []).filter(
        (s) => String(s.step_name || "").toUpperCase() !== "TERMINATE"
      );
    }, [steps]);

    const defaultAddAfterId = useMemo(() => {
      if (!nonTerminateSteps.length) return null;
      const max = [...nonTerminateSteps].sort((a,b)=>Number(a.step_no)-Number(b.step_no)).pop();
      return max?.id ?? null;
    }, [nonTerminateSteps]);

    useEffect(() => {
      if (addModalOpen) {
        setAddAfterId(defaultAddAfterId);
      }
    }, [addModalOpen, defaultAddAfterId]);

    async function handleAddStep() {
      if (!addStepName.trim()) {
        showToast("Step name is required", "error");
        return;
      }
      setAddSaving(true);
      try {
        const resp = await insertWorkflowStep(workflowId, {
          step_name: addStepName.trim(),
          after_step_id: addAfterId ?? null,
        });
        const updated = Array.isArray(resp?.steps) ? resp.steps : [];
        const newStep = resp?.step;
        if (updated.length) {
          setSteps(updated);
        }
        if (newStep?.id) {
          setSelectedStepId(newStep.id);
          setStepDraft(newStep);
        }
        showToast("Step added", "success");
        setAddModalOpen(false);
        setAddStepName("");
      } catch (e) {
        console.error("[add step]", e);
        showToast("Failed to add step", "error");
      } finally {
        setAddSaving(false);
      }
    }

    // simple save for quick tweaks in center panel (Step tab–like)
    const handleQuickSave = async () => {
      if (!stepDraft) return;

      const payload = { ...stepDraft };

      if (!isInitiate) {
        // mail_notification_users as array of ints
        if (Array.isArray(payload.mail_notification_users)) {
          payload.mail_notification_users = payload.mail_notification_users
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v));
        } else {
          payload.mail_notification_users = [];
        }

        if (payload.step_performer !== null && payload.step_performer !== "") {
          const n = Number(payload.step_performer);
          if (Number.isFinite(n)) payload.step_performer = n;
        }

        const actionNow = String(
          payload.step_action ||
            (String(payload.approve_button_name || "").toLowerCase() === "send"
              ? "send"
              : "approve")
        ).toLowerCase();
        if (actionNow === "approve") {
          const approveLabel =
            typeof payload.approve_button_name === "string"
              ? payload.approve_button_name.trim()
              : "";
          const rejectLabel =
            typeof payload.reject_button_name === "string"
              ? payload.reject_button_name.trim()
              : "";
          if (!approveLabel || !rejectLabel) {
            showToast(
              "Approve and Reject button text are required for Approve action.",
              "error"
            );
            return;
          }
        }

      }

      // strip fields that should not be patched
      delete payload.id;
      delete payload.date_created;
      delete payload.date_modified;
      delete payload.created_by;
      delete payload.modified_by;

      await updateStep(selectedStepId, payload);
      const s = await listWorkflowSteps(workflowId);
      setSteps(s || []);
    };

    const handleSaveMapView = async (mapView) => {
      if (!header?.id) return;
      setMapViewSaving(true);
      try {
        if (mapViewId) {
          const resp = await api.put(`/simple_workflowmap_views/${mapViewId}`, {
            workflow_id: header.id,
            map_view: mapView,
          });
          setMapViewId(resp?.data?.view?.id || mapViewId);
        } else {
          const resp = await api.post(`/simple_workflowmap_views`, {
            workflow_id: header.id,
            map_view: mapView,
          });
          setMapViewId(resp?.data?.view?.id || null);
        }
        showToast("Map view saved", "success");
      } catch (err) {
        showToast(
          err?.response?.data?.error || "Failed to save map view",
          "error"
        );
      } finally {
        setMapViewSaving(false);
      }
    };

    // Delete a step (except Initiate/Terminate) and resequence
    async function handleDeleteStep(stepToDelete) {
      if (!stepToDelete?.id) return;
      const nm = String(stepToDelete.step_name || "").toUpperCase();
      if (nm === "INITIATE" || nm === "TERMINATE") return;
      try {
        setLoading(true);
        await api.delete(`/simple_workflowbuilder/steps/${stepToDelete.id}`);
        const refreshed = await listWorkflowSteps(workflowId);
        setSteps(refreshed || []);
        const init = refreshed?.find(
          (s) =>
            Number(s.step_no) === 0 ||
            String(s.step_name || "").toUpperCase() === "INITIATE"
        );
        setSelectedStepId(init?.id || refreshed?.[0]?.id || null);
        setStepDraft(init || refreshed?.[0] || null);
        showToast("Step removed and steps re-ordered", "success");
      } catch (e) {
        console.error("delete step failed", e);
        showToast(e?.response?.data?.error || "Failed to delete step", "error");
      } finally {
        setLoading(false);
      }
    }

    const jsonPreview = useMemo(() => {
      if (!stepDraft) return "{}";
      const sample = {
          step_no: stepDraft.step_no,
        name: stepDraft.step_name,
        action:
          stepDraft.step_action ||
          (String(stepDraft.approve_button_name || "").toLowerCase() === "send"
            ? "Send"
            : "Approve"),
        performer: stepDraft.step_performer,
        next_on_reject: stepDraft.next_step_after_reject,
        sla_days: stepDraft.step_due_in_days,
        notify: stepDraft.mail_notification_users,
      };
      return JSON.stringify(sample, null, 2);
    }, [stepDraft]);

    // open full modal (with Step/Form/View Form logic) for the currently selected step
    const openFullConfigurator = () => {
      if (!selectedStep || isTerminate) return;
      setEditingStep(selectedStep);
    };

    const configuredStepCount =
    useMemo(
      () => {

        return (
          steps ||
          []
        ).filter(
          (
            step
          ) => {

            const name =
              String(
                step?.step_name ||
                ""
              )
                .trim()
                .toUpperCase();


            if (
              name ===
              "TERMINATE"
            ) {
              return true;
            }


            return Boolean(
              step?.step_action ||
              step?.approve_button_name ||
              step?.step_performer
            );
          }
        ).length;

      },
      [
        steps,
      ]
    );


  const attentionStepCount =
    Math.max(
      0,
      steps.length -
        configuredStepCount
    );


  const readinessPercent =
    steps.length
      ? Math.round(
          (
            configuredStepCount /
            steps.length
          ) *
            100
        )
      : 0;


  const currentSla =
    Number(
      selectedStep
        ?.step_due_in_days ??
      1
    );

    // --------- RENDER ----------
    return (
    <Box
      sx={{
        display:
          "flex",

        flexDirection:
          "column",

        minHeight:
          "100vh",

        bgcolor:
          "#f4f7fa",

        color:
          "#29465b",
      }}
    >
        {!header ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body1">Loading…</Typography>
          </Box>
        ) : (
          <>
            {/* Top bar */}
            
  {/* ============================================================
    COMPACT WORKFLOW STUDIO HEADER
============================================================ */}

<Box
  sx={{
    width: "100%",
    px: {
      xs: 1.5,
      md: 2,
    },
    py: 0.85,

    position: "relative",
    overflow: "hidden",

    color: "#ffffff",

    background:
      "linear-gradient(105deg, #174562 0%, #1e6982 58%, #2693a5 100%)",

    borderRadius: 0,
  }}
>
  {/* subtle decorative element */}
  <Box
    sx={{
      position: "absolute",
      width: 170,
      height: 170,
      right: -50,
      top: -95,
      border: "30px solid rgba(255,255,255,.045)",
      borderRadius: "50%",
      pointerEvents: "none",
    }}
  />

  <Box
    sx={{
      position: "relative",
      zIndex: 1,
    }}
  >
    {/* ======================================================
        SMALL WORKFLOW STUDIO LABEL
    ====================================================== */}

    <Typography
      sx={{
        mb: 0.15,

        fontSize: 7.5,
        lineHeight: 1.2,

        fontWeight: 500,
        letterSpacing: ".14em",
        textTransform: "uppercase",

        color: "rgba(225,245,248,.78)",
      }}
    >
      Workflow Studio
    </Typography>

    {/* ======================================================
        TITLE + BUTTONS
    ====================================================== */}

    <Box
      sx={{
        display: "flex",

        flexDirection: {
          xs: "column",
          md: "row",
        },

        alignItems: {
          xs: "flex-start",
          md: "center",
        },

        justifyContent: "space-between",

        gap: {
          xs: 0.7,
          md: 2,
        },
      }}
    >
      {/* WORKFLOW TITLE */}

      <Typography
        sx={{
          minWidth: 0,

          fontSize: {
            xs: 18,
            md: 20,
          },

          lineHeight: 1.05,
          fontWeight: 700,

          color: "#ffffff",

          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {header.workflow_map_name}
      </Typography>

      {/* ACTION BUTTONS */}

      <Stack
        direction="row"
        spacing={0.55}
        useFlexGap
        flexWrap="wrap"
        sx={{
          flexShrink: 0,
        }}
      >
        {/* STUDIO */}

        <Button
          size="small"
          startIcon={
            <DashboardCustomizeOutlinedIcon
              sx={{
                fontSize: "13px !important",
              }}
            />
          }
          onClick={() => setViewMode("studio")}
          sx={{
            height: 27,
            minHeight: 27,

            px: 1.1,

            borderRadius: "3px",

            textTransform: "none",

            fontSize: 9,
            fontWeight: 600,

            color:
              viewMode === "studio"
                ? "#1d6178"
                : "#ffffff",

            bgcolor:
              viewMode === "studio"
                ? "#ffffff"
                : "rgba(255,255,255,.08)",

            border:
              "1px solid rgba(255,255,255,.24)",

            "& .MuiButton-startIcon": {
              mr: 0.45,
            },

            "&:hover": {
              bgcolor:
                viewMode === "studio"
                  ? "#ffffff"
                  : "rgba(255,255,255,.15)",
            },
          }}
        >
          Studio
        </Button>

        {/* WORKFLOW MAP */}

        <Button
          size="small"
          startIcon={
            <HubOutlinedIcon
              sx={{
                fontSize: "13px !important",
              }}
            />
          }
          onClick={() => setViewMode("map")}
          sx={{
            height: 27,
            minHeight: 27,

            px: 1.1,

            borderRadius: "3px",

            textTransform: "none",

            fontSize: 9,
            fontWeight: 600,

            color:
              viewMode === "map"
                ? "#1d6178"
                : "#ffffff",

            bgcolor:
              viewMode === "map"
                ? "#ffffff"
                : "rgba(255,255,255,.08)",

            border:
              "1px solid rgba(255,255,255,.24)",

            "& .MuiButton-startIcon": {
              mr: 0.45,
            },

            "&:hover": {
              bgcolor:
                viewMode === "map"
                  ? "#ffffff"
                  : "rgba(255,255,255,.15)",
            },
          }}
        >
          Workflow Map
        </Button>

        {/* DISCARD */}

        <Button
          size="small"
          onClick={handleDiscard}
          sx={{
            height: 27,
            minHeight: 27,

            px: 1.05,

            borderRadius: "3px",

            textTransform: "none",

            fontSize: 9,
            fontWeight: 600,

            color: "#ffffff",

            border:
              "1px solid rgba(255,255,255,.24)",

            bgcolor:
              "rgba(255,255,255,.06)",

            "&:hover": {
              bgcolor:
                "rgba(255,255,255,.14)",
            },
          }}
        >
          Discard
        </Button>

        {/* PUBLISH */}

        <Button
          size="small"
          variant="contained"
          disabled={
            publishing ||
            !publishReady ||
            publishChecking
          }
          onClick={handlePublishToggle}
          sx={{
            height: 27,
            minHeight: 27,

            px: 1.2,

            borderRadius: "3px",

            textTransform: "none",

            fontSize: 9,
            fontWeight: 600,

            bgcolor: "#0879df",

            boxShadow: "none",

            "&:hover": {
              bgcolor: "#066dc8",
              boxShadow: "none",
            },

            "&.Mui-disabled": {
              color:
                "rgba(255,255,255,.42)",

              bgcolor:
                "rgba(8,121,223,.28)",
            },
          }}
        >
          {isPublished
            ? "Unpublish Workflow"
            : "Publish Workflow"}
        </Button>
      </Stack>
    </Box>

    {/* ======================================================
        WARNING + WORKFLOW META
    ====================================================== */}

    <Box
      sx={{
        mt: 0.65,

        display: "flex",

        flexDirection: {
          xs: "column",
          sm: "row",
        },

        alignItems: {
          xs: "flex-start",
          sm: "center",
        },

        justifyContent: "space-between",

        gap: {
          xs: 0.6,
          sm: 1.5,
        },

        minHeight: 22,
      }}
    >
      {/* WARNING - LEFT */}

      <Box
        sx={{
          minWidth: 0,

          display: "flex",
          alignItems: "center",

          gap: 0.5,
        }}
      >
        {!publishReady && (
          <>
            <WarningAmberRoundedIcon
              sx={{
                flexShrink: 0,

                fontSize: 12,

                color: "#ffda85",
              }}
            />

            <Typography
              sx={{
                fontSize: 7.8,
                lineHeight: 1.2,

                fontWeight: 500,

                color:
                  "rgba(255,255,255,.88)",

                whiteSpace: {
                  sm: "nowrap",
                },
              }}
            >
              {publishReasons?.length
                ? `${publishReasons.length} workflow configuration issue${
                    publishReasons.length === 1
                      ? ""
                      : "s"
                  } require attention`
                : "Workflow configuration requires attention"}
            </Typography>
          </>
        )}

        {publishReady && (
          <>
            <CheckCircleOutlineRoundedIcon
              sx={{
                fontSize: 12,

                color: "#98e1b8",
              }}
            />

            <Typography
              sx={{
                fontSize: 7.8,
                fontWeight: 500,

                color:
                  "rgba(255,255,255,.86)",
              }}
            >
              Workflow configuration complete
            </Typography>
          </>
        )}
      </Box>

      {/* META CHIPS - RIGHT */}

      <Stack
        direction="row"
        spacing={0.45}
        useFlexGap
        flexWrap="wrap"
        sx={{
          flexShrink: 0,

          justifyContent: {
            xs: "flex-start",
            sm: "flex-end",
          },
        }}
      >
        {/* TABLE */}

        <Chip
          icon={
            <AccountTreeOutlinedIcon
              sx={{
                fontSize:
                  "11px !important",

                color:
                  "inherit !important",
              }}
            />
          }
          label={
            header.workflow_table_name ||
            "Not linked"
          }
          size="small"
          sx={{
            height: 21,

            borderRadius: "3px",

            bgcolor:
              "rgba(7,42,61,.24)",

            border:
              "1px solid rgba(255,255,255,.16)",

            color:
              "rgba(255,255,255,.92)",

            fontSize: 7.8,

            "& .MuiChip-label": {
              px: 0.75,
            },

            "& .MuiChip-icon": {
              ml: 0.65,
            },
          }}
        />

        {/* STEPS */}

        <Chip
          label={`${steps.length} Steps`}
          size="small"
          sx={{
            height: 21,

            borderRadius: "3px",

            bgcolor:
              "rgba(7,42,61,.24)",

            border:
              "1px solid rgba(255,255,255,.16)",

            color:
              "rgba(255,255,255,.92)",

            fontSize: 7.8,

            "& .MuiChip-label": {
              px: 0.8,
            },
          }}
        />

        {/* STATUS */}

        <Chip
          label={
            isPublished
              ? "Published"
              : "Draft"
          }
          size="small"
          sx={{
            height: 21,

            borderRadius: "3px",

            bgcolor:
              isPublished
                ? "rgba(54,162,105,.32)"
                : "rgba(215,154,40,.30)",

            border:
              isPublished
                ? "1px solid rgba(143,229,178,.26)"
                : "1px solid rgba(255,219,132,.28)",

            color:
              isPublished
                ? "#c5f2d7"
                : "#ffe09a",

            fontSize: 7.8,
            fontWeight: 600,

            "& .MuiChip-label": {
              px: 0.8,
            },
          }}
        />
      </Stack>
    </Box>
  </Box>
</Box>

  
            
                    {/* Add Step dialog */}
            <Dialog
              open={addModalOpen}
              onClose={()=>setAddModalOpen(false)}
              fullWidth
              maxWidth="xs"
              PaperProps={{
                sx: {
                  borderRadius: 3,
                  boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
                }
              }}
            >
              <DialogTitle>Add New Step</DialogTitle>
              <DialogContent sx={{ display:'grid', gap: 1.5, mt: 0.5 }}>
                <TextField
                  autoFocus
                  label="Step Name"
                  value={addStepName}
                  onChange={(e)=>setAddStepName(e.target.value)}
                  fullWidth
                  size="small"
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Add After</InputLabel>
                  <Select
                    label="Add After"
                    value={addAfterId ?? ""}
                    onChange={(e)=>setAddAfterId(e.target.value === "" ? null : Number(e.target.value))}
                  >
                    {nonTerminateSteps.map(s=>(
                      <MenuItem key={s.id} value={s.id}>{`${s.step_no}. ${s.step_name}`}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={()=>setAddModalOpen(false)} disabled={addSaving}>Cancel</Button>
                <Button variant="contained" onClick={handleAddStep} disabled={addSaving}>{addSaving ? "Adding..." : "Add Step"}</Button>
              </DialogActions>
            </Dialog>

            <Snackbar open={toast.open} autoHideDuration={2500} onClose={()=>setToast(t=>({...t, open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
              <Alert onClose={()=>setToast(t=>({...t, open:false}))} severity={toast.severity} sx={{ width: '100%' }}>
                {toast.message}
              </Alert>
            </Snackbar>

            {/* Main 3-column grid */}

<Box
  sx={{
    py: 0,
    px: 0,

    maxWidth: 1680,
    width: "100%",

    mx: "auto",
    minHeight: 0,

    flex:
      viewMode === "map"
        ? "0 0 calc(100dvh - 135px)"
        : 1,

    ...(viewMode === "map" && {
      height: "calc(100dvh - 135px)",
      minHeight: "calc(100dvh - 135px)",
      maxHeight: "calc(100dvh - 135px)",

      flexShrink: 0,

      overflow: "hidden",
    }),
  }}
>

<Grid
  container
  spacing={0}
  sx={{
    height: "100%",
    minHeight: 0,
    alignItems: "stretch",
  }}
>


              {/* ============================================================
      LEFT — PROCESS FLOW
  ============================================================ */}

  <Grid
  item
  xs={12}
  md={2}
  lg={2}
  sx={{
    height: viewMode === "map" ? "100%" : "auto",
    minHeight: 0,
  }}
>

    <Paper
  elevation={0}
  variant="outlined"
  sx={{
    height: "100%",

    overflow: "hidden",

    borderRadius: 0,

    borderColor: "#dce6ed",

    bgcolor: "#ffffff",

    borderTop: 0,
  }}
>

      {/* HEADER */}

<Box
  sx={{
    minHeight: 45,
    px: 1.4,

    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",

    borderBottom: "1px solid #eaf0f4",
  }}
>
  <Typography
    sx={{
      fontSize: 9,
      fontWeight: 700,

      textTransform: "uppercase",
      letterSpacing: ".08em",

      color: "#6a8193",
    }}
  >
    {viewMode === "map"
      ? "Add Node"
      : "Process Flow"}
  </Typography>

  {viewMode !== "map" && (
    <IconButton
      size="small"

      onClick={() =>
        setAddModalOpen(true)
      }

      sx={{
        width: 28,
        height: 28,

        borderRadius: "3px",

        bgcolor: "#edf6ff",
        color: "#0879df",

        "&:hover": {
          bgcolor: "#e2f0fd",
        },
      }}
    >
      <AddRoundedIcon
        sx={{
          fontSize: 17,
        }}
      />
    </IconButton>
  )}
</Box>


      {/* FLOW */}

      {/* ============================================================
    LEFT CONTENT

    STUDIO VIEW  -> Process Flow / Steps
    MAP VIEW     -> Node Palette
============================================================ */}

{viewMode === "map" ? (
  /* ==========================================================
      MAP VIEW — NODE PALETTE
  ========================================================== */

  <Box
    sx={{
      px: 1.25,
      py: 1.35,
    }}
  >
    <Stack spacing={0.8}>

      {/* ------------------------------------------------------
          START
      ------------------------------------------------------ */}

      <Box
        sx={{
          minHeight: 38,

          px: 1.1,

          display: "flex",
          alignItems: "center",
          gap: 1,

          bgcolor: "#f8fbfd",

          border: "1px solid #cbd8e4",
          borderRadius: "5px",

          cursor: "default",

          transition:
            "border-color .12s ease, background-color .12s ease",

          "&:hover": {
            borderColor: "#8fb7d3",
            bgcolor: "#f4f9fc",
          },
        }}
      >
        {/* START SYMBOL */}

        <Box
          sx={{
            width: 13,
            height: 13,

            flexShrink: 0,

            borderRadius: "50%",

            bgcolor: "#ffffff",

            border: "1.5px solid #36a269",
          }}
        />

        <Typography
          sx={{
            fontSize: 10.5,
            fontWeight: 600,
            color: "#30475b",
          }}
        >
          Start
        </Typography>
      </Box>


      {/* ------------------------------------------------------
          PROCESS

          Uses the existing Add Step functionality.
      ------------------------------------------------------ */}

      <Box
        onClick={() =>
          setAddModalOpen(true)
        }
        sx={{
          minHeight: 38,

          px: 1.1,

          display: "flex",
          alignItems: "center",
          gap: 1,

          bgcolor: "#f8fbfd",

          border: "1px solid #cbd8e4",
          borderRadius: "5px",

          cursor: "pointer",

          transition:
            "border-color .12s ease, background-color .12s ease, transform .12s ease",

          "&:hover": {
            borderColor: "#4f9ac7",
            bgcolor: "#f1f8fc",
            transform: "translateX(2px)",
          },
        }}
      >
        {/* PROCESS SYMBOL */}

        <Box
          sx={{
            width: 13,
            height: 13,

            flexShrink: 0,

            borderRadius: "2px",

            bgcolor: "#ffffff",

            border: "1.5px solid #9eb2c3",
          }}
        />

        <Typography
          sx={{
            fontSize: 10.5,
            fontWeight: 600,
            color: "#30475b",
          }}
        >
          Process
        </Typography>
      </Box>


      {/* ------------------------------------------------------
          DECISION

          Current AUGMIS workflow data model creates this
          automatically for step_action === "approve".
      ------------------------------------------------------ */}

      <Box
        sx={{
          minHeight: 38,

          px: 1.1,

          display: "flex",
          alignItems: "center",
          gap: 1,

          bgcolor: "#f8fbfd",

          border: "1px solid #cbd8e4",
          borderRadius: "5px",

          cursor: "default",

          transition:
            "border-color .12s ease, background-color .12s ease",

          "&:hover": {
            borderColor: "#53aaa6",
            bgcolor: "#f3fbfa",
          },
        }}
      >
        {/* DECISION SYMBOL */}

        <Box
          sx={{
            width: 10,
            height: 10,

            ml: "1px",
            mr: "2px",

            flexShrink: 0,

            bgcolor: "#ffffff",

            border: "1.5px solid #0b9c97",

            transform: "rotate(45deg)",

            borderRadius: "1px",
          }}
        />

        <Typography
          sx={{
            fontSize: 10.5,
            fontWeight: 600,
            color: "#30475b",
          }}
        >
          Decision
        </Typography>
      </Box>


      {/* ------------------------------------------------------
          END
      ------------------------------------------------------ */}

      <Box
        sx={{
          minHeight: 38,

          px: 1.1,

          display: "flex",
          alignItems: "center",
          gap: 1,

          bgcolor: "#f8fbfd",

          border: "1px solid #cbd8e4",
          borderRadius: "5px",

          cursor: "default",

          transition:
            "border-color .12s ease, background-color .12s ease",

          "&:hover": {
            borderColor: "#d98a85",
            bgcolor: "#fff8f7",
          },
        }}
      >
        {/* END SYMBOL */}

        <Box
          sx={{
            width: 13,
            height: 13,

            flexShrink: 0,

            borderRadius: "50%",

            bgcolor: "#ffffff",

            border: "1.5px solid #d84a43",
          }}
        />

        <Typography
          sx={{
            fontSize: 10.5,
            fontWeight: 600,
            color: "#30475b",
          }}
        >
          End
        </Typography>
      </Box>

    </Stack>


    {/* ======================================================
        CURRENT MAP MODEL INFO
    ====================================================== */}

    <Box
      sx={{
        mt: 2,

        pt: 1.3,

        borderTop:
          "1px solid #edf1f4",
      }}
    >
      <Typography
        sx={{
          mb: 0.7,

          fontSize: 7.5,

          fontWeight: 700,

          letterSpacing: ".10em",

          textTransform: "uppercase",

          color: "#8a9aa8",
        }}
      >
        Current Workflow
      </Typography>


      <Box
        sx={{
          display: "grid",
          rowGap: 0.55,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: 8.5,
              color: "#7e909f",
            }}
          >
            Process Steps
          </Typography>

          <Typography
            sx={{
              fontSize: 9,
              fontWeight: 700,
              color: "#40586b",
            }}
          >
            {Math.max(
              0,
              steps.filter((s) => {
                const n = String(
                  s?.step_name || ""
                )
                  .trim()
                  .toUpperCase();

                return (
                  n !== "INITIATE" &&
                  n !== "TERMINATE"
                );
              }).length
            )}
          </Typography>
        </Box>


        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: 8.5,
              color: "#7e909f",
            }}
          >
            Decisions
          </Typography>

          <Typography
            sx={{
              fontSize: 9,
              fontWeight: 700,
              color: "#40586b",
            }}
          >
            {
              steps.filter(
                (s) =>
                  String(
                    s?.step_action || ""
                  ).toLowerCase() ===
                  "approve"
              ).length
            }
          </Typography>
        </Box>
      </Box>
    </Box>
  </Box>
) : (

  /* ==========================================================
      STUDIO VIEW — EXISTING PROCESS FLOW
  ========================================================== */

  <Box
    sx={{
      px: 1.3,
      py: 1.5,
    }}
  >
    {steps.map(
      (
        step,
        index
      ) => {

        const stepName =
          String(
            step?.step_name ||
            ""
          )
            .trim()
            .toUpperCase();


        const terminate =
          stepName ===
          "TERMINATE";


        const active =
          !terminate &&
          step.id ===
            selectedStepId;


        const configured =
          Boolean(
            step?.step_action ||
            step?.approve_button_name ||
            step?.step_performer
          );


        const nodeColor =
          active
            ? "#0879df"
            : configured
              ? "#36a269"
              : terminate
                ? "#a7b3bd"
                : "#d79a28";


        return (
          <Box
            key={
              step.id
            }

            onClick={() => {

              if (
                terminate
              ) {
                return;
              }

              setSelectedStepId(
                step.id
              );
            }}

            sx={{
              position:
                "relative",

              display:
                "grid",

              gridTemplateColumns:
                "30px minmax(0,1fr)",

              gap:
                1,

              minHeight:
                65,

              cursor:
                terminate
                  ? "default"
                  : "pointer",

              opacity:
                terminate
                  ? 0.6
                  : 1,

              "&:not(:last-of-type)::after":
                {
                  content:
                    '""',

                  position:
                    "absolute",

                  left:
                    13,

                  top:
                    28,

                  width:
                    2,

                  height:
                    "calc(100% - 4px)",

                  bgcolor:
                    "#dce5eb",
                },
            }}
          >

            {/* NODE */}

            <Box
              sx={{
                position:
                  "relative",

                zIndex:
                  2,

                width:
                  28,

                height:
                  28,

                display:
                  "grid",

                placeItems:
                  "center",

                borderRadius:
                  "50%",

                bgcolor:
                  nodeColor,

                color:
                  "#ffffff",

                fontSize:
                  9,

                fontWeight:
                  700,

                border:
                  "3px solid #ffffff",

                boxShadow:
                  `0 0 0 1px ${nodeColor}`,
              }}
            >
              {
                step.step_no
              }
            </Box>


            {/* TEXT */}

            <Box
              sx={{
                mt:
                  0.2,

                px:
                  active
                    ? 0.9
                    : 0.3,

                py:
                  active
                    ? 0.7
                    : 0.3,

                borderLeft:
                  active
                    ? "3px solid #0879df"
                    : "3px solid transparent",

                bgcolor:
                  active
                    ? "#edf6ff"
                    : "transparent",
              }}
            >

              <Typography
                sx={{
                  fontSize:
                    10.5,

                  fontWeight:
                    700,

                  color:
                    "#304c61",
                }}
              >
                {
                  step.step_name
                }
              </Typography>


              <Typography
                sx={{
                  mt:
                    0.2,

                  fontSize:
                    8.5,

                  color:
                    "#8797a6",
                }}
              >
                {terminate
                  ? "Close workflow"
                  : Number(
                      step.step_no
                    ) ===
                    0
                    ? "Start workflow"
                    : "Intermediate step"}
              </Typography>


              <Box
                sx={{
                  mt:
                    0.6,

                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap:
                    0.5,
                }}
              >

                <Box
                  sx={{
                    width:
                      6,

                    height:
                      6,

                    borderRadius:
                      "50%",

                    bgcolor:
                      nodeColor,
                  }}
                />


                <Typography
                  sx={{
                    fontSize:
                      8,

                    fontWeight:
                      600,

                    color:
                      "#75899a",
                  }}
                >
                  {active
                    ? "Editing"
                    : terminate
                      ? "Final step"
                      : configured
                        ? "Configured"
                        : "Needs attention"}
                </Typography>

              </Box>

            </Box>
          </Box>
        );
      }
    )}
  </Box>
)}
    </Paper>

  </Grid>

                {/* CENTER – inline Step / Form / View Form configurator */}
  {viewMode === "map" ? (
  <Grid
  item
  xs={12}
  md={10}
  lg={10}
  sx={{
    height: "100%",
    minHeight: 0,

    display: "flex",
    flexDirection: "column",

    overflow: "hidden",
  }}
>
    <Box
  sx={{
    flex: 1,

    width: "100%",
    height: "100%",

    minWidth: 0,
    minHeight: 0,

    overflow: "hidden",
  }}
>
      <SimpleWorkflowMapRF
        steps={steps}
        onSaveView={handleSaveMapView}
        saveViewDisabled={!header?.id}
        saveViewSaving={mapViewSaving}
        selectedStepId={selectedStepId}
        onSelectStep={(id) => {
          setSelectedStepId(id);
        }}
        onOpenStep={(id) => {
          const step = (steps || []).find(
            (s) => Number(s.id) === Number(id)
          );

          if (!step) return;

          setSelectedStepId(step.id);
          setStepDraft({ ...step });
          setEditingStep(step);
        }}
      />
    </Box>
  </Grid>
) : (
  <Grid item xs={12} md={7} lg={7}>
        {/* <Paper
          elevation={0}
          variant="outlined"
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderRadius: 1,
            p: 1.5,
            borderColor: "grey.300",
          }}
        > */}
            {!selectedStep ? (
              <Paper
                elevation={0}
                variant="outlined"
                sx={{
                  height: "100%",

                  borderRadius: 0,

                  borderColor: "#dce6ed",

                  borderTop: 0,

                  bgcolor: "#ffffff",

                  boxShadow: "none",

                  overflow: "hidden",
                }}
              >
                <Typography variant="body2" sx={{ color: "#47617f" }}>
                  Select a step from the left to configure.
                </Typography>


              </Paper>
            ) : (
              <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{
                    p: 0,
                    m: 0,

                    width: "100%",
                    height: "100%",

                    borderRadius: 0,

                    fontSize: 12,

                    flex: 1,

                    borderColor: "#dce6ed",

                    borderTop: 0,

                    bgcolor: "#ffffff",

                    boxShadow: "none",

                    overflow: "hidden",
                  }}
                >
                
                <Box
  sx={{
      p: 0,
    m: 0,
    width: "100%",
                  }}
                >
                <StepInlineConfigurator
                  key={selectedStep.id}
                  inline
                  header={{
                    ...header,
                    stepsLessThanCurrent,
                    initiateFormFields:
                      initiateStep?.step_form_configuration?.fields || [],
                  }}
                  step={selectedStep}
                  users={users}
                  onClose={() => {}}
                  onRemove={handleDeleteStep}
                  onSave={async (payload) => {
                    const { __applyMailToFuture, ...rest } = payload || {};
                    await updateStep(selectedStep.id, rest);

                    if (__applyMailToFuture) {
                      const futurePatch = {};
                      if (rest.mail_content) futurePatch.mail_content = rest.mail_content;

                      const shouldApplyToOthers =
                        Object.keys(futurePatch).length > 0 &&
                        ((rest?.step_name || selectedStep.step_name || "").toUpperCase() ===
                          "INITIATE" ||
                          Number(rest?.step_no ?? selectedStep.step_no ?? 0) <= 1);

                      if (shouldApplyToOthers) {
                        const latest = (await listWorkflowSteps(workflowId)) || [];
                        const targets = latest.filter((s) => s.id !== selectedStep.id);
                        let failCount = 0;
                        let okCount = 0;
                        await Promise.all(
                          targets.map((t) =>
                            updateStep(t.id, futurePatch).then(
                              () => {
                                okCount += 1;
                              },
                              (err) => {
                                failCount += 1;
                                console.error("Failed to copy mail settings to step", t.id, err);
                                return null;
                              }
                            )
                          )
                        );
                        if (failCount > 0 || okCount > 0) {
                          alert(
                            `Mail settings applied: ${okCount} step(s) updated` +
                              (failCount ? `, ${failCount} failure(s). Check if Names of Approve & Reject Buttons have been entered in all steps. If These names are not available the Steps will not be updated` : "")
                          );
                        }
                      }
                    }

                    const s = await listWorkflowSteps(workflowId);
                    setSteps(s || []);
                  }}
                />
                </Box>
              </Paper>
            )}
          {/* </Paper> */}
        </Grid>
  )}


                {/* RIGHT – summary / JSON preview */}
  {viewMode !== "map" && (
         <Grid item xs={12} md={3} lg={3}>
          <Stack
            spacing={0}
            sx={{
              height: "100%",
            }}
          >
          <Paper
                elevation={0}
                variant="outlined"
                sx={{
                  p: 1.5,

                  borderRadius: 0,

                  borderColor: "#dce6ed",

                  borderTop: 0,

                  bgcolor: "#ffffff",

                  boxShadow: "none",
                }}
              >
                      <Typography
                        variant="caption"
                        sx={{
                          textTransform: "uppercase",
                          letterSpacing: 0.1,
                          color: "grey.600",
                        }}
                      >
                        Step summary
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          mt: 1,
                          p: 1.25,
                          borderRadius: 2,
                          bgcolor: "#f8fbff",
                          borderColor: "#e3ecf8",
                        }}
                      >
                        
                        {selectedStep && (
                          <Typography
                            variant="caption"
                            sx={{ color: "grey.700", lineHeight: 1.4 }}
                          >
                            Action:{" "}
                            <strong>
                              {selectedStep.step_action ||
                                (String(
                                  selectedStep.approve_button_name || ""
                                ).toLowerCase() === "send"
                                  ? "Send"
                                  : "Approve")}
                            </strong>
                            <br />
                            Performer:{" "}
                            <strong>
                              {selectedStep.step_performer ?? "– not set –"}
                            </strong>
                            <br />
                            Reject →{" "}
                            <strong>
                              {selectedStep.next_step_after_reject ?? "—"}
                            </strong>{" "}
                            • Due in{" "}
                            <strong>
                              {selectedStep.step_due_in_days ?? 1}
                            </strong>{" "}
                            day(s)
                          </Typography>
                        )}
                      </Paper>
                      {selectedStep && (
                        <Box sx={{ mt: 1, fontSize: 11, color: "grey.700" }}>
                          Buttons:{" "}
                          <strong>
                            {selectedStep.approve_button_name || "Approve"}
                          </strong>
                          {selectedStep.reject_button_name && (
                            <>
                              ,{" "}
                              <strong>{selectedStep.reject_button_name}</strong>
                            </>
                          )}
                          <br />
                          Notifications:{" "}
                          {Array.isArray(selectedStep.mail_notification_users)
                            ? selectedStep.mail_notification_users.length
                            : 0}{" "}
                          recipient(s)
                        </Box>
                      )}
                    </Paper>
                    
                    {/* JSON payload */}
                    <Paper
              elevation={0}
              variant="outlined"
            sx={{
                  p: 1.5,

                  borderRadius: 0,

                  fontSize: 12,

                  flex: 1,

                  borderColor: "#dce6ed",

                  borderTop: 0,

                  bgcolor: "#ffffff",

                  boxShadow: "none",
                }}
                >
                      <Typography
                        variant="caption"
                        sx={{
                          textTransform: "uppercase",
                          letterSpacing: 0.1,
                          color: "grey.600",
                        }}
                      >
                        JSON payload (sample)
                      </Typography>
                      <Box
                        sx={{
                          mt: 1,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          fontSize: 11,
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "grey.800",
                          bgcolor: "grey.900",
                          color: "grey.100",
                          p: 1,
                          maxHeight: 220,
                          overflow: "auto",
                          whiteSpace: "pre",
                        }}
                      >
                        {jsonPreview}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ mt: 1, color: "grey.600", display: "block" }}
                      >
                        In your real app this area can show the live payload for
                        debugging or audit previews.
                      </Typography>
                    </Paper>

                    <Paper
            elevation={0}
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 3,
              borderColor: "#d8e4f2",
              flex: 1,
              bgcolor: "rgba(255,255,255,0.88)",
              boxShadow: "0 14px 36px rgba(25, 46, 87, 0.08)",
            }}
          ></Paper>
                  </Stack>
                </Grid>
  )}
              </Grid>
            </Box>
          
          </>
        )}

        {/* FULL STEP / FORM / VIEW FORM MODAL (old logic preserved) */}
        {editingStep && (
          <StepModal
            header={{
              ...header,
              // value = STEP ID (number), label = "N. Name"
            stepsLessThanCurrent: (Array.isArray(steps) ? steps : [])
              .filter((x) => Number(x.step_no) < Number(editingStep.step_no))
              .map((x) => ({
                value: Number(x.step_no),
                label: `${x.step_no}. ${x.step_name}`,
                step_no: Number(x.step_no),
              })),
              initiateFormFields:
                initiateStep?.step_form_configuration?.fields || [],
            }}
            step={editingStep}
            users={users}
            onClose={() => setEditingStep(null)}
            onSave={async (payload) => {
              const { __applyMailToFuture, ...rest } = payload || {};
              await updateStep(editingStep.id, rest);

              // If requested, copy mail content from INITIATE to all other steps
              if (
                __applyMailToFuture &&
                (editingStep.step_name || "").toUpperCase() === "INITIATE" &&
                rest?.mail_content
              ) {
                const latest = (await listWorkflowSteps(workflowId)) || [];
                const targets = latest.filter((s) => s.id !== editingStep.id);

                const applyContent = { ...rest.mail_content };
                let failCount = 0;
                let okCount = 0;
                await Promise.all(
                  targets.map((t) =>
                    updateStep(t.id, { mail_content: applyContent }).then(
                      () => {
                        okCount += 1;
                      },
                      (err) => {
                        failCount += 1;
                        console.error("Failed to copy mail content to step", t.id, err);
                        return null;
                      }
                    )
                  )
                );
                if (failCount > 0 || okCount > 0) {
                  alert(
                    `Mail content applied: ${okCount} step(s) updated` +
                      (failCount ? `, ${failCount} failure(s)` : "")
                  );
                }
              }

              const s = await listWorkflowSteps(workflowId);
              setSteps(s || []);
              setEditingStep(null);
            }}
          />
        )}
      </Box>
    );
  }
