// src/pages/workflows/WorkflowProperties.jsx
import React, { useEffect, useMemo, useState } from 'react';

const Tab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 12px',
      background: 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #0ea5e9' : '2px solid transparent',
      fontWeight: 600,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

const Modal = ({ open, onClose, children, width = 760 }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(15,23,42,.45)',
        display:'grid', placeItems:'center', zIndex:50
      }}
    >
      <div
        onClick={(e)=>e.stopPropagation()}
        style={{
          width, background:'#fff', borderRadius:12,
          boxShadow:'0 20px 60px rgba(0,0,0,.2)',
          maxHeight:'85vh', overflow:'auto'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default function WorkflowProperties({
  open,
  onClose,
  initial,          // { id?, name, description, initiatorFormId, updateFormIds, queryIds, reportIds, participantIds }
  sources,          // { forms, queries, reports, users }
  onSave,           // (meta) => void
  requireUnique = true,
  onValidateUniqueName, // optional async (name, excludeId?) => true/false
}) {
  // Hooks first
  const [tab, setTab] = useState('general');
  const [name, setName] = useState(initial?.name || '');
  const [nameErr, setNameErr] = useState('');
  const [desc, setDesc] = useState(initial?.description || '');
  const [initiatorFormId, setInitiatorFormId] = useState(initial?.initiatorFormId || '');
  const [updateFormIds, setUpdateFormIds] = useState(initial?.updateFormIds || []);
  const [queryIds, setQueryIds] = useState(initial?.queryIds || []);
  const [reportIds, setReportIds] = useState(initial?.reportIds || []);
  const [participantIds, setParticipantIds] = useState(initial?.participantIds || []);

  // Reset when opened with different initial
  useEffect(() => {
    if (!open) return;
    setTab('general');
    setName(initial?.name || '');
    setNameErr('');
    setDesc(initial?.description || '');
    setInitiatorFormId(initial?.initiatorFormId || '');
    setUpdateFormIds(initial?.updateFormIds || []);
    setQueryIds(initial?.queryIds || []);
    setReportIds(initial?.reportIds || []);
    setParticipantIds(initial?.participantIds || []);
  }, [open, initial]);

  // Allowed update forms = same template as selected master
  const initForm = useMemo(
    () => (sources.forms || []).find(f => f.id === Number(initiatorFormId) && f.type === 'Master'),
    [initiatorFormId, sources.forms]
  );

  const allowedUpdates = useMemo(
    () => initForm
      ? (sources.forms || []).filter(f => f.type === 'Update' && f.template === initForm.template)
      : [],
    [initForm, sources.forms]
  );

  // prune incompatible update forms when master changes
  useEffect(() => {
    if (!initForm) return;
    const ok = new Set(allowedUpdates.map(f => f.id));
    setUpdateFormIds(prev => prev.filter(id => ok.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initiatorFormId]);

  // optional unique check
  const checkUnique = async (proposed) => {
    if (!requireUnique || !proposed.trim() || !onValidateUniqueName) {
      setNameErr('');
      return;
    }
    try {
      const ok = await onValidateUniqueName(proposed.trim(), initial?.id);
      setNameErr(ok ? '' : 'Workflow name already exists.');
    } catch {
      setNameErr(''); // do not block on validation outages
    }
  };

  const save = async () => {
    if (!name.trim()) return alert('Workflow name is required');
    if (!initiatorFormId) return alert('Select an Initiator (Master) form');
    if (nameErr) return alert(nameErr);

    if (requireUnique && onValidateUniqueName) {
      const ok = await onValidateUniqueName(name.trim(), initial?.id);
      if (!ok) return setNameErr('Workflow name already exists.');
    }

    onSave({
      ...initial,
      name: name.trim(),
      description: desc,
      initiatorFormId: Number(initiatorFormId),
      updateFormIds,
      queryIds,
      reportIds,
      participantIds,
    });
    onClose?.();
  };

  // Safe to return here; hooks already ran
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0 }}>Workflow Properties</h3>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose}>Cancel</button>
            <button
              onClick={save}
              style={{ background:'#0ea5e9', color:'#fff', border:'none', padding:'6px 12px', borderRadius:6 }}
            >
              Save
            </button>
          </div>
        </div>

        <div style={{ display:'flex', gap:12, borderBottom:'1px solid #e2e8f0', marginTop:8 }}>
          <Tab active={tab==='general'} onClick={()=>setTab('general')}>General</Tab>
          <Tab active={tab==='components'} onClick={()=>setTab('components')}>Components</Tab>
          <Tab active={tab==='participants'} onClick={()=>setTab('participants')}>Participants</Tab>
        </div>

        {tab==='general' && (
          <div style={{ padding:12 }}>
            <label style={{ display:'block', marginBottom:10 }}>
              <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Workflow Name</div>
              <input
                value={name}
                onChange={(e)=>setName(e.target.value)}
                onBlur={()=>checkUnique(name)}
                style={{ width:'100%' }}
              />
              {nameErr && <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>{nameErr}</div>}
            </label>

            <label style={{ display:'block' }}>
              <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Description</div>
              <textarea rows={4} value={desc} onChange={(e)=>setDesc(e.target.value)} style={{ width:'100%' }} />
            </label>
          </div>
        )}

        {tab==='components' && (
          <div style={{ padding:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ display:'block', marginBottom:10 }}>
                <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Initiator (Master) Form</div>
                <select
                  value={initiatorFormId}
                  onChange={(e)=>setInitiatorFormId(e.target.value)}
                  style={{ width:'100%' }}
                >
                  <option value="">— Choose master form —</option>
                  {(sources.forms || [])
                    .filter(f=>f.type==='Master')
                    .map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>

              <div>
                <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Update Forms (same template)</div>
                <div style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:8, height:160, overflow:'auto' }}>
                  {allowedUpdates.length === 0 && (
                    <div style={{ color:'#64748b', fontSize:12 }}>Pick a master form to see matching updates.</div>
                  )}
                  {allowedUpdates.map(f => (
                    <label key={f.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'4px 0' }}>
                      <input
                        type="checkbox"
                        checked={updateFormIds.includes(f.id)}
                        onChange={(e)=>setUpdateFormIds(v => e.target.checked ? [...v, f.id] : v.filter(x => x!==f.id))}
                      />
                      {f.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Queries</div>
                <div style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:8, height:90, overflow:'auto' }}>
                  {(sources.queries || []).map(q => (
                    <label key={q.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'4px 0' }}>
                      <input
                        type="checkbox"
                        checked={queryIds.includes(q.id)}
                        onChange={(e)=>setQueryIds(v => e.target.checked ? [...v, q.id] : v.filter(x => x!==q.id))}
                      />
                      {q.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Reports</div>
                <div style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:8, height:90, overflow:'auto' }}>
                  {(sources.reports || []).map(r => (
                    <label key={r.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'4px 0' }}>
                      <input
                        type="checkbox"
                        checked={reportIds.includes(r.id)}
                        onChange={(e)=>setReportIds(v => e.target.checked ? [...v, r.id] : v.filter(x => x!==r.id))}
                      />
                      {r.report_name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='participants' && (
          <div style={{ padding:12 }}>
            <div style={{ fontSize:12, color:'#334155', marginBottom:4 }}>Select Participants</div>
            <div style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:8, maxHeight:260, overflow:'auto' }}>
              {(sources.users || []).map(u => (
                <label key={u.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'4px 0' }}>
                  <input
                    type="checkbox"
                    checked={participantIds.includes(u.id)}
                    onChange={(e)=>setParticipantIds(v => e.target.checked ? [...v, u.id] : v.filter(x => x!==u.id))}
                  />
                  {u.full_name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
