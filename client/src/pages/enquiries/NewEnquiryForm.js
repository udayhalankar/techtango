// // Updated NewEnquiryForm.js
// import React, { useState, useEffect } from 'react';
// import {
//   TextField, Button, MenuItem, Typography, Grid, Box, InputLabel, Select,
//   FormControl, FormHelperText, Autocomplete
// } from '@mui/material';
// import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import axios from 'axios';


// const VISIBLE_FIELDS = [
//   'enquiry_details', 'special_instructions',
//   'attach_email', 'attach_supporting_docs',
//   'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date',
//   'technical_recipient_mail_id', 'technical_approver_mail_id',
//   'estimation_recipient_mail_id', 'estimation_approver_mail_id',
//   'proposal_creator_mail_id', 'proposal_approver_mail_id',
//   'client_id'
// ];

// const NewEnquiryForm = ({ onSuccess }) => {
//   const [formValues, setFormValues] = useState({
//     client_id: '', enquiry_no: '', enquiry_details: '', special_instructions: '',
//     technical_no: '', estimation_no: '', proposal_no: '',
//     attach_email: '', attach_supporting_docs: '', attach_technical: '', attach_technical_supportings: '',
//     attach_estimation: '', attach_estimation_supportings: '', attach_proposal: '', attach_proposal_supportings: '',
//     technical_submission_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
//     estimation_submission_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
//     proposal_submission_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//     technical_comments: '', technical_decision: '', technical_approval_comment: '',
//     estimation_comments: '', estimation_approval: '', estimation_approval_comment: '',
//     proposal_comments: '', proposal_approval: '', proposal_approval_comments: '',
//     initiator_mail_id: '', technical_recipient_mail_id: '', technical_approver_mail_id: '',
//     estimation_recipient_mail_id: '', estimation_approver_mail_id: '', proposal_creator_mail_id: '',
//     proposal_approver_mail_id: '',  
//     initiator_id: '', initiator_email: '', recipient: ''
//   });

//   const [users, setUsers] = useState([]);
//   const [clients, setClients] = useState([]);
//   const [workflows, setWorkflows] = useState([]);




//   // useEffect(() => {
//   //   const fetchData = async () => {
//   //     const [userRes, clientRes, wfRes] = await Promise.all([
//   //       axios.get('/api/users?orgOnly=true'),
//   //       axios.get('/api/businesspartner'),
//   //       axios.get('/api/workflows')
//   //     ]);

//   //     setUsers(userRes.data || []);
//   //     setClients(clientRes.data || []);
//   //     setWorkflows(wfRes.data || []);

//   //     const user = JSON.parse(localStorage.getItem('user'));
//   //     setFormValues((prev) => ({
//   //       ...prev,
//   //       initiator_id: user?.id || '',
//   //       initiator_email: user?.email || '',
//   //       initiator_mail_id: user?.email || ''
//   //     }));
//   //   };
//   //   fetchData();
//   // }, []);


//   useEffect(() => {
//   const fetchData = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const config = {
//         headers: { Authorization: `Bearer ${token}` }
//       };

//       const [userRes, clientRes, wfRes] = await Promise.all([
//         axios.get('/api/users?orgOnly=true', config),
//         axios.get('/api/businesspartner', config),
//         axios.get('/api/workflows', config)
//       ]); 

//       setUsers(userRes.data || []);
//       setClients(clientRes.data || []);
//       setWorkflows(wfRes.data || []);

//       const user = JSON.parse(localStorage.getItem('user'));
//       setFormValues((prev) => ({
//         ...prev,
//         initiator_id: user?.id || '',
//         initiator_email: user?.email || '',
//         initiator_mail_id: user?.email || ''
//       }));
//     } catch (err) {
//       console.error('Data fetch error:', err);
//       alert('Session expired or unauthorized. Please log in again.');
//     }
//   };

//   fetchData();
// }, []);





//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     // setFormValues({ ...formValues, [name]: value });
//     setFormValues((prev) => ({
//     ...prev,
//     [name]: value,
//     ...(name === 'technical_recipient_mail_id' && { recipient: value })  // ✅ auto-set recipient
//   }));

