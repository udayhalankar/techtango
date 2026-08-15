  // src/pages/workflows/modals/evaluatemodal.js
  import React, { useState } from 'react';
  import ModalChrome from '../components/ModalChrome';

  export default function EvaluateModal({ open, onClose, node, onSave }) {
    const d = node?.data || {};
    const [stepName, setStepName] = useState(d.stepName || "");
    const [rows, setRows] = useState(Array.isArray(d.conditions) ? d.conditions : []);
    const [gatewayType, setGatewayType] = useState(d.gatewayType || 'XOR');

    if (!open || !node) return null;

    const ops = ["==","!=",">","<",">=","<=","includes"];
    const add = () => setRows(r=>[...r,{ id: Math.random().toString(36).slice(2,7), field:"", op:"==", value:"", outcome:"true" }]);
    const remove = (ix) => setRows(r=> r.filter((_,i)=>i!==ix));
    const patch = (ix, key, val) => setRows(r=> r.map((row,i)=> i===ix ? { ...row, [key]: val } : row));
    const save = () => onSave({ stepName, conditions: rows, gatewayType });

    return (
      <ModalChrome title="Evaluate — Conditions" onClose={onClose} onSave={save}>
        <label>Step Name
          <input value={stepName} onChange={(e)=>setStepName(e.target.value)} style={{ width:'100%' }}/>
        </label>

        <label style={{ marginTop:8 }}>Gateway type
          <select value={gatewayType} onChange={(e)=>setGatewayType(e.target.value)}>
            <option value="XOR">Exclusive (XOR)</option>
            <option value="OR">Inclusive (OR)</option>
            <option value="AND">Parallel (AND)</option>
          </select>
        </label>

        <div style={{ display:'grid', gap:8, marginTop:8 }}>
          {rows.map((c, idx)=>(
            <div key={c.id||idx} style={{ display:'grid', gridTemplateColumns:'1fr 120px 1fr 120px auto', gap:6, alignItems:'end' }}>
              <label>Field<input value={c.field||''} onChange={(e)=>patch(idx,'field',e.target.value)} /></label>
              <label>Op
                <select value={c.op||'=='} onChange={(e)=>patch(idx,'op',e.target.value)}>
                  {ops.map(o=> <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label>Value<input value={c.value??''} onChange={(e)=>patch(idx,'value',e.target.value)} /></label>
              <label>Outcome
                <select value={c.outcome||'true'} onChange={(e)=>patch(idx,'outcome',e.target.value)}>
                  <option value="true">TRUE</option><option value="false">FALSE</option>
                </select>
              </label>
              <button onClick={()=>remove(idx)}>×</button>
            </div>
          ))}
          <button onClick={add}>+ Add condition</button>
        </div>
      </ModalChrome>
    );
  }
