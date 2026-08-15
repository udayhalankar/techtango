import React, { Fragment, useMemo } from "react";
import { Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import WidgetRenderer from "./WidgetRenderer";

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const UNSUPPORTED_TAGS = new Set(["iframe"]);

const ROOT_CLASS = ".ai-html-preview-root";

const rewriteSelectorText = (selectorText) =>
  String(selectorText || "")
    .replace(/\bhtml\b/gi, ROOT_CLASS)
    .replace(/\bbody\b/gi, ROOT_CLASS)
    .replace(/:root/gi, ROOT_CLASS);

const rewriteCssText = (cssText) => {
  const text = String(cssText || "").trim();
  if (!text) return "";

  try {
    if (typeof CSSStyleSheet === "function") {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      return Array.from(sheet.cssRules || [])
        .map((rule) => {
          if (!rule) return "";
          const cssRule = typeof CSSRule !== "undefined" ? CSSRule : null;
          if (cssRule && rule.type === cssRule.STYLE_RULE) {
            return `${rewriteSelectorText(rule.selectorText)} { ${rule.style.cssText} }`;
          }
          if (cssRule && rule.type === cssRule.MEDIA_RULE) {
            const nested = Array.from(rule.cssRules || []).map((nestedRule) => rewriteCssText(nestedRule.cssText || "")).filter(Boolean).join("\n");
            return nested ? `@media ${rule.conditionText} {\n${nested}\n}` : "";
          }
          return rule.cssText || "";
        })
        .filter(Boolean)
        .join("\n");
    }
  } catch {
    // fallback below
  }

  return text.replace(/\bhtml\b/gi, ROOT_CLASS).replace(/\bbody\b/gi, ROOT_CLASS).replace(/:root/gi, ROOT_CLASS);
};

const parseStyleValue = (styleText) => {
  const style = {};
  String(styleText || "")
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .forEach((chunk) => {
      const index = chunk.indexOf(":");
      if (index === -1) return;
      const key = chunk.slice(0, index).trim().replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
      const value = chunk.slice(index + 1).trim();
      if (key) style[key] = value;
    });
  return style;
};

const toReactProps = (element) => {
  const props = {};
  Array.from(element.attributes || []).forEach((attr) => {
    const name = String(attr.name || "").toLowerCase();
    const value = attr.value;
    if (name === "style") {
      props.style = parseStyleValue(value);
      return;
    }
    if (name === "class") {
      props.className = value;
      return;
    }
    if (name === "for") {
      props.htmlFor = value;
      return;
    }
    if (name.startsWith("data-") || name.startsWith("aria-")) {
      props[name] = value;
      return;
    }
    props[name] = value;
  });
  return props;
};

const getAttr = (node, name, fallback = "") => String(node?.getAttribute?.(name) ?? fallback).trim();

const parseManifest = (doc) => {
  const script = doc.querySelector("script#ai-widget-manifest[type='application/json']");
  if (!script) return { widgets: [] };
  try {
    return JSON.parse(String(script.textContent || "").trim() || "{}");
  } catch {
    return { widgets: [] };
  }
};

const buildWidgetFromNode = (element, manifest = {}) => {
  const widgetType = getAttr(element, "data-ai-widget", "text").toLowerCase();
  const widgetId = getAttr(element, "data-ai-widget-id", `widget-${Math.random().toString(36).slice(2, 10)}`);
  const title = getAttr(element, "data-ai-title", element.textContent || "Widget");
  const manifestWidget = Array.isArray(manifest?.widgets)
    ? manifest.widgets.find((item) => String(item?.id || "") === widgetId)
    : manifest?.widgets?.[widgetId];
  const manifestConfig = manifestWidget?.config || manifestWidget || {};

  return {
    id: widgetId,
    type: widgetType,
    title,
    config: {
      ...manifestConfig,
      title,
      tableName: getAttr(element, "data-ai-table", manifestConfig.tableName || manifestConfig.dataTable || ""),
      dataTable: getAttr(element, "data-ai-table", manifestConfig.dataTable || manifestConfig.tableName || ""),
      chartType: getAttr(element, "data-ai-chart-type", manifestConfig.chartType || "bar"),
      seriesName: getAttr(element, "data-ai-series", manifestConfig.seriesName || title),
      xAxis: getAttr(element, "data-ai-x-axis", manifestConfig.xAxis || ""),
      yAxis: getAttr(element, "data-ai-y-axis", manifestConfig.yAxis || ""),
      aggregation: getAttr(element, "data-ai-aggregation", manifestConfig.aggregation || "actual"),
      legendPosition: getAttr(element, "data-ai-legend-position", manifestConfig.legendPosition || "top"),
      rowLimit: Number(getAttr(element, "data-ai-row-limit", manifestConfig.rowLimit || manifestConfig.limit || 10)) || 10,
      limit: Number(getAttr(element, "data-ai-row-limit", manifestConfig.limit || manifestConfig.rowLimit || 10)) || 10,
      columns: manifestConfig.columns || [],
      textContent: getAttr(element, "data-ai-text", manifestConfig.textContent || ""),
      src: getAttr(element, "data-ai-src", manifestConfig.src || ""),
      imageFit: getAttr(element, "data-ai-fit", manifestConfig.imageFit || "contain"),
      imagePosition: getAttr(element, "data-ai-position", manifestConfig.imagePosition || "center"),
    },
  };
};

const renderNode = (node, options = {}, path = "0") => {
  if (!node) return null;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = String(node.textContent || "");
    if (!text.trim()) return null;
    return text;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node;
  const tagName = String(element.tagName || "").toLowerCase();
  if (tagName === "style" || tagName === "script") return null;
  if (options.removedNodeSet?.has(path)) return null;

  const props = toReactProps(element);
  const isWidget = element.hasAttribute("data-ai-widget");
  const children = Array.from(element.childNodes || [])
    .map((child, index) => renderNode(child, options, `${path}.${index}`))
    .filter((child) => child !== null && child !== undefined);

  if (isWidget) {
    const widget = buildWidgetFromNode(element, options.manifest || {});
    const hostProps = {
      component: tagName,
      className: props.className,
      style: props.style,
      id: props.id,
      title: props.title,
      role: props.role,
      "data-ai-widget": props["data-ai-widget"],
      "data-ai-widget-id": props["data-ai-widget-id"],
      "data-ai-title": props["data-ai-title"],
      "data-ai-table": props["data-ai-table"],
      "data-ai-chart-type": props["data-ai-chart-type"],
      "data-ai-x-axis": props["data-ai-x-axis"],
      "data-ai-y-axis": props["data-ai-y-axis"],
      "data-ai-aggregation": props["data-ai-aggregation"],
      "data-ai-legend-position": props["data-ai-legend-position"],
    };

    return (
      <Box {...hostProps} sx={{ width: "100%", minWidth: 0, ...(props.sx || {}) }}>
        <WidgetRenderer widget={widget} />
      </Box>
    );
  }

  if (VOID_TAGS.has(tagName)) {
    return React.createElement(tagName, props);
  }

  return React.createElement(tagName, props, children.length ? children : null);
};

const compileHtml = (html) => {
  const text = String(html || "").trim();
  if (!text) throw new Error("No HTML preview available.");

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  if (doc.querySelector("parsererror")) throw new Error("HTML could not be parsed.");

  const styles = Array.from(doc.querySelectorAll("style"))
    .map((node) => String(node.textContent || "").trim())
    .filter(Boolean)
    .join("\n");
  const manifest = parseManifest(doc);
  const body = doc.body;
  if (!body) throw new Error("HTML does not contain a body element.");

  return {
    styleText: rewriteCssText(styles),
    manifest,
    children: Array.from(body.childNodes || [])
      .map((child, index) => renderNode(child, { manifest }, String(index)))
      .filter((child) => child !== null && child !== undefined),
  };
};

const ErrorState = ({ message }) => (
  <Paper
    elevation={0}
    sx={{
      minHeight: 240,
      border: "1px solid #f2c5c5",
      borderRadius: 3,
      bgcolor: "#fff8f8",
      display: "grid",
      placeItems: "center",
      p: 3,
    }}
  >
    <Box sx={{ maxWidth: 720, textAlign: "center" }}>
      <Typography sx={{ fontWeight: 800, color: "#9f1239", mb: 1 }}>HTML-to-React compilation failed</Typography>
      <Typography sx={{ color: "#7f1d1d", whiteSpace: "pre-wrap" }}>{message}</Typography>
    </Box>
  </Paper>
);

const HtmlToReactWidgetCompiler = ({ html, showManifest = false }) => {
  const result = useMemo(() => {
    try {
      return { data: compileHtml(html), error: null };
    } catch (error) {
      return { data: null, error: error?.message || "Failed to compile HTML." };
    }
  }, [html]);

  if (result.error) {
    return <ErrorState message={result.error} />;
  }

  const { data } = result;

  return (
    <Box sx={{ width: "100%", minWidth: 0, bgcolor: "#fff", overflowX: "hidden" }}>
      {data.styleText ? <style>{data.styleText}</style> : null}
      {showManifest && data.manifest ? <pre style={{ display: "none" }}>{JSON.stringify(data.manifest)}</pre> : null}
      <Box className="ai-html-preview-root" sx={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
        {data.children.map((child, index) => (
          <Fragment key={`ai-html-child-${index}`}>{child}</Fragment>
        ))}
      </Box>
    </Box>
  );
};

export default HtmlToReactWidgetCompiler;
