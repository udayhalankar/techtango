import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Button, TextField, Alert, FormControlLabel
} from '@mui/material';
import axios from 'axios';
import ViewFormModal from './ViewFormModal';

const INPUT_TYPES = [
  'text',
  'textarea',
  'checkbox',
  'radio',
  'image',
  'date',
  'integer',
  'dropdownlist',
];

const DATE_GRANULARITIES = ['date', 'month', 'year'];

const defaultInputTypeForDataType = (dataType) => {
  const t = String(dataType || '').toLowerCase();
  if (t.includes('int')) return 'integer';
  if (t.includes('bool')) return 'checkbox';
  if (t.includes('date') || t.includes('time')) return 'date';
  return 'text';
};

const ExperimentModal = ({ open, onClose }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState([]);
  const [formName, setFormName] = useState('');
  const [viewType, setViewType] = useState('');
  const [message, setMessage] = useState(null);
  const [savedFormId, setSavedFormId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await axios.get('/api/table/list');
        setTables(res.data);
      } catch (err) {
        console.error('Error fetching tables:', err);
      }
    };
    fetchTables();
  }, []);

  useEffect(() => {
    if (!open) {
      setConfig([]);
      setSelectedTable('');
      setFormName('');
      setViewType('');
      setMessage(null);
    }
  }, [open]);

  const handleTableChange = async (event) => {
    const tableName = event.target.value;
    setSelectedTable(tableName);
    setConfig([]);
    setSavedFormId(null);
    setMessage(null);
    try {
      const res = await axios.get(`/api/table/columns/${tableName}`);
      setColumns(res.data);

      const initialConfig = res.data.map(col => ({
        columnName: col.column_name,
        dataType: col.data_type,
        dataEntry: false,
        readOnly: false,
        visible: true,
        mandatory: false,

        // NEW builder fields:
        inputType: defaultInputTypeForDataType(col.data_type), // one of INPUT_TYPES
        optionsCsv: '',                // used for radio/dropdownlist
        dateGranularity: 'date',       // 'date' | 'month' | 'year' (only if inputType === 'date')
      }));
      setConfig([...initialConfig]);
    } catch (err) {
      console.error('Error fetching columns:', err);
    }
  };

  const handleToggle = (index, field) => {
    setConfig(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: !item[field] } : item
      )
    );
  };

  const handleFieldChange = (index, field, value) => {
    setConfig(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = async () => {
    setMessage(null);
    if (!formName || !selectedTable || !viewType) {
      setMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }
    try {
      // Save to your existing /api/formconfig as before (fields_json will now include inputType, optionsCsv, dateGranularity)
      const res = await axios.post('/api/formconfig', {
        templateName: formName,
        tableName: selectedTable,
        fields: config,
        type: viewType, // "Master" | "Update"
      });
      const savedId = res.data.id; // this should be form_configs.id
      setSavedFormId(savedId);
      setMessage({ type: 'success', text: `Form config saved successfully (ID: ${savedId})` });
    } catch (err) {
      if (err.response?.status === 409) {
        setMessage({ type: 'error', text: 'Form with same name and view type already exists.' });
      } else {
        const msg = err.response?.data?.error || 'Failed to save form config.';
        setMessage({ type: 'error', text: msg });
      }
      console.error('Error saving config:', err);
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
      id: savedFormId,           // THIS MUST BE form_configs.id
    });
    setModalOpen(true);
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
              >
                {tables.map((table, i) => (
                  <MenuItem key={i} value={table}>{table}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {config.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 3 }}>
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
                            {INPUT_TYPES.map(t => (
                              <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>

                        <TableCell>
                          <TextField
                            size="small"
                            placeholder="e.g. Male,Female,Other"
                            value={col.optionsCsv || ''}
                            onChange={(e) => handleFieldChange(index, 'optionsCsv', e.target.value)}
                            fullWidth
                            disabled={!showOptions}
                          />
                        </TableCell>

                        <TableCell>
                          <Select
                            size="small"
                            value={col.dateGranularity || 'date'}
                            onChange={(e) => handleFieldChange(index, 'dateGranularity', e.target.value)}
                            fullWidth
                            disabled={!showDateGran}
                          >
                            {DATE_GRANULARITIES.map(g => (
                              <MenuItem key={g} value={g}>{g}</MenuItem>
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
          <Button onClick={handleSave} variant="contained">Save</Button>
          <Button
            onClick={handleViewForm}
            variant="outlined"
          >
            View Form
          </Button>
          <Button onClick={onClose} color="error">Close</Button>
        </DialogActions>
      </Dialog>

      <ViewFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        formConfig={selectedConfig}
      />
    </>
  );
};

export default ExperimentModal;



// import React, { useState, useEffect } from 'react';
// import {
//   Dialog, DialogTitle, DialogContent, DialogActions,
//   Box, Typography, Select, MenuItem, FormControl, InputLabel,
//   Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
//   Paper, Checkbox, Button, TextField, Alert, FormControlLabel
// } from '@mui/material';
// import axios from 'axios';
// import ViewFormModal from './ViewFormModal';

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
//         const res = await axios.get('/api/table/list');
//         setTables(res.data);
//       } catch (err) {
//         console.error('Error fetching tables:', err);
//       }
//     };
//     fetchTables();
//   }, []);

//   useEffect(() => {
//   console.log('Updated config:', config);
// }, [config]);



// useEffect(() => {
//   if (!open) {
//     setConfig([]);
//     setSelectedTable('');
//     setFormName('');
//     setViewType('');
//     setMessage(null);
//   }
// }, [open]);


//   const handleTableChange = async (event) => {
//     const tableName = event.target.value;
//     setSelectedTable(tableName);
//     setConfig([]);
//     setSavedFormId(null);
//     setMessage(null);
//     try {
//       const res = await axios.get(`/api/table/columns/${tableName}`);
//       setColumns(res.data);
      
//       const initialConfig = res.data.map(col => ({
//   columnName: col.column_name,
//   dataType: col.data_type,
//   dataEntry: false,
//   readOnly: false,
//   visible: true,
//   mandatory: false,
// }));
// setConfig([...initialConfig]); // simple spread — React-friendly


//     } catch (err) {
//       console.error('Error fetching columns:', err);
//     }
//   };

// const handleToggle = (index, field) => {
//   setConfig(prev =>
//     prev.map((item, i) =>
//       i === index ? { ...item, [field]: !item[field] } : item
//     )
//   );
// };




//   const handleSave = async () => {
//     setMessage(null);
//     if (!formName || !selectedTable || !viewType) {
//       setMessage({ type: 'error', text: 'All fields are required.' });
//       return;
//     }
//     try {
//       const res = await axios.post('/api/formconfig', {
//         templateName: formName,
//         tableName: selectedTable,
//         fields: config,
//         type: viewType,
//       });
//       const savedId = res.data.id;
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
//       id: savedFormId,
//     });
//     setModalOpen(true);
//   };

//   useEffect(() => {
//     console.log('Current config:', config);
//   }, [config]);

//   return (
//     <>
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
//         <DialogTitle>🧪 Experimental Form Builder</DialogTitle>
//         <DialogContent>
//           <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
//             <TextField
//               label="Form Name"
//               value={formName}
//               onChange={(e) => setFormName(e.target.value)}
//               fullWidth
//             />
//             <FormControl fullWidth>
//               <InputLabel>View Type</InputLabel>
//               <Select
//                 value={viewType}
//                 onChange={(e) => setViewType(e.target.value)}
//                 label="View Type"
//               >
//                 <MenuItem value="Master">Master</MenuItem>
//                 <MenuItem value="Update">Update</MenuItem>
//               </Select>
//             </FormControl>
//             <FormControl fullWidth>
//               <InputLabel>Select Table</InputLabel>
//               <Select
//                 value={selectedTable}
//                 onChange={handleTableChange}
//                 label="Select Table"
//               >
//                 {tables.map((table, i) => (
//                   <MenuItem key={i} value={table}>{table}</MenuItem>
//                 ))}
//               </Select>
//             </FormControl>
//           </Box>

//           {config.length > 0 && (
//             <TableContainer component={Paper} sx={{ mt: 3 }}>
//               <Table>
//                 <TableHead>
//                   <TableRow>
//                     <TableCell><strong>Column</strong></TableCell>
//                     <TableCell><strong>Data Type</strong></TableCell>
//                     <TableCell align="center">Data Entry</TableCell>
//                     <TableCell align="center">Read Only</TableCell>
//                     <TableCell align="center">Visible</TableCell>
//                     <TableCell align="center">Mandatory</TableCell>
//                   </TableRow>
//                 </TableHead>

//                 <TableBody>
//                     {config.map((col, index) => (
//                         <TableRow key={index}>
//                         <TableCell>{col.columnName}</TableCell>
//                         <TableCell>{col.dataType}</TableCell>
                        
//                         <TableCell align="center">
//                             <FormControlLabel
//                             control={
//                                 <Checkbox
//                                 checked={!!col.dataEntry}
//                                 onChange={() => handleToggle(index, 'dataEntry')}
//                                 />
//                             }
//                             label=""
//                             />
//                         </TableCell>
//                         <TableCell align="center">
//                             <FormControlLabel
//                             control={
//                             <Checkbox
//                             checked={Boolean(col.readOnly)}
//                             onChange={() => handleToggle(index, 'readOnly')}
//                             disableRipple
//                             />
//                             }
//                             label=""
//                             />
//                         </TableCell>
//                         <TableCell align="center">
//                              <FormControlLabel
//                             control={
//                             <Checkbox
//                             checked={Boolean(col.visible)}
//                             onChange={() => handleToggle(index, 'visible')}
//                             disableRipple
//                             />
//                              }
//                             label=""
//                             />
//                         </TableCell>
//                         <TableCell align="center">
//                             <FormControlLabel
//                             control={
//                             <Checkbox
//                             checked={Boolean(col.mandatory)}
//                             onChange={() => handleToggle(index, 'mandatory')}
//                             disableRipple
//                             />
//                             }
//                             label=""
//                             />
//                         </TableCell>
//                         </TableRow>
//                     ))}
//                     </TableBody>


//               </Table>
//             </TableContainer>
//           )}

//           {message && (
//             <Alert severity={message.type} sx={{ mt: 2 }}>
//               {message.text}
//             </Alert>
//           )}
//         </DialogContent>

//         <DialogActions>
//           <Button onClick={handleSave} variant="contained">Save</Button>
//           <Button
//             onClick={() => {
//               setSelectedConfig({
//                 fields_json: config,
//                 template_name: formName,
//                 type: viewType,
//                 id: savedFormId || 'temp',
//               });
//               setModalOpen(true);
//             }}
//             variant="outlined"
//           >
//             View Form
//           </Button>
//           <Button onClick={onClose} color="error">Close</Button>
//         </DialogActions>
//       </Dialog>

//       {/* View Form Modal */}
//       <ViewFormModal
//         open={modalOpen}
//         onClose={() => setModalOpen(false)}
//         formConfig={selectedConfig}
//       />
//     </>
//   );
// };

// export default ExperimentModal;
