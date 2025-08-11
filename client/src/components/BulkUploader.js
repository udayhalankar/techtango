// src/components/BulkUploader.js
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../services/api'; // ← adjust path if needed

const BulkUploader = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'info'|'error'|'success', text: string }
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [columns, setColumns] = useState([]);

  // Load table list
  useEffect(() => {
    const loadTables = async () => {
      setMessage(null);
      try {
        const res = await api.get('/table/list');
        setTables(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
        } else if (status === 403) {
          setMessage({ type: 'error', text: err?.response?.data?.error || 'Access denied (no active subscription).' });
        } else {
          setMessage({ type: 'error', text: '❌ Failed to load table list' });
        }
      }
    };
    loadTables();
  }, []);

  // Parse Excel -> preview
  const parseExcel = (selectedFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const first = wb.SheetNames[0];
        const sheet = wb.Sheets[first];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }); // array-of-arrays

        if (!rows || rows.length < 3) {
          setMessage({
            type: 'error',
            text: '❌ Excel must have a header row, a types row, and at least one data row.',
          });
          setPreviewData([]);
          setColumns([]);
          return;
        }

        const headers = rows[0];         // row 1: column names
        // const types = rows[1];         // row 2: optional types (unused here)
        const dataRows = rows.slice(2);  // data from row 3+

        const gridRows = dataRows.map((r, i) => {
          const obj = { id: i + 1 }; // DataGrid needs an id
          headers.forEach((h, idx) => {
            obj[String(h || `col_${idx + 1}`)] = r[idx] ?? '';
          });
          return obj;
        });

        const gridCols = headers.map((h, idx) => ({
          field: String(h || `col_${idx + 1}`),
          headerName: String(h || `Column ${idx + 1}`),
          width: 160,
        }));

        setColumns(gridCols);
        setPreviewData(gridRows);
        setMessage({ type: 'info', text: `Previewing ${gridRows.length} rows.` });
      } catch (err) {
        console.error('Parse error:', err);
        setMessage({ type: 'error', text: '❌ Could not read this Excel file.' });
        setPreviewData([]);
        setColumns([]);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setMessage(null);
    if (selected) parseExcel(selected);
  };

  const handleDownload = async () => {
    if (!selectedTable) return;
    try {
      const res = await api.get(`/template/${selectedTable}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedTable}_template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err?.response?.data?.error || '❌ Error downloading template';
      setMessage({ type: 'error', text: msg });
    }
  };

  const handleUpload = async () => {
    if (!selectedTable || !file) {
      setMessage({ type: 'error', text: 'Please select a table and choose an Excel file first.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await api.post(`/upload/${selectedTable}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const inserted = res?.data?.inserted ?? 0;
      setMessage({ type: 'success', text: `✅ Uploaded successfully: ${inserted} rows inserted.` });
      setPreviewData([]);
      setColumns([]);
      setFile(null);
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (status === 401
          ? 'Your session has expired. Please log in again.'
          : status === 403
          ? 'Access denied (no active subscription).'
          : '❌ Upload failed.');
      setMessage({ type: 'error', text: msg });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 5, p: 4, border: '1px solid #e0e0e0', borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom>
        📊 Bulk Data Uploader
      </Typography>

      <Stack spacing={3}>
        {/* Step 1: Select Table */}
        <FormControl fullWidth>
          <InputLabel>Select Table</InputLabel>
          <Select
            value={selectedTable}
            label="Select Table"
            onChange={(e) => {
              setSelectedTable(e.target.value);
              setFile(null);
              setPreviewData([]);
              setColumns([]);
              setMessage(null);
            }}
          >
            {tables.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Step 2: Download Template */}
        {selectedTable && (
          <Button variant="outlined" onClick={handleDownload}>
            📥 Download Excel Template
          </Button>
        )}

        {/* Step 3: Browse Excel */}
        {selectedTable && (
          <input type="file" onChange={handleFileChange} accept=".xlsx,.xls" />
        )}

        {/* Step 4: Show Preview */}
        {previewData.length > 0 && (
          <>
            <Box sx={{ height: 420 }}>
              <DataGrid
                rows={previewData}
                columns={columns}
                pageSizeOptions={[5, 10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
                disableRowSelectionOnClick
              />
            </Box>

            {/* Step 5: Upload Button */}
            <Box>
              <Button variant="contained" onClick={handleUpload} disabled={uploading}>
                {uploading ? <CircularProgress size={24} /> : '📤 Upload Excel'}
              </Button>
              {!!file && (
                <Button
                  sx={{ ml: 2 }}
                  onClick={() => {
                    setFile(null);
                    setPreviewData([]);
                    setColumns([]);
                    setMessage(null);
                  }}
                >
                  Clear
                </Button>
              )}
            </Box>
          </>
        )}

        {/* Step 6: Message */}
        {message && <Alert severity={message.type}>{message.text}</Alert>}
      </Stack>
    </Box>
  );
};

export default BulkUploader;
