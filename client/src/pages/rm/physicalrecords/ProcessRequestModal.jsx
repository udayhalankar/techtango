import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Box, Button, Card, CardContent, Grid, Stack, TextField, Typography,
  IconButton, List, ListItem, Dialog, DialogTitle, DialogContent, DialogActions, ListItemText, 
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { BrowserMultiFormatReader } from "@zxing/browser";


const API_INFO      = (id) => `/api/processing/${id}/info`;
const API_BOX       = (id) => `/api/processing/${id}/validate-box`;
const API_FILE      = (id) => `/api/processing/${id}/validate-file`;
const API_PROCESS   = (id) => `/api/processing/${id}/process-files`;

const authHeaders = () => {
  const t = localStorage.getItem("token") || sessionStorage.getItem("token")
    || (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1]);
  return t ? { Authorization: `Bearer ${t}`, "X-Last-Activity": String(Date.now()) } : {};
};

export default function ProcessRequestModal({ open, row, onClose, onProcessed }) {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null); // {requestId, requestType, tenantName, subDept, pendingCount}
  const [box, setBox] = useState("");
  const [file, setFile] = useState("");
  const [list, setList] = useState([]); // [{fileId, label, boxId}]
  const [scanOpen, setScanOpen] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  
  useEffect(() => {
  if (!scanOpen) return;

  let reader;
  let controls;

  (async () => {
    try {
      // 1) Trigger permission prompt first (gives clearer errors)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // stop temp stream immediately (ZXing will open its own)
      stream.getTracks().forEach(t => t.stop());

      // 2) Start ZXing with rear camera preferred
      reader = new BrowserMultiFormatReader();
      controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        videoRef.current,
        (result, err, c) => {
          if (result) {
            setFile(result.getText());   // <-- your state
            addFile();                   // <-- your existing handler
            setScanOpen(false);
          }
          // ignore err: NotFoundException happens repeatedly while scanning
        }
      );
    } catch (err) {
      console.error("Camera start failed:", err);
      let hint = "Check browser/OS permissions.";
      if (err?.name === "NotAllowedError") hint = "Permission was denied.";
      if (err?.name === "NotFoundError")  hint = "No camera device found.";
      if (err?.name === "NotReadableError") hint = "Camera is in use by another app.";
      if (err?.name === "OverconstrainedError") hint = "Camera constraints not satisfied.";
      alert(`Could not access camera. ${hint}`);
      setScanOpen(false);
    }
  })();

  return () => controls?.stop();
}, [scanOpen]);







  // fetch header info when opened
  useEffect(() => {
    if (!open || !row?.requestId) return;
    let abort = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(API_INFO(row.requestId), { headers: { ...authHeaders() } });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (abort) return;
        setInfo(data);
        setList([]); setBox(""); setFile("");
      } catch (e) {
        console.error(e);
        alert("Failed to load request info.");
        onClose?.();
      } finally {
        setLoading(false);
      }
    })();

    return () => { abort = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.requestId]);

  async function validateBox() {
    if (!box.trim()) return;
    try {
      const res = await fetch(API_BOX(row.requestId), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ barcode: box.trim() })
      });
      const out = await res.json();
      if (!res.ok || out.ok === false) throw new Error(out.error || "Box not valid for this request");
      // keep the box if valid, else clear (the spec says “if unrelated it disappears”)
      setBox(out.canonical || box.trim());
    } catch (e) {
      setBox("");
      alert(e.message);
    }
  }

  async function addFile() {
    const code = file.trim();
    if (!code) return;
    try {
      const res = await fetch(API_FILE(row.requestId), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ barcode: code, boxBarcode: box || null })
      });
      const out = await res.json();
      if (!res.ok || out.ok === false) throw new Error(out.error || "File not valid for this request");

      // prevent duplicates
      setList((prev) => prev.find(f => f.fileId === out.file.fileId) ? prev : [...prev, out.file]);
      setFile("");
    } catch (e) {
      alert(e.message);
      setFile("");
    }
  }

  function removeAt(idx) {
    setList((prev) => prev.filter((_, i) => i !== idx));
  }

  async function processNow() {
    if (!list.length) { alert("Add at least one document."); return; }
    if (!row?.requestId) return;
    try {
      setLoading(true);
      const res = await fetch(API_PROCESS(row.requestId), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ files: list.map(x => x.fileId) })
      });
      const out = await res.json();
      if (!res.ok || out.ok === false) throw new Error(out.error || `HTTP ${res.status}`);

      alert(
        `Processed ${out.processed} file(s).\n` +
        `Request is now: ${out.requestStatus}` +
        (out.deliveryRequestId ? `\nDelivery Request #${out.deliveryRequestId} created.` : "")
      );
      onClose?.();
      onProcessed?.(); // refresh grid
    } catch (e) {
      console.error(e);
      alert(e.message || "Processing failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  // You can remove: if (!open) return null;

return (
  <>
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      keepMounted
      // Don’t set hideBackdrop or disablePortal
      // PaperProps={{ sx: { zIndex: (t) => t.zIndex.modal } }} // optional
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Process Request</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Request Type"
              size="small"
              fullWidth
              value={info?.requestType || ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Request ID"
              size="small"
              fullWidth
              value={info?.requestId ?? String(row?.requestId ?? "")}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Customer (Tenant Name)"
              size="small"
              fullWidth
              value={info?.tenantName || ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Customer Department (Tenant Department)"
              size="small"
              fullWidth
              value={info?.subDept || ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Files pending processing for Request ID"
              size="small"
              fullWidth
              value={info?.pendingCount ?? ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>

          <Grid item xs={12} sm={5.5}>
            <TextField
              label="Box ID"
              size="small"
              fullWidth
              value={box}
              onChange={(e) => setBox(e.target.value)}
              onBlur={validateBox}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  validateBox();
                  fileInputRef.current?.focus();
                }
              }}
              inputProps={{ autoComplete: "off", autoCapitalize: "off", spellCheck: false }}
            />
          </Grid>

          <Grid item xs={12} sm={5.5}>
            <TextField
              label="File ID (Scan Barcode / QR)"
              size="small"
              fullWidth
              value={file}
              inputRef={fileInputRef}
              onChange={(e) => setFile(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  addFile();
                }
              }}
              inputProps={{ autoComplete: "off", autoCapitalize: "off", spellCheck: false }}
            />
          </Grid>

          {/* <Grid item xs={12} sm={1}>
            <Button variant="contained" size="small" onClick={() => setScanOpen(true)} sx={{ height: 40, minWidth: 64 }}>
              Scan
            </Button>
          </Grid> */}

          <Grid item xs={12} sm={1}>
            <Button onClick={addFile} variant="contained" sx={{ height: "100%", minWidth: 0, px: 1.5 }}>
              Add
            </Button>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>Requested Documents</Typography>
            <Box sx={{ border: "1px solid #d9dce5", borderRadius: 1, p: 1, maxHeight: 200, overflow: "auto" }}>
              {list.length === 0 ? (
                <Typography variant="body2" color="text.secondary">None added yet.</Typography>
              ) : (
                <List dense disablePadding>
                  {list.map((f, idx) => (
                    <ListItem
                      key={f.fileId}
                      secondaryAction={
                        <Button size="small" color="error" onClick={() => removeAt(idx)}>Remove</Button>
                      }
                      disableGutters
                    >
                      <ListItemText primary={f.label} secondary={f.boxId ? `Box: ${f.boxId}` : null} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={processNow} disabled={loading}>Process Request</Button>
        <Button onClick={onClose} disabled={loading}>Close</Button>
      </DialogActions>
    </Dialog>

    {/* Scanner dialog stays as a separate Dialog */}
    <Dialog open={scanOpen} onClose={() => setScanOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Scan Barcode / QR</DialogTitle>
      <DialogContent>
        <video ref={videoRef} style={{ width: "100%" }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setScanOpen(false)} size="small">Close</Button>
      </DialogActions>
    </Dialog>
  </>
);

}
