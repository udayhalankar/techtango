import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Button, CardContent, Grid, List, ListItemButton, ListItemText,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Typography, InputAdornment, Pagination, Menu, MenuItem, ListItemIcon,
  Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"; // Accept
import BuildIcon from "@mui/icons-material/Build"; // Completed (finish wrench)
import LeftMenu from "../physicalrecords/LeftMenu";
import { useLocation, useNavigate } from "react-router-dom";

const NAVBAR_H = 66;
const SIDENAV_W = 232;
const ROW_PY = 0.4;
const CELL_PX = 1;
const HEADER_PY = 0.6;
const TITLE_TOP_SPACE = 0;
const ALIGN_WITH_FIELDS = 1;

// API
const API_SEARCH = "/api/rmassignments/search";
const API_ASSIGNMENT = (id) => `/api/rmassignments/${id}`;
const API_VERIFY = (id) => `/api/rmassignments/${id}/verify-otp`;
const API_COMPLETE = (id) => `/api/rmassignments/${id}/complete`;

const authHeaders = () => {
  const t =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1]);
  return t ? { Authorization: `Bearer ${t}`, "X-Last-Activity": String(Date.now()) } : {};
};

// enable/disable rules
const canAccept = (row) => String(row?.assignmentStatus || "").toLowerCase() === "assigned";
const canComplete = (row) => String(row?.assignmentStatus || "").toLowerCase() === "accepted";

