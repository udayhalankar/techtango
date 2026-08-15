// src/pages/enquiries/NewEnquiryForm.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  TextField, Button, Typography, Grid, Box, InputLabel, Select,
  FormControl, Autocomplete, Alert, MenuItem

} from '@mui/material';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../../services/api';
import SecureFileUploader from '../../components/SecureFileUploader';
// safe helper for Set.has so it won't crash if a set is missing
const has = (set, key) => !!(set && typeof set.has === 'function' && set.has(key));


// Normalize a status to a map key: "Technical Approved" -> "Technical_Approved"
const toKey = (s) => String(s || '').trim().replace(/\s+/g, '_');

// Convert an underscore status to match the style of `example`
//  - if example had spaces, return "Estimation Submitted"
//  - if example had underscores, return "Estimation_Submitted"
const matchStyle = (example, underscoreStatus) =>
  String(example || '').includes(' ')
    ? String(underscoreStatus || '').replace(/_/g, ' ')
    : String(underscoreStatus || '');

const FIELD_SIZE = 'medium';
const FIELD_MARGIN = 'dense';
const ROW_GAP = 1;

/** Best-effort routing for who should receive based on the *typed* status */
const NEXT_RECIPIENT_BY_STATUS = {
  New: 'technical_recipient_mail_id',

  Technical_Submitted:  'technical_approver_mail_id',
  Technical_Approved:   'estimation_recipient_mail_id',
  Technical_Rejected:   'technical_recipient_mail_id',

  Estimation_Submitted: 'estimation_approver_mail_id',
  Estimation_Approved:  'proposal_creator_mail_id',
  Estimation_Rejected:  'estimation_recipient_mail_id',

  Proposal_Created:     'proposal_approver_mail_id',
  Proposal_Approved:    'initiator_id',
  Proposal_Rejected:    'proposal_creator_mail_id',
  Proposal_Submitted:   'proposal_approver_mail_id',

  PO_Received:          'proposal_approver_mail_id',
  PO_Accepted:          'proposal_approver_mail_id',
};

// Auto-advance map for status when Submit is clicked (edit mode)
const NEXT_STATUS_ON_SUBMIT = {
  Create:               'New',
  New:                  'Technical_Submitted',

  // These “*_Submitted” statuses move by Approve/Reject (not by Submit),
  // so Submit keeps them unchanged.
  Technical_Submitted:  'Technical_Approved',
  Technical_Approved: 'Estimation_Submitted',
  Technical_Rejected: 'New',
  Estimation_Submitted: 'Proposal_Created',
  Estimation_Approved:  'Proposal_Created',
  Estimation_Rejected:  'Estimation_Submitted',

  // After approval, Submit advances to the next “*_Submitted/Created” stage:
  Proposal_Created:   'Proposal_Approved',
  Proposal_Rejected: 'Technical_Approved',
  Proposal_Approved:   'Proposal_Submitted',

  

  Proposal_Approved:    'Proposal_Submitted',
  Proposal_Rejected:    'Proposal_Created',

  Proposal_Submitted:   'PO_Received',
  PO_Received:          'PO_Accepted',
  PO_Accepted:          'PO_Accepted',
};


const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

/* -------------------- constants & helpers -------------------- */
const INITIAL_VALUES = {
  /** ← manual, free-text status (you type the next status yourself) */
  status: 'New',

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

  // NEW fields
  enquiry_date: null,
  offer_date: null,
  source: '',
  repeat_or_new: '',
  enquiry_type: '',
  qty: '',
  size_model: '',
  offer_value_in_inr: '',
  country: '',
  po_no: '',
  po_date: null,
  po_value_in_inr: '',
  po_value_in_usd: '',
  exchange_rate: '',
  project_code: '',
  key_decision_maker: '',
  date_technical_created: null,
  date_technical_approved: null,
  date_estimate_created: null,
  date_estimate_approved: null,
  date_proposal_created: null,
  date_proposal_approved: null,
  date_proposal_sent: null,

  recipient: '',
  workflow_id: '',
};

