// src/pages/workflows/nodes/FormNode.jsx
import React from 'react';
import { NodeShell, Field, AttachmentEditor, TargetHandle, SourceHandle } from '../components/NodeShell';

export default function FormNode({ data }) {
  const { forms = [], onChange } = data;
  return (
    <NodeShell title="Form Step" color="#22c55e">
      <TargetHandle />
      <Field label="Form">
        <select
          value={data.formId || ""}
          onChange={(e) => onChange?.({ formId: Number(e.target.value) || null })}
          style={{ width: "100%" }}
        >
          <option value="">— Choose a form —</option>
          {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </Field>
      <Field label="Attachments">
        <AttachmentEditor value={data.attachments} onChange={(attachments)=>onChange?.({ attachments })} />
      </Field>
      <SourceHandle />
    </NodeShell>
  );
}
