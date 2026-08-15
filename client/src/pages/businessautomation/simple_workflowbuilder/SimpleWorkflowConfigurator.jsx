// client/src/pages/businessautomation/simple_workflowbuilder/SimpleWorkflowConfigurator.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
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

  // --------- RENDER ----------
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {!header ? (
        <Box sx={{ p: 3 }}>
          <Typography variant="body1">Loading…</Typography>
        </Box>
      ) : (
        <>
          {/* Top bar */}
          <Box
            sx={{
              minheight: 80,
               py: 1,                     // extra vertical padding
              px: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: "#0b3b8c",
              color: "grey.100",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, fontSize: 15 }}
            >
              Workflow Studio
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={`Workflow: ${header.workflow_map_name}`}
                size="small"
                sx={{
                  borderRadius: 999,
                  borderColor: "grey.700",
                  bgcolor: "grey.950",
                  color: "grey.300",
                  borderWidth: 1,
                  borderStyle: "solid",
                  fontSize: 11,
                }}
              />
              <Button
                size="small"
                variant={viewMode === "studio" ? "contained" : "outlined"}
                sx={{
                  borderRadius: 999,
                  borderColor: "grey.700",
                  color: "grey.100",
                  textTransform: "none",
                  fontSize: 13,
                  px: 1.75,
                }}
                onClick={() => setViewMode("studio")}
              >
                Studio Mode
              </Button>
              <Button
                size="small"
                variant={viewMode === "map" ? "contained" : "outlined"}
                sx={{
                  borderRadius: 999,
                  borderColor: "grey.700",
                  color: "grey.100",
                  textTransform: "none",
                  fontSize: 13,
                  px: 1.75,
                }}
                onClick={() => setViewMode("map")}
              >
               Workflow Map Mode
              </Button>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  borderRadius: 999,
                  borderColor: "grey.700",
                  color: "grey.100",
                  textTransform: "none",
                  fontSize: 13,
                  px: 1.75,
                }}
                onClick={handleDiscard}
              >
                Discard
              </Button>
              <Button
                size="small"
                variant="contained"
                color={isPublished ? "warning" : "primary"}
                disabled={publishing || !publishReady || publishChecking}
                onClick={handlePublishToggle}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  fontSize: 13,
                  px: 2.25,
                }}
              >
                {isPublished ? "Unpublish workflow" : "Publish workflow"}
              </Button>
              {!publishReady && (
                <Typography variant="caption" sx={{ ml: 1, opacity: 0.9 }}>
                  {publishReasons[0] || "Not ready to publish"}
                </Typography>
              )}
            </Stack>
          </Box>
          {/* Add Step dialog */}
          <Dialog open={addModalOpen} onClose={()=>setAddModalOpen(false)} fullWidth maxWidth="xs">
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
    flex: 1,
    bgcolor: "grey.100",
    py: 2,
    px: 2.5,              // 👈 same unit as spacing below (2.5)
  }}
>
  <Grid
    container
    spacing={1.5}         // 👈 gap between columns = 2.5 * theme.spacing
    sx={{ height: "100%" }}
  >


              {/* LEFT – steps list */}
              <Grid item xs={12} md={2} lg={2}>
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          height: "100%",
          p: 1.25,
          borderRadius: 1,
          borderColor: "grey.300",
        }}
      >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ textTransform: "uppercase", color: "grey.600" }}
                    >
                      Steps
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{
                        textTransform: "none",
                        fontSize: 11,
                        borderRadius: 999,
                        px: 1.5,
                        py: 0.3,
                        boxShadow: 2
                      }}
                      onClick={()=>setAddModalOpen(true)}
                    >
                      + Add step
                    </Button>
                  </Stack>

                  <List dense sx={{ mt: 0.5 }}>
  {steps.map((s) => {
    const terminate = (s.step_name || "").toUpperCase() === "TERMINATE";
    const isSelected = !terminate && s.id === selectedStepId;

    return (
      <React.Fragment key={s.id}>
        <ListItemButton
          disabled={terminate}                     // 🔒 cannot click
          selected={isSelected}                    // never “selected” if terminate
          onClick={() => {
            if (terminate) return;                // safety guard
            setSelectedStepId(s.id);
          }}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            border: "1px solid",
            borderColor: isSelected
              ? "primary.main"
              : "grey.200",
            bgcolor: isSelected
              ? "primary.50"
              : "grey.50",
            opacity: terminate ? 0.6 : 1,         // look slightly faded
            cursor: terminate ? "default" : "pointer",
          }}
        >
          <ListItemAvatar>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                fontSize: 12,
                bgcolor: "grey.300",
                color: "grey.800",
              }}
            >
              {s.step_no}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, fontSize: 13 }}
              >
                {s.step_name}
              </Typography>
            }
            secondary={
              <Typography
                variant="caption"
                sx={{ color: "grey.600" }}
              >
                {terminate
                  ? "Closes the workflow"
                  : s.step_no === 0
                  ? "Start Workflow"
                  : "Intermediate step"}
              </Typography>
            }
          />
        </ListItemButton>
      </React.Fragment>
    );
  })}
