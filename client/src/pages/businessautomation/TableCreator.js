// src/components/TableCreator.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import {
  Box, Paper, Stack, Typography, Divider, Button, IconButton, TextField,
  MenuItem, Select, FormControl, InputLabel, Checkbox, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, TablePagination, Tooltip, Chip, Alert
} from "@mui/material";
import { Save, Close, Edit as EditIcon, Visibility, FilterList, PlayArrow } from "@mui/icons-material";

/* ---------------- Field renderers ---------------- */
const TYPE_RENDERERS = {
  text: ({ value, onChange, readOnly }) => (
    <TextField size="small" fullWidth value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={readOnly} />
  ),
  number: ({ value, onChange, readOnly }) => (
  <TextField
    type="number"
    size="small"
    fullWidth
    value={value ?? ""}
    onChange={(e) => {
      const el = e.target;
      // When cleared, don’t mark it as a change yet (undefined = ignore)
      if (el.value === "") {
        onChange(undefined);
        return;
      }
      // Ignore invalid keystrokes (so we don’t store junk)
      if (!el.validity?.valid) return;

      // Valid number -> store numeric value
      onChange(el.valueAsNumber);
    }}
    disabled={readOnly}
  />
),

  date: ({ value, onChange, readOnly }) => (
    <TextField type="date" size="small" fullWidth value={value ? String(value).slice(0, 10) : ""} onChange={(e) => onChange(e.target.value || null)} disabled={readOnly} />
  ),
  select: ({ value, onChange, readOnly, options = [] }) => (
    <FormControl size="small" fullWidth>
      <Select value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={readOnly}>
        {options.map((opt) => (
          <MenuItem key={String(opt.value ?? opt)} value={opt.value ?? opt}>
            {opt.label ?? String(opt)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  ),
};

/* ---------------- utils ---------------- */
function safeGet(obj, path) {
  try { return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj); }
  catch { return undefined; }
}
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
function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
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

/* ---------------- Condition Editor ---------------- */
function ConditionEditor({ fields, condition, onChange }) {
  const [rule, setRule] = useState(() => condition || { left: "", op: "==", right: "" });
  useEffect(() => setRule(condition || { left: "", op: "==", right: "" }), [condition]);
  const ops = ["==", "!=", ">", ">=", "<", "<=", "includes"];
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Field</InputLabel>
        <Select label="Field" value={rule.left} onChange={(e) => setRule((r) => ({ ...r, left: e.target.value }))}>
          {fields.map((f) => (<MenuItem key={f.name} value={f.name}>{f.label || f.name}</MenuItem>))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 110 }}>
        <InputLabel>Op</InputLabel>
        <Select label="Op" value={rule.op} onChange={(e) => setRule((r) => ({ ...r, op: e.target.value }))}>
          {ops.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
        </Select>
      </FormControl>
      <TextField size="small" label="Value" value={rule.right} onChange={(e) => setRule((r) => ({ ...r, right: e.target.value }))} />
      <Button variant="outlined" onClick={() => onChange(rule)}>Set</Button>
    </Stack>
  );
}

/* ---------------- Small, robust toggle wrapper ---------------- */
function ToggleCell({ checked, onToggle, disabled }) {
  return (
    <Box
      role="checkbox"
      aria-checked={!!checked}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle(!checked);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle(!checked);
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        px: 0.5,
        py: 0.25,
        position: "relative",
        zIndex: 1,
      }}
    >
      <Checkbox
        checked={!!checked}
        onChange={() => {}}
        disableRipple
        disabled={disabled}
        sx={{ pointerEvents: "none" }}
      />
    </Box>
  );
}

/* ---------------- Defaults ---------------- */
const DEFAULT_FIELD_CFG = Object.freeze({
  show: true,
  inlineEditable: false,
  formEditable: false,
  mandatory: false,
  condition: null,
});

