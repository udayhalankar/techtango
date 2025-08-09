// components/SecureFileUploader.js
import React from 'react';
import {
  Box, Typography, Button, List, ListItem, ListItemText, IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const SecureFileUploader = ({ files, setFiles, multiple = true }) => {
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const filtered = selected.filter(file =>
      !files.some(existing => existing.name === file.name && existing.size === file.size)
    );
    setFiles(multiple ? [...files, ...filtered] : filtered);
  };

  const handleRemove = (index) => {
    const updated = [...files];
    updated.splice(index, 1);
    setFiles(updated);
  };

  return (
    <Box mt={2}>
      <Typography variant="subtitle1" gutterBottom>
        Upload Files
      </Typography>

      <Button variant="outlined" component="label">
        Select File(s)
        <input type="file" hidden multiple={multiple} onChange={handleFileChange} />
      </Button>

      {files.length > 0 && (
        <List dense sx={{ mt: 1 }}>
          {files.map((file, idx) => (
            <ListItem
              key={idx}
              secondaryAction={
                <IconButton edge="end" onClick={() => handleRemove(idx)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={file.name} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default SecureFileUploader;
