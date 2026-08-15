// import React, { useState, useEffect } from 'react';
// import {
//   Box, Typography, Select, MenuItem, FormControl, InputLabel,
//   Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
//   Paper, Checkbox, Button, TextField, Alert
// } from '@mui/material';
// import axios from 'axios';
// import ViewFormModal from './ViewFormModal'; // Adjust path if needed

// const AdminFormBuilder = () => {
//   const [tables, setTables] = useState([]);
//   const [selectedTable, setSelectedTable] = useState('');
//   const [columns, setColumns] = useState([]);
//   const [config, setConfig] = useState([]);

//   const [formName, setFormName] = useState('');
//   const [viewType, setViewType] = useState('');
//   const [message, setMessage] = useState(null);

//   const [selectedConfig, setSelectedConfig] = useState(null);
//   const [modalOpen, setModalOpen] = useState(false);

//   // 🔃 Fetch all tables on mount
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

//   // 🔄 Fetch columns when table is selected
//   const handleTableChange = async (event) => {
//     const tableName = event.target.value;
//     setSelectedTable(tableName);
//     setConfig([]);
//     setMessage(null);

//     try {
//       const res = await axios.get(`/api/table/columns/${tableName}`);
//       setColumns(res.data);

//       const initialConfig = res.data.map(col => ({
//         columnName: col.column_name,
//         dataType: col.data_type,
//         dataEntry: false,
//         readOnly: false,
//         visible: true,
//         mandatory: false,
//       }));
//       setConfig(initialConfig);
//     } catch (err) {
//       console.error('Error fetching columns:', err);
//     }
//   };

//   // 🔁 Toggle field options
//   const handleToggle = (index, field) => {
//     const updated = [...config];
//     updated[index][field] = !updated[index][field];
//     setConfig(updated);
//   };

//   // ✅ Save + Open Modal
//   const handleSaveAndView = async () => {
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

//       setMessage({ type: 'success', text: `Form config saved (ID: ${savedId})` });

//       // ✅ Open View Modal with real config
//       setSelectedConfig({
//         fields_json: config,
//         template_name: formName,
//         type: viewType,
//         id: savedId,
//       });
//       setModalOpen(true);
//     } catch (err) {
//       if (err.response?.status === 409) {
//         setMessage({ type: 'error', text: 'Form with same name and view type already exists.' });
//       } else {
//         const msg = err.response?.data?.error || 'Failed to save form config.';
//         setMessage({ type: 'error', text: msg });
//       }
//       console.error('Error saving config', err);
//     }
//   };

//   return (
//     <Box p={4}>
//       <Typography variant="h5" gutterBottom>🛠 Admin Form Builder</Typography>

//       <FormControl sx={{ mb: 2, minWidth: 300 }}>
//         <TextField
//           label="Form Name"
//           value={formName}
//           onChange={(e) => setFormName(e.target.value)}
//           fullWidth
//         />
//       </FormControl>

//       <FormControl sx={{ mb: 2, minWidth: 300 }}>
//         <InputLabel>View Type</InputLabel>
//         <Select
//           value={viewType}
//           onChange={(e) => setViewType(e.target.value)}
//           label="View Type"
//         >
//           <MenuItem value="Master">Master</MenuItem>
//           <MenuItem value="Update">Update</MenuItem>
//         </Select>
//       </FormControl>

//       <FormControl sx={{ mb: 2, minWidth: 300 }}>
//         <InputLabel>Select Table</InputLabel>
//         <Select
//           value={selectedTable}
//           onChange={handleTableChange}
//           label="Select Table"
//         >
//           {tables.map((table, i) => (
//             <MenuItem key={i} value={table}>{table}</MenuItem>
//           ))}
//         </Select>
//       </FormControl>

//       {config.length > 0 && (
//         <TableContainer component={Paper} sx={{ mt: 3 }}>
//           <Table>
//             <TableHead>
//               <TableRow>
//                 <TableCell><strong>Column</strong></TableCell>
//                 <TableCell><strong>Data Type</strong></TableCell>
//                 <TableCell align="center">Data Entry</TableCell>
//                 <TableCell align="center">Read Only</TableCell>
//                 <TableCell align="center">Visible</TableCell>
//                 <TableCell align="center">Mandatory</TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {config.map((col, index) => (
//                 <TableRow key={index}>
//                   <TableCell>{col.columnName}</TableCell>
//                   <TableCell>{col.dataType}</TableCell>
//                   <TableCell align="center">
//                     <Checkbox
//                       checked={col.dataEntry}
//                       onChange={() => handleToggle(index, 'dataEntry')}
//                     />
//                   </TableCell>
//                   <TableCell align="center">
//                     <Checkbox
//                       checked={col.readOnly}
//                       onChange={() => handleToggle(index, 'readOnly')}
//                     />
//                   </TableCell>
//                   <TableCell align="center">
//                     <Checkbox
//                       checked={col.visible}
//                       onChange={() => handleToggle(index, 'visible')}
//                     />
//                   </TableCell>
//                   <TableCell align="center">
//                     <Checkbox
//                       checked={col.mandatory}
//                       onChange={() => handleToggle(index, 'mandatory')}
//                     />
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </TableContainer>
//       )}

