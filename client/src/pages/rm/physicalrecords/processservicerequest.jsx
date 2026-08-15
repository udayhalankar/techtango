import React, { useEffect, useMemo, useState } from "react";

import {
  Box, Button, Card, CardContent, Chip, Grid, List, ListItemButton, ListItemText,
  Stack, Table, TableBody, TableCell, Menu, MenuItem, TableHead, TableRow, TextField, Typography,
  InputAdornment, Pagination, Dialog, DialogTitle, DialogContent, DialogActions, ListItemIcon, 
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import LeftMenu from "../physicalrecords/LeftMenu";
import FileDetailsModal from "../physicalrecords/FileDetailsModal";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BuildIcon from "@mui/icons-material/Build";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CancelIcon from "@mui/icons-material/Cancel";
import { useLocation, useNavigate } from "react-router-dom";
import ProcessRequestModal from "../physicalrecords/ProcessRequestModal";
import ProcessMaterialReqModal from "../physicalrecords/ProcessMaterialReqModal";


const NAVBAR_H = 66;     // <-- set to your AppBar height
const SIDENAV_W = 232;   // <-- keep in sync with LeftMenu width



// row height tuning (feel free to tweak)
const ROW_PY = 0.4;     // vertical padding (theme spacing units) ~3px
const CELL_PX = 1;      // horizontal padding ~8px
const HEADER_PY = 0.6;  // header vertical padding ~5px

// layout nudges
const TITLE_TOP_SPACE = 0;
const ALIGN_WITH_FIELDS = 1;

const API_URL = "/api/rmrequest/search";
const API_GET = (id) => `/api/rmrequest/${id}`;
const API_STATUS = (id) => `/api/rmrequest/${id}/status`;

// statuses that should LOCK the Assign action
const ASSIGN_LOCKED_STATUSES = new Set([
  "assigned",       // after first assignment
  "accepted",       // assignee confirmed
  "completed",
  "delivered",
  "documents_retrieved",
  "documents_retreived",
  "refiling_pickup_completed",
  "closed",
  "cancelled",
  "in-process",
  "file_inward_pickup_completed",
  "new material request",
]);



const norm = (s) => String(s || "").trim().toLowerCase();

const isRefilingType = (type) => {
  const t = norm(type);
  return t === "refiling" || t === "file refiling request";
};

const isFileInwardType = (type) => {
  const t = norm(type);
  return t === "file inward" || t === "inward files";
};

const canAssignPickup = (row) =>
  norm(row?.requestStatus) === "new" &&
  (isRefilingType(row?.requestType) || isFileInwardType(row?.requestType));

const isAssignMenuDisabled = (row) => isAssignDisabled(row);



const StatusChip = ({ value }) => {
  const color = value === "IN" ? "success" : value === "OUT" ? "error" : "warning";
  return <Chip size="small" label={value} color={color} variant="outlined" />;
};



// ---------- canonicalizers ----------
const toKey = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "_");

const canonType = (type) => {
  const k = toKey(type);
  if (k === "refiling" || k === "file_refiling_request") return "refiling";
  if (k === "file_inward" || k === "inward_files") return "file_inward";
  if (k === "retrieval") return "retrieval";
  if (k === "audit") return "audit";
  if (k === "insertion") return "insertion";
  if (k === "permout_delivery") return "permout_delivery";
  if (k === "permout_destruction") return "permout_destruction";
  if (k === "file_id_delivery") return "file_id_delivery";
  if (k === "box_id_delivery") return "box_id_delivery";
  if (k === "box_delivery") return "box_delivery";
  return k; // fallback: already a nice key
};

const canonStatus = (status) => toKey(status);

// ---------- ONE place to define all assignment task rules ----------
/**
 * Returns the task name to save in rm_assignments, given the row’s
 * requestType + requestStatus.
 * If no rule matches, returns "".
 */
