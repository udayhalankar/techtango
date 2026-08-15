import React, { Fragment, useMemo } from "react";
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import WidgetRenderer from "./WidgetRenderer";

const DEFAULT_LAYOUT_SETTINGS = {
  cardGap: 10,
  rowHeight: 150,
  cardPadding: 10,
};

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const UNSUPPORTED_TAGS = new Set(["iframe"]);

const BOOLEAN_ATTRS = new Set([
  "checked",
  "disabled",
  "hidden",
  "loop",
  "multiple",
  "muted",
  "open",
  "readonly",
  "required",
  "selected",
]);

const ATTR_MAP = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  colspan: "colSpan",
  rowspan: "rowSpan",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  colspanspan: "colSpan",
  srcdoc: "srcDoc",
  crossorigin: "crossOrigin",
  datetime: "dateTime",
  enctype: "encType",
  usemap: "useMap",
  rowspanspan: "rowSpan",
  frameborder: "frameBorder",
  allowfullscreen: "allowFullScreen",
};

const camelCase = (value) =>
  String(value || "")
    .trim()
    .replace(/-([a-z])/g, (_match, char) => char.toUpperCase());

const parseStyleValue = (styleText) => {
  const style = {};
  String(styleText || "")
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .forEach((chunk) => {
      const index = chunk.indexOf(":");
      if (index === -1) return;
      const key = camelCase(chunk.slice(0, index));
      const value = chunk.slice(index + 1).trim();
      if (key) style[key] = value;
    });
  return style;
};

const stringifyNodeText = (node) => String(node?.textContent || "");

const ROOT_CLASS = ".ai-html-preview-root";

const rewriteSelectorText = (selectorText) =>
  String(selectorText || "")
    .replace(/\bhtml\b/gi, ROOT_CLASS)
    .replace(/\bbody\b/gi, ROOT_CLASS)
    .replace(/:root/gi, ROOT_CLASS);

const rewriteCssRule = (rule) => {
  if (!rule) return "";
  const cssRule = typeof CSSRule !== "undefined" ? CSSRule : null;

  if (cssRule && rule.type === cssRule.STYLE_RULE) {
    return `${rewriteSelectorText(rule.selectorText)} { ${rule.style.cssText} }`;
  }

  if (cssRule && rule.type === cssRule.MEDIA_RULE) {
    const nested = Array.from(rule.cssRules || []).map(rewriteCssRule).filter(Boolean).join("\n");
    return nested ? `@media ${rule.conditionText} {\n${nested}\n}` : "";
  }

  if (cssRule && rule.type === cssRule.SUPPORTS_RULE) {
    const nested = Array.from(rule.cssRules || []).map(rewriteCssRule).filter(Boolean).join("\n");
    return nested ? `@supports ${rule.conditionText} {\n${nested}\n}` : "";
  }

  return rule.cssText || "";
};

const rewriteCssTextFallback = (cssText) =>
  String(cssText || "")
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
        .map(rewriteCssRule)
        .filter(Boolean)
        .join("\n");
    }
  } catch {
    // fall back to text rewrite below
  }

  return rewriteCssTextFallback(text);
};

const normalizeTag = (tagName) => String(tagName || "").toLowerCase();

const toReactProps = (element) => {
  const props = {};
  Array.from(element.attributes || []).forEach((attr) => {
    const name = String(attr.name || "").toLowerCase();
    const value = attr.value;

    if (name === "style") {
      const styleObj = parseStyleValue(value);
      if (Object.keys(styleObj).length) props.style = styleObj;
      return;
    }

    const mappedName = ATTR_MAP[name] || name;

    if (BOOLEAN_ATTRS.has(name)) {
      props[mappedName] = true;
      return;
    }

    if (name.startsWith("data-") || name.startsWith("aria-")) {
      props[name] = value;
      return;
    }

    if (mappedName === "tabIndex" || mappedName === "rowSpan" || mappedName === "colSpan" || mappedName === "maxLength" || mappedName === "minLength") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        props[mappedName] = parsed;
        return;
      }
    }

    if (mappedName === "href" || mappedName === "src" || mappedName === "alt" || mappedName === "title" || mappedName === "id" || mappedName === "role" || mappedName === "type" || mappedName === "name") {
      props[mappedName] = value;
      return;
    }

    if (mappedName === "className" || mappedName === "htmlFor" || mappedName === "autoComplete" || mappedName === "autoFocus" || mappedName === "readOnly" || mappedName === "cellPadding" || mappedName === "cellSpacing" || mappedName === "crossOrigin" || mappedName === "dateTime" || mappedName === "encType" || mappedName === "useMap" || mappedName === "frameBorder" || mappedName === "allowFullScreen" || mappedName === "contentEditable") {
      props[mappedName] = value;
      return;
    }

    props[mappedName] = value;
  });

  return props;
};

