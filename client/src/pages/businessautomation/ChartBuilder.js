// src/components/ChartBuilder.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Stack, Grid, Paper, Typography, TextField, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, InputLabel, InputAdornment, FormControl, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButtonGroup, ToggleButton, Card, CardContent, CardActions, Chip, Divider
} from "@mui/material";
import ArrowDropDownRounded from "@mui/icons-material/ArrowDropDownRounded";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import RadarIcon from "@mui/icons-material/Radar";
import ScatterPlotIcon from "@mui/icons-material/ScatterPlot";
import AddCircleOutline from "@mui/icons-material/AddCircleOutline";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import PreviewIcon from "@mui/icons-material/Preview";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../../services/api";

// (Renderer used in modals)
import ChartRenderer from "./ChartRenderer";

/* ---------- Chart types ---------- */
const CHART_TYPES = [
  { key: "bar", label: "Bar", icon: <BarChartIcon fontSize="large" /> },
  { key: "line", label: "Line", icon: <ShowChartIcon fontSize="large" /> },
  { key: "area", label: "Area", icon: <ShowChartIcon fontSize="large" /> },
  { key: "pie", label: "Pie", icon: <PieChartIcon fontSize="large" /> },
  { key: "radar", label: "Radar", icon: <RadarIcon fontSize="large" /> },
  { key: "scatter", label: "Scatter", icon: <ScatterPlotIcon fontSize="large" /> },
];

/* ---------- Helpers for column typing ---------- */
const isTextLike = (c) =>
  ["text","character varying","varchar","bpchar","citext","json","jsonb"]
    .includes((c.udt_name || c.data_type || "").toLowerCase())
  || (c.data_type || "").toLowerCase().includes("text");

const isNumericLike = (c) => {
  const t = (c.udt_name || c.data_type || "").toLowerCase();
  return ["int2","int4","int8","float4","float8","numeric","money","decimal","double precision","real","serial","bigserial"]
    .some(x => t.includes(x));
};

const isDateLike = (c) => {
  const t = (c.udt_name || c.data_type || "").toLowerCase();
  return t.includes("date") || t.includes("time");
};

const defaultSeriesItem = (idx=1) => ({
  label: `Series ${idx}`,
  valueField: "",
  color: "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6,"0"),
});

const truncate = (s, n=50) => (s || "").length > n ? (s || "").slice(0, n-1) + "…" : (s || "");

