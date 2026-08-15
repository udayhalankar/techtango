// SimpleWorkflowFormViews.jsx
import React, { useEffect, useState } from "react";
import { buildPresetLayout } from "./simpleWorkflowFormLayouts";
import RenderLayout from "./RenderLayout";
import CanvasRenderer from "./CanvasRenderer";
import CanvasEditor from "./CanvasEditor";
import api from "../../../../services/api";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Stack,
  TextField,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from "@mui/material";

const LAYOUT_TILES = [
  { key: "VIEW_1", label: "Layout 1" },
  { key: "VIEW_2", label: "Layout 2" },
  { key: "VIEW_3", label: "Layout 3" },
  { key: "VIEW_4", label: "Layout 4" },
  { key: "VIEW_5", label: "Layout 5" },
  { key: "VIEW_6", label: "Layout 6" },
];

export default function SimpleWorkflowFormViews({
  header,
  step,
  previewFields,
  onSelectLayout,
  onClose,
}) {
  const [views, setViews] = useState([]);       // server-saved views
  const [selectedKey, setSelectedKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentLayoutDef, setCurrentLayoutDef] = useState(null);
  // Legacy header editors removed; Canvas Editor supersedes them.
  const [previewTab, setPreviewTab] = useState('canvas'); // 'canvas' | 'normal'
  const [canvasModel, setCanvasModel] = useState(null); // {kind:'canvas_v1', sections:[{id,grid,items}]}
  const [history, setHistory] = useState({}); // { [secId]: { past: [items], canUndo: boolean } }
  const [toast, setToast] = useState({ open:false, message:"", severity:"success" });
  const showToast = (message, severity='success') => setToast({ open:true, message, severity });
  const [containerStyle, setContainerStyle] = useState({ border: true, width: 1, color: '#d1d5db', radius: 12 });
  const [applyingAll, setApplyingAll] = useState(false);
  const isInitiate =
    String(step?.step_name || '').toUpperCase() === 'INITIATE' ||
    Number(step?.step_no) === 0 ||
    String(step?.step_type || '').toLowerCase() === 'create';

  const workflowMapId = header?.workflow_map_id ?? header?.id ?? null;
  const stepNo = Number(step?.step_no);
  const hasStepNo = Number.isFinite(stepNo);

  // Exclude system/internal fields from design + preview
  const SYSTEM_FIELDS = new Set([
    'wf_status',
    'performer',
    'step_performer',
    'initiator',
    'review_requestor',
    'workflow_id',
    'workflow_map_id',
    'tenant_id',
  ]);
  const safePreviewFields = Array.isArray(previewFields)
    ? previewFields.filter((f) => {
        const col = String(f?.column || '').trim().toLowerCase();
        if (!f?.visible) return false;
        return col && !SYSTEM_FIELDS.has(col);
      })
    : [];

  /* ───────────────────── Load saved views ───────────────────── */

useEffect(() => {
  if (workflowMapId == null || !hasStepNo) return;

  (async () => {
    try {
      const { data } = await api.get("/simple_workflowbuilder_formviews", {
        params: {
          workflow_map_id: workflowMapId,
          step_no: stepNo,
        },
      });

      // ✅ Accept both {views:[...]} and plain [...]
      const list = Array.isArray(data?.views)
        ? data.views
        : Array.isArray(data)
        ? data
        : [];

      // Enforce a single view in UI: pick the most recently modified (or created)
      let chosen = null;
      for (const v of list) {
        if (!chosen) {
          chosen = v;
          continue;
        }
        const ta = Date.parse(chosen.date_modified || chosen.date_created || 0) || 0;
        const tb = Date.parse(v.date_modified || v.date_created || 0) || 0;
        if (tb >= ta) chosen = v;
      }

      setViews(chosen ? [chosen] : []);

      if (chosen) {
        setSelectedKey(chosen.view_key);
        if (chosen.layout_def) {
          setCurrentLayoutDef(chosen.layout_def);
          onSelectLayout?.(chosen.layout_def);
          if (chosen.layout_def.container_style) {
            setContainerStyle(prev => ({ ...prev, ...chosen.layout_def.container_style }));
          }
        } else {
          setCurrentLayoutDef(null);
        }
      } else {
        setSelectedKey(null);
        setCurrentLayoutDef(null);
      }
    } catch (err) {
      console.error("[formviews] load failed", err);

      // Only clear if server says "no view"
      if (err?.response?.status === 404) {
        setViews([]);
        setSelectedKey(null);
        setCurrentLayoutDef(null);
      }
      // For 429/500/network: keep whatever was there.
    }
  })();
}, [workflowMapId, stepNo, hasStepNo]);



  /* ───────────────────── Helpers ───────────────────── */

  const getViewByKey = (key) =>
    views.find((v) => v.view_key === key) || null;

  const handleSelectTile = (key) => {
    setSelectedKey(key);

    const existing = getViewByKey(key);

    let layoutDef =
      existing?.layout_def ||
      (safePreviewFields.length
        ? buildPresetLayout({
            presetKey: key,
            fields: safePreviewFields,
          })
        : null);

    setCurrentLayoutDef(layoutDef || null);
    if (layoutDef) {
      onSelectLayout?.(layoutDef);
      // Keep Canvas Editor in sync with the chosen view
      let model = layoutDef.kind === 'canvas_v1'
        ? layoutDef
        : deriveCanvasFromPreset(layoutDef);
      model = enforceCommentsInMain(model);
      if (model && model.container_style) {
        setContainerStyle(prev => ({ ...prev, ...model.container_style }));
      }
      if (model) {
        setCanvasModel(model);
        const seed = {};
        (model.sections||[]).forEach(s=>{ seed[s.id] = { past: [JSON.parse(JSON.stringify(s.items||[]))] }; });
        setHistory(seed);
      } else {
        setCanvasModel(null);
        setHistory({});
      }
    }
  };

  // NEW: update label style "side" | "top"
  const handleLabelStyleChange = (style) => {
    if (!currentLayoutDef) return;
    setCurrentLayoutDef((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        label_style: style,
      };
    });
  };

  // NEW: update column span (1..4) in the active layout_def
  const handleColumnSpanChange = (sectionId, colId, newSpan) => {
    if (!currentLayoutDef) return;
    setCurrentLayoutDef((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        sections: (prev.sections || []).map((sec) => {
          if (sec.id !== sectionId) return sec;
          return {
            ...sec,
            columns: (sec.columns || []).map((col) =>
              col.id === colId
                ? { ...col, span: newSpan }
                : col
            ),
          };
        }),
      };
      return next;
    });
  };

  // ── Canvas (beta) helpers: derive a simple canvas from current layout for preview only
  function deriveCanvasFromPreset(def) {
    if (!def || !Array.isArray(def.sections)) return null;
    const basePerSpan = 12; // exact mapping: span N => N * 12 columns
    const rowH = 8;
    const outSecs = [];
    def.sections.forEach((sec) => {
      const columns = Array.isArray(sec.columns) ? sec.columns : [];
      const spanSum = columns.reduce((acc, c) => acc + (Number(c.span || 0) > 0 ? Number(c.span) : 0), 0) || 1;
      const colsTotal = Math.max(12, spanSum * basePerSpan);
      const items = [];
      columns.forEach((c, ci) => {
        const span = Math.max(0, Number(c.span || 0));
        if (!span) return;
        const w = span * basePerSpan;
        const x = columns.slice(0, ci).reduce((acc, pc) => {
          const ps = Math.max(0, Number(pc.span || 0));
          return acc + (ps ? ps * basePerSpan : 0);
        }, 0);
        // header blocks -> one item per block, stacked from top
        if (sec.id === 'header' && Array.isArray(c.blocks)) {
          let yHeader = 0;
          c.blocks.forEach((b, bi) => {
            const id = `hb_${ci}_${bi}`;
            const h = b.type === 'line' ? 2 : 6;
            items.push({ id, type: b.type, x, y: yHeader, w, h, props: { ...b } });
            yHeader += h + 1;
          });
        }
        const fields = Array.isArray(c.fields) ? c.fields : [];
        fields.forEach((f, fi) => {
          const id = `f_${ci}_${fi}`;
          items.push({ id, type: 'field', field: f.field || f.column, x, y: 12 + fi * 7, w, h: 6, props: {} });
        });
      });
      outSecs.push({ id: sec.id, grid: { cols: colsTotal, rowHeight: rowH, rows: (sec.id==='main'||sec.id==='details')?36:24 }, items });
    });
    return { kind: 'canvas_v1', sections: outSecs };
  }

  // Ensure step_comments and audit_trail live in MAIN and comments appear above audit
  function enforceCommentsInMain(model){
    try{
      if (!model || !Array.isArray(model.sections)) return model;
      const out = JSON.parse(JSON.stringify(model));
      const lc = (s)=>String(s||'').toLowerCase();
      const findMainIdx = ()=>{
        let idx = out.sections.findIndex(s=>lc(s.id)==='main');
        if (idx<0) idx = out.sections.findIndex(s=>lc(s.id)==='details');
        return idx;
      };
      const mainIdx = findMainIdx();
      if (mainIdx<0){ return out; }
      // pull comments/audit from all sections
      let commentsItem = null; let auditItem = null;
      out.sections.forEach(sec=>{
        const items = Array.isArray(sec.items)?sec.items:[];
        const kept = [];
        items.forEach(it=>{
          if (String(it.type||'')==='field'){
            const fname = lc(it.field||'');
            if (fname==='step_comments'){ commentsItem = commentsItem || it; return; }
            if (fname==='audit_trail'){ auditItem = auditItem || it; return; }
          }
          kept.push(it);
        });
        sec.items = kept;
      });
      if (!commentsItem && !auditItem) return out;
      const main = out.sections[mainIdx];
      const cols = Math.max(24, Number(main.grid?.cols || 72));
      const items = Array.isArray(main.items)?main.items:[];
      const yBase = items.reduce((m,it)=>Math.max(m, (it.y||0)+(it.h||1)), 0) + 1;
      let y = yBase;
      if (commentsItem){
        commentsItem = { ...commentsItem, x:0, y, w: cols, h: Math.max(6, commentsItem.h||6) };
        items.push(commentsItem); y += commentsItem.h + 1;
      }
      if (auditItem){
        auditItem = { ...auditItem, x:0, y, w: cols, h: Math.max(6, auditItem.h||6) };
        items.push(auditItem); y += auditItem.h + 1;
      }
      main.items = items;
      return out;
    } catch { return model; }
  }

  const handleSaveDesign = async () => {
    if (workflowMapId == null || !hasStepNo || !selectedKey) {
      showToast('Missing workflow/step/view', 'error');
      return;
    }

    // We want only ONE view per step. If any exists, update that record
    // and move it to the newly selected key + layout.
    const existingByKey = getViewByKey(selectedKey);
    const existingAny = views[0] || existingByKey || null;

    const layout_def =
      currentLayoutDef ||
      existingAny?.layout_def ||
      (safePreviewFields.length
        ? buildPresetLayout({
            presetKey: selectedKey,
            fields: safePreviewFields,
          })
        : {
            version: 1,
            kind: "preset",
            preset_key: selectedKey,
            sections: [],
          });

    const payload = {
      workflow_map_id: workflowMapId,
      step_no: stepNo,
      view_key: selectedKey,
      view_name: LAYOUT_TILES.find((t) => t.key === selectedKey)?.label,
      // Enforce non-default per requirement
      is_default: false,
      layout_def: { ...layout_def, container_style: containerStyle },
    };


    setSaving(true);
    try {
      // Always POST to leverage server upsert by (workflow_map_id, step_no, view_key).
      // This avoids unique index conflicts when switching between tiles.
      const resp = await api.post(
        "/simple_workflowbuilder_formviews",
        payload
      );

      const saved = resp?.data?.view || resp?.data;

      // Keep exactly one saved view in state
      setViews([saved]);
      showToast('Design saved', 'success');
    } catch (err) {
      console.error("[formviews] save failed", err);
      showToast('Failed to save design', 'error');
    } finally {
      setSaving(false);
    }
}

  // legacy header JSON helpers removed

  function openCanvasEditor() {
    let model = currentLayoutDef?.kind === 'canvas_v1' ? currentLayoutDef : deriveCanvasFromPreset(currentLayoutDef);
    model = enforceCommentsInMain(model);
    model.container_style = model.container_style || containerStyle;
    setCanvasModel(model);
    // seed history for each section
    const seed = {};
    (model?.sections||[]).forEach(s=>{ seed[s.id] = { past: [JSON.parse(JSON.stringify(s.items||[]))], future: [] }; });
    setHistory(seed);
  }

  function applyCanvasToLayout() {
    if (!canvasModel) return;
    setCurrentLayoutDef({ kind: 'canvas_v1', sections: canvasModel.sections || [], container_style: canvasModel.container_style || containerStyle });
    setPreviewTab('normal');
    showToast('Applied canvas to layout', 'success');
  }

  async function applyLayoutToAllSteps(layoutDefPayload) {
    if (workflowMapId == null || !hasStepNo || !selectedKey) {
      showToast('Missing workflow/step/view', 'error');
      return;
    }
    try {
      setApplyingAll(true);
      await api.post('/simple_workflowbuilder_formviews/apply-all', {
        workflow_map_id: workflowMapId,
        source_step_no: stepNo,
        view_key: selectedKey,
        view_name: LAYOUT_TILES.find((t)=>t.key===selectedKey)?.label || selectedKey,
        layout_def: layoutDefPayload || currentLayoutDef,
      });
      showToast('Applied to all steps', 'success');
    } catch (e) {
      console.error('apply-all layout failed', e);
      const msg = e?.response?.data?.error || e?.message || 'Failed to apply to all steps';
      showToast(msg, 'error');
    } finally {
      setApplyingAll(false);
    }
  }

  // When switching to Canvas tab or when layout changes, keep canvas model in sync
  useEffect(() => {
    if (previewTab !== 'canvas') return;
    if (!currentLayoutDef) return;
    let model = currentLayoutDef.kind === 'canvas_v1'
      ? currentLayoutDef
      : deriveCanvasFromPreset(currentLayoutDef);
    model = enforceCommentsInMain(model);
    model.container_style = model.container_style || containerStyle;
    if (model) {
      setCanvasModel(model);
      const seed = {};
      (model.sections||[]).forEach(s=>{ seed[s.id] = { past: [JSON.parse(JSON.stringify(s.items||[]))] }; });
      setHistory(seed);
    }
  }, [previewTab, currentLayoutDef]);

  // Undo helpers (must live inside component to access setHistory)
  function snapshotSection(secId, prevItems){
    setHistory(prev => {
      const h = prev[secId] || { past: [], future: [] };
      return { ...prev, [secId]: { past: [...h.past, JSON.parse(JSON.stringify(prevItems||[]))], future: [] } };
    });
  }
  function undoSection(secId){
    setHistory(prev => {
      const h = prev[secId];
      if (!h || !h.past || h.past.length < 1) return prev;
      const restore = h.past[h.past.length - 1];
      const newPast = h.past.slice(0, -1);
      const current = (canvasModel?.sections||[]).find(s=>s.id===secId)?.items || [];
      setCanvasModel(cm => ({ ...cm, sections: (cm.sections||[]).map(s => s.id===secId ? { ...s, items: JSON.parse(JSON.stringify(restore)) } : s) }));
      return { ...prev, [secId]: { past: newPast, future: [...(h.future||[]), JSON.parse(JSON.stringify(current))] } };
    });
  }
  function redoSection(secId){
    setHistory(prev => {
      const h = prev[secId];
      if (!h || !h.future || h.future.length < 1) return prev;
      const nextState = h.future[h.future.length - 1];
      const newFuture = h.future.slice(0, -1);
      const current = (canvasModel?.sections||[]).find(s=>s.id===secId)?.items || [];
      setCanvasModel(cm => ({ ...cm, sections: (cm.sections||[]).map(s => s.id===secId ? { ...s, items: JSON.parse(JSON.stringify(nextState)) } : s) }));
      return { ...prev, [secId]: { past: [...(h.past||[]), JSON.parse(JSON.stringify(current))], future: newFuture } };
    });
  }

  // legacy header designer helpers removed

  /* ───────────────────── Render ───────────────────── */

  return (
  <Paper
    variant="outlined"
    sx={{
      p: 2.5,
      borderRadius: 2,
      bgcolor: "background.paper",
    }}
  >
    {/* Header row: title + Save button aligned with title */}
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 2,
        gap: 2,
      }}
    >
      <Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 300, color: "primary.main" }}
        >
          {`Render Form View`}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Click and choose a layout and modify the design futher.
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          This controls how the fields will be rendered in the “Render form” tab.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleSaveDesign}
          disabled={!selectedKey || saving}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          Save Design
        </Button>
      </Box>
    </Box>


      {/* Rendered layout preview for the selected view */}
            {/* Layout tiles row */}
      <Box sx={{ mb: 1 }} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {LAYOUT_TILES.map((tile) => {
          const saved = views.find((v) => v.view_key === tile.key);
          const isSelected = selectedKey === tile.key;

          return (
            <Grid item xs={6} sm={4} md={2} key={tile.key}>
              <Paper
                onClick={() => handleSelectTile(tile.key)}
                variant="outlined"
                sx={{
                  cursor: "pointer",
                  p: 1.5,
                  textAlign: "center",
                  borderRadius: 2.5,
                  borderWidth: 1.5,
                  borderStyle: 'solid',
                  borderColor: isSelected ? "primary.main" : "divider",
                  boxShadow: isSelected
                    ? '0 6px 18px rgba(25,118,210,.25), 0 2px 6px rgba(25,118,210,.18)'
                    : '0 2px 8px rgba(0,0,0,.06)',
                  transition: 'box-shadow .15s ease, transform .12s ease, border-color .15s ease',
                  "&:hover": {
                    boxShadow: isSelected
                      ? '0 8px 22px rgba(25,118,210,.30), 0 3px 8px rgba(25,118,210,.22)'
                      : '0 4px 12px rgba(0,0,0,.12)',
                    transform: 'translateY(-1px)'
                  },
                }}
              >
                <Box
                  sx={{
                    height: 120,
                    borderRadius: 1.5,
                    border: `1px dashed ${isSelected ? 'rgba(25,118,210,.35)' : '#cbd5e1'}`,
                    mb: 1,
                    bgcolor: "#f9fafb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "text.secondary",
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)'
                  }}
                >
                  {tile.label}
                </Box>

                <Stack direction="row" spacing={1} justifyContent="center">
                  <Typography variant="body2">{tile.label}</Typography>
                  {saved && (
                    <Chip size="small" label="Saved" color="primary" />
                  )}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {currentLayoutDef && (
        <Box sx={{ mb: 3 }}>
          <Tabs value={previewTab} onChange={(_,v)=>setPreviewTab(v)} sx={{ mb: 1 }}>
            <Tab value="canvas" label="Canvas Editor (beta)" />
            <Tab value="normal" label="Normal View" />
          </Tabs>
          {previewTab === 'normal' && (
            <Box sx={{ display:'flex', gap:1, alignItems:'center', mb:1, flexWrap:'wrap' }}>
              <Chip label="Form Border" />
              <Button size="small" variant={containerStyle.border ? "contained" : "outlined"} onClick={()=>setContainerStyle(cs=>({...cs, border:!cs.border}))}>
                {containerStyle.border ? "Border: On" : "Border: Off"}
              </Button>
              <TextField size="small" label="Width" type="number" sx={{ width:90 }} value={containerStyle.width} onChange={(e)=>setContainerStyle(cs=>({...cs, width: Number(e.target.value||0)}))} />
              <TextField size="small" label="Color" type="color" sx={{ width:130 }} value={containerStyle.color} onChange={(e)=>setContainerStyle(cs=>({...cs, color: e.target.value}))} />
              <TextField size="small" label="Radius" type="number" sx={{ width:100 }} value={containerStyle.radius} onChange={(e)=>setContainerStyle(cs=>({...cs, radius: Number(e.target.value||0)}))} />
              {isInitiate && (
                <Button size="small" variant="outlined" onClick={()=>applyLayoutToAllSteps({ ...(currentLayoutDef||{}), container_style: containerStyle })} disabled={applyingAll || !currentLayoutDef}>
                  {applyingAll ? 'Applying...' : 'Apply to All Steps'}
                </Button>
              )}
            </Box>
          )}

          {previewTab === 'canvas' ? (
            <>
              {!canvasModel && (
                <Box sx={{ mb: 1 }}>
                  <Button size="small" variant="outlined" onClick={openCanvasEditor}>Initialize Canvas</Button>
                </Box>
              )}
              {canvasModel && (
                <>
                  <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
                    <Button size="small" variant="contained" onClick={applyCanvasToLayout} disabled={!canvasModel}>Apply Canvas to Layout</Button>
                    {isInitiate && (
                      <Button size="small" variant="outlined" onClick={()=>applyLayoutToAllSteps({ kind:'canvas_v1', sections: canvasModel.sections, container_style: canvasModel.container_style || containerStyle })} disabled={!canvasModel || applyingAll}>
                        {applyingAll ? 'Applying...' : 'Apply to All Steps'}
                      </Button>
                    )}
                    {currentLayoutDef && (
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label="A - Side labels"
                          color={(currentLayoutDef.label_style || 'side') === 'side' ? 'primary' : 'default'}
                          size="small"
                          onClick={() => handleLabelStyleChange('side')}
                        />
                        <Chip
                          label="B - Top labels"
                          color={currentLayoutDef.label_style === 'top' ? 'primary' : 'default'}
                          size="small"
                          onClick={() => handleLabelStyleChange('top')}
                        />
                      </Stack>
                    )}
                  </Box>

                  {canvasModel.sections.filter(s=>s.id==='header').map((sec) => (
                    <Box key={sec.id} sx={{ mb: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="overline" sx={{ color:'text.secondary' }}>{sec.id.toUpperCase()}</Typography>
                        <Button size="small" onClick={()=>{
                          const rows = Math.max(6, (sec.grid?.rows||24) - 6);
                          setCanvasModel(prev=>({ ...prev, sections:(prev.sections||[]).map(s=> s.id===sec.id? { ...s, grid:{ ...(s.grid||{}), rows } } : s ) }));
                        }}>- rows</Button>
                        <Button size="small" onClick={()=>{
                          const rows = Math.min(96, (sec.grid?.rows||24) + 6);
                          setCanvasModel(prev=>({ ...prev, sections:(prev.sections||[]).map(s=> s.id===sec.id? { ...s, grid:{ ...(s.grid||{}), rows } } : s ) }));
                        }}>+ rows</Button>
                        
                      </Stack>
                      <CanvasEditor
                        sectionId={sec.id}
                        cols={sec.grid?.cols || 72}
                        rows={sec.grid?.rows || 24}
                        rowHeight={sec.grid?.rowHeight || 8}
                        items={sec.items || []}
                        onChange={(newItems)=>{
                          snapshotSection(sec.id, sec.items||[]);
                          setCanvasModel(prev => ({ ...prev, sections: (prev.sections||[]).map(s=> s.id===sec.id? { ...s, items:newItems }: s ) }));
                        }}
                        onUndo={() => undoSection(sec.id)}
                        onRedo={() => redoSection(sec.id)}
                        onGrowRows={(sid, delta)=>{
                          setCanvasModel(prev=>({
                            ...prev,
                            sections:(prev.sections||[]).map(s=> s.id===sid ? { ...s, grid:{ ...(s.grid||{}), rows: Math.min(240, (s.grid?.rows||24) + (delta||12)) } } : s ),
                          }));
                        }}
                      />
                    </Box>
                  ))}

                  {canvasModel.sections.filter(s=>s.id==='main' || s.id==='details').map((sec) => (
                    <Box key={sec.id} sx={{ mb: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="overline" sx={{ color:'text.secondary' }}>{(sec.id||'main').toUpperCase()}</Typography>
                        <Button size="small" onClick={()=>{
                          const rows = Math.max(12, (sec.grid?.rows||36) - 6);
                          setCanvasModel(prev=>({ ...prev, sections:(prev.sections||[]).map(s=> s.id===sec.id? { ...s, grid:{ ...(s.grid||{}), rows } } : s ) }));
                        }}>- rows</Button>
                        <Button size="small" onClick={()=>{
                          const rows = Math.min(192, (sec.grid?.rows||36) + 6);
                          setCanvasModel(prev=>({ ...prev, sections:(prev.sections||[]).map(s=> s.id===sec.id? { ...s, grid:{ ...(s.grid||{}), rows } } : s ) }));
                        }}>+ rows</Button>
                        
                      </Stack>
                      <CanvasEditor
                        sectionId={sec.id}
                        cols={sec.grid?.cols || 72}
                        rows={sec.grid?.rows || 36}
                        rowHeight={sec.grid?.rowHeight || 8}
                        items={sec.items || []}
                        allowFields={false}
                        canAdd={false}
                        canDelete={false}
                        canEditProps={false}
                        labelStyle={(currentLayoutDef?.label_style || 'side')}
                        fields={safePreviewFields.map(f=>({
                          column: String(f.column),
                          label: f.label || f.column,
                          input_type: f.input_type || f.type,
                          options: f.options,
                          option_list: f.option_list,
                        }))}
                        onChange={(newItems)=>{
                          snapshotSection(sec.id, sec.items||[]);
                          setCanvasModel(prev => ({ ...prev, sections: (prev.sections||[]).map(s=> s.id===sec.id? { ...s, items:newItems }: s ) }));
                        }}
                        onUndo={() => undoSection(sec.id)}
                        onRedo={() => redoSection(sec.id)}
                        onGrowRows={(sid, delta)=>{
                          setCanvasModel(prev=>({
                            ...prev,
                            sections:(prev.sections||[]).map(s=> s.id===sid ? { ...s, grid:{ ...(s.grid||{}), rows: Math.min(240, (s.grid?.rows||36) + (delta||12)) } } : s ),
                          }));
                        }}
                      />
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Button size="small" onClick={()=>undoSection(sec.id)} disabled={!history[sec.id] || (history[sec.id]?.past||[]).length < 2}>Undo</Button>
                      </Stack>
                    </Box>
                  ))}

                  {canvasModel.sections.filter(s=>s.id==='footer').map((sec) => (
                    <Box key={sec.id} sx={{ mb: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="overline" sx={{ color:'text.secondary' }}>{sec.id.toUpperCase()}</Typography>
                        <Button size="small" onClick={()=>{
                          const rows = Math.max(6, (sec.grid?.rows||24) - 6);
                          setCanvasModel(prev=>({ ...prev, sections:(prev.sections||[]).map(s=> s.id===sec.id? { ...s, grid:{ ...(s.grid||{}), rows } } : s ) }));
                        }}>- rows</Button>
                        <Button size="small" onClick={()=>{
                          const rows = Math.min(96, (sec.grid?.rows||24) + 6);
                          setCanvasModel(prev=>({ ...prev, sections:(prev.sections||[]).map(s=> s.id===sec.id? { ...s, grid:{ ...(s.grid||{}), rows } } : s ) }));
                        }}>+ rows</Button>
                        
                      </Stack>
                      <CanvasEditor
                        sectionId={sec.id}
                        cols={sec.grid?.cols || 72}
                        rows={sec.grid?.rows || 24}
                        rowHeight={sec.grid?.rowHeight || 8}
                        items={sec.items || []}
                        labelStyle={(currentLayoutDef?.label_style || 'side')}
                        onChange={(newItems)=>{
                          snapshotSection(sec.id, sec.items||[]);
                          setCanvasModel(prev => ({ ...prev, sections: (prev.sections||[]).map(s=> s.id===sec.id? { ...s, items:newItems }: s ) }));
                        }}
                        onUndo={() => undoSection(sec.id)}
                        onRedo={() => redoSection(sec.id)}
                        onGrowRows={(sid, delta)=>{
                          setCanvasModel(prev=>({
                            ...prev,
                            sections:(prev.sections||[]).map(s=> s.id===sid ? { ...s, grid:{ ...(s.grid||{}), rows: Math.min(240, (s.grid?.rows||24) + (delta||12)) } } : s ),
                          }));
                        }}
                      />
                    </Box>
                  ))}
                </>
              )}
            </>
          ) : (
                currentLayoutDef?.kind === 'canvas_v1' ? (
                  (() => {
                    const secOrder = ['header','main','details','footer'];
                    const cs = { ...(currentLayoutDef.container_style || {}), ...containerStyle };
                    const wrapStyle = cs.border === false
                      ? { p: 2 }
                      : { border:`${cs.width||1}px solid ${cs.color||'#d1d5db'}`, borderRadius: cs.radius!=null? cs.radius : 12, p:2 };
                    return (
                      <Box sx={wrapStyle}>
                        {secOrder.map(id => {
                      const sec = (currentLayoutDef.sections||[]).find(s=> String(s.id).toLowerCase()===id);
                      if (!sec) return null;
                      return (
                        <Box key={id} sx={{ mb: 2 }}>
                          <Typography variant="overline" sx={{ color: 'text.secondary' }}>{String(id).toUpperCase()}</Typography>
                          <CanvasRenderer section={sec} previewFields={safePreviewFields} showGrid={false} labelStyle={(currentLayoutDef?.label_style || 'side')} />
                        </Box>
                      );
                    })}
                  </Box>
                );
              })()
            ) : (
              <RenderLayout
                layoutDef={{ ...currentLayoutDef, container_style: containerStyle }}
                previewFields={safePreviewFields}
                onChangeColumnSpan={handleColumnSpanChange}
                step={step}
              />
            )
          )}
        </Box>
      )}

      <Snackbar open={toast.open} autoHideDuration={2500} onClose={()=>setToast(t=>({...t, open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert onClose={()=>setToast(t=>({...t, open:false}))} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>

    </Paper>
  );
}

