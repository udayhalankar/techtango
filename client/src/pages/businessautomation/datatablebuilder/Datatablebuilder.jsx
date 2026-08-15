// src/pages/sbforms/Datatablebuilder.jsx
import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";
import FormViewsTab from "../sbforms/FormViewsTab";

// MUI
import {
  Box,
  Button, Toolbar, Container, OutlinedInput, InputAdornment,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Table, Paper, TableContainer, 
  TableBody, Pagination, 
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutline";
import {
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import ModeEditOutlineOutlinedIcon from "@mui/icons-material/ModeEditOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline"

// Keep your tabs list if you later re-enable tab switching UI
const TABS = ["Templates", "Forms Views", "Report Views", "Create Query", "Chart Views"];

// Layout constants — mirror processservicerequest
const NAVBAR_H = 66;         // height of your top AppBar
const SIDENAV_W = 232;       // width of the fixed left panel

// Compact table paddings (like processservicerequest)
const ROW_PY = 0.4;
const CELL_PX = 1;
const HEADER_PY = 0.6;

const camelToSnake = (str) =>
  String(str || "").replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const Datatablebuilder = () => {
  const embedded = new URLSearchParams(window.location.search).get("embedded") === "1";
  const embeddedPageId = new URLSearchParams(window.location.search).get("pageId");
  // ── original state (kept as-is) ───────────────────────────────
  const [activeTab, setActiveTab] = useState("Templates");
  const [showFormModal, setShowFormModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [fields, setFields] = useState([]);
  const [newField, setNewField] = useState({ name: "", type: "text", inputtype: "text", options: "" });
  const [templateList, setTemplateList] = useState([]);

  const [newFieldName, setNewFieldName] = useState("");
  const [newInputType, setNewInputType] = useState("text");
  const [newRadioOptions, setNewRadioOptions] = useState("");
  const [newDateFormat, setNewDateFormat] = useState("full");
  const [formFields, setFormFields] = useState([]);
  const [validationMode, setValidationMode] = useState("create");
  const [validationsByMode, setValidationsByMode] = useState({ create: {}, edit: {} });
  const [accessJson, setAccessJson] = useState("{}");
  const [editSection, setEditSection] = useState("validations");
  const [autoOpen, setAutoOpen] = useState(null);
  const [showViewBuilder, setShowViewBuilder] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef();
  const iconWrapperRef = useRef();

// search + paging
const [search, setSearch] = useState("");
const [page, setPage] = useState(1);
const PER_PAGE = 10;

const filtered = React.useMemo(
  () => (templateList || []).filter(t =>
    String(t.template_name || "").toLowerCase().includes(search.toLowerCase())
  ),
  [templateList, search]
);

useEffect(() => { setPage(1); }, [search, templateList]);

const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
const start = (page - 1) * PER_PAGE;
const paged  = filtered.slice(start, start + PER_PAGE);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (iconWrapperRef.current && !iconWrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get("table");
    const section = params.get("section");
    if (table) {
      setAutoOpen({ table, section: section || "validations" });
    }
  }, []);

  // Keep your original helper (even if unused)
  const addField = () => {
    const nameRegex = /^[a-z0-9]{1,20}$/;
    if (!newField.name.trim()) return alert("Field name is required.");
    if (!nameRegex.test(newField.name)) return alert("Field name must be lowercase letters and numbers only, max 20 characters.");
    if (!newField.inputtype) return alert("Please select an input type.");
    setFields([...fields, newField]);
    setNewField({ name: "", type: "text", inputtype: "" });
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await api.get("/templates/list");
        setTemplateList(res.data || []);
      } catch (err) {
        console.error("Failed to load templates", err);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!autoOpen || !templateList.length) return;
    const tpl = (templateList || []).find((t) => t?.table_name === autoOpen.table);
    if (tpl) {
      setEditSection(autoOpen.section || "validations");
      openEditModal(tpl, autoOpen.section || "validations");
    }
    setAutoOpen(null);
  }, [autoOpen, templateList]);

  const [editModal, setEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const prevEditModalRef = useRef(editModal);

  useEffect(() => {
    if (!embedded) return;
    if (prevEditModalRef.current && !editModal) {
      window.parent?.postMessage({ type: "closeTemplateModal" }, "*");
    }
    prevEditModalRef.current = editModal;
  }, [embedded, editModal]);

  useEffect(() => {
    if (!embedded) return;
    const prevBodyBg = document.body.style.background;
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyMargin = document.body.style.margin;
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    document.body.style.margin = "0";
    return () => {
      document.body.style.background = prevBodyBg;
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.margin = prevBodyMargin;
    };
  }, [embedded]);

  useEffect(() => {
    if (!embedded || !embeddedPageId) return;
    const loadConfig = async () => {
      try {
        const res = await api.get(`/crudpages/${embeddedPageId}`);
        const v = res?.data?.validations;
        if (v) {
          const parsed = typeof v === "string" ? JSON.parse(v) : v;
          setValidationsByMode({
            create: parsed?.create || {},
            edit: parsed?.edit || {},
          });
        }
        if (res?.data?.create_edit) {
          setValidationMode(res.data.create_edit);
        }
      } catch (err) {
        console.error("Failed to load validation config:", err);
      }
    };
    loadConfig();
  }, [embedded, embeddedPageId]);

  const openEditModal = async (tpl, section = "validations") => {
    setSelectedTemplate(tpl);
    setTemplateName(tpl?.template_name || "");
    setNewFieldName("");
    setNewInputType("text");
    setNewRadioOptions("");
    setNewDateFormat("full");
    setValidationMode("create");
    setEditSection(section);
    const parsedValidations =
      typeof tpl?.validations === "string"
        ? (() => {
            try {
              return JSON.parse(tpl.validations || "{}");
            } catch {
              return {};
            }
          })()
        : tpl?.validations || {};
    setValidationsByMode({
      create: parsedValidations?.create || {},
      edit: parsedValidations?.edit || {},
    });
    const parsedAccess =
      typeof tpl?.access === "string"
        ? (() => {
            try {
              return JSON.parse(tpl.access || "{}");
            } catch {
              return {};
            }
          })()
        : tpl?.access || {};
    setAccessJson(JSON.stringify(parsedAccess || {}, null, 2));
    setEditModal(true);
    if (!tpl?.id) return;
    try {
      const res = await api.get(`/templates/${tpl.id}/fields`);
      setFormFields(res.data || []);
    } catch (err) {
      alert("Failed to load template fields.");
      console.error(err);
    }
  };

  const handleUpdateTemplate = async () => {
    if (embedded && embeddedPageId) {
      const normalizedValidations = normalizeValidations(formFields, validationsByMode);
      try {
        await api.put(`/crudpages/${embeddedPageId}/validation-config`, {
          validations: normalizedValidations,
          createEdit: validationMode,
        });
        alert("Changes saved successfully.");
        setEditModal(false);
      } catch (err) {
        alert(err?.response?.data?.error || "Failed to update validations.");
        console.error(err);
      }
      return;
    }
    if (!selectedTemplate?.id) return;
    let accessObj = {};
    try {
      accessObj = JSON.parse(accessJson || "{}");
    } catch {
      alert("Access must be valid JSON.");
      return;
    }
    const normalizedValidations = normalizeValidations(formFields, validationsByMode);
    try {
      await api.put(`/templates/${selectedTemplate.id}`, {
        fields: formFields,
        validations: normalizedValidations,
        access: accessObj
      });
      alert("Template updated successfully.");
      setEditModal(false);
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to update template.");
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (tpl, event) => {
    event?.stopPropagation();
    const templateId = tpl?.id ?? tpl?.template_id;
    if (!templateId) {
      alert("Missing template id.");
      return;
    }
    const confirmDelete = window.confirm("Do you want to delete this Data Model?");
    if (!confirmDelete) return;
    try {
      await api.delete(`/templates/${templateId}`);
      setTemplateList((prev) =>
        (prev || []).filter((item) => (item?.id ?? item?.template_id) !== templateId)
      );
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete template.");
      console.error(err);
    }
  };

  const handleAddField = () => {
    const nameRegex = /^[a-z0-9]{1,20}$/;
    if (!nameRegex.test(newFieldName)) {
      alert("Field name must be lowercase letters/numbers, max 20 chars, no spaces/special chars.");
      return;
    }
    if (formFields.some((f) => f.fieldname === newFieldName)) {
      alert("Field name already exists.");
      return;
    }
    let dataType = "TEXT";
    let options = null;
    let format = null;

    if (newInputType === "checkbox") {
      dataType = "INTEGER";
      options = newRadioOptions.split(",").map((opt) => opt.trim()).filter(Boolean);
      if (options.length < 2) {
        alert("Please provide at least 2 options for checkbox.");
        return;
      }
    }
    if (newInputType === "dropdownlist") {
      dataType = "TEXT";
      options = newRadioOptions.split(",").map((opt) => opt.trim()).filter(Boolean);
      if (options.length < 2) {
        alert("Please provide at least 2 options for dropdown list.");
        return;
      }
    }
    if (newInputType === "radio") {
      dataType = "INTEGER";
      options = newRadioOptions.split(",").map((opt) => opt.trim()).filter(Boolean);
      if (options.length < 2) {
        alert("Please provide at least 2 options for radio buttons.");
        return;
      }
    }
    if (newInputType === "image") {
      dataType = "TEXT";
      options = ["attachment"];
    }
    if (newInputType === "date") {
      dataType = "DATE";
      format = newDateFormat;
    }

    const nf = {
      fieldname: newFieldName,
      datatype: dataType,
      inputtype: newInputType,
      options,
      format
    };

    setFormFields([...formFields, nf]);
    const fieldKey = camelToSnake(newFieldName);
    setValidationsByMode((prev) => {
      const base = { data_entry: true, read_only: false, visible: true, mandatory: true };
      return {
        create: { ...(prev.create || {}), [fieldKey]: { ...base, ...(prev.create?.[fieldKey] || {}) } },
        edit: { ...(prev.edit || {}), [fieldKey]: { ...base, ...(prev.edit?.[fieldKey] || {}) } },
      };
    });
    setNewFieldName("");
    setNewInputType("text");
    setNewRadioOptions("");
    setNewDateFormat("full");
  };

  const handleRemoveField = (indexToRemove) => {
    setFormFields((prev) => {
      const next = prev.filter((_, index) => index !== indexToRemove);
      const removed = prev[indexToRemove];
      if (removed?.fieldname) {
        const fieldKey = camelToSnake(removed.fieldname);
        setValidationsByMode((cur) => {
          const { [fieldKey]: _c, ...restCreate } = cur.create || {};
          const { [fieldKey]: _e, ...restEdit } = cur.edit || {};
          return { create: restCreate, edit: restEdit };
        });
      }
      return next;
    });
  };

  const getValidationFor = (fieldname) => {
    const fieldKey = camelToSnake(fieldname);
    const base = { data_entry: true, read_only: false, visible: true, mandatory: true };
    const mode = validationMode;
    return { ...base, ...(validationsByMode?.[mode]?.[fieldKey] || {}) };
  };

  const updateValidationFor = (fieldname, patch) => {
    const fieldKey = camelToSnake(fieldname);
    const mode = validationMode;
    setValidationsByMode((prev) => {
      const current = prev?.[mode]?.[fieldKey] || {};
      return {
        ...prev,
        [mode]: { ...(prev?.[mode] || {}), [fieldKey]: { ...current, ...patch } },
      };
    });
  };

  const normalizeValidations = (fields, current) => {
    const base = { data_entry: true, read_only: false, visible: true, mandatory: true };
    const buildMode = (mode) => {
      const out = {};
      (fields || []).forEach((f) => {
        const key = camelToSnake(f.fieldname);
        out[key] = { ...base, ...(current?.[mode]?.[key] || {}) };
      });
      return out;
    };
    return { create: buildMode("create"), edit: buildMode("edit") };
  };

  const handleSaveTemplate = async () => {
    const nameRegex = /^[a-z0-9]+$/;
    const maxLength = 20;
    if (!templateName) return alert("Template name is required.");
    if (!nameRegex.test(templateName)) return alert("Template name must be lowercase letters and numbers only. No spaces or special characters.");
    if (templateName.length > maxLength) return alert("Template name must not exceed 20 characters.");
    if (formFields.length === 0) return alert("Please add at least one field before saving.");

    let accessObj = {};
    try {
      accessObj = JSON.parse(accessJson || "{}");
    } catch {
      alert("Access must be valid JSON.");
      return;
    }
    const normalizedValidations = normalizeValidations(formFields, validationsByMode);

    setShowFormModal(false);
    setTemplateName("");
    setFormFields([]);
    setNewFieldName("");
    setNewInputType("text");
    setNewRadioOptions("");
    setNewDateFormat("full");

    try {
      const payload = { templateName, fields: formFields, createdBy: 1, validations: normalizedValidations, access: accessObj };
      const res = await api.post("/templates/create", payload);
      alert("Template created: " + res.data.table);
      setShowFormModal(false);
      setTemplateName("");
      setFields([]);
    } catch (err) {
      if (err.response?.data?.error?.includes("duplicate")) {
        alert("Template name already exists.");
      } else {
        alert("Error creating template.");
        console.error(err);
      }
    }
  };

  // ── styles for lightweight modal overlays using MUI Box ───────
  const overlaySx = {
    position: "fixed",
    inset: 0,
    bgcolor: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1300
  };
  const embeddedOverlaySx = {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: "transparent",
    zIndex: 1300
  };
  const modalSx = {
    width: embedded ? "min(1000px, 96vw)" : "min(900px, 96vw)",
    maxHeight: "90vh",
    overflowY: "auto",
    bgcolor: "background.paper",
    borderRadius: 2,
    boxShadow: 8,
    p: 2,
    position: "relative"
  };
  const closeBtnSx = {
    position: "absolute",
    top: 8,
    right: 12,
    border: "none",
    background: "transparent",
    fontSize: 24,
    cursor: "pointer",
    lineHeight: 1
  };

  // ── UI (cosmetic only) ────────────────────────────────────────
  if (embedded) {
    return (
      <>
        {editModal && selectedTemplate && (
          <Box sx={embeddedOverlaySx} onClick={() => setEditModal(false)}>
            <Box sx={modalSx} onClick={(e) => e.stopPropagation()}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Edit Template: {selectedTemplate.template_name}
              </Typography>

              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                <input
                  type="text"
                  placeholder="Template Name"
                  value={templateName}
                  readOnly
                  style={{ flex: "1 1 280px", padding: 8 }}
                />
                {embedded && (
                  <select
                    value={validationMode}
                    onChange={(e) => setValidationMode(e.target.value)}
                    style={{ flex: "0 0 120px", padding: 8 }}
                    disabled={editSection !== "validations"}
                  >
                    <option value="create">Create</option>
                    <option value="edit">Edit</option>
                  </select>
                )}
              </Box>
              <Typography variant="caption" sx={{ display: "block", mb: 2 }}>
                Only lowercase letters and numbers, max 20 characters. No spaces or special characters.
              </Typography>

              {!embedded && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                  <input
                    type="text"
                    placeholder="Field Name"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    style={{ flex: "1 1 180px", padding: 8 }}
                  />

                  <select
                    value={newInputType}
                    onChange={(e) => {
                      setNewInputType(e.target.value);
                      setNewRadioOptions("");
                      setNewDateFormat("full");
                    }}
                    style={{ flex: "0 0 180px", padding: 8 }}
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="radio">Radio Button</option>
                    <option value="image">Attachment</option>
                    <option value="date">Date</option>
                    <option value="integer">Integer</option>
                    <option value="dropdownlist">Dropdownlist</option>
                  </select>

                  {newInputType === "checkbox" && (
                    <input
                      type="text"
                      placeholder="Checkbox options (e.g. Option A, Option B)"
                      value={newRadioOptions}
                      onChange={(e) => setNewRadioOptions(e.target.value)}
                      style={{ flex: "1 1 220px", padding: 8 }}
                    />
                  )}

                  {newInputType === "radio" && (
                    <input
                      type="text"
                      placeholder="Radio options (e.g. Yes,No,Maybe)"
                      value={newRadioOptions}
                      onChange={(e) => setNewRadioOptions(e.target.value)}
                      style={{ flex: "1 1 220px", padding: 8 }}
                    />
                  )}

                  {newInputType === "dropdownlist" && (
                    <input
                      type="text"
                      placeholder="Dropdown options (e.g. Option A, Option B)"
                      value={newRadioOptions}
                      onChange={(e) => setNewRadioOptions(e.target.value)}
                      style={{ flex: "1 1 220px", padding: 8 }}
                    />
                  )}

                  {newInputType === "date" && (
                    <select
                      value={newDateFormat}
                      onChange={(e) => setNewDateFormat(e.target.value)}
                      style={{ flex: "0 0 220px", padding: 8 }}
                    >
                      <option value="full">Full Date (dd/mm/yyyy)</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                      <option value="day">Day Only</option>
                    </select>
                  )}

                  <Button variant="contained" size="small" onClick={handleAddField}>
                    Add Field
                  </Button>
                </Box>
              )}

              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Field Name</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Data Type</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Input Type</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Options / Format</th>
                    {embedded && (
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Validations</th>
                    )}
                    {!embedded && (
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {formFields.map((field, index) => {
                    const validations = getValidationFor(field.fieldname);
                    const lockVisible = validations.read_only || validations.mandatory;
                    const lockDataEntry = validations.read_only;
                    const lockMandatory = validations.read_only;
                    return (
                      <tr key={index}>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.fieldname}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.datatype}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.inputtype}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          {Array.isArray(field.options)
                            ? field.options.join(", ")
                            : field.options || field.format || "-"}
                        </td>
                        {embedded && (
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <input
                                type="checkbox"
                                checked={!!validations.data_entry}
                                disabled={lockDataEntry}
                                onChange={(e) =>
                                  updateValidationFor(field.fieldname, { data_entry: e.target.checked })
                                }
                              />
                              Data entry
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <input
                                type="checkbox"
                                checked={!!validations.read_only}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  if (checked) {
                                    updateValidationFor(field.fieldname, {
                                      read_only: true,
                                      data_entry: false,
                                      mandatory: false,
                                      visible: true,
                                    });
                                  } else {
                                    updateValidationFor(field.fieldname, { read_only: false });
                                  }
                                }}
                              />
                              Read only
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <input
                                type="checkbox"
                                checked={!!validations.visible}
                                disabled={lockVisible}
                                onChange={(e) =>
                                  updateValidationFor(field.fieldname, { visible: e.target.checked })
                                }
                              />
                              Visible
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <input
                                type="checkbox"
                                checked={!!validations.mandatory}
                                disabled={lockMandatory}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  if (checked) {
                                    updateValidationFor(field.fieldname, {
                                      mandatory: true,
                                      data_entry: true,
                                      visible: true,
                                    });
                                  } else {
                                    updateValidationFor(field.fieldname, { mandatory: false });
                                  }
                                }}
                              />
                              Mandatory
                            </label>
                          </Box>
                          </td>
                        )}
                        {!embedded && (
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                            <button
                              onClick={() => handleRemoveField(index)}
                              style={{
                                padding: "4px 8px",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer"
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {editSection === "access" && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Access (JSON)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    value={accessJson}
                    onChange={(e) => setAccessJson(e.target.value)}
                    placeholder='{"roles":["admin"],"users":[1,2]}'
                  />
                </Box>
              )}

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="contained" onClick={handleUpdateTemplate}>
                  Save Changes
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const confirmClose = window.confirm("All data will be lost. Do you want to continue?");
                    if (confirmClose) {
                      setEditModal(false);
                      setTemplateName("");
                      setFormFields([]);
                      setNewFieldName("");
                      setNewInputType("text");
                      setNewRadioOptions("");
                      setNewDateFormat("full");
                    }
                  }}
                >
                  Close
                </Button>
              </Stack>

              <button style={closeBtnSx} onClick={() => setEditModal(false)}>
                x
              </button>
            </Box>
          </Box>
        )}
      </>
    );
  }
  if (true) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
        <Box sx={{ display: embedded ? "none" : "block" }}>
          <Box sx={{ bgcolor: "#1f355d", color: "#fff", px: 4, py: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Entity Data Model Builder
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
              Create and manage data model templates for your business forms.  Build reusable schemas for consistent data structures.
            </Typography>
            {/* <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
              Build reusable schemas and keep your data structures consistent.
            </Typography> */}
          </Box>
        </Box>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ maxWidth: 1200, mx: "auto", borderRadius: 2, p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap"
              }}
            >
              <Button
                variant="contained"
                onClick={() => {
                  setTemplateName("");
                  setFormFields([]);
                  setNewFieldName("");
                  setNewInputType("text");
                  setNewRadioOptions("");
                  setNewDateFormat("full");
                  setValidationMode("create");
                  setValidationsByMode({ create: {}, edit: {} });
                  setAccessJson("{}");
                  setEditSection("validations");
                  setShowFormModal(true);
                }}
                sx={{ bgcolor: "#1f355d", textTransform: "none" }}
              >
                Create New Template
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <TextField
                size="small"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ sx: { bgcolor: "#f8fafc" } }}
                sx={{ flex: "1 1 320px", maxWidth: 520 }}
              />
              
            </Box>

            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                {filtered.map((tpl, i) => (
                  <Grid item key={tpl.id ?? tpl.template_id ?? i} xs={12} sm={6} md={3}>
                    <Paper
                      elevation={0}
                      onClick={() => openEditModal(tpl)}
                      sx={{
                        bgcolor: "#ffffff",
                        color: "#1f355d",
                        border: "1px solid #2f5fff",
                        boxShadow: "0 4px 10px rgba(16, 24, 40, 0.16)",
                        borderRadius: 2,
                        p: 2,
                        minHeight: 160,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 1.5,
                        position: "relative",
                        cursor: "pointer",
                        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 10px 18px rgba(16, 24, 40, 0.22)",
                          borderColor: "#1a4fd8",
                        },
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#1a4fd8" }}>
                          {tpl.template_name || "Untitled Template"}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#51607d", mt: 1 }}>
                          Template ID: {tpl.id ?? tpl.template_id ?? "-"}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#51607d" }}>
                          Created by: {tpl.created_by ?? "-"}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#51607d" }}>
                          Last Modified:{" "}
                          {tpl.created_at ? new Date(tpl.created_at).toLocaleDateString() : "-"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          sx={{ textTransform: "none" }}
                          onClick={(event) => handleDeleteTemplate(tpl, event)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ textTransform: "none" }}
                          onClick={(event) => {
                            event.stopPropagation();
                            alert("TODO: Manage access");
                          }}
                        >
                          Manage Access
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {editModal && selectedTemplate && (
              <Box
                sx={embedded ? { p: 0 } : overlaySx}
                onClick={embedded ? undefined : () => setEditModal(false)}
              >
                <Box sx={modalSx} onClick={(e) => e.stopPropagation()}>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Edit Template: {selectedTemplate.template_name}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                    <input
                      type="text"
                      placeholder="Template Name"
                      value={templateName}
                      readOnly
                      style={{ flex: "1 1 280px", padding: 8 }}
                    />
                    {embedded && (
                      <select
                        value={validationMode}
                        onChange={(e) => setValidationMode(e.target.value)}
                        style={{ flex: "0 0 120px", padding: 8 }}
                        disabled={editSection !== "validations"}
                      >
                        <option value="create">Create</option>
                        <option value="edit">Edit</option>
                      </select>
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ display: "block", mb: 2 }}>
                    Only lowercase letters and numbers, max 20 characters. No spaces or special characters.
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                    <input
                      type="text"
                      placeholder="Field Name"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      style={{ flex: "1 1 180px", padding: 8 }}
                    />

                    <select
                      value={newInputType}
                      onChange={(e) => {
                        setNewInputType(e.target.value);
                        setNewRadioOptions("");
                        setNewDateFormat("full");
                      }}
                      style={{ flex: "0 0 180px", padding: 8 }}
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="radio">Radio Button</option>
                      <option value="image">Attachment</option>
                      <option value="date">Date</option>
                      <option value="integer">Integer</option>
                      <option value="dropdownlist">Dropdownlist</option>
                    </select>

                    {newInputType === "checkbox" && (
                      <input
                        type="text"
                        placeholder="Checkbox options (e.g. Option A, Option B)"
                        value={newRadioOptions}
                        onChange={(e) => setNewRadioOptions(e.target.value)}
                        style={{ flex: "1 1 220px", padding: 8 }}
                      />
                    )}

                    {newInputType === "radio" && (
                      <input
                        type="text"
                        placeholder="Radio options (e.g. Yes,No,Maybe)"
                        value={newRadioOptions}
                        onChange={(e) => setNewRadioOptions(e.target.value)}
                        style={{ flex: "1 1 220px", padding: 8 }}
                      />
                    )}

                    {newInputType === "dropdownlist" && (
                      <input
                        type="text"
                        placeholder="Dropdown options (e.g. Option A, Option B)"
                        value={newRadioOptions}
                        onChange={(e) => setNewRadioOptions(e.target.value)}
                        style={{ flex: "1 1 220px", padding: 8 }}
                      />
                    )}

                    {newInputType === "date" && (
                      <select
                        value={newDateFormat}
                        onChange={(e) => setNewDateFormat(e.target.value)}
                        style={{ flex: "0 0 220px", padding: 8 }}
                      >
                        <option value="full">Full Date (dd/mm/yyyy)</option>
                        <option value="month">Month</option>
                        <option value="year">Year</option>
                        <option value="day">Day Only</option>
                      </select>
                    )}

                    <Button variant="contained" size="small" onClick={handleAddField}>
                      Add Field
                    </Button>
                  </Box>

                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Field Name</th>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Data Type</th>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Input Type</th>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Options / Format</th>
                        {embedded && (
                          <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Validations</th>
                        )}
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formFields.map((field, index) => (
                        <tr key={index}>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.fieldname}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.datatype}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.inputtype}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                            {Array.isArray(field.options)
                              ? field.options.join(", ")
                              : field.options || field.format || "-"}
                          </td>
                          {embedded && (
                            <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", fontSize: 12 }}>
                                {(() => {
                                  const v = getValidationFor(field.fieldname);
                                  return (
                                    <>
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={!!v.data_entry}
                                          onChange={(e) => updateValidationFor(field.fieldname, { data_entry: e.target.checked })}
                                        />{" "}
                                        Data entry
                                      </label>
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={!!v.read_only}
                                          onChange={(e) => updateValidationFor(field.fieldname, { read_only: e.target.checked })}
                                        />{" "}
                                        Read only
                                      </label>
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={!!v.visible}
                                          onChange={(e) => updateValidationFor(field.fieldname, { visible: e.target.checked })}
                                        />{" "}
                                        Visible
                                      </label>
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={!!v.mandatory}
                                          onChange={(e) => updateValidationFor(field.fieldname, { mandatory: e.target.checked })}
                                        />{" "}
                                        Mandatory
                                      </label>
                                    </>
                                  );
                                })()}
                              </Box>
                            </td>
                          )}
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                            <button
                              onClick={() => handleRemoveField(index)}
                              style={{
                                padding: "4px 8px",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer"
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {editSection === "access" && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Access (JSON)
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        value={accessJson}
                        onChange={(e) => setAccessJson(e.target.value)}
                        placeholder='{"roles":["admin"],"users":[1,2]}'
                      />
                    </Box>
                  )}

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button variant="contained" onClick={handleUpdateTemplate}>
                      Save Changes
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        const confirmClose = window.confirm("All data will be lost. Do you want to continue?");
                        if (confirmClose) {
                          setEditModal(false);
                          setTemplateName("");
                          setFormFields([]);
                          setNewFieldName("");
                          setNewInputType("text");
                          setNewRadioOptions("");
                          setNewDateFormat("full");
                        }
                      }}
                    >
                      Close
                    </Button>
                  </Stack>

                  <button style={closeBtnSx} onClick={() => setEditModal(false)}>
                    x
                  </button>
                </Box>
              </Box>
            )}

            {showFormModal && (
              <Box
                sx={embedded ? { p: 0 } : overlaySx}
                onClick={embedded ? undefined : () => setShowFormModal(false)}
              >
                <Box sx={modalSx} onClick={(e) => e.stopPropagation()}>
                  <Typography variant="h6" sx={{ mb: 1.5 }}>
                    Template Designer
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                    <input
                      type="text"
                      placeholder="Template Name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      style={{ flex: "1 1 280px", padding: 8 }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ display: "block", mb: 2 }}>
                    Only lowercase letters and numbers, max 20 characters. No spaces or special characters.
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                    <input
                      type="text"
                      placeholder="Field Name"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      style={{ flex: "1 1 180px", padding: 8 }}
                    />

                    <select
                      value={newInputType}
                      onChange={(e) => {
                        setNewInputType(e.target.value);
                        setNewRadioOptions("");
                        setNewDateFormat("full");
                      }}
                      style={{ flex: "0 0 180px", padding: 8 }}
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="radio">Radio Button</option>
                      <option value="image">Attachment</option>
                      <option value="date">Date</option>
                      <option value="integer">Integer</option>
                      <option value="dropdownlist">Dropdownlist</option>
                    </select>

                    {newInputType === "checkbox" && (
                      <input
                        type="text"
                        placeholder="Checkbox options (e.g. Option A, Option B)"
                        value={newRadioOptions}
                        onChange={(e) => setNewRadioOptions(e.target.value)}
                        style={{ flex: "1 1 220px", padding: 8 }}
                      />
                    )}

                    {newInputType === "radio" && (
                      <input
                        type="text"
                        placeholder="Radio options (e.g. Yes,No,Maybe)"
                        value={newRadioOptions}
                        onChange={(e) => setNewRadioOptions(e.target.value)}
                        style={{ flex: "1 1 220px", padding: 8 }}
                      />
                    )}

                    {newInputType === "dropdownlist" && (
                      <input
                        type="text"
                        placeholder="Dropdown options (e.g. Option A, Option B)"
                        value={newRadioOptions}
                        onChange={(e) => setNewRadioOptions(e.target.value)}
                        style={{ flex: "1 1 220px", padding: 8 }}
                      />
                    )}

                    {newInputType === "date" && (
                      <select
                        value={newDateFormat}
                        onChange={(e) => setNewDateFormat(e.target.value)}
                        style={{ flex: "0 0 220px", padding: 8 }}
                      >
                        <option value="full">Full Date (dd/mm/yyyy)</option>
                        <option value="month">Month</option>
                        <option value="year">Year</option>
                        <option value="day">Day Only</option>
                      </select>
                    )}

                    <Button variant="contained" size="small" onClick={handleAddField}>
                      Add Field
                    </Button>
                  </Box>

                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Field Name</th>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Data Type</th>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Input Type</th>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Options / Format</th>
                        <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formFields.map((field, index) => (
                        <tr key={index}>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.fieldname}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.datatype}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.inputtype}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                            {Array.isArray(field.options)
                              ? field.options.join(", ")
                              : field.options || field.format || "-"}
                          </td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                            <button
                              onClick={() => handleRemoveField(index)}
                              style={{
                                padding: "4px 8px",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer"
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button variant="contained" onClick={handleSaveTemplate}>
                      Save Template
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        const confirmClose = window.confirm("All data will be lost. Do you want to continue?");
                        if (confirmClose) {
                          setShowFormModal(false);
                          setTemplateName("");
                          setFormFields([]);
                          setNewFieldName("");
                          setNewInputType("text");
                          setNewRadioOptions("");
                          setNewDateFormat("full");
                        }
                      }}
                    >
                      Close
                    </Button>
                  </Stack>

                  <button style={closeBtnSx} onClick={() => setShowFormModal(false)}>
                    x
                  </button>
                </Box>
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    );
  }
  return (
    <Box sx={{ display: "flex" }}>
      {/* LEFT MENU (fixed) */}
      <Box
        sx={{
          position: "fixed",
          top: NAVBAR_H,
          left: 0,
          bottom: 0,
          width: SIDENAV_W,
          bgcolor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
          overflowY: "auto",
          p: 1.25
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Recently Visited
        </Typography>
        <List dense sx={{ "& .MuiListItemButton-root": { py: 0.25 } }}>
          <ListItemButton><ListItemText primary="Report Builder" /></ListItemButton>
          <ListItemButton><ListItemText primary="Chart Builder" /></ListItemButton>
        </List>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Filter Results
        </Typography>
        <Card variant="outlined" sx={{ mb: 1.5 }}>
          <CardContent sx={{ p: 1.25 }}>
            <Typography variant="caption" sx={{ display: "block", fontWeight: 700, mb: 1 }}>
              Data Tables
            </Typography>
            <List dense sx={{ "& .MuiListItemButton-root": { py: 0.25 } }}>
              <ListItemButton><ListItemText primary="Table1" /></ListItemButton>
              <ListItemButton><ListItemText primary="Table2" /></ListItemButton>
              <ListItemButton><ListItemText primary="Table3" /></ListItemButton>
            </List>
          </CardContent>
        </Card>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Business Forms
        </Typography>
        <List dense sx={{ "& .MuiListItemButton-root": { py: 0.25 } }}>
          <ListItemButton><ListItemText primary="Form1" /></ListItemButton>
          <ListItemButton><ListItemText primary="Form2" /></ListItemButton>
          <ListItemButton><ListItemText primary="Form3" /></ListItemButton>
          <ListItemButton><ListItemText primary="Older" /></ListItemButton>
        </List>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Report Builder
        </Typography>
        <List dense sx={{ "& .MuiListItemButton-root": { py: 0.25 } }}>
          <ListItemButton><ListItemText primary="Folders (5)" /></ListItemButton>
          <ListItemButton><ListItemText primary="Files (899)" /></ListItemButton>
          <ListItemButton><ListItemText primary="Boxes (8)" /></ListItemButton>
          <ListItemButton><ListItemText primary="Physical Files (78)" /></ListItemButton>
        </List>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          Chart Builder
        </Typography>
        <List dense sx={{ "& .MuiListItemButton-root": { py: 0.25 } }}>
          <ListItemButton><ListItemText primary="Chart 1" /></ListItemButton>
        </List>
      </Box>

      {/* MAIN CONTENT (fixed area like processservicerequest) */}
      <Box
        sx={{
          position: "fixed",
          top: NAVBAR_H,
          left: SIDENAV_W,
          right: 0,
          bottom: 0,
          overflowY: "auto",
          p: 2
        }}
      >
        <CardContent sx={{ p: 1, pt: 0.5 }}>
          <Grid container alignItems="center" spacing={0}>
            <Grid item xs>
              <Typography
                variant="h6"
                sx={{ color: "#f0772c", mt: 0, mb: 6, fontSize: 22, ml: 1 }}  // was mb: 3
              >
                Datatable Builder
              </Typography>

              {/* Actions row */}
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddCircleOutlineIcon />}
                    size="medium"
                    onClick={() => {
                      setValidationMode("create");
                      setValidationsByMode({ create: {}, edit: {} });
                      setAccessJson("{}");
                      setEditSection("validations");
                      setShowFormModal(true);
                    }}   // ⬅️ keeps your modal intact
                  >
                    Create New Template
                  </Button>
                  <Box sx={{ flexGrow: 1 }} />
                  <OutlinedInput
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                    placeholder="Search templates"
                    sx={{ width: 360 }}
                    startAdornment={
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    }
                  />
                </Stack>
            </Grid>
          </Grid>
        </CardContent>

        {/* Templates list in a compact MUI Table */}
        <Card variant="outlined" sx={{ ml: 1 }}>
          <CardContent sx={{ p: 0 }}>
            <Table
              stickyHeader
              size="small"
              aria-label="templates"
              sx={{
                "& thead .MuiTableCell-root": { py: 0.75, px: 1.25, fontSize: 12, lineHeight: 1.2 },
                "& tbody .MuiTableCell-root": { py: 0.5,  px: 1.25, fontSize: 13, lineHeight: 1.2 },
              }}
            >
              <TableHead
                  sx={{
                    "& .MuiTableCell-root": {
                      bgcolor: "grey.200",   // try "grey.200" for darker
                      fontWeight: 700
                    }
                  }}
                >
                <TableRow sx={{ height: 40 }}>
                  <TableCell sx={{ fontWeight: 700 }}>Template Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date Created</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Edit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      No templates yet
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((tpl, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{tpl.template_name}</TableCell>
                      <TableCell>{tpl.created_at ? new Date(tpl.created_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{tpl.created_by}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ModeEditOutlineOutlinedIcon />}
                          onClick={() => openEditModal(tpl)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          {/* Paging */}
<Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
  <Pagination
    count={totalPages}
    page={page}
    onChange={(_e, p) => setPage(p)}
    size="small"
  />
 </Box>
        </Card>

        {/* Optional: Tabs content area (kept as-is if you enable later) */}
        {activeTab === "Forms Views" && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <FormViewsTab />
          </Box>
        )}

        {/* === Your existing modals, unchanged (just wrapped with MUI Box for styling) === */}

        {/* Create New Form Template modal */}
        {showFormModal && (
          <Box sx={overlaySx} onClick={() => setShowFormModal(false)}>
            <Box sx={modalSx} onClick={(e) => e.stopPropagation()}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Template Designer
              </Typography>

              {/* Native inputs kept to avoid functional changes */}
              <input
                type="text"
                placeholder="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                style={{ width: "100%", padding: 8, marginBottom: 8 }}
              />
              <Typography variant="caption" sx={{ display: "block", mb: 2 }}>
                Only lowercase letters and numbers, max 20 characters. No spaces or special characters.
              </Typography>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                <input
                  type="text"
                  placeholder="Field Name"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  style={{ flex: "1 1 180px", padding: 8 }}
                />

                <select
                  value={newInputType}
                  onChange={(e) => {
                    setNewInputType(e.target.value);
                    setNewRadioOptions("");
                    setNewDateFormat("full");
                  }}
                  style={{ flex: "0 0 180px", padding: 8 }}
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="radio">Radio Button</option>
                      <option value="image">Attachment</option>
                  <option value="date">Date</option>
                  <option value="integer">Integer</option>
                  <option value="dropdownlist">Dropdownlist</option>
                </select>

                {newInputType === "radio" && (
                  <input
                    type="text"
                    placeholder="Radio options (e.g. Yes,No,Maybe)"
                    value={newRadioOptions}
                    onChange={(e) => setNewRadioOptions(e.target.value)}
                    style={{ flex: "1 1 220px", padding: 8 }}
                  />
                )}

                {newInputType === "dropdownlist" && (
                  <input
                    type="text"
                    placeholder="Dropdown options (e.g. Option A, Option B)"
                    value={newRadioOptions}
                    onChange={(e) => setNewRadioOptions(e.target.value)}
                    style={{ flex: "1 1 220px", padding: 8 }}
                  />
                )}

                {newInputType === "date" && (
                  <select
                    value={newDateFormat}
                    onChange={(e) => setNewDateFormat(e.target.value)}
                    style={{ flex: "0 0 220px", padding: 8 }}
                  >
                    <option value="full">Full Date (dd/mm/yyyy)</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                    <option value="day">Day Only</option>
                  </select>
                )}

                <Button variant="contained" size="small" onClick={handleAddField}>
                  Add Field
                </Button>
              </Box>

              {/* fields grid (native table kept) */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Field Name</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Data Type</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Input Type</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Options / Format</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e0e0e0" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formFields.map((field, index) => (
                    <tr key={index}>
                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.fieldname}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.datatype}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{field.inputtype}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                        {Array.isArray(field.options)
                          ? field.options.join(", ")
                          : field.options || field.format || "-"}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                        <button
                          onClick={() => handleRemoveField(index)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer"
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              

              {/* save + close */}
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="contained" onClick={handleSaveTemplate}>
                  Save Template
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const confirmClose = window.confirm("All data will be lost. Do you want to continue?");
                    if (confirmClose) {
                      setShowFormModal(false);
                      setTemplateName("");
                      setFormFields([]);
                      setNewFieldName("");
                      setNewInputType("text");
                      setNewRadioOptions("");
                      setNewDateFormat("full");
                    }
                  }}
                >
                  Close
                </Button>
              </Stack>

              <button style={closeBtnSx} onClick={() => setShowFormModal(false)}>×</button>
            </Box>
          </Box>
        )}

        {/* Edit Template modal (kept) */}
        {editModal && selectedTemplate && (
          <Box sx={overlaySx} onClick={() => setEditModal(false)}>
            <Box sx={modalSx} onClick={(e) => e.stopPropagation()}>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Edit Template: {selectedTemplate.template_name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                (Only fields without data can be edited)
              </Typography>
              <Button variant="contained" onClick={handleUpdateTemplate}>
                Save Changes
              </Button>
              <button style={closeBtnSx} onClick={() => setEditModal(false)}>×</button>
            </Box>
          </Box>
        )}
         
      </Box>
       
    </Box>
  );
};

export default Datatablebuilder;