</List>

                </Paper>
              </Grid>

              {/* CENTER – inline Step / Form / View Form configurator */}
{viewMode === "map" ? (
  <Grid item xs={12} md={10} lg={10}>
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
        const step = (steps || []).find((s) => Number(s.id) === Number(id));
        if (!step) return;
        setSelectedStepId(step.id);
        setStepDraft({ ...step });
        setEditingStep(step);
      }}
    />
  </Grid>
) : (
<Grid item xs={12} md={8} lg={8}>
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
            <Typography variant="body2">
              Select a step from the left to configure.
            </Typography>
          ) : (
            <>
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
            </>
          )}
        {/* </Paper> */}
      </Grid>
)}


              {/* RIGHT – summary / JSON preview */}
{viewMode !== "map" && (
              <Grid item xs={12} md={2} lg={2}>
      <Stack spacing={2} sx={{ height: "100%" }}>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ p: 1.25, borderRadius: 1, borderColor: "grey.300" }}
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
                        p: 1,
                        borderRadius: 1,
                        bgcolor: "grey.50",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontSize: 13, mb: 0.5 }}
                      >
                        {selectedStep?.step_name || "No step selected"}
                      </Typography>
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
              p: 1.25,
              borderRadius: 1,
              fontSize: 12,
              flex: 1,
              borderColor: "grey.300",
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
          sx={{ p: 1.25, borderRadius: 1, borderColor: "grey.300", flex: 1 }}
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
















// // client/src/pages/businessautomation/simple_workflowbuilder/SimpleWorkflowConfigurator.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { fetchWorkflow, listWorkflowSteps, updateStep } from "./api";
// import StepModal from "./components/SimpleWorkflowStepConfigurationModal";
// import api from "../../../services/api";

// const ATTACH_LABELS = {
//   view_upload: "Can View & Upload",
//   none: "Cannot View & Cannot Upload",
//   view_only: "Can View, Cannot Upload",
//   upload_only: "Cannot View, Can Upload",
// };

// export default function SimpleWorkflowConfigurator({ workflowIdParam }) {
//   const workflowId = workflowIdParam || window.location.pathname.split("/").pop();

//   const [header, setHeader] = useState(null);
//   const [steps, setSteps] = useState([]);
//   const [query, setQuery] = useState("");
//   const [editing, setEditing] = useState(null);
//   const [users, setUsers] = useState([]);

//   useEffect(() => {
//     (async () => {
//       const [h, s] = await Promise.all([fetchWorkflow(workflowId), listWorkflowSteps(workflowId)]);
//       setHeader(h);
//       setSteps(s || []);
//     })().catch(err => console.error(err));
//   }, [workflowId]);

//   useEffect(() => {
//   if (!header) return;
//   let cancelled = false;

//   async function loadUsers() {
//     try {
//       const resp = await api.get("/users", {
//         params: { tenant_id: header.tenant_id }  // only if your API expects this
//       });
//       if (!cancelled) setUsers(Array.isArray(resp.data) ? resp.data : []);
//     } catch (err) {
//       console.error("[workflow-configurator] loadUsers failed", err);
//       if (!cancelled) setUsers([]);
//     }
//   }

//   loadUsers();
//   return () => { cancelled = true; };
// }, [header]);


//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     if (!q) return steps;
//     return steps.filter((s) =>
//       [s.step_name, s.step_action, s.approve_button_name, s.reject_button_name]
//         .filter(Boolean)
//         .some((x) => String(x).toLowerCase().includes(q))
//     );
//   }, [steps, query]);

//   const initiateStep = useMemo(
//     () =>
//       (steps || []).find(
//         (s) => (s.step_name || "").toUpperCase() === "INITIATE"
//       ) || null,
//     [steps]
//   );

