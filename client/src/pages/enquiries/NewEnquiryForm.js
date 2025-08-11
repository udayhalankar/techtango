// src/pages/enquiries/NewEnquiryForm.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  TextField, Button, MenuItem, Typography, Grid, Box, InputLabel, Select,
  FormControl, Autocomplete, Alert
} from '@mui/material';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../../services/api';
import SecureFileUploader from '../../components/SecureFileUploader';

const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const INITIAL_VALUES = {
  client_id: '',
  client_mail_id: '',

  enquiry_no: '',
  enquiry_details: '',
  special_instructions: '',

  technical_no: '',
  estimation_no: '',
  proposal_no: '',

  attach_email: '',
  attach_supporting_docs: '',
  attach_technical: '',
  attach_technical_supportings: '',
  attach_estimation: '',
  attach_estimation_supportings: '',
  attach_proposal: '',
  attach_proposal_supportings: '',

  technical_submission_date: daysFromNow(3),
  estimation_submission_date: daysFromNow(5),
  proposal_submission_date: daysFromNow(7),

  technical_comments: '',
  technical_decision: '',
  technical_approval_comment: '',

  estimation_comments: '',
  estimation_approval: '',
  estimation_approval_comment: '',

  proposal_comments: '',
  proposal_approval: '',
  proposal_approval_comments: '',

  initiator_mail_id: '',
  initiator_id: '',
  initiator_email: '',

  technical_recipient_mail_id: '',
  technical_approver_mail_id: '',
  estimation_recipient_mail_id: '',
  estimation_approver_mail_id: '',
  proposal_creator_mail_id: '',
  proposal_approver_mail_id: '',

  recipient: '', // mirrors technical_recipient_mail_id per your earlier logic
  workflow_id: '',
};

const VISIBLE_FIELDS = [
  'enquiry_details', 'special_instructions',
  'attach_email', 'attach_supporting_docs',
  'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date',
  'technical_recipient_mail_id', 'technical_approver_mail_id',
  'estimation_recipient_mail_id', 'estimation_approver_mail_id',
  'proposal_creator_mail_id', 'proposal_approver_mail_id',
  'client_id', 'workflow_id',
];

