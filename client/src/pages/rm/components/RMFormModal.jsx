// src/rm/components/RMFormModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, MenuItem, Button, Stack, CircularProgress
} from "@mui/material";
import { authHeaders } from "../../../utils/authHeaders";
import { safeJson } from "../../../utils/safeJson";

export default function RMFormModal({
  open,
  onClose,
  title,
  endpoint,      // e.g. "/api/rm/fileplan-nodes"
  item,          // row for edit/view; null for create
  fields,        // schema array
  onSaved,
  onDeleted,
}) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Treat fields with type 'select-remote' OR having a 'url' as remote selects
  const isRemote = (f) => f?.type === "select-remote" || (!!f?.url && !Array.isArray(f?.options));

  const remoteInit = useMemo(() => Object.fromEntries(
    (fields || [])
      .filter(isRemote)
      .map(f => [f.key, { loading: false, error: "", options: [] }])
  ), [fields]);
  const [remote, setRemote] = useState(remoteInit);

  // Prefill form and fetch remote options when opened
  useEffect(() => {
    if (!open) return;
    setForm(item || {});
    setRemote(remoteInit);

    (fields || []).filter(isRemote).forEach(fetchRemote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, fields]);

  const fetchRemote = async (field) => {
    setRemote(prev => ({ ...prev, [field.key]: { ...prev[field.key], loading: true, error: "" } }));
    try {
      const res = await fetch(field.url, { headers: { ...authHeaders() } });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || `Failed to load ${field.label || field.key}`);
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setRemote(prev => ({ ...prev, [field.key]: { loading: false, error: "", options: items } }));
    } catch (e) {
      setRemote(prev => ({ ...prev, [field.key]: { loading: false, error: e.message || "Error", options: [] } }));
    }
  };

  const setVal = (k) => (e) => {
    const field = (fields || []).find(s => s.key === k);
    const raw = field?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [k]: raw })); // coerce on submit
  };

  const coerce = (field, val) => {
    const c = field?.coerce || "";
    if (c === "bool") return !!val;
    if (c === "int") {
      if (val === "" || val == null) return null;
      const n = Number(val); return Number.isFinite(n) ? n : null;
    }
    if (c === "int|null") {
      if (val === "" || val === "0" || val === 0 || val == null) return null;
      const n = Number(val); return Number.isFinite(n) ? n : null;
    }
    if (c === "string") return val == null ? "" : String(val);
    return val;
  };

  const submit = async () => {
    try {
      setSaving(true);
      const payload = {};
      for (const f of (fields || [])) payload[f.key] = coerce(f, form[f.key]);

      const url = item?.id ? `${endpoint}/${encodeURIComponent(item.id)}` : endpoint;
      const method = item?.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const out = await safeJson(res);
      if (!res.ok) throw new Error(out?.error || `HTTP ${res.status}`);
      onSaved?.(out);
      onClose?.();
    } catch (e) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!item?.id) return;
    if (!window.confirm("Delete this record?")) return;
    try {
      setDeleting(true);
      const res = await fetch(`${endpoint}/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      const out = await safeJson(res);
      if (!res.ok) throw new Error(out?.error || `HTTP ${res.status}`);
      onDeleted?.(out);
      onClose?.();
    } catch (e) {
      alert(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const optionLabel = (field, item) => {
    const lp = field.labelProp;
    if (typeof lp === "function") return lp(item);
    if (typeof lp === "string" && lp) return item?.[lp];
    return item?.name ?? item?.policy_name ?? item?.title ?? item?.code ?? `#${item?.id}`;
  };
  const optionValue = (field, item) => field.valueProp ? item?.[field.valueProp] : item?.id;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary">
          Related data from table/tables wherever applicable
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          {(fields || []).map((f) => {
            const disabled = !!(f.lockOnEdit && item);

            if (isRemote(f)) {
              const rs = remote[f.key] || { loading: false, error: "", options: [] };
              return (
                <TextField
                  key={f.key}
                  select
                  label={f.label}
                  size="small"
                  value={form[f.key] ?? ""}
                  onChange={setVal(f.key)}
                  disabled={disabled || rs.loading}
                  helperText={rs.error || f.helperText || ""}
                  error={!!rs.error}
                  InputProps={{
                    endAdornment: rs.loading ? <CircularProgress size={16} sx={{ ml: 1 }} /> : null
                  }}
                >
                  {f.allowNone !== false && <MenuItem value="">{f.noneLabel || "— None —"}</MenuItem>}
                  {(rs.options || []).map(opt => (
                    <MenuItem key={String(optionValue(f, opt))} value={optionValue(f, opt)}>
                      {optionLabel(f, opt)}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }

            if (f.type === "select") {
              return (
                <TextField key={f.key} select label={f.label} size="small"
                  value={form[f.key] ?? ""} onChange={setVal(f.key)} disabled={disabled}>
                  {(f.options || []).map(opt =>
                    <MenuItem key={String(opt.value)} value={opt.value}>{opt.label}</MenuItem>
                  )}
                </TextField>
              );
            }

            if (f.type === "checkbox") {
              return (
                <Box key={f.key}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={!!form[f.key]} onChange={setVal(f.key)} disabled={disabled} />
                    <Typography variant="body2">{f.label}</Typography>
                  </label>
                </Box>
              );
            }

            return (
              <TextField
                key={f.key}
                label={f.label}
                size="small"
                type={f.type || "text"}
                value={form[f.key] ?? ""}
                onChange={setVal(f.key)}
                disabled={disabled}
              />
            );
          })}
        </Stack>
      </DialogContent>

      <DialogActions>
        {item?.id && (
          <Button color="error" onClick={doDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        )}
        <Button onClick={onClose} disabled={saving}>Close</Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}







// import React, { useMemo, useState, useEffect } from "react";
// import {
//   Dialog, DialogTitle, DialogContent, DialogActions,
//   TextField, MenuItem, Button, IconButton, Stack, Checkbox, FormControlLabel
// } from "@mui/material";
// import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
// import { authHeaders } from "../../../utils/authHeaders";
// import { safeJson } from "../../../utils/safeJson";

// export default function RMFormModal({
//   open, onClose,
//   title, endpoint,
//   item,                // existing row or null
//   fields = [],         // [{key,label,type,required,lockOnEdit,options?}]
//   onSaved, onDeleted,
// }) {
//   const isCreate = !item;
//   const [edit, setEdit] = useState(isCreate ? true : false);
//   const [data, setData] = useState({});

//   useEffect(() => {
//     setEdit(isCreate);
//     setData(item || {});
//   }, [item, isCreate]);

//   const disabler = useMemo(() => {
//     // lock id/code/name/title by default when editing
//     const lockedKeys = new Set(
//       fields.filter(f => f.lockOnEdit || ["id","code","name","title"].includes(f.key)).map(f => f.key)
//     );
//     return (key) => !isCreate && (lockedKeys.has(key));
//   }, [fields, isCreate]);

//   async function handleSave() {
//     const method = isCreate ? "POST" : "PUT";
//     const url = isCreate ? endpoint : `${endpoint}/${item.id}`;
//     const res = await fetch(url, {
//       method,
//       headers: { "Content-Type": "application/json", ...authHeaders() },
//       body: JSON.stringify(data),
//     });
//     const out = await safeJson(res);
//     if (!res.ok || out?.ok === false) throw new Error(out?.error || `HTTP ${res.status}`);
//     onSaved?.(out);
//     onClose();
//   }

//   async function handleDelete() {
//     if (!item?.id) return;
//     if (!window.confirm("Delete this record?")) return;
//     const res = await fetch(`${endpoint}/${item.id}`, {
//       method: "DELETE",
//       headers: { ...authHeaders() },
//     });
//     // const out = await res.json();
//     const out = await safeJson(res);
//     if (!res.ok || out?.ok === false) {
//       alert(out?.error || `HTTP ${res.status}`);
//       return;
//     }
//     onDeleted?.(item.id);
//     onClose();
//   }

//   const renderField = (f) => {
//     const common = {
//       label: f.label,
//       size: "small",
//       fullWidth: true,
//       margin: "dense",
//       value: data?.[f.key] ?? (f.type === "boolean" ? false : ""),
//       onChange: (e) => {
//         const v = f.type === "number" ? Number(e.target.value || 0)
//                 : f.type === "boolean" ? Boolean(e.target.checked)
//                 : e.target.value;
//         setData(d => ({ ...d, [f.key]: v }));
//       },
//       disabled: !edit || disabler(f.key),
//     };

//     if (f.type === "boolean") {
//       return (
//         <FormControlLabel
//           key={f.key}
//           control={<Checkbox checked={!!data?.[f.key]} onChange={common.onChange} disabled={common.disabled} />}
//           label={f.label}
//           sx={{ mt: .5 }}
//         />
//       );
//     }

//     if (f.type === "select" && Array.isArray(f.options)) {
//       return (
//         <TextField key={f.key} select {...common}>
//           {f.options.map(o => (
//             <MenuItem key={String(o.value)} value={o.value}>{o.label}</MenuItem>
//           ))}
//         </TextField>
//       );
//     }

//     return <TextField key={f.key} {...common} />;
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
//       <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//         {title}
//         {!isCreate && (
//           <IconButton color="error" size="small" onClick={handleDelete} title="Delete">
//             <DeleteOutlineIcon />
//           </IconButton>
//         )}
//       </DialogTitle>
//       <DialogContent dividers>
//         <Stack>{fields.map(renderField)}</Stack>
//       </DialogContent>
//       <DialogActions>
//         {!isCreate && (
//           <Button onClick={() => setEdit(e => !e)}>{edit ? "Cancel Edit" : "Edit"}</Button>
//         )}
//         <Button onClick={onClose}>Close</Button>
//         <Button variant="contained" onClick={handleSave} disabled={!edit}>Submit</Button>
//       </DialogActions>
//     </Dialog>
//   );
// }
