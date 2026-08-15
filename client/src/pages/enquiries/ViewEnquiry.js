// src/pages/enquiries/ViewEnquiry.js
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Modal, Box, Typography, Divider, Chip,
  List, ListItem, ListItemText, Tooltip, CircularProgress, Alert, Button,
  FormControl, InputLabel, Select, MenuItem, IconButton
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import NewEnquiryForm from './NewEnquiryForm';
import api from '../../services/api';

/* ---------------- helpers ---------------- */

const normalize = (s) => String(s || '').replace(/\s+/g, '_').trim();

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

/* ---------------- routing / ownership maps ---------------- */

/** Who owns the Inbox for each status (keys are normalized with underscores). */
/* ---------------- routing / ownership maps ---------------- */

/** Who owns the Inbox for each status (keys match your new list). */
const INBOX_ASSIGNEE_BY_STATUS = {
  New:                   'technical_recipient_mail_id',

  Technical_Submitted:   'technical_approver_mail_id',
  Technical_Approved:    'estimation_recipient_mail_id',
  Technical_Rejected:    'technical_recipient_mail_id',

  Estimation_Submitted:  'estimation_approver_mail_id',
  Estimation_Approved:   'proposal_creator_mail_id',
  Estimation_Rejected:   'estimation_recipient_mail_id',

  // Proposal approval happens while status is "Proposal_Created"
  Proposal_Created:      'proposal_approver_mail_id',
  Proposal_Approved:     'initiator_id',
  Proposal_Rejected:     'proposal_creator_mail_id',
  Proposal_Submitted:    'proposal_approver_mail_id',

  PO_Received:           'proposal_approver_mail_id',
  PO_Accepted:           'proposal_approver_mail_id',
};

/** Who can approve at each stage, and where it goes on approve/reject. */
const APPROVAL_MATRIX = {
  Technical_Submitted: {
    approverField: 'technical_approver_mail_id',
    approve: { nextStatus: 'Technical_Approved',  recipientField: 'estimation_recipient_mail_id' },
    reject:  { nextStatus: 'Technical_Rejected',  recipientField: 'technical_recipient_mail_id'  },
  },
  Estimation_Submitted: {
    approverField: 'estimation_approver_mail_id',
    approve: { nextStatus: 'Estimation_Approved', recipientField: 'proposal_creator_mail_id'     },
    reject:  { nextStatus: 'Estimation_Rejected',  recipientField: 'estimation_recipient_mail_id' },
  },
  // Proposal approval is performed while status is Proposal_Created
  Proposal_Created: {
    approverField: 'proposal_approver_mail_id',
    approve: { nextStatus: 'Proposal_Approved',    recipientField: 'initiator_id'                },
    reject:  { nextStatus: 'Proposal_Rejected',    recipientField: 'proposal_creator_mail_id'    },
  },
};


/* ---------------- component ---------------- */

