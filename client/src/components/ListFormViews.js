// src/pages/forms/ListFormViews.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Pagination,
  Alert, CircularProgress
} from '@mui/material';
import FormBuilderModal from './FormBuilderModal';
import ViewFormModal from './ViewFormModal';
import ExperimentModal from './ExperimentModal';
import SimpleModalWithCheckboxes from './SimpleModalWithCheckboxes';
import api from '../services/api';

const CARDS_PER_PAGE = 6;

const ListFormViews = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [openCheckboxModal, setOpenCheckboxModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchForms = async () => {
    setLoading(true);
    setErr('');
    try {
      // baseURL in api already has /api
      const res = await api.get('/formconfig/all');
      setForms(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setForms([]);
      // show clearer message for 401/403
      const status = e?.response?.status;
      if (status === 401) setErr('Your session has expired. Please log in again.');
      else if (status === 403) setErr(e?.response?.data?.error || 'Access denied (no active subscription).');
      else setErr(e?.response?.data?.error || e.message || 'Failed to fetch forms.');
      console.error('Failed to fetch forms:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredForms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return forms;
    return (forms || []).filter((f) => {
      const id = String(f.id || '');
      const name = (f.template_name || '').toLowerCase();
      const tbl = (f.table_name || '').toLowerCase();
      const type = (f.type || '').toLowerCase();
      return id.includes(term) || name.includes(term) || tbl.includes(term) || type.includes(term);
    });
  }, [searchTerm, forms]);

  useEffect(() => {
    // reset paging on new search or new data
    setCurrentPage(1);
  }, [searchTerm, forms]);

  const masterForms = filteredForms.filter((f) => (f.type || '').toLowerCase() === 'master');
  const updateForms = filteredForms.filter((f) => (f.type || '').toLowerCase() === 'update');

  const paginate = (list) => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return list.slice(start, start + CARDS_PER_PAGE);
    };

  const totalPages = Math.max(1, Math.ceil(filteredForms.length / CARDS_PER_PAGE));

  const handleOpenView = (form) => {
    setSelectedForm(form);
    setViewModalOpen(true);
  };

  return (
    <Box p={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Enterprise Form Builder</Typography>

        <Box display="flex" gap={2}>
          <Button variant="outlined" color="secondary" onClick={() => setShowExperimentModal(true)}>
            Create New Form
          </Button>
          <Button variant="outlined" onClick={() => setOpenCheckboxModal(true)}>
            Open Checkbox Modal
          </Button>
        </Box>
      </Box>

      <TextField
        label="Search Forms"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2 }}
      />

      {err && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Master Forms */}
          {masterForms.length > 0 && (
            <>
              <Typography variant="h6" gutterBottom>Master Forms</Typography>
              <Grid container spacing={2}>
                {paginate(masterForms).map((form) => (
                  <Grid item xs={12} sm={6} md={4} lg={2} key={`m-${form.id}`}>
                    <Card>
                      <CardContent>
                        <Typography><strong>Form ID:</strong> {form.id}</Typography>
                        <Typography><strong>Form Name:</strong> {form.template_name}</Typography>
                        <Typography><strong>Database Table:</strong> {form.table_name}</Typography>
                        <Typography><strong>Type:</strong> {form.type}</Typography>
                      </CardContent>
                      <Box textAlign="center" pb={2}>
                        <Button variant="outlined" onClick={() => handleOpenView(form)}>Open</Button>
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
                {paginate(updateForms).map((form) => (
                  <Grid item xs={12} sm={6} md={4} lg={2} key={`u-${form.id}`}>
                    <Card>
                      <CardContent>
                        <Typography><strong>Form ID:</strong> {form.id}</Typography>
                        <Typography><strong>Form Name:</strong> {form.template_name}</Typography>
                        <Typography><strong>Database Table:</strong> {form.table_name}</Typography>
                        <Typography><strong>Type:</strong> {form.type}</Typography>
                      </CardContent>
                      <Box textAlign="center" pb={2}>
                        <Button variant="outlined" onClick={() => handleOpenView(form)}>Open</Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {/* Empty state */}
          {!loading && filteredForms.length === 0 && !err && (
            <Box py={6} textAlign="center" color="text.secondary">
              <Typography>No forms found.</Typography>
            </Box>
          )}

          {/* Pagination */}
          {filteredForms.length > 0 && (
            <Box mt={4} display="flex" justifyContent="center">
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_e, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Create Form Modal (legacy builder) */}
      <Dialog open={adminModalOpen} onClose={() => setAdminModalOpen(false)} fullScreen scroll="paper">
        <DialogTitle>Create New Form</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 2 }}>
            <FormBuilderModal />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdminModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* View Form Modal */}
      <ViewFormModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        formConfig={selectedForm}
      />

      {/* Experimental builder */}
      <ExperimentModal
        open={showExperimentModal}
        onClose={() => {
          setShowExperimentModal(false);
          fetchForms(); // refresh after save
        }}
      />

      <SimpleModalWithCheckboxes
        open={openCheckboxModal}
        onClose={() => setOpenCheckboxModal(false)}
      />
    </Box>
  );
};

export default ListFormViews;


// import React, { useEffect, useState } from 'react';
// import {
//   Box, Typography, Grid, Card, CardContent, Button, Dialog,
//   DialogTitle, DialogContent, DialogActions, TextField, Pagination
// } from '@mui/material';
// import FormBuilderModal from './FormBuilderModal';
// import ViewFormModal from './ViewFormModal';
// import ExperimentModal from './ExperimentModal';
// import SimpleModalWithCheckboxes from './SimpleModalWithCheckboxes';
// import api from '../services/api';

// const ListFormViews = () => {
//   const [forms, setForms] = useState([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filteredForms, setFilteredForms] = useState([]);
//   const [adminModalOpen, setAdminModalOpen] = useState(false);
//   const [showExperimentModal, setShowExperimentModal] = useState(false);
//   const [viewModalOpen, setViewModalOpen] = useState(false);
//   const [selectedForm, setSelectedForm] = useState(null);
//   const [openCheckboxModal, setOpenCheckboxModal] = useState(false);

//   // Paging
//   const cardsPerPage = 6;
//   const [currentPage, setCurrentPage] = useState(1);

//   const fetchForms = async () => {
//     try {
//       const res = await api.get('/formconfig/all');
//       setForms(res.data || []);
//     } catch (err) {
//       console.error('Failed to fetch forms:', err);
//       setForms([]);
//     }
//   };

//   useEffect(() => {
//     fetchForms();
//   }, []);

//   useEffect(() => {
//     const term = searchTerm.toLowerCase();
//     const filtered = (forms || []).filter(f =>
//       (f.template_name || '').toLowerCase().includes(term) ||
//       (f.table_name || '').toLowerCase().includes(term) ||
//       (f.type || '').toLowerCase().includes(term) ||
//       String(f.id).includes(term)
//     );
//     setFilteredForms(filtered);
//     setCurrentPage(1);
//   }, [searchTerm, forms]);

//   const handleOpenView = (form) => {
//     setSelectedForm(form);
//     setViewModalOpen(true);
//   };

//   const masterForms = filteredForms.filter(f => (f.type || '').toLowerCase() === 'master');
//   const updateForms = filteredForms.filter(f => (f.type || '').toLowerCase() === 'update');

//   const paginated = (list) => {
//     const start = (currentPage - 1) * cardsPerPage;
//     return list.slice(start, start + cardsPerPage);
//   };

//   const totalPages = Math.ceil(filteredForms.length / cardsPerPage) || 1;

//   return (
//     <Box p={4}>
//       <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
//         <Typography variant="h6">Enterprise Form Builder</Typography>

//         <Box display="flex" gap={2}>
//           <Button variant="outlined" color="secondary" onClick={() => setShowExperimentModal(true)}>
//             Create New Form
//           </Button>
//           <Button variant="outlined" onClick={() => setOpenCheckboxModal(true)}>
//             Open Checkbox Modal
//           </Button>
//         </Box>
//       </Box>

//       <TextField
//         label="Search Forms"
//         variant="outlined"
//         fullWidth
//         value={searchTerm}
//         onChange={(e) => setSearchTerm(e.target.value)}
//         sx={{ mb: 4 }}
//       />

//       {/* Master Forms */}
//       {masterForms.length > 0 && (
//         <>
//           <Typography variant="h6" gutterBottom>Master Forms</Typography>
//           <Grid container spacing={2}>
//             {paginated(masterForms).map((form) => (
//               <Grid item xs={12} sm={6} md={4} lg={2} key={`m-${form.id}`}>
//                 <Card>
//                   <CardContent>
//                     <Typography><strong>Form ID:</strong> {form.id}</Typography>
//                     <Typography><strong>Form Name:</strong> {form.template_name}</Typography>
//                     <Typography><strong>Database Table:</strong> {form.table_name}</Typography>
//                     <Typography><strong>Type:</strong> {form.type}</Typography>
//                   </CardContent>
//                   <Box textAlign="center" pb={2}>
//                     <Button variant="outlined" onClick={() => handleOpenView(form)}>Open</Button>
//                   </Box>
//                 </Card>
//               </Grid>
//             ))}
//           </Grid>
//         </>
//       )}

//       {/* Update Forms */}
//       {updateForms.length > 0 && (
//         <>
//           <Typography variant="h6" gutterBottom sx={{ mt: 5 }}>Update Forms</Typography>
//           <Grid container spacing={2}>
//             {paginated(updateForms).map((form) => (
//               <Grid item xs={12} sm={6} md={4} lg={2} key={`u-${form.id}`}>
//                 <Card>
//                   <CardContent>
//                     <Typography><strong>Form ID:</strong> {form.id}</Typography>
//                     <Typography><strong>Form Name:</strong> {form.template_name}</Typography>
//                     <Typography><strong>Database Table:</strong> {form.table_name}</Typography>
//                     <Typography><strong>Type:</strong> {form.type}</Typography>
//                   </CardContent>
//                   <Box textAlign="center" pb={2}>
//                     <Button variant="outlined" onClick={() => handleOpenView(form)}>Open</Button>
//                   </Box>
//                 </Card>
//               </Grid>
//             ))}
//           </Grid>
//         </>
//       )}

//       {/* Pagination */}
//       {filteredForms.length > 0 && (
//         <Box mt={4} display="flex" justifyContent="center">
//           <Pagination
//             count={totalPages}
//             page={currentPage}
//             onChange={(e, page) => setCurrentPage(page)}
//             color="primary"
//           />
//         </Box>
//       )}

//       {/* Optional Builder Dialog (kept from your file) */}
//       <Dialog open={adminModalOpen} onClose={() => setAdminModalOpen(false)} fullScreen scroll="paper">
//         <DialogTitle>Create New Form</DialogTitle>
//         <DialogContent dividers>
//           <Box sx={{ p: 2 }}>
//             <FormBuilderModal />
//           </Box>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setAdminModalOpen(false)}>Close</Button>
//         </DialogActions>
//       </Dialog>

//       {/* View Form Modal */}
//       <ViewFormModal
//         open={viewModalOpen}
//         onClose={() => setViewModalOpen(false)}
//         formConfig={selectedForm}
//       />

//       {/* Experimental builder */}
//       <ExperimentModal
//         open={showExperimentModal}
//         onClose={() => {
//           setShowExperimentModal(false);
//           fetchForms(); // refresh list after any save
//         }}
//       />

//       <SimpleModalWithCheckboxes
//         open={openCheckboxModal}
//         onClose={() => setOpenCheckboxModal(false)}
//       />
//     </Box>
//   );
// };

// export default ListFormViews;


