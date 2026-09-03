// src/pages/businessautomation/components/BAAssignments.jsx
import React, { useEffect, useMemo, useState, useRef, useImperativeHandle, } from "react";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DownloadIcon from "@mui/icons-material/Download";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import {
  Backdrop,
  Box,
  Button,
  Card,
  CardActionArea,
  Container ,
  CardContent,
  Chip,
  Stack,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Pagination,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { MenuItem, FormControlLabel, Checkbox, Radio, RadioGroup, FormControl } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import BoltIcon from "@mui/icons-material/Bolt";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import api from "../../../services/api"; // adjust if different
import { materializeLayout } from "../simple_workflowbuilder/components/simpleWorkflowFormLayouts";



/* ----------------------------- small utilities ----------------------------- */

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const statusChipColor = (s) => {
  const k = String(s || "").toLowerCase();
  if (k === "closed" || k === "approved") return "success";
  if (k === "rejected") return "error";
  if (k === "in-progress") return "info";
  return "warning";
};

const cardSx = {
  height: "100%",
  borderRadius: 2,
  border: "1px solid #2f5fff",
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 10px rgba(16, 24, 40, 0.16)",
  minHeight: 160,
  transition: "transform .12s ease, box-shadow .12s ease, border-color .12s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 10px 18px rgba(16, 24, 40, 0.22)",
    borderColor: "#1a4fd8",
  },
};

/* ----------------------------- Instance Card ------------------------------ */

function safeParseJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}


function normalizeAuditTrail(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return parsed ? [parsed] : [];
    } catch {
      return [];
    }
  }

  if (typeof raw === "object") {
    return [raw];
  }

  return [];
}



function normalizeAttachmentMode(raw) {
  if (raw === true) return "true";
  if (raw === false) return "false";
  if (raw === 1) return "1";
  if (raw === 0) return "0";
  return String(raw ?? "").trim().toLowerCase();
}

function canUploadAttachments(raw) {
  const m = normalizeAttachmentMode(raw);

  if (!m) return false;

  // Explicit YES flags
  if (m === "true" || m === "1" || m === "yes" || m === "y") return true;

  // Explicit NO / view-only flags
  if (
    m === "false" ||
    m === "0" ||
    m === "no" ||
    m === "n" ||
    m === "view" ||
    m === "view_only"
  ) {
    return false;
  }

  // Explicit upload modes
  if (m === "view_upload" || m === "upload_only") return true;

  // Any value containing "upload" – treat as uploadable
  if (m.includes("upload")) return true;

  // 🔴 DEFAULT NOW = NO (non-intrusive but no more “magic yes”)
  return false;
}






function InstanceCard({ item, onOpen }) {
  return (
    <Card sx={cardSx}>
      <CardActionArea onClick={() => onOpen?.(item)}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ fontSize: 11 }}   // ↓ smaller meta text
            >
              #{item?.id ?? "—"}
            </Typography>

            <Chip
              size="small"
              label={item?.wf_status || "New"}
              color={statusChipColor(item?.wf_status)}
              variant="filled"
              sx={{
                height: 20,          // ↓ smaller chip height
                fontSize: 11,
              }}
            />
          </Box>

          <Typography
            variant="subtitle1"
            sx={{
              mb: 0.5,
              fontWeight: 500,
              fontSize: 14,          // ↓ title size
              lineHeight: 1.25,
            }}
          >
            {item?.workflow_map_name || item?.workflow_name || "Workflow"}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1,
              fontSize: 12.5,        // ↓ step line size
              lineHeight: 1.35,
            }}
          >
            Step:{" "}
            <Box component="span" sx={{ fontWeight: 600 }}>
              {item?.step_name || "—"}
            </Box>
          </Typography>

          <Divider sx={{ my: 1 }} />

          <Typography
            variant="body2"
            sx={{
              lineHeight: 1.45,      // ↓ tighter lines
              fontSize: 12.5,        // ↓ details size
            }}
          >
            <b>Date Started:</b> {fmt(item?.date_created)} <br />
            <b>Date Assigned:</b> {fmt(item?.step_assigned_date)} <br />
            <b>Due Date:</b> {fmt(item?.step_due_date)} <br />
            <b>Assigned by:</b> {item?.assigned_by_name || item?.assigned_by || "-"}  <br />
            <b>Step Performer:</b> {item?.step_performer_name || item?.step_performer_email || item?.step_performer ||"-"}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}




// ---- DynamicStepForm -------------------------------------------------------

const DynamicStepForm = React.forwardRef(function DynamicStepForm(
  {
    schema,
    onSubmit,
    initial = {},
    attachmentsAllowed = false,
    primaryActionLabel = "Send",
    showPrimaryButton = true,
    forceReadOnlyColumns = [],
    extraRequiredColumns = [],
    getCurrentAction,
    oneColumn = false,
    layoutSections = null,
    canvasModel = null,
    containerStyle = null,
    presentation = "default",
    children,
  },
  ref
) {
  const fields = Array.isArray(schema?.fields) ? schema.fields : [];

  const [stagedFiles, setStagedFiles] = useState([]);

  // initial values (first render)
    // initial values (first render)
  const [values, setValues] = useState(() => {
    const v = {};
    fields.forEach((f, idx) => {
      const key = (f.column || `f_${idx}`).trim();
      const kind = String(f.input_type || "").toLowerCase();

      if (kind === "checkbox") {
        const incoming = initial[key];

        if (Array.isArray(incoming)) {
          v[key] = incoming.map((x) => String(x));
        } else if (typeof incoming === "string" && incoming.trim() !== "") {
          v[key] = incoming
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (incoming != null && incoming !== "") {
          v[key] = [String(incoming)];
        } else {
          v[key] = [];
        }
      } else if (kind === "date") {
        const raw = initial[key];
        if (!raw) {
          v[key] = "";
        } else {
          const d = new Date(raw);
          if (!Number.isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            v[key] = `${yyyy}-${mm}-${dd}`;
          } else {
            v[key] = String(raw).slice(0, 10); // fallback
          }
        }
      } else {
        v[key] = initial[key] ?? "";
      }
    });
    return v;
  });


  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  // ⬇️ re-init whenever `initial` or `fields` change (e.g. when you open STEP 1)
    // ⬇️ re-init whenever `initial` or `fields` change (e.g. when you open STEP 1)
  useEffect(() => {
    const v = {};
    const fs = Array.isArray(fields) ? fields : [];

    fs.forEach((f, idx) => {
      const key = (f.column || `f_${idx}`).trim();
      const kind = String(f.input_type || "").toLowerCase();

      if (kind === "checkbox") {
        const incoming = initial[key];

        if (Array.isArray(incoming)) {
          v[key] = incoming.map((x) => String(x));
        } else if (typeof incoming === "string" && incoming.trim() !== "") {
          v[key] = incoming
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (incoming != null && incoming !== "") {
          v[key] = [String(incoming)];
        } else {
          v[key] = [];
        }
      } else if (kind === "date") {
        const raw = initial[key];
        if (!raw) {
          v[key] = "";
        } else {
          const d = new Date(raw);
          if (!Number.isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            v[key] = `${yyyy}-${mm}-${dd}`;
          } else {
            v[key] = String(raw).slice(0, 10);
          }
        }
      } else {
        v[key] = initial[key] ?? "";
      }
    });

    setValues(v);
    setErrors({});
  }, [JSON.stringify(initial), JSON.stringify(fields)]);








  useImperativeHandle(ref, () => ({
    submit: () => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    },
  }));

  const forceROSet = useMemo(
    () =>
      new Set(
        (forceReadOnlyColumns || []).map((c) =>
          String(c || "").toLowerCase()
        )
      ),
    [forceReadOnlyColumns]
  );

  // ⬅️ NEW: columns that are required regardless of schema.mandatory
  const extraReqSet = useMemo(
    () =>
      new Set(
        (extraRequiredColumns || []).map((c) =>
          String(c || "").toLowerCase()
        )
      ),
    [extraRequiredColumns]
  );

  const setVal = (name, val) =>
    setValues((o) => ({
      ...o,
      [name]: val,
    }));

  // Per-field validation on input/change and blur
  const computeFieldError = (f, val) => {
    if (!f) return "";
    const key = String(f.column || f.name || "").trim();
    const lowerKey = key.toLowerCase();
    const kind = String(f.input_type || f.type || "").toLowerCase();

    // Ignore file/attachment when not allowed
    if (!attachmentsAllowed && (kind === "attachment" || kind === "file")) return "";

    // Skip read-only
    const roForced = forceROSet.has(lowerKey) || !!f.read_only || !f.data_entry;
    if (roForced) return "";

    const isEmpty = (v) => v === "" || v == null || (Array.isArray(v) && v.length === 0);
    const baseRequired = !!(f.mandatory ?? f.required) || extraReqSet.has(lowerKey);
    if (baseRequired && isEmpty(val)) return "Required";
    if (isEmpty(val)) return "";

    // Pattern/regex
    const pattern = f.pattern || f.regex;
    const patternFlags = f.pattern_flags || f.patternFlags || "";
    if (pattern) {
      try {
        const re = new RegExp(String(pattern), String(patternFlags));
        if (!re.test(String(val))) return f.validation_message || f.error_message || "Invalid format";
      } catch {}
    }

    // Type-specific
    const validInt = (v) => /^-?\d+$/.test(String(v).trim());
    const validNum = (v) => /^-?\d+(?:\.\d+)?$/.test(String(v).trim());
    const validDateStr = (s) => /^(\d{4})-(\d{2})-(\d{2})$/.test(String(s));
    const toNum = (v) => (typeof v === "number" ? v : Number(v));

    if (kind === "integer") {
      if (!validInt(val)) return f.validation_message || "Enter integer";
      const n = toNum(val);
      if (Number.isNaN(n)) return f.validation_message || "Enter integer";
      if (f.min != null && n < Number(f.min)) return `Min: ${f.min}`;
      if (f.max != null && n > Number(f.max)) return `Max: ${f.max}`;
    } else if (kind === "number" || kind === "decimal") {
      if (!validNum(val)) return f.validation_message || "Enter number";
      const n = toNum(val);
      if (Number.isNaN(n)) return f.validation_message || "Enter number";
      if (f.min != null && n < Number(f.min)) return `Min: ${f.min}`;
      if (f.max != null && n > Number(f.max)) return `Max: ${f.max}`;
    } else if (kind === "email") {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(String(val))) return "Invalid email";
    } else if (kind === "date") {
      if (!validDateStr(val)) return "Invalid date";
      const minDate = f.min_date || f.minDate || f.min;
      const maxDate = f.max_date || f.maxDate || f.max;
      if (minDate && validDateStr(minDate) && new Date(val) < new Date(minDate)) return `Earliest: ${minDate}`;
      if (maxDate && validDateStr(maxDate) && new Date(val) > new Date(maxDate)) return `Latest: ${maxDate}`;
    }

    const minLen = f.min_length ?? f.minLength;
    const maxLen = f.max_length ?? f.maxLength;
    if (minLen != null && String(val).length < Number(minLen)) return `Min length ${minLen}`;
    if (maxLen != null && String(val).length > Number(maxLen)) return `Max length ${maxLen}`;

    if ((kind === "select" || Array.isArray(f.options)) && !Array.isArray(val)) {
      const opts = (f.options || []).map((o) => String(o.value));
      if (opts.length && !opts.includes(String(val))) return "Invalid option";
    }

    return "";
  };

  const setValAndValidate = (f, key, val) => {
    setVal(key, val);
    const msg = computeFieldError(f, val);
    setErrors((prev) => ({ ...prev, [key]: msg }));
  };

  const renderedFieldSet = useMemo(() => {
    const set = new Set();

    if (canvasModel && canvasModel.kind === "canvas_v1") {
      const sections = Array.isArray(canvasModel.sections) ? canvasModel.sections : [];
      sections.forEach((sec) => {
        (sec.items || []).forEach((it) => {
          if (String(it.type || "").toLowerCase() === "field" && it.field) {
            set.add(String(it.field).trim().toLowerCase());
          }
        });
      });
      return set.size ? set : null;
    }

    if (Array.isArray(layoutSections) && layoutSections.length > 0) {
      layoutSections.forEach((sec) => {
        (sec.columns || []).forEach((col) => {
          (col.fields || []).forEach((f) => {
            if (f?.field) set.add(String(f.field).trim().toLowerCase());
          });
        });
      });
      return set.size ? set : null;
    }

    return null;
  }, [canvasModel, layoutSections]);

    function validate() {
  const action =
    typeof getCurrentAction === "function" ? getCurrentAction() : null;

  // 🔹 Comments required only for these actions
  const requireComments =
    action === "review" || action === "reject" || action === "return";

  const e = {};
  fields.forEach((f, idx) => {
    const key = (f.column || `f_${idx}`).trim();
    const lowerKey = key.toLowerCase();

    const kind = String(f.input_type || "").toLowerCase();

    if (renderedFieldSet && !renderedFieldSet.has(lowerKey)) {
      return;
    }

     // 🔴 If attachments are not allowed for this step,
    // completely ignore attachment/file fields in validation.
    if (!attachmentsAllowed && (kind === "attachment" || kind === "file")) {
      return;
    }

    // base required logic from schema + extraRequiredColumns
    const baseRequired =
      !!(f.mandatory ?? f.required) || extraReqSet.has(lowerKey);

    // 🔹 SPECIAL: step_comments has its own rule
    let req = baseRequired;
    if (lowerKey === "step_comments") {
      // Only required for Review / Reject / Return
      req = requireComments;
    }

    const roForced =
      forceROSet.has(lowerKey) || !!f.read_only || !f.data_entry;

    const val = values[key];
    const empty =
      kind === "checkbox"
        ? !Array.isArray(val) || val.length === 0
        : val === "" || val == null;

    // Skip all validation for read-only fields
    if (roForced) {
      return;
    }

    if (req && empty) {
      e[key] = "Required";
      return;
    }

    if (kind === "integer" && !empty) {
      const n = Number(val);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        e[key] = "Must be an integer";
        return;
      }
    }

    if (kind === "date" && !empty) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
        e[key] = "Invalid date";
        return;
      }
    }
  });

  setErrors(e);
  return Object.keys(e).length === 0;
}

  async function submit(e) {
    e?.preventDefault?.();
    if (!validate()) return;
    await onSubmit?.({ values, stagedFiles });
  }

  function FilePicker() {
    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Attachments
        </Typography>
        <Button component="label" variant="outlined" size="small">
          Choose files
          <input
            hidden
            type="file"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setStagedFiles((prev) => [...prev, ...files]);
              e.target.value = "";
            }}
          />
        </Button>
        {!!stagedFiles.length && (
          <Typography variant="caption" sx={{ ml: 1 }}>
            {stagedFiles.length} file(s) selected
          </Typography>
        )}
      </Box>
    );
  }

  const SYSTEM_COLUMNS = new Set([
  "performer",
  "step_performer",
  "wf_status",
  "review_requestor",
  "initiator",
  // add any other instance-only/system fields you never want in the form
]);



    // --- layout helpers -------------------------------------------------------

  const visible = fields.filter((f) => {
  if (!f?.visible) return false;
  const col = String(f.column || f.name || "").toLowerCase();
  return !SYSTEM_COLUMNS.has(col);
});

  const getCol = (f) => String(f.column || f.name || "").toLowerCase();

   const labelByColumn = {};
  fields.forEach((f) => {
    const c = String(f.column || "").toLowerCase();
    if (c) {
      labelByColumn[c] = f.label || f.column || c;
    }
  });

  const auditField = visible.find((f) => getCol(f) === "audit_trail");
  const commentsField = visible.find((f) => getCol(f) === "step_comments");

  const normalFields = visible.filter((f) => {
    const c = getCol(f);
    return c !== "audit_trail" && c !== "step_comments";
  });
  const assignmentLike = presentation === "reusableModal";

  /* ============================================================
   REUSABLE MODAL PRESENTATION
   Presentation only - no workflow/form logic changes
============================================================ */

const detailFields = normalFields.filter((f) => {
  const type = String(
    f?.input_type || f?.data_type || ""
  ).toLowerCase();

  const column = String(
    f?.column || ""
  )
    .trim()
    .toLowerCase();

  const isAttachment =
    type === "attachment" ||
    type === "file";

  const isComments =
    column === "step_comments" ||
    column === "comments" ||
    column === "comment";

  return !isAttachment && !isComments;
});

const attachmentFields = normalFields.filter((f) => {
  const type = String(
    f?.input_type || f?.data_type || ""
  ).toLowerCase();

  return type === "attachment" || type === "file";
});


const runtimeCommentsField =
  commentsField ||
  normalFields.find((f) => {
    const column = String(
      f?.column || ""
    )
      .trim()
      .toLowerCase();

    return (
      column === "step_comments" ||
      column === "comments" ||
      column === "comment"
    );
  });

