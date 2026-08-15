// src/pages/DynamicReportCreator.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box, Paper, Stack, Typography, Divider, Button, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, TablePagination, Tooltip, Chip, Alert
} from "@mui/material";
import {
  Close, Edit as EditIcon, Visibility, FilterList, PlayArrow, Save
} from "@mui/icons-material";
import TableCreator from "../components/TableCreator";

/* ---------- Helpers (match TableCreator behavior) ---------- */
const TYPE_RENDERERS = {
  text: ({ value, onChange, readOnly }) => (
    <TextField size="small" fullWidth value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={readOnly} />
  ),
  number: ({ value, onChange, readOnly }) => (
    <TextField type="number" size="small" fullWidth value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
  ),
  date: ({ value, onChange, readOnly }) => (
    <TextField type="date" size="small" fullWidth value={value ? String(value).slice(0, 10) : ""} onChange={(e) => onChange(e.target.value || null)} disabled={readOnly} />
  ),
};
function applySort(rows, sort) {
  if (!sort?.key) return rows;
  const dir = sort.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = a[sort.key], vb = b[sort.key];
    if (va == null && vb == null) return 0;
    if (va == null) return -1 * dir;
    if (vb == null) return 1 * dir;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
}
function safeGet(obj, path) {
  try { return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj); } catch { return undefined; }
}
function evaluateRule(rule, row) {
  if (!rule || !rule.left) return true;
  const left = safeGet(row, rule.left);
  const right = rule.right;
  switch (rule.op) {
    case "==": return String(left) === String(right);
    case "!=": return String(left) !== String(right);
    case ">":  return Number(left) >  Number(right);
    case ">=": return Number(left) >= Number(right);
    case "<":  return Number(left) <  Number(right);
    case "<=": return Number(left) <= Number(right);
    case "includes": return String(left ?? "").includes(String(right));
    default: return true;
  }
}