const collectStylesAndValidate = (doc) => {
  const blockedExternalStyles = Array.from(doc.querySelectorAll("link[rel='stylesheet']"));
  if (blockedExternalStyles.length) {
    throw new Error("External stylesheet links are not supported in React preview.");
  }

  const blockedNodes = Array.from(doc.querySelectorAll(Array.from(UNSUPPORTED_TAGS).join(",")));
  if (blockedNodes.length) {
    const tagNames = [...new Set(blockedNodes.map((node) => String(node.tagName || "").toLowerCase()))];
    throw new Error(`Unsupported HTML elements in React preview: ${tagNames.join(", ")}`);
  }

  const styleNodes = Array.from(doc.querySelectorAll("style"));
  const rawCss = styleNodes
    .map((node) => String(node.textContent || "").trim())
    .filter(Boolean)
    .join("\n");

  if (/@import\b/i.test(rawCss)) {
    throw new Error("CSS @import rules are not supported in React preview.");
  }

  return rewriteCssText(rawCss);
};

const EDITABLE_TAGS = new Set(["header", "nav", "aside", "footer", "table"]);

const shouldShowChrome = (tagName, props) => {
  const className = String(props?.className || "").toLowerCase();
  const combined = `${tagName} ${className}`;
  return EDITABLE_TAGS.has(tagName) || /\b(chart|table|menu|sidebar)\b/.test(combined);
};

const isCardLikeNode = (tagName, props) => {
  const className = String(props?.className || "").toLowerCase();
  const combined = `${tagName} ${className}`;
  return /\b(card|panel|widget|tile|grid-item|dashboard-card|summary-card|metric-card|chart-card|table-card|item-card)\b/.test(combined);
};

const buildSelectionWidget = (selection = {}, columnsByTable = {}, tableRowsByTable = {}, layoutSettings = DEFAULT_LAYOUT_SETTINGS) => {
  const widgetType = String(selection.widgetType || "chart").toLowerCase();
  const config = selection.widgetConfig || {};
  const tableName = String(config.tableName || config.dataTable || "").trim();
  const columns = Array.isArray(columnsByTable[tableName]) ? columnsByTable[tableName] : [];
  const rows = Array.isArray(tableRowsByTable[tableName]) ? tableRowsByTable[tableName] : [];
  const selectedType = widgetType === "table" ? "table" : "chart";

  return {
    id: `chrome-${selection.nodeKey || "target"}`,
    title: config.chartName || config.tableName || (selectedType === "table" ? "Data table" : "Chart"),
    type: selectedType,
    config: {
      ...config,
      tableName,
      dataTable: tableName,
      seriesName: config.seriesName || config.chartName || tableName,
      columns: columns.length ? columns : config.columns || [],
      dataRows: rows,
      rowLimit: Math.max(1, Math.min(25, Number(config.rowLimit || config.limit || 10) || 10)),
      limit: Math.max(1, Math.min(25, Number(config.rowLimit || config.limit || 10) || 10)),
      rowsPerPageOptions: config.rowsPerPageOptions || [5, 10, 15, 25],
      layoutSettings,
    },
  };
};

