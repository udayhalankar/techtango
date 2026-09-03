import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Backdrop,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DownloadIcon from "@mui/icons-material/Download";
import ReusableFormModal from "../../components/ReusableFormModal";
import ModuleTileGrid from "../../components/ModuleTileGrid";
import api from "../../services/api";
import { DynamicStepForm } from "../businessautomation/components/BAAssignments";
import { materializeLayout } from "../businessautomation/simple_workflowbuilder/components/simpleWorkflowFormLayouts";

const cardSx = {
  height: "100%",
  borderRadius: 2,
  border: "1px solid #2f5fff",
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 10px rgba(16, 24, 40, 0.16)",
  minHeight: 160,
  transition: "transform .12s ease, box-shadow .12s ease, border-color .12s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 10px 18px rgba(16, 24, 40, 0.22)",
    borderColor: "#1a4fd8",
  },
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeAuditTrail(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return parsed ? [parsed] : [];
    } catch {
      return [];
    }
  }
  if (typeof raw === "object") return [raw];
  return [];
}

function canUploadAttachments(raw) {
  const mode = String(raw ?? "").trim().toLowerCase();
  if (!mode) return false;
  if (["true", "1", "yes", "y", "view_upload", "upload_only"].includes(mode)) return true;
  if (["false", "0", "no", "n", "view", "view_only"].includes(mode)) return false;
  return mode.includes("upload");
}

function mapStatusBadge(status) {
  const normalized = String(status || "New").toLowerCase();

  if (normalized === "closed" || normalized === "approved" || normalized === "completed") {
    return { text: status || "Completed", color: "#ffffff", backgroundColor: "#41ad49" };
  }

  if (normalized === "rejected") {
    return { text: status || "Rejected", color: "#ffffff", backgroundColor: "#ef4444" };
  }

  return { text: status || "New", color: "#ffffff", backgroundColor: "#f59e0b" };
}

function getAttachmentUrl(file) {
  return file?.download_url || file?.file_url || file?.url || file?.public_url || file?.path || null;
}