//       {config.length > 0 && (
//         <Button variant="contained" sx={{ mt: 3 }} onClick={handleSaveAndView}>
//           Save & View Form
//         </Button>
//       )}

//       {message && (
//         <Alert severity={message.type} sx={{ mt: 2 }}>
//           {message.text}
//         </Alert>
//       )}

//       <ViewFormModal
//         open={modalOpen}
//         onClose={() => setModalOpen(false)}
//         formConfig={selectedConfig}
//       />
//     </Box>
//   );
// };

// export default AdminFormBuilder;


import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Button, TextField, Alert
} from '@mui/material';
import axios from 'axios';
import ViewFormModal from './ViewFormModal'; // adjust path if needed

const AdminFormBuilder = () => {
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

  // 🔃 Load tables on mount
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

  // 🔄 Load columns on table select
  const handleTableChange = async (event) => {
    const tableName = event.target.value;
    setSelectedTable(tableName);
    setConfig([]);
    setSavedFormId(null); // clear saved form on table change
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
      }));
      setConfig(initialConfig);
    } catch (err) {
      console.error('Error fetching columns:', err);
    }
  };

  const handleToggle = (index, field) => {
    const updated = [...config];
    updated[index][field] = !updated[index][field];
    setConfig(updated);
  };

  // ✅ Save only (no modal)
  const handleSave = async () => {
    setMessage(null);
    if (!formName || !selectedTable || !viewType) {
      setMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }

    try {
      const res = await axios.post('/api/formconfig', {
        templateName: formName,
        tableName: selectedTable,
        fields: config,
        type: viewType,
      });

      const savedId = res.data.id;
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

  // ✅ Open ViewFormModal with last saved config
  const handleViewForm = () => {
    if (!savedFormId) {
      setMessage({ type: 'error', text: 'Please save the form configuration first.' });
      return;
    }

    setSelectedConfig({
      fields_json: config,
      template_name: formName,
      type: viewType,
      id: savedFormId,
    });

    setModalOpen(true);
  };

  return (
    <Box p={4}>
      <Typography variant="h5" gutterBottom>🛠 Admin Form Builder</Typography>

      <FormControl sx={{ mb: 2, minWidth: 300 }}>
        <TextField
          label="Form Name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          fullWidth
        />
      </FormControl>

      <FormControl sx={{ mb: 2, minWidth: 300 }}>
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

      <FormControl sx={{ mb: 2, minWidth: 300 }}>
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

      {config.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Column</strong></TableCell>
                <TableCell><strong>Data Type</strong></TableCell>
                <TableCell align="center">Data Entry</TableCell>
                <TableCell align="center">Read Only</TableCell>
                <TableCell align="center">Visible</TableCell>
                <TableCell align="center">Mandatory</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {config.map((col, index) => (
                <TableRow key={index}>
                  <TableCell>{col.columnName}</TableCell>
                  <TableCell>{col.dataType}</TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={col.dataEntry}
                      onChange={() => handleToggle(index, 'dataEntry')}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={col.readOnly}
                      onChange={() => handleToggle(index, 'readOnly')}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={col.visible}
                      onChange={() => handleToggle(index, 'visible')}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={col.mandatory}
                      onChange={() => handleToggle(index, 'mandatory')}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {config.length > 0 && (
        <Box display="flex" gap={2} mt={3}>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
          <Button
            variant="outlined"
            onClick={handleViewForm}
            disabled={!savedFormId}
          >
            View Form
          </Button>
        </Box>
      )}

      {message && (
        <Alert severity={message.type} sx={{ mt: 2 }}>
          {message.text}
        </Alert>
      )}

      <ViewFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        formConfig={selectedConfig}
      />
    </Box>
  );
};

export default AdminFormBuilder;
