// src/pages/workflows/modals/processStepModal.js
import React, { useState } from 'react';
import ModalChrome from '../components/ModalChrome';

export default function ProcessStepModal({ open, onClose, node, queries, emails, onSave }) {
  const d = node?.data || {};
  const [stepName, setStepName] = useState(d.stepName || "");
  const [action, setAction] = useState(d.action || "sendEmail");
  const [resourceId, setResourceId] = useState(d.resourceId || "");
  const [folderName, setFolderName] = useState(d.folderName || "");

  if (!open || !node) return null;

  const save = () => onSave({
    stepName, action,
    resourceId: resourceId ? Number(resourceId) : null,
    folderName
  });

  return (
    <ModalChrome title="Process Step — Configuration" onClose={onClose} onSave={save}>
      <label>Step Name
        <input value={stepName} onChange={(e)=>setStepName(e.target.value)} style={{ width:'100%' }}/>
      </label>

      <label style={{ marginTop:8 }}>Action
        <select value={action} onChange={(e)=>{ setAction(e.target.value); setResourceId(''); }}>
          <option value="sendEmail">Send Email</option>
          <option value="runQuery">Run Query</option>
          <option value="createFolder">Create Folder</option>
        </select>
      </label>

      {action==='sendEmail' && (
        <label style={{ marginTop:8 }}>Email Template
          <select value={resourceId} onChange={(e)=>setResourceId(e.target.value)}>
            <option value="">— Choose template —</option>
            {(emails || []).map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      )}

      {action==='runQuery' && (
        <label style={{ marginTop:8 }}>Query
          <select value={resourceId} onChange={(e)=>setResourceId(e.target.value)}>
            <option value="">— Choose query —</option>
            {(queries || []).map(q=> <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </label>
      )}

      {action==='createFolder' && (
        <label style={{ marginTop:8 }}>Folder Name
          <input value={folderName} onChange={(e)=>setFolderName(e.target.value)} placeholder="Case-{{id}}" />
        </label>
      )}
    </ModalChrome>
  );
}
