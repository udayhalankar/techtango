// src/pages/businessautomation/crudpagebuilder/CrudPageBuilder.jsx

import React, { useEffect, useMemo, useState } from "react";

import ReusableFormModal from "../../../components/ReusableFormModal";

import { useParams } from "react-router-dom";

import api from "../../../services/api";

import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  Typography,
  Paper,
  TextField,
  Autocomplete,
  OutlinedInput,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  IconButton,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  RadioGroup,
  Radio,
  ListItem,
} from "@mui/material";

import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  useGridApiRef,
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

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";

import CloseIcon from "@mui/icons-material/Close";

import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

import MoreVertIcon from "@mui/icons-material/MoreVert";

import * as XLSX from "xlsx";

import SecureFileUploader from "../../../components/SecureFileUploader";

import ModuleTileGrid from "../../../components/ModuleTileGrid";

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
  const PER_PAGE = 8;
  const [recordsView, setRecordsView] = useState("table");
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




const renderRecordTileContent = (tile) => {
  const record = tile.record || {};

  /* ---------------------------------------------------------
     FIND COLUMN CASE-INSENSITIVELY
  --------------------------------------------------------- */

  const findColumn = (...names) => {
    const wanted = names.map((name) =>
      String(name).toLowerCase()
    );

    return (columns || []).find((column) =>
      wanted.includes(
        String(column).toLowerCase()
      )
    );
  };

  /* ---------------------------------------------------------
     AUDIT FIELDS
  --------------------------------------------------------- */

  const createdByField = findColumn(
    "created_by"
  );

  const createdDateField = findColumn(
    "date_created",
    "created_at"
  );

  const modifiedByField = findColumn(
    "modified_by",
    "updated_by"
  );

  const modifiedDateField = findColumn(
    "date_modified",
    "modified_at",
    "updated_at"
  );

  const statusField =
    tile.statusField ||
    findColumn("status");

  /* ---------------------------------------------------------
     DATE FORMAT
  --------------------------------------------------------- */

  const formatTileDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
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

  /* ---------------------------------------------------------
     AUDIT ROW
  --------------------------------------------------------- */

  const TileRow = ({
    label,
    value,
  }) => (
    <Box
      sx={{
        display: "grid",

        /*
          Tight label/value spacing
        */
        gridTemplateColumns:
          "72px minmax(0, 1fr)",

        alignItems: "center",

        columnGap: 0.3,

        minWidth: 0,

        height: 17,
      }}
    >
      <Typography
        noWrap
        sx={{
          fontSize: 9.8,

          color: "#738496",

          fontWeight: 500,

          lineHeight: 1,
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

          overflow: "hidden",

          textOverflow: "ellipsis",

          whiteSpace: "nowrap",

          fontSize: 10.3,

          color: "#33485d",

          fontWeight: 600,

          lineHeight: 1,
        }}
      >
        {value ?? "-"}
      </Typography>
    </Box>
  );

  /* ---------------------------------------------------------
     TILE
  --------------------------------------------------------- */

  return (
    <>
      {/* TITLE */}

      <Typography
        title={tile.label}
        noWrap
        sx={{
          width: "100%",

          minHeight: 22,

          display: "flex",

          alignItems: "center",

          overflow: "hidden",

          textOverflow: "ellipsis",

          whiteSpace: "nowrap",

          fontSize: 14,

          fontWeight: 700,

          lineHeight: "20px",

          color: "#172b4d",

          pr: 1,

          pt: "1px",
        }}
      >
        {tile.label}
      </Typography>

      {/* STATUS */}

      {statusField &&
      record?.[statusField] !== null &&
      record?.[statusField] !== undefined &&
      String(
        record[statusField]
      ).trim() !== "" ? (
        <Typography
          noWrap
          title={String(
            record[statusField]
          )}
          sx={{
            mt: 0.15,

            width: "100%",

            overflow: "hidden",

            textOverflow:
              "ellipsis",

            whiteSpace: "nowrap",

            fontSize: 10,

            fontWeight: 700,

            lineHeight: 1.1,

            color: "#c62828",

            textTransform:
              "uppercase",
          }}
        >
          {String(
            record[statusField]
          )}
        </Typography>
      ) : null}

      {/* 
        THIS FLEX SPACE IS IMPORTANT.

        It pushes the audit information
        and Actions button to the bottom.
      */}

      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
        }}
      />

      {/* =====================================================
          BOTTOM AREA

          Audit fields and Actions share the same bottom edge.
         ===================================================== */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns:
            "minmax(0, 1fr) auto",

          alignItems: "end",

          columnGap: 1,

          minWidth: 0,

          width: "100%",
        }}
      >
        {/* AUDIT FIELDS */}

        <Box
          sx={{
            display: "grid",

            /*
              Very tight spacing between all
              four rows.
            */
            rowGap: "1px",

            minWidth: 0,

            pb: 0,
          }}
        >
          <TileRow
            label="Created By"
            value={
              createdByField
                ? record[
                    createdByField
                  ]
                : "-"
            }
          />

          <TileRow
            label="Date Created"
            value={
              createdDateField
                ? formatTileDate(
                    record[
                      createdDateField
                    ]
                  )
                : "-"
            }
          />

          <TileRow
            label="Modified By"
            value={
              modifiedByField
                ? record[
                    modifiedByField
                  ]
                : "-"
            }
          />

          <TileRow
            label="Date Modified"
            value={
              modifiedDateField
                ? formatTileDate(
                    record[
                      modifiedDateField
                    ]
                  )
                : "-"
            }
          />
        </Box>

        {/* ACTIONS */}

        <Button
          size="small"
          endIcon={
            <ExpandMoreIcon />
          }
          onClick={(event) => {
            event.stopPropagation();

            setRecordMenuAnchor(
              event.currentTarget
            );

            setRecordMenuRow(
              record
            );
          }}
          sx={{
            height: 26,

            minHeight: 26,

            px: 1,

            mb: 0,

            borderRadius: "6px",

            bgcolor: "#eaf3fc",

            color: "#0a6ed1",

            textTransform: "none",

            fontSize: 10.5,

            fontWeight: 700,

            lineHeight: 1,

            alignSelf: "end",

            "& .MuiButton-endIcon":
              {
                ml: 0.45,
              },

            "&:hover": {
              bgcolor: "#dcecfb",
            },
          }}
        >
          Actions
        </Button>
      </Box>
    </>
  );
};





