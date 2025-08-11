// src/pages/forms/ExperimentalModal.js
import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Button, TextField, Alert, FormControlLabel, CircularProgress
} from '@mui/material';
import api from '../services/api';
import ViewFormModal from './ViewFormModal';

const INPUT_TYPES = ['text', 'textarea', 'checkbox', 'radio', 'image', 'date', 'integer', 'dropdownlist'];
const DATE_GRANULARITIES = ['date', 'month', 'year'];

const defaultInputTypeForDataType = (dataType) => {
  const t = String(dataType || '').toLowerCase();
  if (t.includes('int')) return 'integer';
  if (t.includes('bool')) return 'checkbox';
  if (t.includes('date') || t.includes('time')) return 'date';
  return 'text';
};

const ExperimentalModal = ({ open, onClose }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState([]);
  const [formName, setFormName] = useState('');
  const [viewType, setViewType] = useState('');
  const [message, setMessage] = useState(null);
  const [savedFormId, setSavedFormId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);

  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load table list when dialog opens
  useEffect(() => {
    if (!open) return;
    const fetchTables = async () => {
      setLoadingTables(true);
      setMessage(null);
      try {
        // baseURL in api already has /api
        const res = await api.get('/table/list');
        setTables(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
        } else if (status === 403) {
          setMessage({ type: 'error', text: err?.response?.data?.error || 'Access denied (no active subscription).' });
        } else {
          setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to fetch tables.' });
        }
        setTables([]);
        console.error('Error fetching tables:', err);
      } finally {
        setLoadingTables(false);
      }
    };
    fetchTables();
  }, [open]);

  // Reset state when closing
  useEffect(() => {
    if (open) return;
    setSelectedTable('');
    setColumns([]);
    setConfig([]);
    setFormName('');
    setViewType('');
    setMessage(null);
    setSavedFormId(null);
    setPreviewOpen(false);
    setSelectedConfig(null);
  }, [open]);

  const handleTableChange = async (event) => {
    const tableName = event.target.value;
    setSelectedTable(tableName);
    setConfig([]);
    setSavedFormId(null);
    setMessage(null);

    setLoadingColumns(true);
    try {
      const res = await api.get(`/table/columns/${tableName}`);
      const cols = Array.isArray(res.data) ? res.data : [];
      setColumns(cols);

      const initialConfig = cols.map((col) => ({
        columnName: col.column_name,
        dataType: col.data_type,
        dataEntry: false,
        readOnly: false,
        visible: true,
        mandatory: false,
        inputType: defaultInputTypeForDataType(col.data_type),
        optionsCsv: '',
        dateGranularity: 'date',
      }));
      setConfig(initialConfig);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
      } else if (status === 403) {
        setMessage({ type: 'error', text: err?.response?.data?.error || 'Access denied (no active subscription).' });
      } else {
        setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to fetch columns.' });
      }
      setColumns([]);
      console.error('Error fetching columns:', err);
    } finally {
      setLoadingColumns(false);
    }
  };

  const handleToggle = (index, field) => {
    setConfig((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: !c[field] } : c)));
  };

  const handleFieldChange = (index, field, value) => {
    setConfig((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const handleSave = async () => {
    setMessage(null);
    if (!formName || !selectedTable || !viewType) {
      setMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        templateName: formName,
        tableName: selectedTable,
        fields: config,
        type: viewType, // "Master" | "Update"
      };
      const res = await api.post('/formconfig', payload);
      const savedId = res?.data?.id;
      setSavedFormId(savedId ?? null);
      setMessage({
        type: 'success',
        text: `Form config saved successfully${savedId ? ` (ID: ${savedId})` : ''}`,
      });
    } catch (err) {
      if (err?.response?.status === 409) {
        setMessage({ type: 'error', text: 'Form with same name and view type already exists.' });
      } else {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to save form config.';
        setMessage({ type: 'error', text: msg });
      }
      console.error('Error saving form config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleViewForm = () => {
    if (!savedFormId) {
      setMessage({ type: 'error', text: 'Please save the form configuration first.' });
      return;
    }
    setSelectedConfig({
      fields_json: config,
      template_name: formName,
      type: viewType,
      id: savedFormId, // form_configs.id
    });
    setPreviewOpen(true);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle>🧪 Experimental Form Builder</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Form Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>View Type</InputLabel>
              <Select
                value={viewType}
                onChange={(e) => setViewType(e.target.value)}
                label="View Type"
              >
                <MenuItem value="Master">Master</MenuItem>
                <MenuItem value="Update">Update</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Select Table</InputLabel>
              <Select
                value={selectedTable}
                onChange={handleTableChange}
                label="Select Table"
                disabled={loadingTables}
              >
                {tables.map((t, i) => (
                  <MenuItem key={i} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loadingTables && (
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CircularProgress size={18} /> Loading tables…
            </Box>
          )}

          {loadingColumns && (
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CircularProgress size={18} /> Loading columns…
            </Box>
          )}

          {config.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Column</strong></TableCell>
                    <TableCell><strong>Data Type</strong></TableCell>
                    <TableCell><strong>Input Type</strong></TableCell>
                    <TableCell><strong>Options (comma-separated)</strong></TableCell>
                    <TableCell><strong>Date granularity</strong></TableCell>
                    <TableCell align="center">Data Entry</TableCell>
                    <TableCell align="center">Read Only</TableCell>
                    <TableCell align="center">Visible</TableCell>
                    <TableCell align="center">Mandatory</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {config.map((col, index) => {
                    const showOptions = ['radio', 'dropdownlist'].includes(col.inputType);
                    const showDateGran = col.inputType === 'date';
                    return (
                      <TableRow key={index}>
                        <TableCell>{col.columnName}</TableCell>
                        <TableCell>{col.dataType}</TableCell>

                        <TableCell>
                          <Select
                            size="small"
                            value={col.inputType}
                            onChange={(e) => handleFieldChange(index, 'inputType', e.target.value)}
                            fullWidth
                          >
                            {INPUT_TYPES.map((t) => (
                              <MenuItem key={t} value={t}>
                                {t}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>

                        <TableCell>
                          <TextField
                            size="small"
                            placeholder="e.g. Male,Female,Other"
                            value={col.optionsCsv || ''}
                            onChange={(e) => handleFieldChange(index, 'optionsCsv', e.target.value)}
                            disabled={!showOptions}
                            fullWidth
                          />
                        </TableCell>

                        <TableCell>
                          <Select
                            size="small"
                            value={col.dateGranularity || 'date'}
                            onChange={(e) => handleFieldChange(index, 'dateGranularity', e.target.value)}
                            disabled={!showDateGran}
                            fullWidth
                          >
                            {DATE_GRANULARITIES.map((g) => (
                              <MenuItem key={g} value={g}>
                                {g}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>

                        <TableCell align="center">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={!!col.dataEntry}
                                onChange={() => handleToggle(index, 'dataEntry')}
                              />
                            }
                            label=""
                          />
                        </TableCell>
                        <TableCell align="center">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={!!col.readOnly}
                                onChange={() => handleToggle(index, 'readOnly')}
                              />
                            }
                            label=""
                          />
                        </TableCell>
                        <TableCell align="center">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={!!col.visible}
                                onChange={() => handleToggle(index, 'visible')}
                              />
                            }
                            label=""
                          />
                        </TableCell>
                        <TableCell align="center">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={!!col.mandatory}
                                onChange={() => handleToggle(index, 'mandatory')}
                              />
                            }
                            label=""
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {message && (
            <Alert severity={message.type} sx={{ mt: 2 }}>
              {message.text}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button onClick={handleViewForm} variant="outlined" disabled={!savedFormId}>
            View Form
          </Button>
          <Button onClick={onClose} color="error">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <ViewFormModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        formConfig={selectedConfig}
      />
    </>
  );
};

export default ExperimentalModal;



// import React, { useState, useEffect } from 'react';
// import {
//   Dialog, DialogTitle, DialogContent, DialogActions,
//   Box, Select, MenuItem, FormControl, InputLabel,
//   Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
//   Paper, Checkbox, Button, TextField, Alert, FormControlLabel
// } from '@mui/material';
// import api from '../services/api';
// import ViewFormModal from './ViewFormModal';

// const INPUT_TYPES = ['text','textarea','checkbox','radio','image','date','integer','dropdownlist'];
// const DATE_GRANULARITIES = ['date', 'month', 'year'];

// const defaultInputTypeForDataType = (dataType) => {
//   const t = String(dataType || '').toLowerCase();
//   if (t.includes('int')) return 'integer';
//   if (t.includes('bool')) return 'checkbox';
//   if (t.includes('date') || t.includes('time')) return 'date';
//   return 'text';
// };

// const ExperimentModal = ({ open, onClose }) => {
//   const [tables, setTables] = useState([]);
//   const [selectedTable, setSelectedTable] = useState('');
//   const [columns, setColumns] = useState([]);
//   const [config, setConfig] = useState([]);
//   const [formName, setFormName] = useState('');
//   const [viewType, setViewType] = useState('');
//   const [message, setMessage] = useState(null);
//   const [savedFormId, setSavedFormId] = useState(null);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [selectedConfig, setSelectedConfig] = useState(null);

//   useEffect(() => {
//     const fetchTables = async () => {
//       try {
//         const res = await api.get('/table/list');
//         setTables(res.data || []);
//       } catch (err) {
//         console.error('Error fetching tables:', err);
//         setTables([]);
//       }
//     };
//     if (open) fetchTables();
//   }, [open]);

//   useEffect(() => {
//     if (!open) {
//       setConfig([]);
//       setSelectedTable('');
//       setFormName('');
//       setViewType('');
//       setMessage(null);
//       setSavedFormId(null);
//     }
//   }, [open]);

//   const handleTableChange = async (event) => {
//     const tableName = event.target.value;
//     setSelectedTable(tableName);
//     setConfig([]);
//     setSavedFormId(null);
//     setMessage(null);
//     try {
//       const res = await api.get(`/table/columns/${tableName}`);
//       setColumns(res.data || []);
//       const initialConfig = (res.data || []).map(col => ({
//         columnName: col.column_name,
//         dataType: col.data_type,
//         dataEntry: false,
//         readOnly: false,
//         visible: true,
//         mandatory: false,
//         inputType: defaultInputTypeForDataType(col.data_type),
//         optionsCsv: '',
//         dateGranularity: 'date',
//       }));
//       setConfig(initialConfig);
//     } catch (err) {
//       console.error('Error fetching columns:', err);
//       setColumns([]);
//     }
//   };

//   const handleToggle = (index, field) => {
//     setConfig(prev =>
//       prev.map((item, i) => (i === index ? { ...item, [field]: !item[field] } : item))
//     );
//   };

//   const handleFieldChange = (index, field, value) => {
//     setConfig(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
//   };

//   const handleSave = async () => {
//     setMessage(null);
//     if (!formName || !selectedTable || !viewType) {
//       setMessage({ type: 'error', text: 'All fields are required.' });
//       return;
//     }
//     try {
//       const res = await api.post('/formconfig', {
//         templateName: formName,
//         tableName: selectedTable,
//         fields: config,
//         type: viewType, // "Master" | "Update"
//       });
//       const savedId = res.data?.id;
//       setSavedFormId(savedId);
//       setMessage({ type: 'success', text: `Form config saved successfully (ID: ${savedId})` });
//     } catch (err) {
//       if (err.response?.status === 409) {
//         setMessage({ type: 'error', text: 'Form with same name and view type already exists.' });
//       } else {
//         const msg = err.response?.data?.error || 'Failed to save form config.';
//         setMessage({ type: 'error', text: msg });
//       }
//       console.error('Error saving config:', err);
//     }
//   };

//   const handleViewForm = () => {
//     if (!savedFormId) {
//       setMessage({ type: 'error', text: 'Please save the form configuration first.' });
//       return;
//     }
//     setSelectedConfig({
//       fields_json: config,
//       template_name: formName,
//       type: viewType,
//       id: savedFormId, // form_configs.id
//     });
//     setModalOpen(true);
//   };

//   return (
//     <>
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
//         <DialogTitle>🧪 Experimental Form Builder</DialogTitle>
//         <DialogContent>
//           <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
//             <TextField label="Form Name" value={formName} onChange={(e) => setFormName(e.target.value)} fullWidth />
//             <FormControl fullWidth>
//               <InputLabel>View Type</InputLabel>
//               <Select value={viewType} onChange={(e) => setViewType(e.target.value)} label="View Type">
//                 <MenuItem value="Master">Master</MenuItem>
//                 <MenuItem value="Update">Update</MenuItem>
//               </Select>
//             </FormControl>
//             <FormControl fullWidth>
//               <InputLabel>Select Table</InputLabel>
//               <Select value={selectedTable} onChange={handleTableChange} label="Select Table">
//                 {tables.map((table, i) => (
//                   <MenuItem key={i} value={table}>{table}</MenuItem>
//                 ))}
//               </Select>
//             </FormControl>
//           </Box>

//           {config.length > 0 && (
//             <TableContainer component={Paper} sx={{ mt: 3 }}>
//               <Table size="small">
//                 <TableHead>
//                   <TableRow>
//                     <TableCell><strong>Column</strong></TableCell>
//                     <TableCell><strong>Data Type</strong></TableCell>
//                     <TableCell><strong>Input Type</strong></TableCell>
//                     <TableCell><strong>Options (comma-separated)</strong></TableCell>
//                     <TableCell><strong>Date granularity</strong></TableCell>
//                     <TableCell align="center">Data Entry</TableCell>
//                     <TableCell align="center">Read Only</TableCell>
//                     <TableCell align="center">Visible</TableCell>
//                     <TableCell align="center">Mandatory</TableCell>
//                   </TableRow>
//                 </TableHead>

//                 <TableBody>
//                   {config.map((col, index) => {
//                     const showOptions = ['radio', 'dropdownlist'].includes(col.inputType);
//                     const showDateGran = col.inputType === 'date';
//                     return (
//                       <TableRow key={index}>
//                         <TableCell>{col.columnName}</TableCell>
//                         <TableCell>{col.dataType}</TableCell>

//                         <TableCell>
//                           <Select
//                             size="small"
//                             value={col.inputType}
//                             onChange={(e) => handleFieldChange(index, 'inputType', e.target.value)}
//                             fullWidth
//                           >
//                             {INPUT_TYPES.map(t => (
//                               <MenuItem key={t} value={t}>{t}</MenuItem>
//                             ))}
//                           </Select>
//                         </TableCell>

//                         <TableCell>
//                           <TextField
//                             size="small"
//                             placeholder="e.g. Male,Female,Other"
//                             value={col.optionsCsv || ''}
//                             onChange={(e) => handleFieldChange(index, 'optionsCsv', e.target.value)}
//                             fullWidth
//                             disabled={!showOptions}
//                           />
//                         </TableCell>

//                         <TableCell>
//                           <Select
//                             size="small"
//                             value={col.dateGranularity || 'date'}
//                             onChange={(e) => handleFieldChange(index, 'dateGranularity', e.target.value)}
//                             fullWidth
//                             disabled={!showDateGran}
//                           >
//                             {DATE_GRANULARITIES.map(g => (
//                               <MenuItem key={g} value={g}>{g}</MenuItem>
//                             ))}
//                           </Select>
//                         </TableCell>

//                         <TableCell align="center">
//                           <FormControlLabel
//                             control={<Checkbox checked={!!col.dataEntry} onChange={() => handleToggle(index, 'dataEntry')} />}
//                             label=""
//                           />
//                         </TableCell>
//                         <TableCell align="center">
//                           <FormControlLabel
//                             control={<Checkbox checked={!!col.readOnly} onChange={() => handleToggle(index, 'readOnly')} />}
//                             label=""
//                           />
//                         </TableCell>
//                         <TableCell align="center">
//                           <FormControlLabel
//                             control={<Checkbox checked={!!col.visible} onChange={() => handleToggle(index, 'visible')} />}
//                             label=""
//                           />
//                         </TableCell>
//                         <TableCell align="center">
//                           <FormControlLabel
//                             control={<Checkbox checked={!!col.mandatory} onChange={() => handleToggle(index, 'mandatory')} />}
//                             label=""
//                           />
//                         </TableCell>
//                       </TableRow>
//                     );
//                   })}
//                 </TableBody>
//               </Table>
//             </TableContainer>
//           )}

//           {message && <Alert severity={message.type} sx={{ mt: 2 }}>{message.text}</Alert>}
//         </DialogContent>

//         <DialogActions>
//           <Button onClick={handleSave} variant="contained">Save</Button>
//           <Button onClick={handleViewForm} variant="outlined">View Form</Button>
//           <Button onClick={onClose} color="error">Close</Button>
//         </DialogActions>
//       </Dialog>

//       <ViewFormModal
//         open={modalOpen}
//         onClose={() => setModalOpen(false)}
//         formConfig={selectedConfig}
//       />
//     </>
//   );
// };

// export default ExperimentModal;