//   async function handleSaveStep(stepId, patch) {
//     await updateStep(stepId, patch);
//     const s = await listWorkflowSteps(workflowId);
//     setSteps(s || []);
//     setEditing(null);
//   }

//   if (!header) return <div className="p-4">Loading…</div>;

//   return (
//     <div className="p-4 space-y-4">
//       {/* header card */}
//       <div className="border rounded p-3 bg-gray-50 text-sm grid md:grid-cols-3 gap-2">
//         <div><b>Workflow Name:</b> {header.workflow_map_name}</div>
//         <div><b>Table Name:</b> {header.workflow_table_name}</div>
//         <div><b>No of Steps:</b> {header.no_of_steps}</div>
//         <div><b>Created by:</b> {header.created_by_name || header.created_by}</div>
//         <div><b>Date Created:</b> {new Date(header.date_created).toLocaleString()}</div>
//         <div><b>Date Modified:</b> {new Date(header.date_modified).toLocaleString()}</div>
//       </div>

//       <div className="flex items-center gap-2">
//         <input className="border rounded p-2 w-64" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
//       </div>

//       <div className="overflow-x-auto">
//         <table className="min-w-full border text-sm">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="p-2 border">Step Name</th>
//               <th className="p-2 border">Step No</th>
//               <th className="p-2 border">Step Action</th>
//               <th className="p-2 border">Performer</th>
//               <th className="p-2 border">Attachments</th>
//               <th className="p-2 border">Review Allowed</th>
//               <th className="p-2 border">Next (Reject)</th>
//               <th className="p-2 border">Mail Notifications</th>
//               <th className="p-2 border">Due (days)</th>
//               <th className="p-2 border">Configure</th>
//               <th className="p-2 border">Add Step</th>
//               <th className="p-2 border">Remove Step</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filtered.map((s) => {
//               const nm = String(s.step_name || "").toUpperCase();
//               const isInitiate = nm === "INITIATE";
//               const isTerminate = nm === "TERMINATE";
//               return (
//                 <tr key={s.id} className="odd:bg-white even:bg-gray-50">
//                   <td className="p-2 border">{s.step_name}</td>
//                   <td className="p-2 border text-center">{s.step_no}</td>
//                   <td className="p-2 border">
//                     {s.step_action ? s.step_action :
//                       (String(s.approve_button_name || "").toLowerCase() === "send" ? "send" : "approve")}
//                   </td>
//                   <td className="p-2 border">{s.step_performer ?? "-"}</td>
//                   <td className="p-2 border">{ATTACH_LABELS[s.attachments_allowed] || 'Cannot View & Cannot Upload'}</td>
//                   <td className="p-2 border">{s.review_allowed ? "Yes" : "No"}</td>
//                   <td className="p-2 border">{s.next_step_after_reject ?? "-"}</td>
//                   <td className="p-2 border">
//                     {Array.isArray(s.mail_notification_users) ? s.mail_notification_users.join(", ") : "-"}
//                   </td>
//                   <td className="p-2 border text-center">{s.step_due_in_days ?? 1}</td>
//                   <td className="p-2 border text-center">
//                     <button
//                       className="px-3 py-1 bg-gray-800 text-white rounded disabled:opacity-50"
//                       onClick={() => setEditing(s)}
//                       disabled={isTerminate}
//                     >
//                       Configure Step
//                     </button>
//                   </td>
//                   <td className="p-2 border text-center">
//                     <button className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50" disabled={isTerminate}>
//                       Add Step
//                     </button>
//                   </td>
//                   <td className="p-2 border text-center">
//                     <button className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50" disabled={isInitiate || isTerminate}>
//                       Remove Step
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>

//       {/* ONLY the modal, rendered via portal */}
//       {editing && (
//   <StepModal
//     header={{
//       ...header,
//       // value = STEP ID (number), label = "N. Name"
//       stepsLessThanCurrent: (Array.isArray(steps) ? steps : [])
//         .filter((x) => Number(x.step_no) < Number(editing.step_no))
//         .map((x) => ({ 
//           value: Number(x.id), 
//           label: `${x.step_no}. ${x.step_name}` 
//         })),
//          initiateFormFields:
//               initiateStep?.step_form_configuration?.fields || [],
//     }}
//     step={editing}
//     users={users}
//     onClose={() => setEditing(null)}
//     onSave={(payload) => handleSaveStep(editing.id, payload)}
//   />
// )}

//     </div>
//   );
// }
  
