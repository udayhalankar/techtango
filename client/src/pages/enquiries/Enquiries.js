// src/pages/enquiries/Enquiries.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Grid, Card, CardContent, Typography, TextField, IconButton,
  Modal, Box, Button, ToggleButtonGroup, ToggleButton,
  Alert, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, Tab, Badge
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../services/api';
import NewEnquiryForm from './NewEnquiryForm';
import ViewEnquiry from './ViewEnquiry';

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

// Who should see the enquiry in their **Inbox** for each status
// Who should see the enquiry in their Inbox for each status
// Who should see the enquiry in their Inbox for each status
const INBOX_ASSIGNEE_BY_STATUS = {
  New: 'technical_recipient_mail_id',

  Technical_Submitted:  'technical_approver_mail_id',
  Technical_Approved:   'estimation_recipient_mail_id',
  Technical_Rejected:   'technical_recipient_mail_id',

  Estimation_Submitted: 'estimation_approver_mail_id',
  Estimation_Approved:  'proposal_creator_mail_id',
  Estimation_Rejected:  'estimation_recipient_mail_id',

  Proposal_Created:     'proposal_approver_mail_id',
  Proposal_Approved:    'initiator_id',               // after approve, back to initiator
  Proposal_Rejected:    'proposal_creator_mail_id',
  Proposal_Submitted:   'initiator_id',

  PO_Received:          'initiator_id',
  PO_Accepted:          'initiator_id',
};

// Who should track it in Outbox (excluding the current assignee)
const OUTBOX_TRACKERS_BY_STATUS = {
  New: ['initiator_id'],

  Technical_Submitted:  ['initiator_id', 'technical_recipient_mail_id'],
  Technical_Approved:   ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id'],
  Technical_Rejected:   ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id'],

  Estimation_Submitted: ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id', 'estimation_recipient_mail_id'],
  Estimation_Approved:  ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id', 'estimation_recipient_mail_id', 'estimation_approver_mail_id'],
  Estimation_Rejected:  ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id', 'estimation_recipient_mail_id', 'estimation_approver_mail_id'],

  Proposal_Created:     ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id',
                         'estimation_recipient_mail_id', 'estimation_approver_mail_id', 'proposal_creator_mail_id'],
  Proposal_Approved:    ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id',
                         'estimation_recipient_mail_id', 'estimation_approver_mail_id', 'proposal_creator_mail_id', 'proposal_approver_mail_id'],
  Proposal_Rejected:    ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id',
                         'estimation_recipient_mail_id', 'estimation_approver_mail_id', 'proposal_creator_mail_id', 'proposal_approver_mail_id'],
  Proposal_Submitted:   ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id',
                         'estimation_recipient_mail_id', 'estimation_approver_mail_id', 'proposal_creator_mail_id', 'proposal_approver_mail_id'],

  PO_Received:          ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id',
                         'estimation_recipient_mail_id', 'estimation_approver_mail_id', 'proposal_creator_mail_id', 'proposal_approver_mail_id'],
  PO_Accepted:          ['initiator_id', 'technical_recipient_mail_id', 'technical_approver_mail_id',
                         'estimation_recipient_mail_id', 'estimation_approver_mail_id', 'proposal_creator_mail_id', 'proposal_approver_mail_id'],
};



function getCurrentUserId() {
  try {
    const saved = JSON.parse(localStorage.getItem('user') || 'null');
    if (saved?.id != null) return Number(saved.id);
  } catch {}
  try {
    const jwt = localStorage.getItem('token');
    if (!jwt) return null;
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload?.userId != null) return Number(payload.userId);
    if (payload?.id != null) return Number(payload.id);
  } catch {}
  return null;
}

/** Remove join-only display fields so updates never try to write them */
function sanitizeForUpdate(rec) {
  if (!rec) return rec;
  const {
    business_partner_name,
    business_partner_email,
    client_name,
    // add any other JOIN/display-only fields you might include in SELECTs:
    // e.g., organization_name, assigned_user_name, etc.
    ...rest
  } = rec;
  return rest;
}