const computeAssignmentTask = (row) => {
  const t = canonType(row?.requestType);
  const s = canonStatus(row?.requestStatus);

  // 1) Refiling + Refiling_Inward_Processed -> "Refiling Files"
  if (t === "refiling" && s === "refiling_inward_processed") return "Refiling Files";

  // 2) retrieval|audit|insertion|permout_delivery|permout_destruction + New -> "Retrieval"
  if (["retrieval","audit","insertion","permout_delivery","permout_destruction"].includes(t) && s === "new") {
    return "Retrieval";
  }

  // 3) File Inward + File_Inward_Processed -> "Inward Files"
  // allow both "file_inward" and "file inward" (and processed status in either form)
if (
  (t === "file_inward" || t === "file inward") &&
  (s === "ready_for_file_inward" || s === "ready for file inward")
) {
  return "Inward Files";
}


  // 4) retrieval|audit|insertion|permout_delivery + Ready_for_Delivery -> "Files Delivery"
  if (["retrieval","audit","insertion","permout_delivery"].includes(t) && s === "ready_for_delivery") {
    return "Files Delivery";
  }

  // 5) permout_destruction + Ready_for_Delivery -> "Files Destruction"
  if (t === "permout_destruction" && s === "ready_for_delivery") return "Files Destruction";

  // 6) File ID Delivery|Box ID Delivery|Box Delivery + Ready_for_Delivery -> "Material Delivery"
  if (["file_id_delivery","box_id_delivery","box_delivery"].includes(t) && s === "ready_for_delivery") {
    return "Material Delivery";
  }

  // no rule matched
  return "";
};


// After creating an assignment, optionally bump the request status.
const statusAfterAssign = (row, taskName) => {
  const t = canonType(row?.requestType);     // normalized: e.g., 'permout_delivery'
  const s = canonStatus(row?.requestStatus); // normalized: e.g., 'ready_for_delivery'
  const task = String(taskName || "").toLowerCase();

  const TYPES = new Set([
    "retrieval",
    "audit",
    "insertion",
    "permout_delivery",
    "permout_destruction",
  ]);

  // Any of the types above + Ready_for_Delivery + Files Delivery task
  if (TYPES.has(t) && s === "ready_for_delivery" && task === "files delivery") {
    return "File_Delivery_Assigned";
  }
  return "";
};

// ✅ Only lock Assign from the set above + one special case: File Inward + New
const isAssignDisabled = (row) => {
  if (!row) return true;
  const st = norm(row.requestStatus);

  // special case you asked for
  if (isFileInwardType(row.requestType) && st === "new") return true;

  // otherwise use only the locked statuses set
  return ASSIGN_LOCKED_STATUSES.has(st);
};




// Only requests in "New" can be cancelled
const isCancelDisabled = (row) =>
  !row || String(row.requestStatus || "").toLowerCase() !== "new"
;


const isProcessDisabled = (row) => {
  if (!row) return true;
  const st = norm(row.requestStatus);

  // ⛔ Disable Process for Refiling + New
  if (isRefilingType(row.requestType) && st === "new") return true;

  // Block for all other disallowed states (keeps New blocked for non-Refiling too)
  return [
    "cancelled","cancel","new","assigned","accepted",
    "in-process","completed","delivered","closed",
    "refiling_inward_processed","ready_for_delivery","request_closed", "ready_for_file_inward", "new material request",
  ].includes(st);
};


const isProcessMaterialDisabled = (row) => {
  if (!row) return true;
  const st = norm(row.requestStatus);

  // ⛔ Disable Process for Refiling + New
  if (isRefilingType(row.requestType) && st === "new") return true;

  // Block for all other disallowed states (keeps New blocked for non-Refiling too)
  return [
    "cancelled","cancel","new","assigned","accepted",
    "in-process","completed","delivered","closed",
    "refiling_inward_processed","ready_for_delivery","request_closed", "ready_for_file_inward", 
  ].includes(st);
};



