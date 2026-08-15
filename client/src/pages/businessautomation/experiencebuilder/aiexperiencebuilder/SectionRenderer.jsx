import React from "react";
import { Box, Button, Grid, Stack, Typography } from "@mui/material";
import WidgetRenderer from "./WidgetRenderer";
import { inferPageFamily } from "./pageSpecNormalizer";

const getWidgetGridSize = (widget) => {
  const type = String(widget?.type || "").toLowerCase();
  if (type === "chart") return { xs: 12, md: 6, lg: 3 };
  if (type === "kpi") return { xs: 12, sm: 6, lg: 3 };
  if (type === "table") return { xs: 12, lg: 12 };
  if (type === "text") return { xs: 12 };
  return { xs: 12, sm: 6, lg: 4 };
};

const getCorporateWidgetGridSize = (widget) => {
  const width = Number(widget?.width) || 0;
  if (width >= 3) return { xs: 12 };
  if (width === 2) return { xs: 12, sm: 6 };
  if (width === 1) return { xs: 12, sm: 4 };
  return { xs: 12, sm: 6 };
};

const resolveSectionWidgets = (section, widgets) => {
  const sectionWidgetIds = Array.isArray(section?.widgetIds) ? section.widgetIds.map(String) : [];
  const sectionId = String(section?.id || "");
  return Array.isArray(widgets)
    ? widgets
        .filter(
          (widget) =>
            widget?.visible !== false &&
            (String(widget?.sectionId || "") === sectionId || sectionWidgetIds.includes(String(widget?.id || "")))
        )
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    : [];
};

const getSectionRole = (section) => {
  const title = String(section?.title || "").toLowerCase();
  const type = String(section?.type || "").toLowerCase();
  const combined = `${title} ${type}`;
  if (combined.includes("hero") || combined.includes("masthead")) return "hero";
  if (combined.includes("product") || combined.includes("service") || combined.includes("feature")) return "products";
  if (combined.includes("news") || combined.includes("research") || combined.includes("blog") || combined.includes("article")) return "news";
  if (combined.includes("contact") || combined.includes("cta")) return "contact";
  if (combined.includes("about") || combined.includes("company") || combined.includes("overview")) return "about";
  return "content";
};

const getVisibleText = (widget) => {
  const body = String(widget?.config?.textContent || widget?.config?.subtext || "").trim();
  const title = String(widget?.title || "").trim();
  return body || title;
};

const renderCorporateTextWidget = (widget, role, index, onWidgetOptions) => {
  const title = String(widget?.title || "").trim();
  const body = getVisibleText(widget);
  const isShort = body.length > 0 && body.length < 26;

  if (role === "hero") {
    if (index === 0) {
      return (
        <Box sx={{ position: "relative" }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: -0.8, fontSize: { xs: 28, md: 44 }, lineHeight: 1.12, color: "#081b2a" }}>
            {body || title}
          </Typography>
        </Box>
      );
    }

    if (index === 1) {
      return (
        <Typography sx={{ color: "#15334d", fontSize: { xs: 16, md: 19 }, lineHeight: 1.7, maxWidth: 860 }}>
          {body || title}
        </Typography>
      );
    }

    return (
      <Button
        variant="contained"
        sx={{
          alignSelf: "flex-start",
          textTransform: "none",
          borderRadius: 1,
          px: 3,
          py: 1.1,
          fontWeight: 800,
          boxShadow: "none",
          bgcolor: "#0c6f7f",
          "&:hover": { bgcolor: "#095c69", boxShadow: "none" },
        }}
      >
        {body || title || "Learn More"}
      </Button>
    );
  }

  if (role === "products") {
    return (
      <Box
        sx={{
          height: "100%",
          minHeight: 176,
          p: 2.5,
          borderRadius: 2,
          bgcolor: "#97d0be",
          color: "#081b2a",
        }}
      >
        <Typography sx={{ fontWeight: 900, fontSize: 22, lineHeight: 1.2, mb: 1.75 }}>{title || body}</Typography>
        <Typography sx={{ fontSize: 15.5, lineHeight: 1.75 }}>{body && !isShort ? body : title}</Typography>
      </Box>
    );
  }

  if (role === "news") {
    return (
      <Box sx={{ py: 0.5 }}>
        <Typography sx={{ color: "#0b7d90", fontWeight: 800, fontSize: 18, lineHeight: 1.3 }}>
          {title || body}
        </Typography>
        {body ? (
          <Typography sx={{ mt: 0.75, color: "#24324f", fontSize: 15.5, lineHeight: 1.75 }}>
            {body}
          </Typography>
        ) : null}
      </Box>
    );
  }

  if (role === "about") {
    return (
      <Stack gap={1.25}>
        <Typography sx={{ color: "#0b7d90", fontWeight: 800, fontSize: 17, lineHeight: 1.25 }}>
          {title || body}
        </Typography>
        {body ? (
          <Typography sx={{ color: "#24324f", fontSize: 15.5, lineHeight: 1.8 }}>
            {body}
          </Typography>
        ) : null}
      </Stack>
    );
  }

  return <WidgetRenderer widget={widget} sectionRole={role} />;
};

