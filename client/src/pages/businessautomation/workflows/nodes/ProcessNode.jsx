// src/pages/workflows/nodes/ProcessNode.jsx
import React from 'react';
import { NodeShell, Field, AttachmentEditor, TargetHandle, SourceHandle } from '../components/NodeShell';

export default function ProcessNode({ data }) {
  const { queries = [], emails = [], onChange } = data;
  const action = data.action || 'sendEmail';
  return (
    <NodeShell title="Process Step" color="#f59e0b">
      <TargetHandle />
      <Field label="Action">
        <select
          value={action}
          onChange={(e) => onChange?.({ action: e.target.value, resourceId: null })}
          style={{ width: "100%" }}
        >
          <option value="sendEmail">Send Email</option>
          <option value="runQuery">Run Query</option>
          <option value="createFolder">Create Folder</option>
        </select>
      </Field>

      {action === "sendEmail" && (
        <Field label="Email Template">
          <select
            value={data.resourceId || ""}
            onChange={(e) => onChange?.({ resourceId: Number(e.target.value) || null })}
          >
            <option value="">— Choose template —</option>
            {emails.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      )}

      {action === "runQuery" && (
        <Field label="Query">
          <select
            value={data.resourceId || ""}
            onChange={(e) => onChange?.({ resourceId: Number(e.target.value) || null })}
          >
            <option value="">— Choose query —</option>
            {queries.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </Field>
      )}

      {action === "createFolder" && (
        <Field label="Folder Name">
          <input
            value={data.folderName || ""}
            onChange={(e) => onChange?.({ folderName: e.target.value })}
            placeholder="e.g. Case-{{id}}"
            style={{ width: "100%" }}
          />
        </Field>
      )}

      <Field label="Attachments">
        <AttachmentEditor value={data.attachments} onChange={(attachments)=>onChange?.({ attachments })} />
      </Field>
      <SourceHandle />
    </NodeShell>
  );
}
