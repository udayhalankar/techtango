// src/pages/workflows/nodes/CompactStepNode.jsx
import React from 'react';
import { Handle, Position } from 'reactflow';

export default function CompactStepNode({ data }) {
  const t = data.stepType || 'step';
  const label =
    (data.stepName && data.stepName.trim()) ||
    (t === "initiator" ? "Initiator"
     : t === "form" ? "Form Step"
     : t === "process" ? "Process Step"
     : t === "evaluate" ? "Evaluate" : "Step");

  const tag = t === "initiator" ? "Initiator" : t === "form" ? "Form" : t === "process" ? "Process" : t === "evaluate" ? "Evaluate" : "Step";

  return (
    <div style={{ minWidth: 160, maxWidth: 220, padding: 8, borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.06)', fontFamily: 'Inter, system-ui, Arial' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#6366f1' }} />
      {t === "evaluate" ? (
        <>
          <Handle type="source" id="true" position={Position.Right} style={{ top: 10, background: "#10b981" }} />
          <Handle type="source" id="false" position={Position.Right} style={{ bottom: 10, top: "auto", background: "#ef4444" }} />
        </>
      ) : (
        <Handle type="source" position={Position.Right} style={{ background: '#0ea5e9' }} />
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
        <div style={{ fontWeight:700, fontSize:13, color:'#0b1220', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</div>
        <span style={{ fontSize:11, background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:999, padding:'2px 6px' }}>{tag}</span>
      </div>
      {t !== 'evaluate' && data.formId && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>form #{data.formId}</div>
      )}
    </div>
  );
}
