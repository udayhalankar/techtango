// components/SimpleModalWithCheckboxes.js
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Checkbox, FormControlLabel, Typography, Box
} from '@mui/material';

const SimpleModalWithCheckboxes = ({ open, onClose }) => {
  const [options, setOptions] = useState([
    { label: 'Option A', checked: false },
    { label: 'Option B', checked: false },
    { label: 'Option C', checked: false },
  ]);

  const handleToggle = (index) => {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === index ? { ...opt, checked: !opt.checked } : opt
      )
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>🧪 Choose Options</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>Select your preferences:</Typography>
        <Box>
          {options.map((opt, i) => (
            <FormControlLabel
              key={i}
              control={
                <Checkbox
                  checked={opt.checked}
                  onChange={() => handleToggle(i)}
                />
              }
              label={opt.label}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SimpleModalWithCheckboxes;
