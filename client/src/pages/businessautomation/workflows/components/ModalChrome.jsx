// src/pages/workflows/components/ModalChrome.jsx
import React from 'react';

export default function ModalChrome({ title, onClose, onSave, children, width = 720 }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)',
      display:'grid', placeItems:'center', zIndex:60 }}>
      <div onClick={(e)=>e.stopPropagation()}
           style={{ width, background:'#fff', borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,.2)',
           maxHeight:'85vh', overflow:'auto' }}>
        <div style={{ padding:16, display:'grid', gap:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ margin:0 }}>{title}</h3>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose}>Cancel</button>
              <button onClick={onSave} style={{ background:'#0ea5e9', color:'#fff',
                border:'none', padding:'6px 12px', borderRadius:6 }}>Save</button>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
