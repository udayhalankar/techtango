// src/pages/physicalrecords/MaterialRequest.jsx
import React, { useState, useEffect } from "react";
import {
  Box, Card, CardActionArea, CardContent, Grid, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack
} from "@mui/material";
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import LeftMenu from "../../../components/rmsMenu/RmsMenu";


const NAVBAR_H = 66;           // keep in sync with your layout
const SIDENAV_W = 232;

const CARDS = [
  { key: "File ID Request", title: "File ID Request", subtitle: "Submit Request for File ID Stickers", Icon: InsertDriveFileOutlinedIcon },
  { key: "Bin ID Request",  title: "Bin ID Request",  subtitle: "Submit Request for Bin ID Stickers", Icon: Inventory2OutlinedIcon },
  { key: "Bin Request",     title: "Bin Request",     subtitle: "Submit Request for File Storage Bins", Icon: ArchiveOutlinedIcon },
];

const qtyOptions = [25, 50, 100, 200, 500];


const authHeaders = () => {
  const t = localStorage.getItem("token")
        || sessionStorage.getItem("token")
        || (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1] ?? "");
  return t ? { Authorization: `Bearer ${t}`, "X-Last-Activity": String(Date.now()) } : {};
};




export default function MaterialRequest() {
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [quantity, setQuantity] = useState(0); // keep numeric
  const [instructions, setInstructions] = useState("");
  const [profile, setProfile] = useState(null);

  const handleOpen = (type) => {
    setRequestType(type);
    setQuantity("");
    setInstructions("");
    setOpen(true);
  };


  

  const handleSubmit = async () => {
   const qty = Number(quantity);
   if (!Number.isFinite(qty) || qty <= 0) {
     alert("Please select a quantity.");
     return;
   }
    try {
      const res = await fetch("/api/rmrequest/material", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          requestType,                // "File ID Request" | "Bin ID Request" | "Bin Request"
          quantity: qty, // required
          instructions: instructions || null,
        }),
      });
      const out = await res.json();
      if (!res.ok || out?.ok === false) throw new Error(out?.error || `HTTP ${res.status}`);
      alert(`Request #${out.id} created successfully.`);
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to create request");
    }
  };

  // reuse your existing authHeaders()
useEffect(() => {
  let abort = false;
  (async () => {
    try {
      const res = await fetch("/api/rmrequest/me", { headers: { "Content-Type": "application/json", ...authHeaders() } });
      const j = await res.json();
      if (!abort && j?.ok) setProfile(j.profile);
    } catch (e) {
      console.error("profile load failed", e);
    }
  })();
  return () => { abort = true; };
}, []);
  
  

  return (
    <Box sx={{ display: "flex" }}>
      {/* Left Menu */}
      <LeftMenu width={SIDENAV_W} offsetTop={NAVBAR_H} />

      {/* Content */}
      <Box
        sx={{
          position: "fixed", top: NAVBAR_H, left: SIDENAV_W, right: 0, bottom: 0,
          overflowY: "auto", p: 2,
        }}
      >
        <Typography variant="h5" sx={{ color: "#f0772c", mb: 3 }}>
          Submit Material Request
        </Typography>

        {/* 3) Replace the Grid section that renders the three cards */}
            <Grid container spacing={3} justifyContent="left" sx={{ mt: 6 }}>
            {CARDS.map(({ key, title, subtitle, Icon }) => (
                <Grid item key={key}>
                {/* ~30% smaller than before + centered */}
                <Card variant="outlined" sx={{ width: 260, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CardActionArea sx={{ height: '100%' }} onClick={() => handleOpen(key)}>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Icon sx={{ fontSize: 42, mb: 1, color: 'text.secondary' }} />
                        <Typography variant="subtitle1" sx={{ mb: 0.5 }}>{title}</Typography>
                        <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
                    </CardContent>
                    </CardActionArea>
                </Card>
                </Grid>
            ))}
            </Grid>

        {/* Modal */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Submit Material Request</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1}>
              <Typography variant="body2"><b>Tenant:</b> {profile?.tenantName || "—"}</Typography>
                <Typography variant="body2"><b>Requestor Name:</b> {profile?.name || "—"}</Typography>
                <Typography variant="body2"><b>Requestor Dept.:</b> {profile?.department || "—"}</Typography>
                <Typography variant="body2"><b>Request Category:</b> Material Request</Typography>
                <Typography variant="body2"><b>Request Type:</b> {requestType}</Typography>

              <TextField
                select
                label="Quantity *"
                value={quantity || 0}
                onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                size="small"
                sx={{ mt: 1, maxWidth: 220 }}
              >
                <MenuItem value={0} disabled><em>Select…</em></MenuItem>
                {qtyOptions.map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
              </TextField>

              <TextField
                label="Instructions (optional)"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                size="small"
                multiline minRows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Close</Button>
            <Button variant="contained" onClick={handleSubmit}>Submit Request</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