const RuntimeSectionCard = ({
  title,
  subtitle,
  icon,
  children,
}) => (
  <Box
    sx={{
      border: "1px solid #cfddea",
      borderRadius: "7px",
      overflow: "hidden",
      bgcolor: "#ffffff",
      boxShadow: "none",
    }}
  >
    {/* CARD HEADER */}

    <Box
      sx={{
        minHeight: 31,

        px: 1.25,

        display: "flex",
        alignItems: "center",

        gap: 0.7,

        background:
          "linear-gradient(#f8fbfd,#eef5fa)",

        borderBottom:
          "1px solid #cfddea",
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 17,
            height: 17,

            display: "grid",
            placeItems: "center",

            flexShrink: 0,

            color: "#0d4f82",

            "& .MuiSvgIcon-root": {
              fontSize: 13,
            },
          }}
        >
          {icon}
        </Box>
      )}

      <Box>
        <Typography
          sx={{
            fontSize: 10,
            lineHeight: 1.1,

            fontWeight: 800,

            color: "#0d4f82",
          }}
        >
          {title}
        </Typography>

        {subtitle && (
          <Typography
            sx={{
              mt: 0.1,

              fontSize: 7.5,

              color: "#7b8d9c",
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>

    {/* CARD BODY */}

    <Box
      sx={{
        p: 1.25,
      }}
    >
      {children}
    </Box>
  </Box>
);  



  // Respect forced one-column layout or explicit layoutSections from saved form view
  const twoCols = (oneColumn || (Array.isArray(layoutSections) && layoutSections.length > 0))
    ? false
    : normalFields.length > 8;

  const renderField = (f, idx, mode = "normal") => {
    const key = String(f.column || f.name || f.id || `f_${idx}`).trim();
    const lowerKey = key.toLowerCase(); 
    const rawInput = String(f.input_type || "").toLowerCase();
    const rawData = String(f.data_type || "").toLowerCase();

    // 🔴 If attachments are NOT allowed for this step, completely hide attachment/file fields
  if (!attachmentsAllowed && (rawInput === "attachment" || rawInput === "file")) {
    return null;
  }

    let type = rawInput || rawData || "text";
    if (type === "dropdownlist") type = "select";
    if (type === "integer" || rawData === "integer") type = "number";

    const isTextArea = type === "textarea";
    const isSelect = type === "select";
    const isRadio = type === "radio";
    const isCheck = type === "checkbox";
    const isDate = type === "date";
    const isNumber = type === "number";
    const isFile = type === "attachment" || type === "file";

    const label = f.label || key;
    const ro = forceROSet.has(lowerKey) || !!f.read_only || !f.data_entry;

    const options =
      Array.isArray(f.option_list) && f.option_list.length
        ? f.option_list.map((o, i) => ({
            value: o.value ?? o.id ?? String(i + 1),
            label: o.label ?? o.name ?? String(o.value ?? o),
          }))
        : String(f.options || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((lbl, i) => ({
              value: lbl || String(i + 1),
              label: lbl,
            }));

    let displayVal = values[key];
    if (displayVal == null) displayVal = "";
    else if (typeof displayVal === "object") {
      displayVal = JSON.stringify(displayVal, null, 2);
    } else displayVal = String(displayVal);

    // SPECIAL: audit_trail – full width block before comments
        // SPECIAL: audit_trail – full width, human readable
    if (mode === "audit") {
      let raw = values[key];
      let entries = [];

      if (Array.isArray(raw)) {
        entries = raw;
      } else if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          entries = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          entries = [];
        }
      } else if (raw && typeof raw === "object") {
        entries = Array.isArray(raw) ? raw : [raw];
      }

      const ignore = new Set([
        "id",
        "tenant_id",
        "table_type",
        // add more internal columns here if you want to hide them
      ]);

      const prettyLabel = (col) => {
        const lower = String(col || "").toLowerCase();

        if (lower === "step_comments") return "User Comments";
        if (lower === "date_created") return "Date & Time";
        if (lower === "date_modified") return "Date & Time (Modified)";

        if (labelByColumn[lower]) return labelByColumn[lower];

        // fallback: Title Case from column name
        return String(col)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (ch) => ch.toUpperCase());
      };

      const formatVal = (col, val) => {
        if (val == null) return "—";
        if (
          typeof val === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)
        ) {
          const dt = new Date(val);
          if (!Number.isNaN(dt.getTime())) {
            return dt.toLocaleString(); // local date + time
          }
        }
        return String(val);
      };

      return (
        <Grid key={key} item xs={12}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>

          <Box
            sx={{
              mt: 0.5,
              p: 1,
              borderRadius: 1,
              bgcolor: "#fafafa",
              border: "1px solid rgba(0,0,0,0.12)",
              maxHeight: 260,
              overflow: "auto",
            }}
          >
            {entries.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No audit entries.
              </Typography>
            ) : (
              entries.map((entry, idx) => {
                const when = entry.at ? new Date(entry.at) : null;
                const whenStr =
                  when && !Number.isNaN(when.getTime())
                    ? when.toLocaleString()
                    : "-";

                const userId = entry.by;
                const userLabel =
                  entry.by_name || // if you later add by_name in JSON
                  entry.user_name ||
                  (userId != null ? `User ${userId}` : "System");

                const data = entry.data || entry.form_values || {};
                const keys = Object.keys(data).filter(
                  (k) => !ignore.has(k)
                );

                return (
                  <Box
                    key={idx}
                    sx={{ mb: idx === entries.length - 1 ? 0 : 1.5 }}
                  >
                    <Typography variant="subtitle2">
                      #{idx + 1} • {whenStr} • {userLabel}
                    </Typography>

                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ ml: 1 }}
                    >
                      {keys.map((k) => (
                        <div key={k}>
                          <strong>{prettyLabel(k)}:</strong>{" "}
                          {formatVal(k, data[k])}
                        </div>
                      ))}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Box>
        </Grid>
      );
    }


    // SPECIAL: step_comments – full width editable text after audit trail
    // SPECIAL: step_comments – full width editable text after audit trail
      if (mode === "comments") {
        return (
          <Grid key={key} item xs={12}>
            <TextField
              name={key}
              label={label}
              value={values[key] ?? ""}
              // Important: do NOT use HTML required here.
              // validate() already enforces requirement based on action
              // (review / reject / return only).
              required={false}
              fullWidth
              size="small"
              multiline
              minRows={3}
              error={!!errors[key]}
              helperText={errors[key] || ""}
              onChange={(e) => setVal(key, e.target.value)}
            />
          </Grid>
        );
      }


    // READ-ONLY (non audit/comments) – plain text, no input
    if (ro) {
      return (
        <Grid key={key} item xs={12} md={twoCols ? 6 : 12}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body1" sx={{ py: 0.5 }}>
            {displayVal || "—"}
          </Typography>
        </Grid>
      );
    }

    const common = {
      //key,
      name: key,
      label: assignmentLike ? undefined : label,
      placeholder: assignmentLike ? label : undefined,
      value: values[key] ?? (isCheck ? [] : ""),
      error: !!errors[key],
      helperText: errors[key] || "",
      required: !!(f.mandatory ?? f.required),
      fullWidth: true,
      size: "small",
    };

    const fieldLabel = (
      <Typography className="rfm-field-label" sx={{ mb: 0.5 }}>
        {String(label || "").toUpperCase()}
        {common.required ? " *" : ""}
      </Typography>
    );

    if (isSelect) {
      return (
        <Grid key={key} item xs={12} md={twoCols ? 6 : 12} className="rfm-field">
          {assignmentLike ? fieldLabel : null}
          <TextField
            {...common}
            select
            onChange={(e) => setValAndValidate(f, key, e.target.value)}
            onBlur={(e) => setValAndValidate(f, key, e.target.value)}
          >
            <MenuItem value="">{assignmentLike ? "-- Select --" : "—"}</MenuItem>
            {options.map((opt) => (
              <MenuItem key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      );
    }

    if (isRadio) {
      return (
        <Grid key={key} item xs={12} md={twoCols ? 6 : 12} className="rfm-field">
          {assignmentLike ? fieldLabel : (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {label}
              {common.required ? " *" : ""}
            </Typography>
          )}
          <FormControl>
            <RadioGroup
              className={assignmentLike ? "rfm-choice-group" : undefined}
              value={String(values[key] ?? "")}
              onChange={(e) => setValAndValidate(f, key, e.target.value)}
            >
              {options.map((opt) => (
                <FormControlLabel
                  key={String(opt.value)}
                  value={String(opt.value)}
                  control={<Radio size="small" />}
                  label={opt.label}
                />
              ))}
            </RadioGroup>
          </FormControl>
          {!!errors[key] && (
            <Typography variant="caption" color="error">
              {errors[key]}
            </Typography>
          )}
        </Grid>
      );
    }

    if (isCheck) {
      const cur = Array.isArray(values[key]) ? values[key] : [];
      return (
        <Grid key={key} item xs={12} md={twoCols ? 6 : 12} className="rfm-field">
          {assignmentLike ? fieldLabel : (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {label}
              {common.required ? " *" : ""}
            </Typography>
          )}
          <Box
            className={assignmentLike ? "rfm-choice-group" : undefined}
            sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-start" }}
          >
            {options.map((opt) => {
              const token = String(opt.value);
              const checked = cur.includes(token);
              return (
                <FormControlLabel
                  key={token}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={(e) => {
                        setVal(
                          key,
                          e.target.checked
                            ? [...cur, token]
                            : cur.filter((x) => x !== token)
                        );
                      }}
                    />
                  }
                  label={opt.label}
                />
              );
            })}
          </Box>
          {!!errors[key] && (
            <Typography variant="caption" color="error">
              {errors[key]}
            </Typography>
          )}
        </Grid>
      );
    }

    if (isDate) {
      return (
        <Grid key={key} item xs={12} md={twoCols ? 6 : 12} className="rfm-field">
          {assignmentLike ? fieldLabel : null}
          <TextField
            {...common}
            type="date"
            InputLabelProps={assignmentLike ? undefined : { shrink: true }}
            onChange={(e) => setValAndValidate(f, key, e.target.value)}
            onBlur={(e) => setValAndValidate(f, key, e.target.value)}
          />
        </Grid>
      );
    }

    if (isNumber) {
      return (
        <Grid key={key} item xs={12} md={twoCols ? 6 : 12} className="rfm-field">
          {assignmentLike ? fieldLabel : null}
          <TextField
            {...common}
            type="number"
            onChange={(e) => {
              const v = e.target.value === "" ? "" : Number(e.target.value);
              setValAndValidate(f, key, v);
            }}
            onBlur={(e) => {
              const v = e.target.value === "" ? "" : Number(e.target.value);
              setValAndValidate(f, key, v);
            }}
          />
        </Grid>
      );
    }

    if (isTextArea) {
      return (
        <Grid key={key} item xs={12} md={twoCols ? 6 : 12} className="rfm-field">
          {assignmentLike ? fieldLabel : null}
          <TextField
            {...common}
            multiline
            minRows={3}
            onChange={(e) => setValAndValidate(f, key, e.target.value)}
            onBlur={(e) => setValAndValidate(f, key, e.target.value)}
          />
        </Grid>
      );
    }

    if (isFile) {
      return (
        <Grid key={key} item xs={12} md={twoCols ? 6 : 12} className="rfm-field">
          {assignmentLike ? fieldLabel : (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              {label}
            </Typography>
          )}
          <Button component="label" variant="outlined" size="small">
            Choose files
            <input
              hidden
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setStagedFiles((prev) => [...prev, ...files]);
                e.target.value = "";
              }}
            />
          </Button>
        </Grid>
      );
    }

    // default text input
    return (
      <Grid key={key} item xs={12} md={twoCols ? 6 : 12} className="rfm-field">
        {assignmentLike ? fieldLabel : null}
        <TextField
          {...common}
          onChange={(e) => setValAndValidate(f, key, e.target.value)}
          onBlur={(e) => setValAndValidate(f, key, e.target.value)}
        />
      </Grid>
    );
  };

  const cs = { border:true, width:1, color:'#d1d5db', radius:12, ...(containerStyle || {}) };

 return (
  <Box
    component="form"
    ref={formRef}
    onSubmit={submit}
    className={
      assignmentLike
        ? "rfm-form"
        : undefined
    }
    sx={
      assignmentLike
        ? {
            width: "100%",

            m: 0,
            p: 0,

            border: 0,

            bgcolor: "transparent",

            /* ================================================
               COMPACT FIELD PRESENTATION
            ================================================ */

            "& .rfm-field": {
              minWidth: 0,
            },

            "& .rfm-field-label": {
              mb: "5px",

              fontSize: "8px",
              lineHeight: 1,

              fontWeight: 800,

              letterSpacing: ".35px",

              color: "#5d7184",
            },

            "& .MuiOutlinedInput-root": {
              minHeight: 31,

              borderRadius: "4px",

              bgcolor: "#ffffff",

              "& fieldset": {
                borderColor: "#bfd1e0",
              },

              "&:hover fieldset": {
                borderColor: "#9ebbd1",
              },

              "&.Mui-focused fieldset": {
                borderColor: "#62a8d8",
                borderWidth: "1px",
              },

              "&.Mui-disabled": {
                bgcolor: "#fafafa",

                "& fieldset": {
                  borderColor: "#e1e5e8",
                },
              },
            },

            "& .MuiInputBase-input": {
              px: 1,

              py: "6px",

              fontSize: "10px",

              color: "#29435a",
            },

            "& .MuiInputBase-input.Mui-disabled": {
              WebkitTextFillColor:
                "#8d969e",

              color: "#8d969e",
            },

            "& .MuiSelect-select": {
              py: "6px !important",

              px: "9px !important",

              fontSize: "10px",
            },

            "& .MuiFormHelperText-root": {
              minHeight: 0,

              mt: 0.25,

              mx: 0,

              fontSize: 7.5,
            },

            "& .MuiFormControlLabel-label": {
              fontSize: 9,
              color: "#405a6d",
            },

            "& .MuiCheckbox-root, & .MuiRadio-root": {
              p: 0.35,

              "& .MuiSvgIcon-root": {
                fontSize: 16,
              },
            },
          }
        : {
            mt: 1,

            ...(cs.border === false
              ? {}
              : {
                  border: `${
                    cs.width || 1
                  }px solid ${
                    cs.color ||
                    "#d1d5db"
                  }`,

                  borderRadius:
                    cs.radius != null
                      ? cs.radius
                      : 12,

                  p: 2,
                }),
          }
    }
  >

    {/* ======================================================
        NEW SIMPLE RUNTIME PRESENTATION
    ====================================================== */}

    {assignmentLike ? (

      <Stack
        spacing={1.15}
      >

        {/* ==================================================
            DETAILS
        ================================================== */}

        <RuntimeSectionCard
          title="Details"
          subtitle="Enter the required form information."
          icon={
            <AccountTreeIcon />
          }
        >

          {detailFields.length ? (

            <Grid
                container
                columnSpacing={1.25}
                rowSpacing={1.15}
              >
                {detailFields.map((f, idx) => (
                  <Grid
                    item
                    xs={12}
                    md={6}
                    key={f.column || `detail_${idx}`}
                    sx={{
                      minWidth: 0,

                      /* renderField already returns its own Grid item.
                        Flatten that grid item so THIS grid controls the 2-column layout */
                      "& > .MuiGrid-root": {
                        flexBasis: "100% !important",
                        maxWidth: "100% !important",
                        width: "100% !important",
                        padding: "0 !important",
                      },
                    }}
                  >
                    {renderField(
                      f,
                      idx,
                      "normal"
                    )}
                  </Grid>
                ))}
              </Grid>

          ) : (

            <Typography
              sx={{
                fontSize: 8.5,

                color: "#82909c",
              }}
            >
              No detail fields configured.
            </Typography>

          )}

        </RuntimeSectionCard>


        {/* ==================================================
            UPLOAD
        ================================================== */}

        {(attachmentsAllowed ||
          attachmentFields.length > 0) && (

          <RuntimeSectionCard
            title="Upload"
            subtitle="Attach supporting documents where required."
            icon={
              <AttachFileIcon />
            }
          >

            {/* Explicit attachment fields from schema */}

            {attachmentFields.length >
              0 && (

              <Grid
                container

                columnSpacing={1.25}
                rowSpacing={1}
              >
                {attachmentFields.map(
                  (f, idx) =>
                    renderField(
                      f,
                      idx,
                      "normal"
                    )
                )}
              </Grid>

            )}


            {/* Existing generic staged-file mechanism */}

            {attachmentsAllowed && (
              <Box
                sx={{
                  mt:
                    attachmentFields.length
                      ? 1
                      : 0,

                  minHeight: 58,

                  px: 1.1,
                  py: 0.9,

                  display: "flex",

                  alignItems: "center",

                  justifyContent:
                    "space-between",

                  gap: 1,

                  border:
                    "1px dashed #b8cad8",

                  borderRadius:
                    "4px",

                  bgcolor:
                    "#fbfcfd",
                }}
              >

                <Box>
                  <Typography
                    sx={{
                      fontSize: 9,

                      fontWeight: 700,

                      color:
                        "#405a6d",
                    }}
                  >
                    Upload supporting documents
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.15,

                      fontSize: 7.5,

                      color:
                        "#81909c",
                    }}
                  >
                    Select one or more files.
                  </Typography>
                </Box>


                <Button
                  component="label"

                  variant="outlined"

                  size="small"

                  sx={{
                    minHeight: 29,

                    px: 1.15,

                    borderRadius:
                      "3px",

                    textTransform:
                      "none",

                    fontSize: 8.5,

                    fontWeight: 700,
                  }}
                >
                  Browse

                  <input
                    hidden

                    type="file"

                    multiple

                    onChange={(e) => {

                      const files =
                        Array.from(
                          e.target.files ||
                            []
                        );

                      setStagedFiles(
                        (prev) => [
                          ...prev,
                          ...files,
                        ]
                      );

                      e.target.value =
                        "";
                    }}
                  />
                </Button>

              </Box>
            )}


            {!!stagedFiles.length && (

              <Stack
                spacing={0.5}

                sx={{
                  mt: 0.7,
                }}
              >

                {stagedFiles.map(
                  (file, index) => (

                    <Box
                      key={`staged_${index}_${file?.name || "file"}`}

                      sx={{
                        minHeight: 27,

                        px: 0.8,

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "space-between",

                        gap: 1,

                        border:
                          "1px solid #e1e8ed",

                        borderRadius:
                          "3px",

                        bgcolor:
                          "#fafcfd",
                      }}
                    >

                      <Typography
                        sx={{
                          minWidth: 0,

                          overflow:
                            "hidden",

                          textOverflow:
                            "ellipsis",

                          whiteSpace:
                            "nowrap",

                          fontSize:
                            8.5,

                          color:
                            "#526b7e",
                        }}
                      >
                        {file?.name ||
                          `File ${
                            index + 1
                          }`}
                      </Typography>


                      <Button
                        size="small"

                        variant="text"

                        onClick={() => {

                          setStagedFiles(
                            (previous) =>
                              previous.filter(
                                (
                                  _file,
                                  fileIndex
                                ) =>
                                  fileIndex !==
                                  index
                              )
                          );

                        }}

                        sx={{
                          minWidth: 0,

                          px: 0.5,

                          fontSize: 8,

                          textTransform:
                            "none",
                        }}
                      >
                        Remove
                      </Button>

                    </Box>

                  )
                )}

              </Stack>

            )}

          </RuntimeSectionCard>

        )}


        {/* ==================================================
            COMMENTS
            Only rendered if configured in schema.
            Nothing hardcoded.
        ================================================== */}

        {runtimeCommentsField && (

              <RuntimeSectionCard
                title="Comments"
                subtitle="Add comments or supporting notes."
                icon={
                  <CommentOutlinedIcon />
                }
              >

                <Grid
                  container
                  spacing={0}
                  sx={{
                    "& > .MuiGrid-root": {
                      flexBasis: "100% !important",
                      maxWidth: "100% !important",
                      width: "100% !important",
                      padding: "0 !important",
                    },
                  }}
                >
                  {renderField(
                    runtimeCommentsField,
                    9991,
                    "comments"
                  )}
                </Grid>

              </RuntimeSectionCard>

            )}


        {/* ==================================================
            AUDIT - retain existing behaviour if schema
            exposes it.
        ================================================== */}

        {auditField && (

          <Box>
            {renderField(
              auditField,
              9990,
              "audit"
            )}
          </Box>

        )}


        {/* ==================================================
            EXISTING CHILD CONTENT
            Review selector / existing attachments /
            route information etc. remains untouched.
        ================================================== */}

        {children && (
          <Box>
            {children}
          </Box>
        )}


        {/* ==================================================
            EXISTING PRIMARY ACTION
        ================================================== */}

        {showPrimaryButton && (

          <Box
            sx={{
              pt: 0.2,

              display: "flex",

              justifyContent:
                "flex-end",
            }}
          >
            <Button
              type="submit"

              variant="contained"

              size="small"

              sx={{
                minHeight: 30,

                px: 1.4,

                borderRadius:
                  "3px",

                textTransform:
                  "none",

                fontSize: 9,

                fontWeight: 700,

                bgcolor:
                  "#0879df",

                boxShadow:
                  "none",

                "&:hover": {
                  bgcolor:
                    "#066dc8",

                  boxShadow:
                    "none",
                },
              }}
            >
              {primaryActionLabel}
            </Button>
          </Box>

        )}

      </Stack>

    ) : (

      /* ======================================================
         EXISTING RENDERING
         LEAVE THIS LOGIC EXACTLY AS IT WAS
      ====================================================== */

      <>

        {canvasModel &&
        canvasModel.kind ===
          "canvas_v1" ? (

          (() => {

            const findSec = (
              id
            ) =>
              (
                canvasModel.sections ||
                []
              ).find(
                (s) =>
                  String(
                    s.id
                  ).toLowerCase() ===
                  id
              );


            const findMeta = (
              name
            ) =>
              Array.isArray(
                fields
              )
                ? fields.find(
                    (f) =>
                      String(
                        f.column ||
                          ""
                      ).toLowerCase() ===
                      String(
                        name ||
                          ""
                      ).toLowerCase()
                  )
                : null;


            const renderCanvasItems =
              (sec) => {

                if (!sec)
                  return null;

                const cols =
                  Math.max(
                    24,
                    Number(
                      sec.grid
                        ?.cols ||
                        72
                    )
                  );

                const rowH =
                  Math.max(
                    6,
                    Number(
                      sec.grid
                        ?.rowHeight ||
                        8
                    )
                  );


                const style = {
                  display:
                    "grid",

                  gridTemplateColumns:
                    `repeat(${cols}, minmax(0,1fr))`,

                  gridAutoRows:
                    `${rowH}px`,

                  gap: 1,
                };


                return (
                  <div
                    style={
                      style
                    }
                  >

                    {(sec.items ||
                      []).map(
                      (
                        it,
                        idx
                      ) => {

                        const sItem =
                          {
                            gridColumn:
                              `${
                                (it.x ||
                                  0) +
                                1
                              } / span ${Math.max(
                                1,
                                it.w ||
                                  1
                              )}`,

                            gridRow:
                              `${
                                (it.y ||
                                  0) +
                                1
                              } / span ${Math.max(
                                1,
                                it.h ||
                                  1
                              )}`,
                          };


                        const t =
                          String(
                            it.type ||
                              ""
                          ).toLowerCase();


                        if (
                          t ===
                          "field"
                        ) {

                          const meta =
                            findMeta(
                              it.field
                            );

                          if (
                            !meta ||
                            !meta.visible
                          )
                            return null;

                          return (
                            <div
                              key={
                                it.id ||
                                idx
                              }
                              style={
                                sItem
                              }
                            >
                              {renderField(
                                meta,
                                idx,
                                "normal"
                              )}
                            </div>
                          );
                        }


                        if (
                          t ===
                          "text"
                        ) {

                          const styleText =
                            {
                              ...sItem,

                              padding:
                                4,

                              textAlign:
                                it
                                  .props
                                  ?.textAlign ||
                                "left",

                              color:
                                it
                                  .props
                                  ?.color ||
                                undefined,

                              background:
                                it
                                  .props
                                  ?.backgroundColor ||
                                undefined,

                              fontWeight:
                                it
                                  .props
                                  ?.fontWeight ||
                                undefined,

                              fontStyle:
                                it
                                  .props
                                  ?.italic
                                  ? "italic"
                                  : undefined,

                              textDecoration:
                                it
                                  .props
                                  ?.underline
                                  ? "underline"
                                  : undefined,

                              fontSize:
                                it
                                  .props
                                  ?.fontSize
                                  ? Number(
                                      it
                                        .props
                                        .fontSize
                                    )
                                  : undefined,
                            };


                          const textHtml =
                            it
                              .props
                              ?.html ||
                            it
                              .props
                              ?.text ||
                            "";


                          return (
                            <div
                              key={
                                it.id ||
                                idx
                              }

                              style={
                                styleText
                              }

                              dangerouslySetInnerHTML={{
                                __html:
                                  textHtml,
                              }}
                            />
                          );
                        }


                        if (
                          t ===
                          "image"
                        )
                          return (
                            <div
                              key={
                                it.id ||
                                idx
                              }

                              style={{
                                ...sItem,

                                padding:
                                  4,
                              }}
                            >
                              <img
                                alt={
                                  it
                                    .props
                                    ?.alt ||
                                  ""
                                }

                                src={
                                  it
                                    .props
                                    ?.src ||
                                  ""
                                }

                                style={{
                                  maxWidth:
                                    "100%",

                                  maxHeight:
                                    it
                                      .props
                                      ?.maxHeight ||
                                    64,

                                  objectFit:
                                    "contain",
                                }}
                              />
                            </div>
                          );


                        if (
                          t ===
                          "line"
                        )
                          return (
                            <div
                              key={
                                it.id ||
                                idx
                              }

                              style={{
                                ...sItem,

                                paddingTop:
                                  rowH /
                                    2 -
                                  1,
                              }}
                            >
                              <div
                                style={{
                                  height:
                                    Math.max(
                                      1,
                                      Number(
                                        it
                                          .props
                                          ?.thickness ||
                                          2
                                      )
                                    ),

                                  background:
                                    it
                                      .props
                                      ?.color ||
                                    "#cbd5e1",
                                }}
                              />
                            </div>
                          );


                        return (
                          <div
                            key={
                              it.id ||
                              idx
                            }

                            style={
                              sItem
                            }
                          />
                        );

                      }
                    )}

                  </div>
                );
              };


            const header =
              renderCanvasItems(
                findSec(
                  "header"
                )
              );

            const main =
              renderCanvasItems(
                findSec(
                  "main"
                )
              ) ||
              renderCanvasItems(
                findSec(
                  "details"
                )
              );

            const footer =
              renderCanvasItems(
                findSec(
                  "footer"
                )
              );


            return (
              <>
                {header}
                {main}
                {footer}
              </>
            );

          })()

        ) : Array.isArray(
            layoutSections
          ) &&
          layoutSections.length >
            0 ? (

          <Box>

            {layoutSections.map(
              (
                sec,
                sIdx
              ) => (

                <Box
                  key={`sec_${sIdx}`}

                  sx={{
                    mb: 1.5,
                  }}
                >

                  <Grid
                    container
                    spacing={2}
                  >

                    {(sec.columns ||
                      [])
                      .filter(
                        (c) => {

                          if (!c)
                            return false;

                          const hasFields =
                            Array.isArray(
                              c.fields
                            ) &&
                            c
                              .fields
                              .length >
                              0;

                          const hasBlocks =
                            sec.id ===
                              "header" &&
                            Array.isArray(
                              c.blocks
                            ) &&
                            c
                              .blocks
                              .length >
                              0;

                          return (
                            Number(
                              c.span
                            ) > 0 &&
                            (hasFields ||
                              hasBlocks)
                          );

                        }
                      )
                      .map(
                        (
                          col,
                          cIdx
                        ) => (

                          <Grid
                            key={`c_${cIdx}`}

                            item

                            xs={12}

                            md={
                              Math.min(
                                Math.max(
                                  Number(
                                    col.span ||
                                      1
                                  ),
                                  1
                                ),
                                4
                              ) *
                              3
                            }
                          >

                            <Grid
                              container
                              spacing={2}
                            >

                              {(
                                col.fields ||
                                []
                              ).map(
                                (
                                  fp,
                                  fIdx
                                ) => {

                                  const name =
                                    String(
                                      fp.field ||
                                        ""
                                    )
                                      .trim()
                                      .toLowerCase();

                                  const meta =
                                    visible.find(
                                      (
                                        mf
                                      ) =>
                                        String(
                                          mf.column ||
                                            ""
                                        )
                                          .trim()
                                          .toLowerCase() ===
                                        name
                                    );

                                  if (
                                    !meta
                                  )
                                    return null;

                                  return renderField(
                                    meta,
                                    fIdx,
                                    "normal"
                                  );

                                }
                              )}

                            </Grid>

                          </Grid>

                        )
                      )}

                  </Grid>


                  {String(
                    sec.id ||
                      ""
                  ).toLowerCase() ===
                    "main" && (

                    <Grid
                      item
                      xs={12}
                    >

                      <Grid
                        container
                        spacing={2}
                      >

                        {commentsField &&
                          renderField(
                            commentsField,
                            9991,
                            "comments"
                          )}

                        {auditField &&
                          renderField(
                            auditField,
                            9990,
                            "audit"
                          )}

                      </Grid>

                    </Grid>
                  )}

                </Box>

              )
            )}

          </Box>

        ) : (

          <Grid
            container
            spacing={2}
          >

            {normalFields.map(
              (
                f,
                idx
              ) =>
                renderField(
                  f,
                  idx,
                  "normal"
                )
            )}

            {commentsField &&
              renderField(
                commentsField,
                normalFields.length,
                "comments"
              )}

            {auditField &&
              renderField(
                auditField,
                normalFields.length +
                  (commentsField
                    ? 1
                    : 0),
                "audit"
              )}

          </Grid>

        )}


        {attachmentsAllowed && (
          <FilePicker />
        )}


        {children}


        {showPrimaryButton && (
          <Box
            display="flex"
            gap={1}
            mt={2}
          >
            <Button
              type="submit"
              variant="contained"
            >
              {primaryActionLabel}
            </Button>
          </Box>
        )}

      </>

    )}

  </Box>
);
});













/* ------------------------- Workflow Picker (Dialog) ------------------------ */
function WorkflowPickerDialog({ open, onClose, onPick }) {
  const [loading, setLoading] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        // Header list (only published workflows)
        const r = await api.get("/simple_workflowbuilder", { params: { published: true } });
        const arr = Array.isArray(r.data) ? r.data : [];
        setWorkflows(arr);
      } catch (e) {
        console.error("[picker] list failed", e);
        setWorkflows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return workflows;
    return workflows.filter((w) =>
      String(w.workflow_map_name || w.workflow_name || "")
        .toLowerCase()
        .includes(s)
    );
  }, [q, workflows]);

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"                 // 👈 narrower = more portrait feel
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "80vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1,
        }}
      >
        <Typography
          variant="subtitle1"
          component="div"
          sx={{ fontWeight: 600, letterSpacing: 0.3 }}
        >
          Select a Workflow
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Search */}
        <Box mb={2}>
          <TextField
            fullWidth
            size="small"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search workflows"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Grid of square cards */}
        <Grid container spacing={2}>
          {loading ? (
            <Grid item xs={12}>
              <Typography variant="body2">Loading workflows…</Typography>
            </Grid>
          ) : filtered.length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="body2">No workflows found.</Typography>
            </Grid>
          ) : (
            filtered.map((w) => (
              <Grid key={w.id} item xs={6} sm={4}>
                <Card
                  sx={{
                    ...cardSx,
                    borderRadius: 2,
                    aspectRatio: "1 / 1",       // 👈 square card
                    display: "flex",
                  }}
                >
                  <CardActionArea
                    onClick={() => onPick?.(w)}
                    sx={{
                      display: "flex",
                      alignItems: "stretch",
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        textAlign: "center",
                      }}
                    >
                      {/* Workflow icon */}
                      <AccountTreeIcon
                        sx={{ fontSize: 32, mb: 1, opacity: 0.75 }}
                      />

                      {/* Only workflow name, smaller text */}
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1.25,
                          wordBreak: "break-word",
                        }}
                      >
                        {w.workflow_map_name ||
                          w.workflow_name ||
                          `Workflow #${w.id}`}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </DialogContent>
    </Dialog>
    </>
  );
}

/* ------------------------- Initiate Form (Dialog) -------------------------- */

