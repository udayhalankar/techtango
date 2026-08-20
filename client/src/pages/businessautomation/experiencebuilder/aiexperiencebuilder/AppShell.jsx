import React, { useEffect, useState } from "react";
import { Box, Chip, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const isVisible = (flatValue, nestedValue) => Boolean(flatValue || nestedValue?.visible);

const clampInt = (value, min, max) => {
  const next = Math.floor(Number(value) || 0);
  return Math.max(min, Math.min(max, next));
};

const getSlotConfig = (shell, slotKey) => {
  if (slotKey === "header") return shell.header || {};
  if (slotKey === "footer") return shell.footer || {};
  if (slotKey === "leftMenu") return shell.leftMenu || {};
  if (slotKey === "rightMenu") return shell.rightMenu || {};
  return {};
};

const HeaderLogo = ({ src, alt, height }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return null;

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
      sx={{
        display: "block",
        maxHeight: height,
        maxWidth: "100%",
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
};

const normalizeHeaderEntries = (value, withIcon = false) => {
  const source = Array.isArray(value)
    ? value
    : splitLines(value).map((line) => {
        const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
        return withIcon
          ? { label: parts[0] || "", url: parts[1] || "", iconText: parts[2] || "" }
          : { label: parts[0] || "", url: parts[1] || "" };
      });

  return source
    .map((item) => {
      const label = String(item?.label || item?.text || item?.name || item?.title || "").trim();
      const url = String(item?.url || item?.href || item?.link || "").trim();
      const rawIcon = String(item?.iconText || item?.icon || item?.iconUrl || "").trim();
      const isIconUrl = /^data:image\/|^https?:\/\//i.test(rawIcon);
      const iconUrl = isIconUrl ? rawIcon : "";
      const iconText = rawIcon && !isIconUrl ? rawIcon : String(label.slice(0, 1) || "").toUpperCase();
      return withIcon ? { label, url, iconText, iconUrl } : { label, url };
    })
    .filter((item) => item.label || item.url || (withIcon && (item.iconText || item.iconUrl)));
};

const splitLines = (value) =>
  String(value || "")
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);

const renderSlotBody = (slotKey, shell, pageMeta, theme) => {
  const config = getSlotConfig(shell, slotKey);
  const title = String(config.title || "").trim();
  const content = String(config.content || "").trim();
  const items = splitLines(config.items || content);

  if (slotKey === "header") {
    const headerHeight = clampInt(config.height ?? 72, 40, 100);
    const headerMenuItems = normalizeHeaderEntries(config.menuItems || config.items || config.links || config.content, false);
    const headerRightIcons = normalizeHeaderEntries(config.rightIcons || config.actions || config.icons, true);
    const logoUrl = String(config.logoImageUrl || config.logoUrl || config.logo?.url || "").trim();
    const logoHeight = clampInt(config.logoHeight ?? 32, 16, Math.max(16, headerHeight - 10));
    const logoWidth = clampInt(config.logoWidth ?? 20, 5, 20);
    const headerTitle = title || config.logoText || shell.brandName || theme?.brandName || pageMeta.name || "Augmis";
    const headerSubtitle = content || config.subtitle || shell.tagline || theme?.tagline || "Manage Information Effortlessly";

    return (
      <Box
        sx={{
          width: "100%",
          minHeight: headerHeight,
          height: headerHeight,
          mx: 0,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          p: "10px",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            flex: `0 1 ${logoWidth}%`,
            maxWidth: "20%",
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {logoUrl ? (
            <HeaderLogo src={logoUrl} alt={headerTitle} height={logoHeight} />
          ) : (
            <Stack gap={0.15} sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 17, color: theme?.colors?.primary || "#16233b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {headerTitle}
              </Typography>
              <Typography variant="caption" sx={{ color: "#5f6f8a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {headerSubtitle}
              </Typography>
            </Stack>
          )}
        </Box>

        <Stack
          direction="row"
          gap="10px"
          sx={{
            flex: "1 1 auto",
            minWidth: 0,
            justifyContent: "flex-end",
            alignItems: "center",
            overflow: "hidden",
            flexWrap: "wrap",
          }}
        >
          {headerMenuItems.length ? (
            headerMenuItems.map((item, index) => (
              <Box
                key={`${slotKey}-menu-${index}-${item.label || item.url}`}
                component={item.url ? "a" : "span"}
                href={item.url || undefined}
                target={item.url ? "_blank" : undefined}
                rel={item.url ? "noreferrer" : undefined}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  px: 1,
                  py: 0.45,
                  borderRadius: 999,
                  color: theme?.colors?.primary || "#16233b",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  bgcolor: "rgba(47,125,214,0.08)",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
              >
                {item.label || item.url}
              </Box>
            ))
          ) : null}
        </Stack>

        <Stack
          direction="row"
          gap="10px"
          sx={{
            flex: "0 0 auto",
            alignItems: "center",
            flexWrap: "nowrap",
            overflow: "hidden",
          }}
        >
          {headerRightIcons.length ? (
            headerRightIcons.map((item, index) => (
              <Box
                key={`${slotKey}-icon-${index}-${item.label || item.url || item.iconText}`}
                component={item.url ? "a" : "span"}
                href={item.url || undefined}
                target={item.url ? "_blank" : undefined}
                rel={item.url ? "noreferrer" : undefined}
                title={item.label || item.url}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "1px solid #c9d7ee",
                  bgcolor: "#fff",
                  color: theme?.colors?.primary || "#2f7dd6",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {item.iconUrl ? (
                  <Box
                    component="img"
                    src={item.iconUrl}
                    alt={item.label || "icon"}
                    sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                ) : (
                  <Typography sx={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{item.iconText || String(item.label || "?").slice(0, 1)}</Typography>
                )}
              </Box>
            ))
          ) : null}
        </Stack>
      </Box>
    );
  }

  if (config.type === "navigation" || config.type === "navigationList" || config.type === "quickActions") {
    return (
      <Stack gap={1}>
        <Typography sx={{ fontWeight: 900, color: "#16233b" }}>{title || slotKey}</Typography>
        <Stack gap={0.5}>
          {items.length ? (
            items.map((item) => (
              <Box key={`${slotKey}-${item}`} sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: "rgba(47,125,214,0.08)", color: "#1e2d4a", fontSize: 12 }}>
                {item}
              </Box>
            ))
          ) : (
            <Typography variant="body2" sx={{ color: "#30415d" }}>
              Navigation, filters, and contextual tools can live here.
            </Typography>
          )}
        </Stack>
      </Stack>
    );
  }

  if (config.type === "linksRow" || config.type === "socialLinks") {
    return (
      <Stack gap={1}>
        <Typography sx={{ fontWeight: 900, color: "#16233b" }}>{title || "Footer"}</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {items.length ? items.map((item) => <Chip key={`${slotKey}-${item}`} size="small" label={item} sx={{ bgcolor: "#fff", border: "1px solid #dfe6f2" }} />) : null}
        </Stack>
        <Typography variant="body2" sx={{ color: "#30415d" }}>
          Copyright, support links, and compliance text can live here.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack gap={0.75}>
      <Typography sx={{ fontWeight: 900, color: "#16233b" }}>{title || slotKey}</Typography>
      <Typography variant="body2" sx={{ color: "#30415d", whiteSpace: "pre-wrap" }}>
        {content || "Placeholder content"}
      </Typography>
    </Stack>
  );
};

const AppShell = ({ page, theme, children, showEditorChrome = true, onShellSlotOptions }) => {
  const shell = page?.shell || {};
  const pageMeta = page?.pageMeta || {};
  const colors = theme?.colors || {};
  const shellPadding = Number(shell.shellPadding) || 0;
  const contentWidth = String(shell.contentWidth || "full").toLowerCase();
  const contentMaxWidth = Number(shell.contentMaxWidth) || 1200;
  const shouldCenterContent = contentWidth === "centered" && !shell.showLeftMenu && !shell.showRightMenu;
  const effectiveContentMaxWidth = contentMaxWidth;
  const pageWidth = clampInt(shell.pageWidth ?? shell.header?.pageWidth ?? 100, 20, 100);
  const headerWidth = clampInt(shell.header?.width ?? pageWidth, 20, 100);
  const effectiveShellWidth = Math.min(pageWidth, headerWidth);
  const showTopNavbar = isVisible(shell.showTopNavbar, shell.topNavbar);
  const showHeader = isVisible(shell.showHeader, shell.header);
  const showFooter = isVisible(shell.showFooter, shell.footer);
  const showBottomBar = isVisible(shell.showBottomBar, shell.bottomBar);
  const showLeftMenu = isVisible(shell.showLeftMenu, shell.leftMenu);
  const showRightMenu = isVisible(shell.showRightMenu, shell.rightMenu);

  return (
      <Paper
        elevation={0}
        sx={{
          width: `${effectiveShellWidth}%`,
          maxWidth: "100%",
          mx: "auto",
          bgcolor: colors.background || "#f7f9fc",
          border: "1px solid #d7deea",
          borderRadius: 4,
        overflow: "hidden",
        boxShadow: theme?.effects?.shadow || "0 18px 40px rgba(29, 62, 120, 0.08)",
      }}
    >
      {showTopNavbar ? (
        <Box
          sx={{
            p: "10px",
            borderBottom: "1px solid #d7deea",
            background: `linear-gradient(135deg, ${colors.primary || "#1f5fd1"} 0%, ${colors.accent || "#4f87ff"} 100%)`,
            color: "#fff",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
            <Stack spacing={0.35}>
              <Typography sx={{ fontWeight: 900, letterSpacing: -0.4, fontSize: 18 }}>
                {shell.topNavbar?.logoText || shell.brandName || theme?.brandName || pageMeta.name || "Augmis"}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.88)" }}>
                {shell.topNavbar?.tagline || shell.tagline || theme?.tagline || "Manage Information Effortlessly"}
              </Typography>
            </Stack>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ alignItems: "center" }}>
              <Chip size="small" label={pageMeta.style || "modern"} sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff" }} />
              <Chip size="small" label={pageMeta.tone || "professional"} sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff" }} />
            </Stack>
          </Stack>
        </Box>
      ) : null}

      {showHeader ? (
        <Box sx={{ p: 0, borderBottom: "1px solid #d7deea", bgcolor: "#fff", position: "relative" }}>
          {renderSlotBody("header", shell, pageMeta, theme)}
          {showEditorChrome ? (
            <Box sx={{ position: "absolute", top: 5, right: 5 }}>
              <Tooltip title="Header options">
                <IconButton
                  size="small"
                  aria-label="Header options"
                  onClick={() => onShellSlotOptions?.("header")}
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: "rgba(255,255,255,0.98)",
                    border: "1px solid #9fbaf4",
                    boxShadow: "0 1px 4px rgba(16, 24, 40, 0.18)",
                    "&:hover": { bgcolor: "#ffffff", borderColor: "#2f7dd6" },
                  }}
                >
                  <MoreVertIcon sx={{ fontSize: 15, color: "#2f7dd6" }} />
                </IconButton>
              </Tooltip>
            </Box>
          ) : null}
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            showLeftMenu && showRightMenu
              ? "240px minmax(0, 1fr) 240px"
              : showLeftMenu
                ? "240px minmax(0, 1fr)"
                : showRightMenu
                  ? "minmax(0, 1fr) 240px"
                  : "1fr",
          minHeight: 0,
          background: colors.background || "#f7f9fc",
        }}
      >
        {showLeftMenu ? (
          <Box sx={{ p: 1.25, borderRight: "1px solid #d7deea", bgcolor: colors.surfaceMuted || "#f3f7fd", position: "relative" }}>
            <Stack gap={1.25}>
              {renderSlotBody("leftMenu", shell, pageMeta, theme)}
            </Stack>
            {showEditorChrome ? (
              <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                <Tooltip title="Left menu options">
                  <IconButton
                    size="small"
                    aria-label="Left menu options"
                    onClick={() => onShellSlotOptions?.("leftMenu")}
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: "rgba(255,255,255,0.98)",
                      border: "1px solid #9fbaf4",
                      boxShadow: "0 1px 4px rgba(16, 24, 40, 0.18)",
                      "&:hover": { bgcolor: "#ffffff", borderColor: "#2f7dd6" },
                    }}
                  >
                    <MoreVertIcon sx={{ fontSize: 15, color: "#2f7dd6" }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : null}
          </Box>
        ) : null}

        <Box
          sx={{
              minWidth: 0,
              p: "10px",
            }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: shouldCenterContent ? effectiveContentMaxWidth : "none",
              mx: shouldCenterContent ? "auto" : 0,
            }}
          >
            {children}
          </Box>
        </Box>

        {showRightMenu ? (
          <Box sx={{ p: 1.25, borderLeft: "1px solid #d7deea", bgcolor: colors.surfaceMuted || "#f3f7fd", position: "relative" }}>
            <Stack gap={1.25}>
              {renderSlotBody("rightMenu", shell, pageMeta, theme)}
            </Stack>
            {showEditorChrome ? (
              <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                <Tooltip title="Right menu options">
                  <IconButton
                    size="small"
                    aria-label="Right menu options"
                    onClick={() => onShellSlotOptions?.("rightMenu")}
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: "rgba(255,255,255,0.98)",
                      border: "1px solid #9fbaf4",
                      boxShadow: "0 1px 4px rgba(16, 24, 40, 0.18)",
                      "&:hover": { bgcolor: "#ffffff", borderColor: "#2f7dd6" },
                    }}
                  >
                    <MoreVertIcon sx={{ fontSize: 15, color: "#2f7dd6" }} />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>

      {showFooter ? (
        <Box sx={{ p: "10px", borderTop: "1px solid #d7deea", bgcolor: "#fff", position: "relative" }}>
          {renderSlotBody("footer", shell, pageMeta, theme)}
          {showEditorChrome ? (
            <Box sx={{ position: "absolute", top: 6, right: 8 }}>
              <Tooltip title="Footer options">
                <IconButton
                  size="small"
                  aria-label="Footer options"
                  onClick={() => onShellSlotOptions?.("footer")}
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: "rgba(255,255,255,0.98)",
                    border: "1px solid #9fbaf4",
                    boxShadow: "0 1px 4px rgba(16, 24, 40, 0.18)",
                    "&:hover": { bgcolor: "#ffffff", borderColor: "#2f7dd6" },
                  }}
                >
                  <MoreVertIcon sx={{ fontSize: 15, color: "#2f7dd6" }} />
                </IconButton>
              </Tooltip>
            </Box>
          ) : null}
        </Box>
      ) : null}

      {showBottomBar ? (
        <Box sx={{ p: "10px", borderTop: "1px solid #d7deea", bgcolor: colors.surfaceMuted || "#f3f7fd" }}>
          <Typography variant="caption" sx={{ color: "#5f6f8a" }}>
            {shell.bottomBar?.label || "Bottom bar"}
          </Typography>
        </Box>
      ) : null}

     {null}
    </Paper>
  );
};

export default AppShell;
