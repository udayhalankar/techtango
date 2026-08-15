// src/pages/workflows/modals/WorkflowPropertiesModal.jsx
import React, { useEffect, useMemo, useState } from 'react';

/* ---------- Small UI helpers (local to this file) ---------- */
const Field = ({ label, children }) => (
  <label style={{ display: 'block', marginBottom: 10 }}>
    <div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>{label}</div>
    {children}
  </label>
);

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 12px',
      border: 'none',
      borderBottom: active ? '2px solid #0ea5e9' : '2px solid transparent',
      background: 'transparent',
      fontWeight: 600,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

const Modal = ({ open, onClose, width = 760, children }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.4)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxHeight: '85vh',
          overflow: 'auto',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ---------- Main component ---------- */
export default function WorkflowPropertiesModal({
  open = false,
  onClose = () => {},
  initial = {},
  sources = {},
  onSave = () => {},
}) {
  // Always call hooks FIRST (before any return)
  const forms = sources.forms || [];
  const queries = sources.queries || [];
  const reports = sources.reports || [];
  const users = sources.users || [];

  const [tab, setTab] = useState('general');
  const [name, setName] = useState(initial?.name || '');
  const [desc, setDesc] = useState(initial?.description || '');
  const [initiatorFormId, setInitiatorFormId] = useState(initial?.initiatorFormId || '');
  const [updateFormIds, setUpdateFormIds] = useState(initial?.updateFormIds || []);
  const [queryIds, setQueryIds] = useState(initial?.queryIds || []);
  const [reportIds, setReportIds] = useState(initial?.reportIds || []);
  const [participantIds, setParticipantIds] = useState(initial?.participantIds || []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Reset state whenever modal opens with new "initial"
  useEffect(() => {
    if (!open) return;
    setTab('general');
    setName(initial?.name || '');
    setDesc(initial?.description || '');
    setInitiatorFormId(initial?.initiatorFormId || '');
    setUpdateFormIds(initial?.updateFormIds || []);
    setQueryIds(initial?.queryIds || []);
    setReportIds(initial?.reportIds || []);
    setParticipantIds(initial?.participantIds || []);
    setErr('');
  }, [open, initial]);

  // Allowed update forms = same template as selected master
  const allowedUpdates = useMemo(() => {
    const master = forms.find((f) => f.id === Number(initiatorFormId));
    if (!master) return [];
    return forms.filter((f) => f.type === 'Update' && f.template === master.template);
  }, [forms, initiatorFormId]);

  // Drop any previously selected update form not allowed under new master
  useEffect(() => {
    const okIds = new Set(allowedUpdates.map((f) => f.id));
    setUpdateFormIds((prev) => prev.filter((id) => okIds.has(id)));
  }, [allowedUpdates]);

  // Optional: quick uniqueness check before save (best-effort; backend should enforce)
  const validateUniqueName = async () => {
    try {
      const q = new URLSearchParams({
        name: name.trim(),
        ...(initial?.id ? { excludeId: String(initial.id) } : {}),
      });
      const res = await fetch(`/api/workflows/validate-name?${q.toString()}`);
      if (res.ok) {
        const j = await res.json();
        return !j?.exists;
      }
    } catch {
      /* ignore network/endpoint absence */
    }
    return true; // don’t block if endpoint missing
  };

  const handleSave = async () => {
    setErr('');
    if (!name.trim()) return setErr('Workflow name is required.');
    if (!initiatorFormId) return setErr('Select an Initiator (Master) form.');

    setSaving(true);
    try {
      const unique = await validateUniqueName();
      if (!unique) {
        setSaving(false);
        return setErr('Name already exists. Pick a different name.');
      }

      onSave({
        name: name.trim(),
        description: desc,
        initiatorFormId: Number(initiatorFormId),
        updateFormIds,
        queryIds,
        reportIds,
        participantIds,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // It is safe to return here; hooks have already been called above.
  if (!open) return null;

  const masterForm = forms.find((f) => f.id === Number(initiatorFormId));

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Workflow Properties</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {err && (
          <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8, marginBottom: -6 }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', marginTop: 12 }}>
          <TabButton active={tab === 'general'} onClick={() => setTab('general')}>
            General
          </TabButton>
          <TabButton active={tab === 'components'} onClick={() => setTab('components')}>
            Components
          </TabButton>
          <TabButton active={tab === 'participants'} onClick={() => setTab('participants')}>
            Participants
          </TabButton>
        </div>

        {tab === 'general' && (
          <div style={{ padding: 12 }}>
            <Field label="Workflow Name">
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
            </Field>
            <Field label="Description">
              <textarea
                rows={4}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        )}

        {tab === 'components' && (
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Field label="Initiator (Master) Form">
                <select
                  value={initiatorFormId}
                  onChange={(e) => setInitiatorFormId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">— Choose master form —</option>
                  {forms
                    .filter((f) => f.type === 'Master')
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Update Forms (same template)">
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 8,
                    height: 160,
                    overflow: 'auto',
                  }}
                >
                  {!masterForm && (
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      Pick a master form to see matching updates.
                    </div>
                  )}
                  {allowedUpdates.map((f) => (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                      <input
                        type="checkbox"
                        checked={updateFormIds.includes(f.id)}
                        onChange={(e) =>
                          setUpdateFormIds((v) => (e.target.checked ? [...v, f.id] : v.filter((x) => x !== f.id)))
                        }
                      />
                      {f.name}
                    </label>
                  ))}
                </div>
              </Field>
            </div>

            <div>
              <Field label="Queries">
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 8,
                    height: 90,
                    overflow: 'auto',
                  }}
                >
                  {queries.map((q) => (
                    <label key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                      <input
                        type="checkbox"
                        checked={queryIds.includes(q.id)}
                        onChange={(e) =>
                          setQueryIds((v) => (e.target.checked ? [...v, q.id] : v.filter((x) => x !== q.id)))
                        }
                      />
                      {q.name}
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Reports">
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 8,
                    height: 90,
                    overflow: 'auto',
                  }}
                >
                  {reports.map((r) => (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                      <input
                        type="checkbox"
                        checked={reportIds.includes(r.id)}
                        onChange={(e) =>
                          setReportIds((v) => (e.target.checked ? [...v, r.id] : v.filter((x) => x !== r.id)))
                        }
                      />
                      {r.report_name}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        )}

        {tab === 'participants' && (
          <div style={{ padding: 12 }}>
            <Field label="Select Participants">
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 8,
                  maxHeight: 260,
                  overflow: 'auto',
                }}
              >
                {users.map((u) => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <input
                      type="checkbox"
                      checked={participantIds.includes(u.id)}
                      onChange={(e) =>
                        setParticipantIds((v) => (e.target.checked ? [...v, u.id] : v.filter((x) => x !== u.id)))
                      }
                    />
                    {u.full_name}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