const renderNode = (node, options = {}, path = "0") => {
  if (!node) return null;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = stringifyNodeText(node);
    if (!text.trim()) return null;
    return text;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const tagName = normalizeTag(node.tagName);
  if (tagName === "style") {
    return null;
  }

  if (options.removedNodeSet?.has(path)) {
    return null;
  }

  const layoutSettings = { ...DEFAULT_LAYOUT_SETTINGS, ...(options.layoutSettings || {}) };
  const props = toReactProps(node);
  const pathDepth = String(path || "").split(".").length;
  if (options.topLevelChild || (pathDepth <= 2 && ["main", "section", "article", "header", "footer", "nav", "aside"].includes(tagName))) {
    props.style = {
      ...(props.style || {}),
      marginTop: 0,
      marginBottom: 0,
    };
  }
  const canShowChrome = Boolean(options.showEditorChrome && !options.chromeBlocked && shouldShowChrome(tagName, props));
  const childOptions = canShowChrome ? { ...options, chromeBlocked: true } : options;
  const children = Array.from(node.childNodes || [])
    .map((child, index) => renderNode(child, childOptions, `${path}.${index}`))
    .filter((child) => child !== null && child !== undefined);

  const selection = options.chromeSelections?.[path];
  if (selection) {
    const widget = buildSelectionWidget(selection, options.columnsByTable || {}, options.tableRowsByTable || {}, layoutSettings);
    const isTableSelection = String(widget?.type || "").toLowerCase() === "table";
    const selectedNode = (
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          height: isTableSelection ? "auto" : "100%",
          minHeight: isTableSelection ? "auto" : layoutSettings.rowHeight,
          display: "flex",
          flexDirection: "column",
          alignSelf: "stretch",
        }}
      >
        <WidgetRenderer widget={widget} layoutSettings={layoutSettings} />
      </Box>
    );

    if (!canShowChrome) {
      return selectedNode;
    }

      return (
      <Box
        sx={{
          position: "relative",
          width: "100%",
          minWidth: 0,
          flex: isTableSelection ? "0 0 auto" : "1 1 0",
          height: isTableSelection ? "auto" : "100%",
          minHeight: isTableSelection ? "auto" : layoutSettings.rowHeight,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ position: "absolute", top: 6, right: 6, zIndex: 20, pointerEvents: "auto" }}>
          <Tooltip title="Section options">
            <IconButton
              size="small"
              aria-label="Section options"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                options.onChromeClick?.({
                  nodeKey: path,
                  tagName,
                  className: props?.className || "",
                  title: props?.title || "",
                });
              }}
              sx={{
                width: 26,
                height: 26,
                bgcolor: "rgba(255,255,255,0.98)",
                border: "1px solid #9fbaf4",
                boxShadow: "0 1px 4px rgba(16, 24, 40, 0.18)",
                "&:hover": { bgcolor: "#ffffff", borderColor: "#2f7dd6" },
              }}
            >
              <MoreVertIcon sx={{ fontSize: 16, color: "#2f7dd6" }} />
            </IconButton>
          </Tooltip>
        </Box>
        {selectedNode}
      </Box>
    );
  }

  if (tagName === "script") {
    const scriptChildren = Array.from(node.childNodes || [])
      .map((child) => renderNode(child, childOptions))
      .filter((child) => child !== null && child !== undefined);
    return React.createElement("script", props, scriptChildren.length ? scriptChildren : null);
  }

  if (VOID_TAGS.has(tagName)) {
    return React.createElement(tagName, props);
  }

  const element = React.createElement(tagName, props, children.length ? children : null);

  if (!canShowChrome) {
    return element;
  }

  const cardLike = isCardLikeNode(tagName, props);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        minWidth: 0,
        flex: cardLike ? "1 1 0" : "0 1 auto",
        height: "100%",
        minHeight: layoutSettings.rowHeight,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ position: "absolute", top: 6, right: 6, zIndex: 20, pointerEvents: "auto" }}>
        <Tooltip title="Section options">
          <IconButton
            size="small"
            aria-label="Section options"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              options.onChromeClick?.({
                nodeKey: path,
                tagName,
                className: props?.className || "",
                title: props?.title || "",
              });
            }}
            sx={{
              width: 26,
              height: 26,
              bgcolor: "rgba(255,255,255,0.98)",
              border: "1px solid #9fbaf4",
              boxShadow: "0 1px 4px rgba(16, 24, 40, 0.18)",
              "&:hover": { bgcolor: "#ffffff", borderColor: "#2f7dd6" },
            }}
          >
            <MoreVertIcon sx={{ fontSize: 16, color: "#2f7dd6" }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ width: "100%", minWidth: 0, minHeight: layoutSettings.rowHeight, display: "flex", flexDirection: "column", flex: "1 1 0" }}>
        {element}
      </Box>
    </Box>
  );
};

