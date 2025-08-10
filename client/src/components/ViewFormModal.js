import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Box, CircularProgress, Alert,
  Checkbox, FormControlLabel, Select, InputLabel, FormControl, RadioGroup, Radio
} from '@mui/material';
import api from '../services/api';

const RESERVED = new Set(['id', 'created_at', 'created_by', 'updated_at', 'updated_by']);

const parseOptions = (csv) =>
  (csv || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const dateInputProps = (gran) => {
  if (gran === 'month') return { type: 'month' };
  if (gran === 'year') return { type: 'number', inputProps: { min: 1900, max: 2100 } };
  return { type: 'date' };
};

const ViewFormModal = ({ open, onClose, formConfig }) => {
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [recordId, setRecordId] = useState('');
  const [existingIds, setExistingIds] = useState([]);
  const [errMsg, setErrMsg] = useState('');

  const configId = formConfig?.configId ?? formConfig?.id ?? null;
  const rawType = (formConfig?.type || '').toString().toLowerCase();
  const isUpdate = rawType === 'update';

  useEffect(() => {
    if (!open) return;

    if (!configId) {
      setErrMsg('Config ID is missing. Please pass form_configs.id as formConfig.id/configId.');
      return;
    } else {
      setErrMsg('');
    }

    const visibleFields = (formConfig?.fields_json || []).filter(f => f.visible);
    setFields(visibleFields);
    setFormData({});
    setRecordId('');

    if (isUpdate) fetchExistingIds(configId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, formConfig, configId, isUpdate]);

  const fetchExistingIds = async (cid) => {
    try {
      const res = await api.get(`/formdata/${cid}/ids`);
      setExistingIds(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Failed to load IDs for update:', err?.response?.status, err?.response?.data);
      setExistingIds([]);
    }
  };

  const handleIdSelect = async (id) => {
    setLoading(true);
    setRecordId(id);
    try {
      const res = await api.get(`/formdata/${configId}/${id}`);
      const row = res.data?.data || {};
      setFormData(row);
    } catch (err) {
      console.error('Error loading form data:', err);
    } finally {
      setLoading(false);
    }
  };

  const setValue = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleFile = async (field, file) => {
    if (!file) { setValue(field, ''); return; }
    const toBase64 = (f) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
    const dataUrl = await toBase64(file);
    setValue(field, dataUrl);
  };

  const handleSubmit = async () => {
    if (!configId) {
      setErrMsg('Config ID is missing; cannot submit.');
      return;
    }
    const path = isUpdate ? '/formdata/update' : '/formdata/insert';

    const safeData = Object.fromEntries(
      Object.entries(formData).filter(([k]) => !RESERVED.has(k))
    );

    const payload = isUpdate
      ? { configId, entryId: recordId, formData: safeData }
      : { configId, formData: safeData };

    try {
      await api.post(path, payload);
      alert('Form submitted successfully!');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      setErrMsg(msg || 'Submission failed');
    }
  };

  const renderField = (f) => {
    const key = f.columnName;
    const inputType = (f.inputType || '').toLowerCase();
    const options = parseOptions(f.optionsCsv);
    const value = formData[key] ?? '';
    const commonProps = {
      fullWidth: true,
      required: !!f.mandatory,
      disabled: !!f.readOnly,
      label: f.columnName,
    };

    switch (inputType) {
      case 'textarea':
        return (
          <TextField {...commonProps} multiline minRows={3} value={value}
                     onChange={(e) => setValue(key, e.target.value)} />
        );
      case 'checkbox':
        return (
          <FormControlLabel
            label={f.columnName}
            control={<Checkbox checked={Boolean(value)} onChange={(e) => setValue(key, e.target.checked)} />}
          />
        );
      case 'radio':
        return (
          <FormControl fullWidth>
            <InputLabel shrink>{f.columnName}</InputLabel>
            <RadioGroup value={value} onChange={(e) => setValue(key, e.target.value)}>
              {options.map(opt => <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />)}
            </RadioGroup>
          </FormControl>
        );
      case 'dropdownlist':
        return (
          <FormControl fullWidth>
            <InputLabel>{f.columnName}</InputLabel>
            <Select label={f.columnName} value={value} onChange={(e) => setValue(key, e.target.value)}>
              {options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
            </Select>
          </FormControl>
        );
      case 'image':
        return (
          <Box>
            <InputLabel shrink>{f.columnName}</InputLabel>
            <input type="file" accept="image/*" onChange={(e) => handleFile(key, e.target.files?.[0])}/>
            {value && typeof value === 'string' && value.startsWith('data:') && (
              <Box sx={{ mt: 1 }}><img src={value} alt="preview" style={{ maxWidth: '100%', maxHeight: 160 }} /></Box>
            )}
          </Box>
        );
      case 'date': {
        const gran = f.dateGranularity || 'date';
        const attrs = dateInputProps(gran);
        return (
          <TextField {...commonProps} {...attrs} value={value || ''} onChange={(e) => setValue(key, e.target.value)} />
        );
      }
      case 'integer':
        return (
          <TextField {...commonProps} type="number" value={value}
                     onChange={(e) => setValue(key, e.target.value === '' ? '' : Number(e.target.value))} />
        );
      default:
        return (
          <TextField {...commonProps} type="text" value={value}
                     onChange={(e) => setValue(key, e.target.value)} />
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {(formConfig?.template_name || formConfig?.templateName || 'Form')} ({isUpdate ? 'Update' : 'Master'} View)
      </DialogTitle>

      <DialogContent dividers>
        {errMsg && <Box mb={2}><Alert severity="error">{errMsg}</Alert></Box>}

        {isUpdate && (
          <Box mb={2}>
            <TextField
              select
              label="Select Record ID"
              fullWidth
              value={recordId}
              onChange={(e) => handleIdSelect(e.target.value)}
            >
              {existingIds.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
            </TextField>
          </Box>
        )}

        {loading ? (
          <CircularProgress />
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
        <Button variant="contained" onClick={handleSubmit} disabled={isUpdate && !recordId}>
          {isUpdate ? 'Update' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViewFormModal;


// // // //src/components/ViewFormModal.js
// // // import React, { useEffect, useState } from 'react';
// // // import {
// // // Dialog, DialogTitle, DialogContent, DialogActions,
// // // Button, TextField, MenuItem, Grid, Box, CircularProgress
// // // } from '@mui/material';
// // // import axios from 'axios';
// // // const ViewFormModal = ({ open, onClose, formConfig }) => {
// // // const [fields, setFields] = useState([]);
// // // const [formData, setFormData] = useState({});
// // // const [loading, setLoading] = useState(false);
// // // const [recordId, setRecordId] = useState('');
// // // const [existingIds, setExistingIds] = useState([]);
// // // const isUpdate = formConfig?.type === 'Update';

// // // useEffect(() => {

// // // if (formConfig && open) {
// // // console.log("Loaded formConfig:", formConfig);
// // // console.log("fields_json:", formConfig.fields_json);
// // // const visibleFields = (formConfig.fields_json || []).filter(f => f.visible);
// // // setFields(visibleFields);
// // // setFormData({});
// // // setRecordId('');
// // // if (isUpdate) fetchExistingIds();
// // // }
// // // }, [formConfig, open]);

// // // const fetchExistingIds = async () => {

// // // try {
// // // const res = await axios.get(`/api/formdata/${formConfig.id}/ids`);
// // // setExistingIds(res.data);
// // // } catch (err) {
// // // console.error('Error loading IDs:', err);
// // // }

// // // };

// // // const handleIdSelect = async (id) => {
// // // setLoading(true);
// // // setRecordId(id);
// // // try {
// // // const res = await axios.get(`/api/formdata/${formConfig.id}/${id}`);
// // // setFormData(res.data);
// // // } catch (err) {
// // // console.error('Error loading form data:', err);
// // // } finally {
// // // setLoading(false);
// // // }
// // // };

// // // const handleChange = (field, value) => {
// // // setFormData(prev => ({ ...prev, [field]: value }));
// // // };



// // // const handleSubmit = async () => {
// // // console.log("📤 Submitting to /insert with viewId:", formConfig?.id);
// // // console.log("📝 FormData:", formData);
// // // const api = isUpdate
// // // ? '/api/formdata/update'
// // // : '/api/formdata/insert';
// // // const payload = {
// // // viewId: formConfig?.id,
// // // data: formData,
// // // ...(isUpdate ? { id: recordId } : {})
// // // };

// // // try {
// // // const res = await axios.post(api, payload);
// // // console.log("✅ Response:", res.data);
// // // alert("Form submitted successfully!");
// // // onClose();
// // // } catch (err) {

// // // console.error("❌ Submission error:", err);
// // // alert("Error submitting form: " + (err.response?.data?.error || err.message));
// // // }
// // // };

// // // return (
// // // <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
// // // <DialogTitle>
// // // {formConfig?.template_name} ({formConfig?.type} View)
// // // </DialogTitle>
// // // <DialogContent dividers>


// // // {isUpdate && (
// // // <Box mb={2}>
// // // <TextField
// // // select
// // // label="Select Record ID"
// // // fullWidth
// // // value={recordId}
// // // onChange={(e) => handleIdSelect(e.target.value)}
// // // >

// // // {existingIds.map(id => (
// // // <MenuItem key={id} value={id}>{id}</MenuItem>
// // // ))}
// // // </TextField>
// // // </Box>
// // // )}

// // // {loading ? (
// // // <CircularProgress />
// // // ) : (

// // // <Grid container spacing={2}>
// // // {fields.map((field, idx) => (
// // // <Grid item xs={6} key={idx}>
// // // <TextField
// // // label={field.columnName}
// // // type={
// // // field.dataType === 'integer' || field.dataType === 'bigint'
// // // ? 'number'
// // // : 'text'
// // // }

// // // fullWidth
// // // required={field.mandatory}
// // // value={formData[field.columnName] || ''}
// // // onChange={(e) => handleChange(field.columnName, e.target.value)}
// // // disabled={field.readOnly}
// // // />
// // // </Grid>
// // // ))}
// // // </Grid>
// // // )}
// // // </DialogContent>
// // // <DialogActions>

// // // <Button onClick={onClose}>Cancel</Button>
// // // <Button
// // // variant="contained"
// // // onClick={handleSubmit}
// // // disabled={isUpdate && !recordId}
// // // >

// // // {isUpdate ? 'Update' : 'Submit'}
// // // </Button>
// // // </DialogActions>
// // // </Dialog>
// // // );
// // // };

// // // export default ViewFormModal;

// // // src/components/ViewFormModal.js
// // // src/components/ViewFormModal.js
// // import React, { useEffect, useState } from 'react';
// // import {
// //   Dialog, DialogTitle, DialogContent, DialogActions,
// //   Button, TextField, MenuItem, Grid, Box, CircularProgress, Alert
// // } from '@mui/material';
// // import api from '../services/api';

// // const ViewFormModal = ({ open, onClose, formConfig }) => {
// //   const [fields, setFields] = useState([]);
// //   const [formData, setFormData] = useState({});
// //   const [loading, setLoading] = useState(false);
// //   const [recordId, setRecordId] = useState('');
// //   const [existingIds, setExistingIds] = useState([]);
// //   const [errMsg, setErrMsg] = useState('');

// //   // Pull the configId from formConfig (this MUST be form_configs.id)
// //   const configId = formConfig?.configId ?? formConfig?.id ?? null;

// //   // Normalized type check (Master/Update)
// //   const rawType = (formConfig?.type || '').toString().toLowerCase();
// //   const isUpdate = rawType === 'update';

// //   useEffect(() => {
// //     if (!open) return;

// //     // Basic guard: we need a valid configId
// //     if (!configId) {
// //       setErrMsg('Config ID is missing. Please pass form_configs.id as formConfig.id/configId.');
// //       return;
// //     } else {
// //       setErrMsg('');
// //     }

// //     // Prepare fields from fields_json
// //     const visibleFields = (formConfig?.fields_json || []).filter(f => f.visible);
// //     setFields(visibleFields);
// //     setFormData({});
// //     setRecordId('');

// //     // Load IDs for Update mode
// //     if (isUpdate) fetchExistingIds(configId);
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [open, formConfig, configId, isUpdate]);

// //   const fetchExistingIds = async (cid) => {
// //     try {
// //       const res = await api.get(`/formdata/${cid}/ids`);
// //       // backend returns array of ids
// //       setExistingIds(Array.isArray(res.data) ? res.data : []);
// //     } catch (err) {
// //       console.warn('Failed to load IDs for update:', err?.response?.status, err?.response?.data);
// //       setExistingIds([]);
// //     }
// //   };

// //   const handleIdSelect = async (id) => {
// //     setLoading(true);
// //     setRecordId(id);
// //     try {
// //       const res = await api.get(`/formdata/${configId}/${id}`);
// //       const row = res.data?.data || {};
// //       setFormData(row);
// //     } catch (err) {
// //       console.error('Error loading form data:', err);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleChange = (field, value, dataType) => {
// //     // Optional: number coercion for integer/bigint
// //     const v =
// //       dataType === 'integer' || dataType === 'bigint'
// //         ? (value === '' ? '' : Number(value))
// //         : value;

// //     setFormData(prev => ({ ...prev, [field]: v }));
// //   };

// //   const handleSubmit = async () => {
// //     if (!configId) {
// //       setErrMsg('Config ID is missing; cannot submit.');
// //       return;
// //     }

// //     const path = isUpdate ? '/formdata/update' : '/formdata/insert';
// //     const payload = isUpdate
// //       ? { configId, entryId: recordId, formData }
// //       : { configId, formData };

// //     try {
// //       const res = await api.post(path, payload);
// //       console.log('✅ Submit response:', res.data);
// //       alert('Form submitted successfully!');
// //       onClose();
// //     } catch (err) {
// //       console.error('❌ Submission error:', err);
// //       const msg = err.response?.data?.error || err.response?.data?.message || err.message;
// //       setErrMsg(msg || 'Submission failed');
// //     }
// //   };

// //   return (
// //     <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
// //       <DialogTitle>
// //         {formConfig?.template_name || formConfig?.templateName || 'Form'} ({isUpdate ? 'Update' : 'Master'} View)
// //       </DialogTitle>

// //       <DialogContent dividers>
// //         {errMsg && (
// //           <Box mb={2}>
// //             <Alert severity="error">{errMsg}</Alert>
// //           </Box>
// //         )}

// //         {isUpdate && (
// //           <Box mb={2}>
// //             <TextField
// //               select
// //               label="Select Record ID"
// //               fullWidth
// //               value={recordId}
// //               onChange={(e) => handleIdSelect(e.target.value)}
// //             >
// //               {existingIds.map((id) => (
// //                 <MenuItem key={id} value={id}>{id}</MenuItem>
// //               ))}
// //             </TextField>
// //           </Box>
// //         )}

// //         {loading ? (
// //           <CircularProgress />
// //         ) : (
// //           <Grid container spacing={2}>
// //             {fields.map((field, idx) => (
// //               <Grid item xs={12} sm={6} key={`${field.columnName}-${idx}`}>
// //                 <TextField
// //                   label={field.columnName}
// //                   type={
// //                     field.dataType === 'integer' || field.dataType === 'bigint'
// //                       ? 'number'
// //                       : 'text'
// //                   }
// //                   fullWidth
// //                   required={!!field.mandatory}
// //                   value={formData[field.columnName] ?? ''}
// //                   onChange={(e) => handleChange(field.columnName, e.target.value, field.dataType)}
// //                   disabled={!!field.readOnly}
// //                 />
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
// //           disabled={isUpdate && !recordId}
// //         >
// //           {isUpdate ? 'Update' : 'Submit'}
// //         </Button>
// //       </DialogActions>
// //     </Dialog>
// //   );
// // };

// // export default ViewFormModal;

// import React, { useEffect, useState } from 'react';
// import {
//   Dialog, DialogTitle, DialogContent, DialogActions,
//   Button, TextField, MenuItem, Grid, Box, CircularProgress, Alert,
//   Checkbox, FormControlLabel, Select, InputLabel, FormControl, RadioGroup, Radio
// } from '@mui/material';
// import api from '../services/api';

// const RESERVED = new Set(['id', 'created_at', 'created_by', 'updated_at', 'updated_by']);

// const parseOptions = (csv) =>
//   (csv || '')
//     .split(',')
//     .map(s => s.trim())
//     .filter(Boolean);

// const dateInputProps = (gran) => {
//   // HTML supports date and month; year needs a text select fallback
//   if (gran === 'month') return { type: 'month' };
//   if (gran === 'year') return { type: 'number', inputProps: { min: 1900, max: 2100 } };
//   return { type: 'date' }; // default
// };

// const ViewFormModal = ({ open, onClose, formConfig }) => {
//   const [fields, setFields] = useState([]);
//   const [formData, setFormData] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [recordId, setRecordId] = useState('');
//   const [existingIds, setExistingIds] = useState([]);
//   const [errMsg, setErrMsg] = useState('');

//   const configId = formConfig?.configId ?? formConfig?.id ?? null;
//   const rawType = (formConfig?.type || '').toString().toLowerCase();
//   const isUpdate = rawType === 'update';

//   useEffect(() => {
//     if (!open) return;

//     if (!configId) {
//       setErrMsg('Config ID is missing. Please pass form_configs.id as formConfig.id/configId.');
//       return;
//     } else {
//       setErrMsg('');
//     }

//     const visibleFields = (formConfig?.fields_json || []).filter(f => f.visible);
//     setFields(visibleFields);
//     setFormData({});
//     setRecordId('');

//     if (isUpdate) fetchExistingIds(configId);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [open, formConfig, configId, isUpdate]);

//   const fetchExistingIds = async (cid) => {
//     try {
//       const res = await api.get(`/formdata/${cid}/ids`);
//       setExistingIds(Array.isArray(res.data) ? res.data : []);
//     } catch (err) {
//       console.warn('Failed to load IDs for update:', err?.response?.status, err?.response?.data);
//       setExistingIds([]);
//     }
//   };

//   const handleIdSelect = async (id) => {
//     setLoading(true);
//     setRecordId(id);
//     try {
//       const res = await api.get(`/formdata/${configId}/${id}`);
//       const row = res.data?.data || {};
//       setFormData(row);
//     } catch (err) {
//       console.error('Error loading form data:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const setValue = (field, value) => {
//     setFormData(prev => ({ ...prev, [field]: value }));
//   };

//   const handleFile = async (field, file) => {
//     if (!file) {
//       setValue(field, '');
//       return;
//     }
//     // Quick path: base64 encode (works with your existing JSON route)
//     const toBase64 = (f) =>
//       new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => resolve(reader.result); // data URL
//         reader.onerror = reject;
//         reader.readAsDataURL(f);
//       });
//     const dataUrl = await toBase64(file);
//     setValue(field, dataUrl);
//   };

//   const handleSubmit = async () => {
//     if (!configId) {
//       setErrMsg('Config ID is missing; cannot submit.');
//       return;
//     }
//     const path = isUpdate ? '/formdata/update' : '/formviews/formdata/insert';

//     // (Optional) client-side reserved filter for safety
//     const safeData = Object.fromEntries(
//       Object.entries(formData).filter(([k]) => !RESERVED.has(k))
//     );

//     const payload = isUpdate
//       ? { configId, entryId: recordId, formData: safeData }
//       : { configId, formData: safeData };

//     try {
//       const res = await api.post(path, payload);
//       console.log('✅ Submit response:', res.data);
//       alert('Form submitted successfully!');
//       onClose();
//     } catch (err) {
//       console.error('❌ Submission error:', err);
//       const msg = err.response?.data?.error || err.response?.data?.message || err.message;
//       setErrMsg(msg || 'Submission failed');
//     }
//   };

//   const renderField = (f) => {
//     const key = f.columnName;
//     const inputType = (f.inputType || '').toLowerCase();
//     const options = parseOptions(f.optionsCsv);
//     const value = formData[key] ?? '';
//     const commonProps = {
//       fullWidth: true,
//       required: !!f.mandatory,
//       disabled: !!f.readOnly,
//       label: f.columnName,
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
//             <RadioGroup
//               value={value}
//               onChange={(e) => setValue(key, e.target.value)}
//             >
//               {options.map(opt => (
//                 <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
//               ))}
//             </RadioGroup>
//           </FormControl>
//         );

//       case 'dropdownlist':
//         return (
//           <FormControl fullWidth>
//             <InputLabel>{f.columnName}</InputLabel>
//             <Select
//               label={f.columnName}
//               value={value}
//               onChange={(e) => setValue(key, e.target.value)}
//             >
//               {options.map(opt => (
//                 <MenuItem key={opt} value={opt}>{opt}</MenuItem>
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
//                 {/* preview */}
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
//             onChange={(e) => {
//               const v = e.target.value;
//               setValue(key, v === '' ? '' : Number(v));
//             }}
//           />
//         );

//       // default to text
//       case 'text':
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
//         {formConfig?.template_name || formConfig?.templateName || 'Form'} ({isUpdate ? 'Update' : 'Master'} View)
//       </DialogTitle>

//       <DialogContent dividers>
//         {errMsg && (
//           <Box mb={2}>
//             <Alert severity="error">{errMsg}</Alert>
//           </Box>
//         )}

//         {isUpdate && (
//           <Box mb={2}>
//             <TextField
//               select
//               label="Select Record ID"
//               fullWidth
//               value={recordId}
//               onChange={(e) => handleIdSelect(e.target.value)}
//             >
//               {existingIds.map((id) => (
//                 <MenuItem key={id} value={id}>{id}</MenuItem>
//               ))}
//             </TextField>
//           </Box>
//         )}

//         {loading ? (
//           <CircularProgress />
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
//           disabled={isUpdate && !recordId}
//         >
//           {isUpdate ? 'Update' : 'Submit'}
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default ViewFormModal;
