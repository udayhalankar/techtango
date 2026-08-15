//client/src/pages/businessautomation/simple_workflowbuilder/SimpleWorkflowbuilder.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <Box sx={{ bgcolor: "#1f355d", color: "#fff", px: 4, mt: "-65px", pt: "97px", pb: 4 }}>
        <Box
          sx={{
            display: "flex",
            gap: 3,
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ minWidth: 280, flex: "1 1 320px" }}>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Workflow Studio
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
              Workflow Studio is a powerful yet simple workflow builder that delivers 
              intelligent automation and accelerates digital transformation. 
              It streamlines business form workflows, driving efficiency, growth, 
              and long-term sustainability.
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
              Design and deploy workflows with a level of ease never experienced before.
            </Typography>
          </Box>

        </Box>
      </Box>

      <Box sx={{ px: 4, py: 4 }}>
        <Box
          sx={{
            maxWidth: 1170,
            mx: "auto",
            // bgcolor: "#eef2fb",
            borderRadius: 2,
            p: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap"
            }}
          >
            <Button
              variant="contained"
              size="small"
              onClick={() => setCreateOpen(true)}
              sx={{ bgcolor: "#1f355d", textTransform: "none" }}
            >
              Create Workflow
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <TextField
              size="small"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 500, maxWidth: "100%" }}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              {filteredItems.slice(0, 12).map((row) => (
                <Grid item key={row.id} xs={6} md={3}>
                  <Paper
                    elevation={0}
                    role="button"
                    tabIndex={0}
                    sx={{
                      bgcolor: "#ffffff",
                      color: "#1f355d",
                      border: "1px solid #2f5fff",
                      boxShadow: "0 4px 10px rgba(16, 24, 40, 0.16)",
                      transition: "box-shadow 160ms ease, transform 160ms ease",
                      "&:hover": {
                        boxShadow: "0 6px 16px rgba(16, 24, 40, 0.22)",
                        transform: "translateY(-2px)",
                      },
                      fontFamily: "Roboto, sans-serif",
                      p: 2,
                      borderRadius: 2,
                      minHeight: 160,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate(`/simplewfb/configure/${row.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/simplewfb/configure/${row.id}`);
                      }
                    }}
                  >
                    <Box sx={{ width: "100%" }}>
                      <Link
                        to={`/simplewfb/configure/${row.id}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: 18,
                            color: "#1a4fd8",
                          }}
                        >
                          {row.workflow_map_name}
                        </Typography>
                      </Link>
                      <Typography sx={{ mt: 2, fontSize: 11 }}>
                        Workflow ID: {row.id ?? "-"}
                      </Typography>
                      <Typography sx={{ mt: 0.2, fontSize: 11 }}>
                        Created by: {row.created_by ?? "-"}
                      </Typography>
                      <Typography sx={{ mt: 0.2, fontSize: 11 }}>
                        Last Modified: {formatDate(row.date_modified)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        mt: 2,
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                         sx={{ textTransform: "none" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(row.id);
                        }}
                      >
                        Delete
                      </Button>
                      <Button size="small" variant="outlined" sx={{ textTransform: "none" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          alert("TODO: Manage access");
                        }}>
                        Manage Access
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Box>
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
