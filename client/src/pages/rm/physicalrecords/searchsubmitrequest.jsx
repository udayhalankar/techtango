import React, { useEffect, useMemo, useState } from "react";

import {
  Box, Button, Card, CardContent, Chip, Grid, List, ListItemButton, ListItemText,
  Stack, Table, TableBody, TableCell, MenuItem, TableHead, TableRow, TextField, Typography,
  InputAdornment, Pagination, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { Checkbox } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LeftMenu from "../physicalrecords/LeftMenu";
import FileDetailsModal from "../physicalrecords/FileDetailsModal";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const NAVBAR_H = 66;     // <-- set to your AppBar height
const SIDENAV_W = 232;   // <-- keep in sync with LeftMenu width

// row height tuning (feel free to tweak)
const ROW_PY = 0.4;     // vertical padding (theme spacing units) ~3px
const CELL_PX = 1;      // horizontal padding ~8px
const HEADER_PY = 0.6;  // header vertical padding ~5px

// layout nudges
const TITLE_TOP_SPACE = 0;
const ALIGN_WITH_FIELDS = 1;

const API_URL = "/api/physicalrecords/search"; // same origin

const StatusChip = ({ value }) => {
  const color = value === "IN" ? "success" : value === "OUT" ? "error" : "warning";
  return <Chip size="small" label={value} color={color} variant="outlined" />;
};

// helper to attach JWT + activity ping
const authHeaders = () => {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "X-Last-Activity": String(Date.now()) }
    : {};
};


