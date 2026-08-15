import React from "react";
import { Box, Divider, Grid, Typography } from "@mui/material";


export default function ViewDetails({ row, onClose }) {
if (!row) return null;
return (
<Box>
<Typography variant="h6" gutterBottom>Details: {row.fileId}</Typography>
<Divider sx={{ mb: 2 }} />


<Grid container spacing={2}>
<Grid item xs={12} md={6}>
<Typography variant="subtitle2">General</Typography>
<Typography variant="body2">Object ID: {row.objectId}</Typography>
<Typography variant="body2">Owner: {row.owner}</Typography>
<Typography variant="body2">Date Created: {row.dateCreated}</Typography>
<Typography variant="body2">Last Modified: {row.lastModified}</Typography>
</Grid>
<Grid item xs={12} md={6}>
<Typography variant="subtitle2">Category Attributes</Typography>
<Typography variant="body2">Category: {row.category}</Typography>
<Typography variant="body2">Period: {row.period}</Typography>
</Grid>
<Grid item xs={12}>
<Typography variant="subtitle2" sx={{ mt: 2 }}>Records Mgmt</Typography>
<Typography variant="body2">Records Manager: {row.recordsManager}</Typography>
<Typography variant="body2">Classification: {row.recordsClassification}</Typography>
</Grid>
</Grid>
</Box>
);
}