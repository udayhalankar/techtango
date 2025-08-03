import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  MenuItem,
  Typography,
  Grid,
  Box,
  InputLabel,
  Select,
  FormControl,
  FormHelperText
} from '@mui/material';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const NewEnquiryForm = () => {
  const [formValues, setFormValues] = useState({
    enquiryNo: '',
    enquiryDetails: '',
    specialInstructions: '',
    technicalSubmissionDate: null,
    estimationSubmissionDate: null,
    proposalSubmissionDate: null,
    workflowId: '',
  });

  const [workflows, setWorkflows] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function fetchWorkflows() {
      const response = await axios.get('/api/workflows');
      setWorkflows(response.data || [
        { id: 1, name: 'Standard Approval Flow' },
        { id: 2, name: 'Fast Track Workflow' }
      ]);
    }
    fetchWorkflows();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const handleDateChange = (name, value) => {
    setFormValues({ ...formValues, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formValues,
        technicalSubmissionDate: formValues.technicalSubmissionDate?.toISOString(),
        estimationSubmissionDate: formValues.estimationSubmissionDate?.toISOString(),
        proposalSubmissionDate: formValues.proposalSubmissionDate?.toISOString(),
        status: 'New'
      };
      await axios.post('/api/cases', payload);
      alert('Enquiry submitted successfully');
      setFormValues({
        enquiryNo: '',
        enquiryDetails: '',
        specialInstructions: '',
        technicalSubmissionDate: null,
        estimationSubmissionDate: null,
        proposalSubmissionDate: null,
        workflowId: ''
      });
      setErrors({});
    } catch (err) {
      console.error(err);
      alert('Submission failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" color="error" align="center" gutterBottom>
        New Enquiry
      </Typography>
      <form onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Enquiry No"
              name="enquiryNo"
              value={formValues.enquiryNo}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Enquiry Details"
              name="enquiryDetails"
              value={formValues.enquiryDetails}
              onChange={handleChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Special Instructions"
              name="specialInstructions"
              value={formValues.specialInstructions}
              onChange={handleChange}
            />
          </Grid>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} md={4}>
              <DesktopDatePicker
                label="Technical Submission Date"
                inputFormat="MM/dd/yyyy"
                value={formValues.technicalSubmissionDate}
                onChange={(date) => handleDateChange('technicalSubmissionDate', date)}
                renderInput={(params) => <TextField fullWidth {...params} />}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <DesktopDatePicker
                label="Estimation Submission Date"
                inputFormat="MM/dd/yyyy"
                value={formValues.estimationSubmissionDate}
                onChange={(date) => handleDateChange('estimationSubmissionDate', date)}
                renderInput={(params) => <TextField fullWidth {...params} />}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <DesktopDatePicker
                label="Proposal Submission Date"
                inputFormat="MM/dd/yyyy"
                value={formValues.proposalSubmissionDate}
                onChange={(date) => handleDateChange('proposalSubmissionDate', date)}
                renderInput={(params) => <TextField fullWidth {...params} />}
              />
            </Grid>
          </LocalizationProvider>

          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Select Approval Workflow</InputLabel>
              <Select
                name="workflowId"
                value={formValues.workflowId}
                onChange={handleChange}
              >
                {workflows.map((wf) => (
                  <MenuItem key={wf.id} value={wf.id}>{wf.name}</MenuItem>
                ))}
              </Select>
              {errors.workflowId && <FormHelperText>{errors.workflowId}</FormHelperText>}
            </FormControl>
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