function formatLabel(key) {
  const map = {
    enquiry_details: 'Enquiry Details',
    special_instructions: 'Special Instructions',
    attach_email: 'Attach Email',
    attach_supporting_docs: 'Attach Supporting Documents',
    client_mail_id: 'Client Email',
    technical_recipient_mail_id: 'Technical By',
    technical_approver_mail_id: 'Technical Approver',
    estimation_recipient_mail_id: 'Estimation By',
    estimation_approver_mail_id: 'Estimation Approver',
    proposal_creator_mail_id: 'Proposal By',
    proposal_approver_mail_id: 'Proposal Approver',
    workflow_id: 'Workflow',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function toIsoOrNull(d) {
  try {
    return d instanceof Date ? d.toISOString() : (d ? new Date(d).toISOString() : null);
  } catch {
    return null;
  }
}

function decodeToken() {
  try {
    const jwt = localStorage.getItem('token');
    if (!jwt) return null;
    const base = jwt.split('.')[1];
    const json = JSON.parse(atob(base.replace(/-/g, '+').replace(/_/g, '/')));
    return json || null;
  } catch {
    return null;
  }
}

const NewEnquiryForm = ({ onSuccess }) => {
  const [formValues, setFormValues] = useState(INITIAL_VALUES);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // preload initiator from token if user object not present
  useEffect(() => {
    const savedUser = (() => {
      try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
    })();
    const tokenUser = decodeToken();

    setFormValues((prev) => ({
      ...prev,
      initiator_id: savedUser?.id || tokenUser?.id || tokenUser?.userId || '',
      initiator_email: savedUser?.email || tokenUser?.email || '',
      initiator_mail_id: savedUser?.email || tokenUser?.email || '',
    }));
  }, []);

  // Load dropdown data
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr('');
      try {
        const [userRes, clientRes] = await Promise.all([
          api.get('/users/org?includeSelf=true'),
          api.get('/businesspartner'),
        ]);
        if (!cancelled) {
          setUsers(Array.isArray(userRes.data) ? userRes.data : []);
          setClients(Array.isArray(clientRes.data) ? clientRes.data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setUsers([]);
          setClients([]);
          const status = e?.response?.status;
          if (status === 401) setErr('Your session has expired. Please log in again.');
          else setErr(e?.response?.data?.error || 'Failed to load users/clients.');
        }
      }

      // Workflows are optional; don’t block the form if the user lacks that subscription
      try {
        const wf = await api.get('/workflows');
        if (!cancelled) setWorkflows(Array.isArray(wf.data) ? wf.data : []);
      } catch (e) {
        if (!cancelled) {
          // swallow 403/404 and keep workflows empty
          setWorkflows([]);
          // If you want to show a subtle hint, uncomment:
          // console.warn('Workflows not available:', e?.response?.status);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'technical_recipient_mail_id' ? { recipient: value } : null),
    }));
  };

  const handleDateChange = (name, date) => {
    setFormValues((prev) => ({ ...prev, [name]: date || null }));
  };

  const handleClientSelect = (_e, newClient) => {
    setFormValues((prev) => ({
      ...prev,
      client_id: newClient?.id || '',
      client_mail_id: newClient?.email || '',
    }));
  };

  const userMenuItems = useMemo(() => {
    return users.map((u) => ({
      key: u.id,
      label: `${u.firstname || ''} ${u.lastname || ''}  ${u.email ? `(${u.email})` : ''}`.trim(),
      value: u.email || '', // store email since the field is *_mail_id
    }));
  }, [users]);

  const validate = () => {
    const problems = [];
    if (!formValues.client_id) problems.push('Client is required.');
    if (!formValues.enquiry_no?.trim()) problems.push('Client Ref No (enquiry_no) is required.');
    if (!formValues.proposal_submission_date) problems.push('Proposal submission date is required.');
    if (problems.length) {
      setErr(problems.join(' '));
      return false;
    }
    setErr('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const fd = new FormData();
      const payload = {
        ...formValues,
        technical_submission_date: toIsoOrNull(formValues.technical_submission_date),
        estimation_submission_date: toIsoOrNull(formValues.estimation_submission_date),
        proposal_submission_date: toIsoOrNull(formValues.proposal_submission_date),
        status: 'New',
      };

      Object.entries(payload).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') fd.append(k, v);
      });

      files.forEach((file) => fd.append('files', file));

      await api.post('/enquiries/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Enquiry submitted successfully.');
      if (typeof onSuccess === 'function') onSuccess();

      // reset
      setFormValues({
        ...INITIAL_VALUES,
        initiator_id: formValues.initiator_id,
        initiator_email: formValues.initiator_email,
        initiator_mail_id: formValues.initiator_mail_id,
      });
      setFiles([]);
    } catch (e) {
      console.error('Enquiry submit failed:', e);
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Submission failed';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  const renderDynamicFields = () => {
    return VISIBLE_FIELDS.map((key) => {
      // Dates
      if (key.endsWith('_date')) {
        return (
          <Grid item xs={12} md={4} key={key}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DesktopDatePicker
                label={formatLabel(key)}
                inputFormat="MM/dd/yyyy"
                value={formValues[key] || null}
                onChange={(date) => handleDateChange(key, date)}
                renderInput={(params) => <TextField fullWidth {...params} />}
              />
            </LocalizationProvider>
          </Grid>
        );
      }

      // User email selectors (store email as value)
      if ([
        'technical_recipient_mail_id', 'technical_approver_mail_id',
        'estimation_recipient_mail_id', 'estimation_approver_mail_id',
        'proposal_creator_mail_id', 'proposal_approver_mail_id'
      ].includes(key)) {
        return (
          <Grid item xs={12} md={6} key={key}>
            <FormControl fullWidth>
              <InputLabel>{formatLabel(key)}</InputLabel>
              <Select
                name={key}
                value={formValues[key] || ''}
                onChange={handleChange}
                label={formatLabel(key)}
              >
                {userMenuItems.map((u) => (
                  <MenuItem key={u.key} value={u.value}>{u.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );
      }

      // Client
      if (key === 'client_id') {
        return (
          <Grid container spacing={2} sx={{ margin: '1px' }} key={key}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <Autocomplete
                  options={clients}
                  getOptionLabel={(opt) => opt?.name || ''}
                  onChange={handleClientSelect}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Client" variant="outlined" fullWidth />
                  )}
                />
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Client Ref No"
                name="enquiry_no"
                variant="outlined"
                value={formValues.enquiry_no || ''}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        );
      }

      // Workflow (optional)
      if (key === 'workflow_id') {
        return (
          <Grid item xs={12} md={6} key={key}>
            <FormControl fullWidth>
              <InputLabel>{formatLabel(key)}</InputLabel>
              <Select
                name="workflow_id"
                value={formValues.workflow_id || ''}
                onChange={handleChange}
                label={formatLabel(key)}
              >
                {workflows.map((wf) => (
                  <MenuItem key={wf.id} value={wf.id}>{wf.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );
      }

      // Generic text fields
      return (
        <Grid item xs={12} sm={6} key={key}>
          <TextField
            fullWidth
            label={formatLabel(key)}
            name={key}
            value={formValues[key] ?? ''}
            onChange={handleChange}
          />
        </Grid>
      );
    });
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h5" align="center" gutterBottom>New Enquiry</Typography>

      {err && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {renderDynamicFields()}

          <Grid item xs={12}>
            <SecureFileUploader files={files} setFiles={setFiles} />
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={saving}
            >
              {saving ? 'Submitting…' : 'Submit'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default NewEnquiryForm;
