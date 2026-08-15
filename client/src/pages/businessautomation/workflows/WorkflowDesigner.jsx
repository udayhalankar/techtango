// src/pages/workflows/WorkflowDesigner.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, addEdge,
  useNodesState, useEdgesState, MarkerType, Handle, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import WorkflowProperties from './WorkflowProperties';
import { catalog, workflows } from './api';

/* ---------------- helpers ---------------- */
const makeId = () => Math.random().toString(36).slice(2, 9);
const useQuery = () => new URLSearchParams(useLocation().search);

/* ---------------- fallbacks ---------------- */
const fallbackForms = [
  { id: 1, name: 'Sample (Master)', type: 'Master', template: 'Sample' },
  { id: 2, name: 'Sample - Update', type: 'Update', template: 'Sample' },
];
const fallbackUsers = [{ id: 101, full_name: 'Uday Halankar' }];
const fallbackReports = [{ id: 1, report_name: 'Daily Summary' }];

/* ---------------- UI bits ---------------- */
function Tile({ tag, name, children }) {
  return (
    <div style={{
      minWidth: 220, maxWidth: 280,
      borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff',
      boxShadow: '0 2px 10px rgba(0,0,0,.06)', padding: 10
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
        <div style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {name || '(unnamed)'}
        </div>
        <span style={{ fontSize:11, background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:999, padding:'2px 6px' }}>
          {tag}
        </span>
      </div>
      {children}
    </div>
  );
}
function InitiatorNode({ data }) {
  return (
    <div>
      <Handle type="target" position={Position.Left} style={{ background:'#6366f1' }} />
      <Tile tag="Initiator" name={data.stepName || 'Initiator'}>
        {data.formId && <div style={{ marginTop:4, fontSize:12, color:'#64748b' }}>form #{data.formId}</div>}
      </Tile>
      <Handle type="source" position={Position.Right} style={{ background:'#0ea5e9' }} />
    </div>
  );
}
function FormNode({ data }) {
  return (
    <div>
      <Handle type="target" position={Position.Left} style={{ background:'#6366f1' }} />
      <Tile tag="Form" name={data.stepName || 'Form Step'}>
        {data.formId && <div style={{ marginTop:4, fontSize:12, color:'#64748b' }}>form #{data.formId}</div>}
      </Tile>
      <Handle type="source" position={Position.Right} style={{ background:'#0ea5e9' }} />
    </div>
  );
}
function ProcessNode({ data }) {
  return (
    <div>
      <Handle type="target" position={Position.Left} style={{ background:'#6366f1' }} />
      <Tile tag="Process" name={data.stepName || 'Process Step'}>
        {data.action && <div style={{ marginTop:4, fontSize:12, color:'#64748b' }}>{data.action}</div>}
      </Tile>
      <Handle type="source" position={Position.Right} style={{ background:'#0ea5e9' }} />
    </div>
  );
}
function EvaluateNode({ data }) {
  return (
    <div>
      <Handle type="target" position={Position.Left} style={{ background:'#6366f1' }} />
      <Tile tag="Evaluate" name={data.stepName || 'Evaluate'}>
        <div style={{ marginTop:4, fontSize:11, color:'#64748b' }}>TRUE / FALSE</div>
      </Tile>
      <Handle type="source" id="true" position={Position.Right} style={{ top: 10, background:'#10b981' }} />
      <Handle type="source" id="false" position={Position.Right} style={{ bottom: 10, top: 'auto', background:'#ef4444' }} />
    </div>
  );
}
const nodeTypes = { initiator: InitiatorNode, form: FormNode, process: ProcessNode, evaluate: EvaluateNode };

/* ---------------- tiny modal ---------------- */
function Modal({ open, onClose, children, width = 720, title = 'Edit' }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', display:'grid', placeItems:'center', zIndex:60 }}>
      <div onClick={(e)=>e.stopPropagation()} style={{ width, background:'#fff', borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,.2)', maxHeight:'85vh', overflow:'auto' }}>
        <div style={{ padding:16, display:'grid', gap:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ margin:0 }}>{title}</h3>
            <button onClick={onClose}>Close</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Designer ---------------- */
export default function WorkflowDesigner() {
  const navigate = useNavigate();
  const { id: wfIdParam } = useParams();
  const query = useQuery();
  const versionParam = query.get('version');

  const [catalogData, setCatalogData] = useState({
    forms: fallbackForms,
    users: fallbackUsers,
    reports: fallbackReports,
    queries: [], emails: []
  });

  const [workflowMeta, setWorkflowMeta] = useState(null); // {id?, name, description, initiatorFormId, updateFormIds, participantIds}
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const edgeOptions = useMemo(() => ({
    animated: false, markerEnd: { type: MarkerType.ArrowClosed }, type: 'straight',
  }), []);
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...edgeOptions, ...params }, eds)),
    [edgeOptions]
  );

  // 🔧 keep only node id in modal state so fields always reflect latest node data
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [propsOpen, setPropsOpen] = useState(false);
  const idRef = useRef(1);

  /* -------- catalog (real endpoints only) -------- */
  useEffect(() => {
    (async () => {
      try {
        const [forms, reports, users] = await Promise.all([
          catalog.forms(), catalog.reports(), catalog.users()
        ]);
        const mappedForms = (forms || []).map(row => ({
          id: row.id,
          name: row.type === 'Master' ? row.template_name : `${row.template_name} - Update`,
          type: row.type,
          template: row.template_name,
        }));
        setCatalogData((prev) => ({
          ...prev,
          forms: mappedForms,
          reports: reports || [],
          users: (users || []).map(u => ({ id: u.id, full_name: u.full_name })),
        }));
      } catch (e) {
        console.warn('[designer] catalog load failed, using fallbacks', e);
      }
    })();
  }, []);

  /* -------- load existing graph when /:id -------- */
  useEffect(() => {
    if (!wfIdParam) return;
    (async () => {
      try {
        const graph = await workflows.get(wfIdParam, versionParam || undefined);
        setWorkflowMeta(graph.workflowMeta || null);

        setNodes((graph.nodes || []).map(n => ({
          ...n,
          id: String(n.id),
          data: {
            ...(n.data || {}),
            onChange: (patch) =>
              setNodes(ns => ns.map(nx => nx.id === String(n.id) ? { ...nx, data: { ...nx.data, ...patch } } : nx)),
          },
        })));
        setEdges((graph.edges || []).map(e => ({ ...e, id: e.id || `${e.source}-${e.target}-${makeId()}` })));

        const maxId = Math.max(0, ...(graph.nodes || []).map(n => Number(n.id) || 0));
        idRef.current = Math.max(idRef.current, maxId + 1);
      } catch (e) {
        alert('Load failed: ' + e.message);
      }
    })();
  }, [wfIdParam, versionParam, setNodes, setEdges]);

  /* -------- allowed update forms (for form step) -------- */
  const allowedUpdateForms = useMemo(() => {
    const ids = new Set(workflowMeta?.updateFormIds || []);
    return catalogData.forms.filter(f => ids.has(f.id));
  }, [workflowMeta, catalogData.forms]);

  useEffect(() => {
    setNodes(ns => ns.map(n => {
      const base = { ...n, data: { ...n.data, forms: catalogData.forms, allowedForms: allowedUpdateForms } };
      // keep Initiator node's formId synced with Properties
      if (n.type === 'initiator' && workflowMeta?.initiatorFormId && n.data?.formId !== workflowMeta.initiatorFormId) {
        base.data.formId = workflowMeta.initiatorFormId;
      }
      return base;
    }));
  }, [allowedUpdateForms, catalogData.forms, workflowMeta?.initiatorFormId, setNodes]);

  /* -------- validation -------- */
  const validate = () => {
    const inits = nodes.filter(n => n.type === 'initiator');
    if (inits.length !== 1) return 'Workflow must have exactly one Initiator.';
    const evalErrors = nodes
      .filter(n => n.type === 'evaluate')
      .map(n => {
        const outs = edges.filter(e => e.source === n.id);
        const hasT = outs.some(e => e.sourceHandle === 'true');
        const hasF = outs.some(e => e.sourceHandle === 'false');
        return hasT && hasF ? null : `Evaluate node ${n.id} must have TRUE and FALSE connections.`;
      })
      .filter(Boolean);
    if (evalErrors.length) return evalErrors.join('\n');
    if (!(workflowMeta?.initiatorFormId)) return 'Pick a Master (Initiator form) in Workflow Properties.';
    return '';
  };

  /* -------- build the exact server payload shape -------- */
  const serializeNodes = () =>
    nodes.map(({ id, type, position, data }) => {
      const {
        stepType, stepName, formId,
        recipients, notifyAssignee, notifyAlso,
        action, resourceId, folderName,
        condition
      } = data || {};
      return { id, type, position, data: { stepType, stepName, formId, recipients, notifyAssignee, notifyAlso, action, resourceId, folderName, condition } };
    });

  const buildGraphPayload = () => ({
    workflowMeta: { ...(workflowMeta || {}) },
    nodes: serializeNodes(),
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || null })),
  });

  const saveNew = async () => {
    const out = await workflows.create(buildGraphPayload());
    if (out?.workflowId) {
      setWorkflowMeta(m => ({ ...(m || {}), id: out.workflowId, version: out.version || 1 }));
      navigate(`/wfdesigner/${out.workflowId}`, { replace: true });
    }
    alert(`Saved${out?.version ? ` as v${out.version}` : ''}`);
  };

  const saveExisting = async () => {
    await workflows.update(workflowMeta.id, {
      name: workflowMeta?.name,
      description: workflowMeta?.description || '',
      ...buildGraphPayload(),
    });
    alert('Saved');
  };

  const onSaveToDb = async () => {
    const msg = validate();
    if (msg) { alert(msg); return; }
    const nm = (workflowMeta?.name || '').trim();
    if (!nm) { alert('Workflow name is required (open Workflow Properties).'); return; }
    try {
      if (workflowMeta?.id) await saveExisting();
      else await saveNew();
    } catch (e) {
      console.error(e);
      alert('Save failed: ' + (e?.message || e));
    }
  };

  /* -------- DnD -------- */
  const withDefaults = (type, position) => {
    const id = (idRef.current++).toString();
    const data = {
      stepType: type,
      stepName: '',
      onChange: patch => setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      forms: catalogData.forms,
      allowedForms: allowedUpdateForms,
      recipients: [],
      notifyAssignee: true,
      notifyAlso: [],
      condition: ''
    };
    if (type === 'initiator' && workflowMeta?.initiatorFormId) data.formId = workflowMeta.initiatorFormId;
    return { id, type, position, data };
  };
  const onDrop = (evt) => {
    evt.preventDefault();
    const t = evt.dataTransfer.getData('application/reactflow');
    if (!t) return;
    if (t === 'initiator' && nodes.some(n => n.type === 'initiator')) return alert('Only one Initiator step is allowed.');
    const bounds = evt.currentTarget.getBoundingClientRect();
    const position = { x: evt.clientX - bounds.left - 80, y: evt.clientY - bounds.top - 20 };
    setNodes(ns => ns.concat(withDefaults(t, position)));
  };
  const onDragOver = (evt) => { evt.preventDefault(); evt.dataTransfer.dropEffect = 'move'; };

  /* -------- editors -------- */
  const openEditor = (_, node) => { setEditingId(node?.id || null); setEditOpen(true); };
  const closeEditor = () => { setEditOpen(false); setEditingId(null); };

  // current node from state (so inputs reflect latest data)
  const currentNode = useMemo(
    () => (editingId ? nodes.find(n => n.id === editingId) : null),
    [editingId, nodes]
  );

  /* -------- recipient helpers -------- */
  const onMultiSelect = (e, key) => {
    const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
    currentNode?.data.onChange?.({ [key]: vals });
  };
  const onCheckbox = (e, key) => {
    currentNode?.data.onChange?.({ [key]: !!e.target.checked });
  };

  /* -------- UI -------- */
  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 280px', height:'calc(100vh - 32px)', gap:12, padding:12 }}>
      {/* Palette */}
      <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
        <button onClick={()=>setPropsOpen(true)} style={{ width:'100%', padding:10, marginBottom:10, fontWeight:600 }}>
          Workflow Properties
        </button>

        {[
          { type:'initiator', label:'Initiator' },
          { type:'form',      label:'Form Step' },
          { type:'process',   label:'Process Step' },
          { type:'evaluate',  label:'Evaluate' },
        ].map(p => (
          <div
            key={p.type}
            draggable
            onDragStart={(e)=>e.dataTransfer.setData('application/reactflow', p.type)}
            style={{ padding:'10px 12px', border:'1px dashed #94a3b8', borderRadius:8, marginBottom:8, cursor:'grab', background:'#f8fafc' }}
            title="Drag to canvas"
          >{p.label}</div>
        ))}

        <hr style={{ margin:'12px 0' }} />
        <button onClick={onSaveToDb} style={{ width:'100%', marginBottom:8 }}>Save</button>
      </div>

      {/* Canvas */}
      <div style={{ border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden' }} onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={edgeOptions}
          onNodeDoubleClick={openEditor}
          fitView
          connectionLineType="straight"
        >
          <Background gap={16} />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </div>

      {/* Right help */}
      <div style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:12 }}>
        <div style={{ fontWeight:600, marginBottom:8 }}>Notes</div>
        <ul style={{ paddingLeft:18, margin:0, lineHeight:1.6 }}>
          <li>Open <b>Workflow Properties</b> first (unique name, master form, update forms, participants).</li>
          <li><b>Initiator</b> shows only the master selected in Properties.</li>
          <li><b>Form Step</b> lists only the allowed Update forms.</li>
          <li>Double-click a node to edit; Step Name now updates live.</li>
        </ul>
      </div>

      {/* Properties */}
      <WorkflowProperties
        open={propsOpen}
        onClose={()=>setPropsOpen(false)}
        initial={workflowMeta}
        onSave={(meta)=>{
          setWorkflowMeta(meta);
          const allowedIds = new Set(meta.updateFormIds || []);
          const allowed = catalogData.forms.filter(f => allowedIds.has(f.id));
          setNodes(ns => ns.map(n => n.type === 'form'
            ? { ...n, data: { ...n.data, allowedForms: allowed } }
            : n.type === 'initiator'
              ? { ...n, data: { ...n.data, formId: meta.initiatorFormId } }
              : n
          ));
        }}
        sources={{
          forms: catalogData.forms,
          queries: [],
          reports: catalogData.reports,
          users: catalogData.users,
        }}
      />

      {/* Step editor */}
      <Modal
        open={editOpen}
        onClose={closeEditor}
        title={
          currentNode?.type === 'initiator' ? 'Initiator — Step'
          : currentNode?.type === 'form'    ? 'Form Step — Step'
          : currentNode?.type === 'process' ? 'Process Step — Step'
          : currentNode?.type === 'evaluate'? 'Evaluate — Step'
          : 'Edit Step'
        }
      >
        {!currentNode ? null : (
          <div style={{ display:'grid', gap:12 }}>
            {/* Step name (now bound to live node data) */}
            <label>
              <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Step Name</div>
              <input
                value={currentNode.data.stepName || ''}
                onChange={(e)=>currentNode.data.onChange?.({ stepName: e.target.value })}
                style={{ width:'100%' }}
              />
            </label>

            {/* Initiator specifics */}
            {currentNode.type === 'initiator' && (
              <>
                <label>
                  <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Master Form</div>
                  <select
                    value={workflowMeta?.initiatorFormId || ''}
                    onChange={(e)=> {
                      const val = Number(e.target.value) || null;
                      setWorkflowMeta(m => ({ ...(m||{}), initiatorFormId: val }));
                      currentNode.data.onChange?.({ formId: val });
                    }}
                    style={{ width:'100%' }}
                    disabled // only the selected master is available here
                  >
                    <option value="">{workflowMeta?.initiatorFormId ? '—' : 'Set in Workflow Properties —'}</option>
                    {workflowMeta?.initiatorFormId ? (
                      catalogData.forms
                        .filter(f => f.type === 'Master' && f.id === workflowMeta.initiatorFormId)
                        .map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                    ) : null}
                  </select>
                </label>

                {/* Recipients & notifications */}
                <label>
                  <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Assignee</div>
                  <select
                    multiple
                    value={(currentNode.data.recipients || []).map(String)}
                    onChange={(e)=>onMultiSelect(e, 'recipients')}
                    style={{ width:'100%', minHeight:90 }}
                  >
                    {catalogData.users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </label>

                <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input
                    type="checkbox"
                    checked={!!currentNode.data.notifyAssignee}
                    onChange={(e)=>onCheckbox(e, 'notifyAssignee')}
                  />
                  <span style={{ fontSize:12, color:'#334155' }}>Notify assignee</span>
                </label>

                <label>
                  <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Notify also</div>
                  <select
                    multiple
                    value={(currentNode.data.notifyAlso || []).map(String)}
                    onChange={(e)=>onMultiSelect(e, 'notifyAlso')}
                    style={{ width:'100%', minHeight:90 }}
                  >
                    {catalogData.users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </label>
              </>
            )}

            {/* Form step specifics */}
            {currentNode.type === 'form' && (
              <>
                <label>
                  <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Update Form (allowed)</div>
                  <select
                    value={currentNode.data.formId || ''}
                    onChange={(e)=>currentNode.data.onChange?.({ formId: Number(e.target.value) || null })}
                    style={{ width:'100%' }}
                  >
                    <option value="">— Choose update form —</option>
                    {(currentNode.data.allowedForms || []).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Assignee</div>
                  <select
                    multiple
                    value={(currentNode.data.recipients || []).map(String)}
                    onChange={(e)=>onMultiSelect(e, 'recipients')}
                    style={{ width:'100%', minHeight:90 }}
                  >
                    {catalogData.users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </label>

                <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input
                    type="checkbox"
                    checked={!!currentNode.data.notifyAssignee}
                    onChange={(e)=>onCheckbox(e, 'notifyAssignee')}
                  />
                  <span style={{ fontSize:12, color:'#334155' }}>Notify assignee</span>
                </label>

                <label>
                  <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Notify also</div>
                  <select
                    multiple
                    value={(currentNode.data.notifyAlso || []).map(String)}
                    onChange={(e)=>onMultiSelect(e, 'notifyAlso')}
                    style={{ width:'100%', minHeight:90 }}
                  >
                    {catalogData.users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </label>
              </>
            )}

            {/* Process step (unchanged core, safe) */}
            {currentNode.type === 'process' && (
              <>
                <label>
                  <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Action</div>
                  <select
                    value={currentNode.data.action || 'sendEmail'}
                    onChange={(e)=>currentNode.data.onChange?.({ action: e.target.value, resourceId: null })}
                    style={{ width:'100%' }}
                  >
                    <option value="sendEmail">Send Email</option>
                    <option value="runQuery">Run Query</option>
                    <option value="createFolder">Create Folder</option>
                  </select>
                </label>
              </>
            )}

            {/* Evaluate step (light, non-breaking) */}
            {currentNode.type === 'evaluate' && (
              <label>
                <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Condition (optional)</div>
                <input
                  placeholder="e.g., amount > 1000"
                  value={currentNode.data.condition || ''}
                  onChange={(e)=>currentNode.data.onChange?.({ condition: e.target.value })}
                  style={{ width:'100%' }}
                />
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}


// // src/pages/workflows/WorkflowDesigner.jsx
// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import ReactFlow, {
//   Background, Controls, MiniMap, addEdge,
//   useNodesState, useEdgesState, MarkerType, Handle, Position
// } from 'reactflow';
// import 'reactflow/dist/style.css';
// import { useLocation, useNavigate, useParams } from 'react-router-dom';
// import WorkflowProperties from './WorkflowProperties';
// import { catalog, workflows } from './api';

// /* ---------------- helpers ---------------- */
// const makeId = () => Math.random().toString(36).slice(2, 9);
// const useQuery = () => new URLSearchParams(useLocation().search);

// /* ---------------- fallbacks ---------------- */
// const fallbackForms = [
//   { id: 1, name: 'Sample (Master)', type: 'Master', template: 'Sample' },
//   { id: 2, name: 'Sample - Update', type: 'Update', template: 'Sample' },
// ];
// const fallbackUsers = [{ id: 101, full_name: 'Uday Halankar' }];
// const fallbackReports = [{ id: 1, report_name: 'Daily Summary' }];

// /* ---------------- compact tile nodes ---------------- */
// function Tile({ tag, name, children }) {
//   return (
//     <div style={{
//       minWidth: 220, maxWidth: 280,
//       borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff',
//       boxShadow: '0 2px 10px rgba(0,0,0,.06)', padding: 10
//     }}>
//       <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
//         <div style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
//           {name || '(unnamed)'}
//         </div>
//         <span style={{ fontSize:11, background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:999, padding:'2px 6px' }}>
//           {tag}
//         </span>
//       </div>
//       {children}
//     </div>
//   );
// }
// function InitiatorNode({ data }) {
//   return (
//     <div>
//       <Handle type="target" position={Position.Left} style={{ background:'#6366f1' }} />
//       <Tile tag="Initiator" name={data.stepName || 'Initiator'}>
//         {data.formId && <div style={{ marginTop:4, fontSize:12, color:'#64748b' }}>form #{data.formId}</div>}
//       </Tile>
//       <Handle type="source" position={Position.Right} style={{ background:'#0ea5e9' }} />
//     </div>
//   );
// }
// function FormNode({ data }) {
//   return (
//     <div>
//       <Handle type="target" position={Position.Left} style={{ background:'#6366f1' }} />
//       <Tile tag="Form" name={data.stepName || 'Form Step'}>
//         {data.formId && <div style={{ marginTop:4, fontSize:12, color:'#64748b' }}>form #{data.formId}</div>}
//       </Tile>
//       <Handle type="source" position={Position.Right} style={{ background:'#0ea5e9' }} />
//     </div>
//   );
// }
// function ProcessNode({ data }) {
//   return (
//     <div>
//       <Handle type="target" position={Position.Left} style={{ background:'#6366f1' }} />
//       <Tile tag="Process" name={data.stepName || 'Process Step'}>
//         {data.action && <div style={{ marginTop:4, fontSize:12, color:'#64748b' }}>{data.action}</div>}
//       </Tile>
//       <Handle type="source" position={Position.Right} style={{ background:'#0ea5e9' }} />
//     </div>
//   );
// }
// function EvaluateNode({ data }) {
//   return (
//     <div>
//       <Handle type="target" position={Position.Left} style={{ background:'#6366f1' }} />
//       <Tile tag="Evaluate" name={data.stepName || 'Evaluate'}>
//         <div style={{ marginTop:4, fontSize:11, color:'#64748b' }}>TRUE / FALSE</div>
//       </Tile>
//       <Handle type="source" id="true" position={Position.Right} style={{ top: 10, background:'#10b981' }} />
//       <Handle type="source" id="false" position={Position.Right} style={{ bottom: 10, top: 'auto', background:'#ef4444' }} />
//     </div>
//   );
// }
// const nodeTypes = { initiator: InitiatorNode, form: FormNode, process: ProcessNode, evaluate: EvaluateNode };

// /* ---------------- tiny modal ---------------- */
// function Modal({ open, onClose, children, width = 680, title = 'Edit' }) {
//   if (!open) return null;
//   return (
//     <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', display:'grid', placeItems:'center', zIndex:60 }}>
//       <div onClick={(e)=>e.stopPropagation()} style={{ width, background:'#fff', borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,.2)', maxHeight:'85vh', overflow:'auto' }}>
//         <div style={{ padding:16, display:'grid', gap:12 }}>
//           <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
//             <h3 style={{ margin:0 }}>{title}</h3>
//             <button onClick={onClose}>Close</button>
//           </div>
//           {children}
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ---------------- Designer ---------------- */
// export default function WorkflowDesigner() {
//   const navigate = useNavigate();
//   const { id: wfIdParam } = useParams();
//   const query = useQuery();
//   const versionParam = query.get('version');

//   const [catalogData, setCatalogData] = useState({
//     forms: fallbackForms,
//     users: fallbackUsers,
//     reports: fallbackReports,
//     queries: [], emails: []
//   });

//   const [workflowMeta, setWorkflowMeta] = useState(null); // {id?, name, description, initiatorFormId, updateFormIds, participantIds}
//   const [nodes, setNodes, onNodesChange] = useNodesState([]);
//   const [edges, setEdges, onEdgesChange] = useEdgesState([]);
//   const edgeOptions = useMemo(() => ({
//     animated: false, markerEnd: { type: MarkerType.ArrowClosed }, type: 'straight',
//   }), []);
//   const onConnect = useCallback(
//     (params) => setEdges((eds) => addEdge({ ...edgeOptions, ...params }, eds)),
//     [edgeOptions]
//   );
//   const [propsOpen, setPropsOpen] = useState(false);
//   const [editOpen, setEditOpen] = useState(false);
//   const [editingNode, setEditingNode] = useState(null);
//   const idRef = useRef(1);

//   /* -------- catalog (real endpoints only) -------- */
//   useEffect(() => {
//     (async () => {
//       try {
//         const [forms, reports, users] = await Promise.all([
//           catalog.forms(), catalog.reports(), catalog.users()
//         ]);
//         const mappedForms = (forms || []).map(row => ({
//           id: row.id,
//           name: row.type === 'Master' ? row.template_name : `${row.template_name} - Update`,
//           type: row.type,
//           template: row.template_name,
//         }));
//         setCatalogData((prev) => ({
//           ...prev,
//           forms: mappedForms,
//           reports: reports || [],
//           users: (users || []).map(u => ({ id: u.id, full_name: u.full_name })),
//         }));
//       } catch (e) {
//         console.warn('[designer] catalog load failed, using fallbacks', e);
//       }
//     })();
//   }, []);

//   /* -------- load existing graph when /:id -------- */
//   useEffect(() => {
//     if (!wfIdParam) return;
//     (async () => {
//       try {
//         const graph = await workflows.get(wfIdParam, versionParam || undefined);
//         // graph shape: { workflowMeta, nodes, edges }
//         setWorkflowMeta(graph.workflowMeta || null);

//         setNodes((graph.nodes || []).map(n => ({
//           ...n,
//           id: String(n.id),
//           data: {
//             ...(n.data || {}),
//             onChange: (patch) =>
//               setNodes(ns => ns.map(nx => nx.id === String(n.id) ? { ...nx, data: { ...nx.data, ...patch } } : nx)),
//           },
//         })));
//         setEdges((graph.edges || []).map(e => ({ ...e, id: e.id || `${e.source}-${e.target}-${makeId()}` })));

//         const maxId = Math.max(0, ...(graph.nodes || []).map(n => Number(n.id) || 0));
//         idRef.current = Math.max(idRef.current, maxId + 1);
//       } catch (e) {
//         alert('Load failed: ' + e.message);
//       }
//     })();
//   }, [wfIdParam, versionParam, setNodes, setEdges]);

//   /* -------- allowed update forms (for form step) -------- */
//   const allowedUpdateForms = useMemo(() => {
//     const ids = new Set(workflowMeta?.updateFormIds || []);
//     return catalogData.forms.filter(f => ids.has(f.id));
//   }, [workflowMeta, catalogData.forms]);

//   useEffect(() => {
//     setNodes(ns => ns.map(n => n.type === 'form'
//       ? { ...n, data: { ...n.data, forms: catalogData.forms, allowedForms: allowedUpdateForms } }
//       : n.type === 'initiator'
//         ? { ...n, data: { ...n.data, forms: catalogData.forms, allowedForms: allowedUpdateForms } }
//         : n));
//   }, [allowedUpdateForms, catalogData.forms, setNodes]);

//   /* -------- validation -------- */
//   const validate = () => {
//     const inits = nodes.filter(n => n.type === 'initiator');
//     if (inits.length !== 1) return 'Workflow must have exactly one Initiator.';
//     const evalErrors = nodes
//       .filter(n => n.type === 'evaluate')
//       .map(n => {
//         const outs = edges.filter(e => e.source === n.id);
//         const hasT = outs.some(e => e.sourceHandle === 'true');
//         const hasF = outs.some(e => e.sourceHandle === 'false');
//         return hasT && hasF ? null : `Evaluate node ${n.id} must have TRUE and FALSE connections.`;
//       })
//       .filter(Boolean);
//     if (evalErrors.length) return evalErrors.join('\n');
//     if (!(workflowMeta?.initiatorFormId)) return 'Pick a Master (Initiator form) in Workflow Properties.';
//     return '';
//   };

//   /* -------- build the exact server payload shape -------- */
//   const serializeNodes = () =>
//     nodes.map(({ id, type, position, data }) => {
//       const {
//         stepType, stepName, formId,
//         recipients, notifyAssignee, notifyAlso,
//         action, resourceId, folderName
//       } = data || {};
//       return { id, type, position, data: { stepType, stepName, formId, recipients, notifyAssignee, notifyAlso, action, resourceId, folderName } };
//     });

//   const buildGraphPayload = () => ({
//     workflowMeta: { ...(workflowMeta || {}) },
//     nodes: serializeNodes(),
//     edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || null })),
//   });

//   const saveNew = async () => {
//     const out = await workflows.create(buildGraphPayload());
//     if (out?.workflowId) {
//       setWorkflowMeta(m => ({ ...(m || {}), id: out.workflowId, version: out.version || 1 }));
//       navigate(`/wfdesigner/${out.workflowId}`, { replace: true });
//     }
//     alert(`Saved${out?.version ? ` as v${out.version}` : ''}`);
//   };

//   const saveExisting = async () => {
//     await workflows.update(workflowMeta.id, {
//       name: workflowMeta?.name,
//       description: workflowMeta?.description || '',
//       ...buildGraphPayload(),
//     });
//     alert('Saved');
//   };

//   const onSaveToDb = async () => {
//     const msg = validate();
//     if (msg) { alert(msg); return; }
//     const nm = (workflowMeta?.name || '').trim();
//     if (!nm) { alert('Workflow name is required (open Workflow Properties).'); return; }
//     try {
//       if (workflowMeta?.id) await saveExisting();
//       else await saveNew();
//     } catch (e) {
//       console.error(e);
//       alert('Save failed: ' + (e?.message || e));
//     }
//   };

//   /* -------- DnD -------- */
//   const withDefaults = (type, position) => {
//     const id = (idRef.current++).toString();
//     const data = {
//       stepType: type,
//       stepName: '',
//       onChange: patch => setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
//       forms: catalogData.forms,
//       allowedForms: allowedUpdateForms,
//       recipients: [],
//       notifyAssignee: true,
//       notifyAlso: [],
//     };
//     if (type === 'initiator' && workflowMeta?.initiatorFormId) data.formId = workflowMeta.initiatorFormId;
//     return { id, type, position, data };
//   };
//   const onDrop = (evt) => {
//     evt.preventDefault();
//     const t = evt.dataTransfer.getData('application/reactflow');
//     if (!t) return;
//     if (t === 'initiator' && nodes.some(n => n.type === 'initiator')) return alert('Only one Initiator step is allowed.');
//     const bounds = evt.currentTarget.getBoundingClientRect();
//     const position = { x: evt.clientX - bounds.left - 80, y: evt.clientY - bounds.top - 20 };
//     setNodes(ns => ns.concat(withDefaults(t, position)));
//   };
//   const onDragOver = (evt) => { evt.preventDefault(); evt.dataTransfer.dropEffect = 'move'; };

//   /* -------- editors -------- */
//   const openEditor = (_, node) => { setEditingNode(node); setEditOpen(true); };
//   const closeEditor = () => { setEditOpen(false); setEditingNode(null); };

//   /* -------- UI -------- */
//   return (
//     <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 280px', height:'calc(100vh - 32px)', gap:12, padding:12 }}>
//       {/* Palette */}
//       <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
//         <button onClick={()=>setPropsOpen(true)} style={{ width:'100%', padding:10, marginBottom:10, fontWeight:600 }}>
//           Workflow Properties
//         </button>

//         {[
//           { type:'initiator', label:'Initiator' },
//           { type:'form',      label:'Form Step' },
//           { type:'process',   label:'Process Step' },
//           { type:'evaluate',  label:'Evaluate' },
//         ].map(p => (
//           <div
//             key={p.type}
//             draggable
//             onDragStart={(e)=>e.dataTransfer.setData('application/reactflow', p.type)}
//             style={{ padding:'10px 12px', border:'1px dashed #94a3b8', borderRadius:8, marginBottom:8, cursor:'grab', background:'#f8fafc' }}
//             title="Drag to canvas"
//           >{p.label}</div>
//         ))}

//         <hr style={{ margin:'12px 0' }} />
//         <button onClick={onSaveToDb} style={{ width:'100%', marginBottom:8 }}>Save</button>
//       </div>

//       {/* Canvas */}
//       <div style={{ border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden' }} onDrop={onDrop} onDragOver={onDragOver}>
//         <ReactFlow
//           nodes={nodes}
//           edges={edges}
//           onNodesChange={onNodesChange}
//           onEdgesChange={onEdgesChange}
//           onConnect={onConnect}
//           nodeTypes={nodeTypes}
//           defaultEdgeOptions={edgeOptions}
//           onNodeDoubleClick={openEditor}
//           fitView
//           connectionLineType="straight"
//         >
//           <Background gap={16} />
//           <MiniMap pannable zoomable />
//           <Controls />
//         </ReactFlow>
//       </div>

//       {/* Right help */}
//       <div style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:12 }}>
//         <div style={{ fontWeight:600, marginBottom:8 }}>Notes</div>
//         <ul style={{ paddingLeft:18, margin:0, lineHeight:1.6 }}>
//           <li>Open <b>Workflow Properties</b> first (unique name, master form, update forms, participants).</li>
//           <li>Initiator step will use the selected Master from Properties.</li>
//           <li>Form steps list only the allowed Update forms.</li>
//           <li>Double-click a node to edit.</li>
//         </ul>
//       </div>

//       {/* Properties */}
//       <WorkflowProperties
//         open={propsOpen}
//         onClose={()=>setPropsOpen(false)}
//         initial={workflowMeta}
//         onSave={(meta)=>{
//           setWorkflowMeta(meta);
//           const allowedIds = new Set(meta.updateFormIds || []);
//           const allowed = catalogData.forms.filter(f => allowedIds.has(f.id));
//           setNodes(ns => ns.map(n => n.type === 'form'
//             ? { ...n, data: { ...n.data, allowedForms: allowed } }
//             : n.type === 'initiator'
//               ? { ...n, data: { ...n.data, formId: meta.initiatorFormId } }
//               : n
//           ));
//         }}
//         sources={{
//           forms: catalogData.forms,
//           queries: [],
//           reports: catalogData.reports,
//           users: catalogData.users,
//         }}
//       />

//       {/* Step editor */}
//       <Modal
//         open={editOpen}
//         onClose={closeEditor}
//         title={
//           editingNode?.type === 'initiator' ? 'Initiator — Step'
//           : editingNode?.type === 'form'    ? 'Form Step — Step'
//           : editingNode?.type === 'process' ? 'Process Step — Step'
//           : editingNode?.type === 'evaluate'? 'Evaluate — Step'
//           : 'Edit Step'
//         }
//       >
//         {!editingNode ? null : (
//           <div style={{ display:'grid', gap:12 }}>
//             {/* step name */}
//             <label>
//               <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Step Name</div>
//               <input
//                 value={editingNode.data.stepName || ''}
//                 onChange={(e)=>editingNode.data.onChange?.({ stepName: e.target.value })}
//                 style={{ width:'100%' }}
//               />
//             </label>

//             {/* initiator */}
//             {editingNode.type === 'initiator' && (
//               <label>
//                 <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Master Form (from properties)</div>
//                 <select
//                   value={workflowMeta?.initiatorFormId || ''}
//                   onChange={(e)=> {
//                     const val = Number(e.target.value) || null;
//                     setWorkflowMeta(m => ({ ...(m||{}), initiatorFormId: val }));
//                     editingNode.data.onChange?.({ formId: val });
//                   }}
//                   style={{ width:'100%' }}
//                 >
//                   <option value="">— Set master in Workflow Properties —</option>
//                   {catalogData.forms.filter(f=>f.type==='Master').map(f => (
//                     <option key={f.id} value={f.id}>{f.name}</option>
//                   ))}
//                 </select>
//               </label>
//             )}

//             {/* form step */}
//             {editingNode.type === 'form' && (
//               <label>
//                 <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Update Form (allowed)</div>
//                 <select
//                   value={editingNode.data.formId || ''}
//                   onChange={(e)=>editingNode.data.onChange?.({ formId: Number(e.target.value) || null })}
//                   style={{ width:'100%' }}
//                 >
//                   <option value="">— Choose update form —</option>
//                   {(editingNode.data.allowedForms || []).map(f => (
//                     <option key={f.id} value={f.id}>{f.name}</option>
//                   ))}
//                 </select>
//               </label>
//             )}

//             {/* process step (placeholder) */}
//             {editingNode.type === 'process' && (
//               <>
//                 <label>
//                   <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Action</div>
//                   <select
//                     value={editingNode.data.action || 'sendEmail'}
//                     onChange={(e)=>editingNode.data.onChange?.({ action: e.target.value, resourceId: null })}
//                     style={{ width:'100%' }}
//                   >
//                     <option value="sendEmail">Send Email</option>
//                     <option value="runQuery">Run Query</option>
//                     <option value="createFolder">Create Folder</option>
//                   </select>
//                 </label>
//               </>
//             )}

//             {editingNode.type === 'evaluate' && (
//               <div style={{ fontSize:12, color:'#64748b' }}>(Add condition editor later.)</div>
//             )}
//           </div>
//         )}
//       </Modal>
//     </div>
//   );
// }