const renderCorporateSection = (section, widgets, theme, sectionRole, onWidgetOptions) => {
  if (sectionRole === "hero") {
    return (
      <Box
        sx={{
          p: "10px",
          minHeight: "auto",
          borderRadius: 3,
          bgcolor: section?.backgroundColor || "#9ccfbd",
        }}
      >
        <Stack gap={"10px"} sx={{ alignItems: "flex-start" }}>
          {widgets.map((widget, index) => (
            <Box key={widget.id} sx={{ width: "100%" }}>
              {widget.type === "text" ? renderCorporateTextWidget(widget, sectionRole, index, onWidgetOptions) : <WidgetRenderer widget={widget} section={section} sectionType={sectionRole} onOptions={onWidgetOptions} />}
            </Box>
          ))}
          {!widgets.length && process.env.NODE_ENV !== "production" ? (
            <Typography variant="body2" sx={{ color: "#8191a8" }}>
              No widgets assigned to this section
            </Typography>
          ) : null}
        </Stack>
      </Box>
    );
  }

  if (sectionRole === "products") {
    return (
      <Grid container spacing={1.25} alignItems="stretch">
        {widgets.map((widget, index) => (
          <Grid key={widget.id} item {...getCorporateWidgetGridSize(widget)}>
            {widget.type === "text" ? renderCorporateTextWidget(widget, sectionRole, index, onWidgetOptions) : <WidgetRenderer widget={widget} section={section} sectionType={sectionRole} onOptions={onWidgetOptions} />}
          </Grid>
        ))}
        {!widgets.length && process.env.NODE_ENV !== "production" ? (
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ color: "#8191a8" }}>
              No widgets assigned to this section
            </Typography>
          </Grid>
        ) : null}
      </Grid>
    );
  }

  if (sectionRole === "contact") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Stack gap={"10px"} sx={{ width: "100%", maxWidth: 420 }}>
          {widgets.map((widget, index) => (
            <Box key={widget.id} sx={{ width: "100%" }}>
              {widget.type === "text" ? renderCorporateTextWidget(widget, sectionRole, index, onWidgetOptions) : <WidgetRenderer widget={widget} section={section} sectionType={sectionRole} onOptions={onWidgetOptions} />}
            </Box>
          ))}
          {!widgets.length && process.env.NODE_ENV !== "production" ? (
            <Typography variant="body2" sx={{ color: "#8191a8" }}>
              No widgets assigned to this section
            </Typography>
          ) : null}
        </Stack>
      </Box>
    );
  }

  if (sectionRole === "news") {
    return (
      <Stack gap={"10px"}>
        {widgets.map((widget, index) => (
          <Box key={widget.id} sx={{ width: "100%" }}>
            {widget.type === "text" ? renderCorporateTextWidget(widget, sectionRole, index, onWidgetOptions) : <WidgetRenderer widget={widget} section={section} sectionType={sectionRole} onOptions={onWidgetOptions} />}
          </Box>
        ))}
        {!widgets.length && process.env.NODE_ENV !== "production" ? (
          <Typography variant="body2" sx={{ color: "#8191a8" }}>
            No widgets assigned to this section
          </Typography>
        ) : null}
      </Stack>
    );
  }

  if (sectionRole === "about") {
    return (
      <Stack gap={"10px"}>
        {widgets.map((widget, index) => (
          <Box key={widget.id} sx={{ width: "100%" }}>
            {widget.type === "text" ? renderCorporateTextWidget(widget, sectionRole, index, onWidgetOptions) : <WidgetRenderer widget={widget} section={section} sectionType={sectionRole} onOptions={onWidgetOptions} />}
          </Box>
        ))}
        {!widgets.length && process.env.NODE_ENV !== "production" ? (
          <Typography variant="body2" sx={{ color: "#8191a8" }}>
            No widgets assigned to this section
          </Typography>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack gap={"10px"} alignItems="stretch" justifyContent="flex-start">
      {widgets.map((widget) => (
        <Box key={widget.id} sx={{ width: "100%" }}>
          <WidgetRenderer widget={widget} section={section} sectionType={sectionRole} onOptions={onWidgetOptions} />
        </Box>
      ))}
      {!widgets.length && process.env.NODE_ENV !== "production" ? (
        <Typography variant="body2" sx={{ color: "#8191a8" }}>
          No widgets assigned to this section
        </Typography>
      ) : null}
    </Stack>
  );
};

const SectionRenderer = ({ section, widgets: pageWidgets, theme, layout, pageMeta, onWidgetOptions }) => {
  const widgets = resolveSectionWidgets(section, pageWidgets);
  const sectionType = String(section?.type || "content").toLowerCase();
  const pageFamily = inferPageFamily(pageMeta?.purpose || pageMeta?.name || pageMeta?.domain || "");
  const isCorporatePage = pageFamily === "corporate";
  const isHero = sectionType === "hero";
  const isDashboardSection = layout?.compositionMode === "dashboard-led" || sectionType === "dashboard";
  const sectionRole = getSectionRole(section);
  const visualWeight = String(layout?.visualWeight || "high");
  const sectionBg =
    section?.backgroundColor ||
    (isCorporatePage && isHero ? "#9ccfbd" : sectionType === "hero" ? theme?.colors?.surfaceMuted : theme?.colors?.surface) ||
    "#ffffff";
  const sectionStyle = {
    borderRadius: `${section?.radius ?? theme?.layout?.radii ?? (isCorporatePage ? 18 : 16)}px`,
    border: `1px solid ${section?.borderColor || theme?.colors?.border || "#d7deea"}`,
    backgroundColor: sectionBg,
    overflow: "hidden",
    boxShadow: visualWeight === "high" ? theme?.effects?.sectionShadow || "0 12px 28px rgba(31, 62, 120, 0.06)" : "0 8px 18px rgba(31, 62, 120, 0.04)",
    position: "relative",
    backgroundImage:
      sectionType === "hero" && !isCorporatePage
        ? `linear-gradient(135deg, ${theme?.colors?.surface || "#fff"} 0%, ${theme?.colors?.surfaceMuted || "#f7faff"} 100%)`
        : "none",
  };

  const sectionPadding = "10px"
  const sectionMinHeight = "auto";

  return (
    <Box
      sx={{
        ...sectionStyle,
        p: Number(section?.padding) || sectionPadding,
        minHeight: sectionMinHeight,
        height: "auto",
      }}
    >
      {isCorporatePage ? (
        renderCorporateSection(section, widgets, theme, sectionRole, onWidgetOptions)
      ) : (
        <Stack gap={"10px"} sx={{ position: "relative", alignItems: "stretch", justifyContent: "flex-start" }}>
          {isDashboardSection ? (
            <Box sx={{ width: "100%" }}>
              <Grid container spacing={1.25} alignItems="stretch" justifyContent="flex-start">
                {widgets.map((widget, index) => (
                   <Grid key={`${widget.id}-${widget.type}-${index}`} item {...getWidgetGridSize(widget)}>
                    <WidgetRenderer widget={widget} section={section} sectionType={sectionType} onOptions={onWidgetOptions} />
                  </Grid>
                ))}
                {!widgets.length && process.env.NODE_ENV !== "production" ? (
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: "#8191a8" }}>
                      No widgets assigned to this section
                    </Typography>
                  </Grid>
                ) : null}
              </Grid>
            </Box>
          ) : (
            <Stack gap={"10px"} alignItems="stretch" justifyContent="flex-start">
              {widgets.map((widget, index) => (
                  <Box key={`${widget.id}-${widget.type}-${index}`} sx={{ width: "100%" }}>
                  <WidgetRenderer widget={widget} section={section} sectionType={sectionType} onOptions={onWidgetOptions} />
                </Box>
              ))}
              {!widgets.length && process.env.NODE_ENV !== "production" ? (
                <Typography variant="body2" sx={{ color: "#8191a8" }}>
                  No widgets assigned to this section
                </Typography>
              ) : null}
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default SectionRenderer;
