// src/pages/workflows/workflowassignments.jsx
import React, { useEffect, useState } from 'react';

/* ---------- Modal ---------- */
function Modal({ open, onClose, children, width = 720 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', display:'grid', placeItems:'center', zIndex:50 }}>
      <div onClick={(e)=>e.stopPropagation()} style={{ width, maxHeight:'85vh', overflow:'auto', background:'#fff', borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        {children}
      </div>
    </div>
  );
}
const Seg = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{ padding:'8px 12px', borderRadius:8, border: active ? '1px solid #0ea5e9' : '1px solid #e2e8f0', background: active ? '#e0f2fe' : '#fff', fontWeight:600 }}>
    {children}
  </button>
);
const Card = ({ title, subtitle, meta, actions, onClick }) => (
  <div onClick={onClick} style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:12, cursor:onClick?'pointer':'default', display:'grid', gap:6 }}>
    <div style={{ fontWeight:700 }}>{title}</div>
    {subtitle && <div style={{ color:'#475569', fontSize:13 }}>{subtitle}</div>}
    {meta && <div style={{ color:'#64748b', fontSize:12 }}>{meta}</div>}
    {actions}
  </div>
);

/* ---------- Starter modal ---------- */
function StarterFormModal({ starter, setStarter, onSubmit, onClose }) {
  if (!starter.open || !starter.cfg) return null;

  let fields = [];
  try {
    fields = Array.isArray(starter.cfg?.fields_json)
      ? starter.cfg.fields_json
      : JSON.parse(starter.cfg?.fields_json ?? '[]');
  } catch { fields = []; }

  const sanitize = (s) => String(s).toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  const keyOf = (f, idx) => {
    const maybe =
      f?.name ?? f?.field ?? f?.fieldName ?? f?.field_name ??
      f?.columnName ?? f?.column ?? f?.column_name ??
      f?.dbColumn ?? f?.db_column ?? f?.key ??
      (f?.label ? sanitize(f.label) : "") ??
      (f?.caption ? sanitize(f.caption) : "");
    return (maybe ?? "") || `field_${idx}`;
  };
  const labelOf = (f) => f?.label ?? f?.caption ?? f?.title ?? f?.display ?? keyOf(f, 0);
  const typeOf = (f) => {
    const raw = (f?.inputType ?? f?.controlType ?? f?.dataType ?? f?.type ?? '').toString().toLowerCase();
    if (raw.includes('int') || raw === 'number') return 'number';
    if (raw.includes('date')) return 'date';
    if (raw.includes('bool') || raw === 'checkbox') return 'checkbox';
    return 'text';
  };
  const isEditable = (f) => !(f?.readOnly ?? false);
  const isRequired = (f) => !!(f?.required ?? f?.mandatory ?? f?.isRequired ?? false);

  const validate = () => {
    const errs = {};
    fields.forEach((f, i) => {
      const k = keyOf(f, i);
      if (!k || !isEditable(f) || f?.visible === false) return;
      if (isRequired(f) && (starter.values[k] === undefined || starter.values[k] === '')) errs[k] = 'Required';
    });
    setStarter((s) => ({ ...s, errors: errs }));
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) { alert('Enter all mandatory fields to submit the form'); return; }
    await onSubmit();
  };

  return (
    <Modal open={starter.open} onClose={onClose} width={820}>
      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h3 style={{ margin:0 }}>{starter.wf?.name} — Initiator Form</h3>
            <div style={{ color:'#64748b', fontSize:12 }}>{starter.cfg?.template_name || `Form #${starter.cfg?.id}`}</div>
          </div>
          <button onClick={onClose}>Close</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {fields.filter(f => f?.visible !== false).map((f, idx) => {
            const k = keyOf(f, idx);
            const t = typeOf(f);
            const err = starter.errors[k];
            return (
              <label key={k} style={{ display:'grid', gap:6 }}>
                <div style={{ fontSize:12, color:'#334155' }}>
                  {labelOf(f)} {isRequired(f) ? <span style={{ color:'#ef4444' }}>*</span> : null}
                </div>
                {t === 'checkbox' ? (
                  <input type="checkbox" checked={!!starter.values[k]}
                         onChange={(e)=>setStarter(s=>({ ...s, values:{...s.values, [k]: e.target.checked}, errors:{...s.errors, [k]: undefined} }))}/>
                ) : (
                  <input type={t} value={starter.values[k] ?? ''}
                         onChange={(e)=> {
                           let v = e.target.value;
                           if (t==='number' && v!=='') v = Number(v);
                           setStarter(s=>({ ...s, values:{...s.values, [k]: v}, errors:{...s.errors, [k]: undefined} }));
                         }}
                         disabled={!isEditable(f)} />
                )}
                {err && <div style={{ color:'#ef4444', fontSize:12 }}>{err}</div>}
              </label>
            );
          })}
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit} style={{ background:'#0ea5e9', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, fontWeight:700 }} disabled={starter.saving}>
            {starter.saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Main ---------- */
export default function WorkflowAssignments() {
  const [tab, setTab] = useState('outbox');
  const [view, setView] = useState('grid');
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [initiable, setInitiable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initOpen, setInitOpen] = useState(false);
  const [starter, setStarter] = useState({ open:false, wf:null, cfg:null, values:{}, errors:{}, saving:false });

  const fetchJSON = async (url, opts = {}) => {
    const token = localStorage.getItem('token');
    const headers = { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(url, { ...opts, headers });
    const t = await res.text();
    try { return { ok: res.ok, body: JSON.parse(t) }; } catch { return { ok: res.ok, body: t }; }
  };

  const getInitiatorFormId = (row) =>
    row?.initiator_form_id ??
    row?.initiatorFormId ??
    row?.workflowMeta?.initiatorFormId ??
    row?.graph?.workflowMeta?.initiatorFormId ??
    row?.config?.workflowMeta?.initiatorFormId ??
    null;

  // ------- Current user helpers -------
  const getCurrentUserId = () => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      const id = u?.user_id ?? u?.id ?? u?.userid ?? null;
      if (Number.isFinite(Number(id))) return Number(id);
    } catch {}
    try {
      const t = localStorage.getItem('token');
      if (!t) return null;
      const payload = JSON.parse(atob(t.split('.')[1] || ''));
      const id = payload?.id ?? payload?.user_id ?? payload?.sub ?? null;
      if (Number.isFinite(Number(id))) return Number(id);
    } catch {}
    return null;
  };
  const currentUserId = getCurrentUserId();

  const isInitiatedByUser = (row, uid) => {
    if (!uid) return true; // don't filter if we don't know user
    const candidates = [
      row?.initiator_id,
      row?.initiated_by,
      row?.created_by,
      row?.createdBy,
      row?.initiator,
      row?.started_by,
      row?.startedBy,
      row?.workflow_initiator,
      row?.initiatorid,
      row?.owner_id,
    ];
    return candidates.some((v) => Number(v) === uid) || row?.initiator?.id === uid;
  };

  const isAssignedToUser = (row, uid) => {
    if (!uid) return true; // don't filter if unknown
    const candidates = [
      row?.step_performer,
      row?.performer,
      row?.performer_id,
      row?.assignee_id,
      row?.assigned_to,
      row?.assignedTo,
      row?.user_id,
      row?.userid,
      row?.owner_id,
    ];
    if (candidates.some((v) => Number(v) === uid)) return true;
    if (Array.isArray(row?.assignees) && row.assignees.some((a) => Number(a?.id ?? a) === uid)) return true;
    return false;
  };

  const hydrateRows = async (rows) => {
    return await Promise.all(rows.map(async (r) => {
      let initiator_form_id = getInitiatorFormId(r);
      let version = r?.version ?? r?.graph?.workflowMeta?.version ?? r?.config?.workflowMeta?.version;
      if (!initiator_form_id || !version) {
        const det = await fetchJSON(`/api/workflows/${r.id}`);
        if (det.ok) {
          const d = det.body;
          initiator_form_id = getInitiatorFormId(d) ?? initiator_form_id;
          version = version ?? d?.version ?? d?.workflowMeta?.version ?? d?.graph?.workflowMeta?.version ?? d?.config?.workflowMeta?.version ?? 1;
        }
      }
      const name = r?.name ?? r?.graph?.workflowMeta?.name ?? r?.config?.workflowMeta?.name ?? '—';
      return { ...r, name, version: version ?? 1, initiator_form_id };
    }));
  };

  // Prefer new endpoints, fall back to legacy
  const refreshInbox = async () => {
    setLoading(true); setError('');
    let r = await fetchJSON('/api/workflows/assignments/inbox');
    if (!r.ok) r = await fetchJSON('/api/inbox');
    if (!r.ok) setError(r.body?.error || 'Failed to load inbox');
    else {
      const rows = Array.isArray(r.body) ? r.body : [];
      const filtered = rows.filter((row) => isAssignedToUser(row, currentUserId));
      setInbox(filtered);
    }
    setLoading(false);
  };
  const refreshOutbox = async () => {
    setLoading(true); setError('');
    let r = await fetchJSON('/api/workflows/assignments/outbox');
    if (!r.ok) r = await fetchJSON('/api/outbox');
    if (!r.ok) setError(r.body?.error || 'Failed to load outbox');
    else {
      const rows = Array.isArray(r.body) ? r.body : [];
      const filtered = rows.filter((row) => isInitiatedByUser(row, currentUserId));
      setOutbox(filtered);
    }
    setLoading(false);
  };
  const loadInitiable = async () => {
    let r = await fetchJSON('/api/workflows/initiable');
    if (!r.ok || !Array.isArray(r.body)) r = await fetchJSON('/api/workflows');
    if (r.ok && Array.isArray(r.body)) {
      const hydrated = await hydrateRows(r.body);
      setInitiable(hydrated);
    } else {
      alert((r.body && r.body.error) || 'Failed to load workflows');
    }
  };

  useEffect(() => { refreshInbox(); refreshOutbox(); loadInitiable(); }, []);

  // Build a clean querystring (includes recordId + rowId for compatibility)
  const openForm = (formId, instanceId, taskId, recordId) => {
    const qs = new URLSearchParams({ instanceId: String(instanceId) });
    if (taskId != null)   qs.set('taskId',   String(taskId));
    if (recordId != null) { qs.set('recordId', String(recordId)); qs.set('rowId', String(recordId)); }
    window.location.href = `/form/${formId}?${qs.toString()}`;
  };

  const loadFormConfig = async (formId) => {
    for (const url of [`/api/form-configs/${formId}`, `/api/form_configs/${formId}`]) {
      const res = await fetchJSON(url);
      if (res.ok) {
        const row = Array.isArray(res.body?.data) ? res.body.data[0] : res.body;
        if (row) return row;
      }
    }
    return null;
  };

  const initiate = async (wf) => {
    try {
      const initiatorFormId = getInitiatorFormId(wf);
      if (!initiatorFormId) { alert('No initiator form configured.'); return; }

      const cfg = await loadFormConfig(initiatorFormId);
      if (!cfg) { alert('Could not load initiator form configuration'); return; }

      setInitOpen(false);
      setStarter({ open:true, wf, cfg, values:{}, errors:{}, saving:false });
    } catch (e) {
      console.error('[initiate] failed', e);
      alert('Failed to open initiator form.');
    }
  };

  const submitStarter = async () => {
    try {
      setStarter((s) => ({ ...s, saving: true }));

      // 1) Save the master row
      const insertResp = await fetchJSON('/api/formdata/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewId: starter.cfg.id, data: starter.values }),
      });
      if (!insertResp.ok) { alert(insertResp.body?.error || 'Failed to save form'); setStarter((s)=>({ ...s, saving:false })); return; }
      const newRowId = insertResp.body?.id ?? insertResp.body?.recordId ?? insertResp.body?.insertId;
      if (!newRowId) { alert('Saved form, but no new record id was returned.'); setStarter((s)=>({ ...s, saving:false })); return; }

      // 2) Start the workflow
      const wfId = starter.wf.id ?? starter.wf.workflow_id ?? starter.wf.workflowId;
      let startResp = await fetchJSON(`/api/workflows/start/${wfId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: starter.cfg.id, masterId: newRowId }),
      });
      if (!startResp.ok) {
        startResp = await fetchJSON(`/api/workflows/${wfId}/start`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formId: starter.cfg.id, masterId: newRowId }),
        });
      }
      if (!startResp.ok) { alert(startResp.body?.error || 'Failed to start workflow'); setStarter((s)=>({ ...s, saving:false })); return; }

      // 3) Derive next step and open it
      const nextFormId  = startResp.body?.next?.formId || startResp.body?.initiatorFormId || starter.cfg.id;
      const nextTaskId  = startResp.body?.next?.taskId || startResp.body?.initiatorTaskId;
      const masterRowId = startResp.body?.masterRowId || newRowId;
      setStarter((s) => ({ ...s, open:false, saving:false }));

      if (nextFormId && startResp.body?.instanceId) {
        openForm(nextFormId, startResp.body.instanceId, nextTaskId, masterRowId);
      } else {
        await refreshInbox(); await refreshOutbox();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start workflow');
      setStarter((s) => ({ ...s, saving: false }));
    }
  };

  const grid = (items, render) => (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>{items.map(render)}</div>
  );

  const inboxRenderer = (item) => (
    <Card key={item.task_id}
      title={`${item.workflow_name}`}
      subtitle={`Task #${item.task_id} • ${item.node_type}`}
      meta={`Instance #${item.instance_id} • ${new Date(item.started_at).toLocaleString()} • ${item.instance_status}`}
      actions={<div style={{ display:'flex', gap:8 }}>
        {item.form_id && (
          <button onClick={() => openForm(item.form_id, item.instance_id, item.task_id, item.record_id)}>
            Open
          </button>
        )}
      </div>}
    />
  );

  const outboxRenderer = (item) => (
    <Card key={item.instance_id}
      title={`${item.workflow_name}`}
      subtitle={`Instance #${item.instance_id}`}
      meta={`${item.instance_status} • ${new Date(item.started_at).toLocaleString()}`}
    />
  );

  const table = (cols, rows) => (
    <div style={{ overflow:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr>{cols.map((c) => <th key={c} style={{ textAlign:'left', padding:'8px 6px', borderBottom:'1px solid #e5e7eb' }}>{c}</th>)}</tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );

  const inboxTableRows = inbox.map((x) => (
    <tr key={x.task_id}>
      <td style={{ padding:'8px 6px' }}>{x.workflow_name}</td>
      <td style={{ padding:'8px 6px' }}>#{x.task_id}</td>
      <td style={{ padding:'8px 6px' }}>{x.node_type}</td>
      <td style={{ padding:'8px 6px' }}>#{x.instance_id}</td>
      <td style={{ padding:'8px 6px' }}>{new Date(x.started_at).toLocaleString()}</td>
      <td style={{ padding:'8px 6px' }}>{x.instance_status}</td>
      <td style={{ padding:'8px 6px' }}>{x.form_id ? <button onClick={() => openForm(x.form_id, x.instance_id, x.task_id, x.record_id)}>Open</button> : '-'}</td>
    </tr>
  ));

  const outboxTableRows = outbox.map((x) => (
    <tr key={x.instance_id}>
      <td style={{ padding:'8px 6px' }}>{x.workflow_name}</td>
      <td style={{ padding:'8px 6px' }}>#{x.instance_id}</td>
      <td style={{ padding:'8px 6px' }}>{x.instance_status}</td>
      <td style={{ padding:'8px 6px' }}>{new Date(x.started_at).toLocaleString()}</td>
    </tr>
  ));

  return (
    <div style={{ padding:16, display:'grid', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', gap:8 }}>
          <Seg active={tab==='inbox'} onClick={()=>setTab('inbox')}>Inbox</Seg>
          <Seg active={tab==='outbox'} onClick={()=>setTab('outbox')}>Outbox</Seg>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Seg active={view==='grid'} onClick={()=>setView('grid')}>Grid</Seg>
          <Seg active={view==='list'} onClick={()=>setView('list')}>List</Seg>
          {tab==='outbox' && (
            <button onClick={()=>{ setInitOpen(true); loadInitiable(); }} style={{ marginLeft:12, padding:'8px 12px', background:'#0ea5e9', color:'#fff', border:'none', borderRadius:8, fontWeight:700 }}>New Workflow</button>
          )}
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div style={{ color:'#ef4444' }}>{error}</div>}

      {tab==='inbox' && (view==='grid'
        ? grid(inbox, inboxRenderer)
        : table(['Workflow','Task','Node','Instance','Started','Status','Action'], inboxTableRows))}
      {tab==='outbox' && (view==='grid'
        ? grid(outbox, outboxRenderer)
        : table(['Workflow','Instance','Status','Started'], outboxTableRows))}

      <Modal open={initOpen} onClose={()=>setInitOpen(false)}>
        <div style={{ padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ margin:0 }}>Start a Workflow</h3>
            <button onClick={()=>setInitOpen(false)}>Close</button>
          </div>
          <div style={{ marginTop:12, display:'grid', gap:8 }}>
            {initiable.length === 0 && <div style={{ color:'#64748b' }}>No workflows available.</div>}
            {initiable.map((wf) => {
              const initiatorFormId = getInitiatorFormId(wf);
              return (
                <div key={wf.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', border:'1px solid #e5e7eb', borderRadius:10, padding:10 }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{wf.name} <span style={{ color:'#64748b', fontWeight:400 }}>v{wf.version ?? 1}</span></div>
                    {initiatorFormId && <div style={{ fontSize:12, color:'#475569' }}>Initiator Form: #{initiatorFormId}</div>}
                  </div>
                  <button onClick={()=>initiate(wf)} style={{ padding:'6px 12px' }}>Initiate</button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <StarterFormModal starter={starter} setStarter={setStarter} onSubmit={submitStarter} onClose={() => setStarter((s) => ({ ...s, open: false }))}/>
    </div>
  );
}
