// src/pages/forms/ViewFormModal.js
import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Box, CircularProgress, Alert,
  Checkbox, FormControlLabel, Select, InputLabel, FormControl, RadioGroup, Radio
} from '@mui/material';
import api from '../../services/api';

const RESERVED = new Set(['id', 'created_at', 'created_by', 'updated_at', 'updated_by']);

const parseOptions = (csv) =>
  String(csv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Input helpers for date granularity controls
const dateInputProps = (gran) => {
  if (gran === 'month') return { type: 'month' };
  if (gran === 'year') return { type: 'number', inputProps: { min: 1900, max: 2100, step: 1 } };
  return { type: 'date' }; // default: YYYY-MM-DD
};

// ---- helpers for code<->label & API normalization ----
const codeLabelPairs = (options) => options.map((label, i) => ({ code: i + 1, label }));
const labelToCode = (val, options) => {
  if (val === null || val === undefined || val === '') return '';
  const n = Number(val);
  if (!Number.isNaN(n)) return n; // already numeric or numeric string
  const idx = options.findIndex((o) => String(o).toLowerCase() === String(val).toLowerCase());
  return idx >= 0 ? idx + 1 : '';
};

const pickIds = (res) => {
  const arr = res?.data ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => (typeof x === 'object' ? (x.id ?? x.ID ?? Object.values(x)[0]) : x));
};

const pickRow = (res) =>
  res?.data?.data ??
  res?.data?.row ??
  res?.data?.record ??
  res?.data ??
  {};

const normalizeDate = (v) => {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') {
    // ISO → YYYY-MM-DD
    if (v.length >= 10 && v[4] === '-' && v[7] === '-') return v.slice(0, 10);
    // dd/mm/yyyy or d/m/yyyy → YYYY-MM-DD
    const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const d = m[1].padStart(2, '0');
      const mo = m[2].padStart(2, '0');
      const y = m[3];
      return `${y}-${mo}-${d}`;
    }
  }
  return v;
};

const coerceRowForFields = (row, fieldDefs) => {
  const out = {};
  (fieldDefs || []).forEach((f) => {
    const key = f.columnName;
    const input = String(f.inputType || '').toLowerCase();
    const isInt = String(f.dataType || '').toLowerCase().includes('int');
    const opts = parseOptions(f.optionsCsv);
    let v = row?.[key];

    if (input === 'date') v = normalizeDate(v);
    else if (input === 'integer') v = v === '' || v === null || v === undefined ? '' : Number(v);
    else if ((input === 'radio' || input === 'dropdownlist') && isInt && opts.length) {
      // Convert stored label → numeric code 1..N; keep null if no match
      const mapped = labelToCode(v, opts);
      v = mapped === '' ? null : mapped;
    } else if (input === 'checkbox') {
      const s = String(v).toLowerCase();
      v = v === true || v === 1 || s === '1' || s === 'true' || s === 'yes';
    }

    out[key] = v ?? '';
  });
  return out;
};

const buildSafeDataForSubmit = (fields, formData) => {
  const data = {};
  (fields || []).forEach((f) => {
    const key = f.columnName;
    if (RESERVED.has(String(key).toLowerCase())) return;

    const input = String(f.inputType || '').toLowerCase();
    const isInt = String(f.dataType || '').toLowerCase().includes('int');
    let v = formData[key];

    if (input === 'integer') v = v === '' || v === null || v === undefined ? null : Number(v);
    else if ((input === 'radio' || input === 'dropdownlist') && isInt) {
      // Always store numeric code (1..N)
      v = v === '' || v === null || v === undefined ? null : Number(v);
    } else if (input === 'checkbox') {
      v = v ? 1 : 0; // store as 1/0 for consistency
    }
    // date remains 'YYYY-MM-DD' string

    data[key] = v;
  });
  return data;
};
// ------------------------------------------------------

