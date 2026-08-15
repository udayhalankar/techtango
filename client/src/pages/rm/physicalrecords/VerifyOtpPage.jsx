import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, TextField, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const authHeaders = () => {
  const t = localStorage.getItem("token") || sessionStorage.getItem("token")
    || (document.cookie.match(/(?:^|;\\s*)token=([^;]+)/)?.[1]);
  return t ? { Authorization: `Bearer ${t}`, "X-Last-Activity": String(Date.now()) } : {};
};

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [assignmentId, setAssignmentId] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("assignment");
    if (id) setAssignmentId(String(id));
  }, [location.search]);

  async function submitOtp() {
    if (!assignmentId || !otp) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rmassignments/${assignmentId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ otp }),
      });
      const out = await res.json();
      if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
      setDoneOpen(true);
    } catch (e) {
      alert("Invalid OTP or verification failed.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  function closeAndGoBack() {
    setDoneOpen(false);
    navigate("/", { replace: true });           // or navigate("/processrequest")
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f7fb", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Card sx={{ width: 360 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: "#333" }}>Verify OTP</Typography>
          <TextField
            label="Assignment ID"
            size="small"
            fullWidth
            margin="dense"
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
          />
          <TextField
            label="OTP"
            size="small"
            fullWidth
            margin="dense"
            inputProps={{ inputMode: "numeric", pattern: "\\d{4,8}" }}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <Button
            onClick={submitOtp}
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={busy || !assignmentId || !otp}
          >
            {busy ? "Verifying..." : "Verify"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={doneOpen} onClose={closeAndGoBack}>
        <DialogTitle>OTP Accepted</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Thank you. The assignment has been marked <b>Accepted</b>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAndGoBack} variant="contained" size="small">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
