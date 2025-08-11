// src/pages/workflows/WorkflowManager.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
  Pagination,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import api from "../../services/api";

const PAGE_SIZE = 10;

const emptyForm = { id: null, name: "", description: "" };

const WorkflowManager = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // ─────────────────────────────────────────────────────────────────────────────
  const fetchWorkflows = async () => {
    setLoading(true);
    setErr("");
    setInfo("");
    try {
      const res = await api.get("/workflows");
      setWorkflows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) {
        setErr("Your session has expired. Please log in again.");
      } else if (status === 403) {
        // Subscription-gated
        setErr(
          e?.response?.data?.error ||
            "Access denied (no active subscription for Workflows)."
        );
      } else {
        setErr(e?.response?.data?.error || "Failed to load workflows.");
      }
      setWorkflows([]);
      console.error("❌ GET /workflows failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return workflows;
    return workflows.filter((w) => {
      const id = String(w.id || "");
      const n = (w.name || "").toLowerCase();
      const d = (w.description || "").toLowerCase();
      return id.includes(t) || n.includes(t) || d.includes(t);
    });
  }, [workflows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, workflows]);

  // ─────────────────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm);
    setInfo("");
    setErr("");
    setModalOpen(true);
  };

  const openEdit = (wf) => {
    setForm({ id: wf.id, name: wf.name || "", description: wf.description || "" });
    setInfo("");
    setErr("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setErr("Name is required.");
      return;
    }
    setSaving(true);
    setErr("");
    setInfo("");
    try {
      if (form.id) {
        await api.patch(`/workflows/${form.id}`, {
          name: form.name.trim(),
          description: form.description?.trim() || "",
        });
        setInfo("Workflow updated.");
      } else {
        await api.post("/workflows", {
          name: form.name.trim(),
          description: form.description?.trim() || "",
        });
        setInfo("Workflow created.");
      }
      closeModal();
      fetchWorkflows();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) setErr("Your session has expired. Please log in again.");
      else if (status === 403)
        setErr(
          e?.response?.data?.error ||
            "Access denied (no active subscription for Workflows)."
        );
      else setErr(e?.response?.data?.error || "Save failed.");
      console.error("❌ Save workflow failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (wf) => {
    if (!window.confirm(`Delete workflow "${wf.name}"? This cannot be undone.`)) {
      return;
    }
    setErr("");
    setInfo("");
    try {
      await api.delete(`/workflows/${wf.id}`);
      setInfo("Workflow deleted.");
      fetchWorkflows();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) setErr("Your session has expired. Please log in again.");
      else if (status === 403)
        setErr(
          e?.response?.data?.error ||
            "Access denied (no active subscription for Workflows)."
        );
      else setErr(e?.response?.data?.error || "Delete failed.");
      console.error("❌ Delete workflow failed:", e);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Box p={3}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Box>
          <Typography variant="h5">WORKFLOWS</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Create and manage workflow definitions
          </Typography>
        </Box>

        <Box display="flex" gap={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search workflows"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
          >
            New Workflow
          </Button>
        </Box>
      </Box>

      {err && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {info}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : paginated.length ? (
        <>
          <Grid container spacing={2}>
            {paginated.map((wf) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={wf.id}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      mb={1}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        {wf.name}
                      </Typography>
                      <Box>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(wf)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(wf)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      ID: {wf.id}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {wf.description || "—"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box mt={3} display="flex" justifyContent="center">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_e, p) => setPage(p)}
              color="primary"
            />
          </Box>
        </>
      ) : (
        !err && (
          <Box py={6} textAlign="center" color="text.secondary">
            <Typography>No workflows found.</Typography>
          </Box>
        )
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="sm">
        <DialogTitle>
          {form.id ? "Edit Workflow" : "Create Workflow"}
        </DialogTitle>
        <DialogContent dividers>
          <Box display="grid" gap={2} mt={1}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              autoFocus
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              fullWidth
              multiline
              minRows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowManager;
