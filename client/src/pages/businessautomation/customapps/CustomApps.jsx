import React, { useEffect, useMemo, useState } from "react";

import {
  Box,
  Button,
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
import WebAssetOutlinedIcon from "@mui/icons-material/WebAssetOutlined";

import ModuleTileGrid from "../../../components/ModuleTileGrid";
import api from "../../../services/api";

const CHART_TYPES = [
  "Bar",
  "H. Bar",
  "Pie",
  "Doughnut",
];

export default function CustomApps() {
  const [createOpen, setCreateOpen] = useState(false);

  const [dashboards, setDashboards] = useState([]);

  const [tables, setTables] = useState([]);

  const [layouts, setLayouts] = useState([]);

  const [selectedLayoutId, setSelectedLayoutId] =
    useState(null);

  const [columnsByTable, setColumnsByTable] =
    useState({});

  const [name, setName] = useState("");

  const [description, setDescription] =
    useState("");

  const [chartRows, setChartRows] = useState([
    {
      tableName: "",
      chartType: "",
      chartName: "",
      xAxis: "",
      yAxis: "",
    },
  ]);

  /* ===========================================================================
     LOAD DATA
  =========================================================================== */

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const res = await api.get(
          "/aiappbuilder"
        );

        setDashboards(
          Array.isArray(res.data)
            ? res.data
            : []
        );
      } catch (err) {
        console.error(
          "Failed to load applications",
          err
        );
      }
    };

    const loadTables = async () => {
      try {
        const res = await api.get(
          "/crudpages/db/meta/tables"
        );

        const all = Array.isArray(res.data)
          ? res.data
          : [];

        setTables(
          all.filter((t) =>
            String(t)
              .toLowerCase()
              .startsWith("cust_")
          )
        );
      } catch (err) {
        console.error(
          "Failed to load tables",
          err
        );
      }
    };

    const loadLayouts = async () => {
      try {
        const res = await api.get(
          "/dashboardlayouts"
        );

        const list = Array.isArray(res.data)
          ? res.data
          : [];

        setLayouts(list);

        if (
          list.length &&
          !selectedLayoutId
        ) {
          setSelectedLayoutId(
            list[0].id
          );
        }
      } catch (err) {
        console.error(
          "Failed to load layouts",
          err
        );
      }
    };

    loadApplications();
    loadTables();
    loadLayouts();
  }, []);

  /* ===========================================================================
     APPLICATION URL
  =========================================================================== */

  const getAppUrl = (item) => {
    const mode = String(
      item?.schema_json?.appMode ||
        item?.schema?.appMode ||
        ""
    ).toLowerCase();

    if (mode === "crud") {
      return `/aicrudapp/${item.id}`;
    }

    return `/aidashboardapp/${item.id}`;
  };

  /* ===========================================================================
     MODULE TILE DATA

     IMPORTANT:
     Page supplies DATA only.
     ModuleTileGrid supplies:
     - page width
     - banner
     - search
     - card dimensions
     - card style
     - paging
     - 2 rows per page
     - left/right arrows
  =========================================================================== */

  const applicationTiles = useMemo(() => {
    return dashboards
      .filter(
        (item) =>
          String(
            item.status || ""
          ).toLowerCase() ===
          "published"
      )
      .map((item) => {
        const modifiedDate =
          item.date_modified
            ? new Date(
                item.date_modified
              ).toLocaleDateString()
            : item.date_created
              ? new Date(
                  item.date_created
                ).toLocaleDateString()
              : "-";

        const appName =
          item.app_name ||
          item.page_name ||
          "Untitled Application";

        return {
          id: item.id,

          label: appName,

          desc: [
            `Application ID: ${item.id}`,
            `Created by: ${
              item.created_by ?? "-"
            }`,
            `Last Modified: ${modifiedDate}`,
          ].join(" · "),

          Icon: WebAssetOutlinedIcon,

          iconColor: "#6b46c1",

          onClick: () => {
            window.open(
              getAppUrl(item),
              "_blank",
              "noopener,noreferrer"
            );
          },
        };
      });
  }, [dashboards]);

  /* ===========================================================================
     CREATE FORM
  =========================================================================== */

  const resetCreateForm = () => {
    setName("");

    setDescription("");

    setChartRows([
      {
        tableName: "",
        chartType: "",
        chartName: "",
        xAxis: "",
        yAxis: "",
      },
    ]);
  };

  const handleAddRow = () => {
    setChartRows((prev) => [
      ...prev,

      {
        tableName: "",
        chartType: "",
        chartName: "",
        xAxis: "",
        yAxis: "",
      },
    ]);
  };

  const handleRemoveRow = (idx) => {
    setChartRows((prev) =>
      prev.filter(
        (_, i) => i !== idx
      )
    );
  };

  const handleRowChange = (
    idx,
    key,
    value
  ) => {
    setChartRows((prev) =>
      prev.map((row, i) =>
        i === idx
          ? {
              ...row,
              [key]: value,
            }
          : row
      )
    );
  };

  /* ===========================================================================
     COLUMNS
  =========================================================================== */

  const loadColumns = async (
    tableName
  ) => {
    if (
      !tableName ||
      columnsByTable[tableName]
    ) {
      return;
    }

    try {
      const res = await api.get(
        `/db/columns/${tableName}`
      );

      const cols =
        res?.data?.columns || [];

      setColumnsByTable((prev) => ({
        ...prev,
        [tableName]: cols,
      }));
    } catch (err) {
      console.error(
        "Failed to load columns",
        err
      );

      setColumnsByTable((prev) => ({
        ...prev,
        [tableName]: [],
      }));
    }
  };

  /* ===========================================================================
     CREATE DASHBOARD
  =========================================================================== */

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    const selectedLayout =
      layouts.find(
        (layout) =>
          layout.id ===
          selectedLayoutId
      );

    if (!selectedLayout) {
      alert("Select a layout");
      return;
    }

    const normalizedRows =
      chartRows.map((row) => ({
        tableName: String(
          row.tableName || ""
        ).trim(),

        chartType: String(
          row.chartType || ""
        ).trim(),

        chartName: String(
          row.chartName || ""
        ).trim(),

        xAxis: String(
          row.xAxis || ""
        ).trim(),

        yAxis: String(
          row.yAxis || ""
        ).trim(),
      }));

    const hasMissingRow =
      normalizedRows.some(
        (row) =>
          !row.tableName ||
          !row.chartType ||
          !row.chartName ||
          !row.xAxis ||
          !row.yAxis
      );

    if (hasMissingRow) {
      alert(
        "Complete all fields under Select Data Models"
      );

      return;
    }

    const selectedTables =
      chartRows
        .map(
          (row) =>
            row.tableName
        )
        .filter(Boolean);

    if (!selectedTables.length) {
      alert(
        "Select at least one data model"
      );

      return;
    }

    const layout = {
      layoutId:
        selectedLayout.id,

      layoutName:
        selectedLayout.dashboard_name ||
        "",

      layoutDefinition:
        selectedLayout.layout_definition ||
        {},

      charts:
        normalizedRows,
    };

    try {
      const res = await api.post(
        "/dashboardbuilder",
        {
          pageName:
            name.trim(),

          description:
            description.trim() ||
            null,

          layout,

          dbtableId:
            selectedTables,
        }
      );

      setDashboards((prev) => [
        res.data,
        ...prev,
      ]);

      setCreateOpen(false);

      resetCreateForm();
    } catch (err) {
      console.error(
        "Failed to create dashboard",
        err
      );

      alert(
        "Failed to create dashboard"
      );
    }
  };

  /* ===========================================================================
     DELETE

     Retained because this was already part of the page logic.
  =========================================================================== */

  const handleDeleteDashboard =
    async (event, item) => {
      event.stopPropagation();

      if (!item?.id) return;

      const ok =
        window.confirm(
          "Delete this dashboard?"
        );

      if (!ok) return;

      try {
        await api.delete(
          `/dashboardbuilder/${item.id}`
        );

        setDashboards((prev) =>
          prev.filter(
            (dashboard) =>
              dashboard.id !==
              item.id
          )
        );
      } catch (err) {
        console.error(
          "Failed to delete dashboard",
          err
        );

        alert(
          "Failed to delete dashboard"
        );
      }
    };

  /* ===========================================================================
     RENDER
  =========================================================================== */

  return (
    <>
      {/* ================================================================= */}
      {/* SHARED AUGMIS TILE PAGE */}
      {/* ================================================================= */}

      <ModuleTileGrid
        title="Enterprise Applications"
        subtitle="Access custom-built and AI-generated enterprise applications."
        searchPlaceholder="Search enterprise applications"
        tiles={applicationTiles}

        /*
          If you want the Create New Dashboard button visible,
          uncomment this block:

        primaryAction={{
          label: "Create New Dashboard",
          onClick: () => {
            resetCreateForm();
            setCreateOpen(true);
          },
        }}
        */
      />

      {/* ================================================================= */}
      {/* CREATE DASHBOARD DIALOG */}
      {/* ================================================================= */}

      <Dialog
        open={createOpen}
        onClose={() =>
          setCreateOpen(false)
        }
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            borderBottom:
              "1px solid #e1e5e9",

            fontWeight: 700,

            color: "#223548",
          }}
        >
          Create New Dashboard
        </DialogTitle>

        <DialogContent>
          {/* ============================================================= */}
          {/* BASIC INFORMATION */}
          {/* ============================================================= */}

          <Grid
            container
            spacing={2}
            sx={{ mt: 1 }}
          >
            <Grid
              item
              xs={12}
              md={6}
            >
              <Box
                sx={{
                  display:
                    "grid",

                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "160px 1fr",

                    alignItems:
                      "center",

                    gap: 2,
                  }}
                >
                  <Typography>
                    Name
                  </Typography>

                  <TextField
                    size="small"
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target.value
                      )
                    }
                  />
                </Box>

                <Box
                  sx={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "160px 1fr",

                    alignItems:
                      "center",

                    gap: 2,
                  }}
                >
                  <Typography>
                    Description
                  </Typography>

                  <TextField
                    size="small"
                    multiline
                    minRows={3}
                    value={
                      description
                    }
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* ============================================================= */}
          {/* SELECT LAYOUT */}
          {/* ============================================================= */}

          <Box sx={{ mt: 4 }}>
            <Typography
              sx={{
                mb: 1,
                fontWeight: 600,
              }}
            >
              Select Layout
            </Typography>

            <Grid
              container
              spacing={2}
            >
              {layouts.map(
                (layout) => {
                  const isSelected =
                    layout.id ===
                    selectedLayoutId;

                  const def =
                    typeof layout.layout_definition ===
                    "string"
                      ? (() => {
                          try {
                            return JSON.parse(
                              layout.layout_definition
                            );
                          } catch {
                            return {};
                          }
                        })()
                      : layout.layout_definition ||
                        {};

                  const previewHtml =
                    typeof def?.html ===
                    "string"
                      ? def.html
                      : "";

                  return (
                    <Grid
                      item
                      key={
                        layout.id
                      }
                      xs={12}
                      md={4}
                    >
                      <Paper
                        elevation={0}
                        onClick={() =>
                          setSelectedLayoutId(
                            layout.id
                          )
                        }
                        sx={{
                          border:
                            isSelected
                              ? "2px solid #0a6ed1"
                              : "1px solid #d7dee6",

                          borderRadius:
                            "10px",

                          p: 1.5,

                          cursor:
                            "pointer",

                          position:
                            "relative",
                        }}
                      >
                        <Box
                          sx={{
                            border:
                              "1px solid #d7dee6",

                            height: 170,

                            position:
                              "relative",

                            bgcolor:
                              "#f5f6f7",

                            overflow:
                              "hidden",

                            borderRadius:
                              "6px",
                          }}
                        >
                          {previewHtml ? (
                            <Box
                              sx={{
                                transform:
                                  "scale(0.4)",

                                transformOrigin:
                                  "top left",

                                width:
                                  "250%",

                                height:
                                  "250%",
                              }}
                              dangerouslySetInnerHTML={{
                                __html:
                                  previewHtml,
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                position:
                                  "absolute",

                                inset: 18,

                                border:
                                  "1px solid #c7cbd3",
                              }}
                            />
                          )}
                        </Box>

                        <Typography
                          variant="caption"
                          display="block"
                          align="center"
                          sx={{
                            mt: 1,
                          }}
                        >
                          {layout.dashboard_name ||
                            `Layout ${layout.id}`}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                }
              )}
            </Grid>
          </Box>

          {/* ============================================================= */}
          {/* DATA MODELS */}
          {/* ============================================================= */}

          <Box sx={{ mt: 4 }}>
            <Grid
              container
              spacing={2}
              alignItems="center"
            >
              <Grid
                item
                xs={12}
                md={2}
              >
                <Typography>
                  Select Data Models
                </Typography>
              </Grid>

              <Grid
                item
                xs={12}
                md={10}
              >
                <Box
                  sx={{
                    display:
                      "grid",

                    gap: 2,
                  }}
                >
                  {chartRows.map(
                    (
                      row,
                      idx
                    ) => (
                      <Box
                        key={idx}
                        sx={{
                          display:
                            "flex",

                          gap: 2,

                          alignItems:
                            "center",

                          flexWrap:
                            "nowrap",
                        }}
                      >
                        {/* TABLE */}

                        <Select
                          size="small"
                          value={
                            row.tableName
                          }
                          displayEmpty
                          onChange={(
                            e
                          ) => {
                            handleRowChange(
                              idx,
                              "tableName",
                              e.target
                                .value
                            );

                            handleRowChange(
                              idx,
                              "xAxis",
                              ""
                            );

                            handleRowChange(
                              idx,
                              "yAxis",
                              ""
                            );

                            loadColumns(
                              e.target
                                .value
                            );
                          }}
                          sx={{
                            minWidth:
                              200,
                          }}
                        >
                          <MenuItem value="">
                            Select Table
                          </MenuItem>

                          {tables.map(
                            (table) => (
                              <MenuItem
                                key={
                                  table
                                }
                                value={
                                  table
                                }
                              >
                                {
                                  table
                                }
                              </MenuItem>
                            )
                          )}
                        </Select>

                        {/* CHART TYPE */}

                        <Select
                          size="small"
                          value={
                            row.chartType
                          }
                          displayEmpty
                          onChange={(
                            e
                          ) =>
                            handleRowChange(
                              idx,
                              "chartType",
                              e.target
                                .value
                            )
                          }
                          sx={{
                            minWidth:
                              160,
                          }}
                        >
                          <MenuItem value="">
                            Chart Type
                          </MenuItem>

                          {CHART_TYPES.map(
                            (type) => (
                              <MenuItem
                                key={
                                  type
                                }
                                value={
                                  type
                                }
                              >
                                {
                                  type
                                }
                              </MenuItem>
                            )
                          )}
                        </Select>

                        {/* CHART NAME */}

                        <TextField
                          size="small"
                          value={
                            row.chartName
                          }
                          placeholder="Chart Name"
                          onChange={(
                            e
                          ) =>
                            handleRowChange(
                              idx,
                              "chartName",
                              e.target
                                .value
                            )
                          }
                          sx={{
                            minWidth:
                              180,
                          }}
                        />

                        {/* X AXIS */}

                        <Select
                          size="small"
                          value={
                            row.xAxis
                          }
                          displayEmpty
                          onChange={(
                            e
                          ) =>
                            handleRowChange(
                              idx,
                              "xAxis",
                              e.target
                                .value
                            )
                          }
                          sx={{
                            minWidth:
                              180,
                          }}
                          disabled={
                            !row.tableName
                          }
                        >
                          <MenuItem value="">
                            X-Axis
                            (Column)
                          </MenuItem>

                          {(
                            columnsByTable[
                              row
                                .tableName
                            ] || []
                          ).map(
                            (
                              column
                            ) => (
                              <MenuItem
                                key={
                                  column.column_name
                                }
                                value={
                                  column.column_name
                                }
                              >
                                {
                                  column.column_name
                                }
                              </MenuItem>
                            )
                          )}
                        </Select>

                        {/* Y AXIS */}

                        <Select
                          size="small"
                          value={
                            row.yAxis
                          }
                          displayEmpty
                          onChange={(
                            e
                          ) =>
                            handleRowChange(
                              idx,
                              "yAxis",
                              e.target
                                .value
                            )
                          }
                          sx={{
                            minWidth:
                              180,
                          }}
                          disabled={
                            !row.tableName
                          }
                        >
                          <MenuItem value="">
                            Y-Axis
                            (Column)
                          </MenuItem>

                          {(
                            columnsByTable[
                              row
                                .tableName
                            ] || []
                          ).map(
                            (
                              column
                            ) => (
                              <MenuItem
                                key={
                                  column.column_name
                                }
                                value={
                                  column.column_name
                                }
                              >
                                {
                                  column.column_name
                                }
                              </MenuItem>
                            )
                          )}
                        </Select>

                        {/* ADD */}

                        {idx ===
                          chartRows.length -
                            1 && (
                          <Button
                            onClick={
                              handleAddRow
                            }
                            variant="text"
                            sx={{
                              minWidth:
                                0,

                              p: 0.5,
                            }}
                          >
                            <AddCircleOutlineIcon />
                          </Button>
                        )}

                        {/* REMOVE */}

                        {chartRows.length >
                          1 && (
                          <Button
                            onClick={() =>
                              handleRemoveRow(
                                idx
                              )
                            }
                            variant="text"
                            sx={{
                              minWidth:
                                0,

                              p: 0.5,
                            }}
                          >
                            <RemoveCircleOutlineIcon />
                          </Button>
                        )}
                      </Box>
                    )
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setCreateOpen(false)
            }
            variant="outlined"
          >
            Close
          </Button>

          <Button
            onClick={
              handleCreate
            }
            variant="contained"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}