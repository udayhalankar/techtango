import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import api from "../../../services/api";
import Chart from "chart.js/auto";
import {
  getDashboardTemplate,
} from "./dashboardTemplates/dashboardTemplateRegistry";
import AddComponentModal from
  "./components/AddComponentModal";
import KpiConfigModal from
  "./components/KpiConfigModal";
import DashboardComponentRenderer from
  "./components/DashboardComponentRenderer";

import ChartConfigModal from
  "./components/ChartConfigModal";

import DuplicateComponentModal from
  "./components/DuplicateComponentModal";

import TableConfigModal from
  "./components/TableConfigModal";

import MediaConfigModal from
  "./components/MediaConfigModal";

import {
  findNextCompatibleSlot,
  getConsumedSlotIds,
} from "./components/dashboardSlotUtils";

import TextConfigModal from
  "./components/TextConfigModal";

import {
  dialogBackdropSx,
  dialogPaperSx,
  dialogHeaderSx,
  dialogTitleSx,
  dialogSubtitleSx,
  dialogBodySx,
  dialogFooterSx,
  gentleFieldSx,
  cancelButtonSx,
  primaryButtonSx,
  closeIconButtonSx,
} from "./components/dashboardDialogStyles";

import CrudConfigModal from
  "./components/CrudConfigModal";

const CHART_TYPES = ["Bar", "H. Bar", "Line", "Pie", "Doughnut"];
const AGGREGATIONS = ["actual", "count", "avg", "sum"];

const ChartSlot = React.memo(function ChartSlot({ tag, slotId, props, cfg }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    if (!cfg || !Array.isArray(cfg.labels) || !Array.isArray(cfg.values)) return;
    if (!canvasRef.current) return;

    const typeMap = {
      Bar: "bar",
      "H. Bar": "bar",
      Pie: "pie",
      Doughnut: "doughnut",
      Line: "line",
    };

    const chartType = typeMap[cfg.chartType] || "line";
    const isCircularChart =
  cfg.chartType === "Pie" ||
  cfg.chartType === "Doughnut";

  const options = {
    responsive: true,

    maintainAspectRatio: false,

    layout: {
      padding: isCircularChart
        ? {
            top: 18,
            right: 60,
            bottom: 18,
            left: 60,
          }
        : {
            top: 6,
            right: 6,
            bottom: 6,
            left: 6,
          },
    },

    plugins: {
      legend: {
        /*
        * Pie/Doughnut gets our custom
        * labels around the chart instead.
        */
        display: !isCircularChart,

        position: "top",

        align: "start",

        labels: {
          boxWidth: 12,
          boxHeight: 8,

          padding: 8,

          color: "#65788a",

          font: {
            size: 9,
            weight: "400",
          },
        },
      },
    },
  };


const pieCalloutLabels = {
  id: "pieCalloutLabels",

  afterDatasetsDraw(chart) {
    if (!isCircularChart) {
      return;
    }

    const {
      ctx,
      chartArea,
    } = chart;

    const meta =
      chart.getDatasetMeta(0);

    if (
      !meta ||
      !meta.data ||
      !meta.data.length
    ) {
      return;
    }

    ctx.save();

    ctx.font =
      "400 9px Arial, sans-serif";

    ctx.fillStyle =
      "#65788a";

    ctx.strokeStyle =
      "#9aacbc";

    ctx.lineWidth = 1;

    meta.data.forEach(
      (arc, index) => {
        const props =
          arc.getProps(
            [
              "x",
              "y",
              "startAngle",
              "endAngle",
              "outerRadius",
            ],
            true
          );

        const angle =
          (
            props.startAngle +
            props.endAngle
          ) / 2;

        const cos =
          Math.cos(angle);

        const sin =
          Math.sin(angle);

        /*
         * Start at the outer edge
         * of the pie slice.
         */
        const x1 =
          props.x +
          cos *
            props.outerRadius;

        const y1 =
          props.y +
          sin *
            props.outerRadius;

        /*
         * Small diagonal leader.
         */
        const x2 =
          props.x +
          cos *
            (
              props.outerRadius +
              10
            );

        const y2 =
          props.y +
          sin *
            (
              props.outerRadius +
              10
            );

        /*
         * Horizontal leader.
         */
        const rightSide =
          cos >= 0;

        const x3 =
          x2 +
          (
            rightSide
              ? 18
              : -18
          );

        const y3 =
          y2;

        ctx.beginPath();

        ctx.moveTo(
          x1,
          y1
        );

        ctx.lineTo(
          x2,
          y2
        );

        ctx.lineTo(
          x3,
          y3
        );

        ctx.stroke();

        /*
         * Compact label
         */
        let label =
          String(
            cfg.labels?.[
              index
            ] ?? ""
          );

        /*
         * Convert long JS date
         * labels into:
         * 16 Jan 2002
         */
        const parsedDate =
          new Date(label);

        if (
          !Number.isNaN(
            parsedDate.getTime()
          ) &&
          /GMT|00:00:00|T\d{2}:/.test(
            label
          )
        ) {
          label =
            parsedDate.toLocaleDateString(
              "en-GB",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            );
        }

        /*
         * Safety for long labels.
         */
        if (
          label.length >
          17
        ) {
          label =
            `${label.slice(
              0,
              16
            )}…`;
        }

        ctx.textAlign =
          rightSide
            ? "left"
            : "right";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          label,

          x3 +
            (
              rightSide
                ? 4
                : -4
            ),

          y3
        );
      }
    );

    ctx.restore();
  },
};

    chartRef.current = new Chart(
  canvasRef.current,
  {
    type: chartType,

    data: {
      labels: cfg.labels,

      datasets: [
        {
          label:
            cfg.chartName ||
            cfg.tableName ||
            "Dataset",

          data:
            cfg.values,
        },
      ],
    },

    options,

    plugins:
      isCircularChart
        ? [
            pieCalloutLabels,
          ]
        : [],
  }
);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [cfg]);

  const content = cfg && Array.isArray(cfg.labels) && Array.isArray(cfg.values) ? (
    <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
  ) : (
    <div style={{ fontSize: "12px", color: "#9ca3af", padding: "8px" }}>
      No data for slot {slotId}.
    </div>
  );

  return React.createElement(tag, { ...(props || {}) }, content);
});



const SchemaLayout = React.memo(
  function SchemaLayout({
    schema,
    renderNode,
    layoutRef,
  }) {
    return (
      <Box
        ref={layoutRef}
        sx={{
          width: "100%",
          minWidth: 0,
          maxWidth: "100%",

          /* CHART TITLES */

"& .chart-card h1, \
 & .chart-card h2, \
 & .chart-card h3, \
 & .chart-card h4, \
 & .chart-card h5, \
 & .chart-card h6, \
 & .chart-title": {
  color: "#40566d !important",

  fontSize: "11.5px !important",

  fontWeight: "600 !important",

  lineHeight: "1.3 !important",

  letterSpacing: "0 !important",
},

          /*
           * Prevent uploaded template widths/padding
           * from increasing the actual page width.
           */
          boxSizing: "border-box",

          "&, & *": {
            boxSizing: "border-box",
          },

          /*
           * Main template shell
           */
          "& .app": {
            width: "100% !important",
            maxWidth: "100% !important",
            minWidth: "0 !important",

            margin: "0 !important",

            overflow: "hidden",
          },

          /*
           * Sidebar
           */
          "& .sidebar": {
            minWidth: "0 !important",
            maxWidth: "100%",

            bgcolor: "#ffffff",

            borderColor:
              "#dce3ea !important",
          },

          /*
           * Main dashboard area
           */
          "& .main, & .content": {
            minWidth: "0 !important",

            width: "100% !important",
            maxWidth: "100% !important",
          },

          /*
           * Header/title area inside uploaded layout
           */
          "& .title": {
            color: "#172b4d !important",

            fontWeight: "700 !important",
          },

          "& .subtitle": {
            color: "#738496 !important",
          },

          /*
           * KPI / metric cards
           */
          "& .metric, & .kpi, & .kpi-card": {
            borderColor:
              "#d9e4ee !important",

            borderRadius:
              "8px !important",

            boxShadow:
              "none !important",

            bgcolor:
              "#ffffff !important",
          },

          /*
           * Chart cards
           */
          "& .chart-card": {
            minWidth: "0 !important",

            border:
              "1px solid #d9e4ee !important",

            borderRadius:
              "12px !important",

            bgcolor:
              "#ffffff !important",

            boxShadow:
              "0 2px 6px rgba(28,45,65,.04) !important",

            overflow: "hidden",
          },

          /*
           * Charts themselves must never push
           * a column wider.
           */
          "& canvas": {
            width: "100% !important",
            maxWidth: "100% !important",
          },

          /*
           * Generic grids coming from uploaded layouts.
           */
          "& [style*='grid-template-columns']": {
            minWidth: "0 !important",
          },

          /*
           * Navigation/sidebar buttons
           */
          "& .menu button": {
            minHeight: "38px",

            border:
              "1px solid #d9e4ee !important",

            borderRadius:
              "7px !important",

            bgcolor:
              "#ffffff !important",

            color:
              "#33485d !important",

            fontSize:
              "11px !important",

            fontWeight:
              "600 !important",

            boxShadow:
              "none !important",
          },

          "& .menu button:hover": {
            bgcolor:
              "#f5f8fb !important",

            borderColor:
              "#aebfce !important",
          },
        }}
      >
        {renderNode(
          schema,
          "root"
        )}
      </Box>
    );
  },

  (prev, next) =>
    prev.schema === next.schema &&
    prev.renderNode ===
      next.renderNode
);

