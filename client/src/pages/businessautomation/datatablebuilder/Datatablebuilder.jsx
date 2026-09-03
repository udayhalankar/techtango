// src/pages/sbforms/Datatablebuilder.jsx
import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";
import FormViewsTab from "../sbforms/FormViewsTab";
import ModuleTileGrid from "../../../components/ModuleTileGrid";
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
  Typography,
  MenuItem,
   IconButton,
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

const WORKFLOW_SYSTEM_FIELDS = [
  {
    fieldname: "id",
    datatype: "BIGINT",
    inputtype: "system",
  },
  {
    fieldname: "date_created",
    datatype: "TIMESTAMPTZ",
    inputtype: "system",
  },
  {
    fieldname: "date_modified",
    datatype: "TIMESTAMPTZ",
    inputtype: "system",
  },
  {
    fieldname: "created_by",
    datatype: "BIGINT",
    inputtype: "system",
  },
  {
    fieldname: "modified_by",
    datatype: "BIGINT",
    inputtype: "system",
  },
  {
    fieldname: "table_type",
    datatype: "TEXT",
    inputtype: "system",
  },
  {
    fieldname: "tenant_id",
    datatype: "BIGINT",
    inputtype: "system",
  },
  {
    fieldname: "workflow_id",
    datatype: "BIGINT",
    inputtype: "system",
  },
  {
    fieldname: "comments",
    datatype: "TEXT",
    inputtype: "system",
  },
];

