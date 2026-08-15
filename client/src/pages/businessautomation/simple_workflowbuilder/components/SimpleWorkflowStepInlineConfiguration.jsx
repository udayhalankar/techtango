// client/src/pages/businessautomation/simple_workflowbuilder/components/SimpleWorkflowStepInlineConfiguration.jsx
/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/charmap";
import "tinymce/plugins/code";
import "tinymce/plugins/image";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/table";
import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/skins/content/default/content.min.css";
import api from "../../../../services/api";
import { materializeLayout } from "./simpleWorkflowFormLayouts";
import StepBasics from "./SimpleWorkflowConfigurationComponents/StepBasics";
import StepBehaviour from "./SimpleWorkflowConfigurationComponents/StepBehaviour";
import NotificationsRegular from "./SimpleWorkflowConfigurationComponents/NotificationsRegular";
import NotificationsEscalations from "./SimpleWorkflowConfigurationComponents/NotificationsEscalations";
import MailContentEditor from "./SimpleWorkflowConfigurationComponents/MailContentEditor";
import FormConfigPanel from "./SimpleWorkflowConfigurationComponents/FormConfigPanel";
import FormPreview from "./SimpleWorkflowConfigurationComponents/FormPreview";
import { defaultMailContent, sanitizeHtmlLTR } from "./SimpleWorkflowConfigurationComponents/mailContentUtils";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  TextField,
  Menu,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
   Autocomplete, 
   Checkbox,       
  Stack,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatClear,
  FormatColorText,
  FormatColorFill,
  FormatListNumbered,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  Image as ImageIcon,
  TableChart,
  ContentPaste,
  TextFields,
  Undo,
  BorderHorizontal,
  BorderVertical,
  HorizontalRule,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";



/* lightweight styles so it works without Tailwind */
const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  pointerEvents: "none",
};
const modalStyle = {
  background: "#fff",
  width: "min(1200px, 96vw)",
  maxHeight: "92vh",
  borderRadius: 12,
  padding: 16,
  overflow: "auto",
  pointerEvents: "auto",
  boxShadow: "0 10px 40px rgba(0,0,0,.35)",
};
const headerRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
};
const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 12,
};
const label = {
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  display: "block",
};
const input = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #ccd",
  borderRadius: 8,
  fontSize: 14,
};

const INPUT_TYPES = [
  { value: "text", label: "text" },
  { value: "textarea", label: "textarea" },
  { value: "checkbox", label: "checkbox" },
  { value: "radio", label: "radio" },
  { value: "attachment", label: "attachment" },
  { value: "date", label: "date" },
  { value: "integer", label: "integer" },
  { value: "dropdownlist", label: "dropdownlist" },
];

const DATE_GRANULARITIES = [
  { value: "date", label: "date" },
  { value: "day", label: "day" },
  { value: "month", label: "month" },
  { value: "year", label: "year" },
];

const ATTACH_MODE_OPTIONS = [
  { value: "view_upload", label: "Can View & Upload" },
  { value: "none", label: "Cannot View & Cannot Upload" },
  { value: "view_only", label: "Can View, Cannot Upload" },
  { value: "upload_only", label: "Cannot View, Can Upload" },
];

/* ───────────────── FORM tab config rules ───────────────── */

// Initiator (create) — hide more columns
const EXCLUDE_ON_INITIATE = new Set([
  "id",
  "step_comments",
  "date_created",
  "date_modified",
  "created_by",
  "modified_by",
  "initiator",
  "performer",
  "wf_status",
  "reviewer",
  "table_type",
  "tenant_id",
  "workflowname",
  "audit_trail",
  "review_requestor",
]);

// Non-Initiator (update) — hide more columns
const EXCLUDE_ON_UPDATE = new Set([
  "id",
  "date_created",
  "date_modified",
  "created_by",
  "modified_by",
  "reviewer",
  "table_type",
  "tenant_id",
  "workflowname",
]);

// fields that are display-only in the Form tab
const DISPLAY_ONLY_FIELDS = new Set([
  "performer",
  "wf_status",
  "review_requestor",
  "initiator",
  "audit_trail",
]);

// only one attachment field allowed in a config
const ATTACHMENT_TYPE = "attachment";

// enforce RO / required on update
const FORCE_RO_ON_UPDATE = new Set(["initiator", "audit_trail"]);
const FORCE_REQUIRED_ON_UPDATE = new Set(["step_comments"]);


// preferred input by DB type
const INPUT_BY_DATATYPE = {
  integer: "integer",
  bigint: "integer",
  numeric: "integer",
  text: "text",
  varchar: "text",
  charactervarying: "text",
  date: "date",
  timestamp: "date",
  timestamptz: "date",
};

const TAB_STEP = "STEP";
const TAB_FORM = "FORM";
const TAB_PREVIEW = "PREVIEW";

const sectionTitleSx = { 
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  color: "#8B4513",     // brown
  mb: 0.4,
};

const inputWhiteSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#ffffff",
    "&.Mui-disabled": {
      backgroundColor: "#f3f4f6", // soft grey for disabled
    },
  },
};

const blueLabelSx = {
  color: "primary.main",
  "&.Mui-focused": { color: "primary.main" },
  "&.Mui-disabled": { color: "primary.main" },
};

