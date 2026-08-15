import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import SectionRenderer from "./SectionRenderer";
import { inferPageFamily, isShellSection } from "./pageSpecNormalizer";

const getCorporateSectionSpan = (section) => {
  const title = String(section?.title || "").toLowerCase();
  const type = String(section?.type || "").toLowerCase();
  if (title.includes("hero") || title.includes("header") || title.includes("footer") || title.includes("contact") || type === "hero" || type === "footer") {
    return 12;
  }
  if (title.includes("product") || title.includes("about") || title.includes("research") || title.includes("news") || title.includes("feature") || title.includes("service") || title.includes("trust")) {
    return 6;
  }
  return 12;
};

const PageCanvas = ({ page, theme, onWidgetOptions }) => {
  const layout = page?.layout || {};
  const pageMeta = page?.pageMeta || {};
  const pageFamily = inferPageFamily(pageMeta?.purpose || pageMeta?.name || pageMeta?.domain || "");
  const widgets = Array.isArray(page?.widgets) ? page.widgets : [];
  const sections = Array.isArray(layout.sections) ? layout.sections.filter((section) => !isShellSection(section)) : [];

  if (!sections.length) {
    return (
      <Box
        sx={{
          minHeight: 220,
          border: "1px dashed #d7deea",
          borderRadius: 3,
          bgcolor: "#fff",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Typography sx={{ color: "#5f6f8a" }}>No canvas sections available.</Typography>
      </Box>
    );
  }

  return (
    pageFamily === "corporate" ? (
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(12, minmax(0, 1fr))" },
            gap: 1,
            alignItems: "start",
          }}
        >
          {sections.map((section) => {
            const span = getCorporateSectionSpan(section);
            return (
              <Box key={section.id} sx={{ gridColumn: { xs: "1 / -1", md: `span ${span}` }, minWidth: 0 }}>
              <SectionRenderer
                  section={section}
                  widgets={widgets}
                  theme={theme}
                  layout={layout}
                  pageMeta={pageMeta}
                  onWidgetOptions={onWidgetOptions}
                />
              </Box>
            );
          })}
        </Box>
      </Box>
    ) : (
      <Stack gap={1} sx={{ alignItems: "stretch", justifyContent: "flex-start" }}>
        {sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            widgets={widgets}
            theme={theme}
            layout={layout}
            pageMeta={pageMeta}
            onWidgetOptions={onWidgetOptions}
          />
        ))}
      </Stack>
    )
  );
};

export default PageCanvas;