export const Datatablebuilder = () => {
  const embedded = new URLSearchParams(window.location.search).get("embedded") === "1";
  const embeddedPageId = new URLSearchParams(window.location.search).get("pageId");
  // ── original state (kept as-is) ───────────────────────────────
  const [activeTab, setActiveTab] = useState("Templates");
  const [showFormModal, setShowFormModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [tableType, setTableType] = useState("simple");
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
    setTemplateDescription(tpl?.template_description || "");
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
      await api.put(
        `/templates/${selectedTemplate.id}`,
        {
          templateDescription:
            templateDescription.trim(),

          fields: formFields,

          validations:
            normalizedValidations,

          access: accessObj,
        }
      );
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

    if (
        tableType === "workflow" &&
        WORKFLOW_SYSTEM_FIELDS.some(
          (field) =>
            field.fieldname ===
            camelToSnake(newFieldName)
        )
      ) {
        alert(
          `"${newFieldName}" is a reserved workflow system field and is created automatically.`
        );
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
    setTemplateDescription("");
    setFormFields([]);
    setNewFieldName("");
    setNewInputType("text");
    setNewRadioOptions("");
    setNewDateFormat("full");

    try {
      const payload = {
            templateName,

            templateDescription:
              templateDescription.trim(),

            tableType,

            fields: formFields,

            createdBy: 1,

            validations:
              normalizedValidations,

            access: accessObj,
          };
      const res = await api.post("/templates/create", payload);
      alert("Template created: " + res.data.table);
      setShowFormModal(false);
      setTemplateName("");
      setTemplateDescription("");
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


  /* =============================================================================
   MODULE TILE DATA
============================================================================= */

const templateTiles = (templateList || []).map((tpl, index) => {
  const templateId =
    tpl?.id ??
    tpl?.template_id ??
    index;

  const modifiedDate =
    tpl?.date_modified ||
    tpl?.modified_at ||
    tpl?.updated_at ||
    tpl?.created_at;

  return {
    id: templateId,

    label:
      tpl?.template_name ||
      "Untitled Template",

    searchText: [
      tpl?.template_name,
      tpl?.table_name,
      tpl?.created_by,
    ]
      .filter(Boolean)
      .join(" "),

    template: tpl,

    onClick: () =>
      openEditModal(tpl),
  };
});

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
                      setTemplateDescription("");
                      setTableType("simple");
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
    <>
      {/* =================================================================
          DATA MODEL BUILDER
          Shared AUGMIS ModuleTileGrid layout
         ================================================================= */}

      <ModuleTileGrid
        title="Entity Data Model Builder"
        subtitle="Create and manage reusable data model templates for consistent enterprise data structures."
        tiles={templateTiles}
        searchPlaceholder="Search data models"
        primaryAction={{
          label: "Create New Template",

          onClick: () => {
                    setTemplateName("");
                    setTemplateDescription("");

                    // Default to existing behaviour
                    setTableType("simple");

                    setFormFields([]);

                    setNewFieldName("");

                    setNewInputType("text");

                    setNewRadioOptions("");

                    setNewDateFormat("full");

                    setValidationMode("create");

                    setValidationsByMode({
                      create: {},
                      edit: {},
                    });

                    setAccessJson("{}");

                    setEditSection(
                      "validations"
                    );

                    setShowFormModal(true);
                  },
        }}
        showDefaultFooter={false}
        renderTileContent={(tile) => {
          const tpl =
            tile.template;

          if (!tpl) {
            return null;
          }

          const templateId =
            tpl?.id ??
            tpl?.template_id ??
            "-";

          const modifiedValue =
            tpl?.date_modified ||
            tpl?.modified_at ||
            tpl?.updated_at ||
            tpl?.created_at;

          const formatDate = (
            value
          ) => {
            if (!value) {
              return "-";
            }

            const date =
              new Date(value);

            if (
              Number.isNaN(
                date.getTime()
              )
            ) {
              return String(
                value
              );
            }

            return date.toLocaleDateString(
              "en-GB",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            );
          };

          const TileRow = ({
            label,
            value,
          }) => (
            <Box
              sx={{
                display: "grid",

                gridTemplateColumns:
                  "80px minmax(0,1fr)",

                columnGap: 0.5,

                alignItems:
                  "center",

                height: 18,

                minWidth: 0,
              }}
            >
              <Typography
                noWrap
                sx={{
                  fontSize: 10,

                  color:
                    "#738496",

                  fontWeight:
                    500,
                }}
              >
                {label}
              </Typography>

              <Typography
                noWrap
                title={String(
                  value ?? "-"
                )}
                sx={{
                  minWidth: 0,

                  overflow:
                    "hidden",

                  textOverflow:
                    "ellipsis",

                  whiteSpace:
                    "nowrap",

                  fontSize:
                    10.5,

                  color:
                    "#33485d",

                  fontWeight:
                    600,
                }}
              >
                {value ?? "-"}
              </Typography>
            </Box>
          );

          return (
            <>
              {/* TITLE */}

              <Typography
                noWrap
                title={
                  tpl?.template_name ||
                  ""
                }
                sx={{
                  width: "100%",

                  minHeight: 22,

                  overflow:
                    "hidden",

                  textOverflow:
                    "ellipsis",

                  whiteSpace:
                    "nowrap",

                  fontSize: 14,

                  fontWeight:
                    700,

                  lineHeight:
                    "20px",

                  color:
                    "#172b4d",
                }}
              >
                {tpl?.template_name ||
                  "Untitled Template"}
              </Typography>

              <Typography
  title={
    tpl?.template_description ||
    ""
  }
  sx={{
    mt: 0.25,

    minHeight: 39,
    maxHeight: 39,

    pr: 0.5,

    fontSize: 9.7,

    fontWeight: 400,

    lineHeight: "13px",

    color: "#8a98a8",

    display: "-webkit-box",

    WebkitBoxOrient: "vertical",

    WebkitLineClamp: 3,

    overflow: "hidden",

    textOverflow: "ellipsis",
  }}
>
  {tpl?.template_description ||
    ""}
</Typography>

              {/* PUSH DETAILS TO BOTTOM */}

              <Box
                sx={{
                  flexGrow: 1,
                }}
              />

              {/* DETAILS + ACTION */}

              <Box
                sx={{
                  display: "grid",

                  gridTemplateColumns:
                    "minmax(0,1fr) auto",

                  columnGap: 1,

                  alignItems:
                    "end",

                  width: "100%",

                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    display:
                      "grid",

                    rowGap:
                      "1px",

                    minWidth: 0,
                  }}
                >
                  <TileRow
                    label="ID"
                    value={
                      templateId
                    }
                  />

                  <TileRow
                    label="Created By"
                    value={
                      tpl?.created_by ??
                      "-"
                    }
                  />

                  <TileRow
                    label="Modified"
                    value={formatDate(
                      modifiedValue
                    )}
                  />
                </Box>

                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="flex-end"
                >
                  <Button
                    size="small"
                    onClick={(
                      event
                    ) => {
                      event.stopPropagation();

                      handleDeleteTemplate(
                        tpl,
                        event
                      );
                    }}
                    sx={{
                      height: 26,

                      minHeight:
                        26,

                      px: 1,

                      border:
                        "1px solid #f0c0bc",

                      borderRadius:
                        "6px",

                      color:
                        "#b42318",

                      bgcolor:
                        "#ffffff",

                      fontSize:
                        10.5,

                      textTransform:
                        "none",

                      "&:hover":
                        {
                          bgcolor:
                            "#fdf2f1",
                        },
                    }}
                  >
                    Delete
                  </Button>

                  {/* <Button
                    size="small"
                    onClick={(
                      event
                    ) => {
                      event.stopPropagation();

                      openEditModal(
                        tpl
                      );
                    }}
                    sx={{
                      height: 26,

                      minHeight:
                        26,

                      px: 1,

                      borderRadius:
                        "6px",

                      bgcolor:
                        "#eaf3fc",

                      color:
                        "#0a6ed1",

                      fontSize:
                        10.5,

                      fontWeight:
                        700,

                      textTransform:
                        "none",

                      "&:hover":
                        {
                          bgcolor:
                            "#dcecfb",
                        },
                    }}
                  >
                    Open
                  </Button> */}
                </Stack>
              </Box>
            </>
          );
        }}
      />

      {/* =================================================================
          TEMPLATE DESIGNER
          Redesigned visually only.
         ================================================================= */}

      {showFormModal && (
        <Box
          sx={{
            position: "fixed",

            inset: 0,

            zIndex: 1400,

            display: "flex",

            alignItems: "center",

            justifyContent:
              "center",

            bgcolor:
              "rgba(18, 34, 52, 0.38)",

            backdropFilter:
              "blur(2px)",
          }}
          onClick={() =>
            setShowFormModal(false)
          }
        >
          <Paper
            elevation={0}
            onClick={(event) =>
              event.stopPropagation()
            }
            sx={{
              width:
                "min(960px, 95vw)",

              maxHeight:
                "88vh",

              display: "flex",

              flexDirection:
                "column",

              overflow: "hidden",

              borderRadius:
                "12px",

              border:
                "1px solid #dce3ea",

              bgcolor:
                "#ffffff",

              boxShadow:
                "0 24px 60px rgba(17,37,61,.22)",
            }}
          >
            {/* =========================================================
                MODAL HEADER
               ========================================================= */}

            <Box
              sx={{
                px: 3,

                py: 2,

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "space-between",

                background:
                  "linear-gradient(105deg, #344f67 0%, #314a62 58%, #496178 100%)",

                color:
                  "#ffffff",
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,

                    color:
                      "rgba(255,255,255,.72)",

                    mb: 0.3,
                  }}
                >
                  Entity Data Model
                </Typography>

                <Typography
                  sx={{
                    fontSize: 20,

                    fontWeight:
                      700,

                    lineHeight:
                      1.2,
                  }}
                >
                  Template Designer
                </Typography>

                <Typography
                  sx={{
                    mt: 0.35,

                    fontSize: 11.5,

                    color:
                      "rgba(255,255,255,.76)",
                  }}
                >
                  Define the model
                  name and fields for
                  your reusable data
                  structure.
                </Typography>
              </Box>

              <Button
                onClick={() =>
                  setShowFormModal(
                    false
                  )
                }
                sx={{
                  minWidth: 34,

                  width: 34,

                  height: 34,

                  borderRadius:
                    "50%",

                  color:
                    "#ffffff",

                  fontSize: 20,

                  bgcolor:
                    "rgba(255,255,255,.10)",

                  "&:hover": {
                    bgcolor:
                      "rgba(255,255,255,.18)",
                  },
                }}
              >
                ×
              </Button>
            </Box>

            {/* =========================================================
                SCROLLABLE BODY
               ========================================================= */}

            <Box
              sx={{
                p: 3,

                overflowY:
                  "auto",

                bgcolor:
                  "#ffffff",
              }}
            >
              {/* TEMPLATE INFORMATION */}

              <Box
                sx={{
                  mb: 2.5,

                  p: 2,

                  border:
                    "1px solid #e1e6eb",

                  borderRadius:
                    "10px",

                  bgcolor:
                    "#fafbfd",
                }}
              >
                <Typography
                  sx={{
                    mb: 1.3,

                    fontSize: 12.5,

                    fontWeight:
                      700,

                    color:
                      "#223548",
                  }}
                >
                  Template Information
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  label="Template Name"
                  placeholder="Enter template name"

                  value={
                    templateName
                  }

                  onChange={(event) =>
                    setTemplateName(
                      event.target
                        .value
                    )
                  }

                  helperText="Lowercase letters and numbers only, maximum 20 characters."

                  sx={{
                    "& .MuiOutlinedInput-root":
                      {
                        bgcolor:
                          "#ffffff",

                        borderRadius:
                          "6px",
                      },

                    "& .MuiFormHelperText-root":
                      {
                        fontSize:
                          10.5,

                        ml: 0,

                        color:
                          "#738496",
                      },
                  }}
                />

                <TextField
                      select
                      fullWidth
                      size="small"

                      label="Table Type"

                      value={tableType}

                      onChange={(event) =>
                        setTableType(
                          event.target.value
                        )
                      }

                      sx={{
                        mt: 1.5,

                        "& .MuiOutlinedInput-root": {
                          bgcolor: "#ffffff",
                          borderRadius: "6px",
                        },

                        "& .MuiInputLabel-root": {
                          fontSize: 12.5,
                        },

                        "& .MuiSelect-select": {
                          fontSize: 12.5,
                        },
                      }}
                    >
                      <MenuItem value="simple">
                        Simple Form Table
                      </MenuItem>

                      <MenuItem value="workflow">
                        Workflow Form Table
                      </MenuItem>
                    </TextField>

                <TextField
  fullWidth
  multiline
  minRows={2}
  maxRows={3}
  size="small"

  label="Template Description"

  placeholder="Briefly describe the purpose of this data model"

  value={templateDescription}

  onChange={(event) =>
    setTemplateDescription(
      event.target.value
    )
  }

  sx={{
    mt: 1.5,

    "& .MuiOutlinedInput-root": {
      bgcolor: "#ffffff",
      borderRadius: "6px",

      fontSize: 12.5,
    },

    "& .MuiInputLabel-root": {
      fontSize: 12.5,
    },
  }}
/>
              </Box>

              {/* ADD FIELD */}

              <Box
                sx={{
                  mb: 2.5,

                  p: 2,

                  border:
                    "1px solid #e1e6eb",

                  borderRadius:
                    "10px",

                  bgcolor:
                    "#ffffff",
                }}
              >
                <Typography
                  sx={{
                    mb: 1.3,

                    fontSize: 12.5,

                    fontWeight:
                      700,

                    color:
                      "#223548",
                  }}
                >
                  Add Field
                </Typography>

                <Grid
                  container
                  spacing={1.5}
                  alignItems="center"
                >
                  {/* FIELD NAME */}

                  <Grid
                    item
                    xs={12}
                    md={4}
                  >
                    <TextField
                      fullWidth

                      size="small"

                      label="Field Name"

                      placeholder="e.g. employee_name"

                      value={
                        newFieldName
                      }

                      onChange={(
                        event
                      ) =>
                        setNewFieldName(
                          event
                            .target
                            .value
                        )
                      }
                    />
                  </Grid>

                  {/* INPUT TYPE */}

                  <Grid
                    item
                    xs={12}
                    md={3}
                  >
                    <TextField
                      select

                      fullWidth

                      size="small"

                      label="Input Type"

                      value={
                        newInputType
                      }

                      onChange={(
                        event
                      ) => {
                        setNewInputType(
                          event
                            .target
                            .value
                        );

                        setNewRadioOptions(
                          ""
                        );

                        setNewDateFormat(
                          "full"
                        );
                      }}
                    >
                      <MenuItem value="text">
                        Text
                      </MenuItem>

                      <MenuItem value="textarea">
                        Textarea
                      </MenuItem>

                      <MenuItem value="checkbox">
                        Checkbox
                      </MenuItem>

                      <MenuItem value="radio">
                        Radio Button
                      </MenuItem>

                      <MenuItem value="image">
                        Attachment
                      </MenuItem>

                      <MenuItem value="date">
                        Date
                      </MenuItem>

                      <MenuItem value="integer">
                        Integer
                      </MenuItem>

                      <MenuItem value="dropdownlist">
                        Dropdown List
                      </MenuItem>
                    </TextField>
                  </Grid>

                  {/* OPTIONS */}

                  {[
                    "checkbox",
                    "radio",
                    "dropdownlist",
                  ].includes(
                    newInputType
                  ) && (
                    <Grid
                      item
                      xs={12}
                      md={3}
                    >
                      <TextField
                        fullWidth

                        size="small"

                        label="Options"

                        placeholder="Yes, No, Maybe"

                        value={
                          newRadioOptions
                        }

                        onChange={(
                          event
                        ) =>
                          setNewRadioOptions(
                            event
                              .target
                              .value
                          )
                        }
                      />
                    </Grid>
                  )}

                  {/* DATE FORMAT */}

                  {newInputType ===
                    "date" && (
                    <Grid
                      item
                      xs={12}
                      md={3}
                    >
                      <TextField
                        select

                        fullWidth

                        size="small"

                        label="Date Format"

                        value={
                          newDateFormat
                        }

                        onChange={(
                          event
                        ) =>
                          setNewDateFormat(
                            event
                              .target
                              .value
                          )
                        }
                      >
                        <MenuItem value="full">
                          Full Date
                        </MenuItem>

                        <MenuItem value="month">
                          Month
                        </MenuItem>

                        <MenuItem value="year">
                          Year
                        </MenuItem>

                        <MenuItem value="day">
                          Day Only
                        </MenuItem>
                      </TextField>
                    </Grid>
                  )}

                  {/* ADD */}

                  <Grid
                    item
                    xs={12}
                    md="auto"
                  >
                    <Button
                      variant="contained"

                      onClick={
                        handleAddField
                      }

                      sx={{
                        height: 40,

                        px: 2,

                        borderRadius:
                          "6px",

                        bgcolor:
                          "#0a6ed1",

                        textTransform:
                          "none",

                        fontSize:
                          12,

                        fontWeight:
                          700,

                        "&:hover":
                          {
                            bgcolor:
                              "#095caf",
                          },
                      }}
                    >
                      Add Field
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* FIELD LIST */}

              <Box
                sx={{
                  border:
                    "1px solid #e1e6eb",

                  borderRadius:
                    "10px",

                  overflow:
                    "hidden",

                  bgcolor:
                    "#ffffff",
                }}
              >
                <Box
                  sx={{
                    px: 2,

                    py: 1.3,

                    borderBottom:
                      "1px solid #e1e6eb",

                    bgcolor:
                      "#f7f9fb",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize:
                        12.5,

                      fontWeight:
                        700,

                      color:
                        "#223548",
                    }}
                  >
                    Fields
                  </Typography>
                </Box>

                <TableContainer>
                  <Table
                    size="small"
                    sx={{
                      "& .MuiTableCell-root":
                        {
                          px: 1.5,

                          py: 1,

                          borderColor:
                            "#edf0f3",

                          fontSize:
                            11.5,
                        },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        {[
                          "Field Name",
                          "Data Type",
                          "Input Type",
                          "Options / Format",
                          "Action",
                        ].map(
                          (
                            heading
                          ) => (
                            <TableCell
                              key={
                                heading
                              }
                              sx={{
                                bgcolor:
                                  "#344f67",

                                color:
                                  "#ffffff",

                                fontSize:
                                  "10.5px !important",

                                fontWeight:
                                  "700 !important",

                                textTransform:
                                  "uppercase",

                                letterSpacing:
                                  ".03em",
                              }}
                            >
                              {
                                heading
                              }
                            </TableCell>
                          )
                        )}
                      </TableRow>
                    </TableHead>

                    <TableBody>

  {/* =====================================================
      WORKFLOW SYSTEM FIELDS
     ===================================================== */}

  {tableType === "workflow" &&
    WORKFLOW_SYSTEM_FIELDS.map(
      (field) => (
        <TableRow
          key={`system_${field.fieldname}`}
          sx={{
            bgcolor: "#f7fafc",
          }}
        >
          <TableCell
            sx={{
              fontWeight: 700,
              color: "#516579",
            }}
          >
            {field.fieldname}
          </TableCell>

          <TableCell
            sx={{
              color: "#718396",
            }}
          >
            {field.datatype}
          </TableCell>

          <TableCell>
            <Box
              component="span"
              sx={{
                px: 0.8,
                py: 0.2,

                borderRadius: "3px",

                bgcolor: "#e9eef3",

                color: "#607487",

                fontSize: 9.5,

                fontWeight: 700,

                textTransform:
                  "uppercase",
              }}
            >
              System
            </Box>
          </TableCell>

          <TableCell
            sx={{
              color: "#8796a5",
            }}
          >
            {field.fieldname ===
            "table_type"
              ? "Default: Workflow"
              : "-"}
          </TableCell>

          <TableCell>
            <Typography
              sx={{
                fontSize: 10,

                color: "#8a99a7",

                fontStyle: "italic",
              }}
            >
              Locked
            </Typography>
          </TableCell>
        </TableRow>
      )
    )}

  {/* =====================================================
      USER DEFINED FIELDS
     ===================================================== */}

  {formFields.length === 0 ? (

    <TableRow>
      <TableCell
        colSpan={5}
        align="center"
        sx={{
          py: "28px !important",

          color: "#738496",
        }}
      >
        No user-defined fields added yet.
      </TableCell>
    </TableRow>

  ) : (

    formFields.map(
      (field, index) => (
        <TableRow
          key={index}
          hover
        >
          <TableCell
            sx={{
              fontWeight: 700,

              color: "#223548",
            }}
          >
            {field.fieldname}
          </TableCell>

          <TableCell>
            {field.datatype}
          </TableCell>

          <TableCell>
            {field.inputtype}
          </TableCell>

          <TableCell>
            {Array.isArray(
              field.options
            )
              ? field.options.join(
                  ", "
                )
              : field.options ||
                field.format ||
                "-"}
          </TableCell>

          <TableCell>
            <Button
              size="small"

              onClick={() =>
                handleRemoveField(
                  index
                )
              }

              sx={{
                minHeight: 26,

                px: 1,

                color:
                  "#b42318",

                border:
                  "1px solid #f0c0bc",

                borderRadius:
                  "6px",

                textTransform:
                  "none",

                fontSize:
                  10.5,

                "&:hover": {
                  bgcolor:
                    "#fdf2f1",
                },
              }}
            >
              Remove
            </Button>
          </TableCell>
        </TableRow>
      )
    )

  )}

</TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>

            {/* =========================================================
                FOOTER
               ========================================================= */}

            <Box
              sx={{
                px: 3,

                py: 1.7,

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "flex-end",

                gap: 1,

                bgcolor:
                  "#fafbfd",

                borderTop:
                  "1px solid #e1e6eb",
              }}
            >
              <Button
                variant="outlined"

                onClick={() => {
                  const confirmClose =
                    window.confirm(
                      "All data will be lost. Do you want to continue?"
                    );

                  if (
                    !confirmClose
                  ) {
                    return;
                  }

                  setShowFormModal(
                    false
                  );

                  setTemplateName(
                    ""
                  );

                  setFormFields([]);

                  setNewFieldName(
                    ""
                  );

                  setNewInputType(
                    "text"
                  );

                  setNewRadioOptions(
                    ""
                  );

                  setNewDateFormat(
                    "full"
                  );
                }}

                sx={{
                  height: 36,

                  px: 2,

                  borderRadius:
                    "6px",

                  borderColor:
                    "#cbd5df",

                  color:
                    "#53677b",

                  textTransform:
                    "none",

                  fontSize: 12,

                  "&:hover": {
                    borderColor:
                      "#9fb0c1",

                    bgcolor:
                      "#f5f7fa",
                  },
                }}
              >
                Close
              </Button>

              <Button
                variant="contained"

                onClick={
                  handleSaveTemplate
                }

                sx={{
                  height: 36,

                  px: 2.2,

                  borderRadius:
                    "6px",

                  bgcolor:
                    "#0a6ed1",

                  textTransform:
                    "none",

                  fontSize: 12,

                  fontWeight:
                    700,

                  boxShadow:
                    "0 3px 8px rgba(10,110,209,.18)",

                  "&:hover": {
                    bgcolor:
                      "#095caf",
                  },
                }}
              >
                Save Template
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* =================================================================
          EDIT TEMPLATE
          KEEP EXISTING FUNCTIONALITY / UI FOR NOW
         ================================================================= */}
      {/* =================================================================
          EDIT TEMPLATE - MODERN AUGMIS DESIGN
         ================================================================= */}

      {editModal && selectedTemplate && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            bgcolor: "rgba(18, 34, 52, 0.42)",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setEditModal(false)}
        >
          <Paper
            elevation={0}
            onClick={(event) =>
              event.stopPropagation()
            }
            sx={{
              width: "min(980px, 95vw)",
              maxHeight: "90vh",

              display: "flex",
              flexDirection: "column",

              overflow: "hidden",

              bgcolor: "#f8fbfe",

              borderRadius: "16px",
              border: "1px solid #cfdbe7",

              boxShadow:
                "0 24px 70px rgba(18, 41, 67, 0.24)",
            }}
          >
            {/* =========================================================
                HEADER
               ========================================================= */}

            <Box
              sx={{
                px: 2.5,
                py: 2,

                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",

                background:
                  "linear-gradient(105deg, #187f96 0%, #16849c 45%, #247c98 100%)",

                color: "#ffffff",
              }}
            >
              <Stack
                direction="row"
                spacing={1.4}
                alignItems="flex-start"
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,

                    borderRadius: "12px",

                    display: "grid",
                    placeItems: "center",

                    bgcolor:
                      "rgba(255,255,255,.14)",

                    border:
                      "1px solid rgba(255,255,255,.15)",

                    fontSize: 20,

                    flex: "0 0 auto",
                  }}
                >
                  🧩
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                  >
                    Edit Template
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.45,

                      fontSize: 11.5,

                      color:
                        "rgba(255,255,255,.88)",

                      lineHeight: 1.45,
                    }}
                  >
                    Update the data model structure,
                    field definitions and configuration.
                  </Typography>
                </Box>
              </Stack>

              <IconButton
                size="small"
                onClick={() =>
                  setEditModal(false)
                }
                sx={{
                  color: "#ffffff",

                  bgcolor:
                    "rgba(255,255,255,.08)",

                  "&:hover": {
                    bgcolor:
                      "rgba(255,255,255,.16)",
                  },
                }}
              >
                ×
              </IconButton>
            </Box>

            {/* =========================================================
                SCROLLABLE BODY
               ========================================================= */}

            <Box
              sx={{
                p: 2.5,

                overflowY: "auto",

                maxHeight:
                  "calc(90vh - 145px)",
              }}
            >
              {/* =======================================================
                  TEMPLATE INFORMATION
                 ======================================================= */}

              <Box
                sx={{
                  mb: 2.5,
                }}
              >
                <Typography
                  sx={{
                    mb: 0.7,

                    fontSize: 11,

                    fontWeight: 700,

                    letterSpacing: ".06em",

                    color: "#466488",

                    textTransform: "uppercase",
                  }}
                >
                  Template Name
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  value={templateName}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root":
                      {
                        height: 42,

                        bgcolor: "#ffffff",

                        borderRadius: "7px",
                      },
                  }}
                />

                <Typography
                  sx={{
                    mt: 0.6,

                    fontSize: 10.5,

                    color: "#7388a3",
                  }}
                >
                  Lowercase letters and numbers only,
                  maximum 20 characters.
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={3}

                  size="small"

                  label="Template Description"

                  placeholder="Briefly describe the purpose of this data model"

                  value={templateDescription}

                  onChange={(event) =>
                    setTemplateDescription(
                      event.target.value
                    )
                  }

                  sx={{
                    mt: 1.5,

                    "& .MuiOutlinedInput-root": {
                      bgcolor: "#ffffff",
                      borderRadius: "7px",

                      fontSize: 12.5,
                    },

                    "& .MuiInputLabel-root": {
                      fontSize: 12.5,
                    },
                  }}
                />
              </Box>

              {/* =======================================================
                  ADD FIELD
                 ======================================================= */}

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2.5,

                  borderRadius: "12px",

                  border:
                    "1px solid #d9e4ee",

                  bgcolor: "#ffffff",
                }}
              >
                <Typography
                  sx={{
                    mb: 1.4,

                    fontSize: 12.5,

                    fontWeight: 700,

                    color: "#294766",
                  }}
                >
                  Add a Field
                </Typography>

                <Grid
                  container
                  spacing={1.5}
                  alignItems="center"
                >
                  {/* FIELD NAME */}

                  <Grid
                    item
                    xs={12}
                    md={5}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      label="Field Name"
                      placeholder="Enter field name"
                      value={newFieldName}
                      onChange={(e) =>
                        setNewFieldName(
                          e.target.value
                        )
                      }
                      sx={{
                        "& .MuiOutlinedInput-root":
                          {
                            height: 42,

                            borderRadius:
                              "7px",
                          },
                      }}
                    />
                  </Grid>

                  {/* INPUT TYPE */}

                  <Grid
                    item
                    xs={12}
                    md={3}
                  >
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Input Type"
                      value={newInputType}
                      onChange={(e) => {
                        setNewInputType(
                          e.target.value
                        );

                        setNewRadioOptions(
                          ""
                        );

                        setNewDateFormat(
                          "full"
                        );
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root":
                          {
                            height: 42,

                            borderRadius:
                              "7px",
                          },
                      }}
                    >
                      <MenuItem value="text">
                        Text
                      </MenuItem>

                      <MenuItem value="textarea">
                        Textarea
                      </MenuItem>

                      <MenuItem value="checkbox">
                        Checkbox
                      </MenuItem>

                      <MenuItem value="radio">
                        Radio Button
                      </MenuItem>

                      <MenuItem value="image">
                        Attachment
                      </MenuItem>

                      <MenuItem value="date">
                        Date
                      </MenuItem>

                      <MenuItem value="integer">
                        Integer
                      </MenuItem>

                      <MenuItem value="dropdownlist">
                        Dropdown List
                      </MenuItem>
                    </TextField>
                  </Grid>

                  {/* OPTIONS */}

                  {[
                    "checkbox",
                    "radio",
                    "dropdownlist",
                  ].includes(newInputType) && (
                    <Grid
                      item
                      xs={12}
                      md={3}
                    >
                      <TextField
                        fullWidth
                        size="small"
                        label="Options"
                        placeholder="Option A, Option B"
                        value={
                          newRadioOptions
                        }
                        onChange={(e) =>
                          setNewRadioOptions(
                            e.target.value
                          )
                        }
                        sx={{
                          "& .MuiOutlinedInput-root":
                            {
                              height: 42,

                              borderRadius:
                                "7px",
                            },
                        }}
                      />
                    </Grid>
                  )}

                  {/* DATE FORMAT */}

                  {newInputType === "date" && (
                    <Grid
                      item
                      xs={12}
                      md={3}
                    >
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Date Format"
                        value={
                          newDateFormat
                        }
                        onChange={(e) =>
                          setNewDateFormat(
                            e.target.value
                          )
                        }
                        sx={{
                          "& .MuiOutlinedInput-root":
                            {
                              height: 42,

                              borderRadius:
                                "7px",
                            },
                        }}
                      >
                        <MenuItem value="full">
                          Full Date
                        </MenuItem>

                        <MenuItem value="month">
                          Month
                        </MenuItem>

                        <MenuItem value="year">
                          Year
                        </MenuItem>

                        <MenuItem value="day">
                          Day Only
                        </MenuItem>
                      </TextField>
                    </Grid>
                  )}

                  {/* ADD BUTTON */}

                  <Grid
                    item
                    xs={12}
                    md="auto"
                  >
                    <Button
                      variant="contained"
                      onClick={
                        handleAddField
                      }
                      sx={{
                        height: 42,

                        px: 2.1,

                        borderRadius:
                          "7px",

                        bgcolor:
                          "#0a74d7",

                        fontSize: 11.5,

                        fontWeight: 700,

                        textTransform:
                          "none",

                        boxShadow:
                          "0 3px 8px rgba(10,116,215,.20)",

                        "&:hover": {
                          bgcolor:
                            "#0862b8",
                        },
                      }}
                    >
                      Add Field
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* =======================================================
                  EXISTING FIELDS
                 ======================================================= */}

              <Paper
                elevation={0}
                sx={{
                  border:
                    "1px solid #d9e4ee",

                  borderRadius: "12px",

                  overflow: "hidden",

                  bgcolor: "#ffffff",
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1.25,

                    bgcolor: "#f3f7fb",

                    borderBottom:
                      "1px solid #dce5ed",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12.5,

                      fontWeight: 700,

                      color: "#294766",
                    }}
                  >
                    Template Fields
                  </Typography>
                </Box>

                <TableContainer>
                  <Table
                    size="small"
                    sx={{
                      "& .MuiTableCell-root":
                        {
                          px: 1.5,

                          py: 1,

                          fontSize: 11.5,

                          borderColor:
                            "#edf1f5",
                        },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        {[
                          "Field Name",
                          "Data Type",
                          "Input Type",
                          "Options / Format",
                          "Action",
                        ].map((heading) => (
                          <TableCell
                            key={heading}
                            sx={{
                              bgcolor:
                                "#edf4f8",

                              color:
                                "#3f5874",

                              fontSize:
                                "10.5px !important",

                              fontWeight:
                                "700 !important",

                              textTransform:
                                "uppercase",

                              letterSpacing:
                                ".03em",
                            }}
                          >
                            {heading}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {formFields.length ===
                      0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            align="center"
                            sx={{
                              py:
                                "28px !important",

                              color:
                                "#738496",
                            }}
                          >
                            No fields added yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        formFields.map(
                          (field, index) => (
                            <TableRow
                              key={index}
                              hover
                            >
                              <TableCell
                                sx={{
                                  fontWeight:
                                    700,

                                  color:
                                    "#233a54",
                                }}
                              >
                                {
                                  field.fieldname
                                }
                              </TableCell>

                              <TableCell>
                                {
                                  field.datatype
                                }
                              </TableCell>

                              <TableCell>
                                {
                                  field.inputtype
                                }
                              </TableCell>

                              <TableCell>
                                {Array.isArray(
                                  field.options
                                )
                                  ? field.options.join(
                                      ", "
                                    )
                                  : field.options ||
                                    field.format ||
                                    "-"}
                              </TableCell>

                              <TableCell>
                                <Button
                                  size="small"
                                  onClick={() =>
                                    handleRemoveField(
                                      index
                                    )
                                  }
                                  sx={{
                                    minHeight:
                                      26,

                                    px: 1,

                                    borderRadius:
                                      "6px",

                                    color:
                                      "#c03c33",

                                    bgcolor:
                                      "#fff1f0",

                                    border:
                                      "1px solid #f0c8c5",

                                    fontSize:
                                      10,

                                    textTransform:
                                      "none",

                                    "&:hover":
                                      {
                                        bgcolor:
                                          "#fde9e7",
                                      },
                                  }}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        )
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            {/* =========================================================
                FOOTER
               ========================================================= */}

            <Box
              sx={{
                px: 2.5,
                py: 1.6,

                display: "flex",

                alignItems: "center",

                justifyContent:
                  "flex-end",

                gap: 1,

                bgcolor: "#f6f9fc",

                borderTop:
                  "1px solid #dce5ed",
              }}
            >
              <Button
                onClick={() => {
                  const confirmClose =
                    window.confirm(
                      "All data will be lost. Do you want to continue?"
                    );

                  if (
                    !confirmClose
                  ) {
                    return;
                  }

                  setEditModal(false);

                  setTemplateName("");
                  setTemplateDescription("");
                  setTableType("simple");
                  setFormFields([]);

                  setNewFieldName("");

                  setNewInputType(
                    "text"
                  );

                  setNewRadioOptions(
                    ""
                  );

                  setNewDateFormat(
                    "full"
                  );
                }}
                sx={{
                  height: 38,

                  px: 2,

                  borderRadius: "7px",

                  bgcolor: "#e4e7ea",

                  color: "#36516f",

                  fontSize: 11.5,

                  fontWeight: 700,

                  textTransform: "none",

                  "&:hover": {
                    bgcolor: "#d8dde2",
                  },
                }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                onClick={
                  handleUpdateTemplate
                }
                sx={{
                  height: 38,

                  px: 2.2,

                  borderRadius: "7px",

                  bgcolor: "#0a74d7",

                  fontSize: 11.5,

                  fontWeight: 700,

                  textTransform: "none",

                  boxShadow:
                    "0 3px 8px rgba(10,116,215,.18)",

                  "&:hover": {
                    bgcolor: "#0862b8",
                  },
                }}
              >
                Save Changes
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
      
    </>
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
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
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
                      <TableCell>{tpl.template_description}</TableCell>
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

           <Box
  onClick={(e) => e.stopPropagation()}
  sx={{
    width: "min(980px, 95vw)",
    maxHeight: "90vh",
    overflow: "hidden",
    bgcolor: "#f8fbfe",
    borderRadius: "16px",
    boxShadow: "0 24px 70px rgba(18, 41, 67, 0.24)",
    border: "1px solid #cfdbe7",
    position: "relative",
  }}
>
  {/* =========================================================
      HEADER
     ========================================================= */}

  <Box
    sx={{
      px: 2.5,
      py: 2,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      background:
        "linear-gradient(105deg, #187f96 0%, #16849c 45%, #247c98 100%)",
      color: "#fff",
    }}
  >
    <Stack
      direction="row"
      spacing={1.4}
      alignItems="flex-start"
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "12px",
          display: "grid",
          placeItems: "center",
          bgcolor: "rgba(255,255,255,.14)",
          border: "1px solid rgba(255,255,255,.15)",
          fontSize: 20,
          flex: "0 0 auto",
        }}
      >
        🧩
      </Box>

      <Box>
        <Typography
          sx={{
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          Edit Template
        </Typography>

        <Typography
          sx={{
            mt: 0.45,
            fontSize: 11.5,
            color: "rgba(255,255,255,.88)",
            lineHeight: 1.45,
          }}
        >
          Update the data model structure, field definitions and configuration.
        </Typography>
      </Box>
    </Stack>

    <IconButton
      size="small"
      onClick={() => setEditModal(false)}
      sx={{
        color: "#fff",
        bgcolor: "rgba(255,255,255,.08)",
        "&:hover": {
          bgcolor: "rgba(255,255,255,.16)",
        },
      }}
    >
      ×
    </IconButton>
  </Box>

  {/* =========================================================
      BODY
     ========================================================= */}

  <Box
    sx={{
      p: 2.5,
      overflowY: "auto",
      maxHeight: "calc(90vh - 145px)",
    }}
  >
    {/* TEMPLATE NAME */}

    <Box sx={{ mb: 2.5 }}>
      <Typography
        sx={{
          mb: 0.7,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".06em",
          color: "#466488",
          textTransform: "uppercase",
        }}
      >
        Template Name
      </Typography>

      <TextField
        fullWidth
        size="small"
        value={templateName}
        InputProps={{
          readOnly: true,
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            height: 42,
            bgcolor: "#fff",
            borderRadius: "7px",
          },
        }}
      />

      <Typography
        sx={{
          mt: 0.6,
          fontSize: 10.5,
          color: "#7388a3",
        }}
      >
        Lowercase letters and numbers only, maximum 20 characters.
      </Typography>
    </Box>

    {/* =========================================================
        ADD FIELD PANEL
       ========================================================= */}

    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2.5,
        borderRadius: "12px",
        border: "1px solid #d9e4ee",
        bgcolor: "#ffffff",
      }}
    >
      <Typography
        sx={{
          mb: 1.4,
          fontSize: 12.5,
          fontWeight: 700,
          color: "#294766",
        }}
      >
        Add a Field
      </Typography>

      <Grid container spacing={1.5} alignItems="center">
        <Grid item xs={12} md={5}>
          <TextField
            fullWidth
            size="small"
            label="Field Name"
            placeholder="Enter field name"
            value={newFieldName}
            onChange={(e) =>
              setNewFieldName(e.target.value)
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                height: 42,
                borderRadius: "7px",
              },
            }}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <TextField
            select
            fullWidth
            size="small"
            label="Input Type"
            value={newInputType}
            onChange={(e) => {
              setNewInputType(e.target.value);
              setNewRadioOptions("");
              setNewDateFormat("full");
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                height: 42,
                borderRadius: "7px",
              },
            }}
          >
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="textarea">Textarea</MenuItem>
            <MenuItem value="checkbox">Checkbox</MenuItem>
            <MenuItem value="radio">Radio Button</MenuItem>
            <MenuItem value="image">Attachment</MenuItem>
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="integer">Integer</MenuItem>
            <MenuItem value="dropdownlist">Dropdown List</MenuItem>
          </TextField>
        </Grid>

        {["checkbox", "radio", "dropdownlist"].includes(
          newInputType
        ) && (
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Options"
              placeholder="Option A, Option B"
              value={newRadioOptions}
              onChange={(e) =>
                setNewRadioOptions(e.target.value)
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  height: 42,
                  borderRadius: "7px",
                },
              }}
            />
          </Grid>
        )}

        {newInputType === "date" && (
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Date Format"
              value={newDateFormat}
              onChange={(e) =>
                setNewDateFormat(e.target.value)
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  height: 42,
                  borderRadius: "7px",
                },
              }}
            >
              <MenuItem value="full">
                Full Date
              </MenuItem>

              <MenuItem value="month">
                Month
              </MenuItem>

              <MenuItem value="year">
                Year
              </MenuItem>

              <MenuItem value="day">
                Day Only
              </MenuItem>
            </TextField>
          </Grid>
        )}

        <Grid item xs={12} md="auto">
          <Button
            variant="contained"
            onClick={handleAddField}
            sx={{
              height: 42,
              px: 2.1,
              borderRadius: "7px",
              bgcolor: "#0a74d7",
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "0 3px 8px rgba(10,116,215,.20)",
              "&:hover": {
                bgcolor: "#0862b8",
              },
            }}
          >
            Add Field
          </Button>
        </Grid>
      </Grid>
    </Paper>

    {/* =========================================================
        FIELD LIST
       ========================================================= */}

    <Paper
      elevation={0}
      sx={{
        border: "1px solid #d9e4ee",
        borderRadius: "12px",
        overflow: "hidden",
        bgcolor: "#fff",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: "#f3f7fb",
          borderBottom: "1px solid #dce5ed",
        }}
      >
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 700,
            color: "#294766",
          }}
        >
          Template Fields
        </Typography>
      </Box>

      <TableContainer>
        <Table
          size="small"
          sx={{
            "& .MuiTableCell-root": {
              px: 1.5,
              py: 1,
              fontSize: 11.5,
              borderColor: "#edf1f5",
            },
          }}
        >
          <TableHead>
            <TableRow>
              {[
                "Field Name",
                "Data Type",
                "Input Type",
                "Options / Format",
                "Action",
              ].map((heading) => (
                <TableCell
                  key={heading}
                  sx={{
                    bgcolor: "#edf4f8",
                    color: "#3f5874",
                    fontSize: "10.5px !important",
                    fontWeight: "700 !important",
                    textTransform: "uppercase",
                    letterSpacing: ".03em",
                  }}
                >
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {formFields.map((field, index) => (
              <TableRow key={index} hover>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    color: "#233a54",
                  }}
                >
                  {field.fieldname}
                </TableCell>

                <TableCell>
                  {field.datatype}
                </TableCell>

                <TableCell>
                  {field.inputtype}
                </TableCell>

                <TableCell>
                  {Array.isArray(field.options)
                    ? field.options.join(", ")
                    : field.options ||
                      field.format ||
                      "-"}
                </TableCell>

                <TableCell>
                  <Button
                    size="small"
                    onClick={() =>
                      handleRemoveField(index)
                    }
                    sx={{
                      minHeight: 26,
                      px: 1,
                      borderRadius: "6px",
                      color: "#c03c33",
                      bgcolor: "#fff1f0",
                      border: "1px solid #f0c8c5",
                      fontSize: 10,
                      textTransform: "none",
                      "&:hover": {
                        bgcolor: "#fde9e7",
                      },
                    }}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  </Box>

  {/* =========================================================
      FOOTER
     ========================================================= */}

  <Box
    sx={{
      px: 2.5,
      py: 1.6,
      display: "flex",
      justifyContent: "flex-end",
      gap: 1,
      bgcolor: "#f6f9fc",
      borderTop: "1px solid #dce5ed",
    }}
  >
    <Button
      onClick={() => {
        const confirmClose =
          window.confirm(
            "All data will be lost. Do you want to continue?"
          );

        if (confirmClose) {
          setEditModal(false);
          setTemplateName("");
          setTemplateDescription("");
          setTableType("simple");
          setFormFields([]);
          setNewFieldName("");
          setNewInputType("text");
          setNewRadioOptions("");
          setNewDateFormat("full");
        }
      }}
      sx={{
        height: 38,
        px: 2,
        borderRadius: "7px",
        bgcolor: "#e4e7ea",
        color: "#36516f",
        fontSize: 11.5,
        fontWeight: 700,
        textTransform: "none",
        "&:hover": {
          bgcolor: "#d8dde2",
        },
      }}
    >
      Cancel
    </Button>

    <Button
      variant="contained"
      onClick={handleUpdateTemplate}
      sx={{
        height: 38,
        px: 2.2,
        borderRadius: "7px",
        bgcolor: "#0a74d7",
        fontSize: 11.5,
        fontWeight: 700,
        textTransform: "none",
        boxShadow: "0 3px 8px rgba(10,116,215,.18)",
        "&:hover": {
          bgcolor: "#0862b8",
        },
      }}
    >
      Save Changes
    </Button>
  </Box>
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
