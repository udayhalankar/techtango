// src/pages/workflows/WorkflowLibrary.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DESIGNER_BASE = '/wfdesigner'; // adjust if your route differs

const Seg = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 12px',
      borderRadius: 8,
      border: active ? '1px solid #0ea5e9' : '1px solid #e2e8f0',
      background: active ? '#e0f2fe' : '#fff',
      fontWeight: 600,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

const Card = ({ wf }) => (
  <div
    style={{
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 12,
      display: 'grid',
      gap: 6,
    }}
  >
    <div style={{ fontWeight: 700 }}>
      {wf.name}{' '}
      <span style={{ color: '#64748b', fontWeight: 400 }}>v{wf.version}</span>
    </div>
    <div style={{ color: '#475569', fontSize: 13 }}>#{wf.id}</div>
    <div style={{ color: '#64748b', fontSize: 12 }}>
      {wf.created_at ? new Date(wf.created_at).toLocaleString() : ''}
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <Link to={`${DESIGNER_BASE}/${wf.id}`}>
        <button style={{ padding: '6px 10px' }}>Edit</button>
      </Link>
    </div>
  </div>
);

export default function WorkflowLibrary() {
  const [view, setView] = useState('grid'); // 'grid' | 'list'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch('/api/workflows');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to fetch workflows');
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message || 'Failed to fetch workflows');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onEdit = (wf) => navigate(`${DESIGNER_BASE}/${wf.id}`);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Workflows</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <Seg active={view === 'grid'} onClick={() => setView('grid')}>Grid</Seg>
          <Seg active={view === 'list'} onClick={() => setView('list')}>List</Seg>
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: '#ef4444' }}>{err}</div>}
      {!loading && !err && items.length === 0 && (
        <div style={{ color: '#64748b' }}>No workflows yet.</div>
      )}

      {view === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))',
          gap: 12
        }}>
          {items.map((wf) => <Card key={wf.id} wf={wf} />)}
        </div>
      ) : (
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Workflow', 'Version', 'ID', 'Created', 'Action'].map((c) => (
                  <th
                    key={c}
                    style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #e5e7eb' }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((wf) => (
                <tr key={wf.id}>
                  <td style={{ padding: '8px 6px' }}>{wf.name}</td>
                  <td style={{ padding: '8px 6px' }}>v{wf.version}</td>
                  <td style={{ padding: '8px 6px' }}>#{wf.id}</td>
                  <td style={{ padding: '8px 6px' }}>
                    {wf.created_at ? new Date(wf.created_at).toLocaleString() : ''}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <Link to={`${DESIGNER_BASE}/${wf.id}`}>
                      <button>Edit</button>
                    </Link>
                    {/* or: <button onClick={() => onEdit(wf)}>Edit</button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