export default function ProcessServiceRequest() {
  // -------- UI state --------
  const [requestType, setRequestType] = useState("");
  const [q, setQ] = useState("");

  const [procMatOpen, setProcMatOpen] = useState(false);
  const [procMatRow,  setProcMatRow]  = useState(null);

  // -------- table selection --------
  const [selected, setSelected] = useState([]); // array of row ids
  const isSelected = (id) => selected.includes(id);

  const [procOpen, setProcOpen] = useState(false);
const [procData, setProcData] = useState({ id: null, status: "In-process" });
const [requeryKey, setRequeryKey] = useState(0); // bump to refresh grid after processing


  // -------- modal state --------
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
const [viewData, setViewData] = useState(null);

  // success modal state
const [successOpen, setSuccessOpen] = useState(false);
const [successData, setSuccessData] = useState({ id: null, count: 0, type: "" });

const [verifyOpen, setVerifyOpen] = useState(false);
const [verifyData, setVerifyData] = useState({ assignmentId: "", otp: "" });
const [verifySaving, setVerifySaving] = useState(false);


const [cancelOpen, setCancelOpen]   = useState(false);
const [cancelData, setCancelData]   = useState({ id: null, reason: "" });


const [procRow,  setProcRow]  = useState(null);

// trigger to force a grid reload (see step 4)
const [reloadKey, setReloadKey] = useState(0);

const [actionMenu, setActionMenu] = useState({ anchorEl: null, row: null });

const openActions = (e, row) => setActionMenu({ anchorEl: e.currentTarget, row });
const closeActions = () => setActionMenu({ anchorEl: null, row: null });

// ASSIGN modal state
const [assignOpen, setAssignOpen] = useState(false);
const [assignRow, setAssignRow]   = useState(null);
const [assignTaskName, setAssignTaskName] = useState(""); 
const [team, setTeam]             = useState([]);          // rmteam list
const [assignee, setAssignee]     = useState(null);        // { id, name, mobile, email }
const [assignSaving, setAssignSaving] = useState(false);


  // -------- server data & paging --------
  const [items, setItems] = useState([]);       // rows from API
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);              // tune if you like
  const [sortBy] = useState("date_created");     // keep simple for now
  const [sortDir] = useState("desc");
  const effectiveTotal = total || items.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));

  // client-side slice if server returned "too many"
  const pagedItems = React.useMemo(() => {
  // If server already paginated correctly (items.length <= pageSize and total provided), use as-is
  if (items.length <= pageSize && total) return items;

  // Else slice locally
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
  }, [items, page, pageSize, total]);

  // ---- ENABLE/DISABLE RULES ----
  const IN_ALLOWED = useMemo(() => new Set([
    "Retrieval",
    "Audit",
    "Insertion",
    "Permout Delivery",
    "Permout Destruction",
  ]), []);

  const canEnableRow = (status) => {
    if (status === "CIRCULATION") return false;                        // Rule 3
    if (requestType === "Refiling" && status === "OUT") return true;   // Rule 1
    if (status === "IN" && IN_ALLOWED.has(requestType)) return true;    // Rule 2
    return false;
  };

  // Select-all should only consider rows enabled by current rules on the current page
  const selectableIds = React.useMemo(
  () => pagedItems.filter(r => canEnableRow(r.status)).map(r => Number(r.id)),
  [pagedItems, requestType]
);
const rowCount = selectableIds.length;

  const handleSelectAll = (e) => {
    setSelected(e.target.checked ? selectableIds : []);
  };

  const handleRowCheckbox = (id) => (e) => {
    setSelected((prev) =>
      e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  // helper to attach JWT + activity ping
  const authHeaders = () => {
  const t = localStorage.getItem("token") || sessionStorage.getItem("token") ||
            document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1];
  return t ? { Authorization: `Bearer ${t}`, "X-Last-Activity": String(Date.now()) } : {};
};


const closeVerify = () => {
  setVerifyOpen(false);
  // remove ?verify=... from the URL so the modal doesn’t reopen on refresh/back
  navigate({ pathname: "/processrequest", search: "" }, { replace: true });
};


const location = useLocation();
const navigate = useNavigate();

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const id = params.get("verify");
  if (id) {
    setVerifyData({ assignmentId: String(id), otp: "" });
    setVerifyOpen(true);
  }
}, [location.search]);




  // -------- fetch from API whenever q/page/sort/requestType changes --------
  useEffect(() => {
    let abort = false;

    async function load() {
      try {
         const token =
   localStorage.getItem("token") ||
   sessionStorage.getItem("token") ||
   (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1] ?? "");

   


const res = await fetch(API_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...authHeaders() },
  body: JSON.stringify({ text: q || "", page, pageSize, sortBy, sortDir }),
});

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (abort) return;

        // API returns { items, total, page, pageSize, ... }
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total || 0));

        // drop any selections that aren’t in the current page
        //setSelected((prev) => prev.filter((id) => selectableIds.includes(id)));
      } catch (e) {
        console.error("search load error:", e);
        setItems([]);
        setTotal(0);
      }
    }

    load();
    return () => { abort = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, pageSize, sortBy, sortDir, requeryKey]); // refetch as these change

  // Reset to first page when query/request type changes
  useEffect(() => { setPage(1); }, [q, requestType]);

 

