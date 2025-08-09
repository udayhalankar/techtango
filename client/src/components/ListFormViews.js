import React, { useEffect, useState } from 'react';
import {
Box, Typography, Grid, Card, CardContent, Button, Dialog,
DialogTitle, DialogContent, DialogActions, TextField, Pagination
} from '@mui/material';
import axios from 'axios';
import FormBuilderModal from './FormBuilderModal';
import ViewFormModal from './ViewFormModal';
import ExperimentModal from './ExperimentModal';
import SimpleModalWithCheckboxes from './SimpleModalWithCheckboxes'; // Adjust path as needed


const ListFormViews = () => {
const [forms, setForms] = useState([]);
const [searchTerm, setSearchTerm] = useState('');
const [filteredForms, setFilteredForms] = useState([]);
const [adminModalOpen, setAdminModalOpen] = useState(false);
const [showExperimentModal, setShowExperimentModal] = useState(false);
const [viewModalOpen, setViewModalOpen] = useState(false);
const [selectedForm, setSelectedForm] = useState(null);
const [openCheckboxModal, setOpenCheckboxModal] = useState(false);

// Paging

const cardsPerPage = 6;
const [currentPage, setCurrentPage] = useState(1);
const fetchForms = async () => {

try {
const res = await axios.get('/api/formconfig/all'); // Add this route if not present
setForms(res.data);
} catch (err) {
console.error('Failed to fetch forms:', err);
}
};

useEffect(() => {
fetchForms();
}, []);

useEffect(() => {
const term = searchTerm.toLowerCase();
const filtered = forms.filter(
f =>

f.template_name.toLowerCase().includes(term) ||
f.table_name.toLowerCase().includes(term) ||
f.type.toLowerCase().includes(term) ||
String(f.id).includes(term)
);

setFilteredForms(filtered);
setCurrentPage(1); // reset to first page when searching
}, [searchTerm, forms]);

const handleOpenView = (form) => {
setSelectedForm(form);
setViewModalOpen(true);
};

const masterForms = filteredForms.filter(f => f.type === 'Master');
const updateForms = filteredForms.filter(f => f.type === 'Update');

const paginated = (list) => {
const start = (currentPage - 1) * cardsPerPage;
return list.slice(start, start + cardsPerPage);
};

const totalPages = Math.ceil(filteredForms.length / cardsPerPage);

return (
<Box p={4}>
<Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
<Typography variant="h6">Enterprise Form Builder</Typography>


<Button
  variant="outlined"
  color="secondary"
  onClick={() => setShowExperimentModal(true)}
>
  Create New Form
</Button>

<Button variant="outlined" onClick={() => setOpenCheckboxModal(true)}>
  Open Checkbox Modal
</Button>



</Box>

<TextField
label="Search Forms"
variant="outlined"
fullWidth
value={searchTerm}
onChange={(e) => setSearchTerm(e.target.value)}
sx={{ mb: 4 }}

/>

{/* Master Forms */}

{masterForms.length > 0 && (

<>

<Typography variant="h6" gutterBottom>Master Forms</Typography>

<Grid container spacing={2}>

{paginated(masterForms).map((form) => (

<Grid item xs={12} sm={6} md={4} lg={2} key={form.id}>

<Card>

<CardContent>

<Typography><strong>Form ID:</strong> {form.id}</Typography>

<Typography><strong>Form Name:</strong> {form.template_name}</Typography>

<Typography><strong>Database Table:</strong> {form.table_name}</Typography>

<Typography><strong>Type:</strong> {form.type}</Typography>

</CardContent>

<Box textAlign="center" pb={2}>

<Button variant="outlined" onClick={() => handleOpenView(form)}>

Open

</Button>

</Box>

</Card>

</Grid>

))}

</Grid>

</>

)}

{/* Update Forms */}

{updateForms.length > 0 && (

<>

<Typography variant="h6" gutterBottom sx={{ mt: 5 }}>Update Forms</Typography>

<Grid container spacing={2}>

{paginated(updateForms).map((form) => (

<Grid item xs={12} sm={6} md={4} lg={2} key={form.id}>

<Card>

<CardContent>

<Typography><strong>Form ID:</strong> {form.id}</Typography>

<Typography><strong>Form Name:</strong> {form.template_name}</Typography>

<Typography><strong>Database Table:</strong> {form.table_name}</Typography>

<Typography><strong>Type:</strong> {form.type}</Typography>

</CardContent>

<Box textAlign="center" pb={2}>

<Button variant="outlined" onClick={() => handleOpenView(form)}>

Open

</Button>

</Box>

</Card>

</Grid>

))}

</Grid>

</>

)}

{/* Pagination */}

{totalPages > 1 && (
<Box mt={4} display="flex" justifyContent="center">
<Pagination
count={totalPages}
page={currentPage}
onChange={(e, page) => setCurrentPage(page)}
color="primary"

/>

</Box>

)}

{/* Create Form Modal */}

<Dialog
  open={adminModalOpen}
  onClose={() => setAdminModalOpen(false)}
  fullScreen
  scroll="paper"
>
  <DialogTitle>Create New Form</DialogTitle>
  <DialogContent dividers>
    <Box sx={{ p: 2 }}>
      <FormBuilderModal />
    </Box>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => {
        console.log("Rendering Dialog. Open state:", adminModalOpen);
        setAdminModalOpen(false)
    }}>Close</Button>
  </DialogActions>
</Dialog>


{/* View Form Modal */}

<ViewFormModal
open={viewModalOpen}
onClose={() => setViewModalOpen(false)}
formConfig={selectedForm}
/>


<ExperimentModal
  open={showExperimentModal}
  onClose={() => setShowExperimentModal(false)}
/>

<SimpleModalWithCheckboxes
  open={openCheckboxModal}
  onClose={() => setOpenCheckboxModal(false)}
/>

</Box>

);

};

export default ListFormViews;

