import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, TextField, IconButton,
  Modal, Box, Button, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import NewEnquiryForm from './NewEnquiryForm';

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('tiles');
  const [openFormModal, setOpenFormModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 10;

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const res = await axios.get('/api/enquiries');
      setEnquiries(res.data);
    } catch (err) {
      console.error('Failed to fetch enquiries', err);
    }
  };

  const filtered = enquiries.filter(e =>
    e.enquiry_no?.toLowerCase().includes(search.toLowerCase()) ||
    e.status?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice(
    (currentPage - 1) * cardsPerPage,
    currentPage * cardsPerPage
  );

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  const closeModal = () => {
    setSelectedCard(null);
  };

  

//    const handleNewEnquirySuccess = (newEnquiry) => {
//   if (!newEnquiry) return;
//   setEnquiries(prev => [newEnquiry, ...prev]);  
//   setOpenFormModal(false);
// };

const handleNewEnquirySuccess = async () => {
  await fetchEnquiries();             // Refetch full list with correct joined data
  setOpenFormModal(false);           // Close modal
  setCurrentPage(1);                 // Go to first page so new entry is visible
};

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>ENQUIRIES</Typography>
      <br />
      <br></br>
<br></br>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Button variant="contained" onClick={() => setOpenFormModal(true)}>NEW ENQUIRY</Button>
        
        <Box display="flex" alignItems="center" gap={1}>
          <TextField
            placeholder="Search"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(e, next) => next && setView(next)}
          >
            <ToggleButton value="tiles"><ViewModuleIcon /></ToggleButton>
            <ToggleButton value="grid"><ViewListIcon /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {paginated.map((e) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={e.id}>
            <Card onClick={() => handleCardClick(e)} sx={{ cursor: 'pointer', height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">Enquiry ID: {e.id}</Typography>
                <Typography>Client Enquiry No: {e.enquiry_no || 'N/A'}</Typography>
                <Typography>Client Name: {e.business_partner_name || 'N/A'}</Typography>
                <Typography>Status: {e.status || 'N/A'}</Typography>
                <Typography>Date Received: {e.created_date?.slice(0, 10) || 'N/A'}</Typography>
                <Typography>Submission Date: {e.proposal_submission_date?.slice(0, 10) || 'N/A'}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
        <Button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >Prev</Button>
        <Button
          disabled={currentPage * cardsPerPage >= filtered.length}
          onClick={() => setCurrentPage(currentPage + 1)}
        >Next</Button>
      </Box>

      {/* New Enquiry Modal */}
      <Modal
        open={openFormModal}
        onClose={() => setOpenFormModal(false)}
      >
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper', boxShadow: 24, maxHeight: '90vh', overflowY: 'auto',
          width: '90%', maxWidth: '1100px', p: 3, borderRadius: 2
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">New Enquiry</Typography>
            <IconButton onClick={() => setOpenFormModal(false)}><CloseIcon /></IconButton>
          </Box>
          <NewEnquiryForm onSuccess={handleNewEnquirySuccess} />
        </Box>
      </Modal>

      {/* View Enquiry Modal */}
      <Modal open={!!selectedCard} onClose={closeModal}>
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper', p: 4, borderRadius: 2, maxWidth: 600, width: '90%'
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Enquiry Details</Typography>
            <IconButton onClick={closeModal}><CloseIcon /></IconButton>
          </Box>
          {selectedCard && (
            <Box>
              <Typography>Enquiry ID: {selectedCard.id}</Typography>
              <Typography>Client Enquiry No: {selectedCard.enquiry_no}</Typography>
              <Typography>Status: {selectedCard.status}</Typography>
              <Typography>Date Received: {selectedCard.created_date}</Typography>
              <Typography>Submission Date: {selectedCard.proposal_submission_date}</Typography>
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default Enquiries;