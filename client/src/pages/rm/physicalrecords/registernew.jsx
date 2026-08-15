import React, { useEffect, useMemo, useState } from "react";
import LeftMenu from "../../../components/rmsMenu/RmsMenu";
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, Alert, IconButton, CircularProgress
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { authHeaders } from "../../../utils/authHeaders";
import { safeJson } from "../../../utils/safeJson";

/* ------------------------------ Endpoints ------------------------------ */
// Tweak these if your server routes differ.
const ENDPOINTS = {
  listFiles:      (q) => `/api/rm/register/files?rm_status=CIRCULATION&q=${encodeURIComponent(q || "")}`,
  oneFile:        (id) => `/api/rm/register/files/${id}`,
  registerFile:         `/api/rm/register/register-file`,                       // handles create/update + dm_data
  fileplans:            `/api/rm/fileplan-nodes?page=1&pageSize=500&sortBy=code&sortDir=asc`,
  categories:           `/api/rm/metadata-categories?active=true`,
  //dmDataForFile:  (id) => `/api/rm/register/dm-data?entity_type=file&entity_id=${id}`, // optional (prefill edit)
};

/* ------------------------------ Helpers ------------------------------ */
async function getJSON(url, opts = {}) {
  const res = await fetch(url, { headers: { ...authHeaders() }, ...opts });
  const out = await safeJson(res);
  if (!res.ok) throw new Error(out?.error || `HTTP ${res.status}`);
  return out;
}

function asItems(maybe) {
  if (Array.isArray(maybe?.items)) return maybe.items;
  if (Array.isArray(maybe)) return maybe;
  return [];
}

function formatDate(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleDateString(); } catch { return String(ts); }
}

/* =======================================================================
   Register File Modal  (used for Create and Details/Edit)
   ======================================================================= */
function RegisterFileModal({ open, onClose, initial = null, onSaved }) {
  const isEdit = !!initial?.id;

  // top section fields
  const [fileQR, setFileQR]       = useState("");
  const [title, setTitle]         = useState("");
  const [fileplanId, setFileplanId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // dropdown data
  const [fileplans, setFileplans]   = useState([]);
  const [categories, setCategories] = useState([]);

  // category-driven dynamic fields: { [field_name]: value }
  const [metaFields, setMetaFields] = useState({});
  const [catSchema, setCatSchema]   = useState([]); // active category fields_json

  const [loadingDD, setLoadingDD]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
  if (!isEdit) return;
  if (!window.confirm("Delete this file? This will remove its metadata too.")) return;
  setDeleting(true);
  try {
    await getJSON(`/api/rm/register/files/${initial.id}`, {
      method: "DELETE",
      headers: { ...authHeaders() }
    });
    onClose(true);            // close + let parent refresh
    if (typeof onSaved === "function") onSaved({ deleted: true });
  } catch (e) {
    setMsg({ type: "error", text: e.message || "Delete failed" });
  } finally {
    setDeleting(false);
  }
}

  // load dropdowns whenever opened
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoadingDD(true);
      setMsg(null);
      try {
        const [fps, cats] = await Promise.all([
          getJSON(ENDPOINTS.fileplans),
          getJSON(ENDPOINTS.categories),
        ]);
        if (!alive) return;
        setFileplans(asItems(fps));
        setCategories(asItems(cats));
      } catch (e) {
        setMsg({ type: "error", text: e.message || "Failed to load dropdowns" });
      } finally {
        if (alive) setLoadingDD(false);
      }
    })();
    return () => { alive = false; };
  }, [open]);

 
  // prefill when editing
