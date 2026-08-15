// src/pages/workflows/designer/WorkflowDesigner.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  addEdge, Background, Controls, MiniMap, MarkerType,
  Handle, Position, useEdgesState, useNodesState
} from 'reactflow';
import 'reactflow/dist/style.css';

import WorkflowProperties from './WorkflowProperties';
import { catalog, workflows } from './api';

/* ---------- Compact tile ---------- */
const Tile = ({ data }) => {
  const t = data.stepType || 'step';
  const label =
    t === 'initiator' ? 'Initiator' :
    t === 'form'      ? 'Form Step' :
    t === 'process'   ? 'Process Step' :
    t === 'evaluate'  ? 'Evaluate' : 'Step';

  return (
    <div style={{
      minWidth: 170, maxWidth: 220, padding: 8,
      borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,.06)', fontFamily: 'Inter, system-ui, Arial'
    }}>
      <Handle type="target" position={Position.Left} style={{ background:'#6366f1' }} />
      {t === 'evaluate' ? (
        <>
          <Handle type="source" id="true"  position={Position.Right} style={{ top: 10, background:'#10b981' }} />
          <Handle type="source" id="false" position={Position.Right} style={{ bottom: 10, top:'auto', background:'#ef4444' }} />
        </>
      ) : (
        <Handle type="source" position={Position.Right} style={{ background:'#0ea5e9' }} />
      )}
      <div style={{ fontWeight: 700, fontSize: 13, color:'#0b1220' }}>{label}</div>
      <div style={{ fontSize: 11, color:'#64748b', marginTop: 4 }}>{data.stepName || '—'}</div>
    </div>
  );
};
const nodeTypes = { initiator: Tile, form: Tile, process: Tile, evaluate: Tile };

