// src/rm/metadata/MetadataCategoryModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, TextField, Button, Table, TableHead, TableRow,
  TableCell, TableBody, Checkbox, FormControlLabel, Select, MenuItem, Alert, IconButton
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { authHeaders } from "../../../utils/authHeaders";
import { safeJson } from "../../../utils/safeJson";

const INPUT_TYPES = ["text","textarea","checkbox","radio","image","date","integer","dropdownlist"];
const DATE_GRANULARITIES = ["date","month","year"];

const defaultInputFor = (dataType) => {
  const t = String(dataType || "").toLowerCase();
  if (t.includes("int")) return "integer";
  if (t.includes("bool")) return "checkbox";
  if (t.includes("date") || t.includes("time")) return "date";
  return "text";
};

export default function MetadataCategoryModal({
  open,
  onClose,
  title = "Metadata Category",
  endpoint = "/api/rm/metadata-categories",
  item = null,              // when editing
}) {
  const isEdit = !!item?.id;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [rows, setRows] = useState([]); // field rows
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // prefill on open / edit
  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setCode(item?.code ?? "");
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setIsActive(item?.is_active ?? true);

    const fields = Array.isArray(item?.fields_json) ? item.fields_json : [];
    setRows(fields.map(f => ({
      field_name: f.field_name || "",
      data_type: f.data_type || "text",            // logical data type
      input_type: f.input_type || defaultInputFor(f.data_type),
      options_csv: f.options_csv || "",
      date_granularity: f.date_granularity || "date",
      mandatory: !!f.mandatory,
    })));
  }, [open, item]);

  const addRow = () => {
    setRows(prev => [
      ...prev,
      {
        field_name: "",
        data_type: "text",
        input_type: "text",
        options_csv: "",
        date_granularity: "date",
        mandatory: false,
      },
    ]);
  };

  const removeRow = (idx) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const setCell = (idx, key, val) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  };

  const validate = () => {
    if (!code.trim() || !name.trim()) return "Code and Name are required.";
    const names = rows.map(r => r.field_name.trim()).filter(Boolean);
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) return `Duplicate field name: ${dup}`;
    for (const r of rows) {
      if (!r.field_name.trim()) return "Every row needs a Field Name.";
      if (["radio","dropdownlist"].includes(r.input_type) && !r.options_csv.trim()) {
        return `Options required for ${r.field_name} (${r.input_type}).`;
      }
    }
    return "";
  };

  const submit = async () => {
    setMsg(null);
    const err = validate();
    if (err) { setMsg({ type: "error", text: err }); return; }

    const payload = {
      code: code.trim(),
      name: name.trim(),
      description: description || null,
      is_active: !!isActive,
      fields_json: rows.map(r => ({
        field_name: r.field_name.trim(),
        data_type: r.data_type,
        input_type: r.input_type,
        options_csv: r.options_csv || "",
        date_granularity: r.date_granularity || "date",
        mandatory: !!r.mandatory,
      })),
    };

    setSaving(true);
    try {
      const url = isEdit ? `${endpoint}/${encodeURIComponent(item.id)}` : endpoint;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const out = await safeJson(res);
      if (!res.ok) throw new Error(out?.error || `HTTP ${res.status}`);
      onClose(true); // notify page to reload
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="md">
      <DialogTitle>{isEdit ? `Edit ${title}` : `Create ${title}`}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Code" value={code} onChange={e => setCode(e.target.value)} fullWidth />
            <TextField label="Name" value={name} onChange={e => setName(e.target.value)} fullWidth />
          </Box>
          <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} multiline minRows={2} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Checkbox checked={!!isActive} onChange={e => setIsActive(e.target.checked)} />
            Active
          </Box>
        </Stack>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <strong>Category Fields</strong>
          <Button variant="contained" onClick={addRow}>Add</Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Field Name</TableCell>
              <TableCell>Data Type</TableCell>
              <TableCell>Input Type</TableCell>
              <TableCell>Options (comma-separated)</TableCell>
              <TableCell>Date granularity</TableCell>
              <TableCell align="center">Mandatory</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => {
              const showOpts = ["radio","dropdownlist"].includes(r.input_type);
              const showGran = r.input_type === "date";
              return (
                <TableRow key={idx}>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="Field Name"
                      value={r.field_name}
                      onChange={e => setCell(idx, "field_name", e.target.value)}
                      fullWidth
                    />
                  </TableCell>

                  <TableCell>
                    <Select
                      size="small"
                      value={r.data_type}
                      onChange={e => {
                        const dt = e.target.value;
                        setCell(idx, "data_type", dt);
                        setCell(idx, "input_type", defaultInputFor(dt));
                      }}
                      fullWidth
                    >
                      <MenuItem value="text">text</MenuItem>
                      <MenuItem value="integer">integer</MenuItem>
                      <MenuItem value="boolean">boolean</MenuItem>
                      <MenuItem value="date">date</MenuItem>
                      <MenuItem value="decimal">decimal</MenuItem>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <Select
                      size="small"
                      value={r.input_type}
                      onChange={e => setCell(idx, "input_type", e.target.value)}
                      fullWidth
                    >
                      {INPUT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="e.g. Male,Female,Other"
                      value={r.options_csv}
                      onChange={e => setCell(idx, "options_csv", e.target.value)}
                      disabled={!showOpts}
                      fullWidth
                    />
                  </TableCell>

                  <TableCell>
                    <Select
                      size="small"
                      value={r.date_granularity}
                      onChange={e => setCell(idx, "date_granularity", e.target.value)}
                      disabled={!showGran}
                      fullWidth
                    >
                      {DATE_GRANULARITIES.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                    </Select>
                  </TableCell>

                  <TableCell align="center">
                    <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!r.mandatory}
                            onChange={e => setCell(idx, "mandatory", e.target.checked)}
                          />
                        }
                        label=""
                        />
                  </TableCell>

                  <TableCell align="right">
                    <IconButton onClick={() => removeRow(idx)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {!rows.length && (
              <TableRow><TableCell colSpan={7}>No fields. Click “Add”.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>

        {msg && <Alert severity={msg.type} sx={{ mt: 2 }}>{msg.text}</Alert>}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={saving}>Close</Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? "Saving…" : (isEdit ? "Update" : "Submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