//   };

//   const handleDateChange = (name, value) => {
//     setFormValues({ ...formValues, [name]: value });
//   };

//   const handleClientSelect = (e, newClient) => {
//     setFormValues({
//       ...formValues,
//       client_id: newClient?.id || '',
//       client_mail_id: newClient?.email || ''
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = {
//         ...formValues,
//         technical_submission_date: formValues.technical_submission_date?.toISOString(),
//         estimation_submission_date: formValues.estimation_submission_date?.toISOString(),
//         proposal_submission_date: formValues.proposal_submission_date?.toISOString(),
//         recipient: formValues.recipient,
//         status: 'New'
//       };
//       await axios.post('/api/enquiries', payload);
//       alert('Enquiry submitted successfully');
//       if (onSuccess) onSuccess();
//       setFormValues({});
//     } catch (err) {
//       console.error(err);
//       alert('Submission failed');
//     }
//   };

//   const renderFields = () => {
//     return Object.entries(formValues).map(([key, value]) => {
//       if (!VISIBLE_FIELDS.includes(key)) return null;

//       if (key.endsWith('_date')) {
//         return (
//           <Grid item xs={12} md={4} key={key}>
//             <LocalizationProvider dateAdapter={AdapterDateFns}>
//               <DesktopDatePicker
//                 label={formatLabel(key)}
//                 inputFormat="MM/dd/yyyy"
//                 value={value || null}
//                 onChange={(date) => handleDateChange(key, date)}
//                 renderInput={(params) => <TextField fullWidth {...params} />}
//               />
//             </LocalizationProvider>
//           </Grid>
//         );
//       }

//       if ([
//         'technical_recipient_mail_id', 'technical_approver_mail_id',
//         'estimation_recipient_mail_id', 'estimation_approver_mail_id',
//         'proposal_creator_mail_id', 'proposal_approver_mail_id'
//       ].includes(key)) {
//         return (
//           <Grid item xs={12} md={6} key={key}>
//             <FormControl fullWidth>
//               <InputLabel>{formatLabel(key)}</InputLabel>
//               <Select name={key} value={value} onChange={handleChange}>
//                 {users.map((u) => (
//                   <MenuItem key={u.id} value={u.id}>
//                   {u.name} {u.firstname} {u.lastname}
//                 </MenuItem>
                  
//                 ))}
//               </Select>
//             </FormControl>
//           </Grid>
//         );
//       }

//       if (key === 'client_id') {
//         return (
        
          
// <Grid container spacing={2} sx={{ margin: '1px' }}>
//   <Grid item xs={12} sm={6}>
//     <FormControl fullWidth>
//       <Autocomplete
//         options={clients}
//         getOptionLabel={(opt) => opt.name || ''}
//         onChange={handleClientSelect}
//         renderInput={(params) => (
//           <TextField
//             {...params}
//             label="Select Client"
//             variant="outlined"
//             fullWidth
//           />
//         )}
//       />
//     </FormControl>
//   </Grid>

//   <Grid item xs={12} sm={6}>
//     <TextField
//       fullWidth
//       label="Client Ref No"
//       name="enquiry_no"
//       variant="outlined"
//       value={formValues.enquiry_no || ''}
//       onChange={handleChange}
//     />
//   </Grid>
// </Grid>



//         );
//       }

//       if (key === 'workflow_id') {
//         return (
//           <Grid item xs={12} key={key}>
//             <FormControl fullWidth>
//               <InputLabel>Select Workflow</InputLabel>
//               <Select name="workflow_id" value={value} onChange={handleChange}>
//                 {workflows.map((wf) => (
//                   <MenuItem key={wf.id} value={wf.id}>{wf.name}</MenuItem>
//                 ))}
//               </Select>
//             </FormControl>
//           </Grid>
//         );
//       }

//       return (
//         <Grid item xs={12} sm={6} key={key}>
//           <TextField
//             fullWidth
//             label={formatLabel(key)}
//             name={key}
//             value={value || ''}
//             onChange={handleChange}
//           />
//         </Grid>
//       );
//     });
//   };

//   const formatLabel = (key) => {
//     const map = {
//       // id: 'Enquiry No',
//       // enquiry_no: 'Client Ref No',
//       enquiry_details: 'Enquiry Details',
//       special_instructions: 'Special Instructions',
//       attach_email: 'Attach Email',
//       attach_supporting_docs: 'Attach Supporting Documents',
//       client_mail_id: 'Client Email',
//       technical_recipient_mail_id: 'Technical By', 
//       technical_approver_mail_id: 'Technical Approver',
//       estimation_recipient_mail_id: 'Estimation by', 
//       estimation_approver_mail_id: 'Estimation Approver', 
//       proposal_creator_mail_id: 'Proposal by',
//       proposal_approver_mail_id: 'Proposal Approver',
//     };
//     return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
//   };

//   return (
//     <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
//       <Typography variant="h5" align="center" gutterBottom>New Enquiry</Typography>
//       <br></br>
//       <form onSubmit={handleSubmit}>
//         <Grid container spacing={2}>
//           {renderFields()}
//           <Grid item xs={12}>
//             <Button type="submit" variant="contained" color="primary" fullWidth>
//               Submit
//             </Button>
//           </Grid>
//         </Grid>
//       </form>
//     </Box>
//   );
// };

// export default NewEnquiryForm;

// Updated NewEnquiryForm.js
import React, { useState, useEffect } from 'react';
import {
  TextField, Button, MenuItem, Typography, Grid, Box, InputLabel, Select,
  FormControl, Autocomplete
} from '@mui/material';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import SecureFileUploader from '../../components/SecureFileUploader'; // ✅ New component

const VISIBLE_FIELDS = [
  'enquiry_details', 'special_instructions',
  'attach_email', 'attach_supporting_docs',
  'technical_submission_date', 'estimation_submission_date', 'proposal_submission_date',
  'technical_recipient_mail_id', 'technical_approver_mail_id',
  'estimation_recipient_mail_id', 'estimation_approver_mail_id',
  'proposal_creator_mail_id', 'proposal_approver_mail_id',
  'client_id'
];

const NewEnquiryForm = ({ onSuccess }) => {
  const [formValues, setFormValues] = useState({
    client_id: '', enquiry_no: '', enquiry_details: '', special_instructions: '',
    technical_no: '', estimation_no: '', proposal_no: '',
    attach_email: '', attach_supporting_docs: '', attach_technical: '', attach_technical_supportings: '',
    attach_estimation: '', attach_estimation_supportings: '', attach_proposal: '', attach_proposal_supportings: '',
    technical_submission_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    estimation_submission_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    proposal_submission_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    technical_comments: '', technical_decision: '', technical_approval_comment: '',
    estimation_comments: '', estimation_approval: '', estimation_approval_comment: '',
    proposal_comments: '', proposal_approval: '', proposal_approval_comments: '',
    initiator_mail_id: '', technical_recipient_mail_id: '', technical_approver_mail_id: '',
    estimation_recipient_mail_id: '', estimation_approver_mail_id: '', proposal_creator_mail_id: '',
    proposal_approver_mail_id: '',
    initiator_id: '', initiator_email: '', recipient: ''
  });

  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [files, setFiles] = useState([]); // ✅ NEW: File state

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [userRes, clientRes, wfRes] = await Promise.all([
          axios.get('/api/users?orgOnly=true', config),
          axios.get('/api/businesspartner', config),
          axios.get('/api/workflows', config)
        ]);

        setUsers(userRes.data || []);
        setClients(clientRes.data || []);
        setWorkflows(wfRes.data || []);

        const user = JSON.parse(localStorage.getItem('user'));
        setFormValues((prev) => ({
          ...prev,
          initiator_id: user?.id || '',
          initiator_email: user?.email || '',
          initiator_mail_id: user?.email || ''
        }));
      } catch (err) {
        console.error('Data fetch error:', err);
        alert('Session expired or unauthorized. Please log in again.');
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'technical_recipient_mail_id' && { recipient: value })
    }));
  };

  const handleDateChange = (name, value) => {
    setFormValues({ ...formValues, [name]: value });
  };

  const handleClientSelect = (e, newClient) => {
    setFormValues({
      ...formValues,
      client_id: newClient?.id || '',
      client_mail_id: newClient?.email || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries({
        ...formValues,
        technical_submission_date: formValues.technical_submission_date?.toISOString(),
        estimation_submission_date: formValues.estimation_submission_date?.toISOString(),
        proposal_submission_date: formValues.proposal_submission_date?.toISOString(),
        status: 'New'
      }).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      files.forEach((file) => {
        formData.append('files', file); // ✅ Append files
      });

      const token = localStorage.getItem('token');
      await axios.post('/api/enquiries/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      alert('Enquiry submitted successfully');
      if (onSuccess) onSuccess();
      setFormValues({});
      setFiles([]); // ✅ Clear files
    } catch (err) {
      console.error(err);
      alert('Submission failed');
    }
  };

  const renderFields = () => {
    return Object.entries(formValues).map(([key, value]) => {
      if (!VISIBLE_FIELDS.includes(key)) return null;

      if (key.endsWith('_date')) {
        return (
          <Grid item xs={12} md={4} key={key}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DesktopDatePicker
                label={formatLabel(key)}
                inputFormat="MM/dd/yyyy"
                value={value || null}
                onChange={(date) => handleDateChange(key, date)}
                renderInput={(params) => <TextField fullWidth {...params} />}
              />
            </LocalizationProvider>
          </Grid>
        );
      }

      if ([
        'technical_recipient_mail_id', 'technical_approver_mail_id',
        'estimation_recipient_mail_id', 'estimation_approver_mail_id',
        'proposal_creator_mail_id', 'proposal_approver_mail_id'
      ].includes(key)) {
        return (
          <Grid item xs={12} md={6} key={key}>
            <FormControl fullWidth>
              <InputLabel>{formatLabel(key)}</InputLabel>
              <Select name={key} value={value} onChange={handleChange}>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name} {u.firstname} {u.lastname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );
      }

      if (key === 'client_id') {
        return (
          <Grid container spacing={2} sx={{ margin: '1px' }} key={key}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <Autocomplete
                  options={clients}
                  getOptionLabel={(opt) => opt.name || ''}
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

      if (key === 'workflow_id') {
        return (
          <Grid item xs={12} key={key}>
            <FormControl fullWidth>
              <InputLabel>Select Workflow</InputLabel>
              <Select name="workflow_id" value={value} onChange={handleChange}>
                {workflows.map((wf) => (
                  <MenuItem key={wf.id} value={wf.id}>
                    {wf.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );
      }

      return (
        <Grid item xs={12} sm={6} key={key}>
          <TextField
            fullWidth
            label={formatLabel(key)}
            name={key}
            value={value || ''}
            onChange={handleChange}
          />
        </Grid>
      );
    });
  };

  const formatLabel = (key) => {
    const map = {
      enquiry_details: 'Enquiry Details',
      special_instructions: 'Special Instructions',
      attach_email: 'Attach Email',
      attach_supporting_docs: 'Attach Supporting Documents',
      client_mail_id: 'Client Email',
      technical_recipient_mail_id: 'Technical By',
      technical_approver_mail_id: 'Technical Approver',
      estimation_recipient_mail_id: 'Estimation by',
      estimation_approver_mail_id: 'Estimation Approver',
      proposal_creator_mail_id: 'Proposal by',
      proposal_approver_mail_id: 'Proposal Approver'
    };
    return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography variant="h5" align="center" gutterBottom>
        New Enquiry
      </Typography>
      <br />
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {renderFields()}
          <Grid item xs={12}>
            <SecureFileUploader files={files} setFiles={setFiles} /> {/* ✅ File upload here */}
          </Grid>
          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Submit
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default NewEnquiryForm;