export default function ViewEnquiry({ open, data, onClose, onSaved, isOutbox = false }) {
  const enquiryId = data?.id ?? null;
  const displayStatus = data?.status || 'New';
  const modeKey = normalize(displayStatus);

  const me = getCurrentUserId();

  // Who owns this in inbox right now?
  const assigneeField = INBOX_ASSIGNEE_BY_STATUS[modeKey];
  const assigneeId = assigneeField ? Number(data?.[assigneeField]) : null;

  const isInitiator = Number(data?.initiator_id) === Number(me);
  const isInboxActor = assigneeId != null && Number(assigneeId) === Number(me);

  // Header actions
  const canSubmit = Boolean(isInboxActor);
  const canEdit = Boolean(isInitiator);

  // Approve/Reject controller (only for the configured approver of the current step)
  const approvalCfg = APPROVAL_MATRIX[modeKey];
  const isApprover =
    approvalCfg && Number(data?.[approvalCfg.approverField]) === Number(me);
  const [decision, setDecision] = useState('approve');

  const applyDecision = async () => {
    if (!approvalCfg) return;
    const cfg = decision === 'approve' ? approvalCfg.approve : approvalCfg.reject;
    const nextStatus = cfg.nextStatus;
    const nextRecipient = data?.[cfg.recipientField] ?? null; // these ids are stored on the record

    try {
      await api.put(`/enquiries/${enquiryId}`, { status: nextStatus, recipient: nextRecipient });
      await onSaved?.();
      onClose?.();
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to apply decision');
    }
  };

  // Files
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesErr, setFilesErr] = useState('');
  const hasFiles = files && files.length > 0;

  const fetchFiles = async (id) => {
    if (!id) return;
    setFilesLoading(true);
    setFilesErr('');
    try {
      const res = await api.get(`/enquiries/${id}/files`);
      setFiles(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setFiles([]);
      setFilesErr(e?.response?.data?.error || 'Failed to load attachments.');
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    if (open && enquiryId) fetchFiles(enquiryId);
  }, [open, enquiryId]);

  const handleDownload = async (file) => {
    try {
      const res = await api.get(`/enquiries/files/${file.id}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.response?.data?.error || 'Download failed');
    }
  };

  // trigger inner form submit from header button
  const formRef = useRef(null);
  const submitFromHeader = () => formRef.current?.requestSubmit?.();

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper', boxShadow: 24, maxHeight: '90vh', overflowY: 'auto',
          width: '90%', maxWidth: '1100px', p: 3, borderRadius: 2
        }}
      >
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">View / Update Enquiry</Typography>
            <Chip size="small" label={displayStatus} />
          </Box>
          <Box display="flex" gap={1} alignItems="center">
            {canEdit && (
              <Tooltip title="You are the initiator. You can edit the form below.">
                <span><Button size="small" variant="outlined">Close Edit</Button></span>
              </Tooltip>
            )}

            {/* Approve / Reject (only for the configured approver at this step) */}
            {isApprover && (
              <>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Action</InputLabel>
                  <Select label="Action" value={decision} onChange={(e) => setDecision(e.target.value)}>
                    <MenuItem value="approve">Approve</MenuItem>
                    <MenuItem value="reject">Reject</MenuItem>
                  </Select>
                </FormControl>
                <Button size="small" variant="contained" onClick={applyDecision}>
                  Apply
                </Button>
              </>
            )}

            {/* Header Submit (only when I'm the current assignee; hidden in Outbox unless New) */}
            {canSubmit && !(isOutbox && ((data?.status ?? '') !== 'New')) && (
              <Button size="small" variant="contained" onClick={submitFromHeader}>
                Submit
              </Button>
            )}

            <Button onClick={onClose} variant="outlined">CLOSE</Button>
          </Box>
        </Box>

        {/* Form */}
        <NewEnquiryForm
          mode={modeKey}
          initialData={data || null}
          enquiryId={enquiryId}
          formRef={formRef}              // allow header Submit
          hideSubmit={isOutbox && (data?.status !== 'New')}
          onSuccess={async () => {
            await onSaved?.();
            if (enquiryId) fetchFiles(enquiryId);
          }}
        />

        <Divider sx={{ my: 2 }} />

        {/* Attachments */}
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <AttachFileIcon fontSize="small" />
            <Typography variant="subtitle1">Attachments</Typography>
            {!filesLoading && hasFiles && (
              <Typography variant="body2" color="text.secondary">({files.length})</Typography>
            )}
            {!filesLoading && !hasFiles && (
              <Typography variant="body2" color="text.secondary">(none)</Typography>
            )}
            {filesLoading && <CircularProgress size={18} sx={{ ml: 1 }} />}
          </Box>

          {filesErr && <Alert severity="warning" sx={{ mb: 1 }}>{filesErr}</Alert>}

          {hasFiles && (
            <List dense sx={{ width: '100%', maxWidth: 720 }}>
              {files.map((f) => (
                <ListItem
                  key={f.id}
                  secondaryAction={
                    <Tooltip title="Download">
                      <IconButton edge="end" onClick={() => handleDownload(f)}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={f.original_name || `File #${f.id}`}
                    secondary={
                      <Typography component="span" variant="caption" color="text.secondary">
                        Uploaded by: {f.uploaded_by ?? '—'}
                        {f.created_at ? ` • ${new Date(f.created_at).toLocaleString()}` : ''}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}

          {enquiryId && (
            <Button size="small" onClick={() => fetchFiles(enquiryId)} sx={{ mt: hasFiles ? 1 : 0 }}>
              Refresh attachments
            </Button>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