useEffect(() => {
  if (!open) return;

  setMsg(null);
  setMetaFields({});
  setCatSchema([]);

  if (!initial?.id) {
    // creating new
    setFileQR("");
    setTitle("");
    setFileplanId("");
    setCategoryId("");
    return;
  }

  // editing: load full file + dm_data
  (async () => {
    try {
      const { file, dm_data } = await getJSON(ENDPOINTS.oneFile(initial.id));

      setFileQR(file?.fileid || file?.record_id || "");
      setTitle(file?.title || "");
      setFileplanId(file?.fileplan_id || "");

      // choose category from dm_data first, fallback to file
      const catId = dm_data?.category_id ?? file?.category_id ?? "";
      setCategoryId(catId ? String(catId) : "");

      if (dm_data?.de_data && typeof dm_data.de_data === "object") {
        setMetaFields(dm_data.de_data);
      } else {
        setMetaFields({});
      }
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Failed to load file details" });
    }
  })();
}, [open, initial]);


  // when category changes, compute the schema and set blanks/defaults
  useEffect(() => {
    const cat = categories.find(c => String(c.id) === String(categoryId));
    const schemaArr = Array.isArray(cat?.fields_json) ? cat.fields_json : [];
    setCatSchema(schemaArr);

    // initialize missing fields
    const next = { ...metaFields };
    schemaArr.forEach(f => {
      const k = f.field_name;
      if (!(k in next)) {
        next[k] = f.input_type === "checkbox" ? false : "";
      }
    });
    // drop fields that no longer exist
    Object.keys(next).forEach(k => {
      if (!schemaArr.some(f => f.field_name === k)) delete next[k];
    });
    setMetaFields(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, categories]);

  const setMeta = (k, v) => setMetaFields(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    if (!fileQR.trim()) return "File QR Code is required.";
    if (!title.trim())  return "File Name is required.";
    if (!fileplanId)    return "Select a Fileplan.";
    if (!categoryId)    return "Select a Category.";
    for (const f of catSchema) {
      if (f.mandatory && !String(metaFields[f.field_name] ?? "").trim()) {
        return `Field "${f.field_name}" is mandatory.`;
      }
    }
    return "";
  };

  const submit = async () => {
    const err = validate();
    if (err) { setMsg({ type: "error", text: err }); return; }
    setSaving(true); setMsg(null);

    const payload = {
      // file master part
      fileid: fileQR.trim(),
      title:  title.trim(),
      fileplan_id: fileplanId ? Number(fileplanId) : null,
      category_id: categoryId ? Number(categoryId) : null,

      // dm_data part
      entity_type: "file",
      metadata: metaFields,

      // if editing, include ID so backend upserts
      id: isEdit ? initial.id : undefined,
    };

    try {
      const out = await getJSON(ENDPOINTS.registerFile, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      onClose(true);
      if (typeof onSaved === "function") onSaved(out);
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {isEdit ? "Edit File" : "Register New File"}
        <IconButton onClick={() => onClose(false)} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

        <Stack spacing={2}>
          {loadingDD && <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} /> Loading…
          </Box>}

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="File QR Code *" value={fileQR} onChange={e => setFileQR(e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="File Name *" value={title} onChange={e => setTitle(e.target.value)} fullWidth />
            </Grid>

            <Grid item xs={12} md={6}>
              <Select
                value={String(fileplanId || "")}
                onChange={e => setFileplanId(e.target.value)}
                displayEmpty
                fullWidth
              >
                <MenuItem value=""><em>Select Fileplan</em></MenuItem>
                {fileplans.map(fp => (
                  <MenuItem key={fp.id} value={fp.id}>
                    {fp.code ? `${fp.code} — ${fp.title || ""}` : (fp.title || `#${fp.id}`)}
                  </MenuItem>
                ))}
              </Select>
            </Grid>

            <Grid item xs={12} md={6}>
              <Select
                value={String(categoryId || "")}
                onChange={e => setCategoryId(e.target.value)}
                displayEmpty
                fullWidth
              >
                <MenuItem value=""><em>Select Category</em></MenuItem>
                {categories.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name || c.code || `#${c.id}`}</MenuItem>
                ))}
              </Select>
            </Grid>
          </Grid>

          {/* Dynamic fields */}
          {!!catSchema.length && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Metadata Fields</Typography>
              <Grid container spacing={2}>
                {catSchema.map(f => {
                  const k = f.field_name;
                  const val = metaFields[k] ?? (f.input_type === "checkbox" ? false : "");
                  const label = `${f.field_name}${f.mandatory ? " *" : ""}`;

                  if (f.input_type === "textarea") {
                    return (
                      <Grid item xs={12} key={k}>
                        <TextField
                          label={label}
                          value={val}
                          onChange={e => setMeta(k, e.target.value)}
                          fullWidth multiline minRows={2}
                        />
                      </Grid>
                    );
                  }

                  if (f.input_type === "checkbox") {
                    return (
                      <Grid item xs={12} md={6} key={k} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Checkbox
                          checked={!!val}
                          onChange={e => setMeta(k, e.target.checked)}
                        />
                        <Typography>{label}</Typography>
                      </Grid>
                    );
                  }

                  if (f.input_type === "radio" || f.input_type === "dropdownlist") {
                    const opts = String(f.options_csv || "")
                      .split(",")
                      .map(s => s.trim())
                      .filter(Boolean);
                    return (
                      <Grid item xs={12} md={6} key={k}>
                        <Select
                          value={String(val || "")}
                          onChange={e => setMeta(k, e.target.value)}
                          displayEmpty
                          fullWidth
                        >
                          <MenuItem value=""><em>{label}</em></MenuItem>
                          {opts.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </Select>
                      </Grid>
                    );
                  }

                  if (f.input_type === "date") {
                    return (
                      <Grid item xs={12} md={6} key={k}>
                        <TextField
                          type="date"
                          label={label}
                          InputLabelProps={{ shrink: true }}
                          value={val ? String(val).substring(0, 10) : ""}
                          onChange={e => setMeta(k, e.target.value)}
                          fullWidth
                        />
                      </Grid>
                    );
                  }

                  const type = f.input_type === "integer" ? "number" :
                               f.input_type === "image"   ? "text"    : "text";

                  return (
                    <Grid item xs={12} md={6} key={k}>
                      <TextField
                        label={label}
                        type={type}
                        value={val}
                        onChange={e => setMeta(k, e.target.value)}
                        fullWidth
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
  {isEdit && (
    <Button
      color="error"
      onClick={doDelete}
      disabled={deleting || saving}
      sx={{ mr: 'auto' }}
    >
      {deleting ? "Deleting…" : "Delete"}
    </Button>
  )}
  <Button onClick={() => onClose(false)} disabled={saving || deleting}>Close</Button>
  <Button onClick={submit} variant="contained" disabled={saving || deleting}>
    {saving ? "Saving…" : (isEdit ? "Update" : "Submit")}
  </Button>
</DialogActions>

    </Dialog>
  );
}

/* =======================================================================
   Assign To Box Modal (stub – submit wiring later)
   ======================================================================= */
function AssignToBoxModal({ open, onClose, selectedIds = [] }) {
  const [boxId, setBoxId] = useState("");
  useEffect(() => { if (!open) setBoxId(""); }, [open]);

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Assign to Box</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Selected files: {selectedIds.length}
        </Typography>
        <TextField
          label="Box ID"
          value={boxId}
          onChange={(e) => setBoxId(e.target.value)}
          fullWidth
        />
        <Alert severity="info" sx={{ mt: 2 }}>
          Submission wiring is pending. You can hook this to your API later.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Close</Button>
        <Button
          variant="contained"
          onClick={() => onClose({ ok: true, boxId })}
          disabled={!boxId.trim()}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* =======================================================================
   Main Page
   ======================================================================= */
export default function RegisterNew() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [sel, setSel] = useState(new Set());            // selected row ids
  const [openRegister, setOpenRegister] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [current, setCurrent] = useState(null);         // row for details/edit

  async function load() {
    setLoading(true); setErr("");
    try {
      const out = await getJSON(ENDPOINTS.listFiles(q));
      setRows(asItems(out));
    } catch (e) {
      setErr(e.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  const toggle = (id) => {
    setSel(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allChecked = useMemo(() => rows.length && sel.size === rows.length, [rows, sel]);
  const toggleAll = () => {
    if (allChecked) setSel(new Set());
    else setSel(new Set(rows.map(r => r.id)));
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={2} lg={2}>
        <LeftMenu />
      </Grid>

      <Grid item xs={12} md={10} lg={10}>
        <Typography variant="h6" sx={{ color: "#f0772c", mb: 2 }}>
          Physical Documents
        </Typography>

        <Card variant="outlined" sx={{ mb: 1 }}>
          <CardContent sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button
              variant="contained"
              onClick={() => { setCurrent(null); setOpenRegister(true); }}
            >
              Register New
            </Button>

            <Button
              variant="outlined"
              disabled={sel.size === 0}
              onClick={() => setOpenAssign(true)}
            >
              Assign to Box
            </Button>

            <TextField
              size="small"
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ width: 280, ml: "auto" }}
            />
          </CardContent>
        </Card>

        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={sel.size > 0 && sel.size < rows.length}
                    checked={!!rows.length && allChecked}
                    onChange={toggleAll}
                  />
                </TableCell>
                <TableCell>File ID</TableCell>
                <TableCell>Department File ID</TableCell>
                <TableCell>Date Created</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Custodian</TableCell>
                <TableCell sx={{ width: 120, fontWeight: 700 }}>View Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={sel.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </TableCell>
                  <TableCell>{r.fileid || r.record_id || ""}</TableCell>
                  <TableCell>{r.deptfileid || r.department_file_id || ""}</TableCell>
                  <TableCell>{formatDate(r.date_created)}</TableCell>
                  <TableCell>{r.rm_status || r.filestatus || ""}</TableCell>
                  <TableCell>{r.custodian || r.custodian_user_id || ""}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => { setCurrent(r); setOpenRegister(true); }}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && !loading && (
                <TableRow><TableCell colSpan={7}>No data</TableCell></TableRow>
              )}
              {loading && (
                <TableRow><TableCell colSpan={7}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} /> Loading…
                  </Box>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {err && <Alert severity="error" sx={{ mt: 1 }}>{err}</Alert>}
      </Grid>

      {/* Modals */}
      <RegisterFileModal
        open={openRegister}
        onClose={(saved) => {
          setOpenRegister(false);
          if (saved) load();              // 🔁 refresh list immediately after save
        }}
        initial={current}
        onSaved={() => load()}
      />

      <AssignToBoxModal
        open={openAssign}
        onClose={() => setOpenAssign(false)}
        selectedIds={[...sel]}
      />
    </Grid>
  );
}


// import React, { useState } from "react";
// import { Box, Button, Grid, MenuItem, TextField, Typography } from "@mui/material";


// export default function RegisterNew({ onClose }){
// const [form, setForm] = useState({
// department: "",
// fileId: "",
// departmentFileId: "",
// softCopy: null,
// recordsClassification: "",
// category: "",
// objectType: "",
// });


// const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));


// return (
// <Box>
// <Typography variant="h6" gutterBottom>Register New Physical Object</Typography>
// <Grid container spacing={2}>
// <Grid item xs={12} md={6}><TextField label="Department" fullWidth value={form.department} onChange={set("department")} /></Grid>
// <Grid item xs={12} md={6}><TextField label="File ID" fullWidth value={form.fileId} onChange={set("fileId")} /></Grid>
// <Grid item xs={12}><TextField label="Department File ID" fullWidth value={form.departmentFileId} onChange={set("departmentFileId")} /></Grid>
// <Grid item xs={12}><Button variant="outlined" component="label">Upload Soft Copy<input type="file" hidden /></Button></Grid>
// <Grid item xs={12} md={6}><TextField label="Records Classification" select fullWidth value={form.recordsClassification} onChange={set("recordsClassification")}>
// <MenuItem value="Finance Records">Finance Records</MenuItem>
// </TextField></Grid>
// <Grid item xs={12} md={6}><TextField label="Select Category" select fullWidth value={form.category} onChange={set("category")}>
// <MenuItem value="Finance">Finance</MenuItem>
// </TextField></Grid>
// <Grid item xs={12} md={6}><TextField label="Object Type" select fullWidth value={form.objectType} onChange={set("objectType")}>
// <MenuItem value="Box/Media">Box/Media</MenuItem>
// </TextField></Grid>
// <Grid item xs={12} md={6} textAlign="right"><Button variant="contained" onClick={onClose}>Save</Button></Grid>
// </Grid>
// </Box>
// );
// }