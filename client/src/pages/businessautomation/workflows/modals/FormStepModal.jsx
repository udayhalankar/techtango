// src/pages/workflows/modals/formstepmodal.js
import React, { useState } from 'react';
import ModalChrome from '../components/ModalChrome';

export default function FormStepModal({ open, onClose, node, forms, users, onSave }) {
  const d = node?.data || {};
  const [stepName, setStepName] = useState(d.stepName || '');
  const [formId, setFormId] = useState(d.formId || '');
  const [participantId, setPid] = useState(d.assignee?.participantId || '');
  const [dueDays, setDueDays] = useState(d.dueDays || '');
  const [priority, setPriority] = useState(d.priority || '');

  if (!open || !node) return null;

  const save = () => onSave({
    stepName,
    formId: formId ? Number(formId) : null,
    assignee: { mode: 'participant', participantId: participantId ? Number(participantId) : null },
    dueDays: dueDays ? Number(dueDays) : null,
    priority
  });

  return (
    <ModalChrome title="Form Step — Step Configuration" onClose={onClose} onSave={save}>
      <label>Step Name
        <input value={stepName} onChange={(e)=>setStepName(e.target.value)} style={{ width:'100%' }}/>
      </label>

      <label style={{ marginTop:8 }}>Select Form
        <select value={formId} onChange={(e)=>setFormId(e.target.value)} style={{ width:'100%' }}>
          <option value="">— Choose a form —</option>
          {(forms || []).map(f=> <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>

      <label style={{ marginTop:8 }}>Assignee (Performers)
        <select value={participantId} onChange={(e)=>setPid(e.target.value)} style={{ width:'100%' }}>
          <option value="">— Select —</option>
          {(users || []).map(u=> <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
      </label>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
        <label>Complete within (days)
          <input type="number" min="0" value={dueDays} onChange={(e)=>setDueDays(e.target.value)} />
        </label>
        <label>Priority
          <select value={priority} onChange={(e)=>setPriority(e.target.value)}>
            <option value="">—</option><option value="low">Low</option>
            <option value="medium">Medium</option><option value="high">High</option>
          </select>
        </label>
      </div>
    </ModalChrome>
  );
}
