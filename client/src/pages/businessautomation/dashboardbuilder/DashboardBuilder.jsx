//DashboardBuilder.jsx
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import {
  getDashboardTemplate,
} from "./dashboardTemplates/dashboardTemplateRegistry";
import api from "../../../services/api";
import ExecutiveWorkspaceTemplate from
  "./dashboardTemplates/ExecutiveWorkspaceTemplate";
import ModuleTileGrid from "../../../components/ModuleTileGrid";


const CHART_TYPES = [
  "Bar",
  "H. Bar",
  "Pie",
  "Doughnut",
];


/* =============================================================================
   DASHBOARD BUILDER
============================================================================= */

export default function DashboardBuilder() {

  const [createOpen, setCreateOpen] =
    useState(false);

  const [dashboards, setDashboards] =
    useState([]);

  const [tables, setTables] =
    useState([]);

  const [layouts, setLayouts] =
    useState([]);

  const [
    selectedLayoutId,
    setSelectedLayoutId,
  ] = useState(null);

  const [
    columnsByTable,
    setColumnsByTable,
  ] = useState({});

  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    chartRows,
    setChartRows,
  ] = useState([
    {
      tableName: "",
      chartType: "",
      chartName: "",
      xAxis: "",
      yAxis: "",
    },
  ]);


  /* ===========================================================================
     IMPORTANT
     Prevent MUI Select/Menu from blurring the parent dialog.
  =========================================================================== */

  const noBlurMenuProps = {
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

    PaperProps: {
      sx: {
        borderRadius: "8px",

        mt: 0.5,

        border:
          "1px solid #d9e4ee",

        boxShadow:
          "0 8px 24px rgba(18,41,67,.14)",
      },
    },
  };

const gentleFieldSx = {
  "& .MuiOutlinedInput-root": {
    height: 40,
    borderRadius: "7px",
    bgcolor: "#ffffff",

    fontSize: 11.5,
    fontWeight: 400,
    color: "#41566d",

    "& fieldset": {
      borderColor: "#d7e1ea",
    },

    "&:hover fieldset": {
      borderColor: "#b8c7d6",
    },

    "&.Mui-focused fieldset": {
      borderColor: "#7fa6c8",
      borderWidth: "1px",
    },
  },

  "& .MuiInputBase-input": {
    fontSize: 11.5,
    fontWeight: 400,
    color: "#41566d",

    paddingTop: "10px",
    paddingBottom: "10px",

    "&::placeholder": {
      color: "#9aa8b6",
      opacity: 1,
      fontWeight: 400,
    },
  },

  "& .MuiSelect-select": {
    fontSize: 11.5,
    fontWeight: 400,
    color: "#41566d",

    display: "flex",
    alignItems: "center",
  },

  "& .MuiInputLabel-root": {
    fontSize: 11,
    fontWeight: 400,
    color: "#7b8ea2",
  },

  "& .MuiInputLabel-root.Mui-focused": {
    color: "#587a99",
  },

  "& .MuiSvgIcon-root": {
    fontSize: 18,
    color: "#8b9cad",
  },
};


const gentleMenuProps = {
  BackdropProps: {
    sx: {
      backdropFilter: "none !important",
      WebkitBackdropFilter: "none !important",
      backgroundColor: "transparent !important",
    },
  },

  PaperProps: {
    sx: {
      mt: 0.5,

      borderRadius: "8px",

      border: "1px solid #d9e4ee",

      boxShadow:
        "0 8px 24px rgba(18,41,67,.12)",

      "& .MuiMenuItem-root": {
        minHeight: 34,

        px: 1.5,

        fontSize: 11.5,
        fontWeight: 400,

        color: "#41566d",

        "&:hover": {
          bgcolor: "#f4f8fb",
        },

        "&.Mui-selected": {
          bgcolor: "#edf5fb",
          color: "#294766",

          "&:hover": {
            bgcolor: "#e5f0f8",
          },
        },
      },
    },
  },
};
  /* ===========================================================================
     MODULE TILES
  =========================================================================== */

  const dashboardTiles =
    useMemo(() => {

      return (dashboards || []).map(
        (item) => ({
          id: item.id,

          label:
            item.page_name ||
            "Untitled Dashboard",

          searchText: [
            item.page_name,
            item.description,
            item.id,
            item.created_by,
            item.status,
          ]
            .filter(Boolean)
            .join(" "),

          dashboard: item,

          onClick: () =>
            window.open(
              item.page_url ||
                `/dashboardbuilder/${item.id}`,
              "_blank",
              "noopener,noreferrer"
            ),
        })
      );

    }, [dashboards]);

  const selectedLayoutRecord =
  useMemo(() => {
    return (
      layouts.find(
        (layout) =>
          layout.id ===
          selectedLayoutId
      ) || null
    );
  }, [
    layouts,
    selectedLayoutId,
  ]);