/* =================================================================== */
/*                           MAIN COMPONENT                             */
/* =================================================================== */
export default function TableCreator({ reportId, onSaved, onClose }) {
  const [tables, setTables] = useState([]);
  const [tableName, setTableName] = useState("");
  const [schema, setSchema] = useState(null);
  const [config, setConfig] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [reportName, setReportName] = useState("");
  const [saveReportMsg, setSaveReportMsg] = useState("");

  const [savedReports, setSavedReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [pendingConfig, setPendingConfig] = useState(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [sort, setSort] = useState({ key: "", dir: "asc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [inlineEdits, setInlineEdits] = useState({});
  const [saveMsg, setSaveMsg] = useState("");

  const [renderRequested, setRenderRequested] = useState(false);

  /* derived */
  const fields = useMemo(() => schema?.fields || [], [schema]);
  const primaryKey = schema?.primaryKey || "id";
  const displayFields = useMemo(() => fields.filter((f) => f.name !== primaryKey), [fields, primaryKey]);
  const visibleFields = useMemo(() => displayFields.filter((f) => config[f.name]?.show), [displayFields, config]);

  const filteredRows = useMemo(() => {
    if (!debouncedSearch) return rows;
    const s = debouncedSearch.toLowerCase();
    return rows.filter((r) => visibleFields.some((f) => String(r[f.name] ?? "").toLowerCase().includes(s)));
  }, [rows, debouncedSearch, visibleFields]);

  const sortedRows = useMemo(() => applySort(filteredRows, sort), [filteredRows, sort]);
  const pagedRows = useMemo(() => {
    const start = page * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  /* config updater */
  const updateFieldCfg = useCallback((name, patch, _sourceLabel = "UNKNOWN") => {
    setConfig((c) => {
      const prev = c?.[name] ?? DEFAULT_FIELD_CFG;
      const next = { ...prev, ...patch };
      if (!next.inlineEditable && !next.formEditable && next.mandatory) next.mandatory = false;
      return { ...c, [name]: next };
    });
  }, []);

  /* hydrate from reportId */
  useEffect(() => {
    if (!reportId) return;
    (async () => {
      try {
        const { data: r } = await axios.get(`/api/tables/reports/${reportId}`);
        setReportName(r.report_name);
        setTableName(r.table_name);
        setPendingConfig(r.config);
        setRenderRequested(false);
      } catch {}
    })();
  }, [reportId]);

  /* load tables */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/tables", { params: { prefix: "cust_" } });
        const list = Array.isArray(res.data) ? res.data : [];
        setTables(list.filter((t) => String(t).startsWith("cust_")));
      } catch {
        try {
          const res2 = await axios.get("/api/tables/list", { params: { prefix: "cust_" } });
          setTables(Array.isArray(res2.data) ? res2.data : []);
        } catch (err) {
          setError("Failed to load tables");
        }
      }
    })();
  }, []);

  /* load saved reports when table changes */
  useEffect(() => {
    if (!tableName) { setSavedReports([]); setSelectedReportId(""); return; }
    (async () => {
      try {
        const res = await axios.get("/api/tables/reports", { params: { table: tableName } });
        setSavedReports(res.data || []);
      } catch {}
    })();
  }, [tableName]);

  /* guard to avoid overwriting toggles */
  const serverAppliedRef = useRef(false);

  /* load schema when table changes */
  useEffect(() => {
    if (!tableName) return;
    (async () => {
      setLoading(true); setError(""); setRows([]); setSchema(null); setRenderRequested(false);
      try {
        const res = await axios.get(`/api/tables/schema/${encodeURIComponent(tableName)}`);
        const sc = res.data;

        const defaults = {};
        for (const f of sc.fields) {
          defaults[f.name] = {
            show: f.name === sc.primaryKey ? false : true,
            inlineEditable: false,
            formEditable: false,
            mandatory: false,
            condition: null,
          };
        }

        setSchema(sc);
        setConfig(defaults);
        serverAppliedRef.current = false;
      } catch (e) {
        setError("Failed to load schema");
      } finally {
        setLoading(false);
      }
    })();
  }, [tableName]);

  /* apply pending server config once after schema */
  useEffect(() => {
    if (!schema || !pendingConfig || serverAppliedRef.current) return;
    setConfig((prev) => {
      const merged = { ...prev };
      for (const k of Object.keys(pendingConfig)) {
        merged[k] = { ...(merged[k] ?? DEFAULT_FIELD_CFG), ...pendingConfig[k] };
      }
      return merged;
    });
    serverAppliedRef.current = true;
    setPendingConfig(null);
  }, [schema, pendingConfig]);

  /* load data when rendering */
  useEffect(() => {
    if (!schema || !tableName || !renderRequested) return;
    const visibleNames = visibleFields.map((f) => f.name);
    (async () => {
      setLoading(true); setError("");
      try {
        const fieldsToFetch = Array.from(new Set([primaryKey, ...visibleNames]));
        const res = await axios.get(
          `/api/tables/data/${encodeURIComponent(tableName)}`,
          { params: { fields: fieldsToFetch.join(",") } }
        );
        setRows(res.data || []); setPage(0);
      } catch (e) { setError("Failed to load data"); }
      finally { setLoading(false); }
    })();
  }, [schema, tableName, renderRequested, visibleFields, primaryKey]);

  /* helpers */
  const isProtected = (k) =>
    k === primaryKey || k === "created_at" || k === "created_by";

  const hasDirty = React.useCallback((row) => {
  const edits = inlineEdits[row[primaryKey]];
  if (!edits) return false;
  for (const [k, v] of Object.entries(edits)) {
    if (k === primaryKey || k === "created_at" || k === "created_by") continue;
    if (v === undefined) continue;         // ignore “no edit yet”
    if (v !== row[k]) return true;         // changed from original
  }
  return false;
}, [inlineEdits, primaryKey]);


  const toggleSort = (key) => {
    setSort((s) => (s.key !== key ? { key, dir: "asc" } : { key, dir: s.dir === "asc" ? "desc" : "asc" }));
  };
  const startInline = (rowId) => setInlineEdits((prev) => ({ ...prev, [rowId]: prev[rowId] || {} }));
  const setInlineCell = (rowId, field, value) => {
            setInlineEdits(prev => {
              const next = { ...prev };
              const bucket = { ...(next[rowId] || {}) };
              bucket[field] = value;
              next[rowId] = bucket;
              return next;
            });
          };


  async function loadReport(id) {
    try {
      const res = await axios.get(`/api/tables/reports/${id}`);
      const r = res.data;
      setReportName(r.report_name);
      setTableName(r.table_name);
      setPendingConfig(r.config);
      setRenderRequested(false);
    } catch (err) { setError("Failed to load report"); }
  }

  async function saveInline(row) {
  const edits = inlineEdits[row[primaryKey]] || {};

  // Build a payload with only real changes
  const cleaned = {};
  for (const [k, v] of Object.entries(edits)) {
    if (k === primaryKey || k === "created_at" || k === "created_by") continue; // protected
    if (v === undefined) continue;           // ignore invalid/cleared-but-not-confirmed
    if (v === row[k]) continue;              // ignore unchanged
    cleaned[k] = v;
  }

  if (!Object.keys(cleaned).length) {
    setSaveMsg("No valid changes to save.");
    return;
  }

  // Mandatory only for keys being changed
  const missing = Object.entries(config)
    .filter(([k, v]) => v?.mandatory && k in cleaned && (cleaned[k] === null || cleaned[k] === ""))
    .map(([k]) => k);

  if (missing.length) {
    setSaveMsg(`Missing mandatory fields: ${missing.join(", ")}`);
    return;
  }

  try {
    const res = await axios.put(
      `/api/tables/data/${encodeURIComponent(tableName)}/${row[primaryKey]}`,
      { changes: cleaned }
    );
    const updated = res.data?.updated || { ...row, ...cleaned };
    setRows((prev) => prev.map((r) => (r[primaryKey] === row[primaryKey] ? updated : r)));
    setInlineEdits((prev) => ({ ...prev, [row[primaryKey]]: {} }));
    setSaveMsg("Row saved.");
  } catch {
    setSaveMsg("Save failed.");
  }
}


  function isInlineCellEditable(field, row) {
    const cfg = config[field.name];
    if (!cfg?.inlineEditable) return false;
    return evaluateRule(cfg.condition, row);
  }
  function isFormFieldEditable(field, row) {
    const cfg = config[field.name];
    if (!cfg?.formEditable) return false;
    return evaluateRule(cfg.condition, row);
  }

  async function handleSaveReport() {
    if (!reportName.trim() || !tableName) {
      setSaveReportMsg("Please enter report name and select a table."); return;
    }
    try {
      const res = await axios.post("/api/tables/reports", { name: reportName.trim(), table: tableName, config });
      setSaveReportMsg(`Report saved. ID: ${res.data?.reportId || "unknown"}`);
      const list = await axios.get("/api/tables/reports", { params: { table: tableName } });
      setSavedReports(list.data || []);
      onSaved?.();
    } catch (e) { setSaveReportMsg("Failed to save report."); }
  }

  const renderReport = () => setRenderRequested(true);

  /* render */
  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>Dynamic Report Builder</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Table (cust_*)</InputLabel>
            <Select label="Table (cust_*)" value={tableName} onChange={(e) => setTableName(e.target.value)}>
              {tables.map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
            </Select>
          </FormControl>

          <TextField size="small" label="Report Name" value={reportName} onChange={(e) => setReportName(e.target.value)} sx={{ maxWidth: 260 }} />

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Saved Reports</InputLabel>
            <Select
              label="Saved Reports"
              value={selectedReportId}
              onChange={async (e) => {
                const id = e.target.value;
                setSelectedReportId(id);
                if (id) await loadReport(id);
              }}
              displayEmpty
              renderValue={(val) => {
                const r = savedReports.find(x => String(x.id) === String(val));
                return r ? r.report_name : "Saved Reports";
              }}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {savedReports.map(r => (<MenuItem key={r.id} value={r.id}>{r.report_name}</MenuItem>))}
            </Select>
          </FormControl>

          <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ endAdornment: <FilterList fontSize="small" /> }} sx={{ maxWidth: 300 }} />

          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            <Tooltip title="Save report configuration">
              <Button variant="contained" onClick={handleSaveReport}>Save Configuration</Button>
            </Tooltip>
            <Tooltip title="Render report with current selection">
              <Button variant="outlined" startIcon={<PlayArrow/>} onClick={renderReport}>Render Report</Button>
            </Tooltip>
            {onClose && (
              <Tooltip title="Close">
                <Button variant="text" startIcon={<Close />} onClick={onClose}>Close</Button>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        {schema && (
          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>Schema Preview</Typography>
            <Paper variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Label</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>UI Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nullable</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Max Length</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Select</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Mandatory</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Inline Editable</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Form Editable</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Edit Condition</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayFields.map((f) => {
                    const cfg = config[f.name] ?? DEFAULT_FIELD_CFG;
                    const mandatoryDisabled = !(cfg.inlineEditable || cfg.formEditable);
                    return (
                      <TableRow key={f.name}>
                        <TableCell>{f.name}</TableCell>
                        <TableCell>{f.label}</TableCell>
                        <TableCell>{f.type}</TableCell>
                        <TableCell>{f.nullable ? 'YES' : 'NO'}</TableCell>
                        <TableCell>{f.maxLength ?? '—'}</TableCell>

                        {/* Show */}
                        <TableCell align="center">
                          <ToggleCell
                            checked={!!cfg.show}
                            onToggle={(ch) => updateFieldCfg(f.name, { show: ch }, "TOGGLE")}
                            disabled={false}
                          />
                        </TableCell>

                        {/* Mandatory */}
                        <TableCell align="center">
                          <ToggleCell
                            checked={!!cfg.mandatory}
                            onToggle={(ch) => updateFieldCfg(f.name, { mandatory: ch }, "TOGGLE")}
                            disabled={mandatoryDisabled}
                          />
                        </TableCell>

                        {/* Inline editable */}
                        <TableCell align="center">
                          <ToggleCell
                            checked={!!cfg.inlineEditable}
                            onToggle={(ch) => updateFieldCfg(f.name, { inlineEditable: ch }, "TOGGLE")}
                            disabled={false}
                          />
                        </TableCell>

                        {/* Form editable */}
                        <TableCell align="center">
                          <ToggleCell
                            checked={!!cfg.formEditable}
                            onToggle={(ch) => updateFieldCfg(f.name, { formEditable: ch }, "TOGGLE")}
                            disabled={false}
                          />
                        </TableCell>

                        <TableCell sx={{ verticalAlign: 'top' }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <ConditionEditor
                              fields={displayFields}
                              condition={cfg.condition}
                              onChange={(cond) => updateFieldCfg(f.name, { condition: cond }, "CONDITION")}
                            />
                            {cfg.condition && <Chip size="small" label="has condition" />}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saveReportMsg && <Alert severity="success" onClose={() => setSaveReportMsg("")} sx={{ mb: 2 }}>{saveReportMsg}</Alert>}
      {saveMsg && <Alert severity="info" onClose={() => setSaveMsg("") } sx={{ mb: 2 }}>{saveMsg}</Alert>}

      {renderRequested && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {visibleFields.map((f) => (
                    <TableCell
                      key={f.name}
                      onClick={() => toggleSort(f.name)}
                      sx={{ cursor: "pointer", whiteSpace: "nowrap" }}
                    >
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
                  pagedRows.map((row) => (
                    <TableRow key={row[primaryKey] ?? JSON.stringify(row)}>
                      {visibleFields.map((f) => {
                        const Renderer = TYPE_RENDERERS[f.type] || TYPE_RENDERERS.text;
                        const rowId = row[primaryKey];
                        const pending = inlineEdits[rowId]?.[f.name];
                        const value = pending !== undefined ? pending : row[f.name];
                        const editable = isInlineCellEditable(f, row);
                        return (
                          <TableCell key={f.name} onDoubleClick={() => editable && startInline(rowId)}>
                            {/* {editable ? (
                              <Renderer value={value} onChange={(val) => setInlineCell(rowId, f.name, val)} readOnly={false} options={f.options}/>
                            ) : (
                              <Typography variant="body2">{String(value ?? "").trim() || "—"}</Typography>
                            )} */}
                            {editable ? (
                                <Box onFocusCapture={() => startInline(rowId)}>
                                  <Renderer
                                    value={value}
                                    onChange={(val) => setInlineCell(rowId, f.name, val)}
                                    readOnly={false}
                                    options={f.options}
                                  />
                                </Box>
                              ) : (
                                <Typography variant="body2">{String(value ?? "").trim() || "—"}</Typography>
                              )}

                          </TableCell>
                        );
                      })}
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => setViewRow(row)}><Visibility fontSize="small"/></IconButton>
                          </Tooltip>
                          <Tooltip title="Open edit form">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => setEditRow(row)}
                                disabled={visibleFields.every((f) => !isFormFieldEditable(f, row))}
                              >
                                <EditIcon fontSize="small"/>
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Save inline edits">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => saveInline(row)}
                                disabled={!hasDirty(row)}
                              >
                                <Save fontSize="small"/>
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={visibleFields.length + 1}>No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider/>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" px={2} py={1}>
            <TablePagination
              component="div"
              count={sortedRows.length}
              page={page}
              onPageChange={(e, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5,10,25,50]}
            />
            <Typography variant="caption">Primary key is hidden: {primaryKey}</Typography>
          </Stack>
        </Paper>
      )}

      {/* View */}
      <Dialog open={!!viewRow} onClose={() => setViewRow(null)} maxWidth="md" fullWidth>
        <DialogTitle>View Record</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {visibleFields.map((f) => (
              <Stack key={f.name} direction="row" spacing={2} alignItems="center">
                <Typography sx={{ minWidth: 200, fontWeight: 600 }}>{f.label || f.name}</Typography>
                <Typography>{String(viewRow?.[f.name] ?? "").trim() || "—"}</Typography>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<Close />} onClick={() => setViewRow(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit */}
      <EditModal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        row={editRow}
        primaryKey={primaryKey}
        visibleFields={visibleFields}
        config={config}
        tableName={tableName}
        onRowSaved={(updated) => {
          setRows(prev => prev.map(r => (r[primaryKey] === updated[primaryKey] ? updated : r)));
          setSaveMsg("Record updated.");
        }}
      />
    </Box>
  );
}

/* ---------------- Edit modal ---------------- */
function EditModal({ open, onClose, row, primaryKey, visibleFields, config, tableName, onRowSaved }) {
  const [form, setForm] = useState({});
  const editableFields = useMemo(
    () => visibleFields.filter(f => config[f.name]?.formEditable && evaluateRule(config[f.name]?.condition, row || {})),
    [visibleFields, config, row]
  );

  useEffect(() => {
    if (row) {
      const init = {};
      for (const f of editableFields) init[f.name] = row[f.name] ?? null;
      setForm(init);
    } else setForm({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, editableFields.length]);

  if (!open || !row) return null;

  const onSubmit = async () => {
    const missing = editableFields.filter(
      (f) => config[f.name]?.mandatory && (form[f.name] === null || form[f.name] === "")
    );
    if (missing.length) {
      alert(`Missing mandatory fields: ${missing.map(m => m.label || m.name).join(", ")}`);
      return;
    }

    const PROTECTED = new Set(['created_at', 'created_by', primaryKey]);
    const cleaned = Object.fromEntries(
      Object.entries(form).filter(([k]) => !PROTECTED.has(k))
    );

    try {
      const res = await axios.put(
        `/api/tables/data/${encodeURIComponent(tableName)}/${row[primaryKey]}`,
        { changes: cleaned }
      );
      const updated = res.data?.updated || { ...row, ...cleaned };
      onRowSaved(updated);
      onClose();
    } catch (e) {
      alert("Update failed.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Record</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {editableFields.length === 0 && (<Alert severity="info">No fields are editable under current conditions.</Alert>)}
          {editableFields.map((f) => {
            const Renderer = TYPE_RENDERERS[f.type] || TYPE_RENDERERS.text;
            const mandatory = config[f.name]?.mandatory;
            return (
              <Box key={f.name}>
                <Typography sx={{ mb: 0.5, fontWeight: 600 }}>
                  {f.label || f.name} {mandatory && <Chip size="small" label="mandatory" />}
                </Typography>
                <Renderer
                  value={form[f.name]}
                  onChange={(val) => setForm((prev) => ({ ...prev, [f.name]: val }))}
                  readOnly={false}
                  options={f.options}
                />
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<Close />}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} startIcon={<Save />}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
}



// // src/components/TableCreator.js
// import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
// import axios from "axios";
// import {
//   Box, Paper, Stack, Typography, Divider, Button, IconButton, TextField,
//   MenuItem, Select, FormControl, InputLabel, Checkbox, Dialog, DialogTitle,
//   DialogContent, DialogActions, Table, TableHead, TableRow, TableCell,
//   TableBody, TableContainer, TablePagination, Tooltip, Chip, Alert
// } from "@mui/material";
// import { Save, Close, Edit as EditIcon, Visibility, FilterList, PlayArrow } from "@mui/icons-material";

// /* ---------------- Field renderers ---------------- */
// const TYPE_RENDERERS = {
//   text: ({ value, onChange, readOnly }) => (
//     <TextField size="small" fullWidth value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={readOnly} />
//   ),
//   number: ({ value, onChange, readOnly }) => (
//     <TextField type="number" size="small" fullWidth value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
//   ),
//   date: ({ value, onChange, readOnly }) => (
//     <TextField type="date" size="small" fullWidth value={value ? String(value).slice(0, 10) : ""} onChange={(e) => onChange(e.target.value || null)} disabled={readOnly} />
//   ),
//   select: ({ value, onChange, readOnly, options = [] }) => (
//     <FormControl size="small" fullWidth>
//       <Select value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={readOnly}>
//         {options.map((opt) => (
//           <MenuItem key={String(opt.value ?? opt)} value={opt.value ?? opt}>
//             {opt.label ?? String(opt)}
//           </MenuItem>
//         ))}
//       </Select>
//     </FormControl>
//   ),
// };

// /* ---------------- utils ---------------- */
// function safeGet(obj, path) {
//   try { return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj); }
//   catch { return undefined; }
// }
// function applySort(rows, sort) {
//   if (!sort?.key) return rows;
//   const dir = sort.dir === "desc" ? -1 : 1;
//   return [...rows].sort((a, b) => {
//     const va = a[sort.key], vb = b[sort.key];
//     if (va == null && vb == null) return 0;
//     if (va == null) return -1 * dir;
//     if (vb == null) return 1 * dir;
//     if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
//     return String(va).localeCompare(String(vb)) * dir;
//   });
// }
// function useDebounced(value, delay = 300) {
//   const [v, setV] = useState(value);
//   useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
//   return v;
// }
// function evaluateRule(rule, row) {
//   if (!rule || !rule.left) return true;
//   const left = safeGet(row, rule.left);
//   const right = rule.right;
//   switch (rule.op) {
//     case "==": return String(left) === String(right);
//     case "!=": return String(left) !== String(right);
//     case ">":  return Number(left) >  Number(right);
//     case ">=": return Number(left) >= Number(right);
//     case "<":  return Number(left) <  Number(right);
//     case "<=": return Number(left) <= Number(right);
//     case "includes": return String(left ?? "").includes(String(right));
//     default: return true;
//   }
// }

// /* ---------------- Condition Editor ---------------- */
// function ConditionEditor({ fields, condition, onChange }) {
//   const [rule, setRule] = useState(() => condition || { left: "", op: "==", right: "" });
//   useEffect(() => setRule(condition || { left: "", op: "==", right: "" }), [condition]);
//   const ops = ["==", "!=", ">", ">=", "<", "<=", "includes"];
//   return (
//     <Stack direction="row" spacing={1} alignItems="center">
//       <FormControl size="small" sx={{ minWidth: 140 }}>
//         <InputLabel>Field</InputLabel>
//         <Select label="Field" value={rule.left} onChange={(e) => setRule((r) => ({ ...r, left: e.target.value }))}>
//           {fields.map((f) => (<MenuItem key={f.name} value={f.name}>{f.label || f.name}</MenuItem>))}
//         </Select>
//       </FormControl>
//       <FormControl size="small" sx={{ minWidth: 110 }}>
//         <InputLabel>Op</InputLabel>
//         <Select label="Op" value={rule.op} onChange={(e) => setRule((r) => ({ ...r, op: e.target.value }))}>
//           {ops.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
//         </Select>
//       </FormControl>
//       <TextField size="small" label="Value" value={rule.right} onChange={(e) => setRule((r) => ({ ...r, right: e.target.value }))} />
//       <Button variant="outlined" onClick={() => onChange(rule)}>Set</Button>
//     </Stack>
//   );
// }

// /* ---------------- Small, robust toggle wrapper ---------------- */
// function ToggleCell({ checked, onToggle, disabled }) {
//   return (
//     <Box
//       role="checkbox"
//       aria-checked={!!checked}
//       tabIndex={disabled ? -1 : 0}
//       onClick={(e) => {
//         e.stopPropagation();
//         if (!disabled) onToggle(!checked);
//       }}
//       onKeyDown={(e) => {
//         if (disabled) return;
//         if (e.key === " " || e.key === "Enter") {
//           e.preventDefault();
//           onToggle(!checked);
//         }
//       }}
//       sx={{
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         cursor: disabled ? "not-allowed" : "pointer",
//         px: 0.5,
//         py: 0.25,
//         position: "relative",
//         zIndex: 1,            // sit above any stray overlays
//       }}
//     >
//       {/* Visual only; events handled by wrapper to dodge pointer issues */}
//       <Checkbox
//         checked={!!checked}
//         onChange={() => {}}
//         disableRipple
//         disabled={disabled}
//         sx={{ pointerEvents: "none" }}
//       />
//     </Box>
//   );
// }

// /* ---------------- Defaults ---------------- */
// const DEFAULT_FIELD_CFG = Object.freeze({
//   show: true,
//   inlineEditable: false,
//   formEditable: false,
//   mandatory: false,
//   condition: null,
// });

// /* =================================================================== */
// /*                           MAIN COMPONENT                             */
// /* =================================================================== */
// export default function TableCreator({ reportId, onSaved, onClose }) {
//   const [tables, setTables] = useState([]);
//   const [tableName, setTableName] = useState("");
//   const [schema, setSchema] = useState(null);
//   const [config, setConfig] = useState({});
//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const [reportName, setReportName] = useState("");
//   const [saveReportMsg, setSaveReportMsg] = useState("");

//   const [savedReports, setSavedReports] = useState([]);
//   const [selectedReportId, setSelectedReportId] = useState("");
//   const [pendingConfig, setPendingConfig] = useState(null);

//   const [search, setSearch] = useState("");
//   const debouncedSearch = useDebounced(search, 300);
//   const [sort, setSort] = useState({ key: "", dir: "asc" });
//   const [page, setPage] = useState(0);
//   const [pageSize, setPageSize] = useState(10);

//   const [viewRow, setViewRow] = useState(null);
//   const [editRow, setEditRow] = useState(null);
//   const [inlineEdits, setInlineEdits] = useState({});
//   const [saveMsg, setSaveMsg] = useState("");

//   const [renderRequested, setRenderRequested] = useState(false);

//   const [sanityToggle, setSanityToggle] = useState(false);

//   /* logs */
//   const renderCountRef = useRef(0);
//   useEffect(() => {
//     console.log("%c[RB] TableCreator MOUNT", "color: green");
//     return () => console.log("%c[RB] TableCreator UNMOUNT", "color: red");
//   }, []);
//   useEffect(() => { renderCountRef.current += 1; console.log("[RB] render #", renderCountRef.current); });
//   const prevConfigRef = useRef();
//   useEffect(() => {
//     if (prevConfigRef.current !== config) {
//       try { console.log("[RB] CONFIG CHANGED ->", JSON.parse(JSON.stringify(config))); }
//       catch { console.log("[RB] CONFIG CHANGED"); }
//       prevConfigRef.current = config;
//     }
//   }, [config]);

//   /* derived */
//   const fields = useMemo(() => schema?.fields || [], [schema]);
//   const primaryKey = schema?.primaryKey || "id";
//   const displayFields = useMemo(() => fields.filter((f) => f.name !== primaryKey), [fields, primaryKey]);
//   const visibleFields = useMemo(() => displayFields.filter((f) => config[f.name]?.show), [displayFields, config]);

//   const filteredRows = useMemo(() => {
//     if (!debouncedSearch) return rows;
//     const s = debouncedSearch.toLowerCase();
//     return rows.filter((r) => visibleFields.some((f) => String(r[f.name] ?? "").toLowerCase().includes(s)));
//   }, [rows, debouncedSearch, visibleFields]);

//   const sortedRows = useMemo(() => applySort(filteredRows, sort), [filteredRows, sort]);
//   const pagedRows = useMemo(() => {
//     const start = page * pageSize;
//     return sortedRows.slice(start, start + pageSize);
//   }, [sortedRows, page, pageSize]);

//   /* config updater */
//   const updateFieldCfg = useCallback((name, patch, sourceLabel = "UNKNOWN") => {
//     console.log("[RB] set by", sourceLabel, name, "patch ->", patch);
//     setConfig((c) => {
//       const prev = c?.[name] ?? DEFAULT_FIELD_CFG;
//       const next = { ...prev, ...patch };
//       if (!next.inlineEditable && !next.formEditable && next.mandatory) next.mandatory = false;
//       return { ...c, [name]: next };
//     });
//   }, []);

//   /* hydrate from reportId */
//   useEffect(() => {
//     if (!reportId) return;
//     (async () => {
//       try {
//         const { data: r } = await axios.get(`/api/tables/reports/${reportId}`);
//         setReportName(r.report_name);
//         setTableName(r.table_name);
//         setPendingConfig(r.config);
//         setRenderRequested(false);
//       } catch (e) { console.error(e); }
//     })();
//   }, [reportId]);

//   /* load tables */
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await axios.get("/api/tables", { params: { prefix: "cust_" } });
//         const list = Array.isArray(res.data) ? res.data : [];
//         setTables(list.filter((t) => String(t).startsWith("cust_")));
//       } catch {
//         try {
//           const res2 = await axios.get("/api/tables/list", { params: { prefix: "cust_" } });
//           setTables(Array.isArray(res2.data) ? res2.data : []);
//         } catch (err) {
//           console.error(err);
//           setError("Failed to load tables");
//         }
//       }
//     })();
//   }, []);

//   /* load saved reports when table changes */
//   useEffect(() => {
//     if (!tableName) { setSavedReports([]); setSelectedReportId(""); return; }
//     (async () => {
//       try {
//         const res = await axios.get("/api/tables/reports", { params: { table: tableName } });
//         setSavedReports(res.data || []);
//       } catch (e) { console.error(e); }
//     })();
//   }, [tableName]);

//   /* guard to avoid overwriting toggles */
//   const serverAppliedRef = useRef(false);

//   /* load schema when table changes */
//   useEffect(() => {
//     if (!tableName) return;
//     (async () => {
//       setLoading(true); setError(""); setRows([]); setSchema(null); setRenderRequested(false);
//       try {
//         const res = await axios.get(`/api/tables/schema/${encodeURIComponent(tableName)}`);
//         const sc = res.data;

//         const defaults = {};
//         for (const f of sc.fields) {
//           defaults[f.name] = {
//             show: f.name === sc.primaryKey ? false : true,
//             inlineEditable: false,
//             formEditable: false,
//             mandatory: false,
//             condition: null,
//           };
//         }

//         console.log("[RB] set by SCHEMA LOAD (defaults)");
//         setSchema(sc);
//         setConfig(defaults);
//         serverAppliedRef.current = false;
//       } catch (e) {
//         console.error(e);
//         setError("Failed to load schema");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [tableName]);

//   /* apply pending server config once after schema */
//   useEffect(() => {
//     if (!schema || !pendingConfig || serverAppliedRef.current) return;
//     console.log("[RB] set by PENDING CONFIG (server merge)");
//     setConfig((prev) => {
//       const merged = { ...prev };
//       for (const k of Object.keys(pendingConfig)) {
//         merged[k] = { ...(merged[k] ?? DEFAULT_FIELD_CFG), ...pendingConfig[k] };
//       }
//       return merged;
//     });
//     serverAppliedRef.current = true;
//     setPendingConfig(null);
//   }, [schema, pendingConfig]);

//   /* load data when rendering */
//   useEffect(() => {
//     if (!schema || !tableName || !renderRequested) return;
//     const visibleNames = visibleFields.map((f) => f.name);
//     (async () => {
//       setLoading(true); setError("");
//       try {
//         const fieldsToFetch = Array.from(new Set([primaryKey, ...visibleNames]));
//         console.log("[RB] DATA FETCH fields:", fieldsToFetch);
//         const res = await axios.get(
//           `/api/tables/data/${encodeURIComponent(tableName)}`,
//           { params: { fields: fieldsToFetch.join(",") } }
//         );
//         setRows(res.data || []); setPage(0);
//       } catch (e) { console.error(e); setError("Failed to load data"); }
//       finally { setLoading(false); }
//     })();
//   }, [schema, tableName, renderRequested, visibleFields, primaryKey]);

//   /* helpers */
//   // treat these as not client-updatable
// const isProtected = (k) =>
//   k === primaryKey || k === "created_at" || k === "created_by";

// // enable Save only if a non-protected field actually changed
// const hasDirty = React.useCallback((row) => {
//   const edits = inlineEdits[row[primaryKey]];
//   if (!edits) return false;
//   return Object.keys(edits).some((k) => !isProtected(k) && edits[k] !== row[k]);
// }, [inlineEdits, primaryKey]);


// //   const hasDirty = (row) => {
// //   const edits = inlineEdits[row[primaryKey]];
// //   if (!edits) return false;
// //   // enable only if something actually changed
// //   return Object.keys(edits).some((k) => edits[k] !== row[k]);
// // };


//   const toggleSort = (key) => {
//     setSort((s) => (s.key !== key ? { key, dir: "asc" } : { key, dir: s.dir === "asc" ? "desc" : "asc" }));
//   };
//   const startInline = (rowId) => setInlineEdits((prev) => ({ ...prev, [rowId]: prev[rowId] || {} }));
//   const setInlineCell = (rowId, field, value) => {
//     setInlineEdits((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] || {}), [field]: value } }));
//   };

//   async function loadReport(id) {
//     try {
//       const res = await axios.get(`/api/tables/reports/${id}`);
//       const r = res.data;
//       setReportName(r.report_name);
//       setTableName(r.table_name);
//       setPendingConfig(r.config);
//       setRenderRequested(false);
//     } catch (err) { console.error(err); setError("Failed to load report"); }
//   }

//   async function saveInline(row) {
//   const edits = inlineEdits[row[primaryKey]] || {};

//   // strip protected fields on the client (you should also strip on server)
//   const cleaned = Object.fromEntries(
//     Object.entries(edits).filter(([k]) => !isProtected(k))
//   );

//   // nothing to save?
//   if (!Object.keys(cleaned).length) {
//     setSaveMsg("No valid changes to save.");
//     return;
//   }

//   // enforce mandatory only for fields being changed
//   const missing = Object.entries(config)
//     .filter(([k, v]) => v?.mandatory && k in cleaned && (cleaned[k] === null || cleaned[k] === ""))
//     .map(([k]) => k);

//   if (missing.length) {
//     setSaveMsg(`Missing mandatory fields: ${missing.join(", ")}`);
//     return;
//   }

//   try {
//     const res = await axios.put(
//       `/api/tables/data/${encodeURIComponent(tableName)}/${row[primaryKey]}`,
//       { changes: cleaned }
//     );
//     const updated = res.data?.updated || { ...row, ...cleaned };
//     setRows((prev) => prev.map((r) => (r[primaryKey] === row[primaryKey] ? updated : r)));
//     setInlineEdits((prev) => ({ ...prev, [row[primaryKey]]: {} }));
//     setSaveMsg("Row saved.");
//   } catch (e) {
//     console.error(e);
//     setSaveMsg("Save failed.");
//   }
// }


//   function isInlineCellEditable(field, row) {
//     const cfg = config[field.name];
//     if (!cfg?.inlineEditable) return false;
//     return evaluateRule(cfg.condition, row);
//   }
//   function isFormFieldEditable(field, row) {
//     const cfg = config[field.name];
//     if (!cfg?.formEditable) return false;
//     return evaluateRule(cfg.condition, row);
//   }

//   async function handleSaveReport() {
//     if (!reportName.trim() || !tableName) {
//       setSaveReportMsg("Please enter report name and select a table."); return;
//     }
//     try {
//       const res = await axios.post("/api/tables/reports", { name: reportName.trim(), table: tableName, config });
//       setSaveReportMsg(`Report saved. ID: ${res.data?.reportId || "unknown"}`);
//       const list = await axios.get("/api/tables/reports", { params: { table: tableName } });
//       setSavedReports(list.data || []);
//       onSaved?.();
//     } catch (e) { console.error(e); setSaveReportMsg("Failed to save report."); }
//   }

//   const renderReport = () => setRenderRequested(true);

//   /* render */
//   return (
//     <Box p={2}>
//       <Typography variant="h6" gutterBottom>Dynamic Report Builder</Typography>

//       <div style={{border:'1px dashed #999', padding:4, margin:'8px 0'}}>
//         <Typography variant="caption">Sanity toggle (isolated):</Typography>
//         <Checkbox
//           checked={sanityToggle}
//           onChange={(_, ch) => { console.log("[RB] SANITY TOGGLE ->", ch); setSanityToggle(ch); }}
//         />
//       </div>

//       <Paper sx={{ p: 2, mb: 2 }}>
//         <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
//           <FormControl size="small" sx={{ minWidth: 240 }}>
//             <InputLabel>Table (cust_*)</InputLabel>
//             <Select label="Table (cust_*)" value={tableName} onChange={(e) => setTableName(e.target.value)}>
//               {tables.map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
//             </Select>
//           </FormControl>

//           <TextField size="small" label="Report Name" value={reportName} onChange={(e) => setReportName(e.target.value)} sx={{ maxWidth: 260 }} />

//           <FormControl size="small" sx={{ minWidth: 220 }}>
//             <InputLabel>Saved Reports</InputLabel>
//             <Select
//               label="Saved Reports"
//               value={selectedReportId}
//               onChange={async (e) => {
//                 const id = e.target.value;
//                 setSelectedReportId(id);
//                 if (id) await loadReport(id);
//               }}
//               displayEmpty
//               renderValue={(val) => {
//                 const r = savedReports.find(x => String(x.id) === String(val));
//                 return r ? r.report_name : "Saved Reports";
//               }}
//             >
//               <MenuItem value=""><em>None</em></MenuItem>
//               {savedReports.map(r => (<MenuItem key={r.id} value={r.id}>{r.report_name}</MenuItem>))}
//             </Select>
//           </FormControl>

//           <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ endAdornment: <FilterList fontSize="small" /> }} sx={{ maxWidth: 300 }} />

//           <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
//             <Tooltip title="Save report configuration">
//               <Button variant="contained" onClick={handleSaveReport}>Save Configuration</Button>
//             </Tooltip>
//             <Tooltip title="Render report with current selection">
//               <Button variant="outlined" startIcon={<PlayArrow/>} onClick={renderReport}>Render Report</Button>
//             </Tooltip>
//             {onClose && (
//               <Tooltip title="Close">
//                 <Button variant="text" startIcon={<Close />} onClick={onClose}>Close</Button>
//               </Tooltip>
//             )}
//           </Stack>
//         </Stack>

//         {schema && (
//           <Box mt={3}>
//             <Typography variant="subtitle1" gutterBottom>Schema Preview</Typography>
//             <Paper variant="outlined">
//               <Table size="small">
//                 <TableHead>
//                   <TableRow>
//                     <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
//                     <TableCell sx={{ fontWeight: 700 }}>Label</TableCell>
//                     <TableCell sx={{ fontWeight: 700 }}>UI Type</TableCell>
//                     <TableCell sx={{ fontWeight: 700 }}>Nullable</TableCell>
//                     <TableCell sx={{ fontWeight: 700 }}>Max Length</TableCell>
//                     <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Select</TableCell>
//                     <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Mandatory</TableCell>
//                     <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Inline Editable</TableCell>
//                     <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Form Editable</TableCell>
//                     <TableCell sx={{ fontWeight: 700 }}>Edit Condition</TableCell>
//                   </TableRow>
//                 </TableHead>
//                 <TableBody>
//                   {displayFields.map((f) => {
//                     const cfg = config[f.name] ?? DEFAULT_FIELD_CFG;
//                     const mandatoryDisabled = !(cfg.inlineEditable || cfg.formEditable);
//                     return (
//                       <TableRow key={f.name}>
//                         <TableCell>{f.name}</TableCell>
//                         <TableCell>{f.label}</TableCell>
//                         <TableCell>{f.type}</TableCell>
//                         <TableCell>{f.nullable ? 'YES' : 'NO'}</TableCell>
//                         <TableCell>{f.maxLength ?? '—'}</TableCell>

//                         {/* Show */}
//                         <TableCell align="center">
//                           <ToggleCell
//                             checked={!!cfg.show}
//                             onToggle={(ch) => updateFieldCfg(f.name, { show: ch }, "TOGGLE")}
//                             disabled={false}
//                           />
//                         </TableCell>

//                         {/* Mandatory */}
//                         <TableCell align="center">
//                           <ToggleCell
//                             checked={!!cfg.mandatory}
//                             onToggle={(ch) => updateFieldCfg(f.name, { mandatory: ch }, "TOGGLE")}
//                             disabled={mandatoryDisabled}
//                           />
//                         </TableCell>

//                         {/* Inline editable */}
//                         <TableCell align="center">
//                           <ToggleCell
//                             checked={!!cfg.inlineEditable}
//                             onToggle={(ch) => updateFieldCfg(f.name, { inlineEditable: ch }, "TOGGLE")}
//                             disabled={false}
//                           />
//                         </TableCell>

//                         {/* Form editable */}
//                         <TableCell align="center">
//                           <ToggleCell
//                             checked={!!cfg.formEditable}
//                             onToggle={(ch) => updateFieldCfg(f.name, { formEditable: ch }, "TOGGLE")}
//                             disabled={false}
//                           />
//                         </TableCell>

//                         <TableCell sx={{ verticalAlign: 'top' }}>
//                           <Stack direction="row" spacing={1} alignItems="center">
//                             <ConditionEditor
//                               fields={displayFields}
//                               condition={cfg.condition}
//                               onChange={(cond) => updateFieldCfg(f.name, { condition: cond }, "CONDITION")}
//                             />
//                             {cfg.condition && <Chip size="small" label="has condition" />}
//                           </Stack>
//                         </TableCell>
//                       </TableRow>
//                     );
//                   })}
//                 </TableBody>
//               </Table>
//             </Paper>
//           </Box>
//         )}
//       </Paper>

//       {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
//       {saveReportMsg && <Alert severity="success" onClose={() => setSaveReportMsg("")} sx={{ mb: 2 }}>{saveReportMsg}</Alert>}
//       {saveMsg && <Alert severity="info" onClose={() => setSaveMsg("") } sx={{ mb: 2 }}>{saveMsg}</Alert>}

//       {renderRequested && (
//         <Paper>
//           <TableContainer>
//             <Table size="small">
//               <TableHead>
//                 <TableRow>
//                   {visibleFields.map((f) => (
//                     <TableCell
//                       key={f.name}
//                       onClick={() => toggleSort(f.name)}
//                       sx={{ cursor: "pointer", whiteSpace: "nowrap" }}
//                     >
//                       <Stack direction="row" spacing={1} alignItems="center">
//                         <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.label || f.name}</Typography>
//                         {sort.key === f.name && <Chip size="small" label={sort.dir} />}
//                       </Stack>
//                     </TableCell>
//                   ))}
//                   <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>Actions</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {loading ? (
//                   <TableRow><TableCell colSpan={visibleFields.length + 1}>Loading…</TableCell></TableRow>
//                 ) : pagedRows.length ? (
//                   pagedRows.map((row) => (
//                     <TableRow key={row[primaryKey] ?? JSON.stringify(row)}>
//                       {visibleFields.map((f) => {
//                         const Renderer = TYPE_RENDERERS[f.type] || TYPE_RENDERERS.text;
//                         const rowId = row[primaryKey];
//                         const pending = inlineEdits[rowId]?.[f.name];
//                         const value = pending !== undefined ? pending : row[f.name];
//                         const editable = isInlineCellEditable(f, row);
//                         return (
//                           <TableCell key={f.name} onDoubleClick={() => editable && startInline(rowId)}>
//                             {editable ? (
//                               <Renderer value={value} onChange={(val) => setInlineCell(rowId, f.name, val)} readOnly={false} options={f.options}/>
//                             ) : (
//                               <Typography variant="body2">{String(value ?? "").trim() || "—"}</Typography>
//                             )}
//                           </TableCell>
//                         );
//                       })}
//                       <TableCell align="right">
//                         <Stack direction="row" spacing={1} justifyContent="flex-end">
//                           <Tooltip title="View">
//                             <IconButton size="small" onClick={() => setViewRow(row)}><Visibility fontSize="small"/></IconButton>
//                           </Tooltip>
//                           <Tooltip title="Open edit form">
//                             <span>
//                               <IconButton
//                                 size="small"
//                                 onClick={() => setEditRow(row)}
//                                 disabled={visibleFields.every((f) => !isFormFieldEditable(f, row))}
//                               >
//                                 <EditIcon fontSize="small"/>
//                               </IconButton>
//                             </span>
//                           </Tooltip>
//                           <Tooltip title="Save inline edits">
//                             <span>
//                               <IconButton
//                                 size="small"
//                                 color="primary"
//                                 onClick={() => saveInline(row)}
//                                 //disabled={!Object.keys(inlineEdits[row[primaryKey]] || {}).length}
//                                 disabled={!hasDirty(row)}
//                               >
//                                 <Save fontSize="small"/>
//                               </IconButton>
//                             </span>
//                           </Tooltip>
//                         </Stack>
//                       </TableCell>
//                     </TableRow>
//                   ))
//                 ) : (
//                   <TableRow><TableCell colSpan={visibleFields.length + 1}>No data</TableCell></TableRow>
//                 )}
//               </TableBody>
//             </Table>
//           </TableContainer>
//           <Divider/>
//           <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" px={2} py={1}>
//             <TablePagination
//               component="div"
//               count={sortedRows.length}
//               page={page}
//               onPageChange={(e, p) => setPage(p)}
//               rowsPerPage={pageSize}
//               onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
//               rowsPerPageOptions={[5,10,25,50]}
//             />
//             <Typography variant="caption">Primary key is hidden: {primaryKey}</Typography>
//           </Stack>
//         </Paper>
//       )}

//       {/* View */}
//       <Dialog open={!!viewRow} onClose={() => setViewRow(null)} maxWidth="md" fullWidth>
//         <DialogTitle>View Record</DialogTitle>
//         <DialogContent dividers>
//           <Stack spacing={2}>
//             {visibleFields.map((f) => (
//               <Stack key={f.name} direction="row" spacing={2} alignItems="center">
//                 <Typography sx={{ minWidth: 200, fontWeight: 600 }}>{f.label || f.name}</Typography>
//                 <Typography>{String(viewRow?.[f.name] ?? "").trim() || "—"}</Typography>
//               </Stack>
//             ))}
//           </Stack>
//         </DialogContent>
//         <DialogActions>
//           <Button startIcon={<Close />} onClick={() => setViewRow(null)}>Close</Button>
//         </DialogActions>
//       </Dialog>

//       {/* Edit */}
//       <EditModal
//         open={!!editRow}
//         onClose={() => setEditRow(null)}
//         row={editRow}
//         primaryKey={primaryKey}
//         visibleFields={visibleFields}
//         config={config}
//         tableName={tableName}
//         onRowSaved={(updated) => {
//           setRows(prev => prev.map(r => (r[primaryKey] === updated[primaryKey] ? updated : r)));
//           setSaveMsg("Record updated.");
//         }}
//       />
//     </Box>
//   );
// }

// /* ---------------- Edit modal ---------------- */
// function EditModal({ open, onClose, row, primaryKey, visibleFields, config, tableName, onRowSaved }) {
//   const [form, setForm] = useState({});
//   const editableFields = useMemo(
//     () => visibleFields.filter(f => config[f.name]?.formEditable && evaluateRule(config[f.name]?.condition, row || {})),
//     [visibleFields, config, row]
//   );

//   useEffect(() => {
//     if (row) {
//       const init = {};
//       for (const f of editableFields) init[f.name] = row[f.name] ?? null;
//       setForm(init);
//     } else setForm({});
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [row, editableFields.length]);

//   if (!open || !row) return null;

//  const onSubmit = async () => {
//   const missing = editableFields.filter(
//     (f) => config[f.name]?.mandatory && (form[f.name] === null || form[f.name] === "")
//   );
//   if (missing.length) {
//     alert(`Missing mandatory fields: ${missing.map(m => m.label || m.name).join(", ")}`);
//     return;
//   }

//   const PROTECTED = new Set(['created_at', 'created_by', primaryKey]);
//   const cleaned = Object.fromEntries(
//     Object.entries(form).filter(([k]) => !PROTECTED.has(k))
//   );

//   try {
//     const res = await axios.put(
//       `/api/tables/data/${encodeURIComponent(tableName)}/${row[primaryKey]}`,
//       { changes: cleaned }
//     );
//     const updated = res.data?.updated || { ...row, ...cleaned };
//     onRowSaved(updated);
//     onClose();
//   } catch (e) {
//     console.error(e);
//     alert("Update failed.");
//   }
// };


//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
//       <DialogTitle>Edit Record</DialogTitle>
//       <DialogContent dividers>
//         <Stack spacing={2}>
//           {editableFields.length === 0 && (<Alert severity="info">No fields are editable under current conditions.</Alert>)}
//           {editableFields.map((f) => {
//             const Renderer = TYPE_RENDERERS[f.type] || TYPE_RENDERERS.text;
//             const mandatory = config[f.name]?.mandatory;
//             return (
//               <Box key={f.name}>
//                 <Typography sx={{ mb: 0.5, fontWeight: 600 }}>
//                   {f.label || f.name} {mandatory && <Chip size="small" label="mandatory" />}
//                 </Typography>
//                 <Renderer
//                   value={form[f.name]}
//                   onChange={(val) => setForm((prev) => ({ ...prev, [f.name]: val }))}
//                   readOnly={false}
//                   options={f.options}
//                 />
//               </Box>
//             );
//           })}
//         </Stack>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} startIcon={<Close />}>Cancel</Button>
//         <Button variant="contained" onClick={onSubmit} startIcon={<Save />}>Submit</Button>
//       </DialogActions>
//     </Dialog>
//   );
// }
