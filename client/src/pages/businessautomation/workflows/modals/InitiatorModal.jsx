// src/pages/workflows/modals/initiatormodal.js
import React, { useState } from 'react';
import ModalChrome from '../components/ModalChrome';

export default function InitiatorModal({ open, onClose, node, forms, users, workflowMeta, onSave }) {
  const d = node?.data || {};
  const [stepName, setStepName] = useState(d.stepName || '');
  const masterFormId = workflowMeta?.initiatorFormId || d.formId || '';
  const [participantId, setPid] = useState(d.assignee?.participantId || '');

  if (!open || !node) return null;

  const save = () => {
    onSave({
      stepName,
      formId: masterFormId ? Number(masterFormId) : null,
      assignee: { mode: 'participant', participantId: participantId ? Number(participantId) : null },
    });
  };

  const selectedName =
    masterFormId ? (forms || []).find(f => f.id === Number(masterFormId))?.name : '';

  return (
    <ModalChrome title="Initiator — Step Configuration" onClose={onClose} onSave={save}>
      <label>Step Name
        <input value={stepName} onChange={(e)=>setStepName(e.target.value)} style={{ width:'100%' }}/>
      </label>

      <label style={{ marginTop:8 }}>Form (from Properties)
        <select value={masterFormId || ''} disabled style={{ width:'100%' }}>
          <option value="">{selectedName || '— Choose in Workflow Properties —'}</option>
        </select>
      </label>

      <label style={{ marginTop:8 }}>Assignee (Performers)
        <select value={participantId} onChange={(e)=>setPid(e.target.value)} style={{ width:'100%' }}>
          <option value="">— Select —</option>
          {(workflowMeta?.participantIds || []).map(pid => {
            const u = (users || []).find(x=>x.id===pid);
            return u ? <option key={u.id} value={u.id}>{u.full_name}</option> : null;
          })}
        </select>
      </label>
    </ModalChrome>
  );
}
