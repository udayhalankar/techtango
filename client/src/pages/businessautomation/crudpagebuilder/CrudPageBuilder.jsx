// src/pages/businessautomation/crudpagebuilder/CrudPageBuilder.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../services/api";
import {
  Box, Button, Card, CardContent, Container, Divider, Dialog, DialogTitle, DialogContent, Grid, Stack, Typography, Paper,
  TextField, Autocomplete, OutlinedInput, InputAdornment, List, ListItemButton, ListItemText,
  Table, TableBody, TableCell, TableHead, TableRow, Pagination, ToggleButton, ToggleButtonGroup,
  Menu, MenuItem, Tabs, Tab, IconButton, Checkbox, FormControlLabel, FormControl, InputLabel, Select, RadioGroup, Radio,
  ListItem
} from "@mui/material";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  useGridApiRef
} from "@mui/x-data-grid";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ModeEditOutlineOutlinedIcon from "@mui/icons-material/ModeEditOutlineOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import CloseIcon from "@mui/icons-material/Close";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import * as XLSX from "xlsx";
import SecureFileUploader from "../../../components/SecureFileUploader";

/* -----------------------------------------------------------------------------
   LAYOUT CONSTANTS
   Adjust APPBAR_H if your top bar is taller. Using 64/72 matches MUI defaults.
----------------------------------------------------------------------------- */
const APPBAR_H = 72;   // top navbar height in px (bump if your bar is taller)
const SIDENAV_W = 232;

// very light modal using MUI Box (kept simple & reliable)
const Overlay = ({ children, onClose }) => (
  <Box
    onClick={onClose}
    sx={{
      position: "fixed",
      inset: 0,
      bgcolor: "rgba(0,0,0,0.4)",
      zIndex: 1300,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}
  >
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{
        width: "min(880px, 96vw)",
        maxHeight: "92vh",
        overflowY: "auto",
        bgcolor: "background.paper",
        p: 2,
        borderRadius: 2,
        boxShadow: 8,
        position: "relative"
      }}
    >
      {children}
    </Box>
  </Box>
);

/* -----------------------------------------------------------------------------
   NORMALIZERS & FETCH HELPERS
----------------------------------------------------------------------------- */
const normalizeTables = (arr) =>
  (arr || [])
    .map((t) =>
      typeof t === "string"
        ? t
        : t?.table_name || t?.name || t?.tablename || t?.table || ""
    )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

const parseOptions = (csv) =>
  String(csv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const codeLabelPairs = (options) => options.map((label, i) => ({ code: i + 1, label }));

const parseMultiValue = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

const camelToSnake = (str) =>
  String(str || "").replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const normalizeDate = (v) => {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") {
    if (v.length >= 10 && v[4] === "-" && v[7] === "-") return v.slice(0, 10);
  }
  return v;
};

const parseAttachmentValue = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const validationForField = (validations, mode, fieldKey) => {
  const base = { data_entry: true, read_only: false, visible: true, mandatory: false };
  const cfg = validations?.[mode]?.[fieldKey] || {};
  return { ...base, ...cfg };
};

const isEmptyForInput = (inputType, value) => {
  const kind = String(inputType || "").toLowerCase();
  if (kind === "checkbox") return !Array.isArray(value) || value.length === 0;
  return value === "" || value === null || value === undefined;
};