export default function SearchSubmitRequest() {
  // -------- UI state --------
  const [requestType, setRequestType] = useState("");
  const [q, setQ] = useState("");

  // -------- table selection --------
  const [selected, setSelected] = useState([]); // array of row ids
  const isSelected = (id) => selected.includes(id);

  // -------- modal state --------
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState(null);

  // success modal state
const [successOpen, setSuccessOpen] = useState(false);
const [successData, setSuccessData] = useState({ id: null, count: 0, type: "" });

// trigger to force a grid reload (see step 4)
const [reloadKey, setReloadKey] = useState(0);


  // -------- server data & paging --------
  const [items, setItems] = useState([]);       // rows from API
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);              // tune if you like
  const [sortBy] = useState("dateCreated");     // keep simple for now
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

  // -------- fetch from API whenever q/page/sort/requestType changes --------
  useEffect(() => {
    let abort = false;

    async function load() {
      try {
         const token =
   localStorage.getItem("token") ||
   sessionStorage.getItem("token") ||
   (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1] ?? "");

   
//  const res = await fetch(API_URL, {
//    method: "POST",
//    headers: {
//      "Content-Type": "application/json",
//      // JWT for the auth gate:
//      ...(token ? { Authorization: `Bearer ${token}` } : {}),
//      // keeps the inactivity check happy:
//      "X-Last-Activity": String(Date.now()),
//    },
//    body: JSON.stringify({ text: q || "", page, pageSize, sortBy, sortDir }),
//  });

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
  }, [q, page, pageSize, sortBy, sortDir, requestType, reloadKey]); // refetch as these change

  // Reset to first page when query/request type changes
  useEffect(() => { setPage(1); }, [q, requestType]);

  async function handleSubmit() {
  try {
    if (!requestType) return alert("Pick a Request Type");
    if (!selected.length) return alert("Select at least one file");

    const res = await fetch("/api/physicalrecords/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ ids: selected, requestType }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    // show success modal with request id
setSuccessData({
  id: data.requestId,
  count: data.updatedFiles ?? 0,
  type: data.requestType ?? requestType,
});
setSuccessOpen(true);








// refresh the grid from server
setReloadKey((k) => k + 1);

    console.log("submit ok", data);
    // clear selection + refresh
    setSelected([]);
    setPage(1);
  } catch (e) {
    console.error("Submit failed", e);
    alert("Submit failed");
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
                Search & Submit File Request
              </Typography>

              <Stack spacing={0.75} sx={{ maxWidth: 320 }}>
                {/* <TextField size="small" margin="dense" label="Request Category" fullWidth /> */}
                <TextField
                  select
                  size="small"
                  margin="dense"
                  label="Request Type"
                  fullWidth
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                >
                  <MenuItem value="">Select Request Type</MenuItem>
                  <MenuItem value="Retrieval">Retrieval</MenuItem>
                  <MenuItem value="Refiling">Refiling</MenuItem>
                  <MenuItem value="Audit">Audit</MenuItem>
                  <MenuItem value="Insertion">Insertion</MenuItem>
                  <MenuItem value="Permout Delivery">Permout Delivery</MenuItem>
                  <MenuItem value="Permout Destruction">Permout Destruction</MenuItem>
                </TextField>

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
              <TableHead sx={{ bgcolor: "#554d78" }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      indeterminate={selected.length > 0 && selected.length < rowCount}
                      checked={rowCount > 0 && selected.length === rowCount}
                      onChange={handleSelectAll}
                      inputProps={{ "aria-label": "Select all rows" }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: "grey", fontSize: 12, fontWeight: 600 }}>File ID</TableCell>
                  <TableCell sx={{ color: "grey", fontSize: 12, fontWeight: 600 }}>Department File ID</TableCell>
                  <TableCell sx={{ color: "grey", fontSize: 12, fontWeight: 600 }}>Box ID</TableCell>
                  <TableCell sx={{ color: "grey", fontSize: 12, fontWeight: 600 }}>Date Created</TableCell>
                  <TableCell sx={{ color: "grey", fontSize: 12, fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: "grey", fontSize: 12, fontWeight: 600 }}>Custodian</TableCell>
                  <TableCell sx={{ color: "grey", fontSize: 12, fontWeight: 600 }}>Soft Copy</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {pagedItems.map((r) => {
                  const idNum = Number(r.id);
                  const checked = isSelected(idNum);
                  return (
                    <TableRow
                      key={r.id}
                      hover
                      role="checkbox"
                      aria-checked={checked}
                      selected={checked}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={checked}
                          onChange={handleRowCheckbox(idNum)}
                          disabled={!canEnableRow(r.status)}
                          inputProps={{ "aria-label": `Select ${r.fileId}` }}
                        />
                      </TableCell>

                      <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{r.fileId}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.departmentFileId}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.boxId}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>
                        {r.dateCreated ? new Date(r.dateCreated).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>
                        <StatusChip value={r.status} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.custodian}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{ minWidth: 70, py: 0.3, fontSize: 12 }}
                          onClick={() => {
                            setDetailsData({
                              department: r.department || "Finance",
                              boxId: r.boxId,
                              fileId: r.fileId,
                              deptFileId: r.departmentFileId,
                              date: r.dateCreated ? new Date(r.dateCreated).toLocaleString() : "",
                              requestType: r.requestType || "",
                              softcopy: r.softcopy || "No Softcopy",
                            });
                            setDetailsOpen(true);
                          }}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Footer actions */}
        <Grid container alignItems="center" sx={{ mt: 1 }}>
          <Grid item xs>
             <Button
  variant="contained"
  size="small"
  onClick={handleSubmit}
  disabled={!requestType || selected.length === 0}
>
  Submit Request
</Button>
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

          <Dialog
  open={successOpen}
  onClose={() => setSuccessOpen(false)}
  maxWidth="xs"
  fullWidth
>
  <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <CheckCircleOutlineIcon color="success" />
    Request submitted
  </DialogTitle>

  <DialogContent dividers>
    <Typography sx={{ mb: 0.5 }}>
      Request <b>#{successData.id}</b> has been created successfully.
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Type: <b>{successData.type}</b> • Files updated: <b>{successData.count}</b>
    </Typography>
  </DialogContent>

  <DialogActions>
    <Button variant="contained" size="small" onClick={() => setSuccessOpen(false)}>
      OK
    </Button>
  </DialogActions>
</Dialog>



      </Box>
    </Box>
  );
}

