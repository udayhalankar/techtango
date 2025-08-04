import React, { useState, useEffect } from 'react';
import { Button, Box, Typography } from '@mui/material';
import CreateWorkflowModal from './CreateWorkflowModal';
import axios from 'axios';

const WorkflowManager = () => {
  const [workflows, setWorkflows] = useState([]);
  const [openModal, setOpenModal] = useState(false);

  const fetchWorkflows = async () => {
    try {
      const res = await axios.get('/api/workflows');
      setWorkflows(res.data);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <Box p={4}>
      <Typography variant="h5">Workflows</Typography>
      <Button variant="contained" onClick={() => setOpenModal(true)} sx={{ my: 2 }}>
        Create Workflow
      </Button>

      {/* List workflows */}
      {workflows.map((wf) => (
        <Box key={wf.id} mb={2} p={2} border="1px solid #ccc" borderRadius={2}>
          <Typography variant="h6">{wf.name}</Typography>
        </Box>
      ))}

      {/* Modal (no outer <Modal>) */}
      <CreateWorkflowModal
        open={openModal}
        handleClose={() => setOpenModal(false)}
        handleSave={async (workflowData) => {
          try {
            await axios.post('/api/workflows', workflowData);
            setOpenModal(false);
            fetchWorkflows();
          } catch (err) {
            console.error('Error saving workflow:', err);
          }
        }}
      />
    </Box>
  );
};

export default WorkflowManager;