/* ---------------- Rendered Report (Viewer) ---------------- */
function ReportViewerDialog({ reportId, open, onClose }) {
  // state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);      // { id, report_name, table_name, config }
  const [schema, setSchema] = useState(null);      // { fields, primaryKey }
  const [rows, setRows] = useState([]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "", dir: "asc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // inline edit state
  const [inlineEdits, setInlineEdits] = useState({});
  // view / form modals
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");

  // load report + schema + data
  useEffect(() => {
    if (!open || !reportId) return;
    (async () => {
      setLoading(true);
      setError("");
      setReport(null);
      setSchema(null);
      setRows([]);
      setInlineEdits({});
      try {
        const { data: rpt } = await axios.get(`/api/tables/reports/${reportId}`);
        const { data: sc } = await axios.get(`/api/tables/schema/${encodeURIComponent(rpt.table_name)}`);
        const primaryKey = sc?.primaryKey || "id";
        const visible = sc.fields
          .filter(f => f.name !== primaryKey && rpt.config?.[f.name]?.show)
          .map(f => f.name);

        const { data: dataRows } = await axios.get(
          `/api/tables/data/${encodeURIComponent(rpt.table_name)}`,
          { params: { fields: visible.join(",") } }
        );

        setReport(rpt);
        setSchema(sc);
        setRows(Array.isArray(dataRows) ? dataRows : []);
        setSort({ key: "", dir: "asc" });
        setPage(0);
      } catch (e) {
        console.error(e);
        setError("Failed to render report.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, reportId]);

  // derive (hooks must be unconditional)
  const fields = schema?.fields || [];
  const primaryKey = schema?.primaryKey || "id";

  const visibleFields = useMemo(() => {
    if (!schema || !report) return [];
    return fields.filter(f => f.name !== primaryKey && report.config?.[f.name]?.show);
  }, [schema, report, fields, primaryKey]);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter(r => visibleFields.some(f => String(r[f.name] ?? "").toLowerCase().includes(s)));
  }, [rows, search, visibleFields]);

  const sortedRows = useMemo(() => applySort(filteredRows, sort), [filteredRows, sort]);

  const pagedRows = useMemo(() => {
    const start = page * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const toggleSort = (key) =>
    setSort((s) => (s.key !== key ? { key, dir: "asc" } : { key, dir: s.dir === "asc" ? "desc" : "asc" }));

  // permissions
  const isInlineEditable = (field, row) => {
    const cfg = report?.config?.[field.name];
    return !!(cfg?.inlineEditable && evaluateRule(cfg?.condition, row));
  };
  const isFormEditable = (field, row) => {
    const cfg = report?.config?.[field.name];
    return !!(cfg?.formEditable && evaluateRule(cfg?.condition, row));
  };

  // inline handlers
  const startInline = (rowId) =>
    setInlineEdits((prev) => ({ ...prev, [rowId]: prev[rowId] || {} }));
  const setInlineCell = (rowId, fieldName, value) =>
    setInlineEdits((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] || {}), [fieldName]: value } }));
  const saveInline = async (row) => {
    const changes = inlineEdits[row[primaryKey]] || {};
    if (!Object.keys(changes).length || !report || !schema) return;

    const missing = Object.entries(report.config || {})
      .filter(([k, v]) => v?.mandatory && k in changes && (changes[k] === null || changes[k] === ""))
      .map(([k]) => k);
    if (missing.length) { setSaveMsg(`Missing mandatory fields: ${missing.join(", ")}`); return; }

    try {
      const res = await axios.put(
        `/api/tables/data/${encodeURIComponent(report.table_name)}/${row[primaryKey]}`,
        { changes }
      );
      const updated = res.data?.updated || { ...row, ...changes };
      setRows((prev) => prev.map((r) => (r[primaryKey] === row[primaryKey] ? updated : r)));
      setInlineEdits((prev) => ({ ...prev, [row[primaryKey]]: {} }));
      setSaveMsg("Row saved.");
    } catch (e) { console.error(e); setSaveMsg("Save failed."); }
  };

  // View / Form modals
  const ViewModal = () => {
    const r = viewRow;
    if (!r) return null;
    return (
      <Dialog open={!!r} onClose={() => setViewRow(null)} maxWidth="md" fullWidth>
        <DialogTitle>View Record</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {visibleFields.map((f) => (
              <Stack key={f.name} direction="row" spacing={2} alignItems="center">
                <Typography sx={{ minWidth: 200, fontWeight: 600 }}>{f.label || f.name}</Typography>
                <Typography>{String(r[f.name] ?? "").trim() || "—"}</Typography>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions><Button startIcon={<Close />} onClick={() => setViewRow(null)}>Close</Button></DialogActions>
      </Dialog>
    );
  };

  const EditModal = () => {
    const r = editRow;
    const [form, setForm] = useState({});
    useEffect(() => {
      if (r) {
        const editable = visibleFields.filter((f) => isFormEditable(f, r));
        const init = {};
        for (const f of editable) init[f.name] = r[f.name] ?? null;
        setForm(init);
      } else setForm({});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [r]);

    if (!r) return null;

    const editableFields = visibleFields.filter((f) => isFormEditable(f, r));
    const onSubmit = async () => {
      const missing = editableFields.filter((f) => report?.config?.[f.name]?.mandatory && (form[f.name] === null || form[f.name] === ""));
      if (missing.length) { setSaveMsg(`Missing mandatory fields: ${missing.map(m => m.label || m.name).join(", ")}`); return; }
      try {
        const res = await axios.put(
          `/api/tables/data/${encodeURIComponent(report.table_name)}/${r[primaryKey]}`,
          { changes: form }
        );
        const updated = res.data?.updated || { ...r, ...form };
        setRows((prev) => prev.map((row) => (row[primaryKey] === r[primaryKey] ? updated : row)));
        setEditRow(null);
        setSaveMsg("Record updated.");
      } catch (e) { console.error(e); setSaveMsg("Update failed."); }
    };

    return (
      <Dialog open={!!r} onClose={() => setEditRow(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Record</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {editableFields.length === 0 && (<Alert severity="info">No fields are editable for this row.</Alert>)}
            {editableFields.map((f) => {
              const Renderer = TYPE_RENDERERS[f.type] || TYPE_RENDERERS.text;
              const mandatory = report?.config?.[f.name]?.mandatory;
              return (
                <Box key={f.name}>
                  <Typography sx={{ mb: 0.5, fontWeight: 600 }}>
                    {f.label || f.name} {mandatory && <Chip size="small" label="mandatory" />}
                  </Typography>
                  <Renderer
                    value={form[f.name]}
                    onChange={(val) => setForm((prev) => ({ ...prev, [f.name]: val }))}
                    readOnly={false}
                  />
                </Box>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRow(null)} startIcon={<Close />}>Cancel</Button>
          <Button variant="contained" onClick={onSubmit} startIcon={<Save />}>Submit</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // UI
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { height: "90vh" } }}>
      <DialogTitle>
        {report?.report_name ? `View Report — ${report.report_name}` : "View Report"}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {saveMsg && <Alert severity="info" onClose={() => setSaveMsg("")} sx={{ mb: 2 }}>{saveMsg}</Alert>}

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            Table: <b>{report?.table_name || "—"}</b>
          </Typography>
          <TextField
            size="small"
            placeholder="Search…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{ endAdornment: <FilterList fontSize="small" /> }}
            sx={{ maxWidth: 320, ml: "auto" }}
          />
        </Stack>

        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {visibleFields.map((f) => (
                    <TableCell key={f.name} onClick={() => toggleSort(f.name)} sx={{ cursor: "pointer", whiteSpace: "nowrap" }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.label || f.name}</Typography>
                        {sort.key === f.name && <Chip size="small" label={sort.dir} />}
                      </Stack>
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={visibleFields.length + 1}>Loading…</TableCell></TableRow>
                ) : pagedRows.length ? (
                  pagedRows.map((row) => {
                    const rowId = row[primaryKey];
                    const pending = inlineEdits[rowId] || {};
                    const hasPending = Object.keys(pending).length > 0;
                    return (
                      <TableRow key={rowId ?? JSON.stringify(row)}>
                        {visibleFields.map((f) => {
                          const Renderer = TYPE_RENDERERS[f.type] || TYPE_RENDERERS.text;
                          const value = pending[f.name] !== undefined ? pending[f.name] : row[f.name];
                          const editable = isInlineEditable(f, row);
                          return (
                            <TableCell key={f.name} onDoubleClick={() => editable && startInline(rowId)}>
                              {editable ? (
                                <Renderer value={value} onChange={(val) => setInlineCell(rowId, f.name, val)} readOnly={false} />
                              ) : (
                                <Typography variant="body2">{String(value ?? "").trim() || "—"}</Typography>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="View">
                              <IconButton size="small" onClick={() => setViewRow(row)}><Visibility fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Open edit form">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => setEditRow(row)}
                                  disabled={visibleFields.every((f) => !isFormEditable(f, row))}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Save inline edits">
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => saveInline(row)}
                                  disabled={!hasPending}
                                >
                                  <Save fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={visibleFields.length + 1}>No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider />
          <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" px={2} py={1}>
            <TablePagination
              component="div"
              count={sortedRows.length}
              page={page}
              onPageChange={(e, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
            <Typography variant="caption">Primary key hidden: {primaryKey}</Typography>
          </Stack>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<Close />} onClick={onClose}>Close</Button>
      </DialogActions>

      <ViewModal />
      <EditModal />
    </Dialog>
  );
}

/* --------------------------- Main Page --------------------------- */
const LIST_URL = "/api/tables/reports";

export default function DynamicReportCreator() {
  // creator modal
  const [openCreator, setOpenCreator] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);

  // viewer modal
  const [openViewer, setOpenViewer] = useState(false);
  const [viewReportId, setViewReportId] = useState(null);

  // list state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [search, setSearch] = useState("");

  // paging
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchRows = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await axios.get(LIST_URL);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.report_name, r.table_name, r.created_by_name, r.modified_by_name, r.created_by, r.modified_by]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const paged = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const fmt = (d) => (!d ? "-" : (() => { try { return new Date(d).toLocaleString(); } catch { return String(d); } })());

  const handleOpenCreate = () => { setEditingReportId(null); setOpenCreator(true); };
  const handleOpenEdit = (id) => { setEditingReportId(id); setOpenCreator(true); };
  const handleCloseCreator = () => { setOpenCreator(false); setEditingReportId(null); };
  const handleSaved = () => { fetchRows(); handleCloseCreator(); };
  const handleView = (id) => { setViewReportId(id); setOpenViewer(true); };

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Typography variant="h5">Dynamic Report Creator</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Search reports, tables, users…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <FilterList fontSize="small" /> }}
          />
          <Button variant="contained" startIcon={<PlayArrow />} onClick={handleOpenCreate}>Create Report</Button>
        </Stack>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Report Name</TableCell>
                <TableCell>Table Name</TableCell>
                <TableCell>Created by</TableCell>
                <TableCell>Date Created</TableCell>
                <TableCell>Modified by</TableCell>
                <TableCell>Date Modified</TableCell>
                <TableCell align="center">View Report</TableCell>
                <TableCell align="center">Edit Report</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && paged.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">No reports found.</TableCell></TableRow>
              )}
              {loading ? (
                <TableRow><TableCell colSpan={8}>Loading…</TableCell></TableRow>
              ) : (
                paged.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={600}>{r.report_name || "-"}</Typography>
                        {r.status && <Chip size="small" label={r.status} />}
                      </Stack>
                    </TableCell>
                    <TableCell>{r.table_name || "-"}</TableCell>
                    <TableCell>{r.created_by_name || r.created_by || "-"}</TableCell>
                    <TableCell>{fmt(r.created_at)}</TableCell>
                    <TableCell>{r.modified_by_name || r.modified_by || "-"}</TableCell>
                    <TableCell>{fmt(r.modified_at)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View rendered report">
                        <IconButton color="primary" onClick={() => handleView(r.id)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit in Table Creator">
                        <IconButton color="secondary" onClick={() => handleOpenEdit(r.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Create/Edit Report (TableCreator) */}
      <Dialog open={openCreator} onClose={handleCloseCreator} maxWidth="lg" fullWidth PaperProps={{ sx: { height: "90vh" } }}>
        <DialogTitle sx={{ pr: 2 }}>{editingReportId ? "Edit Report" : "Create Report"}</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <TableCreator reportId={editingReportId} onSaved={handleSaved} onClose={handleCloseCreator} />
        </DialogContent>
        <DialogActions><Button startIcon={<Close />} onClick={handleCloseCreator}>Close</Button></DialogActions>
      </Dialog>

      {/* Rendered Report (with actions) */}
      <ReportViewerDialog reportId={viewReportId} open={openViewer} onClose={() => setOpenViewer(false)} />
    </Box>
  );
}