const Enquiries = () => {
  const me = getCurrentUserId();

  const [tab, setTab] = useState('in'); // 'in' | 'out'
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

  useEffect(() => { fetchEnquiries(); }, []);

  // --- Build Inbox/Outbox pools first (no search yet) ---
  const statusKey = (s) => String(s || '').replace(/\s+/g, '_');  // "Technical Submitted" -> "Technical_Submitted"
  const inboxPool = useMemo(() => {
    if (me == null) return [];
    return enquiries.filter((e) => {
      // const field = INBOX_ASSIGNEE_BY_STATUS[e.status];
      
      const field = INBOX_ASSIGNEE_BY_STATUS[statusKey(e.status)];
      

      if (!field) return false;
      const assignee = e?.[field];
      return Number(assignee) === Number(me);
    });
  }, [enquiries, me]);

  // const outboxPool = useMemo(() => {
  //   if (me == null) return [];
  //   return enquiries.filter((e) => Number(e.initiator_id) === Number(me));
  // }, [enquiries, me]);

   const outboxPool = useMemo(() => {
   if (me == null) return [];
   return enquiries.filter((e) => {
     const key = statusKey(e.status);
     const watchers = OUTBOX_TRACKERS_BY_STATUS[key] || ['initiator_id'];
     // if I’m the current assignee, it belongs in my Inbox, not Outbox
     const inboxField = INBOX_ASSIGNEE_BY_STATUS[key];
     if (inboxField && Number(e?.[inboxField]) === Number(me)) return false;
     return watchers.some((f) => Number(e?.[f]) === Number(me));
   });
 }, [enquiries, me]);

  // --- Apply search to the active pool ---
  const activePool = tab === 'in' ? inboxPool : outboxPool;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activePool;
    return activePool.filter((e) =>
      String(e.enquiry_no || '').toLowerCase().includes(q) ||
      String(e.status || '').toLowerCase().includes(q) ||
      String(e.business_partner_name || '').toLowerCase().includes(q)
    );
  }, [search, activePool]);

  useEffect(() => { setCurrentPage(1); }, [search, tab, enquiries]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return filtered.slice(start, start + CARDS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleCardClick = (card) => setSelectedCard(card);
  const closeModal = () => setSelectedCard(null);

  const handleNewEnquirySuccess = async () => {
    await fetchEnquiries();
    setOpenFormModal(false);
    setCurrentPage(1);
    setTab('out'); // after creating, show it in Outbox
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" gutterBottom>ENQUIRIES</Typography>
        <Box display="flex" gap={1}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ mr: 2, minHeight: 36 }}
          >
            <Tab
              value="in"
              label={<Badge color="primary" badgeContent={inboxPool.length} showZero>Inbox</Badge>}
              sx={{ minHeight: 36 }}
            />
            <Tab
              value="out"
              label={<Badge color="primary" badgeContent={outboxPool.length} showZero>Outbox</Badge>}
              sx={{ minHeight: 36 }}
            />
          </Tabs>

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

      {err && <Alert severity="warning" sx={{ mb: 2 }}>{err}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* TILES */}
          {view === 'tiles' && (
            paginated.length === 0 ? (
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
                        <Typography>Date Received: {formatDate(e.enquiry_date || e.created_at)}</Typography>
                        <Typography>Submission Date: {formatDate(e.proposal_submission_date)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )
          )}

          {/* GRID */}
          {view === 'grid' && (
            paginated.length === 0 ? (
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
                        <TableCell>{formatDate(e.enquiry_date || e.created_at)}</TableCell>
                        <TableCell>{formatDate(e.proposal_submission_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )
          )}

          {/* Pagination */}
          {filtered.length > 0 && (
            <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
              <Button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <Typography sx={{ alignSelf: 'center' }}>
                Page {currentPage} / {totalPages}
              </Typography>
              <Button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
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

      {/* View / Update */}
      <ViewEnquiry
        open={!!selectedCard}
        // 🔒 Pass a sanitized copy so updates never include join-only fields
        data={sanitizeForUpdate(selectedCard)}
        isOutbox={tab === 'out'}   
        onClose={() => setSelectedCard(null)}
        onSaved={async () => {
          await fetchEnquiries();
          setSelectedCard(null);
        }}
      />
    </Box>
  );
};

export default Enquiries;
