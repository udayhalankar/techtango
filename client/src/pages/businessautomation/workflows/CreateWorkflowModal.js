//src/pages/workflows/createworkflowmodals.js
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, MenuItem, Select, InputLabel, FormControl,
  FormControlLabel, Checkbox, OutlinedInput, Chip, Box
} from '@mui/material';
import api from '../../../services/api';

const ACTION_OPTIONS = ['submit', 'approve', 'reject', 'refer'];
const STATUS_OPTIONS = [
  'New',
  'Technical Submitted',
  'Technical Approved',
  'Estimation Submitted',
  'Estimation Approved',
  'Proposal Submitted',
  'Proposal Approved'
];

const CreateWorkflowModal = ({ open, onClose }) => {
  const [workflowName, setWorkflowName] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [forms, setForms] = useState([]);
  const [steps, setSteps] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsersAndForms = async () => {
      const [userRes, formRes] = await Promise.all([
        api.get('/users/org?includeSelf=true'),
        api.get('/form_templates')
      ]);
      setUsers(userRes.data);
      setForms(formRes.data);
    };
    fetchUsersAndForms();

    const defaultStart = {
      stepName: 'Start Step',
      actionType: 'submit',
      assignedUser: '',
      notify: false,
      ccList: [],
      status: 'New',
      isStart: true,
      isEnd: false
    };

    const defaultEnd = {
      stepName: 'End Workflow Step',
      actionType: '',
      assignedUser: '',
      notify: false,
      ccList: [],
      status: '',
      isStart: false,
      isEnd: true
    };

    setSteps([defaultStart, defaultEnd]);
  }, []);

  const handleStepChange = (index, field, value) => {
    const updated = [...steps];
    const originalStep = { ...updated[index] };
    updated[index][field] = value;

    if (field === 'actionType') {
      if (originalStep.actionType === 'refer' && value !== 'refer') {
        const returnIndex = index + 1;
        const resumedIndex = index + 2;
        if (steps[returnIndex]?.actionType === 'returnback') {
          updated.splice(returnIndex, 2);
        }
        updated[index].status = '';
        setSteps(updated);
        return;
      }

      if (value === 'refer') {
        const returnStep = {
          stepName: 'Return Step',
          actionType: 'returnback',
          assignedUser: originalStep.assignedUser,
          notify: false,
          ccList: [],
          status: 'Refer',
          isReturnback: true
        };

        const resumedStep = {
          stepName: originalStep.stepName,
          actionType: '',
          assignedUser: '',
          notify: false,
          ccList: [],
          status: '',
          isStart: false,
          isEnd: false
        };

        const newSteps = [
          ...updated.slice(0, index + 1),
          returnStep,
          resumedStep,
          ...updated.slice(index + 1)
        ];
        setSteps(newSteps);
        return;
      }
    }

    setSteps(updated);
  };

  const addStep = () => {
    const newStep = {
      stepName: '',
      actionType: '',
      assignedUser: '',
      notify: false,
      ccList: [],
      status: '',
      isStart: false,
      isEnd: false
    };
    const updated = [...steps];
    updated.splice(steps.length - 1, 0, newStep);
    setSteps(updated);
  };

  const removeStep = (index) => {
    const updated = [...steps];
    updated.splice(index, 1);
    setSteps(updated);
  };

  const handleSubmit = () => {
    const final = { name: workflowName, formId: selectedForm, steps };
    console.log(final);
    onClose();
  };

  const getUserOptions = () =>
    users.map((u) => (
      <MenuItem key={u.id} value={u.id}>
        {u.firstname} {u.lastname}
      </MenuItem>
    ));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>Create Approval Workflow</DialogTitle>
      <DialogContent dividers>
        <FormControl fullWidth margin="normal">
          <InputLabel>Select Form</InputLabel>
          <Select
            value={selectedForm}
            onChange={(e) => setSelectedForm(e.target.value)}
            label="Select Form"
          >
            {forms.map((form) => (
              <MenuItem key={form.id} value={form.id}>{form.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Workflow Name"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          margin="normal"
        />

        {steps.map((step, i) => (
          <Grid container spacing={2} key={i} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={2}>
              <TextField
                label="Step Name"
                value={step.stepName}
                onChange={(e) => handleStepChange(i, 'stepName', e.target.value)}
                disabled={step.isStart || step.isEnd || step.isReturnback}
                fullWidth
              />
            </Grid>

            <Grid item xs={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={step.actionType === 'refer' ? 'Refer' : (step.status || '')}
                  onChange={(e) => handleStepChange(i, 'status', e.target.value)}
                  disabled={step.actionType === 'refer'}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {!step.isEnd && (
              <>
                <Grid item xs={2}>
                  <FormControl fullWidth>
                    <InputLabel>Action Type</InputLabel>
                    <Select
                      value={step.actionType || ''}
                      onChange={(e) => handleStepChange(i, 'actionType', e.target.value)}
                      disabled={step.isStart || step.isReturnback}
                    >
                      {ACTION_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {!step.isReturnback && (
                  <Grid item xs={2}>
                    <FormControl fullWidth>
                      <InputLabel>Assigned User</InputLabel>
                      <Select
                        value={step.assignedUser || ''}
                        onChange={(e) => handleStepChange(i, 'assignedUser', e.target.value)}
                      >
                        {getUserOptions()}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {['approve', 'reject'].includes(step.actionType) && (
                  <>
                    <Grid item xs={2}>
                      <FormControl fullWidth>
                        <InputLabel>Action on</InputLabel>
                        <Select
                          value={step.secondaryAction || ''}
                          onChange={(e) => handleStepChange(i, 'secondaryAction', e.target.value)}
                        >
                          {step.actionType === 'approve'
                            ? <MenuItem value="reject">reject</MenuItem>
                            : <MenuItem value="accept">accept</MenuItem>}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={2}>
                      <FormControl fullWidth>
                        <InputLabel>Assigned User ({step.secondaryAction})</InputLabel>
                        <Select
                          value={step.assignedUser2 || ''}
                          onChange={(e) => handleStepChange(i, 'assignedUser2', e.target.value)}
                        >
                          {getUserOptions()}
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}

                {!step.isReturnback && (
                  <>
                    <Grid item xs={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={step.notify || false}
                            onChange={(e) => handleStepChange(i, 'notify', e.target.checked)}
                          />
                        }
                        label="Notify"
                      />
                    </Grid>

                    <Grid item xs={3}>
                      <FormControl fullWidth>
                        <InputLabel>CC</InputLabel>
                        <Select
                          multiple
                          value={step.ccList || []}
                          onChange={(e) => handleStepChange(i, 'ccList', e.target.value)}
                          input={<OutlinedInput label="CC" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => {
                                const user = users.find((u) => u.id === value);
                                return <Chip key={value} label={user ? `${user.firstname} ${user.lastname}` : value} />;
                              })}
                            </Box>
                          )}
                        >
                          {users.map((user) => (
                            <MenuItem
                              key={user.id}
                              value={user.id}
                              disabled={user.id === step.assignedUser || user.id === step.assignedUser2}
                            >
                              {user.firstname} {user.lastname}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}
              </>
            )}

            <Grid item xs={1}>
              {!step.isStart && !step.isEnd && !step.isReturnback && (
                <Button onClick={() => removeStep(i)} variant="outlined" color="error">
                  Remove
                </Button>
              )}
            </Grid>
          </Grid>
        ))}

        <Button onClick={addStep} variant="outlined" sx={{ mt: 1 }}>
          + Add Step
        </Button>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">Save Workflow</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateWorkflowModal;


// import React, { useState, useEffect } from 'react';
// import {
//   Dialog, DialogTitle, DialogContent, DialogActions,
//   Button, TextField, Grid, MenuItem, Select, InputLabel, FormControl, FormControlLabel, Checkbox
// } from '@mui/material';
// import api from '../../services/api';

// const ACTION_OPTIONS = ['submit', 'approve', 'reject', 'refer'];

// const CreateWorkflowModal = ({ open, onClose }) => {
//   const [workflowName, setWorkflowName] = useState('');
//   const [steps, setSteps] = useState([]);
//   const [users, setUsers] = useState([]);

//   useEffect(() => {
//     const fetchUsers = async () => {
//       const res = await api.get('/users/org?includeSelf=true');
//       setUsers(res.data);
//     };
//     fetchUsers();

//     const defaultStart = {
//       stepName: 'Start Step',
//       actionType: 'submit',
//       assignedUser: '',
//       notify: false,
//       ccList: '',
//       isStart: true,
//       isEnd: false
//     };

//     const defaultEnd = {
//       stepName: 'End Workflow Step',
//       actionType: '',
//       assignedUser: '',
//       notify: false,
//       ccList: '',
//       isStart: false,
//       isEnd: true
//     };

//     setSteps([defaultStart, defaultEnd]);
//   }, []);

//   const handleStepChange = (index, field, value) => {
//     const updated = [...steps];
//     const originalStep = { ...updated[index] };
//     updated[index][field] = value;

//     if (field === 'actionType' && originalStep.actionType === 'refer' && value !== 'refer') {
//       const returnIndex = index + 1;
//       const resumedIndex = index + 2;
//       if (steps[returnIndex]?.actionType === 'returnback') {
//         updated.splice(returnIndex, 2);
//       }
//       setSteps(updated);
//       return;
//     }

//     if (field === 'actionType' && value === 'refer') {
//       const returnStep = {
//         stepName: 'Return Step',
//         actionType: 'returnback',
//         assignedUser: originalStep.assignedUser,
//         notify: false,
//         ccList: '',
//         isReturnback: true
//       };

//       const resumedStep = {
//         stepName: originalStep.stepName,
//         actionType: '',
//         assignedUser: '',
//         notify: false,
//         ccList: '',
//         isStart: false,
//         isEnd: false
//       };

//       const newSteps = [
//         ...updated.slice(0, index + 1),
//         returnStep,
//         resumedStep,
//         ...updated.slice(index + 1)
//       ];

//       setSteps(newSteps);
//       return;
//     }

//     setSteps(updated);
//   };

//   const addStep = () => {
//     const newStep = {
//       stepName: '',
//       actionType: '',
//       assignedUser: '',
//       notify: false,
//       ccList: '',
//       isStart: false,
//       isEnd: false
//     };
//     const updated = [...steps];
//     updated.splice(steps.length - 1, 0, newStep);
//     setSteps(updated);
//   };

//   const removeStep = (index) => {
//     const updated = [...steps];
//     updated.splice(index, 1);
//     setSteps(updated);
//   };

//   const handleSubmit = () => {
//     const final = { name: workflowName, steps };
//     console.log(final);
//     onClose();
//   };

//   const getUserOptions = () =>
//     users.map((u) => (
//       <MenuItem key={u.id} value={u.id}>
//         {u.firstname} {u.lastname}
//       </MenuItem>
//     ));

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
//       <DialogTitle>Create Approval Workflow</DialogTitle>
//       <DialogContent dividers>
//         <TextField
//           fullWidth
//           label="Workflow Name"
//           value={workflowName}
//           onChange={(e) => setWorkflowName(e.target.value)}
//           margin="normal"
//         />

//         {steps.map((step, i) => (
//           <Grid container spacing={2} key={i} alignItems="center" sx={{ mb: 2 }}>
//             <Grid item xs={2}>
//               <TextField
//                 label="Step Name"
//                 value={step.stepName}
//                 onChange={(e) => handleStepChange(i, 'stepName', e.target.value)}
//                 disabled={step.isStart || step.isEnd || step.isReturnback}
//                 fullWidth
//               />
//             </Grid>

//             {!step.isEnd && (
//               <>
//                 <Grid item xs={2}>
//                   <FormControl fullWidth>
//                     <InputLabel>Action Type</InputLabel>
//                     <Select
//                       value={step.actionType || ''}
//                       onChange={(e) => handleStepChange(i, 'actionType', e.target.value)}
//                       disabled={step.isStart || step.isReturnback}
//                     >
//                       {ACTION_OPTIONS.map((opt) => (
//                         <MenuItem key={opt} value={opt}>{opt}</MenuItem>
//                       ))}
//                     </Select>
//                   </FormControl>
//                 </Grid>

//                 {!step.isReturnback && (
//                   <Grid item xs={2}>
//                     <FormControl fullWidth>
//                       <InputLabel>Assigned User</InputLabel>
//                       <Select
//                         value={step.assignedUser || ''}
//                         onChange={(e) => handleStepChange(i, 'assignedUser', e.target.value)}
//                       >
//                         {getUserOptions()}
//                       </Select>
//                     </FormControl>
//                   </Grid>
//                 )}

//                 {['approve', 'reject'].includes(step.actionType) && (
//                   <>
//                     <Grid item xs={2}>
//                       <FormControl fullWidth>
//                         <InputLabel>Action on</InputLabel>
//                         <Select
//                           value={step.secondaryAction || ''}
//                           onChange={(e) => handleStepChange(i, 'secondaryAction', e.target.value)}
//                         >
//                           {step.actionType === 'approve'
//                             ? <MenuItem value="reject">reject</MenuItem>
//                             : <MenuItem value="accept">accept</MenuItem>}
//                         </Select>
//                       </FormControl>
//                     </Grid>

//                     <Grid item xs={2}>
//                       <FormControl fullWidth>
//                         <InputLabel>Assigned User ({step.secondaryAction})</InputLabel>
//                         <Select
//                           value={step.assignedUser2 || ''}
//                           onChange={(e) => handleStepChange(i, 'assignedUser2', e.target.value)}
//                         >
//                           {getUserOptions()}
//                         </Select>
//                       </FormControl>
//                     </Grid>
//                   </>
//                 )}

//                 {!step.isReturnback && (
//                   <>
//                     <Grid item xs={2}>
//                       <FormControlLabel
//                         control={
//                           <Checkbox
//                             checked={step.notify || false}
//                             onChange={(e) => handleStepChange(i, 'notify', e.target.checked)}
//                           />
//                         }
//                         label="Notify"
//                       />
//                     </Grid>

//                     <Grid item xs={2}>
//                       <TextField
//                         label="CC (comma-separated)"
//                         value={step.ccList || ''}
//                         onChange={(e) => handleStepChange(i, 'ccList', e.target.value)}
//                         fullWidth
//                       />
//                     </Grid>
//                   </>
//                 )}
//               </>
//             )}

//             <Grid item xs={1}>
//               {!step.isStart && !step.isEnd && !step.isReturnback && (
//                 <Button onClick={() => removeStep(i)} variant="outlined" color="error">
//                   Remove
//                 </Button>
//               )}
//             </Grid>
//           </Grid>
//         ))}

//         <Button onClick={addStep} variant="outlined" sx={{ mt: 1 }}>
//           + Add Step
//         </Button>
//       </DialogContent>

//       <DialogActions>
//         <Button onClick={onClose}>Cancel</Button>
//         <Button onClick={handleSubmit} variant="contained">Save Workflow</Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default CreateWorkflowModal;
// //Working Code 2

// import React, { useState, useEffect } from 'react';
// import {
//   Dialog, DialogTitle, DialogContent, DialogActions,
//   Button, TextField, Grid, MenuItem, Select, InputLabel, FormControl
// } from '@mui/material';
// import api from '../../services/api';

// const ACTION_OPTIONS = ['submit', 'approve', 'reject', 'refer'];

// const CreateWorkflowModal = ({ open, onClose }) => {
//   const [workflowName, setWorkflowName] = useState('');
//   const [steps, setSteps] = useState([]);
//   const [users, setUsers] = useState([]);

//   useEffect(() => {
//     const fetchUsers = async () => {
//       const res = await api.get('/users/org?includeSelf=true');
//       setUsers(res.data);
//     };
//     fetchUsers();

//     const defaultStart = {
//       stepName: 'Start Step',
//       actionType: 'submit',
//       assignedUser: '',
//       sendEmailTo: '',
//       ccList: '',
//       isStart: true,
//       isEnd: false
//     };

//     const defaultEnd = {
//       stepName: 'End Workflow Step',
//       actionType: '',
//       assignedUser: '',
//       sendEmailTo: '',
//       ccList: '',
//       isStart: false,
//       isEnd: true
//     };

//     setSteps([defaultStart, defaultEnd]);
//   }, []);

//   const handleStepChange = (index, field, value) => {
//     const updated = [...steps];
//     const originalStep = { ...updated[index] };
//     updated[index][field] = value;

//     // Clean up if switching away from refer
//     if (field === 'actionType' && originalStep.actionType === 'refer' && value !== 'refer') {
//       const returnIndex = index + 1;
//       const resumedIndex = index + 2;
//       if (steps[returnIndex]?.actionType === 'returnback') {
//         updated.splice(returnIndex, 2);
//       }
//       setSteps(updated);
//       return;
//     }

//     // Handle refer logic
//     if (field === 'actionType' && value === 'refer') {
//       const returnStep = {
//         stepName: 'Return Step',
//         actionType: 'returnback',
//         assignedUser: originalStep.assignedUser,
//         sendEmailTo: '',
//         ccList: '',
//         isReturnback: true
//       };

//       const resumedStep = {
//         stepName: originalStep.stepName,
//         actionType: '',
//         assignedUser: '',
//         sendEmailTo: '',
//         ccList: '',
//         isStart: false,
//         isEnd: false
//       };

//       const newSteps = [
//         ...updated.slice(0, index + 1),
//         returnStep,
//         resumedStep,
//         ...updated.slice(index + 1)
//       ];

//       setSteps(newSteps);
//       return;
//     }

//     setSteps(updated);
//   };

//   const addStep = () => {
//     const newStep = {
//       stepName: '',
//       actionType: '',
//       assignedUser: '',
//       sendEmailTo: '',
//       ccList: '',
//       isStart: false,
//       isEnd: false
//     };
//     const updated = [...steps];
//     updated.splice(steps.length - 1, 0, newStep);
//     setSteps(updated);
//   };

//   const removeStep = (index) => {
//     const updated = [...steps];
//     updated.splice(index, 1);
//     setSteps(updated);
//   };

//   const handleSubmit = () => {
//     const final = { name: workflowName, steps };
//     console.log(final);
//     onClose();
//   };

//   const getUserOptions = () =>
//     users.map((u) => (
//       <MenuItem key={u.id} value={u.id}>
//         {u.firstname} {u.lastname}
//       </MenuItem>
//     ));

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
//       <DialogTitle>Create Approval Workflow</DialogTitle>
//       <DialogContent dividers>
//         <TextField
//           fullWidth
//           label="Workflow Name"
//           value={workflowName}
//           onChange={(e) => setWorkflowName(e.target.value)}
//           margin="normal"
//         />

//         {steps.map((step, i) => (
//           <Grid container spacing={2} key={i} alignItems="center" sx={{ mb: 2 }}>
//             <Grid item xs={2}>
//               <TextField
//                 label="Step Name"
//                 value={step.stepName}
//                 onChange={(e) => handleStepChange(i, 'stepName', e.target.value)}
//                 disabled={step.isStart || step.isEnd || step.isReturnback}
//                 fullWidth
//               />
//             </Grid>

//             {!step.isEnd && (
//               <>
//                 <Grid item xs={2}>
//                   <FormControl fullWidth>
//                     <InputLabel>Action Type</InputLabel>
//                     <Select
//                       value={step.actionType || ''}
//                       onChange={(e) => handleStepChange(i, 'actionType', e.target.value)}
//                       disabled={step.isStart || step.isReturnback}
//                     >
//                       {ACTION_OPTIONS.map((opt) => (
//                         <MenuItem key={opt} value={opt}>{opt}</MenuItem>
//                       ))}
//                     </Select>
//                   </FormControl>
//                 </Grid>

//                 {/* Assigned User */}
//                 {!step.isReturnback && (
//                   <Grid item xs={2}>
//                     <FormControl fullWidth>
//                       <InputLabel>Assigned User</InputLabel>
//                       <Select
//                         value={step.assignedUser || ''}
//                         onChange={(e) => handleStepChange(i, 'assignedUser', e.target.value)}
//                       >
//                         {getUserOptions()}
//                       </Select>
//                     </FormControl>
//                   </Grid>
//                 )}

//                 {/* approve/reject → show secondary action and user */}
//                 {['approve', 'reject'].includes(step.actionType) && (
//                   <>
//                     <Grid item xs={2}>
//                       <FormControl fullWidth>
//                         <InputLabel>Action on</InputLabel>
//                         <Select
//                           value={step.secondaryAction || ''}
//                           onChange={(e) => handleStepChange(i, 'secondaryAction', e.target.value)}
//                         >
//                           {step.actionType === 'approve'
//                             ? <MenuItem value="reject">reject</MenuItem>
//                             : <MenuItem value="accept">accept</MenuItem>}
//                         </Select>
//                       </FormControl>
//                     </Grid>

//                     <Grid item xs={2}>
//                       <FormControl fullWidth>
//                         <InputLabel>Assigned User ({step.secondaryAction})</InputLabel>
//                         <Select
//                           value={step.assignedUser2 || ''}
//                           onChange={(e) => handleStepChange(i, 'assignedUser2', e.target.value)}
//                         >
//                           {getUserOptions()}
//                         </Select>
//                       </FormControl>
//                     </Grid>
//                   </>
//                 )}

//                 {!step.isReturnback && (
//                   <>
//                     <Grid item xs={2}>
//                       <TextField
//                         label="Send Email To"
//                         value={step.sendEmailTo || ''}
//                         onChange={(e) => handleStepChange(i, 'sendEmailTo', e.target.value)}
//                         fullWidth
//                       />
//                     </Grid>

//                     <Grid item xs={2}>
//                       <TextField
//                         label="CC (comma-separated)"
//                         value={step.ccList || ''}
//                         onChange={(e) => handleStepChange(i, 'ccList', e.target.value)}
//                         fullWidth
//                       />
//                     </Grid>
//                   </>
//                 )}
//               </>
//             )}

//             <Grid item xs={1}>
//               {!step.isStart && !step.isEnd && !step.isReturnback && (
//                 <Button onClick={() => removeStep(i)} variant="outlined" color="error">
//                   Remove
//                 </Button>
//               )}
//             </Grid>
//           </Grid>
//         ))}

//         <Button onClick={addStep} variant="outlined" sx={{ mt: 1 }}>
//           + Add Step
//         </Button>
//       </DialogContent>

//       <DialogActions>
//         <Button onClick={onClose}>Cancel</Button>
//         <Button onClick={handleSubmit} variant="contained">Save Workflow</Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default CreateWorkflowModal;
// //Working Code1