const ViewFormModal = ({ open, onClose, formConfig }) => {
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState('');
  const [existingIds, setExistingIds] = useState([]);
  const [errMsg, setErrMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const configId = formConfig?.configId ?? formConfig?.id ?? null;
  const rawType = (formConfig?.type || '').toString().toLowerCase();
  const isUpdate = rawType === 'update';

  // Reset local state when dialog closes
  useEffect(() => {
    if (open) return;
    setFields([]);
    setFormData({});
    setLoading(false);
    setRecordId('');
    setExistingIds([]);
    setErrMsg('');
    setOkMsg('');
  }, [open]);

  // Initialize when opened
  useEffect(() => {
    if (!open) return;

    if (!configId) {
      setErrMsg('Config ID is missing. Please pass form_configs.id as formConfig.id/configId.');
      return;
    }
    setErrMsg('');
    setOkMsg('');

    // accept fields_json OR fields; then filter visible
    const allFields =
      (Array.isArray(formConfig?.fields_json) && formConfig.fields_json) ||
      (Array.isArray(formConfig?.fields) && formConfig.fields) ||
      [];
    const visible = allFields.filter((f) => f.visible);
    setFields(visible);
    setFormData({});
    setRecordId('');

    if (isUpdate) fetchExistingIds(configId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, formConfig, configId, isUpdate]);

  const fetchExistingIds = async (cid) => {
    try {
      const res = await api.get(`/formdata/${cid}/ids`);
      setExistingIds(pickIds(res));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) setErrMsg('Your session has expired. Please log in again.');
      else if (status === 403) setErrMsg(err?.response?.data?.error || 'Access denied.');
      else setErrMsg('Failed to load record list.');
      setExistingIds([]);
      console.warn('IDs load error:', err);
    }
  };

  const handleIdSelect = async (id) => {
    setLoading(true);
    setRecordId(id);
    setOkMsg('');
    setErrMsg('');
    try {
      const res = await api.get(`/formdata/${configId}/${id}`);
      const row = pickRow(res);
      setFormData(coerceRowForFields(row, fields));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) setErrMsg('Your session has expired. Please log in again.');
      else if (status === 403) setErrMsg(err?.response?.data?.error || 'Access denied.');
      else setErrMsg(err?.response?.data?.error || 'Failed to load record.');
      console.error('Load record error:', err);
    } finally {
      setLoading(false);
    }
  };

  const setValue = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleFile = async (field, file) => {
    if (!file) {
      setValue(field, '');
      return;
    }
    const toBase64 = (f) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
    try {
      const dataUrl = await toBase64(file);
      setValue(field, dataUrl);
    } catch (e) {
      setErrMsg('Failed to read file.');
    }
  };

  const handleSubmit = async () => {
    if (!configId) {
      setErrMsg('Config ID is missing; cannot submit.');
      return;
    }
    setErrMsg('');
    setOkMsg('');
    const path = isUpdate ? '/formdata/update' : '/formdata/insert';

    const safeData = buildSafeDataForSubmit(fields, formData);

    const payload = isUpdate
      ? { configId, entryId: /^\d+$/.test(String(recordId)) ? Number(recordId) : recordId, formData: safeData }
      : { configId, formData: safeData };

    setLoading(true);
    try {
      await api.post(path, payload);
      setOkMsg(isUpdate ? 'Update saved successfully!' : 'Form submitted successfully!');
      // setTimeout(onClose, 600); // optional
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) setErrMsg('Your session has expired. Please log in again.');
      else if (status === 403) setErrMsg(err?.response?.data?.error || 'Access denied.');
      else setErrMsg(err?.response?.data?.error || err?.response?.data?.message || 'Submission failed');
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (f) => {
    const key = f.columnName;
    const inputType = String(f.inputType || '').toLowerCase();
    const options = parseOptions(f.optionsCsv);
    const pairs = codeLabelPairs(options);
    const isInt = String(f.dataType || '').toLowerCase().includes('int');
    const value = formData[key] ?? '';
    const commonProps = {
      fullWidth: true,
      required: !!f.mandatory,
      disabled: !!f.readOnly,
      label: f.columnName,
      size: 'small',
    };

    switch (inputType) {
      case 'textarea':
        return (
          <TextField
            {...commonProps}
            multiline
            minRows={3}
            value={value}
            onChange={(e) => setValue(key, e.target.value)}
          />
        );

      case 'checkbox':
        return (
          <FormControlLabel
            label={f.columnName}
            control={
              <Checkbox
                checked={Boolean(value)}
                onChange={(e) => setValue(key, e.target.checked)}
              />
            }
          />
        );

      case 'radio':
        return (
          <FormControl fullWidth>
            <InputLabel shrink>{f.columnName}</InputLabel>
            <RadioGroup
              value={value === null || value === undefined ? '' : String(value)}
              onChange={(e) => setValue(key, isInt ? Number(e.target.value) : e.target.value)}
            >
              {pairs.map(({ code, label }) => (
                <FormControlLabel
                  key={code}
                  value={String(isInt ? code : label)}
                  control={<Radio />}
                  label={label}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'dropdownlist':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{f.columnName}</InputLabel>
            <Select
              label={f.columnName}
              value={value === null || value === undefined ? '' : String(value)}
              onChange={(e) => setValue(key, isInt ? Number(e.target.value) : e.target.value)}
            >
              {pairs.map(({ code, label }) => (
                <MenuItem key={code} value={String(isInt ? code : label)}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'image':
        return (
          <Box>
            <InputLabel shrink>{f.columnName}</InputLabel>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(key, e.target.files?.[0])}
            />
            {value && typeof value === 'string' && value.startsWith('data:') && (
              <Box sx={{ mt: 1 }}>
                <img src={value} alt="preview" style={{ maxWidth: '100%', maxHeight: 160 }} />
              </Box>
            )}
          </Box>
        );

      case 'date': {
        const gran = f.dateGranularity || 'date';
        const attrs = dateInputProps(gran);
        return (
          <TextField
            {...commonProps}
            {...attrs}
            value={value || ''}
            onChange={(e) => setValue(key, e.target.value)}
          />
        );
      }

      case 'integer':
        return (
          <TextField
            {...commonProps}
            type="number"
            value={value}
            onChange={(e) =>
              setValue(key, e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        );

      default:
        return (
          <TextField
            {...commonProps}
            type="text"
            value={value}
            onChange={(e) => setValue(key, e.target.value)}
          />
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {(formConfig?.template_name || formConfig?.templateName || 'Form')} (
        {isUpdate ? 'Update' : 'Master'} View)
      </DialogTitle>

      <DialogContent dividers>
        {errMsg && (
          <Box mb={2}>
            <Alert severity="error">{errMsg}</Alert>
          </Box>
        )}
        {okMsg && (
          <Box mb={2}>
            <Alert severity="success">{okMsg}</Alert>
          </Box>
        )}

        {isUpdate && (
          <Box mb={2}>
            <TextField
              select
              label="Select Record ID"
              fullWidth
              size="small"
              value={recordId}
              onChange={(e) => handleIdSelect(e.target.value)}
            >
              {existingIds.map((id) => (
                <MenuItem key={id} value={id}>
                  {id}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {fields.map((f, idx) => (
              <Grid item xs={12} sm={6} key={`${f.columnName}-${idx}`}>
                {renderField(f)}
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || (isUpdate && !recordId)}
        >
          {isUpdate ? 'Update' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewFormModal;


// // src/pages/forms/ViewFormModal.js
// import React, { useEffect, useState } from 'react';
// import {
//   Dialog, DialogTitle, DialogContent, DialogActions,
//   Button, TextField, MenuItem, Grid, Box, CircularProgress, Alert,
//   Checkbox, FormControlLabel, Select, InputLabel, FormControl, RadioGroup, Radio
// } from '@mui/material';
// import api from '../services/api';

// const RESERVED = new Set(['id', 'created_at', 'created_by', 'updated_at', 'updated_by']);

// const parseOptions = (csv) =>
//   String(csv || '')
//     .split(',')
//     .map((s) => s.trim())
//     .filter(Boolean);

// const dateInputProps = (gran) => {
//   if (gran === 'month') return { type: 'month' };
//   if (gran === 'year') return { type: 'number', inputProps: { min: 1900, max: 2100 } };
//   return { type: 'date' };
// };

// // ---- helpers to normalize API shapes & values ----
// const pickIds = (res) => {
//   const arr = res?.data ?? [];
//   if (!Array.isArray(arr)) return [];
//   return arr.map((x) => (typeof x === 'object' ? (x.id ?? x.ID ?? Object.values(x)[0]) : x));
// };

// const pickRow = (res) =>
//   res?.data?.data ??
//   res?.data?.row ??
//   res?.data?.record ??
//   res?.data ??
//   {};

// const normalizeDate = (v) => {
//   if (!v) return '';
//   if (v instanceof Date) return v.toISOString().slice(0, 10);
//   if (typeof v === 'string') {
//     // ISO → YYYY-MM-DD
//     if (v.length >= 10 && v[4] === '-' && v[7] === '-') return v.slice(0, 10);
//     // dd/mm/yyyy or d/m/yyyy → YYYY-MM-DD
//     const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
//     if (m) {
//       const d = m[1].padStart(2, '0');
//       const mo = m[2].padStart(2, '0');
//       const y = m[3];
//       return `${y}-${mo}-${d}`;
//     }
//   }
//   return v;
// };

// const coerceRowForFields = (row, fieldDefs) => {
//   const out = {};
//   (fieldDefs || []).forEach((f) => {
//     const key = f.columnName;
//     const t = String(f.inputType || '').toLowerCase();
//     let v = row?.[key];
//     if (t === 'date') v = normalizeDate(v);
//     else if (t === 'integer') v = v === '' || v === null || v === undefined ? '' : Number(v);
//     else if (t === 'checkbox') {
//       const s = String(v).toLowerCase();
//       v = v === true || v === 1 || s === '1' || s === 'true' || s === 'yes';
//     }
//     out[key] = v ?? '';
//   });
//   return out;
// };

// const buildSafeDataForSubmit = (fields, formData) => {
//   const data = {};
//   (fields || []).forEach((f) => {
//     const key = f.columnName;
//     if (RESERVED.has(String(key).toLowerCase())) return;
//     const t = String(f.inputType || '').toLowerCase();
//     let v = formData[key];
//     if (t === 'integer') v = v === '' || v === null || v === undefined ? null : Number(v);
//     else if (t === 'checkbox') v = v ? 1 : 0; // store as 1/0 for consistency
//     // date stays as 'YYYY-MM-DD' string
//     data[key] = v;
//   });
//   return data;
// };
// // --------------------------------------------------

// const ViewFormModal = ({ open, onClose, formConfig }) => {
//   const [fields, setFields] = useState([]);
//   const [formData, setFormData] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [recordId, setRecordId] = useState('');
//   const [existingIds, setExistingIds] = useState([]);
//   const [errMsg, setErrMsg] = useState('');
//   const [okMsg, setOkMsg] = useState('');

//   const configId = formConfig?.configId ?? formConfig?.id ?? null;
//   const rawType = (formConfig?.type || '').toString().toLowerCase();
//   const isUpdate = rawType === 'update';

//   // Reset local state any time the dialog closes
//   useEffect(() => {
//     if (open) return;
//     setFields([]);
//     setFormData({});
//     setLoading(false);
//     setRecordId('');
//     setExistingIds([]);
//     setErrMsg('');
//     setOkMsg('');
//   }, [open]);

//   // Initialize when opened
//   useEffect(() => {
//     if (!open) return;

//     if (!configId) {
//       setErrMsg('Config ID is missing. Please pass form_configs.id as formConfig.id/configId.');
//       return;
//     }
//     setErrMsg('');
//     setOkMsg('');

//     // accept fields_json OR fields; then filter visible
//     const allFields =
//       (Array.isArray(formConfig?.fields_json) && formConfig.fields_json) ||
//       (Array.isArray(formConfig?.fields) && formConfig.fields) ||
//       [];
//     const visible = allFields.filter((f) => f.visible);
//     setFields(visible);
//     setFormData({});
//     setRecordId('');

//     if (isUpdate) fetchExistingIds(configId);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [open, formConfig, configId, isUpdate]);

//   const fetchExistingIds = async (cid) => {
//     try {
//       const res = await api.get(`/formdata/${cid}/ids`);
//       setExistingIds(pickIds(res));
//     } catch (err) {
//       const status = err?.response?.status;
//       if (status === 401) setErrMsg('Your session has expired. Please log in again.');
//       else if (status === 403) setErrMsg(err?.response?.data?.error || 'Access denied.');
//       else setErrMsg('Failed to load record list.');
//       setExistingIds([]);
//       console.warn('IDs load error:', err);
//     }
//   };

//   const handleIdSelect = async (id) => {
//     setLoading(true);
//     setRecordId(id);
//     setOkMsg('');
//     setErrMsg('');
//     try {
//       const res = await api.get(`/formdata/${configId}/${id}`);
//       const row = pickRow(res);
//       setFormData(coerceRowForFields(row, fields));
//     } catch (err) {
//       const status = err?.response?.status;
//       if (status === 401) setErrMsg('Your session has expired. Please log in again.');
//       else if (status === 403) setErrMsg(err?.response?.data?.error || 'Access denied.');
//       else setErrMsg(err?.response?.data?.error || 'Failed to load record.');
//       console.error('Load record error:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const setValue = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

//   const handleFile = async (field, file) => {
//     if (!file) {
//       setValue(field, '');
//       return;
//     }
//     const toBase64 = (f) =>
//       new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => resolve(reader.result);
//         reader.onerror = reject;
//         reader.readAsDataURL(f);
//       });
//     try {
//       const dataUrl = await toBase64(file);
//       setValue(field, dataUrl);
//     } catch (e) {
//       setErrMsg('Failed to read file.');
//     }
//   };

//   const handleSubmit = async () => {
//     if (!configId) {
//       setErrMsg('Config ID is missing; cannot submit.');
//       return;
//     }
//     setErrMsg('');
//     setOkMsg('');
//     const path = isUpdate ? '/formdata/update' : '/formdata/insert';

//     // Build safe data from defined fields only (type-coerced)
//     const safeData = buildSafeDataForSubmit(fields, formData);

//     const payload = isUpdate
//       ? { configId, entryId: /^\d+$/.test(String(recordId)) ? Number(recordId) : recordId, formData: safeData }
//       : { configId, formData: safeData };

//     setLoading(true);
//     try {
//       await api.post(path, payload);
//       setOkMsg(isUpdate ? 'Update saved successfully!' : 'Form submitted successfully!');
//       // Optionally close after a short delay
//       // setTimeout(onClose, 600);
//     } catch (err) {
//       const status = err?.response?.status;
//       if (status === 401) setErrMsg('Your session has expired. Please log in again.');
//       else if (status === 403) setErrMsg(err?.response?.data?.error || 'Access denied.');
//       else setErrMsg(err?.response?.data?.error || err?.response?.data?.message || 'Submission failed');
//       console.error('Submit error:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderField = (f) => {
//     const key = f.columnName;
//     const inputType = String(f.inputType || '').toLowerCase();
//     const options = parseOptions(f.optionsCsv);
//     const value = formData[key] ?? '';
//     const commonProps = {
//       fullWidth: true,
//       required: !!f.mandatory,
//       disabled: !!f.readOnly,
//       label: f.columnName,
//       size: 'small',
//     };

//     switch (inputType) {
//       case 'textarea':
//         return (
//           <TextField
//             {...commonProps}
//             multiline
//             minRows={3}
//             value={value}
//             onChange={(e) => setValue(key, e.target.value)}
//           />
//         );

//       case 'checkbox':
//         return (
//           <FormControlLabel
//             label={f.columnName}
//             control={
//               <Checkbox
//                 checked={Boolean(value)}
//                 onChange={(e) => setValue(key, e.target.checked)}
//               />
//             }
//           />
//         );

//       case 'radio':
//         return (
//           <FormControl fullWidth>
//             <InputLabel shrink>{f.columnName}</InputLabel>
//             <RadioGroup value={value} onChange={(e) => setValue(key, e.target.value)}>
//               {options.map((opt) => (
//                 <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
//               ))}
//             </RadioGroup>
//           </FormControl>
//         );

//       case 'dropdownlist':
//         return (
//           <FormControl fullWidth size="small">
//             <InputLabel>{f.columnName}</InputLabel>
//             <Select
//               label={f.columnName}
//               value={value}
//               onChange={(e) => setValue(key, e.target.value)}
//             >
//               {options.map((opt) => (
//                 <MenuItem key={opt} value={opt}>
//                   {opt}
//                 </MenuItem>
//               ))}
//             </Select>
//           </FormControl>
//         );

//       case 'image':
//         return (
//           <Box>
//             <InputLabel shrink>{f.columnName}</InputLabel>
//             <input
//               type="file"
//               accept="image/*"
//               onChange={(e) => handleFile(key, e.target.files?.[0])}
//             />
//             {value && typeof value === 'string' && value.startsWith('data:') && (
//               <Box sx={{ mt: 1 }}>
//                 <img src={value} alt="preview" style={{ maxWidth: '100%', maxHeight: 160 }} />
//               </Box>
//             )}
//           </Box>
//         );

//       case 'date': {
//         const gran = f.dateGranularity || 'date';
//         const attrs = dateInputProps(gran);
//         return (
//           <TextField
//             {...commonProps}
//             {...attrs}
//             value={value || ''}
//             onChange={(e) => setValue(key, e.target.value)}
//           />
//         );
//       }

//       case 'integer':
//         return (
//           <TextField
//             {...commonProps}
//             type="number"
//             value={value}
//             onChange={(e) =>
//               setValue(key, e.target.value === '' ? '' : Number(e.target.value))
//             }
//           />
//         );

//       default:
//         return (
//           <TextField
//             {...commonProps}
//             type="text"
//             value={value}
//             onChange={(e) => setValue(key, e.target.value)}
//           />
//         );
//     }
//   };

//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
//       <DialogTitle>
//         {(formConfig?.template_name || formConfig?.templateName || 'Form')} (
//         {isUpdate ? 'Update' : 'Master'} View)
//       </DialogTitle>

//       <DialogContent dividers>
//         {errMsg && (
//           <Box mb={2}>
//             <Alert severity="error">{errMsg}</Alert>
//           </Box>
//         )}
//         {okMsg && (
//           <Box mb={2}>
//             <Alert severity="success">{okMsg}</Alert>
//           </Box>
//         )}

//         {isUpdate && (
//           <Box mb={2}>
//             <TextField
//               select
//               label="Select Record ID"
//               fullWidth
//               size="small"
//               value={recordId}
//               onChange={(e) => handleIdSelect(e.target.value)}
//             >
//               {existingIds.map((id) => (
//                 <MenuItem key={id} value={id}>
//                   {id}
//                 </MenuItem>
//               ))}
//             </TextField>
//           </Box>
//         )}

//         {loading ? (
//           <Box display="flex" justifyContent="center" py={4}>
//             <CircularProgress />
//           </Box>
//         ) : (
//           <Grid container spacing={2}>
//             {fields.map((f, idx) => (
//               <Grid item xs={12} sm={6} key={`${f.columnName}-${idx}`}>
//                 {renderField(f)}
//               </Grid>
//             ))}
//           </Grid>
//         )}
//       </DialogContent>

//       <DialogActions>
//         <Button onClick={onClose}>Cancel</Button>
//         <Button
//           variant="contained"
//           onClick={handleSubmit}
//           disabled={loading || (isUpdate && !recordId)}
//         >
//           {isUpdate ? 'Update' : 'Submit'}
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default ViewFormModal;




// // // src/pages/forms/ViewFormModal.js
// // import React, { useEffect, useState } from 'react';
// // import {
// //   Dialog, DialogTitle, DialogContent, DialogActions,
// //   Button, TextField, MenuItem, Grid, Box, CircularProgress, Alert,
// //   Checkbox, FormControlLabel, Select, InputLabel, FormControl, RadioGroup, Radio
// // } from '@mui/material';
// // import api from '../services/api';

// // const RESERVED = new Set(['id', 'created_at', 'created_by', 'updated_at', 'updated_by']);

// // const parseOptions = (csv) =>
// //   String(csv || '')
// //     .split(',')
// //     .map((s) => s.trim())
// //     .filter(Boolean);

// // const dateInputProps = (gran) => {
// //   if (gran === 'month') return { type: 'month' };
// //   if (gran === 'year') return { type: 'number', inputProps: { min: 1900, max: 2100 } };
// //   return { type: 'date' };
// // };

// // const ViewFormModal = ({ open, onClose, formConfig }) => {
// //   const [fields, setFields] = useState([]);
// //   const [formData, setFormData] = useState({});
// //   const [loading, setLoading] = useState(false);
// //   const [recordId, setRecordId] = useState('');
// //   const [existingIds, setExistingIds] = useState([]);
// //   const [errMsg, setErrMsg] = useState('');
// //   const [okMsg, setOkMsg] = useState('');

// //   const configId = formConfig?.configId ?? formConfig?.id ?? null;
// //   const rawType = (formConfig?.type || '').toString().toLowerCase();
// //   const isUpdate = rawType === 'update';

// //   // Reset local state any time the dialog closes
// //   useEffect(() => {
// //     if (open) return;
// //     setFields([]);
// //     setFormData({});
// //     setLoading(false);
// //     setRecordId('');
// //     setExistingIds([]);
// //     setErrMsg('');
// //     setOkMsg('');
// //   }, [open]);

// //   // Initialize when opened
// //   useEffect(() => {
// //     if (!open) return;

// //     if (!configId) {
// //       setErrMsg('Config ID is missing. Please pass form_configs.id as formConfig.id/configId.');
// //       return;
// //     }
// //     setErrMsg('');
// //     setOkMsg('');

// //     // only visible fields render
// //     const visible = Array.isArray(formConfig?.fields_json)
// //       ? formConfig.fields_json.filter((f) => f.visible)
// //       : [];
// //     setFields(visible);
// //     setFormData({});
// //     setRecordId('');

// //     if (isUpdate) fetchExistingIds(configId);
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [open, formConfig, configId, isUpdate]);

// //   const fetchExistingIds = async (cid) => {
// //     try {
// //       const res = await api.get(`/formdata/${cid}/ids`);
// //       setExistingIds(Array.isArray(res.data) ? res.data : []);
// //     } catch (err) {
// //       const status = err?.response?.status;
// //       if (status === 401) setErrMsg('Your session has expired. Please log in again.');
// //       else if (status === 403) setErrMsg(err?.response?.data?.error || 'Access denied.');
// //       else setErrMsg('Failed to load record list.');
// //       setExistingIds([]);
// //       console.warn('IDs load error:', err);
// //     }
// //   };

// //   const handleIdSelect = async (id) => {
// //     setLoading(true);
// //     setRecordId(id);
// //     setOkMsg('');
// //     setErrMsg('');
// //     try {
// //       const res = await api.get(`/formdata/${configId}/${id}`);
// //       const row = res?.data?.data || {};
// //       setFormData(row);
// //     } catch (err) {
// //       const status = err?.response?.status;
// //       if (status === 401) setErrMsg('Your session has expired. Please log in again.');
// //       else if (status === 403) setErrMsg(err?.response?.data?.error || 'Access denied.');
// //       else setErrMsg(err?.response?.data?.error || 'Failed to load record.');
// //       console.error('Load record error:', err);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const setValue = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

// //   const handleFile = async (field, file) => {
// //     if (!file) {
// //       setValue(field, '');
// //       return;
// //     }
// //     const toBase64 = (f) =>
// //       new Promise((resolve, reject) => {
// //         const reader = new FileReader();
// //         reader.onload = () => resolve(reader.result);
// //         reader.onerror = reject;
// //         reader.readAsDataURL(f);
// //       });
// //     try {
// //       const dataUrl = await toBase64(file);
// //       setValue(field, dataUrl);
// //     } catch (e) {
// //       setErrMsg('Failed to read file.');
// //     }
// //   };

// //   const handleSubmit = async () => {
// //     if (!configId) {
// //       setErrMsg('Config ID is missing; cannot submit.');
// //       return;
// //     }
// //     setErrMsg('');
// //     setOkMsg('');
// //     const path = isUpdate ? '/formdata/update' : '/formdata/insert';

// //     // Strip reserved fields
// //     const safeData = Object.fromEntries(
// //       Object.entries(formData).filter(([k]) => !RESERVED.has(String(k).toLowerCase()))
// //     );

// //     const payload = isUpdate
// //       ? { configId, entryId: recordId, formData: safeData }
// //       : { configId, formData: safeData };

// //     setLoading(true);
// //     try {
// //       await api.post(path, payload);
// //       setOkMsg('Form submitted successfully!');
// //       // optionally close after a short delay
// //       // setTimeout(onClose, 600);
// //     } catch (err) {
// //       const status = err?.response?.status;
// //       if (status === 401) setErrMsg('Your session has expired. Please log in again.');
// //       else if (status === 403) setErrMsg(err?.response?.data?.error || 'Access denied.');
// //       else setErrMsg(err?.response?.data?.error || err?.response?.data?.message || 'Submission failed');
// //       console.error('Submit error:', err);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const renderField = (f) => {
// //     const key = f.columnName;
// //     const inputType = String(f.inputType || '').toLowerCase();
// //     const options = parseOptions(f.optionsCsv);
// //     const value = formData[key] ?? '';
// //     const commonProps = {
// //       fullWidth: true,
// //       required: !!f.mandatory,
// //       disabled: !!f.readOnly,
// //       label: f.columnName,
// //       size: 'small',
// //     };

// //     switch (inputType) {
// //       case 'textarea':
// //         return (
// //           <TextField
// //             {...commonProps}
// //             multiline
// //             minRows={3}
// //             value={value}
// //             onChange={(e) => setValue(key, e.target.value)}
// //           />
// //         );

// //       case 'checkbox':
// //         return (
// //           <FormControlLabel
// //             label={f.columnName}
// //             control={
// //               <Checkbox
// //                 checked={Boolean(value)}
// //                 onChange={(e) => setValue(key, e.target.checked)}
// //               />
// //             }
// //           />
// //         );

// //       case 'radio':
// //         return (
// //           <FormControl fullWidth>
// //             <InputLabel shrink>{f.columnName}</InputLabel>
// //             <RadioGroup value={value} onChange={(e) => setValue(key, e.target.value)}>
// //               {options.map((opt) => (
// //                 <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
// //               ))}
// //             </RadioGroup>
// //           </FormControl>
// //         );

// //       case 'dropdownlist':
// //         return (
// //           <FormControl fullWidth size="small">
// //             <InputLabel>{f.columnName}</InputLabel>
// //             <Select
// //               label={f.columnName}
// //               value={value}
// //               onChange={(e) => setValue(key, e.target.value)}
// //             >
// //               {options.map((opt) => (
// //                 <MenuItem key={opt} value={opt}>
// //                   {opt}
// //                 </MenuItem>
// //               ))}
// //             </Select>
// //           </FormControl>
// //         );

// //       case 'image':
// //         return (
// //           <Box>
// //             <InputLabel shrink>{f.columnName}</InputLabel>
// //             <input
// //               type="file"
// //               accept="image/*"
// //               onChange={(e) => handleFile(key, e.target.files?.[0])}
// //             />
// //             {value && typeof value === 'string' && value.startsWith('data:') && (
// //               <Box sx={{ mt: 1 }}>
// //                 <img src={value} alt="preview" style={{ maxWidth: '100%', maxHeight: 160 }} />
// //               </Box>
// //             )}
// //           </Box>
// //         );

// //       case 'date': {
// //         const gran = f.dateGranularity || 'date';
// //         const attrs = dateInputProps(gran);
// //         return (
// //           <TextField
// //             {...commonProps}
// //             {...attrs}
// //             value={value || ''}
// //             onChange={(e) => setValue(key, e.target.value)}
// //           />
// //         );
// //       }

// //       case 'integer':
// //         return (
// //           <TextField
// //             {...commonProps}
// //             type="number"
// //             value={value}
// //             onChange={(e) =>
// //               setValue(key, e.target.value === '' ? '' : Number(e.target.value))
// //             }
// //           />
// //         );

// //       default:
// //         return (
// //           <TextField
// //             {...commonProps}
// //             type="text"
// //             value={value}
// //             onChange={(e) => setValue(key, e.target.value)}
// //           />
// //         );
// //     }
// //   };

// //   return (
// //     <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
// //       <DialogTitle>
// //         {(formConfig?.template_name || formConfig?.templateName || 'Form')} (
// //         {isUpdate ? 'Update' : 'Master'} View)
// //       </DialogTitle>

// //       <DialogContent dividers>
// //         {errMsg && (
// //           <Box mb={2}>
// //             <Alert severity="error">{errMsg}</Alert>
// //           </Box>
// //         )}
// //         {okMsg && (
// //           <Box mb={2}>
// //             <Alert severity="success">{okMsg}</Alert>
// //           </Box>
// //         )}

// //         {isUpdate && (
// //           <Box mb={2}>
// //             <TextField
// //               select
// //               label="Select Record ID"
// //               fullWidth
// //               size="small"
// //               value={recordId}
// //               onChange={(e) => handleIdSelect(e.target.value)}
// //             >
// //               {existingIds.map((id) => (
// //                 <MenuItem key={id} value={id}>
// //                   {id}
// //                 </MenuItem>
// //               ))}
// //             </TextField>
// //           </Box>
// //         )}

// //         {loading ? (
// //           <Box display="flex" justifyContent="center" py={4}>
// //             <CircularProgress />
// //           </Box>
// //         ) : (
// //           <Grid container spacing={2}>
// //             {fields.map((f, idx) => (
// //               <Grid item xs={12} sm={6} key={`${f.columnName}-${idx}`}>
// //                 {renderField(f)}
// //               </Grid>
// //             ))}
// //           </Grid>
// //         )}
// //       </DialogContent>

// //       <DialogActions>
// //         <Button onClick={onClose}>Cancel</Button>
// //         <Button
// //           variant="contained"
// //           onClick={handleSubmit}
// //           disabled={loading || (isUpdate && !recordId)}
// //         >
// //           {isUpdate ? 'Update' : 'Submit'}
// //         </Button>
// //       </DialogActions>
// //     </Dialog>
// //   );
// // };

// // export default ViewFormModal;


// // // import React, { useEffect, useState } from 'react';
// // // import {
// // //   Dialog, DialogTitle, DialogContent, DialogActions,
// // //   Button, TextField, MenuItem, Grid, Box, CircularProgress, Alert,
// // //   Checkbox, FormControlLabel, Select, InputLabel, FormControl, RadioGroup, Radio
// // // } from '@mui/material';
// // // import api from '../services/api';

// // // const RESERVED = new Set(['id', 'created_at', 'created_by', 'updated_at', 'updated_by']);

// // // const parseOptions = (csv) =>
// // //   (csv || '')
// // //     .split(',')
// // //     .map(s => s.trim())
// // //     .filter(Boolean);

// // // const dateInputProps = (gran) => {
// // //   if (gran === 'month') return { type: 'month' };
// // //   if (gran === 'year') return { type: 'number', inputProps: { min: 1900, max: 2100 } };
// // //   return { type: 'date' };
// // // };

// // // const ViewFormModal = ({ open, onClose, formConfig }) => {
// // //   const [fields, setFields] = useState([]);
// // //   const [formData, setFormData] = useState({});
// // //   const [loading, setLoading] = useState(false);
// // //   const [recordId, setRecordId] = useState('');
// // //   const [existingIds, setExistingIds] = useState([]);
// // //   const [errMsg, setErrMsg] = useState('');

// // //   const configId = formConfig?.configId ?? formConfig?.id ?? null;
// // //   const rawType = (formConfig?.type || '').toString().toLowerCase();
// // //   const isUpdate = rawType === 'update';

// // //   useEffect(() => {
// // //     if (!open) return;

// // //     if (!configId) {
// // //       setErrMsg('Config ID is missing. Please pass form_configs.id as formConfig.id/configId.');
// // //       return;
// // //     } else {
// // //       setErrMsg('');
// // //     }

// // //     const visibleFields = (formConfig?.fields_json || []).filter(f => f.visible);
// // //     setFields(visibleFields);
// // //     setFormData({});
// // //     setRecordId('');

// // //     if (isUpdate) fetchExistingIds(configId);
// // //     // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   }, [open, formConfig, configId, isUpdate]);

// // //   const fetchExistingIds = async (cid) => {
// // //     try {
// // //       const res = await api.get(`/formdata/${cid}/ids`);
// // //       setExistingIds(Array.isArray(res.data) ? res.data : []);
// // //     } catch (err) {
// // //       console.warn('Failed to load IDs for update:', err?.response?.status, err?.response?.data);
// // //       setExistingIds([]);
// // //     }
// // //   };

// // //   const handleIdSelect = async (id) => {
// // //     setLoading(true);
// // //     setRecordId(id);
// // //     try {
// // //       const res = await api.get(`/formdata/${configId}/${id}`);
// // //       const row = res.data?.data || {};
// // //       setFormData(row);
// // //     } catch (err) {
// // //       console.error('Error loading form data:', err);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   const setValue = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

// // //   const handleFile = async (field, file) => {
// // //     if (!file) { setValue(field, ''); return; }
// // //     const toBase64 = (f) =>
// // //       new Promise((resolve, reject) => {
// // //         const reader = new FileReader();
// // //         reader.onload = () => resolve(reader.result);
// // //         reader.onerror = reject;
// // //         reader.readAsDataURL(f);
// // //       });
// // //     const dataUrl = await toBase64(file);
// // //     setValue(field, dataUrl);
// // //   };

// // //   const handleSubmit = async () => {
// // //     if (!configId) {
// // //       setErrMsg('Config ID is missing; cannot submit.');
// // //       return;
// // //     }
// // //     const path = isUpdate ? '/formdata/update' : '/formdata/insert';

// // //     const safeData = Object.fromEntries(
// // //       Object.entries(formData).filter(([k]) => !RESERVED.has(k))
// // //     );

// // //     const payload = isUpdate
// // //       ? { configId, entryId: recordId, formData: safeData }
// // //       : { configId, formData: safeData };

// // //     try {
// // //       await api.post(path, payload);
// // //       alert('Form submitted successfully!');
// // //       onClose();
// // //     } catch (err) {
// // //       const msg = err.response?.data?.error || err.response?.data?.message || err.message;
// // //       setErrMsg(msg || 'Submission failed');
// // //     }
// // //   };

// // //   const renderField = (f) => {
// // //     const key = f.columnName;
// // //     const inputType = (f.inputType || '').toLowerCase();
// // //     const options = parseOptions(f.optionsCsv);
// // //     const value = formData[key] ?? '';
// // //     const commonProps = {
// // //       fullWidth: true,
// // //       required: !!f.mandatory,
// // //       disabled: !!f.readOnly,
// // //       label: f.columnName,
// // //     };

// // //     switch (inputType) {
// // //       case 'textarea':
// // //         return (
// // //           <TextField {...commonProps} multiline minRows={3} value={value}
// // //                      onChange={(e) => setValue(key, e.target.value)} />
// // //         );
// // //       case 'checkbox':
// // //         return (
// // //           <FormControlLabel
// // //             label={f.columnName}
// // //             control={<Checkbox checked={Boolean(value)} onChange={(e) => setValue(key, e.target.checked)} />}
// // //           />
// // //         );
// // //       case 'radio':
// // //         return (
// // //           <FormControl fullWidth>
// // //             <InputLabel shrink>{f.columnName}</InputLabel>
// // //             <RadioGroup value={value} onChange={(e) => setValue(key, e.target.value)}>
// // //               {options.map(opt => <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />)}
// // //             </RadioGroup>
// // //           </FormControl>
// // //         );
// // //       case 'dropdownlist':
// // //         return (
// // //           <FormControl fullWidth>
// // //             <InputLabel>{f.columnName}</InputLabel>
// // //             <Select label={f.columnName} value={value} onChange={(e) => setValue(key, e.target.value)}>
// // //               {options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
// // //             </Select>
// // //           </FormControl>
// // //         );
// // //       case 'image':
// // //         return (
// // //           <Box>
// // //             <InputLabel shrink>{f.columnName}</InputLabel>
// // //             <input type="file" accept="image/*" onChange={(e) => handleFile(key, e.target.files?.[0])}/>
// // //             {value && typeof value === 'string' && value.startsWith('data:') && (
// // //               <Box sx={{ mt: 1 }}><img src={value} alt="preview" style={{ maxWidth: '100%', maxHeight: 160 }} /></Box>
// // //             )}
// // //           </Box>
// // //         );
// // //       case 'date': {
// // //         const gran = f.dateGranularity || 'date';
// // //         const attrs = dateInputProps(gran);
// // //         return (
// // //           <TextField {...commonProps} {...attrs} value={value || ''} onChange={(e) => setValue(key, e.target.value)} />
// // //         );
// // //       }
// // //       case 'integer':
// // //         return (
// // //           <TextField {...commonProps} type="number" value={value}
// // //                      onChange={(e) => setValue(key, e.target.value === '' ? '' : Number(e.target.value))} />
// // //         );
// // //       default:
// // //         return (
// // //           <TextField {...commonProps} type="text" value={value}
// // //                      onChange={(e) => setValue(key, e.target.value)} />
// // //         );
// // //     }
// // //   };

// // //   return (
// // //     <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
// // //       <DialogTitle>
// // //         {(formConfig?.template_name || formConfig?.templateName || 'Form')} ({isUpdate ? 'Update' : 'Master'} View)
// // //       </DialogTitle>

// // //       <DialogContent dividers>
// // //         {errMsg && <Box mb={2}><Alert severity="error">{errMsg}</Alert></Box>}

// // //         {isUpdate && (
// // //           <Box mb={2}>
// // //             <TextField
// // //               select
// // //               label="Select Record ID"
// // //               fullWidth
// // //               value={recordId}
// // //               onChange={(e) => handleIdSelect(e.target.value)}
// // //             >
// // //               {existingIds.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
// // //             </TextField>
// // //           </Box>
// // //         )}

// // //         {loading ? (
// // //           <CircularProgress />
// // //         ) : (
// // //           <Grid container spacing={2}>
// // //             {fields.map((f, idx) => (
// // //               <Grid item xs={12} sm={6} key={`${f.columnName}-${idx}`}>
// // //                 {renderField(f)}
// // //               </Grid>
// // //             ))}
// // //           </Grid>
// // //         )}
// // //       </DialogContent>

// // //       <DialogActions>
// // //         <Button onClick={onClose}>Cancel</Button>
// // //         <Button variant="contained" onClick={handleSubmit} disabled={isUpdate && !recordId}>
// // //           {isUpdate ? 'Update' : 'Submit'}
// // //         </Button>
// // //       </DialogActions>
// // //     </Dialog>
// // //   );
// // // };

// // // export default ViewFormModal;


