//client/src/pages/businessautomation/simple_workflowbuilder/SimpleWorkflowbuilder.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ModuleTileGrid from "../../../components/ModuleTileGrid";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import {
  fetchLoginContext,
  fetchWorkflowTables,
  listWorkflows,
  createWorkflow,
  deleteWorkflow,
  bulkCreateSteps,
} from "./api";
import { buildDefaultSteps } from "./utils";
import {
  WF_TABLE_PREFIX,
  DEFAULTS,
  DEFAULT_APPROVE_ACTION,
  DEFAULT_REJECT_ACTION,
  TABLE_TYPE_WORKFLOW,
} from "./constants";

/**
 * Simple Workflow Builder – landing/list + create form
 * - Creates a header row in simple_workflowbuilder
 * - Auto-creates default steps in simple_workflowbuilder_steps
 */
export default function SimpleWorkflowbuilder() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [tables, setTables] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // form
  const [wfName, setWfName] = useState("");
  const [wfTable, setWfTable] = useState("");
  const [noOfSteps, setNoOfSteps] = useState("");

  useEffect(() => {
  let cancelled = false;

  const withTimeout = (p, label, ms = 12000) =>
    Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms))
    ]);

  (async () => {
    try {
      console.log("[SWB] start boot");
      const ctx = await withTimeout(fetchLoginContext(), "auth/me");
      if (cancelled) return;
      console.log("[SWB] /auth/me OK", ctx);
      setMe(ctx);

      const tbs = await withTimeout(fetchWorkflowTables(WF_TABLE_PREFIX), "db/tables");
      if (cancelled) return;
      console.log("[SWB] /db/tables OK", tbs);
      // tbs is array of strings (per your api.js) — don’t map table_name here.
      setTables(tbs);

      const list = await withTimeout(listWorkflows(), "simple_workflowbuilder list");
      if (cancelled) return;
      console.log("[SWB] /simple_workflowbuilder OK", list);
      setItems(list || []);
    } catch (e) {
      console.error("[SWB] boot failed:", e);
      alert(`Load failed: ${e.message}`);
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();

  return () => { cancelled = true; };
}, []);

  useEffect(() => {
    (async () => {
      try {
        const [ctx, tbs, list] = await Promise.all([
          fetchLoginContext(),
          fetchWorkflowTables(WF_TABLE_PREFIX),
          listWorkflows(),
        ]);
        setMe(ctx);
        setTables(tbs.map((t) => t.table_name || t));
        setItems(list || []);
      } catch (e) {
        console.error(e);
        alert(`Load failed: ${e.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canCreate = useMemo(() => {
    if (!wfName || !wfTable) return false;
    if (noOfSteps === "") return true;
    if (!/^[0-9]+$/.test(noOfSteps)) return false;
    return Number(noOfSteps) > 0;
  }, [wfName, wfTable, noOfSteps]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const name = String(row.workflow_map_name || "").toLowerCase();
      const table = String(row.workflow_table_name || "").toLowerCase();
      return name.includes(q) || table.includes(q);
    });
  }, [items, searchQuery]);

  const workflowTiles = useMemo(() => {
  return (items || []).map((row) => ({
    id: row.id,

    label:
      row.workflow_map_name ||
      "Untitled Workflow",

    searchText: [
      row.workflow_map_name,
      row.workflow_table_name,
      row.id,
      row.created_by,
      row.wf_status,
    ]
      .filter(Boolean)
      .join(" "),

    workflow: row,

    onClick: () =>
      navigate(
        `/simplewfb/configure/${row.id}`
      ),
  }));
}, [items, navigate]);

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString();
  };

  async function handleCreate() {
    if (!canCreate) return;
    try {
      const stepsCount = parseInt(noOfSteps, 10);
      const n = Number.isFinite(stepsCount) && stepsCount > 0 ? stepsCount : DEFAULTS.NO_OF_STEPS;
      const headerPayload = {
        workflow_map_name: wfName.trim(),
        workflow_table_name: wfTable.trim(),
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        created_by: me?.user_id ?? null,
        modified_by: me?.user_id ?? null,
        step_performer: null,
        step_name: null,
        wf_status: null,
        review_requestor: null,
        reviewer: null,
        initiator: me?.user_id ?? null,
        audit_trail: [],
        table_type: TABLE_TYPE_WORKFLOW,
        step_comments: null,
        tenant_id: me?.tenant_id ?? null,
        no_of_steps: n,
        user_access: {},
        version_info: { v: 1 },
      };

      const header = await createWorkflow(headerPayload); // => { id, ... }

      // Build default steps and wire defaults
      const defaults = buildDefaultSteps(n).map((s) => ({
        workflow_id: header.id,
        step_name: s.step_name,
        step_no: s.step_no,
        step_type: s.step_type,
        step_performer: null,
        step_action: s.is_terminate ? null : "send",
        attachments_allowed: "view_upload",
        review_allowed: s.is_terminate ? false : true,
        next_step_after_approve: s.is_terminate ? null : s.step_no + 1,
        next_step_after_reject: null,
        approve_button_name: s.is_terminate ? null : "Send",
        reject_button_name: null,
        mail_notification_users: ["Initiator"],
        mail_content: {},
        // on_send_approved: null,
        // on_send_rejected: null,
        // on_send_review: null,
        step_form_configuration: {}, // will be configured later via modal
        tenant_id: me?.tenant_id ?? null,
        version_info: { v: 1 },
        step_due_in_days: 1,
      }));

      await bulkCreateSteps(header.id, defaults);

      // refresh
      const list = await listWorkflows();
      setItems(list || []);
      setWfName("");
      setWfTable("");
      setNoOfSteps("");
      setCreateOpen(false);
      alert("Workflow created with default steps.");
    } catch (e) {
      console.error(e);
      alert(`Create failed: ${e.message}`);
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm("Delete this workflow? Instances will remain intact.");
    if (!ok) return;
    try {
      await deleteWorkflow(id);
      setItems((cur) => cur.filter((x) => x.id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <div>Loading…</div>;

  return (
    <Box
  sx={{
    minHeight: "100vh",
    bgcolor: "#f5f7fb",
  }}
>
  <ModuleTileGrid
    title="Workflow Studio"
    subtitle="Design and deploy intelligent business workflows with reusable steps, routing and enterprise process automation."
    tiles={workflowTiles}
    searchPlaceholder="Search workflows"
    primaryAction={{
      label: "Create Workflow",
      onClick: () =>
        setCreateOpen(true),
    }}
    showDefaultFooter={false}
    renderTileContent={(tile) => {
      const row = tile.workflow;

      if (!row) {
        return null;
      }

      const TileRow = ({
        label,
        value,
      }) => (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              "82px minmax(0,1fr)",
            columnGap: 0.4,
            alignItems: "center",
            height: 18,
            minWidth: 0,
          }}
        >
          <Typography
            noWrap
            sx={{
              fontSize: 10,
              color: "#738496",
              fontWeight: 500,
            }}
          >
            {label}
          </Typography>

          <Typography
            noWrap
            title={String(
              value ?? "-"
            )}
            sx={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow:
                "ellipsis",
              whiteSpace: "nowrap",

              fontSize: 10.5,
              color: "#33485d",
              fontWeight: 600,
            }}
          >
            {value ?? "-"}
          </Typography>
        </Box>
      );

      const status =
        row.wf_status ||
        row.status ||
        "";

      return (
        <>
          {/* TITLE */}

          <Typography
            noWrap
            title={
              row.workflow_map_name ||
              ""
            }
            sx={{
              width: "100%",

              fontSize: 14,
              fontWeight: 700,
              lineHeight: "20px",

              color: "#172b4d",

              overflow: "hidden",
              textOverflow:
                "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.workflow_map_name ||
              "Untitled Workflow"}
          </Typography>

          {/* STATUS */}

          {status ? (
            <Typography
              noWrap
              sx={{
                mt: 0.2,

                fontSize: 9.5,
                fontWeight: 700,

                color: "#c62828",

                textTransform:
                  "uppercase",
              }}
            >
              {status}
            </Typography>
          ) : null}

          {/* PUSH DETAILS DOWN */}

          <Box
            sx={{
              flexGrow: 1,
            }}
          />

          {/* DETAILS + ACTIONS */}

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns:
                "minmax(0,1fr) auto",

              columnGap: 1,

              alignItems: "end",

              width: "100%",
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: "grid",
                rowGap: "1px",
                minWidth: 0,
              }}
            >
              <TileRow
                label="Workflow ID"
                value={row.id}
              />

              <TileRow
                label="Table"
                value={
                  row.workflow_table_name ||
                  "-"
                }
              />

              <TileRow
                label="Created By"
                value={
                  row.created_by ??
                  "-"
                }
              />

              <TileRow
                label="Modified"
                value={formatDate(
                  row.date_modified
                )}
              />
            </Box>

            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();

                handleDelete(
                  row.id
                );
              }}
              sx={{
                height: 27,
                minHeight: 27,

                px: 0.9,

                border:
                  "1px solid #f0c0bc",

                borderRadius:
                  "6px",

                color:
                  "#b42318",

                bgcolor:
                  "#ffffff",

                fontSize: 10,

                textTransform:
                  "none",

                "&:hover": {
                  bgcolor:
                    "#fdf2f1",
                },
              }}
            >
              Delete
            </Button>
          </Box>
        </>
      );
    }}
  />
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: "#3f4e62", color: "#fff", fontWeight: 700 }}>
          Create a Simple Workflow
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#f1f2e9", pt: 2 }}>
          <Grid container spacing={1.2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                placeholder="Workflow Name"
                value={wfName}
                onChange={(e) => setWfName(e.target.value)}
                InputProps={{ sx: { bgcolor: "#fff", borderRadius: 1 } }}
                sx={{
                  "& .MuiInputBase-root": { height: 40 },
                  "& .MuiInputBase-input": { py: 0 },
                  mt: 2,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                select
                value={wfTable}
                onChange={(e) => setWfTable(e.target.value)}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) =>
                    value ? String(value) : "Select Workflow table",
                }}
                InputProps={{ sx: { bgcolor: "#fff", borderRadius: 1 } }}
                sx={{
                  "& .MuiInputBase-root": { height: 40 },
                  "& .MuiInputBase-input": { py: 0 },
                  "& .MuiSelect-select": { py: 0 },
                }}
              >
                <MenuItem value="">Select Workflow table</MenuItem>
                {tables.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                size="small"
                type="number"
                min={1}
                placeholder="No of steps (default 1)"
                value={noOfSteps}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^[0-9]+$/.test(raw)) {
                    setNoOfSteps(raw);
                  }
                }}
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*", min: 1 }}
                InputProps={{ sx: { bgcolor: "#fff", borderRadius: 1 } }}
                sx={{
                  "& .MuiInputBase-root": { height: 40 },
                  "& .MuiInputBase-input": { py: 0 },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                disabled={!canCreate}
                title={!wfName ? "Enter a Workflow Name" : !wfTable ? "Select a Workflow Table" : ""}
                onClick={handleCreate}
                sx={{
                  bgcolor: "#f2b600",
                  color: "#1f355d",
                  fontWeight: 700,
                  height: 40,
                }}
              >
                Create
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