async function openView(id) {
  try {
    const res = await fetch(API_GET(id), { headers: { ...authHeaders() } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setViewData(data);
    setViewOpen(true);
  } catch (e) {
    console.error("view failed", e);
    alert("Failed to load request details");
  }
}

function openProcess(row) {
    if (isProcessDisabled(row)) return;
  //setProcData({ id: row.requestId, status: row.requestStatus || "In-process" });
  setProcRow(row);
  setProcOpen(true);
}

function openProcessMaterial(row) {
   if (!row) return;
   setProcMatRow(row);        // row has requestId, requestType, requestStatus, etc.
   setProcMatOpen(true);
 }


async function openAssign(row, defaultTaskName = "") {
  if (!row) return;

  const isPickup = Boolean(defaultTaskName);
  // Normal Assign keeps the guard; Pickup path bypasses it (but still sanity-checks canAssignPickup)
  if (!isPickup && isAssignDisabled(row)) return;
  if (isPickup && !canAssignPickup(row)) return; // optional safety

  // 👇 seed the modal with either: pickup override OR computed from the rule table
  // const autoTask = defaultTaskName || computeAssignmentTask(row);
  const autoTask = defaultTaskName || computeAssignmentTask(row);

  setAssignRow(row);
  // setAssignTaskName(defaultTaskName || "");
  setAssignTaskName(autoTask || "");
  setAssignee(null);
  setAssignOpen(true);

  try {
    const res = await fetch("/api/rmteam/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ pageSize: 100, sortBy: "name", sortDir: "asc" }),
    });
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    setTeam(items.map(m => ({
      id: Number(m.id),
      name: m.name || "",
      role: m.role || "",
      mobile: m.mobile || "",
      email: m.email || "",
    })));
  } catch (e) {
    console.error("team load failed", e);
  }
}




// ⤵️ call this from the new menu item; it just picks the right task name and forwards to your existing Assign flow
const onAssignPickup = (row) => {
  const taskName = isRefilingType(row?.requestType)
    ? "Refiling Pickup"
    : "Inward Pickup";
  openAssign(row, taskName);                                 // ⬅️ now honored
};





async function submitAssign() {
  if (!assignRow || !assignee) return;


  const taskNameFinal = assignTaskName || computeAssignmentTask(assignRow) || "";
if (!taskNameFinal) {
  alert("No assignment task is defined for this request state.");
  return;
}

  setAssignSaving(true);
  try {
    const payload = {
      requestId: assignRow.requestId,
      taskName: taskNameFinal,           // ⬅️ from rules (or pickup override)
      assignmentStatus: "Assigned",      // DB shows 'assigned' in your note; if API requires exact case, adjust here
      userAssignedTo: assignee.id,
    };

    const res = await fetch("/api/rmassignments", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

      // 🟢 If rule says so, bump the request status now
   const nextStatus = statusAfterAssign(assignRow, taskNameFinal);
   if (nextStatus) {
     const bump = await fetch(API_STATUS(assignRow.requestId), {
       method: "POST",
       headers: { "Content-Type": "application/json", ...authHeaders() },
       body: JSON.stringify({ requestStatus: nextStatus }),
     });
     if (!bump.ok) console.warn("Status bump failed:", bump.status);
   }

    alert(`Assignment #${data.id} created for "${taskNameFinal}" and OTP sent to ${assignee.name}.`);
    setAssignOpen(false);
    setRequeryKey((k) => k + 1);
  } catch (e) {
    console.error("assign failed", e);
    alert("Failed to assign task");
  } finally {
    setAssignSaving(false);
  }
}

async function submitOtp() {
  try {
    setVerifySaving(true);
    const res = await fetch(`/api/rmassignments/${verifyData.assignmentId}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ otp: verifyData.otp }),
    });
    const out = await res.json();
    if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);

    // Close modal, clear ?verify= from URL, refresh grid
    setVerifyOpen(false);
    navigate({ pathname: "/processrequest", search: "" }, { replace: true });
    setRequeryKey((k) => k + 1);
    alert("OTP accepted. Assignment is now 'Accepted'.");
  } catch (e) {
    console.error(e);
    alert("Invalid OTP or verification failed.");
  } finally {
    setVerifySaving(false);
  }
}

async function submitCancel() {
  try {
    const reason = cancelData.reason.trim();
    if (!reason) { alert("Please enter a cancellation reason."); return; }

    const res = await fetch(`/api/rmrequest/${cancelData.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ reason }),
    });
    const out = await res.json();
    if (!res.ok || out.ok === false) throw new Error(out.error || `HTTP ${res.status}`);

    setCancelOpen(false);
    setRequeryKey((k) => k + 1); // refresh grid so status shows 'Cancelled'
  } catch (e) {
    console.error(e);
    alert(e.message || "Cancel failed");
  }
}


