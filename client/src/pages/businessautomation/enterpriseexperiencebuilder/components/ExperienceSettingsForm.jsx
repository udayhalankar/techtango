import React from "react";

import {
  Box,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import ViewSidebarOutlinedIcon from
  "@mui/icons-material/ViewSidebarOutlined";

import WebOutlinedIcon from
  "@mui/icons-material/WebOutlined";

import AutoAwesomeOutlinedIcon from
  "@mui/icons-material/AutoAwesomeOutlined";


/* ============================================================================
   INITIAL EXPERIENCE
============================================================================ */

export const createInitialExperience =
  () => ({
    id:
      null,

    name:
      "New Enterprise Experience",

    description:
      "",

    page: {
      maxWidth:
        1440,

      backgroundColor:
        "#f5f7fa",

      padding:
        16,

      rowGap:
        16,

      columnGap:
        12,
    },

    shell: {
      leftSidebar: {
        enabled:
          false,

        columns:
          2,

        collapsible:
          true,

        defaultCollapsed:
          false,
      },

      rightSidebar: {
        enabled:
          false,

        columns:
          2,

        collapsible:
          true,

        defaultCollapsed:
          false,
      },
    },

    hero: {
      enabled:
        false,

      type:
        "page-introduction",

      config: {
        title:
          "",

        subtitle:
          "",

        description:
          "",
      },
    },

    rows:
      [],

    components:
      {},
  });


/* ============================================================================
   MENU PROPS

   Keep this here for now if you have not yet moved menu styling
   into a shared file.
============================================================================ */

const COMPACT_SELECT_MENU_PROPS = {

  disableScrollLock:
    true,

  PaperProps: {
    sx: {
      mt:
        0.4,

      border:
        "1px solid #d9e2e9",

      borderRadius:
        "3px",

      boxShadow:
        "0 8px 22px rgba(25,45,65,.14)",

      maxHeight:
        260,

      "& .MuiMenuItem-root":
        {
          minHeight:
            30,

          px:
            1.2,

          py:
            0.5,

          fontSize:
            10.5,

          color:
            "#40576b",
        },

      "& .MuiMenuItem-root.Mui-selected":
        {
          bgcolor:
            "#edf5f9",
        },

      "& .MuiMenuItem-root.Mui-selected:hover":
        {
          bgcolor:
            "#e5f0f5",
        },
    },
  },

  MenuListProps: {
    dense:
      true,

    sx: {
      py:
        0.35,
    },
  },

  BackdropProps: {
    invisible:
      true,

    sx: {
      backgroundColor:
        "transparent !important",

      backdropFilter:
        "none !important",

      WebkitBackdropFilter:
        "none !important",
    },
  },
};


/* ============================================================================
   COMMON STYLES
============================================================================ */

const FIELD_SX = {

  "& .MuiInputBase-root":
    {
      fontSize:
        10.5,

      borderRadius:
        "3px",

      bgcolor:
        "#ffffff",
    },

  "& .MuiInputLabel-root":
    {
      fontSize:
        10.5,
    },
};


const SELECT_SX = {

  height:
    34,

  fontSize:
    10.5,

  borderRadius:
    "3px",

  bgcolor:
    "#ffffff",
};


/* ============================================================================
   MAIN
============================================================================ */

export default function ExperienceSettingsForm({
  experience,
  onChange,
}) {

  const page =
    experience?.page ||
    {};


  const shell =
    experience?.shell ||
    {};


  const hero =
    experience?.hero ||
    {};


  /* =========================================================================
     UPDATE HELPERS
  ========================================================================= */

  const updatePage =
    (
      changes
    ) => {

      onChange({
        ...experience,

        page: {
          ...page,
          ...changes,
        },
      });
    };


  const updateSidebar =
    (
      side,
      changes
    ) => {

      onChange({
        ...experience,

        shell: {
          ...shell,

          [side]: {
            ...(
              shell?.[
                side
              ] ||
              {}
            ),

            ...changes,
          },
        },
      });
    };


  const updateHero =
    (
      changes
    ) => {

      onChange({
        ...experience,

        hero: {
          ...hero,
          ...changes,
        },
      });
    };


  const updateHeroConfig =
    (
      changes
    ) => {

      onChange({
        ...experience,

        hero: {
          ...hero,

          config: {
            ...(
              hero?.config ||
              {}
            ),

            ...changes,
          },
        },
      });
    };


  /* =========================================================================
     RENDER
  ========================================================================= */

  return (
    <Box
      sx={{
        width:
          "100%",

        display:
          "grid",

        gap:
          1.2,

        p:
          1.2,

        bgcolor:
          "#f6f8fa",
      }}
    >

      {/* ====================================================================
          CARD 1 — EXPERIENCE
      ==================================================================== */}

      <SettingsCard
        title=
          "Experience"

        subtitle=
          "Basic identity and description for this enterprise experience."

        icon={
          <WebOutlinedIcon
            sx={{
              fontSize:
                16,
            }}
          />
        }
      >

        <Box
          sx={{
            display:
              "grid",

            gridTemplateColumns:
              {
                xs:
                  "1fr",

                md:
                  "minmax(0, 1fr) minmax(0, 1fr)",
              },

            gap:
              1.2,
          }}
        >

          <TextField
            fullWidth

            size=
              "small"

            label=
              "Experience Name"

            value={
              experience
                ?.name ||
              ""
            }

            onChange={(event) =>
              onChange({
                ...experience,

                name:
                  event
                    .target
                    .value,
              })
            }

            sx={
              FIELD_SX
            }
          />


          <TextField
            fullWidth

            size=
              "small"

            label=
              "Description"

            value={
              experience
                ?.description ||
              ""
            }

            onChange={(event) =>
              onChange({
                ...experience,

                description:
                  event
                    .target
                    .value,
              })
            }

            sx={
              FIELD_SX
            }
          />

        </Box>

      </SettingsCard>


      {/* ====================================================================
          CARD 2 — PAGE
      ==================================================================== */}

      <SettingsCard
        title=
          "Page"

        subtitle=
          "Control overall page dimensions, colour and spacing."

        icon={
          <WebOutlinedIcon
            sx={{
              fontSize:
                16,
            }}
          />
        }
      >

        {/* ================================================================
            ROW 1
            PAGE WIDTH + BACKGROUND COLOR
        ================================================================ */}

        <Box
          sx={{
            display:
              "grid",

            gridTemplateColumns:
              {
                xs:
                  "1fr",

                sm:
                  "1fr 1fr",
              },

            gap:
              1.2,
          }}
        >

          <FieldBlock
            label=
              "Page Width"
          >

            <Select
              fullWidth

              size=
                "small"

              value={
                page.maxWidth ||
                1440
              }

              MenuProps={
                COMPACT_SELECT_MENU_PROPS
              }

              onChange={(event) =>
                updatePage({
                  maxWidth:
                    Number(
                      event
                        .target
                        .value
                    ),
                })
              }

              sx={
                SELECT_SX
              }
            >

              <MenuItem
                value={
                  1200
                }
              >
                1200 px
              </MenuItem>

              <MenuItem
                value={
                  1366
                }
              >
                1366 px
              </MenuItem>

              <MenuItem
                value={
                  1440
                }
              >
                1440 px
              </MenuItem>

              <MenuItem
                value={
                  1600
                }
              >
                1600 px
              </MenuItem>

            </Select>

          </FieldBlock>


          <FieldBlock
            label=
              "Background Color"
          >

            <Box
              sx={{
                height:
                  34,

                display:
                  "grid",

                gridTemplateColumns:
                  "42px minmax(0,1fr)",

                gap:
                  0.7,
              }}
            >

              {/* REAL COLOR PICKER */}

              <Box
                component=
                  "input"

                type=
                  "color"

                value={
                  page.backgroundColor ||
                  "#f5f7fa"
                }

                onChange={(event) =>
                  updatePage({
                    backgroundColor:
                      event
                        .target
                        .value,
                  })
                }

                sx={{
                  width:
                    42,

                  height:
                    34,

                  p:
                    "3px",

                  border:
                    "1px solid #cfd9e2",

                  borderRadius:
                    "3px",

                  bgcolor:
                    "#ffffff",

                  cursor:
                    "pointer",

                  "&::-webkit-color-swatch-wrapper":
                    {
                      p:
                        0,
                    },

                  "&::-webkit-color-swatch":
                    {
                      border:
                        "none",

                      borderRadius:
                        "2px",
                    },
                }}
              />


              {/* HEX */}

              <TextField
                fullWidth

                size=
                  "small"

                value={
                  page.backgroundColor ||
                  "#f5f7fa"
                }

                onChange={(event) =>
                  updatePage({
                    backgroundColor:
                      event
                        .target
                        .value,
                  })
                }

                sx={{
                  ...FIELD_SX,

                  "& .MuiInputBase-root":
                    {
                      ...FIELD_SX[
                        "& .MuiInputBase-root"
                      ],

                      height:
                        34,
                    },
                }}
              />

            </Box>

          </FieldBlock>

        </Box>


        {/* ================================================================
            ROW 2
            COMPONENT + ROW SPACING
        ================================================================ */}

        <Box
          sx={{
            mt:
              1.2,

            display:
              "grid",

            gridTemplateColumns:
              {
                xs:
                  "1fr",

                sm:
                  "1fr 1fr",
              },

            gap:
              1.2,
          }}
        >

          <FieldBlock
            label=
              "Component Spacing"
          >

            <Select
              fullWidth

              size=
                "small"

              value={
                page.columnGap ??
                12
              }

              MenuProps={
                COMPACT_SELECT_MENU_PROPS
              }

              onChange={(event) =>
                updatePage({
                  columnGap:
                    Number(
                      event
                        .target
                        .value
                    ),
                })
              }

              sx={
                SELECT_SX
              }
            >

              <MenuItem
                value={
                  8
                }
              >
                Compact — 8px
              </MenuItem>

              <MenuItem
                value={
                  12
                }
              >
                Normal — 12px
              </MenuItem>

              <MenuItem
                value={
                  16
                }
              >
                Comfortable — 16px
              </MenuItem>

              <MenuItem
                value={
                  24
                }
              >
                Wide — 24px
              </MenuItem>

            </Select>

          </FieldBlock>


          <FieldBlock
            label=
              "Row Spacing"
          >

            <Select
              fullWidth

              size=
                "small"

              value={
                page.rowGap ??
                16
              }

              MenuProps={
                COMPACT_SELECT_MENU_PROPS
              }

              onChange={(event) =>
                updatePage({
                  rowGap:
                    Number(
                      event
                        .target
                        .value
                    ),
                })
              }

              sx={
                SELECT_SX
              }
            >

              <MenuItem
                value={
                  8
                }
              >
                Compact — 8px
              </MenuItem>

              <MenuItem
                value={
                  12
                }
              >
                Normal — 12px
              </MenuItem>

              <MenuItem
                value={
                  16
                }
              >
                Comfortable — 16px
              </MenuItem>

              <MenuItem
                value={
                  24
                }
              >
                Wide — 24px
              </MenuItem>

            </Select>

          </FieldBlock>

        </Box>

      </SettingsCard>


      {/* ====================================================================
          CARD 3 — SECTIONS
      ==================================================================== */}

      <SettingsCard
        title=
          "Sections"

        subtitle=
          "Configure optional hero and sidebar areas."

        icon={
          <AutoAwesomeOutlinedIcon
            sx={{
              fontSize:
                16,
            }}
          />
        }
      >

        <Box
          sx={{
            display:
              "grid",

            gridTemplateColumns:
              {
                xs:
                  "1fr",

                md:
                  "repeat(3, minmax(0, 1fr))",
              },

            gap:
              1,
          }}
        >

          {/* ==============================================================
              HERO
          ============================================================== */}

          <SectionPanel
            title=
              "Hero Section"
          >

            <FormControlLabel
              control={
                <Switch
                  size=
                    "small"

                  checked={
                    Boolean(
                      hero.enabled
                    )
                  }

                  onChange={(event) =>
                    updateHero({
                      enabled:
                        event
                          .target
                          .checked,
                    })
                  }
                />
              }

              label=
                "Enable Hero"

              sx={
                switchLabelSx
              }
            />


            {hero.enabled && (

              <Box
                sx={{
                  mt:
                    0.8,

                  display:
                    "grid",

                  gap:
                    0.8,
                }}
              >

                <TextField
                  fullWidth

                  size=
                    "small"

                  label=
                    "Hero Title"

                  value={
                    hero
                      ?.config
                      ?.title ||
                    ""
                  }

                  onChange={(event) =>
                    updateHeroConfig({
                      title:
                        event
                          .target
                          .value,
                    })
                  }

                  sx={
                    FIELD_SX
                  }
                />


                <TextField
                  fullWidth

                  size=
                    "small"

                  label=
                    "Subtitle"

                  value={
                    hero
                      ?.config
                      ?.subtitle ||
                    ""
                  }

                  onChange={(event) =>
                    updateHeroConfig({
                      subtitle:
                        event
                          .target
                          .value,
                    })
                  }

                  sx={
                    FIELD_SX
                  }
                />

              </Box>

            )}

          </SectionPanel>


          {/* ==============================================================
              LEFT SIDEBAR
          ============================================================== */}

          <SidebarSection
            title=
              "Left Sidebar"

            config={
              shell
                ?.leftSidebar ||
              {}
            }

            onChange={(changes) =>
              updateSidebar(
                "leftSidebar",
                changes
              )
            }
          />


          {/* ==============================================================
              RIGHT SIDEBAR
          ============================================================== */}

          <SidebarSection
            title=
              "Right Sidebar"

            right

            config={
              shell
                ?.rightSidebar ||
              {}
            }

            onChange={(changes) =>
              updateSidebar(
                "rightSidebar",
                changes
              )
            }
          />

        </Box>

      </SettingsCard>

    </Box>
  );
}


/* ============================================================================
   SETTINGS CARD
============================================================================ */

function SettingsCard({
  title,
  subtitle,
  icon,
  children,
}) {

  return (
    <Box
      sx={{
        bgcolor:
          "#ffffff",

        border:
          "1px solid #dfe7ed",

        borderRadius:
          "3px",

        overflow:
          "hidden",

        boxShadow:
          "0 1px 2px rgba(30,50,70,.025)",
      }}
    >

      <Box
        sx={{
          px:
            1.4,

          py:
            0.85,

          display:
            "flex",

          alignItems:
            "center",

          gap:
            0.75,

          borderBottom:
            "1px solid #edf1f4",

          bgcolor:
            "#fafcfd",
        }}
      >

        <Box
          sx={{
            width:
              25,

            height:
              25,

            display:
              "grid",

            placeItems:
              "center",

            border:
              "1px solid #dbe6ec",

            borderRadius:
              "3px",

            bgcolor:
              "#ffffff",

            color:
              "#2188a0",

            flex:
              "0 0 auto",
          }}
        >
          {icon}
        </Box>


        <Box
          sx={{
            minWidth:
              0,
          }}
        >

          <Typography
            sx={{
              fontSize:
                10.5,

              fontWeight:
                700,

              color:
                "#425b70",

              textTransform:
                "uppercase",

              letterSpacing:
                ".02em",
            }}
          >
            {title}
          </Typography>


          {subtitle ? (

            <Typography
              sx={{
                mt:
                  0.05,

                fontSize:
                  8.8,

                color:
                  "#8a99a7",
              }}
            >
              {subtitle}
            </Typography>

          ) : null}

        </Box>

      </Box>


      <Box
        sx={{
          p:
            1.35,
        }}
      >
        {children}
      </Box>

    </Box>
  );
}


/* ============================================================================
   FIELD BLOCK
============================================================================ */

function FieldBlock({
  label,
  children,
}) {

  return (
    <Box>

      <Typography
        sx={{
          mb:
            0.35,

          fontSize:
            9,

          fontWeight:
            500,

          color:
            "#64798b",
        }}
      >
        {label}
      </Typography>

      {children}

    </Box>
  );
}


/* ============================================================================
   SECTION PANEL
============================================================================ */

function SectionPanel({
  title,
  children,
}) {

  return (
    <Box
      sx={{
        minWidth:
          0,

        p:
          1,

        border:
          "1px solid #e2e8ed",

        borderRadius:
          "3px",

        bgcolor:
          "#fbfcfd",
      }}
    >

      <Typography
        sx={{
          mb:
            0.55,

          fontSize:
            9.5,

          fontWeight:
            700,

          color:
            "#536b7e",

          textTransform:
            "uppercase",
        }}
      >
        {title}
      </Typography>

      {children}

    </Box>
  );
}


/* ============================================================================
   SIDEBAR PANEL
============================================================================ */

function SidebarSection({
  title,
  right =
    false,
  config =
    {},
  onChange,
}) {

  return (
    <SectionPanel
      title={
        title
      }
    >

      <Box
        sx={{
          display:
            "flex",

          alignItems:
            "center",

          gap:
            0.5,

          mb:
            0.25,

          color:
            "#6c8293",
        }}
      >

        <ViewSidebarOutlinedIcon
          sx={{
            fontSize:
              13,

            transform:
              right
                ? "scaleX(-1)"
                : "none",
          }}
        />


        <Typography
          sx={{
            fontSize:
              9,

            color:
              "#718495",
          }}
        >
          {right
            ? "Right page rail"
            : "Left page rail"}
        </Typography>

      </Box>


      <FormControlLabel
        control={
          <Switch
            size=
              "small"

            checked={
              Boolean(
                config.enabled
              )
            }

            onChange={(event) =>
              onChange({
                enabled:
                  event
                    .target
                    .checked,
              })
            }
          />
        }

        label=
          "Enable Sidebar"

        sx={
          switchLabelSx
        }
      />


      {config.enabled && (

        <Box
          sx={{
            mt:
              0.7,

            display:
              "grid",

            gap:
              0.6,
          }}
        >

          <FieldBlock
            label=
              "Sidebar Width"
          >

            <Select
              fullWidth

              size=
                "small"

              value={
                config.columns ||
                2
              }

              MenuProps={
                COMPACT_SELECT_MENU_PROPS
              }

              onChange={(event) =>
                onChange({
                  columns:
                    Number(
                      event
                        .target
                        .value
                    ),
                })
              }

              sx={
                SELECT_SX
              }
            >

              <MenuItem
                value={
                  2
                }
              >
                2 Columns
              </MenuItem>

              <MenuItem
                value={
                  3
                }
              >
                3 Columns
              </MenuItem>

              <MenuItem
                value={
                  4
                }
              >
                4 Columns
              </MenuItem>

            </Select>

          </FieldBlock>


          <FormControlLabel
            control={
              <Switch
                size=
                  "small"

                checked={
                  config.collapsible !==
                  false
                }

                onChange={(event) =>
                  onChange({
                    collapsible:
                      event
                        .target
                        .checked,
                  })
                }
              />
            }

            label=
              "Expandable / Collapsible"

            sx={
              switchLabelSx
            }
          />


          {config.collapsible !==
            false && (

            <FormControlLabel
              control={
                <Switch
                  size=
                    "small"

                  checked={
                    Boolean(
                      config
                        .defaultCollapsed
                    )
                  }

                  onChange={(event) =>
                    onChange({
                      defaultCollapsed:
                        event
                          .target
                          .checked,
                    })
                  }
                />
              }

              label=
                "Collapsed by Default"

              sx={
                switchLabelSx
              }
            />

          )}

        </Box>

      )}

    </SectionPanel>
  );
}


/* ============================================================================
   SWITCH STYLE
============================================================================ */

const switchLabelSx = {

  m:
    0,

  minHeight:
    28,

  "& .MuiSwitch-root":
    {
      mr:
        0.25,
    },

  "& .MuiFormControlLabel-label":
    {
      fontSize:
        9.5,

      color:
        "#53697c",
    },
};