export default function DashboardViewer() {
  const { dashboardId } = useParams();
  const [dashboard, setDashboard] = useState(null);
  const [chartDataByLayout, setChartDataByLayout] = useState({});
  const [layoutConfig, setLayoutConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableLayouts, setAvailableLayouts] = useState([]);
  const [activeLayoutIndex, setActiveLayoutIndex] = useState(0);
  
  const [columnsByTable, setColumnsByTable] = useState({});
  const [tables, setTables] = useState([]);
  const [titleConfigOpen, setTitleConfigOpen] = useState(false);
  const [titleConfigTarget, setTitleConfigTarget] = useState("sidebar");
  const [titleFields, setTitleFields] = useState({
    sidebarTitle: "",
    sidebarSubtitle: "",
    pageTitle: "",
    pageSubtitle: "",
    showSidebar: true,
  });
  const [sidebarConfig, setSidebarConfig] = useState({
    widget: "",
    links: [{ name: "", url: "" }],
  });

  const [
  textConfigOpen,
  setTextConfigOpen,
  ] = useState(false);

  const [
  mediaConfigOpen,
  setMediaConfigOpen,
] =
  useState(false);

  const [
  addComponentOpen,
  setAddComponentOpen,
  ] = useState(false);
  const [
    activeComponentSlot,
    setActiveComponentSlot,
  ] = useState(null);

  const [
  crudConfigOpen,
  setCrudConfigOpen,
  ] = useState(false);

  const [
    crudPages,
    setCrudPages,
  ] = useState([]);

  const [
  duplicateComponentOpen,
  setDuplicateComponentOpen,
] = useState(false);


const [
  componentToDuplicate,
  setComponentToDuplicate,
] = useState(null);


const [
  componentTableConfigOpen,
  setComponentTableConfigOpen,
] = useState(false);


const [
  componentTableData,
  setComponentTableData,
] = useState({});


  const [
  kpiConfigOpen,
  setKpiConfigOpen,
  ] = useState(false);

  const [
  componentChartConfigOpen,
  setComponentChartConfigOpen,
] = useState(false);


const [
  componentChartData,
  setComponentChartData,
] = useState({});

  const [
    kpiData,
    setKpiData,
  ] = useState({});

  const [widgetData, setWidgetData] = useState(null);
  const [widgetError, setWidgetError] = useState("");
  const [pageConfig, setPageConfig] = useState({ showSidebar: true, showCharts: [] });
  const [chartConfigOpen, setChartConfigOpen] = useState(false);
  const [chartIndex, setChartIndex] = useState(null);
  const [chartForm, setChartForm] = useState({
    tableName: "",
    chartType: "",
    chartName: "",
    xAxis: "",
    yAxis: "",
    aggregation: "actual",
  });
  const [extraLayoutId, setExtraLayoutId] = useState("");
  const [extraChartRows, setExtraChartRows] = useState([
    {
      tableName: "",
      chartType: "",
      chartName: "",
      xAxis: "",
      yAxis: "",
      aggregation: "actual",
    },
  ]);
  const layoutRef = useRef(null);


  useEffect(() => {
    const load = async () => {
      try {
        setActiveLayoutIndex(0);
        setChartDataByLayout({});
        const res = await api.get(`/dashboardbuilder/${dashboardId}`);
        setDashboard(res.data || null);
        setLayoutConfig(res.data?.layout || null);
        const tablesRes = await api.get("/crudpages/db/meta/tables");
        const allTables = Array.isArray(tablesRes.data) ? tablesRes.data : [];
        setTables(allTables.filter((t) => String(t).toLowerCase().startsWith("cust_")));
        const layoutsRes = await api.get("/dashboardlayouts");
        const list = Array.isArray(layoutsRes.data) ? layoutsRes.data : [];
        setAvailableLayouts(list);

        try {

  const crudRes =
    await api.get(
      "/crudpages"
    );


  setCrudPages(
    Array.isArray(
      crudRes.data
    )
      ? crudRes.data
      : []
  );

} catch (err) {

  console.error(
    "Failed to load CRUD pages",
    err
  );


  setCrudPages(
    []
  );
}
      } catch (err) {
        console.error("Failed to load dashboard", err);
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dashboardId]);

  useEffect(() => {
    if (!dashboardId) return;
    const loadCharts = async () => {
      try {
        const chartsRes = await api.get(
          `/dashboardbuilder/${dashboardId}/chart-data?layoutIndex=${activeLayoutIndex}`
        );
        const nextCharts = chartsRes?.data?.charts || [];
        setChartDataByLayout((prev) => ({
          ...prev,
          [activeLayoutIndex]: nextCharts,
        }));
      } catch (err) {
        console.error("Failed to load chart data", err);
        setChartDataByLayout((prev) => ({
          ...prev,
          [activeLayoutIndex]: [],
        }));
      }
    };
    loadCharts();
  }, [dashboardId, activeLayoutIndex]);

  const additionalLayouts = useMemo(() => {
    return Array.isArray(layoutConfig?.meta?.additionalLayouts)
      ? layoutConfig.meta.additionalLayouts
      : [];
  }, [layoutConfig?.meta?.additionalLayouts]);

  const layoutStack = useMemo(() => {
    return layoutConfig ? [layoutConfig, ...additionalLayouts] : [];
  }, [layoutConfig, additionalLayouts]);

  useEffect(() => {
    const maxIndex = layoutStack.length ? layoutStack.length - 1 : 0;
    if (activeLayoutIndex > maxIndex) {
      setActiveLayoutIndex(0);
    }
  }, [layoutStack, activeLayoutIndex]);

  const activeLayout = layoutStack[activeLayoutIndex] || layoutConfig;
  const activeComponents =
  useMemo(() => {

    return (
      activeLayout
        ?.components ||
      {}
    );

  }, [
    activeLayout
      ?.components,
  ]);


   useEffect(() => {

  const loadComponentTables =
    async () => {

      const entries =
        Object.entries(
          activeComponents ||
          {}
        )
          .filter(
            (
              [
                ,
                component,
              ]
            ) =>
              component?.type ===
              "table"
          );


      if (
        !entries.length
      ) {

        setComponentTableData(
          {}
        );

        return;
      }


      const results =
        await Promise.all(

          entries.map(
            async (
              [
                slotId,
                component,
              ]
            ) => {

              try {

                const source =
                  component
                    ?.dataSource ||
                  {};


                const res =
                  await api.post(
                    `/dashboardbuilder/${dashboardId}/component-table-data`,
                    {
                      tableName:
                        source.tableName,

                      selectedColumns:
                        source.selectedColumns,

                      sortColumn:
                        source.sortColumn,

                      sortDirection:
                        source.sortDirection,

                      rowLimit:
                        source.rowLimit,
                    }
                  );


                return [
                  slotId,

                  {
                    columns:
                      res?.data
                        ?.columns ||
                      [],

                    rows:
                      res?.data
                        ?.rows ||
                      [],
                  },
                ];

              } catch (err) {

                console.error(
                  `Failed to load component table ${slotId}`,
                  err
                );


                return [
                  slotId,

                  {
                    columns: [],
                    rows: [],
                  },
                ];
              }
            }
          )
        );


      setComponentTableData(
        Object.fromEntries(
          results
        )
      );
    };


  loadComponentTables();

}, [
  activeComponents,
  dashboardId,
]);


  useEffect(() => {

  const loadKpis =
    async () => {

      const entries =
        Object.entries(
          activeComponents ||
          {}
        )
          .filter(
            (
              [
                ,
                component,
              ]
            ) =>
              component?.type ===
              "kpi"
          );


      if (
        !entries.length
      ) {

        setKpiData({});

        return;
      }


      const results =
        await Promise.all(

          entries.map(
            async (
              [
                slotId,
                component,
              ]
            ) => {

              try {

                const res =
                  await api.post(
                    `/dashboardbuilder/${dashboardId}/kpi-data`,
                    {
                      tableName:
                        component
                          ?.dataSource
                          ?.tableName,

                      aggregation:
                        component
                          ?.dataSource
                          ?.aggregation,

                      valueColumn:
                        component
                          ?.dataSource
                          ?.valueColumn,
                    }
                  );


                return [
                  slotId,

                  res?.data
                    ?.value ??
                    null,
                ];

              } catch (err) {

                console.error(
                  `Failed to load KPI ${slotId}`,
                  err
                );


                return [
                  slotId,
                  null,
                ];
              }
            }
          )
        );


      setKpiData(
        Object.fromEntries(
          results
        )
      );
    };


  loadKpis();

}, [
  activeComponents,
  dashboardId,
]);



useEffect(() => {

  const loadComponentCharts =
    async () => {

      const entries =
        Object.entries(
          activeComponents ||
          {}
        )
          .filter(
            (
              [
                ,
                component,
              ]
            ) =>
              component?.type ===
              "chart"
          );


      if (
        !entries.length
      ) {

        setComponentChartData(
          {}
        );

        return;
      }


      const results =
        await Promise.all(

          entries.map(
            async (
              [
                slotId,
                component,
              ]
            ) => {

              try {

                const source =
                  component
                    ?.dataSource ||
                  {};


                const res =
                  await api.post(
                    `/dashboardbuilder/${dashboardId}/component-chart-data`,
                    {
                      tableName:
                        source.tableName,

                      xAxis:
                        source.xAxis,

                      yAxis:
                        source.yAxis,

                      aggregation:
                        source.aggregation,
                    }
                  );


                return [
                  slotId,

                  {
                    labels:
                      res?.data
                        ?.labels ||
                      [],

                    values:
                      res?.data
                        ?.values ||
                      [],
                  },
                ];

              } catch (err) {

                console.error(
                  `Failed to load component chart ${slotId}`,
                  err
                );


                return [
                  slotId,

                  {
                    labels: [],
                    values: [],
                  },
                ];
              }
            }
          )
        );


      setComponentChartData(
        Object.fromEntries(
          results
        )
      );
    };


  loadComponentCharts();

}, [
  activeComponents,
  dashboardId,
]);


  const layoutDefinition = useMemo(() => {

  const raw =
    activeLayout?.layoutDefinition;


  let parsed = {};


  /* =========================================================
     NORMALIZE DATABASE VALUE
     ========================================================= */

  if (
    typeof raw === "string"
  ) {

    try {

      parsed =
        JSON.parse(raw);

    } catch {

      const trimmed =
        raw.trim();


      if (
        trimmed.startsWith("<")
      ) {

        parsed = {
          html: raw,
        };

      } else {

        parsed = {};
      }
    }

  } else {

    parsed =
      raw || {};
  }


  /* =========================================================
     RESOLVE LOCAL TEMPLATE FILE
     ========================================================= */

  const templateKey =
    parsed?.templateKey;


  if (templateKey) {

    const localTemplate =
      getDashboardTemplate(
        templateKey
      );

      

    if (localTemplate) {

      return {

        /*
         * Database properties remain available.
         */
        ...parsed,

        /*
         * But schema/slot structure comes from
         * the version-controlled template file.
         */
        schema:
          localTemplate.schema,

        slots:
          localTemplate.slots,

        templateCss:
          localTemplate.css,

        templateName:
          localTemplate.name,

        templateVersion:
          localTemplate.version,
      };
    }
  }


  /*
   * Existing legacy layouts continue working.
   */
  return parsed;

}, [
  activeLayout?.layoutDefinition,
]);


/* =========================================================
   ALL COMPONENT SLOTS

   Used for layout operations such as Merge Right because
   the current occupied slot must remain in the ordered list.
========================================================= */

const allComponentSlots =
  useMemo(() => {

    const slots =
      layoutDefinition
        ?.slots ||
      [];


    return slots
      .map(
        (slot) => ({
          slotId:
            slot?.id ||
            slot?.slotId,

          accepts:
            Array.isArray(
              slot?.accepts
            )
              ? slot.accepts
              : String(
                  slot?.accepts ||
                  ""
                )
                  .split(",")
                  .map(
                    (item) =>
                      item.trim()
                  )
                  .filter(Boolean),
        })
      )
      .filter(
        (slot) =>
          Boolean(
            slot.slotId
          )
      );

  }, [
    layoutDefinition?.slots,
  ]);


/* =========================================================
   AVAILABLE / EMPTY COMPONENT SLOTS

   Used for Duplicate and any operation that needs a free
   destination.
========================================================= */

const availableComponentSlots =
  useMemo(() => {

    return allComponentSlots
      .filter(
        (slot) =>
          !activeComponents[
            slot.slotId
          ]
      );

  }, [
    allComponentSlots,
    activeComponents,
  ]);

const consumedComponentSlots =
  useMemo(
    () =>
      getConsumedSlotIds(
        activeComponents
      ),
    [
      activeComponents,
    ]
  );


  const layoutHtml =
  typeof layoutDefinition?.html === "string"
    ? layoutDefinition.html
    : "";

const layoutSchema =
  layoutDefinition?.schema || null;

const layoutMode =
  layoutSchema ? "schema" : "missing";

  const activeChartData = useMemo(() => {
    return Array.isArray(chartDataByLayout[activeLayoutIndex])
      ? chartDataByLayout[activeLayoutIndex]
      : [];
  }, [chartDataByLayout, activeLayoutIndex]);
  const chartSlotCount = Array.isArray(layoutDefinition?.chartSlots)
    ? layoutDefinition.chartSlots.length
    : activeChartData.length;
  const dbtableList = useMemo(() => {
    if (activeLayoutIndex > 0) {
      const extra = additionalLayouts[activeLayoutIndex - 1];
      const rawExtra = extra?.dbtableId ?? extra?.dbtable_id;
      if (typeof rawExtra === "string") {
        try {
          const parsed = JSON.parse(rawExtra);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return Array.isArray(rawExtra) ? rawExtra : [];
    }
    const raw = dashboard?.dbtable_id ?? dashboard?.dbtableId;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(raw) ? raw : [];
  }, [dashboard, additionalLayouts, activeLayoutIndex]);
  const tableOptions = useMemo(() => {
    const merged = new Set([...(tables || []), ...(dbtableList || [])]);
    return Array.from(merged);
  }, [tables, dbtableList]);

  const chartSlotIndex = useMemo(() => {
    const slots = Array.isArray(layoutDefinition?.chartSlots) ? layoutDefinition.chartSlots : [];
    return slots.reduce((acc, slotId, idx) => {
      acc[String(slotId)] = idx;
      return acc;
    }, {});
  }, [layoutDefinition?.chartSlots]);

  const activeCharts = useMemo(() => {
    return Array.isArray(activeLayout?.charts) ? activeLayout.charts : [];
  }, [activeLayout?.charts]);

  const openSchemaConfig =
  useCallback(
    (
      target,
      event
    ) => {

      event?.preventDefault?.();
      event?.stopPropagation?.();


      const root =
        layoutRef.current;


      if (!root) {
        return;
      }


      const meta =
        layoutConfig?.meta ||
        {};


      const brand =
        root.querySelector(
          "[data-config-target='sidebar']"
        );


      const pageHost =
        root.querySelector(
          "[data-config-target='page']"
        );


      const pageTitleEl =
        pageHost?.querySelector(
          ".title"
        );


      const pageSubtitleEl =
        pageHost?.querySelector(
          ".subtitle"
        );


      const sidebarSubtitleEl =
        brand?.querySelector(
          "small"
        );


      const showSidebar =
        meta.showSidebar !==
        false;


      /* =====================================================
         SIDEBAR
      ===================================================== */

      if (
        target ===
        "sidebar"
      ) {

        const currentLinks =
          Array.isArray(
            meta.sidebarLinks
          ) &&
          meta.sidebarLinks.length
            ? meta.sidebarLinks
            : Array.from(
                root.querySelectorAll(
                  ".menu button"
                )
              ).map(
                (button) => ({
                  name:
                    button
                      .textContent
                      ?.trim() ||
                    "",

                  url: "",
                })
              );


        setTitleFields({
          sidebarTitle:
            meta.sidebarTitle ||
            brand
              ?.childNodes?.[0]
              ?.textContent
              ?.trim() ||
            "",

          sidebarSubtitle:
            meta.sidebarSubtitle ||
            sidebarSubtitleEl
              ?.textContent
              ?.trim() ||
            "",

          pageTitle:
            meta.pageTitle ||
            pageTitleEl
              ?.textContent
              ?.trim() ||
            "",

          pageSubtitle:
            meta.pageSubtitle ||
            pageSubtitleEl
              ?.textContent
              ?.trim() ||
            "",

          showSidebar,
        });


        setSidebarConfig({
          widget:
            meta.sidebarWidget ||
            "",

          links:
            currentLinks.length
              ? currentLinks
              : [
                  {
                    name: "",
                    url: "",
                  },
                ],
        });


        setTitleConfigTarget(
          "sidebar"
        );


        setTitleConfigOpen(
          true
        );


        return;
      }


      /* =====================================================
         PAGE
      ===================================================== */

      const activeHiddenCharts =
        activeLayoutIndex ===
        0
          ? meta.hiddenCharts
          : additionalLayouts[
              activeLayoutIndex -
                1
            ]?.hiddenCharts;


      const hiddenCharts =
        Array.isArray(
          activeHiddenCharts
        )
          ? activeHiddenCharts
          : [];


      const nextShowCharts =
        Array.from({
          length:
            chartSlotCount ||
            0,
        }).map(
          (_, index) =>
            hiddenCharts[
              index
            ] !== true
        );


      setTitleFields({
        sidebarTitle:
          meta.sidebarTitle ||
          "",

        sidebarSubtitle:
          meta.sidebarSubtitle ||
          "",

        pageTitle:
          meta.pageTitle ||
          pageTitleEl
            ?.textContent
            ?.trim() ||
          "",

        pageSubtitle:
          meta.pageSubtitle ||
          pageSubtitleEl
            ?.textContent
            ?.trim() ||
          "",

        showSidebar,
      });


      setPageConfig({
        showSidebar,

        showCharts:
          nextShowCharts,
      });


      setTitleConfigTarget(
        "page"
      );


      setTitleConfigOpen(
        true
      );

    },
    [
      layoutConfig,
      activeLayoutIndex,
      additionalLayouts,
      chartSlotCount,
    ]
  );

  const renderSchemaNode =
  useCallback(
    (node, key) => {

      const normalizeProps =
        (rawProps) => {

          if (!rawProps) {
            return {};
          }

          if (
            typeof rawProps.style ===
            "string"
          ) {

            const styleObj = {};

            rawProps.style
              .split(";")
              .map(
                (rule) =>
                  rule.trim()
              )
              .filter(Boolean)
              .forEach(
                (rule) => {

                  const [
                    prop,
                    value,
                  ] =
                    rule
                      .split(":")
                      .map(
                        (part) =>
                          part.trim()
                      );

                  if (
                    !prop ||
                    !value
                  ) {
                    return;
                  }

                  const camel =
                    prop.replace(
                      /-([a-z])/g,
                      (_, chr) =>
                        chr.toUpperCase()
                    );

                  styleObj[
                    camel
                  ] =
                    value;
                }
              );

            return {
              ...rawProps,
              style: styleObj,
            };
          }

          return {
            ...rawProps,
          };
        };


      if (!node) {
        return null;
      }


      /* ============================================================
         GENERIC COMPONENT SLOT
      ============================================================ */

      const isComponentSlot =
        node?.type ===
          "element" &&
        node?.tag &&
        String(
          node?.props?.[
            "data-component-slot"
          ] || ""
        ) === "true";


      if (isComponentSlot) {

        const slotId =
          String(
            node?.props?.[
              "data-slot"
            ] || ""
          );


        const accepts =
  String(
    node?.props?.[
      "data-accepts"
    ] || ""
  )
    .split(",")
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean);


const configuredComponent =
  activeComponents[
    slotId
  ] ||
  null;


const isConsumedSlot =
  consumedComponentSlots.has(
    slotId
  );


if (
  isConsumedSlot &&
  !configuredComponent
) {
  return null;
}


const nextMergeSlot =
  configuredComponent
    ? findNextCompatibleSlot({
        slots:
          allComponentSlots,

        currentSlotId:
          slotId,

        componentType:
          configuredComponent
            ?.type,

        components:
          activeComponents,
      })
    : null;



if (
  configuredComponent?.type ===
  "crud"
) {

  console.log(
    "MERGE DEBUG",
    {
      currentSlotId:
        slotId,

      componentType:
        configuredComponent.type,

      allComponentSlots,

      nextMergeSlot,

      activeComponentKeys:
        Object.keys(
          activeComponents ||
          {}
        ),

      consumed:
        Array.from(
          consumedComponentSlots
        ),
    }
  );
}

console.log(
  "BOTTOM-1 COMPONENT",
  activeComponents["bottom-1"]
);




const normalizedProps =
          normalizeProps(
            node.props
          );


        /*
         * Remove any accidental React event
         * props supplied by the schema.
         */
        const slotProps = {
          ...normalizedProps,

          key,

          onClick: (
            event
          ) => {

            event.stopPropagation();


            setActiveComponentSlot({
              slotId,
              accepts,
            });


            setAddComponentOpen(
              true
            );
          },
        };


        if (
  configuredComponent
) {

  const normalizedProps =
    normalizeProps(
      node.props
    );


  return React.createElement(
    node.tag,

    {
      ...normalizedProps,

      key,

      style: {
  ...normalizedProps?.style,

  ...(Number(
    configuredComponent
      ?.layout
      ?.span
  ) > 1
    ? {
        gridColumnStart:
          "auto",

        gridColumnEnd:
          `span ${Number(
            configuredComponent
              ?.layout
              ?.span
          )}`,

        width:
          "100%",

        maxWidth:
          "100%",
      }
    : {}),
},
      
    },

    <DashboardComponentRenderer
      component={
        configuredComponent
      }

      dashboardId={
        dashboardId
      }


      value={
        kpiData[
          slotId
        ]
      }


      data={
        componentChartData[
          slotId
        ]
      }


      tableData={
        componentTableData[
          slotId
        ]
      }


      /* =====================================================
         CONFIGURE
      ===================================================== */

      onConfigure={() => {

        setActiveComponentSlot({
          slotId,
          accepts,
        });

        if (
            configuredComponent.type ===
            "text"
          ) {

            setTextConfigOpen(
              true
            );

            return;
          }


        if (
          configuredComponent.type ===
          "kpi"
        ) {

          setKpiConfigOpen(
            true
          );

          return;
        }


        if (
          configuredComponent.type ===
          "chart"
        ) {

          setComponentChartConfigOpen(
            true
          );

          return;
        }

        if (
            configuredComponent.type ===
            "crud"
          ) {

            setCrudConfigOpen(
              true
            );

            return;
          }


        if (
          configuredComponent.type ===
          "table"
        ) {

          setComponentTableConfigOpen(
            true
          );

          return;
        }
      }}


      /* =====================================================
         DUPLICATE
      ===================================================== */

      onDuplicate={() => {

        setActiveComponentSlot({
          slotId,
          accepts,
        });


        setComponentToDuplicate(
          configuredComponent
        );


        setDuplicateComponentOpen(
          true
        );
      }}


      /* =====================================================
         MERGE RIGHT
      ===================================================== */

      canMergeRight={
        Boolean(
          nextMergeSlot
        )
      }


      onMergeRight={async () => {

        if (
          !nextMergeSlot
        ) {
          return;
        }


        const mergedSlots =
          Array.isArray(
            configuredComponent
              ?.layout
              ?.mergedSlots
          )
            ? configuredComponent
                .layout
                .mergedSlots
            : [];


        const nextComponents = {
          ...activeComponents,

          [slotId]: {
            ...configuredComponent,

            layout: {
              ...configuredComponent
                ?.layout,

              span:
                Number(
                  configuredComponent
                    ?.layout
                    ?.span ||
                  1
                ) + 1,

              mergedSlots: [
                ...mergedSlots,

                nextMergeSlot
                  .slotId,
              ],
            },
          },
        };


        let nextLayout = {
          ...(layoutConfig ||
            {}),
        };


        /* PRIMARY LAYOUT */

        if (
          activeLayoutIndex ===
          0
        ) {

          nextLayout = {
            ...nextLayout,

            components:
              nextComponents,
          };

        }

        /* ADDITIONAL LAYOUT */

        else {

          const nextAdditional = [
            ...additionalLayouts,
          ];


          nextAdditional[
            activeLayoutIndex -
              1
          ] = {
            ...nextAdditional[
              activeLayoutIndex -
                1
            ],

            components:
              nextComponents,
          };


          nextLayout = {
            ...nextLayout,

            meta: {
              ...nextLayout.meta,

              additionalLayouts:
                nextAdditional,
            },
          };
        }


        await saveLayout(
          nextLayout
        );
      }}


      /* =====================================================
         REMOVE
      ===================================================== */

      onRemove={async () => {

        const confirmed =
          window.confirm(
            "Remove this component from the dashboard?"
          );


        if (
          !confirmed
        ) {
          return;
        }


        const nextComponents = {
          ...activeComponents,
        };


        delete nextComponents[
          slotId
        ];


        let nextLayout = {
          ...(layoutConfig ||
            {}),
        };


        /* PRIMARY LAYOUT */

        if (
          activeLayoutIndex ===
          0
        ) {

          nextLayout = {
            ...nextLayout,

            components:
              nextComponents,
          };

        }

        /* ADDITIONAL LAYOUT */

        else {

          const nextAdditional = [
            ...additionalLayouts,
          ];


          nextAdditional[
            activeLayoutIndex -
              1
          ] = {
            ...nextAdditional[
              activeLayoutIndex -
                1
            ],

            components:
              nextComponents,
          };


          nextLayout = {
            ...nextLayout,

            meta: {
              ...nextLayout.meta,

              additionalLayouts:
                nextAdditional,
            },
          };
        }


        await saveLayout(
          nextLayout
        );
      }}
    />
  );
}




  

        return React.createElement(
          node.tag,

          slotProps,

          <div
            className=
              "dashboard-empty-slot"

            role="button"

            tabIndex={0}

            onKeyDown={(
              event
            ) => {

              if (
                event.key ===
                  "Enter" ||
                event.key ===
                  " "
              ) {

                event.preventDefault();

                event.stopPropagation();


                setActiveComponentSlot({
                  slotId,
                  accepts,
                });


                setAddComponentOpen(
                  true
                );
              }
            }}
          >

            <div
              className=
                "dashboard-empty-slot-icon"
            >
              +
            </div>


            <div
              className=
                "dashboard-empty-slot-title"
            >
              Add Component
            </div>


            <div
              className=
                "dashboard-empty-slot-help"
            >
              {accepts.join(
                " · "
              )}
            </div>

          </div>
        );
      }


      /* ============================================================
         LEGACY CHART SLOT
      ============================================================ */

      const slotId =
        node?.props?.[
          "data-chart"
        ];


      if (
        node?.type ===
          "element" &&
        node?.tag &&
        slotId
      ) {

        const slotKey =
          String(slotId);


        let chartPos =
          chartSlotIndex[
            slotKey
          ];


        if (
          chartPos ===
            undefined &&
          /^\d+$/.test(
            slotKey
          )
        ) {

          chartPos =
            Number(
              slotKey
            ) - 1;
        }


        const cfg =
          chartPos !==
          undefined
            ? activeChartData[
                chartPos
              ]
            : null;


        const normalizedProps =
          normalizeProps(
            node.props
          );


        return (
          <ChartSlot
            key={key}

            tag={
              node.tag
            }

            slotId={
              slotKey
            }

            props={
              normalizedProps
            }

            cfg={
              cfg
            }
          />
        );
      }


      /* ============================================================
         TEXT
      ============================================================ */

      if (
        node.type ===
        "text"
      ) {
        return node.text;
      }


      /* ============================================================
         CHILDREN
      ============================================================ */

      const children =
        Array.isArray(
          node.children
        )
          ? node.children.map(
              (
                child,
                idx
              ) =>
                renderSchemaNode(
                  child,
                  `${key}-${idx}`
                )
            )
          : null;


      /* ============================================================
         FRAGMENT
      ============================================================ */

      if (
        node.type ===
        "fragment"
      ) {

        return (
          <React.Fragment
            key={key}
          >
            {children}
          </React.Fragment>
        );
      }


    /* ============================================================
   STANDARD ELEMENT
============================================================ */

if (
  node.type ===
    "element" &&
  node.tag
) {

  /*
   * IMPORTANT:
   * Normalize props FIRST.
   * Everything below depends on this object.
   */
  const normalizedProps =
    normalizeProps(
      node.props
    );


  /* ==========================================================
     VOID ELEMENTS
  ========================================================== */

  const voidTags =
    new Set([
      "br",
      "hr",
    ]);


  if (
    voidTags.has(
      node.tag
    )
  ) {

    return React.createElement(
      node.tag,
      {
        key,
        ...normalizedProps,
      }
    );
  }


  /* ==========================================================
     CONFIGURATION TARGET

     Supported schema markers:

     data-config-target="sidebar"
     data-config-target="page"
  ========================================================== */

  const configTarget =
  String(
    normalizedProps?.[
      "data-config-target"
    ] ||
    ""
  )
    .trim()
    .toLowerCase();


  const isConfigTarget =
    configTarget ===
      "sidebar" ||
    configTarget ===
      "page";


  /* ==========================================================
     CONFIG BUTTON
  ========================================================== */

  const configButton =
    isConfigTarget
      ? (
          <button
            key={
              `${key}-config-btn`
            }

            type="button"

            className=
              "schema-config-btn"

            title={
              configTarget ===
              "sidebar"
                ? "Configure sidebar"
                : "Configure dashboard"
            }

            aria-label={
              configTarget ===
              "sidebar"
                ? "Configure sidebar"
                : "Configure dashboard"
            }

            onClick={(
              event
            ) =>
              openSchemaConfig(
                configTarget,
                event
              )
            }

            style={{
              position:
                "absolute",

              top: "0px",

              right: "0px",

              width: "27px",

              height: "27px",

              padding: "0",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              border:
                "1px solid #d7e1ea",

              borderRadius:
                "7px",

              background:
                "#ffffff",

              color:
                "#73879a",

              fontSize:
                "18px",

              fontWeight:
                600,

              lineHeight: 1,

              cursor:
                "pointer",

              boxShadow:
                "0 2px 7px rgba(28,48,68,.08)",

              zIndex: 20,
            }}
          >
            ⋮
          </button>
        )
      : null;


  /* ==========================================================
     CONFIG TARGET STYLE

     Reserve space for the ellipsis without affecting
     unrelated schema elements.
  ========================================================== */

  const elementStyle =
    isConfigTarget
      ? {
          ...(
            normalizedProps
              ?.style ||
            {}
          ),

          position:
            "relative",

          overflow:
            "visible",

          paddingRight:
            configTarget ===
            "sidebar"
              ? "34px"
              : "38px",
        }
      : normalizedProps
          ?.style;


  /* ==========================================================
     FINAL ELEMENT
  ========================================================== */

  return React.createElement(
    node.tag,

    {
      key,

      ...normalizedProps,

      ...(elementStyle
        ? {
            style:
              elementStyle,
          }
        : {}),
    },

    isConfigTarget
      ? [
          children,

          configButton,
        ]
      : children
  );
}



      return null;
    },

    [
  activeChartData,

  chartSlotIndex,

  activeComponents,

  kpiData,

  componentChartData,

  componentTableData,

  consumedComponentSlots,

  allComponentSlots,

  layoutConfig,

  activeLayoutIndex,

  additionalLayouts,

  openSchemaConfig,
]
  );

  useEffect(() => {
    if (!layoutRef.current) return;
    const root = layoutRef.current;
    if (!root || layoutMode !== "schema") return;
    

    

    const ensureButton = (
  target,
  onClick,
  options = {}
) => {

  if (!target) {
    return;
  }


  const {
    top = 6,
    right = 6,
    title = "Configure",
  } = options;


  /*
   * Do not add the same configuration
   * button twice.
   */
  const existing =
    Array.from(
      target.children || []
    ).find(
      (child) =>
        child?.classList?.contains(
          "db-config-btn"
        )
    );


  if (existing) {
    return;
  }


  const computed =
    window.getComputedStyle(
      target
    );


  if (
    computed.position ===
    "static"
  ) {
    target.style.position =
      "relative";
  }


  const btn =
    document.createElement(
      "button"
    );


  btn.type =
    "button";


  btn.className =
    "db-config-btn";


  btn.setAttribute(
    "aria-label",
    title
  );


  btn.setAttribute(
    "title",
    title
  );


  btn.innerHTML = `
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="5" r="1.8"></circle>
      <circle cx="12" cy="12" r="1.8"></circle>
      <circle cx="12" cy="19" r="1.8"></circle>
    </svg>
  `;


  Object.assign(
    btn.style,
    {
      position:
        "absolute",

      top:
        `${top}px`,

      right:
        `${right}px`,

      width:
        "26px",

      height:
        "26px",

      padding:
        "0",

      border:
        "1px solid rgba(211,222,232,.9)",

      borderRadius:
        "7px",

      background:
        "rgba(255,255,255,.94)",

      color:
        "#75889a",

      cursor:
        "pointer",

      display:
        "flex",

      alignItems:
        "center",

      justifyContent:
        "center",

      boxShadow:
        "0 2px 7px rgba(28,48,68,.08)",

      zIndex:
        "999",
    }
  );


  btn.addEventListener(
    "mouseenter",
    () => {

      btn.style.background =
        "#f4f8fb";

      btn.style.color =
        "#476982";
    }
  );


  btn.addEventListener(
    "mouseleave",
    () => {

      btn.style.background =
        "rgba(255,255,255,.94)";

      btn.style.color =
        "#75889a";
    }
  );


  btn.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      event.stopPropagation();


      onClick?.();
    }
  );


  target.appendChild(
    btn
  );
};

    const meta = layoutConfig?.meta || {};
    const activeHiddenCharts =
      activeLayoutIndex === 0
        ? meta.hiddenCharts
        : additionalLayouts[activeLayoutIndex - 1]?.hiddenCharts;
    const brand =
  root.querySelector(
    "[data-config-target='sidebar']"
  ) ||
  root.querySelector(
    ".brand"
  ) ||
  root.querySelector(
    ".sidebar"
  );


const sidebar =
  root.querySelector(
    ".sidebar"
  );


const appShell =
  root.querySelector(
    ".app"
  );


const pageConfigHost =
  root.querySelector(
    "[data-config-target='page']"
  ) ||
  root.querySelector(
    ".dashboard-page-header"
  );


const pageTitleEl =
  pageConfigHost
    ?.querySelector(
      ".title"
    ) ||
  root.querySelector(
    ".page-title"
  ) ||
  root.querySelector(
    ".title"
  ) ||
  root.querySelector(
    ".dashboard-title"
  );


const pageSubtitleEl =
  pageConfigHost
    ?.querySelector(
      ".subtitle"
    ) ||
  root.querySelector(
    ".page-subtitle"
  ) ||
  root.querySelector(
    ".subtitle"
  ) ||
  root.querySelector(
    ".dashboard-subtitle"
  );



    const showSidebar = meta.showSidebar !== false;
    if (sidebar) sidebar.style.display = showSidebar ? "" : "none";
    
    if (appShell) {
          appShell.style.width =
            "100%";

          appShell.style.maxWidth =
            "100%";

          appShell.style.minWidth =
            "0";

          appShell.style.gridTemplateColumns =
            showSidebar
              ? "minmax(190px, 250px) minmax(0, 1fr)"
              : "minmax(0, 1fr)";
        }

    if (brand && meta.sidebarTitle) {
      const small = brand.querySelector("small");
      brand.childNodes[0].textContent = meta.sidebarTitle;
      if (small) small.textContent = meta.sidebarSubtitle || "";
    }
    if (pageTitleEl && meta.pageTitle) pageTitleEl.textContent = meta.pageTitle;
    if (pageSubtitleEl && meta.pageSubtitle) pageSubtitleEl.textContent = meta.pageSubtitle;

    const menu = root.querySelector(".menu");
    if (menu && Array.isArray(meta.sidebarLinks)) {
      menu.innerHTML = "";
      meta.sidebarLinks.forEach((link) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = link?.name || "";
        if (link?.url) {
          btn.addEventListener("click", (event) => {
            event.stopPropagation();
            window.open(link.url, "_blank");
          });
        }
        menu.appendChild(btn);
      });
    }

    const widgetHost = root.querySelector(".cfg-widget-host") || (() => {
      if (!sidebar) return null;
      const host = document.createElement("div");
      host.className = "cfg-widget-host";
      host.style.margin = "12px 0 18px";
      host.style.padding = "12px";
      host.style.border = "1px solid #e5e7eb";
      host.style.borderRadius = "12px";
      host.style.background = "#fff";
      const ref = sidebar.querySelector(".menu") || sidebar;
      sidebar.insertBefore(host, ref);
      return host;
    })();

    if (widgetHost) {
      const widget = meta.sidebarWidget || "";
      const data = widgetData || {};
      const err = widgetError;
      if (!widget) {
        widgetHost.innerHTML = "";
        widgetHost.style.display = "none";
      } else if (err) {
        widgetHost.innerHTML = "";
        widgetHost.style.display = "none";
      } else if (widget === "time") {
        widgetHost.style.display = "";
        widgetHost.innerHTML = `<div style="font-weight:700;">Local Time</div><div>${data.datetime || "-"}</div>`;
      } else if (widget === "weather") {
        widgetHost.style.display = "";
        widgetHost.innerHTML = `<div style="font-weight:700;">Local Weather</div><div>${data.temperature ?? "-"}°C</div>`;
      } else if (widget === "exchange") {
        widgetHost.style.display = "";
        const entries = Object.entries(data.rates || {}).map(
          ([k, v]) => `<div>${k}: ${v}</div>`
        );
        widgetHost.innerHTML = `<div style="font-weight:700;">Exchange Rate</div>${entries.join("")}`;
      } else if (widget === "news") {
        widgetHost.style.display = "";
        const items = (data.items || [])
          .map((i) => `<div><a href="${i.link}" target="_blank" rel="noreferrer">${i.title}</a></div>`)
          .join("");
        widgetHost.innerHTML = `<div style="font-weight:700;">Financial News</div>${items}`;
      } else if (widget === "sports") {
        widgetHost.style.display = "";
        const items = (data.items || [])
          .map((i) => `<div><a href="${i.link}" target="_blank" rel="noreferrer">${i.title}</a></div>`)
          .join("");
        widgetHost.innerHTML = `<div style="font-weight:700;">Sports News</div>${items}`;
      } else if (widget === "ticker") {
        widgetHost.style.display = "";
        const items = (data.quotes || []).map(
          (q) => `<div>${q.companyName}: ${q.data?.priceInfo?.lastPrice ?? "-"}</div>`
        );
        widgetHost.innerHTML = `<div style="font-weight:700;">BSE/NSE Ticker</div>${items.join("")}`;
      } else if (widget === "bullion") {
        widgetHost.style.display = "";
        const items = Array.isArray(data.data)
          ? data.data.map((row) => `<div>${row[0]}: ${row[1]}</div>`)
          : [];
        widgetHost.innerHTML = `<div style="font-weight:700;">Bullion Rates</div>${items.join("")}`;
      }
    }





 
    const slots = Array.from(layoutRef.current.querySelectorAll("[data-chart]"));

    slots.forEach((slot) => {
  slot.style.minWidth = "0";
  slot.style.maxWidth = "100%";
  slot.style.overflow = "hidden";

  const chartCard =
    slot.closest(
      ".chart-card"
    );

  if (chartCard) {
    chartCard.style.minWidth =
      "0";

    chartCard.style.maxWidth =
      "100%";
  }
});

    const hiddenCharts = Array.isArray(activeHiddenCharts) ? activeHiddenCharts : [];

    slots.forEach((slot, idx) => {
      const slotId = slot.getAttribute("data-chart") || "";
      let chartPos = idx;
      if (Array.isArray(layoutDefinition?.chartSlots) && slotId) {
        const pos = layoutDefinition.chartSlots.indexOf(slotId);
        if (pos !== -1) chartPos = pos;
      } else if (/^\d+$/.test(slotId)) {
        chartPos = Number(slotId) - 1;
      }

      const chartTarget = slot.closest(".chart-card") || slot;
      if (hiddenCharts[chartPos]) {
        chartTarget.style.display = "none";
      } else {
        chartTarget.style.display = "";
      }
      ensureButton(chartTarget, () => {
        const current = activeCharts[chartPos] || {};
        const initial = {
          tableName: current.tableName || "",
          chartType: current.chartType || "",
          chartName: current.chartName || "",
          xAxis: current.xAxis || "",
          yAxis: current.yAxis || "",
          aggregation: current.aggregation || "actual",
        };
        setChartIndex(chartPos);
        setChartForm(initial);
        if (initial.tableName) loadColumns(initial.tableName);
        setChartConfigOpen(true);
      });

    });
  }, [
    layoutMode,
    activeChartData,
    layoutSchema,
    layoutConfig,
    widgetData,
    widgetError,
    tables,
    activeLayoutIndex,
    additionalLayouts,
    activeCharts,
    chartSlotCount,
  ]);

  useEffect(() => {
    const widget = layoutConfig?.meta?.sidebarWidget || "";
    if (!widget) {
      setWidgetData(null);
      setWidgetError("");
      return;
    }
    const load = async () => {
      try {
        setWidgetError("");
        if (widget === "time") {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          const res = await api.get(`/dashboardwidgets/time?tz=${encodeURIComponent(tz)}`);
          setWidgetData(res.data);
          return;
        }
        if (widget === "weather") {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords;
              const res = await api.get(
                `/dashboardwidgets/weather?lat=${latitude}&lon=${longitude}`
              );
              setWidgetData(res.data);
            },
            () => setWidgetError("Location permission required.")
          );
          return;
        }
        if (widget === "exchange") {
          const res = await api.get(`/dashboardwidgets/rates?base=USD&symbols=EUR,GBP,INR`);
          setWidgetData(res.data);
          return;
        }
        if (widget === "news") {
          const res = await api.get(`/dashboardwidgets/news?topic=financial`);
          setWidgetData(res.data);
          return;
        }
        if (widget === "sports") {
          const res = await api.get(`/dashboardwidgets/sports`);
          setWidgetData(res.data);
          return;
        }
        if (widget === "ticker") {
          const res = await api.get(`/dashboardwidgets/ticker?symbols=RELIANCE,TCS`);
          setWidgetData(res.data);
          return;
        }
        if (widget === "bullion") {
          const res = await api.get(`/dashboardwidgets/bullion`);
          setWidgetData(res.data);
        }
      } catch (err) {
        console.error("Failed to load widget", err);
        setWidgetError("Failed to load widget.");
      }
    };
    load();
  }, [layoutConfig?.meta?.sidebarWidget]);

  // addChartGridContainer removed per request.

  const loadColumns =
  useCallback(
    async (tableName) => {

      if (!tableName) {
        return;
      }


      /*
       * Do not reload columns already
       * available in state.
       */
      if (
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
          res?.data?.columns ||
          [];


        setColumnsByTable(
          (prev) => ({
            ...prev,

            [tableName]:
              cols,
          })
        );

      } catch {

        setColumnsByTable(
          (prev) => ({
            ...prev,

            [tableName]:
              [],
          })
        );
      }
    },

    [
      columnsByTable,
    ]
  );

  const resetExtraLayoutForm = () => {
    setExtraLayoutId("");
    setExtraChartRows([
      {
        tableName: "",
        chartType: "",
        chartName: "",
        xAxis: "",
        yAxis: "",
        aggregation: "actual",
      },
    ]);
  };

  const handleExtraRowChange = (idx, key, value) => {
    setExtraChartRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
    );
  };

  const handleAddExtraRow = () => {
    setExtraChartRows((prev) => [
      ...prev,
      {
        tableName: "",
        chartType: "",
        chartName: "",
        xAxis: "",
        yAxis: "",
        aggregation: "actual",
      },
    ]);
  };

  const handleRemoveExtraRow = (idx) => {
    setExtraChartRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveLayout = async (nextLayout) => {
    const res = await api.put(`/dashboardbuilder/${dashboardId}`, { layout: nextLayout });
    setDashboard(res.data || null);
    setLayoutConfig(res.data?.layout || null);
    const chartsRes = await api.get(
      `/dashboardbuilder/${dashboardId}/chart-data?layoutIndex=${activeLayoutIndex}`
    );
    const nextCharts = chartsRes?.data?.charts || [];
    setChartDataByLayout((prev) => ({
      ...prev,
      [activeLayoutIndex]: nextCharts,
    }));
  };

  const handleAddAdditionalLayout = async () => {
    const selectedLayout = availableLayouts.find((l) => l.id === extraLayoutId);
    if (!selectedLayout) {
      alert("Select a layout");
      return;
    }
    const normalizedRows = extraChartRows.map((row) => ({
      tableName: String(row.tableName || "").trim(),
      chartType: String(row.chartType || "").trim(),
      chartName: String(row.chartName || "").trim(),
      xAxis: String(row.xAxis || "").trim(),
      yAxis: String(row.yAxis || "").trim(),
      aggregation: String(row.aggregation || "actual").trim(),
    }));
    const hasMissingRow = normalizedRows.some(
      (row) =>
        !row.tableName || !row.chartType || !row.chartName || !row.xAxis || !row.yAxis
    );
    if (hasMissingRow) {
      alert("Complete all fields under Select Data Models");
      return;
    }
    const selectedTables = normalizedRows.map((r) => r.tableName).filter(Boolean);
    if (!selectedTables.length) {
      alert("Select at least one data model");
      return;
    }

    const rawDefinition = selectedLayout.layout_definition || {};
    let parsedDefinition = rawDefinition;
    if (typeof rawDefinition === "string") {
      try {
        parsedDefinition = JSON.parse(rawDefinition);
      } catch {
        const trimmed = rawDefinition.trim();
        parsedDefinition = trimmed.startsWith("<") ? { html: rawDefinition } : {};
      }
    }

    const newLayout = {
      layoutId: selectedLayout.id,
      layoutName: selectedLayout.dashboard_name || "",
      layoutDefinition: parsedDefinition,
      charts: normalizedRows,
      dbtableId: selectedTables,
      hiddenCharts: normalizedRows.map(() => false),
    };

    const meta = layoutConfig?.meta || {};
    const nextAdditional = Array.isArray(meta.additionalLayouts)
      ? [...meta.additionalLayouts, newLayout]
      : [newLayout];
    const nextLayout = {
      ...(layoutConfig || {}),
      meta: {
        ...meta,
        additionalLayouts: nextAdditional,
      },
    };
    await saveLayout(nextLayout);
    resetExtraLayoutForm();
    setActiveLayoutIndex(nextAdditional.length);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography>Dashboard not found</Typography>
      </Box>
    );
  }

  const layoutContent =
  layoutMode === "schema" &&
  layoutSchema ? (
    <>
      {layoutDefinition?.templateCss && (
        <style>
          {layoutDefinition.templateCss}
        </style>
      )}

      <SchemaLayout
        schema={layoutSchema}
        renderNode={renderSchemaNode}
        layoutRef={layoutRef}
      />
    </>
  ) : (
    <Box
      sx={{
        minHeight: "60vh",

        display: "flex",

        alignItems: "center",

        justifyContent:
          "center",

        p: 2,
      }}
    >
      <Typography>
        Layout schema is missing for this dashboard.
      </Typography>
    </Box>
  );

  const canSwitchLayouts = layoutStack.length > 1;
  const activeLayoutLabel =
    activeLayout?.layoutName ||
    activeLayout?.layoutDefinition?.name ||
    (activeLayoutIndex === 0 ? "Primary Layout" : `Layout ${activeLayoutIndex + 1}`);
  const activeLayoutId =
    activeLayout?.layoutId || (activeLayoutIndex === 0 ? "primary" : "unknown");

  return (
  <Box
  sx={{
    position: "relative",

    minHeight: "100vh",

    width: "100%",

    bgcolor: "#ffffff",

    p: 0,
    m: 0,
  }}
>
      {canSwitchLayouts && (
        <Box
          
        sx={{
  position: "fixed",

  top: 122,

  left: "50%",

  transform: "translateX(-50%)",

  zIndex: 1200,

  display: "flex",

  alignItems: "center",

  gap: 0.6,

  px: 0.7,
  py: 0.4,

  borderRadius: "9px",

  border: "1px solid #d9e4ee",

  bgcolor: "rgba(255,255,255,.96)",

  boxShadow:
    "0 5px 16px rgba(25,48,72,.10)",
}}

        >
          <Box
            role="button"
            aria-label="Previous layout"
            onClick={() =>
              setActiveLayoutIndex((prev) =>
                prev === 0 ? layoutStack.length - 1 : prev - 1
              )
            }
            sx={{ display: "flex", alignItems: "center", cursor: "pointer", p: 0.5 }}
          >
            <ArrowBackIosNewIcon fontSize="inherit" />
          </Box>
          <Typography
  noWrap
  sx={{
    minWidth: 150,
    maxWidth: 280,

    px: 0.8,

    textAlign: "center",

    fontSize: 10.5,

    fontWeight: 600,

    color: "#53677b",
  }}
>
  {activeLayoutLabel}
  {" · "}
  {activeLayoutIndex + 1}/
  {layoutStack.length}
</Typography>
          <Box
            role="button"
            aria-label="Next layout"
            onClick={() =>
              setActiveLayoutIndex((prev) =>
                prev === layoutStack.length - 1 ? 0 : prev + 1
              )
            }
            sx={{ display: "flex", alignItems: "center", cursor: "pointer", p: 0.5 }}
          >
            <ArrowForwardIosIcon fontSize="inherit" />
          </Box>
        </Box>
      )}
      
      
      
<Box
  sx={{
    width: "100%",

    maxWidth: "100%",

    m: 0,

    p: 0,

    overflow: "hidden",

    bgcolor: "#ffffff",
  }}
>
  {layoutContent}
</Box>
      
      
      {/* <Box
  sx={{
    width: {
      xs: "98%",
      sm: "96%",
      md: "94%",
      lg: "92%",
      xl: "90%",
    },

    maxWidth: "1600px",

    mx: "auto",

    bgcolor: "#ffffff",

    border:
      "1px solid #dfe5eb",

    borderRadius:
      "12px",

    overflow: "hidden",

    boxShadow:
      "0 2px 8px rgba(28,45,65,.04)",
  }}
>
  {layoutContent}
</Box> */}

 

{/* ========================================================================
    CONFIGURE SIDEBAR / DASHBOARD
======================================================================== */}

<Dialog
  open={titleConfigOpen}
  onClose={() =>
    setTitleConfigOpen(false)
  }
  maxWidth={false}
  BackdropProps={{
    sx: dialogBackdropSx,
  }}
  PaperProps={{
    sx: {
      ...dialogPaperSx,
      width: "min(760px, 92vw)",
      maxHeight: "88vh",
    },
  }}
>
  {/* ======================================================================
      HEADER
  ====================================================================== */}

  <Box sx={dialogHeaderSx}>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={dialogTitleSx}>
        {titleConfigTarget === "sidebar"
          ? "Configure Sidebar"
          : "Configure Dashboard"}
      </Typography>

      <Typography sx={dialogSubtitleSx}>
        {titleConfigTarget === "sidebar"
          ? "Configure sidebar titles, descriptions and navigation links."
          : "Configure dashboard titles, visibility and additional layouts."}
      </Typography>
    </Box>

    <Button
      onClick={() =>
        setTitleConfigOpen(false)
      }
      sx={closeIconButtonSx}
    >
      ×
    </Button>
  </Box>

  {/* ======================================================================
      BODY
  ====================================================================== */}

  <DialogContent
    sx={{
      ...dialogBodySx,

      display: "grid",
      gap: 1.5,

      overflowY: "auto",
    }}
  >
    {/* ====================================================================
        SIDEBAR CONFIGURATION
    ==================================================================== */}

    {titleConfigTarget === "sidebar" && (
      <>
        <TextField
          label="Sidebar Title"
          value={
            titleFields.sidebarTitle
          }
          onChange={(e) =>
            setTitleFields(
              (prev) => ({
                ...prev,
                sidebarTitle:
                  e.target.value,
              })
            )
          }
          fullWidth
          sx={gentleFieldSx}
        />

        <TextField
          label="Sidebar Description"
          value={
            titleFields.sidebarSubtitle
          }
          onChange={(e) =>
            setTitleFields(
              (prev) => ({
                ...prev,
                sidebarSubtitle:
                  e.target.value,
              })
            )
          }
          fullWidth
          multiline
          minRows={2}
          sx={{
            ...gentleFieldSx,

            "& .MuiOutlinedInput-root":
              {
                ...gentleFieldSx[
                  "& .MuiOutlinedInput-root"
                ],

                minHeight: 64,
                height: "auto",
                alignItems: "flex-start",
              },
          }}
        />

        {/* ================================================================
            NAVIGATION LINKS
        ================================================================ */}

        <Box>
          <Typography
            sx={{
              mb: 0.7,

              fontSize: 10.5,
              fontWeight: 600,

              color: "#53677b",
            }}
          >
            Navigation Links
          </Typography>

          <Box
            sx={{
              p: 1.4,

              display: "grid",
              gap: 1,

              border:
                "1px solid #dce5ed",

              borderRadius: "9px",

              bgcolor: "#ffffff",
            }}
          >
            {sidebarConfig.links.map(
              (link, idx) => (
                <Box
                  key={`sidebar-link-${idx}`}
                  sx={{
                    display: "grid",

                    gridTemplateColumns: {
                      xs:
                        "minmax(0,1fr)",

                      sm:
                        "minmax(0,1fr) minmax(0,1.35fr) 34px",
                    },

                    gap: 1,

                    alignItems: "center",
                  }}
                >
                  <TextField
                    label="Link Name"
                    value={link.name}
                    onChange={(e) =>
                      setSidebarConfig(
                        (prev) => {
                          const next = [
                            ...prev.links,
                          ];

                          next[idx] = {
                            ...next[idx],

                            name:
                              e.target
                                .value,
                          };

                          return {
                            ...prev,
                            links: next,
                          };
                        }
                      )
                    }
                    fullWidth
                    sx={gentleFieldSx}
                  />

                  <TextField
                    label="Link URL"
                    value={link.url}
                    onChange={(e) =>
                      setSidebarConfig(
                        (prev) => {
                          const next = [
                            ...prev.links,
                          ];

                          next[idx] = {
                            ...next[idx],

                            url:
                              e.target
                                .value,
                          };

                          return {
                            ...prev,
                            links: next,
                          };
                        }
                      )
                    }
                    fullWidth
                    sx={gentleFieldSx}
                  />

                  <Button
                    disabled={
                      sidebarConfig.links
                        .length <= 1
                    }
                    onClick={() =>
                      setSidebarConfig(
                        (prev) => ({
                          ...prev,

                          links:
                            prev.links.filter(
                              (
                                _,
                                linkIndex
                              ) =>
                                linkIndex !==
                                idx
                            ),
                        })
                      )
                    }
                    title="Remove link"
                    sx={{
                      minWidth: 34,
                      width: 34,
                      height: 34,

                      p: 0,

                      border:
                        "1px solid #ead6d3",

                      borderRadius: "7px",

                      color: "#b42318",

                      bgcolor: "#ffffff",

                      fontSize: 17,
                      fontWeight: 400,

                      textTransform:
                        "none",

                      "&:hover": {
                        bgcolor:
                          "#fff4f2",

                        borderColor:
                          "#dfb9b4",
                      },

                      "&.Mui-disabled": {
                        opacity: 0.3,
                      },
                    }}
                  >
                    ×
                  </Button>
                </Box>
              )
            )}

            <Button
              onClick={() =>
                setSidebarConfig(
                  (prev) => ({
                    ...prev,

                    links: [
                      ...prev.links,

                      {
                        name: "",
                        url: "",
                      },
                    ],
                  })
                )
              }
              sx={{
                justifySelf:
                  "start",

                minHeight: 31,

                mt: 0.2,

                px: 1.25,

                border:
                  "1px solid #d8e2eb",

                borderRadius: "6px",

                bgcolor: "#f7fafc",

                color: "#52718c",

                fontSize: 10,
                fontWeight: 600,

                textTransform:
                  "none",

                "&:hover": {
                  bgcolor:
                    "#eef5fa",

                  borderColor:
                    "#c4d5e2",
                },
              }}
            >
              + Add Link
            </Button>
          </Box>
        </Box>
      </>
    )}

    {/* ====================================================================
        PAGE / DASHBOARD CONFIGURATION
    ==================================================================== */}

    {titleConfigTarget === "page" && (
      <>
        <TextField
          label="Page Title"
          value={
            titleFields.pageTitle
          }
          onChange={(e) =>
            setTitleFields(
              (prev) => ({
                ...prev,

                pageTitle:
                  e.target.value,
              })
            )
          }
          fullWidth
          sx={gentleFieldSx}
        />

        <TextField
          label="Page Description"
          value={
            titleFields.pageSubtitle
          }
          onChange={(e) =>
            setTitleFields(
              (prev) => ({
                ...prev,

                pageSubtitle:
                  e.target.value,
              })
            )
          }
          fullWidth
          multiline
          minRows={2}
          sx={{
            ...gentleFieldSx,

            "& .MuiOutlinedInput-root":
              {
                ...gentleFieldSx[
                  "& .MuiOutlinedInput-root"
                ],

                minHeight: 64,
                height: "auto",
                alignItems: "flex-start",
              },
          }}
        />

        {/* ================================================================
            VISIBILITY
        ================================================================ */}

        <Box
          sx={{
            p: 1.4,

            border:
              "1px solid #dce5ed",

            borderRadius: "9px",

            bgcolor: "#ffffff",
          }}
        >
          <Typography
            sx={{
              mb: 0.75,

              fontSize: 10.5,

              fontWeight: 600,

              color: "#53677b",
            }}
          >
            Visibility
          </Typography>

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",
                sm:
                  "repeat(2,minmax(0,1fr))",
              },

              columnGap: 1.5,
              rowGap: 0.3,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={Boolean(
                    pageConfig.showSidebar
                  )}
                  onChange={(e) =>
                    setPageConfig(
                      (prev) => ({
                        ...prev,

                        showSidebar:
                          e.target
                            .checked,
                      })
                    )
                  }
                  sx={{
                    p: 0.6,

                    "& .MuiSvgIcon-root":
                      {
                        fontSize: 17,
                      },
                  }}
                />
              }
              label="Show Side Bar"
              sx={{
                m: 0,

                "& .MuiFormControlLabel-label":
                  {
                    fontSize: 10.5,

                    color: "#52677b",
                  },
              }}
            />

            {pageConfig.showCharts.map(
              (
                checked,
                idx
              ) => (
                <FormControlLabel
                  key={`chart-${idx}`}
                  control={
                    <Checkbox
                      size="small"
                      checked={Boolean(
                        checked
                      )}
                      onChange={(e) =>
                        setPageConfig(
                          (prev) => {
                            const next = [
                              ...prev.showCharts,
                            ];

                            next[idx] =
                              e.target.checked;

                            return {
                              ...prev,

                              showCharts:
                                next,
                            };
                          }
                        )
                      }
                      sx={{
                        p: 0.6,

                        "& .MuiSvgIcon-root":
                          {
                            fontSize: 17,
                          },
                      }}
                    />
                  }
                  label={`Show Chart ${
                    idx + 1
                  }`}
                  sx={{
                    m: 0,

                    "& .MuiFormControlLabel-label":
                      {
                        fontSize: 10.5,

                        color:
                          "#52677b",
                      },
                  }}
                />
              )
            )}
          </Box>
        </Box>

        {/* ================================================================
            ADDITIONAL DASHBOARD LAYOUT
        ================================================================ */}

        <Accordion
          disableGutters
          elevation={0}
          sx={{
            border:
              "1px solid #dce5ed",

            borderRadius:
              "9px !important",

            overflow: "hidden",

            bgcolor: "#ffffff",

            "&:before": {
              display: "none",
            },
          }}
        >
          <AccordionSummary
            expandIcon={
              <ExpandMoreIcon
                sx={{
                  fontSize: 18,

                  color:
                    "#71869a",
                }}
              />
            }
            sx={{
              minHeight: 42,

              px: 1.4,

              bgcolor:
                "#f8fafc",

              borderBottom:
                "1px solid transparent",

              "&.Mui-expanded": {
                minHeight: 42,

                borderBottom:
                  "1px solid #e4ebf1",
              },

              "& .MuiAccordionSummary-content":
                {
                  my: 0.7,
                },
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 10.8,

                  fontWeight: 600,

                  color: "#40566d",
                }}
              >
                Add Additional Dashboard
              </Typography>

              <Typography
                sx={{
                  mt: 0.1,

                  fontSize: 9.5,

                  color: "#91a0af",
                }}
              >
                Add another dashboard layout to this viewer.
              </Typography>
            </Box>
          </AccordionSummary>

          <AccordionDetails
            sx={{
              p: 1.5,
            }}
          >
            {/* ============================================================
                SELECT LAYOUT
            ============================================================ */}

            <Typography
              sx={{
                mb: 0.8,

                fontSize: 10.5,

                fontWeight: 600,

                color: "#53677b",
              }}
            >
              Select Layout
            </Typography>

            <Grid
              container
              spacing={1.2}
            >
              {availableLayouts.map(
                (layout) => {
                  const isSelected =
                    layout.id ===
                    extraLayoutId;

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
                      key={layout.id}
                      xs={12}
                      sm={6}
                      md={4}
                    >
                      <Box
                        onClick={() =>
                          setExtraLayoutId(
                            layout.id
                          )
                        }
                        sx={{
                          p: 0.9,

                          cursor:
                            "pointer",

                          border:
                            isSelected
                              ? "1px solid #72a9d2"
                              : "1px solid #d9e4ee",

                          borderRadius:
                            "8px",

                          bgcolor:
                            isSelected
                              ? "#f1f8fd"
                              : "#ffffff",

                          transition:
                            "all .15s ease",

                          "&:hover": {
                            borderColor:
                              "#a9bfd2",

                            bgcolor:
                              "#f8fbfd",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            height: 105,

                            position:
                              "relative",

                            overflow:
                              "hidden",

                            border:
                              "1px solid #e1e8ef",

                            borderRadius:
                              "6px",

                            bgcolor:
                              "#f5f7fa",
                          }}
                        >
                          {previewHtml ? (
                            <Box
                              sx={{
                                transform:
                                  "scale(0.28)",

                                transformOrigin:
                                  "top left",

                                width: "357%",

                                height:
                                  "357%",
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
                                  "1px solid #d4dee7",

                                borderRadius:
                                  "4px",
                              }}
                            />
                          )}
                        </Box>

                        <Typography
                          noWrap
                          sx={{
                            mt: 0.65,

                            textAlign:
                              "center",

                            fontSize:
                              9.8,

                            fontWeight:
                              isSelected
                                ? 600
                                : 500,

                            color:
                              isSelected
                                ? "#326f9b"
                                : "#687d90",
                          }}
                        >
                          {layout.dashboard_name ||
                            `Layout ${layout.id}`}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                }
              )}
            </Grid>

            {/* ============================================================
                SELECT DATA MODELS
            ============================================================ */}

            <Box
              sx={{
                mt: 2,
              }}
            >
              <Typography
                sx={{
                  mb: 0.8,

                  fontSize: 10.5,

                  fontWeight: 600,

                  color: "#53677b",
                }}
              >
                Select Data Models
              </Typography>

              <Box
                sx={{
                  display: "grid",

                  gap: 1,
                }}
              >
                {extraChartRows.map(
                  (
                    row,
                    idx
                  ) => (
                    <Box
                      key={`extra-row-${idx}`}
                      sx={{
                        p: 1,

                        display:
                          "grid",

                        gridTemplateColumns: {
                          xs: "1fr",

                          md:
                            "1.25fr .9fr 1fr 1fr 1fr auto",
                        },

                        gap: 0.8,

                        alignItems:
                          "center",

                        border:
                          "1px solid #e1e8ef",

                        borderRadius:
                          "7px",

                        bgcolor:
                          "#fbfcfd",
                      }}
                    >
                      <Select
                        size="small"
                        value={
                          row.tableName
                        }
                        displayEmpty
                        onChange={(e) => {
                          handleExtraRowChange(
                            idx,
                            "tableName",
                            e.target.value
                          );

                          handleExtraRowChange(
                            idx,
                            "xAxis",
                            ""
                          );

                          handleExtraRowChange(
                            idx,
                            "yAxis",
                            ""
                          );

                          loadColumns(
                            e.target.value
                          );
                        }}
                        sx={{
                          ...gentleFieldSx,

                          minWidth: 0,
                        }}
                      >
                        <MenuItem value="">
                          Select Table
                        </MenuItem>

                        {tables.map(
                          (t) => (
                            <MenuItem
                              key={t}
                              value={t}
                            >
                              {t}
                            </MenuItem>
                          )
                        )}
                      </Select>

                      <Select
                        size="small"
                        value={
                          row.chartType
                        }
                        displayEmpty
                        onChange={(e) =>
                          handleExtraRowChange(
                            idx,
                            "chartType",
                            e.target.value
                          )
                        }
                        sx={{
                          ...gentleFieldSx,

                          minWidth: 0,
                        }}
                      >
                        <MenuItem value="">
                          Chart Type
                        </MenuItem>

                        {CHART_TYPES.map(
                          (t) => (
                            <MenuItem
                              key={t}
                              value={t}
                            >
                              {t}
                            </MenuItem>
                          )
                        )}
                      </Select>

                      <TextField
                        size="small"
                        value={
                          row.chartName
                        }
                        placeholder="Chart Name"
                        onChange={(e) =>
                          handleExtraRowChange(
                            idx,
                            "chartName",
                            e.target.value
                          )
                        }
                        sx={
                          gentleFieldSx
                        }
                      />

                      <Select
                        size="small"
                        value={
                          row.xAxis
                        }
                        displayEmpty
                        disabled={
                          !row.tableName
                        }
                        onChange={(e) =>
                          handleExtraRowChange(
                            idx,
                            "xAxis",
                            e.target.value
                          )
                        }
                        sx={{
                          ...gentleFieldSx,

                          minWidth: 0,
                        }}
                      >
                        <MenuItem value="">
                          X-Axis
                        </MenuItem>

                        {(columnsByTable[
                          row.tableName
                        ] || []).map(
                          (c) => (
                            <MenuItem
                              key={
                                c.column_name
                              }
                              value={
                                c.column_name
                              }
                            >
                              {
                                c.column_name
                              }
                            </MenuItem>
                          )
                        )}
                      </Select>

                      <Select
                        size="small"
                        value={
                          row.yAxis
                        }
                        displayEmpty
                        disabled={
                          !row.tableName
                        }
                        onChange={(e) =>
                          handleExtraRowChange(
                            idx,
                            "yAxis",
                            e.target.value
                          )
                        }
                        sx={{
                          ...gentleFieldSx,

                          minWidth: 0,
                        }}
                      >
                        <MenuItem value="">
                          Y-Axis
                        </MenuItem>

                        {(columnsByTable[
                          row.tableName
                        ] || []).map(
                          (c) => (
                            <MenuItem
                              key={
                                c.column_name
                              }
                              value={
                                c.column_name
                              }
                            >
                              {
                                c.column_name
                              }
                            </MenuItem>
                          )
                        )}
                      </Select>

                      <Box
                        sx={{
                          display:
                            "flex",

                          alignItems:
                            "center",

                          gap: 0.25,
                        }}
                      >
                        {idx ===
                          extraChartRows.length -
                            1 && (
                          <Button
                            onClick={
                              handleAddExtraRow
                            }
                            title="Add row"
                            sx={{
                              minWidth: 30,
                              width: 30,
                              height: 30,

                              p: 0,

                              color:
                                "#477899",

                              bgcolor:
                                "#eef5fa",

                              borderRadius:
                                "6px",
                            }}
                          >
                            <AddCircleOutlineIcon
                              sx={{
                                fontSize: 17,
                              }}
                            />
                          </Button>
                        )}

                        {extraChartRows.length >
                          1 && (
                          <Button
                            onClick={() =>
                              handleRemoveExtraRow(
                                idx
                              )
                            }
                            title="Remove row"
                            sx={{
                              minWidth: 30,
                              width: 30,
                              height: 30,

                              p: 0,

                              color:
                                "#b42318",

                              bgcolor:
                                "#fff3f1",

                              borderRadius:
                                "6px",
                            }}
                          >
                            <RemoveCircleOutlineIcon
                              sx={{
                                fontSize: 17,
                              }}
                            />
                          </Button>
                        )}
                      </Box>
                    </Box>
                  )
                )}
              </Box>
            </Box>

            <Box
              sx={{
                mt: 1.4,

                display: "flex",

                justifyContent:
                  "flex-end",
              }}
            >
              <Button
                onClick={
                  handleAddAdditionalLayout
                }
                variant="contained"
                sx={{
                  ...primaryButtonSx,

                  height: 34,

                  fontSize: 10.5,
                }}
              >
                Add Dashboard Layout
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      </>
    )}
  </DialogContent>

  {/* ======================================================================
      FOOTER
  ====================================================================== */}

  <DialogActions sx={dialogFooterSx}>
    <Button
      onClick={() =>
        setTitleConfigOpen(false)
      }
      sx={cancelButtonSx}
    >
      Cancel
    </Button>

    <Button
      onClick={async () => {
        /*
         * DO NOT CHANGE THIS SAVE LOGIC.
         */

        const meta =
          layoutConfig?.meta || {};

        const nextHiddenCharts =
          titleConfigTarget ===
          "page"
            ? pageConfig.showCharts.map(
                (show) => !show
              )
            : activeLayoutIndex ===
              0
              ? meta.hiddenCharts
              : additionalLayouts[
                  activeLayoutIndex -
                    1
                ]?.hiddenCharts;

        let nextAdditionalLayouts =
          additionalLayouts;

        if (
          activeLayoutIndex > 0 &&
          titleConfigTarget ===
            "page"
        ) {
          nextAdditionalLayouts = [
            ...additionalLayouts,
          ];

          const entry = {
            ...(nextAdditionalLayouts[
              activeLayoutIndex -
                1
            ] || {}),

            hiddenCharts:
              nextHiddenCharts,
          };

          nextAdditionalLayouts[
            activeLayoutIndex -
              1
          ] = entry;
        }

        const nextLayout = {
          ...(layoutConfig || {}),

          meta: {
            ...meta,

            sidebarTitle:
              titleFields.sidebarTitle,

            sidebarSubtitle:
              titleFields.sidebarSubtitle,

            pageTitle:
              titleFields.pageTitle,

            pageSubtitle:
              titleFields.pageSubtitle,

            showSidebar:
              titleConfigTarget ===
              "page"
                ? pageConfig.showSidebar
                : titleFields.showSidebar,

            hiddenCharts:
              activeLayoutIndex ===
              0
                ? nextHiddenCharts
                : meta.hiddenCharts,

            sidebarWidget:
              titleConfigTarget ===
              "sidebar"
                ? sidebarConfig.widget
                : layoutConfig?.meta
                    ?.sidebarWidget,

            sidebarLinks:
              titleConfigTarget ===
              "sidebar"
                ? sidebarConfig.links
                : layoutConfig?.meta
                    ?.sidebarLinks,

            additionalLayouts:
              nextAdditionalLayouts,
          },
        };

        await saveLayout(
          nextLayout
        );

        setTitleConfigOpen(
          false
        );
      }}
      variant="contained"
      sx={primaryButtonSx}
    >
      Save Changes
    </Button>
  </DialogActions>
