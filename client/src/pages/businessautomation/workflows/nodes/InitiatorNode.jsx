// src/pages/workflows/nodes/InitiatorNode.jsx
import React from 'react';
import { NodeShell, Field, AttachmentEditor, TargetHandle, SourceHandle } from '../components/NodeShell';

export default function InitiatorNode({ data }) {
  const { forms = [], onChange } = data;
  return (
    <NodeShell title="Initiator" color="#0ea5e9">
      <TargetHandle />
      <Field label="Select Master Form">
        <select
          value={data.formId || ""}
          onChange={(e) => onChange?.({ formId: Number(e.target.value) || null })}
          style={{ width: "100%" }}
        >
          <option value="">— Choose a form —</option>
          {forms.filter(f=>f.type==='Master').map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Attachments">
        <AttachmentEditor value={data.attachments} onChange={(attachments)=>onChange?.({ attachments })} />
      </Field>
      <SourceHandle />
    </NodeShell>
  );
}
