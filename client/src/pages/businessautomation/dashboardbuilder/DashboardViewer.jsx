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
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top", align: "start" } },
    };
    if (cfg.chartType === "H. Bar") options.indexAxis = "y";

    chartRef.current = new Chart(canvasRef.current, {
      type: chartType,
      data: {
        labels: cfg.labels,
        datasets: [
          {
            label: cfg.chartName || cfg.tableName || "Dataset",
            data: cfg.values,
          },
        ],
      },
      options,
    });

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
  function SchemaLayout({ schema, renderNode, layoutRef }) {
    return <Box ref={layoutRef}>{renderNode(schema, "root")}</Box>;
  },
  (prev, next) => prev.schema === next.schema && prev.renderNode === next.renderNode
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

  const layoutDefinition = useMemo(() => {
    const raw = activeLayout?.layoutDefinition;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        const trimmed = raw.trim();
        if (trimmed.startsWith("<")) {
          return { html: raw };
        }
        return {};
      }
    }
    return raw || {};
  }, [activeLayout?.layoutDefinition]);

  const layoutHtml = typeof layoutDefinition?.html === "string" ? layoutDefinition.html : "";
  const layoutSchema = layoutDefinition?.schema || null;
  const layoutMode = layoutSchema ? "schema" : "missing";
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

  const renderSchemaNode = useCallback(
    (node, key) => {
      const normalizeProps = (rawProps) => {
        if (!rawProps) return {};
        if (typeof rawProps.style === "string") {
          const styleObj = {};
          rawProps.style
            .split(";")
            .map((rule) => rule.trim())
            .filter(Boolean)
            .forEach((rule) => {
              const [prop, value] = rule.split(":").map((part) => part.trim());
              if (!prop || !value) return;
              const camel = prop.replace(/-([a-z])/g, (_, chr) => chr.toUpperCase());
              styleObj[camel] = value;
            });
          return { ...rawProps, style: styleObj };
        }
        return { ...rawProps };
      };

      const slotId = node?.props?.["data-chart"];
      if (node?.type === "element" && node?.tag && slotId) {
        const slotKey = String(slotId);
        let chartPos = chartSlotIndex[slotKey];
        if (chartPos === undefined && /^\d+$/.test(slotKey)) {
          chartPos = Number(slotKey) - 1;
        }
        const cfg = chartPos !== undefined ? activeChartData[chartPos] : null;
        const normalizedProps = normalizeProps(node.props);
        return (
          <ChartSlot key={key} tag={node.tag} slotId={slotKey} props={normalizedProps} cfg={cfg} />
        );
      }
      if (!node) return null;
      if (node.type === "text") return node.text;
      const children = Array.isArray(node.children)
        ? node.children.map((child, idx) => renderSchemaNode(child, `${key}-${idx}`))
        : null;
      if (node.type === "fragment") {
        return <React.Fragment key={key}>{children}</React.Fragment>;
      }
      if (node.type === "element" && node.tag) {
        const normalizedProps = normalizeProps(node.props);
        const voidTags = new Set(["br", "hr"]);
        if (voidTags.has(node.tag)) {
          return React.createElement(node.tag, { key, ...(normalizedProps || {}) });
        }
        return React.createElement(node.tag, { key, ...(normalizedProps || {}) }, children);
      }
      return null;
    },
    [activeChartData, chartSlotIndex]
  );

  useEffect(() => {
    if (!layoutRef.current) return;
    const root = layoutRef.current;
    if (!root || layoutMode !== "schema") return;
    root.querySelectorAll(".db-config-btn").forEach((btn) => btn.remove());

    const ensureButton = (target, onClick) => {
      if (!target) return;
      if (!target.style.position) target.style.position = "relative";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "db-config-btn";
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>';
      btn.setAttribute("aria-label", "Configure");
      btn.style.position = "absolute";
      btn.style.top = "8px";
      btn.style.right = "8px";
      btn.style.width = "20px";
      btn.style.height = "20px";
      btn.style.borderRadius = "4px";
      btn.style.border = "0";
      btn.style.background = "transparent";
      btn.style.color = "#777777";
      btn.style.fontSize = "16px";
      btn.style.lineHeight = "16px";
      btn.style.cursor = "pointer";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.zIndex = "2";
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        onClick();
      });
      target.appendChild(btn);
    };

    const meta = layoutConfig?.meta || {};
    const activeHiddenCharts =
      activeLayoutIndex === 0
        ? meta.hiddenCharts
        : additionalLayouts[activeLayoutIndex - 1]?.hiddenCharts;
    const brand = root.querySelector(".brand");
    const sidebar = root.querySelector(".sidebar");
    const appShell = root.querySelector(".app");
    const pageTitleEl = root.querySelector(".title");
    const pageSubtitleEl = root.querySelector(".subtitle");
    const showSidebar = meta.showSidebar !== false;
    if (sidebar) sidebar.style.display = showSidebar ? "" : "none";
    if (appShell) appShell.style.gridTemplateColumns = showSidebar ? "" : "1fr";
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

    if (brand) {
      ensureButton(brand, () => {
        const small = brand.querySelector("small");
        const currentLinks =
          Array.isArray(meta.sidebarLinks) && meta.sidebarLinks.length
            ? meta.sidebarLinks
            : Array.from(root.querySelectorAll(".menu button")).map((btn) => ({
                name: btn.textContent?.trim() || "",
                url: "",
              }));
        setTitleFields({
          sidebarTitle: meta.sidebarTitle || brand.childNodes[0]?.textContent?.trim() || "",
          sidebarSubtitle: meta.sidebarSubtitle || small?.textContent?.trim() || "",
          pageTitle: meta.pageTitle || pageTitleEl?.textContent?.trim() || "",
          pageSubtitle: meta.pageSubtitle || pageSubtitleEl?.textContent?.trim() || "",
          showSidebar,
        });
        setSidebarConfig({
          widget: meta.sidebarWidget || "",
          links: currentLinks.length ? currentLinks : [{ name: "", url: "" }],
        });
        setTitleConfigTarget("sidebar");
        setTitleConfigOpen(true);
      });
    }

    if (pageTitleEl) {
      ensureButton(pageTitleEl, () => {
        const small = brand?.querySelector("small");
        const hiddenCharts = Array.isArray(activeHiddenCharts) ? activeHiddenCharts : [];
        const nextShowCharts = Array.from({ length: chartSlotCount || 0 }).map(
          (_, i) => hiddenCharts[i] !== true
        );
        setTitleFields({
          sidebarTitle: meta.sidebarTitle || brand?.childNodes[0]?.textContent?.trim() || "",
          sidebarSubtitle: meta.sidebarSubtitle || small?.textContent?.trim() || "",
          pageTitle: meta.pageTitle || pageTitleEl?.textContent?.trim() || "",
          pageSubtitle: meta.pageSubtitle || pageSubtitleEl?.textContent?.trim() || "",
          showSidebar,
        });
        setPageConfig({ showSidebar, showCharts: nextShowCharts });
        setTitleConfigTarget("page");
        setTitleConfigOpen(true);
      });
    }

    const slots = Array.from(layoutRef.current.querySelectorAll("[data-chart]"));
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

  const loadColumns = async (tableName) => {
    if (!tableName || columnsByTable[tableName]) return;
    try {
      const res = await api.get(`/db/columns/${tableName}`);
      const cols = res?.data?.columns || [];
      setColumnsByTable((prev) => ({ ...prev, [tableName]: cols }));
    } catch {
      setColumnsByTable((prev) => ({ ...prev, [tableName]: [] }));
    }
  };

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
    layoutMode === "schema" && layoutSchema ? (
      <SchemaLayout schema={layoutSchema} renderNode={renderSchemaNode} layoutRef={layoutRef} />
    ) : (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Typography>Layout schema is missing for this dashboard.</Typography>
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
    <Box sx={{ p: 0, position: "relative" }}>
      {canSwitchLayouts && (
        <Box
          sx={{
            position: "fixed",
            top: 120,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1,
            py: 0.5,
            borderRadius: 999,
            border: "1px solid #c7cbd3",
            bgcolor: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
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
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            {activeLayoutLabel} (ID: {activeLayoutId}) {activeLayoutIndex + 1}/{layoutStack.length}
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
      {layoutContent}

      <Dialog open={titleConfigOpen} onClose={() => setTitleConfigOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Titles</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 4 }}>
          {titleConfigTarget === "sidebar" && (
            <>
              {/*
              <Select
                value={sidebarConfig.widget}
                displayEmpty
                onChange={(e) =>
                  setSidebarConfig((prev) => ({ ...prev, widget: e.target.value }))
                }
              >
                <MenuItem value="">Select Widget</MenuItem>
                <MenuItem value="ticker">BSE/NSE Ticker</MenuItem>
                <MenuItem value="weather">Local Weather</MenuItem>
                <MenuItem value="time">Local Time</MenuItem>
                <MenuItem value="news">Financial News Flashes</MenuItem>
                <MenuItem value="sports">Sports News</MenuItem>
                <MenuItem value="exchange">Current Exchange Rate</MenuItem>
                <MenuItem value="bullion">Bullion Exchange Rate</MenuItem>
              </Select>
              */}
              <TextField
                label="Sidebar Title"
                value={titleFields.sidebarTitle}
                onChange={(e) => setTitleFields((prev) => ({ ...prev, sidebarTitle: e.target.value }))}
                InputLabelProps={{ shrink: true, sx: { top: 2 } }}
                sx={{ mt: 0.5 }}
                fullWidth
              />
              <TextField
                label="Sidebar Description"
                value={titleFields.sidebarSubtitle}
                onChange={(e) => setTitleFields((prev) => ({ ...prev, sidebarSubtitle: e.target.value }))}
                InputLabelProps={{ shrink: true, sx: { top: 2 } }}
                sx={{ mt: 0.5 }}
                fullWidth
              />
              <Box sx={{ display: "grid", gap: 1 }}>
                {sidebarConfig.links.map((link, idx) => (
                  <Box key={`link-${idx}`} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <TextField
                      label="Link Name"
                      value={link.name}
                      onChange={(e) =>
                        setSidebarConfig((prev) => {
                          const next = [...prev.links];
                          next[idx] = { ...next[idx], name: e.target.value };
                          return { ...prev, links: next };
                        })
                      }
                      InputLabelProps={{ shrink: true, sx: { top: 2 } }}
                      fullWidth
                    />
                    <TextField
                      label="Link URL"
                      value={link.url}
                      onChange={(e) =>
                        setSidebarConfig((prev) => {
                          const next = [...prev.links];
                          next[idx] = { ...next[idx], url: e.target.value };
                          return { ...prev, links: next };
                        })
                      }
                      InputLabelProps={{ shrink: true, sx: { top: 2 } }}
                      fullWidth
                    />
                    <Button
                      variant="text"
                      onClick={() =>
                        setSidebarConfig((prev) => ({
                          ...prev,
                          links: prev.links.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      -
                    </Button>
                  </Box>
                ))}
                <Button
                  variant="text"
                  onClick={() =>
                    setSidebarConfig((prev) => ({
                      ...prev,
                      links: [...prev.links, { name: "", url: "" }],
                    }))
                  }
                >
                  + Add Link
                </Button>
              </Box>
            </>
          )}
          {titleConfigTarget === "page" && (
            <>
              <TextField
                label="Page Title"
                value={titleFields.pageTitle}
                onChange={(e) => setTitleFields((prev) => ({ ...prev, pageTitle: e.target.value }))}
                InputLabelProps={{ shrink: true, sx: { top: 2 } }}
                sx={{ mt: 0.5 }}
                fullWidth
              />
              <TextField
                label="Page Description"
                value={titleFields.pageSubtitle}
                onChange={(e) => setTitleFields((prev) => ({ ...prev, pageSubtitle: e.target.value }))}
                InputLabelProps={{ shrink: true, sx: { top: 2 } }}
                sx={{ mt: 0.5 }}
                fullWidth
              />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 1,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(pageConfig.showSidebar)}
                      onChange={(e) =>
                        setPageConfig((prev) => ({ ...prev, showSidebar: e.target.checked }))
                      }
                    />
                  }
                  label="Show Side Bar"
                />
                {pageConfig.showCharts.map((checked, idx) => (
                  <FormControlLabel
                    key={`chart-${idx}`}
                    control={
                      <Checkbox
                        checked={Boolean(checked)}
                        onChange={(e) =>
                          setPageConfig((prev) => {
                            const next = [...prev.showCharts];
                            next[idx] = e.target.checked;
                            return { ...prev, showCharts: next };
                          })
                        }
                      />
                    }
                    label={`Show Chart ${idx + 1}`}
                  />
                ))}
              </Box>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Add Additional Dashboard to Layout</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography sx={{ mb: 1 }}>Select Layout</Typography>
                  <Grid container spacing={2}>
                    {availableLayouts.map((layout) => {
                      const isSelected = layout.id === extraLayoutId;
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
                          <Box
                            onClick={() => setExtraLayoutId(layout.id)}
                            sx={{
                              border: isSelected ? "2px solid #2f7dd6" : "1px solid #c7cbd3",
                              borderRadius: 2,
                              p: 1.5,
                              cursor: "pointer",
                              position: "relative",
                            }}
                          >
                            <Box
                              sx={{
                                border: "1px solid #c7cbd3",
                                height: 140,
                                position: "relative",
                                bgcolor: "#f5f7fb",
                                overflow: "hidden",
                              }}
                            >
                              {previewHtml ? (
                                <Box
                                  sx={{
                                    transform: "scale(0.35)",
                                    transformOrigin: "top left",
                                    width: "280%",
                                    height: "280%",
                                  }}
                                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                                />
                              ) : (
                                <Box
                                  sx={{ position: "absolute", inset: 18, border: "1px solid #c7cbd3" }}
                                />
                              )}
                            </Box>
                            <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                              {layout.dashboard_name || `Layout ${layout.id}`}
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Typography sx={{ mb: 1 }}>Select Data Models</Typography>
                    <Box sx={{ display: "grid", gap: 2 }}>
                      {extraChartRows.map((row, idx) => (
                        <Box
                          key={`extra-row-${idx}`}
                          sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "nowrap" }}
                        >
                          <Select
                            size="small"
                            value={row.tableName}
                            displayEmpty
                            onChange={(e) => {
                              handleExtraRowChange(idx, "tableName", e.target.value);
                              handleExtraRowChange(idx, "xAxis", "");
                              handleExtraRowChange(idx, "yAxis", "");
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
                            onChange={(e) => handleExtraRowChange(idx, "chartType", e.target.value)}
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
                            onChange={(e) => handleExtraRowChange(idx, "chartName", e.target.value)}
                            sx={{ minWidth: 180 }}
                          />
                          <Select
                            size="small"
                            value={row.xAxis}
                            displayEmpty
                            onChange={(e) => handleExtraRowChange(idx, "xAxis", e.target.value)}
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
                            onChange={(e) => handleExtraRowChange(idx, "yAxis", e.target.value)}
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
                          {idx === extraChartRows.length - 1 && (
                            <Button
                              onClick={handleAddExtraRow}
                              variant="text"
                              sx={{ minWidth: 0, p: 0.5 }}
                            >
                              <AddCircleOutlineIcon />
                            </Button>
                          )}
                          {extraChartRows.length > 1 && (
                            <Button
                              onClick={() => handleRemoveExtraRow(idx)}
                              variant="text"
                              sx={{ minWidth: 0, p: 0.5 }}
                            >
                              <RemoveCircleOutlineIcon />
                            </Button>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
                    <Button variant="contained" onClick={handleAddAdditionalLayout}>
                      Add Dashboard Layout
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTitleConfigOpen(false)} variant="outlined">
            Close
          </Button>
          <Button
            onClick={async () => {
              const meta = layoutConfig?.meta || {};
              const nextHiddenCharts =
                titleConfigTarget === "page"
                  ? pageConfig.showCharts.map((show) => !show)
                  : activeLayoutIndex === 0
                    ? meta.hiddenCharts
                    : additionalLayouts[activeLayoutIndex - 1]?.hiddenCharts;
              let nextAdditionalLayouts = additionalLayouts;
              if (activeLayoutIndex > 0 && titleConfigTarget === "page") {
                nextAdditionalLayouts = [...additionalLayouts];
                const entry = {
                  ...(nextAdditionalLayouts[activeLayoutIndex - 1] || {}),
                  hiddenCharts: nextHiddenCharts,
                };
                nextAdditionalLayouts[activeLayoutIndex - 1] = entry;
              }
              const nextLayout = {
                ...(layoutConfig || {}),
                meta: {
                  ...meta,
                  sidebarTitle: titleFields.sidebarTitle,
                  sidebarSubtitle: titleFields.sidebarSubtitle,
                  pageTitle: titleFields.pageTitle,
                  pageSubtitle: titleFields.pageSubtitle,
                  showSidebar:
                    titleConfigTarget === "page"
                      ? pageConfig.showSidebar
                      : titleFields.showSidebar,
                  hiddenCharts: activeLayoutIndex === 0 ? nextHiddenCharts : meta.hiddenCharts,
                  sidebarWidget:
                    titleConfigTarget === "sidebar"
                      ? sidebarConfig.widget
                      : layoutConfig?.meta?.sidebarWidget,
                  sidebarLinks:
                    titleConfigTarget === "sidebar"
                      ? sidebarConfig.links
                      : layoutConfig?.meta?.sidebarLinks,
                  additionalLayouts: nextAdditionalLayouts,
                },
              };
              await saveLayout(nextLayout);
              setTitleConfigOpen(false);
            }}
            variant="contained"
          >
            Save
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
    </Box>
  );
}
