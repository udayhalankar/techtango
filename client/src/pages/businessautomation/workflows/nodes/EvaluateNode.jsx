// src/pages/workflows/nodes/EvaluateNode.jsx
import React from 'react';
import { Handle, Position } from 'reactflow';
import { NodeShell, Field, AttachmentEditor, TargetHandle } from '../components/NodeShell';

export default function EvaluateNode({ data }) {
  const { onChange } = data;
  const ops = ["==", "!=", ">", "<", ">=", "<=", "includes"];
  const rows = Array.isArray(data.conditions) ? data.conditions : [];
  const gatewayType = (data.gatewayType || 'XOR').toUpperCase();

  return (
    <NodeShell title="Evaluate (Gateway)" color="#8b5cf6">
      <TargetHandle />
      <Handle type="source" id="true" position={Position.Right} style={{ top: 12, background: "#10b981" }} />
      <Handle type="source" id="false" position={Position.Right} style={{ bottom: 12, top: "auto", background: "#ef4444" }} />

      <Field label="Gateway type">
        <select value={gatewayType} onChange={(e)=>onChange?.({ gatewayType: e.target.value })}>
          <option value="XOR">Exclusive (XOR)</option>
          <option value="OR">Inclusive (OR)</option>
          <option value="AND">Parallel (AND)</option>
        </select>
      </Field>

      <div style={{ display:'grid', gap:8 }}>
        {rows.map((c, idx)=>(
          <div key={c.id || idx} style={{ display:'grid', gridTemplateColumns:'1fr 120px 1fr 120px auto', gap:6, alignItems:'end' }}>
            <Field label="Field">
              <input value={c.field || ''} onChange={(e)=>{ const next=[...rows]; next[idx]={...c, field:e.target.value}; onChange?.({ conditions: next }); }}/>
            </Field>
            <Field label="Op">
              <select value={c.op || '=='} onChange={(e)=>{ const next=[...rows]; next[idx]={...c, op:e.target.value}; onChange?.({ conditions: next }); }}>
                {ops.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Value">
              <input value={c.value ?? ''} onChange={(e)=>{ const next=[...rows]; next[idx]={...c, value:e.target.value}; onChange?.({ conditions: next }); }}/>
            </Field>
            <Field label="Outcome">
              <select value={c.outcome || 'true'} onChange={(e)=>{ const next=[...rows]; next[idx]={...c, outcome:e.target.value}; onChange?.({ conditions: next }); }}>
                <option value="true">TRUE</option>
                <option value="false">FALSE</option>
              </select>
            </Field>
            <button onClick={()=>onChange?.({ conditions: rows.filter((_,i)=>i!==idx) })}>×</button>
          </div>
        ))}
        <button onClick={()=>onChange?.({ conditions: [...rows, { id: Math.random().toString(36).slice(2,7), field:'', op:'==', value:'', outcome:'true' }] })}>+ Add condition</button>
      </div>

      <Field label="Attachments">
        <AttachmentEditor value={data.attachments} onChange={(attachments)=>onChange?.({ attachments })} />
      </Field>
    </NodeShell>
  );
}