const selectedLayoutDefinition =
  useMemo(() => {
    if (!selectedLayoutRecord) {
      return {};
    }

    const raw =
      selectedLayoutRecord.layout_definition;

    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }

    return raw || {};
  }, [selectedLayoutRecord]);


const selectedLocalTemplate =
  useMemo(() => {
    const templateKey =
      selectedLayoutDefinition?.templateKey;

    if (!templateKey) {
      return null;
    }

    return getDashboardTemplate(
      templateKey
    );
  }, [selectedLayoutDefinition]);

  /* ===========================================================================
     LOAD DATA
  =========================================================================== */

  useEffect(() => {

    const loadDashboards =
      async () => {

        try {

          const res =
            await api.get(
              "/dashboardbuilder"
            );

          setDashboards(
            res.data || []
          );

        } catch (err) {

          console.error(
            "Failed to load dashboards",
            err
          );
        }
      };


    const loadTables =
      async () => {

        try {

          const res =
            await api.get(
              "/crudpages/db/meta/tables"
            );

          const all =
            Array.isArray(
              res.data
            )
              ? res.data
              : [];

          setTables(
            all.filter((t) =>
              String(t)
                .toLowerCase()
                .startsWith(
                  "cust_"
                )
            )
          );

        } catch (err) {

          console.error(
            "Failed to load tables",
            err
          );
        }
      };


    const loadLayouts =
  async () => {

    try {

      const res =
        await api.get(
          "/dashboardlayouts"
        );


      const list =
        Array.isArray(
          res.data
        )
          ? res.data
          : [];


      setLayouts(
        list
      );


      if (
        list.length
      ) {
        setSelectedLayoutId(
          (current) =>
            current ||
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


    loadDashboards();

    loadTables();

    loadLayouts();

  }, []);

const registerBuiltInTemplates =
  async () => {

    try {

      const res =
        await api.post(
          "/dashboardlayouts/register-template",
          {
            dashboardName:
              ExecutiveWorkspaceTemplate.name,

            description:
              ExecutiveWorkspaceTemplate.description,

            layoutDefinition:
              ExecutiveWorkspaceTemplate.layoutDefinition,
          }
        );

      return res.data;

    } catch (err) {

      console.error(
        "Failed to register built-in dashboard templates",
        err
      );

      /*
       * IMPORTANT:
       * Let the calling button know registration failed.
       */
      throw err;
    }
  };
  /* ===========================================================================
     CREATE FORM HELPERS
  =========================================================================== */

  const resetCreateForm =
    () => {

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


  const handleAddRow =
    () => {

      setChartRows(
        (prev) => [
          ...prev,

          {
            tableName: "",
            chartType: "",
            chartName: "",
            xAxis: "",
            yAxis: "",
          },
        ]
      );
    };


  const handleRemoveRow =
    (idx) => {

      setChartRows(
        (prev) =>
          prev.filter(
            (_, i) =>
              i !== idx
          )
      );
    };


  const handleRowChange =
    (
      idx,
      key,
      value
    ) => {

      setChartRows(
        (prev) =>
          prev.map(
            (row, i) =>
              i === idx
                ? {
                    ...row,
                    [key]:
                      value,
                  }
                : row
          )
      );
    };


  /* ===========================================================================
     LOAD COLUMNS
  =========================================================================== */

  const loadColumns =
    async (tableName) => {

      if (
        !tableName ||
        columnsByTable[
          tableName
        ]
      ) {
        return;
      }

      try {

        const res =
          await api.get(
            `/db/columns/${tableName}`
          );

        const cols =
          res?.data
            ?.columns || [];

        setColumnsByTable(
          (prev) => ({
            ...prev,

            [tableName]:
              cols,
          })
        );

      } catch (err) {

        console.error(
          "Failed to load columns",
          err
        );

        setColumnsByTable(
          (prev) => ({
            ...prev,

            [tableName]:
              [],
          })
        );
      }
    };


  /* ===========================================================================
     CREATE DASHBOARD
  =========================================================================== */

  const handleCreate =
    async () => {

      if (!name.trim()) {

        alert(
          "Name is required"
        );

        return;
      }


      const selectedLayout =
        layouts.find(
          (layout) =>
            layout.id ===
            selectedLayoutId
        );


      if (
        !selectedLayout
      ) {

        alert(
          "Select a layout"
        );

        return;
      }


      const rawDefinition =
  selectedLayout.layout_definition;

let parsedDefinition = {};

if (typeof rawDefinition === "string") {
  try {
    parsedDefinition =
      JSON.parse(rawDefinition);
  } catch {
    parsedDefinition = {};
  }
} else {
  parsedDefinition =
    rawDefinition || {};
}

const localTemplate =
  parsedDefinition?.templateKey
    ? getDashboardTemplate(
        parsedDefinition.templateKey
      )
    : null;


      let normalizedRows = [];
let selectedTables = [];


/* ============================================================
   NEW COMPONENT-BASED TEMPLATE

   Components will be configured after the dashboard is created.
   Therefore no chart configuration is required at creation time.
============================================================ */

if (localTemplate) {

  normalizedRows = [];

  selectedTables = [];

}


/* ============================================================
   LEGACY DASHBOARD LAYOUT

   Preserve the existing behaviour.
============================================================ */

else {

  normalizedRows =
    chartRows.map(
      (row) => ({
        tableName:
          String(
            row.tableName || ""
          ).trim(),

        chartType:
          String(
            row.chartType || ""
          ).trim(),

        chartName:
          String(
            row.chartName || ""
          ).trim(),

        xAxis:
          String(
            row.xAxis || ""
          ).trim(),

        yAxis:
          String(
            row.yAxis || ""
          ).trim(),
      })
    );


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


  selectedTables =
    normalizedRows
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
}


      const layout = {
  layoutId:
    selectedLayout.id,

  layoutName:
    selectedLayout.dashboard_name ||
    "",

  layoutDefinition:
    parsedDefinition,

  charts:
    normalizedRows,

  /*
   * New component-oriented templates
   * start with no configured components.
   */
  components:
    localTemplate
      ? {}
      : undefined,

  meta: {
    templateKey:
      parsedDefinition?.templateKey ||
      null,

    templateVersion:
      localTemplate?.version ||
      null,
  },
};


      try {

        const res =
          await api.post(
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


        setDashboards(
          (prev) => [
            res.data,
            ...prev,
          ]
        );


        setCreateOpen(
          false
        );


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
     DELETE DASHBOARD
  =========================================================================== */

  const handleDeleteDashboard =
    async (
      event,
      item
    ) => {

      event.stopPropagation();


      if (!item?.id) {
        return;
      }


      const ok =
        window.confirm(
          "Delete this dashboard?"
        );


      if (!ok) {
        return;
      }


      try {

        await api.delete(
          `/dashboardbuilder/${item.id}`
        );


        setDashboards(
          (prev) =>
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

    <Box
      sx={{
        minHeight:
          "100vh",

        bgcolor:
          "#f5f7fb",
      }}
    >

      {/* =====================================================================
          MODULE TILE GRID
         ===================================================================== */}

      <ModuleTileGrid

        title="Dashboard Studio"

        subtitle="Create enterprise dashboards to visualize business processes, operational data and performance insights."

        tiles={
          dashboardTiles
        }

        searchPlaceholder="Search dashboards"

        primaryAction={{
          label:
            "Create New Dashboard",

          onClick: () => {

            resetCreateForm();

            setCreateOpen(
              true
            );
          },
        }}

        controls={
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
    }}
  >
    {/* =========================================================
        TEMPORARY ADMIN TEMPLATE SYNC
       ========================================================= */}

    <Button
      variant="outlined"
      onClick={async () => {
        try {
          await registerBuiltInTemplates();

          const res =
            await api.get(
              "/dashboardlayouts"
            );

          const list =
            Array.isArray(res.data)
              ? res.data
              : [];

          setLayouts(list);

          alert(
            "Dashboard templates synchronized successfully."
          );
        } catch (err) {
          console.error(
            "Template synchronization failed",
            err
          );

          alert(
            err?.response?.data?.error ||
            "Template synchronization failed."
          );
        }
      }}
      sx={{
        height: 36,
        px: 1.6,

        borderRadius: "7px",

        borderColor: "#cbd5df",

        color: "#53677b",

        bgcolor: "#ffffff",

        fontSize: 11.5,
        fontWeight: 600,

        textTransform: "none",

        "&:hover": {
          borderColor: "#9fb0c1",
          bgcolor: "#f5f8fb",
        },
      }}
    >
      Sync Templates
    </Button>


    {/* =========================================================
        EXISTING UPLOAD LAYOUT
       ========================================================= */}

    <Button
      variant="outlined"
      component="label"
      sx={{
        height: 36,
        px: 1.6,

        borderRadius: "7px",

        borderColor: "#cbd5df",

        color: "#53677b",

        bgcolor: "#ffffff",

        fontSize: 11.5,
        fontWeight: 600,

        textTransform: "none",

        "&:hover": {
          borderColor: "#9fb0c1",
          bgcolor: "#f5f8fb",
        },
      }}
    >
      Upload Layout

      <input
        type="file"
        hidden
        accept=".html,.txt"
        onChange={async (e) => {
          const file =
            e.target.files?.[0];

          if (!file) {
            return;
          }

          const form =
            new FormData();

          form.append(
            "file",
            file
          );

          try {
            await api.post(
              "/dashboardlayouts/upload",
              form,
              {
                headers: {
                  "Content-Type":
                    "multipart/form-data",
                },
              }
            );

            alert(
              "Upload completed"
            );

            const res =
              await api.get(
                "/dashboardlayouts"
              );

            const list =
              Array.isArray(res.data)
                ? res.data
                : [];

            setLayouts(list);

            if (list.length) {
              setSelectedLayoutId(
                list[
                  list.length - 1
                ].id
              );
            }
          } catch (err) {
            console.error(
              "Failed to upload layout",
              err
            );

            alert(
              "Failed to upload layout"
            );
          } finally {
            e.target.value =
              "";
          }
        }}
      />
    </Button>
  </Box>
}

        showDefaultFooter={
          false
        }

        renderTileContent={(
          tile
        ) => {

          const item =
            tile.dashboard;


          if (!item) {
            return null;
          }


          const formatDate =
            (value) => {

              if (!value) {
                return "-";
              }


              const date =
                new Date(
                  value
                );


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
                  day:
                    "2-digit",

                  month:
                    "short",

                  year:
                    "numeric",
                }
              );
            };


          const modifiedDate =
            item.date_modified ||
            item.date_created;


          const TileRow = ({
            label,
            value,
          }) => (

            <Box
              sx={{
                display:
                  "grid",

                gridTemplateColumns:
                  "82px minmax(0,1fr)",

                columnGap:
                  0.4,

                alignItems:
                  "center",

                height: 18,

                minWidth: 0,
              }}
            >

              <Typography
                noWrap

                sx={{
                  fontSize:
                    10,

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
                  item.page_name ||
                  ""
                }

                sx={{
                  width: "100%",

                  fontSize:
                    14,

                  fontWeight:
                    700,

                  lineHeight:
                    "20px",

                  color:
                    "#172b4d",

                  overflow:
                    "hidden",

                  textOverflow:
                    "ellipsis",

                  whiteSpace:
                    "nowrap",
                }}
              >
                {item.page_name ||
                  "Untitled Dashboard"}
              </Typography>


              {/* DESCRIPTION */}

              <Typography

                title={
                  item.description ||
                  ""
                }

                sx={{
                  mt: 0.3,

                  minHeight:
                    26,

                  maxHeight:
                    26,

                  fontSize:
                    9.8,

                  fontWeight:
                    400,

                  lineHeight:
                    "13px",

                  color:
                    "#8a98a8",

                  display:
                    "-webkit-box",

                  WebkitBoxOrient:
                    "vertical",

                  WebkitLineClamp:
                    2,

                  overflow:
                    "hidden",
                }}
              >
                {item.description ||
                  ""}
              </Typography>


              {/* PUSH DETAILS DOWN */}

              <Box
                sx={{
                  flexGrow: 1,
                }}
              />


              {/* DETAILS */}

              <Box
                sx={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "minmax(0,1fr) auto",

                  columnGap: 1,

                  alignItems:
                    "end",

                  width:
                    "100%",

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
                    label="Dashboard ID"
                    value={
                      item.id
                    }
                  />


                  <TileRow
                    label="Created By"
                    value={
                      item.created_by ??
                      "-"
                    }
                  />


                  <TileRow
                    label="Modified"
                    value={
                      formatDate(
                        modifiedDate
                      )
                    }
                  />

                </Box>


                {/* DELETE */}

                <Button

                  size="small"

                  onClick={(
                    event
                  ) => {

                    event.stopPropagation();


                    handleDeleteDashboard(
                      event,
                      item
                    );
                  }}

                  sx={{
                    height: 27,

                    minHeight:
                      27,

                    px: 0.9,

                    border:
                      "1px solid #f0c0bc",

                    borderRadius:
                      "6px",

                    color:
                      "#b42318",

                    bgcolor:
                      "#ffffff",

                    fontSize:
                      10,

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

              </Box>

            </>
          );
        }}
      />


      {/* =====================================================================
          CREATE DASHBOARD MODAL
         ===================================================================== */}

      <Dialog

        open={
          createOpen
        }

        onClose={() =>
          setCreateOpen(
            false
          )
        }

        maxWidth={
          false
        }

        /*
          This is the main dialog backdrop.

          We allow a dark overlay but explicitly
          remove any global blur styling.
        */

        BackdropProps={{
          sx: {
            backdropFilter:
              "none !important",

            WebkitBackdropFilter:
              "none !important",

            backgroundColor:
              "rgba(17, 31, 46, .42) !important",
          },
        }}

        PaperProps={{
          sx: {
            width:
              "min(1050px, 94vw)",

            maxHeight:
              "90vh",

            borderRadius:
              "16px",

            overflow:
              "hidden",

            bgcolor:
              "#f8fbfe",

            border:
              "1px solid #cfdbe7",

            boxShadow:
              "0 24px 70px rgba(18, 41, 67, 0.24)",
          },
        }}
      >

        {/* ================================================================
            HEADER
           ================================================================ */}

        <Box
          sx={{
            px: 2.5,
            py: 2,

            display:
              "flex",

            alignItems:
              "flex-start",

            justifyContent:
              "space-between",

            background:
              "linear-gradient(105deg, #187f96 0%, #16849c 45%, #247c98 100%)",

            color:
              "#ffffff",
          }}
        >

          <Box>

            <Typography
              sx={{
                fontSize: 20,

                fontWeight:
                  700,

                lineHeight:
                  1.2,
              }}
            >
              Create New Dashboard
            </Typography>


            <Typography
              sx={{
                mt: 0.45,

                fontSize:
                  11.5,

                color:
                  "rgba(255,255,255,.88)",

                lineHeight:
                  1.45,
              }}
            >
              Define the dashboard, select a layout and configure the data models
              that will drive its visualizations.
            </Typography>

          </Box>


          <Button

            onClick={() =>
              setCreateOpen(
                false
              )
            }

            sx={{
              minWidth:
                34,

              width: 34,

              height: 34,

              borderRadius:
                "50%",

              color:
                "#ffffff",

              fontSize:
                20,

              bgcolor:
                "rgba(255,255,255,.10)",

              "&:hover":
                {
                  bgcolor:
                    "rgba(255,255,255,.18)",
                },
            }}
          >
            ×
          </Button>

        </Box>


        {/* ================================================================
            BODY
           ================================================================ */}

        <DialogContent
          sx={{
            p: 2.5,

            overflowY:
              "auto",

            bgcolor:
              "#f8fbfe",
          }}
        >

          {/* ==============================================================
              DASHBOARD INFORMATION
             ============================================================== */}

          <Paper
            elevation={0}

            sx={{
              p: 2,

              mb: 2.5,

              border:
                "1px solid #d9e4ee",

              borderRadius:
                "12px",

              bgcolor:
                "#ffffff",
            }}
          >

            <Typography
              sx={{
                mb: 1.4,

                fontSize:
                  12.5,

                fontWeight:
                  700,

                color:
                  "#294766",
              }}
            >
              Dashboard Information
            </Typography>


            <Grid
              container
              spacing={2}
            >

              <Grid
                item
                xs={12}
                md={5}
              >

                <TextField
                  fullWidth

                  size="small"

                  label="Dashboard Name"

                  placeholder="Enter dashboard name"

                  value={
                    name
                  }

                  onChange={(e) =>
                    setName(
                      e.target
                        .value
                    )
                  }
 sx={gentleFieldSx}
                //   sx={{
                //     "& .MuiOutlinedInput-root":
                //       {
                //         height:
                //           42,

                //         borderRadius:
                //           "7px",

                //         bgcolor:
                //           "#ffffff",
                //       },
                //   }}
                 />

              </Grid>


              <Grid
                item
                xs={12}
                md={7}
              >

                <TextField
                  fullWidth

                  size="small"

                  label="Description"

                  placeholder="Briefly describe the purpose of this dashboard"

                  value={
                    description
                  }

                  onChange={(e) =>
                    setDescription(
                      e.target
                        .value
                    )
                  }
 sx={gentleFieldSx}
                  // sx={{
                  //   "& .MuiOutlinedInput-root":
                  //     {
                  //       height:
                  //         42,

                  //       borderRadius:
                  //         "7px",

                  //       bgcolor:
                  //         "#ffffff",
                  //     },
                  // }}
                />

              </Grid>

            </Grid>

          </Paper>


          {/* ==============================================================
              SELECT LAYOUT
             ============================================================== */}

          <Paper
            elevation={0}

            sx={{
              p: 2,

              mb: 2.5,

              border:
                "1px solid #d9e4ee",

              borderRadius:
                "12px",

              bgcolor:
                "#ffffff",
            }}
          >

            <Box
              sx={{
                mb: 1.4,
              }}
            >

              <Typography
                sx={{
                  fontSize:
                    12.5,

                  fontWeight:
                    700,

                  color:
                    "#294766",
                }}
              >
                Select Layout
              </Typography>


              <Typography
                sx={{
                  mt: 0.25,

                  fontSize:
                    10.5,

                  color:
                    "#7a8da1",
                }}
              >
                Choose the dashboard layout that best suits your reporting requirement.
              </Typography>

            </Box>


            <Grid
              container
              spacing={1.5}
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


                  const localTemplate =
                  def?.templateKey
                    ? getDashboardTemplate(
                        def.templateKey
                      )
                    : null;

                    const previewHtml =
                  typeof def?.html === "string"
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
                          position:
                            "relative",

                          p: 1,

                          borderRadius:
                            "10px",

                          cursor:
                            "pointer",

                          border:
                            isSelected
                              ? "2px solid #0a74d7"
                              : "1px solid #d7e1ea",

                          bgcolor:
                            isSelected
                              ? "#f5faff"
                              : "#ffffff",

                          transition:
                            "all .16s ease",

                          "&:hover":
                            {
                              borderColor:
                                "#8bb9e3",

                              boxShadow:
                                "0 4px 12px rgba(35,72,108,.08)",
                            },
                        }}
                      >

                        {/* SELECTED */}

                        {isSelected && (

                          <Box
                            sx={{
                              position:
                                "absolute",

                              top: 8,

                              right: 8,

                              zIndex: 2,

                              px: 0.8,

                              py: 0.25,

                              borderRadius:
                                999,

                              bgcolor:
                                "#0a74d7",

                              color:
                                "#ffffff",

                              fontSize:
                                9,

                              fontWeight:
                                700,
                            }}
                          >
                            Selected
                          </Box>
                        )}


                        {/* PREVIEW */}

                        <Box
                          sx={{
                            height:
                              135,

                            position:
                              "relative",

                            overflow:
                              "hidden",

                            borderRadius:
                              "7px",

                            border:
                              "1px solid #dce5ed",

                            bgcolor:
                              "#f7f9fb",
                          }}
                        >

                          {localTemplate ? (

  <Box
    sx={{
      position:
        "absolute",

      inset: 0,

      p: 1,

      display:
        "grid",

      gridTemplateColumns:
        "24% 1fr",

      gap: 0.6,

      bgcolor:
        "#f8fafc",
    }}
  >

    {/* SIDEBAR */}

    <Box
      sx={{
        borderRadius:
          "4px",

        bgcolor:
          "#ffffff",

        border:
          "1px solid #e0e7ee",

        p: 0.5,
      }}
    >

      <Box
        sx={{
          height: 6,

          width: "75%",

          mb: 0.7,

          borderRadius:
            1,

          bgcolor:
            "#344f67",
        }}
      />

      {[1,2,3,4,5,6].map(
        (item) => (

          <Box
            key={
              item
            }
            sx={{
              height: 5,

              mb: 0.45,

              borderRadius:
                1,

              bgcolor:
                item === 1
                  ? "#dcecfb"
                  : "#edf1f5",
            }}
          />

        )
      )}

    </Box>


    {/* MAIN */}

    <Box
      sx={{
        minWidth: 0,
      }}
    >

      <Box
        sx={{
          height: 7,

          width: "44%",

          mb: 0.8,

          borderRadius:
            1,

          bgcolor:
            "#263f58",
        }}
      />


      {/* KPI */}

      <Box
        sx={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(5,1fr)",

          gap: 0.35,

          mb: 0.55,
        }}
      >

        {[1,2,3,4,5].map(
          (item) => (

            <Box
              key={
                item
              }
              sx={{
                height: 18,

                borderRadius:
                  "3px",

                border:
                  "1px solid #dce4eb",

                bgcolor:
                  "#ffffff",
              }}
            />

          )
        )}

      </Box>


      {/* CHART ROW */}

      <Box
        sx={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(3,1fr)",

          gap: 0.35,

          mb: 0.35,
        }}
      >

        {[1,2,3].map(
          (item) => (

            <Box
              key={
                item
              }
              sx={{
                height: 39,

                borderRadius:
                  "3px",

                border:
                  "1px solid #dce4eb",

                bgcolor:
                  "#ffffff",
              }}
            />

          )
        )}

      </Box>


      <Box
        sx={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(3,1fr)",

          gap: 0.35,
        }}
      >

        {[1,2,3].map(
          (item) => (

            <Box
              key={
                item
              }
              sx={{
                height: 22,

                borderRadius:
                  "3px",

                border:
                  "1px solid #dce4eb",

                bgcolor:
                  "#ffffff",
              }}
            />

          )
        )}

      </Box>

    </Box>

  </Box>

) : previewHtml ? (

  <Box
    sx={{
      transform:
        "scale(0.32)",

      transformOrigin:
        "top left",

      width:
        "312.5%",

      height:
        "312.5%",
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

      inset: 14,

      border:
        "1px dashed #b8c6d4",

      borderRadius:
        "5px",
    }}
  />

)}

                        </Box>


                        <Typography
                          noWrap

                          sx={{
                            mt: 0.9,

                            textAlign:
                              "center",

                            fontSize:
                              11,

                            fontWeight:
                              600,

                            color:
                              "#33485d",
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

          </Paper>


          {/* ==============================================================
              DATA MODELS
             ============================================================== */}
{!selectedLocalTemplate && (
          <Paper

            elevation={0}

            sx={{
              p: 2,

              border:
                "1px solid #d9e4ee",

              borderRadius:
                "12px",

              bgcolor:
                "#ffffff",
            }}
          >

            <Box
              sx={{
                mb: 1.4,
              }}
            >

              <Typography
                sx={{
                  fontSize:
                    12.5,

                  fontWeight:
                    700,

                  color:
                    "#294766",
                }}
              >
                Data Models & Charts
              </Typography>


              <Typography
                sx={{
                  mt: 0.25,

                  fontSize:
                    10.5,

                  color:
                    "#7a8da1",
                }}
              >
                Select the source table and chart configuration for each dashboard visualization.
              </Typography>

            </Box>


            <Box
              sx={{
                display:
                  "grid",

                gap: 1.2,
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
                        "grid",

                      gridTemplateColumns:
                        {
                          xs:
                            "1fr",

                          md:
                            "1.35fr 1fr 1.2fr 1.2fr 1.2fr auto",
                        },

                      gap: 1,

                      alignItems:
                        "center",

                      p: 1.2,

                      border:
                        "1px solid #e5ebf1",

                      borderRadius:
                        "9px",

                      bgcolor:
                        "#fafcfe",
                    }}
                  >

                    {/* TABLE */}

                    <TextField

                      select

                      fullWidth

                      size="small"

                      label="Table"

                      value={
                        row.tableName
                      }

                      SelectProps={{
                        MenuProps:
                          gentleMenuProps,
                      }}

                      onChange={(e) => {

                        handleRowChange(
                          idx,
                          "tableName",
                          e.target.value
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
                          e.target.value
                        );
                      }}

                      sx={{
                        "& .MuiOutlinedInput-root":
                          {
                            height:
                              40,

                            bgcolor:
                              "#ffffff",
                          },
                      }}
                    >

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
                            {table}
                          </MenuItem>

                        )
                      )}

                    </TextField>


                    {/* CHART TYPE */}

                    <TextField

                      select

                      fullWidth

                      size="small"

                      label="Chart Type"

                      value={
                        row.chartType
                      }

                      SelectProps={{
                        MenuProps:
                          gentleMenuProps,
                      }}

                      onChange={(e) =>
                        handleRowChange(
                          idx,
                          "chartType",
                          e.target.value
                        )
                      }
                    >

                      {CHART_TYPES.map(
                        (
                          chartType
                        ) => (

                          <MenuItem
                            key={
                              chartType
                            }
                            value={
                              chartType
                            }
                          >
                            {chartType}
                          </MenuItem>

                        )
                      )}

                    </TextField>


                    {/* CHART NAME */}

                    <TextField

                      fullWidth

                      size="small"

                      label="Chart Name"

                      value={
                        row.chartName
                      }

                      onChange={(e) =>
                        handleRowChange(
                          idx,
                          "chartName",
                          e.target.value
                        )
                      }
                    />


                    {/* X AXIS */}

                    <TextField

                      select

                      fullWidth

                      size="small"

                      label="X Axis"

                      value={
                        row.xAxis
                      }

                      disabled={
                        !row.tableName
                      }

                      SelectProps={{
                        MenuProps:
                          gentleMenuProps,
                      }}

                      onChange={(e) =>
                        handleRowChange(
                          idx,
                          "xAxis",
                          e.target.value
                        )
                      }
                    >

                      {(
                        columnsByTable[
                          row.tableName
                        ] || []
                      ).map(
                        (column) => (

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

                    </TextField>


                    {/* Y AXIS */}

                    <TextField

                      select

                      fullWidth

                      size="small"

                      label="Y Axis"

                      value={
                        row.yAxis
                      }

                      disabled={
                        !row.tableName
                      }

                      SelectProps={{
                        MenuProps:
                          gentleMenuProps,
                      }}

                      onChange={(e) =>
                        handleRowChange(
                          idx,
                          "yAxis",
                          e.target.value
                        )
                      }
                    >

                      {(
                        columnsByTable[
                          row.tableName
                        ] || []
                      ).map(
                        (column) => (

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

                    </TextField>


                    {/* ADD / REMOVE */}

                    <Box
                      sx={{
                        display:
                          "flex",

                        alignItems:
                          "center",

                        gap: 0.3,
                      }}
                    >

                      {idx ===
                        chartRows.length -
                          1 && (

                        <Button

                          onClick={
                            handleAddRow
                          }

                          sx={{
                            minWidth:
                              32,

                            width:
                              32,

                            height:
                              32,

                            borderRadius:
                              "7px",

                            bgcolor:
                              "#eaf3fc",

                            color:
                              "#0a74d7",

                            p: 0,

                            "&:hover":
                              {
                                bgcolor:
                                  "#dcecfb",
                              },
                          }}
                        >

                          <AddCircleOutlineIcon
                            sx={{
                              fontSize:
                                18,
                            }}
                          />

                        </Button>
                      )}


                      {chartRows.length >
                        1 && (

                        <Button

                          onClick={() =>
                            handleRemoveRow(
                              idx
                            )
                          }

                          sx={{
                            minWidth:
                              32,

                            width:
                              32,

                            height:
                              32,

                            borderRadius:
                              "7px",

                            bgcolor:
                              "#fff1f0",

                            color:
                              "#c03c33",

                            p: 0,

                            "&:hover":
                              {
                                bgcolor:
                                  "#fde9e7",
                              },
                          }}
                        >

                          <RemoveCircleOutlineIcon
                            sx={{
                              fontSize:
                                18,
                            }}
                          />

                        </Button>
                      )}

                    </Box>

                  </Box>
                )
              )}

            </Box>

          </Paper>
)}
        </DialogContent>


        {/* ================================================================
            FOOTER
           ================================================================ */}

        <DialogActions
          sx={{
            px: 2.5,

            py: 1.6,

            gap: 1,

            bgcolor:
              "#f6f9fc",

            borderTop:
              "1px solid #dce5ed",
          }}
        >

          <Button

            onClick={() =>
              setCreateOpen(
                false
              )
            }

            sx={{
              height: 38,

              px: 2,

              borderRadius:
                "7px",

              bgcolor:
                "#e4e7ea",

              color:
                "#36516f",

              fontSize:
                11.5,

              fontWeight:
                700,

              textTransform:
                "none",

              "&:hover":
                {
                  bgcolor:
                    "#d8dde2",
                },
            }}
          >
            Cancel
          </Button>


          <Button

            variant="contained"

            onClick={
              handleCreate
            }

            sx={{
              height: 38,

              px: 2.2,

              borderRadius:
                "7px",

              bgcolor:
                "#0a74d7",

              fontSize:
                11.5,

              fontWeight:
                700,

              textTransform:
                "none",

              boxShadow:
                "0 3px 8px rgba(10,116,215,.18)",

              "&:hover":
                {
                  bgcolor:
                    "#0862b8",
                },
            }}
          >
            Create Dashboard
          </Button>

        </DialogActions>

      </Dialog>

    </Box>
  );
}