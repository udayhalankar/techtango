// src/components/FormBuilderModal.js
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Checkbox, Button, TextField, Alert, CircularProgress
} from '@mui/material';
import api from '../services/api';           // adjust path if services/api is elsewhere
import ViewFormModal from './ViewFormModal'; // adjust path if needed

const FormBuilderModal = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState([]);
  const [formName, setFormName] = useState('');
  const [viewType, setViewType] = useState(''); // 'Master' | 'Update'
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [savedFormId, setSavedFormId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);

  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load tables on mount
  useEffect(() => {
    const fetchTables = async () => {
      setLoadingTables(true);
      setMessage(null);
      try {
        // baseURL already has /api
        const res = await api.get('/table/list');
        setTables(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
        } else if (status === 403) {
          setMessage({ type: 'error', text: err?.response?.data?.error || 'Access denied (no active subscription for FormBuilder).' });
        } else {
          setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to fetch tables.' });
        }
        console.error('Error fetching tables:', err);
      } finally {
        setLoadingTables(false);
      }
    };

    fetchTables();
  }, []);

  // Load columns on table select
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
      }));
      setConfig(initialConfig);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
      } else if (status === 403) {
        setMessage({ type: 'error', text: err?.response?.data?.error || 'Access denied (no active subscription for FormBuilder).' });
      } else {
        setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to fetch columns.' });
      }
      console.error('Error fetching columns:', err);
    } finally {
      setLoadingColumns(false);
    }
  };

  const handleToggle = (index, field) => {
    setConfig((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: !c[field] } : c))
    );
  };

  // Save
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
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  // Open ViewFormModal with last saved config
  const handleViewForm = () => {
    if (!savedFormId) {
      setMessage({ type: 'error', text: 'Please save the form configuration first.' });
      return;
    }
    setSelectedConfig({
      fields_json: config,
      template_name: formName,
      type: viewType,
      id: savedFormId, // MUST be form_configs.id
    });
    setModalOpen(true);
  };

  return (
    <Box p={4}>
      <Typography variant="h5" gutterBottom>🛠 Admin Form Builder</Typography>

      {/* Form Name */}
      <FormControl sx={{ mb: 2, minWidth: 300 }} fullWidth>
        <TextField
          label="Form Name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          fullWidth
        />
      </FormControl>

      {/* View Type */}
      <FormControl sx={{ mb: 2, minWidth: 300 }} fullWidth>
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

      {/* Tables */}
      <FormControl sx={{ mb: 2, minWidth: 300 }} fullWidth>
        <InputLabel>Select Table</InputLabel>
        <Select
          value={selectedTable}
          onChange={handleTableChange}
          label="Select Table"
          disabled={loadingTables}
        >
          {tables.map((table, i) => (
            <MenuItem key={i} value={table}>
              {table}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loadingTables && (
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CircularProgress size={20} />{' '}
          <Typography variant="body2">Loading tables…</Typography>
        </Box>
      )}

      {loadingColumns && (
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CircularProgress size={20} />{' '}
          <Typography variant="body2">Loading columns…</Typography>
        </Box>
      )}

      {/* Columns config */}
      {config.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Column</strong>
                </TableCell>
                <TableCell>
                  <strong>Data Type</strong>
                </TableCell>
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
                      checked={!!col.dataEntry}
                      onChange={() => handleToggle(index, 'dataEntry')}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Checkbox
                      checked={!!col.readOnly}
                      onChange={() => handleToggle(index, 'readOnly')}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Checkbox
                      checked={!!col.visible}
                      onChange={() => handleToggle(index, 'visible')}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Checkbox
                      checked={!!col.mandatory}
                      onChange={() => handleToggle(index, 'mandatory')}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Actions */}
      {config.length > 0 && (
        <Box display="flex" gap={2} mt={3}>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
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

      {/* Alerts */}
      {message && (
        <Alert severity={message.type} sx={{ mt: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Preview modal */}
      <ViewFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        formConfig={selectedConfig}
      />
    </Box>
  );
};

export default FormBuilderModal;
