// src/pages/physicalrecords/ProcessMaterialReqModal.jsx
import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Stack, TextField, Button
} from "@mui/material";

const authHeaders = () => {
  const t =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1] ?? "");
  return t ? { Authorization: `Bearer ${t}`, "X-Last-Activity": String(Date.now()) } : {};
};

export default function ProcessMaterialReqModal({ open, row, onClose, onProcessed }) {
  const [profile, setProfile] = React.useState(null);   // Tenant, Requestor Name, Dept
  const [req, setReq]       = React.useState(null);     // rm_request row
  const [issueQty, setIssueQty] = React.useState("");

  const requestId = row?.requestId ?? row?.request_id ?? null;

  // Load login profile (Tenant, Requestor, Dept) — same as MaterialRequest page
  React.useEffect(() => {
    if (!open) return;
    let abort = false;
    (async () => {
      try {
        const r = await fetch("/api/rmrequest/me", { headers: { "Content-Type": "application/json", ...authHeaders() } });
        const j = await r.json();
        if (!abort && j?.ok) setProfile(j.profile);
      } catch { /* ignore */ }
    })();
    return () => { abort = true; };
  }, [open]);

  // Load the request row
  React.useEffect(() => {
    if (!open || !requestId) return;
    let abort = false;
    (async () => {
      try {
        const r = await fetch(`/api/rmrequest/${requestId}`, { headers: { "Content-Type": "application/json", ...authHeaders() } });
        const j = await r.json();
        if (!abort) setReq(j || null);
      } catch { /* ignore */ }
    })();
    return () => { abort = true; };
  }, [open, requestId]);

  const qtyRequested = Number(req?.material_qty || req?.materialQty || 0);
  const qtyIssued    = Number(req?.material_quantity_issued || req?.materialQuantityIssued || 0);
  const qtyBalance   = Math.max(0, qtyRequested - qtyIssued);

  const canSubmit = () => {
    const n = Number(issueQty);
    return Number.isFinite(n) && n > 0 && n <= qtyBalance;
  };

  async function submit() {
    // Client guard only; server must re-validate too
    if (!canSubmit()) {
      alert("Issue Quantity must be > 0 and not exceed Quantity Balance.");
      return;
    }

    try {
      // Minimal, non-breaking POST. Implement the server to:
      // - generate IDs (file or bin) as per your prefix rules
      // - insert into rmfilemaster / rmbinmaster
      // - update material_quantity_issued / balance and request_status:
      //   -> 'All ID\'s generated'   when balance goes to 0
      //   -> 'ID\'s Partially Generated' otherwise
      const res = await fetch(`/api/rmrequest/${requestId}/material/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          issueQty: Number(issueQty)
        }),
      });
      const out = await res.json();
      if (!res.ok || out?.ok === false) throw new Error(out?.error || `HTTP ${res.status}`);

      alert(out?.message || "Processed successfully.");
      onClose?.();
      onProcessed?.();
    } catch (e) {
      alert(e.message || "Processing failed.");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Process Material Request</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <Typography variant="body2"><b>Tenant:</b> {profile?.tenantName || "—"}</Typography>
          <Typography variant="body2"><b>Requestor Name:</b> {profile?.name || "—"}</Typography>
          <Typography variant="body2"><b>Requestor Dept.:</b> {profile?.department || "—"}</Typography>
          <Typography variant="body2"><b>Request Category:</b> Material Request</Typography>
          <Typography variant="body2"><b>Request Type:</b> {row?.requestType || req?.request_type || "—"}</Typography>
          <Typography variant="body2"><b>Request Date:</b> {req?.date_created ? new Date(req.date_created).toLocaleString() : "—"}</Typography>
          <Typography variant="body2"><b>Quantity Requested:</b> {qtyRequested}</Typography>
          <Typography variant="body2"><b>Quantity Issued:</b> {qtyIssued}</Typography>
          <Typography variant="body2"><b>Quantity Balance:</b> {qtyBalance}</Typography>

          <TextField
            label="Issue Quantity (<= Balance)"
            type="number"
            value={issueQty}
            onChange={(e) => setIssueQty(e.target.value)}
            size="small"
            inputProps={{ min: 1, max: qtyBalance }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={submit} disabled={!canSubmit()}>
          Process Request
        </Button>
      </DialogActions>
    </Dialog>
  );
}