function openCancel(row) {
  if (isCancelDisabled(row)) return;
  setCancelData({ id: row.requestId, reason: "" });
  setCancelOpen(true);
}



async function saveProcess() {
  try {
    const res = await fetch(API_STATUS(procData.id), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ requestStatus: procData.status }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setProcOpen(false);
    setRequeryKey((k) => k + 1); // refresh grid
  } catch (e) {
    console.error("process failed", e);
    alert("Failed to update status");
  }
}


  return (
    <Box sx={{ display: "flex" }}>
      
      {/* LEFT MENU */}
      <LeftMenu width={SIDENAV_W} offsetTop={NAVBAR_H}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          My Assignments
        </Typography>
        <List dense>
          <ListItemButton><ListItemText primary="RWM" /></ListItemButton>
          <ListItemButton><ListItemText primary="ECM" /></ListItemButton>
        </List>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Recently Visited
        </Typography>
        <List dense>
          {[
            "Delayed Request","New Invoices","Storage Utilization Report","Destruction Approval",
            "Vital Documents Report","Recent Searches","Saved Searches",
          ].map((t) => (<ListItemButton key={t}><ListItemText primary={t} /></ListItemButton>))}
        </List>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Filter Results
        </Typography>
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

      {/* MAIN CONTENT */}
      <Box
        id="pr-main"
        sx={{
          position: "fixed",
          top: NAVBAR_H,
          left: SIDENAV_W,
          right: 0,
          bottom: 0,
          overflowY: "auto",
          p: 2,
        }}
      >
        <CardContent sx={{ p: 1, pt: 0.5 }}>
          <Grid container alignItems="center" spacing={0}>
            <Grid item xs>
              <Typography
                variant="h6"
                sx={{ color: "#f0772c", mt: TITLE_TOP_SPACE, mb: 6, fontSize: 22, ml: ALIGN_WITH_FIELDS }}
              >
                Process Requests
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

        <Card variant="outlined" sx={{ ml: ALIGN_WITH_FIELDS }}>
          <CardContent sx={{ p: 0 }}>
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
                    <TableCell sx={{ fontWeight: 700 }}>Request Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date Created</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Request Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 220 }}>Actions</TableCell>
                </TableRow>
                </TableHead>

              <TableBody>
                {pagedItems.map((r) => (
                    <TableRow key={r.requestId} hover>
                    <TableCell>{r.requestId}</TableCell>
                    <TableCell>{r.requestType}</TableCell>
                    <TableCell>
                        {r.dateCreated ? new Date(r.dateCreated).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>{r.requestStatus}</TableCell>
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


                <Menu
  anchorEl={actionMenu.anchorEl}
  open={Boolean(actionMenu.anchorEl)}
  onClose={closeActions}
  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
  transformOrigin={{ vertical: "top", horizontal: "left" }}
  keepMounted
>
  <MenuItem
    onClick={() => { if (actionMenu.row) openView(actionMenu.row.requestId); closeActions(); }}
  >
    <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
    <ListItemText>View Request</ListItemText>
  </MenuItem>

  <MenuItem
    disabled={isProcessDisabled(actionMenu.row)}
    onClick={() => { const r = actionMenu.row; if (r && !isProcessDisabled(r)) openProcess(r); closeActions(); }}
  >
    <ListItemIcon><BuildIcon fontSize="small" /></ListItemIcon>
    <ListItemText>Process Service Request</ListItemText>
  </MenuItem>

   <MenuItem
   
   disabled={isProcessMaterialDisabled(actionMenu.row)}
   onClick={() => {
     const r = actionMenu.row;
     if (r && !isProcessMaterialDisabled(r)) {
       openProcessMaterial(r);
     }
     closeActions();
   }}
  >
    <ListItemIcon><BuildIcon fontSize="small" /></ListItemIcon>
    <ListItemText>Process Material Request</ListItemText>
  </MenuItem>

  <MenuItem
  disabled={isAssignDisabled(actionMenu.row)}
  onClick={() => { const r = actionMenu.row; if (r && !isAssignDisabled(r)) openAssign(r); closeActions(); }}
>
  <ListItemIcon><AssignmentIndIcon fontSize="small" /></ListItemIcon>
  <ListItemText>Assign</ListItemText>
</MenuItem>

  <MenuItem
    disabled={isCancelDisabled(actionMenu.row)}
    onClick={() => { const r = actionMenu.row; if (r && !isCancelDisabled(r)) openCancel(r); closeActions(); }}
  >
    <ListItemIcon><CancelIcon fontSize="small" /></ListItemIcon>
    <ListItemText>Cancel</ListItemText>
  </MenuItem>

  {canAssignPickup(actionMenu.row) && (
    <MenuItem onClick={() => { onAssignPickup(actionMenu.row); closeActions(); }}>
      <ListItemIcon><AssignmentIndIcon fontSize="small" /></ListItemIcon>
      <ListItemText>Assign Pickup</ListItemText>
    </MenuItem>
  )}
</Menu>

            
            
          </CardContent>
         
        </Card>

        

        {/* Footer actions */}
        <Grid container alignItems="center" sx={{ mt: 1 }}>
          <Grid item xs>
             
          </Grid>
          <Grid item>
            <Pagination
              count={totalPages}
              page={page}
              size="small"
              onChange={(_e, p) => setPage(p)}
            />
          </Grid>
        </Grid>

        {/* ONE modal instance */}
        <FileDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          details={detailsData}
          fieldOrder={[
            ["department", "Department"],
            ["boxId", "Box ID"],
            ["fileId", "File ID"],
            ["deptFileId", "Department File ID"],
            ["date", "Date Created"],
            ["requestType", "Request Type"],
          ]}
        />

          <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Request #{viewData?.request_id}</DialogTitle>
  <DialogContent dividers>
    <Typography variant="body2">Type: <b>{viewData?.request_type}</b></Typography>
    <Typography variant="body2">Status: <b>{viewData?.request_status}</b></Typography>
    <Typography variant="body2">Created: {viewData?.date_created && new Date(viewData.date_created).toLocaleString()}</Typography>
    {viewData?.instructions && (
      <Typography variant="body2" sx={{ mt: 1 }}>
        Instructions: {viewData.instructions}
      </Typography>
    )}
  </DialogContent>
  <DialogActions>
    <Button variant="contained" size="small" onClick={() => setViewOpen(false)}>Close</Button>
  </DialogActions>
</Dialog>

<ProcessRequestModal
  open={procOpen}
  row={procRow}
  onClose={() => setProcOpen(false)}
  onProcessed={() => setRequeryKey((k) => k + 1)}
/>

 <ProcessMaterialReqModal
   open={procMatOpen}
   row={procMatRow}
   onClose={() => setProcMatOpen(false)}
   onProcessed={() => setRequeryKey(k => k + 1)}   // refresh list when done
 />

<Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="xs" fullWidth>
  <DialogTitle>
    Assign Request #{assignRow?.requestId}
    {assignTaskName ? ` — ${assignTaskName}` : ""}
  </DialogTitle>
  <DialogContent dividers>

    {/* Read-only task name so user knows what they’re assigning */}
    <TextField
      label="Task"
      size="small"
      fullWidth
      margin="dense"
      value={assignTaskName || ""}
      disabled                                   // ⬅️ disables editing & greys it out
    />

    <TextField
      select
      fullWidth
      size="small"
      label="Assign to"
      value={assignee?.id ?? ""}
      onChange={(e) => {
        const id = Number(e.target.value);
        const user = team.find(t => t.id === id) || null;
        setAssignee(user ? { id: user.id, name: user.name, mobile: user.mobile, email: user.email } : null);
      }}
      SelectProps={{
        displayEmpty: true,
        renderValue: (v) =>
          (v === "" || v == null)
            ? <span style={{ opacity: 0.6 }}>Select a user…</span>
            : `${team.find(t => t.id === v)?.name ?? ""} — ${team.find(t => t.id === v)?.role ?? ""}`,
      }}
      InputLabelProps={{ shrink: true }}     
      sx={{ mt: 1 }}
    >
      <MenuItem value="" disabled>
        <em>Select a user…</em>
      </MenuItem>
      {team.map(m => (
        <MenuItem key={m.id} value={m.id}>
          {m.name} — {m.role}
        </MenuItem>
      ))}
    </TextField>


    {assignee && (
      <Typography variant="body2" sx={{ mt: 1.25 }} color="text.secondary">
        Mobile: {assignee.mobile} • Email: {assignee.email}
      </Typography>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setAssignOpen(false)} size="small">Close</Button>
    <Button onClick={submitAssign} variant="contained" size="small" disabled={!assignee}>
      {assignSaving ? "Assigning..." : "Assign"}
    </Button>
  </DialogActions>
</Dialog>




<Dialog open={verifyOpen} onClose={closeVerify} maxWidth="xs" fullWidth>
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
</Dialog>



<Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
  <DialogTitle>Cancel Request #{cancelData.id}</DialogTitle>
  <DialogContent dividers>
    <TextField
      label="Cancellation reason"
      value={cancelData.reason}
      onChange={(e) => setCancelData((s) => ({ ...s, reason: e.target.value }))}
      fullWidth
      multiline
      minRows={3}
      size="small"
    />
  </DialogContent>
  <DialogActions>
    <Button size="small" onClick={() => setCancelOpen(false)}>Close</Button>
    <Button size="small" variant="contained" color="error" onClick={submitCancel}>
      Cancel Request
    </Button>
  </DialogActions>
</Dialog>



      </Box>
    </Box>
  );
}