const DATE_FIELDS = [
  'technical_submission_date','estimation_submission_date','proposal_submission_date',
  'enquiry_date','offer_date','po_date',
  'date_technical_created','date_technical_approved',
  'date_estimate_created','date_estimate_approved',
  'date_proposal_created','date_proposal_approved','date_proposal_sent',
];
const DATE_FIELD_SET = new Set(DATE_FIELDS);

const MAIL_ID_KEYS = new Set([
  'technical_recipient_mail_id','technical_approver_mail_id',
  'estimation_recipient_mail_id','estimation_approver_mail_id',
  'proposal_creator_mail_id','proposal_approver_mail_id'
]);

// When status advances to one of these, stamp the corresponding date field
const STATUS_DATE_STAMP = {
  Technical_Submitted:  'date_technical_created',
  Technical_Approved:   'date_technical_approved',
  Estimation_Submitted: 'date_estimate_created',
  Estimation_Approved:  'date_estimate_approved',
  Proposal_Created:     'date_proposal_created',
  Proposal_Approved:    'date_proposal_approved',
  Proposal_Submitted:   'date_proposal_sent',
};

const numberFields = new Set(['qty','offer_value_in_inr','po_value_in_usd','exchange_rate']);

function formatLabel(key) {
  const map = {
    status: 'Status',
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
    enquiry_date: 'Enquiry Date',
    offer_date: 'Offer Date',
    source: 'Source',
    repeat_or_new: 'Repeat / New',
    enquiry_type: 'Type',
    qty: 'Qty',
    size_model: 'Size / Model',
    offer_value_in_inr: 'Offer Value in INR',
    country: 'Country',
    po_no: 'PO No.',
    po_date: 'PO Date',
    po_value_in_inr: 'PO Value in INR',
    po_value_in_usd: 'PO Value in USD',
    exchange_rate: 'Exchange Rate',
    project_code: 'Project Code',
    technical_comments: 'Technical Comments',
    technical_approval_comment: 'Technical Approval Comments',
    estimation_comments: 'Estimation Comments',
    estimation_approval_comments: 'Estimation Approval Comments',
    proposal_comments: 'Proposal Comments',
    proposal_approval_comments: 'Proposal Approval Comments',
    key_decision_maker: 'Key Decision Maker',
    date_technical_created: 'Technical Created',
    date_technical_approved: 'Technical Approved',
    date_estimate_created: 'Estimate Created',
    date_estimate_approved: 'Estimate Approved',
    date_proposal_created: 'Proposal Created',
    date_proposal_approved: 'Proposal Approved',
    date_proposal_sent: 'Proposal Sent',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function toIsoOrNull(d) {
  try {
    return d instanceof Date ? d.toISOString() : (d ? new Date(d).toISOString() : null);
  } catch { return null; }
}

function decodeToken() {
  try {
    const jwt = localStorage.getItem('token');
    if (!jwt) return null;
    const base = jwt.split('.')[1];
    const json = JSON.parse(atob(base.replace(/-/g, '+').replace(/_/g, '/')));
    return json || null;
  } catch { return null; }
}

/* -------------------- component -------------------- */
const NewEnquiryForm = ({
  onSuccess, mode = 'create', initialData = null, enquiryId = null, formRef = null,
  advanceStatusOnSubmit = true, submitLabel = 'Submit', hideSubmit = false, ...props
}) => {
  const isCreate = mode === 'create';
  
  /** Keep your mode-based rules, but do NOT hide or lock "status" */
  const RULES_BY_MODE = {
    create: {
      readonly: new Set(['']),
      hidden: new Set([
        'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd',
        'exchange_rate','project_code','key_decision_maker',
        'date_technical_created','date_technical_approved',
        'date_estimate_created','date_estimate_approved',
        'date_proposal_created','date_proposal_approved','date_proposal_sent',
        'technical_comments','technical_approval_comment',
        'estimation_comment','estimation_approval_comment',
        'proposal_comment','proposal_approval_comment',
      ])
    },
    // (All other modes unchanged; ensure none include 'status' in hidden/readonly)
    New: {
      readonly: new Set([
        'enquiry_details','special_instructions','client_id','enquiry_no','source','enquiry_type',
        'country','repeat_or_new','qty', 'size_model',
        'technical_recipient_mail_id','technical_approver_mail_id',
        'estimation_recipient_mail_id','estimation_approver_mail_id',
        'proposal_creator_mail_id','proposal_approver_mail_id','enquiry_date',
        'date_technical_created','technical_submission_date','estimation_submission_date',
        'proposal_submission_date','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved'
      ]),
      hidden: new Set([
        'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd',
        'exchange_rate','project_code','key_decision_maker',
        'date_technical_created','date_technical_approved',
        'date_estimate_created','date_estimate_approved',
        'date_proposal_created','date_proposal_approved','date_proposal_sent',
        'technical_approval_comment',
        'estimation_comment','estimation_approval_comment',
        'proposal_comment','proposal_approval_comment',
      ])
    },
    Technical_Submitted: {
      readonly: new Set([
         'enquiry_details','special_instructions','client_id','enquiry_no','source','enquiry_type',
        'country','repeat_or_new','qty', 'size_model',
        'technical_recipient_mail_id','technical_approver_mail_id',
        'estimation_recipient_mail_id','estimation_approver_mail_id',
        'proposal_creator_mail_id','proposal_approver_mail_id','enquiry_date','technical_comments',
        'date_technical_created','technical_submission_date','estimation_submission_date',
        'proposal_submission_date','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved'
      ]),
      hidden: new Set([
        'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
        'estimation_comments','estimation_approval_comments','proposal_comments','proposal_approval_comments',
         'estimation_comment','estimation_approval_comment',
        'proposal_comment','proposal_approval_comment',
      ])
    },
    Technical_Approved: {
      readonly: new Set([
        'enquiry_details','special_instructions','attach_email','attach_supporting_docs','client_mail_id',
        'technical_recipient_mail_id','technical_approver_mail_id','estimation_recipient_mail_id',
        'estimation_approver_mail_id','proposal_creator_mail_id','proposal_approver_mail_id','workflow_id',
        'enquiry_date','offer_date','source','repeat_or_new','enquiry_type','qty','size_model','offer_value_in_inr',
        'country','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
      ]),
      hidden: new Set([
        'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
        'estimation_approval_comments','proposal_comments','proposal_approval_comments'
      ])
    },
    Estimation_Submitted: {
      readonly: new Set([
        'enquiry_details','special_instructions','attach_email','attach_supporting_docs','client_mail_id',
        'technical_recipient_mail_id','technical_approver_mail_id','estimation_recipient_mail_id',
        'estimation_approver_mail_id','proposal_creator_mail_id','proposal_approver_mail_id','workflow_id',
        'enquiry_date','offer_date','source','repeat_or_new','enquiry_type','qty','size_model','offer_value_in_inr',
        'country','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
      ]),
      hidden: new Set([
        'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
        'proposal_comments','proposal_approval_comments'
      ])
    },
    Estimation_Approved: {
      readonly: new Set([
        'enquiry_details','special_instructions','attach_email','attach_supporting_docs','client_mail_id',
        'technical_recipient_mail_id','technical_approver_mail_id','estimation_recipient_mail_id',
        'estimation_approver_mail_id','proposal_creator_mail_id','proposal_approver_mail_id','workflow_id',
        'enquiry_date','offer_date','source','repeat_or_new','enquiry_type','qty','size_model','offer_value_in_inr',
        'country','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
      ]),
      hidden: new Set([
        'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
        'proposal_approval_comments'
      ])
    },
    Proposal_Created: {
      readonly: new Set([
        'client_id','status','enquiry_no','enquiry_details','special_instructions','attach_email','attach_supporting_docs','client_mail_id',
        'technical_recipient_mail_id','technical_approver_mail_id','estimation_recipient_mail_id',
        'estimation_approver_mail_id','proposal_creator_mail_id','proposal_approver_mail_id','workflow_id',
        'enquiry_date','offer_date','source','repeat_or_new','enquiry_type','qty','size_model','offer_value_in_inr',
        'country',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_sent',
        'offer_date',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_sent',
        'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date',
        'technical_comments','technical_approval_comment',
        'estimation_comment','estimation_approval_comment',
        
      ]),
      hidden: new Set([
        'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
      ])
    },
    Proposal_Approved: {
      readonly: new Set([
        'client_id','status','enquiry_no','enquiry_details','special_instructions','attach_email','attach_supporting_docs','client_mail_id',
        'technical_recipient_mail_id','technical_approver_mail_id','estimation_recipient_mail_id',
        'estimation_approver_mail_id','proposal_creator_mail_id','proposal_approver_mail_id','workflow_id',
        'enquiry_date','offer_date','source','repeat_or_new','enquiry_type','qty','size_model','offer_value_in_inr',
        'country',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_sent',
        'offer_date',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_sent',
        'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date',
        'technical_comments','technical_approval_comment',
        'estimation_comment','estimation_approval_comment',
        'proposal_comment',
      ]),
      hidden: new Set([
        'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
      ])
    },
   
    Proposal_Submitted: {
      readonly: new Set([
        'client_id','status','enquiry_no','enquiry_details','special_instructions','attach_email','attach_supporting_docs','client_mail_id',
        'technical_recipient_mail_id','technical_approver_mail_id','estimation_recipient_mail_id',
        'estimation_approver_mail_id','proposal_creator_mail_id','proposal_approver_mail_id','workflow_id',
        'enquiry_date','offer_date','source','repeat_or_new','enquiry_type','qty','size_model','offer_value_in_inr',
        'country',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
        'offer_date',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
        'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date',
        'technical_comments','technical_approval_comment',
        'estimation_comment','estimation_approval_comment',
        'proposal_comment','proposal_approval_comment',
      ]),
      hidden: new Set([
        
      ])
    },
    PO_Received: {
      readonly: new Set([
         'client_id','status','enquiry_no','enquiry_details','special_instructions','attach_email','attach_supporting_docs','client_mail_id',
        'technical_recipient_mail_id','technical_approver_mail_id','estimation_recipient_mail_id',
        'estimation_approver_mail_id','proposal_creator_mail_id','proposal_approver_mail_id','workflow_id',
        'enquiry_date','offer_date','source','repeat_or_new','enquiry_type','qty','size_model','offer_value_in_inr',
        'country','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
        'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
        'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date',
        'technical_comments','technical_approval_comment',
        'estimation_comment','estimation_approval_comment',
        'proposal_comment','proposal_approval_comment',
      ]),
      hidden: new Set([
        // 'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        // 'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        // 'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent'
      ])
    },
    PO_Accepted: {
     
      readonly: new Set([
        'client_id','status','enquiry_no','enquiry_details','special_instructions','attach_email','attach_supporting_docs','client_mail_id',
        'technical_recipient_mail_id','technical_approver_mail_id','estimation_recipient_mail_id',
        'estimation_approver_mail_id','proposal_creator_mail_id','proposal_approver_mail_id','workflow_id',
        'enquiry_date','offer_date','source','repeat_or_new','enquiry_type','qty','size_model','offer_value_in_inr',
        'country','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
        'offer_date','po_no','po_date','po_value_in_inr','po_value_in_usd','exchange_rate','project_code',
        'key_decision_maker','date_technical_created','date_technical_approved','date_estimate_created',
        'date_estimate_approved','date_proposal_created','date_proposal_approved','date_proposal_sent',
        'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date',
        'technical_comments','technical_approval_comment',
        'estimation_comment','estimation_approval_comment',
        'proposal_comment','proposal_approval_comment',

      ]),
      hidden: new Set([
       
      ])
    },
  };
  const activeRules = RULES_BY_MODE[mode] || RULES_BY_MODE.create;

  /** layout rows (each row consumes 12 cols) */
  const FIELD_LAYOUT = [
    /** show editable Status field first */
    // { md: 6, fields: ['status'] },

    { md: 6, fields: ['client_id', 'enquiry_no'] },
    { md: 6, fields: ['source', 'enquiry_type'] },
    { md: 6, fields: ['country', 'repeat_or_new'] },
    { md: 6, fields: ['qty', 'size_model'] },
    { md: 12, fields: ['enquiry_details'] },
    { md: 12, fields: ['special_instructions'] },
    { md: 6, fields: ['technical_recipient_mail_id', 'technical_approver_mail_id'] },
    { md: 6, fields: ['estimation_recipient_mail_id', 'estimation_approver_mail_id'] },
    { md: 6, fields: ['proposal_creator_mail_id', 'proposal_approver_mail_id'] },

    { md: 3, fields: ['enquiry_date', 'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date'] },
    { md: 3, fields: ['date_technical_created', 'date_technical_approved', 'date_estimate_created', 'date_estimate_approved'] },
    { md: 3, fields: ['date_proposal_created', 'date_proposal_approved', 'date_proposal_sent', 'offer_date'] },

    { md: 3, fields: ['po_date', 'po_no', 'po_value_in_inr', 'po_value_in_usd'] },
    { md: 4, fields: ['exchange_rate', 'project_code', 'key_decision_maker'] },
    { md: 6, fields: ['technical_comments','technical_approval_comment'] },
    { md: 6, fields: ['estimation_comment','estimation_approval_comment'] },
    { md: 6, fields: ['proposal_comment','proposal_approval_comment'] },
   
  ];

  const [formValues, setFormValues] = useState(INITIAL_VALUES);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // preload initiator
  useEffect(() => {
    const savedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
    const tokenUser = decodeToken();
    setFormValues((prev) => ({
      ...prev,
      initiator_id: savedUser?.id || tokenUser?.id || tokenUser?.userId || '',
      initiator_email: savedUser?.email || tokenUser?.email || '',
      initiator_mail_id: savedUser?.email || tokenUser?.email || '',
    }));
  }, []);

  // Pre-fill when viewing/editing an existing enquiry
  useEffect(() => {
    if (!initialData) return;
    const hydrated = { ...INITIAL_VALUES, ...initialData };
    DATE_FIELDS.forEach((k) => { hydrated[k] = initialData[k] ? new Date(initialData[k]) : null; });
    setFormValues((prev) => ({ ...prev, ...hydrated }));
  }, [initialData]);

  // dropdown data
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
          setUsers([]); setClients([]);
          const status = e?.response?.status;
          if (status === 401) setErr('Your session has expired. Please log in again.');
          else setErr(e?.response?.data?.error || 'Failed to load users/clients.');
        }
      }
      try {
        const wf = await api.get('/workflows');
        if (!cancelled) setWorkflows(Array.isArray(wf.data) ? wf.data : []);
      } catch {
        if (!cancelled) setWorkflows([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (MAIL_ID_KEYS.has(name)) {
      setFormValues((prev) => ({
        ...prev,
        [name]: value,
        ...(name === 'technical_recipient_mail_id' ? { recipient: value || '' } : null),
      }));
      return;
    }
    setFormValues((prev) => ({ ...prev, [name]: value }));
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

  const userMenuItems = useMemo(() => users.map((u) => ({
    key: u.id,
    value: String(u.id),
    email: u.email || '',
    label: `${u.firstname || ''} ${u.lastname || ''}${u.email ? ` (${u.email})` : ''}`.trim(),
  })), [users]);

  const validate = () => {
    const problems = [];
    if (!formValues.client_id) problems.push('Client is required.');
    if (!formValues.enquiry_no?.trim()) problems.push('Client Ref No (enquiry_no) is required.');
    if (!formValues.proposal_submission_date) problems.push('Proposal submission date is required.');
    if (problems.length) { setErr(problems.join(' ')); return false; }
    setErr(''); return true;
  };

  /* -------------------- rendering helpers -------------------- */
  const renderField = (key, md) => {
  const isHidden   = has(activeRules.hidden, key);
  const isDisabled = has(activeRules.readonly, key);
  if (isHidden) return null;

  if (DATE_FIELD_SET.has(key)) {
    return (
      <Grid item xs={12} md={md} key={key}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DesktopDatePicker
            label={formatLabel(key)}
            inputFormat="MM/dd/yyyy"
            value={formValues[key] || null}
            onChange={(date) => handleDateChange(key, date)}
            disabled={isDisabled}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                size={FIELD_SIZE}
                margin={FIELD_MARGIN}
                disabled={isDisabled}
              />
            )}
          />
        </LocalizationProvider>
      </Grid>
    );
  }

  if ([
    'technical_recipient_mail_id','technical_approver_mail_id',
    'estimation_recipient_mail_id','estimation_approver_mail_id',
    'proposal_creator_mail_id','proposal_approver_mail_id'
  ].includes(key)) {
    return (
      <Grid item xs={12} md={md} key={key}>
        <FormControl fullWidth disabled={isDisabled} size={FIELD_SIZE} margin={FIELD_MARGIN}>
          <InputLabel>{formatLabel(key)}</InputLabel>
          <Select
            name={key}
            value={formValues[key] ? String(formValues[key]) : ''}
            onChange={handleChange}
            label={formatLabel(key)}
            disabled={isDisabled}
          >
            {userMenuItems.map((u) => (
              <MenuItem key={u.key} value={u.value}>{u.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    );
  }

  if (key === 'client_id') {
    const selectedClient = clients.find(c => String(c.id) === String(formValues.client_id)) || null;
    return (
      <Grid item xs={12} md={md} key={key}>
        <Autocomplete
          size={FIELD_SIZE}
          options={clients}
          getOptionLabel={(opt) => opt?.name || ''}
          isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
          value={selectedClient}
          onChange={handleClientSelect}
          disabled={isDisabled}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Client"
              variant="outlined"
              fullWidth
              size={FIELD_SIZE}
              margin={FIELD_MARGIN}
              disabled={isDisabled}
            />
          )}
        />
      </Grid>
    );
  }

  if (key === 'workflow_id') {
    return (
      <Grid item xs={12} md={md} key={key}>
        <FormControl fullWidth disabled={isDisabled} size={FIELD_SIZE} margin={FIELD_MARGIN}>
          <InputLabel>{formatLabel(key)}</InputLabel>
          <Select
            name="workflow_id"
            value={formValues.workflow_id || ''}
            onChange={handleChange}
            label={formatLabel(key)}
            disabled={isDisabled}
          >
            {workflows.map((wf) => (
              <MenuItem key={wf.id} value={wf.id}>{wf.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    );
  }

  return (
    <Grid item xs={12} md={md} key={key}>
      <TextField
        fullWidth
        label={formatLabel(key)}
        name={key}
        value={formValues[key] ?? ''}
        onChange={handleChange}
        type={numberFields.has(key) ? 'number' : 'text'}
        size={FIELD_SIZE}
        margin={FIELD_MARGIN}
        disabled={isDisabled}          
      />
    </Grid>
  );
};


  const renderDynamicFields = () => (
    <>
      {FIELD_LAYOUT.map((row, i) => (
        <Grid container spacing={2} sx={{ mb: ROW_GAP }} key={`row-${i}`}>
          {row.fields.map((f) => renderField(f, row.md))}
        </Grid>
      ))}
    </>
  );

  /* -------------------- submit -------------------- */
 const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validate()) return;

  // --- your existing status logic (unchanged) ---
  const currentRaw =
    enquiryId
      ? (initialData?.status ?? formValues.status ?? 'New')
      : (formValues.status ?? 'New');

  const currentKey = toKey(currentRaw);

  let nextKey;
  if (!enquiryId) {
    nextKey = 'New';
  } else if (advanceStatusOnSubmit) {
    nextKey = NEXT_STATUS_ON_SUBMIT[currentKey] || currentKey;
  } else {
    nextKey = currentKey;
  }

  const statusToSave = matchStyle(currentRaw, nextKey);

  // If you added date stamping earlier, keep it here:
  // (safe no-op if you didn’t)
  const base = { ...formValues };
  if (currentKey !== nextKey) {
    const STATUS_DATE_STAMP = {
      Technical_Submitted:  'date_technical_created',
      Technical_Approved:   'date_technical_approved',
      Estimation_Submitted: 'date_estimate_created',
      Estimation_Approved:  'date_estimate_approved',
      Proposal_Created:     'date_proposal_created',
      Proposal_Approved:    'date_proposal_approved',
      Proposal_Submitted:   'date_proposal_sent',
    };
    const stampField = STATUS_DATE_STAMP[nextKey];
    if (stampField && !base[stampField]) base[stampField] = new Date();
  }

  DATE_FIELDS.forEach((k) => { base[k] = toIsoOrNull(base[k]); });

  const recipientField = NEXT_RECIPIENT_BY_STATUS[nextKey] || null;
  const nextRecipientId =
    (recipientField ? base[recipientField] : null) ||
    base.recipient ||
    base.technical_recipient_mail_id ||
    null;

  const payload = {
    ...base,
    status: statusToSave,
    recipient: nextRecipientId,
  };

  setSaving(true);
  try {
    // ...inside try { if (enquiryId) { await api.put(`/enquiries/${enquiryId}`, payload);

if (enquiryId) {
  // 1) Update the record (JSON)
  await api.put(`/enquiries/${enquiryId}`, payload);

  // 2) If there are NEW files, upload them to the *existing* enquiry
  if (files && files.length > 0) {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));

    // IMPORTANT: only use the attach-to-existing endpoint.
    // Do NOT fall back to /enquiries/upload; that creates a new enquiry.
    try {
      await api.post(`/enquiries/${enquiryId}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (err) {
      // Make the missing route obvious instead of silently creating a new enquiry
      if (err?.response?.status === 404) {
        throw new Error(
          "Missing endpoint POST /enquiries/:id/files for attaching files to an existing enquiry."
        );
      }
      throw err;
    }
  }
} else {
  // CREATE path stays the same (create + files together)
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') fd.append(k, v);
  });
  (files || []).forEach((file) => fd.append('files', file));
  await api.post('/enquiries/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}


    alert(`Enquiry submitted. Status: ${statusToSave}`);
    onSuccess?.();

    setFormValues((prev) => ({
      ...INITIAL_VALUES,
      initiator_id: prev.initiator_id,
      initiator_email: prev.initiator_email,
      initiator_mail_id: prev.initiator_mail_id,
    }));
    setFiles([]);
  } catch (e2) {
    console.error('Enquiry submit failed:', e2);
    const msg = e2?.response?.data?.error || e2?.response?.data?.message || e2?.message || 'Submission failed';
    setErr(msg);
  } finally {
    setSaving(false);
  }
};





  /* -------------------- render -------------------- */
  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h5" align="center" gutterBottom>New Enquiry</Typography>
      <br />

      {err && <Alert severity="warning" sx={{ mb: 2 }}>{err}</Alert>}

      <form ref={formRef} onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {renderDynamicFields()}

          <Grid item xs={12}>
            <SecureFileUploader files={files} setFiles={setFiles} />
          </Grid>

          {!hideSubmit && (
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={saving}
              >
                {saving ? 'Saving…' : submitLabel}
              </Button>
            </Grid>
          )}
        </Grid>
      </form>
    </Box>
  );
};

export default NewEnquiryForm;