/* ---------- Modal shell ---------- */
const Modal = ({ title, open, onClose, onSave, children, width = 640 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', display:'grid', placeItems:'center', zIndex:60 }}>
      <div onClick={(e)=>e.stopPropagation()} style={{ width, background:'#fff', borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,.2)', maxHeight:'85vh', overflow:'auto' }}>
        <div style={{ padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h3 style={{ margin:0 }}>{title}</h3>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose}>Cancel</button>
              <button onClick={onSave} style={{ background:'#0ea5e9', color:'#fff', border:'none', padding:'6px 12px', borderRadius:6 }}>Save</button>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

/* ---------- Node Modals ---------- */
const InitiatorModal = ({ open, onClose, node, forms, participants, onPatch }) => {
  const d = node?.data || {};
  const [stepName, setStepName] = useState('');
  const [formId, setFormId]     = useState('');
  const [assignee, setAssignee] = useState({ mode:'participant', participantId:'' });

  useEffect(() => {
    if (!open) return;
    setStepName(d.stepName || '');
    setFormId(d.formId || '');
    setAssignee(d.assignee || { mode:'participant', participantId:'' });
  }, [open, d.stepName, d.formId, d.assignee]);

  const save = () => { onPatch({ stepName, formId: formId ? Number(formId) : null, assignee }); onClose(); };

  return (
    <Modal title="Initiator — Step" open={open} onClose={onClose} onSave={save}>
      <label style={{ display:'block', marginBottom:8 }}>
        <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Step Name</div>
        <input value={stepName} onChange={(e)=>setStepName(e.target.value)} style={{ width:'100%' }} />
      </label>
      <label style={{ display:'block', marginBottom:8 }}>
        <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Master Form</div>
        <select value={formId} onChange={(e)=>setFormId(e.target.value)} style={{ width:'100%' }}>
          <option value="">— choose —</option>
          {(forms||[]).filter(f=>f.type==='Master').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>
      <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #e2e8f0' }}>
        <div style={{ fontWeight:600, marginBottom:6 }}>Assignee</div>
        <label style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
          <input type="radio" checked={assignee.mode==='participant'} onChange={()=>setAssignee({ mode:'participant', participantId:'' })} />
          From Participants
        </label>
        {assignee.mode==='participant' && (
          <select value={assignee.participantId || ''} onChange={(e)=>setAssignee({ ...assignee, participantId:e.target.value })}>
            <option value="">— select —</option>
            {(participants||[]).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        )}
      </div>
    </Modal>
  );
};

const FormStepModal = ({ open, onClose, node, forms, participants, onPatch }) => {
  const d = node?.data || {};
  const [stepName, setStepName] = useState('');
  const [formId, setFormId]     = useState('');
  const [assignee, setAssignee] = useState({ mode:'participant', participantId:'' });

  useEffect(() => {
    if (!open) return;
    setStepName(d.stepName || '');
    setFormId(d.formId || '');
    setAssignee(d.assignee || { mode:'participant', participantId:'' });
  }, [open, d.stepName, d.formId, d.assignee]);

  const save = () => { onPatch({ stepName, formId: formId ? Number(formId) : null, assignee }); onClose(); };

  return (
    <Modal title="Form Step — Step" open={open} onClose={onClose} onSave={save}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <label>
          <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Step Name</div>
          <input value={stepName} onChange={(e)=>setStepName(e.target.value)} />
        </label>
        <label>
          <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Form</div>
          <select value={formId} onChange={(e)=>setFormId(e.target.value)}>
            <option value="">— choose —</option>
            {(forms||[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
      </div>
      <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #e2e8f0' }}>
        <div style={{ fontWeight:600, marginBottom:6 }}>Assignee</div>
        <label style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
          <input type="radio" checked={assignee.mode==='participant'} onChange={()=>setAssignee({ mode:'participant', participantId:'' })} />
          From Participants
        </label>
        {assignee.mode==='participant' && (
          <select value={assignee.participantId || ''} onChange={(e)=>setAssignee({ ...assignee, participantId:e.target.value })}>
            <option value="">— select —</option>
            {(participants||[]).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        )}
      </div>
    </Modal>
  );
};

const ProcessStepModal = ({ open, onClose, node, queries, onPatch }) => {
  const d = node?.data || {};
  const [stepName, setStepName] = useState('');
  const [action, setAction]     = useState('sendEmail');
  const [resourceId, setResId]  = useState('');
  const [folderName, setFolder] = useState('');

  useEffect(() => {
    if (!open) return;
    setStepName(d.stepName || '');
    setAction(d.action || 'sendEmail');
    setResId(d.resourceId || '');
    setFolder(d.folderName || '');
  }, [open, d.stepName, d.action, d.resourceId, d.folderName]);

  const save = () => { onPatch({ stepName, action, resourceId: resourceId ? Number(resourceId) : null, folderName }); onClose(); };

  const noQueries = (queries || []).length === 0;

  return (
    <Modal title="Process Step — Step" open={open} onClose={onClose} onSave={save}>
      <label style={{ display:'block', marginBottom:8 }}>
        <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Step Name</div>
        <input value={stepName} onChange={(e)=>setStepName(e.target.value)} style={{ width:'100%' }} />
      </label>
      <label style={{ display:'block', marginBottom:8 }}>
        <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Action</div>
        <select value={action} onChange={(e)=>{ setAction(e.target.value); setResId(''); }}>
          <option value="sendEmail">Send Email</option>
          <option value="runQuery" disabled={noQueries}>
            Run Query{noQueries ? ' (none available)' : ''}
          </option>
          <option value="createFolder">Create Folder</option>
        </select>
      </label>

      {action === 'runQuery' && noQueries && (
        <div style={{ fontSize:12, color:'#64748b', margin:'6px 0 10px' }}>
          No queries in catalog. Ask admin to add or use another action.
        </div>
      )}

      {action === 'runQuery' && !noQueries && (
        <label style={{ display:'block', marginBottom:8 }}>
          <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Query</div>
          <select value={resourceId} onChange={(e)=>setResId(e.target.value)}>
            <option value="">— choose —</option>
            {(queries||[]).map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </label>
      )}

      {action === 'createFolder' && (
        <label style={{ display:'block', marginBottom:8 }}>
          <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Folder Name</div>
          <input value={folderName} onChange={(e)=>setFolder(e.target.value)} placeholder="Case-{{id}}" />
        </label>
      )}
    </Modal>
  );
};

const EvaluateModal = ({ open, onClose, node, onPatch }) => {
  const d = node?.data || {};
  const [stepName, setStepName] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open) return;
    setStepName(d.stepName || '');
    setRows(Array.isArray(d.conditions) ? d.conditions : []);
  }, [open, d.stepName, d.conditions]);

  const ops = ['==','!=','>','<','>=','<=','includes'];
  const add = () => setRows(r => [...r, { id: Math.random().toString(36).slice(2,7), field:'', op:'==', value:'', outcome:'true' }]);
  const rm  = (i) => setRows(r => r.filter((_,ix)=>ix!==i));
  const patch = (i, k, v) => setRows(r => r.map((row,ix)=> ix===i ? { ...row, [k]: v } : row));
  const save = () => { onPatch({ stepName, conditions: rows }); onClose(); };

  return (
    <Modal title="Evaluate — Conditions" open={open} onClose={onClose} onSave={save}>
      <label style={{ display:'block', marginBottom:8 }}>
        <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Step Name</div>
        <input value={stepName} onChange={(e)=>setStepName(e.target.value)} />
      </label>
      <div style={{ display:'grid', gap:8 }}>
        {rows.map((c, i) => (
          <div key={c.id||i} style={{ display:'grid', gridTemplateColumns:'1fr 120px 1fr 120px auto', gap:6, alignItems:'end' }}>
            <label><div style={{fontSize:12}}>Field</div><input value={c.field||''} onChange={(e)=>patch(i,'field',e.target.value)} /></label>
            <label><div style={{fontSize:12}}>Op</div>
              <select value={c.op||'=='} onChange={(e)=>patch(i,'op',e.target.value)}>{ops.map(o => <option key={o} value={o}>{o}</option>)}</select>
            </label>
            <label><div style={{fontSize:12}}>Value</div><input value={c.value??''} onChange={(e)=>patch(i,'value',e.target.value)} /></label>
            <label><div style={{fontSize:12}}>Outcome</div>
              <select value={c.outcome||'true'} onChange={(e)=>patch(i,'outcome',e.target.value)}>
                <option value="true">TRUE</option><option value="false">FALSE</option>
              </select>
            </label>
            <button onClick={()=>rm(i)}>×</button>
          </div>
        ))}
        <button onClick={add}>+ Add condition</button>
      </div>
    </Modal>
  );
};

/* ---------- Designer ---------- */
export default function WorkflowDesigner() {
  const { id: wfId } = useParams();

  const [forms, setForms]     = useState([]);
  const [users, setUsers]     = useState([]);
  const [queries, setQueries] = useState([]);   // stays [], no endpoint
  const [reports, setReports] = useState([]);

  const [catalogErr, setCatalogErr] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Map server rows to UI-friendly shape (adds .name)
  const normalizeForms = (rows = []) =>
    rows.map(r => ({
      id: r.id,
      type: r.type,
      template: r.template_name,
      name: r.type === 'Master' ? r.template_name : `${r.template_name} - Update`,
      master_ref: r.master_ref ?? null,
    }));

  useEffect(() => {
    (async () => {
      setCatalogLoading(true);
      try {
        const [f, u, r] = await Promise.all([ catalog.forms(), catalog.users(), catalog.reports() ]);
        setForms(normalizeForms(f || []));
        setUsers(u || []);
        setReports(r || []);
        setQueries([]); // no endpoint
      } catch (e) {
        setCatalogErr(e.message || 'Failed to load catalog');
      } finally {
        setCatalogLoading(false);
      }
    })();
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const idRef = useRef(1);
  const rehydrate = useCallback((raw) => (raw || []).map((n) => ({
    ...n,
    id: String(n.id),
    data: {
      ...(n.data || {}),
      stepType: n.type,
      onChange: (patch) =>
        setNodes((ns) => ns.map((nx) => (nx.id === String(n.id) ? { ...nx, data: { ...nx.data, ...patch } } : nx))),
    },
  })), [setNodes]);

  const [workflowMeta, setWorkflowMeta] = useState(null);

  useEffect(() => {
    if (!wfId) return;
    (async () => {
      try {
        const payload = await workflows.get(wfId);
        if (payload.workflowMeta) setWorkflowMeta(payload.workflowMeta);
        if (payload.nodes) setNodes(rehydrate(payload.nodes));
        if (payload.edges) setEdges(payload.edges.map((e) => ({
          ...e, id: e.id || `${e.source}-${e.target}-${Math.random().toString(36).slice(2,7)}`
        })));
        const maxId = Math.max(0, ...(payload.nodes || []).map(n => Number(n.id) || 0));
        idRef.current = Math.max(idRef.current, maxId + 1);
      } catch (e) {
        alert(`Failed to load workflow #${wfId}: ${e.message}`);
      }
    })();
  }, [wfId, rehydrate, setNodes, setEdges]);

  const edgeOptions = useMemo(() => ({
    animated: false, markerEnd: { type: MarkerType.ArrowClosed }, type: 'straight',
  }), []);
  const onConnect = useCallback((p) => setEdges((es) => addEdge({ ...edgeOptions, ...p }, es)), [edgeOptions]);

  const withNodeDefaults = (type, position) => {
    const id = (idRef.current++).toString();
    return {
      id, type, position,
      data: {
        stepType: type,
        stepName: '',
        onChange: (patch) => setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      },
    };
  };

  const onDrop = useCallback((evt) => {
    evt.preventDefault();
    const type = evt.dataTransfer.getData('application/reactflow');
    if (!type) return;
    if (type === 'initiator' && nodes.some(n => n.type === 'initiator')) {
      alert('Only one Initiator is allowed.');
      return;
    }
    const rect = evt.currentTarget.getBoundingClientRect();
    const position = { x: evt.clientX - rect.left - 80, y: evt.clientY - rect.top - 20 };
    setNodes(ns => ns.concat(withNodeDefaults(type, position)));
  }, [nodes, setNodes]);

  const onDragOver = (evt) => { evt.preventDefault(); evt.dataTransfer.dropEffect = 'move'; };

  /* ---- Workflow Properties ---- */
  const [propsOpen, setPropsOpen] = useState(false);
  const saveProps = (meta) => {
    setWorkflowMeta(meta);
    const participants = (meta.participantIds || [])
      .map(id => users.find(u => u.id === id))
      .filter(Boolean);
    setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, participants } })));
  };

  /* ---- Node editor ---- */
  const [editing, setEditing] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const openEditor = (node) => { setEditing(node); setEditOpen(true); };
  const applyPatch = (patch) => { editing?.data?.onChange?.(patch); setEditOpen(false); };

  /* ---- Validation & Save ---- */
  const validateEvaluate = () => {
    const errs = nodes.filter(n => n.type === 'evaluate').map(n => {
      const outs = edges.filter(e => e.source === n.id);
      const t = outs.some(e => e.sourceHandle === 'true');
      const f = outs.some(e => e.sourceHandle === 'false');
      return (t && f) ? null : `Evaluate node ${n.id} must have TRUE and FALSE connections.`;
    }).filter(Boolean);
    return errs;
  };

  const saveToDb = async () => {
    const initCount = nodes.filter(n => n.type === 'initiator').length;
    if (initCount !== 1) return alert('Workflow must have exactly one Initiator.');
    const evalErrs = validateEvaluate();
    if (evalErrs.length) return alert(evalErrs.join('\n'));
    if (!workflowMeta?.initiatorFormId) return alert('Open Workflow Properties and set Components.');

    const payload = {
      workflowMeta,
      nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data: { ...data, onChange: undefined } })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || null })),
    };

    try {
      const out = await workflows.create(payload);
      alert(`Saved! workflow #${out.workflowId} v${out.version}`);
    } catch (e) {
      alert(`Save failed: ${e.message}`);
    }
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr 240px', height:'calc(100vh - 32px)', gap:12, padding:12 }}>
      {/* Palette */}
      <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
        <button onClick={() => setPropsOpen(true)} style={{ width:'100%', padding:10, marginBottom:10, fontWeight:600 }}>
          Workflow Properties
        </button>
        {[
          { type:'initiator', label:'Initiator' },
          { type:'form',      label:'Form Step' },
          { type:'process',   label:'Process Step' },
          { type:'evaluate',  label:'Evaluate' },
        ].map(p => (
          <div key={p.type}
               draggable
               onDragStart={(e)=>e.dataTransfer.setData('application/reactflow', p.type)}
               style={{ padding:'10px 12px', border:'1px dashed #94a3b8', borderRadius:8, marginBottom:8, cursor:'grab', userSelect:'none', background:'#f8fafc' }}>
            {p.label}
          </div>
        ))}

        <hr style={{ margin:'12px 0' }} />
        <button onClick={saveToDb} style={{ width:'100%', marginBottom:8 }}>Save</button>

        {/* Catalog status */}
        {catalogLoading ? (
          <div style={{ fontSize:12, color:'#64748b' }}>Loading catalog…</div>
        ) : (
          <div style={{ color:'#64748b', fontSize:12, marginTop:6 }}>
            Loaded: {forms.length} forms • {users.length} users • {reports.length} reports
          </div>
        )}
        {catalogErr && <div style={{ color:'#ef4444', marginTop:8, fontSize:12 }}>{catalogErr}</div>}
      </div>

      {/* Canvas */}
      <div style={{ border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden' }}
           onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => openEditor(node)}
          onNodeDoubleClick={(_, node) => openEditor(node)}
          fitView
          defaultEdgeOptions={edgeOptions}
          connectionLineType="straight"
        >
          <Background gap={16} />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>

        {/* Modal router */}
        {editing?.type === 'initiator' && (
          <InitiatorModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            node={editing}
            forms={forms}
            participants={(workflowMeta?.participantIds || []).map(id => users.find(u => u.id === id)).filter(Boolean)}
            onPatch={applyPatch}
          />
        )}
        {editing?.type === 'form' && (
          <FormStepModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            node={editing}
            forms={forms}
            participants={(workflowMeta?.participantIds || []).map(id => users.find(u => u.id === id)).filter(Boolean)}
            onPatch={applyPatch}
          />
        )}
        {editing?.type === 'process' && (
          <ProcessStepModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            node={editing}
            queries={queries} // [] (no endpoint)
            onPatch={applyPatch}
          />
        )}
        {editing?.type === 'evaluate' && (
          <EvaluateModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            node={editing}
            onPatch={applyPatch}
          />
        )}
      </div>

      {/* Help / Notes */}
      <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Notes</div>
        <ul style={{ paddingLeft:18, margin:0, lineHeight:1.6 }}>
          <li>Drag items from the palette onto the canvas.</li>
          <li>Click or double-click a tile to configure that step.</li>
          <li>Set master/update forms & participants in <em>Workflow Properties</em>.</li>
        </ul>
      </div>

      <WorkflowProperties
        open={propsOpen}
        onClose={() => setPropsOpen(false)}
        initial={workflowMeta}
        onSave={saveProps}
        sources={{ forms, queries, reports, users }}
        requireUnique={false}
      />
    </div>
  );
}
