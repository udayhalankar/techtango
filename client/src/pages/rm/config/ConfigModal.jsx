// src/rm/config/ConfigModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, MenuItem, Button, Stack, CircularProgress
} from "@mui/material";
import { authHeaders } from "../../../utils/authHeaders";
import { safeJson } from "../../../utils/safeJson";

/**
 * props:
 * - open: boolean
 * - onClose: (saved:boolean) => void
 * - title: string
 * - resource: string   // POST /api/rmconfig/:resource
 * - schema: Array<Field>
 * - method?: "POST" | "PATCH"
 * - targetId?: string|number  // if set, PATCH /:id
 * - initial?: object          // initial values for edit
 *
 * Field:
 *  { key, label, type?, options?,
 *    url?, valueProp?, labelProp?, allowNone?,
 *    coerce?, lockOnEdit? }
 */

export default function ConfigModal({
  open, onClose, title, resource, schema,
  method = "POST", targetId = null, initial = null
}) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

    // Normalize schema: if upstream stripped type/url, recover it for known fields.
  const normSchema = useMemo(() => {
    const s = Array.isArray(schema) ? schema.slice() : [];
    return s.map(f => {
      // Force RP dropdown for Fileplan Nodes even if type/url got dropped.
      if (resource === "fileplan-nodes" && f.key === "retention_policy_id") {
        return {
          allowNone: true,
          coerce: "int|null",
          valueProp: "id",
          // Prefer existing props if present; otherwise fill sensible defaults
          labelProp: f.labelProp || ((p) => `${p.code ?? ""} ${p.policy_name ?? p.name ?? ""}`.trim()),
          url: f.url || "/api/rm/retention-policies?page=1&pageSize=500&sortBy=policy_name&sortDir=asc",
          type: f.type || "select-remote",
          ...f
        };
      }
      return f;
    });
  }, [schema, resource]);
  

  const isRemote = (f) => f?.type === "select-remote" || (!!f?.url && !Array.isArray(f?.options));
    // remote options state per field.key (use normalized schema)
  const remoteStateInit = useMemo(() => Object.fromEntries(
    (normSchema || [])
      .filter(isRemote) // ⭐ change
      // .filter(f => f.type === "select-remote")
      .map(f => [f.key, { loading: false, error: "", options: [] }])
   ), [normSchema]);
  const [remote, setRemote] = useState(remoteStateInit);

  useEffect(() => { if (open) console.log("Modal schema:", schema); }, [open, schema]);
  // Reset form & remote state whenever dialog opens / schema changes (prefill with initial if present)
  useEffect(() => {
    if (!open) return;
    setForm(initial || {});                 // <-- prefill on edit, empty for create
    setRemote(remoteStateInit);

    // Kick off fetches for each select-remote field
    (normSchema || [])
       .filter(isRemote) // ⭐ change
      .forEach((f) => fetchRemote(f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, normSchema, initial]);

  const setVal = (k) => (e) => {
    const field = (normSchema || []).find(s => s.key === k);
    const raw = field?.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [k]: raw }));  // coercion happens on submit
  };

  async function fetchRemote(field) {
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
  }

  // map any value according to field.coerce on submit
  const coerce = (field, val) => {
    const c = field?.coerce || "";
    if (c === "bool") return !!val;
    if (c === "int") {
      if (val === "" || val == null) return null;
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    }
    if (c === "int|null") {
      if (val === "" || val === "0" || val === 0 || val == null) return null;
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    }
    if (c === "string") return val == null ? "" : String(val);
    return val;
  };

  const submit = async () => {
    try {
      setSaving(true);

      // Only send whitelisted keys from schema, coerced per field
      const payload = {};
      for (const f of (schema || [])) {
        payload[f.key] = coerce(f, form[f.key]);
      }

      const url = targetId
        ? `/api/rmconfig/${resource}/${encodeURIComponent(targetId)}`
        : `/api/rmconfig/${resource}`;
      const res = await fetch(url, {
        method: targetId ? "PATCH" : method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const out = await safeJson(res);
      if (!res.ok) throw new Error(out?.error || `HTTP ${res.status}`);
      onClose(true);
    } catch (e) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const optionLabel = (field, item) => {
    const lp = field.labelProp;
    if (typeof lp === "function") return lp(item);
    if (typeof lp === "string" && lp) return item?.[lp];
    return item?.name ?? item?.policy_name ?? item?.title ?? item?.code ?? `#${item?.id}`;
  };
  const optionValue = (field, item) => {
    const vp = field.valueProp || "id";
    return item?.[vp];
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary">
          Fill the details below. For linked data, use the dropdowns.
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          {(normSchema || []).map((f) => {
            const disabled = !!(f.lockOnEdit && initial); // lock field when editing if lockOnEdit

            // SELECT (remote)
              if (isRemote(f)) { // ⭐ change
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
                  helperText={rs.error ? rs.error : (f.helperText || "")}
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

            // SELECT (static)
            if (f.type === "select") {
              return (
                <TextField
                  key={f.key}
                  select
                  label={f.label}
                  size="small"
                  value={form[f.key] ?? ""}
                  onChange={setVal(f.key)}
                  disabled={disabled}
                >
                  {(f.options || []).map(opt =>
                    <MenuItem key={String(opt.value)} value={opt.value}>{opt.label}</MenuItem>
                  )}
                </TextField>
              );
            }

            // CHECKBOX
            if (f.type === "checkbox") {
              return (
                <Box key={f.key}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!form[f.key]}
                      onChange={setVal(f.key)}
                      disabled={disabled}
                    />
                    <Typography variant="body2">{f.label}</Typography>
                  </label>
                </Box>
              );
            }

            // DEFAULT INPUT
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
        <Button onClick={() => onClose(false)} disabled={saving}>Close</Button>
        <Button onClick={submit} variant="contained" disabled={saving}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
}











// // // src/rm/config/ConfigModal.jsx
// // import React, { useEffect, useMemo, useState } from "react";
// // import {
// //   Dialog, DialogTitle, DialogContent, DialogActions,
// //   Box, Typography, TextField, MenuItem, Button, Stack, CircularProgress
// // } from "@mui/material";
// // import { authHeaders } from "../../../utils/authHeaders";
// // import { safeJson } from "../../../utils/safeJson";

// // /**
// //  * props:
// //  * - open: boolean
// //  * - onClose: (saved:boolean) => void
// //  * - title: string
// //  * - resource: string   // POST /api/rmconfig/:resource
// //  * - schema: Array<Field>
// //  *
// //  * Field:
// //  *  { key, label, type?, options?,                           // for select (static)
// //  *    // for remote select:
// //  *    url?, valueProp?, labelProp?, allowNone?,
// //  *    // coercion on submit:
// //  *    coerce? }                                              // 'int' | 'int|null' | 'bool' | 'string'
// //  *
// //  * Examples:
// //  *  { key:'code', label:'Code' }
// //  *  { key:'retention_policy_id', label:'Retention Policy',
// //  *    type:'select-remote',
// //  *    url:'/api/rm/retention-policies?page=1&pageSize=500&sortBy=policy_name',
// //  *    valueProp:'id',
// //  *    labelProp:(p)=> `${p.code} — ${p.policy_name ?? p.name} (${p.years||0}y ${p.months||0}m)`,
// //  *    allowNone:true,
// //  *    coerce:'int|null'
// //  *  }
// //  */

// // export default function ConfigModal({ open, onClose, title, resource, schema, method = "POST", targetId = null, initial = null }) {
// //   const [form, setForm] = useState({});
// //   const [saving, setSaving] = useState(false);

// //   // remote options state per field.key
// //   const remoteStateInit = useMemo(() => Object.fromEntries(
// //     (schema || [])
// //       .filter(f => f.type === "select-remote")
// //       .map(f => [f.key, { loading: false, error: "", options: [] }])
// //   ), [schema]);
// //   const [remote, setRemote] = useState(remoteStateInit);

// //   // Reset form & remote state whenever dialog opens / schema changes
// //   useEffect(() => {
// //     if (!open) return;
// //     setForm({});
// //     setRemote(remoteStateInit);

// //     // Kick off fetches for each select-remote field
// //     (schema || [])
// //       .filter(f => f.type === "select-remote" && f.url)
// //       .forEach((f) => fetchRemote(f));
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [open, schema]);

// //   const setVal = (k) => (e) => {
// //     const field = schema.find(s => s.key === k);
// //     const raw = field?.type === "checkbox" ? e.target.checked : e.target.value;

// //     // For remote/static selects we keep the raw value; coercion happens on submit.
// //     setForm((prev) => ({ ...prev, [k]: raw }));
// //   };

// //   async function fetchRemote(field) {
// //     setRemote(prev => ({ ...prev, [field.key]: { ...prev[field.key], loading: true, error: "" } }));
// //     try {
// //       const res = await fetch(field.url, { headers: { ...authHeaders() } });
// //       const data = await safeJson(res);
// //       if (!res.ok) throw new Error(data?.error || `Failed to load ${field.label || field.key}`);
// //       // try common shapes: {items:[]} or plain []
// //       const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
// //       setRemote(prev => ({ ...prev, [field.key]: { loading: false, error: "", options: items } }));
// //     } catch (e) {
// //       setRemote(prev => ({ ...prev, [field.key]: { loading: false, error: e.message || "Error", options: [] } }));
// //     }
// //   }

// //   // map any value according to field.coerce on submit
// //   const coerce = (field, val) => {
// //     const c = field?.coerce || "";
// //     if (c === "bool") return !!val;
// //     if (c === "int") {
// //       if (val === "" || val == null) return null;
// //       const n = Number(val);
// //       return Number.isFinite(n) ? n : null;
// //     }
// //     if (c === "int|null") {
// //       if (val === "" || val === "0" || val === 0 || val == null) return null;
// //       const n = Number(val);
// //       return Number.isFinite(n) ? n : null;
// //     }
// //     if (c === "string") return val == null ? "" : String(val);
// //     return val;
// //   };

// //   const submit = async () => {
// //     try {
// //       setSaving(true);

// //       // Build payload from schema (so only known fields go out) and coerce values
// //       const payload = {};
// //       for (const f of (schema || [])) {
// //         const v = form[f.key];
// //         // For selects: allowNone -> "" maps to null automatically via coerce 'int|null'
// //         payload[f.key] = coerce(f, v);
// //       }

// //          const url = targetId
// //          ? `/api/rmconfig/${resource}/${encodeURIComponent(targetId)}`
// //     : `/api/rmconfig/${resource}`;
// //   const res = await fetch(url, {
// //     method: targetId ? "PATCH" : method,
// //         headers: { "Content-Type": "application/json", ...authHeaders() },
// //         body: JSON.stringify(payload),
// //       });
// //       const out = await safeJson(res);
// //       if (!res.ok) throw new Error(out?.error || `HTTP ${res.status}`);
// //       onClose(true);
// //     } catch (e) {
// //       alert(e.message || "Save failed");
// //     } finally {
// //       setSaving(false);
// //     }
// //   };

// //   const optionLabel = (field, item) => {
// //     const lp = field.labelProp;
// //     if (typeof lp === "function") return lp(item);
// //     if (typeof lp === "string" && lp) return item?.[lp];
// //     return item?.name ?? item?.policy_name ?? item?.title ?? item?.code ?? `#${item?.id}`;
// //   };
// //   const optionValue = (field, item) => {
// //     const vp = field.valueProp || "id";
// //     return item?.[vp];
// //   };

// //   return (
// //     <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
// //       <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
// //       <DialogContent dividers>
// //         <Typography variant="caption" color="text.secondary">
// //           Fill the details below. For linked data, use the dropdowns.
// //         </Typography>

// //         <Stack spacing={2} sx={{ mt: 2 }}>
// //           {(schema || []).map((f) => {
// //             // SELECT (remote)
// //             if (f.type === "select-remote") {
// //               const rs = remote[f.key] || { loading: false, error: "", options: [] };
// //               return (
// //                 <TextField
// //                   key={f.key}
// //                   select
// //                   label={f.label}
// //                   size="small"
// //                   value={form[f.key] ?? ""}
// //                   onChange={setVal(f.key)}
// //                   helperText={rs.error ? rs.error : (f.helperText || "")}
// //                   error={!!rs.error}
// //                   InputProps={{
// //                     endAdornment: rs.loading ? <CircularProgress size={16} sx={{ ml: 1 }} /> : null
// //                   }}
// //                 >
// //                   {f.allowNone !== false && <MenuItem value="">{f.noneLabel || "— None —"}</MenuItem>}
// //                   {(rs.options || []).map(opt => (
// //                     <MenuItem key={String(optionValue(f, opt))} value={optionValue(f, opt)}>
// //                       {optionLabel(f, opt)}
// //                     </MenuItem>
// //                   ))}
// //                 </TextField>
// //               );
// //             }

// //             // SELECT (static)
// //             if (f.type === "select") {
// //               return (
// //                 <TextField key={f.key} select label={f.label} size="small"
// //                   value={form[f.key] ?? ""} onChange={setVal(f.key)}>
// //                   {(f.options || []).map(opt =>
// //                     <MenuItem key={String(opt.value)} value={opt.value}>{opt.label}</MenuItem>
// //                   )}
// //                 </TextField>
// //               );
// //             }

// //             // CHECKBOX
// //             if (f.type === "checkbox") {
// //               return (
// //                 <Box key={f.key}>
// //                   <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
// //                     <input type="checkbox" checked={!!form[f.key]} onChange={setVal(f.key)} />
// //                     <Typography variant="body2">{f.label}</Typography>
// //                   </label>
// //                 </Box>
// //               );
// //             }

// //             // DEFAULT INPUT
// //             return (
// //               <TextField
// //                 key={f.key}
// //                 label={f.label}
// //                 size="small"
// //                 type={f.type || "text"}
// //                 value={form[f.key] ?? ""}
// //                 onChange={setVal(f.key)}
// //               />
// //             );
// //           })}
// //         </Stack>
// //       </DialogContent>

// //       <DialogActions>
// //         <Button onClick={() => onClose(false)} disabled={saving}>Close</Button>
// //         <Button onClick={submit} variant="contained" disabled={saving}>Submit</Button>
// //       </DialogActions>
// //     </Dialog>
// //   );
// // }



// // src/rm/config/ConfigModal.jsx 
// import React, { useState } from "react";
// import {
//   Dialog, DialogTitle, DialogContent, DialogActions,
//   Box, Typography, TextField, MenuItem, Button, Stack
// } from "@mui/material";
// import { authHeaders } from "../../../utils/authHeaders";
// import { safeJson } from "../../../utils/safeJson";

// // const authHeaders = () => {
// //   const t = localStorage.getItem("token") || sessionStorage.getItem("token")
// //     || (document.cookie.match(/(?:^|;\\s*)token=([^;]+)/)?.[1] ?? "");
// //   return t ? { Authorization: `Bearer ${t}`, "X-Last-Activity": String(Date.now()) } : {};
// // };


// /**
//  * props:
//  * open, onClose, title, resource, schema (array of {key,label,type,options})
//  */
// export default function ConfigModal({ open, onClose, title, resource, schema }) {
//   const [form, setForm] = useState({});

//   const setVal = (k) => (e) => {
//     const v = (schema.find(s => s.key===k)?.type === "checkbox") ? e.target.checked : e.target.value;
//     setForm((f) => ({ ...f, [k]: v }));
//   };

//   const submit = async () => {
//     try {
//       const res = await fetch(`/api/rmconfig/${resource}`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", ...authHeaders() },
//         body: JSON.stringify(form),
//       });
//       // const out = await res.json();
//       const out = await safeJson(res);
//       if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
//       onClose(true);
//     } catch (e) {
//       alert(e.message || "Save failed");
//     }
//   };

//   return (
//     <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
//       <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
//       <DialogContent dividers>
//         <Typography variant="caption" color="text.secondary">
//           Related data from table/tables wherever applicable
//         </Typography>

//         <Stack spacing={2} sx={{ mt: 2 }}>
//           {schema.map((f) => {
//             if (f.type === "select") {
//               return (
//                 <TextField key={f.key} select label={f.label} size="small"
//                   value={form[f.key] ?? ""} onChange={setVal(f.key)}>
//                   {(f.options || []).map(opt =>
//                     <MenuItem key={String(opt.value)} value={opt.value}>{opt.label}</MenuItem>
//                   )}
//                 </TextField>
//               );
//             }
//             if (f.type === "checkbox") {
//               return (
//                 <Box key={f.key}>
//                   <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
//                     <input type="checkbox" checked={!!form[f.key]} onChange={setVal(f.key)} />
//                     <Typography variant="body2">{f.label}</Typography>
//                   </label>
//                 </Box>
//               );
//             }
//             return (
//               <TextField key={f.key} label={f.label} size="small"
//                 type={f.type || "text"} value={form[f.key] ?? ""} onChange={setVal(f.key)} />
//             );
//           })}
//         </Stack>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={() => onClose(false)}>Close</Button>
//         <Button onClick={submit} variant="contained">Submit</Button>
//       </DialogActions>
//     </Dialog>
//   );
// }