const compileHtmlPreview = (html, options = {}) => {
  const text = String(html || "").trim();
  if (!text) {
    throw new Error("No HTML preview available.");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  if (doc.querySelector("parsererror")) {
    throw new Error("HTML could not be parsed.");
  }

  const styleText = collectStylesAndValidate(doc);

  const body = doc.body;
  if (!body) {
    throw new Error("HTML does not contain a body element.");
  }

  return {
    styleText,
    children: Array.from(body.childNodes || [])
      .map((child, index) => renderNode(child, { ...options, topLevelChild: true }, String(index)))
      .filter((child) => child !== null && child !== undefined),
  };
};

const ErrorState = ({ message }) => (
  <Paper
    elevation={0}
    sx={{
      minHeight: 320,
      border: "1px solid #f2c5c5",
      borderRadius: 3,
      bgcolor: "#fff8f8",
      display: "grid",
      placeItems: "center",
      p: 3,
    }}
  >
    <Box sx={{ maxWidth: 720, textAlign: "center" }}>
      <Typography sx={{ fontWeight: 800, color: "#9f1239", mb: 1 }}>React preview compilation failed</Typography>
      <Typography sx={{ color: "#7f1d1d", whiteSpace: "pre-wrap" }}>{message}</Typography>
    </Box>
  </Paper>
);

const CompiledHtmlRenderer = ({
  html,
  showEditorChrome = false,
  onChromeClick,
  chromeSelections = {},
  removedNodeKeys = [],
  columnsByTable = {},
  tableRowsByTable = {},
  layoutSettings = DEFAULT_LAYOUT_SETTINGS,
  headerOverlay = null,
}) => {
  const removedNodeSet = useMemo(
    () => new Set((Array.isArray(removedNodeKeys) ? removedNodeKeys : []).map((key) => String(key))),
    [removedNodeKeys]
  );
  const result = useMemo(() => {
    try {
      return {
        data: compileHtmlPreview(html, {
          showEditorChrome,
          onChromeClick,
          chromeSelections,
          removedNodeSet,
          columnsByTable,
          tableRowsByTable,
          layoutSettings,
        }),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error?.message || "React preview compilation failed." };
    }
  }, [html, showEditorChrome, onChromeClick, chromeSelections, removedNodeSet, columnsByTable, tableRowsByTable, layoutSettings]);

  if (result.error) {
    return <ErrorState message={result.error} />;
  }

  const { data } = result;
  const logoUrl = String(headerOverlay?.logoUrl || headerOverlay?.logoImageUrl || headerOverlay?.logo?.url || "").trim();
  const showHeaderOverlay = Boolean(logoUrl || headerOverlay?.showHeader || headerOverlay?.visible);
  const visibleChildren = showHeaderOverlay ? data.children.slice(1) : data.children;

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        minHeight: "100dvh",
        bgcolor: "#fff",
        overflowX: "hidden",
      }}
    >
      {showHeaderOverlay ? (
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderBottom: "1px solid rgba(255,255,255,.12)",
            bgcolor: "#0b4a8b",
            color: "#fff",
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ minHeight: 56 }}>
            <Box sx={{ minWidth: 0, display: "flex", alignItems: "center" }}>
              {logoUrl ? (
                <Box
                  component="img"
                  src={logoUrl}
                  alt="Header logo"
                  sx={{
                    display: "block",
                    maxHeight: 42,
                    maxWidth: 220,
                    objectFit: "contain",
                    flexShrink: 0,
                  }}
                />
              ) : null}
            </Box>
            <IconButton
              size="small"
              aria-label="Header options"
              sx={{
                width: 28,
                height: 28,
                color: "#fff",
                border: "1px solid rgba(255,255,255,.35)",
                bgcolor: "rgba(255,255,255,.14)",
                "&:hover": { bgcolor: "rgba(255,255,255,.22)" },
              }}
            >
              <MoreVertIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        </Box>
      ) : null}
      {data.styleText ? <style>{data.styleText}</style> : null}
      <Box
        className="ai-html-preview-root"
        sx={{
          width: "100%",
          minWidth: 0,
          minHeight: "100dvh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: "10px",
          m: 0,
          p: 0,
          "--ai-preview-card-gap": "10px",
          "--ai-preview-row-height": "150px",
          "--ai-preview-card-padding": "10px",
          "& *": {
            boxSizing: "border-box",
          },
        }}
      >
        {visibleChildren.map((child, index) => (
          <Fragment key={`compiled-html-child-${index}`}>{child}</Fragment>
        ))}
      </Box>
    </Box>
  );
};

export default CompiledHtmlRenderer;
