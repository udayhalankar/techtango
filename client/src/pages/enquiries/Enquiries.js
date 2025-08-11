// src/pages/enquiries/Enquiries.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Grid, Card, CardContent, Typography, TextField, IconButton,
  Modal, Box, Button, ToggleButtonGroup, ToggleButton,
  Alert, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../services/api';
import NewEnquiryForm from './NewEnquiryForm';

const CARDS_PER_PAGE = 10;

function formatDate(d) {
  if (!d) return 'N/A';
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return 'N/A';
    return dt.toLocaleDateString();
  } catch {
    return 'N/A';
  }
}

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('tiles'); // 'tiles' | 'grid'
  const [openFormModal, setOpenFormModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchEnquiries = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.get('/enquiries');
      setEnquiries(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      // friendlier messages
      const status = e?.response?.status;
      if (status === 401) setErr('Your session has expired. Please log in again.');
      else if (status === 403) setErr(e?.response?.data?.error || 'Access denied (no active subscription for Enquiries).');
      else setErr(e?.response?.data?.error || 'Failed to fetch enquiries.');
      setEnquiries([]);
      console.error('Failed to fetch enquiries', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enquiries;
    return enquiries.filter(e =>
      String(e.enquiry_no || '').toLowerCase().includes(q) ||
      String(e.status || '').toLowerCase().includes(q) ||
      String(e.business_partner_name || '').toLowerCase().includes(q)
    );
  }, [search, enquiries]);

  useEffect(() => {
    // reset page when data or search term changes
    setCurrentPage(1);
  }, [search, enquiries]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return filtered.slice(start, start + CARDS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleCardClick = (card) => setSelectedCard(card);
  const closeModal = () => setSelectedCard(null);

  const handleNewEnquirySuccess = async () => {
    await fetchEnquiries();   // refetch after creating
    setOpenFormModal(false);
    setCurrentPage(1);
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" gutterBottom>ENQUIRIES</Typography>
        <Box display="flex" gap={1}>
          <Button onClick={fetchEnquiries}>Refresh</Button>
          <Button variant="contained" onClick={() => setOpenFormModal(true)}>NEW ENQUIRY</Button>
        </Box>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={2}>
        <TextField
          placeholder="Search by enquiry no / status / client"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 360, maxWidth: '100%' }}
        />
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, next) => next && setView(next)}
          size="small"
        >
          <ToggleButton value="tiles"><ViewModuleIcon /></ToggleButton>
          <ToggleButton value="grid"><ViewListIcon /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

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
          {/* TILES VIEW */}
          {view === 'tiles' && (
            <>
              {paginated.length === 0 ? (
                <Box py={6} textAlign="center" color="text.secondary">
                  <Typography>No enquiries found.</Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {paginated.map((e) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={e.id}>
                      <Card onClick={() => handleCardClick(e)} sx={{ cursor: 'pointer', height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold">Enquiry ID: {e.id}</Typography>
                          <Typography>Client Enquiry No: {e.enquiry_no || 'N/A'}</Typography>
                          <Typography>Client Name: {e.business_partner_name || 'N/A'}</Typography>
                          <Typography>Status: {e.status || 'N/A'}</Typography>
                          <Typography>Date Received: {formatDate(e.created_date)}</Typography>
                          <Typography>Submission Date: {formatDate(e.proposal_submission_date)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}

          {/* GRID (table) VIEW */}
          {view === 'grid' && (
            <>
              {paginated.length === 0 ? (
                <Box py={6} textAlign="center" color="text.secondary">
                  <Typography>No enquiries found.</Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Client Enquiry No</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date Received</TableCell>
                        <TableCell>Submission Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginated.map((e) => (
                        <TableRow key={e.id} hover onClick={() => handleCardClick(e)} sx={{ cursor: 'pointer' }}>
                          <TableCell>{e.id}</TableCell>
                          <TableCell>{e.enquiry_no || 'N/A'}</TableCell>
                          <TableCell>{e.business_partner_name || 'N/A'}</TableCell>
                          <TableCell>{e.status || 'N/A'}</TableCell>
                          <TableCell>{formatDate(e.created_date)}</TableCell>
                          <TableCell>{formatDate(e.proposal_submission_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </>
          )}

          {/* Pagination */}
          {filtered.length > 0 && (
            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Typography sx={{ alignSelf: 'center' }}>
                Page {currentPage} / {totalPages}
              </Typography>
              <Button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}

      {/* New Enquiry Modal */}
      <Modal open={openFormModal} onClose={() => setOpenFormModal(false)}>
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
              <Typography>Client Enquiry No: {selectedCard.enquiry_no || 'N/A'}</Typography>
              <Typography>Client: {selectedCard.business_partner_name || 'N/A'}</Typography>
              <Typography>Status: {selectedCard.status || 'N/A'}</Typography>
              <Typography>Date Received: {formatDate(selectedCard.created_date)}</Typography>
              <Typography>Submission Date: {formatDate(selectedCard.proposal_submission_date)}</Typography>
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default Enquiries;