function WorkflowPickerDialog({ open, onClose, onPick }) {
  const [loading, setLoading] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;

    const loadWorkflows = async () => {
      setLoading(true);
      try {
        const response = await api.get("/simple_workflowbuilder", { params: { published: true } });
        setWorkflows(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("[workflow picker] load failed", error);
        setWorkflows([]);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflows();
  }, [open]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return workflows;
    return workflows.filter((workflow) =>
      String(workflow.workflow_map_name || workflow.workflow_name || "").toLowerCase().includes(normalized)
    );
  }, [query, workflows]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3, maxHeight: "80vh" } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Select a Workflow
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box mb={2}>
          <TextField
            fullWidth
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workflows"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Grid container spacing={2}>
          {loading ? (
            <Grid item xs={12}>
              <Typography variant="body2">Loading workflows...</Typography>
            </Grid>
          ) : filtered.length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="body2">No workflows found.</Typography>
            </Grid>
          ) : (
            filtered.map((workflow) => (
              <Grid key={workflow.id} item xs={6} sm={4}>
                <Card sx={{ ...cardSx, borderRadius: 2, aspectRatio: "1 / 1", display: "flex" }}>
                  <CardActionArea onClick={() => onPick?.(workflow)} sx={{ display: "flex", alignItems: "stretch" }}>
                    <Box
                      sx={{
                        p: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        textAlign: "center",
                      }}
                    >
                      <AccountTreeIcon sx={{ fontSize: 32, mb: 1, opacity: 0.75 }} />
                      <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.25, wordBreak: "break-word" }}>
                        {workflow.workflow_map_name || workflow.workflow_name || `Workflow #${workflow.id}`}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}

function InitiateFormDialog({ open, onClose, workflow, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [header, setHeader] = useState(null);
  const [stepCfg, setStepCfg] = useState(null);
  const [viewLayout, setViewLayout] = useState(null);
  const [canvasLayout, setCanvasLayout] = useState(null);

  useEffect(() => {
    if (!open || !workflow?.id) return;

    const loadInitiator = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/simple_workflowbuilder/steps/init/${workflow.id}`);
        setStepCfg(response.data?.step || null);
        setHeader(response.data?.header || null);

        const workflowId = response.data?.header?.id || workflow.id;
        const stepNo = Number(response.data?.step?.step_no);

        if (workflowId != null && Number.isFinite(stepNo)) {
          try {
            const { data } = await api.get("/simple_workflowbuilder_formviews", {
              params: { workflow_map_id: workflowId, step_no: stepNo },
            });
            const list = Array.isArray(data?.views) ? data.views : Array.isArray(data) ? data : [];
            const chosen =
              list.find((view) => view.is_default) ||
              list.sort((a, b) => new Date(b.date_modified || b.date_created || 0) - new Date(a.date_modified || a.date_created || 0))[0];
            const layout = chosen?.layout_def || null;
            setViewLayout(layout);
            setCanvasLayout(layout?.kind === "canvas_v1" ? layout : null);
          } catch {
            setViewLayout(null);
            setCanvasLayout(null);
          }
        } else {
          setViewLayout(null);
          setCanvasLayout(null);
        }
      } catch (error) {
        console.error("[workflow initiate] load failed", error);
        setHeader(null);
        setStepCfg(null);
        setViewLayout(null);
        setCanvasLayout(null);
      } finally {
        setLoading(false);
      }
    };

    loadInitiator();
  }, [open, workflow?.id]);

  const rawCfg = stepCfg?.step_form_configuration;
  const baseSchema = typeof rawCfg === "string" ? safeParseJSON(rawCfg) : rawCfg;

  const schema = useMemo(() => {
    const fields = Array.isArray(baseSchema?.fields) ? baseSchema.fields : [];
    if (!fields.length || !viewLayout) return baseSchema;
    try {
      const mats = materializeLayout(viewLayout, fields);
      if (!Array.isArray(mats)) return baseSchema;
      const byCol = new Map(fields.map((field) => [String(field.column || "").trim(), field]));
      const ordered = [];
      mats.forEach((section) =>
        (section.columns || []).forEach((column) =>
          (column.fields || []).forEach((field) => {
            const key = String(field.field || "").trim();
            const meta = byCol.get(key);
            if (meta && meta.visible) {
              ordered.push(meta);
              byCol.delete(key);
            }
          })
        )
      );
      byCol.forEach((meta) => {
        if (meta?.visible) ordered.push(meta);
      });
      return { ...(baseSchema || {}), fields: ordered };
    } catch {
      return baseSchema;
    }
  }, [baseSchema, viewLayout]);

  const oneColumnFromLayout = useMemo(() => {
    const layout = viewLayout;
    if (!layout || !Array.isArray(layout.sections)) return false;
    let maxCols = 0;
    for (const section of layout.sections) {
      const cols = Array.isArray(section.columns) ? section.columns : [];
      const used = cols.filter((column) => Array.isArray(column.fields) && column.fields.length > 0).length;
      if (used > maxCols) maxCols = used;
    }
    return maxCols <= 1;
  }, [viewLayout]);

  const initLayoutSections = useMemo(() => {
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    return viewLayout ? materializeLayout(viewLayout, fields) : null;
  }, [viewLayout, schema]);

  const attachmentsAllowedFlag = !!stepCfg?.attachment_access?.can_upload;
  const sendLabel = stepCfg?.approve_button_name || "Send";

  async function saveRowToTable(tableName, values) {
    const encoded = encodeURIComponent(tableName);
    const { data } = await api.post(`/table/rows/${encoded}`, values);
    if (data) return data;
    throw new Error(`No response data from /table/rows/${tableName}`);
  }

  async function createInstance({ step_performer, audit_trail, step_comments, form_values }) {
    const payload = {
      workflow_id: workflow.id,
      step_name: "INITIATE",
      wf_status: "Open",
      step_performer: step_performer ?? null,
      audit_trail: audit_trail ?? [],
      step_comments: step_comments ?? null,
      form_values: form_values ?? {},
    };

    const { data } = await api.post("/simple_workflow_instances", payload);
    return data;
  }

  return (
    <>
      <ReusableFormModal
        open={open}
        onClose={() => onClose?.(false)}
        maxWidth={720}
        icon="🤝"
        title={`Start: ${workflow?.workflow_map_name || workflow?.workflow_name || `Workflow #${workflow?.id || ""}`}`}
        subtitle="Complete the workflow initiation form below and attach supporting files if required."
      >
        {loading ? (
          <Typography variant="body2">Loading form...</Typography>
        ) : !stepCfg || !schema ? (
          <Typography variant="body2" color="error">
            Could not load initiate step configuration.
          </Typography>
        ) : (
          <DynamicStepForm
            schema={schema}
            attachmentsAllowed={attachmentsAllowedFlag}
            oneColumn={oneColumnFromLayout}
            canvasModel={canvasLayout}
            layoutSections={initLayoutSections}
            containerStyle={viewLayout?.container_style}
            presentation="reusableModal"
            primaryActionLabel={sendLabel}
            showPrimaryButton
            onSubmit={async ({ values: formValues, stagedFiles }) => {
              setSaving(true);
              try {
                const tableName = header?.workflow_table_name || workflow?.workflow_table_name;
                if (!tableName) throw new Error("Missing workflow_table_name in header");

                const normalized = {};
                Object.entries(formValues || {}).forEach(([column, value]) => {
                  let nextValue = value;
                  if (Array.isArray(nextValue)) nextValue = nextValue.length ? nextValue.join(",") : null;
                  if (nextValue === "") nextValue = null;
                  normalized[column] = nextValue;
                });

                const savedRow = await saveRowToTable(tableName, normalized);
                if (!savedRow?.id) throw new Error("Row insert did not return an id");

                const stepCommentsField = Array.isArray(schema?.fields)
                  ? schema.fields.find((field) => String(field.column || "").toLowerCase() === "step_comments")
                  : null;
                const stepCommentsCol = stepCommentsField ? String(stepCommentsField.column || "").trim() : null;
                const stepCommentsVal = stepCommentsCol ? formValues[stepCommentsCol] ?? null : null;

                const instance = await createInstance({
                  step_performer: stepCfg?.step_performer ?? null,
                  audit_trail: [
                    { at: new Date().toISOString(), event: "created", by: "ui" },
                    { at: new Date().toISOString(), event: "saved_row", table: tableName, row_id: savedRow.id },
                    { at: new Date().toISOString(), event: "form_values", values: formValues },
                  ],
                  form_values: formValues,
                  step_comments: stepCommentsVal,
                });

                const instanceId = instance?.id;
                if (!instanceId) throw new Error("Instance id missing from /simple_workflow_instances response");

                await api.put(`/tables/data/${tableName}/${savedRow.id}`, {
                  changes: { workflow_id: String(instanceId) },
                });

                if (Array.isArray(stagedFiles) && stagedFiles.length) {
                  for (const file of stagedFiles) {
                    const form = new FormData();
                    form.append("file", file);
                    form.append("ref_table", "simple_workflow_instances");
                    form.append("ref_table_id", String(instanceId));
                    form.append("workflow_id", String(instanceId));
                    form.append("instance_id", String(instanceId));
                    await api.post("/upload", form, {
                      headers: { "Content-Type": "multipart/form-data" },
                    });
                  }
                }

                onCreated?.();
                onClose?.(true);
              } catch (error) {
                console.error("[workflow initiate] submit failed", error);
                alert(error?.response?.data?.error || error.message || "Submit failed");
              } finally {
                setSaving(false);
              }
            }}
          />
        )}
      </ReusableFormModal>

      <Backdrop open={saving} sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: "#fff" }}>
        <Box textAlign="center">
          <CircularProgress color="inherit" />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Submitting, please wait...
          </Typography>
        </Box>
      </Backdrop>
    </>
  );
}

function InstanceExecuteDialog({ open, instance, onClose, isOutbox, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [reviewUserId, setReviewUserId] = useState("");
  const [stepCfg, setStepCfg] = useState(null);
  const [schema, setSchema] = useState(null);
  const [instanceDetail, setInstanceDetail] = useState(null);
  const [routeinfo, setRouteinfo] = useState([]);
  const [initialValues, setInitialValues] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [businessRowId, setBusinessRowId] = useState(null);
  const [viewLayout, setViewLayout] = useState(null);
  const [canvasLayout, setCanvasLayout] = useState(null);

  const formRef = useRef(null);
  const actionRef = useRef("approve");

  useEffect(() => {
    if (!open || !instance?.id) return;

    const loadInstance = async () => {
      setLoading(true);
      try {
        const { data: inst } = await api.get(`/simple_workflow_instances/${instance.id}`);
        setInstanceDetail(inst);

        const route = Array.isArray(inst.routeinfo) ? inst.routeinfo : [];
        setRouteinfo(route);

        const stepNo = Number(inst.step_no);
        const currentCfg = route.find((step) => Number(step.step_no) === stepNo) || route[0] || null;
        setStepCfg(currentCfg || null);

        try {
          const workflowId = inst.workflow_id || inst.workflow_map_id || instance?.workflow_id;
          const sid = Number(currentCfg?.step_no);
          if (workflowId != null && Number.isFinite(sid)) {
            const { data } = await api.get("/simple_workflowbuilder_formviews", {
              params: { workflow_map_id: workflowId, step_no: sid },
            });
            const list = Array.isArray(data?.views) ? data.views : Array.isArray(data) ? data : [];
            const chosen =
              list.find((view) => view.is_default) ||
              list.sort((a, b) => new Date(b.date_modified || b.date_created || 0) - new Date(a.date_modified || a.date_created || 0))[0];
            setViewLayout(chosen?.layout_def || null);
            setCanvasLayout(chosen?.layout_def?.kind === "canvas_v1" ? chosen.layout_def : null);
          } else {
            setViewLayout(null);
            setCanvasLayout(null);
          }
        } catch {
          setViewLayout(null);
          setCanvasLayout(null);
        }

        const initStep = route.find((step) => String(step.step_name || "").toUpperCase() === "INITIATE");
        const initSchema =
          typeof initStep?.step_form_configuration === "string"
            ? safeParseJSON(initStep?.step_form_configuration)
            : initStep?.step_form_configuration;
        const currentSchema =
          typeof currentCfg?.step_form_configuration === "string"
            ? safeParseJSON(currentCfg?.step_form_configuration)
            : currentCfg?.step_form_configuration;

        const initFields = Array.isArray(initSchema?.fields) ? initSchema.fields : [];
        const currentFields = Array.isArray(currentSchema?.fields) ? currentSchema.fields : [];
        let finalSchema = currentSchema || initSchema || { fields: [] };
        const isInitiate = String(currentCfg?.step_name || "").toUpperCase() === "INITIATE";
        const isTerminate = String(currentCfg?.step_name || "").toUpperCase() === "TERMINATE";

        if (!isInitiate && initSchema && currentSchema) {
          const baseByCol = new Map(initFields.map((field) => [String(field.column || field.name || "").toLowerCase(), field]));
          const mergedFields = currentFields.map((field) => {
            const colKey = String(field.column || field.name || "").toLowerCase();
            const base = baseByCol.get(colKey);
            if (!base) return field;
            return {
              ...base,
              ...field,
              input_type: base.input_type ?? field.input_type,
              data_type: base.data_type ?? field.data_type,
            };
          });

          finalSchema = {
            ...initSchema,
            ...currentSchema,
            fields: mergedFields,
          };
        }

        if (isTerminate && initFields.length) {
          finalSchema = {
            ...initSchema,
            ...finalSchema,
            fields: initFields.map((field) => ({ ...field, visible: true })),
          };
        }

        setSchema(finalSchema || { fields: [] });

        const tableName = inst.workflow_table_name || null;
        if (tableName) {
          try {
            const { data: row } = await api.get(`/tables/dataByWorkflow/${tableName}/${inst.id}`);
            const base = row || {};
            setInitialValues({
              ...base,
              audit_trail: inst.audit_trail ?? base.audit_trail ?? null,
              step_comments: "",
            });
            setBusinessRowId(base?.id ?? null);
          } catch (error) {
            console.error("[workflow execute] load business row failed", error);
            setInitialValues({
              audit_trail: inst.audit_trail ?? null,
              step_comments: "",
            });
            setBusinessRowId(null);
          }
        } else {
          setInitialValues({
            audit_trail: inst.audit_trail ?? null,
            step_comments: inst.step_comments ?? "",
          });
          setBusinessRowId(null);
        }

        try {
          const { data: files } = await api.get(`/approval_files/by-instance/${inst.id}`, {
            params: {
              ref_table: "simple_workflow_instances",
              ref_table_id: inst.id,
            },
          });
          setAttachments(Array.isArray(files) ? files : []);
        } catch (error) {
          console.error("[workflow execute] load attachments failed", error);
          setAttachments([]);
        }

        if (currentCfg?.review_allowed) {
          try {
            const { data } = await api.get("/users");
            setUsers(Array.isArray(data) ? data : []);
          } catch (error) {
            console.error("[workflow execute] load users failed", error);
            setUsers([]);
          }
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error("[workflow execute] detail load failed", error);
        setStepCfg(null);
        setSchema(null);
      } finally {
        setLoading(false);
      }
    };

    loadInstance();
  }, [open, instance?.id]);

  const viewLayoutSections = useMemo(() => {
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    return viewLayout ? materializeLayout(viewLayout, fields) : null;
  }, [viewLayout, schema]);

  const oneColumnFromLayout = useMemo(() => {
    const layout = viewLayout;
    if (!layout || !Array.isArray(layout.sections)) return false;
    let maxCols = 0;
    for (const section of layout.sections) {
      const cols = Array.isArray(section.columns) ? section.columns : [];
      const used = cols.filter((column) => Array.isArray(column.fields) && column.fields.length > 0).length;
      if (used > maxCols) maxCols = used;
    }
    return maxCols <= 1;
  }, [viewLayout]);

  const routeinfoArr = Array.isArray(routeinfo) ? routeinfo : [];
  const currentCfg = stepCfg;
  const currentStepNo = Number(instanceDetail?.step_no) || 0;
  const nextApproveStepId =
    currentCfg && currentCfg.next_step_after_approve !== undefined && currentCfg.next_step_after_approve !== null && currentCfg.next_step_after_approve !== ""
      ? Number(currentCfg.next_step_after_approve)
      : null;
  const nextRejectStepId =
    currentCfg && currentCfg.next_step_after_reject !== undefined && currentCfg.next_step_after_reject !== null && currentCfg.next_step_after_reject !== ""
      ? Number(currentCfg.next_step_after_reject)
      : null;
  const nextApproveCfg = nextApproveStepId ? routeinfoArr.find((step) => Number(step.step_no) === nextApproveStepId) : null;
  const nextRejectCfg = nextRejectStepId ? routeinfoArr.find((step) => Number(step.step_no) === nextRejectStepId) : null;
  const isReviewMode = String(instanceDetail?.wf_status || "").toLowerCase().endsWith("_review");
  const isTerminateStep = String(stepCfg?.step_name || "").toUpperCase() === "TERMINATE";
  const showReview = !!stepCfg?.ui_actions?.show_review && !isReviewMode;
  const showReject = !!stepCfg?.ui_actions?.show_reject;
  const canViewAttachments = !!stepCfg?.attachment_access?.can_view;
  const canUploadAttachmentsFlag = !!stepCfg?.attachment_access?.can_upload;
  const auditTrailEntries = normalizeAuditTrail(instanceDetail?.audit_trail);

  const formatUserLabel = (id) => {
    if (id == null) return "-";
    const numeric = Number(id);
    const user = Array.isArray(users) ? users.find((row) => Number(row.id) === numeric) : null;
    return (
      user?.full_name ||
      user?.name ||
      `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
      user?.username ||
      user?.email ||
      `User ${numeric}`
    );
  };

  const renderPerformerLabel = (cfg) => {
    const performerId = Number(cfg?.step_performer);
    if (!Number.isFinite(performerId) || performerId <= 0) return "Not configured";
    return formatUserLabel(performerId);
  };

  async function handleSubmit(action, { values, stagedFiles }) {
    if (!instanceDetail) return;

    const inst = instanceDetail;
    const tableName = inst.workflow_table_name;
    const rowId = businessRowId;

    if (tableName && rowId != null) {
      const changes = {};
      for (const [column, value] of Object.entries(values || {})) {
        if (String(column || "").toLowerCase() === "audit_trail") continue;
        let nextValue = value;
        if (Array.isArray(nextValue)) nextValue = nextValue.length ? nextValue.join(",") : null;
        if (nextValue === "") nextValue = null;
        changes[column] = nextValue;
      }

      await api.put(`/tables/data/${tableName}/${rowId}`, { changes });
    }

    const schemaFields = Array.isArray(schema?.fields) ? schema.fields : [];
    const stepCommentsField = schemaFields.find((field) => String(field.column || "").toLowerCase() === "step_comments");
    const stepCommentsCol = stepCommentsField ? String(stepCommentsField.column || "").trim() : null;
    const stepCommentsVal = stepCommentsCol ? values[stepCommentsCol] : null;

    const route = Array.isArray(routeinfo) ? routeinfo : [];
    const currentRow = route.find((step) => Number(step.step_no) === currentStepNo) || null;
    let newStepNo = currentStepNo;

    if (action === "approve") {
      newStepNo = Number(currentRow?.next_step_after_approve);
    } else if (action === "reject") {
      newStepNo = Number(currentRow?.next_step_after_reject);
    }

    const newStepCfg = route.find((step) => Number(step.step_no) === newStepNo) || currentRow;
    const loginUserId = window?.currentUser?.id || window?.authUser?.id || null;
    const currentStepName = inst.step_name || stepCfg?.step_name || "STEP";
    const baseStepName = String(currentStepName || "").replace(/\s+review$/i, "").trim() || currentStepName;
    const instChanges = {
      action,
      step_no: Number.isFinite(newStepNo) ? newStepNo : currentStepNo,
      step_name: newStepCfg?.step_name || currentStepName,
      step_performer: newStepCfg?.step_performer ?? inst.step_performer ?? null,
      next_step_after_approve: newStepCfg?.next_step_after_approve ?? null,
      next_step_after_reject: newStepCfg?.next_step_after_reject ?? null,
    };

    if (stepCommentsCol) {
      instChanges.step_comments = stepCommentsVal === undefined ? null : stepCommentsVal;
    }
    if (loginUserId != null) {
      instChanges.assigned_by = loginUserId;
    }

    if (action === "review") {
      instChanges.step_performer = reviewUserId ? Number(reviewUserId) : null;
      instChanges.review_requestor = loginUserId ?? null;
      instChanges.step_name = `${baseStepName} Review`;
      instChanges.wf_status = `${baseStepName}_Review`;
    } else if (action === "return") {
      const requestor = inst.review_requestor ?? null;
      if (requestor == null) {
        alert("Review requestor is missing for return action.");
        return;
      }
      instChanges.step_performer = requestor;
      instChanges.review_requestor = requestor;
      instChanges.step_name = baseStepName;
      instChanges.wf_status = `${baseStepName}_Reviewed`;
    } else if (action === "approve") {
      instChanges.wf_status = instChanges.wf_status || `${baseStepName}_completed`;
      instChanges.review_requestor = inst.review_requestor ?? null;
      if (inst.review_requestor != null) {
        instChanges.step_performer = inst.review_requestor;
        if (!newStepCfg?.step_name) instChanges.step_name = baseStepName;
      }
    } else if (action === "reject") {
      instChanges.wf_status = instChanges.wf_status || `${baseStepName}_rejected`;
      instChanges.review_requestor = null;
    }

    const existingAudit = normalizeAuditTrail(inst.audit_trail);
    const auditData = { ...(values || {}) };
    Object.keys(auditData).forEach((key) => {
      if (String(key).toLowerCase() === "audit_trail") delete auditData[key];
    });
    const effectiveStatus = instChanges.wf_status || inst.wf_status || null;
    if (effectiveStatus != null) {
      auditData.wf_status = effectiveStatus;
    }

    instChanges.audit_trail = [
      ...existingAudit,
      {
        at: new Date().toISOString(),
        by: inst.step_performer ?? inst.initiator ?? null,
        action,
        from_step_no: currentStepNo,
        to_step_no: instChanges.step_no,
        step_name: instChanges.step_name,
        wf_status: effectiveStatus,
        step_comments: stepCommentsVal ?? null,
        data: auditData,
      },
    ];

    await api.patch(`/simple_workflow_instances/${inst.id}`, instChanges);

    if (Array.isArray(stagedFiles) && stagedFiles.length) {
      for (const file of stagedFiles) {
        const form = new FormData();
        form.append("file", file);
        form.append("ref_table", "simple_workflow_instances");
        form.append("ref_table_id", String(inst.id));
        form.append("workflow_id", String(inst.id));
        form.append("instance_id", String(inst.id));
        await api.post("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    }

    onChanged?.();
    onClose?.(true);
  }

  const displaySchema = useMemo(() => {
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    if (!fields.length) return schema;
    if (isTerminateStep) {
      return { ...(schema || {}), fields: fields.map((field) => ({ ...field, visible: true })) };
    }
    if (!viewLayout) return schema;
    try {
      const mats = materializeLayout(viewLayout, fields);
      if (!Array.isArray(mats)) return schema;
      const byCol = new Map(fields.map((field) => [String(field.column || "").trim(), field]));
      const ordered = [];
      mats.forEach((section) =>
        (section.columns || []).forEach((column) =>
          (column.fields || []).forEach((field) => {
            const key = String(field.field || "").trim();
            const meta = byCol.get(key);
            if (meta && meta.visible) {
              ordered.push(meta);
              byCol.delete(key);
            }
          })
        )
      );
      byCol.forEach((meta) => {
        if (meta?.visible) ordered.push(meta);
      });
      return { ...(schema || {}), fields: ordered };
    } catch {
      return schema;
    }
  }, [schema, viewLayout, isTerminateStep]);

  const forceReadOnlyColumns = useMemo(() => {
    const baseReadOnly = ["performer", "step_performer", "wf_status", "review_requestor"];
    if (!isReviewMode || !schema?.fields) return baseReadOnly;
    const allCols = schema.fields
      .map((field) => String(field.column || field.name || "").toLowerCase())
      .filter(Boolean);
    const additional = allCols.filter((column) => column !== "step_comments" && column !== "audit_trail");
    return Array.from(new Set([...baseReadOnly, ...additional]));
  }, [isReviewMode, schema]);

  return (
    <Dialog open={open} onClose={() => onClose?.(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { width: "75%", maxWidth: 750, height: "100vh" } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "#eef6ff", py: 0.75, fontSize: 16 }}>
        <Box>
          {instance ? `Instance #${instance.id} - ${instance.workflow_map_name || instance.workflow_name || ""}` : "Instance"}
        </Box>
        <IconButton onClick={() => onClose?.(false)} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ height: "calc(90vh - 112px)" }}>
        {loading || !stepCfg || !displaySchema ? (
          <Typography variant="body2">
            {loading ? "Loading..." : "Step configuration not found for this instance."}
          </Typography>
        ) : (
          <DynamicStepForm
            ref={formRef}
            schema={displaySchema}
            initial={initialValues}
            canvasModel={canvasLayout}
            layoutSections={viewLayoutSections}
            containerStyle={isTerminateStep ? { ...(viewLayout?.container_style || {}), border: false } : viewLayout?.container_style}
            attachmentsAllowed={!isTerminateStep && canUploadAttachmentsFlag && !isOutbox}
            oneColumn={oneColumnFromLayout}
            showPrimaryButton={false}
            forceReadOnlyColumns={forceReadOnlyColumns}
            extraRequiredColumns={isReviewMode ? ["step_comments"] : []}
            getCurrentAction={() => actionRef.current}
            onSubmit={async (payload) => {
              if (saving) return;
              setSaving(true);
              try {
                await handleSubmit(actionRef.current || "approve", payload);
              } finally {
                setSaving(false);
              }
            }}
          >
            {showReview && !isReviewMode ? (
              <Box sx={{ mt: 1, maxWidth: 320 }}>
                <TextField
                  size="small"
                  fullWidth
                  select
                  label="Send for review to"
                  value={reviewUserId}
                  onChange={(event) => setReviewUserId(event.target.value)}
                >
                  <MenuItem value="">Select user</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.full_name || user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || user.email || `User ${user.id}`}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            ) : null}

            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                On Approve: <Box component="span" sx={{ fontWeight: 600 }}>{nextApproveCfg ? renderPerformerLabel(nextApproveCfg) : "Not configured"}</Box>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                On Reject: <Box component="span" sx={{ fontWeight: 600 }}>{nextRejectCfg ? renderPerformerLabel(nextRejectCfg) : "Not configured"}</Box>
              </Typography>
            </Box>

            {(isTerminateStep || canViewAttachments) && attachments.length > 0 ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Existing Attachments
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {attachments.map((file) => {
                    const url = getAttachmentUrl(file);
                    const name = file?.original_filename || file?.filename || "Unnamed file";
                    return (
                      <Box
                        key={file.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          p: 0.75,
                          border: "1px solid rgba(0,0,0,0.08)",
                          borderRadius: 1,
                          bgcolor: "#fff",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            flex: 1,
                            cursor: url ? "pointer" : "default",
                            textDecoration: url ? "underline" : "none",
                            color: url ? "primary.main" : "text.secondary",
                          }}
                          onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
                        >
                          • {name}
                        </Typography>
                        <Tooltip title="Open">
                          <span>
                            <IconButton size="small" disabled={!url} onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Download">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!url}
                              onClick={() => {
                                if (!url) return;
                                const anchor = document.createElement("a");
                                anchor.href = url;
                                anchor.download = name;
                                document.body.appendChild(anchor);
                                anchor.click();
                                anchor.remove();
                              }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ) : null}
          </DynamicStepForm>
        )}
      </DialogContent>

      <Box
        sx={{
          minHeight: 48,
          bgcolor: "#f3f4f6",
          borderTop: "1px solid #e5e7eb",
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {!isOutbox ? (
            isReviewMode ? (
              <Button
                variant="contained"
                size="small"
                disabled={saving}
                onClick={() => {
                  actionRef.current = "return";
                  formRef.current?.submit();
                }}
                sx={{ ml: 1, minWidth: 110, height: 32 }}
              >
                Return
              </Button>
            ) : (
              <>
                {showReview ? (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={saving}
                    onClick={() => {
                      if (!reviewUserId) {
                        alert("Please select a user for review.");
                        return;
                      }
                      actionRef.current = "review";
                      formRef.current?.submit();
                    }}
                    sx={{ ml: 1, minWidth: 110, height: 32 }}
                  >
                    Review
                  </Button>
                ) : null}

                <Button
                  variant="contained"
                  size="small"
                  disabled={saving}
                  onClick={() => {
                    actionRef.current = "approve";
                    formRef.current?.submit();
                  }}
                  sx={{ ml: 1, minWidth: 110, height: 32 }}
                >
                  {stepCfg?.ui_actions?.primary_label || "Approve"}
                </Button>

                {showReject ? (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    disabled={saving}
                    onClick={() => {
                      actionRef.current = "reject";
                      formRef.current?.submit();
                    }}
                    sx={{ ml: 1, minWidth: 110, height: 32 }}
                  >
                    {stepCfg?.ui_actions?.reject_label || "Reject"}
                  </Button>
                ) : null}
              </>
            )
          ) : null}
        </Box>
      </Box>

      <Backdrop open={saving} sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: "#fff" }}>
        <Box textAlign="center">
          <CircularProgress color="inherit" />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Submitting, please wait...
          </Typography>
        </Box>
      </Backdrop>
    </Dialog>
  );
}

export default function WorkflowAssign() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedWorkflow, setPickedWorkflow] = useState(null);
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [activeInstance, setActiveInstance] = useState(null);
  const [instanceOpen, setInstanceOpen] = useState(false);

  const refreshRows = async (box = activeTab) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/simple_workflow_instances", {
        params: { box },
      });
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setRows([]);
      setError(err.response?.data?.message || `Failed to load ${box}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshRows(activeTab);
  }, [activeTab]);

  const tiles = useMemo(
    () =>
      rows.map((item) => {
        const workflowStatus = item.wf_status || item.instance_status || "New";
        return {
          id: item.id || item.workflow_map_name || item.workflow_name,
          workflowNo: item.id || "-",
          label: item.workflow_map_name || item.workflow_name || "Workflow",
          stepName: item.step_name || "-",
          startedDate: formatDate(item.date_created),
          assignedDate: formatDate(item.step_assigned_date),
          dueDate: formatDate(item.step_due_date),
          assignedBy: item.assigned_by_name || item.assigned_by || "-",
          status: workflowStatus,
          onClick: () => {
            setActiveInstance(item);
            setInstanceOpen(true);
          },
        };
      }),
    [rows]
  );

  function onPickWorkflow(workflow) {
    setPickedWorkflow(workflow);
    setPickerOpen(false);
    setInitiateOpen(true);
  }

  return (
    <>
      <ModuleTileGrid
        title="Workflow Assignments"
        subtitle="Review workflow inbox and outbox items in the shared module grid layout."
        titleBarColor="#1f355d"
        tiles={tiles}
        renderTile={(tile) => (
          <Card key={tile.id} sx={cardSx}>
            <CardActionArea
              onClick={tile.onClick}
              sx={{
                height: "100%",
                p: 1.5,
                display: "flex",
                alignItems: "stretch",
                textAlign: "left",
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                    <AccountTreeIcon sx={{ color: "#6b46c1", fontSize: 20, flex: "0 0 auto" }} />
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: "#1a4fd8",
                        display: "-webkit-box",
                        overflow: "hidden",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 1,
                      }}
                    >
                      {tile.label}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#51607d", flex: "0 0 auto", pt: 0.15 }}>
                    #{tile.workflowNo}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.35, minHeight: 0 }}>
                  <Typography sx={{ fontSize: 11, color: "#334155", lineHeight: 1.2 }}>Step: {tile.stepName}</Typography>
                  <Typography sx={{ fontSize: 11, color: "#334155", lineHeight: 1.2 }}>Date Started: {tile.startedDate}</Typography>
                  <Typography sx={{ fontSize: 11, color: "#334155", lineHeight: 1.2 }}>Date Assigned: {tile.assignedDate}</Typography>
                  <Typography sx={{ fontSize: 11, color: "#334155", lineHeight: 1.2 }}>Due Date: {tile.dueDate}</Typography>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: "#334155",
                      lineHeight: 1.2,
                      display: "-webkit-box",
                      overflow: "hidden",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 1,
                    }}
                  >
                    Assigned by: {tile.assignedBy}
                  </Typography>
                </Box>

                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#1a4fd8" }}>
                  Open
                </Typography>
              </Box>
            </CardActionArea>
          </Card>
        )}
        tilesPerRow={{ xs: 1, sm: 2, md: 4, lg: 4 }}
        maxRows={2}
        containerMaxWidth="lg"
        searchEnabled
        searchPlaceholder="Search workflow assignments"
        controls={
          <Button
            type="button"
            variant="contained"
            onClick={() => setPickerOpen(true)}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.4,
              fontSize: 16,
              fontWeight: 700,
              textTransform: "none",
              background: "linear-gradient(135deg, #223b68 0%, #2d5b95 100%)",
              boxShadow: "0 10px 24px rgba(30, 64, 120, 0.22)",
            }}
          >
            + Start New Workflow
          </Button>
        }
        titleBarTabs={[
          {
            key: "inbox",
            label: "INBOX",
            active: activeTab === "inbox",
            onClick: () => setActiveTab("inbox"),
          },
          {
            key: "outbox",
            label: "OUTBOX",
            active: activeTab === "outbox",
            onClick: () => setActiveTab("outbox"),
          },
        ]}
      />

      <WorkflowPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onPickWorkflow}
      />

      <InitiateFormDialog
        open={initiateOpen}
        onClose={() => {
          setInitiateOpen(false);
          setPickedWorkflow(null);
        }}
        workflow={pickedWorkflow}
        onCreated={() => refreshRows(activeTab)}
      />

      <InstanceExecuteDialog
        open={instanceOpen}
        instance={activeInstance}
        isOutbox={activeTab === "outbox"}
        onClose={() => {
          setInstanceOpen(false);
          setActiveInstance(null);
        }}
        onChanged={() => refreshRows(activeTab)}
      />
    </>
  );
}