function InitiateFormDialog({ open, onClose, workflow }) {
  const [loading, setLoading] = useState(false);
  const [stepCfg, setStepCfg] = useState(null); // step 1 config (initiate)
  const [saving, setSaving] = useState(false);
  const [header, setHeader] = useState(null);
  const [viewLayout, setViewLayout] = useState(null);
  const [canvasLayout, setCanvasLayout] = useState(null);
  const [viewInfo, setViewInfo] = useState(null); // {id,key,view_name,isDefault,when}
  

  useEffect(() => {
  if (!open || !workflow?.id) return;
  (async () => {
    setLoading(true);
    try {
      // canonical INIT endpoint
      const r = await api.get(`/simple_workflowbuilder/steps/init/${workflow.id}`);
      // r.data = { header, step }
      setStepCfg(r.data?.step || null);

     
      // keep header (gives us workflow_table_name)
      setHeader(r.data?.header || null);
      // fetch saved view layout for INITIATE step (if any)
      const wid = r.data?.header?.id || r.data?.header?.workflow_map_id || workflow.id;
      const sid = Number(r.data?.step?.step_no);
      if (wid != null && Number.isFinite(sid)) {
        try {
          const { data: vdata } = await api.get("/simple_workflowbuilder_formviews", {
            params: { workflow_map_id: wid, step_no: sid },
          });
          const list = Array.isArray(vdata?.views) ? vdata.views : Array.isArray(vdata) ? vdata : [];
          const chosen = list.find((v) => v.is_default) || list.sort((a,b)=> new Date(b.date_modified||b.date_created||0)-new Date(a.date_modified||a.date_created||0))[0];
          const ld = chosen?.layout_def || null;
          setViewLayout(ld);
          setCanvasLayout(ld && ld.kind === 'canvas_v1' ? ld : null);
          setViewInfo(
            chosen
              ? {
                  id: chosen.id,
                  key: chosen.view_key,
                  view_name: chosen.view_name,
                  isDefault: !!chosen.is_default,
                  when: chosen.date_modified || chosen.date_created,
                }
              : null
          );
        } catch (_) {
          setViewLayout(null);
          setCanvasLayout(null);
          setViewInfo(null);
        }
      }
    } catch (e) {
      console.error("[initiate] fetch step-1 failed", e);
      setStepCfg(null);
    } finally {
      setLoading(false);
    }
  })();
}, [open, workflow?.id]);


const rawCfg = stepCfg?.step_form_configuration;
const baseSchema = typeof rawCfg === 'string' ? safeParseJSON(rawCfg) : rawCfg;

// order fields by saved view layout if present
const schema = (() => {
  const fields = Array.isArray(baseSchema?.fields) ? baseSchema.fields : [];
  if (!fields.length || !viewLayout) return baseSchema;
  try {
    const mats = materializeLayout(viewLayout, fields);
    if (!Array.isArray(mats)) return baseSchema;
    const byCol = new Map(fields.map(f => [String(f.column||"").trim(), f]));
    const ordered = [];
    mats.forEach(sec => (sec.columns||[]).forEach(col => (col.fields||[]).forEach(f => {
      const k = String(f.field||"").trim();
      const meta = byCol.get(k);
      if (meta && meta.visible) {
        ordered.push(meta);
        byCol.delete(k);
      }
    })));
    // append any remaining visible fields not placed in layout
    byCol.forEach((meta) => { if (meta?.visible) ordered.push(meta); });
    return { ...(baseSchema||{}), fields: ordered };
  } catch {
    return baseSchema;
  }
})();

// derive a simple column hint from layout
const oneColumnFromLayout = React.useMemo(() => {
  const l = viewLayout;
  if (!l || !Array.isArray(l.sections)) return false;
  let maxCols = 0;
  for (const sec of l.sections) {
    const cols = Array.isArray(sec.columns) ? sec.columns : [];
    const used = cols.filter(c => Array.isArray(c.fields) && c.fields.length > 0).length;
    if (used > maxCols) maxCols = used;
  }
  return maxCols <= 1;
}, [viewLayout]);

// materialized sections for rendering per saved view
const initLayoutSections = React.useMemo(() => {
  const fields2 = Array.isArray(schema?.fields) ? schema.fields : [];
  return viewLayout ? materializeLayout(viewLayout, fields2) : null;
}, [viewLayout, JSON.stringify(schema?.fields)]);



  // Called to create the workflow instance (simple_workflow_instances)
async function handleSend({ step_performer, audit_trail, step_comments, form_values }) {
  const payload = {
    workflow_id: workflow.id,               // definition id (simple_workflowbuilder.id)
    step_name: "INITIATE",
    wf_status: "Open",
    step_performer: step_performer ?? null,    
    audit_trail: audit_trail ?? [],
    step_comments: step_comments ?? null,
    form_values: form_values ?? {},         // BE may ignore; safe to send
  };

  const { data } = await api.post("/simple_workflow_instances", payload);
  console.log("[initiate] instance created", data);
  const ms = data?.mail_status;
  console.log("[initiate] mail_status", ms);
  if (ms) {
    const msg = ms.sent
      ? "Form submitted and mail notification sent to recipients."
      : `Form submitted. Mail not sent${ms.reason ? ": " + ms.reason : ""}`;
    alert(msg);
  } else {
    alert("Form submitted successfully. (No mail status returned)");
  }
  return data;                              // 👈 this has .id (instance id)
}



// Robust saver: tries common endpoints + payload shapes.
// Place inside InitiateFormDialog (top-level), above DynamicStepForm.
async function saveRowToTable(table, values) {
  const t = encodeURIComponent(table);

  const { data } = await api.post(`/table/rows/${t}`, values);
  if (data) return data; // expect { id, ... } or similar
  throw new Error(`No response data from /table/rows/${table}`);
}


// INITIATE: attachments strictly from simple_workflowbuilder_steps.attachments_allowed
const attachmentsAllowedFlag = React.useMemo(() => {
  const allowed = !!stepCfg?.attachment_access?.can_upload;
  console.log(
    "[INITIATE] attachment_access:",
    stepCfg?.attachment_access,
    "=> upload?",
    allowed
  );
  return allowed;
}, [stepCfg?.attachment_access]);



// optional debug – keep for a bit
console.log(
  "[INITIATE] attachments_allowed raw:",
  stepCfg?.attachments_allowed,
  "=> upload?",
  attachmentsAllowedFlag
);



  const sendLabel =
    stepCfg?.approve_button_name ||
    "Send";



  return (
    <Dialog
      open={open}
      onClose={() => onClose?.(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { width: "100%", maxWidth: 950 } }}
    >
      <DialogTitle sx={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
  Start: {workflow?.workflow_map_name || workflow?.workflow_name || `Workflow #${workflow?.id || ""}`}
  <IconButton onClick={() => onClose?.(false)} size="small"><CloseIcon /></IconButton>
</DialogTitle>
{schema?.title && <Typography variant="h6" sx={{ px:3, mt:-1, mb:1 }}>{schema.title}</Typography>}


      
      <DialogContent dividers>
        <Box
          sx={{
            fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif',
            "& .MuiCheckbox-root, & .MuiRadio-root": {
              transform: "scale(0.85)",
              padding: 0.25,
            },
            "& .MuiFormControlLabel-label": {
              fontSize: "0.92rem",
            },
          }}
        >
        {loading ? (
          <Typography variant="body2">Loading form…</Typography>
) : !stepCfg ? (
  <Typography variant="body2" color="error">
    Couldn’t load initiate step configuration.
  </Typography>
        ) : (
          <Box>
            {viewInfo && (
              <Typography
                variant="caption"
                sx={{ mb: 1, display: "block", color: "text.secondary" }}
                data-testid="active-init-view"
              >
                Using view: {viewInfo.view_name || viewInfo.key}
                {viewInfo.isDefault ? " (default)" : ""}
              </Typography>
            )}
    
    

<DynamicStepForm
  schema={schema}

  presentation="reusableModal"

  attachmentsAllowed={attachmentsAllowedFlag}
  oneColumn={oneColumnFromLayout}
  canvasModel={canvasLayout}
  layoutSections={initLayoutSections}
  containerStyle={viewLayout?.container_style}
  
  primaryActionLabel={sendLabel}
  showPrimaryButton={true}
  onSubmit={async ({ values: formValues, stagedFiles }) => {
    setSaving(true);
    try {
      const table =
        header?.workflow_table_name || workflow?.workflow_table_name;
      if (!table) throw new Error("Missing workflow_table_name in header");

      const normalizedFormValues = {};
      Object.entries(formValues || {}).forEach(([col, val]) => {
        let v = val;
        if (Array.isArray(v)) v = v.length ? v.join(",") : null;
        if (v === "") v = null;
        normalizedFormValues[col] = v;
      });

      const saved = await saveRowToTable(table, normalizedFormValues);
      if (!saved?.id) {
        throw new Error("Row insert did not return an id");
      }

      const stepCommentsField = Array.isArray(schema?.fields)
        ? schema.fields.find(
            (f) =>
              String(f.column || "").toLowerCase() === "step_comments"
          )
        : null;

      const stepCommentsCol = stepCommentsField
        ? String(stepCommentsField.column || "").trim()
        : null;

      const stepCommentsVal = stepCommentsCol
        ? formValues[stepCommentsCol] ?? null
        : null;

      const instance = await handleSend({
        step_performer: stepCfg?.step_performer ?? null,
        audit_trail: [
          { at: new Date().toISOString(), event: "created", by: "ui" },
          {
            at: new Date().toISOString(),
            event: "saved_row",
            table,
            row_id: saved.id,
          },
          {
            at: new Date().toISOString(),
            event: "form_values",
            values: formValues,
          },
        ],
        form_values: formValues,
        step_comments: stepCommentsVal,
      });

      const instanceId = instance?.id;
      if (!instanceId) {
        throw new Error(
          "Instance id missing from /simple_workflow_instances response"
        );
      }
      if (instance?.mail_status) {
        const ms = instance.mail_status;
        const msg = ms.sent
          ? "Form submitted and mail notification sent to recipients."
          : `Form submitted. Mail not sent${ms.reason ? ": " + ms.reason : ""}`;
        alert(msg);
      }

      await api.put(`/tables/data/${table}/${saved.id}`, {
        changes: { workflow_id: String(instanceId) },
      });

      // Upload initiate attachments (anchor to instance)
      if (Array.isArray(stagedFiles) && stagedFiles.length) {
        for (const f of stagedFiles) {
          const form = new FormData();
          form.append("file", f);
          form.append("ref_table", "simple_workflow_instances");
          form.append("ref_table_id", String(instanceId));
          form.append("workflow_id", String(instanceId));
          form.append("instance_id", String(instanceId));
          await api.post("/upload", form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      onClose?.(true);
    } catch (e) {
      console.error("initiate submit failed", e);
      alert(e?.response?.data?.error || e.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  }}
/>









  </Box>
        )}
        </Box>
      </DialogContent>

      {/* Submission backdrop for initiate */}
      <Backdrop
        open={saving}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: "#fff" }}
      >
        <Box textAlign="center">
          <CircularProgress color="inherit" />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Submitting, please wait...
          </Typography>
        </Box>
      </Backdrop>
    </Dialog>
  );
}

/* ------------------------------ Main Page ---------------------------------- */

function InstanceExecuteDialog({ open, instance, onClose, isOutbox }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stepCfg, setStepCfg] = useState(null);
  const [schema, setSchema] = useState(null);
  const [execViewLayout, setExecViewLayout] = useState(null);
  const [execCanvasLayout, setExecCanvasLayout] = useState(null);
  const [execViewInfo, setExecViewInfo] = useState(null); // {id,key,view_name,isDefault,when}
  const execOneCol = React.useMemo(() => {
    const l = execViewLayout;
    if (!l || !Array.isArray(l.sections)) return false;
    let maxCols = 0;
    for (const sec of l.sections) {
      const cols = Array.isArray(sec.columns) ? sec.columns : [];
      const used = cols.filter((c) => Array.isArray(c.fields) && c.fields.length > 0).length;
      if (used > maxCols) maxCols = used;
    }
    return maxCols <= 1;
  }, [execViewLayout]);
  const [initialValues, setInitialValues] = useState({});
  const [attachments, setAttachments] = useState([]);

  // NEW: store full instance + routeinfo + business row id
  const [instanceDetail, setInstanceDetail] = useState(null);
  const [routeinfo, setRouteinfo] = useState([]);
  const [businessRowId, setBusinessRowId] = useState(null);

  const [isReviewMode, setIsReviewMode] = useState(false); 
  const [auditOpen, setAuditOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // REVIEW: users + selected reviewer
  const [users, setUsers] = useState([]);
  const [reviewUserId, setReviewUserId] = useState("");

  const formRef = useRef(null);
  const actionRef = useRef("approve");


   // ---- attachment helpers (KEEP THEM HERE) -------------------------------
  const getAttachmentUrl = (f) => {
    return (
      f?.download_url ||
      f?.file_url ||
      f?.url ||
      f?.public_url ||
      f?.path ||
      null
    );
  };

  const openAttachment = (f) => {
    const url = getAttachmentUrl(f);
    if (!url) return alert("File URL not available.");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadAttachment = (f) => {
    const url = getAttachmentUrl(f);
    if (!url) return alert("Download URL not available.");
    const a = document.createElement("a");
    a.href = url;
    a.download = f?.original_filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

    // --- Derived "next step" info for display (UI preview only) -------------
  const routeArr = Array.isArray(routeinfo) ? routeinfo : [];
  const currentStepIdForDisplay = instanceDetail
    ? Number(instanceDetail.step_no) || 0
    : 0;

  const nextApproveStepId =
    currentStepIdForDisplay > 0 ? currentStepIdForDisplay + 1 : null;

  const nextApproveCfg = nextApproveStepId
    ? routeArr.find(
        (s) =>
          Number(s.step_no) === nextApproveStepId ||
          Number(s.step_no) === nextApproveStepId
      )
    : null;

  const nextRejectStepId =
    nextApproveCfg &&
    typeof nextApproveCfg.next_step_after_reject !== "undefined"
      ? Number(nextApproveCfg.next_step_after_reject)
      : null;

  const nextRejectCfg = nextRejectStepId
    ? routeArr.find(
        (s) =>
          Number(s.step_no) === nextRejectStepId ||
          Number(s.step_no) === nextRejectStepId
      )
    : null;

  const formatStepLabel = (stepId, cfg) => {
    if (!stepId) return "";
    const nm = cfg?.step_name;
    return nm ? `${stepId} – ${nm}` : String(stepId);
  };

  const nextApproveLabel = formatStepLabel(nextApproveStepId, nextApproveCfg);
  const nextRejectLabel = formatStepLabel(nextRejectStepId, nextRejectCfg);

  const renderPerformerLabel = (cfg) => {
    const pid = Number(cfg?.step_performer);
    if (!Number.isFinite(pid) || pid <= 0) return "Not configured";
    const u =
      users.find((x) => Number(x.id) === pid) || {};
    const name =
      u.full_name ||
      u.name ||
      `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
      u.username ||
      u.email;
    return name ? `${name} (${pid})` : String(pid);
  };


  useEffect(() => {
    if (!open || !instance?.id) return;

    (async () => {
      setLoading(true);
      try {
        // 1) Fresh instance (ensures routeinfo + workflow_table_name are present)
        const { data: inst } = await api.get(
          `/simple_workflow_instances/${instance.id}`
        );
        setInstanceDetail(inst);

        // ⬅️ NEW: detect review step from wf_status
        const wfStatus = String(inst.wf_status || "").toLowerCase();
        setIsReviewMode(wfStatus.endsWith("_review"));

        const route = Array.isArray(inst.routeinfo) ? inst.routeinfo : [];
        setRouteinfo(route);

const stepNo = Number(inst.step_no);  // 👈 use step_no from instance

const cfg =
  route.find((s) => Number(s.step_no) === stepNo) ||
  route[0] ||
  null;

setStepCfg(cfg || null);

// fetch saved view for this step
try {
  const wid = inst.workflow_id || inst.workflow_map_id || instance?.workflow_id;
  const sid = Number(cfg?.step_no);
  if (wid != null && Number.isFinite(sid)) {
    const { data: vdata } = await api.get("/simple_workflowbuilder_formviews", { params: { workflow_map_id: wid, step_no: sid } });
    const list = Array.isArray(vdata?.views) ? vdata.views : Array.isArray(vdata) ? vdata : [];
    const chosen = list.find((v)=>v.is_default) || list.sort((a,b)=> new Date(b.date_modified||b.date_created||0)-new Date(a.date_modified||a.date_created||0))[0];
    setExecViewLayout(chosen?.layout_def || null);
    setExecCanvasLayout(chosen?.layout_def?.kind == 'canvas_v1' ? chosen.layout_def : null);
    setExecViewInfo(
      chosen
        ? {
            id: chosen.id,
            key: chosen.view_key,
            view_name: chosen.view_name,
            isDefault: !!chosen.is_default,
            when: chosen.date_modified || chosen.date_created,
          }
        : null
    );
  } else {
    setExecViewLayout(null);
    setExecViewInfo(null);
  }
} catch (_) {
  setExecViewLayout(null);
  setExecViewInfo(null);
}

// --- schema derivation ---
// 1) INITIATE step config (this is the master for input_type)
const initStep = route.find(
  (s) => String(s.step_name || "").toUpperCase() === "INITIATE"
);

let initSchema = null;
if (initStep?.step_form_configuration) {
  const rawInit = initStep.step_form_configuration;
  initSchema =
    typeof rawInit === "string" ? safeParseJSON(rawInit) : rawInit;
}

// 2) current step config (visibility/read-only/etc)
let currentSchema = null;
if (cfg?.step_form_configuration) {
  const rawCur = cfg.step_form_configuration;
  currentSchema =
    typeof rawCur === "string" ? safeParseJSON(rawCur) : rawCur;
}

// 3) decide final schema:
//   - for INITIATE itself: just use its own schema
//   - for other steps: use field list from current step,
//     but inject input_type/data_type from INITIATE schema by column
const isTerminateCfg =
  String(cfg?.step_name || "").toUpperCase() === "TERMINATE";

const curFields = Array.isArray(currentSchema?.fields) ? currentSchema.fields : [];
const initFields = Array.isArray(initSchema?.fields) ? initSchema.fields : [];

if (!curFields.length && initFields.length) {
  currentSchema = initSchema;
}

let finalSchema = currentSchema || initSchema || { fields: [] };

const isInitiate =
  String(cfg?.step_name || "").toUpperCase() === "INITIATE";

if (!isInitiate && initSchema && currentSchema) {
  const baseFields = Array.isArray(initSchema.fields)
    ? initSchema.fields
    : [];
  const curFields = Array.isArray(currentSchema.fields)
    ? currentSchema.fields
    : [];

  const baseByCol = new Map(
    baseFields.map((f) => [
      String(f.column || f.name || "").toLowerCase(),
      f,
    ])
  );

  const mergedFields = curFields.map((f) => {
    const colKey = String(f.column || f.name || "").toLowerCase();
    const base = baseByCol.get(colKey);

    if (!base) return f;



      // --- Derived "next step" info for display (UI preview only) -------------
  const routeArr = Array.isArray(routeinfo) ? routeinfo : [];

  const currentStepIdForDisplay = instanceDetail
  ? Number(instanceDetail.step_no) || 0
  : 0;

  // route row for the *current* step
  const currentCfg =
    routeArr.find((s) => Number(s.step_no) === currentStepIdForDisplay) || null;

  const nextApproveStepId =
    currentCfg &&
    currentCfg.next_step_after_approve !== undefined &&
    currentCfg.next_step_after_approve !== null &&
    currentCfg.next_step_after_approve !== ""
      ? Number(currentCfg.next_step_after_approve)
      : null;

  const nextApproveCfg = nextApproveStepId
    ? routeArr.find((s) => Number(s.step_no) === nextApproveStepId)
    : null;

  // Reject: use next_step_after_reject on the *current* route row
  const nextRejectStepId =
    currentCfg &&
    typeof currentCfg.next_step_after_reject !== "undefined"
      ? Number(currentCfg.next_step_after_reject)
      : null;

  const nextRejectCfg = nextRejectStepId
    ? routeArr.find((s) => Number(s.step_no) === nextRejectStepId)
    : null;

  const formatStepLabel = (stepId, cfg) => {
    if (!stepId) return "";
    const nm = cfg?.step_name;
    return nm ? `${stepId} – ${nm}` : String(stepId);
  };

  const nextApproveLabel = formatStepLabel(nextApproveStepId, nextApproveCfg);
  const nextRejectLabel = formatStepLabel(nextRejectStepId, nextRejectCfg);






  

    // copy input_type / data_type from INITIATE into this step
    return {
      ...base,
      ...f,
      input_type: base.input_type ?? f.input_type,
      data_type: base.data_type ?? f.data_type,
    };
  });

  finalSchema = {
    ...initSchema,
    ...currentSchema,
    fields: mergedFields,
  };
}

if (isTerminateCfg && initFields.length) {
  finalSchema = {
    ...initSchema,
    ...finalSchema,
    fields: initFields.map((f) => ({ ...f, visible: true })),
  };
}

setSchema(finalSchema || { fields: [] });


        // 2) Business row from custwf_* table (by workflow_id = instance.id)
let refTable = inst.workflow_table_name || null;
let refTableId = null;

if (refTable) {
  try {
    const { data: row } = await api.get(
      `/tables/dataByWorkflow/${refTable}/${inst.id}`
    );

    const base = row || {};

    // 🔹 merge in instance-level fields (audit_trail + step_comments)
    const merged = {
      ...base,
      audit_trail: inst.audit_trail ?? base.audit_trail ?? null,
      step_comments: "",
    };

    setInitialValues(merged);
    refTableId = base?.id ?? null;
    setBusinessRowId(refTableId);
  } catch (e) {
    console.error("[instance] load business row failed", e);

    setInitialValues({
      audit_trail: inst.audit_trail ?? null,
      step_comments: "",
    });

    refTableId = null;
    setBusinessRowId(null);
  }
} else {
  setInitialValues({
    audit_trail: inst.audit_trail ?? null,
    step_comments: inst.step_comments ?? "",
  });
  refTableId = null;
  setBusinessRowId(null);
}

// 3) Attachments for this instance
// For SIMPLE WORKFLOW we now always query using:
//   approval_id   = instance.id            (path param)
//   ref_table     = simple_workflow_instances
//   ref_table_id  = instance.id
try {
  const { data: files } = await api.get(
    `/approval_files/by-instance/${inst.id}`,
    {
      params: {
        ref_table: "simple_workflow_instances",
        ref_table_id: inst.id,
      },
    }
  );

  setAttachments(Array.isArray(files) ? files : []);
} catch (e) {
  console.error("[instance] load attachments failed", e);
  setAttachments([]);
}


      } catch (e) {
        console.error("[instance] detail load failed", e);
      } finally {
        setLoading(false);
      } 
    })();
  }, [open, instance?.id]);

  // Load users when review is allowed
  useEffect(() => {
    if (!open) return;
    if (!stepCfg?.review_allowed) return;

    (async () => {
      try {
        const { data } = await api.get("/users"); // adjust path if different
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("[instance] load users failed", e);
        setUsers([]);
      }
    })();
  }, [open, stepCfg?.review_allowed]);

  const uiActions = stepCfg?.ui_actions || null;
  const approveLabel = uiActions?.primary_label ?? "";
  const rejectLabel = uiActions?.reject_label ?? "";

const canViewAttachments = !!stepCfg?.attachment_access?.can_view;
const canUploadAttachmentsFlag = !!stepCfg?.attachment_access?.can_upload;
const isTerminateStep = String(stepCfg?.step_name || "").toUpperCase() === "TERMINATE";

  const auditTrailEntries = normalizeAuditTrail(instanceDetail?.audit_trail);
  const commentEntries = auditTrailEntries.filter((entry) => {
    const raw = entry?.step_comments;
    return typeof raw === "string" ? raw.trim().length > 0 : raw != null;
  });

  const formatUserLabel = (id) => {
    if (id == null) return "-";
    const n = Number(id);
    const u = Array.isArray(users) ? users.find((usr) => Number(usr.id) === n) : null;
    return (
      u?.full_name ||
      u?.name ||
      `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
      u?.username ||
      u?.email ||
      `User ${n}`
    );
  };

  const routeinfoArr = (() => {
    const raw = instanceDetail?.routeinfo;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  const routeinfoByStep = new Map(
    routeinfoArr
      .map((r) => ({
        step_no: Number(r?.step_no),
        step_name: r?.step_name,
        step_type: r?.step_type,
      }))
      .filter((r) => Number.isFinite(r.step_no))
      .map((r) => [r.step_no, r])
  );

  const extractAttachments = (data) => {
    if (!data || typeof data !== "object") return [];
    const candidates = ["attachments", "_attachments"];
    for (const key of candidates) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [];
  };

  const groupedAudit = (() => {
    const entries = auditTrailEntries
      .map((entry, idx) => {
        const stepNo =
          entry?.to_step_no ?? entry?.from_step_no ?? entry?.step_no ?? null;
        const stepInfo = Number.isFinite(Number(stepNo))
          ? routeinfoByStep.get(Number(stepNo))
          : null;
        return {
          entry,
          idx,
          stepNo: Number.isFinite(Number(stepNo)) ? Number(stepNo) : null,
          stepName: stepInfo?.step_name || entry?.step_name || "-",
          stepType: stepInfo?.step_type || "-",
        };
      })
      .sort((a, b) => {
        const snA = a.stepNo ?? -1;
        const snB = b.stepNo ?? -1;
        if (snA !== snB) return snB - snA;
        const atA = a.entry?.at ? new Date(a.entry.at).getTime() : 0;
        const atB = b.entry?.at ? new Date(b.entry.at).getTime() : 0;
        return atB - atA;
      });

    const byStep = new Map();
    for (const row of entries) {
      const key = row.stepNo ?? -1;
      if (!byStep.has(key)) byStep.set(key, { ...row, items: [] });
      byStep.get(key).items.push(row.entry);
    }
    return Array.from(byStep.values());
  })();

  const diffFields = (curr, prev) => {
    const a = curr && typeof curr === "object" ? curr : {};
    const b = prev && typeof prev === "object" ? prev : {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const changed = [];
    keys.forEach((k) => {
      const av = a[k];
      const bv = b[k];
      if (JSON.stringify(av) !== JSON.stringify(bv)) changed.push(k);
    });
    return changed;
  };

// optional debug
console.log(
  "[EXECUTE] attachment_access:",
  stepCfg?.attachment_access,
  "=> view/upload?",
  canViewAttachments,
  canUploadAttachmentsFlag
);



    const showReview = !!uiActions?.show_review && !isReviewMode;
    const showReject = !!uiActions?.show_reject;












 // ---------- core action handler: save business row + update instance ------
async function handleSubmit(action, { values, stagedFiles }) {
  if (!instanceDetail) {
    console.error("Missing instance detail");
    return;
  }

  const inst = instanceDetail;
  const table = inst.workflow_table_name;
  const rowId = businessRowId;

  // 1) Save form fields to custwf_* table (EXCLUDING audit_trail)
    if (table && rowId != null) {
    const changes = {};

    for (const [col, val] of Object.entries(values || {})) {
      const colLower = String(col || "").toLowerCase();

      // never send audit_trail to custwf_* tables
      if (colLower === "audit_trail") continue;

      let v = val;

       // flatten multi-selects to a comma-separated string
    if (Array.isArray(v)) {
      v = v.length ? v.join(",") : null;
    }

      // normalise empty string to null
      if (v === "") v = null;

      changes[col] = v;
    }

    console.log("TABLE:", table, "ROW:", rowId, "PAYLOAD (changes):", changes);

    try {
      await api.put(`/tables/data/${table}/${rowId}`, { changes });
    } catch (e) {
      console.error("[instance] save to business table failed", e);
      console.error("API error data:", e?.response?.data);
      alert(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to update workflow table row"
      );
      return;
    }
  }


  // 2) Build instance changes (step_name, wf_status, step_no, etc.)
    // 2) Build instance changes (step_name, wf_status, step_no, etc.)
  const currentStepName = inst.step_name || stepCfg?.step_name || "STEP";

  // 2a) step_comments from the dynamic form
  const stepCommentsField = Array.isArray(schema?.fields)
    ? schema.fields.find(
        (f) => String(f.column || "").toLowerCase() === "step_comments"
      )
    : null;

  const stepCommentsCol = stepCommentsField
    ? String(stepCommentsField.column || "").trim()
    : null;

  const stepCommentsVal = stepCommentsCol ? values[stepCommentsCol] : null;

  const instChanges = {};
  instChanges.action = action;
  if (stepCommentsCol) {
    instChanges.step_comments =
      stepCommentsVal === undefined ? null : stepCommentsVal;
  }

  // 2b) Determine NEW step_no based on action
  const route = Array.isArray(routeinfo) ? routeinfo : [];

  const currentStepNo = Number(inst.step_no) || 0;
  const currentCfg =
    route.find(
      (s) =>
        Number(s.step_no) === currentStepNo ||
        Number(s.step_no) === currentStepNo
    ) || null;

  let newStepNo = currentStepNo;

  let returnReviewRequestor = null;

  if (action === "approve") {
    if (
      !currentCfg ||
      currentCfg.next_step_after_approve === undefined ||
      currentCfg.next_step_after_approve === null ||
      currentCfg.next_step_after_approve === ""
    ) {
      alert("Approve routeinfo missing: next_step_after_approve.");
      return;
    }
    newStepNo = Number(currentCfg.next_step_after_approve);
    if (!Number.isFinite(newStepNo)) {
      alert("Approve routeinfo invalid: next_step_after_approve.");
      return;
    }
  } else if (action === "reject") {
    if (
      !currentCfg ||
      currentCfg.next_step_after_reject === undefined ||
      currentCfg.next_step_after_reject === null ||
      currentCfg.next_step_after_reject === ""
    ) {
      alert("Reject routeinfo missing: next_step_after_reject.");
      return;
    }
    newStepNo = Number(currentCfg.next_step_after_reject);
    if (!Number.isFinite(newStepNo)) {
      alert("Reject routeinfo invalid: next_step_after_reject.");
      return;
    }
  } // for "review" we stay on same step

  instChanges.step_no = newStepNo;

  console.log("[instance] currentStepNo:", currentStepNo);
  console.log("[instance] action:", action);
  console.log("[instance] newStepNo:", newStepNo);

  // 2c) Copy step info for the NEW step
  const newStepCfg =
    route.find((s) => Number(s.step_no) === newStepNo) || null;

  console.log("[instance] new step route row:", newStepCfg);

  if (!newStepCfg) {
    alert(`routeinfo not found for step_no ${newStepNo}`);
    return;
  }
  if (newStepCfg.step_name) {
    instChanges.step_name = newStepCfg.step_name;
  }
  if (newStepCfg.step_performer != null) {
    instChanges.step_performer = newStepCfg.step_performer;
  }
  if (newStepCfg.wf_status) {
    instChanges.wf_status = newStepCfg.wf_status;
  }

  // 2d) next_step_after_* must match routeinfo for the target step
  instChanges.next_step_after_approve =
    newStepCfg.next_step_after_approve ?? null;
  instChanges.next_step_after_reject =
    newStepCfg.next_step_after_reject ?? null;


  // 2e) action-specific bits: performer, review_requestor, status, etc.
  const loginUserId =
    window?.currentUser?.id || window?.authUser?.id || null; // adjust to auth

    if (loginUserId != null) {
    instChanges.assigned_by = loginUserId;
  }

  // base name without trailing " Review"
  const baseStepName = String(currentStepName || "")
    .replace(/\s+review$/i, "")
    .trim() || currentStepName;

  if (action === "approve") {
    // normal approve
    instChanges.wf_status =
      instChanges.wf_status || `${baseStepName}_completed`;
    instChanges.review_requestor = inst.review_requestor ?? null;
    // If this was a review cycle, return ownership to the requestor
    if (inst.review_requestor != null) {
      instChanges.step_performer = inst.review_requestor;
      if (!newStepCfg?.step_name) instChanges.step_name = baseStepName;
    }
  } else if (action === "reject") {
    // normal reject
    instChanges.wf_status =
      instChanges.wf_status || `${baseStepName}_rejected`;
    instChanges.review_requestor = null;
  } else if (action === "review") {
    // SEND FOR REVIEW
    // wf_status: "Step 1_Review"
    // step_performer: <selected user>
    // review_requestor: <login user>
    // step_name: "Step 1 Review" (space)
    instChanges.step_performer = reviewUserId
      ? Number(reviewUserId)
      : null;
    instChanges.review_requestor = loginUserId ?? null;
    instChanges.step_name = `${baseStepName} Review`;
    instChanges.wf_status = `${baseStepName}_Review`;
  } else if (action === "return") {
    // REVIEWER RETURNS TO REQUESTOR
    // wf_status: "<prev_step_name>_Completed"
    // step_performer: <review_requestor>
    // review_requestor: null
    // step_name: "Step 1"
    try {
      const fresh = await api.get(`/simple_workflow_instances/${inst.id}`);
      const freshInst = fresh?.data || fresh;
      returnReviewRequestor = freshInst?.review_requestor ?? null;
    } catch (e) {
      console.error("[instance] failed to refresh review_requestor", e);
      alert("Unable to load review_requestor for return action.");
      return;
    }
    if (returnReviewRequestor == null) {
      alert("Review requestor is missing for return action.");
      return;
    }
    instChanges.step_performer = returnReviewRequestor;
    instChanges.review_requestor = returnReviewRequestor;
    instChanges.step_name = baseStepName;
    // compute previous step (current step_no - 1) from routeinfo
    const prevStepNo = (Number(currentStepNo) || 0) - 1;
    const prevCfg =
      Array.isArray(routeinfo) &&
      routeinfo.find((r) => Number(r.step_no) === prevStepNo);
    const prevName = prevCfg?.step_name || baseStepName;
    instChanges.wf_status = `${baseStepName}_Reviewed`;
  }




  /* 🔹 2f) Append a new audit_trail entry on the instance */
  const existingAudit = normalizeAuditTrail(inst.audit_trail);

  // clone values and drop the audit_trail field itself from what we log
  const auditData = { ...(values || {}) };
  for (const k of Object.keys(auditData)) {
    if (String(k).toLowerCase() === "audit_trail") {
      delete auditData[k];
    }
  }

  

  const initiatorId   = inst.initiator ?? null;
  const oldPerformer  = inst.step_performer ?? null;

  let performerId     = oldPerformer;                    // owner after action
  let reviewReqId     = null;
  let byId            = oldPerformer || initiatorId;     // who clicked button

  if (action === "review") {
    // current performer sends to reviewer
    performerId = reviewUserId ? Number(reviewUserId) : null;
    reviewReqId = oldPerformer || initiatorId || null;
  } else if (action === "return") {
    // reviewer returns to original requestor
    performerId =
      returnReviewRequestor ?? inst.review_requestor ?? oldPerformer ?? initiatorId ?? null;
    reviewReqId = returnReviewRequestor ?? null;
  } else if (action === "approve" && inst.review_requestor != null) {
    // post-review approve -> back to requestor
    performerId = inst.review_requestor;
    reviewReqId = null;
  }





  // 🔹 Force these into the snapshot we store in audit_trail.data
  if (initiatorId != null) {
    auditData.initiator = initiatorId;
  }
  if (performerId != null) {
    auditData.performer = performerId;
  }
  if (reviewReqId != null) {
    auditData.review_requestor = reviewReqId;
  }


  // 🔹 Effective status for this action
const effectiveStatus =
  instChanges.wf_status || inst.wf_status || null;

// ensure the snapshot contains the real status, not the blank from the form
if (effectiveStatus != null) {
  auditData.wf_status = effectiveStatus;
}



  const auditEntry = {
    at: new Date().toISOString(),
    by: byId ?? null,              // never null; comes from instance cols
    action,                        // "approve" | "reject" | "review"
    from_step_no: currentStepNo,
    to_step_no: newStepNo,
    step_name: newStepCfg?.step_name || inst.step_name || null,
    wf_status: effectiveStatus,          // 🔹 reuse the same value
    step_comments: stepCommentsVal ?? null,

    // 🔹 also on the top-level of the entry
    initiator: initiatorId ?? null,
    performer: performerId ?? null,
    review_requestor: reviewReqId ?? null,

    data: auditData,               // snapshot of current form values
  };

  instChanges.audit_trail = [...existingAudit, auditEntry];

/* 🔹 end audit_trail update */








  // 3) Persist instance changes
  if (Object.keys(instChanges).length) {
    try {
      console.log("[instance] PATCH payload:", instChanges);
      const patchRes = await api.patch(`/simple_workflow_instances/${inst.id}`, instChanges);
      const patchPayload = patchRes?.data || patchRes;
      if (patchPayload?.mail_status) {
        const ms = patchPayload.mail_status;
        const msg = ms.sent
          ? "Form submitted and mail notification sent to recipients."
          : `Form submitted. Mail not sent${ms.reason ? ": " + ms.reason : ""}`;
        alert(msg);
      }
    } catch (e) {
      console.error("[instance] instance update failed", e);
      console.error("API error data:", e?.response?.data);
      alert(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to update workflow instance"
      );
      return;
    }
  } else {
    console.warn("[instance] no instance changes to PATCH");
  }

  
  // 4) Upload new attachments
  // For SIMPLE WORKFLOW module we always anchor attachments
  // to the instance row itself: simple_workflow_instances + instance.id
  if (Array.isArray(stagedFiles) && stagedFiles.length) {
    try {
      for (const f of stagedFiles) {
        const form = new FormData();
        form.append("file", f);

        // 🔹 New: logical “owner” of the file is the instance header,
        //     not the custwf_* business table.
        form.append("ref_table", "simple_workflow_instances");
        form.append("ref_table_id", String(inst.id));

        // approval_files.approval_id will be set from this on the server
        form.append("workflow_id", String(inst.id));

        // Optional but harmless: makes it explicit that this is an instance id
        form.append("instance_id", String(inst.id));

        await api.post("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    } catch (e) {
      console.error("[instance] upload attachments failed", e);
    }
  }


  onClose?.(true); // signal refresh
}

















  return (
    <Dialog
      open={open}
      onClose={() => onClose?.(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { width: "75%", maxWidth: 750, height: "100vh" } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "#eef6ff",
          py: 0.75,
          fontSize: 16,
          lineHeight: 1.2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {instance
            ? `Instance #${instance.id} – ${
                instance.workflow_map_name || instance.workflow_name || ""
              }`
            : "Instance"}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={() => onClose?.(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          height: "calc(90vh - 112px)",
          scrollbarWidth: "none",
          scrollbarColor: "#cbd5e1 transparent",
          "&:hover": {
            scrollbarWidth: "thin",
          },
          "&::-webkit-scrollbar": {
            width: 0,
            height: 0,
          },
          "&:hover::-webkit-scrollbar": {
            width: 6,
            height: 6,
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#cbd5e1",
            borderRadius: 999,
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "#94a3b8",
          },
        }}
      >
        <Box
          sx={{
            fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif',
            "& .MuiCheckbox-root, & .MuiRadio-root": {
              transform: "scale(0.85)",
              padding: 0.25,
            },
            "& .MuiFormControlLabel-label": {
              fontSize: "0.92rem",
            },
          }}
        >
        {loading || !stepCfg || !schema ? (
          <Typography variant="body2">
            {loading
              ? "Loading…"
              : "Step configuration not found for this instance."}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 2, alignItems: "stretch" }}>
            <Box sx={{ flex: 3, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <Box
                sx={{
                  flex: 1,
                  minHeight: "100vh",
                  maxHeight: "100vh",
                  overflow: "auto",
                  scrollbarWidth: "none",
                  scrollbarColor: "#cbd5e1 transparent",
                  "&:hover": {
                    scrollbarWidth: "thin",
                  },
                  "&::-webkit-scrollbar": {
                    width: 0,
                    height: 0,
                  },
                  "&:hover::-webkit-scrollbar": {
                    width: 6,
                    height: 6,
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "transparent",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#cbd5e1",
                    borderRadius: 999,
                  },
                  "&::-webkit-scrollbar-thumb:hover": {
                    background: "#94a3b8",
                  },
                  border: "none",
                  borderRadius: 0,
                  p: 1.5,
                  bgcolor: "transparent",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
            {false && execViewInfo && (
              <Typography
                variant="caption"
                sx={{ mb: 1, display: "block", color: "text.secondary" }}
                data-testid="active-exec-view"
              >
                Using view: {execViewInfo.view_name || execViewInfo.key}
                {execViewInfo.isDefault ? " (default)" : ""}
              </Typography>
            )}
            




            
            
            {/* Dynamic step form */}
                                    {(() => {
              // base read-only system columns
              const baseRO = ["performer", "step_performer", "wf_status", "review_requestor"];

              let forceRO = baseRO;
              let extraReq = [];

              if (isReviewMode && schema?.fields) {
                const allCols = schema.fields
                  .map((f) => String(f.column || f.name || "").toLowerCase())
                  .filter(Boolean);

                // everything except step_comments & audit_trail becomes RO
                const moreRO = allCols.filter(
                  (c) => c !== "step_comments" && c !== "audit_trail"
                );

                forceRO = Array.from(new Set([...baseRO, ...moreRO]));
                extraReq = ["step_comments"]; // make comments mandatory
              }

              // Derive schema ordered by saved view if present
              const displaySchema = (() => {
                const fields = Array.isArray(schema?.fields) ? schema.fields : [];
                if (!fields.length) return schema;
                if (isTerminateStep) {
                  return { ...(schema || {}), fields: fields.map((f) => ({ ...f, visible: true })) };
                }
                if (!execViewLayout) return schema;
                try {
                  const mats = materializeLayout(execViewLayout, fields);
                  if (!Array.isArray(mats)) return schema;
                  const byCol = new Map(fields.map(f => [String(f.column||"").trim(), f]));
                  const ordered = [];
                  mats.forEach(sec => (sec.columns||[]).forEach(col => (col.fields||[]).forEach(f => {
                    const k = String(f.field||"").trim();
                    const meta = byCol.get(k);
                    if (meta && meta.visible) { ordered.push(meta); byCol.delete(k); }
                  })));
                  byCol.forEach((meta)=>{ if (meta?.visible) ordered.push(meta); });
                  return { ...(schema||{}), fields: ordered };
                } catch {
                  return schema;
                }
              })();

console.log(
  "[terminate] schema fields",
  schema?.fields?.length,
  "displaySchema fields",
  displaySchema?.fields?.length
);

const fields = Array.isArray(schema?.fields) ? schema.fields : [];
const execContainerStyle = isTerminateStep
  ? { ...(execViewLayout?.container_style || {}), border: false }
  : execViewLayout?.container_style;
              const execLayoutSections =
                isTerminateStep || !execViewLayout ? null : materializeLayout(execViewLayout, fields);

              return (
                <DynamicStepForm
                  ref={formRef}
                  presentation="reusableModal"
                  schema={displaySchema}
                  initial={initialValues}
                  canvasModel={execCanvasLayout}
                  layoutSections={execLayoutSections}
                  containerStyle={execContainerStyle}
                  attachmentsAllowed={!isTerminateStep && canUploadAttachmentsFlag && !isOutbox}
                  oneColumn={execOneCol}
                  showPrimaryButton={false}
                  forceReadOnlyColumns={forceRO}
                  extraRequiredColumns={extraReq}
                  getCurrentAction={() => actionRef.current}
                  onSubmit={async (payload) => {
                    if (saving) return;
                    setSaving(true);
                    try {
                      await handleSubmit(actionRef.current || "approve", payload);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {showReview && !isReviewMode && (
                    <Box sx={{ mt: 1, maxWidth: 320 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Send for review to"
                        value={reviewUserId}
                        onChange={(e) => setReviewUserId(e.target.value)}
                      >
                        <MenuItem value="">Select user…</MenuItem>
                        {users.map((u) => (
                          <MenuItem key={u.id} value={u.id}>
                            {u.full_name ||
                              u.name ||
                              `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
                              u.username ||
                              u.email ||
                              `User ${u.id}`}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  )}
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      On Approve:{" "}
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {nextApproveCfg ? renderPerformerLabel(nextApproveCfg) : "Not configured"}
                      </Box>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      On Reject:{" "}
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {nextRejectCfg ? renderPerformerLabel(nextRejectCfg) : "Not configured"}
                      </Box>
                    </Typography>
                  </Box>
                  {(isTerminateStep || canViewAttachments) && attachments.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        Existing Attachments
                      </Typography>

                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                        {attachments.map((f) => {
                          const url = getAttachmentUrl(f);
                          const name = f?.original_filename || f?.filename || "Unnamed file";

                          return (
                            <Box
                              key={f.id}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                p: 0.75,
                                border: "1px solid rgba(0,0,0,0.08)",
                                borderRadius: 1,
                                bgcolor: "#fff",
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  flex: 1,
                                  cursor: url ? "pointer" : "default",
                                  textDecoration: url ? "underline" : "none",
                                  color: url ? "primary.main" : "text.secondary",
                                }}
                                onClick={() => url && openAttachment(f)}
                                title={url ? "Open" : "No URL"}
                              >
                                • {name}
                              </Typography>

                              <Tooltip title="Open">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={!url}
                                    onClick={() => openAttachment(f)}
                                  >
                                    <OpenInNewIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>

                              <Tooltip title="Download">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={!url}
                                    onClick={() => downloadAttachment(f)}
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                </DynamicStepForm>
              );
            })()}

                        {/* Next step previews (read-only) */}
            {/* <Box sx={{ mt: 1, display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                size="small"
                label="Next Step if Reject"
                value={nextRejectLabel}
                InputProps={{ readOnly: true }}
                error // makes the label red, like in your screenshot
                sx={{ minWidth: 220 }}
              />
              <TextField
                size="small"
                label="Next Step if Approve"
                value={nextApproveLabel}
                InputProps={{ readOnly: true }}
                error
                sx={{ minWidth: 220 }}
              />
            </Box> */}


              </Box>
            </Box>
        </Box>
        )}
        </Box>
      </DialogContent>
      <Box
        sx={{
          minHeight: 48,
          bgcolor: "#f3f4f6",
          borderTop: "1px solid #e5e7eb",
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {!isOutbox && (
            <>
              {isReviewMode ? (
                <Button
                  variant="contained"
                  size="small"
                  disabled={saving}
                  onClick={() => {
                    actionRef.current = "return";
                    formRef.current?.submit();
                  }}
                  sx={{ ml: 1, minWidth: 110, height: 32 }}
                >
                  Return
                </Button>
              ) : (
                <>
                  {showReview && (
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={saving}
                      onClick={() => {
                        if (!reviewUserId) {
                          alert("Please select a user for review.");
                          return;
                        }
                        actionRef.current = "review";
                        formRef.current?.submit();
                      }}
                      sx={{ ml: 1, minWidth: 110, height: 32 }}
                    >
                      Review
                    </Button>
                  )}

                  <Button
                    variant="contained"
                    size="small"
                    disabled={saving}
                    onClick={() => {
                      actionRef.current = "approve";
                      formRef.current?.submit();
                    }}
                    sx={{ ml: 1, minWidth: 110, height: 32 }}
                  >
                    {approveLabel}
                  </Button>

                  {showReject && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      disabled={saving}
                      onClick={() => {
                        actionRef.current = "reject";
                        formRef.current?.submit();
                      }}
                      sx={{ ml: 1, minWidth: 110, height: 32 }}
                    >
                      {rejectLabel}
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Comments">
            <IconButton
              onClick={() => setCommentsOpen(true)}
              size="small"
              aria-label="Comments"
              sx={{ border: "1px solid #cbd5e1", borderRadius: 1, color: "#2563eb" }}
            >
              <CommentOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Audit Trail">
            <IconButton
              onClick={() => setAuditOpen(true)}
              size="small"
              aria-label="Audit Trail"
              sx={{ border: "1px solid #cbd5e1", borderRadius: 1, color: "#0f766e" }}
            >
              <HistoryOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Dialog
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "#f8fafc",
            py: 0.75,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Audit Trail
          </Typography>
          <IconButton onClick={() => setAuditOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            maxHeight: "70vh",
            overflow: "auto",
            scrollbarWidth: "none",
            scrollbarColor: "#cbd5e1 transparent",
            "&:hover": {
              scrollbarWidth: "thin",
            },
            "&::-webkit-scrollbar": {
              width: 0,
              height: 0,
            },
            "&:hover::-webkit-scrollbar": {
              width: 6,
              height: 6,
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "#cbd5e1",
              borderRadius: 999,
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "#94a3b8",
            },
            bgcolor: "#f9fafb",
          }}
        >
          {auditTrailEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No history yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {groupedAudit.map((group, groupIdx) => {
                const stepNoLabel = group.stepNo != null ? String(group.stepNo) : "-";
                return (
                  <Box
                    key={`hist_group_${group.stepNo}_${group.idx}`}
                    sx={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 1,
                      p: 1,
                      bgcolor: "white",
                    }}
                  >
                    {groupIdx === 0 && (
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        History
                      </Typography>
                    )}
                    <Box sx={{ mb: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        Step No: {stepNoLabel}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Step Name: {group.stepName}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Step Type: {group.stepType}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                      {group.items.map((entry, idx) => {
                        const entryData = entry?.data || entry?.form_values || null;
                        const prev =
                          group.items[idx - 1]?.data ||
                          group.items[idx - 1]?.form_values ||
                          null;
                        const changed = diffFields(entryData, prev);
                        const action = entry?.action || "-";
                        const performedBy = (() => {
                          if (entry?.action === "initiate" || entry?.from_step_no === 0) {
                            return formatUserLabel(
                              instanceDetail?.initiator ?? entry?.initiator
                            );
                          }
                          return formatUserLabel(entry?.performer ?? entry?.by);
                        })();
                        const date = entry?.at ? new Date(entry.at).toLocaleString() : "-";
                        const files = extractAttachments(entryData);
                        return (
                          <Box
                            key={`hist_${group.stepNo}_${idx}`}
                            sx={{
                              border: "1px solid #f1f5f9",
                              borderRadius: 1,
                              p: 0.75,
                              bgcolor: "#f8fafc",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <AccessTimeIcon fontSize="inherit" />
                              <Typography variant="caption">Date modified: {date}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <PersonOutlineIcon fontSize="inherit" />
                              <Typography variant="caption">
                                Step Performed By: {performedBy}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <BoltIcon fontSize="inherit" />
                              <Typography variant="caption">Step Action: {action}</Typography>
                            </Box>
                            <Typography variant="caption" display="block">
                              Fields changed:{" "}
                              {changed.length
                                ? changed
                                    .map((k) => {
                                      const v = entryData ? entryData[k] : undefined;
                                      return `${k}: ${JSON.stringify(v)}`;
                                    })
                                    .join(", ")
                                : "-"}
                            </Typography>
                            {files.length > 0 && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <AttachFileIcon fontSize="inherit" />
                                <Typography variant="caption">
                                  Files attached: {files.length}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "#f8fafc",
            py: 0.75,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Comments
          </Typography>
          <IconButton onClick={() => setCommentsOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            maxHeight: "70vh",
            overflow: "auto",
            scrollbarWidth: "none",
            scrollbarColor: "#cbd5e1 transparent",
            "&:hover": {
              scrollbarWidth: "thin",
            },
            "&::-webkit-scrollbar": {
              width: 0,
              height: 0,
            },
            "&:hover::-webkit-scrollbar": {
              width: 6,
              height: 6,
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "#cbd5e1",
              borderRadius: 999,
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "#94a3b8",
            },
            bgcolor: "#f9fafb",
          }}
        >
          {commentEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No comments yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {commentEntries.map((entry, idx) => {
                const byLabel = formatUserLabel(entry?.by);
                const stepNo =
                  entry?.from_step_no != null ? String(entry.from_step_no) : "-";
                const stepName = entry?.step_name || "-";
                const when = entry?.at ? new Date(entry.at).toLocaleString() : "-";
                const text =
                  typeof entry?.step_comments === "string"
                    ? entry.step_comments
                    : JSON.stringify(entry?.step_comments);
                return (
                  <Box
                    key={`comment_${idx}`}
                    sx={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 1,
                      p: 1,
                      bgcolor: "#fff",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700 }} display="block">
                      {byLabel}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Step No: {stepNo}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Step Name: {stepName}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {when}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {text}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
      </Dialog>
      {/* Submission backdrop */}
      <Backdrop
        open={saving}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: "#fff" }}
      >
        <Box textAlign="center">
          <CircularProgress color="inherit" />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Submitting, please wait...
          </Typography>
        </Box>
      </Backdrop>
    </Dialog>
  );
}




export default function BAAssignments() {
  const [box, setBox] = useState("inbox"); // inbox | outbox
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8; // 4 per row x 2 rows

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedWorkflow, setPickedWorkflow] = useState(null);
  const [initiateOpen, setInitiateOpen] = useState(false);

  const [activeInstance, setActiveInstance] = useState(null);
  const [instanceOpen, setInstanceOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const usersById = useMemo(() => {
  const m = new Map();
      (users || []).forEach(u => {
        const name =
          u.full_name ||
          u.name ||
          `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
          u.username ||
          u.email ||
          `User ${u.id}`;
        m.set(Number(u.id), name);
      });
      return m;
    }, [users]);


      useEffect(() => {
      (async () => {
        try {
          const { data } = await api.get("/users");
          setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error("[assignments] users fetch failed", e);
          setUsers([]);
        }
      })();
    }, []);


  // Fetch instances
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api.get("/simple_workflow_instances", { params: { box } });
        const arr = Array.isArray(r.data) ? r.data : [];
        // Optionally resolve assigned_by name in API. If not, leave as-is.
        const enriched = arr.map(x => {
         const assignedById = Number(x.assigned_by);
         return {
           ...x,
           assigned_by_name:
             x.assigned_by_name ||
             usersById.get(assignedById) ||
             null,
         };
       });
       setRows(enriched);
        setPage(1);
      } catch (e) {
        console.error("[assignments] list failed", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [box, usersById]);

  // Client-side search
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const fields = [
        r.workflow_map_name || r.workflow_name || "",
        r.wf_status || "",
        r.step_name || "",
        String(r.id || ""),
        String(r.assigned_by_name || r.assigned_by || ""),
      ];
      return fields.some((v) => String(v).toLowerCase().includes(s));
    });
  }, [q, rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

    function openInstance(item) {
    setActiveInstance(item);
    setInstanceOpen(true);
  }

  function onPickWorkflow(w) {
    setPickedWorkflow(w);
    setPickerOpen(false);
    setInitiateOpen(true);
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <Box sx={{ bgcolor: "#1f355d", color: "#fff", px: 4, py: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Workflow Assignments
        </Typography>
      </Box>

      <Box sx={{ bgcolor: "#1f355d", color: "#fff", px: 4, py: 1.5 }}>
        <Tabs
          value={box}
          onChange={(_e, v) => setBox(v)}
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: "#fff" } }}
          sx={{
            minHeight: 36,
            "& .MuiTab-root": {
              minHeight: 36,
              px: 2.5,
              fontWeight: 700,
              color: "#e6edf7",
            },
            "& .Mui-selected": { color: "#fff" },
          }}
        >
          <Tab value="inbox" label="INBOX" />
          <Tab value="outbox" label="OUTBOX" />
        </Tabs>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ maxWidth: 1200, mx: "auto" }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
            sx={{ gap: 2, flexWrap: "wrap" }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setPickerOpen(true)}
              sx={{
                borderRadius: 2,
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "0 2px 6px rgba(0,0,0,0.10)",
                bgcolor: "#1f355d",
              }}
            >
              Start New Workflow
            </Button>

            <TextField
              size="small"
              placeholder="Search title"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{
                width: 260,
                bgcolor: "#fff",
                borderRadius: 1,
                "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Grid container spacing={2}>
            {loading ? (
              <Grid item xs={12}>
                <Typography variant="body2">Loading assignments.</Typography>
              </Grid>
            ) : paged.length === 0 ? (
              <Grid item xs={12}>
                <Typography variant="body2">No assignments found.</Typography>
              </Grid>
            ) : (
              paged.map((item) => (
                <Grid key={item.id} item xs={12} sm={6} md={3} sx={{ display: "flex" }}>
                  <Box sx={{ width: "100%" }}>
                    <InstanceCard item={item} onOpen={openInstance} />
                  </Box>
                </Grid>
              ))
            )}
          </Grid>

          <Box display="flex" justifyContent="flex-end" alignItems="center" mt={2.5}>
            <Pagination
              color="primary"
              count={pageCount}
              page={page}
              onChange={(_e, v) => setPage(v)}
              showFirstButton
              showLastButton
              sx={{
                "& .MuiPaginationItem-root": {
                  borderRadius: 2,
                },
              }}
            />
          </Box>

          <WorkflowPickerDialog
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onPick={onPickWorkflow}
          />

          <InitiateFormDialog
            open={initiateOpen}
            onClose={(didCreate) => {
              setInitiateOpen(false);
              setPickedWorkflow(null);
              if (didCreate) {
                (async () => {
                  try {
                    const r = await api.get("/simple_workflow_instances", { params: { box } });
                    setRows(Array.isArray(r.data) ? r.data : []);
                  } catch {}
                })();
              }
            }}
            workflow={pickedWorkflow}
          />

          <InstanceExecuteDialog
            open={instanceOpen}
            instance={activeInstance}
            isOutbox={box === "outbox"}
            onClose={(changed) => {
              setInstanceOpen(false);
              setActiveInstance(null);
              if (changed) {
                (async () => {
                  try {
                    const r = await api.get("/simple_workflow_instances", { params: { box } });
                    setRows(Array.isArray(r.data) ? r.data : []);
                  } catch (e) {
                    console.error("[assignments] refresh after instance close failed", e);
                  }
                })();
              }
            }}
          />
        </Box>
      </Container>
    </Box>
  );
}

// Named export for reuse (e.g., print page)
export { DynamicStepForm };




















// // src/pages/businessautomation/components/BAAssignments.jsx
// import React, { useEffect, useMemo, useState, useRef, useImperativeHandle, } from "react";
// import OpenInNewIcon from "@mui/icons-material/OpenInNew";
// import DownloadIcon from "@mui/icons-material/Download";
// import AccountTreeIcon from "@mui/icons-material/AccountTree";
// import {
//   Backdrop,
//   Box,
//   Container,
//   Button,
//   Card,
//   CardActionArea,
//   CardContent,
//   Chip,
//   Dialog,
//   DialogContent,
//   DialogTitle,
//   Divider,
//   Grid,
//   IconButton,
//   InputAdornment,
//   Pagination,
//   Tab,
//   Tabs,
//   TextField,
//   Tooltip,
//   Typography,
//   CircularProgress,
// } from "@mui/material";
// import SearchIcon from "@mui/icons-material/Search";
// import { MenuItem, FormControlLabel, Checkbox, Radio, RadioGroup, FormControl } from "@mui/material";
// import AddIcon from "@mui/icons-material/Add";
// import CloseIcon from "@mui/icons-material/Close";
// import AccessTimeIcon from "@mui/icons-material/AccessTime";
// import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
// import BoltIcon from "@mui/icons-material/Bolt";
// import AttachFileIcon from "@mui/icons-material/AttachFile";
// import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
// import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
// import api from "../../../services/api"; // adjust if different
// import { materializeLayout } from "../simple_workflowbuilder/components/simpleWorkflowFormLayouts";

// /* ----------------------------- small utilities ----------------------------- */

// const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "");

// const statusChipColor = (s) => {
//   const k = String(s || "").toLowerCase();
//   if (k === "closed" || k === "approved") return "success";
//   if (k === "rejected") return "error";
//   if (k === "in-progress") return "info";
//   return "warning";
// };

// const cardSx = {
//   height: "100%",
//   borderRadius: 2,
//   border: "1px solid #2f5fff",     // light grey fine border
//   backgroundColor: "#fff",// very light blue tint rgba(227,220,253,0.20)
//   boxShadow: "0 4px 10px rgba(16, 24, 40, 0.16)",
//   // boxShadow: "0 1px 3px rgba(0,0,0,0.04)",  // subtle shadow
//   minHeight: 160,
//   transition: "transform .12s ease, box-shadow .12s ease, border-color .12s ease",
//   "&:hover": {
//     transform: "translateY(-1px)",
//     boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
//     borderColor: "rgba(25,118,210,0.25)",
//   },
// };

// /* ----------------------------- Instance Card ------------------------------ */

// function safeParseJSON(s) {
//   try {
//     return JSON.parse(s);
//   } catch {
//     return null;
//   }
// }


// function normalizeAuditTrail(raw) {
//   if (!raw) return [];
//   if (Array.isArray(raw)) return raw;

//   if (typeof raw === "string") {
//     try {
//       const parsed = JSON.parse(raw);
//       if (Array.isArray(parsed)) return parsed;
//       return parsed ? [parsed] : [];
//     } catch {
//       return [];
//     }
//   }

//   if (typeof raw === "object") {
//     return [raw];
//   }

//   return [];
// }



// function normalizeAttachmentMode(raw) {
//   if (raw === true) return "true";
//   if (raw === false) return "false";
//   if (raw === 1) return "1";
//   if (raw === 0) return "0";
//   return String(raw ?? "").trim().toLowerCase();
// }

// function canUploadAttachments(raw) {
//   const m = normalizeAttachmentMode(raw);

//   if (!m) return false;

//   // Explicit YES flags
//   if (m === "true" || m === "1" || m === "yes" || m === "y") return true;

//   // Explicit NO / view-only flags
//   if (
//     m === "false" ||
//     m === "0" ||
//     m === "no" ||
//     m === "n" ||
//     m === "view" ||
//     m === "view_only"
//   ) {
//     return false;
//   }

//   // Explicit upload modes
//   if (m === "view_upload" || m === "upload_only") return true;

//   // Any value containing "upload"  treat as uploadable
//   if (m.includes("upload")) return true;

//   //  DEFAULT NOW = NO (non-intrusive but no more magic yes)
//   return false;
// }






// function InstanceCard({ item, onOpen }) {
//   return (
//     <Card sx={cardSx}>
//       <CardActionArea onClick={() => onOpen?.(item)}>
//         <CardContent>
//           <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
//             <Typography
//               variant="subtitle2"
//               color="text.secondary"
//               sx={{ fontSize: 11 }}
//             >
//               #{item?.id ?? "-"}
//             </Typography>

//             <Chip
//               size="small"
//               label={item?.wf_status || "New"}
//               color={statusChipColor(item?.wf_status)}
//               variant="filled"
//               sx={{
//                 height: 20,
//                 fontSize: 11,
//               }}
//             />
//           </Box>

//           <Typography
//             variant="subtitle1"
//             sx={{
//               mb: 0.5,
//               fontWeight: 500,
//               fontSize: 14,
//               lineHeight: 1.25,
//             }}
//           >
//             {item?.workflow_map_name || item?.workflow_name || "Workflow"}
//           </Typography>

//           <Typography
//             variant="body2"
//             color="text.secondary"
//             sx={{
//               mb: 1,
//               fontSize: 12.5,
//               lineHeight: 1.35,
//             }}
//           >
//             Step:{" "}
//             <Box component="span" sx={{ fontWeight: 600 }}>
//               {item?.step_name || "-"}
//             </Box>
//           </Typography>

//           <Divider sx={{ my: 1 }} />

//           <Typography
//             variant="body2"
//             sx={{
//               lineHeight: 1.45,
//               fontSize: 12.5,
//             }}
//           >
//             <b>Date Started:</b> {fmt(item?.date_created)} <br />
//             <b>Date Assigned:</b> {fmt(item?.step_assigned_date)} <br />
//             <b>Due Date:</b> {fmt(item?.step_due_date)} <br />
//             <b>Assigned by:</b> {item?.assigned_by_name || item?.assigned_by || "-"}  <br />
//             <b>Step Performer:</b> {item?.step_performer_name || item?.step_performer_email || item?.step_performer ||"-"}
//           </Typography>
//         </CardContent>
//       </CardActionArea>
//     </Card>
//   );
// }

// const DynamicStepForm = React.forwardRef(function DynamicStepForm(
//   {
//     schema,
//     onSubmit,
//     initial = {},
//     attachmentsAllowed = false,
//     primaryActionLabel = "Send",
//     showPrimaryButton = true,
//     forceReadOnlyColumns = [],
//     extraRequiredColumns = [],
//     getCurrentAction,
//     oneColumn = false,
//     layoutSections = null,
//     canvasModel = null,
//     containerStyle = null,
//     children,
//   },
//   ref
// ) {
//   const fields = Array.isArray(schema?.fields) ? schema.fields : [];
//   const formRef = useRef(null);
//   const [values, setValues] = useState({});
//   const [errors, setErrors] = useState({});
//   const [stagedFiles, setStagedFiles] = useState([]);

//   const normalizeOptions = (raw) => {
//     if (Array.isArray(raw)) return raw;
//     if (typeof raw === "string") {
//       const s = raw.trim();
//       if (!s) return [];
//       if (s.startsWith("[") || s.startsWith("{")) {
//         try {
//           const parsed = JSON.parse(s);
//           return Array.isArray(parsed) ? parsed : [parsed];
//         } catch {
//           return s.split(",").map((o) => o.trim()).filter(Boolean);
//         }
//       }
//       return s.split(",").map((o) => o.trim()).filter(Boolean);
//     }
//     return [];
//   };

//   useEffect(() => {
//     const v = {};
//     fields.forEach((f, idx) => {
//       const key = String(f.column || f.name || `f_${idx}`).trim();
//       const kind = String(f.input_type || f.type || "").toLowerCase();
//       const options = normalizeOptions(f.options || f.options_json || f.optionsJson);
//       if (kind === "checkbox") {
//         const incoming = initial[key];
//         if (options.length) {
//           if (Array.isArray(incoming)) v[key] = incoming;
//           else if (typeof incoming === "string") v[key] = incoming.split(",").map((o) => o.trim()).filter(Boolean);
//           else v[key] = [];
//         } else {
//           v[key] = incoming ?? false;
//         }
//       } else {
//         v[key] = initial[key] ?? "";
//       }
//     });
//     setValues(v);
//     setErrors({});
//   }, [JSON.stringify(initial), JSON.stringify(fields)]);

//   useImperativeHandle(ref, () => ({
//     submit: () => formRef.current?.requestSubmit(),
//   }));

//   const roSet = useMemo(
//     () => new Set((forceReadOnlyColumns || []).map((c) => String(c || "").toLowerCase())),
//     [forceReadOnlyColumns]
//   );
//   const reqSet = useMemo(
//     () => new Set((extraRequiredColumns || []).map((c) => String(c || "").toLowerCase())),
//     [extraRequiredColumns]
//   );

//   const isReadOnly = (f) => {
//     const key = String(f.column || f.name || "").toLowerCase();
//     if (roSet.has(key)) return true;
//     if (f.read_only) return true;
//     if (f.data_entry === false) return true;
//     return false;
//   };

//   const isRequired = (f) => {
//     const key = String(f.column || f.name || "").toLowerCase();
//     const base = !!(f.mandatory ?? f.required) || reqSet.has(key);
//     if (key === "step_comments") {
//       const action = typeof getCurrentAction === "function" ? getCurrentAction() : null;
//       return action === "review" || action === "reject" || action === "return";
//     }
//     return base;
//   };

//   const setVal = (key, val) => setValues((s) => ({ ...s, [key]: val }));

//   const validate = () => {
//     const e = {};
//     fields.forEach((f, idx) => {
//       if (f.visible === false) return;
//       const key = String(f.column || f.name || `f_${idx}`).trim();
//       if (isReadOnly(f)) return;
//       const required = isRequired(f);
//       const kind = String(f.input_type || f.type || "").toLowerCase();
//       const val = values[key];
//       const empty =
//         kind === "checkbox" ? !val : val === "" || val == null;
//       if (required && empty) e[key] = "Required";
//     });
//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e?.preventDefault?.();
//     if (!validate()) return;
//     await onSubmit?.({ values, stagedFiles });
//   };

//   const renderField = (f, idx) => {
//     const key = String(f.column || f.name || `f_${idx}`).trim();
//     const label = f.label || f.caption || f.title || key;
//     const kind = String(f.input_type || f.type || "").toLowerCase();
//     const disabled = isReadOnly(f);
//     const err = errors[key];
//     const options = normalizeOptions(f.options || f.options_json || f.optionsJson);
//     const common = {
//       key,
//       fullWidth: true,
//       size: "small",
//       label,
//       value: values[key] ?? "",
//       disabled,
//       error: !!err,
//       helperText: err || " ",
//       onChange: (e) => setVal(key, e.target.value),
//     };

//     if (kind === "checkbox" && options.length) {
//       const selected = Array.isArray(values[key]) ? values[key] : [];
//       return (
//         <FormControl key={key} fullWidth size="small" error={!!err}>
//           <Typography variant="caption" sx={{ mb: 0.5 }}>{label}</Typography>
//           <Box sx={{ display: "flex", flexDirection: "column" }}>
//             {options.map((opt, i) => {
//               const val = String(opt?.value ?? opt);
//               const checked = selected.includes(val);
//               return (
//                 <FormControlLabel
//                   key={`${key}_chk_${i}`}
//                   control={
//                     <Checkbox
//                       checked={checked}
//                       onChange={(e) => {
//                         const next = e.target.checked
//                           ? [...selected, val]
//                           : selected.filter((v) => v !== val);
//                         setVal(key, next);
//                       }}
//                       disabled={disabled}
//                     />
//                   }
//                   label={opt?.label ?? opt}
//                 />
//               );
//             })}
//           </Box>
//           <Typography variant="caption" color="error">{err || " "}</Typography>
//         </FormControl>
//       );
//     }

//     if (kind === "checkbox") {
//       return (
//         <FormControlLabel
//           key={key}
//           control={
//             <Checkbox
//               checked={!!values[key]}
//               onChange={(e) => setVal(key, e.target.checked)}
//               disabled={disabled}
//             />
//           }
//           label={label}
//         />
//       );
//     }

//     if (kind === "radio" && options.length) {
//       return (
//         <FormControl key={key} fullWidth size="small" error={!!err}>
//           <Typography variant="caption" sx={{ mb: 0.5 }}>{label}</Typography>
//           <RadioGroup
//             value={values[key] ?? ""}
//             onChange={(e) => setVal(key, e.target.value)}
//           >
//             {options.map((opt, i) => (
//               <FormControlLabel
//                 key={`${key}_opt_${i}`}
//                 value={opt?.value ?? opt}
//                 control={<Radio />}
//                 label={opt?.label ?? opt}
//               />
//             ))}
//           </RadioGroup>
//           <Typography variant="caption" color="error">{err || " "}</Typography>
//         </FormControl>
//       );
//     }

//     if (kind === "select" || kind === "dropdownlist") {
//       return (
//         <TextField select {...common}>
//           {options.map((opt, i) => (
//             <MenuItem key={`${key}_${i}`} value={opt?.value ?? opt}>
//               {opt?.label ?? opt}
//             </MenuItem>
//           ))}
//         </TextField>
//       );
//     }

//     if (kind === "textarea") {
//       return <TextField {...common} multiline minRows={3} />;
//     }

//     const type = kind === "date" ? "date" : kind === "number" ? "number" : "text";
//     return <TextField {...common} type={type} InputLabelProps={type === "date" ? { shrink: true } : undefined} />;
//   };

//   const fieldIndex = useMemo(() => {
//     const m = new Map();
//     fields.forEach((f, i) => {
//       const key = String(f.column || f.name || "").trim().toLowerCase();
//       if (key) m.set(key, { field: f, idx: i });
//     });
//     return m;
//   }, [fields]);

//   const renderByKey = (key) => {
//     const norm = String(key || "").trim().toLowerCase();
//     const hit = fieldIndex.get(norm);
//     if (!hit) return null;
//     return renderField(hit.field, hit.idx);
//   };

//   return (
//     <Box component="form" ref={formRef} onSubmit={handleSubmit} sx={containerStyle || {}}>
//       {Array.isArray(layoutSections) &&
//       layoutSections.length &&
//       layoutSections.some((sec) =>
//         (sec.columns || []).some((col) => (col.fields || []).length)
//       ) ? (
//         layoutSections.map((section, sIdx) => {
//           const cols = Array.isArray(section.columns) ? section.columns : [];
//           return (
//             <Box key={`sec_${sIdx}`} sx={{ mb: 2 }}>
//               <Grid container spacing={2}>
//                 {cols.map((col, cIdx) => {
//                   const span = Number(col?.span || 1);
//                   const mdSpan = Math.min(Math.max(span, 1), 4) * 3;
//                   return (
//                     <Grid key={`col_${sIdx}_${cIdx}`} item xs={12} md={mdSpan}>
//                       {(col.fields || []).map((fRef, fIdx) => {
//                         const key = fRef?.field || fRef?.column || fRef?.name;
//                         const meta = fRef?.fieldMeta || fieldIndex.get(String(key || "").trim().toLowerCase())?.field;
//                         const idx = fieldIndex.get(String(key || "").trim().toLowerCase())?.idx ?? fIdx;
//                         if (!meta) return null;
//                         return (
//                           <Box key={`fld_${sIdx}_${cIdx}_${fIdx}`} sx={{ mb: 2 }}>
//                             {renderField(meta, idx)}
//                           </Box>
//                         );
//                       })}
//                     </Grid>
//                   );
//                 })}
//               </Grid>
//             </Box>
//           );
//         })
//       ) : (
//         <Grid container spacing={2}>
//           {fields.filter((f) => f?.visible !== false).map((f, idx) => (
//             <Grid key={String(f.column || f.name || idx)} item xs={12} md={oneColumn ? 12 : 6}>
//               {renderField(f, idx)}
//             </Grid>
//           ))}
//         </Grid>
//       )}

//       {attachmentsAllowed && (
//         <Box sx={{ mt: 1 }}>
//           <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
//             Attachments
//           </Typography>
//           <Button component="label" variant="outlined" size="small">
//             Choose files
//             <input
//               hidden
//               type="file"
//               multiple
//               onChange={(e) => {
//                 const files = Array.from(e.target.files || []);
//                 setStagedFiles((prev) => [...prev, ...files]);
//                 e.target.value = "";
//               }}
//             />
//           </Button>
//           {!!stagedFiles.length && (
//             <Typography variant="caption" sx={{ ml: 1 }}>
//               {stagedFiles.length} file(s) selected
//             </Typography>
//           )}
//         </Box>
//       )}
//       {children && <Box sx={{ mt: 1 }}>{children}</Box>}
//       {showPrimaryButton && (
//         <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
//           <Button variant="contained" type="submit">
//             {primaryActionLabel}
//           </Button>
//         </Box>
//       )}
//     </Box>
//   );
// });













// /* ------------------------- Workflow Picker (Dialog) ------------------------ */
// function WorkflowPickerDialog({ open, onClose, onPick }) {
//   const [loading, setLoading] = useState(false);
//   const [workflows, setWorkflows] = useState([]);
//   const [q, setQ] = useState("");

//   useEffect(() => {
//     if (!open) return;
//     (async () => {
//       setLoading(true);
//       try {
//         // Header list (only published workflows)
//         const r = await api.get("/simple_workflowbuilder", { params: { published: true } });
//         const arr = Array.isArray(r.data) ? r.data : [];
//         setWorkflows(arr);
//       } catch (e) {
//         console.error("[picker] list failed", e);
//         setWorkflows([]);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [open]);

//   const filtered = useMemo(() => {
//     const s = q.trim().toLowerCase();
//     if (!s) return workflows;
//     return workflows.filter((w) =>
//       String(w.workflow_map_name || w.workflow_name || "")
//         .toLowerCase()
//         .includes(s)
//     );
//   }, [q, workflows]);

//   return (
//     <>
//     <Dialog
//       open={open}
//       onClose={onClose}
//       fullWidth
//       maxWidth="sm"                 //  narrower = more portrait feel
//       PaperProps={{
//         sx: {
//           borderRadius: 3,
//           maxHeight: "80vh",
//         },
//       }}
//     >
//       <DialogTitle
//         sx={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           pr: 1,
//         }}
//       >
//         <Typography
//           variant="subtitle1"
//           component="div"
//           sx={{ fontWeight: 600, letterSpacing: 0.3 }}
//         >
//           Select a Workflow
//         </Typography>
//         <IconButton onClick={onClose} size="small">
//           <CloseIcon />
//         </IconButton>
//       </DialogTitle>

//       <DialogContent dividers>
//         {/* Search */}
//         <Box mb={2}>
//           <TextField
//             fullWidth
//             size="small"
//             value={q}
//             onChange={(e) => setQ(e.target.value)}
//             placeholder="Search workflows"
//             sx={{
//               "& .MuiOutlinedInput-root": {
//                 borderRadius: 2,
//               },
//             }}
//             InputProps={{
//               startAdornment: (
//                 <InputAdornment position="start">
//                   <SearchIcon fontSize="small" />
//                 </InputAdornment>
//               ),
//             }}
//           />
//         </Box>

//         {/* Grid of square cards */}
//         <Grid container spacing={2}>
//           {loading ? (
//             <Grid item xs={12}>
//               <Typography variant="body2">Loading workflows</Typography>
//             </Grid>
//           ) : filtered.length === 0 ? (
//             <Grid item xs={12}>
//               <Typography variant="body2">No workflows found.</Typography>
//             </Grid>
//           ) : (
//             filtered.map((w) => (
//               <Grid key={w.id} item xs={6} sm={4}>
//                 <Card
//                   sx={{
//                     ...cardSx,
//                     borderRadius: 2,
//                     aspectRatio: "1 / 1",       //  square card
//                     display: "flex",
//                   }}
//                 >
//                   <CardActionArea
//                     onClick={() => onPick?.(w)}
//                     sx={{
//                       display: "flex",
//                       alignItems: "stretch",
//                     }}
//                   >
//                     <Box
//                       sx={{
//                         p: 1.5,
//                         display: "flex",
//                         flexDirection: "column",
//                         alignItems: "center",
//                         justifyContent: "center",
//                         width: "100%",
//                         textAlign: "center",
//                       }}
//                     >
//                       {/* Workflow icon */}
//                       <AccountTreeIcon
//                         sx={{ fontSize: 32, mb: 1, opacity: 0.75 }}
//                       />

//                       {/* Only workflow name, smaller text */}
//                       <Typography
//                         variant="subtitle2"
//                         sx={{
//                           fontSize: 13,
//                           fontWeight: 600,
//                           lineHeight: 1.25,
//                           wordBreak: "break-word",
//                         }}
//                       >
//                         {w.workflow_map_name ||
//                           w.workflow_name ||
//                           `Workflow #${w.id}`}
//                       </Typography>
//                     </Box>
//                   </CardActionArea>
//                 </Card>
//               </Grid>
//             ))
//           )}
//         </Grid>
//       </DialogContent>
//     </Dialog>
//     </>
//   );
// }

// /* ------------------------- Initiate Form (Dialog) -------------------------- */

// function InitiateFormDialog({ open, onClose, workflow }) {
//   const [loading, setLoading] = useState(false);
//   const [stepCfg, setStepCfg] = useState(null); // step 1 config (initiate)
//   const [saving, setSaving] = useState(false);
//   const [header, setHeader] = useState(null);
//   const [viewLayout, setViewLayout] = useState(null);
//   const [canvasLayout, setCanvasLayout] = useState(null);
//   const [viewInfo, setViewInfo] = useState(null); // {id,key,view_name,isDefault,when}
  

//   useEffect(() => {
//   if (!open || !workflow?.id) return;
//   (async () => {
//     setLoading(true);
//     try {
//       // canonical INIT endpoint
//       const r = await api.get(`/simple_workflowbuilder/steps/init/${workflow.id}`);
//       // r.data = { header, step }
//       setStepCfg(r.data?.step || null);

     
//       // keep header (gives us workflow_table_name)
//       setHeader(r.data?.header || null);
//       // fetch saved view layout for INITIATE step (if any)
//       const wid = r.data?.header?.id || r.data?.header?.workflow_map_id || workflow.id;
//       const sid = Number(r.data?.step?.step_no);
//       if (wid != null && Number.isFinite(sid)) {
//         try {
//           const { data: vdata } = await api.get("/simple_workflowbuilder_formviews", {
//             params: { workflow_map_id: wid, step_no: sid },
//           });
//           const list = Array.isArray(vdata?.views) ? vdata.views : Array.isArray(vdata) ? vdata : [];
//           const chosen = list.find((v) => v.is_default) || list.sort((a,b)=> new Date(b.date_modified||b.date_created||0)-new Date(a.date_modified||a.date_created||0))[0];
//           const ld = chosen?.layout_def || null;
//           setViewLayout(ld);
//           setCanvasLayout(ld && ld.kind === 'canvas_v1' ? ld : null);
//           setViewInfo(
//             chosen
//               ? {
//                   id: chosen.id,
//                   key: chosen.view_key,
//                   view_name: chosen.view_name,
//                   isDefault: !!chosen.is_default,
//                   when: chosen.date_modified || chosen.date_created,
//                 }
//               : null
//           );
//         } catch (_) {
//           setViewLayout(null);
//           setCanvasLayout(null);
//           setViewInfo(null);
//         }
//       }
//     } catch (e) {
//       console.error("[initiate] fetch step-1 failed", e);
//       setStepCfg(null);
//     } finally {
//       setLoading(false);
//     }
//   })();
// }, [open, workflow?.id]);


// const rawCfg = stepCfg?.step_form_configuration;
// const baseSchema = typeof rawCfg === 'string' ? safeParseJSON(rawCfg) : rawCfg;

// // order fields by saved view layout if present
// const schema = (() => {
//   const fields = Array.isArray(baseSchema?.fields) ? baseSchema.fields : [];
//   if (!fields.length || !viewLayout) return baseSchema;
//   try {
//     const mats = materializeLayout(viewLayout, fields);
//     if (!Array.isArray(mats)) return baseSchema;
//     const byCol = new Map(fields.map(f => [String(f.column||"").trim(), f]));
//     const ordered = [];
//     mats.forEach(sec => (sec.columns||[]).forEach(col => (col.fields||[]).forEach(f => {
//       const k = String(f.field||"").trim();
//       const meta = byCol.get(k);
//       if (meta && meta.visible !== false) {
//         ordered.push(meta);
//         byCol.delete(k);
//       }
//     })));
//     // append any remaining visible fields not placed in layout
//     byCol.forEach((meta) => { if (meta?.visible !== false) ordered.push(meta); });
//     return { ...(baseSchema||{}), fields: ordered };
//   } catch {
//     return baseSchema;
//   }
// })();

// // derive a simple column hint from layout
// const oneColumnFromLayout = React.useMemo(() => {
//   const l = viewLayout;
//   if (!l || !Array.isArray(l.sections)) return false;
//   let maxCols = 0;
//   for (const sec of l.sections) {
//     const cols = Array.isArray(sec.columns) ? sec.columns : [];
//     const used = cols.filter(c => Array.isArray(c.fields) && c.fields.length > 0).length;
//     if (used > maxCols) maxCols = used;
//   }
//   return maxCols <= 1;
// }, [viewLayout]);

// // materialized sections for rendering per saved view
// const initLayoutSections = React.useMemo(() => {
//   const fields2 = Array.isArray(schema?.fields) ? schema.fields : [];
//   return viewLayout ? materializeLayout(viewLayout, fields2) : null;
// }, [viewLayout, JSON.stringify(schema?.fields)]);



//   // Called to create the workflow instance (simple_workflow_instances)
// async function handleSend({ step_performer, audit_trail, step_comments, form_values }) {
//   const payload = {
//     workflow_id: workflow.id,               // definition id (simple_workflowbuilder.id)
//     step_name: "INITIATE",
//     wf_status: "Open",
//     step_performer: step_performer ?? null,    
//     audit_trail: audit_trail ?? [],
//     step_comments: step_comments ?? null,
//     form_values: form_values ?? {},         // BE may ignore; safe to send
//   };

//   const { data } = await api.post("/simple_workflow_instances", payload);
//   console.log("[initiate] instance created", data);
//   const ms = data?.mail_status;
//   console.log("[initiate] mail_status", ms);
//   if (ms) {
//     const msg = ms.sent
//       ? "Form submitted and mail notification sent to recipients."
//       : `Form submitted. Mail not sent${ms.reason ? ": " + ms.reason : ""}`;
//     alert(msg);
//   } else {
//     alert("Form submitted successfully. (No mail status returned)");
//   }
//   return data;                              //  this has .id (instance id)
// }



// // Robust saver: tries common endpoints + payload shapes.
// // Place inside InitiateFormDialog (top-level), above DynamicStepForm.
// async function saveRowToTable(table, values) {
//   const t = encodeURIComponent(table);

//   const { data } = await api.post(`/table/rows/${t}`, values);
//   if (data) return data; // expect { id, ... } or similar
//   throw new Error(`No response data from /table/rows/${table}`);
// }


// // INITIATE: attachments strictly from simple_workflowbuilder_steps.attachments_allowed
// const attachmentsAllowedFlag = React.useMemo(() => {
//   const allowed = !!stepCfg?.attachment_access?.can_upload;
//   console.log(
//     "[INITIATE] attachment_access:",
//     stepCfg?.attachment_access,
//     "=> upload?",
//     allowed
//   );
//   return allowed;
// }, [stepCfg?.attachment_access]);



// // optional debug  keep for a bit
// console.log(
//   "[INITIATE] attachments_allowed raw:",
//   stepCfg?.attachments_allowed,
//   "=> upload?",
//   attachmentsAllowedFlag
// );



//   const sendLabel =
//     stepCfg?.approve_button_name ||
//     "Send";



//   return (
//     <Dialog
//       open={open}
//       onClose={() => onClose?.(false)}
//       maxWidth="md"
//       fullWidth
//       PaperProps={{ sx: { width: "100%", maxWidth: 950 } }}
//     >
//       <DialogTitle sx={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
//   Start: {workflow?.workflow_map_name || workflow?.workflow_name || `Workflow #${workflow?.id || ""}`}
//   <IconButton onClick={() => onClose?.(false)} size="small"><CloseIcon /></IconButton>
// </DialogTitle>
// {schema?.title && <Typography variant="h6" sx={{ px:3, mt:-1, mb:1 }}>{schema.title}</Typography>}


      
//       <DialogContent dividers>
//         <Box
//           sx={{
//             fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif',
//             "& .MuiCheckbox-root, & .MuiRadio-root": {
//               transform: "scale(0.85)",
//               padding: 0.25,
//             },
//             "& .MuiFormControlLabel-label": {
//               fontSize: "0.92rem",
//             },
//           }}
//         >
//         {loading ? (
//           <Typography variant="body2">Loading form</Typography>
// ) : !stepCfg ? (
//   <Typography variant="body2" color="error">
//     Couldnt load initiate step configuration.
//   </Typography>
//         ) : (
//           <Box>
//             {viewInfo && (
//               <Typography
//                 variant="caption"
//                 sx={{ mb: 1, display: "block", color: "text.secondary" }}
//                 data-testid="active-init-view"
//               >
//                 Using view: {viewInfo.view_name || viewInfo.key}
//                 {viewInfo.isDefault ? " (default)" : ""}
//               </Typography>
//             )}
    
    

// <DynamicStepForm
//   schema={schema}
//   attachmentsAllowed={attachmentsAllowedFlag}
//   oneColumn={oneColumnFromLayout}
//   canvasModel={canvasLayout}
//   layoutSections={initLayoutSections}
//   containerStyle={viewLayout?.container_style}
  
//   primaryActionLabel={sendLabel}
//   showPrimaryButton={true}
//   onSubmit={async ({ values: formValues, stagedFiles }) => {
//     setSaving(true);
//     try {
//       const table =
//         header?.workflow_table_name || workflow?.workflow_table_name;
//       if (!table) throw new Error("Missing workflow_table_name in header");

//       const normalizedFormValues = {};
//       Object.entries(formValues || {}).forEach(([col, val]) => {
//         let v = val;
//         if (Array.isArray(v)) v = v.length ? v.join(",") : null;
//         if (v === "") v = null;
//         normalizedFormValues[col] = v;
//       });

//       const saved = await saveRowToTable(table, normalizedFormValues);
//       if (!saved?.id) {
//         throw new Error("Row insert did not return an id");
//       }

//       const stepCommentsField = Array.isArray(schema?.fields)
//         ? schema.fields.find(
//             (f) =>
//               String(f.column || "").toLowerCase() === "step_comments"
//           )
//         : null;

//       const stepCommentsCol = stepCommentsField
//         ? String(stepCommentsField.column || "").trim()
//         : null;

//       const stepCommentsVal = stepCommentsCol
//         ? formValues[stepCommentsCol] ?? null
//         : null;

//       const instance = await handleSend({
//         step_performer: stepCfg?.step_performer ?? null,
//         audit_trail: [
//           { at: new Date().toISOString(), event: "created", by: "ui" },
//           {
//             at: new Date().toISOString(),
//             event: "saved_row",
//             table,
//             row_id: saved.id,
//           },
//           {
//             at: new Date().toISOString(),
//             event: "form_values",
//             values: formValues,
//           },
//         ],
//         form_values: formValues,
//         step_comments: stepCommentsVal,
//       });

//       const instanceId = instance?.id;
//       if (!instanceId) {
//         throw new Error(
//           "Instance id missing from /simple_workflow_instances response"
//         );
//       }
//       if (instance?.mail_status) {
//         const ms = instance.mail_status;
//         const msg = ms.sent
//           ? "Form submitted and mail notification sent to recipients."
//           : `Form submitted. Mail not sent${ms.reason ? ": " + ms.reason : ""}`;
//         alert(msg);
//       }

//       await api.put(`/tables/data/${table}/${saved.id}`, {
//         changes: { workflow_id: String(instanceId) },
//       });

//       // Upload initiate attachments (anchor to instance)
//       if (Array.isArray(stagedFiles) && stagedFiles.length) {
//         for (const f of stagedFiles) {
//           const form = new FormData();
//           form.append("file", f);
//           form.append("ref_table", "simple_workflow_instances");
//           form.append("ref_table_id", String(instanceId));
//           form.append("workflow_id", String(instanceId));
//           form.append("instance_id", String(instanceId));
//           await api.post("/upload", form, {
//             headers: { "Content-Type": "multipart/form-data" },
//           });
//         }
//       }

//       onClose?.(true);
//     } catch (e) {
//       console.error("initiate submit failed", e);
//       alert(e?.response?.data?.error || e.message || "Submit failed");
//     } finally {
//       setSaving(false);
//     }
//   }}
// />









//   </Box>
//         )}
//         </Box>
//       </DialogContent>

//       {/* Submission backdrop for initiate */}
//       <Backdrop
//         open={saving}
//         sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: "#fff" }}
//       >
//         <Box textAlign="center">
//           <CircularProgress color="inherit" />
//           <Typography variant="body2" sx={{ mt: 2 }}>
//             Submitting, please wait...
//           </Typography>
//         </Box>
//       </Backdrop>
//     </Dialog>
//   );
// }

// /* ------------------------------ Main Page ---------------------------------- */

// function InstanceExecuteDialog({ open, instance, onClose, isOutbox }) {
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [stepCfg, setStepCfg] = useState(null);
//   const [schema, setSchema] = useState(null);
//   const [execViewLayout, setExecViewLayout] = useState(null);
//   const [execCanvasLayout, setExecCanvasLayout] = useState(null);
//   const [execViewInfo, setExecViewInfo] = useState(null); // {id,key,view_name,isDefault,when}
//   const execOneCol = React.useMemo(() => {
//     const l = execViewLayout;
//     if (!l || !Array.isArray(l.sections)) return false;
//     let maxCols = 0;
//     for (const sec of l.sections) {
//       const cols = Array.isArray(sec.columns) ? sec.columns : [];
//       const used = cols.filter((c) => Array.isArray(c.fields) && c.fields.length > 0).length;
//       if (used > maxCols) maxCols = used;
//     }
//     return maxCols <= 1;
//   }, [execViewLayout]);
//   const [initialValues, setInitialValues] = useState({});
//   const [attachments, setAttachments] = useState([]);

//   // NEW: store full instance + routeinfo + business row id
//   const [instanceDetail, setInstanceDetail] = useState(null);
//   const [routeinfo, setRouteinfo] = useState([]);
//   const [businessRowId, setBusinessRowId] = useState(null);

//   const [isReviewMode, setIsReviewMode] = useState(false); 
//   const [auditOpen, setAuditOpen] = useState(false);
//   const [commentsOpen, setCommentsOpen] = useState(false);

//   // REVIEW: users + selected reviewer
//   const [users, setUsers] = useState([]);
//   const [reviewUserId, setReviewUserId] = useState("");

//   const formRef = useRef(null);
//   const actionRef = useRef("approve");


//    // ---- attachment helpers (KEEP THEM HERE) -------------------------------
//   const getAttachmentUrl = (f) => {
//     return (
//       f?.download_url ||
//       f?.file_url ||
//       f?.url ||
//       f?.public_url ||
//       f?.path ||
//       null
//     );
//   };

//   const openAttachment = (f) => {
//     const url = getAttachmentUrl(f);
//     if (!url) return alert("File URL not available.");
//     window.open(url, "_blank", "noopener,noreferrer");
//   };

//   const downloadAttachment = (f) => {
//     const url = getAttachmentUrl(f);
//     if (!url) return alert("Download URL not available.");
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = f?.original_filename || "download";
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//   };

//     // --- Derived "next step" info for display (UI preview only) -------------
//   const routeArr = Array.isArray(routeinfo) ? routeinfo : [];
//   const currentStepIdForDisplay = instanceDetail
//     ? Number(instanceDetail.step_no) || 0
//     : 0;

//   const nextApproveStepId =
//     currentStepIdForDisplay > 0 ? currentStepIdForDisplay + 1 : null;

//   const nextApproveCfg = nextApproveStepId
//     ? routeArr.find(
//         (s) =>
//           Number(s.step_no) === nextApproveStepId ||
//           Number(s.step_no) === nextApproveStepId
//       )
//     : null;

//   const nextRejectStepId =
//     nextApproveCfg &&
//     typeof nextApproveCfg.next_step_after_reject !== "undefined"
//       ? Number(nextApproveCfg.next_step_after_reject)
//       : null;

//   const nextRejectCfg = nextRejectStepId
//     ? routeArr.find(
//         (s) =>
//           Number(s.step_no) === nextRejectStepId ||
//           Number(s.step_no) === nextRejectStepId
//       )
//     : null;

//   const formatStepLabel = (stepId, cfg) => {
//     if (!stepId) return "";
//     const nm = cfg?.step_name;
//     return nm ? `${stepId}  ${nm}` : String(stepId);
//   };

//   const nextApproveLabel = formatStepLabel(nextApproveStepId, nextApproveCfg);
//   const nextRejectLabel = formatStepLabel(nextRejectStepId, nextRejectCfg);

//   const renderPerformerLabel = (cfg) => {
//     const pid = Number(cfg?.step_performer);
//     if (!Number.isFinite(pid) || pid <= 0) return "Not configured";
//     const u =
//       users.find((x) => Number(x.id) === pid) || {};
//     const name =
//       u.full_name ||
//       u.name ||
//       `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
//       u.username ||
//       u.email;
//     return name ? `${name} (${pid})` : String(pid);
//   };


//   useEffect(() => {
//     if (!open || !instance?.id) return;

//     (async () => {
//       setLoading(true);
//       try {
//         // 1) Fresh instance (ensures routeinfo + workflow_table_name are present)
//         const { data: inst } = await api.get(
//           `/simple_workflow_instances/${instance.id}`
//         );
//         setInstanceDetail(inst);

//         //  NEW: detect review step from wf_status
//         const wfStatus = String(inst.wf_status || "").toLowerCase();
//         setIsReviewMode(wfStatus.endsWith("_review"));

//         const route = Array.isArray(inst.routeinfo) ? inst.routeinfo : [];
//         setRouteinfo(route);

// const stepNo = Number(inst.step_no);  //  use step_no from instance

// const cfg =
//   route.find((s) => Number(s.step_no) === stepNo) ||
//   route[0] ||
//   null;

// setStepCfg(cfg || null);

// // fetch saved view for this step
// try {
//   const wid = inst.workflow_id || inst.workflow_map_id || instance?.workflow_id;
//   const sid = Number(cfg?.step_no);
//   if (wid != null && Number.isFinite(sid)) {
//     const { data: vdata } = await api.get("/simple_workflowbuilder_formviews", { params: { workflow_map_id: wid, step_no: sid } });
//     const list = Array.isArray(vdata?.views) ? vdata.views : Array.isArray(vdata) ? vdata : [];
//     const chosen = list.find((v)=>v.is_default) || list.sort((a,b)=> new Date(b.date_modified||b.date_created||0)-new Date(a.date_modified||a.date_created||0))[0];
//     setExecViewLayout(chosen?.layout_def || null);
//     setExecCanvasLayout(chosen?.layout_def?.kind == 'canvas_v1' ? chosen.layout_def : null);
//     setExecViewInfo(
//       chosen
//         ? {
//             id: chosen.id,
//             key: chosen.view_key,
//             view_name: chosen.view_name,
//             isDefault: !!chosen.is_default,
//             when: chosen.date_modified || chosen.date_created,
//           }
//         : null
//     );
//   } else {
//     setExecViewLayout(null);
//     setExecViewInfo(null);
//   }
// } catch (_) {
//   setExecViewLayout(null);
//   setExecViewInfo(null);
// }

// // --- schema derivation ---
// // 1) INITIATE step config (this is the master for input_type)
// const initStep = route.find(
//   (s) => String(s.step_name || "").toUpperCase() === "INITIATE"
// );

// let initSchema = null;
// if (initStep?.step_form_configuration) {
//   const rawInit = initStep.step_form_configuration;
//   initSchema =
//     typeof rawInit === "string" ? safeParseJSON(rawInit) : rawInit;
// }

// // 2) current step config (visibility/read-only/etc)
// let currentSchema = null;
// if (cfg?.step_form_configuration) {
//   const rawCur = cfg.step_form_configuration;
//   currentSchema =
//     typeof rawCur === "string" ? safeParseJSON(rawCur) : rawCur;
// }

// // 3) decide final schema:
// //   - for INITIATE itself: just use its own schema
// //   - for other steps: use field list from current step,
// //     but inject input_type/data_type from INITIATE schema by column
// const isTerminateCfg =
//   String(cfg?.step_name || "").toUpperCase() === "TERMINATE";

// const curFields = Array.isArray(currentSchema?.fields) ? currentSchema.fields : [];
// const initFields = Array.isArray(initSchema?.fields) ? initSchema.fields : [];

// if (!curFields.length && initFields.length) {
//   currentSchema = initSchema;
// }

// let finalSchema = currentSchema || initSchema || { fields: [] };

// const isInitiate =
//   String(cfg?.step_name || "").toUpperCase() === "INITIATE";

// if (!isInitiate && initSchema && currentSchema) {
//   const baseFields = Array.isArray(initSchema.fields)
//     ? initSchema.fields
//     : [];
//   const curFields = Array.isArray(currentSchema.fields)
//     ? currentSchema.fields
//     : [];

//   const baseByCol = new Map(
//     baseFields.map((f) => [
//       String(f.column || f.name || "").toLowerCase(),
//       f,
//     ])
//   );

//   const mergedFields = curFields.map((f) => {
//     const colKey = String(f.column || f.name || "").toLowerCase();
//     const base = baseByCol.get(colKey);

//     if (!base) return f;



//       // --- Derived "next step" info for display (UI preview only) -------------
//   const routeArr = Array.isArray(routeinfo) ? routeinfo : [];

//   const currentStepIdForDisplay = instanceDetail
//   ? Number(instanceDetail.step_no) || 0
//   : 0;

//   // route row for the *current* step
//   const currentCfg =
//     routeArr.find((s) => Number(s.step_no) === currentStepIdForDisplay) || null;

//   const nextApproveStepId =
//     currentCfg &&
//     currentCfg.next_step_after_approve !== undefined &&
//     currentCfg.next_step_after_approve !== null &&
//     currentCfg.next_step_after_approve !== ""
//       ? Number(currentCfg.next_step_after_approve)
//       : null;

//   const nextApproveCfg = nextApproveStepId
//     ? routeArr.find((s) => Number(s.step_no) === nextApproveStepId)
//     : null;

//   // Reject: use next_step_after_reject on the *current* route row
//   const nextRejectStepId =
//     currentCfg &&
//     typeof currentCfg.next_step_after_reject !== "undefined"
//       ? Number(currentCfg.next_step_after_reject)
//       : null;

//   const nextRejectCfg = nextRejectStepId
//     ? routeArr.find((s) => Number(s.step_no) === nextRejectStepId)
//     : null;

//   const formatStepLabel = (stepId, cfg) => {
//     if (!stepId) return "";
//     const nm = cfg?.step_name;
//     return nm ? `${stepId}  ${nm}` : String(stepId);
//   };

//   const nextApproveLabel = formatStepLabel(nextApproveStepId, nextApproveCfg);
//   const nextRejectLabel = formatStepLabel(nextRejectStepId, nextRejectCfg);






  

//     // copy input_type / data_type from INITIATE into this step
//     return {
//       ...base,
//       ...f,
//       input_type: base.input_type ?? f.input_type,
//       data_type: base.data_type ?? f.data_type,
//     };
//   });

//   finalSchema = {
//     ...initSchema,
//     ...currentSchema,
//     fields: mergedFields,
//   };
// }

// if (isTerminateCfg && initFields.length) {
//   finalSchema = {
//     ...initSchema,
//     ...finalSchema,
//     fields: initFields.map((f) => ({ ...f, visible: true })),
//   };
// }

// setSchema(finalSchema || { fields: [] });


//         // 2) Business row from custwf_* table (by workflow_id = instance.id)
// let refTable = inst.workflow_table_name || null;
// let refTableId = null;

// if (refTable) {
//   try {
//     const { data: row } = await api.get(
//       `/tables/dataByWorkflow/${refTable}/${inst.id}`
//     );

//     const base = row || {};

//     //  merge in instance-level fields (audit_trail + step_comments)
//     const merged = {
//       ...base,
//       audit_trail: inst.audit_trail ?? base.audit_trail ?? null,
//       step_comments: "",
//     };

//     setInitialValues(merged);
//     refTableId = base?.id ?? null;
//     setBusinessRowId(refTableId);
//   } catch (e) {
//     console.error("[instance] load business row failed", e);

//     setInitialValues({
//       audit_trail: inst.audit_trail ?? null,
//       step_comments: "",
//     });

//     refTableId = null;
//     setBusinessRowId(null);
//   }
// } else {
//   setInitialValues({
//     audit_trail: inst.audit_trail ?? null,
//     step_comments: inst.step_comments ?? "",
//   });
//   refTableId = null;
//   setBusinessRowId(null);
// }

// // 3) Attachments for this instance
// // For SIMPLE WORKFLOW we now always query using:
// //   approval_id   = instance.id            (path param)
// //   ref_table     = simple_workflow_instances
// //   ref_table_id  = instance.id
// try {
//   const { data: files } = await api.get(
//     `/approval_files/by-instance/${inst.id}`,
//     {
//       params: {
//         ref_table: "simple_workflow_instances",
//         ref_table_id: inst.id,
//       },
//     }
//   );

//   setAttachments(Array.isArray(files) ? files : []);
// } catch (e) {
//   console.error("[instance] load attachments failed", e);
//   setAttachments([]);
// }


//       } catch (e) {
//         console.error("[instance] detail load failed", e);
//       } finally {
//         setLoading(false);
//       } 
//     })();
//   }, [open, instance?.id]);

//   // Load users when review is allowed
//   useEffect(() => {
//     if (!open) return;
//     if (!stepCfg?.review_allowed) return;

//     (async () => {
//       try {
//         const { data } = await api.get("/users"); // adjust path if different
//         setUsers(Array.isArray(data) ? data : []);
//       } catch (e) {
//         console.error("[instance] load users failed", e);
//         setUsers([]);
//       }
//     })();
//   }, [open, stepCfg?.review_allowed]);

//   const uiActions = stepCfg?.ui_actions || null;
//   const approveLabel = uiActions?.primary_label ?? "";
//   const rejectLabel = uiActions?.reject_label ?? "";

// const canViewAttachments = !!stepCfg?.attachment_access?.can_view;
// const canUploadAttachmentsFlag = !!stepCfg?.attachment_access?.can_upload;
// const isTerminateStep = String(stepCfg?.step_name || "").toUpperCase() === "TERMINATE";

//   const auditTrailEntries = normalizeAuditTrail(instanceDetail?.audit_trail);
//   const commentEntries = auditTrailEntries.filter((entry) => {
//     const raw = entry?.step_comments;
//     return typeof raw === "string" ? raw.trim().length > 0 : raw != null;
//   });

//   const formatUserLabel = (id) => {
//     if (id == null) return "-";
//     const n = Number(id);
//     const u = Array.isArray(users) ? users.find((usr) => Number(usr.id) === n) : null;
//     return (
//       u?.full_name ||
//       u?.name ||
//       `${u?.first_name || ""} ${u?.last_name || ""}`.trim() ||
//       u?.username ||
//       u?.email ||
//       `User ${n}`
//     );
//   };

//   const routeinfoArr = (() => {
//     const raw = instanceDetail?.routeinfo;
//     if (Array.isArray(raw)) return raw;
//     if (typeof raw === "string") {
//       try {
//         const parsed = JSON.parse(raw);
//         return Array.isArray(parsed) ? parsed : [];
//       } catch {
//         return [];
//       }
//     }
//     return [];
//   })();

//   const routeinfoByStep = new Map(
//     routeinfoArr
//       .map((r) => ({
//         step_no: Number(r?.step_no),
//         step_name: r?.step_name,
//         step_type: r?.step_type,
//       }))
//       .filter((r) => Number.isFinite(r.step_no))
//       .map((r) => [r.step_no, r])
//   );

//   const extractAttachments = (data) => {
//     if (!data || typeof data !== "object") return [];
//     const candidates = ["attachments", "_attachments"];
//     for (const key of candidates) {
//       if (Array.isArray(data[key])) return data[key];
//     }
//     return [];
//   };

//   const groupedAudit = (() => {
//     const entries = auditTrailEntries
//       .map((entry, idx) => {
//         const stepNo =
//           entry?.to_step_no ?? entry?.from_step_no ?? entry?.step_no ?? null;
//         const stepInfo = Number.isFinite(Number(stepNo))
//           ? routeinfoByStep.get(Number(stepNo))
//           : null;
//         return {
//           entry,
//           idx,
//           stepNo: Number.isFinite(Number(stepNo)) ? Number(stepNo) : null,
//           stepName: stepInfo?.step_name || entry?.step_name || "-",
//           stepType: stepInfo?.step_type || "-",
//         };
//       })
//       .sort((a, b) => {
//         const snA = a.stepNo ?? -1;
//         const snB = b.stepNo ?? -1;
//         if (snA !== snB) return snB - snA;
//         const atA = a.entry?.at ? new Date(a.entry.at).getTime() : 0;
//         const atB = b.entry?.at ? new Date(b.entry.at).getTime() : 0;
//         return atB - atA;
//       });

//     const byStep = new Map();
//     for (const row of entries) {
//       const key = row.stepNo ?? -1;
//       if (!byStep.has(key)) byStep.set(key, { ...row, items: [] });
//       byStep.get(key).items.push(row.entry);
//     }
//     return Array.from(byStep.values());
//   })();

//   const diffFields = (curr, prev) => {
//     const a = curr && typeof curr === "object" ? curr : {};
//     const b = prev && typeof prev === "object" ? prev : {};
//     const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
//     const changed = [];
//     keys.forEach((k) => {
//       const av = a[k];
//       const bv = b[k];
//       if (JSON.stringify(av) !== JSON.stringify(bv)) changed.push(k);
//     });
//     return changed;
//   };

// // optional debug
// console.log(
//   "[EXECUTE] attachment_access:",
//   stepCfg?.attachment_access,
//   "=> view/upload?",
//   canViewAttachments,
//   canUploadAttachmentsFlag
// );



//     const showReview = !!uiActions?.show_review && !isReviewMode;
//     const showReject = !!uiActions?.show_reject;












//  // ---------- core action handler: save business row + update instance ------
// async function handleSubmit(action, { values, stagedFiles }) {
//   if (!instanceDetail) {
//     console.error("Missing instance detail");
//     return;
//   }

//   const inst = instanceDetail;
//   const table = inst.workflow_table_name;
//   const rowId = businessRowId;

//   // 1) Save form fields to custwf_* table (EXCLUDING audit_trail)
//     if (table && rowId != null) {
//     const changes = {};

//     for (const [col, val] of Object.entries(values || {})) {
//       const colLower = String(col || "").toLowerCase();

//       // never send audit_trail to custwf_* tables
//       if (colLower === "audit_trail") continue;

//       let v = val;

//        // flatten multi-selects to a comma-separated string
//     if (Array.isArray(v)) {
//       v = v.length ? v.join(",") : null;
//     }

//       // normalise empty string to null
//       if (v === "") v = null;

//       changes[col] = v;
//     }

//     console.log("TABLE:", table, "ROW:", rowId, "PAYLOAD (changes):", changes);

//     try {
//       await api.put(`/tables/data/${table}/${rowId}`, { changes });
//     } catch (e) {
//       console.error("[instance] save to business table failed", e);
//       console.error("API error data:", e?.response?.data);
//       alert(
//         e?.response?.data?.error ||
//           e?.response?.data?.message ||
//           "Failed to update workflow table row"
//       );
//       return;
//     }
//   }


//   // 2) Build instance changes (step_name, wf_status, step_no, etc.)
//     // 2) Build instance changes (step_name, wf_status, step_no, etc.)
//   const currentStepName = inst.step_name || stepCfg?.step_name || "STEP";

//   // 2a) step_comments from the dynamic form
//   const stepCommentsField = Array.isArray(schema?.fields)
//     ? schema.fields.find(
//         (f) => String(f.column || "").toLowerCase() === "step_comments"
//       )
//     : null;

//   const stepCommentsCol = stepCommentsField
//     ? String(stepCommentsField.column || "").trim()
//     : null;

//   const stepCommentsVal = stepCommentsCol ? values[stepCommentsCol] : null;

//   const instChanges = {};
//   instChanges.action = action;
//   if (stepCommentsCol) {
//     instChanges.step_comments =
//       stepCommentsVal === undefined ? null : stepCommentsVal;
//   }

//   // 2b) Determine NEW step_no based on action
//   const route = Array.isArray(routeinfo) ? routeinfo : [];

//   const currentStepNo = Number(inst.step_no) || 0;
//   const currentCfg =
//     route.find(
//       (s) =>
//         Number(s.step_no) === currentStepNo ||
//         Number(s.step_no) === currentStepNo
//     ) || null;

//   let newStepNo = currentStepNo;

//   let returnReviewRequestor = null;

//   if (action === "approve") {
//     if (
//       !currentCfg ||
//       currentCfg.next_step_after_approve === undefined ||
//       currentCfg.next_step_after_approve === null ||
//       currentCfg.next_step_after_approve === ""
//     ) {
//       alert("Approve routeinfo missing: next_step_after_approve.");
//       return;
//     }
//     newStepNo = Number(currentCfg.next_step_after_approve);
//     if (!Number.isFinite(newStepNo)) {
//       alert("Approve routeinfo invalid: next_step_after_approve.");
//       return;
//     }
//   } else if (action === "reject") {
//     if (
//       !currentCfg ||
//       currentCfg.next_step_after_reject === undefined ||
//       currentCfg.next_step_after_reject === null ||
//       currentCfg.next_step_after_reject === ""
//     ) {
//       alert("Reject routeinfo missing: next_step_after_reject.");
//       return;
//     }
//     newStepNo = Number(currentCfg.next_step_after_reject);
//     if (!Number.isFinite(newStepNo)) {
//       alert("Reject routeinfo invalid: next_step_after_reject.");
//       return;
//     }
//   } // for "review" we stay on same step

//   instChanges.step_no = newStepNo;

//   console.log("[instance] currentStepNo:", currentStepNo);
//   console.log("[instance] action:", action);
//   console.log("[instance] newStepNo:", newStepNo);

//   // 2c) Copy step info for the NEW step
//   const newStepCfg =
//     route.find((s) => Number(s.step_no) === newStepNo) || null;

//   console.log("[instance] new step route row:", newStepCfg);

//   if (!newStepCfg) {
//     alert(`routeinfo not found for step_no ${newStepNo}`);
//     return;
//   }
//   if (newStepCfg.step_name) {
//     instChanges.step_name = newStepCfg.step_name;
//   }
//   if (newStepCfg.step_performer != null) {
//     instChanges.step_performer = newStepCfg.step_performer;
//   }
//   if (newStepCfg.wf_status) {
//     instChanges.wf_status = newStepCfg.wf_status;
//   }

//   // 2d) next_step_after_* must match routeinfo for the target step
//   instChanges.next_step_after_approve =
//     newStepCfg.next_step_after_approve ?? null;
//   instChanges.next_step_after_reject =
//     newStepCfg.next_step_after_reject ?? null;


//   // 2e) action-specific bits: performer, review_requestor, status, etc.
//   const loginUserId =
//     window?.currentUser?.id || window?.authUser?.id || null; // adjust to auth

//     if (loginUserId != null) {
//     instChanges.assigned_by = loginUserId;
//   }

//   // base name without trailing " Review"
//   const baseStepName = String(currentStepName || "")
//     .replace(/\s+review$/i, "")
//     .trim() || currentStepName;

//   if (action === "approve") {
//     // normal approve
//     instChanges.wf_status =
//       instChanges.wf_status || `${baseStepName}_completed`;
//     instChanges.review_requestor = inst.review_requestor ?? null;
//     // If this was a review cycle, return ownership to the requestor
//     if (inst.review_requestor != null) {
//       instChanges.step_performer = inst.review_requestor;
//       if (!newStepCfg?.step_name) instChanges.step_name = baseStepName;
//     }
//   } else if (action === "reject") {
//     // normal reject
//     instChanges.wf_status =
//       instChanges.wf_status || `${baseStepName}_rejected`;
//     instChanges.review_requestor = null;
//   } else if (action === "review") {
//     // SEND FOR REVIEW
//     // wf_status: "Step 1_Review"
//     // step_performer: <selected user>
//     // review_requestor: <login user>
//     // step_name: "Step 1 Review" (space)
//     instChanges.step_performer = reviewUserId
//       ? Number(reviewUserId)
//       : null;
//     instChanges.review_requestor = loginUserId ?? null;
//     instChanges.step_name = `${baseStepName} Review`;
//     instChanges.wf_status = `${baseStepName}_Review`;
//   } else if (action === "return") {
//     // REVIEWER RETURNS TO REQUESTOR
//     // wf_status: "<prev_step_name>_Completed"
//     // step_performer: <review_requestor>
//     // review_requestor: null
//     // step_name: "Step 1"
//     try {
//       const fresh = await api.get(`/simple_workflow_instances/${inst.id}`);
//       const freshInst = fresh?.data || fresh;
//       returnReviewRequestor = freshInst?.review_requestor ?? null;
//     } catch (e) {
//       console.error("[instance] failed to refresh review_requestor", e);
//       alert("Unable to load review_requestor for return action.");
//       return;
//     }
//     if (returnReviewRequestor == null) {
//       alert("Review requestor is missing for return action.");
//       return;
//     }
//     instChanges.step_performer = returnReviewRequestor;
//     instChanges.review_requestor = returnReviewRequestor;
//     instChanges.step_name = baseStepName;
//     // compute previous step (current step_no - 1) from routeinfo
//     const prevStepNo = (Number(currentStepNo) || 0) - 1;
//     const prevCfg =
//       Array.isArray(routeinfo) &&
//       routeinfo.find((r) => Number(r.step_no) === prevStepNo);
//     const prevName = prevCfg?.step_name || baseStepName;
//     instChanges.wf_status = `${baseStepName}_Reviewed`;
//   }




//   /*  2f) Append a new audit_trail entry on the instance */
//   const existingAudit = normalizeAuditTrail(inst.audit_trail);

//   // clone values and drop the audit_trail field itself from what we log
//   const auditData = { ...(values || {}) };
//   for (const k of Object.keys(auditData)) {
//     if (String(k).toLowerCase() === "audit_trail") {
//       delete auditData[k];
//     }
//   }

  

//   const initiatorId   = inst.initiator ?? null;
//   const oldPerformer  = inst.step_performer ?? null;

//   let performerId     = oldPerformer;                    // owner after action
//   let reviewReqId     = null;
//   let byId            = oldPerformer || initiatorId;     // who clicked button

//   if (action === "review") {
//     // current performer sends to reviewer
//     performerId = reviewUserId ? Number(reviewUserId) : null;
//     reviewReqId = oldPerformer || initiatorId || null;
//   } else if (action === "return") {
//     // reviewer returns to original requestor
//     performerId =
//       returnReviewRequestor ?? inst.review_requestor ?? oldPerformer ?? initiatorId ?? null;
//     reviewReqId = returnReviewRequestor ?? null;
//   } else if (action === "approve" && inst.review_requestor != null) {
//     // post-review approve -> back to requestor
//     performerId = inst.review_requestor;
//     reviewReqId = null;
//   }





//   //  Force these into the snapshot we store in audit_trail.data
//   if (initiatorId != null) {
//     auditData.initiator = initiatorId;
//   }
//   if (performerId != null) {
//     auditData.performer = performerId;
//   }
//   if (reviewReqId != null) {
//     auditData.review_requestor = reviewReqId;
//   }


//   //  Effective status for this action
// const effectiveStatus =
//   instChanges.wf_status || inst.wf_status || null;

// // ensure the snapshot contains the real status, not the blank from the form
// if (effectiveStatus != null) {
//   auditData.wf_status = effectiveStatus;
// }



//   const auditEntry = {
//     at: new Date().toISOString(),
//     by: byId ?? null,              // never null; comes from instance cols
//     action,                        // "approve" | "reject" | "review"
//     from_step_no: currentStepNo,
//     to_step_no: newStepNo,
//     step_name: newStepCfg?.step_name || inst.step_name || null,
//     wf_status: effectiveStatus,          //  reuse the same value
//     step_comments: stepCommentsVal ?? null,

//     //  also on the top-level of the entry
//     initiator: initiatorId ?? null,
//     performer: performerId ?? null,
//     review_requestor: reviewReqId ?? null,

//     data: auditData,               // snapshot of current form values
//   };

//   instChanges.audit_trail = [...existingAudit, auditEntry];

// /*  end audit_trail update */








//   // 3) Persist instance changes
//   if (Object.keys(instChanges).length) {
//     try {
//       console.log("[instance] PATCH payload:", instChanges);
//       const patchRes = await api.patch(`/simple_workflow_instances/${inst.id}`, instChanges);
//       const patchPayload = patchRes?.data || patchRes;
//       if (patchPayload?.mail_status) {
//         const ms = patchPayload.mail_status;
//         const msg = ms.sent
//           ? "Form submitted and mail notification sent to recipients."
//           : `Form submitted. Mail not sent${ms.reason ? ": " + ms.reason : ""}`;
//         alert(msg);
//       }
//     } catch (e) {
//       console.error("[instance] instance update failed", e);
//       console.error("API error data:", e?.response?.data);
//       alert(
//         e?.response?.data?.error ||
//           e?.response?.data?.message ||
//           "Failed to update workflow instance"
//       );
//       return;
//     }
//   } else {
//     console.warn("[instance] no instance changes to PATCH");
//   }

  
//   // 4) Upload new attachments
//   // For SIMPLE WORKFLOW module we always anchor attachments
//   // to the instance row itself: simple_workflow_instances + instance.id
//   if (Array.isArray(stagedFiles) && stagedFiles.length) {
//     try {
//       for (const f of stagedFiles) {
//         const form = new FormData();
//         form.append("file", f);

//         //  New: logical owner of the file is the instance header,
//         //     not the custwf_* business table.
//         form.append("ref_table", "simple_workflow_instances");
//         form.append("ref_table_id", String(inst.id));

//         // approval_files.approval_id will be set from this on the server
//         form.append("workflow_id", String(inst.id));

//         // Optional but harmless: makes it explicit that this is an instance id
//         form.append("instance_id", String(inst.id));

//         await api.post("/upload", form, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//       }
//     } catch (e) {
//       console.error("[instance] upload attachments failed", e);
//     }
//   }


//   onClose?.(true); // signal refresh
// }

















//   return (
//     <Dialog
//       open={open}
//       onClose={() => onClose?.(false)}
//       maxWidth="lg"
//       fullWidth
//       PaperProps={{ sx: { width: "75%", maxWidth: 750, height: "100vh" } }}
//     >
//       <DialogTitle
//         sx={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           bgcolor: "#eef6ff",
//           py: 0.75,
//           fontSize: 16,
//           lineHeight: 1.2,
//         }}
//       >
//         <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
//           {instance
//             ? `Instance #${instance.id}  ${
//                 instance.workflow_map_name || instance.workflow_name || ""
//               }`
//             : "Instance"}
//         </Box>
//         <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
//           <IconButton onClick={() => onClose?.(false)} size="small">
//             <CloseIcon />
//           </IconButton>
//         </Box>
//       </DialogTitle>

//       <DialogContent
//         dividers
//         sx={{
//           height: "calc(90vh - 112px)",
//           scrollbarWidth: "none",
//           scrollbarColor: "#cbd5e1 transparent",
//           "&:hover": {
//             scrollbarWidth: "thin",
//           },
//           "&::-webkit-scrollbar": {
//             width: 0,
//             height: 0,
//           },
//           "&:hover::-webkit-scrollbar": {
//             width: 6,
//             height: 6,
//           },
//           "&::-webkit-scrollbar-track": {
//             background: "transparent",
//           },
//           "&::-webkit-scrollbar-thumb": {
//             background: "#cbd5e1",
//             borderRadius: 999,
//           },
//           "&::-webkit-scrollbar-thumb:hover": {
//             background: "#94a3b8",
//           },
//         }}
//       >
//         <Box
//           sx={{
//             fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif',
//             "& .MuiCheckbox-root, & .MuiRadio-root": {
//               transform: "scale(0.85)",
//               padding: 0.25,
//             },
//             "& .MuiFormControlLabel-label": {
//               fontSize: "0.92rem",
//             },
//           }}
//         >
//         {loading || !stepCfg || !schema ? (
//           <Typography variant="body2">
//             {loading
//               ? "Loading"
//               : "Step configuration not found for this instance."}
//           </Typography>
//         ) : (
//           <Box sx={{ display: "flex", gap: 2, alignItems: "stretch" }}>
//             <Box sx={{ flex: 3, minWidth: 0, display: "flex", flexDirection: "column" }}>
//               <Box
//                 sx={{
//                   flex: 1,
//                   minHeight: "100vh",
//                   maxHeight: "100vh",
//                   overflow: "auto",
//                   scrollbarWidth: "none",
//                   scrollbarColor: "#cbd5e1 transparent",
//                   "&:hover": {
//                     scrollbarWidth: "thin",
//                   },
//                   "&::-webkit-scrollbar": {
//                     width: 0,
//                     height: 0,
//                   },
//                   "&:hover::-webkit-scrollbar": {
//                     width: 6,
//                     height: 6,
//                   },
//                   "&::-webkit-scrollbar-track": {
//                     background: "transparent",
//                   },
//                   "&::-webkit-scrollbar-thumb": {
//                     background: "#cbd5e1",
//                     borderRadius: 999,
//                   },
//                   "&::-webkit-scrollbar-thumb:hover": {
//                     background: "#94a3b8",
//                   },
//                   border: "none",
//                   borderRadius: 0,
//                   p: 1.5,
//                   bgcolor: "transparent",
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: 2,
//                 }}
//               >
//             {false && execViewInfo && (
//               <Typography
//                 variant="caption"
//                 sx={{ mb: 1, display: "block", color: "text.secondary" }}
//                 data-testid="active-exec-view"
//               >
//                 Using view: {execViewInfo.view_name || execViewInfo.key}
//                 {execViewInfo.isDefault ? " (default)" : ""}
//               </Typography>
//             )}
            




            
            
//             {/* Dynamic step form */}
//                                     {(() => {
//               // base read-only system columns
//               const baseRO = ["performer", "step_performer", "wf_status", "review_requestor"];

//               let forceRO = baseRO;
//               let extraReq = [];

//               if (isReviewMode && schema?.fields) {
//                 const allCols = schema.fields
//                   .map((f) => String(f.column || f.name || "").toLowerCase())
//                   .filter(Boolean);

//                 // everything except step_comments & audit_trail becomes RO
//                 const moreRO = allCols.filter(
//                   (c) => c !== "step_comments" && c !== "audit_trail"
//                 );

//                 forceRO = Array.from(new Set([...baseRO, ...moreRO]));
//                 extraReq = ["step_comments"]; // make comments mandatory
//               }

//               // Derive schema ordered by saved view if present
//               const displaySchema = (() => {
//                 const fields = Array.isArray(schema?.fields) ? schema.fields : [];
//                 if (!fields.length) return schema;
//                 if (isTerminateStep) {
//                   return { ...(schema || {}), fields: fields.map((f) => ({ ...f, visible: true })) };
//                 }
//                 if (!execViewLayout) return schema;
//                 try {
//                   const mats = materializeLayout(execViewLayout, fields);
//                   if (!Array.isArray(mats)) return schema;
//                   const byCol = new Map(fields.map(f => [String(f.column||"").trim(), f]));
//                   const ordered = [];
//                   mats.forEach(sec => (sec.columns||[]).forEach(col => (col.fields||[]).forEach(f => {
//                     const k = String(f.field||"").trim();
//                     const meta = byCol.get(k);
//                     if (meta && meta.visible) { ordered.push(meta); byCol.delete(k); }
//                   })));
//                   byCol.forEach((meta)=>{ if (meta?.visible) ordered.push(meta); });
//                   return { ...(schema||{}), fields: ordered };
//                 } catch {
//                   return schema;
//                 }
//               })();

// console.log(
//   "[terminate] schema fields",
//   schema?.fields?.length,
//   "displaySchema fields",
//   displaySchema?.fields?.length
// );

// const fields = Array.isArray(schema?.fields) ? schema.fields : [];
// const execContainerStyle = isTerminateStep
//   ? { ...(execViewLayout?.container_style || {}), border: false }
//   : execViewLayout?.container_style;
//               const execLayoutSections =
//                 isTerminateStep || !execViewLayout ? null : materializeLayout(execViewLayout, fields);

//               return (
//                 <DynamicStepForm
//                   ref={formRef}
//                   schema={displaySchema}
//                   initial={initialValues}
//                   canvasModel={execCanvasLayout}
//                   layoutSections={execLayoutSections}
//                   containerStyle={execContainerStyle}
//                   attachmentsAllowed={!isTerminateStep && canUploadAttachmentsFlag && !isOutbox}
//                   oneColumn={execOneCol}
//                   showPrimaryButton={false}
//                   forceReadOnlyColumns={forceRO}
//                   extraRequiredColumns={extraReq}
//                   getCurrentAction={() => actionRef.current}
//                   onSubmit={async (payload) => {
//                     if (saving) return;
//                     setSaving(true);
//                     try {
//                       await handleSubmit(actionRef.current || "approve", payload);
//                     } finally {
//                       setSaving(false);
//                     }
//                   }}
//                 >
//                   {showReview && !isReviewMode && (
//                     <Box sx={{ mt: 1, maxWidth: 320 }}>
//                       <TextField
//                         select
//                         fullWidth
//                         size="small"
//                         label="Send for review to"
//                         value={reviewUserId}
//                         onChange={(e) => setReviewUserId(e.target.value)}
//                       >
//                         <MenuItem value="">Select user</MenuItem>
//                         {users.map((u) => (
//                           <MenuItem key={u.id} value={u.id}>
//                             {u.full_name ||
//                               u.name ||
//                               `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
//                               u.username ||
//                               u.email ||
//                               `User ${u.id}`}
//                           </MenuItem>
//                         ))}
//                       </TextField>
//                     </Box>
//                   )}
//                   <Box sx={{ mt: 1 }}>
//                     <Typography variant="caption" color="text.secondary" display="block">
//                       On Approve:{" "}
//                       <Box component="span" sx={{ fontWeight: 600 }}>
//                         {nextApproveCfg ? renderPerformerLabel(nextApproveCfg) : "Not configured"}
//                       </Box>
//                     </Typography>
//                     <Typography variant="caption" color="text.secondary" display="block">
//                       On Reject:{" "}
//                       <Box component="span" sx={{ fontWeight: 600 }}>
//                         {nextRejectCfg ? renderPerformerLabel(nextRejectCfg) : "Not configured"}
//                       </Box>
//                     </Typography>
//                   </Box>
//                   {(isTerminateStep || canViewAttachments) && attachments.length > 0 && (
//                     <Box sx={{ mt: 1 }}>
//                       <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
//                         Existing Attachments
//                       </Typography>

//                       <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
//                         {attachments.map((f) => {
//                           const url = getAttachmentUrl(f);
//                           const name = f?.original_filename || f?.filename || "Unnamed file";

//                           return (
//                             <Box
//                               key={f.id}
//                               sx={{
//                                 display: "flex",
//                                 alignItems: "center",
//                                 gap: 1,
//                                 p: 0.75,
//                                 border: "1px solid rgba(0,0,0,0.08)",
//                                 borderRadius: 1,
//                                 bgcolor: "#fff",
//                               }}
//                             >
//                               <Typography
//                                 variant="body2"
//                                 sx={{
//                                   flex: 1,
//                                   cursor: url ? "pointer" : "default",
//                                   textDecoration: url ? "underline" : "none",
//                                   color: url ? "primary.main" : "text.secondary",
//                                 }}
//                                 onClick={() => url && openAttachment(f)}
//                                 title={url ? "Open" : "No URL"}
//                               >
//                                  {name}
//                               </Typography>

//                               <Tooltip title="Open">
//                                 <span>
//                                   <IconButton
//                                     size="small"
//                                     disabled={!url}
//                                     onClick={() => openAttachment(f)}
//                                   >
//                                     <OpenInNewIcon fontSize="small" />
//                                   </IconButton>
//                                 </span>
//                               </Tooltip>

//                               <Tooltip title="Download">
//                                 <span>
//                                   <IconButton
//                                     size="small"
//                                     disabled={!url}
//                                     onClick={() => downloadAttachment(f)}
//                                   >
//                                     <DownloadIcon fontSize="small" />
//                                   </IconButton>
//                                 </span>
//                               </Tooltip>
//                             </Box>
//                           );
//                         })}
//                       </Box>
//                     </Box>
//                   )}
//                 </DynamicStepForm>
//               );
//             })()}

//                         {/* Next step previews (read-only) */}
//             {/* <Box sx={{ mt: 1, display: "flex", gap: 2, flexWrap: "wrap" }}>
//               <TextField
//                 size="small"
//                 label="Next Step if Reject"
//                 value={nextRejectLabel}
//                 InputProps={{ readOnly: true }}
//                 error // makes the label red, like in your screenshot
//                 sx={{ minWidth: 220 }}
//               />
//               <TextField
//                 size="small"
//                 label="Next Step if Approve"
//                 value={nextApproveLabel}
//                 InputProps={{ readOnly: true }}
//                 error
//                 sx={{ minWidth: 220 }}
//               />
//             </Box> */}


//               </Box>
//             </Box>
//         </Box>
//         )}
//         </Box>
//       </DialogContent>
//       <Box
//         sx={{
//           minHeight: 48,
//           bgcolor: "#f3f4f6",
//           borderTop: "1px solid #e5e7eb",
//           px: 2,
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//         }}
//       >
//         <Box sx={{ display: "flex", alignItems: "center" }}>
//           {!isOutbox && (
//             <>
//               {isReviewMode ? (
//                 <Button
//                   variant="contained"
//                   size="small"
//                   disabled={saving}
//                   onClick={() => {
//                     actionRef.current = "return";
//                     formRef.current?.submit();
//                   }}
//                   sx={{ ml: 1, minWidth: 110, height: 32 }}
//                 >
//                   Return
//                 </Button>
//               ) : (
//                 <>
//                   {showReview && (
//                     <Button
//                       variant="outlined"
//                       size="small"
//                       disabled={saving}
//                       onClick={() => {
//                         if (!reviewUserId) {
//                           alert("Please select a user for review.");
//                           return;
//                         }
//                         actionRef.current = "review";
//                         formRef.current?.submit();
//                       }}
//                       sx={{ ml: 1, minWidth: 110, height: 32 }}
//                     >
//                       Review
//                     </Button>
//                   )}

//                   <Button
//                     variant="contained"
//                     size="small"
//                     disabled={saving}
//                     onClick={() => {
//                       actionRef.current = "approve";
//                       formRef.current?.submit();
//                     }}
//                     sx={{ ml: 1, minWidth: 110, height: 32 }}
//                   >
//                     {approveLabel}
//                   </Button>

//                   {showReject && (
//                     <Button
//                       variant="outlined"
//                       color="error"
//                       size="small"
//                       disabled={saving}
//                       onClick={() => {
//                         actionRef.current = "reject";
//                         formRef.current?.submit();
//                       }}
//                       sx={{ ml: 1, minWidth: 110, height: 32 }}
//                     >
//                       {rejectLabel}
//                     </Button>
//                   )}
//                 </>
//               )}
//             </>
//           )}
//         </Box>
//         <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
//           <Tooltip title="Comments">
//             <IconButton
//               onClick={() => setCommentsOpen(true)}
//               size="small"
//               aria-label="Comments"
//               sx={{ border: "1px solid #cbd5e1", borderRadius: 1, color: "#2563eb" }}
//             >
//               <CommentOutlinedIcon fontSize="small" />
//             </IconButton>
//           </Tooltip>
//           <Tooltip title="Audit Trail">
//             <IconButton
//               onClick={() => setAuditOpen(true)}
//               size="small"
//               aria-label="Audit Trail"
//               sx={{ border: "1px solid #cbd5e1", borderRadius: 1, color: "#0f766e" }}
//             >
//               <HistoryOutlinedIcon fontSize="small" />
//             </IconButton>
//           </Tooltip>
//         </Box>
//       </Box>
//       <Dialog
//         open={auditOpen}
//         onClose={() => setAuditOpen(false)}
//         maxWidth="md"
//         fullWidth
//       >
//         <DialogTitle
//           sx={{
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             bgcolor: "#f8fafc",
//             py: 0.75,
//           }}
//         >
//           <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
//             Audit Trail
//           </Typography>
//           <IconButton onClick={() => setAuditOpen(false)} size="small">
//             <CloseIcon />
//           </IconButton>
//         </DialogTitle>
//         <DialogContent
//           dividers
//           sx={{
//             maxHeight: "70vh",
//             overflow: "auto",
//             scrollbarWidth: "none",
//             scrollbarColor: "#cbd5e1 transparent",
//             "&:hover": {
//               scrollbarWidth: "thin",
//             },
//             "&::-webkit-scrollbar": {
//               width: 0,
//               height: 0,
//             },
//             "&:hover::-webkit-scrollbar": {
//               width: 6,
//               height: 6,
//             },
//             "&::-webkit-scrollbar-track": {
//               background: "transparent",
//             },
//             "&::-webkit-scrollbar-thumb": {
//               background: "#cbd5e1",
//               borderRadius: 999,
//             },
//             "&::-webkit-scrollbar-thumb:hover": {
//               background: "#94a3b8",
//             },
//             bgcolor: "#f9fafb",
//           }}
//         >
//           {auditTrailEntries.length === 0 ? (
//             <Typography variant="body2" color="text.secondary">
//               No history yet.
//             </Typography>
//           ) : (
//             <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
//               {groupedAudit.map((group, groupIdx) => {
//                 const stepNoLabel = group.stepNo != null ? String(group.stepNo) : "-";
//                 return (
//                   <Box
//                     key={`hist_group_${group.stepNo}_${group.idx}`}
//                     sx={{
//                       border: "1px solid #e5e7eb",
//                       borderRadius: 1,
//                       p: 1,
//                       bgcolor: "white",
//                     }}
//                   >
//                     {groupIdx === 0 && (
//                       <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
//                         History
//                       </Typography>
//                     )}
//                     <Box sx={{ mb: 0.75 }}>
//                       <Typography variant="caption" sx={{ fontWeight: 700 }}>
//                         Step No: {stepNoLabel}
//                       </Typography>
//                       <Typography variant="caption" display="block">
//                         Step Name: {group.stepName}
//                       </Typography>
//                       <Typography variant="caption" display="block">
//                         Step Type: {group.stepType}
//                       </Typography>
//                     </Box>
//                     <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
//                       {group.items.map((entry, idx) => {
//                         const entryData = entry?.data || entry?.form_values || null;
//                         const prev =
//                           group.items[idx - 1]?.data ||
//                           group.items[idx - 1]?.form_values ||
//                           null;
//                         const changed = diffFields(entryData, prev);
//                         const action = entry?.action || "-";
//                         const performedBy = (() => {
//                           if (entry?.action === "initiate" || entry?.from_step_no === 0) {
//                             return formatUserLabel(
//                               instanceDetail?.initiator ?? entry?.initiator
//                             );
//                           }
//                           return formatUserLabel(entry?.performer ?? entry?.by);
//                         })();
//                         const date = entry?.at ? new Date(entry.at).toLocaleString() : "-";
//                         const files = extractAttachments(entryData);
//                         return (
//                           <Box
//                             key={`hist_${group.stepNo}_${idx}`}
//                             sx={{
//                               border: "1px solid #f1f5f9",
//                               borderRadius: 1,
//                               p: 0.75,
//                               bgcolor: "#f8fafc",
//                             }}
//                           >
//                             <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
//                               <AccessTimeIcon fontSize="inherit" />
//                               <Typography variant="caption">Date modified: {date}</Typography>
//                             </Box>
//                             <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
//                               <PersonOutlineIcon fontSize="inherit" />
//                               <Typography variant="caption">
//                                 Step Performed By: {performedBy}
//                               </Typography>
//                             </Box>
//                             <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
//                               <BoltIcon fontSize="inherit" />
//                               <Typography variant="caption">Step Action: {action}</Typography>
//                             </Box>
//                             <Typography variant="caption" display="block">
//                               Fields changed:{" "}
//                               {changed.length
//                                 ? changed
//                                     .map((k) => {
//                                       const v = entryData ? entryData[k] : undefined;
//                                       return `${k}: ${JSON.stringify(v)}`;
//                                     })
//                                     .join(", ")
//                                 : "-"}
//                             </Typography>
//                             {files.length > 0 && (
//                               <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
//                                 <AttachFileIcon fontSize="inherit" />
//                                 <Typography variant="caption">
//                                   Files attached: {files.length}
//                                 </Typography>
//                               </Box>
//                             )}
//                           </Box>
//                         );
//                       })}
//                     </Box>
//                   </Box>
//                 );
//               })}
//             </Box>
//           )}
//         </DialogContent>
//       </Dialog>
//       <Dialog
//         open={commentsOpen}
//         onClose={() => setCommentsOpen(false)}
//         maxWidth="sm"
//         fullWidth
//       >
//         <DialogTitle
//           sx={{
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             bgcolor: "#f8fafc",
//             py: 0.75,
//           }}
//         >
//           <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
//             Comments
//           </Typography>
//           <IconButton onClick={() => setCommentsOpen(false)} size="small">
//             <CloseIcon />
//           </IconButton>
//         </DialogTitle>
//         <DialogContent
//           dividers
//           sx={{
//             maxHeight: "70vh",
//             overflow: "auto",
//             scrollbarWidth: "none",
//             scrollbarColor: "#cbd5e1 transparent",
//             "&:hover": {
//               scrollbarWidth: "thin",
//             },
//             "&::-webkit-scrollbar": {
//               width: 0,
//               height: 0,
//             },
//             "&:hover::-webkit-scrollbar": {
//               width: 6,
//               height: 6,
//             },
//             "&::-webkit-scrollbar-track": {
//               background: "transparent",
//             },
//             "&::-webkit-scrollbar-thumb": {
//               background: "#cbd5e1",
//               borderRadius: 999,
//             },
//             "&::-webkit-scrollbar-thumb:hover": {
//               background: "#94a3b8",
//             },
//             bgcolor: "#f9fafb",
//           }}
//         >
//           {commentEntries.length === 0 ? (
//             <Typography variant="body2" color="text.secondary">
//               No comments yet.
//             </Typography>
//           ) : (
//             <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
//               {commentEntries.map((entry, idx) => {
//                 const byLabel = formatUserLabel(entry?.by);
//                 const stepNo =
//                   entry?.from_step_no != null ? String(entry.from_step_no) : "-";
//                 const stepName = entry?.step_name || "-";
//                 const when = entry?.at ? new Date(entry.at).toLocaleString() : "-";
//                 const text =
//                   typeof entry?.step_comments === "string"
//                     ? entry.step_comments
//                     : JSON.stringify(entry?.step_comments);
//                 return (
//                   <Box
//                     key={`comment_${idx}`}
//                     sx={{
//                       border: "1px solid #e5e7eb",
//                       borderRadius: 1,
//                       p: 1,
//                       bgcolor: "#fff",
//                     }}
//                   >
//                     <Typography variant="caption" sx={{ fontWeight: 700 }} display="block">
//                       {byLabel}
//                     </Typography>
//                     <Typography variant="caption" display="block">
//                       Step No: {stepNo}
//                     </Typography>
//                     <Typography variant="caption" display="block">
//                       Step Name: {stepName}
//                     </Typography>
//                     <Typography variant="caption" display="block">
//                       {when}
//                     </Typography>
//                     <Typography variant="body2" sx={{ mt: 0.5 }}>
//                       {text}
//                     </Typography>
//                   </Box>
//                 );
//               })}
//             </Box>
//           )}
//         </DialogContent>
//       </Dialog>
//       {/* Submission backdrop */}
//       <Backdrop
//         open={saving}
//         sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: "#fff" }}
//       >
//         <Box textAlign="center">
//           <CircularProgress color="inherit" />
//           <Typography variant="body2" sx={{ mt: 2 }}>
//             Submitting, please wait...
//           </Typography>
//         </Box>
//       </Backdrop>
//     </Dialog>
//   );
// }




// export default function BAAssignments() {
//   const [box, setBox] = useState("inbox"); // inbox | outbox
//   const [q, setQ] = useState("");
//   const [page, setPage] = useState(1);
//   const pageSize = 8; // 4 per row x 2 rows

//   const [loading, setLoading] = useState(false);
//   const [rows, setRows] = useState([]);

//   const [pickerOpen, setPickerOpen] = useState(false);
//   const [pickedWorkflow, setPickedWorkflow] = useState(null);
//   const [initiateOpen, setInitiateOpen] = useState(false);

//   const [activeInstance, setActiveInstance] = useState(null);
//   const [instanceOpen, setInstanceOpen] = useState(false);

//   const [users, setUsers] = useState([]);
//   const usersById = useMemo(() => {
//   const m = new Map();
//       (users || []).forEach(u => {
//         const name =
//           u.full_name ||
//           u.name ||
//           `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
//           u.username ||
//           u.email ||
//           `User ${u.id}`;
//         m.set(Number(u.id), name);
//       });
//       return m;
//     }, [users]);


//       useEffect(() => {
//       (async () => {
//         try {
//           const { data } = await api.get("/users");
//           setUsers(Array.isArray(data) ? data : []);
//         } catch (e) {
//           console.error("[assignments] users fetch failed", e);
//           setUsers([]);
//         }
//       })();
//     }, []);


//   // Fetch instances
//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       try {
//         const r = await api.get("/simple_workflow_instances", { params: { box } });
//         const arr = Array.isArray(r.data) ? r.data : [];
//         // Optionally resolve assigned_by name in API. If not, leave as-is.
//         const enriched = arr.map(x => {
//          const assignedById = Number(x.assigned_by);
//          return {
//            ...x,
//            assigned_by_name:
//              x.assigned_by_name ||
//              usersById.get(assignedById) ||
//              null,
//          };
//        });
//        setRows(enriched);
//         setPage(1);
//       } catch (e) {
//         console.error("[assignments] list failed", e);
//         setRows([]);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [box, usersById]);

//   // Client-side search
//   const filtered = useMemo(() => {
//     const s = q.trim().toLowerCase();
//     if (!s) return rows;
//     return rows.filter((r) => {
//       const fields = [
//         r.workflow_map_name || r.workflow_name || "",
//         r.wf_status || "",
//         r.step_name || "",
//         String(r.id || ""),
//         String(r.assigned_by_name || r.assigned_by || ""),
//       ];
//       return fields.some((v) => String(v).toLowerCase().includes(s));
//     });
//   }, [q, rows]);

//   const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
//   const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

//     function openInstance(item) {
//     setActiveInstance(item);
//     setInstanceOpen(true);
//   }

//   function onPickWorkflow(w) {
//     setPickedWorkflow(w);
//     setPickerOpen(false);
//     setInitiateOpen(true);
//   }

//   return (
//     <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fb' }}>
//       <Box sx={{ bgcolor: '#1f355d', color: '#fff', px: 4, py: 3 }}>
//         <Typography variant="h4" sx={{ fontWeight: 600 }}>
//           Workflow Assignments
//         </Typography>
//       </Box>

//       <Box sx={{ bgcolor: '#1f355d', color: '#fff', px: 4, py: 1.5 }}>
//         <Tabs
//           value={box}
//           onChange={(_e, v) => setBox(v)}
//           textColor="inherit"
//           TabIndicatorProps={{ style: { backgroundColor: '#fff' } }}
//           sx={{
//             minHeight: 36,
//             '& .MuiTab-root': {
//               minHeight: 36,
//               px: 2.5,
//               fontWeight: 700,
//               color: '#e6edf7',
//             },
//             '& .Mui-selected': { color: '#fff' },
//           }}
//         >
//           <Tab value="inbox" label="INBOX" />
//           <Tab value="outbox" label="OUTBOX" />
//         </Tabs>
//       </Box>

//       <Container maxWidth="lg" sx={{ py: 4 }}>
//         <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
//           <Box
//             display="flex"
//             alignItems="center"
//             justifyContent="space-between"
//             mb={2}
//             sx={{ gap: 2, flexWrap: 'wrap' }}
//           >
//             <Button
//               variant="contained"
//               // startIcon={<AddIcon />}
//               onClick={() => setPickerOpen(true)}
//               sx={{
//                 borderRadius: 2,
//                 px: 2.5,
//                 py: 1,
//                 textTransform: 'none',
//                 fontWeight: 700,
//                 boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
//                 bgcolor: '#1f355d',
//               }}
//             >
//               Start New Workflow
//             </Button>

//             <TextField
//               size="small"
//               placeholder="Search title"
//               value={q}
//               onChange={(e) => setQ(e.target.value)}
//               sx={{
//                 width: 260,
//                 bgcolor: '#fff',
//                 borderRadius: 1,
//                 '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
//               }}
//               InputProps={{
//                 startAdornment: (
//                   <InputAdornment position="start">
//                     <SearchIcon fontSize="small" />
//                   </InputAdornment>
//                 ),
//               }}
//             />
//           </Box>

//           <Grid container columnSpacing={2} rowSpacing={2}>
//             {loading ? (
//               <Grid item xs={12}>
//                 <Typography variant="body2">Loading assignments.</Typography>
//               </Grid>
//             ) : paged.length === 0 ? (
//               <Grid item xs={12}>
//                 <Typography variant="body2">No assignments found.</Typography>
//               </Grid>
//             ) : (
//               paged.map((item) => (
//                 <Grid key={item.id} item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
//                   <Box sx={{ width: '100%' }}>
//                     <InstanceCard item={item} onOpen={openInstance} />
//                   </Box>
//                 </Grid>
//               ))
//             )}
//           </Grid>

//           <Box
//             display="flex"
//             justifyContent="flex-end"
//             alignItems="center"
//             mt={2.5}
//             sx={{ pr: 0.5 }}
//           >
//             <Pagination
//               color="primary"
//               count={pageCount}
//               page={page}
//               onChange={(_e, v) => setPage(v)}
//               showFirstButton
//               showLastButton
//               sx={{
//                 '& .MuiPaginationItem-root': {
//                   borderRadius: 2,
//                 },
//               }}
//             />
//           </Box>

//           <WorkflowPickerDialog
//             open={pickerOpen}
//             onClose={() => setPickerOpen(false)}
//             onPick={onPickWorkflow}
//           />

//           <InitiateFormDialog
//             open={initiateOpen}
//             onClose={(didCreate) => {
//               setInitiateOpen(false);
//               setPickedWorkflow(null);
//               if (didCreate) {
//                 (async () => {
//                   try {
//                     const r = await api.get('/simple_workflow_instances', { params: { box } });
//                     setRows(Array.isArray(r.data) ? r.data : []);
//                   } catch {}
//                 })();
//               }
//             }}
//             workflow={pickedWorkflow}
//           />

//           <InstanceExecuteDialog
//             open={instanceOpen}
//             instance={activeInstance}
//             isOutbox={box === 'outbox'}
//             onClose={(changed) => {
//               setInstanceOpen(false);
//               setActiveInstance(null);
//               if (changed) {
//                 (async () => {
//                   try {
//                     const r = await api.get('/simple_workflow_instances', { params: { box } });
//                     setRows(Array.isArray(r.data) ? r.data : []);
//                   } catch (e) {
//                     console.error('[assignments] refresh after instance close failed', e);
//                   }
//                 })();
//               }
//             }}
//           />
//         </Box>
//       </Container>
//     </Box>
//   );
// }

// // Named export for reuse (e.g., print page)
// export { DynamicStepForm };