export default function CrudPageBuilder() {
  // Builder form
  const { pageId } = useParams?.() || {};
  const standaloneId = pageId ? Number(pageId) : null;
  const [pageName, setPageName] = useState("");
  const [formName, setFormName] = useState("");
  const [description, setDescription] = useState("");
  const [tableName, setTableName] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Reference data
  const [tables, setTables] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagesView, setPagesView] = useState("grid");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tableIdByName, setTableIdByName] = useState({});

  // Selected page preview (records)
  const [activePage, setActivePage] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [pkName, setPkName] = useState("id");
  const [formFields, setFormFields] = useState([]);
  const [templateValidations, setTemplateValidations] = useState({});
  const [templateAccess, setTemplateAccess] = useState({});
  const [configAnchor, setConfigAnchor] = useState(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateModalSection, setTemplateModalSection] = useState("validations");
  const [fileFields, setFileFields] = useState({});

  // Search & paging (pages list)
  const [pagesSearch, setPagesSearch] = useState("");
  const pagesFiltered = useMemo(() => {
    if (!pagesSearch) return pages;
    const q = pagesSearch.toLowerCase();
    return (pages || []).filter((p) =>
      [p.page_name, p.form_name, p.table_name]
        .some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [pages, pagesSearch]);

  // Search & paging (records)
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tablePage, setTablePage] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(5);
  const PER_PAGE = 12;
  const [recordsView, setRecordsView] = useState("grid");
  const apiRef = useGridApiRef();
  const [exportMenuPosition, setExportMenuPosition] = useState(null);
  const [chartX, setChartX] = useState("");
  const [chartY, setChartY] = useState("");
  const [chartSampling, setChartSampling] = useState("all"); // all | sample
  const [chartSampleLimit, setChartSampleLimit] = useState(200);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartTab, setChartTab] = useState("chart");
  const [chartType, setChartType] = useState("column");
  const [chartFieldSearch, setChartFieldSearch] = useState("");
  const [chartBorderRadius, setChartBorderRadius] = useState(0);
  const [chartCategoryGap, setChartCategoryGap] = useState(0.2);
  const [chartSeriesGap, setChartSeriesGap] = useState(0.1);
  const [chartLineWidth, setChartLineWidth] = useState(2);
  const [chartAreaOpacity, setChartAreaOpacity] = useState(0.3);
  const [chartPieInnerRadius, setChartPieInnerRadius] = useState(0);
  const filtered = useMemo(() => {
    if (!search) return rows;
    const term = search.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(term))
    );
  }, [rows, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const start = (page - 1) * PER_PAGE;
  const paged = filtered.slice(start, start + PER_PAGE);
  const rowsForGrid = useMemo(
    () =>
      filtered.map((r, idx) => ({
        id: r?.[pkName] ?? r?.id ?? idx,
        ...r,
      })),
    [filtered, pkName]
  );

  useEffect(() => {
    const handleMessage = (event) => {
      if (event?.data?.type === "closeTemplateModal") {
        setTemplateModalOpen(false);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const numericColumns = useMemo(() => {
    const colSet = new Set(columns || []);
    const samples = rowsForGrid.slice(0, 30);
    const nums = [];
    colSet.forEach((col) => {
      for (const r of samples) {
        const v = r?.[col];
        if (v === null || v === undefined || v === "") continue;
        if (!Number.isNaN(Number(v))) {
          nums.push(col);
        }
        break;
      }
    });
    return nums;
  }, [columns, rowsForGrid]);

  useEffect(() => {
    if (!columns?.length) return;
    const nextX = chartX || columns.find((c) => c !== pkName) || columns[0];
    const nextY = chartY || numericColumns[0] || columns.find((c) => c !== pkName);
    setChartX(nextX || "");
    setChartY(nextY || "");
  }, [columns, numericColumns, pkName, chartX, chartY]);

  const exportExcel = () => {
    if (!rowsForGrid.length) return;
    const safeName = (activePage?.page_name || "records").replace(/[^\w\-]+/g, "_");
    const data = rowsForGrid.map((r) => {
      const copy = { ...r };
      delete copy.id;
      return copy;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    XLSX.writeFile(wb, `${safeName}.xlsx`);
  };

  const chartRows = useMemo(() => {
    if (chartSampling !== "sample") return rowsForGrid;
    return rowsForGrid.slice(0, chartSampleLimit);
  }, [rowsForGrid, chartSampling, chartSampleLimit]);

  const chartData = useMemo(() => {
    if (!chartX || !chartY) return [];
    return chartRows
      .map((r) => ({
        x: String(r?.[chartX] ?? ""),
        y: Number(r?.[chartY] ?? 0),
      }))
      .filter((d) => d.x !== "");
  }, [chartRows, chartX, chartY]);

  const chartFields = useMemo(() => {
    const term = chartFieldSearch.trim().toLowerCase();
    if (!term) return columns || [];
    return (columns || []).filter((c) => String(c || "").toLowerCase().includes(term));
  }, [columns, chartFieldSearch]);

  const pieData = useMemo(() => {
    if (!chartX || !chartY) return [];
    return chartRows
      .map((r, idx) => ({
        id: idx,
        value: Number(r?.[chartY] ?? 0),
        label: String(r?.[chartX] ?? ""),
      }))
      .filter((d) => d.label !== "");
  }, [chartRows, chartX, chartY]);

  const RecordsToolbar = () => (
    <GridToolbarContainer sx={{ gap: 1, p: 1 }}>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <Button
        size="small"
        variant="text"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setExportMenuPosition({ top: rect.bottom + 4, left: rect.left });
        }}
        sx={{ minWidth: "auto", px: 1 }}
      >
        Export
      </Button>
      <Menu
        open={Boolean(exportMenuPosition)}
        onClose={() => setExportMenuPosition(null)}
        anchorReference="anchorPosition"
        anchorPosition={exportMenuPosition || undefined}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem
          onClick={() => {
            apiRef.current.exportDataAsCsv({ fileName: activePage?.page_name || "records" });
            setExportMenuPosition(null);
          }}
        >
          Download as CSV
        </MenuItem>
        <MenuItem
          onClick={() => {
            apiRef.current.exportDataAsPrint();
            setExportMenuPosition(null);
          }}
        >
          Print
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportExcel();
            setExportMenuPosition(null);
          }}
        >
          Export Excel
        </MenuItem>
      </Menu>
      <Button size="small" variant="outlined" startIcon={<BarChartOutlinedIcon />} onClick={() => setChartOpen(true)}>
        Charts
      </Button>
    </GridToolbarContainer>
  );

  /* ---------------------------------------------------------------------------
     BOOTSTRAP: Load tables + existing pages
     (Try a few endpoints you already have; first one that works wins.)
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const boot = async () => {
        // If opened as standalone page, fetch that page first
      if (standaloneId) {
        try {
          const meta = await api.get(`/crudpages/${standaloneId}`);
          setActivePage(meta.data);
          await loadPreview(meta.data);
        } catch (e) {
          console.error("Failed to load page meta:", e);
        }
      }
      // Tables
      const candidates = [
         "/crudpages/db/meta/tables",
        "/db/tables",
        "/db/meta/tables",
        "/tables",        // public in your server.js
        "/table/list",    // legacy
        "/dbmeta/tables"
      ];
      for (const url of candidates) {
        try {
          const { data } = await api.get(url);
          const list = normalizeTables(Array.isArray(data) ? data : data?.tables);
          const custFormTables = list.filter((name) => name.startsWith("cust_form_"));
          if (custFormTables.length) {
            setTables(custFormTables);
            break;
          }
        } catch (_) { /* keep trying */ }
      }

      // CRUD pages
      try {
        const res = await api.get("/crudpages");
        setPages(res.data || []);
      } catch (e) {
        console.error("Load /crudpages failed:", e);
      }
      try {
        const tplRes = await api.get("/templates/list");
        const map = {};
        (tplRes.data || []).forEach((t) => {
          if (t?.table_name && t?.id) map[t.table_name] = t.id;
        });
        setTableIdByName(map);
      } catch (e) {
        console.error("Load /templates/list failed:", e);
      }
    };
    boot();
  }, []);

  // Load columns + data for active page
  const loadPreview = async (pageRow) => {
    if (!pageRow) return;
    setActivePage(pageRow);
    setLoading(true);
    try {
      const cols = await api.get(`/crudpages/${pageRow.id}/columns`);
      setColumns(cols.data?.columns || []);
      setPkName(cols.data?.primaryKey || "id");
      const recs = await api.get(`/crudpages/${pageRow.id}/records`);
      setRows(recs.data || []);
      setPage(1);
      setSearch("");
      let fieldsFromTemplates = [];
        try {
          if (pageRow?.dbtable_id) {
            const parsedValidations =
              typeof pageRow?.validations === "string"
                ? (() => {
                    try {
                      return JSON.parse(pageRow.validations || "{}");
                    } catch {
                      return {};
                    }
                  })()
                : pageRow?.validations || {};
            setTemplateValidations(parsedValidations);
            const tplFields = await api.get(`/templates/${pageRow.dbtable_id}/fields`);
            const rows = Array.isArray(tplFields.data) ? tplFields.data : [];
            fieldsFromTemplates = rows.map((f) => ({
              columnName: camelToSnake(f?.fieldname),
              label: f?.fieldname,
              dataType: f?.datatype,
              inputType: f?.inputtype,
              optionsCsv: f?.options,
              dateGranularity: f?.format,
              visible: true,
            }));
          }
        } catch (e) {
          console.error("Failed to load template fields:", e);
        }
      setFormFields(fieldsFromTemplates);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Create the CRUD page record
  const handleCreatePage = async () => {
    if (!pageName || !formName || !tableName) {
      alert("Please fill Page Name, Form Name and Table.");
      return;
    }
    const tableKey = typeof tableName === "string" ? tableName : tableName?.table_name;
    const dbtableId = tableIdByName?.[tableKey];
    if (!dbtableId) {
      alert("Selected table does not have a valid template id.");
      return;
    }
    try {
      const res = await api.post("/crudpages", {
        pageName,
        formName,
        tableName: tableKey,
        dbtableId,
        status: "Active",
        description
      });
      alert("Page created successfully.");
      setPages((p) => [res.data, ...p]);
      setPageName("");
      setFormName("");
      setDescription("");
      setTableName(null);
      setCreateModalOpen(false);
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to create CRUD page.");
      console.error(e);
    }
  };

  // Records actions
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [recMode, setRecMode] = useState("create"); // create | view | edit
  const [recValues, setRecValues] = useState({});
  const [recordMenuAnchor, setRecordMenuAnchor] = useState(null);
  const [recordMenuRow, setRecordMenuRow] = useState(null);

  const handleDownloadAttachment = async (file) => {
    try {
      if (!file?.id) return;
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/approval_files/download/${file.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.original_filename || "download");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
      alert("Download failed.");
    }
  };

  const handleDeletePage = async (id) => {
    if (!id) return;
    const ok = window.confirm("Delete this page?");
    if (!ok) return;
    try {
      await api.delete(`/crudpages/${id}`);
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert(e?.response?.data?.error || "Delete failed.");
      console.error(e);
    }
  };

  const openTemplateEditor = (section) => {
    if (!activePage?.table_name) return;
    setTemplateModalSection(section);
    setTemplateModalOpen(true);
  };

  const openCreate = () => {
    const init = {};
    formFields.forEach((f, idx) => {
      const key =
        f?.columnName ??
        f?.name ??
        f?.field ??
        f?.column ??
        f?.field_name ??
        f?.column_name ??
        `field_${idx}`;
      if (key === pkName) return;
      const inputType = String(f?.inputType ?? f?.controlType ?? f?.dataType ?? f?.type ?? "")
        .toLowerCase();
      const options = parseOptions(f?.optionsCsv);
      if (inputType === "checkbox" && options.length) {
        init[key] = [];
      } else if (inputType === "checkbox") {
        init[key] = false;
      } else {
        init[key] = "";
      }
    });
    setRecValues(init);
    setFileFields({});
    setRecMode("create");
    setRecModalOpen(true);
  };
  const openView = (row) => {
    setRecValues(row);
    setFileFields({});
    setRecMode("view");
    setRecModalOpen(true);
  };
  const openEdit = (row) => {
    setRecValues(row);
    setFileFields({});
    setRecMode("edit");
    setRecModalOpen(true);
  };

  const handleSaveRecord = async () => {
    try {
      const modeKey = recMode === "edit" ? "edit" : "create";
      const errors = [];
      formFields.forEach((f, idx) => {
        const key =
          f?.columnName ??
          f?.name ??
          f?.field ??
          f?.column ??
          f?.field_name ??
          f?.column_name ??
          `field_${idx}`;
        if (!key) return;
        const inputType = String(f?.inputType ?? f?.controlType ?? f?.dataType ?? f?.type ?? "")
          .toLowerCase();
        const validation = validationForField(templateValidations, modeKey, key);
        if (!validation.visible || !validation.data_entry || validation.read_only) return;
        if (!validation.mandatory) return;
        if (inputType === "image") {
          const existing = parseAttachmentValue(recValues[key]);
          const staged = fileFields[key] || [];
          if (!existing.length && !staged.length) {
            errors.push(`${f?.label ?? key}: required`);
          }
          return;
        }
        const value = recValues[key];
        if (isEmptyForInput(inputType, value)) {
          errors.push(`${f?.label ?? key}: required`);
        }
      });
      if (errors.length) {
        alert(`Please fix the following:\n` + errors.join("\n"));
        return;
      }
      const payload = { ...recValues };
      const attachmentKeys = [];
      formFields.forEach((f, idx) => {
        const key =
          f?.columnName ??
          f?.name ??
          f?.field ??
          f?.column ??
          f?.field_name ??
          f?.column_name ??
          `field_${idx}`;
        const inputType = String(f?.inputType ?? f?.controlType ?? f?.dataType ?? f?.type ?? "")
          .toLowerCase();
        const options = parseOptions(f?.optionsCsv);
        if (inputType === "checkbox" && options.length && Array.isArray(payload[key])) {
          const isInt = String(f?.dataType ?? "").toLowerCase().includes("int");
          if (isInt) {
            payload[key] = payload[key].length ? Number(payload[key][0]) : null;
          } else {
            payload[key] = payload[key].join(",");
          }
        }
        if (inputType === "image") {
          attachmentKeys.push(key);
          delete payload[key];
        }
      });
      attachmentKeys.forEach((key) => {
        delete payload[key];
      });

      const form = new FormData();
      form.append("data", JSON.stringify(payload));
      attachmentKeys.forEach((key) => {
        const files = fileFields[key] || [];
        files.forEach((f) => form.append(`attachment__${key}`, f));
      });

      if (recMode === "create") {
        const res = await api.post(
          `/crudpages/${activePage.id}/records-with-files`,
          form,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setRows((r) => [res.data, ...r]);
      } else if (recMode === "edit") {
        const id = recValues[pkName];
        const res = await api.put(
          `/crudpages/${activePage.id}/records/${id}/with-files`,
          form,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setRows((r) => r.map((x) => (x[pkName] === id ? res.data : x)));
      }
      setRecModalOpen(false);
    } catch (e) {
      alert(e?.response?.data?.error || "Save failed.");
      console.error(e);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await api.delete(`/crudpages/${activePage.id}/records/${row[pkName]}`);
      setRows((r) => r.filter((x) => x[pkName] !== row[pkName]));
    } catch (e) {
      alert(e?.response?.data?.error || "Delete failed.");
      console.error(e);
    }
  };

  const closeRecordMenu = () => {
    setRecordMenuAnchor(null);
    setRecordMenuRow(null);
  };

  const gridColumns = useMemo(() => {
    const allCols = [pkName, ...(columns || []).filter((c) => c !== pkName)].filter(Boolean);
    const base = allCols.map((c) => ({
      field: c,
      headerName: c,
      flex: c === pkName ? 0 : 1,
      width: c === pkName ? 90 : undefined,
      minWidth: c === pkName ? 80 : 120,
      valueGetter: (params) => params.row?.[c],
    }));
    return [
      ...base,
      {
        field: "__actions__",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        width: 300,
        renderCell: (params) => (
          <Box sx={{ pr: 1 }}>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => openView(params.row)} startIcon={<VisibilityOutlinedIcon />}>
                View
              </Button>
              <Button size="small" variant="outlined" onClick={() => openEdit(params.row)} startIcon={<ModeEditOutlineOutlinedIcon />}>
                Edit
              </Button>
              <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(params.row)} startIcon={<DeleteOutlineOutlinedIcon />}>
                Delete
              </Button>
            </Stack>
          </Box>
        ),
      },
    ];
  }, [columns, pkName]);

  const defaultVisibleColumns = useMemo(() => {
    const keep = new Set([pkName, ...(columns || []).filter((c) => c !== pkName).slice(0, 4)]);
    return (columns || []).reduce((acc, col) => {
      acc[col] = keep.has(col);
      return acc;
    }, {});
  }, [columns, pkName]);

  /* ---------------------------------------------------------------------------
     UI
  --------------------------------------------------------------------------- */
  if (!standaloneId) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
        <Box sx={{ bgcolor: "#1f355d", color: "#fff", px: 4, py: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Data Application Builder
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
            Build full data-driven applications without coding          
            </Typography>
          
        </Box>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ maxWidth: 1170, mx: "auto", borderRadius: 2, p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                variant="contained"
                onClick={() => {
                  setPageName("");
                  setFormName("");
                  setTableName(null);
                  setCreateModalOpen(true);
                }}
                sx={{ bgcolor: "#1f355d", textTransform: "none" }}
              >
                Create New Data Application
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <TextField
                size="small"
                placeholder="Search"
                value={pagesSearch}
                onChange={(e) => setPagesSearch(e.target.value)}
                InputProps={{ sx: { bgcolor: "#f8fafc" } }}
                sx={{ width: 500 }}
              />
            </Stack>

            {pagesView === "grid" ? (
              <Box sx={{ mt: 3 }}>
                <Grid container spacing={2}>
                  {pagesFiltered.length === 0 ? (
                    <Grid item xs={12}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          textAlign: "center",
                          color: "text.secondary",
                          borderRadius: 2,
                          border: "1px dashed #cbd5e1",
                          bgcolor: "#ffffff",
                        }}
                      >
                        No CRUD pages yet
                      </Paper>
                    </Grid>
                  ) : (
                    pagesFiltered.map((p) => (
                      <Grid item key={p.id} xs={12} sm={6} md={3}>
                        <Paper
                          elevation={0}
                          role="button"
                          tabIndex={0}
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
                            transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                            "&:hover": {
                              transform: "translateY(-4px)",
                              boxShadow: "0 10px 18px rgba(16, 24, 40, 0.22)",
                              borderColor: "#1a4fd8",
                            },
                            cursor: "pointer",
                          }}
                          onClick={() => window.open(p.page_url || `/crudwebpage/${p.id}`, "_blank")}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              window.open(p.page_url || `/crudwebpage/${p.id}`, "_blank");
                            }
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#1a4fd8" }}>
                              {p.page_name || "Untitled Page"}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "#51607d", mt: 1 }}>
                              ID: {p.id ?? "-"}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "#51607d" }}>
                              Created by: {p.created_by ?? "-"}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: "#51607d" }}>
                              Last Modified:{" "}
                              {p.date_modified
                                ? new Date(p.date_modified).toLocaleDateString()
                                : p.date_created
                                  ? new Date(p.date_created).toLocaleDateString()
                                  : "-"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              sx={{ textTransform: "none" }}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeletePage(p.id);
                              }}
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
                    ))
                  )}
                </Grid>
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ borderRadius: 2, mt: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Page Name</TableCell>
                      <TableCell>Form Name</TableCell>
                      <TableCell>Table</TableCell>
                      <TableCell>Date Created</TableCell>
                      <TableCell>Open</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagesFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          No CRUD pages yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagesFiltered.map((p) => (
                        <TableRow key={p.id} hover>
                          <TableCell>{p.page_name || "-"}</TableCell>
                          <TableCell>{p.form_name || "-"}</TableCell>
                          <TableCell>{p.table_name || "-"}</TableCell>
                          <TableCell>
                            {p.date_created ? new Date(p.date_created).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => window.open(p.page_url || `/crudwebpage/${p.id}`, "_blank")}
                            >
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        </Container>

        {createModalOpen && (
          <Overlay onClose={() => setCreateModalOpen(false)}>
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Create New Page
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Page Name"
                    fullWidth
                    size="small"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Form Name"
                    fullWidth
                    size="small"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    fullWidth
                    size="small"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete
                    options={tables}
                    value={tableName}
                    onChange={(_e, v) => setTableName(v)}
                    size="small"
                    renderInput={(p) => <TextField {...p} label="Select Table" />}
                    getOptionLabel={(o) => (typeof o === "string" ? o : o?.table_name || "")}
                    isOptionEqualToValue={(a, b) =>
                      (typeof a === "string" ? a : a?.table_name) ===
                      (typeof b === "string" ? b : b?.table_name)
                    }
                  />
                </Grid>
              </Grid>
              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button variant="outlined" onClick={() => setCreateModalOpen(false)}>
                  Close
                </Button>
                <Button variant="contained" onClick={handleCreatePage}>
                  Create
                </Button>
              </Stack>
            </>
          </Overlay>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <Box sx={{ bgcolor: "#e1e6e5", color: "#1f355d", px: 4, py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {activePage?.page_name || "CRUD Webpage"}
        </Typography>
        {activePage?.description && (
          <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#1f355d" }}>
            {activePage.description}
          </Typography>
        )}
      </Box>

      <Box sx={{ px: 0, py: 4 }}>
        <Box sx={{ maxWidth: recordsView === "table" ? 1500 : 1140, mx: "auto" }}>
          {/* Records preview for the selected page */}
          {activePage && (
            <Card
              variant="outlined"
              sx={{ bgcolor: "#f5f7fb", borderColor: "#f5f7fb" }}
            >
              <CardContent sx={{ p: 2 }}>
                {/* <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {activePage.page_name} - Records
                </Typography> */}

                <Box sx={{ mt: 1.5, maxWidth: recordsView === "table" ? 1500 : 1170, mx: "auto" }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Button
                      variant="contained"
                      // startIcon={<AddCircleOutlineIcon />}
                      onClick={openCreate}
                      sx={{ textTransform: "none" }}
                    >
                      Create New Record
                    </Button>
                    <IconButton
                      size="small"
                      onClick={(e) => setConfigAnchor(e.currentTarget)}
                      sx={{ border: "1px solid #cbd5e1", bgcolor: "#ffffff" }}
                    >
                      <SettingsOutlinedIcon fontSize="small" />
                    </IconButton>
                    <Box sx={{ flexGrow: 1 }} />
                    <OutlinedInput
                      size="small"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search"
                      sx={{ width: 490 }}
                      startAdornment={
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      }
                    />
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={recordsView}
                      onChange={(_e, v) => v && setRecordsView(v)}
                    >
                      <ToggleButton value="grid">
                        <ViewModuleIcon fontSize="small" />
                      </ToggleButton>
                      <ToggleButton value="table">
                        <TableRowsIcon fontSize="small" />
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                </Box>

              <Divider sx={{ my: 1.5 }} />

              {recordsView === "grid" ? (
                <Grid container spacing={2} columns={{ xs: 1, sm: 2, md: 4 }}>
                  {paged.length === 0 ? (
                    <Grid item xs={12} >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          textAlign: "center",
                          color: "text.secondary",
                          borderRadius: 2,
                          border: "1px dashed #cbd5e1",
                          bgcolor: "#ffffff", 
                        }}
                      >
                        {loading ? "Loading." : "No data"}
                      </Paper>
                    </Grid>
                  ) : (
                    paged.map((r, i) => (
                      <Grid item key={i} xs={1}>
                        <Paper
                          elevation={0}
                          role="button"
                          tabIndex={0}
                          sx={{
                            bgcolor: "#ffffff",
                            color: "#1f355d",
                            border: "1px solid #2f5fff",
                            boxShadow: "0 4px 10px rgba(16, 24, 40, 0.12)",
                            borderRadius: 2,
                            p: 2,
                            minHeight: 160,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                            cursor: "pointer",
                            transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                            "&:hover": {
                              transform: "translateY(-4px)",
                              boxShadow: "0 10px 18px rgba(16, 24, 40, 0.2)",
                              borderColor: "#1a4fd8",
                            },
                            "&:active": {
                              transform: "translateY(-2px) scale(0.99)",
                              boxShadow: "0 6px 12px rgba(16, 24, 40, 0.18)",
                            },
                            "&:focus-visible": {
                              outline: "2px solid #1a4fd8",
                              outlineOffset: 2,
                            },
                          }}
                          onClick={() => openView(r)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openView(r);
                            }
                          }}
                        >
                          <Box sx={{ display: "grid", gap: 0.5 }} >
                            {["id", "date_created", "created_at", "created_by"]
                              .map((key) =>
                                columns.find((c) => String(c).toLowerCase() === key)
                              )
                              .filter(Boolean)
                              .map((c) => (
                                <Typography key={c} sx={{ fontSize: 12, color: "#51607d" }}>
                                  <strong>{c}:</strong> {String(r[c] ?? "")}
                                </Typography>
                              ))}
                          </Box>
                          <Box sx={{ mt: "auto", pb: 0.5, display: "flex", justifyContent: "flex-end" }}>
                            <Button
                              size="small"
                              variant="contained"
                              endIcon={<ExpandMoreIcon />}
                              onClick={(event) => {
                                event.stopPropagation();
                                setRecordMenuAnchor(event.currentTarget);
                                setRecordMenuRow(r);
                              }}
                              sx={{ textTransform: "none" }}
                            >
                              Actions
                            </Button>
                          </Box>
                        </Paper>
                      </Grid>
                    ))
                  )}
                </Grid>
              ) : (
                <Box sx={{ width: 1500, maxWidth: "100%", mx: "auto" }}>
                  <Box sx={{ width: "100%", minWidth: 0 }}>
                    <DataGrid
                      apiRef={apiRef}
                      autoHeight
                      rows={rowsForGrid}
                      columns={gridColumns}
                      loading={loading}
                      disableRowSelectionOnClick
                      pageSizeOptions={[5, 10, 25, 50]}
                      paginationModel={{ page: tablePage, pageSize: tablePageSize }}
                      onPaginationModelChange={(model) => {
                        if (tablePage !== model.page) setTablePage(model.page);
                        if (tablePageSize !== model.pageSize) setTablePageSize(model.pageSize);
                      }}
                      initialState={{
                        columns: {
                          columnVisibilityModel: defaultVisibleColumns,
                        },
                      }}
                      slots={{ toolbar: RecordsToolbar }}
                      onRowDoubleClick={(params) => openView(params.row)}
                      sx={{
                        borderRadius: 2,
                        bgcolor: "#ffffff",
                        "& .MuiDataGrid-columnHeaders": {
                          bgcolor: "grey.200",
                          fontWeight: 700,
                        },
                      }}
                    />
                  </Box>
                </Box>
              )}

              <Dialog
                open={chartOpen}
                onClose={() => setChartOpen(false)}
                maxWidth={false}
                PaperProps={{ sx: { width: "min(1170px, 96vw)" } }}
              >
                <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  Charts
                  <IconButton onClick={() => setChartOpen(false)} size="small">
                    <CloseIcon />
                  </IconButton>
                </DialogTitle>
                <Tabs value={chartTab} onChange={(_e, v) => setChartTab(v)} sx={{ px: 2 }}>
                  <Tab value="chart" label="CHART" />
                  <Tab value="fields" label="FIELDS" />
                  <Tab value="customize" label="CUSTOMIZE" />
                </Tabs>
                <DialogContent dividers>
                  {chartTab === "chart" && (
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ToggleButtonGroup
                          size="small"
                          exclusive
                          value={chartSampling}
                          onChange={(_e, v) => v && setChartSampling(v)}
                        >
                          <ToggleButton value="all">All Rows</ToggleButton>
                          <ToggleButton value="sample">Sample</ToggleButton>
                        </ToggleButtonGroup>
                        <TextField
                          select
                          size="small"
                          label="Sample Size"
                          value={chartSampleLimit}
                          onChange={(e) => setChartSampleLimit(Number(e.target.value))}
                          disabled={chartSampling !== "sample"}
                          sx={{ minWidth: 140 }}
                        >
                          {[100, 200, 500, 1000].map((v) => (
                            <MenuItem key={v} value={v}>
                              {v}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Stack>
                      <Grid container spacing={2}>
                        {[
                          { key: "column", label: "Column" },
                          { key: "bar", label: "Bar" },
                          { key: "line", label: "Line" },
                          { key: "area", label: "Area" },
                          { key: "pie", label: "Pie" },
                        ].map((t) => (
                          <Grid item xs={6} sm={4} md={2.4} key={t.key}>
                            <Button
                              fullWidth
                              variant={chartType === t.key ? "contained" : "outlined"}
                              onClick={() => setChartType(t.key)}
                              sx={{ textTransform: "none", height: 44 }}
                            >
                              {t.label}
                            </Button>
                          </Grid>
                        ))}
                      </Grid>
                    </Stack>
                  )}

                  {chartTab === "fields" && (
                    <Stack spacing={2}>
                      <TextField
                        size="small"
                        placeholder="Search fields"
                        value={chartFieldSearch}
                        onChange={(e) => setChartFieldSearch(e.target.value)}
                      />
                      <Stack spacing={1}>
                        {chartFields.map((c) => (
                          <Box key={c} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Typography>{c}</Typography>
                            <Stack direction="row" spacing={1}>
                              <Button
                                size="small"
                                variant={chartX === c ? "contained" : "outlined"}
                                onClick={() => setChartX(c)}
                              >
                                X
                              </Button>
                              <Button
                                size="small"
                                variant={chartY === c ? "contained" : "outlined"}
                                onClick={() => setChartY(c)}
                                disabled={!numericColumns.includes(c)}
                              >
                                Y
                              </Button>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </Stack>
                  )}

                  {chartTab === "customize" && (
                    <Stack spacing={2}>
                      {(chartType === "column" || chartType === "bar") && (
                        <>
                          <TextField
                            size="small"
                            label="Border radius"
                            type="number"
                            value={chartBorderRadius}
                            onChange={(e) => setChartBorderRadius(Number(e.target.value))}
                          />
                          <TextField
                            size="small"
                            label="Category gap ratio"
                            type="number"
                            inputProps={{ step: 0.05, min: 0 }}
                            value={chartCategoryGap}
                            onChange={(e) => setChartCategoryGap(Number(e.target.value))}
                          />
                          <TextField
                            size="small"
                            label="Series gap ratio"
                            type="number"
                            inputProps={{ step: 0.05, min: 0 }}
                            value={chartSeriesGap}
                            onChange={(e) => setChartSeriesGap(Number(e.target.value))}
                          />
                        </>
                      )}
                      {(chartType === "line" || chartType === "area") && (
                        <>
                          <TextField
                            size="small"
                            label="Line width"
                            type="number"
                            inputProps={{ min: 1 }}
                            value={chartLineWidth}
                            onChange={(e) => setChartLineWidth(Number(e.target.value))}
                          />
                          {chartType === "area" && (
                            <TextField
                              size="small"
                              label="Area opacity"
                              type="number"
                              inputProps={{ step: 0.05, min: 0, max: 1 }}
                              value={chartAreaOpacity}
                              onChange={(e) => setChartAreaOpacity(Number(e.target.value))}
                            />
                          )}
                        </>
                      )}
                      {chartType === "pie" && (
                        <TextField
                          size="small"
                          label="Inner radius"
                          type="number"
                          inputProps={{ min: 0 }}
                          value={chartPieInnerRadius}
                          onChange={(e) => setChartPieInnerRadius(Number(e.target.value))}
                        />
                      )}
                    </Stack>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {chartY && numericColumns.length > 0 ? (
                    <Box>
                      {chartType === "pie" ? (
                        <PieChart
                          series={[{ data: pieData, innerRadius: chartPieInnerRadius }]}
                          height={320}
                        />
                      ) : chartType === "line" || chartType === "area" ? (
                        <LineChart
                          xAxis={[{ scaleType: "band", data: chartData.map((d) => d.x) }]}
                          series={[
                            {
                              data: chartData.map((d) => d.y),
                              label: chartY,
                              area: chartType === "area",
                              areaOpacity: chartAreaOpacity,
                              strokeWidth: chartLineWidth,
                            },
                          ]}
                          height={320}
                        />
                      ) : chartType === "bar" ? (
                        <BarChart
                          dataset={chartData}
                          xAxis={[{ scaleType: "linear" }]}
                          yAxis={[{ scaleType: "band", dataKey: "x" }]}
                          series={[
                            {
                              dataKey: "y",
                              label: chartY,
                              borderRadius: chartBorderRadius,
                            },
                          ]}
                          height={320}
                          layout="horizontal"
                          categoryGapRatio={chartCategoryGap}
                          barGapRatio={chartSeriesGap}
                        />
                      ) : (
                        <BarChart
                          dataset={chartData}
                          xAxis={[{ scaleType: "band", dataKey: "x" }]}
                          yAxis={[{ scaleType: "linear" }]}
                          series={[
                            {
                              dataKey: "y",
                              label: chartY,
                              borderRadius: chartBorderRadius,
                            },
                          ]}
                          height={320}
                          layout="vertical"
                          categoryGapRatio={chartCategoryGap}
                          barGapRatio={chartSeriesGap}
                        />
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Select a numeric column to plot.
                    </Typography>
                  )}

                  {chartSampling === "sample" && rowsForGrid.length > chartSampleLimit && (
                    <Typography variant="caption" sx={{ display: "block", mt: 1, color: "warning.main" }}>
                      Showing a sample of {chartSampleLimit} rows from {rowsForGrid.length}.
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
                    Showing {chartData.length} of {rowsForGrid.length} rows
                  </Typography>
                </DialogContent>
              </Dialog>

              <Menu
                anchorEl={configAnchor}
                open={Boolean(configAnchor)}
                onClose={() => setConfigAnchor(null)}
              >
                <MenuItem
                  onClick={() => {
                    setConfigAnchor(null);
                    openTemplateEditor("validations");
                  }}
                >
                  Validations
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setConfigAnchor(null);
                    openTemplateEditor("access");
                  }}
                >
                  Access
                </MenuItem>
              </Menu>

              <Menu
                anchorEl={recordMenuAnchor}
                open={Boolean(recordMenuAnchor)}
                onClose={closeRecordMenu}
              >
                <MenuItem
                  onClick={() => {
                    if (recordMenuRow) openView(recordMenuRow);
                    closeRecordMenu();
                  }}
                >
                  <VisibilityOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                  View
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    if (recordMenuRow) openEdit(recordMenuRow);
                    closeRecordMenu();
                  }}
                >
                  <ModeEditOutlineOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                  Edit
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    if (recordMenuRow) handleDelete(recordMenuRow);
                    closeRecordMenu();
                  }}
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                  Delete
                </MenuItem>
              </Menu>

              {recordsView === "grid" && (
                <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end" }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_e, p) => setPage(p)}
                    size="small"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
          )}
        </Box>
      </Box>

      {/* Create/Edit/View modal */}
      {activePage && recModalOpen && (
        <Overlay onClose={() => setRecModalOpen(false)}>
          <>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {recMode === "create" ? "Create" : recMode === "edit" ? "Edit" : "View"} Record
            </Typography>

            <Grid container spacing={1.5}>
              {formFields
                .filter((f, idx) => {
                  const key =
                    f?.columnName ??
                    f?.name ??
                    f?.field ??
                    f?.column ??
                    f?.field_name ??
                    f?.column_name ??
                    `field_${idx}`;
                  const modeKey = recMode === "create" ? "create" : "edit";
                  const validation = validationForField(templateValidations, modeKey, key);
                  return (
                    key &&
                    key !== pkName &&
                    !["date_created", "date_modified", "created_by", "modified_by"].includes(
                      String(key).toLowerCase()
                    ) &&
                    f?.visible !== false &&
                    validation.visible !== false
                  );
                })
                .map((f, idx) => {
                  const key =
                    f?.columnName ??
                    f?.name ??
                    f?.field ??
                    f?.column ??
                    f?.field_name ??
                    f?.column_name ??
                    `field_${idx}`;
                  const modeKey = recMode === "create" ? "create" : "edit";
                  const validation = validationForField(templateValidations, modeKey, key);
                  const label =
                    f?.label ?? f?.caption ?? f?.title ?? f?.display ?? key;
                  const inputType = String(f?.inputType ?? f?.controlType ?? f?.dataType ?? f?.type ?? "")
                    .toLowerCase();
                  const dataType = String(f?.dataType ?? "").toLowerCase();
                  const options = parseOptions(f?.optionsCsv);
                  const pairs = codeLabelPairs(options);
                  const isInt = dataType.includes("int");
                  const rawValue = recValues[key];
                  const dateGran = String(f?.dateGranularity ?? f?.format ?? "date").toLowerCase();
                  const dateType = dateGran === "month" ? "month" : dateGran === "year" ? "number" : "date";
                  const value = inputType === "date" ? normalizeDate(rawValue) : rawValue ?? "";
                  const disabled =
                    recMode === "view" ||
                    !!f?.readOnly ||
                    validation.read_only ||
                    validation.data_entry === false;

                  if (inputType === "checkbox" && options.length) {
                    const rawSelected = parseMultiValue(rawValue);
                    const selected = isInt
                      ? rawSelected.map((v) => Number(v)).filter((n) => Number.isFinite(n))
                      : rawSelected.map((v) => String(v));
                    return (
                      <Grid item xs={12} key={key}>
                        <FormControl fullWidth size="small" disabled={disabled}>
                          <InputLabel shrink>{label}</InputLabel>
                          <Box sx={{ display: "flex", flexDirection: "column", mt: 1 }}>
                            {pairs.map(({ code, label: optLabel }, i) => {
                              const checked = isInt ? selected.includes(code) : selected.includes(optLabel);
                              return (
                                <FormControlLabel
                                  key={`${key}_opt_${i}`}
                                  control={
                                    <Checkbox
                                      checked={checked}
                                      onChange={(e) => {
                                        const value = isInt ? code : optLabel;
                                        const next = e.target.checked
                                          ? [...selected, value]
                                          : selected.filter((v) => v !== value);
                                        setRecValues((v) => ({ ...v, [key]: next }));
                                      }}
                                      disabled={disabled}
                                    />
                                  }
                                  label={optLabel}
                                />
                              );
                            })}
                          </Box>
                        </FormControl>
                      </Grid>
                    );
                  }

                  if (inputType === "checkbox") {
                    return (
                      <Grid item xs={12} key={key}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(rawValue)}
                              onChange={(e) =>
                                setRecValues((v) => ({ ...v, [key]: e.target.checked }))
                              }
                              disabled={disabled}
                            />
                          }
                          label={label}
                        />
                      </Grid>
                    );
                  }

                  if (inputType === "radio") {
                    return (
                      <Grid item xs={12} key={key}>
                        <FormControl fullWidth disabled={disabled}>
                          <InputLabel shrink>{label}</InputLabel>
                          <RadioGroup
                            value={value === null || value === undefined ? "" : String(value)}
                            onChange={(e) =>
                              setRecValues((v) => ({
                                ...v,
                                [key]: isInt ? Number(e.target.value) : e.target.value,
                              }))
                            }
                          >
                            {pairs.map(({ code, label: optLabel }) => (
                              <FormControlLabel
                                key={`${key}_radio_${code}`}
                                value={String(isInt ? code : optLabel)}
                                control={<Radio />}
                                label={optLabel}
                              />
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </Grid>
                    );
                  }

                  if (inputType === "dropdownlist") {
                    return (
                      <Grid item xs={12} key={key}>
                        <FormControl fullWidth size="small" disabled={disabled}>
                          <InputLabel>{label}</InputLabel>
                          <Select
                            label={label}
                            value={value === null || value === undefined ? "" : String(value)}
                            onChange={(e) =>
                              setRecValues((v) => ({
                                ...v,
                                [key]: isInt ? Number(e.target.value) : e.target.value,
                              }))
                            }
                          >
                            {pairs.map(({ code, label: optLabel }) => (
                              <MenuItem key={`${key}_opt_${code}`} value={String(isInt ? code : optLabel)}>
                                {optLabel}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    );
                  }

                  if (inputType === "image") {
                    const attachments = parseAttachmentValue(rawValue);
                    return (
                      <Grid item xs={12} key={key}>
                        <Box>
                          <InputLabel shrink>{label}</InputLabel>
                          {attachments.length > 0 && (
                            <List dense sx={{ mt: 1 }}>
                              {attachments.map((f, i) => (
                                <ListItem
                                  key={`${key}_file_${i}`}
                                  secondaryAction={
                                    f?.id ? (
                                      <Button
                                        size="small"
                                        onClick={() => handleDownloadAttachment(f)}
                                      >
                                        Download
                                      </Button>
                                    ) : null
                                  }
                                >
                                  <ListItemText
                                    primary={f?.original_filename || f?.name || `file_${i + 1}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          )}
                          {!disabled && (
                            <SecureFileUploader
                              files={fileFields[key] || []}
                              setFiles={(next) => setFileFields((s) => ({ ...s, [key]: next }))}
                              multiple
                            />
                          )}
                        </Box>
                      </Grid>
                    );
                  }

                  const fieldType =
                    inputType === "textarea"
                      ? "textarea"
                      : inputType === "date"
                        ? dateType
                        : inputType === "integer" || inputType === "number" || dataType.includes("int")
                          ? "number"
                          : "text";

                  return (
                    <Grid item xs={12} key={key}>
                      <TextField
                        fullWidth
                        size="small"
                        label={label}
                        required={validation.mandatory}
                        type={fieldType === "textarea" ? "text" : fieldType}
                        multiline={fieldType === "textarea"}
                        minRows={fieldType === "textarea" ? 3 : undefined}
                        InputLabelProps={fieldType === "date" ? { shrink: true } : undefined}
                        value={value ?? ""}
                        onChange={(e) =>
                          setRecValues((v) => ({
                            ...v,
                            [key]: fieldType === "number" && e.target.value !== ""
                              ? Number(e.target.value)
                              : e.target.value,
                          }))
                        }
                        disabled={disabled}
                      />
                    </Grid>
                  );
                })}
            </Grid>

            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => setRecModalOpen(false)}>
                Close
              </Button>
              {(recMode === "create" || recMode === "edit") && (
                <Button variant="contained" onClick={handleSaveRecord}>
                  {recMode === "create" ? "Save" : "Update"}
                </Button>
              )}
            </Stack>
          </>
        </Overlay>
      )}

      {templateModalOpen && activePage?.table_name && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            bgcolor: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <iframe
            title="datatablebuilder"
            src={`/datatablebuilder?table=${encodeURIComponent(activePage.table_name)}&section=${templateModalSection}&embedded=1&pageId=${encodeURIComponent(activePage.id)}`}
            style={{
              width: "min(1000px, 96vw)",
              height: "85vh",
              border: "none",
              borderRadius: 0,
              //boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              background: "transparent",
            }}
          />
        </Box>
      )}
    </Box>
  );
}