</Dialog>


      <Dialog open={chartConfigOpen} onClose={() => setChartConfigOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Chart</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, mt: 1 }}>
          <Select
            value={chartForm.tableName}
            displayEmpty
            onChange={(e) => {
              const value = e.target.value;
              setChartForm((prev) => ({ ...prev, tableName: value, xAxis: "", yAxis: "" }));
              loadColumns(value);
            }}
          >
            <MenuItem value="">Select Table</MenuItem>
            {tableOptions.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
          <Select
            value={chartForm.chartType}
            displayEmpty
            onChange={(e) => setChartForm((prev) => ({ ...prev, chartType: e.target.value }))}
          >
            <MenuItem value="">Chart Type</MenuItem>
            {CHART_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
          <TextField
            label="Chart Name"
            value={chartForm.chartName}
            onChange={(e) => setChartForm((prev) => ({ ...prev, chartName: e.target.value }))}
          />
          <Select
            value={chartForm.xAxis}
            displayEmpty
            disabled={!chartForm.tableName}
            onChange={(e) => setChartForm((prev) => ({ ...prev, xAxis: e.target.value }))}
          >
            <MenuItem value="">X-Axis (Column)</MenuItem>
            {(columnsByTable[chartForm.tableName] || []).map((c) => (
              <MenuItem key={c.column_name} value={c.column_name}>
                {c.column_name}
              </MenuItem>
            ))}
          </Select>
          <Select
            value={chartForm.yAxis}
            displayEmpty
            disabled={!chartForm.tableName}
            onChange={(e) => setChartForm((prev) => ({ ...prev, yAxis: e.target.value }))}
          >
            <MenuItem value="">Y-Axis (Column)</MenuItem>
            {(columnsByTable[chartForm.tableName] || []).map((c) => (
              <MenuItem key={c.column_name} value={c.column_name}>
                {c.column_name}
              </MenuItem>
            ))}
          </Select>
          <Select
            value={chartForm.aggregation}
            onChange={(e) => setChartForm((prev) => ({ ...prev, aggregation: e.target.value }))}
          >
            {AGGREGATIONS.map((a) => (
              <MenuItem key={a} value={a}>
                {a}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            onClick={async () => {
              if (chartIndex === null || chartIndex === undefined) {
                setChartConfigOpen(false);
                return;
              }
              const meta = layoutConfig?.meta || {};
              const baseCharts = Array.isArray(layoutConfig?.charts) ? layoutConfig.charts : [];
              const charts =
                activeLayoutIndex === 0 ? [...baseCharts] : [...(activeCharts || [])];
              if (charts[chartIndex]) {
                charts[chartIndex] = {
                  tableName: "",
                  chartType: "",
                  chartName: "",
                  xAxis: "",
                  yAxis: "",
                  aggregation: "actual",
                };
              }
              const hiddenCharts =
                activeLayoutIndex === 0
                  ? Array.isArray(meta.hiddenCharts)
                    ? [...meta.hiddenCharts]
                    : []
                  : Array.isArray(additionalLayouts[activeLayoutIndex - 1]?.hiddenCharts)
                    ? [...additionalLayouts[activeLayoutIndex - 1].hiddenCharts]
                    : [];
              hiddenCharts[chartIndex] = true;
              let nextLayout = { ...(layoutConfig || {}) };
              if (activeLayoutIndex === 0) {
                nextLayout = {
                  ...nextLayout,
                  charts,
                  meta: {
                    ...meta,
                    hiddenCharts,
                  },
                };
              } else {
                const nextAdditional = [...additionalLayouts];
                const entry = {
                  ...(nextAdditional[activeLayoutIndex - 1] || {}),
                  charts,
                  hiddenCharts,
                };
                nextAdditional[activeLayoutIndex - 1] = entry;
                nextLayout = {
                  ...nextLayout,
                  meta: {
                    ...meta,
                    additionalLayouts: nextAdditional,
                  },
                };
              }
              await saveLayout(nextLayout);
              setChartConfigOpen(false);
            }}
            variant="outlined"
          >
            Delete Chart
          </Button>
          <Button onClick={() => setChartConfigOpen(false)} variant="outlined">
            Close
          </Button>
          <Button
            onClick={async () => {
              const meta = layoutConfig?.meta || {};
              const baseCharts = Array.isArray(layoutConfig?.charts) ? layoutConfig.charts : [];
              const charts =
                activeLayoutIndex === 0 ? [...baseCharts] : [...(activeCharts || [])];
              const next = { ...chartForm };
              if (chartIndex !== null) charts[chartIndex] = next;
              let nextLayout = { ...(layoutConfig || {}) };
              if (activeLayoutIndex === 0) {
                nextLayout = {
                  ...nextLayout,
                  charts,
                };
              } else {
                const nextAdditional = [...additionalLayouts];
                const entry = {
                  ...(nextAdditional[activeLayoutIndex - 1] || {}),
                  charts,
                };
                nextAdditional[activeLayoutIndex - 1] = entry;
                nextLayout = {
                  ...nextLayout,
                  meta: {
                    ...meta,
                    additionalLayouts: nextAdditional,
                  },
                };
              }
              await saveLayout(nextLayout);
              setChartConfigOpen(false);
            }}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>


      <AddComponentModal
  open={
    addComponentOpen
  }

  slot={
    activeComponentSlot
  }

  onClose={() => {
    setAddComponentOpen(
      false
    );

    setActiveComponentSlot(
      null
    );
  }}

  onSelect={(
  componentType,
  slot
) => {

  setAddComponentOpen(
    false
  );


  setActiveComponentSlot(
    slot
  );


  if (
  componentType ===
  "text"
) {

  setTextConfigOpen(
    true
  );

  return;
}


if (
  componentType ===
  "media"
) {

  setMediaConfigOpen(
    true
  );

  return;
}


  if (
  componentType ===
  "kpi"
) {

  setKpiConfigOpen(
    true
  );

  return;
}


if (
  componentType ===
  "chart"
) {

  setComponentChartConfigOpen(
    true
  );

  return;
}


if (
  componentType ===
  "table"
) {
  setComponentTableConfigOpen(
    true
  );

  return;
}

if (
  componentType ===
  "crud"
) {

  setCrudConfigOpen(
    true
  );

  return;
}


console.log(
  "Component configuration not yet implemented:",
  componentType
);
}}

/>

<KpiConfigModal
  open={
    kpiConfigOpen
  }

  slot={
    activeComponentSlot
  }

  tables={
    tableOptions
  }

  columnsByTable={
    columnsByTable
  }

  loadColumns={
    loadColumns
  }

  initialConfig={
    activeComponentSlot
      ?.slotId
      ? activeComponents[
          activeComponentSlot
            .slotId
        ]
      : null
  }

  onClose={() => {

    setKpiConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}

  onSave={async (
    component,
    slot
  ) => {

    const slotId =
      slot?.slotId;


    if (!slotId) {
      return;
    }


    const nextComponents = {
      ...activeComponents,

      [slotId]:
        component,
    };


    let nextLayout = {
      ...(layoutConfig || {}),
    };


    /* PRIMARY LAYOUT */

    if (
      activeLayoutIndex ===
      0
    ) {

      nextLayout = {
        ...nextLayout,

        components:
          nextComponents,
      };

    }

    /* ADDITIONAL LAYOUT */

    else {

      const nextAdditional = [
        ...additionalLayouts,
      ];


      nextAdditional[
        activeLayoutIndex -
          1
      ] = {
        ...nextAdditional[
          activeLayoutIndex -
            1
        ],

        components:
          nextComponents,
      };


      nextLayout = {
        ...nextLayout,

        meta: {
          ...nextLayout.meta,

          additionalLayouts:
            nextAdditional,
        },
      };
    }


    await saveLayout(
      nextLayout
    );


    setKpiConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}
/>


<TableConfigModal
  open={
    componentTableConfigOpen
  }

  slot={
    activeComponentSlot
  }

  tables={
    tableOptions
  }

  columnsByTable={
    columnsByTable
  }

  loadColumns={
    loadColumns
  }

  initialConfig={
    activeComponentSlot
      ?.slotId
      ? activeComponents[
          activeComponentSlot
            .slotId
        ]
      : null
  }

  onClose={() => {

    setComponentTableConfigOpen(
      false
    );

    setActiveComponentSlot(
      null
    );
  }}

  onSave={async (
    component,
    slot
  ) => {

    const slotId =
      slot?.slotId;


    if (!slotId) {
      return;
    }


    const nextComponents = {
      ...activeComponents,

      [slotId]:
        component,
    };


    let nextLayout = {
      ...(layoutConfig || {}),
    };


    if (
      activeLayoutIndex ===
      0
    ) {

      nextLayout = {
        ...nextLayout,
        components:
          nextComponents,
      };

    } else {

      const nextAdditional = [
        ...additionalLayouts,
      ];


      nextAdditional[
        activeLayoutIndex -
          1
      ] = {
        ...nextAdditional[
          activeLayoutIndex -
            1
        ],

        components:
          nextComponents,
      };


      nextLayout = {
        ...nextLayout,

        meta: {
          ...nextLayout.meta,

          additionalLayouts:
            nextAdditional,
        },
      };
    }


    await saveLayout(
      nextLayout
    );


    setComponentTableConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}
/>

<ChartConfigModal
  open={
    componentChartConfigOpen
  }

  slot={
    activeComponentSlot
  }

  tables={
    tableOptions
  }

  columnsByTable={
    columnsByTable
  }

  loadColumns={
    loadColumns
  }

  initialConfig={
    activeComponentSlot
      ?.slotId
      ? activeComponents[
          activeComponentSlot
            .slotId
        ]
      : null
  }

  onClose={() => {

    setComponentChartConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}

  onSave={async (
    component,
    slot
  ) => {

    const slotId =
      slot?.slotId;


    if (!slotId) {
      return;
    }


    const nextComponents = {
      ...activeComponents,

      [slotId]:
        component,
    };


    let nextLayout = {
      ...(layoutConfig || {}),
    };


    /* PRIMARY LAYOUT */

    if (
      activeLayoutIndex ===
      0
    ) {

      nextLayout = {
        ...nextLayout,

        components:
          nextComponents,
      };

    }

    /* ADDITIONAL LAYOUT */

    else {

      const nextAdditional = [
        ...additionalLayouts,
      ];


      nextAdditional[
        activeLayoutIndex -
          1
      ] = {
        ...nextAdditional[
          activeLayoutIndex -
            1
        ],

        components:
          nextComponents,
      };


      nextLayout = {
        ...nextLayout,

        meta: {
          ...nextLayout.meta,

          additionalLayouts:
            nextAdditional,
        },
      };
    }


    await saveLayout(
      nextLayout
    );


    setComponentChartConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}
/>  

<CrudConfigModal
  open={
    crudConfigOpen
  }

  slot={
    activeComponentSlot
  }

  pages={
    crudPages
  }

  initialConfig={
    activeComponentSlot
      ?.slotId
      ? activeComponents[
          activeComponentSlot
            .slotId
        ]
      : null
  }

  onClose={() => {

    setCrudConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}

  onSave={async (
    component,
    slot
  ) => {

    const slotId =
      slot?.slotId;


    if (!slotId) {
      return;
    }


    const nextComponents = {
      ...activeComponents,

      [slotId]:
        component,
    };


    let nextLayout = {
      ...(layoutConfig ||
        {}),
    };


    /* PRIMARY */

    if (
      activeLayoutIndex ===
      0
    ) {

      nextLayout = {
        ...nextLayout,

        components:
          nextComponents,
      };

    }

    /* ADDITIONAL */

    else {

      const nextAdditional = [
        ...additionalLayouts,
      ];


      nextAdditional[
        activeLayoutIndex -
          1
      ] = {
        ...nextAdditional[
          activeLayoutIndex -
            1
        ],

        components:
          nextComponents,
      };


      nextLayout = {
        ...nextLayout,

        meta: {
          ...nextLayout.meta,

          additionalLayouts:
            nextAdditional,
        },
      };
    }


    await saveLayout(
      nextLayout
    );


    setCrudConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}
/>

<DuplicateComponentModal
  open={
    duplicateComponentOpen
  }

  component={
    componentToDuplicate
  }

  sourceSlotId={
    activeComponentSlot
      ?.slotId
  }

  availableSlots={
    availableComponentSlots
  }

  onClose={() => {

    setDuplicateComponentOpen(
      false
    );

    setComponentToDuplicate(
      null
    );

    setActiveComponentSlot(
      null
    );
  }}

  onDuplicate={async (
    destinationSlotId
  ) => {

    if (
      !destinationSlotId ||
      !componentToDuplicate
    ) {
      return;
    }


    /*
     * Deep copy because component configuration
     * contains nested dataSource / format objects.
     */
    const duplicatedComponent =
      JSON.parse(
        JSON.stringify(
          componentToDuplicate
        )
      );


    const nextComponents = {
      ...activeComponents,

      [destinationSlotId]:
        duplicatedComponent,
    };


    let nextLayout = {
      ...(layoutConfig || {}),
    };


    /* PRIMARY LAYOUT */

    if (
      activeLayoutIndex ===
      0
    ) {

      nextLayout = {
        ...nextLayout,

        components:
          nextComponents,
      };
    }


    /* ADDITIONAL LAYOUT */

    else {

      const nextAdditional = [
        ...additionalLayouts,
      ];


      nextAdditional[
        activeLayoutIndex -
          1
      ] = {
        ...nextAdditional[
          activeLayoutIndex -
            1
        ],

        components:
          nextComponents,
      };


      nextLayout = {
        ...nextLayout,

        meta: {
          ...nextLayout.meta,

          additionalLayouts:
            nextAdditional,
        },
      };
    }


    await saveLayout(
      nextLayout
    );


    setDuplicateComponentOpen(
      false
    );


    setComponentToDuplicate(
      null
    );


    setActiveComponentSlot(
      null
    );
  }}
/>

<MediaConfigModal
  open={
    mediaConfigOpen
  }

  slot={
    activeComponentSlot
  }

  initialConfig={
    activeComponentSlot
      ?.slotId
      ? activeComponents[
          activeComponentSlot
            .slotId
        ]
      : null
  }

  onClose={() => {

    setMediaConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}

  onSave={async (
    component,
    slot
  ) => {

    const slotId =
      slot?.slotId;


    if (!slotId) {
      return;
    }


    const nextComponents = {
      ...activeComponents,

      [slotId]:
        component,
    };


    let nextLayout = {
      ...(layoutConfig ||
        {}),
    };


    /* PRIMARY LAYOUT */

    if (
      activeLayoutIndex ===
      0
    ) {

      nextLayout = {
        ...nextLayout,

        components:
          nextComponents,
      };

    }

    /* ADDITIONAL LAYOUT */

    else {

      const nextAdditional = [
        ...additionalLayouts,
      ];


      nextAdditional[
        activeLayoutIndex -
          1
      ] = {
        ...nextAdditional[
          activeLayoutIndex -
            1
        ],

        components:
          nextComponents,
      };


      nextLayout = {
        ...nextLayout,

        meta: {
          ...nextLayout.meta,

          additionalLayouts:
            nextAdditional,
        },
      };
    }


    await saveLayout(
      nextLayout
    );


    setMediaConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}
/>


<TextConfigModal
  open={
    textConfigOpen
  }

  slot={
    activeComponentSlot
  }

  initialConfig={
    activeComponentSlot
      ?.slotId
      ? activeComponents[
          activeComponentSlot
            .slotId
        ]
      : null
  }

  onClose={() => {

    setTextConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}

  onSave={async (
    component,
    slot
  ) => {

    const slotId =
      slot?.slotId;


    if (!slotId) {
      return;
    }


    const nextComponents = {
      ...activeComponents,

      [slotId]:
        component,
    };


    let nextLayout = {
      ...(layoutConfig ||
        {}),
    };


    if (
      activeLayoutIndex ===
      0
    ) {

      nextLayout = {
        ...nextLayout,

        components:
          nextComponents,
      };

    } else {

      const nextAdditional = [
        ...additionalLayouts,
      ];


      nextAdditional[
        activeLayoutIndex -
          1
      ] = {
        ...nextAdditional[
          activeLayoutIndex -
            1
        ],

        components:
          nextComponents,
      };


      nextLayout = {
        ...nextLayout,

        meta: {
          ...nextLayout.meta,

          additionalLayouts:
            nextAdditional,
        },
      };
    }


    await saveLayout(
      nextLayout
    );


    setTextConfigOpen(
      false
    );


    setActiveComponentSlot(
      null
    );
  }}
/>


    </Box>
  );
}
