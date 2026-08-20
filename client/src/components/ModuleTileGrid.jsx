// Take permission before making any changes to this code.

import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

function normalizeTilesPerRow(tilesPerRow = {}) {
  return {
    xs: tilesPerRow.xs || 1,
    sm: tilesPerRow.sm || tilesPerRow.xs || 2,
    md: tilesPerRow.md || tilesPerRow.sm || 4,
    lg: tilesPerRow.lg || tilesPerRow.md || 4,
  };
}

export default function ModuleTileGrid({
  title,
  subtitle = "",
  titleBarColor = "#1f355d",
  pageBackground = "#f5f7fb",
  tiles = [],
  tilesPerRow,
  maxRows,
  searchEnabled = false,
  searchPlaceholder = "Search modules",
  containerMaxWidth = "xl",
  titleBarActions,
  titleBarTabs,
  controls,
  renderTile,
  tileVariant = "default",
  tileHeight = 180,
  showDefaultFooter = true,
  children,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const gridConfig = useMemo(() => normalizeTilesPerRow(tilesPerRow), [tilesPerRow]);

  const filteredTiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tiles;
    return tiles.filter((tile) =>
      `${tile.label || ""} ${tile.desc || ""}`.toLowerCase().includes(query)
    );
  }, [searchTerm, tiles]);

  const pageSize = maxRows ? gridConfig.lg * maxRows : filteredTiles.length || 1;
  const pageCount = Math.max(1, Math.ceil(filteredTiles.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const visibleTiles = filteredTiles.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);
  const showPaging = pageCount > 1;

  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (pageIndex !== safePageIndex) {
      setPageIndex(safePageIndex);
    }
  }, [pageIndex, safePageIndex]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: pageBackground }}>
      <Box
        sx={{
          background: `linear-gradient(135deg, ${titleBarColor} 0%, #315f9a 100%)`,
          color: "#fff",
          px: 4,
          mt: "-65px",
          pt: "97px",
          pb: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: titleBarTabs?.length ? "flex-end" : "center" },
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {titleBarTabs?.length ? (
            <Box
              sx={{
                display: "inline-flex",
                border: "1px solid rgba(255,255,255,0.75)",
                borderRadius: 2,
                overflow: "hidden",
                backgroundColor: "#ffffff",
                boxShadow: "0 8px 18px rgba(10, 24, 52, 0.16)",
                flex: "0 0 auto",
              }}
            >
              {titleBarTabs.map((tab) => (
                <Box
                  key={tab.key || tab.label}
                  component="button"
                  type="button"
                  onClick={tab.onClick}
                  sx={{
                    px: 3,
                    py: 1.2,
                    border: 0,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    color: tab.active ? "#ffffff" : "#0f172a",
                    backgroundColor: tab.active ? "#1f80f0" : "#ffffff",
                    minWidth: 112,
                    transition: "background-color 160ms ease, color 160ms ease",
                    "&:hover": {
                      backgroundColor: tab.active ? "#1b6fd2" : "#f3f7ff",
                    },
                  }}
                >
                  {tab.label}
                </Box>
              ))}
            </Box>
          ) : titleBarActions ? <Box sx={{ flex: "0 0 auto" }}>{titleBarActions}</Box> : null}
        </Box>
      </Box>

      <Container maxWidth={containerMaxWidth} sx={{ py: 4 }}>
        <Box
          sx={{
            mt: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: controls || searchEnabled ? "space-between" : "flex-end",
            gap: 2,
            flexWrap: "wrap",
            mb: 2,
          }}
        >
          {controls ? <Box sx={{ flex: "1 1 auto" }}>{controls}</Box> : <Box />}
          {searchEnabled ? (
            <TextField
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder}
              size="small"
              sx={{
                width: { xs: "100%", sm: 320 },
                bgcolor: "#fff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#7b8aa1" }} />
                  </InputAdornment>
                ),
              }}
            />
          ) : null}
        </Box>

        {children ? (
          children
        ) : (
          <Box
            sx={{
              position: "relative",
              overflow: "visible",
            }}
          >
            {showPaging ? (
              <IconButton
                aria-label="Previous tiles"
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                disabled={safePageIndex === 0}
                sx={{
                  position: "absolute",
                  left: { md: -48, lg: -64 },
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  color: "#b8c2d4",
                  backgroundColor: "transparent",
                  "&:hover": { backgroundColor: "transparent", color: "#94a3b8" },
                  "&.Mui-disabled": { color: "#d7dee9" },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
            ) : null}

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: `repeat(${gridConfig.xs}, minmax(0, 1fr))`,
                  sm: `repeat(${gridConfig.sm}, minmax(0, 1fr))`,
                  md: `repeat(${gridConfig.md}, minmax(0, 1fr))`,
                  lg: `repeat(${gridConfig.lg}, minmax(0, 1fr))`,
                },
              }}
            >
            {visibleTiles.map((tile) => {
              const Icon = tile.Icon;
              const iconColor = tile.iconColor || "#1a4fd8";
              const tileActionable = Boolean(tile.to || tile.onClick);
              const tileComponent = tile.to ? RouterLink : tile.onClick ? "button" : "div";
              if (renderTile) {
                return (
                  <React.Fragment key={tile.id || tile.to || tile.label}>
                    {renderTile(tile)}
                  </React.Fragment>
                );
              }
              return (
                <Paper
                  key={tile.id || tile.to || tile.label}
                  component={tileComponent}
                  to={tile.to || undefined}
                  onClick={tile.onClick || undefined}
                  type={tile.onClick ? "button" : undefined}
                  elevation={0}
                  sx={{
                    bgcolor: tile.tileBackgroundColor || "#ffffff",
                    color: "#1f355d",
                    border: "1px solid #2f5fff",
                    boxShadow: "0 4px 10px rgba(16, 24, 40, 0.16)",
                    borderRadius: 2,
                    p: 2,
                    height: tileHeight,
                    minHeight: tileHeight,
                    maxHeight: tileHeight,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 1.5,
                    textDecoration: "none",
                    textAlign: "left",
                    overflow: "hidden",
                    cursor: tileActionable ? "pointer" : "default",
                    transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                    "&:hover": tileActionable
                      ? {
                          transform: "translateY(-4px)",
                          boxShadow: "0 10px 18px rgba(16, 24, 40, 0.22)",
                          borderColor: "#1a4fd8",
                        }
                      : undefined,
                  }}
                >
                  {tileVariant === "approval" ? (
                    <>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PersonOutlineIcon sx={{ color: "#6b46c1", fontSize: 26, flex: "0 0 auto" }} />
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: 15,
                              color: "#0f172a",
                              display: "-webkit-box",
                              overflow: "hidden",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 1,
                            }}
                          >
                            {tile.headerLabel}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                              fontWeight: 500,
                              fontSize: 16,
                              color: "#0f172a",
                              display: "-webkit-box",
                              overflow: "hidden",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 2,
                              minHeight: 44,
                          }}
                        >
                          {tile.label}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#334155" }}>
                          Date Assigned: {tile.assignedDate}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                          gap: 1,
                          mt: 0.2,
                        }}
                      >
                        <Typography sx={{ fontSize: 12, color: "#334155" }}>
                          Due Date: {tile.dueDate}
                        </Typography>
                        {tile.statusBadge ? (
                          <Box
                            sx={{
                              px: 1.2,
                              py: 0.45,
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              color: tile.statusBadge.color,
                              bgcolor: tile.statusBadge.backgroundColor,
                              flex: "0 0 auto",
                            }}
                          >
                            {tile.statusBadge.text}
                          </Box>
                        ) : null}
                      </Box>
                    </>
                  ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.1, minHeight: 0 }}>
                    {Icon ? (
                        <Box sx={{ color: iconColor, display: "flex", alignItems: "center", flex: "0 0 auto" }}>
                          <Icon fontSize="small" />
                        </Box>
                      ) : null}
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: 16,
                          color: "#1a4fd8",
                          textDecoration: "none",
                          display: "-webkit-box",
                          overflow: "hidden",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                        }}
                      >
                        {tile.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: "#51607d",
                          display: "-webkit-box",
                          overflow: "hidden",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 4,
                        }}
                      >
                        {tile.desc}
                      </Typography>
                  </Box>
                  )}
                  {tileVariant !== "approval" && showDefaultFooter ? (
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#1a4fd8", flex: "0 0 auto" }}>
                      Open
                    </Typography>
                  ) : null}
                </Paper>
                );
              })}
            </Box>

            {showPaging ? (
              <IconButton
                aria-label="Next tiles"
                onClick={() => setPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
                disabled={safePageIndex >= pageCount - 1}
                sx={{
                  position: "absolute",
                  right: { md: -48, lg: -64 },
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  color: "#b8c2d4",
                  backgroundColor: "transparent",
                  "&:hover": { backgroundColor: "transparent", color: "#94a3b8" },
                  "&.Mui-disabled": { color: "#d7dee9" },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            ) : null}
          </Box>
        )}
      </Container>
    </Box>
  );
}
