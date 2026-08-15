import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import api from "../../../services/api";

const CHART_TYPES = ["Bar", "H. Bar", "Pie", "Doughnut"];

export default function DashboardBuilder() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [dashboards, setDashboards] = useState([]);
  const [tables, setTables] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState(null);
  const [columnsByTable, setColumnsByTable] = useState({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chartRows, setChartRows] = useState([
    { tableName: "", chartType: "", chartName: "", xAxis: "", yAxis: "" },
  ]);

  const filtered = useMemo(
    () =>
      dashboards.filter((item) =>
        String(item.page_name || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [dashboards, search]
  );

  useEffect(() => {
    const loadDashboards = async () => {
      try {
        const res = await api.get("/dashboardbuilder");
        setDashboards(res.data || []);
      } catch (err) {
        console.error("Failed to load dashboards", err);
      }
    };

    const loadTables = async () => {
      try {
        const res = await api.get("/crudpages/db/meta/tables");
        const all = Array.isArray(res.data) ? res.data : [];
        setTables(all.filter((t) => String(t).toLowerCase().startsWith("cust_")));
      } catch (err) {
        console.error("Failed to load tables", err);
      }
    };

    const loadLayouts = async () => {
      try {
        const res = await api.get("/dashboardlayouts");
        const list = Array.isArray(res.data) ? res.data : [];
        setLayouts(list);
        if (list.length && !selectedLayoutId) {
          setSelectedLayoutId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load layouts", err);
      }
    };

    loadDashboards();
    loadTables();
    loadLayouts();
  }, []);

  const resetCreateForm = () => {
    setName("");
    setDescription("");
    setChartRows([{ tableName: "", chartType: "", chartName: "", xAxis: "", yAxis: "" }]);
  };

  const handleAddRow = () => {
    setChartRows((prev) => [
      ...prev,
      { tableName: "", chartType: "", chartName: "", xAxis: "", yAxis: "" },
    ]);
  };

  const handleRemoveRow = (idx) => {
    setChartRows((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleRowChange = (idx, key, value) => {
    setChartRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    );
  };

  const loadColumns = async (tableName) => {
    if (!tableName || columnsByTable[tableName]) return;
    try {
      const res = await api.get(`/db/columns/${tableName}`);
      const cols = res?.data?.columns || [];
      setColumnsByTable((prev) => ({ ...prev, [tableName]: cols }));
    } catch (err) {
      console.error("Failed to load columns", err);
      setColumnsByTable((prev) => ({ ...prev, [tableName]: [] }));
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }
    const selectedLayout = layouts.find((l) => l.id === selectedLayoutId);
    if (!selectedLayout) {
      alert("Select a layout");
      return;
    }
    const normalizedRows = chartRows.map((row) => ({
      tableName: String(row.tableName || "").trim(),
      chartType: String(row.chartType || "").trim(),
      chartName: String(row.chartName || "").trim(),
      xAxis: String(row.xAxis || "").trim(),
      yAxis: String(row.yAxis || "").trim(),
    }));
    const hasMissingRow = normalizedRows.some(
      (row) =>
        !row.tableName || !row.chartType || !row.chartName || !row.xAxis || !row.yAxis
    );
    if (hasMissingRow) {
      alert("Complete all fields under Select Data Models");
      return;
    }
    const selectedTables = chartRows.map((r) => r.tableName).filter(Boolean);
    if (!selectedTables.length) {
      alert("Select at least one data model");
      return;
    }
    const layout = {
      layoutId: selectedLayout.id,
      layoutName: selectedLayout.dashboard_name || "",
      layoutDefinition: selectedLayout.layout_definition || {},
      charts: normalizedRows,
    };
    try {
      const res = await api.post("/dashboardbuilder", {
        pageName: name.trim(),
        description: description.trim() || null,
        layout,
        dbtableId: selectedTables,
      });
      setDashboards((prev) => [res.data, ...prev]);
      setCreateOpen(false);
      resetCreateForm();
    } catch (err) {
      console.error("Failed to create dashboard", err);
      alert("Failed to create dashboard");
    }
  };

  const handleDeleteDashboard = async (event, item) => {
    event.stopPropagation();
    if (!item?.id) return;
    const ok = window.confirm("Delete this dashboard?");
    if (!ok) return;
    try {
      await api.delete(`/dashboardbuilder/${item.id}`);
      setDashboards((prev) => prev.filter((d) => d.id !== item.id));
    } catch (err) {
      console.error("Failed to delete dashboard", err);
      alert("Failed to delete dashboard");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <Box sx={{ bgcolor: "#5b2b7f", color: "#fff", px: 4, py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Enterprise Dashboards
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: "#efe6f7" }}>
          Data visualization
        </Typography>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ maxWidth: 1200, mx: "auto", borderRadius: 2, p: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
              <Button
                variant="contained"
                onClick={() => {
                  resetCreateForm();
                  setCreateOpen(true);
                }}
                sx={{ bgcolor: "#2f7dd6", textTransform: "none" }}
              >
                Create New Dashboard
              </Button>
              <Button
                variant="outlined"
                component="label"
                sx={{ textTransform: "none" }}
              >
                Upload Layout
                <input
                  type="file"
                  hidden
                  accept=".html,.txt"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const form = new FormData();
                    form.append("file", file);
                    try {
                      await api.post("/dashboardlayouts/upload", form, {
                        headers: { "Content-Type": "multipart/form-data" },
                      });
                      alert("Upload completed");
                      const res = await api.get("/dashboardlayouts");
                      const list = Array.isArray(res.data) ? res.data : [];
                      setLayouts(list);
                      if (list.length) setSelectedLayoutId(list[list.length - 1].id);
                    } catch (err) {
                      console.error("Failed to upload layout", err);
                      alert("Failed to upload layout");
                    } finally {
                      e.target.value = "";
                    }
                  }}
                />
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
              {filtered.map((item) => (
                <Grid item key={item.id} xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    onClick={() =>
                      window.open(item.page_url || `/dashboardbuilder/${item.id}`, "_blank")
                    }
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
                      transition:
                        "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 10px 18px rgba(16, 24, 40, 0.22)",
                        borderColor: "#1a4fd8",
                      },
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#1a4fd8" }}>
                        {item.page_name || "Untitled Dashboard"}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#51607d", mt: 1 }}>
                        Template ID: {item.id}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#51607d" }}>
                        Created by: {item.created_by ?? "-"}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#51607d" }}>
                        Last Modified:{" "}
                        {item.date_modified
                          ? new Date(item.date_modified).toLocaleDateString()
                          : item.date_created
                            ? new Date(item.date_created).toLocaleDateString()
                            : "-"}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        sx={{ textTransform: "none" }}
                        onClick={(event) => handleDeleteDashboard(event, item)}
                      >
                        Delete
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "none" }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Manage Access
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Container>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ borderBottom: "2px solid #2f7dd6" }}>
          Create New Dashboard
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: "grid", gap: 2 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "160px 1fr",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Typography>Name</Typography>
                  <TextField size="small" value={name} onChange={(e) => setName(e.target.value)} />
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "160px 1fr",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Typography>Description</Typography>
                  <TextField
                    size="small"
                    multiline
                    minRows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4 }}>
            <Typography sx={{ mb: 1 }}>Select Layout</Typography>
            <Grid container spacing={2}>
              {layouts.map((layout) => {
                const isSelected = layout.id === selectedLayoutId;
                const def =
                  typeof layout.layout_definition === "string"
                    ? (() => {
                        try {
                          return JSON.parse(layout.layout_definition);
                        } catch {
                          return {};
                        }
                      })()
                    : layout.layout_definition || {};
                const previewHtml = typeof def?.html === "string" ? def.html : "";
                return (
                <Grid item key={layout.id} xs={12} md={4}>
                  <Paper
                    elevation={0}
                    onClick={() => setSelectedLayoutId(layout.id)}
                    sx={{
                      border:
                        isSelected
                          ? "2px solid #2f7dd6"
                          : "1px solid #c7cbd3",
                      borderRadius: 2,
                      p: 1.5,
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <Box
                      sx={{
                        border: "1px solid #c7cbd3",
                        height: 170,
                        position: "relative",
                        bgcolor: "#f5f7fb",
                        overflow: "hidden",
                      }}
                    >
                      {previewHtml ? (
                        <Box
                          sx={{
                            transform: "scale(0.4)",
                            transformOrigin: "top left",
                            width: "250%",
                            height: "250%",
                          }}
                          dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                      ) : (
                        <Box sx={{ position: "absolute", inset: 18, border: "1px solid #c7cbd3" }} />
                      )}
                    </Box>
                    <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                      {layout.dashboard_name || `Layout ${layout.id}`}
                    </Typography>
                  </Paper>
                </Grid>
              );
              })}
            </Grid>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2}>
                <Typography>Select Data Models</Typography>
              </Grid>
              <Grid item xs={12} md={10}>
                <Box sx={{ display: "grid", gap: 2 }}>
                  {chartRows.map((row, idx) => (
                    <Box
                      key={idx}
                      sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "nowrap" }}
                    >
                      <Select
                        size="small"
                        value={row.tableName}
                        displayEmpty
                        onChange={(e) => {
                          handleRowChange(idx, "tableName", e.target.value);
                          handleRowChange(idx, "xAxis", "");
                          handleRowChange(idx, "yAxis", "");
                          loadColumns(e.target.value);
                        }}
                        sx={{ minWidth: 200 }}
                      >
                        <MenuItem value="">Select Table</MenuItem>
                        {tables.map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                      </Select>
                      <Select
                        size="small"
                        value={row.chartType}
                        displayEmpty
                        onChange={(e) => handleRowChange(idx, "chartType", e.target.value)}
                        sx={{ minWidth: 160 }}
                      >
                        <MenuItem value="">Chart Type</MenuItem>
                        {CHART_TYPES.map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                      </Select>
                      <TextField
                        size="small"
                        value={row.chartName}
                        placeholder="Chart Name"
                        onChange={(e) => handleRowChange(idx, "chartName", e.target.value)}
                        sx={{ minWidth: 180 }}
                      />
                      <Select
                        size="small"
                        value={row.xAxis}
                        displayEmpty
                        onChange={(e) => handleRowChange(idx, "xAxis", e.target.value)}
                        sx={{ minWidth: 180 }}
                        disabled={!row.tableName}
                      >
                        <MenuItem value="">X-Axis (Column)</MenuItem>
                        {(columnsByTable[row.tableName] || []).map((c) => (
                          <MenuItem key={c.column_name} value={c.column_name}>
                            {c.column_name}
                          </MenuItem>
                        ))}
                      </Select>
                      <Select
                        size="small"
                        value={row.yAxis}
                        displayEmpty
                        onChange={(e) => handleRowChange(idx, "yAxis", e.target.value)}
                        sx={{ minWidth: 180 }}
                        disabled={!row.tableName}
                      >
                        <MenuItem value="">Y-Axis (Column)</MenuItem>
                        {(columnsByTable[row.tableName] || []).map((c) => (
                          <MenuItem key={c.column_name} value={c.column_name}>
                            {c.column_name}
                          </MenuItem>
                        ))}
                      </Select>
                      {idx === chartRows.length - 1 && (
                        <Button
                          onClick={handleAddRow}
                          variant="text"
                          sx={{ minWidth: 0, p: 0.5 }}
                        >
                          <AddCircleOutlineIcon />
                        </Button>
                      )}
                      {chartRows.length > 1 && (
                        <Button
                          onClick={() => handleRemoveRow(idx)}
                          variant="text"
                          sx={{ minWidth: 0, p: 0.5 }}
                        >
                          <RemoveCircleOutlineIcon />
                        </Button>
                      )}
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} variant="outlined">
            Close
          </Button>
          <Button onClick={handleCreate} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
