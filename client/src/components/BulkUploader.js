import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
Box, Typography, Button, MenuItem, Select, InputLabel,
FormControl, CircularProgress, Alert, Stack
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const BulkUploader = () => {
const [tables, setTables] = useState([]);
const [selectedTable, setSelectedTable] = useState('');
const [file, setFile] = useState(null);
const [message, setMessage] = useState('');
const [uploading, setUploading] = useState(false);
const [previewData, setPreviewData] = useState([]);
const [columns, setColumns] = useState([]);

useEffect(() => {

axios.get('http://localhost:5000/api/table/list')
.then((res) => setTables(res.data))
.catch(() => setMessage('❌ Failed to load table list'));
}, []);

const parseExcel = (file) => {

const reader = new FileReader();

reader.onload = (event) => {

const binaryStr = event.target.result;

const workbook = XLSX.read(binaryStr, { type: 'binary' });

const sheet = workbook.Sheets[workbook.SheetNames[0]];

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

if (rows.length < 3) {

setMessage('❌ Excel must have headers, types, and at least one data row.');

return;

}

const headers = rows[0];

const data = rows.slice(2);

const formattedData = data.map((row, i) => {

const obj = { id: i };

headers.forEach((h, idx) => {

obj[h] = row[idx] ?? '';

});

return obj;

});

const colDefs = headers.map(h => ({ field: h, headerName: h, width: 150 }));

setColumns(colDefs);

setPreviewData(formattedData);

setMessage('');

};

reader.readAsBinaryString(file);

};

const handleFileChange = (e) => {

const selected = e.target.files[0];

setFile(selected);

if (selected) {

parseExcel(selected);

}

};

const handleDownload = async () => {

try {

const res = await axios.get(`http://localhost:5000/api/template/${selectedTable}`, {

responseType: 'blob'

});

const url = window.URL.createObjectURL(new Blob([res.data]));

const link = document.createElement('a');

link.href = url;

link.setAttribute('download', `${selectedTable}_template.xlsx`);

document.body.appendChild(link);

link.click();

link.remove();

} catch (err) {

setMessage('❌ Error downloading template');

}

};

const handleUpload = async () => {

if (!selectedTable || !file) return setMessage('Please select table and file.');

const formData = new FormData();

formData.append('file', file);

try {

setUploading(true);

const res = await axios.post(`http://localhost:5000/api/upload/${selectedTable}`, formData);

setMessage(`✅ Uploaded: ${res.data.inserted} rows inserted.`);

setPreviewData([]);

setColumns([]);

setFile(null);

} catch (err) {

setMessage(`❌ Upload failed: ${err.response?.data?.message || 'Unknown error'}`);

} finally {

setUploading(false);

}

};

return (

<Box sx={{ maxWidth: 1000, mx: 'auto', mt: 5, p: 4, border: '1px solid #ccc', borderRadius: 2 }}>

<Typography variant="h5" gutterBottom>

📊 Bulk Data Uploader with Preview

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

setMessage('');

}}

>

{tables.map((table) => (

<MenuItem key={table} value={table}>{table}</MenuItem>

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

<input

type="file"

onChange={handleFileChange}

accept=".xlsx, .xls"

/>

)}

{/* Step 4: Show Preview */}

{previewData.length > 0 && (

<>

<Box sx={{ height: 400 }}>

<DataGrid

rows={previewData}

columns={columns}

pageSize={5}

rowsPerPageOptions={[5]}

/>

</Box>

{/* Step 5: Upload Button */}

<Button

variant="contained"

onClick={handleUpload}

disabled={uploading}

>

{uploading ? <CircularProgress size={24} /> : '📤 Upload Excel'}

</Button>

</>

)}

{/* Step 6: Show Message */}

{message && <Alert severity="info">{message}</Alert>}

</Stack>

</Box>

);

};

export default BulkUploader;