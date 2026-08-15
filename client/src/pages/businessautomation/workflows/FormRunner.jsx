// src/pages/workflows/FormRunner.jsx
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

/**
 * Generic Workflow Form Runner
 * - Loads form config (/api/form-configs/:id or /api/form_configs/:id)
 * - Loads record data (/api/formdata/:formId/:rowId)
 * - Renders simple inputs from cfg.fields_json
 * - Saves via /api/formdata/update
 * - Completes task via common workflow endpoints, opens next step if returned
 */
export default function FormRunner() {
  const navigate = useNavigate();
  const { id: formId } = useParams();
  const { search } = useLocation();
  const p = useMemo(() => new URLSearchParams(search), [search]);

  const instanceId = p.get('instanceId');
  const taskId     = p.get('taskId');
  const rowId      = p.get('rowId') || p.get('recordId');

  const [cfg, setCfg] = useState(null);
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // ---------- helpers ----------
  const fetchJSON = async (url, opts = {}) => {
    const token = localStorage.getItem('token');
    const headers = { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(url, { ...opts, headers });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { ok: res.ok, body, status: res.status };
  };

  const loadFormConfig = async (id) => {
    for (const url of [`/api/form-configs/${id}`, `/api/form_configs/${id}`]) {
      const r = await fetchJSON(url);
      if (r.ok) {
        const row = Array.isArray(r.body?.data) ? r.body.data[0] : r.body;
        if (row) return row;
      }
    }
    return null;
  };

  const loadRowData = async (fid, rid) => {
    const r = await fetchJSON(`/api/formdata/${fid}/${rid}`);
    if (!r.ok) return null;

    // Accept raw object, {data:[row]}, or {data: row}
    if (Array.isArray(r.body?.data)) return r.body.data[0] ?? null;
    if (r.body?.data && typeof r.body.data === 'object') return r.body.data;
    if (r.body && typeof r.body === 'object') return r.body;
    return null;
  };

  const sanitize = (s) =>
    String(s).toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");

  const keyOf = (f, idx) => {
    const maybe =
      f?.name ?? f?.field ?? f?.fieldName ?? f?.field_name ??
      f?.columnName ?? f?.column ?? f?.column_name ??
      f?.dbColumn ?? f?.db_column ?? f?.key ??
      (f?.label ? sanitize(f.label) : "") ??
      (f?.caption ? sanitize(f.caption) : "");
    return (maybe ?? "") || `field_${idx}`;
  };

  const labelOf = (f) => f?.label ?? f?.caption ?? f?.title ?? f?.display ?? keyOf(f, 0);

  const typeOf = (f) => {
    const raw = (f?.inputType ?? f?.controlType ?? f?.dataType ?? f?.type ?? '')
      .toString().toLowerCase();
    if (raw.includes('int') || raw === 'number') return 'number';
    if (raw.includes('date')) return 'date';
    if (raw.includes('bool') || raw === 'checkbox') return 'checkbox';
    return 'text';
  };

  const isVisible  = (f) => f?.visible !== false;
  const isEditable = (f) => !(f?.readOnly ?? false);
  const isRequired = (f) => !!(f?.required ?? f?.mandatory ?? f?.isRequired ?? false);

  const validate = () => {
    const errs = {};
    fields.forEach((f, i) => {
      if (!isVisible(f) || !isEditable(f)) return;
      const k = keyOf(f, i);
      if (!k) return;
      if (isRequired(f)) {
        const v = values[k];
        if (v === undefined || v === null || v === '') errs[k] = 'Required';
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openForm = (nextFormId, nextInstanceId, nextTaskId, masterRowId) => {
    const qs = new URLSearchParams({ instanceId: String(nextInstanceId) });
    if (nextTaskId != null) qs.set('taskId', String(nextTaskId));
    if (masterRowId != null) { qs.set('recordId', String(masterRowId)); qs.set('rowId', String(masterRowId)); }
    window.location.href = `/form/${nextFormId}?${qs.toString()}`;
  };

  // ---------- init load ----------
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');
      try {
        if (!formId) { setErr('Missing form id'); setLoading(false); return; }
        if (!rowId)  { setErr('Missing record id (rowId/recordId)'); setLoading(false); return; }

        const conf = await loadFormConfig(formId);
        if (!conf) { setErr('Could not load form configuration'); setLoading(false); return; }

        let flds = [];
        try {
          flds = Array.isArray(conf?.fields_json) ? conf.fields_json : JSON.parse(conf?.fields_json ?? '[]');
        } catch { flds = []; }

        setCfg(conf);
        setFields(Array.isArray(flds) ? flds : []);

        const row = await loadRowData(formId, rowId);
        setValues(row || {});
      } catch (e) {
        console.error(e);
        setErr('Failed to load form');
      } finally {
        setLoading(false);
      }
    })();
  }, [formId, rowId]);

  // ---------- actions ----------
  const onChange = (k, f, e) => {
    const t = typeOf(f);
    let v = e.target.value;
    if (t === 'number' && v !== '') v = Number(v);
    if (t === 'checkbox') v = e.target.checked;
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const save = async () => {
    if (!cfg?.id) return false;
    if (!validate()) {
      alert('Please fill all required fields.');
      return false;
    }
    setSaving(true);
    try {
      // Primary endpoint
      let r = await fetchJSON('/api/formdata/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewId: cfg.id, id: rowId, data: values }),
      });
      // Fallback pattern (if your backend supports it)
      if (!r.ok) {
        r = await fetchJSON(`/api/formdata/${cfg.id}/${rowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
      }
      if (!r.ok) {
        alert(r.body?.error || 'Failed to save');
        return false;
      }
      return true;
    } catch (e) {
      console.error(e);
      alert('Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const completeTask = async () => {
    if (!taskId) return; // nothing to do
    if (!(await save())) return;

    setSubmitting(true);
    try {
      const payload = { instanceId, formId, masterId: rowId, data: values };

      const attempts = [
        `/api/workflows/tasks/${taskId}/complete`,
        `/api/workflows/${instanceId}/tasks/${taskId}/complete`,
        `/api/workflows/complete/${taskId}`,
      ];
      let resp;
      for (const url of attempts) {
        resp = await fetchJSON(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (resp.ok) break;
      }
      if (!resp?.ok) {
        alert(resp?.body?.error || 'Failed to complete task');
        return;
      }

      const nextFormId  = resp.body?.next?.formId || resp.body?.initiatorFormId;
      const nextTaskId  = resp.body?.next?.taskId || resp.body?.initiatorTaskId;
      const nextInstId  = resp.body?.instanceId || instanceId;
      const masterRowId = resp.body?.masterRowId || rowId;

      if (nextFormId && nextInstId) {
        openForm(nextFormId, nextInstId, nextTaskId, masterRowId);
      } else {
        // No next step returned — send user to assignments
        navigate('/workflows/assignments');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to complete task');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- UI ----------
  if (loading) return <div style={{ padding:16 }}>Loading form…</div>;
  if (err)     return <div style={{ padding:16, color:'#b91c1c' }}>{err}</div>;

  return (
    <div style={{ padding: 16, display:'grid', gap:12, maxWidth:960, margin:'0 auto' }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ margin:'0 0 4px' }}>{cfg?.template_name || `Form #${cfg?.id}`}</h2>
          <div style={{ color:'#64748b', fontSize:13 }}>
            Form ID: {cfg?.id} {instanceId ? `• Instance #${instanceId}` : ''} {taskId ? `• Task #${taskId}` : ''} {rowId ? `• Record #${rowId}` : ''}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={save} disabled={saving || submitting}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {taskId && (
            <button
              onClick={completeTask}
              disabled={saving || submitting}
              style={{ background:'#0ea5e9', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, fontWeight:700 }}
            >
              {submitting ? 'Completing…' : 'Complete Task'}
            </button>
          )}
        </div>
      </header>

      <section style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {fields.filter(isVisible).map((f, idx) => {
          const k = keyOf(f, idx);
          const t = typeOf(f);
          const v = values[k] ?? (t === 'checkbox' ? false : '');
          const readOnly = !isEditable(f);
          const errMsg = errors[k];

          return (
            <label key={k} style={{ display:'grid', gap:6 }}>
              <div style={{ fontSize:12, color:'#334155' }}>
                {labelOf(f)} {isRequired(f) ? <span style={{ color:'#ef4444' }}>*</span> : null}
              </div>

              {t === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={!!v}
                  onChange={(e) => onChange(k, f, e)}
                  disabled={readOnly || saving || submitting}
                />
              ) : (
                <input
                  type={t}
                  value={v}
                  onChange={(e) => onChange(k, f, e)}
                  disabled={readOnly || saving || submitting}
                />
              )}

              {errMsg && <div style={{ color:'#ef4444', fontSize:12 }}>{errMsg}</div>}
            </label>
          );
        })}
      </section>

      <footer style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
        <button onClick={() => navigate(-1)} disabled={saving || submitting}>Back</button>
        <button onClick={save} disabled={saving || submitting}>{saving ? 'Saving…' : 'Save'}</button>
        {taskId && (
          <button
            onClick={completeTask}
            disabled={saving || submitting}
            style={{ background:'#0ea5e9', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, fontWeight:700 }}
          >
            {submitting ? 'Completing…' : 'Complete Task'}
          </button>
        )}
      </footer>
    </div>
  );
}