/* ---------- Component ---------- */
export default function ChartBuilder() {
  const [chartName, setChartName] = useState("");
  const [chartDesc, setChartDesc] = useState("");
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [chartType, setChartType] = useState(null);

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [columns, setColumns] = useState([]);

  // mappings
  const [categoryField, setCategoryField] = useState("");
  const [valueField, setValueField] = useState("");
  const [xField, setXField] = useState("");
  const [yField, setYField] = useState("");
  const [series, setSeries] = useState([defaultSeriesItem(1)]);

  // preview
  const [preview, setPreview] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  // saved charts
  const [savedCharts, setSavedCharts] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listMode, setListMode] = useState("table");

  // view/edit
  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [viewData, setViewData] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  /* ----- data loading ----- */
  useEffect(() => { (async () => {
    try { const { data } = await api.get("/db/tables"); setTables(data || []); }
    catch(e){ console.error(e); }
  })(); }, []);

  useEffect(() => {
    setColumns([]);
    if (!selectedTable) return;
    (async () => {
      try {
        const { data } = await api.get("/db/columns", { params: { table: selectedTable } });
        setColumns(data || []);
      } catch (e) { console.error(e); }
    })();
  }, [selectedTable]);

  const textCols  = useMemo(() => columns.filter(isTextLike), [columns]);
  const numericCols = useMemo(() => columns.filter(isNumericLike), [columns]);
  const dateCols  = useMemo(() => columns.filter(isDateLike), [columns]);
  const categoryCandidates = useMemo(() => [...textCols, ...dateCols], [textCols, dateCols]);

  const canPreview = useMemo(() => {
    if (!chartType || !selectedTable) return false;
    switch (chartType) {
      case "pie":     return categoryField && valueField;
      case "scatter": return xField && yField;
      case "bar":
      case "line":
      case "area":
      case "radar":   return categoryField && series.every(s => s.valueField);
      default:        return false;
    }
  }, [chartType, selectedTable, categoryField, valueField, xField, yField, series]);

  const handlePickType = (key) => { setChartType(key); resetMappingsForType(key); setTypeModalOpen(false); };
  const resetMappingsForType = (key) => {
    setCategoryField(""); setValueField(""); setXField(""); setYField("");
    if (["bar","line","area","radar"].includes(key)) setSeries([defaultSeriesItem(1)]); else setSeries([]);
    setPreview([]);
  };
  const addSeries = () => setSeries(p => [...p, defaultSeriesItem(p.length+1)]);
  const removeSeries = (idx) => setSeries(p => p.filter((_,i)=>i!==idx));
  const updateSeries = (idx, patch) => setSeries(p => p.map((s,i)=> i===idx ? {...s, ...patch} : s));

  /* ----- preview ----- */
  const requestPreview = async () => {
    if (!canPreview) return;
    setLoadingPreview(true);
    try {
      const cols = new Set();
      if (categoryField) cols.add(categoryField);
      if (valueField) cols.add(valueField);
      if (xField) cols.add(xField);
      if (yField) cols.add(yField);
      series.forEach(s => s.valueField && cols.add(s.valueField));
      const { data } = await api.get("/db/preview", {
        params: { table: selectedTable, columns: Array.from(cols).join(","), limit: 100 }
      });
      setPreview(data || []);
      setPreviewOpen(true);
    } catch (e) { console.error(e); }
    finally { setLoadingPreview(false); }
  };

  const buildConfigJSON = () => ({
    version: 1,
    type: chartType,
    source: { table: selectedTable },
    mapping: {
      categoryField: categoryField || null,
      valueField: valueField || null,
      xField: xField || null,
      yField: yField || null,
      series: series.map(s => ({ label: s.label, valueField: s.valueField, color: s.color }))
    },
    options: { legend: true, tooltip: true }
  });

  const handleSave = async () => {
    const payload = {
      chart_name: chartName.trim(),
      chart_description: chartDesc.trim(),
      chart_config_json: buildConfigJSON()
    };
    if (!payload.chart_name) { alert("Chart Name is required"); return; }
    if (!chartType || !selectedTable) { alert("Select chart type and table"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/chart-configs", payload);
      alert(`Saved! ID: ${data.id}`);
      await loadSavedCharts();
    } catch (e) { console.error(e); alert("Save failed"); }
    finally { setSaving(false); }
  };

  /* ----- small helpers ----- */
  const FieldSelect = ({ label, value, onChange, items }) => (
    <FormControl size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={(e)=>onChange(e.target.value)}>
        {items.map(c => <MenuItem key={c.column_name} value={c.column_name}>{c.column_name}</MenuItem>)}
      </Select>
    </FormControl>
  );

  const renderTypeSpecificForm = () => {
    if (!chartType) return null;
    if (["bar","line","area","radar"].includes(chartType)) {
      return (
        <Stack spacing={2}>
          <FieldSelect label="Category (X-Axis)" value={categoryField} onChange={setCategoryField} items={categoryCandidates} />
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle1">Series</Typography>
              <Button startIcon={<AddCircleOutline />} onClick={addSeries} size="small">Add Series</Button>
            </Stack>
            <Stack spacing={1}>
              {series.map((s, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p:1.5 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={4}>
                      <TextField size="small" fullWidth label="Legend Name"
                        value={s.label} onChange={(e)=>updateSeries(idx,{label:e.target.value})}/>
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <FieldSelect label="Value Field (number)" value={s.valueField}
                        onChange={(val)=>updateSeries(idx,{valueField:val})} items={numericCols}/>
                    </Grid>
                    <Grid item xs={10} md={2}>
                      <TextField size="small" fullWidth label="Color" type="color" value={s.color}
                        onChange={(e)=>updateSeries(idx,{color:e.target.value})}
                        InputProps={{ startAdornment:
                          <InputAdornment position="start"><ColorLensIcon fontSize="small"/></InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={2} md={1} display="flex" alignItems="center" justifyContent="flex-end">
                      {series.length>1 && <IconButton onClick={()=>removeSeries(idx)}><DeleteOutline/></IconButton>}
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Stack>
      );
    }
    if (chartType==="pie") {
      return (
        <Stack spacing={2}>
          <FieldSelect label="Category (Slice label)" value={categoryField} onChange={setCategoryField} items={categoryCandidates}/>
          <FieldSelect label="Value (Slice size, number)" value={valueField} onChange={setValueField} items={numericCols}/>
        </Stack>
      );
    }
    if (chartType==="scatter") {
      return (
        <Stack spacing={2}>
          <FieldSelect label="X Field (number)" value={xField} onChange={setXField} items={numericCols}/>
          <FieldSelect label="Y Field (number)" value={yField} onChange={setYField} items={numericCols}/>
        </Stack>
      );
    }
    return null;
  };

  /* ----- saved list ----- */
  const loadSavedCharts = async () => {
    setListLoading(true);
    try { const { data } = await api.get("/chart-configs"); setSavedCharts(data || []); }
    catch (e) { console.error(e); }
    finally { setListLoading(false); }
  };
  useEffect(() => { loadSavedCharts(); }, []);

  const columnsNeededFromConfig = (cfg) => {
    const { type, mapping={} } = cfg || {};
    const cols = new Set();
    if (mapping.categoryField) cols.add(mapping.categoryField);
    if (type==="pie" && mapping.valueField) cols.add(mapping.valueField);
    if (type==="scatter") { if (mapping.xField) cols.add(mapping.xField); if (mapping.yField) cols.add(mapping.yField); }
    if (["bar","line","area","radar"].includes(type)) (mapping.series||[]).forEach(s => s?.valueField && cols.add(s.valueField));
    return Array.from(cols);
  };

  const fetchSampleDataForConfig = async (cfg) => {
    try {
      const table = cfg?.source?.table; if (!table) return [];
      const cols = columnsNeededFromConfig(cfg);
      const { data } = await api.get("/db/preview", { params: { table, columns: cols.join(","), limit: 100 }});
      return data || [];
    } catch (e) { console.error(e); return []; }
  };

  const openViewModal = async (row) => {
    setViewRow(row); setViewData([]); setViewOpen(true);
    const sample = await fetchSampleDataForConfig(row.chart_config_json); setViewData(sample);
  };

  const openEditModal = (row) => {
    setEditRow(row); setEditName(row.chart_name || ""); setEditDesc(row.chart_description || ""); setEditOpen(true);
  };

  const saveEditQuick = async () => {
    try {
      await api.put(`/chart-configs/${editRow.id}`, { chart_name: editName.trim(), chart_description: editDesc.trim() });
      setEditOpen(false); await loadSavedCharts();
    } catch (e) { console.error(e); alert("Update failed"); }
  };

  const deleteRow = async (row) => {
    if (!window.confirm(`Delete "${row.chart_name}"?`)) return;
    try { await api.delete(`/chart-configs/${row.id}`); await loadSavedCharts(); }
    catch (e) { console.error(e); alert("Delete failed"); }
  };

  const loadIntoBuilder = (row) => {
    const cfg = row.chart_config_json || {};
    setChartName(row.chart_name || ""); setChartDesc(row.chart_description || "");
    setChartType(cfg.type || null); setSelectedTable(cfg?.source?.table || "");
    setCategoryField(cfg?.mapping?.categoryField || ""); setValueField(cfg?.mapping?.valueField || "");
    setXField(cfg?.mapping?.xField || ""); setYField(cfg?.mapping?.yField || "");
    setSeries((cfg?.mapping?.series || []).length ? cfg.mapping.series : [defaultSeriesItem(1)]);
    setEditOpen(false); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ----- Legend-styled fieldset for right box ----- */
  const Fieldset = ({ label, children }) => (
    <Box component="fieldset" sx={{
      m: 0, p: 2, pt: 1.5, borderRadius: 2,
      borderColor: "divider", borderWidth: 1, borderStyle: "solid",
      bgcolor: "background.paper",
    }}>
      <Box component="legend" sx={{ px: 1.25, ml: 1, fontSize: 12, color: "text.secondary" }}>
        {label}
      </Box>
      {children}
    </Box>
  );

  /* ----- Render ----- */
  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Chart Builder</Typography>

      {/* === TOP PANEL: LEFT form + RIGHT Field Mapping (two real columns) === */}
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2 }}>
            {/* Use CSS Grid to guarantee 5/12 | 7/12 columns */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" },
                gap: 2,
                alignItems: "start",
              }}
            >
              {/* LEFT column */}
              <Box>
                <Grid container columnSpacing={2} rowSpacing={1.5}>
                  {/* Row 1 — Chart Name | Chart Type */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Chart Name *"
                      value={chartName}
                      onChange={(e) => setChartName(e.target.value)}
                      fullWidth size="small" variant="outlined" InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Tooltip title="Click to choose a chart type">
                      <TextField
                        label="Chart Type"
                        value={chartType ? CHART_TYPES.find(t => t.key === chartType)?.label : ""}
                        fullWidth size="small" variant="outlined" InputLabelProps={{ shrink: true }}
                        onClick={() => setTypeModalOpen(true)}
                        InputProps={{
                          readOnly: true,
                          sx: { cursor: "pointer" },
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" edge="end" tabIndex={-1} onClick={() => setTypeModalOpen(true)}>
                                <ArrowDropDownRounded />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Tooltip>
                  </Grid>

                  {/* Row 2 — Description | Table */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Description"
                      value={chartDesc}
                      onChange={(e) => setChartDesc(e.target.value)}
                      fullWidth size="small" variant="outlined" InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl size="small" fullWidth variant="outlined">
                      <InputLabel shrink>Table</InputLabel>
                      <Select
                        label="Table"
                        value={selectedTable}
                        onChange={(e) => { setSelectedTable(e.target.value); setPreview([]); }}
                      >
                        {tables.map((t) => (
                          <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Row 3 — Buttons */}
                  <Grid item xs={12} md={6}>
                    <Stack direction="row" spacing={1.5}>
                      <Button
                        variant="outlined" startIcon={<PreviewIcon />} size="small"
                        disabled={!canPreview || loadingPreview} onClick={requestPreview}
                        sx={{ borderRadius: "999px", px: 2.5 }}
                      >
                        
                        {loadingPreview ? "Loading..." : "Preview"}
                      </Button>
                      <Button
                        variant="contained" startIcon={<SaveIcon />} size="small"
                        onClick={handleSave} disabled={saving}
                        sx={{ borderRadius: "999px", px: 2.5 }}
                      >
                        {saving ? "Saving..." : "Save Config"}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>

              {/* RIGHT column — Field Mapping box */}
              <Box component="fieldset" sx={{
                m: 0, p: 2, pt: 1.5, borderRadius: 2,
                borderColor: "divider", borderWidth: 1, borderStyle: "solid",
                bgcolor: "background.paper", minWidth: 0  // prevent overflow
              }}>
                <Box component="legend" sx={{ px: 1.25, ml: 1, fontSize: 12, color: "text.secondary" }}>
                  Field Mapping
                </Box>
                <Stack spacing={2}>
                  {renderTypeSpecificForm()}
                </Stack>
              </Box>
            </Box>
          </Paper>


      {/* === SAVED CHARTS === */}
      <Paper variant="outlined" sx={{ p:2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">Saved Charts</Typography>
          <ToggleButtonGroup size="small" exclusive value={listMode} onChange={(_,v)=> v && setListMode(v)}>
            <ToggleButton value="table">TABLE</ToggleButton>
            <ToggleButton value="cards">CARDS</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Divider sx={{ mb:2 }} />
        {listMode === "table" ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Chart name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Modified by</TableCell>
                  <TableCell>Modified at</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(savedCharts || []).map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.chart_name}</TableCell>
                    <TableCell>{truncate(r.chart_description, 50)}</TableCell>
                    <TableCell>{r.modified_by ?? "—"}</TableCell>
                    <TableCell>{r.modified_at ? new Date(r.modified_at).toLocaleString() : "—"}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View"><IconButton onClick={()=>openViewModal(r)}><VisibilityIcon/></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton onClick={()=>openEditModal(r)}><EditIcon/></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton onClick={()=>deleteRow(r)}><DeleteIcon/></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!listLoading && (!savedCharts || savedCharts.length === 0) && (
                  <TableRow><TableCell colSpan={5} align="center">No saved charts yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Grid container spacing={2}>
            {(savedCharts || []).map((r) => (
              <Grid item xs={12} md={6} lg={4} key={r.id}>
                <Card variant="outlined" sx={{ height:"100%", display:"flex", flexDirection:"column" }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{r.chart_name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {truncate(r.chart_description, 50)}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={`Modified: ${r.modified_at ? new Date(r.modified_at).toLocaleString() : "—"}`} />
                      <Chip size="small" label={`By: ${r.modified_by ?? "—"}`} />
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ mt: "auto", pt: 0, pb: 1, px: 2, justifyContent: "flex-end" }}>
                    <Button size="small" startIcon={<VisibilityIcon/>} onClick={()=>openViewModal(r)}>View</Button>
                    <Button size="small" startIcon={<EditIcon/>} onClick={()=>openEditModal(r)}>Edit</Button>
                    <Button size="small" color="error" startIcon={<DeleteIcon/>} onClick={()=>deleteRow(r)}>Delete</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {!listLoading && (!savedCharts || savedCharts.length === 0) && (
              <Grid item xs={12}><Typography align="center">No saved charts yet</Typography></Grid>
            )}
          </Grid>
        )}
      </Paper>

      {/* === Modals (unchanged) === */}
      <Dialog open={typeModalOpen} onClose={()=>setTypeModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select a Chart Type</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {CHART_TYPES.map(ct => (
              <Grid item xs={6} key={ct.key}>
                <Paper onClick={()=>handlePickType(ct.key)} sx={{
                  p:2, cursor:"pointer", display:"grid", placeItems:"center", gap:1,
                  border: theme => `1px solid ${theme.palette.divider}`, "&:hover": { boxShadow: 3 }
                }}>
                  {ct.icon}
                  <Typography>{ct.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={()=>setTypeModalOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={previewOpen} onClose={()=>setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{chartName || "Preview"} {chartType ? `· ${chartType.toUpperCase()}` : ""}</DialogTitle>
        <DialogContent dividers>
          {preview.length ? (
            <Box sx={{ width:"100%", height:420 }}>
              <ChartRenderer config={buildConfigJSON()} data={preview} />
            </Box>
          ) : <Typography color="text.secondary">No preview data.</Typography>}
        </DialogContent>
        <DialogActions><Button onClick={()=>setPreviewOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={viewOpen} onClose={()=>setViewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {viewRow?.chart_name || "Chart"} {viewRow?.chart_config_json?.type ? `· ${String(viewRow.chart_config_json.type).toUpperCase()}` : ""}
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb:1 }} color="text.secondary">{viewRow?.chart_description || "—"}</Typography>
          <Box sx={{ width:"100%", height:420 }}>
            {viewRow ? <ChartRenderer config={viewRow.chart_config_json} data={viewData}/> : null}
          </Box>
          <Divider sx={{ my:2 }} />
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={`Modified: ${viewRow?.modified_at ? new Date(viewRow.modified_at).toLocaleString() : "—"}`} />
            <Chip size="small" label={`By: ${viewRow?.modified_by ?? "—"}`} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={()=>setViewOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={()=>setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Chart</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Chart Name" size="small" fullWidth value={editName} onChange={(e)=>setEditName(e.target.value)} />
            <TextField label="Description" size="small" fullWidth value={editDesc} onChange={(e)=>setEditDesc(e.target.value)} />
            <Divider />
            <Typography variant="body2" color="text.secondary">
              Need to change fields/mapping? Use <b>Load in Builder</b> for the full editor.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setEditOpen(false)}>Cancel</Button>
          <Button onClick={()=>loadIntoBuilder(editRow)}>Load in Builder</Button>
          <Button variant="contained" onClick={saveEditQuick}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}























// //COMPLETE WORKING CODE - NO ISSUES- COMMENTED TO TRY NEW CODE
// // src/components/ChartBuilder.js
// import React, { useEffect, useMemo, useState } from "react";
// import {
//   Box, Stack, Grid, Paper, Typography, TextField, Button, IconButton,
//   Dialog, DialogTitle, DialogContent, DialogActions, Chip, Divider,
//   MenuItem, Select, InputLabel, FormControl, Tooltip
// } from "@mui/material";
// import BarChartIcon from "@mui/icons-material/BarChart";
// import ShowChartIcon from "@mui/icons-material/ShowChart";
// import PieChartIcon from "@mui/icons-material/PieChart";
// import RadarIcon from "@mui/icons-material/Radar";
// import ScatterPlotIcon from "@mui/icons-material/ScatterPlot";
// import AddCircleOutline from "@mui/icons-material/AddCircleOutline";
// import DeleteOutline from "@mui/icons-material/DeleteOutline";
// import ColorLensIcon from "@mui/icons-material/ColorLens";
// import PreviewIcon from "@mui/icons-material/Preview";
// import SaveIcon from "@mui/icons-material/Save";
// import api from "../services/api"; // your axios instance with auth

// // Recharts
// import {
//   BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, Legend,
//   PieChart as RPieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
//   RadarChart as RRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
// } from "recharts";

// /** Chart type registry: define required mappings per type */
// const CHART_TYPES = [
//   { key: "bar", label: "Bar", icon: <BarChartIcon fontSize="large" /> },
//   { key: "line", label: "Line", icon: <ShowChartIcon fontSize="large" /> },
//   { key: "area", label: "Area", icon: <ShowChartIcon fontSize="large" /> },
//   { key: "pie", label: "Pie", icon: <PieChartIcon fontSize="large" /> },
//   { key: "radar", label: "Radar", icon: <RadarIcon fontSize="large" /> },
//   { key: "scatter", label: "Scatter", icon: <ScatterPlotIcon fontSize="large" /> },
// ];

// const isTextLike = (c) =>
//   ["text", "character varying", "varchar", "bpchar", "citext", "json", "jsonb"].includes(
//     (c.udt_name || c.data_type || "").toLowerCase()
//   ) || (c.data_type || "").toLowerCase().includes("text");

// const isNumericLike = (c) => {
//   const t = (c.udt_name || c.data_type || "").toLowerCase();
//   return ["int2","int4","int8","float4","float8","numeric","money","decimal","double precision","real","serial","bigserial"].some(x => t.includes(x));
// };

// const isDateLike = (c) => {
//   const t = (c.udt_name || c.data_type || "").toLowerCase();
//   return t.includes("date") || t.includes("time");
// };

// const defaultSeriesItem = (idx=1) => ({
//   label: `Series ${idx}`,
//   valueField: "",
//   color: "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6,"0"),
// });

// export default function ChartBuilder() {
//   const [chartName, setChartName] = useState("");
//   const [chartDesc, setChartDesc] = useState("");

//   const [typeModalOpen, setTypeModalOpen] = useState(false);
//   const [chartType, setChartType] = useState(null);

//   const [tables, setTables] = useState([]);
//   const [selectedTable, setSelectedTable] = useState("");
//   const [columns, setColumns] = useState([]);

//   // Mappings
//   const [categoryField, setCategoryField] = useState(""); // x-axis / pie label / radar angle
//   const [valueField, setValueField] = useState(""); // pie/scatter single value
//   const [xField, setXField] = useState(""); // scatter-only
//   const [yField, setYField] = useState(""); // scatter-only
//   const [series, setSeries] = useState([defaultSeriesItem(1)]);

//   // Preview data
//   const [preview, setPreview] = useState([]);
//   const [loadingPreview, setLoadingPreview] = useState(false);
//   const [saving, setSaving] = useState(false);

//   // Load tables
//   useEffect(() => {
//     (async () => {
//       try {
//         const { data } = await api.get("/db/tables");
//         setTables(data || []);
//       } catch (e) {
//         console.error(e);
//       }
//     })();
//   }, []);

//   // Load columns when table changes
//   useEffect(() => {
//     setColumns([]);
//     if (!selectedTable) return;
//     (async () => {
//       try {
//         const { data } = await api.get("/db/columns", { params: { table: selectedTable } });
//         setColumns(data || []);
//       } catch (e) {
//         console.error(e);
//       }
//     })();
//   }, [selectedTable]);

//   const textCols = useMemo(() => columns.filter(isTextLike), [columns]);
//   const numericCols = useMemo(() => columns.filter(isNumericLike), [columns]);
//   const dateCols = useMemo(() => columns.filter(isDateLike), [columns]);

//   const categoryCandidates = useMemo(() => {
//     // category can be text or date for most charts
//     return [...textCols, ...dateCols];
//   }, [textCols, dateCols]);

//   const canPreview = useMemo(() => {
//     if (!chartType || !selectedTable) return false;
//     switch (chartType) {
//       case "pie":
//         return categoryField && valueField;
//       case "scatter":
//         return xField && yField;
//       case "bar":
//       case "line":
//       case "area":
//       case "radar":
//         return categoryField && series.every(s => s.valueField);
//       default:
//         return false;
//     }
//   }, [chartType, selectedTable, categoryField, valueField, xField, yField, series]);

//   const handleOpenTypeModal = () => setTypeModalOpen(true);
//   const handlePickType = (key) => { setChartType(key); setTypeModalOpen(false); resetMappingsForType(key); };

//   const resetMappingsForType = (key) => {
//     setCategoryField("");
//     setValueField("");
//     setXField("");
//     setYField("");
//     if (["bar","line","area","radar"].includes(key)) {
//       setSeries([defaultSeriesItem(1)]);
//     } else {
//       setSeries([]);
//     }
//     setPreview([]);
//   };

//   const addSeries = () => setSeries(prev => [...prev, defaultSeriesItem(prev.length+1)]);
//   const removeSeries = (idx) => setSeries(prev => prev.filter((_,i)=>i!==idx));
//   const updateSeries = (idx, patch) => setSeries(prev => prev.map((s,i)=> i===idx ? {...s, ...patch} : s));

//   const requestPreview = async () => {
//     if (!canPreview) return;
//     setLoadingPreview(true);
//     try {
//       // Collect required columns for preview
//       let cols = new Set();
//       if (categoryField) cols.add(categoryField);
//       if (valueField) cols.add(valueField);
//       if (xField) cols.add(xField);
//       if (yField) cols.add(yField);
//       series.forEach(s => s.valueField && cols.add(s.valueField));

//       const { data } = await api.get("/db/preview", {
//         params: {
//           table: selectedTable,
//           columns: Array.from(cols).join(","),
//           limit: 100
//         }
//       });
//       setPreview(data || []);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoadingPreview(false);
//     }
//   };

//   const buildConfigJSON = () => {
//     return {
//       version: 1,
//       type: chartType,               // "bar" | "line" | "area" | "pie" | "radar" | "scatter"
//       source: { table: selectedTable },
//       mapping: {
//         categoryField: categoryField || null,
//         valueField: valueField || null,
//         xField: xField || null,
//         yField: yField || null,
//         series: series.map(s => ({
//           label: s.label,
//           valueField: s.valueField,
//           color: s.color
//         }))
//       },
//       options: {
//         legend: true,
//         tooltip: true
//       }
//     };
//   };

//   const handleSave = async () => {
//     const payload = {
//       chart_name: chartName.trim(),
//       chart_description: chartDesc.trim(),
//       chart_config_json: buildConfigJSON()
//     };
//     if (!payload.chart_name) {
//       alert("Chart Name is required");
//       return;
//     }
//     if (!chartType || !selectedTable) {
//       alert("Select chart type and table");
//       return;
//     }
//     setSaving(true);
//     try {
//       const { data } = await api.post("/chart-configs", payload);
//       alert(`Saved! ID: ${data.id}`);
//     } catch (e) {
//       console.error(e);
//       alert("Save failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ----- Render helpers -----
//   const FieldSelect = ({ label, value, onChange, items }) => (
//     <FormControl size="small" fullWidth>
//       <InputLabel>{label}</InputLabel>
//       <Select label={label} value={value} onChange={(e)=>onChange(e.target.value)}>
//         {items.map(c => (
//           <MenuItem key={c.column_name} value={c.column_name}>{c.column_name}</MenuItem>
//         ))}
//       </Select>
//     </FormControl>
//   );

//   const renderTypeSpecificForm = () => {
//     if (!chartType) return null;

//     if (["bar","line","area","radar"].includes(chartType)) {
//       return (
//         <Stack spacing={2}>
//           <FieldSelect label="Category (X-Axis)" value={categoryField} onChange={setCategoryField} items={categoryCandidates} />
//           <Box>
//             <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
//               <Typography variant="subtitle1">Series</Typography>
//               <Button startIcon={<AddCircleOutline/>} onClick={addSeries} size="small">Add Series</Button>
//             </Stack>
//             <Stack spacing={1}>
//               {series.map((s, idx) => (
//                 <Paper key={idx} variant="outlined" sx={{ p:1.5 }}>
//                   <Grid container spacing={1.5}>
//                     <Grid item xs={12} md={4}>
//                       <TextField
//                         size="small"
//                         fullWidth
//                         label="Legend Name"
//                         value={s.label}
//                         onChange={(e)=>updateSeries(idx,{label:e.target.value})}
//                       />
//                     </Grid>
//                     <Grid item xs={12} md={5}>
//                       <FieldSelect
//                         label="Value Field (number)"
//                         value={s.valueField}
//                         onChange={(val)=>updateSeries(idx,{valueField:val})}
//                         items={numericCols}
//                       />
//                     </Grid>
//                     <Grid item xs={10} md={2}>
//                       <TextField
//                         size="small"
//                         fullWidth
//                         label="Color"
//                         type="color"
//                         value={s.color}
//                         onChange={(e)=>updateSeries(idx,{color:e.target.value})}
//                         InputProps={{ startAdornment: <ColorLensIcon sx={{ mr:1 }} /> }}
//                       />
//                     </Grid>
//                     <Grid item xs={2} md={1} display="flex" alignItems="center" justifyContent="flex-end">
//                       {series.length > 1 && (
//                         <IconButton onClick={()=>removeSeries(idx)}><DeleteOutline/></IconButton>
//                       )}
//                     </Grid>
//                   </Grid>
//                 </Paper>
//               ))}
//             </Stack>
//           </Box>
//         </Stack>
//       );
//     }

//     if (chartType === "pie") {
//       return (
//         <Stack spacing={2}>
//           <FieldSelect label="Category (Slice label)" value={categoryField} onChange={setCategoryField} items={categoryCandidates} />
//           <FieldSelect label="Value (Slice size, number)" value={valueField} onChange={setValueField} items={numericCols} />
//         </Stack>
//       );
//     }

//     if (chartType === "scatter") {
//       return (
//         <Stack spacing={2}>
//           <FieldSelect label="X Field (number)" value={xField} onChange={setXField} items={numericCols} />
//           <FieldSelect label="Y Field (number)" value={yField} onChange={setYField} items={numericCols} />
//         </Stack>
//       );
//     }

//     return null;
//   };

//   const renderPreview = () => {
//     if (!canPreview) return <Typography color="text.secondary">Select required fields, then click Preview.</Typography>;
//     if (!preview.length) return <Typography color="text.secondary">No preview data loaded yet.</Typography>;

//     const data = preview;

//     if (chartType === "pie") {
//       const COLORS = data.map((_,i)=>`hsl(${(i*47)%360} 70% 50%)`); // auto palette
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <RPieChart>
//             <RTooltip />
//             <Legend />
//             <Pie
//               data={data}
//               dataKey={valueField}
//               nameKey={categoryField}
//               label
//             >
//               {data.map((entry, index) => (
//                 <Cell key={`cell-${index}`} fill={COLORS[index]} />
//               ))}
//             </Pie>
//           </RPieChart>
//         </ResponsiveContainer>
//       );
//     }

//     if (chartType === "scatter") {
//       // For MVP, a simple line-like plot using LineChart fallback
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart data={data}>
//             <XAxis dataKey={xField} />
//             <YAxis />
//             <RTooltip />
//             <Legend />
//             <Line type="monotone" dataKey={yField} dot />
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     }

//     if (chartType === "radar") {
//       return (
//         <ResponsiveContainer width="100%" height={360}>
//           <RRadarChart data={data}>
//             <PolarGrid />
//             <PolarAngleAxis dataKey={categoryField} />
//             <PolarRadiusAxis />
//             <Legend />
//             <RTooltip />
//             {series.map((s, idx) => (
//               <Radar key={idx} name={s.label} dataKey={s.valueField} stroke={s.color} fill={s.color} fillOpacity={0.5} />
//             ))}
//           </RRadarChart>
//         </ResponsiveContainer>
//       );
//     }

//     if (chartType === "area") {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <AreaChart data={data}>
//             <XAxis dataKey={categoryField} />
//             <YAxis />
//             <RTooltip />
//             <Legend />
//             {series.map((s, idx) => (
//               <Area key={idx} type="monotone" dataKey={s.valueField} name={s.label} stroke={s.color} fill={s.color} />
//             ))}
//           </AreaChart>
//         </ResponsiveContainer>
//       );
//     }

//     if (chartType === "line") {
//       return (
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart data={data}>
//             <XAxis dataKey={categoryField} />
//             <YAxis />
//             <RTooltip />
//             <Legend />
//             {series.map((s, idx) => (
//               <Line key={idx} type="monotone" dataKey={s.valueField} name={s.label} stroke={s.color} dot={false} />
//             ))}
//           </LineChart>
//         </ResponsiveContainer>
//       );
//     }

//     // default to bar
//     return (
//       <ResponsiveContainer width="100%" height={300}>
//         <BarChart data={data}>
//           <XAxis dataKey={categoryField} />
//           <YAxis />
//           <RTooltip />
//           <Legend />
//           {series.map((s, idx) => (
//             <Bar key={idx} dataKey={s.valueField} name={s.label} fill={s.color} />
//           ))}
//         </BarChart>
//       </ResponsiveContainer>
//     );
//   };

//   return (
//     <Box p={2}>
//       <Typography variant="h5" fontWeight={700} gutterBottom>
//         Chart Builder
//       </Typography>

//       <Paper variant="outlined" sx={{ p:2, mb:2 }}>
//         <Grid container spacing={2}>
//           <Grid item xs={12} md={6}>
//             <TextField
//               label="Chart Name"
//               value={chartName}
//               onChange={(e)=>setChartName(e.target.value)}
//               fullWidth
//               size="small"
//               required
//             />
//           </Grid>
//           <Grid item xs={12} md={6}>
//             <TextField
//               label="Description"
//               value={chartDesc}
//               onChange={(e)=>setChartDesc(e.target.value)}
//               fullWidth
//               size="small"
//             />
//           </Grid>

//           <Grid item xs={12} md={4}>
//             <TextField
//               label="Chart Type"
//               value={chartType ? CHART_TYPES.find(t=>t.key===chartType)?.label : ""}
//               fullWidth
//               size="small"
//               InputProps={{ readOnly: true }}
//               onClick={handleOpenTypeModal}
//             />
//           </Grid>
//           <Grid item xs={12} md={4}>
//             <FormControl size="small" fullWidth>
//               <InputLabel>Table</InputLabel>
//               <Select
//                 label="Table"
//                 value={selectedTable}
//                 onChange={(e)=>{ setSelectedTable(e.target.value); setPreview([]); }}
//               >
//                 {tables.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
//               </Select>
//             </FormControl>
//           </Grid>

//           {/* Type-specific mapping form */}
//           <Grid item xs={12} md={12}>
//             <Paper variant="outlined" sx={{ p:2 }}>
//               <Typography variant="subtitle1" fontWeight={600} gutterBottom>Field Mapping</Typography>
//               <Stack spacing={2}>
//                 {renderTypeSpecificForm()}
//               </Stack>
//             </Paper>
//           </Grid>

//           {/* Actions */}
//           <Grid item xs={12}>
//             <Stack direction="row" spacing={1} justifyContent="flex-end">
//               <Button
//                 variant="outlined"
//                 startIcon={<PreviewIcon />}
//                 disabled={!canPreview || loadingPreview}
//                 onClick={requestPreview}
//               >
//                 {loadingPreview ? "Loading..." : "Preview"}
//               </Button>
//               <Button
//                 variant="contained"
//                 startIcon={<SaveIcon />}
//                 onClick={handleSave}
//                 disabled={saving}
//               >
//                 {saving ? "Saving..." : "Save Config"}
//               </Button>
//             </Stack>
//           </Grid>
//         </Grid>
//       </Paper>

//       <Paper variant="outlined" sx={{ p:2 }}>
//         <Typography variant="subtitle1" fontWeight={600} gutterBottom>Live Preview</Typography>
//         {renderPreview()}
//       </Paper>

//       {/* Chart Type Modal */}
//       <Dialog open={typeModalOpen} onClose={()=>setTypeModalOpen(false)} maxWidth="sm" fullWidth>
//         <DialogTitle>Select a Chart Type</DialogTitle>
//         <DialogContent dividers>
//           <Grid container spacing={2}>
//             {CHART_TYPES.map(ct => (
//               <Grid item xs={6} key={ct.key}>
//                 <Paper
//                   onClick={()=>handlePickType(ct.key)}
//                   sx={{
//                     p:2, cursor:"pointer", display:"grid", placeItems:"center", gap:1,
//                     border: theme => `1px solid ${theme.palette.divider}`,
//                     "&:hover": { boxShadow: 3 }
//                   }}
//                 >
//                   {ct.icon}
//                   <Typography>{ct.label}</Typography>
//                 </Paper>
//               </Grid>
//             ))}
//           </Grid>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={()=>setTypeModalOpen(false)}>Close</Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// }
// //COMPLETE WORKING CODE - NO ISSUES- COMMENTED TO TRY NEW CODE