export default function RcAssignments() {
  // grid state
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);  // rows from rm_assignments
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [requeryKey, setRequeryKey] = useState(0);

  const effectiveTotal = total || items.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const pagedItems = useMemo(() => {
    if (items.length <= pageSize && total) return items;
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize, total]);

  // actions menu
  const [actionMenu, setActionMenu] = useState({ anchorEl: null, row: null });
  const openActions = (e, row) => setActionMenu({ anchorEl: e.currentTarget, row });
  const closeActions = () => setActionMenu({ anchorEl: null, row: null });

  // OTP dialog
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyData, setVerifyData] = useState({ assignmentId: "", otp: "" });
  const [verifySaving, setVerifySaving] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();



  // load assignments
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch(API_SEARCH, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ text: q || "", page, pageSize, sortBy: "date_assigned", sortDir: "desc" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (abort) return;

        const list = Array.isArray(data.items) ? data.items : [];
        // normalize a bit
        setItems(
          list.map(r => ({
            id: r.id,
            requestId: r.request_id,
            taskName: r.task_name,
            assignedToName: r.user_assigned_to_name,
            assignmentStatus: r.assignment_status,
            dateAssigned: r.date_assigned,
            comments: r.comments
          }))
        );
        setTotal(Number(data.total || list.length || 0));
      } catch (e) {
        console.error("assignments search failed", e);
        setItems([]); setTotal(0);
      }
    })();
    return () => { abort = true; };
  }, [q, page, pageSize, requeryKey]);

  // handlers
  const openAccept = (row) => {
    if (!canAccept(row)) return;
    closeActions();
    // go to the dedicated Verify OTP page
    navigate(`/verify-otp?assignment=${row.id}`);
    // setVerifyData({ assignmentId: String(row.id), otp: "" });
    // setVerifyOpen(true);
    // closeActions();
  };

  const submitOtp = async () => {
    try {
      setVerifySaving(true);
      const res = await fetch(API_VERIFY(verifyData.assignmentId), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ otp: verifyData.otp }),
      });
      const out = await res.json();
      if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);

      // close and refresh
      setVerifyOpen(false);
      navigate({ pathname: "/rcassignments", search: "" }, { replace: true });
      setRequeryKey((k) => k + 1);
    } catch (e) {
      alert("Invalid OTP or verification failed.");
      console.error(e);
    } finally {
      setVerifySaving(false);
    }
  };

  const markCompleted = async (row) => {
    if (!canComplete(row)) return;
    try {
      const res = await fetch(API_COMPLETE(row.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const out = await res.json();
      if (!res.ok || out.ok === false) throw new Error(out.error || `HTTP ${res.status}`);
      setRequeryKey((k) => k + 1);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to complete assignment.");
    } finally {
      closeActions();
    }
  };

//   const closeVerify = () => {
//     setVerifyOpen(false);
//     navigate({ pathname: "/rcassignments", search: "" }, { replace: true });
//   };

  return (
    <Box sx={{ display: "flex" }}>
      <LeftMenu width={SIDENAV_W} offsetTop={NAVBAR_H}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>My Assignments</Typography>
        <List dense>
          <ListItemButton><ListItemText primary="RWM" /></ListItemButton>
          <ListItemButton><ListItemText primary="ECM" /></ListItemButton>
        </List>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>Recently Visited</Typography>
        <List dense>
          {["Delayed Request","New Invoices","Storage Utilization Report","Destruction Approval",
            "Vital Documents Report","Recent Searches","Saved Searches"].map((t) => (
              <ListItemButton key={t}><ListItemText primary={t} /></ListItemButton>
            ))}
        </List>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>Filter Results</Typography>
        <Box sx={{ bgcolor: "#f6f7fb", border: "1px solid #e0e4ee", borderRadius: 1, mb: 1.5 }}>
          <Box sx={{ px: 1.25, py: .75, bgcolor: "#2f2b40", color: "white", borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
            <Typography variant="caption">Categories</Typography>
          </Box>
          <Box sx={{ p: 1.25, fontSize: 12 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ py: .25 }}><span>Cat1</span><span>25</span></Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ py: .25 }}><span>Cat2</span><span>89</span></Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ py: .25 }}><span>Cat3</span><span>55</span></Stack>
          </Box>
        </Box>
      </LeftMenu>

      <Box id="pr-main" sx={{ position: "fixed", top: NAVBAR_H, left: SIDENAV_W, right: 0, bottom: 0, overflowY: "auto", p: 2 }}>
        <CardContent sx={{ p: 1, pt: 0.5 }}>
          <Grid container alignItems="center" spacing={0}>
            <Grid item xs>
              <Typography variant="h6" sx={{ color: "#f0772c", mt: TITLE_TOP_SPACE, mb: 6, fontSize: 22, ml: ALIGN_WITH_FIELDS }}>
                RC Assignments
              </Typography>

              <Stack spacing={0.75} sx={{ maxWidth: 320 }}>
                <Grid item>
                  <TextField
                    size="small"
                    margin="dense"
                    placeholder="Search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    sx={{ width: 320 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>

        <CardContent sx={{ p: 0, ml: ALIGN_WITH_FIELDS }}>
          <Table
            size="small"
            stickyHeader
            sx={{
              "& thead .MuiTableCell-root": { py: HEADER_PY, px: CELL_PX, lineHeight: 2 },
              "& tbody .MuiTableCell-root": { py: ROW_PY, px: CELL_PX, lineHeight: 1.2 },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Request ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Task Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Assigned to</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date Assigned</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Comments</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {pagedItems.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.requestId}</TableCell>
                  <TableCell>{r.taskName}</TableCell>
                  <TableCell>{r.assignedToName || "—"}</TableCell>
                  <TableCell>{r.assignmentStatus}</TableCell>
                  <TableCell>{r.dateAssigned ? new Date(r.dateAssigned).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{r.comments || "NA"}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => openActions(e, r)}
                        endIcon={<ArrowDropDownIcon />}
                      >
                        Actions
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Action menu */}
          <Menu
            anchorEl={actionMenu.anchorEl}
            open={Boolean(actionMenu.anchorEl)}
            onClose={closeActions}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            keepMounted
          >
            <MenuItem
              disabled={!canAccept(actionMenu.row)}
              onClick={() => actionMenu.row && openAccept(actionMenu.row)}
            >
              <ListItemIcon><CheckCircleOutlineIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Accept</ListItemText>
            </MenuItem>

            <MenuItem
              disabled={!canComplete(actionMenu.row)}
              onClick={() => actionMenu.row && markCompleted(actionMenu.row)}
            >
              <ListItemIcon><BuildIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Completed</ListItemText>
            </MenuItem>

            <MenuItem
              onClick={async () => {
                // optional "View" of assignment details
                if (!actionMenu.row) return;
                try {
                  const res = await fetch(API_ASSIGNMENT(actionMenu.row.id), { headers: { ...authHeaders() } });
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  const d = await res.json();
                  alert(JSON.stringify(d, null, 2)); // replace with a pretty dialog if you like
                } catch (e) {
                  console.error(e);
                  alert("Failed to load assignment.");
                } finally {
                  closeActions();
                }
              }}
            >
              <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
              <ListItemText>View</ListItemText>
            </MenuItem>
          </Menu>
        </CardContent>

        <Grid container alignItems="center" sx={{ mt: 1 }}>
          <Grid item xs />
          <Grid item>
            <Pagination count={totalPages} page={page} size="small" onChange={(_e, p) => setPage(p)} />
          </Grid>
        </Grid>

        {/* OTP dialog */}
        {/* <Dialog open={verifyOpen} onClose={closeVerify} maxWidth="xs" fullWidth>
          <DialogTitle>Verify OTP</DialogTitle>
          <DialogContent dividers>
            <TextField
              label="Assignment ID"
              size="small"
              fullWidth
              margin="dense"
              value={verifyData.assignmentId}
              onChange={(e) => setVerifyData((s) => ({ ...s, assignmentId: e.target.value }))}
            />
            <TextField
              label="OTP"
              size="small"
              fullWidth
              margin="dense"
              inputProps={{ inputMode: "numeric", pattern: "\\d{4,8}" }}
              value={verifyData.otp}
              onChange={(e) => setVerifyData((s) => ({ ...s, otp: e.target.value }))}
            />
          </DialogContent>
          <DialogActions>
            <Button size="small" onClick={closeVerify}>Cancel</Button>
            <Button size="small" variant="contained" onClick={submitOtp} disabled={verifySaving || !verifyData.otp}>
              {verifySaving ? "Verifying..." : "Verify"}
            </Button>
          </DialogActions>
        </Dialog> */}
      </Box>
    </Box>
  );
}