export default function SimpleWorkflowStepConfigurationModal({
  header,
  step,
  users = [],
  onClose,
  onSave,
  inline = false,
  onRemove = null,
}) {
  /* Normalise users for selects: store numeric id; show First Last */
  const userOpts = useMemo(() => {
    return (users || [])
      .map((u) => {
        const idRaw = u?.id ?? u?.value ?? null;
        const id = Number.isFinite(Number(idRaw)) ? Number(idRaw) : null;
        const first = (u?.firstname || u?.first_name || "").trim();
        const last = (u?.lastname || u?.last_name || "").trim();
        const full = [first, last].filter(Boolean).join(" ");
        const email = (u?.email || "").trim();
        return id == null
          ? null
          : {
              id,
              value: id,
              label: full || u?.label || email || String(id),
              email,
            };
      })
      .filter(Boolean);
  }, [users]);

  // 🔹 Special synthetic option for "Initiator"
  const INITIATOR_OPTION = useMemo(
    () => ({
      id: 0, // sentinel: means "use initiator"
      value: 0,
      label: "Initiator (who started the workflow)",
      email: "",
    }),
    []
  );

  // 🔹 Options for Step performer – Initiator + all users
  const performerOptions = useMemo(
    () => [INITIATOR_OPTION, ...userOpts],
    [INITIATOR_OPTION, userOpts]
  );

  // Options for mail notifications (include Initiator)
  const mailNotificationOptions = useMemo(
    () => [INITIATOR_OPTION, ...userOpts],
    [INITIATOR_OPTION, userOpts]
  );

  const normalizeStep = (rawStep) => {
    if (!rawStep) return rawStep;
    const base = { ...rawStep };
    // normalize mail_content to object
    let mc = base.mail_content;
    if (typeof mc === "string") {
      try {
        mc = JSON.parse(mc);
      } catch {
        mc = null;
      }
    }
    if (!mc || typeof mc !== "object") {
      mc = defaultMailContent;
    } else {
      mc = { ...defaultMailContent, ...mc };
    }
    // pull persisted notification subject/escalations from mail_content if not present on the step
    if (
      base.mail_notification_subject === undefined ||
      base.mail_notification_subject === null
    ) {
      const subjFromMailContent =
        mc.notification_subject ?? mc.mail_notification_subject ?? "";
      base.mail_notification_subject = subjFromMailContent || "";
    }
    [1, 2, 3].forEach((idx) => {
      const enabledKey = `escalation${idx}_enabled`;
      const daysKey = `escalation${idx}_days`;
      const usersKey = `escalation${idx}_users`;
      const subjectKey = `escalation${idx}_subject`;

      if (
        base[enabledKey] === undefined ||
        base[enabledKey] === null
      ) {
        const rawEnabled = mc[enabledKey];
        if (typeof rawEnabled === "string") {
          base[enabledKey] = rawEnabled.toLowerCase() === "true";
        } else {
          base[enabledKey] = !!rawEnabled;
        }
      } else if (typeof base[enabledKey] === "string") {
        base[enabledKey] = base[enabledKey].toLowerCase() === "true";
      } else {
        base[enabledKey] = !!base[enabledKey];
      }

      if (base[daysKey] === undefined || base[daysKey] === null) {
        const dv = mc[daysKey];
        const num = Number(dv);
        base[daysKey] = Number.isFinite(num) ? num : null;
      }

      if (base[usersKey] === undefined || base[usersKey] === null) {
        const u = Array.isArray(mc[usersKey]) ? mc[usersKey] : [];
        base[usersKey] = u
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v));
      }

      if (base[subjectKey] === undefined || base[subjectKey] === null) {
        const sv = mc[subjectKey];
        base[subjectKey] =
          typeof sv === "string" ? sv : sv ? String(sv) : "";
      }
    });
    base.mail_content = mc;
    return base;
  };

  const [local, setLocal] = useState(() => normalizeStep(step));
  const [tab, setTab] = useState(TAB_STEP);

  // Map INITIATE step form fields by column
  const initiateFieldMap = useMemo(() => {
    const list = Array.isArray(header?.initiateFormFields)
      ? header.initiateFormFields
      : [];
    const map = new Map();
    list.forEach((f) => {
      const col = String(f.column || "").toLowerCase();
      if (!col) return;
      map.set(col, f);
    });
    return map;
  }, [header?.initiateFormFields]);

  const isInitiate = (local.step_name || "").toUpperCase() === "INITIATE";
  const isTerminate = (local.step_name || "").toUpperCase() === "TERMINATE";

  const deriveMode = (cfg) => {
    if (isInitiate) return "create";
    const action = String(cfg?.step_action || "").toLowerCase();
    if (action === "send" || action === "approve") return action;
    return "approve";
  };

  // Step Action (Send/Approve); Initiate maps to create
  const [mode, setMode] = useState(() => deriveMode(local));

  useEffect(() => {
    setMode(deriveMode(local));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.step_action, isInitiate]);

  const stepsLessThanCurrent = Array.isArray(header?.stepsLessThanCurrent)
    ? header.stepsLessThanCurrent
    : [];

  const change = (k, v) => setLocal((s) => ({ ...s, [k]: v }));
  const mailEditorRef = useRef(null);
  const imageInputRef = useRef(null);
  const [fontSizeChoice, setFontSizeChoice] = useState(14);
  const selectionRef = useRef(null);
  const fontInputRef = useRef(null);
  const [showTableBorders, setShowTableBorders] = useState(true);
  const [tableMenu, setTableMenu] = useState(null); // {mouseX, mouseY, cell}
  const normalizePending = useRef(false);
  const mailDraftRef = useRef(local.mail_content?.body || "");
  const [applyMailToFuture, setApplyMailToFuture] = useState(false);
  // default to true unless explicitly disabled
  const wrapContent = local.mail_content?.wrap_content !== false;

  const syncMailBody = () => {
    mailDraftRef.current = mailEditorRef.current?.innerHTML || "";
  };

  const commitMailBody = () => {
    const raw = mailDraftRef.current || mailEditorRef.current?.innerHTML || "";
    const wrapped = raw; // keep raw; backend handles wrapping
    change("mail_content", {
      ...local.mail_content,
      body: wrapped,
    });
  };

  const applyMailFormat = (command, value = null) => {
    if (!mailEditorRef.current) return;
    mailEditorRef.current.focus();
    document.execCommand(command, false, value);
    syncMailBody();
  };

  const clearMailFormat = () => {
    if (!mailEditorRef.current) return;
    document.execCommand("removeFormat");
    syncMailBody();
  };

  const setFontSize = (sizePx) => {
    if (!mailEditorRef.current) return;
    mailEditorRef.current.focus();
    document.execCommand("fontSize", false, "4"); // use size 4 then replace with px
    const fontElements = mailEditorRef.current.querySelectorAll("font[size='4']");
    fontElements.forEach((el) => {
      el.removeAttribute("size");
      el.style.fontSize = `${sizePx}px`;
    });
    syncMailBody();
  };

  const applyBorderStyles = (visible) => {
    if (!mailEditorRef.current) return;
    const tables = mailEditorRef.current.querySelectorAll("table");
    tables.forEach((tbl) => {
      const borderVal = visible ? "1px solid #9ca3af" : "1px solid transparent";
      tbl.style.border = borderVal;
      tbl.style.borderCollapse = "collapse";
      tbl.style.tableLayout = "fixed";
      tbl.style.direction = "ltr";
      tbl.style.writingMode = "horizontal-tb";
      tbl.querySelectorAll("td,th").forEach((cell) => {
        cell.style.border = borderVal;
        cell.style.padding = "6px";
        cell.style.minWidth = "60px";
        cell.style.textAlign = "left";
        cell.style.direction = "ltr";
        cell.style.writingMode = "horizontal-tb";
        cell.setAttribute("contenteditable", "true");
      });
    });
  };

  const normalizeEditorDom = () => {
    if (!mailEditorRef.current) return;
    mailEditorRef.current.setAttribute("dir", "ltr");
    mailEditorRef.current.style.direction = "ltr";
    mailEditorRef.current.style.writingMode = "horizontal-tb";
    mailEditorRef.current.style.unicodeBidi = "plaintext";
    mailEditorRef.current.style.textAlign = "left";
    const all = mailEditorRef.current.querySelectorAll("*");
    all.forEach((el) => {
      el.removeAttribute("dir");
      el.style.direction = "ltr";
      el.style.writingMode = "horizontal-tb";
      el.style.unicodeBidi = "plaintext";
      el.style.textAlign = "left";
      if (el.tagName === "TD" || el.tagName === "TH") {
        el.setAttribute("contenteditable", "true");
      }
      if (el.tagName === "IMG") {
        el.style.maxWidth = "100%";
        el.style.height = "auto";
        el.style.display = "block";
        if (!el.parentElement?.dataset?.resizableImg) {
          const wrapper = document.createElement("div");
          wrapper.dataset.resizableImg = "1";
          wrapper.style.display = "inline-block";
          wrapper.style.resize = "both";
          wrapper.style.overflow = "auto";
          wrapper.style.maxWidth = "100%";
          el.parentElement?.insertBefore(wrapper, el);
          wrapper.appendChild(el);
        } else {
          const p = el.parentElement;
          p.style.display = "inline-block";
          p.style.resize = "both";
          p.style.overflow = "auto";
          p.style.maxWidth = "100%";
        }
      }
    });
    applyBorderStyles(showTableBorders);
  };

  const placeCaretInCell = (cell) => {
    if (!cell) return;
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const insertTable = () => {
    if (!mailEditorRef.current) return;
    mailEditorRef.current.focus();
    const tableHtml =
      '<div style="resize:both; overflow:auto; display:inline-block; max-width:100%;">' +
      '<table style="width:100%; border-collapse:collapse; table-layout:fixed;" border="1">' +
      '<tr><td contenteditable="true" style="padding:6px; min-width:60px;">Cell</td><td contenteditable="true" style="padding:6px; min-width:60px;">Cell</td></tr>' +
      '<tr><td contenteditable="true" style="padding:6px; min-width:60px;">Cell</td><td contenteditable="true" style="padding:6px; min-width:60px;">Cell</td></tr>' +
      "</table></div>";
    document.execCommand("insertHTML", false, tableHtml);
    applyBorderStyles(showTableBorders);
    const firstCell = mailEditorRef.current.querySelector("table td");
    placeCaretInCell(firstCell);
    syncMailBody();
    normalizeEditorDom();
  };

  const insertImage = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const handleImageSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!mailEditorRef.current) return;
    const reader = new FileReader();
    reader.onload = () => {
      mailEditorRef.current.focus();
      const html = `<div data-resizable-img="1" style="display:inline-block; resize: both; overflow: auto; max-width:100%;"><img src="${reader.result}" style="max-width:100%; height:auto; display:block;" /></div>`;
      document.execCommand("insertHTML", false, html);
      syncMailBody();
      if (imageInputRef.current) imageInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const pasteFromClipboard = async () => {
    if (!mailEditorRef.current || !navigator.clipboard?.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      mailEditorRef.current.focus();
      document.execCommand("insertText", false, text);
      syncMailBody();
    } catch (err) {
      console.error("Clipboard paste failed", err);
    }
  };

  const getSelectedCell = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const node = sel.anchorNode;
    if (!node) return null;
    return node.parentElement?.closest("td, th") || null;
  };

  const insertTableRow = (targetCell) => {
    const cell = targetCell || getSelectedCell();
    if (!cell) return;
    const row = cell.closest("tr");
    const table = row?.closest("table");
    if (!row || !table) return;
    const newRow = document.createElement("tr");
    const colCount = row.children.length || 1;
    for (let i = 0; i < colCount; i++) {
      const newCell = document.createElement("td");
      newCell.style.padding = "6px";
      newCell.style.minWidth = "60px";
      newCell.style.textAlign = "left";
      newCell.setAttribute("contenteditable", "true");
      newCell.textContent = "Cell";
      newRow.appendChild(newCell);
    }
    row.after(newRow);
    applyBorderStyles(showTableBorders);
    placeCaretInCell(newRow.children[cell.cellIndex] || newRow.children[0]);
    syncMailBody();
    commitMailBody();
  };

  const insertTableColumn = (targetCell) => {
    const cell = targetCell || getSelectedCell();
    if (!cell) return;
    const colIndex = Array.from(cell.parentElement.children).indexOf(cell);
    const table = cell.closest("table");
    if (!table) return;
    table.querySelectorAll("tr").forEach((row) => {
      const newCell = document.createElement("td");
      newCell.style.padding = "6px";
      newCell.style.minWidth = "60px";
      newCell.style.textAlign = "left";
      newCell.setAttribute("contenteditable", "true");
      newCell.textContent = "Cell";
      row.insertBefore(newCell, row.children[colIndex + 1] || null);
    });
    const focusRow = cell.parentElement;
    placeCaretInCell(focusRow.children[colIndex + 1] || focusRow.children[colIndex]);
    applyBorderStyles(showTableBorders);
    syncMailBody();
    commitMailBody();
  };

  const deleteTableRow = (targetCell) => {
    const cell = targetCell || getSelectedCell();
    if (!cell) return;
    const row = cell.closest("tr");
    const table = row?.closest("table");
    if (!row || !table) return;
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length <= 1) return;
    const rowIndex = rows.indexOf(row);
    const nextRow = rows[rowIndex + 1] || rows[rowIndex - 1] || null;
    row.remove();
    if (nextRow) {
      placeCaretInCell(nextRow.children[Math.min(cell.cellIndex, nextRow.children.length - 1)]);
    }
    applyBorderStyles(showTableBorders);
    syncMailBody();
    commitMailBody();
  };

  const deleteTableColumn = (targetCell) => {
    const cell = targetCell || getSelectedCell();
    if (!cell) return;
    const colIndex = Array.from(cell.parentElement.children).indexOf(cell);
    const table = cell.closest("table");
    if (!table) return;
    const rows = table.querySelectorAll("tr");
    if (rows[0]?.children.length <= 1) return;
    rows.forEach((row) => row.children[colIndex]?.remove());
    const firstRow = rows[0];
    placeCaretInCell(firstRow.children[Math.min(colIndex, firstRow.children.length - 1)]);
    applyBorderStyles(showTableBorders);
    syncMailBody();
    commitMailBody();
  };

  const handleContextMenu = (e) => {
    const cell = e.target.closest("td,th");
    if (cell) {
      e.preventDefault();
      setTableMenu({
        mouseX: e.clientX - 2,
        mouseY: e.clientY - 4,
        cell,
      });
      placeCaretInCell(cell);
    } else {
      setTableMenu(null);
    }
  };

  useEffect(() => {
    applyBorderStyles(showTableBorders);
  }, [showTableBorders, local.mail_content?.body]);

  const handleEditorKeyDown = (e) => {
    // undo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      applyMailFormat("undo");
    }
  };

  const handleEditorMouseUp = (e) => {
    const cell = e.target.closest("td,th");
    if (cell) {
      placeCaretInCell(cell);
    }
    saveSelection();
  };

  const handleEditorKeyUp = () => saveSelection();
  useEffect(() => {
    normalizeEditorDom();
  }, []);

  useEffect(() => {
    applyBorderStyles(showTableBorders);
  }, [showTableBorders]);

  // Only push incoming content into the editor when it actually changed (avoids caret jump)
  useEffect(() => {
    const incoming = sanitizeHtmlLTR(local.mail_content?.body || "");
    mailDraftRef.current = incoming;
  }, [local.mail_content?.body, wrapContent]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const range = selectionRef.current;
    if (!range) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const validateBeforeSave = (next) => {
    if (!isInitiate) {
      const actionNow = String(
        next.step_action || local.step_action || mode || ""
      ).toLowerCase();
      if (actionNow === "approve") {
        const approveLabel =
          typeof next.approve_button_name === "string"
            ? next.approve_button_name.trim()
            : "";
        const rejectLabel =
          typeof next.reject_button_name === "string"
            ? next.reject_button_name.trim()
            : "";
        if (!approveLabel || !rejectLabel) {
          alert("Approve and Reject button text are required for Approve action.");
          return false;
        }
        const v = next.next_step_after_reject;
        const valStr = typeof v === "string" ? v.trim() : String(v ?? "");
        const hasValue = valStr !== "" && valStr.toLowerCase() !== "null";
        const options = (stepsLessThanCurrent || []).map((opt) =>
          String(opt.step_no)
        );
        const inList = options.length === 0 ? false : options.includes(valStr);

        if (!hasValue || !inList) {
          alert("Next Step on Reject is required when Step Action is Approve.");
          return false;
        }
      }
    }
    return true;
  };


  // --------------------------------------------
// RENDER HELPERS (non-intrusive)
// --------------------------------------------
function renderFieldControl(ctrl, formValues, setFormValues) {
  if (!ctrl || !ctrl.field) {
    return (
      <Box
        sx={{
          border: "1px dashed #ccc",
          p: 2,
          borderRadius: 1,
          textAlign: "center",
          color: "text.disabled",
        }}
      >
        Empty
      </Box>
    );
  }

  const field = ctrl.field;
  const key = field.column;

  switch (field.input_type) {
    case "text":
    case "integer":
    case "date":
      return (
        <TextField
          label={field.label}
          fullWidth
          size="small"
          value={formValues[key] || ""}
          onChange={(e) =>
            setFormValues((s) => ({ ...s, [key]: e.target.value }))
          }
        />
      );

    case "textarea":
      return (
        <TextField
          label={field.label}
          fullWidth
          multiline
          minRows={3}
          size="small"
          value={formValues[key] || ""}
          onChange={(e) =>
            setFormValues((s) => ({ ...s, [key]: e.target.value }))
          }
        />
      );

    case "checkbox":
      return (
        <FormControl fullWidth>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {field.label}
          </Typography>
          {(field.option_list || []).map((opt) => (
            <FormControlLabel
              key={opt.value}
              control={
                <Checkbox
                  checked={(formValues[key] || []).includes(opt.value)}
                  onChange={(e) => {
                    const arr = new Set(formValues[key] || []);
                    if (e.target.checked) arr.add(opt.value);
                    else arr.delete(opt.value);
                    setFormValues((s) => ({
                      ...s,
                      [key]: Array.from(arr),
                    }));
                  }}
                />
              }
              label={opt.label}
            />
          ))}
        </FormControl>
      );

    case "dropdownlist":
      return (
        <FormControl fullWidth size="small">
          <InputLabel>{field.label}</InputLabel>
          <Select
            label={field.label}
            value={formValues[key] || ""}
            onChange={(e) =>
              setFormValues((s) => ({
                ...s,
                [key]: e.target.value,
              }))
            }
          >
            {(field.option_list || []).map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );

    default:
      return (
        <TextField
          label={field.label}
          fullWidth
          size="small"
          value={formValues[key] || ""}
          onChange={(e) =>
            setFormValues((s) => ({ ...s, [key]: e.target.value }))
          }
        />
      );
  }
}

function renderSection(section, formValues, setFormValues) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: 700, color: "primary.main" }}
      >
        {section.id.toUpperCase()}
      </Typography>

      {section.rows.map((row) => (
        <Grid container spacing={2} sx={{ mb: 1 }} key={row.id}>
          {row.controls.map((ctrl, i) => (
            <Grid item xs={12} md={ctrl.widthUnits * 3} key={i}>
              {renderFieldControl(ctrl, formValues, setFormValues)}
            </Grid>
          ))}
        </Grid>
      ))}
    </Box>
  );
}


  /* ───────────── PREVIEW helpers & styles ───────────── */

  const previewWrap = {
    border: "1px solid #d7dce3",
    borderRadius: 10,
    padding: 24,
    background: "#f9fafb",
  };

  const previewHeader = {
    display: "grid",
    gridTemplateColumns: "56px 1fr 56px",
    alignItems: "center",
    marginBottom: 16,
  };

  const orgLogo = {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "1px solid #c8d1dc",
    background: "linear-gradient(#fff, #f3f6fa)",
    justifySelf: "start",
  };

  const orgTitle = { textAlign: "center", fontSize: 20, fontWeight: 700 };
  const formTitle = {
    fontSize: 18,
    fontWeight: 600,
    margin: "8px 0 18px",
  };

  const formGrid = {
    display: "grid",
    gap: 12,
  };

  const previewInput = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #9db3c7",
    borderRadius: 8,
    background: "#fff",
    outline: "none",
  };

  const actionBar = {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  };

  const btn = (bg, fg, brd = bg) => ({
    border: `1px solid ${brd}`,
    background: bg,
    color: fg,
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 600,
  });

  /** Returns the fields we should preview */
  const [formRows, setFormRows] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [dbCols, setDbCols] = useState(new Set());
  const [loadingForm, setLoadingForm] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [activeFormLayout, setActiveFormLayout] = useState(null);
  const [applyingAll, setApplyingAll] = useState(false);

  // reset local state whenever parent selects a different step
  useEffect(() => {
    if (!step) return;
    setLocal(normalizeStep(step));
    setTab(TAB_STEP);        // optional: always go back to Step tab on change
  }, [step?.id]);


  const recordId =
    header?.current_row_id ??
    local?.current_row_id ??
    header?.active_row_id ??
    null;

  function getPreviewFields() {
    const base =
      Array.isArray(formRows) && formRows.length > 0
        ? formRows
        : Array.isArray(local?.step_form_configuration?.fields)
        ? local.step_form_configuration.fields
        : [];

    let rows = [...base];

    // add a virtual attachment input if allowed and none configured
    if (
      local.attachments_allowed &&
      !rows.some(
        (x) =>
          String(x.input_type || "").toLowerCase() === "attachment"
      )
    ) {
      rows = [
        ...rows,
        {
          column: "_attachments",
          label: "Attachments",
          input_type: "attachment",
          data_entry: true,
          visible: true,
          mandatory: false,
        },
      ];
    }

    return rows.filter((r) => r?.visible);
  }

   // 🔹 NEW: same fields, but **ordered by activeFormLayout** when available
  function getOrderedPreviewFields() {
    const rows = getPreviewFields();
    if (!activeFormLayout || !Array.isArray(activeFormLayout.sections)) {
      return rows;
    }

    // materializeLayout wants previewFields; here we pass the same rows
    const materialized = materializeLayout(activeFormLayout, rows);
    if (!materialized || !Array.isArray(materialized)) return rows;

    const byColumn = new Map(
      rows.map((r) => [String(r.column || "").trim(), r])
    );

    const ordered = [];

    // 1) Take fields in strict layout order
    for (const sec of materialized) {
      if (!sec || !Array.isArray(sec.columns)) continue;
      for (const col of sec.columns) {
        if (!col || !Array.isArray(col.fields)) continue;
        for (const f of col.fields) {
          const key = String(f.field || "").trim();
          if (!key) continue;
          const meta = byColumn.get(key);
          if (!meta) continue;
          // meta is already filtered by visible in getPreviewFields()
          ordered.push(meta);
          byColumn.delete(key);
        }
      }
    }

    // 2) Append any remaining visible fields not placed in layout
    for (const [key, meta] of byColumn.entries()) {
      ordered.push(meta);
    }

    return ordered;
  }


  function buildSubmissionPayload(action, dbColsSet) {
    const rows = getPreviewFields();
    const draft = {};

    rows.forEach((row) => {
      if (!row?.visible || !row?.data_entry) return;
      const key = String(row.column || "").trim();
      if (!key) return;

      const t = String(row.input_type || "").toLowerCase();
      let v = formValues[key];

      if (t === "integer") {
        if (v === "" || v == null) v = null;
        else {
          const n = Number(v);
          v = Number.isFinite(n) ? n : v;
        }
      } else if (t === "date") {
        v = v === "" || v == null ? null : String(v);
      } else if (t === "checkbox") {
        v = Array.isArray(v) ? v : [];
      } else if (t === "radio" || t === "dropdownlist") {
        v = v === "" || v == null ? null : String(v);
      } else if (t === "attachment") {
        v = Array.isArray(v) ? v : [];
      } else {
        v = v ?? "";
      }

      draft[key] = v;
    });

    draft.wf_status = isInitiate
      ? "Submitted"
      : action === "approve"
      ? "Approved"
      : action === "reject"
      ? "Rejected"
      : action === "refer"
      ? "Referred"
      : "Sent";

    const payload = {};
    const set = dbColsSet && dbColsSet.size ? dbColsSet : null;
    Object.keys(draft).forEach((k) => {
      if (!set) {
        payload[k] = draft[k];
        return;
      }
      if (set.has(k.toLowerCase())) payload[k] = draft[k];
    });

    return { payload, draft };
  }

  async function ensureDbCols() {
    if (dbCols && dbCols.size > 0) return dbCols;
    if (!header?.workflow_table_name) return new Set();

    try {
      const t = encodeURIComponent(header.workflow_table_name);
      const r = await api.get(`/tables/columns/${t}`);
      const cols = Array.isArray(r.data) ? r.data : [];
      const names = cols
        .map(
          (c) =>
            String(
              c.column_name ?? c.column ?? c.name ?? ""
            )
              .trim()
              .toLowerCase()
        )
        .filter(Boolean);
      const set = new Set(names);
      setDbCols(set);
      return set;
    } catch (e) {
      console.error("[submit] could not fetch table columns", e);
      return new Set();
    }
  }

  function isEmptyForType(t, v) {
    const kind = String(t || "").toLowerCase();
    if (kind === "checkbox") return !Array.isArray(v) || v.length === 0;
    if (kind === "attachment") return !Array.isArray(v) || v.length === 0;
    return v === "" || v == null;
  }

  function validateFormValues(rows, values) {
    const errors = [];
    for (const r of rows) {
      if (!r?.visible || !r?.data_entry) continue;
      const key = String(r.column || "").trim();
      const kind = String(r.input_type || "").toLowerCase();
      const val = values[key];

      if (r.mandatory && isEmptyForType(kind, val)) {
        errors.push(`${r.label || key}: required`);
        continue;
      }

      if (kind === "integer" && !isEmptyForType(kind, val)) {
        const n = Number(val);
        if (!Number.isFinite(n) || !Number.isInteger(n)) {
          errors.push(`${r.label || key}: must be an integer`);
        }
      }
      if (kind === "date" && !isEmptyForType(kind, val)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
          errors.push(`${r.label || key}: invalid date`);
        }
      }
    }
    return errors;
  }

  async function submitForm(action) {
    if (!header?.workflow_table_name) {
      alert("Workflow table is missing.");
      return;
    }
    const table = header.workflow_table_name;

    const colsSet = await ensureDbCols();
    const { payload, draft } = buildSubmissionPayload(action, colsSet);

    const rowsForValidation = getOrderedPreviewFields();

    // Use the layout selected in SimpleWorkflowFormViews (already supplied via onSelectLayout)
    const layoutDef = activeFormLayout || null;

    const errs = validateFormValues(rowsForValidation, draft);
    if (errs.length) {
      alert(
        `Please fix the following:\n• ` + errs.join("\n• ")
      );
      return;
    }

    if (!payload || Object.keys(payload).length === 0) {
      alert(
        "No fields to submit. Configure visible/data-entry fields or open the Form tab once."
      );
      return;
    }

    setSubmitting(true);
    try {
      if (isInitiate) {
        const resp = await api.post(
          `/table/rows/${encodeURIComponent(table)}`,
          payload
        );
        const newId =
          resp?.data?.id ??
          resp?.data?.insertedId ??
          resp?.data?.pk;
        if (newId)
          setLocal((s) => ({ ...s, current_row_id: newId }));
        alert("Record created.");
      } else {
        const id = recordId;
        if (!id) {
          alert("No record selected to update.");
          return;
        }
        await api.put(
          `/table/rows/${encodeURIComponent(table)}/${id}`,
          payload
        );
        alert("Record updated.");
      }
    } catch (err) {
      console.error("[form] submit failed", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Unknown error";
      alert(
        `Failed to ${isInitiate ? "create" : "update"} record: ${msg}`
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ========= FORM helpers =========

  function buildEmptyValues(rows) {
    const out = {};
    (rows || []).forEach((r) => {
      const key = String(r.column || "").trim();
      if (!key) return;
      const t = String(r.input_type || "").toLowerCase();
      if (t === "checkbox") out[key] = [];
      else out[key] = "";
    });
    return out;
  }

  // Load existing row for non-initiate
  useEffect(() => {
    let cancelled = false;
    async function loadExisting() {
      if (isInitiate) {
        setFormValues(buildEmptyValues(formRows));
        return;
      }
      if (!recordId || !header?.workflow_table_name) {
        setFormValues(buildEmptyValues(formRows));
        return;
      }
      try {
        const t = encodeURIComponent(header.workflow_table_name);
        const tries = [
          `/db/rows/${t}/${recordId}`,
          `/api/db/rows/${t}/${recordId}`,
          `/db/row?table=${t}&id=${recordId}`,
          `/api/db/row?table=${t}&id=${recordId}`,
        ];
        let data = null;
        for (const url of tries) {
          try {
            const r = await api.get(url);
            if (r?.data) {
              data = r.data;
              break;
            }
          } catch (_) {}
        }
        const base = buildEmptyValues(formRows);
        const merged = { ...base, ...(data || {}) };
        if (!cancelled) setFormValues(merged);
      } catch (err) {
        console.error("[form] load existing row failed", err);
        if (!cancelled) setFormValues(buildEmptyValues(formRows));
      }
    }
    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [
    isInitiate,
    recordId,
    header?.workflow_table_name,
    JSON.stringify(formRows),
  ]);

  const shouldShowColumn = (colName) => {
    const c = (colName || "").toLowerCase();
    return isInitiate
      ? !EXCLUDE_ON_INITIATE.has(c)
      : !EXCLUDE_ON_UPDATE.has(c);
  };

  function titleCase(s = "") {
    return s
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function defaultRowFor(col) {
    const column = (col.column_name || col.column || "").trim();
    const data_type = String(col.data_type || "").toLowerCase();
    const input_type = INPUT_BY_DATATYPE[data_type] || "text";

    let row = {
      column,
      label: titleCase(column),
      data_type,
      input_type,
      options: "",
      date_granularity: "date",
      data_entry: true,
      read_only: false,
      visible: true,
      mandatory: true,
      attachments: [],
    };

    if (!isInitiate) {
      if (FORCE_RO_ON_UPDATE.has(column.toLowerCase())) {
        row.read_only = true;
        row.data_entry = false;
        row.visible = true;
      }
      if (FORCE_REQUIRED_ON_UPDATE.has(column.toLowerCase())) {
        row.mandatory = true;
        row.visible = true;
      }
    }
    return row;
  }

  function mergeWithSaved(defaultRows) {
    const saved =
      local?.step_form_configuration &&
      local.step_form_configuration.fields
        ? local.step_form_configuration.fields
        : [];

    const savedByCol = new Map(
      saved.map((r) => [String(r.column || "").toLowerCase(), r])
    );

    return defaultRows.map((r) => {
      const colKey = String(r.column || "").toLowerCase();
      let merged = r;

      const hit = savedByCol.get(colKey);
      if (hit) merged = { ...merged, ...hit };

      // lock Input Type on non-INITIATE
      if (!isInitiate && initiateFieldMap.has(colKey)) {
        const base = initiateFieldMap.get(colKey);
        merged = {
          ...merged,
          input_type: base.input_type ?? merged.input_type,
          options: base.options ?? merged.options,
          option_list: base.option_list ?? merged.option_list,
          date_granularity:
            base.date_granularity ?? merged.date_granularity,
        };
      }

      return merged;
    });
  }

  // When entering PREVIEW, if no fields, load default columns
  useEffect(() => {
    if (tab !== TAB_PREVIEW) return;

    const haveAny =
      (Array.isArray(formRows) && formRows.length > 0) ||
      (Array.isArray(local?.step_form_configuration?.fields) &&
        local.step_form_configuration.fields.length > 0);

    // 👉 If we already have rows, don't hit /table/columns again
    if (haveAny) return;

    (async () => {
      if (!header?.workflow_table_name) return;
      try {
        const t = header.workflow_table_name;
        const r = await api.get(`/tables/columns/${encodeURIComponent(t)}`);
        const cols = Array.isArray(r.data) ? r.data : [];

        const normalized = cols.map((c) => ({
          column_name:
            c.column_name ?? c.column ?? c.name ?? "",
          data_type: String(
            c.data_type ?? c.udt_name ?? c.type ?? ""
          ).toLowerCase(),
        }));

        const colNames = normalized
          .map((c) =>
            String(
              c.column_name || c.column || c.name || ""
            )
              .trim()
              .toLowerCase()
          )
          .filter(Boolean);
        setDbCols(new Set(colNames));

        const filtered = normalized
          .filter((c) => shouldShowColumn(c.column_name))
          .map(defaultRowFor);

        setFormRows(filtered);

        const base = {};
        filtered.forEach((row) => {
          const k = String(row.column || "").trim();
          if (!k) return;
          const t = String(row.input_type || "").toLowerCase();
          base[k] = t === "checkbox" ? [] : "";
        });
        setFormValues((prev) => ({ ...base, ...prev }));
      } catch (e) {
        console.error("[PREVIEW] load columns failed", e);
      }
    })();
  }, [tab, header?.workflow_table_name]);

  useEffect(() => {
    if (tab !== TAB_PREVIEW) return;
    const fields = getOrderedPreviewFields();
    const base = {};
    fields.forEach((r) => {
      const k = String(r.column || "").trim();
      if (!k) return;
      const t = String(r.input_type || "").toLowerCase();
      base[k] = t === "checkbox" ? [] : "";
    });
    setFormValues((prev) => ({ ...base, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeFormLayout]);

  // Load DB columns when FORM tab is shown
  useEffect(() => {
    if (tab !== TAB_FORM) return;
    if (!header?.workflow_table_name) return;
   // 👉 If we already built formRows once, don't keep re-calling /table/columns
   if (formRows && formRows.length > 0) return;
    let cancelled = false;
    setLoadingForm(true);

    async function load() {
      try {
        const t = encodeURIComponent(header.workflow_table_name);
        const { data } = await api.get(`/table/columns/${t}`);
        const arr = Array.isArray(data) ? data : [];

        const normalized = arr.map((c) => ({
          column_name:
            c.column_name ?? c.column ?? c.name ?? "",
          data_type: String(
            c.data_type ?? c.udt_name ?? c.type ?? ""
          ).toLowerCase(),
        }));

        const colNames = normalized
          .map((c) =>
            String(
              c.column_name || c.column || c.name || ""
            )
              .trim()
              .toLowerCase()
          )
          .filter(Boolean);
        setDbCols(new Set(colNames));

        const filtered = normalized
          .filter((c) => shouldShowColumn(c.column_name))
          .map(defaultRowFor);

        if (!cancelled) setFormRows(mergeWithSaved(filtered));
      } catch (e) {
        console.error("[FORM] load columns failed", e);
        if (!cancelled) setFormRows([]);
      } finally {
        if (!cancelled) setLoadingForm(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, header?.workflow_table_name, isInitiate]);

  function onChangeRow(idx, patch) {
    setFormRows((prev) => {
      const next = [...prev];
      let r = { ...next[idx], ...patch };

      const colLower = String(r.column || "").toLowerCase();
      const dt = String(r.data_type || "").toLowerCase();

      if (patch.input_type === ATTACHMENT_TYPE) {
        const isTextLike = [
          "text",
          "varchar",
          "character varying",
          "charactervarying",
        ].includes(dt);
        if (!isTextLike) {
          alert("Only text columns can be set as Attachment.");
          r.input_type = next[idx].input_type || "text";
        } else {
          const already = next.filter(
            (row, i) =>
              i !== idx &&
              String(row.input_type).toLowerCase() ===
                ATTACHMENT_TYPE
          );
          if (already.length > 0) {
            alert("Only one field may be configured as Attachment.");
            r.input_type = next[idx].input_type || "text";
          } else {
            r.attachments = Array.isArray(r.attachments)
              ? r.attachments
              : [];
          }
        }
      }

      const isDateType =
        dt === "date" || dt === "timestamp" || dt === "timestamptz";
      if (isDateType) {
        r.input_type = "date";
        if (!r.date_granularity) r.date_granularity = "date";
      } else {
        if (r.input_type === "date") r.input_type = "text";
        r.date_granularity = null;
      }

      const supportsOptions = ["checkbox", "radio", "dropdownlist"].includes(
        String(r.input_type).toLowerCase()
      );
      if (!supportsOptions) r.options = "";

      if (r.read_only) {
        r.data_entry = false;
        if (colLower !== "workflow_id") {
          r.visible = true;
        }
      }
      if (r.data_entry) {
        r.read_only = false;
        r.visible = true;
      } else {
        r.mandatory = false;
      }

      if (DISPLAY_ONLY_FIELDS.has(colLower)) {
        r.data_entry = false;
        r.read_only = false;
        r.mandatory = false;
      }

      next[idx] = r;
      return next;
    });
  }

  const saveFormConfig = () => {
    const normalized = (formRows || []).map((r) => {
      const col = String(r.column || "").trim();
      const dt = String(r.data_type || "").toLowerCase();
      const isDateType =
        dt === "date" || dt === "timestamp" || dt === "timestamptz";

      const input_type = isDateType ? "date" : r.input_type || "text";
      const date_granularity = isDateType
        ? r.date_granularity || "date"
        : null;

      const supportsOptions = ["checkbox", "radio", "dropdownlist"].includes(
        input_type
      );
      let options = supportsOptions ? (r.options || "").trim() : "";

      let option_list = [];
      if (supportsOptions && options.length > 0) {
        const parts = options
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        option_list = parts.map((label, i) => {
          if (input_type === "dropdownlist" && dt === "integer") {
            return { label, value: i + 1 };
          }
          return { label, value: label };
        });
      }

      const ro = !!r.read_only;
      const de = ro ? false : !!r.data_entry;
      const visible = ro
        ? col.toLowerCase() === "workflow_id"
          ? !!r.visible
          : true
        : !!r.visible;
      const mandatory = de ? !!r.mandatory : false;

      if (DISPLAY_ONLY_FIELDS.has(col.toLowerCase())) {
        return {
          column: col,
          label: r.label || col,
          data_type: dt,
          input_type:
            input_type === ATTACHMENT_TYPE ? "text" : input_type,
          options: "",
          option_list: [],
          date_granularity: isDateType ? date_granularity : null,
          data_entry: false,
          read_only: false,
          visible: !!r.visible,
          mandatory: false,
        };
      }

      const attachments =
        String(input_type).toLowerCase() === ATTACHMENT_TYPE
          ? Array.isArray(r.attachments)
            ? r.attachments
            : []
          : [];

      return {
        column: col,
        label: r.label || col,
        data_type: dt,
        input_type,
        options,
        option_list,
        date_granularity,
        data_entry: de,
        read_only: ro,
        visible,
        mandatory,
        attachments,
      };
    });

    const out = {
      ...local,
      step_form_configuration: { fields: normalized },
    };

    if (isInitiate || String(out.step_action || "").toLowerCase() === "send") {
      out.approve_button_name = "Send";
      out.reject_button_name = null;
      out.next_step_after_reject = null;
    }

    if (!validateBeforeSave(out)) return;
    onSave?.(out);

    // Show success modal
    setShowSavedModal(true);
   };

  const handleSave = () => {
    const out = { ...local };

    if (isInitiate) {
      out.step_type = "create";
      out.step_action = "send";
      out.review_allowed = false;
      out.step_performer = null;
      out.approve_button_name = "Send";
      out.reject_button_name = undefined;
      out.step_due_in_days = undefined;
    } else {
      out.step_type = "update";
      out.step_action = mode;
      if (mode === "send") {
        out.approve_button_name = "Send";
        out.reject_button_name = null;
        out.next_step_after_reject = null;
      }
    }

    // Require "Next step on reject" when in Approve mode
    const actionNow = String(
      out.step_action || local.step_action || mode || ""
    ).toLowerCase();
    if (!isInitiate && actionNow === "approve") {
      const v = out.next_step_after_reject;
      const hasValue =
        v !== null &&
        v !== undefined &&
        !(typeof v === "string" && v.trim() === "");
      if (!hasValue) {
        alert("Next step on reject is required when Step action is Approve.");
        return;
      }
    }

    if (
      out.step_performer !== null &&
      out.step_performer !== undefined &&
      out.step_performer !== ""
    ) {
      const n = Number(out.step_performer);
      if (Number.isFinite(n)) out.step_performer = n;
    }

    if (Array.isArray(out.mail_notification_users)) {
      out.mail_notification_users = out.mail_notification_users
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v));
    } else {
      out.mail_notification_users = [];
    }

    // regular notification subject
    if (typeof out.mail_notification_subject !== "string") {
      out.mail_notification_subject = out.mail_notification_subject
        ? String(out.mail_notification_subject)
        : "";
    }

    // normalize escalations (enabled, days, users, subject)
    [1, 2, 3].forEach((idx) => {
      const enabledKey = `escalation${idx}_enabled`;
      const daysKey = `escalation${idx}_days`;
      const usersKey = `escalation${idx}_users`;
      const subjectKey = `escalation${idx}_subject`;

      out[enabledKey] = !!out[enabledKey];

      const dayVal = Number(out[daysKey]);
      out[daysKey] = Number.isFinite(dayVal) ? dayVal : null;

      if (Array.isArray(out[usersKey])) {
        out[usersKey] = out[usersKey]
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v));
      } else {
        out[usersKey] = [];
      }

      if (typeof out[subjectKey] !== "string") {
        out[subjectKey] = out[subjectKey] ? String(out[subjectKey]) : "";
      }
    });

    // normalize mail_content as JSON object
    const mc =
      out.mail_content && typeof out.mail_content === "object"
        ? out.mail_content
        : defaultMailContent;
    out.mail_content = {
      ...defaultMailContent,
      ...mc,
      body: mc.body || "",
      dear_recipient: !!mc.dear_recipient,
      include_report: !!mc.include_report,
      report_ref: mc.report_ref || "",
      click_here_enabled: !!mc.click_here_enabled,
      click_here_text: mc.click_here_text || "",
      click_here_url: mc.click_here_url || "",
      attach_pdf: !!mc.attach_pdf,
    };
    // Persist regular notification subject + escalation details inside mail_content
    out.mail_content.notification_subject =
      typeof out.mail_notification_subject === "string"
        ? out.mail_notification_subject
        : out.mail_notification_subject
        ? String(out.mail_notification_subject)
        : "";
    [1, 2, 3].forEach((idx) => {
      const enabledKey = `escalation${idx}_enabled`;
      const daysKey = `escalation${idx}_days`;
      const usersKey = `escalation${idx}_users`;
      const subjectKey = `escalation${idx}_subject`;

      const dayVal = Number(out[daysKey]);
      out.mail_content[enabledKey] = !!out[enabledKey];
      out.mail_content[daysKey] = Number.isFinite(dayVal) ? dayVal : null;
      out.mail_content[usersKey] = Array.isArray(out[usersKey])
        ? out[usersKey].map((v) => Number(v)).filter((v) => Number.isFinite(v))
        : [];
      const subjVal = out[subjectKey];
      out.mail_content[subjectKey] =
        typeof subjVal === "string" ? subjVal : subjVal ? String(subjVal) : "";
    });
    if (applyMailToFuture && isInitiate) {
      out.__applyMailToFuture = true;
    }

    

    if (!validateBeforeSave(out)) return;
    onSave?.(out);

    // Show success modal
    setShowSavedModal(true);
    setApplyMailToFuture(false);
  };

  const handleApplyAllSteps = async () => {
    const wid =
      header?.workflow_map_id ||
      header?.workflow_id ||
      header?.id ||
      null;
    const sourceStepNo = local?.step_no;
    if (!wid || sourceStepNo == null) {
      alert('Workflow or Step missing.');
      return;
    }
    try {
      setApplyingAll(true);
      await api.post(`/simple_workflowbuilder/steps/${wid}/apply-form-config`, {
        source_step_no: sourceStepNo,
      });
      alert('Form configuration applied to all steps.');
    } catch (e) {
      console.error('apply-all form config failed', e);
      alert(e?.response?.data?.error || 'Failed to apply to all steps');
    } finally {
      setApplyingAll(false);
    }
  };

  /* ─────────────────────────── RENDER BODY ─────────────────────────── */

  const body = (
    <>
            {/* Top bar: title + capsule tabs + Enabled toggle */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "primary.main",
            }}
          >
            {`Configure ${
              local.step_name ? `  ${local.step_name}` : ""
            }`}
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mt: 0.5 }}
          >
            Define who performs this step, behaviour, actions and notifications and the form field settings
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* <FormControlLabel
            control={<Switch color="primary" checked />}
            label="Enabled"
          /> */}
          {typeof onRemove === "function"
            ? (() => {
                const nm = String(local.step_name || "").toUpperCase();
                const disableRemove = nm === "INITIATE" || nm === "TERMINATE";
                return (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    disabled={disableRemove}
                    onClick={() => onRemove(local)}
                    sx={{ textTransform: "none" }}
                  >
                    Remove Step
                  </Button>
                );
              })()
            : null}

          <Tabs
  value={tab}
  onChange={(_, v) => setTab(v)}
  sx={{
    minHeight: 0,
    // outer capsule
    bgcolor: "#f3f4f6",
    borderRadius: 999,
    p: 0.5,

    "& .MuiTab-root": {
      minHeight: 28,
      textTransform: "none",
      fontSize: 13,
      px: 2.5,
      borderRadius: 999,
      // no individual borders, softer look
      border: "none",
      color: "text.secondary",
      minWidth: "auto",
    },

    "& .MuiTab-root.Mui-selected": {
      bgcolor: "#ffffff",
      color: "primary.main",
      boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.06)",
    },

    "& .MuiTabs-indicator": {
      display: "none",
    },
  }}
>
  <Tab label="Step details" value={TAB_STEP} />
  <Tab label="Form Fields" value={TAB_FORM} />
  <Tab label="Render Form to View" value={TAB_PREVIEW} />
</Tabs>

        </Box>
      </Box>

      {/* STEP TAB – MUI version */}
      {tab === TAB_STEP && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Grid container spacing={2}>
            {/* BASIC INFO */}
            <Grid item xs={12} md={6}>
              <StepBasics
                local={local}
                change={change}
                isInitiate={isInitiate}
                isTerminate={isTerminate}
                performerOptions={performerOptions}
                blueLabelSx={blueLabelSx}
                inputWhiteSx={inputWhiteSx}
              />
            </Grid>

            {/* BEHAVIOUR */}
            <Grid item xs={12} md={6}>
              <StepBehaviour
                local={local}
                change={change}
                mode={mode}
                setMode={setMode}
                isInitiate={isInitiate}
                stepsLessThanCurrent={header?.stepsLessThanCurrent || []}
                blueLabelSx={blueLabelSx}
                inputWhiteSx={inputWhiteSx}
                ATTACH_MODE_OPTIONS={ATTACH_MODE_OPTIONS}
              />
            </Grid>
          </Grid>

          {/* ACTIONS & NOTIFICATIONS */}
          <Paper
            variant="outlined"
            sx={{ p: 1.5, pt: 1.25, bgcolor: "grey.50", borderRadius: 2 }}
          >
            <Typography
              variant="overline"
              sx={{ color: "brown", fontWeight: 600, letterSpacing: 0.8 }}
            >
              Actions & notifications
            </Typography>

            {/* Regular notifications */}
            <NotificationsRegular
              local={local}
              change={change}
              mailNotificationOptions={mailNotificationOptions}
              blueLabelSx={blueLabelSx}
              inputWhiteSx={inputWhiteSx}
            />

            <NotificationsEscalations
              local={local}
              change={change}
              userOpts={userOpts}
              blueLabelSx={blueLabelSx}
              inputWhiteSx={inputWhiteSx}
            />

            <MailContentEditor
              local={local}
              change={change}
              isInitiate={isInitiate}
              mailDraftRef={mailDraftRef}
              showTableBorders={showTableBorders}
              setShowTableBorders={setShowTableBorders}
              wrapContent={wrapContent}
              applyMailToFuture={applyMailToFuture}
              setApplyMailToFuture={setApplyMailToFuture}
              blueLabelSx={blueLabelSx}
              inputWhiteSx={inputWhiteSx}
            />

            <Box
              sx={{
                mt: 2,
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              {!inline && (
                <Button
                  onClick={onClose}
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: "none" }}
                >
                  Close
                </Button>
              )}
              <Button
                onClick={handleSave}
                variant="contained"
                size="small"
                sx={{ textTransform: "none" }}
              >
                Save
              </Button>
            </Box>
          </Paper>
        </Box>
      )}


      





      {tab === TAB_FORM && (
        <FormConfigPanel
          formRows={formRows}
          loadingForm={loadingForm}
          saveFormConfig={saveFormConfig}
          handleApplyAllSteps={handleApplyAllSteps}
          isInitiate={isInitiate}
          applyingAll={applyingAll}
          onChangeRow={onChangeRow}
          inputWhiteSx={inputWhiteSx}
          blueLabelSx={blueLabelSx}
          ATTACHMENT_TYPE={ATTACHMENT_TYPE}
          DATE_GRANULARITIES={DATE_GRANULARITIES}
          INPUT_TYPES={INPUT_TYPES}
          recordId={recordId}
          header={header}
          stepName={local.step_name}
        />
      )}
      {/* VIEW FORM / PREVIEW TAB */}
            {/* RENDER FORM TAB (was: View form) */}
      {tab === TAB_PREVIEW && (
        <FormPreview
          header={header}
          local={local}
          previewFields={getOrderedPreviewFields()}
          setActiveFormLayout={setActiveFormLayout}
          renderSection={renderSection}
          formValues={formValues}
          setFormValues={setFormValues}
        />
      )}

        {/* Save success modal */}
  <Dialog
    open={showSavedModal}
    onClose={() => setShowSavedModal(false)}
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle>Step saved</DialogTitle>
    <DialogContent dividers>
      <Typography variant="body2">
        Your step configuration has been saved successfully.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button
        onClick={() => setShowSavedModal(false)}
        variant="contained"
        size="small"
        sx={{ textTransform: "none" }}
      >
        OK
      </Button>
    </DialogActions>
  </Dialog>


    </>
  );

  /* ─────────────────────────── FINAL RETURN ─────────────────────────── */

  // Inline mode: embedded in page (centre column)
  if (inline) {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 2,
          bgcolor: "background.paper",
          height: "100%",
        }}
      >
        {body}
      </Paper>
    </Box>
  );
}


  // Default: popup modal
  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>{body}</div>
    </div>
  );
}