const recordsViewSelector = (
  <ToggleButtonGroup
    size="small"
    exclusive
    value={recordsView}
    onChange={(_event, value) =>
      value && setRecordsView(value)
    }
    sx={{
      height: 36,

      "& .MuiToggleButton-root": {
        width: 38,
        p: 0,

        borderColor: "#d6dde5",

        color: "#63778b",

        "&.Mui-selected": {
          bgcolor: "#eaf3fc",
          color: "#0a6ed1",
        },

        "&.Mui-selected:hover": {
          bgcolor: "#dfedfb",
        },
      },
    }}
  >
    <ToggleButton value="grid">
      <ViewModuleIcon
        sx={{ fontSize: 17 }}
      />
    </ToggleButton>

    <ToggleButton value="table">
      <TableRowsIcon
        sx={{ fontSize: 17 }}
      />
    </ToggleButton>
  </ToggleButtonGroup>
);

  const RecordsToolbar = () => (
    <GridToolbarContainer
      sx={{
        minHeight: 48,
        px: 1.25,
        py: 0.75,
        gap: 0.75,
        bgcolor: "#FFFFFF",
        borderBottom: "1px solid #DCE6F0",

        "& .MuiButton-root": {
          minHeight: 32,
          px: 1.15,
          border: "1px solid #C9D8E8",
          borderRadius: "4px",
          textTransform: "none",
          fontSize: 12.5,
          fontWeight: 600,
          color: "#0B5CAD",
          bgcolor: "#FFFFFF",
        },

        "& .MuiButton-root:hover": {
          bgcolor: "#F3F8FD",
          borderColor: "#9FC0DF",
        },

        "& .MuiButton-startIcon": {
          color: "#0B6BCB",
        },

        "& .MuiSvgIcon-root": {
          fontSize: 17,
        },
      }}
    >
      <OutlinedInput
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search records..."
        sx={{
          width: 380,
          height: 36,
          bgcolor: "#FFFFFF",
          borderRadius: "4px",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#C9D8E8",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#91B9DD",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#0B6BCB",
            borderWidth: "1px",
          },
        }}
        startAdornment={
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 18, color: "#64748B" }} />
          </InputAdornment>
        }
      />

      <Box sx={{ flexGrow: 1 }} />

      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />

      <Button
        size="small"
        variant="text"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setExportMenuPosition({
            top: rect.bottom + 4,
            left: rect.left,
          });
        }}
      >
        Export
      </Button>

      <Menu
        open={Boolean(exportMenuPosition)}
        onClose={() => setExportMenuPosition(null)}
        anchorReference="anchorPosition"
        anchorPosition={exportMenuPosition || undefined}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            borderRadius: "4px",
            mt: 0.5,
            border: "1px solid #DCE6F0",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.10)",
            "& .MuiMenuItem-root": {
              fontSize: 13,
              minHeight: 36,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            apiRef.current.exportDataAsCsv({
              fileName: activePage?.page_name || "records",
            });
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

      <Button
        size="small"
        variant="text"
        startIcon={<BarChartOutlinedIcon />}
        onClick={() => setChartOpen(true)}
      >
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

const recordTiles = useMemo(() => {
  const SYSTEM_FIELDS = new Set([
    "id",
    "seq",
    "date_created",
    "created_at",
    "created_by",
    "date_modified",
    "modified_at",
    "modified_by",
    "updated_at",
    "updated_by",
  ]);

  /*
    First BUSINESS column becomes the tile title.

    Example columns:
    id
    fullname
    age
    dob
    city
    created_by
    date_created

    => title field = fullname
  */
  const titleField =
    (columns || []).find(
      (column) =>
        !SYSTEM_FIELDS.has(
          String(column).toLowerCase()
        ) &&
        String(column).toLowerCase() !==
          String(pkName).toLowerCase()
    ) || pkName;

  /*
    Find status column regardless of case.
    Supports STATUS / status / Status.
  */
  const statusField =
    (columns || []).find(
      (column) =>
        String(column).toLowerCase() ===
        "status"
    ) || null;

  return rows.map((record, index) => {
    const id =
      record?.[pkName] ??
      record?.id ??
      index;

    const titleValue =
      record?.[titleField];

    return {
      id,

      label:
        titleValue !== null &&
        titleValue !== undefined &&
        String(titleValue).trim() !== ""
          ? String(titleValue)
          : `Record ${id}`,

      titleField,

      statusField,

      record,

      searchText: Object.values(
        record || {}
      )
        .map((value) =>
          String(value ?? "")
        )
        .join(" "),

      onClick: () =>
        openView(record),
    };
  });
}, [
  rows,
  columns,
  pkName,
]);

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
        width: 120,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconButton
              size="small"
              aria-label="View record"
              onClick={() => openView(params.row)}
              sx={{
                width: 30,
                height: 30,
                border: "1px solid #C9D8E8",
                borderRadius: "4px",
                color: "#0B6BCB",
                bgcolor: "#FFFFFF",
                "&:hover": {
                  bgcolor: "#F0F7FF",
                  borderColor: "#91B9DD",
                },
              }}
            >
              <VisibilityOutlinedIcon sx={{ fontSize: 17 }} />
            </IconButton>

            <IconButton
              size="small"
              aria-label="More record actions"
              onClick={(event) => {
                setRecordMenuAnchor(event.currentTarget);
                setRecordMenuRow(params.row);
              }}
              sx={{
                width: 30,
                height: 30,
                border: "1px solid #C9D8E8",
                borderRadius: "4px",
                color: "#0B6BCB",
                bgcolor: "#FFFFFF",
                "&:hover": {
                  bgcolor: "#F0F7FF",
                  borderColor: "#91B9DD",
                },
              }}
            >
              <MoreVertIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
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

  const settingsButton = (
    <IconButton
      size="small"
      onClick={(event) =>
        setConfigAnchor(event.currentTarget)
      }
      sx={{
        width: 36,
        height: 36,

        border: "1px solid #d6dde5",
        borderRadius: "4px",

        bgcolor: "#ffffff",
        color: "#0a6ed1",

        "&:hover": {
          bgcolor: "#f2f7fc",
          borderColor: "#aebcca",
        },
      }}
    >
      <SettingsOutlinedIcon
        sx={{
          fontSize: 18,
        }}
      />
    </IconButton>
  );

  /* =========================================================================
     BUILDER MODE
     /crudwebpage
     ========================================================================= */

  if (!standaloneId) {
  return (
    <>
      <ModuleTileGrid
        title="Data Application Builder"
        subtitle="Build full data-driven applications without coding."
        
        tiles={(pages || []).map((p) => ({
  id: p.id,

  label:
    p.page_name ||
    "Untitled Application",

  desc: [
    p.form_name
      ? `Form: ${p.form_name}`
      : null,

    p.table_name
      ? `Table: ${p.table_name}`
      : null,
  ]
    .filter(Boolean)
    .join(" · "),

  searchText: [
    p.page_name,
    p.form_name,
    p.table_name,
    p.description,
  ]
    .filter(Boolean)
    .join(" "),

  /*
   * Deliberately no tile-level onClick.
   *
   * This tile contains its own Delete/Open buttons.
   * If onClick is supplied, ModuleTileGrid renders
   * the tile itself as <button>, causing nested buttons.
   */
}))}

        searchPlaceholder="Search data applications"
        primaryAction={{
          label:
            "Create New Data Application",

          onClick: () => {
            setPageName("");
            setFormName("");
            setDescription("");
            setTableName(null);
            setCreateModalOpen(true);
          },
        }}
        showDefaultFooter={false}
        renderTileContent={(tile) => {
          const pageRow = pages.find(
            (p) => p.id === tile.id
          );

          if (!pageRow) return null;

          return (
            <>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#223548",

                  lineHeight: 1.35,

                  display: "-webkit-box",
                  WebkitBoxOrient:
                    "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                }}
              >
                {pageRow.page_name ||
                  "Untitled Application"}
              </Typography>

              <Box
                sx={{
                  mt: 1.2,
                  display: "grid",
                  gap: 0.55,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 10.8,
                    color: "#738496",
                  }}
                >
                  ID
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      color: "#33485d",
                      fontWeight: 600,
                    }}
                  >
                    {pageRow.id ?? "-"}
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    fontSize: 10.8,
                    color: "#738496",
                  }}
                >
                  Form
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      color: "#33485d",
                      fontWeight: 600,
                    }}
                  >
                    {pageRow.form_name ||
                      "-"}
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    fontSize: 10.8,
                    color: "#738496",
                  }}
                >
                  Table
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      color: "#33485d",
                      fontWeight: 600,
                    }}
                  >
                    {pageRow.table_name ||
                      "-"}
                  </Box>
                </Typography>
              </Box>

              <Box sx={{ flexGrow: 1 }} />

              <Stack
                direction="row"
                justifyContent="flex-end"
                spacing={1}
              >
                <Button
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();

                    handleDeletePage(
                      pageRow.id
                    );
                  }}
                  sx={{
                    minHeight: 28,
                    px: 1.1,

                    border:
                      "1px solid #f0b8b4",

                    borderRadius: "4px",

                    color: "#b42318",

                    textTransform:
                      "none",

                    fontSize: 10.5,

                    "&:hover": {
                      bgcolor:
                        "#fdf2f1",
                    },
                  }}
                >
                  Delete
                </Button>

                <Button
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();

                    window.open(
                      pageRow.page_url ||
                        `/crudwebpage/${pageRow.id}`,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                  sx={{
                    minHeight: 28,
                    px: 1.2,

                    borderRadius: "4px",

                    bgcolor: "#eaf3fc",
                    color: "#0a6ed1",

                    textTransform:
                      "none",

                    fontSize: 10.5,
                    fontWeight: 700,

                    "&:hover": {
                      bgcolor:
                        "#dcecfb",
                    },
                  }}
                >
                  Open
                </Button>
              </Stack>
            </>
          );
        }}
      >
        {/* no custom children */}
            </ModuleTileGrid>

      {/* ============================================================
          CREATE DATA APPLICATION
      ============================================================ */}

      <Dialog
        open={createModalOpen}
        onClose={() =>
          setCreateModalOpen(false)
        }
        fullWidth
        maxWidth="sm"
        BackdropProps={{
          sx: {
            backdropFilter:
              "none !important",

            WebkitBackdropFilter:
              "none !important",

            backgroundColor:
              "rgba(17,31,46,.38) !important",
          },
        }}
        PaperProps={{
          sx: {
            width:
              "min(620px, 94vw)",

            borderRadius:
              "4px",

            overflow: "visible",

            border:
              "1px solid #d6e1e9",

            boxShadow:
              "0 18px 50px rgba(28,45,65,.20)",
          },
        }}
      >
        {/* HEADER */}

        <Box
          sx={{
            px: 2.25,
            py: 1.6,

            background:
              "linear-gradient(105deg, #176f87 0%, #2188a0 100%)",

            color:
              "#ffffff",
          }}
        >
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            Create New Data Application
          </Typography>

          <Typography
            sx={{
              mt: 0.35,

              fontSize: 10.5,

              color:
                "rgba(255,255,255,.82)",
            }}
          >
            Define the application name, form and source table.
          </Typography>
        </Box>

        {/* BODY */}

        <DialogContent
          sx={{
            p: 2.25,

            bgcolor:
              "#fbfcfd",
          }}
        >
          <Grid
            container
            spacing={1.5}
          >
            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                size="small"
                label="Page Name"
                value={pageName}
                onChange={(e) =>
                  setPageName(
                    e.target.value
                  )
                }
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
            >
              <TextField
                fullWidth
                size="small"
                label="Form Name"
                value={formName}
                onChange={(e) =>
                  setFormName(
                    e.target.value
                  )
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                  fullWidth
                  size="small"
                  disablePortal

                  options={tables}
                  value={tableName}

                  onChange={(_event, value) =>
                    setTableName(value)
                  }

                  ListboxProps={{
                    sx: {
                      maxHeight: 190,
                      py: 0.5,

                      "& .MuiAutocomplete-option": {
                        minHeight: 30,
                        fontSize: 12,
                      },
                    },
                  }}

                  componentsProps={{
                    paper: {
                      sx: {
                        borderRadius: "4px",
                        border: "1px solid #d6e1e9",
                        boxShadow: "0 8px 20px rgba(15,23,42,.14)",
                      },
                    },
                  }}

                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Table"
                      placeholder="Select data table"
                    />
                  )}
                />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={3}
                label="Description"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
              />
            </Grid>
          </Grid>
        </DialogContent>

        {/* FOOTER */}

        <DialogActions
          sx={{
            px: 2.25,
            py: 1.4,

            borderTop:
              "1px solid #e3eaef",

            bgcolor:
              "#ffffff",
          }}
        >
          <Button
            size="small"
            variant="outlined"
            onClick={() =>
              setCreateModalOpen(
                false
              )
            }
            sx={{
              minHeight: 32,
              borderRadius:
                "3px",
              textTransform:
                "none",
            }}
          >
            Cancel
          </Button>

          <Button
            size="small"
            variant="contained"
            onClick={
              handleCreatePage
            }
            sx={{
              minHeight: 32,
              borderRadius:
                "3px",
              textTransform:
                "none",

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
            Create Application
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

  /* =========================================================================
     STANDALONE GENERATED APPLICATION
     /crudwebpage/:pageId
     ========================================================================= */

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f6f7",
      }}
    >
      {activePage ? (
  <ModuleTileGrid
    title={
      activePage?.page_name ||
      "CRUD Webpage"
    }
    subtitle={
      activePage?.description || ""
    }

    /*
      Grid gets ModuleTileGrid search.
      Table gets its own DataGrid toolbar search.
    */
    searchEnabled={
      recordsView === "grid"
    }

    searchPlaceholder="Search records"

    /*
      Keep Create New Record inherited
      from ModuleTileGrid.
    */
    primaryAction={{
      label: "Create New Record",
      onClick: openCreate,
    }}

    /*
      Put BOTH Settings and the view selector
      in titleBarActions.

      This guarantees the Grid/Table selector
      is visible even if an older ModuleTileGrid
      is accidentally still being served.
    */
    titleBarActions={
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
      >
        {/* SETTINGS */}

        <IconButton
          size="small"
          onClick={(event) =>
            setConfigAnchor(
              event.currentTarget
            )
          }
          sx={{
            width: 36,
            height: 36,

            border:
              "1px solid rgba(255,255,255,.25)",

            borderRadius: "4px",

            bgcolor:
              "rgba(255,255,255,.12)",

            color: "#ffffff",

            "&:hover": {
              bgcolor:
                "rgba(255,255,255,.20)",
            },
          }}
        >
          <SettingsOutlinedIcon
            sx={{
              fontSize: 18,
            }}
          />
        </IconButton>

        {/* GRID / TABLE */}

        <ToggleButtonGroup
          size="small"
          exclusive
          value={recordsView}
          onChange={(_event, value) => {
            if (value) {
              setRecordsView(value);
            }
          }}
          sx={{
            height: 36,

            bgcolor:
              "rgba(255,255,255,.10)",

            borderRadius: "4px",

            "& .MuiToggleButton-root": {
              width: 40,

              p: 0,

              color:
                "rgba(255,255,255,.85)",

              borderColor:
                "rgba(255,255,255,.22)",

              "&.Mui-selected": {
                bgcolor: "#ffffff",
                color: "#344f67",
              },

              "&.Mui-selected:hover": {
                bgcolor: "#ffffff",
              },

              "&:hover": {
                bgcolor:
                  "rgba(255,255,255,.16)",
              },
            },
          }}
        >
          <ToggleButton
            value="grid"
            aria-label="Grid view"
          >
            <ViewModuleIcon
              sx={{
                fontSize: 17,
              }}
            />
          </ToggleButton>

          <ToggleButton
            value="table"
            aria-label="Table view"
          >
            <TableRowsIcon
              sx={{
                fontSize: 17,
              }}
            />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    }

    /*
      GRID MODE:
      ModuleTileGrid receives actual record tiles.

      TABLE MODE:
      children are supplied below, so the normal
      tile grid is not rendered.
    */
    tiles={
      recordsView === "grid"
        ? recordTiles
        : []
    }

    renderTileContent={
      recordsView === "grid"
        ? renderRecordTileContent
        : undefined
    }

    showDefaultFooter={false}
  >
    {/* ============================================================
        TABLE VIEW
       ============================================================ */}

    {recordsView === "table" ? (
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
        }}
      >
        <DataGrid
          apiRef={apiRef}

          autoHeight

          density="compact"

          rows={rowsForGrid}

          columns={gridColumns}

          loading={loading}

          disableRowSelectionOnClick

          pageSizeOptions={[
            5,
            10,
            25,
            50,
          ]}

          paginationModel={{
            page: tablePage,
            pageSize:
              tablePageSize,
          }}

          onPaginationModelChange={(
            model
          ) => {
            if (
              tablePage !==
              model.page
            ) {
              setTablePage(
                model.page
              );
            }

            if (
              tablePageSize !==
              model.pageSize
            ) {
              setTablePageSize(
                model.pageSize
              );
            }
          }}

          initialState={{
            columns: {
              columnVisibilityModel:
                defaultVisibleColumns,
            },
          }}

          slots={{
            toolbar:
              RecordsToolbar,
          }}

          slotProps={{
            pagination: {
              SelectProps: {
                MenuProps: {
                  BackdropProps: {
                    sx: {
                      backdropFilter:
                        "none !important",

                      WebkitBackdropFilter:
                        "none !important",

                      backgroundColor:
                        "transparent !important",
                    },
                  },
                },
              },
            },
          }}

          onRowDoubleClick={(
            params
          ) =>
            openView(params.row)
          }

          sx={{
            border:
              "1px solid #dce2e8",

            borderRadius:
              "6px",

            bgcolor:
              "#ffffff",

            color:
              "#223548",

            fontSize: 12,

            overflow:
              "hidden",

            /* ==============================================
               HEADER
               ============================================== */

            "& .MuiDataGrid-columnHeaders":
              {
                bgcolor:
                  "#344f67",

                color:
                  "#ffffff",

                borderBottom:
                  "none",

                minHeight:
                  "42px !important",

                maxHeight:
                  "42px !important",
              },

            "& .MuiDataGrid-columnHeader":
              {
                bgcolor:
                  "#344f67",

                outline:
                  "none !important",

                px: 1.4,
              },

            "& .MuiDataGrid-columnHeaderTitle":
              {
                fontSize:
                  10.8,

                fontWeight:
                  700,

                letterSpacing:
                  "0.03em",

                textTransform:
                  "uppercase",
              },

            "& .MuiDataGrid-columnHeader .MuiSvgIcon-root, & .MuiDataGrid-menuIconButton, & .MuiDataGrid-sortIcon":
              {
                color:
                  "#dce8f3",
              },

            /* ==============================================
               ROWS
               ============================================== */

            "& .MuiDataGrid-row":
              {
                borderBottom:
                  "1px solid #edf0f3",

                transition:
                  "background-color .12s ease",
              },

            "& .MuiDataGrid-row:hover":
              {
                bgcolor:
                  "#f8fafc !important",
              },

            "& .MuiDataGrid-row.Mui-selected":
              {
                bgcolor:
                  "#f0f6fc !important",
              },

            /* ==============================================
               CELLS
               ============================================== */

            "& .MuiDataGrid-cell":
              {
                display:
                  "flex",

                alignItems:
                  "center",

                borderBottom:
                  "none",

                px: 1.4,

                outline:
                  "none !important",
              },

            /* ==============================================
               TOOLBAR
               ============================================== */

            "& .MuiDataGrid-toolbarContainer":
              {
                borderBottom:
                  "1px solid #edf0f3",
              },

            /* ==============================================
               FOOTER
               ============================================== */

            "& .MuiDataGrid-footerContainer":
              {
                minHeight: 46,

                bgcolor:
                  "#ffffff",

                borderTop:
                  "1px solid #edf0f3",

                color:
                  "#65788a",
              },

            "& .MuiTablePagination-root":
              {
                fontSize:
                  11.5,
              },

            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
              {
                fontSize:
                  11.5,

                color:
                  "#65788a",
              },

            /* ==============================================
               SCROLLBAR
               ============================================== */

            "& ::-webkit-scrollbar":
              {
                width: 8,
                height: 8,
              },

            "& ::-webkit-scrollbar-thumb":
              {
                bgcolor:
                  "#c7d4e2",

                borderRadius:
                  "4px",
              },

            "& ::-webkit-scrollbar-track":
              {
                bgcolor:
                  "#f8fafc",
              },
          }}
        />
      </Box>
    ) : null}
  </ModuleTileGrid>
) : (
  <Box
    sx={{
      width: "90%",
      maxWidth: "1500px",

      mx: "auto",
      py: 5,

      textAlign: "center",

      color: "#738496",
    }}
  >
    {loading
      ? "Loading application..."
      : "Application could not be loaded."}
  </Box>
)}

      {/* ===============================================================
          CHART DIALOG
          =============================================================== */}

      <Dialog
        open={chartOpen}
        onClose={() =>
          setChartOpen(false)
        }
        maxWidth={false}
        PaperProps={{
          sx: {
            width:
              "min(1170px, 96vw)",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",
          }}
        >
          Charts

          <IconButton
            onClick={() =>
              setChartOpen(false)
            }
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Tabs
          value={chartTab}
          onChange={(_e, v) =>
            setChartTab(v)
          }
          sx={{ px: 2 }}
        >
          <Tab
            value="chart"
            label="CHART"
          />

          <Tab
            value="fields"
            label="FIELDS"
          />

          <Tab
            value="customize"
            label="CUSTOMIZE"
          />
        </Tabs>

        <DialogContent dividers>
          {chartTab ===
            "chart" && (
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={
                    chartSampling
                  }
                  onChange={(
                    _e,
                    v
                  ) =>
                    v &&
                    setChartSampling(
                      v
                    )
                  }
                >
                  <ToggleButton value="all">
                    All Rows
                  </ToggleButton>

                  <ToggleButton value="sample">
                    Sample
                  </ToggleButton>
                </ToggleButtonGroup>

                <TextField
                  select
                  size="small"
                  label="Sample Size"
                  value={
                    chartSampleLimit
                  }
                  onChange={(e) =>
                    setChartSampleLimit(
                      Number(
                        e.target
                          .value
                      )
                    )
                  }
                  disabled={
                    chartSampling !==
                    "sample"
                  }
                  sx={{
                    minWidth:
                      140,
                  }}
                >
                  {[
                    100,
                    200,
                    500,
                    1000,
                  ].map((v) => (
                    <MenuItem
                      key={v}
                      value={v}
                    >
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Grid
                container
                spacing={2}
              >
                {[
                  {
                    key:
                      "column",

                    label:
                      "Column",
                  },

                  {
                    key:
                      "bar",

                    label:
                      "Bar",
                  },

                  {
                    key:
                      "line",

                    label:
                      "Line",
                  },

                  {
                    key:
                      "area",

                    label:
                      "Area",
                  },

                  {
                    key:
                      "pie",

                    label:
                      "Pie",
                  },
                ].map((t) => (
                  <Grid
                    item
                    xs={6}
                    sm={4}
                    md={2.4}
                    key={
                      t.key
                    }
                  >
                    <Button
                      fullWidth
                      variant={
                        chartType ===
                        t.key
                          ? "contained"
                          : "outlined"
                      }
                      onClick={() =>
                        setChartType(
                          t.key
                        )
                      }
                      sx={{
                        textTransform:
                          "none",

                        height:
                          44,
                      }}
                    >
                      {t.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}

          {chartTab ===
            "fields" && (
            <Stack spacing={2}>
              <TextField
                size="small"
                placeholder="Search fields"
                value={
                  chartFieldSearch
                }
                onChange={(e) =>
                  setChartFieldSearch(
                    e.target.value
                  )
                }
              />

              <Stack spacing={1}>
                {chartFields.map(
                  (c) => (
                    <Box
                      key={c}
                      sx={{
                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "space-between",
                      }}
                    >
                      <Typography>
                        {c}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={1}
                      >
                        <Button
                          size="small"
                          variant={
                            chartX ===
                            c
                              ? "contained"
                              : "outlined"
                          }
                          onClick={() =>
                            setChartX(
                              c
                            )
                          }
                        >
                          X
                        </Button>

                        <Button
                          size="small"
                          variant={
                            chartY ===
                            c
                              ? "contained"
                              : "outlined"
                          }
                          onClick={() =>
                            setChartY(
                              c
                            )
                          }
                          disabled={
                            !numericColumns.includes(
                              c
                            )
                          }
                        >
                          Y
                        </Button>
                      </Stack>
                    </Box>
                  )
                )}
              </Stack>
            </Stack>
          )}

          {chartTab ===
            "customize" && (
            <Stack spacing={2}>
              {(chartType ===
                "column" ||
                chartType ===
                  "bar") && (
                <>
                  <TextField
                    size="small"
                    label="Border radius"
                    type="number"
                    value={
                      chartBorderRadius
                    }
                    onChange={(e) =>
                      setChartBorderRadius(
                        Number(
                          e.target
                            .value
                        )
                      )
                    }
                  />

                  <TextField
                    size="small"
                    label="Category gap ratio"
                    type="number"
                    inputProps={{
                      step: 0.05,
                      min: 0,
                    }}
                    value={
                      chartCategoryGap
                    }
                    onChange={(e) =>
                      setChartCategoryGap(
                        Number(
                          e.target
                            .value
                        )
                      )
                    }
                  />

                  <TextField
                    size="small"
                    label="Series gap ratio"
                    type="number"
                    inputProps={{
                      step: 0.05,
                      min: 0,
                    }}
                    value={
                      chartSeriesGap
                    }
                    onChange={(e) =>
                      setChartSeriesGap(
                        Number(
                          e.target
                            .value
                        )
                      )
                    }
                  />
                </>
              )}

              {(chartType ===
                "line" ||
                chartType ===
                  "area") && (
                <>
                  <TextField
                    size="small"
                    label="Line width"
                    type="number"
                    inputProps={{
                      min: 1,
                    }}
                    value={
                      chartLineWidth
                    }
                    onChange={(e) =>
                      setChartLineWidth(
                        Number(
                          e.target
                            .value
                        )
                      )
                    }
                  />

                  {chartType ===
                    "area" && (
                    <TextField
                      size="small"
                      label="Area opacity"
                      type="number"
                      inputProps={{
                        step: 0.05,
                        min: 0,
                        max: 1,
                      }}
                      value={
                        chartAreaOpacity
                      }
                      onChange={(e) =>
                        setChartAreaOpacity(
                          Number(
                            e.target
                              .value
                          )
                        )
                      }
                    />
                  )}
                </>
              )}

              {chartType ===
                "pie" && (
                <TextField
                  size="small"
                  label="Inner radius"
                  type="number"
                  inputProps={{
                    min: 0,
                  }}
                  value={
                    chartPieInnerRadius
                  }
                  onChange={(e) =>
                    setChartPieInnerRadius(
                      Number(
                        e.target
                          .value
                      )
                    )
                  }
                />
              )}
            </Stack>
          )}

          <Divider
            sx={{ my: 2 }}
          />

          {chartY &&
          numericColumns.length >
            0 ? (
            <Box>
              {chartType ===
              "pie" ? (
                <PieChart
                  series={[
                    {
                      data:
                        pieData,

                      innerRadius:
                        chartPieInnerRadius,
                    },
                  ]}
                  height={320}
                />
              ) : chartType ===
                  "line" ||
                chartType ===
                  "area" ? (
                <LineChart
                  xAxis={[
                    {
                      scaleType:
                        "band",

                      data:
                        chartData.map(
                          (d) =>
                            d.x
                        ),
                    },
                  ]}
                  series={[
                    {
                      data:
                        chartData.map(
                          (d) =>
                            d.y
                        ),

                      label:
                        chartY,

                      area:
                        chartType ===
                        "area",

                      areaOpacity:
                        chartAreaOpacity,

                      strokeWidth:
                        chartLineWidth,
                    },
                  ]}
                  height={320}
                />
              ) : chartType ===
                "bar" ? (
                <BarChart
                  dataset={
                    chartData
                  }
                  xAxis={[
                    {
                      scaleType:
                        "linear",
                    },
                  ]}
                  yAxis={[
                    {
                      scaleType:
                        "band",

                      dataKey:
                        "x",
                    },
                  ]}
                  series={[
                    {
                      dataKey:
                        "y",

                      label:
                        chartY,

                      borderRadius:
                        chartBorderRadius,
                    },
                  ]}
                  height={320}
                  layout="horizontal"
                  categoryGapRatio={
                    chartCategoryGap
                  }
                  barGapRatio={
                    chartSeriesGap
                  }
                />
              ) : (
                <BarChart
                  dataset={
                    chartData
                  }
                  xAxis={[
                    {
                      scaleType:
                        "band",

                      dataKey:
                        "x",
                    },
                  ]}
                  yAxis={[
                    {
                      scaleType:
                        "linear",
                    },
                  ]}
                  series={[
                    {
                      dataKey:
                        "y",

                      label:
                        chartY,

                      borderRadius:
                        chartBorderRadius,
                    },
                  ]}
                  height={320}
                  layout="vertical"
                  categoryGapRatio={
                    chartCategoryGap
                  }
                  barGapRatio={
                    chartSeriesGap
                  }
                />
              )}
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{
                color:
                  "text.secondary",
              }}
            >
              Select a numeric
              column to plot.
            </Typography>
          )}

          {chartSampling ===
            "sample" &&
            rowsForGrid.length >
              chartSampleLimit && (
              <Typography
                variant="caption"
                sx={{
                  display:
                    "block",

                  mt: 1,

                  color:
                    "warning.main",
                }}
              >
                Showing a sample
                of{" "}
                {
                  chartSampleLimit
                }{" "}
                rows from{" "}
                {
                  rowsForGrid.length
                }
                .
              </Typography>
            )}

          <Typography
            variant="caption"
            sx={{
              display: "block",

              mt: 1,

              color:
                "text.secondary",
            }}
          >
            Showing{" "}
            {chartData.length} of{" "}
            {rowsForGrid.length}{" "}
            rows
          </Typography>
        </DialogContent>
      </Dialog>

      {/* ===============================================================
          CONFIG MENU
          =============================================================== */}

      <Menu
        anchorEl={configAnchor}
        open={Boolean(
          configAnchor
        )}
        onClose={() =>
          setConfigAnchor(null)
        }
        BackdropProps={{
          sx: {
            backdropFilter:
              "none !important",

            WebkitBackdropFilter:
              "none !important",

            backgroundColor:
              "transparent !important",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setConfigAnchor(null);

            openTemplateEditor(
              "validations"
            );
          }}
        >
          Validations
        </MenuItem>

        <MenuItem
          onClick={() => {
            setConfigAnchor(null);

            openTemplateEditor(
              "access"
            );
          }}
        >
          Access
        </MenuItem>
      </Menu>

      {/* ===============================================================
          RECORD ACTION MENU
          =============================================================== */}

      <Menu
        anchorEl={
          recordMenuAnchor
        }
        open={Boolean(
          recordMenuAnchor
        )}
        onClose={
          closeRecordMenu
        }
        BackdropProps={{
          sx: {
            backdropFilter:
              "none !important",

            WebkitBackdropFilter:
              "none !important",

            backgroundColor:
              "transparent !important",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (
              recordMenuRow
            ) {
              openView(
                recordMenuRow
              );
            }

            closeRecordMenu();
          }}
        >
          <VisibilityOutlinedIcon
            fontSize="small"
            sx={{ mr: 1 }}
          />

          View
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (
              recordMenuRow
            ) {
              openEdit(
                recordMenuRow
              );
            }

            closeRecordMenu();
          }}
        >
          <ModeEditOutlineOutlinedIcon
            fontSize="small"
            sx={{ mr: 1 }}
          />

          Edit
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (
              recordMenuRow
            ) {
              handleDelete(
                recordMenuRow
              );
            }

            closeRecordMenu();
          }}
        >
          <DeleteOutlineOutlinedIcon
            fontSize="small"
            sx={{ mr: 1 }}
          />

          Delete
        </MenuItem>
      </Menu>







      {/* Create/Edit/View modal */}
      {activePage && recModalOpen && (
  <ReusableFormModal
    open={recModalOpen}
    onClose={() => setRecModalOpen(false)}
    title={`${recMode === "create" ? "Create" : recMode === "edit" ? "Edit" : "View"} Record`}
    subtitle={activePage?.form_name || activePage?.page_name || ""}
    icon={recMode === "create" ? "➕" : recMode === "edit" ? "✏️" : "👁️"}
    maxWidth={660}
  >

<Box
  sx={{
     pt: 1.5,
    "& .rfm-field": {
      display: "flex",
      flexDirection: "column",
      gap: "3px",
    },

    "& .rfm-field-label": {
  fontSize: "9px",
  lineHeight: 1.2,
  fontWeight: 300,
  color: "#516784",
  letterSpacing: "0.15px",
  textTransform: "uppercase",
},

    "& .MuiOutlinedInput-root": {
      minHeight: 38,
      borderRadius: "6px",
      bgcolor: "#FFFFFF",

      "& fieldset": {
        borderColor: "#C9D5E3",
      },

      "&:hover fieldset": {
        borderColor: "#97ADC4",
      },

      "&.Mui-focused fieldset": {
        borderColor: "#16839A",
        borderWidth: "1px",
      },
    },

    "& .MuiInputBase-input": {
      py: "8px",
      px: "11px",
      fontSize: "13px",
      color: "#18324F",
    },

    "& .MuiInputBase-input::placeholder": {
      color: "#8B98A8",
      opacity: 1,
    },

    "& .MuiSelect-select": {
      py: "8px !important",
      fontSize: "13px",
    },

    "& .MuiFormControlLabel-label": {
      fontSize: "12.5px",
      color: "#263B53",
    },

    "& .MuiCheckbox-root, & .MuiRadio-root": {
      p: "4px",
    },
  }}
>
  <Grid container columnSpacing={2} rowSpacing={1.75}></Grid>
    

            <Grid container spacing={2}>
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


                  const cleanLabel = String(label || key)
                      .replace(/_/g, " ")
                      .trim();

                  const placeholder =
                      inputType === "textarea"
                        ? `Enter ${cleanLabel.toLowerCase()}...`
                        : inputType === "date"
                          ? "dd / mm / yyyy"
                          : `Enter ${cleanLabel.toLowerCase()}`;

                  const dataType = String(f?.dataType ?? "").toLowerCase();
                  const options = parseOptions(f?.optionsCsv);
                  const pairs = codeLabelPairs(options);
                  const isInt = dataType.includes("int");

                  const isWideField = inputType === "textarea";
                  
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
    ? rawSelected.map(Number).filter(Number.isFinite)
    : rawSelected.map(String);

  return (
    <Grid item xs={12} md={6} key={key}>
      <Box className="rfm-field">
        <Typography className="rfm-field-label">
          {label}
          {validation.mandatory ? " *" : ""}
        </Typography>

        <Box
          sx={{
            minHeight: 38,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          {pairs.map(({ code, label: optLabel }, i) => {
            const checked = isInt
              ? selected.includes(code)
              : selected.includes(optLabel);

            return (
              <FormControlLabel
                key={`${key}_opt_${i}`}
                control={
                  <Checkbox
                    size="small"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => {
                      const optionValue = isInt ? code : optLabel;

                      const next = e.target.checked
                        ? [...selected, optionValue]
                        : selected.filter((v) => v !== optionValue);

                      setRecValues((v) => ({
                        ...v,
                        [key]: next,
                      }));
                    }}
                  />
                }
                label={optLabel}
              />
            );
          })}
        </Box>
      </Box>
    </Grid>
  );
}

                  if (inputType === "checkbox") {
                    return (
                      <Grid item xs={12} md={isWideField ? 12 : 6} key={key}>
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
    <Grid item xs={12} md={6} key={key}>
      <Box className="rfm-field">
        <Typography className="rfm-field-label">
          {label}
          {validation.mandatory ? " *" : ""}
        </Typography>

        <RadioGroup
          row
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) =>
            setRecValues((v) => ({
              ...v,
              [key]: isInt ? Number(e.target.value) : e.target.value,
            }))
          }
          sx={{
            minHeight: 38,
            alignItems: "center",
            gap: 2,
          }}
        >
          {pairs.map(({ code, label: optLabel }) => (
            <FormControlLabel
              key={`${key}_radio_${code}`}
              value={String(isInt ? code : optLabel)}
              control={<Radio size="small" />}
              label={optLabel}
              disabled={disabled}
            />
          ))}
        </RadioGroup>
      </Box>
    </Grid>
  );
}

                  if (inputType === "dropdownlist") {
  return (
    <Grid item xs={12} md={6} key={key}>
      <Box className="rfm-field">
        <Typography className="rfm-field-label">
          {label}
          {validation.mandatory ? " *" : ""}
        </Typography>

        <FormControl fullWidth size="small" disabled={disabled}>
          <Select
            value={value === null || value === undefined ? "" : String(value)}
            displayEmpty
            onChange={(e) =>
              setRecValues((v) => ({
                ...v,
                [key]: isInt ? Number(e.target.value) : e.target.value,
              }))
            }
          >
            <MenuItem value="">
  <em>{`— Select ${cleanLabel.toLowerCase()} —`}</em>
</MenuItem>

            {pairs.map(({ code, label: optLabel }) => (
              <MenuItem
                key={`${key}_opt_${code}`}
                value={String(isInt ? code : optLabel)}
              >
                {optLabel}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Grid>
  );
}

                  

if (inputType === "image") {
  const attachments = parseAttachmentValue(rawValue);

  return (
    <Grid item xs={12} md={6} key={key}>
      <Box className="rfm-field">
        <Typography className="rfm-field-label">
          {label}
          {validation.mandatory ? " *" : ""}
        </Typography>

        {!disabled && (
          <SecureFileUploader
            files={fileFields[key] || []}
            setFiles={(next) =>
              setFileFields((s) => ({
                ...s,
                [key]: next,
              }))
            }
            multiple
          />
        )}

        {attachments.length > 0 && (
          <List dense sx={{ mt: 0.5 }}>
            {attachments.map((f, i) => (
              <ListItem
                key={`${key}_file_${i}`}
                disableGutters
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
                  primary={
                    f?.original_filename ||
                    f?.name ||
                    `file_${i + 1}`
                  }
                />
              </ListItem>
            ))}
          </List>
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
      : inputType === "integer" ||
          inputType === "number" ||
          dataType.includes("int")
        ? "number"
        : "text";

return (
  <Grid item xs={12} md={isWideField ? 12 : 6} key={key}>
    <Box className="rfm-field">
      <Typography className="rfm-field-label">
        {label}
        {validation.mandatory ? " *" : ""}
      </Typography>

      <TextField
  fullWidth
  size="small"
  type={fieldType === "textarea" ? "text" : fieldType}
  multiline={fieldType === "textarea"}
  minRows={fieldType === "textarea" ? 3 : undefined}
  placeholder={placeholder}
  value={value ?? ""}
  onChange={(e) =>
    setRecValues((v) => ({
      ...v,
      [key]:
        fieldType === "number" && e.target.value !== ""
          ? Number(e.target.value)
          : e.target.value,
    }))
  }
  disabled={disabled}
  sx={
    fieldType === "textarea"
      ? {
          "& .MuiOutlinedInput-root": {
            alignItems: "flex-start",
          },
        }
      : undefined
  }
/>
    </Box>
  </Grid>
);
})}
</Grid>
</Box>
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
          
          </ReusableFormModal>
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
