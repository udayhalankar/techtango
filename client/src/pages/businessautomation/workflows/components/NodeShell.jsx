// src/pages/workflows/components/NodeShell.jsx
import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { makeId } from '../utils/helpers';

export const NodeShell = ({ title, color = '#0ea5e9', children }) => (
  <div style={{
    minWidth: 360, borderRadius: 12, border: `1px solid ${color}`,
    boxShadow: '0 2px 10px rgba(0,0,0,.08)', background: '#fff', overflow: 'hidden',
    fontFamily: 'Inter, system-ui, Arial, sans-serif'
  }}>
    <div style={{ padding: '8px 12px', fontWeight: 600, fontSize: 14, color: '#0b1220',
      background: `${color}22`, borderBottom: `1px solid ${color}66` }}>
      {title}
    </div>
    <div style={{ padding: 12, fontSize: 13 }}>{children}</div>
  </div>
);

export const Field = ({ label, children }) => (
  <label style={{ display: 'block', marginBottom: 8 }}>
    <div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

export const SourceHandle = ({ id = 'out' }) => (
  <Handle type="source" id={id} position={Position.Right} style={{ background: '#10b981' }} />
);
export const TargetHandle = () => (
  <Handle type="target" position={Position.Left} style={{ background: '#6366f1' }} />
);

// Tiny attachment editor reused in nodes
export const AttachmentEditor = ({ value = [], onChange }) => {
  const [item, setItem] = useState({ type: 'document', name: '' });
  const add = () => {
    if (!item.name.trim()) return;
    onChange([...(value || []), { ...item, id: makeId() }]);
    setItem({ type: item.type, name: '' });
  };
  const remove = (id) => onChange((value || []).filter((x) => x.id !== id));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 6 }}>
        <select value={item.type} onChange={(e)=>setItem(p=>({ ...p, type: e.target.value }))}>
          <option value="document">Document</option>
          <option value="email">Email</option>
          <option value="link">Link</option>
        </select>
        <input placeholder="Name / ref" value={item.name} onChange={(e)=>setItem(p=>({ ...p, name: e.target.value }))}/>
        <button onClick={add} style={{ minWidth: 64 }}>Add</button>
      </div>
      {(value||[]).length>0 && (
        <ul style={{ paddingLeft: 16, marginTop: 8 }}>
          {value.map(x=>(
            <li key={x.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize: 12, color: '#475569' }}>{x.type}: <strong>{x.name}</strong></span>
              <button onClick={()=>remove(x.id)} style={{ marginLeft: 'auto' }}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
