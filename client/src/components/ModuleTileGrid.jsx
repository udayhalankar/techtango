import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import {
  Box,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";

import { useTheme } from "@mui/material/styles";

import SearchIcon from "@mui/icons-material/Search";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";

/* =============================================================================
   SHARED AUGMIS MODULE GRID DESIGN
============================================================================= */

const MODULE_GRID_DESIGN = {
  pageBackground: "#f5f6f7",

  bannerStart: "#344f67",
  bannerMiddle: "#314a62",
  bannerEnd: "#496178",

  maxWidth: "1500px",

  contentWidth: {
    xs: "96%",
    sm: "94%",
    md: "92%",
    lg: "90%",
    xl: "88%",
  },

  tileHeight: 176,

  columns: {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
  },

  rowsPerPage: 2,

  tileGap: 1.5,

  tileRadius: "6px",
  panelRadius: "6px",
};

/* =============================================================================
   MAIN
============================================================================= */

export default function ModuleTileGrid({
  title,
  subtitle = "",

  tiles = [],

  searchEnabled = true,
  searchPlaceholder = "Search",

  titleBarActions,
  titleBarTabs,

  primaryAction,
  controls,
  rightControls,

  renderTile,

  /*
    renderTileContent keeps the OUTER shared tile,
    but allows a page to provide special content inside it.
  */
  renderTileContent,

  tileVariant = "default",

  showDefaultFooter = true,

  children,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const theme = useTheme();

  const isLg = useMediaQuery(
    theme.breakpoints.up("lg")
  );

  const isMd = useMediaQuery(
    theme.breakpoints.between("md", "lg")
  );

  const isSm = useMediaQuery(
    theme.breakpoints.between("sm", "md")
  );

  const currentColumns = isLg
    ? MODULE_GRID_DESIGN.columns.lg
    : isMd
      ? MODULE_GRID_DESIGN.columns.md
      : isSm
        ? MODULE_GRID_DESIGN.columns.sm
        : MODULE_GRID_DESIGN.columns.xs;

  /* ===========================================================================
     SEARCH
  =========================================================================== */

  const filteredTiles = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    if (!query) {
      return tiles;
    }

    return tiles.filter((tile) =>
      [
        tile.label,
        tile.desc,
        tile.headerLabel,
        tile.searchText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [tiles, searchTerm]);

  /* ===========================================================================
     PAGING
     2 ROWS ON EVERY BREAKPOINT
  =========================================================================== */

  const pageSize =
    currentColumns *
    MODULE_GRID_DESIGN.rowsPerPage;

  const pageCount = Math.max(
    1,
    Math.ceil(
      filteredTiles.length /
        pageSize
    )
  );

  const safePageIndex = Math.min(
    pageIndex,
    pageCount - 1
  );

  const visibleTiles =
    filteredTiles.slice(
      safePageIndex * pageSize,
      (safePageIndex + 1) *
        pageSize
    );

  const showPaging =
    pageCount > 1;

  useEffect(() => {
    setPageIndex(0);
  }, [
    searchTerm,
    tiles.length,
    currentColumns,
  ]);

  useEffect(() => {
    if (
      pageIndex !==
      safePageIndex
    ) {
      setPageIndex(
        safePageIndex
      );
    }
  }, [
    pageIndex,
    safePageIndex,
  ]);

  /* ===========================================================================
     RENDER
  =========================================================================== */

  return (
    <Box
      sx={{
        minHeight: "100vh",

        bgcolor:
          MODULE_GRID_DESIGN.pageBackground,

        color: "#223548",

        pb: 7,
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          width:
            MODULE_GRID_DESIGN.contentWidth,

          maxWidth:
            MODULE_GRID_DESIGN.maxWidth,

          mx: "auto",

          pt: 3,
          pb: 4,
        }}
      >
        {/* ================================================================ */}
        {/* BANNER */}
        {/* ================================================================ */}

        <Paper
          elevation={0}
          sx={{
            minHeight: {
              xs: 120,
              md: 118,
            },

            borderRadius:
              MODULE_GRID_DESIGN.panelRadius,

            px: {
              xs: 2.5,
              md: 4,
            },

            py: {
              xs: 2.5,
              md: 2.7,
            },

            display: "flex",
            alignItems: "center",

            position: "relative",
            overflow: "hidden",

            color: "#ffffff",

            background: `linear-gradient(
              105deg,
              ${MODULE_GRID_DESIGN.bannerStart} 0%,
              ${MODULE_GRID_DESIGN.bannerMiddle} 58%,
              ${MODULE_GRID_DESIGN.bannerEnd} 100%
            )`,

            mb: 2.5,

            "&::before": {
              content: '""',

              position:
                "absolute",

              right: 100,

              bottom: -115,

              width: 300,
              height: 230,

              borderRadius:
                "50%",

              bgcolor:
                "rgba(255,255,255,.055)",

              pointerEvents:
                "none",
            },

            "&::after": {
              content: '""',

              position:
                "absolute",

              right: -55,

              top: -100,

              width: 330,
              height: 260,

              borderRadius:
                "50%",

              bgcolor:
                "rgba(255,255,255,.065)",

              pointerEvents:
                "none",
            },
          }}
        >
          <Stack
            direction={{
              xs: "column",
              md: "row",
            }}
            alignItems={{
              xs: "flex-start",
              md: "center",
            }}
            justifyContent="space-between"
            spacing={2}
            sx={{
              width: "100%",

              position: "relative",

              zIndex: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 11.5,

                  color:
                    "rgba(255,255,255,.72)",

                  mb: 0.45,

                  fontWeight: 500,
                }}
              >
                AUGMIS Digital Workplace
              </Typography>

              <Typography
                sx={{
                  fontSize: {
                    xs: 23,
                    md: 27,
                  },

                  lineHeight: 1.2,

                  fontWeight: 700,

                  letterSpacing:
                    "-0.01em",
                }}
              >
                {title}
              </Typography>

              {subtitle ? (
                <Typography
                  sx={{
                    mt: 0.7,

                    maxWidth: 850,

                    color:
                      "rgba(255,255,255,.78)",

                    fontSize: 12.5,

                    lineHeight: 1.55,
                  }}
                >
                  {subtitle}
                </Typography>
              ) : null}
            </Box>

            {titleBarTabs?.length ? (
              <Box
                sx={{
                  display:
                    "inline-flex",

                  alignItems:
                    "center",

                  p: "4px",

                  borderRadius:
                    "5px",

                  bgcolor:
                    "rgba(255,255,255,.12)",

                  border:
                    "1px solid rgba(255,255,255,.18)",

                  flex:
                    "0 0 auto",
                }}
              >
                {titleBarTabs.map(
                  (tab) => (
                    <Box
                      key={
                        tab.key ||
                        tab.label
                      }
                      component="button"
                      type="button"
                      onClick={
                        tab.onClick
                      }
                      sx={{
                        minWidth:
                          88,

                        px: 2,
                        py: 0.9,

                        border: 0,

                        borderRadius:
                          "6px",

                        cursor:
                          "pointer",

                        fontFamily:
                          "inherit",

                        fontSize:
                          11.5,

                        fontWeight:
                          700,

                        color:
                          tab.active
                            ? "#223548"
                            : "rgba(255,255,255,.88)",

                        bgcolor:
                          tab.active
                            ? "#ffffff"
                            : "transparent",

                        boxShadow:
                          tab.active
                            ? "0 3px 8px rgba(10,24,52,.12)"
                            : "none",

                        "&:hover": {
                          bgcolor:
                            tab.active
                              ? "#ffffff"
                              : "rgba(255,255,255,.10)",
                        },
                      }}
                    >
                      {tab.label}
                    </Box>
                  )
                )}
              </Box>
            ) : titleBarActions ? (
              <Box>
                {titleBarActions}
              </Box>
            ) : null}
          </Stack>
        </Paper>

        {/* ================================================================ */}
        {/* WHITE CONTENT PANEL */}
        {/* ================================================================ */}

        <Paper
          elevation={0}
          sx={{
            border:
              "1px solid #e1e5e9",

            borderRadius:
              MODULE_GRID_DESIGN.panelRadius,

            bgcolor: "#ffffff",

            p: {
              xs: 2,
              md: 2.5,
            },
          }}
        >
          {/* ============================================================= */}
          {/* CONTROL BAR */}
          {/* ============================================================= */}

          {(primaryAction ||
            controls ||
            searchEnabled ||
            rightControls) && (
            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              alignItems={{
                xs: "stretch",
                sm: "center",
              }}
              justifyContent="space-between"
              spacing={2}
              sx={{
                mb: 2,

                pb: 1.8,

                borderBottom:
                  "1px solid #edf0f3",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  flex: "1 1 auto",
                }}
              >
                {primaryAction ? (
                  <Box
                    component="button"
                    type="button"
                    onClick={
                      primaryAction.onClick
                    }
                    sx={{
                      height: 36,

                      px: 2,

                      border: 0,

                      borderRadius:
                        "7px",

                      bgcolor:
                        "#0a6ed1",

                      color:
                        "#ffffff",

                      fontFamily:
                        "inherit",

                      fontSize: 12,

                      fontWeight:
                        700,

                      cursor:
                        "pointer",

                      boxShadow:
                        "0 3px 8px rgba(10,110,209,.18)",

                      "&:hover": {
                        bgcolor:
                          "#095caf",
                      },
                    }}
                  >
                    {
                      primaryAction.label
                    }
                  </Box>
                ) : null}

                {controls || null}
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  flex: "0 0 auto",
                }}
              >
                {searchEnabled ? (
                  <TextField
                    value={
                      searchTerm
                    }
                    onChange={(
                      event
                    ) =>
                      setSearchTerm(
                        event.target
                          .value
                      )
                    }
                    placeholder={
                      searchPlaceholder
                    }
                    size="small"
                    sx={{
                      width: {
                        xs: "100%",
                        sm: 290,
                      },

                      "& .MuiOutlinedInput-root":
                        {
                          height: 36,

                          borderRadius:
                            "18px",

                          bgcolor:
                            "#ffffff",

                          fontSize: 12,

                          "& fieldset":
                            {
                              borderColor:
                                "#d6dde5",
                            },

                          "&:hover fieldset":
                            {
                              borderColor:
                                "#aebcca",
                            },

                          "&.Mui-focused fieldset":
                            {
                              borderColor:
                                "#728eaa",

                              borderWidth:
                                "1px",
                            },
                        },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon
                            sx={{
                              color:
                                "#708295",

                              fontSize:
                                17,
                            }}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                ) : null}

                {rightControls ||
                  null}
              </Stack>
            </Stack>
          )}

          {/* ============================================================= */}
          {/* CUSTOM CHILDREN */}
          {/* ============================================================= */}

          {children ? (
            children
          ) : (
            <Box
              sx={{
                position:
                  "relative",

                overflow:
                  "visible",
              }}
            >
              {/* LEFT */}

              {showPaging ? (
                <IconButton
                  aria-label="Previous page"
                  onClick={() =>
                    setPageIndex(
                      (prev) =>
                        Math.max(
                          0,
                          prev - 1
                        )
                    )
                  }
                  disabled={
                    safePageIndex ===
                    0
                  }
                  sx={{
                    position:
                      "absolute",

                    left: {
                      xs: -18,
                      sm: -22,
                      md: -28,
                    },

                    top: "50%",

                    transform:
                      "translateY(-50%)",

                    zIndex: 5,

                    width: 38,
                    height: 38,

                    bgcolor:
                      "#ffffff",

                    border:
                      "1px solid #d7dfe8",

                    boxShadow:
                      "0 4px 12px rgba(30,50,75,.10)",

                    color:
                      "#0a6ed1",

                    "&:hover": {
                      bgcolor:
                        "#f4f8fc",
                    },

                    "&.Mui-disabled":
                      {
                        opacity:
                          0.25,

                        bgcolor:
                          "#ffffff",
                      },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>
              ) : null}

              {/* GRID */}

              <Box
                sx={{
                  display: "grid",

                  gap:
                    MODULE_GRID_DESIGN.tileGap,

                  gridTemplateColumns:
                    {
                      xs: `repeat(${MODULE_GRID_DESIGN.columns.xs}, minmax(0, 1fr))`,

                      sm: `repeat(${MODULE_GRID_DESIGN.columns.sm}, minmax(0, 1fr))`,

                      md: `repeat(${MODULE_GRID_DESIGN.columns.md}, minmax(0, 1fr))`,

                      lg: `repeat(${MODULE_GRID_DESIGN.columns.lg}, minmax(0, 1fr))`,
                    },
                }}
              >
                {visibleTiles.map(
                  (tile) => {
                    const Icon =
                      tile.Icon;

                    const iconColor =
                      tile.iconColor ||
                      "#0a6ed1";

                    const actionable =
                      Boolean(
                        tile.to ||
                          tile.onClick
                      );

                    const component =
                      tile.to
                        ? RouterLink
                        : tile.onClick
                          ? "button"
                          : "div";

                    /*
                      renderTile deliberately
                      remains supported for
                      older pages.
                    */

                    if (renderTile) {
                      return (
                        <React.Fragment
                          key={
                            tile.id ||
                            tile.to ||
                            tile.label
                          }
                        >
                          {renderTile(
                            tile
                          )}
                        </React.Fragment>
                      );
                    }

                    return (
                      <Paper
                        key={
                          tile.id ||
                          tile.to ||
                          tile.label
                        }
                        component={
                          component
                        }
                        to={
                          tile.to ||
                          undefined
                        }
                        onClick={
                          tile.onClick ||
                          undefined
                        }
                        type={
                          tile.onClick
                            ? "button"
                            : undefined
                        }
                        elevation={0}
                        sx={{
                          position:
                            "relative",

                          bgcolor:
                            "#ffffff",

                          border:
                            "1px solid #dce2e8",

                          borderRadius:
                            MODULE_GRID_DESIGN.tileRadius,

                          p:
                            tileVariant ===
                            "approval"
                              ? 1.7
                              : 1.6,

                          height:
                            MODULE_GRID_DESIGN.tileHeight,

                          minHeight:
                            MODULE_GRID_DESIGN.tileHeight,

                          maxHeight:
                            MODULE_GRID_DESIGN.tileHeight,

                          width:
                            "100%",

                          display:
                            "flex",

                          flexDirection:
                            "column",

                          textDecoration:
                            "none",

                          textAlign:
                            "left",

                          fontFamily:
                            "inherit",

                          overflow:
                            "hidden",

                          cursor:
                            actionable
                              ? "pointer"
                              : "default",

                          boxShadow:
                            "0 2px 5px rgba(28,45,65,.04)",

                          transition:
                            "transform .16s ease, box-shadow .16s ease, border-color .16s ease",

                          "&:hover":
                            actionable
                              ? {
                                  transform:
                                    "translateY(-2px)",

                                  boxShadow:
                                    "0 8px 18px rgba(28,45,65,.10)",

                                  borderColor:
                                    "#8fb0d0",
                                }
                              : undefined,
                        }}
                      >
                        {renderTileContent ? (
                          renderTileContent(
                            tile
                          )
                        ) : tileVariant ===
                          "approval" ? (
                          <AssignmentTile
                            tile={
                              tile
                            }
                          />
                        ) : (
                          <DefaultTile
                            tile={
                              tile
                            }
                            Icon={
                              Icon
                            }
                            iconColor={
                              iconColor
                            }
                            tileActionable={
                              actionable
                            }
                            showDefaultFooter={
                              showDefaultFooter
                            }
                          />
                        )}
                      </Paper>
                    );
                  }
                )}
              </Box>

              {/* RIGHT */}

              {showPaging ? (
                <IconButton
                  aria-label="Next page"
                  onClick={() =>
                    setPageIndex(
                      (prev) =>
                        Math.min(
                          pageCount -
                            1,

                          prev + 1
                        )
                    )
                  }
                  disabled={
                    safePageIndex >=
                    pageCount - 1
                  }
                  sx={{
                    position:
                      "absolute",

                    right: {
                      xs: -18,
                      sm: -22,
                      md: -28,
                    },

                    top: "50%",

                    transform:
                      "translateY(-50%)",

                    zIndex: 5,

                    width: 38,
                    height: 38,

                    bgcolor:
                      "#ffffff",

                    border:
                      "1px solid #d7dfe8",

                    boxShadow:
                      "0 4px 12px rgba(30,50,75,.10)",

                    color:
                      "#0a6ed1",

                    "&:hover": {
                      bgcolor:
                        "#f4f8fc",
                    },

                    "&.Mui-disabled":
                      {
                        opacity:
                          0.25,

                        bgcolor:
                          "#ffffff",
                      },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              ) : null}
            </Box>
          )}

          {/* ============================================================= */}
          {/* PAGE DOTS */}
          {/* ============================================================= */}

          {!children &&
          showPaging ? (
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              spacing={0.7}
              sx={{ mt: 2.2 }}
            >
              {Array.from({
                length:
                  pageCount,
              }).map(
                (_, index) => (
                  <Box
                    key={index}
                    sx={{
                      width:
                        index ===
                        safePageIndex
                          ? 18
                          : 6,

                      height: 6,

                      borderRadius:
                        999,

                      bgcolor:
                        index ===
                        safePageIndex
                          ? "#6988a7"
                          : "#d6dde5",

                      transition:
                        "all .16s ease",
                    }}
                  />
                )
              )}
            </Stack>
          ) : null}
        </Paper>
      </Container>
    </Box>
  );
}

/* =============================================================================
   DEFAULT TILE
============================================================================= */

function DefaultTile({
  tile,
  Icon,
  iconColor,
  tileActionable,
  showDefaultFooter,
}) {
  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        {Icon ? (
          <Box
            sx={{
              width: 34,
              height: 34,

              borderRadius:
                "8px",

              display:
                "grid",

              placeItems:
                "center",

              bgcolor:
                `${iconColor}12`,

              color:
                iconColor,
            }}
          >
            <Icon
              sx={{
                fontSize: 19,
              }}
            />
          </Box>
        ) : (
          <Box />
        )}

        {tileActionable ? (
          <ArrowForwardIosIcon
            sx={{
              color:
                "#9aa8b7",

              fontSize: 11,

              mt: 0.8,
            }}
          />
        ) : null}
      </Stack>

      <Box
        sx={{
          mt: 1.2,
          minHeight: 0,
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,

            fontSize: 14,

            lineHeight: 1.3,

            color: "#223548",

            display:
              "-webkit-box",

            overflow:
              "hidden",

            WebkitBoxOrient:
              "vertical",

            WebkitLineClamp:
              2,
          }}
        >
          {tile.label}
        </Typography>

        {tile.desc ? (
          <Typography
            sx={{
              mt: 0.45,

              fontSize: 11.5,

              lineHeight: 1.45,

              color: "#6b7d8f",

              display:
                "-webkit-box",

              overflow:
                "hidden",

              WebkitBoxOrient:
                "vertical",

              WebkitLineClamp:
                3,
            }}
          >
            {tile.desc}
          </Typography>
        ) : null}
      </Box>

      <Box
        sx={{
          flexGrow: 1,
        }}
      />

      {showDefaultFooter ? (
        <Typography
          sx={{
            fontSize: 10.8,

            fontWeight: 700,

            color: "#0a6ed1",
          }}
        >
          Open application
        </Typography>
      ) : null}
    </>
  );
}

/* =============================================================================
   ASSIGNMENT TILE
============================================================================= */

function AssignmentTile({
  tile,
}) {
  const status = String(
    tile.statusBadge?.text ||
      tile.status ||
      ""
  ).toLowerCase();

  const isClosed =
    status === "closed" ||
    status === "completed";

  const isRejected =
    status === "rejected";

  const isProgress =
    status === "in-progress" ||
    status === "in progress";

  const statusColor =
    isClosed
      ? "#17875b"
      : isRejected
        ? "#b42318"
        : isProgress
          ? "#0a6ed1"
          : "#9a6700";

  const statusBackground =
    isClosed
      ? "#eaf7f0"
      : isRejected
        ? "#fdf0ef"
        : isProgress
          ? "#eaf3fc"
          : "#fff6df";

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 31,
              height: 31,

              borderRadius:
                "8px",

              bgcolor:
                "#f1edfb",

              color:
                "#6b46c1",

              display:
                "grid",

              placeItems:
                "center",

              flex:
                "0 0 auto",
            }}
          >
            <PersonOutlineIcon
              sx={{
                fontSize: 18,
              }}
            />
          </Box>

          <Typography
            noWrap
            sx={{
              fontWeight:
                700,

              fontSize:
                11.5,

              color:
                "#53677b",
            }}
          >
            {tile.headerLabel}
          </Typography>
        </Stack>

        <Box
          sx={{
            px: 1,
            py: 0.35,

            borderRadius:
              999,

            bgcolor:
              statusBackground,

            color:
              statusColor,

            fontSize: 10,

            fontWeight: 700,

            lineHeight:
              1.2,

            flex:
              "0 0 auto",
          }}
        >
          {tile.statusBadge
            ?.text ||
            tile.status ||
            "-"}
        </Box>
      </Stack>

      <Typography
        sx={{
          mt: 1.15,

          minHeight: 38,

          fontWeight: 700,

          fontSize: 14,

          lineHeight: 1.35,

          color: "#223548",

          display:
            "-webkit-box",

          overflow:
            "hidden",

          WebkitBoxOrient:
            "vertical",

          WebkitLineClamp:
            2,
        }}
      >
        {tile.label}
      </Typography>

      <Box sx={{ flexGrow: 1 }} />

      <Stack spacing={0.75}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.7}
        >
          <CalendarTodayOutlinedIcon
            sx={{
              fontSize: 13,

              color:
                "#8292a2",
            }}
          />

          <Typography
            sx={{
              fontSize:
                10.5,

              color:
                "#6c7e90",
            }}
          >
            Assigned
          </Typography>

          <Typography
            sx={{
              ml:
                "auto !important",

              fontSize:
                10.5,

              color:
                "#33485d",

              fontWeight:
                600,
            }}
          >
            {tile.assignedDate}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          spacing={0.7}
        >
          <AccessTimeOutlinedIcon
            sx={{
              fontSize: 13,

              color:
                "#8292a2",
            }}
          />

          <Typography
            sx={{
              fontSize:
                10.5,

              color:
                "#6c7e90",
            }}
          >
            Due
          </Typography>

          <Typography
            sx={{
              ml:
                "auto !important",

              fontSize:
                10.5,

              color:
                "#33485d",

              fontWeight:
                600,
            }}
          >
            {tile.dueDate}
          </Typography>
        </Stack>
      </Stack>
    </>
  );
}