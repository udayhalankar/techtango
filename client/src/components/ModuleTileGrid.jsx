import React, { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

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
  containerMaxWidth = "lg",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const gridConfig = useMemo(() => normalizeTilesPerRow(tilesPerRow), [tilesPerRow]);

  const filteredTiles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tiles;
    return tiles.filter((tile) =>
      `${tile.label || ""} ${tile.desc || ""}`.toLowerCase().includes(query)
    );
  }, [searchTerm, tiles]);

  const maxVisibleTiles = maxRows ? gridConfig.lg * maxRows : null;
  const visibleTiles = maxVisibleTiles ? filteredTiles.slice(0, maxVisibleTiles) : filteredTiles;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: pageBackground }}>
      <Box sx={{ bgcolor: titleBarColor, color: "#fff", px: 4, mt: "-65px", pt: "97px", pb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body1" sx={{ mt: 1, maxWidth: 900, color: "#e6edf7" }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      <Container maxWidth={containerMaxWidth} sx={{ py: 4 }}>
        <Box
          sx={{
            mt: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: searchEnabled ? "space-between" : "flex-start",
            gap: 2,
            flexWrap: "wrap",
            mb: 2,
          }}
        >
          <Box />
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
            return (
              <Paper
                key={tile.to || tile.label}
                component={RouterLink}
                to={tile.to}
                elevation={0}
                sx={{
                  bgcolor: "#ffffff",
                  color: "#1f355d",
                  border: "1px solid #2f5fff",
                  boxShadow: "0 4px 10px rgba(16, 24, 40, 0.16)",
                  borderRadius: 2,
                  p: 2,
                  minHeight: 160,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 1.5,
                  textDecoration: "none",
                  transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 10px 18px rgba(16, 24, 40, 0.22)",
                    borderColor: "#1a4fd8",
                  },
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.1 }}>
                  {Icon ? (
                    <Box sx={{ color: "#1a4fd8", display: "flex", alignItems: "center" }}>
                      <Icon fontSize="small" />
                    </Box>
                  ) : null}
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: "#1a4fd8",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    {tile.label}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#51607d" }}>
                    {tile.desc}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#1a4fd8" }}>
                  Open
                </Typography>
              </Paper>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}
